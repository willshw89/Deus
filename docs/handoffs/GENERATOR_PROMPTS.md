# Generator prompts: one per asset group (written 2026-09-19 by Claude Code)

The user's decisions behind these prompts (docs/VISION.md): V2 high-resolution 2.5D in the manner of an early-1990s VGA RPG, "fantasy realism on a small scale", one pixel density (V2 detail, 2026-09-19); V44 one coherent world at proper scale, humanoids smaller than a cell and trees and large monsters larger (the numbers below are the working scale until the user approves the scale lineup); V41/V58/V60 every creature and everything that can move is animated.

## How to use
1. Start one generator with prompt 0 and get the four anchors approved before anything else.
2. Then start one generator per group, 1 to 13 (group 7 waits for the first approved body from group 6). Each prompt is self-contained: paste the whole block.
3. Attach to every generator: the four approved anchor images, the scale lineup image, and for groups 2, 4, 5, 6, 8 and 9 the reference squares in art/u7_reference_squares/ (for projection and size only).
4. Save deliveries to art/masters/<id>.png and <id>.json. Claude Code checks each against its brief (docs/asset_briefs/) and the anchors, then wires it into the game.

## Prompt 0: Style lock (do this first, alone)

```text
STYLE AND RULES (the same for every image in this project)

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

YOUR GROUP: FACES

Your job: portraits for the character sheet and conversations. Portraits are not map sprites: a head-and-shoulders bust facing slightly toward the viewer, 96 x 96 pixels, painted in pixel art at full detail in the manner of early-1990s VGA role-playing-game portraits, warm light from the upper left, a plain dark background (use magenta outside the bust area only if the frame is not filled). Same palette.
For every species (human, elf, dwarf, goblin, orc, gnome, automaton), male and female, adult and elder: four different faces each (varied hair, beards, scars, colouring), plus for each face two moods (content, angry or afraid) as extra frames. Name files face_<species>_<gender>_<age>.png, faces side by side (96 px each), moods in the rows below.
```

## Prompt 12: Interface

```text
STYLE AND RULES (the same for every image in this project)

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

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
  Foliage greens: #86D200 #86B200 #7D9600 #7DDF7D #45B645 #189218 #006D00 #046D00 #005100 #003500 #001800 #71864D
  Neutral greys (stone, iron): #EFEFEF #DFDFDF #CECECE #BEBEBE #AEAEAE #9E9E9E #8E8E8E #7D7D7D #6D6D6D #616161 #515151 #454545 #353535 #242424 #181818 #080808 #FFFFFF
  Warm greys (slate, ash, dark stone): #EFEBE7 #DFD7D2 #CEC6BE #514945 #453D39 #35312D #242020 #181414 #352D24 #181010 #100C08
  Browns (bark, hair, leather, fur): #B28210 #9E690C #8A5508 #754504 #613100 #4D2400 #9A7141 #8A5D2D #7D4D18 #6D3D0C #5D350C #4D2D0C #3D240C #2D1C08 #201408
  Linen, straw, rope, sand: #FBF3CE #F7E7A6 #F3DF79 #EBE3D7 #DBCAB2 #CAB292 #BA9A71 #AA8659
  Skin: #FFDFBA #E3C2B2 #D2A692 #C68E75 #AE7D65 #9A6D59 #825D4D #6D4D3D
  Cloth darks (trousers, slate): #553D31 #3D2D24 #281C14
  Reds (berries, apples, blood): #FF394D #FF1C35 #DF1428 #C20C1C #A60814 #8A040C #6D0004 #510000
  Oranges and fire: #FF9E3D #FF8E1C #FF7D00 #E36D00 #C26100 #A65100 #FF8E10 #FF5100 #CA3900
  Golds and yellows: #EFD251 #EFCA28 #DBAE20 #C69618 #FFEF41 #FFC228 #FFFF00 #FFD200 #FFAE00
  Rust and copper: #CE9A7D #BE825D #AE653D #9E5124 #8E3D0C #7D2D00
  Blues (water, ice, magic): #BABAFF #7D7DFF #5D5DFF #3D3DFF #0000FF #0000C2 #000035
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
   - For each asset, add one line on what you drew and which states and frames the sheet holds.

YOUR GROUP: EFFECTS

Your job: the small animated effects that make the world move. Same palette, 2.5D where they sit in the world, magenta background, frames side by side.
- Hit flash (3 frames), blood splatter on the ground (3 sizes, small and not gory), dust puff for footsteps and work (4 frames), wood chips (chopping) and stone chips (mining), 4 frames each.
- Fire loop (6 frames) for a burning cell and a small flame (4 frames), embers, smoke puff rising (6 frames), sparks (3 frames).
- Water glint (3 frames), falling leaves and drifting pollen (4 frames each), snowflakes, rain streaks.
- Arrow in flight (8 directions), sling stone, a thrown spear.
- Spells: a hand glow (3 frames) and three spell bursts (fire, frost, healing), 6 frames each, 48 x 48 or 96 x 96.
Name files fx_<name>.png.
```

