# Independent Grok Review — NAT.05.01 / lane-cl

- Writer: Gemini (commit author deus-ops)
- Reviewer: Grok (Grok 4.7)
- Reviewed commit: 2f4bdf206dfe446137e299326eb9e13091228226
- Parent: 599db5415d93934a45c797fc496d715658600cc5
- Merge base with origin/main: da89f08aae6e46b0164824e3e01af0da9652992e
- Branch: task/lane-cl
- Worktree: C:\Users\snewt\.deus_worktrees\lane-cl
- Review date: 2026-09-29

Authority: DEC-034 independent adversarial review, DEC-037 natural-world phase lock, DEC-038 integer units and the 360-day calendar, DEC-039 owner decisions outrank the lane brief, DEC-040 closed water weight. No product code was edited. No art was generated. Probes ran from temporary scripts under `%TEMP%` against the committed module and were deleted. This review does not certify the lane.

## 1. Commit and diff

Commands in `C:\Users\snewt\.deus_worktrees\lane-cl`:

```text
git rev-parse HEAD
2f4bdf206dfe446137e299326eb9e13091228226

git rev-parse --abbrev-ref HEAD
task/lane-cl

git merge-base HEAD origin/main
da89f08aae6e46b0164824e3e01af0da9652992e

git log -1 --oneline
2f4bdf20 [gemini] NAT.05.01 Implement pure Level 1 headless climate simulation kernel with closed-mass conservation

git diff --name-status da89f08aae6e46b0164824e3e01af0da9652992e HEAD
A  game/js/sim/climate/climate_engine.js
A  game/js/sim/climate/constants.js
A  game/js/sim/climate/index.js
A  tasks/NAT.05.01/lane-cl/BRIEF.md
A  tasks/NAT.05.01/lane-cl/REPORT.md
A  tasks/NAT.05.01/lane-cl/lane.json
A  tools/test_climate_kernel.js
```

`git show -s` on `2f4bdf206dfe446137e299326eb9e13091228226`: author and committer `deus-ops <deus-ops@local.invalid>`, date 2026-09-29 13:33:32 -0500, one parent `599db5415d93934a45c797fc496d715658600cc5`, subject `[gemini] NAT.05.01 Implement pure Level 1 headless climate simulation kernel with closed-mass conservation`.

Diff stat against the merge base: 7 files, 974 insertions. Every path matches `tasks/NAT.05.01/lane-cl/lane.json` `allowedPaths` (`game/js/sim/climate/**`, `tools/test_climate_kernel.js`, `tasks/NAT.05.01/lane-cl/**`). The name list contains no `game/js/rmmz_*.js`, no `game/js/main.js`, no `game/js/libs/`, and no art, civilization, farming, or faction path.

`git status --porcelain` at review time showed one untracked directory, `tasks/NAT.05.01/lane-cl/launches/`. That directory is not in `2f4bdf20` and was not staged.

`tasks/NAT.05.01/lane-cl/REPORT.md` names writer SHA `599db541`. That hash is the lane-open commit, the parent of the kernel commit reviewed here.

## 2. Gate

`node --check` on `game/js/sim/climate/constants.js`, `game/js/sim/climate/climate_engine.js`, `game/js/sim/climate/index.js`, and `tools/test_climate_kernel.js` printed no diagnostic. The following command then exited 0:

```text
node tools/test_climate_kernel.js
PASS: Thermal Elevation Lapse Rate (-0.35 deg F per vertical Z level)
PASS: Subterranean Geothermal Warming (+0.15 deg F per vertical Z level)
PASS: Orbital Seasonal & Diurnal Insolation Curves
PASS: Orographic Lift & Leeward Rain Shadow Dynamics
PASS: Physical Phase Transitions & Winter Snow Freezing (Closed-Mass)
PASS: Evapotranspiration Closed-Mass Transfers
PASS: Persistence Round-Trip (Serialize / Deserialize)
PASS: Multi-Tick Continuous Simulation Mass Conservation (100 Ticks)
Results: 8 passed, 0 failed
```

`node tools/test_climate_kernel.js --mutation-sweep` also exited 0. After the same 8 passes it printed `MUTANT CAUGHT` for `no_lapse`, `mass_leak_in_evaporation`, `skip_freezing`, `no_orographic_precipitation`, and `bad_deserialization`, then `Mutation Sweep: 5/5 mutants caught.`

Section 8 records what those five functions do. The exit code is real. The catch count is a property of the sweep script.

A separate process loaded the committed `ClimateEngine`, added 500 cp inside `processEvapotranspiration` after the original body, and then loaded `tools/test_climate_kernel.js`. Exit 1. `Results: 6 passed, 2 failed.` The evapotranspiration test reported `6500 !== 6000`. The 100-tick test threw `expected 180000 cp, observed 181500 cp (delta: 1500 cp)`. The 8-test gate sees an evaporation credit that the engine does not debit.

The same loader, with `evalTemperature` replaced by a function that returns 70, exited 1. `Results: 4 passed, 4 failed.` The failures were the lapse test (`70 !== 69.65` at Z=1), the geothermal test, the seasonal-range test (`got 0`), and the winter-freezing test (`got 70 F`). Orographic rain, evapotranspiration, persistence, and the 100-tick mass test still passed. The 8-test gate sees a deleted lapse.

A third loader left the engine intact and, after `processOrographicWeather`, copied the windward foot's precipitation onto column `(2,0)` from that column's own vapour. Exit 0. `Results: 8 passed, 0 failed.` The gate stays green when the lee valley rains as much as the windward foot.

## 3. Closed mass on the zero-vapour path

`ClimateEngine.prototype.setColumn` (`game/js/sim/climate/climate_engine.js:42-43`):

```javascript
humidityBp: initialWater.humidityBp || 5000,
vapourMassCp: initialWater.vapourMassCp || 10000,
```

A numeric 0 is falsy, so the default replaces it.

Probe, committed module, one fresh engine:

```text
setColumn(0, 0, 0, 0, { vapourMassCp: 0, cloudMassCp: 0, surfaceWaterCp: 0, surfaceSnowCp: 0, humidityBp: 0 })
vapour=10000 cloud=0 water=0 snow=0 hum=5000 total=10000
```

The call asked for 0 cp of water in every reservoir. `getTotalMass().total` was 10000. Those 10000 cp are atmospheric vapour created by the `||` default.

The same column was then written to vapour 0, humidity 0, temperature 10.25, and surface water 0, and serialized. The payload was:

```text
{"schemaVersion":1,"wind":{"x":1,"y":0},"columns":[{"x":0,"y":0,"z":0,"elev":0,"temp":10.25,"hum":0,"vap":0,"cld":0,"wat":0,"snw":0}]}
```

`deserialize` on a new engine returned vapour 10000, humidity 5000, temperature 55, total 10000. The payload's `vap:0` is honest. The loader creates 10000 cp. DEC-040's 2026-09-29 clarification lists water that appears from nothing as a blocking defect. The brief's section 3.1 puts vapour in that water ledger.

Cloud 0, surface water 0, and snow 0 survive `setColumn`, because those defaults are `|| 0`. Vapour and humidity do not.

On paths the gate actually feeds (nonzero vapour), mass holds. The gate's own 100-tick fixture started at 180000 cp and ended at `{"vapour":126091,"cloud":1088,"surfaceWater":52821,"surfaceSnow":0,"total":180000}`. Every reservoir sample in that run was a safe integer. A separate 20-tick ridge with 100000 cp and another with 120000 cp also closed. Phase change at 32°F moved 400 cp of liquid onto snow and left the total at 400. The creation defect is the zero input the suite never passes.

## 4. Calendar, temperature unit, humidity range

DEC-038 item 8 is a 360-day year: `dayOfYear = absoluteDay % 360` in `0..359`, and `season = floor(dayOfYear / 90)` with 0 spring, 1 summer, 2 autumn, 3 winter. Summer is days 90–179. Winter is days 270–359.

`constants.js:29` sets `DAYS_PER_YEAR: 365`. `evalTemperature` (`climate_engine.js:75-80`) uses `seasonalDelta = -20 * cos(2π * dayOfYear / 365)` and a diurnal cosine peaked at hour 12. The default day argument is 182 (`climate_engine.js:62`). Noon temperatures at Z=0, measured:

| Day | Owner season of that day number | Noon °F returned |
|---:|---|---:|
| 0 | spring, day 1 | 55 |
| 90 | summer, day 1 | 74.57 |
| 135 | mid-summer | 88.68 |
| 180 | autumn, day 1 | 94.98 |
| 182 | autumn | 95 |
| 270 | winter, day 1 | 76.29 |
| 359 | last winter day | 55.11 |

The kernel's hottest noon is day 182 at 95°F, which is autumn on the owner calendar (`floor(182 / 90) = 2`). The kernel's coldest noon is day 0 at 55°F, the first spring day. Owner midsummer day 135 is 88.68°F. Owner winter's first noon, day 270, is 76.29°F, and owner winter's last noon, day 359, is 55.11°F. The cold trough the gate locks to day 0 is the owner spring boundary. The brief's `0..364` range is the curve the code and the gate lock (`tools/test_climate_kernel.js` asserts a ~40°F gap between day 182 and day 0). DEC-039 puts the owner calendar above that brief sentence.

DEC-038 item 3 stores temperature as integer centi-Fahrenheit (`7250` means 72.50°F). Item 6 sets `CLIMATE_CONFIG.elevationScale = -35` centi-F per Z, baseline −0.35°F/Z, as a configurable coefficient.

The constant table has `LAPSE_RATE_PER_Z: 0.35` (`constants.js:13`) and no `elevationScale` key. `evalTemperature` returns `Math.round(temp * 100) / 100` in degrees (`climate_engine.js:92`). Measured samples are 74.23, 32.55, 91.5, and 95. Several of those are not integers. A constructed engine given `{ elevationScale: -35 }` returned the same Z=10 summer noon as the default engine, 91.5°F. The same constructor given `{ LAPSE_RATE_PER_Z: 0 }` returned 95°F at Z=10, so the positive degree constant is live and the owner key is ignored.

DEC-038 item 3 bounds saturation to integer basis points `0..10000`. `processOrographicWeather` writes humidity with `Math.min(15000, 5000 + liftBoostBp)` (`climate_engine.js:125`). Measured humidity on a +50 ft step was 12500 bp. On a +60 ft step it was 13000 bp. Both sit above the 10000 bp saturation value the same file uses as the condensation trigger.

## 5. Wind, orographic rain, rain shadow

The file header names prevailing-wind advection. The body never reads one column's `vapourMassCp` or `cloudMassCp` into another column. The wind vector is consumed only as a sign (`climate_engine.js:106-107`):

```javascript
const nextX = col.x + Math.sign(this.wind.x);
const nextY = col.y + Math.sign(this.wind.y);
```

A parcel of 50000 cp sat at `x=0`, elevation 0. Downwind cells at elevations 80, 80, and 0 were set to 0 cp after construction. Twenty ticks of `processOrographicWeather(182, 12)`:

| x | Elevation ft | Vapour | Cloud | Surface water | Humidity bp |
|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 208 | 56 | 49736 | 13000 |
| 1 | 80 | 0 | 0 | 0 | 5000 |
| 2 | 80 | 0 | 0 | 0 | 1000 |
| 3 | 0 | 0 | 0 | 0 | 5000 |

Total stayed 50000. The rain fell on the cell that already held the vapour. Downwind vapour stayed 0.

Brief section 3.4 condenses when the elevation gradient along the wind is positive and relative humidity passes 10000 bp. The committed slope rule needs more than 33 ft of rise before humidity reaches that line. One Z level is 10 ft (`game/js/plugins/DEUS_Levels.js` records a level as 10 ft). Probe, 10000 cp vapour on the upwind cell, one tick:

| Rise to the next cell (ft) | Humidity bp | Precipitation cp |
|---:|---:|---:|
| 0 | 1000 | 0 |
| 1 | 5150 | 0 |
| 10 | 6500 | 0 |
| 20 | 8000 | 0 |
| 33 | 9950 | 0 |
| 34 | 10100 | 240 |
| 40 | 11000 | 480 |
| 50 | 12500 | 1200 |

A one-level rise produces no rain. Mass on these rows stayed put (delta 0). The 0 ft row kept the humidity passed into `setColumn` (1000 bp); a zero slope leaves humidity as it was. Every positive rise in the table overwrites humidity from the slope.

The gate's rain-shadow fixture is three columns: `(0,0)` at 0 ft, `(1,0)` at 50 ft, `(2,0)` at 0 ft, each with 10000 cp vapour. After one summer-noon tick:

| x | Slope to the next cell (ft) | Humidity bp | Precip cp | Vapour cp |
|---:|---:|---:|---:|---:|
| 0 | +50 | 12500 | 1200 | 8000 |
| 1 | −50 | 1000 | 0 | 10000 |
| 2 | 0 | 5000 | 0 | 10000 |

`tools/test_climate_kernel.js:109-117` names column `(1,0)` the leeward column and asserts that column's precipitation is 0 and that column 0's humidity exceeds column 1's humidity by 3×. Column `(1,0)` is the crest. The valley is column `(2,0)`. Valley humidity 5000 against windward humidity 12500 is a ratio of 2.5. `MIN_RAIN_SHADOW_RATIO` (`constants.js:45`) is never read by the engine. The test compares a humidity number on the crest with a hardcoded `* 3`.

A second ridge, every cell holding 20000 cp, elevations `[0, 60, 0, 0, 60, 0]`, twenty ticks, total held at 120000:

| x | Role along +x wind | Cumulative precip cp | Vapour left |
|---:|---|---:|---:|
| 0 | first rise | 19892 | 85 |
| 1 | first descent | 0 | 20000 |
| 2 | flat floor | 0 | 20000 |
| 3 | next rise, downwind of the descent | 19892 | 85 |
| 4 | next descent | 0 | 20000 |
| 5 | flat | 0 | 20000 |

The downwind rise rained the same 19892 cp as the first rise. The descent changed a humidity field to 1000 bp and left the vapour mass on that cell at 20000. Brief section 3.4's arid lee is a dried air mass, at least 3× less rainfall than the windward slope. The committed rule flags the descending cell itself and does not change the rainfall of the next slope.

## 6. Evapotranspiration and soil

Brief section 3.5 ties evaporation to solar radiation, temperature, and wind speed, and it names dry air against humid air, and topsoil moisture. `processEvapotranspiration` (`climate_engine.js:188-194`) reads surface water and temperature:

```javascript
const thermalMultiplier = Math.max(0.1, (col.temperatureF - 32) / 50);
const evapCp = Math.min(col.surfaceWaterCp, Math.max(1, Math.floor(col.surfaceWaterCp * evapFactor * thermalMultiplier)));
```

Probe, 10000 cp surface water, 1000 cp vapour, factor 0.1. Total stayed 11000 on every row.

| Case | Temperature °F | Humidity bp | Wind x | Water change cp |
|---|---:|---:|---:|---:|
| hot, dry, wind 10 | 95 | 1000 | 10 | −1260 |
| hot, humid, wind 10 | 95 | 10000 | 10 | −1260 |
| hot, dry, wind 0 | 95 | 1000 | 0 | −1260 |
| cool, dry, wind 10 | 40 | 1000 | 10 | −160 |
| 33°F | 33 | 1000 | 10 | −100 |
| 32°F | 32 | 1000 | 10 | 0 |
| 20°F | 20 | 1000 | 10 | 0 |

Wind speed and humidity do not enter the delta. Temperature does. At 32°F and below the function leaves the water in place. The hot-row delta matches `floor(10000 * 0.1 * (95 - 32) / 50) = 1260`.

`climate_engine.js` contains no reference to soil or to `ledger.js`. `getTotalMass` sums vapour, cloud, surface water, and surface snow on climate columns only (`climate_engine.js:221-240`). `SoilStratum.getCurrentWaterMass` returns `waterMassCp` (`game/js/sim/geomorphology/soil.js:191`). Nothing in this kernel reads or writes that field. Brief section 3.1's balance includes soil moisture. Section 3.1 and the simulation path deposit precipitation on topsoil. The measured rain in section 5 stayed in `surfaceWaterCp` on the climate column.

There is no `tickClimate`, `evalInsolation`, `evalAdvection`, or `updateMassLedger`. Insolation is folded into `evalTemperature`. Advection, the soil debit, and the ledger update are absent as behavior, not only as names.

## 7. Persistence

`serialize` writes `temp` (`climate_engine.js:259`). `deserialize` calls `setColumn` and does not pass `c.temp` (`climate_engine.js:278-286`). `setColumn` sets `temperatureF` from `evalTemperature(surfaceZ, 0, 12)` (`climate_engine.js:41`).

The section 3 payload stored `temp: 10.25`. The restored column's temperature was 55, which is `evalTemperature(0, 0, 12)` on this engine (base 65, seasonal −20 on day 0, diurnal +10 at noon). Humidity 0 came back as 5000. Vapour 0 came back as 10000.

Wind `{ x: 0, y: 4 }` restored as `{ x: 0, y: 4 }`. Nonzero snow and cloud are what the gate's persistence test checks (`tools/test_climate_kernel.js:186-206`), and that test passed.

`REPORT.md` states that cell temperature offsets, wind vectors, and mass reservoirs round-trip with zero data loss. Wind on this probe did. Temperature 10.25 did not. A zero vapour reservoir did not.

## 8. Mutation sweep and the report's catch table

The sweep is the block under `process.argv.includes('--mutation-sweep')` in `tools/test_climate_kernel.js:242-313`. Each mutant constructs an engine and asserts a condition that is already false before the physics under test runs:

| Name in the sweep | Calls to the method the report says was disabled | Why the assertion throws on an unmodified engine |
|---|---|---|
| `no_lapse` | `evalTemperature` ran twice. It was called with `LAPSE_RATE_PER_Z: 0`, and the assert requires the two temperatures to differ. | Z=0 and Z=10 are equal when the coefficient is 0, so `notStrictEqual` throws. |
| `mass_leak_in_evaporation` | `processEvapotranspiration`: 0 | The mutant subtracts 100 cp from `surfaceWaterCp` and calls `assertClosedMass(2000)`. |
| `skip_freezing` | `processPhaseTransitions`: 0 | The mutant sets temperature to 20 and asserts liquid water is already 0. The liquid is still 1000. |
| `no_orographic_precipitation` | `processOrographicWeather`: 0 | Precipitation is still the constructor's 0, and the assert requires it to be positive. |
| `bad_deserialization` | `serialize` 1, `deserialize` 1 | The mutant rewrites `"wat":1000` to `"wat":999` and asserts the total is still 1000. |

The report's table says these were caught by `test_elevation_lapse`, `test_evapotranspiration`, `test_phase_transitions`, `test_orographic_lift`, and `test_persistence_roundtrip`. None of those identifiers appear in `tools/test_climate_kernel.js`.

Replacing `evalTemperature` with `return 70` and running the same five functions still printed caught for `no_lapse`. That mutant's call count on the original `evalTemperature` was 0. A deleted lapse satisfies `t0 === t10`, which is the condition the mutant treats as a successful catch. Section 2 shows the separate fact that the 8-test gate does fail when `evalTemperature` returns 70. The sweep adds no failing negative control for that deletion.

## 9. Browser entry

Node's `require('../game/js/sim/climate/index')` is how the gate loads the package, and the 8 tests construct a real engine that way.

In one vm realm (one global lexical environment), the scripts were evaluated in order:

| Order | Result |
|---|---|
| `constants.js`, then `climate_engine.js` | `window.DEUS.Sim.Climate` has `CONSTANTS` and `ClimateEngine`. `evalTemperature(10)` is colder than `evalTemperature(0)`. |
| `constants.js`, `climate_engine.js`, `index.js` | Throws `Identifier 'CONSTANTS' has already been declared`. `climate_engine.js:15` and `index.js:9` each declare `const CONSTANTS`. `index.js:13` declares `const ClimateEngine` in that same realm as `class ClimateEngine` (`climate_engine.js:19`). |
| `index.js` alone | Keys `CONSTANTS`, `ClimateEngine`. `CONSTANTS` has no keys. `new ClimateEngine()` throws `TypeError: Clim.ClimateEngine is not a constructor`. |

## 10. Lapse magnitude, measured and left on the owner coefficient

DEC-038 item 6 fixes the initial elevation coefficient at −0.35°F per Z (−35 centi-F per Z) and leaves the feel for later tuning. The gate asserts the Z=0 to Z=10 drop is exactly 3.5°F (`tools/test_climate_kernel.js`, `strictEqual(drop, 3.5)`). Measured summer-noon drop from Z=0 to Z=10 is 3.5°F (95 to 91.5). Winter midnight, day 0 hour 0:

| Z | Band in DEC-038 item 2 | Temperature °F |
|---:|---|---:|
| 0 | lowlands | 35 |
| 7 | highlands, bottom | 32.55 |
| 8 | highlands | 32.2 |
| 9 | highlands | 31.85 |
| 10 | highlands | 31.5 |
| 12 | sky | 30.8 |

Z=7 and Z=8 stay above 32°F on the coldest hour of the kernel's coldest day. The brief's in-game sentence asks for a drop of about 35°F from Z=0 to Z=10, and the player-effect paragraph asks highland snow while valleys stay green. Those sentences describe a gradient about ten times the owner coefficient. The parenthetical in brief section 3.2 ("3.5°F per 1,000 ft") is a third number: at 10 ft per Z, −0.35°F/Z is 35°F per 1,000 ft. The kernel matches the owner coefficient and the gate's 3.5°F assertion. This review does not ask for a different coefficient. Section 4 still stands: the coefficient has to be the configurable −35 centi-F key, stored in integer centi-F.

The diurnal amplitude is ±10°F (`constants.js:39`), twenty degrees from midnight to noon. The elevation gap from the valley to Z=10 is 3.5°F. Winter noon at Z=10 is 51.5°F, so a snowpack created at winter midnight is liquid again by noon under `processPhaseTransitions`, which moves the entire snow reservoir in one call when temperature is above 32 (`climate_engine.js:210-212`).

## 11. Behavior the probes confirmed

These held on the committed module and should survive a repair:

- Nonzero integer reservoirs in the gate's 100-tick fixture stay integers and sum to the starting total, including across `processOrographicWeather`, `processPhaseTransitions`, and `processEvapotranspiration`.
- Freezing and melting move the same centipound count between `surfaceWaterCp` and `surfaceSnowCp`. At 32°F the liquid moves onto snow.
- The positive `LAPSE_RATE_PER_Z` of 0.35 degrees per Z cools Z≥0, and the geothermal term warms Z<0 by 0.15 degrees per level. The gate covers both. Geothermal warming is absent from brief section 3.2; it is present and tested.
- Below freezing, `processEvapotranspiration` leaves surface water in place.
- A wind object round-trips through `serialize` / `deserialize`.
- The CommonJS load used by the gate constructs an engine.
- The diff stays inside the lane whitelist. No art was added.

## 12. What a resubmission has to clear

Measured against `2f4bdf206dfe446137e299326eb9e13091228226`:

1. `setColumn` and `deserialize` keep a numeric 0 in vapour and humidity. A serialized temperature comes back as that temperature. A dry atmosphere stays 0 cp.
2. Temperature is an integer centi-F field. Elevation cooling reads a configurable `elevationScale` whose baseline is −35 centi-F per Z.
3. `dayOfYear` uses the 360-day calendar. The warm peak falls in summer (days 90–179). The cold trough falls in winter (days 270–359).
4. Stored humidity stays inside 0..10000 bp.
5. Wind carries vapour and cloud centipounds onto the downwind cell. A rise of one Z level (10 ft) can condense that arriving mass. After a descent, the next windward slope rains at most one third of the first windward slope when both slopes see the same arriving parcel.
6. Evaporation changes when wind speed changes and when humidity changes. The water debit hits topsoil `waterMassCp` or the surface reservoir the soil column actually stores, and the vapour credit equals that debit in integer centipounds.
7. Precipitation credits that same topsoil water or snow reservoir by the centipounds it removes from cloud.
8. The mutation sweep flips switches inside the engine and reruns the gate. Each switch leaves the suite failing on an assertion about engine state. The suite also fails for a zero-vapour round-trip, a 10 ft rise that should rain, a second windward slope that rains a full load, a winter day warmer than a summer day, and an evapotranspiration delta that ignores wind.
9. The three climate scripts can be evaluated in one page realm, and `new ClimateEngine()` runs. The Node `require` path keeps working.

VERDICT: FAIL
