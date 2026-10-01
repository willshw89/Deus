const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const mapPath = path.join(ROOT, 'game', 'data', 'Map001.json');

console.log('--- Generating Ground Demonstration Map (Map001.json) ---');

const width = 50;
const height = 40;
const totalTiles = width * height;
const data = new Array(totalTiles * 6).fill(0);

// Helper to set tile on layer
function setTile(layer, x, y, tileId) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = layer * totalTiles + y * width + x;
    data[idx] = tileId;
}

function fillRect(layer, x1, y1, w, h, tileId) {
    for (let y = y1; y < y1 + h; y++) {
        for (let x = x1; x < x1 + w; x++) {
            setTile(layer, x, y, tileId);
        }
    }
}

// 1. Base Layer (Layer 0) - Meadow Grass Everywhere
console.log('Filling Layer 0 with base Temperate Meadow Grass...');
fillRect(0, 0, 0, width, height, 2816); // Outside_A2 slot 0 (Meadow)

// 2. Cross Avenues (Earthen Game Trail / Road - Outside_A2 slot 22 = 3872)
console.log('Carving central crossroads and trail avenues...');
// North-South Avenue
fillRect(0, 24, 0, 2, height, 3872);
// East-West Avenue
fillRect(0, 0, 19, width, 2, 3872);

// Surrounding plaza around player start (25, 20)
fillRect(0, 22, 17, 6, 6, 3872);
fillRect(0, 23, 18, 4, 4, 2816); // Meadow center island

// 3. ZONE 1: GRASSLANDS & WOODLANDS (North-West)
console.log('Building Zone 1: Grasslands & Woodlands (NW)...');
// Patches:
// Temperate Meadow (slot 0: 2816)
fillRect(0, 3, 3, 4, 3, 2816);
// Lush Flowering Grass (slot 1: 2864)
fillRect(0, 8, 3, 4, 3, 2864);
// Dry Grass Base (slot 2: 2912)
fillRect(0, 13, 3, 4, 3, 2912);
// Dry Grass Parched Dry (slot 6: 3104) & Damp (slot 7: 3152)
fillRect(0, 18, 3, 2, 3, 3104);
fillRect(0, 20, 3, 2, 3, 3152);

// Shrub Soil Base (slot 3: 2960)
fillRect(0, 3, 7, 4, 3, 2960);
// Shrub Soil Damp (slot 9: 3248) & Dry (slot 8: 3200)
fillRect(0, 8, 7, 2, 3, 3248);
fillRect(0, 10, 7, 2, 3, 3200);
// Forest Floor Base (slot 4: 3008)
fillRect(0, 13, 7, 4, 3, 3008);
// Forest Floor Damp (slot 20: 3776) & Dry (slot 23: 3920)
fillRect(0, 18, 7, 2, 3, 3776);
fillRect(0, 20, 7, 2, 3, 3920);

// Needle Floor Base (slot 5: 3056)
fillRect(0, 3, 11, 4, 3, 3056);
// Needle Floor Damp (D: 524) & Dry (D: 525)
fillRect(0, 8, 11, 2, 3, 524);
fillRect(0, 10, 11, 2, 3, 525);
// Shaded Forest Meadow Transition
fillRect(0, 13, 11, 4, 3, 3008);
fillRect(0, 18, 11, 4, 3, 3056);

// 4. ZONE 2: EARTH, SOIL & SHORELINE (South-West)
console.log('Building Zone 2: Earth, Soil & Shoreline (SW)...');
// Loam Dirt Base (slot 17: 3632)
fillRect(0, 3, 23, 4, 3, 3632);
// Loam Dirt Damp (slot 18: 3680)
fillRect(0, 8, 23, 4, 3, 3680);
// Loam Dirt Dry (slot 19: 3728)
fillRect(0, 13, 23, 4, 3, 3728);
// Lake Sand Base (slot 10: 3296)
fillRect(0, 18, 23, 4, 3, 3296);

// Lake Sand Damp (slot 24: 3968) & Dry (slot 25: 4016)
fillRect(0, 3, 27, 2, 3, 3968);
fillRect(0, 5, 27, 2, 3, 4016);
// Marsh Mud Base (slot 15: 3536) & Damp (slot 30: 4256)
fillRect(0, 8, 27, 2, 3, 3536);
fillRect(0, 10, 27, 2, 3, 4256);
// Swamp Peat Mud Base (slot 16: 3584) & Damp (slot 31: 4304)
fillRect(0, 13, 27, 2, 3, 3584);
fillRect(0, 15, 27, 2, 3, 4304);
// Peat Mud Dry (D: 543) & Marsh Mud Dry (D: 540)
fillRect(0, 18, 27, 2, 3, 543);
fillRect(0, 20, 27, 2, 3, 540);

// Natural Shoreline Basin (Sand & Marsh Mud surrounding Calm Water 2048)
fillRect(0, 3, 31, 10, 6, 3296); // Sand beach
fillRect(0, 13, 31, 8, 6, 3536); // Mud wetland
fillRect(0, 5, 32, 6, 4, 2048);  // Open fresh water body (Outside_A1)

// 5. ZONE 3: ROCK, SCREE & PEAKS (North-East)
console.log('Building Zone 3: Rock, Scree & Mountain Peaks (NE)...');
// Stony Ground Base (slot 11: 3344)
fillRect(0, 28, 3, 4, 3, 3344);
// Stony Ground Damp (slot 12: 3392) & Dry (D: 531)
fillRect(0, 33, 3, 2, 3, 3392);
fillRect(0, 35, 3, 2, 3, 531);
// Mountain Scree Base (slot 21: 3824)
fillRect(0, 38, 3, 4, 3, 3824);
// Mountain Scree Damp (slot 26: 4064) & Dry (slot 27: 4112)
fillRect(0, 43, 3, 2, 3, 4064);
fillRect(0, 45, 3, 2, 3, 4112);

// Granite Bedrock Base (slot 13: 3440)
fillRect(0, 28, 7, 4, 3, 3440);
// Granite Bedrock Damp (slot 28: 4160) & Dry (slot 29: 4208)
fillRect(0, 33, 7, 2, 3, 4160);
fillRect(0, 35, 7, 2, 3, 4208);
// Mountain Peak Crag Rock Base (slot 14: 3488)
fillRect(0, 38, 7, 4, 3, 3488);
// Mountain Peak Crag Damp (D: 536) & Dry (D: 537)
fillRect(0, 43, 7, 2, 3, 536);
fillRect(0, 45, 7, 2, 3, 537);

// High Mountain Pass Blend
fillRect(0, 28, 11, 5, 4, 3824);
fillRect(0, 34, 11, 6, 4, 3440);
fillRect(0, 41, 11, 6, 4, 3488);

// 6. ZONE 4: SUBTERRANEAN & QUARRY CUTS (South-East)
console.log('Building Zone 4: Subterranean & Excavation Cuts (SE)...');
// Natural Cave Stone Floor (D: 551)
fillRect(0, 28, 23, 4, 3, 551);
// Compacted Dug Earth Floor (D: 552)
fillRect(0, 33, 23, 4, 3, 552);
// Chiseled Mined Stone Floor (D: 553)
fillRect(0, 38, 23, 4, 3, 553);
// Deep Earth Solid Rock Cap (D: 548)
fillRect(0, 43, 23, 4, 3, 548);

// Excavation Trench / Mine Works
fillRect(0, 28, 28, 8, 4, 552); // Dug earth trench
fillRect(0, 36, 28, 8, 4, 553); // Mined stone hall
fillRect(0, 32, 33, 10, 4, 551); // Natural cavern opening

// 7. ZONE 5: THE COMPLETE 42-SPECIMEN GALLERY RUNWAY
console.log('Building Zone 5: 42-Specimen 1:1 Swatch Runway (y: 38)...');
// Swatches 0 to 41 placed along row y: 38 across columns 4 to 45
for (let i = 0; i < 42; i++) {
    const tileId = 512 + Math.floor(i / 16) * 16 + (i % 16);
    setTile(1, 4 + i, 38, tileId); // Layer 1 on top of path
}

// 8. Construct Events (Signposts & Informational Inspection Markers)
console.log('Creating interactive signpost events...');
const events = [null]; // 1-indexed in RMMZ

function createSignpost(id, x, y, title, lines) {
    const messageLines = [
        `\\c[14]【 ${title} 】\\c[0]`,
        ...lines
    ];
    return {
        id: id,
        name: `Sign_${title}`,
        note: '',
        x: x,
        y: y,
        pages: [
            {
                conditions: {
                    actorId: 1, actorValid: false, itemId: 1, itemValid: false,
                    selfSwitchCh: 'A', selfSwitchValid: false, switch1Id: 1, switch1Valid: false,
                    switch2Id: 1, switch2Valid: false, variableId: 1, variableValid: false, variableValue: 0
                },
                directionFix: true,
                image: {
                    characterIndex: 0,
                    characterName: '!Switch1',
                    direction: 2,
                    pattern: 1
                },
                list: [
                    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
                    ...messageLines.map(text => ({ code: 401, indent: 0, parameters: [text] })),
                    { code: 0, indent: 0, parameters: [] }
                ],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1, // Same as characters (blocks, can talk to it)
                stepAnime: false,
                through: false,
                trigger: 0, // Action button (Space/Enter)
                walkAnime: false
            }
        ]
    };
}

let eventId = 1;

// Central Welcome Signpost
events.push(createSignpost(
    eventId++, 26, 18,
    'DEUS GROUND ART SHOWCASE',
    [
        'All 41+ authentic Owner-generated ground tiles from PixelLab.',
        'Palette-snapped to DEUS Master Palette; 100% original.',
        'NW: Grass/Woods | SW: Earth/Sand/Water',
        'NE: Rock/Scree/Peaks | SE: Subterranean Cuts | South: 42-Swatch Gallery'
    ]
));

// Zone 1: Grasslands Signpost
events.push(createSignpost(
    eventId++, 2, 2,
    'ZONE 1: GRASSLANDS & WOODLANDS',
    [
        '• Meadow Grass & Lush Flowering Grass',
        '• Dry Grass: Base, Damp (after rain), Dry (parched)',
        '• Shrub Soil: Base, Damp, Dry (scrubland)',
        '• Forest Floor (Leaf Litter) & Needle Floor (Pine)'
    ]
));

// Zone 2: Earth & Shoreline Signpost
events.push(createSignpost(
    eventId++, 2, 22,
    'ZONE 2: EARTH, SOIL & SHORELINE',
    [
        '• Loam Dirt: Base, Damp, Dry',
        '• Lake-Shore Sand: Base, Damp (wet edge), Dry',
        '• Marsh Mud: Base, Damp (glossy), Dry',
        '• Swamp Peat Mud: Base, Damp (dark peat), Dry',
        '• Natural shoreline transition around fresh water'
    ]
));

// Zone 3: Rock & Scree Signpost
events.push(createSignpost(
    eventId++, 27, 2,
    'ZONE 3: ROCK, SCREE & MOUNTAIN PEAKS',
    [
        '• Stony Ground: Base, Damp, Dry (fieldstone scatter)',
        '• Granite Bedrock: Base, Damp (rain-wet), Dry',
        '• Mountain Scree: Base, Damp, Dry (angular broken stones)',
        '• Mountain Peak Crag: Base, Damp, Dry (fractured cliff)'
    ]
));

// Zone 4: Subterranean Signpost
events.push(createSignpost(
    eventId++, 27, 22,
    'ZONE 4: SUBTERRANEAN & QUARRY FLOORS',
    [
        '• Natural Cave Stone Floor (damp mineral grain)',
        '• Compacted Dug Earth Floor (pick marks, excavated)',
        '• Chiseled Mined Stone Floor (worked masonry)',
        '• Deep Earth Bedrock Cap & Compacted Soil Cap'
    ]
));

// Zone 5: Gallery Runway Signpost
events.push(createSignpost(
    eventId++, 2, 38,
    'ZONE 5: 42-SPECIMEN 1:1 GALLERY',
    [
        'Every single inducted ground specimen rendered sequentially',
        'at exact 48x48 1:1 native pixel scale on Sheet D.',
        'Walk East along the runway to inspect all 42 variants.'
    ]
));

// Reference Props Demonstration (Boulder, Small rocks, Berry bush, Fallen log)
function createPropEvent(id, x, y, charName, note) {
    return {
        id: id,
        name: `Prop_${charName}`,
        note: note || '',
        x: x,
        y: y,
        pages: [
            {
                conditions: {
                    actorId: 1, actorValid: false, itemId: 1, itemValid: false,
                    selfSwitchCh: 'A', selfSwitchValid: false, switch1Id: 1, switch1Valid: false,
                    switch2Id: 1, switch2Valid: false, variableId: 1, variableValid: false, variableValue: 0
                },
                directionFix: true,
                image: {
                    characterIndex: 0,
                    characterName: charName,
                    direction: 2,
                    pattern: 0
                },
                list: [
                    { code: 101, indent: 0, parameters: ['', 0, 0, 2, ''] },
                    { code: 401, indent: 0, parameters: [`\\c[14]【 ${charName.replace(/^!+/, '')} 】\\c[0]`] },
                    { code: 401, indent: 0, parameters: [note || 'Natural world entity resting on native ground.'] },
                    { code: 0, indent: 0, parameters: [] }
                ],
                moveFrequency: 3,
                moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
                moveSpeed: 3,
                moveType: 0,
                priorityType: 1,
                stepAnime: false,
                through: false,
                trigger: 0,
                walkAnime: false
            }
        ]
    };
}

// Granite Boulder resting on Granite Bedrock
events.push(createPropEvent(eventId++, 30, 8, '!UF_GraniteBoulder_V8', 'Granite boulder resting on native granite bedrock.'));
// Small Rocks resting on Stony Ground
events.push(createPropEvent(eventId++, 30, 4, '!UF_RocksSmall_V8', 'Loose stones and weathered fieldstones on stony ground.'));
// Berry Bush on Shrub Soil
events.push(createPropEvent(eventId++, 5, 8, '!UF_BerryBush_V8', 'Berry bush thriving on shrub soil.'));
// Fallen Log on Forest Floor
events.push(createPropEvent(eventId++, 15, 8, '!UF_FallenLog_V8', 'Weathered fallen tree log resting on oak/ash leaf litter.'));
// Wildflowers on Lush Grass
events.push(createPropEvent(eventId++, 10, 4, '!$UF_Wildflowers', 'Vibrant wildflowers blooming on lush flowering grass.'));

// 9. Assemble final Map001 JSON
const mapObj = {
    autoplayBgm: false,
    autoplayBgs: false,
    bgs: { name: '', pan: 0, pitch: 100, volume: 90 },
    bgm: { name: '', pan: 0, pitch: 100, volume: 90 },
    battleback1Name: '',
    battleback2Name: '',
    disableDashing: false,
    displayName: 'DEUS Natural World — PixelLab Ground Showcase',
    dorphan: false,
    encounterList: [],
    encounterStep: 30,
    height: height,
    note: '', // Clean outdoor daylight
    parallaxLoopX: false,
    parallaxLoopY: false,
    parallaxName: '',
    parallaxShow: true,
    parallaxSx: 0,
    parallaxSy: 0,
    scrollType: 0,
    specifyBattleback: false,
    tilesetId: 2, // Outside tileset with Outside_A2 and Outside_D
    width: width,
    data: data,
    events: events
};

fs.writeFileSync(mapPath, JSON.stringify(mapObj, null, 2));
console.log(`Saved demonstration map to ${mapPath} (${width}x${height}, tilesetId: 2, ${events.length - 1} events)`);
