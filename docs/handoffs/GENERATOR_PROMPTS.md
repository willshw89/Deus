# Generator prompts: one per asset group (rewritten 2026-09-19 midday by Claude Code)

The user's decisions behind these prompts (docs/VISION.md, AGENTS.md rule 8): copy the style of the old game while making higher-quality sprites (V2: higher definition than the old game, fantasy realism on a small scale); every sprite at its true size against the RPG Maker grid square (V44: people smaller than a square, trees and large monsters larger); the old game's art may be used as style reference and training data, but everything that ships is original and passes the originality check; everything that can move is animated and shows its equipment (V58, V60, V61).

## How to use
1. Start one generator with prompt 0 and get the four anchors approved before anything else.
2. Then start one generator per group, 1 to 13 (group 7 waits for the first approved body from group 6). Each prompt is self-contained: paste the whole block.
3. Attach to every generator 3–6 reference sprites from the old game at its native proportions: the U7_ stand-ins in game/img/characters (for example $U7_Townsman.png, $U7_Deer.png, $U7_Wolf.png, !$TimberOak.png, !$GraniteBoulder.png, !$Campfire.png; they are the old game's sprites at 3x, so their sizes relative to each other are right), and, once approved, the four anchors and the scale lineup (game/test_output/scale_A_lineup.png).
4. Save each delivery as art/raw/<id>.png. Claude Code reduces it with tools/make_25d.js, checks it with tools/art_check.js and tools/originality_check.js, and wires it into the game after your approval.

## Prompt 0: Style lock (do this first, alone)

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: STYLE LOCK (DO THIS FIRST, ALONE)

Your job: the four style anchors every other generator will copy. Make them one at a time, in this order, and stop after each for approval.
- human_male: an adult human man, a settler of a small frontier band, plain undyed homespun tunic, rope belt, dark trousers, simple shoes, short brown hair. First deliver only the south stand frame (48 x 48 frame, 32 px tall, feet at the bottom right of the frame's centre). After approval, the full sheet (see the layout below).
- oak: a mature broadleaf oak (96 x 96 frame, about 70 by 70 px, trunk base in the bottom-right cell, crown leaning up-left), stand frame plus 3 sway frames.
- wall_wood: one straight piece of a wooden palisade wall of vertical logs, running east to west: top face, south face and the lean; 48 px wide, rising 32 px.
- meadow: one 48 x 48 ground tile of meadow grass, seamless on all four sides, calm and low-contrast (people and objects stand on it), flat (ground has no lean).
Sheet layout for every creature: 4 rows (facings south, west, east, north) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Name the columns in the sidecar's "animations".
```

## Prompt 1: Ground and water tiles

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: GROUND AND WATER TILES

Your job: every ground and water surface. Ground is flat (seen from above, no lean), seamless, calm and low-contrast, because everything else stands on it; realistic textures at full detail.
Format: each ground kind is one RPG Maker "A2" autotile block of 96 x 144 pixels (2 x 3 tiles of 48 x 48): top-left tile = a plain sample of the surface; top-right tile = the four inner corners; the lower 2 x 2 tiles = a square patch of the surface with its outer edges and corners, so the game can build every border shape. Borders between kinds are a soft natural edge (grass fraying into dirt, sand drifting onto rock), not a hard line.
Ground kinds (26): meadow (Meadow), tropical_grass (Lush grass), dry_grass (Dry grass), shrub_soil (Scrub soil), forest_floor (Leaf litter), needle_floor (Needle floor), jungle_floor (Jungle floor), tundra (Tundra), snow (Snow), ice (Ice), sand (Sand), stony (Stony ground), red_clay (Red clay), rock (Bare rock), peak_rock (Rock face), mud (Mud), swamp_mud (Swamp mud), dirt (Dirt), cursed_grass (Blighted grass), blessed_grass (Flowering grass), ash (Ash), scree (Scree), road (Packed earth), floor_wood (Plank floor), floor_stone (Flagstone floor), floor_rushes (Rush floor). Notes: peak_rock is impassable cliff rock and may show rock faces with the lean on its south and east edges; scree is loose broken rock; cursed_grass and blessed_grass replace meadow in evil and good regions (sickly or luminous); floor_wood, floor_stone and floor_rushes are house floors (planks, flagstones, strewn rushes) laid by people; road is packed earth; ash is burnt ground.
Water kinds (9): fresh, pond, marsh, swamp, icy, brackish, salt, deep, blighted. Each is an RPG Maker "A1" water block: the same 96 x 144 layout, three animation frames side by side (288 x 144) with small shifts of the ripples and glints; deep water darker, marsh and swamp murky with weed, icy water with floes, blighted water sickly.
Name each file by its id (meadow.png, fresh.png ...).
```

## Prompt 2: Trees and large plants

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: TREES AND LARGE PLANTS

Your job: every tree. Trees are larger than a cell: use a 96 x 96 frame (96 x 144 for very tall ones such as palm or pine if needed); the trunk stands in the frame's bottom-right cell and the tree leans up-left. The trunk blocks one cell (footprint [1, 1]).
Each tree sheet: frame 0 stand, frames 1-3 sway (the crown moves 1-2 px, leaves shimmer). Felling a tree leaves a separate stump asset.
- oak (Oak). chop turns it into stump.
- birch (Birch). chop turns it into stump.
- pine (Pine). chop turns it into stump.
- fir_snow (Snow fir). chop turns it into stump.
- fruit_tree (Fruit tree). gather turns it into fruit_tree_bare; chop turns it into stump.
- fruit_tree_bare (Fruit tree (picked)). chop turns it into stump; it regrows into fruit_tree.
- tree_savanna (Flat-top tree). chop turns it into stump.
- tree_swamp (Swamp tree). chop turns it into stump.
- mangrove (Mangrove). chop turns it into stump.
- tree_tropical (Broadleaf giant). chop turns it into stump.
- palm (Palm). chop turns it into stump.
- dead_tree (Dead tree). chop turns it into stump.
- tree_cursed (Blighted tree). chop turns it into stump.
- stump (Stump). chop turns it into nothing (it is removed).
Notes: fruit_tree carries visible fruit; fruit_tree_bare is the same tree after picking (no fruit, a little duller). stump is the cut trunk with rings on its top face (48 x 48 frame, no sway). dead_tree has no leaves; tree_cursed is twisted and blighted; fir_snow carries snow on its boughs; tree_swamp and mangrove stand in wet ground with visible roots.
```

## Prompt 3: Small plants and ground cover

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: SMALL PLANTS AND GROUND COVER

Your job: bushes, grasses, flowers, crops and water plants, all in 48 x 48 frames. Most lie low under people: keep them calm and low-contrast. Grasses, reeds, crops and flowers get frames 1-3 sway (a gentle ripple); bushes barely move (1 px).
- berry_bush (Berry bush). gather turns it into berry_bush_bare.
- berry_bush_bare (Berry bush (picked)). it regrows into berry_bush.
- bush (Shrub). gather turns it into nothing (it is removed).
- desert_shrub (Desert shrub). gather turns it into nothing (it is removed).
- snow_bush (Snow bush). gather turns it into nothing (it is removed).
- cactus (Cactus). gather turns it into nothing (it is removed).
- cactus_tall (Tall cactus). chop turns it into nothing (it is removed).
- grass_tuft (Tall grass). Lies low under people, drawn calm. gather turns it into nothing (it is removed).
- reeds (Reeds). Lies low under people, drawn calm. gather turns it into nothing (it is removed).
- flowers (Wildflowers). Lies low under people, drawn calm.
- flowers_purple (Purple flowers). Lies low under people, drawn calm.
- flowers_blue (Blue flowers). Lies low under people, drawn calm.
- flowers_white (White flowers). Lies low under people, drawn calm.
- fern (Fern). Lies low under people, drawn calm. gather turns it into nothing (it is removed).
- lichen (Lichen). Lies low under people, drawn calm.
- wild_grain (Wild grain). Lies low under people, drawn calm. gather turns it into nothing (it is removed).
- wheat_wild (Wild wheat). Lies low under people, drawn calm. gather turns it into nothing (it is removed).
- lily_pad (Lily pads). Lies low under people, drawn calm.
Notes: berry_bush carries red berries; berry_bush_bare is the same bush picked. lily_pad floats on water (drawn over a water tile, transparent elsewhere). cactus_tall is taller than a person (48 x 96 frame if needed).
```

## Prompt 4: Stone, ore, crystals and ruins

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: STONE, ORE, CRYSTALS AND RUINS

Your job: rocks and minerals and the remains of old buildings. Frames 48 x 48 unless the shape needs 96 x 96. Show clear top, south and east faces on every rock.
- rocks_small (Loose stones). Lies low under people, drawn calm. pick turns it into nothing (it is removed).
- gravel (Gravel). Lies low under people, drawn calm. pick turns it into nothing (it is removed).
- granite_boulder (Granite boulder). quarry turns it into rocks_small.
- ironstone (Ironstone outcrop). mine turns it into rocks_small.
- copper_outcrop (Copper outcrop). mine turns it into rocks_small.
- gold_outcrop (Gold outcrop). mine turns it into rocks_small.
- crystal (Crystal cluster). mine turns it into crystal_small.
- crystal_small (Small crystals). Lies low under people, drawn calm. pick turns it into nothing (it is removed).
- bones_pile (Old bones). Lies low under people, drawn calm. pick turns it into nothing (it is removed).
- rubble (Rubble). Lies low under people, drawn calm. pick turns it into nothing (it is removed).
- rubble_pillar (Fallen pillar). quarry turns it into nothing (it is removed).
Notes: ironstone shows rust-streaked dark rock, copper_outcrop green-stained rock, gold_outcrop quartz with gold flecks; crystal and crystal_small get 2 extra frames of a faint glint. Quarrying or mining leaves rocks_small (loose stones), which people then pick up.
```

## Prompt 5: Buildings, camp and workshops

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: BUILDINGS, CAMP AND WORKSHOPS

Your job: everything people build. Walls and doors: a wall is a CONNECTED SET like an RPG Maker chipset wall: pieces join to their neighbours, and (the art director's rule) the wall shows a visible face on its north side as well as its south side where the ground there is open. Deliver each wall material as a set of 20 pieces in a 4 x 5 grid, indexed by which neighbours are walls (north 1, east 2, south 4, west 8: pieces 0-15), plus 4 north-face variants (16-19) for east-west runs whose north side is open. Each piece: its cell plus the 32 px of height leaning up-left (use 96 x 96 frames with the cell at the bottom right).
- wall_wood (Wooden wall). chop turns it into nothing (it is removed); it is built by people; when ruined it becomes rubble.
- wall_stone (Stone wall). quarry turns it into rubble; it is built by people; when ruined it becomes rubble.
- door_wood (Wooden door). it is built by people; when ruined it becomes rubble.
- door_stone (Stone door). it is built by people; when ruined it becomes rubble.
- floor_straw (Straw bed). Lies low under people, drawn calm. it is built by people.
- stockpile (Stockpile). Lies low under people, drawn calm. it is built by people.
- campfire (Campfire). it is built by people; when ruined it becomes bones_pile.
- workbench (Work stone). it is built by people; when ruined it becomes rubble.
- furnace (Furnace). it is built by people; when ruined it becomes rubble.
- smithy (Smithy). it is built by people; when ruined it becomes rubble.
- bowyer_bench (Bowyer's bench). it is built by people; when ruined it becomes rubble.
- fletcher_bench (Fletcher's bench). it is built by people; when ruined it becomes rubble.
- tanning_rack (Tanning rack). it is built by people; when ruined it becomes rubble.
- weapon_rack (Weapon rack). it is built by people; when ruined it becomes rubble.
- bridge (Plank bridge). Lies low under people, drawn calm.
- farm_plot (Farm plot). Lies low under people, drawn calm.
- well (Well).
Animations and states: doors closed plus 3 frames opening (for east-west and north-south walls); campfire unlit, lit (4-frame flame loop with sparks), and burnt-out embers; furnace idle and working (glow loop); smithy idle and working (hammer spark loop); tanning_rack empty and with a hide stretched; weapon_rack empty and full; farm_plot as tilled soil plus 4 growth stages of a crop; well with its bucket; stockpile is a flat dashed marker on the ground (no height, low contrast); bridge is planks over water, seen from above with the lean on its side rails.
```

## Prompt 6: People (bodies)

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: PEOPLE (BODIES)

Your job: the bodies of all peoples, at every age. Everyone is smaller than a cell (see the scale). Frames 48 x 48 (96 x 96 only if a species does not fit). Plain undyed clothes (a simple tunic or wrap): armour, weapons and better clothes are separate layers made by another generator on exactly the same frames, so keep the body's pose and position identical to the approved human_male anchor frame by frame.
Species (7): human, elf, dwarf, goblin, orc, gnome, automaton, each male and female. Make species clearly different in silhouette at 32 px: elves tall and slender with pointed ears; dwarves short and broad with beards (women too, shorter); gnomes small with big noses and caps; goblins small, hunched, green-grey skin, big ears; orcs tall, heavy, tusked, grey-green; the automaton a jointed figure of wood, brass and stone with a glowing eye.
Ages: baby (carried or crawling, 10 px), child (16-20 px), teen (24-28 px), adult, elder (slightly stooped, grey hair). One sheet per species, gender and age.
Sheet layout for every creature: 4 rows (facings south, west, east, north) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Name the columns in the sidecar's "animations".
Name files <species>_<gender>_<age>.png (human_male_adult.png ...).
```

## Prompt 7: Equipment layers (after the first body is approved)

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: EQUIPMENT LAYERS (AFTER THE FIRST BODY IS APPROVED)

Your job: clothing, armour and held items as LAYERS drawn on transparent (magenta) frames that sit exactly on top of the approved people bodies, frame by frame, facing by facing, on the same 20-column sheet. Draw each layer against the approved human_male_adult sheet so it lines up pixel for pixel, including the work, attack and cast swings; a second pass fits the other species.
Layers:
- Clothing tiers: fiber_wrap (woven grass wrap), hide_cloak (rough animal hide), tailored (dyed tunic and trousers).
- Head: helmet_leather, helmet_iron. Torso: armor_leather, mail_iron. Legs: leggings_leather, greaves_iron. Shields: shield_wood, shield_iron (held on the arm).
- Held weapons and tools: stone_axe, stone_knife, stone_pick, bow_short, bow_long, sling, club, spear, dagger_iron, sword_short, sword_long, axe_iron, mace; a quiver of arrows on the back when a bow is held.
Name files <item id>_layer.png. The swing of each weapon must read in the attack columns (8-10) and tools in the work columns (4-6).
```

## Prompt 8: Animals

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: ANIMALS

Your job: every animal, at its true size (see the scale): most are smaller than a cell; the wild horse and the aurochs are a little larger (96 x 96 frames, standing in the bottom-right cell). Realistic animals, full detail, the up-left lean.
- deer (Deer, grazer)
- boar (Boar, grazer)
- aurochs (Aurochs, grazer)
- wild_horse (Wild horse, grazer)
- wild_sheep (Wild sheep, grazer)
- hare (Hare, grazer)
- fowl (Wild fowl, grazer)
- rat (Rat, vermin)
- wolf (Wolf, predator)
- jackal (Jackal, predator)
- fox (Fox, predator)
- arctic_fox (Arctic fox, predator)
- wildcat (Wildcat, predator)
- serpent (Serpent, predator)
- hawk (Hawk, flier)
- songbird (Songbird, flier)
- bat (Bat, flier)
Sheet layout for every creature: 4 rows (facings south, west, east, north) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Name the columns in the sidecar's "animations".
Notes: grazers use the work columns for running away; predators use the attack columns for a bite or pounce; fliers (hawk, songbird, bat) are drawn in the air above their cell with a flapping loop in the walk columns and a separate perched stand frame; the serpent slithers. Death frames end with the animal lying on its side: that last frame stays as the remains. Deer: stag with antlers and hind without, as two sheets.
```

## Prompt 9: Monsters

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: MONSTERS

Your job: the monsters, original designs only (no creatures from other games or tabletop products). Sizes from the scale: some are person-sized, some larger than a cell (96 x 96 frames standing in the bottom-right cell; the troll may need 96 x 144).
- giant_spider (Giant spider, predator)
- troll (Troll, monster)
- bog_horror (Bog horror, monster)
- sand_stalker (Sand stalker, monster)
- restless_dead (Restless dead, monster)
- ice_wraith (Ice wraith, monster)
Designs: giant_spider a hairy cave spider the size of a large dog; troll a hulking grey-green brute with stony, mossy skin and long arms; bog_horror a shambling mass of mud, reeds and roots with a vaguely human shape; sand_stalker a low desert predator with sandy plates and long claws; restless_dead a walking skeleton in rags; ice_wraith a floating, translucent frost spirit trailing mist (use magenta for the background and the palette's pale blues for the body; no partial transparency). Avoid red bodies (the game marks hostiles with a red square under them).
Sheet layout for every creature: 4 rows (facings south, west, east, north) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Name the columns in the sidecar's "animations".
```

## Prompt 10: Items and icons

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: ITEMS AND ICONS

Your job: every item, twice: (1) as a ground item, small and lying on the ground in a 48 x 48 frame with the up-left lean (a log, a heap of berries, a bar of iron), placed in the lower half of the frame; (2) as an inventory icon, 32 x 32, the same object drawn a little larger and clearer for the inventory grid (the 2.5D view, readable at a glance). Deliver each item as <id>.png (ground) and <id>_icon.png (icon).
Items (50):
- log (Log)
- firewood (Firewood)
- stone (Stone)
- ore_iron (Iron ore)
- ore_copper (Copper ore)
- gold (Gold nugget)
- gem_rough (Rough gem)
- gem_cut (Cut gem)
- bar_iron (Iron bar)
- berries (Berries)
- fruit (Fruit)
- mushroom (Mushrooms)
- root (Root vegetable)
- seeds (Seeds)
- fiber (Plant fiber)
- straw (Straw)
- meat_raw (Raw meat)
- meat_cooked (Cooked meat)
- fish (Fish)
- hide (Hide)
- bone (Bone)
- wool (Wool)
- stone_axe (Stone axe): weapon
- stone_knife (Stone knife): weapon
- stone_pick (Stone pick): weapon
- fiber_wrap (Woven wrap): armour
- hide_cloak (Hide cloak): armour
- charcoal (Charcoal)
- bar_copper (Copper bar)
- feathers (Feathers)
- leather (Leather)
- arrows (Arrows): ammunition
- bow_short (Short bow): weapon
- bow_long (Long bow): weapon
- sling (Sling): weapon
- club (Club): weapon
- spear (Spear): weapon
- dagger_iron (Iron dagger): weapon
- sword_short (Short sword): weapon
- sword_long (Long sword): weapon
- axe_iron (Iron axe): weapon
- mace (Copper mace): weapon
- helmet_leather (Leather cap): armour
- helmet_iron (Iron helmet): armour
- armor_leather (Leather armor): armour
- mail_iron (Iron mail): armour
- leggings_leather (Leather leggings): armour
- greaves_iron (Iron greaves): armour
- shield_wood (Wooden shield): shield
- shield_iron (Iron shield): shield
Notes: a stack is one image (the game shows a count); arrows as a small bundle; food looks edible (cooked meat browned, raw meat red); tools and weapons show their material (stone heads lashed to wood, iron blades).
```

## Prompt 11: Faces

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: FACES

Your job: portraits for the character sheet and conversations. Portraits are not map sprites: a head-and-shoulders bust facing slightly toward the viewer, 96 x 96 pixels, painted in pixel art at full detail in the manner of early-1990s VGA role-playing-game portraits, warm light from the upper left, a plain dark background (use magenta outside the bust area only if the frame is not filled). Same palette.
For every species (human, elf, dwarf, goblin, orc, gnome, automaton), male and female, adult and elder: four different faces each (varied hair, beards, scars, colouring), plus for each face two moods (content, angry or afraid) as extra frames. Name files face_<species>_<gender>_<age>.png, faces side by side (96 px each), moods in the rows below.
```

## Prompt 12: Interface

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: INTERFACE

Your job: the game's screens and markers. Style: dark carved wood and aged parchment with brass fittings, readable and quiet, at full detail; not 2.5D (interface is flat).
- Window skin in RPG Maker's Window.png format (192 x 192: background, frame, cursor, arrows, text colours row).
- Inventory grid slot (36 x 36, empty and highlighted), the five equipment slots (head, weapon, shield, torso, legs) with faint outline icons, a character-sheet panel frame, a small tooltip frame.
- Conversation window: a portrait frame (96 x 96 inside) and keyword buttons (normal, hover, pressed).
- Badges: PAUSED, speed (1x, 2x, 4x, 8x), COMBAT.
- Markers on the ground: stance squares green (friendly), yellow (neutral), red (hostile), 48 x 48, drawn under a creature's feet; a selection marker (a square of iron corners) that pulses (3 frames); 15 designation marks for jobs (chop, gather, pick, quarry, mine, dismantle, build, dig, fish, hunt, haul, eat, drink, move, other), 48 x 48 each.
```

## Prompt 13: Effects

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families. The target look is the style of the 1992 VGA role-playing game ULTIMA VII (attached reference sprites show it), made at HIGHER DEFINITION than that game: the same projection, light, palette feel and rendering, with more detail per object. The art director calls it "fantasy realism on a small scale".

1. Copy the style, never the pictures. Study the attached reference sprites for the projection, the lean, the light, the colours and the rendering. Every image you deliver is your own new drawing: never trace, copy, recolour, crop, rearrange or paint over a reference. Every delivery is checked automatically against that game's sprites, and near-copies are rejected.
2. The projection is a SHEAR, not a rotation. This is the most important rule:
   - The ground is a square grid seen from straight above.
   - Anything with height is drawn upright and then pushed: each row of pixels higher above the ground is shifted one pixel further to the LEFT. The vertical axis of every standing thing therefore runs diagonally up and to the left at 45 degrees.
   - Horizontal lines stay horizontal: a person's shoulders, belt and feet stay level; a table top stays level; a wall's top edge stays level. The figure is standing, NOT tilted, NOT rotated, NOT lying down, NOT falling.
   - You see the top, the south (front) face and the east (right) face of things, never the north or west faces. A tall thing touches the ground at the bottom right of its drawing; its top is up and to the left.
   - It is not isometric: no diamond-shaped ground, no 30-degree angles.
   - Check each drawing: cover it with a horizontal ruler at the shoulders and at the feet: both edges must be level. If they slope, it is rotated: redraw it.
3. Light from the upper left. Top faces lightest, south faces mid-tone, east faces darkest. Fine 1-pixel shading with dithering between tones, as in the references, but more of it: finer folds, bark, fur, stone grain and metal glints.
4. Scale against the RPG Maker grid square. The game's map is a grid of RPG Maker squares of 48 × 48 screen pixels (about 2.5–3 metres). Every sprite is drawn at its true size compared with that square, so the world is coherent:
   | Thing | Final size | Share of one grid square |
   | Grown human | 32 px tall | two thirds of a square tall |
   | Elf / orc / automaton | 34 / 36 / 34 px | a little over two thirds |
   | Dwarf / goblin / gnome | 26 / 24 / 22 px | about half |
   | Child | 16–24 px | a third to a half |
   | Hare, rat, songbird | 8–10 px long | a fifth |
   | Fowl, bat, hawk | 12–18 px | a quarter to a third |
   | Fox, wildcat, jackal | 18–22 px long | under half |
   | Wolf | 28 px long, 20 tall | about half |
   | Boar, sheep | 26–30 px long, 20 tall | about half |
   | Deer | 34 px long, 32 tall with antlers | two thirds |
   | Wild horse, aurochs | 50–52 px long, 36–40 tall | a little over one square |
   | Restless dead, giant spider | 32 px tall, 40 px wide | two thirds to one square |
   | Ice wraith, sand stalker, bog horror | 44–56 px | about one square |
   | Troll | 64 px tall | one and a third squares |
   | Oak | 70 × 70 px | one and a half squares |
   | Pine, birch, palm | 44–56 wide, 64–72 tall | one and a half squares tall |
   | Stump, bush | 24 × 18, 26 × 20 | half a square |
   | Tall grass, reeds, flowers | 8–26 px | a fifth to half |
   | Boulder, ore outcrop | 40 × 32 px | most of a square |
   | Loose stones, items on the ground | 8–22 px | a fifth to half |
   | Campfire | 30 wide, flame 24 tall | two thirds |
   | Straw bed, work stone | 30–34 × 18–20 | two thirds wide |
   | Furnace, well | 36–44 wide, 40–48 tall | about one square |
   | Wall piece | fills its square and rises 32 px | one square plus its height |
5. Canvas: work at 4× so the detail is clean: every final pixel is a 4 × 4 block on your canvas, so ONE GRID SQUARE IS 192 × 192 pixels on your canvas and a grown human is 128 px tall. Keep the blocks even and crisp (no blur, no soft edges, no half-blocks). The project's tool reduces your image by 4 and snaps it to the palette.
6. Frames: a thing that fits inside one square is drawn inside one 192 × 192 square of your canvas (48 × 48 final). A larger thing uses a 384 × 384 canvas (96 × 96 final; 384 × 576 for very tall things) in which the square it stands on is the BOTTOM-RIGHT 192 × 192, and the rest leans up and left from it. Never crop a shape to make it fit.
7. Colours: the earthy VGA daylight palette of the references (the tool snaps every colour to the project palette, so stay close to the reference colours). Outline: a dark selective line only on the lower and right edges of a silhouette; lit upper-left edges have no outline.
8. Background: flat magenta #FF00FF, one subject per image, centred on its square. No ground shadows (the game draws them), no text, no borders, no grid lines, no watermarks.
9. Animation: everything that can move is animated. Frames of one asset sit side by side on one sheet as your group section says.
10. Facings: creatures have four facings in this row order: south (toward the viewer), west, east, north (back). Draw each one; west and east are not mirror images, because the lean always goes up and to the left.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. If your drawings keep coming out tilted or rotated, switch: draw the thing flat and upright (the ordinary 3/4 top-down RPG view, nothing leaning) and say so; the project's tool then adds the lean mechanically.
13. Delivery, for every asset:
   - The 4× PNG (or sheet) named <id>.png, with the ids listed in your section. The art director reduces it with tools/make_25d.js and checks it.
   - One line per asset: what you drew, the states and frames on the sheet, and whether it is drawn with the lean or flat (rule 12).
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: EFFECTS

Your job: the small animated effects that make the world move. Same palette, 2.5D where they sit in the world, magenta background, frames side by side.
- Hit flash (3 frames), blood splatter on the ground (3 sizes, small and not gory), dust puff for footsteps and work (4 frames), wood chips (chopping) and stone chips (mining), 4 frames each.
- Fire loop (6 frames) for a burning cell and a small flame (4 frames), embers, smoke puff rising (6 frames), sparks (3 frames).
- Water glint (3 frames), falling leaves and drifting pollen (4 frames each), snowflakes, rain streaks.
- Arrow in flight (8 directions), sling stone, a thrown spear.
- Spells: a hand glow (3 frames) and three spell bursts (fire, frost, healing), 6 frames each, 48 x 48 or 96 x 96.
Name files fx_<name>.png.
```

