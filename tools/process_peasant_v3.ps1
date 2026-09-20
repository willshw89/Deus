Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;

public class PeasantV3 {
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

    // Extract exact sprite using BFS connected component starting from center of rect
    public static Bitmap ExtractConnectedSprite(Bitmap src, Rectangle boundHint, int targetW, int targetH, int targetCharHeight, int[][] palette) {
        int w = src.Width, h = src.Height;
        bool[,] inBlob = new bool[w, h];
        bool[,] visited = new bool[w, h];

        // Seed BFS near center of hint
        int seedX = boundHint.X + boundHint.Width / 2;
        int seedY = boundHint.Y + boundHint.Height / 2;

        // Find closest non-bg pixel to seed
        Point seed = Point.Empty;
        for (int r = 0; r < 50; r++) {
            for (int offsetDy = -r; offsetDy <= r; offsetDy++) {
                for (int offsetDx = -r; offsetDx <= r; offsetDx++) {
                    int cx = seedX + offsetDx;
                    int cy = seedY + offsetDy;
                    if (cx >= boundHint.X && cx < boundHint.Right && cy >= boundHint.Y && cy < boundHint.Bottom) {
                        Color c = src.GetPixel(cx, cy);
                        if (!IsBg(c.R, c.G, c.B)) {
                            seed = new Point(cx, cy);
                            break;
                        }
                    }
                }
                if (seed != Point.Empty) break;
            }
            if (seed != Point.Empty) break;
        }

        if (seed == Point.Empty) return new Bitmap(targetW, targetH);

        Queue<Point> q = new Queue<Point>();
        q.Enqueue(seed);
        visited[seed.X, seed.Y] = true;

        int minX = seed.X, maxX = seed.X, minY = seed.Y, maxY = seed.Y;

        while (q.Count > 0) {
            Point p = q.Dequeue();
            inBlob[p.X, p.Y] = true;
            if (p.X < minX) minX = p.X;
            if (p.X > maxX) maxX = p.X;
            if (p.Y < minY) minY = p.Y;
            if (p.Y > maxY) maxY = p.Y;

            int px = p.X, py = p.Y;
            Point[] neighbors = new Point[] {
                new Point(px - 1, py), new Point(px + 1, py),
                new Point(px, py - 1), new Point(px, py + 1)
            };

            foreach (Point np in neighbors) {
                // Constrain within boundHint vertically to never jump across rows
                if (np.X >= 0 && np.X < w && np.Y >= boundHint.Y && np.Y < boundHint.Bottom && !visited[np.X, np.Y]) {
                    visited[np.X, np.Y] = true;
                    Color c = src.GetPixel(np.X, np.Y);
                    if (!IsBg(c.R, c.G, c.B)) {
                        q.Enqueue(np);
                    }
                }
            }
        }

        int bw = maxX - minX + 1;
        int bh = maxY - minY + 1;
        if (bw <= 0 || bh <= 0) return new Bitmap(targetW, targetH);

        double scale = (double)targetCharHeight / bh;
        int dw = Math.Max(1, (int)Math.Round(bw * scale));
        int dh = targetCharHeight;

        int dx = (targetW - dw) / 2;
        int dy = targetH - dh - 2; // Foot 2px from bottom

        Bitmap canvas = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(canvas)) {
            g.Clear(Color.Transparent);
            g.InterpolationMode = InterpolationMode.NearestNeighbor;
            g.PixelOffsetMode = PixelOffsetMode.Half;

            using (Bitmap cropped = new Bitmap(bw, bh, PixelFormat.Format32bppArgb)) {
                for (int y = 0; y < bh; y++) {
                    for (int x = 0; x < bw; x++) {
                        int sx = minX + x;
                        int sy = minY + y;
                        if (!inBlob[sx, sy]) {
                            cropped.SetPixel(x, y, Color.Transparent);
                        } else {
                            Color c = src.GetPixel(sx, sy);
                            if (IsFringe(c.R, c.G, c.B)) {
                                cropped.SetPixel(x, y, Color.Transparent);
                            } else {
                                int[] p = NearestColor(c.R, c.G, c.B, palette);
                                cropped.SetPixel(x, y, Color.FromArgb(255, p[0], p[1], p[2]));
                            }
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

$pal = [PeasantV3]::LoadPalette($hexPath)
$peasantImgFile = (Get-ChildItem "$brainDir\ff6_u7_peasant_sheet_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Host "Processing peasant sheet from $peasantImgFile..."
$src = [Drawing.Bitmap]::FromFile($peasantImgFile)

$charH = 34

# Exact bounding hints per row:
# Row 0 (South): Y from 5 to 255
# Row 1 (West): Y from 265 to 515
# Row 3 (North): Y from 770 to 1023

# South frames:
# Stand: X ~ 8..160
# Step 1: X ~ 180..330
# Step 2: X ~ 350..500
$s_stand = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(8, 5, 152, 250)), 48, 48, $charH, $pal)
$s_step1 = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(180, 5, 150, 250)), 48, 48, $charH, $pal)
$s_step2 = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(350, 5, 150, 250)), 48, 48, $charH, $pal)

# West frames (Cols 3, 4, 5 in raw sheet, which ALL face West/Left):
# Stand: X ~ 530..670 (West[3])
# Step 1: X ~ 700..840 (West[4])
# Step 2: X ~ 870..1010 (West[5])
$w_stand = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(530, 265, 140, 250)), 48, 48, $charH, $pal)
$w_step1 = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(700, 265, 140, 250)), 48, 48, $charH, $pal)
$w_step2 = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(870, 265, 140, 250)), 48, 48, $charH, $pal)

# East frames: flipped West
$e_stand = New-Object Drawing.Bitmap($w_stand)
$e_stand.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)
$e_step1 = New-Object Drawing.Bitmap($w_step1)
$e_step1.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)
$e_step2 = New-Object Drawing.Bitmap($w_step2)
$e_step2.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)

# North frames:
# Stand: X ~ 190..340, Y ~ 770..1023
# Step 1: X ~ 30..180, Y ~ 770..1023
# Step 2: X ~ 340..500, Y ~ 770..1023
$n_stand = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(190, 770, 150, 250)), 48, 48, $charH, $pal)
$n_step1 = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(30, 770, 150, 250)), 48, 48, $charH, $pal)
$n_step2 = [PeasantV3]::ExtractConnectedSprite($src, (New-Object Drawing.Rectangle(340, 770, 150, 250)), 48, 48, $charH, $pal)

$src.Dispose()

# Assemble 144x192 RMMZ single character sheet (3 cols x 4 rows)
$sheet = New-Object Drawing.Bitmap(144, 192, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sg = [Drawing.Graphics]::FromImage($sheet)

# Row 0: South (Step 1, Stand, Step 2)
$sg.DrawImage($s_step1, 0, 0)
$sg.DrawImage($s_stand, 48, 0)
$sg.DrawImage($s_step2, 96, 0)

# Row 1: West (Step 1, Stand, Step 2)
$sg.DrawImage($w_step1, 0, 48)
$sg.DrawImage($w_stand, 48, 48)
$sg.DrawImage($w_step2, 96, 48)

# Row 2: East (Step 1, Stand, Step 2)
$sg.DrawImage($e_step1, 0, 96)
$sg.DrawImage($e_stand, 48, 96)
$sg.DrawImage($e_step2, 96, 96)

# Row 3: North (Step 1, Stand, Step 2)
$sg.DrawImage($n_step1, 0, 144)
$sg.DrawImage($n_stand, 48, 144)
$sg.DrawImage($n_step2, 96, 144)

$sg.Dispose()

# Save to game
$sheet.Save("$gameCharDir\`$Adam.png", [Drawing.Imaging.ImageFormat]::Png)
$sheet.Save("$gameCharDir\`$Eve.png", [Drawing.Imaging.ImageFormat]::Png)
$sheet.Save("$gameCharDir\`$U7_Townsman.png", [Drawing.Imaging.ImageFormat]::Png)
Write-Host "Exported character sheet to `$Adam.png, `$Eve.png, `$U7_Townsman.png"

# Save 3x walk sheet
$sheet3x = [PeasantV3]::ScaleNN($sheet, 3)
$sheet3x.Save("$revDir\peasant_walk_sheet_3x.png", [Drawing.Imaging.ImageFormat]::Png)
$sheet3x.Dispose()

# Build comprehensive review showcase
$showcaseW = 920; $showcaseH = 540
$showcase = New-Object Drawing.Bitmap($showcaseW, $showcaseH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$scg = [Drawing.Graphics]::FromImage($showcase)
$scg.Clear([Drawing.Color]::FromArgb(255, 20, 24, 30))

$fontTitle = New-Object Drawing.Font("Consolas", 13, [Drawing.FontStyle]::Bold)
$fontSub = New-Object Drawing.Font("Consolas", 10, [Drawing.FontStyle]::Regular)
$brushWhite = New-Object Drawing.SolidBrush([Drawing.Color]::White)
$brushDim = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 180, 190, 200))
$brushGreen = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 120, 220, 120))

$scg.DrawString("AUTHENTIC FF6 PEASANT SPRITE SHEET (ULTIMA VII PALETTE)", $fontTitle, $brushWhite, 30, 16)
$scg.DrawString("16-bit SNES JRPG facial anatomy, serious stoic expression, 34px tall, U7 daylight colors", $fontSub, $brushDim, 30, 42)

# Locke reference
$lockeBmp = [Drawing.Bitmap]::FromFile("c:\Users\snewt\OneDrive\Desktop\UF\reference\locke_sample.png")
$locke3x = [PeasantV3]::ScaleNN($lockeBmp, 3)
$scg.DrawImage($locke3x, 40, 85)
$scg.DrawString("FF6 Reference", $fontSub, $brushDim, 35, 245)
$scg.DrawString("(Locke 16x24)", $fontSub, $brushDim, 35, 262)
$lockeBmp.Dispose()
$locke3x.Dispose()

# Peasant Stand at 3x
$peasantStand3x = [PeasantV3]::ScaleNN($s_stand, 3)
$scg.DrawImage($peasantStand3x, 190, 85)
$scg.DrawString("Peasant Stand", $fontSub, $brushGreen, 195, 245)
$scg.DrawString("(3x in-game scale)", $fontSub, $brushDim, 175, 262)
$peasantStand3x.Dispose()

# Walk cycle at 3x
$scg.DrawString("4-DIRECTION WALKING ANIMATION SHEET (3x scale):", $fontSub, $brushWhite, 380, 80)

# South
$s1_3x = [PeasantV3]::ScaleNN($s_step1, 3); $s2_3x = [PeasantV3]::ScaleNN($s_stand, 3); $s3_3x = [PeasantV3]::ScaleNN($s_step2, 3)
$scg.DrawImage($s1_3x, 380, 105); $scg.DrawImage($s2_3x, 460, 105); $scg.DrawImage($s3_3x, 540, 105)
$scg.DrawString("South (Front)", $fontSub, $brushDim, 640, 145)

# West
$w1_3x = [PeasantV3]::ScaleNN($w_step1, 3); $w2_3x = [PeasantV3]::ScaleNN($w_stand, 3); $w3_3x = [PeasantV3]::ScaleNN($w_step2, 3)
$scg.DrawImage($w1_3x, 380, 185); $scg.DrawImage($w2_3x, 460, 185); $scg.DrawImage($w3_3x, 540, 185)
$scg.DrawString("West (Left)", $fontSub, $brushDim, 640, 225)

# North
$n1_3x = [PeasantV3]::ScaleNN($n_step1, 3); $n2_3x = [PeasantV3]::ScaleNN($n_stand, 3); $n3_3x = [PeasantV3]::ScaleNN($n_step2, 3)
$scg.DrawImage($n1_3x, 380, 265); $scg.DrawImage($n2_3x, 460, 265); $scg.DrawImage($n3_3x, 540, 265)
$scg.DrawString("North (Back)", $fontSub, $brushDim, 640, 305)

# Bottom row: Proportions check against 1-square objects
$scg.DrawString("IN-GAME PROPORTIONS: Peasant (34px) with Bed (44px), Campfire (44px), Oak (46px):", $fontSub, $brushWhite, 30, 395)
$stripBrush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 42, 60, 32))
$scg.FillRectangle($stripBrush, 30, 425, 860, 90)

$bedBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_Straw_Bed.png")
$campBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_Campfire.png")
$bushBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$UF_BerryBush.png")
$oakBmp = [Drawing.Bitmap]::FromFile("$gameCharDir\!`$TimberOak.png")

# Draw at 1x
$scg.DrawImage($oakBmp, 50, 445, 48, 48)
$scg.DrawImage($campBmp, 130, 445, 48, 48)
$scg.DrawImage($s_stand, 210, 445, 48, 48)
$scg.DrawImage($bedBmp, 280, 445, 48, 48)
$scg.DrawImage($bushBmp, 360, 445, 48, 48)

$scg.DrawString("<- 1x Native In-Game Resolution (48x48 single square containment)", $fontSub, $brushDim, 430, 460)

$scg.Dispose()
$bedBmp.Dispose()
$campBmp.Dispose()
$bushBmp.Dispose()
$oakBmp.Dispose()

$showcase.Save("$revDir\ff6_peasant_showcase.png", [Drawing.Imaging.ImageFormat]::Png)
$showcase.Dispose()

Write-Host "SUCCESS: Updated $revDir\ff6_peasant_showcase.png"
