Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Collections.Generic;

public class IslandDetector {
    public static bool IsBg(Color c) {
        if (c.R > 140 && c.B > 140 && (c.R - c.G > 25) && (c.B - c.G > 25)) return true;
        if (c.R > 150 && c.B > 150 && c.G < 110) return true;
        return false;
    }

    public static List<Rectangle> FindComponents(string imgPath, int minPixels) {
        using (Bitmap bmp = new Bitmap(imgPath)) {
            int w = bmp.Width, h = bmp.Height;
            bool[,] visited = new bool[w, h];
            List<Rectangle> rects = new List<Rectangle>();

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (visited[x, y]) continue;
                    visited[x, y] = true;
                    if (IsBg(bmp.GetPixel(x, y))) continue;

                    // Flood fill
                    int minX = x, maxX = x, minY = y, maxY = y;
                    int count = 0;
                    Queue<Point> q = new Queue<Point>();
                    q.Enqueue(new Point(x, y));

                    while (q.Count > 0) {
                        Point pt = q.Dequeue();
                        count++;
                        if (pt.X < minX) minX = pt.X;
                        if (pt.X > maxX) maxX = pt.X;
                        if (pt.Y < minY) minY = pt.Y;
                        if (pt.Y > maxY) maxY = pt.Y;

                        // 4 neighbors
                        int[] dx = { 0, 0, -1, 1 };
                        int[] dy = { -1, 1, 0, 0 };
                        for (int i = 0; i < 4; i++) {
                            int nx = pt.X + dx[i];
                            int ny = pt.Y + dy[i];
                            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[nx, ny]) {
                                visited[nx, ny] = true;
                                if (!IsBg(bmp.GetPixel(nx, ny))) {
                                    q.Enqueue(new Point(nx, ny));
                                }
                            }
                        }
                    }

                    if (count >= minPixels) {
                        rects.Add(new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1));
                    }
                }
            }
            return rects;
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

Write-Host "--- Wolf Sprites ---"
$wolfBoxes = [IslandDetector]::FindComponents('C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_wolf_sprite_1789825529746.jpg', 500)
foreach ($b in $wolfBoxes) {
    Write-Host ("Wolf Box: x={0}, y={1}, w={2}, h={3}" -f $b.X, $b.Y, $b.Width, $b.Height)
}

Write-Host "--- Items ---"
$itemBoxes = [IslandDetector]::FindComponents('C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_fish_flowers_firewood_1789825513972.jpg', 500)
foreach ($b in $itemBoxes) {
    Write-Host ("Item Box: x={0}, y={1}, w={2}, h={3}" -f $b.X, $b.Y, $b.Width, $b.Height)
}

Write-Host "--- Workshops ---"
$wsBoxes = [IslandDetector]::FindComponents('C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_furnace_smithy_1789825498930.jpg', 500)
foreach ($b in $wsBoxes) {
    Write-Host ("Workshop Box: x={0}, y={1}, w={2}, h={3}" -f $b.X, $b.Y, $b.Width, $b.Height)
}

