# Test FastQuantizer on generated portrait
$imgFile = (Get-ChildItem 'C:\Users\snewt\.gemini\antigravity\brain\0b6708e3-82fc-4aaa-90fd-dc48dedc58fa\*urist_miner_portrait*.jpg' | Select-Object -Last 1).FullName
$outFile = 'c:\Users\snewt\OneDrive\Desktop\UF\game\img\faces\Urist_Miner_Fast.png'

. 'c:\Users\snewt\OneDrive\Desktop\UF\tools\process_assets.ps1'

$src = [System.Drawing.Bitmap]::FromFile($imgFile)
$resized = New-Object System.Drawing.Bitmap(144, 144, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($resized)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($src, 0, 0, 144, 144)
$g.Dispose()
$src.Dispose()

$sw = [System.Diagnostics.Stopwatch]::StartNew()
[FastQuantizer]::Quantize($resized, $u7PaletteInts)
$sw.Stop()

$resized.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
$resized.Dispose()

Write-Host "Quantization completed in: $($sw.ElapsedMilliseconds) ms!" -ForegroundColor Green
$outInfo = Get-Item $outFile
Write-Host "Output file: $outFile Size: $($outInfo.Length) bytes"
