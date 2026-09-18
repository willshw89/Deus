# Ultima Fortress - Procedural Mountainhall Fortress Generator for RPG Maker MZ
param(
    [string]$GameRoot = "c:\Users\snewt\OneDrive\Desktop\UF\game",
    [int]$MapWidth = 50,
    [int]$MapHeight = 40,
    [int]$TilesetId = 4
)

Write-Host "=== Generating Ultima Fortress: The Living Mountainhall ===" -ForegroundColor Cyan

$dataDir = "$GameRoot\data"
$mapPath = "$dataDir\Map001.json"

# Load geology & lexicon data
$geoData = $null
if (Test-Path "$dataDir\df_geology.json") {
    $geoData = Get-Content "$dataDir\df_geology.json" -Raw | ConvertFrom-Json
}
$lexData = $null
if (Test-Path "$dataDir\df_lexicon.json") {
    $lexData = Get-Content "$dataDir\df_lexicon.json" -Raw | ConvertFrom-Json
}

# Helper to generate random authentic dwarven name
function Get-RandomDwarfName() {
    $firsts = @("Urist", "Bomrek", "Kogan", "Zon", "Meng", "Doren", "Ast", "Logem", "Kadol", "Vabok")
    $fn = $firsts[(Get-Random -Maximum $firsts.Count)]
    $roots = @("Iron", "Stone", "Copper", "Steel", "Bronze", "Anvil", "Rune", "Deep", "Axe", "Shield", "Hammer")
    $suff = @("hammer", "delver", "cleaver", "crafter", "beard", "grip", "breaker", "helm", "forge", "ward")
    $ln = $roots[(Get-Random -Maximum $roots.Count)] + $suff[(Get-Random -Maximum $suff.Count)]
    return "$fn $ln"
}

# 6 tile layers: 0=Lower Auto, 1=Lower Decor, 2=Upper Auto, 3=Upper Decor, 4=Shadow, 5=Region
$totalCells = $MapWidth * $MapHeight
$tileData = New-Object int[] ($totalCells * 6)

# Tile IDs (Tileset 4: Dungeon)
$WALL_TILE = 4352      # Dungeon dark stone wall
$FLOOR_PAVED = 2820    # Smooth carved stone floor
$FLOOR_ROUGH = 2816    # Rough unworked cavern floor
$WATER_TILE = 2048     # Moat / underground water

# Default everything to solid mountain wall
for ($i = 0; $i -lt $totalCells; $i++) {
    $tileData[$i] = $WALL_TILE
}

# Carve room helper
function Carve-Room($rx1, $ry1, $rx2, $ry2, $floorTile = $FLOOR_PAVED) {
    for ($y = $ry1; $y -le $ry2; $y++) {
        for ($x = $rx1; $x -le $rx2; $x++) {
            if ($x -ge 1 -and $x -lt ($MapWidth - 1) -and $y -ge 1 -and $y -lt ($MapHeight - 1)) {
                $idx = ($y * $MapWidth) + $x
                $tileData[$idx] = $floorTile
            }
        }
    }
}

# Carve corridor helper
function Carve-Corridor($x1, $y1, $x2, $y2, $width = 2, $floorTile = $FLOOR_PAVED) {
    # Horizontal first then vertical
    $minX = [Math]::Min($x1, $x2)
    $maxX = [Math]::Max($x1, $x2)
    for ($x = $minX; $x -le $maxX; $x++) {
        for ($w = 0; $w -lt $width; $w++) {
            $cy = $y1 + $w
            if ($cy -ge 1 -and $cy -lt ($MapHeight - 1) -and $x -ge 1 -and $x -lt ($MapWidth - 1)) {
                $tileData[($cy * $MapWidth) + $x] = $floorTile
            }
        }
    }
    $minY = [Math]::Min($y1, $y2)
    $maxY = [Math]::Max($y1, $y2)
    for ($y = $minY; $y -le $maxY; $y++) {
        for ($w = 0; $w -lt $width; $w++) {
            $cx = $x2 + $w
            if ($y -ge 1 -and $y -lt ($MapHeight - 1) -and $cx -ge 1 -and $cx -lt ($MapWidth - 1)) {
                $tileData[($y * $MapWidth) + $cx] = $floorTile
            }
        }
    }
}

Write-Host "Carving Fortress Sectors..." -ForegroundColor Yellow

# 1. Surface Gatehouse & Entrance (North: x: 22..28, y: 2..8)
Carve-Room 22 2 28 8
# Surface Moat (x: 18..32, y: 1)
for ($mx = 18; $mx -le 32; $mx++) {
    if ($mx -lt 24 -or $mx -gt 26) {
        $tileData[(1 * $MapWidth) + $mx] = $WATER_TILE # Water trench
    }
}

# 2. Trade Depot (North-East: x: 33..46, y: 3..10)
Carve-Room 33 3 46 10
Carve-Corridor 28 5 33 5 2 # Connect Gatehouse to Trade Depot

# 3. Grand Mountainhall / Great Dining Hall (Center: x: 16..34, y: 12..24)
Carve-Room 16 12 34 24
Carve-Corridor 24 8 24 12 3 # Great north-south passage

# Re-add Grand Pillars in Great Hall
$pillars = @(
    @{ x = 20; y = 15 }, @{ x = 25; y = 15 }, @{ x = 30; y = 15 },
    @{ x = 20; y = 21 }, @{ x = 25; y = 21 }, @{ x = 30; y = 21 }
)
foreach ($p in $pillars) {
    $tileData[($p.y * $MapWidth) + $p.x] = $WALL_TILE
}

# 4. Sunshine Stout Tavern & Inn (Center-West: x: 5..14, y: 13..23)
Carve-Room 5 13 14 23
Carve-Corridor 14 18 16 18 2 # Doorway to Great Hall

# 5. Common Dormitory Quarters (West: x: 4..14, y: 3..10) - Region 50
Carve-Room 4 3 14 10
# Doorway into North Hall at (14, 6)
Carve-Corridor 14 6 22 6 2

# 6. Noble Quarters / Baron's Suite (South-West: x: 4..14, y: 25..32) - Region 51
Carve-Room 4 25 14 32
# Doorway into Tavern/Hall at (14, 28)
Carve-Corridor 14 28 16 28 2

# 7. Industrial Workshop Sector (East: x: 36..47, y: 13..30)
# 7A: Smelter Hall (x: 36..47, y: 13..18)
Carve-Room 36 13 47 18
# 7B: Metalsmith's Forge (x: 36..47, y: 19..24)
Carve-Room 36 19 47 24
# 7C: Brewery & Still (x: 36..47, y: 25..30)
Carve-Room 36 25 47 30
Carve-Corridor 34 18 36 18 2 # Connector to Great Hall
Carve-Corridor 34 24 36 24 2

# 8. Fortress Barracks & Training Hall (South: x: 16..26, y: 27..36)
Carve-Room 16 27 26 36
Carve-Corridor 21 24 21 27 3 # Connector from Great Hall

# 9. Royal Crypts & Tombs (South-West: x: 4..13, y: 34..38)
Carve-Room 4 34 13 38
Carve-Corridor 13 36 16 36 2 # Connector to Barracks

# 10. Deep Delves & Rough Mines (South-East: x: 30..47, y: 33..38)
Carve-Room 30 33 47 38 $FLOOR_ROUGH
Carve-Corridor 26 34 30 34 2 $FLOOR_ROUGH

# Apply Roof Regions (Layer 5: Region IDs)
Write-Host "Applying Building Roof Regions..." -ForegroundColor Yellow
$regionOffset = 5 * $totalCells

# Region 50: Common Dormitory (x: 4..14, y: 3..10)
for ($ry = 3; $ry -le 10; $ry++) {
    for ($rx = 4; $rx -le 14; $rx++) {
        $tileData[$regionOffset + ($ry * $MapWidth) + $rx] = 50
    }
}

# Region 51: Noble Suite (x: 4..14, y: 25..32)
for ($ry = 25; $ry -le 32; $ry++) {
    for ($rx = 4; $rx -le 14; $rx++) {
        $tileData[$regionOffset + ($ry * $MapWidth) + $rx] = 51
    }
}

# Build Events List
Write-Host "Populating Fortress Events & Inhabitants..." -ForegroundColor Yellow
$eventsList = New-Object System.Collections.ArrayList
$eventsList.Add($null) | Out-Null # 1-indexed

function New-EventObj($id, $name, $x, $y, $charName, $charIdx, $note, $list) {
    $cmdList = @()
    if ($list) {
        foreach ($item in $list) { $cmdList += $item }
    }
    $cmdList += @{ code = 0; indent = 0; parameters = @() }

    return @{
        id = $id
        name = $name
        x = $x
        y = $y
        pages = @(
            @{
                conditions = @{
                    actorId = 1; actorValid = $false;
                    itemId = 1; itemValid = $false;
                    selfSwitchCh = "A"; selfSwitchValid = $false;
                    switch1Id = 1; switch1Valid = $false;
                    switch2Id = 1; switch2Valid = $false;
                    variableId = 1; variableValid = $false; variableValue = 0
                }
                directionFix = $false
                image = @{
                    characterIndex = $charIdx
                    characterName = $charName
                    direction = 2
                    pattern = 1
                    tileId = 0
                }
                list = $cmdList
                moveFrequency = 3
                moveRoute = @{ list = @(@{ code = 0; parameters = @() }); repeat = $true; skippable = $false; wait = $false }
                moveSpeed = 3
                moveType = 0
                priorityType = 1
                stepAnime = $false
                through = $false
                trigger = 0
                walkAnime = $true
            }
        )
        note = $note
    }
}

# Event 1: Master Metalsmith Kragan (At the Forge: 41, 21)
$eventsList.Add((New-EventObj 1 "Kragan Anvilhammer" 41 21 "`$U7_Blacksmith" 0 "<dialogue: Kragan_Smith> <occupation: smith> <df_citizen: smith, karadrim> <bark: Cold steel never lies!|Fold the iron sixteen times!|Watch the glowing sparks!>" @())) | Out-Null

# Event 2: Tavernkeeper Thorgar (In the Tavern: 10 16)
$eventsList.Add((New-EventObj 2 "Thorgar Aleheart" 10 16 "`$U7_Miner" 0 "<dialogue: Thorgar_Brewer> <occupation: brewer> <df_citizen: brewer, karadrim> <bark: Black Iron-Stout on tap!|Another flagon for the miners!|Deep-Brew cures all sorrow!>" @())) | Out-Null

# Event 3: Vanguard Captain Kogan (At the North Gatehouse: 25 5)
$eventsList.Add((New-EventObj 3 "Kogan Ironshield" 25 5 "`$U7_DwarfGuard" 0 "<dialogue: Kogan_Guard> <occupation: guard> <df_citizen: guard, karadrim> <bark: High alert on the ramparts!|Report any trench-kin movement.|Hold the gates of Kraghold!>" @())) | Out-Null

# Event 4: Deep Delver Meng (In the Deep Mines: 40 35)
$eventsList.Add((New-EventObj 4 "Meng Oreseeker" 40 35 "`$U7_Miner" 0 "<dialogue: Meng_Miner> <occupation: miner> <df_citizen: miner, karadrim> <bark: Strike the living rock!|Rich ironstone in the wall!|Careful near the deep chasm!>" @())) | Out-Null

# Event 5: Barracks Guard Zon (In the Training Barracks: 21 31)
$eventsList.Add((New-EventObj 5 "Zon Shieldbearer" 21 31 "`$U7_DwarfGuard" 0 "<dialogue: Kogan_Guard> <occupation: guard> <df_citizen: guard, karadrim> <bark: Keep your battleaxe sharp!|Form the shieldwall!|Prowess through discipline!>" @())) | Out-Null

# Event 6: Runic Pillar (Center of Great Hall: 25 18)
$pillarCmds = @(
    @{ code = 101; indent = 0; parameters = @("", 0, 0, 2, "") },
    @{ code = 401; indent = 0; parameters = @("*** THE BASTION OF KRAGHOLD ***") },
    @{ code = 401; indent = 0; parameters = @("Living world simulation blending classic D20 fantasy and Ultima VII style.") },
    @{ code = 401; indent = 0; parameters = @("- Explore the multi-racial realm: Karadrim, Valen, Sylvathi, Vorgari, Morvath, & Kitterkin!") },
    @{ code = 401; indent = 0; parameters = @("- Walk past citizens: Overhead speech barks and 24h autonomous routines.") },
    @{ code = 401; indent = 0; parameters = @("- Press [I]: Open Ultima VII Paperdoll Equipment screen.") },
    @{ code = 401; indent = 0; parameters = @("- Hold [Shift] facing any citizen: Inspect living-world Personality Profile.") },
    @{ code = 401; indent = 0; parameters = @("- Step into Dormitory (x:4..14, y:3..10): Test U7 Roof Cutaway!") },
    @{ code = 401; indent = 0; parameters = @("- Click Chests/Kegs: Drag and inspect container gumps.") }
)
$eventsList.Add((New-EventObj 6 "Runic Monument" 25 18 "" 0 "" $pillarCmds)) | Out-Null

# Event 7: Smithy Iron Chest (43, 20)
$eventsList.Add((New-EventObj 7 "Forge Storage Chest" 43 20 "" 0 "<container: chest, smith_chest>" @())) | Out-Null

# Event 8: Tavern Sunshine Stout Keg (9, 15)
$eventsList.Add((New-EventObj 8 "Black Iron-Stout Keg" 9 15 "" 0 "<container: barrel, tavern_keg>" @())) | Out-Null

# Event 9: Dormitory Footlocker (8, 5 - Inside Region 50!)
$eventsList.Add((New-EventObj 9 "Dormitory Footlocker" 8 5 "" 0 "<container: chest, dorm_chest>" @())) | Out-Null

# Event 10: Noble Strongbox (8, 27 - Inside Region 51!)
$eventsList.Add((New-EventObj 10 "Castellan Strongbox" 8 27 "" 0 "<container: chest, noble_chest>" @())) | Out-Null

# Event 11: Deep Mine Ore Bin (44, 36)
$eventsList.Add((New-EventObj 11 "Raw Ironstone Bin" 44 36 "" 0 "<container: sack, mine_bin>" @())) | Out-Null

# Event 12: Morvath Scout Encounter (Deep Mines: 34 36)
$goblinCmds = @(
    @{ code = 101; indent = 0; parameters = @("Evil", 0, 0, 2, "") },
    @{ code = 401; indent = 0; parameters = @("A Morvath Trench-Raider leaps from the shadowy fissures, brandishing a barbed spear!") },
    @{ code = 301; indent = 0; parameters = @(0, 1, $false, $false) }
)
$eventsList.Add((New-EventObj 12 "Morvath Raider" 34 36 "`$U7_Goblin" 0 "<df_citizen: raider, morvath> <bark: Sssnakesss!|Flesh for the dark pits!|Die, stone-grub!>" $goblinCmds)) | Out-Null

# Event 13: Cedric Brightward (Visiting Valen Merchant at Trade Depot: 28 6)
$eventsList.Add((New-EventObj 13 "Cedric Brightward" 28 6 "People1" 0 "<dialogue: Cedric_Merchant> <occupation: merchant> <df_citizen: merchant, valen> <bark: Fine silks and linen from Valenford!|A fair barter for mountain steel!|The High Realms pay high for native aurum!>" @())) | Out-Null

# Event 14: Caerith Sylvanna (Visiting Sylvathi Ranger at Gatehouse: 22 6)
$eventsList.Add((New-EventObj 14 "Caerith Sylvanna" 22 6 "Actor3" 4 "<dialogue: Caerith_Elf> <occupation: diplomat> <df_citizen: ranger, sylvathi> <bark: The stone of this hall is silent.|Do not harm the living roots.|I bring word of the Elder Canopy.>" @())) | Out-Null

# Event 15: Vor-Tek Zenith (Winged Vorgari Scholar in Great Hall: 27 18)
$eventsList.Add((New-EventObj 15 "Vor-Tek Zenith" 27 18 "Actor3" 6 "<dialogue: VorTek_Vorgari> <occupation: scholar> <df_citizen: scholar, vorgari> <bark: Will and Form guide our path.|The Dual Axioms bind all realms.|Endurance achieves all truth.>" @())) | Out-Null

# Event 16: Tik-Chit Quickfinger (Kitterkin Warren Slinker in Deep Mines: 43 33)
$eventsList.Add((New-EventObj 16 "Tik-Chit Quickfinger" 43 33 "Evil" 2 "<dialogue: TikChit_Kitter> <occupation: thief> <df_citizen: thief, kitterkin> <bark: *chitters rapidly*|Shiny rocks! Precccious cogs!|No hit Tik-Chit! Me trade shiny!>" @())) | Out-Null

# Event 17: Borin Forgehand (Wingless Vorgari Artisan at Smithy: 41 23)
$eventsList.Add((New-EventObj 17 "Borin Forgehand" 41 23 "Actor3" 7 "<dialogue: Borin_Artisan> <occupation: smith> <df_citizen: smith, vorgari> <bark: The bellows feed the furnace!|Basalt and steel forged as one.|Work with Form and Will!>" @())) | Out-Null

# Event 18: Precursor Automaton Sentinel (In the Deep Precursor Shaft: 32 37)
$eventsList.Add((New-EventObj 18 "Unit-77 Sentinel" 32 37 "`$BigMonster1" 0 "<df_citizen: sentinel, automaton> <bark: UNIT-77 ONLINE.|SCANNING SECTOR DELTA.|NO PRECURSOR CLEARANCE DETECTED.>" @())) | Out-Null

# Event 19: Anvil & Volcanic Forge Station (42 21)
$eventsList.Add((New-EventObj 19 "Volcanic Forge Station" 42 21 "" 0 "<workshop: forge> <bark: [VOLCANIC FORGE READY]>" @())) | Out-Null

# Event 20: Precursor Fabricator Console (35 36)
$eventsList.Add((New-EventObj 20 "Precursor Fabricator" 35 36 "" 0 "<workshop: fabricator> <bark: [AETHERIC FABRICATOR READY]>" @())) | Out-Null

# Event 21: Brewery Fermentation Vat (42 27)
$eventsList.Add((New-EventObj 21 "Fermentation Vat" 42 27 "" 0 "<workshop: brewery> <bark: [BLACK IRON-STOUT FERMENTING]>" @())) | Out-Null

# Event 22: Smelting Furnace (42 15)
$eventsList.Add((New-EventObj 22 "Smelting Furnace" 42 15 "" 0 "<workshop: smelter> <bark: [FURNACE BURNING HOT]>" @())) | Out-Null

# Update Map001.json
$map = @{
    autoplayBgm = $false
    autoplayBgs = $false
    battleback1Name = ""
    battleback2Name = ""
    bgm = @{ name = ""; pan = 0; pitch = 100; volume = 90 }
    bgs = @{ name = ""; pan = 0; pitch = 100; volume = 90 }
    disableDashing = $false
    displayName = "The Bastion of Kraghold"
    dorphan = $false
    encounterList = @()
    encounterStep = 30
    height = $MapHeight
    note = "<interior>"
    parallaxLoopX = $false
    parallaxLoopY = $false
    parallaxName = ""
    parallaxShow = $true
    parallaxSx = 0
    parallaxSy = 0
    scrollType = 0
    specifyBattleback = $false
    tilesetId = $TilesetId
    width = $MapWidth
    data = $tileData
    events = $eventsList
}

$mapJson = ConvertTo-Json -InputObject $map -Depth 10
Set-Content -Path $mapPath -Value $mapJson -Encoding UTF8
Write-Host "Updated Map001.json ($MapWidth x $MapHeight, $($eventsList.Count - 1) events)" -ForegroundColor Green

# Update System.json start position to center of Great Hall
$sys = Get-Content "$dataDir\System.json" -Raw | ConvertFrom-Json
$sys.startMapId = 1
$sys.startX = 25
$sys.startY = 17
$sys.advanced | Add-Member -NotePropertyName "windowOpacity" -NotePropertyValue 192 -Force
$sys | ConvertTo-Json -Depth 10 | Set-Content "$dataDir\System.json" -Encoding UTF8
Write-Host "Updated starting position to (25, 17) in Great Hall." -ForegroundColor Green

# Bootstrap new container contents
$bootstrapFile = "$GameRoot\js\plugins\UF_BootstrapData.js"
$bootstrap = @"
// Pre-populate container contents
(() => {
    window.`$ufContainers = window.`$ufContainers || {};
    window.`$ufContainers["smith_chest"] = {
        type: "chest",
        items: [
            { id: 2, amount: 2 }, // Steel Broadsword
            { id: 1, amount: 1 }, // Dwarven Battleaxe
            { id: 3, amount: 5 }  // Hematite Chunk
        ]
    };
    window.`$ufContainers["tavern_keg"] = {
        type: "barrel",
        items: [
            { id: 1, amount: 12 }, // Sunshine Stout
            { id: 2, amount: 4 }   // Plump Helmet Roast
        ]
    };
    window.`$ufContainers["dorm_chest"] = {
        type: "chest",
        items: [
            { id: 1, amount: 2 }, // Sunshine Stout
            { id: 2, amount: 1 }  // Plump Helmet Roast
        ]
    };
    window.`$ufContainers["noble_chest"] = {
        type: "chest",
        items: [
            { id: 4, amount: 3 }, // Adamantine Thread
            { id: 2, amount: 1 }  // Steel Broadsword
        ]
    };
    window.`$ufContainers["mine_bin"] = {
        type: "sack",
        items: [
            { id: 3, amount: 10 } // Hematite Chunk
        ]
    };
})();
"@
Set-Content -Path $bootstrapFile -Value $bootstrap -Encoding UTF8
Write-Host "Updated UF_BootstrapData.js with 5 containers." -ForegroundColor Green

Write-Host "=== Mountainhall Fortress Generation Complete! ===" -ForegroundColor Cyan

