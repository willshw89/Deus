# Independent Review: Lane AL (Task WG.20.01)

- **Reviewer:** Gemini (`gemini-3.8-flash`, FALLBACK-MODEL RULES active; independent review)
- **Writer:** Grok (`deus-grok`)
- **Task ID:** WG.20.01 host ("DEUS Master Asset Standard")
- **Branch:** `task/lane-al`
- **Reviewed Tip SHA:** `282def9289253d944c39a601e9b20c51e7198aea`
- **Date:** 2026-09-26

---

## 1. SHA and Branch Confirmation

### Raw Output of `git rev-parse HEAD origin/task/lane-al`
```
282def9289253d944c39a601e9b20c51e7198aea
282def9289253d944c39a601e9b20c51e7198aea
```

### Raw Output of `git log -12 --format="%H %an %s"`
```
282def9289253d944c39a601e9b20c51e7198aea deus-grok [grok] WG.20.01 A1 encode addenda A1-A9 in the asset standard
ad674159bc2bbf6b92d45fa62bd59a0f914bafb8 snewt Merge task/lane-al: WG.20.01 master asset standard (PM merge; Gemini VERDICT PASS at dc6696e9ffb86ed95d8cbd7646903fd41480f77a / tip 35179ead26524953674a9320760ecc472117cf57; writer grok tip dc6696e9ffb86ed95d8cbd7646903fd41480f77a)
35179ead26524953674a9320760ecc472117cf57 deus-gemini [gemini] WG.20.01 review dc6696e9
69aa2b421ba285d018b2cb811787147470664a80 snewt [gemini] STATUS: update whitelist and lane statuses for AI/AH/AJ merges, AA/AK states
1a2c45f72ea073afc59388e3074bc0d5ac784e0d deus-pm Merge task/lane-ak: OPS.20.06 launch_worker effort + gemini provider (PM merge; Gemini VERDICT PASS at a23f42eacef21778740c8b0108e8eb2fa07e0d0a / tip fec8c591eef554651fd7f6e3766227f3612db6d8; writer grok tip a23f42eacef21778740c8b0108e8eb2fa07e0d0a)
e376917da6f55cfaf4e0ef2c9fdb41b6b7992c71 deus-pm Merge task/lane-aj: OPS.10.04 LF clone gate run (PM merge; Gemini VERDICT CLEAN PASS at d00f818a10e03ff45f2e506ada1c26757e70ff9a / tip c948df4e02e8439ec0d7ac1cb4ae46ef447da3d3; writer grok tip d00f818a10e03ff45f2e506ada1c26757e70ff9a)
3e41da1c3f0fd68df9571c1cbef52bdfaa6ad4de deus-pm Merge task/lane-ah: SIM.60.06 SRD combat stress measurement (PM merge; Gemini VERDICT CLEAN PASS at 9b8033b5e343779b93708dfac4db6185a5f8de23 / tip dda7156dfdb2ed957ab12d0196c05c1b0064fcb9; writer grok tip 9b8033b5e343779b93708dfac4db6185a5f8de23)
fec8c591eef554651fd7f6e3766227f3612db6d8 deus-gemini [gemini] OPS.20.06 review a23f42ea (independent review of launch_worker effort and gemini provider)
dc6696e9ffb86ed95d8cbd7646903fd41480f77a deus-grok [grok] WG.20.01 master asset standard, schema and validator
c948df4e02e8439ec0d7ac1cb4ae46ef447da3d3 deus-gemini [gemini] OPS.10.04 review d00f818a (CLEAN PASS)
dda7156dfdb2ed957ab12d0196c05c1b0064fcb9 deus-gemini [gemini] SIM.60.06 review 9b8033b5: VERDICT CLEAN PASS
ed563a000b294acaec61160edc7d3dd3a23a5026 deus-pm Merge task/lane-ai: OPS.30.06 catalogue pin repair (PM merge; Gemini VERDICT CLEAN PASS at 24940121652cc06ff11575608dc44a806257af99 / tip efbc59b271ee1870bda54f601d859de39dfb7053; writer grok tip 24940121652cc06ff11575608dc44a806257af99)
```

Confirmation: HEAD matches `origin/task/lane-al` at `282def9289253d944c39a601e9b20c51e7198aea`.

---

## 2. Scope Verification

- **Merge base with `origin/main`:**
  `git merge-base origin/main 282def9289253d944c39a601e9b20c51e7198aea`
  Output: `ad674159bc2bbf6b92d45fa62bd59a0f914bafb8`
  Exit: `0`

### Files Changed Between Merge-Base and Tip
`git diff --name-status ad674159bc2bbf6b92d45fa62bd59a0f914bafb8 282def9289253d944c39a601e9b20c51e7198aea`

| Status | File Path | In `lane.json` allowedPaths? |
|---|---|---|
| M | `docs/art/DEUS_ASSET_STANDARD.md` | YES (`docs/art/DEUS_ASSET_STANDARD.md`) |
| M | `game/data/UF_AssetStandard.json` | YES (`game/data/UF_AssetStandard.json`) |
| M | `tasks/WG.20.01/lane-al/BRIEF_ADDENDUM_A1.md` | YES (`tasks/WG.20.01/**`) |
| M | `tasks/WG.20.01/lane-al/REPORT.md` | YES (`tasks/WG.20.01/**`) |
| M | `tools/art/fixtures/asset_standard/addenda.json` | YES (`tools/art/fixtures/asset_standard/**`) |
| A | `tools/art/fixtures/asset_standard/biomes_six.json` | YES (`tools/art/fixtures/asset_standard/**`) |
| M | `tools/art/test_validate_asset_standard.js` | YES (`tools/art/test_validate_asset_standard.js`) |
| M | `tools/art/validate_asset_standard.js` | YES (`tools/art/validate_asset_standard.js`) |

### Prohibited Path Verification
- Edits under `art/**`: NONE (clean).
- Edits under `game/img/**`: NONE (clean).
- Edits to `docs/STATUS.md`: NONE (clean).
- Edits to WBS files: NONE (clean).
- Edits to `docs/OWNER_DECISIONS.md`: NONE (clean).
- Edits to input docs (`docs/CHARART_MASTER_CHARTER.md`, `docs/art/SRD_CHARACTER_PRESENTATION_CROSSWALK.md`, `docs/art/DEUS_FACTION_ARCHITECTURE_STANDARD.md`): NONE (clean).
- Edits under `docs/schemas/spells/**` or `tools/spells/**`: NONE (clean).
- Image files added (`.png`, `.jpg`, `.webp`, `.gif`, `.bmp`): NONE. Only `.md`, `.json`, and `.js` files were modified/added.

---

## 3. Gate Tests and Verification

All execution was verified in a fresh temporary detached clone checked out at `282def9289253d944c39a601e9b20c51e7198aea`.

### Gate Test 1: `node tools/art/test_validate_asset_standard.js`
Raw Output Excerpt:
```
PASS rows.good
PASS rows.mutant
PASS rows-mutant.good
PASS rows-mutant.mutant
PASS frame.good
PASS frame.mutant
PASS frame-mutant.good
PASS frame-mutant.mutant
PASS name.good
PASS name.mutant
PASS name-mutant.good
PASS name-mutant.mutant
PASS zorder.good
PASS zorder.mutant
PASS zorder-mutant.good
PASS zorder-mutant.mutant
PASS eight-dir.good
PASS eight-dir.mutant
PASS eight-dir-mutant.good
PASS eight-dir-mutant.mutant
PASS spell-damage.good
PASS spell-damage.mutant
PASS spell-damage-mutant.good
PASS spell-damage-mutant.mutant
PASS humanoid-rows.good
PASS humanoid-rows.mutant
PASS beast-attack.good
PASS beast-attack.mutant
PASS band-vocab.good
PASS band-vocab.mutant
PASS band-legacy-unknown
PASS pose-count.good
PASS pose-count.mutant
PASS pose-anchor.good
PASS pose-anchor.mutant
PASS pose-angle.good
PASS pose-angle.mutant
PASS deforming.good
PASS deforming.mutant
PASS face-layers.good
PASS face-layers.mutant
PASS face-background.good
PASS face-background.mutant
PASS face-expressions.good
PASS face-expressions.mutant
PASS face-anchors.good
PASS face-anchors.mutant
PASS face-anchor-missing.good
PASS face-anchor-missing.mutant
PASS item-id.good
PASS item-id.mutant
PASS art-key.good
PASS art-key.mutant
PASS icon-size.good
PASS icon-size.mutant
PASS icon-rarity.good
PASS icon-rarity.mutant
PASS resource.good
PASS resource.mutant
PASS animation.good
PASS animation.mutant
PASS animation-exception.good
PASS animation-exception.mutant
PASS remains.good
PASS remains.mutant
PASS carry.good
PASS carry.mutant
PASS vehicles.good
PASS vehicles.mutant
PASS night.good
PASS night.mutant
PASS filename.good
PASS filename.mutant
PASS ui-min.good
PASS ui-min.mutant
PASS map.good
PASS map.mutant
PASS props.good
PASS props.mutant
PASS outfit-matrix.good
PASS outfit-matrix.mutant
PASS outfit-pixels.good
PASS outfit-pixels.mutant
PASS life.good
PASS life.mutant
PASS summon-map.good
PASS summon-map.mutant
PASS summon-parts.good
PASS summon-parts.mutant
PASS skins.good
PASS skins.mutant
PASS religion.good
PASS religion.mutant
PASS religion-symbol.good
PASS religion-symbol.mutant
PASS farm.good
PASS farm.mutant
PASS food.good
PASS food.mutant
PASS dungeon.good
PASS dungeon.mutant
PASS traps.good
PASS traps.mutant
PASS lore.good
PASS lore.mutant
PASS zones.good
PASS zones.mutant
PASS scenes.good
PASS scenes.mutant
PASS marketing.good
PASS marketing.mutant
PASS tame-art.good
PASS tame-art.mutant
PASS tame-slots.good
PASS tame-slots.mutant
PASS variety.good
PASS variety.mutant
PASS variety-season.good
PASS variety-season.mutant
PASS variety-flip.good
PASS variety-flip.mutant
PASS genes.good
PASS genes.mutant
PASS portrait.good
PASS portrait.mutant
PASS portrait-name.good
PASS portrait-name.mutant
PASS head-grid.good
PASS head-grid.mutant
PASS head-extra.good
PASS head-extra.mutant
PASS head-anchor.good
PASS head-anchor.mutant
PASS elder-sheet.good
PASS elder-sheet.mutant
PASS elder-offset.good
PASS elder-offset.mutant
PASS gear.good
PASS gear.mutant
PASS mirror.good
PASS mirror.mutant
PASS poses.good
PASS poses.mutant
PASS biome-set.good
PASS biome-set.mutant
PASS biome-docs
PASS size.good
PASS size.mutant
PASS sheet.good
PASS sheet.mutant
PASS atlas.good
PASS atlas.mutant
PASS pipeline.good
PASS pipeline.mutant
PASS prompt-fields.good
PASS prompt-fields.mutant
PASS gen-log.good
PASS gen-log.mutant
PASS yield.good
PASS yield.mutant
PASS prompt-version.good
PASS prompt-version.mutant
PASS generators.good
PASS generators.mutant
PASS rule-ids
PASS rule-ids-mutant
PASS no-write-api
PASS no-write-call
PASS cli-strict-clean
PASS cli-strict-eight
PASS checks-present
RESULT: 171 passed, 0 failed
```
Exit code: `0`.

### Gate Test 2: `node tools/check_deus_syntax.js`
Raw Output:
```
Checked 52 DEUS plugin files. Errors: 0
```
Exit code: `0`.

### Read-Only Validator CLI Verification: `node tools/art/validate_asset_standard.js --json`
- Exit code: `0`
- `git status` after execution: working tree clean (writes nothing to disk).
- Summary output:
```json
{"totals":{"entries":10089,"pass":77,"violate":11,"unknown":10001},"rules":{"pass":10985,"violate":11,"unknown":10195},"globalViolations":3}
```
Global violations flagged:
1. `AS-BIOME-005` `game/data/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC`
2. `AS-BIOME-005` `docs/art/DEUS_BiomeRegistry.json canonical TEMP,WET,ARID,HIGH,VOLC`
3. `AS-BIOME-005` `catalogue canonical TEMP,WET,ARID,HIGH,VOLC`
These match REPORT.md exactly.

---

## 4. Consistency & Schema Validation

### Rule ID Consistency
- Scripted extraction of all `AS-[A-Z]+-\d{3}` rule identifiers across:
  - `docs/art/DEUS_ASSET_STANDARD.md`
  - `game/data/UF_AssetStandard.json` (`rules` object keys)
- Counts:
  - Markdown distinct rule IDs: 119
  - JSON rules object keys: 119
- Raw Diff:
  - In Markdown not JSON (count: 0): `[]`
  - In JSON not Markdown (count: 0): `[]`

### Schema Parsing and Example Validation
- `game/data/UF_AssetStandard.json` parses cleanly as JSON.
- `game/data/UF_SpellVisualTable.schema.json` parses cleanly as JSON Schema (Draft 2020-12).
- Example rows in `UF_SpellVisualTable.schema.json`:
  - Validated using `schemaErrors`: 0 schema errors.
  - Validated using `checkSpellTable`:
    - `AS-FX-003`: `pass` ("damage types")
    - `AS-FX-005`: `pass` ("schema")

### Independent Re-Derivation of Conjuration/Summon Spells (Addendum A5)
- Derived directly from `game/data/srd51/spells.json` (`kind === "spell"` across 327 entries):
  - Criteria: `Conjure `, `Animate `, `Wall of `, or named list (`Create Undead`, `Find Familiar`, `Find Steed`, `Mage Hand`, `Spiritual Weapon`, `Phantom Steed`, `Arcane Hand`, `Unseen Servant`, `Guardian of Faith`, `Faithful Hound`, `Simulacrum`, `Flaming Sphere`, `Floating Disk`, `Forcecage`, `Planar Ally`, `Spirit Guardians`), or description matching `you conjure` or `you summon`.
  - Exclusions: `Gate` (portal), `Magnificent Mansion` (dwelling), `Web` (area delivery cube).
- Re-derived spell list count: **29**
- Mapped in `UF_AssetStandard.json` (`summons` array): **29**
- Diff between re-derived list and standard `summons`: **0**
- All 29 spells define `slotId`, `directional`, `summonIn: "fx:summon-in"`, `dismiss: "fx:summon-dismiss"`, and `controllerMarker: "ui:controller-marker"`.

---

## 5. Coverage and Input Reconciliation Assessment

- **Global Rules & Foundations:**
  - DEC-007: Strictly no art generated; deliverables are docs, JSON schema, and tests only.
  - DEC-011: 1:1 pixel rendering, binary alpha, no runtime transforms/shaders/blur; 150 ms clock.
  - DEC-030: 6 biomes × 5 depth bands + 15 transitions codified in standard, JSON, and validator.
  - DEC-013: 32 layers codified.
  - DEC-027: SRD 5.1 authority codified.
  - DEC-016: Human 42 px scale codified.
- **Direction Standard (Owner 12:38 CT):**
  - Formally codified as 4 directions (S, W, E, N) in AS-GLOBAL-022 and AS-GLOBAL-023. 8-direction legacy sheets are categorized as mining sources for straight rows. 4 directions is locked and marked DECIDED in Appendix B.
- **Spell Composition (Owner 12:39 CT):**
  - 4-phase composition (cast pose + delivery shape + impact per 13 SRD damage types + lingering sim effect) codified in `AS-FX-001` through `AS-FX-007` and `UF_SpellVisualTable.schema.json`.
- **Addenda A1–A6 Codification:**
  - **A1:** 135 racial outfits (`outfitMatrix`, 9 races × 15 garbs/armour); silhouette standard by weight; pre-drawn weapon angles; deforming pieces (`AS-HUM-015`, `AS-HUM-016`, `AS-HUM-017`).
  - **A2:** Faceset backgrounds per race; 7-layer face stack; 8 standard expressions (144×144) in RMMZ 4×2 order; fixed facial anchors (`AS-FACE-001`–`AS-FACE-004`).
  - **A3:** Race-neutral SRD items with `<itemId>__<race>` art keying (`AS-ITEM-001`, `AS-ITEM-002`).
  - **A4:** Single 32×32 icon grid; resource node 4-state cycle across 6 biomes; animation by default with closed static exceptions (`AS-ICON-001`–`AS-ICON-004`, `AS-NODE-001`, `AS-ANIM-001`).
  - **A5:** 29 summon spells mapped with summon-in, dismiss, and controller marker (`AS-SUMMON-001`, `AS-SUMMON-002`).
  - **A6:** Corpses/remains/aftermath, drawn carry, vehicles/mounts, genetics loci, child & stooped working elder, night lighting hook (blur false), maps/banners, readable props, accessibility minimum 16 px, style-bible spec, file naming (`AS-REMAIN-001`, `AS-HAUL-001`, `AS-VEH-001`, `AS-HUM-018`, `AS-HUM-019`, `AS-LIGHT-001`, `AS-MAP-001`, `AS-PROP-001`, `AS-UI-003`, `AS-STYLE-001`).
- **Addenda A7–A9 (Items 1–11) Codification:**
  - **A7:** 11 player-selectable window skins (signature "Deus", "Deus Dark", and 9 racial skins in RMMZ layout); religion/magic (holy symbols, altars, shrines, distinct magic sparkle); farming/livestock; food/cooking; underground kit; traps/hazards; lore visuals; player designation overlays (`AS-UI-004`, `AS-REL-001`, `AS-FARM-001`, `AS-FOOD-001`, `AS-DUNG-001`, `AS-TRAP-001`, `AS-LORE-001`, `AS-ZONE-001`, `AS-SCENE-001`, `AS-MKTG-001`).
  - **A8:** Domestication (tamed variants, cages, pens; Owner 13:01 correction strictly enforced: `creatureEquipmentSlots: []`, `barding: false`, `craftedCreatureGear: false`; collar/saddle/harness are visual markers only); biome variety minimums (~40 surface pieces per biome, cave/fungi/ore floors); hair/face gene counts; 144×144 entity portrait required alongside icon for all non-face entities (`AS-TAME-001`, `AS-TAME-002`, `AS-VAR-001`, `AS-VAR-002`, `AS-GENE-001`, `AS-PORT-001`).
  - **A9 (Items 1–11):** 12-frame head grid and head anchors on all 236 body frames; elder reuse via torso/head offset tables; race-neutral accessories with motif decals; symmetric mirroring offline bake flag; 6 new pose rows (prone, unconscious, sleep, sit, sneak, climb) mapped to SRD conditions; AS-BIOME-005 registry validator enforcement; creature frame sizes by SRD size class; slot templates + 2048 atlas; exact-size generation production pipeline (no scaling); prompt spec templates in doc and JSON; generation accuracy feedback loop with JSON schemas (`generationLog`, `yieldMetrics`, `promptTemplateVersions`, generator adapters) (`AS-HEAD-001`, `AS-ELDER-001`, `AS-GEAR-001`, `AS-MIRROR-001`, `AS-POSE-001`, `AS-BIOME-005`, `AS-SIZE-001`, `AS-SLOT-001`, `AS-PIPE-001`, `AS-PROMPT-001`, `AS-GEN-001`–`AS-GEN-004`).
- **Existing Input Reconciliations:**
  - CHARART charter: 58 logical action tokens and F01–F14 mapped onto standard humanoid rows.
  - Sockets: Baseline human sockets and creature sockets reconciled from crosswalk §3.2 and charter §4.3.
  - Faction Profiles: 6 profiles from `DEUS_FACTION_ARCHITECTURE_STANDARD.md` mapped to universal building classes and style profile banners.
  - Existing Assets: 34 human T0 paperDoll catalogue entries, 116 generator pool keys, 688 sidecars, 474 `$gen_*` charsets reconciled and categorized in Appendix C.
  - DEUS_Anim: 8 animations and 18 equipment slots reconciled; carry drawn overrides plugin omission.

---

## 6. Findings

### BLOCKER Findings
*None.*

### MAJOR Findings (Post-Launch Addenda Items 12–15; Routed to Queued Follow-Up Leaf A9b)

The following four items were issued by the Owner between 13:30 and 14:10 CT on 2026-09-26, after the writer's 13:45 run launched. Per reviewer instructions, they do not invalidate items 1–11 and are recorded as MAJOR findings routed to the queued follow-up lane (`PROPOSED-AL-17` / A9b):

1. **MAJOR: A9 Item 12 (Owner 13:30–13:37 CT) — Paper-Doll Source Sheet Spec, LFS Policy, Preview Gate, and Generator Cap.**
   - *Requirement:* Standardize 768×1440 one-sheet-per-layer-design paper-doll source sheets (30 rows); retain RMMZ-native sizes; enforce 2048 px cap; source templates + slot maps stored in repo, approved art via Git LFS, raw generations/rejects/logs excluded; Owner 1:1 animated in-game preview yea/nay gate before merge; one generator per category, no mixing within a layered set, 2–3 generators total; validator checks.
   - *Status:* Arrived post-launch; not present at SHA `282def92`. Route to follow-up A9b.

2. **MAJOR: A9 Item 13 (Owner 13:50 CT) — Creature Sex Variants and Humanoid Templates.**
   - *Requirement:* Male/female humanoid templates, per-sex hair/beards/face bases, garb on each body, own child bodies; creature sex sets only where visible and breeding/herd-relevant via a per-creature `sexVariant` flag; validator checks.
   - *Status:* Arrived post-launch; not present at SHA `282def92`. Route to follow-up A9b.

3. **MAJOR: A9 Item 14 (Owner 13:56 CT) — Permanent Human-Readable Per-Slot IDs & Provenance Schema.**
   - *Requirement:* Permanent unique human-readable per-slot IDs (`category.layer.race.sex.design.row.direction.frame`), never reused, linked to catalogue ID/sheet/cell/anchor; provenance record (attempts, generator+version, seed, validation, reviewer, Owner approval, timestamps); runtime and packer resolve by ID only; per-category ID grammar in standard; validator checks uniqueness and grammar.
   - *Status:* Arrived post-launch; not present at SHA `282def92`. Route to follow-up A9b.

4. **MAJOR: A9 Item 15 (Owner 14:09+14:10 CT) — Tool-Side Anchor Alignment, Landmark Detection, and Equipment Anchoring.**
   - *Requirement:* Tool-side anchor alignment (pixel landmark detection: feet pivot, head centre, main/off-hand; whole-pixel shift onto slot-map anchors; detected anchors in serialized slot record; reject+regenerate on clipping, wrong proportions/size or head drift) and equipment anchoring (per-frame main/off-hand anchors, grip angle, per-direction draw-order flag; weapons/shields drawn once per grip pose and pinned by compositor); Deus Art manual note.
   - *Status:* Arrived post-launch; not present at SHA `282def92`. Route to follow-up A9b.

### MINOR Findings

1. **MINOR: 11 legacy catalogue filenames violate AS-STYLE-001 under `--strict`.**
   - *Detail:* The existing catalogue contains 11 legacy filenames lacking race tags (e.g. `$UF_Layer_bow_short.png`) or using pre-standard face names (e.g. `UF_Faces_Human_Male_Adult.png`).
   - *Status:* Correctly identified and documented in REPORT.md as `PROPOSED-AL-05`.

2. **MINOR: AS-BIOME-005 flags legacy 5-biome sets in existing files.**
   - *Detail:* `validate_asset_standard.js` correctly flags 3 global violations on `AS-BIOME-005` in `game/data/DEUS_BiomeRegistry.json`, `docs/art/DEUS_BiomeRegistry.json`, and `art/catalogue/catalogue.json` because those files still list 5 canonical biomes (`TEMP,WET,ARID,HIGH,VOLC`).
   - *Status:* Lane AL correctly respected scope by leaving those external files untouched and documenting the follow-up fix as `PROPOSED-AL-12`.

---

## 7. Conclusion

Commit `282def9289253d944c39a601e9b20c51e7198aea` successfully implements all Brief requirements and Addenda A1 through A9 (items 1–11): 119 normative rules with 100% bidirectional consistency between markdown and machine JSON, 171 passing automated tests with killed mutants, a strictly read-only validator CLI that leaves working tree clean, exact independent re-derivation of all 29 conjuration/summon spells, and zero unauthorized file modifications or art generation. The four post-launch rulings (items 12–15) are recorded as MAJOR findings for execution in follow-up leaf A9b.

VERDICT: PASS
