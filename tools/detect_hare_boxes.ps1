Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Collections.Generic;

public class HareDetector {
    public static bool IsBg(Color c) {
        // Magenta background: R high, B high, G low
        if (c.R > 140 && c.B > 140 && (c.R - c.G > 30) && (c.B - c.G > 30)) return true;
        if (c.R > 180 && c.B > 180 && c.G < 100) return true;
        return false;
    }

    public static List<Rectangle> FindComponents(string imgPath) {
        Bitmap bmp = new Bitmap(imgPath);
        int w = bmp.Width;
        int h = bmp.Height;
        bool[,] visited = new bool[w, h];
        List<Rectangle> boxes = new List<Rectangle>();

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                if (visited[x, y]) continue;
                Color c = bmp.GetPixel(x, y);
                if (IsBg(c)) {
                    visited[x, y] = true;
                    continue;
                }

                // Flood fill island
                int minX = x, maxX = x, minY = y, maxY = y;
                int count = 0;
                Queue<Point> q = new Queue<Point>();
                q.Enqueue(new Point(x, y));
                visited[x, y] = true;

                while (q.Count > 0) {
                    Point p = q.Dequeue();
                    count++;
                    if (p.X < minX) minX = p.X;
                    if (p.X > maxX) maxX = p.X;
                    if (p.Y < minY) minY = p.Y;
                    if (p.Y > maxY) maxY = p.Y;

                    int[] dx = { 0, 0, 1, -1 };
                    int[] dy = { 1, -1, 0, 0 };
                    for (int i = 0; i < 4; i++) {
                        int nx = p.X + dx[i];
                        int ny = p.Y + dy[i];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[nx, ny]) {
                            Color nc = bmp.GetPixel(nx, ny);
                            if (!IsBg(nc)) {
                                visited[nx, ny] = true;
                                q.Enqueue(new Point(nx, ny));
                            }
                        }
                    }
                }

                if (count > 200) { // filter out speckles
                    boxes.Add(new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1));
                }
            }
        }
        bmp.Dispose();
        return boxes;
    }
}
"@ -ReferencedAssemblies System.Drawing

$src = 'C:\Users\snewt\.gemini\antigravity\brain\30a65f09-bbd3-4fba-a416-f4421189eefd\ff6_hare_sprite_1789825546030.jpg'
$boxes = [HareDetector]::FindComponents($src)

Write-Host "Found $($boxes.Count) boxes:"
$sorted = $boxes | Sort-Object Y, X
foreach ($b in $sorted) {
    Write-Host "x=$($b.X), y=$($b.Y), w=$($b.Width), h=$($b.Height)"
}
