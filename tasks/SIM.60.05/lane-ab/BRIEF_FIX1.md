# Lane AB FIX 1: SIM.60.05 after the Claude review FAIL at 1057a448 (PM, 2026-09-26 ~10:40 CT)

**NO ART GENERATION BY ANYONE (DEC-007).** This file adds to `tasks/SIM.60.05/lane-ab/BRIEF.md`. That BRIEF stays the authority for everything not changed here (allowedPaths, FORBIDDEN list, Owner rules, deliverables, acceptance criteria, standing rules). Where they differ, this file wins.

## State of the branch (checked by the PM)
- Writer tip: `1057a4487f1f4a362d5af4da1a1aa10e0f927af1` (`[grok] SIM.60.05 SRD 5.1 rules engine`).
- Independent Claude review: `b8d399320a60b198c96582c993dd1f40a4f6b20e`, file `tasks/SIM.60.05/lane-ab/review_claude_1057a448.md`. Result: 0 BLOCKER, 5 MAJOR, 9 MINOR, **VERDICT: FAIL**. Read the whole review file first, especially sections 9-11. Do not edit or delete it.
- **Reviewer change (Owner crossload ruling, 2026-09-26 10:19 CT):** the re-review of your FIX1 tip is done by **Gemini (gemini-3.1-pro-preview)**. This PM commit sets `lane.json` `reviewer` to `gemini`. Do not edit `lane.json`.

## Authority (PM ruling for FIX1)
**SRD 5.1 (`game/data/srd51/`) is the only source of combat numbers. The V64/OSRS catalog combat block is retired (DEC-027, V47)**: no hit points, attack, defence, level or bonus value from `UF_WorldCatalog.json` / `DEUS_WorldCatalog.json` `combat` blocks may feed a runtime combat number. Catalog data stays read only. The plugin simply stops reading those fields. Where the SRD has no creature for a DEUS species, the species gets an explicit **SRD proxy** (see MAJOR-2/3). Never a fallback formula.

## MAJORs (all required)
**MAJOR-1: runtime creature HP from the SRD stat block.**
- `maxHp` for any unit with an SRD block (mapped or proxy) is that block's hit points. Use the printed average as the default. Rolling the formula with the seeded rng is allowed only if the BRIEF or DEC-027 says so; otherwise use the average and record the choice in REPORT.md.
- Route this through `UF.Rules.hitPoints` (or an equivalent rules call), not through `wildlife.species[].combat`.
- Correct the plugin header (`DEUS_Combat.js:18`), `docs/systems/UF_Combat.md`, `docs/systems/DEUS_Rules.md:28` and REPORT.md.
- Add a check that walks every catalog species and asserts runtime `maxHp` equals the SRD block value (wolf 11, deer 4, jackal 3, boar 11, giant spider 26, troll 84), plus a mutant that feeds catalog HP and is killed.

**MAJOR-2 and MAJOR-3: no unit in shipped content may be unresolvable, and every NW.js suite must be measured.**
1. **Complete species mapping.** Every one of the 23 catalog species maps to an SRD 5.1 creature, either directly or as a proxy. That includes the 14 unmapped ones: hare, fowl, fox, arctic_fox, wildcat, serpent, songbird, bog_horror, sand_stalker, restless_dead, aurochs, wild_horse, wild_sheep, ice_wraith. Pick the nearest SRD 5.1 stat block by size, role and attacks, for example Cat, Rat, Hawk, Raven, Poisonous Snake, Jackal, Draft Horse, Riding Horse, Goat, Elk, Shambling Mound, Zombie, Ghoul, Specter or Wraith. Choose from the real `game/data/srd51/` data and never invent a stat block. Keep the table in `game/js/sim/rules/**` as data, one row per species: `species`, `srdId`, `kind: "direct"|"proxy"`, and a one-line reason. In REPORT.md, mark every proxy `PM_DEFAULT (Owner may re-map)`. A natural attack maps to the proxy's own printed actions, so there is no `UNKNOWN_WEAPON` for catalog natural attacks.
2. **Humanoids with no stats** (for example `DEUS_Anim.js:2034-2047` `TEST_anim_fighter` / `TEST_anim_guard`, species `human` with no `stats`, and `tools/bench_render_layers.js:573-575` units built with `combatLevels` only) resolve with the SRD **Commoner** stat block (`srd51` creatures). Its AC, HP and club attack apply unless the unit carries real SRD character data. This is an SRD default, not a formula. It keeps callers outside allowedPaths working **without editing them**. Document it in `DEUS_Rules.md`.
3. `NO_SRD_MAPPING` / `UNKNOWN_WEAPON` / `UNKNOWN_ARMOR` still fail loudly for anything that is neither catalog content nor a humanoid default (fixtures prove it). Add a check that walks every catalog species against every catalog weapon and armor: every attacker/target pair resolves without throwing.
4. **Escalation rule:** if any caller outside allowedPaths still breaks after 1-3, write `tasks/SIM.60.05/lane-ab/escalation.md`, commit, push and stop. Do not edit it yourself. `DEUS_Test.js:490` `legacy: true` and `DEUS_Wildlife.js:1117-1124` (second damage law; Lane AA's live file) are follow-ups: record them as `PROPOSED-AB-NN`, never edit them.
5. **NW.js runs (required).** In a throwaway clone under `%TEMP%` (never the worktree), run the `tools/run_tests.js` suites **`combat`** and **`anim`** at your FIX1 tip, and `anim` at the base `819ef62d` as well. Paste the tails with pass/fail counts. `combat` must pass fully, with `srd_creatures` fixed or its expectation corrected to the new mapping. `anim` must be no worse than base (base: 5 passed, 5 failed). Every check that passed at base must pass. Close NW.js and delete the clone before your final commit. Correct `REPORT.md:21` and `:41`/`:47`. State the live-play effect before and after the fix (at 1057a448, unmapped units neither dealt nor took damage and logged a console error per swing).

**MAJOR-4: `armor_leather`.** Map the catalog id `armor_leather` (slot `torso`) to SRD Leather armor in `ITEM_ALIASES`. Add a check that walks **every** catalog item in an armor, shield, torso or clothes slot and asserts that each one resolves to an SRD armor or shield, or is explicitly non-armor in a listed table. Add a mutant that drops the alias and is killed.

**MAJOR-5: printed saving throws.** `savingThrow` for a creature uses the stat block's printed `savingThrows` bonus when present, and ability modifier plus proficiency rules otherwise. Add a check over all printed save entries: 315 of 315 must equal 10 + the printed bonus at roll 10. Include the named case: Adult Red Dragon Con save +13. Add a mutant that ignores printed saves and is killed.

## MINORs (fix all nine)
- **MINOR-1:** apply the SRD sentence in `srd:rule:combat-damage-and-healing` ("Resistance and then vulnerability are applied after all other modifiers"). Resistance and vulnerability to one type both apply in that order (25 fire → 12 → 24). Close REPORT open question 8 with that citation.
- **MINOR-2:** apply unconditional rider damage ("plus N (XdY) type damage", 60 cases) with its own damage type and resistances. Apply save-gated riders (52 cases) through `savingThrow` where the DC, the ability and the effect parse from the data. Examples: Adult Red Dragon bite 2d10+8 piercing plus 2d6 fire; giant_spider 2d8 poison on a failed DC 11 Con save. List every rider still not applied, with a reason, as a counted gap in REPORT.md.
- **MINOR-3:** remove the OSRS remnants:
  - `combatLevel` and its formula. Rank targets by SRD CR for creatures and character level for characters. Fix the chronicle text.
  - `level()`, `bonusesOf`, the style accuracy/strength/defence fields, `levelOffset` and `magicDefence`, wherever nothing SRD needs them.
  - The requirement in `srd_creatures` that species carry the OSRS block.
  - Extend `zero_retired_formula` to cover every removed name. The catalog data itself stays read only.
- **MINOR-4:** the named-outcome branch (`opts.hit` / `opts.damage`) still applies resistances, immunities and vulnerabilities through `UF.Rules`. Record `DEUS_Test.js:490` `legacy: true` as PROPOSED.
- **MINOR-5:** add a direct loader proof. A check loads the real `DEUS_Combat.js` (vm with a window stub) and asserts that `window.UF.Rules` is published by the plugin. `rulesApi()` must not silently rebuild the engine when nothing is published: fail loudly or document why it rebuilds. Mutant M10 (drop `mod.attach(window, rules)`) must be killed by that check, not by a TypeError elsewhere.
- **MINOR-6:** add checks for M14 (the plugin's default rng is seeded and deterministic) and M16 (`opts.magical` bypasses "nonmagical" resistance only).
- **MINOR-7:** `sheet_clothes_alias_has_no_torso_slot` must not record a UI gap as a pass. Make it an explicit known-gap entry that is reported but not counted as a pass, referencing PROPOSED-AB-03. Fixing DEUS_Sheet later must not turn a gate red.
- **MINOR-8:** fix the text and small-rule mismatches:
  - `opts.unarmoredDefense` vs `data.unarmoredDefense`: make the code and the text agree.
  - Death-save thresholds and long jump: read them from srd51 if they are there; otherwise correct `DEUS_Rules.md:48` to say they are SRD-cited literals.
  - Monk Unarmored Defense: no shield allowed (SRD). Add a test.
  - Name `AMBIGUOUS_ATTACK` in the REPORT open questions.
- **MINOR-9:** record `DEUS_Wildlife.js:1117-1124` (catalog `combat.attack` subtracted from prey HP, a second damage law) as `PROPOSED-AB-NN`, a follow-up for after Lane AA. Do not edit it.

## Scope, gates and report
- Write only inside the BRIEF's allowedPaths (`game/js/sim/rules/**`, `game/js/plugins/DEUS_Combat.js`, `tools/rules/**`, the four proof/test files, `docs/systems/UF_Combat.md`, `docs/systems/DEUS_Rules.md`, `tasks/SIM.60.05/**`). Everything else is read only, including `game/data/**`, every other plugin, `lane.json`, STATUS, VISION and every WBS.
- Run every lane.json gate exactly as written, in the foreground, and keep the raw `EXIT=` lines. Paste them into a new REPORT.md section `## FIX1 (after review_claude_1057a448)`. Add a table with one row per finding (MAJOR-1..5, MINOR-1..9): what changed, where, and the check, mutant or NW.js result that proves it. Also give the species mapping table and the rider gap count.
- Scope proof: paste `git diff --name-only $(git merge-base origin/main HEAD) HEAD`. Every path must match allowedPaths.
- Commit messages start `[grok] SIM.60.05`. Push only `task/lane-ab`. Never push main, never force, never set DEUS_INTEGRATOR. Do not merge. Do not self-certify: the Gemini re-review decides.
- Your last output line must be `FINAL SHA: <sha>`, pasted from `git rev-parse HEAD` after the push.