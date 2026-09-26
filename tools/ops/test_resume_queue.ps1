<#
.SYNOPSIS
    Tests for tools/ops/resume_queue.ps1: exhaustion handling, probes and backoff, one session per lane,
    failover that keeps writer and reviewer in different AI families, and an end-to-end relaunch through the
    real launch_worker.ps1.

.DESCRIPTION
    Uses a throwaway repository under %TEMP% (same harness as test_launch_worker.ps1), a fake probe script
    (one planned result per provider) and, for most tests, a fake launcher that records its arguments.

      -Only <name>[,<name>]  run only these tests
      -List                  list the test names
      -Mutants               mutation sweep: each mutant copy of tools/ops must make at least one test FAIL
      -OpsDir / -RepoRoot    test another copy of tools/ops (used by -Mutants)
      -KeepTemp              keep the temp folder

    Exit: 0 all checks passed (or all mutants caught); 1 otherwise.
#>
[CmdletBinding()]
param(
    [string[]]$Only,
    [switch]$List,
    [switch]$Mutants,
    [string]$OpsDir,
    [string]$RepoRoot,
    [switch]$KeepTemp
)

$ErrorActionPreference = 'Continue'
# $PSScriptRoot is empty in param defaults under Windows PowerShell 5.1, so defaults that need it are set here.
if (-not $OpsDir) { $OpsDir = $PSScriptRoot }
if (-not $RepoRoot) { $RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')) }
$OpsDir = [IO.Path]::GetFullPath($OpsDir)
$PsExe = Join-Path $PSHOME 'powershell.exe'

# Library functions from the launcher under test, then the harness functions from test_launch_worker.ps1.
foreach ($src in @('launch_worker.ps1', 'test_launch_worker.ps1')) {
    $ast = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $OpsDir $src), [ref]$null, [ref]$null)
    foreach ($fn in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
        . ([scriptblock]::Create($fn.Extent.Text))
    }
}

$Now = '2026-09-26T12:00:00Z'

function Write-FakeHelpers([string]$Dir) {
    $probe = @'
param([string]$Provider)
# Fake provider probe: the result for each provider is planned in probe_plan.txt (provider=ok|usage|hang|fail).
$plan = @{}
foreach ($l in (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'probe_plan.txt'))) { if ($l -match '^(\w+)=(\S+)$') { $plan[$Matches[1]] = $Matches[2] } }
Add-Content -LiteralPath (Join-Path $PSScriptRoot 'probe_calls.txt') -Value $Provider
$null = [Console]::In.ReadToEnd()
switch ($plan[$Provider]) {
    'ok' { 'OK'; exit 0 }
    'usage' { [Console]::Error.WriteLine("Error: You've hit your usage limit. Try again in 3 hours."); exit 1 }
    'hang' { Start-Sleep -Seconds 60; exit 0 }
    default { 'no'; exit 3 }
}
'@
    $launcher = @'
param([string]$Lane, [string]$Provider, [string]$BriefPath, [string]$TimeoutMinutes, [string]$ResumeFromSha, [string]$Role,
      [string]$RegistryPath, [string]$ProviderStatusPath, [string]$LogRoot, [string]$Worktree, [switch]$Quiet,
      [Parameter(ValueFromRemainingArguments = $true)]$Rest)
# Fake launcher: records its arguments; registers a run under its PID unless launcher_plan.txt says exit1.
$plan = 'register'
$pf = Join-Path $PSScriptRoot 'launcher_plan.txt'
if (Test-Path -LiteralPath $pf) { $plan = (Get-Content -LiteralPath $pf -Raw).Trim() }
$calls = Join-Path $PSScriptRoot 'launcher_calls'
New-Item -ItemType Directory -Force -Path $calls | Out-Null
[IO.File]::WriteAllText((Join-Path $calls "$PID.txt"), "lane=$Lane`nprovider=$Provider`nrole=$Role`nresume=$ResumeFromSha`nbrief=$BriefPath`ntimeout=$TimeoutMinutes`nworktree=$Worktree`nregistry=$RegistryPath`n")
if ($plan -eq 'exit1') { exit 1 }
$list = @()
if (Test-Path -LiteralPath $RegistryPath) {
    $raw = [IO.File]::ReadAllText($RegistryPath)
    if ($raw.Trim()) { foreach ($x in (ConvertFrom-Json $raw)) { $list += $x } }
}
$list += [pscustomobject]@{ runId = "fake_$PID"; lane = $Lane; state = 'COMPLETED'; launcherPid = $PID; pid = $null }
[IO.File]::WriteAllText($RegistryPath, (ConvertTo-Json -InputObject @($list) -Depth 5))
exit 0
'@
    [IO.File]::WriteAllText((Join-Path $Dir 'fake_probe.ps1'), $probe)
    [IO.File]::WriteAllText((Join-Path $Dir 'fake_launcher.ps1'), $launcher)
}

function Reset-Queue($Fx) {
    Reset-Lane $Fx
    foreach ($f in @('probe_plan.txt', 'probe_calls.txt', 'launcher_plan.txt')) { Remove-Item -LiteralPath (Join-Path $TestRoot $f) -Force -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath (Join-Path $TestRoot 'launcher_calls') -Recurse -Force -ErrorAction SilentlyContinue
    [IO.File]::WriteAllText((Join-Path $TestRoot 'probe_plan.txt'), '')
}

function New-QueueEntry($Fx, [hashtable]$Over = @{}) {
    $e = [ordered]@{
        lane = $Fx.Lane; taskId = 'T.01'; provider = 'claude'; role = 'writer'; writer = 'claude'; reviewer = 'grok'
        briefPath = (Join-Path $Fx.Wt 'tasks\T.01\lane-t\BRIEF.md'); worktree = $Fx.Wt; branch = 'task/lane-t'
        lastCommit = $Fx.Base; state = 'QUEUED'; reason = 'USAGE-EXHAUSTED'; runId = 'r1'; timeoutMinutes = 2
    }
    foreach ($k in $Over.Keys) { $e[$k] = $Over[$k] }
    return $e
}

function Set-QueueStatus($Fx, [hashtable]$Providers, $Entries) {
    $s = New-DeusProviderStatus
    foreach ($k in $Providers.Keys) {
        $v = $Providers[$k]
        $s['providers'][$k] = [ordered]@{ state = $v[0]; resetAt = $v[1] }
    }
    foreach ($e in $Entries) { [void]$s['queue'].Add($e) }
    Write-DeusJsonFile $Fx.Status $s
}

function Set-Plan([string]$Probe, [string]$Launcher) {
    if ($null -ne $Probe) { [IO.File]::WriteAllText((Join-Path $TestRoot 'probe_plan.txt'), $Probe.Replace(';', "`n")) }
    if ($Launcher) { [IO.File]::WriteAllText((Join-Path $TestRoot 'launcher_plan.txt'), $Launcher) }
}

function ConvertTo-PsLiteral($Value) {
    if ($Value -is [bool]) { if ($Value) { return '$true' } else { return '$false' } }
    if ($Value -is [array]) { return '@(' + (($Value | ForEach-Object { ConvertTo-PsLiteral $_ }) -join ', ') + ')' }
    return "'" + ([string]$Value).Replace("'", "''") + "'"
}

function Invoke-ResumeQueue($Fx, [hashtable]$Params = @{}) {
    # Calls resume_queue.ps1 through a generated wrapper so arrays reach it intact.
    $p = [ordered]@{
        ProviderStatusPath = $Fx.Status; RegistryPath = $Fx.Reg; LogRoot = $Fx.Logs; NowUtc = $Now
        LauncherPath = (Join-Path $TestRoot 'fake_launcher.ps1'); ProbeScript = (Join-Path $TestRoot 'fake_probe.ps1')
        ProbeTimeoutSeconds = '10'; LaunchVerifySeconds = '20'
    }
    foreach ($k in $Params.Keys) { $p[$k] = $Params[$k] }
    $parts = @()
    foreach ($k in $p.Keys) { if ($null -ne $p[$k]) { $parts += "$k = $(ConvertTo-PsLiteral $p[$k])" } }
    $wrapper = Join-Path $TestRoot ("rq_{0}.ps1" -f (Get-Random -Maximum 999999))
    $code = "`$p = @{ $($parts -join '; ') }`n& '$((Join-Path $OpsDir 'resume_queue.ps1').Replace("'", "''"))' @p`nexit `$LASTEXITCODE`n"
    [IO.File]::WriteAllText($wrapper, $code)
    $r = Invoke-Proc -Exe $PsExe -Argv @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $wrapper)
    Remove-Item -LiteralPath $wrapper -Force -ErrorAction SilentlyContinue
    $r.Status = Read-DeusProviderStatus $Fx.Status
    $r.Calls = @()
    $cd = Join-Path $TestRoot 'launcher_calls'
    if (Test-Path $cd) { $r.Calls = @(Get-ChildItem -LiteralPath $cd -File | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) }
    $pc = Join-Path $TestRoot 'probe_calls.txt'
    $r.Probes = @()
    if (Test-Path $pc) { $r.Probes = @(Get-Content -LiteralPath $pc | Where-Object { $_ }) }
    return $r
}

function Get-Q($Status, [string]$RunId = 'r1') { return @($Status['queue'] | Where-Object { $_['runId'] -eq $RunId })[0] }

# ---------------------------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------------------------

$Tests = @(
    @{ Name = 'not_due_no_probe'; Body = {
        Reset-Queue $Fx
        Set-QueueStatus $Fx @{ claude = @('EXHAUSTED', '2026-09-26T13:00:00Z') } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx
        Check 'exit_0' ($r.Code -eq 0) "$($r.Code) $($r.Err)"
        Check 'not_probed' ($r.Probes.Count -eq 0) ($r.Probes -join ',')
        Check 'reset_unchanged' ($r.Status['providers']['claude']['resetAt'] -eq '2026-09-26T13:00:00Z')
        Check 'no_launch' ($r.Calls.Count -eq 0)
        $q = Get-Q $r.Status
        Check 'still_queued' ($q['state'] -eq 'QUEUED') $q['state']
        Check 'skip_reason' ("$($q['lastSkip'])" -match 'claude: EXHAUSTED') "$($q['lastSkip'])"
    } }
    @{ Name = 'probe_fail_backoff'; Body = {
        Reset-Queue $Fx
        Set-QueueStatus $Fx @{ claude = @('EXHAUSTED', '2026-09-26T11:55:00Z'); grok = @('EXHAUSTED', '2026-09-26T12:00:00Z'); codex = @('EXHAUSTED', $null) } @(New-QueueEntry $Fx)
        Set-Plan 'claude=usage;grok=fail;codex=fail' $null
        $r = Invoke-ResumeQueue $Fx
        Check 'exit_0' ($r.Code -eq 0) "$($r.Code) $($r.Err)"
        Check 'all_three_probed' ((@($r.Probes | Sort-Object) -join ',') -eq 'claude,codex,grok') ($r.Probes -join ',')
        Check 'late_reset_backs_off_from_now' ($r.Status['providers']['claude']['resetAt'] -eq '2026-09-26T12:30:00Z') $r.Status['providers']['claude']['resetAt']
        Check 'on_time_reset_plus_30' ($r.Status['providers']['grok']['resetAt'] -eq '2026-09-26T12:30:00Z') $r.Status['providers']['grok']['resetAt']
        Check 'unknown_reset_now_plus_30' ($r.Status['providers']['codex']['resetAt'] -eq '2026-09-26T12:30:00Z') $r.Status['providers']['codex']['resetAt']
        Check 'still_exhausted' ($r.Status['providers']['claude']['state'] -eq 'EXHAUSTED')
        Check 'probe_result_usage' ("$($r.Status['providers']['claude']['lastProbeResult'])" -match '^USAGE') "$($r.Status['providers']['claude']['lastProbeResult'])"
        Check 'no_launch' ($r.Calls.Count -eq 0)
        Check 'still_queued' ((Get-Q $r.Status)['state'] -eq 'QUEUED')
    } }
    @{ Name = 'probe_ok_relaunch'; Body = {
        Reset-Queue $Fx
        Set-Plan 'claude=ok' 'register'
        Set-QueueStatus $Fx @{ claude = @('EXHAUSTED', '2026-09-26T11:00:00Z') } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx
        Check 'exit_0' ($r.Code -eq 0) "$($r.Code) $($r.Out) $($r.Err)"
        Check 'probed' ($r.Probes -contains 'claude')
        Check 'available' ($r.Status['providers']['claude']['state'] -eq 'AVAILABLE')
        Check 'reset_cleared' ($null -eq $r.Status['providers']['claude']['resetAt'])
        Check 'launched_once' ($r.Calls.Count -eq 1) "$($r.Calls.Count)"
        $c = "$($r.Calls[0])"
        Check 'launch_lane_provider' ($c -match '(?m)^lane=lane-t$' -and $c -match '(?m)^provider=claude$') $c
        Check 'launch_resume_sha' ($c -match "(?m)^resume=$($Fx.Base)$") $c
        Check 'launch_role_writer' ($c -match '(?m)^role=writer$') $c
        Check 'launch_brief' ($c -match [regex]::Escape("brief=$(Join-Path $Fx.Wt 'tasks\T.01\lane-t\BRIEF.md')")) $c
        $q = Get-Q $r.Status
        Check 'entry_resumed' ($q['state'] -eq 'RESUMED' -and $q['resumeVerified'] -eq $true) "$($q['state']) $($q['resumeVerified'])"
    } }
    @{ Name = 'probe_timeout'; Body = {
        Reset-Queue $Fx
        Set-Plan 'claude=hang' $null
        Set-QueueStatus $Fx @{ claude = @('EXHAUSTED', '2026-09-26T11:00:00Z') } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx @{ ProbeTimeoutSeconds = '3' }
        Check 'exit_0' ($r.Code -eq 0) "$($r.Code) $($r.Err)"
        Check 'bounded_time' ($r.Seconds -lt 30) ("{0:N1} s" -f $r.Seconds)
        Check 'timeout_recorded' ("$($r.Status['providers']['claude']['lastProbeResult'])" -match '^TIMEOUT') "$($r.Status['providers']['claude']['lastProbeResult'])"
        Check 'backed_off' ($r.Status['providers']['claude']['resetAt'] -eq '2026-09-26T12:30:00Z')
        Check 'no_launch' ($r.Calls.Count -eq 0)
    } }
    @{ Name = 'live_pid_blocks'; Body = {
        Reset-Queue $Fx
        $seed = New-Object System.Collections.ArrayList
        [void]$seed.Add([ordered]@{ runId = 'live'; lane = 'lane-t'; state = 'RUNNING'; pid = $PID; processStartedAt = (Format-DeusIso (Get-Process -Id $PID).StartTime) })
        Write-DeusJsonFile $Fx.Reg $seed
        Set-QueueStatus $Fx @{ claude = @('AVAILABLE', $null) } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx
        Check 'no_launch' ($r.Calls.Count -eq 0)
        $q = Get-Q $r.Status
        Check 'still_queued' ($q['state'] -eq 'QUEUED')
        Check 'skip_lane_active' ("$($q['lastSkip'])" -match '^LANE-ACTIVE') "$($q['lastSkip'])"
    } }
    @{ Name = 'launcher_pid_blocks'; Body = {
        # A RUNNING entry whose worker is gone but whose launcher is alive still owns the lane.
        Reset-Queue $Fx
        $seed = New-Object System.Collections.ArrayList
        [void]$seed.Add([ordered]@{ runId = 'live'; lane = 'lane-t'; state = 'RUNNING'; pid = 1; processStartedAt = '2000-01-01T00:00:00Z'; launcherPid = $PID; launcherStartedAt = (Format-DeusIso (Get-Process -Id $PID).StartTime) })
        Write-DeusJsonFile $Fx.Reg $seed
        Set-QueueStatus $Fx @{ claude = @('AVAILABLE', $null) } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx
        Check 'no_launch' ($r.Calls.Count -eq 0)
        Check 'skip_lane_active' ("$((Get-Q $r.Status)['lastSkip'])" -match '^LANE-ACTIVE')
    } }
    @{ Name = 'dead_pid_does_not_block'; Body = {
        Reset-Queue $Fx
        Set-Plan $null 'register'
        $dead = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'exit 0' -WindowStyle Hidden -PassThru
        $dead.WaitForExit()
        $seed = New-Object System.Collections.ArrayList
        [void]$seed.Add([ordered]@{ runId = 'dead'; lane = 'lane-t'; state = 'RUNNING'; pid = $dead.Id; processStartedAt = (Format-DeusIso $dead.StartTime) })
        Write-DeusJsonFile $Fx.Reg $seed
        Set-QueueStatus $Fx @{ claude = @('AVAILABLE', $null) } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx
        Check 'launched' ($r.Calls.Count -eq 1) "$($r.Calls.Count) $($r.Out)"
    } }
    @{ Name = 'lane_lock_blocks'; Body = {
        Reset-Queue $Fx
        Set-QueueStatus $Fx @{ claude = @('AVAILABLE', $null) } @(New-QueueEntry $Fx)
        $lockDir = Join-Path $Fx.Logs 'lane-t'
        New-Item -ItemType Directory -Force -Path $lockDir | Out-Null
        $fs = [IO.File]::Open((Join-Path $lockDir 'lane.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
        try { $r = Invoke-ResumeQueue $Fx } finally { $fs.Dispose() }
        Check 'no_launch' ($r.Calls.Count -eq 0)
        Check 'skip_locked' ("$((Get-Q $r.Status)['lastSkip'])" -eq 'LANE-LOCKED') "$((Get-Q $r.Status)['lastSkip'])"
    } }
    @{ Name = 'one_session_per_lane'; Body = {
        Reset-Queue $Fx
        Set-Plan $null 'register'
        Set-QueueStatus $Fx @{ claude = @('AVAILABLE', $null) } @((New-QueueEntry $Fx), (New-QueueEntry $Fx @{ runId = 'r2' }))
        $r = Invoke-ResumeQueue $Fx
        Check 'launched_once' ($r.Calls.Count -eq 1) "$($r.Calls.Count)"
        $states = @($r.Status['queue'] | ForEach-Object { $_['state'] } | Sort-Object)
        Check 'one_resumed_one_queued' (($states -join ',') -eq 'QUEUED,RESUMED') ($states -join ',')
    } }
    @{ Name = 'failover_refuses_same_family'; Body = {
        Reset-Queue $Fx
        Set-QueueStatus $Fx @{ claude = @('EXHAUSTED', '2026-09-26T15:00:00Z'); grok = @('AVAILABLE', $null); codex = @('EXHAUSTED', '2026-09-26T15:00:00Z') } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx @{ AllowFailover = $true }
        Check 'no_launch' ($r.Calls.Count -eq 0) ($r.Calls -join ' | ')
        $q = Get-Q $r.Status
        Check 'still_queued' ($q['state'] -eq 'QUEUED')
        Check 'reason_family' ("$($q['lastSkip'])" -match 'grok: same AI family \(xai\)') "$($q['lastSkip'])"
    } }
    @{ Name = 'failover_to_distinct_family'; Body = {
        Reset-Queue $Fx
        Set-Plan $null 'register'
        Set-QueueStatus $Fx @{ claude = @('EXHAUSTED', '2026-09-26T15:00:00Z'); grok = @('AVAILABLE', $null); codex = @('AVAILABLE', $null) } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx @{ AllowFailover = $true }
        Check 'launched_once' ($r.Calls.Count -eq 1) "$($r.Calls.Count) $($r.Out)"
        $c = "$($r.Calls[0])"
        Check 'codex_writer' ($c -match '(?m)^provider=codex$' -and $c -match '(?m)^role=writer$') $c
        $q = Get-Q $r.Status
        Check 'failover_recorded' ($q['failoverFrom'] -eq 'claude' -and $q['failoverTo'] -eq 'codex') "$($q['failoverFrom']) -> $($q['failoverTo'])"
    } }
    @{ Name = 'reviewer_role_preserved'; Body = {
        # A reviewer session keeps the reviewer role and never moves to the writer's family.
        Reset-Queue $Fx
        Set-Plan $null 'register'
        $e = New-QueueEntry $Fx @{ provider = 'grok'; role = 'reviewer' }
        Set-QueueStatus $Fx @{ grok = @('EXHAUSTED', '2026-09-26T15:00:00Z'); claude = @('AVAILABLE', $null); codex = @('AVAILABLE', $null) } @($e)
        $r = Invoke-ResumeQueue $Fx @{ AllowFailover = $true; FailoverOrder = @('claude', 'codex', 'grok') }
        Check 'launched_once' ($r.Calls.Count -eq 1) "$($r.Calls.Count) $($r.Out)"
        $c = "$($r.Calls[0])"
        Check 'not_claude' ($c -notmatch '(?m)^provider=claude$') $c
        Check 'codex_reviewer' ($c -match '(?m)^provider=codex$' -and $c -match '(?m)^role=reviewer$') $c
    } }
    @{ Name = 'no_failover_without_flag'; Body = {
        Reset-Queue $Fx
        Set-QueueStatus $Fx @{ claude = @('EXHAUSTED', '2026-09-26T15:00:00Z'); codex = @('AVAILABLE', $null) } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx
        Check 'no_launch' ($r.Calls.Count -eq 0) ($r.Calls -join ' | ')
        Check 'still_queued' ((Get-Q $r.Status)['state'] -eq 'QUEUED')
    } }
    @{ Name = 'codex_probed'; Body = {
        Reset-Queue $Fx
        Set-Plan 'codex=ok' $null
        Set-QueueStatus $Fx @{ codex = @('EXHAUSTED', '2026-09-26T09:00:00Z') } @()
        $r = Invoke-ResumeQueue $Fx
        Check 'codex_probed' ($r.Probes -contains 'codex') ($r.Probes -join ',')
        Check 'codex_available' ($r.Status['providers']['codex']['state'] -eq 'AVAILABLE')
    } }
    @{ Name = 'launch_failure_requeues'; Body = {
        Reset-Queue $Fx
        Set-Plan $null 'exit1'
        Set-QueueStatus $Fx @{ claude = @('AVAILABLE', $null) } @(New-QueueEntry $Fx)
        $r = Invoke-ResumeQueue $Fx
        Check 'exit_1' ($r.Code -eq 1) "$($r.Code)"
        Check 'launcher_called' ($r.Calls.Count -eq 1)
        $q = Get-Q $r.Status
        Check 'back_to_queued' ($q['state'] -eq 'QUEUED') $q['state']
        Check 'error_recorded' ("$($q['lastResumeError'])" -match 'exited with code 1') "$($q['lastResumeError'])"
    } }
    @{ Name = 'dry_run_writes_nothing'; Body = {
        Reset-Queue $Fx
        Set-Plan 'claude=ok' 'register'
        Set-QueueStatus $Fx @{ claude = @('EXHAUSTED', '2026-09-26T11:00:00Z') } @(New-QueueEntry $Fx)
        $before = [IO.File]::ReadAllText($Fx.Status)
        $r = Invoke-ResumeQueue $Fx @{ DryRun = $true }
        Check 'exit_0' ($r.Code -eq 0) "$($r.Code) $($r.Err)"
        Check 'status_unchanged' ([IO.File]::ReadAllText($Fx.Status) -eq $before)
        Check 'no_probe' ($r.Probes.Count -eq 0)
        Check 'no_launch' ($r.Calls.Count -eq 0)
        Check 'says_would_probe' ($r.Out -match 'would probe claude') $r.Out
    } }
    @{ Name = 'end_to_end_real_launcher'; Body = {
        # resume_queue -> real launch_worker.ps1 -> fake worker; the new run carries the resume prompt.
        Reset-Queue $Fx
        $head = G $Fx.Wt rev-parse HEAD
        Set-QueueStatus $Fx @{ claude = @('AVAILABLE', $null) } @(New-QueueEntry $Fx @{ lastCommit = $head })
        $extra = @('-ProviderExe', $PsExe, '-ProviderArgs', "-NoProfile -ExecutionPolicy Bypass -File $($Fx.FakeWorker) -Mode commit -Out $($Fx.Out)",
                   '-ProviderStdinPrompt', '-PollSeconds', '0.5', '-OrphanGraceSeconds', '1')
        $r = Invoke-ResumeQueue $Fx @{ LauncherPath = (Join-Path $OpsDir 'launch_worker.ps1'); LauncherExtraArgs = $extra; NowUtc = $null; LaunchVerifySeconds = '60' }
        Check 'exit_0' ($r.Code -eq 0) "$($r.Code) $($r.Out) $($r.Err)"
        $q = Get-Q $r.Status
        Check 'resumed_verified' ($q['state'] -eq 'RESUMED' -and $q['resumeVerified'] -eq $true) "$($q['state']) $($q['resumeVerified'])"
        $lp = [int]$q['resumeLauncherPid']
        if ($lp) { $lpProc = Get-Process -Id $lp -ErrorAction SilentlyContinue; if ($lpProc) { [void]$lpProc.WaitForExit(90000) } }
        $e = @(Read-DeusJsonFile $Fx.Reg $null | Where-Object { $_['runId'] -eq $q['resumeRunId'] })[0]
        Check 'run_completed' ($e -and $e['state'] -eq 'COMPLETED') "state $($e['state']) flags $($e['flags'] -join ',')"
        $first = ("$(Get-TextFile $e['launchPromptPath'])" -split "`n")[0]
        Check 'resume_prompt' ($first -ceq "resume from HEAD $head; re-read BRIEF and the uncommitted diff first") $first
        Check 'same_provider' ($e['provider'] -eq 'claude')
    } }
)

$MutantDefs = @(
    @{ Name = 'no_backoff'; File = 'resume_queue.ps1'; Tests = 'probe_fail_backoff'
       Find = "`$e['resetAt'] = Format-DeusIso (`$base.AddMinutes(`$BackoffMinutes))"; Replace = "`$e['resetAt'] = `$e['resetAt']" }
    @{ Name = 'probe_before_reset'; File = 'resume_queue.ps1'; Tests = 'not_due_no_probe'
       Find = '$eligible = (-not $resetAt) -or ($resetAt -le $now)'; Replace = '$eligible = $true' }
    @{ Name = 'probe_ok_ignored'; File = 'resume_queue.ps1'; Tests = 'probe_ok_relaunch'
       Find = 'if ($res.Ok) {'; Replace = 'if ($false) {' }
    @{ Name = 'probe_timeout_ignored'; File = 'resume_queue.ps1'; Tests = 'probe_timeout'
       Find = '-TimeoutSeconds $ProbeTimeoutSeconds'; Replace = '-TimeoutSeconds 45' }
    @{ Name = 'ignore_live_pid'; File = 'resume_queue.ps1'; Tests = 'live_pid_blocks'
       Find = 'if ($live.Count -gt 0) {'; Replace = 'if ($false) {' }
    @{ Name = 'launcher_pid_not_checked'; File = 'launch_worker.ps1'; Tests = 'launcher_pid_blocks'
       Find = "if ((Test-DeusPidAlive `$e['pid'] `$e['processStartedAt']) -or (Test-DeusPidAlive `$e['launcherPid'] `$e['launcherStartedAt'])) {`n            [void]`$active.Add(`$e)"
       Replace = "if (Test-DeusPidAlive `$e['pid'] `$e['processStartedAt']) {`n            [void]`$active.Add(`$e)" }
    @{ Name = 'lane_lock_ignored'; File = 'resume_queue.ps1'; Tests = 'lane_lock_blocks'
       Find = 'if (Test-DeusLaneLocked -LogRoot $logs -Lane $lane) {'; Replace = 'if ($false) {' }
    @{ Name = 'two_sessions_one_lane'; File = 'resume_queue.ps1'; Tests = 'one_session_per_lane'
       Find = '$startedLanes[$key] = $true'; Replace = '$null = $key' }
    @{ Name = 'failover_same_family'; File = 'resume_queue.ps1'; Tests = 'failover_refuses_same_family,reviewer_role_preserved'
       Find = 'if ($counterpart -and (Get-DeusProviderFamily $q) -eq (Get-DeusProviderFamily $counterpart)) {'; Replace = 'if ($false) {' }
    @{ Name = 'failover_always'; File = 'resume_queue.ps1'; Tests = 'no_failover_without_flag'
       Find = 'if ($Failover) { $candidates +='; Replace = 'if ($true) { $candidates +=' }
    @{ Name = 'reviewer_becomes_writer'; File = 'resume_queue.ps1'; Tests = 'reviewer_role_preserved'
       Find = """`$(if (`$q['role']) { `$q['role'] } else { 'writer' })"""; Replace = """writer""" }
    @{ Name = 'codex_not_probed'; File = 'resume_queue.ps1'; Tests = 'codex_probed'
       Find = 'foreach ($p in (Get-DeusKnownProviders)) {'; Replace = "foreach (`$p in @('claude', 'grok')) {" }
    @{ Name = 'no_launch_verify'; File = 'resume_queue.ps1'; Tests = 'launch_failure_requeues'
       Find = '$ok = [bool]$registered -or ($proc -and -not $err -and -not $proc.HasExited)'; Replace = '$ok = $true' }
    @{ Name = 'dry_run_writes'; File = 'resume_queue.ps1'; Tests = 'dry_run_writes_nothing'
       Find = 'if (-not $DryRun) { Write-DeusJsonFile $statusPath $s }'; Replace = 'Write-DeusJsonFile $statusPath $s' }
)

# ---------------------------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------------------------

if ($List) { $Tests | ForEach-Object { $_.Name }; exit 0 }
if ($Mutants) { exit (Invoke-MutantSweep 'test_resume_queue.ps1' $MutantDefs) }

$TestRoot = Initialize-TestHarness 'deus_rq_test'
Write-Host "test_resume_queue: ops $OpsDir; temp $TestRoot"
$Fx = New-TestRepo $TestRoot
Write-FakeWorker $Fx.FakeWorker
Write-FakeHelpers $TestRoot
$leftover = 0
try {
    Invoke-TestList $Tests $Only
} finally {
    $leftover = Complete-TestHarness -Keep:$KeepTemp
}
exit (Write-TestSummary $leftover)
