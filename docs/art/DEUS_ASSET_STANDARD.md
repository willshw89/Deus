# DEUS Master Asset Standard

**Document ID:** `DEUS-ASSET-STANDARD-01`
**Machine form:** `game/data/UF_AssetStandard.json` (`schemaVersion` `deus-asset-standard/1.5.0`)
**Spell rows:** `game/data/UF_SpellVisualTable.schema.json` (JSON Schema draft 2020-12)
**Checker:** `tools/art/validate_asset_standard.js`
**Status:** Normative for new asset work. No art is produced by this document (DEC-007). §3 is the production SOP the Owner confirmed on 2026-09-29 (DEC-007 amendment: PixelLab OBJECTS and MAPS only).

This standard is the required set for every DEUS asset: what must exist, what it is named, how big it is, and how it is drawn. Rule ids (`AS-GLOBAL-003` and the rest of the index) are the same ids as the keys of `rules` in the JSON. A rule stated here with **MUST** is required. **SHOULD** is the default when a later Owner amendment is explicitly marked on that rule.

Owner rulings win over older art docs. The conflicts and the winning line are in Appendix A. Questions this document does not answer are in Appendix B. How today's files sit against the standard is in Appendix C.

The pose grid in **AS-HUM-016** is the standard's default and is marked **PM-proposed, Owner may amend**. Addenda A7 through A9 (Owner 12:56 CT through 13:24 CT, and the PM decisions marked on those rules) are §§2.13–2.16. Addendum A9b (Owner 13:30 CT through 14:10 CT) is §2.17. Addendum A9c (Owner 14:38 CT through 17:09 CT) is §2.18 and §2.19. Item 38 sets the RMMZ standard top-down 3/4 view. Item 43 gives characters eight directions. Items 39, 40 and 41 are retired for character map sprites by §2.19. Item 42 makes each faceset one complete image. Each A9c rule ends with a note for the future Deus Art manual. §3 (added 2026-09-29) is the natural-world production SOP and the one status ladder. The Create Character and Create State steps in §2.19 are suspended under the DEC-007 amendment of the same day.

## 1. Global rules

**AS-GLOBAL-001.** The grid is 48 px. One cell is one 5 ft square. Frame widths and heights for characters, creatures, items and effects MUST be integer multiples of 48. UI icons are the one exception and use the 32 px icon grid in **AS-ICON-001**. The world-map overview is 1 px per tile (**AS-MAP-001**) and is a map image, not a world tile.

**AS-GLOBAL-002.** DEC-011: every Z layer renders at 1 source pixel = 1 screen pixel. There is no blur, bloom, glow shader, ColorMatrix, parallax filter, fog filter, or alpha fade. The first goal is a correct flat layer. Presentation integer scale of the finished frame is **AS-RENDER-001**. It does not resample an asset. A whole-pixel depth-demo layer offset is **AS-DEPTH-001**. It is not a parallax filter.

**AS-GLOBAL-003.** Alpha is binary: 0 or 255. Brightness and "energy" come from drawn frames and palette ramps. The one additive path is a pre-drawn glow frame on the light layer in **AS-GLOW-001** and **AS-LOCK-001**. That frame's alpha stays binary. The composite is not a bloom shader and not a blur.

**AS-GLOBAL-017.** The runtime MUST NOT scale, rotate or tint a frame as a substitute for a drawn frame. Character attacks are whole-sprite clips (**AS-CHMAP-001**). **AS-RENDER-001** is nearest-neighbour integer scale of the finished frame, not of one asset. **AS-PM-001** allows an offline east-to-west mirror for creatures and props. Characters are authored in eight directions and are not mirrored. Furniture still needs the symmetric flag (**AS-FURN-001**). **AS-MIRROR-001** remains the rule for its own offline bake.

**AS-GLOBAL-004.** Colour is named by ramp id, never by a fresh hex invented for one asset. The canonical master is the Lanes S/T file `art/palette/deus_master_world_palette_v1.hex`: 226 active colours, copied into `masterPalette.colours` in the JSON. Thirty reserved slots bring the master slot count to 256. Those reserved slots are empty. They are not filled from anywhere else. `art/palette/uf.hex` is a different file: 256 lines, 250 unique colours, six repeated lines, and zero colours in common with the master. It is not a second master. The active list is not shrunk. `game/data/DEUS_PaletteRegistry.json` (58 material ramps) stays the ramp architecture. This lane does not edit `art/palette/**`. The asset standard adds ramp ids the registry does not have yet (`RAMP_DMG_*`, `RAMP_SCHOOL_*`, `RAMP_RACE_*`, `RAMP_NIGHT`, `RAMP_HAIR_GREY`, `RAMP_CONDITION_*`, `RAMP_SCALE`, `RAMP_PORTRAIT_SKIN_HAIR`). Those ids are the contract. Filling their hex is a follow-up, not a licence to pick colours in a generator prompt. Membership, caps and the grayscale step are **AS-LOCK-001** and **AS-READ-001**.

**AS-GLOBAL-005.** One light direction for every asset: top-left, 315° azimuth, 45° elevation (`docs/art/DEUS_ENVIRONMENT_MATERIAL_STANDARD.md` §2.1). Highlights sit on top and left edges. Core shadow sits on the bottom and right. The light is baked into the pixels.

**AS-GLOBAL-006.** Selout is a 1 px outline on the outer silhouette only. Its colour is the darkest step of the local material ramp, and the bottom and right of the silhouette use the deep-shadow step. It is not a global black. Internal edges (fingers on a grip, hair against the face) are not outlined. **AS-LOCK-001** locks this outline on map sprites and items, self-tinted, and locks none on terrain tiles. A character faceset does not require it. A character faceset may use a black contour. A depth-toned overlay may keep an outline (**AS-DEPTH-001**). A terrain tile does not. Seamless ground fills have no silhouette outline.

**AS-GLOBAL-007.** The contact shadow is a drawn ellipse at the shadow anchor (human baseline `[24, 45]` in a 48 px cell). Seamless ground tiles MUST NOT carry a baked shadow of an off-screen tree or mountain. There is no drop-shadow filter.

**AS-GLOBAL-008.** Back-to-front draw order inside a layer: ground, strata faces and ramps, objects, the unit body, equipment, effects, UI. Map order is by row, then by Z layer (**AS-PROJ-001**). Item order inside that is footprint bottom line, then height offset (**AS-PLAY-001**).

**AS-GLOBAL-009.** The `DEUS_Anim` data order, bottom to top, stays: feet, legs, waist, armor, torso, neck, shoulders, arms, hands, ring1, ring2, head, eyes, back, offHand, shield, mainHand, weapon. Pixels drawn on a charset follow **AS-VIS-001**. Slots outside that stack are items, icons, portraits and world sprites.

**AS-GLOBAL-018.** Thirty-two Z layers (−16..+15) and exactly nine races stay (human, elf, halfling, dwarf, gnome, dragonborn, half-elf, half-orc, tiefling). Which race lives on which layer is open (Appendix B). A 9-layer test configuration may still exist. It is not the world. Owner items 26 and 29 set the layer height here: one Z layer is 5 ft and 48 px; partial height is four quarters of 1.25 ft, 12 px each; `stratumPx` is `[12, 12, 12, 12]`. **OPEN (2026-09-29; the DEC-016 `stratumPx` question):** `docs/OWNER_DECISIONS.md` DEC-013 item 2 and DEC-038 item 3 say 1 layer = 10 ft with five 2 ft strata, and `art/catalogue/geometry.json` and `DEUS_Levels.js` follow them; the decision log governs until the Owner rules once (Appendix A item 41; `docs/STATUS.md` D.5). The numbers are **AS-SCALE-001** and **AS-QTR-001**. A 64 px tile was not adopted.

**AS-GLOBAL-019.** DEC-030 replaces the old band ranges and the 5-biome set. Depth bands:

| Id | Name | Z |
|---|---|---|
| `DEEP` | Deep Earth | −16..−11 |
| `CAVERN` | Caverns | −10..−5 |
| `LOWLAND` | Lowlands | −4..+1 |
| `UPLAND` | Uplands | +2..+6 |
| `HIGHLAND` | Highlands | +7..+11 |
| `AIR` | Reserved open air | +12..+15 |

Natural terrain stops at +11. `AIR` has no natural terrain. Biome ids are `VOLCANIC`, `WET`, `ARID`, `TEMPERATE`, `COLD`, `WILD`. Shared assets use band `ALL` and biome `SHARED`. A catalogue entry that still says `LOWER2` or `TEMP` is legacy vocabulary: the checker reports it as unknown, not as a pass. `HIGH` is not a biome. Highland is a depth band.

**AS-GLOBAL-020.** SRD 5.1 is the rules authority. V64 (OSRS-style accuracy and strength) is retired. Conditions, damage types, sizes, spells and creature statistics follow SRD 5.1.

**AS-GLOBAL-021.** DEC-016: the scale chart governs drawn size, envelope, footprint and anchor. The numeric source is `game/data/DEUS_ScaleRegistry.json`. The picture is `art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`. `art/catalogue/scale_chart.json` records both. A human adult is 42 px tall inside the 48 px cell (chart row `CHARACTER_HUMAN_ADULT`, drawn height 40–44). If the Owner means a different file by "the scale chart", that file is still unnamed (Appendix B).

**AS-GLOBAL-022.** Creatures use four directions. Row order on a creature sheet is South, West, East, North. Character map sprites use eight directions (**AS-CHMAP-001**).

**AS-GLOBAL-023.** A creature sheet whose facings include `SW`, `NW`, `NE` or `SE` is a legacy source. The straight rows S, W, E, N may be mined from that creature sheet. Character map sprites use those diagonal facings together with S, W, E and N.

**AS-GLOBAL-010.** A catalogue id is `BAND_BIOME_CATEGORY_TYPE_VARIANT_STATE`: six fields of letters and digits, joined by `_`, with a hyphen allowed inside a field (`docs/art/catalogue/SCHEMA.md`). Example: `ALL_SHARED_CREATURE_WILD-HORSE_V1_DEFAULT`.

**AS-GLOBAL-011.** A leading `$` means one character occupies the whole sheet. A leading `!` means an object sheet with no foot-offset shadow. A sheet with neither prefix holds eight characters in a 4 by 2 grid of charset blocks.

**AS-GLOBAL-012.** Every character sheet and every layer sheet has a sidecar with the same basename: `frameWidth`, `frameHeight`, `anchor`, `footprint`, `facings`, `animations`, `frameMs`. The default clock is 150 ms (**AS-ANIM-001**).

**AS-GLOBAL-013.** One reserved RMMZ charset block is 3 columns by 4 facing rows. Walk playback on that block is stand, left step, stand, right step. Character map sprite clips use eight direction rows (**AS-CHMAP-001**).

**AS-GLOBAL-016.** Tall Large frames are 48 by 96. Long Large frames are 96 by 48. The matching RMMZ blocks are 144 by 384 and 288 by 192. Further actions are more `$` sheets, or sidecar-declared rows on those sheets. They do not change the 3 by 4 walk read.

**AS-GLOBAL-014.** A face sheet is 576 by 288: 4 columns by 2 rows of 144 by 144 cells. Each cell is one complete portrait. The sheet is not a stack of face layers (**AS-FACE-002**).

**AS-GLOBAL-015.** DEUS uses SV battlers on the RMMZ battle screen (DEC-017 keeps that screen). An SV sheet is 9 columns by 6 rows of 64 by 64 (576 by 384, 18 motions). Humanoids MUST have one. Creatures of size Medium, Large, Huge and Gargantuan MUST have one. Tiny and Small critters have none. The SV sheet does not replace the map action rows.

**AS-STYLE-001.** File names the checker enforces:

| Class | Pattern |
|---|---|
| Character or creature sheet | `$` + letters, digits, underscores + `.png` |
| Object sheet | `!` + letters, digits, underscores + `.png` |
| Equipment layer | `$UF_Layer_<itemId>__<race>.png` |
| Face sheet | `UF_Faces_<race>_<n>.png` |
| Entity portrait | `UF_Portrait_<id>.png` or `UF_Portrait_<id>__<race>.png` |

`<race>` is one of the nine race ids (`half-elf`, `half-orc` keep the hyphen). A legacy `$UF_Layer_<itemId>.png` with no race suffix fails this rule. The style-bible reference sheet is a spec only, in **AS-STYLE-001**'s companion note at the end of §2.12. Nobody draws it in this lane.

## 2. Categories

### 2.1 Critters (Tiny and Small)

**AS-CRIT-001.** Required rows, each in four directions: `idle`, `walk`, `attack`, `hurt`, `death`.

**AS-CRIT-002.** `fly` and `swim` are optional. When they exist they use the same four directions.

**AS-CRIT-003.** A critter has a corpse sprite and a harvest/loot icon. It has no face sheet and no SV battler.

**AS-CRIT-004.** Frame class `TINY` and `SMALL` are 48 by 48. The drawn body stays inside the scale-chart envelope for that size. Footprint for both is 1 by 1 square (SRD size table: Tiny space is 2½ ft and still occupies one square in this catalogue).

### 2.2 Beasts and monsters (Medium and larger)

**AS-BEAST-001.** The critter rows, plus one `attack-<name>` row for each natural attack the SRD stat block names (bite, claw, slam, breath, and the rest). Four directions each.

**AS-BEAST-002.** The 15 SRD conditions use the same treatments as humanoids (**AS-HUM-012**).

**AS-BEAST-003.** An SV battler is required (**AS-GLOBAL-015**).

**AS-BEAST-004.** Large, Huge and Gargantuan frames are the squares in **AS-SIZE-001**, authored at that size. They are not a runtime scale of a Medium frame. The 13 rig families in the crosswalk (`HUMANOID` through `MONSTROUS_SPECIAL`) choose which frame class and which sockets apply. They do not each invent a sheet layout.

Creature sockets beyond the humanoid set, taken from the charter: quadruped `MOUNT_SADDLE`, `HEAD_HORN`, `MOUTH_BITE`, `GROUND_ORIGIN`; winged `WING_L`, `WING_R`, `TALONS`.

### 2.3 Humanoids

The nine races each get a body template per sex. Catalogue body ids today are only `ALL_SHARED_CHARACTER_HUMAN_MALE-T0_DEFAULT` (28 equipment rows) and `ALL_SHARED_CHARACTER_HUMAN_FEMALE-T0_DEFAULT` (6).

**AS-HUM-001.** Required body templates: nine races × male and female. `bodyType` in paper-doll data is the body entry id. New ids follow `ALL_SHARED_CHARACTER_<RACE>_<SEX>-T0_DEFAULT` until an age step other than adult is named.

**AS-HUM-002.** Socket ids are fixed. Coordinates are stored per frame. They are not one number for every pose. The human neutral stand, facing down, 48 by 48, origin top-left, is the baseline from the charter §4.3:

| Socket | Baseline |
|---|---|
| `GROUND_ORIGIN` | 24, 47 |
| `SHADOW_ORIGIN` | 24, 45 |
| `HEAD_TOP` | 24, 6 |
| `HEAD_FACE` | 24, 14 |
| `MOUTH_BEARD` | 24, 18 |
| `CHEST_CORE` | 24, 26 |
| `HAND_PRIMARY` | 14, 30 |
| `HAND_SECONDARY` | 34, 30 |
| `HIP_LEFT` / `HIP_RIGHT` | 16, 34 and 32, 34 |
| `BELT` | the pair `HIP_LEFT` and `HIP_RIGHT` (the brief's belt anchor) |
| `BACK_WEAPON` | 24, 22 |
| `BACK_SHIELD` / `BACK_TOOL` | 24, 24 |

Also required, from the crosswalk, and stored the same way: `ROOT_PELVIS`, `PALM_PRIMARY`, `PALM_SECONDARY`, `FOOT_LEFT`, `FOOT_RIGHT`, `EFFECT_HEAD`, `EFFECT_CHEST`, `EFFECT_FEET`, `CARRY_CENTER`, `CARRY_LEFT`, `CARRY_RIGHT`. Item-local sockets (`GRIP_PRIMARY`, `TIP`, `BLADE_EDGE`, `IMPACT_POINT`, `STRING_GRIP`, `PROJECTILE_ORIGIN`, `STAFF_TIP`, `WAND_TIP`, and the rest of the crosswalk §3.2) live on the item, not on the body.

**AS-HUM-014.** `dominantHand` is `right` or `left` (charter: 88% right, 12% left). `HAND_PRIMARY` binds to the dominant hand. Grips: `ONE_HANDED`, `OFF_HAND`, `TWO_HANDED`, `VERSATILE`. Presentation states: `HELD`, `HIP`, `BACK`, `SLUNG`, `HIDDEN`. A heraldic shield, an eye patch, or any other asymmetrical piece is drawn for the facing it needs. The only mirror is **AS-MIRROR-001**.

**AS-HUM-003.** Race features sit on the body template: ears on elf, gnome and halfling; horns on tiefling and dragonborn; a tiefling tail; dragonborn scales. They are features of that template, not a genetics pick and not extra character sheets. Head, hair and beard are the preset in **AS-GENE-001**.

**AS-HUM-004.** Catalogue paper-doll z-order, matching the 34 existing equipment rows: `legs` 1, `torso` 2, `clothes` 2 (the clothes alias of torso), `head` 3, `back` 4, `shield` 5, `held` 6, `fx` 7. The 18 runtime slots still draw in **AS-GLOBAL-009** order. The coarse paper-doll layer is what the catalogue stores.

**AS-HUM-008.** Visible looks are the preset pool in **AS-GENE-001**. A player picks one preset and one of three skin and hair colour variants. On the charset those three variants are in-game master-palette swaps. On the portrait, each preset records `colourVariantMethod`: `palette-swap` when the skin and hair ramps map onto the master plus `RAMP_PORTRAIT_SKIN_HAIR`, and `separate-generation` otherwise. Sim genetics may store stats. They do not select a sprite, a face, a hair style or a colour. `geneticsLoci` is retired as an art selector. Race features in **AS-HUM-003** stay on the body template. `dominantHand` is still `right` or `left` and binds `HAND_PRIMARY`.

**AS-HUM-018.** Horns, tail, ears and dragonborn scale colour are race features on the body template. They do not change the frame class. Body height is the race height in **AS-PM-001**, including the dwarf male and female templates at 36 px.

**AS-HUM-007.** Greying and balding belong to the elder presets only. There is no separate balding overlay and no greying ramp painted onto an adult preset. The current baker's elder silver is the legacy bake (Appendix C).

**AS-HUM-006.** The age axis is required. This standard requires three templates and does not freeze any further step.

**AS-HUM-019.** `body:child` (frame class `SMALL`, work rows on), `body:adult` (frame class `MEDIUM`), and `body:elder` (frame class `MEDIUM`, stooped, work rows on). Child and elder both carry the humanoid action rows, including hammer, saw, chop, dig, stir and carry. The charter's note that a child is ineligible for heavy labour is a sim rule. It does not delete the frames.

**AS-HUM-013.** Pregnancy is `pregnancyStage` 0, 1, 2 or 3: a torso decal on that race's rig. It does not multiply armour sheets. One universal pixel offset for every race is not assumed.

**AS-HUM-009.** Required action rows, four directions each: `idle`, `walk`, `melee-swing`, `thrust`, `bow-draw`, `bow-loose`, `xbow-aim`, `xbow-fire`, `xbow-reload`, `thrown`, `cast-one-hand`, `cast-two-hand`, `cast-focus`, `hammer`, `saw`, `chop`, `dig`, `stir`, `carry`, `kneel`, `hurt`, `dodge`, `parry`, `death`, `sneak`, `climb`, `prone`, `unconscious`, `sleep`, `sit`. The last four are **AS-POSE-001**.

**AS-HUM-010.** Charter families map onto those rows. The charter §2 names 58 logical-action tokens in 15 domains. The lane brief's "45" is the subset that also appears on the F01–F14 map. The rows above are the required set. The map:

| Family | Rows |
|---|---|
| F01 `LOCOMOTION_WALK` | `idle`, `walk` (`run` is a faster cadence of the same frames, not a scale) |
| F02 `MELEE_SWING` | `melee-swing` |
| F03 `MELEE_THRUST` | `thrust` |
| F04 `DEFEND_BLOCK` | `parry` |
| F05 `RANGED_DRAW` | `bow-draw`, `bow-loose`, `xbow-aim`, `xbow-fire`, `xbow-reload`, `thrown` |
| F06 `MAGIC_CAST` | `cast-one-hand`, `cast-two-hand`, `cast-focus` |
| F07 `HAUL_CARRY` | `carry` |
| F08 `WORK_OVERHEAD` | `hammer`, `chop` |
| F09 `WORK_BENCH` | `saw`, `stir` |
| F10 `INTERACT_LOW` | `dig` |
| F11 `STEALTH_SNEAK` | `sneak` |
| F12 `REST_SIT` | `kneel`, `sit` |
| F13 `VERTICAL_CLIMB` | `climb` |
| F14 `DOWNED_STATE` | `hurt`, `death`, `prone`, `unconscious`, `sleep` |

`dodge` has no charter family. It is a required row of its own (a committed sidestep and a return to guard, three frames). Sleep, prone, unconscious and dead MUST be distinguishable from each other. Whether they share the family id F14 is open (Appendix B). They MUST NOT be the same frame.

**AS-HUM-011.** Emotes use the RMMZ balloon sheet: 384 by 720, 8 frames by 15 rows of 48 px (`docs/RMMZ_ASSET_SPEC.md` §5).

**AS-HUM-012.** All 15 SRD 5.1 conditions, and no filter:

| Condition | Treatment |
|---|---|
| blinded, charmed, deafened, frightened | Drawn icon at `EFFECT_HEAD` |
| exhaustion | Drawn stoop frames, plus a pip icon per level (the sim allows 6) |
| grappled | Drawn grip decal at `EFFECT_FEET` |
| restrained | Drawn bond decal at `EFFECT_FEET`, distinct from the grapple decal |
| incapacitated, paralyzed | Frame-freeze of the current pose |
| stunned | Frame-freeze plus the stunned icon |
| petrified | Frame-freeze plus a drawn swap to `RAMP_CONDITION_PETRIFIED` |
| poisoned | Drawn swap to `RAMP_CONDITION_POISONED`, plus the poisoned icon |
| prone | Row `prone` (**AS-POSE-001**), eyes open, weapon in the dirt |
| unconscious | Row `unconscious`, distinct from prone and from death |
| invisible | The body is replaced by a 1 px selout contour in `RAMP_CONDITION_INVISIBLE` (opaque pixels) for viewers who can perceive the creature, plus the condition icon. Everyone else gets no sprite. There is no alpha and no shimmer shader |

**AS-HUM-005.** A faceset never changes with gear. It is one complete 144 by 144 image for that preset. The race background is painted into the image. The 8 expressions in **AS-FACE-003** are generated from it and keep its identity. The faceset is not built from layers. Armour, helmets and class headwear are charset layers only (**AS-FACE-002**, **AS-VIS-001**).

**AS-HUM-015.** Character map sprites are the 18 unarmored bases and their armor States (**AS-CHMAP-001**). Race garb records stay reserved and are not the map sprite. Light, medium and heavy armour stay as three race-neutral armour ids with custom pixels per race (`outfit_armor_light`, `outfit_armor_medium`, `outfit_armor_heavy`). That is 27 armour icon variants. The art key is `outfitId__race` for those icons (**AS-ITEM-002**). Class outfit ids are icon-only. They are not required sprite variants. The former class-outfit slot ids stay reserved.

Owner 13:14 CT, as amended by item 40: armour pixels stay custom per race. The silhouette name below is the slot pattern for armour. Ramp `RAMP_RACE_<RACE>` and motif `MOTIF_RACE_<RACE>` still apply. Weapons, tools and accessories are not in this custom set (**AS-GEAR-001**). Class signature kits are **AS-VIS-001**.

| Silhouette | Runtime slots | Paper-doll layers |
|---|---|---|
| light | feet, legs, torso, arms | legs, torso |
| medium | feet, legs, torso, arms, shoulders | legs, torso |
| heavy | feet, legs, waist, torso, arms, shoulders, hands, head | legs, torso, head |

Armour motifs are `MOTIF_ARMOR_<WEIGHT>`. `outfitMatrix` is the 27 armour icon rows. Race garb rows stay reserved and are not the map sprite (**AS-CHMAP-001**). A generic cape is not drawn. Shields stay items (**AS-HUM-017**).

**AS-HUM-016.** PM-proposed, Owner may amend. Character attacks are whole-sprite weapon-group clips (**AS-CHMAP-001**). A rotating weapon sprite is retired for character map sprites. The runtime does not rotate a frame as a substitute for a drawn frame.

Default pose grid (four directions each):

| Pose | Frames |
|---|---|
| swing, thrust, bow-draw, cast, death | 4 |
| bow-loose, hit, flinch, dodge, parry | 3 |
| prone, unconscious, sleep, sit, sneak, climb | 4 |

Walk stays the RMMZ 3-column cycle (**AS-GLOBAL-013**).

**AS-HUM-017.** Shields are items, icons and world sprites. They are not drawn on a character map sprite. A generic cape is not a drawn layer. Class kit layers are retired for character map sprites (**AS-CHMAP-001**). `deformingRetired` names `generic-cape` only.

### 2.4 Faces

**AS-FACE-001.** Owner 16:05 CT. The race background is part of the portrait. It is painted into the one complete image, in that race's ramp and motif from **AS-HUM-015**. It has no layer of its own and no sheet of its own.

**AS-FACE-002.** Owner 16:05 CT. A faceset is not paper-dolled. Each preset is one complete 144 by 144 image. The 8 expressions in **AS-FACE-003** are generated from that image and keep its identity. Those expressions are the 8 cells of one 576 by 288 sheet. A faceset built from layers fails this rule. A faceset has no armour, no helmet, no class headwear and no other gear. Faction identity is trim, banners and buildings, not the face. Greying and balding appear only when the preset is an elder preset. Face-layer slot ids stay reserved (**AS-ID-001**). The retired kind tokens are `BG`, `FRAME`, `BODY`, `FEATURES`, `HAIR`, `GEAR` and `OVERLAY`. The live kind token is `PRESET`.

**AS-FACE-003.** The 4 by 2 sheet is exactly these expressions, index order: 0 neutral, 1 happy, 2 angry, 3 sad, 4 surprised, 5 hurt, 6 determined, 7 afraid. Neutral is the complete source image. The other seven cells are generated from it.

**AS-FACE-004.** Anchors on the 144 px cell, human baseline (other races keep the ids and may store new coordinates). They are landmarks on the complete image:

| Anchor | x, y |
|---|---|
| `crown` | 72, 36 |
| `eyeLine` | 72, 62 |
| `chin` | 72, 86 |
| `collarLine` | 72, 108 |
| `neckBase` | 72, 120 |

`collarLine` y = 108 is the landmark where the bust meets the painted background. The race background is already in the image. Faction trim is not a faceset layer. The stone arch on today's `face_gen_*` portraits is old art, not a layer of this faceset.

### 2.5 Biomes

**AS-BIOME-001.** Six biomes times five depth bands is 30 sets. Pairwise transitions are the 15 ids `VOLCANIC-WET`, `VOLCANIC-ARID`, `VOLCANIC-TEMPERATE`, `VOLCANIC-COLD`, `VOLCANIC-WILD`, `WET-ARID`, `WET-TEMPERATE`, `WET-COLD`, `WET-WILD`, `ARID-TEMPERATE`, `ARID-COLD`, `ARID-WILD`, `TEMPERATE-COLD`, `TEMPERATE-WILD`, `COLD-WILD`. The earlier biome in the DEC-030 list comes first.

**AS-BIOME-002.** Each of the 30 sets, and each transition, has: ground tiles, cliffs (RMMZ-style tiles, **AS-DEPTH-001**), multi-layer ramps (one 5 ft layer, heights in 12 px quarters; a half-step slope is 2 quarters, 24 px), water, vegetation, props, four season frames, and a colour ramp id. Terrain rendering is the 48 px dual-grid Wang path in **AS-TERR-001**.

**AS-BIOME-003.** `TEMPERATE`, `WET`, `ARID` and `VOLCANIC` keep the physical identities in `DEUS_BIOME_IDENTITY_STANDARD.md` (there TEMP, WET, ARID, VOLC). `COLD` and `WILD` are required ids. What they look like is open (Appendix B). `HIGH` / Highland is not a sixth biome. Existing `HIGH_*` ramps stay in the registry until an Owner maps them.

**AS-BIOME-004.** Seasons are four named states: spring, summer, autumn, winter. They are not a runtime colour LUT and not a ColorMatrix. Weather snow (**AS-ANIM-001**) is a drawn overlay. It does not turn `COLD` into a snow biome, and it does not delete the weather. Variety pieces use the palette-swap frames in **AS-VAR-002** (PM decision, Owner may amend). The four names stay.

### 2.6 Buildings

**AS-BLDG-004.** Function, grammar and style are three layers (`DEUS_FACTION_ARCHITECTURE_STANDARD.md` §2). The sim sees the functional contract. The grammar is the layout (compact rectangle, L, longhouse, terrace, stilted pavilion). The style is the art kit. Universal classes: `dwelling_small`, `dwelling_medium`, `communal_hall`, `workshop_general`, `workshop_specialized`, `storehouse`, `shrine`, `watchtower`, `wall_gate`, `farm_outbuilding`, `stockpile_border`, `quarry_mine_support`.

**AS-BLDG-001.** The piece list is the same for every style: foundation, wall, wall-top, roof-edge, roof-fill, door, window, floor, pillar, connector, furniture, workstation. Each structural piece has states `intact`, `ruined` and `charred`. Construction is the same pieces shown as foundation, then walls, then roof, then finished openings and floors. It is not a second illustration style. Side-wall, side-roof and corner-joint pieces are not on this list. A tall object is one sprite and is not split into stacked pieces (**AS-PROJ-001**).

**AS-BLDG-002.** Style profiles, visual rules quoted from that standard and not extended: `human_frontier`, `dwarf_stonehold`, `elf_glade`, `halfling_homestead`, `dragonborn_citadel`, `goblin_salvage`.

**AS-BLDG-003.** Gaps, listed and not filled:

| | Has a style profile | Has a `cultures` record |
|---|---|---|
| human, elf, dwarf | yes | yes (Settlers, Grove-keepers, Stone-holders) |
| halfling, dragonborn | yes | no |
| gnome | no | yes (Tinkers) |
| half-elf, half-orc, tiefling | no | no |
| goblin | yes (`goblin_salvage`) | yes (Scavengers). Not one of the nine races |
| orc, automaton | no | yes (War-bands, Foundry-minds). Not races |

### 2.7 Items and icons

**AS-ITEM-001.** Items are race-neutral SRD items. There is one Plate Armor, one item id, one stat block. There is no Elven Plate Armor, no Dwarven Longsword, and no race token inside the item id. This covers armour, weapons and shields. Armour weights keep race art variants. Class outfit ids, when they remain, are icon-only. They are not required sprite variants.

**AS-ITEM-002.** The layer key is `<itemId>__<race>`, for example `outfit_armor_heavy__elf` and `armor_plate__dwarf`. Lookup order: the race key, then `<itemId>__human`, then nothing. A missing variant is not tinted and is not replaced with another race's art. The runtime file is `$UF_Layer_<itemId>__<race>.png`. For weapons, tools and accessories the race key selects the ramp and the decal (**AS-GEAR-001**), not a second silhouette. Armour weights stay custom drawings. A class outfit id has no required race art variant.

Weapon presentation still uses the crosswalk's 17 families (`BLADE_ONE_HAND` through `UNARMED`). The closed SRD weapon list counted in the presentation data is 37. Armour plus shield is 13: padded, leather, studded leather, hide, chain shirt, scale mail, breastplate, half plate, ring mail, chain mail, splint, plate, shield. The material heading says 18 and the list names 20 (`IRON`, `STEEL`, `BRONZE`, `COPPER`, `SILVER`, `GOLD`, `ADAMANTINE`, `MITHRAL`, `WOOD_LIGHT`, `WOOD_DARK`, `LEATHER`, `HIDE`, `BONE`, `HORN`, `LINEN`, `WOOL`, `SILK`, `STONE`, `GLASS`, `CRYSTAL`). Icon slots cover the 20 names. The count mismatch is in Appendix A.

**AS-ICON-001.** One icon grid. Cell 32 by 32. 16 columns. Sheet width 512. Index = row × 16 + column. This is the RMMZ `IconSet.png` grid. There is no second size.

**AS-ICON-004.** Icons use the same top-left light, the same 1 px selout, and palette ramps. Not a private palette.

**AS-ICON-002.** One icon each for every SRD weapon, armour, shield, material, tool, the eight spell schools, the 15 conditions, status marks (bleeding, starvation, dehydration, exhaustion, hypothermia, burning, poisoned), every resource kind in **AS-NODE-001**, and every job id. Job ids already named on culture priorities: build, chop, craft, gather, hunt, mine, pick, quarry. A new job id gets `icon:job:<id>` by the same rule.

**AS-ICON-003.** Rarity and quality are a border or a corner mark drawn on top of the icon. They are not a redraw of the icon and they are not a suffix on the icon id.

### 2.8 Effects and spells

**AS-FX-001.** A spell is four parts, never its own animation. Owner ruling 12:39 CT.

1. Cast pose: `one-hand`, `two-hand`, `focus-raise`, or `channel`, plus a school-coloured hand glow drawn from `RAMP_SCHOOL_<SCHOOL>`.
2. One delivery shape.
3. One impact for the SRD damage type, or none when the spell deals no damage.
4. A sim effect, plus an aura when the spell concentrates, buffs, curses or wards.

**AS-FX-002.** Delivery shapes, one animation each, on the 48 px grid. `directions: 4` uses S, W, E, N. `directions: 1` is a single row stamped on the cell. Clock is **AS-ANIM-001**.

| Shape | Frames | Cell | Directions |
|---|---|---|---|
| projectile | 3 | 48×48 | 4 |
| beam | 4 | 48×48 | 4 |
| cone | 4 | 96×96 | 4 |
| line | 4 | 48×48 | 4 |
| sphere | 4 | 48×48 | 1 |
| cylinder | 4 | 48×48 | 1 |
| self-aura | 4 | 48×48 | 4 |
| touch | 3 | 48×48 | 1 |
| instant-at-target | 4 | 48×48 | 1 |

A sphere, cube or cylinder is the 48 px burst stamped on every affected cell. It is not one sprite scaled up to the spell's radius. `travel` may be `none`, `projectile` or `beam` when the area is preceded by a standard travel cel (Fireball's streak is `travel: projectile` and `deliveryShape: sphere`). Crosswalk delivery names fold in as aliases: `PROJECTILE` and `MULTI_PROJECTILE` → projectile; `RAY` → beam; `LINE` and `WALL` → line (the wall that persists is the summon/entity or the sim, not a second animation); `CONE` → cone; `GROUND_POINT` and `CUBE` → sphere; `CYLINDER` → cylinder; `AURA` and `SELF` → self-aura; `TOUCH` → touch; `REMOTE_TARGET` → instant-at-target. `SUMMON` is instant-at-target plus a summon slot (**AS-SUMMON-001**).

Cast-profile aliases: `CAST_QUICK`, `CAST_STANDARD` and `CAST_PROJECT` choose `one-hand` or `two-hand` per spell; `CAST_RAISE` → `focus-raise`; `CAST_CHANNEL` → `channel`; `CAST_TOUCH` is the touch delivery with a one-hand pose. The crosswalk's seventh name `CAST_RELEASE` is a keyframe, not a pose.

**AS-FX-003.** Impact is 4 frames of 48 by 48, one per damage type, ramp `RAMP_DMG_<TYPE>`: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder. An unknown type is rejected. Healing is not a fourteenth type. Cure Wounds uses the touch delivery and `healRamp` `RAMP_DMG_RADIANT`.

**AS-FX-004.** `simEffect.kind` is one of: `none`, `fire-tiles-spread`, `cold-freezes`, `force-damages-structures`, `thunder-damages-structures`, `sphere-cross-z`, `ignite-unattended`, `heal`, `summon`, `transform`, `utility-none`. `aura` is `none`, `concentration`, `buff`, `curse` or `ward` (a 4-frame loop, 48 px, plus a 32 px icon). `customPiece` is null, or `{id, note}` later. The six worked rows (Fire Bolt, Fireball, Cone of Cold, Lightning Bolt, Shield, Cure Wounds) live in the schema `examples`. They are not the 319-row table.

**AS-FX-005.** Rows MUST validate against `UF_SpellVisualTable.schema.json`, draft 2020-12. The schema id is `deus-spell-visual/1.0.0`.

**AS-FX-006.** An effect whose cells lie on another Z is drawn in that layer, at 1:1, with the same frames. Looking down through layers shows effects, HP bars, status and spell overlays on every visible lower layer (DEC-011 amendment, 11:31 CT). Nothing is blurred, tinted or scaled because it is lower.

**AS-FX-007.** World effects use the animation table in **AS-ANIM-001**: projectile, impact, fire, water, weather. Frame counts are those rows. Damage-type colour is the impact ramp, not a tint.

**AS-UI-001.** Balloons (**AS-HUM-011**). Selection rings are four drawn sprites, not tints: friendly circle, neutral diamond, hostile spiked, selected with corner pips. The selected ring is a 2-frame drawn loop. HP bars are 48 by 4 px, five drawn fill frames (empty, quarter, half, three-quarter, full), anchored above `HEAD_TOP`. Window skins are **AS-UI-004**. The six building profiles keep their banners (**AS-MAP-001**). The information architecture does not change.

**AS-UI-002.** A unit selected on a lower layer gets the same ring, drawn on that layer, at 1:1.

### 2.9 Summoned and created entities

**AS-SUMMON-001.** Every SRD 5.1 spell that conjures, summons, animates or creates a creature or a field entity has a row in `summons`. Derivation, applied to `game/data/srd51/spells.json` entries with `kind === "spell"` (319 spells; the 8 `spell-list` rows are not spells):

- Include when `name` starts with `Conjure `, `Animate ` or `Wall of `.
- Include when `name` is in the named list: Create Undead, Find Familiar, Find Steed, Mage Hand, Spiritual Weapon, Phantom Steed, Arcane Hand, Unseen Servant, Guardian of Faith, Faithful Hound, Simulacrum, Flaming Sphere, Floating Disk, Forcecage, Planar Ally, Spirit Guardians.
- Include when `data.description` matches `you conjure` or `you summon`.
- Then exclude, because the text itself names something else: Gate ("You conjure a portal"), Magnificent Mansion ("You conjure an extradimensional dwelling"), Web ("You conjure a mass of thick, sticky webbing" filling a cube).

Fields read: `name`, `data.description`, `data.atHigherLevels`. Creature ids come from `game/data/srd51/creatures.json` by exact name. The result is **29 spells**. Category spells (Conjure Animals, and the other Conjure and Planar Ally rows) do not name one stat block. Their slot is `entity:spell:<id>` and the sim picks a stat block of the named category at cast. The sprite is then that creature's normal sprite.

Stat-block refs stored on the rows: Animate Dead → skeleton, zombie; Create Undead → ghoul, and at higher slots ghast, wight, mummy (the 9th-level sentence in the file); Find Familiar → bat, cat, crab, frog, hawk, lizard, octopus, owl, poisonous snake, quipper, rat, raven, sea horse, spider, weasel (the text's "frog (toad)" and "fish (quipper)"); Find Steed → warhorse, pony, camel, elk, mastiff; Conjure Elemental examples → air, earth, fire and water elemental.

Spell-defined, no stat block: Animate Objects, Arcane Hand (text: Large), Faithful Hound, Flaming Sphere (text: 5-foot diameter), Floating Disk (text: 3-foot disk), Forcecage, Guardian of Faith (text: Large), Mage Hand, Phantom Steed (text: Large), Simulacrum (copies the source creature), Spirit Guardians, Spiritual Weapon, Unseen Servant, and the five walls (fire, force, ice, stone, thorns).

Reviewed and not included, with the text reason: Antimagic Field only says summoned creatures disappear; Instant Summons retrieves a marked object; Planar Binding binds a creature already present; Giant Insect says "You transform" existing vermin; Polymorph and True Polymorph transform; Clone grows an inert duplicate in a vessel; Black Tentacles and Insect Plague fill an area; Mirror Image, Mislead and the image spells are illusions; Creation, Fabricate, Create Food and Water produce matter, not a field token.

**AS-SUMMON-002.** Every summon row has `fx:summon-in` (4 frames), `fx:summon-dismiss` (4 frames) and `ui:controller-marker`. Creatures and directional entities use four directions. Walls, the disk, the sphere and the cage do not. A summoned creature otherwise follows §2.1 or §2.2 for its SRD size. Invisible entities (Faithful Hound for non-casters, Unseen Servant, the force wall) use the Invisible contour rule or the force ramp. They do not use alpha. Wall of Force is drawn as opaque `RAMP_DMG_FORCE` panels.

### 2.10 Animation

**AS-ANIM-001.** If it can move, it is animated. A static asset MUST name an exception from this closed list: `ground-fill`, `icon`, `decal-rest`, `remains-rest`, `readable-prop`, `map-marker`. The shared clock `FRAME_CLOCK_MS` is 150 (the `DEUS_Anim` default). `clockMul` is an integer multiplier of that clock. `clockMul` 0 means states, not a loop.

| Class | Frames | Clock |
|---|---|---|
| water | 3 | 300 ms |
| lava, door, workstation | 3 | 150 ms |
| fire, smoke, torch, forge, weather-rain, weather-snow, tree-fall, rock-collapse, construction, summon-in, summon-dismiss | 4 | 150 ms |
| vegetation-sway, weather-fog | 3 or 4 | 300 ms |
| weather-lightning | 3 | 150 ms |
| season | 4 states | not a loop |
| idle-breath | 2 | 600 ms |
| ui-pulse | 2 | 300 ms |

Fog is a drawn dither with binary alpha. UI pulse is two drawn frames, not a tint. Idle breathing covers the unit. Blinking uses face expression frames, not a shader. Ambient birds and critters use the critter rows. Resource harvest uses the node harvest animation.

### 2.11 Resources, remains, carry, vehicles

**AS-NODE-001.** Resource kinds: tree, ore, stone, clay, herb, crop, water, animal-spawn. Each kind has a variant for each of the six biomes. States, in order: `full`, `partly-harvested`, `depleted`, `regrowing`. Each node has a harvest animation and a dropped-item sprite.

**AS-REMAIN-001.** Corpses for each creature and each race, a skeleton, blood decals, scorch decals, rubble, debris. Tiles and buildings have `burned`, `frozen` and `flooded` variants. The resting corpse is the last death frame held under exception `remains-rest`. The death row itself is animated. A deposited blood pool or scorch uses `decal-rest` after its spray finishes.

**AS-HAUL-001.** Carry is drawn (row `carry`, family F07). Carts exist. A stockpile shows fill `empty`, `quarter`, `half`, `three-quarter`, `full` as drawn frames. This replaces the old "carry is not drawn" behaviour. See Appendix A.

**AS-VEH-001.** Vehicle kinds: cart, wagon, boat, siege. Each of the nine races has a riding pose in four directions.

### 2.12 Night, maps, signs, accessibility, style bible

**AS-LIGHT-001.** Night is a precomputed ramp `RAMP_NIGHT` plus drawn light sources, drawn torch glow, drawn window glow, and a lit variant of the building kit. Those drawn frames exist whether or not the optional hook is on. The hook `dynamicLight` defaults to `mode: off` and `blur: false`. The only modes are `off`, `per-pixel` and `per-tile`. Blur stays off. This hook is the one tint the asset standard permits, and it is not a substitute for the drawn lights. DEC-011 still forbids blur, bloom, ColorMatrix and alpha fades. The conflict is recorded in Appendix A.

**AS-MAP-001.** The world map is the DEC-030 3 by 3 grid of 256 by 256 tile areas, drawn as a 768 by 768 overview at 1 px per tile. A minimap of one area is 256 by 256. Markers are 16 by 16. Faction flags are 48 by 48 with 3 sway frames. Banners are 48 by 96, one per style profile: `banner:human_frontier`, `banner:dwarf_stonehold`, `banner:elf_glade`, `banner:halfling_homestead`, `banner:dragonborn_citadel`, `banner:goblin_salvage`. This is a spec. No map art is produced here.

**AS-PROP-001.** Readable props: `shop-sign`, `gravestone`, `statue`, `notice-board`. They use the static exception `readable-prop` so the lettering does not animate.

**AS-UI-003.** HP, team and status each have a shape and an icon, not colour alone (friendly circle, neutral diamond, hostile spiked, plus the icon channel). The smallest UI glyph is 16 px. Icons stay 32 px. Ramps: `RAMP_UI_HP`, `RAMP_UI_TEAM_FRIENDLY`, `RAMP_UI_TEAM_NEUTRAL`, `RAMP_UI_TEAM_HOSTILE`, `RAMP_UI_STATUS`.

**Style bible spec (no image).** One reference sheet, if it is ever drawn under a later leaf, shows: the 48 px grid, the top-left light vector, a 1 px selout sample, a 42 px human inside a 48 px cell, the letters S W E N, six biome ramp-id labels, one 32 px icon cell, and the contact shadow at y = 47. This lane does not draw it.

### 2.13 UI skin, faith, farm, food, underground, traps, lore (A7)

**AS-UI-004.** Owner 12:57 CT. The player picks one window skin. The minimum set is 11: signature `deus`, variant `deus-dark`, and `race-<race>` for each of the nine races, using that race's ramp and motif from **AS-HUM-015**. Each skin is one 192 by 192 sheet in the RMMZ `Window.png` regions: background `[0,0,96,96]`, pattern `[0,96,96,96]`, frame `[96,0,96,96]` (9-slice, 24 px corners), cursor `[96,96,48,48]` (9-slice, 4 px corners), pause `[144,96,48,48]`, text colours `[96,144,96,48]`. Pixels are opaque. Buttons are drawn `normal`, `hover` and `pressed`. Cursors are drawn `default`, `hover` and `disabled`. Title and loading screens belong to the Deus skin. Fonts are bitmap: `font:deus` and `font:deus-dark`. The smallest glyph stays 16 px (**AS-UI-003**).

**AS-REL-001.** Required pieces: `holy-symbol`, `altar`, `shrine`, `aura`, `spellbook`, `scroll`. A deity row, when one exists, has a `holySymbolId`. The deity list is empty. No DEUS pantheon is on file, and this standard does not copy the SRD historical pantheons or invent gods (Appendix B). The aura is drawn frames on `RAMP_MAGIC_AURA`, distinct from a mundane icon. Rarity on the icon stays the overlay in **AS-ICON-003**. Spellbook and scroll are race-neutral item ids (**AS-ITEM-001**) with an icon and a portrait (**AS-PORT-001**).

**AS-FARM-001.** A crop has stages `sown`, `growing`, `mature`, `harvested`. Livestock has `young` and `adult`. Pens exist. A tamed variant exists (**AS-TAME-001**).

**AS-FOOD-001.** Food has states `raw` and `cooked`, classes `meal` and `ingredient`, displays `table` and `stockpile`, and an icon.

**AS-DUNG-001.** The underground kit is `cave-wall`, `mine-support`, `tunnel`, `underground-water`, `crystal`, `ruin`. Counts per depth band are **AS-VAR-001**.

**AS-TRAP-001.** Required hazards: `pit`, `spikes`, `pressure-plate`, `door-locked`, `door-broken`, `poison-gas`, `web`, `quicksand`.

**AS-LORE-001.** Required history visuals: `historical-portrait`, `era-ruin`, `artifact`, `history-log`.

**AS-SCENE-001.** Event scenes `founding`, `coronation`, `disaster` and `war` are an optional class. `required` is false. This is a spec. No scene art is produced here.

**AS-ZONE-001.** Player designations are drawn overlays: `dig`, `build`, `stockpile`, `route`, `blueprint-ghost`. The blueprint is an opaque hatch. It is not a translucent ghost.

**AS-MKTG-001.** Game icon, store banners and logo are a later note. `required` is false. There is no marketing required set in this standard.

### 2.14 Capture, variety, genes, portraits (A8)

**AS-TAME-001.** Owner 12:59 CT. Art covers pets, mounts, livestock, work animals, prisoners and recruits: a tamed variant, a captured or bound pose, a cage and a pen. `collar`, `saddle` and `harness` may be drawn as visual markers. They have no slot and no stats. Whether the markers are wanted at all, after the 13:01 correction, is Appendix B.

**AS-TAME-002.** Owner 13:01 CT. A tamed creature fights with its SRD 5.1 stat block and its natural attacks and defences. There is no creature armour slot, no equipment slot, no barding and no crafted creature gear. The checker flags a creature equipment-slot list, barding, or marker stats.

**AS-VAR-001.** PM decision 13:01 CT, Owner may amend. These are floors. More pieces may be added. For each of the six biomes: trees 4 species by 3 variants (`young`, `mature`, `old`) = 12, each with harvest states and the season treatment in **AS-VAR-002**; bushes 4, of which at least 1 is harvestable; ground scatter 6; rocks 3 sizes by 2 variants = 6; ore at least 2; water-edge 3; landmarks 2. Underground bands for this floor are `DEEP` and `CAVERN` (the bands whose Z is entirely below 0). Each of those has at least 4 cave formations, 2 fungi or crystals, and 1 ore node. Whether `LOWLAND`'s negative layers count is Appendix B.

**AS-VAR-002.** PM decision 13:01 CT, Owner may amend. Season states on those pieces are palette-swap frames of the base drawing, on `RAMP_SEASON_SPRING`, `RAMP_SEASON_SUMMER`, `RAMP_SEASON_AUTUMN` and `RAMP_SEASON_WINTER`. That swap is precomputed ramp data. It is not a runtime ColorMatrix. A horizontal flip is an offline bake, and only for a piece whose shading is light-neutral. A piece drawn with the top-left light is not flipped.

**AS-GENE-001.** Owner 15:54 CT, as amended by item 42. Children do not visibly inherit a parent's face or hair. The part library is retired. Each race has a fixed preset pool: 8 male and 8 female adult looks, 2 elder looks per sex and 2 child looks per sex. That is 24 presets per race and 216 for the nine races. Each preset is one complete head, hair and face for the charset, and one complete 144 by 144 portrait. The 8 expressions in **AS-FACE-003** are generated from that portrait and keep its identity. The player picks a preset and one of three skin and hair colour variants at character creation. Charset variants are in-game master-palette swaps and add no charset sheet. Portrait variants are recorded per preset on `colourVariantMethod`. The value is `palette-swap` when that preset's skin and hair ramps map onto the master plus `RAMP_PORTRAIT_SKIN_HAIR`. The value is `separate-generation` otherwise. Factions are trim, banners and building styles. Sim genetics may remain for stats only. Catalogue category `PRESET`. Slot example `FA.PRESET.HUMAN.M.01.NEUTRAL.C0`. Retired part-library slot ids and retired face-layer slot ids stay reserved.

**AS-PORT-001.** Owner 13:03 CT. Every non-face entity (item, creature, resource, building, workstation, spell) has a 32 by 32 icon and a 144 by 144 portrait for the inspect, tooltip and crafting view. The portrait uses a per-category background, the same palette and selout as the icon, and the rarity overlay from **AS-ICON-003**. A race-styled item uses that race's background. A race-neutral item has one portrait per race art variant. The file name is in **AS-STYLE-001**. A catalogue row that does not yet carry the fields is `unknown`. A row that has one of the two and not the other fails. A character faceset is not this portrait. The character faceset is **AS-FACE-002** and the portrait colour class in **AS-LOCK-001**.

### 2.15 Head layers, elders, gear, mirrors, poses, biome files (A9)

**AS-HEAD-001.** Owner 13:14 CT, as amended by item 41. A preset head is one complete look on a grid of 12 frames: directions S, W, E, N, and head-state indices 0, 1 and 2, one frame each, each with an anchor. The gestures those indices draw are not named (Appendix B). Every body-template frame stores `headAnchor` `[x, y]` and `headState` in `0..2`. Long hair on a preset may add frames on `death` and `dodge` only. Placement is the anchor. There is no runtime transform and no combinatorial hair, beard or balding library.

**AS-ELDER-001.** Only the stooped elder body is a new sheet (**AS-HUM-019**). There are 18 elder bodies: 9 races by male and female. Dwarf elder male and dwarf elder female are 36 px, the same height as the dwarf adult templates. Offsets apply to armour, helmet and the adult preset head of the same sex. Each body frame has a torso offset and a head offset, in pixels. The checker flags an elder-specific armour, helmet or preset-head sheet, and any frame index with no offset. The numbers shipped here are a baseline stoop (`torso [0, 2]`, `head [0, 4]`) so the table is complete; authored frames replace the pair. Class does not multiply elder bodies. Elder looks in the preset pool are 2 per sex per race, and those presets already include greying or balding.

**AS-GEAR-001.** An accessory, a weapon or a tool has one silhouette. Race selects `RAMP_RACE_<RACE>` and a motif decal whose anchor is stored per frame and per angle. A second silhouette for the same item id fails. The 27 armour icon rows stay custom per race (`pixels: custom-per-race` on `outfitMatrix`). Race garb and class kits are not the character map sprite (**AS-CHMAP-001**). Class outfit ids are not a custom sprite set.

**AS-MIRROR-001.** A layer may use this bake only when it is flagged `symmetric` and its shading is light-neutral. The mirror is an offline bake from W to E. The E frame is then stored. The runtime does not flip. A mirrored frame on any other layer fails this rule. **AS-PM-001** is the later Owner rule for west-from-east on bodies, gear layers and creatures. Weapons and shields stay on the hand anchors under that rule. Furniture uses **AS-FURN-001**.

**AS-POSE-001.** Rows, four directions each, also on the pose grid at 4 frames: `prone`, `unconscious`, `sleep`, `sit`, `sneak`, `climb`. Mapping: SRD Prone uses row `prone`; SRD Unconscious uses row `unconscious`; `sleep`, `sit`, `sneak` and `climb` are activity rows. `sneak` and `climb` were already action rows; they are now on the pose grid too, so garb layers follow them.

**AS-BIOME-005.** The Owner's biome set is the six ids in **AS-BIOME-001**. The checker reads, and does not write, `game/data/DEUS_BiomeRegistry.json`, `docs/art/DEUS_BiomeRegistry.json`, and `art/catalogue/catalogue.json` when that file has `biomes.canonical`. A `canonicalBiomes` list other than the six fails. Today's files are the five-id set in Appendix A. The data fix is another lane.

### 2.16 Frame squares, slot templates, pipeline, field templates, generation log (A9)

**AS-SIZE-001.** Owner 13:16–13:20 CT. Frame size is size class plus body shape, in 48 px squares:

| Size | Shape | Squares | Pixels | Frame class |
|---|---|---|---|---|
| Tiny, Small, Medium | square | 1 by 1 | 48 by 48 | `TINY`, `SMALL`, `MEDIUM` |
| Large | tall | 1 by 2 | 48 by 96 | `LARGE_TALL` |
| Large | long | 2 by 1 | 96 by 48 | `LARGE_LONG` |
| Huge | square | 3 by 3 | 144 by 144 | `HUGE` |
| Huge | tall | 2 by 3 | 96 by 144 | `HUGE_TALL` |
| Huge | long | 3 by 2 | 144 by 96 | `HUGE_LONG` |
| Gargantuan | square | 4 by 4 | 192 by 192 | `GARGANTUAN` |
| Gargantuan | tall | 3 by 4 | 144 by 192 | `GARGANTUAN_TALL` |
| Gargantuan | long | 4 by 3 | 192 by 144 | `GARGANTUAN_LONG` |

One Gargantuan square action row is 4 frames by 4 directions of 4-square cells: 16 by 16 squares, 768 by 768. That is the largest sheet.

**AS-SLOT-001.** Source templates, rows = directions, columns = frames, one anchor in every cell:

| Template | Pixels | Grid |
|---|---|---|
| `charset` | 576 by 384 | 12 by 8 cells of 48, anchor `[24, 45]` |
| `faces` | 576 by 288 | 4 by 2 cells of 144, anchors in **AS-FACE-004** |
| `tileset-b-e` | 768 by 768 | 16 by 16 cells of 48, anchor `[24, 24]` |
| `action-row` | 4 frames by 4 directions, times the footprint | a 1 by 1 footprint is 192 by 192; a 4 by 4 footprint is 768 by 768 |

Paper-doll layers do not use the 192 by 192 strip. Owner 13:30 CT stacks the 30 action rows into the one sheet in **AS-SRC-001**. Large and larger creature rows stay strips so no source side exceeds 2048 px.

The runtime packs 2048 by 2048 atlases. The cell grid is 42 by 42 squares of 48 px (2016 px). The remaining 32 px is the padding budget, 1 or 2 px, and origins stay on the 48 px grid. A 4096 atlas is allowed for terrain only after a benchmark. The packer writes a lookup (`atlasId`, `x`, `y`, `w`, `h`, `catalogueId`, `sheetId`, `col`, `row`). That file is not created in this lane.

**AS-PIPE-001.** Owner 13:16–13:21 CT. The manifest records `catalogueId`, grid squares, frame count, anchor, `templateId`, palette ramp and layer role. The slot map records `sheetId`, column, row, `catalogueId`, facing, frame index, anchor and pixel size. Output must already be the final pixel size, on the grid, in the palette, on the anchor. Off-size, off-palette or off-anchor output is rejected and generated again. It is not resized. Cropping removes transparent margins only. `MISSING` is derived from an empty slot. One generation may target a whole strip; each slot is validated on its own, still at exact size. A whole-pixel shift onto the slot anchor, and a trim of transparent margins, are not scaling (**AS-ANCHOR-001**). The tools are another lane. This lane generates no art.

**AS-PROMPT-001.** Owner 13:21 CT. `promptSpecTemplates` has one field template for each of: `humanoid-layer`, `face-layer`, `creature`, `terrain-tile`, `building-piece`, `item-icon`, `portrait`, `effect`, `ui`. Each template lists the same fields and the place the value comes from. There is no prose prompt. Nothing in this block is sent to a generator. The category id `face-layer` is the historical field template for one complete character portrait. It does not authorise a faceset layer stack.

| Field | Source |
|---|---|
| `pixelSize`, `facing`, `poseFrameIndex`, `anchor`, `layerRole`, `catalogueId` | slot map |
| `frameGrid` | slot template |
| `paletteRampHex` | palette ramp (hex resolved from the ramp id when a tool runs) |
| `outlineRules` | **AS-GLOBAL-006** |
| `shadingRules`, `lightDirection` | **AS-GLOBAL-005** |
| `referenceImages` | golden reference library |
| `negativeConstraints` | rejection notes |
| `slotId` | slot map |

**AS-GEN-001.** Owner 13:22 CT and 13:24 CT. A generation log row has `slotId`, `promptSpecId`, `promptTemplateVersion`, `generator`, `generatorVersion`, `model`, `seed`, `settings`, `references`, `outcome` (`pass` or `fail`) and `reasons`. Reason codes are `size`, `palette`, `anchor`, `outline`, `style`. A fail with no reason is a violation.

**AS-GEN-002.** Yield is tracked over time per generator, per category and per template: first-pass acceptance, usable slots per generation, regenerations per slot, yield per cost, cost per usable slot, and time per usable slot.

**AS-GEN-003.** A prompt-template version is promoted only when an A/B comparison beats the current version's yield. Candidates stay candidates until then. Adapters for each generator are built from the one shared field template, not from a second spec.

**AS-GEN-004.** Owner 15:44 CT. PixelLab is the primary generator for every category. Retro Diffusion is standby and is not assigned to a category. Nano Banana Pro is for concepts only and is not a production generator. The multi-generator bake-off is off. Records still have `id` and `version`. The golden checks stay palette, outline, anchor and style, on the fixed golden test set. A style LoRA or fine-tune is `optional-later` and needs an Owner decision after approved art exists. It is not a required set. One generator per layered set is **AS-GEN-005**. No art is generated here.

### 2.17 Source sheets, sex, slot ids, anchors (A9b)

Owner 13:30–13:37 CT, 13:50 CT, 13:56 CT and 14:09–14:10 CT. No art is generated here. No image is written.

**AS-SRC-001.** A paper-doll layer source sheet is one sheet per layer design. The committed example holds all 30 action rows in `humanoidRows`. Each row is 4 directions by 4 frame cells, so the sheet is 16 by 30 squares of 48 px: 768 by 1440. Direction columns run D, L, R, U, which are facings S, W, E, N. Frames in a row are F0, F1, F2, F3. RMMZ-native sheets keep their RMMZ sizes: charset 576 by 384, faces 576 by 288, SV battler 576 by 384, tileset B–E 768 by 768, balloon 384 by 720, window 192 by 192. No source sheet side is over 2048 px. A side of 2048 is still allowed. Large, Huge and Gargantuan creature rows stay strips (**AS-SLOT-001**). A stacked sheet of those sizes fails. This replaces the 192 by 192 per-row strip for paper-doll layers only. The A9c frame budgets and the visible-gear sheet counts are **AS-LOCK-001** and **AS-VIS-001**. They recompute the estimate. They do not resize this example. Walk authors three frames (**AS-LOCK-001**). The fourth walk cell on this example stays reserved.

**AS-REPO-001.** Blank template geometry and the slot map are committed in this file. The example sheet is `paperdoll:elf:f:hair:07`, 480 cells, and its pixels are not in the repo. Approved art is Git LFS under `art/approved/**`. Raw generations, rejects and logs stay out (`art/raw/**`, `art/rejects/**`, `art/logs/**`). Putting those patterns into Git is a follow-up, because those files are outside this lane. This lane writes no PNG.

**AS-PREVIEW-001.** Every generated asset is shown in an animated in-game scene at 1 source pixel to 1 screen pixel, sent to the Owner in chat, and merged only after yea. Nay sends it back to be generated again. The preview uses the drawn frames at 1:1.

**AS-GEN-005.** One generator per category and per layered set. That generator is PixelLab. A paper-doll set and a creature family each carry that one id. A set whose members disagree fails. Retro Diffusion and Nano Banana Pro are not mixed into a layered set.

**AS-SEX-001.** Each of the nine races has `body:<race>:adult-male`, `body:<race>:adult-female`, `body:<race>:elder-male`, `body:<race>:elder-female` and `body:<race>:child`. The child body is its own sheet, drawn at the child frame class, and it is not split by sex. Dwarf `adult-male`, `adult-female`, `elder-male` and `elder-female` are 36 px tall. The head preset serves the portrait (**AS-GENE-001**). The character map sprite is the unarmored base for that race and sex (**AS-CHMAP-001**). Children and elders have no map-sprite base yet. Dwarf heights above stay 36 px. The art key `outfitId__race__body` remains the armour icon key.

**AS-SEX-002.** `sexVariant` is `none` or `dimorphic`. A dimorphic creature has a male set and a female set, and each of those has `base`, `tamed` and `saddle`. A `none` creature has no sex set. A creature that is not in the dimorphic list is `none`. The list was checked by exact name against `game/data/srd51/creatures.json` (317 entries). These 16 names are in that file, once each, and each is a beast: Lion, Deer, Elk, Giant Elk, Boar, Giant Boar, Goat, Giant Goat, Draft Horse, Riding Horse, Warhorse, Pony, Elephant, Mammoth, Baboon, Ape. These five are not in that file: Cattle, Sheep, Pig, Chicken, Duck. Pair labels use the Owner's words where that creature is the one named: lion/lioness, stag/doe, boar/sow, stallion/mare, bull/cow, ram/ewe, rooster/hen. The other rows are labelled `male/female`. Wolf is the `none` sample. Saddle here is the visual marker in **AS-TAME-001**. It is not a creature equipment slot (**AS-TAME-002**).

**AS-ID-001.** Every slot id is permanent, unique and human-readable. A retired id stays reserved and is never issued again. The runtime and the atlas packer resolve by that id only. Packed x and y record the rectangle after packing. The committed map includes `CH.HAIR.ELF.F.07.WALK.D.F2` at column 2, row 1 (walk, facing D, frame F2). Each id links to a catalogue id in the six-field shape, a sheet file, a cell, an integer anchor and a provenance record. Provenance holds every attempt (prompt spec, generator, version, seed, validation), the reviewer model, the Owner decision (`pending`, `yea` or `nay`) and the timestamps. A blank cell has an empty attempt list, decision `pending`, and null detected anchors. An accepted cell needs a passing attempt, a yea, and the detected anchors.

| Category | Shape | Example |
|---|---|---|
| Charset layer | `CH.LAYER.RACE.SEX.DESIGN.ROW.DIR.FRAME` | `CH.HAIR.ELF.F.07.WALK.D.F2` |
| Face | `FA.PRESET.RACE.SEX.DESIGN.EXPR.CELL` | `FA.PRESET.HUMAN.M.01.NEUTRAL.C0` |
| Creature | `CR.SPECIES.SEX.VARIANT.ROW.DIR.FRAME` | `CR.LION.F.BASE.WALK.D.F0` |
| Icon | `IC.DOMAIN.NAME.STATE` | `IC.WEAPON.LONGSWORD.DEFAULT` |
| Portrait | `PO.DOMAIN.NAME.VARIANT` | `PO.CREATURE.LION.N` |
| Tile | `TL.BIOME.BAND.KIND.VARIANT.SEASON` | `TL.TEMPERATE.LOWLAND.GROUND.01.SUMMER` |
| Building | `BD.PROFILE.PIECE.STATE.VARIANT` | `BD.DWARF-STONEHOLD.WALL.INTACT.01` |
| Effect | `FX.PHASE.SHAPE.DAMAGE.FRAME` | `FX.IMPACT.SPHERE.FIRE.F0` |
| UI | `UI.SKIN.PART.STATE` | `UI.DEUS.WINDOW.NORMAL` |

Sex tokens are `M`, `F` and `C` (the child body, which is not split by sex). Creature sex `N` is the single design on a `none` creature. Variant tokens are `BASE`, `TAMED` and `SADDLE`. Direction tokens are `D`, `L`, `R` and `U`. Frame tokens on a charset or creature row are `F0` through `F3`. The pattern strings are `slotMap.grammar`. The face grammar still matches the retired kind tokens so those ids can stay reserved. A live face sample uses `PRESET` only. Retired ids stay reserved: `CH.HAIR.ELF.F.06.WALK.D.F0`, `DP.CLIFF.TEMPERATE.FACE`, and the face-layer ids `FA.BG.ELF.F.07.NEUTRAL.C0`, `FA.FRAME.HUMAN.M.01.NEUTRAL.C0`, `FA.BODY.HUMAN.M.01.NEUTRAL.C0`, `FA.HAIR.HUMAN.M.01.NEUTRAL.C0` and `FA.OVERLAY.HUMAN.M.01.NEUTRAL.C0`. The live cliff tile is `DP.CLIFF.TEMPERATE.TILE`. The live face example is `FA.PRESET.HUMAN.M.01.NEUTRAL.C0`.

**AS-ANCHOR-001.** Generators do not supply anchors. After a generation the tool reads the transparent-pixel mask, the silhouette, the foot line and the head outline. It finds the feet at the bottom centre, the head centre, and the main-hand and off-hand points. It shifts the frame by whole pixels until those landmarks sit on that cell's slot-map anchor, and it writes the detected points onto the slot (**AS-ID-001**). Whole-pixel shifts, and trimming transparent margins, are not scaling (**AS-PIPE-001**). A frame that would clip, or that has the wrong proportions, the wrong size, or head drift against the body, is rejected and generated again. A pose reference with the body already placed may be sent. The usual correction is 1 or 2 px. The reference is not required on every call.

**AS-EQUIP-001.** The landmark anchor tool shifts a frame by whole pixels onto the slot anchor (**AS-ANCHOR-001**). Equipment-anchor compositing is retired for character map sprites. Weapons are drawn inside the weapon-group attack clips (**AS-CHMAP-001**). The runtime does not rotate a frame.

### 2.18 Readable fantasy, quarters, and visible gear (A9c)

Owner 14:38 CT through 15:40 CT. No art is generated here. No image is written. A 64 px tile was considered and was not adopted. Terrain stays 48 px, with a 2× integer presentation scale (**AS-RENDER-001**). RMMZ-native sizes elsewhere, including the 64 by 64 SV battler frame and the 144 by 144 face, are unchanged. Notes under each rule are for the future Deus Art manual.

**AS-LOOK-001.** Item 16, as amended by item 38. The art direction is readable high-contrast fantasy at the 48 px scale. Ultima VII stays a feel and readability reference. The view is the RMMZ standard top-down 3/4 view (**AS-PROJ-001**). Proportions are realistic, not chibi. A head is about 1/5 of the body height. That is a proportion rule. It is not a height split (**AS-QTR-001**). The checker requires `headPx / bodyPx` from 0.18 through 0.22 on every race sample. The human sample is body 42 px and head 8 px.

Manual note. Draw readable high-contrast fantasy at the 48 px scale. Ultima VII stays a feel and readability reference. The view is the RMMZ standard top-down 3/4 view. A head is about 1/5 of the body height.

**AS-PROJ-001.** Item 17, as amended by items 38 and 43. The view is the RMMZ standard top-down 3/4 view. Map draw order is by row, then by Z layer. Characters use eight directions and move 8-way through an RMMZ plugin. The diagonal walk step is 3 px per axis per frame. Terrain, walls and caves stay on the square grid with rounded and ragged corners. Creatures, furniture and ground marks stay on the four facings S, W, E and N. Cliff and wall pieces are standard RMMZ-style tiles with the depth cues in **AS-DEPTH-001**. They are not a stack of quarter-height front strips. The building piece list does not add a side-wall piece, a side-roof piece, or a corner-joint piece. A tall object is one sprite. It is not split into stacked pieces. The retired slot id `DP.CLIFF.TEMPERATE.FACE` stays reserved. The live cliff tile is `DP.CLIFF.TEMPERATE.TILE`.

Manual note. The view is the RMMZ standard top-down 3/4 view. Draw the map by row, then by Z layer. Characters use eight directions. The diagonal walk step is 3 px per axis per frame. Terrain, walls and caves stay on the square grid. SRD 5-5-5 applies to spell areas and ranges only. Cliff and wall pieces are RMMZ-style tiles. Side-wall, side-roof and corner-joint pieces are not added. Tall objects are not split.

**AS-VIEW-002.** Owner, 2026-09-29 ("high topdown"). Every PixelLab prompt, for every asset class (terrain tiles, objects, props, creatures), uses the PixelLab view setting **high top-down**. It is the one camera for the whole game; AS-LOOK-001 and AS-PROJ-001 describe that same camera as the engine presents it. Any earlier note that asks for low top-down, or leaves the object view open, is superseded. Recorded in `docs/OWNER_DECISIONS.md` under the DEC-007 amendment of 2026-09-29.

**AS-FURN-001.** Item 18. Furniture and other placeables have four facings, S, W, E, N. A symmetric object may reuse a view only when `symmetric` is true and `reuse` is `flagged`. An unflagged object has four unique views. Catalogue category `PLACEABLE`. Slot grammar `placeable`, for example `PL.TABLE.D`.

Manual note. Furniture and placeables have four facings. A symmetric object may reuse a view only when its symmetric flag is set.

**AS-TERR-001.** Items 19 and 34. Terrain is 48 px PixelLab tiles-pro Wang tiles, rendered by a custom dual-grid tile renderer. That replaces 24 by 24 tiles assembled into an RMMZ A2 autotile. Big features are separate map objects. Each of the six biomes has 3 to 5 ground types, joined in a chain of transition pairs, with 2 or 3 plain variants each. The names `ground-a`, `ground-b` and `ground-c` are structural. What `COLD` and `WILD` look like stays open (Appendix B). Detail decals stay 24 px, on an overlay: pebbles, tufts, cracks and leaves. Wang tiles, decals and the 12, 24 and 48 px item sprites are native 1:1. They are not scaled. The renderer is a follow-on on the depth-demo lane. It is not code in this lane.

Trial findings, recorded and not run here. The item 34 trial asked for skeleton-v3 on bare create-character-v3 bodies, then layer propagation, and for size 42. That path is retired for character map sprites. Characters are whole-sprite PixelLab v3 on a 48 px canvas, at chart heights (**AS-CHMAP-001**). The south walk row of that trial sits 2 px low, and **AS-ANCHOR-001** corrects that row. The game view stays the RMMZ standard top-down 3/4 view. PixelLab is the primary generator (**AS-GEN-004**). Small item world sprites remain an open test (Appendix B).

Catalogue categories `WANG` and `DECAL`. Slot examples `WG.TEMPERATE.GRASS.DIRT.01` and `DC.TEMPERATE.LEAF.01`.

Manual note. Terrain is 48 px tiles-pro Wang on a dual-grid renderer. Each biome has 3 to 5 ground types in a transition chain, with 2 or 3 plain variants. Detail decals stay 24 px.

Trial note. The item 34 trial used skeleton-v3 and create-character-v3 at size 42. Character map sprites no longer use that layer path. The south walk row sits 2 px low. The view stays the RMMZ standard top-down 3/4 view. PixelLab is the primary generator. Small item world sprites remain an open test.

**AS-TRACK-001.** Item 20. Ground marks are boot, bare, paw and hoof prints on snow, mud, sand, blood and wet ground. Each has four directions and three fade steps (the allowed range is 2 or 3). A worn path may become a road. Catalogue category `GROUNDMARK`. Slot example `GM.SNOW.BOOT.D.F0`.

Manual note. Ground marks cover boot, bare, paw and hoof on snow, mud, sand, blood and wet ground, in four directions, with three fade steps. A worn path may become a road.

**AS-GLOW-001.** Item 21. Every light source has a matching animated, pixel-stepped glow on an additive light layer. Colour and radius are stored with the source's glow id. The colour is a master-palette entry. The radius is a positive whole-pixel count. The torch sample uses 192 px, which is the 4-tile bright range in **AS-SCALE-001**. There is no blur. Catalogue category `GLOW`. Slot example `GL.TORCH.F00`.

Manual note. Every light source has a glow id. The glow is pixel-stepped art on the additive light layer, and it stores colour and radius with that id.

**AS-DEPTH-001.** Item 22, as amended by item 38. The Z-layer look uses a depth palette ramp per layer, standard RMMZ-style cliff and wall tiles per biome and material, hard dithered drop shadows, a 1 px ledge rim highlight, ramps, and half-step slopes of 2 quarters (24 px). Those tiles carry the depth cues. They are not quarter-height front strips. Depth-toned overlays may have outlines. Terrain tiles do not. Renderer toggles for the depth demo, recorded with their asset needs, are: whole-pixel parallax, unit height shift on ramps, camera layer easing, dithered cutaways, cross-layer effects, glows lighting lower layers, and weather by exposed layer. Day length and the 1x/2x/3x scale toggle are **AS-SCALE-001** and **AS-RENDER-001**. Renderer code is not in this lane. Catalogue category `DEPTH`. Slot example `DP.CLIFF.TEMPERATE.TILE`. The earlier sample `DP.CLIFF.TEMPERATE.FACE` is retired and stays reserved.

Manual note. Depth uses per-layer ramps, RMMZ-style cliff and wall tiles, hard dithered shadows, a 1 px ledge rim, ramps and a 24 px half-step. Quarter-height front strips are not the cliff or wall class. The depth demo toggles are recorded here. The renderer is another lane.

**AS-WITEM-001.** Item 23, as amended by item 38. Every item has a world sprite in the RMMZ standard top-down 3/4 view beside its 32 px icon and its 144 px portrait. Legal drawn sizes are the 12, 24 and 48 px classes in **AS-PLAY-001**, which is how the 16 to 24 px description is met: the 24 px class is the ordinary small sprite. Items are placed at whole-pixel offsets on tiles, on surfaces and in containers. The world sprite stores an anchor, a footprint and a sim hook. The runtime placer is another lane. Catalogue category `WORLDSPRITE`. Slot example `WS.LONGSWORD.24.D`.

Manual note. Every item has a world sprite in the RMMZ standard top-down 3/4 view beside its icon and its 144 px portrait. Placement stores an anchor, a footprint and the sim hook.

**AS-FEAT-001.** Section F. Seasonal variants cover terrain, vegetation, and buildings or objects where they change, in spring, summer, autumn and winter. Building and object damage uses 4 stages (the allowed wall range is 3 or 4). Character work is the WORK clip on each armor state (**AS-CHMAP-001**). Shared overlays for farming, mining, chopping, building, crafting, carrying, fishing and cooking stay available when one work clip does not match the job. Those overlays are 6 frames in four directions. Catalogue categories `SEASON`, `DAMAGE` and `WORKANIM`. Slot examples `SE.TERRAIN.TEMPERATE.SUMMER.01`, `DM.WALL.WALL.S1` and `WK.FARM.D.F0`.

Manual note. Seasonal variants and building damage stay. Character work is one WORK clip on each armor state. Colony jobs that need a different tool use a shared overlay. That match is Owner-open.

**AS-PLAY-001.** Item 24. Near the player, placed items are drawn in full. Far away, the sim keeps summarized counts and re-places them from a fixed seed. Storage is by chunk and layer. Clutter is cleaned up. Saves are change-only. The stress benchmark is 100,000 placed items. Placement logic uses 6 px cells, 8 per 48 px tile side, and renders on whole pixels. Size classes are 12, 24 and 48 px, drawn true size, with no scaling. Heights stack as whole-pixel offsets. Surfaces use 12 px quarters: a table top is 1 quarter, a shelf is 2 or 3. Item draw order, inside the row-then-layer map order, is footprint bottom line, then height offset. SRD pound weights set surface load and spill or collapse, and they feed the mass ledger. Small items get a 1 or 2 px hard drop shadow and receive nearby glows. Units still move tile to tile. Pathfinding treats 12 px and 24 px items as passable and 48 px items as blocking. Catalogue category `PLACEMENT`, on the world-sprite grammar.

Manual note. Near the player, items are drawn in full. Far away, the sim keeps counts and replaces them from a fixed seed. Legal drawn sizes are 12, 24 and 48 px, with no scaling.

**AS-CONT-001.** Item 25. A double-click opens a movable window. The interior is the container's art, and the contents are free-placed world sprites, not a grid. Drag moves items among containers, the map and the paper doll. Nesting opens one window each. Several windows may be open. The worked capacity is the backpack: 1 cu ft and 30 lb. Nested weight counts toward carried weight. Locks and traps are the SRD check (thieves' tools against a DC, or a key item). A destroyed or burned container spills or destroys its contents through the mass ledger. NPC shop stock lives in a real container and can be stolen. A container with contents counts as one object for item-count and save budgets. Art for each starter type (backpack, chest, barrel, crate, sack) is an open sprite and a closed sprite in four facings, an open animation, and a container-window background, with race variants where that container is worn or built by a race. Catalogue category `CONTAINER`. Slot example `CN.BACKPACK.CLOSED.D`.

Manual note. A container opens a movable window of free-placed sprites. Backpack capacity in the worked example is 1 cu ft and 30 lb. Art is open and closed, four facings, plus a window background.

**AS-SCALE-001.** Item 26, as amended by items 38 and 43. One Z layer is 5 ft and 48 px. One quarter is 1.25 ft and 12 px. SRD squares are 5 ft. SRD 5-5-5 applies to spell areas and ranges only. Character movement is 8-way. The diagonal walk step is 3 px per axis per frame. Cardinal walk is 4 px per frame and run is 6 px per frame at 60 fps. Feet convert to squares for movement, spell areas, light and vision. A torch is 20 ft bright and 20 ft dim, which is 4 tiles plus 4 tiles. Falling is 1d6 per 2 layers. Carry is Str × 15 lb. Animation holds are an integer number of 60 fps frames (150 ms is 9 frames and still divides evenly). One sim tick is one 6 s SRD round, and 10 ticks are one game minute. This is the action-domain tick. The historical domain stays as already recorded. Day length targets 24 to 48 real minutes, as a depth-demo toggle. Bright light is a solid glow. Dim light is a 2 or 3 step dithered palette falloff, with no gradients, and that falloff is also a depth-demo toggle. Positions are whole pixels. Terrain sits on the 48 px square grid. Heights sit on 12 px steps. A 64 px tile is not adopted. **OPEN (2026-09-29):** the 5 ft layer and the 12 px quarter conflict with DEC-013 item 2 / DEC-038 item 3 (10 ft layer, five 2 ft strata); the decision log governs until the Owner rules (Appendix A item 41; `docs/STATUS.md` D.5). The rest of this rule is not in conflict.

Manual note. One Z layer is 5 ft and 48 px. A quarter is 1.25 ft and 12 px. SRD 5-5-5 applies to spell areas and ranges only. Character movement is 8-way on the eight directions. The diagonal walk step is 3 px per axis per frame. Terrain stays on the square grid. A 64 px tile is not adopted.

**AS-RENDER-001.** Item 27. Scale is an integer only. The default is 2×. The game picks the largest integer that keeps at least about 20 tiles across: 2× on 1080p, 3× on 1440p and on 4K. The player may override. Sampling is nearest-neighbour, with no smoothing and no blur. The camera moves in whole art pixels. UI and window skins use the same factor. Extra space is a letterbox, or it shows more map. It is never stretched. The depth demo has a 1×, 2× and 3× toggle.

Manual note. The finished frame scales by an integer only. The default is 2×, nearest-neighbour. Extra space letterboxes or shows more map.

**AS-XLAYER-001.** Item 28. Cross-layer destruction is modular and runs through the mass ledger: ground collapse, wall breaches of 4 stages (allowed 3 or 4), and multi-layer cave-ins. Catalogue category `XLAYER`. Slot example `XL.BREACH.S1.01`.

Manual note. Cross-layer destruction covers ground collapse, wall breaches of 4 stages, and cave-ins, through the mass ledger.

**AS-QTR-001.** Item 29, as amended by item 38. Partial heights are quarters of a layer, 12 px steps. That replaces the earlier strata split on strata, ramps, half-step slopes, cliff and edge strips, and surfaces. Cliff and wall pieces are standard RMMZ-style tiles (**AS-DEPTH-001**), not quarter-height front strips. `strataPerLayer` is 4. `stratumPx` is `[12, 12, 12, 12]`. `stratumFt` is 1.25. The head ratio of about 1/5 stays a proportion rule. **OPEN (2026-09-29):** the quarter split conflicts with DEC-013 item 2 / DEC-038 item 3 (five 2 ft strata; `art/catalogue/geometry.json` `strataPerLayer` 5, `stratumPx` `[19, 19, 19, 19, 20]`); the decision log governs until the Owner rules (Appendix A item 41; `docs/STATUS.md` D.5).

Manual note. Partial heights are quarters of 12 px. Cliff and wall pieces are RMMZ-style tiles, not quarter-height front strips. The old strata split is not used. The head ratio of about 1/5 stays a proportion rule.

**AS-SITE-001.** Item 30. The construction category is a placement ghost tinted by a precomputed palette swap (not an alpha fade), a blueprint, a foundation, scaffolding, partial build stages, site props and a build animation. Catalogue category `CONSTRUCTION`. Slot example `CS.HUMAN-FRONTIER.SCAFFOLD.01`.

Manual note. Construction art is a palette-swap ghost, a blueprint, foundation, scaffolding, partial stages, site props and build animation. The ghost is not an alpha fade.

**AS-READ-001.** Item 31. Backgrounds and terrain sit a step calmer than the actors. Mood comes from lighting, glows and grading, not from a darker base palette. Interactable items and characters keep a clear value contrast and a strong silhouette. The grayscale test uses value `round((0.299 R + 0.587 G + 0.114 B) / 255 × 15)`, levels 0 through 15. The minimum step is 3. A 12 px item uses a high-contrast pair and a minimum step of 4. Both colours are master-palette entries. The asset's typical ground is stored with the asset. The checker runs that difference. Approval requires a pass, and the Owner's yea is still the approval in **AS-PREVIEW-001**. UI, recorded for the placement lane, is a 1 px hover outline plus a name tooltip, a drag preview snapped to 6 px cells, topmost-first picking with a modifier that cycles a stack, and an optional hold-to-zoom at integer 3× or 4×. The PixelLab table-with-items trial is the readability reference, reviewed at true 2×. This lane does not generate that image.

Manual note. Characters and items must clear their ground by the grayscale value step before approval. The table-with-items trial is the reference, reviewed at true 2×. No image is generated here.

**AS-PAL-001.** Item 32. Five rules. (1) The palette is saturated and controlled, with no gray mush. Each biome keeps a distinct colour family. (2) Value comes first. Characters and items contrast with their ground, and they use the crisp dark outline. (3) The brightest and most saturated master colours are reserved for interactables, characters, spell effects, loot and danger. Backgrounds are a step calmer. (4) Mood, including a dark dungeon, night, blood or ruin, comes from lighting, glows and grading. (5) Every asset passes the grayscale test before approval.

Manual note. The palette is saturated and controlled, with no gray mush. Value carries the read. The brightest colours are reserved. Mood comes from light and grading. Every asset passes grayscale before approval.

**AS-LOCK-001.** Item 33, with the portrait class from item 42. These defaults are LOCKED. The PM may revise them on trial or style-bible evidence, with notice to the Owner. The 15:05 CT revision is included. Light is top-left. The outline is 1 px and self-tinted on map sprites and items, and none on terrain. A character faceset does not require that outline. A black contour is allowed on a character faceset, because the Owner reference has one (correction 16:39 CT). The master is the single S/T master in **AS-GLOBAL-004**: 226 active colours, 30 reserved slots, 256 slots, and no shrink of that list. Per-asset caps, drawn from that master, are about 16 for a small item or icon, about 32 for a character or creature sheet including its layers, and about 48 for a tileset. A character faceset is its own class: up to 64 colours, drawn from the master plus `RAMP_PORTRAIT_SKIN_HAIR` when the master is short of a skin or hair step. Painterly soft shading is allowed on that class. Map sprites keep the 16, 32 and 48 caps and the 1 px self-tinted outline. The checker uses those counts as maxima. Race and biome sub-palettes are drawn from the same master. The grayscale rules still apply, including to the character faceset. The style bar is `tasks/WG.20.01/lane-al/refs/OWNER_PORTRAIT_STYLE_REF_01.png`: a painterly pixel portrait, soft detailed shading, warm light, and a plain dark background. Its sha256 is `b1c0c721bcbd7eca39b69488073b4d0beff73fb590cb39dcd9c74a86ccafb984`. This lane does not generate that image. It is the reference the PM committed with the brief.

The reserved paper-doll example keeps the RMMZ 4-step cycle 1, 2, 1, 0. Character map sprites do not use that cycle. Idle is 4 frames and walk is 4 frames. Every other character clip is 6 frames (**AS-CHMAP-001**). The clip palette cap after the snap is 40 colours, marked TUNE and Owner-open, beside the locked sheet cap of about 32. Prompts do not state a colour count. Effects use the same palette and outline. Additive glow is the only place maximum brightness is allowed. Grading for dawn, day, dusk, night and underground is a fixed palette shift, not a colour matrix. Icons are 32 px and match the world sprites. Markers for selection, faction, summon controller and low HP are colour-blind-safe and shape-coded: diamond, square, triangle and circle. Colour is not the only channel.

The retired paper-doll estimate counted 708 cells, then 660 after the melee body rows were dropped. That count is not the character map sprite estimate. The character estimate is in **AS-CHMAP-001**. Catalogue category `MARKER`. Slot example `CB.SELECT.DIAMOND`.

Manual note. Style defaults are LOCKED. The PM may revise them on trial or style-bible evidence, with notice to the Owner. The 15:05 CT revision keeps one master, caps colours, and sets the frame budgets. Item 33 counted 708 cells. Item 39 draws 660. A character faceset may use up to 64 colours, painterly soft shading, and a black contour. Map sprites keep the 1 px self-tinted outline.

**AS-MELEE-001.** Items 35 and 39 are retired for character map sprites. Attacks are the eight weapon-group clips in **AS-CHMAP-001**. A fixed grip and a rotating weapon sprite are not the character method. Shields are not animated. A heavy hit may draw 1 or 2 px of knockback as a separate offset. PixelLab is the primary generator. Retro Diffusion is standby. Nano Banana Pro is for concepts only. Catalogue category `SPARK`. Slot example `SP.SLASH.F0`. The weapon-angle ids stay reserved.

Manual note. The fixed upright grip and the rotating weapon sprite are retired for character map sprites. Attacks are whole-sprite weapon-group clips. PixelLab is the primary generator. Retro Diffusion is standby. Nano Banana Pro is for concepts only. A heavy hit may use knockback as a separate offset.

**AS-PM-001.** Item 36. These are PM defaults. The Owner may override them. On-screen size classes: Tiny 24 px, Small about 36 px in the 48 frame, Medium 42 px, Large 48 by 96 or 96 by 48, Huge 144 px frames, Gargantuan 192 px frames. Combat footprints stay SRD: Tiny shares a square, Small and Medium are 1, Large is 2 by 2, Huge is 3 by 3, Gargantuan is 4 by 4. Race heights in the 48 frame: human 42, elf 43 from the scale chart, dwarf 36 from the scale chart, half-elf and tiefling 42, halfling and gnome 33 px inside 32–34, half-orc and dragonborn 44. Races the chart does not list stay Owner-open in **AS-CHMAP-001**. Doors are 1 tile wide and at least 1.5 layers tall (72 px, 6 quarters). Walls are whole layers. Floors are 1 layer. Mirroring is allowed for creatures and props. West-facing creatures and props may be mirrored from east, offline, and the west frame is then stored. The runtime does not flip. Characters are authored in eight directions and are not mirrored. Gear flagged asymmetric on a prop gets its own west view. Fortress zoom-out is a 1× render plus a colour-coded tile minimap, with no downscaled blur. Range and area markers are whole squares on the tile grid and match the SRD shape. One pixel font draws damage numbers and status, at native size, at a whole-pixel scale, coloured by damage type through a precomputed ramp. Catalogue categories `FONT` and `RANGE`. Slot examples `FN.PIXEL.DAMAGE` and `RG.SQUARE.01`.

Manual note. These size, footprint, door, mirror, fortress, marker and font defaults are the PM defaults. The Owner may override them. Elf height follows the scale chart at 43. Characters are authored in eight directions. Creatures and props may mirror west from east.

**AS-VIS-001.** Items 37, 40, 41, 42 and 43. There are no class outfits. The character map sprite is one whole PixelLab v3 sprite per armor state (**AS-CHMAP-001**). Paper-doll layers, race garb and class kits are not that sprite. Class shows in the portrait and the selected-unit panel. Facesets never change with gear. Each faceset is one complete 144 by 144 image. The race background is part of that image. The 8 expressions are generated from it. A faceset is not built from layers.

The retired paper-doll estimate was 708 cells, then 660. Those counts are not the character map sprite estimate. Slot ids for race garb, kits and held class items stay reserved.

Item 42 keeps the faceset as one image. Each of the 216 presets has one complete 144 by 144 portrait, and that portrait is the neutral cell of one 576 by 288 sheet. The other 7 expressions are generated from it and keep its identity. Portrait skin and hair variants are the per-preset field `colourVariantMethod`. No portrait has been drawn in this lane, so no skin and hair ramp has been shown to map onto the master plus `RAMP_PORTRAIT_SKIN_HAIR`. All 216 presets are recorded `separate-generation`. That is 216 × 3 = 648 variant sheets. Complete faceset sheets are 216 + 648 = 864. Expression cells are 864 × 8 = 6912. Generation calls are the same 6912. Presets serve portraits. They do not drive the map sprite.

Manual note. There are no class outfits. The map sprite is the armor state. Facesets never change with gear. Each faceset is one complete image and is not built from layers. Dwarf male and female adult and elder bodies are 36 px. The preset pool is 216 looks. Item 42 records 864 complete faceset sheets and 6912 generation calls.

### 2.19 Character map sprites (item 43)

**Suspended (DEC-007 amendment, Owner 2026-09-29).** The PixelLab Create Character and Create State steps in this section (web UI steps 1 and 2, the Base and Armor State prompt templates, and the v3 base and State counts that depend on them) are suspended. The Owner opened PixelLab for the OBJECTS and MAPS tools only; Creator and Character prompts are banned. The text below is kept as the record of the character map sprite design. It is not deleted. Nothing in this section is run until the Owner reopens character generation. The live production procedure is §3.

Owner 16:10 CT through 16:47 CT, amended 17:09 CT by `tasks/WG.20.01/lane-al/refs/ADDENDUM_0509_RULINGS.md` (sha256 `87210fe055efa306c4ba4ec55b9e286e27161da71fa88425f47803d4790077f4`). This section is the character map sprite rule. It cites `tasks/WG.20.01/lane-al/refs/DEUS_CLASS_SPRITE_STANDARD.md` v3 (sha256 `27f74ee271f3777f8ab1d11606c17ca2d56638ed8f714be010a964b4ce5593ce`, superseding v1 `7baffd45ce4e0558` and v2 `bf34763f41327644`) and `tasks/WG.20.01/lane-al/refs/DEUS_GENERATION_RECIPES.md` (sha256 `9785c0690a402be8916b1c9ceaed93ac14c24c6e5c2ed873c408f67e9c2ba32e`). Recipes section 3.0 still describes 216 class sprites and is superseded. No art is generated in this lane. The Owner generates all art in the PixelLab web UI.

**AS-CHMAP-001.** Each race and sex has one unarmored PixelLab v3 base, plain clothes, empty hands. That is 9 races by 2 sexes, 18 bases. ROBE, LIGHT, MEDIUM and HEAVY are PixelLab States of that base, 72 States. With the unarmored base that is 90 armor states. There is no per-class map sprite and no commoner sprite set. Unarmored covers commoners and villagers. Robe covers casters. The armor state follows the worn armor category. The attack animation follows the wielded weapon group. No other gear changes the map sprite. Bases and armor States carry no weapon. The weapon is drawn only inside its attack animation. Class shows in the portrait and the selected-unit panel. An unarmored unit shows ROBE when its highest-level class is a caster, and UNARMORED otherwise. That caster list is Owner-open.

Characters use eight directions: S, SW, W, NW, N, NE, E, SE. Movement is 8-way through an RMMZ plugin. The diagonal walk step is 3 px per axis per frame. The camera stays the RMMZ standard top-down 3/4 view. Terrain, walls and caves stay on the square grid with rounded and ragged corners. Characters are not mirrored. Creatures and props may still mirror west from east.

Each armor state has 19 animations, each in all eight directions. Life clips are idle, walk, work, sleep, sit, eat and drink, carry, hurt, knocked down and dead. Weapon groups are unarmed, dagger, one-hand sword, two-hand, spear and polearm, staff, bow and crossbow. Cast is the nineteenth clip. Idle and walk are 4 frames. Every other clip is 6. The slot id is `CH.<RACE>.<SEX>.<ARMOR>.<ANIM>.<DIR8>.F<n>`. ARMOR is UNARMORED, ROBE, LIGHT, MEDIUM or HEAVY. ANIM is IDLE, WALK, WORK, SLEEP, SIT, EAT, CARRY, HURT, KNOCKDOWN, DEAD, ATK_UNARMED, ATK_DAGGER, ATK_1H, ATK_2H, ATK_POLEARM, ATK_STAFF, ATK_BOW, ATK_XBOW or CAST. The code ATK_1H_SHIELD is retired and reserved. The sample is `CH.HUMAN.M.UNARMORED.IDLE.S.F0`. Paper-doll, race-garb, kit and per-class map-sprite ids stay reserved. The 768 by 1440 sheet remains a reserved example. It is not the map sprite.

Style target is look-test row 6 at chart heights. The canvas is 48 px. A human is about 42 px tall and 18 px wide inside it. Size authority is `art/catalogue/scale_chart.json` (sha256 `f3af0b1140eaa864`), `art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png` and `docs/art/DEUS_HUMAN_WORLD_SCALE_STANDARD.md`. Where scale_chart and `art/catalogue/size_classes.json` disagree, scale_chart wins until the Owner picks one file. Dwarf is 36 (the size-class file says 32). Elf is 43 (the size-class file says 39). PixelLab controls for these sprites are Selective outline, High Top-Down, medium detail and a 48 px canvas. Whether furniture, buildings and creatures use High Top-Down is Owner-open.

Prompts are short plain language: who the character is, what they wear or hold, the pose or motion, the view and the style. The same pattern is used for every character. Prompt text carries no pixel coordinates, no hex lists and no pixel sizes. Size and palette are enforced by the canvas, the outline, the detail setting and the post-process. The post-process snaps the palette, anchors the figure, checks height and checks weapon length on every frame. Acceptance for weapon length is plus or minus 1 px. The locked character-sheet cap stays about 32. The snap cap of 40 colours is TUNE and Owner-open.

Prompt templates:

- Base: `{race} {sex}, {clothes}, empty hands, standing relaxed, high top-down view, readable high-contrast fantasy pixel art`
- Armor State: `Change the clothes to {armor clothes}. Keep the face, hair, skin, body and standing pose. Empty hands. No weapon.`
- Animation: `{facing}. {motion}. High top-down view, readable high-contrast fantasy pixel art.`

Facing phrases: S, facing the viewer. SW, facing down and to the left, three-quarter front view. W, facing left, side profile. NW, facing up and to the left, three-quarter back view. N, facing away from the viewer. NE, facing up and to the right, three-quarter back view. E, facing right, side profile. SE, facing down and to the right, three-quarter front view.

Life motions, in plain words: idle is standing and breathing. Walk is an in-place step cycle. Work uses that armor state's tool. Sleep ends lying on one side. Sit ends cross-legged. Eat uses a bowl. Carry holds a crate. Hurt is a flinch and a recovery. Knocked down ends lying on the back. Dead ends lying face down. Cast uses that armor state's gesture.

Weapon motions: unarmed is a right punch and a left follow-up. Dagger is a short stab. One-hand sword is a rising diagonal slash with a longsword. Two-hand is a downward cut with a greatsword. Polearm is a two-handed spear thrust. Staff is a two-handed sweep. Bow is a draw, a release and a recovery. Crossbow is an aim, a release and a reload.

Worked example, human man, medium armor, south:

`human man, plain linen work clothes, a leather belt and leather boots, empty hands, standing relaxed, high top-down view, readable high-contrast fantasy pixel art`

`Change his clothes to a mail shirt and a tabard with a gold sun emblem, steel pauldrons, a leather belt and leather boots. Keep his face, hair, skin, body and standing pose. Empty hands. No weapon.`

`facing the viewer. He swings a longsword in a rising diagonal slash. High top-down view, readable high-contrast fantasy pixel art.`

The Owner's web UI steps, which this lane does not run, and which are suspended under the DEC-007 amendment of 2026-09-29 (note at the top of §2.19), are: fill the template (step 0); Create Character for the unarmored base (step 1); Create State for robe, light, medium and heavy (step 2); Animations, one direction at a time (step 3); keep all eight directions, with no mirror (step 5); pack 48 by 48 frames in the row order above (step 6); post-process palette, anchor, height, outline, grayscale and weapon length (step 7). A failed measurable check may be retried twice. After that the item is flagged for the Owner.

Post-process weapon lengths, not prompt text: unarmed has none, dagger 7, longsword 18, greatsword 22, spear 30, quarterstaff 30, shortbow 20, light crossbow 12. The one-hand group draws the longsword only. Thrown weapons have no group yet (Owner-open).

Race themes: each race has one theme of clothing, trim, materials, motifs and silhouette cues. The same block feeds all five armor states and that race's buildings, walls, furniture, workstations, constructed objects, UI window skin and faceset background. The selected-unit panel uses the selected unit's race window skin, and its faceset uses that race's background. The theme text itself is Owner-open.

Estimate, re-run flagged. 18 bases at about 2 each is 36. 72 armor States at 20 each is 1,440. 90 states by 19 animations by 8 directions is 13,680 animation calls. The computed first pass is 15,156, recorded as 15,200, with a range of 15,200 to 19,300 and 18,900 to 24,000 once retries are included. Per race and sex the low figure is 842. The figure sits inside the 40,000 the Owner accepted. Production waits for Owner sign-off. The first test is human man MEDIUM, all eight weapon animations in eight directions: base 2, State 20 and 64 animation calls, about 86, about 110 with retries. Slot example for that test: `CH.HUMAN.M.MEDIUM.ATK_1H.S.F3`.

Owner-open items O1 through O25 stay open except O5 and O20, which are resolved: life clips show empty hands, and shields are not drawn on any character clip. O6 keeps the work-tool question open. O15 is the robe rule. O16 is a class badge on the portrait, with no extra generation. O17 is children and elders. O21 is the weapon-length test and its fallbacks.

Manual note. Eighteen unarmored bases and 72 armor States make 90 armor states. Each state has 19 animations in eight directions. Idle and walk are 4 frames. The other clips are 6. The first-pass estimate is 15,200 generation calls, and production waits for Owner sign-off. Prompts are plain language. The post-process checks palette, anchor, height and weapon length. No art is generated here.

## 3. Natural-world production SOP (PixelLab OBJECTS and MAPS), Owner 2026-09-29

This section is the operating procedure for every natural-world asset made under the DEC-007 amendment of 2026-09-29 (`docs/OWNER_DECISIONS.md`). It applies to terrain tiles, ground objects, flora, stone, remains and the other non-living pieces the natural-world phase needs (DEC-037). Living beings stay under DEC-007 as written: nothing is generated for them without the Owner. The PM (Claude Code, DEC-042) runs the procedure and presents the results. Nothing here changes the rules in §1 and §2. Where a §2 rule and this section name the same check, the §2 rule is the definition.

### 3.1 Tools

- Allowed: the PixelLab **OBJECTS** tool and the PixelLab **MAPS** tool, for natural-world tilesets, charsets and chipsets.
- Banned: PixelLab **Creator** and **Character** prompts, every other generator, and any other scope, unless the Owner opens it. AS-GEN-004 and AS-GEN-005 stand: PixelLab is the one generator. Nano Banana Pro is not a production generator; the Retro Diffusion standby and the Nano Banana Pro concept role in DEC-044 are dormant under DEC-007 (nothing but PixelLab OBJECTS and MAPS without the Owner).
- The §2.19 Create Character and Create State steps are suspended (note at the top of §2.19).

### 3.2 The ten steps

Each asset walks these steps in order. A step that is skipped, or whose output is missing, stops the asset where it is.

1. **Requirement.** A named consumer needs the asset: an object, ground kind or water kind in `game/data/UF_WorldCatalog.json`, or a system doc in `docs/systems/`. The request is written as a catalogue record (step 2), not as a row in `docs/ASSET_REQUESTS.md`.
2. **Catalogue record.** `art/catalogue/catalogue.json` gets the entry first: six-field id (AS-GLOBAL-010), band and biome (AS-GLOBAL-019), frame class and cell size (AS-SIZE-001), envelope, anchor, animation class (AS-ANIM-001) or its named static exception, the typical ground for AS-READ-001, and status `CATALOGUED`. No record, no prompt.
3. **Prompt file.** `art/prompts/<id>.json`, one per entry. Fields: the entry id, `tool` (`OBJECTS` or `MAPS`), `settings` (view **high top-down**, AS-VIEW-002; outline; detail; canvas size), `positivePrompt`, `negativePrompt`, `seed`, and the style tail. The prompt is short plain language: what the thing is, its material and state, the view, the style tail. It carries no pixel coordinates, no hex values and no pixel sizes; the canvas, the outline setting and the post-process enforce those (the same rule as the §2.19 prompts). The seed of every generation that is kept is recorded in the file. Status `PROMPTED`.
4. **Generation.** Run the prompt in the allowed tool. Every raw output that is kept goes under `art/masters/source_sets/<id>/` (one PNG per variant or frame, plus `manifest.json` naming tool, settings, seed and date). Raw files are never edited in place. Status `GENERATED`.
5. **Post-process.** Allowed operations, and no others: crop transparent margins, shift by whole pixels onto the anchor (AS-ANCHOR-001), snap to the master palette (AS-GLOBAL-004). No resample, no rotation, no tint, no redraw, no hand-typed pixels. Output is the master at `art/masters/<id>.png` with its sidecar (AS-GLOBAL-012).
6. **QA.** `tools/art/validate_art.js` runs the machine checks in §3.3 and prints pass or fail per item. The items the tool does not measure yet are judged on the review board (step 7) and written down pass or fail by name. One fail is `QA_FAILED`, with the failing item named; the asset goes back to step 4 with a new seed. All pass is `QA_PASSED`. An agent may set `QA_PASSED`. No agent may set any status past it.
7. **Review board.** The PM builds one image per asset: every variant and every frame at 1:1 and at 3x, on that asset's typical ground, beside the 42 px human scale strip (`art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`), with the entry id, the seed and the checklist results printed beside the picture, never inside the art. Animated assets are also shown as an in-game clip or a frame strip. The PM opens the board and describes what is in it before the Owner sees it (AGENTS.md Rule 5).
8. **Owner sign-off.** The Owner writes the SHA-256 ledger row in `art/APPROVALS.md` per `docs/art/APPROVALS_FORMAT.md`: `YEA` is `OWNER_APPROVED`, `NAY` is `OWNER_REJECTED`. That row is the only thing that may move the catalogue past `QA_PASSED`. A tool or an agent that writes `APPROVED` or `OWNER_APPROVED` without a matching `YEA` hash is a defect, and the status is void.
9. **Induction.** `tools/art/place_art.js` places the approved file into its slot (it refuses a hash the ledger has not approved) and `tools/art/assemble_v8_sheet.js`, or the matching assembler, builds the runtime sheet. Animated classes get their real frames in the cells. A sheet that copies one frame into every cell is correct only for a static exception named in AS-ANIM-001. Status `INDUCTED`.
10. **Placement data and in-game check.** The consumer in `game/data/UF_WorldCatalog.json` gets its placement data (§3.5). The PM runs the game (RMMZ Playtest, F5, or the harness), takes a screenshot with the asset on screen, opens it, confirms the frames advance for animated classes, and confirms no F8 console error. Status `IN_GAME`. Headless output alone does not reach this status (Owner 2026-09-29).

### 3.3 QA checklist

Every item is written pass or fail for every variant and every frame. Items marked "tool" are measured by `tools/art/validate_art.js` today, with its refusal code. Items marked "board" are judged on the review board until the tool grows the check; the judge writes the item name and pass or fail.

| # | Item | Rule | Who |
|---|---|---|---|
| 1 | Exact cell size: the file is the slot's width by height | AS-GLOBAL-001, AS-SIZE-001 | tool, `DIMS_MISMATCH` |
| 2 | Drawn bounding box inside the envelope | AS-PIPE-001 | tool, `SCALE_OUT_OF_ENVELOPE` |
| 3 | Anchor within 1 px of the slot anchor | AS-ANCHOR-001 | tool, `ANCHOR_GROUND` / `ANCHOR_CEILING` |
| 4 | Alpha is 0 or 255 only | AS-GLOBAL-003 | tool, `ALPHA_NOT_BINARY` |
| 5 | Every opaque pixel is in the master palette | AS-GLOBAL-004 | tool, `OFF_PALETTE` |
| 6 | High top-down view, the one camera | AS-VIEW-002 | board |
| 7 | Light from the upper left | AS-GLOBAL-005 | board |
| 8 | Outline rule: 1 px self-tinted on objects, none on terrain | AS-GLOBAL-006, AS-LOCK-001 | board |
| 9 | Grayscale step of 3 or more against each target ground the record names | AS-READ-001 | board until the tool reads the recorded ground |
| 10 | The variants of one object stay within one silhouette family and one value band | §3.4 | board |
| 11 | Frame count matches the animation class; base pixels stable across frames; no strobing | AS-ANIM-001, AS-GLOBAL-017 | board, in-game clip |
| 12 | Originality check passes | AGENTS.md Rule 8, `tools/originality_check.js` | tool |

A static asset names its exception from AS-ANIM-001 in the record. Item 11 then checks that the sheet holds one frame, not a fake loop.

### 3.4 Variants

- A variant is a distinct front-view generation: a new run of the prompt, usually with a new seed, sometimes with a changed descriptor. Variants are never rotations of one image. A rotation is a facing, and it moves the light off the upper left (AS-GLOBAL-005).
- The variants of one object must still read as that object: one silhouette family, one value band, one material. Different objects must stay easy to tell apart (Owner 2026-09-29: diverse but readable).
- A set already inducted as eight rotations of one generation is recorded as one variant plus seven facings until it is regenerated. It is not counted as eight variants.

### 3.5 Terrain tiles and placement data

- Terrain tiles are flat, seamless, 48 px, on the dual-grid path in AS-TERR-001. Each ground kind gets several variants placed as a gradient across the ground, so the ground shifts instead of repeating one stamp (Owner 2026-09-29, recorded under DEC-007). Variant counts per kind and the placement rule are pending their own decision. Until then a kind ships with at least 3 variants and the rule below.
- Placement data lives with the consumer in `game/data/UF_WorldCatalog.json`: for each object or ground kind, the variant list with a weight per variant, a flag that forbids identical orthogonal neighbours, and per-ground-kind variant sets where one object is split by ground. The runtime picks by weight and refuses the variant already used by an orthogonal neighbour of the same object. On 2026-09-29 `game/js/plugins/DEUS_Objects.js` picks by a uniform hash with no weights and no neighbour rule. Closing that gap is an engine leaf, not a change to this SOP.

### 3.6 One status ladder

`CATALOGUED` -> `PROMPTED` -> `GENERATED` -> `QA_PASSED` | `QA_FAILED` -> `OWNER_APPROVED` | `OWNER_REJECTED` -> `INDUCTED` -> `IN_GAME`

This ladder replaces the six status vocabularies in use on 2026-09-29: the `docs/ASSET_REQUESTS.md` flow (REQUESTED through INTEGRATED), the `docs/art/ART_QA_DASHBOARD.md` ladder (GENERATED through COMPLETE), the catalogue status enum in `docs/art/catalogue/SCHEMA.md` §7, the prompt-file `READY_FOR_OWNER`, the READY status in `docs/PROJECT_DEUS_ART_DIRECTION_SPEC.md`, and the production-matrix `qcPassed` flag. Legacy tokens map as follows. `MISSING` is no record, or `CATALOGUED` once the record exists. `EXISTING_UNAPPROVED`, `STAND_IN` and `STOCK` are `GENERATED` at best; none is QA-passed. `APPROVED` is `OWNER_APPROVED` only when a `YEA` ledger row holds the file's hash; otherwise it is `GENERATED`. `QA_FAILED` and `OWNER_REJECTED` return the asset to step 4. Every writer of a status uses these words and no others.

Where the ladder is recorded on 2026-09-29. `art/catalogue/catalogue.json` keeps its old enum (`MISSING`, `EXISTING_UNAPPROVED`, `STAND_IN`, `STOCK`, `APPROVED`, `OUT_OF_SCOPE`; `docs/art/catalogue/SCHEMA.md` §7) because `tools/art/build_catalogue.js` regenerates every entry's status from `docs/ASSET_INVENTORY.md` with those words and `tools/art/test_catalogue.js` is a merge-gate test (TOOL.01.01, TOOL.01.02); a hand-set ladder word there would be overwritten and would fail the gate. Until a tooling leaf teaches the builder and SCHEMA §7 the ladder (`docs/STATUS.md` F), an asset's ladder status lives in its prompt file (`art/prompts/<id>.json`, field `status`) and in `docs/art/ART_QA_DASHBOARD.md`, and the catalogue word is read through the mapping above. Step 2's `CATALOGUED` therefore means "the record exists in the catalogue"; the catalogue file itself still says `MISSING` for it.

## 4. Worked spell rows

The schema examples are the normative samples. In short: Fire Bolt is evocation, one-hand, projectile, fire, `ignite-unattended`. Fireball is evocation, one-hand, sphere with projectile travel, fire, `fire-tiles-spread` and `crossesZ` true (the burst is also stamped on lower layers when the sim says the volume crosses Z). Cone of Cold is evocation, two-hand, cone, cold, `cold-freezes`. Lightning Bolt is evocation, focus-raise, line, lightning, `ignite-unattended`. Shield is abjuration, one-hand, self-aura, no damage, aura `ward`, drawn with the force ramp (the rules text says an invisible barrier; the pixels are opaque). Cure Wounds is evocation, one-hand, touch, sim `heal`, heal ramp `RAMP_DMG_RADIANT`. `customPiece` is null on all six.

## Appendix A. Conflicts

Owner rulings win. The source line is the conflict. The resolution is the ruling.

1. **Five biomes vs six.** `docs/art/DEUS_BIOME_IDENTITY_STANDARD.md` line 49, "The Five Canonical Biomes" (TEMP, WET, ARID, HIGH, VOLC). `docs/art/DEUS_WORLD_WBS.md` line 33. `docs/art/DEUS_PALETTE_ARCHITECTURE_STANDARD.md` line 44 ("5 Biomes"). Catalogue `biomes.canonical` is the same five. `docs/worldgen/DEUS_WORLDGEN_WBS.md` line 92 records WG.00.04 as superseded by DEC-030, and line 732 (OD-6) still recommends 5. **DEC-030 wins:** VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD.
2. **A different six.** `docs/art/DEUS_GLOBAL_PALETTE_LATTICE.md` line 41 counts 15 boundaries among Temperate, Wetland, Arid, Highland, Cold and Volcanic (Highland↔Cold is row 13). `docs/art/DEUS_MASTER_OVERWORLD_BIOME_TILESET_PRODUCTION_CHARTER.md` line 226, "SIX MAJOR BIOMES", defers to that lattice. That set has Highland and Cold and no WILD. **DEC-030 wins.** Highland is a depth band. WILD is a biome. The look of COLD and WILD is open (Appendix B), not copied from the lattice's snowline.
3. **25 sets vs 30.** DEC-013 line 188 still says the 25 pipeline biomes sit in five bands of five. Catalogue schema text still says the 25 names are open. **DEC-030 wins:** 6 × 5 = 30.
4. **Ten transitions vs fifteen.** `DEUS_BIOME_IDENTITY_STANDARD.md` line 286, "All 10 Biome Pairs", and line 391. Worldgen WBS WG.24 still says 10 with a rebuild flag. The lattice's 15 are the wrong pair set (item 2). **DEC-030 wins:** 15 pairs of the six DEC-030 biomes.
5. **Nine layers and the five-Z model vs 32 layers.** Identity standard line 274, "five physical Z levels" Z+2..Z−2. The production charter's five-Z section and the lattice's Z+2..Z−2 are the same model. DEC-013 line 179 and DEC-030 line 407: 32 layers, −16..+15. A 9-layer automated test remains allowed. It is not the world.
6. **Band ranges.** DEC-013 lines 189–193: Lower-2 −16..−9, Lower-1 −8..−1, Surface 0..+3, Upper-1 +4..+9, Upper-2 +10..+15. Catalogue `geometry.json` `bands` still use those ranges. **DEC-030 wins** with the table in **AS-GLOBAL-019**.
7. **V64 vs SRD 5.1.** DEC-027 lines 368–374 retires V64. These still describe V64 or OSRS combat as live: `docs/VISION.md` lines 73, 106, 112 and 116; `docs/design/COMBAT_CHAINS.md` lines 5–7; `docs/design/ABILITIES.md`; `docs/design/CRAFTING.md`; `docs/design/CLASSES.md` line 26; `docs/design/CHAIN_OF_COMMAND.md` line 9. **DEC-027 wins.**
8. **Eight-way sheets vs four directions.** `docs/VISION.md` line 15 (V3) requires eight facings. `docs/RMMZ_ASSET_SPEC.md` lines 49 and 101 describe the AR-600 8-row master. `docs/handoffs/GENERATOR_PROMPTS.md` rule 10 requires eight facings for every action. `docs/ASSET_REQUESTS.md` AR-600 does the same. **Item 43 wins for characters:** eight directions. Creature sheets stay four-direction, and a legacy creature sheet is mined for S, W, E, N. Engine files outside this lane are not edited here. Character movement is 8-way (**AS-PROJ-001**, **AS-CHMAP-001**).
9. **Tint, alpha, blur, glow shaders vs DEC-011.** Charter lines 190–191 (Invisible at 20% alpha, Poisoned as a tint pulse) and lines 266–268 (VFX exempt from binary alpha). Crosswalk lines 207–208 (the same alpha and tint). `DEUS_VFX_UI_INFORMATION_STANDARD.md` line 29 (permissive alpha and additive blend) and lines 141–142 (fog desaturated and dimmed). Environment standard lines 57–66 (time of day as a WebGL color matrix) and line 107 (seasons as a colour LUT). Native-resolution text that allows smooth VFX alpha. Visual-QC text that exempts translucent VFX from the palette clamp. Build-ghost text at 35% alpha in the VFX standard. **DEC-011 wins** for all of those: drawn frames and ramps, binary alpha. **AS-LIGHT-001**, Owner 12:52 CT, adds one later hook: optional per-pixel or per-tile tint, blur forbidden, default off. That hook does not revive ColorMatrix, blur, or alpha fades.
10. **Invisible and poisoned.** Resolved by **AS-HUM-012**. The 20% alpha and the green tint pulse are not the standard.
11. **Giant sockets "scaled by 2.0×".** Charter line 303. **DEC-011 / AS-GLOBAL-017:** Large frames are authored at 96 px, not scaled at runtime.
12. **East row mirrored from west.** `tools/test_generator_combinations.js` around line 158 mirrors row 2 from row 1. The charter §4.4 forbids blind mirroring of asymmetrical gear. **AS-HUM-014** wins. Symmetrical body pixels may still be authored as matches. The mirror is not the standard.
13. **F14 left unsplit.** Charter §3.2 says not to freeze a split of sleep, prone, unconscious and dead, and also says they must be distinguishable. **AS-HUM-010** requires distinguishable frames. Whether they share the family id stays open.
14. **Carry not drawn.** `DEUS_Anim.js` `IGNORED_ANIMS` includes `carry` (VISION V89: column 7 is the stand frame and is never shown). **AS-HAUL-001**, Owner 12:52 CT, wins. Carry is a drawn row. This document does not edit the plugin.
15. **Face sheet layout.** `UF_WorldCatalog.json` `faces.layout` is adult male, adult female, elder male, elder female, with a content-mood row. **AS-FACE-003** wins: eight expressions in the fixed index order.
16. **Face cultures vs nine races.** `faces.cultures` paints human, elf, dwarf, gnome, goblin, orc, lizardfolk, kobold, undead, starborn, swarm, and sets automaton to `"like": "starborn"` (line 12570). Only four of the nine races have their own face culture. The classification of the non-race face cultures is open (Appendix B). It is not resolved by drawing them as humanoids or as monsters here.
17. **Palette file.** ADR-002: `uf.hex` is canonical for runtime now; the master hex is the target. The catalogue's `palette.path` points at the master file. Both statements stand. Ramp ids are the asset vocabulary (**AS-GLOBAL-004**).
18. **Spell taxonomy.** Crosswalk §7 says 7 cast profiles and 17 delivery profiles. The markdown names 6 cast profiles (the counts sum to 319) and 11 delivery names. **Owner 12:39 and AS-FX-001** win. The older names are aliases in **AS-FX-002**.
19. **Material count.** Crosswalk §6 heading says 18. The list is 20 names. Icon slots use the 20 names.
20. **Catalogue id pattern vs worldgen WBS.** SCHEMA.md line 109 is `BAND_BIOME_CATEGORY_TYPE_VARIANT_STATE`. The worldgen WBS line for WG.20.01 still says `BIOME_Z_CATEGORY_TYPE_VARIANT_STATE`. **AS-GLOBAL-010** uses the six-field catalogue pattern, with DEC-030 tokens in the band and biome fields.
21. **LARGE_LONG.** `art/catalogue/geometry.json` marks `LARGE_LONG` as `PROPOSED` and the decision note as open. The lane brief requires 96 by 48 long frames. **AS-BEAST-004** adopts 96 by 48. The geometry file was not edited.
22. **Snow.** Identity standard line 42: there is no frozen/snow biome, and the catalogue forbids biome ids FROZEN, SNOW, GLACIER, ICE, TUNDRA_SNOW. **AS-ANIM-001** still requires a drawn snow weather overlay, because the 12:46 ruling names snow. Weather snow is not a biome. What the `COLD` biome looks like remains open.
23. **Child labour.** Charter §8: a child is ineligible for heavy labour. **AS-HUM-019** still requires the work rows on the child template.
24. **WG.00.01–.05**, for the record, not all of them conflict: WG.00.01 visual charter (flat 3/4, chibi 3.0–3.2 heads); WG.00.02 native 48 px, 1:1, binary alpha; WG.00.03 human scale, 42 px adult; WG.00.04 five biomes and 10 transitions (superseded); WG.00.05 master palette and 58 ramps (still the target architecture).
25. **Registry canonical set is five.** `game/data/DEUS_BiomeRegistry.json` `canonicalBiomes` (lines 9–15) is `TEMP`, `WET`, `ARID`, `HIGH`, `VOLC`. The same array is `docs/art/DEUS_BiomeRegistry.json` lines 7–13. The game file also keys `biomes`, `materialTaxonomy.signatureMaterials` and `horizontalTransitions` (10 keys, lines 562–653) with that five. `art/catalogue/catalogue.json` `biomes.canonical` (lines 110–116) is the same five, and all 10,089 entry biome tokens are `SHARED`. **AS-BIOME-005** flags a declared canonical set that is not the six DEC-030 ids. Those three files are not edited here.
26. **Shared outfit silhouette vs custom armour.** A1 said armour-weight silhouettes are shared and only the ramp and motif change. Owner 13:14 CT keeps armour pixels custom per race. Item 40 withdraws class outfits. **AS-HUM-015** keeps 27 custom armour icon rows. Race garb is reserved and is not the map sprite. The silhouette field remains the armour icon pattern.
27. **Season frames vs palette swaps.** **AS-BIOME-004** names four season states and rejects a runtime LUT. PM 13:01 CT (**AS-VAR-002**, Owner may amend) builds variety-piece seasons as palette-swap frames on precomputed season ramps. That is not a ColorMatrix. The four names stay.
28. **Six profile window skins vs eleven selectable skins.** **AS-UI-001** had named a window sheet per building profile. Owner 12:57 CT (**AS-UI-004**) requires Deus, Deus Dark and one skin per race. The six profiles remain building styles and banners.
29. **Legal mirror.** Item 12 stands. **AS-MIRROR-001** is the only added path: an offline W-to-E bake of a layer flagged `symmetric` with light-neutral shading.
30. **Huge and Gargantuan multiples.** They were open. Owner 13:16–13:20 CT sets them in **AS-SIZE-001**. `geometry.json` still has nulls and was not edited.
31. **Creature equipment.** Owner 13:01 CT supersedes any creature-gear slot. **AS-TAME-002**. No barding.
32. **Window background opacity.** A generator handoff describes the RMMZ window background at 75% opacity. **AS-UI-004** keeps the rectangles and requires opaque pixels.
33. **Separate elder bakes.** The generator pool bakes elder keys as their own charsets. **AS-ELDER-001**: only the stooped body is a new sheet, one per race and sex. Race garb, armour and the preset head are the adult sheets plus the offset table.
34. **Per-row strips vs one paper-doll sheet.** **AS-SLOT-001** still describes a 192 by 192 action-row strip. Owner 13:30 CT stacks paper-doll layers into 768 by 1440 (**AS-SRC-001**). The strip remains for Large and larger creature rows. The RMMZ charset is not that sheet.
35. **Walk is 3 columns vs 4 frames on the layer sheet.** **AS-GLOBAL-013** keeps the RMMZ 3-column walk on the charset. The paper-doll sheet writes that cycle as stand, left, stand, right.
36. **Pose-grid counts of 3 vs 4 columns.** **AS-HUM-016** still counts bow-loose, dodge and parry at 3 frames for the 236-frame offset table. The source sheet has 4 columns on every row. What the fourth cell shows on those three rows is open (Appendix B). The cell still has an id.
37. **Garb on each body vs elder reuse.** Owner 13:50 CT draws garb and armour on each body. **AS-ELDER-001** still reuses the adult sheet. **AS-SEX-001** draws adult male, adult female and the child body, and places the same sex's adult sheet on the elder with the offset table.
38. **One anchor vs two hands.** **AS-HUM-016** stores one `{x, y, angle}` cel. **AS-EQUIP-001** stores main-hand and off-hand points, the grip angle and the draw-order flag. The eight angle cels stay.
39. **Catalogue slot ids vs permanent ids.** Existing catalogue `slot.slotId` values are atlas addresses. **AS-ID-001** is the id the runtime keeps. The catalogue file was not edited.
40. **Generator routing.** Item 39 names PixelLab as the primary generator for every category. Retro Diffusion is standby. Nano Banana Pro is for concepts only. The multi-generator bake-off is off. One generator per layered set still holds, and that generator is PixelLab.
41. **Layer height (OPEN, 2026-09-29).** DEC-013 item 2 and DEC-038 item 3 (Owner, 2026-09-26 and 2026-09-28): 1 layer = 10 ft, five strata of 2 ft; `art/catalogue/geometry.json` (`layerFt` 10, `strataPerLayer` 5, `stratumPx` `[19, 19, 19, 19, 20]`, `layerPx` 96) and `game/js/plugins/DEUS_Levels.js` (`STRATA = 5`) follow them. Owner items 26 and 29 (2026-09-26), as **AS-GLOBAL-018**, **AS-SCALE-001** and **AS-QTR-001** record them: 1 layer = 5 ft = 48 px, four quarters of 12 px, `stratumPx` `[12, 12, 12, 12]`. Both are Owner-sourced, and DEC-016 already names px/ft as an Owner question (`stratumPx`). No winner is declared here: `docs/OWNER_DECISIONS.md` governs until the Owner rules once (`docs/STATUS.md` D.5); the losing rows are then corrected in a follow-up lane.
42. **A 64 px tile.** It was considered and was not adopted. Terrain stays 48 px. Integer presentation scale is **AS-RENDER-001**. The 64 by 64 SV battler frame stays.
43. **Art-direction wording.** The 14:38 CT direction is replaced by readable high-contrast fantasy (Owner 15:02 CT). Mood sits in lighting and grading.
44. **Outline weight.** A heavier outline gives way to the 1 px self-tinted outline on map sprites and items, and none on terrain (**AS-LOCK-001**). A character faceset does not require that outline. A black contour is allowed on a character faceset (Owner 16:39 CT).
45. **Two palette files.** `uf.hex` (256 lines, 250 unique, no shared hex) is not a second master. The S/T file's 226 colours are the active canonical set. Thirty reserved slots make 256 slots. The active list is not shrunk.
46. **Frame average.** The 3.5 frames-per-row estimate (420 cells) is replaced by the budgets in **AS-LOCK-001**. Item 33 counted 708 cells. Item 39 draws 660 after the melee body rows drop.
47. **Visible gear.** Item 43 withdraws paper-doll map sprites, race garb and class kits. **AS-CHMAP-001** is the map sprite. Facesets never change with gear. The A1 addendum file is not edited.
48. **West from east.** Owner 15:11 CT allows that mirror for bodies, gear layers and creatures. Weapons and shields stay on hand anchors. **AS-MIRROR-001** still forbids a runtime flip.
49. **Terrain assembly.** A 24 px Wang tile assembled into an RMMZ A2 autotile is not the terrain path. 48 px tiles-pro Wang on a dual-grid renderer is. 24 px remains the detail-decal size.
50. **Where maximum brightness sits.** It sits only on additive glow frames.
51. **Half-step slopes.** Item 22's half-step is 2 quarters, 24 px.
52. **Action tick.** One action-domain tick is one 6 s SRD round. The historical domain is unchanged.
53. **View and stepping.** The view is the RMMZ standard top-down 3/4 view. Characters use eight directions and move 8-way. The diagonal walk step is 3 px per axis per frame. Terrain, walls and caves stay on the square grid. Draw order stays row, then layer. SRD 5-5-5 applies to spell areas and ranges only. Cliff and wall pieces are RMMZ-style tiles with the depth cues. Side-wall, side-roof and corner-joint pieces are not added. Tall objects are not split. Quarter-height front strips are not a cliff or wall class. The retired slot id is `DP.CLIFF.TEMPERATE.FACE`. The live cliff tile is `DP.CLIFF.TEMPERATE.TILE`.
54. **Melee body frames.** Item 43 retires the fixed grip and the rotating weapon sprite for character map sprites. Attacks are the weapon-group clips in **AS-CHMAP-001**.
55. **Class outfits.** Item 40 withdrew them. Item 43 also withdraws race garb and class kits as the map sprite. The map sprite is the armor state.
56. **Visible genetics.** Item 41 withdraws them. Art uses 216 presets. Sim genetics stay on stats only. Dwarf male and female adult and elder bodies are 36 px.
57. **Faceset layer stack.** Items 37, 40 and 41, and the A1 face-stack rule, described a faceset as layers. Owner 16:05 CT withdraws that stack (**AS-FACE-002**). Each preset is one complete 144 by 144 image. The 8 expressions are generated from it. The race background is painted into the image. The checker requires one complete sheet of 8 expressions per preset, and it rejects a faceset built from layers. Face-layer slot ids stay reserved. Portrait colour variants are recorded per preset. All 216 are `separate-generation` until a ramp map is proven, which is 864 faceset sheets and 6912 generation calls.

## Appendix B. Open questions

These are not answered here.

1. **Face cultures that are not the nine races.** Painted face cultures besides the nine: goblin, orc, lizardfolk, kobold, undead, starborn, swarm, and automaton (stored as "like starborn"). `skins.cultures` also names serpentkin, demon, swarmer, dark_dwarf and dark_gnome. The question, as the brief states it: full humanoid paper-doll, or the monster set? The nine SRD races are humanoids under **AS-HUM-001** regardless.
2. **Age steps.** Child, adult and a stooped working elder are required. The charter also names infant (0–1, 16 px) and adolescent (15–17). How many steps, and whether there is a teen stage, is open.
3. **WBS.** This standard needs a dedicated leaf, and the per-category follow-ups need leaves. No WBS id is minted here and no WBS status is changed. Proposed follow-ups in the lane report use `PROPOSED-AL-NN` only.
4. **Other calls.**
   - What `COLD` looks like, given WG.00.04 forbids a snow biome, and where the existing `HIGH_*` ramps go.
   - What `WILD` looks like. No WG.00.04 entry describes it.
   - How many dragonborn scale-colour steps in `RAMP_SCALE`.
   - Ears, horns, tail and scales stay race features on the body template. The old hair, beard, balding and face-part lists are retired with the preset pool.
   - Do `DEEP` and `CAVERN` exhaust "underground depth band", or does `LOWLAND`'s negative Z count too?
   - Head-state indices 0, 1 and 2 are not named gestures.
   - DEC-016's open sentence: if "the scale chart" means a file other than the registry plus the strip, the Owner names it.
   - Which race's home layer is which (DEC-013). The catalogue's z 0 / −1 / −2 seating is not that answer.
   - `TALL_MEDIUM` (48 by 64) and the gnome/halfling readability floor stay off, as in `geometry.json`. Turning them on is an Owner call.
   - Whether sleep, prone, unconscious and dead share the family id F14, given that their frames must already be distinguishable.
   - How a remembered fog-of-war view is drawn without a desaturation filter. The prohibition is in force. The replacement method is not specified.

5. **Deity roster.** No DEUS pantheon is on file. `docs/design/EMERGENT_SOCIETY.md` says not to add unapproved named gods. The SRD historical-pantheon appendix is not this roster. Which deities, if any, get a holy symbol?
6. **Collar, saddle, harness.** After the 13:01 correction these are not slots and not stats. Are the visual markers wanted at all?
7. **Biome code mapping.** This lane does not map `HIGH` to `COLD` and does not invent a source token for `WILD`. `TEMP`, `WET`, `ARID` and `VOLC` already have identity-standard counterparts named in **AS-BIOME-003**. The Owner decides the migration, including `HIGH` and `WILD`.
8. **Beards.** Closed by item 41. Facial hair is part of the preset. Elder presets carry greying and balding. There is no separate facial-hair part list.
9. **Further dimorphic creatures.** The verified list is the 21 names in **AS-SEX-002**. A creature that is not on that list stays `none`. Adding another is an Owner call.
10. **Fourth frame on three-frame poses.** Bow-loose, dodge and parry have a fourth cell on the 768 by 1440 sheet. What that cell shows is open. The id is already reserved.
11. **Elder bodies.** Closed by items 40 and 41. Elder bodies are 18, one male and one female per race, at that race's height. Dwarf elder male and dwarf elder female are 36 px. The offset table reuses the adult armour, helmet and preset head.
12. **Small item world sprites.** The PixelLab trial left them as an open test (**AS-TERR-001**). No size was accepted or rejected here beyond the 12, 24 and 48 px classes already set for placement.
13. **Fourth walk cell.** Walk now authors three frames. The committed example sheet still has a fourth walk cell. What that cell shows is open. The id stays reserved.

Character direction count is decided in §2.19 (Owner 16:41 CT and 17:09 CT). Huge and Gargantuan frame squares are decided (13:16–13:20 CT). The reserved paper-doll example sheet size, the 2048 px cap, the dimorphic list above, and permanent slot ids are decided (13:30–14:10 CT). Layer height, the single master palette and the PM size defaults are in §2.18. The 216 portrait presets and the complete faceset are decided (Owner 15:54 CT, 16:05 CT and 16:39 CT). Character map sprites are decided in §2.19. The open items above, plus O1 through O25 in that section, are the ones still listed.

## Appendix C. Existing assets

Counts below are names and JSON only, from this worktree, not from pixel reads.

| What exists | Count | Against the standard |
|---|---|---|
| Catalogue sheets / entries | 207 / 10089 | Ids already match the six-field shape (0 mismatches). Bands and biomes are the pre-DEC-030 vocabulary. Status: 9792 MISSING, 196 EXISTING_UNAPPROVED, 52 STAND_IN, 49 STOCK. No APPROVED. |
| Character / creature / equipment / face entries | 47 / 48 / 34 / 52 | Facings on character, creature and equipment entries are already S, W, E, N. None declare a diagonal. Face entries are 4 by 2. |
| Paper-doll rows | 34, all equipment | `legs` z1 (8), `torso` z2 (8), `head` z3 (2), `back` z4 (1), `shield` z5 (2), `held` z6 (13). Bodies: human male T0 × 28, human female T0 × 6. `clothes` and `fx` are unused. Reusable as the z-order. Not a racial set. |
| Sidecars under `game/img` | 688 JSON | 157 of them have eight facings (137 filenames contain `8D`). Those are legacy sources. Mine S, W, E, N. The catalogue entries do not copy the diagonal list. |
| `$gen_*` charset PNGs | 474 files, 242 unique names | 116 pool keys in `UF_GeneratorPool.json` (adults, 10 children, elders), each baked twice (`$gen_<key>` and `$gen_c<id>`), plus test names under `characters/gen`. Human only. Part order in the baker: base(skin), cloth, hair, beard. East is mirrored from west. Hair ramps are raw RGB, not registry ids. |
| `face_gen_*` | same 474 / 242 split | Portrait order is base (the file is the head already in a stone arch), hair recolour, cloth. No separate arch layer. No beard on the face. Expression set is not the eight in **AS-FACE-003**. |
| `UF_Faces_*` | 37 PNGs | Culture sheets, 576 by 288. Layout is adult/elder by sex, not the eight expressions. |
| `$UF_Layer_*` | 24 PNGs | Names have no `__<race>` suffix. They fail **AS-STYLE-001** until renamed. Seven are cited by the catalogue. |
| Generator pool loci | skin 1–3, hair style 1–4, hair brown/blonde/black/red/silver, beard 0–3, clothing 1–4 | The visible-locus table extends this. Silver is the elder bake only. |
| People sheets | human 12 walk sheets; elf, dwarf, gnome have sheets; halfling, dragonborn, half-elf, half-orc, tiefling are empty strings | The nine race templates are not drawn. |
| SV battlers, spell-visual rows, summon slots, the 216 portrait presets, resource states, night ramps | not in the catalogue as this standard describes them | Follow-up leaves. Not this lane. |

Reusable now: the 48 px grid, the 144 face cell, the human 42 px scale row, and the SRD ids in `game/data/srd51/`. Character map sprites are the eight-direction clips in §2.19. Legacy, to be mined or replaced rather than extended: old 8-way creature sidecars, `$gen_*` mirrors, `$UF_Layer_*` names without a race, face sheets in the old 4-mood layout, and catalogue band ids from DEC-013.

## Rule index

The JSON `rules` object carries the same ids. The sentence here is the short form. The section above is the full rule.

- **AS-GLOBAL-001.** 48 px grid. Frame sizes are multiples of 48.
- **AS-GLOBAL-002.** DEC-011 flat 1:1. No blur, bloom, glow shader, ColorMatrix, parallax or alpha fade.
- **AS-GLOBAL-003.** Binary alpha. Brightness from drawn frames and ramps.
- **AS-GLOBAL-004.** One canonical master: 226 active S/T colours, 30 reserved slots. `uf.hex` is not a second master.
- **AS-GLOBAL-005.** Light from the top-left, 315° / 45°, baked.
- **AS-GLOBAL-006.** 1 px selout, local ramp, darker bottom-right, outer silhouette only.
- **AS-GLOBAL-007.** Drawn contact shadow. No baked ground-tile shadows. No shadow filter.
- **AS-GLOBAL-008.** Draw order: ground, strata, objects, body, equipment, effects, UI.
- **AS-GLOBAL-009.** Eighteen equipment slots in `DEUS_Anim` order.
- **AS-GLOBAL-010.** Catalogue id `BAND_BIOME_CATEGORY_TYPE_VARIANT_STATE`.
- **AS-GLOBAL-011.** `$` one character. `!` no foot offset. Otherwise eight per sheet.
- **AS-GLOBAL-012.** Sidecar beside each character and layer sheet.
- **AS-GLOBAL-013.** Charset block 3 by 4. Walk cycle unchanged.
- **AS-GLOBAL-014.** Faces 576 by 288, cells 144.
- **AS-GLOBAL-015.** SV battlers for humanoids and Medium+ creatures only.
- **AS-GLOBAL-016.** Tall 48×96, long 96×48, extra actions on more `$` sheets.
- **AS-GLOBAL-017.** No runtime scale, rotation or tint as a substitute.
- **AS-GLOBAL-018.** 32 layers, nine races. 1 layer = 5 ft = 48 px. Four quarters of 12 px.
- **AS-GLOBAL-019.** DEC-030 bands and six biomes. Legacy tokens are unknown.
- **AS-GLOBAL-020.** SRD 5.1. V64 retired.
- **AS-GLOBAL-021.** DEC-016 scale chart.
- **AS-GLOBAL-022.** Four directions, rows S, W, E, N.
- **AS-GLOBAL-023.** Eight-way sheets are legacy. Mine the straight rows.
- **AS-CRIT-001.** Critter rows idle, walk, attack, hurt, death.
- **AS-CRIT-002.** Optional fly and swim.
- **AS-CRIT-003.** Corpse and harvest icon. No face.
- **AS-CRIT-004.** Frame class sizes. Tiny/Small/Medium 48×48. Tall and long Large as specified.
- **AS-BEAST-001.** Natural-attack rows for Medium+.
- **AS-BEAST-002.** Condition treatments on Medium+ creatures.
- **AS-BEAST-003.** SV battler for Medium+.
- **AS-BEAST-004.** Large, Huge and Gargantuan squares from **AS-SIZE-001**.
- **AS-HUM-001.** Nine races, male and female templates.
- **AS-HUM-002.** Fixed socket ids, per-frame coordinates, human baseline.
- **AS-HUM-003.** Body, eyes, hair front/back, beard, racial parts.
- **AS-HUM-004.** Paper-doll z-order legs 1 through fx 7.
- **AS-HUM-005.** Faceset is one complete image, with the race background painted in and 8 expressions generated from it. Gear does not change it.
- **AS-HUM-006.** Age axis. Further steps open.
- **AS-HUM-007.** Greying and balding belong to the elder presets.
- **AS-HUM-008.** Preset pool. Sim genetics are stats only.
- **AS-HUM-009.** Humanoid action rows.
- **AS-HUM-010.** F01–F14 mapped onto those rows.
- **AS-HUM-011.** RMMZ balloons.
- **AS-HUM-012.** Fifteen conditions, DEC-011 treatments, Invisible as a contour.
- **AS-HUM-013.** Pregnancy stages 0–3 as a torso decal.
- **AS-HUM-014.** Handedness and grips. No blind mirror.
- **AS-HUM-015.** 27 custom armour icon variants. Race garb is reserved. Class outfits are icon-only.
- **AS-HUM-016.** Character attacks are whole-sprite clips. PM-proposed, Owner may amend.
- **AS-HUM-017.** Shields are items. Generic cape is not drawn.
- **AS-HUM-018.** Height, build, horns, tail, ears, scale colour.
- **AS-HUM-019.** Child template and stooped working elder.
- **AS-FACE-001.** Race background is painted into the complete portrait.
- **AS-FACE-002.** One complete faceset sheet of 8 expressions per preset. A faceset is not built from layers.
- **AS-FACE-003.** Eight expressions in index order.
- **AS-FACE-004.** 144 px face anchors.
- **AS-BIOME-001.** 30 biome-depth sets and 15 transitions.
- **AS-BIOME-002.** Autotiles, cliffs, ramps, water, vegetation, props, seasons, ramp.
- **AS-BIOME-003.** Known identities for four biomes. COLD and WILD ids required. HIGH is not a biome.
- **AS-BIOME-004.** Seasons are drawn frames, not a LUT.
- **AS-BLDG-001.** One piece list for every style, with ruined and charred.
- **AS-BLDG-002.** Six style profiles.
- **AS-BLDG-003.** Race, culture and profile gaps listed, not filled.
- **AS-BLDG-004.** Function, grammar, style, and the 12 building classes.
- **AS-ICON-001.** 32 px icon grid, 16 columns.
- **AS-ICON-002.** One icon per SRD item class, school, condition, status, resource and job.
- **AS-ICON-003.** Rarity is an overlay, not a new icon.
- **AS-ICON-004.** Icons share light, selout and ramps.
- **AS-ITEM-001.** Race-neutral item ids.
- **AS-ITEM-002.** Art key `itemId__race`, fallback `__human`.
- **AS-NODE-001.** Resource states, harvest, drop, six biome variants.
- **AS-ANIM-001.** Animated by default, closed static exceptions, 150 ms clock.
- **AS-FX-001.** Spell = cast + delivery + impact + sim.
- **AS-FX-002.** One animation per delivery shape, fixed frames.
- **AS-FX-003.** Thirteen damage-type impacts. Unknown types rejected.
- **AS-FX-004.** Sim effects and auras. `customPiece` hook.
- **AS-FX-005.** Draft 2020-12 spell-visual schema.
- **AS-FX-006.** Other Z layers show effects at 1:1.
- **AS-FX-007.** Projectile, impact, fire, water, weather.
- **AS-UI-001.** Balloons, rings, HP bars. Window skins are **AS-UI-004**.
- **AS-UI-002.** Selection rings on every selected layer.
- **AS-UI-003.** Colour is not the only channel. Minimum glyph 16 px.
- **AS-SUMMON-001.** 29 derived entity spells, each with a slot.
- **AS-SUMMON-002.** Summon-in, dismiss, controller marker.
- **AS-REMAIN-001.** Corpses, skeletons, decals, burned, frozen, flooded.
- **AS-HAUL-001.** Carry is drawn. Carts. Stockpile fills.
- **AS-VEH-001.** Cart, wagon, boat, siege, riding poses.
- **AS-LIGHT-001.** Drawn night and lights. Optional crisp tint, no blur, default off.
- **AS-MAP-001.** World map, minimap, markers, six banners.
- **AS-PROP-001.** Signs, gravestones, statues, notice boards.
- **AS-STYLE-001.** File-name patterns, including portraits, and the style-bible spec.
- **AS-UI-004.** Deus, Deus Dark, and one window skin per race. Player-selectable. Opaque RMMZ layout.
- **AS-REL-001.** Holy-symbol slot, altar, shrine, drawn aura, spellbook, scroll. Deity roster open.
- **AS-FARM-001.** Crop stages, livestock young and adult, pens, tamed variants.
- **AS-FOOD-001.** Raw and cooked, meals, ingredients, table, stockpile, icon.
- **AS-DUNG-001.** Cave wall, mine support, tunnel, underground water, crystal, ruin.
- **AS-TRAP-001.** Pit, spikes, pressure plate, locked and broken doors, poison gas, web, quicksand.
- **AS-LORE-001.** Historical portrait, era ruin, artifact, history log.
- **AS-SCENE-001.** Founding, coronation, disaster, war. Optional. Not a required set.
- **AS-ZONE-001.** Dig, build, stockpile, route, blueprint hatch.
- **AS-MKTG-001.** Marketing art is later. No required set.
- **AS-TAME-001.** Tamed variant, bound pose, cage, pen. Markers have no slot and no stats.
- **AS-TAME-002.** No creature armour, barding or crafted creature gear.
- **AS-VAR-001.** Per-biome and per-underground-band piece floors. PM decision, Owner may amend.
- **AS-VAR-002.** Variety seasons are palette swaps. Flip only when light-neutral.
- **AS-GENE-001.** 216 presets. One complete faceset each. Portrait colour method recorded per preset. Genetics do not select art.
- **AS-PORT-001.** Icon and 144 px portrait for every non-face entity.
- **AS-HEAD-001.** Preset head on a 12-frame grid and a head anchor on every body frame.
- **AS-ELDER-001.** 18 elder bodies. Adult armour, helmet and preset head via per-frame offsets. Dwarf elders are 36 px.
- **AS-GEAR-001.** One silhouette for weapons, tools and accessories, plus ramp and decal. Armour and race garb stay custom.
- **AS-MIRROR-001.** Offline W-to-E bake only, symmetric and light-neutral.
- **AS-POSE-001.** Prone, unconscious, sleep, sit, sneak, climb, with the condition map.
- **AS-BIOME-005.** Declared canonical biome sets must be the six DEC-030 ids.
- **AS-SIZE-001.** Creature frames in 48 px squares, from Tiny 1×1 through Gargantuan 4×4.
- **AS-SLOT-001.** Charset, face, tileset and action-row templates. 2048 atlas, 42×42.
- **AS-PIPE-001.** Exact size. No scaling. Crop transparent margins only. MISSING from empty slots.
- **AS-PROMPT-001.** Field templates per category. No prompt is run.
- **AS-GEN-001.** Generation log: generator, version, seed, outcome, reason codes.
- **AS-GEN-002.** Yield, cost and time per usable slot, per generator, category and template.
- **AS-GEN-003.** Template versions promote only when A/B yield wins.
- **AS-GEN-004.** PixelLab primary. Retro Diffusion standby. Nano Banana Pro for concepts only. Bake-off off.
- **AS-SRC-001.** Paper-doll layer sheet 768 by 1440. RMMZ sizes stay. No source side over 2048 px.
- **AS-REPO-001.** Slot map in the repo. Approved art on Git LFS. Raw generations, rejects and logs stay out.
- **AS-PREVIEW-001.** Animated in-game 1:1 preview. Owner yea or nay before merge.
- **AS-GEN-005.** One generator per category and per layered set. That generator is PixelLab.
- **AS-SEX-001.** Male and female adult and elder bodies, including dwarf at 36 px. Own child body. Preset head.
- **AS-SEX-002.** Creature `sexVariant` none or dimorphic. Both sets, with tamed and saddle, only when dimorphic.
- **AS-ID-001.** Permanent unique slot id per cell. Grammar, no reuse, catalogue link. Resolve by id only.
- **AS-ANCHOR-001.** Whole-pixel shift onto the slot anchor. Reject clip, proportion, size and head drift.
- **AS-EQUIP-001.** Landmark anchor tool. Equipment compositing is retired for character map sprites.
- **AS-LOOK-001.** Readable high-contrast fantasy. RMMZ standard top-down 3/4 view. Head about 1/5 of body height.
- **AS-PROJ-001.** RMMZ standard top-down 3/4 view. Row, then layer. Characters use eight directions. Terrain stays on the square grid.
- **AS-FURN-001.** Four facings. Symmetric reuse only by flag.
- **AS-TERR-001.** 48 px Wang dual-grid. 24 px decals. Trial findings recorded.
- **AS-TRACK-001.** Ground marks, four directions, three fade steps, path to road.
- **AS-GLOW-001.** Glow id, colour and radius on every light source.
- **AS-DEPTH-001.** RMMZ-style cliff and wall tiles, depth cues, and the depth-demo toggles.
- **AS-WITEM-001.** World sprite in the RMMZ standard top-down 3/4 view, anchor, footprint, sim hook.
- **AS-FEAT-001.** Seasons, damage stages, sim work rows.
- **AS-PLAY-001.** Placement sizes 12, 24 and 48. 6 px cells. 100,000 item benchmark.
- **AS-CONT-001.** Container window, four facings, open and closed, capacity.
- **AS-SCALE-001.** 5 ft layer, 48 px, 6 s tick. SRD 5-5-5 applies to spell areas and ranges only. Characters move 8-way. 64 px tiles not adopted.
- **AS-RENDER-001.** Integer scale, 2× default, nearest-neighbour.
- **AS-XLAYER-001.** Cross-layer collapse, breach and cave-in.
- **AS-QTR-001.** Four quarters of 12 px. Cliff and wall pieces are RMMZ-style tiles.
- **AS-SITE-001.** Construction ghost, scaffold, partial build.
- **AS-READ-001.** Grayscale value step. Table-with-items reference at true 2×.
- **AS-PAL-001.** Saturated palette, value first, grayscale before approval.
- **AS-LOCK-001.** LOCKED style defaults. Map-sprite caps, frame budgets, one master. Character facesets may use up to 64 colours, painterly soft shading and a black contour.
- **AS-MELEE-001.** Weapon-group clips. Fixed grip and rotating weapons are retired for characters.
- **AS-PM-001.** PM defaults the Owner may override. Elf is 43. Characters are not mirrored.
- **AS-VIS-001.** Whole-sprite map. No class outfits. Facesets never change with gear and are not built from layers.
- **AS-CHMAP-001.** 18 unarmored bases, 72 armor States, 90 armor states, 19 animations, eight directions. Plain-language prompts. Post-process checks. Owner sign-off. Create Character and Create State steps suspended (DEC-007 amendment, 2026-09-29).
- **§3 SOP.** Natural-world production: OBJECTS and MAPS only, ten steps, twelve QA items, one status ladder. Owner 2026-09-29.
