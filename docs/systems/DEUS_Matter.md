# DEUS Matter

> **Design superseded, Owner 2026-10-02 22:35 CT:** [D-2026-10-02-20](../DECISIONS.md) replaces the full mass-ledger design with `weight_lb` on every block/item (SRD value or labeled estimate), 1:1 mining/building/collapse and one fixture comparing total weight before/after. No separate world ledger. Digging/building implementation waits until worldgen is green; reclaim/regrowth come later as decay using the same weights. Existing-code descriptions below are historical/reference material, not an instruction to extend the ledger or evidence that the new rule is implemented.

## Purpose and status

NAT.02.MASS part 1, lane-dn, 2026-10-01: shared mass units and geometry for
natural-world matter and water (DEC-038/040). `game/js/sim/units.js` is a pure
CommonJS module; it neither reads a catalogue nor mutates world or ledger state.
It is foundational code awaiting independent Grok review and integration.
The shared MASS leaf remains open for the subsequent parts.

## Ledger reservoir vocabulary (NAT.02.MASS lane-dp, 2026-10-02)

`game/js/sim/ledger_defaults.js` records all balances in integer cp. A form
names where a class's matter resides. `holding` belongs only to `water` and
`lava`: it is displaced fluid retained by its authority until it can return
to a fluid cell. It is distinct from solid debris. There is no `held` solid
parcel form in this vocabulary (DEC-083 item 2).

| Class | Forms added | Accounted moves |
|---|---|---|
| `water` | `holding`, `return`, `pore` | `displace` fluid to holding; `restore` holding to fluid; `exit` fluid or holding to return; `rain` return to fluid; `infiltrate` fluid to pore; `seep` pore to fluid; `release` pore to holding. |
| `lava` | `holding`, `magma`, `core` | `tap` core to magma; `vent` magma to fluid; `engulf` fluid to magma; `displace` fluid to holding; `restore` holding to fluid. |

These are transfers within the `water` or `mineral` family. `exit` does not
delete water, and `rain` does not create it. `solidify` already transfers lava
fluid to stone strata within `mineral`; quench uses that row. `normalize` in
`ledger.js` rejects a row that crosses families or duplicates a move.

The wrapped world has no `world-edge` source or sink. The former `rain` source
and `evaporation` sink are removed. The only declared source and sink names are
`magic`, `debug-explicit`, and `legacy-levels-write`, all marked
`ownerConfirmed: false` with their authority stated in the defaults. `magic`
keeps DEC-018's open question visible; `debug-explicit` supports deliberate
test injections; `legacy-levels-write` is a transitional escape hatch for
frozen Levels writers, scoped to stone, rubble, soil, sediment, wood, water,
and lava in the strata or fluid forms, and slated for retirement by lane-dy.
No source can emit ore or a finite family without an explicit finite override.
Only these declared sink names may reach a conserved family.

These definitions are headless simulation data. No plugin loads them in this
lane; the fluid, water, and lava runtime authorities are future consumers.

## Units

Authoritative mass is a **nonnegative safe-integer JavaScript Number in
centipounds**, from 0 through `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991).
One cp is 0.01 lb. BigInt is used for exact intermediate calculations, then
checked before returning Number values. There are no mass quanta or cp-per-du
ratios. Callers must never round a derived display volume back into stored mass.

```js
const units = require("./units"); // from another game/js/sim module
```

The exported object and `WORLD_BOUND` are frozen.

| Constant | Value | Meaning |
|---|---:|---|
| `CP_PER_LB` | 100 | Centipounds per pound |
| `CELL_FT` | 5 | Horizontal cell edge in feet |
| `STRATUM_FT` | 2 | Vertical stratum height in feet |
| `STRATA_PER_Z` | 5 | Strata per Z layer; a Z cell is 10 ft tall |
| `STRATUM_FT3` | 50 | Derived: `CELL_FT * CELL_FT * STRATUM_FT` |
| `WATER_CP_PER_FT3` | 6,240 | Canonical water density |
| `WATER_CP_PER_STRATUM` | 312,000 | Derived: density times stratum volume |
| `WATER_CP_PER_Z_CELL` | 1,560,000 | Derived: five full water strata |
| `CP_PER_GALLON` | 834 | Display conversion only (DEC-038 item 3) |

The geometry agrees with `UF.Space` in `DEUS_World.js`; this lane adds a
cross-check, without replacing the existing engine definition. A full water
stratum displays as `312000 / 834` gallons (about 374.1007), while its stored
mass remains exactly 312000 cp.

### Public conversion API

`kgToCp(kg)` and `gToCp(g)` return integer cp, using the exact definition
`1 lb = 0.45359237 kg` and rounding **half up** exactly once per converted row:

- kg ratio: `kg * 10000000000 / 45359237`.
- g ratio: `g * 10000000 / 45359237`.
- Integer quotient plus one when twice the remainder is at least the divisor.

Inputs are nonnegative finite Numbers or plain decimal strings matching
`digits[.digits]`. Strings preserve decimal precision and must not contain
whitespace, signs, separators or scientific notation. Number inputs use their
shortest decimal spelling, including exponent notation; they cannot recover
precision already lost by the caller. Use strings for exact catalogue decimals.
BigInt, booleans, null, arrays, objects and malformed strings throw `TypeError`.
Negative/nonfinite Numbers or a rounded output outside the cp range throw
`RangeError`. There is no silent saturation, truncation or clamping.

| Source | Output cp |
|---|---:|
| granite: 3,894 kg | 858,480 |
| stone: 3,256 kg | 717,825 |
| basalt: 4,106 kg | 905,218 |
| bar_iron: 4,000 g | 882 |
| Exact half cp: `kgToCp("0.00226796185")` | 1 |
| Exact half cp: `gToCp("2.26796185")` | 1 |

Convert each catalogue row once in the later importer. Splitting an existing
mass uses `apportion`; recalculating each fragment from kg can change the total.

### Public integer arithmetic API

| Function | Contract |
|---|---|
| `addCp(a, b)` | Sum two cp balances; throw on overflow. |
| `subCp(a, b)` | Subtract b from a; throw on underflow. Negative balances/deltas are not accepted. |
| `mulCp(a, b)` | Multiply cp by a nonnegative integer count/scale; throw on overflow. Fractional scales are not accepted. |
| `apportion(totalCp, weights)` | New Number array of cp shares in the same order as weights. Exact largest-remainder allocation. |

All numeric inputs above must be nonnegative safe-integer Numbers, otherwise
`RangeError`. Products, sums and quotients use BigInt before returning safe
Number values, so a large intermediate product or sum of weights may exceed the
Number safe range without losing precision. Operations have no side effects.

For `apportion`, weights must be a dense array of nonnegative safe integers;
a non-array throws `TypeError`. Floor each exact proportional share, then award
one cp to each largest remainder until all cp is assigned. Equal remainders
favour lower input indices. Callers must supply recipients in a stable order
(for example sorted persistent IDs); this function does not sort recipients
by identity. Inputs are never mutated. Zero weights receive zero mass.
Zero total returns an all-zero array, or `[]` for empty weights. Positive total
with empty or all-zero weights throws `RangeError`.
Examples: `apportion(10, [1,1,1])` returns `[4,3,3]`,
`apportion(7, [0,2,1])` returns `[0,5,2]`.
Cost is O(n log n) time and O(n) temporary storage for n recipients; no world
scan, tick handler or RNG is involved.

### WORLD_BOUND self-check

`WORLD_BOUND = {cellsX: 768, cellsY: 768, zLevels: 32}` names the Natural World
v1 envelope from DEC-038 item 7, with five strata per cell (94,371,840 strata).
It is a checking envelope, not a permanent engine limit or generated inventory.

`checkWorldBound(maxCpPerStratum, extraReservoirCp = 0)` validates both arguments
as nonnegative safe integers and computes, using BigInt:

```text
768 * 768 * 32 * STRATA_PER_Z * maxCpPerStratum + extraReservoirCp
```

It returns the bound as a Number, or throws `RangeError` if it exceeds the safe
cp range. Importers must supply their actual maximum material loading and
separate reservoir totals (including the core). This helper does not prove
that those inputs describe an actual world or enforce ledger conservation.
At module load, the self-check computes `WORLD_BOUND_WATER_CP` with all strata
filled with water: **29,444,014,080,000 cp**, within the safe range. This water
check alone is not proof of a complete material/core budget. A future larger
world requires a newly checked envelope.

## Events and save data

None. There are no emitted/listened events, mutable inventories, save keys or
schema changes. Returned cp Numbers are JSON-safe. Consumers own persistence,
legacy migrations, posting transactions and conservation checks; none are
implemented by this lane.

## Checks and game connection

Run `node tools/sim/test_units.js` and
`node tools/sim/test_units.js --mutation-sweep`.

| Check | Evidence supplied |
|---|---|
| `units_geometry_matches_space` | Executes the actual Space definition from World source and compares geometry/density; not an engine boot. |
| `kg_to_cp_rule` | Four pinned conversions, half-cp ties and neighbours, decimal precision, invalid input and overflow. |
| `apportion_exact` | Conservation, stable ties, zero weights, near-limit BigInt intermediates, invalid inputs and no input mutation. |
| `overflow_refused` | Each arithmetic guard, exact boundary results, invalid inputs. |
| `water_stratum_is_312000` | Exact density-derived stratum and Z-cell capacities. |
| `gallons_are_derived` | Display conversion and independence of physical capacity from the display constant. |
| `world_bound_safe` | Water envelope, caller material/reservoir bounds, exact maximum and overflow refusal. |

The sweep rewrites source in isolated VMs, checks each target occurs exactly
once, and requires assertion failures from every named killing check. Syntax,
loading or mutation-target errors do not count as kills. Any survivor or invalid
mutant exits 1. Production code has no mutation switches.

**CONSUMED BY GAME SYSTEMS (planned):** importer work in lanes do, ea and ed
depends on this table per the lane brief. The ultimate visible
consumers are `DEUS_Fluid` (finite filling/draining) and structural collapse
(mass-bearing rubble). Wrong units would create or erase water/rubble weight.
These consumers do not import this module in this lane; consumer integration
tests and the RMMZ bridge are deferred to those authorized integrations.

**Player-facing status: NOT YET PLAYABLE.** Headless results and exact tested
SHA are in `tasks/NAT.02.MASS/lane-dn/REPORT.md` and its evidence folder.
RMMZ F5/F8, screenshot evidence and consumer save/load are not checked here;
the lane brief requires no F5 evidence. No art is touched.
