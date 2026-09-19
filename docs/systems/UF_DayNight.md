# UF_DayNight

## Purpose

Applies ambient day/night lighting to world maps using UF_Core's global clock. Ground and upper levels follow the surface day. Subterranean levels z=-1 and z=-2 always use the existing midnight tone `[-80,-75,-15,60]`, regardless of the clock (user decision 2026-09-19). Switching back to Ground restores that hour's lighting on the next screen update. This does not pause or replace the simulation clock, change schedules, or remove local light sources.

File: `game/js/plugins/UF_DayNight.js`. Loads after UF_Core, UF_World and UF_Visuals; UF_Visuals' duplicate ambient lighting is disabled by its existing live parameter. No registration or catalog change is required.

## Public API (`UF.DayNight`)

| Member | Contract |
|---|---|
| `viewLevel()` | Displayed `{x,y,z}` from `World.viewLevel()`, or null outside the world; uses `isWorldMap` when available. Legacy World map IDs are treated as Ground. |
| `viewZ()` | Displayed z, else 0. |
| `hours()` | Actual global clock hour plus minute/60; defaults to noon if the clock is absent. Never substitutes midnight underground. |
| `toneFor(hour, z=0)` | Fresh `[red,green,blue,grey]` tone array. Surface/upper levels interpolate the existing clock keyframes; -1/-2 always return midnight tone. |
| `daylight(hour=hours(), z=0)` | 0 at night, 1 in full daylight, interpolated during dawn/dusk. Always 0 underground. |
| `phase(hour=hours(), z=0)` | `day`, `dawn`, `dusk`, or `night`; always `night` underground. |
| `isNight(hour=hours(), z=0)` | Whether that hour/level has night ambient light. |
| `visionFactor(hour=hours(), z=viewZ())` | Sight multiplier: `NightVision` (default 0.55) at night, 1 by day, interpolated between. The omitted level follows the rendered view because this is used by UF_Fog's displayed observers. Simulation consumers must pass their record's own z. |
| `onWorldMap()` | True for any of the five viewed world maps, false for unrelated maps. |
| `ClockSprite` | Clock/speed badge class attached to Scene_Map as `_ufClock`. Clock hour remains real time; if ShowClock is enabled, the phase label reflects the viewed level. |

The pure time APIs keep omitted z as Ground for compatibility; this avoids making an offscreen creature's surface schedule depend on which level the player views. The screen hook passes the actual viewed z explicitly. Ambient tint is applied every Game_Screen update, including while paused; it does not gate simulation.

## Events and engine hooks

No emitted/listened events. Aliases `Game_Screen.update` (ambient tone), `Scene_Map.createDisplayObjects` (clock badge), and `Scene_Boot.start` (test registration), always calling the original method. If UF_Fog is loaded, wraps `observers()` to scale returned radii. No engine method is replaced outright.

## Save data

No new persistent data or migration. The existing `$ufTime` save remains authoritative; lighting is recalculated from its current hour and the displayed level after load. This plugin does not modify lights, campfires, their state or their sprites.

## Checks

The embedded `daynight` suite checks clock presence, time-keyed tones, smooth five-minute transitions, phase names, reduced night vision, live Ground noon/night tone, clock visibility, fog scaling when observers exist, and runtime errors.

New checks (2026-09-19):

- `underground_always_night`: -1/-2 pure tone, phase, daylight and sight factor at midnight, dawn, noon, dusk and 23:30.
- `minus1_screen_stays_night` / `minus2_screen_stays_night`: actual transfers to each underground map; the screen remains night at those five clock times and uses night sight at noon.
- `underground_clock_advances`: 180 rendered frames at x1 on -2 advance the real clock while its ambient tone remains unchanged.
- `ground_restores_daylight`: return from underground to Ground at noon restores zero tint and full sight.

Captures: `noon`, `night`, `cave_minus1_noon`, `cave_minus2_noon`, `ground_after_caves`. Tests restore clock hour/minute, speed, pause and original level after checking.

## Status (2026-09-19)

Syntax and diff checks pass. Fresh snapshot `codex_underground_night_20260919_a`, suite `daynight`: **13 passed, 0 failed**, no captured runtime errors. Both underground maps returned `[-80,-75,-15,60]` at all five sampled clock times; 180 rendered frames at x1 advanced the clock from minute 720 to 723 without changing the -2 tone. Returning to Ground at noon restored `[0,0,0,0]` and sight factor 1.

All five PNGs were opened: `daynight.noon.png` shows bright grassland, a river and horses; `night.png` shows that surface scene under the blue-dark night tint; `cave_minus1_noon.png` shows a dark purple soil chamber, settlers, campfire and water; `cave_minus2_noon.png` shows a blue-dark stone chamber with settlers, campfire and water; `ground_after_caves.png` restores bright surface grassland. These captures predate the concurrent cave-flora/wall appearance changes and are lighting evidence only.

A first fresh negative snapshot (`codex_underground_night_20260919_mutant`) could not reach the suite: it captured concurrent WorldGen changes before their flora configuration, causing `Missing underground flora configuration for level -1`. Its single failure PNG was opened (surface grassland, pond and two settlers). It supplies no negative lighting-test evidence.

Negative verification then used the coherent `codex_underground_night_20260919_a` snapshot only: changed its underground predicate to always false and reran `tools/run_tests.js daynight --game <snapshot>`. Result: **10 passed, 4 failed (exit 1)**. The pure underground check, both live underground screen checks and the unchanged-tone clock-advance check failed; both noon cave tones became `[0,0,0,0]` and sight became 1. The live plugin retains its correct -1/-2 predicate. Positive results were preserved as `test_output/results_positive.txt`; negative results are `test_output/results.txt`. All five negative screenshots use distinct `daynight.negative_*.png` names and were opened: Ground noon/night shows the expected bright/dark grassland and settlers, both underground noon captures visibly show incorrectly bright soil/stone chambers, and Ground after returning remains bright. The runner cleaned the original positive PNGs before the negative run despite the distinct filenames; they were opened during the positive run but are no longer retained. A fresh positive run is required for retained positive visual evidence. The snapshot source now intentionally contains the negative mutation, not the shipping implementation.

Fresh positive snapshot `codex_underground_night_20260919_c` restores retained visual evidence after the earlier runner cleanup: **13 passed, 0 failed (exit 0)**, with all five generated PNGs opened. Noon and return-to-Ground show bright grassland with a central crop/grass patch; night shows the same terrain dark blue. The -1 noon capture shows blue-purple cavern floor, soil borders, campfire, four settlers and a water pool; -2 shows a dark soil-floored cavern, blue stone borders, settlers, campfire and pool. Both underground screen tones stay at the midnight constant at all five sampled times; the global clock advances 720 to 723. This fresh snapshot includes concurrent GEN3 cavern geometry and underground flora configuration; it verifies lighting, not approval of those separate changes. Evidence lives under its `test_output` directory, including `results.txt` and the original five `daynight.*.png` names.

Editor F5/F8 has not been run. Local point-light illumination is not implemented in this plugin; no new light-source rendering is claimed. UF_Fog's wider level integration is outside this change. Caller audit found `UF_Wildlife.currentDayPhase()` calls `DayNight.phase()` without z, so wildlife sleep continues following the global surface day regardless of viewed level; this task changes ambient light, not creature schedules. No other external DayNight API callers were found in the live UF plugins.
