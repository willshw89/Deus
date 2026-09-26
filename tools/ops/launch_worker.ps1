<#
.SYNOPSIS
    Standard DEUS worker launcher (WG.00.12 Lane J).

.DESCRIPTION
    Starts one provider CLI session (claude, grok or codex) in a lane worktree and watches it to the end.
      - Refuses to start when the brief is missing or empty, the lane already has a live worker, the
        worktree is on the wrong branch, or the provider shares an AI family with the lane's other role.
      - Saves the exact prompt to tasks/<task>/<lane>/launches/<yyyyMMdd_HHmmss>_prompt.txt and commits it.
      - Tees stdout and stderr to <LogRoot>\<lane>\<runId>.log. A 0-byte log is a failure (EMPTY-LOG).
      - Records PID, start, end, exit code and state in docs/telemetry/sessions/active_workers.json.
      - Kills the whole process tree on timeout (TIMEOUT).
      - Flags ORPHANED-CHILDREN, EXITED-NO-COMMIT, USAGE-EXHAUSTED, OUT-OF-SCOPE and BRANCH-CHANGED.
      - Queues usage-exhausted lanes in docs/telemetry/sessions/provider_status.json for resume_queue.ps1.
    The functions in this file are also the library for resume_queue.ps1 and the tests, which load them
    from this file's syntax tree without running the main block. See tools/ops/README.md.

    Exit codes: 0 COMPLETED with no flags; 1 refused, nothing launched; 2 the run ended in any other
    state or with flags (see the registry entry); 3 launcher error.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/launch_worker.ps1 -Lane lane-j -Provider claude -BriefPath tasks/WG.00.12/lane-j/BRIEF.md -TimeoutMinutes 240
#>
[CmdletBinding()]
param(
    [string]$Lane,
    [string]$Provider,
    [string]$BriefPath,
    [double]$TimeoutMinutes = 0,
    [string]$RegistryPath,
    [string]$ProviderStatusPath,
    [string]$Worktree,
    [string]$WorktreeRoot = (Join-Path $env:USERPROFILE '.deus_worktrees'),
    [string]$LogRoot,
    [string]$Role,
    [string]$PromptFile,
    [string]$ResumeFromSha,
    [string[]]$AllowedPaths,
    [switch]$NoCommitPrompt,
    [switch]$KillOrphans,
    [switch]$Quiet,
    [double]$PollSeconds = 5,
    [double]$OrphanGraceSeconds = 5,
    [double]$DefaultResetMinutes = 60,
    [string]$ProviderExe,
    [string]$ProviderArgs,
    [switch]$ProviderStdinPrompt
)

# ---------------------------------------------------------------------------------------------
# Library: providers
# ---------------------------------------------------------------------------------------------

function Get-DeusProviderFamily([string]$Provider) {
    switch -regex ("$Provider".ToLowerInvariant()) {
        '^(claude|fable|opus|sonnet|haiku)$' { return 'anthropic' }
        '^grok$' { return 'xai' }
        '^(codex|astra|openai|gpt)$' { return 'openai' }
        '^(gemini|antigravity|agy)$' { return 'google' }
    }
    return $null
}

function Get-DeusKnownProviders { return @('claude', 'grok', 'codex') }

function ConvertTo-DeusArg([string]$Value) {
    # Quote one argument for CommandLineToArgvW / the MSVC runtime.
    if ($Value -ne '' -and $Value -notmatch '[\s"]') { return $Value }
    $s = [regex]::Replace($Value, '(\\*)"', '$1$1\"')
    $s = [regex]::Replace($s, '(\\+)$', '$1$1')
    return '"' + $s + '"'
}

function Get-DeusProviderSpec {
    # Command line for a worker session (default) or a one-line probe (-Probe).
    # Claude and Codex read the prompt from stdin; Grok reads it from the saved prompt file.
    param([string]$Provider, [string]$PromptPath, [switch]$Probe)
    $npm = Join-Path $env:APPDATA 'npm'
    switch ($Provider) {
        'claude' {
            $exe = Join-Path $npm 'node_modules\@anthropic-ai\claude-code\bin\claude.exe'
            if (-not (Test-Path -LiteralPath $exe)) {
                $c = Get-Command claude.exe -ErrorAction SilentlyContinue
                if ($c) { $exe = $c.Source }
            }
            if ($Probe) { $a = '-p --output-format text' }
            else { $a = '-p --output-format stream-json --verbose --dangerously-skip-permissions' }
            return @{ Exe = $exe; Args = $a; StdinPrompt = $true }
        }
        'grok' {
            $exe = Join-Path $env:USERPROFILE '.grok\bin\grok.exe'
            if (-not (Test-Path -LiteralPath $exe)) {
                $c = Get-Command grok.exe -ErrorAction SilentlyContinue
                if ($c) { $exe = $c.Source }
            }
            $a = '--prompt-file ' + (ConvertTo-DeusArg $PromptPath)
            if (-not $Probe) { $a = '--always-approve ' + $a }
            return @{ Exe = $exe; Args = $a; StdinPrompt = $false }
        }
        'codex' {
            $node = Get-Command node.exe -ErrorAction SilentlyContinue
            $exe = $null
            if ($node) { $exe = $node.Source }
            $js = Join-Path $npm 'node_modules\@openai\codex\bin\codex.js'
            if (-not (Test-Path -LiteralPath $js)) { $exe = $null }
            if ($Probe) { $a = (ConvertTo-DeusArg $js) + ' exec --skip-git-repo-check -' }
            else { $a = (ConvertTo-DeusArg $js) + ' exec --dangerously-bypass-approvals-and-sandbox --json -' }
            return @{ Exe = $exe; Args = $a; StdinPrompt = $true }
        }
    }
    return $null
}

# ---------------------------------------------------------------------------------------------
# Library: time and JSON
# ---------------------------------------------------------------------------------------------

function Format-DeusIso([datetime]$Time) {
    return $Time.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ', [Globalization.CultureInfo]::InvariantCulture)
}

function ConvertFrom-DeusIso([string]$Text) {
    if (-not $Text) { return $null }
    $styles = [Globalization.DateTimeStyles]::AdjustToUniversal -bor [Globalization.DateTimeStyles]::AssumeUniversal
    $t = [datetime]::MinValue
    if ([datetime]::TryParse($Text, [Globalization.CultureInfo]::InvariantCulture, $styles, [ref]$t)) { return $t }
    return $null
}

function Format-DeusCentral([datetime]$Time) {
    try {
        $tz = [TimeZoneInfo]::FindSystemTimeZoneById('Central Standard Time')
        return [TimeZoneInfo]::ConvertTimeFromUtc($Time.ToUniversalTime(), $tz).ToString('yyyy-MM-dd HH:mm:ss') + ' CT'
    } catch { return $Time.ToString('yyyy-MM-dd HH:mm:ss') }
}

function ConvertTo-DeusJsonString([string]$Text) {
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    foreach ($ch in $Text.ToCharArray()) {
        $code = [int]$ch
        if ($ch -eq [char]'"') { [void]$sb.Append('\"') }
        elseif ($ch -eq [char]'\') { [void]$sb.Append('\\') }
        elseif ($code -eq 10) { [void]$sb.Append('\n') }
        elseif ($code -eq 13) { [void]$sb.Append('\r') }
        elseif ($code -eq 9) { [void]$sb.Append('\t') }
        elseif ($code -lt 32) { [void]$sb.Append(('\u{0:x4}' -f $code)) }
        else { [void]$sb.Append($ch) }
    }
    [void]$sb.Append('"')
    return $sb.ToString()
}

function ConvertTo-DeusJson($Value, [int]$Level = 0) {
    # Stable 2-space JSON. Avoids ConvertTo-Json's depth limit and single-item array unwrapping.
    $ind = '  ' * $Level
    $ind1 = '  ' * ($Level + 1)
    if ($null -eq $Value) { return 'null' }
    if ($Value -is [bool]) { if ($Value) { return 'true' } else { return 'false' } }
    if ($Value -is [string] -or $Value -is [char]) { return (ConvertTo-DeusJsonString ([string]$Value)) }
    if ($Value -is [datetime]) { return (ConvertTo-DeusJsonString (Format-DeusIso $Value)) }
    if ($Value -is [int] -or $Value -is [long] -or $Value -is [int16] -or $Value -is [byte] -or $Value -is [uint32] -or $Value -is [uint64]) {
        return ([Convert]::ToString($Value, [Globalization.CultureInfo]::InvariantCulture))
    }
    if ($Value -is [double] -or $Value -is [single] -or $Value -is [decimal]) {
        if ($Value -is [double] -and ([double]::IsNaN($Value) -or [double]::IsInfinity($Value))) { return 'null' }
        return ([Convert]::ToString($Value, [Globalization.CultureInfo]::InvariantCulture))
    }
    if ($Value -is [System.Management.Automation.PSCustomObject]) { $Value = ConvertTo-DeusData $Value }
    if ($Value -is [System.Collections.IDictionary]) {
        if ($Value.Count -eq 0) { return '{}' }
        $parts = New-Object System.Collections.Generic.List[string]
        foreach ($k in $Value.Keys) {
            $parts.Add($ind1 + (ConvertTo-DeusJsonString ([string]$k)) + ': ' + (ConvertTo-DeusJson $Value[$k] ($Level + 1)))
        }
        return "{`n" + ($parts -join ",`n") + "`n$ind}"
    }
    if ($Value -is [System.Collections.IEnumerable]) {
        $parts = New-Object System.Collections.Generic.List[string]
        foreach ($x in $Value) { $parts.Add($ind1 + (ConvertTo-DeusJson $x ($Level + 1))) }
        if ($parts.Count -eq 0) { return '[]' }
        return "[`n" + ($parts -join ",`n") + "`n$ind]"
    }
    return (ConvertTo-DeusJsonString ([string]$Value))
}

function ConvertTo-DeusData($Value) {
    # ConvertFrom-Json output -> ordered dictionaries and ArrayLists, which can be edited in place.
    if ($null -eq $Value) { return $null }
    if ($Value -is [System.Management.Automation.PSCustomObject]) {
        $d = [ordered]@{}
        foreach ($p in $Value.PSObject.Properties) { $d[$p.Name] = ConvertTo-DeusData $p.Value }
        return $d
    }
    if ($Value -is [System.Collections.IDictionary]) {
        $d = [ordered]@{}
        foreach ($k in $Value.Keys) { $d[[string]$k] = ConvertTo-DeusData $Value[$k] }
        return $d
    }
    if ($Value -isnot [string] -and $Value -is [System.Collections.IEnumerable]) {
        $a = New-Object System.Collections.ArrayList
        foreach ($x in $Value) { [void]$a.Add((ConvertTo-DeusData $x)) }
        return , $a
    }
    return $Value
}

function Read-DeusJsonFile([string]$Path, $Default) {
    if (-not (Test-Path -LiteralPath $Path)) { return , $Default }
    $raw = [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8)
    if ($raw.Length -gt 0 -and $raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
    if (-not $raw.Trim()) { return , $Default }
    if ($raw.Trim() -eq '[]') { return , (New-Object System.Collections.ArrayList) }
    $obj = ConvertFrom-Json -InputObject $raw
    return , (ConvertTo-DeusData $obj)
}

function Write-DeusJsonFile([string]$Path, $Value) {
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $json = (ConvertTo-DeusJson $Value) + "`n"
    $tmp = "$Path.tmp$PID"
    [IO.File]::WriteAllText($tmp, $json, (New-Object Text.UTF8Encoding $false))
    for ($i = 0; $i -lt 20; $i++) {
        try {
            if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($tmp, $Path, [NullString]::Value) }
            else { [IO.File]::Move($tmp, $Path) }
            return
        } catch {
            if ($i -eq 19) { throw }
            Start-Sleep -Milliseconds 100
        }
    }
}

function Invoke-DeusLocked([string]$Path, [scriptblock]$Script, [double]$TimeoutSeconds = 60) {
    # Serialises read-modify-write of a shared JSON file. The lock file lives in %TEMP%, never in the repo.
    $dir = Join-Path ([IO.Path]::GetTempPath()) 'deus_ops_locks'
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $full = [IO.Path]::GetFullPath($Path).ToLowerInvariant()
    $sha = [Security.Cryptography.SHA1]::Create()
    $hex = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($full)) | ForEach-Object { $_.ToString('x2') })
    $lockPath = Join-Path $dir ($hex.Substring(0, 16) + '.lock')
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $fs = $null
    while (-not $fs) {
        try { $fs = [IO.File]::Open($lockPath, 'OpenOrCreate', 'ReadWrite', 'None') }
        catch [System.IO.IOException] {
            if ((Get-Date) -gt $deadline) { throw "timed out waiting for the lock on $Path" }
            Start-Sleep -Milliseconds 50
        }
    }
    try { & $Script } finally { $fs.Dispose() }
}

# ---------------------------------------------------------------------------------------------
# Library: lanes, locks and the worker registry
# ---------------------------------------------------------------------------------------------

function ConvertTo-DeusLaneKey([string]$Lane) {
    # "Lane C2b" (older registry entries) and "lane-c2b" are the same lane.
    return ("$Lane".Trim().ToLowerInvariant() -replace '\s+', '-')
}

function Get-DeusMainWorktree([string]$AnyPath) {
    $out = & git -C $AnyPath worktree list --porcelain 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    foreach ($line in $out) {
        if ($line -like 'worktree *') { return ($line.Substring(9) -replace '/', '\') }
    }
    return $null
}

function Enter-DeusLaneLock([string]$LogRoot, [string]$Lane, [double]$WaitSeconds = 0) {
    # One lock per lane, held for the whole run. The OS releases it if the launcher dies.
    $dir = Join-Path $LogRoot $Lane
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $path = Join-Path $dir 'lane.lock'
    $deadline = (Get-Date).AddSeconds($WaitSeconds)
    while ($true) {
        try {
            $fs = [IO.File]::Open($path, 'OpenOrCreate', 'ReadWrite', 'None')
            $bytes = [Text.Encoding]::ASCII.GetBytes("pid=$PID`r`nsince=$(Format-DeusIso (Get-Date))`r`n")
            $fs.SetLength(0)
            $fs.Write($bytes, 0, $bytes.Length)
            $fs.Flush()
            return $fs
        } catch [System.IO.IOException] {
            if ((Get-Date) -ge $deadline) { return $null }
            Start-Sleep -Milliseconds 200
        }
    }
}

function Test-DeusLaneLocked([string]$LogRoot, [string]$Lane) {
    $fs = Enter-DeusLaneLock -LogRoot $LogRoot -Lane $Lane
    if ($fs) { $fs.Dispose(); return $false }
    return $true
}

function Test-DeusPidAlive($ProcessId, [string]$StartedAt) {
    # True when the PID is running and, if a start time was recorded, it is the same process (not a reused PID).
    if (-not $ProcessId) { return $false }
    $p = Get-Process -Id ([int]$ProcessId) -ErrorAction SilentlyContinue
    if (-not $p) { return $false }
    if (-not $StartedAt) { return $true }
    $want = ConvertFrom-DeusIso $StartedAt
    if (-not $want) { return $true }
    try { $st = $p.StartTime.ToUniversalTime() } catch { return $true }
    return ([math]::Abs(($st - $want).TotalSeconds) -lt 2)
}

function Get-DeusActiveLaneWorkers([string]$RegistryPath, [string]$Lane) {
    $key = ConvertTo-DeusLaneKey $Lane
    $list = Read-DeusJsonFile $RegistryPath (New-Object System.Collections.ArrayList)
    $active = New-Object System.Collections.ArrayList
    foreach ($e in $list) {
        if ($e -isnot [System.Collections.IDictionary]) { continue }
        if ((ConvertTo-DeusLaneKey $e['lane']) -ne $key) { continue }
        if ("$($e['state'])" -notmatch '^(?i)running$') { continue }
        if ((Test-DeusPidAlive $e['pid'] $e['processStartedAt']) -or (Test-DeusPidAlive $e['launcherPid'] $e['launcherStartedAt'])) {
            [void]$active.Add($e)
        }
    }
    return , $active
}

function Update-DeusRegistryEntry([string]$RegistryPath, [string]$RunId, [System.Collections.IDictionary]$Fields) {
    Invoke-DeusLocked $RegistryPath {
        $list = Read-DeusJsonFile $RegistryPath (New-Object System.Collections.ArrayList)
        if ($list -isnot [System.Collections.IList]) { $list = New-Object System.Collections.ArrayList }
        $entry = $null
        foreach ($e in $list) { if ($e -is [System.Collections.IDictionary] -and $e['runId'] -eq $RunId) { $entry = $e; break } }
        if (-not $entry) { $entry = [ordered]@{ runId = $RunId }; [void]$list.Add($entry) }
        foreach ($k in $Fields.Keys) { $entry[$k] = $Fields[$k] }
        Write-DeusJsonFile $RegistryPath $list
    }
}

function Set-DeusStaleLaneEntries([string]$RegistryPath, [string]$Lane) {
    # RUNNING entries for this lane whose processes are gone were left by a launcher that died: mark them LOST.
    $key = ConvertTo-DeusLaneKey $Lane
    Invoke-DeusLocked $RegistryPath {
        $list = Read-DeusJsonFile $RegistryPath (New-Object System.Collections.ArrayList)
        $changed = $false
        foreach ($e in $list) {
            if ($e -isnot [System.Collections.IDictionary]) { continue }
            if ((ConvertTo-DeusLaneKey $e['lane']) -ne $key) { continue }
            if ("$($e['state'])" -notmatch '^(?i)running$') { continue }
            if ((Test-DeusPidAlive $e['pid'] $e['processStartedAt']) -or (Test-DeusPidAlive $e['launcherPid'] $e['launcherStartedAt'])) { continue }
            $e['state'] = 'LOST'
            $e['lostDetectedAt'] = Format-DeusIso (Get-Date)
            $changed = $true
        }
        if ($changed) { Write-DeusJsonFile $RegistryPath $list }
    }
}

# ---------------------------------------------------------------------------------------------
# Library: scope checks
# ---------------------------------------------------------------------------------------------

function Convert-DeusGlobToRegex([string]$Glob) {
    # '**' crosses directories, '*' and '?' stay inside one path segment. Case-insensitive, like Windows.
    $g = $Glob.Replace('\', '/').Trim()
    if ($g.StartsWith('./')) { $g = $g.Substring(2) }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('^')
    $i = 0
    while ($i -lt $g.Length) {
        $c = $g[$i]
        if ($c -eq [char]'*') {
            if ($i + 1 -lt $g.Length -and $g[$i + 1] -eq [char]'*') {
                if ($i + 2 -lt $g.Length -and $g[$i + 2] -eq [char]'/') { [void]$sb.Append('(?:.*/)?'); $i += 3; continue }
                [void]$sb.Append('.*'); $i += 2; continue
            }
            [void]$sb.Append('[^/]*'); $i++; continue
        }
        if ($c -eq [char]'?') { [void]$sb.Append('[^/]'); $i++; continue }
        [void]$sb.Append([regex]::Escape([string]$c)); $i++
    }
    if ($g.EndsWith('/')) { [void]$sb.Append('.*') }
    [void]$sb.Append('$')
    return $sb.ToString()
}

function Test-DeusPathAllowed([string]$Path, [string[]]$Globs) {
    $p = $Path.Replace('\', '/')
    foreach ($g in $Globs) {
        if (-not $g) { continue }
        if ($p -match ('(?i)' + (Convert-DeusGlobToRegex $g))) { return $true }
    }
    return $false
}

function Get-DeusGitLines([string]$Worktree, [string[]]$GitArgs) {
    # Runs git with -z output and returns the NUL-separated records.
    $out = & git -C $Worktree -c core.quotepath=off @GitArgs 2>$null
    if ($LASTEXITCODE -ne 0) { return , @() }
    $text = ($out -join "`n")
    return , @($text.Split([char]0) | Where-Object { $_ -ne '' -and $_ -ne "`n" } | ForEach-Object { $_.TrimStart("`n") })
}

function Get-DeusChangedFiles([string]$Worktree, [string]$BaseCommit) {
    # committed: files changed by commits since BaseCommit. uncommitted: staged, unstaged and untracked files.
    $committed = @()
    if ($BaseCommit) {
        $committed = @(Get-DeusGitLines $Worktree @('diff', '--name-only', '--no-renames', '-z', $BaseCommit, 'HEAD'))
    }
    $uncommitted = @()
    foreach ($rec in (Get-DeusGitLines $Worktree @('status', '--porcelain=v1', '--no-renames', '--untracked-files=all', '-z'))) {
        if ($rec.Length -gt 3) { $uncommitted += $rec.Substring(3) }
    }
    return @{ Committed = $committed; Uncommitted = $uncommitted }
}

# ---------------------------------------------------------------------------------------------
# Library: usage / quota / rate-limit detection
# ---------------------------------------------------------------------------------------------

function Get-DeusUsagePatterns([string]$Provider) {
    $generic = @(
        '(?i)\b429\b[^\r\n]{0,40}too many requests',
        '(?i)too many requests',
        '(?i)rate_limit_error',
        '(?i)\[error\]\s*rate_limit',
        '(?i)rate[ _-]?limit(?:ed)?\s+(?:exceeded|reached|hit)',
        '(?i)insufficient_quota',
        '(?i)quota\s+(?:exceeded|exhausted|reached)',
        '(?i)(?:usage|session|weekly|daily|monthly)\s+limit\s+(?:reached|exceeded|hit)',
        '(?i)you(?:''ve| have)\s+(?:hit|reached|exceeded)\s+your\s+(?:\w+\s+){0,2}limit'
    )
    $specific = @{
        claude = @('(?i)Claude AI usage limit reached', '(?i)(?:5-hour|five-hour|opus|sonnet)\s+limit\s+reached', '(?i)credit balance is too low', '(?i)out of extra usage')
        grok   = @('(?i)(?:run|ran)\s+out\s+of\s+credits', '(?i)insufficient\s+(?:credits|balance)', '(?i)spending\s+limit\s+(?:reached|exceeded)', '(?i)resource[_ ]exhausted')
        codex  = @('(?i)exceeded retry limit, last status: 429', '(?i)rate limit reached for', '(?i)usage_limit_reached', '(?i)usage_not_included')
    }
    $list = @()
    if ($specific.ContainsKey($Provider)) { $list += $specific[$Provider] }
    return ($list + $generic)
}

function Get-DeusJsonErrorTexts($Event) {
    # Error texts carried by one JSON event line. Ordinary transcript events (assistant text, tool calls and
    # tool results) are not errors, so a worker that writes about rate limits is not flagged.
    $texts = @()
    $type = "$($Event.type)"
    if ($type -eq 'result') {
        if ($Event.is_error -eq $true) {
            if ($Event.result) { $texts += [string]$Event.result }
            if ($Event.errors) { $texts += (@($Event.errors) | ForEach-Object { [string]$_ }) }
            if (-not $texts) { $texts += "[error] $($Event.subtype)" }
        }
        return $texts
    }
    if ($type -eq 'assistant' -or $type -eq 'user') {
        if ($Event.error) {
            $texts += "[error] $($Event.error)"
            if ($Event.message -and $Event.message.content) {
                foreach ($c in @($Event.message.content)) { if ($c.type -eq 'text' -and $c.text) { $texts += [string]$c.text } }
            }
        }
        return $texts
    }
    if ($type -match '(?i)error|failed') {
        if ($Event.message) { $texts += [string]$Event.message }
        if ($Event.error) {
            if ($Event.error -is [string]) { $texts += $Event.error }
            elseif ($Event.error.message) { $texts += [string]$Event.error.message }
        }
        if (-not $texts) { $texts += ($Event | ConvertTo-Json -Compress -Depth 5) }
        return $texts
    }
    if ($Event.error) {
        if ($Event.error -is [string]) { $texts += $Event.error }
        elseif ($Event.error.message) { $texts += [string]$Event.error.message }
    }
    return $texts
}

function Get-DeusUsageCandidates([string[]]$Lines, $ExitCode) {
    # JSON events: only error-bearing events count, wherever they are. Plain text: only the last 50 lines,
    # and only when the process failed or the line reads as an error.
    $out = New-Object System.Collections.Generic.List[string]
    $tailStart = [math]::Max(0, $Lines.Count - 50)
    $prefilter = '"is_error"\s*:\s*true|"error"\s*:|"type"\s*:\s*"[^"]*(?:error|failed)'
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        $t = "$($Lines[$i])".Trim()
        if (-not $t) { continue }
        if ($t.StartsWith('{')) {
            if ($t -notmatch $prefilter) { continue }
            $o = $null
            try { $o = ConvertFrom-Json -InputObject $t -ErrorAction Stop } catch { $o = $null }
            if ($null -ne $o) {
                foreach ($x in (Get-DeusJsonErrorTexts $o)) { if ($x) { $out.Add($x) } }
                continue
            }
        }
        if ($i -ge $tailStart -and (($null -ne $ExitCode -and $ExitCode -ne 0) -or $t -match '^(?i)(?:\[?error\b|api error|fatal\b|err\b)')) {
            $out.Add($t)
        }
    }
    return , $out
}

function Resolve-DeusResetTime([string]$Text, [datetime]$ReferenceUtc) {
    # Reset time named in a provider error. Returns @{ ResetAt = <UTC datetime>; Source = ... } or $null.
    $inv = [Globalization.CultureInfo]::InvariantCulture
    $ref = $ReferenceUtc.ToUniversalTime()
    if ($Text -match '\|(\d{10})\b') {
        return @{ ResetAt = [DateTimeOffset]::FromUnixTimeSeconds([long]$Matches[1]).UtcDateTime; Source = 'epoch' }
    }
    if ($Text -match '(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}))') {
        $dto = [DateTimeOffset]::MinValue
        if ([DateTimeOffset]::TryParse($Matches[1], $inv, [Globalization.DateTimeStyles]::None, [ref]$dto)) {
            return @{ ResetAt = $dto.UtcDateTime; Source = 'iso' }
        }
    }
    $rel = [regex]::Match($Text, '(?i)(?:try again|retry|resets?|available again)(?:\s+after)?\s+in\s+((?:\d+\s*(?:days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b[\s,]*(?:and\s+)?)+)')
    if ($rel.Success) {
        $span = [TimeSpan]::Zero
        foreach ($m in [regex]::Matches($rel.Groups[1].Value, '(?i)(\d+)\s*(days?|d|hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b')) {
            $n = [double]$m.Groups[1].Value
            switch -regex ($m.Groups[2].Value.ToLowerInvariant()) {
                '^d' { $span += [TimeSpan]::FromDays($n) }
                '^h' { $span += [TimeSpan]::FromHours($n) }
                '^m' { $span += [TimeSpan]::FromMinutes($n) }
                '^s' { $span += [TimeSpan]::FromSeconds($n) }
            }
        }
        if ($span -gt [TimeSpan]::Zero) { return @{ ResetAt = $ref + $span; Source = 'relative' } }
    }
    $clock = [regex]::Match($Text, '(?i)(?:resets?|try again|available again)\s+(?:at\s+|on\s+)?(?:(?<mon>jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(?<day>\d{1,2})(?:st|nd|rd|th)?,?\s+(?:at\s+)?)?(?<h>\d{1,2})(?::(?<mi>\d{2}))?\s*(?<ap>[ap])\.?m\.?(?:\s*\((?<tz>[^)]+)\))?')
    if ($clock.Success) {
        $tzName = $clock.Groups['tz'].Value.Trim()
        $tz = $null
        $tzMap = @{
            'america/chicago' = 'Central Standard Time'; 'america/new_york' = 'Eastern Standard Time'
            'america/denver' = 'Mountain Standard Time'; 'america/phoenix' = 'US Mountain Standard Time'
            'america/los_angeles' = 'Pacific Standard Time'; 'europe/london' = 'GMT Standard Time'
            'utc' = 'UTC'; 'etc/utc' = 'UTC'; 'gmt' = 'UTC'
        }
        if ($tzName) {
            $id = $tzMap[$tzName.ToLowerInvariant()]
            if (-not $id) { $id = $tzName }
            try { $tz = [TimeZoneInfo]::FindSystemTimeZoneById($id) } catch { $tz = $null }
        }
        $source = 'clock'
        if (-not $tz) { $tz = [TimeZoneInfo]::Local; if ($tzName) { $source = 'clock-unknown-tz' } }
        $refLocal = [TimeZoneInfo]::ConvertTimeFromUtc($ref, $tz)
        $h = [int]$clock.Groups['h'].Value % 12
        if ($clock.Groups['ap'].Value -match '(?i)p') { $h += 12 }
        $mi = 0
        if ($clock.Groups['mi'].Success) { $mi = [int]$clock.Groups['mi'].Value }
        if ($clock.Groups['mon'].Success) {
            $mon = [datetime]::ParseExact($clock.Groups['mon'].Value.Substring(0, 3), 'MMM', $inv).Month
            try { $cand = New-Object DateTime($refLocal.Year, $mon, [int]$clock.Groups['day'].Value, $h, $mi, 0) } catch { return $null }
            if ($cand -lt $refLocal.AddDays(-1)) { $cand = $cand.AddYears(1) }
        } else {
            $cand = New-Object DateTime($refLocal.Year, $refLocal.Month, $refLocal.Day, $h, $mi, 0)
            if ($cand -le $refLocal) { $cand = $cand.AddDays(1) }
        }
        $cand = [DateTime]::SpecifyKind($cand, [DateTimeKind]::Unspecified)
        return @{ ResetAt = [TimeZoneInfo]::ConvertTimeToUtc($cand, $tz); Source = $source }
    }
    return $null
}

function Find-DeusUsageExhaustion {
    # Returns $null, or @{ MatchedText; Pattern; ResetAt (UTC); ResetSource } for the last usage/quota/rate-limit
    # error in the log.
    param([string]$Provider, [string]$LogPath, $ExitCode, [datetime]$EndedAtUtc = [datetime]::UtcNow, [double]$DefaultResetMinutes = 60)
    if (-not (Test-Path -LiteralPath $LogPath)) { return $null }
    $lines = [IO.File]::ReadAllLines($LogPath, [Text.Encoding]::UTF8)
    $cands = Get-DeusUsageCandidates $lines $ExitCode
    $patterns = Get-DeusUsagePatterns $Provider
    for ($i = $cands.Count - 1; $i -ge 0; $i--) {
        foreach ($pat in $patterns) {
            if ($cands[$i] -match $pat) {
                $text = $cands[$i]
                if ($text.Length -gt 500) { $text = $text.Substring(0, 500) }
                $reset = Resolve-DeusResetTime $cands[$i] $EndedAtUtc
                if (-not $reset) { $reset = @{ ResetAt = $EndedAtUtc.ToUniversalTime().AddMinutes($DefaultResetMinutes); Source = 'default' } }
                return @{ MatchedText = $text; Pattern = $pat; ResetAt = $reset.ResetAt; ResetSource = $reset.Source }
            }
        }
    }
    return $null
}

# ---------------------------------------------------------------------------------------------
# Library: processes
# ---------------------------------------------------------------------------------------------

function Initialize-DeusWorkerType {
    if ('DeusOps.WorkerProcess' -as [type]) { return }
    Add-Type -TypeDefinition @'
using System;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Text;
namespace DeusOps {
    // Starts a process with stdout and stderr teed, line by line, to a UTF-8 log (and optionally the console).
    public sealed class WorkerProcess {
        private readonly object gate = new object();
        private StreamWriter log;
        private bool echo;
        private volatile bool outEof;
        private volatile bool errEof;
        public Process Proc;
        public long Lines;
        public bool OutputDrained { get { return outEof && errEof; } }
        public static WorkerProcess Start(string exe, string args, string cwd, string logPath, string stdinText,
                                          IDictionary envSet, string[] envRemove, bool echo) {
            WorkerProcess w = new WorkerProcess();
            w.echo = echo;
            FileStream fs = new FileStream(logPath, FileMode.Append, FileAccess.Write, FileShare.ReadWrite);
            w.log = new StreamWriter(fs, new UTF8Encoding(false));
            w.log.AutoFlush = true;
            ProcessStartInfo psi = new ProcessStartInfo(exe, args);
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardInput = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;
            psi.StandardOutputEncoding = new UTF8Encoding(false);
            psi.StandardErrorEncoding = new UTF8Encoding(false);
            psi.WorkingDirectory = cwd;
            if (envRemove != null) { foreach (string k in envRemove) { psi.EnvironmentVariables.Remove(k); } }
            if (envSet != null) { foreach (DictionaryEntry e in envSet) { psi.EnvironmentVariables[(string)e.Key] = (string)e.Value; } }
            Process p = new Process();
            p.StartInfo = psi;
            p.OutputDataReceived += (s, e) => { if (e.Data == null) { w.outEof = true; } else { w.Write(e.Data); } };
            p.ErrorDataReceived += (s, e) => { if (e.Data == null) { w.errEof = true; } else { w.Write(e.Data); } };
            try { p.Start(); } catch { w.CloseLog(); throw; }
            w.Proc = p;
            p.BeginOutputReadLine();
            p.BeginErrorReadLine();
            try {
                if (stdinText != null) {
                    byte[] b = new UTF8Encoding(false).GetBytes(stdinText);
                    p.StandardInput.BaseStream.Write(b, 0, b.Length);
                    p.StandardInput.BaseStream.Flush();
                }
                p.StandardInput.Close();
            } catch (IOException) { }
            return w;
        }
        private void Write(string line) {
            lock (gate) {
                if (log == null) { return; }
                log.WriteLine(line);
                Lines++;
                if (echo) { try { Console.Out.WriteLine(line); } catch { } }
            }
        }
        public void CloseLog() {
            lock (gate) {
                if (log != null) { log.Flush(); log.Dispose(); log = null; }
            }
        }
    }
}
'@
}

function Get-DeusProcessSnapshot {
    $map = @{}
    foreach ($p in (Get-CimInstance -ClassName Win32_Process -Property ProcessId, ParentProcessId, CreationDate, Name, CommandLine -ErrorAction SilentlyContinue)) {
        $map[[int]$p.ProcessId] = [pscustomobject]@{
            Pid = [int]$p.ProcessId; ParentPid = [int]$p.ParentProcessId; Created = $p.CreationDate
            Name = $p.Name; CommandLine = $p.CommandLine
        }
    }
    return $map
}

function Update-DeusDescendants([hashtable]$Tracked, [int]$RootPid, [datetime]$RootCreated, [hashtable]$Snapshot) {
    # Adds every process descended from RootPid. A parent link only counts when the child started after the
    # parent, so a reused PID never adopts unrelated processes. Tracked records survive their parent's exit.
    $known = @{ $RootPid = $RootCreated }
    foreach ($k in $Tracked.Keys) { $known[$k] = $Tracked[$k].Created }
    $changed = $true
    while ($changed) {
        $changed = $false
        foreach ($p in $Snapshot.Values) {
            if ($known.ContainsKey($p.Pid) -or -not $p.Created) { continue }
            if ($known.ContainsKey($p.ParentPid) -and $p.Created -ge $known[$p.ParentPid].AddSeconds(-1)) {
                $Tracked[$p.Pid] = $p
                $known[$p.Pid] = $p.Created
                $changed = $true
            }
        }
    }
}

function Get-DeusAliveTracked([hashtable]$Tracked) {
    $snap = Get-DeusProcessSnapshot
    $alive = @()
    foreach ($t in $Tracked.Values) {
        $s = $snap[$t.Pid]
        if ($s -and $s.Created -and [math]::Abs(($s.Created - $t.Created).TotalSeconds) -lt 1 -and $s.Name -ne 'conhost.exe') { $alive += $t }
    }
    return , $alive
}

function Stop-DeusProcessTree([int]$RootPid, [hashtable]$Tracked) {
    & taskkill.exe /PID $RootPid /T /F 2>&1 | Out-Null
    foreach ($t in (Get-DeusAliveTracked $Tracked)) { Stop-Process -Id $t.Pid -Force -ErrorAction SilentlyContinue }
}

function Invoke-DeusMonitoredProcess {
    # Runs one process to completion (or kills its tree at the timeout) and reports what it left behind.
    param(
        [string]$Exe, [string]$Arguments, [string]$WorkingDirectory, [string]$LogPath, [string]$StdinText,
        [hashtable]$EnvSet, [string[]]$EnvRemove, [double]$TimeoutSeconds, [double]$PollSeconds = 5,
        [double]$GraceSeconds = 5, [double]$DrainSeconds = 5, [switch]$Echo, [scriptblock]$OnStarted
    )
    Initialize-DeusWorkerType
    $r = @{ Pid = $null; StartedAt = $null; ProcessStartedAt = $null; EndedAt = $null; ExitCode = $null
            TimedOut = $false; StartError = $null; Tracked = @{}; Orphans = @(); OutputDrained = $false }
    $logDir = Split-Path -Parent $LogPath
    if ($logDir -and -not (Test-Path -LiteralPath $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }
    $stdin = $null
    if ($PSBoundParameters.ContainsKey('StdinText')) { $stdin = $StdinText }
    try {
        $w = [DeusOps.WorkerProcess]::Start($Exe, $Arguments, $WorkingDirectory, $LogPath, $stdin, $EnvSet, $EnvRemove, [bool]$Echo)
    } catch {
        $e = $_.Exception
        while ($e.InnerException) { $e = $e.InnerException }
        $r.StartError = $e.Message
        $r.EndedAt = [datetime]::UtcNow
        return $r
    }
    $p = $w.Proc
    $r.Pid = $p.Id
    $r.StartedAt = [datetime]::UtcNow
    try { $created = $p.StartTime } catch { $created = Get-Date }
    $r.ProcessStartedAt = $created.ToUniversalTime()
    if ($OnStarted) { & $OnStarted $r }
    $tracked = $r.Tracked
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while (-not $p.HasExited) {
        Update-DeusDescendants $tracked $p.Id $created (Get-DeusProcessSnapshot)
        $remaining = ($deadline - (Get-Date)).TotalMilliseconds
        if ($remaining -le 0) {
            $r.TimedOut = $true
            Stop-DeusProcessTree -RootPid $p.Id -Tracked $tracked
            [void]$p.WaitForExit(15000)
            break
        }
        [void]$p.WaitForExit([int][math]::Max(1, [math]::Min($remaining, $PollSeconds * 1000)))
    }
    $r.EndedAt = [datetime]::UtcNow
    # Children started after the last poll still name the worker as their parent.
    Update-DeusDescendants $tracked $p.Id $created (Get-DeusProcessSnapshot)
    $drainEnd = (Get-Date).AddSeconds($DrainSeconds)
    while (-not $w.OutputDrained -and (Get-Date) -lt $drainEnd) { Start-Sleep -Milliseconds 100 }
    $r.OutputDrained = $w.OutputDrained
    $graceEnd = (Get-Date).AddSeconds($GraceSeconds)
    while ($true) {
        $alive = Get-DeusAliveTracked $tracked
        if ($alive.Count -eq 0 -or (Get-Date) -ge $graceEnd) { break }
        Start-Sleep -Milliseconds 250
    }
    $r.Orphans = $alive
    $w.CloseLog()
    if ($p.HasExited) { $r.ExitCode = $p.ExitCode }
    return $r
}

function Invoke-DeusProviderProbe {
    # One-line probe of a provider: OK only when it exits 0 within the timeout, replies OK and shows no usage error.
    param([string]$Provider, [int]$TimeoutSeconds = 60, [string]$LogDir, [string]$ProbeScript)
    if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Force -Path $LogDir | Out-Null }
    $stamp = (Get-Date).ToString('yyyyMMdd_HHmmss_fff')
    $promptText = 'Reply with the single word OK.'
    $promptPath = Join-Path $LogDir "probe_${Provider}_$stamp.prompt.txt"
    [IO.File]::WriteAllText($promptPath, $promptText, (New-Object Text.UTF8Encoding $false))
    if ($ProbeScript) {
        $spec = @{ Exe = (Join-Path $PSHOME 'powershell.exe'); Args = '-NoProfile -ExecutionPolicy Bypass -File ' + (ConvertTo-DeusArg $ProbeScript) + ' -Provider ' + $Provider; StdinPrompt = $true }
    } else {
        $spec = Get-DeusProviderSpec -Provider $Provider -PromptPath $promptPath -Probe
    }
    $log = Join-Path $LogDir "probe_${Provider}_$stamp.log"
    $res = @{ Provider = $Provider; Ok = $false; Reason = $null; LogPath = $log; Usage = $null; ExitCode = $null }
    if (-not $spec -or -not $spec.Exe -or -not (Test-Path -LiteralPath $spec.Exe)) { $res.Reason = 'CLI-NOT-FOUND'; return $res }
    $call = @{
        Exe = $spec.Exe; Arguments = $spec.Args; WorkingDirectory = $LogDir; LogPath = $log
        EnvRemove = @('DEUS_INTEGRATOR', 'CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT'); TimeoutSeconds = $TimeoutSeconds
        PollSeconds = 1; GraceSeconds = 1; DrainSeconds = 2
    }
    if ($spec.StdinPrompt) { $call.StdinText = $promptText }
    $r = Invoke-DeusMonitoredProcess @call
    $res.ExitCode = $r.ExitCode
    if ($r.StartError) { $res.Reason = "START-FAILED: $($r.StartError)"; return $res }
    $res.Usage = Find-DeusUsageExhaustion -Provider $Provider -LogPath $log -ExitCode $r.ExitCode -EndedAtUtc $r.EndedAt
    $text = ''
    if (Test-Path -LiteralPath $log) { $text = [IO.File]::ReadAllText($log, [Text.Encoding]::UTF8) }
    if ($r.TimedOut) { $res.Reason = "TIMEOUT after ${TimeoutSeconds}s" }
    elseif ($res.Usage) { $res.Reason = "USAGE: $($res.Usage.MatchedText)" }
    elseif ($r.ExitCode -ne 0) { $res.Reason = "EXIT $($r.ExitCode)" }
    elseif ($text -notmatch '\bOK\b') { $res.Reason = 'NO-OK-REPLY' }
    else { $res.Ok = $true; $res.Reason = 'OK' }
    return $res
}

# ---------------------------------------------------------------------------------------------
# Library: provider status and the resume queue
# ---------------------------------------------------------------------------------------------

function New-DeusProviderStatus {
    $s = [ordered]@{ schemaVersion = 1; updatedAt = $null; providers = [ordered]@{}; queue = (New-Object System.Collections.ArrayList) }
    return $s
}

function Read-DeusProviderStatus([string]$Path) {
    $s = Read-DeusJsonFile $Path $null
    if ($s -isnot [System.Collections.IDictionary]) { $s = New-DeusProviderStatus }
    if ($s['providers'] -isnot [System.Collections.IDictionary]) { $s['providers'] = [ordered]@{} }
    if ($s['queue'] -isnot [System.Collections.IList]) { $s['queue'] = New-Object System.Collections.ArrayList }
    return $s
}

function Add-DeusQueueEntry([string]$StatusPath, [System.Collections.IDictionary]$Entry, [System.Collections.IDictionary]$ProviderUpdate) {
    # Marks the provider EXHAUSTED and puts the lane in the resume queue. One queue entry per lane.
    Invoke-DeusLocked $StatusPath {
        $s = Read-DeusProviderStatus $StatusPath
        $prov = $Entry['provider']
        if (-not $s['providers'].Contains($prov)) { $s['providers'][$prov] = [ordered]@{} }
        foreach ($k in $ProviderUpdate.Keys) { $s['providers'][$prov][$k] = $ProviderUpdate[$k] }
        $key = ConvertTo-DeusLaneKey $Entry['lane']
        $keep = New-Object System.Collections.ArrayList
        foreach ($q in $s['queue']) {
            if ($q -is [System.Collections.IDictionary] -and (ConvertTo-DeusLaneKey $q['lane']) -eq $key -and $q['state'] -eq 'QUEUED') { continue }
            [void]$keep.Add($q)
        }
        [void]$keep.Add($Entry)
        $s['queue'] = $keep
        $s['updatedAt'] = Format-DeusIso (Get-Date)
        Write-DeusJsonFile $StatusPath $s
    }
}

# ---------------------------------------------------------------------------------------------
# Library: prompts
# ---------------------------------------------------------------------------------------------

function Get-DeusResumeLine([string]$Sha) {
    return "resume from HEAD $Sha; re-read BRIEF and the uncommitted diff first"
}

function New-DeusLanePrompt {
    param([string]$Lane, [string]$TaskId, [string]$Provider, [string]$Role, [string]$BriefRel, [string[]]$Allowed, [string]$ResumeSha)
    $lines = New-Object System.Collections.Generic.List[string]
    if ($ResumeSha) { $lines.Add((Get-DeusResumeLine $ResumeSha)); $lines.Add('') }
    if ($Role -eq 'reviewer') { $what = 'the independent reviewer' } else { $what = 'the primary implementer' }
    $lines.Add("You are $what for $Lane (Task $TaskId), running as $Provider.")
    $lines.Add("Read $BriefRel carefully and follow all instructions within it.")
    $lines.Add('Your allowed paths are:')
    foreach ($a in $Allowed) { $lines.Add("- $a") }
    $lines.Add('')
    $lines.Add('Standing rules:')
    $lines.Add('1. NO ART (DEC-007). Never generate, request or integrate art, and never tell anyone to.')
    $lines.Add('2. Run tests in the FOREGROUND. Never end your turn while background jobs or child processes are running. Commit early (WIP commits allowed on your branch). Do not push. Do not merge. Write only inside allowedPaths.')
    $lines.Add("Commit messages start with '[$Provider] $TaskId'.")
    return ($lines -join "`n")
}

# ---------------------------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------------------------

function Write-DeusLaunchMessage([string]$Text) { if (-not $Quiet) { Write-Host $Text } }

function Stop-DeusLaunch([string]$Reason) {
    [Console]::Error.WriteLine("launch_worker: REFUSED: $Reason")
    if ($script:LaneLock) { $script:LaneLock.Dispose(); $script:LaneLock = $null }
    exit 1
}

function Invoke-DeusLaunchMain {
    # Continue, not Stop: in Windows PowerShell 5.1 a native command's stderr line becomes a terminating error
    # under Stop. Unexpected exceptions still reach the catch at the bottom of this file.
    $ErrorActionPreference = 'Continue'
    try { [Console]::OutputEncoding = New-Object Text.UTF8Encoding $false } catch { }

    # --- arguments -------------------------------------------------------------------------
    if (-not $Lane) { Stop-DeusLaunch 'missing -Lane' }
    $prov = "$Provider".ToLowerInvariant()
    if ((Get-DeusKnownProviders) -notcontains $prov) { Stop-DeusLaunch "-Provider must be one of: $((Get-DeusKnownProviders) -join ', ')" }
    if (-not ($TimeoutMinutes -gt 0)) { Stop-DeusLaunch '-TimeoutMinutes must be greater than 0' }
    $wt = $Worktree
    if (-not $wt) { $wt = Join-Path $WorktreeRoot $Lane }
    if (-not (Test-Path -LiteralPath $wt -PathType Container)) { Stop-DeusLaunch "worktree not found: $wt" }
    $wt = (Resolve-Path -LiteralPath $wt).ProviderPath
    $prefix = & git -C $wt rev-parse --show-prefix 2>$null
    if ($LASTEXITCODE -ne 0) { Stop-DeusLaunch "not a git worktree: $wt" }
    if ($prefix) { Stop-DeusLaunch "worktree path is not the top of its git tree: $wt (inside it at $prefix)" }

    # --- brief and lane definition ------------------------------------------------------------
    if (-not $BriefPath) { Stop-DeusLaunch 'missing -BriefPath' }
    $brief = $BriefPath
    if (-not [IO.Path]::IsPathRooted($brief)) { $brief = Join-Path $wt $brief }
    if (-not (Test-Path -LiteralPath $brief -PathType Leaf)) { Stop-DeusLaunch "brief not found: $brief" }
    $brief = (Resolve-Path -LiteralPath $brief).ProviderPath
    if ((Get-Item -LiteralPath $brief).Length -eq 0 -or -not ([IO.File]::ReadAllText($brief)).Trim()) { Stop-DeusLaunch "brief is empty: $brief" }
    if (-not $brief.StartsWith($wt + '\', [StringComparison]::OrdinalIgnoreCase)) { Stop-DeusLaunch "brief is outside the worktree: $brief" }
    $briefRel = $brief.Substring($wt.Length + 1).Replace('\', '/')

    $laneJsonPath = Join-Path (Split-Path -Parent $brief) 'lane.json'
    $laneInfo = [ordered]@{}
    if (Test-Path -LiteralPath $laneJsonPath) { $laneInfo = Read-DeusJsonFile $laneJsonPath ([ordered]@{}) }
    $taskId = $laneInfo['taskId']
    if (-not $taskId -and $briefRel -match '^tasks/([^/]+)/') { $taskId = $Matches[1] }
    if (-not $taskId) { Stop-DeusLaunch "cannot tell the task id: no lane.json taskId and the brief is not under tasks/<task>/" }
    $allowed = @()
    if ($laneInfo['allowedPaths']) { $allowed = @($laneInfo['allowedPaths']) }
    elseif ($AllowedPaths) { $allowed = @($AllowedPaths | ForEach-Object { "$_".Split(',') } | Where-Object { $_ }) }
    if (-not $allowed) { Stop-DeusLaunch "no allowedPaths (lane.json next to the brief, or -AllowedPaths): the scope check would be impossible" }

    # --- roles ------------------------------------------------------------------------------
    $writer = "$($laneInfo['writer'])".ToLowerInvariant()
    $reviewer = "$($laneInfo['reviewer'])".ToLowerInvariant()
    $roleName = "$Role".ToLowerInvariant()
    if (-not $roleName) {
        if ($prov -eq $writer) { $roleName = 'writer' }
        elseif ($prov -eq $reviewer) { $roleName = 'reviewer' }
        else { $roleName = 'writer' }
    }
    if ($roleName -ne 'writer' -and $roleName -ne 'reviewer') { Stop-DeusLaunch "-Role must be writer or reviewer" }
    if ($roleName -eq 'writer') { $counterpart = $reviewer } else { $counterpart = $writer }
    if ($counterpart -and (Get-DeusProviderFamily $counterpart) -eq (Get-DeusProviderFamily $prov)) {
        Stop-DeusLaunch "$prov as $roleName would share the $(Get-DeusProviderFamily $prov) family with the lane's other role ($counterpart); writer and reviewer must be different AI families"
    }

    # --- branch -----------------------------------------------------------------------------
    $branch = (& git -C $wt rev-parse --abbrev-ref HEAD 2>$null)
    if ($laneInfo['branch'] -and $branch -ne $laneInfo['branch']) { Stop-DeusLaunch "worktree is on branch '$branch', lane.json says '$($laneInfo['branch'])'" }

    # --- telemetry paths ----------------------------------------------------------------------
    $mainWt = Get-DeusMainWorktree $wt
    $reg = $RegistryPath
    if (-not $reg) {
        if (-not $mainWt) { Stop-DeusLaunch 'cannot find the main worktree for the default -RegistryPath' }
        $reg = Join-Path $mainWt 'docs\telemetry\sessions\active_workers.json'
    }
    $statusPath = $ProviderStatusPath
    if (-not $statusPath) { $statusPath = Join-Path (Split-Path -Parent $reg) 'provider_status.json' }
    $logs = $LogRoot
    if (-not $logs) { $logs = Join-Path $WorktreeRoot 'logs' }

    # --- one session per lane ---------------------------------------------------------------
    $script:LaneLock = Enter-DeusLaneLock -LogRoot $logs -Lane $Lane -WaitSeconds 3
    if (-not $script:LaneLock) { Stop-DeusLaunch "lane $Lane is locked by another launcher ($(Join-Path (Join-Path $logs $Lane) 'lane.lock'))" }
    $active = Get-DeusActiveLaneWorkers -RegistryPath $reg -Lane $Lane
    if ($active.Count -gt 0) {
        Stop-DeusLaunch "lane $Lane already has a live worker: pid $($active[0]['pid']) run $($active[0]['runId']) (state $($active[0]['state']))"
    }
    Set-DeusStaleLaneEntries -RegistryPath $reg -Lane $Lane

    # --- provider command -------------------------------------------------------------------
    if ($ProviderExe) {
        $spec = @{ Exe = $ProviderExe; Args = "$ProviderArgs"; StdinPrompt = [bool]$ProviderStdinPrompt }
    } else {
        $spec = Get-DeusProviderSpec -Provider $prov -PromptPath '{promptFile}'
    }
    if (-not $spec -or -not $spec.Exe -or -not (Test-Path -LiteralPath $spec.Exe)) { Stop-DeusLaunch "no CLI found for provider $prov" }

    # --- prompt -----------------------------------------------------------------------------
    $headBefore = (& git -C $wt rev-parse HEAD 2>$null)
    if ($PromptFile) {
        if (-not (Test-Path -LiteralPath $PromptFile -PathType Leaf)) { Stop-DeusLaunch "prompt file not found: $PromptFile" }
        $promptText = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $PromptFile).ProviderPath, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
        if ($ResumeFromSha) { $promptText = (Get-DeusResumeLine $ResumeFromSha) + "`n`n" + $promptText }
    } else {
        $promptText = New-DeusLanePrompt -Lane $Lane -TaskId $taskId -Provider $prov -Role $roleName -BriefRel $briefRel -Allowed $allowed -ResumeSha $ResumeFromSha
    }
    if (-not $promptText.Trim()) { Stop-DeusLaunch 'prompt is empty' }
    $launchRel = "tasks/$taskId/$Lane/launches"
    $launchDir = Join-Path $wt ($launchRel.Replace('/', '\'))
    if (-not (Test-Path -LiteralPath $launchDir)) { New-Item -ItemType Directory -Force -Path $launchDir | Out-Null }
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $suffix = ''
    $n = 1
    while ((Test-Path -LiteralPath (Join-Path $launchDir "$stamp${suffix}_prompt.txt")) -or (Test-Path -LiteralPath (Join-Path (Join-Path $logs $Lane) "${Lane}_$stamp$suffix.log"))) {
        $n++
        $suffix = "_$n"
    }
    $runId = "${Lane}_$stamp$suffix"
    $promptRel = "$launchRel/$stamp${suffix}_prompt.txt"
    $promptPath = Join-Path $wt ($promptRel.Replace('/', '\'))
    [IO.File]::WriteAllText($promptPath, $promptText, (New-Object Text.UTF8Encoding $false))
    if (-not $NoCommitPrompt) {
        & git -C $wt add -- $promptRel 2>&1 | Out-Null
        & git -C $wt commit -q --only -m "[ops] $taskId $Lane launch prompt $stamp$suffix" -- $promptRel 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { Stop-DeusLaunch "could not commit the prompt file $promptRel" }
    }
    $base = (& git -C $wt rev-parse HEAD 2>$null)
    $resumeMismatch = $false
    if ($ResumeFromSha -and $headBefore -and -not $headBefore.StartsWith($ResumeFromSha, [StringComparison]::OrdinalIgnoreCase)) { $resumeMismatch = $true }

    # --- run --------------------------------------------------------------------------------
    $logDir = Join-Path $logs $Lane
    $logPath = Join-Path $logDir "$runId.log"
    $argLine = $spec.Args.Replace('{promptFile}', (ConvertTo-DeusArg $promptPath)).Replace('{worktree}', (ConvertTo-DeusArg $wt)).Replace('{runId}', $runId)
    $pushGuard = (& git -C $wt config --get core.hooksPath 2>$null)
    $startFields = [ordered]@{
        lane = $Lane; provider = $prov; role = $roleName; taskId = $taskId; state = 'RUNNING'
        pid = $null; processStartedAt = $null; launcherPid = $PID
        launcherStartedAt = (Format-DeusIso (Get-Process -Id $PID).StartTime)
        worktree = $wt; branch = $branch; briefPath = $brief; launchPromptPath = $promptPath
        logPath = $logPath; launchTimeCT = (Format-DeusCentral (Get-Date)); startedAt = (Format-DeusIso (Get-Date))
        endedAt = $null; exitCode = $null; timeoutMinutes = $TimeoutMinutes; baseCommit = $base
        resumeFromSha = $(if ($ResumeFromSha) { $ResumeFromSha } else { $null }); pushGuardHooksPath = $(if ($pushGuard) { $pushGuard } else { $null })
        gitIdentity = "deus-$prov"
    }
    Update-DeusRegistryEntry $reg $runId $startFields
    $script:RunCtx = @{ Registry = $reg; RunId = $runId }

    $envSet = @{ GIT_AUTHOR_NAME = "deus-$prov"; GIT_COMMITTER_NAME = "deus-$prov"; DEUS_RUN_ID = $runId }
    $call = @{
        Exe = $spec.Exe; Arguments = $argLine; WorkingDirectory = $wt; LogPath = $logPath
        EnvSet = $envSet; EnvRemove = @('DEUS_INTEGRATOR', 'CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT')
        TimeoutSeconds = $TimeoutMinutes * 60; PollSeconds = $PollSeconds; GraceSeconds = $OrphanGraceSeconds
        Echo = (-not $Quiet)
        OnStarted = {
            param($r)
            $script:WorkerPid = $r.Pid
            Update-DeusRegistryEntry $reg $runId ([ordered]@{ pid = $r.Pid; processStartedAt = (Format-DeusIso $r.ProcessStartedAt) })
        }
    }
    if ($spec.StdinPrompt) { $call.StdinText = $promptText }
    Write-DeusLaunchMessage "launch_worker: $runId $prov ($roleName) in $wt; log $logPath; timeout $TimeoutMinutes min"
    $r = Invoke-DeusMonitoredProcess @call

    # --- after the run ----------------------------------------------------------------------
    $flags = New-Object System.Collections.Generic.List[string]
    $head = (& git -C $wt rev-parse HEAD 2>$null)
    $branchAfter = (& git -C $wt rev-parse --abbrev-ref HEAD 2>$null)
    $newCommits = 0
    if ($base -and $head) { $newCommits = [int](& git -C $wt rev-list --count "$base..$head" 2>$null) }
    $changes = Get-DeusChangedFiles $wt $base
    if ($NoCommitPrompt) { $changes.Uncommitted = @($changes.Uncommitted | Where-Object { $_ -ne $promptRel }) }
    $outOfScope = @(@($changes.Committed) + @($changes.Uncommitted) | Where-Object { $_ } | Sort-Object -Unique | Where-Object { -not (Test-DeusPathAllowed $_ $allowed) })
    $logBytes = 0
    if (Test-Path -LiteralPath $logPath) { $logBytes = (Get-Item -LiteralPath $logPath).Length }
    $usage = $null
    if (-not $r.StartError) {
        $usage = Find-DeusUsageExhaustion -Provider $prov -LogPath $logPath -ExitCode $r.ExitCode -EndedAtUtc $r.EndedAt -DefaultResetMinutes $DefaultResetMinutes
    }

    if ($r.StartError) { $flags.Add('START-FAILED') }
    if ($r.TimedOut) { $flags.Add('TIMEOUT') }
    if ($usage) { $flags.Add('USAGE-EXHAUSTED') }
    if ($r.Orphans.Count -gt 0) { $flags.Add('ORPHANED-CHILDREN') }
    if ($newCommits -eq 0 -and @($changes.Uncommitted).Count -gt 0) { $flags.Add('EXITED-NO-COMMIT') }
    if ($logBytes -eq 0) { $flags.Add('EMPTY-LOG') }
    if ($outOfScope.Count -gt 0) { $flags.Add('OUT-OF-SCOPE') }
    if ($branchAfter -ne $branch) { $flags.Add('BRANCH-CHANGED') }
    if ($null -ne $r.ExitCode -and $r.ExitCode -ne 0) { $flags.Add('FAILED') }
    $state = 'COMPLETED'
    foreach ($s in @('START-FAILED', 'TIMEOUT', 'USAGE-EXHAUSTED', 'ORPHANED-CHILDREN', 'EXITED-NO-COMMIT', 'EMPTY-LOG', 'OUT-OF-SCOPE', 'BRANCH-CHANGED', 'FAILED')) {
        if ($flags.Contains($s)) { $state = $s; break }
    }

    $orphanList = New-Object System.Collections.ArrayList
    foreach ($o in $r.Orphans) {
        $cmd = "$($o.CommandLine)"
        if ($cmd.Length -gt 300) { $cmd = $cmd.Substring(0, 300) }
        [void]$orphanList.Add([ordered]@{ pid = $o.Pid; name = $o.Name; commandLine = $cmd })
    }
    $orphansKilled = $false
    if ($KillOrphans -and $r.Orphans.Count -gt 0) {
        foreach ($o in $r.Orphans) { Stop-Process -Id $o.Pid -Force -ErrorAction SilentlyContinue }
        $orphansKilled = $true
    }
    $usageRec = $null
    if ($usage) { $usageRec = [ordered]@{ matchedText = $usage.MatchedText; pattern = $usage.Pattern; resetAt = (Format-DeusIso $usage.ResetAt); resetSource = $usage.ResetSource } }

    $endFields = [ordered]@{
        state = $state; flags = @($flags); endedAt = (Format-DeusIso $r.EndedAt); exitCode = $r.ExitCode
        timedOut = $r.TimedOut; startError = $r.StartError; logBytes = $logBytes; outputDrained = $r.OutputDrained
        headCommit = $head; branchAfter = $branchAfter; newCommits = $newCommits
        dirtyFiles = @($changes.Uncommitted); outOfScope = $outOfScope; orphans = $orphanList; orphansKilled = $orphansKilled
        usage = $usageRec; resumeHeadMismatch = $resumeMismatch
    }
    Update-DeusRegistryEntry $reg $runId $endFields
    [IO.File]::WriteAllText((Join-Path $logDir "$runId.exit"), "EXIT=$($r.ExitCode)`r`nSTATE=$state`r`n", (New-Object Text.UTF8Encoding $false))

    if ($usage) {
        $entry = [ordered]@{
            lane = $Lane; taskId = $taskId; provider = $prov; role = $roleName; writer = $writer; reviewer = $reviewer
            briefPath = $brief; worktree = $wt; branch = $branch; lastCommit = $head; state = 'QUEUED'
            reason = 'USAGE-EXHAUSTED'; matchedText = $usage.MatchedText; resetAt = (Format-DeusIso $usage.ResetAt)
            queuedAt = (Format-DeusIso (Get-Date)); runId = $runId; timeoutMinutes = $TimeoutMinutes
        }
        $provUpdate = [ordered]@{
            state = 'EXHAUSTED'; resetAt = (Format-DeusIso $usage.ResetAt); resetSource = $usage.ResetSource
            lastError = $usage.MatchedText; lastErrorAt = (Format-DeusIso $r.EndedAt); lastErrorRunId = $runId
        }
        Add-DeusQueueEntry $statusPath $entry $provUpdate
    }

    Write-DeusLaunchMessage "launch_worker: $runId finished: state $state; exit $($r.ExitCode); flags $(if ($flags.Count) { $flags -join ',' } else { 'none' }); new commits $newCommits; log $logBytes bytes"
    if ($outOfScope.Count -gt 0) { Write-DeusLaunchMessage ("launch_worker: changed outside allowedPaths:`n  " + ($outOfScope -join "`n  ")) }
    if ($orphanList.Count -gt 0) { Write-DeusLaunchMessage ("launch_worker: children still alive after the worker exited: " + (($orphanList | ForEach-Object { "$($_.pid) $($_.name)" }) -join '; ')) }
    if ($usage) { Write-DeusLaunchMessage "launch_worker: usage limit: '$($usage.MatchedText)'; reset $(Format-DeusIso $usage.ResetAt) ($($usage.ResetSource)); lane queued in $statusPath" }
    $script:RunCtx = $null
    if ($script:LaneLock) { $script:LaneLock.Dispose(); $script:LaneLock = $null }
    if ($state -eq 'COMPLETED' -and $flags.Count -eq 0) { exit 0 }
    exit 2
}

$script:LaneLock = $null
$script:WorkerPid = $null
$script:RunCtx = $null
try {
    Invoke-DeusLaunchMain
} catch {
    [Console]::Error.WriteLine("launch_worker: ERROR: $($_.Exception.Message) at line $($_.InvocationInfo.ScriptLineNumber)")
    if ($script:WorkerPid) { & taskkill.exe /PID $script:WorkerPid /T /F 2>&1 | Out-Null }
    if ($script:RunCtx) {
        try {
            Update-DeusRegistryEntry $script:RunCtx.Registry $script:RunCtx.RunId ([ordered]@{
                state = 'LAUNCHER-ERROR'; endedAt = (Format-DeusIso (Get-Date)); launcherError = $_.Exception.Message })
        } catch { }
    }
    if ($script:LaneLock) { $script:LaneLock.Dispose() }
    exit 3
}
