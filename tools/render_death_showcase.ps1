Add-Type -AssemblyName System.Drawing

$srcPath = 'C:\Users\snewt\AppData\Local\Temp\uf_snapshots\run_51468\test_output\combat.combat_engagement.png'
if (-not (Test-Path $srcPath)) {
    Write-Host "File not found: $srcPath"
    exit 1
}

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

# The combat area is around the center hearth (screen coords ~ 450 to 600 x, 450 to 600 y)
# Full image is 816 x 624
$cropRect = [System.Drawing.Rectangle]::new(360, 240, 180, 160)
$cropped = New-Object System.Drawing.Bitmap 180, 160, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($cropped)
$g.DrawImage($bmp, 0, 0, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$bmp.Dispose()

# 3x enlargement for close-up review
$crop3x = New-Object System.Drawing.Bitmap (180 * 3), (160 * 3), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g3x = [System.Drawing.Graphics]::FromImage($crop3x)
$g3x.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g3x.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g3x.DrawImage($cropped, 0, 0, 200 * 3, 180 * 3)
$g3x.Dispose()
$crop3x.Save('art\review\combat_death_animation_showcase.png', [System.Drawing.Imaging.ImageFormat]::Png)
$crop3x.Dispose()
$cropped.Dispose()

Write-Host "Saved close-up to art\review\combat_death_animation_showcase.png"
