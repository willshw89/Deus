# BRIEF: NAT.04.01 — Lean Geomorphology & Soil Kernel

## 1. Objective & Authority
- **WBS ID**: `NAT.04.01`
- **Package**: Package 4: Geomorphology & Soil (Lean Natural World v1)
- **Lane**: `lane-by`
- **Branch**: `task/lane-by`
- **Writer**: `claude` (attempt 3, Owner-approved 2026-09-29 under AGENTS.md Rule 10; attempts 1–2 by `minimax` / `gemini` failed Grok review at `50c08991` and `97432c21`)
- **Reviewer**: `grok` (Grok 4.7 Independent Reviewer)
- **Governing Authorities**:
  - `DEC-037`: Natural World Phase Lock (Causal Chain: Physical Space -> Physical Matter -> Water -> Geomorphology/Soil -> Climate -> Flora -> Fauna -> Integrated Proof).
  - `DEC-039`: Rules-Source Hierarchy (Owner Decisions -> SRD 5.1 -> Vanilla Minecraft Java Edition gameplay/behavior reference -> DEUS physical laws & closed-mass invariants -> Original DEUS content).
  - `DEC-040`: Universal Closed-Mass World Invariant (WORLD_TOTAL_MASS(t) == WORLD_TOTAL_MASS(Year 0) in integer centipounds across all reservoirs).
  - `DEC-041`: Multi-Agent Orchestration Architecture & Natural World v1 Exit Gate.

---

## 2. Upstream Subsystem Contracts
- `game/js/plugins/DEUS_Levels.js`: 32-Z coordinate substrate ($Z \in [-16 \dots +15]$), 5 discrete 2-ft strata per 10-ft Z cell ($s \in [0..4]$).
  - Depth bands: Deep Earth $[-16 \dots -11]$, Caverns $[-10 \dots -5]$, Lowlands $[-4 \dots +1]$, Uplands $[+2 \dots +6]$, Highlands $[+7 \dots +11]$, Sky $[+12 \dots +15]$.
- `game/js/sim/hydrology/aquifer.js` (`NAT.03.01`): Hydraulic head, Darcy flux, saturation basis points ($0 \dots 10000$), canonical undirected edge residual tracking.
- `game/js/sim/materials.js`: Material densities, porous fractions, structural yield strengths.
- `game/js/sim/ledger.js`: Authoritative closed-mass accounting in integer centipounds ($1\text{ unit} = 0.01\text{ lb}$).

---

## 3. Scope & Requirements

### 3.1 Stratum Soil Horizon Representation (2-ft vertical strata)
- Soil operates on the 2-ft strata lattice: 5 strata per 10-ft Z cell ($s \in [0..4]$), volume $5\text{ ft} \times 5\text{ ft} \times 2\text{ ft} = 50\text{ cu ft}$ per stratum cell.
- Soil strata are typed:
  - **Horizon O / A (Topsoil / Humus)**: Organic fraction $\ge 2000\text{ bp}$, bulk density $\approx 3750\text{ cp/cu ft}$. Rich in decayed plant biomass.
  - **Horizon B (Subsoil / Mineral)**: Clay/silt enrichment, bulk density $\approx 4750\text{ cp/cu ft}$.
  - **Horizon C (Regolith / Saprolite)**: Weathered rock fragments overlying bedrock, bulk density $\approx 6000\text{ cp/cu ft}$.
- Soil composition tracked as basis points ($0 \dots 10000$): `sand`, `silt`, `clay`, `organic`.

### 3.2 Dynamic Moisture & Capillary Coupling
- Soil moisture $m \in [0 \dots 10000]\text{ bp}$ tracks pore saturation.
- **Capillary Wicking**: Unsaturated upper soil strata draw moisture from saturated rock/aquifer strata beneath (`NAT.03.01`) via capillary suction up to field capacity ($\approx 3500\text{ bp}$ for loam).
- **Gravitational Drainage**: Soil moisture exceeding field capacity drains downward into lower permeable strata or cracks under gravity.
- **Signed Residual Conservation**: Moisture transfers use the canonical undirected edge signed residual tracking from `DEC-038` / `DEC-040` to guarantee zero loss to integer truncation.

### 3.3 Sediment Transport & Angle of Repose
- Loose sediment and uncohesive soils observe angle of repose $\theta$:
  - Gravel: $35^\circ$
  - Dry Sand: $34^\circ$
  - Moist Loam: $45^\circ$ (capillary cohesion)
  - Saturated Mud / Clay: $20^\circ$ (liquefaction risk)
- If vertical height step to an adjacent cell exceeds the stable angle of repose threshold, unsupported loose sediment cascades down-gradient into the lower cell, settling at stable angle of repose. Mass conserved via `DEC-040`.

### 3.4 Weathering, Thermal Degradation & Closed-Mass Transitions
- **Mechanical & Chemical Weathering**: Exposed bedrock in contact with water or frost slowly fractures into mineral regolith ($C$-horizon):
  $$\Delta \text{Rock} = -\Delta \text{Regolith}$$
  in exact centipounds.
- **Water-Driven Erosion**: High fluid flow across surface soil strips topsoil particles into suspended sediment, depositing alluvial loam downstream.
- **Thermal Degradation / Lava Interaction**: Contact between molten lava ($Z \in [-16 \dots -11]$ or volcanic vents) and soil bakes clay into ceramic/brick and vaporizes organic topsoil into carbonaceous ash/gas, conserving mass into atmospheric/sediment accounts.

### 3.5 Paired Fluid Thermodynamics Reference (`DEC-039`)
- Minecraft-style local fluid flow paired with DEUS continuous finite mass:
  - Water cools molten rock into obsidian/basalt.
  - Magma transfers heat to adjacent rock/soil, causing thermal fracturing and barrier weakening.

---

## 4. GAME TRANSLATION (MANDATORY 10-FIELD BLOCK)

```text
GAME TRANSLATION

WBS / Lane:
NAT.04.01 / lane-by

Approved scope / Owner authorization reference:
Owner Directive 2026-09-28 14:28 CT authorizing NAT.04.01 Geomorphology & Soil Kernel under DEC-037 Natural World Phase Lock.

Writer SHA / evidence date:
MiniMax M3 / 2026-09-28

Translation Class:
B WORLD-BEHAVIOR VISIBLE (with direct player-visible terrain layer consequence)

Player / World Effect:
Terrain exhibits distinct physical soil horizons rather than uniform stone. River valleys hold deep, moist, fertile loam; mountain ridges have thin gravel over bedrock. Digging pits reveals visible layer transitions (dark loam -> pale subsoil -> regolith -> bedrock). Soil moisture visibly reacts to water table depth and surface rain. Unsupported sand or gravel slopes cascade into stable natural banks.

Trigger:
Water table saturation changes from NAT.03.01, precipitation infiltration, terrain excavation (digging/mining), or slope angle-of-repose instability.

Runtime Authority:
game/js/sim/geomorphology/soil.js (Soil & Sediment Authority) + game/js/sim/hydrology/aquifer.js (Moisture Connection) + game/js/sim/ledger.js (DEC-040 Closed Mass).

Simulation Path:
tickSoilMoisture(column, dt) -> evalCapillaryDraw(aquiferStrata, soilStrata) -> updateSoilSaturation() -> evalSlopeStability() -> creditLedger().

Engine Bridge:
DEUS_Levels.js / DEUS_Tiles.js: Translates soil moisture and composition into visual ground dampness tint, autotile edge blending (mud vs dry dirt vs loam), and footstep acoustic profiles.

Visible Result:
Moist ground near rivers and over shallow aquifers appears dark, damp, and fertile. Arid or elevated ground appears light, dry, and gravelly. Excavating trenches shows soil moisture wicking up from water table beneath. Loose slopes settle into natural angles.

Persistence:
Soil stratum composition, thickness, moisture basis points, and organic content serialize into st.columns[x,y].strata[s]. Exactly conserved in Mass Ledger.

Failure Without This Lane:
Terrain remains hard, dead stone or fake static tile decals. Water from NAT.03.01 has nowhere to go on land: plants in Package 6 would have to sprout directly from granite using hardcoded fake biome flags rather than real soil moisture, violating the physical causal chain.

Automated Proof:
tools/test_soil_geomorphology.js: 12 contract tests verifying soil horizon stratification, capillary rise from water table, gravity percolation to field capacity, slope angle of repose, weathering mass conservation, and save/load round-tripping.

In-Game Proof:
In Playtest (F5), inspect a riverbank vs a hillside at known seed. Riverbank displays Z=0 S=4 deep moist loam (moisture > 7500 bp, dark tint). Hillside displays thin gravel over bedrock (moisture < 2000 bp). Dig a 1-stratum trench; observe moisture seep into the trench bottom from the adjacent water table.

CONSUMED BY GAME SYSTEMS:
- Package 5 (Climate): Soil moisture and thermal mass govern ground surface temperature, latent heat, and evaporation.
- Package 6 (Flora): Plant germination, growth rate, and root water absorption directly read soil moisture, horizon depth, and organic content.
- Package 7 (Fauna): Burrowing creatures, mud wallows, and grazing forage depend directly on soil substrate.
- Construction / Excavation: Digging yield and excavation effort scale with soil vs solid rock bulk density.
```

---

## 5. GAME BRIDGE STATUS

```text
Simulation implemented: NO (In progress under lane-by)
Engine bridge implemented: NO (Interface hooks defined for DEUS_Levels.js)
Presentation implemented: YES (Existing A2/A4 ground and soil autotiles; DEC-007 compliant)
Input/player interaction implemented: NO (Pending excavation/interaction integration)
Save/load implemented: NO (Schema defined in specification)
Playable verification performed: NO (Awaiting approved implementation)
```

---

## 6. Target Write Paths & Whitelist
- `game/js/sim/geomorphology/soil.js`
- `game/js/sim/geomorphology/index.js`
- `tools/test_soil_geomorphology.js`
- `tasks/NAT.04.01/lane-by/**`
- **Exclusions**: Zero edits to engine core (`rmmz_*.js`), zero art generation (`DEC-007`), zero civilization/farming (`DEC-037`).
