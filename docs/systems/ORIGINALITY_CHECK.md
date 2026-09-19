# ORIGINALITY_CHECK

## 1. Purpose

`tools/originality_check.js` is an offline Node.js originality gate for PNG assets. It combines recorded provenance with comparison against the local Ultima VII shape libraries: known stand-ins fail before visual scoring; other candidates are compared for copied sprites and ground textures. It supports AGENTS rule 8 and the art delivery checks without loading reference material into the game. A PASS means the checker found no failing evidence; it is not user approval or proof of independent creation.

## 2. Public API

Require `tools/originality_check.js` from another Node tool. It depends on Node's `fs`, `path`, `zlib` and the local `png_read` / `png_util` modules, with no external package dependency. Relative candidate paths resolve from the caller's working directory. The default index resolves from the project root.

### File and sheet checks

| Function | Arguments | Return value |
|---|---|---|
| `checkFile(file, opts = {})` | PNG path; optional `frame: [width, height]`, `index: path`, `thresholds` | Sheet result described below. An unreadable PNG returns FAIL. Provenance is evaluated before decoding or scoring. |
| `checkSheet(sheet, opts = {})` | In-memory `{w, h, px}` or `{w, h, d}` RGBA bytes; the same frame/index/threshold options | Sheet result, based on pixels only: this API has no file path from which to establish provenance. |
| `candidateFrames(file, opts = {})` | PNG path; optional `frame: [width, height]` | `{file, width, height, frameW, frameH, source, frames}`. Each nonempty frame has `{frame, col, row, box, img}`. This is a splitter, not an originality verdict. Throws on PNG read errors. |
| `checkImage(index, img, opts = {})` | Loaded index; cropped `{w, h, px}` RGBA image with binary alpha; optional threshold overrides | Per-frame result described below. Pixel comparison only; no file provenance. |
| `standInPolicy(file)` | Candidate path | Policy record described below, or null when no policy rejection applies. Does not read pixels or require the candidate to exist. |
| `standInDeclarations()` | No arguments | Cached `{names, globs, lines, error}` parsed from STATUS: `names` is a Map of lowercase keys to `{token, line}`, `globs` contains `{re, token, line}`, `lines` counts bullet lines, and `error` is null or an explanatory string. Treat these collections as read-only. |

A sheet result has `grade` (`PASS`, `WARN`, `FAIL`, or `SKIP`), `summary`, and `frames`. Scored results also include `frameW`, `frameH`, and `frameSource`. No index produces SKIP through the in-process sheet API. A provenance rejection returns FAIL, an explanatory summary, empty `frames`, and `policy`; it does not invent a visual distance.

`policy` identifies `kind` (`reserved-name`, `status`, or `policy-error`), the path relative to `game/img`, and `why`. A STATUS match also provides its declaration `token` and source `line`. `policy-error` fails closed when STATUS cannot be read or its Stand-ins heading cannot be found; it is not a finding of copied pixels.

Per-frame results expose `grade`, `why`, `distance`, `verified` (whether source game files were available for pixel verification), `info`, `complexity`, opaque-pixel count `px`, `w`, `h`, detected upscale `native` or null, `texture`, and up to five `matches`. Each match identifies `source`, `shape`, `frame`, dimensions, fingerprint `fp`, combined `distance`, and pixel comparison `px` or null. Sheet checks attach the sheet frame number and content `box: [x, y, width, height]`. Consumers must handle empty frames and absent matches.

Frame selection precedence is explicit `frame`, a usable adjacent JSON sidecar's `frameWidth`/`frameHeight`, a `$`/`!$` single-character sheet's 3-by-4 grid, then the whole image. Transparent borders are cropped and empty frames skipped. Identical frame pixels are scored once per sheet. Supply an explicit frame size for sheet layouts that the sidecar does not describe.

### Index, fixtures, and calibration

| Export | Contract |
|---|---|
| `DEFAULT_INDEX` | Absolute path to `reference/u7_originality_index.json`. |
| `T` | Default scoring constants; principal thresholds are documented under Checks. Callers should pass `opts.thresholds` rather than mutate this shared object. |
| `buildIndex(outFile, opts = {})` | Reads installed source libraries and writes the local index. Returns `{file, decoded, empty, dups, failed, unique, flatTiles, secs, bytes, sources}`. `quiet` suppresses progress output. |
| `loadIndex(file)` | Returns a loaded index or null if absent. Throws on invalid JSON or incompatible index version. Treat the returned object as opaque input to `checkImage`; its arrays/caches are internal. |
| `getIndex(file)` | Loads and caches an index for in-process use; defaults to `DEFAULT_INDEX`. Returns the loaded index or null. Restart a long-running tool after rebuilding its index. |
| `writeCopyFixture(file, shape = 181, frameNo = 0, scale = 3)` | Writes a nearest-neighbor scaled Black Gate SHAPES frame for a negative test. Returns true on write, false without the required source/frame. Output contains reference pixels and must remain local. |
| `selftest(opts)` | Runs named checks and prints a computed result; returns `{ok, records}` (early failures may return only `ok`). Options include `index`, `sample`, `seed`, `extended`, `dump`, `progress`, `thresholds`, `tileSample`, and `maxFpRate`. Default sprite sample is 300, seed 20260919, tile sample 100, maximum false-FAIL rate 1 percent. |

Exports under `_internal` and unlisted helpers are implementation details and may change without notice.

### CLI

Run from the project root:

```text
node tools/originality_check.js --build-index
node tools/originality_check.js art/masters/oak.png
node tools/originality_check.js art/masters/oak.png --frame 96x96 --json
node tools/originality_check.js art/masters/oak.png --report reference/originality_oak.png
node tools/originality_check.js --selftest --sample 300 --seed 20260919
```

`--index <file>` selects a different local index. Multiple PNG arguments are accepted. `--json` emits structured file results; text output includes per-frame grades, `FILE` grades, and a computed aggregate result. `--report <out.png>` makes a comparison image with the candidate and closest decoded reference frames, capped at the 24 closest candidate rows. Open every report image produced before describing or delivering it, as required by AGENTS rule 5.

An invocation containing only provenance-rejected files works without an index. Provenance-only results have no perceptual rows, so `--report` writes nothing for that invocation; an existing report file is not refreshed. Mixed invocations require an index for candidates that reach visual scoring.

Self-test options include `--tile-sample N` (bound the ground-tile sample independently of `--sample`), `--extended` (more stock comparison sheets), `--dump <records.json>`, and `--progress`. `--fail-threshold X` and `--warn-threshold X` override sprite thresholds for diagnostics and deliberate failure demonstrations. They do not disable provenance rejection. Setting `UF_TEST_PROVOKE=originality.policy` deliberately fails `policy.u7_named_fails` and returns after the three policy checks without running perceptual calibration; remove that environment setting after the negative test. `--help` / `-h` displays usage.

Exit status is 0 when there is no FAIL (WARN still exits 0), 1 for a failing candidate or self-test expectation, and 2 for CLI usage errors or a missing required index. Consumers must inspect grades; a zero exit is not automatic acceptance of WARN. Unexpected filesystem/index errors can also terminate execution unsuccessfully.

The source search accepts `UF_U7_BG` and `UF_U7_SI`, each naming the game's `STATIC` directory. It also checks project and common GOG installation paths. Libraries are `SHAPES.VGA`, `FACES.VGA`, `GUMPS.VGA`, and `SPRITES.VGA` for both games, plus Serpent Isle's `PAPERDOL.VGA`; fonts, menus, and end-game screens are outside the indexed set. The original game directories are read-only inputs.

## 3. Events

None. This tool registers no UF events or RMMZ hooks. Output is returned synchronously or written to the CLI streams and requested local artifacts.

## 4. Save data

None. No RMMZ save keys, game database changes, or runtime state are involved. The index, calibration records, copy fixtures, and reports are development artifacts. Keep reference-derived outputs under local `reference/` or a temporary directory; never commit them or load them from `game/`. The index carries a version and source metadata and must be rebuilt when incompatible with the checker.

## 5. Checks

There is no `UF.Test` suite: this offline tool uses its own conditional PASS/FAIL checks and computed self-test result.

### Provenance

Provenance applies only to PNG paths inside this project's `game/img`. It runs before visual scoring, including before reading the candidate pixels or requiring an index. Matching is case-insensitive. The following are FAIL:

- A basename beginning `U7_`, optionally preceded by RMMZ `!` and `$` markers, or ending `.u7bak` before `.png`.
- A name or relative image path declared in backticks in the first pipe-delimited field of a bullet line under `docs/STATUS.md`'s `## Stand-ins` heading. Later fields describe sources and consumers and are not parsed as declarations. Parsing stops at the next level-two heading. Tokens can name `.png` or `.json` sidecars, omit extensions, use `*` wildcards, or name a directory with a trailing slash. These declarations cover older stand-ins without the reserved prefix.

Tokens with whitespace are skipped. Matching tests both the basename and path relative to `game/img`: a basename-only token can therefore affect more than one image folder. `*` matches arbitrary characters, including slashes; a trailing directory slash is expanded to `*`. This is a small declaration grammar, not a general glob parser. Keep declarations precise and review broad wildcard matches when adding original assets. An unreadable STATUS file or missing Stand-ins heading produces `policy-error` for in-scope PNGs not already rejected by reserved names; malformed or omitted individual tokens cannot establish provenance.

An original outside `game/img` is not rejected by this naming policy, even when its descriptive filename includes `u7`. A non-declared original inside `game/img`, such as `system/Window.png`, proceeds to visual scoring. Names alone do not grant a PASS. Stale sidecar `standInSource` text is not a policy input: `$Adam.png` and `$Eve.png` were replaced with stock pixels while their sidecars retained old source text. STATUS declarations must be maintained when named files are replaced; a stale declaration still rejects that pathname.

Named provenance regression checks:

| Check | What it proves |
|---|---|
| `policy.u7_named_fails` | Selected existing reserved-name files receive `reserved-name` rejection. Can be deliberately failed with `UF_TEST_PROVOKE=originality.policy`. |
| `policy.status_listed_fails` | Selected existing unprefixed declarations receive `status` rejection. |
| `policy.original_names_pass` | Selected existing original controls have no policy rejection. This name describes policy behavior only; it does not assert a perceptual PASS. |

These checks test provenance separately from calibration; a naming rejection is not evidence that a pixel detector recognizes the copy. Separate API/CLI checks should cover index-free rejection and policy-only reporting. Original controls still need perceptual scoring.

### Perceptual calibration

Sprite scoring first searches indexed fingerprints (lightness steps, silhouette, aspect ratio, and weak palette evidence), refines a shortlist at reference sizes, then pixel-verifies the nearest candidates using mask overlap and neighboring-pixel structure. It checks mirrored/rescaled variants and detects integer pixel-art enlargement. Combined distance is half fingerprint and half pixel distance when sources are available. Default sprite thresholds are FAIL below 0.20 and WARN below 0.28. Low-information images and simple shapes are protected against unsupported copy accusations; they can pass as too small/flat to judge or warn as generic shapes.

Texture scoring compares informative 8-by-8 color-label patterns, including recolors, symmetries, grid shifts and small edits. Texture distance is one minus the matched share of informative blocks. A distance at or below 0.5 fails; below 0.9 warns. Texture evidence can override a sprite PASS.

Named calibration checks:

| Check | What it proves for the selected sample |
|---|---|
| `calibration.a_u7_frames_fail` | Unaltered sampled U7 sprites and ground tiles receive FAIL. |
| `calibration.b_<alteration>_fail` | Recolor, mirror, shift, clipped shift, 2x scaling and 2x scaling with 10 percent edits receive FAIL. Texture variants cover sheets, recoloring, mirror, shift, 2x scaling and edits. |
| `calibration.b_<alteration>_extra_fail` | Additional transpose, 3x scale and combined-alteration probes receive FAIL. These are enforced expectations even though labeled extra. |
| `calibration.c_originals_not_fail` | The observed false-FAIL rate on stock RPG Maker frames, flat 16x16 masters and synthetic shapes is within `maxFpRate` (default 1 percent). WARN is reported separately. |
| `calibration.c_inputs_present` | Stock frames and flat 16x16 project masters exist for the control set. |

Calibration prints distance distributions, shortlist misses, and timings measured during that run. A successful sampled run supports only the sampled cases; it does not establish exhaustive recognition of all possible edits. Changed thresholds should be tested against both copied and original controls, and deliberately bad thresholds can demonstrate that checks fail.

## 6. Status

Contract added 2026-09-19 for the Codex originality-checker hardening task. Provenance API/CLI wiring, the three policy self-test checks, and `--tile-sample` are implemented in the inspected source. Full task testing is not established by this source inspection. Execution results belong in `docs/STATUS.md`; no new calibration pass, screenshot, or RMMZ Playtest result is asserted by this documentation alone.

Known limitations:

- A policy result depends on the filename and current STATUS declaration, not decoded pixels. Renaming an undeclared copy removes this evidence and leaves perceptual scoring to detect it. Declarations are cached per process, so restart after editing STATUS.
- An unavailable STATUS file or heading blocks in-scope PNGs with `policy-error`; omitted or malformed individual declarations can still leave copies undeclared. Broad wildcard declarations may reject original replacements until STATUS is corrected. Missing source game files disable pixel verification, leaving fingerprint evidence; calibration requires the source files.
- Low-information sprites, generic geometry, unindexed artwork, heavily transformed images and incorrect sheet framing can evade or confuse perceptual comparison. A PASS with a low-information explanation is limited evidence. Empty sheets have no scored content and are not an art-delivery approval.
- The tool does not verify licensing, artistic quality, correct scale, in-game appearance, current catalog usage, or removal of stand-ins from git history. A5 audit findings remain separate work.
- This offline change cannot establish the project's RMMZ F5/F8 and user approval gates. No slice or art asset is approved by running it.
