using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace DeusGame
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string gameDir = Path.Combine(baseDir, "game");
                if (!Directory.Exists(gameDir) && File.Exists(Path.Combine(baseDir, "package.json")))
                {
                    gameDir = baseDir;
                }

                string nwPath = Path.Combine(baseDir, "nw.exe");
                if (!File.Exists(nwPath))
                {
                    string steamNw = @"C:\Program Files (x86)\Steam\steamapps\common\RPG Maker MZ\nwjs-win\nw.exe";
                    if (File.Exists(steamNw)) nwPath = steamNw;
                }

                if (!File.Exists(nwPath))
                {
                    MessageBox.Show("Could not locate game runtime engine (nw.exe).", "Deus Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = nwPath;
                psi.Arguments = "\"" + gameDir + "\" " + string.Join(" ", args);
                psi.WorkingDirectory = gameDir;
                psi.UseShellExecute = false;

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to launch Deus: " + ex.Message, "Deus Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
