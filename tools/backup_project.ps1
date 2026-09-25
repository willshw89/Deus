<#
.SYNOPSIS
  Copies the DEUS project to a folder outside the repo with robocopy, then verifies the copy.

.DESCRIPTION
  Backs up -Source (default: the repository that contains this script) into
  -Destination (default: %USERPROFILE%\.deus_backups\backup_<yyyyMMdd_HHmmss>).

  This is a plain file copy, never a git clone, so untracked files (stand-ins,
  local reference material, scratch) and the .git folder are included.

  The default destination is on the same disk as the project, so it is only a local
  copy. For an external backup (DEC-005 in docs/OWNER_DECISIONS.md) pass a destination
  on another physical disk or a network share, e.g. -Destination E:\deus_backup. The
  script reports whether the destination is off-disk and records it in the marker.

  Excluded anywhere in the tree (runtime test artifacts and temp files):
    folders  node_modules, save, test_output
    files    *.log

  Safety rules:
    - The destination may not be the source, inside the source, or contain the source.
    - The script only writes into a new or empty folder, or into a folder holding the
      .deus_backup.json marker from an earlier run for the same source.
    - Nothing is deleted from the destination unless -Mirror is given.
    - Junctions are skipped (/XJ), so the copy cannot loop.

  After the copy, a second robocopy pass in list-only mode re-compares source and
  backup (every source file present with the same size and timestamp).
  -VerifyHash also compares the SHA-256 of every backed-up file with its source.

.PARAMETER Source
  Folder to back up. Default: the parent of this script's tools\ folder.
.PARAMETER Destination
  Backup folder. Default: %USERPROFILE%\.deus_backups\backup_<timestamp>.
.PARAMETER Mirror
  Use robocopy /MIR instead of /E: also delete files from the backup that no longer
  exist in the source. Only allowed on a new/empty folder or a marked backup.
.PARAMETER ListOnly
  Report what would be copied (robocopy /L). Writes nothing.
.PARAMETER VerifyOnly
  Skip the copy and verify an existing backup against the source. Needs -Destination.
.PARAMETER VerifyHash
  Also compare SHA-256 hashes of every file (reads source and backup in full).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1 -Destination E:\deus_backup -Mirror -VerifyHash
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools/backup_project.ps1 -Destination C:\Users\snewt\.deus_backups\backup_20260925_210000 -VerifyOnly -VerifyHash

.NOTES
  Exit codes: 0 success; 1 refused or bad arguments; 2 robocopy failed (its exit code
  was 8 or higher); 3 verification failed.
  Robocopy exit codes 0-7 mean success (bit 1 files copied, bit 2 extra files in the
  destination, bit 4 mismatches); 8 and above mean some files or the whole job failed.
#>
[CmdletBinding()]
param(
    [string]$Source,
    [string]$Destination,
    [switch]$Mirror,
    [switch]$ListOnly,
    [switch]$VerifyOnly,
    [switch]$VerifyHash
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

$ExcludeDirs  = @('node_modules', 'save', 'test_output')
$ExcludeFiles = @('*.log')
$MarkerName   = '.deus_backup.json'
$LogName      = '.deus_backup_robocopy.log'
$Robocopy     = Join-Path $env:SystemRoot 'System32\robocopy.exe'

function Fail([int]$code, [string]$message) {
    Write-Host "FAIL: $message" -ForegroundColor Red
    exit $code
}

# Absolute path with no trailing separator (except a drive root). A trailing backslash
# before a closing quote would escape the quote in robocopy's command line.
function Get-FullPath([string]$path) {
    $full = [IO.Path]::GetFullPath([IO.Path]::Combine((Get-Location).ProviderPath, $path))
    $trimmed = $full.TrimEnd('\', '/')
    if ($trimmed.EndsWith(':')) { return $trimmed + '\' }
    return $trimmed
}

function Test-SamePath([string]$a, [string]$b) {
    return [string]::Equals($a.TrimEnd('\'), $b.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)
}

function Test-PathInside([string]$child, [string]$parent) {
    return $child.StartsWith($parent.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)
}

function Format-Bytes([int64]$bytes) {
    $units = @('bytes', 'KB', 'MB', 'GB', 'TB')
    $value = [double]$bytes
    $i = 0
    while ($value -ge 1024 -and $i -lt $units.Count - 1) { $value /= 1024; $i++ }
    if ($i -eq 0) { return ('{0:N0} bytes' -f $bytes) }
    return ('{0:N1} {1} ({2:N0} bytes)' -f $value, $units[$i], $bytes)
}

function Format-Elapsed([TimeSpan]$span) {
    return ('{0:hh\:mm\:ss\.f} ({1:N1} s)' -f $span, $span.TotalSeconds)
}

function Get-RobocopyExitText([int]$code) {
    if ($code -ge 16) { return 'fatal error, the job did not run' }
    $parts = @()
    if ($code -band 8) { $parts += 'some files or folders could not be copied' }
    if ($code -band 4) { $parts += 'mismatched files or folders' }
    if ($code -band 2) { $parts += 'extra files or folders in the destination (the backup marker counts as one)' }
    if ($code -band 1) { $parts += 'files copied' }
    if ($parts.Count -eq 0) { $parts += 'nothing to copy' }
    return ($parts -join ', ')
}

# Runs robocopy, keeps its output lines, optionally echoes them as they arrive.
function Invoke-Robocopy([string[]]$arguments, [switch]$Echo) {
    $lines = New-Object System.Collections.Generic.List[string]
    & $Robocopy @arguments | ForEach-Object {
        $lines.Add([string]$_)
        if ($Echo) { Write-Host "  $_" }
    }
    return [pscustomobject]@{ ExitCode = [int]$LASTEXITCODE; Lines = $lines }
}

# Reads the Dirs/Files/Bytes rows of robocopy's job summary (needs /BYTES).
function Get-RobocopySummary($lines) {
    $summary = @{}
    foreach ($line in $lines) {
        if ($line -match '^\s*(Dirs|Files|Bytes)\s*:\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$') {
            $summary[$Matches[1]] = [pscustomobject]@{
                Total = [int64]$Matches[2]; Copied = [int64]$Matches[3]; Skipped = [int64]$Matches[4]
                Mismatch = [int64]$Matches[5]; Failed = [int64]$Matches[6]; Extras = [int64]$Matches[7]
            }
        }
    }
    return $summary
}

function Test-BackupMetaFile([string]$relativePath) {
    return ($relativePath -eq $MarkerName -or $relativePath -eq $LogName)
}

# Counts files and bytes actually present in the backup (marker and log excluded).
function Measure-Backup([string]$root) {
    $prefix = $root.TrimEnd('\').Length + 1
    $files = [int64]0
    $bytes = [int64]0
    foreach ($f in ([IO.DirectoryInfo]$root).EnumerateFiles('*', [IO.SearchOption]::AllDirectories)) {
        if (Test-BackupMetaFile $f.FullName.Substring($prefix)) { continue }
        $files++
        $bytes += $f.Length
    }
    return [pscustomobject]@{ Files = $files; Bytes = $bytes }
}

function Get-Sha256([Security.Cryptography.HashAlgorithm]$sha, [string]$path) {
    $stream = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
    try { return [BitConverter]::ToString($sha.ComputeHash($stream)) } finally { $stream.Dispose() }
}

# SHA-256 of every file in the backup against the same relative path in the source.
# Backup files with no source counterpart are extras; the robocopy re-scan reports those.
function Compare-BackupHashes([string]$src, [string]$dst) {
    $prefix = $dst.TrimEnd('\').Length + 1
    $checked = [int64]0
    $bad = New-Object System.Collections.Generic.List[string]
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        foreach ($f in ([IO.DirectoryInfo]$dst).EnumerateFiles('*', [IO.SearchOption]::AllDirectories)) {
            $rel = $f.FullName.Substring($prefix)
            if (Test-BackupMetaFile $rel) { continue }
            $srcFile = [IO.Path]::Combine($src, $rel)
            if (-not [IO.File]::Exists($srcFile)) { continue }
            try {
                if ((Get-Sha256 $sha $srcFile) -ne (Get-Sha256 $sha $f.FullName)) { $bad.Add("content differs: $rel") }
            } catch {
                $bad.Add("unreadable: $rel ($($_.Exception.Message))")
            }
            $checked++
        }
    } finally { $sha.Dispose() }
    return [pscustomobject]@{ Checked = $checked; Bad = $bad }
}

# Read-only git facts for the manifest. --no-optional-locks keeps `git status` from
# taking index.lock while other agents may be committing.
function Get-GitInfo([string]$dir) {
    $ErrorActionPreference = 'Continue'
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { return $null }
    $head = & git -C $dir rev-parse HEAD 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $head) { return $null }
    $branch = & git -C $dir rev-parse --abbrev-ref HEAD 2>$null
    $dirty = @(& git --no-optional-locks -C $dir status --porcelain 2>$null).Count
    return [ordered]@{ head = [string]$head; branch = [string]$branch; uncommittedEntries = $dirty }
}

# Which physical disk a path lives on: 'disk:<n>' for local drives, 'network:<share>'
# for UNC paths, 'drive:<letter>' when the partition cannot be looked up (mapped drives).
function Get-DiskId([string]$path) {
    $root = [IO.Path]::GetPathRoot($path)
    if ($root.StartsWith('\\')) { return "network:$($root.TrimEnd('\'))" }
    $letter = $root.Substring(0, 1)
    try {
        $partition = Get-Partition -DriveLetter $letter -ErrorAction Stop
        return "disk:$($partition.DiskNumber)"
    } catch {
        return "drive:$letter"
    }
}

function Write-Marker($manifest) {
    $json = $manifest | ConvertTo-Json -Depth 6
    [IO.File]::WriteAllText((Join-Path $Destination $MarkerName), $json, (New-Object Text.UTF8Encoding $false))
}

# ---------------------------------------------------------------------------
# Arguments and safety checks
# ---------------------------------------------------------------------------
if ($ListOnly -and $VerifyOnly) { Fail 1 '-ListOnly and -VerifyOnly cannot be combined.' }
if ($VerifyOnly -and $Mirror) { Fail 1 '-VerifyOnly never writes; -Mirror does not apply.' }
if ($ListOnly -and $VerifyHash) { Fail 1 '-ListOnly does not copy anything, so there is nothing to hash.' }

if (-not $Source) { $Source = Split-Path -Parent $PSScriptRoot }
$Source = Get-FullPath $Source
if (-not (Test-Path -LiteralPath $Source -PathType Container)) { Fail 1 "Source folder not found: $Source" }

if (-not $Destination) {
    if ($VerifyOnly) { Fail 1 '-VerifyOnly needs -Destination (the backup folder to check).' }
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $Destination = Join-Path (Join-Path $env:USERPROFILE '.deus_backups') "backup_$stamp"
}
$Destination = Get-FullPath $Destination

if (Test-SamePath $Source $Destination) { Fail 1 "Destination is the source folder: $Destination" }
if (Test-PathInside $Destination $Source) { Fail 1 "Destination is inside the source; the backup would copy itself: $Destination" }
if (Test-PathInside $Source $Destination) { Fail 1 "Source is inside the destination: $Source" }
if (Test-Path -LiteralPath $Destination -PathType Leaf) { Fail 1 "Destination is a file: $Destination" }

$markerPath = Join-Path $Destination $MarkerName
$previous = $null
if (Test-Path -LiteralPath $Destination -PathType Container) {
    if (Test-Path -LiteralPath $markerPath -PathType Leaf) {
        $previous = Get-Content -LiteralPath $markerPath -Raw | ConvertFrom-Json
        if (-not (Test-SamePath ([string]$previous.source) $Source)) {
            Fail 1 "Destination holds a backup of a different folder ($($previous.source)); choose another destination."
        }
    } elseif (@(Get-ChildItem -LiteralPath $Destination -Force | Select-Object -First 1).Count -gt 0) {
        Fail 1 "Destination is not empty and has no $MarkerName marker; refusing to write into a folder this script did not create: $Destination"
    }
}
if ($VerifyOnly -and -not $previous) { Fail 1 "Not a backup made by this script (no $markerPath)." }

$mode = if ($VerifyOnly) { 'verify-only' } elseif ($ListOnly) { 'list-only' } elseif ($Mirror) { 'mirror' } else { 'copy' }
$rcCommon = @($Source, $Destination, '/COPY:DAT', '/DCOPY:DAT', '/XJ', '/R:2', '/W:2', '/BYTES', '/NP', '/NDL')
$rcCommon += '/XD'
$rcCommon += $ExcludeDirs
$rcCommon += '/XF'
$rcCommon += ($ExcludeFiles + @($MarkerName, $LogName))
$rcCopy = $rcCommon + @($(if ($Mirror) { '/MIR' } else { '/E' }), '/MT:16', '/NFL')

Write-Host "DEUS project backup ($mode)"
Write-Host "  Source      : $Source"
Write-Host "  Destination : $Destination"
Write-Host "  Excluding   : folders $($ExcludeDirs -join ', '); files $($ExcludeFiles -join ', ')"
# A copy on the source's own disk does not survive that disk failing (DEC-005).
$sourceDisk = Get-DiskId $Source
$destinationDisk = Get-DiskId $Destination
$offDisk = $sourceDisk -ne $destinationDisk
if ($offDisk) {
    Write-Host "  Target disk : $destinationDisk (source on $sourceDisk): off-disk backup"
} else {
    Write-Host "  Target disk : $destinationDisk, same as the source: local copy, NOT an external backup" -ForegroundColor Yellow
}
$total = [Diagnostics.Stopwatch]::StartNew()

# ---------------------------------------------------------------------------
# List only
# ---------------------------------------------------------------------------
if ($ListOnly) {
    $run = Invoke-Robocopy ($rcCopy + '/L')
    $s = Get-RobocopySummary $run.Lines
    if ($run.ExitCode -ge 8) {
        $run.Lines | Where-Object { $_ -match 'ERROR' } | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }
        Fail 2 "robocopy /L exit $($run.ExitCode): $(Get-RobocopyExitText $run.ExitCode)"
    }
    Write-Host ''
    Write-Host 'List-only summary (nothing written)'
    if ($s.ContainsKey('Files') -and $s.ContainsKey('Bytes')) {
        Write-Host ('  Source files : {0:N0} ({1})' -f $s['Files'].Total, (Format-Bytes $s['Bytes'].Total))
        Write-Host ('  Would copy   : {0:N0} files, {1}' -f $s['Files'].Copied, (Format-Bytes $s['Bytes'].Copied))
        Write-Host ('  Extras       : {0:N0} files in destination not in source (includes backup marker and log)' -f $s['Files'].Extras)
    } else {
        Write-Host '  (could not read robocopy summary)'
    }
    Write-Host "  Robocopy     : exit $($run.ExitCode) ($(Get-RobocopyExitText $run.ExitCode))"
    Write-Host "  Elapsed      : $(Format-Elapsed $total.Elapsed)"
    exit 0
}

# ---------------------------------------------------------------------------
# Copy
# ---------------------------------------------------------------------------
$manifest = $null
$copyExit = $null
$copySummary = @{}
$copyElapsed = $null
if (-not $VerifyOnly) {
    if (Test-Path -LiteralPath (Join-Path $Source '.git\index.lock')) {
        Write-Warning 'The source has .git\index.lock: a git command is running or crashed. The .git copy may be inconsistent.'
    }
    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    # Marker first, so an interrupted run still leaves a folder this script may resume into.
    $manifest = [ordered]@{
        tool = 'tools/backup_project.ps1'
        manifestVersion = 1
        status = 'in-progress'
        mode = $mode
        startedLocal = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')
        source = $Source
        destination = $Destination
        sourceDisk = $sourceDisk
        destinationDisk = $destinationDisk
        offDisk = $offDisk
        git = Get-GitInfo $Source
        excludeDirs = $ExcludeDirs
        excludeFiles = $ExcludeFiles
    }
    Write-Marker $manifest

    Write-Host ''
    Write-Host "robocopy ($(if ($Mirror) { '/MIR' } else { '/E' })):"
    $copyTimer = [Diagnostics.Stopwatch]::StartNew()
    $run = Invoke-Robocopy $rcCopy -Echo
    $copyTimer.Stop()
    $copyElapsed = $copyTimer.Elapsed
    $copyExit = $run.ExitCode
    $copySummary = Get-RobocopySummary $run.Lines
    [IO.File]::WriteAllLines((Join-Path $Destination $LogName), $run.Lines)

    $manifest.robocopyExitCode = $copyExit
    $manifest.copyElapsedSeconds = [math]::Round($copyElapsed.TotalSeconds, 1)
    if ($copyExit -ge 8) {
        $manifest.status = 'copy-failed'
        Write-Marker $manifest
        Fail 2 "robocopy exit $copyExit ($(Get-RobocopyExitText $copyExit)). Details: $(Join-Path $Destination $LogName)"
    }
}

# ---------------------------------------------------------------------------
# Verify: list-only re-scan (presence, size, timestamp), then optional hashes
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host 'Verifying (robocopy /L re-scan)...'
$verify = Invoke-Robocopy ($rcCommon + @('/E', '/L', '/NJH', '/NJS'))
$listed = @($verify.Lines | Where-Object { $_.Trim() -ne '' })
$extraLines = @($listed | Where-Object { $_ -match '\*EXTRA' })
$diffLines = @($listed | Where-Object { $_ -notmatch '\*EXTRA' })
$rescanOk = ($verify.ExitCode -lt 8) -and (($verify.ExitCode -band 1) -eq 0) -and (($verify.ExitCode -band 4) -eq 0)
if ($verify.ExitCode -ge 8) {
    Write-Host "  robocopy /L exit $($verify.ExitCode) ($(Get-RobocopyExitText $verify.ExitCode))" -ForegroundColor Red
}
if ($diffLines.Count -gt 0) {
    Write-Host ('  {0:N0} source files missing or different in the backup:' -f $diffLines.Count) -ForegroundColor Red
    $diffLines | Select-Object -First 20 | ForEach-Object { Write-Host "    $($_.Trim())" }
    if ($diffLines.Count -gt 20) { Write-Host '    ...' }
    Write-Host '  If the source was being edited during the copy, run again into the same destination with -Mirror.'
}
if ($extraLines.Count -gt 0) {
    Write-Host ('  WARN: {0:N0} files in the backup no longer exist in the source (use -Mirror to remove them).' -f $extraLines.Count) -ForegroundColor Yellow
}

$hash = $null
if ($VerifyHash) {
    Write-Host 'Verifying (SHA-256 of every file)...'
    $hash = Compare-BackupHashes $Source $Destination
    if ($hash.Bad.Count -gt 0) {
        Write-Host ('  {0:N0} files failed the hash check:' -f $hash.Bad.Count) -ForegroundColor Red
        $hash.Bad | Select-Object -First 20 | ForEach-Object { Write-Host "    $_" }
        if ($hash.Bad.Count -gt 20) { Write-Host '    ...' }
        Write-Host '  robocopy skips files whose size and timestamp match, so -Mirror will not repair these; back up to a new destination.'
    }
}
$hashOk = (-not $hash) -or ($hash.Bad.Count -eq 0)
$verified = $rescanOk -and $hashOk

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
$census = Measure-Backup $Destination
$total.Stop()

Write-Host ''
Write-Host 'Backup summary'
Write-Host "  Source      : $Source"
Write-Host "  Destination : $Destination"
Write-Host "  Off-disk    : $(if ($offDisk) { "yes ($destinationDisk)" } else { "no, same disk as source ($destinationDisk)" })"
if ($null -ne $copyExit) {
    Write-Host "  Robocopy    : exit $copyExit ($(Get-RobocopyExitText $copyExit))"
    if ($copySummary.ContainsKey('Files') -and $copySummary.ContainsKey('Bytes')) {
        $f = $copySummary['Files']
        $b = $copySummary['Bytes']
        Write-Host ('  This run    : {0:N0} files copied ({1}), {2:N0} skipped (unchanged or excluded), {3:N0} failed' -f $f.Copied, (Format-Bytes $b.Copied), $f.Skipped, $f.Failed)
    }
    Write-Host "  Copy time   : $(Format-Elapsed $copyElapsed)"
}
Write-Host ('  In backup   : {0:N0} files, {1}' -f $census.Files, (Format-Bytes $census.Bytes))
Write-Host ('  Re-scan     : {0} ({1:N0} missing/different, {2:N0} extra)' -f $(if ($rescanOk) { 'PASS' } else { 'FAIL' }), $diffLines.Count, $extraLines.Count)
if ($hash) {
    Write-Host ('  SHA-256     : {0} ({1:N0} files compared, {2:N0} bad)' -f $(if ($hashOk) { 'PASS' } else { 'FAIL' }), $hash.Checked, $hash.Bad.Count)
} else {
    Write-Host '  SHA-256     : not run (add -VerifyHash)'
}
Write-Host "  Elapsed     : $(Format-Elapsed $total.Elapsed)"

if ($manifest) {
    $manifest.status = $(if ($verified) { 'ok' } else { 'verify-failed' })
    $manifest.finishedLocal = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')
    $manifest.files = $census.Files
    $manifest.bytes = $census.Bytes
    $manifest.elapsedSeconds = [math]::Round($total.Elapsed.TotalSeconds, 1)
    $manifest.verify = [ordered]@{
        rescan = $(if ($rescanOk) { 'PASS' } else { 'FAIL' })
        missingOrDifferent = $diffLines.Count
        extras = $extraLines.Count
        sha256 = $(if (-not $hash) { 'not run' } elseif ($hashOk) { 'PASS' } else { 'FAIL' })
        sha256Files = $(if ($hash) { $hash.Checked } else { 0 })
    }
    Write-Marker $manifest
}

if (-not $verified) { Fail 3 'The backup does not match the source (details above).' }
Write-Host 'OK: backup verified.' -ForegroundColor Green
exit 0
