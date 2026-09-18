Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "SilentlyContinue"

$U7StaticPath = "C:\Program Files\GOG Galaxy\Games\Ultima 7\STATIC"
$palBytes = [System.IO.File]::ReadAllBytes("$U7StaticPath\PALETTES.FLX")
$palette = @()
for ($i = 0; $i -lt 256; $i++) {
    $r = [Math]::Min(255, [int][Math]::Round([int]$palBytes[256 + $i * 3] * 255 / 63.0))
    $g = [Math]::Min(255, [int][Math]::Round([int]$palBytes[256 + $i * 3 + 1] * 255 / 63.0))
    $b = [Math]::Min(255, [int][Math]::Round([int]$palBytes[256 + $i * 3 + 2] * 255 / 63.0))
    $palette += [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
}

function DecodeFrame($fileBytes, $shapeOffset, $frameOffset) {
    $ptr = $shapeOffset + $frameOffset
    $xright = [System.BitConverter]::ToInt16($fileBytes, $ptr)
    $xleft = [System.BitConverter]::ToInt16($fileBytes, $ptr + 2)
    $yabove = [System.BitConverter]::ToInt16($fileBytes, $ptr + 4)
    $ybelow = [System.BitConverter]::ToInt16($fileBytes, $ptr + 6)
    $width = [Math]::Max(1, $xleft + $xright + 1)
    $height = [Math]::Max(1, $yabove + $ybelow + 1)
    if ($width -gt 500 -or $height -gt 500) { return $null }

    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $curr = $ptr + 8
    while ($curr -lt $fileBytes.Length - 1) {
        $scanlen = [System.BitConverter]::ToUInt16($fileBytes, $curr); $curr += 2
        if ($scanlen -eq 0) { break }
        $encoded = $scanlen -band 1
        $len = $scanlen -shr 1
        $scanx = [System.BitConverter]::ToInt16($fileBytes, $curr); $curr += 2
        $scany = [System.BitConverter]::ToInt16($fileBytes, $curr); $curr += 2
        $destY = $yabove + $scany
        $destX = $xleft + $scanx

        if ($encoded -eq 0) {
            for ($i = 0; $i -lt $len; $i++) {
                $colIdx = [int]$fileBytes[$curr++]
                if ($colIdx -ne 255 -and ($destX + $i) -ge 0 -and ($destX + $i) -lt $width -and $destY -ge 0 -and $destY -lt $height) {
                    $bmp.SetPixel($destX + $i, $destY, $palette[$colIdx])
                }
            }
        } else {
            $readTotal = 0
            while ($readTotal -lt $len) {
                $bcnt = [int]$fileBytes[$curr++]
                $repeat = $bcnt -band 1
                $c = $bcnt -shr 1
                if ($repeat) {
                    $colIdx = [int]$fileBytes[$curr++]
                    for ($k = 0; $k -lt $c; $k++) {
                        $px = $destX + $readTotal + $k
                        if ($colIdx -ne 255 -and $px -ge 0 -and $px -lt $width -and $destY -ge 0 -and $destY -lt $height) {
                            $bmp.SetPixel($px, $destY, $palette[$colIdx])
                        }
                    }
                } else {
                    for ($k = 0; $k -lt $c; $k++) {
                        $colIdx = [int]$fileBytes[$curr++]
                        $px = $destX + $readTotal + $k
                        if ($colIdx -ne 255 -and $px -ge 0 -and $px -lt $width -and $destY -ge 0 -and $destY -lt $height) {
                            $bmp.SetPixel($px, $destY, $palette[$colIdx])
                        }
                    }
                }
                $readTotal += $c
            }
        }
    }
    return @{ Bitmap = $bmp; Width = $width; Height = $height }
}

$shapesBytes = [System.IO.File]::ReadAllBytes("$U7StaticPath\SHAPES.VGA")
New-Item -ItemType Directory -Force -Path "scratch\nature_shapes" | Out-Null

for ($s = 300; $s -lt 750; $s++) {
    $offset = [System.BitConverter]::ToUInt32($shapesBytes, 128 + $s * 8)
    if ($offset -eq 0 -or $offset -ge $shapesBytes.Length) { continue }
    $frame0Off = [System.BitConverter]::ToUInt32($shapesBytes, $offset + 4)
    if ($frame0Off -lt 8 -or ($offset + $frame0Off) -ge $shapesBytes.Length) { continue }
    
    $f = DecodeFrame $shapesBytes $offset $frame0Off
    if ($f -and $f.Width -ge 20 -and $f.Height -ge 20) {
        $f.Bitmap.Save("scratch\nature_shapes\shape_$s.png", [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "Decoded shape $s ($($f.Width)x$($f.Height))"
        $f.Bitmap.Dispose()
    }
}
