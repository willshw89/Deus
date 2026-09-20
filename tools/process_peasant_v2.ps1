Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;

public class PeasantProcessor {
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

    public static bool IsMagenta(int r, int g, int b) {
        // Broad magenta / pink detection to eliminate JPEG compression halos
        if (r > 130 && b > 130 && (r - g > 25) && (b - g > 25)) return true;
        if ((r - g > 35) && (b - g > 35)) return true;
        if (r > 160 && b > 160 && g < 115) return true;
        return false;
    }

    // Is edge pixel contaminated by magenta anti-aliasing?
    public static bool IsMagentaFringe(int r, int g, int b) {
        // Natural human / clothing / leather / hair tones never have both r > g + 15 and b > g + 15
        if ((r - g > 15) && (b - g > 15)) return true;
        if ((b - g > 20) && (r > 80)) return true;
        return false;
    }

    public static Rectangle[] FindSpritesInRow(Bitmap bmp, int startY, int endY) {
        List<Rectangle> list = new List<Rectangle>();
        int w = bmp.Width;
        bool inSprite = false;
        int minX = 0;

        // Projection along X in this vertical band
        int[] colCounts = new int[w];
        for (int x = 0; x < w; x++) {
            int cnt = 0;
            for (int y = startY; y < endY; y++) {
                Color c = bmp.GetPixel(x, y);
                if (!IsMagenta(c.R, c.G, c.B) && !IsMagentaFringe(c.R, c.G, c.B)) {
                    cnt++;
                }
            }
            colCounts[x] = cnt;
        }

        for (int x = 0; x < w; x++) {
            if (!inSprite && colCounts[x] > 5) {
                inSprite = true;
                minX = x;
            } else if (inSprite && colCounts[x] <= 2) {
                inSprite = false;
                int maxX = x - 1;
                if (maxX - minX > 20) {
                    // Find actual Y bounds
                    int actualMinY = endY, actualMaxY = startY;
                    for (int y = startY; y < endY; y++) {
                        for (int sx = minX; sx <= maxX; sx++) {
                            Color c = bmp.GetPixel(sx, y);
                            if (!IsMagenta(c.R, c.G, c.B) && !IsMagentaFringe(c.R, c.G, c.B)) {
                                if (y < actualMinY) actualMinY = y;
                                if (y > actualMaxY) actualMaxY = y;
                            }
                        }
                    }
                    if (actualMaxY > actualMinY) {
                        list.Add(new Rectangle(minX, actualMinY, maxX - minX + 1, actualMaxY - actualMinY + 1));
                    }
                }
            }
        }
        return list.ToArray();
    }

    public static Bitmap ExtractAndClean(Bitmap src, Rectangle rect, int targetW, int targetH, int targetCharHeight, int[][] palette) {
        int bw = rect.Width;
        int bh = rect.Height;

        double scale = (double)targetCharHeight / bh;
        int dw = Math.Max(1, (int)Math.Round(bw * scale));
        int dh = targetCharHeight;

        int dx = (targetW - dw) / 2;
        int dy = targetH - dh - 2; // Foot baseline 2px from bottom

        Bitmap canvas = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(canvas)) {
            g.Clear(Color.Transparent);
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;

            using (Bitmap cropped = new Bitmap(bw, bh, PixelFormat.Format32bppArgb)) {
                for (int y = 0; y < bh; y++) {
                    for (int x = 0; x < bw; x++) {
                        Color c = src.GetPixel(rect.X + x, rect.Y + y);
                        if (IsMagenta(c.R, c.G, c.B) || IsMagentaFringe(c.R, c.G, c.B)) {
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

$pal = [PeasantProcessor]::LoadPalette($hexPath)
Write-Host "Loaded $($pal.Length) colors from uf.hex"

$peasantImgFile = (Get-ChildItem "$brainDir\ff6_u7_peasant_sheet_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Host "Processing peasant sheet from $peasantImgFile..."
$src = [Drawing.Bitmap]::FromFile($peasantImgFile)

# Row bands in 1024x1024 sheet:
# Row 0 (South): Y 0 to 260
# Row 1 (West walk 1): Y 240 to 510
# Row 2 (West walk 2): Y 490 to 760
# Row 3 (North): Y 740 to 1024

$sBoxes = [PeasantProcessor]::FindSpritesInRow($src, 0, 260)
$wBoxes = [PeasantProcessor]::FindSpritesInRow($src, 240, 510)
$nBoxes = [PeasantProcessor]::FindSpritesInRow($src, 740, 1024)

Write-Host "Found South sprites: $($sBoxes.Length)"
Write-Host "Found West sprites: $($wBoxes.Length)"
Write-Host "Found North sprites: $($nBoxes.Length)"

for ($i=0; $i -lt $sBoxes.Length; $i++) {
    Write-Host "  South[$i]: $($sBoxes[$i])"
}
for ($i=0; $i -lt $wBoxes.Length; $i++) {
    Write-Host "  West[$i]: $($wBoxes[$i])"
}
for ($i=0; $i -lt $nBoxes.Length; $i++) {
    Write-Host "  North[$i]: $($nBoxes[$i])"
}

# Select best frames for 3-step walk cycle:
# Target character height = 34px (user liked this size: "I like the size of the peasant")
$charH = 34

# South: Stand = box 0 (or 1), Step1 = box 2, Step2 = box 4
$s_stand = [PeasantProcessor]::ExtractAndClean($src, $sBoxes[0], 48, 48, $charH, $pal)
$s_step1 = [PeasantProcessor]::ExtractAndClean($src, $sBoxes[2], 48, 48, $charH, $pal)
$s_step2 = [PeasantProcessor]::ExtractAndClean($src, $sBoxes[4], 48, 48, $charH, $pal)

# West: Stand = box 0 (or 1), Step1 = box 2, Step2 = box 4
$w_stand = [PeasantProcessor]::ExtractAndClean($src, $wBoxes[0], 48, 48, $charH, $pal)
$w_step1 = [PeasantProcessor]::ExtractAndClean($src, $wBoxes[2], 48, 48, $charH, $pal)
$w_step2 = [PeasantProcessor]::ExtractAndClean($src, $wBoxes[4], 48, 48, $charH, $pal)

# East: Horizontally flipped West frames
$e_stand = New-Object Drawing.Bitmap($w_stand)
$e_stand.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)
$e_step1 = New-Object Drawing.Bitmap($w_step1)
$e_step1.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)
$e_step2 = New-Object Drawing.Bitmap($w_step2)
$e_step2.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)

# North: Stand = box 0, Step1 = box 2, Step2 = box 3 (or 4)
$n_stand = [PeasantProcessor]::ExtractAndClean($src, $nBoxes[0], 48, 48, $charH, $pal)
$n_step1 = [PeasantProcessor]::ExtractAndClean($src, $nBoxes[2], 48, 48, $charH, $pal)
$nTargetBox = if ($nBoxes.Length -gt 4) { $nBoxes[4] } else { $nBoxes[3] }
$n_step2 = [PeasantProcessor]::ExtractAndClean($src, $nTargetBox, 48, 48, $charH, $pal)

# Build RMMZ Character Sheet (144x192: 3 cols x 4 rows)
$sheet = New-Object Drawing.Bitmap(144, 192, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sg = [Drawing.Graphics]::FromImage($sheet)

# Row 0: South (Step1, Stand, Step2)
$sg.DrawImage($s_step1, 0, 0)
$sg.DrawImage($s_stand, 48, 0)
$sg.DrawImage($s_step2, 96, 0)

# Row 1: West (Step1, Stand, Step2)
$sg.DrawImage($w_step1, 0, 48)
$sg.DrawImage($w_stand, 48, 48)
$sg.DrawImage($w_step2, 96, 48)

# Row 2: East (Step1, Stand, Step2)
$sg.DrawImage($e_step1, 0, 96)
$sg.DrawImage($e_stand, 48, 96)
$sg.DrawImage($e_step2, 96, 96)

# Row 3: North (Step1, Stand, Step2)
$sg.DrawImage($n_step1, 0, 144)
$sg.DrawImage($n_stand, 48, 144)
$sg.DrawImage($n_step2, 96, 144)

$sg.Dispose()
$src.Dispose()

# Save to game
$sheet.Save("$gameCharDir\`$Adam.png", [Drawing.Imaging.ImageFormat]::Png)
$sheet.Save("$gameCharDir\`$Eve.png", [Drawing.Imaging.ImageFormat]::Png)
$sheet.Save("$gameCharDir\`$U7_Townsman.png", [Drawing.Imaging.ImageFormat]::Png)
Write-Host "Exported character sheet to `$Adam.png, `$Eve.png, `$U7_Townsman.png"

# Save review walk sheet at 3x
$sheet3x = [PeasantProcessor]::ScaleNN($sheet, 3)
$sheet3x.Save("$revDir\peasant_walk_sheet_3x.png", [Drawing.Imaging.ImageFormat]::Png)
$sheet3x.Dispose()

# Build comprehensive review showcase:
# Show side-by-side with Locke reference, and alongside the 1-square objects on game grass
$showcaseW = 900; $showcaseH = 520
$showcase = New-Object Drawing.Bitmap($showcaseW, $showcaseH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$scg = [Drawing.Graphics]::FromImage($showcase)
$scg.Clear([Drawing.Color]::FromArgb(255, 20, 24, 30))

$fontTitle = New-Object Drawing.Font("Consolas", 14, [Drawing.FontStyle]::Bold)
$fontSub = New-Object Drawing.Font("Consolas", 10, [Drawing.FontStyle]::Regular)
$brushWhite = New-Object Drawing.SolidBrush([Drawing.Color]::White)
$brushDim = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 180, 190, 200))
$brushGreen = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 120, 220, 120))

$scg.DrawString("FF6-STYLE PEASANT SETTLER (ULTIMA VII COLOR SCHEME)", $fontTitle, $brushWhite, 30, 20)
$scg.DrawString("Authentic 16-bit SNES JRPG facial anatomy, serious stoic expression, U7 homespun & leather palette", $fontSub, $brushDim, 30, 46)

# Load Locke reference
$lockeBmp = [Drawing.Bitmap]::FromFile("c:\Users\snewt\OneDrive\Desktop\UF\reference\locke_sample.png")
$locke3x = [PeasantProcessor]::ScaleNN($lockeBmp, 3)
$scg.DrawImage($locke3x, 40, 90)
$scg.DrawString("FF6 Reference (Locke)", $fontSub, $brushDim, 30, 250)
$lockeBmp.Dispose()
$locke3x.Dispose()

# Draw Peasant Stand frame at 3x next to Locke
$peasantStand3x = [PeasantProcessor]::ScaleNN($s_stand, 3)
$scg.DrawImage($peasantStand3x, 180, 90)
$scg.DrawString("Peasant Stand (3x in-game)", $fontSub, $brushGreen, 150, 250)
$peasantStand3x.Dispose()

# Draw 4-direction walk cycle showcase (3x scale)
$scg.DrawString("4-DIRECTION WALKING CYCLE (3x in-game scale):", $fontSub, $brushWhite, 380, 90)

# South walk
$s1_3x = [PeasantProcessor]::ScaleNN($s_step1, 3)
$s2_3x = [PeasantProcessor]::ScaleNN($s_stand, 3)
$s3_3x = [PeasantProcessor]::ScaleNN($s_step2, 3)
$scg.DrawImage($s1_3x, 380, 120)
$scg.DrawImage($s2_3x, 450, 120)
$scg.DrawImage($s3_3x, 520, 120)
$scg.DrawString("South", $fontSub, $brushDim, 590, 150)

# West walk
$w1_3x = [PeasantProcessor]::ScaleNN($w_step1, 3)
$w2_3x = [PeasantProcessor]::ScaleNN($w_stand, 3)
$w3_3x = [PeasantProcessor]::ScaleNN($w_step2, 3)
$scg.DrawImage($w1_3x, 380, 200)
$scg.DrawImage($w2_3x, 450, 200)
$scg.DrawImage($w3_3x, 520, 200)
$scg.DrawString("West", $fontSub, $brushDim, 590, 230)

# North walk
$n1_3x = [PeasantProcessor]::ScaleNN($n_step1, 3)
$n2_3x = [PeasantProcessor]::ScaleNN($n_stand, 3)
$n3_3x = [PeasantProcessor]::ScaleNN($n_step2, 3)
$scg.DrawImage($n1_3x, 380, 280)
$scg.DrawImage($n2_3x, 450, 280)
$scg.DrawImage($n3_3x, 520, 280)
$scg.DrawString("North", $fontSub, $brushDim, 590, 310)

# In-world scale verification against 1-square objects (bed, campfire, berry bush, oak)
$scg.DrawString("PROPORTIONS CHECK: Peasant (34px) next to Bed (44px), Campfire (44px), Oak (46px):", $fontSub, $brushWhite, 30, 380)

# Draw ground strip
$stripBrush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 45, 65, 35))
$scg.FillRectangle($stripBrush, 30, 410, 840, 80)

# Load 1-square objects
$bedBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_Straw_Bed.png")
$campBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_Campfire.png")
$bushBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_BerryBush.png")
$oakBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$TimberOak.png")

# Draw in a row at 1x
$scg.DrawImage($oakBmp, 50, 425, 48, 48)
$scg.DrawImage($campBmp, 120, 425, 48, 48)
$scg.DrawImage($s_stand, 190, 425, 48, 48)
$scg.DrawImage($bedBmp, 250, 425, 48, 48)
$scg.DrawImage($bushBmp, 320, 425, 48, 48)

$scg.DrawString("<- 1x Native Game Resolution (each object 48x48 cell)", $fontSub, $brushDim, 390, 440)

# Dispose
$scg.Dispose()
$bedBmp.Dispose()
$campBmp.Dispose()
$bushBmp.Dispose()
$oakBmp.Dispose()

$showcase.Save("$revDir\ff6_peasant_showcase.png", [Drawing.Imaging.ImageFormat]::Png)
$showcase.Dispose()

Write-Host "SUCCESS: Created $revDir\ff6_peasant_showcase.png"
