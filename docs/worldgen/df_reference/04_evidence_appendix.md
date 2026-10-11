# Evidence Appendix — Dwarf Fortress 53.16 world generation

**Source analysed:** Dwarf Fortress 53.16 Classic (Windows x64 build of 2026-08-03), binary + data files, no source code
**Status:** research reference for DEUS/Endrath world generation — not a spec, not a work item
**Date:** 2026-10-10
**Legal note:** Reverse-engineered for learning and interoperability; implement original systems, do not port code or data wholesale.

This appendix is the evidence index behind documents 01–03. Every row traces to a claim in the adjudicated ledger (`VERIFIED_CLAIMS.md`, cited as `report-NN`; long report names are shortened with an ellipsis, e.g. `gap_post…-13` = `gap_post_map_pipeline_order-13`, `gap_name…` = `gap_name_generation_and_seed_streams`, `gap_stage6…` = `gap_stage6_salinity_temperature_pass`) or to the shared brief. "Documents 01–03" are `01_triage_architecture.md`, `02a_core_techniques_physical_world.md`, `02b_core_techniques_living_world.md` and `03_adaptation_tech_catalog.md`. It records *where* things are, not how to re-implement them; see the copy-risk notes.

## 0. How to read the tags

| Tag | Meaning | Convention |
|---|---|---|
| `[BIN:func 0x14…]` | code location, virtual address (VA), ImageBase 0x140000000 | `.text` VA = file offset + 0x140000c00 |
| `[BIN:string 0x1…]` | string, **file offset** from `strings -a -t x` | `.rdata` VA = file offset + 0x140001200 (0x1718c00 ↔ VA 0x141719e00, `hydrology-19`) |
| `[BIN:rtti name]` | class name from the RTTI table (`rtti_all.txt`, 928 names) | — |
| `[RAW:path:token]` / `[LUA:path:fn]` / `[DOC:file:line]` | data files / Lua layer / release notes | counted or quoted, not interpreted |
| `[PUBLIC]` / `[INFERRED]` | public knowledge / inference | never presented as verified |

Ledger statuses: **verified** (reproduced by analyst and auditor), **public**, **inferred** (mechanics real, label or generalisation unproven), *refuted* (section 7). Several reports mislabelled RVAs (VA − 0x140000000) as file offsets; §7.3 lists the corrections. `addr.py` converts.

## 1. Function anchor map

Sizes come from the `.pdata` unwind table (`func.py`); "no pdata" marks leaf functions it does not bound. Identified by: **S** string references (`strs_in.py`), **C** caller/callee grep of `text_dis.txt`, **X** xref of a global, **D** angr decompilation (`decomp/*.c`), **I** IAT resolution, **T** jump-table decode from exe bytes.

### 1.1 Drivers, parameters, rejection, history

| VA range (size) | Role | Id. | Key evidence | Ledger |
|---|---|---|---|---|
| 0x140df39f0–0x140e00944 (53 KB) | Worldgen UI driver: cumulative status list, 53-id→27-name rejection map, placer labels, legends ticker | S, T | status refs 0x140df4bd3–0x140df5824; rejection names 0x140df5fec–0x140df65ca; tables 0x140e00764 / 0x140e006f8; 51-case biome-name switch 0x140e0079c | brief; `params_rejection-16/25`; `biomes_regions-21` |
| 0x140deea70–0x140df0df8 (9 KB) | Stage worker: setup, basic-mode presets, calls generator while 0 < state < 10, on rejection code 2 → state 1 else state 2, CLI `-gen` | S, D | 'MEDIUM ISLAND', 'CREATE WORLD NOW ='; `inc [0x1424e5a54]`; state writes 0x140df09c8 / 0x140df0a24; MINERAL_SCARCITY presets 0x140df0519–60; SEED pop 0x140df089a | `params_rejection-13/14`; `geology_underground-24` |
| 0x140f4a790–0x140f50840 (24.7 KB) | Map generator + rejection core; sub-stage machine on WORD 0x1424e5a50: 1 init+Lua, 2 fields, 3 checks, 4 region count+erosion, 5 lakes+rivers, 6 terrain finalisation+param dump+geology slices+caverns, 7 post-erosion bands, 8 wildlife, 9 stepper | S (angr "no codegen"; disassembly) | `cmp r10w,N` at 0x140f4a7fc / 4ab05 / 4ca7c / 4e1c4 / 4f0bd / 4f1e9 / 50239 / 5040e / 5042d; `call 0x140747300` sites for ids 0–34 (id 6 logged twice); reject exit 0x140f4e03b (`mov al,1`), 0x140f505d1 (`mov al,2`) | `params_rejection-13/14/15`; `elevation_fields-21` refuted; `hydrology-01` |
| 0x140f7f810 | Dimension defaults: `scale(k) = A·k/66049` (magic 0x7f017e03 >> 47), size-class floors/ceilings | D | REGION_COUNTS multipliers 0x140f80094–0x140f8020f | `params_rejection-09/10`; `-11` refuted |
| 0x140de5b10 | Parameter loader: `prefs/world_gen.txt`, ten compiled-in presets, token→offset stores | S | path refs 0x140de5bb7/be9; preset blocks 0x140de5e2c–0x140de723f; PS guards 0x140de81d1/825f | `params_rejection-07/08/12/23` |
| 0x140a68e40 | `world_gen_param` ctor (alloc 0x4c8 at 0x140de5d3c and 0x140de5e09) | C | called from every loader preset block; body not analysed | `params_rejection-01/07` |
| 0x140f80330–0x140f8260c (8.9 KB) | `[WORLD_GEN]` writer — the token→offset oracle | S, T | token refs 0x140f80349..0x140f824c8; tables 0x140f8256c (skip 2,4), 0x140f8258c (fields), 0x140f825ac (POLE), 0x140f825c4 (biomes) | `params_rejection-01/02/04/05/06`; `gap_post_map_pipeline_order-14` |
| 0x140de1a70–0x140de5ad4 | Parameter editor: labels, bindings, mesh cap by size | S | mesh widget 0x140de2524–622 (values 1..6); ' X-Variance'→+0x2a8, ' Y-Variance'→+0x308 at 0x140de23a8–446 | `params_rejection-03` refuted; `elevation_fields-04/05` |
| 0x140747300–0x140747725 | Rejection log writer (string, id): per-id counter 0x1424e5b2c[53], last id WORD 0x1424e5c00, file append when init flag bit 12 set | S, X | 'map_rejection_log.txt' 0x1407475f9; LOG_MAP_REJECTS parser 0x140782ef9 on 0x14238ab78 | `params_rejection-18` (inferred) |
| 0x140deb5d0; 0x140e023b0 | Help-text builder; input handler ('ALLOW THIS' switch 0x140e0252d, 'ALLOW ALL' memset 0xd4 at 0x140e02818) | S, X | allow array 0x1424e5a58[53]; id 52 written at 0x140e027cd, never read | brief; `params_rejection-17` (inferred) |
| 0x140f6b660–0x140f71787 (24.8 KB) | Final region-count checker **and** history stepper: prehistory init, placer dispatch, 17-sub-step year machine, stop test | S, D, I | 'Final <biome> region count fails by' ×9 at 0x140f6b86e–bbd8; sub-step compares 0x140f6bfe0..0x140f71337; year++ 0x140f70ede; stop test 0x140f7137f–404; 100 ms loop on IAT 0x1415e01e8 GetTickCount | `params_rejection-25`; `gap_post_map_pipeline_order-02/03/08/09/10/16` |
| 0x140f60c30–0x140f6b654 (43.6 KB) | Prehistory placer: caves, good/evil, megabeasts, other beasts, cave pops, cave civs, civilizations; HISTORY_SEED push; crop rejection | S, D | strings 0x140f61046 … 0x140f6acb3; phase bytes 0x1424e6198..9f; push 0x140f623c8; pops at six rejection exits | `vegetation_wildlife-17/18`; `gap_post_map_pipeline_order-05` refuted, `-13/-15` |
| 0x140f50cb0–0x140f50da9 | Civ-list builder + finalisation counters (tail-calls 0x140f84480) | D | entity type word 0 → 0x1424e6080 | `gap_post_map_pipeline_order-11` |
| 0x141438280 | World init: parses four seeds, logs them, names the world on a NAME_SEED stream, pushes SEED last | S, X | seed labels + 'gamelog.txt'; push 0x141439ed7 / inline pop 0x141439f08–34; SEED push 0x14143a4fa | `gap_name_generation_and_seed_streams-20` |
| 0x141438160; 0x141522140–0x141523a62 | Worldgen status reset (+0xbf8, vectors +0xc00..); status serializer | D; S | 'stage', 'rejects', 'reject_type', 'last_reject', 'last_used_*_seed' | `gap_post…-04`; `gap_name…-25` |
| 0x140efd610–0x140efeebf; 0x14078bf30 | Region save writer (SAVE → DIM → MAP → GEOLOGY → SUBREGION); geo-layer record writer | S, D | GEOLOGY ref 0x140efddac | brief; `geology_underground-03` |
| 0x140eca3a0–0x140eca9e6 | Engine → Lua `generate`; own RNG buffer push 0x140eca458 / pop 0x140eca84b | S | 'generate', 'Error generating objects'; callers 0x140f4aae8 (SEED copy), 0x140f631f2 (CREATURE_SEED) | brief; `gap_name…-22` |
| 0x140ee2360–0x140ee7158; 0x140d4eef0 (9.7 KB) | Legends / "Making Maps" screen; ticker text formatter | S | 'Making Maps'; 'LPAGE', 'ARTIFACT', 'ART_IMAGE' | brief |

### 1.2 Fields, terrain, hydrology

| VA range (size) | Role | Id. | Key evidence | Ledger |
|---|---|---|---|---|
| 0x140f554a0–0x140f56279 (3.5 KB) | Recursive midpoint-displacement fractal for all slots (skips 2, ≥ 8); sentinel −30000; randomised bounce at bounds | D, C (9 call sites) | halving 0x140f55550–7d; edge midpoint 0x140f55618–c6; centre 0x140f55f96–bd; bounce 0x140f556d0–9a | `elevation_fields-01/02/09` |
| 0x140f4b073–0x140f4c2cc (generator) | Mesh seeding: diamond-square stencil per level, five-bucket weighted range, evil slot 33..65, 1-D border lines, edge-ocean retry, volcanism hotspots | S, T | bucket table 0x140f4b11e–8c (/5); maxMesh 0x140f4b274–311; stencil 0x140f4bf83–0x140f4c062; retry → 0x140f4b3e0 | `elevation_fields-05/06/07/08/15` |
| 0x140f4ca87–0x140f4e00e (stage 3) | Latitude term, peak placement (farthest-point), bands/shifts, edge oceans, 33/66 distribution, vegetation seed, elevation compression, volcano count | S | `mov r14d,0x17c` 0x140f4cd39; r12d = 0x12c; float 0.25 at fo 0x1783f14 (0x140f4ddf9) | `elevation_fields-11/12/13/14`; `params_rejection-19/20/21/22`; `biomes_regions-07` |
| 0x140f4e1b6–0x140f4effe (stage 4) | Region build + region counts, candidate scan, erosion cycles, final sweep, erode extremes, river strip (≥ 150) | S | cycle 0x1424e60ec vs 0x1424e60e8; `cmp WORD [tile+0x30],0x96`; bit 0x11 start mark | `hydrology-01/03/04/06/07/09` |
| 0x140f549b0–0x140f554a0 (2.8 KB) | River walk / carving (exploratory and final); 1/500 lowering `cmp r8d,0x418938` | D | sentinel 250; clamp 100; sink bit 2; links 5–8 | `hydrology-05/08` |
| 0x140f53750 (3.8 KB); 0x140f530f0 | Lake priority flood (helpers 0x140f533c0 growth, 0x140f54610 trim; lake bit only where temp ≥ 0); majority fixpoint | D | frontier 0x141bad5f0 (12-byte entries) | `hydrology-10` (inferred), `-11` |
| 0x140f772f0–0x140f79fdd (11.5 KB) | 'Loop Erase River' extraction: reciprocal links, vestigial BFS, random-fork trace with loop erasure, 264-B river objects, tributary merge / trunk swap, naming, mouth-first sort | S, D | overflow strings → 0x140529a40; `cmp rdi,0x1d4c0`; memmove 0x141535d8a; new(264) 0x140f7896b; 10⁶-step cap | `hydrology-12…17` |
| 0x140f79fe0; 0x140f95cd0; 0x140f84270; 0x140fa9600; 0x140f7b030 | Brook generator (bit 15); uphill step; river-at-tile lookup (16×16 cache world+0x483c8); exit_tile roll [2,13]; elevation-aware lookup | D | names via 0x140a8f8e0 type 20 | `hydrology` extras, `-15/-16/-26` |
| 0x140f90aa0–0x140f9116a | Mountain-Slope: 8-connected BFS to coast (< 100) and high ground (≥ 150) through lowland; ramp (150·dO + 100·dM)/(dO+dM) ± (30/sum + 2); 120000-entry ping-pong buffers | S, D | 'Mountain-Slope Overflow' fo 0x17408f0; called twice 0x140f4f205, 0x140f4f85e | `elevation_fields-18`; `gap_stage6…-12` |
| 0x140655f00–0x14065642c | Prevailing wind: 221-entry latitude table 0x1406560b8, pole fold/mirror, 257-row rescale | T | 0–50 → −15..−11; 51–170 → +11..+25..+11; 171–220 → −13..−20..−13; > 220 → 0 | `elevation_fields-04/17` |
| 0x140f4f1db–0x140f4fb99 (stage 6, tick 0) | Terrain finalisation: slope, volcano cones, river-valley flattening, orographic sweep, slope, temperature lapse / squash / wet cap, vegetation, salinity rings | S | writes only +0x30/+0x3c/+0x32/+0x36/+0x34/+0x4c; next instruction 0x140f4fb9c = region build | `gap_stage6_salinity_temperature_pass-01…15` |
| 0x140f772a0–0x140f772e7 (72 B, no pdata); 0x140f77260 | Vegetation helper: rain if temp > −5, else 0 if drainage ≥ 75, else rain/12 (0x2aaaaaab + sar 1); embark Trees getter | D | stores +0x34 at 0x140f4d748, 0x140f4f96b; Trees buckets 0x14080c5df/628/676 | `gap_stage6…-10`; `vegetation_wildlife-01` refuted, `-04` |
| 0x140071ec0 | `random(n) = (genrand mod 0x7fffffff) / (0x7fffffff/n + 1)`, 0 for n ≤ 1 | D | wraps 0x140eb1820 | `elevation_fields-22`; `geology_underground-25` |
| 0x140071f20 / 0x1400fb7e0 / 0x1400fb810 / 0x1400bbf90; 0x1403d42c0 (no pdata) | Tile-flag test / set / clear (bounds-checked on +0x28); region-map flag test (bit 15 → Brook); attribute getter `[world+0x2b0][x] + y·0x70 + 0x30 + 2·attr` | D | bits: 0 river, 2 sink, 4 scratch, 5–8 links, 13 peak, 14 lake, 15 brook, 17 source | `elevation_fields-03`; `hydrology-20/24`; `geology_underground-02` |

### 1.3 Biomes, regions, alignment, populations

| VA range (size) | Role | Id. | Key evidence | Ledger |
|---|---|---|---|---|
| 0x140f51940–0x140f51ddd (1.2 KB) | World-tile biome classifier → 0..41; 135 direct call sites | D, C | constants 0x96, 0x64, −5, 0x4b, 0x42/0x21/0x14/0xa; savanna `cmp ax,0x6` 0x140f51d34 | `biomes_regions-01/02/03/04/06` |
| 0x140f512c0–0x140f51740; 0x14075b0d0–0x14075b1d5 (no pdata) | Pre-compression twin (mountain ≥ 300; 6 call sites); latitude blend helper (breakpoints 171..220) | D, C; disassembly | wrapper 0x140f51ef0 at 0x140f4d7fb; constants 0x41, 0xab, 0x31, 0xbe, 0xb8, 0xc9, 0xcf | `biomes_regions-05/07` |
| 0x140f51de0 / 0x140f51ef0 / 0x140f52000 | Biome → 10 region kinds (hills by drainage ≥ 50); third wrapper lacks lake case | T | tables 0x140f51e90/eb8, 0x140f51fa0/fc8, 0x140f520a4/c8 | `biomes_regions-08/09` |
| 0x140f52100–0x140f52f80 (3.7 KB); 0x140f53010; 0x140fad410; 0x140fad530 | Subregion/landmass builder (label propagation; 648-B regions, 192-B landmasses; naming; called 3×); "borders lowland" predicate; region centre/bbox; region save routine | D, C, S | kind-name table 0x140f52f58; landmass thresholds 5/100 at 0x140f52e18/29; is_good +0x249 at 0x140fadb47 | `biomes_regions-09/10/11/13` |
| 0x140f5f2f0–0x140f5ff9d (3.2 KB) | Good/evil placer: buckets 1/25/100, square budgets, min-tally kind choice; single caller 0x140f61c90 | D, C | globals 0x1424f3ab0–c4 = param +0x3e8..+0x3fc | `biomes_regions-14/15/17` |
| 0x140f918a0 (7.4 KB) / 0x140f935c0 (7.2 KB); 0x140f5e2d0 | Make-evil / make-good: evilness 66+rand(35) / rand(33), population rebuild, k 15–24 / 25–34 renaming, bogeymen 1-in-10; shared finaliser (purpose open) | D | magics 0x8bfffff3, 0x7ffffc1; `add dx,0x42` 0x140f91994; naming 0x140f91cd1 / 0x140f939ee | `biomes_regions-16` (inferred); `gap_name…-13` |
| 0x140f95200–0x140f95bf6 | Population-add: squares = Σ histogram over the raw's BIOME bits; one count from POPULATION_NUMBER × squares; four callers (23/25/25/25 calls) incl. play-time builder 0x140611bb0 | S, D | ', Region Pop: Null Square Count', ': Null Pop Num', 'errorlog.txt' | `vegetation_wildlife-11/24`; `-25` refuted |
| 0x140f5c390–0x140f5e1d7 (7.75 KB) | Wildlife importer (stage 8): raw filters, per-region biome set, reach model, cap min(50, 7 + tiles/10) | D, C | four `0x140eb1820` draws (home x/y); 0x7f807f81 >> 39; 1717986919 >> 34 | `vegetation_wildlife-05/06/07/08/15/22`; `-10` refuted |
| 0x140f74cb0–0x140f752a5 | Stage-8 side pass: tile+0x40 = 3, zero +0x42..+0x4b, six world seeds, uphill nibbles at +0x48 | D | single caller 0x140f50420 | `gap_stage6…-21/22` (inferred) |
| 0x1406ce110; 0x1400e3550 | Biome id → flag bit (0–29 → 12–41, 30–47 → 45–62, 48–50 → 42–44); has_flag on creature-raw table 0x1424e6938 | T, D | — | `vegetation_wildlife-11` |
| 0x1406c5b30–0x1406ccd50 | Creature finaliser: REAL_WORLD_EXTINCT class → flag 119; option 0 / ≥ 3 / 4 rewrites | S | 0x1406c5c46; `mov edx,0x77`; 0x1406c5d09–0x1406c5e17 | `vegetation_wildlife-14` |
| 0x140024340–0x140025c04; 0x140c45f70; 0x1406bdf00; 0x1409288d2 | Creature-flag name table (0-based); creature flag parser; creature parser (vermin types); entity flag parser (ORCHARDS 51/52, FARMING 18/19) | tokmap, S | — | `vegetation_wildlife-12/18`; `-09` refuted |
| 0x140bde490–0x140bdfd08 (6.2 KB); 0x140bdfd10–0x140be4b0b (20 KB) | Entity founder / resource import; second reader of the beast caps (untraced) | S, X | 'I am', ', once of the Underworld.', 'I bind myself to this place.' | `vegetation_wildlife-18` |
| 0x14080ae60–0x14081622c; 0x141041380 (@0x141045214–cc0) | Embark site screen (river classes 20000/10000/5000 + bit 15, 'Trees:'); embark geology readout (soil depth, clay/sand, aquifer, flux) | S, T | 0x14080d204/25f/2ae; layer-type table 0x14104d9f8 | `hydrology-20`; `vegetation_wildlife-04`; `geology_underground-12…15` |

### 1.4 Geology and the underground

| VA range (size) | Role | Id. | Key evidence | Ledger |
|---|---|---|---|---|
| 0x140f8b7c0–0x140f8d9e8 (8.7 KB) | Geo-biome seed/grow (two passes), layer stacking, sliced mineral placement (one inorganic per call; CLUSTER → VEIN → CLUSTER_SMALL → CLUSTER_ONE); only reader of MINERAL_SCARCITY mirror 0x1424f3a50 | X, D | 0x51EB851F >> 37 (/100); seed table 0x141bad5f0; `cmp di,2` 0x140f8c344; progress 0x1424e5c10 at 0x140f8d9c7; call site 0x140f502a3 | `geology_underground-01/04/06/09/10` |
| 0x140f89f30; 0x140f8d9f0; 0x140f8dfe0; 0x140d930c0 | Kind from tile (0 land / 2 deep ocean / 4 shallow / 6 sand desert, +1 if volcanism ≥ 90); layer recipe (tables 0x140f8df98 / 0x140f8dfb8); new layer (112 B); least-used-first pick (int16 counters +0x1a0, cap 1000) | D, T | — | `geology_underground-05/08`; `-07` refuted |
| 0x140d93290; 0x140d86c20 (@0x140d887e2–9ad); 0x140033c40 | ENVIRONMENT / SPEC matcher (table 0x140d93438); inorganic flag parser (bits 3,4,5,6,7,10,11,12,13,14,17); inclusion-type parser (1–4) | D, T, S | 'AQUIFER' 0x1711498 | `geology_underground-09/10/11` |
| 0x140f8a020 (6 KB); 0x140efb360 | Feature-layer builder: 5×5 min elevation − LEVELS_ABOVE_LAYER_1, up to 5 layers, seeded flood, 280-B feature_init per region (openness biased HIGH, passage low; numbering 0x140f8a9a1–fc); feature_init ctor | D | mirrors 0x1424f382c/3848/3849/3850; bias code 0x140f8afa3–0x140f8b31b | `geology_underground-16/18`; `-17` refuted |
| 0x140fb5760 | Local feature-layer builder; two untagged + two tagged three-value RNG pushes | S | 'Feature layer square index out of range' 0x1740cf8; '… liquid connection' 0x1740d40 | `gap_name…-24` (inferred) |
| 0x140fbd480, 0x140fe8220, 0x140fe9990, 0x140fed490 | Only readers of LEVELS_ABOVE_GROUND mirror 0x1424f384c (site realisation via 0x141018970, 79 KB) | X | 'building out of bounds:', 'cottage plot' | `geology_underground-19` (inferred) |

### 1.5 Names and RNG

| VA range (size) | Role | Id. | Key evidence | Ledger |
|---|---|---|---|---|
| 0x140a8f8e0–0x140a910ab (6 KB); 0x140a8f880 | Name generator (71 call sites; 55 types → 10 bodies; retry ≤ 100); k-wrapper A = L+0x48+k·0x120, B = L+0x4cc8+k·0x120 | D, T, C | tables 0x140a91074 / 0x140a9104c; 0x28f5c29 (2 %), 0x147ae15 (1 %), 0x2aaaaaab (1/3) | `gap_name…-01…07/09` |
| 0x140d29c80–0x140d30ef8; 0x140d33ec0; 0x140d32570; 0x140d32f20; 0x14098dd90 | word_table[2][68] builder (68-case table 0x140d30de8); select/cull fill; flag routing (16 bits at word+0x148); word picker; civ-side type→k selector (table 0x14098e144) | T, S, D | 'Impoverished Word Selector' 0x170ad90 | `gap_name…-08/10/11…16` |
| 0x140eb1820–0x140eb1a03; 0x140eb1a10 | genrand: multi-buffer MT19937 (SSE masks 0x1417869c0.., scalar fallback 0x140eb1b06); 5737 call sites; multi-stream twist | D, C | 0x9908b0df at 0x140eb195b/99b/9d9; `imul r10,rax,0x9c0` | `elevation_fields-22`; `geology_underground-25`; `hydrology-12` |
| 0x140eb17a0 / 0x140eb1bc0 / 0x140eb1bf0 / 0x140eb1cb0 / 0x140777ea0; 0x1407780a0 / c0 / e0 | Reset-from-tick / pop / push-value (init_genrand 0x6c078965) / push-three-values (pairing) / push-from-string (XOR-fold to 5 words); tagged pushes (tag at 0x14234ea04[depth] when depth < 19) | D | 'Random Buffer Overload' 0x169f980 | `gap_name…-18/19`; `gap_post…-13/22` |
| 0x14050d110–0x14050d29c | Scalar MT19937 twist (N 0x270, M 397, 0x9908b0df, 1812433253, `cmp 0x4e0`); seeders 0x14050a230, 0x14050e2d0, 0x1405168a0, 0x14051bb10, 0x140528a60, 0x140528b70, 0x140529230 — **not** used by the map generator | brief | mt_* strings | brief; `params_rejection` extras |
| 0x140529a40 | Error logger ('errorlog.txt'); sink for overflow and selector messages | S | — | `hydrology-12`; `gap_name…-08` |

**Copy-risk note (§1):** the struct offsets quoted (tile 0x70 layout, param +0x…, river 264 B, region 648 B) are DF-internal layout recorded only so a reader can re-find the evidence. A DEUS data model must not mirror them.

## 2. String evidence tables

All offsets are file offsets in `strings_ascii.txt`. 4-character strings ('DIM:', 'Calm', 'SOIL', 'EVIL') fall below the `strings -n 5` cutoff and were read from the exe bytes.

### 2.1 Status strings (cumulative list, UI driver)

| Offset | String | Shown when | Ledger |
|---|---|---|---|
| 0x1718b98; 0x1781178 | Creating the world; Generating world using parameter set | title | brief |
| 0x1718c30 | Preparing elevation... | stage ≥ 1 | `params_rejection-25` |
| 0x1718c18 | Setting temperature... | ≥ 2 (fields run here) | `elevation_fields-21` verdict |
| 0x1718c00 | Running rivers... | ≥ 3, cycle progress while 1 < cycle < total−1 | `hydrology-19` |
| 0x1718ca0; 0x1718c88 | Forming lakes; ' and minerals...' | ≥ 4 (cycle > 20 and ≥ total−1); mineral slice counter | `hydrology-19`; `geology_underground-10` |
| 0x1718c70; 0x1718c58 | Growing vegetation...; Verifying terrain... | ≥ 5 / ≥ 6, both gated on 0x1424e5c10 ≥ 0x1424e5c14 | `vegetation_wildlife-23` (inferred) |
| 0x1718d00 | Importing wildlife... | ≥ 7 (on screen during block 7 only) | `vegetation_wildlife-05` |
| 0x1718ce8 | Recounting legends... | 8 ≤ stage < 10, finish flag clear (static) | `gap_post…-07` |
| 0x171a470; 0x171a488; 0x171a4a0; 0x1718d18; 0x1718d30; 0x1718d48; 0x1718d60; 0x1718cb0; 0x1718cd0 | Prehistory init...; Placing caves... ( ; Placing good/evil...; Placing megabeasts...; Placing other beasts...; Making cave pops...; Making cave civilizations...; Placing civilizations... ( ; Finished prehistory... | highest set phase byte 0x1424e6198..9f (none / 98 / 99 / 9a / 9b / 9c / 9d / 9e / 9f); cave count = 0x1424e6588 + 0x1424e658c; civ value 0x1424e6224 = civs **remaining** | `gap_post…-06/15` |
| 0x171a450; 0x171a4f8; 0x171a4d8; 0x171a4c0 | Finalizing civ mats / art / uniforms / sites... ( | finish flag set; counters 0x1424e6068/606c/6070/6074 | `gap_post…-11` |
| 0x1718c48; 0x1736200; 0x1717338 | ' rejected)'; Making Maps; Command Line: World generation manually aborted. | counter 0x1424e5a54; legends; abort handler 0x140deb2a0 | `params_rejection-14`; brief |

### 2.2 Rejection display names (27) and the id map

| Offset | Display name | Message ids |
|---|---|---|
| 0x171a5b8 | LACK OF PEAKS | 0 |
| 0x171a598 / 0x171a580 / 0x171a560 | MEDIUM / LOW / HIGH ELEVATION REJECTION | 1,2,4,32 / 3,33 / 5,34 |
| 0x171a610 | LACK OF EDGE OCEANS | 6 |
| 0x171a5f8 / 0x171a5e0 / 0x171a5c8 / 0x171a668 | RAINFALL / DRAINAGE / SAVAGERY / VOLCANISM REJECTION | 7 / 8 / 9 / 10 |
| 0x171a640, 0x171a628, 0x171a6c0, 0x171a6a8, 0x171a698, 0x171a680, 0x171a710, 0x171a6f8, 0x171a6e8 | SWAMP, DESERT, FOREST, MOUNTAIN, OCEAN, GLACIER, TUNDRA, GRASSLAND, HILLS REJECTION | 11–19 (initial squares), 21–29 (initial regions), 43–51 (final regions) |
| 0x171a650; 0x171a6d8; 0x171a780 | LACK OF VOLCANOS; LACK OF RIVERS; TOO MANY REGIONS | 20; 30; 31 |
| 0x171a768 / 0x171a750 | LACK OF MOUNTAIN CAVES / LACK OF LOW-LYING CAVES | 35–36 / 37–38 |
| 0x171a728 / 0x171a828 / 0x171a7f8 | UNABLE TO PLACE ENOUGH CIVILIZATIONS / NO CIVILIZATIONS AVAILABLE / UNABLE TO PLACE CONTROLLABLE CIVILIZATION | 39 / 40 / 41–42 |
| 0x171a7c8 | FARMING CIVILIZATION PLACED WITHOUT CROPS | 52 (allow flag never read) |
| 0x171a858 / 0x171a898 | ALLOW ALL REJECTS… / ALLOW THIS REJECTION TYPE… | input handler |

Source: byte table 0x140e00764, jump table 0x140e006f8 (`params_rejection-16`); ids from `mov edx,imm` before each `call 0x140747300` (`params_rejection-15`); the shift-up pair logs id 5 before 4.

### 2.3 Rejection log messages, in id order

| id | Offset | Message | Emitter |
|---|---|---|---|
| 0; 1 | 0x173ef40; 0x173ef00 | Not enough peaks: ; Not enough medium altitudes | generator (stage 3) |
| 2/3; 4/5 | 0x173eea0 / 0x173eed0; 0x173f070 / 0x173f0a0 | … medium / low altitudes after shift down; … medium / high altitudes after shift up | generator |
| 6 | 0x173f030 / 0x173f050 | Not enough partial / complete edge oceans | generator |
| 7–10 | 0x173efd8, 0x173f000, 0x173ef90, 0x173efb0 | Rainfall / Flat/rough areas / Savagery / Volcanism not evenly distributed | generator |
| 11–19 | 0x173f1c8, 0x173f1f0, 0x173f178, 0x173f1a0, 0x173f128, 0x173f150, 0x173f0d0, 0x173f0f8, 0x173f2d8 | Initial swamp … hill square count fails by | generator |
| 20 | 0x173f300 | Not enough volcanos | generator |
| 21–29 | 0x173f298, 0x173f2b8, 0x173f258, 0x173f278, 0x173f218, 0x173f238, 0x173f400, 0x173f420, 0x173f3b0 | Swamp … Hill region count fails by | generator (stage 4) |
| 30; 31 | 0x173f3d0; 0x173f360 | Not enough river start points before erosion (first stage-4 tick only); Too many distinct subregions (over by (stage 6) | generator |
| 32–34 | 0x173f590, 0x173f510, 0x173f548 | Not enough medium / low / high altitude locations after erosion ("high" uses ≥ 150) | generator (stage 7) |
| 35–38 | 0x173f4b0, 0x173f4d8, 0x173f448, 0x173f470 | Not enough mountain / low-lying cave locations [after location check] | placer |
| 39–42 | 0x173ea80 + refs 0x140f66ffe, 0x140f670cd, 0x140f6a82d | Not enough entity placement locations; No entity definitions available; No controllable entity definitions available; Did not place controllable entity | placer |
| 43–51 | 0x173e978, 0x173e9a0, 0x173eb90, 0x173ebb8, 0x173eb40, 0x173eb68, 0x173eaf0, 0x173eb18, 0x173eac8 | Final swamp … hill region count fails by | 0x140f6b660 |
| 52 | 0x173e9c8 / 0x173e9f8 | Placed farming entity without orchard / non-orchard crops | placer |
| — | 0x173f318; 0x173f338 | A world gen error from DF …; Error sorting rivers: working with | generator → errorlog.txt + param dump |
| — | 0x1697c60; 0x16a3a08; 0x164b2a0 | map_rejection_log.txt; LOG_MAP_REJECTS; errorlog.txt | log writer; init parser |

### 2.4 Parameter tokens (writer cluster 0x173ec88–0x17400d0; struct offsets from `params_rejection-01`, `gap_post…-14`)

`[WORLD_GEN]` 0x173ecc0; CUSTOM_NAME 0x173ecd0 (+0xa8); SEED 0x173eca8 (+0x20), HISTORY_SEED 0x173ecb0 (+0x40), NAME_SEED 0x173ec88 (+0x60), CREATURE_SEED 0x173ec98 (+0x80); 'DIM:' 0x173ed90 (+0xa0/+0xa4); EMBARK_POINTS 0x173ed98 (+0xcc); END_YEAR 0x173ed70 (+0x36c); BEAST_END_YEAR 0x173ed80 (+0x368 year, +0x370 percent); REVEAL_ALL_HISTORY 0x173ed38 (+0x498); CULL_HISTORICAL_FIGURES 0x173ed50 (+0x49c); `[ELEVATION_FREQUENCY:` 0x173ed08 (+0x400), `[RAIN_FREQUENCY:` 0x173ed20 (+0x418), `[DRAINAGE_FREQUENCY:` 0x173ee20 (+0x430), `[SAVAGERY_FREQUENCY:` 0x173edf0 (+0x448), `[TEMPERATURE_FREQUENCY:` 0x173ee38 (+0x460), `[VOLCANISM_FREQUENCY:` 0x173ee08 (+0x478) — each mesh (1 = Ignore, 2..6 = 2x2..32x32) + five weights; POLE 0x173edd0 (+0x4b8; 0 written as 'NONE'); REAL_WORLD_EXTINCT 0x173edd8 (+0x4bc; 0 EXTINCT, 1 ISOLATED, 2 UNTAMED_WILDS, 3 WILDERNESS, 4 DOMESTICATED); MINERAL_SCARCITY 0x173eda8 (+0x388); MEGABEAST_CAP 0x173edc0 (+0x38c); SEMIMEGABEAST_CAP 0x173fb30 (+0x390); TITAN_NUMBER 0x173fb48 (+0x394); TITAN_ATTACK_TRIGGER 0x173fb08; DEMON_NUMBER 0x173fb20 (+0x3a4); NIGHT_TROLL 0x173fad8, BOGEYMAN 0x173faf0, NIGHTMARE 0x173fab0, VAMPIRE 0x173fac8, WEREBEAST 0x173fbf8 (+0x3a8..+0x3b8); WEREBEAST_ATTACK_TRIGGER 0x173fc10; SECRET 0x173fbc8, REGIONAL_INTERACTION 0x173fbd8, DISTURBANCE_INTERACTION 0x173fb90, EVIL_CLOUD 0x173fbb0, EVIL_RAIN 0x173fb58 (+0x3c8..+0x3d8); GENERATE_DIVINE_MATERIALS 0x173fb70, GENERATE_MYTHICAL_MATERIALS 0x173fce8, ALLOW_MYTHICAL_HEALING 0x173fd08, ALLOW_DIVINATION 0x173fcb0, ALLOW_DEMONIC_EXPERIMENTS 0x173fcc8, ALLOW_NECROMANCER_EXPERIMENTS 0x173fc70 / LIEUTENANTS 0x173fc90 / GHOULS 0x173fc30 / SUMMONS 0x173fc50 (bytes +0x3dc..+0x3e4); GOOD_SQ_COUNTS 0x173fda8 (+0x3e8/+0x3f0/+0x3f8), EVIL_SQ_COUNTS 0x173fdb8 (+0x3ec/+0x3f4/+0x3fc); PEAK_NUMBER_MIN 0x173fd78 (+0xd0); PARTIAL_OCEAN_EDGE_MIN 0x173fd90 (+0xd4); COMPLETE_OCEAN_EDGE_MIN 0x173fd48 (+0xd8); VOLCANO_MIN 0x173fd68 (+0xdc); `[REGION_COUNTS:` 0x173fd20 (int[10]×3 at +0xe0/+0x108/+0x130, biome 5 skipped); EROSION_CYCLE_COUNT 0x173fd30 (+0x4a0); RIVER_MINS 0x173fe78 (+0x158/+0x15c); PERIODICALLY_ERODE_EXTREMES 0x173fe88 (+0x4a4); OROGRAPHIC_PRECIPITATION 0x173fe48 (+0x4a8); SUBREGION_MAX 0x173fe68 (+0x160); CAVERN_LAYER_COUNT 0x173fe10 (+0x164); CAVERN_LAYER_OPENNESS_MIN/MAX 0x173fe28 / 0x173fdc8 (+0x168/+0x16c); CAVERN_LAYER_PASSAGE_DENSITY_MIN/MAX 0x173fde8 / 0x173ff38 (+0x170/+0x174); CAVERN_LAYER_WATER_MIN/MAX 0x173ff60 / 0x173ff08 (+0x178/+0x17c); HAVE_BOTTOM_LAYER_1/2 0x173ff20 / 0x173fed8 (+0x180/+0x181); LEVELS_ABOVE_GROUND 0x173fef0 (+0x184); LEVELS_ABOVE_LAYER_1..5 0x173fea8, 0x173fec0, 0x173fff8, 0x1740010, 0x173ffc8 (+0x188..+0x198); LEVELS_AT_BOTTOM 0x173ffe0 (+0x19c); CAVE_MIN_SIZE 0x173ffa8 (+0x1a0); CAVE_MAX_SIZE 0x173ffb8 (+0x1a4); MOUNTAIN_CAVE_MIN 0x173ff78 (+0x1a8); NON_MOUNTAIN_CAVE_MIN 0x173ff90 (+0x1ac); MYTHICAL_SITE_NUM 0x17400b8 (+0x1b0); ALL_CAVES_VISIBLE 0x17400d0 (+0x4b0); SHOW_EMBARK_TUNNEL 0x1740088 (+0x4b4); TOTAL_CIV_NUMBER 0x17400a0 (+0x1b4); TOTAL_CIV_POPULATION 0x1740060 (+0x374); SITE_CAP 0x1740078 (+0x378); PLAYABLE_CIVILIZATION_REQUIRED 0x1740028 (+0x4ac); ELEVATION_RANGES 0x1740048 (+0x380 low, +0x37c mid, +0x384 high); RAIN_RANGES 0x173f630 (+0x1bc/+0x1b8/+0x1c0); DRAINAGE_RANGES 0x173f640, SAVAGERY_RANGES 0x173f600, VOLCANISM_RANGES 0x173f618 (+0x1c4.., +0x1d0.., +0x1dc..); PS_EL/PS_RF/PS_TP/PS_DR/PS_VL/PS_SV rows from the pointer at +0x490. Field lines `[FIELD:min:max:xvar:yvar]` read int[24] rows +0x1e8/+0x248/+0x2a8/+0x308 (indices 0,1,3,5,6,7).

Parser-side token copies: PEAK_NUMBER_MIN 0x17167b8, BEAST_END_YEAR 0x1716970, VOLCANO_MIN 0x1716990, NAME_SEED 0x1716770, HISTORY_SEED 0x1716780, CREATURE_SEED 0x17167e8, DRAINAGE_RANGES 0x1717288, DRAINAGE_FREQUENCY 0x1718250, TITAN_NUMBER 0x1718268, SEMIMEGABEAST_CAP 0x1718278, MEGABEAST_CAP 0x1718290, MINERAL_SCARCITY 0x17182a0, TITAN_ATTACK_TRIGGER 0x1718300, EVIL_CLOUD_NUMBER 0x1718368, EVIL_SQ_COUNTS 0x17184c0, GOOD_SQ_COUNTS 0x17184d0, EVIL_RAIN_NUMBER 0x17184e0, CAVERN_LAYER_COUNT 0x1718518, SUBREGION_MAX 0x1718530, CAVE_MIN_SIZE 0x17186b0, CAVE_MAX_SIZE 0x17171f8, MOUNTAIN_CAVE_MIN 0x17171e0, NON_MOUNTAIN_CAVE_MIN 0x17171c8. Presets: LARGE ISLAND 0x17172c8, LARGE REGION 0x17172b8, MEDIUM ISLAND 0x17172a8, MEDIUM REGION 0x1717328, SMALL ISLAND 0x1717318, SMALL REGION 0x1717308, SMALLER ISLAND 0x17172f8, SMALLER REGION 0x1717390, POCKET ISLAND 0x1717380, POCKET REGION 0x1717370; 'prefs/world_gen.txt' 0x17167a0; 'Unrecognized World Gen Token:' 0x17172d8; PS guards 0x1718140 / 0x17181e0.

### 2.5 UI labels

| Offset(s) | Labels | Binding | Ledger |
|---|---|---|---|
| 0x1716118–0x17162d8 | Minimum, Maximum, X-Variance, Y-Variance, '<Field> Mesh Size', '<Field> Weighted Range (', '2 x 2' 0x17161b8 … '32 x 32' 0x1716208 | editor; mesh cap 2/3/4/5/6 for max(W,H) ≤ 17/33/65/129/else | `elevation_fields-04/05`; `params_rejection-03` |
| 0x17162f0 / 0x1716300 / 0x1716318 | North and South / North and/or South / North or South | POLE | `elevation_fields-11` |
| editor 0x140de1a70 (offsets not recorded) | 'Minimum Number of Mid-/Low-/High-<Field> Squares'; 'Minimum Initial Square Count' / 'Minimum Initial Region Count' / 'Minimum Final Region Count' | `*_RANGES` (storage mid, low, high); REGION_COUNTS triplet | `params_rejection-04/05` |
| 0x1716fd8 / 0x1716fa8 | Minimum River Start Locations (Pre-Erosion) / Desired … (Post-Erosion) | +0x158 / +0x15c | `hydrology-03` |
| 0x1717048; 0x1717098; 0x1717150; 0x1717170 | Maximum Number of Subregions; Periodically Erode Extreme Cliffs; Bottom Layer (Forces Magma); Magma Layer | +0x160; +0x4a4; HAVE_BOTTOM_LAYER_1/2 | `biomes_regions-13`; `hydrology-06`; `geology_underground-16` |
| 0x1716df0–0x1716f78; 0x1716068 / 0x17160a0 | Desired Good/Evil Square Count in Small/Medium/Large Subregions; Year to Begin Checking Megabeast Percentage / Percentage Beasts Dead For Stoppage | +0x3e8..+0x3fc; +0x368 / +0x370 | `biomes_regions-14`; `gap_post…-23` |
| 0x1718960; 0x17189e0, 0x1718a54, 0x16a8cc4, 0x1718a48, 0x1718a38 | Mineral occurrence: Very rare, Rare, Sparse, Frequent, Everywhere | MINERAL_SCARCITY 50000 / 10000 / 2500 / 500 / 100 (worker 0x140df0519–60) | `geology_underground-24` refuted |
| 0x1718828; 0x1718928, 0x17188e8, 0x17188b8, 0x1718890, 0x1718978 | Real world extinct creatures; texts for values 0–4 | REAL_WORLD_EXTINCT | `vegetation_wildlife-13` |
| 0x1718848; 0x1718860; 0x1716a98 | Natural savagery (help 0x1718890 / b8 / e8); Number of beasts; Max Semimegabeast Caves | basic mode | `biomes_regions-19` |
| 0x16a8b28, 0x16a8b4c ('Calm'), 0x16a8b40, 0x16a8bf8, 0x16a8be8, 0x16a8c18, 0x16a8c08, 0x16a8bb0, 0x16a8ba0 | Serene, Calm, Sinister, Mirthful, Wilderness, Haunted, Joyous Wilds, Untamed Wilds, Terrifying | savagery × evilness at 33/66 (0x140df89ad–0x140df8c51) | `biomes_regions-18` |
| 0x16a8cb0, 0x16a8ca4, 0x16a8cc4, 0x16a8cb8, 0x16a8b70 | Trees:, Scarce, Sparse, Woodland, Heavily Forested | vegetation 10/33/66 | `vegetation_wildlife-04` |
| 0x16a8bc0, 0x16a9340, 0x16a9330, 0x16a9348, 0x16a9350 | Major River: (≥ 20000), River: (≥ 10000), Minor River: (≥ 5000), Brook: (bit 15), Stream: | embark screen | `hydrology-20` |
| 0x171a968, 0x171a958, 0x171a9d0, 0x171a9c0, 0x171a9a8; 0x171a988, 0x171a978, 0x171a9f8, 0x171aa10, 0x171aa20, 0x171a998 | Little / Some / Deep / Very deep / Extremely deep soil; Shallow Clay, Shallow Sand, Flux stone layer, Light / Heavy / Varied aquifer | soil-layer count 1/2/3/4/≥5; embark readout | `geology_underground-13/14/15` |
| 0x17422e8, 0x1742300, 0x1742310, 0x172aa78, 0x172aa88, 0x15e6a88 | Underground River, Aquifer (Heavy), Aquifer (Light), Waterfall, River Source, Temperate Freshwater Pool | site/biome names | `hydrology-21` |

### 2.6 Help text (rejection screen)

The help builder 0x140deb5d0 emits the biome-derivation rules quoted in the brief (forest / desert / mountain / ocean / tundra / glacier / grassland / hills bands; river starts need mountain squares; mountain caves need border mountain squares; low-lying caves need mid-elevation squares; savagery 66+ blocks civs; dwarves need unaligned mountain squares not surrounded by ocean; crops come from local plants). Verified anchors: swamp 0x1718050; river starts 0x1719520; subregions 0x1719760 / 0x1719700 / 0x1719690; savagery 0x1719950; crops 0x1719f20. These are user-facing rules and may be paraphrased freely.

### 2.7 Save markers, files, exports

| Offset | String | Role | Ledger |
|---|---|---|---|
| 0x173ee50 / 0x173ee68 / 0x173ef58 / 0x173ef70 / 0x173ef20 | *START REGION SAVE* / DIM / MAP / GEOLOGY / SUBREGION SAVE* | writer order | brief; `geology_underground-03` |
| 0x1613478, 0x1613528, 0x16c8e90, 0x15ffb60; 0x17401e0 | world.dat, world.sav, save/current/world.dat, save/current/world.sav; save/current/region_snapshot- | save files; 10-yearly snapshot (0x140f9b9f0) | brief; `gap_post…-10` |
| 0x173ec28, 0x173ec40, 0x1781890, 0x17409e8, 0x1740188, 0x173ece0 | -world_map, -detailed.bmp, -legends, -world_history, -world_sites_and_pops, -world_gen_param | export suffixes (param export reuses the writer at 0x140f7dd3d) | brief; `params_rejection-24` |
| 0x173f6f0, 0x173f820, 0x1740820 | river_start_min, river_start_2_min, real_world_extinct | save keys | `hydrology-03`; `vegetation_wildlife-13` |

### 2.8 Legends XML top-level tags (cluster 0x17819d8–0x17835d8, 66 tag-shaped strings)

`<df_world>` 0x1781a38; `<regions>` 0x1781a48 / `<region>` 0x1781ab0; `<underground_regions>` 0x1781a98 / `<underground_region>` 0x17819d8; `<sites>` 0x1781a30 / `<site>` 0x17819fc; `<artifacts>` 0x1781b10 / `<artifact>` 0x1781b20; `<world_constructions>` 0x1781b30; `<entity_populations>` 0x1782608; `<entities>` 0x1782668; `<historical_events>` 0x1782700; `<historical_eras>` 0x1782888 / `<historical_era>` 0x17828a0; `<historical_event_collections>` 0x17828b8; `<written_contents>` 0x17828f8; `<historical_figures>` 0x1782c08 / `<historical_figure>` 0x1782c20; `<poetic_forms>` 0x1783410; `<musical_forms>` 0x1783430; `<dance_forms>` 0x17835d8; element tags `<name>` 0x15e20b8, `<coords>` 0x16d9eb8, `<type>` 0x16e0a30, `<depth>` 0x17819b8. No `<rivers>`, `<mountain_peaks>`, `<landmasses>`, `<creature_raw>` or `<identities>` tag exists in this binary (those belong to the DFHack legends-plus export, [PUBLIC]). Identification evidence only; no ledger claim analyses the exporter.

### 2.9 Field-name strings (serialisers)

Worldgen status (0x141522140): new_dimy 0x1783048, last_reject 0x1783060, new_dimx 0x1783070, have_logged_parameters 0x1783080, geo_index 0x17830b0, reject_type 0x1783130, stage 0x178313c, rejects 0x1783148, last_used_seed 0x1783190, last_used_history_seed 0x17831a0, last_used_valid 0x17831b8, last_used_title 0x17831c8, last_used_name_seed 0x1783350, last_used_creature_seed 0x1783368; prehistory_have_goodevil 0x17833b8; normal_subregion 0x17839a0, good_subregion 0x1783a08, evil_subregion 0x1783a18. World region (0x140fad530): savageboundnum 0x1740320, totalboundnum 0x1740330, local_id 0x1740340, totalnum 0x1740350, has_murderous_animated_pops 0x17403b8, last_temp_evil_year 0x17403d8, evilgood_pic 0x17403f0, has_bogeymen 0x1740400, biome_count 0x1740410, dead_veg_chance 0x1740420, origsavagenum 0x1740430, orig_savage_total_only_high 0x1740440, max_x 0x174045c, min_y 0x1740464, center_y 0x1740470, min_x 0x174047c, center_calculated 0x1740488, center_x 0x17404a0, is_evil 0x17404b0, is_good 0x17404b8 (`biomes_regions-10`). Scalar MT: mt_index 0x1682228, mt_cur_buffer 0x1682238, mt_virtual_buffer 0x1682248, mt_buffer 0x1682d28, mt_virtual_seed_type 0x1682d38. Seed log labels: ' Seed: ' 0x17811a0, ' History Seed: ' 0x1781158, ' Name Seed: ' 0x1781168, ' Creature Seed: ' 0x17811d0 (`gap_name…-20`).

### 2.10 Token clusters (summary)

| Cluster | Offsets | Content | Ledger |
|---|---|---|---|
| Biome tokens | 0x169b360–0x169be30 (117) | LAKE_/RIVER_/POOL_/SWAMP_/MARSH_ × TEMPERATE/TROPICAL × FRESH/BRACKISH/SALTWATER, SUBTERRANEAN_*, ALL_MAIN, ANY_LAND, ANY_OCEAN, forests, deserts, oceans | `hydrology-21` |
| BIOME_* creature flags | 0x1676728–0x1677260 (51) | scattered order; the index order comes from the UI switch 0x140e0079c | `biomes_regions-21` (inferred) |
| REGION_COUNTS biomes; IS_REGION | 0x16a0c18–0x16a0cb0; 0x16e6530–0x16e65b0 | SWAMP_REGION_1 … HILLS_REGION_1 (no LAKE); SAVAGE_ONLY, GOOD_ONLY, EVIL_ONLY, SAVAGE_ALLOWED, GOOD_ALLOWED, EVIL_ALLOWED, NORMAL_ALLOWED, ANY_TERRAIN | `biomes_regions-08/20` |
| Inorganic vocabulary | 0x17115b8 ALL_STONE, 0x17115c8 IGNEOUS_ALL, 0x16a1c18 ALLUVIAL, 0x1711498 AQUIFER, 0x17116c8 ENVIRONMENT_SPEC, 0x16a1b80 CLUSTER_SMALL, 0x16a1b90 CLUSTER_ONE, 0x16236ec FLUX, 0x16236e0 FIRED_MAT | parser / embark readout | `geology_underground-11/14` |
| Language flag and POS tokens; NAME_* symbols | 0x170abc0–0x170ad50; 0x170ab40–0x170abb0; 0x170aef8–0x170af58, 0x169aba0–0x169ac80, 0x170a9d8–0x170aa10 | FRONT/REAR/THE/OF_* compound flags, STANDARD_VERB, ADJ_DIST; NOUN_SING…VERB_PAST_PART; NAME_SWAMP…NAME_HILLS, NAME_FOREST/LAKE/MOUNTAINS/OCEAN, NAME_ISLAND_SMALL/PEAK/CONTINENT/ISLAND | `gap_name…-11` |
| Creature/class anchors; red herrings | 0x1676710 REAL_WORLD_EXTINCT, 0x1676700 ANIMAL_PERSON, 0x166b918 REGION_WEATHER; 0x16acf60 'No Suitable Vegetation' (stealth screen), 0x16d2a88 ' by growing vegetation' (item destruction) | — | `vegetation_wildlife-03/14` |

**Copy-risk note (§2):** tokens, display names and help text are user-facing format and interface strings, listed as identification evidence; the struct offsets beside the tokens in §2.4 are DF's record layout, kept only so the writer can be re-read. Do not transplant DF's message vocabulary, `[WORLD_GEN]` format or parameter-record layout into DEUS.

## 3. RTTI class inventory relevant to worldgen (`rtti_all.txt`, 928 names)

| Theme | Classes |
|---|---|
| Feature initialisers | feature_initst; feature_init_{cave, pit, magma_pool, volcano, outdoor_river, deep_special_tube, deep_surface_portal}st; feature_init_{subterranean, magma_core, underworld}_from_layerst |
| Feature runtime twins | feature_{cave, pit, magma_pool, volcano, outdoor_river, deep_special_tube, deep_surface_portal, subterranean_from_layer, magma_core_from_layer, underworld_from_layer}st; feature_alterationst, feature_alteration_new_lava_fill_zst, feature_alteration_new_pop_maxst |
| World constructions | world_constructionst; world_construction_{road, bridge, tunnel, wall}st; world_construction_squarest and _square_{road, bridge, tunnel, wall}st; block_square_event_world_constructionst; history_event_created_world_constructionst |
| Parameter reflection | world_gen_param_{base, char, flag, flagarray, member, seed, value}st |
| Site realisation | site_realization_building_infost and _info_{castle_courtyard, castle_tower, castle_wall, hillock_house, market_square, shop_house, shrine, tree_house, trenches}st; histfig_site_link_home_site_realization_{building, sul}st |
| Region refs, events, sources | general_ref_subregionst, general_ref_feature_layerst, region_block_eventst, region_block_event_sphere_fieldst; interaction_source_regionst (plus ten other interaction_source_*st) |
| Worldgen view screens | viewscreen_{new, adopt, update, export}_regionst |
| history_event_*st — 153 names (brief said "~70") | artifact 13 (claim_formed, copied, created, destroyed, dropped, found, given, hidden, lost, possessed, recovered, stored, transformed); collections 19 (collectionst + abduction, battle, beast_attack, ceremony, competition, duel, entity_overthrown, insurrection, journey, occasion, performance, persecution, procession, purge, raid, site_conquered, theft, war); war 9 (attacked_site … site_tribute_forced); masterpiece 8; entity 15 (+ add_entity_site_profile_flag, create_entity_position, regionpop_incorporated_into_entity); hf_* 19 and hist_figure_* 10; change_hf_* 4; hf link add/remove 7; site 8 (created, died, dispute, retired, surrendered, reclaim, sneak_into, spotted_leaving); building 4; agreements/contact 9; culture/knowledge/trade 13; intrigue/misc 11 (assume_identity, body_abused, change_creature_type, creature_devoured, failed_frame_attempt, failed_intrigue_corruption, insurrection_started/ended, sabotage, squad_vs_squad, tactical_situation) |
| Geology-adjacent | block_square_event_mineralst, cave_columnst |

Only `general_ref_subregionst`, `interaction_source_regionst`, `region_block_event*`, the `feature_init_*` family, `world_gen_param_*` and the four view screens are tied to ledger claims (`biomes_regions-20`, `geology_underground-16`, `hydrology-21`, `params_rejection-01`); the rest is inventory. `history_event_entity_breach_feature_layerst` is the only history event naming a feature layer.

**Copy-risk note (§3):** class names are identifiers read from the binary's RTTI and are listed as inventory. DEUS's data model and event taxonomy are named from DEUS systems; nothing here is a schema to mirror.

## 4. PRNG and walk / path details

### 4.1 Two MT19937 families

| Family | Where | Facts | Used by | Ledger |
|---|---|---|---|---|
| Scalar MT19937 | twist 0x14050d110–0x14050d29c; seeders 0x14050a230, 0x14050e2d0, 0x1405168a0, 0x14051bb10, 0x140528a60, 0x140528b70, 0x140529230 | N 624, M 397, 0x9908b0df, init 1812433253 (0x6c078965); `cmp 0x4e0` double-length "virtual" buffer; mt_* names | **not** the map generator (no calls from 0x140f4a790 or its callees) | brief; `params_rejection` extras |
| Multi-buffer MT19937 (Brundage-style, untempered words) | genrand 0x140eb1820–0x140eb1a03; twist 0x140eb1a10; SSE masks 0x1417869c0.., xmm table 0x141786a20; scalar fallback 0x140eb1b06 | byte-indexed counter vs 0x9c0 (624 words); 0x9908b0df at 0x140eb195b/99b/9d9; 5737 call sites | every worldgen draw (fractal, rivers, lakes, loop-erase, good/evil, geology, caverns, importer, names) | `elevation_fields-22`; `hydrology-05/12`; `geology_underground-25`; `gap_name…-18` |

### 4.2 Stream stack (verified globals)

| Global | Role |
|---|---|
| 0x142354110 (WORD) | depth; push increments, pop decrements |
| 0x142152f70 (WORD) | selector = current buffer; clamped to 9 with 'Random Buffer Overload' (0x169f980) when depth ≥ 10 |
| 0x142288880; 0x14212ba18; 0x14234ea00 | state buffers (stride 0x9c0); per-slot index; per-slot type |
| 0x14234ea04 | purpose tags, stored only when depth < 19 (tag-array size, not stack depth) |

Push variants: value (init_genrand, 0x140eb1bf0); three values with nested pairing `t = (a+b)(a+b+1) + 2b + c; seed = t(t+1) + 2c` (0x140eb1cb0; callers 0x140fb97e0 / 0x140fb9c6a with r8d = (index+1)·10000); from a string by XOR-folding bytes into a 5-word key then the 1812433253 recurrence (0x140777ea0); reset-from-GetTickCount (0x140eb17a0). Reduction everywhere: `r31 = mt32 mod 0x7fffffff`, `rand(n) = r31 / (0x7fffffff/n + 1)`; the 1/500 erosion test is `r31 < 4294968` (0x418938).

### 4.3 Seeds and active streams

| Seed (param offset, global) | Push | Pop | Scope | Ledger |
|---|---|---|---|---|
| NAME_SEED (+0x60, 0x1424f3728) | world init 0x141439ed7 (tag 2); skipped when [0x1424f3780] ≠ 0 | inline 0x141439f08–34 | world name only (type 5, k 13) | `gap_name…-20/23` |
| SEED (+0x20, 0x1424f36e8) | world init 0x14143a4fa (tag 3), before any generator call | stage worker 0x140df089a (stage 10) or abort 0x140e02d81 | whole map generator; rejections never reseed; Lua stage-1 call nests its own buffer | `params_rejection-27` verdict; `gap_name…-21` refuted |
| HISTORY_SEED (+0x40, 0x1424f3708) | placer 0x140f623c8 (tag 0), guarded by byte 0x1424e619b == 0 | six rejection exits (0x140f66faf, 0x140f67030, 0x140f670ff, 0x140f6a85f, 0x140f6abc0, 0x140f6ace2) or generator 0x140f50587 after finalisation | civ placement **and** the eight stage-9 post-passes | `gap_post…-13`; `gap_name…-22` |
| CREATURE_SEED (+0x80, 0x1424f3748) | copied at 0x140f62ad8; nested push inside the Lua entry (call 0x140f631f2) | Lua entry | procedural creature generation | `gap_name…-22` (inferred) |

Open: nothing re-pushes a seed after the stage-10 pop (`gap_name…` extras); the literal the seed strings are compared against in world init was not read.

### 4.4 Walk, flood and path strings

| Offset | String | Function | Meaning | Ledger |
|---|---|---|---|---|
| 0x173ebe0 / 0x173ec00 / 0x173ec50 | Loop Erase River Overflow / … Placement Overflow / … Temp River Placement Overflow | 0x140f772f0 → 0x140529a40 | 120000-entry (0x1d4c0) double-buffered 12-byte frontier at 0x141bad5f0 (shared with lake flood and geology growth) | `hydrology-12` |
| 0x17408f0 | Mountain-Slope Overflow | 0x140f90aa0 | same buffers; 8-connected BFS | `elevation_fields-18` |
| 0x1740cf8 / 0x1740d40 | Feature layer square index out of range; … too high for a liquid connection; save corrupted? | 0x140fb5760 | local feature-layer builder | `gap_name…-24` |
| 0x170ad90; 0x169f980 | Impoverished Word Selector; Random Buffer Overload | 0x140d32f20; 0x140777ea0 | empty position list; stack depth ≥ 10 | `gap_name…-08/18` |
| 0x177b518 | Could not find path | — | present in the binary; **not attributed** by any ledger claim | — |

Random-walk facts tied to claims: river walk picks uniformly among strictly lower non-peak 4-neighbours (`hydrology-05`); loop-erase trace picks a random link at forks and cuts the path back on self-revisit via memmove 0x141535d8a (`hydrology-13`); the trace-start scan examines only W, N, E neighbours (`hydrology` extras); peaks are placed by farthest-point sampling after one random pick (`elevation_fields-12`); geo-biome growth rolls d4 against per-side resistances (`geology_underground-06`).

**Copy-risk note (§4):** MT19937 is public domain; the buffer-stack layout, string-folding seeder, pairing formula and `(0x7fffffff/n)+1` reduction are DF's implementation. Use a modern PRNG with your own stream derivation.

## 5. Raw-data evidence summary

Counts are per `[OBJECT]` definition in `data/vanilla/vanilla_*/objects/*.txt`, reproduced independently by the auditor (per-definition parse).

### 5.1 Inorganics (`geology_underground-23`, inferred: ENVIRONMENT total corrected to 146)

265 inorganics (metal 26, other 8, gem 127, layer 25, mineral 58, soil 21). Layer-stone classes: SEDIMENTARY 11, SEDIMENTARY_OCEAN_SHALLOW 3, SEDIMENTARY_OCEAN_DEEP 1, IGNEOUS_INTRUSIVE 3, IGNEOUS_EXTRUSIVE 5, METAMORPHIC 6. Soils 21 (18 SOIL incl. 5 SOIL_SAND, 3 SOIL_OCEAN). AQUIFER bearers 19; REACTION_CLASS:FLUX 5; METAL_ORE 16 inorganics; adamantine DEEP_SPECIAL + WAFERS, slade DEEP_SURFACE, obsidian LAVA; no DIVINE tokens.

| ENVIRONMENT (146 placements; inorganic_stone_gem.txt and inorganic_stone_mineral.txt only) | n |
|---|---|
| CLUSTER_SMALL: ALL_STONE 36, SEDIMENTARY 30, METAMORPHIC 30, IGNEOUS_ALL 8, ALLUVIAL 8, IGNEOUS_EXTRUSIVE 7, IGNEOUS_INTRUSIVE 3 | 122 |
| CLUSTER: SEDIMENTARY 5, METAMORPHIC 2, IGNEOUS_INTRUSIVE 1, IGNEOUS_EXTRUSIVE 1, ALL_STONE 1 | 10 |
| VEIN: SEDIMENTARY 4, IGNEOUS_EXTRUSIVE 4, METAMORPHIC 3, IGNEOUS_ALL 2, ALL_STONE 1 | 14 |
| Frequencies: 100 ×111, 20 ×8, 10 ×15, 8 ×12 | 146 |

ENVIRONMENT_SPEC 132: CLUSTER_SMALL 99, VEIN 15, CLUSTER_ONE 11, CLUSTER 7; hosts granite 33, marble 22, schist 12, gabbro 10, gypsum 6, diamond 6, kimberlite 5. Matcher table 0x140d93438: SOIL ← class 0; SOIL_OCEAN ← 1; SOIL_SAND ← 2; METAMORPHIC ← 3; the three SEDIMENTARY types ← 4 (SEDIMENTARY) or 7 (ALLUVIAL); IGNEOUS_INTRUSIVE ← 5; IGNEOUS_EXTRUSIVE ← 6; ALL_STONE / IGNEOUS_ALL have no case (presumably expanded by the parser; unverified).

### 5.2 Plants (`vegetation_wildlife-20`, verified)

| Token | Count / distribution |
|---|---|
| Definitions | 225 = 72 TREE, 41 GRASS, 112 shrubs (plant_crops, plant_garden, plant_grasses, plant_new_trees, plant_standard) |
| FREQUENCY / CLUSTERSIZE (shrubs only) | 50 ×97, 100 ×12, 25 ×1, 5 ×2 / 5 ×110, 1 ×2 |
| WET / DRY | 65 / 217 (57 both, 160 DRY only, 8 WET only) |
| GOOD / EVIL / SAVAGE | 4 / 4 / 2 |
| UNDERGROUND_DEPTH | 17, all within 1–3 |
| BIOME tokens per plant | 1 ×169, 2 ×20, 3 ×12, 4 ×17, 5 ×2, 7 ×4, 9 ×1 |
| Top BIOME tokens | ANY_TROPICAL 54, ANY_TEMPERATE 53, NOT_FREEZING 24, GRASSLAND_TROPICAL 23, SAVANNA_TROPICAL 22, SUBTERRANEAN_WATER 17, GRASSLAND_TEMPERATE 16, SHRUBLAND_TROPICAL 15, TUNDRA 15, FOREST_TROPICAL_DRY_BROADLEAF 12, MOUNTAIN 12 (all grasses), TAIGA 10 |

Plant flag bits used by the importer (parser-verified): SPRING..WINTER 0–3, GOOD 56, EVIL 57, SAVAGE 58, TREE 78, GRASS 79; FREQUENCY at +0x284 (`vegetation_wildlife-07`).

### 5.3 Creatures (`vegetation_wildlife-21/16`, verified)

| Token | vanilla_creatures (767) | vanilla_creatures_extinct (200) |
|---|---|---|
| BIOME present | 382 | 100 (the GIANT_/_MAN/_WOMAN variants carry none) |
| POPULATION_NUMBER | 737; modes 15:30 ×216, 5:10 ×211, 250:500 ×115, 10:20 ×90, 20:50 ×26, 2:3 ×24, 2500:5000 ×5 | 5:10 ×155 |
| CLUSTER_NUMBER | 559; modes 1:1 ×151, 5:10 ×131, 1:5 ×81, 1:3 ×42, 3:7 ×33 | 1:3 ×102 |
| FREQUENCY | 188 (100 ×91, 5 ×41, 10 ×22) | 9 |
| LARGE_ROAMING / LOOSE_CLUSTERS / UNDERGROUND_DEPTH | 271 / 12 / 63 | 83 / — / 0 |
| GOOD / EVIL / SAVAGE / BENIGN | 8 / 24 / 8 / 180 | 0 / 0 / 99 / 59 |
| MEGABEAST / SEMIMEGABEAST / TITAN / FEATURE_BEAST | 4 (DRAGON, COLOSSUS_BRONZE, HYDRA, BIRD_ROC) / 4 (GIANT, CYCLOPS, ETTIN, MINOTAUR) / 0 / 0 | — |
| LAIR / LAIR_HUNTER / FANCIFUL | 8 / 2 / 19 | 0 |
| Vermin classes | FISH 29, SOIL 9, SOIL_COLONY 4, ROTTER 5, GROUNDER 93, EATER 7 | — |
| UBIQUITOUS / COMMON_DOMESTIC / LARGE_PREDATOR / DOES_NOT_EXIST | 9 / 24 / 75 / 3 | — / — / 28 / — |
| CREATURE_CLASS:REAL_WORLD_EXTINCT | — | 100 (BIOME-without-SAVAGE: CRETACEOUS_CARNOTAURUS) |
| Top BIOME tokens | SUBTERRANEAN_CHASM 44, OCEAN_TEMPERATE 39, ANY_TEMPERATE_FOREST 38, OCEAN_TROPICAL 31, SHRUBLAND_TEMPERATE 30, ANY_DESERT 29, NOT_FREEZING 28 | — |

Engine creature-flag bits (0-based, parser-anchored; `vegetation_wildlife-12`): 0 EQUIPMENT, 1 EQUIPMENT_WAGON, 2 MUNDANE, 3–7 VERMIN_EATER/GROUNDER/ROTTER/SOIL/SOIL_COLONY, 8 LARGE_ROAMING, 9 VERMIN_FISH, 10 LOOSE_CLUSTERS, 11 unnamed, 12–62 BIOME_MOUNTAIN … BIOME_RIVER_TROPICAL_SALTWATER, 63 GOOD, 64 EVIL, 65 SAVAGE, 73 OCCURS_AS_ENTITY_RACE, 74 HAS_ANY_LARGE_PREDATOR, 78/79 HAS_ANY_MEGABEAST/SEMIMEGABEAST, 90 HAS_ANY_FEATURE_BEAST, 91 GENERATED, 92 HAS_ANY_TITAN, 93 HAS_ANY_UNIQUE_DEMON, 94 DOES_NOT_EXIST, 103 ARTIFICIAL_HIVEABLE, 104 UBIQUITOUS, 119 HAS_REAL_WORLD_EXTINCT. Public df-structures numbering is off by +2 for biomes and +1 before them.

### 5.4 Entity placement tokens (`vanilla_entities/objects/entity_default.txt`)

The ledger covers four entity flags: INDOOR_ORCHARDS 51 / OUTDOOR_ORCHARDS 52 gate the orchard crop check and INDOOR_FARMING 18 / OUTDOOR_FARMING 19 the non-orchard check (`vegetation_wildlife-18` verdict). The counts below are **supplementary** (plain token grep for this appendix; not adjudicated):

| Token | Count (6 ENTITY definitions) | Notes |
|---|---|---|
| BIOME_SUPPORT | 29 | per-entity weights, e.g. MOUNTAIN:3, ANY_FOREST:3, ANY_OCEAN:12 (PLAINS) |
| START_BIOME / EXCLUSIVE_START_BIOME / SETTLEMENT_BIOME | 7 / 1 / 5 | MOUNTAIN: EXCLUSIVE_START_BIOME:MOUNTAIN and five SETTLEMENT_BIOMEs; EVIL: START_BIOME:ANY_LAND |
| DEFAULT_SITE_TYPE / LIKES_SITE / TOLERATES_SITE | 5 / 5 / 11 | CAVE_DETAILED, TREE_CITY, CITY, DARK_FORTRESS, CAVE |
| MAX_STARTING_CIV_NUMBER / MAX_POP_NUMBER / MAX_SITE_POP_NUMBER | 6 / 6 / 6 | 100 / 10000 (SKULKING 2000) / 120 |
| INDOOR_FARMING / OUTDOOR_FARMING / OUTDOOR_ORCHARDS / INDOOR_ORCHARDS | 1 / 1 / 1 / 0 | MOUNTAIN, PLAINS, FOREST |
| WORLD_CONSTRUCTION; LAYER_LINKED; SITE_CONTROLLABLE; CREATURE | 8; 1; 1; 14 | TUNNEL, BRIDGE, ROAD, WALL; SUBTERRANEAN_ANIMAL_PEOPLES; MOUNTAIN; nine CREATUREs in the animal-people entity |

## 6. Lua layer inventory

| File | Lines | Role |
|---|---|---|
| data/init/generators.lua | 826 | `generate()` at line 259; `generate_random_{materials, interactions, creatures, entities, items, languages}`; EVIL_CLOUD_i / EVIL_RAIN_i inorganics (358–374); regional interactions with [I_SOURCE:REGION] [IS_REGION:…] [IE_INTERMITTENT:WEEKLY] (591–633) |
| data/init/globals.lua | 637 | `pairsByKeys` (line 1), comment "we use pairsByKeys so the RNG seed is stable" (34, 50); `one_in` (63) |
| vanilla_procedural/scripts/init.lua | 276 | module loader |
| generators/creatures.lua; creatures/rcp.lua; creatures/shared_info.lua | 2292; 3023; 6997 | titans, forgotten beasts, demons, angels, night creatures, experiments |
| generators/divine.lua; materials.lua | 382; 272 | METAL_TEMPLATE / SILK_TEMPLATE divine materials without ENVIRONMENT tokens; mythical remnant materials per sphere (`geology_underground-26`) |
| generators/entities.lua; evil.lua; language.lua; items.lua | 1386; 186; 71; 0 | guardian entities; evil clouds and rains (`biomes_regions-20`); GEN_DIVINE / GEN_IDENTITY |
| generators/interactions.lua + interactions/{blessing, curse, disturbance, item_power, mythical, secret}.lua | 286 + 130, 95, 134, 436, 298, 351 | interaction generators |
| Total | 1,463 + 16,615 | |

**Engine-provided** (called, no Lua definition): `trandom(n)` (43 calls), `raws.register_{interactions, inorganics, items, languages, creatures, entities}(lines)`, `world.inorganic.get_random_inorganic(class, flag, mode)`; also undefined in Lua: `adj_exploitable_check`, `lua_log`, `capitalize_string_words`, `capitalize_string_first_word` (origin not traced). **Lua-defined** (the brief listed several of these as engine functions): `one_in`, `pairsByKeys`, `add_generated_info`, `generate_from_list`, `get_random_creature_profile`, `get_random_creature`, `get_random_sphere_noun`, `get_random_sphere_adjective`, `add_desc`, `add_body_size`, `add_regular_tokens`, `get_debug_logger`.

**`random_object_parameters` fields** read by the Lua layer (direct access; some code aliases it as `ropar`): token_prefix, main_world_randoms, pre_gen_randoms, mythical_sphere, use_divine_materials, use_mythical_materials, allow_mythical_healing, evil_cloud_number, evil_rain_number, entity_def_number_mythical, entity_def_number_guardian, night_creature_def_number_bogeyman (other night_creature_def_number_*, angel_def_number_* and demon_def_number are referenced by name in generators.lua), werebeast_count, cloud_states, source_hf, source_hfid, source_enid, experimenter_creature.

Engine side: the `generate` entry 0x140eca3a0 pushes its own RNG buffer at 0x140eca458 and pops at 0x140eca84b, so Lua object generation does not perturb the map stream; it is called at stage 1 with a copy of SEED and from the placer with CREATURE_SEED (`params_rejection-27` verdict; `gap_name…-22`). Release note: "Removed the temporary geology variables placement layer/freq/parent from lua" [DOC:release notes.txt:557].

**Copy-risk note (§5–6):** the raw files and Lua scripts are Bay 12 content. Counts and field names are quoted for understanding; do not copy word lists, creature tables or generator recipes.

## 7. Refuted or downgraded claims

### 7.1 Refuted (14) — do not re-assert

| Claim | What the binary actually does |
|---|---|
| `params_rejection-03`: mesh 0 = Ignore, 1..5 = 2x2..32x32 | Widget bound to +0x400 has min 1, max 6: **1 = Ignore, 2..6 = 2x2..32x32**. Default presets ship with weighting disabled; MEDIUM ISLAND's 4 is 8x8, SMALL ISLAND's 3 is 4x4. |
| `params_rejection-11`: default REGION_COUNTS region multipliers (the analyst's vectors) | The per-biome initial and final multipliers differ from the analyst's set; the auditors' corrected vectors stand in the ledger verdict and are not reproduced here (DF tuning). Glacier/tundra are zeroed unless **both** dims exceed 257; ELEVATION_RANGES is not zeroed for A < 65². |
| `params_rejection-27`: field slots 2/4 = GEOLOGY / airmass; MT seeding mechanism | Slot 2 vegetation, slot 4 evilness. Map stream = multi-buffer MT pushed from the SEED string inside world init 0x141438280 (called by the worker at 0x140defca9), not the 0x1405xxxxx wrappers. |
| `elevation_fields-21`: fields at stage 3, erosion/orographic at stage 4 | Stage 2 fields; 3 checks; 4 erosion; 5 rivers; 6 slope + orographic + param dump; 7 post-erosion bands. |
| `geology_underground-07`: 4 soil + 10 stone layers; sand desert alone gets SOIL_SAND; rand(5)+2 default case | Kinds 0,1 → 4×SOIL; 2,3 → 4×SOIL_OCEAN; **kinds 4–7 (shallow ocean and sand desert) → one SOIL_SAND**, bottom −(rand(3)+1); stone = 5 primary + 6 rolled 50/50 (META / INTRUSIVE) + final INTRUSIVE = **12**; volcanic kinds EXTRUSIVE + 10 uniform 3-way + final INTRUSIVE; every stone layer bottom = top − 2 − rand(5). |
| `geology_underground-17`: openness and passage biased low | **Openness biased HIGH** (75 % → 60+rand(41) when OPENNESS_MAX ≥ 60; 95 % → 80+rand(21) when ≥ 80); only passage density biased low (90 % → rand(21) when PASSAGE_MIN ≤ 20; 75 % → rand(41) when ≤ 40). |
| `geology_underground-24`: public MINERAL_SCARCITY values 100/2500/10000/50000/100000 | Worker writes **Very rare 50000, Rare 10000, Sparse 2500, Frequent 500, Everywhere 100**. |
| `vegetation_wildlife-01`: freezing vegetation = rainfall/6 | `imul 0x2aaaaaab; sar edx,1` is **/12**. |
| `vegetation_wildlife-09`: type 4 = VERMIN_EATER, 3 = VERMIN_FISH | Parser: EATER 3, GROUNDER 4, ROTTER 5, SOIL 6, SOIL_COLONY 7, FISH 9; type 4 is **VERMIN_SOIL_COLONY**, type 3 **VERMIN_SOIL**; VERMIN_FISH falls to type 1. |
| `vegetation_wildlife-10`: top-ups are random raw picks via the MT wrapper | Top-up lists are trackers filled by **insertion-sorting unplaced raws by distance** to the region centre; no RNG. The only four MT draws give each raw's home x/y. |
| `vegetation_wildlife-25`: POPULATION_NUMBER range stored as count_min/max | One number rolled: uniform in [min,max] × squares, raised to roll[CLUSTER_NUMBER] × squares if lower, floored at squares, capped 10,000,000, written to **both** count fields. |
| `gap_post_map_pipeline_order-05`: placer runs exactly one phase per call | Phase F falls straight into G; G stores a countdown in 0x1424e6224 and returns false repeatedly, re-entered while > 0. |
| `biomes_regions-24`: civ placer shows no landmass-vector access | 0x140f60c30 reads world+0x220 at 0x140f61cb1, 0x140f61d4c, 0x140f66d50, 0x140f6a515, 0x140f6a616, 0x140f6a667 with a per-landmass argmax; the ocean-surround rule is still unlocated, but this is where to look. |
| `gap_name_generation_and_seed_streams-21`: 0x140f50587 pops the SEED stream | It pops **HISTORY_SEED** (the placer's success path never pops); SEED is popped by the stage worker at stage 10 (0x140df089a). Stage-9 post-passes run on HISTORY_SEED. |

**Copy-risk note (§7):** the corrected readings above are recorded so the refuted versions are not re-asserted; the layer recipe, bias percentages and count rules they contain are DF tuning, not a specification.

### 7.2 Downgraded to inferred (label or generalisation not established)

`params_rejection-17` (id-52 flag never read), `-18` (no last-message global; LOG_MAP_REJECTS is a bit), `-21` (peak = ≥ 380 after clamp; placement sets chosen tiles to 400); `elevation_fields-07` (interior variance = X-var when W−1 ≤ H−1 else Y-var), `-10` (slot names not in binary), `-12` (farthest-point, not random), `-16` ("rising" vs last uplift tile), `-23` (PS_* painted-map import; now stronger); `hydrology-10` (flood stops on first ocean/lake contact; trim bound N/2 − Ndry/2; lake bit only where temp ≥ 0), `-24/-25` (public-corroborated), `-26` (exit_tile yes; salinity half refuted); `biomes_regions-06` (savanna 6 narrows the band), `-07` (six call sites), `-09` (connectivity treats lakes as ocean), `-11` (symbol identity), `-13` (three builds), `-16` (flag semantics untraced), `-21` (42–50 numbering public), `-22`; `geology_underground-01` (geology before caverns), `-03` (int16 vector = nested-in index), `-09` (guarantee per call), `-11` (bit 2 not generic), `-14` (FIRED_MAT reaction-product key), `-18` (two caverns number 1 and 3), `-19`, `-20` (cited strings were tokens), `-23` (146), `-26`; `vegetation_wildlife-02`, `-12` (0-based), `-22`, `-23`, `-24`; `gap_post_map_pipeline_order-04` (reserve targets figures vector), `-17`, `-19`, `-21` (52.04 attribution unprovable), `-22` (stack depth 10; tag array 19), `-23`; `gap_stage6_salinity_temperature_pass-14` (centre raise runs for every peak), `-16/-17/-18`, `-20` (slice worker is 0x140f8b7c0), `-21` (low nibble only for elevation ≤ 102), `-22/-23`; `gap_name_generation_and_seed_streams-22` (pops are rejection exits only), `-23` (cave names draw from SEED), `-24`, `-28`.

### 7.3 Mislabelled evidence to avoid repeating

| Wrong | Right |
|---|---|
| `[BIN:string 0x173f140]` 'Not enough peaks:' | file offset **0x173ef40** (0x173f140 is an RVA) |
| `[BIN:string 0x1740af0]` 'Mountain-Slope Overflow' | **0x17408f0** |
| `[BIN:string 0x173ff08]` '[ELEVATION_FREQUENCY:' | **0x173ed08** (0x173ff08 is CAVERN_LAYER_WATER_MAX:) |
| `[BIN:string 0x173ff90]` '[DIM:' | 0x173ff90 is NON_MOUNTAIN_CAVE_MIN:; 'DIM:' is at **0x173ed90** |
| `[BIN:string 0x1783f14]` "0.25" | an `.rdata` float (VA 0x141785114), not a string |
| `[BIN:string 0x173f930 / 0x173f948]` cave rejections | lowercase save tokens `mountain_cave_min` / `non_mountain_cave_min` (ref 0x140f82610); rejections are 0x173f4b0/0x173f4d8/0x173f448/0x173f470 |
| "RANGES tokens at 0x140f81700+" | that is the REGION_COUNTS loop; *_RANGES writer is 0x140f8219x–0x140f823fe |
| brief: "~70 history_event_*st classes" | 153 in `rtti_all.txt` |
| brief: 0x1405xxxxx callers are "the random-number wrapper family" | scalar seeders of a separate MT; worldgen uses 0x140eb1820 |
| brief: `one_in`, `add_generated_info`, `generate_from_list`, `get_random_creature_profile`, `get_random_sphere_*` are engine functions | defined in Lua (globals.lua / generators.lua / shared_info.lua) |
| gap_post: geology slicer "in the stage-7 block" | lexically after `cmp r10w,7` (0x140f50239) but reached from the stage-6 continuation (0x140f50221 → 0x140f50294); three ledger entries read it as later stage-6 ticks |
| hydrology report: "eight clear-bit calls" in the river strip | nine (bits 0,5,6,7,8 + four reciprocal) plus the bit-4 clear |
| params_rejection report: MEDIUM ISLAND '16x16', SMALL ISLAND '8x8' | 8x8 and 4x4 under the corrected encoding |
| vegetation report: "~50 callers" of the classifier | 135 direct call sites |

## 8. Reproduction notes

The helper scripts live in the analysis work directory (outside the repo) beside `strings_ascii.txt`, `rtti_all.txt`, `text_dis.txt` (full objdump of `.text`), `decomp/` (angr pseudo-C for 53 functions) and the `dl/ef/` disassembly cuts. Conceptually:

| Table | How it was produced |
|---|---|
| §1 anchor map | `func.py <VA>` for `.pdata` bounds and sizes; `strs_in.py <lo> <hi>` to label a function by its literals; `calls_in.py <lo> <hi> --uniq` for call order and callee sizes; `grep -E "call   0x<F>\b" text_dis.txt` for callers; `xref.py --fo 0x<string>` / `xref.py 0x<global>` for readers; `decomp.py 0x<VA>` (angr, ≤ 15 KB, `timeout 900`) for control flow; `stage_order.py` for status/rejection order inside the generator; `dumprange.py strings_ascii.txt <lo> <hi>` for neighbouring strings; `addr.py fo/va` for conversion; `pefile` for IAT slots (GetTickCount, sqrtf) |
| §2 string tables | `grep -nE` over `strings_ascii.txt` per phrase; `dumprange.py` over each cluster; sub-5-character literals read from the exe bytes at the `lea` target |
| §2.2 id map, enum tables | jump-table bytes read from the exe with `struct` at the table VAs (0x140e00764/0x140e006f8, 0x140f8256c/58c/5ac/5c4, 0x140f507a0.., 0x140f50788, 0x140f50818, 0x140f51e90.., 0x1406560b8, 0x14104d9f8, 0x140d93438, 0x140a91074/0x140a9104c, 0x140d30de8, 0x14098e144) |
| §2.3 message ids | `mov edx,imm` preceding each `call 0x140747300` in `text_dis.txt` |
| §3 RTTI | `grep -E` over `rtti_all.txt` (feature_, world_construction, world_gen_param, site_realization, viewscreen_.*region, general_ref_, region_block, interaction_source, history_event_) |
| §4 PRNG | disassembly of 0x14050d110 and 0x140eb1820 for constants; `calls_in.py` over each worldgen function to show which family it calls; `xref.py` on 0x142354110 / 0x142152f70 for push/pop sites; `decomp/140777ea0.c`, `decomp/140eb1cb0.c` for the seeders |
| §5 raws | `rawstats.py <plants_dir> <creatures_dir> [<extinct_dir>]` (per-definition token parse); inorganics by a per-definition parse of inorganic_*.txt (`inorg_all.txt`); entity tokens by `grep -oE` on entity_default.txt |
| §5.3 flag bits | `tokmap.py 0x140024340 0x140025c04` pairs literals with the DWORDs stored beside them, anchored by `mov edx,<bit>; call 0x1400fb7e0` in the parsers (`storeoff.py`, `readers.py` search `text_dis.txt` for stores/reads of an offset) |
| §6 Lua | `wc -l`; `grep -ohE 'random_object_parameters\.[a-z_]+'`; called-vs-defined names by grepping `name(` against `function name` / `name = function` |
| §7 | ledger `VERIFIED_CLAIMS.md` (Refuted / skeptic-notes columns) |

Nothing here was obtained by running DF; everything was read from the shipped binary and data files.
