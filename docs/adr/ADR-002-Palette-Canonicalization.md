# ADR-002: Palette Canonicalization. `uf.hex` Is Canonical for Runtime; the Master Palette Migration Is a Separate Future Leaf

**Status:** Rev 2, PROPOSED (Lane C3, 2026-09-25). Replaces Rev 1 (committed in `d1fbeab` and marked "APPROVED / CANONICAL"). The Coordinator (Gemini, integration authority) accepts it after Grok's review; the author does not self-certify.
**Date:** 2026-09-25
**Context:** DEUS Directive 001 §5 / WG.00.05 (DW.01.05) / WG.00.12 Lane C3 brief
**Evidence baseline:** repository at commit `048752c`, measured 2026-09-25 (commands in §8)

---

## 1. Decision

1. **`art/palette/uf.hex` is the canonical palette for runtime, effective now.** This covers:
   - the engine plugins (`game/js/plugins/DEUS_*.js`, `UF_*.js`);
   - catalog colour data (`game/data/*WorldCatalog.json`);
   - fire (`DEUS_Fire.js`);
   - tiles and ground shading (`DEUS_Tiles.js`);
   - the in-game and tool test suites that check runtime colours.
2. **`art/palette/deus_master_world_palette_v1.hex` stays the approved *target* architecture** of WG.00.05 / DW.01.05: 226 active colours, 30 reserved slots, and 58 ramps. Its standard, registry and tests are unchanged. No runtime colour source uses it today (§2.3).
   - Moving the runtime to it is a **separate, planned future migration leaf** (§4), with its own WBS ID, migration harness and tests.
   - Until that leaf is `DONE`, no document may say or imply that the runtime uses the master palette.
3. **Scope of "canonical for runtime".** It covers colour *sources*: hex values in plugin code, colour data in catalogs, and colours baked into PNGs under `game/img/`. Runtime filter output is not bound to any palette (§2.4).
4. **Interim rule for new runtime colour sources.** Any colour source added to `game/` before the migration leaf lands uses `uf.hex` entries.
   - Reason: the two palettes share no colours (§2.1), so mixing them would put two unrelated palettes on screen at once.
   - Master-palette work can continue under `art/` as input to the migration leaf.
   - This reverses Rev 1 §2.2's rule that new `game/img/` deliveries map to the master palette. It needs Coordinator confirmation (§7).
5. `uf.hex` is not deleted or edited by this ADR or by the future migration. It stays in the repository so the change can be reversed from git.

---

## 2. Evidence (repository at `048752c`, 2026-09-25)

### 2.1 The two palette files

| Property | `art/palette/uf.hex` | `art/palette/deus_master_world_palette_v1.hex` |
|---|---|---|
| Entries | 256 lines, 250 distinct (6 repeated entries) | 226 lines, 226 distinct |
| How it was made | `tools/extract_palette.ps1` reads the Ultima VII `STATIC/PALETTES.FLX` daylight palette (bytes 256..1023) and scales 6-bit VGA values to 8-bit. Re-running that recipe on the local GOG install matches `uf.hex` in **256 / 256** entries. | Written by `tools/build_palette_registry.js`, which also writes `game/data/DEUS_PaletteRegistry.json` |
| Colours shared with the other file | 0 | 0 of 226 |
| Own test | none that checks the file itself | `tools/test_palette_standard.js`: 503 / 503 PASS, exit 0 (run 2026-09-25 in the lane-c3 worktree) |

### 2.2 References in code

- **`uf.hex`: 204 tracked files** under `game/js/` and `tools/` mention it: 2 in `game/js/` and 202 in `tools/`. 51 of them spell out the full path `art/palette/uf.hex`; the rest name the file or build the path in pieces. (The Lane C3 brief said 205; this count is 204.)
- **The master `.hex` file** is referenced by **two** tools:
  - `tools/build_palette_registry.js`, which writes it;
  - `tools/test_palette_standard.js`, which asserts that it exists and validates the registry.
- **The generated registry `game/data/DEUS_PaletteRegistry.json`** is read by `tools/art_check.js`, `tools/palette_resolver.js`, `tools/test_palette_standard.js` and `tools/build_palette_registry.js`.
- **Nothing under `game/js/` loads either `.hex` file or the registry at runtime.** The two `game/js/` mentions of `uf.hex` are a comment (`DEUS_Fire.js:928`) and two test-message strings (`DEUS_Tiles.js:1393`, `:1396`).

### 2.3 Where runtime colours come from

| Source | Location | Distinct colours | In `uf.hex` | In master |
|---|---|---:|---:|---:|
| Ground-shade tones, which `DEUS_Tiles.js` paints into the generated `UF_GenShade_E` sheet | `groundShades` in `game/data/UF_WorldCatalog.json` (and the same 101 tones in `DEUS_WorldCatalog.json`) | 101 | 101 | 0 |
| Flame ramp | `DEUS_Fire.js:933` `FLAME_RAMP`. The comment at 928–929 names `uf.hex` indices 238, 237, 236, 235, 234, 233, 1; all 7 were checked against those exact indices and match. | 7 | 7 | 0 |
| All `#RRGGBB` literals in `DEUS_*.js` / `UF_*.js` plugins (the flame ramp included) | `game/js/plugins/` | 168 | 9 | 0 |
| Colours baked into PNGs | `game/img/` | not measured per image in this ADR | — | — |

- 9 of the 168 plugin literals are `uf.hex` entries: the 7 flame colours, plus `#FFFFFF` (13 plugins) and `#000000` (5 plugins).
- `DEUS_Tiles.js` reads the ground-shade tones from `UF_WorldCatalog.json` (its header, line 19; `groundShadesConfig`, line 46).
- 159 of the 168 plugin literals are in **neither** palette. By occurrence count, the files with the most literals are:
  - `DEUS_Select.js` (48)
  - `DEUS_Minimap.js` (41)
  - `DEUS_FactionMenus.js` (40)
  - `DEUS_Anim.js` (34)
  - `DEUS_Factions.js` (33)
- Declaring `uf.hex` canonical does **not** make those 159 literals compliant. They are listed as migration scope in §4, and the leaf decides whether each one is in or out.

### 2.4 Shaders and filters

- A grep of `game/js/plugins/` for `PIXI.Filter`, `new PIXI.filters`, `ColorMatrixFilter`, `fragmentSrc` and `gl_FragColor` finds one plugin: `DEUS_Depth.js`.
  - At lines 682–700 it puts a PIXI `ColorMatrixFilter` (brightness / saturation / contrast) and a `BlurFilter` on the lower depth planes.
  - No plugin carries custom shader source.
- These filters transform colours that are already drawn, so their output is not limited to any palette.
- `uf.hex` governs what is drawn *into* the planes, not what the filters produce.

### 2.5 What the existing checks actually test

| Check | What it tests |
|---|---|
| `DEUS_Tiles.js` `palette_only` (lines 1392–1397) | It passes when `UF_GenShade_E` is 768×768 pixels, and **reads no pixel colour**. Its message still says "100% uf.hex palette compliance", and its provoked branch is a hard-coded FAIL. It is **not** evidence of palette compliance until migration test T2 (§4) replaces it. |
| `tools/art_check.js` palette check | It never reads `uf.hex`. It compares pixels with the master registry only when one of these holds: a sidecar declares `allowedRamps` / `materialFamilies`; a tileset sidecar declares `paletteMode: "MASTER"`; or `--strict-palette` is passed. Otherwise character and object sheets get a colour-count budget only, and tilesets pass with no colour-membership test. So neither palette is enforced on delivered art by default. |
| `tools/test_palette_standard.js` | Validates the master palette and registry: 503 / 503 PASS, including 226 active colours, 30 reserved slots, 58 ramps, 0 exact duplicates and 0 reported near-duplicates. It says nothing about runtime. |
| `tools/test_palette.js` | A Lab nearest-colour quantizer against `uf.hex` (`loadPalette`, line 26). `run_tests.bat` does not reference it. |
| `tools/originality_check.js` | Uses `uf.hex` as its fallback palette when the U7 files are absent (lines 756–760). Its self-test logs how many `uf.hex` entries equal the decoded U7 daylight palette (lines 1680–1683). |

---

## 3. Consequences

- The runtime keeps working exactly as it does today. No code, data or image changes with this ADR.
- New runtime colour sources use `uf.hex` entries (§1.4) until the migration leaf lands.
- Anything that says the runtime uses the master palette is wrong until the migration leaf is `DONE`. That includes docs, prompts, handoffs, STATUS lines and test messages. The Rev 1 statements corrected here are listed in §5.
- `DEUS_Tiles.js` `palette_only` stays misleading until it is fixed. Cite it as a dimension check only.
  - `DEUS_Tiles.js` is outside the Lane C3 write set, so the fix is migration test T2 or a separate defect.
- **`uf.hex` is the Ultima VII daylight palette** (§2.1). The runtime therefore ships U7-derived colour values:
  - the ground-shade tones and the flame ramp;
  - every tool-quantized PNG, for which only the tool references were counted and no per-image measurement was made.
  - AGENTS.md rule 8 is written about images ("a copy, trace, recolour, crop or near-copy of a U7 image"). It does not say whether a colour list counts.
  - Whether `uf.hex` may ship in a release, or must be replaced first, is an owner question (§7). The migration leaf is where it would be replaced.

---

## 4. Future migration leaf: `uf.hex` → `deus_master_world_palette_v1.hex`

**WBS ID:** not minted. The Coordinator mints it in `docs/worldgen/DEUS_WORLDGEN_WBS.md`; the next free WG.00 ID at Rev 15 is `WG.00.13`, but another lane may take it first. Until then this document calls it *the palette migration leaf*.
**Status:** `PLANNED`. Nothing starts until the ID is minted and the leaf is assigned.
**Depends on:** the §7 owner decisions, and the repository migration freeze (`docs/STATUS.md` §1) being lifted.

### 4.1 Scope inventory (measured in §2; re-measure when the leaf starts)

- The 101 ground-shade tones in `UF_WorldCatalog.json` and `DEUS_WorldCatalog.json`.
- `DEUS_Fire.js` `FLAME_RAMP` (7 colours).
- The other 2 `uf.hex` literals among the 9 (`#FFFFFF`, `#000000`), and a keep-or-migrate decision for each of the 159 plugin literals that are in neither palette.
- Colours baked into `game/img/` PNGs, which need a per-image census (the harness's first output).
- The 202 `tools/` scripts that quantize to or reference `uf.hex`: re-point, retire, or leave as legacy.

### 4.2 Migration harness (new tool, dry-run first)

- Proposed path: `tools/palette_migration/`.
- **Census mode (default, read-only).** For every runtime colour source, it reports each distinct colour, and whether that colour is in `uf.hex`, in the master palette, or in neither. It writes a report and changes nothing.
- **Mapping table.** A reviewed, versioned file mapping each `uf.hex` colour in use to a master colour ID, chosen per material family or ramp rather than by blind nearest-colour. With no shared entries (§2.1), every colour in use needs a row.
- **Apply mode.** Off until the mapping table is approved. It rewrites catalog tones and plugin literals, and re-quantizes PNGs from their sources where those exist. It never edits `uf.hex`.

### 4.3 Tests (each must be seen to FAIL before it counts, AGENTS rule 4)

| ID | Check | How it is made to fail |
|---|---|---|
| T1 | Every in-scope runtime colour source is a master-palette entry | Inject one off-master tone into a copy of the catalog |
| T2 | The `DEUS_Tiles` `palette_only` check reads the pixels of `UF_GenShade_E` and tests each opaque colour against the canonical palette file | Paint one off-palette pixel into the generated sheet |
| T3 | Every mapping-table row points at an existing master colour ID, and every `uf.hex` colour in use has a row | Delete a row; point a row at an unknown ID |
| T4 | Simulation output is unchanged: the per-Z worldgen checksums in `baseline/pre_migration_baseline.json` (seeds 18 and 20260923) match after the migration | Compare against a deliberately altered checksum |
| T5 | RMMZ Playtest (F5) screenshots of ground shading and fire, before and after, opened and compared, with no new F8 console errors | — (manual Definition of Done step, not an automated check) |

**Exit:**
- T1–T4 PASS, and each has been seen to FAIL;
- T5 screenshots are recorded and approved by the owner (AGENTS rule 6);
- this ADR is updated to Rev 3, naming the master palette as canonical for runtime.

---

## 5. Rev 1 statements corrected by this revision

| Rev 1 statement | What the repository shows (§2) |
|---|---|
| "`art/palette/uf.hex` (384 colors)" | 256 entries, 250 distinct. |
| "Historical prototype artwork used `uf.hex`" | Current runtime code and data use it: 101/101 ground-shade tones and 7/7 flame colours. It is also the Ultima VII daylight palette (256/256). |
| "`deus_master_world_palette_v1.hex` is the single canonical source of truth for all world, environment, character, and object art" | True only as the approved target standard. No runtime colour source uses it: 0 of 101 tones, 0 of 7 flame colours, 0 of 168 plugin literals. |
| "Automated art validation tools (`tools/art_check.js`) and palette quantizers prioritize `deus_master_world_palette_v1.hex`" | `art_check.js` uses the master registry only when a sidecar or flag opts in (§2.5). 202 tools reference `uf.hex`; 4 tools read the master registry or file. |
| "Any new asset … delivered to `game/img/` must map to `deus_master_world_palette_v1.hex`" | Replaced by §1.4, pending confirmation (§7). |
| "All non-living and living asset generation prompts must anchor against `deus_master_world_palette_v1.hex`" | Prompts may reference the target palette for art made under `art/` as migration input. Output integrated into `game/` follows §1.4 until the migration leaf lands. |

---

## 6. Not verified in this revision

- The colours inside the PNGs in `game/img/`. Only the tool references were counted.
- The contents of `baseline/pre_migration_baseline.json`, which is named as the T4 reference. It was not regenerated here.
- No RMMZ Playtest (F5) run. This revision changes no code, data or images.

---

## 7. Decisions needed

1. **Coordinator:** mint the palette migration leaf ID (§4) and record it here.
2. **Coordinator:** confirm or reject §1.4, the interim rule that `game/` colour sources use `uf.hex` until the migration leaf lands. The alternative is to keep Rev 1's rule (new `game/img/` art uses the master palette), which means shipping a mixed palette in the interim.
3. **Owner** (a candidate `docs/OWNER_DECISIONS.md` entry, which is Gemini-owned): `uf.hex` is the Ultima VII daylight palette. Should it be treated like U7 stand-in material and replaced before any release? If yes, the migration leaf is release-blocking.

---

## 8. How to re-measure (run from the repository root, Git Bash)

```bash
# 2.1 palette sizes and overlap
node -e "const fs=require('fs');const r=f=>fs.readFileSync(f,'utf8').split(/\r?\n/).filter(Boolean).map(s=>s.trim().toUpperCase());const u=r('art/palette/uf.hex'),m=r('art/palette/deus_master_world_palette_v1.hex');console.log(u.length,new Set(u).size,m.length,new Set(m).size,m.filter(c=>u.includes(c)).length)"
# 2.2 references
grep -rl "uf\.hex" game/js tools | wc -l
grep -rl "art/palette/uf\.hex" game/js tools | wc -l
grep -rl "deus_master_world_palette" game/js tools
grep -rl "DEUS_PaletteRegistry" game/js tools
# 2.4 filters
grep -rln "PIXI\.Filter\|new PIXI.filters\|ColorMatrixFilter\|fragmentSrc\|gl_FragColor" game/js/plugins
# 2.5 master palette standard (writes and removes files under art/test_scratch/)
node tools/test_palette_standard.js
```
