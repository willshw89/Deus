Add-Type -AssemblyName System.Drawing

$furnace = [System.Drawing.Bitmap]::FromFile('game\img\characters\!$UF_Furnace.png')
$smithy = [System.Drawing.Bitmap]::FromFile('game\img\characters\!$UF_Smithy.png')
$flowers = [System.Drawing.Bitmap]::FromFile('game\img\characters\!$UF_Wildflowers.png')
$fish = [System.Drawing.Bitmap]::FromFile('game\img\characters\!$UF_Item_Fish.png')
$firewood = [System.Drawing.Bitmap]::FromFile('game\img\characters\!$UF_Item_Firewood.png')
$wolf = [System.Drawing.Bitmap]::FromFile('game\img\characters\$U7_Wolf.png')
$hare = [System.Drawing.Bitmap]::FromFile('game\img\characters\$U7_Hare.png')

# 7 columns, 48px each -> 336px wide, 48px tall for standing frames
$strip = New-Object System.Drawing.Bitmap (7 * 48), 48, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($strip)
$g.Clear([System.Drawing.Color]::FromArgb(40, 44, 52)) # dark neutral background for contrast

# Draw frame 0 (first 48x48 frame from each)
# Objects: col 1, row 0 (stand)
$g.DrawImage($furnace, [System.Drawing.Rectangle]::new(0 * 48, 0, 48, 48), [System.Drawing.Rectangle]::new(48, 0, 48, 48), [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($smithy, [System.Drawing.Rectangle]::new(1 * 48, 0, 48, 48), [System.Drawing.Rectangle]::new(48, 0, 48, 48), [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($flowers, [System.Drawing.Rectangle]::new(2 * 48, 0, 48, 48), [System.Drawing.Rectangle]::new(48, 0, 48, 48), [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($fish, [System.Drawing.Rectangle]::new(3 * 48, 0, 48, 48), [System.Drawing.Rectangle]::new(48, 0, 48, 48), [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($firewood, [System.Drawing.Rectangle]::new(4 * 48, 0, 48, 48), [System.Drawing.Rectangle]::new(48, 0, 48, 48), [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($wolf, [System.Drawing.Rectangle]::new(5 * 48, 0, 48, 48), [System.Drawing.Rectangle]::new(48, 0, 48, 48), [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($hare, [System.Drawing.Rectangle]::new(6 * 48, 0, 48, 48), [System.Drawing.Rectangle]::new(48, 0, 48, 48), [System.Drawing.GraphicsUnit]::Pixel)

$g.Dispose()

# Scale 3x
$strip3x = New-Object System.Drawing.Bitmap (7 * 48 * 3), (48 * 3), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g3x = [System.Drawing.Graphics]::FromImage($strip3x)
$g3x.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g3x.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g3x.DrawImage($strip, 0, 0, 7 * 48 * 3, 48 * 3)
$g3x.Dispose()
$strip3x.Save('art\review\random_sample_showcase.png', [System.Drawing.Imaging.ImageFormat]::Png)
$strip3x.Dispose()

# Scale 8x
$strip8x = New-Object System.Drawing.Bitmap (7 * 48 * 8), (48 * 8), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g8x = [System.Drawing.Graphics]::FromImage($strip8x)
$g8x.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g8x.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g8x.DrawImage($strip, 0, 0, 7 * 48 * 8, 48 * 8)
$g8x.Dispose()
$strip8x.Save('art\review\random_sample_showcase_8x.png', [System.Drawing.Imaging.ImageFormat]::Png)
$strip8x.Dispose()

$strip.Dispose()
$furnace.Dispose()
$smithy.Dispose()
$flowers.Dispose()
$fish.Dispose()
$firewood.Dispose()
$wolf.Dispose()
$hare.Dispose()

Write-Host "Updated random_sample_showcase.png with all 7 assets."
