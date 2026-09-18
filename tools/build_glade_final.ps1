# Build Map002: The Glade of Genesis (Clean & Correct)
$width = 30
$height = 30
$totalTiles = $width * $height

# Prepare Layer 0: Outside_A2 grass (2863), river on cols 24-26 (2095)
$tileArray = New-Object System.Collections.Generic.List[int]
for ($layer = 0; $layer -lt 6; $layer++) {
    for ($y = 0; $y -lt $height; $y++) {
        for ($x = 0; $x -lt $width; $x++) {
            if ($layer -eq 0) {
                # Ground layer: grass (2863) with river (2095)
                if ($x -ge 20 -and $x -le 22) {
                    $tileArray.Add(2095) # Solid center water autotile
                } else {
                    $tileArray.Add(2863) # Solid center grass autotile
                }
            } elseif ($layer -eq 5) {
                # Region layer: Region 10 on river
                if ($x -ge 20 -and $x -le 22) {
                    $tileArray.Add(10)
                } else {
                    $tileArray.Add(0)
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
            moveFrequency = 3
            moveRoute = @{ list = @( @{ code = 0; parameters = @() } ); repeat = $true; skippable = $false; wait = $false }
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
            moveFrequency = 3
            moveRoute = @{ list = @( @{ code = 0; parameters = @() } ); repeat = $true; skippable = $false; wait = $false }
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

$mapObj = [ordered]@{
    autoplayBgm = $false
    autoplayBgs = $false
    battleback1Name = ""
    battleback2Name = ""
    bgm = @{ name = ""; pan = 0; pitch = 100; volume = 90 }
    bgs = @{ name = ""; pan = 0; pitch = 100; volume = 90 }
    disableDashing = $false
    displayName = "The Glade of Genesis"
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
    events = @( $null, $adam, $eve, $tree )
}

Add-Type -AssemblyName System.Web.Extensions
$serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$serializer.MaxJsonLength = 50000000
$json = $serializer.Serialize($mapObj)

[System.IO.File]::WriteAllText("$PSScriptRoot\..\game\data\Map002.json", $json, [System.Text.Encoding]::UTF8)
Write-Host "Map002 built cleanly with grass autotile 2863 and 2.5D characters!"

