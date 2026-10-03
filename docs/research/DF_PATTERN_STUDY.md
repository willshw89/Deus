# Dwarf Fortress Data Patterns: Study for DEUS

*Prepared 2026-10-02 (CT). Sources: DF 53.16 vanilla raws on the user's laptop (read only), DFHack 53.16-r2 source zip (laptop, copied to the box), DFHack/df-structures on GitHub (tag `53.16-r2`), the DF Wiki, and the SRD 5.1 PDF in `UF\`.*
*Measured counts are in `DF_COUNTS.txt`, along with the commands used to get them.*

> **Licensing rule for this document.** DF raws are described in our own words. The only DF text quoted is single token names, such as `[USE_MATERIAL_TEMPLATE]`. The same rule covers df-structures, whose license is unclear (see §0). All JSON examples are invented for DEUS. They are not translations of DF objects.

---

## 0. Licenses found (flag all)

| Source | License as found | Evidence | How DEUS may use it |
|---|---|---|---|
| Dwarf Fortress game (exe, images, audio) | Proprietary, Bay 12 Games | `data/vanilla/readme.txt` says image and audio files "remain under copyright" | Do not use. |
| DF vanilla raw `.txt` and `.lua` files, plus the "interaction examples" and "examples and notes" folders | **Released into the public domain by Bay 12** (copyright waived, with a promise not to pursue claims) | `UF\data\vanilla\readme.txt` (read 2026-10-02). It also asks modders to credit themselves so their changes aren't mistaken for vanilla | This is more permissive than the brief assumed. **We still follow the stricter brief:** patterns only, no copied raw blocks. Re-using DF *data* would be legally possible but conflicts with "SRD is source of truth". |
| DFHack (core, plugins, scripts) | **Zlib**, with MIT and BSD components. JSON.lua is listed as CC-BY-SA, but its link actually points to CC-BY 3.0 | `LICENSE.rst` in the local 53.16-r2 zip, identical to https://github.com/DFHack/dfhack/blob/develop/LICENSE.rst. GitHub API reports `NOASSERTION` because the file is .rst | Permissive. Even so, we take patterns only. |
| DFHack/df-structures (the XML layouts) | **No LICENSE file in the repo.** GitHub API returns `license: null`. The README doesn't mention a license | https://github.com/DFHack/df-structures (root listing checked 2026-10-02). It is a submodule of dfhack (`library/xml`), and the dfhack LICENSE says "other DFHack code" is Zlib "unless noted otherwise". **Whether that covers this repo is unverified.** | Treat as all-rights-reserved. Field names and layout *ideas* only, no copied XML. |
| DF Wiki (dwarffortresswiki.org) | Wiki content license **not checked** in this study (unverified) | n/a | Cited for behaviour only, nothing copied. |
| SRD 5.1 | CC-BY-4.0 (as the filename `SRD_CC_v5.1.pdf` indicates; the attribution page was not re-read for this study) | `UF\SRD_CC_v5.1.pdf` | Source of truth for rules numbers. |

---

## 1. Raw file layout and grammar

### 1.1 Folder = mod
- Every top-level folder under `data/vanilla/` is a self-contained **mod**. It has an `info.txt` manifest plus some of `objects/`, `graphics/`, `scripts/`. There are 27 folders, and each has an `info.txt`.
- The 158 object files sit in `*/objects/`. One mod (`vanilla_procedural`) holds Lua generators (`scripts/init.lua`, `scripts/generators/*.lua`, 17 files). These build procedural creatures, entities, interactions, languages and materials at world generation. Several `*_graphics` mods ship an `info.txt` and nothing else, described as "for save compatibility". They are placeholders that keep the ID set stable.
- Per the wiki, installed mods are copied to `data/installed_mods/`, and a world **bakes in** its mods at generation. After that, only compatible version bumps are accepted. The laptop's `data/` does contain `installed_mods`.

### 1.2 File header contract (three rules, all checked against our copies)
1. The **filename prefix** names the object type (`creature_`, `item_`, `inorganic_`, ...).
2. The **first line** of the file is the filename without `.txt`. This held for every file I opened.
3. Next comes an `[OBJECT:<TYPE>]` header. All objects in the file belong to that type. Some types need several headers per file kind: the `ITEM` files contain `ITEM_WEAPON`, `ITEM_TOOL` and so on, and the `BUILDING` file contains `BUILDING_WORKSHOP`.
The wiki says the game silently ignores a file that breaks any of these rules ("Modding pitfalls").

### 1.3 Token grammar
- A token is `[NAME]` or `[NAME:arg:arg:...]`. Arguments are separated by colons. Whitespace and newlines don't matter.
- **Everything outside brackets is a comment.** The vanilla files use this heavily for inline docs, data-source notes and even `***` URLs.
- An object starts with its header token (`[CREATURE:ID]`, `[INORGANIC:ID]`, ...). Its body runs until the next header token of the same object type. There is no explicit close token.
- **Scoping is positional and stateful.** Some tokens open a sub-context that later tokens attach to until another context opens. Examples: `[CASTE:x]`/`[SELECT_CASTE:x]`, `[USE_MATERIAL_TEMPLATE:local:TEMPLATE]` followed by override tokens, `[GROWTH:x]`, `[POSITION:x]`, `[REAGENT:...]` followed by modifier tokens. Indentation in the vanilla files is cosmetic.
- **IDs are loose strings.** I measured 24 reaction IDs that contain spaces, such as the "MAKE WOODEN ..." family. Numbers are integers only, since DF uses fixed-point everywhere. Encoding is CP437 (wiki).
- Values are often **relative** rather than absolute: `DEFAULT_RELSIZE` for body parts, `BIOME_SUPPORT` frequencies, `POP_RATIO`. Only the ratios matter.

### 1.4 info.txt manifest
- Measured in vanilla: every manifest has `ID`, `NUMERIC_VERSION` (an integer such as 5316), `DISPLAYED_VERSION` (free text such as "53.16"), `EARLIEST_COMPATIBLE_NUMERIC_VERSION`, `EARLIEST_COMPATIBLE_DISPLAYED_VERSION`, `AUTHOR`, `NAME` and `DESCRIPTION`.
- **Dependency tokens exist but vanilla uses none.** From the wiki (Info.txt page): `REQUIRES_ID`, `REQUIRES_ID_BEFORE_ME`, `REQUIRES_ID_AFTER_ME`, `CONFLICTS_WITH_ID`. IDs starting with `vanilla_` are reserved. Steam fields (`STEAM_*`) are optional.
- **Quirks seen in the vanilla data,** which are lessons for our validator: `vanilla_materials` has numeric 5208 but displays "53.08". `vanilla_descriptors` displays "53.153". The two version fields are never cross-checked by the game, because display text is free-form.
- **Load order:** the player orders mods per world on the world-creation screen. The wiki advises putting mods after vanilla so they can reference vanilla objects. References resolve across all loaded files by ID, so file names and folders don't matter for resolution.

### 1.5 Patching model (v50+)
- `SELECT_<TYPE>:ID` reopens an existing object and appends tokens. `CUT_<TYPE>:ID` removes an object. Sub-selectors include `SELECT_CASTE`, `SELECT_MATERIAL`, `SELECT_TISSUE_LAYER` and `SELECT_GROWTH`. This works only for CREATURE, ENTITY, INTERACTION, ITEM, WORD/TRANSLATION/SYMBOL, INORGANIC, PLANT, MUSIC/SOUND and REACTION (wiki "Modding").
- You generally **can't remove a token** without CUT-and-redefine. The exception is creatures, through creature-variation remove/convert.
- **Duplicate IDs are an error**, described as "serious, potentially trippy" errors. The rule is "SELECT over CUT, CUT over unloading".
- `[LOG_CURRENT_ENTRY]` dumps the fully resolved object to `logs/current_entry.txt`. That is a useful debugging idea for us (see §9).
- Vanilla never patches itself: 0 `CUT_*` and 0 `SELECT_CREATURE` in the raws.

---

## 2. Materials

### 2.1 Template + override
- `material_template_default.txt` defines **70 material templates**. Examples include `STONE_TEMPLATE`, `METAL_TEMPLATE`, `WOOD_TEMPLATE`, `SOIL_TEMPLATE`, organ, tissue and plant-part templates, and liquids such as blood, milk and alcohol.
- A template is a complete property sheet:
  - state names, adjectives and colours for solid, liquid and gas (`STATE_NAME`, `STATE_ADJ`, `STATE_COLOR`, with `ALL_SOLID` style state groups)
  - `MATERIAL_VALUE` (a value multiplier)
  - temperatures (`SPEC_HEAT`, `IGNITE_POINT`, `MELTING_POINT`, `BOILING_POINT`, `HEATDAM_POINT`, `COLDDAM_POINT`, `MAT_FIXED_TEMP`), where `NONE` means "never"
  - `SOLID_DENSITY` and `LIQUID_DENSITY` (kg/m³), plus `MOLAR_MASS` (the template's own comment marks it unused)
  - mechanical yield, fracture and strain values for impact, compressive, tensile, torsion, shear and bending, plus `MAX_EDGE`
  - **capability flags** that gate which items can be made: `ITEMS_HARD`, `ITEMS_WEAPON`, `ITEMS_ARMOR`, `ITEMS_DIGGER`, `ITEMS_ANVIL`, `IS_STONE`, `IS_METAL` ...
  - `REACTION_CLASS` tags that recipes can match on.
- An **inorganic** (265 measured: 127 gems, 58 minerals, 26 metals, 25 layer stones, 21 soils, 8 other) starts with `[USE_MATERIAL_TEMPLATE:<template>]`. It then overrides a few fields: name, colours, `MATERIAL_VALUE`, `SOLID_DENSITY`, `MELTING_POINT`, plus geology (`ENVIRONMENT`, `IS_STONE`) and economics (`METAL_ORE:<metal>:<pct>`). Each inorganic file uses exactly one template: stone files use STONE, metals METAL, soils SOIL.
- **Measured surprise:** all 265 inorganics restate `SOLID_DENSITY` (265/265), even though every template has one. In practice the template supplies the mechanical and thermal defaults and the "boring" fields, and density is always per-material. That supports our plan: density belongs to the specific material, never the class.
- Organic materials (creature and plant parts) are created *inside* their owning creature or plant with the two-argument form `[USE_MATERIAL_TEMPLATE:<local id>:<template>]`, and can be overridden right after. Other tokens then refer to them as `LOCAL_CREATURE_MAT:x` / `LOCAL_PLANT_MAT:x`, or from outside as `CREATURE_MAT:<creature>:<mat>` / `PLANT_MAT:<plant>:<mat>` / `INORGANIC:<id>`. Body detail plans bundle many of these (`[ADD_MATERIAL:...]`; see §3).

### 2.2 Weight = density x volume
- The DF Wiki (Weight page, v53.16) gives the general rule: weight in kg = density (kg/m³) x volume (cm³) / 1,000,000. Each item category may use its own volume formula. Custom volumes are rounded down to multiples of 10. Displayed weight is truncated to whole units.
- Volumes come from item definitions. A weapon's `SIZE` is its volume in cm³; `MATERIAL_SIZE` is how many raw units it consumes. Creature `BODY_SIZE` is in cm³ too (wiki Hydling example; DWARF adult = 60,000).
- My own calculation, not read in DF: with the iron template density (7,850 kg/m³) and the battle-axe `SIZE` (800), the general rule gives about 6.3 kg (about 13.8 lb). SRD 5.1 lists a battleaxe at **4 lb** (verified in the SRD PDF, weapons table). That's a good illustration of why we should not derive SRD items from density.
- df-structures shows items carry a cached mass (`weight`, a mass struct "if flags.weight_computed"). DF computes once and caches behind a dirty flag.

**DEUS equivalent (recommended):**
1. `weight_lb` on the item definition is primary, and must come from the SRD when the SRD lists it (battleaxe 4, shortsword 2, warhammer 2, shield 6, plate 65; all verified in the PDF).
2. Material variants of an SRD item (an "iron" vs a "bronze" battleaxe) keep the SRD `weight_lb` by default. Optionally scale by `material.density / item.reference_material.density` *only if* the item opts in (`"weightScalesWithMaterial": true`). Default to false, so SRD numbers stay untouched.
3. Density fallback applies only to items with no SRD weight: `weight_lb = density_kg_m3 x volume_cm3 / 1e6 x 2.20462`. For bulk goods, prefer SRD Trade Goods prices per lb (1 lb iron = 1 sp, copper 5 sp, silver 5 gp, gold 50 gp, platinum 500 gp; verified).
4. Cache the computed weight on the entity, using a dirty bit invalidated by material or stack changes (DF pattern).
5. The validator flags any item that has both `weight_lb` and `volume_cm3` set without `weightSource` declared, so nothing gets computed silently.

### 2.3 States and melting
- DF keeps one material across states. Names and colours are per state, and the transitions are temperature thresholds (melting and boiling) on DF's own scale. For example, iron melts at 12768 and a stone template at 11500; the wiki places water's freezing point at 10000 on that scale (from memory of the wiki's temperature page, not re-read here, so **unverified**).
- DEUS seasons and temperature are parked. Keep `states` as a small optional block (`solid/liquid/gas` names, `meltsAtC`) for smelting flavour, and treat smelting as a recipe instead of a thermal simulation.

---

## 3. Bodies, tissues, detail plans, variations, castes

- **Bodies are composable part-sets.** There are 234 `BODY` objects (`body_default.txt`, `body_rcp.txt`), each a small set of parts: a torso set, a head, "2EYES", "5FINGERS" and so on. A creature lists a whole chain: the dwarf's `BODY` token names 21 sets. Each part has a short code, names, connection (`CON` to a specific part, or `CONTYPE` to a part type), flags (`LIMB`, `GRASP`, `STANCE`, `LEFT/RIGHT`), a free-form `CATEGORY`, and `DEFAULT_RELSIZE` (relative size). Connections are resolved after composition.
- **Tissue templates** (38) describe a tissue: material reference, thickness, healing, vascularity, pain, shape and flags. Creatures apply tissues to parts by category, type or token (`TISSUE_LAYER:BY_CATEGORY:...`).
- **Body detail plans** (21) are *parameterised macros*. One plan can add all standard materials, another all standard tissues. A layering plan takes positional arguments (ARG1..ARGn) that the creature fills with tissue names, plus per-category thickness. The dwarf's whole anatomy is a body chain plus about 8 BDP calls.
- **Creature variations** (36) are reusable patches applied with `APPLY_CREATURE_VARIATION:ID:args...`. That token appears 4,715 times, mostly for gait speeds (`STANDARD_BIPED_GAITS` with 6 numeric args). The patch verbs are:
  - `CV_REMOVE_TAG` (341 uses) deletes matching tokens from the creature.
  - `CV_ADD_TAG` (26) and `CV_NEW_TAG` add tokens.
  - `CV_CONVERT_TAG` (198) is a find-and-replace of argument values. It has sub-tokens for master token, target value and replacement. Example: convert the `BODY` argument from a quadruped set to a humanoid set when making an "animal person".
  - Variations can take arguments, and the `GIANT` variation adds a body-size percentage change (`CHANGE_BODY_SIZE_PERC`) plus population tweaks.
- **Inheritance between creatures:** `COPY_TAGS_FROM:<creature>` (464 creatures use it) copies another creature's tokens. Then `GO_TO_START`/`GO_TO_END`/`GO_TO_TAG` (464/639/90) move the insertion cursor, so the variation's edits land at the right position. This is how 165 `GIANT_*` and 273 `*_MAN` creatures are stamped from base animals. **Lesson:** positional, cursor-based inheritance works for DF, but it's fragile and hard to validate. DEUS should use key-based deep merge.
- **Castes** (938 `CASTE` tokens) are sub-variants of one creature: sexes, or ant worker/soldier/drone/queen. Each has its own body, flags and `POP_RATIO`. `SELECT_CASTE` (1,507) and `SELECT_ADDITIONAL_CASTE` scope later tokens to some castes or to `ALL`.
- **Size tokens:** `BODY_SIZE:<years>:<days>:<cm³>` (several per creature, giving a growth curve), `BODY_APPEARANCE_MODIFIER` (percentage spread), `CHILD`, `BABY` and `MAXAGE`. Measured adults: dwarf, elf and goblin 60,000; human 70,000; kobold 20,000; dog 30,000; horse 500,000; troll 250,000; ogre 6,000,000; giant 9,000,000; dragon 25,000,000.

### 3.1 Mapping to SRD size categories
- SRD 5.1 defines size by **space controlled**: Tiny 2½ ft, Small 5 ft, Medium 5 ft, Large 10 ft, Huge 15 ft, Gargantuan 20 ft or more (verified in the PDF, Size Categories table). The SRD itself says space is "not an expression of its physical dimensions". DF has no categories at all, only a continuous volume.
- **Rule for DEUS:** `size` is a required enum copied from the SRD race or monster entry. It is never derived. DF-style `bodySize` (volume) is optional flavour for carry and encumbrance, and must not be invented for SRD races (the "no invented race numbers" rule).
- If a non-SRD creature ever needs a size, a volume-to-category threshold table could act as a **DEUS tuning heuristic**, clearly labelled non-SRD. As a sanity check, DF's 60–70k cm³ humanoids map to Medium, matching SRD dwarf, elf and human. I don't propose fixed thresholds here.
- Body plans: adopt a *much* thinner version. A `bodyPlan` is a named list of slot groups (head, torso, arms, hands, legs, feet, plus wings or tail) used for equipment slots and called shots. Skip tissues and layers, because SRD combat is HP-based. DF-style detail plans aren't needed at that scale.

---

## 4. Items, reactions, buildings, entities

### 4.1 Items (112 definitions)
- Item *types* are hardcoded (weapon, armor, tool...). Raws define *subtypes* only, with geometry and use data such as `SIZE`, `MATERIAL_SIZE`, `SKILL`, `TWO_HANDED`/`MINIMUM_SIZE` (thresholds against the wielder's body size), attack blocks, armour layer and coverage, and material-class flags (`METAL`, `LEATHER`, `HARD`, `SOFT`...).
- **Item x material is a cross product chosen at craft time.** An item definition never names its material. It only states which material *classes* are acceptable, and each material's `ITEMS_*` flags say what it can become. A runtime item is (subtype, material).

### 4.2 Reactions (159 recipes)
Shape of a reaction:
- `NAME`
- `BUILDING:<workshop>:<hotkey>`
- `SKILL`
- one or more named `REAGENT:<label>:<qty>:<item type>:<subtype>:<material spec>`, each followed by modifier tokens such as `REACTION_CLASS`, `HAS_MATERIAL_REACTION_PRODUCT`, `UNROTTEN`, `CONTAINS:<other reagent>`, `PRESERVE_REAGENT`, `DOES_NOT_DETERMINE_PRODUCT_AMOUNT`
- one or more `PRODUCT:<chance%>:<qty>:<item type>:<subtype>:<material spec>`, where the material may be `GET_MATERIAL_FROM_REAGENT:<label>:<product class>` (material inheritance)
- flags `FUEL`, `AUTOMATIC`, `ADVENTURE_MODE_ENABLED`.

Measured shape: 129 of 159 reactions take exactly 2 reagents, and 147 produce exactly 1 product. By building: DYER 68, CARPENTER 23, SMELTER 23, KILN 13. By skill: PROCESSPLANTS 69, SMELT 26, CARPENTRY 24. 33 are adventure-mode only, and those are exactly the 33 no entity permits.

Important: **most DF crafting is hardcoded**, including forging weapons and armour and many workshop jobs. Raw reactions cover alloys, fuel, dyes, soap, pottery and similar. Only 2 workshops are raw-defined (`SOAP_MAKER`, `SCREW_PRESS`). Each has a size (`DIM`), work tile, per-stage tiles and colours, build labour and `BUILD_ITEM` costs. DEUS should *not* copy this split. Every recipe should be data.

### 4.3 Entities (civilisations; 6 defined)
An entity is mostly **allow-lists plus culture knobs**:
- the creature(s) it is made of
- the language
- allowed item subtypes per slot (`WEAPON`, `ARMOR:<id>:COMMON|UNCOMMON`, `TOOL`...)
- material preferences
- `PERMITTED_JOB`, `PERMITTED_REACTION` and `PERMITTED_BUILDING`
- `POSITION` blocks: noble or office roles with succession, responsibilities, room and furniture requirements, and exemptions
- ethics and values
- currency
- biome support and site types
- population caps
- religion spheres.

Measured: the dwarf civ (MOUNTAIN) has 65 jobs, 126 reactions and 24 positions. PLAINS (humans) has 0 positions in the raws. My guess is they're generated at worldgen, but **that is unverified**.

The allow-list is what gives civs different technology: a reaction the civ doesn't permit simply doesn't exist for it. That maps directly onto an **Age-of-Empires-style tech tree**, if we make the allow-list *dynamic* (unlocked by research or age) instead of static.

### 4.4 Mapping to DEUS
| DF concept | DEUS concept |
|---|---|
| reaction | `recipe` (inputs with tags or IDs, outputs, station, skill or tool proficiency, time) |
| BUILDING_WORKSHOP | `station` (footprint, work tile, build cost recipe) |
| SKILL | SRD tool proficiency or ability check (e.g. Smith's Tools), not DF skill levels |
| PERMITTED_REACTION/JOB/BUILDING | `society.allowed.recipes/jobs/stations`, plus `techNode.unlocks` adding to them per age |
| entity item lists | `society.allowed.items` (with rarity) |
| POSITION | `society.offices` (later) |
| REACTION_CLASS / material flags | material `tags[]`, matched by recipe inputs (`"tag": "metal.ore"`) |
| GET_MATERIAL_FROM_REAGENT | output `materialFrom: "<input label>"` |

---

## 5. Plants (brief; seasons parked)
- 225 plants. Each defines its own local materials from plant templates: structural, wood (with its own density), leaf, flower, fruit, seed, drink, mill. Crops list allowed seasons as bare flags and a grow duration. Trees add trunk and branch geometry.
- `GROWTH` blocks (408 uses) are named sub-objects: leaves, flowers, fruit. Each has an item, a material, host tiles, a timing window in year-ticks, and drop behaviour.
- **DEUS:** keep `plant.parts[]` (each with a material ref and a yield), and leave `season` fields reserved, absent from the schema for now. Wood density per species is a reasonable fallback source for log weights where the SRD is silent.

---

## 6. Reference resolution and broken references
- **Resolution:** by ID string across all loaded objects of the right type, whatever the file (wiki, Modding guide). Local references use qualifiers (`LOCAL_CREATURE_MAT`); global ones use typed paths (`INORGANIC:IRON`, `CREATURE_MAT:DWARF:SKIN`).
- **What DF does when one is broken** (from docs and forums, not tested here):
  - Problems are written to **`errorlog.txt`** in the game root, *not* to `gamelog.txt`. Gamelog holds in-game announcements and combat. Example messages from public bug reports include "Error(s) finalizing the entity X / Unrecognized entity tool token: ..." and "Unrecognized Color Token in Material Template". **The game keeps loading.** It drops the bad token, or fails to instantiate the object.
  - A DFHack maintainer explained that a material failing to instantiate can make the creatures that reference it fail too. That **shifts creature indices**, and loading saves that refer to them can then crash (Steam DFHack discussion; behaviour described, not tested).
  - Duplicate IDs without CUT/SELECT give "trippy" errors (wiki).
  - The v0.34 string dump lists runtime messages like "Nuked Item Reference", which suggests the game prunes dangling runtime references on load. That is old-version evidence; **v50 behaviour is unverified**.
- **My audit of the vanilla subset:** 0 broken references across template refs (58), metal-ore targets (11), entity item refs (106), permitted reactions (126), reaction material refs (29), body-set refs (69) and BDP refs (15). One trap I hit: an ID regex without spaces falsely flagged "MAKE" as missing, because reaction IDs can contain spaces.
- **Lesson for DEUS:** DF's "log and continue" plus index-based saves is the worst combination. We need fail-fast at load, stable string IDs in saves, and a CI check.

---

## 7. DFHack df-structures: DF's in-memory world

Version check: DFHack zip **53.16-r2** (`CMakeLists.txt`: DF_VERSION 53.16, DFHACK_RELEASE r2). DF in `UF` is **53.16** (top of `release notes.txt`, August 5, 2026). They **match**. The source zip's `library/xml` is **empty**, because df-structures is a git submodule and isn't included in the source zip. So I read df-structures from GitHub tag `53.16-r2`. `df.block.xml`, `df.world.xml`, `df.item.xml`, `df.unit.xml`, `df.job.xml`, `df.material.xml` and `df.game_v.xml` at that tag are byte-identical to `master` as of today.

Observed layout (paraphrased, field names only):
- **Map blocks:** each `map_block` covers **16x16 tiles on one z-level**. It holds parallel fixed 16x16 arrays: tile type (uint16 enum), designation bits (uint32), occupancy bits (uint32), path cost, walkability/connectivity group, two temperature planes, lighting, liquid flow, fog-of-war. It also has a list of item IDs on the ground, an events list (minerals, spatter, grass...), flows, and its world position.
  - The world holds every block in a flat vector *plus* a 3-level pointer index `[x][y][z]` for O(1) lookup. It also stores block counts and tile counts for each axis, and the region origin.
  - A separate **map_block_column** per 16x16 column (all z) holds per-column data: ground elevation, water table levels, cave support columns, and plants (only in the column at the top-left of each mid-level tile).
- **Struct of arrays inside a block:** each property is its own 16x16 array, rather than an array of tile structs. This is effectively the typed-array layout we want.
- **Units, items:** `world.units` has an `all` vector, an `active` vector, and `other`, a set of pre-filtered category vectors. `world.items` likewise has `all` and `other`, where `items_other_id` has 136 enum entries, one per category such as weapons or bars. These are **maintained secondary indexes** keyed by category.
- **Jobs:** a global linked list, plus a `postings` vector ("entries never removed") and an application priority heap. A job has a type enum, position, material (type, index), item type and subtype, reaction name string, required-item descriptors, and item references.
- **IDs:** every entity kind has a global monotonic `*_next_id` counter (items, units, jobs, buildings, entities, artifacts, history figures, events, squads...; 20+ in `df.game_v.xml`). Objects reference each other by **int32 ID** (`ref-target`), and rarely by pointer across subsystems. Units and items also carry generic `general_refs`/`specific_refs` vectors (typed polymorphic links such as "contained in", "owner", "job").
- **Material reference = (mat_type int16, mat_index int32).** A pair encodes builtin, inorganic, creature-local and plant-local materials. Every item, job and contaminant uses this compact pair rather than a string.
- **Materials at runtime** keep the token string ID, state names, heat block, densities, strength block, value, flag array and reaction classes. This is the raw sheet, fully resolved.
- **Save format hints:** blocks, cave columns and others have `write_file`/`read_file` virtual methods that take a compressor and a **`loadversion`** integer. Serialization is per-structure and versioned.

**Lessons for DEUS:**
1. **Chunk = 16x16 tiles x 1 z-level, struct-of-arrays.** For a 256x256 area that's 16x16 chunks per z. For the 3x3 world (768x768 tiles) it's 48x48 chunks per z. Use `Uint16Array(256)` for tile type, `Uint32Array(256)` for flags, `Uint8Array(256)` for light and liquid, and so on.
2. **Allocate lazily.** A dense world at 8 B/tile is about 4.7 MB per z-level of the full 768x768 (my arithmetic). Represent uniform-air or uniform-rock chunks as a shared sentinel, and only allocate on first edit. That is DF's pointer index with nulls, applied deliberately.
3. **Index:** flat `chunks[]` plus a key `cx + cy*48 + cz*48*48` (or a Map). Keep a per-column record for heightmap and surface data.
4. **Entity store:** typed-array columns per component, with an integer ID from a monotonic counter (never reused within a save), and an `all` set plus **category indexes** maintained on add and remove (like `items_other`). Items on the ground are listed per chunk.
5. **Material ref:** at runtime, intern string IDs to `Uint16` indices built from the registry at load. **In saves, write string IDs** (or a save-local string table), never registry indices. That avoids DF's index-shift crash class.
6. **Saves:** per-chunk binary blobs with a version header plus a JSON manifest (mod list with versions, id counters, string table). Each serializer takes `loadVersion` and migrates.
7. **Cached derived values** (weight, path connectivity) sit behind dirty flags, like DF's weight_computed.
8. **Jobs:** a queue or heap of postings referencing recipe IDs and reserving item IDs. Don't use linked lists, which are a C++ artefact.

**Not useful to us:** DFHack's own runtime (C++ plugins, Lua scripting API, event hooks, `dfhooks`, memory offsets and vtables in symbols.xml). It exists to inject into a closed binary. DEUS owns its sim, so we take the data-layout ideas and nothing else.

---

## 8. Measured counts (this install)
Material templates **70**. Inorganics **265**. Creatures **967** (767 + 200 extinct). Creature variations **36**. Body sets **234**. Body detail plans **21**. Tissue templates **38**. Items **112**. Reactions **159**. Entities **6**. Plants **225**. Raw workshops **2**. Object files **158**, plus 27 `info.txt`. Details and commands are in `DF_COUNTS.txt`.

---

## 9. Recommendations for DEUS

### Adopt
1. **Material templates with per-material overrides.** Use `copyFrom` (single parent, deep merge by key), and make density, value and capability tags per material.
2. **Item x material cross product.** Items declare `materialTags` accepted; materials declare `tags`. Runtime item = (itemId, materialId).
3. **Recipe shape:** labelled inputs (by ID or tag, with quantity, consumed or preserved, "contains"), outputs (quantity, chance, `materialFrom`), station, proficiency, time.
4. **Society allow-lists** that are *dynamic* via tech nodes (AoE ages). The effective allow-list = base + unlocked nodes.
5. **info.txt-style manifest per data pack:** id, numeric version, earliest compatible, requires, requiresBefore, conflicts.
6. **Thin body plans** (slot groups) and **castes → SRD subraces/variants** where the SRD defines them.
7. **Variations as declarative patches.** Use `remove`, `add` and `replace` (key-path based, not cursor based), for things like "giant" or "undead" templates. Only use them where the SRD defines the resulting numbers.
8. **Debug dump of resolved objects**, like DF's `LOG_CURRENT_ENTRY`: `npm run data:dump -- material.iron`.

### Skip
- The bracket token format, stateful positional scoping, cursor tokens (`GO_TO_*`), and spaces in IDs.
- Tissues and layers, mechanical stress values, DF temperature scale, DF skills, gaits, appearance modifiers, procedural Lua generators (for now), and hardcoded-vs-raw workshop split.
- Log-and-continue on errors, and index-based saves.

### JSON layout
```
data/
  packs/
    core/                       # SRD-derived content
      pack.json
      materials/  templates.json  metals.json  stone.json  wood.json
      items/      weapons.json  armor.json  tools.json
      recipes/    smelting.json  carpentry.json
      stations/   stations.json
      creatures/  races.json  bodyplans.json
      societies/  societies.json
      tech/       ages.json  nodes.json
  schema/        material.schema.json  item.schema.json  recipe.schema.json ...
tools/validate-data.js           # CI: schema + registry + reference check
```

**pack.json** (manifest, invented):
```json
{
  "id": "deus_core",
  "name": "DEUS Core (SRD 5.1)",
  "version": 3,
  "displayVersion": "0.3.0",
  "earliestCompatibleVersion": 2,
  "requires": [],
  "requiresBefore": [],
  "conflicts": [],
  "license": "CC-BY-4.0 (SRD 5.1 content) + project license"
}
```

**Material template + overrides:**
```json
[
  { "id": "tpl.metal", "abstract": true,
    "tags": ["metal", "smeltable", "hard"],
    "states": { "solid": "metal", "liquid": "molten metal" },
    "density_kg_m3": null },

  { "id": "mat.iron", "copyFrom": "tpl.metal",
    "name": "iron",
    "density_kg_m3": 7870,
    "tags+": ["weapon_grade", "armor_grade"],
    "trade": { "priceRef": "srd.trade_goods.iron_lb" } }
]
```
(The 7870 is a real-world physics value for iron, not a DF or SRD number. `tags+` means append to the parent's array, and `tags` means replace it. `abstract` templates can't be instantiated.)

**Item with SRD weight primary:**
```json
{ "id": "item.battleaxe", "kind": "weapon",
  "srdRef": "SRD5.1:Weapons:Battleaxe",
  "weight_lb": 4, "cost_gp": 10,
  "damage": "1d8 slashing", "properties": ["versatile:1d10"],
  "materialTags": ["weapon_grade"],
  "weightSource": "srd",
  "weightScalesWithMaterial": false }
```
**Item without SRD weight (fallback):**
```json
{ "id": "item.ingot", "kind": "bar",
  "volume_cm3": 500, "materialTags": ["metal"],
  "weightSource": "density" }
```

**Recipe:**
```json
{ "id": "rcp.smelt_bronze",
  "station": "station.smelter",
  "proficiency": "srd.tool.smiths_tools",
  "time_min": 60,
  "inputs": [
    { "label": "a", "item": "item.ore", "materialTag": "ore.copper", "qty": 1 },
    { "label": "b", "item": "item.ore", "materialTag": "ore.tin",    "qty": 1 },
    { "label": "fuel", "itemTag": "fuel", "qty": 1 }
  ],
  "outputs": [ { "item": "item.ingot", "material": "mat.bronze", "qty": 2, "chance": 1.0 } ] }
```
(Quantities and times are DEUS tuning, since the SRD has no smelting rules. Mark them `"tuning": true` so audits can tell them apart from SRD numbers.)

**Society + tech node:**
```json
{ "id": "soc.hill_clans", "race": "race.dwarf",
  "allowed": { "items": ["item.battleaxe", "item.warhammer"],
               "recipes": ["rcp.smelt_bronze"],
               "stations": ["station.smelter"],
               "jobs": ["job.miner", "job.smith"] },
  "startAge": "age.stone" }
```
```json
{ "id": "tech.iron_working", "age": "age.iron",
  "requires": ["tech.bronze_working"],
  "cost": { "item.ingot": 10 },
  "unlocks": { "recipes": ["rcp.smelt_iron"], "items": ["item.longsword"] } }
```

**Race (SRD numbers only):**
```json
{ "id": "race.dwarf", "srdRef": "SRD5.1:Races:Dwarf",
  "size": "Medium", "speed_ft": 25, "bodyPlan": "body.humanoid" }
```

### Validator and ID registry (CI)
1. Load packs in manifest order and check `requires`, `requiresBefore` and `conflicts`, plus `version >= earliestCompatibleVersion`, all as integers.
2. Validate every file against JSON Schema (Ajv) by kind.
3. Register IDs in one global registry keyed `kind:id`. **A duplicate is an error** unless the later pack declares `"patch": true` (our SELECT) or `"remove": true` (our CUT).
4. Resolve `copyFrom` (detect cycles, forbid instantiating `abstract`), then deep-merge.
5. Walk every reference field. The schema marks them, e.g. with `"x-ref": "material"`. **Throw on any unresolved reference, naming the file and JSON path.** No log-and-continue.
6. Rule checks:
   - `weight_lb` is present when `srdRef` points to an SRD item that lists a weight.
   - `weightSource` is declared.
   - No `bodySize` or other numeric stats on `race.*` without an `srdRef` field path.
   - The tech graph is acyclic, and every unlock target exists.
   - Recipe outputs are reachable from at least one society or tech node (like DF's 33 never-permitted adventure reactions, but intentional).
7. Emit `build/registry.json` (string ID → runtime Uint16/Uint32 index) for the sim. Saves store string IDs plus pack versions.

### Chunking
16x16 x 1z chunks, struct-of-arrays, lazily allocated, keyed by (cx, cy, cz). 256x256 areas give 16x16 chunks each, and the 3x3 world gives 48x48 chunks per z. Keep per-column data (surface height) separate. Don't store or render anything for unseen air and solid rock chunks. RMMZ only renders the active area. The sim owns the chunk store, and the display layer reads a view.

---

## 10. Not verified / caveats
- The df-structures license (no LICENSE file), whether DFHack's Zlib umbrella covers it, the DF Wiki's content license, and the SRD attribution page wording (not re-read).
- Per-category item volume formulas in DF beyond the general density x volume rule. The 6.3 kg battle-axe figure is my own calculation.
- Why PLAINS has no POSITION tokens (I guess procedural, unconfirmed).
- DF v50 behaviour on dangling runtime references ("Nuked ... Reference" is from the v0.34 string dump). Errorlog behaviour is from docs and forums; I didn't reproduce it.
- DF temperature-scale anchor values (from memory of the wiki).
- Creature counts use a line-start `[CREATURE:` regex in creature files. Body-set and BDP reference checks covered only `creature_standard.txt`, `creature_domestic.txt` and `c_variation_default.txt`, not all 41 creature files.
