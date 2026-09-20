Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;

public class HareProcessor {
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
        if (c.R > 135 && c.B > 135 && (c.R - c.G > 25) && (c.B - c.G > 25)) return true;
        if (c.R > 150 && c.B > 150 && c.G < 115) return true;
        return false;
    }

    public static bool IsFringe(Color c) {
        if ((c.R - c.G > 15) && (c.B - c.G > 15)) return true;
        if ((c.B - c.G > 20) && (c.R > 80)) return true;
        return false;
    }

    public static Bitmap CropBoxExact(Bitmap src, Rectangle box, int maxDim, int[][] palette) {
        int bw = box.Width;
        int bh = box.Height;
        if (bw <= 0 || bh <= 0) return new Bitmap(48, 48);

        double scale = Math.Min((double)maxDim / bw, (double)maxDim / bh);
        int dw = Math.Max(1, (int)Math.Round(bw * scale));
        int dh = Math.Max(1, (int)Math.Round(bh * scale));

        int dx = (48 - dw) / 2;
        int dy = (48 - dh - 1); // bottom-grounded

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
}
"@ -ReferencedAssemblies System.Drawing

$hex = 'art\palette\uf.hex'
$palette = [HareProcessor]::LoadPalette($hex)
$src = 'C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_hare_sprite_1789825546030.jpg'
$bmpSrc = [System.Drawing.Bitmap]::FromFile($src)

$hareSheet = New-Object System.Drawing.Bitmap (48 * 3), (48 * 4), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($hareSheet)
$g.Clear([System.Drawing.Color]::Transparent)

# Boxes:
# Row 0 (South):
# Col 0 (Walk 1): x=322, y=20, w=124, h=226
# Col 1 (Stand):  x=66, y=20, w=124, h=231
# Col 2 (Walk 2): x=579, y=20, w=123, h=231
$r0c0 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(322, 20, 124, 226), 38, $palette)
$r0c1 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(66, 20, 124, 231), 38, $palette)
$r0c2 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(579, 20, 123, 231), 38, $palette)
$g.DrawImage($r0c0, 0 * 48, 0 * 48)
$g.DrawImage($r0c1, 1 * 48, 0 * 48)
$g.DrawImage($r0c2, 2 * 48, 0 * 48)

# Row 1 (West):
# Col 0 (Walk 1): x=261, y=271, w=236, h=216
# Col 1 (Stand):  x=10, y=271, w=231, h=226
# Col 2 (Walk 2): x=773, y=271, w=236, h=226
$r1c0 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(261, 271, 236, 216), 38, $palette)
$r1c1 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(10, 271, 231, 226), 38, $palette)
$r1c2 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(773, 271, 236, 226), 38, $palette)
$g.DrawImage($r1c0, 0 * 48, 1 * 48)
$g.DrawImage($r1c1, 1 * 48, 1 * 48)
$g.DrawImage($r1c2, 2 * 48, 1 * 48)

# Row 2 (East):
# Col 0 (Walk 1): x=271, y=527, w=231, h=216
# Col 1 (Stand):  x=10, y=527, w=231, h=226
# Col 2 (Walk 2): x=783, y=527, w=231, h=226
$r2c0 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(271, 527, 231, 216), 38, $palette)
$r2c1 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(10, 527, 231, 226), 38, $palette)
$r2c2 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(783, 527, 231, 226), 38, $palette)
$g.DrawImage($r2c0, 0 * 48, 2 * 48)
$g.DrawImage($r2c1, 1 * 48, 2 * 48)
$g.DrawImage($r2c2, 2 * 48, 2 * 48)

# Row 3 (North):
# Col 0 (Walk 1): x=333, y=773, w=102, h=246
# Col 1 (Stand):  x=77, y=773, w=102, h=246
# Col 2 (Walk 2): x=589, y=773, w=102, h=246
$r3c0 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(333, 773, 102, 246), 38, $palette)
$r3c1 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(77, 773, 102, 246), 38, $palette)
$r3c2 = [HareProcessor]::CropBoxExact($bmpSrc, [System.Drawing.Rectangle]::new(589, 773, 102, 246), 38, $palette)
$g.DrawImage($r3c0, 0 * 48, 3 * 48)
$g.DrawImage($r3c1, 1 * 48, 3 * 48)
$g.DrawImage($r3c2, 2 * 48, 3 * 48)

$g.Dispose()
$bmpSrc.Dispose()

# Save to characters
$hareSheet.Save('game\img\characters\$U7_Hare.png', [System.Drawing.Imaging.ImageFormat]::Png)

# Save showcase 3x and 8x
$showcase3x = New-Object System.Drawing.Bitmap (144 * 3), (192 * 3), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g3x = [System.Drawing.Graphics]::FromImage($showcase3x)
$g3x.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g3x.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g3x.DrawImage($hareSheet, 0, 0, 144 * 3, 192 * 3)
$g3x.Dispose()
$showcase3x.Save('art\review\hare_charset_showcase.png', [System.Drawing.Imaging.ImageFormat]::Png)
$showcase3x.Dispose()

$hareSheet.Dispose()
Write-Host "Hare walk sheet deployed and showcase saved."

