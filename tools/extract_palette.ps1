# Extract 256 colors from U7 PALETTES.FLX daylight palette (record 0)
$ErrorActionPreference = "Stop"

$palPath = "C:\Program Files\GOG Galaxy\Games\Ultima 7\STATIC\PALETTES.FLX"
if (-not (Test-Path $palPath)) {
    throw "PALETTES.FLX not found at $palPath"
}

$palBytes = [System.IO.File]::ReadAllBytes($palPath)
New-Item -ItemType Directory -Force -Path "art\palette" | Out-Null

$lines = [System.Collections.Generic.List[string]]::new()
for ($i = 0; $i -lt 256; $i++) {
    # Scale 6-bit VGA DAC (0..63) to 8-bit RGB (0..255)
    $r = [Math]::Min(255, [int][Math]::Round([int]$palBytes[256 + $i * 3] * 255.0 / 63.0))
    $g = [Math]::Min(255, [int][Math]::Round([int]$palBytes[256 + $i * 3 + 1] * 255.0 / 63.0))
    $b = [Math]::Min(255, [int][Math]::Round([int]$palBytes[256 + $i * 3 + 2] * 255.0 / 63.0))
    $hex = "#{0:X2}{1:X2}{2:X2}" -f $r, $g, $b
    $lines.Add($hex)
}

[System.IO.File]::WriteAllLines("art\palette\uf.hex", $lines)
Write-Host "Successfully wrote art\palette\uf.hex with $($lines.Count) scaled 8-bit colors."
