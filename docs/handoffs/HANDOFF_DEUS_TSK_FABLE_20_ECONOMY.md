# DEUS-TSK-FABLE-20 / DEUS-ECON-01: Resource Economy & WorldGen Standard
**Finite Materials + Renewable Ecology + Physical Currency (Balance v0.1)**

**Authority & Coordination:** Gemini (DEUS Integration Coordinator)  
**Assigned Implementer:** Fable (Systems & Engine Implementation)  
**Status:** SPECIFICATION FROZEN / IMPLEMENTATION PENDING FABLE-19 COMPLETION  
**Date:** 2026-09-24  
**Reference Specification:** `docs/systems/DEUS_RESOURCE_ECONOMY_STANDARD.md`  
**Authoritative Machine Registry:** `game/data/DEUS_ResourceRegistry.json`  
**Harness & Verification Suite:** `tools/test_resource_economy_standard.js`  

---

## 1. Task Objective & Context

Ground the DEUS world generator and systemic simulation in **physical reality, material conservation, and economic scarcity**. 

Kill all arbitrary scattering of resources. Every ore vein, tree stand, water reservoir, and wild food patch must emerge deterministically from:
1. **Physical Geology:** Multi-cell 3D stratum clusters embedded directly into authoritative physical strata.
2. **Elevation / Macro-Z:** Depth distribution gradients across $Z=-2, -1, 0, +1, +2$.
3. **Biome Identity:** Characteristic material profiles across the 5 canonical biomes (`TEMP`, `WET`, `ARID`, `HIGH`, `VOLC`).
4. **Slow Silviculture:** Multi-year / decadal tree lifecycles; timber deficits follow deforestation.
5. **Finite Material Conservation:** Stone and metals cannot be created ex nihilo or deleted; they change form according to a strict closed-system ledger.
6. **Physical Currency:** Minted coins backed 100% by physical metal weights, with SRD denominations (`cp`, `sp`, `ep`, `gp`, `pp`) and provenance tracking.

---

## 2. Mandatory Gate & Implementation Dependency

> [!CRITICAL]
> **DO NOT BEGIN IMPLEMENTATION BEFORE FABLE-19B AND FABLE-19C COMPLETE.**
> 
> Resource veins, aquifers, and subterranean mineral bodies MUST be injected into **authoritative physical strata** (`DEUS_Levels.js`). If Fable generates veins into pre-strata legacy structures or temporary formats, that work will be immediately invalidated and discarded.
>
> 1. Complete `DEUS-TSK-FABLE-19B` (Cuts + Caves on Strata).
> 2. Complete `DEUS-TSK-FABLE-19C` (Five-Plane Depth Compositing).
> 3. Verify native RMMZ smoke test passes.
> 4. Receive explicit Owner / Coordinator authorization for `DEUS-TSK-FABLE-20`.

---

## 3. Scale, Population & Calibration Targets (Balance v0.1)

### World Scale & Baseline
* **Grid Dimensions:** $256 \times 256$ cells per macro Z level.
* **Macro Z Levels:** 5 discrete levels ($Z=-2, -1, 0, +1, +2$).
* **Total Macro Cells:** $327,680$ cells ($5\text{ ft} \times 5\text{ ft} \times 5\text{ ft} = 125\text{ cu ft}$).
* **Strata Per Macro Cell:** 5 physical strata ($1\text{ ft}$ vertical each).
* **Total Possible Physical Strata:** $1,638,400$ strata ($25\text{ cu ft}$ each).
* **Initial Population:** 9 factions $\times$ 8 founders = $72$ colonists.
* **Target Design Population:** $1,200$ creatures (capacity headroom above 1,000+).

### Canonical Initial Racial Spawn Z Anchors (VISION V132)
* **$Z=-2$ (Deep Underworld):** Tiefling, Dragonborn
* **$Z=-1$ (Shallow Underworld / Caverns):** Dwarf, Gnome
* **$Z=0$ (Surface Ground / Lowlands):** Human, Half-Orc
* **$Z=+1$ (Highlands / Plateaus):** Halfling, Half-Elf
* **$Z=+2$ (Mountain Peaks / Canopy Crags):** Elf

*Note: These are initial historical worldgen spawn anchors, NOT permanent racial cages. Factions may expand, tunnel, climb, and migrate across all Z levels.*

---

## 4. Resource Classification & Calibration Targets

| Resource Class | Economy Type | Conserved? | Balance v0.1 Target Reserve | Deposit / Entity Target | Primary Biomes | Macro-Z Gradient |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **STONE** | Finite Material | **YES** | ~650,000 strata ($16.25\text{M cu ft}$) | Continuous rock beds | `HIGH` (1.8), `VOLC` (1.5) | Heaviest in $Z=-2, -1, +2$ |
| **WOOD** | Slow Renewable | NO | 25,000 mature / 10,000 young | Tree stands / groves | `TEMP` (1.6), `WET` (1.2) | Surface $Z=0$ (70%), $Z=+1$ (30%) |
| **FOOD** | Fast Renewable | NO | 25,000 creature-days (wild) | Forage, game, crops | `TEMP` (1.5), `WET` (1.2) | Surface $Z=0$ (60%), $Z=+1$ (25%) |
| **WATER** | Fast Renewable | NO | Dynamic hydrological balance | Aquifers, rivers, springs | `WET` (2.0), `TEMP` (1.3) | All Z levels (aquifers in $-1, -2$) |
| **FIBER** | Fast Renewable | NO | 50,000 economic units (wild) | Crops, flax, cotton, silkworms | `TEMP` (1.5), `WET` (1.3) | Surface $Z=0$ (60%), $Z=+1$ (30%) |
| **IRON** | Finite Material | **YES** | 80,000 units ($2.0\text{M cu ft}$ ore) | 100–150 vein clusters | `HIGH` (1.5), `TEMP` (1.2) | Deep bias: $Z=-2$ (30%) to $Z=+2$ (10%) |
| **COPPER** | Finite Material | **YES** | 40,000 units ($1.0\text{M cu ft}$ ore) | 60–100 vein clusters | `TEMP` (1.4), `HIGH` (1.3) | Deep bias: $Z=-2$ (30%) to $Z=+2$ (10%) |
| **SILVER** | Finite Material | **YES** | 4,000 units ($100\text{K cu ft}$ ore) | 25–40 vein clusters | `HIGH` (1.8), `VOLC` (1.3) | Deep bias: $Z=-2$ (40%) to $Z=+2$ (5%) |
| **GOLD** | Finite Material | **YES** | 400 units ($10\text{K cu ft}$ ore) | 10–20 vein clusters | `VOLC` (1.8), `HIGH` (1.5) | Deep bias: $Z=-2$ (45%) to $Z=+2$ (2%) |
| **PLATINUM** | Finite Material | **YES** | 40 units ($1.0\text{K cu ft}$ ore) | 3–8 vein clusters | `VOLC` (2.0), `HIGH` (1.2) | Extreme deep: $Z=-2$ (60%), $Z=+2$ (0%) |
| **STEEL** | Manufactured | **YES** | 0 natural (smelted from Iron+C) | Workshop production | Faction workshops | Dependent on iron & fuel |
| **ELECTRUM** | Manufactured | **YES** | 0 natural ($50\%\text{ Au} + 50\%\text{ Ag}$) | Mint / Foundry production | Faction mints | Dependent on gold & silver |

---

## 5. Strict Conservation of Mass Law

For all finite materials $R \in \{\text{STONE}, \text{IRON}, \text{COPPER}, \text{SILVER}, \text{GOLD}, \text{PLATINUM}, \text{STEEL}, \text{ELECTRUM}\}$:

$$\text{WORLD\_TOTAL}(R) = \text{CONSTANT}$$

$$\text{WORLD\_TOTAL}(R) = \sum \text{Deposits} + \sum \text{Loose Stock} + \sum \text{Inventories} + \sum \text{Buildings} + \sum \text{Furniture} + \sum \text{Equipment} + \sum \text{Coins} + \sum \text{Scrap/Rubble} + \sum \text{Staging}$$

### Rules of State Transition
1. **Extraction / Mining:** Reduces vein stratum volume; adds equal units of raw ore/loose stone to local ground inventory.
2. **Refining / Smelting:** Consumes raw ore; produces metal ingots at stoichiometric ratios. Zero mass vanishes.
3. **Manufacture / Construction:** Ingot/stone consumed; weapon/armor/building entity created. The entity retains `materialType` and `materialQuantity`.
4. **Destruction / Wear:** Broken or dismantled entities MUST spawn scrap/rubble matching their original component mass.
5. **Recycling / Salvage:** Remelting scrap recovers 100% of base metal back into ingots.
6. **No Spontaneous Generation:** Factions, merchants, wandering NPCs, or raids CANNOT spawn with items created ex nihilo. All starter gear and merchant goods are deducted from the world's unmined or stockpile reserves.

---

## 6. Physical Currency & Minting System

Currency represents physical tokens of precious metal. Project DEUS adopts standard SRD denominations:
* **Copper Piece (`cp`):** 1 copper value unit.
* **Silver Piece (`sp`):** 10 copper value units.
* **Electrum Piece (`ep`):** 50 copper value units ($50\%\text{ Gold} + 50\%\text{ Silver}$).
* **Gold Piece (`gp`):** 100 copper value units.
* **Platinum Piece (`pp`):** 1,000 copper value units.

### Minting Mechanics & Metadata
* Minting $100\text{ gp}$ consumes exactly 1 unit of physical Gold from loose stock.
* Melting down $100\text{ gp}$ returns exactly 1 unit of physical Gold to loose stock.
* Every coin stack tracks lightweight provenance metadata:
  ```json
  {
    "denomination": "gp",
    "quantity": 50,
    "metal": "GOLD",
    "mintFaction": "faction_human_01",
    "mintEra": 1
  }
  ```

---

## 7. Biological & Ecological Models

### Slow Silviculture Model
* Trees are long-lived biological entities with distinct growth phases:
  * Seedling: 1–2 years (vulnerable to grazing/trampling).
  * Sapling: 3–5 years (cannot yield structural logs).
  * Pole / Young: 6–15 years (yields 1–2 small timber poles).
  * Mature Timber: 16–50+ years (yields 4–8 structural logs + firewood + seeds).
* Felling a mature tree produces timber items and leaves a persistent **stump entity** (`Oak_stump`, etc.) in the physical world.
* Clear-cutting a forest without replanting results in decadal local timber deficits.

### Food & Metabolic Budget
* **1 Creature-Day = 2,000 kcal $\approx$ 3 lbs dry food.**
* Sustainable capacity for 1,200 creatures requires $\approx 438,000$ creature-days/year minimum.
* Initial wild stock ($\approx 25,000$ creature-days) guarantees early survival but forces immediate agricultural transition.

---

## 8. Starting Settlement Viability Guarantees

Every faction starting spawn location MUST satisfy strict minimum viability criteria within local walking radius:
1. **Immediate Food Reserve:** $\ge 720\text{ creature-days}$ of foragable wild food within 15 tiles (supports 8 founders for 90 days).
2. **Permanent Water Source:** Non-freezing, non-saline surface or aquifer water within 20 tiles.
3. **Basic Shelter Materials:** At least 20 trees or 200 loose stone units within 25 tiles.
4. **Starter Inventory Deductions:** All starter clothes, axes, pickaxes, and provisions count against the world conservation ledger.
5. **No Guaranteed Iron Mine:** Iron is NOT guaranteed at the doorstep; factions must prospect, trade, or expand to secure metals.

---

## 9. Implementation Files & Architecture (When Authorized)

### Permitted Implementation Files:
* `game/js/plugins/DEUS_WorldGen.js`: Implement 3D vein clustering, silviculture distribution, wild food patches, and biome multipliers.
* `game/js/plugins/DEUS_ResourceLedger.js` (**NEW**): World-wide conservation tracking, entity mass accounting, and state transition enforcement.
* `game/js/plugins/DEUS_Economy.js`: Currency minting, metal remelting, and scrap salvage recipes.
* `game/js/plugins/DEUS_Factions.js`: Initial racial spawn Z anchors and starting equipment inventory deduction.
* `tools/audit_resource_economy.js` (**NEW**): Headless CLI verification tool to audit whole-world totals and conservation invariance on any seed.

### Read-Only / Protected Files (DO NOT MODIFY):
* `game/js/plugins/DEUS_Levels.js` (Owned by FABLE-19 strata engine)
* `game/js/plugins/DEUS_Depth.js` (Owned by FABLE-19C depth compositor)
* `game/js/rmmz_*.js`, `game/js/main.js` (AGENTS.md Rule 9 core engine files)

---

## 10. Acceptance & Verification Gates

1. **Automated Handoff Test Suite:** `tools/test_resource_economy_standard.js` passes all checks (currently 68/68).
2. **Whole-World Seed Audit:** Running `tools/audit_resource_economy.js --seed <seed>` on 3 distinct seeds produces reserves within $\pm 10\%$ of Balance v0.1 targets.
3. **Conservation Invariance:** A 1,000-tick headless simulation involving mining, weapon smithing, item decay, combat destruction, and furnace remelting confirms zero drift in $\text{WORLD\_TOTAL}(R)$ ($0.000\%$ error).
4. **Deterministic Reproducibility:** Identical world seeds generate identical resource layouts and vein clusters.
5. **Zero Frame Rate Degradation:** Dynamic ledger queries execute in under $0.05\text{ ms}$ per tick.
