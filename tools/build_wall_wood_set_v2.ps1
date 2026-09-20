Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;

public class WallSetBuilderV2 {
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

    public static Bitmap MakeBaseHorizontalTile(string srcPath, int[][] palette) {
        // Take a 246x246 crop of the top continuous wall banner from the AI image
        using (Bitmap src = new Bitmap(srcPath)) {
            Bitmap scaled = new Bitmap(48, 48, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(scaled)) {
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(src, new Rectangle(0, 0, 48, 48), new Rectangle(100, 0, 246, 246), GraphicsUnit.Pixel);
            }

            Bitmap snapped = new Bitmap(48, 48, PixelFormat.Format32bppArgb);
            for (int y = 0; y < 48; y++) {
                for (int x = 0; x < 48; x++) {
                    Color c = scaled.GetPixel(x, y);
                    int[] p = NearestColor(c.R, c.G, c.B, palette);
                    snapped.SetPixel(x, y, Color.FromArgb(255, p[0], p[1], p[2]));
                }
            }
            scaled.Dispose();
            return snapped;
        }
    }

    public static Bitmap BuildSheet(string srcPath, string hexPath) {
        int[][] palette = LoadPalette(hexPath);
        Bitmap baseHoriz = MakeBaseHorizontalTile(srcPath, palette); // 48x48

        int fw = 48, fh = 48;
        Bitmap sheet = new Bitmap(fw * 4, fh * 5, PixelFormat.Format32bppArgb); // 192x240

        Bitmap[] frames = new Bitmap[20];
        for (int i = 0; i < 20; i++) {
            frames[i] = new Bitmap(fw, fh, PixelFormat.Format32bppArgb);
        }

        // Base horizontal wall:
        // Top 16px is Roof Cap: y = 0..15
        // Bottom 32px is Front Wall: y = 16..47

        // Frame 10: Horizontal Run (East + West) - North wall of room
        // Frame 16: South Horizontal Run (East + West) - South wall of room
        using (Graphics g10 = Graphics.FromImage(frames[10])) { g10.DrawImage(baseHoriz, 0, 0); }
        using (Graphics g16 = Graphics.FromImage(frames[16])) { g16.DrawImage(baseHoriz, 0, 0); }

        // Frame 8: East End-Cap (West connection only)
        // Frame 18: South Wall East End-Cap
        using (Graphics g8 = Graphics.FromImage(frames[8])) {
            g8.DrawImage(baseHoriz, 0, 0);
            // Mask out right side past x=35 with transparency
            for (int y = 0; y < 48; y++) {
                // Post border at x=35
                frames[8].SetPixel(35, y, Color.FromArgb(255, 30, 15, 0));
                for (int x = 36; x < 48; x++) {
                    frames[8].SetPixel(x, y, Color.Transparent);
                }
            }
        }
        using (Graphics g18 = Graphics.FromImage(frames[18])) { g18.DrawImage(frames[8], 0, 0); }

        // Frame 2: West End-Cap (East connection only)
        // Frame 19: South Wall West End-Cap
        using (Graphics g2 = Graphics.FromImage(frames[2])) {
            g2.DrawImage(baseHoriz, 0, 0);
            // Mask out left side before x=12 with transparency
            for (int y = 0; y < 48; y++) {
                for (int x = 0; x < 12; x++) {
                    frames[2].SetPixel(x, y, Color.Transparent);
                }
                frames[2].SetPixel(12, y, Color.FromArgb(255, 30, 15, 0));
            }
        }
        using (Graphics g19 = Graphics.FromImage(frames[19])) { g19.DrawImage(frames[2], 0, 0); }

        // Frame 5: Vertical Wall Run (North + South)
        // A vertical wall connecting top to bottom (width: x=10 to 37)
        for (int y = 0; y < 48; y++) {
            for (int x = 12; x <= 35; x++) {
                // We use vertical timber planks from baseHoriz
                Color c = baseHoriz.GetPixel(x, (y % 32) + 16);
                // Darken right edge slightly for 3D depth
                if (x >= 32) {
                    int r = Math.Max(0, c.R - 20);
                    int g = Math.Max(0, c.G - 18);
                    int b = Math.Max(0, c.B - 15);
                    c = Color.FromArgb(255, r, g, b);
                }
                frames[5].SetPixel(x, y, c);
            }
            frames[5].SetPixel(11, y, Color.FromArgb(255, 30, 15, 0));
            frames[5].SetPixel(36, y, Color.FromArgb(255, 30, 15, 0));
        }

        // Frame 6: NW Corner (connects East & South)
        // Top has roof cap (y=0..15, x=11..47)
        // Right has front wall (y=16..47, x=11..47)
        // Left is the vertical wall continuing South
        using (Graphics g6 = Graphics.FromImage(frames[6])) {
            g6.DrawImage(baseHoriz, 0, 0);
            // Mask out left side outside the corner (x < 11)
            for (int y = 0; y < 48; y++) {
                for (int x = 0; x < 11; x++) {
                    frames[6].SetPixel(x, y, Color.Transparent);
                }
                frames[6].SetPixel(11, y, Color.FromArgb(255, 30, 15, 0));
            }
        }

        // Frame 12: NE Corner (connects West & South)
        // Top has roof cap (y=0..15, x=0..36)
        // Left has front wall (y=16..47, x=0..36)
        // Right is the vertical wall continuing South
        using (Graphics g12 = Graphics.FromImage(frames[12])) {
            g12.DrawImage(baseHoriz, 0, 0);
            for (int y = 0; y < 48; y++) {
                frames[12].SetPixel(36, y, Color.FromArgb(255, 30, 15, 0));
                for (int x = 37; x < 48; x++) {
                    frames[12].SetPixel(x, y, Color.Transparent);
                }
            }
        }

        // Frame 3: SW Corner (connects North & East)
        using (Graphics g3 = Graphics.FromImage(frames[3])) {
            g3.DrawImage(baseHoriz, 0, 0);
            for (int y = 0; y < 48; y++) {
                for (int x = 0; x < 11; x++) {
                    frames[3].SetPixel(x, y, Color.Transparent);
                }
                frames[3].SetPixel(11, y, Color.FromArgb(255, 30, 15, 0));
            }
        }

        // Frame 9: SE Corner (connects North & West)
        using (Graphics g9 = Graphics.FromImage(frames[9])) {
            g9.DrawImage(baseHoriz, 0, 0);
            for (int y = 0; y < 48; y++) {
                frames[9].SetPixel(36, y, Color.FromArgb(255, 30, 15, 0));
                for (int x = 37; x < 48; x++) {
                    frames[9].SetPixel(x, y, Color.Transparent);
                }
            }
        }

        // Frame 7: T-Junction East (N + E + S)
        using (Graphics g7 = Graphics.FromImage(frames[7])) {
            g7.DrawImage(frames[5], 0, 0);
            // East branch
            for (int y = 0; y < 48; y++) {
                for (int x = 36; x < 48; x++) {
                    frames[7].SetPixel(x, y, baseHoriz.GetPixel(x, y));
                }
            }
        }

        // Frame 13: T-Junction West (N + S + W)
        using (Graphics g13 = Graphics.FromImage(frames[13])) {
            g13.DrawImage(frames[5], 0, 0);
            // West branch
            for (int y = 0; y < 48; y++) {
                for (int x = 0; x < 12; x++) {
                    frames[13].SetPixel(x, y, baseHoriz.GetPixel(x, y));
                }
            }
        }

        // Frame 14: T-Junction South (E + S + W)
        using (Graphics g14 = Graphics.FromImage(frames[14])) {
            g14.DrawImage(baseHoriz, 0, 0);
        }

        // Frame 11: T-Junction North (N + E + W)
        using (Graphics g11 = Graphics.FromImage(frames[11])) {
            g11.DrawImage(baseHoriz, 0, 0);
        }

        // Frame 15: 4-Way Intersection (N + S + E + W)
        using (Graphics g15 = Graphics.FromImage(frames[15])) {
            g15.DrawImage(baseHoriz, 0, 0);
        }

        // Frame 0: Isolated Post
        using (Graphics g0 = Graphics.FromImage(frames[0])) {
            for (int y = 0; y < 48; y++) {
                for (int x = 12; x <= 35; x++) {
                    frames[0].SetPixel(x, y, baseHoriz.GetPixel(x, y));
                }
                frames[0].SetPixel(11, y, Color.FromArgb(255, 30, 15, 0));
                frames[0].SetPixel(36, y, Color.FromArgb(255, 30, 15, 0));
            }
        }

        // Frame 1: North only
        using (Graphics g1 = Graphics.FromImage(frames[1])) { g1.DrawImage(frames[0], 0, 0); }
        // Frame 4: South only
        using (Graphics g4 = Graphics.FromImage(frames[4])) { g4.DrawImage(frames[0], 0, 0); }

        // Assemble into 192x240 sheet
        using (Graphics gSheet = Graphics.FromImage(sheet)) {
            gSheet.Clear(Color.Transparent);
            for (int i = 0; i < 20; i++) {
                int col = i % 4;
                int row = i / 4;
                Bitmap f = frames[i];
                for (int y = 0; y < fh; y++) {
                    for (int x = 0; x < fw; x++) {
                        Color c = f.GetPixel(x, y);
                        if (c.A > 30) {
                            int[] p = NearestColor(c.R, c.G, c.B, palette);
                            sheet.SetPixel(col * fw + x, row * fh + y, Color.FromArgb(255, p[0], p[1], p[2]));
                        }
                    }
                }
                f.Dispose();
            }
        }

        baseHoriz.Dispose();
        return sheet;
    }

    public static Bitmap RenderTestRoom(Bitmap sheet) {
        int fw = 48, fh = 48;
        Bitmap room = new Bitmap(6 * fw, 6 * fh, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(room)) {
            g.Clear(Color.Transparent);

            Func<int, Bitmap> getFrame = idx => {
                int col = idx % 4;
                int row = idx / 4;
                Bitmap f = new Bitmap(fw, fh, PixelFormat.Format32bppArgb);
                using (Graphics gf = Graphics.FromImage(f)) {
                    gf.DrawImage(sheet, new Rectangle(0, 0, fw, fh), new Rectangle(col * fw, row * fh, fw, fh), GraphicsUnit.Pixel);
                }
                return f;
            };

            // Top North Wall:
            // (0,0) = Frame 6 (NW)
            // (1..4, 0) = Frame 10 (horizontal wall: roof top, wall below)
            // (5,0) = Frame 12 (NE)
            using (Bitmap f = getFrame(6)) { g.DrawImage(f, 0 * fw, 0 * fh); }
            for (int x = 1; x <= 4; x++) {
                using (Bitmap f = getFrame(10)) { g.DrawImage(f, x * fw, 0 * fh); }
            }
            using (Bitmap f = getFrame(12)) { g.DrawImage(f, 5 * fw, 0 * fh); }

            // Vertical Side Walls:
            for (int y = 1; y <= 4; y++) {
                using (Bitmap f = getFrame(5)) { g.DrawImage(f, 0 * fw, y * fh); }
                using (Bitmap f = getFrame(5)) { g.DrawImage(f, 5 * fw, y * fh); }
            }

            // Bottom South Wall:
            // (0,5) = Frame 3 (SW)
            // (1..2, 5) = Frame 16 (South wall: roof top, wall below)
            // (3,5) = Door opening
            // (4,5) = Frame 16
            // (5,5) = Frame 9 (SE)
            using (Bitmap f = getFrame(3)) { g.DrawImage(f, 0 * fw, 5 * fh); }
            using (Bitmap f = getFrame(16)) { g.DrawImage(f, 1 * fw, 5 * fh); }
            using (Bitmap f = getFrame(16)) { g.DrawImage(f, 2 * fw, 5 * fh); }
            using (Bitmap f = getFrame(16)) { g.DrawImage(f, 4 * fw, 5 * fh); }
            using (Bitmap f = getFrame(9)) { g.DrawImage(f, 5 * fw, 5 * fh); }
        }
        return room;
    }
}
"@ -ReferencedAssemblies System.Drawing

$src = 'C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_wood_wall_1789791709973.jpg'
$hex = 'art\palette\uf.hex'

$sheet = [WallSetBuilderV2]::BuildSheet($src, $hex)
$room = [WallSetBuilderV2]::RenderTestRoom($sheet)

# Save sheet to review
$sheet.Save('art\review\new_wall_wood_set_sheet.png', [System.Drawing.Imaging.ImageFormat]::Png)

# Save 2x room preview
$room2x = New-Object System.Drawing.Bitmap ($room.Width * 2), ($room.Height * 2), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($room2x)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($room, 0, 0, $room.Width * 2, $room.Height * 2)
$g.Dispose()

$room2x.Save('art\review\new_wood_wall_test_room.png', [System.Drawing.Imaging.ImageFormat]::Png)

$room2x.Dispose()
$room.Dispose()
$sheet.Dispose()

Write-Host "Re-rendered wall set and room preview."
