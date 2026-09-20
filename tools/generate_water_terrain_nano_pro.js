'use strict';

/**
 * tools/generate_water_terrain_nano_pro.js
 *
 * Calls Google Nano Banana Pro (gemini-3-pro-image) to generate:
 * 1. Matching Water Chip Sets with rounded natural edges for every terrain type:
 *    - Meadow Grass Shore Water
 *    - Sandy Beach Shore Water
 *    - Earthy Dirt / Scrub Soil Shore Water
 *    - Forest Floor / Woodland Shore Water
 *    - Swamp Mire Shore Water
 *    - Snow / Icy Tundra Shore Water
 *    - Stony / Rocky Riverbed Water
 * 2. High-fidelity Terrain Gradient Chip Sets for smooth bird's-eye view blending.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');
fs.mkdirSync(RAW_DIR, { recursive: true });

const tasks = [
    {
        name: 'Water Meadow Shore',
        output: path.join(RAW_DIR, 'nano_water_meadow_shores.png'),
        prompt: `16-bit SNES top-down pixel art tileset panel of sparkling clear blue river and lake water meeting LUSH GREEN MEADOW GRASS SHORELINES with natural, organic, ROUNDED CURVING EDGES.
Flat 3/4 top-down bird's-eye view RPG perspective (Final Fantasy VI / Chrono Trigger style).
Clean pixel art displaying:
1. Pure animated water surface with gentle rippling azure wave patterns, bright glints, and translucent cyan shallows.
2. Natural, organic ROUNDED shoreline contours (convex rounded capes, concave curving coves, natural meanders) where water laps against vibrant green grassy turf.
3. Soft turquoise water shallows and subtle white foam crests hugging the rounded curved grassy shoreline.
4. Smooth seamless tiling, crisp 16-bit pixel art, NO harsh square 90-degree blocky corners, NO staircase pixelation, natural smooth curves.
Strictly authentic pixel art with rich 16-bit palette.`
    },
    {
        name: 'Water Sand Beach Shore',
        output: path.join(RAW_DIR, 'nano_water_sand_shores.png'),
        prompt: `16-bit SNES top-down pixel art tileset panel of tropical azure ocean and lagoon water meeting WARM GOLDEN SANDY BEACH SHORELINES with natural, organic, ROUNDED CURVING EDGES.
Flat 3/4 top-down bird's-eye view RPG perspective (Final Fantasy VI / Chrono Trigger style).
Clean pixel art displaying:
1. Shimmering translucent tropical turquoise water with gentle wave crests.
2. Natural organic rounded sandy beach bays, curving sand spits, and smooth circular coastal contours.
3. Soft white foaming surf and wet translucent sand shallows seamlessly merging into warm dry golden sand.
4. Zero blocky staircase steps, natural smooth rounded shoreline arcs, authentic 16-bit pixel art.`
    },
    {
        name: 'Water Dirt Soil Shore',
        output: path.join(RAW_DIR, 'nano_water_dirt_shores.png'),
        prompt: `16-bit SNES top-down pixel art tileset panel of forest stream and pond water meeting RICH BROWN LOAM AND SCRUB DIRT SHORELINES with natural, organic, ROUNDED CURVING EDGES.
Flat 3/4 top-down bird's-eye view RPG perspective (Final Fantasy VI / Chrono Trigger style).
Clean pixel art displaying:
1. Deep fresh stream water with subtle current ripples.
2. Rounded organic muddy and earthy riverbanks, smooth curving water channels, rounded small river pebbles and fine silt along the water's edge.
3. Translucent shallows showing submerged earthy silt and pebble gradient.
4. Zero harsh blocky staircases, natural smooth flowing contours, authentic 16-bit retro RPG pixel art.`
    },
    {
        name: 'Water Swamp Mire Shore',
        output: path.join(RAW_DIR, 'nano_water_swamp_shores.png'),
        prompt: `16-bit SNES top-down pixel art tileset panel of dark stagnant swamp and bayou water meeting DARK PEAT MUD AND REED SHORELINES with natural, organic, ROUNDED CURVING EDGES.
Flat 3/4 top-down bird's-eye view RPG perspective (Final Fantasy VI / Chrono Trigger style).
Clean pixel art displaying:
1. Murky greenish-brown bog water with subtle oily sheens, floating algae specks, and soft murky shallows.
2. Natural rounded marshy hummocks, curving dark peat mire banks, and smooth wetland inlets.
3. Organic rounded muddy edges meeting dark soil and bog vegetation.
4. Zero harsh square steps, natural smooth wetland curves, authentic 16-bit pixel art.`
    },
    {
        name: 'Water Snow Ice Shore',
        output: path.join(RAW_DIR, 'nano_water_snow_shores.png'),
        prompt: `16-bit SNES top-down pixel art tileset panel of freezing glacial stream water meeting PURE WHITE SNOW AND FROSTY TUNDRA SHORELINES with natural, organic, ROUNDED CURVING EDGES.
Flat 3/4 top-down bird's-eye view RPG perspective (Final Fantasy VI / Chrono Trigger style).
Clean pixel art displaying:
1. Frigid deep cyan and indigo glacial water with floating ice crystal facets.
2. Rounded drifts of deep white snow banks, curving icy shorelines, and smooth rounded frosted shelves.
3. Pale translucent cyan ice shallows hugging the curved snowy banks.
4. Zero harsh blocky corners, organic smooth curving snow drifts, authentic 16-bit pixel art.`
    },
    {
        name: 'Water Stony Rock Shore',
        output: path.join(RAW_DIR, 'nano_water_rock_shores.png'),
        prompt: `16-bit SNES top-down pixel art tileset panel of rushing mountain stream water meeting GREY COBBLESTONE, SLATE GRAVEL, AND ROCKY SHORELINES with natural, organic, ROUNDED CURVING EDGES.
Flat 3/4 top-down bird's-eye view RPG perspective (Final Fantasy VI / Chrono Trigger style).
Clean pixel art displaying:
1. Crystal-clear fast alpine river water with white water spray and foaming rapids.
2. Smooth rounded river rocks, grey slate gravel banks, and natural curving boulder-lined shores.
3. Natural organic rounded shorelines where clear water flows smoothly around rounded rock formations.
4. Zero blocky staircases, authentic 16-bit retro pixel art.`
    },
    {
        name: 'Terrain Gradient Grassland',
        output: path.join(RAW_DIR, 'nano_terrain_gradient_grass.png'),
        prompt: `16-bit SNES top-down bird's-eye view pixel art terrain texture map showing a SMOOTH CONTINUOUS NATURAL GRADIENT TRANSITION across grassland biomes.
From a high birds-eye overview perspective:
Left to right smooth continuous organic transition:
- Deep lush vibrant emerald green grass with dense moist blades
- Transitioning smoothly into sunlit meadow turf with gentle warm olive-green tones
- Transitioning smoothly into soft dry yellowish-green pasture
- Transitioning smoothly into warm golden-khaki savanna grassland and wild hay.
CRITICAL CONSTRAINT: NO HARSH BLOCKY STAIRCASE BOUNDARIES, NO COARSE CHECKERBOARD DITHER CLUSTERS.
Smooth, natural, multi-tone organic pixel art blending with subtle natural micro-variations (clover, blades, soil specks). Seamless high-fidelity 16-bit RPG terrain map.`
    },
    {
        name: 'Terrain Gradient Earth Soil',
        output: path.join(RAW_DIR, 'nano_terrain_gradient_earth.png'),
        prompt: `16-bit SNES top-down bird's-eye view pixel art terrain texture map showing a SMOOTH CONTINUOUS NATURAL GRADIENT TRANSITION across earth and forest soils.
From a high birds-eye overview perspective:
Smooth continuous organic gradient transition:
- Dark damp rich woodland leaf litter with deep umber and moss tones
- Blending smoothly into rich brown fertile loamy garden soil
- Blending smoothly into warm reddish-brown clay dirt
- Blending smoothly into dry sandy scrub soil with fine pebbles.
CRITICAL CONSTRAINT: NO HARSH BLOCKY STAIRCASE BOUNDARIES, NO DIGITAL CHECKERBOARD DITHERING.
Smooth natural organic multi-tone blending that looks gorgeous and natural from high bird's-eye view zoom. High-fidelity 16-bit SNES pixel art.`
    }
];

async function run() {
    for (const task of tasks) {
        console.log(`\n========================================`);
        console.log(`Generating ${task.name}...`);
        console.log(`Output: ${task.output}`);
        if (fs.existsSync(task.output)) {
            console.log(`File already exists, skipping.`);
            continue;
        }
        await generateWithNanoBananaPro({
            prompt: task.prompt,
            outputPath: task.output,
            referenceImagePaths: []
        });
        console.log(`${task.name} generated successfully.`);
    }
    console.log('\nAll Water & Terrain Gradient chip sets generated successfully with Nano Banana Pro!');
}

run().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});

