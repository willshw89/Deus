Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;

public class StoneWallBuilder {
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

    public static Bitmap BuildStoneFromWood(Bitmap woodSheet, string hexPath) {
        int[][] palette = LoadPalette(hexPath);
        Bitmap stoneSheet = new Bitmap(woodSheet.Width, woodSheet.Height, PixelFormat.Format32bppArgb);

        for (int y = 0; y < woodSheet.Height; y++) {
            for (int x = 0; x < woodSheet.Width; x++) {
                Color c = woodSheet.GetPixel(x, y);
                if (c.A > 30) {
                    // Convert wood brown tones to cool stone grey tones
                    int lum = (int)(0.299 * c.R + 0.587 * c.G + 0.114 * c.B);
                    // Add slight cool tint (stone)
                    int sr = Math.Min(255, (int)(lum * 0.95));
                    int sg = Math.Min(255, (int)(lum * 0.95));
                    int sb = Math.Min(255, (int)(lum * 1.02));

                    int[] p = NearestColor(sr, sg, sb, palette);
                    stoneSheet.SetPixel(x, y, Color.FromArgb(255, p[0], p[1], p[2]));
                }
            }
        }
        return stoneSheet;
    }
}
"@ -ReferencedAssemblies System.Drawing

$wood = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'game/img/characters/!$WallWood_Set.png'))
$stone = [StoneWallBuilder]::BuildStoneFromWood($wood, 'art/palette/uf.hex')
$wood.Dispose()

$dest = 'game/img/characters/!' + [char]36 + 'WallStone_Set.png'
$stone.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)

# Also save review preview
$stone.Save('art/review/new_wall_stone_set_sheet.png', [System.Drawing.Imaging.ImageFormat]::Png)
$stone.Dispose()

Write-Host "Stone wall set generated and deployed to $dest"
