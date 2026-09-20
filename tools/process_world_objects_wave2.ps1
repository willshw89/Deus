Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;

public class ObjectBatchProcessor {
    public static int[][] LoadPalette(string hexPath) {
        string[] lines = File.ReadAllLines(hexPath);
        List<int[]> colors = new List<int[]>();
        foreach (string line in lines) {
            string s = line.Trim().TrimStart('#');
            if (s.Length == 6) {
                int r = Convert.ToInt32(s.Substring(0, 2), 16);
                int g = Convert.ToInt32(s.Substring(2, 2), 16);
                int b = Convert.ToInt32(s.Substring(4, 2), 16);
                colors.Add(new int[] { r, g, b });
            }
        }
        return colors.ToArray();
    }

    public static int[] NearestColor(int r, int g, int b, int[][] palette) {
        int bestDist = int.MaxValue;
        int[] best = palette[0];
        for (int i = 0; i < palette.Length; i++) {
            int dr = r - palette[i][0];
            int dg = g - palette[i][1];
            int db = b - palette[i][2];
            int dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) {
                bestDist = dist;
                best = palette[i];
            }
        }
        return best;
    }

    public static bool IsBg(int r, int g, int b) {
        if (r > 130 && b > 130 && (r - g > 20) && (b - g > 20)) return true;
        if (r > 150 && b > 150 && g < 115) return true;
        return false;
    }

    public static bool IsFringe(int r, int g, int b) {
        if ((r - g > 15) && (b - g > 15)) return true;
        if ((b - g > 20) && (r > 80)) return true;
        return false;
    }

    public static Bitmap CropAndFit(Bitmap src, int targetW, int targetH, int maxDimension, int[][] palette, bool anchorBottom) {
        int minX = src.Width, maxX = 0, minY = src.Height, maxY = 0;
        for (int y = 0; y < src.Height; y++) {
            for (int x = 0; x < src.Width; x++) {
                Color c = src.GetPixel(x, y);
                if (!IsBg(c.R, c.G, c.B) && !IsFringe(c.R, c.G, c.B)) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        int bw = maxX - minX + 1;
        int bh = maxY - minY + 1;
        if (bw <= 0 || bh <= 0) return new Bitmap(targetW, targetH);

        double scale = Math.Min((double)maxDimension / bw, (double)maxDimension / bh);
        int dw = Math.Max(1, (int)Math.Round(bw * scale));
        int dh = Math.Max(1, (int)Math.Round(bh * scale));

        int dx = (targetW - dw) / 2;
        int dy = anchorBottom ? (targetH - dh - 1) : ((targetH - dh) / 2);

        Bitmap canvas = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(canvas)) {
            g.Clear(Color.Transparent);
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;

            using (Bitmap cropped = new Bitmap(bw, bh, PixelFormat.Format32bppArgb)) {
                for (int y = 0; y < bh; y++) {
                    for (int x = 0; x < bw; x++) {
                        Color c = src.GetPixel(minX + x, minY + y);
                        if (IsBg(c.R, c.G, c.B) || IsFringe(c.R, c.G, c.B)) {
                            cropped.SetPixel(x, y, Color.Transparent);
                        } else {
                            int[] p = NearestColor(c.R, c.G, c.B, palette);
                            cropped.SetPixel(x, y, Color.FromArgb(255, p[0], p[1], p[2]));
                        }
                    }
                }
                g.DrawImage(cropped, new Rectangle(dx, dy, dw, dh), new Rectangle(0, 0, bw, bh), GraphicsUnit.Pixel);
            }
        }
        return canvas;
    }

    public static Bitmap ScaleNN(Bitmap src, int scale) {
        int sw = src.Width * scale;
        int sh = src.Height * scale;
        Bitmap res = new Bitmap(sw, sh, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(res)) {
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;
            g.DrawImage(src, new Rectangle(0, 0, sw, sh), new Rectangle(0, 0, src.Width, src.Height), GraphicsUnit.Pixel);
        }
        return res;
    }
}
"@ -ReferencedAssemblies "System.Drawing"

$brainDir = "C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd"
$gameCharDir = "c:\Users\snewt\OneDrive\Desktop\UF\game\img\characters"
$revDir = "c:\Users\snewt\OneDrive\Desktop\UF\art\review"
$hexPath = "c:\Users\snewt\OneDrive\Desktop\UF\art\palette\uf.hex"

$pal = [ObjectBatchProcessor]::LoadPalette($hexPath)
Write-Host "Loaded $($pal.Length) colors from uf.hex"

function ProcessAndSave($imgPattern, $targetName, $maxDim, $extraDestinations) {
    $file = (Get-ChildItem "$brainDir\$imgPattern" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
    Write-Host "Processing $targetName from $file (maxDim=$maxDim)..."
    $src = [Drawing.Bitmap]::FromFile($file)
    $frame48 = [ObjectBatchProcessor]::CropAndFit($src, 48, 48, $maxDim, $pal, $true)
    $src.Dispose()

    # Save primary 48x48 single tile
    $outPath = "$gameCharDir\!`$$targetName.png"
    $frame48.Save($outPath, [Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Saved: $outPath"

    if ($extraDestinations) {
        foreach ($dest in $extraDestinations) {
            $destPath = "$gameCharDir\!`$$dest.png"
            $frame48.Save($destPath, [Drawing.Imaging.ImageFormat]::Png)
            Write-Host "Saved duplicate: $destPath"
        }
    }

    # Review 3x
    $rev3x = [ObjectBatchProcessor]::ScaleNN($frame48, 3)
    $rev3x.Save("$revDir\!`$${targetName}_3x.png", [Drawing.Imaging.ImageFormat]::Png)
    $rev3x.Dispose()

    return $frame48
}

$pineBmp = ProcessAndSave "ff6_pine_tree_*.jpg" "PineTree" 46 @("U7_Swamptree")
$fruitBmp = ProcessAndSave "ff6_fruit_tree_*.jpg" "FruitTree" 46 @()
$boulderBmp = ProcessAndSave "ff6_granite_boulder_*.jpg" "GraniteBoulder" 44 @("CaveBoulder")
$stumpBmp = ProcessAndSave "ff6_tree_stump_*.jpg" "TreeStump" 40 @("UF_Stump", "U7_TreeStump")
$workbenchBmp = ProcessAndSave "ff6_workbench_*.jpg" "UF_Workbench" 44 @()

# Build comprehensive review showcase of all 9 world objects + peasant
$showW = 920; $showH = 460
$showcase = New-Object Drawing.Bitmap($showW, $showH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [Drawing.Graphics]::FromImage($showcase)
$g.Clear([Drawing.Color]::FromArgb(255, 20, 24, 30))

$fontTitle = New-Object Drawing.Font("Consolas", 13, [Drawing.FontStyle]::Bold)
$fontSub = New-Object Drawing.Font("Consolas", 10, [Drawing.FontStyle]::Regular)
$brushWhite = New-Object Drawing.SolidBrush([Drawing.Color]::White)
$brushDim = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 180, 190, 200))
$brushGreen = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 120, 220, 120))

$g.DrawString("FF6 1-SQUARE OBJECTS COLLECTION (ULTIMA VII PALETTE)", $fontTitle, $brushWhite, 30, 20)
$g.DrawString("Single square 48x48 containment, 100% uf.hex palette, 34px peasant character proportions", $fontSub, $brushDim, 30, 48)

# Load existing batch 1 objects & peasant
$oakBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$TimberOak.png")
$campBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_Campfire.png")
$bushBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_BerryBush.png")
$bedBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_Straw_Bed.png")
$adamBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\`$Adam.png")
$peasantStand = New-Object Drawing.Bitmap(48, 48, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$pg = [Drawing.Graphics]::FromImage($peasantStand)

# Peasant stand frame from Adam.png (row 0, col 1: 48x48)
$rectDst = [Drawing.Rectangle]::new(0, 0, 48, 48)
$rectSrc = [Drawing.Rectangle]::new(48, 0, 48, 48)
$pg.DrawImage($adamBmp, $rectDst, $rectSrc, [Drawing.GraphicsUnit]::Pixel)
$pg.Dispose()
$adamBmp.Dispose()

# Draw 3x scale gallery across 2 rows
$items = @(
    @{ Name = "Oak Tree"; Bmp = $oakBmp },
    @{ Name = "Pine Tree"; Bmp = $pineBmp },
    @{ Name = "Fruit Tree"; Bmp = $fruitBmp },
    @{ Name = "Campfire"; Bmp = $campBmp },
    @{ Name = "Peasant (34px)"; Bmp = $peasantStand },
    @{ Name = "Straw Bed"; Bmp = $bedBmp },
    @{ Name = "Berry Bush"; Bmp = $bushBmp },
    @{ Name = "Granite Rock"; Bmp = $boulderBmp },
    @{ Name = "Tree Stump"; Bmp = $stumpBmp },
    @{ Name = "Workbench"; Bmp = $workbenchBmp }
)

# Row 1: 5 items
for ($i = 0; $i -lt 5; $i++) {
    $x = 40 + $i * 170
    $y = 85
    $scaled = [ObjectBatchProcessor]::ScaleNN($items[$i].Bmp, 3)
    $g.DrawImage($scaled, $x, $y)
    $textColor = if ($i -eq 4) { $brushGreen } else { $brushWhite }
    $g.DrawString($items[$i].Name, $fontSub, $textColor, $x + 10, $y + 150)
    $scaled.Dispose()
}

# Row 2: 5 items
for ($i = 5; $i -lt 10; $i++) {
    $x = 40 + ($i - 5) * 170
    $y = 265
    $scaled = [ObjectBatchProcessor]::ScaleNN($items[$i].Bmp, 3)
    $g.DrawImage($scaled, $x, $y)
    $g.DrawString($items[$i].Name, $fontSub, $brushWhite, $x + 10, $y + 150)
    $scaled.Dispose()
}

$g.Dispose()
$oakBmp.Dispose()
$campBmp.Dispose()
$bushBmp.Dispose()
$bedBmp.Dispose()
$peasantStand.Dispose()
$pineBmp.Dispose()
$fruitBmp.Dispose()
$boulderBmp.Dispose()
$stumpBmp.Dispose()
$workbenchBmp.Dispose()

$showcase.Save("$revDir\ff6_complete_world_showcase.png", [Drawing.Imaging.ImageFormat]::Png)
$showcase.Dispose()
Write-Host "SUCCESS: Created $revDir\ff6_complete_world_showcase.png"
