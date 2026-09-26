# DEUS Master Asset Standard

**Document ID:** `DEUS-ASSET-STANDARD-01`
**Machine form:** `game/data/UF_AssetStandard.json` (`schemaVersion` `deus-asset-standard/1.0.0`)
**Spell rows:** `game/data/UF_SpellVisualTable.schema.json` (JSON Schema draft 2020-12)
**Checker:** `tools/art/validate_asset_standard.js`
**Status:** Normative for new asset work. No art is produced by this document (DEC-007).

This standard is the required set for every DEUS asset: what must exist, what it is named, how big it is, and how it is drawn. Rule ids (`AS-GLOBAL-003` and the rest of the index) are the same ids as the keys of `rules` in the JSON. A rule stated here with **MUST** is required. **SHOULD** is the default when a later Owner amendment is explicitly marked on that rule.

Owner rulings win over older art docs. The conflicts and the winning line are in Appendix A. Questions this document does not answer are in Appendix B. How today's files sit against the standard is in Appendix C.

The pose grid in **AS-HUM-016** is the standard's default and is marked **PM-proposed, Owner may amend**. Addenda A7 through A9 (Owner 12:56 CT through 13:24 CT, and the PM decisions marked on those rules) are §§2.13–2.16.

## 1. Global rules

**AS-GLOBAL-001.** The grid is 48 px. One cell is one 5 ft square. Frame widths and heights for characters, creatures, items and effects MUST be integer multiples of 48. UI icons are the one exception and use the 32 px icon grid in **AS-ICON-001**. The world-map overview is 1 px per tile (**AS-MAP-001**) and is a map image, not a world tile.

**AS-GLOBAL-002.** DEC-011: every Z layer renders at 1 source pixel = 1 screen pixel. There is no blur, bloom, glow shader, ColorMatrix, parallax, fog filter, or alpha fade. The first goal is a correct flat layer.

**AS-GLOBAL-003.** Alpha is binary: 0 or 255. Brightness, glow and "energy" come from drawn frames and palette ramps, not from a blend mode.

**AS-GLOBAL-017.** The runtime MUST NOT scale, rotate, mirror or tint a frame as a substitute for a drawn frame. A weapon angle is chosen from a pre-drawn cel (**AS-HUM-016**). Asymmetrical gear is not produced by flipping the opposite facing (**AS-HUM-014**).

**AS-GLOBAL-004.** Colour is named by ramp id, never by a fresh hex invented for one asset. `art/palette/uf.hex` is the canonical runtime palette now (ADR-002). `art/palette/deus_master_world_palette_v1.hex` (226 active colours, 30 reserved) and `game/data/DEUS_PaletteRegistry.json` (58 material ramps) are the approved target. New runtime colour sources use `uf.hex` entries until the migration leaf. The asset standard adds ramp ids the registry does not have yet (`RAMP_DMG_*`, `RAMP_SCHOOL_*`, `RAMP_RACE_*`, `RAMP_NIGHT`, `RAMP_HAIR_GREY`, `RAMP_CONDITION_*`, `RAMP_SCALE`). Those ids are the contract. Filling their hex is a follow-up, not a licence to pick colours in a generator prompt.

**AS-GLOBAL-005.** One light direction for every asset: top-left, 315° azimuth, 45° elevation (`docs/art/DEUS_ENVIRONMENT_MATERIAL_STANDARD.md` §2.1). Highlights sit on top and left edges. Core shadow sits on the bottom and right. The light is baked into the pixels.

**AS-GLOBAL-006.** Selout is a 1 px outline on the outer silhouette only. Its colour is the darkest step of the local material ramp, and the bottom and right of the silhouette use the deep-shadow step. It is not a global black. Internal edges (fingers on a grip, hair against the face) are not outlined. Seamless ground fills have no silhouette outline.

**AS-GLOBAL-007.** The contact shadow is a drawn ellipse at the shadow anchor (human baseline `[24, 45]` in a 48 px cell). Seamless ground tiles MUST NOT carry a baked shadow of an off-screen tree or mountain. There is no drop-shadow filter.

**AS-GLOBAL-008.** Back-to-front draw order of a layer: ground, strata faces and ramps, objects, the unit body, equipment, effects, UI.

**AS-GLOBAL-009.** Equipment on a unit draws in the `DEUS_Anim` slot order, bottom to top: feet, legs, waist, armor, torso, neck, shoulders, arms, hands, ring1, ring2, head, eyes, back, offHand, shield, mainHand, weapon.

**AS-GLOBAL-018.** DEC-013 geometry still governs the simulation: 32 Z layers, 1 cell = 5 ft, 1 layer = 10 ft, 5 strata of 2 ft, and exactly nine races (human, elf, halfling, dwarf, gnome, dragonborn, half-elf, half-orc, tiefling). Which race lives on which layer is open (Appendix B). A 9-layer test configuration may still exist. It is not the world.

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

**AS-GLOBAL-022.** Every character and every creature uses four directions. Row order on an RMMZ sheet is South, West, East, North (rows 0..3). That is the RMMZ order and the Owner ruling of 12:38 CT.

**AS-GLOBAL-023.** A sheet whose facings include `SW`, `NW`, `NE` or `SE` is a legacy 8-way source. The straight rows S, W, E, N may be mined. The diagonal rows are not part of the standard. The checker flags them.

**AS-GLOBAL-010.** A catalogue id is `BAND_BIOME_CATEGORY_TYPE_VARIANT_STATE`: six fields of letters and digits, joined by `_`, with a hyphen allowed inside a field (`docs/art/catalogue/SCHEMA.md`). Example: `ALL_SHARED_CREATURE_WILD-HORSE_V1_DEFAULT`.

**AS-GLOBAL-011.** A leading `$` means one character occupies the whole sheet. A leading `!` means an object sheet with no foot-offset shadow. A sheet with neither prefix holds eight characters in a 4 by 2 grid of charset blocks.

**AS-GLOBAL-012.** Every character sheet and every layer sheet has a sidecar with the same basename: `frameWidth`, `frameHeight`, `anchor`, `footprint`, `facings`, `animations`, `frameMs`. The default clock is 150 ms (**AS-ANIM-001**).

**AS-GLOBAL-013.** One charset block is 3 columns by 4 facing rows. Walk playback is stand, left step, stand, right step. Extra actions MUST NOT add a fifth row to that walk block.

**AS-GLOBAL-016.** Tall Large frames are 48 by 96. Long Large frames are 96 by 48. The matching RMMZ blocks are 144 by 384 and 288 by 192. Further actions are more `$` sheets, or sidecar-declared rows on those sheets. They do not change the 3 by 4 walk read.

**AS-GLOBAL-014.** A face sheet is 576 by 288: 4 columns by 2 rows of 144 by 144 cells.

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

**AS-HUM-003.** Part layers, back to front where they overlap the body: hair back (behind the body), body/skin, eyes, racial ears, horns, tail, scales, hair front, beard. Racial parts exist on the races that have them (elf and gnome and halfling ears, tiefling and dragonborn horns, tiefling tail, dragonborn scales). They are parts, not extra character sheets.

**AS-HUM-004.** Catalogue paper-doll z-order, matching the 34 existing equipment rows: `legs` 1, `torso` 2, `clothes` 2 (the clothes alias of torso), `head` 3, `back` 4, `shield` 5, `held` 6, `fx` 7. The 18 runtime slots still draw in **AS-GLOBAL-009** order. The coarse paper-doll layer is what the catalogue stores.

**AS-HUM-008.** Visible loci and the part or ramp they select. Inheritance rules stay in the sim. Today `geneticsFor` stores `variation`, `skinTone`, `hairColor`, `hairStyle`, `beard`, `clothing`, and inherits only `skinTone` and `hairColor`.

| Locus | Values | Maps to |
|---|---|---|
| `skinTone` | 1, 2, 3 | body part, ramp family `RAMP_SKIN` |
| `hairStyle` | 1, 2, 3, 4 | `hair-front` and `hair-back` |
| `hairColor` | brown, blonde, black, red | ramp family `RAMP_HAIR` |
| `greying` | natural, salt-and-pepper, grey, white | `RAMP_HAIR_GREY` on the hair parts |
| `beard` | 0 none, 1 goatee, 2 full, 3 braided | beard part, same hair ramp |
| `clothing` | 1, 2, 3, 4 | cloth part (today's bake only) |
| `balding` | `receding`, `crown`, `advanced` | three overlays on any hair style (**AS-GENE-001**) |
| `height` | low, mid, high | drawn height inside the scale-chart min/target/max |
| `build` | slight, average, broad | drawn width inside the scale-chart min/target/max |
| `horns` | 0, 1, 2 | `horns` part |
| `tail` | 0, 1 | `tail` part |
| `ears` | the race's ear part | `ears_<race>` |
| `scaleColor` | a step of family `RAMP_SCALE` | dragonborn `scales` part. Step count is open |
| `dominantHand` | right, left | socket binding |

**AS-HUM-018.** Height, build, horns, tail, ears and dragonborn scale colour are the body-variety loci in the table above. They do not change the frame class.

**AS-HUM-007.** Greying is the four-step ramp in that table, not a tint. The current baker's elder colour is a single silver ramp. Silver is the legacy bake of the white end (Appendix C), not a fifth step. Balding is the three overlays in **AS-GENE-001** (PM decision 13:02 CT, Owner may amend). They sit on any hair style.

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

**AS-HUM-005.** The face shows the armour, cloak and helmet the charset is wearing. Gear is face layer 6 (**AS-FACE-002**).

**AS-HUM-015.** Each of the nine races has a default garb for each of the 12 SRD classes (barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, warlock, wizard) and a light, medium and heavy armour set. That is 15 outfit ids and 135 art variants. The outfit id is race-neutral (`outfit_class_wizard`, `outfit_armor_heavy`). The art key is `outfitId__race` (**AS-ITEM-002**).

Owner 13:14 CT: these 135 outfits are fully custom drawings per race. The silhouette name below is the slot pattern, not a shared drawing. Ramp `RAMP_RACE_<RACE>` and motif `MOTIF_RACE_<RACE>` still apply. Weapons, tools and accessories are not in this custom set (**AS-GEAR-001**).

| Silhouette | Runtime slots | Paper-doll layers |
|---|---|---|
| light | feet, legs, torso, arms | legs, torso |
| medium | feet, legs, torso, arms, shoulders | legs, torso |
| heavy | feet, legs, waist, torso, arms, shoulders, hands, head | legs, torso, head |

Class garb uses light, except cleric, fighter and paladin, which use medium. Deforming pieces on class garb: bard and warlock `cape`; cleric, sorcerer and wizard `long-robe`. Armour-weight outfits have no deforming piece. Motifs: `MOTIF_CLASS_<CLASS>` and `MOTIF_ARMOR_<WEIGHT>`. The full 135-row matrix is `outfitMatrix` in the JSON.

**AS-HUM-016.** PM-proposed, Owner may amend. Body poses are drawn once per body template. Every non-deforming garb and armour layer is drawn frame-for-frame on that same grid. A weapon or shield does not rotate at runtime. Each frame stores an anchor `{x, y, angle}`. `angle` is one of `A0`, `A45`, `A90`, `A135`, `A180`, `A225`, `A270`, `A315`, and each of those is a pre-drawn cel.

Default pose grid (four directions each):

| Pose | Frames |
|---|---|
| swing, thrust, bow-draw, cast, death | 4 |
| bow-loose, hit, flinch, dodge, parry | 3 |
| prone, unconscious, sleep, sit, sneak, climb | 4 |

Walk stays the RMMZ 3-column cycle (**AS-GLOBAL-013**).

**AS-HUM-017.** Capes, long robes, large shields and bows mid-draw (`cape`, `long-robe`, `large-shield`, `bow-draw`) have their own frames for every pose in the grid. They are not one angled cel.

### 2.4 Faces

**AS-FACE-001.** Every race has its own faceset background, using that race's ramp and motif from **AS-HUM-015**.

**AS-FACE-002.** Layers, bottom to top: (1) race background, (2) optional faction frame/trim, (3) race body base (shoulders, neck, skin, age applied), (4) face (features, age lines, expression), (5) hair and facial hair, (6) worn gear matching the charset, (7) overlays (condition marks, scars, paint, tattoos).

**AS-FACE-003.** The 4 by 2 sheet is exactly these expressions, index order: 0 neutral, 1 happy, 2 angry, 3 sad, 4 surprised, 5 hurt, 6 determined, 7 afraid.

**AS-FACE-004.** Anchors on the 144 px cell, human baseline (other races keep the ids and may store new coordinates):

| Anchor | x, y |
|---|---|
| `crown` | 72, 36 |
| `eyeLine` | 72, 62 |
| `chin` | 72, 86 |
| `collarLine` | 72, 108 |
| `neckBase` | 72, 120 |

`collarLine` y = 108 matches the current portrait baker, which paints cloth on y 108..144. The stone arch in today's `face_gen_*` portraits is faction trim (layer 2), not the race background.

### 2.5 Biomes

**AS-BIOME-001.** Six biomes times five depth bands is 30 sets. Pairwise transitions are the 15 ids `VOLCANIC-WET`, `VOLCANIC-ARID`, `VOLCANIC-TEMPERATE`, `VOLCANIC-COLD`, `VOLCANIC-WILD`, `WET-ARID`, `WET-TEMPERATE`, `WET-COLD`, `WET-WILD`, `ARID-TEMPERATE`, `ARID-COLD`, `ARID-WILD`, `TEMPERATE-COLD`, `TEMPERATE-WILD`, `COLD-WILD`. The earlier biome in the DEC-030 list comes first.

**AS-BIOME-002.** Each of the 30 sets, and each transition, has: ground autotiles, cliffs, multi-layer ramps (one 10 ft layer across 5 squares, the five stratum heights), water, vegetation, props, four season frames, and a colour ramp id.

**AS-BIOME-003.** `TEMPERATE`, `WET`, `ARID` and `VOLCANIC` keep the physical identities in `DEUS_BIOME_IDENTITY_STANDARD.md` (there TEMP, WET, ARID, VOLC). `COLD` and `WILD` are required ids. What they look like is open (Appendix B). `HIGH` / Highland is not a sixth biome. Existing `HIGH_*` ramps stay in the registry until an Owner maps them.

**AS-BIOME-004.** Seasons are four named states: spring, summer, autumn, winter. They are not a runtime colour LUT and not a ColorMatrix. Weather snow (**AS-ANIM-001**) is a drawn overlay. It does not turn `COLD` into a snow biome, and it does not delete the weather. Variety pieces use the palette-swap frames in **AS-VAR-002** (PM decision, Owner may amend). The four names stay.

### 2.6 Buildings

**AS-BLDG-004.** Function, grammar and style are three layers (`DEUS_FACTION_ARCHITECTURE_STANDARD.md` §2). The sim sees the functional contract. The grammar is the layout (compact rectangle, L, longhouse, terrace, stilted pavilion). The style is the art kit. Universal classes: `dwelling_small`, `dwelling_medium`, `communal_hall`, `workshop_general`, `workshop_specialized`, `storehouse`, `shrine`, `watchtower`, `wall_gate`, `farm_outbuilding`, `stockpile_border`, `quarry_mine_support`.

**AS-BLDG-001.** The piece list is the same for every style: foundation, wall, wall-top, roof-edge, roof-fill, door, window, floor, pillar, connector, furniture, workstation. Each structural piece has states `intact`, `ruined` and `charred`. Construction is the same pieces shown as foundation, then walls, then roof, then finished openings and floors. It is not a second illustration style.

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

**AS-ITEM-001.** Items are race-neutral SRD items. There is one Plate Armor, one item id, one stat block. There is no Elven Plate Armor, no Dwarven Longsword, and no race token inside the item id. This covers armour, weapons, shields and the class garb in **AS-HUM-015**. The 135 outfits are art variants of 15 outfit ids, not 135 items.

**AS-ITEM-002.** The layer key is `<itemId>__<race>`, for example `outfit_class_wizard__elf` and `armor_plate__dwarf`. Lookup order: the race key, then `<itemId>__human`, then nothing. A missing variant is not tinted and is not replaced with another race's art. The runtime file is `$UF_Layer_<itemId>__<race>.png`. For weapons, tools and accessories the race key selects the ramp and the decal (**AS-GEAR-001**), not a second silhouette. Class garb and armour weights stay custom drawings.

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

**AS-GENE-001.** PM decision 13:02 CT, Owner may amend. Counts, per race and per adult body type `male` and `female`:

| Locus | Count |
|---|---|
| Hair styles | 12, of which 3 or 4 are race-distinctive |
| Balding overlays | 3: `receding`, `crown`, `advanced`, on any style |
| Facial hair | 8: `stubble`, `short`, `full`, `long`, `braided`, `mustache`, `goatee`, `forked` |
| Dwarf facial hair | those 8 plus at least `dwarf-plait` |
| Face shape | 4: `oval`, `round`, `square`, `long` |
| Eyes | 5 shapes; colour from `RAMP_EYE` |
| Brows | 4 |
| Nose | 5 |
| Mouth | 4 |
| Ears | 3 ids per race |
| Jaw | 3 |
| Skin | ramp `RAMP_SKIN`, steps 1, 2, 3 |
| Markings | 4 overlays: `freckles`, `moles`, `birthmark`, `patch` |
| Race features | 3 or 4 option ids per race |

Hair colour is one ramp, `RAMP_HAIR`, with 12 steps. The legacy names `black`, `brown`, `blonde` and `red` are four of the steps. The other eight ids are `step-05` through `step-12` until the Owner names them. Race-specific hair colours are an empty list until named (Appendix B). Greying stays the four steps in **AS-HUM-007**. No step gets its own drawing. The sim mixes the parents' genes and may apply a rare mutation. Age layers `child`, `adult` and `elder` sit on the same gene ids so the face stays recognisable. Races in `beardlessRaces` get no facial-hair parts. That list is empty until the Owner names a race (Appendix B). Option pictures for `rf1`–`rf3` are not named here.

**AS-PORT-001.** Owner 13:03 CT. Every non-face entity (item, creature, resource, building, workstation, spell) has a 32 by 32 icon and a 144 by 144 portrait for the inspect, tooltip and crafting view. The portrait uses a per-category background, the same palette and selout as the icon, and the rarity overlay from **AS-ICON-003**. A race-styled item uses that race's background. A race-neutral item has one portrait per race art variant. The file name is in **AS-STYLE-001**. A catalogue row that does not yet carry the fields is `unknown`. A row that has one of the two and not the other fails.

### 2.15 Head layers, elders, gear, mirrors, poses, biome files (A9)

**AS-HEAD-001.** Owner 13:14 CT. Hair, balding, beards and head-only race features are a grid of 12 frames: directions S, W, E, N, and head-state indices 0, 1 and 2, one frame each, each with an anchor. The gestures those indices draw are not named (Appendix B). Every body-template frame stores `headAnchor` `[x, y]` and `headState` in `0..2`. Long hair may add frames on `death` and `dodge` only. No other extra row is allowed. Placement is the anchor. There is no runtime transform.

**AS-ELDER-001.** Only the stooped elder body is a new sheet (**AS-HUM-019**). Garb, gear and hair use the adult sheets. Each body frame has a torso offset and a head offset, in pixels, that move those adult layers onto the elder body. The checker flags an elder-specific garb, gear or hair sheet, and any frame index with no offset. The numbers shipped here are a baseline stoop (`torso [0, 2]`, `head [0, 4]`) so the table is complete; authored frames replace the pair.

**AS-GEAR-001.** An accessory, a weapon or a tool has one silhouette. Race selects `RAMP_RACE_<RACE>` and a motif decal whose anchor is stored per frame and per angle. A second silhouette for the same item id fails. The 135 class and armour outfits stay custom per race (`pixels: custom-per-race` on `outfitMatrix`).

**AS-MIRROR-001.** A layer may be mirrored only when it is flagged `symmetric` and its shading is light-neutral. The mirror is an offline bake from W to E. The E frame is then stored. The runtime does not flip. A mirrored frame on any other layer fails. Asymmetric gear, including shields with a device, is drawn for each facing.

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

The runtime packs 2048 by 2048 atlases. The cell grid is 42 by 42 squares of 48 px (2016 px). The remaining 32 px is the padding budget, 1 or 2 px, and origins stay on the 48 px grid. A 4096 atlas is allowed for terrain only after a benchmark. The packer writes a lookup (`atlasId`, `x`, `y`, `w`, `h`, `catalogueId`, `sheetId`, `col`, `row`). That file is not created in this lane.

**AS-PIPE-001.** Owner 13:16–13:21 CT. The manifest records `catalogueId`, grid squares, frame count, anchor, `templateId`, palette ramp and layer role. The slot map records `sheetId`, column, row, `catalogueId`, facing, frame index, anchor and pixel size. Output must already be the final pixel size, on the grid, in the palette, on the anchor. Off-size, off-palette or off-anchor output is rejected and generated again. It is not resized. Cropping removes transparent margins only. `MISSING` is derived from an empty slot. One generation may target a whole strip; each slot is validated on its own, still at exact size. The tools are another lane. This lane generates no art.

**AS-PROMPT-001.** Owner 13:21 CT. `promptSpecTemplates` has one field template for each of: `humanoid-layer`, `face-layer`, `creature`, `terrain-tile`, `building-piece`, `item-icon`, `portrait`, `effect`, `ui`. Each template lists the same fields and the place the value comes from. There is no prose prompt. Nothing in this block is sent to a generator.

| Field | Source |
|---|---|
| `pixelSize`, `facing`, `poseFrameIndex`, `anchor`, `layerRole`, `catalogueId` | slot map |
| `frameGrid` | slot template |
| `paletteRampHex` | palette ramp (hex resolved from the ramp id when a tool runs) |
| `outlineRules` | **AS-GLOBAL-006** |
| `shadingRules`, `lightDirection` | **AS-GLOBAL-005** |
| `referenceImages` | golden reference library |
| `negativeConstraints` | rejection notes |

**AS-GEN-001.** Owner 13:22 CT and 13:24 CT. A generation log row has `slotId`, `promptSpecId`, `promptTemplateVersion`, `generator`, `generatorVersion`, `model`, `seed`, `settings`, `references`, `outcome` (`pass` or `fail`) and `reasons`. Reason codes are `size`, `palette`, `anchor`, `outline`, `style`. A fail with no reason is a violation.

**AS-GEN-002.** Yield is tracked over time per generator, per category and per template: first-pass acceptance, usable slots per generation, regenerations per slot, yield per cost, cost per usable slot, and time per usable slot.

**AS-GEN-003.** A prompt-template version is promoted only when an A/B comparison beats the current version's yield. Candidates stay candidates until then. Adapters for each generator are built from the one shared field template, not from a second spec.

**AS-GEN-004.** Generator records have `id` and `version`. No generator is assigned in this standard (`status: unassigned`). Routing sends a category to the generator with the best current yield per cost, and that choice is re-benchmarked on the fixed golden test set. The golden checks are palette, outline, anchor and style, against the shared reference library. A style LoRA or fine-tune is `optional-later` and needs an Owner decision after approved art exists. It is not a required set. No art is generated here.

## 3. Worked spell rows

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
8. **Eight-way sheets vs four directions.** `docs/VISION.md` line 15 (V3) requires eight facings. `docs/RMMZ_ASSET_SPEC.md` lines 49 and 101 describe the AR-600 8-row master. `docs/handoffs/GENERATOR_PROMPTS.md` rule 10 requires eight facings for every action. `docs/ASSET_REQUESTS.md` AR-600 does the same. **Owner 12:38 CT wins** for sprites: four directions, and 8-way sheets are mined for S, W, E, N. The charter line 38 already says "standard 4-directional locomotion". Engine text that keeps 8-direction movement (`docs/ART_STANDARD.md` F5, VISION V110) is movement, not a sheet rule. This standard does not change pathfinding.
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
26. **Shared outfit silhouette vs custom 135.** A1 said armour-weight silhouettes are shared and only the ramp and motif change. Owner 13:14 CT says the 135 class and armour outfits stay fully custom per race. **AS-HUM-015** and **AS-GEAR-001** follow 13:14. The silhouette field remains the slot pattern.
27. **Season frames vs palette swaps.** **AS-BIOME-004** names four season states and rejects a runtime LUT. PM 13:01 CT (**AS-VAR-002**, Owner may amend) builds variety-piece seasons as palette-swap frames on precomputed season ramps. That is not a ColorMatrix. The four names stay.
28. **Six profile window skins vs eleven selectable skins.** **AS-UI-001** had named a window sheet per building profile. Owner 12:57 CT (**AS-UI-004**) requires Deus, Deus Dark and one skin per race. The six profiles remain building styles and banners.
29. **Legal mirror.** Item 12 stands. **AS-MIRROR-001** is the only added path: an offline W-to-E bake of a layer flagged `symmetric` with light-neutral shading.
30. **Huge and Gargantuan multiples.** They were open. Owner 13:16–13:20 CT sets them in **AS-SIZE-001**. `geometry.json` still has nulls and was not edited.
31. **Creature equipment.** Owner 13:01 CT supersedes any creature-gear slot. **AS-TAME-002**. No barding.
32. **Window background opacity.** A generator handoff describes the RMMZ window background at 75% opacity. **AS-UI-004** keeps the rectangles and requires opaque pixels.
33. **Separate elder bakes.** The generator pool bakes elder keys as their own charsets. **AS-ELDER-001**: only the stooped body is a new sheet. Garb, gear and hair are the adult sheets plus the offset table.

## Appendix B. Open questions

These are not answered here.

1. **Face cultures that are not the nine races.** Painted face cultures besides the nine: goblin, orc, lizardfolk, kobold, undead, starborn, swarm, and automaton (stored as "like starborn"). `skins.cultures` also names serpentkin, demon, swarmer, dark_dwarf and dark_gnome. The question, as the brief states it: full humanoid paper-doll, or the monster set? The nine SRD races are humanoids under **AS-HUM-001** regardless.
2. **Age steps.** Child, adult and a stooped working elder are required. The charter also names infant (0–1, 16 px) and adolescent (15–17). How many steps, and whether there is a teen stage, is open.
3. **WBS.** This standard needs a dedicated leaf, and the per-category follow-ups need leaves. No WBS id is minted here and no WBS status is changed. Proposed follow-ups in the lane report use `PROPOSED-AL-NN` only.
4. **Other calls.**
   - What `COLD` looks like, given WG.00.04 forbids a snow biome, and where the existing `HIGH_*` ramps go.
   - What `WILD` looks like. No WG.00.04 entry describes it.
   - How many dragonborn scale-colour steps in `RAMP_SCALE`.
   - Eight of the twelve hair-ramp steps are still unnamed (`step-05` through `step-12`). Race-specific hair colours are unnamed.
   - The fourth marking id is `patch`. The Owner renames it if that is the wrong mark.
   - Race-feature option pictures (`rf1`, `rf2`, `rf3`) are unnamed. Ears, horns, tail and scales stay their own parts.
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
8. **Beards.** Which of the nine races skip the eight facial-hair parts? `beardlessRaces` stays empty until that answer. Dwarf has the eight plus at least `dwarf-plait`. How many further dwarf extras?

The four-direction rule is decided (12:38 CT). It is not in this appendix. Huge and Gargantuan frame squares are decided (13:16–13:20 CT). Balding overlays are three (PM 13:02 CT, Owner may amend). Those are not open questions.

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
| SV battlers, spell-visual rows, summon slots, 135 outfit variants, resource states, night ramps | not in the catalogue as this standard describes them | Follow-up leaves. Not this lane. |

Reusable now: the 48 px grid, the 3 by 4 S/W/E/N charset, the 144 face cell, the paper-doll z-order, the 18-slot draw order, the human 42 px scale row, the four-direction rows already on catalogue entries, and the SRD ids in `game/data/srd51/`. Legacy, to be mined or replaced rather than extended: 8-way sidecars, `$gen_*` mirrors, `$UF_Layer_*` names without a race, face sheets in the old 4-mood layout, and catalogue band ids from DEC-013.

## Rule index

The JSON `rules` object carries the same ids. The sentence here is the short form. The section above is the full rule.

- **AS-GLOBAL-001.** 48 px grid. Frame sizes are multiples of 48.
- **AS-GLOBAL-002.** DEC-011 flat 1:1. No blur, bloom, glow shader, ColorMatrix, parallax or alpha fade.
- **AS-GLOBAL-003.** Binary alpha. Brightness from drawn frames and ramps.
- **AS-GLOBAL-004.** Ramp ids. `uf.hex` now, master palette as the target.
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
- **AS-GLOBAL-018.** DEC-013: 32 layers, 5 ft cell, 10 ft layer, 2 ft strata, nine races.
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
- **AS-HUM-005.** Face matches worn charset gear.
- **AS-HUM-006.** Age axis. Further steps open.
- **AS-HUM-007.** Greying ramp and three balding overlays.
- **AS-HUM-008.** Visible genetic loci and their parts.
- **AS-HUM-009.** Humanoid action rows.
- **AS-HUM-010.** F01–F14 mapped onto those rows.
- **AS-HUM-011.** RMMZ balloons.
- **AS-HUM-012.** Fifteen conditions, DEC-011 treatments, Invisible as a contour.
- **AS-HUM-013.** Pregnancy stages 0–3 as a torso decal.
- **AS-HUM-014.** Handedness and grips. No blind mirror.
- **AS-HUM-015.** 9 × 15 outfit matrix. Pixels are custom per race. Slot pattern stays named.
- **AS-HUM-016.** Pose grid and pre-drawn weapon angles. PM-proposed, Owner may amend.
- **AS-HUM-017.** Deforming pieces have per-pose frames.
- **AS-HUM-018.** Height, build, horns, tail, ears, scale colour.
- **AS-HUM-019.** Child template and stooped working elder.
- **AS-FACE-001.** Per-race faceset background.
- **AS-FACE-002.** Seven-layer face stack.
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
- **AS-GENE-001.** Hair, balding, facial hair and face-gene counts. PM decision, Owner may amend.
- **AS-PORT-001.** Icon and 144 px portrait for every non-face entity.
- **AS-HEAD-001.** 12-frame head grid and a head anchor on every body frame.
- **AS-ELDER-001.** Elder reuses adult garb, gear and hair via per-frame offsets.
- **AS-GEAR-001.** One silhouette for weapons, tools and accessories, plus ramp and decal.
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
- **AS-GEN-004.** Adapters, routing, golden test set. Style tune is optional and later.
