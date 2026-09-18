# Ultima Fortress: Deploy True 2.5D Assets
param()

$baseDir = "C:\Users\snewt\.gemini\antigravity\brain\0b6708e3-82fc-4aaa-90fd-dc48dedc58fa"
$gameRoot = "$PSScriptRoot\..\game"
. "$PSScriptRoot\process_assets.ps1"

Write-Host "=== Deploying True 2.5D Ultima VII Assets ===" -ForegroundColor Cyan

# 1. Compile 2.5D Adam Spritesheet ($Adam.png)
$adamSrc = "$baseDir\man_25d_u7_sheet_1789757837054.jpg"
$adamDest = "$gameRoot\img\characters\`$Adam.png"
Write-Host "Processing Adam -> $adamDest"
Compile-CharacterSheet $adamSrc $adamDest

# 2. Compile 2.5D Eve Spritesheet ($Eve.png)
$eveSrc = "$baseDir\woman_25d_u7_sheet_1789757852746.jpg"
$eveDest = "$gameRoot\img\characters\`$Eve.png"
Write-Host "Processing Eve -> $eveDest"
Compile-CharacterSheet $eveSrc $eveDest

# 3. Compile 2.5D Ancient Fruit Tree (!`$FruitTree.png)
$treeSrc = "$baseDir\tree_25d_u7_1789757821287.jpg"
$treeDest = "$gameRoot\img\characters\!`$FruitTree.png"
Write-Host "Processing Fruit Tree -> $treeDest"

$src = [System.Drawing.Bitmap]::FromFile($treeSrc)
$sheetW = 432
$sheetH = 576
$cellW = 144
$cellH = 144
$destTree = New-Object System.Drawing.Bitmap($sheetW, $sheetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($destTree)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

for ($r = 0; $r -lt 4; $r++) {
    for ($c = 0; $c -lt 3; $c++) {
        $g.DrawImage($src, $c * $cellW, $r * $cellH, $cellW, $cellH)
    }
}
$g.Dispose()
$src.Dispose()

[FastQuantizer]::Quantize($destTree, $u7PaletteInts)
$destTree.Save($treeDest, [System.Drawing.Imaging.ImageFormat]::Png)
$destTree.Dispose()
Write-Host "Fruit tree deployed: $treeDest" -ForegroundColor Green

# 4. Compile 2.5D Glade Tileset Sheet (U7_Glade_B.png)
$tileSrc = "$baseDir\glade_25d_tileset_1789757878479.jpg"
$tileDest = "$gameRoot\img\tilesets\U7_Glade_B.png"
Write-Host "Processing 2.5D Glade Tileset -> $tileDest"

$srcTile = [System.Drawing.Bitmap]::FromFile($tileSrc)
$destTile = New-Object System.Drawing.Bitmap(768, 768, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gt = [System.Drawing.Graphics]::FromImage($destTile)
$gt.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$gt.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$gt.DrawImage($srcTile, 0, 0, 768, 768)
$gt.Dispose()
$srcTile.Dispose()

[FastQuantizer]::Quantize($destTile, $u7PaletteInts)
$destTile.Save($tileDest, [System.Drawing.Imaging.ImageFormat]::Png)
$destTile.Dispose()
Write-Host "2.5D Glade Tileset deployed: $tileDest" -ForegroundColor Green

Write-Host "=== All 2.5D Assets Deployed Successfully! ===" -ForegroundColor Green

