# Script to create Map002: The Glade of Genesis
$width = 30
$height = 30
$totalTiles = $width * $height
$data = New-Object int[] ($totalTiles * 6)

# Layer 0: Grass (2816) with river stream (2048) on columns 24-26
for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $idx = $y * $width + $x
        if ($x -ge 24 -and $x -le 26) {
            $data[$idx] = 2048 # Water
            $data[5 * $totalTiles + $idx] = 10 # Region 10 (Stream)
        } else {
            $data[$idx] = 2816 # Grass
        }
    }
}

# Event 1: Adam
$adam = @{
    id = 1
    name = 'Adam'
    note = '<colonist: Adam> <gender: Male>'
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

# Event 2: Eve
$eve = @{
    id = 2
    name = 'Eve'
    note = '<colonist: Eve> <gender: Female>'
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

# Event 3: Ancient Fruit Tree
$tree = @{
    id = 3
    name = 'Ancient Fruit Tree'
    note = '<tree> <canopy> <harvestable>'
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

$map002 = @{
    autoplayBgm = $false
    bgm = @{ name = ''; pan = 0; pitch = 100; volume = 90 }
    displayName = 'The Glade of Genesis'
    encounterList = @()
    encounterStep = 30
    height = $height
    note = '<outdoor> <glade>'
    parallaxLoopX = $false
    parallaxLoopY = $false
    parallaxName = ''
    parallaxShow = $false
    parallaxSx = 0
    parallaxSy = 0
    scrollType = 0
    specifyBattleback = $false
    tilesetId = 2
    width = $width
    data = $data
    events = @( $null, $adam, $eve, $tree )
}

$json = $map002 | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText("$PSScriptRoot\..\game\data\Map002.json", $json, [System.Text.Encoding]::UTF8)
Write-Host "Created game\data\Map002.json successfully!"

# Update MapInfos.json
$mapInfosPath = "$PSScriptRoot\..\game\data\MapInfos.json"
$mapInfos = Get-Content $mapInfosPath -Raw | ConvertFrom-Json
$hasMap2 = $false
foreach ($m in $mapInfos) {
    if ($m -ne $null -and $m.id -eq 2) { $hasMap2 = $true; break }
}
if (-not $hasMap2) {
    $mapInfos += @{ id = 2; expanded = $false; name = 'The Glade of Genesis'; order = 2; parentId = 0; scrollX = 0; scrollY = 0 }
    $mJson = $mapInfos | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($mapInfosPath, $mJson, [System.Text.Encoding]::UTF8)
    Write-Host "Updated MapInfos.json"
}

# Update System.json: startMapId = 2, startX = 15, startY = 17
$sysPath = "$PSScriptRoot\..\game\data\System.json"
$sys = Get-Content $sysPath -Raw | ConvertFrom-Json
$sys.startMapId = 2
$sys.startX = 15
$sys.startY = 17
$sysJson = $sys | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($sysPath, $sysJson, [System.Text.Encoding]::UTF8)
Write-Host "Updated System.json with startMapId = 2"

