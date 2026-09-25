# tools/launch_workers.ps1 - DEUS Directive 001-B Parallel Worker Launcher
$ErrorActionPreference = "Stop"

$baseDir = "c:\Users\snewt\OneDrive\Desktop\UF"
$worktreeBase = "C:\Users\snewt\.deus_worktrees"
$logsDir = Join-Path $worktreeBase "logs"
$telemetryDir = Join-Path $baseDir "docs\telemetry\sessions"

if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Force -Path $logsDir | Out-Null }
if (-not (Test-Path $telemetryDir)) { New-Item -ItemType Directory -Force -Path $telemetryDir | Out-Null }

$lanes = @(
    @{
        Lane = "Lane A"
        WbsId = "WG.00.08"
        Provider = "Claude CLI (Fable)"
        Model = "claude-opus-5-5"
        Worktree = Join-Path $worktreeBase "lane-a"
        Branch = "task/lane-a"
        Script = Join-Path $worktreeBase "run_lane_a.ps1"
        Log = Join-Path $logsDir "lane-a.log"
    },
    @{
        Lane = "Lane B"
        WbsId = "WG.00.11"
        Provider = "Claude CLI (Fable)"
        Model = "claude-opus-5-5"
        Worktree = Join-Path $worktreeBase "lane-b"
        Branch = "task/lane-b"
        Script = Join-Path $worktreeBase "run_lane_b.ps1"
        Log = Join-Path $logsDir "lane-b.log"
    },
    @{
        Lane = "Lane C1"
        WbsId = "WG.00.12"
        Provider = "Claude CLI (Codex failover)"
        Model = "claude-opus-5-5"
        Worktree = Join-Path $worktreeBase "lane-c1"
        Branch = "task/lane-c1"
        Script = Join-Path $worktreeBase "run_lane_c1.ps1"
        Log = Join-Path $logsDir "lane-c1.log"
    },
    @{
        Lane = "Lane C2"
        WbsId = "WG.00.12"
        Provider = "Claude CLI"
        Model = "claude-opus-5-5"
        Worktree = Join-Path $worktreeBase "lane-c2"
        Branch = "task/lane-c2"
        Script = Join-Path $worktreeBase "run_lane_c2.ps1"
        Log = Join-Path $logsDir "lane-c2.log"
    },
    @{
        Lane = "Lane E"
        WbsId = "WG.00.09"
        Provider = "Grok CLI"
        Model = "grok-4.7"
        Worktree = Join-Path $worktreeBase "lane-e"
        Branch = "task/lane-e"
        Script = Join-Path $worktreeBase "run_lane_e.ps1"
        Log = Join-Path $logsDir "lane-e.log"
    }
)

$activeWorkers = @()

foreach ($l in $lanes) {
    if (Test-Path $l.Log) { Remove-Item $l.Log -Force }

    $proc = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $l.Script `
        -PassThru

    $record = [PSCustomObject]@{
        Lane = $l.Lane
        WbsId = $l.WbsId
        Provider = $l.Provider
        Model = $l.Model
        Pid = $proc.Id
        Worktree = $l.Worktree
        Branch = $l.Branch
        StartTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
        LogFile = $l.Log
        Status = "ACTIVE"
    }

    $activeWorkers += $record
    Write-Output ("Launched {0} [{1}] PID {2} -> {3}" -f $l.Lane, $l.Provider, $proc.Id, $l.Branch)
}

$activeWorkers | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $telemetryDir "active_workers.json")
Write-Output "Workers registry written to docs\telemetry\sessions\active_workers.json"
