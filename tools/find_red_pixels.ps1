Add-Type -AssemblyName System.Drawing

$bmp = [System.Drawing.Bitmap]::FromFile('art\review\combat_attack_lunge.png')
$minX = 9999; $maxX = 0; $minY = 9999; $maxY = 0; $count = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -gt 210 -and $c.G -lt 50 -and $c.B -lt 50) {
            $count++
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}
$bmp.Dispose()
Write-Host "Count: $count, minX: $minX, maxX: $maxX, minY: $minY, maxY: $maxY"
