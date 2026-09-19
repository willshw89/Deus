# Generator prompts: one per asset group (rewritten 2026-09-19 by Claude Code)

The user's decisions behind these prompts (docs/VISION.md): HD pixel art in the style of Final Fantasy VI (flat top-down, no 2.5D lean), drawn at higher definition than the original; every sprite at its size against the 48 px RPG Maker grid square, with a grown person filling roughly one square and larger beings on bigger character sheets (V44); creatures move and act in eight directions, so every action is drawn in all eight facings and delivered one image per action (V3); the theme is Arthurian fantasy with science-fiction elements (V65); everything that can move is animated as frames and shows its equipment as layers (V58, V60, V61); every shipped asset is original and passes the originality check (AGENTS rule 8).

## How to use
1. Start one generator with prompt 0 and get the four anchors approved before anything else.
2. Then start one generator per group, 1 to 13 (group 7 waits for the first approved body from group 6). Each prompt is self-contained: paste the whole block.
3. Attach to every generator a few stock RPG Maker MZ sprites as a size and view reference (for example game/img/characters/People1.png, Actor1.png, Nature.png and a crop of game/img/tilesets/Outside_B.png; RPG Maker's own art is licensed for RPG Maker games and uses the same flat view), and, once approved, the four anchors.
4. Save each delivery under art/raw/ with the file name the prompt gives (art/raw/oak.png; creatures one file per action, art/raw/human_male_adult_walk.png). Claude Code reduces it with the project's tool, checks it (palette, size, originality) and wires it into the game after your approval.

## Prompt 0: Style lock (do this first, alone)

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: STYLE LOCK (DO THIS FIRST, ALONE)

Your job: the four style anchors every other generator will copy. Make them one at a time, in this order, and stop after each for approval.
- human_male: an adult human man, a settler of a small frontier band, plain undyed homespun tunic, rope belt, dark trousers, simple shoes, short brown hair. First deliver only the south stand frame (48 x 48 frame, about 46 px tall, feet on the bottom row, centred). After approval, the stand frame in all eight facings (one image, one column of eight cells: this locks the diagonal view). After that, the rest of the sheet, one action per image (see the layout below).
- oak: a mature broadleaf oak (96 x 96 frame, about 90 px wide and tall, the trunk standing upright at the bottom centre), stand frame plus 3 sway frames.
- wall_wood: one straight piece of a wooden palisade wall of vertical logs, running east to west: its top on the square and its front face one square tall below it (a 48 x 96 piece, like an RPG Maker wall).
- meadow: one 48 x 48 ground tile of meadow grass, seamless on all four sides, calm and low-contrast (people and objects stand on it).
Sheet layout for every creature. The finished sheet has 8 rows (facings south, south-west, west, north-west, north, north-east, east, south-east) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Every action has all eight facings.
Deliver it ONE ACTION PER IMAGE; the project's tool assembles the sheet. In each image the frames run left to right and the eight facings run top to bottom in the order above; every cell is the same size (192 x 192 on your canvas for a 48 x 48 creature, so a three-frame action is 576 x 1536; 384 x 384 cells for a 96 x 96 creature), and the creature stands on the same point of every cell:
- <id>_idle.png: 3 frames (stand, idle 1, idle 2)
- <id>_walk.png: 3 frames (step, pass, step)
- <id>_work.png: 3 frames (wind-up, strike, follow-through)
- <id>_carry.png: 1 frame (walking with a load held in front)
- <id>_attack.png: 3 frames (wind-up, strike, recover)
- <id>_cast.png: 3 frames (raise, release, lower; people only)
- <id>_hurt.png: 1 frame (flinching back)
- <id>_death.png: 3 frames (buckling, falling, lying still)
If one image cannot hold eight rows at full size, split it: <id>_<action>_a.png with the rows south, south-west, west, north-west and <id>_<action>_b.png with north, north-east, east, south-east. Start each creature with its idle image and wait for approval; the other actions follow.
```

## Prompt 1: Ground and water tiles

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: GROUND AND WATER TILES

Your job: every ground and water surface. Ground is flat (seen from above), seamless, calm and low-contrast, because everything else stands on it; realistic textures at full detail.
Format: each ground kind is one RPG Maker "A2" autotile block of 96 x 144 pixels (2 x 3 tiles of 48 x 48): top-left tile = a plain sample of the surface; top-right tile = the four inner corners; the lower 2 x 2 tiles = a square patch of the surface with its outer edges and corners, so the game can build every border shape. Borders between kinds are a soft natural edge (grass fraying into dirt, sand drifting onto rock), not a hard line.
Ground kinds (26): meadow (Meadow), tropical_grass (Lush grass), dry_grass (Dry grass), shrub_soil (Scrub soil), forest_floor (Leaf litter), needle_floor (Needle floor), jungle_floor (Jungle floor), tundra (Tundra), snow (Snow), ice (Ice), sand (Sand), stony (Stony ground), red_clay (Red clay), rock (Bare rock), peak_rock (Rock face), mud (Mud), swamp_mud (Swamp mud), dirt (Dirt), cursed_grass (Blighted grass), blessed_grass (Flowering grass), ash (Ash), scree (Scree), road (Packed earth), floor_wood (Plank floor), floor_stone (Flagstone floor), floor_rushes (Rush floor). Notes: peak_rock is impassable cliff rock and may show a rock face on its south edge; scree is loose broken rock; cursed_grass and blessed_grass replace meadow in evil and good regions (sickly or luminous); floor_wood, floor_stone and floor_rushes are house floors (planks, flagstones, strewn rushes) laid by people; road is packed earth; ash is burnt ground.
Water kinds (9): fresh, pond, marsh, swamp, icy, brackish, salt, deep, blighted. Each is an RPG Maker "A1" water block: the same 96 x 144 layout, three animation frames side by side (288 x 144) with small shifts of the ripples and glints; deep water darker, marsh and swamp murky with weed, icy water with floes, blighted water sickly.
Name each file by its id (meadow.png, fresh.png ...).
```

## Prompt 2: Trees and large plants

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: TREES AND LARGE PLANTS

Your job: every tree. Trees are larger than a cell: use a 96 x 96 frame (96 x 144 for very tall ones such as palm or pine if needed); the trunk stands upright at the bottom centre of the frame. The trunk blocks one cell (footprint [1, 1]).
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

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
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

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: STONE, ORE, CRYSTALS AND RUINS

Your job: rocks and minerals and the remains of old buildings. Frames 48 x 48 unless the shape needs 96 x 96. Show a lit top and a shaded front on every rock.
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

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: BUILDINGS, CAMP AND WORKSHOPS

Your job: everything people build. Walls and doors: a wall is a CONNECTED SET like an RPG Maker chipset wall: pieces join to their neighbours, and (the art director's rule) the wall shows a visible face on its north side as well as its south side where the ground there is open. Deliver each wall material as a set of 20 pieces in a 4 x 5 grid, indexed by which neighbours are walls (north 1, east 2, south 4, west 8: pieces 0-15), plus 4 north-face variants (16-19) for east-west runs whose north side is open. Each piece is 48 x 96: its top on the square and its front face one square tall below it, like an RPG Maker wall.
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
Animations and states: doors closed plus 3 frames opening (for east-west and north-south walls); campfire unlit, lit (4-frame flame loop with sparks), and burnt-out embers; furnace idle and working (glow loop); smithy idle and working (hammer spark loop); tanning_rack empty and with a hide stretched; weapon_rack empty and full; farm_plot as tilled soil plus 4 growth stages of a crop; well with its bucket; stockpile is a flat dashed marker on the ground (no height, low contrast); bridge is planks over water, seen from above with its side rails.
```

## Prompt 6: People (bodies)

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: PEOPLE (BODIES)

Your job: the bodies of all peoples, at every age. A grown person fills roughly one grid square (see the scale); larger peoples may use bigger sheets. Frames 48 x 48 (96 x 96 only if a species does not fit). Plain undyed clothes (a simple tunic or wrap): armour, weapons and better clothes are separate layers made by another generator on exactly the same frames, so keep the body's pose and position identical to the approved human_male anchor frame by frame.
Species (7): human, elf, dwarf, goblin, orc, gnome, automaton, each male and female. Make species clearly different in silhouette at this size: elves tall and slender with pointed ears; dwarves short and broad with beards (women too, shorter); gnomes small with big noses and caps; goblins small, hunched, green-grey skin, big ears; orcs tall, heavy, tusked, grey-green; the automaton a jointed figure of wood, brass and stone with a glowing eye.
Ages: baby (crawling, 14-18 px long), child (24-32 px tall), teen (36-42 px), adult (44-48 px), elder (slightly stooped, grey hair, 42-46 px). These heights are for humans, elves, orcs and the automaton; dwarves, goblins and gnomes scale down in proportion (adult 34-40 px). One sheet per species, gender and age, every action in all eight facings.
Sheet layout for every creature. The finished sheet has 8 rows (facings south, south-west, west, north-west, north, north-east, east, south-east) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Every action has all eight facings.
Deliver it ONE ACTION PER IMAGE; the project's tool assembles the sheet. In each image the frames run left to right and the eight facings run top to bottom in the order above; every cell is the same size (192 x 192 on your canvas for a 48 x 48 creature, so a three-frame action is 576 x 1536; 384 x 384 cells for a 96 x 96 creature), and the creature stands on the same point of every cell:
- <id>_idle.png: 3 frames (stand, idle 1, idle 2)
- <id>_walk.png: 3 frames (step, pass, step)
- <id>_work.png: 3 frames (wind-up, strike, follow-through)
- <id>_carry.png: 1 frame (walking with a load held in front)
- <id>_attack.png: 3 frames (wind-up, strike, recover)
- <id>_cast.png: 3 frames (raise, release, lower; people only)
- <id>_hurt.png: 1 frame (flinching back)
- <id>_death.png: 3 frames (buckling, falling, lying still)
If one image cannot hold eight rows at full size, split it: <id>_<action>_a.png with the rows south, south-west, west, north-west and <id>_<action>_b.png with north, north-east, east, south-east. Start each creature with its idle image and wait for approval; the other actions follow.
Name files <species>_<gender>_<age>_<action>.png (human_male_adult_idle.png, human_male_adult_walk.png ...).
```

## Prompt 7: Equipment layers (after the first body is approved)

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: EQUIPMENT LAYERS (AFTER THE FIRST BODY IS APPROVED)

Your job: clothing, armour and held items as LAYERS drawn on transparent (magenta) frames that sit exactly on top of the approved people bodies, frame by frame and facing by facing: all eight facings of every action, in the same one-image-per-action layout as the bodies. Draw each layer against the approved human_male_adult sheet so it lines up pixel for pixel, including the work, attack and cast swings; a second pass fits the other species.
Layers:
- Clothing tiers: fiber_wrap (woven grass wrap), hide_cloak (rough animal hide), tailored (dyed tunic and trousers).
- Head: helmet_leather, helmet_iron. Torso: armor_leather, mail_iron. Legs: leggings_leather, greaves_iron. Shields: shield_wood, shield_iron (held on the arm).
- Held weapons and tools: stone_axe, stone_knife, stone_pick, bow_short, bow_long, sling, club, spear, dagger_iron, sword_short, sword_long, axe_iron, mace; a quiver of arrows on the back when a bow is held.
Name files <item id>_layer_<action>.png (spear_layer_attack.png ...). The swing of each weapon must read in the attack images and tools in the work images, in every facing: a north-west swing is aimed north-west. Where the item passes behind the body (a sword swung across the back, a shield arm turned away), leave those pixels empty so the body shows in front.
RMMZ Asset Specs (Rule V70): Every layer is assembled into the AR-600 8-way master (<item id>_layer_<action>.png) and exported as a drop-in RPG Maker MZ 144×192 px single-character overlay sheet ($UF_Layer_<itemId>.png, 3 cols × 4 rows: Down, Left, Right, Up) with sidecar ($UF_Layer_<itemId>.json) per docs/RMMZ_ASSET_SPEC.md.
Sheet layout for every creature. The finished sheet has 8 rows (facings south, south-west, west, north-west, north, north-east, east, south-east) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Every action has all eight facings.
Deliver it ONE ACTION PER IMAGE; the project's tool assembles the sheet. In each image the frames run left to right and the eight facings run top to bottom in the order above; every cell is the same size (192 x 192 on your canvas for a 48 x 48 creature, so a three-frame action is 576 x 1536; 384 x 384 cells for a 96 x 96 creature), and the creature stands on the same point of every cell:
- <id>_idle.png: 3 frames (stand, idle 1, idle 2)
- <id>_walk.png: 3 frames (step, pass, step)
- <id>_work.png: 3 frames (wind-up, strike, follow-through)
- <id>_carry.png: 1 frame (walking with a load held in front)
- <id>_attack.png: 3 frames (wind-up, strike, recover)
- <id>_cast.png: 3 frames (raise, release, lower; people only)
- <id>_hurt.png: 1 frame (flinching back)
- <id>_death.png: 3 frames (buckling, falling, lying still)
If one image cannot hold eight rows at full size, split it: <id>_<action>_a.png with the rows south, south-west, west, north-west and <id>_<action>_b.png with north, north-east, east, south-east. Start each creature with its idle image and wait for approval; the other actions follow.
```

## Prompt 8: Animals

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: ANIMALS

Your job: every animal, at its size against the grid square (see the scale): small animals are smaller than a square, most beasts fill about one, and the wild horse and the aurochs are larger (96 x 96 frames, standing at the bottom centre). Natural-looking animals in the FF6 manner, full detail, upright in the top-down view.
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
Sheet layout for every creature. The finished sheet has 8 rows (facings south, south-west, west, north-west, north, north-east, east, south-east) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Every action has all eight facings.
Deliver it ONE ACTION PER IMAGE; the project's tool assembles the sheet. In each image the frames run left to right and the eight facings run top to bottom in the order above; every cell is the same size (192 x 192 on your canvas for a 48 x 48 creature, so a three-frame action is 576 x 1536; 384 x 384 cells for a 96 x 96 creature), and the creature stands on the same point of every cell:
- <id>_idle.png: 3 frames (stand, idle 1, idle 2)
- <id>_walk.png: 3 frames (step, pass, step)
- <id>_work.png: 3 frames (wind-up, strike, follow-through)
- <id>_carry.png: 1 frame (walking with a load held in front)
- <id>_attack.png: 3 frames (wind-up, strike, recover)
- <id>_cast.png: 3 frames (raise, release, lower; people only)
- <id>_hurt.png: 1 frame (flinching back)
- <id>_death.png: 3 frames (buckling, falling, lying still)
If one image cannot hold eight rows at full size, split it: <id>_<action>_a.png with the rows south, south-west, west, north-west and <id>_<action>_b.png with north, north-east, east, south-east. Start each creature with its idle image and wait for approval; the other actions follow.
Notes: grazers use the work columns for running away; predators use the attack columns for a bite or pounce; fliers (hawk, songbird, bat) are drawn in the air above their cell with a flapping loop in the walk columns and a separate perched stand frame; the serpent slithers. Death frames end with the animal lying on its side: that last frame stays as the remains. Deer: stag with antlers and hind without, as two sheets.
```

## Prompt 9: Monsters

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: MONSTERS

Your job: the monsters, original designs only (no creatures from other games or tabletop products). Sizes from the scale: some are person-sized, some larger than a cell (96 x 96 frames standing at the bottom centre).
- giant_spider (Giant spider, predator)
- troll (Troll, monster)
- bog_horror (Bog horror, monster)
- sand_stalker (Sand stalker, monster)
- restless_dead (Restless dead, monster)
- ice_wraith (Ice wraith, monster)
Designs: giant_spider a hairy cave spider the size of a large dog; troll a hulking grey-green brute with stony, mossy skin and long arms; bog_horror a shambling mass of mud, reeds and roots with a vaguely human shape; sand_stalker a low desert predator with sandy plates and long claws; restless_dead a walking skeleton in rags; ice_wraith a floating, translucent frost spirit trailing mist (use magenta for the background and the palette's pale blues for the body; no partial transparency). Avoid red bodies (the game marks hostiles with a red square under them).
Sheet layout for every creature. The finished sheet has 8 rows (facings south, south-west, west, north-west, north, north-east, east, south-east) and 20 columns of frames: 0 stand; 1-3 walk; 4-6 work (for animals: run or flee); 7 carry; 8-10 attack; 11-13 cast (people only; animals leave these empty); 14 hurt; 15-17 death (the last frame lying still on the ground: it stays as the remains); 18-19 idle (breathing, a weight shift or a look around). Every action has all eight facings.
Deliver it ONE ACTION PER IMAGE; the project's tool assembles the sheet. In each image the frames run left to right and the eight facings run top to bottom in the order above; every cell is the same size (192 x 192 on your canvas for a 48 x 48 creature, so a three-frame action is 576 x 1536; 384 x 384 cells for a 96 x 96 creature), and the creature stands on the same point of every cell:
- <id>_idle.png: 3 frames (stand, idle 1, idle 2)
- <id>_walk.png: 3 frames (step, pass, step)
- <id>_work.png: 3 frames (wind-up, strike, follow-through)
- <id>_carry.png: 1 frame (walking with a load held in front)
- <id>_attack.png: 3 frames (wind-up, strike, recover)
- <id>_cast.png: 3 frames (raise, release, lower; people only)
- <id>_hurt.png: 1 frame (flinching back)
- <id>_death.png: 3 frames (buckling, falling, lying still)
If one image cannot hold eight rows at full size, split it: <id>_<action>_a.png with the rows south, south-west, west, north-west and <id>_<action>_b.png with north, north-east, east, south-east. Start each creature with its idle image and wait for approval; the other actions follow.
```

## Prompt 10: Items and icons

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: ITEMS AND ICONS

Your job: every item, twice: (1) as a ground item, small and lying on the ground in a 48 x 48 frame in the same top-down view (a log, a heap of berries, a bar of iron), placed in the lower half of the frame; (2) as an inventory icon, 32 x 32, the same object drawn a little larger and clearer for the inventory grid (readable at a glance). Deliver each item as <id>.png (ground) and <id>_icon.png (icon).
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

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: FACES

Your job: portraits for the character sheet and conversations. Portraits are not map sprites: a head-and-shoulders bust facing slightly toward the viewer, 96 x 96 pixels, painted in pixel art at full detail in the manner of early-1990s VGA role-playing-game portraits, warm light from the upper left, a plain dark background (use magenta outside the bust area only if the frame is not filled). Same palette.
For every species (human, elf, dwarf, goblin, orc, gnome, automaton), male and female, adult and elder: four different faces each (varied hair, beards, scars, colouring), plus for each face two moods (content, angry or afraid) as extra frames. Name files face_<species>_<gender>_<age>.png, faces side by side (96 px each), moods in the rows below.
```

## Prompt 12: Interface

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: INTERFACE

Your job: the game's screens and markers. Style: dark carved wood and aged parchment with brass fittings, readable and quiet, at full detail; flat interface art.
- Window skin in RPG Maker's Window.png format (192 x 192: background, frame, cursor, arrows, text colours row).
- Inventory grid slot (36 x 36, empty and highlighted), the five equipment slots (head, weapon, shield, torso, legs) with faint outline icons, a character-sheet panel frame, a small tooltip frame.
- Conversation window: a portrait frame (96 x 96 inside) and keyword buttons (normal, hover, pressed).
- Badges: PAUSED, speed (1x, 2x, 4x, 8x), COMBAT.
- Markers on the ground: stance squares green (friendly), yellow (neutral), red (hostile), 48 x 48, drawn under a creature's feet; a selection marker (a square of iron corners) that pulses (3 frames); 15 designation marks for jobs (chop, gather, pick, quarry, mine, dismantle, build, dig, fish, hunt, haul, eat, drink, move, other), 48 x 48 each.
```

## Prompt 13: Effects

```text
STYLE AND RULES (the same for every image in this project)

You are making original game art for a living fantasy world seen from above: a colony simulation in which people forage, build, farm, fight and raise families, set in an Arthurian fantasy with science-fiction touches (knights, castles, chapels, the fey and the old wild, relics of a fallen star-faring past). The look is HD PIXEL ART IN THE STYLE OF FINAL FANTASY VI: the same flat top-down role-playing-game view, charming proportions (people with slightly large heads, about three heads tall), clear readable silhouettes, clean selective outlines and bright, lively cel-shaded colour, drawn at HIGHER DEFINITION than the 1994 original: more pixels and more detail per sprite.

0. Image Model (Mandatory Nano Banana, Rule V69): All art is generated using Google's Nano Banana image model (generate_image) with style and subject references attached. Never type sprites in pixel by pixel in scripts. The cleaning and assembly pipeline snaps the output to the 48 px grid and project palette.
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
9. Animation: everything that can move is animated as frames on the sheet (the game draws no motion of its own). Frames sit side by side as your group section says; creatures are delivered one image per action (see the sheet layout).
10. Eight facings for EVERY action: creatures move AND act in eight directions, so every animation (stand, idle, walk, work, carry, attack, cast, hurt, death) is drawn in all eight facings, in this row order: south (toward the viewer), south-west, west, north-west, north (back), north-east, east, south-east. A creature facing north-east chops, carries, swings, casts, flinches and falls facing north-east. The diagonal facings are true three-quarter turns (the body turned 45 degrees, one shoulder nearer the viewer, the feet pointing along the diagonal), never a copy of a straight facing. The east-side rows (north-east, east, south-east) may be mirror images of the west-side rows (north-west, west, south-west): leave those three rows empty (magenta) and the project's tool mirrors them, or draw them when the design is not symmetrical.
11. Equipment shows: what a creature holds and wears is what you see. Bodies are drawn bare-handed in plain clothes; clothing, armour, shields, tools and weapons are separate LAYER sheets on exactly the same frames, and the game stacks what the character has equipped. Every work and attack frame lines the tool or weapon up with the hand: an axe for chopping, a pick for mining and quarrying, a knife for crafting and butchering, a hammer at the smithy, a bow or spear for hunting, the equipped weapon in combat.
12. Originality: all art is your own new drawing in this style. Never trace, copy, recolour or edit existing game sprites (from FF6, RPG Maker, Ultima VII or anything else); every delivery is checked against other games' sprites and near-copies are rejected.
13. Standard RPG Maker MZ Sets (Rule V70): Deliveries adhere to the standard RMMZ asset specifications in docs/RMMZ_ASSET_SPEC.md. The cleaning pipeline packs single generations into standard RMMZ sets: 144×192 px single-character sheets ($UF_*.png), 144×192 px equipment layer sheets ($UF_Layer_<itemId>.png), 768×576 px autotiles (A1–A4), 768×768 px object sheets (B–E), and 576×288 px face sets.
14. Delivery, for every asset:
   - The 4× PNG named as your section says (<id>.png for things; <id>_<action>.png for creatures, one image per action), with the ids listed in your section. The art director reduces it with the project's tool and checks it.
   - One line per image: what you drew and the states, frames and facings in it.
   - Deliver your FIRST asset alone and wait for the art director's approval. Then work in batches of three to five, each checked before the next.

YOUR GROUP: EFFECTS

Your job: the small animated effects that make the world move. Same palette, in the world's top-down view, magenta background, frames side by side.
- Hit flash (3 frames), blood splatter on the ground (3 sizes, small and not gory), dust puff for footsteps and work (4 frames), wood chips (chopping) and stone chips (mining), 4 frames each.
- Fire loop (6 frames) for a burning cell and a small flame (4 frames), embers, smoke puff rising (6 frames), sparks (3 frames).
- Water glint (3 frames), falling leaves and drifting pollen (4 frames each), snowflakes, rain streaks.
- Missiles in eight directions (one image each, the eight directions as rows in the facing order south, south-west, west, north-west, north, north-east, east, south-east): an arrow in flight (2 frames), a thrown spear (2 frames); a sling stone is round (2 frames of spin, one row).
- Spells: a hand glow (3 frames); a fire bolt and a frost bolt in flight, each in the eight directions (3 frames); three spell bursts (fire, frost, healing), 6 frames each, 48 x 48 or 96 x 96.
Name files fx_<name>.png.
```

