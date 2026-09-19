# UF_Fire
Fire as a cell state that spreads, DF style (VISION V21, V25): a burning cell rolls every beat to light its 4 neighbours by their flammability, spends its fuel, then its object becomes what the catalog says (a tree a stump, a wooden wall rubble, grass nothing on ash ground, a bed or stockpile nothing with the items on it destroyed). Units won't step into fire; a unit standing in it is hurt (a damage number, and its sheet's hurt frames when the art has them; no code-made flinch or flash, VISION V58), gets a thought, drops its job and walks out; the player's colonists put out fires near their camp with water. Status: built 2026-09-19; the code-made hurt flinch removed the same day (review finding M3, V58 "sprites only"). Checks: `fire` (10 checks, all PASS on snapshots 2026-09-19; each one seen failing on a sabotaged copy; `units_hurt` seen failing twice more after the change, see Checks).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Fire.js` · **Catalog key:** `fire` in `game/data/UF_WorldCatalog.json` · **Load order:** after `UF_Objects`, `UF_Items`, `UF_Jobs` (and `UF_Interact`, `UF_Colonists`, `UF_Combat` when present), before `UF_Test`. It wraps `UF.Interact` again at `Scene_Boot.start`, so an earlier position still gets the right-click options. Registered in the real `game/js/plugins.js` (status true, after `UF_Talk`, before `UF_Test`; seen 2026-09-19).

## API (`UF.Fire`)
### Level compatibility (2026-09-19)

Area-taking Fire APIs accept a level handle `{ x, y, z }`; omitted `z` means ground. Records returned for burning cells, douse targets, water/stand cells, and filled buckets carry `z`; douse records use `{ area: { x, y }, x, y, z }`. Event area handles preserve nonzero `z`. Unit damage, fleeing, spread, wetness, retargeting, source indexing and visible flame selection distinguish levels. A douse worker moved to another level before application returns `"continue"` with `job.reason`, allowing `Jobs.finish` to request a fresh plan; the plan then refuses normally without an exception or console error.

Nonzero levels are enabled only when the documented World seam exposes **all three** `viewLevel`, `levelOfMapId`, and `isLevel`. No function-arity detection is used. A legacy core refuses explicit nonzero or invalid levels before creating Fire state or changing ground objects. Accepted z values are integer numbers -2 through +2; strings, null, fractions and nonfinite values are refused. Previously saved nonzero fires remain inert when loaded under a legacy core, so they cannot damage surface units or overwrite surface cells.

The existing ground save key remains `"ax,ay:x,y"`; nonzero keys are `"ax,ay,z:x,y"`. Both burning and wet maps use this spelling. Existing ground saves need no migration. Every stored supported level fire advances on each map-update beat, regardless of the displayed level; only the displayed level supplies flame sprites, contained-source escapes and random ignition candidates. Surface ash painting remains ground-only: upper/cave terrain tiles are derived from level shapes and must not be overwritten with the surface tileset's ash IDs.

Standalone contract checks: `node tools/test_z_fire.js`. These execute the real plugin in a Node VM with legacy and documented-seam engine doubles. They cover rejection without ground mutation, independent damage/spread/wetness/events, all five levels advancing through real `Game_Map.update` beats while the view switches, burnout object/item isolation, JSON state round-trip, douse records/worker levels, source-change event isolation, and legacy loading of stored level fires. A deliberate mutation that drops unit z from the actual damage lookup is required to fail. These checks do not establish RMMZ rendering or F5 Playtest behavior.

- `ignite(area: {x, y}, x, y, opts?: { cause?: string, force?: bool })` → bool. Lights the cell when its object burns (a rule with `burn` > 0, not `never`, not `source`), the cell isn't burning and isn't wet (`force` ignores wet). Record: `{ since: beat, fuel: rule.burn, obj: objectId }`. Emits `fire:ignited`. A cell inside the camp radius gets a douse job at once (`campDouse`).
- `extinguish(area, x, y, how = "out", unit?)` → `{ from, to }` (object ids) or `null` when the cell wasn't burning. `how === "doused"`: the rule's `dousedBecomes` replaces the object (a tree → a dead tree) and the cell can't catch for `douse.wetBeats`. Open douse jobs for the cell are cancelled ("the fire is out"); assigned ones plan again.
- `isBurning(area, x, y)` → bool; `blocksCell(area, x, y)` → bool (the same test, named for path planners); `flammableAt(area, x, y)` → bool.
- `burningCells()` → `[{ key, area, x, y, since, fuel, obj }]`; `count()` → number of burning cells.
- `ruleFor(typeOrId)` → the catalog rule or `null` (never burns); `rules()`; `config()` → the catalog `fire` block with numeric defaults (`beatFrames` 60, `startChance` 0, `damage` [1, 3], `thought`, `douse`, `rules`).
- `step(n = 1)` → the beat count after running `n` beats now (tests and tools; the live beat keeps running). `beatNow()`; `beatFrames()` → map updates per beat (`UF.Beat.frames` when it exists, else the catalog's `beatFrames`).
- `douse(area, x, y, opts?: { cause?, priority?, owner? })` → a `douse` job (open, `owner` null unless given, `params.faction = UF.Factions.playerId()`, priority `douse.priority`) or `null` (not burning, a douse job already covers the cell, or no water within `douse.waterRadius`).
- `douseJobs()` → active douse jobs (open, travel, work); `campDouse(key?)` → how many douse jobs it opened; `camp()` → `{ area, x, y, radius }` from `UF.Colonists.site()` (radius = max(`douse.campRadius`, site radius + 4)) or `null`.
- `findWater(area, x, y, radius, unit?)` → `{ x, y, stand }`: the water cell nearest to (x, y) (Chebyshev rings) with a dry, standable, unburnt 4-neighbour `stand` (nearest to the unit); `standBeside(area, x, y, unit?)` → such a neighbour of any cell or `null`.
- `options(x, y)` → the right-click options UF_Fire adds for a cell on screen (below); `wrapInteract()` → installs them (idempotent).
- `sourceCells()` → cell indices of contained sources (campfires) in the area on screen.
- `layer()` → the scene's `Sprite_UFFireLayer`; `spriteAt(x, y)` → the flame sprite of a burning cell in view or `null`; `perf()` → `{ frames, layerMs, layerMax, rebuilds, sprites, beats, simMs, simMax }` since `resetPerf()`; `errors()` → errors caught inside the beat or the layer.
- `flamePixels(variant: "low" | "tall")` → `{ w, h, frames, anchor, data (RGBA) }` (pure, deterministic); `generated.flame()` / `generated.flameTall()` → the cached bitmaps; `FLAME_RAMP`, `FLAME_VARIANTS`, `SALT`, `Sprite_Layer`.

### The beat

2026-09-19 API addition: `douse(area,x,y,{faction,...})` may explicitly set the responder faction; omitting it retains the player-faction default. `UF_FireSafety` uses this for real local NPC jobs after water/path checks. The base `campDouse` remains player-camp-only; the optional adapter supplies wider household/settlement coverage and routine-work interruption, not free extinction or a change to spread/fuel rules.
Driven from `Game_Map.update` (so pause stops it and the speed keys multiply it): once per `UF.Beat.count` step when `UF.Beat` exists (at most 8 caught up per update), else every `beatFrames` map updates. Each beat, in order:
1. Every burning cell: if its object no longer burns (chopped, dismantled, built over) the fire dies (`fire:extinguished`, how `"gone"`). Else each 4-neighbour that burns, isn't burning and isn't wet catches when `hash32(seed, SALT.spread, beat, area, x, y, direction) / 2^32 < neighbour.spread`. The cell spends 1 fuel; at 0 it burns out: items on it are removed through `UF.Items.remove` when `destroysItems`, the object becomes `becomes` (null = nothing) through `UF.Objects.setIn`, the ground kind becomes `ground` when given (UF_Tiles A2 base + autotile shape, the 8 neighbours re-shaped; water and rock are left alone). Emits `fire:burnedOut`.
2. Contained sources (rule `source: true`, the campfire) of the area on screen: never burn; each flammable 4-neighbour catches with `escapeChance` (seeded, `SALT.escape`).
3. Accidental start: with `startChance` > 0, one seeded cell of the area on screen per successful roll (off by default).
4. New fires are lit (all rolls used the state at the start of the beat, so the order of cells doesn't matter).
5. Units standing in a burning cell (not fliers, not dying): damage `damage[0]..damage[1]` (seeded, `SALT.damage`) off `data.hp`; with UF_Combat: an orange `-N` popup (`addPopup`) and `onUnitDeath` at 0 hp (without UF_Combat the unit is removed); with UF_Anim and a sidecar that lists `animations.hurt`: those columns for 10 frames (`UF.Anim.hurtColumns` and `playFrames`). It does not call `UF.Combat.playHitAnimation` (a code-made recoil and red flash, which V58 rules out); with UF_Colonists a thought (`fire.thought.text`, strength −8) at most every `thought.everyBeats` beats, for colonists and any unit with a `data.thoughts` array; its active job is cancelled ("fled from the fire"); it walks to the nearest unburnt standable cell within 4. Emits `fire:unitBurned`.
6. Douse jobs for burning cells inside the camp radius, nearest to the camp centre first, up to `douse.maxOpen` active douse jobs; a cell with no water in reach is looked at again after 10 beats.
7. Expired wet marks are dropped.

### Flammability (catalog `fire.rules`, first match wins)
A rule matches when its `ids` hold the object's id, or all its `tags` are on the object. Objects no rule matches never burn. As written on 2026-09-19:

| Rule | spread / beat | burn (beats) | becomes | other |
|---|---|---|---|---|
| tag `fire` (campfire) | source | – | – | `escapeChance` 0.0005 |
| ids cactus, cactus_tall, lily_pad | never | | | |
| tags `stone`, `mineral`, `remains` | never | | | (boulders, loose stones, rubble, stone walls and doors, ore, crystals, bones) |
| id dead_tree | 0.08 | 30 | stump | tall flames |
| tag `tree` | 0.05 | 40 | stump | doused: dead_tree; tall flames |
| tag `stump` | 0.04 | 20 | nothing | ash ground |
| tag `bush` | 0.25 | 8 | nothing | ash ground |
| tags `wall`+`wood` | 0.06 | 30 | rubble | tall flames |
| tags `door`+`wood` | 0.08 | 24 | rubble | tall flames |
| tag `bed` | 0.35 | 6 | nothing | items destroyed |
| tag `stockpile` (also the weapon rack) | 0.2 | 10 | nothing | items destroyed |
| ids bowyer_bench, fletcher_bench, tanning_rack | 0.1 | 20 | rubble | items destroyed |
| tag `bridge` | 0.08 | 24 | nothing | |
| tag `plant` (grass, reeds, flowers, ferns, lichen, wild grain) | 0.4 | 4 | nothing | ash ground |

Work stone, furnace, smithy, farm plot and well match no rule: they don't burn.

### The douse job (`UF.Jobs.define("douse")`)
| Phase | plan | work | apply |
|---|---|---|---|
| 0 | `params.fire` still burns (else the nearest burning cell within 8 cells that no other douse job has, else fails "the fire is out"); a water cell within `douse.waterRadius` of the fire with a dry standable neighbour (else fails "no water within reach"); stand on that neighbour | `fillBeats` × beat frames (60) | `params.filled = { area, x, y, water }`; `"continue"` |
| 1 | the fire again (as above); stand on an unburnt standable 4-neighbour of it nearest to the worker (else fails "can't reach the fire") | `beats` × beat frames (180) | `extinguish(..., "doused", unit)`; `job.result = { doused, fireKey, from, to }` |

`job.target` stays the burning cell (the designation marker sits on the fire). Card text: "Fetching water for a fire" / "Putting out a fire". Params: `{ faction, fireKey, fire: {area, x, y}, cause, water?, filled? }`.

## State it saves
- `UF.World.state.fire = { version: 1, beat, burning: { "ax,ay:x,y": { since, fuel, obj } }, wet: { "ax,ay:x,y": untilBeat } }` (saved in `contents.ufWorld`).
- `unit.data.hp` (lowered), `unit.data.burnedAt` (beat), `unit.data.fireThoughtBeat` (beat of the last fire thought).
- Object, item and ground changes go through UF_Objects, UF_Items and `UF.World.setTile`, which save them.
- Caches, rebuilt from the state: the burning-cell index per area, the source index of the area on screen, the "no water near" marks, the flame bitmaps.

## Events (UF.Events)
- Emits `fire:ignited(area, x, y, cause, objectId)` (causes: `player`, `spread`, `campfire`, `accident`, `test`, …), `fire:burnedOut(area, x, y, fromId, toId, itemsDestroyed)`, `fire:extinguished(area, x, y, how, unit | null, { from, to } | null)` (how: `doused`, `out`, `gone`), `fire:unitBurned(unit, damage, died)`.
- Listens: `world:objectChanged`, `world:levelObjectChanged` (keep the source index for the corresponding displayed level).

## Keys and mouse
Right-click (UF_Interact's menu, wrapped at runtime): **"Set on fire"** on a cell whose object burns (lights it at once, even a wet cell); **"Put out the fire"** on a burning cell with no douse job yet (opens a douse designation; greyed "Put out the fire (no water near)" without water in reach). Both are inserted before "Look". The wrap covers `UF.Interact.optionsFor`, the menu window's constructor and `setOptions` (the "Back" of the build submenu), because UF_Interact's `open` calls its own inner `optionsFor`.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `UF_GenFlame` | Flames on a burning cell (grass, bushes, beds, stockpiles, stumps): 3 frames of 64×64 side by side; the cell's ground square is the frame's bottom-right 48×48, anchor (40, 64) | code-drawn placeholder (`flamePixels("low")`): colours from `art/palette/uf.hex` (238 #9A2800, 237 #CA3900, 236 #FF5100, 235 #FF8E10, 234 #FFC228, 233 #FFEF41, 1 #FBF3CE), checker micro-dither between bands, one art pixel = one screen pixel at zoom 1, alpha 0 or 255, nearest-neighbour scaling |
| `UF_GenFlame_Tall` | Flames on trees, wooden walls and doors: 3 frames of 112×112, ground square bottom-right, anchor (88, 112); extra tongues up to 40 px of height placed by the 45° projection | code-drawn placeholder (`flamePixels("tall")`) |
| `ash` ground kind | Where grass, bushes and stumps burned out | UF_Tiles code-drawn ground (catalog `groundKinds`) |
| `$UF_Stock_People1_4`, `$UF_Stock_Actor1_0` | Stock character fixtures in the `fire` suite only | Stock RMMZ placeholders |

The flames lean up-left at half the 45° slope (a judgement call: at the full slope they read as streaks, not flames; the user decides). No request for real flame art exists yet in `docs/ASSET_REQUESTS.md`.

## Checks (suite `fire`, default; ~45 s including boot)
The suite pauses the world, turns the colonists' decisions off, clears a 22×14 arena of free land 34–90 cells from the camp (objects and ground saved), and restores everything at the end.

| Check | FAILs when |
|---|---|
| `spreads_in_grass` | A 9×5 field of tall grass with two bushes: `UF.Interact.optionsFor` or the real menu window on its west cell lacks "Set on fire", choosing it doesn't light the cell, fewer than 5 live beats pass in 15 s at ×1, fewer than 2 cells burn after them, the flame sprite of a burning cell isn't a visible `UF_GenFlame*` tilemap child with opaque pixels at z = foot row + 1 above the cell's object, fewer than 30 of 45 cells burn out, the fire reached less than 6 cells from its start, anything else in the arena caught, or burnt cells aren't on `ash` ground |
| `stone_stops` | Lighting a boulder succeeds, or with the whole west side of a grass / boulder column / grass band burning, after 60 beats a boulder or the east grass burned or changed |
| `tree_to_stump` | A lone oak doesn't burn exactly its fuel (40 beats), isn't a stump afterwards, or the catalog's tree rule doesn't say `stump` |
| `wall_to_rubble` | A lone wooden wall isn't rubble after burning out |
| `items_destroyed` | A straw bed with 2 logs and a stockpile with 3 stones don't burn out to nothing with their items removed, or 2 logs on bare ground 2 cells away don't survive |
| `units_hurt` | A test unit (20 hp) standing in burning grass doesn't lose 1–3 hp in one beat; shows no UF_Combat popup; `fire:unitBurned` isn't emitted exactly once for it with the hp it lost; **any code-made motion starts on it** (its event's `_combatAnim`, UF_Combat's recoil and flash: V58); with UF_Anim, its sheet given a hurt column (1) by a sidecar set in code for the check, that column isn't shown on its sprite within 4 frames (`UF.Anim.log`); it gets no "Was burned by fire." thought, keeps its job, or doesn't walk to an unburnt cell; or another unit may step into a burning cell (`canPass` west) or may not step away (`canPass` south) |
| `douse` | A grass fire inside the camp radius doesn't get an open douse job at once (owner null, the player's faction, catalog priority; a test water cell is placed when the camp has no water in reach); or in the arena: a burning oak's douse job isn't open with the player's faction, isn't taken by a test worker, doesn't finish at ×8 within 30 s, the worker didn't fill beside a water cell or didn't work beside the fire, the oak isn't a dead tree and out, or the work at the fire isn't 3 beats (180 ticks) |
| `seeded_and_saved` | 8 beats of a 5×4 grass fire from the same state give different results twice, or a JsonEx save/load after beat 4 changes the outcome, the round-trip isn't identical, or `makeSaveContents().ufWorld.fire` isn't the live state |
| `perf` | With 100 burning cells in view at zoom ⅓ and the world running at ×1 for 150 frames: fewer than 100 flame sprites, fewer than 2 beats, or the layer's update plus the beats cost more than 0.5 ms per frame on average |
| `no_errors` | Any uncaught error during the suite, or any error caught inside the fire beat or layer |

Screenshots: `fire.grass_fire_spreading.png` (zoom ⅔, paused after 5 live beats: the grass field burning on its west side, two burnt cells on ash ground), `fire.perf_100_cells.png` (zoom ⅓, the 10×10 block burning).

Results (2026-09-19, snapshots of the working tree with `--plugins UF_Fire` and the catalog's `fire` key): `fire` 10 passed, 0 failed on three runs (random world seeds); `objects` 17/17; `smoke` 9/9 with UF_Fire and 9/9 on a fresh snapshot of the live plugin list (UF_Fire not registered, the catalog's new `fire` key present); `look` 21/21 twice and 20/21 once (`menu_creates_designation`: marker z 225, want 241; not repeated in two reruns; the control snapshot passed its one run); `jobs` 14/17 with the same three failures (`hunt`, `open_job_taken`, `saved`) and the same job numbers as a control snapshot without UF_Fire at the same seed 424242 (the known K16 failures). Measured with 100 burning cells at zoom ⅓ over 150 frames: the layer 0.056–0.060 ms per frame (max 0.78–1.23), a beat 0.39–0.88 ms (max 1.42), 0.065–0.067 ms per frame in total (Ryzen 7 8845HS / RTX 4060 laptop, nw.exe test runs). Seen failing: all 10 on one sabotaged snapshot (menu option not added, stone flammable, trees becoming dead trees, walls becoming nothing, items kept, no burning of units, water doing nothing, `Math.random` spread, a 1 ms busy loop per frame, a throw in beat 3), each with its own detail.

After the M3 change (2026-09-19, snapshots of the working tree, with the catalog's new `talk` keys): `fire` 10/10 on a snapshot before the copy-back and 10/10 again on a fresh snapshot of `game/` after it (`smoke` 13/13 on another fresh snapshot) (the detail: `hurt reaction: popup true, fire:unitBurned 1x (dmg 3), code-made motion false (must be false, V58), sheet hurt frames 4 frame(s) of column 1`). Provoked twice on sabotaged copies: with the old `playHitAnimation` call put back, `FAIL fire.units_hurt - hp 20 -> 18 (damage 1-3); hurt reaction: popup true, fire:unitBurned 1x (dmg 2), code-made motion true (must be false, V58), sheet hurt frames 4 frame(s) of column 1; …`; with the hurt-frame call removed, `FAIL fire.units_hurt - hp 20 -> 18 (damage 1-3); hurt reaction: popup true, fire:unitBurned 1x (dmg 2), code-made motion false (must be false, V58), sheet hurt frames 0 frame(s) of column 1; …` (the other 9 checks passed in both).

## Replaced core methods
None, aliases only: `Game_Map.prototype.update`, `Game_CharacterBase.prototype.isMapPassable` (unit events only: refuses a step into a burning cell; leaving one is allowed), `Spriteset_Map.prototype.createCharacters`, `DataManager.createGameObjects`, `Scene_Boot.prototype.start`. Runtime wraps of another plugin's public API: `UF.Interact.optionsFor`, `UF.Interact.MenuWindow.prototype.initialize` and `.setOptions`.

## Known limits
- Z-compatibility Ground regression `codex_zcompat_20260919_fire_b` passed 10/10 after the stale-worker replan adjustment. Opened both screenshots: grass burning along the left side of the fixture with gray ash, and a zoomed-out 10x10 flame grid. Save/load, physical dousing, unit damage, item destruction, stone barriers and sprite checks passed. The new three stock-character fixture substitutions are included. RMMZ editor F5/F8 and five-real-map concurrency remain unchecked.
- **Planned paths don't know about fire.** The on-screen step refuses to enter a burning cell (the `isMapPassable` alias), which RMMZ's `findDirectionTo` search respects. The whole-area planner documented in `UF_World.md` (`findPath`, 2026-09-19, not yet in `UF_World.js` when this was built) plans over its own grid and offers only `avoid` for one cell, so a walker on a planned path will stop at a fire and give up rather than walk round it until `findPath` gets a blocked-cell or cost hook; `UF.Fire.blocksCell` is ready for one.
- Stored fire damage and spread advance off screen on every supported level. Off-screen movement avoidance still depends on UF_World consulting `UF.Fire.blocksCell`; Fire's own movement alias covers displayed unit events. Campfire escapes and accidental starts only happen in the area on screen.
- Spread is 4-way, one roll per burning neighbour per beat, by the target's flammability only: no wind, rain, heat or smoke. Items lying on burning grass survive; only rules with `destroysItems` burn items.
- UF_Combat has no system doc and no public damage function: UF_Fire lowers `data.hp` itself, fills in missing hp through `UF.Combat.calcAC` (which sets hp as a side effect), and uses `addPopup` and `onUnitDeath`. A burned unit whose sheet has no hurt frames shows its plain frames (V58).
- Douse work is counted in map updates (60 per beat) as UF_Jobs does today; when UF_Jobs moves to per-beat progress (WORLD_ARCHITECTURE §1.7) the handler's `work` must return beats.
- Colonists take a douse job at their next decision (after their current job and needs), so a busy camp reacts slowly; fires outside the camp radius wait for the player's "Put out the fire". Other factions don't fight fires (their societies don't take designations).
- A burned stockpile stays in `state.colony.stockpiles` (UF_Colonists' list) until that plugin notices.
- UF_Colonists' `every_job_is_physical` counts object, item, unit and need changes: a douse on grass only changes the fire state, so it would count as not physical if one happened during that suite.
- Flames are not lit at night (the day/night tone darkens them like everything else); no glow or light.
- The `ash` ground kind's edge outline makes a burnt patch look like a raised grey slab at ⅔ zoom (seen in `fire.grass_fire_spreading.png`); the look belongs to the ash ground kind, not to this plugin.
- `Set on fire` lights the cell at once; nobody walks there with a torch.
