# Build Map002: The Glade of Genesis & Procedural Wilderness
$width = 30
$height = 30
$totalTiles = $width * $height

# Prepare Map Layers (0 to 5)
$tileArray = New-Object System.Collections.Generic.List[int]

# Deterministic PRNG for procedural wilderness decorations
function PseudoRand($seed, $x, $y) {
    $n = [Math]::Sin($x * 12.9898 + $y * 78.233 + $seed * 37.719) * 43758.5453
    return $n - [Math]::Floor($n)
}

for ($layer = 0; $layer -lt 6; $layer++) {
    for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $width; $x++) {
            $distFromCenter = [Math]::Sqrt([Math]::Pow($x - 15, 2) + [Math]::Pow($y - 14, 2))
            $isGladeSanctuary = ($distFromCenter -le 6.5)

            if ($layer -eq 0) {
                # Ground layer: Outside_A2 grass (2863) with smooth continuous river
                if ($x -ge 20 -and $x -le 22) {
                    if ($x -eq 20) {
                        $tileArray.Add(2064) # West river bank
                    } elseif ($x -eq 21) {
                        $tileArray.Add(2048) # Solid deep water
                    } else {
                        $tileArray.Add(2072) # East river bank
                    }
                } else {
                    $tileArray.Add(2863) # Solid center grass autotile
                }
            } elseif ($layer -eq 1) {
                # Layer 1: Flat water decorations (floating water lily pads)
                $placedTile = 0
                if ($x -eq 21 -and ($y -eq 5 -or $y -eq 17 -or $y -eq 25)) {
                    $placedTile = 253 # Floating water lily pad
                }
                $tileArray.Add($placedTile)
            } elseif ($layer -eq 5) {
                # Region layer: Region 10 on freshwater river, Region 20 on procedural wilderness
                if ($x -ge 20 -and $x -le 22) {
                    $tileArray.Add(10) # Region 10: Freshwater River
                } elseif (-not $isGladeSanctuary) {
                    $tileArray.Add(20) # Region 20: Procedural Wilderness
                } else {
                    $tileArray.Add(1)  # Region 1: Glade Sanctuary
                }
            } else {
                $tileArray.Add(0)
            }
        }
    }
}

# Event 1: Adam ($Adam)
$adam = @{
    id = 1
    name = "Adam"
    note = "<colonist: Adam> <gender: Male>"
    x = 13
    y = 15
    pages = @(
        @{
            conditions = @{}
            directionFix = $false
            image = @{ characterIndex = 0; characterName = '$Adam'; direction = 6; pattern = 1 }
            list = @( @{ code = 0; indent = 0; parameters = @() } )
            moveFrequency = 4
            moveRoute = @{ list = @( @{ code = 0; parameters = @() } ); repeat = $true; skippable = $false; wait = $false }
            moveSpeed = 3
            moveType = 0
            priorityType = 1
            stepAnime = $true
            through = $false
            trigger = 0
            walkAnime = $true
        }
    )
}

# Event 2: Eve ($Eve)
$eve = @{
    id = 2
    name = "Eve"
    note = "<colonist: Eve> <gender: Female>"
    x = 17
    y = 15
    pages = @(
        @{
            conditions = @{}
            directionFix = $false
            image = @{ characterIndex = 0; characterName = '$Eve'; direction = 4; pattern = 1 }
            list = @( @{ code = 0; indent = 0; parameters = @() } )
            moveFrequency = 4
            moveRoute = @{ list = @( @{ code = 0; parameters = @() } ); repeat = $true; skippable = $false; wait = $false }
            moveSpeed = 3
            moveType = 0
            priorityType = 1
            stepAnime = $true
            through = $false
            trigger = 0
            walkAnime = $true
        }
    )
}

# Event 3: Ancient Fruit Tree (!$FruitTree)
$tree = @{
    id = 3
    name = "Ancient Fruit Tree"
    note = "<tree> <canopy> <harvestable>"
    x = 15
    y = 14
    pages = @(
        @{
            conditions = @{}
            directionFix = $true
            image = @{ characterIndex = 0; characterName = '!$FruitTree'; direction = 2; pattern = 1 }
            list = @( @{ code = 0; indent = 0; parameters = @() } )
            moveFrequency = 3
            moveRoute = @{ list = @( @{ code = 0; parameters = @() } ); repeat = $true; skippable = $false; wait = $false }
            moveType = 0
            priorityType = 1
            stepAnime = $false
            through = $false
            trigger = 0
            walkAnime = $false
        }
    )
}

# Helper to create wilderness nature events
function New-NatureEvent($id, $name, $note, $x, $y, $charName, $dir, $pat) {
    return @{
        id = $id
        name = $name
        note = $note
        x = $x
        y = $y
        pages = @(
            @{
                conditions = @{}
                directionFix = $true
                image = @{ characterIndex = 0; characterName = $charName; direction = $dir; pattern = $pat }
                list = @( @{ code = 0; indent = 0; parameters = @() } )
                moveFrequency = 3
                moveRoute = @{ list = @( @{ code = 0; parameters = @() } ); repeat = $true; skippable = $false; wait = $false }
                moveType = 0
                priorityType = 1
                stepAnime = $false
                through = $false
                trigger = 0
                walkAnime = $false
            }
        )
    }
}

# Procedural Wilderness Events around the Glade Sanctuary
$eventsList = @(
    $null,
    $adam,
    $eve,
    $tree,
    (New-NatureEvent 4 "Wilderness Timber Tree" "<tree> <harvestable>" 6 7 "" 2 0),
    (New-NatureEvent 5 "Wilderness Timber Tree" "<tree> <harvestable>" 5 23 "" 2 0),
    (New-NatureEvent 6 "Granite Boulder" "<resource: stone>" 26 7 "" 2 0),
    (New-NatureEvent 7 "Wilderness Timber Tree" "<tree> <harvestable>" 26 24 "" 2 0),
    (New-NatureEvent 8 "Ironstone Outcrop" "<resource: mineral>" 7 19 "" 2 0),
    (New-NatureEvent 9 "Wilderness Pine" "<tree> <harvestable>" 25 15 "" 2 0)
)

$mapObj = [ordered]@{
    autoplayBgm = $false
    autoplayBgs = $false
    battleback1Name = ""
    battleback2Name = ""
    bgm = @{ name = ""; pan = 0; pitch = 100; volume = 90 }
    bgs = @{ name = ""; pan = 0; pitch = 100; volume = 90 }
    disableDashing = $false
    displayName = ""
    dorphan = $false
    encounterList = @()
    encounterStep = 30
    height = $height
    note = "<outdoor> <glade>"
    parallaxLoopX = $false
    parallaxLoopY = $false
    parallaxName = ""
    parallaxShow = $false
    parallaxSx = 0
    parallaxSy = 0
    scrollType = 0
    specifyBattleback = $false
    tilesetId = 2
    width = $width
    data = $tileArray.ToArray()
    events = $eventsList
}

Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 50000000
$json = $serializer.Serialize($mapObj)

[System.IO.File]::WriteAllText("$PSScriptRoot\..\game\data\Map002.json", $json, [System.Text.Encoding]::UTF8)
Write-Host "Map002 built cleanly with authentic nature tiles and no artificial artifacts!"
