# Style training: a style model from U7 art, then original art at higher definition

Written 2026-09-19 by Claude Code, for the user and Gemini.

The user's decisions behind this (docs/VISION.md V2, V9; AGENTS.md rule 8, all revised 2026-09-19):
- Ultima VII (U7) art may be used as style reference **and as training data** for the art generators. The user accepted the risk.
- **Hard rule: everything that ships in the game is our own original work.** It is never a copy, trace, recolour, crop or near-copy of a U7 image. `tools/originality_check.js` checks every asset against the U7 shape library before it goes into `game/`.
- The look is U7's 2.5D, drawn at **higher definition than U7** (V2: "We can even be higher definition than U7").

## 1. The hard rule, first

1. Every generated image goes through `tools/originality_check.js` after it is reduced to its master size (section 5). **Anything graded FAIL or WARN is redrawn. It is never shipped.**
2. Redrawing means a new image: a new seed, a different pose or design, a different silhouette. You may not recolour, nudge pixels, crop or flip the flagged image until it passes. A recoloured near-copy is still a near-copy.
3. Never lower the check's thresholds (`--fail-threshold`, `--warn-threshold`) to get a pass. Those options exist only to show that the check can fail.
4. U7 images are never used as init images, img2img sources, ControlNet or pose guides, inpainting bases or trace layers. The model learns the look from the training set. Every generation starts from noise and a text prompt, or from **our own** approved art.
5. Prompts never name the old game, its places or its characters (AGENTS.md → Reference vs. shipped content). The trigger phrase `uf25d style` is the only style word.
6. The dataset, the trained U7-style model and the check's reports all contain U7-derived material. They stay **local**: nothing under `reference/` is committed, and none of it is loaded by the game.

## 2. The dataset

`tools/export_u7_style_dataset.js` decodes a **curated** set of U7 shapes and writes a captioned training set.

| | |
|---|---|
| Where | `reference/u7_style_dataset/` (local only; `.gitignore` is a whitelist, so `reference/` is untracked; `git check-ignore` confirms it, and `--verify` checks it) |
| What | 392 pairs: `<category>_<NNNN>.png` + `<category>_<NNNN>.txt`, plus `README.txt` and `manifest.json` (file → source shape and frame, for checks only; do not upload it) |
| Image | 512×512, the subject scaled 4× by nearest neighbour, centred on flat `#808080` |
| Caption | `uf25d style, <subject>, <facing>, <pose>, 2.5D oblique top-down pixel art, upper-left light, earthy palette, flat grey background` |
| Source | `SHAPES.VGA` + `PALETTES.FLX` (daylight palette) from the GOG install's `STATIC` folder (read only), decoded the same way as `tools/generate_all_u7_assets.js` |

Counts (export of 2026-09-19): person 122, animal 46, monster 33, tree 22, plant 24, rock 17, furniture 12, bed 7, table 8, container 13, building 21, door 9, fire 7, cart 7, tool 9, weapon 10, armour 8, food 13, goods 4. That is 392 images from 178 shapes.

How the list was chosen: every shape was decoded, put on a labelled contact sheet and looked at. Only clear, complete subjects were kept. Left out: iconic named characters, the old game's own races, beholder-like creatures, partial shapes (tree tops, cart parts that only work assembled, bridge and roof fragments), and anything unreadable at 1×. Each caption was written from looking at the image, and every caption is generic ("a woman in a white blouse and a long orange skirt").
- **People** come in all four facings. South and north are the stored frames. East and west are those frames **transposed**, which keeps the up-left lean (GUIDE_25D §2; a mirror would be wrong). Standing and walking frames are included, plus sitting, kneeling, lying, ready, striking and raised-arms poses.
- **Animals and monsters** have two to four facings.
- **Objects** have one frame each. Some shapes appear more than once, as variants (bed covers, wall materials, lit and unlit fires).

Commands (Node at `C:\Program Files\nodejs\node.exe`):
```text
node tools/export_u7_style_dataset.js            # (re)build; idempotent, removes files no longer on the list
node tools/export_u7_style_dataset.js --list     # the curated shape list by category
node tools/export_u7_style_dataset.js --verify   # re-read the folder: sizes, background, captions, banned words, git-ignored
node tools/export_u7_style_dataset.js --contact 48   # also a 48-image contact sheet in game/test_output/
options: --scale n (default 4)  --size n (default 512)  --bg #rrggbb (default #808080)  --out dir  --static dir
```
For a 1024-px trainer, use `--size 1024 --scale 8`. That keeps the same composition and a uniform pixel grid (one U7 pixel = 8×8). Don't mix scales inside one dataset: the model learns the pixel size.

To upload, zip only the pairs:
```text
powershell: Compress-Archive -Path reference\u7_style_dataset\*_*.png, reference\u7_style_dataset\*_*.txt -DestinationPath reference\u7_style_dataset.zip
```
(`README.txt` and `manifest.json` do not match `*_*`.)

## 3. Train a style LoRA: the starting recipe

A LoRA is a small add-on to a base image model that teaches it one style under a trigger phrase. We train one on the dataset with the trigger `uf25d style`.

**Where to train is the user's decision (see "Decisions needed").** Local training keeps the U7 images on this machine, which matches "reference/ is local only". Hosted trainers need the zip uploaded to a third party. If the user allows that, use a private dataset and a private model, and delete both from the service after training.

### Settings that matter for this project, on any trainer
- **Horizontal flip augmentation: OFF.** A mirror flips the lean to up-right, which is always wrong for this projection (GUIDE_25D §2, AUDIT A1-2). Many trainers offer flip as an option, and some turn it on by default. Check.
- **Random crop: OFF. Bucketing: not needed** (all images are square).
- **Use our captions.** Turn auto-captioning off. The captions name the subject, facing, pose and background, so the LoRA learns the look and not "grey backgrounds" or "a man in red".
- **Under-train rather than over-train.** An over-trained LoRA reproduces the training images, which makes near-copies that the originality check will FAIL. Save checkpoints and pick the earliest one that has the look (section 3.4).
- **Rank 16** is enough for a style. Replicate's trainer README suggests going as low as 8 for styles.

### 3.1 Option A (default): SDXL LoRA, local, with kohya_ss
The base model is **SDXL 1.0 base**. Its licence (CreativeML Open RAIL++-M) allows commercial use of outputs. It trains on a GPU with 12 GB or more using the memory settings below. If memory runs out, use batch 1 and 20 epochs.

| Setting | Value | Why |
|---|---|---|
| Dataset export | `--size 1024 --scale 8` | SDXL's native resolution; uniform 8× pixel grid |
| Folder layout | `train/1_uf25d/` holding the png + txt pairs | kohya reads the repeat count from the folder name |
| Resolution | 1024,1024, bucketing off | square images |
| Network | LoRA, dim 16, alpha 8 | enough for a style; low rank memorises less |
| Learning rate | UNet 1e-4, text encoder 0 (off) | stable for a style; the captions stay readable |
| Optimizer / schedule | AdamW8bit, cosine, 5 % warm-up | the common, well-behaved default |
| Batch / epochs | batch 2, 10 epochs = 1,960 steps | about 5 passes' worth at batch 2; enough for 392 varied images |
| Caption options | extension `.txt`, shuffle off (or shuffle with keep_tokens 1) | the trigger stays first |
| Augmentations | flip_aug off, color_aug off, random_crop off | see above |
| Precision / memory | bf16, gradient checkpointing, cache latents, SDPA | fits 12 GB |
| Save | every epoch, with sample prompts every epoch | pick the checkpoint by looking |

### 3.2 Option B: FLUX.1 [dev] LoRA, hosted (Replicate `ostris/flux-dev-lora-trainer`, or fal.ai `flux-lora-fast-training`)
Flux follows prompts better (facing, pose, "flat magenta background"). It is also the easy hosted path. The FLUX.1 [dev] model licence is non-commercial, with separate terms for outputs. **Read it before shipping anything made with it.**

| Setting | Value | Why |
|---|---|---|
| Dataset | the 512 export, zipped as above | Flux trains well at 512 |
| Trigger word | `uf25d style` | already first in every caption |
| Auto-caption | off | we supply captions (same base name `.txt`) |
| Steps | 2,000 (checkpoints at 1,000 / 1,500 / 2,000 if offered) | the README recommends 1,000–3,000; a varied 392-image set needs the middle of that range |
| Learning rate | 1e-4 (the trainer's default may be higher; lower is safer for a big set) | slower learning memorises less |
| LoRA rank | 16 | style, not likeness |
| Batch size | 1 | default |
| Resolution | 512 | matches the export |
| fal.ai only | `create_masks: false`; leave `is_style` off so our captions are used (fal's docs say supplied captions override the trigger word; check the form) | masks are for subjects, not styles |

Field names and defaults were read from the services' pages on 2026-09-19 and can change. Check the form before you pay. The local equivalent is ostris ai-toolkit with the same numbers, on a 24 GB GPU.

### 3.3 Option C: Civitai's on-site trainer (SDXL or Flux)
Use the same numbers: set epochs × repeats to land near 2,000 steps, turn flip augmentation off, and use our captions. Keep the model private. Check Civitai's terms on training data first: they may not allow this dataset.

### 3.4 Pick the checkpoint
1. Generate the same 8 test prompts with each checkpoint, at the same seeds. Four prompts are subjects in the dataset (a woman in a grey dress facing south, an oak tree, a wooden table, a wolf facing east). Four are subjects that are **not** in it (a windmill, a goat, a potter at a wheel, a rowboat).
2. Keep the earliest checkpoint that gives the lean, the upper-left light, the palette feel and the dithered texture on the **unseen** subjects.
3. Reduce the in-dataset test images (section 5) and run the originality check on them. A FAIL on a test image means the LoRA has started to memorise. Take an earlier checkpoint, or lower the LoRA strength.
4. Show the test sheet to the user before any production use.

## 4. Generate at higher definition than U7

**The working scale.** A standing U7 person is 25 px tall (the dataset's manifest: a standing man is 27×25 px). **Ours are 32–40 px tall at 1:1**: 1.3–1.6× the height, and 1.6–2.6× the pixels. That leaves room for faces, cloth folds and tool detail. Everything uses one pixel density (V2). The scale lineup the user approves sets the final sizes (V44; the numbers in `docs/handoffs/GENERATOR_PROMPTS.md` are the working scale).

**Generate large, reduce later.** The model's pixel grid is never trusted (ART_STANDARD §7). Draw big, then let the tool make the pixels:
- A **1024×1024 canvas** with **one subject**, centred. The dataset is 4×, so the LoRA learns a 4-px pixel block. That is the delivery convention of GENERATOR_PROMPTS and `tools/make_25d.js`: every final pixel is a 4×4 block, and one 48-px grid square is 192×192. On that grid a person is 128–160 px tall on the canvas (32–40 final px) and an oak about 280 px. If the model draws its blocks at another size, or the subject at another height, `make_25d.js` fixes that with `--block auto` and `--height` (below). An SDXL LoRA trained on the 8× export draws 8-px blocks: use `--block 8` or `--block auto`.
- A **flat magenta `#FF00FF` background** (ART_STANDARD U5). The dataset's background was grey and captioned, so asking for magenta works. If the model keeps drawing grey, re-export the dataset with `--bg #FF00FF` and retrain.
- Prompt template (no other style words, no game names):
  ```text
  uf25d style, <subject with materials and colours>, <facing south, toward the viewer | facing north, away from the viewer | facing east | facing west>, <pose>, 2.5D oblique top-down pixel art, upper-left light, earthy palette, highly detailed, one subject, centred, flat magenta background
  ```
  SDXL negative prompt: `isometric, diamond base, side view, straight front view, mirrored, text, watermark, border, ground shadow, blur, several subjects, grey background`.
- LoRA strength 0.8 (range 0.7–0.95). Flux: guidance 3–3.5, about 28 steps. SDXL: CFG 6–7, 30 steps, DPM++ 2M Karras.
- **Facings.** Get the south frame approved first. Then generate north, east and west. East and west are not mirror images, and the dataset taught the model transposed east and west. Reject any image whose lean goes up-right.
- **Frames of one creature** (walk, work, attack) should start from our own approved stand frame (img2img at low strength, the same seed and prompt, with the pose changed). That is allowed because the source is our art. A U7 frame is never the source.

**Reduce with `tools/make_25d.js`.** Save the raw image to `art/raw/<id>.png`. The tool keys out the magenta, takes one pixel per block (majority vote, never blur), snaps every pixel to `art/palette/uf.hex`, places the ground contact in the frame and writes `art/masters/<id>.png` plus its sidecar.
- **LoRA output already carries the lean: use `--lean none`** (the default).
- If an image was drawn flat (a straight top-down or front view with no lean), use `--lean full` and the tool applies the lean. `--lean box` is for blocky objects.
- If the model's pixel blocks are not exactly 4 px, add `--block auto`. If the subject is not at its scale-table height, add `--height <px>` (for example `--height 36` for a person). The tool warns when it rescales.
- Add `--preview game/test_output/make_25d/<id>.png`: it shows the master at 1× and 4× on a meadow grid next to a 32-px person ruler. Open it.

(This paragraph matches `node tools/make_25d.js --help` as read on 2026-09-19. Another run was still working on that tool, so recheck the help text if a flag is refused.)

## 5. Check every asset, in this order
```text
node tools/make_25d.js art/raw/<id>.png --lean none [--block auto] [--height <px>] --preview game/test_output/make_25d/<id>.png
                                                   -> art/masters/<id>.png + <id>.json
node tools/art_check.js --native --sidecar art/masters/<id>.png                       palette, alpha, frame size, sidecar
node tools/originality_check.js art/masters/<id>.png --report game/test_output/originality_<id>.png
```
- `--native` (the 48-native mode of art_check) was still being added to `tools/art_check.js` by another run on 2026-09-19 (STATUS → In progress). If the flag is refused, run `--sidecar` alone and ignore the old 3× grid check (ART_STANDARD §6).
- The originality check compares each frame (using the sidecar's frame size) against every frame of both games' shape libraries. It grades each frame PASS, WARN or FAIL. **Only PASS may go forward.** On WARN or FAIL, redraw the image as in section 1.
- The report image shows the candidate next to its closest U7 frames. It contains U7 pixels, so keep it in `game/test_output/` or `reference/` (both are local).
- Note in the delivery which check results you saw and which report you opened. Claude Code checks each delivery against its brief and these results (AGENTS.md → Reviews and audits).
- The check does catch the dataset itself. On 2026-09-19, four dataset images exported on magenta (`--bg #FF00FF`) were run through it (a man, a fruit tree, a dragon, a brick wall), and all four FAILed at distance 0.001. Each was matched to its source frame (for the wall, to an identical frame of a duplicate wall shape). The grey-background export is not a valid input: the check treats only magenta as background.

## 6. Approval steps
1. The dataset (done 2026-09-19) and the training location: the user decides (Decisions needed).
2. Train the LoRA and pick the checkpoint (section 3.4). The user sees the test sheet.
3. **The four style anchors first, one at a time** (GENERATOR_PROMPTS prompt 0): human_male (south stand frame first), oak, wall_wood, meadow. Each goes through make_25d → art_check → originality_check (PASS), then Claude Code checks it against its brief, **then the user approves it** in `art/APPROVALS.md`. Nothing else starts before all four are approved (AGENTS.md rule 6). The anchors Gemini delivered on 2026-09-19 were drawn without this LoRA. The user decides whether they stand or are redrawn with it.
4. **Then the groups** (GENERATOR_PROMPTS 1–13): the first asset of each group alone, then batches of three to five. Every asset passes the section 5 checks, and the user approves each batch.

## 7. Later: a second style model from our own approved art only
The U7-trained LoRA is scaffolding. The long-term house style comes from a **second LoRA trained only on our approved originals**, with no U7 material in its training data.
- **When:** once `art/APPROVALS.md` lists enough approved assets across the categories for a balanced set. Roughly 100 or more are needed: people in four facings, animals, trees, plants, rocks, furniture, buildings, items.
- **Data:** only approved masters from `art/masters/`, scaled up by nearest neighbour onto a flat canvas and captioned the same way, with a **new trigger** (for example `ufhouse style`) so the two models never mix. This needs an export mode that reads the approvals list instead of U7 shapes (Backlog; not built).
- **Then:** generate with the house LoRA alone, and retire the U7-trained LoRA (delete it locally and from any service). Keep the originality check anyway, because base models may have seen U7 images on the web.
- The same training settings apply (flip off, rank 16, under-train, pick the checkpoint by looking).

## 8. Never
- Commit `reference/` (dataset, index, reports), upload any of it without the user's OK (section 3), or copy any of it into `game/`.
- Ship an image graded WARN or FAIL, or edit a flagged image until it passes.
- Use a U7 image as the start of a generation (img2img, ControlNet, trace, inpaint).
- Put the old game's names in prompts, captions, file names or player-facing text.
- Turn on horizontal flip in training, or mirror a sprite to make a facing.

## 9. Decisions needed (user)
- **Where to train:** locally (kohya_ss on SDXL; the U7 images never leave this machine, which matches "reference/ is local only") or on a hosted trainer (Replicate, fal.ai or Civitai; the dataset is uploaded to a third party, which needs your explicit OK). Claude Code recommends local unless there is no suitable GPU.
- **Base model:** SDXL (open licence for outputs) or FLUX.1 [dev] (better prompt following; read its licence on outputs before shipping).
- **Unclothed figures:** the dataset has an unclothed man and woman (8 images; the Tier 0 settlers need the look). Some hosted trainers may flag them. They can be left out of an upload by deleting `person_0037`–`person_0044` from the zip.
- **The anchors already delivered** (2026-09-19, drawn without the LoRA): keep them, or redraw them with the LoRA.
