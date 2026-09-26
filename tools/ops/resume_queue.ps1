<#
.SYNOPSIS
    Auto-resume for lanes stopped by a provider usage limit (WG.00.12 Lane J).

.DESCRIPTION
    One pass over docs/telemetry/sessions/provider_status.json (run it on a schedule):
      1. Probes each provider whose state is EXHAUSTED or LIMITED and whose resetAt has passed (or is unknown),
         plus any provider named in -Probe. Codex is probed on the same terms as Claude and Grok. A probe is
         a one-line prompt with a 60 s timeout; it passes only on exit 0 with an OK reply and no usage error.
           pass -> provider state AVAILABLE
           fail -> resetAt = max(resetAt, now) + 30 minutes
      2. Relaunches each QUEUED lane through launch_worker.ps1 with the prompt
         "resume from HEAD <sha>; re-read BRIEF and the uncommitted diff first", when its provider is AVAILABLE.
         With -AllowFailover a lane whose provider is still exhausted may move to another AVAILABLE provider,
         but only if the writer and the reviewer stay in different AI families (never Grok writing for a
         Grok reviewer).
      Never two sessions on one lane: a lane is skipped while any registry entry for it has a live PID, while
      its lane lock is held, or when it was already started in this pass.

    Exit codes: 0 pass finished; 1 a relaunch failed to start; 2 bad arguments or unreadable files.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/resume_queue.ps1
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/resume_queue.ps1 -AllowFailover -DryRun
#>
[CmdletBinding()]
param(
    [string]$ProviderStatusPath,
    [string]$RegistryPath,
    [string]$LauncherPath,
    [string]$WorktreeRoot = (Join-Path $env:USERPROFILE '.deus_worktrees'),
    [string]$LogRoot,
    [int]$ProbeTimeoutSeconds = 60,
    [double]$BackoffMinutes = 30,
    [switch]$AllowFailover,
    [string[]]$FailoverOrder = @('claude', 'codex', 'grok'),
    [string[]]$Probe = @(),
    [switch]$DryRun,
    [string]$NowUtc,
    [string]$ProbeScript,
    [string[]]$LauncherExtraArgs = @(),
    [int]$LaunchVerifySeconds = 30,
    [double]$DefaultTimeoutMinutes = 240
)

$ErrorActionPreference = 'Continue'

# The shared functions live in launch_worker.ps1. Load its top-level function definitions only; its
# parameters and main block never run here.
# $PSScriptRoot is empty in param defaults under Windows PowerShell 5.1, so this default is set here.
if (-not $LauncherPath) { $LauncherPath = Join-Path $PSScriptRoot 'launch_worker.ps1' }
$libPath = Join-Path $PSScriptRoot 'launch_worker.ps1'
$libErrors = $null
$libAst = [System.Management.Automation.Language.Parser]::ParseFile($libPath, [ref]$null, [ref]$libErrors)
if ($libErrors) { [Console]::Error.WriteLine("resume_queue: cannot parse $libPath"); exit 2 }
foreach ($fn in $libAst.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    . ([scriptblock]::Create($fn.Extent.Text))
}

function Write-Queue([string]$Text) { Write-Host "resume_queue: $Text" }

function Split-List([string[]]$Items) { return @($Items | ForEach-Object { "$_".Split(',') } | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ }) }

function Get-ProviderState($Status, [string]$Name) {
    $p = $Status['providers'][$Name]
    if ($p -is [System.Collections.IDictionary]) { return "$($p['state'])".ToUpperInvariant() }
    return 'UNKNOWN'
}

function Find-SafeProvider {
    # The provider this entry may run on now, or $null with the reasons in $Why.
    param($Entry, $Status, [bool]$Failover, [string[]]$Order, [System.Collections.Generic.List[string]]$Why)
    $prov = "$($Entry['provider'])".ToLowerInvariant()
    $role = "$($Entry['role'])".ToLowerInvariant()
    if (-not $role) { $role = 'writer' }
    if ($role -eq 'reviewer') { $counterpart = "$($Entry['writer'])".ToLowerInvariant() } else { $counterpart = "$($Entry['reviewer'])".ToLowerInvariant() }
    $candidates = @($prov)
    if ($Failover) { $candidates += @($Order | Where-Object { $_ -ne $prov }) }
    foreach ($q in $candidates) {
        $st = Get-ProviderState $Status $q
        if ($st -ne 'AVAILABLE') { $Why.Add("${q}: $st"); continue }
        if ($q -ne $prov -and -not $counterpart) { $Why.Add("${q}: the lane's other role is unknown, so failover cannot check AI families"); continue }
        if ($counterpart -and (Get-DeusProviderFamily $q) -eq (Get-DeusProviderFamily $counterpart)) {
            $Why.Add("${q}: same AI family ($(Get-DeusProviderFamily $q)) as the lane's other role ($counterpart)")
            continue
        }
        return $q
    }
    return $null
}

# --- paths -----------------------------------------------------------------------------------
$statusPath = $ProviderStatusPath
$reg = $RegistryPath
if (-not $statusPath -or -not $reg) {
    $mainWt = Get-DeusMainWorktree $PSScriptRoot
    if (-not $mainWt) { [Console]::Error.WriteLine('resume_queue: cannot find the main worktree; pass -ProviderStatusPath and -RegistryPath'); exit 2 }
    if (-not $statusPath) { $statusPath = Join-Path $mainWt 'docs\telemetry\sessions\provider_status.json' }
    if (-not $reg) { $reg = Join-Path $mainWt 'docs\telemetry\sessions\active_workers.json' }
}
$logs = $LogRoot
if (-not $logs) { $logs = Join-Path $WorktreeRoot 'logs' }
$now = [datetime]::UtcNow
if ($NowUtc) {
    $now = ConvertFrom-DeusIso $NowUtc
    if (-not $now) { [Console]::Error.WriteLine("resume_queue: bad -NowUtc '$NowUtc'"); exit 2 }
}
$order = Split-List $FailoverOrder
$forced = Split-List $Probe
foreach ($p in $order + $forced) {
    if ((Get-DeusKnownProviders) -notcontains $p) { [Console]::Error.WriteLine("resume_queue: unknown provider '$p'"); exit 2 }
}
if (-not (Test-Path -LiteralPath $statusPath)) { Write-Queue "no provider status file at $statusPath; nothing to do"; exit 0 }
try { $status = Read-DeusProviderStatus $statusPath } catch { [Console]::Error.WriteLine("resume_queue: cannot read ${statusPath}: $($_.Exception.Message)"); exit 2 }

# --- 1. probes -------------------------------------------------------------------------------
$probeResults = @{}
foreach ($p in (Get-DeusKnownProviders)) {
    $st = Get-ProviderState $status $p
    $eligible = $forced -contains $p
    if (-not $eligible -and ($st -eq 'EXHAUSTED' -or $st -eq 'LIMITED')) {
        $resetAt = ConvertFrom-DeusIso "$($status['providers'][$p]['resetAt'])"
        $eligible = (-not $resetAt) -or ($resetAt -le $now)
        if (-not $eligible) { Write-Queue "$p is $st until $(Format-DeusIso $resetAt); not probed" }
    }
    if (-not $eligible) { continue }
    if ($DryRun) { Write-Queue "would probe $p (state $st)"; continue }
    Write-Queue "probing $p (state $st, timeout ${ProbeTimeoutSeconds}s)"
    $probeResults[$p] = Invoke-DeusProviderProbe -Provider $p -TimeoutSeconds $ProbeTimeoutSeconds -LogDir (Join-Path $logs '_probes') -ProbeScript $ProbeScript
    Write-Queue "probe $p -> $($probeResults[$p].Reason)"
}

# --- 2. apply probe results and choose relaunches (under the status lock) ---------------------
$launches = New-Object System.Collections.ArrayList
$apply = {
    $s = Read-DeusProviderStatus $statusPath
    foreach ($p in $probeResults.Keys) {
        $res = $probeResults[$p]
        if (-not $s['providers'].Contains($p)) { $s['providers'][$p] = [ordered]@{} }
        $e = $s['providers'][$p]
        $e['lastProbeAt'] = Format-DeusIso $now
        $e['lastProbeResult'] = $res.Reason
        $e['lastProbeLog'] = $res.LogPath
        if ($res.Ok) {
            $e['state'] = 'AVAILABLE'
            $e['resetAt'] = $null
        } else {
            if ("$($e['state'])" -notmatch '^(?i)(EXHAUSTED|LIMITED)$') { $e['state'] = 'EXHAUSTED' }
            $base = ConvertFrom-DeusIso "$($e['resetAt'])"
            if (-not $base -or $base -lt $now) { $base = $now }
            $e['resetAt'] = Format-DeusIso ($base.AddMinutes($BackoffMinutes))
        }
    }
    $startedLanes = @{}
    foreach ($q in $s['queue']) {
        if ($q -isnot [System.Collections.IDictionary] -or $q['state'] -ne 'QUEUED') { continue }
        $lane = "$($q['lane'])"
        $key = ConvertTo-DeusLaneKey $lane
        if ($startedLanes.ContainsKey($key)) { Write-Queue "$lane skipped: already relaunched in this pass"; continue }
        $live = Get-DeusActiveLaneWorkers -RegistryPath $reg -Lane $lane
        if ($live.Count -gt 0) {
            $q['lastSkip'] = "LANE-ACTIVE pid $($live[0]['pid']) run $($live[0]['runId'])"
            Write-Queue "$lane skipped: live worker pid $($live[0]['pid']) (run $($live[0]['runId']))"
            continue
        }
        if (Test-DeusLaneLocked -LogRoot $logs -Lane $lane) {
            $q['lastSkip'] = 'LANE-LOCKED'
            Write-Queue "$lane skipped: lane lock held"
            continue
        }
        $why = New-Object System.Collections.Generic.List[string]
        $target = Find-SafeProvider -Entry $q -Status $s -Failover ([bool]$AllowFailover) -Order $order -Why $why
        if (-not $target) {
            $q['lastSkip'] = 'NO-PROVIDER: ' + ($why -join '; ')
            Write-Queue "$lane waits: $($why -join '; ')"
            continue
        }
        $startedLanes[$key] = $true
        if (-not $DryRun) {
            $q['state'] = 'RESUMING'
            $q['resumeProvider'] = $target
            $q['resumeRequestedAt'] = Format-DeusIso $now
            if ($target -ne "$($q['provider'])".ToLowerInvariant()) { $q['failoverFrom'] = $q['provider']; $q['failoverTo'] = $target }
        }
        [void]$launches.Add(@{ Entry = $q; Provider = $target })
    }
    $s['updatedAt'] = Format-DeusIso (Get-Date)
    if (-not $DryRun) { Write-DeusJsonFile $statusPath $s }
}
Invoke-DeusLocked $statusPath $apply

# --- 3. relaunch -------------------------------------------------------------------------------
$failedStarts = 0
foreach ($l in $launches) {
    $q = $l.Entry
    $lane = "$($q['lane'])"
    $launchArgs = @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $LauncherPath,
        '-Lane', $lane, '-Provider', $l.Provider, '-BriefPath', "$($q['briefPath'])",
        '-TimeoutMinutes', ([string]$(if ($q['timeoutMinutes']) { $q['timeoutMinutes'] } else { $DefaultTimeoutMinutes })),
        '-ResumeFromSha', "$($q['lastCommit'])", '-Role', "$(if ($q['role']) { $q['role'] } else { 'writer' })",
        '-RegistryPath', $reg, '-ProviderStatusPath', $statusPath, '-LogRoot', $logs, '-Quiet'
    )
    if ($q['worktree']) { $launchArgs += @('-Worktree', "$($q['worktree'])") }
    $launchArgs += $LauncherExtraArgs
    $argLine = ($launchArgs | ForEach-Object { ConvertTo-DeusArg ([string]$_) }) -join ' '
    if ($DryRun) { Write-Queue "would relaunch $lane on $($l.Provider): powershell $argLine"; continue }

    $outDir = Join-Path $logs $lane
    if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
    $stamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
    $proc = $null
    $err = $null
    try {
        $proc = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList $argLine -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $outDir "resume_$stamp.launcher.out.log") -RedirectStandardError (Join-Path $outDir "resume_$stamp.launcher.err.log")
    } catch { $err = $_.Exception.Message }

    # The launch counts once the launcher has registered a run under its own PID.
    $registered = $null
    if ($proc) {
        $deadline = (Get-Date).AddSeconds($LaunchVerifySeconds)
        while ((Get-Date) -lt $deadline) {
            foreach ($e in (Read-DeusJsonFile $reg (New-Object System.Collections.ArrayList))) {
                if ($e -is [System.Collections.IDictionary] -and "$($e['launcherPid'])" -eq "$($proc.Id)") { $registered = $e; break }
            }
            if ($registered -or $proc.HasExited) { break }
            Start-Sleep -Milliseconds 250
        }
        if (-not $registered) {
            foreach ($e in (Read-DeusJsonFile $reg (New-Object System.Collections.ArrayList))) {
                if ($e -is [System.Collections.IDictionary] -and "$($e['launcherPid'])" -eq "$($proc.Id)") { $registered = $e; break }
            }
        }
        if (-not $registered -and $proc.HasExited) { $err = "launcher exited with code $($proc.ExitCode) before registering a run" }
    }
    $ok = [bool]$registered -or ($proc -and -not $err -and -not $proc.HasExited)
    Invoke-DeusLocked $statusPath {
        $s = Read-DeusProviderStatus $statusPath
        foreach ($x in $s['queue']) {
            if ($x -isnot [System.Collections.IDictionary]) { continue }
            if ($x['runId'] -ne $q['runId'] -or (ConvertTo-DeusLaneKey $x['lane']) -ne (ConvertTo-DeusLaneKey $lane) -or $x['state'] -ne 'RESUMING') { continue }
            if ($ok) {
                $x['state'] = 'RESUMED'
                $x['resumedAt'] = Format-DeusIso (Get-Date)
                $x['resumeLauncherPid'] = $proc.Id
                if ($registered) { $x['resumeRunId'] = $registered['runId']; $x['resumeVerified'] = $true } else { $x['resumeVerified'] = $false }
            } else {
                $x['state'] = 'QUEUED'
                $x['lastResumeError'] = $err
                $x['lastResumeErrorAt'] = Format-DeusIso (Get-Date)
            }
        }
        Write-DeusJsonFile $statusPath $s
    }
    if ($ok) {
        Write-Queue "relaunched $lane on $($l.Provider): launcher pid $($proc.Id)$(if ($registered) { ", run $($registered['runId'])" } else { ' (not registered yet)' })"
    } else {
        Write-Queue "relaunch of $lane FAILED: $err"
        $failedStarts++
    }
}

if ($failedStarts -gt 0) { exit 1 }
exit 0
