# DEUS materials

Data contract for matter that moves. One catalogue of natural, loose and constructed materials, integer masses for items and objects, and a pure reader. Mining, building, collapse, decay and reclamation keep weight. The ledger in `game/js/sim/ledger.js` is the accounting instrument (DEC-028). This package does not call it and does not change gameplay.

Owner rules used as written:

- DEC-028. Every material, block, item and structure has a weight. A mined slice, a built element, a collapse and a reclamation each come out at the same total weight they went in with.
- DEC-028 reclamation. Stone and masonry rubble end as solid stone. Wood, organic detritus, corpses and bone end as soil. Metals end as rust, scrap or a trace, and never as virgin ore.
- DEC-028.3. Items in an active, claimed or enclosed structure are exempt. The exemption is data (`exemption` in `game/data/sim/materials.json`, `implemented: false`). Consumers apply it.
- DEC-023 / LIFE-002. Ore does not respawn. No catalogue row outputs an ore class except a same-class form change of ore that is already there (`mine` on `fe_ore`, `cu_ore`, `ag_ore`, `au_ore`, `pt_ore`).
- DEC-013 as amended. Squares are 5 ft, layers are 10 ft, slices are 2 ft, five slices to a layer. Masses are per slice. The world's layer count is not an input to the mass formula.

Designs this stays consistent with, and the places they disagree, are listed at the end. Disagreements are fields on the records (`disagreement`) and the `disagreements` array. They are not smoothed over.

## Where it lives

| Path | Role |
|---|---|
| `game/data/sim/materials.json` | Material records, decay-class lives, the mu proposal, geometry, the exemption. |
| `game/data/sim/mass_tables.json` | Item and object masses, bills, yields, collapse paths. Keyed by `DEUS_WorldCatalog.json` ids. |
| `game/data/sim/interactions.json` | Bearing, burning, rust, erosion, blast per-mille table. |
| `game/data/sim/README.md` | Units, the half-height conversion, how to call the reader. |
| `game/js/sim/materials.js` | `createMaterials` / `validate`. No host global, no clock, no random numbers, no file loading. |

`node tools/sim/test_materials.js` reads the data, checks conservation, and kills mutants. `node tools/sim/test_ledger.js` is unchanged by this package.

## Mass unit

`ledger_defaults.js` lines 9-10 name `mu` and leave its size to SIM.40.00 / SIM.40.01. The catalogue proposes **1 mu = 1 g** (`proposalMuPerKg` 1000) with status `PM_DEFAULT_UNCONFIRMED` and `confirmed: false`.

Lane Q's published figures are integer kilograms (SIM.40.01 §1 and §2.3). Each of those kilograms is stored as `kgPerSlice` and as `massPerSlice = kgPerSlice * 1000`. Lane R's 1/16 lb and Lane W's grams are the other options. None of the three is confirmed. Choosing a different mu size means multiplying every `massPerSlice` by one constant and re-checking that alloy totals still divide by the ledger composition denominator (electrum's denominator is 2).

Catalogue items that already have a `weight` field store `catalogWeightTimes1000` and use that as `massMu`. The field has no unit in the catalogue. Treating it as kilograms is part of the unconfirmed proposal: a longsword at 1.4 lines up with the SRD's 3 lb, and the gram proposal makes every published weight an integer. Items with no weight use a PM-default carried mass, documented on the row (`massStatus` `PM_DEFAULT`).

## Slice mass

Rounding is SIM.40.01 §2.3, one rule. A slice is 50 ft³. The foot is 304.8 mm. Density in kg/m³ times that volume rounds to the nearest integer kilogram, halves upward. Fills and loose fractions multiply that integer and round once. The reader checks `massPerSlice` against `kgPerSlice * proposalMuPerKg`, and it checks loose bulk (`rubble` is 3/5 of the parent kilogram, `scrap` is 1/4) the same way.

Examples that match the Lane Q table: granite 3,894 kg, limestone 3,256 kg, oak 1,062 kg, masonry 977 kg, timber wall (oak) 266 kg, iron grate 111 kg, ice load 1,011 kg. Species timber scales the oak assembly kilogram by the species density over oak's 750 kg/m³ and rounds once. The oak row is what `massOf` returns; `speciesScale` holds the others.

Strata ids follow SIM.40.01 §2.7. Ids 0-63 only. Ids 38-42 are the five ore hosts with `massPerSlice` null and status `OWNER_OPEN` because vein grade is not set. Ids 43-47 are reserved the same way. Id 15 (snow) and id 31 (stairs) are reserved placeholders. Wood species other than the generic trunk (id 3, oak density) are records without a strata id, because the 6-bit id space is the one Lane Q fixed.

## Ledger mapping

Each matter record names a class and family from `ledger_defaults.js`, or an integer composition that matches the class (electrum is `au` 1 + `ag` 1, the ledger recipe). The reader rejects a composition that is not the ledger's.

Constructed voxels are ledger form `object` (the built flag). Natural rock and soil are `strata`. Loose rubble, sediment, ash, charcoal and humus are `strata`. Metal classes have no strata form, so scrap and a solid metal reference voxel are form `item` (LEDGER_API §10). Soil has no object form, so an earth prop is booked as `strata`. Gem objects move with `unset` (object to item). Gem `mine` is strata to item only.

A posting names a ledger transform row (`quarry`, `break`, `chop`, `salvage`, `dig`, `pick`, `mine`, `smelt`, `harvest`, `litter`, `rot`, `unset`) with from-class, from-form, to-class and to-form. `identity` is a same-class stay, used where the ledger has no row because the mass is already in its resting form. `validate` refuses a named process the ledger does not list.

Yield and collapse are alternative paths. Each sums to the source mu. Families sum as well, so a stone slice that becomes stone items plus rubble spoil stays in `mineral`, and a timber slice that becomes a wood item stays in `organic`. The two paths are not added.

Combustion of organics is a per-mille split of ash and charcoal that sums to 1000. The ledger burn rows keep both in `organic` and have no gas sink, so the Lane R gas fraction is retained as charcoal (`applied: false` on the Lane R numbers, `D-FIRE-SINK`). Charcoal itself burns entirely to ash.

## Support, fire, decay

Support columns are the SIM.40.01 tables: bearing kilograms, span in squares (`spanBase` for rock thickness 1, 2, 3, 5, 10, 20 and at least 40 slices, or `spanAny` for an assembly), rated load, SRD AC, hit points, damage threshold, loose repose. `weightClass` is the Lane Q group name (`rock`, `soil`, `wood`, `masonry`, `timber`, `thatch`, `metal`, `loose`, `fluid`, `trace`). Loose matter has span 0. Porosity as a fraction is null (`PLACEHOLDER`); the permeability class 0-6 from the design is stored for SIM.50.02 and is not a seepage model.

Flammability class and ignition points are the design's. Blast pass and resist per mille are `interactions.json` `blast`, from SIM.40.01 §8.3, status `PM_DEFAULT`.

Decay classes and the life tables are SIM.40.05, stored as milli-years of simulated time so that 0.05 year is the integer 50. Infinity is `infinite: true`. `calendar.dpy` and `calendar.tickHz` are null, status `OWNER_OPEN` (D-1). No tick rate is chosen. Natural strata have no decay class. Built timber, masonry, thatch and the iron grate carry the class Lane Q §9.7 maps onto Lane R.

## Reclamation

`reclaimTarget(id)` returns the endpoint.

| Matter | DEC-028 word | Ledger class actually reached | Path |
|---|---|---|---|
| Stone, rubble, masonry, sediment, dust | solid stone | `stone` | weather to sediment, then lithify, where the single step does not exist (`D-RECLAIM-RUBBLE`) |
| Wood, ash, charcoal, flesh, bone | soil | `humus` | `rot`, `litter` or `weather` (`D-RECLAIM-ORGANIC`) |
| Iron, steel, copper, silver, scrap | trace | `fe_trace`, `cu_trace` or `ag_trace` | `rust` |
| Gold, platinum, electrum | scrap | the same class | no rust row (`D-NOBLE`) |

Bone is `biomass` because the ledger has no bone class (`D-BONE`). Tin and the tin share of bronze (Lane Q's example 120/1000) are `unmapped` with element `sn` (`D-TIN`). They are not given a stand-in family. Glass, ceramic, lead and the special metals are the same kind of gap: decay-class keys exist for glass, ceramic and stone items, and there is no mass row pretending they are stone.

Lava solidifies at the Lane Q ratio: 2 du × 2,053 kg = one basalt slice of 4,106 kg. A leftover du is 2,053 kg of basalt-lineage rubble. Both numbers are `PM_DEFAULT`.

## Items and objects

Every catalogue item type and every catalogue object type has a row, or is massless with a reason.

Massless: `stockpile` (a designation, the build spends nothing) and `farm_plot` (it marks soil already in the strata).

An object that has `build.items` weighs the sum of those items. Dismantle returns that same bill. Collapse breaks each line into its debris at the same weight: stone to rubble, wood to a wood item named broken timber, biomass to humus, metal to a metal item named scrap. Catalogue actions that pay out a different count (a stone wall that yields its stone and also leaves rubble, a door that returns half, a framed wall that drops its hardware, a fruit tree's chop that drops the fruit, a campfire whose ruin is a bone pile) are listed on `catalogNotApplied` and are not the masses (`D-CATALOG-YIELD`, `D-CAMPFIRE-RUIN`).

`bridge` and `well` have no catalogue bill. Their masses are PM defaults (four logs, four stone) and are flagged `D-OBJECT-VOXEL`. Those masses are the build cost of the prop. They are not a count of Lane Q voxels. Joining the two is `PROPOSED-AC-06`.

Ore props keep the ore mu they already contain. `ironstone` and `copper_outcrop` mine ore items of that mu and quarry the host stone. `gold_outcrop` is ore on the way in and a gold nugget (`au_metal`) on the way out, by `mine` then `smelt`, equal mu (`D-GOLD-NUGGET`). Collapse of that prop does not smelt: the gold stays `au_ore`.

Trees are booked as `wood` because the chop yield is wood and Lane Q's trunk is wood (`D-TREE-CLASS` records the ledger hook that calls trees biomass). Plants that yield food, fibre or straw stay `biomass`. A plant with no yield has a small PM-default residual (100 mu, or 200 mu for a bare berry bush).

## Calling the reader

```javascript
const { createMaterials } = require("./game/js/sim/materials.js");
const ledgerDefaults = require("./game/js/sim/ledger_defaults.js");
const api = createMaterials({ catalogue, masses, interactions });
api.validate({ catalogue, masses, interactions }, ledgerDefaults); // array of "CODE: where"
api.massOf("granite", "strata", 1);   // mu of one slice
api.massOf("log", "item", 4);
api.massOf("wall_stone", "object", 1);
api.yieldOf("granite");
api.reclaimTarget("iron");            // fe_trace
api.billOfMaterials("wall_stone");    // lines sum to elementMu
api.checksum();                       // stable across two loads
```

`material(32)` and `material("granite")` are the same record. `massOf` returns null for an open slice (water, snow, an ungraded vein) and 0 for a massless object. A count that is not a non-negative safe integer throws `E_AMOUNT`. `yieldOf("rubble")` returns both the loose material and the catalogue prop, because those ids collide; `massOf` distinguishes them by form.

## What this package leaves alone

Plugins, the ledger sources, world catalogues outside `game/data/sim/`, combat rules, vision and status docs, and every WBS. No art. No save migration. No gameplay hook. The exemption, the calendar, and the mu size stay on the record for the consumer and the Owner.

## Disagreements recorded on the data

| Id | What the two sources say | What the data does |
|---|---|---|
| D-MU-UNIT | Kilograms, 1/16 lb, grams, or unset | Proposal 1 g, unconfirmed |
| D-SOIL-SPLIT | Lane Q soil is 950/50 mineral/organic per mille | Full soil mass stays class `soil`. Split stored, not applied |
| D-FIRE-SINK | Lane R gas sink versus ledger ash + charcoal | Gas retained as charcoal. Lane R fractions stored with `applied: false` |
| D-RECLAIM-ORGANIC | DEC-028 says soil; ledger rot ends at humus | Both fields set. Applied class is humus |
| D-RECLAIM-RUBBLE | DEC-028 says rubble becomes stone in one step | Path is sediment then lithify |
| D-NOBLE | DEC-028 allows trace; Lane R NOBLE never corrodes; no `au_trace` or `pt_trace` | Same-class scrap |
| D-TIN | Bronze's tin share, and tin itself | Unmapped element `sn` |
| D-BONE | Lane R bone family | Class `biomass` |
| D-ASH-MASS | Lane Q 850 kg versus Lane R's 40 lb/ft³ | 850 kg |
| D-CHARCOAL-MASS | Lane R 15 lb/ft³, no Lane Q figure | 340 kg by the kilogram rounding rule |
| D-WATER-SLICE | 7 du and 5 slices | Per-slice water is null |
| D-SALVAGE-RATE | Registry 0.8 versus Lane Q 75 percent | Whole mass returned |
| D-OBJECT-VOXEL | Prop bills versus voxel fills | Prop bills. Not forced equal |
| D-CATALOG-YIELD | Several catalogue actions do not conserve | Conserving bill or chain is the one applied |
| D-GOLD-NUGGET | Outcrop yields a metal nugget | mine then smelt, equal mu |
| D-RUBBLE-OBJECT | Prop pick yields stone | Class stays rubble |
| D-GRAVEL-OBJECT | Prop pick yields stone; the strata material is rubble | Prop booked as stone |
| D-CLAY-ACTIONS | Gather 2 versus quarry 3 | Quarry count is the mass |
| D-CAMPFIRE-RUIN | Catalogue ruin is a bone pile | Log and stone bill |
| D-TIMBER-INFILL | Frame text names mineral infill | Published kilogram is the timber share only |
| D-WOOD-COLLAPSE | Broken timber as strata; no wood object-to-strata row | Salvage to a wood item |
| D-SCRAP-FORM | Loose scrap voxels; metal has no strata form | Metal item form |
| D-TREE-CLASS | Ledger hook says biomass; chop yield is wood | Class wood |
| D-GLASS | Lane R glass, ceramic, lead, specials | No stand-in class and no mass |
| D-SNOW | Reserved; water has no snow form | No ledger class |
| D-ICE-BULK | Loose ice is 0.6 of the slice | Broken slice still deposits 1,011 kg |

## Follow-ups named from this package

These are not WBS ids.

- PROPOSED-AC-01. SIM.40.11 posts these paths to the ledger at the strata, item and object writers, and applies DEC-028.3.
- PROPOSED-AC-02. SIM.50.02 reads `porosity.perm` and replaces the null fraction.
- PROPOSED-AC-03. WG.61 sets ore grade for strata ids 38-47. Until then those masses stay null.
- PROPOSED-AC-04. Composite items (a sword, a spear, a stone axe) need component masses. The whole mu sits on the dominant class today.
- PROPOSED-AC-05. Ledger classes for tin, bone, glass, ceramic and lead, if the Owner wants those families.
- PROPOSED-AC-06. Reconcile a catalogue prop's bill with the Lane Q voxels that prop will occupy.
- PROPOSED-AC-07. Assign 7 du across 5 water slices without a rounding the Owner has not chosen.
- PROPOSED-AC-08. SIM.50.06 gives snow a form and a mass. Id 15 is reserved for that.
