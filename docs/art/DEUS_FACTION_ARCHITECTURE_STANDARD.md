# DEUS — Faction Architecture & Modular Building System Standard
**Document ID:** `DEUS-ARCH-FACTION-01`  
**Status:** Authoritative Architectural Standard & Generation Framework  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Companion Documents:**
- [`docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md)
- [`docs/systems/DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/systems/DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md)
- [`docs/art/DEUS_VISUAL_QUALITY_CONTROL_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_VISUAL_QUALITY_CONTROL_STANDARD.md)

---

## 1. Core Principle: Function vs. Style Separation

$$\textbf{One World Engine. Standardized Simulation Contracts. Modular Cultural Skins.}$$

In Project DEUS, a dwarven settlement, an elven glade, and a human frontier town do not require separate, hardcoded engine logic. The entire architectural system is governed by a 3-tier matrix:

$$\mathbf{\text{Building Function} \times \text{Settlement Archetype} \times \text{Faction Style Profile}}$$

1. **Shared Building Functions (Simulation Layer)**: The simulation engine (`DEUS_Projects.js`, `DEUS_Walls.js`, `DEUS_Floors.js`) cares only about functional contracts: shelter capacity, bed count, hearth heat radius, door passage, storage slots, workshop craft stations, and defensive perimeter integrity.
2. **Shared Structural Grammar (Geometry Layer)**: The volumetric rules established in [`DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/systems/DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md)—$T = 48\text{ px}$ grid, 2-grid vertical walls ($48\times 96\text{ px}$), direct vertical support, lateral spans, and roof cutaways—apply universally to every building across all races.
3. **Faction Style Profiles (Presentation Layer)**: Factions differ in **materials, silhouettes, rooflines, trim, door/window shapes, foundations, and decorative motifs**. Factions swap visual kits without changing a single line of simulation code.

---

## 2. The 3-Layer Building Contract

```text
  LAYER 1: UNIVERSAL BUILDING CONTRACT (Simulation Truth)
  Example: `dwelling_small`
  - Footprint: ~4×4 to 5×5 tiles
  - Capacity: 1 household (2–4 beds)
  - Features: 1 enclosed doorway, 1 safe hearth, 1 storage nook
  - Status: roofed, enclosed, insulated
                      ↓
  LAYER 2: GRAMMAR VARIANT (Layout Geometry)
  - Compact Rectangle (Standard frontier)
  - L-Shape (Extended courtyard)
  - Longhouse (Communal/lineage hall)
  - Terraced Cliff-Cut (Mountain hall / slope)
  - Stilted Pavilion (Riverbank / forest glade)
                      ↓
  LAYER 3: FACTION STYLE PROFILE (Visual Art Kit)
  - Materials: timber / granite / adobe / wattle / bronze
  - Roof: steep cedar shake / turf sod / stone slab / leaf canopy
  - Openings: arched timber / square post-lintel / gothic lancet
  - Props: cultural chairs, tables, beds, chests, hearths
```

---

## 3. Universal Building Classes (The Functional Catalog)

All settlements across all factions build from this standardized functional catalog:

| Building Class ID | Primary Function & Gameplay Contract | Typical Footprint ($T = 48\text{ px}$) | Key Functional Objects |
|---|---|---|---|
| `dwelling_small` | Household domestic shelter (2–4 colonists) | $4 \times 4$ to $5 \times 5\ T$ | 1–2 double beds, 1 hearth, 1 chest, 1 table, 2 chairs |
| `dwelling_medium` | Extended household / artisan home (4–8 colonists) | $5 \times 6$ to $6 \times 7\ T$ | 3–4 beds, 1 hearth, 2 chests, dining table, workbench |
| `communal_hall` | Founder shelter, feast hall, civic council | $6 \times 8$ to $8 \times 10\ T$ | Central kitchen hearth, 8–16 beds, banquet tables, notice board |
| `workshop_general` | Crafting district: carpentry, masonry, tailoring | $5 \times 5$ to $6 \times 6\ T$ | Workbench, tool rack, material stockpile nook, open facade |
| `workshop_specialized`| High-heat/heavy craft: blacksmith, smelter, kiln | $5 \times 5$ to $6 \times 6\ T$ | Stone forge, charcoal hearth, anvil, quench tub, ingot racks |
| `storehouse` | Bulk commodity storage, dry food cache | $5 \times 6$ to $7 \times 8\ T$ | Stacked crates, barrels, grain bins, shelving, heavy latch door |
| `shrine` | Spiritual rest, prayer, temple rites, mana recovery | $4 \times 4$ to $6 \times 6\ T$ | Altar, braziers, prayer benches, ceremonial banners |
| `watchtower` | Elevated sentry post, early threat detection | $3 \times 3\ T$ (base, 2–3 levels) | Ladder/stairs to $Z+1/Z+2$, arrow slits, sentry brazier |
| `wall_gate` | Perimeter defense, controlled entry checkpoint | $1 \times 2\ T$ to $1 \times 3\ T$ (portal) | Reinforced wooden/iron gate, flanking wall crenellations |
| `farm_outbuilding` | Crop shelter, drying shed, animal shelter, pen | $4 \times 5$ to $5 \times 6\ T$ | Hay bedding, feed troughs, tool pegs, partial wattle walls |
| `stockpile_border` | Organized outdoor resource designation | Variable ($3 \times 3$ to $8 \times 8\ T$) | Low split-rail fence, log stakes, corner stone markers |
| `quarry_mine_support`| Adit entry, timber shoring, stone crane base | $3 \times 3$ to $4 \times 4\ T$ | Heavy timber portal frame, ore cart tracks, shoring beams |

---

## 4. Modular Tile Families: The Pieces-Not-Buildings Rule

$$\textbf{RULE: Faction art generators produce MODULAR PIECES, never monolithic illustrations.}$$

Each faction style pack delivers a matched kit of 48px tile components that assemble dynamically in engine:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   FACTION MODULAR PIECE KIT (PER STYLE)                │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Foundations:      Bare turf, dressed stone footing, raised stilts,  │
│                      retaining terrace wall.                           │
│ 2. Walls:            Straight sections (N/S, E/W), exterior corners,   │
│                      interior partitions, windowed sections, ruined.   │
│ 3. Wall Tops:        Top cap transition connecting with structural Z. │
│ 4. Roof Edges:       Gable end left/right, eaves bottom, ridge top.    │
│ 5. Roof Fills:       Seamless repeating roof pattern (shingle/thatch). │
│ 6. Openings:         Open doorway, closed door, open window, shuttered.│
│ 7. Pillars & Posts:  Corner timbers, stone pilasters, verandas.        │
│ 8. Connectors:       Exterior stairs, interior ladders, ramps.         │
│ 9. Props & Furniture:Bed, table, chair, storage chest, barrel, hearth. │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Faction Style Profiles: Visual Bibles

### 5.1 Faction: Human Frontier (`human_frontier`)
- **Aesthetic**: Grounded, utilitarian, historical Arthurian / Western medieval frontier (Ultima VII + DF inspiration). Lived-in, repaired, patched.
- **Primary Materials**: Hewn oak/pine logs, fieldstone footings, weathered timber planks, linen, iron nails.
- **Roof Language**: Steep pitched gables with weathered cedar shingles or layered wheat thatch. Modest overhangs.
- **Wall Language**: Lower 1-tile stone foundation with upper timber framing and daub fill; rough horizontal log stack for outbuildings.
- **Openings**: Rectangular post-and-lintel timber doors ($1\ T$ wide, $1.5\ T$ tall). Small shuttered square windows; no expensive glass.
- **Foundations**: Fieldstone curb raising wood above mud; low timber stoops.
- **Decorative Vocabulary**: Weathered wooden carving on gable ends, simple heraldic cloth banners (indigo, forest green, madder red), iron horseshoe above door, drying herbs on rafters.
- **Associated Props**: Iron-banded oak barrels, slatted crates, stone well with wooden bucket and winch, central stone hearth with iron pot crane.

### 5.2 Faction: Dwarf Stonehold (`dwarf_stonehold`)
- **Aesthetic**: Monumental, dense, subterranean or cliff-hewn, engineered permanence. Minimal exposed timber.
- **Primary Materials**: Dressed granite ashlar, basalt slabs, bronze/iron reinforcement bands, slate, mortarless dry-stone joints.
- **Roof Language**: Low, heavy stone-slab roofs, flat fortified crenellations, or direct cliff-face overhangs (living rock ceiling).
- **Wall Language**: Thick, massive dry-stone masonry with bevelled edges and interlocking ashlar blocks. Heavy pilasters at all corners.
- **Openings**: Massive square or trapezoidal stone lintels. Heavy iron-plated oak doors with runic lock plates. Narrow arrow-slit windows.
- **Foundations**: Hewn directly into solid bedrock ($Z0/Z-1$) or heavy stepped granite retaining terraces.
- **Decorative Vocabulary**: Crisp geometric interlace, runic inscriptions carved into lintels, bronze rivet bands, stone braziers with burning anthracite.
- **Associated Props**: Heavy stone anvils on basalt blocks, solid oak chests with iron bands, stone slab workbenches, low broad sleeping benches with thick furs.

### 5.3 Faction: Elf Glade (`elf_glade`)
- **Aesthetic**: Organic, sweeping, integrated with ancient forest flora. Asymmetrical, light, airy, and non-boxier.
- **Primary Materials**: Living heartwood, shaped roots, woven willow wattle, bark shingles, silver cord, polished riverstone.
- **Roof Language**: Graceful curved sweeps, swept eaves, living leaf and moss canopies, layered bark shakes.
- **Wall Language**: Intertwined living tree trunks serving as structural pillars, curved bentwood partitions, woven reed lattice screens.
- **Openings**: Tall, slender parabolic or pointed arch doorways without heavy doors (beaded or silk hangings). Open unglazed lancet windows.
- **Foundations**: Elevated tree platforms, stilted root walkways, or mossy earth mounds.
- **Decorative Vocabulary**: Elegant spiraling floral leaf carvings, glowing bioluminescent fungal lanterns, silver filigree wind chimes, woven vine tapestries.
- **Associated Props**: Slender bentwood chairs, woven rope hammock-beds, low polished wood tables, ceramic water urns.

### 5.4 Faction: Halfling Homestead (`halfling_homestead`)
- **Aesthetic**: Snug, warm, pastoral, domestic comfort, embedded into rolling knolls and gardens.
- **Primary Materials**: Whitewashed plaster, warm red brick, cob, thick turf sod, polished brass, seasoned fruitwood.
- **Roof Language**: Low, rounded, undulating turf sod roofs with blooming wildflowers, or low-pitched rounded mossy thatch.
- **Wall Language**: Smooth whitewashed plaster over wattle, curving fieldstone foundation curves, brick chimneys with terracotta pots.
- **Openings**: Distinctive round circular wooden doors with central brass knob. Round porthole windows with lace curtains and flower boxes.
- **Foundations**: Earth-sheltered burrow frontages or snug sunken flagstone floors.
- **Decorative Vocabulary**: Hand-painted floral borders around doorframes, brass weather vanes, tidy picket fences, copper kettles, garden trellises.
- **Associated Props**: Deep comfortable armchairs, round wooden dining tables laden with crockery, pantries with packed preserve jars, soft patchwork feather beds.

### 5.5 Faction: Dragonborn Citadel (`dragonborn_citadel`)
- **Aesthetic**: Proud, martial, monumental, ceremonial, geometric symmetry, heavy fire-resistant architecture.
- **Primary Materials**: Dressed black basalt, dark red sandstone, beaten bronze plate, cast iron, terra cotta tiles.
- **Roof Language**: Flared hipped roofs with angular tiered ridge crests, terracotta crest tiles, open smoke cupolas.
- **Wall Language**: Tall, imposing vertical stone blocks with polished bronze banding and monumental stepped buttresses.
- **Openings**: Extra-wide, tall doorways ($1.5\ T$ wide, $2\ T$ tall) to accommodate draconic snout and broad horned silhouettes. Heavy bronze double doors.
- **Foundations**: Massive raised podium terraces accessed by wide ceremonial stairs.
- **Decorative Vocabulary**: Sculpted draconic head gargoyles, blazing bronze tripods/braziers, geometric sun and fang motifs, crimson and gold banners.
- **Associated Props**: Heavy bronze-bound storage coffers, stone slab benches, weapon racks holding glaives and greatswords, open fire pits.

### 5.6 Faction: Goblin Salvage (`goblin_salvage`)
- **Aesthetic**: Improvised, chaotic, scavenged, dangerous, asymmetrical, patched together from battlefield detritus and felled saplings.
- **Primary Materials**: Rough untreated timber saplings, scrap iron sheeting, tanned rawhide, bone stakes, rusted wire, scavenged tiles.
- **Roof Language**: Slanted patchwork lean-tos, ragged hide canopies stretched over poles, mismatched scrap tin shingles.
- **Wall Language**: Crude palisade logs lashed with ropes, corrugated scrap metal plates nailed to timber, crooked scrap hurdles.
- **Openings**: Irregular ragged openings hung with burlap or animal hides; crooked patchwork doors held by leather hinges.
- **Foundations**: Bare dirt, crooked scrap stilts over mud, trash middens.
- **Decorative Vocabulary**: Animal skulls on pikes, painted red handprints, jagged bone wind-rattles, spiked barriers.
- **Associated Props**: Piles of rusted scrap, grease-stained cooking pits, crude pallet beds of dirty straw, mismatched barrels.

---

## 6. Four-Phase Production Pipeline

```
  PHASE 1: STANDARDIZATION (Complete)
  Lock building categories, functional contracts, modular piece lists,
  and scale bible integration.
                  ↓
  PHASE 2: CONCEPT BOARDS (Exploration)
  Generate six 16-bit concept boards per faction using Google Nano Banana Pro:
  1 village overview, 1 small dwelling, 1 hall, 1 workshop, 1 defense, 1 prop board.
                  ↓
  PHASE 3: HUMAN GOLDEN PACK PILOT (Baseline Proof)
  Author the complete modular piece kit for `human_frontier`:
  1 exterior wall family, 1 roof family, 1 door/window family, 1 floor family, 1 prop family.
  Proof in RMMZ Playtest under single canonical camera scale.
                  ↓
  PHASE 4: EXPANSION TO REMAINING FACTIONS
  Translate the proven modular kit structure across Dwarves, Elves, Halflings,
  Dragonborn, and Goblins.
```

---

## 7. Concept-Board Prompt Template for Nano Banana Pro

When generating faction concept boards, prompts inject the canonical scale rules and fixed camera context:

```text
[DEUS FACTION ARCHITECTURE CONCEPT PROMPT]
- Subject: [Building Class, e.g. dwelling_small / communal_hall / blacksmith forge]
- Faction: [e.g. human_frontier / dwarf_stonehold / elf_glade]
- View: Elevated 3/4 top-down RPG map perspective (FF5/FF6 late-16-bit clarity + Ultima VII/Dwarf Fortress simulation).
- Scale Ruler: 1 map tile = 48x48 px. Human Adult reference H = 42 px tall.
- Proportions: Door is 1 tile wide by 1.5 tiles tall (~72 px). Building footprint is [X by Y tiles].
- Material Palette: [Inject Faction Primary Materials, Roof Language, and Wall Language].
- Grounding: Lived-in, physical, organic additions, authentic weathering.
- Lighting: Late afternoon sun, light from upper-left, crisp pixel clusters, no blur, no anti-aliasing against background.
- Palette: Project DEUS palette (uf.hex).
```
