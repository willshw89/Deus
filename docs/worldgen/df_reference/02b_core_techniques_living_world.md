# DF Reference 02b — Core Techniques: The Living World and the Machinery

**Source analysed:** Dwarf Fortress 53.16 Classic (Windows x64 build of 2026-08-03), binary + data files, no source code
**Status:** research reference for DEUS/Endrath world generation — not a spec, not a work item
**Date:** 2026-10-10
**Legal note:** Reverse-engineered for learning and interoperability; implement original systems, do not port code or data wholesale.

Second half of the core-techniques pair. `02a_core_techniques_physical_world.md` (hereafter "02a") covers the physical world; this one covers civilization placement, the history simulation, the Lua procedural layer, the rejection/parameter machinery, seeding, and the on-disk formats.

**Scope note.** Deep dives exist only for the parameter/rejection system and for vegetation/wildlife; the Owner cut the civilization/history, Lua myth-layer and PRNG/data-model dives. Sections 1, 2, 3, 5 and 6 are therefore **overviews** built from the status strings, RTTI class lists, parameter tokens, legends XML tags, save markers, MT19937 facts and Lua inventory recorded in the shared brief, from the two in-scope reports, and from labelled public knowledge. Section 4 is the in-depth part.

**Evidence tags.** `[BIN:string 0x…]` string in the exe (file offset); `[BIN:func 0x…]` code (virtual address); `[BIN:rtti]` class name; `[RAW]`, `[LUA]`, `[DOC]` data files; `[PUBLIC]` public knowledge (DF wiki, DFHack df-structures), not verified here; `[INFERRED]` our inference. Ledger claim ids appear in parentheses, e.g. *(params_rejection-13)*; only *verified* ledger claims are stated as fact about this binary, *inferred* ones are labelled. Two report names are shortened: *gap-NN* = `gap_post_map_pipeline_order-NN` and *gap_name-NN* = `gap_name_generation_and_seed_streams-NN`. Document short labels: 01 = `01_triage_architecture.md`, 02a = `02a_core_techniques_physical_world.md`, 03 = `03_adaptation_tech_catalog.md` (techniques T1…T18), 04 = `04_evidence_appendix.md`.

---

## 1. Civilization placement (overview)

### 1.1 Entity raws are the placement rules

Civilizations are data. The vanilla entity file defines six: MOUNTAIN (dwarves), FOREST (elves), PLAINS (humans), EVIL (goblins), SKULKING (kobolds) and SUBTERRANEAN_ANIMAL_PEOPLES `[RAW:vanilla_entities/objects/entity_default.txt:ENTITY]`. The tokens the placer consults (presence `[RAW]`, semantics `[PUBLIC]`):

| Token | Role as a placement rule |
|---|---|
| `CREATURE:<id>` | The populating race; its biome and alignment constraints carry over |
| `START_BIOME` / `EXCLUSIVE_START_BIOME` (MOUNTAIN uses the exclusive form) | Where the first site may be founded |
| `SETTLEMENT_BIOME`, `BIOME_SUPPORT:<biome>:<n>` (e.g. PLAINS `ANY_OCEAN:12`) | Later-site biomes and their weight in carrying capacity |
| `DEFAULT_SITE_TYPE`, `LIKES_SITE`, `TOLERATES_SITE` (CAVE_DETAILED, TREE_CITY, CITY, DARK_FORTRESS, CAVE) | Site kinds founded and occupied |
| `MAX_STARTING_CIV_NUMBER:100`, `MAX_POP_NUMBER:10000` (2000 for SKULKING), `MAX_SITE_POP_NUMBER:120` | Per-entity caps |
| `SITE_CONTROLLABLE` (only MOUNTAIN) | Playable in fortress mode; the binary carries both `CIV_CONTROLLABLE` and `SITE_CONTROLLABLE` token strings `[BIN:string 0x16b9bc8, 0x16a1ae0]` |
| `LAYER_LINKED` (only SUBTERRANEAN_ANIMAL_PEOPLES) | A cavern-layer civilization |
| `INDOOR_FARMING`, `OUTDOOR_FARMING`, `OUTDOOR_ORCHARDS` | Marks a farming civ (1.3); gating verified *(vegetation_wildlife-18)* |
| `WORLD_CONSTRUCTION:ROAD/BRIDGE/TUNNEL/WALL` | Constructions between sites; matches `world_construction_{road,bridge,tunnel,wall}st` and `_square_` variants `[BIN:rtti]` |

**Copy-risk.** The entity file is public domain by the archive's readme, but its roster and values are Bay 12's design; the handful quoted above identify which tokens the placer reads. DEUS's faction rules are authored from WG.62 and the SRD races, not imported from `entity_default.txt`.

### 1.2 Caps and the controllable-civ requirement

The parameter set carries `TOTAL_CIV_NUMBER` (+0x1b4), `TOTAL_CIV_POPULATION` (+0x374), `SITE_CAP` (+0x378) *(gap_post_map_pipeline_order-14)* and `PLAYABLE_CIVILIZATION_REQUIRED` *(params_rejection-01)*. Defaults scale with area A against a 257² reference: `TOTAL_CIV_NUMBER = 160·A/66049` with size-class floors 5/5/10/24 and ceiling 40; `SITE_CAP = min(A/16, 1500)`; `TOTAL_CIV_POPULATION = 15000` *(params_rejection-09, -10)*. Prehistory init reserves the entity vector to `TOTAL_CIV_NUMBER × 50` — the engine expects on the order of fifty entity records (governments, religions, companies) per civilization *(gap_post_map_pipeline_order-04, inferred overall; the reserve was reproduced)*.

The rejection help text is the only verified statement of the placement rules: "High savagery (66+) blocks civilization placement" `[BIN:string 0x1719950]`; sites need "low-to-mid savagery, evil/good appropriate, biome appropriate squares" `[BIN:string 0x17199f0]`; "Dwarves, for example, require non-evil, non-good, unsavage mountain squares that aren't surrounded by the ocean" `[BIN:string 0x1719df0]`; with few biome types, good/evil regions "often crowd out the civilizations" `[BIN:string 0x1719c60]`; dropping the controllable requirement "will restrict you to adventurers" `[BIN:string 0x1719ce0]`; and missing civilization definitions "cannot be resolved by continuing" `[BIN:string 0x1719b30]`. The `Placing civilizations... (` counter is a **countdown of civs still to place** *(gap_post_map_pipeline_order-15)*, and civ placement runs on the HISTORY_SEED stream (section 5).

### 1.3 Crops come from local plants

Starting crops are the plants the wildlife importer put in the home region (02a §5). After *all* entities are founded, one scan over the entity vector applies an orchard test to entities with `INDOOR/OUTDOOR_ORCHARDS` and a field-crop test to those with `INDOOR/OUTDOOR_FARMING`; an empty list logs "Placed farming entity without (non-)orchard crops" and rejects the map *(vegetation_wildlife-18)*. Help text: "Civilizations use available plants in their surroundings as their initial crops" `[BIN:string 0x1719f20]`. This is why wildlife runs before civilizations.

### 1.4 Cave civilizations

A dedicated placer phase, `Making cave civilizations...` `[BIN:string 0x1718d60]`, runs after cave populations and before surface civilizations (2.2). `[PUBLIC]` It founds the `LAYER_LINKED` entity in the cavern layers; that entity has no biome tokens at all `[RAW:entity_default.txt]`. Nothing deeper was analysed.

---

## 2. The historical simulation as a zero-player strategy game (overview)

### 2.1 Entry: stage 9 of the map generator

Stage 8 runs the wildlife importer and a per-tile initialisation pass, then advances to stage 9 and zeroes eight *prehistory phase bytes* with one 8-byte store *(gap_post_map_pipeline_order-01)*. Stage 9 is one re-entrant "stepper" called in a loop bounded by **100 ms of `GetTickCount` per frame**; a finished-with-reject return yields rejection code 2 *(gap-02)*. The stepper's mode comes from the world year (1 at stage 1) and the phase bytes: year 1 + first byte clear → prehistory init; year 1 + last byte clear → placer; otherwise the year machine *(gap-03)*. Prehistory init resets the stepper, runs the nine `Final <biome> region count fails by` checks (checkpoint 3, section 4.5), clears history scratch and reserves the figure and entity vectors from `TOTAL_CIV_POPULATION` and `TOTAL_CIV_NUMBER × 50` *(gap-04, inferred overall)*.

### 2.2 Prehistory: the placer phases

Seven phases in fixed order, each setting the next phase byte; the label shown while byte *k* is highest names the phase actually running — no off-by-one *(gap-06)*:

| Phase | Label `[BIN:string]` | Verified content |
|---|---|---|
| A caves | `Placing caves... (` 0x171a488; count = MOUNTAIN_CAVE_MIN + NON_MOUNTAIN_CAVE_MIN *(gap-15)* | cave rejections, ids 35–38 *(params_rejection-15)* |
| B good/evil | `Placing good/evil...` 0x171a4a0 | the good/evil placer `0x140f5f2f0` is called from inside the placer right after the cave checks *(biomes_regions-17)*; its rules are in 02a §3 |
| C megabeasts | `Placing megabeasts...` 0x1718d18 | pushes HISTORY_SEED *(gap-13)*; MEGABEAST_CAP loop *(vegetation_wildlife-17)* |
| D other beasts | `Placing other beasts...` 0x1718d30 | TITAN_NUMBER titans in non-ocean, non-lake regions; reads DEMON_NUMBER and night-creature counts *(vegetation_wildlife-17)*; copies CREATURE_SEED for Lua *(gap_name-22, inferred)* |
| E cave pops | `Making cave pops...` 0x1718d48 | not traced |
| F cave civs | `Making cave civilizations...` 0x1718d60 | not traced; falls straight into G (auditor) |
| G civilizations | `Placing civilizations... (` 0x1718cb0 | entity rejections 39–42, 52; SEMIMEGABEAST_CAP placed *after* civs *(vegetation_wildlife-17)*; spans many stepper calls (auditor, refuting "one phase per call") |

Then `Finished prehistory...` `[BIN:string 0x1718cd0]` and the year machine begins.

### 2.3 The year loop

History is a **17-sub-step machine** (0..16), one sub-step per call; step 13 increments the year and step 16 resets the counter or sets the finish flag *(gap-08)*. Verified skeleton: steps 6–7 are budget-limited placement loops, `min(300, 5 + W·H/100)` and additionally `≤ year` for step 7, with an early exit on a coin flip past half budget or ten failures *(gap-16)* — a ramp that keeps early history sparse; steps 8–10 and 12 call per-entity/per-site routines whose strings name nobility, religious positions, site realisation with loot, guilds, merchant companies, mercenaries, bandits, troupes and scholars *(gap-17, inferred labels)*; step 14 visits every historical figure *(gap-18)*; step 16 recomputes ages ("The world has passed into"), writes a region snapshot every 10th year, flushes a pending list past 5000 entries or every 100 years, and drops a per-16×16-block cache *(gap-10)*. `[PUBLIC]` The rules inside — wars, succession, migration, artifacts, secrets — are the zero-player game; only the skeleton was verified.

### 2.4 Stop rules and the beast-stoppage rule

At step 16 the finish flag is set when "Use world now" was pressed, or `year ≥ END_YEAR`, or `year ≥ BEAST_END_YEAR` with the percentage ≠ −1, more than three beasts placed, and the living-megabeast list no larger than `total × (100 − pct) / 100` (minimum 1 when pct < 100) *(gap-09)*. `BEAST_END_YEAR` is a two-value token — "Year to Begin Checking Megabeast Percentage", "Percentage Beasts Dead For Stoppage" `[BIN:string 0x1716068, 0x17160a0]` *(gap-23, inferred; writer emission reproduced)*. Megabeasts are **counted, lair-bound history actors**: the raws define four megabeasts and four semimegabeasts and zero titans or forgotten beasts (procedural) *(vegetation_wildlife-21)*, and wild populations exclude the boss flags *(vegetation_wildlife-22, inferred)*. `[PUBLIC]` Ages are recomputed from surviving megabeasts; this rule drives the Myth → Legends → Heroes progression.

### 2.5 Finish, realization, constructions

On finish the generator processes **one element per frame** through four lists — civ materials, art, uniforms, sites — as `Finalizing … ( n / N )` *(gap-11)*, then eight post-passes, an RNG pop and stage 10 *(gap-12)*. `Recounting legends...` is a static status line, not a work item *(gap-07)*. RTTI shows the realised-site model (`site_realization_building_info_{castle_courtyard,castle_tower,castle_wall,hillock_house,market_square,shop_house,shrine,tree_house,trenches}st`), world constructions with per-square records (`world_construction_square_*st`, `block_square_event_world_constructionst`) and a `history_event_created_world_constructionst` `[BIN:rtti]`. `[PUBLIC]` Realization is lazy: the abstract site exists from world-gen; its layout is built when visited or exported.

### 2.6 The event vocabulary

RTTI lists **153** `history_event_*st` names — 134 event classes plus 19 `history_event_collection*st` (base + 18 kinds) `[BIN:rtti]`; the brief's "~70" undercounts. Own thematic grouping (prefix omitted):

| Theme | Representative classes |
|---|---|
| Figure lifecycle | `hist_figure_died/wounded/revived/abducted/travel/reunion/reach_summit/new_pet`, `change_hf_state/job/mood/body_state`, `change_creature_type`, `assume_identity`, `creature_devoured`, `hf_enslaved/freed/ransomed/convicted/interrogated/confronted/preach`, `hf_does_interaction`, `gamble` |
| Links and intrigue | `add/remove_hf_{entity,hf,site}_link`, `add_hf_entity_honor`, `hfs_formed_reputation/intrigue_relationship`, `hf_relationship_denied`, `hf_gains_secret_goal`, `hf_learns_secret`, `failed_intrigue_corruption`, `failed_frame_attempt` |
| Entities and politics | `entity_created/dissolved/incorporated/law/action/alliance_formed/overthrown/persecuted/expels_hf/fled_site/equipment_purchase`, `create_entity_position`, `regionpop_incorporated_into_entity`, `insurrection_started/ended`, `first_contact(_failed)`, `diplomat_lost`, `merchant`, `trade`, `agreement_formed/concluded`, `agreements_voided`, `topicagreement_made/concluded/rejected` |
| Sites and buildings | `created_site`, `site_died/retired/dispute/surrendered`, `reclaim_site`, `created/modified/replaced_building`, `hf/entity_razed_building`, `entity_rampaged_in_site`, `hf_attacked/destroyed_site`, `sneak_into_site`, `spotted_leaving_site`, `created_world_construction`, `entity_breach_feature_layer`, `item_stolen`, `sabotage` |
| War | `war_attacked/destroyed/plundered_site`, `war_field_battle`, `war_peace_accepted/rejected`, `war_site_new_leader/taken_over/tribute_forced`, `squad_vs_squad`, `tactical_situation` |
| Artifacts and masterworks | `artifact_created/claim_formed/copied/destroyed/dropped/found/given/hidden/lost/possessed/recovered/stored/transformed`, `hf_act_on_artifact`, `masterpiece_created` (+ `_arch_construct/_dye_item/_engraving/_food/_item/_item_improvement`), `masterpiece_lost` |
| Culture and knowledge | `knowledge_discovered`, `written_content_composed`, `poetic/musical/dance_form_created`, `performance`, `procession`, `ceremony`, `competition` |
| Collections | `collection_abduction/battle/beast_attack/ceremony/competition/duel/entity_overthrown/insurrection/journey/occasion/performance/persecution/procession/purge/raid/site_conquered/theft/war` |

Two ideas transfer: events are immutable id-keyed facts (the `Events:` counter is just the vector size *(gap-18)*), and collections are a second-level grouping (a war contains battles) that makes legends readable.

**Copy-risk.** The class list is DF's event taxonomy, reproduced from RTTI as inventory; DEUS's typed events (WG.63.03, WG.63.06, WG.65.16) are named from DEUS systems, and the year-loop budgets quoted in 2.3 are DF's pacing constants, not targets.

### 2.7 Culling and legends recounting

`CULL_HISTORICAL_FIGURES` and `REVEAL_ALL_HISTORY` are parameters *(params_rejection-01)*; LARGE ISLAND sets culling (+0x49c) to 0 *(params_rejection-12)*. `[PUBLIC]` Culling drops unimportant dead figures to bound save size; reveal-all controls what legends mode shows. The summary screen prints the age (`Unknown Age` fallback), the year, `Historical figures:` as the figures-vector size and `Events:` / `An abridged chronicle (` as the events-vector size *(gap-18; gap-19 inferred for vector identities)*.

---

## 3. The Lua procedural layer (overview)

### 3.1 What is generated

53.x generates its *procedural raw objects* in Lua: `data/init/generators.lua`, `data/init/globals.lua`, `vanilla_procedural/scripts/init.lua` and the generators `creatures.lua` (+ `creatures/rcp.lua`, `creatures/shared_info.lua`), `divine.lua`, `entities.lua`, `evil.lua`, `interactions.lua` (+ `interactions/{blessing,curse,disturbance,item_power,mythical,secret}.lua`), `items.lua`, `language.lua`, `materials.lua` `[LUA]` — forgotten beasts, titans, demons, night creatures, angels, divine and mythical materials, vault/mythical guardian entities, curses, blessings, secrets, disturbances, item powers, evil weather and the languages of generated beings `[LUA:generators.lua:generate_random_*]`.

### 3.2 The engine → Lua contract

The engine owns one entry point, `generate` (brief anchor `0x140eca3a0`, strings `generate`, `Error generating objects`), called twice: at map stage 1 with a **copy of SEED** *(gap_post_map_pipeline_order-22, inferred overall; hand-off reproduced)* — the Lua entry nests its own stream so object generation does not perturb the map stream (auditor, params_rejection-27) — and from the placer's "other beasts" phase with **CREATURE_SEED** *(gap_name-22, inferred)*.

Lua reads a table `random_object_parameters`: `pre_gen_randoms`, `main_world_randoms`, `token_prefix`, `source_hfid`, `source_enid`, `source_hf`, `mythical_sphere`, `use_divine_materials`, `use_mythical_materials`, `allow_mythical_healing`, `entity_def_number_mythical/guardian`, `night_creature_def_number_bogeyman`, `werebeast_count`, `evil_cloud_number`, `evil_rain_number`, `cloud_states`, `experimenter_creature` `[LUA:grep over the scripts]`, plus the brief's `demon_def_number`, `night_creature_def_number_*`, `angel_def_number_*` — the Lua-facing names of the `*_NUMBER` and `GENERATE_*`/`ALLOW_*` parameters. `generate()` runs a `do_once_early` set when `pre_gen_randoms` is set ("At the start of worldgen, before map generation") and a `do_once` set plus languages when `main_world_randoms` is set ("A step in 'generating prehistory', right before history starts") `[LUA:generators.lua:generate]`. `[INFERRED]` Stage-1 call = `pre_gen_randoms`, placer call = `main_world_randoms`; the flag values at each call were not read from the binary.

Engine-provided functions (no Lua definition): `trandom(n)`, `get_random_inorganic`, and `raws.register_{inorganics,items,languages,creatures,interactions,entities}` `[LUA:generators.lua:96–826]`. `one_in`, `generate_from_list`, `pick_random*`, `pairsByKeys`, `get_random_sphere_noun/adjective`, `add_generated_info` are plain Lua in `globals.lua`/`generators.lua` built on `trandom` (the brief lists some of these as engine functions; they are not). The contract is tiny: a parameters table in, a random source, finished raw objects out.

### 3.3 "Generate raws as text, then parse"

Generators assemble **raw-file text lines**: `lines[#lines+1]="[USE_MATERIAL_TEMPLATE:METAL_TEMPLATE]"`, `lines[#lines+1]="[STATE_NAME_ADJ:LIQUID:"..name_str.."]"` `[LUA:materials.lua:142,217]`; `add_generated_info` appends `[GENERATED]` and, when set, `[SOURCE_HFID:n]`/`[SOURCE_ENID:n]` `[LUA:generators.lua:add_generated_info]`; then `raws.register_*` feeds the **same parser the data files use**. Generated objects are indistinguishable from authored ones, every modder token is available, provenance points back to the causing figure or entity, and the generator is debuggable by printing text.

### 3.4 Spheres as connective tissue

A *sphere* (fire, death, fertility, mountains…) lets independent generators agree. `shared_info.lua` builds `sphere_info` via `populate_sphere_info` and `sphere_random_creature_materials`; `divine.lua` keys `metal_by_sphere` and `silk_by_sphere`; `materials.lua`, `item_power.lua`, `mythical.lua`, `secret.lua` and `creatures.lua` consult the current sphere; the engine passes `mythical_sphere` in; `globals.lua` offers `get_random_sphere_noun/adjective` `[LUA]`. The legends "Making Maps" screen references sphere names (brief anchor `0x140ee2360`). `[PUBLIC]` Gods, their artifacts, curses and touched regions share spheres, so a death god begets a necromancer's secret and a matching mythical material.

### 3.5 Determinism

`pairs` order is unspecified, so `globals.lua` defines `pairsByKeys` and uses it "so the RNG seed is stable", noting where arrays must be pre-sorted `[LUA:globals.lua:1,34,50,120,130,173]`. Randomness comes only from `trandom` on the nested stream; `generate()` warns it runs "every time … (you cannot predict when this happens!)" and keeps per-run work in `preprocess`/`postprocess` hooks `[LUA:generators.lua:generate]`.

**Copy-risk note.** Scripts, word lists, sphere tables and recipes are Bay 12 content. Reuse the *pattern* — one entry point, flat parameters, engine RNG, text-raw assembly with provenance, sorted iteration — with DEUS's own generators and tokens.

---

## 4. The rejection / validation loop and the parameter system (in depth)

### 4.1 The parameter record

A parameter set is one flat **0x4c8-byte struct**. The serialiser emits, in order: `[WORLD_GEN]`, `TITLE`, `CUSTOM_NAME`, `SEED`, `HISTORY_SEED`, `NAME_SEED`, `CREATURE_SEED`, `DIM`, `EMBARK_POINTS`, `END_YEAR`, `BEAST_END_YEAR`, `REVEAL_ALL_HISTORY`, `CULL_HISTORICAL_FIGURES`, six field lines, six `*_FREQUENCY` lines, `POLE`, `REAL_WORLD_EXTINCT`, creature/interaction counts, nine `GENERATE_*`/`ALLOW_*` flags, `GOOD/EVIL_SQ_COUNTS`, `PEAK_NUMBER_MIN`, `PARTIAL/COMPLETE_OCEAN_EDGE_MIN`, `VOLCANO_MIN`, nine `REGION_COUNTS`, `EROSION_CYCLE_COUNT`, `RIVER_MINS`, `PERIODICALLY_ERODE_EXTREMES`, `OROGRAPHIC_PRECIPITATION`, `SUBREGION_MAX`, cavern-layer and z-level tokens, cave tokens, `MYTHICAL_SITE_NUM`, `ALL_CAVES_VISIBLE`, `SHOW_EMBARK_TUNNEL`, `TOTAL_CIV_NUMBER`, `TOTAL_CIV_POPULATION`, `SITE_CAP`, `PLAYABLE_CIVILIZATION_REQUIRED`, five `*_RANGES`, optional `PS_*` rows *(params_rejection-01)*.

| Token family | Verified semantics |
|---|---|
| `[FIELD:min:max:xvar:yvar]` ×6 | Four `int[24]` arrays; the writer names indices 0,1,3,5,6,7 *(params_rejection-02)*. `[PUBLIC]` The 24-entry enum has 2 = VEGETATION (derived), 4 = EVIL, 8–14 airmass/weather/salinity; the auditor confirmed index 2 is the vegetation slot. |
| `[FIELD_FREQUENCY:mesh:w1..w5]` | One mesh index + five band weights. **1 = Ignore, 2 = 2×2, 3 = 4×4, 4 = 8×8, 5 = 16×16, 6 = 32×32** (auditor extra: the analyst's 0-based reading, params_rejection-03, was refuted; the editor widget binds 1..6 with 1 = "Ignore"). Default presets ship with mesh 1, i.e. weighting off. |
| `[FIELD_RANGES:low:mid:high]` | Minimum square counts per band; stored (mid, low, high) *(params_rejection-04)*. |
| `[REGION_COUNTS:biome:a:b:c]` | (min initial squares, min initial regions, min final regions); index 0 SWAMP, 1 DESERT, 2 FOREST, 3 MOUNTAINS, 4 OCEAN, 5 skipped (`[PUBLIC]` LAKE), 6 GLACIER, 7 TUNDRA, 8 GRASSLAND, 9 HILLS *(params_rejection-05)*. |
| `POLE` | 0 written `NONE`, 1 NORTH_OR_SOUTH, 2 NORTH_AND_OR_SOUTH, 3 NORTH, 4 SOUTH, 5 NORTH_AND_SOUTH; default 1 if dim_y ≤ 33 else 2 *(params_rejection-06)*. |
| `REAL_WORLD_EXTINCT` | 0 EXTINCT, 1 ISOLATED, 2 UNTAMED_WILDS (default), 3 WILDERNESS, 4 DOMESTICATED (auditor); UI texts verified *(vegetation_wildlife-13)*. |
| `BEAST_END_YEAR` | year, percentage *(gap-23, inferred; emission reproduced)*. |

The editor runs on a reflection layer — `world_gen_param_{base,char,flag,flagarray,member,seed,value}st` `[BIN:rtti]` — one descriptor per field kind, which is how a 100-field record gets a generic UI and text round-trip. Hand-painted `PS_EL/RF/TP/DR/VL/SV` rows hang off a pointer at +0x490; a field with rows skips its terrain checks *(params_rejection-23)*; the loader guards with "Attempted to set world gen presets prior to dimensions" `[BIN:string 0x1718140]`.

### 4.2 Parameter families by consumer

| Family | Tokens | Consumer |
|---|---|---|
| Field synthesis | per-field min/max/variance, mesh + weights, `POLE`, `PS_*` | sub-stage 2 |
| Terrain validation | `PEAK_NUMBER_MIN`, `ELEVATION_RANGES`, edge-ocean minimums, four `*_RANGES`, `REGION_COUNTS[].squares`, `VOLCANO_MIN` | sub-stage 3 (`ELEVATION_RANGES` again in 7) |
| Regions/rivers/erosion | `REGION_COUNTS[].initial_regions`, `RIVER_MINS`, `EROSION_CYCLE_COUNT`, `PERIODICALLY_ERODE_EXTREMES`, `OROGRAPHIC_PRECIPITATION`, `SUBREGION_MAX` | sub-stages 4–6 |
| Caves and civs | `MOUNTAIN/NON_MOUNTAIN_CAVE_MIN`, `CAVE_MIN/MAX_SIZE`, `TOTAL_CIV_NUMBER`, `PLAYABLE_CIVILIZATION_REQUIRED`, `GOOD/EVIL_SQ_COUNTS`, `MYTHICAL_SITE_NUM` | placer |
| Final check | `REGION_COUNTS[].final_regions` | stepper init |
| History only | `END_YEAR`, `BEAST_END_YEAR`, `TOTAL_CIV_POPULATION`, `SITE_CAP`, beast caps, `*_NUMBER`, `*_ATTACK_TRIGGER`, `GENERATE_*`/`ALLOW_*`, `CULL_*`, `REVEAL_*` | placer, year loop, Lua |
| Underground | `MINERAL_SCARCITY`, `CAVERN_LAYER_*`, `HAVE_BOTTOM_LAYER_*`, `LEVELS_ABOVE_LAYER_1..5`, `LEVELS_AT_BOTTOM` | sub-stage 6 geology/mineral and cavern builders *(geology_underground-01 inferred, -16)* |
| Local map only | `LEVELS_ABOVE_GROUND`, `ALL_CAVES_VISIBLE`, `SHOW_EMBARK_TUNNEL`, `EMBARK_POINTS` | embark/site code *(geology_underground-19 inferred)* |

(Grouping from the analyst report, corrected to the stage map of `01_triage_architecture.md` §3.3; the offsets are verified, the grouping is descriptive.)

### 4.3 Presets are compiled in; every default is a function of area

The loader reads `prefs/world_gen.txt` `[BIN:string 0x17167a0]` first, rejecting unknown tokens with `Unrecognized World Gen Token:` `[BIN:string 0x17172d8]`. Only if that yields no `[WORLD_GEN]` block does it synthesise LARGE, MEDIUM, SMALL, SMALLER, POCKET × ISLAND, REGION at 257, 129, 65, 33, 17 squares a side, and it never writes them back *(params_rejection-07)*. If a named set is missing at generation time the stage worker — which references `MEDIUM ISLAND` (brief anchor) — falls back to a default (` not found -- using default.` `[BIN:string 0x1719fc8]`).

A REGION preset is constructor + title + dimensions + one **dimension-default function**; an ISLAND preset adds overrides: four complete ocean edges and no partial-edge requirement, lower peak/volcano/river/cave minimums, explicit `ELEVATION_RANGES` and `REGION_COUNTS` *(params_rejection-08, -12)*. The default function scales every count-like minimum by `scale(k) = A·k/66049` (A = w·h; 66049 = 257²) and gives each token a small floor — peaks `max(1, scale 50)` and rivers `max(1, scale 400)` are representative — with the edge-ocean, volcano, cave, mythical-site and beast minimums following the same shape and the civilisation defaults as in 1.2 *(params_rejection-09)*. The non-scaled defaults are the ones the editor shows (field ranges 1..400 for elevation, 0..100 for the percentage fields, 25..75 for temperature; border variances proportional to the dimension; `END_YEAR` 250, `EROSION_CYCLE_COUNT` 250, `SUBREGION_MAX` 2750); `BEAST_END_YEAR` steps by size class; the interaction, demon and night-creature counts are `A/2^n + c` forms; `ELEVATION_RANGES` and the `REGION_COUNTS` square minimums are fixed fractions of A; all meshes are 1 *(params_rejection-10)*. The initial- and final-region `REGION_COUNTS` are per-biome `scale(k)` multipliers; the analyst's set was **refuted** and the auditors' corrected vectors are recorded in the ledger verdict, together with two conditions: glacier/tundra counts are zero unless both dimensions exceed 257, and the four non-elevation `*_RANGES` plus `REGION_COUNTS` are zero below 65². The per-token constant table behind these sentences is DF's tuning and is intentionally not reproduced in this set.

**Copy-risk note.** These numbers encode DF's biome balance. Take the *shape* — one record, one `scale(k)` against a reference area, a few size-class floors, islands as overrides — and derive Endrath's constants from its own biome table.

### 4.4 A re-entrant state machine with a two-level retry

The generator is keyed on a global 16-bit sub-stage: 1 init (clear world, allocate the W×H tiles, year := 1, Lua `generate`); 2 fields (sentinel clear, mesh seeding, border lines, edge-ocean retry, volcanism hotspots, interior fill); 3 terrain checks (latitude term, peaks, bands with shift down/up, edge oceans, 33/66 evenness, initial biome square counts, vegetation seed, volcano count, elevation compression); 4 first region build with the region-count and river-start checks, then one erosion cycle per tick and the final-river sweep; 5 lakes from sinks, the majority fixpoint and the loop-erase river extraction; 6 terrain finalisation (slope ramp, volcano cones, valley flattening, orographic rain, temperature corrections, vegetation, salinity), second region build, `SUBREGION_MAX`, river-sort check and parameter dump, then sliced geology/minerals and caverns on later ticks; 7 post-erosion altitude checks; 8 wildlife importer and a per-tile initialisation pass; 9 final region checks, prehistory placer and year machine; 10 done. The worker calls it while 1 ≤ state ≤ 9, one sub-stage per call *(params_rejection-13; the stage contents are the ladder of `01_triage_architecture.md` §3.3 and its ledger ids)*. Status text follows `state ≥ N`: `Preparing elevation...` ≥1, `Setting temperature...` ≥2, `Running rivers...` ≥3, `Forming lakes` + ` and minerals...` ≥4, `Growing vegetation...` ≥5, `Verifying terrain...` ≥6, `Importing wildlife...` ≥7 *(params_rejection-25)*, and the labels tend to describe the *next* block's work *(gap-20)*.

**No retry loop lives inside the generator.** Every failing check jumps to a common exit returning 1; the final region check returns 2. The worker increments a counter shown as `(N rejected)` `[BIN:string 0x1718c48]` and resets the sub-stage **to 2 for code 1** (regenerate fields; init, seeding and Lua skipped) or **to 1 for code 2** (full re-init); neither path reseeds *(params_rejection-14)*. Allow flags survive retries (the sub-stage-1 reset clears a counter and vectors, not the flags — auditor). Because the SEED stream is pushed once in world init and popped only at stage 10 or on abort, retries continue the same stream, so seed + parameters reproduce the same *rejection sequence* (refutation verdict on params_rejection-27; `[PUBLIC]` matches observed behaviour).

### 4.5 The 53 message ids, the 27 displayed rejection types and the three checkpoints

Every check calls one log writer with (message, id). In check order *(params_rejection-15)*:

| Ids | Check | Where |
|---|---|---|
| 0 | Not enough peaks | sub-stage 3 |
| 1 | Not enough medium altitudes | 3 |
| 2, 3 | medium / low after **shift down** | 3 |
| 4, 5 | medium / high after **shift up** (logged 5 then 4) | 3 |
| 6 | Not enough partial / complete edge oceans | 3 |
| 7–10 | Rainfall / Flat-rough (drainage) / Savagery / Volcanism not evenly distributed | 3 |
| 11–19 | **Checkpoint 1:** `Initial <biome> square count fails by` — swamp, desert, forest, mountain, ocean, glacier, tundra, grassland, hill | 3 |
| 20 | Not enough volcanos | 3 |
| 21–29 | **Checkpoint 2:** `<Biome> region count fails by` (same order) | 4 |
| 30 | Not enough river start points before erosion | 4 |
| 31 | Too many distinct subregions (over by …) | 6 |
| 32–34 | Not enough medium / low / high altitude locations after erosion | 7 |
| 35–38 | Not enough mountain / low-lying cave locations (+ "after location check") | placer A |
| 39–42 | Not enough entity placement locations / No entity definitions / No controllable definitions / Did not place controllable entity | placer G |
| 43–51 | **Checkpoint 3:** `Final <biome> region count fails by` | stepper init |
| 52 | Placed farming entity without orchard / non-orchard crops | placer G |

The UI folds the 53 ids onto 27 display names through a 53-byte index table and a jump table *(params_rejection-16)*: 1, 2, 4, 32 → MEDIUM ELEVATION REJECTION; 3, 33 → LOW; 5, 34 → HIGH; 0 LACK OF PEAKS; 6 LACK OF EDGE OCEANS; 7–10 RAINFALL/DRAINAGE/SAVAGERY/VOLCANISM REJECTION; 11–19, 21–29, 43–51 → the nine biome REJECTIONs (one name per biome, whichever checkpoint); 20 LACK OF VOLCANOS; 30 LACK OF RIVERS; 31 TOO MANY REGIONS; 35–36 LACK OF MOUNTAIN CAVES; 37–38 LACK OF LOW-LYING CAVES; 39 UNABLE TO PLACE ENOUGH CIVILIZATIONS; 40 NO CIVILIZATIONS AVAILABLE; 41–42 UNABLE TO PLACE CONTROLLABLE CIVILIZATION; 52 FARMING CIVILIZATION PLACED WITHOUT CROPS. That is the full 27-name vocabulary (index table 0..26).

**Copy-risk.** The id list and its many-to-one name map are reproduced to show the mechanism; both are DF's. DEUS's check table (03, T2) is generated from its own acceptance tests, with its own ids and names.

The three checkpoints are the heart of the design: the same biome requirement is tested **as raw squares before erosion**, **as connected regions after region building**, and **as final regions after everything** including good/evil rebuilds and civ placement. Early checkpoints are cheap and catch most bad fields; the last is expensive (code 2, full re-init) but rare.

### 4.6 What the terrain checks compute

- **Peaks (id 0)** are a *placement*: tiles ≥ 400 are clamped to 399, tiles ≥ 380 become candidates, `min(PEAK_NUMBER_MIN, candidates)` are chosen — first at random, the rest farthest-first by Manhattan distance — set to exactly 400, flagged and recorded; the rejection fires when candidates < `PEAK_NUMBER_MIN` *(params_rejection-21, auditor reading)*. Help text: "Can the elevation 400 be placed enough times to provide space for your peaks?" `[BIN:string 0x17173f0]`.
- **Elevation bands** < 100 / 100–299 / ≥ 300 ("elevations between 100 and 299", "between 300 and 400" `[BIN:string 0x17174e8, 0x1717818]`). **Shift down** repairs in place: up to three passes subtract 10 from every tile below 300 (clamp ≥ 1), recounting until the low minimum holds; **shift up** adds 10 to tiles in [100, 400) clamped to 399 so peaks stay the only 400s; ids 2/4 are tested only when the pass budget is spent *(params_rejection-19)*.
- **Edge oceans (id 6):** tiles below 100 along each edge; *complete* = all, *partial* = at least 1/8; totals against `PARTIAL/COMPLETE_OCEAN_EDGE_MIN` *(params_rejection-22)*.
- **"Not evenly distributed" (7–10)** is a misnomer: one pass bins rainfall, drainage, savagery, volcanism into < 33 / 33–65 / ≥ 66 and compares counts with `*_RANGES`; the same pass computes vegetation and histograms the derived biome for checkpoint 1; no variance measure *(params_rejection-20)*.
- **Biome derivation** per the help text `[BIN:string 0x1718050–0x17195d0]`: swamp = mid-elevation, mid-to-high rain, low drainage, non-freezing; forest = mid, high rain, high drainage, non-freezing; desert = mid, very low rain, non-freezing; mountains = high elevation; ocean = low; tundra = mid, low-to-mid drainage, freezing; glacier = mid, very high drainage, freezing; grassland = mid, low-to-mid rain, low-to-mid drainage, non-freezing; hills = mid, low-to-mid rain, high drainage, non-freezing. River starts need mountain squares, mountain caves *border* mountain squares, low-lying caves mid-elevation squares `[BIN:string 0x1719520, 0x17198d0, 0x17197a0]`.
- **Subregions (31):** `SUBREGION_MAX`; remedy: parameters that "aren't so variable that biomes change frequently" `[BIN:string 0x1719700]`.
- **Painted presets** bypass a field's checks; the subregion check needs EL+RF+TP+DR rows to be bypassed *(params_rejection-23)*.

**Copy-risk.** The thresholds in these bullets (380/400, ±10, 1/8, 33/66, 100/300) are DF tuning; the help-text rules are user-facing and may be paraphrased freely. Keep "repair before reject" and "the shortfall is the diagnosis"; set Endrath's bands in feet.

### 4.7 Allow flags, UX, help text

A per-id allow array gates each check. `ALLOW THIS REJECTION TYPE and continue reporting others.` `[BIN:string 0x171a898]` sets every id mapping to the chosen name (MEDIUM ELEVATION → 1, 2, 4, 32); `ALLOW ALL REJECTS, even if I end up with a legends-only world!` `[BIN:string 0x171a858]` memsets the array *(params_rejection-17, inferred as "gates every check": the id-52 farming flag is written but never read, so that rejection cannot be suppressed)*. Other options: `ABORT NOW and I'll look over my parameters.` `[BIN:string 0x171a8d8]`, `CONTINUE until you give me another warning.` `[BIN:string 0x171a798]`; abort logs `World generation manually aborted.` `[BIN:string 0x1717338]`.

In interactive mode (option word −1) the worker builds a **help text** for the last id *(params_rejection-14)*. Every block has the same three-sentence shape — the problem ("The world generator is having trouble placing enough mountain peaks." `[BIN:string 0x17174a0]`), what to check ("Make sure your parameters and presets can support high elevation areas." `[BIN:string 0x1718f90]`), the alternative ("Alternatively, you can reduce the number of peaks required by the parameters." `[BIN:string 0x1717580]`) — and the checkpoints feed one "fails by N" shortfall into it. The shortfall *is* the diagnosis.

### 4.8 Logging and bookkeeping

The log writer takes (message, id), increments a per-id rejection counter, stores the id as "last reject", and appends to `map_rejection_log.txt` `[BIN:string 0x1697c60]` only when the init flag `LOG_MAP_REJECTS` `[BIN:string 0x16a3a08]` is YES — a boolean, not a level *(params_rejection-18, inferred; the auditors replaced the analyst's "last message global" with a per-id counter array)*. Internal inconsistencies such as a river-sorting failure take a separate **world-gen error** path: "A world gen error from DF … will be logged after parameter dump." to `errorlog.txt`, then the whole active parameter set through the same `[WORLD_GEN]` writer, once *(params_rejection-24)*. The worldgen-status serializer stores `stage`, `rejects`, `reject_type`, `last_reject`, `new_dimx`, `geo_index`, `finalizing_*` and `last_used_{seed,history_seed,name_seed,creature_seed}` *(gap_name-25)*, so a save made mid-generation can resume with its resolved seeds. `[PUBLIC]` The layout matches DFHack's `world_generatorst`.

### 4.9 The loop, in our own words

```
load_parameter_sets():
    sets = parse(user_parameter_file)                  # one record per set
    if sets is empty:
        for side in SIZE_LADDER, kind in (ISLAND, REGION):
            p = defaults_for_area(side * side)         # minimums = scale(k), a few floors
            if kind == ISLAND: p.apply_island_overrides()
            sets.append(p)

worker.frame():
    if stage in RUNNING_STAGES:
        code = generator.step()                        # exactly one sub-stage
        if code != OK:
            rejects += 1
            stage = INIT if code == HARD_FAIL else FIELDS   # soft fail redoes fields; hard fail re-inits
            if interactive: show help(last_check); offer allow-this / allow-all / continue / abort
            # the random stream is NOT reseeded

generator.step():
    case INIT:      clear world; allocate the cell grid; content_generator.run(copy of map seed)
    case FIELDS:    synthesise the climate fields (mesh/weights/variance, painted rows)
    case CHECKS:    peaks (place) → bands with shift-down/up repair → edge oceans
                    → band minimums per field (+ vegetation, biome histogram) → checkpoint 1 → volcanos
    case REGIONS .. POST_EROSION:
                    regions → checkpoint 2 → river starts → erosion → rivers → subregion cap → post-erosion bands
    case WILDLIFE:  import populations per region
    case HISTORY:   stepper under a frame budget: init (checkpoint 3) → placer phases → years → finalise
    each check: if fails(check) and not allow[check]: log(check, shortfall); return SOFT_FAIL (HARD_FAIL for checkpoint 3)
```

### 4.10 Adaptation notes for DEUS/Endrath

1. **One flat record, text round-trip, reflection-driven editor** — a hundred knobs for no UI code.
2. **Defaults as functions of area** with a few size-class floors; islands as overrides.
3. **Numbered checklist, many-to-one display names, one allow flag per check** — and make sure every flag is read (DF's id 52 is not).
4. **Repair before reject** (the ±10 re-bias) for the checks that fail most.
5. **Three checkpoints at three costs**, retry at the cheapest sufficient level, keep the stream running so retries differ while the sequence stays reproducible.
6. **Re-entrancy by sub-stage with a per-frame budget** keeps the UI alive and runs headless unchanged.
7. **Copy-risk:** 33/66 and 100/300 bands, per-biome fractions, the 66049 reference and the derivation rules are DF's tuning; derive Endrath's from its eight-layer depth model and biome table.

---

## 5. Seeding, PRNG and determinism (overview)

### 5.1 Two MT19937 families

The generator is MT19937: the brief's twist loop has N = 624, M = 397, MATRIX_A 0x9908b0df, init multiplier 1812433253 and a double-length "virtual" buffer named by `mt_buffer`, `mt_cur_buffer`, `mt_index`, `mt_virtual_buffer`, `mt_virtual_seed_type` `[BIN:string 0x1682d28–0x1682d38, 0x1682228–0x1682248]`. World generation actually draws from a **second, vectorised MT family with a stream stack**: depth word, selector word, state array of stride 0x9c0 (624 words), per-slot index array, per-depth purpose tags; push increments depth, logs `Random Buffer Overload` `[BIN:string 0x169f980]` and clamps at **10 levels**; pop decrements; the draw routine ignores the tags *(gap_name-18)*. The brief's scalar wrapper family is not used by the map generator (auditor, params_rejection-27).

### 5.2 Three pushes

Push-from-string XOR-folds the seed string into a five-word key and expands the state with the standard recurrence; push-from-value is `init_genrand`; the three-value push seeds with a nested pairing `t = (a+b)(a+b+1) + 2b + c`, `seed = t(t+1) + 2c` *(gap_name-19)*. The feature-layer/local-map builder uses the three-value form with a world constant, a per-block value and `(layer + 1) × 10000` — coordinate-derived sub-streams so a local map regenerates from its coordinates *(gap_name-24, inferred semantics)*.

**Copy-risk.** MT19937 is public domain; the buffer stack, the five-word string fold and the pairing seed above are DF's implementation, quoted to explain the stream discipline. DEUS derives streams with its own mixing function (03, T4).

### 5.3 Four seeds, four scopes

The record holds `SEED` (+0x20), `HISTORY_SEED` (+0x40), `NAME_SEED` (+0x60), `CREATURE_SEED` (+0x80) *(gap-22; NAME_SEED offset promoted to verified by the auditor)*. World init parses them, logs ` Seed: `, ` History Seed: `, ` Name Seed: `, ` Creature Seed: ` to `gamelog.txt`, pushes NAME_SEED **only to name the world** and pops it inline, then pushes SEED at its end *(gap_name-20)*.

| Stream | Pushed | Popped | Drives |
|---|---|---|---|
| SEED | world init, before any generator call | stage worker at stage 10, or abort | all map stages; Lua stage-1 call gets a *copy* and nests its own stream; region, river, peak, landmass **and cave** names *(gap_name-23 inferred; auditor)* |
| HISTORY_SEED | placer phase C | the six civ-placement *rejection* exits, or the generator's pop after finalisation | civ placement, the year loop, finalisation, the eight post-passes *(gap-13)* |
| CREATURE_SEED | copied into the Lua parameters in phase D | inside the Lua entry (nested) | procedural creatures/objects *(gap_name-22 inferred)* |
| NAME_SEED | world init | immediately | the world's own name only *(gap_name-20)* |

The claim that SEED is popped at the end of stage 9 was **refuted**: that pop releases HISTORY_SEED; SEED lives to stage 10. Design consequences: a history seed truly isolates history from terrain (same SEED, different HISTORY_SEED → same map, different civs), while a name seed changes almost nothing because names draw from whichever stream is active (`[PUBLIC]` the wiki describes NAME_SEED as broader; the binary disagrees).

### 5.4 What makes a world reproducible

Fields, repairs, erosion, rivers and regions all draw from SEED; retries continue it (4.4), so seed + parameters → identical rejection sequence and map. Resolved seeds persist as `last_used_*_seed` *(gap_name-25)*; `[INFERRED]` the literal `RANDOM` (documented for the CLI `[DOC:command line.txt]`) is replaced by a generated value, hence the gamelog line and stored field. Lua sorts before iterating (3.5). Open question from the audit: a reset routine seeds slot 0 from the tick counter and nothing re-pushes after the stage-10 pop, so later users of this family would run time-seeded.

### 5.5 Command-line generation

`"Dwarf Fortress.exe" -gen <id number> <seed> <world gen param title>` (e.g. `-gen 2 RANDOM CUSTOM6`) runs "silent, introless", generates, "export[s] the region files and a picture", quits, and aborts if the world number exists `[DOC:command line.txt]`. Binary strings: `Command Line: World generation parameter set ` / `… located successfully.` `[BIN:string 0x1719fe8, 0x171a020]`, `… initiated.` `[BIN:string 0x16c8728]`, `… World image, detailed image and info exported.` `[BIN:string 0x171a0d0]`, `… World exported.` `[BIN:string 0x16c8ef8]`, `… aborted because folder exists.` `[BIN:string 0x16c86e8]`; the stage worker (brief anchor) references these and `CREATE WORLD NOW = ` `[BIN:string 0x171a110]`. This is the headless path Codex Astra's test should mirror: the same step function in a tight loop.

---

## 6. Save and export formats (overview)

### 6.1 Region save blocks

The region save writer (brief anchor `0x140efd610`) emits tagged blocks in order `*START REGION SAVE*` → `*START REGION DIM SAVE*` → `*START REGION MAP SAVE*` → `*START REGION GEOLOGY SAVE*` → `*START REGION SUBREGION SAVE*` `[BIN:string 0x173ee50, 0x173ee68, 0x173ef58, 0x173ef70, 0x173ef20]` — dimensions, per-tile map, geology, subregions, in generation order, with grep-able markers as a cheap consistency check. The status serializer's `new_dimx`, `geo_index`, `finalizing_*` fields *(gap_name-25)* show a half-generated world is itself saveable.

### 6.2 world.dat and world.sav

`save/current/world.dat` `[BIN:string 0x16c8e90]` and `save/current/world.sav` `[BIN:string 0x15ffb60]` (with `Failed to save the active game at world.sav, no good! Error: ` `[BIN:string 0x15ffc30]`). `[PUBLIC]` `world.dat` holds the world as generated, `world.sav` the active game's state; both use the block layout above. History also writes per-decade `save/current/region_snapshot-` files *(gap-10)* and loads per-feature `feature-` files *(gap-16)*. Screens: `viewscreen_{new,adopt,update,export}_regionst` `[BIN:rtti]`.

### 6.3 Legends XML

The `-legends` export `[BIN:string 0x1781890]` is XML rooted at `<df_world>` with top-level collections present as literals: `<regions>`, `<underground_regions>`, `<sites>`, `<world_constructions>`, `<artifacts>`, `<historical_figures>`, `<entity_populations>`, `<entities>`, `<historical_events>`, `<historical_event_collections>`, `<historical_eras>`, `<written_contents>`, `<poetic_forms>`, `<musical_forms>`, `<dance_forms>` `[BIN:string 0x1781a38, 0x1781a48, 0x1781a98, 0x1781a30, 0x1781b30, 0x1781b10, 0x1782c08, 0x1782608, 0x1782668, 0x1782700, 0x17828b8, 0x1782888, 0x17828f8, 0x1783410, 0x1783430, 0x17835d8]`. `[PUBLIC]` That is the emission order; records are `<id>`-keyed, events reference figures/sites/entities by id, collections nest, and the section 2.6 vocabulary appears as `<type>` strings. DFHack "legends_plus" tags (`<rivers>`, `<mountain_peaks>`, `<landmasses>`, `<creature_raw>`) are absent, consistent with the vanilla schema being these fifteen collections.

### 6.4 Text and bitmap exports

Suffixes: `-world_map`, `-detailed.bmp` `[BIN:string 0x173ec28, 0x173ec40]`; `-world_gen_param` `[BIN:string 0x173ece0]` — the `[WORLD_GEN]` dump written by the same serialiser the error path uses *(params_rejection-24)*; `-world_history` `[BIN:string 0x17409e8]`; `-world_sites_and_pops` `[BIN:string 0x1740188]` with headings `Civilized World Population`, `Parent Civ:`, `Worshipped`, `Worships` `[BIN:string 0x17401a0–0x17401d0]`. The CLI exports "the region files and a picture" automatically `[DOC:command line.txt]`. `[PUBLIC]` The world map is one pixel per tile coloured by biome; the detailed map adds rivers, roads and sites.

**Copy-risk note.** The formats are DF's. What transfers: tagged blocks in generation order, periodic snapshots as the enabler for history playback, an id-keyed machine-readable history dump, and a parameter dump beside every world so it can be regenerated.

---

## Appendix: ledger claims relied on

Verified: params_rejection-01, -02, -04, -05, -06, -07, -08, -09, -10, -12, -13, -14, -15, -16, -19, -20, -22, -23, -24, -25; vegetation_wildlife-13, -17, -18, -21; gap_post_map_pipeline_order-01, -02, -03, -06, -07, -08, -09, -10, -11, -12, -13, -14, -15, -16, -18, -20; gap_name_generation_and_seed_streams-18, -19, -20, -25. Inferred (labelled where used): params_rejection-17, -18, -21; vegetation_wildlife-22; gap_post_map_pipeline_order-04, -17, -19, -22, -23; gap_name_generation_and_seed_streams-22, -23, -24. Refuted claims whose auditor verdicts supply the corrected reading: params_rejection-03 (mesh encoding), -11 (REGION_COUNTS multipliers), -27 (RNG seeding mechanism); gap_name_generation_and_seed_streams-21 (SEED pop point); gap_post_map_pipeline_order-05 (one phase per call).
