# UF_Tech
Faction technology (VISION V76, V77, V84; design: `docs/design/TECH_TREE.md`). Each culture may ever build, lay and make only a fixed list of things, derived from its existing culture and plan data. Within that list, a tree of unlock nodes opens new buildings and recipes for a faction when the faction's Building level (a faction-wide skill, kept by UF_Skills), the structures it has completed ("build 6 walls"), its members' skill levels and its stock meet the node's requirements. A person below a job's level (the personal unlock table in UF_Skills) can't take the job; the build menu greys locked buildings with their requirement and hides what the culture never builds; object actions above level 1 name who qualifies. The character sheet gets a Skills page, and the key U opens the Unlocks view.

Status: built 2026-09-19 by Claude Code; checks: `tech` (16 checks). **Not registered in `game/js/plugins.js`** (the RMMZ editor was open; the registration is below for the lead to apply). Tested in snapshots of `game/` with the planned registration (after `UF_Sheet`), see Checks. Not run in the editor's Playtest (F5).

**Owner:** Claude Code · **File:** `game/js/plugins/UF_Tech.js` · **Catalog:** `tech` and `skills.unlocks` (plus four small paths of `skills`), written by `tools/add_tech_catalog.js` · **Load order:** after `UF_Skills`, `UF_Interact` and `UF_Sheet` (`@base UF_World`, `@orderAfter UF_Skills`, `@orderAfter UF_Interact`, `@orderAfter UF_Sheet`), before `UF_Talk`.

## 1. Purpose
Warcraft-style building tech (as a concept: "your faction builds a certain amount of X, Y unlocks", V77) on Dwarf Fortress's per-civilization permission lists (V76, mechanics only) and RuneScape's level requirements (V84, mechanics only). Building levels for the whole faction; every other skill levels per person. Everything is data in the catalog; this plugin evaluates it, gates work with it and shows it.

## 2. Public API (`UF.Tech`)
| Member | Returns |
|---|---|
| `cultureOf(factionId)` | The culture id kept in `state.tech` for the faction (set at creation from the faction's species), else the faction's species |
| `permits(factionId)` | `{ buildings, floors, recipes, arsenal }` (Sets) of the culture; `arsenal` = the items its recipes make. null for a culture without tech data |
| `allows(factionId, kind, id)` | `{ ok, reason, kind, node, missing }`; `kind` is `"building"`, `"floor"` or `"recipe"`. Refusal kinds: `"culture"` (never), `"unlock"` (not yet; `missing` = the unmet requirement items, `menu` = their short text). Ids that no culture list and no node mention are not gated (`kind: "unmanaged"`); neither is a culture without a `tech.cultures` entry (`"unknownCulture"`) |
| `canWork(unit, job)` | `{ ok, reason, need, kind }`: culture, then unlock (build, floor, craft), then the person's level (`UF.Skills.requirementOf`). Units that aren't people and people without a faction are never gated |
| `canWorkObject(unit, objectType, action)` | The level part alone, for an object and action (for a planner's source search) |
| `stepLocked(unit, step)` / `stepLockInfo(factionId, step, unit?)` | Whether a society-plan step (`build`, `floor`, `craft`) can't be done yet by that unit's faction (culture or unlock) or, for a craft, by the unit (level); the info is the refusal |
| `qualified({ skill, level }, factionId?, near?)` | The faction's living people at or above the level, nearest to `near` first (default faction: the player's) |
| `gate(job, unit)` | What the job wraps ask: the plan-step gate, then `canWork` |
| `unlocked(fid)`, `isUnlocked(fid, nodeId)`, `frontier(fid)` | Node ids (the frontier: locked nodes whose `after` nodes are all unlocked) |
| `progress(fid, nodeId)` | `[{ kind, what, have, want, met, text }]` (met `after` items left out) |
| `built(fid, key, zRange?)` / `tally` | A count: object id, floor kind or `"tag:x"`; `zRange` `[lo, hi]` counts only those levels |
| `count(fid, key, cell)` | Count a completed structure (once per cell and key); true when it counted |
| `level(fid)` | The faction's Building level (`UF.Skills.factionLevel`) |
| `meets(fid, requires)` | `{ ok, missing, items }` for any requirement record: the evaluator nodes use, for other systems (a class opening, V88) |
| `leaderOf(fid)` | The person who speaks for the faction (`UF.Skills.leaderOf`) |
| `evaluate(fid, { silent, trigger, forceStock })` | Unlocks what now holds; returns the node ids |
| `grant(fid, nodeId, { silent })` | Tests and debugging: unlock a node now |
| `ensureFaction(fid, culture?)` | The faction's record, created with a culture if missing (tests use synthetic factions) |
| `migrate(state)` | The load path for a save made before UF_Tech (see Save data) |
| `tree(culture)` | A culture's view of the tree: nodes with `requires` (overrides applied), `permits` (resolved and intersected with its lists), `fresh` (what it newly gives), `gives`, `label`, `short`; `permitIndex[kind][id]` |
| `nodeLabel(fid, nodeId)` | A node's name in play |
| `decorate(options, cell, fid?)` | The menu decoration as a function (returns the same list when nothing changes) |
| `openUnlocks()`, `closeUnlocks()`, `isUnlocksOpen()`, `unlocksWindow()`, `unlocksModel(fid?)` | The Unlocks view and its content |
| `sheetPage()`, `setSheetPage(page)`, `sheetRect(kind, which)`, `skillsModel(unit)`, `unlockListText(skillId, unit)` | The Skills page (`"inventory"` or `"skills"`); screen rectangles of `("tab", "skills" \| "inventory")` and `("row", skillId)` |
| `validate()` | Every problem of the tech data against the catalog, as text (the `catalog_valid` check) |
| `simulatePlan(culture)` | `{ level, xp, unlocked, waiting }`: the culture's plan walked with its own construction |
| `lastAnnounce()`, `lastMigration()` | The newest unlock announcement and load migration |
| `zOf(ref)` | The level helper (V80): `UF.Levels.zOf` when it exists, else the ref's `z`, else 0 |
| `errors`, `errorCount()`, `perf()`, `resetPerf()` | Errors caught inside; `{ events, eventMs, avgEventMs, maxEventMs, evals, gates, gateMs, avgGateUs, dropped, frameWork, menus, menuMs }` |

Installed wraps (at `Scene_Boot.start`): the `plan` of the UF_Jobs handlers `chop`, `gather`, `pick`, `quarry`, `mine`, `fish`, `hunt`, `build`, `floor`, `craft`, `haul`, `fetch`, `equip` (and of those types defined later, through a wrap of `UF.Jobs.define`); `UF.Interact.open`, `UF.Interact.optionsFor`, `UF.Interact.MenuWindow.prototype.setOptions`; `UF.Colonists.planStatus` (adds `locked`, `lockReason`); `UF.Sheet.Window.prototype.redraw`, `update`, `processPanelTouch`.

**The data** (`catalog.tech`, see `tools/add_tech_catalog.js`):
- `cultures[culture] = { buildings, floors, recipes, rule, overrides }`: object ids with `build`, floor kinds, recipe ids. Derived 2026-09-19 by the rule of TECH_TREE.md §2.3 (`--check` recomputes it and prints differences). `overrides[nodeId]` replaces that node's `requires`, `after` or `permits` for the culture (dwarves: `armoury` needs Building 4 and a smithy, no member requirement).
- `nodes[] = { id, name, root, after, requires, permits: { buildings, floors, recipes, levels, planSteps } }`. `@wall`, `@door`, `@laterWall`, `@floor` resolve to the culture's own (`@wall` falls back to `laterWall` when the culture wall can't be built: the goblins' `rubble_pillar`). `requires`: `level` (Building), `built` (`{ key: n }` or `{ key: { count, z: [lo, hi] } }`), `members` (`{ skill: level }` or `{ skill: { level, count } }`), `stock` (`{ item: n }`, held by the members and within the site radius + 2), `classes` (`{ classId: { tier, count } }`, read through `UF.Classes.count` when it exists). `levels` and `planSteps` are in the schema; no node uses them yet (TECH_TREE §12 D6, D8).
- Node names are PROPOSALS stored as `TEST_` names (AGENTS rule 7). The game never shows a `TEST_` name: a node is named by what it newly gives ("Furnace and 3 recipes").
- `text`: the chronicle and speech templates, the menu and refusal texts, the plural words for tags.

The seven nodes of 2026-09-19 (first-pass tuning of our own):
| Node | After | Requires | Permits |
|---|---|---|---|
| `camp` | – | nothing (root, unlocked at creation) | campfire, stockpile, straw bed, work stone, weapon rack, the culture's wall and door, its floor; the survival recipes, club, stone spear |
| `hides` | camp | Building 2; 1 work stone | tanning rack; leather, sling, the leather armour, wooden shield |
| `bows` | camp | Building 2; 1 work stone | bowyer's and fletcher's benches; both bows, stone and bone arrows |
| `smelting` | camp | Building 3; 6 walls | furnace; charcoal, copper and iron bars |
| `forge` | smelting | Building 3; 1 furnace | smithy; iron spear, dagger, short sword, iron axe, mace, iron arrows |
| `armoury` | forge | Building 5; 1 smithy; a member with smithing 10 (dwarves: Building 4, 1 smithy) | the iron armour, long sword |
| `stonework` | camp | Building 5; 12 walls; 20 stone held | the culture's later wall, stone door |

## 3. Events
- Emits `tech:unlocked(factionId, nodeId, node, { silent })`, `tech:counted(factionId, key, count, cell)`, `tech:refused(job, unit, reason)` (once per job and unit), `tech:sheetPage(page)`, `tech:viewOpened`, `tech:viewClosed`.
- Listens: `world:created` (every faction gets a record with `camp`, evaluated silently), `jobs:done` (a `build` or `floor` by a member is counted, then the nodes it concerns are evaluated), `skills:factionLevelUp` (nodes with a level requirement), `skills:levelUp` (nodes naming that skill in `members`), `time:hour` (frontier nodes with `stock`, at most one count per node per game hour). Every handler is wrapped: an error is counted and logged, never thrown into the bus.
- An unlock that gives the culture something new writes one chronicle line (`type: "tech_unlock"`: "The Etha Grove can now build a furnace, burn charcoal and smelt an iron bar.") for the player's faction always and for the others when `tech.chronicle.who` is `"all"`, and the faction's leader says it (`UF.Speech.say(leader, "We can build a furnace, burn charcoal and more now.", { kind: "remark" })`, V92). A node that gives the culture nothing new unlocks silently.

## 4. Save data
- `UF.World.state.tech = { version: 1, factions: { [factionId]: { culture, unlocked: { nodeId: tick }, built: { key: count }, cells: { key: { "ax,ay": [packed] } }, stockAt: { nodeId: hour } } } }`. `packed = ((z + 2) × size + y) × size + x` (size 256), so every counted cell keeps its level (V80). `tick` is `UF.Beat.count` when it exists, else `UF.Time.ticks()` (0 at world creation: presence, not the value, means unlocked).
- The Building pools are UF_Skills' (`state.skills.factions`, see UF_Skills.md).
- Not saved: the per-cell lookup sets, the stock cache, the views' state.
- **A save made before UF_Tech** (no `state.tech`): at load, UF_Skills moves personal Building xp into the pools, every faction gets a record with `camp`, the factions whose site is on the area on screen get their structures counted from one bounded scan (objects tagged `building` and not `ruin` within the site radius + 8), and every node is evaluated silently (no chronicle, no speech). Factions on other areas are not scanned (their areas aren't built just for this) and count from their next builds.

## 5. Checks (suite `tech`, run by name: `node tools/run_tests.js tech --game <dir>`)
The suite pauses the colonists' decisions, uses synthetic factions (`TEST_tech_a` …, cultures human and dwarf) and `TEST_` people, and restores `state.tech`, the faction pools, the player's plan, the test units, the placed objects and the jobs.
| Check | What would make it FAIL |
|---|---|
| `catalog_valid` | `UF.Tech.validate()` finds a problem: an unknown id in `tech` (culture lists, node permits, `built` keys and tags, `members` skills, `stock` items, `after`, overrides); a catalog culture without an entry; a node that can never unlock (a cycle through `after` or built dependencies); a permitted thing in no node; a culture's plan step left waiting (the plan walked with its own construction, counting only nodes free of `members`, `stock` and `classes`); a recipe or buildable object no culture may make; an object action, water kind, species or recipe without a level in `skills.unlocks`, or a row naming something that doesn't exist; a recipe or object action carrying its own `level` or `minLevel`; an ability with an unknown skill or effect kind |
| `faction_building_xp` | Two members' `wall_wood` builds (progress 90) not adding exactly 28.0 to the faction pool; Building in a person's record; `level(person, "building")` not the faction's; carpentry not +7 each. On a `JsonEx` copy with members holding 1 154 and 83 personal Building xp: the pool not +1 237, the keys not removed, version not 2, or a second migration moving anything |
| `faction_levelup` | With the pool 5 xp below level 3 and the leader on screen, one build: not level 3, not exactly one `skills:factionLevelUp(fid, "building", 3)`, not one chronicle line naming the faction and "Building level 3", the leader not saying "We're getting better at building." as a remark, `lastFactionLine` not naming the leader via speech, or another sprite over the leader's head |
| `counts_structures` | 3 builds on 3 cells not +3 for `wall_wood` and `tag:wall`; a rebuild on a counted cell counting again; another faction's member's build counting for the wrong faction; a failed build counting; a build on a cell with `z: 1` not counted on level 1 |
| `unlock_fires` | Building 2 with 5 walls, then the 6th wall at level 2, not locked; level 3 not unlocking `smelting`; not exactly one `tech:unlocked`; the chronicle line or the leader's line not naming the furnace; the other order (level 3 first, then the 6th wall) not unlocking; a dismantle locking it again |
| `menu_gated` | "Build here" on a free cell with the player's faction at Building 1: the Furnace not disabled with "Building 3 (now 1)" in its label; a building the culture never makes shown; choosing the locked Furnace returning something or making a job; after `grant(smelting)` the Furnace not enabled or choosing it not making an open `build` job of a furnace. Screenshot `tech.menu_gated.png` |
| `skill_gates_jobs` | A designated broadleaf giant (woodcutting 15): a level-1 person taking it or its reason not "needs woodcutting 15"; a level-20 person not taking and finishing it; a chop owned by the level-1 person not failing with that reason; the menu label not naming the qualified colonist; a gold outcrop (mining 20) the same way; a salt-water cell (fishing 15), when the map has one (the detail says SKIPPED when it doesn't) |
| `recipe_gated` | A recipe above level 1 in a non-root node (found in the data; `arrows_bone` on 2026-09-19): not refused with "not unlocked yet" while its node is locked; not refused with "needs fletching 5" one level below after the node is granted; refused at the level; a dwarf not refused `bow_short` with "Stone-holders don't carve a short bow" |
| `plan_gated` | The player's plan set to [a smithy step with its materials on the cell, a stockpile step]: 60 planner calls per colonist with `forge` locked giving a live smithy-step job; `planStatus()` not marking the step `locked`; after `grant(forge)` no colonist getting a smithy-step job, or the step still locked. The detail names the path: the UF_Colonists hook or the job-wrap fallback |
| `ability_applies` | A real chop in UF_Jobs, 30 frames at woodcutting 30 and 29: the per-tick ratio not 1.29 × 1.10 / 1.28 ≈ 1.1086 (± 0.01); `perk` not 1.1 at 30 and 1 at 29; `levelRate` not 1.29; `rate` not 1.419. 400 synthetic `stone_knife` crafts at crafting 25 giving refunds outside 22-58 or not equal to the same seeded rolls recomputed; any at 24 |
| `levelup_names_unlock` | A person on screen, woodcutting 14 → 15: not saying "I'm getting better at woodcutting." then "I can chop down a broadleaf giant now." as remarks; the profile (`UF.Skills.latest`) not woodcutting 15 with `tree_tropical`; crafting 24 → 25 without the ability's remark "I'm wasting less these days."; woodcutting 15 → 16 saying more than the first line; any other sprite over the head |
| `culture_differs` | The human and dwarf lists not equal to the catalog's or not different; a bowyer's bench in the dwarf's build menu or missing from the human's; a dwarf not refused `bow_short` by culture, or a human refused by culture |
| `saved` | A `JsonEx` round-trip not keeping `state.tech` and the pools exactly; `makeSaveContents().ufWorld` not holding the live objects; a pre-tech copy (no `state.tech`, members with 1 154 and 83 Building xp) not migrating (pool +1 237, `camp` for every faction, nothing announced, no chronicle line, and a second evaluation unlocking nothing more); the live unlocks of the real factions not equal to a fresh evaluation from the roots |
| `views_show` | The Skills tab clicked through `TouchInput` not showing the Skills page with 22 rows, each with drawn pixels, the first "Building (faction)" at the faction's level, and the woodcutting row "next 5" at level 3; the Inventory tab not bringing the grid back; U not opening the Unlocks view with the faction's name, "Building level N", every unlocked node and every frontier node's requirement texts; Escape not closing it. Screenshots `tech.skills_page.png`, `tech.unlocks_view.png` |
| `perf` | 2 000 synthetic `build` `jobs:done`: UF_Tech's handler over 0.05 ms per event on average; `canWork` over 5 µs per call; `UF.Skills.rate` (with abilities) over 10 µs; any work by UF_Tech in 120 frames with both views closed |
| `no_errors` | An uncaught error during the suite, or an error caught inside UF_Tech or UF_Skills |

Each check was seen failing once on 2026-09-19 against a sabotaged copy in its own snapshot (the report quotes the FAIL lines): catalog_valid (a snapshot catalog with node permit `furnace_x`, `forge.after = ["armoury"]`, `crystal` removed from `unlocks.actions.mine`, `smelting.requires.level` 9), faction_building_xp (a faction skill routed to the person), faction_levelup (the chronicle call removed), counts_structures (the per-cell set disabled), unlock_fires (no evaluation on `jobs:done`), menu_gated (the decoration leaves locked buildings enabled), skill_gates_jobs (the level test inverted), recipe_gated (the culture test skipped), plan_gated (neither the plan-step gate nor the build gate), ability_applies (the ability level compared with `<=`), levelup_names_unlock (no unlock remark), culture_differs (`cultureOf` always `human`), saved (`state.tech` not enumerable), views_show (the page returns before drawing rows), perf (a 0.2 ms busy loop in the handler), no_errors (a throw inside the `jobs:done` handler).

## 6. Status
**Works (seen in snapshots on 2026-09-19):** all of the above; the `tech` suite 16/16; `skills` 14/14 with the UF_Skills changes; the suites the hooks touch compared with an unchanged snapshot (see the report of 2026-09-19).

**Keys and mouse:** U opens and closes the Unlocks view (`Input.keyMapper[85] = "ufTechUnlocks"`; `tech.keys.unlocks` may name another key code); Esc or a right-click closes it; Tab turns its pages. On the character sheet of a person, the tabs `Inventory | Skills` sit at the right of the grid's title row (Inventory) or under the header (Skills); clicking a skill row puts its whole unlock list in the footer.

**Assets:** none new. Text, code-drawn tabs and bars, the window skin in use, and the greyed text `Window_Command` draws for disabled options. Requests for skill icons and tech badges: `docs/ASSET_REQUESTS.md` (AR-913, AR-914) and `docs/handoffs/HANDOFF_df_mechanics.md` → Tech.

**Registration (for the lead, with the RMMZ editor closed):**
- `game/js/plugins.js`, directly after `UF_Sheet`: `{"name":"UF_Tech","status":true,"description":"[UF Tech] Faction technology: culture permissions, the Building level and build-N-of-X unlocks, skill-level gates on work and crafts, the skills page and the Unlocks view.","parameters":{}}`
- `tools/register_world_plugins.js` `ORDER`: `"UF_Tech"` after `"UF_Sheet"` and before `"UF_Talk"`; `DESCRIPTIONS`: `UF_Tech: "[UF Tech] Faction technology: culture permissions, the Building level and build-N-of-X unlocks, skill-level gates on work and crafts, the skills page and the Unlocks view.",`

**Needs from others (TECH_TREE.md §7.3; not applied, the files are claimed):**
- UF_Colonists.js (the planner): next to `deferred`, `const techLocked = (u, step) => !!(window.UF.Tech && typeof UF.Tech.stepLocked === "function" && UF.Tech.stepLocked(u, step));` and in `planJob` `if (status[i].done || deferred(c.plan[i]) || techLocked(u, c.plan[i])) continue;` (game copy: `if (status[i].done) continue;`, line 1203 on 2026-09-19). Without it the job wraps still refuse every locked step's jobs (haul, fetch, build, craft made for that step), but the planner may spend its look-ahead of 3 steps on steps it can't do. In `objectSourceNear` and `foodObjectNear`, add `&& (!window.UF.Tech || UF.Tech.canWorkObject(u, t, action).ok)` to the `scanObjects` predicate so a gatherer never walks to a tree above their level. Optional: `Colonists.techHooked = () => true` so the `plan_gated` check names the path.
- UF_Combat.js (the combat abilities): read `UF.Skills.abilities(attacker, { kind: "combat", attackType })` in the attack roll (`accuracyTwice`, `maxHitMul`, every Nth attack counted in `unit.data.combatCount`). Until then Twin Thrust, Crushing Weight and Steady Draw are announced and listed but change nothing.
- The V85 work-timing build (UF_Jobs): take `levelSpeed` from `UF.Skills.levelRate` and `perkSpeed` from `UF.Skills.perk`, not from `rate`, which now includes the speed abilities (TECH_TREE §14 F6).

**Known limits:**
- The older `UF_Construction.js` and `UF_Crafting.js` keep their own build and craft queues outside UF_Jobs; UF_Tech doesn't gate them (TECH_TREE §14 F5).
- A job wrap refuses a locked plan step's jobs one by one; the planner marks the target to avoid for 900 ticks after each refusal (UF_Colonists `give`), so without the hook a band may stand idle on a locked step while other steps wait behind it in the look-ahead.
- Old saves count structures only for factions whose site is on the area on screen at load.
- Hunting levels are all 1: the colonists' prey search can't skip prey it may not hunt until the UF_Colonists hook lands.
- The goblins' culture wall `rubble_pillar` can't be built (TECH_TREE §14 F1); the tree uses their later wall (`wall_wood`) as `@wall`. The fix belongs in the catalog or in UF_Colonists' `makePlan`.
- The Skills page's "next" column is drawn at 10 px and squeezed to fit; icons would help (AR-913).
- Node and ability names are proposals (TECH_TREE §11); the decisions D1-D11 (TECH_TREE §12) are the user's.
