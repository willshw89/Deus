# Lane AM Brief: DEUS Audio Standard (docs + schema + validator; NO AUDIO, NO ART)

**NO AUDIO GENERATION AND NO ART GENERATION BY ANYONE (DEC-007 spirit, Owner 12:52 CT).** No sound, music, voice or image files are generated, recorded, synthesized, edited, requested, prompted or integrated in this lane. Deliverables are text, JSON and code only.

**Lane:** lane-am | **Task ID:** `DEUS-TSK-AUDIO-STD` (non-WBS task folder, precedent `tasks/DEUS-TSK-FABLE-19C`) | **Branch:** task/lane-am | **Worktree:** `C:\Users\snewt\.deus_worktrees\lane-am` | **Writer:** grok (grok-4.7, reasoning effort xhigh, multi-agent on) | **Reviewer:** gemini (gemini-3.1-pro-preview thinking HIGH after the ~19:05 CT reset; gemini-3.8-flash HIGH as step-down), queued behind the AA and AL reviews | **Size:** L | **Base:** origin/main `7d2e1cade43a9dc77b2adb608c43ab3d282c9ec2` | **Source:** Owner record 2026-09-26 12:52 CT ("DEUS Audio Standard") and Owner launch order 12:55 CT. PM brief ~12:57 CT (main-chat ops for the Owner).
**WBS note:** no existing WBS leaf covers audio (searched docs/art/DEUS_WORLD_WBS.md, docs/society/DEUS_SOCIETY_WBS.md, docs/worldgen/DEUS_WORLDGEN_WBS.md for audio/sound/music/SFX/BGM/ambient: zero leaves). No WBS ID is minted and no WBS status changes. List "dedicated WBS leaf(s) for the audio standard and its follow-ups" as an open PM/Owner item in Appendix B.

## Deliverables (exact paths; mirrored in lane.json)
1. `docs/audio/DEUS_AUDIO_STANDARD.md`: the master audio standard (normative, MUST/SHOULD language; every rule has a stable ID such as `AU-GLOBAL-003`, `AU-FOOT-012`). It includes a **Validator spec** section (what the validator checks, inputs, outputs, exit codes).
2. `game/data/UF_AudioStandard.json`: machine-readable form (`schemaVersion`, a `rules` index keyed by the same rule IDs, a `categories` map with required sets, naming patterns, format/loudness targets, attenuation parameters). Every JSON rule ID exists in the .md and vice versa.
3. `game/data/UF_AudioStandard.schema.json`: JSON Schema (state draft 2020-12 or 07) for UF_AudioStandard.json and for a per-sound event table row (event ID, category, RMMZ folder, file stem, variants, loop points, attenuation class, layer-audibility rule).
4. `tools/audio/validate_audio_standard.js`: validator (Node, no new dependencies) that reads the two JSON files and inventories `game/audio/{bgm,bgs,me,se}/**` READ-ONLY by file name/extension/size only (it must not decode, play, transcode or write audio), reporting per required-set item: present / missing / misnamed / unknown. Flags: `--json`, `--category <CAT>`, `--strict` (non-zero exit on violations). Coverage report, not a hard fail on today's assets. Never writes under `game/audio/**`.
5. `tools/audio/test_validate_audio_standard.js` + `tools/audio/fixtures/audio_standard/**` (JSON fixtures and zero-byte placeholder names only; NO audio content): valid set, missing required event, bad name, wrong folder, bad loop metadata, unknown damage type / spell school / biome, missing layer-attenuation class. Each check has a killed mutant. Print `RESULT: N passed, 0 failed`.
6. `tasks/DEUS-TSK-AUDIO-STD/lane-am/REPORT.md`: what was written, reconciliation notes, gate output, appendix copies.

## Required content of DEUS_AUDIO_STANDARD.md
1. **Global:** file formats (RMMZ/NW.js: .ogg primary; state whether .m4a is needed for any target), sample rate, bit depth, channels (mono for positional SFX, stereo for music/ambience), loudness targets (integrated LUFS and true-peak per category: music, ambience, SFX, UI, voice/vocals), loop-point conventions (RMMZ LOOPSTART/LOOPLENGTH tags), variation counts (round-robin variants per event), and naming conventions (`<category>_<subject>_<variant>_<nn>` style, reconciled with existing file names in game/audio/**).
2. **RMMZ audio folder conventions:** `bgm` (music), `bgs` (ambient loops), `me` (short music effects/stingers), `se` (sound effects); map every category below to a folder; RMMZ volume/pitch/pan fields; existing counts today (bgm 48, bgs 29, me 27, se 345 files; verify) and how they map (Appendix C).
3. **Footsteps** per surface material (stone, dirt, grass, sand, snow, ice, mud, wood, metal, water shallow/deep, gravel, ash/volcanic rock, etc., reconciled with the terrain/material data in the repo) and per biome (6 biomes x 5 depth bands, DEC-030), per SRD size class (Tiny..Gargantuan) and gait (walk/run/sneak).
4. **Hit sounds per SRD damage type** (13: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder), plus hit-on-material variants (flesh, armour weight light/medium/heavy, shield, stone, wood) and miss/parry/block/crit.
5. **Spell sounds per spell school** (8 SRD schools: abjuration, conjuration, divination, enchantment, evocation, illusion, necromancy, transmutation) and **per delivery shape** (projectile/bolt, beam, cone, line, sphere/burst, cylinder, self-aura, touch, instant-at-target, matching Lane AL's spell composition: cast / delivery / impact / lingering loop), concentration loop, fizzle/dispel.
6. **Weapon, craft and work loops:** per SRD weapon group (swing, thrust, draw/loose, crossbow, thrown, reload), and work loops (hammer, saw, chop, dig, mine, stir, carry, kneel, forge, loom, mill), start/loop/stop structure.
7. **Creature vocal sets per creature class** (SRD creature types: aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, undead; plus the 9 races for humanoid vocals): idle, alert, attack, hurt, death, and emote barks matching RMMZ balloon emotes; scaled by size class.
8. **Ambient loops** per biome, depth band, weather (clear, rain, storm, snow, fog, wind) and season, plus settlement/interior/underground beds and layering rules (max simultaneous beds).
9. **UI sounds:** cursor, ok, cancel, buzzer, equip, save/load, menu open/close, notifications, alerts (raid, fire, death, birth), designation/build placement, reconciled with RMMZ system sounds in System.json.
10. **Music stems** per biome and state (peace, tension, combat, victory, defeat, night, underground, festival/event), stem layering and transition rules (bar-aligned crossfades, stingers via `me`).
11. **3D and Z-layer attenuation (DEC-013: 32 layers, 1 layer = 10 ft, 1 cell = 5 ft):** distance falloff in cells, pan from screen position, per-layer attenuation for sounds on other Z layers (muffling approximated by volume/pitch/filter-free variants only if a pre-rendered "muffled" variant exists; state whether any runtime low-pass is allowed and flag it for the Owner), audibility rules through openings, the focus layer vs lower-layer events, concurrent-voice caps and priority.
12. **Validator spec** (see Deliverable 4).
Appendices: **A: Conflicts** (existing file names or docs vs the standard; Owner rulings win), **B: Open questions for the Owner** (e.g. WBS leaves, runtime DSP allowance, voice acting scope, licensing/source of stock audio; do not guess), **C: Existing-asset mapping** (what the 449 current files map to).

## Inputs to read
`game/audio/**` (names only), `game/data/System.json` (sounds), `game/js/plugins/*.js` that call AudioManager (e.g. DEUS_FactionMenus.js), `game/data/srd51/{spells,creatures,equipment,rules}.json`, `docs/OWNER_DECISIONS.md` (DEC-007, DEC-011, DEC-013, DEC-016, DEC-027, DEC-030), Lane AL's brief `tasks/WG.20.01/lane-al/BRIEF.md` on origin/task/lane-al for the spell composition and naming style (read-only; do not depend on unmerged files).

## allowedPaths (exact; mirrored in lane.json)
- `docs/audio/DEUS_AUDIO_STANDARD.md`, `game/data/UF_AudioStandard.json`, `game/data/UF_AudioStandard.schema.json`, `tools/audio/validate_audio_standard.js`, `tools/audio/test_validate_audio_standard.js`, `tools/audio/fixtures/audio_standard/**`, `tasks/DEUS-TSK-AUDIO-STD/**`
**FORBIDDEN:** everything else, including `game/audio/**` (read-only), `game/img/**`, `art/**`, `game/data/System.json`, every `*WBS*.md`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, Lane AL's paths, and anything outside the repo. Need another file? Write `escalation.md`, commit, push, stop.

## Acceptance
- .md and JSON agree (same rule IDs); JSON parses; schema is valid JSON Schema and validates UF_AudioStandard.json.
- `node tools/audio/test_validate_audio_standard.js` passes; `node tools/audio/validate_audio_standard.js --json` runs against the real game/audio tree without writing anything; summary pasted into REPORT.md.
- All 12 content sections present with required sets the validator can test. No audio or art produced.

## Gate tests
- `node tools/audio/test_validate_audio_standard.js`
- `node tools/check_deus_syntax.js`

## Standing rules (all lanes)
1. **NO AUDIO AND NO ART GENERATION BY ANYONE.** No sound/music/voice/image files, no generation prompts.
2. Write only inside allowedPaths. Anything else: write `escalation.md` in the task folder, commit, push your branch, stop.
3. Never answer an open Owner question; list it in Appendix B and REPORT.md. Never mint WBS IDs or change WBS statuses; proposed follow-ups are `PROPOSED-AM-NN`.
4. Run commands in the FOREGROUND; never end your turn with background jobs or child processes alive. Commit early (WIP commits allowed). Throwaway clones only under %TEMP%, deleted before your final commit.
5. Run every lane.json gate test before the final commit and paste the output into REPORT.md.
6. Never weaken an existing assertion or gate. Keep check_deus_syntax passing.
7. Do not merge; do not self-certify. An independent Gemini review (launched later by the PM) decides.
8. Push only your own branch (`git push origin task/lane-am`); you MAY and MUST push it. Never main, never force, never set DEUS_INTEGRATOR. Final output line: `FINAL SHA: <sha>`.
9. Multi-agent is on: use subagents for research/verification where it helps, but you own every commit.