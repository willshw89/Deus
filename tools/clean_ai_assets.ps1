Add-Type -AssemblyName System.Drawing

$brainDir = "C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd"
$revDir = "c:\Users\snewt\OneDrive\Desktop\UF\art\review"

# Load U7 palette
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

function FindNearestPaletteColor($c) {
    $minDist = 99999999
    $best = $palette[0]
    foreach ($p in $palette) {
        $dr = $c.R - $p.R
        $dg = $c.G - $p.G
        $db = $c.B - $p.B
        $dist = $dr*$dr + $dg*$dg + $db*$db
        if ($dist -lt $minDist) {
            $minDist = $dist
            $best = $p
        }
    }
    return $best
}

function ProcessAsset($srcPath, $outName, $targetW, $targetH) {
    $src = [Drawing.Bitmap]::FromFile($srcPath)
    
    # 1. Find bounding box of non-magenta pixels
    $minX = $src.Width; $maxX = 0; $minY = $src.Height; $maxY = 0
    for ($y = 0; $y -lt $src.Height; $y++) {
        for ($x = 0; $x -lt $src.Width; $x++) {
            $px = $src.GetPixel($x, $y)
            # Magenta detection: high R, low G, high B
            $isMagenta = ($px.R -gt 170 -and $px.G -lt 80 -and $px.B -gt 170)
            if (-not $isMagenta) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    
    $bw = $maxX - $minX + 1
    $bh = $maxY - $minY + 1
    Write-Host "$outName bbox: ($minX, $minY) to ($maxX, $maxY), size: ${bw}x${bh}"
    
    # 2. Scale into target canvas with aspect ratio preserved
    $canvas = New-Object Drawing.Bitmap($targetW, $targetH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [Drawing.Graphics]::FromImage($canvas)
    $g.Clear([Drawing.Color]::FromArgb(0, 0, 0, 0))
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
    
    $scale = [Math]::Min(($targetW - 4) / $bw, ($targetH - 4) / $bh)
    $dw = [Math]::Max(1, [int]($bw * $scale))
    $dh = [Math]::Max(1, [int]($bh * $scale))
    $dx = [int](($targetW - $dw) / 2)
    $dy = $targetH - $dh - 2 # Anchor near bottom
    
    # Draw cropped image
    $srcRect = New-Object Drawing.Rectangle($minX, $minY, $bw, $bh)
    $dstRect = New-Object Drawing.Rectangle($dx, $dy, $dw, $dh)
    
    # Create temporary cropped bitmap without magenta
    $cropped = New-Object Drawing.Bitmap($bw, $bh, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    for ($y = 0; $y -lt $bh; $y++) {
        for ($x = 0; $x -lt $bw; $x++) {
            $px = $src.GetPixel($minX + $x, $minY + $y)
            $isMagenta = ($px.R -gt 170 -and $px.G -lt 80 -and $px.B -gt 170)
            if ($isMagenta) {
                $cropped.SetPixel($x, $y, [Drawing.Color]::FromArgb(0, 0, 0, 0))
            } else {
                $palColor = FindNearestPaletteColor($px)
                $cropped.SetPixel($x, $y, $palColor)
            }
        }
    }
    
    $g.DrawImage($cropped, $dstRect, 0, 0, $bw, $bh, [Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $cropped.Dispose()
    $src.Dispose()
    
    # Save 1x
    $out1x = "$revDir\ai_${outName}_1x.png"
    $canvas.Save($out1x, [Drawing.Imaging.ImageFormat]::Png)
    
    # Save 3x
    $canvas3x = New-Object Drawing.Bitmap($($targetW * 3), $($targetH * 3), [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g3 = [Drawing.Graphics]::FromImage($canvas3x)
    $g3.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g3.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
    $g3.DrawImage($canvas, 0, 0, $($targetW * 3), $($targetH * 3))
    $g3.Dispose()
    $out3x = "$revDir\ai_${outName}_3x.png"
    $canvas3x.Save($out3x, [Drawing.Imaging.ImageFormat]::Png)
    
    # Save 8x
    $canvas8x = New-Object Drawing.Bitmap($($targetW * 8), $($targetH * 8), [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g8 = [Drawing.Graphics]::FromImage($canvas8x)
    $g8.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g8.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::Half
    $g8.DrawImage($canvas, 0, 0, $($targetW * 8), $($targetH * 8))
    $g8.Dispose()
    $out8x = "$revDir\ai_${outName}_8x.png"
    $canvas8x.Save($out8x, [Drawing.Imaging.ImageFormat]::Png)
    
    $canvas.Dispose()
    $canvas3x.Dispose()
    $canvas8x.Dispose()
    Write-Host "Processed $outName -> $out1x, $out3x, $out8x"
}

# Find latest generated files
$settlerImg = (Get-ChildItem "$brainDir\ff6_settler_male_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$oakImg = (Get-ChildItem "$brainDir\ff6_oak_tree_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$campImg = (Get-ChildItem "$brainDir\ff6_campfire_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$bushImg = (Get-ChildItem "$brainDir\ff6_berry_bush_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
$bedImg = (Get-ChildItem "$brainDir\ff6_straw_bed_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

Write-Host "Settler: $settlerImg"
Write-Host "Oak: $oakImg"
Write-Host "Campfire: $campImg"
Write-Host "BerryBush: $bushImg"
Write-Host "StrawBed: $bedImg"

ProcessAsset $settlerImg "settler" 48 72
ProcessAsset $oakImg "oak" 48 48
ProcessAsset $campImg "campfire" 48 48
ProcessAsset $bushImg "berry_bush" 48 48
ProcessAsset $bedImg "straw_bed" 48 48

# Build combined showcase
$showW = 860; $showH = 480
$showcase = New-Object Drawing.Bitmap($showW, $showH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sg = [Drawing.Graphics]::FromImage($showcase)
$sg.Clear([Drawing.Color]::FromArgb(255, 24, 28, 36))

# Checkerboard blit
function BlitChecker($img3xPath, $dstX, $dstY) {
    $img = [Drawing.Bitmap]::FromFile($img3xPath)
    for ($y = 0; $y -lt $img.Height; $y++) {
        for ($x = 0; $x -lt $img.Width; $x++) {
            $px = $img.GetPixel($x, $y)
            $cx = $dstX + $x; $cy = $dstY + $y
            $chk = (([Math]::Floor($cx / 8) + [Math]::Floor($cy / 8)) % 2 -eq 0)
            if ($px.A -eq 0) {
                $bgC = if ($chk) { [Drawing.Color]::FromArgb(255, 42, 46, 54) } else { [Drawing.Color]::FromArgb(255, 32, 36, 44) }
                $showcase.SetPixel($cx, $cy, $bgC)
            } else {
                $showcase.SetPixel($cx, $cy, $px)
            }
        }
    }
    $img.Dispose()
}

BlitChecker "$revDir\ai_oak_3x.png" 30 40
BlitChecker "$revDir\ai_campfire_3x.png" 200 40
BlitChecker "$revDir\ai_berry_bush_3x.png" 370 40
BlitChecker "$revDir\ai_straw_bed_3x.png" 540 40
BlitChecker "$revDir\ai_settler_3x.png" 710 40

# Add 8x zoom previews in row 2
BlitChecker "$revDir\ai_settler_8x.png" 30 220
BlitChecker "$revDir\ai_campfire_8x.png" 430 220

$sg.Dispose()
$showcase.Save("$revDir\ai_ff6_showcase.png", [Drawing.Imaging.ImageFormat]::Png)
$showcase.Dispose()
Write-Host "Created $revDir\ai_ff6_showcase.png successfully!"
