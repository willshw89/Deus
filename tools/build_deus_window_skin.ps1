Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\snewt\.gemini\antigravity\brain\74107bfb-a5b5-43a6-8ab7-87deb97997e1"
$sysDir   = "c:\Users\snewt\OneDrive\Desktop\UF\game\img\system"
$masterDir = "c:\Users\snewt\OneDrive\Desktop\UF\art\masters"

# Load U7 palette from uf.hex
$hexLines = Get-Content "c:\Users\snewt\OneDrive\Desktop\UF\art\palette\uf.hex"
$palette = @()
foreach ($h in $hexLines) {
    $clean = $h.Trim().TrimStart('#')
    if ($clean.Length -eq 6) {
        $r = [Convert]::ToInt32($clean.Substring(0,2), 16)
        $g = [Convert]::ToInt32($clean.Substring(2,2), 16)
        $b = [Convert]::ToInt32($clean.Substring(4,2), 16)
        $palette += @([Drawing.Color]::FromArgb(255, $r, $g, $b))
    }
}
Write-Host "Loaded $($palette.Length) colors from uf.hex"

function FindNearestPaletteColor($c) {
    $minDist = [double]::MaxValue
    $best = $palette[0]
    foreach ($p in $palette) {
        $dr = [double]($c.R - $p.R)
        $dg = [double]($c.G - $p.G)
        $db = [double]($c.B - $p.B)
        $dist = 2.0 * $dr * $dr + 4.0 * $dg * $dg + 3.0 * $db * $db
        if ($dist -lt $minDist) {
            $minDist = $dist
            $best = $p
        }
    }
    return $best
}

function IsMagentaColor($c) {
    if ($c.R -gt 130 -and $c.B -gt 130 -and $c.G -lt 115) { return $true }
    if ($c.R -gt 150 -and $c.B -gt 140 -and ($c.R - $c.G) -gt 35) { return $true }
    if ($c.R -gt 180 -and $c.G -lt 90) { return $true }
    return $false
}

$rawJpg = "$brainDir\deus_window_skin_1789930189643.jpg"
Write-Host "Processing DEUS Windowskin from: $rawJpg"
$src = [Drawing.Bitmap]::FromFile($rawJpg)

$targetW = 192
$targetH = 192
$canvas = New-Object Drawing.Bitmap($targetW, $targetH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)

function ExtractAndResize($srcBmp, $srcRect, $destW, $destH) {
    $dest = New-Object Drawing.Bitmap($destW, $destH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $dstRect = New-Object Drawing.Rectangle(0, 0, $destW, $destH)
    $g.DrawImage($srcBmp, $dstRect, $srcRect, [Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    return $dest
}

# 1. Background tile (0, 0, 64, 64) from top-left stone
$bgSrcRect = New-Object Drawing.Rectangle(0, 0, 380, 380)
$bgTile = ExtractAndResize $src $bgSrcRect 64 64
for ($y = 0; $y -lt 64; $y++) {
    for ($x = 0; $x -lt 64; $x++) {
        $c = $bgTile.GetPixel($x, $y)
        if (-not (IsMagentaColor $c)) {
            $snap = FindNearestPaletteColor $c
            $colorWithAlpha = [Drawing.Color]::FromArgb(192, $snap.R, $snap.G, $snap.B)
            $canvas.SetPixel($x, $y, $colorWithAlpha)
            $gradAlpha = [Drawing.Color]::FromArgb(160, [int]($snap.R * 0.85), [int]($snap.G * 0.85), [int]($snap.B * 0.85))
            $canvas.SetPixel($x, $y + 64, $gradAlpha)
        }
    }
}
$bgTile.Dispose()

# 2. Window Frame (96, 0, 96, 96) from the marble & lightning frame
$frameSrcRect = New-Object Drawing.Rectangle(384, 0, 636, 636)
$frameBmp = ExtractAndResize $src $frameSrcRect 96 96
for ($y = 0; $y -lt 96; $y++) {
    for ($x = 0; $x -lt 96; $x++) {
        # Cutout area: x in 22..73, y in 22..73
        if ($x -ge 22 -and $x -le 73 -and $y -ge 22 -and $y -le 73) {
            continue
        }
        $c = $frameBmp.GetPixel($x, $y)
        if (-not (IsMagentaColor $c)) {
            $snap = FindNearestPaletteColor $c
            $canvas.SetPixel($x + 96, $y, $snap)
        }
    }
}
$frameBmp.Dispose()

# 3. Cursor selection box (96, 96, 48, 48)
$curSrcRect = New-Object Drawing.Rectangle(512, 608, 252, 252)
$curBmp = ExtractAndResize $src $curSrcRect 48 48
for ($y = 0; $y -lt 48; $y++) {
    for ($x = 0; $x -lt 48; $x++) {
        if ($x -ge 11 -and $x -le 36 -and $y -ge 11 -and $y -le 36) {
            continue
        }
        $c = $curBmp.GetPixel($x, $y)
        if (-not (IsMagentaColor $c)) {
            $snap = FindNearestPaletteColor $c
            $canvas.SetPixel($x + 96, $y + 96, $snap)
        }
    }
}
$curBmp.Dispose()

# 4. Scroll arrows (144, 96, 48, 48)
$arrSrcRect = New-Object Drawing.Rectangle(768, 608, 252, 252)
$arrBmp = ExtractAndResize $src $arrSrcRect 48 48
for ($y = 0; $y -lt 48; $y++) {
    for ($x = 0; $x -lt 48; $x++) {
        $c = $arrBmp.GetPixel($x, $y)
        if (-not (IsMagentaColor $c)) {
            $snap = FindNearestPaletteColor $c
            $canvas.SetPixel($x + 144, $y + 96, $snap)
        }
    }
}
$arrBmp.Dispose()

# 5. Pause sign / UI icons (96, 144, 96, 48)
$iconSrcRect = New-Object Drawing.Rectangle(0, 750, 512, 256)
$iconBmp = ExtractAndResize $src $iconSrcRect 96 48
for ($y = 0; $y -lt 48; $y++) {
    for ($x = 0; $x -lt 96; $x++) {
        $c = $iconBmp.GetPixel($x, $y)
        if (-not (IsMagentaColor $c)) {
            $snap = FindNearestPaletteColor $c
            $canvas.SetPixel($x + 96, $y + 144, $snap)
        }
    }
}
$iconBmp.Dispose()

$src.Dispose()

# Save outputs
$canvas.Save("$sysDir\Window_default.png", [Drawing.Imaging.ImageFormat]::Png)
$canvas.Save("$sysDir\Window_deus.png", [Drawing.Imaging.ImageFormat]::Png)
$canvas.Save("$sysDir\Window.png", [Drawing.Imaging.ImageFormat]::Png)
$canvas.Save("$masterDir\Window_default.png", [Drawing.Imaging.ImageFormat]::Png)
$canvas.Save("$masterDir\Window_deus.png", [Drawing.Imaging.ImageFormat]::Png)

$canvas.Dispose()
Write-Host "Saved refined DEUS Windowskin (192x192)"

