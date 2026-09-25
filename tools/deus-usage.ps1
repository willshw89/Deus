# DEUS AI Capacity Dashboard
# Usage: .\tools\deus-usage.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

# Run the node-based telemetry engine
node "$RepoRoot\tools\deus_usage_telemetry.js"
