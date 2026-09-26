# DEUS Audio Standard

Normative audio standard for DEUS. Rules use MUST and SHOULD. Each rule has a stable id. The machine copy is `game/data/UF_AudioStandard.json`. The schema is `game/data/UF_AudioStandard.schema.json`. The checker is `tools/audio/validate_audio_standard.js`.

This lane records the standard only. It does not generate, record, synthesize, edit, or integrate sound, music, voice, or image files. `game/audio/**` was read by file name, extension, and byte size. No file there was decoded, played, transcoded, or written.

Owner decisions win where older docs disagree. The decisions used here are DEC-007 (no unattended art), DEC-011 (flat 1:1 layers, no runtime visual filters), DEC-013 (32 layers, 5 ft cells, 10 ft layers; band layout superseded below), DEC-016 (sim feet govern distance; catalogue pixels do not), DEC-025 (nine SRD races), DEC-027 (SRD 5.1 combat), and DEC-030 (six biomes by five depth bands). Conflicts are Appendix A. Questions this standard does not decide are Appendix B. Proposed follow-ups use `PROPOSED-AM-NN` and are not WBS ids.

Spell phases and delivery shapes follow the Owner composition of 2026-09-26 12:39 CT (cast, delivery, impact, lingering), as recorded in the Lane AL brief. This standard does not depend on Lane AL's unmerged files.

Census date 2026-09-26, names and sizes only: `bgm` 48, `bgs` 29, `me` 27, `se` 345, total 449, every file `.ogg`, none zero bytes.

## 1. Global

### AU-GLOBAL-001 - Canonical encoding is Ogg Vorbis

MUST: Every shipped audio file is Ogg Vorbis with extension `.ogg`. In this tree `AudioManager.audioFileExt` returns `.ogg` only, so an `.m4a` sibling is not required for the current NW.js target. Whether a future non-Ogg target must restore `.m4a` is OQ-12.

### AU-GLOBAL-002 - Sample rate and bit depth

MUST: New files are 44100 Hz, 16-bit PCM inside the Vorbis file. The engine resamples on playback. The validator does not open files to measure rate or depth.

### AU-GLOBAL-003 - Channel layout

MUST: Positional sounds (footsteps, hits, spells, weapons, work, vocals, UI one-shots) are mono so RMMZ pan is a single source. Music, ambience beds, and musical stingers are stereo. UI is mono and played at pan 0.

### AU-GLOBAL-004 - Loudness targets

MUST: Integrated loudness is measured on the delivered file, before the RMMZ volume scalar, with a true peak in dBTP. Music is -18 LUFS and -1 dBTP at default volume 90. Stingers are -16 LUFS and -1 dBTP at volume 90. Ambience is -24 LUFS and -1.5 dBTP at volume 70. Ordinary SFX is -18 LUFS and -1 dBTP at volume 90. Loud SFX (`point-loud`) is -14 LUFS and -1 dBTP at volume 100. UI is -20 LUFS and -1.5 dBTP at volume 90. Voice is -16 LUFS and -1 dBTP at volume 90.

### AU-GLOBAL-005 - Loop tags

MUST: A looping file carries Vorbis comments `LOOPSTART` and `LOOPLENGTH` as integer sample positions. `WebAudio._readMetaData` reads those two tags and no others. Until a file exists, a loop event declares `loopContract` `full-file`, `loopStart` 0, and `loopLength` null, meaning the loop is the whole file from the first sample. A measured loop uses `loopContract` `samples` with `loopStart` >= 0 and `loopLength` >= 1. A non-loop event omits all three.

### AU-GLOBAL-006 - Round-robin variants

MUST: The declared stem ends in `_01`. Variant count N requires stems `_01` through the Nth number, two digits, with no gaps. Footsteps and hits use 3. Spell, weapon, and work one-shots use 2. Spell linger, spell concentration, weapon reload loop, and work loop use 1. Vocal calls use 2. Vocal emotes, ambience, UI, music stems, and musical stingers use 1.

### AU-GLOBAL-007 - Stem grammar

MUST: A canonical stem is `category_subject_variant_01`. Category, subject, and variant are lowercase. A compound token uses hyphens, never spaces or underscores, so the three underscores always separate the four fields. Examples: `foot_water-shallow_walk_01`, `hit_slashing_armor-light_01`, `spell_evocation_bolt-cast_01`, `wpn_draw-loose_loose_01`, `vocal_half-orc_attack_01`, `amb_temperate_lowlands-base_01`, `bgm_temperate_peace-full_01`, `ui_system_boss-collapse-1_01`. The event id is the same fields joined with dots: `foot.water-shallow.walk`.

### AU-GLOBAL-008 - RMMZ playback fields

MUST: Authored playback stays inside the database ranges: volume 0 to 100, pitch 50 to 150 (percent, where 100 is the recorded rate), pan -100 to 100. The engine applies `volume` as a fraction of 10000 with the bus, `pitch` as playback rate divided by 100, and `pan` divided by 100. Music keeps pitch 100. Pitch is not a filter and is not a time-stretch.

### AU-GLOBAL-009 - No byte inspection by this checker

MUST: The validator identifies files by folder, relative name, extension, and byte size from the directory listing. It does not read audio bytes, so it cannot confirm Vorbis, sample rate, loop tags inside the file, or loudness. Those remain authoring contracts.

### AU-GLOBAL-010 - Schema version

MUST: `schemaVersion` is `1.0.0`. A full document's closed sets, categories, and event generators match the publisher in the validator. Hand-editing one side without the other is a document error.

## 2. RMMZ folders

### AU-FOLDER-001 - Four folders

MUST: Files live in `audio/bgm` (music), `audio/bgs` (ambient beds), `audio/me` (musical stingers), and `audio/se` (one-shots: footsteps, hits, spells, weapons, work, vocals, UI). The engine loads `audio/{folder}/{stem}.ogg`.

### AU-FOLDER-002 - Category folders

MUST: `foot`, `hit`, `spell`, `wpn`, `work`, `vocal`, and `ui` use `se`. `amb` uses `bgs`. `bgm` uses `bgm`. `me` uses `me`. An event whose folder disagrees with its category is a document error. A canonical stem found only in another folder is misnamed.

### AU-FOLDER-003 - Stock voice counts

MUST: Stock `AudioManager` plays one BGM, one BGS, and one ME. ME ducks BGM and then restores it. SE buffers overlap. The target mix is richer than those three slots: music stems share one music graph, and up to four ambience beds may play together. Until that mixer exists, playback uses the stock slots as AU-AMB-006 and AU-MUSIC-005 require. The mixer is PROPOSED-AM-01 and adds no DSP.

### AU-FOLDER-004 - Same stem in two folders

MUST: `Battle1` exists as both `bgm/Battle1.ogg` and `se/Battle1.ogg`. RMMZ treats the folder as part of the identity. Canonical stems are unique inside one folder. They do not have to be unique across folders.

### AU-FOLDER-005 - Legacy names

MUST: A stock file keeps its on-disk name. It is an alias when `legacyCensus.mapsTo` names an event, and unknown when `mapsTo` is null. An alias does not satisfy the canonical stem. The event stays misnamed until every canonical variant exists. Alias rows are the census in Appendix C.

### AU-FOLDER-006 - Census method

MUST: The published census lists every non-dot file under the four folders with folder, relative name, extension, and size. The validator recomputes that list from the disk. A size change, a missing file, or an unlisted non-canonical file is a document error on a full profile. Dotfiles are ignored so empty fixture folders may hold `.gitkeep`.

### AU-FOLDER-007 - Extension

MUST: Only `.ogg` satisfies a required variant. Any other extension is unknown and does not count as present.

### AU-FOLDER-008 - Zero-byte names

MUST: A zero-byte `.ogg` whose stem matches a required variant is present. Size is reported. Emptiness is not an asset violation. Fixture trees use zero-byte names and contain no audio samples.

## 3. Footsteps

### AU-FOOT-001 - Surface set

MUST: The footstep surfaces are stone, dirt, grass, sand, snow, ice, mud, wood, metal, water-shallow, water-deep, gravel, ash, volcanic-rock, and litter. Each surface has a walk, run, and sneak recording. Size is not a separate file.

### AU-FOOT-002 - Ground-kind map

MUST: Every `groundKinds` id in `game/data/DEUS_WorldCatalog.json` maps to one surface. The map is meadow, tropical_grass, dry_grass, cursed_grass, blessed_grass, and tundra to grass; dirt, road, shrub_soil, and red_clay to dirt; forest_floor, jungle_floor, needle_floor, and floor_rushes to litter; sand to sand; stony, rock, peak_rock, and floor_stone to stone; scree to gravel; mud and swamp_mud to mud; snow to snow; ice to ice; ash to ash; floor_wood to wood. When the cell has a ground id, that map wins.

<!-- GEN:ground:start -->

| Ground id | Surface |
| --- | --- |
| meadow | grass |
| tropical_grass | grass |
| dry_grass | grass |
| cursed_grass | grass |
| blessed_grass | grass |
| tundra | grass |
| dirt | dirt |
| road | dirt |
| shrub_soil | dirt |
| red_clay | dirt |
| forest_floor | litter |
| jungle_floor | litter |
| needle_floor | litter |
| floor_rushes | litter |
| sand | sand |
| stony | stone |
| rock | stone |
| peak_rock | stone |
| floor_stone | stone |
| scree | gravel |
| mud | mud |
| swamp_mud | mud |
| snow | snow |
| ice | ice |
| ash | ash |
| floor_wood | wood |

<!-- GEN:ground:end -->

### AU-FOOT-003 - Water map

MUST: Water ids fresh, pond, marsh, swamp, icy, brackish, salt, and blighted use water-shallow. The id `deep` uses water-deep. The id `icy` is shallow water, not the ice surface. Ice is the ground id `ice`.

<!-- GEN:water:start -->

| Water id | Surface |
| --- | --- |
| fresh | water-shallow |
| pond | water-shallow |
| marsh | water-shallow |
| swamp | water-shallow |
| icy | water-shallow |
| brackish | water-shallow |
| salt | water-shallow |
| blighted | water-shallow |
| deep | water-deep |

<!-- GEN:water:end -->

### AU-FOOT-004 - Gaits and size

MUST: Gaits are walk, run, and sneak. Run is its own recording, not a pitch-up of walk. Sneak uses the sneak recording at volume scale 0.45. Size pitch, with Medium at 100, is tiny 140, small 120, medium 100, large 85, huge 70, gargantuan 55. Volume offsets are tiny -8, small -4, medium 0, large 4, huge 8, gargantuan 12. Those pitches sit inside 50 to 150.

### AU-FOOT-005 - Biome and depth defaults

MUST: Biomes are volcanic, wet, arid, temperate, cold, and wild. Depth bands are deep-earth, caverns, lowlands, uplands, and highlands. A cell with no ground id and no water id uses the biome-depth default surface. That default is routing for audio, not a geology claim. metal and volcanic-rock have no ground id today; they remain required surfaces for metal floors and volcanic rock.

<!-- GEN:biome-depth:start -->

| Biome | deep-earth | caverns | lowlands | uplands | highlands |
| --- | --- | --- | --- | --- | --- |
| volcanic | volcanic-rock | volcanic-rock | ash | volcanic-rock | volcanic-rock |
| wet | stone | mud | mud | grass | stone |
| arid | stone | stone | sand | gravel | stone |
| temperate | stone | stone | grass | grass | stone |
| cold | stone | stone | snow | snow | ice |
| wild | stone | litter | grass | dirt | gravel |

<!-- GEN:biome-depth:end -->

### AU-FOOT-006 - Required foot files

MUST: Each surface and gait pair is event `foot.{surface}.{gait}` and stem `foot_{surface}_{gait}_01` with 3 variants, folder `se`, class `point`, layer audibility `positional`.

## 4. Hits

### AU-HIT-001 - Damage types

MUST: The closed damage-type set is acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, and thunder. No other type is valid. SRD 5.1 is the source under DEC-027.

### AU-HIT-002 - Target materials

MUST: Each damage type has a hit on flesh, armor-light, armor-medium, armor-heavy, shield, stone, and wood. Armor words follow SRD light, medium, heavy, and shield. They do not follow `System.json` `armorTypes`, which omits medium armor and splits shields into Small Shield and Large Shield.

### AU-HIT-003 - Outcomes

MUST: Shared outcomes are miss, parry, block-shield, and block-weapon, events `hit.outcome.miss`, `hit.outcome.parry`, `hit.outcome.block-shield`, and `hit.outcome.block-weapon`. A critical hit plays the material hit and adds `hit.{damageType}.crit`. A miss plays only the miss event.

### AU-HIT-004 - Hit files

MUST: Material hits are `hit.{damageType}.{hitMaterial}` with 3 variants, class `point`. Crit accents use the same count and class. Outcomes use 3 variants. Folder `se`.

### AU-HIT-005 - Net

MUST: The SRD net has no damage die. It plays the thrown release and does not play a hit.

### AU-HIT-006 - Spell impact layering

SHOULD: When a spell deals a damage type, the mixer may also play the matching material hit under the spell impact. The spell event remains required either way. The hit is not a substitute for the spell file.

## 5. Spells

### AU-SPELL-001 - Schools

MUST: Schools are abjuration, conjuration, divination, enchantment, evocation, illusion, necromancy, and transmutation. The SRD spell file has 319 spells across those eight schools. This standard does not define a file per spell.

### AU-SPELL-002 - Delivery shapes

MUST: Delivery shapes, in the Owner's 12:39 CT composition, are bolt (projectile/bolt), beam, cone, line, burst (sphere/burst), cylinder, aura (self-aura), touch, and instant (instant-at-target). Tokens are bolt, beam, cone, line, burst, cylinder, aura, touch, and instant.

### AU-SPELL-003 - Phases

MUST: Each school and shape has cast, delivery, impact, and linger. Event id `spell.{school}.{shape}.{phase}`. Stem `spell_{school}_{shape}-{phase}_01`. Linger loops with one variant and `full-file`. The other three phases are one-shots with 2 variants.

### AU-SPELL-004 - Concentration, fizzle, dispel

MUST: Each school has `spell.{school}.concentration` (loop, one file), `spell.{school}.fizzle` (2 variants), and `spell.{school}.dispel` (2 variants). Concentration is the sustained loop. Fizzle is the failed cast. Dispel is the magic ending.

### AU-SPELL-005 - Loud shapes

MUST: Burst and cylinder delivery and impact use attenuation class `point-loud` and loudness `sfxLoud`. Every other spell event uses `point` and `sfx`. All spell events are positional and mono in `se`.

### AU-SPELL-006 - Composition rule

MUST: A spell's sound is school plus shape plus phase, plus the school's concentration, fizzle, and dispel. Iconic one-off spells are out of scope. Damage type does not create a second spell file.

## 6. Weapons

### AU-WPN-001 - Groups and phases

MUST: Weapon groups are swing, thrust, draw-loose, crossbow, thrown, and reload. Swing and thrust use windup, action, and recover. Draw-loose uses draw and loose. Crossbow uses aim and fire. Thrown uses windup and release. Reload uses start, loop, and stop. The reload loop is one `full-file` variant. Other weapon phases are one-shots with 2 variants. Folder `se`, class `point`.

### AU-WPN-002 - The 37 SRD weapons

MUST: Each of the 37 weapons in `game/data/srd51/equipment.json` has one primary group and zero or more secondary groups. Secondary `thrown` means the thrown release replaces the melee action when the weapon is thrown. Secondary `reload` means the reload group plays for the loading property. The hit, if any, still comes from the damage type.

<!-- GEN:weapons:start -->

| Weapon | Primary | Secondary | No hit |
| --- | --- | --- | --- |
| Lance | thrust |  |  |
| Net | thrown |  | yes |
| Battleaxe | swing |  |  |
| Blowgun | draw-loose | reload |  |
| Club | swing |  |  |
| Crossbow, hand | crossbow | reload |  |
| Crossbow, heavy | crossbow | reload |  |
| Crossbow, light | crossbow | reload |  |
| Dagger | thrust | thrown |  |
| Dart | thrown |  |  |
| Flail | swing |  |  |
| Glaive | swing |  |  |
| Greataxe | swing |  |  |
| Greatclub | swing |  |  |
| Greatsword | swing |  |  |
| Halberd | swing |  |  |
| Handaxe | swing | thrown |  |
| Javelin | thrust | thrown |  |
| Light hammer | swing | thrown |  |
| Longbow | draw-loose |  |  |
| Longsword | swing |  |  |
| Mace | swing |  |  |
| Maul | swing |  |  |
| Morningstar | swing |  |  |
| Pike | thrust |  |  |
| Quarterstaff | swing |  |  |
| Rapier | thrust |  |  |
| Scimitar | swing |  |  |
| Shortbow | draw-loose |  |  |
| Shortsword | thrust |  |  |
| Sickle | swing |  |  |
| Sling | thrown |  |  |
| Spear | thrust | thrown |  |
| Trident | thrust | thrown |  |
| War pick | swing |  |  |
| Warhammer | swing |  |  |
| Whip | swing |  |  |

<!-- GEN:weapons:end -->

### AU-WPN-003 - Sling and blowgun

MUST: The sling's primary group is thrown. It has ammunition and no thrown property; no other group is a lobbed stone. The blowgun's primary group is draw-loose (a breath release, not a bow) and its secondary is reload because it has the loading property. Both choices are audio routing. They do not change the SRD property list.

### AU-WPN-004 - Action versus hit

MUST: The weapon event is the motion of the weapon. The hit event is the contact. A swing plays `wpn.swing.action` and then the damage-type hit. A whiff plays `wpn.swing.action` and `hit.outcome.miss`.

## 7. Work

### AU-WORK-001 - Actions

MUST: Work actions are hammer, saw, chop, dig, mine, stir, carry, kneel, forge, loom, and mill. Each has start, loop, and stop. Loop is one `full-file` variant. Start and stop have 2 variants. Folder `se`, class `point`.

### AU-WORK-002 - Loop structure

MUST: Start plays once, then the loop repeats for as long as the work continues, then stop plays once. Carry and kneel use the same three-part shape: the loop is the held or repeated body of the action.

### AU-WORK-003 - Files

MUST: Event id `work.{action}.{phase}` and stem `work_{action}_{phase}_01`.

## 8. Creature vocals

### AU-VOCAL-001 - Creature types

MUST: Vocal types are aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, and undead. A creature typed `swarm of Tiny beasts` uses the beast set at tiny size. It is not a fifteenth type.

### AU-VOCAL-002 - Nine races

MUST: Humanoid race vocals are the nine SRD races dwarf, elf, halfling, human, dragonborn, gnome, half-elf, half-orc, and tiefling. The generic humanoid type set remains required for a humanoid whose race is unknown or is not one of the nine. Dragonborn is the race set, not the dragon type. Tiefling is the race set, not the fiend type.

### AU-VOCAL-003 - Calls

MUST: Each type and each race has idle, alert, attack, hurt, and death, with 2 variants. Event `vocal.{subject}.{call}`.

### AU-VOCAL-004 - Balloon emotes

MUST: Each type and each race has one bark for stock balloon indices 1 through 10, tokens exclamation, question, music, heart, anger, sweat, cobweb, silence, idea, and sleep, in that index order. `docs/RMMZ_ASSET_SPEC.md` records the sheet as 8 frames by 15 rows of 48 by 48 and does not name the rows. These ten tokens are the stock RMMZ order. Indices 11 through 15 have no required bark (OQ-10).

### AU-VOCAL-005 - Size

MUST: Vocal size uses the same pitch and volume table as footsteps. Class is `voice`, layer audibility `positional`, folder `se`.

### AU-VOCAL-006 - Death versus collapse

SHOULD: A creature death vocal replaces the system collapse sound for that event. The system collapse files remain required UI fallbacks for a death that has no vocal subject.

## 9. Ambience

### AU-AMB-001 - Axes

MUST: Beds are selected from biome (volcanic, wet, arid, temperate, cold, wild), depth band (deep-earth, caverns, lowlands, uplands, highlands), audio weather (clear, rain, storm, snow, fog, wind), and season (spring, summer, autumn, winter). The combination is a mix recipe, not one file per tuple.

### AU-AMB-002 - Geometry of the bands

MUST: Depth ranges are deep-earth z -16 through -11, caverns -10 through -5, lowlands -4 through +1, uplands +2 through +6, and highlands +7 through +11. Layers +12 through +15 are open air with no natural terrain. Open air plays `amb.open-air.wind` instead of the biome-depth base. World z runs -16 through +15, 32 layers. DEC-030 names these bands and supersedes the DEC-013 five-band layout.

### AU-AMB-003 - Component files

MUST: Required bed files, all loops in `bgs`, class `bed`, one variant, are `amb.{biome}.{depth}.base` (30), `amb.weather.{weather}` for every audio weather except clear (clear is silence), `amb.season.{season}` (4), `amb.settlement.{biome}` (6), `amb.interior.wood`, `amb.interior.stone`, `amb.water.shallow`, `amb.water.deep`, and `amb.open-air.wind`.

### AU-AMB-004 - Engine weather projection

MUST: Engine weather maps onto the audio axis as clear, overcast, heatwave, and coldsnap to clear; rain to rain; downpour to storm; snow to snow; blizzard to storm while a single bed is all the engine can play. Fog and wind are audio weathers with no engine token. When four beds are available, blizzard plays snow plus wind instead of the single storm bed.

<!-- GEN:weather:start -->

| Token | Audio weather | Single bed | Multi-bed |
| --- | --- | --- | --- |
| clear | clear |  |  |
| overcast | clear |  |  |
| heatwave | clear |  |  |
| coldsnap | clear |  |  |
| rain | rain | rain |  |
| downpour | storm | storm |  |
| snow | snow | snow |  |
| blizzard | storm | storm | snow, wind |
| fog | fog | fog |  |
| wind | wind | wind |  |

<!-- GEN:weather:end -->

### AU-AMB-005 - Seasons

MUST: Season tokens are spring, summer, autumn, and winter, the lowercase form of `DEUS_Core.seasonName`. Which clock emits them after DEC-026 is OQ-11. The audio axis is the label, not the hour-band that produces it today.

### AU-AMB-006 - Bed cap and the one BGS slot

MUST: The target mix plays at most 4 beds. Priority, highest first, is interior (replaces base and weather), else settlement, else weather when it is not clear, else the biome-depth base, then the season overlay, then a water bed when the listener is in water. Open air replaces the base. The stock engine has one BGS slot, so the interim playback is the single highest-priority bed. The other beds stay required assets.

### AU-AMB-007 - Legacy biome ids

MUST: Each biome id in `DEUS_WorldCatalog.json` `biomes` routes to one of the six DEC-030 biomes. `mountain` routes to wild and uses depth highlands. The old registry ids TEMP, WET, ARID, HIGH, and VOLC route to temperate, wet, arid, wild, and volcanic. HIGH is not a biome; height is a depth band.

<!-- GEN:biome-route:start -->

| Catalog or registry id | Audio biome | Depth hint |
| --- | --- | --- |
| glacier | cold |  |
| tundra | cold |  |
| taiga | cold |  |
| ocean_arctic | cold |  |
| forest_temperate_conifer | temperate |  |
| forest_temperate_broadleaf | temperate |  |
| grassland_temperate | temperate |  |
| savanna_temperate | temperate |  |
| shrubland_temperate | temperate |  |
| ocean_temperate | temperate |  |
| marsh_temperate_fresh | wet |  |
| marsh_temperate_salt | wet |  |
| marsh_tropical_fresh | wet |  |
| marsh_tropical_salt | wet |  |
| swamp_temperate_fresh | wet |  |
| swamp_temperate_salt | wet |  |
| swamp_tropical_fresh | wet |  |
| swamp_tropical_salt | wet |  |
| swamp_mangrove | wet |  |
| forest_tropical_moist_broadleaf | wet |  |
| lake_fresh | wet |  |
| lake_brackish | wet |  |
| desert_sand | arid |  |
| desert_rock | arid |  |
| desert_badland | arid |  |
| savanna_tropical | arid |  |
| shrubland_tropical | arid |  |
| forest_tropical_dry_broadleaf | arid |  |
| lake_salt | arid |  |
| forest_tropical_conifer | wild |  |
| grassland_tropical | wild |  |
| mountain | wild | highlands |
| ocean_tropical | wild |  |
| TEMP (registry) | temperate |  |
| WET (registry) | wet |  |
| ARID (registry) | arid |  |
| HIGH (registry) | wild |  |
| VOLC (registry) | volcanic |  |

<!-- GEN:biome-route:end -->

### AU-AMB-008 - Interior and settlement

MUST: An interior plays the interior bed of wood or stone and does not play the outdoor base or the weather bed. A settlement outdoors adds the settlement bed and ducks the base. Season may still play under either, inside the cap of 4.

## 10. UI

### AU-UI-001 - System sounds

MUST: `System.json` `sounds` has 24 entries, each volume 90, pitch 100, pan 0. Index 17 (`Miss`) is `hit.outcome.miss`. The other 23 indexes are UI events. `SoundManager.playCursor` through `playUseSkill` use indexes 0 through 23 in that order.

<!-- GEN:system:start -->

| Index | System.json name | Event |
| --- | --- | --- |
| 0 | Cursor3 | ui.system.cursor |
| 1 | Decision2 | ui.system.ok |
| 2 | Cancel2 | ui.system.cancel |
| 3 | Buzzer1 | ui.system.buzzer |
| 4 | Equip1 | ui.system.equip |
| 5 | Save2 | ui.system.save |
| 6 | Load2 | ui.system.load |
| 7 | Battle1 | ui.system.battle-start |
| 8 | Run | ui.system.escape |
| 9 | Attack3 | ui.system.enemy-attack |
| 10 | Damage4 | ui.system.enemy-damage |
| 11 | Collapse1 | ui.system.enemy-collapse |
| 12 | Collapse2 | ui.system.boss-collapse-1 |
| 13 | Collapse3 | ui.system.boss-collapse-2 |
| 14 | Damage5 | ui.system.actor-damage |
| 15 | Collapse4 | ui.system.actor-collapse |
| 16 | Recovery | ui.system.recovery |
| 17 | Miss | hit.outcome.miss |
| 18 | Evasion1 | ui.system.evasion |
| 19 | Evasion2 | ui.system.magic-evasion |
| 20 | Reflection | ui.system.reflection |
| 21 | Shop1 | ui.system.shop |
| 22 | Item3 | ui.system.use-item |
| 23 | Item3 | ui.system.use-skill |

<!-- GEN:system:end -->

### AU-UI-002 - Extra UI events

MUST: Also required, one variant each, folder `se`, class `ui`, layer audibility `global`: `ui.menu.open`, `ui.menu.close`, `ui.alert.notification`, `ui.alert.raid`, `ui.alert.fire`, `ui.alert.death`, `ui.alert.birth`, `ui.designation.place`, and `ui.build.place`.

### AU-UI-003 - Shared Item3

MUST: System indexes 22 and 23 are both named `Item3`. That one file aliases both `ui.system.use-item` and `ui.system.use-skill`. Each event still has its own canonical stem.

### AU-UI-004 - Fallback attacks

MUST: `ui.system.enemy-attack` is the fallback when the attacker has no weapon group. When the weapon group is known, the weapon event plays instead and the fallback does not.

### AU-UI-005 - Menu volume

MUST: The standard default for music playback is volume 90, matching the catalog theme objects and the system sounds. `DEUS_FactionMenus.js` passes volume 80 and passes `themeBgm` as a string name. This lane does not edit that plugin. The mismatch is Appendix A.

## 11. Music

### AU-MUSIC-001 - States and stems

MUST: Music states are peace, tension, combat, victory, defeat, night, underground, and festival. Each biome and state has four stems: full, bed, percussion, and motif. Event `bgm.{biome}.{state}.{role}`, stem `bgm_{biome}_{state}-{role}_01`, one looping file, folder `bgm`, class `music`, stereo.

### AU-MUSIC-002 - Grid

MUST: Every music stem is 96 BPM and 4 beats per bar. Stems of one biome and state share that grid. Cross-biome transitions use the same grid so a bar line matches without time-stretch. Pitch on music stays 100.

### AU-MUSIC-003 - Crossfade

MUST: A state change crossfades on a bar line for one bar of the incoming piece, by volume only. The outgoing stem ends on its bar line. The incoming stem starts on its downbeat. If the pieces cannot share a bar, the outgoing piece stops on its bar line and the incoming piece starts. No playback-rate change is used to force the tempos together.

### AU-MUSIC-004 - Stingers

MUST: Stingers live in `me` and use the stock ME slot, which ducks BGM. Required stingers are `me.combat.enter`, `me.victory.stinger`, `me.defeat.stinger`, and `me.festival.stinger`. Entering combat plays `me.combat.enter` and then the combat `full` stem. Victory and defeat are both a BGM state and a stinger: the stinger punctuates, then the state bed plays if the scene holds.

### AU-MUSIC-005 - One BGM slot

MUST: Until the stem mixer exists, the one BGM slot plays the `full` stem of the current biome and state. The bed, percussion, and motif files are still required. They are not optional extras.

### AU-MUSIC-006 - Menu themes are not biome stems

MUST: Faction and culture menu tracks in the world catalog are legacy names. They alias a biome stem only when the census says so (town, field, and castle tracks alias temperate peace; dungeon tracks alias temperate underground; battle tracks alias temperate combat). Theme, scene, and ship tracks do not satisfy a required stem.

<!-- GEN:menu:start -->

| Id | Stock BGM | Like | Where stored |
| --- | --- | --- | --- |
| human | Town1 |  | cultures.themeBgm, skins.bgm |
| elf | Theme2 |  | cultures.themeBgm, skins.bgm |
| dwarf | Town2 |  | cultures.themeBgm, skins.bgm |
| gnome | Town3 |  | cultures.themeBgm, skins.bgm |
| goblin | Dungeon2 |  | cultures.themeBgm, skins.bgm |
| orc | Battle3 |  | cultures.themeBgm, skins.bgm |
| lizardfolk | Town7 |  | skins.bgm |
| kobold | Dungeon1 |  | skins.bgm |
| undead | Dungeon3 |  | skins.bgm |
| starborn | Theme1 |  | skins.bgm |
| swarm | Dungeon6 |  | skins.bgm |
| automaton |  | starborn | cultures, skins.like |
| halfling |  | human | skins.like |
| serpentkin |  | lizardfolk | skins.like |
| demon |  | undead | skins.like |
| swarmer |  | swarm | skins.like |
| dark_dwarf |  | dwarf | skins.like |
| dark_gnome |  | gnome | skins.like |

<!-- GEN:menu:end -->

## 12. Attenuation

### AU-ATTEN-001 - Distance

MUST: Distance uses sim feet from DEC-013, not catalogue pixels from DEC-016. A cell is 5 ft. A layer is 10 ft. `distFt = sqrt((dx*5)^2 + (dy*5)^2 + (dz*10)^2)` where dx and dy are cell deltas and dz is the layer delta between the source and `listenerLayer`.

### AU-ATTEN-002 - Who the listener is

MUST: Every formula below takes `listenerLayer` and the listener cell as inputs. Whether those inputs track the player token or the viewed camera layer is OQ-03. This standard does not choose.

### AU-ATTEN-003 - Classes

MUST: Classes are `ui`, `music`, `bed`, `stinger`, `voice`, `point`, and `point-loud`. Non-positional classes ignore distance and pan. Positional volume is `maxVolume` inside `refFeet`, otherwise `maxVolume * (refFeet / distFt) ^ rolloff`, then multiplied by the layer gain, then rounded and clamped to 0..100. Below `silenceVolume` 4 the voice is not started. Outside `maxFeet` the voice is not started.

<!-- GEN:classes:start -->

| Class | Positional | Ref feet | Rolloff | Max feet | Max volume | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| ui | no |  | 0 |  | 90 | 100 |
| music | no |  | 0 |  | 90 | 30 |
| bed | no |  | 0 |  | 70 | 20 |
| stinger | no |  | 0 |  | 90 | 90 |
| voice | yes | 15 | 1.2 | 80 | 90 | 80 |
| point | yes | 10 | 1.5 | 60 | 90 | 50 |
| point-loud | yes | 20 | 1.2 | 150 | 100 | 70 |

<!-- GEN:classes:end -->

### AU-ATTEN-004 - Pan

MUST: Pan comes from screen X, not world X. `pan = clamp(-100, 100, round((screenX - screenWidth/2) / (screenWidth/2) * 100))`. The current `System.json` screen width is 816. The live screen width is the one that counts.

### AU-ATTEN-005 - Other layers

MUST: Layer audibility `global` ignores position. `focus-only` plays only when the source layer equals `listenerLayer`. `positional` plays across layers only through an open column or an opening. Solid cover (DEC-021) silences the sound. An opening within 3 cells of the source column or the listener column conducts. A closed door is cover. An open door conducts. Whether a closed window conducts is OQ-04.

### AU-ATTEN-006 - Layer gain and pitch

MUST: For each layer of separation, multiply volume by 0.7 and subtract 4 from pitch percent, floored at 80. That pitch change is the RMMZ pitch field. It is not a low-pass. If the event names a muffled stem and that `.ogg` exists, play the muffled stem instead of the pitch drop. Volume gain still applies. If the muffled file is absent, use volume and pitch only. No required event names a muffled stem today.

### AU-ATTEN-007 - Runtime DSP

MUST: The mix path authorized by this standard is RMMZ volume, pitch, and pan, plus an optional pre-rendered muffled file. A runtime low-pass, HRTF, or time-stretch is not authorized. Whether a later build may add one is OQ-02. DEC-011 already forbids runtime visual filters; it does not by itself decide audio DSP, which is why OQ-02 stays open.

### AU-ATTEN-008 - Caps and priority

MUST: Caps are 24 simultaneous SE, of which at most 8 are vocals, 4 ambience beds (1 on the stock BGS slot), 1 BGM, and 1 ME. When over the cap, drop the lowest priority, then the farthest, then the oldest. Priorities are ui 100, stinger 90, voice 80, point-loud 70, point 50, music 30, bed 20.

### AU-ATTEN-009 - Focus layer

MUST: Sounds on `listenerLayer` use the distance curve with layer gain 1. Sounds on any other layer use AU-ATTEN-005 and AU-ATTEN-006. Looking down through an opening does not by itself move `listenerLayer`; that binding is OQ-03.

## 13. Validator spec

The checker reads `UF_AudioStandard.json`, `UF_AudioStandard.schema.json`, and, for a full profile, this markdown file. It inventories `game/audio/{bgm,bgs,me,se}` by name, extension, and size. Flags: `--json`, `--category CAT`, `--strict`. Fixture overrides: `--standard`, `--schema`, `--audio`, `--md`.

Per required event the status is present (every canonical `.ogg` variant is in the right folder), missing (absent, or only some variants), misnamed (canonical stem only in the wrong folder, or a legacy alias is the only file), or unknown (a disk file that is neither a canonical variant nor an alias). `--category` limits the event rows and hides unknown files. An unknown category name exits 2.

Exit 0: the document is valid. Asset gaps do not fail unless `--strict` is set. Exit 1: `--strict` and at least one missing, misnamed, or unknown item, and no document error. Exit 2: bad arguments, unreadable JSON, schema failure, semantic failure (loop bounds, unknown closed-set member, category folder, attenuation class, stem formula), full-profile drift (published tables, census, markdown rule text, open questions, follow-ups), or self-check failure. Document errors outrank `--strict`.

A full profile also checks that this markdown and the JSON use the same rule ids, titles, statements, and levels; the same open-question ids; and the same `PROPOSED-AM` ids. Asset coverage of today's RTP is a report, not a failure, because the canonical names are not on disk yet.

### AU-VALID-001 - Inputs

MUST: The validator's inputs are the standard JSON, the schema JSON, the four audio folders, and, when `profile` is `full`, this markdown file. It writes nothing. `wroteAudio` in the report is false. `decodedAudio` is false.

### AU-VALID-002 - Statuses

MUST: Event status is present, missing, or misnamed, with reasons absent, incomplete-variants, wrong-folder, and alias. Disk status unknown is the fourth report status. Counts are reported per category.

### AU-VALID-003 - Schema and semantics

MUST: The schema is JSON Schema draft 2020-12. The checker implements type, const, enum, pattern, numeric and length bounds, required, properties, additionalProperties, propertyNames, items, min/max items, minProperties, `$ref`, and oneOf. An event row requires event id, category, folder, stem, variants, loop, attenuation class, and layer audibility. Loop numbers, closed-set membership, and the stem formula are semantic checks so a bad loop is code `bad-loop` and an unknown damage type, spell school, or biome is `unknown-damage-type`, `unknown-spell-school`, or `unknown-biome`.

### AU-VALID-004 - Strict and category

MUST: Without `--strict`, asset gaps exit 0. With `--strict`, those gaps exit 1. `--category` filters event rows to one category and omits the unknown-file list. Schema and semantic errors still exit 2.

### AU-VALID-005 - Report

MUST: `--json` prints one object with `documentErrors`, `eventCount`, `counts`, `byCategory`, `violations`, `unknownFiles`, `wroteAudio`, and `decodedAudio`. Human output prints the same counts and the first document errors. Neither mode prints audio bytes.

### AU-VALID-006 - Census and aliases

MUST: On a full profile the census must match `classifyLegacyStem` plus the live sizes. Every `mapsTo` target must be a real event id. A legacy file with a null `mapsTo` is unknown. A legacy file with a target, and no canonical file, makes that event misnamed.

### AU-VALID-007 - Empty canonical files

MUST: Byte size 0 does not change present, missing, or misnamed. The size is still stored on the census row and on unknown rows.

## Appendix A. Conflicts

Owner decisions and this brief win. The notes below are the disagreements the standard had to record.

**A1. Bands and biome counts.** DEC-013 partitions 25 biomes into five vertical bands (Lower-2, Lower-1, Surface, Upper-1, Upper-2). DEC-030 replaces that with six biomes (volcanic, wet, arid, temperate, cold, wild) and five depth bands (deep-earth through highlands) across z -16..+15. Layer count, cell size, and layer height from DEC-013 remain. This standard uses DEC-030 for biome and depth.

**A2. Five-biome registry.** `game/data/DEUS_BiomeRegistry.json` lists TEMP, WET, ARID, HIGH, VOLC and forbids FROZEN, SNOW, ICE, GLACIER, and TUNDRA_SNOW. DEC-030 has a cold biome. This standard routes the five registry ids as AU-AMB-007 and keeps snow and ice surfaces.

**A3. Palette note against snow.** `game/data/DEUS_PaletteRegistry.json` contains a hard rule of zero snow and ice for palette use. `groundKinds` already contains `snow` and `ice`. Audio includes both surfaces because the brief requires them and the ground data contains them.

**A4. Catalog biome list.** `DEUS_WorldCatalog.json` `biomes` is a longer set (glacier through lake_salt, 33 ids) plus an about string. None of those ids is `volcanic`. Volcanism is a climate field, not a biome key. Audio routes the 33 ids and still requires volcanic beds. `mountain` is wild plus highlands, not a seventh biome.

**A5. One-layer catalog blurb.** The catalog about-text says the underground layer was removed. DEC-013 and DEC-030 require 32 layers. Audio follows the decisions.

**A6. Armor words.** `System.json` `armorTypes` is General, Magic, Light, Heavy, Small Shield, Large Shield. SRD medium armor is missing there. Hits use SRD light, medium, heavy, and shield.

**A7. Swarm typing.** Six creature entries are typed `swarm of Tiny beasts` rather than beast. Vocals use beast at tiny size.

**A8. Peoples beyond the nine races.** Cultures include goblin, orc, and automaton. Skins also include lizardfolk, kobold, undead, starborn, swarm, and several `like` aliases. Factions list the nine SRD races. Vocals for anyone outside those nine use the creature type or generic humanoid. OQ-07 asks whether any of them share a race set. Orc is not half-orc in this standard.

**A9. Menu BGM wiring.** Cultures store `themeBgm` as an object at volume 90. Skins store `bgm` as an object at volume 90. `DEUS_FactionMenus.js` reads `catalog.factions[faction].themeBgm` as a string and plays it at volume 80. Faction entries do not carry `themeBgm`. This lane does not edit the plugin or the catalog.

**A10. Stock file names.** RTP names are PascalCase with an unpadded number and no category prefix (`Slash10`, `Cursor3`). The canonical grammar is lowercase with `_01`. The census is the alias table. Canonical files are absent today, so the coverage report is mostly missing and misnamed. That is expected.

**A11. One slot versus stems and beds.** The required mix has four music stems and up to four beds. Stock RMMZ has one BGM, one BGS, and one ME. Interim playback is specified in AU-AMB-006 and AU-MUSIC-005. The mixer is a follow-up, not a silent exception.

**A12. m4a.** Upstream MZ often selects `.m4a` when Ogg is unavailable. This tree's `audioFileExt` returns `.ogg` only. `.m4a` is not required here.

**A13. Visual filters and audio DSP.** DEC-011 forbids runtime visual blur, tint, and ColorMatrix. It does not mention audio. This standard's mix path uses volume, pitch, and pan only. A runtime low-pass is not authorized and is not declared forbidden forever. OQ-02 holds the question.

**A14. Work lists.** The Owner spell brief's animation rows include dodge and omit mine, forge, loom, and mill. This standard's required work list includes mine, forge, loom, and mill. Dodge is not a required hit outcome. System evasion remains a UI event. Lane AL is unmerged; the spell phase names still follow the Owner composition.

**A15. Charter audio keys.** `docs/CHARART_MASTER_CHARTER.md` names `weapon_whoosh` and `blade_cut_flesh`. Those are not canonical stems. The motion is `wpn_{group}_action_01` (or the group's action token). The contact is `hit_slashing_flesh_01` when the damage type is slashing and the material is flesh.

**A16. Weather vocabularies.** `DEUS_Environment.js` `WEATHER_TYPES` is clear, overcast, rain, downpour, snow, blizzard, heatwave, coldsnap. The audio axis is clear, rain, storm, snow, fog, wind. AU-AMB-004 is the bridge. Fog and wind have no engine token. OQ-14 asks if the bridge should change.

**A17. Seasons and the calendar.** `DEUS_Core.seasonName` returns Spring, Summer, Autumn, or Winter from hour bands, under a clock where one day is one year. DEC-026 is open. Audio keeps the four labels and does not choose the clock.

**A18. Icy water and the ash tree.** Water id `icy` is not the ice foot surface. Ground id `ash` is the ash surface. An object id `ash` elsewhere in the catalog is a tree. Footsteps use the ground id.

**A19. Shared stock names.** `se/Battle1.ogg` and `bgm/Battle1.ogg` are different files. System use-item and use-skill both name `Item3`. `se/Run.ogg` is the system escape sound, not the run gait.

**A20. Vehicle and title music.** Boat, ship, and airship BGM are `Ship1`, `Ship2`, and `Ship3`. Title BGM is `Theme4`. None of those is a required state. OQ-08 covers vehicles. Theme files stay unmapped.

**A21. Firearms.** `Gun1` through `Gun3` and `Shot1` through `Shot3` have no SRD weapon group. They stay unknown, nearest `firearm`. OQ-09.

**A22. Licensing.** `docs/LEGAL.md` states the SRD 5.1 CC-BY-4.0 terms. It does not state a license for the stock audio files. This standard does not assert one. OQ-06.

## Appendix B. Open questions

These are unanswered. This standard does not pick an option for any of them.

### OQ-01 - WBS leaves for audio

No existing WBS leaf covers audio. No WBS id was minted and no WBS status was changed. The open item is a dedicated WBS leaf for this standard and for the follow-ups in the next appendix.

### OQ-02 - Runtime audio DSP

May a later build add a runtime low-pass, HRTF, or time-stretch, or must muffling stay on volume, pitch, and pre-rendered files? This standard does not authorize runtime DSP. DEC-011 does not decide the question.

### OQ-03 - Listener binding

Is `listenerLayer` the player token's layer or the layer the camera is viewing? Formulas are defined either way. The binding is not.

### OQ-04 - Closed windows

An open door conducts sound and a closed door does not. Does a closed window conduct?

### OQ-05 - Voice performance

The vocal files are required. The standard does not say whether they are performed speech, creature vocalization without words, or something else, and it does not name a language.

### OQ-06 - Licensing and sources

What license covers the stock files already in `game/audio`, and what sources may later recordings come from? Nothing was generated or downloaded for this lane.

### OQ-07 - Peoples outside the nine races

Do catalog or skin ids orc, goblin, automaton, lizardfolk, kobold, undead, starborn, swarm, serpentkin, demon, swarmer, dark_dwarf, or dark_gnome share a vocal set with one of the nine SRD races, or do they stay on creature type and generic humanoid? Orc is not treated as half-orc here.

### OQ-08 - Vehicle music

Boat, ship, and airship already have stock BGM names. Is vehicle travel a required music state?

### OQ-09 - Firearms

Stock `Gun` and `Shot` files have no group in the SRD weapon list used here. Is there a weapon group for them?

### OQ-10 - Balloon indices 11 through 15

The sheet has 15 rows. This standard names barks for indices 1 through 10 only. What, if anything, do indices 11 through 15 mean, and do they need barks?

### OQ-11 - Season clock

DEC-026 is open. Which emitter feeds spring, summer, autumn, and winter after that ruling? The four labels stay either way.

### OQ-12 - Non-Ogg targets

The current `audioFileExt` is `.ogg` only. Must a browser or iOS target ship `.m4a` siblings?

### OQ-13 - Race home layers

DEC-013 still leaves race-to-band assignment open. Do vocals or music change when a race is off its home layers, once those layers are assigned?

### OQ-14 - Extra weather beds

The projection in AU-AMB-004 folds overcast, heatwave, and coldsnap into clear, and folds blizzard into storm (or snow plus wind when several beds can play). Should any of those engine weathers get its own bed instead?

## Appendix C. Existing files

The census is every file under `game/audio/{bgm,bgs,me,se}` on 2026-09-26. `mapsTo` is the event a legacy name stands in for. A blank `mapsTo` means the file is unknown to the required set. `nearest` is a label for the appendix, not a second event id. Sizes are byte lengths from the directory listing.

<!-- GEN:census:start -->

| Folder | File | Bytes | mapsTo | nearest |
| --- | --- | --- | --- | --- |
| bgm | Battle1.ogg | 562661 | bgm.temperate.combat.full |  |
| bgm | Battle2.ogg | 602545 | bgm.temperate.combat.full |  |
| bgm | Battle3.ogg | 745670 | bgm.temperate.combat.full |  |
| bgm | Battle4.ogg | 855090 | bgm.temperate.combat.full |  |
| bgm | Battle5.ogg | 730545 | bgm.temperate.combat.full |  |
| bgm | Battle6.ogg | 713193 | bgm.temperate.combat.full |  |
| bgm | Battle7.ogg | 514071 | bgm.temperate.combat.full |  |
| bgm | Battle8.ogg | 837776 | bgm.temperate.combat.full |  |
| bgm | Castle1.ogg | 571674 | bgm.temperate.peace.full |  |
| bgm | Castle2.ogg | 605224 | bgm.temperate.peace.full |  |
| bgm | Castle3.ogg | 648496 | bgm.temperate.peace.full |  |
| bgm | Dungeon1.ogg | 651159 | bgm.temperate.underground.full |  |
| bgm | Dungeon2.ogg | 763399 | bgm.temperate.underground.full |  |
| bgm | Dungeon3.ogg | 652443 | bgm.temperate.underground.full |  |
| bgm | Dungeon4.ogg | 478767 | bgm.temperate.underground.full |  |
| bgm | Dungeon5.ogg | 588443 | bgm.temperate.underground.full |  |
| bgm | Dungeon6.ogg | 666236 | bgm.temperate.underground.full |  |
| bgm | Dungeon7.ogg | 840273 | bgm.temperate.underground.full |  |
| bgm | Field1.ogg | 536863 | bgm.temperate.peace.full |  |
| bgm | Field2.ogg | 504718 | bgm.temperate.peace.full |  |
| bgm | Field3.ogg | 742559 | bgm.temperate.peace.full |  |
| bgm | Field4.ogg | 540866 | bgm.temperate.peace.full |  |
| bgm | Scene1.ogg | 680383 |  | underscore |
| bgm | Scene2.ogg | 613766 |  | underscore |
| bgm | Scene3.ogg | 480436 |  | underscore |
| bgm | Scene4.ogg | 627166 |  | underscore |
| bgm | Scene5.ogg | 557041 |  | underscore |
| bgm | Scene6.ogg | 516579 |  | underscore |
| bgm | Scene7.ogg | 546751 |  | underscore |
| bgm | Scene8.ogg | 588581 |  | underscore |
| bgm | Scene9.ogg | 616157 |  | underscore |
| bgm | Ship1.ogg | 473199 |  | vehicle |
| bgm | Ship2.ogg | 526784 |  | vehicle |
| bgm | Ship3.ogg | 637455 |  | vehicle |
| bgm | Theme1.ogg | 631433 |  | menu |
| bgm | Theme2.ogg | 621417 |  | menu |
| bgm | Theme3.ogg | 573516 |  | menu |
| bgm | Theme4.ogg | 656528 |  | menu |
| bgm | Theme5.ogg | 694074 |  | menu |
| bgm | Theme6.ogg | 485241 |  | menu |
| bgm | Town1.ogg | 681197 | bgm.temperate.peace.full |  |
| bgm | Town2.ogg | 617353 | bgm.temperate.peace.full |  |
| bgm | Town3.ogg | 574158 | bgm.temperate.peace.full |  |
| bgm | Town4.ogg | 609514 | bgm.temperate.peace.full |  |
| bgm | Town5.ogg | 636514 | bgm.temperate.peace.full |  |
| bgm | Town6.ogg | 542584 | bgm.temperate.peace.full |  |
| bgm | Town7.ogg | 733225 | bgm.temperate.peace.full |  |
| bgm | Town8.ogg | 615216 | bgm.temperate.peace.full |  |
| bgs | City.ogg | 352754 |  | ambience |
| bgs | Clock.ogg | 5109 |  | ambience |
| bgs | Darkness.ogg | 43571 |  | ambience |
| bgs | Drips.ogg | 65293 |  | ambience |
| bgs | Fire1.ogg | 159612 |  | ambience |
| bgs | Fire2.ogg | 129204 |  | ambience |
| bgs | Fire3.ogg | 86125 |  | ambience |
| bgs | Night.ogg | 882460 |  | ambience |
| bgs | People1.ogg | 180345 |  | ambience |
| bgs | People2.ogg | 177624 |  | ambience |
| bgs | Quake1.ogg | 19224 |  | ambience |
| bgs | Quake2.ogg | 9403 |  | ambience |
| bgs | Rain1.ogg | 15898 | amb.weather.rain |  |
| bgs | Rain2.ogg | 94799 | amb.weather.rain |  |
| bgs | Rain3.ogg | 93944 | amb.weather.rain |  |
| bgs | Rain4.ogg | 152738 | amb.weather.rain |  |
| bgs | River.ogg | 61110 | amb.water.shallow |  |
| bgs | Sea.ogg | 33116 | amb.water.deep |  |
| bgs | Storm1.ogg | 18605 | amb.weather.storm |  |
| bgs | Storm2.ogg | 566611 | amb.weather.storm |  |
| bgs | Waterfall1.ogg | 77882 | amb.water.shallow |  |
| bgs | Waterfall2.ogg | 75224 | amb.water.shallow |  |
| bgs | Wave1.ogg | 64963 | amb.water.shallow |  |
| bgs | Wave2.ogg | 160389 | amb.water.shallow |  |
| bgs | Wind1.ogg | 41308 | amb.weather.wind |  |
| bgs | Wind2.ogg | 145902 | amb.weather.wind |  |
| bgs | Wind3.ogg | 128309 | amb.weather.wind |  |
| bgs | Wind4.ogg | 145179 | amb.weather.wind |  |
| bgs | Wind5.ogg | 149129 | amb.weather.wind |  |
| me | Curse1.ogg | 31082 |  | stinger |
| me | Curse2.ogg | 44138 |  | stinger |
| me | Defeat1.ogg | 50343 | me.defeat.stinger |  |
| me | Defeat2.ogg | 52031 | me.defeat.stinger |  |
| me | Fanfare1.ogg | 97257 | me.festival.stinger |  |
| me | Fanfare2.ogg | 94297 | me.festival.stinger |  |
| me | Fanfare3.ogg | 79614 | me.festival.stinger |  |
| me | Gag.ogg | 44572 |  | stinger |
| me | Gameover1.ogg | 138500 | me.defeat.stinger |  |
| me | Gameover2.ogg | 107995 | me.defeat.stinger |  |
| me | Horror.ogg | 38873 |  | stinger |
| me | Inn1.ogg | 59039 |  | stinger |
| me | Inn2.ogg | 63689 |  | stinger |
| me | Item.ogg | 29817 | ui.alert.notification |  |
| me | Like.ogg | 42084 |  | stinger |
| me | Musical1.ogg | 66176 |  | stinger |
| me | Musical2.ogg | 56177 |  | stinger |
| me | Musical3.ogg | 34313 |  | stinger |
| me | Mystery.ogg | 33698 |  | stinger |
| me | Organ.ogg | 55726 |  | stinger |
| me | Refresh.ogg | 27540 |  | stinger |
| me | Shock1.ogg | 48669 |  | stinger |
| me | Shock2.ogg | 23461 |  | stinger |
| me | Shock3.ogg | 24103 |  | stinger |
| me | Victory1.ogg | 62323 | me.victory.stinger |  |
| me | Victory2.ogg | 50000 | me.victory.stinger |  |
| me | Victory3.ogg | 66487 | me.victory.stinger |  |
| se | Absorb1.ogg | 11124 |  | sfx |
| se | Absorb2.ogg | 10314 |  | sfx |
| se | Applause1.ogg | 30114 |  | sfx |
| se | Applause2.ogg | 28118 |  | sfx |
| se | Attack1.ogg | 6164 | ui.system.enemy-attack |  |
| se | Attack2.ogg | 7906 | ui.system.enemy-attack |  |
| se | Attack3.ogg | 6889 | ui.system.enemy-attack |  |
| se | Autodoor.ogg | 13173 |  | door |
| se | Barrier.ogg | 11793 |  | sfx |
| se | Battle1.ogg | 14059 | ui.system.battle-start |  |
| se | Battle2.ogg | 10320 |  | ui.system.battle-start |
| se | Battle3.ogg | 13095 |  | ui.system.battle-start |
| se | Battle4.ogg | 20179 |  | ui.system.battle-start |
| se | Battle5.ogg | 20997 |  | ui.system.battle-start |
| se | Battle6.ogg | 21312 |  | ui.system.battle-start |
| se | Bell1.ogg | 13244 | ui.alert.notification |  |
| se | Bell2.ogg | 7961 | ui.alert.notification |  |
| se | Bell3.ogg | 6903 | ui.alert.notification |  |
| se | Bite.ogg | 7748 |  | sfx |
| se | Blind.ogg | 9823 |  | sfx |
| se | Blow1.ogg | 5353 | hit.bludgeoning.flesh |  |
| se | Blow10.ogg | 8733 | hit.bludgeoning.flesh |  |
| se | Blow2.ogg | 5368 | hit.bludgeoning.flesh |  |
| se | Blow3.ogg | 5369 | hit.bludgeoning.flesh |  |
| se | Blow4.ogg | 7536 | hit.bludgeoning.flesh |  |
| se | Blow5.ogg | 5447 | hit.bludgeoning.flesh |  |
| se | Blow6.ogg | 6667 | hit.bludgeoning.flesh |  |
| se | Blow7.ogg | 7555 | hit.bludgeoning.flesh |  |
| se | Blow8.ogg | 6119 | hit.bludgeoning.flesh |  |
| se | Blow9.ogg | 9642 | hit.bludgeoning.flesh |  |
| se | Book1.ogg | 7027 |  | sfx |
| se | Book2.ogg | 8814 |  | sfx |
| se | Bow1.ogg | 6234 | wpn.draw-loose.loose |  |
| se | Bow2.ogg | 7408 | wpn.draw-loose.loose |  |
| se | Bow3.ogg | 7545 | wpn.draw-loose.loose |  |
| se | Bow4.ogg | 12794 | wpn.draw-loose.loose |  |
| se | Bow5.ogg | 11466 | wpn.draw-loose.loose |  |
| se | Break.ogg | 12111 |  | sfx |
| se | Breath.ogg | 13732 |  | sfx |
| se | Buzzer1.ogg | 5541 | ui.system.buzzer |  |
| se | Buzzer2.ogg | 6896 | ui.system.buzzer |  |
| se | Buzzer3.ogg | 7919 | ui.system.buzzer |  |
| se | Cancel1.ogg | 5132 | ui.system.cancel |  |
| se | Cancel2.ogg | 8784 | ui.system.cancel |  |
| se | Cancel3.ogg | 7156 | ui.system.cancel |  |
| se | Cat.ogg | 8345 |  | vocal |
| se | Chain.ogg | 17974 |  | sfx |
| se | Chest1.ogg | 21459 |  | sfx |
| se | Chest2.ogg | 9923 |  | sfx |
| se | Chicken.ogg | 10162 |  | vocal |
| se | Chime1.ogg | 6048 | ui.alert.notification |  |
| se | Chime2.ogg | 8107 | ui.alert.notification |  |
| se | Close1.ogg | 7980 |  | door |
| se | Close2.ogg | 7741 |  | door |
| se | Close3.ogg | 8339 |  | door |
| se | Coin.ogg | 5611 |  | sfx |
| se | Collapse1.ogg | 21755 | ui.system.enemy-collapse |  |
| se | Collapse2.ogg | 21091 | ui.system.boss-collapse-1 |  |
| se | Collapse3.ogg | 17423 | ui.system.boss-collapse-2 |  |
| se | Collapse4.ogg | 33952 | ui.system.actor-collapse |  |
| se | Computer.ogg | 11691 |  | sfx |
| se | Confuse.ogg | 11668 |  | sfx |
| se | Cow.ogg | 12282 |  | vocal |
| se | Crash.ogg | 15571 |  | sfx |
| se | Crossbow.ogg | 6230 | wpn.crossbow.fire |  |
| se | Crow.ogg | 8652 |  | vocal |
| se | Cry1.ogg | 6311 |  | vocal |
| se | Cry2.ogg | 13503 |  | vocal |
| se | Cursor1.ogg | 3965 | ui.system.cursor |  |
| se | Cursor2.ogg | 4648 | ui.system.cursor |  |
| se | Cursor3.ogg | 4313 | ui.system.cursor |  |
| se | Cursor4.ogg | 5679 | ui.system.cursor |  |
| se | Damage1.ogg | 6058 |  | ui.system.enemy-damage |
| se | Damage2.ogg | 6721 |  | ui.system.enemy-damage |
| se | Damage3.ogg | 6593 |  | ui.system.enemy-damage |
| se | Damage4.ogg | 7389 | ui.system.enemy-damage |  |
| se | Damage5.ogg | 6482 | ui.system.actor-damage |  |
| se | Darkness1.ogg | 13167 |  | sfx |
| se | Darkness2.ogg | 11721 |  | sfx |
| se | Darkness3.ogg | 12051 |  | sfx |
| se | Darkness4.ogg | 9548 |  | sfx |
| se | Darkness5.ogg | 14409 |  | sfx |
| se | Darkness6.ogg | 6188 |  | sfx |
| se | Darkness7.ogg | 11628 |  | sfx |
| se | Darkness8.ogg | 11899 |  | sfx |
| se | Decision1.ogg | 9932 | ui.system.ok |  |
| se | Decision2.ogg | 4256 | ui.system.ok |  |
| se | Decision3.ogg | 8220 | ui.system.ok |  |
| se | Decision4.ogg | 5913 | ui.system.ok |  |
| se | Decision5.ogg | 10521 | ui.system.ok |  |
| se | Devil1.ogg | 22893 |  | sfx |
| se | Devil2.ogg | 19231 |  | sfx |
| se | Devil3.ogg | 22909 |  | sfx |
| se | Disappointment.ogg | 13712 |  | sfx |
| se | Dive.ogg | 17925 |  | sfx |
| se | Dog.ogg | 5515 |  | vocal |
| se | Door1.ogg | 8329 |  | door |
| se | Door2.ogg | 15528 |  | door |
| se | Door3.ogg | 9872 |  | door |
| se | Door4.ogg | 23324 |  | door |
| se | Door5.ogg | 14194 |  | door |
| se | Door6.ogg | 8983 |  | door |
| se | Door7.ogg | 14776 |  | door |
| se | Door8.ogg | 10841 |  | door |
| se | Down1.ogg | 10294 |  | sfx |
| se | Down2.ogg | 8616 |  | sfx |
| se | Down3.ogg | 14743 |  | sfx |
| se | Down4.ogg | 16706 |  | sfx |
| se | Down5.ogg | 18302 |  | sfx |
| se | Down6.ogg | 17779 |  | sfx |
| se | Down7.ogg | 24296 |  | sfx |
| se | Earth1.ogg | 8454 |  | sfx |
| se | Earth2.ogg | 8401 |  | sfx |
| se | Earth3.ogg | 10235 |  | sfx |
| se | Earth4.ogg | 7761 |  | sfx |
| se | Earth5.ogg | 9733 |  | sfx |
| se | Electrocardiogram.ogg | 7047 |  | sfx |
| se | Equip1.ogg | 6205 | ui.system.equip |  |
| se | Equip2.ogg | 7799 | ui.system.equip |  |
| se | Equip3.ogg | 8462 | ui.system.equip |  |
| se | Evasion1.ogg | 5758 | ui.system.evasion |  |
| se | Evasion2.ogg | 6643 | ui.system.magic-evasion |  |
| se | Explosion1.ogg | 11292 | spell.evocation.burst.impact |  |
| se | Explosion2.ogg | 12838 | spell.evocation.burst.impact |  |
| se | Explosion3.ogg | 14069 | spell.evocation.burst.impact |  |
| se | Explosion4.ogg | 21703 | spell.evocation.burst.impact |  |
| se | Fall.ogg | 8350 |  | sfx |
| se | Fire1.ogg | 8596 | hit.fire.flesh |  |
| se | Fire2.ogg | 9864 | hit.fire.flesh |  |
| se | Fire3.ogg | 9442 | hit.fire.flesh |  |
| se | Fire4.ogg | 9710 | hit.fire.flesh |  |
| se | Fire5.ogg | 11087 | hit.fire.flesh |  |
| se | Fire6.ogg | 11128 | hit.fire.flesh |  |
| se | Fire7.ogg | 11683 | hit.fire.flesh |  |
| se | Fire8.ogg | 18851 | hit.fire.flesh |  |
| se | Fire9.ogg | 19026 | hit.fire.flesh |  |
| se | Flash1.ogg | 7409 |  | sfx |
| se | Flash2.ogg | 10067 |  | sfx |
| se | Flash3.ogg | 18019 |  | sfx |
| se | Float1.ogg | 23598 |  | sfx |
| se | Float2.ogg | 23184 |  | sfx |
| se | Fog1.ogg | 7064 |  | sfx |
| se | Fog2.ogg | 9962 |  | sfx |
| se | Frog.ogg | 9887 |  | vocal |
| se | Gate1.ogg | 31473 |  | door |
| se | Gate2.ogg | 12811 |  | door |
| se | Growl.ogg | 36208 |  | vocal |
| se | Gun1.ogg | 7622 |  | firearm |
| se | Gun2.ogg | 11193 |  | firearm |
| se | Gun3.ogg | 12406 |  | firearm |
| se | Hammer.ogg | 6526 | work.hammer.loop |  |
| se | Heal1.ogg | 6347 |  | sfx |
| se | Heal2.ogg | 7916 |  | sfx |
| se | Heal3.ogg | 8491 |  | sfx |
| se | Heal4.ogg | 10840 |  | sfx |
| se | Heal5.ogg | 8924 |  | sfx |
| se | Heal6.ogg | 7633 |  | sfx |
| se | Heal7.ogg | 17583 |  | sfx |
| se | Horn.ogg | 18878 |  | sfx |
| se | Horse.ogg | 10273 |  | vocal |
| se | Ice1.ogg | 6389 | hit.cold.flesh |  |
| se | Ice10.ogg | 14705 | hit.cold.flesh |  |
| se | Ice11.ogg | 15359 | hit.cold.flesh |  |
| se | Ice2.ogg | 8597 | hit.cold.flesh |  |
| se | Ice3.ogg | 7723 | hit.cold.flesh |  |
| se | Ice4.ogg | 7444 | hit.cold.flesh |  |
| se | Ice5.ogg | 11240 | hit.cold.flesh |  |
| se | Ice6.ogg | 12964 | hit.cold.flesh |  |
| se | Ice7.ogg | 6508 | hit.cold.flesh |  |
| se | Ice8.ogg | 14095 | hit.cold.flesh |  |
| se | Ice9.ogg | 23497 | hit.cold.flesh |  |
| se | Item1.ogg | 6015 | ui.system.use-item |  |
| se | Item2.ogg | 8833 | ui.system.use-item |  |
| se | Item3.ogg | 9133 | ui.system.use-item, ui.system.use-skill |  |
| se | Jump1.ogg | 4797 |  | sfx |
| se | Jump2.ogg | 5301 |  | sfx |
| se | Key.ogg | 5054 |  | sfx |
| se | Knock.ogg | 4387 |  | door |
| se | Laser1.ogg | 9618 |  | sfx |
| se | Laser2.ogg | 34755 |  | sfx |
| se | Laugh.ogg | 22054 |  | vocal |
| se | Launch.ogg | 26388 |  | sfx |
| se | Leakage.ogg | 14299 |  | sfx |
| se | Liquid.ogg | 36914 |  | sfx |
| se | Load1.ogg | 14076 | ui.system.load |  |
| se | Load2.ogg | 4838 | ui.system.load |  |
| se | Machine.ogg | 24084 |  | sfx |
| se | Magic1.ogg | 7267 |  | sfx |
| se | Magic10.ogg | 28536 |  | sfx |
| se | Magic11.ogg | 29763 |  | sfx |
| se | Magic12.ogg | 30814 |  | sfx |
| se | Magic2.ogg | 10000 |  | sfx |
| se | Magic3.ogg | 25426 |  | sfx |
| se | Magic4.ogg | 10690 |  | sfx |
| se | Magic5.ogg | 10427 |  | sfx |
| se | Magic6.ogg | 13365 |  | sfx |
| se | Magic7.ogg | 26201 |  | sfx |
| se | Magic8.ogg | 21221 |  | sfx |
| se | Magic9.ogg | 19878 |  | sfx |
| se | Miss.ogg | 5324 | hit.outcome.miss |  |
| se | Monster1.ogg | 9957 |  | vocal |
| se | Monster10.ogg | 16438 |  | vocal |
| se | Monster2.ogg | 11287 |  | vocal |
| se | Monster3.ogg | 11738 |  | vocal |
| se | Monster4.ogg | 12357 |  | vocal |
| se | Monster5.ogg | 16737 |  | vocal |
| se | Monster6.ogg | 13614 |  | vocal |
| se | Monster7.ogg | 15375 |  | vocal |
| se | Monster8.ogg | 26715 |  | vocal |
| se | Monster9.ogg | 12960 |  | vocal |
| se | Move1.ogg | 10044 |  | foot |
| se | Move10.ogg | 11083 |  | foot |
| se | Move2.ogg | 10719 |  | foot |
| se | Move3.ogg | 9441 |  | foot |
| se | Move4.ogg | 10908 |  | foot |
| se | Move5.ogg | 27397 |  | foot |
| se | Move6.ogg | 18238 |  | foot |
| se | Move7.ogg | 19290 |  | foot |
| se | Move8.ogg | 20529 |  | foot |
| se | Move9.ogg | 20156 |  | foot |
| se | Neon.ogg | 12765 |  | sfx |
| se | Noise.ogg | 14604 |  | sfx |
| se | Open1.ogg | 5833 |  | door |
| se | Open2.ogg | 7088 |  | door |
| se | Open3.ogg | 7690 |  | door |
| se | Open4.ogg | 6733 |  | door |
| se | Open5.ogg | 8687 |  | door |
| se | Open6.ogg | 10155 |  | door |
| se | Open7.ogg | 8724 |  | door |
| se | Open8.ogg | 16556 |  | door |
| se | Open9.ogg | 12713 |  | door |
| se | Paralyze1.ogg | 7513 |  | sfx |
| se | Paralyze2.ogg | 5598 |  | sfx |
| se | Paralyze3.ogg | 9804 |  | sfx |
| se | Parry.ogg | 6384 | hit.outcome.parry |  |
| se | Particles1.ogg | 19391 |  | sfx |
| se | Particles2.ogg | 18571 |  | sfx |
| se | Particles3.ogg | 28623 |  | sfx |
| se | Particles4.ogg | 30742 |  | sfx |
| se | Phone.ogg | 7926 |  | sfx |
| se | Poison.ogg | 9108 | hit.poison.flesh |  |
| se | Pollen.ogg | 14364 |  | sfx |
| se | Powerup.ogg | 13301 |  | sfx |
| se | Push.ogg | 7668 |  | sfx |
| se | Raise1.ogg | 8579 |  | sfx |
| se | Raise2.ogg | 6796 |  | sfx |
| se | Raise3.ogg | 10314 |  | sfx |
| se | Recovery.ogg | 7439 | ui.system.recovery |  |
| se | Reflection.ogg | 7386 | ui.system.reflection |  |
| se | Resonance.ogg | 15794 |  | sfx |
| se | Run.ogg | 6675 | ui.system.escape |  |
| se | Saint1.ogg | 10457 | hit.radiant.flesh |  |
| se | Saint2.ogg | 12393 | hit.radiant.flesh |  |
| se | Saint3.ogg | 6861 | hit.radiant.flesh |  |
| se | Saint4.ogg | 13896 | hit.radiant.flesh |  |
| se | Saint5.ogg | 7253 | hit.radiant.flesh |  |
| se | Saint6.ogg | 11347 | hit.radiant.flesh |  |
| se | Saint7.ogg | 12873 | hit.radiant.flesh |  |
| se | Saint8.ogg | 11051 | hit.radiant.flesh |  |
| se | Saint9.ogg | 7517 | hit.radiant.flesh |  |
| se | Sand.ogg | 11337 | foot.sand.walk |  |
| se | Save1.ogg | 17708 | ui.system.save |  |
| se | Save2.ogg | 5786 | ui.system.save |  |
| se | Scream.ogg | 13535 |  | vocal |
| se | Sheep.ogg | 8535 |  | vocal |
| se | Shop1.ogg | 16165 | ui.system.shop |  |
| se | Shop2.ogg | 6321 | ui.system.shop |  |
| se | Shot1.ogg | 8050 |  | firearm |
| se | Shot2.ogg | 5670 |  | firearm |
| se | Shot3.ogg | 8340 |  | firearm |
| se | Silence.ogg | 6919 |  | sfx |
| se | Siren.ogg | 15601 |  | sfx |
| se | Skill1.ogg | 8093 |  | sfx |
| se | Skill2.ogg | 9622 |  | sfx |
| se | Skill3.ogg | 10379 |  | sfx |
| se | Slash1.ogg | 5862 | hit.slashing.flesh |  |
| se | Slash10.ogg | 11088 | hit.slashing.flesh |  |
| se | Slash2.ogg | 6313 | hit.slashing.flesh |  |
| se | Slash3.ogg | 6284 | hit.slashing.flesh |  |
| se | Slash4.ogg | 5818 | hit.slashing.flesh |  |
| se | Slash5.ogg | 6033 | hit.slashing.flesh |  |
| se | Slash6.ogg | 6164 | hit.slashing.flesh |  |
| se | Slash7.ogg | 5417 | hit.slashing.flesh |  |
| se | Slash8.ogg | 5935 | hit.slashing.flesh |  |
| se | Slash9.ogg | 5906 | hit.slashing.flesh |  |
| se | Sleep.ogg | 6386 |  | sfx |
| se | Sound1.ogg | 6185 |  | sfx |
| se | Sound2.ogg | 8248 |  | sfx |
| se | Sound3.ogg | 11462 |  | sfx |
| se | Splash.ogg | 11674 | foot.water-shallow.walk |  |
| se | Stare.ogg | 9518 |  | sfx |
| se | Starlight.ogg | 16981 |  | sfx |
| se | Summon.ogg | 19602 |  | sfx |
| se | Switch1.ogg | 4729 |  | door |
| se | Switch2.ogg | 5554 |  | door |
| se | Switch3.ogg | 5839 |  | door |
| se | Sword1.ogg | 6243 | wpn.swing.action |  |
| se | Sword2.ogg | 8720 | wpn.swing.action |  |
| se | Sword3.ogg | 7051 | wpn.swing.action |  |
| se | Sword4.ogg | 7235 | wpn.swing.action |  |
| se | Sword5.ogg | 6468 | wpn.swing.action |  |
| se | Sword6.ogg | 9559 | wpn.swing.action |  |
| se | Sword7.ogg | 9254 | wpn.swing.action |  |
| se | Teleport.ogg | 23654 |  | sfx |
| se | Thunder1.ogg | 9789 | hit.thunder.flesh |  |
| se | Thunder10.ogg | 8893 | hit.thunder.flesh |  |
| se | Thunder11.ogg | 18703 | hit.thunder.flesh |  |
| se | Thunder12.ogg | 13697 | hit.thunder.flesh |  |
| se | Thunder13.ogg | 19709 | hit.thunder.flesh |  |
| se | Thunder14.ogg | 19520 | hit.thunder.flesh |  |
| se | Thunder2.ogg | 5885 | hit.thunder.flesh |  |
| se | Thunder3.ogg | 7514 | hit.thunder.flesh |  |
| se | Thunder4.ogg | 11068 | hit.thunder.flesh |  |
| se | Thunder5.ogg | 7888 | hit.thunder.flesh |  |
| se | Thunder6.ogg | 10105 | hit.thunder.flesh |  |
| se | Thunder7.ogg | 9876 | hit.thunder.flesh |  |
| se | Thunder8.ogg | 8225 | hit.thunder.flesh |  |
| se | Thunder9.ogg | 13487 | hit.thunder.flesh |  |
| se | Transceiver.ogg | 9632 |  | sfx |
| se | Twine.ogg | 8540 |  | sfx |
| se | Up1.ogg | 9319 |  | sfx |
| se | Up2.ogg | 14290 |  | sfx |
| se | Up3.ogg | 14602 |  | sfx |
| se | Up4.ogg | 10721 |  | sfx |
| se | Up5.ogg | 24940 |  | sfx |
| se | Up6.ogg | 23331 |  | sfx |
| se | Up7.ogg | 22545 |  | sfx |
| se | Up8.ogg | 24533 |  | sfx |
| se | Water1.ogg | 8901 |  | sfx |
| se | Water2.ogg | 8797 |  | sfx |
| se | Water3.ogg | 8864 |  | sfx |
| se | Water4.ogg | 11756 |  | sfx |
| se | Water5.ogg | 12404 |  | sfx |
| se | Wind1.ogg | 8549 |  | sfx |
| se | Wind10.ogg | 16688 |  | sfx |
| se | Wind11.ogg | 21082 |  | sfx |
| se | Wind2.ogg | 12227 |  | sfx |
| se | Wind3.ogg | 8979 |  | sfx |
| se | Wind4.ogg | 4873 |  | sfx |
| se | Wind5.ogg | 11164 |  | sfx |
| se | Wind6.ogg | 11137 |  | sfx |
| se | Wind7.ogg | 4692 |  | sfx |
| se | Wind8.ogg | 12699 |  | sfx |
| se | Wind9.ogg | 10785 |  | sfx |
| se | Wolf.ogg | 12271 |  | vocal |

<!-- GEN:census:end -->

## Proposed follow-ups

These ids are not WBS ids.

### PROPOSED-AM-01 - Stem and bed mixer

A mixer that plays the four music stems as one music graph and up to four ambience beds, using volume, pitch, and pan only, so the stock one-BGM and one-BGS slots are no longer the ceiling.

### PROPOSED-AM-02 - Owner-gated library

An Owner-directed pass that supplies the canonical files by recording or licensing. This follow-up is not a generation prompt and does not authorize anyone to generate audio.

### PROPOSED-AM-03 - Loop-tag check

If the Owner allows reading Ogg comment headers and nothing else, a later checker can confirm `LOOPSTART` and `LOOPLENGTH` without decoding PCM. This lane's validator does not read those bytes.

### PROPOSED-AM-04 - System.json names

Point the 24 system sound names at canonical stems. That edit is outside this lane's paths.

### PROPOSED-AM-05 - Faction menu playback

Make the menu BGM call read the catalog object (name, pan, pitch, volume) instead of a string at volume 80. That edit is outside this lane's paths.

### PROPOSED-AM-06 - Catalog biome ids

Move worldgen biome ids onto the six DEC-030 tokens so the legacy routing table can retire. That edit is outside this lane's paths.
