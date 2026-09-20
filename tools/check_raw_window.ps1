Add-Type -AssemblyName System.Drawing
$jpg = "C:\Users\snewt\.gemini\antigravity\brain\74107bfb-a5b5-43a6-8ab7-87deb97997e1\deus_window_skin_1789930189643.jpg"
$bmp = [Drawing.Bitmap]::FromFile($jpg)
Write-Host "Raw size: $($bmp.Width)x$($bmp.Height)"
$bmp.Dispose()

