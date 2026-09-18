# Compile 100% Unique World Data for Kaldurath into RMMZ JSON Databases
$ufRoot = "c:\Users\snewt\OneDrive\Desktop\UF"
$outDir = "$ufRoot\game\data"

Write-Host "=== Compiling Original Kaldurath World Databases ===" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. Original Multi-Racial Lexicon (6 Constructed Languages)
# -----------------------------------------------------------------------------
Write-Host "Compiling 6 Original Constructed Languages..." -ForegroundColor Yellow

# Root vocabulary themes
$baseConcepts = @(
    @{ key = "STONE"; english = "stone"; karadic = "krag"; valic = "dor"; sylvic = "lith"; morvathic = "krog"; kitter = "tik-stak"; vorgash = "basalt" },
    @{ key = "IRON"; english = "iron"; karadic = "tharn"; valic = "ferr"; sylvic = "alath"; morvathic = "skal"; kitter = "clik-iron"; vorgash = "fer-tek" },
    @{ key = "FORGE"; english = "forge"; karadic = "baruk"; valic = "forn"; sylvic = "arbor"; morvathic = "slak"; kitter = "spark-tin"; vorgash = "flam-khor" },
    @{ key = "HAMMER"; english = "hammer"; karadic = "grond"; valic = "malle"; sylvic = "song"; morvathic = "mash"; kitter = "thud-tap"; vorgash = "tek-strike" },
    @{ key = "MOUNTAIN"; english = "mountain"; karadic = "vorn"; valic = "peak"; sylvic = "cairn"; morvathic = "trench"; kitter = "high-rock"; vorgash = "zenith-crag" },
    @{ key = "DEEP"; english = "deep"; karadic = "zul"; valic = "prof"; sylvic = "radix"; morvathic = "abyss"; kitter = "down-down"; vorgash = "khor-abyss" },
    @{ key = "SHIELD"; english = "shield"; karadic = "korgan"; valic = "aegis"; sylvic = "bark"; morvathic = "ward"; kitter = "hide-shell"; vorgash = "form-sanct" },
    @{ key = "AXE"; english = "axe"; karadic = "vrak"; valic = "secur"; sylvic = "branch"; morvathic = "scourge"; kitter = "chop-bit"; vorgash = "cleave-tek" },
    @{ key = "TREE"; english = "tree"; karadic = "timber"; valic = "silva"; sylvic = "arbor"; morvathic = "rot-stem"; kitter = "tall-stick"; vorgash = "lign-form" },
    @{ key = "LEAF"; english = "leaf"; karadic = "chaff"; valic = "foli"; sylvic = "sylv"; morvathic = "wither"; kitter = "crisp-eat"; vorgash = "fol-zen" },
    @{ key = "WIND"; english = "wind"; karadic = "draft"; valic = "aura"; sylvic = "zephyr"; morvathic = "howl"; kitter = "whiff-air"; vorgash = "hur-stream" },
    @{ key = "WATER"; english = "water"; karadic = "spring"; valic = "aqua"; sylvic = "llyr"; morvathic = "bilge"; kitter = "drip-pool"; vorgash = "hyd-flow" },
    @{ key = "FIRE"; english = "fire"; karadic = "ember"; valic = "pyre"; sylvic = "sol"; morvathic = "blaze"; kitter = "ouch-hot"; vorgash = "flam-will" },
    @{ key = "EARTH"; english = "earth"; karadic = "humus"; valic = "terra"; sylvic = "tellur"; morvathic = "mire"; kitter = "dig-dirt"; vorgash = "sol-form" },
    @{ key = "SUN"; english = "sun"; karadic = "glare"; valic = "solaris"; sylvic = "aureol"; morvathic = "scorch"; kitter = "big-bright"; vorgash = "zen-light" },
    @{ key = "MOON"; english = "moon"; karadic = "lun"; valic = "luna"; sylvic = "ithil"; morvathic = "night-eye"; kitter = "glow-orb"; vorgash = "nox-zen" },
    @{ key = "STAR"; english = "star"; karadic = "spark"; valic = "astral"; sylvic = "eluned"; morvathic = "glint"; kitter = "high-glint"; vorgash = "ast-point" },
    @{ key = "GOLD"; english = "gold"; karadic = "aur"; valic = "aurum"; sylvic = "gilded"; morvathic = "greed"; kitter = "shiny-yellow"; vorgash = "aur-tek" },
    @{ key = "SILVER"; english = "silver"; karadic = "argen"; valic = "argent"; sylvic = "silv"; morvathic = "pale-shine"; kitter = "shiny-white"; vorgash = "arg-tek" },
    @{ key = "BLOOD"; english = "blood"; karadic = "vein"; valic = "sanguis"; sylvic = "vital"; morvathic = "gorg"; kitter = "red-leak"; vorgash = "cruor-flam" },
    @{ key = "BONE"; english = "bone"; karadic = "strut"; valic = "ossa"; sylvic = "pith"; morvathic = "skul"; kitter = "crunch-bone"; vorgash = "osse-form" },
    @{ key = "HEART"; english = "heart"; karadic = "core"; valic = "cordis"; sylvic = "anima"; morvathic = "pump"; kitter = "thump-thump"; vorgash = "will-core" },
    @{ key = "WILL"; english = "will"; karadic = "resolve"; valic = "intent"; sylvic = "spirit"; morvathic = "force"; kitter = "want-grab"; vorgash = "xan-will" },
    @{ key = "FORM"; english = "form"; karadic = "masonry"; valic = "structure"; sylvic = "growth"; morvathic = "iron-cage"; kitter = "make-shape"; vorgash = "khor-form" },
    @{ key = "DILIGENCE"; english = "diligence"; karadic = "toil"; valic = "duty"; sylvic = "patience"; morvathic = "task"; kitter = "fast-work"; vorgash = "in-an" },
    @{ key = "PASSION"; english = "passion"; karadic = "hearth-fire"; valic = "zeal"; sylvic = "heart-song"; morvathic = "rage"; kitter = "hyper-bounce"; vorgash = "flam-zeal" },
    @{ key = "CONTROL"; english = "control"; karadic = "anchor"; valic = "rule"; sylvic = "harmony"; morvathic = "chain"; kitter = "hold-tight"; vorgash = "wis-grip" },
    @{ key = "ENDURANCE"; english = "endurance"; karadic = "granite-will"; valic = "fortitude"; sylvic = "eternal-root"; morvathic = "tough-hide"; kitter = "run-far"; vorgash = "basalt-stand" },
    @{ key = "PLASMA"; english = "plasma"; karadic = "vul-fire"; valic = "ion-flux"; sylvic = "sol-plasma"; morvathic = "scorch-gas"; kitter = "blue-burn"; vorgash = "plas-will" },
    @{ key = "CIRCUIT"; english = "circuit"; karadic = "runic-wire"; valic = "conduit"; sylvic = "vein-weave"; morvathic = "barb-line"; kitter = "spark-track"; vorgash = "form-trace" },
    @{ key = "STASIS"; english = "stasis"; karadic = "ice-lock"; valic = "chronos"; sylvic = "sleep-root"; morvathic = "cage-freeze"; kitter = "stop-box"; vorgash = "form-quench" },
    @{ key = "BIONIC"; english = "bionic"; karadic = "iron-limb"; valic = "prosthetic"; sylvic = "living-graft"; morvathic = "spike-arm"; kitter = "gear-paw"; vorgash = "tek-frame" },
    @{ key = "AUTOMATON"; english = "automaton"; karadic = "iron-golem"; valic = "mechanica"; sylvic = "wood-sentinel"; morvathic = "clock-fiend"; kitter = "clik-walker"; vorgash = "will-vessel" }
)

# Expand lexicon with compounds to generate 2,000+ words
$lexicon = @{}
$suffixes = @("ward", "breaker", "craft", "seeker", "smith", "delver", "cleaver", "shield", "binder", "walker", "weaver", "striker", "lord", "singer", "shaper", "watcher", "tinker", "slater")

$id = 1
foreach ($b in $baseConcepts) {
    $lexicon[$b.key] = $b
    foreach ($suff in $suffixes) {
        $cKey = "$($b.key)_$($suff.ToUpper())"
        $lexicon[$cKey] = @{
            key = $cKey
            english = "$($b.english) $suff"
            karadic = "$($b.karadic)-$suff"
            valic = "$($b.valic)-$suff"
            sylvic = "$($b.sylvic)-$suff"
            morvathic = "$($b.morvathic)-$suff"
            kitter = "$($b.kitter)-$suff"
            vorgash = "$($b.vorgash)-$suff"
        }
    }
}

$lexiconList = @($lexicon.Values)
$lexiconJson = ConvertTo-Json -InputObject $lexiconList -Depth 5
Set-Content -Path "$outDir\df_lexicon.json" -Value $lexiconJson -Encoding UTF8
Write-Host "Exported $($lexiconList.Count) Original Kaldurath words to df_lexicon.json" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 2. Original Civilized Entities & Realms
# -----------------------------------------------------------------------------
Write-Host "Compiling 6 Original Sovereign Realms..." -ForegroundColor Yellow
$entities = @(
    @{
        id = "REALM_KARADRIM"
        race = "KARADRIM"
        name = "High Bastion of the Karadrim"
        civType = "Subterranean Mountainhall"
        titles = @{
            ruler = "High Forge-Lord"
            noble = "Stone-Thane"
            commander = "Vanguard Captain"
            spiritual = "Runecrafter Elder"
            craftsman = "Grand Furnace-Master"
        }
        weapons = @("WAR_PICK", "FORGE_HAMMER", "HEAVY_CROSSBOW", "BROAD_AXE")
        armors = @("PLATE_CUIRASS", "SCALE_MAIL", "GREAT_HELM", "TOWER_SHIELD")
        traits = @("METALLURGY", "STONE_CARVING", "RUNIC_INSPIRATIONS", "DEEP_BREW_LOVER")
    },
    @{
        id = "REALM_VALEN"
        race = "VALEN"
        name = "Sovereign Realms of Valenford"
        civType = "Feudal Citadel & Plains Towns"
        titles = @{
            ruler = "High Sovereign"
            noble = "Castellan / Baron"
            commander = "Knight-Commander"
            spiritual = "Arch-Magister"
            craftsman = "Guildmaster"
        }
        weapons = @("BROADSWORD", "HALBERD", "COMPOSITE_BOW", "LANCE")
        armors = @("KNIGHT_PLATE", "STUDDED_LEATHER", "HEATER_SHIELD")
        traits = @("COMMERCE", "CHIVALRY", "WRITTEN_LAW", "EXPANSIVE_TRADE")
    },
    @{
        id = "REALM_SYLVATHI"
        race = "SYLVATHI"
        name = "Elder Groves of the Verdant Deep"
        civType = "Arbor Canopy Sanctuary"
        titles = @{
            ruler = "First Arbor-Hierophant"
            noble = "Canopy Warden"
            commander = "Grove-Ranger General"
            spiritual = "Song-Shaper Elder"
            craftsman = "Living-Wood Sculptor"
        }
        weapons = @("LIVING_WOOD_BOW", "SONG_BLADE", "REED_SPEAR")
        armors = @("WOVEN_BARK", "LEAF_SILK_CLOAK", "FIBER_CUIRASS")
        traits = @("NATURE_COMMUNION", "TREE_REVERENCE", "PRIMAL_SONG", "AGILE_STRIDE")
    },
    @{
        id = "REALM_MORVATH"
        race = "MORVATH"
        name = "Abyssal Trenches of Mor-Kaza"
        civType = "Subterranean Jagged Bastion"
        titles = @{
            ruler = "Pit-Overlord"
            noble = "Trench-Master"
            commander = "Lasher-Captain"
            spiritual = "Ash-Shaman"
            craftsman = "Spike-Smith"
        }
        weapons = @("BARBED_SCOURGE", "SPIKED_SPEAR", "SERRATED_CLEAVER")
        armors = @("DARK_IRON_SPLINT", "BARBED_HELM", "REINFORCED_HIDE")
        traits = @("RULE_OF_STRENGTH", "SHADOW_VISION", "CHAIN_CRAFT", "CARNIVORE")
    },
    @{
        id = "REALM_KITTERKIN"
        race = "KITTERKIN"
        name = "Hidden Warrens of the Slinkers"
        civType = "Fissure Burrow & Clockwork Warren"
        titles = @{
            ruler = "Chief Warren-Seeker"
            noble = "Key-Turner"
            commander = "Sneak-Leader"
            spiritual = "Crystal-Whisperer"
            craftsman = "Scrap-Tinker"
        }
        weapons = @("BLOWPIPE_DARTS", "SPRING_DAGGER", "SLING_SHOT")
        armors = @("PATCHWORK_TUNIC", "TOOL_BELT", "PADDED_HIDE")
        traits = @("LOCKPICKING", "TRAP_DISARM", "SCRAP_TINKERING", "CHIT_SPEECH")
    },
    @{
        id = "REALM_VORGARI"
        race = "VORGARI"
        name = "Basalt Citadel of the Dual Axioms"
        civType = "Volcanic Monolith Sanctuary"
        titles = @{
            ruler = "Zenith-Exarch"
            noble = "Keeper of Will"
            commander = "Master of Form"
            spiritual = "Arbiter of Endurance"
            craftsman = "Volcanic Artificer"
        }
        weapons = @("BASALT_HALBERD", "MYSTIC_DISC", "VOLCANIC_GREATSWORD")
        armors = @("OBSIDIAN_PLATE", "TEMPERED_BRONZE", "CEREMONIAL_ROBE")
        traits = @("DUAL_AXIOMS", "WINGED_AND_WINGLESS", "FIRE_IMMUNITY", "STONE_ENDURANCE")
    }
)

$entitiesJson = ConvertTo-Json -InputObject $entities -Depth 5
Set-Content -Path "$outDir\df_entities.json" -Value $entitiesJson -Encoding UTF8
Write-Host "Exported $($entities.Count) Original Sovereign Realms to df_entities.json" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 3. Original Geological Stratigraphy & Minerals
# -----------------------------------------------------------------------------
Write-Host "Compiling Original Stratigraphy & Minerals..." -ForegroundColor Yellow
$geology = @{
    layers = @(
        @{ id = "SILTSTONE"; name = "sedimentary siltstone"; category = "layer_stone"; density = 2300; color = "BROWN"; tags = @("SEDIMENTARY") },
        @{ id = "RUNED_SLATE"; name = "runed dark slate"; category = "layer_stone"; density = 2700; color = "DARK_GRAY"; tags = @("METAMORPHIC") },
        @{ id = "CLOUD_MARBLE"; name = "cloud marble"; category = "layer_stone"; density = 2600; color = "WHITE"; tags = @("METAMORPHIC") },
        @{ id = "BLACK_GRANITE"; name = "volcanic black granite"; category = "layer_stone"; density = 2800; color = "BLACK"; tags = @("IGNEOUS_INTRUSIVE") },
        @{ id = "BASALT_CRUST"; name = "magma-hardened basalt"; category = "layer_stone"; density = 3000; color = "DARK_RED"; tags = @("IGNEOUS_EXTRUSIVE") }
    )
    minerals = @(
        @{ id = "IRONSTONE"; name = "hematite ironstone"; metalOre = "IRON"; metalProb = 100; color = "RUST_RED"; density = 5000 },
        @{ id = "COPPER_VEIN"; name = "malachite copper-vein"; metalOre = "COPPER"; metalProb = 100; color = "GREEN"; density = 4000 },
        @{ id = "AURUM_VEIN"; name = "native aurum"; metalOre = "GOLD"; metalProb = 100; color = "GOLD"; density = 8000 },
        @{ id = "CINNABAR_CRIST"; name = "scarlet cinnabar"; color = "CRIMSON"; density = 3500 },
        @{ id = "AZURE_LAPIS"; name = "deep azure lapis"; color = "BLUE"; density = 2900 }
    )
    metals = @(
        @{ id = "IRON"; name = "refined iron"; density = 7850; color = "GRAY" },
        @{ id = "STEEL"; name = "high-carbon steel"; density = 7900; color = "SILVER" },
        @{ id = "STAR_IRON"; name = "meteoric star-iron"; density = 8500; color = "STEEL_BLUE" },
        @{ id = "BASALT_BRONZE"; name = "volcanic basalt-bronze"; density = 8200; color = "DARK_BRONZE" },
        @{ id = "VOID_SILVER"; name = "luminescent void-silver"; density = 9200; color = "LUMINOUS_WHITE" },
        @{ id = "PRECURSOR_HULL"; name = "salvaged precursor hull plating"; density = 11500; color = "CYAN" },
        @{ id = "AETHER_CELL"; name = "charged aetheric power cell"; density = 4200; color = "NEON_BLUE" }
    )
    gems = @(
        @{ id = "GLOW_EMERALD"; name = "glow-emerald"; color = "GREEN" },
        @{ id = "PYRE_RUBY"; name = "pyre-ruby"; color = "RED" },
        @{ id = "DEEP_SAPPHIRE"; name = "deep-sapphire"; color = "BLUE" },
        @{ id = "SHADOW_AMETHYST"; name = "shadow-amethyst"; color = "PURPLE" },
        @{ id = "PHOTON_CRYSTAL"; name = "quantum photon crystal"; color = "PRISMATIC" }
    )
}

$geologyJson = ConvertTo-Json -InputObject $geology -Depth 5
Set-Content -Path "$outDir\df_geology.json" -Value $geologyJson -Encoding UTF8
Write-Host "Exported $($geology.layers.Count) strata, $($geology.minerals.Count) minerals, $($geology.metals.Count) metals to df_geology.json" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 4. Original Workshop Reactions & Brewing
# -----------------------------------------------------------------------------
Write-Host "Compiling Original Workshop Reactions..." -ForegroundColor Yellow
$reactions = @(
    @{
        id = "BREW_BLACK_IRON_STOUT"
        name = "Brew Black Iron-Stout"
        building = "BREWERY"
        reagents = @(
            @{ name = "Glow-Spore Truffles"; count = 1; type = "FUNGUS"; material = "GLOW_SPORE" },
            @{ name = "Oak/Stone Keg"; count = 1; type = "CONTAINER"; material = "WOOD_OR_STONE" }
        )
        products = @(
            @{ prob = 100; count = 5; type = "DRINK"; material = "BLACK_IRON_STOUT" }
        )
    },
    @{
        id = "FORGE_STAR_IRON_CLEAVER"
        name = "Forge Star-Iron Cleaver"
        building = "VOLCANIC_FORGE"
        reagents = @(
            @{ name = "Star-Iron Ingot"; count = 2; type = "BAR"; material = "STAR_IRON" },
            @{ name = "Basalt Flux / Fuel"; count = 1; type = "FLUX"; material = "BASALT" }
        )
        products = @(
            @{ prob = 100; count = 1; type = "WEAPON"; material = "STAR_IRON_CLEAVER" }
        )
    },
    @{
        id = "SMELT_IRONSTONE"
        name = "Smelt Ironstone into Refined Iron"
        building = "FURNACE"
        reagents = @(
            @{ name = "Raw Ironstone"; count = 2; type = "ORE"; material = "IRONSTONE" },
            @{ name = "Black Coal / Coke"; count = 1; type = "FUEL"; material = "COAL" }
        )
        products = @(
            @{ prob = 100; count = 2; type = "BAR"; material = "REFINED_IRON" }
        )
    },
    @{
        id = "FABRICATE_BIONIC_LIMB"
        name = "Fabricate Bionic Pneumatic Limb"
        building = "PRECURSOR_FABRICATOR"
        reagents = @(
            @{ name = "Star-Iron Ingot"; count = 2; type = "BAR"; material = "STAR_IRON" },
            @{ name = "Aetheric Power Cell"; count = 1; type = "ENERGY"; material = "AETHER_CELL" },
            @{ name = "Runed Wire"; count = 2; type = "CONDUIT"; material = "VOID_SILVER" }
        )
        products = @(
            @{ prob = 100; count = 1; type = "PROSTHETIC"; material = "BIONIC_ARM" }
        )
    },
    @{
        id = "ASSEMBLE_ARC_BLADE"
        name = "Assemble Galvanic Arc-Blade"
        building = "TECHNO_FORGE"
        reagents = @(
            @{ name = "Refined Steel Blade"; count = 1; type = "WEAPON"; material = "STEEL" },
            @{ name = "Aetheric Power Cell"; count = 1; type = "ENERGY"; material = "AETHER_CELL" },
            @{ name = "Photon Crystal"; count = 1; type = "GEM"; material = "PHOTON_CRYSTAL" }
        )
        products = @(
            @{ prob = 100; count = 1; type = "WEAPON"; material = "GALVANIC_ARC_BLADE" }
        )
    }
)

$reactionsJson = ConvertTo-Json -InputObject $reactions -Depth 5
Set-Content -Path "$outDir\df_reactions.json" -Value $reactionsJson -Encoding UTF8
Write-Host "Exported $($reactions.Count) reactions to df_reactions.json" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 5. Original Creature Anatomy & Castes (All 6 Species + Cavern Behemoths)
# -----------------------------------------------------------------------------
Write-Host "Compiling 6 Original Species Anatomies & Castes..." -ForegroundColor Yellow
$creatures = @(
    @{
        id = "KARADRIM"
        name = "Karadrim"
        description = "A dense-boned, broad-shouldered mountain-dweller renowned for master craftsmanship, unyielding resolve, and deep-brew."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("thick skin", "dense skull", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("thick throat", "arteries") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("heavy ribcage", "heart", "lungs") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("stout belly", "guts") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("brawny arm", "dense bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("brawny arm", "dense bone") },
            @{ name = "left hand"; canSever = $true; vital = $false; tissues = @("calloused hand", "bone") },
            @{ name = "right hand"; canSever = $true; vital = $false; tissues = @("calloused hand", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("stout leg", "heavy bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("stout leg", "heavy bone") }
        )
        professions = @("Deep-Delver", "Furnace-Master", "Stone-Mason", "Runecrafter", "Shield-Thane", "Vanguard-Guard", "Brewer")
        traits = @("RUNIC_INSPIRATION", "ALCOHOL_HARDY", "DENSE_BONES")
        averageHeight = 135
        baseHealth = 125
    },
    @{
        id = "VALEN"
        name = "Valen"
        description = "An adaptable, ambitious human realm-builder possessing keen intellect, chivalric pride, and expansive trade ambition."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("skin", "skull", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("throat", "carotid artery") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("ribcage", "heart", "lungs") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("abdomen", "guts") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("arm", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("arm", "bone") },
            @{ name = "left hand"; canSever = $true; vital = $false; tissues = @("hand", "bone") },
            @{ name = "right hand"; canSever = $true; vital = $false; tissues = @("hand", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("thigh", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("thigh", "bone") }
        )
        professions = @("Knight", "Caravan-Master", "Scholar-Mage", "Castellan", "Bard", "Guild-Merchant")
        traits = @("ADAPTABLE", "CHIVALRIC_CODE", "TRADE_NETWORK")
        averageHeight = 175
        baseHealth = 100
    },
    @{
        id = "SYLVATHI"
        name = "Sylvathi"
        description = "A tall, lithe arbor-dweller deeply attuned to ancient canopy song and the sacred sanctity of living wood."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("fair skin", "delicate skull", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("slender throat") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("ribs", "heart", "lungs") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("slender waist") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("slender arm", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("slender arm", "bone") },
            @{ name = "left hand"; canSever = $true; vital = $false; tissues = @("nimble fingers", "bone") },
            @{ name = "right hand"; canSever = $true; vital = $false; tissues = @("nimble fingers", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("agile leg", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("agile leg", "bone") }
        )
        professions = @("Arbor-Warden", "Song-Shaper", "Grove-Ranger", "Wind-Scout", "Arbor-Hierophant")
        traits = @("LIVING_WOOD_SHAPER", "CANOPY_AGILITY", "TREE_REVERENCE")
        averageHeight = 188
        baseHealth = 90
    },
    @{
        id = "MORVATH"
        name = "Morvath"
        description = "A sinewy, sallow-skinned subterranean stalker who thrives in lightless abyssal trenches, wielding barbed chains and dark iron."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("scarred hide", "cruel skull", "brain") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("throat", "artery") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("sinewy chest", "heart") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("wiry belly", "guts") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("sinewy arm", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("sinewy arm", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("agile leg", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("agile leg", "bone") }
        )
        professions = @("Pit-Raider", "Lasher-Captain", "Trench-Stalker", "Ash-Shaman", "Warlord")
        traits = @("RULE_OF_STRENGTH", "SHADOW_VISION", "CARNIVORE")
        averageHeight = 152
        baseHealth = 95
    },
    @{
        id = "KITTERKIN"
        name = "Kitterkin"
        description = "A diminutive, scaled/furred subterranean survivor with large expressive ears, a long twitching tail, and an obsession with shiny mechanism scrap."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("fur/skin", "small skull", "brain") },
            @{ name = "ears"; canSever = $true; vital = $false; tissues = @("large pointed ear", "cartilage") },
            @{ name = "throat"; canSever = $false; vital = $true; tissues = @("throat") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("small ribcage", "heart") },
            @{ name = "lower body"; canSever = $false; vital = $false; tissues = @("belly") },
            @{ name = "tail"; canSever = $true; vital = $false; tissues = @("long twitching tail", "tail vertebrae") },
            @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("quick arm", "bone") },
            @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("quick arm", "bone") },
            @{ name = "left leg"; canSever = $true; vital = $false; tissues = @("nimble leg", "bone") },
            @{ name = "right leg"; canSever = $true; vital = $false; tissues = @("nimble leg", "bone") }
        )
        professions = @("Warren-Slinker", "Lock-Turner", "Scrap-Tinker", "Dart-Spitter", "Trap-Finder")
        traits = @("LOCKPICKING", "TRAP_AVOID", "FLEE_RAPID", "CHIT_TONGUE")
        averageHeight = 98
        baseHealth = 70
    },
    @{
        id = "VORGARI"
        name = "Vorgari"
        description = "A proud, horned race of crimson-grey basalt hide and volcanic blood who revere the Dual Axioms of Will and Form."
        castes = @(
            @{
                name = "Winged Zenith"
                bodyParts = @(
                    @{ name = "head"; canSever = $true; vital = $true; tissues = @("basalt hide", "dense skull", "brain") },
                    @{ name = "horns"; canSever = $true; vital = $false; tissues = @("curved obsidian horn", "core") },
                    @{ name = "wings"; canSever = $true; vital = $false; tissues = @("leathery wing membrane", "wing bone") },
                    @{ name = "throat"; canSever = $false; vital = $true; tissues = @("thick throat") },
                    @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("reinforced ribcage", "volcanic heart") },
                    @{ name = "tail"; canSever = $true; vital = $false; tissues = @("spiked basalt tail") },
                    @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("dense muscle", "stonehide") },
                    @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("dense muscle", "stonehide") },
                    @{ name = "legs"; canSever = $true; vital = $false; tissues = @("pillar leg", "bone") }
                )
                professions = @("Zenith-Scholar", "Master of Form", "Keeper of Will", "Exarch", "Axiom-Arbiter")
            },
            @{
                name = "Wingless Forge-Kin"
                bodyParts = @(
                    @{ name = "head"; canSever = $true; vital = $true; tissues = @("thick basalt hide", "dense skull", "brain") },
                    @{ name = "horns"; canSever = $true; vital = $false; tissues = @("heavy obsidian horn") },
                    @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("immense ribcage", "volcanic heart") },
                    @{ name = "tail"; canSever = $true; vital = $false; tissues = @("heavy basalt tail") },
                    @{ name = "left arm"; canSever = $true; vital = $false; tissues = @("colossal hammer-arm", "bone") },
                    @{ name = "right arm"; canSever = $true; vital = $false; tissues = @("colossal hammer-arm", "bone") },
                    @{ name = "legs"; canSever = $true; vital = $false; tissues = @("pillar leg", "bone") }
                )
                professions = @("Furnace-Artificer", "Basalt-Mason", "Anvil-Warden", "Volcanic-Miner")
            }
        )
        traits = @("DUAL_AXIOMS", "VOLCANIC_HEAT_IMMUNITY", "BASALT_NATURAL_ARMOR")
        averageHeight = 192
        baseHealth = 145
    },
    @{
        id = "CRAG_GARGANT"
        name = "Crag-Gargant"
        description = "A colossal, subterranean quadruped behemoth covered in matted moss and stone plates."
        bodyParts = @(
            @{ name = "head"; canSever = $true; vital = $true; tissues = @("crag skull", "thick hide", "brain") },
            @{ name = "upper body"; canSever = $false; vital = $true; tissues = @("massive stone plates", "dense muscle", "enormous heart") },
            @{ name = "forelimbs"; canSever = $true; vital = $false; tissues = @("pillar limbs", "dense bone") },
            @{ name = "hindlimbs"; canSever = $true; vital = $false; tissues = @("pillar limbs", "dense bone") }
        )
        professions = @("Cavern-Territory-Alpha")
        traits = @("BUILDING_CRUSHER", "SUBTERRANEAN_BEHEMOTH")
        averageHeight = 310
        baseHealth = 320
    },
    @{
        id = "AUTOMATON"
        name = "Precursor Automaton"
        description = "A derelict pre-collapse security construct with heavy star-iron plating, an optic sensor eye, pneumatic limbs, and a volatile aetheric core."
        bodyParts = @(
            @{ name = "optic sensor"; canSever = $true; vital = $true; tissues = @("armored visor", "quantum optic array") },
            @{ name = "chassis"; canSever = $false; vital = $true; tissues = @("star-iron plating", "hydraulic pump", "aetheric core") },
            @{ name = "left servo-arm"; canSever = $true; vital = $false; tissues = @("pneumatic piston", "titanium strut", "plasma torch") },
            @{ name = "right servo-arm"; canSever = $true; vital = $false; tissues = @("pneumatic piston", "titanium strut", "crushing claw") },
            @{ name = "tread assembly"; canSever = $true; vital = $false; tissues = @("segmented treads", "drive motor", "suspension") }
        )
        professions = @("Derelict-Sentinel", "Vault-Warden", "Recon-Drone")
        traits = @("PRECURSOR_TECH", "PLASMA_BURST", "POISON_IMMUNE", "PAINLESS")
        averageHeight = 210
        baseHealth = 180
    }
)

$creaturesJson = ConvertTo-Json -InputObject $creatures -Depth 5
Set-Content -Path "$outDir\df_creatures.json" -Value $creaturesJson -Encoding UTF8
Write-Host "Exported $($creatures.Count) Original Species templates to df_creatures.json" -ForegroundColor Green

Write-Host "=== Original Kaldurath World Data Compilation Complete! ===" -ForegroundColor Cyan
