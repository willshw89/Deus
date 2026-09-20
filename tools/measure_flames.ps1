Add-Type -AssemblyName System.Drawing
$img = [Drawing.Bitmap]::FromFile('C:\Users\snewt\.gemini\antigravity\brain\74107bfb-a5b5-43a6-8ab7-87deb97997e1\blue_flame_pointer_1789929332428.jpg')
Write-Host "Image size: $($img.Width)x$($img.Height)"

$secW = [int]($img.Width / 4)
for ($i = 0; $i -lt 4; $i++) {
    $x0 = $i * $secW
    $x1 = ($i + 1) * $secW - 1
    $minX = $x1; $maxX = $x0; $minY = $img.Height; $maxY = 0
    for ($y = 0; $y -lt $img.Height; $y++) {
        for ($x = $x0; $x -le $x1; $x++) {
            $px = $img.GetPixel($x, $y)
            if ($px.R -gt 30 -or $px.G -gt 30 -or $px.B -gt 30) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $w = $maxX - $minX + 1
    $h = $maxY - $minY + 1
    Write-Host "Flame $i : minX=$minX maxX=$maxX minY=$minY maxY=$maxY (${w}x${h})"
}
$img.Dispose()

