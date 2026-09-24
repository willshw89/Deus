# DEUS — Racial Architectural Bible Specification & Template
**Document ID:** `DEUS-ARCH-RACE-01`  
**Status:** Authoritative Architectural Standard & Spec Template  
**Authority:** Gemini (Full-Stack Coordinator & Art Authority)  
**Companion Documents:**
- [`docs/art/DEUS_FACTION_ARCHITECTURE_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_FACTION_ARCHITECTURE_STANDARD.md)
- [`docs/systems/DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/systems/DEUS_WORLD_STRUCTURAL_ARCHITECTURE.md)
- [`docs/art/DEUS_ENVIRONMENT_MATERIAL_STANDARD.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_ENVIRONMENT_MATERIAL_STANDARD.md)
- [`docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/art/DEUS_SCALE_AND_ASSET_MASTER_BIBLE.md)

---

## 1. Disambiguation: Race vs. Faction Architecture

Project DEUS maintains a strict conceptual boundary between **Race** and **Faction**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   RACE vs. FACTION ARCHITECTURE                        │
├────────────────────────────────────────────────────────────────────────┤
│ RACE (Species Biology & Cultural Heritage):                            │
│ - Defines biological anatomy, height, genetics, and bodily scale.     │
│ - Defines architectural form, structural techniques, primary materials,│
│   roofline silhouettes, ornamentation, and door/window dimensions.     │
│ - Examples: Dwarf Stonehold Craft, Elven Bentwood, Human Timber-Frame. │
├────────────────────────────────────────────────────────────────────────┤
│ FACTION (Simulated Political / Social Organization):                   │
│ - Defines political borders, settlements, allegiances, laws, and wars. │
│ - Owns SYSTEM MENU THEME (panel framing, heraldry, accent palette,     │
│   material chrome) when any member of the faction is selected.         │
│ - A faction can be multi-racial: A Dwarf living in a Human frontier    │
│   settlement builds with Dwarven architectural techniques if assigned, │
│   but the settlement and UI menu carry the Frontier Faction's banner.  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Universal Structural Building Contract

Every building constructed by any race across Project DEUS breaks down into six universal structural components:

```text
             EXPLODED PHYSICAL BUILDING STACK
  
  [Z+1]  EXPLICIT CONSTRUCTIBLE ROOF SLAB (Thatch / Shingle / Stone)
         ▲ Requires vertical support from walls/pillars below
         ▲ Provides derived shelter & weatherproofing
         ▲ Vulnerable to fire, weight overload, and downward collapse
  
  [Z+1]  CEILING BEAMS / TIE-RODS / RAFTERS
         ▲ Spans lateral gaps up to material maxHorizontalSpan
  
  [Z0]   TWO-GRID-HIGH VERTICAL WALLS (48x96 px)
         ▲ Upper 48 px: Near-black cap (#08080C to #121218)
         ▲ Lower 48 px: Authentic racial material face
  
  [Z0]   OPENINGS (Doors, Gates, Windows, Arrow Slits)
         ▲ Sized to racial silhouette (e.g. 72px Human, 96px Dragonborn)
  
  [Z0]   INTERIOR FITTINGS & PROPS (Hearths, Beds, Workstations, Chests)
         ▲ Anchored to ground origin (y = 47)
  
  [Z0]   STRUCTURAL FOUNDATION / SUB-FLOOR (Curbs, Ashlar, Stilts)
         ▲ Connects structure to underlying geological terrain layer
```

---

## 3. Explicit Constructible Roofs: The Volumetric Law

$$\textbf{RULE: A room NEVER magically gains a roof merely because walls enclose it.}$$

Roofs in Project DEUS are explicit physical horizontal structural elements at elevation $Z+1$ (or higher):

### 3.1 Derived Shelter Mechanics
- A world cell is **Sheltered** if and only if an intact, weatherproof horizontal structural slab exists directly above it at $Z+1$.
- If colonists construct four walls but run out of thatch/timber for the roof, the interior remains **Exposed**. Rain soaks the beds, hearth fires can be extinguished by downpours, and sleeping colonists suffer the "Exposed to Elements" morale penalty.
- If a fire destroys half of a communal hall's roof, only the surviving covered cells retain shelter.

### 3.2 Material Trade-Offs & Physics Table
| Roof Style | Primary Materials Required | Weight per Tile | Max Lateral Span | Flammability | Weatherproof Rating | Labor Cost |
|---|---|---|---|---|---|---|
| **Pitched Thatch** | 4 Thatch Bundles, 2 Poles | $15\text{ kg}$ (Very Light) | $4\ T$ (Timber rafters) | High ($90\%$) | $80\%$ (Heavy rain leaks) | $1.0\times$ (Fast) |
| **Timber Shingle** | 4 Wood Planks, 1 Iron Nail | $45\text{ kg}$ (Light) | $5\ T$ (Hewn beams) | Moderate ($60\%$) | $95\%$ (Watertight) | $2.0\times$ (Standard) |
| **Dressed Stone Slab** | 3 Granite Blocks, 1 Mortar | $350\text{ kg}$ (Extremely Heavy) | $2\ T$ (Needs stone pillars) | Zero ($0\%$) | $100\%$ (Impervious) | $6.0\times$ (Massive) |
| **Turf Sod / Earth** | 3 Turf Slabs, 3 Heavy Logs | $180\text{ kg}$ (Heavy) | $3\ T$ (Stout timbers) | Low ($15\%$) | $90\%$ (Insulative) | $3.5\times$ (Substantial) |
| **Woven Living Canopy** | 2 Living Vines, 1 Tree Root | $20\text{ kg}$ (Organic) | $6\ T$ (Living branches) | Moderate ($40\%$) | $85\%$ (Dense leaf cover) | $2.5\times$ (Shaped over time)|

### 3.3 Fire Spread & Collapse Cascade
1. When fire reaches a flammable roof (thatch or shingle), the roof structural HP decays per second.
2. When roof HP reaches 0%, the roof slab collapses downward:
   - Spawns falling debris particles and heavy dust clouds on $Z0$.
   - Deals crushing blunt damage ($2\text{d}10$ physical) to any creature beneath.
   - Spreads active fire directly to interior furniture, beds, and wooden floors.
3. Stone slab roofs are completely fireproof, but if their supporting vertical walls are demolished or breached, the heavy stone slabs collapse immediately, obliterating everything beneath.

---

## 4. Interior/Exterior Transition & Visibility Rules

To prevent roofs and high walls from obscuring tactical micro-management:
1. **Roof Cutaway**: When any friendly colonist, player unit, or camera cursor steps across a doorway threshold into a building, the roof tiles at $Z+1$ fade to $0\%$ opacity over $0.2\text{ seconds}$.
2. **South Wall Dithering**: Because the elevated 3/4 top-down perspective places south-facing walls in front of interior floor tiles, any south-facing wall occluding a colonist, container, or interactable item renders with a **$50\%$ checkerboard dither pattern or $30\%$ alpha transparency**.
3. **Multi-Story Visibility**: Higher levels ($Z+1, Z+2$) remain hidden unless ascending a staircase or toggling the tactical elevation layer.

---

## 5. Historical Architectural Evolution & Multi-Era Settling

Project DEUS simulates centuries of world history. Ancient settlements must reflect historical depth rather than looking like uniform, freshly built models:

```text
  [FOUNDING ERA: YEAR 0 - 50]
  - Pure native racial architecture (e.g. raw logs, fieldstone).
          │
          ▼  Prosperity & Expansion
  [EXPANSION ERA: YEAR 50 - 200]
  - Upgraded dressed stone town hall, paved market street, reinforced gates.
          │
          ▼  Siege / Fire / Catastrophe & Recovery
  [POST-WAR RECONSTRUCTION: YEAR 200 - 400]
  - Ancient blackened stone foundations capped with rough timber repairs.
  - Visible masonry patches using different stone types.
  - Collapsed outer towers converted into vegetable garden walls.
```

---

## 6. The Racial Architectural Bible Authoring Template

When defining a new race's architectural grammar, copy and complete this standardized specification:

```markdown
# DEUS — Racial Architectural Bible: [RACE NAME]
**Race ID:** `race_[identifier]`  
**Cultural Archetype:** [e.g. Mountain Ashlar Stonemasons / Ancient Canopy Weavers]  
**Primary Biome Association:** [e.g. Highland Crags / Temperate Deciduous Forest]  

### 1. Cultural Philosophy & Silhouette Language
- **Guiding Metaphor:** [e.g. "Carved from the bones of the earth"]
- **Exterior Silhouette:** [e.g. Low, broad, horizontal, massive, trapezoidal]
- **Proportion Ratio:** [Wall thickness to height, window-to-wall ratio]
- **Color Key & Textures:** [Dominant palette ramps from uf.hex]

### 2. Materials & Construction Hierarchy
- **Tier 1 (Crude / Emergency):** [e.g. Rough fieldstone, split logs]
- **Tier 2 (Standard Settlement):** [e.g. Dressed ashlar granite, seasoned pine]
- **Tier 3 (Monumental / Civic):** [e.g. Polished basalt, runic bronze plating]

### 3. Structural Component Matrix (48px Modular Kits)
- **Foundations:** [Footing treatment, height off ground, terrace rules]
- **Vertical Walls (48x96 px):** [Lower 48px material texture, upper 48px black cap convention]
- **Openings (Doors/Windows):** [Door dimensions, arch style, lintel treatment, shutters]
- **Roof Form:** [Style, pitch angle, materials, overhang depth, ridge ornaments]
- **Supports / Pillars:** [Corner posts, internal tie-beams, portico colonnades]

### 4. Interior Spatial Layout & Functional Grammar
- **Hearth Placement:** [Central fire pit / stone chimney / elevated brazier]
- **Bedding Culture:** [Sleeping benches / wool pallets / hammocks / four-poster frames]
- **Storage Philosophy:** [Sunken floor cellars / wall shelving / iron-bound coffers]

### 5. Historical Weathering & Wear States
- **Chipped / Weathered:** [Masonry cracks, moss creep, faded whitewash]
- **Burned / Scorched:** [Soot patterns above lintels, charcoal-stained masonry]
- **Ruined / Breached:** [Jagged rubble breaches, collapsed roof beams]

### 6. Nano Banana Pro Modular Generation Prompt Matrix
- [Insert packed atlas prompts declarations following AGENTS.md Rule 11 & 13]
```

---

## 7. Nano Banana Pro Generation Protocol for Architectural Modular Kits

When generating modular 48px architectural tile kits via Google Nano Banana Pro:
1. **Model:** Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`).
2. **Layout:** Packed atlas with exact pixel grids (AGENTS.md Rule 13).
3. **Black Wall-Top Rule:** All 2-tile high vertical wall pieces MUST feature the top 48px rendered as flat near-black (`#08080C` to `#121218`) with the lower 48px displaying authentic racial material face.
4. **Scale:** Exact $T = 48\text{ px}$ cell alignment, zero border bleed, zero text labels.
