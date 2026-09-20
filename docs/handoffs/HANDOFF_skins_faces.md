# HANDOFF: a window skin and a face set for every culture (VISION V99, V100)

**From:** Claude Code (engine) · **To:** Gemini (art) · **Date:** 2026-09-19 · **Feature:** faction window skins and portrait styles in `UF_Factions` (with `UF_Talk` and `UF_Sheet`); system doc `docs/systems/UF_Factions.md` → Skins and portraits.

The user, 2026-09-19 14:42: "Every faction should have a different menu skin"; 14:44: "Every faction should have it's own U7 faceset style" (VISION V99, V100).

## What the feature is
- **Window skins.** Every window the player sees (the selection panel, the colonist card, the faction ledger, the right-click menu, the look panel, RPG Maker's own menus) uses the window skin of the **player's faction's culture**. In a conversation, each side's portrait is framed by its own faction's skin, so a stranger's side shows the stranger's skin. The skin changes with the player's faction and with a loaded save.
- **Portraits.** Every person's portrait tells their faction at a glance: each culture has its own frame, background, palette and costume motifs, painted in the manner of Ultima VII's face sets (a style reference only; nothing copied).
- **Until your art arrives,** the engine draws stand-ins in code so the factions already look different: each skin is `Window.png` recoloured in the culture's materials, and each portrait is the older stock face inside a simple code-drawn frame in the culture's colours (`UF_GenFrame`). The screenshots from the `skins` suite show them (below).

## What needs art (requests in `docs/ASSET_REQUESTS.md`, spec section "AR-1700 to AR-1730")
Every file is made exclusively with **Google Nano Banana Pro** (`generate_image`, model id `gemini-3-pro-image`, Gemini 3 Pro Image model; AGENTS.md Rule 11, VISION V69, V70, V79, V109) from prompts 11 and 12 in `docs/handoffs/GENERATOR_PROMPTS.md`. Nano Banana Pro utilizes advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity text and pixel details. Any animated interface elements (e.g. pause sign, cursor pulsing) must be authored as distinct sprite frames—**NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108). All art is reduced and palette-snapped by the project's tool, and must pass `tools/originality_check.js` before it goes into `game/` (AGENTS rule 8). Deliver the first skin and the first face sheet alone for the user's approval; then batches of three to five.


### Window skins: AR-1700 to AR-1710
`game/img/system/Window_<culture>.png`, exactly **192 × 192**, RPG Maker MZ's `Window.png` layout:

| Part | Rect (x, y, w, h) | Notes |
|---|---|---|
| Background | 0, 0, 96, 96 | Stretched over the whole window at 75% opacity. Dark and calm: text sits on it. |
| Background pattern | 0, 96, 96, 96 | Tiled over the background at 1:1. May be partly transparent. |
| Frame | 96, 0, 96, 96 | Cut in nine (24 × 24 corners, edges stretched). Transparent inside the 24 px border except the arrows. |
| Scroll arrows | up 132, 24, 24, 12; down 132, 60, 24, 12 | |
| Cursor | 96, 96, 48, 48 | Cut in nine with 4 × 4 corners. |
| Pause sign | 144, 96, 48, 48 | Four 24 × 24 frames. |
| Text colours | 96, 144, 96, 48 | **Copy `Window.png`'s 32 swatches unchanged.** |

| ID | Culture id | File | Material |
|---|---|---|---|
| AR-1700 | `human` | `Window_human.png` | carved dark oak, aged parchment and brass fittings (the current `Window.png` is already this: a human skin may start from it) |
| AR-1701 | `elf` | `Window_elf.png` | living wood and leaves with pale gold inlay, green-gold |
| AR-1702 | `dwarf` | `Window_dwarf.png` | dressed grey stone and dark iron, rune-cut, iron rivets |
| AR-1703 | `gnome` | `Window_gnome.png` | polished brass, rivets and small gears on dark teal enamel |
| AR-1704 | `goblin` | `Window_goblin.png` | rusted scrap iron, patched hide and lashings |
| AR-1705 | `orc` | `Window_orc.png` | bone, red-brown hide and black iron |
| AR-1706 | `lizardfolk` | `Window_lizardfolk.png` | woven reeds and shell, marsh teal and reed green |
| AR-1707 | `kobold` | `Window_kobold.png` | earthy ochre clay and tunnel rock hung with brass trinkets |
| AR-1708 | `undead` | `Window_undead.png` | grave stone, tarnished bronze and grey-green moss |
| AR-1709 | `starborn` | `Window_starborn.png` | cold crystal and light: a blue-violet glass lattice with silver (the automata use this skin) |
| AR-1710 | `swarm` | `Window_swarm.png` | dark chitin, living membrane and sinew with a violet sheen |

Rules the checks hold you to: white text at least 4.5 : 1 and the gold system colour `#ffc228` at least 3 : 1 on the background (`skins.text_readable`); the text-colour row unchanged (same check); no two cultures' skins alike in colour (`skins.cultures_differ`); alpha 0 or 255; palette `art/palette/uf.hex`.

### Face sets: AR-1720 to AR-1730
`game/img/faces/UF_Faces_<culture>_<n>.png`, n = 1 to 4, each **576 × 288**: RPG Maker MZ's face-sheet layout, 4 columns × 2 rows of 144 × 144, index 0–7 left to right, top row first.
- **Cells:** 0 adult man, 1 adult woman, 2 elder man, 3 elder woman (calm); 4–7 the same four people content (a slight smile). The four sheets are four different sets of people.
- **Each face:** a head-and-shoulders bust turned slightly toward the viewer, warm light from the upper left, painted pixel art in the manner of early-1990s VGA role-playing-game portraits. **The culture's frame is painted into every cell** (a band of about 10–16 px), with the culture's background inside the opening. It is the same frame on all eight cells and all four sheets.
- Generate at 4× (576 × 576 per face on your canvas); the tool reduces it and packs the sheet.

| ID | Culture id | Frame | Background | Palette | Motifs |
|---|---|---|---|---|---|
| AR-1720 | `human` | a carved stone arch (only the arch; the delivered AR-700 adult sheets alternate oak and stone) | deep midnight navy | warm skin tones, undyed wool, oak brown, brass | homespun tunics and hoods, leather collars, simple brooches and caps |
| AR-1721 | `elf` | a leafy bower of living branches | deep forest green with dappled light | green-gold, pale gold, bark brown, moss | leaf circlets, fine braids, pointed ears, embroidered hems |
| AR-1722 | `dwarf` | a rune-cut stone niche | hearth-lit dark rock | slate grey, iron, copper, ember orange | braided beards (women too, shorter), iron clasps, rune bands, leather aprons |
| AR-1723 | `gnome` | a brass-and-gear roundel | dark teal enamel | brass, copper, teal, cream | goggles, pointed caps, tool loops, big noses, spectacles |
| AR-1724 | `goblin` | a patched hide and scrap frame | smoky olive dusk | green-grey skin, rust, mud brown, dull yellow | big ears, scrap earrings, patched hoods, stitched leather |
| AR-1725 | `orc` | a bone-and-iron frame | dark red-brown | grey-green skin, bone, red-brown hide, black iron | tusks, war paint, iron rings, fur mantles |
| AR-1726 | `lizardfolk` | a reed-and-shell frame | murky marsh teal | scale green, teal, shell pink, reed gold | scales, crests and frills, shell beads, woven reeds |
| AR-1727 | `kobold` | a tunnel-rock niche hung with trinkets | lamp-lit clay ochre | rust-red scales, ochre, clay, brass trinkets | small horns, snouts, strings of trinkets, candle stubs |
| AR-1728 | `undead` | a tomb niche | grave grey-green | grey skin, bone, tarnished bronze, grave-moss green | sunken eyes, burial wraps, tarnished circlets, bare bone |
| AR-1729 | `starborn` | a crystal lattice | night blue with starlight | blue-violet, silver, pale light, a little gold | glowing sigils, smooth plates, crystal circlets, luminous eyes |
| AR-1730 | `swarm` | a living membrane | wet dark chitin green | chitin green-black, sickly yellow-green, violet sheen | mandibles, compound eyes, carapace ridges, antennae |

Bodies follow `docs/design/PEOPLES.md`. The star-born and the swarm are working names (proposals, V87); take only the concept (an ancient crystal-and-light people; a hive), never another game's designs (V9). Nothing in any face may be traced, recoloured or cropped from Ultima VII's portraits.

## How it plugs into the game (no code, no catalog edit)
- **Drop the file in place with its exact name.** The engine checks for `img/system/Window_<culture>.png` and `img/faces/UF_Faces_<culture>_<n>.png` at first use and uses whatever exists (restart the game or the playtest after adding one). Missing files are never loaded, so partial deliveries are safe: a culture with one face sheet uses that one.
- **Which culture is used:** a faction's culture is `faction.culture`, else its species. A person's portrait uses their faction's culture; a culture's face sheets show only that culture's own people, so a human living with elves keeps a human face in the elven frame.
- **The catalog** (`game/data/UF_WorldCatalog.json`, keys `skins` and `faces`, owned by Claude Code) already names every file and holds the materials and briefs above. You don't edit these keys. If a name or brief needs changing, write it under "Notes for Claude Code" in `docs/ASSET_REQUESTS.md`.
- **Species sheets** (AR-700, such as `UF_Faces_Human_Male_Adult.png`) still work: Claude Code lists them in `faces.species`, and they show for a culture's own people when the culture has no sheet yet. A species sheet without a painted frame (the human elder sheets) gets the code-drawn culture frame around it. When you deliver the elf species sheets (AR-700 batch 2), tell Claude Code in the Notes so they can be listed.
- **World generation:** nothing to add in `data/UF_WorldCatalog.json`'s `objects`. Skins and faces follow the factions the world rolls (`factions.species`), including the five new peoples once the peoples run adds them.

## Checking a delivery in the game
1. Make a test copy and run the suite: `"C:\Program Files\nodejs\node.exe" tools/test_snapshot.js --name skins --no-run`, then `"C:\Program Files\nodejs\node.exe" tools/run_tests.js skins --game %TEMP%\uf_snapshots\skins`.
2. `skins.cultures_differ` and `skins.text_readable` measure your delivered skin (its source then reads `file`). `skins.faces.by_culture` and `skins.faces.fallback` show which sheet each portrait came from.
3. Open the screenshots in the copy's `test_output/`: `skins.sheet_<culture>.png` (the selection panel under three player cultures) and `skins.talk_stranger.png` (a conversation with a stranger of another culture: both portraits and both skins).
4. Then do the usual: `tools/art_check.js`, `tools/originality_check.js`, the user's approval, and your status in `docs/ASSET_REQUESTS.md`.

## Decisions for the user (not for Gemini)
- Whether the automata (the star-born's constructs, PEOPLES.md) get face sheets of their own. Today they use the star-born's skin and crystal frame around their stock face.
- The star-born and swarm names (V87 proposals) are not part of any file name. The files use the ids `starborn` and `swarm`, which never change.
