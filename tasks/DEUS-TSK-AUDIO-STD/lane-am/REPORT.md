# DEUS-TSK-AUDIO-STD lane-am report

Writer: grok. Branch: `task/lane-am`. No merge. This report does not certify the lane. Gemini reviews later.

No audio and no art were generated. No file under `game/audio/**` was decoded, played, transcoded, or written. The inventory used file names, extensions, and byte sizes only.

## What was written

- `docs/audio/DEUS_AUDIO_STANDARD.md` — normative standard, 84 rules (`AU-*`), Appendices A–C, open questions `OQ-01`–`OQ-14`, follow-ups `PROPOSED-AM-01`–`PROPOSED-AM-06`. No WBS id was minted.
- `game/data/UF_AudioStandard.json` — `schemaVersion` `1.0.0`, the same rule ids, closed sets, required-event generators, and the 449-file legacy census.
- `game/data/UF_AudioStandard.schema.json` — JSON Schema draft 2020-12 for the document and for one event row.
- `tools/audio/validate_audio_standard.js` — Node checker, no new dependencies. It does not write and does not read audio bytes.
- `tools/audio/test_validate_audio_standard.js` and `tools/audio/fixtures/audio_standard/**` — fixture documents and zero-byte `.ogg` names only.

The required event catalog expands to 1136 events. None of the canonical stems exist on disk yet. That is a coverage report, not a document error.

## Reconciliation

Owner decisions win. DEC-030 (six biomes × five depth bands, z -16..+15) replaces DEC-013's five bands and 25-biome draft for audio routing. DEC-013 still supplies 32 layers, 5 ft cells, and 10 ft layers. DEC-027 supplies the 13 damage types and SRD combat. DEC-025 supplies the nine races. DEC-011 forbids runtime visual filters; it does not decide audio DSP, so a runtime low-pass is not authorized and is left open (`OQ-02`). DEC-016: distances are sim feet, not catalogue pixels.

Census on 2026-09-26, names and sizes only: bgm 48, bgs 29, me 27, se 345, total 449, all `.ogg`, none empty. `AudioManager.audioFileExt` returns `.ogg` only, so `.m4a` is not required on this tree.

Spell shape and phase names follow the Owner composition of 2026-09-26 12:39 CT (cast / delivery / impact / linger). This lane does not depend on Lane AL's unmerged files.

## Validator against the real tree

`node tools/audio/validate_audio_standard.js` (human) and `node tools/audio/validate_audio_standard.js --json` both exited 0. The JSON report was about 623284 bytes. Summary:

```
documentErrors: 0
events: 1136
present: 0
missing: 1085
misnamed: 51
unknown: 258
wroteAudio: false
decodedAudio: false
```

By category: foot 0/43/2, hit 0/99/9, spell 0/311/1, wpn 0/12/3, work 0/32/1, vocal 0/345/0, amb 0/45/5, bgm 0/189/3, ui 0/8/24, me 0/1/3 (present/missing/misnamed). `--strict` would exit 1 because canonical files are absent. That flag is not a lane gate. Document errors stay at 0.

## Gate output

`node tools/audio/test_validate_audio_standard.js`

```
PASS valid_set
PASS valid_set_mutant_killed
PASS missing_required_event
PASS missing_required_event_mutant_killed
PASS bad_name
PASS bad_name_mutant_killed
PASS wrong_folder
PASS wrong_folder_mutant_killed
PASS bad_loop
PASS bad_loop_mutant_killed
PASS unknown_damage_type
PASS unknown_damage_type_mutant_killed
PASS unknown_spell_school
PASS unknown_spell_school_mutant_killed
PASS unknown_biome
PASS unknown_biome_mutant_killed
PASS missing_attenuation_class
PASS missing_attenuation_class_mutant_killed
PASS legacy_alias_misnamed
PASS legacy_alias_misnamed_mutant_killed
PASS unknown_file
PASS unknown_file_mutant_killed
PASS strict_exit_code
PASS strict_exit_code_mutant_killed
PASS json_flag
PASS json_flag_mutant_killed
PASS category_filter
PASS category_filter_mutant_killed
PASS no_audio_write
PASS no_audio_write_mutant_killed
PASS no_audio_bytes
PASS no_audio_bytes_mutant_killed
PASS category_counts
PASS category_counts_mutant_killed
PASS variant_shape
PASS variant_shape_mutant_killed
PASS rules_match_markdown
PASS rules_match_markdown_mutant_killed
PASS rules_diff_detects_mismatch
PASS rules_diff_detects_mismatch_mutant_killed
PASS open_questions_match
PASS proposals_match
PASS markdown_mentions_closed_sets
PASS markdown_mentions_closed_sets_mutant_killed
PASS repo_sets_covered
PASS repo_sets_covered_mutant_killed
PASS missing_keys_detects
PASS missing_keys_detects_mutant_killed
PASS schema_keywords_supported
PASS schema_keywords_supported_mutant_killed
PASS no_minted_wbs_ids
PASS no_minted_wbs_ids_mutant_killed
PASS wbs_scan_detects
PASS self_check
PASS self_check_mutant_killed
PASS production_document
PASS production_coverage
PASS production_json
RESULT: 58 passed, 0 failed
```

`node tools/check_deus_syntax.js`

```
Checked 52 DEUS plugin files. Errors: 0
```

## Appendix A (conflicts)

Copied from the standard. Owner decisions and the lane brief win.

1. DEC-013's five bands and 25 biomes vs DEC-030's six biomes and five depth bands. Audio uses DEC-030. Layer count and feet stay from DEC-013.
2. `DEUS_BiomeRegistry.json` five biomes and forbidden snow/ice vs DEC-030 cold and the snow/ice surfaces.
3. Palette registry "zero snow/ice" vs `groundKinds` `snow` and `ice` and this brief.
4. Catalog biome list (33 ids, no volcanic id) vs the six DEC-030 biomes. `mountain` routes to wild plus highlands.
5. Catalog about-text says the underground layer was removed. Decisions require 32 layers.
6. `System.json` armor types omit medium armor and split shields. Hits use SRD light, medium, heavy, and shield.
7. Six creatures typed `swarm of Tiny beasts` use the beast vocal set at tiny size.
8. Cultures and skins include peoples outside the nine SRD races. They do not get race vocals here. See OQ-07.
9. Menu BGM: catalog objects at volume 90 vs `DEUS_FactionMenus.js` string name at volume 80. Not edited.
10. Stock PascalCase names vs the canonical `_01` grammar. Census is the alias table.
11. Four stems and four beds vs stock one BGM, one BGS, one ME. Interim playback is specified. Mixer is PROPOSED-AM-01.
12. Upstream MZ `.m4a` fallback vs this tree's `.ogg`-only `audioFileExt`.
13. DEC-011 visual filters vs audio DSP. Mix path is volume, pitch, and pan. Low-pass is OQ-02.
14. Owner animation list includes dodge and omits mine, forge, loom, and mill. Audio requires those work loops and does not require a dodge outcome.
15. Charter keys `weapon_whoosh` and `blade_cut_flesh` are not canonical stems.
16. Engine weather tokens vs the six audio weathers. Projection is AU-AMB-004. OQ-14 asks if it should change.
17. `DEUS_Core` season hour-bands vs open DEC-026. Audio keeps four labels.
18. Water id `icy` is not the ice surface. Ground id `ash` is not the ash tree.
19. `Battle1` exists in both `bgm` and `se`. Use-item and use-skill both name `Item3`. `se/Run.ogg` is escape, not the run gait.
20. Ship and Theme tracks are not required states.
21. `Gun` and `Shot` files have no SRD weapon group.
22. `docs/LEGAL.md` states SRD CC-BY-4.0 and does not state a license for the stock audio.

## Appendix B (open questions)

Not answered here.

- OQ-01: Dedicated WBS leaf for this standard and its follow-ups. None minted.
- OQ-02: Runtime low-pass, HRTF, or time-stretch.
- OQ-03: Listener is the player layer or the viewed layer.
- OQ-04: Does a closed window conduct sound?
- OQ-05: Voice performance method and language.
- OQ-06: License and source of stock audio and of later recordings.
- OQ-07: Vocal identity for peoples outside the nine SRD races.
- OQ-08: Whether vehicle travel is a required music state.
- OQ-09: Whether firearms get a weapon group.
- OQ-10: Balloon indices 11–15.
- OQ-11: Which clock feeds the four season labels after DEC-026.
- OQ-12: Whether a non-Ogg target must ship `.m4a`.
- OQ-13: Whether music or vocals follow race home layers once DEC-013 assigns them.
- OQ-14: Whether overcast, heatwave, coldsnap, or blizzard should get their own beds.

## Appendix C (existing files)

The 449-row map is Appendix C of `docs/audio/DEUS_AUDIO_STANDARD.md` and `legacyCensus` in `game/data/UF_AudioStandard.json`. 258 files have no `mapsTo` (unknown). The other 191 are aliases and account for the 51 misnamed events. No canonical stem is present.

## Follow-ups (not WBS ids)

PROPOSED-AM-01 stem and bed mixer (volume, pitch, pan only). PROPOSED-AM-02 Owner-gated library (record or license; not a generation prompt). PROPOSED-AM-03 optional header-only loop-tag check. PROPOSED-AM-04 point `System.json` at canonical stems. PROPOSED-AM-05 fix faction menu BGM playback. PROPOSED-AM-06 move catalog biome ids onto the six DEC-030 tokens.
