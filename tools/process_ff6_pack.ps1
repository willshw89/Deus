Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;

public class ImageProcessor {
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
        return (r > 165 && g < 85 && b > 165);
    }

    public static Bitmap CropAndFit(Bitmap src, int targetW, int targetH, int maxDimension, int[][] palette, bool anchorBottom) {
        int minX = src.Width, maxX = 0, minY = src.Height, maxY = 0;
        for (int y = 0; y < src.Height; y++) {
            for (int x = 0; x < src.Width; x++) {
                Color c = src.GetPixel(x, y);
                if (!IsMagenta(c.R, c.G, c.B)) {
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
                        if (IsMagenta(c.R, c.G, c.B)) {
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

    public static Bitmap ExtractCell(Bitmap sheet, int col, int row, int cols, int rows, int targetW, int targetH, int maxDim, int[][] palette) {
        int cellW = sheet.Width / cols;
        int cellH = sheet.Height / rows;
        int startX = col * cellW;
        int startY = row * cellH;

        using (Bitmap sub = new Bitmap(cellW, cellH, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(sub)) {
                g.DrawImage(sheet, new Rectangle(0, 0, cellW, cellH), new Rectangle(startX, startY, cellW, cellH), GraphicsUnit.Pixel);
            }
            return CropAndFit(sub, targetW, targetH, maxDim, palette, true);
        }
    }
}
"@ -ReferencedAssemblies "System.Drawing"

$brainDir = "C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd"
$gameCharDir = "c:\Users\snewt\OneDrive\Desktop\UF\game\img\characters"
$revDir = "c:\Users\snewt\OneDrive\Desktop\UF\art\review"
$hexPath = "c:\Users\snewt\OneDrive\Desktop\UF\art\palette\uf.hex"

$pal = [ImageProcessor]::LoadPalette($hexPath)
Write-Host "Loaded $($pal.Length) colors from uf.hex"

# 1. PROCESS WORLD OBJECTS (fitting 48x48 single square)
function ProcessObject($name, $filePattern, $maxDim, $is3Col) {
    $imgFile = (Get-ChildItem "$brainDir\$filePattern" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
    Write-Host "Processing $name from $imgFile (maxDim=$maxDim)..."
    $src = [Drawing.Bitmap]::FromFile($imgFile)
    
    # 48x48 single tile frame
    $frame48 = [ImageProcessor]::CropAndFit($src, 48, 48, $maxDim, $pal, $true)
    $src.Dispose()

    # If 3-column sheet required (e.g. for RMMZ !$)
    $sheetW = if ($is3Col) { 144 } else { 48 }
    $sheet = New-Object Drawing.Bitmap($sheetW, 48, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [Drawing.Graphics]::FromImage($sheet)
    if ($is3Col) {
        $g.DrawImage($frame48, 0, 0)
        $g.DrawImage($frame48, 48, 0)
        $g.DrawImage($frame48, 96, 0)
    } else {
        $g.DrawImage($frame48, 0, 0)
    }
    $g.Dispose()

    # Save to game
    $gamePng = "$gameCharDir\!`$$name.png"
    $sheet.Save($gamePng, [Drawing.Imaging.ImageFormat]::Png)

    # Save review copies
    $rev3x = [ImageProcessor]::ScaleNN($frame48, 3)
    $rev8x = [ImageProcessor]::ScaleNN($frame48, 8)
    $rev3x.Save("$revDir\!`$${name}_3x.png", [Drawing.Imaging.ImageFormat]::Png)
    $rev8x.Save("$revDir\!`$${name}_8x.png", [Drawing.Imaging.ImageFormat]::Png)

    $frame48.Dispose()
    $sheet.Dispose()
    $rev3x.Dispose()
    $rev8x.Dispose()
    Write-Host "Saved $name to $gamePng"
}

# Campfire: circular hearth, fit inside 46px
ProcessObject "UF_Campfire" "ff6_campfire_*.jpg" 44 $false
ProcessObject "UF_BerryBush" "ff6_berry_bush_*.jpg" 44 $false
ProcessObject "UF_Straw_Bed" "ff6_straw_bed_*.jpg" 44 $false
ProcessObject "TimberOak" "ff6_oak_tree_*.jpg" 46 $false

# 2. PROCESS CHARACTER WALKING SHEET (144x192: 3 cols x 4 rows)
$walkSheetFile = (Get-ChildItem "$brainDir\settler_walk_sheet_*.jpg" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Host "Processing character walk sheet from $walkSheetFile..."
$srcWalk = [Drawing.Bitmap]::FromFile($walkSheetFile)

# Walk sheet grid: 8 cols x 4 rows
# Row 0 = South (facing forward)
# Row 1 = West (facing left)
# Row 2 = East (facing right) - or flip West
# Row 3 = North (facing back)

# Target: 144x192 (each frame 48x48, character height = 34px, so they look in-scale with beds/trees!)
$charSheet = New-Object Drawing.Bitmap(144, 192, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cg = [Drawing.Graphics]::FromImage($charSheet)

$charHeight = 34 # Intentionally scaled so beds and trees feel grand!

# Row 0: South (Front) -> frames: col 0 = step1, col 2 = stand, col 4 = step2
$s_step1 = [ImageProcessor]::ExtractCell($srcWalk, 0, 0, 8, 4, 48, 48, $charHeight, $pal)
$s_stand = [ImageProcessor]::ExtractCell($srcWalk, 2, 0, 8, 4, 48, 48, $charHeight, $pal)
$s_step2 = [ImageProcessor]::ExtractCell($srcWalk, 4, 0, 8, 4, 48, 48, $charHeight, $pal)

$cg.DrawImage($s_step1, 0, 0)
$cg.DrawImage($s_stand, 48, 0)
$cg.DrawImage($s_step2, 96, 0)

# Row 1: West (Left) -> frames from row 1
$w_step1 = [ImageProcessor]::ExtractCell($srcWalk, 0, 1, 8, 4, 48, 48, $charHeight, $pal)
$w_stand = [ImageProcessor]::ExtractCell($srcWalk, 1, 1, 8, 4, 48, 48, $charHeight, $pal)
$w_step2 = [ImageProcessor]::ExtractCell($srcWalk, 3, 1, 8, 4, 48, 48, $charHeight, $pal)

$cg.DrawImage($w_step1, 0, 48)
$cg.DrawImage($w_stand, 48, 48)
$cg.DrawImage($w_step2, 96, 48)

# Row 2: East (Right) -> horizontally flip West frames
$e_step1 = New-Object Drawing.Bitmap($w_step1)
$e_step1.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)
$e_stand = New-Object Drawing.Bitmap($w_stand)
$e_stand.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)
$e_step2 = New-Object Drawing.Bitmap($w_step2)
$e_step2.RotateFlip([Drawing.RotateFlipType]::RotateNoneFlipX)

$cg.DrawImage($e_step1, 0, 96)
$cg.DrawImage($e_stand, 48, 96)
$cg.DrawImage($e_step2, 96, 96)

# Row 3: North (Back) -> frames from row 3
$n_step1 = [ImageProcessor]::ExtractCell($srcWalk, 0, 3, 8, 4, 48, 48, $charHeight, $pal)
$n_stand = [ImageProcessor]::ExtractCell($srcWalk, 2, 3, 8, 4, 48, 48, $charHeight, $pal)
$n_step2 = [ImageProcessor]::ExtractCell($srcWalk, 4, 3, 8, 4, 48, 48, $charHeight, $pal)

$cg.DrawImage($n_step1, 0, 144)
$cg.DrawImage($n_stand, 48, 144)
$cg.DrawImage($n_step2, 96, 144)

$cg.Dispose()
$srcWalk.Dispose()

# Save character walk sheets for game
$charSheet.Save("$gameCharDir\`$Adam.png", [Drawing.Imaging.ImageFormat]::Png)
$charSheet.Save("$gameCharDir\`$Eve.png", [Drawing.Imaging.ImageFormat]::Png)
$charSheet.Save("$gameCharDir\`$U7_Townsman.png", [Drawing.Imaging.ImageFormat]::Png)

Write-Host "Saved walk sheet to `$Adam.png, `$Eve.png, `$U7_Townsman.png"

# Save review walk sheet at 3x
$charRev3x = [ImageProcessor]::ScaleNN($charSheet, 3)
$charRev3x.Save("$revDir\settler_walk_sheet_3x.png", [Drawing.Imaging.ImageFormat]::Png)
$charRev3x.Dispose()

# 3. BUILD IN-GAME SCENE SHOWCASE (Character on grass next to bed, campfire, berry bush, oak)
$sceneW = 860; $sceneH = 500
$scene = New-Object Drawing.Bitmap($sceneW, $sceneH, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$sg = [Drawing.Graphics]::FromImage($scene)
$sg.Clear([Drawing.Color]::FromArgb(255, 20, 24, 30))

# Blit helper
function BlitAlpha($bmp, $x, $y) {
    $sg.DrawImage($bmp, $x, $y)
}

# Add title banner
$titleBrush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 220, 225, 235))
$font = New-Object Drawing.Font("Consolas", 14, [Drawing.FontStyle]::Bold)
$sg.DrawString("FINAL FANTASY VI 1-SQUARE TILE ASSETS (ULTIMA VII PALETTE)", $font, $titleBrush, 30, 20)

$subFont = New-Object Drawing.Font("Consolas", 10, [Drawing.FontStyle]::Regular)
$subBrush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(255, 140, 150, 170))
$sg.DrawString("1-Square Containment (48x48) + Smaller Proportional Character (34px) + Full Walk Sheet", $subFont, $subBrush, 30, 48)

# Row 1: Single 48x48 Tile Objects at 3x scale (144x144 each)
$oakBmp = [Drawing.Bitmap]::FromFile("$revDir\!`$TimberOak_3x.png")
$campBmp = [Drawing.Bitmap]::FromFile("$revDir\!`$UF_Campfire_3x.png")
$bushBmp = [Drawing.Bitmap]::FromFile("$revDir\!`$UF_BerryBush_3x.png")
$bedBmp = [Drawing.Bitmap]::FromFile("$revDir\!`$UF_Straw_Bed_3x.png")

BlitAlpha $oakBmp 30 90
BlitAlpha $campBmp 200 90
BlitAlpha $bushBmp 370 90
BlitAlpha $bedBmp 540 90

# Character Stand Frame (Front) at 3x scale next to bed
$standFront = [ImageProcessor]::ScaleNN($s_stand, 3)
BlitAlpha $standFront 710 90

# Row 2: Character Walk Cycle in 4 Directions (3 columns x 4 rows) at 2x scale
$walkCycle2x = [ImageProcessor]::ScaleNN($charSheet, 2)
BlitAlpha $walkCycle2x 30 250

# Explanatory text next to walk sheet
$txtX = 350; $txtY = 260
$sg.DrawString("CHARACTER WALKING ANIMATION SHEET:", $font, $titleBrush, $txtX, $txtY)
$sg.DrawString("- S (Front): Step 1 | Stand | Step 2", $subFont, $subBrush, $txtX, $txtY + 30)
$sg.DrawString("- W (Left):  Step 1 | Stand | Step 2", $subFont, $subBrush, $txtX, $txtY + 50)
$sg.DrawString("- E (Right): Step 1 | Stand | Step 2", $subFont, $subBrush, $txtX, $txtY + 70)
$sg.DrawString("- N (Back):  Step 1 | Stand | Step 2", $subFont, $subBrush, $txtX, $txtY + 90)
$sg.DrawString("Scale: Intentionally sized to 34px tall so beds, hearths, and trees feel substantial and grand.", $subFont, $subBrush, $txtX, $txtY + 120)

$sg.Dispose()
$scene.Save("$revDir\ff6_game_ready_showcase.png", [Drawing.Imaging.ImageFormat]::Png)
$scene.Dispose()
Write-Host "Created $revDir\ff6_game_ready_showcase.png successfully!"

