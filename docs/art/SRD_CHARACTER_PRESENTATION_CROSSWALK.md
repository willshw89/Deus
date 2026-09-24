# DEUS — SRD 5.1 → CHARART COMPLETE PRESENTATION CROSSWALK
**Document ID:** `CHARART-SRD-01`  
**Status:** Canonical Presentation Adaptation Standard (Frozen Specification)  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Machine-Readable Authority:** [`game/data/art/srd_character_presentation.json`](file:///c:/Users/snewt/OneDrive/Desktop/UF/game/data/art/srd_character_presentation.json)  
**Canonical Source:** SRD 5.1 Content Library (`game/data/srd51/`, CC-BY-4.0, 1,325 entries)  

---

## 1. Executive Summary & Core Law

The DEUS character presentation system bridges all mechanical entries from the System Reference Document 5.1 into the finite, reusable Project DEUS visual pipeline.

### The Fundamental Architectural Principle:
$$\text{GENETICS tells us WHO the creature/person is.}$$
$$\text{SRD tells us WHAT the item/action/spell/mechanical concept is.}$$
$$\text{CHARART tells us HOW that concept is represented visually.}$$
$$\text{FACTION ART tells us WHAT CULTURAL FORM it takes.}$$
$$\text{THE RIG tells us WHERE it physically attaches.}$$
$$\text{THE ACTION PROFILE tells us HOW it moves.}$$
$$\text{VFX tells us WHAT THE EFFECT LOOKS LIKE.}$$
$$\text{THE SIMULATION remains authoritative about WHAT ACTUALLY HAPPENED.}$$

**Hard Compression Rule:** We DO NOT generate unique complete character sheets for every item combination (e.g. `Dwarf_Female_Elder_Fighter_Longsword_ChainMail_Attack.png` is banned). Instead, a character's phenotype rig composites modular equipment layers, action profiles, and attached visual effects dynamically.

---

## 2. Complete Catalogue Classification Census (1,325 Entries)

Every single canonical SRD 5.1 entry in `game/data/srd51/` is accounted for without exception:

| Category | SRD Source Entries | PRESENTATION_REQUIRED | PRESENTATION_INDIRECT | NO_CHARACTER_PRESENTATION | DEFERRED_REVIEW |
|---|---|---|---|---|---|
| **Equipment** | 226 entries | **56** (37 weapons, 13 armor, 6 tools/gear) | **30** (secondary artisan tools) | **140** (vehicles, mounts, trade goods, small items) | 0 |
| **Spells** | 327 entries | **319** (all casting spells) | 0 | **8** (class spell lists) | 0 |
| **Creatures** | 317 entries | **317** (all monsters & beasts) | 0 | 0 | 0 |
| **Magic Items** | 240 entries | **238** (held, worn, consumable) | 0 | **2** (abstract tomes/manuals) | 0 |
| **Character Options**| 39 entries | 0 | **38** (races, classes, grappler) | **1** (acolyte background) | 0 |
| **Rules & Systems**| 176 entries | 0 | **15** (conditions) | **161** (rules, tables, hazards, appendices) | 0 |
| **TOTAL** | **1,325 entries** | **930 (70.2%)** | **83 (6.3%)** | **312 (23.5%)** | **0 (0.0%)** |

---

## 3. Semantic Socket Registry

Sockets define standardized anchor points on character bodies and objects. Sockets are **not** frozen to a single coordinate; coordinates transform dynamically per frame and facing:
$$\text{SocketTransform} = f(\text{rig}, \text{orientation}, \text{pose}, \text{frame}) \to [x, y, z\text{-order}]$$

### 3.1 Body Sockets (`bodySockets`)
- `GROUND_ORIGIN`: Foot contact point on terrain tile center (`y=47`).
- `SHADOW_ORIGIN`: Contact shadow center ellipse (`y=45`).
- `HEAD_TOP`: Helmets, coifs, hoods, circlets.
- `HEAD_FACE`: Eyes, masks, visors, eye patches.
- `MOUTH_BEARD`: Beards, moustaches, lower wraps, pipes, bite attacks.
- `CHEST_CORE`: Torso armor, tunics, amulets, carried chest crates.
- `ROOT_PELVIS`: Belt line, hips center, lower clothing waist.
- `HAND_PRIMARY`: Dominant hand grip (sword hilt, bow riser, wand grip).
- `HAND_SECONDARY`: Off-hand grip (shield straps, torch, bowstring, dagger).
- `PALM_PRIMARY`: Open dominant palm for spell release, touch attack, unarmed strike.
- `PALM_SECONDARY`: Open off-hand palm for aura gathering, two-hand cast.
- `HIP_LEFT` / `HIP_RIGHT`: Belt attachment for scabbards, pouches, quivers, tools.
- `BACK_WEAPON`: Slung greatswords, polearms, heavy arbalests.
- `BACK_SHIELD`: Stowed shield flat against back.
- `BACK_TOOL`: Slung forestry axes, pickaxes, miner's packs.
- `FOOT_LEFT` / `FOOT_RIGHT`: Foot contact for boots, greaves.
- `EFFECT_HEAD`: Halo/crown VFX origin over head.
- `EFFECT_CHEST`: Body aura, burning fire VFX origin at torso.
- `EFFECT_FEET`: Ground rune circle, entangle vines origin at feet.
- `CARRY_CENTER`: Center of mass for two-handed carried crates at waist.
- `CARRY_LEFT` / `CARRY_RIGHT`: One-handed carry / drag anchor left/right.

### 3.2 Item-Local Sockets (`itemSockets`)
- `GRIP_PRIMARY`: Pivot point where primary hand grasps handle.
- `GRIP_SECONDARY`: Secondary stabilizing grip point on two-handed shaft.
- `PIVOT`: Rotational center for weapon swinging or projectile tumbling.
- `TIP` / `BLADE_TIP`: Piercing point of blade, spear, dart, arrow.
- `BLADE_EDGE`: Cutting edge of sword, axe, scimitar.
- `IMPACT_POINT`: Striking surface of hammer, mace, flail, pick.
- `SHIELD_CENTER`: Boss or emblem center on shield face.
- `SHIELD_EDGE`: Rim of shield for shield bash.
- `BOW_GRIP`: Center wooden riser of bow held in hand.
- `STRING_GRIP`: Center point of drawn bowstring.
- `ARROW_NOCK`: Rear notch of projectile resting on string.
- `PROJECTILE_ORIGIN`: Muzzle/launch point where missile leaves weapon.
- `STAFF_TIP`: Top ferrule or crystal focus of staff.
- `WAND_TIP`: Focus tip of wand or rod.
- `LIGHT_ORIGIN`: Flame or glow origin on torch, lantern, candle.
- `CARRY_CENTER`: Object balance point when hauled.

---

## 4. Complete Weapon Presentation Crosswalk (37 Weapons)

All 37 canonical SRD weapons map cleanly onto **17 reusable weapon presentation families**:

| Weapon Family | Grip Mode | Stow Mode | Primary Action | Sockets Used | Example SRD Weapons |
|---|---|---|---|---|---|
| **`BLADE_ONE_HAND`** | `ONE_HANDED` | `HIP` | `SWING` | `HAND_PRIMARY`, `BLADE_EDGE` | Longsword, Scimitar, Shortsword, Rapier |
| **`BLADE_TWO_HAND`** | `TWO_HANDED` | `BACK` | `SWING` | `HAND_PRIMARY`, `HAND_SECONDARY` | Greatsword |
| **`DAGGER_SHORT`** | `ONE_HANDED` | `HIP` | `THRUST` | `HAND_PRIMARY`, `BLADE_TIP` | Dagger |
| **`AXE_ONE_HAND`** | `VERSATILE` | `BACK` / `HIP` | `SWING` | `HAND_PRIMARY`, `BLADE_EDGE` | Battleaxe, Handaxe |
| **`AXE_TWO_HAND`** | `TWO_HANDED` | `BACK` | `OVERHEAD` | `HAND_PRIMARY`, `HAND_SECONDARY` | Greataxe |
| **`BLUNT_ONE_HAND`** | `VERSATILE` | `HIP` | `SWING` | `HAND_PRIMARY`, `IMPACT_POINT` | Warhammer, Flail, Mace, Morningstar, Club |
| **`BLUNT_TWO_HAND`** | `TWO_HANDED` | `BACK` | `OVERHEAD` | `HAND_PRIMARY`, `HAND_SECONDARY` | Maul, Greatclub |
| **`SPEAR`** | `VERSATILE` | `BACK` | `THRUST` | `HAND_PRIMARY`, `TIP` | Spear, Trident, Javelin |
| **`POLEARM`** | `TWO_HANDED` | `BACK` | `THRUST` / `SWING` | `HAND_PRIMARY`, `HAND_SECONDARY` | Halberd, Glaive, Pike, Lance |
| **`STAFF`** | `VERSATILE` | `BACK` | `THRUST` | `HAND_PRIMARY`, `STAFF_TIP` | Quarterstaff |
| **`BOW`** | `TWO_HANDED` | `SLUNG` | `BOW_DRAW` | `HAND_PRIMARY`, `HAND_SECONDARY` | Shortbow, Longbow |
| **`CROSSBOW`** | `TWO_HANDED` | `BACK` | `XBOW_FIRE` | `HAND_PRIMARY`, `HAND_SECONDARY` | Heavy Crossbow, Light Crossbow, Hand Crossbow |
| **`SLING`** | `ONE_HANDED` | `HIP` | `THROW` | `HAND_PRIMARY`, `PIVOT` | Sling |
| **`THROWN_LIGHT`** | `ONE_HANDED` | `HIP` | `THROW` | `HAND_PRIMARY`, `TIP` | Dart |
| **`THROWN_HEAVY`** | `ONE_HANDED` | `SLUNG` | `THROW` | `HAND_PRIMARY`, `PIVOT` | Net |
| **`IMPROVISED`** | `ONE_HANDED` | `HIP` | `SWING` | `HAND_PRIMARY`, `IMPACT_POINT` | Torch, Bottle, Rock |
| **`UNARMED`** | `NONE` | `NONE` | `UNARMED_STRIKE`| `PALM_PRIMARY`, `HAND_PRIMARY` | Unarmed Strike |

---

## 5. Armor & Shield Coverage Profiles (13 Items)

| SRD Armor | Tier | Coverage Profile | Material Profile | Occluded Body Layers | Hair/Beard Compatibility |
|---|---|---|---|---|---|
| **Padded** | Light | `LIGHT_PADDING` | `LINEN` | `clothing_torso`, `clothing_pants` | Full visible |
| **Leather** | Light | `LIGHT_LEATHER` | `LEATHER` | `clothing_torso` | Full visible |
| **Studded Leather** | Light | `LIGHT_STUDDED` | `LEATHER` | `clothing_torso` | Full visible |
| **Hide** | Medium | `MEDIUM_HIDE` | `HIDE` | `clothing_torso` | Full visible |
| **Chain Shirt** | Medium | `MEDIUM_SHIRT` | `STEEL` | `clothing_torso` | Full visible |
| **Scale Mail** | Medium | `MEDIUM_SCALE` | `BRONZE` | `clothing_torso` | Full visible |
| **Breastplate** | Medium | `MEDIUM_BREASTPLATE` | `STEEL` | `clothing_torso` | Full visible |
| **Half Plate** | Medium | `MEDIUM_HALF_PLATE` | `STEEL` | `clothing_torso`, `clothing_pants` | Full visible |
| **Ring Mail** | Heavy | `HEAVY_RING` | `IRON` | `clothing_torso` | Full visible |
| **Chain Mail** | Heavy | `HEAVY_CHAIN` | `STEEL` | `clothing_torso`, `clothing_pants` | Tuck long beard into coif |
| **Splint** | Heavy | `HEAVY_SPLINT` | `STEEL` | `clothing_torso`, `clothing_pants` | Full visible |
| **Plate** | Heavy | `HEAVY_PLATE` | `STEEL` | `clothing_torso`, `clothing_pants`, `clothing_boots` | Hide head hair under helm |
| **Shield** | Shield | `SHIELD_STRAPPED` | `WOOD_DARK` / `IRON` | None | Full visible |

---

## 6. Material Presentation Library (18 Profiles)

Every equipped item, weapon blade, armor plate, or tool references an authoritative Material Profile. Each profile provides palette indices snapped to `art/palette/uf.hex`:
- **Metals:** `IRON`, `STEEL`, `BRONZE`, `COPPER`, `SILVER`, `GOLD`, `ADAMANTINE`, `MITHRAL`.
- **Organics:** `WOOD_LIGHT`, `WOOD_DARK`, `LEATHER`, `HIDE`, `BONE`, `HORN`.
- **Textiles:** `LINEN`, `WOOL`, `SILK`.
- **Minerals:** `STONE`, `GLASS`, `CRYSTAL`.

---

## 7. Spell Presentation Taxonomy (319 Spells)

The 319 SRD spells compress into **7 Cast Body Profiles** and **17 Delivery Profiles**:

### 7.1 Cast Body Profiles
- `CAST_QUICK` (42 spells): 1-frame swift gesture (e.g. *Shield*, *Misty Step*, *Feather Fall*).
- `CAST_STANDARD` (118 spells): 3-frame sequence (chant -> aura gather -> palm release).
- `CAST_PROJECT` (68 spells): Outstretched palm/focus aiming beam or projectile (e.g. *Fire Bolt*, *Ray of Frost*).
- `CAST_TOUCH` (28 spells): Step forward touching target with glowing palm (e.g. *Cure Wounds*, *Shocking Grasp*).
- `CAST_RAISE` (36 spells): Arms/staff raised overhead summoning ground/sky storms (e.g. *Call Lightning*, *Fireball*).
- `CAST_CHANNEL` (27 spells): Looped concentration posture holding ongoing field (e.g. *Witch Bolt*, *Telekinesis*).

### 7.2 Delivery Profiles
- `PROJECTILE` & `MULTI_PROJECTILE`: Linear flying missile entities spawned from `PALM_PRIMARY`.
- `RAY` & `LINE`: Continuous beams or linear corridor bursts.
- `CONE`: Expanding 60-degree wedge from caster.
- `REMOTE_TARGET`: Manifests directly on target without travel (e.g. *Sacred Flame*).
- `GROUND_POINT` & `CYLINDER`: Radial explosion or vertical column on target tile.
- `AURA`: Mobile radius following caster body.
- `WALL`: Continuous barrier spanning tile lines.
- `SUMMON`: Spawns independent creature/object.

---

## 8. Creature Rig Taxonomy (317 Creatures)

All 317 SRD monsters and beasts map to **13 Canonical Rig Families**:
1. `HUMANOID` (82 creatures): Bipedal upright, 48×48 cell (Commoner, Goblin, Skeleton, Guard).
2. `GIANT_HUMANOID` (28 creatures): Large bipedal 2-tile, 96×96 cell (Ogre, Troll, Hill Giant, Ettin).
3. `QUADRUPED` (94 creatures): Four-legged beasts, 48×48 or 96×96 (Wolf, Boar, Riding Horse, Dire Wolf, Lion).
4. `WINGED_BIPED` (16 creatures): Biped plus wings (Harpy, Gargoyle, Bat).
5. `SERPENTINE` (12 creatures): Segmented legless crawler (Giant Constrictor Snake, Couatl, Naga).
6. `AVIAN` (14 creatures): Birds with talons and wings (Eagle, Owl, Raven, Hawk).
7. `ARACHNID_INSECTOID` (18 creatures): Multi-legged arthropods (Giant Spider, Scorpion, Centipede).
8. `DRAGONIC` (22 creatures): Reptilian quadrupeds with wings and breath weapons (Red Dragon, Wyvern).
9. `AMORPHOUS` (9 creatures): Oozes and puddings (Black Pudding, Gelatinous Cube, Gray Ooze).
10. `PISCINE_AQUATIC` (8 creatures): Swimmers (Giant Shark, Aboleth, Hunter Shark).
11. `PLANT_FUNGAL` (6 creatures): Treants, Shambling Mounds, Violet Fungi.
12. `CONSTRUCT_MECHANICAL` (4 creatures): Animated Armor, Iron Golem, Clay Golem.
13. `MONSTROUS_SPECIAL` (4 creatures): Unique multi-part anatomies (Chimera, Hydra, Manticore, Roper).

---

## 9. Magic Items Presentation (240 Items)

- `BASE_ITEM_PLUS_MAGIC_MODIFIER` (84 items): Base weapon/armor geometry with emissive rune, elemental edge glow, or custom palette ramp (*Flame Tongue*, *Frost Brand*, *Holy Avenger*).
- `WEARABLE` (48 items): Cloaks, boots, rings, amulets worn on character body.
- `CONSUMABLE` (42 items): Potions, scrolls, oils, feathers consumed on use.
- `WONDROUS_HELD` (38 items): Orbs, rods, horns held in hand.
- `UNIQUE_OBJECT` (24 items): Bespoke wondrous shapes (*Iron Flask*, *Decanter of Endless Water*).
- `NO_CHARACTER_PRESENTATION` (4 items): Abstract tomes, manuals (*Tome of Clear Thought*).

---

## 10. Conditions Presentation Mapping (15 Conditions)

- **`Prone`**: Overrides body pose to `PRONE` tactical ground crawl.
- **`Unconscious`**: Overrides body pose to `UNCONSCIOUS` limp asymmetrical sprawl.
- **`Petrified`**: Freezes current pose; swaps palette to `STONE_GRAYSCALE` ramp.
- **`Invisible`**: Renders character sprite at 20% alpha with subtle contour shimmer.
- **`Poisoned`**: Applies subtle greenish tint pulse to character palette.
- **`Exhaustion`**: Forces stooped posture and slowed movement cadence.
- **`Paralyzed` / `Stunned`**: Freezes current pose (zero frame stepping).
- **`Grappled` / `Restrained`**: Attaches constraint decal/vines at `EFFECT_FEET`.
- **`Blinded` / `Deafened` / `Charmed` / `Frightened`**: Displays lightweight status indicator over `EFFECT_HEAD`.

---

## 11. Workload Compression Summary

Through systematic taxonomy classification, the massive SRD catalogue compresses into a remarkably compact set of reusable art assets:

$$\text{37 Weapons} \to \mathbf{17}\text{ Reusable Weapon Families}$$
$$\text{13 Armors} \to \mathbf{13}\text{ Coverage Profiles & 4 Material Ramps}$$
$$\text{319 Spells} \to \mathbf{7}\text{ Cast Body Profiles} \times \mathbf{17}\text{ Delivery Profiles}$$
$$\text{317 Creatures} \to \mathbf{13}\text{ Rig Families} \times \mathbf{12}\text{ Natural Attack Profiles}$$
$$\text{240 Magic Items} \to \mathbf{84}\text{ Base Modifiers} + \mathbf{24}\text{ Unique Shapes}$$

This guarantees that Project DEUS character presentation can express all 1,325 SRD mechanical concepts with **zero combinatorial spritesheet explosion**.
