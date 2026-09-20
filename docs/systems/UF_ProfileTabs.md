# UF_ProfileTabs

Date: 2026-09-19. Additive creature-profile inspection with eight tabs: Overview, Needs, Skills, Personality, Goals, Family, Culture and Inventory. The existing `UF_Sheet.js` is not edited. Its inventory/equipment interactions and object/stockpile subjects remain its responsibility. Informational pages read actual records and explain distinctions such as personal aspiration versus completed practice, remembered knowledge versus technology permission, and recorded animal behavior versus humanoid needs.

Load after `UF_Sheet`, Goals and CultureGrowth, before `UF_Test`. Root coordinates live registration while the RPG Maker MZ editor is closed. No new artwork, catalog entries, races or lore are introduced.

## UI and input

A 112-pixel vertical tab strip appears immediately to the left of the native Sheet. Informational tabs use a companion window on the Sheet's existing right-hand footprint; Inventory hides that overlay and leaves the original grid, equipment, item selection and controls visible. Both companion windows are inserted immediately above Sheet and below other map windows. The native Sheet's existing covering-window test prevents its underlying item controls from receiving informational clicks.

The companion windows use the Sheet's current window skin and reuse its portrait renderer. They fit the observed 808×616 game box within the default 816×624 canvas without changing the native inventory grid's geometry. Longer explanations paginate using Previous/Next buttons. A different selected creature starts on Overview, page 1. Closing and reopening also resets Overview; selecting the same creature while still open retains the tab. Selecting an object, pile or stockpile hides both added windows. The close box, right-clicking a companion window or the native Sheet's Escape handling closes the profile. Modal/context windows retain pointer priority.

Clicks inside a companion window consume the actual TouchInput trigger/cancel flags before the map controls execute. The map's window hit-test also includes the sidebar, so it cannot become a movement-order surface. No new hotkeys or overhead text are added. Inspection and pagination remain available while the simulation is paused.

## Public API (`UF.ProfileTabs`)

| Member | Contract |
|---|---|
| `tabs()` | Fresh array of `{id,name}` for the eight tabs; IDs are lowercase. |
| `model(unitOrId, tab="overview")` | `{unitId,name,kind,z,tab,rows:[{text,tone}]}` or null for a missing creature/unknown tab. Pure saved-record inspection: no adopt, ensure, refresh, reconcile, orders, XP or state initialization. Rows are capped at 160. |
| `selectTab(id)` | Switch the current creature profile to that tab and reset its page; false without a selected creature or for an unknown tab. |
| `turnPage(delta)` | Change the active informational page, clamped to its actual page count; false on Inventory or without a profile. |
| `current()` | `{unitId,tab,page,pages}` or null. Page index is zero-based. Inventory retains the last informational page count; it has no added pagination. |
| `windows()` | Current scene view record containing `side`, `info`, selected unit, tab/page, cached model/signature and check/redraw counters; null outside the map scene. Intended for tests/integration, not simulation authority. |
| `screenRect(kind, which?)` | Screen-pixel `{x,y,w,h,cx,cy}` for `("tab",id)`, `("close")`, `("next")` or `("previous")`; null when unavailable. |
| `sync()` | Force an inspection refresh of the current Sheet subject; does not advance the simulation. |
| `POLL` | 30 rendered map-scene updates between open-profile signature checks. Closed/non-creature profiles do not poll. |

### Data and truthfulness

- Overview reads real identity, age/stage, current z/cell, faction, recorded health and the actual saved active Job. Carried-load wording uses the native Sheet reader only when all required saved Jobs/Items/inventory records already exist; otherwise it explicitly says the information is not recorded.
- Needs lists only finite recorded values, current catalog thresholds, mood and up to eight recent thoughts. A valid saved `data.sleepSchedule` adds preferred bedtime/wake time, duration and chronotype. Missing/invalid schedules remain explicitly unrecorded; viewing the tab never calls the initializing sleep planner. A preferred schedule is not presented as proof the person is asleep. It never creates an animal's hunger/thirst record.
- Skills uses the live XP-based Skills API, not the obsolete `data.skills` work counters. People without `skillXp` are marked unrecorded rather than initialized. Animals show only recorded/catalog combat capabilities with an explicit no-personal-training explanation. Faction-scoped catalog skills are labeled as such; no missing faction-XP API is invented.
- Personality displays saved facets and their currently implemented influences, separately from learned work preferences and confirmed practice. A facet without a known behavioral consumer is labeled as a recorded disposition, not credited with invented effects.
- Goals reads existing `data.lifeGoals` without calling the mutating `Goals.describe/refresh/ensure` APIs. Current action is read live; stored goal progress is reported as recorded. Animal goals remain observational, and developing/unknown-age people are not described as industrial workers.
- Family reads the existing household/genealogy records, known parent/partner IDs, resident names and social bonds. Dead/dying records are not counted as living residents. Genealogy is expressly simulation information, not NPC public knowledge. All saved `home` plus `home.annexes` structures are counted, with their saved design metadata, aggregate planned bed spaces, current-resident overflow and recorded expansion blocks. Actual per-building wall/door/bed counts use the household's own saved area/z. Main-home hearth/storage remain distinct from annexes without those facilities. Planned bed spaces are not presented as a maximum family size, and physical furniture does not imply supplies, ownership or privacy. Raw records are used because even `Households.structures/demands` resolve through a lazy state initializer.
- When Agriculture is available, Family adds **Settlement farming (shared)** through its read-only `describe(unit)` contract. It distinguishes actual plot count from the population-driven planning target, reserved/tilled/growing/ripe phases from completed harvests, presently available edible stock from promised crop yields, missing inputs and blocked reasons, and the person's confirmed farm work. This does not label shared plots as household-private property. Missing data remains unavailable rather than invented zeroes; a legitimate summary with zero recorded plots may still have a nonzero planning target. The inspector never calls Agriculture's `state`, `planSteps` or reservation APIs.
- Culture distinguishes catalog background/conditional work policy from saved faction practices and knowledge. The nonmutating `CultureGrowth.mechanicFor` API supplies policy wording. No practice/knowledge record is initialized by viewing it, and remembering a recipe is not described as unlocking technology.

## Events and hooks

Listens to `sheet:opened` and `sheet:closed` for immediate synchronization. Emits no simulation events. Aliases `Scene_Map.createAllWindows`, `Scene_Map.update`, `Scene_Map.isAnyWindowUnderMouse` and `Scene_Boot.start`; no engine core or other plugin file is changed.

The native Sheet's closure-local `buildModel/layoutFor` implementations are intentionally not replaced through ineffective aliases of its public facade. The new windows read the selected subject and current portrait model through its documented API.

## Save data and cost bounds

None. Tab choice, page, window references, wrapped text and counters are scene-local view state. There are two companion windows/contents bitmaps per map scene, no bitmap creation per frame, no background polling while closed, and no new simulation timer. Only the active page's model is checked every 30 render updates and redrawn when its signature changes, an image is pending, or the user interacts. UI polling is independent of game speed and does not advance paused world time.

## Checks

`"C:\Program Files\nodejs\node.exe" tools/test_profile_tabs.js` executes the actual plugin in a Node VM with explicit engine/UI doubles. Observed 2026-09-19: **46 passed, 0 failed**. The test covers sparse-state inspection purity, real saved Jobs, age 0/unknown age, actor z, actual needs and XP, distinct saved sleep schedules and malformed/missing schedules, animal unknowns/capabilities, separation of traits and preferences, saved goals/blocks, genealogy, same-level physical home/annex counts without fixed family size, design/expansion data, dying residents, culture evidence, eight tabs, 816×624 bounds, real touch handler containment, pagination, native Inventory visibility, NPC selection, object subjects, close/reopen/right-click, modal precedence, live level changes and bounded/closed polling. It also ensures the UI helper never overrides the engine's inherited `render` method. Four farming-consumer checks use an explicit read-only Agriculture double: actor-level/pure inspection, plans versus completed harvests, actual stock/missing inputs/personal work labels, and unavailable information without invented zeroes.

The first six real-source mutations each produced **45 passed, 1 failed**, exit 1:

- `--mutate-containment`: removes input consumption; tab click becomes a map action.
- `--mutate-level`: reads household objects on Ground; the underground count becomes incorrect.
- `--mutate-unknown`: invents a zero hunger value for missing animal needs.
- `--mutate-native`: leaves the informational overlay visible on Inventory.
- `--mutate-poll`: polls every render update rather than every 30.
- `--mutate-load-guard`: calls the native lazy inventory reader without existing records; sparse inspection changes saved state.
- `--mutate-sleep`: forces a common bedtime instead of the two distinct saved schedules: **44 passed, 2 failed**, exit 1.
- `--mutate-annex`: removes saved annexes from the structure list: **44 passed, 2 failed**, exit 1.
- `--mutate-farm-inspection`: initializes Agriculture state during inspection: **45 passed, 1 failed**, exit 1.
- `--mutate-farm-harvest`: displays reserved plot count as completed harvests: **45 passed, 1 failed**, exit 1.

The embedded nondefault RMMZ suite is `profile_tabs`. It uses existing real founder/NPC/wildlife subjects, actual TouchInput queued events, pixel assertions for all informational tabs, paused state preservation, native Inventory/Equipment availability, selection/close and closed polling. Fixture preparation asks the real `Households.planSteps` for a reservation if no candidate has an existing home; this occurs before the inspection baseline and does not fake completed walls, furniture or supplies. A separate native-controls regression gives a two-stone stack to a Ground player founder (or a bounded safely spawned Ground `TEST_ProfileInventory` clone when the player faction starts underground), clicks its real slot and Drop/Pick up rectangles, checks the actual item holder/cell/count/order, and removes only the test-given stack/clone during cleanup. No underground item transfer is exercised or implied safe.

Observed 2026-09-19: `node tools/test_snapshot.js --name profile_tabs_20260919_e --plugins UF_ProfileTabs --suite profile_tabs` produced **24 passed, 0 failed**, exit 0, with **0 captured new errors**. This is an isolated NW.js/RMMZ runtime, not an editor F5/F8 session. Result file: `C:\Users\snewt\AppData\Local\Temp\uf_snapshots\profile_tabs_20260919_e\test_output\results.txt`.

All five PNGs in that directory were opened and inspected:

- `profile_tabs.skills.png`: elf portrait and woodcutting XP among the paginated skill explanations; sidebar and text fit the 808×616 game box in the default window.
- `profile_tabs.needs.png`: actual needs plus saved 20:00–04:30, 8.5-hour personal schedule and Early chronotype; the explanation distinguishes preference from current sleep.
- `profile_tabs.family.png`: one living resident and a real reserved 6×8 home, two planned bed spaces and 0/26 built walls; the display does not claim a completed building.
- `profile_tabs.inventory.png`: original equipment slots, inventory grid and Drop/Pick up buttons remain visible without the informational overlay; the two-stone stack and “Picked up Stone × 2” footer are visible after actual button clicks.
- `profile_tabs.animal.png`: deer Needs states persistent needs are not recorded, with its actual Ground level.

Earlier runtime evidence is retained: snapshot `profile_tabs_20260919_a` failed on an accidental `render` helper collision with PIXI; renaming it `redrawProfile` fixed the observed cause and snapshot `b` passed 17/17 (all three screenshots opened). Snapshot `c` passed 18/19, with the new home-evidence check correctly failing because its founder had no planned home. All five `c` screenshots were opened; Family truthfully showed the absent plan. The final fixture's real-planner setup addresses that test precondition. Snapshot `d` passed 19/19 and all five screenshots were opened before the additional Ground item-control regression; it also showed the correct Ground animal label with the camera underground.

## Status and known limits

Implemented in new files; source checks/mutations and isolated runtime/visual evidence observed. Root owns live registration, STATUS and committing. Editor F5/F8 and user acceptance are not checked by this module's author. No slice approval is claimed.

Farming explanation follow-up on 2026-09-19: the 46-check source run and ten mutations above include the new read-only summary. The historical 24-check runtime evidence predates this follow-up; actual Agriculture-backed summary rendering and purity are pending the lead's combined runtime checks. The existing Skills/Personality/Culture pages naturally show farming XP or recorded preferences/practices when their owning systems supply them; the UI itself grants nothing.

- The existing native Sheet is still responsible for item operations. Its previously identified missing-z Drop/Pick up queries are not repaired by this additive plugin; an Inventory tab is not evidence of cross-layer item safety.
- The native Sheet can expose a stranger's inventory; this addon does not change that pre-existing visibility policy.
- Family's annex aggregation and same-level counts were exercised by actual-source tests; the final screenshot contains one main home, not a completed multi-building household. No multi-generation housing completion is claimed.
- This is an inspector, not a new personality, animal-needs, family-planning, relationship-belief or technology simulation. Unknown data remains unknown.
- Eight tabs fit the default screen; unusually narrow custom resolutions below the native Sheet's supported layout have not been visually checked.
- Text changes when stored data changes. The profile deliberately does not force ambition evaluation simply because it is opened.
