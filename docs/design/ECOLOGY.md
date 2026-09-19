# Ecology: census, recovery, monster spawns and plant spread

**Date:** 2026-09-19
**Written by:** Claude Code (the "DF mechanics" claim in `docs/STATUS.md`, 13:45)
**Status:** design only. Nothing in this file is built, registered or measured. It extends the snapshot-only `UF_Ecology.js` version 1 that Codex wrote (STATUS "Verified working", not registered, not F5-tested).
**Binding decisions:** VISION V74 (renewables replenish, minerals don't), V75 (monsters keep spawning: seeded, capped, away from sites), V82 and V83 (the resource atlas and the fair, seeded ecology director), V68 (nothing spawns where it can't move), V80 (five levels, so everything carries z), V50 (budgets), V48 (beats), V85 (every duration is counted in world beats and differs by kind), V28 and V9 (DF mechanics only, no DF text, names or numbers), AGENTS rule 7 (no new names).
**Contract:** `docs/design/RESOURCE_ATLAS.md` §1.2, §6, §8 and §8.1, and `docs/design/VERTICAL_WORLD.md` §4.2. Where this file and those files differ, they win.

---

## 1. The DF mechanic, in one paragraph

In Dwarf Fortress each region of the world holds a limited supply of every wild species that suits its climate, its wildness and its good or evil character. The local map never holds that supply all at once. Small groups walk in from the map edge, wander a while and walk out again, and every animal killed on the map is taken off the region's supply, so heavy hunting can empty a region of a species while the tiniest pests never run out. Breeding animals pair up and have young that grow up in stages. Creatures of the underground belong to a depth range and reach the fortress only after digging opens their cavern layer. Rare giant beasts and deep horrors come on their own clock, one at a time, drawn by how long the settlement has stood, how large and rich it has become, and whether the caverns have been opened. Plants run at two speeds. Grass covers open soil and comes back within weeks of grazing or trampling, and shrubs and herbs come up in their season where the biome suits them. Trees spread as saplings on open ground and take a long time to mature, and they never grow through a built floor or into water. Stone, ore and gems are laid down once when the world is made, and once mined they are gone. (Evidence locations are in §16. No text, token, name or number is copied from the DF files.)

**What UF keeps and what it changes.** V74 overrides DF's limited supply: renewable populations **recover toward a target**. UF keeps DF's lessons:
- Overhunting still bites. A herd hunted out can't breed, so the only way back is a slower arrival from the edge.
- Newcomers arrive as groups from the edge.
- Species are tied to levels and depth bands.
- Monsters come on a seeded clock, one small group at a time.
- Plants run at two speeds, and trees come back through saplings.
- Minerals are finite.

---

## 2. Where we start (read on 2026-09-19, 13:30-13:50)

| Piece | What it already does | What V83 still needs |
|---|---|---|
| `UF_Wildlife.js` (claimed by the creature-AI session; **it failed `node --check` at 13:34**: `SyntaxError: Unexpected token ')'` at line 1688, mid-edit) | Places herds at `world:created` by biome and region tier, with kit herds by every campfire and lair herds (`spawnWorld`, line 471). Runs the wander, flee, graze, sleep and predator AI for units with `data.ai === "wander"`. Its public `unitSpec` (line 454, exported at line 1240) builds the exact creature spec. | No births, no migration, no recovery ("hunted herds aren't replaced", UF_Wildlife.md, Known limits). |
| `UF_Objects.js` | Keeps a regrow list, `state.regrow` (line 134). A picked berry bush comes back after 48 h and a picked fruit tree after 72 h. The list is processed on `time:hour` (line 738). | No spread, no caps, and only the "picked" states regrow. |
| `UF_World.js` | V68 guard. `addUnit` (line 797) seats every unit on a free cell. `setObject` (line 502) refuses a blocking object where a unit stands. `holdOccupiedRegrowth` (line 749) makes UF_Objects' regrowth wait. | Nothing: ecology uses these as they are. |
| `UF_Ecology.js` v1 (Codex, 779 lines, not registered) | Regrows a felled tree, a gathered bush or a grass tuft on the same cell after 28, 7 or 3 days. Every 6 game hours it rolls prey and monster spawns in the current area plus one rotating area, against a per-area baseline cap. Keeps monster clearance from the start, camps, sites, people and the player. Suite `ecology`, 10 checks (reported 10/10 in STATUS; **not re-run by me**). | Its buckets are areas, not `(z, biome region)`. Its caps are per area and kind, not per species with local and global caps. No births near herds, no edge arrivals, no plant spread, no rejection of visible cells. A felled tree pops back as a grown tree on its stump. The regrowth list is scanned whole every hour and has no size bound. There is no z. |

**Decision taken here (needs the user's or Codex's nod, §14 D1):** version 2 is built **in place** in `UF_Ecology.js`. It keeps v1's save key (`UF.World.state.ecology`), its API names, its event names and its provocation scheme, and it migrates v1 saves (§4.6). STATUS credits v1 to Codex. The 13:45 claim lists `UF_Ecology.js` under this session. Codex's owned list (Ownership, Walls, Doors, Floors) doesn't include it.

---

## 3. UF's version in one picture

```text
             world:created / load                       time:hour (every 60 beats)
                    │                                              │
          ┌─────────▼─────────┐                          ┌─────────▼──────────┐
          │ region index      │  bucket = (z, area,       │ director step      │
          │ (lattice, stride 4)│  64×64 block, biome)      │ 1. due growth timers│  bounded
          │ census (sparse)   │◄──── events, O(1) ────────┤ 2. N buckets from   │  attempts
          │ targets + caps    │  unitAdded / unitRemoved  │    the round-robin  │  per step
          └───────────────────┘  objects:changed          │    cursor          │
                                                           └───┬──────┬──────┬──┘
                                     fauna: births near herds ─┘      │      └─ plants: spread, seed rain,
                                            arrivals at the edge      │         sapling → tree, cell regrowth
                                                     monsters: seeded clock, habitat or edge entry
                    every placement → one gate (§7.6) → UF.World.addUnit / UF.Objects.setIn
```

- **Census.** Per bucket: living creatures per species, counted by the herd's home cell, and renewable plants per kind. Events keep it up to date. It is never rebuilt by scanning while the game runs.
- **Director.** It runs once per game hour and services a fixed number of buckets in a seeded round-robin over every level. The visible level gets no priority (atlas §1.2).
- **Recovery channels.** Fauna: births near an existing herd, or a herd arriving from the map edge. Monsters: a seeded clock per bucket, with entry from wild habitat or the edge. Plants: spread from a parent, seed rain where a kind died out, saplings that become trees, and same-cell regrowth under caps. Minerals: none.

---

## 4. Data shapes (every one carries z)

### 4.1 The z seam: one helper, one line to switch

`docs/design/VERTICAL_BUILD_PLAN.md` (13:48) fixes the five-level API: `unit.z` beside `unit.area`, *LevelArea* `{x, y, z}`, `UF.Levels.zOf(o) = (o && o.z) | 0`, `UF.Levels.LEVELS`, trailing `z` on `World.getObject`, `cellFree`, `spawnCellFor` and `standerAt`, `addUnit({…, z})`, and `World.viewLevel()`. Legacy calls keep meaning the ground, and `currentArea()` is `null` while another level is shown. It also lists UF_Ecology as ground-only (fail-closed) for its slices V1–V3. UF_Ecology puts all of it behind one helper block:

```js
const L = () => (window.UF && UF.Levels) || null;
const zOf = o => (L() && L().zOf ? L().zOf(o) : ((o && o.z) | 0));           // omitted z = ground
const ecologyLevels = () => (L() && L().LEVELS ? L().LEVELS : [0])
    .filter(z => levelTable(z).enabled);                                         // §5.1
const cellInfoZ = (gx, gy, z) => (z === 0 || !L() ? UF.WorldGen.cellInfo(gx, gy) : L().cellInfo(gx, gy, z));
const viewLevel = () => (UF.World.viewLevel ? UF.World.viewLevel()
    : (UF.World.currentArea() ? Object.assign({ z: 0 }, UF.World.currentArea()) : null));
```

Until UF_Levels lands, `ecologyLevels()` is `[0]`, every record has z 0 and nothing else changes. After it lands, the one switch is the `enabled` flag of a level in `ecology.levels` (§5.1). **Asked of the five-level run:** `UF.Levels.cellInfo(gx, gy, z)`, which returns `{ biomeId, walkable, water, region, depthBand, open }` for a level cell. It is not in their API summary yet (§14 D9).

### 4.2 Buckets and the region index

The atlas asks for `(z, biomeRegion)` buckets. **UF's definition of a biome region: the part of one biome that lies inside one 64×64 block of one level.** Why this definition:
- The bucket count stays bounded: at most 16 blocks × the biomes present, about 40–90 per level (estimate from the biome mix, not measured).
- Service units are about the same size.
- No flood fill.
- The same seed always gives the same buckets.

```text
bucketKey  = `${z}|${ax},${ay}|${bx},${by}|${biomeId}`      bx = x >> 6, by = y >> 6
Bucket     = { key, z, area:{x,y}, bx, by, biomeId, index,   // index = position in the service order
               land: [cell…], water: [cell…], air: [cell…],   // lattice samples (stride 4, offset 2)
               cells,                                         // samples × 16, the estimated cells
               tiers: { savagery: {tame:n,…}, alignment: {…} } }
cell       = packed (y << 8 | x); the tier of each sample lives in a parallel Uint8Array
```

- **Region index:** built once per level at `world:created` and after a load. It reads 64 × 64 = 4,096 lattice samples per level through `cellInfoZ`. That is not measured. UF_Wildlife calls `cellInfo` 64 times per area, and UF_WorldGen.md calls it "cheap, no area build".
- A sample goes into `land` if it is walkable, into `water` if its `water` key is set, or into `air` for open cells on ±1 and ±2.
- Buckets with fewer than 4 land samples get no fauna service. Buckets with fewer than 4 samples of any kind are dropped.
- **Service order:** the buckets of every level are sorted by `hash32(seed, SALT.order, z, ax, ay, bx, by, biomeIndex)`, so levels and places interleave.
- The index isn't saved. It comes from the seed; only the cursor is saved.

### 4.3 The census (runtime, rebuilt at load, never saved)

```text
census = {
  unitKey:  Map<unitId, { key, species, herd }>,                // creatures only, keyed by the HOME cell's bucket
  fauna:    Map<key, Map<speciesId, Set<unitId>>>,
  level:    Map<z, { total, bySpecies: Map<speciesId, n>, monsters }>,
  world:    { total },                                          // every creature on every level
  plants:   Map<key, Map<kindId, n>>,                           // mature + growing (a sapling counts for its target kind)
  fullScans: n                                                  // 1 after a rebuild; the census_sparse check watches it
}
```

- **Why the home cell:** `data.home` (UF_Wildlife.md, unit record) is fixed when a herd is placed, and no plugin rewrites it for creatures (grep, 2026-09-19). Creatures wander within `species.wander` of it. A census keyed by home only changes on add and remove, so it needs no per-step tracking of movement.
- **Living:** the same rule as `UF_Combat.js:183`, `!(dead || _isDying || hp <= 0)`. A unit that dies but stays as a corpse (the remains work) is dropped lazily, when its bucket is next serviced (O(members of that bucket)).
- **Updates:**

  | Event | Census change |
  |---|---|
  | `world:unitAdded` | Adds the unit if it is a creature with a known species |
  | `world:unitRemoved` | Removes it |
  | `world:unitLevelChanged(u, fromZ, toZ)` (five-level) | Re-keys it |
  | `objects:changed(area, x, y, fromId, toId)` (`UF_Objects.js:176`) and `objects:levelChanged(levelArea, …)` | −1 for `fromId`, +1 for `toId` when they are renewable plant kinds |

  Each update is O(1).
- **Rebuild:** one pass over the units (O(units)) and one pass over each level's object grid (65,536 reads per level through `World.getObject`) at `world:created` and at load. That is the only full scan.

### 4.4 Targets and caps (formulas; the numbers are tuning in §5)

Every formula works from existing catalog data. Nothing new is invented about any species.

**Fauna (grazers, vermin, fliers, predators).** `K = UF.Wildlife.herdScale()`, `w = species.biomes[biome]`, `s = wildlife.savageryScale[tier]`, `allowed = UF.Wildlife.allowedInRegion`, `mean = (herd[0] + herd[1]) / 2`.

```text
habitat(s, b)   = Σ over b's land samples i of  w(s, biome_i) × s(tier_i) × allowed(s, region_i)
share(s, b)     = fauna.targetScale × K × mean(s) × habitat(s, b) / samplesPerArea      // samplesPerArea = 4096
T(s, z)         = Σ_b share(s, b)                          level target: the same number UF_Wildlife's plan expects
L(s, b)         = max(herd(s)[1], ceil(share(s, b) × fauna.localCapScale))            local cap
G(s, z)         = max(herd(s)[1], ceil(T(s, z) × fauna.globalCapScale))               global cap per level
C(z)            = ecology.levels[z].creatureCap ;  C_world = fauna.worldCap           unit budget caps (V50)
```

- **A herd's own target.** Every herd is recorded at the census rebuild as `herds[id] = { species, key, size0 }`, where `size0` is its size when placed. It breeds back toward `size0`, or toward `herd[1]` for herds that ecology created.
- **Kit herds.** Herds carrying `data.kit` (V67) recover toward their `size0` even when it is above the bucket's share, because the start guarantee holds in play too (§14 D4). They still count against G and C.

**Monsters.** The same `share` and `T` formulas, over monster species only. Then `L = min(monsters.bucketCap, max(1, ceil(share × localCapScale)))`, `G = ceil(T × globalCapScale)` and `M(z) = ecology.levels[z].monsterCap`.

**Plants.** Per bucket and renewable kind:
- `target(k, b)` = the census count at `world:created` (saved, §4.5), because generation clumps plants and "back to what the land had" is the honest target.
- A kind the biome lists but that was absent at generation gets a floor of `round(biomes[b].plants[k] × cells × plants.absentFloor)`.
- `hardCap(k, b) = max(target + 2, ceil(target × plants.hardCapScale))`.
- Bucket totals also stop at `plants.maxDensity × cells` so that paths stay open.

**Recovery chance** (atlas §1.2: it rises with the deficit and stops at the hard cap):

```text
deficit = clamp((target − current) / max(1, target), 0, 1)
p       = rate(kind) × season(kind) × deficit            ; 0 when current ≥ hard/local/global cap
roll    = hash32(seed, SALT.x, bucket.index, kindIndex, hour, st.rng.counter++) / 2^32 ; act when roll < p
```

### 4.5 Save format (`UF.World.state.ecology`, version 2)

```js
ecology: {
  version: 2,
  cursor: 17,                  // next position in the service order
  lastHour: 1234,              // last hour stepped (UF.Objects.hourNow, monotonic)
  rng: { counter: 991 },       // persisted roll counter: a loaded save continues the same roll sequence
  nextHerd: 58,                // herd numbers after UF_Wildlife's (max existing + 1 at the rebuild)
  herds: { "12": { species: "deer", key: "0|0,0|1,2|forest_temperate_broadleaf", size0: 4,
                   lastBirth: 1180, kit: true, origin: "world" } },            // origin world | birth | arrival
  buckets: { "<key>": {
      plantTarget: { oak: 41, grass_tuft: 88 },                               // §4.4, set at world:created
      next: { monster: 1300, arrival: { deer: 1400 } },                       // seeded due hours
      tel: { init: { fauna: 9, plants: 212 }, services: 21, births: 3, arrivals: 1, monsters: 0,
             germinated: 12, grown: 4, regrown: 6, fails: 7, capBlocks: 2, visibleBlocks: 1,
             harvests: 5, kills: 3, firstDeficitHour: 900, recoveredHour: 1180 } } },
  timers: [ { area:{x:0,y:0}, z:0, x:12, y:40, from:"stump", to:"sapling", grow:"oak", due:1500 } ],  // sorted by due
  inFlight: [ { herd: 58, species: "deer", key: "…", entry: {x:3,y:120,z:0}, since: 1200 } ],
  stats: { hours: 0, steps: 0, attempts: 0, ms: 0, worstMs: 0, fullScans: 0 }
}
```

- `timers` replaces v1's `resources`. It has the same entry shape plus `z` and `grow`, is kept sorted by `due` (binary insert), holds at most `plants.maxTimers` entries (the oldest are dropped, which costs only that cell's timed regrowth), and each step processes at most `plants.timersPerStep` due entries.
- **Size estimate (not measured):** 100 buckets × ~250 bytes, plus 40 herds × 120 bytes, plus up to 4,096 timers × 90 bytes. That is at most about 400 KB, under V50's 3 MB for the whole save.

### 4.6 Migration from v1

| v1 field | What happens to it |
|---|---|
| `resources` | Becomes `timers` with `z: 0`. An entry whose `to` is a tree becomes `{ to: "sapling", grow: <tree> }` (§7.4). |
| `areas` | The per-area baselines are dropped; the census rebuild makes the targets. |
| `cursor` | Reset to 0. |
| `nextHerd` | Kept. |
| `stats` | Merged. |
| `version` | Set to 2. |

The migration runs in the `DataManager.extractSaveContents` alias, as v1's does (`UF_Ecology.js:590`). The `saved` check proves it on a synthetic v1 state.

---

## 5. Catalog keys

UF_Ecology owns one new top-level key, `ecology`, written by a layout-preserving node script. The script re-reads the catalog right before writing and asserts that every other key is unchanged. It also appends **one object**, `sapling`, to `objects` (appended only, CRAFTING.md D8). The id matches CRAFTING.md D9, which proposes the same stump → sapling → biome tree chain; CRAFTING is not approved, so this file adopts only the id and the chain (§14 D2). No species, item or name is added.

### 5.1 `ecology` (initial tuning: UF's own values, to be tuned from telemetry, V83)

Every duration is in **world beats** (V85: one beat = one game minute at ×1, so 60 beats = 1 game hour, 1,440 = 1 day). Kinds differ: a grass tuft is not a tree, and a hare is not an aurochs. The director steps on `time:hour` and rounds every due time up to the next hour.

```json
"ecology": {
  "about": "UF_Ecology (VISION V74, V75, V83): per (level, biome region) census; fauna breed near herds and arrive from the map edge; monsters come on a seeded clock; plants spread, seed and regrow; minerals never return. Durations in world beats (V85).",
  "version": 2,
  "director": { "bucketsPerStep": 6, "attemptsPerStep": 32, "blockSize": 64, "sampleStride": 4,
                "minBucketSamples": 4, "viewMargin": 4, "stepBudgetMs": 2.0 },
  "seasons": { "Spring": 1.5, "Summer": 1.0, "Autumn": 0.6, "Winter": 0.2 },
  "fauna": {
    "targetScale": 1.0, "localCapScale": 1.5, "globalCapScale": 1.3, "worldCap": 320,
    "birth":   { "rate": 0.5, "minHerd": 2, "spread": 3, "maxOverSize0": 0 },
    "arrival": { "rate": 0.25, "edgeBand": 12, "entryPoints": 64, "cooldownBeats": 4320, "maxInFlight": 3 },
    "species": {
      "hare": { "birthBeats": 2880, "litter": [1, 3] }, "rat": { "birthBeats": 2880, "litter": [1, 3] },
      "fowl": { "birthBeats": 2880, "litter": [1, 2] }, "songbird": { "birthBeats": 4320, "litter": [1, 2] },
      "bat": { "birthBeats": 4320, "litter": [1, 2] },
      "deer": { "birthBeats": 8640, "litter": [1, 1] }, "boar": { "birthBeats": 8640, "litter": [1, 2] },
      "wild_sheep": { "birthBeats": 8640, "litter": [1, 1] },
      "aurochs": { "birthBeats": 14400, "litter": [1, 1] }, "wild_horse": { "birthBeats": 14400, "litter": [1, 1] },
      "@predator": { "birthBeats": 11520, "litter": [1, 1] }
    }
  },
  "monsters": {
    "localCapScale": 1.0, "globalCapScale": 1.0, "bucketCap": 2,
    "intervalBeats": [2160, 5760], "chance": 0.6, "entry": "habitat",
    "clearance": { "playerCamp": 60, "camp": 40, "site": 40, "person": 12 }
  },
  "plants": {
    "absentFloor": 0.25, "hardCapScale": 1.2, "maxDensity": 0.35, "seedRadius": 3,
    "seedRainRate": 0.05, "campClearance": { "tree": 8, "bush": 4, "plant": 0 },
    "maxTimers": 4096, "timersPerStep": 64,
    "kinds": {
      "@tree":   { "via": "sapling", "stumpToSaplingBeats": 4320, "saplingToTreeBeats": 8640, "spreadRate": 0.15 },
      "@bush":   { "regrowBeats": 7200, "spreadRate": 0.35 },
      "@plant":  { "regrowBeats": 2880, "spreadRate": 0.6 },
      "berry_bush": { "regrowBeats": 8640, "spreadRate": 0.3 },
      "cactus_tall": { "regrowBeats": 14400, "spreadRate": 0.15 },
      "lily_pad": { "regrowBeats": 4320, "spreadRate": 0.4, "on": "water" },
      "dead_tree": { "renewable": false }
    }
  },
  "levels": {
    "-2": { "enabled": false, "creatureCap": 60, "monsterCap": 8, "species": [], "plants": [], "biomes": "deep" },
    "-1": { "enabled": false, "creatureCap": 60, "monsterCap": 6, "species": [], "plants": [], "biomes": "earth" },
    "0":  { "enabled": true,  "creatureCap": 240, "monsterCap": 12, "species": "@wildlife", "plants": "@biomes" },
    "1":  { "enabled": false, "creatureCap": 30, "monsterCap": 0, "species": ["hawk", "songbird", "bat"], "plants": [], "biomes": "@column" },
    "2":  { "enabled": false, "creatureCap": 20, "monsterCap": 0, "species": ["hawk", "songbird"], "plants": [], "biomes": "@column" }
  }
}
```

- **`@wildlife`** means every `wildlife.species` entry. Their biome weights make the level-0 table.
- **`@biomes`** means `biomes[*].plants`, filtered by `isRenewable` (§7.5).
- **`@column`** means the upper levels take the biome of the ground cell below them (atlas §3.4). Only fliers are listed there ("empty air receives only eligible flying content", V83).
- **Underground levels are empty** until the vertical run's earth and deep biome ids exist and the user approves underground species. Their tables are ready: `species` and `plants` lists, and `depthBand` rules read from `cellInfoZ(...).depthBand` (§14 D8).
- **`@predator`, `@tree`, `@bush` and `@plant`** are defaults by kind or tag. A species or kind id overrides its default.

### 5.2 The new object

```json
{ "id": "sapling", "name": "Sapling", "tile": { "sheet": "Outside_B", "id": 152 }, "tint": "#7fb35a",
  "under": true, "passable": true, "tags": ["plant", "sapling", "wood"],
  "actions": { "gather": { "work": 2, "yields": { "fiber": 1 } } } }
```

- It doesn't block, grows under feet and can be pulled up by hand (1 fiber).
- **What it grows into is not a type field.** It lives in the cell's growth timer (`grow`), so a single object serves every tree kind.
- Its `work` value follows whatever unit the V85 work-timing run settles on; `2` is a placeholder. Placeholder art and its request are in §12.

---

## 6. Scheduling (no per-frame work at all)

| When | What runs | Bound |
|---|---|---|
| `world:created` (after `UF_Wildlife.spawnWorld`: UF_Ecology registers its listener at load, after UF_Wildlife, `UF_Wildlife.js:1255`) | Region index, census rebuild, targets, `herds` records, first seeded due hours | Once per New Game; budget ≤ 150 ms for level 0, **to be measured** |
| Load (`DataManager.extractSaveContents` alias) | v1 → v2 migration, region index, census rebuild | Once per load; budget ≤ 100 ms, to be measured |
| `world:unitAdded`, `world:unitRemoved`, `world:unitLevelChanged`, `objects:changed`, `objects:levelChanged` | Census update | O(1) each; budget ≤ 0.01 ms |
| `time:hour` (`UF_Core.js:306`, every 60 beats at any speed) | **The step:** (1) due growth timers, at most `timersPerStep`, taken from the front of the sorted list; (2) `bucketsPerStep` buckets from the cursor, each serviced for fauna, then monsters, then plants, until `attemptsPerStep` candidate checks are spent (a bucket cut short is picked up on the next pass) | Worst step ≤ 2 ms; mean ≤ 0.5 ms; ≤ 0.05 ms per beat amortized (about 1% of V50's 4 ms per-beat budget for all AI). All three are **budgets, not measurements** |

- **One step's work, in order:**
  1. Read the view rectangle once.
  2. Build an occupancy set of units, only for the levels of the buckets due that step (O(units) once).
  3. Build a person list for clearance checks.
  4. Build a reserved-cell set from the active job targets (`UF.World.state.jobs.list`).

  Every candidate check after that is O(1) plus O(camps + sites).
- **Fairness:** a plain round-robin over all buckets of all enabled levels. With about 60–90 level-0 buckets and 6 per step, each bucket is serviced every 10–15 game hours whatever is on screen. The deficit enters through the chance, not the order (atlas §1.2).
- **Hour catch-up:** at ×8 or after a time skip, `time:hour` fires once per hour, so each step stays bounded. If `lastHour` falls more than 24 behind (a long jump), the director runs at most 24 steps and then advances `lastHour` without doing the rest. The telemetry counts `skippedHours`.
- **Randomness:** every roll is `hash32(seed, SALT.*, bucket.index, …, hour, rng.counter)`. There is no `Math.random`, and nothing reads `Graphics.frameCount` or `W._frame`.

---

## 7. The recovery channels

### 7.1 Fauna births (herds breed where they live)

A bucket service goes through each species with `share > 0` in the bucket:

1. **Caps first.** Nothing happens when any of these holds:
   - `n(s, b) ≥ L(s, b)`
   - `n(s, z) ≥ G(s, z)`
   - `level.total ≥ C(z)`
   - `world.total ≥ worldCap`

   A block adds to `tel.capBlocks`.
2. **Pick a herd.** Take a living herd of `s` homed in `b` that meets all of these:
   - it has at least `birth.minHerd` members;
   - none of its members is owned (`data.owner`, V71; husbandry is a later system) or in flight;
   - its size is below its herd target (`size0`, or `herd[1]` for herds ecology created);
   - its `lastBirth` is at least `birthBeats / 60` hours ago.
3. **Roll.** `p = birth.rate × season × deficit`, where deficit is the herd's `(target − size) / target`.
4. **Place the litter.** Litter size is seeded in `litter`, clipped by every cap. The young go on cells within `birth.spread` of a random living member, found through the gate (§7.6) in the `birth` role.
5. **Create each newborn** with `UF.World.addUnit(UF.Wildlife.unitSpec(sp, area, x, y, herd, dir, herdHome, { born: hour, ecology: true, kit?, kitCamp? }))`, with `z` set through the helper. It has the same herd, the same home, and `data.ai === "wander"`, so UF_Wildlife's AI runs it with no change to UF_Wildlife. Newborns of a kit herd inherit `kit` and `kitCamp`, which is how UF_Wildlife's predator code already spares kit prey (`UF_Wildlife.js:1004`).
6. Emit `ecology:born`. The herd's `lastBirth` becomes this hour.

Newborns are adult-sized. There is no juvenile stage or art (§14 D6).

### 7.2 Fauna arrivals from the map edge (local extinction and recolonization)

When a species sits below its share in a bucket (`share(s, b) − n(s, b) ≥ 1`), has **no herd there that can breed**, and is below its level target (`n(s, z) < T(s, z)`), an arrival may come:
- chance `arrival.rate × season × levelDeficit`;
- at least `cooldownBeats` after the species' last arrival on that level;
- only while fewer than `maxInFlight` arrivals are in flight on that level.

- **Entry cells:** built with the region index. From `entryPoints` seeded points on the rim of each level, a line runs inward to the first walkable land cell. The rim is ocean (catalog `arrivals.about`), so land animals come ashore at the coast. For each deficit bucket the three nearest entry cells are kept, and one is chosen by the seed. Fliers enter on the rim itself.
- **The herd:**
  - size: a seeded draw in `herd`, clipped by L, G and C;
  - members: seated around the entry cell through the gate in the `arrival` role (no protected-camp rule, but never visible and never on a camp's nine cells);
  - `data.home`: a seeded land sample of the deficit bucket that the species may use;
  - movement: sent with `UF.World.sendUnit` toward that home (and z).

  Because the census is keyed by home, the herd counts for its bucket from the moment it appears, so the same deficit never brings a second arrival. `inFlight` records it until every member has arrived, left, or 48 game hours have passed.
- Emit `ecology:arrived`, plus v1's `ecology:spawned` with `kind: "arrival"`.

This is the DF lesson: hunting a herd out doesn't end the species, but it comes back slowly and from far away.

### 7.3 Monsters (V75): a seeded clock, entry from habitat or edge, clearance, caps

- **Clock.** Each bucket with monster share > 0 keeps `next.monster`. At world creation it is the current hour plus the first seeded draw in `intervalBeats`. It moves forward by a new seeded draw each time it fires, hit or miss. A service at or after that hour rolls `monsters.chance × deficit`, where deficit counts against the bucket's monster share (at least 1 when the share is above 0). `monsterSchedule(key, fromHour, toHour)` is a pure function that returns the due hours, so the check can compare them.
- **Who.** A species pick weighted by its habitat in this bucket. Region rules come from `UF.Wildlife.allowedAt` (minimum wildness and alignment, `UF_Wildlife.js:1224`), and later levels add their depth band.
- **Where.** `entry: "habitat"` (the default) means a seeded land sample of the bucket, jittered within the lattice stride, that passes the gate in the `monster` role. The monster role adds every clearance in `monsters.clearance`:
  - Euclidean distance from every camp (`UF.Wildlife.camps()`, line 1244), with the player's camp using `playerCamp`;
  - distance from every site that isn't ruined (`UF.History.sites()`, `UF_History.js:1565`);
  - distance from every colonist or person on that level;
  - never visible.

  The atlas's other entries come later: `"edge"` reuses §7.2's entry cells, and `"connector"` / `"den"` come with the five-level slices.
- **How many.** The herd range, clipped by L, G and `M(z)`. Members stand within 3 cells of the first and pass the same gate.
- **Create** through `unitSpec` and `addUnit`, exactly as in §7.1, with `herd: nextHerd++`. Emit `ecology:spawned` (v1's name) with `kind: "monster"`.
- **Later (not built, §14 D7):** rarer lone beasts whose clock depends on world age and faction wealth (DF's pattern). They would use only approved monster species. **No new creature is proposed here.**

### 7.4 Plants: spread, seed rain, saplings, same-cell regrowth

The bucket service goes through each renewable kind `k` listed for its biome (`biomes[b].plants`, plus the region's cursed or blessed plant swaps, `catalog.regions`) whose count is below `hardCap(k, b)`.

1. **Spread from a parent.** Pick seeded land samples of the bucket, or water samples for `on: "water"` kinds. Scan the 7×7 window around each one for a parent of `k` (49 `getObject` reads). If a parent is found, pick a seeded empty cell within `seedRadius` of it that passes the gate in the `plant` role. Roll `spreadRate × season × deficit`.
2. **Seed rain** (atlas §8: "seed banks … can restore it"). If the bucket has none of `k` left but the biome lists it, any suitable sample cell may take `k` at `spreadRate × seedRainRate × season`.
3. **What appears.** Grasses, herbs, flowers, bushes and cacti appear as their own grown object. Trees (`@tree`) appear as a `sapling`, with a growth timer `{ to: <tree>, due: now + saplingToTreeBeats }`. The census counts the sapling for its target tree, so no second sapling overshoots the cap.
4. **Same-cell regrowth** (v1, kept, gated):

   | Harvest | What comes back |
   |---|---|
   | Felled tree → stump (`objects:changed` oak → stump) | Timer to `sapling` after `stumpToSaplingBeats`, then to the felled kind after `saplingToTreeBeats`. If the region no longer allows that kind, a biome-weighted seeded pick (CRAFTING D9's rule, implemented here, so UF_Objects needs no `@biome` support). |
   | Gathered bush or grass (→ nothing) | Timer back to the same kind after its `regrowBeats` |
   | Picked berry bush and fruit tree (`regrow` in their catalog entries) | Stay with UF_Objects' native timer and are not duplicated (v1's `native_regrow_single`) |

   **Every timer checks the caps when it comes due.** At the hard cap the timer is dropped.
5. **Growth waits for occupants.** A due timer whose target blocks, with a unit on the cell (`UF.World.standerAt`, `UF_World.js:744`), moves forward one hour, as UF_World's `holdOccupiedRegrowth` does for UF_Objects. `World.setObject` would refuse it anyway (V68).
6. **Pulling a stump or sapling cancels the cell's timer.** A player clearing land keeps it clear. Spread may reseed it later unless the cell is within `campClearance` of a camp or site, or is a road, a floor, a farm plot or a job target. **This changes v1**, where a pulled stump still regrew (§14 D3).
7. **Emit:** `ecology:germinated` (spread and seed rain), `ecology:grew` (sapling to tree), and v1's `ecology:resourceRegrown` (same-cell regrowth).

### 7.5 Minerals never respawn (V74)

`isRenewable(kind)` is true only for a catalog object that meets all of these:
- it is tagged `tree`, `bush` or `plant`;
- it has none of `mineral`, `ore`, `gem`, `stone`, `ruin`, `building` or `remains`;
- `ecology.plants.kinds[id].renewable` is not `false`.

When Codex's resource manifest lands (STATUS claim), its `renewable` flag and `respawnRules` replace the tag test, still inside this one function. What follows from it:
- The census never tracks minerals, and no timer targets one: the timer builder asserts `isRenewable(to)`.
- Spread lists are filtered by it.
- Mining a boulder or an outcrop leaves `rocks_small` or nothing, and nothing ever grows back. That holds for ironstone, copper, gold, crystal, granite boulders, loose stones, gravel and bones.
- Finite geology only gets telemetry (atlas §8.1).

### 7.6 The placement gate (one function, cheapest test first)

`canPlaceUnit(role, sp, z, area, x, y)` and `canPlacePlant(kind, z, area, x, y)` return `""` or a reason. The reason is counted in `tel.fails` by its first word.

1. **Bounds and bucket.** In bounds, and `cellInfoZ` gives the bucket's biome. The cell must be walkable land (`water` for water plants, open air for fliers on ±1 and ±2).
2. **Species rule.** `UF.Wildlife.allowedAt(sp, gx, gy)` on level 0, or the level table and depth band on other levels.
3. **Not visible.** On the level being drawn, outside `viewLevel()` ± `viewMargin`, using `$gameMap.displayX/Y` and `screenTileX/Y`, which UF_Camera scales per zoom (atlas §8.1: no pop-in).
4. **Protection.**
   - Monsters: every clearance in §7.3.
   - Every creature: never on a camp's nine cells, and predators at least `start.kit.wildlife.predatorFree` from every campfire, the same rule as UF_Wildlife's `campRuleOk`.
   - Trees and bushes: at least `campClearance` from camps and sites.
5. **Land in use.** Not a road (`UF.Roads.isRoadAt`), not a built floor (`UF.Floors.kindAt` differs from the natural ground), not a job target (the step's reserved set), not an object cell (plants need `getObject == 0`).
6. **Occupancy.** No unit (the step's occupancy set) and no blocking object (`UF.Objects.blocksIn`).
7. **V68, final.**
   - Units: `UF.World.spawnCellFor(ax, ay, x, y, 1, name, z)` must return this same cell (`how === "asked"`). Then `UF.World.addUnit(spec)`, and the result is compared. If the guard moved the unit anyway (a race), it is removed at once and counted as a failure, so no unit ever stands on a cell the gate refused.
   - Plants: `UF.Objects.setIn` must return true (World.setObject refuses a blocking object on a stander).

---

## 8. Events

**Emitted:**

| Event | Payload |
|---|---|
| `ecology:ready` | `{ levels, buckets, ms }` |
| `ecology:step` | the step report; v1's `ecology:hour` fires too, for compatibility |
| `ecology:born` | `{ unit, herd, key }` |
| `ecology:arrived` | `{ units, herd, key, entry }` |
| `ecology:spawned` | v1's name: `{ units, species, key, kind: "monster" \| "arrival" }` |
| `ecology:germinated` | `{ area, z, x, y, kind, key, via: "spread" \| "rain" }` |
| `ecology:grew` | `{ area, z, x, y, from, to }` |
| `ecology:resourceScheduled`, `ecology:resourceRegrown` | as in v1 |

**Listened:** `world:created`, `time:hour`, `world:unitAdded`, `world:unitRemoved`, `world:unitLevelChanged` (five-level), `objects:changed`, `objects:levelChanged` (five-level), and `wildlife:kill` (telemetry only). None of these events is player-facing, and no chronicle line or overhead text is written (V62).

---

## 9. Hook points (file and line as read on 2026-09-19 between 13:30 and 13:50; `UF_Wildlife.js` is claimed and mid-edit, so its lines will move and the function names are the stable reference)

UF_Ecology aliases only core methods, as v1 does. Everything else is an event listener or a public call. It needs no edit to another plugin.

| Hook | Where | How | Why |
|---|---|---|---|
| `DataManager.extractSaveContents` | core; v1's alias `UF_Ecology.js:590` | alias | Migrate v1 → v2 and rebuild the index and census after a load |
| `Scene_Boot.prototype.start` | v1's alias `UF_Ecology.js:596` | alias | Register the `ecology` suite |
| `world:created` | emitted `UF_World.js:262` | listener | Build the index, census and targets after `UF_Wildlife.spawnWorld` (its listener `UF_Wildlife.js:1255` loads first) |
| `world:unitAdded` / `world:unitRemoved` | `UF_World.js:832` / `:845` | listener | Census |
| `world:unitLevelChanged`, `objects:levelChanged` | VERTICAL_BUILD_PLAN §14 (not built) | listener | Census re-key when levels land |
| `objects:changed(area, x, y, fromId, toId)` | `UF_Objects.js:176` (inside `setIn`, `:165`) | listener | Plant census and same-cell timers (v1's `onObjectChanged`, `UF_Ecology.js:335`) |
| `time:hour` | `UF_Core.js:306` | listener | The step. UF_World's `holdOccupiedRegrowth` (`UF_World.js:749`, registered `:769`) and UF_Objects' `processRegrow` (`UF_Objects.js:738`) run on the same event for UF_Objects' own timers; ecology's timers are separate and hold themselves |
| `$ufTime.seasonName` | `UF_Core.js:329` | read | Season multiplier |
| `UF.Objects.hourNow` (`absHour`) | `UF_Objects.js:709` (`:123`) | call | Monotonic hour that survives saves |
| `UF.Objects.setIn`, `type`, `blocksIn` | `UF_Objects.js:165`, `:674`, `:687` | call | Germination, growth, occupancy |
| `UF.World.addUnit` | `UF_World.js:797` | call | Every unit (V68) |
| `UF.World.spawnCellFor`, `cellFree`, `standerAt`, `getObject`, `sendUnit`, `isDisplayed`, `currentArea` | `UF_World.js:725`, `:617`, `:744`, `:536`, `:852`, `:867`, `:319` | call | Gate, plant census, arrivals, view |
| `UF.Wildlife.unitSpec` | `UF_Wildlife.js:454` (public `:1240`) | call | The exact creature spec, so the wander AI runs newborns, arrivals and monsters |
| `UF.Wildlife.species`, `speciesById`, `allowedAt`, `allowedInRegion`, `herdScale`, `camps`, `kitConfig` | `:1182`, `:1183`, `:1224`, `:1229`, `:1233`, `:1244`, `:1242` | call | Species data, region rules, the same K as generation, camp rules |
| `wildlife:kill` | `UF_Wildlife.js:1078` | listener | `tel.kills` |
| `UF.History.sites()` | `UF_History.js:1565` | call | Site clearance |
| `UF.Roads.isRoadAt`, `UF.Floors.kindAt` | `docs/systems/UF_Roads.md:29`, `UF_Floors.md:44` | call | Land in use |
| `UF.World.state.jobs.list` | UF_Jobs state (`docs/systems/UF_Jobs.md`) | read | Reserved cells |
| living rule | `UF_Combat.js:183` | mirrored | Census counts only the living |

---

## 10. Public API (`UF.Ecology`, version 2; v1 names kept where they still make sense)

| Member | Returns / does |
|---|---|
| `VERSION`, `config` | 2; the resolved `ecology` catalog key with defaults |
| `state()` | The saved record (§4.5), created or migrated on first use |
| `zOf(o)`, `levels()` | The z helper and the enabled ecology levels |
| `bucketOf(z, area, x, y)` → key or `null`; `buckets(z?)`; `bucket(key)` | Region index |
| `census(key?)` → `{ fauna: { species: n }, plants: { kind: n } }`; `levelCount(z, species?)`; `recount()` | Census; `recount()` is a diagnostic full scan (adds to `fullScans`) |
| `targets(key)` → `{ fauna: { s: { share, local, global } }, monsters: {…}, plants: { k: { target, hardCap } } }` | The §4.4 numbers |
| `step(hour)` → report | The hour step (what `time:hour` calls) |
| `serviceBucket(key, hour, { only?: "fauna" \| "monsters" \| "plants", force? })` → report | One bucket (tests) |
| `monsterSchedule(key, fromHour, toHour)` → `[hour…]` | Pure |
| `dryRun(hours, { from })` → event log | Runs the director on a shadow applier (shadow unit list and object diffs, no units or objects touched) for the determinism check |
| `canPlaceUnit(role, sp, z, area, x, y)`, `canPlacePlant(kind, z, area, x, y)` → `""` or reason | The gate |
| `isRenewable(kind)`, `growBeats(kind)` | §7.5; per-kind beats |
| `timers()`, `scheduleResource(…)`, `cancelResource(…)`, `processResources(hour)` | v1 names over `timers` |
| `telemetry(key?)`, `lastStep()`, `perf()` → `{ steps, meanMs, worstMs, perBeatMs, fullScans }` | Telemetry and budgets |
| `setEnabled(on)`, `isEnabled()`, `errors`, `errorCount()` | As in v1 |

---

## 11. Checks (suite `ecology`; each is seen failing once through `UF_TEST_PROVOKE=ecology.<name>` before its pass counts)

The provocation scheme is v1's `provoked(check)`, active only under `UF.Test.active`. The suite works on buckets outside the view (it moves the view or picks off-screen buckets) and pauses the wander AI for the counted windows by setting `data.ai = "none"` on the fixture units only. Every check message names the bucket, the species or kind, and the numbers it compared.

| Check | PASS needs | How it is provoked to FAIL |
|---|---|---|
| `census_sparse` | Over 168 simulated steps (7 game days, `step(h)` called directly): `fullScans` stays at its post-rebuild value; no ecology code runs outside `time:hour` and the census events (an entry counter checked over 600 frames with no hour event is 0); the census equals one brute-force recount taken outside the timed window; worst step ≤ 2 ms, mean ≤ 0.5 ms, **per-beat cost = total ms ÷ (steps × 60) ≤ 0.05 ms**; 1,000 synthetic add/remove events average ≤ 0.01 ms. The message quotes all measured numbers | The provocation makes every step call `recount()`. `fullScans` climbs to 169 and the check fails |
| `recovery` | A bucket and species with a breeding herd, hunted (`removeUnit`, as a kill does) down to 2 members, rise over simulated days and stop at the herd target. Every newborn came through `addUnit`, carries the herd's id and home and `ai: "wander"`, and stands on a free cell its species allows. With test members added up to `L(s, b)` (built through `unitSpec` + `addUnit`), the same days produce no birth and no arrival. With the whole herd removed and the level below `T`, a herd arrives from an entry cell and heads for the bucket | Two provocations: `ecology.recovery` sets every birth and arrival rate to 0 (no recovery, FAIL); `ecology.recovery_cap` skips the cap test (above-cap growth, FAIL) |
| `monster_spawns` | Over 30 simulated days on every monster-eligible bucket: each spawn's hour is the first service at or after a due hour from `monsterSchedule`, computed twice and equal. Its cell passes `allowedAt` and was free before the add. It is outside the view, and at least the clearance from every camp (the player's ≥ 60), site and person. Counts stay ≤ L, G and M. A test camp placed on a scheduled cell makes that spawn go elsewhere or skip | The provocation sets every clearance to 0 and picks candidates next to the nearest camp. A monster lands within 40 cells and the check fails |
| `plant_spread` | In a bucket thinned below target, with test units on 20 candidate cells and a road or floor on others where those plugins are loaded, every germination over N simulated days: sits on a cell of the bucket's biome that was empty, walkable, not a road, floor or job cell, never under a unit when the plant blocks, and outside `campClearance`. Counts stay ≤ hardCap. A sapling becomes its tree after `saplingToTreeBeats`, waits while a unit stands on it, and grows once the unit leaves. `world:objectRefused` count is unchanged | The provocation drops the occupancy test from the gate. The check reads the step's accepted-candidate log and finds a blocking plant chosen on a unit's cell, so it fails |
| `minerals_finite` | Every catalog object tagged `mineral`, `ore`, `gem`, `stone`, `ruin` or `remains` gives `isRenewable` false. After mining out every mineral in a test block and 60 simulated days of steps, the block's mineral count (counted by the check over that block only) never rises, and no timer targets a mineral id | The provocation makes the `ore` tag renewable. An ironstone timer is scheduled and the outcrop returns, so the check fails |
| `deterministic` | `dryRun(72)` from the same start state twice gives identical, non-empty event logs. A copy with `seed + 1` gives a different one. The first 24 hours of a real run match the dry run's first 24 | The provocation mixes one `Math.random()` into the candidate pick, so the two logs differ |
| `saved` | A `JsonEx` round-trip of `state.ecology` is deep-equal. `makeSaveContents().ufWorld.ecology` is the live object. After a simulated load (the extract alias on a copy), the rebuilt census equals the census before the save, and timers, `next` hours, `herds` and `rng.counter` survive. A synthetic v1 state migrates with its timers kept | The provocation drops `buckets` from the serialized copy, and the check fails on the mismatch |
| `no_errors` | No uncaught error during the suite (`t.errorsSoFar()`), and `errorCount()` unchanged | The provocation throws once inside the `time:hour` listener. The error is caught and counted, and the check fails |
| `renewable_timer` (v1, reworked) | Chop an oak and the stump is scheduled. A unit on the cell holds the growth. With the cell clear, stump → sapling → oak at the configured beats | The provocation skips the stander test, and the sapling-to-oak step is attempted on an occupied cell (refused by V68 and recorded), so the check fails |
| `native_regrow_single` (v1) | A gathered berry bush has exactly one timer (UF_Objects') and none in ecology | The provocation schedules an ecology timer as well |

- **Retired v1 checks, folded into the list above:**

  | v1 check | Now covered by |
  |---|---|
  | `state_saved` | `saved` |
  | `renewable_only` | `minerals_finite` |
  | `deterministic_safe_cell` | `deterministic` and `monster_spawns` |
  | `hard_cap`, `prey_replenishes` | `recovery` |
  | `monster_replenishes` | `monster_spawns` |
  | `bounded_work` | `census_sparse` |

- **Screenshots** (each opened and described before it is cited):
  - `ecology.recovered_herd.png`: newborns beside their herd, Look tooltip on one;
  - `ecology.monster_spawned.png`: a spawned monster with the distance to the nearest camp in the message;
  - `ecology.plant_spread.png`: saplings and new grass near their parents.
- **On-request suite `ecology_long`** (like `wildlife_seeds`). It runs the atlas checks `resources.mapwide_rates` and `resources.distribution` for this system: 60 simulated days on 3 fixed seeds, with the AI paused. It fails when any eligible bucket was never serviced, any cap was exceeded, any protected, visible or blocked placement happened, or a depleted bucket did not move toward its target. It prints per-bucket histograms (initial, current, births, arrivals, monsters, germinations, blocks).

---

## 12. Placeholder art and asset requests

Placeholders are stock RPG Maker MZ tiles (V9). Each gets a request that names the stock asset in the Status column (CLAUDE.md). The rows below are **drafts**. The build appends them to `docs/ASSET_REQUESTS.md` under the next free AR numbers (re-read the file right before writing; AR-1100s and AR-1200s are taken by CRAFTING and the vertical run) and writes the matching section of `docs/handoffs/HANDOFF_df_mechanics.md`.

| Draft | Request | Spec | Plugs in as | Status column (stock in use) |
|---|---|---|---|---|
| ECO-A | **Tree sapling, 2 variants:** broadleaf and conifer (tropical and swamp kinds use the broadleaf one with a catalog tint until they get their own) | 48×48 frame, V81 micro scale: about 16–22 px tall against a 46 px person, grounded on row 47, anchor `[24, 47]`, footprint `[1, 1]`, drawn under units, passable. 1 stand frame + 3 sway frames (V60), 8 colours or fewer, `art/palette/uf.hex`, binary alpha; 4× raw on magenta; RMMZ `!$` single-object sheet `!$UF_Sapling.png` / `!$UF_SaplingConifer.png` with sidecars; passes `tools/originality_check.js` and `tools/art_check.js --native` | Catalog `objects` → `sapling`: `"image": "!$UF_Sapling"` replaces the `tile` field (Gemini may edit `objects` per the world-generation handoff). A second object `sapling_conifer` with the same `tags`, if the user wants the conifer variant told apart | REQUESTED (stock `Outside_B` tile 152 "Grass A", tinted `#7fb35a`) |
| ECO-B | **Newborn and juvenile frames** for the prey species | Not requested now; waits for §14 D6 | — | — |

Nothing else in this design needs art. Births, arrivals and monster spawns reuse the species sheets of AR-401 and AR-402, and plant spread reuses AR-102 and AR-103.

---

## 13. Names

- **New player-visible words:** "Sapling" (the object's name, shown by Look). It is a generic English word like "bone" or "stump", so it needs no lore approval. It is listed so the user sees it.
- **No new species, creature, place, faction or level names are proposed.** Future rare lone beasts (§7.3) and underground species (§5.1 `levels`) will need names, and every one of them is a proposal for the user when the time comes (AGENTS rule 7).
- **Internal only, never shown:** bucket, director, census, seed rain, entry point, and every event name.

---

## 14. Decisions needed and open points

| # | Question | Proposed |
|---|---|---|
| D1 | Build v2 in place in Codex's `UF_Ecology.js`, or keep v1 and add a new plugin? | In place: same save key, API and events, with migration. Codex and the user should confirm, because STATUS credits v1 to Codex |
| D2 | The `sapling` object and the stump → sapling → tree chain appear in CRAFTING.md D9, which isn't approved | Adopt the id and the chain in ecology now. Growth lives in ecology's timers, so UF_Objects needs no `@biome` rule. CRAFTING's times (72 h stump to sapling, 144 h sapling to tree) are used as the initial tuning |
| D3 | Pulling a stump: v1 keeps the cell's regrowth, CRAFTING cancels it | Cancel it, so cleared land stays cleared. Spread may reseed it later, outside camp clearance |
| D4 | Do kit herds (V67) breed back to their starting size near camps, above the bucket's share? | Yes: V67's "resources to start building" holds in play, and UF_Wildlife.md lists "hunted herds aren't replaced" as a known limit |
| D5 | Recovery never happens in view (atlas §8.1), so a herd grazing beside the colony on screen won't show a birth | Keep the atlas rule |
| D6 | Young animals: newborns are adult-sized with no juvenile art | Keep until the user wants juvenile stages (then request ECO-B) |
| D7 | Rare lone beasts on a world-age and wealth clock (DF's pattern) | Later, with approved species only. Nothing built now |
| D8 | Underground and upper-level ecology tables | Empty and disabled until the vertical run's biome ids and the user's approved underground species exist. Fliers-only tables for ±1 and ±2 are ready |
| D9 | The five-level run's API | Asked: `UF.Levels.cellInfo(gx, gy, z)` → `{ biomeId, walkable, water, region, depthBand, open }` |
| D10 | `dead_tree` renewable? | No (it's a dead thing). Set by `ecology.plants.kinds.dead_tree.renewable: false` |
| D11 | Fish stocks per water body (atlas §8.1 lists fish) | Not in this build. Fish are items from the fish action today, with no stock to deplete. A later step adds a per-water-bucket stock that fishing lowers and ecology refills |

**Risks seen while reading:**
- `UF_Wildlife.js` failed `node --check` at 13:34 (mid-edit by its owner). Anything that loads the live `game/` then does not get `UF.Wildlife`, and UF_Ecology fails closed (no fauna service) when `UF.Wildlife` is missing.
- `World.cellFree` loops over every unit (`UF_World.js:640`). The gate avoids calling it more than once per placement.

---

## 15. Build order and registration (for the lead to apply)

1. **Catalog.** A node script `tools/add_ecology_catalog.js` adds the `ecology` key and appends `sapling`, preserving the layout and asserting that every other key is unchanged.
2. **Plugin.** UF_Ecology v2, with helper, index, census, targets and step first; then fauna, monsters, plants and timers; then the checks.
3. **Test on a snapshot.** Run `tools/test_snapshot.js --name ecology_v2 --plugins UF_Ecology --no-run`, then `tools/run_tests.js ecology --game <dir>`, then `smoke`, then the real title flow (`repro_title.js newgame`).
4. **Docs.** `docs/systems/UF_Ecology.md`, the ASSET_REQUESTS rows, and the ecology section of `HANDOFF_df_mechanics.md`.

**Registration** (only with the RMMZ editor closed):
- `game/js/plugins.js`: `{"name":"UF_Ecology","status":true,"description":"[UF Ecology] Plants spread and regrow; wildlife and monsters recover under biome caps; ore never returns.","parameters":{}}`, placed right after `UF_Wildlife` and before `UF_Stance`.
- `tools/register_world_plugins.js`: in `ORDER`, insert `"UF_Ecology"` after `"UF_Wildlife"`.
- `tools/register_world_plugins.js`: in `DESCRIPTIONS`, add `UF_Ecology: "[UF Ecology] Plants spread and regrow; wildlife and monsters recover under biome caps; ore never returns.",`.
- When UF_Levels lands, UF_Ecology also gets `@orderAfter UF_Levels`.

---

## 16. Reference evidence (read-only; mechanics only, nothing copied into `game/`)

- **Regional wildlife supply, group size and rarity** sit side by side on each wild creature, for example `data/vanilla/vanilla_creatures/objects/creature_large_temperate.txt:17-21` (roaming flag, rarity, supply range, group size, biomes). Across all creature files, 216 entries use the most common supply range (a count over `vanilla_creatures/objects/*.txt`, 2026-09-19).
- **Depth-bound underground creatures:** `creature_subterranean.txt:16`, `:118`, `:194`, and 63 entries with a depth range in all (count, same date).
- **Rare giant beasts and lesser giants:** `creature_standard.txt:2239`, `:2616`, `:2687`, `:2942`. Evil-region creatures: `creature_standard.txt:1936`. Grazers: `creature_large_temperate.txt:323`. Young: `creature_large_temperate.txt:9`.
- **Plant biomes, rarity and cluster size:** `vanilla_plants/objects/plant_standard.txt:54-55`. Underground plants by depth: `plant_standard.txt:58-59`. Grasses and their biomes: `plant_grasses.txt:5-17`. Trees with saplings: 62 entries with a sapling stage out of 72 trees (count, same date).
- **Release notes** (`release notes.txt`):
  - post-generation population growth, line 283;
  - wilderness populations slowly draining, line 448;
  - cavern creatures entering the map, line 447;
  - world activation (birth, death and animal population handling in play), line 2584;
  - underground population zones, line 1754;
  - sapling growth rate and survival, lines 2490 and 2530;
  - grass regrowth, lines 3072, 3118, 3119 and 3121;
  - underground regrowth refused on stairs, in magma and in deep water, line 3020;
  - trees not growing through floors, line 2454.
