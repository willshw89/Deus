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
        # Perceptually weighted Euclidean distance
        $dist = 2.0 * $dr * $dr + 4.0 * $dg * $dg + 3.0 * $db * $db
        if ($dist -lt $minDist) {
            $minDist = $dist
            $best = $p
        }
    }
    return $best
}

# 1. Process Diagonal Mouse Cursor (Tip at 4, 4)
$mouseJpg = "$brainDir\deus_divine_lightning_cursor_1789928475392.jpg"
Write-Host "Processing Mouse Cursor: $mouseJpg"
$src = [Drawing.Bitmap]::FromFile($mouseJpg)

$minX = $src.Width; $maxX = 0; $minY = $src.Height; $maxY = 0
for ($y = 0; $y -lt $src.Height; $y++) {
    for ($x = 0; $x -lt $src.Width; $x++) {
        $px = $src.GetPixel($x, $y)
        if ($px.R -gt 38 -or $px.G -gt 38 -or $px.B -gt 38) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$bw = $maxX - $minX + 1
$bh = $maxY - $minY + 1
Write-Host "Mouse BBox: ($minX, $minY) ${bw}x${bh}"

# Target size 38x38 inside 48x48
$targetSize = 38
$canvas = New-Object Drawing.Bitmap(48, 48, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$scaledBmp = New-Object Drawing.Bitmap($targetSize, $targetSize, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [Drawing.Graphics]::FromImage($scaledBmp)
$g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcRect = New-Object Drawing.Rectangle($minX, $minY, $bw, $bh)
$dstRect = New-Object Drawing.Rectangle(0, 0, $targetSize, $targetSize)
$g.DrawImage($src, $dstRect, $srcRect, [Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# Key out black & snap to uf.hex
for ($y = 0; $y -lt $targetSize; $y++) {
    for ($x = 0; $x -lt $targetSize; $x++) {
        $px = $scaledBmp.GetPixel($x, $y)
        if ($px.R -gt 35 -or $px.G -gt 35 -or $px.B -gt 35) {
            $snap = FindNearestPaletteColor($px)
            # Position at offset (3, 3) so tip is at (4, 4)
            $canvas.SetPixel($x + 3, $y + 3, $snap)
        }
    }
}
$src.Dispose()
$scaledBmp.Dispose()

$canvas.Save("$sysDir\Cursor_deus.png", [Drawing.Imaging.ImageFormat]::Png)
$canvas.Save("$sysDir\Cursor_default.png", [Drawing.Imaging.ImageFormat]::Png)
$canvas.Save("$masterDir\Cursor_deus.png", [Drawing.Imaging.ImageFormat]::Png)
$canvas.Dispose()
Write-Host "Saved Cursor_deus.png & Cursor_default.png (48x48)"


# 2. Process Horizontal Menu Selector Pointer (Points Right)
$pointerJpg = "$brainDir\deus_divine_lightning_pointer_1789928490264.jpg"
Write-Host "Processing Menu Pointer: $pointerJpg"
$srcP = [Drawing.Bitmap]::FromFile($pointerJpg)

$minX = $srcP.Width; $maxX = 0; $minY = $srcP.Height; $maxY = 0
for ($y = 0; $y -lt $srcP.Height; $y++) {
    for ($x = 0; $x -lt $srcP.Width; $x++) {
        $px = $srcP.GetPixel($x, $y)
        if ($px.R -gt 38 -or $px.G -gt 38 -or $px.B -gt 38) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$bwP = $maxX - $minX + 1
$bhP = $maxY - $minY + 1
Write-Host "Pointer BBox: ($minX, $minY) ${bwP}x${bhP}"

# Target size 34x20 inside 48x48
$targetW = 34
$targetH = 20
$canvasP = New-Object Drawing.Bitmap(48, 48, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$scaledBmpP = New-Object Drawing.Bitmap($targetW, $targetH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gP = [Drawing.Graphics]::FromImage($scaledBmpP)
$gP.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gP.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
$gP.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcRectP = New-Object Drawing.Rectangle($minX, $minY, $bwP, $bhP)
$dstRectP = New-Object Drawing.Rectangle(0, 0, $targetW, $targetH)
$gP.DrawImage($srcP, $dstRectP, $srcRectP, [Drawing.GraphicsUnit]::Pixel)
$gP.Dispose()

$offsetX = 7
$offsetY = 14
for ($y = 0; $y -lt $targetH; $y++) {
    for ($x = 0; $x -lt $targetW; $x++) {
        $px = $scaledBmpP.GetPixel($x, $y)
        if ($px.R -gt 35 -or $px.G -gt 35 -or $px.B -gt 35) {
            $snap = FindNearestPaletteColor($px)
            $canvasP.SetPixel($x + $offsetX, $y + $offsetY, $snap)
        }
    }
}
$srcP.Dispose()
$scaledBmpP.Dispose()

$canvasP.Save("$sysDir\Cursor_deus_pointer.png", [Drawing.Imaging.ImageFormat]::Png)
$canvasP.Save("$masterDir\Cursor_deus_pointer.png", [Drawing.Imaging.ImageFormat]::Png)
$canvasP.Dispose()
Write-Host "Saved Cursor_deus_pointer.png (48x48)"

