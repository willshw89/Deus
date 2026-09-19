Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;

public class SampleBatchProcessorV2 {
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

    public static bool IsBg(Color c) {
        if (c.R > 135 && c.B > 135 && (c.R - c.G > 20) && (c.B - c.G > 20)) return true;
        if (c.R > 150 && c.B > 150 && c.G < 115) return true;
        return false;
    }

    public static bool IsFringe(Color c) {
        if ((c.R - c.G > 15) && (c.B - c.G > 15)) return true;
        if ((c.B - c.G > 20) && (c.R > 80)) return true;
        return false;
    }

    public static Bitmap CropBoxExact(Bitmap src, Rectangle box, int maxDim, int[][] palette, bool anchorBottom) {
        int bw = box.Width;
        int bh = box.Height;
        if (bw <= 0 || bh <= 0) return new Bitmap(48, 48);

        double scale = Math.Min((double)maxDim / bw, (double)maxDim / bh);
        int dw = Math.Max(1, (int)Math.Round(bw * scale));
        int dh = Math.Max(1, (int)Math.Round(bh * scale));

        int dx = (48 - dw) / 2;
        int dy = anchorBottom ? (48 - dh - 1) : ((48 - dh) / 2);

        Bitmap canvas = new Bitmap(48, 48, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(canvas)) {
            g.Clear(Color.Transparent);
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;

            using (Bitmap cropped = new Bitmap(bw, bh, PixelFormat.Format32bppArgb)) {
                for (int y = 0; y < bh; y++) {
                    for (int x = 0; x < bw; x++) {
                        Color c = src.GetPixel(box.X + x, box.Y + y);
                        if (IsBg(c) || IsFringe(c)) {
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

    public static Bitmap Make3x4ObjectSheet(Bitmap tile) {
        Bitmap sheet = new Bitmap(48 * 3, 48 * 4, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(sheet)) {
            g.Clear(Color.Transparent);
            for (int row = 0; row < 4; row++) {
                for (int col = 0; col < 3; col++) {
                    g.DrawImage(tile, col * 48, row * 48);
                }
            }
        }
        return sheet;
    }
}
"@ -ReferencedAssemblies System.Drawing

$hex = 'art\palette\uf.hex'
$palette = [SampleBatchProcessorV2]::LoadPalette($hex)

$furnaceSrc = 'C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_furnace_smithy_1789825498930.jpg'
$itemsSrc = 'C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_fish_flowers_firewood_1789825513972.jpg'
$wolfSrc = 'C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_wolf_sprite_1789825529746.jpg'

Write-Host "Processing Workshop Objects..."
$bmpFurnace = [System.Drawing.Bitmap]::FromFile($furnaceSrc)
# Exact bounds: Furnace x=10, y=106, w=589, h=831; Smithy x=630, y=476, w=364, h=415
$furnaceTile = [SampleBatchProcessorV2]::CropBoxExact($bmpFurnace, [System.Drawing.Rectangle]::new(10, 106, 589, 831), 46, $palette, $true)
$smithyTile = [SampleBatchProcessorV2]::CropBoxExact($bmpFurnace, [System.Drawing.Rectangle]::new(630, 476, 364, 415), 44, $palette, $true)
$bmpFurnace.Dispose()

$furnaceSheet = [SampleBatchProcessorV2]::Make3x4ObjectSheet($furnaceTile)
$smithySheet = [SampleBatchProcessorV2]::Make3x4ObjectSheet($smithyTile)

Write-Host "Processing Plants & Items..."
$bmpItems = [System.Drawing.Bitmap]::FromFile($itemsSrc)
# Wildflowers: x=10, y=368, w=323, h=277
$flowersTile = [SampleBatchProcessorV2]::CropBoxExact($bmpItems, [System.Drawing.Rectangle]::new(10, 368, 323, 277), 44, $palette, $true)
# Fish: x=353, y=363, w=333, h=282
$fishTile = [SampleBatchProcessorV2]::CropBoxExact($bmpItems, [System.Drawing.Rectangle]::new(353, 363, 333, 282), 40, $palette, $false)
# Firewood: x=696, y=374, w=313, h=292
$firewoodTile = [SampleBatchProcessorV2]::CropBoxExact($bmpItems, [System.Drawing.Rectangle]::new(696, 374, 313, 292), 42, $palette, $true)
$bmpItems.Dispose()

$flowersSheet = [SampleBatchProcessorV2]::Make3x4ObjectSheet($flowersTile)
$fishSheet = [SampleBatchProcessorV2]::Make3x4ObjectSheet($fishTile)
$firewoodSheet = [SampleBatchProcessorV2]::Make3x4ObjectSheet($firewoodTile)

Write-Host "Processing Wolf Walk Sheet..."
$bmpWolf = [System.Drawing.Bitmap]::FromFile($wolfSrc)
$wolfSheet = New-Object System.Drawing.Bitmap (48 * 3), (48 * 4), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gWolf = [System.Drawing.Graphics]::FromImage($wolfSheet)
$gWolf.Clear([System.Drawing.Color]::Transparent)

# Exact boxes from component detection:
# Row 0 (South):
# Col 0 (Walk 1): x=251, y=15, w=113, h=241
# Col 1 (Stand):  x=46, y=10, w=108, h=246
# Col 2 (Walk 2): x=732, y=15, w=113, h=241
$r0c0 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(251, 15, 113, 241), 44, $palette, $true)
$r0c1 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(46, 10, 108, 246), 44, $palette, $true)
$r0c2 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(732, 15, 113, 241), 44, $palette, $true)
$gWolf.DrawImage($r0c0, 0 * 48, 0 * 48)
$gWolf.DrawImage($r0c1, 1 * 48, 0 * 48)
$gWolf.DrawImage($r0c2, 2 * 48, 0 * 48)

# Row 1 (West - Left):
# Col 0 (Walk 1): x=5, y=292, w=359, h=189
# Col 1 (Stand):  x=358, y=287, w=323, h=194
# Col 2 (Walk 2): x=670, y=287, w=349, h=195
$r1c0 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(5, 292, 359, 189), 44, $palette, $true)
$r1c1 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(358, 287, 323, 194), 44, $palette, $true)
$r1c2 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(670, 287, 349, 195), 44, $palette, $true)
$gWolf.DrawImage($r1c0, 0 * 48, 1 * 48)
$gWolf.DrawImage($r1c1, 1 * 48, 1 * 48)
$gWolf.DrawImage($r1c2, 2 * 48, 1 * 48)

# Row 2 (East - Right):
# Col 0 (Walk 1): x=5, y=543, w=354, h=195
# Col 1 (Stand):  x=358, y=543, w=323, h=195
# Col 2 (Walk 2): x=681, y=543, w=338, h=189
$r2c0 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(5, 543, 354, 195), 44, $palette, $true)
$r2c1 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(358, 543, 323, 195), 44, $palette, $true)
$r2c2 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(681, 543, 338, 189), 44, $palette, $true)
$gWolf.DrawImage($r2c0, 0 * 48, 2 * 48)
$gWolf.DrawImage($r2c1, 1 * 48, 2 * 48)
$gWolf.DrawImage($r2c2, 2 * 48, 2 * 48)

# Row 3 (North - Back):
# Col 0 (Walk 1): x=153, y=768, w=103, h=251
# Col 1 (Stand):  x=768, y=768, w=103, h=251
# Col 2 (Walk 2): x=369, y=793, w=281, h=205
$r3c0 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(153, 768, 103, 251), 44, $palette, $true)
$r3c1 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(768, 768, 103, 251), 44, $palette, $true)
$r3c2 = [SampleBatchProcessorV2]::CropBoxExact($bmpWolf, [System.Drawing.Rectangle]::new(369, 793, 281, 205), 44, $palette, $true)
$gWolf.DrawImage($r3c0, 0 * 48, 3 * 48)
$gWolf.DrawImage($r3c1, 1 * 48, 3 * 48)
$gWolf.DrawImage($r3c2, 2 * 48, 3 * 48)

$gWolf.Dispose()
$bmpWolf.Dispose()

# Deploy images
Write-Host "Deploying clean images to game\img\characters\..."
$furnaceSheet.Save('game\img\characters\!$UF_Furnace.png', [System.Drawing.Imaging.ImageFormat]::Png)
$smithySheet.Save('game\img\characters\!$UF_Smithy.png', [System.Drawing.Imaging.ImageFormat]::Png)
$flowersSheet.Save('game\img\characters\!$UF_Wildflowers.png', [System.Drawing.Imaging.ImageFormat]::Png)
$flowersSheet.Save('game\img\characters\!$U7_Wildflowers.png', [System.Drawing.Imaging.ImageFormat]::Png)
$fishSheet.Save('game\img\characters\!$UF_Item_Fish.png', [System.Drawing.Imaging.ImageFormat]::Png)
$fishSheet.Save('game\img\characters\!$U7_Item_RiverFish.png', [System.Drawing.Imaging.ImageFormat]::Png)
$firewoodSheet.Save('game\img\characters\!$UF_Item_Firewood.png', [System.Drawing.Imaging.ImageFormat]::Png)
$firewoodSheet.Save('game\img\characters\!$U7_Item_Firewood.png', [System.Drawing.Imaging.ImageFormat]::Png)
$wolfSheet.Save('game\img\characters\$U7_Wolf.png', [System.Drawing.Imaging.ImageFormat]::Png)

# Build Showcase
$galleryW = 6 * 48
$galleryH = 48
$gallery = New-Object System.Drawing.Bitmap $galleryW, $galleryH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gGal = [System.Drawing.Graphics]::FromImage($gallery)
$gGal.Clear([System.Drawing.Color]::Transparent)

$gGal.DrawImage($furnaceTile, 0 * 48, 0)
$gGal.DrawImage($smithyTile, 1 * 48, 0)
$gGal.DrawImage($flowersTile, 2 * 48, 0)
$gGal.DrawImage($fishTile, 3 * 48, 0)
$gGal.DrawImage($firewoodTile, 4 * 48, 0)
$gGal.DrawImage($r0c1, 5 * 48, 0)
$gGal.Dispose()

$showcase3x = New-Object System.Drawing.Bitmap ($galleryW * 3), ($galleryH * 3), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g3x = [System.Drawing.Graphics]::FromImage($showcase3x)
$g3x.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g3x.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g3x.DrawImage($gallery, 0, 0, $galleryW * 3, $galleryH * 3)
$g3x.Dispose()
$showcase3x.Save('art\review\random_sample_showcase.png', [System.Drawing.Imaging.ImageFormat]::Png)
$showcase3x.Dispose()

# Also save an 8x preview
$showcase8x = New-Object System.Drawing.Bitmap ($galleryW * 8), ($galleryH * 8), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g8x = [System.Drawing.Graphics]::FromImage($showcase8x)
$g8x.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g8x.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g8x.DrawImage($gallery, 0, 0, $galleryW * 8, $galleryH * 8)
$g8x.Dispose()
$showcase8x.Save('art\review\random_sample_showcase_8x.png', [System.Drawing.Imaging.ImageFormat]::Png)
$showcase8x.Dispose()

$gallery.Dispose()
Write-Host "Batch process completed cleanly."
