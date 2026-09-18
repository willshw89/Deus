# Parse Dwarf Fortress Raws into RMMZ JSON Databases
$ufRoot = "c:\Users\snewt\OneDrive\Desktop\UF"
$rawDir = "$ufRoot\data\vanilla"
$outDir = "$ufRoot\game\data"

Write-Host "=== Parsing Dwarf Fortress Multi-Racial Raws ===" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. Parse Multi-Racial Language Raws (DWARF, HUMAN, ELF, GOBLIN, KOBOLD, GARGISH)
# -----------------------------------------------------------------------------
Write-Host "Parsing Multi-Racial Lexicons..." -ForegroundColor Yellow
$langMap = @{
    dwarven = "$rawDir\vanilla_languages\objects\language_DWARF.txt"
    human   = "$rawDir\vanilla_languages\objects\language_HUMAN.txt"
    elven   = "$rawDir\vanilla_languages\objects\language_ELF.txt"
    goblin  = "$rawDir\vanilla_languages\objects\language_GOBLIN.txt"
}
$wordsFile = "$rawDir\vanilla_languages\objects\language_words.txt"

$lexicon = @{}

foreach ($race in $langMap.Keys) {
    $langFile = $langMap[$race]
    if (Test-Path $langFile) {
        $lines = [System.IO.File]::ReadAllLines($langFile, [System.Text.Encoding]::GetEncoding(28591))
        foreach ($line in $lines) {
            if ($line -match '\[T_WORD:([^:]+):([^\]]+)\]') {
                $key = $matches[1].ToUpper()
                $word = $matches[2].ToLower()
                if (-not $lexicon.ContainsKey($key)) {
                    $lexicon[$key] = @{
                        key = $key
                        english = $key.ToLower()
                    }
                }
                $lexicon[$key][$race] = $word
            }
        }
    }
}

# Add vocabulary categorization flags from language_words.txt
if (Test-Path $wordsFile) {
    $wordLines = [System.IO.File]::ReadAllLines($wordsFile, [System.Text.Encoding]::GetEncoding(28591))
    $currentWord = $null
    foreach ($wline in $wordLines) {
        if ($wline -match '\[WORD:([^\]]+)\]') {
            $currentWord = $matches[1].ToUpper()
        } elseif ($currentWord -and $lexicon.ContainsKey($currentWord)) {
            if ($wline -match '\[NOUN:([^:]+):([^\]]+)\]') {
                $lexicon[$currentWord]["singular"] = $matches[1].ToLower()
                $lexicon[$currentWord]["plural"] = $matches[2].ToLower()
                $lexicon[$currentWord]["isNoun"] = $true
            }
            if ($wline -match '\[ADJ:([^\]]+)\]') {
                $lexicon[$currentWord]["adj"] = $matches[1].ToLower()
                $lexicon[$currentWord]["isAdj"] = $true
            }
        }
    }
}

# Add Kobold Utterances & Gargish Lexicon (Ultima VI/VII Lore)
$gargishMap = @{
    "GREAT"     = "vas"
    "CAUSE"     = "in"
    "MOVE"      = "por"
    "NEGATE"    = "an"
    "ONE"       = "lem"
    "LIGHT"     = "lor"
    "CHANGE"    = "rel"
    "KNOWLEDGE" = "wis"
    "SPIRIT"    = "silv"
    "POISON"    = "nox"
    "FLAME"     = "flam"
    "SMALL"     = "bet"
    "MAGIC"     = "ort"
    "LIFE"      = "mani"
    "TRUE"      = "zav"
    "DEATH"     = "corp"
    "PEACE"     = "zen"
    "ENERGY"    = "grav"
    "PROTECT"   = "sanct"
    "TIME"      = "tym"
    "DILIGENCE" = "in-an"
    "PASSION"   = "vas-flam"
    "CONTROL"   = "vas-wis"
    "SINGULARITY" = "lem-silv"
}

$koboldSyllables = @("skit", "kik", "zat", "snir", "glek", "tik", "churr", "vok", "prik", "rak", "snik", "nak", "grot", "kraz")

$idx = 0
foreach ($entry in $lexicon.Values) {
    # Attach authentic Gargish word if available, else create compound root
    if ($gargishMap.ContainsKey($entry.key)) {
        $entry["gargish"] = $gargishMap[$entry.key]
    } else {
        $s1 = @("vas", "lem", "in", "rel", "lor", "wis", "silv")[$idx % 7]
        $s2 = @("por", "an", "nox", "flam", "mani", "zen", "grav")[$idx % 7]
        $entry["gargish"] = "$s1-$s2"
    }

    # Attach Kobold Utterance
    $k1 = $koboldSyllables[$idx % $koboldSyllables.Length]
    $k2 = $koboldSyllables[($idx + 3) % $koboldSyllables.Length]
    $entry["kobold"] = "$k1-$k2"
    $idx++
}

$lexiconList = @($lexicon.Values)
$lexiconJson = ConvertTo-Json -InputObject $lexiconList -Depth 5
Set-Content -Path "$outDir\df_lexicon.json" -Value $lexiconJson -Encoding UTF8
Write-Host "Exported $($lexiconList.Count) Multi-Racial words (Dwarf, Human, Elf, Goblin, Kobold, Gargish) to df_lexicon.json" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 2. Parse Civilized Entities & Governments
# -----------------------------------------------------------------------------
Write-Host "Parsing Civilized Entities & Governments..." -ForegroundColor Yellow
$entities = @(
    @{
        id = "MOUNTAIN"
        race = "DWARF"
        name = "Dwarven Mountain Realm"
        civType = "Mountainhall"
        titles = @{
            ruler = "King / Queen"
            noble = "Thane / Baron"
            commander = "Expedition Leader"
            spiritual = "Runesmith Elder"
            craftsman = "High Craftsdwarf"
        }
        weapons = @("BATTLEAXE", "WARHAMMER", "CROSSBOW", "SHORT_SWORD", "PICK")
        armors = @("PLATE_MAIL", "CHAIN_MAIL", "IRON_HELM", "TOWER_SHIELD")
        traits = @("METALLURGY", "MINING", "STRANGE_MOODS", "ALCOHOL_LOVING")
    },
    @{
        id = "PLAINS"
        race = "HUMAN"
        name = "Human Feudal Barony"
        civType = "Castle & Town"
        titles = @{
            ruler = "Lord / Lady"
            noble = "Baron / Knight"
            commander = "Captain of the Guard"
            spiritual = "High Priest / Mage"
            craftsman = "Guildmaster"
        }
        weapons = @("BROADSWORD", "HALBERD", "LONGBOW", "SPEAR", "MACE")
        armors = @("PLATE_MAIL", "LEATHER_TUNIC", "HEATER_SHIELD", "STEEL_HELM")
        traits = @("COMMERCE", "AGRICULTURE", "EXPANSION", "CHIVALRY")
    },
    @{
        id = "FOREST"
        race = "ELF"
        name = "Elven Forest Enclave"
        civType = "Arbor Sanctuary"
        titles = @{
            ruler = "Elder / Hierophant"
            noble = "Warden of the Groves"
            commander = "Ranger General"
            spiritual = "Arch-Druid"
            craftsman = "Living-Wood Shaper"
        }
        weapons = @("COMPOSITE_BOW", "WOODEN_SWORD", "SPEAR", "DAGGER")
        armors = @("WOODEN_ARMOR", "CLOTH_CLOAK", "ELVEN_LEATHER")
        traits = @("NATURE_PROTECTION", "VEGETARIAN", "TREE_SACRED", "AGILE")
    },
    @{
        id = "EVIL"
        race = "GOBLIN"
        name = "Goblin Dark Tower"
        civType = "Underworld Pit"
        titles = @{
            ruler = "Warlord / Overlord"
            noble = "Pit Master"
            commander = "Lasher Captain"
            spiritual = "Sinister Shaman"
            craftsman = "Torture Smith"
        }
        weapons = @("WHIP", "SCOURGE", "SPEAR", "CROSSBOW", "SERRATED_BLADE")
        armors = @("DARK_IRON_MAIL", "SPIKED_HELM", "CRUDE_LEATHER")
        traits = @("CARNIVORE", "CRUELTY", "SUBTERRANEAN", "SLAVERY")
    },
    @{
        id = "SKULKING"
        race = "KOBOLD"
        name = "Kobold Skulking Warren"
        civType = "Burrow & Caves"
        titles = @{
            ruler = "Chief Slinker"
            noble = "Trap Weaver"
            commander = "Sneak Leader"
            spiritual = "Cave Whisperer"
            craftsman = "Scrap Tinker"
        }
        weapons = @("BLOWGUN_DARTS", "DAGGER", "SHORT_SPEAR", "SLING")
        armors = @("PATCHWORK_LEATHER", "RAGS", "BONE_CHARMS")
        traits = @("LOCKPICKER", "TRAP_AVOID", "STEALTH", "UTTERANCES")
    },
    @{
        id = "SINGULARITY"
        race = "GARGOYLE"
        name = "Gargoyle Enclave of Singularity"
        civType = "Basalt Citadel"
        titles = @{
            ruler = "Lord of Singularity"
            noble = "Keeper of Control"
            commander = "Warden of Passion"
            spiritual = "Master of Diligence"
            craftsman = "Volcanic Artificer"
        }
        weapons = @("BOOMERANG", "HALBERD", "MYSTIC_SWORD", "STAFF")
        armors = @("BASALT_ARMOR", "BRONZE_CUIRASS", "CEREMONIAL_ROBE")
        traits = @("SINGULARITY_ETHICS", "WINGED_AND_WINGLESS", "VOLCANIC_FORGING", "ANCIENT_MAGIC")
    }
)

$entitiesJson = ConvertTo-Json -InputObject $entities -Depth 5
Set-Content -Path "$outDir\df_entities.json" -Value $entitiesJson -Encoding UTF8
Write-Host "Exported $($entities.Count) Civilized Entity archetypes to df_entities.json" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 3. Parse Geology & Materials (inorganic_stone_layer, mineral, metal)
# -----------------------------------------------------------------------------
Write-Host "Parsing Geological Stone Layers & Minerals..." -ForegroundColor Yellow
$layersFile = "$rawDir\vanilla_materials\objects\inorganic_stone_layer.txt"
$mineralFile = "$rawDir\vanilla_materials\objects\inorganic_stone_mineral.txt"
$metalFile = "$rawDir\vanilla_materials\objects\inorganic_metal.txt"
$gemFile = "$rawDir\vanilla_materials\objects\inorganic_stone_gem.txt"

function Parse-Inorganics($filePath, $category) {
    $items = @()
    if (-not (Test-Path $filePath)) { return $items }
    $lines = [System.IO.File]::ReadAllLines($filePath, [System.Text.Encoding]::GetEncoding(28591))
    $cur = $null

    foreach ($line in $lines) {
        if ($line -match '\[INORGANIC:([^\]]+)\]') {
            if ($cur) { $items += $cur }
            $cur = @{
                id = $matches[1]
                name = $matches[1].ToLower()
                category = $category
                tags = @()
                density = 2600
                color = "GRAY"
            }
        } elseif ($cur) {
            if ($line -match '\[STATE_NAME_ADJ:ALL_SOLID:([^\]]+)\]') {
                $cur.name = $matches[1].ToLower()
            }
            if ($line -match '\[STATE_COLOR:ALL_SOLID:([^\]]+)\]') {
                $cur.color = $matches[1].ToUpper()
            }
            if ($line -match '\[SOLID_DENSITY:(\d+)\]') {
                $cur.density = [int]$matches[1]
            }
            if ($line -match '\[(SEDIMENTARY|IGNEOUS_EXTRUSIVE|IGNEOUS_INTRUSIVE|METAMORPHIC|AQUIFER)\]') {
                $cur.tags += $matches[1]
            }
            if ($line -match '\[METAL_ORE:([^:]+):(\d+)\]') {
                $cur["metalOre"] = $matches[1]
                $cur["metalProb"] = [int]$matches[2]
            }
        }
    }
    if ($cur) { $items += $cur }
    return $items
}

$stoneLayers = Parse-Inorganics $layersFile "layer_stone"
$minerals = Parse-Inorganics $mineralFile "mineral"
$metals = Parse-Inorganics $metalFile "metal"
$gems = Parse-Inorganics $gemFile "gem"

$geology = @{
    layers = $stoneLayers
    minerals = $minerals
    metals = $metals
    gems = $gems
}

$geologyJson = ConvertTo-Json -InputObject $geology -Depth 5
Set-Content -Path "$outDir\df_geology.json" -Value $geologyJson -Encoding UTF8
Write-Host "Exported $($stoneLayers.Count) layers, $($minerals.Count) minerals, $($metals.Count) metals, $($gems.Count) gems to df_geology.json" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 4. Parse DF Smelting & Workshop Reactions
# -----------------------------------------------------------------------------
Write-Host "Parsing Workshop Reactions..." -ForegroundColor Yellow
$smeltFile = "$rawDir\vanilla_reactions\objects\reaction_smelter.txt"
$reactions = @()

if (Test-Path $smeltFile) {
    $lines = [System.IO.File]::ReadAllLines($smeltFile, [System.Text.Encoding]::GetEncoding(28591))
    $curR = $null
    foreach ($line in $lines) {
        if ($line -match '\[REACTION:([^\]]+)\]') {
            if ($curR) { $reactions += $curR }
            $curR = @{
                id = $matches[1]
                name = $matches[1].Replace("_", " ").ToLower()
                building = "SMELTER"
                reagents = @()
                products = @()
            }
        } elseif ($curR) {
            if ($line -match '\[NAME:([^\]]+)\]') {
                $curR.name = $matches[1]
            }
            if ($line -match '\[BUILDING:([^:]+):') {
                $curR.building = $matches[1]
            }
            if ($line -match '\[REAGENT:([^:]+):(\d+):([^:]+):([^:]+):') {
                $curR.reagents += @{
                    name = $matches[1]
                    count = [int]$matches[2]
                    type = $matches[3]
                    material = $matches[4]
                }
            }
            if ($line -match '\[PRODUCT:(\d+):(\d+):([^:]+):([^:]+):') {
                $curR.products += @{
                    prob = [int]$matches[1]
                    count = [int]$matches[2]
                    type = $matches[3]
                    material = $matches[4]
                }
            }
        }
    }
    if ($curR) { $reactions += $curR }
}

# Standard fortress reactions
$reactions += @{
    id = "BREW_SUNSHINE_STOUT"
    name = "Brew Sunshine Stout"
    building = "STILL"
    reagents = @(
        @{ name = "Plump Helmet"; count = 1; type = "PLANT"; material = "MUSHROOM_HELMET_PLUMP" },
        @{ name = "Empty Barrel"; count = 1; type = "BARREL"; material = "WOOD" }
    )
    products = @(
        @{ prob = 100; count = 5; type = "DRINK"; material = "SUNSHINE_STOUT" }
    )
}
$reactions += @{
    id = "FORGE_STEEL_BATTLEAXE"
    name = "Forge Steel Battleaxe"
    building = "FORGE"
    reagents = @(
        @{ name = "Steel Bar"; count = 2; type = "BAR"; material = "STEEL" },
        @{ name = "Fuel/Coal"; count = 1; type = "BAR"; material = "COAL" }
    )
    products = @(
        @{ prob = 100; count = 1; type = "WEAPON"; material = "STEEL_BATTLEAXE" }
    )
}
$reactions += @{
    id = "FORGE_IRON_BATTLEAXE"
    name = "Forge Iron Battleaxe"
    building = "FORGE"
    reagents = @(
        @{ name = "Iron Bar"; count = 2; type = "BAR"; material = "IRON" },
        @{ name = "Fuel/Coal"; count = 1; type = "BAR"; material = "COAL" }
    )
    products = @(
        @{ prob = 100; count = 1; type = "WEAPON"; material = "IRON_BATTLEAXE" }
    )
}

$reactionsJson = ConvertTo-Json -InputObject $reactions -Depth 5
Set-Content -Path "$outDir\df_reactions.json" -Value $reactionsJson -Encoding UTF8
Write-Host "Exported $($reactions.Count) reactions to df_reactions.json" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 5. Parse Creature Anatomy & Caste Information (All 6 Civilized Races + Monsters)
# -----------------------------------------------------------------------------
Write-Host "Parsing Multi-Racial Creature Anatomy & Castes..." -ForegroundColor Yellow
$creatures = @(
    @{
        id = "DWARF"
        name = "Dwarf"
        description = "A short, sturdy creature fond of drink, precious gems, and underground industry."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("skin", "fat", "muscle", "bone", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("skin", "muscle", "cartilage") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("skin", "fat", "muscle", "ribcage", "heart", "lungs") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("skin", "fat", "muscle", "guts") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("skin", "fat", "muscle", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("skin", "fat", "muscle", "bone") },
            @{ name = "left hand"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right hand"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("skin", "fat", "muscle", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("skin", "fat", "muscle", "bone") }
        )
        professions = @("Miner", "Engraver", "Mason", "Blacksmith", "Armorer", "Brewer", "Militia Guard", "Expedition Leader")
        traits = @("CANOPENDOORS", "STRANGE_MOODS", "ALCOHOL_DEPENDENT")
        averageHeight = 135
        baseHealth = 120
    },
    @{
        id = "HUMAN"
        name = "Human"
        description = "A medium-sized creature prone to great ambition, versatile craftsmanship, and wide trade networks."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("skin", "fat", "muscle", "bone", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("skin", "muscle", "arteries") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("skin", "fat", "muscle", "ribcage", "heart", "lungs") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("skin", "fat", "muscle", "guts") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "left hand"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right hand"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") }
        )
        professions = @("Knight", "Mage", "Merchant", "Tavernkeeper", "Bard", "Peasant", "Captain", "Priest")
        traits = @("CANOPENDOORS", "ADAPTABLE", "FEUDAL_HONOR")
        averageHeight = 175
        baseHealth = 100
    },
    @{
        id = "ELF"
        name = "Elf"
        description = "A tall, slender creature dedicated to the ruthless protection of nature and living trees."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("skin", "muscle", "bone", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("skin", "muscle") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("skin", "muscle", "heart", "lungs") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("skin", "muscle", "guts") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "left hand"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right hand"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") }
        )
        professions = @("Ranger", "Arch-Druid", "Diplomat", "Bowyer", "Songcrafter", "Warden")
        traits = @("CANOPENDOORS", "AGILE", "TREE_SACRED", "LONG_LIVED")
        averageHeight = 185
        baseHealth = 90
    },
    @{
        id = "GOBLIN"
        name = "Goblin"
        description = "A medium-sized evil humanoid that dwells in dark towers and underdepths, fond of whips and torture."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("skin", "muscle", "bone", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("skin", "muscle") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("skin", "muscle", "heart", "lungs") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("skin", "muscle", "guts") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") }
        )
        professions = @("Raider", "Lasher", "Spearman", "Crossbowman", "Warlord")
        traits = @("EVIL", "CARNIVORE", "NIGHT_VISION")
        averageHeight = 150
        baseHealth = 95
    },
    @{
        id = "KOBOLD"
        name = "Kobold"
        description = "A small, squat humanoid with large pointy ears, glowing yellow eyes, and exceptional stealth."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("skin", "muscle", "skull", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("skin", "muscle") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("skin", "muscle", "heart", "lungs") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("skin", "muscle", "guts") },
            @{ name = "tail"; canSever = $true; vital = $false; tissues = @("scaly skin", "cartilage", "tailbone") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("skin", "muscle", "bone") }
        )
        professions = @("Thief", "Trapper", "Dart-Spitter", "Cave Slinker", "Scrap Collector")
        traits = @("LOCKPICKER", "TRAP_AVOID", "FLEEQUICK", "UTTERANCES")
        averageHeight = 100
        baseHealth = 70
    },
    @{
        id = "GARGOYLE"
        name = "Gargoyle"
        description = "A proud, horned race of Britannia and the Underworld, honoring the Three Principles of Control, Passion, and Diligence under Singularity."
        castes = @(
            @{
                name = "Winged"
                description = "Possesses sweeping leathery wings and curved horns. Scholars, philosophers, and leaders."
                bodyParts = @(
                    @{ name = "head"; canSever = $true; vital = $true; tissues = @("tough hide", "muscle", "dense skull", "brain") },
                    @{ name = "horns"; canSever = $true; vital = $false; tissues = @("dense horn keratin", "bone core") },
                    @{ name = "throat"; canSever = $false; vital = $true; tissues = @("tough hide", "muscle") },
                    @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("tough hide", "muscle", "ribcage", "heart", "lungs") },
                    @{ name = "wings"; canSever = $true; vital = $false; tissues = @("leathery membrane", "wing muscle", "hollow bone") },
                    @{ name = "tail"; canSever = $true; vital = $false; tissues = @("tough hide", "muscle", "tail vertebrae") },
                    @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("tough hide", "muscle", "bone") },
                    @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("tough hide", "muscle", "bone") },
                    @{ name = "claws"; canSever = $true; vital = $false; tissues = @("hardened talon") },
                    @{ name = "legs"; canSever = $true; vital = $false; tissues = @("tough hide", "muscle", "bone") }
                )
                professions = @("Philosopher", "Mage", "Scholar", "Envoy", "High Priest of Singularity")
            },
            @{
                name = "Wingless"
                description = "Lacks wings but possesses immense physical strength and durable constitution. Artisans, smiths, and miners."
                bodyParts = @(
                    @{ name = "head"; canSever = $true; vital = $true; tissues = @("thick hide", "muscle", "reinforced skull", "brain") },
                    @{ name = "horns"; canSever = $true; vital = $false; tissues = @("solid horn keratin", "bone") },
                    @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("thick hide", "dense muscle", "heavy ribcage", "heart") },
                    @{ name = "tail"; canSever = $true; vital = $false; tissues = @("thick hide", "dense muscle", "vertebrae") },
                    @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("thick hide", "immense muscle", "heavy bone") },
                    @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("thick hide", "immense muscle", "heavy bone") },
                    @{ name = "legs"; canSever = $true; vital = $false; tissues = @("thick hide", "dense muscle", "heavy bone") }
                )
                professions = @("Blacksmith", "Artificer", "Stonemason", "Miner", "Warrior")
            }
        )
        traits = @("SINGULARITY_VIRTUES", "FIRE_RESISTANT", "NATURAL_ARMOR")
        averageHeight = 190
        baseHealth = 140
    },
    @{
        id = "TROLL"
        name = "Cavern Troll"
        description = "A hulking, furred brute native to the subterranean caverns."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("thick fur", "tough hide", "dense skull", "brain") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("thick fur", "dense muscle", "heavy bones", "organs") },
            @{ name = "arms"; canSever = $true; vital = $false; tissues = @("thick fur", "dense muscle", "bone") },
            @{ name = "legs"; canSever = $true; vital = $false; tissues = @("thick fur", "dense muscle", "bone") }
        )
        professions = @("Brute", "War Troll")
        traits = @("BUILDING_DESTROYER", "TRAP_AVOID")
        averageHeight = 260
        baseHealth = 250
    }
)

$creaturesJson = ConvertTo-Json -InputObject $creatures -Depth 5
Set-Content -Path "$outDir\df_creatures.json" -Value $creaturesJson -Encoding UTF8
Write-Host "Exported $($creatures.Count) Multi-Racial creature templates to df_creatures.json" -ForegroundColor Green

Write-Host "=== Multi-Racial DF Raw Parsing Completed Successfully! ===" -ForegroundColor Cyan
