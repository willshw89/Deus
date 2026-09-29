# BRIEF: NAT.05.01 — Lean Unified Climate Kernel (lane-cl)

## 1. Objective & Authority
- **WBS ID**: `NAT.05.01`
- **Package**: Package 5: Continuous Climate (Lean Natural World v1)
- **Lane**: `lane-cl`
- **Branch**: `task/lane-cl`
- **Writer**: `gemini` (Antigravity Coordinator & Implementer)
- **Reviewer**: `grok` (Grok 4.7 Independent Reviewer)
- **Governing Authorities**:
  - `DEC-037`: Natural World Phase Lock (Causal Chain: Physical Space -> Physical Matter -> Water -> Geomorphology/Soil -> Climate -> Flora -> Fauna -> Integrated Proof).
  - `DEC-039`: Rules-Source Hierarchy (Owner Decisions -> SRD 5.1 -> Vanilla Minecraft Java Edition reference -> DEUS physical laws & closed-mass invariants -> Original content).
  - `DEC-040`: Universal Closed-Mass World Invariant (WORLD_TOTAL_MASS(t) == WORLD_TOTAL_MASS(Year 0) in integer centipounds across all reservoirs; Owner clarification 2026-09-29: weight ledger for world material and water; phase and density change, weight does not).
  - `DEC-041`: Multi-Agent Orchestration Architecture & Natural World v1 Exit Gate.
  - Directive `0158-D` (Autonomous Lane Opening Authority, 2026-09-29).

---

## 2. Context & Existing Upstream Authorities
- `game/js/plugins/DEUS_Levels.js`: 32-Z discrete coordinate system ($Z \in [-16 \dots +15]$) and continuous surface elevation functions (`surfaceElevationAt`).
- `game/js/sim/geomorphology/soil.js` (`NAT.04.01`, merged at `e1554c63`): Stratum soil composition, bulk density, pore moisture wicking, and soil surface horizons.
- `game/js/sim/hydrology/aquifer.js` (`NAT.03.01`, merged at `4794e670`): Hydraulic head, groundwater seepage, water table depth.
- `game/js/sim/ledger.js`: Authoritative mass and fluid conservation ledger in integer centipounds.

---

## 3. Scope & Requirements (Level 1 Headless Kernel)

### 3.1 Closed-Mass Conservation for Water, Ice, and Vapour (`DEC-040`)
- The climate system participates in the global mass ledger across three fluid/water phases:
  - **Atmospheric Vapour Reservoir (`reservoir_vapour_cp`)**: Gaseous humidity advected by wind.
  - **Atmospheric Condensed / Cloud Reservoir (`reservoir_cloud_cp`)**: Condensed cloud moisture prior to precipitation.
  - **Surface & Precipitated Water / Ice (`reservoir_water_cp`, `reservoir_snow_cp`)**: Liquid rain and solid snow/hail falling upon surface strata.
- Invariant:
  $$\Delta \text{Vapour} + \Delta \text{Cloud} + \Delta \text{Precipitation} + \Delta \text{SoilMoisture} = 0$$
  in integer centipounds ($1\text{ cp} = 0.01\text{ lb}$). Evaporation debits soil/surface moisture and credits atmospheric vapour. Condensation transfers vapour to cloud. Precipitation debits cloud and deposits rain/snow on topsoil strata. Freezing liquid water into solid ice preserves exact weight ($62.4\text{ lb/cu ft} = 6240\text{ cp/cu ft}$ pure water baseline; density varies with porosity/expansion, total mass does not).

### 3.2 Vertical Elevation Lapse Rate
- Standard adiabatic lapse rate:
  $$\text{LAPSE\_RATE\_PER\_Z} = -0.35^\circ\text{F per vertical Z level}$$
  ($3.5^\circ\text{F}$ per 1,000 ft; 1 Z level = 5 ft height or 10 ft vertical interval).
- High elevation bands ($Z \ge +7$, Highlands) experience significant cooling relative to Lowlands ($Z \in [-4 \dots +1]$), naturally driving snow accumulation, frost, and alpine temperatures without hardcoded biome overrides.

### 3.3 Seasonal Insolation & Diurnal Solar Thermal Cycle
- Orbital solar insolation driven by `dayOfYear` ($0 \dots 364$) and `timeOfDay` ($0 \dots 23$ hours):
  - Solstice and equinox thermal curves.
  - Diurnal surface warming during daylight hours (peak at solar noon) and radiative cooling at night.

### 3.4 Prevailing Wind Advection & Orographic Precipitation (Rain Shadow)
- Wind vector field $\vec{w} = (w_x, w_y)$ advects atmospheric moisture across the terrain.
- **Orographic Lift**: When wind encounters rising terrain ($\nabla_{\vec{w}} \text{elevation} > 0$), air cools adiabatically, relative humidity exceeds 100% saturation basis points ($10000\text{ bp}$), triggering condensation and rainfall on the windward slope.
- **Rain Shadow**: Descending air on the leeward slope ($\nabla_{\vec{w}} \text{elevation} < 0$) warms adiabatically, drying the air and creating an arid rain-shadow zone ($\ge 3\times$ less rainfall than windward).

### 3.5 Evapotranspiration
- Solar radiation, ambient temperature, and wind speed drive evaporation from exposed surface water bodies and transpiration from topsoil strata:
  - Hot, dry, windy cells experience rapid evaporation.
  - Cold, humid, sheltered cells retain soil moisture.

---

## 4. GAME TRANSLATION (MANDATORY 10-FIELD BLOCK)

```text
GAME TRANSLATION

WBS / Lane:
NAT.05.01 / lane-cl

Approved scope / Owner authorization reference:
Owner Directive 2026-09-28 14:28 CT authorizing NAT.05.01 Climate Kernel under DEC-037 Natural World Phase Lock; Directive 0158-D.

Writer SHA / evidence date:
gemini / 2026-09-29

Translation Class:
B WORLD-BEHAVIOR VISIBLE (with direct atmospheric and seasonal terrain consequences)

Player / World Effect:
Weather and temperature emerge naturally from geography rather than static biome presets. Climbing a highland ridge feels palpably colder; snow blankets mountain peaks while valleys remain green. The windward side of mountain ranges features verdant rain-fed forest and damp soil, while the leeward side becomes an arid scrub or desert rain shadow. Winter brings sub-freezing temperatures, freezing surface water into solid ice and transforming rainfall into accumulating snow.

Trigger:
Continuous simulation time tick (action domain / historical domain), diurnal day/night progression, seasonal day-of-year advance, or spatial navigation across elevations and orographic barriers.

Runtime Authority:
game/js/sim/climate/climate_engine.js (Climate & Weather Authority) + game/js/sim/geomorphology/soil.js (Soil Moisture Interface) + game/js/sim/ledger.js (DEC-040 Closed Mass).

Simulation Path:
tickClimate(dt) -> evalInsolation(dayOfYear, timeOfDay) -> evalAdvection(wind, humidity) -> evalOrographicLift(terrainElevation) -> condensePrecipitation() -> evapotranspiration() -> updateMassLedger().

Engine Bridge:
DEUS_DayNight.js / DEUS_Environment.js / DEUS_Levels.js: Maps ambient temperature and weather precipitation into visual sky tinting, precipitation sprite overlays (rain drops, snow flakes), water freezing transitions, and ground snow cover autotiles.

Visible Result:
Higher elevations display frosted grass and snow caps. Rain storms visibly sweep across windward valleys, dark damp soil reflects standing rainwater, while leeward plains remain dry. Ponds freeze over in winter into walkable ice sheets.

Persistence:
Atmospheric humidity, cloud reservoirs, and seasonal parameters serialize into st.climate; soil moisture updates directly persist in st.columns[x,y].strata[s]. Closed-mass balances verified against ledger accounts.

Failure Without This Lane:
The world has no dynamic weather or seasons. Mountains are the same temperature as sea-level marshes; rainfall cannot replenish soil moisture or aquifers; rivers and plants must rely on artificial scripted timers; snow and ice cannot naturally form or melt.

Automated Proof:
tools/test_climate_kernel.js: Comprehensive contract tests verifying elevation lapse rate (-0.35 deg F/Z), seasonal solar insolation cycles, orographic rain shadow emergence (>= 3x windward/leeward differential), evapotranspiration scaling with wind and temperature, closed-mass water/vapour conservation, and mutation sweep with negative controls able to fail.

In-Game Proof:
In Playtest (F5), inspect temperature and humidity across elevations from Valley (Z=0) to Peak (Z=10); observe temperature drop of ~35 deg F; witness rainstorm trigger water accumulation on windward slope while leeward slope remains arid; advance season to winter and verify surface water freezes into passable ice.

CONSUMED BY GAME SYSTEMS:
- Package 6 (Flora): Seed germination, growth cycles, and dormancy depend directly on temperature and rainfall.
- Package 7 (Fauna): Wildlife migration, hibernation, and cold exposure depend on ambient climate.
- Colonist / Player Survival: Hypothermia, heatstroke, clothing insulation, and crop farming read ambient temperature and rain.
```

---

## 5. GAME BRIDGE STATUS

```text
Simulation implemented: NO (In progress under lane-cl Level 1 kernel)
Engine bridge implemented: NO (Interface hooks defined for DEUS_Environment.js / DEUS_DayNight.js)
Presentation implemented: YES (Existing weather overlays and seasonal tile palettes)
Input/player interaction implemented: NO (Pending weather inspection tooltip integration)
Save/load implemented: NO (Schema defined in specification)
Playable verification performed: NO (Awaiting Level 1 kernel completion and Level 2 bridge)
```

---

## 6. Target Write Paths & Whitelist
- `game/js/sim/climate/constants.js`
- `game/js/sim/climate/climate_engine.js`
- `game/js/sim/climate/index.js`
- `tools/test_climate_kernel.js`
- `tasks/NAT.05.01/lane-cl/**`
- **Exclusions**: Zero edits to engine core (`rmmz_*.js`), zero art generation (`DEC-007`), zero civilization/farming (`DEC-037`).
