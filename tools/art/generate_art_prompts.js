const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('.');
const PROMPTS_DIR = path.join(ROOT, 'art/prompts');
fs.mkdirSync(PROMPTS_DIR, { recursive: true });

const catPath = path.join(ROOT, 'art/catalogue/catalogue.json');
const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));

// 26 Flat World Ground Tiles
const FLAT_TILES = [
  {
    id: 'SURFACE_SHARED_TERRAIN_MEADOW_A2_DEFAULT',
    name: 'Meadow Grass',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'flat 2D top-down lush green meadow grass ground tile, vibrant wild pasture grass blades and tiny scattered clover, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_FOREST-FLOOR_A2_DEFAULT',
    name: 'Forest Loam',
    ramp: 'TEMP_WOODLAND_FLOOR',
    desc: 'flat 2D top-down rich temperate deciduous woodland soil ground tile, dark forest loam with decomposed leaves and small twigs, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_ROCK_A2_DEFAULT',
    name: 'Granite Bedrock',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'flat 2D top-down smooth exposed granite bedrock slab ground tile, weathered grey stone fissures and crystalline texture, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_MUD_A2_DEFAULT',
    name: 'Marsh Mud',
    ramp: 'WET_MUD_ANAEROBIC',
    desc: 'flat 2D top-down saturated dark wetland mud ground tile, wet organic muck with tiny trickles of dark water, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_SAND_A2_DEFAULT',
    name: 'Desert Sand',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'flat 2D top-down dry desert sand ground tile, fine golden-tan sand grains, subtle soft wind ripple texture, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_NEEDLE-FLOOR_A2_DEFAULT',
    name: 'Pine Needles',
    ramp: 'TEMP_WOODLAND_FLOOR',
    desc: 'flat 2D top-down boreal coniferous forest floor ground tile, dense layer of russet-brown pine needles and dark duff, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_RED-CLAY_A2_DEFAULT',
    name: 'Dry Clay',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'flat 2D top-down hard-baked arid cracked clay soil ground tile, pale terracotta earthy fissures, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_TUNDRA_A2_DEFAULT',
    name: 'Tundra Lichen',
    ramp: 'TEMP_GRASS_DRY',
    desc: 'flat 2D top-down arctic tundra gravelly soil ground tile, patches of pale olive-green and pale slate-blue lichen and hardy alpine moss, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_SNOW_A2_DEFAULT',
    name: 'Snow Field',
    ramp: 'NEUT_PALE_CREST',
    desc: 'flat 2D top-down packed winter snow and firn ground surface tile, clean crisp white snow with subtle pale cyan-blue shadow crevices, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_SCREE_A2_DEFAULT',
    name: 'Mountain Scree',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'flat 2D top-down broken grey angular stone scree and small pebble scatter ground tile, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_ASH_A2_DEFAULT',
    name: 'Volcanic Ash',
    ramp: 'NEUT_COOL_GRAY',
    desc: 'flat 2D top-down dark basaltic volcanic ash and cinders ground tile, gritty charcoal-grey volcanic soil, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_WATER_FRESH_A1_DEFAULT',
    name: 'Calm Water',
    ramp: 'WATER_SHALLOW_CLEAR',
    desc: 'flat 2D top-down calm clean blue freshwater surface tile, subtle gentle refractive surface ripple caustic texture, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat water surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_JUNGLE-FLOOR_A2_DEFAULT',
    name: 'Tropical Dirt',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'flat 2D top-down rich dark red-brown laterite tropical jungle soil ground tile, tiny decayed leaf specks, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_SWAMP-MUD_A2_DEFAULT',
    name: 'Peat Moss',
    ramp: 'WET_SOIL_PEAT',
    desc: 'flat 2D top-down dark spongy peat moss and saturated dark swamp earth ground tile, subtle organic texture, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_DRY-GRASS_A2_DEFAULT',
    name: 'Dry Grass',
    ramp: 'TEMP_GRASS_DRY',
    desc: 'flat 2D top-down arid savanna dry yellowish grass ground tile, sparse sun-bleached straw tufts and parched pale earth, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_TROPICAL-GRASS_A2_DEFAULT',
    name: 'Tropical Grass',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'flat 2D top-down dense vibrant emerald-green tropical jungle grass ground tile, thick broad rainforest blade texture, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_SHRUB-SOIL_A2_DEFAULT',
    name: 'Shrub Soil',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'flat 2D top-down dry scrubland sandy-loam ground tile, dusty earthy soil with tiny dried leaf fragments and gritty pebbles, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_DIRT_A2_DEFAULT',
    name: 'Dirt',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'flat 2D top-down fertile brown garden loam ground tile, finely crumbled rich soil with subtle organic granules, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_STONY_A2_DEFAULT',
    name: 'Stony Ground',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'flat 2D top-down hard-packed dirt and rough gravel stone scatter ground tile, embedded weathered pebbles, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_ICE_A2_DEFAULT',
    name: 'Glacial Ice',
    ramp: 'NEUT_PALE_CREST',
    desc: 'flat 2D top-down semi-translucent glacial ice sheet ground tile, deep pale cyan interior refractions and fine stress fracture lines, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_PEAK-ROCK_A2_DEFAULT',
    name: 'Peak Rock',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'flat 2D top-down dark weathered alpine peak slate rock ground tile, sharp stratified stone cleavage plates, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_BLESSED-GRASS_A2_DEFAULT',
    name: 'Blessed Grass',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'flat 2D top-down pristine radiant golden-green holy meadow grass ground tile, tiny luminous white flower petals, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_CURSED-GRASS_A2_DEFAULT',
    name: 'Cursed Grass',
    ramp: 'NEUT_COOL_GRAY',
    desc: 'flat 2D top-down blighted withered shadowy violet-black cursed grass ground tile, sickly pale fungal tendrils, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'SURFACE_SHARED_TERRAIN_ROAD_A2_DEFAULT',
    name: 'Dirt Road',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'flat 2D top-down packed dirt road and wagon trail ground tile, smooth worn earthen walkway with subtle gravel edges, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'ALL_SHARED_TERRAIN_CAVE-FLOOR_A2_DEFAULT',
    name: 'Cave Floor',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'flat 2D top-down natural cavern limestone floor ground tile, compact dark damp underground bedrock with fine mineral sediment, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  },
  {
    id: 'ALL_SHARED_TERRAIN_MINED-SOIL_A2_DEFAULT',
    name: 'Mined Soil',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'flat 2D top-down excavated earthen quarry trench ground tile, loosened shovelled clay and broken rock fragments, seamless edges, no cliff, no elevation drop, 16-bit top-down RPG pixel art, Ultima VII style, flat ground surface'
  }
];

// Natural World Objects
const NATURAL_OBJECTS = [
  {
    id: 'SURFACE_SHARED_STONE_GRANITE-BOULDER_V1_DEFAULT',
    name: 'Granite Boulder',
    ramp: 'HIGH_STONE_GRANITE',
    desc: 'A single large granite boulder, solitary natural landscape stone rock prop, 16-bit top-down RPG Maker pixel art in the style of Ultima VII and EverQuest. Rich saturated palette, strong contrast, bold silhouette, top-left light. Heavy, weathered, natural, angular intrusive igneous stone, coarse crystalline texture, sharp cleavage facets, readable at native scale. No magic, no vegetation, no civilization, no scenery. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_ROCKS-SMALL_V1_DEFAULT',
    name: 'Small Rocks',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A scattered cluster of small loose fieldstones and weathered rocks on the ground, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, crisp silhouette, natural stone facets, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_SAND-DEPOSIT_V1_DEFAULT',
    name: 'Sand Deposit',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'A natural low sandy mound deposit, fine golden-tan sand drift with subtle ripple contours, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, soft natural edge, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_GRASS-TUFT_V1_DEFAULT',
    name: 'Grass Tuft',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'A vibrant clump of tall wild grass blades, green meadow vegetation tuft, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, sharp individual blade tips, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_FLOWERS_V1_DEFAULT',
    name: 'Wildflowers',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'A charming clump of colorful wild meadow flowers with delicate white and yellow petals and fresh green stems, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_SNOW-BUSH_V1_DEFAULT',
    name: 'Snow Bush',
    ramp: 'NEUT_PALE_CREST',
    desc: 'A winter evergreen shrub dusted with fresh white snow, deep green hardy leaves frosted with ice, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, crisp silhouette, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_TREE_SAPLING_V1_DEFAULT',
    name: 'Tree Sapling',
    ramp: 'TEMP_BARK_OAK',
    desc: 'A young delicate deciduous tree sapling with slender brown stem and fresh tender green leaves, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'LOWER1_SHARED_FLORA_GLOW-CAPS_V1_DEFAULT',
    name: 'Glow Caps',
    ramp: 'WET_GRASS_SATURATED',
    desc: 'A cluster of bioluminescent subterranean mushrooms, soft luminous turquoise-cyan fungal caps on slender pale stalks, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, subterranean cavern flora, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'LOWER1_SHARED_STONE_STALAGMITE_V1_DEFAULT',
    name: 'Stalagmite',
    ramp: 'TEMP_STONE_LIMESTONE',
    desc: 'A sharp tapering limestone stalagmite rising from cavern stone, mineral dripping texture, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, angular rock facets, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_CRYSTAL-SMALL_V1_DEFAULT',
    name: 'Small Crystals',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A cluster of small sharp crystalline mineral shards protruding from rock, quartz crystal facets catching top-left light, 16-bit top-down RPG pixel art in the style of Ultima VII. Crisp sharp silhouette, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_REMAINS_RUBBLE_V1_DEFAULT',
    name: 'Stone Rubble',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A pile of broken angular stone rubble and fractured masonry debris, rough quarry waste, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, heavy cracked stone chunks, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STRUCTURE_WELL_V1_DEFAULT',
    name: 'Stone Well',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A rustic circular stone well built of weathered fieldstone with dark water inside, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, circular masonry wall, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_WILD-GRAIN_V1_DEFAULT',
    name: 'Wild Grain',
    ramp: 'TEMP_GRASS_DRY',
    desc: 'A dense upright clump of mature wild golden rye grain with heavy bearded seed heads and dry stalks, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, rich golden-amber palette, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_BUSH_V1_DEFAULT',
    name: 'Forest Bush',
    ramp: 'TEMP_FOLIAGE_OAK',
    desc: 'A rounded lush leafy green deciduous shrub bush, rich dense foliage, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, layered leaf shading, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_LICHEN_V1_DEFAULT',
    name: 'Rock Lichen',
    ramp: 'TEMP_GRASS_DRY',
    desc: 'A spreading crustose patch of pale dry lichen adhering flatly to the ground surface, jagged organic margins and subtle dry texture, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'LOWER1_SHARED_FLORA_CAVE-MOSS_V1_DEFAULT',
    name: 'Cave Moss',
    ramp: 'WET_GRASS_SATURATED',
    desc: 'A damp velvety patch of dark blue-green subterranean cave moss growing on stone, rich saturated organic texture, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'LOWER1_SHARED_FLORA_SPORE-REEDS_V1_DEFAULT',
    name: 'Spore Reeds',
    ramp: 'TEMP_GRASS_DRY',
    desc: 'A cluster of slender upright subterranean wetland spore reeds with bulbous pale spore pods atop dark stems, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_IRONSTONE_V1_DEFAULT',
    name: 'Ironstone Outcrop',
    ramp: 'HIGH_STONE_GRANITE',
    desc: 'A rugged dark angular rock outcrop streaked with heavy red-brown hematite iron ore veins, dense metallic mineral luster, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, sharp stone facets, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_REMAINS_RUBBLE-PILLAR_V1_DEFAULT',
    name: 'Rubble Pillar',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A broken ancient grey stone column stub resting in a pile of fallen fractured masonry rubble chunks, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, weathered stone cracks, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_REMAINS_SKELETON_V1_DEFAULT',
    name: 'Skeleton Remains',
    ramp: 'NEUT_WARM_GRAY',
    desc: 'An ancient weathered humanoid skeleton lying collapsed upon the ground, pale sun-bleached bones, ribcage and skull resting horizontally, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_ITEM_LOG_V1_DEFAULT',
    name: 'Fallen Log',
    ramp: 'TEMP_BARK_OAK',
    desc: 'A felled ancient hardwood timber tree log lying horizontally across the ground, rough bark ridges and weathered cut ends, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_CLAY-DEPOSIT_V1_DEFAULT',
    name: 'Clay Deposit',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'A dense natural clay bank deposit exposed on the ground surface, smooth earthy terracotta-grey clay layers, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_COAL-OUTCROP_V1_DEFAULT',
    name: 'Coal Outcrop',
    ramp: 'NEUT_VOID_BLACK',
    desc: 'A jagged natural rock outcrop rich with dense black glossy anthracite coal seams, dark mineral facets, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_COPPER-OUTCROP_V1_DEFAULT',
    name: 'Copper Outcrop',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A weathered rocky outcrop streaked with vibrant green verdigris malachite and rich reddish-orange copper metal veins, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_IRON-OUTCROP_V1_DEFAULT',
    name: 'Iron Outcrop',
    ramp: 'HIGH_STONE_GRANITE',
    desc: 'A heavy dark grey rock outcrop with dense rusty red-brown iron ore banding and metallic luster, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_SILVER-OUTCROP_V1_DEFAULT',
    name: 'Silver Outcrop',
    ramp: 'NEUT_COOL_GRAY',
    desc: 'A quartz rock outcrop shot through with gleaming veins of bright native silver metal, sharp crystalline inclusions, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_STONE_TIN-OUTCROP_V1_DEFAULT',
    name: 'Tin Outcrop',
    ramp: 'NEUT_WARM_GRAY',
    desc: 'A rough granite boulder outcrop bearing dark brownish-grey cassiterite tin ore crystals, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'ALL_SHARED_WORKSHOP_KITCHEN-HEARTH_V1_DEFAULT',
    name: 'Kitchen Hearth',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A rustic circular stone hearth of rough river stones filled with glowing embers, ash and charcoal, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'LOWER1_SHARED_FLORA_CAVE-MUSHROOMS_V1_DEFAULT',
    name: 'Cave Mushrooms',
    ramp: 'TEMP_GRASS_DRY',
    desc: 'A cluster of pale subterranean cavern shelf mushrooms and toadstools growing from damp ground, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'LOWER1_SHARED_STONE_SULFUR-CRUST_V1_DEFAULT',
    name: 'Sulfur Crust',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'A geothermal mineral crust of bright volcanic sulfur crystals and porous grey tephra stone, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_BERRY-BUSH-BARE_V1_DEFAULT',
    name: 'Berry Bush Bare',
    ramp: 'TEMP_FOLIAGE_OAK',
    desc: 'A wild forest berry shrub with green leaves but all berries harvested, slender bare fruiting sprigs and branches, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_BERRY-BUSH_V1_DEFAULT',
    name: 'Berry Bush',
    ramp: 'TEMP_FOLIAGE_OAK',
    desc: 'A lush wild forest berry bush laden with plump ripe juicy red and dark purple berries among rich green leaves, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_CACTUS-TALL_V1_DEFAULT',
    name: 'Tall Cactus',
    ramp: 'TEMP_FOLIAGE_OAK',
    desc: 'A tall arid desert saguaro cactus with ribbed green trunk and two upward branching arms with spiny ridges, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_CACTUS_V1_DEFAULT',
    name: 'Desert Cactus',
    ramp: 'TEMP_FOLIAGE_OAK',
    desc: 'A stout round ribbed desert barrel cactus with sharp clusters of pale golden spines and small yellow flower crown, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_DESERT-SHRUB_V1_DEFAULT',
    name: 'Desert Shrub',
    ramp: 'TEMP_GRASS_DRY',
    desc: 'A hardy multi-stemmed arid desert scrub bush with wiry greyish-brown branches and sparse dusty olive leaves, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_FERN_V1_DEFAULT',
    name: 'Woodland Fern',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'A bushy clump of lush dark green woodland fern fronds radiating outward, graceful feathery foliage, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_FLOWERS-BLUE_V1_DEFAULT',
    name: 'Blue Wildflowers',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'A delicate clump of wild meadow bluebells with vivid sky-blue petals and fresh green stalks, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_FLOWERS-PURPLE_V1_DEFAULT',
    name: 'Purple Wildflowers',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'A vibrant clump of wild purple heather and clover blossoms with deep violet-magenta petals and green foliage, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_FLOWERS-WHITE_V1_DEFAULT',
    name: 'White Wildflowers',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'A delicate patch of small star-shaped wild white meadow flowers with tender green stems, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_HEMP-WILD_V1_DEFAULT',
    name: 'Wild Hemp',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'An upright cluster of tall wild hemp stalks with characteristic fan-shaped serrated green leaves, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_HERBS-WILD_V1_DEFAULT',
    name: 'Wild Herbs',
    ramp: 'TEMP_GRASS_FERTILE',
    desc: 'A low aromatic cluster of wild medicinal herbs and leafy green sprigs with tiny yellow blossoms, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_LILY-PAD_V1_DEFAULT',
    name: 'Lily Pads',
    ramp: 'WET_GRASS_SATURATED',
    desc: 'A cluster of round floating green water lily pads with subtle notched leaf margins and a small pale water flower, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_REEDS_V1_DEFAULT',
    name: 'Water Reeds',
    ramp: 'WET_REED_RUSH',
    desc: 'A cluster of tall slender wetland water reeds and rushes with cylindrical dark brown cattail seed heads, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_ROOTS-WILD_V1_DEFAULT',
    name: 'Wild Roots',
    ramp: 'TEMP_SOIL_LOAM',
    desc: 'A cluster of partially exposed edible wild tuber roots and knotted rhizomes emerging from soil, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_FLORA_WHEAT-WILD_V1_DEFAULT',
    name: 'Wild Wheat',
    ramp: 'TEMP_GRASS_DRY',
    desc: 'A graceful patch of wild golden wheat stalks with full ripened grains swaying, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, warm amber tones, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_REMAINS_BONES-PILE_V1_DEFAULT',
    name: 'Bones Pile',
    ramp: 'NEUT_WARM_GRAY',
    desc: 'A scattered heap of bleached old animal bones, fractured ribs and a weathered beast skull lying on the ground, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_STONE_CRYSTAL_V1_DEFAULT',
    name: 'Crystal Cluster',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A dramatic cluster of large geometric translucent mineral crystal columns and spire prisms catching top-left light, 16-bit top-down RPG pixel art in the style of Ultima VII. Sharp glassy facets, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_STONE_GOLD-OUTCROP_V1_DEFAULT',
    name: 'Gold Outcrop',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A pale quartz rock boulder outcrop shot through with gleaming veins and sparkling nuggets of pure native yellow gold, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_STONE_GRAVEL_V1_DEFAULT',
    name: 'Gravel Scatter',
    ramp: 'TEMP_STONE_FIELDSTONE',
    desc: 'A natural scatter of small water-rounded river gravel and smooth weathered pebbles resting on the earth, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_STONE_PEAT-MOUND_V1_DEFAULT',
    name: 'Peat Mound',
    ramp: 'WET_SOIL_PEAT',
    desc: 'A low layered mound of cut rich dark brown bog peat turf blocks stacked to dry, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_TREE_STUMP_V1_DEFAULT',
    name: 'Tree Stump',
    ramp: 'TEMP_BARK_OAK',
    desc: 'A weathered freshly cut tree stump with visible concentric annual growth rings on top and gnarled surface roots gripping the ground, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'LOWER1_SHARED_STONE_CRYSTAL-SPIRE_V1_DEFAULT',
    name: 'Crystal Spire',
    ramp: 'MAGIC_ARCANE_CYAN',
    desc: 'A towering crystalline spire mineral outcrop rising vertically from cavern bedrock, translucent prismatic amethyst-cyan facets catching top-left light, sharp geometric crystal columns, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  },
  {
    id: 'SURFACE_SHARED_TREE_FRUIT-TREE-BARE_V1_DEFAULT',
    name: 'Fruit Tree Bare',
    ramp: 'TEMP_BARK_OAK',
    desc: 'A mature deciduous fruit orchard tree with leafy green canopy after harvest, bare fruiting spurs with all fruit picked, gnarled dark bark trunk and spreading branches, 16-bit top-down RPG pixel art in the style of Ultima VII. Top-left light, grounded at bottom baseline. Transparent background.'
  }
];

function buildTilePrompt(tile, entry) {
  return {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "assetId": tile.id,
    "contentId": entry.sourceIds.catalog[0] || entry.sourceIds.brief[0] || tile.id,
    "sheetId": entry.slot ? entry.slot.sheetId : null,
    "slotId": entry.slot ? entry.slot.slotId : null,
    "coordinates": entry.slot ? { x: entry.slot.x, y: entry.slot.y, w: entry.slot.w, h: entry.slot.h } : { x: 0, y: 0, w: 48, h: 48 },
    "runtimeFile": entry.runtime ? entry.runtime.file : null,
    "tool": "PixelLab",
    "settings": {
      "view": "High Top-Down",
      "outline": "none",
      "detail": "Highly detailed",
      "canvasSize": [48, 48],
      "background": "solid flat seamless"
    },
    "positivePrompt": tile.desc,
    "negativePrompt": "blurry, 3D render, anime, cute, isometric, cliff, elevation drop, perspective tilt, dither noise, glowing neon, borders, frames, UI, text, watermark",
    "paletteRamp": tile.ramp,
    "masterPalette": "art/palette/deus_master_world_palette_v1.hex",
    "anchor": { "type": "TILE", "x": 0, "y": 0 },
    "envelope": { "wMin": 48, "wTarget": 48, "wMax": 48, "hMin": 48, "hTarget": 48, "hMax": 48 },
    "status": entry.status === 'APPROVED' ? 'APPROVED' : 'QA_PENDING',
    "provenance": "reconstructed 2026-09-29",
    "notes": "reconstructed 2026-09-29"
  };
}

function buildObjectPrompt(obj, entry) {
  return {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "assetId": obj.id,
    "contentId": entry.sourceIds.catalog[0] || entry.sourceIds.brief[0] || obj.id,
    "sheetId": entry.slot ? entry.slot.sheetId : null,
    "slotId": entry.slot ? entry.slot.slotId : null,
    "coordinates": entry.slot ? { x: entry.slot.x, y: entry.slot.y, w: entry.slot.w, h: entry.slot.h } : null,
    "runtimeFile": entry.runtime ? entry.runtime.file : null,
    "tool": "PixelLab",
    "settings": {
      "view": "High Top-Down",
      "outline": "Selective outline",
      "detail": "Highly detailed",
      "canvasSize": [48, 48],
      "background": "transparent"
    },
    "positivePrompt": obj.desc,
    "negativePrompt": "blurry, 3D render, cartoon, anime, cute, isometric, cliff, elevation drop, perspective tilt, dither noise, glowing neon, borders, frames, UI, text, watermark",
    "paletteRamp": obj.ramp,
    "masterPalette": "art/palette/deus_master_world_palette_v1.hex",
    "anchor": entry.anchor || { "type": "GROUND", "x": 24, "y": 47 },
    "envelope": entry.envelope || { "wMin": 32, "wTarget": 42, "wMax": 48, "hMin": 28, "hTarget": 38, "hMax": 44 },
    "status": entry.status === 'APPROVED' ? 'APPROVED' : 'QA_PENDING',
    "provenance": "reconstructed 2026-09-29",
    "notes": "reconstructed 2026-09-29"
  };
}

let generatedCount = 0;

for (const t of FLAT_TILES) {
  const entry = cat.entries.find(e => e.id === t.id);
  if (!entry) {
    console.warn(`Tile entry not found in catalogue: ${t.id}`);
    continue;
  }
  const promptObj = buildTilePrompt(t, entry);
  const promptPath = path.join(PROMPTS_DIR, `${t.id}.json`);
  fs.writeFileSync(promptPath, JSON.stringify(promptObj, null, 2), 'utf8');
  generatedCount++;
}

for (const o of NATURAL_OBJECTS) {
  const entry = cat.entries.find(e => e.id === o.id);
  if (!entry) {
    continue;
  }
  const promptObj = buildObjectPrompt(o, entry);
  const promptPath = path.join(PROMPTS_DIR, `${o.id}.json`);
  fs.writeFileSync(promptPath, JSON.stringify(promptObj, null, 2), 'utf8');
  generatedCount++;
}

console.log(`Generated ${generatedCount} standardized art prompt files in art/prompts/.`);
