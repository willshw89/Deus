<#
.SYNOPSIS
    Tests for tools/ops/launch_worker.ps1, the pre-push guard, install_lane_hooks.ps1 and gate_tests.json.

.DESCRIPTION
    Builds a throwaway git repository with a lane worktree under %TEMP%, runs the real launcher out of process
    against a fake worker (a small PowerShell script with one behaviour per mode) and checks what the launcher
    recorded. Git config is isolated with GIT_CONFIG_GLOBAL / GIT_CONFIG_NOSYSTEM, so the real global config
    and the real repository are never touched. Every process the tests start is killed before exit.

      -Only <name>[,<name>]  run only these tests
      -List                  list the test names
      -Mutants               mutation sweep: each mutant copy of tools/ops must make at least one test FAIL
      -OpsDir / -RepoRoot    test another copy of tools/ops (used by -Mutants)
      -KeepTemp              keep the temp folder for inspection

    Exit: 0 all checks passed (or all mutants caught); 1 a check failed (or a mutant survived).
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

# Shared library (functions only) from the launcher under test.
$libAst = [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $OpsDir 'launch_worker.ps1'), [ref]$null, [ref]$null)
foreach ($fn in $libAst.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)) {
    . ([scriptblock]::Create($fn.Extent.Text))
}

# ---------------------------------------------------------------------------------------------
# Harness (test_resume_queue.ps1 loads these functions too)
# ---------------------------------------------------------------------------------------------

function Initialize-TestHarness([string]$Prefix) {
    $script:Checks = 0
    $script:Failures = New-Object System.Collections.Generic.List[string]
    $script:CurrentTest = ''
    $root = Join-Path ([IO.Path]::GetTempPath()) ("{0}_{1}_{2}" -f $Prefix, $PID, (Get-Random -Maximum 99999))
    if ($root -match '\s') { throw "temp path has spaces ($root); the fake-worker command lines assume it does not" }
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $script:TestRoot = $root
    $script:SavedEnv = @{}
    # A session started by launch_worker.ps1 already carries GIT_AUTHOR_NAME=deus-<provider>; left in place, the
    # identity checks would pass even if the launcher stopped setting it.
    $cleared = @('DEUS_INTEGRATOR', 'DEUS_RUN_ID', 'GIT_AUTHOR_NAME', 'GIT_COMMITTER_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_EMAIL')
    foreach ($k in @('GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM') + $cleared) { $script:SavedEnv[$k] = [Environment]::GetEnvironmentVariable($k) }
    $gc = Join-Path $root 'gitconfig_global'
    [IO.File]::WriteAllText($gc, "[user]`n`tname = deus-test`n`temail = deus-test@example.invalid`n[init]`n`tdefaultBranch = main`n[core]`n`tautocrlf = false`n")
    $env:GIT_CONFIG_GLOBAL = $gc
    $env:GIT_CONFIG_NOSYSTEM = '1'
    foreach ($k in $cleared) { [Environment]::SetEnvironmentVariable($k, $null) }
    return $root
}

function Complete-TestHarness([switch]$Keep) {
    # Kill every process whose command line names the temp root (fake workers, their children, launchers).
    $leftover = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($script:TestRoot, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $_.ProcessId -ne $PID })
    foreach ($p in $leftover) { & taskkill.exe /PID $p.ProcessId /T /F 2>&1 | Out-Null }
    foreach ($k in $script:SavedEnv.Keys) { [Environment]::SetEnvironmentVariable($k, $script:SavedEnv[$k]) }
    if (-not $Keep) {
        Start-Sleep -Milliseconds 300
        Remove-Item -LiteralPath $script:TestRoot -Recurse -Force -ErrorAction SilentlyContinue
    } else { Write-Host "temp kept: $($script:TestRoot)" }
    return $leftover.Count
}

function Check([string]$Name, $Condition, [string]$Detail = '') {
    $script:Checks++
    if ($Condition) { Write-Host "  PASS $Name" }
    else {
        Write-Host "  FAIL $Name$(if ($Detail) { " -- $Detail" })"
        $script:Failures.Add("$($script:CurrentTest)/$Name")
    }
}

function Invoke-TestList($Tests, [string[]]$OnlyNames) {
    $names = @($OnlyNames | ForEach-Object { "$_".Split(',') } | Where-Object { $_ } | ForEach-Object { $_.Trim() })
    foreach ($n in $names) { if (-not ($Tests | Where-Object { $_.Name -eq $n })) { Check "known_test_$n" $false "no test named $n" } }
    foreach ($t in $Tests) {
        if ($names -and $names -notcontains $t.Name) { continue }
        $script:CurrentTest = $t.Name
        Write-Host "TEST $($t.Name)"
        $sw = [Diagnostics.Stopwatch]::StartNew()
        try { & $t.Body } catch { Check 'no_exception' $false "$($_.Exception.Message) at line $($_.InvocationInfo.ScriptLineNumber)" }
        Write-Host ("  ({0:N1} s)" -f $sw.Elapsed.TotalSeconds)
    }
}

function Write-TestSummary([int]$Leftover) {
    $script:CurrentTest = 'cleanup'
    Check 'no_leftover_processes' ($Leftover -eq 0) "$Leftover test processes were still running at the end and were killed"
    if ($script:Failures.Count -eq 0) {
        Write-Host "RESULT: PASS ($($script:Checks) checks, 0 failed)"
        return 0
    }
    Write-Host "RESULT: FAIL ($($script:Failures.Count) of $($script:Checks) checks failed: $($script:Failures -join ', '))"
    return 1
}

function Invoke-Proc {
    # Runs a program with a properly quoted command line; returns exit code, stdout, stderr and seconds.
    param([string]$Exe, [string[]]$Argv, [hashtable]$Env = @{}, [string[]]$RemoveEnv = @(), [string]$Cwd = $script:TestRoot, [int]$TimeoutSeconds = 300)
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    $psi.Arguments = (($Argv | ForEach-Object { ConvertTo-DeusArg ([string]$_) }) -join ' ')
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.WorkingDirectory = $Cwd
    foreach ($k in $RemoveEnv) { $psi.EnvironmentVariables.Remove($k) }
    foreach ($k in $Env.Keys) { $psi.EnvironmentVariables[$k] = [string]$Env[$k] }
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $p = [Diagnostics.Process]::Start($psi)
    $so = $p.StandardOutput.ReadToEndAsync()
    $se = $p.StandardError.ReadToEndAsync()
    if (-not $p.WaitForExit($TimeoutSeconds * 1000)) { & taskkill.exe /PID $p.Id /T /F 2>&1 | Out-Null; [void]$p.WaitForExit(10000) }
    [void]$so.Wait(10000); [void]$se.Wait(10000)
    return @{ Code = $p.ExitCode; Out = $so.Result; Err = $se.Result; Seconds = $sw.Elapsed.TotalSeconds }
}

function G([string]$Dir) {
    # git in a folder; returns trimmed stdout. $args are the git arguments.
    $out = & git -C $Dir @args 2>$null
    return ((@($out) -join "`n").Trim())
}

function New-TestRepo([string]$Root, [string]$Lane = 'lane-t') {
    # main repo + one lane worktree on task/<lane>, with a brief, an empty brief and lane.json.
    $main = Join-Path $Root 'main'
    & git init -q $main 2>$null | Out-Null
    $laneDir = Join-Path $main "tasks\T.01\$Lane"
    New-Item -ItemType Directory -Force -Path $laneDir, (Join-Path $main 'src\allowed') | Out-Null
    [IO.File]::WriteAllText((Join-Path $main 'README.md'), "test repo`n")
    [IO.File]::WriteAllText((Join-Path $main 'src\allowed\keep.txt'), "keep`n")
    [IO.File]::WriteAllText((Join-Path $laneDir 'BRIEF.md'), "# TEST_ brief`nDo the test task.`n")
    [IO.File]::WriteAllText((Join-Path $laneDir 'EMPTY.md'), '')
    $laneJson = [ordered]@{
        lane = $Lane; taskId = 'T.01'; branch = "task/$Lane"; writer = 'claude'; reviewer = 'grok'
        allowedPaths = @('src/allowed/**', "tasks/T.01/$Lane/**")
    }
    [IO.File]::WriteAllText((Join-Path $laneDir 'lane.json'), (ConvertTo-DeusJson $laneJson))
    & git -C $main add -A 2>$null | Out-Null
    & git -C $main commit -q -m 'fixture' 2>$null | Out-Null
    $wt = Join-Path $Root "wt\$Lane"
    & git -C $main worktree add -q -b "task/$Lane" $wt 2>$null | Out-Null
    $out = Join-Path $Root 'out'
    New-Item -ItemType Directory -Force -Path $out, (Join-Path $Root 'telemetry'), (Join-Path $Root 'logs') | Out-Null
    return @{
        Main = $main; Wt = $wt; Lane = $Lane; Out = $out; Base = (G $wt rev-parse HEAD)
        Reg = (Join-Path $Root 'telemetry\active_workers.json'); Status = (Join-Path $Root 'telemetry\provider_status.json')
        Logs = (Join-Path $Root 'logs'); FakeWorker = (Join-Path $Root 'fake_worker.ps1')
    }
}

function Write-FakeWorker([string]$Path) {
    $code = @'
param([string]$Mode, [string]$Out)
# Fake provider CLI for the launcher tests. One behaviour per -Mode.
$ErrorActionPreference = 'Continue'
$runId = $env:DEUS_RUN_ID
$utf8 = New-Object Text.UTF8Encoding $false
$stdin = [Console]::In.ReadToEnd()
[IO.File]::WriteAllText((Join-Path $Out "stdin_$runId.txt"), $stdin, $utf8)
[IO.File]::WriteAllText((Join-Path $Out "env_$runId.txt"), "author=$env:GIT_AUTHOR_NAME`ncommitter=$env:GIT_COMMITTER_NAME`nintegrator=[$env:DEUS_INTEGRATOR]`n", $utf8)
function Start-Sleeper([int]$Seconds) {
    $p = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList @('-NoProfile', '-Command', "Start-Sleep -Seconds $Seconds; # $Out") -WindowStyle Hidden -PassThru
    [IO.File]::WriteAllText((Join-Path $Out "child_$runId.txt"), "$($p.Id)")
}
function Write-File([string]$Rel, [string]$Text) {
    $full = Join-Path (Get-Location) $Rel
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $full) | Out-Null
    [IO.File]::WriteAllText($full, $Text)
}
function Save-Commit([string]$Rel, [string]$Text) {
    Write-File $Rel $Text
    git add -- $Rel 2>&1 | Out-Null
    git commit -q -m "[claude] T.01 fake $Rel" 2>&1 | Out-Null
}
switch ($Mode) {
    'commit' { Save-Commit 'src/allowed/a.txt' "a`n"; 'worker: committed'; [Console]::Error.WriteLine('worker-stderr: hello'); exit 0 }
    'hang' { Start-Sleeper 120; 'worker: hanging'; Start-Sleep -Seconds 120; exit 0 }
    'orphan' { Save-Commit 'src/allowed/b.txt' "b`n"; Start-Sleeper 60; 'worker: leaving a child behind'; exit 0 }
    'dirty' { Write-File 'src/allowed/c.txt' "c`n"; 'worker: left changes without committing'; exit 0 }
    'scope' { Save-Commit 'src/allowed/y.txt' "y`n"; Save-Commit 'src/forbidden/x.txt' "x`n"; Write-File 'stray.txt' "s`n"; Write-File 'src/allowed/ok.txt' "ok`n"; 'worker: wrote files'; exit 0 }
    'usage-claude' {
        '{"type":"system","subtype":"init","session_id":"s1"}'
        '{"type":"result","subtype":"success","is_error":true,"result":"Claude AI usage limit reached|1790500000"}'
        exit 1
    }
    'usage-clock' {
        '{"type":"system","subtype":"init","session_id":"s1"}'
        '{"type":"assistant","message":{"content":[{"type":"text","text":"You''ve hit your limit \u00b7 resets 5pm (America/Chicago)"}]},"error":"rate_limit"}'
        '{"type":"result","subtype":"success","is_error":true,"result":"You''ve hit your limit \u00b7 resets 5pm (America/Chicago)"}'
        exit 1
    }
    'usage-codex' { 'working'; [Console]::Error.WriteLine("ERROR: You've hit your usage limit. Upgrade to Pro or try again in 2 hours 5 minutes."); exit 1 }
    'usage-grok' { 'thinking'; [Console]::Error.WriteLine('Error: 429 Too Many Requests: rate limit exceeded'); exit 1 }
    'mention' {
        Save-Commit 'src/allowed/m.txt' "m`n"
        '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"content":"if ($t -match \"Claude AI usage limit reached|1790500000\") { You''ve hit your limit }"}}]}}'
        '{"type":"user","message":{"content":[{"type":"tool_result","is_error":true,"content":"Error: 429 Too Many Requests (from a test fixture)"}]}}'
        'notes: usage limit reached is handled by the launcher'
        '{"type":"result","subtype":"success","is_error":false,"result":"Done. Tests cover Claude AI usage limit reached|1790500000 and 429 Too Many Requests."}'
        exit 0
    }
    'silent' { exit 0 }
    default { [Console]::Error.WriteLine("fake_worker: unknown mode $Mode"); exit 9 }
}
'@
    [IO.File]::WriteAllText($Path, $code, (New-Object Text.UTF8Encoding $false))
}

function Reset-Lane($Fx) {
    & git -C $Fx.Wt checkout -q -f "task/$($Fx.Lane)" 2>$null | Out-Null
    & git -C $Fx.Wt reset -q --hard $Fx.Base 2>$null | Out-Null
    & git -C $Fx.Wt clean -q -fdx 2>$null | Out-Null
    Remove-Item -LiteralPath $Fx.Reg, $Fx.Status -Force -ErrorAction SilentlyContinue
}

function Invoke-Launch {
    # Runs launch_worker.ps1 out of process against the fake worker.
    param($Fx, [string]$Mode = 'commit', [hashtable]$Params = @{}, [string[]]$Switches = @(), [hashtable]$Env = @{})
    $p = [ordered]@{
        Lane = $Fx.Lane; Provider = 'claude'; BriefPath = "tasks/T.01/$($Fx.Lane)/BRIEF.md"; TimeoutMinutes = '2'
        Worktree = $Fx.Wt; RegistryPath = $Fx.Reg; ProviderStatusPath = $Fx.Status; LogRoot = $Fx.Logs
        PollSeconds = '0.5'; OrphanGraceSeconds = '1'; ProviderExe = $PsExe
        ProviderArgs = "-NoProfile -ExecutionPolicy Bypass -File $($Fx.FakeWorker) -Mode $Mode -Out $($Fx.Out)"
    }
    foreach ($k in $Params.Keys) { $p[$k] = $Params[$k] }
    $argv = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $OpsDir 'launch_worker.ps1'))
    foreach ($k in $p.Keys) { if ($null -ne $p[$k]) { $argv += "-$k"; $argv += [string]$p[$k] } }
    $argv += '-Quiet'
    $argv += '-ProviderStdinPrompt'
    foreach ($s in $Switches) { $argv += "-$s" }
    $r = Invoke-Proc -Exe $PsExe -Argv $argv -Env $Env
    $r.Entry = $null
    $reg = Read-DeusJsonFile $Fx.Reg (New-Object System.Collections.ArrayList)
    foreach ($e in $reg) { if ($e -is [System.Collections.IDictionary] -and $e['launcherPid'] -and $e['lane'] -eq $Fx.Lane) { $r.Entry = $e } }
    return $r
}

function Get-TextFile([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return $null }
    return [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8)
}

function Test-ProcessAlive([int]$ProcessId) { return [bool](Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) }

# ---------------------------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------------------------

$Tests = @(
    @{ Name = 'refuse_missing_brief'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Params @{ BriefPath = 'tasks/T.01/lane-t/NOPE.md' }
        Check 'exit_1' ($r.Code -eq 1) "exit $($r.Code)"
        Check 'says_not_found' ($r.Err -match 'brief not found') $r.Err
        Check 'no_registry_entry' (-not (Test-Path $Fx.Reg))
        Check 'no_prompt_file' (-not (Test-Path (Join-Path $Fx.Wt 'tasks\T.01\lane-t\launches')))
    } }
    @{ Name = 'refuse_empty_brief'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Params @{ BriefPath = 'tasks/T.01/lane-t/EMPTY.md' }
        Check 'exit_1' ($r.Code -eq 1) "exit $($r.Code)"
        Check 'says_empty' ($r.Err -match 'brief is empty') $r.Err
        Check 'no_registry_entry' (-not (Test-Path $Fx.Reg))
        Check 'no_prompt_file' (-not (Test-Path (Join-Path $Fx.Wt 'tasks\T.01\lane-t\launches')))
    } }
    @{ Name = 'commit_run'; Body = {
        # Prompt tracking, tee of both streams, registry fields, git identity, DEUS_INTEGRATOR stripped.
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'commit' -Env @{ DEUS_INTEGRATOR = '1' }
        $e = $r.Entry
        Check 'exit_0' ($r.Code -eq 0) "exit $($r.Code) $($r.Err)"
        Check 'state_completed' ($e -and $e['state'] -eq 'COMPLETED') "state $($e['state']) flags $($e['flags'] -join ',')"
        $runId = $e['runId']
        Check 'run_id_format' ($runId -match '^lane-t_\d{8}_\d{6}(_\d+)?$') $runId
        $stamp = $runId.Substring('lane-t_'.Length)
        $promptRel = "tasks/T.01/lane-t/launches/${stamp}_prompt.txt"
        $promptPath = Join-Path $Fx.Wt $promptRel
        Check 'prompt_saved' (Test-Path $promptPath) $promptPath
        Check 'prompt_tracked' ((G $Fx.Wt ls-files -- $promptRel) -eq $promptRel)
        Check 'prompt_committed_before_worker' ((G $Fx.Wt log --format=%s -1 $e['baseCommit']) -match 'launch prompt') (G $Fx.Wt log --oneline -3)
        $prompt = Get-TextFile $promptPath
        $stdin = Get-TextFile (Join-Path $Fx.Out "stdin_$runId.txt")
        Check 'worker_got_exact_prompt' ($null -ne $stdin -and $stdin -ceq $prompt) "stdin length $("$stdin".Length) prompt length $("$prompt".Length)"
        Check 'prompt_names_brief' ($prompt -match [regex]::Escape('tasks/T.01/lane-t/BRIEF.md'))
        Check 'prompt_lists_allowed' ($prompt -match [regex]::Escape('- src/allowed/**'))
        Check 'prompt_no_art_rule' ($prompt -match 'NO ART \(DEC-007\)')
        $log = Get-TextFile $e['logPath']
        Check 'log_path' ($e['logPath'] -eq (Join-Path $Fx.Logs "lane-t\$runId.log")) $e['logPath']
        Check 'log_has_stdout' ($log -match 'worker: committed') $log
        Check 'log_has_stderr' ($log -match 'worker-stderr: hello') $log
        Check 'exit_file' ((Get-TextFile (Join-Path $Fx.Logs "lane-t\$runId.exit")) -match 'EXIT=0')
        Check 'registry_pid' ($e['pid'] -is [int] -or $e['pid'] -is [long]) "pid '$($e['pid'])'"
        Check 'registry_process_start' ([bool](ConvertFrom-DeusIso $e['processStartedAt']))
        Check 'registry_start_end' ((ConvertFrom-DeusIso $e['startedAt']) -and (ConvertFrom-DeusIso $e['endedAt']) -and (ConvertFrom-DeusIso $e['endedAt']) -ge (ConvertFrom-DeusIso $e['startedAt']))
        Check 'registry_exit_code' ($e['exitCode'] -eq 0) "exitCode '$($e['exitCode'])'"
        Check 'registry_new_commit' ($e['newCommits'] -eq 1) "newCommits $($e['newCommits'])"
        Check 'registry_launch_time_ct' ("$($e['launchTimeCT'])" -match ' CT$')
        Check 'worker_process_gone' (-not (Test-DeusPidAlive $e['pid'] $e['processStartedAt']))
        $envText = Get-TextFile (Join-Path $Fx.Out "env_$runId.txt")
        Check 'env_author' ($envText -match 'author=deus-claude') $envText
        Check 'env_committer' ($envText -match 'committer=deus-claude') $envText
        Check 'env_integrator_stripped' ($envText -match 'integrator=\[\]') $envText
        Check 'commit_author_identity' ((G $Fx.Wt log -1 '--format=%an|%cn') -eq 'deus-claude|deus-claude') (G $Fx.Wt log -1 '--format=%an|%cn')
        Check 'no_flags' (@($e['flags']).Count -eq 0) ($e['flags'] -join ',')
    } }
    @{ Name = 'resume_prompt'; Body = {
        Reset-Lane $Fx
        $sha = G $Fx.Wt rev-parse HEAD
        $r = Invoke-Launch $Fx -Mode 'commit' -Params @{ ResumeFromSha = $sha }
        $e = $r.Entry
        Check 'exit_0' ($r.Code -eq 0) "exit $($r.Code) $($r.Err)"
        $prompt = Get-TextFile $e['launchPromptPath']
        $first = ("$prompt" -split "`n")[0]
        Check 'first_line_exact' ($first -ceq "resume from HEAD $sha; re-read BRIEF and the uncommitted diff first") $first
        Check 'still_names_brief' ($prompt -match [regex]::Escape('tasks/T.01/lane-t/BRIEF.md'))
        Check 'registry_resume_sha' ($e['resumeFromSha'] -eq $sha)
        Check 'no_head_mismatch' ($e['resumeHeadMismatch'] -eq $false)
    } }
    @{ Name = 'timeout_kill'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'hang' -Params @{ TimeoutMinutes = '0.1' }
        $e = $r.Entry
        Check 'exit_2' ($r.Code -eq 2) "exit $($r.Code) $($r.Err)"
        Check 'state_timeout' ($e -and $e['state'] -eq 'TIMEOUT') "state $($e['state'])"
        Check 'timed_out_flag' ($e['timedOut'] -eq $true)
        Check 'bounded_time' ($r.Seconds -lt 60) ("{0:N1} s" -f $r.Seconds)
        Check 'worker_killed' (-not (Test-ProcessAlive ([int]$e['pid']))) "pid $($e['pid'])"
        $childFile = Join-Path $Fx.Out "child_$($e['runId']).txt"
        $child = 0
        if (Test-Path $childFile) { $child = [int](Get-TextFile $childFile).Trim() }
        Check 'child_started' ($child -gt 0)
        Check 'child_killed' ($child -gt 0 -and -not (Test-ProcessAlive $child)) "child pid $child"
        Check 'log_has_output' ((Get-TextFile $e['logPath']) -match 'worker: hanging')
        Check 'registry_end' ([bool](ConvertFrom-DeusIso $e['endedAt']))
    } }
    @{ Name = 'orphaned_children'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'orphan'
        $e = $r.Entry
        $child = [int]("$(Get-TextFile (Join-Path $Fx.Out "child_$($e['runId']).txt"))".Trim())
        Check 'exit_2' ($r.Code -eq 2) "exit $($r.Code) $($r.Err)"
        Check 'state_orphaned' ($e -and $e['state'] -eq 'ORPHANED-CHILDREN') "state $($e['state']) flags $($e['flags'] -join ',')"
        Check 'orphan_pid_recorded' (@($e['orphans'] | Where-Object { $_['pid'] -eq $child }).Count -eq 1) "child $child, orphans $((@($e['orphans']) | ForEach-Object { $_['pid'] }) -join ',')"
        Check 'orphan_left_running' (Test-ProcessAlive $child)
        Check 'worker_committed' ($e['newCommits'] -eq 1)
        if ($child) { Stop-Process -Id $child -Force -ErrorAction SilentlyContinue }
    } }
    @{ Name = 'kill_orphans'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'orphan' -Switches @('KillOrphans')
        $e = $r.Entry
        $child = [int]("$(Get-TextFile (Join-Path $Fx.Out "child_$($e['runId']).txt"))".Trim())
        Check 'state_orphaned' ($e -and $e['state'] -eq 'ORPHANED-CHILDREN') "state $($e['state'])"
        Check 'orphans_killed_flag' ($e['orphansKilled'] -eq $true)
        Start-Sleep -Milliseconds 500
        Check 'orphan_dead' ($child -gt 0 -and -not (Test-ProcessAlive $child)) "child $child"
    } }
    @{ Name = 'exited_no_commit'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'dirty'
        $e = $r.Entry
        Check 'exit_2' ($r.Code -eq 2) "exit $($r.Code)"
        Check 'state_exited_no_commit' ($e -and $e['state'] -eq 'EXITED-NO-COMMIT') "state $($e['state']) flags $($e['flags'] -join ',')"
        Check 'dirty_file_listed' (@($e['dirtyFiles']) -contains 'src/allowed/c.txt') (@($e['dirtyFiles']) -join ',')
        Check 'no_new_commit' ($e['newCommits'] -eq 0)
    } }
    @{ Name = 'clean_no_commit_is_ok'; Body = {
        # A worker that changes nothing is not EXITED-NO-COMMIT (the tree is clean).
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'usage-grok' -Params @{ Provider = 'grok' }
        $e = $r.Entry
        Check 'flag_absent' (@($e['flags']) -notcontains 'EXITED-NO-COMMIT') ($e['flags'] -join ',')
    } }
    @{ Name = 'scope_check'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'scope'
        $e = $r.Entry
        $oos = @($e['outOfScope'] | Sort-Object)
        Check 'exit_2' ($r.Code -eq 2) "exit $($r.Code)"
        Check 'state_out_of_scope' ($e -and $e['state'] -eq 'OUT-OF-SCOPE') "state $($e['state']) flags $($e['flags'] -join ',')"
        # Two commits (one allowed, one not): a nested committed list would hide the forbidden file.
        Check 'entries_are_paths' (@($oos | Where-Object { $_ -isnot [string] }).Count -eq 0) (($oos | ForEach-Object { $_.GetType().Name }) -join ',')
        Check 'committed_outside_listed' ($oos -contains 'src/forbidden/x.txt') ($oos -join ',')
        Check 'uncommitted_outside_listed' ($oos -contains 'stray.txt') ($oos -join ',')
        Check 'allowed_not_listed' ($oos -notcontains 'src/allowed/ok.txt') ($oos -join ',')
        Check 'committed_allowed_not_listed' ($oos -notcontains 'src/allowed/y.txt') ($oos -join ',')
        Check 'exactly_two' ($oos.Count -eq 2) ($oos -join ',')
    } }
    @{ Name = 'empty_log'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'silent'
        $e = $r.Entry
        Check 'exit_2' ($r.Code -eq 2) "exit $($r.Code)"
        Check 'state_empty_log' ($e -and $e['state'] -eq 'EMPTY-LOG') "state $($e['state'])"
        Check 'log_bytes_0' ($e['logBytes'] -eq 0) "logBytes $($e['logBytes'])"
        Check 'log_file_exists' (Test-Path $e['logPath'])
    } }
    @{ Name = 'usage_claude_epoch'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'usage-claude'
        $e = $r.Entry
        $want = Format-DeusIso ([DateTimeOffset]::FromUnixTimeSeconds(1790500000).UtcDateTime)
        Check 'exit_2' ($r.Code -eq 2) "exit $($r.Code)"
        Check 'state_usage' ($e -and $e['state'] -eq 'USAGE-EXHAUSTED') "state $($e['state'])"
        Check 'matched_text' ($e['usage']['matchedText'] -match [regex]::Escape('Claude AI usage limit reached|1790500000')) $e['usage']['matchedText']
        Check 'reset_from_epoch' ($e['usage']['resetAt'] -eq $want -and $e['usage']['resetSource'] -eq 'epoch') "$($e['usage']['resetAt']) $($e['usage']['resetSource'])"
        $s = Read-DeusProviderStatus $Fx.Status
        Check 'provider_exhausted' ($s['providers']['claude']['state'] -eq 'EXHAUSTED')
        Check 'provider_reset' ($s['providers']['claude']['resetAt'] -eq $want)
        $q = @($s['queue'] | Where-Object { $_['lane'] -eq 'lane-t' -and $_['state'] -eq 'QUEUED' })
        Check 'queued_once' ($q.Count -eq 1) "queue entries $($q.Count)"
        Check 'queue_fields' ($q[0]['provider'] -eq 'claude' -and $q[0]['role'] -eq 'writer' -and $q[0]['reviewer'] -eq 'grok' -and $q[0]['briefPath'] -eq (Join-Path $Fx.Wt 'tasks\T.01\lane-t\BRIEF.md'))
        Check 'queue_last_commit' ($q[0]['lastCommit'] -eq (G $Fx.Wt rev-parse HEAD)) "$($q[0]['lastCommit'])"
    } }
    @{ Name = 'usage_clock_reset'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'usage-clock'
        $e = $r.Entry
        Check 'state_usage' ($e -and $e['state'] -eq 'USAGE-EXHAUSTED') "state $($e['state'])"
        $reset = ConvertFrom-DeusIso $e['usage']['resetAt']
        $ended = ConvertFrom-DeusIso $e['endedAt']
        $ct = [TimeZoneInfo]::ConvertTimeFromUtc($reset, [TimeZoneInfo]::FindSystemTimeZoneById('Central Standard Time'))
        Check 'reset_source_clock' ($e['usage']['resetSource'] -eq 'clock') $e['usage']['resetSource']
        Check 'reset_5pm_ct' ($ct.Hour -eq 17 -and $ct.Minute -eq 0) $ct.ToString('o')
        Check 'reset_within_a_day' ($reset -gt $ended -and ($reset - $ended).TotalHours -le 24) "$reset vs $ended"
    } }
    @{ Name = 'usage_codex_relative'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'usage-codex' -Params @{ Provider = 'codex' }
        $e = $r.Entry
        Check 'state_usage' ($e -and $e['state'] -eq 'USAGE-EXHAUSTED') "state $($e['state']) $($r.Err)"
        $delta = ((ConvertFrom-DeusIso $e['usage']['resetAt']) - (ConvertFrom-DeusIso $e['endedAt'])).TotalMinutes
        Check 'reset_2h05' ([math]::Abs($delta - 125) -lt 0.2) "delta $delta min"
        Check 'matched_text' ($e['usage']['matchedText'] -match "hit your usage limit") $e['usage']['matchedText']
        $s = Read-DeusProviderStatus $Fx.Status
        Check 'codex_exhausted' ($s['providers']['codex']['state'] -eq 'EXHAUSTED')
    } }
    @{ Name = 'usage_grok_default'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'usage-grok' -Params @{ Provider = 'grok' }
        $e = $r.Entry
        Check 'role_reviewer' ($e['role'] -eq 'reviewer') $e['role']
        Check 'state_usage' ($e -and $e['state'] -eq 'USAGE-EXHAUSTED') "state $($e['state'])"
        $delta = ((ConvertFrom-DeusIso $e['usage']['resetAt']) - (ConvertFrom-DeusIso $e['endedAt'])).TotalMinutes
        Check 'default_reset_60' ($e['usage']['resetSource'] -eq 'default' -and [math]::Abs($delta - 60) -lt 0.2) "$($e['usage']['resetSource']) $delta"
        Check 'matched_429' ($e['usage']['matchedText'] -match '429 Too Many Requests') $e['usage']['matchedText']
    } }
    @{ Name = 'usage_no_false_positive'; Body = {
        Reset-Lane $Fx
        $r = Invoke-Launch $Fx -Mode 'mention'
        $e = $r.Entry
        Check 'exit_0' ($r.Code -eq 0) "exit $($r.Code) flags $($e['flags'] -join ',')"
        Check 'state_completed' ($e -and $e['state'] -eq 'COMPLETED') "state $($e['state'])"
        Check 'no_usage' ($null -eq $e['usage'])
        Check 'not_queued' (-not (Test-Path $Fx.Status))
    } }
    @{ Name = 'lane_lock'; Body = {
        Reset-Lane $Fx
        $lockDir = Join-Path $Fx.Logs 'lane-t'
        New-Item -ItemType Directory -Force -Path $lockDir | Out-Null
        $fs = [IO.File]::Open((Join-Path $lockDir 'lane.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
        try { $r = Invoke-Launch $Fx -Mode 'commit' } finally { $fs.Dispose() }
        Check 'exit_1' ($r.Code -eq 1) "exit $($r.Code)"
        Check 'says_locked' ($r.Err -match 'locked') $r.Err
        Check 'no_run' (-not (Test-Path $Fx.Reg))
    } }
    @{ Name = 'active_pid_refusal'; Body = {
        Reset-Lane $Fx
        $me = Get-Process -Id $PID
        $seed = New-Object System.Collections.ArrayList
        [void]$seed.Add([ordered]@{ runId = 'seed-live'; lane = 'lane-t'; state = 'running'; pid = $PID; processStartedAt = (Format-DeusIso $me.StartTime) })
        Write-DeusJsonFile $Fx.Reg $seed
        $r = Invoke-Launch $Fx -Mode 'commit'
        Check 'exit_1' ($r.Code -eq 1) "exit $($r.Code)"
        Check 'says_live_worker' ($r.Err -match 'live worker') $r.Err
        # Read-DeusJsonFile returns its list wrapped (', $list'); the parentheses unwrap it so entries are counted.
        $entries = @((Read-DeusJsonFile $Fx.Reg $null))
        Check 'no_new_entry' ($entries.Count -eq 1) "$($entries.Count) entries"
    } }
    @{ Name = 'stale_entry_marked_lost'; Body = {
        Reset-Lane $Fx
        $dead = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'exit 0' -WindowStyle Hidden -PassThru
        $dead.WaitForExit()
        $seed = New-Object System.Collections.ArrayList
        [void]$seed.Add([ordered]@{ runId = 'seed-dead'; lane = 'Lane T'; state = 'RUNNING'; pid = $dead.Id; processStartedAt = (Format-DeusIso $dead.StartTime) })
        Write-DeusJsonFile $Fx.Reg $seed
        $r = Invoke-Launch $Fx -Mode 'commit'
        Check 'exit_0' ($r.Code -eq 0) "exit $($r.Code) $($r.Err)"
        $old = @((Read-DeusJsonFile $Fx.Reg $null) | Where-Object { $_['runId'] -eq 'seed-dead' })
        Check 'stale_marked_lost' ($old.Count -eq 1 -and $old[0]['state'] -eq 'LOST') "$($old.Count) matching entries; state $(if ($old.Count) { $old[0]['state'] })"
    } }
    @{ Name = 'family_refusal'; Body = {
        Reset-Lane $Fx
        $r1 = Invoke-Launch $Fx -Mode 'commit' -Params @{ Provider = 'grok'; Role = 'writer' }
        Check 'grok_writer_refused' ($r1.Code -eq 1 -and $r1.Err -match 'famil') "exit $($r1.Code) $($r1.Err)"
        $r2 = Invoke-Launch $Fx -Mode 'commit' -Params @{ Provider = 'claude'; Role = 'reviewer' }
        Check 'claude_reviewer_refused' ($r2.Code -eq 1 -and $r2.Err -match 'famil') "exit $($r2.Code) $($r2.Err)"
        Check 'no_run' (-not (Test-Path $Fx.Reg))
    } }
    @{ Name = 'branch_refusal'; Body = {
        Reset-Lane $Fx
        & git -C $Fx.Wt checkout -q -b tmp-other 2>$null | Out-Null
        $r = Invoke-Launch $Fx -Mode 'commit'
        & git -C $Fx.Wt checkout -q task/lane-t 2>$null | Out-Null
        & git -C $Fx.Wt branch -q -D tmp-other 2>$null | Out-Null
        Check 'exit_1' ($r.Code -eq 1) "exit $($r.Code)"
        Check 'says_branch' ($r.Err -match "branch 'tmp-other'") $r.Err
    } }
    @{ Name = 'hooks_install_and_block'; Body = {
        $remote = Join-Path $TestRoot 'remote.git'
        if (-not (Test-Path $remote)) { & git init -q --bare $remote 2>$null | Out-Null }
        & git -C $Fx.Main remote remove origin 2>$null | Out-Null
        & git -C $Fx.Main remote add origin $remote 2>$null | Out-Null
        $laneH = Join-Path $TestRoot 'wt\lane-h'
        if (-not (Test-Path $laneH)) { & git -C $Fx.Main worktree add -q -b task/lane-h $laneH 2>$null | Out-Null }
        $inst = Invoke-Proc -Exe $PsExe -Argv @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $OpsDir 'install_lane_hooks.ps1'), '-Worktree', $laneH)
        Check 'install_exit_0' ($inst.Code -eq 0) "$($inst.Code) $($inst.Out) $($inst.Err)"
        $common = (G $laneH rev-parse --path-format=absolute --git-common-dir)
        $want = "$common/deus_lane_hooks"
        Check 'worktree_scoped_hookspath' ((G $laneH config --worktree --get core.hooksPath) -eq $want) (G $laneH config --worktree --get core.hooksPath)
        Check 'worktree_config_enabled' ((G $Fx.Main config --get extensions.worktreeConfig) -eq 'true')
        Check 'main_not_guarded' (-not (G $Fx.Main config --get core.hooksPath)) (G $Fx.Main config --get core.hooksPath)
        Check 'repo_wide_not_set' (-not (G $laneH config --local --get core.hooksPath))
        Check 'global_not_set' ((Get-TextFile $env:GIT_CONFIG_GLOBAL) -notmatch 'hooksPath')
        $srcHook = [IO.File]::ReadAllBytes((Join-Path $OpsDir 'hooks\pre-push'))
        $dstHook = [IO.File]::ReadAllBytes((Join-Path ($want -replace '/', '\') 'pre-push'))
        Check 'hook_copied_exactly' ([Convert]::ToBase64String($srcHook) -eq [Convert]::ToBase64String($dstHook))
        [IO.File]::WriteAllText((Join-Path $laneH 'h.txt'), "h`n")
        & git -C $laneH add h.txt 2>$null | Out-Null
        & git -C $laneH commit -q -m 'lane commit' 2>$null | Out-Null
        $sha = G $laneH rev-parse HEAD
        $gitExe = (Get-Command git.exe).Source
        $p1 = Invoke-Proc -Exe $gitExe -Argv @('-C', $laneH, 'push', 'origin', 'task/lane-h') -RemoveEnv @('DEUS_INTEGRATOR')
        Check 'push_blocked' ($p1.Code -ne 0 -and $p1.Err -match 'pre-push: BLOCKED') "$($p1.Code) $($p1.Err)"
        Check 'remote_untouched' (-not (G $remote rev-parse --verify --quiet refs/heads/task/lane-h))
        $p2 = Invoke-Proc -Exe $gitExe -Argv @('-C', $laneH, 'push', 'origin', 'task/lane-h') -Env @{ DEUS_INTEGRATOR = 'true' }
        Check 'push_blocked_unless_exactly_1' ($p2.Code -ne 0) "$($p2.Code) $($p2.Err)"
        $p3 = Invoke-Proc -Exe $gitExe -Argv @('-C', $laneH, 'push', 'origin', 'task/lane-h') -Env @{ DEUS_INTEGRATOR = '1' }
        Check 'integrator_push_allowed' ($p3.Code -eq 0) "$($p3.Code) $($p3.Err)"
        Check 'remote_updated' ((G $remote rev-parse refs/heads/task/lane-h) -eq $sha)
        $p4 = Invoke-Proc -Exe $gitExe -Argv @('-C', $Fx.Main, 'push', 'origin', 'HEAD:refs/heads/main') -RemoveEnv @('DEUS_INTEGRATOR')
        Check 'main_push_not_guarded' ($p4.Code -eq 0) "$($p4.Code) $($p4.Err)"
        $chk = Invoke-Proc -Exe $PsExe -Argv @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $OpsDir 'install_lane_hooks.ps1'), '-Worktree', $laneH, '-Check')
        Check 'check_reports_guarded' ($chk.Code -eq 0 -and $chk.Out -match '^GUARDED') "$($chk.Code) $($chk.Out)"
        $chk2 = Invoke-Proc -Exe $PsExe -Argv @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $OpsDir 'install_lane_hooks.ps1'), '-Worktree', $Fx.Wt, '-Check')
        Check 'check_reports_unguarded' ($chk2.Code -eq 1 -and $chk2.Out -match 'NOT INSTALLED') "$($chk2.Code) $($chk2.Out)"
    } }
    @{ Name = 'hooks_refuse_main'; Body = {
        $inst = Invoke-Proc -Exe $PsExe -Argv @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $OpsDir 'install_lane_hooks.ps1'), '-Worktree', $Fx.Main)
        Check 'exit_1' ($inst.Code -eq 1) "$($inst.Code) $($inst.Out)"
        Check 'says_main' ($inst.Out -match 'main worktree') $inst.Out
        Check 'main_not_guarded' (-not (G $Fx.Main config --get core.hooksPath))
        Check 'global_not_set' ((Get-TextFile $env:GIT_CONFIG_GLOBAL) -notmatch 'hooksPath')
    } }
    @{ Name = 'gate_registry'; Body = {
        $path = Join-Path $OpsDir 'gate_tests.json'
        $j = $null
        try { $j = Read-DeusJsonFile $path $null } catch { }
        Check 'valid_json' ($j -is [System.Collections.IDictionary]) $path
        if (-not ($j -is [System.Collections.IDictionary])) { return }
        $gate = @($j['gate'])
        $quar = @($j['quarantine'])
        Check 'gate_is_list_of_paths' ($gate.Count -gt 0 -and @($gate | Where-Object { $_ -isnot [string] }).Count -eq 0)
        Check 'quarantine_has_path_and_reason' ($quar.Count -gt 0 -and @($quar | Where-Object { -not ($_ -is [System.Collections.IDictionary] -and "$($_['path'])".Trim() -and "$($_['reason'])".Trim()) }).Count -eq 0)
        $required = @('tools/check_deus_syntax.js', 'tools/test_palette.js', 'tools/governance/test_check_claims.js', 'tools/test_strata_cuts_and_caves.js',
            'tools/test_new_game_year0.js', 'tools/test_history_materialization_and_world_age.js', 'tools/test_historical_carrying_capacity.js',
            'tools/test_geology_strata.js', 'tools/test_strata_foundation.js')
        foreach ($t in $required) { Check "gate_has_$([IO.Path]::GetFileNameWithoutExtension($t))" ($gate -contains $t) }
        Check 'z2_quarantined' (@($quar | Where-Object { $_['path'] -eq 'tools/test_generated_z2_cut_proof.js' }).Count -eq 1)
        $qpaths = @($quar | ForEach-Object { $_['path'] })
        Check 'no_path_in_both' (@($gate | Where-Object { $qpaths -contains $_ }).Count -eq 0)
        Check 'no_duplicates' ((@($gate + $qpaths | Sort-Object -Unique)).Count -eq ($gate.Count + $qpaths.Count))
        $missing = @($gate + $qpaths | Where-Object { -not (Test-Path -LiteralPath (Join-Path $RepoRoot $_)) })
        Check 'all_paths_exist' ($missing.Count -eq 0) ($missing -join ', ')
    } }
)

# ---------------------------------------------------------------------------------------------
# Mutation sweep
# ---------------------------------------------------------------------------------------------

function Invoke-MutantSweep([string]$TestScriptName, $Defs) {
    $caught = 0
    $bad = @()
    foreach ($m in $Defs) {
        $dir = Join-Path ([IO.Path]::GetTempPath()) ("deus_ops_mut_{0}_{1}" -f $PID, $m.Name)
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Force -Path (Join-Path $dir 'hooks') | Out-Null
        Get-ChildItem -LiteralPath $OpsDir -File | Copy-Item -Destination $dir
        Copy-Item -LiteralPath (Join-Path $OpsDir 'hooks\pre-push') -Destination (Join-Path $dir 'hooks')
        $file = Join-Path $dir $m.File
        $text = [IO.File]::ReadAllText($file)
        $n = ([regex]::Matches($text, [regex]::Escape($m.Find))).Count
        if ($n -ne 1) {
            Write-Host "MUTANT $($m.Name): SETUP-ERROR (the text to replace occurs $n times in $($m.File), expected 1)"
            $bad += $m.Name
            Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
            continue
        }
        [IO.File]::WriteAllText($file, $text.Replace($m.Find, $m.Replace), (New-Object Text.UTF8Encoding $false))
        $r = Invoke-Proc -Exe $PsExe -Argv @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $dir $TestScriptName), '-OpsDir', $dir, '-RepoRoot', $RepoRoot, '-Only', $m.Tests) -TimeoutSeconds 900
        $fails = @(($r.Out -split "`r?`n") | Where-Object { $_ -match '^\s+FAIL ' } | ForEach-Object { $_.Trim().Substring(5) })
        if ($r.Code -eq 1 -and $fails.Count -gt 0) {
            $caught++
            Write-Host ("MUTANT {0}: CAUGHT (exit 1; failed: {1})" -f $m.Name, (($fails | Select-Object -First 4) -join '; '))
        } else {
            $bad += $m.Name
            Write-Host "MUTANT $($m.Name): SURVIVED (exit $($r.Code))"
            Write-Host (($r.Out -split "`r?`n" | Select-Object -Last 5) -join "`n")
        }
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "MUTANTS: $caught/$($Defs.Count) caught$(if ($bad) { "; not caught: $($bad -join ', ')" })"
    if ($bad) { return 1 }
    return 0
}

$MutantDefs = @(
    @{ Name = 'no_timeout_kill'; File = 'launch_worker.ps1'; Tests = 'timeout_kill'
       Find = 'Stop-DeusProcessTree -RootPid $p.Id -Tracked $tracked'; Replace = '$null = $tracked' }
    @{ Name = 'no_orphan_detect'; File = 'launch_worker.ps1'; Tests = 'orphaned_children'
       Find = '$r.Orphans = $alive'; Replace = '$r.Orphans = @()' }
    @{ Name = 'no_commit_check'; File = 'launch_worker.ps1'; Tests = 'exited_no_commit'
       Find = "if (`$newCommits -eq 0 -and @(`$changes.Uncommitted).Count -gt 0) { `$flags.Add('EXITED-NO-COMMIT') }"; Replace = '' }
    @{ Name = 'no_scope_check'; File = 'launch_worker.ps1'; Tests = 'scope_check'
       Find = '-not (Test-DeusPathAllowed $_ $allowed)'; Replace = '$false' }
    @{ Name = 'git_lines_nested'; File = 'launch_worker.ps1'; Tests = 'scope_check'
       Find = 'return @($text.Split([char]0)'; Replace = 'return , @($text.Split([char]0)' }
    @{ Name = 'stale_not_marked'; File = 'launch_worker.ps1'; Tests = 'stale_entry_marked_lost'
       Find = "`$e['state'] = 'LOST'"; Replace = '$null = $e' }
    @{ Name = 'usage_scans_all_json'; File = 'launch_worker.ps1'; Tests = 'usage_no_false_positive'
       Find = 'if ($t -notmatch $prefilter) { continue }'; Replace = 'if ($t -notmatch $prefilter) { $out.Add($t); continue }' }
    @{ Name = 'no_usage_detect'; File = 'launch_worker.ps1'; Tests = 'usage_claude_epoch,usage_codex_relative'
       Find = "if (`$usage) { `$flags.Add('USAGE-EXHAUSTED') }"; Replace = '' }
    @{ Name = 'reset_ignores_clock'; File = 'launch_worker.ps1'; Tests = 'usage_clock_reset'
       Find = '$clock = [regex]::Match('; Replace = '$clock = [regex]::Match("(?!)", "") ; $null = [regex]::Match(' }
    @{ Name = 'empty_log_ok'; File = 'launch_worker.ps1'; Tests = 'empty_log'
       Find = "if (`$logBytes -eq 0) { `$flags.Add('EMPTY-LOG') }"; Replace = '' }
    @{ Name = 'prompt_not_committed'; File = 'launch_worker.ps1'; Tests = 'commit_run'
       Find = 'if (-not $NoCommitPrompt) {'; Replace = 'if ($false) {' }
    @{ Name = 'empty_brief_ok'; File = 'launch_worker.ps1'; Tests = 'refuse_empty_brief'
       Find = '(Get-Item -LiteralPath $brief).Length -eq 0 -or -not ([IO.File]::ReadAllText($brief)).Trim()'; Replace = '$false' }
    @{ Name = 'identity_unset'; File = 'launch_worker.ps1'; Tests = 'commit_run'
       Find = '$envSet = @{ GIT_AUTHOR_NAME = "deus-$prov"; GIT_COMMITTER_NAME = "deus-$prov"; DEUS_RUN_ID = $runId }'; Replace = '$envSet = @{ DEUS_RUN_ID = $runId }' }
    @{ Name = 'integrator_leaks'; File = 'launch_worker.ps1'; Tests = 'commit_run'
       Find = "EnvSet = `$envSet; EnvRemove = @('DEUS_INTEGRATOR', "; Replace = 'EnvSet = $envSet; EnvRemove = @(' }
    @{ Name = 'no_stderr_tee'; File = 'launch_worker.ps1'; Tests = 'commit_run'
       Find = 'p.ErrorDataReceived += (s, e) => { if (e.Data == null) { w.errEof = true; } else { w.Write(e.Data); } };'
       Replace = 'p.ErrorDataReceived += (s, e) => { if (e.Data == null) { w.errEof = true; } };' }
    @{ Name = 'registry_no_pid'; File = 'launch_worker.ps1'; Tests = 'commit_run'
       Find = '([ordered]@{ pid = $r.Pid;'; Replace = '([ordered]@{ pid = $null;' }
    @{ Name = 'family_check_off'; File = 'launch_worker.ps1'; Tests = 'family_refusal'
       Find = 'if ($counterpart -and (Get-DeusProviderFamily $counterpart) -eq (Get-DeusProviderFamily $prov)) {'; Replace = 'if ($false) {' }
    @{ Name = 'lane_lock_off'; File = 'launch_worker.ps1'; Tests = 'lane_lock'
       Find = 'if (-not $script:LaneLock) { Stop-DeusLaunch'; Replace = 'if ($false) { Stop-DeusLaunch' }
    @{ Name = 'active_pid_ignored'; File = 'launch_worker.ps1'; Tests = 'active_pid_refusal'
       Find = 'if ($active.Count -gt 0) {'; Replace = 'if ($false) {' }
    @{ Name = 'resume_line_changed'; File = 'launch_worker.ps1'; Tests = 'resume_prompt'
       Find = 'return "resume from HEAD $Sha; re-read BRIEF and the uncommitted diff first"'; Replace = 'return "resume from $Sha"' }
    @{ Name = 'hook_allows_push'; File = 'hooks\pre-push'; Tests = 'hooks_install_and_block'
       Find = 'exit 1'; Replace = 'exit 0' }
    @{ Name = 'hook_repo_wide'; File = 'install_lane_hooks.ps1'; Tests = 'hooks_install_and_block'
       Find = "@('config', '--worktree', 'core.hooksPath', `$destGit)"; Replace = "@('config', 'core.hooksPath', `$destGit)" }
    @{ Name = 'hook_installs_on_main'; File = 'install_lane_hooks.ps1'; Tests = 'hooks_refuse_main'
       Find = 'if (Test-SamePath $gitDir $commonDir) {'; Replace = 'if ($false) {' }
    @{ Name = 'gate_missing_suite'; File = 'gate_tests.json'; Tests = 'gate_registry'
       Find = '"tools/test_palette.js",'; Replace = '' }
)

# ---------------------------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------------------------

if ($MyInvocation.InvocationName -eq '.') { return }
if ($List) { $Tests | ForEach-Object { $_.Name }; exit 0 }
if ($Mutants) { exit (Invoke-MutantSweep 'test_launch_worker.ps1' $MutantDefs) }

$TestRoot = Initialize-TestHarness 'deus_lw_test'
Write-Host "test_launch_worker: ops $OpsDir; temp $TestRoot"
$Fx = New-TestRepo $TestRoot
Write-FakeWorker $Fx.FakeWorker
$leftover = 0
try {
    Invoke-TestList $Tests $Only
} finally {
    $leftover = Complete-TestHarness -Keep:$KeepTemp
}
exit (Write-TestSummary $leftover)
