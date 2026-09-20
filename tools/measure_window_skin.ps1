Add-Type -AssemblyName System.Drawing
$jpg = "C:\Users\snewt\.gemini\antigravity\brain\74107bfb-a5b5-43a6-8ab7-87deb97997e1\deus_window_skin_1789930189643.jpg"
$bmp = [Drawing.Bitmap]::FromFile($jpg)

# Let's check color samples to find magenta background
function IsMagenta($c) {
    return ($c.R -gt 200 -and $c.B -gt 200 -and $c.G -lt 60)
}

# Find bounds of the top-right frame
$fMinX = 1024; $fMaxX = 0; $fMinY = 1024; $fMaxY = 0
for ($y = 0; $y -lt 650; $y++) {
    for ($x = 350; $x -lt 1024; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (-not (IsMagenta $c)) {
            if ($x -lt $fMinX) { $fMinX = $x }
            if ($x -gt $fMaxX) { $fMaxX = $x }
            if ($y -lt $fMinY) { $fMinY = $y }
            if ($y -gt $fMaxY) { $fMaxY = $y }
        }
    }
}
Write-Host "Frame outer bounds: ($fMinX, $fMinY) to ($fMaxX, $fMaxY) size: $($fMaxX-$fMinX+1)x$($fMaxY-$fMinY+1)"

# Find inner cutout of frame
$cutMinX = 1024; $cutMaxX = 0; $cutMinY = 1024; $cutMaxY = 0
for ($y = 50; $y -lt 550; $y++) {
    for ($x = 450; $x -lt 950; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (IsMagenta $c) {
            if ($x -lt $cutMinX) { $cutMinX = $x }
            if ($x -gt $cutMaxX) { $cutMaxX = $x }
            if ($y -lt $cutMinY) { $cutMinY = $y }
            if ($y -gt $cutMaxY) { $cutMaxY = $y }
        }
    }
}
Write-Host "Frame inner cutout: ($cutMinX, $cutMinY) to ($cutMaxX, $cutMinY) size: $($cutMaxX-$cutMinX+1)x$($cutMaxY-$cutMinY+1)"

# Find cursor box bounds
$cMinX = 1024; $cMaxX = 0; $cMinY = 1024; $cMaxY = 0
for ($y = 600; $y -lt 900; $y++) {
    for ($x = 500; $x -lt 780; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (-not (IsMagenta $c)) {
            if ($x -lt $cMinX) { $cMinX = $x }
            if ($x -gt $cMaxX) { $cMaxX = $x }
            if ($y -lt $cMinY) { $cMinY = $y }
            if ($y -gt $cMaxY) { $cMaxY = $y }
        }
    }
}
Write-Host "Cursor box bounds: ($cMinX, $cMinY) to ($cMaxX, $cMaxY) size: $($cMaxX-$cMinX+1)x$($cMaxY-$cMinY+1)"

# Find arrows bounds
$aMinX = 1024; $aMaxX = 0; $aMinY = 1024; $aMaxY = 0
for ($y = 600; $y -lt 850; $y++) {
    for ($x = 750; $x -lt 1024; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (-not (IsMagenta $c)) {
            if ($x -lt $aMinX) { $aMinX = $x }
            if ($x -gt $aMaxX) { $aMaxX = $x }
            if ($y -lt $aMinY) { $aMinY = $y }
            if ($y -gt $aMaxY) { $aMaxY = $y }
        }
    }
}
Write-Host "Arrows bounds: ($aMinX, $aMinY) to ($aMaxX, $aMaxY) size: $($aMaxX-$aMinX+1)x$($aMaxY-$aMinY+1)"

# Check top-left background
$bgMinX = 1024; $bgMaxX = 0; $bgMinY = 1024; $bgMaxY = 0
for ($y = 0; $y -lt 400; $y++) {
    for ($x = 0; $x -lt 400; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if (-not (IsMagenta $c)) {
            if ($x -lt $bgMinX) { $bgMinX = $x }
            if ($x -gt $bgMaxX) { $bgMaxX = $x }
            if ($y -lt $bgMinY) { $bgMinY = $y }
            if ($y -gt $bgMaxY) { $bgMaxY = $y }
        }
    }
}
Write-Host "BG stone bounds: ($bgMinX, $bgMinY) to ($bgMaxX, $bgMaxY) size: $($bgMaxX-$bgMinX+1)x$($bgMaxY-$bgMinY+1)"

$bmp.Dispose()

