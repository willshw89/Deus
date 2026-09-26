# Sim material data

Catalogue, mass tables and interaction matrix for SIM.40.00. A later package (see `PROPOSED-AC-01` in `tasks/SIM.40.00/lane-ac/REPORT.md`) is what posts these numbers to `game/js/sim/ledger.js`. Nothing here is wired into a plugin.

## Files

| File | What it is |
|---|---|
| `materials.json` | One record per material: strata id when it has one (SIM.40.01 §2.7), ledger class and family, kilogram mass of one 2-ft slice, support, porosity placeholder, flammability, combustion split, decay class, mined yield, collapse output, reclamation target, and a status on each judged value. |
| `mass_tables.json` | Integer mu for every item type and every object type in `game/data/DEUS_WorldCatalog.json`. Constructed objects carry a bill of materials. Two objects are massless, each with a reason. |
| `interactions.json` | What bears, what burns, what rusts, what erodes, and the SIM.40.01 §8.3 per-mille blast table. |
| `../../js/sim/materials.js` | Pure reader. `createMaterials({ catalogue, masses, interactions })` returns `material`, `massOf`, `yieldOf`, `reclaimTarget`, `billOfMaterials`, `validate`, `checksum`, `describe`. |

`validate(data, ledgerDefaults)` takes the object exported by `game/js/sim/ledger_defaults.js` and returns a sorted list of named errors. An empty list means the data satisfied the checks. It does not change the ledger.

## Units

`mu` is the ledger's integer mass unit. Its size is the object `mu` in `materials.json`: proposal `1 mu = 1 g` (`proposalMuPerKg` 1000), `status` `PM_DEFAULT_UNCONFIRMED`, `confirmed` false. Lane Q published kilograms, Lane R assumed 1/16 lb, Lane W used grams, and `ledger_defaults.js` leaves the size unset. The gram proposal is the one that keeps both the Lane Q integers and the catalogue weight field on integers. It is not an Owner decision. Options are in the lane report.

Water and lava are counted in `du` (1/7 of a full 10-ft cell, `DEUS_Fluid.js` `DEPTH_MAX` 7). Ice stores both: 1 du and 1,011 kg of load per slice (SIM.40.01 §2.3). A 10-ft water layer is 7 du, which does not divide by 5 slices, so water has no per-slice mu.

Geometry used for the kilogram rounding, and for nothing else: a square is 5 ft, a slice is 2 ft, a layer is 10 ft, five slices to a layer. One slice is 50 ft³. The metre used in the rounding is 0.3048 (`footMilliMetre` 3048). Density times that volume is rounded to the nearest integer kilogram, halves up. `massPerSlice` is that kilogram times `proposalMuPerKg`. A row derived from a parent (a fill, a loose fraction) multiplies the parent's integer kilogram and rounds once.

## Legacy half-height slices

Older saves use a stratum half the height of one slice of the same 5-ft square. The conversion, not implemented here, is: half of `massPerSlice`, and if the mu is odd the extra 1 goes to the upper half. `geometry.legacyHalfSlice.implemented` is false. There is no layer count in the mass formula and none in the reader.

## How a consumer uses it

1. Load the three JSON files and `ledger_defaults.js`.
2. `validate`. Ship only data that returns no errors.
3. `massOf(id, form, count)` for a slice (`strata`), an item (`item`), or a catalogue object (`object` or `ruin`). A null return is an open or placeholder mass (water, snow, an ore vein with no grade). A massless object returns 0.
4. `yieldOf(id)` and the collapse postings are alternative paths. Each sums to the source mu. Post a path with `ledger.transform` using the posting's process, classes and forms. Do not add the two paths together.
5. `billOfMaterials(elementId)` is the build cost. The lines sum to the element mu, so the build consumes that weight and no other.
6. `reclaimTarget(id)` is the DEC-028 endpoint the ledger can actually book. `dec028` is the Owner's word for it; `ledgerClass` is the class the current ledger rows reach. Where those differ, the record carries a disagreement id. Do not invent a transform the ledger refuses.
7. `exemption` (DEC-028.3) is recorded and `implemented` is false. Items in an active, claimed or enclosed structure are exempt. The consumer applies that rule. This package does not.

Ore classes (`fe_ore`, `cu_ore`, `ag_ore`, `au_ore`, `pt_ore`) appear as world-gen veins and as the ore items that already exist. No yield, collapse, decay, combustion, erosion or reclamation row creates an ore class from something else. A same-class form change (an ore object becoming an ore item of equal mu) is the ledger `mine` row.

## Status words

`SOURCED` cites a catalogue field or a line of code. `PM_DEFAULT` is a design default from SIM.40.01 or SIM.40.05. `PM_DEFAULT_UNCONFIRMED` depends on the unconfirmed mu size, or on the assumption that a catalogue `weight` is kilograms. `OWNER_OPEN` is null on purpose (calendar scale, water per slice, vein grade). `PLACEHOLDER` is a stand-in density or a reserved id with no mass.

## Open points

The lane report lists them with options. Short form: mu size; D-1 calendar (dpy and tick rate stay null); how 7 du sit on 5 slices; vein grade for strata ids 38-47; the unpublished unit of catalogue `weight`; salvage fraction (registry 0.8 and Lane Q's 75 percent are both unused; salvage returns the whole mass); clay gather versus quarry; the PM-default bills for `bridge` and `well`; raw item masses that the catalogue does not weigh.
