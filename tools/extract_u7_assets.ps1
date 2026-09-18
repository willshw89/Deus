# Ultima Fortress (UF) - Ultima VII Asset Extractor for RPG Maker MZ
param(
    [string]$U7StaticPath = "C:\Program Files\GOG Galaxy\Games\Ultima 7\STATIC",
    [string]$SIStaticPath = "C:\Program Files\GOG Galaxy\Games\Ultima 7 - Serpent Isle\STATIC",
    [string]$OutputDir = "c:\Users\snewt\OneDrive\Desktop\UF\game"
)

Add-Type -AssemblyName System.Drawing

Write-Host "=== Ultima Fortress Asset Extractor ===" -ForegroundColor Cyan
Write-Host "Source U7: $U7StaticPath"
Write-Host "Target: $OutputDir"

# Load Palettes (Day palette is index 0)
$palBytes = [System.IO.File]::ReadAllBytes("$U7StaticPath\PALETTES.FLX")
$palette = @()
for ($i = 0; $i -lt 256; $i++) {
    $r = [int]$palBytes[256 + $i * 3]
    $g = [int]$palBytes[256 + $i * 3 + 1]
    $b = [int]$palBytes[256 + $i * 3 + 2]
    $palette += [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
}

function DecodeFrame($fileBytes, $shapeOffset, $frameOffset) {
    $ptr = $shapeOffset + $frameOffset
    $xright = [System.BitConverter]::ToInt16($fileBytes, $ptr)
    $xleft = [System.BitConverter]::ToInt16($fileBytes, $ptr + 2)
    $yabove = [System.BitConverter]::ToInt16($fileBytes, $ptr + 4)
    $ybelow = [System.BitConverter]::ToInt16($fileBytes, $ptr + 6)
    $width = [Math]::Max(1, $xleft + $xright + 1)
    $height = [Math]::Max(1, $yabove + $ybelow + 1)

    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    # Start transparent
    $curr = $ptr + 8
    while ($curr -lt $fileBytes.Length - 1) {
        $scanlen = [System.BitConverter]::ToUInt16($fileBytes, $curr); $curr += 2
        if ($scanlen -eq 0) { break }
        $encoded = $scanlen -band 1
        $len = $scanlen -shr 1
        $scanx = [System.BitConverter]::ToInt16($fileBytes, $curr); $curr += 2
        $scany = [System.BitConverter]::ToInt16($fileBytes, $curr); $curr += 2
        $destY = $yabove + $scany
        $destX = $xleft + $scanx

        if ($encoded -eq 0) {
            for ($i = 0; $i -lt $len; $i++) {
                $colIdx = [int]$fileBytes[$curr++]
                if ($colIdx -ne 255 -and ($destX + $i) -ge 0 -and ($destX + $i) -lt $width -and $destY -ge 0 -and $destY -lt $height) {
                    $bmp.SetPixel($destX + $i, $destY, $palette[$colIdx])
                }
            }
        } else {
            $readTotal = 0
            while ($readTotal -lt $len) {
                $bcnt = [int]$fileBytes[$curr++]
                $repeat = $bcnt -band 1
                $c = $bcnt -shr 1
                if ($repeat) {
                    $colIdx = [int]$fileBytes[$curr++]
                    for ($k = 0; $k -lt $c; $k++) {
                        $px = $destX + $readTotal + $k
                        if ($colIdx -ne 255 -and $px -ge 0 -and $px -lt $width -and $destY -ge 0 -and $destY -lt $height) {
                            $bmp.SetPixel($px, $destY, $palette[$colIdx])
                        }
                    }
                } else {
                    for ($k = 0; $k -lt $c; $k++) {
                        $colIdx = [int]$fileBytes[$curr++]
                        $px = $destX + $readTotal + $k
                        if ($colIdx -ne 255 -and $px -ge 0 -and $px -lt $width -and $destY -ge 0 -and $destY -lt $height) {
                            $bmp.SetPixel($px, $destY, $palette[$colIdx])
                        }
                    }
                }
                $readTotal += $c
            }
        }
    }
    return @{ Bitmap = $bmp; Width = $width; Height = $height; XLeft = $xleft; YAbove = $yabove }
}

# --- 1. Extract Gumps ---
Write-Host "Extracting Gumps..." -ForegroundColor Yellow
$gumpDir = "$OutputDir\img\system"
if (-not (Test-Path "$gumpDir\u7_gumps")) { New-Item -ItemType Directory -Path "$gumpDir\u7_gumps" -Force | Out-Null }
$gumpBytes = [System.IO.File]::ReadAllBytes("$U7StaticPath\GUMPS.VGA")
$gumpCount = [System.BitConverter]::ToUInt32($gumpBytes, 84)

$gumpMap = @{
    0 = "u7_gump_chest"
    1 = "u7_gump_backpack"
    2 = "u7_gump_sack"
    4 = "u7_gump_bag"
    5 = "u7_gump_barrel"
    7 = "u7_gump_crate"
    42 = "u7_gump_stats"
}

for ($i = 0; $i -lt $gumpCount; $i++) {
    $offset = [System.BitConverter]::ToUInt32($gumpBytes, 128 + $i * 8)
    $len = [System.BitConverter]::ToUInt32($gumpBytes, 128 + $i * 8 + 4)
    if ($offset -eq 0 -or $len -eq 0) { continue }
    $frame0Off = [System.BitConverter]::ToUInt32($gumpBytes, $offset + 4)
    try {
        $frame = DecodeFrame $gumpBytes $offset $frame0Off
        $filename = "gump_$i.png"
        if ($gumpMap.ContainsKey($i)) {
            $namedPath = "$gumpDir\$($gumpMap[$i]).png"
            $frame.Bitmap.Save($namedPath, [System.Drawing.Imaging.ImageFormat]::Png)
        }
        $frame.Bitmap.Save("$gumpDir\u7_gumps\$filename", [System.Drawing.Imaging.ImageFormat]::Png)
        $frame.Bitmap.Dispose()
    } catch {
        # ignore non-standard frames
    }
}

# Also grab Serpent Isle paperdolls
if (Test-Path "$SIStaticPath\GUMPS.VGA") {
    $siGumpBytes = [System.IO.File]::ReadAllBytes("$SIStaticPath\GUMPS.VGA")
    $siOffset42 = [System.BitConverter]::ToUInt32($siGumpBytes, 128 + 42 * 8)
    if ($siOffset42 -gt 0) {
        $frame0 = [System.BitConverter]::ToUInt32($siGumpBytes, $siOffset42 + 4)
        $frame = DecodeFrame $siGumpBytes $siOffset42 $frame0
        $frame.Bitmap.Save("$gumpDir\u7_gump_paperdoll.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $frame.Bitmap.Dispose()
    }
}

# --- 2. Extract Faces & Build RMMZ Face Sheets ---
Write-Host "Extracting Faces & Assembling RMMZ Face Sheets..." -ForegroundColor Yellow
$faceDir = "$OutputDir\img\faces"
if (-not (Test-Path $faceDir)) { New-Item -ItemType Directory -Path $faceDir -Force | Out-Null }
$faceBytes = [System.IO.File]::ReadAllBytes("$U7StaticPath\FACES.VGA")
$faceCount = [System.BitConverter]::ToUInt32($faceBytes, 84)

# In RMMZ, standard Faceset is 576 x 288 (4 cols x 2 rows, each 144x144)
$u7ActorsFace = New-Object System.Drawing.Bitmap(576, 288)
$gFaces = [System.Drawing.Graphics]::FromImage($u7ActorsFace)
$gFaces.Clear([System.Drawing.Color]::Transparent)

# Selection of faces for Fortress citizens:
# 0: Avatar / Expedition Leader
# 1: Iolo / Bard
# 2: Shamino / Ranger
# 3: Dupre / Militia Captain
# 4: Spark / Youth / Apprentice
# 8: Lord British / King
# 12: Blacksmith
# 16: Tavernkeeper
$selectedFaces = @(0, 1, 2, 3, 4, 8, 12, 16)
for ($f = 0; $f -lt 8; $f++) {
    $faceId = $selectedFaces[$f]
    $offset = [System.BitConverter]::ToUInt32($faceBytes, 128 + $faceId * 8)
    if ($offset -gt 0) {
        $frame0Off = [System.BitConverter]::ToUInt32($faceBytes, $offset + 4)
        $frame = DecodeFrame $faceBytes $offset $frame0Off
        $col = $f % 4
        $row = [Math]::Floor($f / 4)
        $cellX = $col * 144
        $cellY = $row * 144

        # Center and scale the portrait nicely inside the 144x144 cell
        $scale = 2
        $destW = $frame.Width * $scale
        $destH = $frame.Height * $scale
        $destX = $cellX + [Math]::Floor((144 - $destW) / 2)
        $destY = $cellY + [Math]::Floor((144 - $destH) / 2)
        
        $gFaces.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $gFaces.DrawImage($frame.Bitmap, $destX, $destY, $destW, $destH)
        
        # Also save individual face portrait
        $frame.Bitmap.Save("$faceDir\face_$faceId.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $frame.Bitmap.Dispose()
    }
}
$gFaces.Dispose()
$u7ActorsFace.Save("$faceDir\U7_Faces.png", [System.Drawing.Imaging.ImageFormat]::Png)
$u7ActorsFace.Dispose()

# --- 3. Extract Shapes & Build RMMZ Tilesets ---
Write-Host "Extracting World Shapes & Assembling Tilesets..." -ForegroundColor Yellow
$tileDir = "$OutputDir\img\tilesets"
if (-not (Test-Path $tileDir)) { New-Item -ItemType Directory -Path $tileDir -Force | Out-Null }
$shapesBytes = [System.IO.File]::ReadAllBytes("$U7StaticPath\SHAPES.VGA")
$shapesCount = [System.BitConverter]::ToUInt32($shapesBytes, 84)

# Tileset B: 768 x 768 (16 columns x 16 rows of 48x48 tiles)
$tilesetB = New-Object System.Drawing.Bitmap(768, 768)
$gTile = [System.Drawing.Graphics]::FromImage($tilesetB)
$gTile.Clear([System.Drawing.Color]::Transparent)
$gTile.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

# Key U7 shapes for a living mountain fortress:
# 300+: Furniture, tables, chairs, beds, chests, forges, anvils, barrels, ale kegs, ore carts, weapons
$notableShapes = @(
    @{ Id = 380; Name = "bed" },
    @{ Id = 381; Name = "table" },
    @{ Id = 382; Name = "chair" },
    @{ Id = 384; Name = "barrel" },
    @{ Id = 385; Name = "keg" },
    @{ Id = 390; Name = "chest" },
    @{ Id = 396; Name = "anvil" },
    @{ Id = 397; Name = "forge" },
    @{ Id = 401; Name = "brazier" },
    @{ Id = 405; Name = "smelter" },
    @{ Id = 525; Name = "pickaxe" },
    @{ Id = 526; Name = "battleaxe" },
    @{ Id = 527; Name = "broadsword" },
    @{ Id = 530; Name = "shield" },
    @{ Id = 535; Name = "helmet" },
    @{ Id = 540; Name = "plate_armor" },
    @{ Id = 570; Name = "ore_vein" },
    @{ Id = 575; Name = "gold_coins" },
    @{ Id = 580; Name = "goblet" },
    @{ Id = 585; Name = "roasted_meat" },
    @{ Id = 590; Name = "bread" },
    @{ Id = 600; Name = "book_scroll" },
    @{ Id = 610; Name = "lever" },
    @{ Id = 615; Name = "chains" },
    @{ Id = 620; Name = "skull" }
)

$tileIndex = 0
foreach ($item in $notableShapes) {
    $sId = $item.Id
    $offset = [System.BitConverter]::ToUInt32($shapesBytes, 128 + $sId * 8)
    if ($offset -gt 0) {
        $frame0Off = [System.BitConverter]::ToUInt32($shapesBytes, $offset + 4)
        try {
            $frame = DecodeFrame $shapesBytes $offset $frame0Off
            $tileCol = $tileIndex % 16
            $tileRow = [Math]::Floor($tileIndex / 16)
            $destX = $tileCol * 48
            $destY = $tileRow * 48

            # Center or stretch within 48x48
            $scale = [Math]::Min(48 / [Math]::Max(1, $frame.Width), 48 / [Math]::Max(1, $frame.Height))
            if ($scale -lt 1) { $scale = 1 }
            if ($scale -gt 3) { $scale = 3 }
            $w = [Math]::Min(48, [int]($frame.Width * $scale))
            $h = [Math]::Min(48, [int]($frame.Height * $scale))
            $ox = $destX + [Math]::Floor((48 - $w) / 2)
            $oy = $destY + (48 - $h)

            $gTile.DrawImage($frame.Bitmap, $ox, $oy, $w, $h)
            $frame.Bitmap.Dispose()
            $tileIndex++
        } catch {
        }
    }
}
$gTile.Dispose()
$tilesetB.Save("$tileDir\U7_Fortress_B.png", [System.Drawing.Imaging.ImageFormat]::Png)
$tilesetB.Dispose()

# --- 4. Build U7 Character Sheets for RMMZ ---
Write-Host "Assembling RMMZ Character Spritesheets..." -ForegroundColor Yellow
$charDir = "$OutputDir\img\characters"
if (-not (Test-Path $charDir)) { New-Item -ItemType Directory -Path $charDir -Force | Out-Null }

# In RMMZ, single character file prefix with '$': 3 cols x 4 rows
# Cols: Step 1, Step 2, Step 3
# Rows: Down (row 0), Left (row 1), Right (row 2), Up (row 3)
function BuildRMMZCharacter($shapeId, $filename, $tintColor = $null) {
    $offset = [System.BitConverter]::ToUInt32($shapesBytes, 128 + $shapeId * 8)
    if ($offset -eq 0) { return }
    $frame0Off = [System.BitConverter]::ToUInt32($shapesBytes, $offset + 4)
    $numFrames = ($frame0Off - 4) / 4
    
    # Standard character size: 48 x 48 (total 144 x 192)
    $charBmp = New-Object System.Drawing.Bitmap(144, 192)
    $gChar = [System.Drawing.Graphics]::FromImage($charBmp)
    $gChar.Clear([System.Drawing.Color]::Transparent)
    $gChar.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor

    $frames = @()
    for ($f = 0; $f -lt [Math]::Min($numFrames, 16); $f++) {
        $fOff = [System.BitConverter]::ToUInt32($shapesBytes, $offset + 4 + $f * 4)
        try {
            $frames += DecodeFrame $shapesBytes $offset $fOff
        } catch {
            $frames += $null
        }
    }

    # Map available U7 frames to 4 directions (Down=0, Left=1, Right=2, Up=3)
    for ($dir = 0; $dir -lt 4; $dir++) {
        for ($step = 0; $step -lt 3; $step++) {
            # Pick best matching frame
            $frameIdx = ($dir * 2 + ($step % 2)) % [Math]::Max(1, $frames.Count)
            $fObj = $frames[$frameIdx]
            if ($fObj -and $fObj.Bitmap) {
                $cellX = $step * 48
                $cellY = $dir * 48
                $scale = 1.5
                $w = [int]($fObj.Width * $scale)
                $h = [int]($fObj.Height * $scale)
                $ox = $cellX + [Math]::Floor((48 - $w) / 2)
                $oy = $cellY + (48 - $h)

                if ($dir -eq 2 -and ($frames.Count -le 8)) {
                    # Flip horizontal for Right if needed
                    $cloneBmp = New-Object System.Drawing.Bitmap($fObj.Bitmap)
                    $cloneBmp.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
                    $gChar.DrawImage($cloneBmp, $ox, $oy, $w, $h)
                    $cloneBmp.Dispose()
                } else {
                    $gChar.DrawImage($fObj.Bitmap, $ox, $oy, $w, $h)
                }
            }
        }
    }

    $gChar.Dispose()
    foreach ($fObj in $frames) {
        if ($fObj -and $fObj.Bitmap) { $fObj.Bitmap.Dispose() }
    }
    $charBmp.Save("$charDir\$filename.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $charBmp.Dispose()
    Write-Host "Created $filename.png" -ForegroundColor Green
}

# Build Avatar, Dwarves, Guards, Goblins
BuildRMMZCharacter 150 "`$U7_Avatar"
BuildRMMZCharacter 151 "`$U7_Iolo"
BuildRMMZCharacter 152 "`$U7_Dupre"
BuildRMMZCharacter 153 "`$U7_Shamino"
BuildRMMZCharacter 160 "`$U7_Blacksmith"
BuildRMMZCharacter 161 "`$U7_Miner"
BuildRMMZCharacter 162 "`$U7_DwarfGuard"
BuildRMMZCharacter 170 "`$U7_Goblin"

Write-Host "=== Asset Extraction Complete! ===" -ForegroundColor Green
