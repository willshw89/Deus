# Independent Grok Review — NAT.05.01 / lane-cl

- Writer: Gemini (commit author deus-ops)
- Reviewer: Grok (Grok 4.7)
- Reviewed commit: 767a25c02fc52c963e2285fe2b80e1f96b4d5eaa
- Parent: 49318b5a (the review of 2f4bdf20)
- Merge base with origin/main: da89f08aae6e46b0164824e3e01af0da9652992e
- Branch: task/lane-cl
- Worktree: C:\Users\snewt\.deus_worktrees\lane-cl
- Review date: 2026-09-29

Authority: the lane brief, DEC-037, DEC-038 (integer centi-Fahrenheit, `elevationScale` −35, 360-day calendar), DEC-039 (owner decisions outrank the brief), DEC-040 (water weight is conserved; phase may change), and the resubmission list in `tasks/NAT.05.01/lane-cl/review_grok_2f4bdf20.md` section 12. No product code was edited. No art was generated. Probes ran from a temporary script under `%TEMP%` against the committed module and were deleted. This review does not certify the lane.

VERDICT: FAIL

Three measurements block the lane. The rain-shadow result on the first weather tick changes with `setColumn` insertion order, and a same-parcel second rise then rains a full load. The mutation sweep throws on the unmodified engine and never reruns the gate. A one-level rise passed only as `surfaceZ` stores 0 ft and precipitates 0, because the `surfaceZ * 10` fallback is unreachable. Closed mass, the 360-day calendar, integer centi-F, the live `elevationScale`, zero-vapour round-trip, wind and humidity evaporation, soil debit and credit, and the single-realm constructor all held under probe. Those have to survive the repair.

## 1. Commit and diff

Commands in `C:\Users\snewt\.deus_worktrees\lane-cl`:

```text
git rev-parse HEAD
767a25c02fc52c963e2285fe2b80e1f96b4d5eaa

git rev-parse --abbrev-ref HEAD
task/lane-cl

git merge-base HEAD origin/main
da89f08aae6e46b0164824e3e01af0da9652992e

git log -1 --oneline
767a25c0 [gemini] NAT.05.01 Fix climate kernel per Grok review (Attempt 2)

git diff --name-status 49318b5a 767a25c0
M  game/js/sim/climate/climate_engine.js
M  game/js/sim/climate/constants.js
M  game/js/sim/climate/index.js
M  tasks/NAT.05.01/lane-cl/REPORT.md
M  tools/test_climate_kernel.js

git diff --name-status da89f08aae6e46b0164824e3e01af0da9652992e HEAD
A  game/js/sim/climate/climate_engine.js
A  game/js/sim/climate/constants.js
A  game/js/sim/climate/index.js
A  tasks/NAT.05.01/lane-cl/BRIEF.md
A  tasks/NAT.05.01/lane-cl/REPORT.md
A  tasks/NAT.05.01/lane-cl/lane.json
A  tasks/NAT.05.01/lane-cl/review_grok_2f4bdf20.md
A  tools/test_climate_kernel.js
```

`git show -s` on `767a25c02fc52c963e2285fe2b80e1f96b4d5eaa`: author and committer `deus-ops <deus-ops@local.invalid>`, date 2026-09-29 16:27:11 -0500, one parent `49318b5a`, subject `[gemini] NAT.05.01 Fix climate kernel per Grok review (Attempt 2)`. Diff stat against that parent: 5 files, 779 insertions, 498 deletions.

Every path on the branch since the merge base matches `tasks/NAT.05.01/lane-cl/lane.json` `allowedPaths` (`game/js/sim/climate/**`, `tools/test_climate_kernel.js`, `tasks/NAT.05.01/lane-cl/**`). The name list contains no `game/js/rmmz_*.js`, no `game/js/main.js`, no `game/js/libs/`, and no art, civilization, farming, or faction path.

`git status --porcelain` at review time showed two untracked paths, `tasks/NAT.05.01/lane-cl/launches/` and `tasks/NAT.05.01/lane-cl/prompt_review_grok_767a25c0.txt`. Neither is in `767a25c0`.

`node --check` on `game/js/sim/climate/constants.js`, `game/js/sim/climate/climate_engine.js`, `game/js/sim/climate/index.js`, and `tools/test_climate_kernel.js` printed no diagnostic.

## 2. Gate

`node tools/test_climate_kernel.js` exited 0:

```text
PASS: Thermal Elevation Lapse Rate (-0.35 deg F per vertical Z level)
PASS: Subterranean Geothermal Warming (+0.15 deg F per vertical Z level)
PASS: Orbital Seasonal & Diurnal Insolation Curves (360-day calendar)
PASS: Orographic Lift on 10 ft Rise (+1 Z level)
PASS: Orographic Lift & Leeward Rain Shadow Dynamics
PASS: Physical Phase Transitions & Winter Snow Freezing (Closed-Mass)
PASS: Evapotranspiration Closed-Mass Transfers & Environmental Drivers
PASS: Zero-Vapour & Zero-Humidity Persistence Round-Trip
PASS: Multi-Tick Continuous Simulation Mass Conservation (100 Ticks)
PASS: Browser Single-Realm Evaluation & Construction
Results: 10 passed, 0 failed
```

`node tools/test_climate_kernel.js --mutation-sweep` also exited 0. After the same 10 passes it printed `MUTANT CAUGHT` for `zero_vapour_falsy_fallback`, `no_rain_on_10ft_rise`, `rain_shadow_leak_second_slope`, `winter_warmer_than_summer`, and `evaporation_ignores_wind`, then `Mutation Sweep: 5/5 mutants caught.`

Section 5 records what those five functions do. The exit code is real. The catch count is a property of the sweep script.

The 10-test gate does see the four engine defects it has assertions for. A separate process loaded the committed module, replaced one prototype, then loaded `tools/test_climate_kernel.js`. Each child exited 1.

| Sabotage on the committed prototype | Exit | FAIL lines |
|---|---:|---|
| `processOrographicWeather` replaced with an empty function | 1 | `10 ft rise must produce precipitation`; `First rise must produce precipitation` |
| `evalTemperature` / `evalTemperatureCentiF` fixed at 70°F / 7000 | 1 | lapse mismatch at Z=1 (`7000` vs `6965`); geothermal mismatch at Z=−1; seasonal range `got 0`; winter summit `got 70 F` |
| `setColumn` rewrites numeric 0 vapour to 10000 and numeric 0 humidity to 5000 | 1 | `Dry column must have exactly 0 cp total mass` |
| `processEvapotranspiration` forced to wind 0 for the call | 1 | `Evaporation with wind (430) must exceed evaporation without wind (430)` |

## 3. Repair items that held

### 3.1 Zero vapour, zero humidity, temperature round-trip

`setColumn` reads vapour with `!== undefined` (`climate_engine.js:57`) and clamps humidity with `Math.max(0, Math.min(10000, …))` (`climate_engine.js:54-56`). `deserialize` passes `temperatureCentiF: c.temp` (`climate_engine.js:432-440`).

Probe, one fresh engine, two dry columns, wind `{x:0,y:0}`, temperatures 0 and 1025 centi-F. After `serialize` / `deserialize` on a second engine:

```text
total {vapour:0, cloud:0, surfaceWater:0, surfaceSnow:0, total:0}
wind {x:0, y:0}
column (0,0): hum 0, vap 0, temp 0
column (1,0): hum 0, vap 0, temp 1025
```

A payload `{temp:1000, hum:0, vap:0, …, wind:{x:0,y:4}}` restored temperature 1000, humidity 0, vapour 0, wind `{x:0,y:4}`. `setColumn` clamps humidity 15000 to 10000 and humidity −20 to 0.

### 3.2 Integer centi-F and `elevationScale`

`evalTemperatureCentiF` returns `Math.round` (`climate_engine.js:183`). `getElevationScaleCentiF` returns `constants.elevationScale` when that key is present, including 0 (`climate_engine.js:38-40`). The constant table sets `elevationScale: -35` and `DAYS_PER_YEAR: 360` (`constants.js:14`, `constants.js:35`).

Summer noon, day 135 hour 12, sea-level result 9500 centi-F (95.00°F):

| Z | Default centi-F | `elevationScale: 0` | `elevationScale: -70` | Config `LAPSE_RATE_PER_Z: 0` |
|---:|---:|---:|---:|---:|
| 0 | 9500 | 9500 | 9500 | 9500 |
| 1 | 9465 | 9500 | 9430 | 9465 |
| 10 | 9150 | 9500 | 8800 | 9150 |
| −1 | 9515 | 9515 | 9515 | 9515 |
| −10 | 9650 | 9650 | 9650 | 9650 |

Z=10 minus Z=0 on the default engine is 350 centi-F, 3.50°F. `elevationScale: 0` removes the highland drop. `elevationScale: -70` drops Z=10 by 700 centi-F. Passing `LAPSE_RATE_PER_Z: 0` leaves the drop at 350, because `elevationScale` is still −35. That is the owner key from DEC-038 item 6. Geothermal warming for Z<0 stays +15 centi-F per level and ignores `elevationScale`.

Every `evalTemperatureCentiF` for Z ∈ [−16, +15], day ∈ [0, 359], hour ∈ [0, 23] was an integer. That is 276480 samples, 0 non-integers.

### 3.3 360-day calendar

Day 135 noon is 9500 centi-F. Day 315 noon is 5500. The difference is 4000 centi-F, 40.00°F. Day 135 is summer (`floor(135/90) = 1`). Day 315 is winter (`floor(315/90) = 3`).

Full scan at Z=0: the coldest summer hour is day 90 hour 0 at 6914 centi-F (69.14°F). The warmest winter hour is day 270 hour 12 at 6086 centi-F (60.86°F). The gap is 828 centi-F, so every summer hour is warmer than every winter hour. Pairing every summer noon with every winter noon produced 0 inversions.

Wrapping: day 360 noon equals day 0 noon (6086). Day −1 noon equals day 359 noon (6061). Day 720 noon equals day 0 noon (6086).

### 3.4 Humidity stays inside 0..10000

The rise path assigns `Math.min(10000, humidity + floor(slopeFeet * 500))` (`climate_engine.js:283-284`). The descent path assigns a value clamped to 500..3000 (`climate_engine.js:274`). On the 60 ft descent in section 4 the stored humidity was 1428 bp. A 100-tick ridge with soil, cloud, snow, and a moving calendar kept every column's humidity inside 0..10000 and integer (section 3.6).

### 3.5 Wind carries vapour and cloud; a 10 ft rise can condense

Advection runs before condensation. With wind `(1, 0)`, `advFrac` is `min(0.5, 0.2 * max(1, windSpeed))` (`climate_engine.js:213`), so a unit wind moves 20% of vapour and 20% of cloud onto the downwind cell when that cell exists. Flat pair, humidity 0, totals held:

| Wind | Upwind vapour / cloud after one tick | Downwind vapour / cloud | Total |
|---|---|---|---:|
| `(1, 0)`, start 10000 / 1000 on x=0 | 8000 / 800 | 2000 / 200 | 11000 |
| `(−1, 0)`, start 10000 / 500 on x=1 | x=1 holds 8000 / 400 | x=0 holds 2000 / 100 | 10500 |
| `(0, 0)` | 10000 / 1000 stay on x=0 | x=1 stays 0 / 0 | 11000 |

A +10 ft step with humidity 5000 bp and 10000 cp vapour on the upwind cell, 0 cp on the crest, one summer-noon tick, mass delta 0:

| x | Feet | Humidity bp | Vapour | Cloud | Surface water | Precip |
|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 10000 | 4800 | 800 | 2400 | 2400 |
| 1 | 10 | 10000 | 1200 | 200 | 600 | 600 |

The 2000 cp that advected onto the crest condensed there (600 cp rain). The crest uses the upwind rise when its own forward slope is 0 (`effectiveSlope`, `climate_engine.js:270`).

The same geometry with other humidities:

| Rise | Starting humidity bp | Precipitation |
|---:|---:|---|
| 0 ft | 5000 | 0 |
| 9 ft | 5000 | 0 |
| 10 ft | 5000 | 2400 on the foot, 600 on the crest |
| 10 ft | 4999 | 0 (humidity ends at 9999) |
| 10 ft | 0 | 0 (humidity ends at 5000) |
| 34 ft | 5000 | 2400, same fraction as 10 ft once both are saturated |

Condensation requires the post-lift humidity to reach 10000 bp (`climate_engine.js:286`). A 10 ft rise adds 5000 bp. Air that is already at the default 5000 bp saturates and rains. Air at 4999 bp or 0 bp does not. Once saturated, the condensed fraction is 0.4 of vapour and the precipitated fraction is 0.75 of that cloud, independent of further slope. Mass delta on every row was 0.

### 3.6 Evaporation follows wind, humidity, and temperature, and debits real topsoil

`processEvapotranspiration` (`climate_engine.js:334-350`) uses a wind multiplier `1 + speed * 0.1`, a humidity-deficit term, and a thermal term. Probe, 10000 cp surface water, 1000 cp vapour, factor 0.1. Total stayed 11000 on every row. Water change equals vapour gain.

| Case | Centi-F | Humidity bp | Wind x | Water change cp |
|---|---:|---:|---:|---:|
| Hot, dry, wind 10 | 9500 | 1000 | 10 | −2268 |
| Hot, saturated, wind 10 | 9500 | 10000 | 10 | −252 |
| Hot, dry, wind 0 | 9500 | 1000 | 0 | −1134 |
| 75°F, 50% bp, wind 10 | 7500 | 5000 | 10 | −860 |
| 75°F, 50% bp, wind 0 | 7500 | 5000 | 0 | −430 |
| 33°F, dry, wind 10 | 3300 | 1000 | 10 | −90 |
| 32°F | 3200 | 1000 | 10 | 0 |
| 20°F | 2000 | 1000 | 10 | 0 |

A real `SoilStratum` from `game/js/sim/geomorphology/soil.js` (`createStratum('O/A')`, `waterMassCp` set to 6000) was passed as the soil argument, with 2000 cp vapour and an extra 9999 cp on `surfaceWaterCp`. `getTotalMass().total` was 8000 (vapour plus soil). After evaporation the stratum held 5684 cp, vapour was 2316, and the total was 8000. The 9999 cp column bucket stayed 9999 and stayed outside the total, because `getSurfaceWaterCp` returns the stratum while the stratum is attached (`climate_engine.js:94-103`).

Freezing that stratum at 3000 centi-F moved 2500 cp from `waterMassCp` onto `surfaceSnowCp` and back on melt at 9000. Total stayed 2500.

A 100-tick run (orographic weather, phase, evapotranspiration, day `tick % 360`) on three columns, one of them a real stratum starting at 8000 cp, started at 179500 cp and ended at 179500 cp. Every reservoir sample was a safe integer, humidity stayed inside 0..10000, and the stratum ended at 432 cp. No negative reservoir appeared.

### 3.7 Precipitation credits the attached stratum, or the snow reservoir

The rain probe attached an O/A stratum with porosity 100 bp (pore max 3120 cp) to the upwind cell, 100000 cp vapour, +10 ft crest. One tick: precipitation 24000 cp, all of it on `soil.waterMassCp`, column `surfaceWaterCp` still 0, cloud 8000, vapour on that cell 48000, mass delta 0. The stratum's pore max is 3120; the kernel wrote 24000. `clampMoisture` in `soil.js` is exported and is not called by the soil tick, so this kernel's total still counts the 24000. Weight inside the climate sum was conserved.

Winter day 315 hour 0, Z=12, a +10 ft foot-slope, soil attached, 10000 cp vapour: precipitation type `snow`, 2400 cp landed on `surfaceSnowCp`, soil water stayed 0, mass delta 0. Temperature on that column was 3080 centi-F (30.80°F), which came from `surfaceZ`, while the slope came from the foot elevations. Rain uses `creditSurfaceWaterCp` and therefore the stratum; snow uses `surfaceSnowCp` directly (`climate_engine.js:297-302`).

### 3.8 One page realm

The three scripts are IIFEs. In one `vm` context with `window` pointed at the context, evaluated `constants.js`, then `climate_engine.js`, then `index.js`:

```text
CONSTANTS.elevationScale = -35
CONSTANTS.DAYS_PER_YEAR = 360
evalTemperatureCentiF(0, 135, 12) = 9500
evalTemperatureCentiF(10, 135, 12) = 9150
evalTemperatureCentiF(0, 315, 12) = 5500
deserialize of vap 0, hum 0, temp 1025 restored those three numbers
typeof ClimateEngine = function
```

`new ClimateEngine()` ran. The Node `require` path used by the gate is the same module the probes constructed.

## 4. Rain shadow follows Map insertion order

`processOrographicWeather` walks `this.columns` (`climate_engine.js:242`). A `Map` walks in insertion order. The shadow flag is assigned from the upwind neighbor during that walk (`climate_engine.js:262-268`):

```javascript
if (upwindCol && (upwindCol.surfaceElevationFt > col.surfaceElevationFt || upwindCol.inRainShadow)) {
    col.inRainShadow = true;
} else if (slope < 0) {
    col.inRainShadow = true;
} else {
    col.inRainShadow = false;
}
```

When the upwind cell has already been visited this tick, the second rise sees a fresh flag. When the second rise is visited first, `inRainShadow` is still the constructor's `false`, the cell is level with its upwind neighbor, and the branch clears the flag. The second rise then takes the unshadowed fraction (`shadowDivider` 1). `MIN_RAIN_SHADOW_RATIO` is applied only after that flag is true (`climate_engine.js:287`).

Fixture: elevations `[0, 60, 0, 0, 60, 0]` ft, each cell 20000 cp vapour and 5000 bp humidity, wind `(1, 0)`, one call, day 135 hour 12. Mass delta 0 on every order. Descent humidity was 1428 bp on every order.

| Insertion order | Precip x=0 | Precip x=3 | x=3 shadow | x=3 / x=0 | ≤ 1/3 |
|---|---:|---:|---|---:|---|
| 0,1,2,3,4,5 | 4800 | 666 | true | 0.13875 | yes |
| 5,4,3,2,1,0 | 4800 | 6000 | false | 1.25 | no |
| 3,1,5,0,4,2 | 4800 | 6000 | false | 1.25 | no |
| 0,3,1,4,2,5 | 4800 | 6000 | false | 1.25 | no |

The gate builds this ridge with `for (let x = 0; x <= 5; x++)` (`tools/test_climate_kernel.js:154-158`), which is the only order in the table that passes.

Same arriving parcel, measured by adding a feeder cell at x=−1 so advection leaves both rises the same vapour when the flag is off. Seven cells, 20000 cp each, total held at 140000.

| Insertion order | Precip first rise (x=0) | Precip second rise (x=3) | Vapour left on x=0 | Vapour left on x=3 | x=3 shadow |
|---|---:|---:|---:|---:|---|
| −1,0,1,2,3,4,5 | 6000 | 666 | 12000 | 17334 | true |
| 5,4,3,2,1,0,−1 | 6000 | 6000 | 12000 | 12000 | false |
| 3,−1,5,0,1,4,2 | 6000 | 6000 | 12000 | 12000 | false |

In the two failing orders the rises hold the same 12000 cp after the tick and precipitate the same 6000 cp. That is the full load the previous review named.

The constant is live. The wind-order ridge with `MIN_RAIN_SHADOW_RATIO` 3 precipitated 666 cp on the second rise. The same ridge with the constant set to 1 precipitated 6000 cp.

The flag is recomputed from a cleared column. `serialize` writes `x,y,z,elev,temp,hum,vap,cld,wat,snw` and omits `inRainShadow` (`climate_engine.js:407-418`). `deserialize` builds new columns, so the flag starts false. A downwind-first column order repeats the full-load tick after every load.

A further crest at x=7, elevations extended with another 0,60,0 and columns inserted in wind order, also precipitated 666 cp with the flag set. In that order the flag never returns to false once a descent has been seen, so every later windward slope uses the one-third divider on that tick.

Thirty ticks, no reset, equal initial 20000 cp, total held at 120000:

| Order | Summed precip x=0 | x=1 | x=2 | x=3 | x=4 | x=5 |
|---|---:|---:|---:|---:|---:|---:|
| 0..5 | 11544 | 0 | 0 | 17237 | 0 | 0 |
| 5..0 | 11544 | 0 | 0 | 21413 | 0 | 0 |

The valley and both descents summed to 0. The second rise's 30-tick sum exceeded the first rise's sum in both orders. After the first tick those two cells no longer hold the same vapour: the edge cell is not refilled, and the interior rise keeps receiving cloud and vapour from upwind. The same-parcel failure is the first-tick table. The 30-tick sums are the rainfall budget of this geometry once advection has moved the mass.

On the reverse-order engine the flag does propagate on later ticks (`inRainShadow` on x=3 becomes true at tick 2). Tick 1 of that engine is the full-load tick. Tick 2 precipitated 853 cp against 3264 cp on the first rise. Tick 3 precipitated 959 cp against 1758 cp. Absolute rates keep depending on how much vapour each cell holds.

## 5. The mutation sweep throws on a correct engine

The sweep is the block under `process.argv.includes('--mutation-sweep')` in `tools/test_climate_kernel.js:339-412`. Each `run` builds a local value that fails its own assertion. The committed engine is left as it is.

Instrumented on the unmodified prototype, call counts while each `run` executed:

| Name | `setColumn` | `processOrographicWeather` | `processEvapotranspiration` | `evalTemperature` | What the assertion compares |
|---|---:|---:|---:|---:|---|
| `zero_vapour_falsy_fallback` | 1 | 0 | 0 | 0 | `col.vapourMassCp \|\| 10000` against 0. The column's vapour was 0. The `\|\|` expression was 10000. |
| `no_rain_on_10ft_rise` | 2 | 0 | 0 | 0 | A local `precip` from `slope >= 35` with `slope = 10`. The columns' `precipitationRateCp` was still 0 because weather was never called. |
| `rain_shadow_leak_second_slope` | 0 | 0 | 0 | 0 | Local literals `1200` and `1200`. |
| `winter_warmer_than_summer` | 0 | 0 | 0 | 1 in the sweep source | Day-135 temperature (95°F) against that same number plus 10. Day 315 on this engine is 55°F. |
| `evaporation_ignores_wind` | 0 | 0 | 0 | 0 | Local literals `500` and `500`. |

`processOrographicWeather` and `processEvapotranspiration` were called 0 times across the five runs. `processPhaseTransitions` was called 0 times. The winter row's sweep source calls `evalTemperature` once, for day 135; a probe read of day 315 was extra and is the 55°F figure above.

`zero_vapour_falsy_fallback` throws on this engine because the engine preserved 0 and the test then replaced 0 with 10000. The same function would also throw on an engine that stored 10000. Both outcomes are `mutatedVapour === 10000`. The function cannot survive, and it cannot tell those engines apart.

`tasks/NAT.05.01/lane-cl/REPORT.md` describes this block as live negative controls caught by the kernel tests (the attempt-2 list item 8, and the mutation table). The functions above are the sweep that is in the tree. Section 2 shows the 10-test gate failing for four prototype sabotages: empty orographic weather, a flat 70°F temperature, a zero-vapour fallback, and evaporation with the wind forced to 0. The sweep installs none of those and does not load the gate. On the gate's own 0..5 ridge, setting `MIN_RAIN_SHADOW_RATIO` to 1 precipitated 6000 cp against 4800 cp. The gate assertion is `second <= ceil(first / 3)`, which is 6000 against 1600.

The soil kernel's sweep (`tools/test_soil_geomorphology.js`, `mutationSweep`) is the shape the previous resubmission list asked for: a switch inside the engine, a child process that reruns the suite, and a catch only when that child exits 1 with a `FAIL:` line.

## 6. Omitted feet are 0, so a one-Z step is flat

`setColumn` (`climate_engine.js:51` and `climate_engine.js:82`):

```javascript
setColumn(x, y, surfaceZ, surfaceElevationFt = 0, initialWater = {}, soil = null) {
    ...
    surfaceElevationFt: (surfaceElevationFt !== undefined) ? surfaceElevationFt : (surfaceZ * 10),
```

The default parameter supplies 0 before the body runs. The `surfaceZ * 10` branch is unreachable, including for an explicit `undefined` argument.

Probe: `setColumn(0, 0, 0)` and `setColumn(1, 0, 1)`. Both columns stored `surfaceElevationFt` 0. Default vapour was 10000 cp each. After one summer-noon tick, precipitation was 0 on both, vapour was 8000 and 12000, total unchanged. The same pair called as `setColumn(x, y, z, undefined, {vapourMassCp:10000, humidityBp:5000})` also stored elevation 0 and precipitated 0.

Temperature still follows `surfaceZ`. The snow probe in section 3.7 was Z=12 with foot elevations 0 and 10, and it froze because Z=12 is 3080 centi-F at day 315 hour 0. Slope and lapse are two different inputs. A caller that passes both, as the gate does for the 10 ft test (`z=1` and `elev=10`), gets the condensation in section 3.5. A caller that passes the Z step alone gets a flat advection.

## 7. Residuals

These are measured. They are not a request to change the DEC-038 coefficient, and they are not the verdict.

Winter day 315 on the default engine:

| Z | Midnight centi-F | Midnight °F | Noon centi-F | Noon °F |
|---:|---:|---:|---:|---:|
| 0 | 3500 | 35.00 | 5500 | 55.00 |
| 7 | 3255 | 32.55 | 5255 | 52.55 |
| 8 | 3220 | 32.20 | 5220 | 52.20 |
| 9 | 3185 | 31.85 | 5185 | 51.85 |
| 10 | 3150 | 31.50 | 5150 | 51.50 |
| 12 | 3080 | 30.80 | 5080 | 50.80 |
| 15 | 2975 | 29.75 | 4975 | 49.75 |

Midnight crosses 3200 between Z=8 and Z=9. Noon stays above freezing through Z=15. `processPhaseTransitions` moves the entire snow reservoir in one call when the temperature is above 3200 (`climate_engine.js:363-366`), so a snowpack that forms at winter midnight on Z=12 is liquid again at winter noon. DEC-038 item 6 fixes the baseline at −35 centi-F per Z and leaves the feel for later tuning. The kernel uses that baseline.

`setColumn({ temp: 1000 })` stored 100000 centi-F. The `temp` branch treats `abs(temp) > 1000` as centi-F and every smaller magnitude as degrees (`climate_engine.js:67-71`). 1000 centi-F is 10.00°F, and `> 1000` is false, so the branch multiplies by 100. `deserialize` also passes `temperatureCentiF`, which wins, and the round-trip of 1000 in section 3.1 restored 1000.

With a stratum attached, `getTotalMass` ignores `surfaceWaterCp` on the column. The 9999 cp bucket in section 3.6 was invisible to the closed-mass sum.

The low-porosity rain in section 3.7 wrote 24000 cp into a stratum whose pore max is 3120 cp. The climate total still included it.

Advection direction is `Math.sign` on each wind component, one destination cell per tick. Any nonzero wind speed moves at least 20% because of `Math.max(1, windSpeed)`, and the fraction caps at 50%.

The kernel does not call `game/js/sim/ledger.js`. That file is outside this lane's write set. The conservation check that held is `getTotalMass`, which sums column vapour, cloud, snow, and either the attached stratum's `waterMassCp` or the column's `surfaceWaterCp`.

There is no `tickClimate` wrapper. The 100-tick probes called `processOrographicWeather`, then `processPhaseTransitions`, then `processEvapotranspiration`. That order is what conserved mass in section 3.6.

For vapour of 1 through 9 cp, the formula's `Math.max(1, floor(...))` makes shadowed precipitation 1 cp, which is more than one third of the unshadowed precipitation at those sizes. From 10 cp through 30000 cp, shadowed precipitation was at most one third of unshadowed precipitation, and it was at most `ceil(unshadowed / 3)` for every size from 1 through 30000. The gate's ridge uses 20000 cp.

## 8. What a resubmission has to clear

Measured against `767a25c02fc52c963e2285fe2b80e1f96b4d5eaa`. Items that held in section 3 stay in place: zero round-trip, integer centi-F, live `elevationScale` defaulting to −35, the 360-day peak on day 135 and trough on day 315, humidity inside 0..10000, advection of vapour and cloud, 10 ft condensation from humidity of at least 5000 bp, evaporation that changes with wind and humidity, soil `waterMassCp` debit and rain credit with equal vapour change, snow on `surfaceSnowCp`, integer closed mass across the coupled tick, and a single-realm `new ClimateEngine()` whose Z=10 noon is 350 centi-F colder than Z=0.

1. The first `processOrographicWeather` tick gives the same precipitation for every `setColumn` order. Fixture: elevations `[0, 60, 0, 0, 60, 0]`, each cell 20000 cp vapour and 5000 bp humidity, wind `(1, 0)`, day 135 hour 12. Precipitation on x=3 is at most one third of precipitation on x=0. Insertion `5,4,3,2,1,0`, `3,1,5,0,4,2`, and `0,3,1,4,2,5` currently precipitate 6000 cp and 4800 cp. Insertion `0,1,2,3,4,5` currently precipitates 666 cp and 4800 cp. With a feeder cell at x=−1 and the same per-cell vapour, the failing orders currently precipitate 6000 cp on both rises, and those rises finish the tick on 12000 cp each.
2. The mutation sweep flips a switch inside the engine and reruns `node tools/test_climate_kernel.js` in a child process. A catch is that child exiting 1 with a `FAIL:` line from an assertion about engine state. The five switches are: vapour 0 stored as 10000; a 10 ft rise that precipitates 0; a second windward slope that precipitates a full load; a winter noon warmer than the summer noon; an evapotranspiration delta that ignores wind. Section 2 records the gate exiting 1 for the vapour, 10 ft, temperature, and wind sabotages. Section 4 records the full-load rates the shadow assertion rejects. A function that throws on the unmodified engine is not one of those switches. The committed sweep's call count on `processOrographicWeather` and `processEvapotranspiration` is 0.
3. `setColumn(0, 0, 0)` and `setColumn(1, 0, 1)` store a 10 ft rise and can condense under the same humidity rule as an explicit 10 ft pair. Both columns currently store elevation 0 and precipitate 0. The `surfaceZ * 10` expression in `setColumn` has to be the value omitted feet take.

VERDICT: FAIL
