// Builds docs/handoffs/GENERATOR_PROMPTS.md: one self-contained prompt per asset group, the same STYLE block in each.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const cat = JSON.parse(fs.readFileSync(path.join(root, "game", "data", "UF_WorldCatalog.json"), "utf8"));
const pal = fs.readFileSync(path.join(root, "art", "palette", "uf.hex"), "utf8").split(/\r?\n/).filter(Boolean).map(s => s.trim().toUpperCase());

// Palette ramps: every index checked against uf.hex below.
const RAMPS = [
    ["Foliage greens", [200, 201, 202, 240, 241, 242, 243, 69, 70, 71, 72, 168]],
    ["Neutral greys (stone, iron)", [118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 15]],
    ["Warm greys (slate, ash, dark stone)", [148, 149, 150, 158, 159, 160, 161, 162, 221, 223, 117]],
    ["Browns (bark, hair, leather, fur)", [8, 9, 10, 11, 12, 13, 139, 140, 141, 142, 143, 144, 145, 146, 147]],
    ["Linen, straw, rope, sand", [1, 2, 3, 134, 135, 136, 137, 138]],
    ["Skin", [32, 105, 107, 109, 110, 111, 112, 113]],
    ["Cloth darks (trousers, slate)", [114, 115, 116]],
    ["Reds (berries, apples, blood)", [21, 22, 23, 24, 25, 26, 27, 28]],
    ["Oranges and fire", [36, 37, 38, 39, 40, 41, 235, 236, 237]],
    ["Golds and yellows", [4, 5, 6, 7, 233, 234, 249, 250, 251]],
    ["Rust and copper", [180, 181, 182, 183, 184, 185]],
    ["Blues (water, ice, magic)", [74, 76, 77, 78, 79, 81, 86]]
];
for (const [, idx] of RAMPS) for (const i of idx) if (!/^#[0-9A-F]{6}$/.test(pal[i])) throw new Error(`palette index ${i} missing`);
const rampLines = RAMPS.map(([name, idx]) => `  ${name}: ${idx.map(i => pal[i]).join(" ")}`).join("\n");

const STYLE = `STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Google Nano Banana Pro, Rules V69, V70, V79, V109; AGENTS.md Rule 11): ALL GENERATION TASKS ARE TO UTILIZE GOOGLE NANO BANANA PRO. All art across all visual categories is generated exclusively using Google's Nano Banana Pro image model (Gemini 3 Pro Image model, gemini-3-pro-image / generate_image) with style and subject references attached. Nano Banana Pro utilizes advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity text and pixel details. No other generator model is permitted. Never type sprites in pixel by pixel in scripts or code. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
1. View: the ordinary 3/4 top-down RPG view (the default RPG Maker view). The ground is seen from above; people, animals, trees and objects stand UPRIGHT and show their front; walls show their top and front face. Nothing leans, tilts or slants: no 2.5D oblique lean, no isometric diamonds, no perspective.
2. Shading: light from the upper left; 3 to 5 flat tones per material (highlight, light, mid, shadow, deep shadow) in clean clusters, as FF6 does, with a little dithering only where a surface needs texture (bark, stone, fur); no gradients, no blur, no soft airbrushing, no anti-aliasing against the background. A dark selective outline around each silhouette, darkest at the bottom and right, never plain black everywhere.
3. Definition: one final pixel = one screen pixel: the highest definition this art style can have at this grid size, so use every pixel (the art director wants the highest-definition assets that keep the style and the scale). Characters are more detailed than FF6's small sprites (faces with eyes, clothing folds, belts and buckles, hair texture), but keep FF6's clarity and charm: every sprite reads at a glance.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels. A grown person fills roughly one square; smaller creatures are smaller; larger beings get bigger character sheets and take up more space. Everything is drawn at its size compared with that square, so the world is coherent:
   | Thing | Final size | Frame | Share of one grid square |
   | Grown human, elf, orc, automaton | 44–48 px tall | 48 × 48 | fills one square |
   | Dwarf, goblin, gnome | 34–40 px tall | 48 × 48 | most of a square |
   | Child | 24–36 px | 48 × 48 | half to three quarters |
   | Hare, rat, songbird | 12–16 px | 48 × 48 | a quarter to a third |
   | Fowl, bat, hawk | 16–24 px | 48 × 48 | a third to a half |
   | Fox, wildcat, jackal | 26–32 px long | 48 × 48 | half to two thirds |
   | Wolf, boar, sheep | 36–44 px long, 28–32 tall | 48 × 48 | most of a square |
   | Deer | 44 px long, 48 tall with antlers | 48 × 48 | one square |
   | Wild horse, aurochs | 72 px long, 56 tall | 96 × 96 | one and a half squares |
   | Giant spider, sand stalker | 64 px wide | 96 × 96 | one and a third squares |
   | Restless dead | 46 px tall | 48 × 48 | one square |
   | Ice wraith, bog horror | 64–72 px tall | 96 × 96 | one and a half squares |
   | Troll | 88 px tall | 96 × 96 | nearly two squares |
   | Oak, fruit tree | 80–96 px wide and tall | 96 × 96 | two squares |
   | Pine, birch, palm | 56–72 wide, 104–120 tall | 96 × 144 | two and a half squares tall |
   | Stump, bush | 32 × 24, 36 × 28 | 48 × 48 | two thirds |
   | Tall grass, reeds, flowers | 12–36 px | 48 × 48 | a quarter to three quarters |
   | Boulder, ore outcrop | 48 × 40 px | 48 × 48 | one square |
   | Loose stones, items on the ground | 12–28 px | 48 × 48 | a quarter to half |
   | Campfire | 40 wide, flame 32 tall | 48 × 48 | most of a square |
   | Straw bed, work stone | 44–48 × 24–28 | 48 × 48 | one square wide |
   | Furnace, well | 48–56 wide, 56–64 tall | 96 × 96 | a square and a bit |
   | Wall piece | its top fills the square; its front face is one square tall below it | 48 × 96 | one square plus its face |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is about 176–192 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the project palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final), standing on the bottom-centre of the square. A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) and stands on the bottom-centre of that canvas; it may reach up and to the sides beyond one square, never below its base. Never crop a shape to make it fit.
7. Colours: rich, warm and lively, as in FF6; the tool snaps every colour to the project palette, so avoid neon and pure black.
8. Background: flat magenta #FF00FF, one subject per image, centred. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation (MANDATORY SPRITE FRAMES; NO AFTER-EFFECT ANIMATIONS, AGENTS.md Rule 12, VISION V60, V108): ALL ANIMATION MUST HAPPEN THROUGH THE SPRITE. Everything that moves is animated as distinct sprite frames on the sheet; no programmatic distortion, squashing, stretching, rotation, or shader warps. Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout). Carrying is NOT drawn (VISION V89): a person or animal hauling something looks exactly as it does walking, and what it carries is written in its profile, so there is no carry image and no load held in the hands.

10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.`;

const obj = id => cat.objects.find(o => o.id === id);
const objLine = id => {
    const o = obj(id);
    if (!o) return `- ${id}`;
    const st = [];
    for (const [v, d] of Object.entries(o.actions || {})) st.push(`${v} turns it into ${d.becomes || "nothing (it is removed)"}`);
    if (o.regrow) st.push(`it regrows into ${o.regrow.to}`);
    if (o.build) st.push("it is built by people");
    if (o.ruin) st.push(`when ruined it becomes ${o.ruin}`);
    const under = o.under ? " Lies low under people, drawn calm." : "";
    return `- ${id} (${o.name}).${under}${st.length ? " " + st.join("; ") + "." : ""}`;
};
const species = cat.wildlife.species;
const spLine = id => { const s = species.find(x => x.id === id); return `- ${id} (${s ? s.name : id}${s ? ", " + s.kind : ""})`; };
const items = cat.items.types;
const itemLine = t => `- ${t.id} (${t.name})${t.weapon ? ": weapon" : ""}${t.armor ? ": armour" : ""}${t.shield ? ": shield" : ""}${t.ammo ? ": ammunition" : ""}`;

const UNIT_SHEET = `Sheet layout for every creature. The finished sheet has 8 rows (facings south, south-west, west, north-west, north, north-east, east, south-east) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 not drawn (carrying is not animated, VISION V89: the project's tool fills this column with the stand frame); 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Every action has all eight facings.
Deliver it ONE ACTION PER IMAGE; the project's tool assembles the sheet. In each image the frames run left to right and the eight facings run top to bottom in the order above; every cell is the same size (192 x 192 on your canvas for a 48 x 48 creature, so a three-frame action is 576 x 1536; 384 x 384 cells for a 96 x 96 creature), and the creature stands on the same point of every cell:
- <id>_idle.png: 3 frames (stand, idle 1, idle 2)
- <id>_walk.png: 3 frames (step, pass, step)
- <id>_work.png: 3 frames (wind-up, strike, follow-through)
- <id>_attack.png: 3 frames (wind-up, strike, recover)
- <id>_cast.png: 3 frames (raise, release, lower; people only)
- <id>_hurt.png: 1 frame (flinching back)
- <id>_death.png: 3 frames (buckling, falling, lying still)
If one image cannot hold eight rows at full size, split it: <id>_<action>_a.png with the rows south, south-west, west, north-west and <id>_<action>_b.png with north, north-east, east, south-east. Start each creature with its idle image and wait for approval; the other actions follow.`;

// VISION V99, V100 (user 2026-09-19 14:42 and 14:44): a window skin and a face style for every culture, from the
// catalog keys "skins" and "faces" (written by tools/add_skins_faces_catalog.js).
if (!cat.skins || !cat.skins.cultures || !cat.faces || !cat.faces.cultures) throw new Error("the catalog has no skins/faces keys: run tools/add_skins_faces_catalog.js first");
const cultureIds = sec => Object.keys(sec.cultures).filter(id => id !== "default" && !sec.cultures[id].like);
const likeNote = sec => Object.keys(sec.cultures).filter(id => sec.cultures[id].like).map(id => `${id} uses ${sec.cultures[id].like}'s`).join("; ");
const SKINS_BULLET = `- A WINDOW SKIN FOR EVERY CULTURE (VISION V99, user 2026-09-19: "Every faction should have a different menu skin"): every window of the player shows the skin of the player's faction's culture, and a conversation shows each side in its own. Each skin is one image in RPG Maker's Window.png format, exactly 192 x 192 final pixels: background 0,0 96 x 96 (stretched over the window, at 75% opacity; keep it dark and calm, white and gold text sit on it); background pattern 0,96 96 x 96 (tiled over it); frame 96,0 96 x 96 (cut in nine with 24 x 24 corners, transparent inside the border except the scroll arrows at 132,24 and 132,60, 24 x 12 each); cursor 96,96 48 x 48 (cut in nine with 4 px corners); pause sign 144,96 48 x 48 (four 24 x 24 frames); the text colour row 96,144 96 x 48 copied unchanged from the current Window.png. The cultures and their materials:
${cultureIds(cat.skins).map(id => `  - ${id}: ${cat.skins.cultures[id].material} (Window_${id}.png)`).join("\n")}
  (${likeNote(cat.skins) || "every culture has its own"}.) Each culture's skin must read as its own material at a glance; no two alike.`;
const FACES_BODY = `Your job: the portraits for the character sheet and conversations, ONE STYLE PER CULTURE (VISION V100, user 2026-09-19: "Every faction should have it's own U7 faceset style"). Portraits are not map sprites: a head-and-shoulders bust turned slightly toward the viewer, 144 x 144 pixels (RPG Maker MZ's face size; 576 x 576 on your 4x canvas), painted pixel art at full detail in the manner of early-1990s VGA role-playing-game portraits, warm light from the upper left. Ultima VII's face sets are the STYLE reference for that manner only: never copy, trace, crop or recolour one (every delivery goes through the originality check).
Each culture has its own FRAME painted into every portrait (a band of about 10-16 final pixels round the cell), its own BACKGROUND inside the frame's opening, its own PALETTE and COSTUME MOTIFS, so a face tells its faction at a glance. One culture, one frame: the same frame on every portrait of that culture. Bodies follow the peoples' descriptions in docs/design/PEOPLES.md.
${cultureIds(cat.faces).map(id => { const c = cat.faces.cultures[id]; return `- ${id}: frame ${c.frame}; background ${c.background}; palette ${c.palette}; motifs ${c.motifs}.`; }).join("\n")}
For every culture: four adult men, four adult women, four elder men and four elder women (varied hair, beards, scars, colouring), each face in two moods, calm and content (a slight smile). One face and mood per image, named face_<culture>_<adult|elder>_<male|female>_<n>_<calm|content>.png (n 1 to 4). Deliver the first culture's first face alone and wait for approval; then one culture at a time. The species face sheets already delivered (AR-700) stay in use until a culture's set arrives.`;

const GROUPS = [
    { n: 0, title: "Style lock (do this first, alone)", body: `Your job: the four style anchors every other generator will copy. Make them one at a time, in this order, and stop after each for approval.
- human_male: an adult human man, a settler of a small frontier band, plain undyed homespun tunic, rope belt, dark trousers, simple shoes, short brown hair. First deliver only the south stand frame (48 x 48 frame, about 46 px tall, feet on the bottom row, centred). After approval, the stand frame in all eight facings (one image, one column of eight cells: this locks the diagonal view). After that, the rest of the sheet, one action per image (see the layout below).
- oak: a mature broadleaf oak (96 x 96 frame, about 90 px wide and tall, the trunk standing upright at the bottom centre), stand frame plus 3 sway frames.
- wall_wood: one straight piece of a wooden palisade wall of vertical logs, running east to west: its top on the square and its front face one square tall below it (a 48 x 96 piece, like an RPG Maker wall).
- meadow: one 48 x 48 ground tile of meadow grass, seamless on all four sides, calm and low-contrast (people and objects stand on it).
${UNIT_SHEET}` },
    { n: 1, title: "Ground and water tiles", body: `Your job: every ground and water surface. Ground is flat (seen from above), seamless, calm and low-contrast, because everything else stands on it; realistic textures at full detail.
Format: each ground kind is one RPG Maker "A2" autotile block of 96 x 144 pixels (2 x 3 tiles of 48 x 48): top-left tile = a plain sample of the surface; top-right tile = the four inner corners; the lower 2 x 2 tiles = a square patch of the surface with its outer edges and corners, so the game can build every border shape. Borders between kinds are a soft natural edge (grass fraying into dirt, sand drifting onto rock), not a hard line.
Ground kinds (${cat.groundKinds.length}): ${cat.groundKinds.map(g => `${g.id}${g.name ? " (" + g.name + ")" : ""}`).join(", ")}. Notes: peak_rock is impassable cliff rock and may show a rock face on its south edge; scree is loose broken rock; cursed_grass and blessed_grass replace meadow in evil and good regions (sickly or luminous); floor_wood, floor_stone and floor_rushes are house floors (planks, flagstones, strewn rushes) laid by people; road is packed earth; ash is burnt ground.
Water kinds (${Object.keys(cat.water.surface).length}): ${Object.keys(cat.water.surface).join(", ")}. Each is an RPG Maker "A1" water block: the same 96 x 144 layout, three animation frames side by side (288 x 144) with small shifts of the ripples and glints; deep water darker, marsh and swamp murky with weed, icy water with floes, blighted water sickly.
Name each file by its id (meadow.png, fresh.png ...).` },
    { n: 2, title: "Trees and large plants", body: `Your job: every tree. Trees are larger than a cell: use a 96 x 96 frame (96 x 144 for very tall ones such as palm or pine if needed); the trunk stands upright at the bottom centre of the frame. The trunk blocks one cell (footprint [1, 1]).
Each tree sheet: frame 0 stand, frames 1-3 sway (the crown moves 1-2 px, leaves shimmer). Felling a tree leaves a separate stump asset.
${["oak", "birch", "pine", "fir_snow", "fruit_tree", "fruit_tree_bare", "tree_savanna", "tree_swamp", "mangrove", "tree_tropical", "palm", "dead_tree", "tree_cursed", "stump"].map(objLine).join("\n")}
Notes: fruit_tree carries visible fruit; fruit_tree_bare is the same tree after picking (no fruit, a little duller). stump is the cut trunk with rings on its top face (48 x 48 frame, no sway). dead_tree has no leaves; tree_cursed is twisted and blighted; fir_snow carries snow on its boughs; tree_swamp and mangrove stand in wet ground with visible roots.` },
    { n: 3, title: "Small plants and ground cover", body: `Your job: bushes, grasses, flowers, crops and water plants, all in 48 x 48 frames. Most lie low under people: keep them calm and low-contrast. Grasses, reeds, crops and flowers get frames 1-3 sway (a gentle ripple); bushes barely move (1 px).
${["berry_bush", "berry_bush_bare", "bush", "desert_shrub", "snow_bush", "cactus", "cactus_tall", "grass_tuft", "reeds", "flowers", "flowers_purple", "flowers_blue", "flowers_white", "fern", "lichen", "wild_grain", "wheat_wild", "lily_pad"].map(objLine).join("\n")}
Notes: berry_bush carries red berries; berry_bush_bare is the same bush picked. lily_pad floats on water (drawn over a water tile, transparent elsewhere). cactus_tall is taller than a person (48 x 96 frame if needed).` },
    { n: 4, title: "Stone, ore, crystals and ruins", body: `Your job: rocks and minerals and the remains of old buildings. Frames 48 x 48 unless the shape needs 96 x 96. Show a lit top and a shaded front on every rock.
${["rocks_small", "gravel", "granite_boulder", "ironstone", "copper_outcrop", "gold_outcrop", "crystal", "crystal_small", "bones_pile", "rubble", "rubble_pillar"].map(objLine).join("\n")}
Notes: ironstone shows rust-streaked dark rock, copper_outcrop green-stained rock, gold_outcrop quartz with gold flecks; crystal and crystal_small get 2 extra frames of a faint glint. Quarrying or mining leaves rocks_small (loose stones), which people then pick up.` },
    { n: 5, title: "Buildings, camp and workshops", body: `Your job: everything people build. Walls and doors: a wall is a CONNECTED SET like an RPG Maker chipset wall: pieces join to their neighbours, and (the art director's rule) the wall shows a visible face on its north side as well as its south side where the ground there is open. Deliver each wall material as a set of 20 pieces in a 4 x 5 grid, indexed by which neighbours are walls (north 1, east 2, south 4, west 8: pieces 0-15), plus 4 north-face variants (16-19) for east-west runs whose north side is open. Each piece is 48 x 96: its top on the square and its front face one square tall below it, like an RPG Maker wall.
${["wall_wood", "wall_stone", "door_wood", "door_stone", "floor_straw", "stockpile", "campfire", "workbench", "furnace", "smithy", "bowyer_bench", "fletcher_bench", "tanning_rack", "weapon_rack", "bridge", "farm_plot", "well"].map(objLine).join("\n")}
Animations and states: doors closed plus 3 frames opening (for east-west and north-south walls); campfire unlit, lit (4-frame flame loop with sparks), and burnt-out embers; furnace idle and working (glow loop); smithy idle and working (hammer spark loop); tanning_rack empty and with a hide stretched; weapon_rack empty and full; farm_plot as tilled soil plus 4 growth stages of a crop; well with its bucket; stockpile is a flat dashed marker on the ground (no height, low contrast); bridge is planks over water, seen from above with its side rails.` },
    { n: 6, title: "People (bodies)", body: `Your job: the bodies of all peoples, at every age. A grown person fills roughly one grid square (see the scale); larger peoples may use bigger sheets. Frames 48 x 48 (96 x 96 only if a species does not fit). Plain undyed clothes (a simple tunic or wrap): armour, weapons and better clothes are separate layers made by another generator on exactly the same frames, so keep the body's pose and position identical to the approved human_male anchor frame by frame.
Species (${Object.keys(cat.people).filter(k => k !== "about").length}): ${Object.keys(cat.people).filter(k => k !== "about").join(", ")}, each male and female. Make species clearly different in silhouette at this size: elves tall and slender with pointed ears; dwarves short and broad with beards (women too, shorter); gnomes small with big noses and caps; goblins small, hunched, green-grey skin, big ears; orcs tall, heavy, tusked, grey-green; the automaton a jointed figure of wood, brass and stone with a glowing eye.
Ages: baby (crawling, 14-18 px long), child (24-32 px tall), teen (36-42 px), adult (44-48 px), elder (slightly stooped, grey hair, 42-46 px). These heights are for humans, elves, orcs and the automaton; dwarves, goblins and gnomes scale down in proportion (adult 34-40 px). One sheet per species, gender and age, every action in all eight facings.
${UNIT_SHEET}
Name files <species>_<gender>_<age>_<action>.png (human_male_adult_idle.png, human_male_adult_walk.png ...).` },
    { n: 7, title: "Equipment layers (after the first body is approved)", body: `Your job: clothing, armour and held items as LAYERS drawn on transparent (magenta) frames that sit exactly on top of the approved people bodies, frame by frame and facing by facing: all eight facings of every action, in the same one-image-per-action layout as the bodies. Draw each layer against the approved human_male_adult sheet so it lines up pixel for pixel, including the work, attack and cast swings; a second pass fits the other species.
Layers:
- Clothing tiers: fiber_wrap (woven grass wrap), hide_cloak (rough animal hide), tailored (dyed tunic and trousers).
- Head: helmet_leather, helmet_iron. Torso: armor_leather, mail_iron. Legs: leggings_leather, greaves_iron. Shields: shield_wood, shield_iron (held on the arm).
- Held weapons and tools: ${items.filter(t => t.weapon).map(t => t.id).join(", ")}; a quiver of arrows on the back when a bow is held.
Name files <item id>_layer_<action>.png (spear_layer_attack.png ...). The swing of each weapon must read in the attack images and tools in the work images, in every facing: a north-west swing is aimed north-west. Where the item passes behind the body (a sword swung across the back, a shield arm turned away), leave those pixels empty so the body shows in front.
RMMZ Asset Specs (Rule V70): Every layer is assembled into the AR-600 8-way master (<item id>_layer_<action>.png) and exported as a drop-in RPG Maker MZ 144×192 px single-character overlay sheet ($UF_Layer_<itemId>.png, 3 cols × 4 rows: Down, Left, Right, Up) with sidecar ($UF_Layer_<itemId>.json) per docs/RMMZ_ASSET_SPEC.md.
${UNIT_SHEET}` },
    { n: 8, title: "Animals", body: `Your job: every animal, at its size against the grid square (see the scale): small animals are smaller than a square, most beasts fill about one, and the wild horse and the aurochs are larger (96 x 96 frames, standing at the bottom centre). Natural-looking animals in the FF6 manner, full detail, upright in the top-down view.
${["deer", "boar", "aurochs", "wild_horse", "wild_sheep", "hare", "fowl", "rat", "wolf", "jackal", "fox", "arctic_fox", "wildcat", "serpent", "hawk", "songbird", "bat"].map(spLine).join("\n")}
${UNIT_SHEET}
Notes: grazers use the work columns for running away; predators use the attack columns for a bite or pounce; fliers (hawk, songbird, bat) are drawn in the air above their cell with a flapping loop in the walk columns and a separate perched stand frame; the serpent slithers. Death frames end with the animal lying on its side: that last frame stays as the remains. Deer: stag with antlers and hind without, as two sheets.` },
    { n: 9, title: "Monsters", body: `Your job: the monsters, original designs only (no creatures from other games or tabletop products). Sizes from the scale: some are person-sized, some larger than a cell (96 x 96 frames standing at the bottom centre).
${["giant_spider", "troll", "bog_horror", "sand_stalker", "restless_dead", "ice_wraith"].map(spLine).join("\n")}
Designs: giant_spider a hairy cave spider the size of a large dog; troll a hulking grey-green brute with stony, mossy skin and long arms; bog_horror a shambling mass of mud, reeds and roots with a vaguely human shape; sand_stalker a low desert predator with sandy plates and long claws; restless_dead a walking skeleton in rags; ice_wraith a floating, translucent frost spirit trailing mist (use magenta for the background and the palette's pale blues for the body; no partial transparency). Avoid red bodies (the game marks hostiles with a red square under them).
${UNIT_SHEET}` },
    { n: 10, title: "Items and icons", body: `Your job: every item, twice: (1) as a ground item, small and lying on the ground in a 48 x 48 frame in the same top-down view (a log, a heap of berries, a bar of iron), placed in the lower half of the frame; (2) as an inventory icon, 32 x 32, the same object drawn a little larger and clearer for the inventory grid (readable at a glance). Deliver each item as <id>.png (ground) and <id>_icon.png (icon).
Items (${items.length}):
${items.map(itemLine).join("\n")}
Notes: a stack is one image (the game shows a count); arrows as a small bundle; food looks edible (cooked meat browned, raw meat red); tools and weapons show their material (stone heads lashed to wood, iron blades).` },
    { n: 11, title: "Faces: one style per culture", body: FACES_BODY },
    { n: 12, title: "Interface", body: `Your job: the game's screens and markers. Style for the pieces other than the skins: dark carved wood and aged parchment with brass fittings, readable and quiet, at full detail; flat interface art.
${SKINS_BULLET}
- Inventory grid slot (36 x 36, empty and highlighted), the five equipment slots (head, weapon, shield, torso, legs) with faint outline icons, a character-sheet panel frame, a small tooltip frame.
- Conversation window: a portrait frame (144 x 144 inside, the RPG Maker face size) and keyword buttons (normal, hover, pressed).
- Badges: PAUSED, speed (1x, 2x, 4x, 8x), COMBAT.
- Markers on the ground under a creature's feet are RINGS, not squares (VISION V32, since 2026-09-19): a circle lying flat on the ground, so a flattened ellipse exactly twice as wide as tall that touches all four edges of its frame, with stepped pixel edges. Stance rings in green (friendly), yellow (neutral), red (hostile): a solid darker rim around a middle of 1-pixel checker (the colour and transparent), 40 x 20 for a creature on a 48 x 48 sheet and 80 x 40 for one on a 96 x 96 sheet (160 x 80 and 320 x 160 on your 4x canvas). A selection ring, a little larger (44 x 22 and 88 x 44) and open in the middle: a bold bright iron band between two thin dark edges, pulsing in brightness over 3 frames (dim, bright, brightest) without moving or changing size. No corners, brackets or rivets on these markers.
- 15 designation marks for jobs (chop, gather, pick, quarry, mine, dismantle, build, dig, fish, hunt, haul, eat, drink, move, other), 48 x 48 each.` },
    { n: 13, title: "Effects", body: `Your job: the small animated effects that make the world move. Same palette, in the world's top-down view, magenta background, frames side by side.
- Hit flash (3 frames), blood splatter on the ground (3 sizes, small and not gory), dust puff for footsteps and work (4 frames), wood chips (chopping) and stone chips (mining), 4 frames each.
- Fire loop (6 frames) for a burning cell and a small flame (4 frames), embers, smoke puff rising (6 frames), sparks (3 frames).
- Water glint (3 frames), falling leaves and drifting pollen (4 frames each), snowflakes, rain streaks.
- Missiles in eight directions (one image each, the eight directions as rows in the facing order south, south-west, west, north-west, north, north-east, east, south-east): an arrow in flight (2 frames), a thrown spear (2 frames); a sling stone is round (2 frames of spin, one row).
- Spells: a hand glow (3 frames); a fire bolt and a frost bolt in flight, each in the eight directions (3 frames); three spell bursts (fire, frost, healing), 6 frames each, 48 x 48 or 96 x 96.
Name files fx_<name>.png.` }
];

let md = `# Generator prompts: one per asset group (rewritten 2026-09-19 by Claude Code)

The user's decisions behind these prompts (docs/VISION.md): HD pixel art in the style of Final Fantasy VI (flat top-down, no 2.5D lean), drawn at higher definition than the original; every sprite at its size against the 48 px RPG Maker grid square, with a grown person filling roughly one square and larger beings on bigger character sheets (V44); creatures move and act in eight directions, so every action is drawn in all eight facings and delivered one image per action (V3); the theme is Arthurian fantasy with science-fiction elements (V65); everything that can move is animated as frames and shows its equipment as layers (V58, V60, V61), except carried loads, which are written in the character's profile and never drawn (V89); every shipped asset is original and passes the originality check (AGENTS rule 8).

## How to use
0. **Google Nano Banana Pro is mandatory for all generation tasks** (VISION V69, V70, V79, V109; AGENTS.md Rule 11): ALL GENERATION TASKS ARE TO UTILIZE GOOGLE NANO BANANA PRO. Every image across all asset categories is made exclusively with Google's Nano Banana Pro image model (Gemini 3 Pro Image model, generate_image, model id gemini-3-pro-image). Nano Banana Pro utilizes advanced reasoning ("Thinking") to follow complex instructions, maintain brand consistency, and render high-fidelity text and pixel details. No other generator model, no drawing tool, and never a sprite typed in pixel by pixel in code. Save the model's output unmodified. All animation must happen through distinct sprite frames authored in the art—**NO AFTER-EFFECT ANIMATIONS** (AGENTS.md Rule 12, VISION V60, V108). Every group's prompt names the standard RPG Maker MZ set its deliveries end up in (docs/RMMZ_ASSET_SPEC.md); the project's tools pack single generations into those sheets.

1. Start one generator with prompt 0 and get the four anchors approved before anything else.
2. Then start one generator per group, 1 to 13 (group 7 waits for the first approved body from group 6). Each prompt is self-contained: paste the whole block.
3. Attach to every generator a few stock RPG Maker MZ sprites as a size and view reference (for example game/img/characters/People1.png, Actor1.png, Nature.png and a crop of game/img/tilesets/Outside_B.png; RPG Maker's own art is licensed for RPG Maker games and uses the same flat view), and, once approved, the four anchors.
4. Save each delivery under art/raw/ with the file name the prompt gives (art/raw/oak.png; creatures one file per action, art/raw/human_male_adult_walk.png). Claude Code reduces it with the project's tool, checks it (palette, size, originality) and wires it into the game after your approval.

`;
// The standard RPG Maker MZ set each group's deliveries end up in (VISION V70, user 2026-09-19: "include RMMZ asset
// specifications so we can make standardized sets"). Sizes from docs/RMMZ_ASSET_SPEC.md (measured from the stock files).
// The image model draws single subjects; the cleaning and export step packs them into these sheets.
const CHAR_SET = `a drop-in RPG Maker MZ single-character sheet $UF_<id>.png: 3 columns x 4 rows of frames (rows Down, Left, Right, Up; columns step, stand, step), 144 x 192 px for 48 x 48 frames, 288 x 384 for 96 x 96, 288 x 576 for 96 x 144; the full 8-facing, 20-column AR-600 master stays in art/masters and drives the game's own animation`;
const RMMZ_SET = {
    0: `man: the AR-600 master plus ${CHAR_SET}; oak: an upper-layer B-E tileset block (768 x 768 sheet of 48 x 48 tiles, the oak as a 2 x 2 tile block) plus a !$UF_oak.png object sheet for the sway frames; wall_wood: a wall piece on the 48 x 96 two-square wall standard (V73) exported as an A4-style wall block; meadow: one A2 ground autotile block of 96 x 144 (2 x 3 tiles) placed in a 768 x 576 A2 sheet.`,
    1: `ground kinds: A2 ground autotile blocks, 96 x 144 each (2 x 3 tiles of 48 x 48), up to 32 per 768 x 576 A2 sheet; water kinds: A1 animated blocks, three 96 x 144 frames each, in a 768 x 576 A1 sheet; house floors (floor_wood, floor_stone, floor_rushes): A5 single 48 x 48 tiles in a 384 x 768 A5 sheet (8 x 16 tiles), or A2 blocks if they need borders.`,
    2: `the standing tree as an upper-layer B-E tileset block (768 x 768 sheet, 16 x 16 tiles of 48 x 48; a 96 x 96 tree is a 2 x 2 block, a 96 x 144 tree a 2 x 3 block); the sway frames as a !$UF_<id>.png object sheet (3 columns of frames, 4 identical rows); the stump as a single 48 x 48 B-E tile.`,
    3: `each plant as a 48 x 48 upper-layer B-E tile (768 x 768 sheet); plants that sway also as a !$UF_<id>.png object sheet (3 frames, 4 identical rows, 144 x 192); lily_pad on water as a B-E tile with transparency around it.`,
    4: `each rock, ore and ruin as a 48 x 48 upper-layer B-E tile (768 x 768 sheet; 96 x 96 shapes as 2 x 2 blocks); crystals that glint also as a !$UF_<id>.png object sheet (3 frames, 144 x 192).`,
    5: `walls: the two-square wall pieces (48 x 96, V73) packed as an A4 wall block per material (768 x 576 A4 sheet); doors, campfire, furnace, smithy, tanning rack, weapon rack and well: !$UF_<id>.png object sheets, one row per state (closed/opening, unlit/lit/embers, idle/working), 3 frames per row, 144 x 192 for 48 x 48 frames and 288 x 384 for 96 x 96; floor_straw, stockpile and farm_plot: 48 x 48 A5 tiles (384 x 768 sheet) or B-E tiles; bridge: B-E tiles.`,
    6: `per body: the AR-600 master (8 facings x 20 columns) plus ${CHAR_SET}.`,
    8: `per animal: the AR-600 master plus ${CHAR_SET}.`,
    9: `per monster: the AR-600 master plus ${CHAR_SET}.`,
    10: `ground items: a !$UF_Item_<id>.png object sheet (48 x 48 frame, 144 x 192 sheet, the item in the stand cell of every row); inventory icons: 32 x 32 cells added to an IconSet-format sheet (16 icons per 512 px row).`,
    11: `faces: RPG Maker MZ face sheets game/img/faces/UF_Faces_<culture>_<n>.png (n 1 to 4), 576 x 288, eight 144 x 144 faces in 4 columns x 2 rows: cells 0-3 adult man, adult woman, elder man, elder woman (calm), cells 4-7 the same four content.`,
    12: `one window skin per culture, img/system/Window_<culture>.png, each exactly 192 x 192 in RPG Maker's Window.png layout; icons into an IconSet-format sheet (32 x 32 cells, 16 per 512 px row); balloons in Balloon.png format (48 x 48 cells, 8 frames x 15 rows, 384 x 720); buttons in ButtonSet.png format (528 x 96); the stance rings as img/system/UF_StanceRing_1.png (120 x 20: friendly, indifferent, hostile frames of 40 x 20) and UF_StanceRing_2.png (240 x 40, frames of 80 x 40); the selection ring as UF_SelectRing_1.png (132 x 22: 3 pulse frames of 44 x 22) and UF_SelectRing_2.png (264 x 44, frames of 88 x 44); the job marks as !$UF_<id>.png sheets (48 x 48 frames, 144 x 192).`,
    13: `each effect as $UF_fx_<name>.png, 144 x 192 (3 frames x 4 rows of 48 x 48; omni-directional effects repeat the frames on all 4 rows; missiles use the rows for Down, Left, Right, Up), or 288 x 384 for 96 x 96 bursts; the 8-direction master stays in art/masters.`,
};
for (const g of GROUPS) {
    const set = RMMZ_SET[g.n] ? `\n\nRMMZ SET (VISION V70; exact formats in docs/RMMZ_ASSET_SPEC.md). You draw single subjects at 4x on magenta; the project's tools pack them into: ${RMMZ_SET[g.n]} Never try to draw a whole RPG Maker sheet in one image.` : "";
    md += `## Prompt ${g.n}: ${g.title}\n\n\`\`\`text\n${STYLE}\n\nYOUR GROUP: ${g.title.toUpperCase()}\n\n${g.body}${set}\n\`\`\`\n\n`;
}
const out = path.join(root, "docs", "handoffs", "GENERATOR_PROMPTS.md");
fs.writeFileSync(out, md);
console.log(`wrote ${out}: ${GROUPS.length} prompts, ${md.length} chars, ${md.split(/\s+/).length} words`);
