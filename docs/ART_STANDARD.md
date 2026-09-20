# ART STANDARD: 16-Bit Pixel Art in the Serious Chibi Style (FF5 / Tactics Ogre)

**Set 2026-09-19 by user decision (VISION V115, V116):** earlier style rules are scratched. The look is **16-bit pixel art in a serious chibi style** (reminiscent of classic 16-bit tactical RPGs like Tactics Ogre and mature FF5/FF6 job sprites: grounded proportions, focused expressions, functional gear, no cute/cartoonish tropes) generated exclusively with **Google Nano Banana Pro** (`gemini-3-pro-image` / `generate_image`). Humanoids and standard creatures are **generally 1 tile in height (48 px in RMMZ)**; large creatures can be **2 tiles in height (96 px in RMMZ)**. Sprites are organized **12 sprites at a time on a 3×4 grid (3 Down, 3 Left, 3 Right, 3 Up)**, with a dedicated 12-sprite sheet for each action (Walk, Melee, Ranged, Magic, Haul, Work, Downed).

## 1. The view and the look
| # | Rule |
|---|---|
| F1 | **Flat 3/4 top-down RPG view:** ground seen from above; people, animals, trees and objects stand upright in 2D space. Nothing leans, tilts or slants; no isometric diamonds; no perspective distortion. |
| F2 | **Serious Chibi Design Language (V116):** mature, grounded 16-bit proportions (~3.0 to 3.2 heads tall, fitting 1 tile: 40–44 px tall in RMMZ). Focused, narrow gaze with determined brow line and dark upper lash shadow (no giant glassy anime/manga orbs, no cute bubble expressions, no soft blob limbs). Battle-ready stance, defined shoulders, articulated boots, functional medieval gear (buckles, straps, scabbards), selective dark contour outlines, lively cel shading in 3–4 flat tones per material, light from upper left. No blur, no gradients, no anti-aliasing against the background. |
| F3 | **Scale against the grid square (V115):** humanoids and standard creatures are generally 1 tile in height (38–48 px tall inside the 48×48 frame). Large creatures, bosses, and mature trees can be 2 tiles in height (80–96 px inside 96×96 frames). Micro items, small flora, and loose resources are sub-tile (12–28 px). |
| F4 | **Palette:** the project palette `art/palette/uf.hex` (256 colours); the cleaning tool snaps every colour to it. Rich, warm, lively 16-bit colour; no neon, no pure black except interior voids. Every pixel fully opaque or fully transparent. |
| F5 | **Standardized 4 Directions (V110, V115):** 4 facings (Down, Left, Right, Up; RMMZ rows 0=Down, 1=Left, 2=Right, 3=Up) for **every action**: Walk, Melee, Ranged, Magic, Haul, Work, Downed. Movement in the engine remains 8 directions, but animation is standardized on 4 facings to eliminate bottlenecks. |
| F6 | **12 Sprites at a Time (3x4 Grid; V114, V115):** all character generations produce exactly 12 sprites arranged as 3 columns × 4 rows (3 Down, 3 Left, 3 Right, 3 Up) on a 144×192 px sheet ($filename.png). |
| F7 | **Separate 12-Sprite Sheet per Action (V115):** each action is delivered as its own dedicated 12-sprite sheet: Walk (12), Melee (12), Ranged (12), Magic (12), Haul (12), Work (12), Downed (12). |
| F8 | **First Sheet as Reference for Nano Banana Pro (V114):** the first sheet generated for a character (the standard 12-sprite Walk sheet) serves as the persistent visual conditioning reference (`ImagePaths`) passed to Google Nano Banana Pro for all subsequent action sheets, locking 100% anatomical scale, costume, and palette. |
| F9 | **All generation tasks utilize Google Nano Banana Pro** (AGENTS.md Rule 11, VISION V69, V70, V79, V109): every visual asset across all categories MUST originate from Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`). Nano Banana Pro is Google's Gemini 3 Pro Image model, the premium choice for complex visual tasks utilizing advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity text and pixel details. No other generator model is allowed, and no agent is permitted to type in sprites pixel-by-pixel in code. |
| F10 | **All animation must happen through the sprite; no after-effect animations** (V58, V60, V108): all animation must come from distinct sprite frames authored on the sheets. Zero code-driven affine transforms, procedural squash/stretch, sine-wave swaying, or shader distortions. |
| F11 | **Zero Flying Projectiles on Sprite Sheets; Initiation-Only Magic (V111):** Ranged attack frames depict string draw, tension, and pluck recoil only (zero flying arrows; ballistic missiles are rendered by the engine projectile system). Magic frames depict incantation/chant posture with soft palm or staff aura only (zero flying projectile beams, blasts, or leaves). |
| F12 | **Dedicated Hauling / Carrying Pose (V113, AR-600 col 7):** dedicated 4-facing 12-sprite walk cycle holding a heavy load (burlap sack, crate, timber, or stone) in both arms against the torso in front. |
| F13 | **Theme (V65):** Arthurian fantasy with science-fiction touches. Named lore needs the user's approval (AGENTS rule 7). |




## 2. Sizes against the 48 px grid square
| Thing | Final size | Frame |
|---|---|---|
| Grown human, elf, orc, automaton | 44–48 px tall | 48 × 48 |
| Dwarf, goblin, gnome | 34–40 px tall | 48 × 48 |
| Child | 24–36 px | 48 × 48 |
| Hare, rat, songbird | 12–16 px | 48 × 48 |
| Fowl, bat, hawk | 16–24 px | 48 × 48 |
| Fox, wildcat, jackal | 26–32 px long | 48 × 48 |
| Wolf, boar, sheep | 36–44 px long, 28–32 tall | 48 × 48 |
| Deer | 44 px long, 48 tall with antlers | 48 × 48 |
| Wild horse, aurochs | 72 px long, 56 tall | 96 × 96 |
| Giant spider, sand stalker | 64 px wide | 96 × 96 |
| Restless dead | 46 px tall | 48 × 48 |
| Ice wraith, bog horror | 64–72 px tall | 96 × 96 |
| Troll | 88 px tall | 96 × 96 |
| Oak, fruit tree | 80–96 px wide and tall | 96 × 96 |
| Pine, birch, palm | 56–72 wide, 104–120 tall | 96 × 144 |
| Stump, bush | 32 × 24, 36 × 28 | 48 × 48 |
| Tall grass, reeds, flowers | 12–36 px | 48 × 48 |
| Boulder, ore outcrop | 48 × 40 | 48 × 48 |
| Loose stones, items on the ground | 12–28 px | 48 × 48 |
| Campfire | 40 wide, flame 32 tall | 48 × 48 |
| Straw bed, work stone | 44–48 × 24–28 | 48 × 48 |
| Furnace, well | 48–56 wide, 56–64 tall | 96 × 96 |
| Wall piece | top on its square, front face one square tall below | 48 × 96 |

Every sprite stands on the bottom-centre of its frame. The anchor in the sidecar is that point.

## 3. Placeholders
- **Stock RPG Maker MZ art is the placeholder set** (VISION V9, 2026-09-19): tiles from `Outside_*`, characters from `People1-4`, `Actor1-3`, `Nature`, `Monster`, `Evil` (cut into single-character sheets by a tool so the engine can use them), icons from `IconSet`. Its people fill a 48 px square, like §2. `docs/ASSET_INVENTORY.md` lists every one with its request ID. The `U7_` files stay on disk, unused.
- New art is made to this standard only.
- Code-drawn placeholders (`UF_Gen*`) are fine until art arrives.

## 4. Sheets and sidecars
- **Characters and creatures (V110, V114, V115):** organized as dedicated 12-sprite sheets on a 3×4 grid (3 animation columns × 4 rows: Down, Left, Right, Up) matching native RMMZ character sheets (`$filename.png`, 144×192 px total, each frame 48×48 px).
- **Dedicated action sheets (V115):** each action is delivered as its own dedicated 12-sprite sheet: `<id>_walk.png`, `<id>_melee.png`, `<id>_ranged.png`, `<id>_magic.png`, `<id>_haul.png`, `<id>_work.png`, `<id>_downed.png`.
- **First sheet as reference (V114):** the first sheet generated for a demographic (the standard 12-sprite Walk sheet) serves as the persistent master visual reference image (`ImagePaths`) passed to Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`) for all subsequent action sheets, locking anatomical scale, costume, and palette across every action.
- **Objects:** one frame per state, or a loop named in the sidecar. States that the catalog treats as separate objects (standing/stump, full/picked, unlit/lit, intact/ruined) are separate files.
- **Every sheet has a JSON sidecar** of the same name: `frameWidth`, `frameHeight`, `anchor` (bottom-centre of the footprint), `footprint`, `facings`, `animations`, `frameMs`.

## 5. Making real art
| Step | Output | Who |
|---|---|---|
| 1. Prompt | Prompt template specifying FF5 16-bit chibi style (2.5–2.8 heads tall, expressive eyes, scissor-step boots, 1 tile high, 3x4 grid on magenta background) | Gemini |
| 2. Master Walk Sheet | Generate the 12-sprite Walk sheet (3 Down, 3 Left, 3 Right, 3 Up) in **Google Nano Banana Pro** (`gemini-3-pro-image` / `generate_image`) | Gemini |
| 3. Action Sheets with Reference | Generate subsequent 12-sprite action sheets (Melee, Ranged, Magic, Haul, Work, Downed) in **Google Nano Banana Pro** (`gemini-3-pro-image`) passing the Walk sheet via `ImagePaths` | Gemini |
| 4. Clean & Snap | Process raw generation, remove magenta background, snap to `art/palette/uf.hex`, align frames to 48×48 px on baseline y=47 | cleaning tool |
| 5. Check | `tools/art_check.js --native` and `tools/originality_check.js` pass | tools |
| 6. Review | Review 12-sprite grid and live in-game animation loop across all 4 facings | Gemini & user |
| 7. Approve | User approval of demographic suite | **the user only** |
| 8. Export | Export to `game/img/characters/` with sidecars | Gemini / Claude Code |

## 6. Asset checklist
Automated: palette colours only; alpha 0 or 255; frame size 48×48 px (or 96×96 for large 2-tile creatures), anchor bottom-centre, 12 frames per sheet on 3×4 grid; originality check passes.
By eye: authentic FF5 16-bit chibi proportions; upright, no lean; fits 1 tile (or 2 tiles for large creatures); consistent scale across all actions; reads cleanly at 1×, 2×, and 3× zoom.

## 7. How image models fail here, and the rule for each
| Failure | Rule |
|---|---|
| Can't hit exact pixel sizes or sheet grids | Draw at 4× with even blocks; the cleaning step extracts and normalizes to 48×48 px cells. |
| Mixed pixel sizes and blur | Reject; enforce crisp pixel-art styling without blur or bilinear filtering. |
| Drifts to 2.5D, isometric or painterly | Reject anything that isn't the flat 3/4 top-down RPG view. |
| Wrong size against the grid square | Measure against §2: humanoids must fit 1 tile (38–48 px); large creatures 2 tiles (80–96 px). |
| The character changes between actions | Pass the master Walk sheet as reference (`ImagePaths`) to Google Nano Banana Pro for all subsequent sheets. |
| Flying projectiles or burst spells on sheets | Reject; bow is draw/pluck only; magic is initiation chant/aura only. Projectiles are engine-rendered. |
| Green fringes from green-screen | Magenta background (`#FF00FF`) only. |
| Animation faked with code distortion or shaders | Reject; all animation must be authored as distinct sprite frames in the sheet. No after-effect animations. |
| Drawn with non-Nano Banana model or typed in code | Reject; all assets must originate from authentic Google Nano Banana Pro (`gemini-3-pro-image`) generations. |

## 8. Guidelines for the Five Vertical Layers (Z-2 to Z+2) (VISION V117)
All environment, terrain, autotile, and structural generations must strictly follow the distinct color ramps and architectural definitions of the 5 layers:

| Layer | Name | Palette & Mood | Environment & Architectural Role |
|---|---|---|---|
| **Z-2** | **The Deep Layer** | Blacks, dark blues, glowies, dark purples | Abyssal caverns, primordial chasms, bioluminescent fungal groves, radiant crystal clusters/spires, subterranean horrors. Perpetual darkness lit only by glowing ambient minerals, bioluminescence, and mana veins. |
| **Z-1** | **The Subterranean Layer** | Browns, greys, slate | Rough-hewn stone, packed earth, excavated halls, mineable ore veins (iron, copper, gold, coal), rock outcroppings, early dwarven settlements, subterranean agriculture (mushrooms, roots). |
| **Z=0** | **Overland Biomes** | Full natural surface palette (vibrant greens, earthy browns, snow whites, desert tans) | Surface biomes (meadows, mixed forests, taiga/snow, arid deserts, wetlands/swamps, coastlines). Sunlight and weather cycles, wildlife herds, trees, surface agriculture, settler camps, natural cave entrances to Z-1. |
| **Z=+1** | **First Elevated Layer** | Architectural materials (cut timber, masonry stone, thatch/tile roofs) + cliff stone | **ONLY built up** (second-story rooms, roofs, wooden/stone walkways, watchtowers) OR **additional Z layers of natural topography** (cliffs, plateaus, mesa edges, mountain foothills). Open sky/air everywhere else. |
| **Z=+2** | **High Elevated Layer** | Roofing materials, battlements, high alpine stone and snow | **ONLY built up** (high roofs, third-story parapets, watchtower tops) OR **additional Z layers of mountains/peaks** (mountain peaks, jagged alpine ridges). Open sky/air everywhere else. |


