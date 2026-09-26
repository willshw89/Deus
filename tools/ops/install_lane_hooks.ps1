<#
.SYNOPSIS
    Installs the DEUS pre-push guard (tools/ops/hooks/pre-push) in lane worktrees only (WG.00.12 Lane J).

.DESCRIPTION
    For each lane worktree:
      1. refuses the main worktree (the canonical project keeps its normal hooks and pushes);
      2. copies the hooks from tools/ops/hooks to <git common dir>\deus_lane_hooks, so the guard does not
         depend on which branch a lane has checked out (use -HooksDir to point somewhere else, no copy);
      3. runs  git config extensions.worktreeConfig true
      4. runs  git config --worktree core.hooksPath <hooks dir>
      5. checks that the lane now uses the guard, that the main worktree does not, and that the global
         core.hooksPath is unchanged.
    It never writes core.hooksPath at --global, --system or repository (--local) scope.

    -Check reports the state without changing anything. -Uninstall removes the worktree-scoped setting.
    Exit codes: 0 all targets done; 1 a target was refused or failed a check; 2 bad arguments.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/install_lane_hooks.ps1 -Worktree C:\Users\snewt\.deus_worktrees\lane-j
.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File tools/ops/install_lane_hooks.ps1 -AllLanes
#>
[CmdletBinding()]
param(
    [string[]]$Worktree,
    [switch]$AllLanes,
    [string]$Repo,
    [string]$HooksDir,
    [switch]$Uninstall,
    [switch]$Check
)

$ErrorActionPreference = 'Continue'
$GuardMarker = 'DEUS lane push guard'

function Invoke-Git([string]$Dir, [string[]]$GitArgs) {
    $out = & git -C $Dir @GitArgs 2>$null
    return @{ Code = $LASTEXITCODE; Out = (@($out) -join "`n").Trim() }
}

function Get-LaneWorktrees([string]$RepoPath) {
    $r = Invoke-Git $RepoPath @('worktree', 'list', '--porcelain')
    if ($r.Code -ne 0) { return @() }
    $found = @()
    $first = $true
    $cur = $null
    foreach ($line in ($r.Out -split "`n")) {
        if ($line -like 'worktree *') {
            if ($cur) { $found += $cur }
            $cur = @{ Path = ($line.Substring(9) -replace '/', '\'); Branch = ''; Main = $first }
            $first = $false
        } elseif ($line -like 'branch *' -and $cur) { $cur.Branch = $line.Substring(7) }
    }
    if ($cur) { $found += $cur }
    return @($found | Where-Object { -not $_.Main -and ($_.Branch -match '^refs/heads/task/lane-' -or (Split-Path -Leaf $_.Path) -match '^lane-') } | ForEach-Object { $_.Path })
}

function Get-HooksPathAt([string]$Dir, [string]$Scope) {
    $a = @('config')
    if ($Scope) { $a += $Scope }
    $a += @('--get', 'core.hooksPath')
    return (Invoke-Git $Dir $a).Out
}

function Test-SamePath([string]$A, [string]$B) {
    if (-not $A -or -not $B) { return $false }
    $na = [IO.Path]::GetFullPath(($A -replace '/', '\')).TrimEnd('\')
    $nb = [IO.Path]::GetFullPath(($B -replace '/', '\')).TrimEnd('\')
    return ($na -ieq $nb)
}

$targets = @()
if ($Worktree) { $targets += @($Worktree | ForEach-Object { "$_".Split(',') } | Where-Object { $_ }) }
if ($AllLanes) {
    $repoPath = $Repo
    if (-not $repoPath) { $repoPath = $PSScriptRoot }
    $targets += Get-LaneWorktrees $repoPath
}
if (-not $targets) {
    [Console]::Error.WriteLine('install_lane_hooks: give -Worktree <path>[,<path>...] or -AllLanes')
    exit 2
}

$sourceHook = Join-Path $PSScriptRoot 'hooks\pre-push'
$globalBefore = (Invoke-Git $PSScriptRoot @('config', '--global', '--get', 'core.hooksPath')).Out
$failed = 0

foreach ($t in $targets) {
    if (-not (Test-Path -LiteralPath $t -PathType Container)) { Write-Host "REFUSED $t : not a folder"; $failed++; continue }
    $wt = (Resolve-Path -LiteralPath $t).ProviderPath
    $dirs = Invoke-Git $wt @('rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir')
    $prefix = Invoke-Git $wt @('rev-parse', '--show-prefix')
    if ($dirs.Code -ne 0 -or $prefix.Code -ne 0) { Write-Host "REFUSED $wt : not a git worktree"; $failed++; continue }
    if ($prefix.Out) { Write-Host "REFUSED $wt : not the top folder of its worktree"; $failed++; continue }
    $parts = $dirs.Out -split "`n"
    $gitDir = $parts[0].Trim(); $commonDir = $parts[1].Trim()
    if (Test-SamePath $gitDir $commonDir) {
        Write-Host "REFUSED $wt : this is the main worktree; the push guard is for lane worktrees only"
        $failed++; continue
    }
    $mainWt = Split-Path -Parent ($commonDir -replace '/', '\')

    if ($Check) {
        $wtHooks = Get-HooksPathAt $wt '--worktree'
        $guard = $false
        if ($wtHooks) {
            $hp = Join-Path ($wtHooks -replace '/', '\') 'pre-push'
            if ((Test-Path -LiteralPath $hp) -and ([IO.File]::ReadAllText($hp) -match $GuardMarker)) { $guard = $true }
        }
        $state = 'NOT INSTALLED'
        if ($guard) { $state = 'GUARDED' } elseif ($wtHooks) { $state = 'HOOKSPATH SET, NO GUARD' }
        Write-Host "$state $wt (worktree core.hooksPath: $(if ($wtHooks) { $wtHooks } else { 'unset' }))"
        if (-not $guard) { $failed++ }
        continue
    }

    if ($Uninstall) {
        $r = Invoke-Git $wt @('config', '--worktree', '--unset', 'core.hooksPath')
        if ($r.Code -ne 0 -and $r.Code -ne 5) { Write-Host "FAILED $wt : git config --worktree --unset exited $($r.Code)"; $failed++; continue }
        Write-Host "uninstalled $wt"
        continue
    }

    # git requires core.worktree to move out of the shared config before extensions.worktreeConfig is enabled.
    $commonConfig = Join-Path ($commonDir -replace '/', '\') 'config'
    $coreWorktree = (Invoke-Git $wt @('config', '--file', $commonConfig, '--get', 'core.worktree')).Out
    $coreBare = (Invoke-Git $wt @('config', '--file', $commonConfig, '--get', 'core.bare')).Out
    if ($coreWorktree -or $coreBare -eq 'true') {
        Write-Host "REFUSED $wt : the shared config sets core.worktree or core.bare=true; move it to config.worktree first (git help worktree)"
        $failed++; continue
    }

    $dest = $HooksDir
    if (-not $dest) {
        if (-not (Test-Path -LiteralPath $sourceHook)) { Write-Host "FAILED $wt : missing $sourceHook"; $failed++; continue }
        $dest = Join-Path ($commonDir -replace '/', '\') 'deus_lane_hooks'
        if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Force -Path $dest | Out-Null }
        Copy-Item -LiteralPath $sourceHook -Destination (Join-Path $dest 'pre-push') -Force
    }
    $dest = [IO.Path]::GetFullPath($dest)
    if (-not (Test-Path -LiteralPath (Join-Path $dest 'pre-push'))) { Write-Host "FAILED $wt : no pre-push hook in $dest"; $failed++; continue }
    $destGit = $dest -replace '\\', '/'

    $r1 = Invoke-Git $wt @('config', 'extensions.worktreeConfig', 'true')
    $r2 = Invoke-Git $wt @('config', '--worktree', 'core.hooksPath', $destGit)
    if ($r1.Code -ne 0 -or $r2.Code -ne 0) { Write-Host "FAILED $wt : git config exited $($r1.Code)/$($r2.Code)"; $failed++; continue }

    $problems = @()
    if (-not (Test-SamePath (Get-HooksPathAt $wt '') $dest)) { $problems += 'the lane does not resolve core.hooksPath to the guard' }
    $repoWide = Get-HooksPathAt $wt '--local'
    if ($repoWide) { $problems += "a repository-wide core.hooksPath is set ($repoWide) by something else; it applies to every worktree" }
    if (Test-SamePath (Get-HooksPathAt $mainWt '') $dest) { $problems += 'the main worktree also resolves core.hooksPath to the guard' }
    $globalAfter = (Invoke-Git $wt @('config', '--global', '--get', 'core.hooksPath')).Out
    if ($globalAfter -ne $globalBefore) { $problems += "global core.hooksPath changed ('$globalBefore' -> '$globalAfter')" }
    if ($problems) {
        Write-Host "FAILED $wt : $($problems -join '; ')"
        $failed++; continue
    }
    Write-Host "installed $wt -> $destGit"
}

if ($failed -gt 0) { exit 1 }
exit 0
