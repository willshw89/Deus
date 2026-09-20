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

$flameJpg = "$brainDir\blue_flame_pointer_1789929332428.jpg"
Write-Host "Processing Blue Flame Frames from: $flameJpg"
$src = [Drawing.Bitmap]::FromFile($flameJpg)

# Centers and dimensions
$centers = @(133, 384, 645, 896)
$baseY = 594
# Max height is 320, width window is 200
$srcCropH = 330
$srcCropW = 200

# Target frame size: 24 wide x 26 high
$frameW = 24
$frameH = 26
$totalW = $frameW * 4

$sheet = New-Object Drawing.Bitmap($totalW, $frameH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)

for ($i = 0; $i -lt 4; $i++) {
    $cx = $centers[$i]
    $cropX0 = $cx - [int]($srcCropW / 2)
    $cropY0 = $baseY - $srcCropH + 1

    $tempBmp = New-Object Drawing.Bitmap($frameW, $frameH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [Drawing.Graphics]::FromImage($tempBmp)
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $srcRect = New-Object Drawing.Rectangle([int]$cropX0, [int]$cropY0, [int]$srcCropW, [int]$srcCropH)
    # Target rect anchored at bottom with 1px baseline padding
    $dstH = [int]$frameH - 1
    $dstRect = New-Object Drawing.Rectangle(0, 1, [int]$frameW, $dstH)
    $g.DrawImage($src, $dstRect, $srcRect, [Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    for ($y = 0; $y -lt $frameH; $y++) {
        for ($x = 0; $x -lt $frameW; $x++) {
            $px = $tempBmp.GetPixel($x, $y)
            # Threshold to eliminate background black
            if ($px.R -gt 28 -or $px.G -gt 28 -or $px.B -gt 28) {
                $snap = FindNearestPaletteColor($px)
                $sheet.SetPixel($i * $frameW + $x, $y, $snap)
            }
        }
    }
    $tempBmp.Dispose()
}
$src.Dispose()

$sheet.Save("$sysDir\Cursor_blue_flame.png", [Drawing.Imaging.ImageFormat]::Png)
$sheet.Save("$masterDir\Cursor_blue_flame.png", [Drawing.Imaging.ImageFormat]::Png)
$sheet.Dispose()
Write-Host "Saved Cursor_blue_flame.png ($totalW x $frameH) with 4 animation frames"
