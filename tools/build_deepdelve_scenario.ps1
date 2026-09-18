# Build Deepdelve Scenario Data for RPG Maker MZ
$gameRoot = "c:\Users\snewt\OneDrive\Desktop\UF\game"
$dataDir = "$gameRoot\data"
$templateDir = "C:\Program Files (x86)\Steam\steamapps\common\RPG Maker MZ\newdata\data"

Write-Host "=== Building Ultima Fortress: Deepdelve Scenario ===" -ForegroundColor Cyan

function Save-DataArray($array, $path) {
    $list = New-Object System.Collections.ArrayList
    $null = $list.Add($null)
    foreach ($item in $array) {
        if ($item -ne $null) {
            $null = $list.Add($item)
        }
    }
    $json = ConvertTo-Json -InputObject $list.ToArray() -Depth 10
    Set-Content -Path $path -Value $json -Encoding UTF8
}

# 1. Update System.json
$sysPath = "$dataDir\System.json"
$sys = Get-Content "$templateDir\System.json" -Raw | ConvertFrom-Json
$sys.gameTitle = "Ultima Fortress - The Living Mountainhall"
$sys.partyMembers = @(1)
$sys.startMapId = 1
$sys.startX = 12
$sys.startY = 10
$sys.advanced | Add-Member -NotePropertyName "windowOpacity" -NotePropertyValue 192 -Force
$sys | ConvertTo-Json -Depth 10 | Set-Content $sysPath -Encoding UTF8
Write-Host "Updated System.json" -ForegroundColor Green

# 2. Update Actors.json
$actPath = "$dataDir\Actors.json"
$rawActors = Get-Content "$templateDir\Actors.json" -Raw | ConvertFrom-Json
$actors = @($rawActors | Where-Object { $_ -ne $null })
$actors[0].name = "The Avatar"
$actors[0].nickname = "Expedition Leader"
$actors[0].characterName = "`$U7_Avatar"
$actors[0].characterIndex = 0
$actors[0].faceName = "U7_Faces"
$actors[0].faceIndex = 0
$actors[0].profile = "The Avatar of Virtue, leading an expedition into the living mountain halls of Deepdelve."
$actors[0].equips = @(2, 3, 2, 1, 4)

$actors[1].name = "Iolo McArstan"
$actors[1].nickname = "Dwarven Bard"
$actors[1].characterName = "`$U7_Iolo"
$actors[1].characterIndex = 0
$actors[1].faceName = "U7_Faces"
$actors[1].faceIndex = 1

$actors[2].name = "Dupre Ironarm"
$actors[2].nickname = "Militia Captain"
$actors[2].characterName = "`$U7_Dupre"
$actors[2].characterIndex = 0
$actors[2].faceName = "U7_Faces"
$actors[2].faceIndex = 3

$actors[3].name = "Shamino Swift"
$actors[3].nickname = "Deep Scout"
$actors[3].characterName = "`$U7_Shamino"
$actors[3].characterIndex = 0
$actors[3].faceName = "U7_Faces"
$actors[3].faceIndex = 2

Save-DataArray $actors $actPath
Write-Host "Updated Actors.json" -ForegroundColor Green

# 3. Update Items.json
$itemsPath = "$dataDir\Items.json"
$rawItems = Get-Content "$templateDir\Items.json" -Raw | ConvertFrom-Json
$items = @($rawItems | Where-Object { $_ -ne $null })
$items[0].name = "Sunshine Stout"
$items[0].description = "A foaming flagon of Sunshine Stout brewed from plump helmets. Essential for life and good spirits."
$items[0].iconIndex = 224
$items[0].price = 15

$items[1].name = "Plump Helmet Roast"
$items[1].description = "A savory meal of cave mushrooms roasted in tallow. Satisfies dwarven hunger."
$items[1].iconIndex = 256
$items[1].price = 25

$items[2].name = "Hematite Chunk"
$items[2].description = "A heavy lump of raw iron ore fresh from the deeper mines."
$items[2].iconIndex = 160
$items[2].price = 50

$items[3].name = "Adamantine Thread"
$items[3].description = "A glowing strand of pure raw adamantine. Incredibly light, sharp, and durable."
$items[3].iconIndex = 170
$items[3].price = 1000

Save-DataArray $items $itemsPath
Write-Host "Updated Items.json" -ForegroundColor Green

# 4. Update Weapons.json
$weapPath = "$dataDir\Weapons.json"
$rawWeaps = Get-Content "$templateDir\Weapons.json" -Raw | ConvertFrom-Json
$weaps = @($rawWeaps | Where-Object { $_ -ne $null })
$weaps[0].name = "Dwarven Battleaxe"
$weaps[0].description = "A broad-bladed heavy battleaxe forged from mountain iron. Slices through flesh and bone."
$weaps[0].iconIndex = 99
$weaps[0].params = @(0, 0, 24, 0, 0, 0, 0, 0)
$weaps[0].note = "<edged>"

$weaps[1].name = "Steel Broadsword"
$weaps[1].description = "A masterwork steel blade folded sixteen times. Can cleave goblin armor in twain."
$weaps[1].iconIndex = 97
$weaps[1].params = @(0, 0, 22, 0, 0, 0, 2, 0)
$weaps[1].note = "<edged>"

$weaps[2].name = "Heavy War Hammer"
$weaps[2].description = "A dense steel sledge designed to fracture skulls and shatter enemy armor."
$weaps[2].iconIndex = 104
$weaps[2].params = @(0, 0, 26, 0, 0, 0, -2, 0)
$weaps[2].note = "<blunt>"

Save-DataArray $weaps $weapPath
Write-Host "Updated Weapons.json" -ForegroundColor Green

# 5. Update Armors.json
$armPath = "$dataDir\Armors.json"
$rawArms = Get-Content "$templateDir\Armors.json" -Raw | ConvertFrom-Json
$arms = @($rawArms | Where-Object { $_ -ne $null })
$arms[0].name = "Dwarven Plate Mail"
$arms[0].description = "Heavy interlocking iron plates protecting vital thoracic organs."
$arms[0].iconIndex = 135
$arms[0].params = @(0, 0, 0, 22, 0, 0, -2, 0)

$arms[1].name = "Iron Crested Helm"
$arms[1].description = "Stout iron helm designed to deflect deadly skull strikes."
$arms[1].iconIndex = 130
$arms[1].params = @(0, 0, 0, 10, 0, 0, 0, 0)

$arms[2].name = "Iron Round Shield"
$arms[2].description = "A sturdy rimmed round shield bearing the hammer insignia of Deepdelve."
$arms[2].iconIndex = 128
$arms[2].params = @(0, 0, 0, 8, 0, 0, 0, 0)

$arms[3].name = "Steel Toed Greaves"
$arms[3].description = "Heavy greaves protecting legs and feet from stray picks and jagged rocks."
$arms[3].iconIndex = 139
$arms[3].params = @(0, 0, 0, 8, 0, 0, 0, 0)

Save-DataArray $arms $armPath
Write-Host "Updated Armors.json" -ForegroundColor Green

# Update Tilesets.json for Tileset 4
$tsetPath = "$dataDir\Tilesets.json"
$rawTsets = Get-Content "$templateDir\Tilesets.json" -Raw | ConvertFrom-Json
$tsets = @($rawTsets | Where-Object { $_ -ne $null })
$tsets[3].tilesetNames[7] = "U7_Fortress_B"
Save-DataArray $tsets $tsetPath
Write-Host "Updated Tilesets.json" -ForegroundColor Green

# 6. Build Map001.json
$mapPath = "$dataDir\Map001.json"
$map = Get-Content $mapPath -Raw | ConvertFrom-Json
$map.displayName = "The Mountainhall of Deepdelve"
$map.tilesetId = 4
$map.width = 25
$map.height = 20
$map.note = "<interior>"

function New-Event($id, $name, $x, $y, $charName, $charIdx, $note, $list) {
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
                    actorId = 1
                    actorValid = $false
                    itemId = 1
                    itemValid = $false
                    selfSwitchCh = "A"
                    selfSwitchValid = $false
                    switch1Id = 1
                    switch1Valid = $false
                    switch2Id = 1
                    switch2Valid = $false
                    variableId = 1
                    variableValid = $false
                    variableValue = 0
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
                moveRoute = @{
                    list = @(@{ code = 0; parameters = @() })
                    repeat = $true
                    skippable = $false
                    wait = $false
                }
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

$eventsList = New-Object System.Collections.ArrayList
$eventsList.Add($null) | Out-Null # Index 0 null

# Event 1: Urist Ironhand (Smith)
$eventsList.Add((New-Event 1 "Urist Ironhand" 18 6 "`$U7_Blacksmith" 0 "<dialogue: Bomrek_Smith> <occupation: smith> <bark: Cold steel never lies!|Need a sturdier battleaxe?|By the blood of the mountain!>" @())) | Out-Null

# Event 2: Bomrek Aleheart (Tavernkeeper)
$eventsList.Add((New-Event 2 "Bomrek Aleheart" 7 10 "`$U7_Miner" 0 "<dialogue: Urist_Miner> <occupation: miner> <bark: Sunshine Stout on tap!|Another round for the delve!|Mind the cavern spiders!>" @())) | Out-Null

# Event 3: Kogan Deepwarden (Guard)
$eventsList.Add((New-Event 3 "Kogan Deepwarden" 12 5 "`$U7_DwarfGuard" 0 "<dialogue: Kogan_Guard> <occupation: guard> <bark: High alert on the ramparts!|Report any goblin sightings.|Hold the gates!>" @())) | Out-Null

# Event 4: Smithy Chest
$eventsList.Add((New-Event 4 "Smithy Chest" 19 5 "" 0 "<container: chest, smith_chest>" @())) | Out-Null

# Event 5: Sunshine Stout Keg
$eventsList.Add((New-Event 5 "Sunshine Stout Keg" 8 10 "" 0 "<container: barrel, tavern_keg>" @())) | Out-Null

# Event 6: Dormitory Footlocker (Inside Region 50!)
$eventsList.Add((New-Event 6 "Dormitory Footlocker" 4 8 "" 0 "<container: chest, dorm_chest>" @())) | Out-Null

# Event 7: Goblin Raider (Battle Encounter)
$goblinCmds = @(
    @{ code = 101; indent = 0; parameters = @("U7_Faces", 0, 0, 2, "") },
    @{ code = 401; indent = 0; parameters = @("The Goblin Raider snarls, raising a wicked serrated spear!") },
    @{ code = 301; indent = 0; parameters = @(0, 1, $false, $false) }
)
$eventsList.Add((New-Event 7 "Goblin Raider" 12 17 "`$U7_Goblin" 0 "<bark: Sssnakesss!|Die, beard-thing!|Flesh for the pit!>" $goblinCmds)) | Out-Null

# Event 8: Runic Pillar
$pillarCmds = @(
    @{ code = 101; indent = 0; parameters = @("", 0, 0, 2, "") },
    @{ code = 401; indent = 0; parameters = @("*** THE MOUNTAINHALL OF DEEPDELVE ***") },
    @{ code = 401; indent = 0; parameters = @("Welcome to Ultima Fortress (UF)!") },
    @{ code = 401; indent = 0; parameters = @("- Click or use Arrow Keys to explore.") },
    @{ code = 401; indent = 0; parameters = @("- Walk past dwarves to hear overhead Speech Barks.") },
    @{ code = 401; indent = 0; parameters = @("- Press [I] to open the U7 Paperdoll Equipment Screen.") },
    @{ code = 401; indent = 0; parameters = @("- Hold [Shift] near a dwarf to examine their DF Personality Profile.") },
    @{ code = 401; indent = 0; parameters = @("- Step into the West Dormitory (door at 6, 9) to test the Roof Cutaway!") }
)
$eventsList.Add((New-Event 8 "Runic Pillar" 12 12 "" 0 "" $pillarCmds)) | Out-Null

$map.events = $eventsList

# Setup tile layers & Region 50 for the dormitory
$totalTiles = $map.width * $map.height * 6
$tileData = New-Object int[] $totalTiles

for ($y = 0; $y -lt $map.height; $y++) {
    for ($x = 0; $x -lt $map.width; $x++) {
        $idx = ($y * $map.width) + $x
        # Outer boundary walls
        if ($x -eq 0 -or $x -eq ($map.width - 1) -or $y -eq 0 -or $y -eq ($map.height - 1)) {
            $tileData[$idx] = 4352 # Perimeter wall (Dungeon stone wall)
        }
        # Dormitory interior walls (x: 2..6, y: 6..12) with door opening at (6, 9)
        elseif (($x -eq 2 -or $x -eq 6 -or $y -eq 6 -or $y -eq 12) -and ($x -ge 2 -and $x -le 6 -and $y -ge 6 -and $y -le 12)) {
            if ($x -eq 6 -and $y -eq 9) {
                $tileData[$idx] = 2820 # Doorway floor opening!
            } else {
                $tileData[$idx] = 4352 # Dormitory wall
            }
        } else {
            $tileData[$idx] = 2820 # Paved stone floor
        }
    }
}

# Region Layer (Layer 5: 5 * width*height to 6 * width*height - 1)
$regionOffset = 5 * ($map.width * $map.height)
for ($ry = 7; $ry -le 11; $ry++) {
    for ($rx = 3; $rx -le 5; $rx++) {
        $ridx = $regionOffset + ($ry * $map.width) + $rx
        $tileData[$ridx] = 50 # Region 50: Building Interior (Roof Cutaway)
    }
}

$map.data = $tileData
$map | ConvertTo-Json -Depth 10 | Set-Content $mapPath
Write-Host "Updated Map001.json" -ForegroundColor Green

# 7. Pre-populate initial container storage in UF_BootstrapData
$bootstrapPath = "$gameRoot\js\plugins\UF_BootstrapData.js"
$bootstrapCode = @"
// Pre-populate container contents
(() => {
    window.`$ufContainers = window.`$ufContainers || {};
    window.`$ufContainers["smith_chest"] = {
        type: "chest",
        items: [
            { id: 2, amount: 1 },
            { id: 1, amount: 1 },
            { id: 4, amount: 2 }
        ]
    };
    window.`$ufContainers["tavern_keg"] = {
        type: "barrel",
        items: [
            { id: 1, amount: 6 },
            { id: 2, amount: 3 }
        ]
    };
    window.`$ufContainers["dorm_chest"] = {
        type: "chest",
        items: [
            { id: 1, amount: 1 },
            { id: 4, amount: 1 }
        ]
    };
})();
"@
Set-Content $bootstrapPath $bootstrapCode
Write-Host "Created UF_BootstrapData.js" -ForegroundColor Green

# Register bootstrap plugin
$pluginsPath = "$gameRoot\js\plugins.js"
$plugContent = Get-Content $pluginsPath -Raw
if (-not ($plugContent -match "UF_BootstrapData")) {
    $plugContent = $plugContent -replace 'var \$plugins =\s*\[', "var `$plugins =`n[`n{`"name`":`"UF_BootstrapData`",`"status`":true,`"description`":`"Bootstrap container inventories`",`"parameters`":{}},"
    Set-Content $pluginsPath $plugContent
}
Write-Host "Updated plugins.js with bootstrap data" -ForegroundColor Green

Write-Host "=== Deepdelve Scenario Build Complete! ===" -ForegroundColor Green
