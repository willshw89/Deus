# Ultima Fortress (UF) - Automated Asset Post-Processing & Palette Quantizer
param(
    [string]$U7StaticPath = "C:\Program Files\GOG Galaxy\Games\Ultima 7\STATIC",
    [string]$GameRoot = "c:\Users\snewt\OneDrive\Desktop\UF\game"
)

Add-Type -AssemblyName System.Drawing

$fastQuantizerCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class FastQuantizer {
    public static void Quantize(Bitmap bmp, int[] paletteRgb) {
        int w = bmp.Width;
        int h = bmp.Height;
        BitmapData bdata = bmp.LockBits(
            new Rectangle(0, 0, w, h),
            ImageLockMode.ReadWrite,
            PixelFormat.Format32bppArgb
        );
        int bytes = Math.Abs(bdata.Stride) * h;
        byte[] rgbValues = new byte[bytes];
        Marshal.Copy(bdata.Scan0, rgbValues, 0, bytes);

        int palLen = paletteRgb.Length;
        int[] pr = new int[palLen];
        int[] pg = new int[palLen];
        int[] pb = new int[palLen];
        for (int i = 0; i < palLen; i++) {
            pr[i] = (paletteRgb[i] >> 16) & 0xFF;
            pg[i] = (paletteRgb[i] >> 8) & 0xFF;
            pb[i] = paletteRgb[i] & 0xFF;
        }

        for (int i = 0; i < bytes; i += 4) {
            int b = rgbValues[i];
            int g = rgbValues[i + 1];
            int r = rgbValues[i + 2];
            int a = rgbValues[i + 3];

            // Alpha or Chroma-green key (#00FF00)
            if (a < 128 || (g > 165 && r < 120 && b < 120)) {
                rgbValues[i] = 0;
                rgbValues[i + 1] = 0;
                rgbValues[i + 2] = 0;
                rgbValues[i + 3] = 0;
                continue;
            }

            int bestDist = int.MaxValue;
            int bestIdx = 0;
            for (int k = 0; k < palLen; k++) {
                int dr = r - pr[k];
                int dg = g - pg[k];
                int db = b - pb[k];
                int dist = dr * dr + dg * dg + db * db;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = k;
                    if (dist == 0) break;
                }
            }
            rgbValues[i] = (byte)pb[bestIdx];
            rgbValues[i + 1] = (byte)pg[bestIdx];
            rgbValues[i + 2] = (byte)pr[bestIdx];
            rgbValues[i + 3] = 255;
        }

        Marshal.Copy(rgbValues, 0, bdata.Scan0, bytes);
        bmp.UnlockBits(bdata);
    }
}
"@
if (-not ([System.Management.Automation.PSTypeName]'FastQuantizer').Type) {
    Add-Type -TypeDefinition $fastQuantizerCode -ReferencedAssemblies "System.Drawing.dll"
}

Write-Host "=== Ultima Fortress: Asset Post-Processing Pipeline ===" -ForegroundColor Cyan

# 1. Load U7 Master Palette (Record 0 in PALETTES.FLX)
$palFile = "$U7StaticPath\PALETTES.FLX"
if (-not (Test-Path $palFile)) {
    Write-Error "Could not find PALETTES.FLX at $palFile"
    exit 1
}

$palBytes = [System.IO.File]::ReadAllBytes($palFile)
$u7PaletteInts = New-Object int[] 255
for ($i = 0; $i -lt 255; $i++) {
    $r = [int]$palBytes[256 + $i * 3]
    $g = [int]$palBytes[256 + $i * 3 + 1]
    $b = [int]$palBytes[256 + $i * 3 + 2]
    $u7PaletteInts[$i] = ($r -shl 16) -bor ($g -shl 8) -bor $b
}

# Quantize and key-out an image
function Quantize-Image($inputPath, $outputPath) {
    Write-Host "Quantizing $inputPath -> $outputPath" -ForegroundColor Yellow
    $srcBmp = [System.Drawing.Bitmap]::FromFile($inputPath)
    $destBmp = New-Object System.Drawing.Bitmap($srcBmp.Width, $srcBmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.DrawImage($srcBmp, 0, 0, $srcBmp.Width, $srcBmp.Height)
    $g.Dispose()
    $srcBmp.Dispose()

    [FastQuantizer]::Quantize($destBmp, $u7PaletteInts)

    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Quantization complete: $outputPath" -ForegroundColor Green
}

# Compile 3x4 Character Spritesheet ($Name.png = 144x192 px)
function Compile-CharacterSheet($inputPath, $outputPath) {
    Write-Host "Compiling character sheet: $inputPath -> $outputPath" -ForegroundColor Yellow
    $src = [System.Drawing.Bitmap]::FromFile($inputPath)

    $targetW = 144
    $targetH = 192
    $dest = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

    $g.DrawImage($src, 0, 0, $targetW, $targetH)
    $g.Dispose()
    $src.Dispose()

    [FastQuantizer]::Quantize($dest, $u7PaletteInts)

    $dest.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Host "Compiled character sheet: $outputPath" -ForegroundColor Green
}

# Compile 144x144 Character Portrait into Facesheet (576x288 px for 8 faces)
function Add-FaceToSheet($portraitPath, $faceIndex, $facesheetPath) {
    Write-Host "Adding portrait $portraitPath at face index $faceIndex -> $facesheetPath" -ForegroundColor Yellow
    $faceW = 144
    $faceH = 144
    $totalW = 576
    $totalH = 288

    $sheet = $null
    if (Test-Path $facesheetPath) {
        $loaded = [System.Drawing.Bitmap]::FromFile($facesheetPath)
        $sheet = New-Object System.Drawing.Bitmap($loaded)
        $loaded.Dispose()
    } else {
        $sheet = New-Object System.Drawing.Bitmap($totalW, $totalH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    }

    $port = [System.Drawing.Bitmap]::FromFile($portraitPath)
    $destX = ($faceIndex % 4) * $faceW
    $destY = [Math]::Floor($faceIndex / 4) * $faceH

    $g = [System.Drawing.Graphics]::FromImage($sheet)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.DrawImage($port, $destX, $destY, $faceW, $faceH)
    $g.Dispose()
    $port.Dispose()

    # Re-save
    $sheet.Save($facesheetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sheet.Dispose()
    Write-Host "Updated facesheet: $facesheetPath" -ForegroundColor Green
}

# Compile Tile onto 768x768 RMMZ Tileset Sheet
function Add-TileToSheet($tilePath, $tileCol, $tileRow, $tilesheetPath) {
    $tileDim = 48
    $sheetDim = 768 # 16 x 16 tiles

    $sheet = $null
    if (Test-Path $tilesheetPath) {
        $loaded = [System.Drawing.Bitmap]::FromFile($tilesheetPath)
        $sheet = New-Object System.Drawing.Bitmap($loaded)
        $loaded.Dispose()
    } else {
        $sheet = New-Object System.Drawing.Bitmap($sheetDim, $sheetDim, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    }

    $tile = [System.Drawing.Bitmap]::FromFile($tilePath)
    $destX = $tileCol * $tileDim
    $destY = $tileRow * $tileDim

    $g = [System.Drawing.Graphics]::FromImage($sheet)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.DrawImage($tile, $destX, $destY, $tileDim, $tileDim)
    $g.Dispose()
    $tile.Dispose()

    $sheet.Save($tilesheetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sheet.Dispose()
    Write-Host "Added tile at ($tileCol, $tileRow) -> $tilesheetPath" -ForegroundColor Green
}

Write-Host "Pipeline functions loaded: Quantize-Image, Compile-CharacterSheet, Add-FaceToSheet, Add-TileToSheet" -ForegroundColor Green
