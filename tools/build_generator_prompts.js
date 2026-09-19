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

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The look is HIGH-RESOLUTION 2.5D PIXEL ART in the manner of an early-1990s VGA top-down role-playing game, described by the art director as "fantasy realism on a small scale".

1. Projection (2.5D oblique, not isometric):
   - The ground is a square grid seen from straight above. Grid cells are 48 x 48 screen pixels.
   - Anything with height leans UP and to the LEFT at 45 degrees: each pixel of height moves the image 1 pixel up and 1 pixel left.
   - So you always see the TOP, the SOUTH (front) face and the EAST (right) face of everything, never the north or west faces.
   - A tall thing touches the ground at the bottom-right of its drawing; its top is up and to the left.
   - Never draw an isometric diamond base, never a flat side-on or straight-front view.
2. Light: from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Shading in fine 1-pixel steps with micro-dither between tones.
3. Detail: one art pixel is one screen pixel. Draw at the final size at full detail. Never draw small and enlarge, never use 2x or 3x chunky pixels. Realistic proportions, materials and textures (bark, stone grain, fur, cloth folds, rust) in a fantasy world.
4. Scale (one coherent world; a cell is about 2.5 to 3 metres). Draw everything to these heights at 1:1:
   - Grown human 32 px tall (elf 34, orc 36, dwarf 26, gnome 22, goblin 24, automaton 34); children 16 to 24; people fit well inside one cell.
   - Hare 10 px long, rat 8, songbird 8, fowl 12, bat 14 wingspan, hawk 18 wingspan.
   - Fox 20 long, wildcat 18, jackal 22, wolf 28 long by 20 tall, boar 30 by 20, sheep 26 by 20, deer 34 long by 32 tall with antlers.
   - Wild horse 50 long by 40 tall, aurochs 52 by 36 (a little more than a cell).
   - Restless dead 32 (person size), giant spider 40 wide, ice wraith 44 tall, sand stalker 48 long, bog horror 56 tall, troll 64 tall.
   - Oak 70 wide by 70 tall, pine 50 by 64, fruit tree 60 by 60, birch 44 by 66, palm 56 by 72, flat-top tree 80 by 48, stump 24 by 18.
   - Bush 26 by 20, tall grass 18 by 14, reeds 14 by 26, flowers 12 by 8, cactus 14 by 28, tall cactus 20 by 44.
   - Boulder 40 by 32, ore outcrop 40 by 34, loose stones 22 by 10, crystal cluster 20 by 28.
   - Campfire ring 30 by 16 plus a flame 24 tall, straw bed 34 by 20, work stone 30 by 18, furnace 44 by 48, well 36 by 40.
   - A wall piece fills its cell and rises 32 px, so its top face sits 32 px up and to the left of its base.
   These sizes are the working scale the art director described ("humanoids smaller than one grid square, trees and large monsters slightly larger"). They are final once the director approves the scale lineup; if told otherwise, follow the new numbers.
5. Frames: an asset that fits in one cell uses a 48 x 48 frame. A larger one uses a 96 x 96 frame (or 96 x 144 for very tall things) in which the cell it stands on is the BOTTOM-RIGHT 48 x 48 of the frame, and the rest leans up and left from it. Never crop a shape to make it fit a frame.
6. Palette: only colours from the project palette (256 colours, a warm, earthy daylight palette). The main ramps, lightest first where it matters:
${rampLines}
   Use as few colours as the material needs (typically 20 to 40 per sheet). Outline: a dark selective line (#201408) only on the lower and right edges of a silhouette; the lit upper-left edges have no outline.
7. Background: flat magenta #FF00FF. No anti-aliasing against it; every pixel is either fully drawn or background.
8. Never: baked ground shadows (the game draws them), text, borders, grid lines, watermarks, logos, or names from other games.
9. Animation: everything that can move is animated (the art director's rule). Frames of one asset sit side by side on one sheet as your group section says. Frame timing is 150 ms unless your section says otherwise.
10. Facings: creatures have four facings, drawn separately in this row order: south (toward the viewer), west, east, north (back). Because of the up-left lean, west and east are NOT mirror images of each other.
11. Equipment shows (the art director's rule): what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks the layers the character has equipped. Every work and attack frame is drawn so a held tool or weapon lines up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is original. Reference images you are given (an old game's sprites) show scale and projection only: never trace, copy, recolour or edit them.
13. Delivery, for every asset:
   - The PNG sheet, named <id>.png (the ids are listed in your section), saved by the art director to art/masters/.
   - A JSON sidecar named <id>.json, for example:
     { "id": "oak", "frameWidth": 96, "frameHeight": 96, "anchor": [72, 95], "footprint": [1, 1], "facings": ["S"], "animations": { "stand": [0], "sway": [0, 1, 2] }, "frameMs": 150 }
     "anchor" is the pixel in the frame where the thing touches the ground: the bottom-centre of the cell it stands on. "footprint" is the cells it blocks (width, height).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.
   - For each asset, add one line on what you drew and which states and frames the sheet holds.`;

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

const UNIT_SHEET = `Sheet layout for every creature: 4 rows (facings south, west, east, north) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Name the columns in the sidecar's "animations".`;

const GROUPS = [
    { n: 0, title: "Style lock (do this first, alone)", body: `Your job: the four style anchors every other generator will copy. Make them one at a time, in this order, and stop after each for approval.
- human_male: an adult human man, a settler of a small frontier band, plain undyed homespun tunic, rope belt, dark trousers, simple shoes, short brown hair. First deliver only the south stand frame (48 x 48 frame, 32 px tall, feet at the bottom right of the frame's centre). After approval, the full sheet (see the layout below).
- oak: a mature broadleaf oak (96 x 96 frame, about 70 by 70 px, trunk base in the bottom-right cell, crown leaning up-left), stand frame plus 3 sway frames.
- wall_wood: one straight piece of a wooden palisade wall of vertical logs, running east to west: top face, south face and the lean; 48 px wide, rising 32 px.
- meadow: one 48 x 48 ground tile of meadow grass, seamless on all four sides, calm and low-contrast (people and objects stand on it), flat (ground has no lean).
${UNIT_SHEET}` },
    { n: 1, title: "Ground and water tiles", body: `Your job: every ground and water surface. Ground is flat (seen from above, no lean), seamless, calm and low-contrast, because everything else stands on it; realistic textures at full detail.
Format: each ground kind is one RPG Maker "A2" autotile block of 96 x 144 pixels (2 x 3 tiles of 48 x 48): top-left tile = a plain sample of the surface; top-right tile = the four inner corners; the lower 2 x 2 tiles = a square patch of the surface with its outer edges and corners, so the game can build every border shape. Borders between kinds are a soft natural edge (grass fraying into dirt, sand drifting onto rock), not a hard line.
Ground kinds (${cat.groundKinds.length}): ${cat.groundKinds.map(g => `${g.id}${g.name ? " (" + g.name + ")" : ""}`).join(", ")}. Notes: peak_rock is impassable cliff rock and may show rock faces with the lean on its south and east edges; scree is loose broken rock; cursed_grass and blessed_grass replace meadow in evil and good regions (sickly or luminous); floor_wood, floor_stone and floor_rushes are house floors (planks, flagstones, strewn rushes) laid by people; road is packed earth; ash is burnt ground.
Water kinds (${Object.keys(cat.water.surface).length}): ${Object.keys(cat.water.surface).join(", ")}. Each is an RPG Maker "A1" water block: the same 96 x 144 layout, three animation frames side by side (288 x 144) with small shifts of the ripples and glints; deep water darker, marsh and swamp murky with weed, icy water with floes, blighted water sickly.
Name each file by its id (meadow.png, fresh.png ...).` },
    { n: 2, title: "Trees and large plants", body: `Your job: every tree. Trees are larger than a cell: use a 96 x 96 frame (96 x 144 for very tall ones such as palm or pine if needed); the trunk stands in the frame's bottom-right cell and the tree leans up-left. The trunk blocks one cell (footprint [1, 1]).
Each tree sheet: frame 0 stand, frames 1-3 sway (the crown moves 1-2 px, leaves shimmer). Felling a tree leaves a separate stump asset.
${["oak", "birch", "pine", "fir_snow", "fruit_tree", "fruit_tree_bare", "tree_savanna", "tree_swamp", "mangrove", "tree_tropical", "palm", "dead_tree", "tree_cursed", "stump"].map(objLine).join("\n")}
Notes: fruit_tree carries visible fruit; fruit_tree_bare is the same tree after picking (no fruit, a little duller). stump is the cut trunk with rings on its top face (48 x 48 frame, no sway). dead_tree has no leaves; tree_cursed is twisted and blighted; fir_snow carries snow on its boughs; tree_swamp and mangrove stand in wet ground with visible roots.` },
    { n: 3, title: "Small plants and ground cover", body: `Your job: bushes, grasses, flowers, crops and water plants, all in 48 x 48 frames. Most lie low under people: keep them calm and low-contrast. Grasses, reeds, crops and flowers get frames 1-3 sway (a gentle ripple); bushes barely move (1 px).
${["berry_bush", "berry_bush_bare", "bush", "desert_shrub", "snow_bush", "cactus", "cactus_tall", "grass_tuft", "reeds", "flowers", "flowers_purple", "flowers_blue", "flowers_white", "fern", "lichen", "wild_grain", "wheat_wild", "lily_pad"].map(objLine).join("\n")}
Notes: berry_bush carries red berries; berry_bush_bare is the same bush picked. lily_pad floats on water (drawn over a water tile, transparent elsewhere). cactus_tall is taller than a person (48 x 96 frame if needed).` },
    { n: 4, title: "Stone, ore, crystals and ruins", body: `Your job: rocks and minerals and the remains of old buildings. Frames 48 x 48 unless the shape needs 96 x 96. Show clear top, south and east faces on every rock.
${["rocks_small", "gravel", "granite_boulder", "ironstone", "copper_outcrop", "gold_outcrop", "crystal", "crystal_small", "bones_pile", "rubble", "rubble_pillar"].map(objLine).join("\n")}
Notes: ironstone shows rust-streaked dark rock, copper_outcrop green-stained rock, gold_outcrop quartz with gold flecks; crystal and crystal_small get 2 extra frames of a faint glint. Quarrying or mining leaves rocks_small (loose stones), which people then pick up.` },
    { n: 5, title: "Buildings, camp and workshops", body: `Your job: everything people build. Walls and doors: a wall is a CONNECTED SET like an RPG Maker chipset wall: pieces join to their neighbours, and (the art director's rule) the wall shows a visible face on its north side as well as its south side where the ground there is open. Deliver each wall material as a set of 20 pieces in a 4 x 5 grid, indexed by which neighbours are walls (north 1, east 2, south 4, west 8: pieces 0-15), plus 4 north-face variants (16-19) for east-west runs whose north side is open. Each piece: its cell plus the 32 px of height leaning up-left (use 96 x 96 frames with the cell at the bottom right).
${["wall_wood", "wall_stone", "door_wood", "door_stone", "floor_straw", "stockpile", "campfire", "workbench", "furnace", "smithy", "bowyer_bench", "fletcher_bench", "tanning_rack", "weapon_rack", "bridge", "farm_plot", "well"].map(objLine).join("\n")}
Animations and states: doors closed plus 3 frames opening (for east-west and north-south walls); campfire unlit, lit (4-frame flame loop with sparks), and burnt-out embers; furnace idle and working (glow loop); smithy idle and working (hammer spark loop); tanning_rack empty and with a hide stretched; weapon_rack empty and full; farm_plot as tilled soil plus 4 growth stages of a crop; well with its bucket; stockpile is a flat dashed marker on the ground (no height, low contrast); bridge is planks over water, seen from above with the lean on its side rails.` },
    { n: 6, title: "People (bodies)", body: `Your job: the bodies of all peoples, at every age. Everyone is smaller than a cell (see the scale). Frames 48 x 48 (96 x 96 only if a species does not fit). Plain undyed clothes (a simple tunic or wrap): armour, weapons and better clothes are separate layers made by another generator on exactly the same frames, so keep the body's pose and position identical to the approved human_male anchor frame by frame.
Species (${Object.keys(cat.people).filter(k => k !== "about").length}): ${Object.keys(cat.people).filter(k => k !== "about").join(", ")}, each male and female. Make species clearly different in silhouette at 32 px: elves tall and slender with pointed ears; dwarves short and broad with beards (women too, shorter); gnomes small with big noses and caps; goblins small, hunched, green-grey skin, big ears; orcs tall, heavy, tusked, grey-green; the automaton a jointed figure of wood, brass and stone with a glowing eye.
Ages: baby (carried or crawling, 10 px), child (16-20 px), teen (24-28 px), adult, elder (slightly stooped, grey hair). One sheet per species, gender and age.
${UNIT_SHEET}
Name files <species>_<gender>_<age>.png (human_male_adult.png ...).` },
    { n: 7, title: "Equipment layers (after the first body is approved)", body: `Your job: clothing, armour and held items as LAYERS drawn on transparent (magenta) frames that sit exactly on top of the approved people bodies, frame by frame, facing by facing, on the same 20-column sheet. Draw each layer against the approved human_male_adult sheet so it lines up pixel for pixel, including the work, attack and cast swings; a second pass fits the other species.
Layers:
- Clothing tiers: fiber_wrap (woven grass wrap), hide_cloak (rough animal hide), tailored (dyed tunic and trousers).
- Head: helmet_leather, helmet_iron. Torso: armor_leather, mail_iron. Legs: leggings_leather, greaves_iron. Shields: shield_wood, shield_iron (held on the arm).
- Held weapons and tools: ${items.filter(t => t.weapon).map(t => t.id).join(", ")}; a quiver of arrows on the back when a bow is held.
Name files <item id>_layer.png. The swing of each weapon must read in the attack columns (8-10) and tools in the work columns (4-6).` },
    { n: 8, title: "Animals", body: `Your job: every animal, at its true size (see the scale): most are smaller than a cell; the wild horse and the aurochs are a little larger (96 x 96 frames, standing in the bottom-right cell). Realistic animals, full detail, the up-left lean.
${["deer", "boar", "aurochs", "wild_horse", "wild_sheep", "hare", "fowl", "rat", "wolf", "jackal", "fox", "arctic_fox", "wildcat", "serpent", "hawk", "songbird", "bat"].map(spLine).join("\n")}
${UNIT_SHEET}
Notes: grazers use the work columns for running away; predators use the attack columns for a bite or pounce; fliers (hawk, songbird, bat) are drawn in the air above their cell with a flapping loop in the walk columns and a separate perched stand frame; the serpent slithers. Death frames end with the animal lying on its side: that last frame stays as the remains. Deer: stag with antlers and hind without, as two sheets.` },
    { n: 9, title: "Monsters", body: `Your job: the monsters, original designs only (no creatures from other games or tabletop products). Sizes from the scale: some are person-sized, some larger than a cell (96 x 96 frames standing in the bottom-right cell; the troll may need 96 x 144).
${["giant_spider", "troll", "bog_horror", "sand_stalker", "restless_dead", "ice_wraith"].map(spLine).join("\n")}
Designs: giant_spider a hairy cave spider the size of a large dog; troll a hulking grey-green brute with stony, mossy skin and long arms; bog_horror a shambling mass of mud, reeds and roots with a vaguely human shape; sand_stalker a low desert predator with sandy plates and long claws; restless_dead a walking skeleton in rags; ice_wraith a floating, translucent frost spirit trailing mist (use magenta for the background and the palette's pale blues for the body; no partial transparency). Avoid red bodies (the game marks hostiles with a red square under them).
${UNIT_SHEET}` },
    { n: 10, title: "Items and icons", body: `Your job: every item, twice: (1) as a ground item, small and lying on the ground in a 48 x 48 frame with the up-left lean (a log, a heap of berries, a bar of iron), placed in the lower half of the frame; (2) as an inventory icon, 32 x 32, the same object drawn a little larger and clearer for the inventory grid (the 2.5D view, readable at a glance). Deliver each item as <id>.png (ground) and <id>_icon.png (icon).
Items (${items.length}):
${items.map(itemLine).join("\n")}
Notes: a stack is one image (the game shows a count); arrows as a small bundle; food looks edible (cooked meat browned, raw meat red); tools and weapons show their material (stone heads lashed to wood, iron blades).` },
    { n: 11, title: "Faces", body: `Your job: portraits for the character sheet and conversations. Portraits are not map sprites: a head-and-shoulders bust facing slightly toward the viewer, 96 x 96 pixels, painted in pixel art at full detail in the manner of early-1990s VGA role-playing-game portraits, warm light from the upper left, a plain dark background (use magenta outside the bust area only if the frame is not filled). Same palette.
For every species (${Object.keys(cat.people).filter(k => k !== "about").join(", ")}), male and female, adult and elder: four different faces each (varied hair, beards, scars, colouring), plus for each face two moods (content, angry or afraid) as extra frames. Name files face_<species>_<gender>_<age>.png, faces side by side (96 px each), moods in the rows below.` },
    { n: 12, title: "Interface", body: `Your job: the game's screens and markers. Style: dark carved wood and aged parchment with brass fittings, readable and quiet, at full detail; not 2.5D (interface is flat).
- Window skin in RPG Maker's Window.png format (192 x 192: background, frame, cursor, arrows, text colours row).
- Inventory grid slot (36 x 36, empty and highlighted), the five equipment slots (head, weapon, shield, torso, legs) with faint outline icons, a character-sheet panel frame, a small tooltip frame.
- Conversation window: a portrait frame (96 x 96 inside) and keyword buttons (normal, hover, pressed).
- Badges: PAUSED, speed (1x, 2x, 4x, 8x), COMBAT.
- Markers on the ground: stance squares green (friendly), yellow (neutral), red (hostile), 48 x 48, drawn under a creature's feet; a selection marker (a square of iron corners) that pulses (3 frames); 15 designation marks for jobs (chop, gather, pick, quarry, mine, dismantle, build, dig, fish, hunt, haul, eat, drink, move, other), 48 x 48 each.` },
    { n: 13, title: "Effects", body: `Your job: the small animated effects that make the world move. Same palette, 2.5D where they sit in the world, magenta background, frames side by side.
- Hit flash (3 frames), blood splatter on the ground (3 sizes, small and not gory), dust puff for footsteps and work (4 frames), wood chips (chopping) and stone chips (mining), 4 frames each.
- Fire loop (6 frames) for a burning cell and a small flame (4 frames), embers, smoke puff rising (6 frames), sparks (3 frames).
- Water glint (3 frames), falling leaves and drifting pollen (4 frames each), snowflakes, rain streaks.
- Arrow in flight (8 directions), sling stone, a thrown spear.
- Spells: a hand glow (3 frames) and three spell bursts (fire, frost, healing), 6 frames each, 48 x 48 or 96 x 96.
Name files fx_<name>.png.` }
];

let md = `# Generator prompts: one per asset group (written 2026-09-19 by Claude Code)

The user's decisions behind these prompts (docs/VISION.md): V2 high-resolution 2.5D in the manner of an early-1990s VGA RPG, "fantasy realism on a small scale", one pixel density (V2 detail, 2026-09-19); V44 one coherent world at proper scale, humanoids smaller than a cell and trees and large monsters larger (the numbers below are the working scale until the user approves the scale lineup); V41/V58/V60 every creature and everything that can move is animated.

## How to use
1. Start one generator with prompt 0 and get the four anchors approved before anything else.
2. Then start one generator per group, 1 to 13 (group 7 waits for the first approved body from group 6). Each prompt is self-contained: paste the whole block.
3. Attach to every generator: the four approved anchor images, the scale lineup image, and for groups 2, 4, 5, 6, 8 and 9 the reference squares in art/u7_reference_squares/ (for projection and size only).
4. Save deliveries to art/masters/<id>.png and <id>.json. Claude Code checks each against its brief (docs/asset_briefs/) and the anchors, then wires it into the game.

`;
for (const g of GROUPS) {
    md += `## Prompt ${g.n}: ${g.title}\n\n\`\`\`text\n${STYLE}\n\nYOUR GROUP: ${g.title.toUpperCase()}\n\n${g.body}\n\`\`\`\n\n`;
}
const out = path.join(root, "docs", "handoffs", "GENERATOR_PROMPTS.md");
fs.writeFileSync(out, md);
console.log(`wrote ${out}: ${GROUPS.length} prompts, ${md.length} chars, ${md.split(/\s+/).length} words`);
