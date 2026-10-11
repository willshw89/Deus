# DF 53.16 World Generation Reference — README and index

**Source analysed:** Dwarf Fortress 53.16 Classic (Windows x64 build of 2026-08-03), binary + data files, no source code
**Status:** research reference for DEUS/Endrath world generation — not a spec, not a work item
**Date:** 2026-10-10
**Legal note:** Reverse-engineered for learning and interoperability; implement original systems, do not port code or data wholesale.

---

## 1. Purpose and legal framing

This folder records a static reverse-engineering study of how Dwarf Fortress (Bay 12 Games, proprietary, closed source) generates its worlds, as design input for DEUS's own generator. It is a design reference only: techniques, data flow and parameter semantics at a conceptual level, never the implementation.

The executable is copyrighted `[DOC:readme.txt]`; its logic is described in our own words and never transcribed (disassembly excerpts stay under eight lines, decompiler output is excluded). The `.txt` and `.lua` files under `vanilla_*` are public domain by the archive's own readme `[DOC:data/vanilla/readme.txt]`, so tokens may be quoted, but word lists, symbol recipes, tuning tables and creature/plant rosters remain Bay 12 content and are not to be imported. Where a one-to-one port would tempt, the documents carry a **copy-risk** note. Porting DF code or data wholesale is not permitted. Pseudocode in 02a, 02b and 03 is original and generic; Lua is quoted at most a line or two per document; DF's default-parameter tables, raw rosters and record layouts are summarised, not reproduced — the full numbers live only in the ledger.

## 2. What was analysed, and what was not

**Analysed.** The unmodified Classic archive: one 26 MB `Dwarf Fortress.exe` (PE32+, MSVC, RTTI present, no PDB), `data/vanilla` with 158 raw files in 25 modules, the Lua procedural layer (19 files), the shipped readme, release notes, file-changes and command-line notes, and the `*_default.txt` init files.

**Not available.** No saves (save layouts come from writer code only), no `prefs/`, no symbols, no DFHack sources, no reachable DF wiki, and no execution: nothing here is a runtime measurement. By Owner decision the civilization/history, Lua myth-layer and PRNG/data-model dives are overviews only.

## 3. Method in brief

strings → xrefs → function anchors → raws/Lua → adversarial verification → ledger.

A string table keyed by file offset exposed the status, rejection and token clusters; a cross-reference scanner tied each string and parameter global to code; `.pdata` gave function boundaries; one full disassembly of `.text` was grepped for call order; angr decompiled the mid-sized functions (not the 24.7 KB map generator); jump tables and MSVC magic divisors were decoded by hand; raws were counted per definition.

Nine analyst reports were then re-examined claim by claim by an independent evidence auditor and, for six, a second domain skeptic. The result is the ledger [`VERIFIED_CLAIMS.md`](VERIFIED_CLAIMS.md) (committed beside these documents): 214 kept claims (155 verified, 6 public, 53 inferred), 14 refuted, 193 auditor extras. Only the ledger decides what these documents may call verified.

## 4. Status vocabulary

| Label | Meaning |
|---|---|
| **verified** | Reproduced in this binary/data by analyst and auditor; stated as fact with an evidence tag and ledger id, e.g. `[BIN:func 0x140f4a790]` *(params_rejection-13)*. |
| **[PUBLIC]** | DF wiki / DFHack df-structures knowledge; consistent with the binary, not established from it. |
| **[INFERRED]** | A reading beyond the evidence (a label, purpose or generalisation); phrased as inference. |
| *refuted* | Contradicted by the binary; kept in the ledger with the correcting verdict, never presented here. |

Tags: `[BIN:func 0xVA]` code; `[BIN:string 0xFO]` string at an exe file offset; `[BIN:rtti]` class name; `[RAW:…]`, `[LUA:…]`, `[DOC:…]` data files. *(auditor extra)* is one notch below verified.

## 5. Documents

| File | Size | One line |
|---|---:|---|
| `00_README.md` | — | This index. |
| `01_triage_architecture.md` | ~5,300 words | Archive and executable facts, tooling, the stage pipeline and its real execution order, the rejection system, seeds, data model, the parameter system at a glance. |
| `02a_core_techniques_physical_world.md` | ~12,300 words | Fractal fields; rivers, erosion, lakes, salinity; biomes and regions; geology and the underground; vegetation and wildlife, with original pseudocode. |
| `02b_core_techniques_living_world.md` | ~6,200 words | Civilization placement, the history simulation, the Lua procedural layer, the rejection/parameter machinery in depth, seeding, save formats. |
| `03_adaptation_tech_catalog.md` | ~8,500 words | Eighteen techniques ranked P0–P2 with a DEUS hook each, and what not to copy. Meant to be acted on; still opens no lane. |
| `04_evidence_appendix.md` | ~8,600 words | Evidence appendix: anchors, address and offset tables, tag conventions and ledger statistics behind the citations in 01–03. |
| `VERIFIED_CLAIMS.md` | ~46,000 words | The adjudicated claims ledger: every analyst claim with its evidence tag, final status, reviewer verdicts, the refuted claims and the reviewers' extra findings. Source of truth for the status labels in 01–04. The nine analyst reports and the decompiler output it was built from are session working files and are deliberately not committed. |

## 6. Headline findings

1. The map generator is one re-entrant state machine on a 16-bit sub-stage word (1..9); a failed check returns 1 (final region check 2) and the caller resets to sub-stage 2 or 1, the RNG stream continuing `[BIN:func 0x140f4a790]` *(params_rejection-13, -14, verified)*.
2. Parameters are one flat 0x4c8-byte record; the ten presets are compiled in and defaults scale with area against a 257×257 reference `[BIN:func 0x140f80330]`, `[BIN:func 0x140f7f810]` *(params_rejection-01, -07, -09, verified)*.
3. All seven climate fields come from one recursive midpoint-displacement routine; bounds are a randomised bounce and "Weighted Range" is five equal buckets `[BIN:func 0x140f554a0]` *(elevation_fields-01, -02, -06, -09, verified)*.
4. 53 numbered checks map to 27 displayed rejection names; "not evenly distributed" is a band-minimum count at 33/66, and "shift down/up" repairs elevation in place by ±10 `[BIN:func 0x140df5fc5]`, `[BIN:func 0x140f4d1df]` *(params_rejection-16, -19, -20, verified)*.
5. Biome is never stored: a 1.2 KB classifier derives one of 42 biomes on demand from elevation (≥150 mountain, <100 ocean), temperature, rainfall, drainage, salinity and a lake flag `[BIN:func 0x140f51940]` *(biomes_regions-01, -02, verified)*.
6. Erosion is the river walk itself; rivers are extracted by a loop-erased trace, flow is the running sum of rainfall, tributaries merge with a trunk swap `[BIN:func 0x140f549b0]`, `[BIN:func 0x140f772f0]` *(hydrology-05, -13, -14, -15, verified)*.
7. Salinity is Chebyshev distance to the coast, {100, 66, 33, 0}; temperature gets a lapse of (elevation−100)²/1000, a squash to Tmax+25 and a wet cap of 166−rainfall `[BIN:func 0x140f4f9d0]`, `[BIN:func 0x140f4f8ae]` *(gap_stage6_salinity_temperature_pass-03, -05, -07, -08, verified)*.
8. Geology seeds about W·H/100 geo-biomes, grows them by a seeded flood, picks layer stone least-used-first and places minerals incrementally per inorganic `[BIN:func 0x140f8b7c0]`, `[BIN:func 0x140d930c0]` *(geology_underground-04, -06, -08, -10, verified)*; the roll rand(MINERAL_SCARCITY) < frequency is *(geology_underground-09)* [INFERRED].
9. The wildlife importer caps wild animal kinds per region at min(50, 7 + tiles/10), matching the 53.16 release note `[BIN:func 0x140f5c390]`, `[DOC:release notes.txt:62]` *(vegetation_wildlife-06, verified)*.
10. One routine names everything from two word tables compiled per symbol recipe `[BIN:func 0x140a8f8e0]` *(gap_name_generation_and_seed_streams-01, -10, verified)*; randomness is a stack of MT19937 buffers, NAME_SEED pushed only to name the world `[BIN:func 0x140eb1820]`, `[BIN:func 0x141438280]` *(gap_name_generation_and_seed_streams-18, -20, verified)*; UI status lines (`[BIN:string 0x1718c30]` onward) mislead about stage work, and stage 9 is a 100 ms time-sliced stepper with a 17-sub-step year machine `[BIN:func 0x140f6b660]` *(gap_post_map_pipeline_order-20, -02, -08, verified)*.

## 7. Known limitations and open questions

**Limitations.** Static analysis only; no saves or symbols; the map generator could not be decompiled; the df-structures cross-check reached one auditor only. The analyst reports contain errors the ledger corrects (RVAs taken for file offsets, UI label order taken for execution order, /6 where the code divides by 12): read a claim's ledger status, not the report prose.

**Open questions carried in the ledger:**

- Where the "not surrounded by the ocean" test for dwarf civilization placement lives; the per-landmass tally in the civ placer `[BIN:func 0x140f60c30]` is the lead.
- Whether the savanna blend threshold of 6 (66 elsewhere in the classifier) is a bug or intentional.
- Why the sink-reachability BFS in the river extraction routine computes a result that is then discarded.
- Who consumes the per-tile uphill-direction nibbles written by the stage-8 pass `[BIN:func 0x140f74cb0]`; the weather-layer reading is a guess.
- What else sets or reads tile flag bit 15 beyond its brook role; where per-site magma pool, deep-special-tube and portal features are built; whether tile field slots 8..23 are ever generated.

## 8. How this folder relates to the rest of `docs/worldgen`

This folder is a reference, not a WBS item. Nothing in it opens a lane, mints a WG id or records an Owner decision. DEUS decisions are made in `DEUS_WORLDGEN_WBS.md` (WG ids, approved by the Owner), the natural-world specifications beside it and the Owner decision log. Document 03 names the DEUS hook a technique could serve; that is a suggestion only. DEUS vocabulary used in the set is quoted from AGENTS.md and the WBS, never redefined here.
