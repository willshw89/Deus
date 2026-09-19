Add-Type -AssemblyName System.Drawing

$srcDir = 'C:\Users\snewt\AppData\Local\Temp\uf_snapshots\run_20556\test_output'
$lungeSrc = Join-Path $srcDir 'combat.combat_attack_lunge.png'

if (Test-Path $lungeSrc) {
    Copy-Item $lungeSrc 'art\review\combat_attack_lunge.png' -Force

    $bmp = [System.Drawing.Bitmap]::FromFile($lungeSrc)
    # The attack lunge on the right wall is around x=650-780, y=420-550
    # Image size: 816 x 624
    $cropRect = [System.Drawing.Rectangle]::new(540, 370, 150, 140)
    $cropped = New-Object System.Drawing.Bitmap 150, 140, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.DrawImage($bmp, 0, 0, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $bmp.Dispose()

    # 3x enlargement
    $crop3x = New-Object System.Drawing.Bitmap (150 * 3), (140 * 3), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g3x = [System.Drawing.Graphics]::FromImage($crop3x)
    $g3x.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g3x.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $g3x.DrawImage($cropped, 0, 0, 160 * 3, 160 * 3)
    $g3x.Dispose()
    $crop3x.Save('art\review\combat_attack_lunge_closeup.png', [System.Drawing.Imaging.ImageFormat]::Png)
    $crop3x.Dispose()
    $cropped.Dispose()

    Write-Host "Saved combat attack lunge close-up to art\review\combat_attack_lunge_closeup.png"
}
