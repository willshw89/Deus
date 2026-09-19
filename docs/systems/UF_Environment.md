# UF_Environment: Environmental factors, temperature, weather, hypothermia, burning & wetness

## 1. Purpose
Simulates dynamic environmental factors and physiological thermal regulation for Ultima Fortress in the style of Dwarf Fortress. Calculates true local ambient cell temperatures derived from world generation climate fields, diurnal (day/night) swings, elevation and cavern insulation, enclosed room dampening, and radiant heat sources (campfires, hearths, furnaces, and burning cells). Simulates weather (clear, overcast, rain, downpour, snow, blizzard, heatwave, coldsnap), wetness accumulation and drying, clothing insulation, and unit thermal equilibrium. Units experience authentic status conditions: hypothermia stages (chilled, mild shivering, severe hypothermia with periodic cold damage, critical freezing), heatstroke, active burning (with continuous fire damage, panic fleeing, and water extinguishing), and wetness. Colonists reflect thermal afflictions through urgent job prioritization, mood shifts, and Dwarf Fortress thoughts.

## 2. Public API
Accessible via `window.UF.Environment`:

- `ambientTemperature(area, x, y, z)`: Returns local ambient temperature in Celsius (°C) for cell `(x, y, z)` in `area`.
  - Scaled from worldgen field `f.t` (-25°C polar to +45°C desert).
  - Diurnal swing: peak warmth at 14:00, coldest at 03:00.
  - Elevation: z=1 hills (-4°C), z=2 alpine peaks (-10°C), z=-1 upper cavern (stable 13°C), z=-2 deep cavern (16°C base).
  - Room insulation: `UF.Floors.roomAt(area, x, y)` dampens outdoor extremes by 75% toward 20°C.
  - Radiant heat: campfires and heat-tagged objects radiate heat up to radius 3 (+25°C, +15°C, +5°C); burning cells radiate heat up to radius 3 (+45°C, +28°C, +14°C, +6°C).
- `weather(area)`: Returns current weather string (`"clear"`, `"overcast"`, `"rain"`, `"downpour"`, `"snow"`, `"blizzard"`, `"heatwave"`, `"coldsnap"`).
- `setWeather(area, weatherType)`: Manually sets weather override for testing or story events.
- `unitThermal(unit)`: Returns or initializes thermal record `{ bodyTemp, wetness, stage, lastDamageBeat }`.
- `clothingInsulation(unit)`: Returns cold insulation factor `0.0..0.85` based on equipped torso, head, and leg items.
- `igniteUnit(unit, durationBeats, damagePerBeat)`: Sets a unit on fire with the `burning` condition.
- `extinguishUnit(unit, cause)`: Extinguishes active burning (`cause`: `"water"`, `"doused"`, `"rain"`, `"burned_out"`).
- `isBurning(unit)`: Returns boolean `true` if unit has active burning condition.
- `isHypothermic(unit)`: Returns boolean `true` if unit is suffering from mild, severe, or critical hypothermia.
- `isWet(unit)`: Returns boolean `true` if unit has wetness > 30%.
- `conditionLabel(unit)`: Returns short descriptive label for UI (`"Burning"`, `"Hypothermia"`, `"Shivering"`, `"Chilled"`, `"Heatstroke"`, `"Overheated"`, `"Wet"`, or `""`).
- `stepUnitThermal(unit, beat)`: Updates thermal physics, wetness, burning, and condition stages for a single unit.
- `updateEnvironment()`: Master loop executed once per beat (60 ticks / 1 second at 1x speed).

## 3. Events
Emitted via `UF.Events`:
- `environment:weatherChanged(area, weatherType)`: Fired when weather changes in an area.
- `environment:thermalStageChanged(unit, newStage, prevStage)`: Fired when unit transitions between thermal stages (e.g. `chilled` -> `hypothermia_mild` -> `hypothermia_severe`).
- `environment:coldDamage(unit, damage)`: Fired when severe or critical hypothermia deals cold damage.
- `environment:heatDamage(unit, damage)`: Fired when heatstroke deals thermal damage.
- `environment:unitIgnited(unit)`: Fired when a unit catches fire.
- `environment:unitBurned(unit, damage)`: Fired when an ignited unit suffers burn damage.
- `environment:unitExtinguished(unit, cause)`: Fired when a burning unit is put out.

Listened to:
- `fire:unitBurned`: Automatically ignites unit when damaged by a burning cell in `UF_Fire`.

## 4. Save data
- Stored under `UF.World.state.environment`:
  - `version`: schema version (1).
  - `weatherByArea`: persistent weather records keyed by area `"x,y"`.
  - `overrides`: test/manual weather overrides.
- Stored on each unit in `unit.data.thermal`:
  - `bodyTemp`: body temperature in °C (float).
  - `wetness`: wetness percentage (0..100).
  - `stage`: active thermal condition stage (`"normal"`, `"chilled"`, `"hypothermia_mild"`, `"hypothermia_severe"`, `"critical"`, `"overheated"`, `"heatstroke"`).
- Stored on burning units in `unit.data.burning`:
  - `ticksLeft`: remaining burn duration.
  - `damagePerBeat`: periodic damage.
  - `startedAt`: frame started.

## 5. Checks
Automated test suite `environment` (`tools/run_tests.js environment`):
- `environment.world_ready`: Proves `UF.World` and state are accessible.
- `environment.ambient_temp_reasonable`: Proves surface ambient temperature calculates realistically (-35°C to 55°C).
- `environment.diurnal_cycle`: Proves midnight temperature is significantly cooler than midday on surface.
- `environment.cavern_stable`: Proves upper cavern level `z = -1` remains stable, insulated at 13°C.
- `environment.radiance_calculation`: Proves heat source radiation returns numeric values without NaN.
- `environment.unit_thermal_init`: Proves unit thermal record initializes at 37°C normal body temperature and 0% wetness.
- `environment.clothing_insulation`: Proves clothing items provide expected insulation reduction against cold.
- `environment.hypothermia_stage`: Proves body temperature drop to 30.0°C triggers `hypothermia_severe`.
- `environment.hypothermia_cold_damage`: Proves severe hypothermia inflicts periodic cold damage with popups.
- `environment.hypothermia_recovering`: Proves unit placed in comfortable warmth recovers body temperature toward normal.
- `environment.unit_ignited`: Proves unit catches fire with active `burning` condition.
- `environment.burning_damage`: Proves burning condition deals periodic fire damage.
- `environment.unit_extinguished`: Proves stepping into water quenches fire immediately.
- `environment.wet_status_tracks`: Proves wetness differentials track accurately across distinct units.
- `environment.weather_override`: Proves weather states can be set and queried cleanly.
- `environment.condition_labels`: Proves `conditionLabel` helper returns `"Burning"` and `"Hypothermia"`.

## 6. Status
- 16/16 automated test checks passing on `environment` suite.
- Clean integration with `UF_Look.js` (subject condition tags on Line 1, ambient temperature and weather on Line 2).
- Clean integration with `UF_Sheet.js` (inspect sheet displays body temperature, thermal status, and condition tags).
- Clean integration with `UF_Colonists.js` (urgent thermal interrupt, panic flee for burning, DF thoughts).
- Verified zero errors in dev console and smoke test.
