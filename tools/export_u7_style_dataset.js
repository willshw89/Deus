'use strict';
// tools/export_u7_style_dataset.js
//
// Exports a CURATED set of Ultima VII shapes as a style-training dataset for the art
// generators (VISION V9 and AGENTS rule 8, revised by the user 2026-09-19: U7 art may be
// used as style references and training data; nothing that ships may be a copy, trace,
// recolour, crop or near-copy of a U7 image).
//
// Output (local only, never committed, never loaded by the game):
//   reference/u7_style_dataset/<category>_<NNNN>.png   subject scaled up by nearest neighbour,
//                                                      centred on a flat square canvas
//   reference/u7_style_dataset/<category>_<NNNN>.txt   caption: "uf25d style, <subject>, ..."
//   reference/u7_style_dataset/README.txt               what this is and the rules
//   reference/u7_style_dataset/manifest.json            file -> source shape/frame (traceability)
//
// Usage (node "C:\Program Files\nodejs\node.exe"):
//   node tools/export_u7_style_dataset.js                 export with the defaults
//   node tools/export_u7_style_dataset.js --list          print the curated list with categories
//   node tools/export_u7_style_dataset.js --verify        re-read the output folder and check it (exit 1 on FAIL)
//   node tools/export_u7_style_dataset.js --contact 48    also write a contact sheet of 48 random images
// Options:
//   --scale n        nearest-neighbour scale (default 4; lowered per image only if the subject would not fit)
//   --size n         square canvas size in pixels (default 512)
//   --bg #rrggbb     flat background colour (default #808080)
//   --out dir        output folder (default reference/u7_style_dataset)
//   --static dir     the original game's STATIC folder (read only)
//   --contact n      write a contact sheet of n random dataset images (default file below)
//   --contact-out f  where to write it (default game/test_output/u7_style_dataset_contact.png)
//   --seed n         seed for the contact sheet's random pick (default 20260919)
//
// Idempotent: the same list and options always produce the same files; dataset files in
// the output folder that are no longer on the list are removed (only <category>_<NNNN>.png/.txt).
//
// Decoding follows tools/generate_all_u7_assets.js (docs/GUIDE_25D.md §2): SHAPES.VGA is a
// Flex file (entry table at byte 128, 8 bytes per entry); RLE frames with the header
// xright, xleft, yabove, ybelow; palette index 255 is transparent; PALETTES.FLX record 0 is
// the daylight palette (6-bit DAC values scaled to 8 bits). Creatures store two facings
// (frames 0-15 north, 16-31 south); west and east are those frames TRANSPOSED (x and y
// swapped), which keeps the up-left lean. Never mirrored.

const fs = require('fs');
const path = require('path');
const { writePNG } = require('./png_util');
const { readPNG } = require('./png_read');

const ROOT = path.join(__dirname, '..');
const DEFAULT_STATIC = 'C:\\Program Files\\GOG Galaxy\\Games\\Ultima 7\\STATIC';
const TRIGGER = 'uf25d style';
const VIEW = '2.5D oblique top-down pixel art, upper-left light, earthy palette';

// ---------------------------------------------------------------------------------------
// The curated list. Every entry was chosen by looking at a labelled contact sheet of the
// decoded shape (2026-09-19). Descriptions are generic: no names from the original game.
// ---------------------------------------------------------------------------------------

// Facings of a creature: stored frame block and whether the frame is transposed.
const FACING = {
    S: { add: 16, transpose: false, text: 'facing south, toward the viewer' },
    N: { add: 0, transpose: false, text: 'facing north, away from the viewer' },
    E: { add: 16, transpose: true, text: 'facing east' },
    W: { add: 0, transpose: true, text: 'facing west' }
};

// Frame (0-15 within a facing block) -> pose, for people.
const HUMAN_POSE = {
    0: 'standing', 1: 'walking, mid-stride', 2: 'walking, mid-stride',
    3: 'in a ready stance with fists raised', 5: 'raising one arm high to strike',
    8: 'raising both arms overhead for a two-handed blow', 10: 'sitting', 12: 'kneeling',
    13: 'lying on the ground', 14: 'raising both arms high', 15: 'holding both arms out'
};
// Frame -> pose, for animals and monsters.
const BEAST_POSE = { 0: 'standing', 1: 'walking', 13: 'lying on its side' };

// [shape, description, facings, frames]
const PEOPLE = [
    [265, 'a man with short grey hair in a red shirt, a brown leather vest and dark trousers', 'SNEW', [0, 1]],
    [452, 'a woman with long brown hair in a plain pale grey dress', 'SNEW', [0, 1]],
    [462, 'a brown-haired fighter in a tan tunic over grey mail, with a red belt', 'SNEW', [0, 1]],
    [459, 'a woman with long black hair in a red dress and a white blouse', 'SNEW', [0, 1]],
    [154, 'an old grey-bearded man in a long dark brown robe', 'SNEW', [0]],
    [228, 'an unclothed man with long brown hair and a beard', 'SNEW', [0]],
    [229, 'an unclothed woman with long blonde hair', 'SNEW', [0]],
    [247, 'a knight in silver plate armour with a red and yellow surcoat', 'SNEW', [0]],
    [304, 'a muscular bare-chested man with brown hair in blue trousers', 'SNEW', [0]],
    [318, 'a hooded monk in a long brown robe', 'SNEW', [0]],
    [319, 'a man with brown hair in a tan tunic with grey sleeves', 'SNEW', [0]],
    [394, 'a guard in a silver helmet and mail with a blue tabard', 'SNEW', [0]],
    [401, 'a sailor with a red headscarf, a pale grey shirt, a red sash and dark trousers', 'SNEW', [0]],
    [451, 'a grey-haired man in a long blue coat with a brown belt', 'SNEW', [0]],
    [454, 'a woman with long brown hair in a white blouse and a long orange skirt', 'SNEW', [0]],
    [456, 'a blonde woman in a blue and white gown', 'SNEW', [0]],
    [457, 'a black-haired woman in a purple blouse and a dark grey skirt with a red sash', 'SNEW', [0]],
    [460, 'a man in a green feathered cap and green woodsman clothes', 'SNEW', [0]],
    [461, 'a woman in a green feathered cap and green woodsman clothes', 'SNEW', [0]],
    [463, 'a black-haired woman in grey mail with a red belt and brown trousers', 'SNEW', [0]],
    [467, 'a jester in green, red and yellow motley with a belled cap', 'SNEW', [0]],
    [720, 'a guard in a silver helmet and mail with a red and purple tabard', 'SNEW', [0]],
    [471, 'a small boy in a brown tunic', 'SE', [0]],
    [472, 'a small blonde child in blue and white clothes', 'SE', [0]],
    [864, 'a blonde toddler in a white smock', 'SE', [0]]
];
// Extra poses: [shape, frame, facing]; the description comes from PEOPLE.
const PEOPLE_POSES = [
    [462, 3, 'S'], [462, 5, 'S'], [462, 8, 'E'], [462, 13, 'S'],
    [265, 10, 'S'], [265, 12, 'E'],
    [154, 14, 'S'], [154, 15, 'E'],
    [452, 10, 'E'], [452, 13, 'E'],
    [304, 8, 'S'],
    [459, 12, 'S']
];

// [category, shape, description, facings, frames, pose overrides]
const BEASTS = [
    ['animal', 502, 'a brown deer', 'SNEW', [0], { 0: 'in a running stride' }],
    ['animal', 727, 'a tan horse with a reddish-brown mane and tail', 'SNEW', [0], { 0: 'in a running stride' }],
    ['animal', 500, 'a tan cow with white patches and short horns', 'SNEW', [0]],
    ['animal', 537, 'a dark grey wolf', 'SNEW', [0]],
    ['animal', 970, 'a white woolly sheep', 'SNEW', [0]],
    ['animal', 496, 'a brown dog', 'SNEW', [0]],
    ['animal', 510, 'a red fox', 'SE', [0]],
    ['animal', 495, 'an orange tabby cat', 'SE', [0]],
    ['animal', 811, 'a grey-brown rabbit', 'SE', [0]],
    ['animal', 498, 'a golden-brown hen', 'SE', [0]],
    ['animal', 493, 'a black bat with spread wings', 'SE', [0], { 0: 'in flight' }],
    ['animal', 716, 'a small grey bird with spread wings', 'SE', [0], { 0: 'in flight' }],
    ['animal', 530, 'a green snake', 'SE', [0], { 0: 'slithering' }],
    ['animal', 523, 'a grey rat', 'SE', [0]],
    ['animal', 492, 'a green alligator', 'SE', [0]],
    ['animal', 502, 'a brown deer', 'S', [1, 13], { 1: 'in a running stride' }],
    ['animal', 727, 'a tan horse with a reddish-brown mane and tail', 'S', [1], { 1: 'in a running stride' }],
    ['animal', 537, 'a dark grey wolf', 'S', [1]],
    ['monster', 230, 'a huge red many-limbed flesh beast', 'SE', [0]],
    ['monster', 381, 'a three-headed green hydra', 'SE', [0]],
    ['monster', 501, 'a muscular one-eyed giant in a loincloth', 'SE', [0]],
    ['monster', 504, 'a red horned dragon with a coiled tail', 'SNE', [0]],
    ['monster', 505, 'a green winged drake', 'SE', [0]],
    ['monster', 524, 'a grey gnarled dead-tree creature with branch-like limbs', 'SE', [0]],
    ['monster', 525, 'a green sea serpent rising from white foam', 'SE', [0]],
    ['monster', 532, 'a harpy with feathered wings', 'SE', [0]],
    ['monster', 533, 'a brutish troll with grey hair and a brown hide tunic', 'SNE', [0]],
    ['monster', 706, 'a giant red scorpion', 'SE', [0]],
    ['monster', 865, 'a giant black spider', 'SNE', [0]],
    ['monster', 1015, 'a hulking grey stone golem', 'SE', [0]],
    ['monster', 528, 'a walking skeleton', 'SE', [0]],
    ['monster', 354, 'a skeletal sorcerer in red robes with a golden crown', 'SE', [0]],
    ['monster', 494, 'a giant bee with a striped golden body and clear wings', 'SE', [0], { 0: 'in flight' }]
];

// [category, shape, frame, description, transpose]
const OBJECTS = [
    // trees
    ['tree', 181, 0, 'a broad oak-like tree with a dense mottled green canopy'],
    ['tree', 181, 1, 'a leafy broadleaf tree with bright green foliage'],
    ['tree', 185, 0, 'a gnarled dead tree with pale twisted bark'],
    ['tree', 185, 1, 'a dead brown tree with twisted bare branches'],
    ['tree', 306, 0, 'a tall evergreen conifer with dark mottled needles'],
    ['tree', 306, 3, 'a bare dead conifer with brown branches'],
    ['tree', 306, 5, 'a dense deep green conifer'],
    ['tree', 310, 0, 'a tree with clumps of pale green leaves on dark branches'],
    ['tree', 310, 4, 'a bare-branched tree with sparse orange autumn leaves'],
    ['tree', 327, 2, 'a tree with pale bark and sparse green leaves'],
    ['tree', 328, 0, 'a thick grey-trunked tree with pale green foliage'],
    ['tree', 453, 0, 'a round tree with bright orange autumn foliage'],
    ['tree', 453, 2, 'a tall slender dark green cypress'],
    ['tree', 453, 4, 'a round fruit tree laden with red fruit'],
    ['tree', 453, 6, 'a palm tree with bright green fronds'],
    ['tree', 670, 2, 'a broad tree with dense red foliage'],
    ['tree', 670, 4, 'a broad tree with yellow autumn foliage'],
    ['tree', 674, 0, 'a fantastical tree with pale bark and blue leaves'],
    ['tree', 932, 1, 'a bushy tree with bright green leaves and a pale trunk'],
    ['tree', 309, 0, 'a fallen tree trunk lying on the ground'],
    ['tree', 313, 0, 'a dark charred tree stump with spreading roots'],
    ['tree', 313, 1, 'a pale weathered tree stump'],
    // bushes and plants
    ['plant', 160, 6, 'a large sprawling plant with long curling green leaves'],
    ['plant', 302, 2, 'a ripe orange pumpkin on its vine'],
    ['plant', 314, 16, 'a small plant with red flowers'],
    ['plant', 320, 1, 'a thorny bramble with small green leaves'],
    ['plant', 320, 3, 'a tangle of dry brown brambles'],
    ['plant', 321, 0, 'a clump of green reeds'],
    ['plant', 323, 0, 'a clump of cattails with brown seed heads'],
    ['plant', 326, 0, 'a spiky green tropical plant'],
    ['plant', 619, 0, 'a large green fern'],
    ['plant', 669, 1, 'a branching cactus with red flowers'],
    ['plant', 669, 3, 'a branching pale green cactus'],
    ['plant', 672, 1, 'a round dark green shrub'],
    ['plant', 672, 2, 'a round pale green shrub'],
    ['plant', 673, 0, 'a plant with purple flowers'],
    ['plant', 673, 3, 'a leafy yellow-green plant'],
    ['plant', 673, 5, 'a small bush with red berries'],
    ['plant', 673, 6, 'a plant with blue flowers'],
    ['plant', 817, 2, 'a round barrel cactus with yellow flowers'],
    ['plant', 922, 4, 'a dry brown leafless shrub'],
    ['plant', 960, 0, 'a giant mottled brown mushroom cap with pink and orange spots'],
    ['plant', 423, 1, 'a green grain crop with ripening ears'],
    ['plant', 423, 24, 'ripe golden grain stalks'],
    ['plant', 1023, 1, 'a round haystack'],
    ['plant', 611, 0, 'lily pads with yellow flowers'],
    // rocks and ore
    ['rock', 163, 0, 'a cluster of black crystal spires'],
    ['rock', 163, 1, 'a layered rust-red rock outcrop'],
    ['rock', 163, 2, 'a layered grey rock outcrop'],
    ['rock', 316, 0, 'a large pale limestone rock'],
    ['rock', 316, 1, 'a large grey rock'],
    ['rock', 341, 0, 'a pinkish granite rock'],
    ['rock', 341, 3, 'a dark grey rock'],
    ['rock', 341, 7, 'a sandy yellow rock'],
    ['rock', 341, 10, 'a white quartz rock'],
    ['rock', 342, 0, 'a white boulder'],
    ['rock', 342, 2, 'an ochre boulder'],
    ['rock', 342, 3, 'a grey boulder with red ore veins'],
    ['rock', 343, 0, 'a large rounded grey boulder'],
    ['rock', 343, 1, 'a large reddish-brown boulder'],
    ['rock', 343, 2, 'a large dark grey boulder'],
    ['rock', 634, 0, 'a leaning grey standing stone'],
    ['rock', 331, 0, 'a small dark grey stone'],
    // furniture
    ['furniture', 283, 0, 'a wooden writing desk with a green felt top'],
    ['furniture', 292, 0, 'a simple wooden chair'],
    ['furniture', 292, 1, 'a simple wooden chair'],
    ['furniture', 873, 0, 'a wooden chair'],
    ['furniture', 873, 5, 'a wooden chair with a red cushion'],
    ['furniture', 416, 0, 'a long low wooden chest of drawers with brass handles'],
    ['furniture', 261, 0, 'a wooden weaving loom strung with orange thread'],
    ['furniture', 651, 0, 'a wooden spinning wheel'],
    ['furniture', 991, 1, 'an iron anvil'],
    ['furniture', 995, 0, 'an empty iron cauldron'],
    ['furniture', 995, 3, 'an iron cauldron full of green liquid'],
    ['furniture', 711, 0, 'a round millstone in a wooden frame'],
    // beds
    ['bed', 696, 0, 'a bed with a white quilted cover and pillows, running east to west'],
    ['bed', 696, 5, 'a bed with a red blanket, running east to west'],
    ['bed', 696, 6, 'an unmade bed with a rumpled red blanket, running east to west'],
    ['bed', 696, 13, 'a bed with a green checked blanket, running east to west'],
    ['bed', 696, 15, 'a bed with a brown checked blanket, running east to west'],
    ['bed', 1011, 0, 'a bed with a white quilted cover and pillows, running north to south'],
    ['bed', 1011, 11, 'a bed with a blue blanket, running north to south'],
    // tables
    ['table', 333, 0, 'a wooden table with a grey marble top'],
    ['table', 633, 1, 'a small square wooden table'],
    ['table', 633, 4, 'a small round wooden table'],
    ['table', 890, 1, 'a long plank table'],
    ['table', 890, 2, 'a long table with a red cloth'],
    ['table', 890, 3, 'a long stone table'],
    ['table', 971, 1, 'a long plank table, running north to south'],
    ['table', 964, 0, 'a large table with a grey stone top'],
    // barrels, crates and other containers
    ['container', 258, 0, 'a large upright wooden keg with a tap, on a stand'],
    ['container', 434, 0, 'a large wooden cask lying on its side, with a tap'],
    ['container', 800, 0, 'a closed wooden chest'],
    ['container', 800, 1, 'a closed wooden chest'],
    ['container', 801, 0, 'a leather backpack'],
    ['container', 802, 0, 'a small tied cloth pouch'],
    ['container', 803, 0, 'a small brown lidded case with a red clasp'],
    ['container', 804, 0, 'a wooden crate'],
    ['container', 819, 0, 'a wooden barrel'],
    ['container', 819, 1, 'an open, empty wooden barrel'],
    ['container', 810, 0, 'a wooden bucket'],
    ['container', 677, 0, 'a sack of grain'],
    ['container', 944, 0, 'a small iron frying pan'],
    // walls and building pieces
    ['building', 869, 0, 'a fieldstone wall piece running east to west'],
    ['building', 869, 1, 'a cut grey stone wall piece running east to west'],
    ['building', 869, 2, 'a red brick wall piece running east to west'],
    ['building', 869, 3, 'a wooden plank wall piece running east to west'],
    ['building', 869, 4, 'a pale plastered wall piece running east to west'],
    ['building', 869, 7, 'a log wall piece running east to west'],
    ['building', 871, 0, 'a fieldstone wall piece running north to south'],
    ['building', 871, 2, 'a red brick wall piece running north to south'],
    ['building', 871, 3, 'a wooden plank wall piece running north to south'],
    ['building', 871, 7, 'a log wall piece running north to south'],
    ['building', 845, 0, 'a fieldstone wall piece with a small opening, running east to west'],
    ['building', 205, 0, 'a short fieldstone wall end post'],
    ['building', 967, 1, 'a ruined, crumbling fieldstone wall'],
    ['building', 156, 0, 'a square section of red clay tile roof seen from above'],
    ['building', 164, 0, 'a square section of grey slate roof seen from above'],
    ['building', 170, 1, 'a square section of wooden shingle roof seen from above'],
    ['building', 982, 0, 'a rectangular stone chimney'],
    ['building', 687, 0, 'a grey stone pillar with a square capital'],
    ['building', 421, 0, 'a low wooden rail fence running east to west'],
    ['building', 470, 0, 'a round stone well'],
    ['building', 741, 2, 'a stone water trough filled with water'],
    // doors
    ['door', 270, 0, 'a closed wooden plank door with iron bands, in a wall running east to west'],
    ['door', 270, 8, 'a closed wooden plank door with a small hatch, in a wall running east to west'],
    ['door', 270, 12, 'a closed dark iron-framed door, in a wall running east to west'],
    ['door', 376, 0, 'a closed wooden plank door with iron bands, in a wall running north to south'],
    ['door', 376, 4, 'a closed iron grille door, in a wall running north to south'],
    ['door', 376, 16, 'a closed dark door with brass fittings, in a wall running north to south'],
    ['door', 225, 0, 'a large closed wooden gate with a stone hinge post, running east to west'],
    ['door', 250, 0, 'a large closed wooden gate with a stone hinge post, running north to south'],
    ['door', 271, 0, 'an iron portcullis'],
    // campfires and hearths
    ['fire', 739, 0, 'a round stone fire pit, unlit, full of ashes'],
    ['fire', 739, 3, 'a round stone fire pit with a burning fire'],
    ['fire', 825, 1, 'a small campfire of glowing embers'],
    ['fire', 825, 5, 'a small campfire with tall flames'],
    ['fire', 701, 0, 'a burning torch'],
    ['fire', 664, 0, 'a grey iron stove'],
    ['fire', 872, 0, 'a low iron cooking stove'],
    // carts
    ['cart', 796, 1, 'a pale tan draft horse with a reddish-brown mane, in a leather harness, facing south, toward the viewer'],
    ['cart', 796, 0, 'a pale tan draft horse with a reddish-brown mane, in a leather harness, facing north, away from the viewer'],
    ['cart', 796, 1, 'a pale tan draft horse with a reddish-brown mane, in a leather harness, facing east', true],
    ['cart', 796, 0, 'a pale tan draft horse with a reddish-brown mane, in a leather harness, facing west', true],
    ['cart', 652, 0, 'the plank floor of a wooden cart'],
    ['cart', 774, 0, 'a solid wooden cart wheel'],
    ['cart', 437, 0, 'a large spoked wagon wheel with a purple rim, lying flat'],
    // items: tools
    ['tool', 589, 0, 'a pitchfork'],
    ['tool', 618, 0, 'a scythe'],
    ['tool', 620, 0, 'a rake'],
    ['tool', 624, 0, 'a pickaxe'],
    ['tool', 625, 0, 'a shovel'],
    ['tool', 626, 0, 'a hoe'],
    ['tool', 698, 0, 'a pair of iron shears'],
    ['tool', 662, 0, 'a long fishing rod'],
    ['tool', 595, 0, 'an unlit wooden torch'],
    // items: weapons
    ['weapon', 590, 0, 'a wooden club'],
    ['weapon', 594, 0, 'a dagger'],
    ['weapon', 597, 0, 'a longbow'],
    ['weapon', 598, 0, 'a crossbow'],
    ['weapon', 599, 0, 'a sword with a gold hilt'],
    ['weapon', 600, 0, 'a two-handed war hammer'],
    ['weapon', 601, 0, 'a double-bladed axe'],
    ['weapon', 602, 0, 'a two-handed sword'],
    ['weapon', 603, 0, 'a halberd'],
    ['weapon', 592, 0, 'a spear'],
    // items: armour and clothes
    ['armour', 609, 0, 'a black and white quartered kite shield'],
    ['armour', 572, 0, 'a round wooden shield'],
    ['armour', 543, 0, 'a round dark studded buckler'],
    ['armour', 569, 0, 'a leather cuirass'],
    ['armour', 573, 0, 'a steel plate cuirass'],
    ['armour', 587, 0, 'a pair of leather boots'],
    ['armour', 285, 0, 'a grey cloak'],
    ['armour', 574, 0, 'a pair of leather leggings'],
    // items: food and drink
    ['food', 377, 1, 'a long loaf of bread'],
    ['food', 377, 4, 'a round loaf of bread'],
    ['food', 377, 7, 'a string of sausages'],
    ['food', 377, 8, 'a smoked ham'],
    ['food', 377, 10, 'a roast fowl'],
    ['food', 377, 13, 'a fish'],
    ['food', 377, 14, 'a roast leg of meat'],
    ['food', 377, 16, 'a red apple'],
    ['food', 377, 18, 'a bunch of carrots'],
    ['food', 377, 19, 'a bunch of purple grapes'],
    ['food', 377, 27, 'a wedge of cheese'],
    ['food', 824, 0, 'a green clay pitcher'],
    ['food', 824, 2, 'a brown clay jug'],
    // items: goods
    ['goods', 642, 0, 'an open book'],
    ['goods', 797, 0, 'a rolled parchment scroll'],
    ['goods', 646, 0, 'a gold bar'],
    ['goods', 984, 0, 'a rough wooden log']
];

const CATEGORY_ORDER = ['person', 'animal', 'monster', 'tree', 'plant', 'rock', 'furniture', 'bed', 'table',
    'container', 'building', 'door', 'fire', 'cart', 'tool', 'weapon', 'armour', 'food', 'goods'];

// Terms that must never appear in a caption or file name (AGENTS.md, Reference vs. shipped content).
const BANNED = ['ultima', 'origin systems', 'britannia', 'britannian', 'avatar', 'guardian', 'lord british', 'iolo',
    'dupre', 'shamino', 'fellowship', 'moongate', 'batlin', 'gargoyle', 'trinsic', 'minoc', 'moonglow', 'jhelom',
    'skara brae', 'serpent isle', 'black gate', 'exult', 'urist', 'armok', 'strange mood', 'fey mood', 'beholder',
    'mind flayer', 'illithid', 'displacer', 'githyanki'];

// Expands the curated list into one item per image, in a fixed order.
function buildItems() {
    const items = [];
    const desc = {};
    for (const [shape, text, facings, frames] of PEOPLE) {
        desc[shape] = text;
        for (const f of frames) {
            for (const fc of facings) {
                items.push({ cat: 'person', shape, frame: f + FACING[fc].add, transpose: FACING[fc].transpose,
                    parts: [text, FACING[fc].text, HUMAN_POSE[f]] });
            }
        }
    }
    for (const [shape, f, fc] of PEOPLE_POSES) {
        items.push({ cat: 'person', shape, frame: f + FACING[fc].add, transpose: FACING[fc].transpose,
            parts: [desc[shape], FACING[fc].text, HUMAN_POSE[f]] });
    }
    for (const [cat, shape, text, facings, frames, poseOverride] of BEASTS) {
        for (const f of frames) {
            for (const fc of facings) {
                const pose = (poseOverride && poseOverride[f]) || BEAST_POSE[f];
                items.push({ cat, shape, frame: f + FACING[fc].add, transpose: FACING[fc].transpose,
                    parts: [text, FACING[fc].text, pose] });
            }
        }
    }
    for (const [cat, shape, frame, text, transpose] of OBJECTS) {
        items.push({ cat, shape, frame, transpose: !!transpose, parts: [text] });
    }
    // Number each category in list order; sort by category order for a stable listing.
    items.sort((a, b) => CATEGORY_ORDER.indexOf(a.cat) - CATEGORY_ORDER.indexOf(b.cat));
    const counters = {};
    for (const it of items) {
        if (!CATEGORY_ORDER.includes(it.cat)) throw new Error(`unknown category ${it.cat}`);
        counters[it.cat] = (counters[it.cat] || 0) + 1;
        it.base = `${it.cat}_${String(counters[it.cat]).padStart(4, '0')}`;
    }
    return items;
}

function bgName(rgb) {
    const [r, g, b] = rgb;
    if (r === 255 && g === 0 && b === 255) return 'flat magenta background';
    if (r === g && g === b) return r < 40 ? 'flat black background' : r > 215 ? 'flat white background' : 'flat grey background';
    return 'flat plain background';
}

function caption(it, bg) {
    return [TRIGGER, ...it.parts.filter(Boolean), VIEW, bgName(bg)].join(', ');
}

// ---------------------------------------------------------------------------------------
// Decoding (same as tools/generate_all_u7_assets.js decodeShape).
// ---------------------------------------------------------------------------------------
function openLibrary(staticDir) {
    const shapesPath = path.join(staticDir, 'SHAPES.VGA');
    const palPath = path.join(staticDir, 'PALETTES.FLX');
    for (const p of [shapesPath, palPath]) {
        if (!fs.existsSync(p)) throw new Error(`not found: ${p} (pass --static <the game's STATIC folder>)`);
    }
    const shapes = fs.readFileSync(shapesPath);
    const palBytes = fs.readFileSync(palPath);
    const pal = [];
    for (let i = 0; i < 256; i++) {
        pal.push([0, 1, 2].map(k => Math.min(255, Math.round(palBytes[256 + i * 3 + k] * 255 / 63))));
    }
    const count = shapes.readUInt32LE(84);

    function frameCount(id) {
        if (id < 150 || id >= count) return 0;
        const off = shapes.readUInt32LE(128 + id * 8);
        if (!off || off >= shapes.length) return 0;
        return (shapes.readUInt32LE(off + 4) - 4) / 4;
    }

    function decode(id, frame) {
        const n = frameCount(id);
        if (frame < 0 || frame >= n) return null;
        const off = shapes.readUInt32LE(128 + id * 8);
        const ptr = off + shapes.readUInt32LE(off + 4 + frame * 4);
        const xright = shapes.readInt16LE(ptr), xleft = shapes.readInt16LE(ptr + 2);
        const yabove = shapes.readInt16LE(ptr + 4), ybelow = shapes.readInt16LE(ptr + 6);
        const w = xleft + xright + 1, h = yabove + ybelow + 1;
        if (w <= 0 || h <= 0 || w > 500 || h > 500) return null;
        const px = Buffer.alloc(w * h * 4);
        const put = (x, y, ci) => {
            if (ci === 255 || x < 0 || y < 0 || x >= w || y >= h) return;
            const o = (y * w + x) * 4;
            px[o] = pal[ci][0]; px[o + 1] = pal[ci][1]; px[o + 2] = pal[ci][2]; px[o + 3] = 255;
        };
        let c = ptr + 8;
        while (c < shapes.length - 1) {
            const scanlen = shapes.readUInt16LE(c); c += 2;
            if (scanlen === 0) break;
            const encoded = scanlen & 1, len = scanlen >> 1;
            const sx = shapes.readInt16LE(c); c += 2;
            const sy = shapes.readInt16LE(c); c += 2;
            const dy = yabove + sy, dx = xleft + sx;
            if (!encoded) {
                for (let i = 0; i < len; i++) put(dx + i, dy, shapes[c++]);
            } else {
                let done = 0;
                while (done < len) {
                    const b = shapes[c++], repeat = b & 1, run = b >> 1;
                    if (repeat) { const ci = shapes[c++]; for (let k = 0; k < run; k++) put(dx + done + k, dy, ci); }
                    else for (let k = 0; k < run; k++) put(dx + done + k, dy, shapes[c++]);
                    done += run;
                }
            }
        }
        return { w, h, px };
    }
    return { decode, frameCount };
}

function transpose(img) {
    const w = img.h, h = img.w, px = Buffer.alloc(w * h * 4);
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) img.px.copy(px, (x * w + y) * 4, (y * img.w + x) * 4, (y * img.w + x) * 4 + 4);
    }
    return { w, h, px };
}

// Crops to the opaque pixels; returns null if there are none.
function trim(img) {
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            if (img.px[(y * img.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
    }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, px = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) img.px.copy(px, y * w * 4, ((y0 + y) * img.w + x0) * 4, ((y0 + y) * img.w + x1 + 1) * 4);
    return { w, h, px };
}

// Places the subject, scaled by nearest neighbour, centred on a flat canvas.
function compose(img, scale, size, bg) {
    const margin = Math.max(8, Math.round(size / 32));
    let s = scale;
    while (s > 1 && (img.w * s > size - 2 * margin || img.h * s > size - 2 * margin)) s--;
    if (img.w * s > size || img.h * s > size) return null;
    const out = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) { out[i * 4] = bg[0]; out[i * 4 + 1] = bg[1]; out[i * 4 + 2] = bg[2]; out[i * 4 + 3] = 255; }
    const ox = Math.floor((size - img.w * s) / 2), oy = Math.floor((size - img.h * s) / 2);
    for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
            const si = (y * img.w + x) * 4;
            if (!img.px[si + 3]) continue;
            for (let a = 0; a < s; a++) {
                for (let b = 0; b < s; b++) img.px.copy(out, ((oy + y * s + a) * size + ox + x * s + b) * 4, si, si + 3);
            }
        }
    }
    return { buf: out, scale: s, placed: [ox, oy, img.w * s, img.h * s] };
}

// ---------------------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------------------
function parseArgs(argv) {
    const o = {
        scale: 4, size: 512, bg: '#808080', out: path.join(ROOT, 'reference', 'u7_style_dataset'),
        staticDir: process.env.UF_U7_STATIC || DEFAULT_STATIC, list: false, verify: false, contact: 0,
        contactOut: path.join(ROOT, 'game', 'test_output', 'u7_style_dataset_contact.png'), seed: 20260919
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
        if (a === '--list') o.list = true;
        else if (a === '--verify') o.verify = true;
        else if (a === '--scale') o.scale = parseInt(next(), 10);
        else if (a === '--size') o.size = parseInt(next(), 10);
        else if (a === '--bg') o.bg = next();
        else if (a === '--out') o.out = path.resolve(next());
        else if (a === '--static') o.staticDir = next();
        else if (a === '--contact') o.contact = parseInt(next(), 10);
        else if (a === '--contact-out') o.contactOut = path.resolve(next());
        else if (a === '--seed') o.seed = parseInt(next(), 10);
        else if (a === '--help' || a === '-h') o.help = true;
        else throw new Error(`unknown option ${a}`);
    }
    if (!(o.scale >= 1 && o.scale <= 16)) throw new Error('--scale must be 1..16');
    if (!(o.size >= 64 && o.size <= 4096)) throw new Error('--size must be 64..4096');
    if (!/^#?[0-9a-fA-F]{6}$/.test(o.bg)) throw new Error('--bg must be #rrggbb');
    const hex = o.bg.replace('#', '');
    o.bgRgb = [0, 2, 4].map(k => parseInt(hex.slice(k, k + 2), 16));
    return o;
}

const DATA_FILE = /^([a-z]+)_(\d{4})\.(png|txt)$/;

function readme(o, items, counts) {
    return [
        'UF style-training dataset (local only)',
        '=======================================',
        '',
        'What this is: ' + items.length + ' images decoded from the original Ultima VII shape library by',
        'tools/export_u7_style_dataset.js, each with a caption .txt of the same name. They are training and',
        'reference material for the art generators: a style LoRA learns the 2.5D oblique look from them.',
        '',
        'Rules (AGENTS.md rule 8 and VISION V9, user decision 2026-09-19):',
        '- Local only. NEVER commit this folder, NEVER copy it into game/, NEVER ship or upload it publicly.',
        '  The project .gitignore is a whitelist, so reference/ is untracked; keep it that way.',
        '- Everything that ships in the game is our own original work: never a copy, trace, recolour, crop',
        '  or near-copy of these images. Every generated asset is checked by tools/originality_check.js',
        '  against the U7 shape library before it goes into game/; FAIL or WARN means redraw, never ship.',
        '- Upload to a hosted trainer only as a private dataset for a private model, and delete it there',
        '  after training.',
        '',
        'Format: ' + o.size + 'x' + o.size + ' PNG, subject scaled ' + o.scale + 'x by nearest neighbour (lower only where it would',
        'not fit), centred on flat ' + o.bg.toUpperCase() + '. Caption: "' + TRIGGER + ', <subject>, <facing>, <pose>, ' + VIEW + ', ' + bgName(o.bgRgb) + '".',
        'manifest.json maps each file to its source shape and frame (for checks only; do not upload it).',
        '',
        'Counts per category: ' + Object.entries(counts).map(([k, v]) => k + ' ' + v).join(', '),
        '',
        'How to train and use it: docs/handoffs/STYLE_TRAINING.md',
        'Rebuild: node tools/export_u7_style_dataset.js   Check: node tools/export_u7_style_dataset.js --verify',
        ''
    ].join('\r\n');
}

// ---------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------
function exportAll(o, items) {
    const lib = openLibrary(o.staticDir);
    fs.mkdirSync(o.out, { recursive: true });
    const manifest = [];
    const counts = {};
    const problems = [];
    for (const it of items) {
        let img = lib.decode(it.shape, it.frame);
        if (!img) { problems.push(`${it.base}: shape ${it.shape} frame ${it.frame} does not decode`); continue; }
        if (it.transpose) img = transpose(img);
        const t = trim(img);
        if (!t) { problems.push(`${it.base}: shape ${it.shape} frame ${it.frame} is empty`); continue; }
        const c = compose(t, o.scale, o.size, o.bgRgb);
        if (!c) { problems.push(`${it.base}: ${t.w}x${t.h} does not fit a ${o.size} canvas`); continue; }
        if (c.scale !== o.scale) console.log(`note: ${it.base} (${t.w}x${t.h}) exported at ${c.scale}x to fit`);
        const text = caption(it, o.bgRgb);
        writePNG(path.join(o.out, it.base + '.png'), o.size, o.size, c.buf);
        fs.writeFileSync(path.join(o.out, it.base + '.txt'), text + '\n');
        counts[it.cat] = (counts[it.cat] || 0) + 1;
        manifest.push({ file: it.base + '.png', category: it.cat, shape: it.shape, frame: it.frame,
            transposed: it.transpose, subject: [t.w, t.h], scale: c.scale, placed: c.placed, caption: text });
    }
    // Remove dataset files that are no longer on the list (keeps re-runs idempotent).
    const keep = new Set(manifest.flatMap(m => [m.file, m.file.replace(/\.png$/, '.txt')]));
    let removed = 0;
    for (const f of fs.readdirSync(o.out)) {
        if (DATA_FILE.test(f) && !keep.has(f)) { fs.unlinkSync(path.join(o.out, f)); removed++; }
    }
    fs.writeFileSync(path.join(o.out, 'manifest.json'), JSON.stringify({
        tool: 'tools/export_u7_style_dataset.js', options: { scale: o.scale, size: o.size, bg: o.bg.toUpperCase() },
        count: manifest.length, counts, items: manifest }, null, 1) + '\n');
    fs.writeFileSync(path.join(o.out, 'README.txt'), readme(o, manifest, counts));
    console.log(`wrote ${manifest.length} images + captions to ${path.relative(ROOT, o.out) || o.out}` + (removed ? ` (removed ${removed} stale files)` : ''));
    for (const cat of CATEGORY_ORDER) if (counts[cat]) console.log(`  ${cat.padEnd(10)} ${counts[cat]}`);
    if (problems.length) {
        for (const p of problems) console.log('FAIL ' + p);
        process.exitCode = 1;
    }
    return manifest;
}

// ---------------------------------------------------------------------------------------
// Verify: re-reads the output folder. Every check can FAIL.
// ---------------------------------------------------------------------------------------
function verify(o, items) {
    let fails = 0;
    const check = (ok, name, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`); if (!ok) fails++; };
    const bannedRe = new RegExp('\\b(' + BANNED.map(b => b.replace(/ /g, '\\s+')).join('|') + ')\\b', 'i');
    if (!fs.existsSync(o.out)) { check(false, 'output folder exists', o.out); return 1; }
    const files = fs.readdirSync(o.out);
    const expected = new Set(items.flatMap(it => [it.base + '.png', it.base + '.txt']));
    const missing = [...expected].filter(f => !files.includes(f));
    const extra = files.filter(f => DATA_FILE.test(f) && !expected.has(f));
    check(missing.length === 0, 'every listed image and caption exists', missing.length ? missing.slice(0, 5).join(', ') + (missing.length > 5 ? ` (+${missing.length - 5})` : '') : `${items.length} pairs`);
    check(extra.length === 0, 'no stale dataset files', extra.slice(0, 5).join(', '));
    const badNames = files.filter(f => bannedRe.test(f.replace(/[_.]/g, ' ')));
    check(badNames.length === 0, 'no banned names in file names', badNames.join(', '));

    let badSize = [], badBg = [], empty = [], badCap = [], banned = [], mismatch = [];
    for (const it of items) {
        const png = path.join(o.out, it.base + '.png'), txt = path.join(o.out, it.base + '.txt');
        if (fs.existsSync(png)) {
            const img = readPNG(png);
            if (img.width !== o.size || img.height !== o.size) badSize.push(`${it.base} ${img.width}x${img.height}`);
            else {
                const corners = [[0, 0], [o.size - 1, 0], [0, o.size - 1], [o.size - 1, o.size - 1]];
                if (!corners.every(([x, y]) => { const p = img.px(x, y); return p[0] === o.bgRgb[0] && p[1] === o.bgRgb[1] && p[2] === o.bgRgb[2] && p[3] === 255; })) badBg.push(it.base);
                let n = 0;
                for (let i = 0; i < img.data.length; i += 4) {
                    if (img.data[i] !== o.bgRgb[0] || img.data[i + 1] !== o.bgRgb[1] || img.data[i + 2] !== o.bgRgb[2]) n++;
                }
                if (n < 16) empty.push(it.base);
            }
        }
        if (fs.existsSync(txt)) {
            const t = fs.readFileSync(txt, 'utf8').trim();
            if (!t.startsWith(TRIGGER + ', ') || !t.includes(VIEW)) badCap.push(it.base);
            if (bannedRe.test(t)) banned.push(`${it.base}: "${t.match(bannedRe)[0]}"`);
            if (t !== caption(it, o.bgRgb)) mismatch.push(it.base);
        }
    }
    check(badSize.length === 0, `images are ${o.size}x${o.size}`, badSize.slice(0, 5).join(', '));
    check(badBg.length === 0, `canvas corners are flat ${o.bg.toUpperCase()}`, badBg.slice(0, 5).join(', '));
    check(empty.length === 0, 'every image shows a subject (16+ non-background pixels)', empty.slice(0, 5).join(', '));
    check(badCap.length === 0, `captions start with "${TRIGGER}, " and name the view`, badCap.slice(0, 5).join(', '));
    check(banned.length === 0, 'no banned proper nouns in captions', banned.slice(0, 5).join('; '));
    check(mismatch.length === 0, 'captions match the curated list', mismatch.slice(0, 5).join(', '));
    const rd = path.join(o.out, 'README.txt');
    const rtext = fs.existsSync(rd) ? fs.readFileSync(rd, 'utf8') : '';
    check(/NEVER commit/.test(rtext) && /rule 8/.test(rtext), 'README.txt exists and states the local-only rule');

    // The folder must stay out of git (the .gitignore whitelist). Read-only git query.
    let ignored = null;
    try {
        const cp = require('child_process');
        const r = cp.spawnSync('git', ['check-ignore', '-q', path.join(o.out, items[0].base + '.png')], { cwd: ROOT });
        if (r.error) ignored = null; else ignored = r.status === 0 ? true : r.status === 1 ? false : null;
    } catch (e) { ignored = null; }
    if (ignored === null) console.log('SKIP output folder is git-ignored: not checked (git not available, or the folder is outside the repository)');
    else check(ignored, 'output folder is git-ignored (never committed)');

    console.log(fails ? `${fails} check(s) FAILED` : 'all checks passed');
    return fails ? 1 : 0;
}

// ---------------------------------------------------------------------------------------
// Contact sheet: n random dataset images at their exported size, downscaled to fit one image.
// ---------------------------------------------------------------------------------------
const DIGITS = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
    '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001111'
};

function contactSheet(o, items) {
    let rng = o.seed >>> 0;
    const rand = () => { rng = (rng + 0x6D2B79F5) >>> 0; let t = rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pool = items.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const pick = pool.slice(0, Math.min(o.contact, pool.length));
    const cols = Math.ceil(Math.sqrt(pick.length * 4 / 3)), rows = Math.ceil(pick.length / cols);
    // Full sheet at exported size would be cols*size wide; downscale by an integer box filter to fit 2048.
    const factor = Math.max(1, Math.ceil(cols * o.size / 2048));
    const tile = Math.floor(o.size / factor);
    const W = cols * tile, H = rows * tile;
    const out = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) { out[i * 4] = 32; out[i * 4 + 1] = 32; out[i * 4 + 2] = 32; out[i * 4 + 3] = 255; }
    const lines = [];
    pick.forEach((it, k) => {
        const img = readPNG(path.join(o.out, it.base + '.png'));
        const cx = (k % cols) * tile, cy = Math.floor(k / cols) * tile;
        for (let y = 0; y < tile; y++) {
            for (let x = 0; x < tile; x++) {
                let r = 0, g = 0, b = 0;
                for (let a = 0; a < factor; a++) for (let c = 0; c < factor; c++) {
                    const p = img.px(Math.min(img.width - 1, x * factor + c), Math.min(img.height - 1, y * factor + a));
                    r += p[0]; g += p[1]; b += p[2];
                }
                const n = factor * factor, d = ((cy + y) * W + cx + x) * 4;
                out[d] = Math.round(r / n); out[d + 1] = Math.round(g / n); out[d + 2] = Math.round(b / n);
            }
        }
        // 1-px dark border and the tile number (1-based) in the top-left corner.
        for (let i = 0; i < tile; i++) {
            for (const [x, y] of [[cx + i, cy], [cx, cy + i]]) { const d = (y * W + x) * 4; out[d] = out[d + 1] = out[d + 2] = 0; }
        }
        const label = String(k + 1);
        for (let y = 0; y < 14; y++) for (let x = 0; x < label.length * 8 + 4; x++) { const d = ((cy + 2 + y) * W + cx + 2 + x) * 4; out[d] = out[d + 1] = out[d + 2] = 0; }
        [...label].forEach((ch, n) => {
            const g = DIGITS[ch];
            for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (g[y * 3 + x] === '1') {
                for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) { const d = ((cy + 4 + y * 2 + a) * W + cx + 4 + n * 8 + x * 2 + c) * 4; out[d] = 255; out[d + 1] = 255; out[d + 2] = 0; }
            }
        });
        lines.push(`${k + 1}\t${it.base}\t${caption(it, o.bgRgb)}`);
    });
    fs.mkdirSync(path.dirname(o.contactOut), { recursive: true });
    writePNG(o.contactOut, W, H, out);
    fs.writeFileSync(o.contactOut.replace(/\.png$/i, '.txt'), lines.join('\n') + '\n');
    console.log(`contact sheet: ${pick.length} images, ${cols}x${rows} tiles of ${tile}px (1/${factor} of ${o.size}), ${W}x${H} -> ${path.relative(ROOT, o.contactOut)}`);
}

function printList(items) {
    const byShape = new Map();
    for (const it of items) {
        const key = `${it.cat}|${it.shape}|${it.parts[0]}`;
        if (!byShape.has(key)) byShape.set(key, { cat: it.cat, shape: it.shape, desc: it.parts[0], frames: [] });
        byShape.get(key).frames.push(it.frame + (it.transpose ? 't' : ''));
    }
    let cat = '';
    for (const e of byShape.values()) {
        if (e.cat !== cat) { cat = e.cat; console.log(`\n[${cat}] ${items.filter(i => i.cat === cat).length} images`); }
        console.log(`  shape ${String(e.shape).padStart(4)}  frames ${e.frames.join(',').padEnd(22)} ${e.desc}`);
    }
    console.log(`\ntotal ${items.length} images from ${new Set(items.map(i => i.shape)).size} shapes (frame numbers are stored frames; t = transposed)`);
}

function main() {
    const o = parseArgs(process.argv.slice(2));
    if (o.help) {
        console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 33).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
        return;
    }
    const items = buildItems();
    if (o.list) { printList(items); return; }
    if (o.verify) { process.exitCode = verify(o, items); return; }
    exportAll(o, items);
    if (o.contact > 0) contactSheet(o, items);
}

module.exports = { buildItems, caption, openLibrary, transpose, trim, compose, BANNED, TRIGGER, VIEW };

if (require.main === module) {
    try { main(); } catch (e) { console.error('ERROR ' + e.message); process.exitCode = 1; }
}
