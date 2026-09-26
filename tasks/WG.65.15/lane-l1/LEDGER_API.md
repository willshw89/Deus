# WG.65.15 mass ledger: API, tables and hook-up notes

| | |
|---|---|
| Task | WG.65.15 (Closed-Loop Geomass & Resource Verifier, `docs/worldgen/DEUS_WORLDGEN_WBS.md:254`), widened to a per-material-class conserved-total ledger (SIM.50.01 audit §6 step 2; PM directive 0035-AJ §2(d)) |
| Lane | lane-l1, writer Claude; independent review by Grok (not yet run). Nothing here is self-certified. |
| Base | `origin/main` `9cba41eaf6378048d50004dcf243defbfe7f17f4` (every `file:line` below is at this commit) |
| Files | `game/js/sim/ledger.js` (the module), `game/js/sim/ledger_defaults.js` (default tables, data only), `tools/sim/test_ledger.js`, `tools/sim/test_ledger_longrun.js`, `tools/sim/fixtures/ledger/longrun_expected.json` |
| Gameplay files changed | none |

## 1. What it is

A host-agnostic simulation module that keeps integer totals of matter per **material class** and per **form**, and lets them change after world registration only through:

1. a **transform** that the data table allows (the amount is kept; the element or family is kept; the output is never an ore class);
2. a **recipe** with fixed integer proportions balanced per family (only electrum alloying and parting by default);
3. a **named source or sink** from a data-driven list, logged with its cause.

It also compares its totals with an independent recount supplied by the caller (`audit`, `assertBalanced`). It keeps a per-interval identity (delta of total = sources − sinks) and a bounded log. It has a JSON-safe `snapshot`/`restore` and a deterministic `checksum`.

It is the ledger that audit finding F-04 says is missing (`docs/audits/LIVING_WORLD_GAP_AUDIT.md:52`, §2.6). It does **not** hook into any gameplay writer yet; §9 describes how a later package does that.

### 1.1 Where it lives and how it loads

- The module is a CommonJS subset, per ADR-003 Rev 3 §2.5 (PROPOSED, `docs/adr/ADR-003_sim_render_split_and_lod.md:360-369`). It exports with `module.exports = …`, and its only `require` is `require("./ledger_defaults")`.
- It names none of the ADR §2.3 forbidden identifiers (`:318-327`). It reads no clock, draws no random number, and uses only the exact `Math` functions of §10.4 (`imul`, `floor`). `tools/sim/test_ledger.js` checks this statically, and it runs every unit check with the module loaded in a bare `vm` context: ECMAScript built-ins only, `Math.random` throwing, `Date` and `console` deleted.
- **Kernel move.** ADR-003 §2.4 sketches the eventual home as `game/js/sim/kernel/ledger.js` (`:339`). SIM.00.02 owns that layout. The two files have no dependency outside themselves, so the move is a rename: `ledger.js` and `ledger_defaults.js` go together, and the tests' `SIM` path changes.
- In node: `const { createLedger } = require("./game/js/sim/ledger.js")`. In NW.js, the future `DEUS_SimHost.js` loader (ADR §2.5) loads it. No plugin loads it today.

## 2. Model

| Axis | Meaning | Default values |
|---|---|---|
| **Class** | a material class: what the matter is | 27 classes (§8) |
| **Form** | where the matter is | `strata` (in place in a cell's slices, natural or deposited), `item` (loose items), `object` (placed objects and structures, including constructed `0x80` strata, `DEUS_Levels.js:995`), `ruin` (a failed structure before it breaks into rubble), `fluid`, `ice`, `creature` (held in creatures) |
| **Family** | the conserved total, ADR-003 §7.8 Q-MASS[family] (`:937`) | `mineral`, `organic`, `water`, `fe`, `cu`, `ag`, `au`, `pt`, `gem` |

- An amount is kept for every declared `(class, form)` pair, 68 pairs by default.
- A class belongs to one family. The one exception is an alloy, which has an integer composition.
  - `electrum` is `{ au: 1, ag: 1 }`: every 2 units of electrum are 1 unit of gold and 1 unit of silver ("a 50/50 alloy of Gold and Silver. Its mass is conserved against the gold and silver ledgers", `game/data/DEUS_ResourceRegistry.json:471`).
  - A composite amount must be a multiple of its composition's sum (`E_MULTIPLE`).
- `steel` belongs to `fe`: "Counts toward global iron conservation balance" (`DEUS_ResourceRegistry.json:453`).
- **Family totals** are what LIFE-001 conserves (`docs/RISK_REGISTER.md:60`). A family total is the sum over its classes and forms, and an alloy counts its share.
- **Finite families** (`fe`, `cu`, `ag`, `au`, `pt`, `gem`) can be added to only by a source whose row says `allowFinite`. No default source does. So in the default configuration a finite family total can only stay the same or fall, and it falls only by a named sink.
  - This is the WBS row's "finite metals (Fe, Cu, Ag, Au, Pt) never regenerate" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:254`) and V83's "Finite stone, ore, gems and fossil beds ... do not respawn" (`docs/VISION.md:94`).
- **Ore classes** (`fe_ore`, `cu_ore`, `ag_ore`, `au_ore`, `pt_ore`) carry `ore: true`.
  - No transform row, recipe or source may output one. The ledger checks this when the config loads and again on every call.
  - An ore amount can only change form (`mine`: strata or outcrop object to item) or decrease (`smelt` to metal, or a named sink).
- **Units.** An amount is an integer count of a unit. The ledger never converts units. `mu` is a mass unit whose size per material and per 2-ft slice is not set yet (ADR-003 §7.8: "one table per material and form, set by SIM.40.01 with WG.65.15"; Owner/PM question Q2 in the REPORT). `du` is the fluid depth unit, 1/7 of a full cell (`DEUS_Fluid.js:50`). Families never mix, so `water` in `du` and `mineral` in `mu` never meet in one sum.

## 3. The five Owner rules and where each is enforced

| Rule (brief) | Enforced by | Tests |
|---|---|---|
| 1. Matter is conserved (LIFE-001). After seal, totals change only by transforms or named sources and sinks | `seal()` closes registration (`E_SEALED`); `transform`, `recipe`, `source` and `sink` need a seal (`E_NOT_SEALED`); every change goes through one validate-then-commit writer, so a refused call leaves no trace; closure `family = sealed + sources − sinks` and the interval identity are checked by `check()`, `audit()` and `restore()` | `seal_enforced`, `transform_conserves_totals`, `transform_insufficient_is_atomic`, `interval_identity_and_close`, `restore_rejects_tampering`; long run |
| 2. Decay chain object → ruin → rubble → soil/sediment → rock; skipping or reversing only where the table says so | the default transform table (§8); any unlisted move is `E_NO_ENTRY` | `defaults_decay_chain_rows`, `decay_chain_conserves_mass`, `decay_chain_skip_and_reverse_refused` |
| 3. Metals rust to mineral traces with the element kept; electrum is conserved against gold and silver | per-element classes `fe_trace`, `cu_trace`, `ag_trace`; every transform row must keep the class composition (`E_FAMILY`, at load and at call); recipes must balance per family (`E_FAMILY` at load) | `rust_keeps_element`, `defaults_rust_rows_keep_element`, `config_rejects_cross_element_row`, `transform_element_change_refused_at_call`, `electrum_recipe_conserves_gold_and_silver`, `config_rejects_unbalanced_recipe` |
| 4. No ore respawn: nothing outputs an ore class, at load and at call | `E_ORE_OUTPUT` for a transform row whose output is an ore class (unless it only changes form), a recipe output, or an explicit source list. The same check runs again in `transform` and `source`; a source's `"*"` never includes ore | `config_rejects_ore_output_row`, `config_rejects_ore_output_recipe`, `config_rejects_ore_source_list`, `transform_ore_output_refused_at_call`, `source_ore_refused_at_call`, `ore_moves_form_and_only_decreases`; long-run faults `ore_created`, `ore_via_ledger` |
| 5. Conjured matter: a named `magic` source and sink, data-driven, **not confirmed by the Owner** | `sources.magic` and `sinks.magic` are rows in `ledger_defaults.js` with `ownerConfirmed: false` and an authority string citing DEC-018's open sub-question (`docs/OWNER_DECISIONS.md:262`); `unconfirmed()` lists them. Removing or narrowing the rows changes behaviour with no code change | `defaults_magic_flagged_unconfirmed`, `magic_source_and_sink_logged_with_cause`, `config_sources_are_data_driven` |

## 4. API

`createLedger(config?)` returns a frozen object with the methods below. `config` defaults to `ledger_defaults.js`. `defaultConfig()` returns a mutable deep copy to edit. The config is validated and copied at load; later changes to the caller's object have no effect (`config_is_copied_at_load`). Every error is an `Error` with `name === "LedgerError"` and a `code`; its message names the class or row and, for calls, the cause.

### 4.1 World setup

| Call | Does | Errors |
|---|---|---|
| `register(cls, form, amount, cause?)` | adds `amount` to `(cls, form)` during world setup. Ore may be registered here: world generation is the only place ore comes from. `cause` defaults to `"register"` | `E_SEALED`, `E_UNKNOWN_CLASS`, `E_UNKNOWN_FORM`, `E_AMOUNT`, `E_MULTIPLE`, `E_CAUSE`, `E_OVERFLOW` |
| `seal()` | ends registration. Records each family's sealed total and opens interval 1 | `E_SEALED` (twice) |
| `isSealed()` | boolean | |

### 4.2 Changing totals (after `seal()` only)

| Call | Does | Errors (in the order checked) |
|---|---|---|
| `transform(fromCls, fromForm, toCls, toForm, amount, cause)` | moves `amount` from one `(class, form)` to another. The pair must be a row of the transform table | `E_NOT_SEALED`, `E_CAUSE`, `E_UNKNOWN_CLASS`/`E_UNKNOWN_FORM`, `E_AMOUNT`, `E_MULTIPLE`, **`E_ORE_OUTPUT`** (output is an ore class other than the input's), **`E_FAMILY`** (the element or family would change), `E_NO_ENTRY` (no row), `E_INSUFFICIENT`, `E_OVERFLOW` |
| `recipe(id, times, cause)` | applies a recipe `times` times, all inputs and outputs at once | `E_NOT_SEALED`, `E_CAUSE`, `E_NO_ENTRY`, `E_AMOUNT`, `E_OVERFLOW`, `E_INSUFFICIENT` |
| `source(name, cls, form, amount, cause)` | adds matter through a declared source | `E_NOT_SEALED`, `E_CAUSE`, **`E_UNKNOWN_SOURCE`**, `E_UNKNOWN_CLASS`/`E_UNKNOWN_FORM`, `E_AMOUNT`, `E_MULTIPLE`, **`E_ORE_OUTPUT`**, `E_FINITE_SOURCE`, `E_SOURCE_SCOPE`, `E_OVERFLOW` |
| `sink(name, cls, form, amount, cause)` | removes matter through a declared sink (ore may leave) | `E_NOT_SEALED`, `E_CAUSE`, **`E_UNKNOWN_SINK`**, `E_UNKNOWN_CLASS`/`E_UNKNOWN_FORM`, `E_AMOUNT`, `E_MULTIPLE`, `E_SINK_SCOPE`, `E_INSUFFICIENT` |

- **Amounts.** An amount is a non-negative safe integer (`Number.isSafeInteger(n) && n >= 0`). Floats, NaN, ±Infinity, negatives, strings, BigInt, `null` and `undefined` are refused with `E_AMOUNT`. Zero is allowed and is logged. A result above `Number.MAX_SAFE_INTEGER`, whether on a `(class, form)` key, a family total or a flow counter, is refused with `E_OVERFLOW`.
- **Causes.** A cause is a string of 1 to 200 characters, for example `"fire:burnout"` or `"spell:wall_of_stone#7"`. It is stored in the log only; it does not key any summary (§4.4).
- **Atomicity.** Every change and counter is validated before anything is written. A refused call changes nothing, not even the sequence number (`transform_insufficient_is_atomic`, mutant `refused_call_leaves_trace`).

### 4.3 Reading and checking

| Call | Returns |
|---|---|
| `total(cls)`, `amount(cls, form)`, `familyTotal(family)` | integers |
| `totals()` | `{ classes: {cls: n}, forms: {cls: {form: n}}, families: {family: n} }`, fresh objects in sorted key order |
| `audit(recount)` | compares with an independent recount and returns a structured diff (never throws on a mismatch). `recount` is `{ cls: { form: n } }` (form level) or `{ cls: n }` (class level), per class. A missing class or form counts as 0. Result: `{ ok, checked, diffs: [{cls, form, expected, actual, delta, note?}], families: [{family, expected, actual, delta}], unknown: [keys], closure: [...], interval: [...] }`. A malformed recount value throws `E_AMOUNT` or `E_RECOUNT` |
| `assertBalanced(recount?)` | `audit(recount)`, but throws `E_UNBALANCED` (listing up to 12 mismatches) unless `ok`. With no recount it checks only the ledger's own closure and interval identity |
| `check()` | `{ ok, closure, interval }`: the internal checks alone |
| `interval()` | the open interval: for each family `{start, end, sources, sinks, ok}` with `end − start = sources − sinks`; for each class also `transfersIn` and `transfersOut`, with `end − start = sources − sinks + in − out`; plus `events` and the interval summary |
| `closeInterval()` | the same report, then opens the next interval (index + 1, counters and summary reset) |
| `events()` | the log ring, oldest first: `{seq, kind, ref, from, to, amount, cause}`, where `kind` is register, transform, recipe, source or sink; `ref` is the row id, recipe id or source/sink name; `from` and `to` are `"class\|form"` or `""` |
| `unconfirmed()` | the source and sink rows with `ownerConfirmed: false` and their authority text |
| `describe()` | a deep copy of the normalized tables (used by the tests and by `gen_ledger_tables.js`) |
| `snapshot()` / `restore(snapshot)` | see §5 |
| `checksum()` | 8 hex digits: 32-bit FNV-1a over the canonical JSON (keys sorted) of `snapshot()` (ADR-003 §10.6, `:1137`) |

### 4.4 Bounded memory

- The log is a ring of `logLimit` entries (default 256).
- The interval summary is keyed by `kind:ref:from>to`, so its size is bounded by the table size, not by the number of causes.
- Lifetime flows are kept per `name|class`.

Nothing in the ledger grows with the number of calls. `log_is_bounded` checks this with 2,000 calls against a 16-entry ring, and the mutant `log_unbounded` is killed.

## 5. Snapshot, restore, checksum

- `snapshot()` returns plain JSON data:
  - `{ schema: 1, config: <fingerprint>, sealed, seq, amounts: {"class|form": n} (all 68 keys), base: {family: n} | null, life: { src: {"name|class": n}, snk: {...} }, interval: {index, startFam, startCls, src, snk, tin, tout, events, summary} | null, log: [...] }`.
  - `config` is the FNV-1a fingerprint of the normalized tables, so a snapshot cannot be restored into a ledger with other tables.
- `restore(snapshot)` checks everything first and replaces the state only if all of it is valid, otherwise it throws `E_SNAPSHOT` and changes nothing. It checks:
  - schema and fingerprint;
  - exact key sets;
  - every number is a safe non-negative integer, and composite amounts are multiples;
  - no family overflows;
  - source and sink names and classes are declared;
  - the closure and the interval identity hold.

  20 tampering cases are tested, plus a snapshot from another config, including ones that keep every family total and so can only be seen by one specific check.
- `checksum()` does not depend on the order in which keys were inserted (`restore_ignores_key_order`). It does depend on which class holds which amount (`checksum_sees_which_class_holds_what`) and on every `(class, form)` amount (`checksum_sees_every_class`). The long run pins its final checksums in `tools/sim/fixtures/ledger/longrun_expected.json`.

## 6. Error codes

| Code | Meaning |
|---|---|
| `E_CONFIG` | malformed config: bad name, unknown class, family or form, duplicate move, self-move, composition not an integer, logLimit out of range |
| `E_ORE_OUTPUT` | a row, recipe or source would output an ore class (config load or call) |
| `E_FAMILY` | a transform row would change element or family, or a recipe is unbalanced |
| `E_FINITE_SOURCE` | a source would add to a finite family without `allowFinite` |
| `E_SOURCE_SCOPE` / `E_SINK_SCOPE` | the name exists but is not declared for this `(class, form)` |
| `E_UNKNOWN_SOURCE` / `E_UNKNOWN_SINK` | the name is not declared (inherited names such as `toString` are not names) |
| `E_UNKNOWN_CLASS` / `E_UNKNOWN_FORM` / `E_UNKNOWN_FAMILY` | lookups |
| `E_NO_ENTRY` | no transform row or recipe allows it |
| `E_AMOUNT`, `E_MULTIPLE`, `E_OVERFLOW`, `E_INSUFFICIENT`, `E_CAUSE` | amount, composition multiple, above `MAX_SAFE_INTEGER`, not enough held, bad cause |
| `E_SEALED`, `E_NOT_SEALED` | phase |
| `E_RECOUNT`, `E_UNBALANCED`, `E_SNAPSHOT` | audit input, audit failure, bad snapshot |

## 7. Choices in the default table that a reviewer or the PM may want to change

These rows are in the table on purpose; each is one line of data.

- **Skips the ruin stage.** `break`: `stone` object, ruin or strata → `rubble` strata. It covers a sudden collapse, blast debris and mining spoil (ADR-003 §7.8 "stratum → rubble (collapse, §16)"; Lane Q §9.2 rows 6-7). The slow decay path goes through `decay` (object → ruin) first.
- **Goes back up the chain.**
  - `build`: `rubble` item → `stone` object (rubble-stone masonry, Lane Q §9.2 row 10).
  - `salvage`: ruin → item.
  - `pedogenesis`: `sediment` → `soil` (the reverse of `erode`).
  - `lithify` is the only way back to `stone` strata. `rubble` → `stone` strata (a skip) is **not** in the table (`decay_chain_skip_and_reverse_refused`).
- **Fire keeps all its mass.**
  - `burn` turns `wood` and `biomass` into `ash` and `charcoal` in the same `organic` family. No gas leaves.
  - Lane R's design sends most burned mass to an `AIR` sink ("fire.outgas") and Lane Q adopts it. The brief's default list has no such sink, so none is declared here. See the REPORT, Q5.
- **Rot keeps all its mass.** `rot` and `remains` turn organics into `humus` with no outgassing, for the same reason.
- **Metal traces for iron, copper and silver only.** Gold and platinum have no `rust` row (Lane R R-03.6: noble metals never corrode). Electrum has no rust row either.
- **Soil is mineral; humus is organic.** Lane Q's `soil` mixes both at 950/50 per mille. Here they are two classes, so no transform ever has to cross families.
- **World-edge source.** It may add any non-ore, non-finite class (river sediment, water, migrating creatures). Traders bringing metal in from off the map would need `allowFinite` (REPORT, Q4).
- **Debug source.** `debug-explicit` may add any non-ore, non-finite class. Tests that need a finite source build their own config with `allowFinite` (`config_finite_source_needs_flag`).

## 8. Default tables

The section below is generated from `createLedger().describe()`. `node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --check` exits 1 if it no longer matches the code.

<!-- BEGIN GENERATED TABLES: node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --write -->

### Families (Q-MASS[family])

| Family | Unit | Finite | Classes |
|---|---|---|---|
| `ag` | mu | yes | `ag_metal`, `ag_ore`, `ag_trace`, `electrum` |
| `au` | mu | yes | `au_metal`, `au_ore`, `electrum` |
| `cu` | mu | yes | `cu_metal`, `cu_ore`, `cu_trace` |
| `fe` | mu | yes | `fe_metal`, `fe_ore`, `fe_trace`, `steel` |
| `gem` | mu | yes | `gem` |
| `mineral` | mu | no | `lava`, `rubble`, `sediment`, `soil`, `stone` |
| `organic` | mu | no | `ash`, `biomass`, `charcoal`, `humus`, `wood` |
| `pt` | mu | yes | `pt_metal`, `pt_ore` |
| `water` | du | no | `water` |

### Classes and their forms

| Class | Family (composition) | Forms | Ore |
|---|---|---|---|
| `ag_metal` | ag | item, object, ruin |  |
| `ag_ore` | ag | item, object, strata | **ore** |
| `ag_trace` | ag | strata |  |
| `ash` | organic | item, strata |  |
| `au_metal` | au | item, object, ruin |  |
| `au_ore` | au | item, object, strata | **ore** |
| `biomass` | organic | creature, item, object |  |
| `charcoal` | organic | item, strata |  |
| `cu_metal` | cu | item, object, ruin |  |
| `cu_ore` | cu | item, object, strata | **ore** |
| `cu_trace` | cu | strata |  |
| `electrum` | ag 1 + au 1 | item, object, ruin |  |
| `fe_metal` | fe | item, object, ruin |  |
| `fe_ore` | fe | item, object, strata | **ore** |
| `fe_trace` | fe | strata |  |
| `gem` | gem | item, object, strata |  |
| `humus` | organic | strata |  |
| `lava` | mineral | fluid |  |
| `pt_metal` | pt | item, object, ruin |  |
| `pt_ore` | pt | item, object, strata | **ore** |
| `rubble` | mineral | item, strata |  |
| `sediment` | mineral | strata |  |
| `soil` | mineral | item, strata |  |
| `steel` | fe | item, object, ruin |  |
| `stone` | mineral | item, object, ruin, strata |  |
| `water` | water | creature, fluid, ice, item |  |
| `wood` | organic | item, object, ruin, strata |  |

### Transform table (119 allowed moves)

One line per process and class pair; every listed from-form may go to every listed to-form. Anything not listed is refused with `E_NO_ENTRY`.

| Process | From class | From forms | To class | To forms |
|---|---|---|---|---|
| solidify | `lava` | fluid | `stone` | strata |
| build | `rubble` | item | `stone` | object |
| dump | `rubble` | item | `rubble` | strata |
| pick | `rubble` | strata | `rubble` | item |
| weather | `rubble` | strata | `sediment` | strata |
| weather | `rubble` | strata | `soil` | strata |
| lithify | `sediment` | strata | `stone` | strata |
| pedogenesis | `sediment` | strata | `soil` | strata |
| dig | `soil` | strata | `soil` | item |
| erode | `soil` | strata | `sediment` | strata |
| fill | `soil` | item | `soil` | strata |
| break | `stone` | object, ruin, strata | `rubble` | strata |
| build | `stone` | item | `stone` | object |
| decay | `stone` | object | `stone` | ruin |
| quarry | `stone` | strata | `stone` | item |
| salvage | `stone` | object, ruin | `stone` | item |
| build | `ag_metal` | item | `ag_metal` | object |
| decay | `ag_metal` | object | `ag_metal` | ruin |
| rust | `ag_metal` | item, object, ruin | `ag_trace` | strata |
| salvage | `ag_metal` | object, ruin | `ag_metal` | item |
| mine | `ag_ore` | object, strata | `ag_ore` | item |
| smelt | `ag_ore` | item | `ag_metal` | item |
| build | `electrum` | item | `electrum` | object |
| decay | `electrum` | object | `electrum` | ruin |
| salvage | `electrum` | object, ruin | `electrum` | item |
| build | `au_metal` | item | `au_metal` | object |
| decay | `au_metal` | object | `au_metal` | ruin |
| salvage | `au_metal` | object, ruin | `au_metal` | item |
| mine | `au_ore` | object, strata | `au_ore` | item |
| smelt | `au_ore` | item | `au_metal` | item |
| build | `cu_metal` | item | `cu_metal` | object |
| decay | `cu_metal` | object | `cu_metal` | ruin |
| rust | `cu_metal` | item, object, ruin | `cu_trace` | strata |
| salvage | `cu_metal` | object, ruin | `cu_metal` | item |
| mine | `cu_ore` | object, strata | `cu_ore` | item |
| smelt | `cu_ore` | item | `cu_metal` | item |
| build | `fe_metal` | item | `fe_metal` | object |
| decay | `fe_metal` | object | `fe_metal` | ruin |
| forge | `fe_metal` | item | `steel` | item |
| rust | `fe_metal` | item, object, ruin | `fe_trace` | strata |
| salvage | `fe_metal` | object, ruin | `fe_metal` | item |
| mine | `fe_ore` | object, strata | `fe_ore` | item |
| smelt | `fe_ore` | item | `fe_metal` | item |
| build | `steel` | item | `steel` | object |
| decay | `steel` | object | `steel` | ruin |
| remelt | `steel` | item | `fe_metal` | item |
| rust | `steel` | item, object, ruin | `fe_trace` | strata |
| salvage | `steel` | object, ruin | `steel` | item |
| mine | `gem` | strata | `gem` | item |
| set | `gem` | item | `gem` | object |
| unset | `gem` | object | `gem` | item |
| weather | `ash` | strata | `humus` | strata |
| burn | `biomass` | item, object | `ash` | strata |
| burn | `biomass` | item, object | `charcoal` | strata |
| butcher | `biomass` | creature | `biomass` | item |
| eat | `biomass` | item | `biomass` | creature |
| fell | `biomass` | object | `wood` | item |
| harvest | `biomass` | object | `biomass` | item |
| litter | `biomass` | object | `humus` | strata |
| remains | `biomass` | creature | `humus` | strata |
| rot | `biomass` | item | `humus` | strata |
| burn | `charcoal` | item, strata | `ash` | strata |
| weather | `charcoal` | strata | `humus` | strata |
| grow | `humus` | strata | `biomass` | object |
| build | `wood` | item | `wood` | object |
| burn | `wood` | item, object, ruin, strata | `ash` | strata |
| burn | `wood` | item, object, ruin, strata | `charcoal` | strata |
| chop | `wood` | strata | `wood` | item |
| decay | `wood` | object | `wood` | ruin |
| kiln | `wood` | item | `charcoal` | item |
| rot | `wood` | item, ruin, strata | `humus` | strata |
| salvage | `wood` | object, ruin | `wood` | item |
| build | `pt_metal` | item | `pt_metal` | object |
| decay | `pt_metal` | object | `pt_metal` | ruin |
| salvage | `pt_metal` | object, ruin | `pt_metal` | item |
| mine | `pt_ore` | object, strata | `pt_ore` | item |
| smelt | `pt_ore` | item | `pt_metal` | item |
| drink | `water` | fluid, item | `water` | creature |
| excrete | `water` | creature | `water` | fluid |
| fill | `water` | fluid | `water` | item |
| freeze | `water` | fluid | `water` | ice |
| pour | `water` | item | `water` | fluid |
| thaw | `water` | ice | `water` | fluid |

### Recipes

| Recipe | Inputs (per time) | Outputs (per time) |
|---|---|---|
| `alloy.electrum` | 1 `au_metal\|item` + 1 `ag_metal\|item` | 2 `electrum\|item` |
| `part.electrum` | 2 `electrum\|item` | 1 `au_metal\|item` + 1 `ag_metal\|item` |

### Named sources and sinks

| Kind | Name | May touch | allowFinite | Owner-confirmed | Authority |
|---|---|---|---|---|---|
| source | `debug-explicit` | every class and form except ore and finite classes (26 pairs) | no | **no** | PM brief WG.65.15 default: an explicit debug or test command, logged with its cause |
| source | `magic` | every class and form except ore and finite classes (26 pairs) | no | **no** | PM default for DEC-018's open sub-question (docs/OWNER_DECISIONS.md:262); NOT confirmed by the Owner |
| source | `rain` | `water\|fluid` | no | **no** | ADR-003 §7.8-§7.9 (PROPOSED): rain is the example of a named water source |
| source | `world-edge` | every class and form except ore and finite classes (26 pairs) | no | **no** | PM brief WG.65.15 default: matter entering across the world edge (inflow, migration) |
| sink | `debug-explicit` | every class and form, ore and finite included (68 pairs) | n/a | **no** | PM brief WG.65.15 default: an explicit debug or test command, logged with its cause |
| sink | `evaporation` | `water\|fluid` | n/a | **no** | ADR-003 §7.8-§7.9 (PROPOSED): evaporation is the example of a named water sink |
| sink | `magic` | every class and form, ore and finite included (68 pairs) | n/a | **no** | PM default for DEC-018's open sub-question (docs/OWNER_DECISIONS.md:262); NOT confirmed by the Owner |
| sink | `world-edge` | every class and form, ore and finite included (68 pairs) | n/a | **no** | PM brief WG.65.15 default: matter leaving across the world edge (outflow, emigration) |

Log ring size: 256 entries.

<!-- END GENERATED TABLES -->

## 9. Hooking it into the game (a later package; not done here)

No gameplay file is changed by this package. The later package (PROPOSED-L1-01 in the REPORT) would do the following.

### 9.1 The host side

- One ledger instance per world, created by the future `DEUS_SimHost.js` (ADR-003 §2.4) or, before that exists, by a thin legacy adapter plugin.
- At world generation the adapter registers the generated world. There are two ways to do this:
  - (a) walk the generated baselines once: strata per material and form, items, objects, fluid;
  - (b) have each generator register what it places.

  Then it seals. Legacy saves need a one-time registration on load, taken from the loaded state, before seal (compare Lane Q §3.5 row 15, "migration" sources).
- The adapter's `snapshot()` goes into the save beside `UF.World.state`. On load the adapter calls `restore()`, then `assertBalanced(recount)` once.
- Recount cadence (ADR-003 §7.9, `:972-973`):
  - **Test mode:** a full recount after every transition and every 100 ticks, with `assertBalanced`.
  - **Release:** a recount on save and once per game day, calling `audit`, logging any mismatch and never crashing.

### 9.2 Material mapping for the recount

| Engine state | Ledger `(class, form)` |
|---|---|
| strata material `M_STONE` (`DEUS_Levels.js:994`), not `0x80` | `stone`/strata (or the rock or ore class once WG.61 veins exist; Lane Q ids 38-47) |
| `M_SOIL` | `soil`/strata (plus `humus`/strata once soil carries an organic part) |
| `M_WOOD` (natural) | `wood`/strata |
| any solid with `M_BUILT` (`0x80`, `DEUS_Levels.js:995`) | `<class>`/object |
| `M_WATER` strata and `DEUS_Fluid` depth units | `water`/fluid, in du |
| `M_LAVA` and lava depth units | `lava`/fluid; du → mu by a fixed integer ratio (Lane Q §9.1) |
| `DEUS_Items` records (`Items.create` `DEUS_Items.js:291`, `Items.drop` `:325`, `Items.remove` `:681`) | `<class of item type>`/item, using a per-type mass table |
| `DEUS_Objects` placed objects (`setIn`, `DEUS_Objects.js:301`) | `<class>`/object; trees and plants are `biomass`/object; ore outcrops are `<m>_ore`/object |
| carried items, eaten food, body mass | `*`/creature (Owner/PM question Q3: in scope now?) |

Mass per stratum is the open question Q2. The legacy engine has 1-ft strata (`DEUS_Levels.js:985`); DEC-013 has 2-ft strata (`docs/OWNER_DECISIONS.md:181`).

### 9.3 Hooks and the audit F-04 leaks each one would catch

The pattern is the same everywhere. The writer that changes matter declares the move (`transform`, `source` or `sink`, with a cause). A listener compares what actually changed with what was declared, and the periodic recount catches everything else.

| Hook | Where | What it books | Leaks from audit F-04 / §2.4 / FIR-3 / LAND-1 it would catch |
|---|---|---|---|
| `levels:strataChanged` listener | emitted by the one strata writer `writeCell` (`DEUS_Levels.js:1537`) at `DEUS_Levels.js:1558` with `{ before, after, cause }` | per changed stratum: the material delta between `before` and `after` must equal the strata-form moves the writer declared for that `cause` in the same event; an undeclared delta is reported as a LEAK with the cell and cause | destroyed strata become air (`DEUS_Levels.js:1700-1702`, debris only a label at `:1721`); mining removes 4 strata for 2 stone (`DEUS_Jobs.js:458-459`, via `setShape` `DEUS_Levels.js:3014`); roof decks written from nothing (`DEUS_Floors.js:276`); `setStrata` writes with no input cost (`DEUS_Levels.js:1579`) |
| item writer wrap | `Items.create` / `Items.drop` / `Items.remove` (`DEUS_Items.js:291`, `:325`, `:681`) | an item appearing or vanishing must match a declared transform (for example strata → item for mining, item → object for building, item → ash/charcoal for fire) or a named source/sink | Dig drops a stone 1 time in 4 (`DEUS_Interact.js:53`, `:167`); fire deletes items (`DEUS_Fire.js:442`, FIR-3); the quarry pays 2 in, 4 out (`game/data/DEUS_WorldCatalog.json:2225`, `:2204`, `:2104`, LAND-1); mining yields fixed counts unrelated to volume (`DEUS_Jobs.js:459`) |
| object writer wrap | `setIn` (`DEUS_Objects.js:301`) | placing or removing an object must match a declared move. **An ore outcrop placed by anything but world generation is refused** (`E_ORE_OUTPUT`) | the ore sprouts (`DEUS_Ecology.js:736-740` table, placed at `:785`; F-03, LIFE-002); felled trees regrowing on a timer (`DEUS_Ecology.js:407`) show up as an undeclared biomass source; broken doors turning into their catalog ruin (`DEUS_Doors.js:444-445`) must book object → ruin |
| fluid | `DEUS_Fluid.diagnostics()` totals (`DEUS_Fluid.js:764`, `totalWaterVolume` at `:808`) as the fluid recount; `addFluid` callers | fluid moves are not ledger events (same class and form); fluid created or deleted must be a named source or sink (`rain`, `evaporation`, `world-edge`) or a transform (freeze, drink) | NaturalConnections creates water (`DEUS_NaturalConnections.js:312`, called at `:352-353`; ADR-003 §1.4); Fluid reconciliation drops excess (`DEUS_Fluid.js:896-923`; ADR-003 §1.4) |
| unit lifecycle | births and deaths (`factions:born`, `DEUS_Factions.js:594`; `world:unitRemoved`, `:619`) | a birth is food → body (`biomass` item → creature); a death leaves remains (creature → humus, or an item) | "births create adults from nothing" (F-04, audit §4.3), if the Owner puts creature matter in scope (Q3) |

The fault injections in `tools/sim/test_ledger_longrun.js` (`unreported_mutation`, `ore_created`, `ore_via_ledger`, `delete_one_unit`, `create_one_unit`, `fire_deletes_items`, `double_yield`) are small models of these leaks. The harness shows that its recount plus `assertBalanced` catches each one.

## 10. Alignment with the unreviewed sibling designs

Lane R: `origin/task/lane-r` `6613418f`, `tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md`, including §0.2 and "Matter ledger long-run test". Lane Q: `origin/task/lane-q` `9d5b40d3`, `tasks/SIM.40.01/lane-q/SIM.40.01_STRUCTURAL_SUPPORT.md` §2 and §9. Both are read with `git show` and are **unreviewed**. Nothing here edits them.

| Topic | Lane R | Lane Q | This ledger | Mismatch / note |
|---|---|---|---|---|
| Call shape | `T(FROM→TO, FAMILY, m, cause)`; `source/sink(q, n, cause)` | `ledger.transform(fromForm → toForm, family, kg, cause)` | `transform(fromCls, fromForm, toCls, toForm, amount, cause)`; `source/sink(name, cls, form, amount, cause)` | Both sibling calls map one to one: their (family, form) pair is a (class, form) pair here. A named source/sink carries an explicit `name` (Lane R and Lane Q fold it into the cause) |
| Unit | 1 mu = 1/16 lb (assumed) | kg (Lane Q's table); proposes 1 g | integer `mu`, size unset; water in `du` | unresolved across three lanes (Lane Q `escalation.md`); REPORT Q2 |
| Families | STONE, EARTH, ORGANIC, BONE, FE, CU (Cu, Sn, Zn), PB, AG, AU, PT, SPECIAL, GLASS, WATER | mineral, organic, metal:<element>, water | mineral, organic, water, fe, cu, ag, au, pt, gem | Families are data. Missing here: BONE, PB, Sn, Zn, SPECIAL (mithral, adamantine), GLASS. Each is one row. Added here: `gem` (V83) |
| Forms | NATURAL, BUILT, RUBBLE, SCRAP, FINES, SEDIMENT, SOIL-MIN, SOIL-ORG, SOIL-CARBON, ITEM, ITEM-BURIED, REMAINS, ASH, CHARCOAL, OXIDE, ROCK-SED, BIOMASS, BODY | STRATUM_NATURAL, STRATUM_BUILT, LOOSE, ITEM, OBJECT, FLUID, HELD, BODY | classes: stone, rubble, soil, sediment, humus, ash, charcoal, `<m>_trace`, biomass, …; forms: strata, item, object, ruin, fluid, ice, creature | Lane R's RUBBLE, SEDIMENT, SOIL-MIN, SOIL-ORG, ASH, CHARCOAL and OXIDE are **classes** here (they change what the matter is). Its NATURAL/BUILT, ITEM, BODY are **forms** (`strata`/`object`, `item`, `creature`). Not modelled: FINES (use `sediment`), SCRAP (use `<m>_metal`/item), ITEM-BURIED, SOIL-CARBON, ROCK-SED (lithification outputs `stone`), HELD (Lane Q, spell-held) |
| Oxide / trace | OXIDE form, family kept | `mineral_trace` loose material, family `metal:<element>` | `fe_trace`, `cu_trace`, `ag_trace` classes | same meaning; per element as the brief asks |
| Fire | ash + charcoal kept in ORGANIC; the rest to `sink(AIR, "fire.outgas")` | adopts Lane R | ash + charcoal; no AIR sink declared | **mismatch**: the brief's default sink list has no AIR/outgas sink (REPORT Q5) |
| Conjured matter | CONJURED source/sink | `source(mineral, kg, "conjured:…")` | `magic` source/sink rows, `ownerConfirmed: false` | name differs (`magic` is the brief's name); the rows are data, so a rename is one line |
| Ore guard | no transform outputs ore; runtime guard on writes | load-time check of the table | load-time and call-time `E_ORE_OUTPUT`; sources never ore | consistent |
| Fixture feeds | FIXTURE-FEED source in test fixtures | – | `debug-explicit` | equivalent role |

## 11. Limits (not checked here)

- Nothing was run in NW.js or the RMMZ editor. No plugin loads the module yet.
- The module has only been loaded in node. The NW.js loader of ADR-003 §2.5 does not exist yet, so the "same source bytes in both runtimes" hash comparison was not possible.
- The recount tested is the toy world's. A real recount of `DEUS_Levels`, `DEUS_Items`, `DEUS_Objects` and `DEUS_Fluid` state is part of PROPOSED-L1-01.
- Mass per stratum, per item type and per object type is not set (Q2). Toy numbers are used in the harness only.
