# DEUS — CHARART MASTER CHARTER & PRESENTATION SPECIFICATION
**Document ID:** `CHARART-SPEC-01`  
**Status:** `CHARART-02 CANDIDATE / HUMAN-GOLDEN-PACK INPUT` (NOT PRODUCTION-FROZEN)  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Mandatory Generator:** Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`) exclusively.  
**Architecture Freeze Condition:** The architecture may only become **FROZEN** after the Human Golden Pack demonstrates that the geometry, pose vocabulary, compatibility system, and runtime presentation produce visually excellent results in context.

---

## 1. Executive Summary & Core Principle

The DEUS character presentation system represents the visible life cycle of a simulated colonist:
- **Infancy & Birth** -> **Childhood** -> **Adolescence** -> **Adulthood** -> **Aging & Elderhood**
- **Rest & Sleep** -> **Eating & Drinking** -> **Social & Ordinary Interaction**
- **Logistics, Hauling & Carrying** -> **Resource Labor, Farming, Mining & Crafting**
- **SRD 5.1 Combat Actions, Weaponry, Defense & Spellcasting**
- **Injury, Condition States, Incapacity & Death**

### 1.1 The Golden Law of Minimal Authored Poses
**Logical actions may greatly outnumber authored body-pose families.**
The engine maps dozens of gameplay actions onto the **smallest set of visually excellent, reusable body-pose families**.
- No new pose family is authored merely because a gameplay action has a distinct code name.
- Modular equipment attachments, carry profiles, procedural decals, and object sockets provide visual variety without multiplying body animation sheets.
- All animations across all entities originate strictly from authentic Google Nano Banana Pro generations processed into RMMZ standard formats; zero after-effect animations or procedural sprite squashing.

### 1.2 Division of Responsibilities
- **AI owns artwork:** Generating expressive, anatomy-stable, palette-compliant pixel art spritesheets via Google Nano Banana Pro.
- **Code owns atlas packing:** Packing frames, slicing cell grids, caching textures, sorting layers, and resolving socket attachment transforms dynamically.

---

## 2. Master Logical Action Vocabulary (Taxonomy)

The simulation expresses 40+ logical actions across 15 semantic domains:

| Domain | Logical Actions | Semantic Intent |
|---|---|---|
| **LOCOMOTION** | `IDLE`, `WALK`, `RUN` | Neutral standing, standard 4-directional locomotion, hurried traversal. |
| **STEALTH** | `CROUCH`, `SNEAK` | Low center of gravity, deliberate slow creeping locomotion. |
| **VERTICAL** | `CLIMB`, `LADDER`, `FALL`, `LAND` | Surface scaling, ladder traversal, Z-axis descent, ground impact contact. |
| **WATER** | `WADE`, `SWIM` | Shallow water navigation (submerged legs), deep water swimming. |
| **REST** | `SIT`, `KNEEL`, `SLEEP`, `WAKE` | Chair/stump resting, prayer/tending, nocturnal sleep, awakening. |
| **MELEE COMBAT** | `READY`, `SWING`, `THRUST`, `OVERHEAD`, `BLOCK` | Combat guard, lateral slash, piercing jab, heavy downward chop, shield guard. |
| **BRAWL / SRD** | `UNARMED_STRIKE`, `SHOVE`, `GRAPPLE` | Straight punch/bash, two-handed forward push, physical grapple hold. |
| **RANGED** | `BOW_DRAW`, `BOW_RELEASE`, `XBOW_AIM`, `XBOW_FIRE`, `XBOW_RELOAD`, `THROW` | String tension, arrow release, crossbow aiming/firing/reloading, weapon throwing. |
| **SPELLCASTING** | `CAST_CHANT`, `CAST_AURA`, `CAST_RELEASE`, `CAST_CHANNEL`, `CAST_TOUCH` | Incantation focus, radiant mana gathering, palm projectile release, touch attack. |
| **PHYSICAL LABOR** | `WORK_OVERHEAD`, `WORK_SWING`, `WORK_THRUST`, `WORK_BENCH` | Tree chopping/pickaxe mining, stone quarrying, sickle harvesting, crafting table work. |
| **INTERACTION** | `USE_LOW`, `USE_MID`, `USE_HIGH`, `GATHER`, `HARVEST` | Ground interaction/chest open, table/door/well use, high lever pull, forage/gather. |
| **LOGISTICS** | `PICKUP`, `PLACE`, `DROP`, `DRAG`, `CARRY_PERSON`, `DRAG_PERSON` | Ground lift, deposit, drop, ground haul, carrying ally/infant, dragging wounded. |
| **SURVIVAL** | `EAT`, `DRINK` | Consuming food rations from pack/hands, drinking from waterskin/pond. |
| **EQUIPMENT** | `DRAW_WEAPON`, `STOW_WEAPON` | Unsheathing sidearm/greatsword, sheathing/slinging gear. |
| **INCAPACITY** | `HURT`, `STAGGER`, `PRONE`, `UNCONSCIOUS`, `DEAD` | Impact flinch, balance loss, ground crawl, limp collapse, death remains. |

---

## 3. Authored Body-Pose Families (The Minimal Candidate Set)

The current architecture establishes **14 authored body-pose families as the CURRENT MINIMAL CANDIDATE baseline**, not an immutable exact count.

### 3.1 Mapping of Logical Actions to Candidate Families

| # | Candidate Body Family | Keyframes (Col 0, 1, 2) | Mapped Logical Actions |
|---|---|---|---|
| **F01** | `LOCOMOTION_WALK` | Step L, Stand/Pass, Step R | `IDLE`, `WALK`, `RUN` (faster cadence), `WADE` (with water clip) |
| **F02** | `MELEE_SWING` | Windup, Slash Arc, Guard Recover | `SWING`, `READY`, `OFFHAND_ATTACK`, `UNARMED_STRIKE` (swing) |
| **F03** | `MELEE_THRUST` | Draw Back, Forward Thrust, Guard | `THRUST`, `SHOVE`, `HARVEST_SICKLE`, `SPEAR_JAB` |
| **F04** | `DEFEND_BLOCK` | Guard Raise, Active Block, Recover | `BLOCK`, `SHIELD_GUARD`, `DEFENSIVE_STANCE` |
| **F05** | `RANGED_DRAW` | Aim/Point, Full Tension Draw, Pluck Recoil | `BOW_DRAW`, `BOW_RELEASE`, `XBOW_AIM`, `XBOW_FIRE`, `THROW` |
| **F06** | `MAGIC_CAST` | Focus/Chant, Mana Aura Gather, Palm Thrust | `CAST_CHANT`, `CAST_AURA`, `CAST_RELEASE`, `CAST_CHANNEL`, `CAST_TOUCH` |
| **F07** | `HAUL_CARRY` | Step L (carrying), Stand, Step R (carrying) | `CARRY_FRONT`, `CARRY_TWO_HAND`, `CARRY_PERSON`, `EAT`, `DRINK` |
| **F08** | `WORK_OVERHEAD` | High Raise, Downward Impact, Recover | `WORK_OVERHEAD`, `CHOP_WOOD`, `MINE_PICK`, `HAMMER_ANVIL` |
| **F09** | `WORK_BENCH` | Reach Material, Work Hands, Rest | `WORK_BENCH`, `CRAFT_TABLE`, `COOK_POT`, `ALCHEMY`, `USE_MID` |
| **F10** | `INTERACT_LOW` | Reach Down, Work/Gather Ground, Rise | `USE_LOW`, `PICKUP`, `PLACE`, `DROP`, `GATHER`, `HARVEST_PLANT`, `DRAG` |
| **F11** | `STEALTH_SNEAK` | Crouch Step L, Low Stand, Crouch Step R | `CROUCH`, `SNEAK` |
| **F12** | `REST_SIT` | Approach/Turn, Seated Pose, Rise | `SIT`, `KNEEL` (variant), `RIDE_MOUNT` |
| **F13** | `VERTICAL_CLIMB`| Left Hand Reach, Pull Up, Right Hand Reach | `CLIMB`, `LADDER` |
| **F14** | `DOWNED_STATE` *(Under Test)* | Flinch/Drop, Crawl/Collapse, Rest/Remains | `FALL`, `HURT`, `STAGGER`, `PRONE`, `UNCONSCIOUS`, `SLEEP`, `DEAD` |

### 3.2 Candidate Overload Evaluation: F14 DOWNED_STATE
- **Current Candidate Overload:** `F14 DOWNED_STATE` overloads `FALL`, `HURT/STAGGER`, `PRONE`, `UNCONSCIOUS`, `SLEEP`, and `DEAD`.
- **Core Readability Mandate:** The game requires `SLEEP`, `PRONE`, `UNCONSCIOUS`, and `DEAD` to be **immediately and unequivocally visually distinguishable**. Nighttime settlements must never be mistaken for mass casualties.
- **Protocol:** Prototype this family in the Human Golden Pack proof before deciding whether these states can safely share one family via frame indexing/decals or if they require splitting into distinct families (e.g. `REST_SLEEP` vs `INCAPACITY_DOWNED`).
- **Policy:** Do NOT split them automatically in code. Do NOT freeze them prematurely. Let the visual proof decide.

### 3.3 Action-Sheet Flexibility & Frame Count Rules
- **Native RMMZ Compatibility:** Ordinary TV walking preserves the native RMMZ 3×4 / 12-frame single-character layout (`$filename.png`, 144 × 192 px, 48 × 48 px cells).
- **Flexible Action Frame Counts:** The engine does **NOT** require every action family forever to contain exactly three frames.
- **Variable-Length Sequence Support:** The runtime action architecture supports variable-length authored sequences (e.g. 4-frame, 6-frame, or 8-frame cycles) and deterministic multi-sheet packing whenever visual testing demonstrates that casting rituals, vertical climbing, complex grappling, sleep transitions, weapon draw/stow, or death collapses require additional frames for visual excellence.
- **Rule:** *Code owns atlas packing. AI owns artwork.*

---

## 4. Rig Architecture, Anchors & Dynamic Sockets

### 4.1 Transformation Schema
Socket coordinates are **not** one static universal table. Sockets follow a dynamic transformation schema:
$$\text{SocketTransform} = f(\text{rig}, \text{orientation}, \text{pose}, \text{frame}) \to [x, y, z\text{-order}]$$

### 4.2 Semantic Socket Inventory
All humanoid and branched rigs maintain stable semantic socket IDs:
- `GROUND_ORIGIN`: Authoritative terrain tile contact point.
- `SHADOW_ORIGIN`: Ground contact shadow center.
- `HEAD_TOP`: Helmets, coifs, hoods, crowns.
- `HEAD_FACE`: Eyes, masks, visors, eye patches.
- `MOUTH_BEARD`: Beards, moustaches, lower face wraps, pipes.
- `CHEST_CORE`: Cuirass, tabards, amulets, held crates/containers.
- `HAND_PRIMARY`: Dominant hand holding weapon, tool, wand, bow grip.
- `HAND_SECONDARY`: Off-hand holding shield, torch, bowstring, parrying dagger.
- `HIP_LEFT` / `HIP_RIGHT`: Scabbards, sidearms, pouches, quivers.
- `BACK_WEAPON`: Slung greatswords, polearms, large weapons.
- `BACK_SHIELD`: Stowed shield when walking or working.
- `BACK_TOOL`: Slung forestry axes, pickaxes, backpacks.

### 4.3 Reference Coordinate Baseline (`HUMANOID_V1`, Neutral Stand Down, 48 × 48 px)
*Coordinates anchored relative to cell top-left `(0, 0)`, ground baseline `y = 47`, center `x = 24`:*
- `GROUND_ORIGIN`: `[24, 47]`
- `SHADOW_ORIGIN`: `[24, 45]`
- `HEAD_TOP`: `[24, 6]`
- `HEAD_FACE`: `[24, 14]`
- `MOUTH_BEARD`: `[24, 18]`
- `CHEST_CORE`: `[24, 26]`
- `HAND_PRIMARY`: `[14, 30]` (Down facing)
- `HAND_SECONDARY`: `[34, 30]` (Down facing)
- `HIP_LEFT`: `[16, 34]`
- `HIP_RIGHT`: `[32, 34]`
- `BACK_WEAPON`: `[24, 22]`
- `BACK_SHIELD`: `[24, 24]`
- `BACK_TOOL`: `[24, 24]`

### 4.4 Handedness Specification
- Characters carry an immutable genetic trait: `dominantHand: "right" | "left"` (88% right, 12% left).
- Sockets `HAND_PRIMARY` and `HAND_SECONDARY` bind dynamically:
  - Right-handed: `PRIMARY = Hand_R`, `SECONDARY = Hand_L`.
  - Left-handed: `PRIMARY = Hand_L`, `SECONDARY = Hand_R`.
- **Asymmetry Rule:** The engine **never uses blind horizontal mirroring** for asymmetrical gear, heraldic shields, or eye patches. Left-handed characters evaluate true left-handed socket transforms.

### 4.5 Grip Modes & Item Presentation States
- **Grip Modes:** `ONE_HANDED` (Primary hand), `OFF_HAND` (Secondary hand), `TWO_HANDED` (Both hands bound), `VERSATILE` (Adapts based on whether Secondary is free).
- **Presentation States:** `HELD` (in hand), `HIP` (sheathed at side), `BACK` (slung on back), `SLUNG` (diagonal chest strap), `HIDDEN` (in container/pack).

---

## 5. Furniture & Object Interaction Sockets

Interactive objects expose explicit interaction metadata to prevent character clipping or floating:

```json
{
  "objectId": "bed_wood",
  "interactionPoint": { "x": 0, "y": 0, "z": 0 },
  "requiredFacing": "S",
  "preferredPose": "SLEEP",
  "entryTransition": "STAND_TO_SLEEP",
  "exitTransition": "SLEEP_TO_STAND",
  "anchorOffset": { "x": 0, "y": -4 },
  "clearance": [ { "dx": 0, "dy": 1 } ]
}
```

| World Object | Interaction Anchor | Required Facing | Preferred Pose | Visual Presentation |
|---|---|---|---|---|
| **Bed / Bedroll** | Center `(24, 20)` | `S` | `DOWNED_STATE` (Sleep) | Character lies aligned within bed frame; quilt renders at depth `z + 1`. |
| **Chair / Bench** | Center `(24, 28)` | Table-facing | `REST_SIT` (Seated) | Hips on seat, knees bent, feet on ground in front. |
| **Anvil / Forge** | North face `(24, 16)` | `N` | `WORK_OVERHEAD` | Worker stands south facing anvil; hammer strikes anvil face. |
| **Workbench / Table** | Edge `(24, 20)` | Inward | `WORK_BENCH` | Hands manipulate workpiece on table surface. |
| **Campfire / Hearth** | Clearance edge `(24, 36)` | Inward | `REST_SIT` / `KNEEL` | Sits 1 tile away from contained hearth; never inside fire tile. |
| **Well / Basin** | Rim `(24, 24)` | Inward | `WORK_BENCH` | Drawing bucket, washing, drinking. |
| **Chest / Cache** | Front `(24, 30)` | Inward | `INTERACT_LOW` | Stooping/kneeling opening chest lid. |
| **Wall Lever / Torch**| Wall base `(24, 24)` | `N` | `MELEE_THRUST` | Arm reaches upward to pull lever / ignite torch. |

---

## 6. Ground, Incapacity, Sleep & Condition States

### 6.1 Semantic Differentiation Matrix

| Presentation State | Body Pose | Eye State | Surface / Context | Visual Marker & Decals |
|---|---|---|---|---|
| **`SIT`** | Upright torso, knees bent | Open, relaxed | Chair, stool, bench, log | Hips aligned to seat height (`y=28`), feet on ground. |
| **`SLEEP`** | Relaxed supine or side curl | Closed, peaceful | Bed, bedroll, cot, straw pallet | Aligned in bed frame, blanket overlay, subtle breathing rise. |
| **`PRONE`** | Tactical low crawl | Open, alert | Dirt, floor, field | Weapon gripped in dirt, elbows propped, looking toward threat. |
| **`UNCONSCIOUS`** | Limp, asymmetrical sprawl | Closed, slack | Ground anywhere | Slack jaw, arms flung unnaturally, dropped weapon adjacent. |
| **`DEAD`** | Rigid or collapsed remains | Vacant or covered | Casualty site | Blood decal, dropped inventory sack, remains container tag. |

### 6.2 SRD 5.1 Condition Visual Mappings
- `Prone` -> Triggers `PRONE` tactical ground crawl.
- `Unconscious` -> Triggers `UNCONSCIOUS` limp sprawl.
- `Petrified` -> Freezes current pose; palette swaps to stone grayscale ramp from `art/palette/uf.hex`.
- `Burning` -> Retains pose with attached looping `fire_aura` VFX sprite at `CHEST_CORE`.
- `Invisible` -> Renders at 20% alpha with shimmering contour.
- `Poisoned` -> Subtle greenish tint pulse on character palette.
- `Exhaustion` -> Weary stooped posture, slowed movement cadence.

---

## 7. Logistics, Carrying & Rescue

1. `CARRY_FRONT`: Light materials, straw, fiber, crops held against chest (`HAUL_CARRY`).
2. `CARRY_TWO_HAND`: Heavy rigid containers (crates, chests, kegs) held firmly at waist/chest.
3. `CARRY_SHOULDER`: Heavy structural timber (logs), quarried stone rested across one shoulder.
4. `DRAG`: Heavy sledges or oversized logs trailing behind character.
5. `CARRY_PERSON`: Fireman's carry or two-arm cradle for infants or wounded comrades.
6. `DRAG_PERSON`: Urgent dragging of wounded colonist by shoulders away from fire/hazards.

---

## 8. Species-Independent Biological Life Stages & Pregnancy

### 8.1 Semantic Biological Stages
Life stages are semantic biological stages. The chronological age ranges below represent the **HUMAN demographic profile** and are **NOT universal across species**:

| Biological Stage | Human Profile | Sprite Height | Rig Standard | Capabilities |
|---|---|---|---|---|
| **`INFANT`** | 0–1 yr | 16 × 16 px | Non-walking dependent | Carried in arms (`CARRY_PERSON`) or crib. Zero labor/combat. |
| **`CHILD`** | 2–14 yrs | 28–36 px | `CHILD_V1` (Branched rig) | Light foraging, running, playing. Ineligible for heavy labor. |
| **`ADOLESCENT`** | 15–17 yrs | 38–42 px | `HUMANOID_V1` (Shared adult rig) | Slender torso variant (-2 px). Working age begins at `WORKING_AGE = 15`. |
| **`ADULT`** | 18–59 yrs | 40–44 px | `HUMANOID_V1` (Authoritative master) | Full military, artisan, and heavy construction capability. |
| **`ELDER`** | 60+ yrs | 38–42 px | `HUMANOID_V1` (Shared adult rig) | Stooped posture (-2 px crown), silver/white hair ramp. |

- **Species Independence:** Every species maps its chronological age and lifespan to these common biological stages independently (e.g. Elves remain in Child stage for decades; Dwarves reach working adolescence at 25).

### 8.2 Pregnancy Presentation Hook
- Governed by simulation state: `pregnancyStage: 0 | 1 | 2 | 3` (non-genetic condition).
- **Presentation Hook, Not Frozen Universal Geometry:** Do not assume one identical torso offset works across every humanoid race before those race rigs exist. Each race rig implements its own maternity silhouette treatment (waist widening overlay decal) without multiplying combat or armor sheets.

---

## 9. Combat Kinetics & Animation Event Markers

### 9.1 Directional Hit Reactions
When a unit takes damage in `DEUS_Combat` or `DEUS_Fire`:
- The hit packet provides: `{ impactDirection, impactForce, damageType }`.
- Character flinches (`HURT` frame) with an displacement vector away from the hit source.
- Excessive force triggers `STAGGER` or knocks unit into `PRONE`.

### 9.2 Event Marker Schema
```json
{
  "sequenceId": "melee_swing",
  "markers": {
    "ANTICIPATION": { "frame": 0, "audio": "weapon_whoosh" },
    "IMPACT": { "frame": 1, "audio": "blade_cut_flesh", "simulationHit": true },
    "RECOVERY": { "frame": 2, "audio": null }
  }
}
```
- **Frame Positions:**
  - Melee Swing (`F02`): Frame 0 = Windup; Frame 1 = Slash Arc / **IMPACT**; Frame 2 = Recovery.
  - Melee Thrust (`F03`): Frame 0 = Drawback; Frame 1 = Forward Jab / **IMPACT**; Frame 2 = Recovery.
  - Ranged Bow (`F05`): Frame 0 = Nock/Aim; Frame 1 = Tension Hold; Frame 2 = **RELEASE** (pluck recoil).
  - Magic Cast (`F06`): Frame 0 = Chant; Frame 1 = Aura Gather; Frame 2 = **RELEASE** (palm thrust).
  - Work Overhead (`F08`): Frame 0 = High Raise; Frame 1 = **CONTACT/IMPACT**; Frame 2 = Recovery.

---

## 10. Split Pixel & Render Policy by Asset Class

Render discipline is explicitly bifurcated by asset class:

### 10.1 Character Modular Components
- **Hard Pixel Edges:** Pure crisp pixel contours.
- **Binary Alpha:** Alpha is strictly `0` (transparent) or `255` (opaque) unless explicitly justified.
- **Sampling:** 100% nearest-neighbor point sampling. Zero bilinear filtering or subpixel translation.
- **Palette Discipline:** All pixels strictly snapped to `art/palette/uf.hex` (256 colors), 3–4 tonal steps per material ramp.

### 10.2 VFX / Shadow / Magic
- **Controlled Semi-Transparency:** May use controlled semi-transparency and dedicated shader/effect rules.
- **Independent Effect Rules:** Fire, smoke, magic aura bursts, spell projectiles, and ambient drop shadows are **never forced** through character-component binary alpha limitations.

---

## 11. Calibration & Drift Test Policy

- **No Raw Image Checksum Expectations:** The system does NOT expect regenerated art to match raw binary image checksums.
- **Deterministic Mechanical Checks:**
  - Dimensions (exact cell size, sheet dimensions).
  - Anchor geometry (ground baseline y=47, center x=24).
  - Silhouette bounds (bounding envelope limits).
  - Palette compliance (100% colors present in `art/palette/uf.hex`).
  - Pixel density (consistent chibi scale, ~3.0–3.2 heads).
  - Frame placement (exact grid alignment, zero bleed across cell borders).
  - Editable masks (clean separation of hair/beard/gear layers).
- **Visual Style Verification:** Contact-sheet and human review confirm artistic style, expression, and DEUS tone.

---

## 12. Equipment Visibility & Occlusion Rules

- **Full Great Helm:** Suppresses `hair_head`, `ears`, and `facial_hair`.
- **Open Barbute / Sallet:** Retains `beard` and `hair_back`, suppresses `hair_crown`.
- **Heavy Plate Cuirass:** Suppresses `clothing_torso` (tunic concealed beneath plate).
- **Heavy Plate Greaves:** Suppresses `clothing_pants_lower` (tucked into greaves).
- **Gauntlets:** Suppresses `clothing_sleeves_lower` (tucked into cuffs).
- **Cloak / Cape:** Renders at depth `z = body.z - 1` (behind back), draped over shoulders.

---

## 13. Nonhumanoid Extensibility

- `QUADRUPED_V1`: Wolves, horses, deer, cattle. Sockets: `MOUNT_SADDLE`, `HEAD_HORN`, `MOUTH_BITE`, `GROUND_ORIGIN`.
- `WINGED_BIPED_V1`: Hawks, bats, harpies. Sockets: `WING_L`, `WING_R`, `TALONS`.
- `SERPENTINE_V1`: Giant snakes, wyrms. Segmented locomotion pathing.
- `GIANT_HUMANOID_V1`: Trolls, ogres, giants (96 × 96 px multi-tile frames). Uses `HUMANOID_V1` socket topology scaled by 2.0×.

---

## 14. Simulation-Priority Interruption Rules

Animations never delay or block the simulation tick:
$$\text{Priority 1 (Hazard/Death)} > \text{Priority 2 (Incapacitated)} > \text{Priority 3 (Hurt/Flinch)} > \text{Priority 4 (Emergency Move)} > \text{Priority 5 (Active Job/Combat)} > \text{Priority 6 (Idle/Rest)}$$
Any higher-priority event immediately cancels active lower-priority animation frames.

---

## 15. The First Golden Pack Geometry Experiment (Pilot Proof)

Before generating the full Human Golden Pack or any additional races, execute the **SMALLEST visual geometry experiment** necessary to answer the core architectural questions:

### 15.1 Core Questions to Answer
1. Are 48 × 48 px cells adequate for high-fidelity serious chibi humanoid presentation?
2. Are three action frames adequate for convincing combat and work cycles?
3. Do sockets remain reliable and stable across facings and dynamic poses?
4. Can `SLEEP`, `PRONE`, `UNCONSCIOUS`, and `DEAD` be clearly and instantly distinguished?
5. Can hair, beard, helmet, and armor layers composite cleanly across action poses without visual clipping?
6. Does Face ↔ TV identity hold between portrait facesets and walking sprites?
7. Does the overall visual style authentically look like DEUS?

### 15.2 Exact Pilot Geometry Deliverables
- **Asset 1: Master Walk Sheet (TV)** — Adult Human Male (`$UF_Human_Male_Walk_Pilot.png`, 12 frames, 48 × 48 px).
- **Asset 2: Action Triad Sheet** — Adult Human Male containing:
  - Row 0 (South): Melee Swing (3 frames: Windup, Slash Arc, Recover)
  - Row 1 (West): Ranged Bow Draw (3 frames: Aim, Tension, Release)
  - Row 2 (East): Overhead Work Strike (3 frames: Raise, Impact, Recover)
  - Row 3 (North): Downed State Prototype (3 frames: Prone Crawl, Unconscious Sprawl, Sleeping Rest)
- **Asset 3: Modular Attachment Proof** — 1 Helmet, 1 Beard, 1 Sword, 1 Shield composited across the pilot frames.
- **Asset 4: Face ↔ TV Companion** — 48 × 48 px companion portrait proving facial identity with the sprite.
