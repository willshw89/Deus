const fs = require('fs');
const path = require('path');

// 1. Update System.json start coordinates to (128, 128)
const sysPath = path.join(__dirname, '..', 'game', 'data', 'System.json');
const sysData = JSON.parse(fs.readFileSync(sysPath, 'utf8'));
sysData.startMapId = 2;
sysData.startX = 128;
sysData.startY = 128;
fs.writeFileSync(sysPath, JSON.stringify(sysData));
console.log('Updated System.json start position to (128, 128)');

// 2. Deterministic 2D Simplex/Perlin noise for procedural terrain
class DFNoise2D {
    constructor(seed = 1337) {
        this.p = new Uint8Array(512);
        const perm = [];
        for (let i = 0; i < 256; i++) perm[i] = i;
        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 9301 + 49297) % 233280;
            const j = Math.floor((s / 233280) * (i + 1));
            const tmp = perm[i];
            perm[i] = perm[j];
            perm[j] = tmp;
        }
        for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y) {
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    sample(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;
        return this.lerp(v,
            this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
            this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
        );
    }
    octaves(x, y, octs = 3, persistence = 0.5) {
        let total = 0, freq = 1, amp = 1, maxAmp = 0;
        for (let i = 0; i < octs; i++) {
            total += this.sample(x * freq, y * freq) * amp;
            maxAmp += amp;
            amp *= persistence;
            freq *= 2;
        }
        return total / maxAmp;
    }
}

// 3. Synthesize Map002.json at 256x256 with Middle Start at (128, 128)
const mapPath = path.join(__dirname, '..', 'game', 'data', 'Map002.json');
const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const W = 256;
const H = 256;
mapData.width = W;
mapData.height = H;

const cells = W * H; // 65,536
const data = new Array(cells * 6).fill(0);
const index = (x, y, layer) => (layer * H + y) * W + x;

const noise = new DFNoise2D(7771337);

// Events array
const events = [null];
let nextEventId = 1;

function addEvent(spec) {
    const id = nextEventId++;
    const ev = {
        id: id,
        name: spec.name,
        note: spec.note || "",
        x: spec.x,
        y: spec.y,
        pages: [{
            conditions: {
                actorId: 1, actorValid: false, itemId: 1, itemValid: false,
                selfSwitchCh: "A", selfSwitchValid: false, switch1Id: 1, switch1Valid: false,
                switch2Id: 1, switch2Valid: false, variableId: 1, variableValid: false, variableValue: 0
            },
            directionFix: !!spec.directionFix,
            image: {
                characterName: spec.characterName || "",
                characterIndex: spec.characterIndex || 0,
                direction: spec.direction || 2,
                pattern: 1,
                tileId: 0
            },
            list: [{ code: 0, indent: 0, parameters: [] }],
            moveFrequency: 3,
            moveRoute: { list: [{ code: 0, parameters: [] }], repeat: true, skippable: false, wait: false },
            moveSpeed: 3,
            moveType: 0,
            priorityType: spec.priorityType !== undefined ? spec.priorityType : 1,
            stepAnime: false,
            through: !!spec.through,
            trigger: 0,
            walkAnime: spec.walkAnime !== undefined ? spec.walkAnime : true
        }]
    };
    events[id] = ev;
    return id;
}

// Event 1: Adam at (125, 128)
addEvent({
    name: "Adam",
    x: 125,
    y: 128,
    characterName: "$Adam",
    characterIndex: 0,
    direction: 2,
    note: "<colonist> <faction:player> <role:builder>",
    priorityType: 1,
    walkAnime: true
});

// Event 2: Eve at (128, 129)
addEvent({
    name: "Eve",
    x: 128,
    y: 129,
    characterName: "$Eve",
    characterIndex: 0,
    direction: 2,
    note: "<colonist> <faction:player> <role:forager>",
    priorityType: 1,
    walkAnime: true
});

// Event 3: Ancient Fruit Tree at (127, 126)
addEvent({
    name: "Ancient Fruit Tree",
    x: 127,
    y: 126,
    characterName: "!$FruitTree",
    characterIndex: 0,
    direction: 2,
    note: "<tree> <canopy> <harvestable> <fruit>",
    priorityType: 1,
    directionFix: true,
    walkAnime: false
});

// Event 4: Primordial Campfire Hearth Site at (127, 128)
addEvent({
    name: "Communal Campfire Hearth",
    x: 127,
    y: 128,
    characterName: "!$Campfire",
    characterIndex: 0,
    direction: 2,
    note: "<hearth> <social_hub> <shelter_center>",
    priorityType: 1,
    directionFix: true,
    walkAnime: true,
    stepAnime: true
});

// Procedural Faction Settlements across 256x256
// 1. Sylvan Wood-Walkers (Northwest Deep Forest)
addEvent({
    name: "Sylvan Shaman Lyra",
    x: 60, y: 60,
    characterName: "Actor1", characterIndex: 6,
    note: "<faction:sylvan> <role:shaman> <hostile:false>",
    priorityType: 1, walkAnime: true
});
addEvent({
    name: "Sylvan Scout",
    x: 59, y: 61,
    characterName: "Actor1", characterIndex: 7,
    note: "<faction:sylvan> <role:scout> <hostile:false>",
    priorityType: 1, walkAnime: true
});
addEvent({
    name: "Sylvan Forest Totem",
    x: 60, y: 59,
    characterName: "!Other1", characterIndex: 2,
    note: "<faction:sylvan> <structure:totem>",
    priorityType: 1, directionFix: true, walkAnime: false
});

// 2. High Crag Clan (Northeast Taiga Crags)
addEvent({
    name: "Crag-Thane Torvald",
    x: 190, y: 50,
    characterName: "Actor2", characterIndex: 0,
    note: "<faction:crag> <role:thane> <hostile:false>",
    priorityType: 1, walkAnime: true
});
addEvent({
    name: "Crag Miner",
    x: 191, y: 51,
    characterName: "Actor2", characterIndex: 1,
    note: "<faction:crag> <role:miner> <hostile:false>",
    priorityType: 1, walkAnime: true
});
addEvent({
    name: "Crag Mountain Forge",
    x: 190, y: 49,
    characterName: "!Other2", characterIndex: 0,
    note: "<faction:crag> <structure:forge>",
    priorityType: 1, directionFix: true, walkAnime: false
});

// 3. Riverfolk Fisher Clan (South River Meander)
addEvent({
    name: "River-Elder Maeve",
    x: 145, y: 195,
    characterName: "Actor3", characterIndex: 2,
    note: "<faction:riverfolk> <role:elder> <hostile:false>",
    priorityType: 1, walkAnime: true
});
addEvent({
    name: "River Fisher",
    x: 144, y: 196,
    characterName: "Actor3", characterIndex: 3,
    note: "<faction:riverfolk> <role:fisher> <hostile:false>",
    priorityType: 1, walkAnime: true
});

// 4. Wilderness Marauders (Southwest Arid Badlands)
addEvent({
    name: "Marauder Warlord Gorgar",
    x: 50, y: 190,
    characterName: "Actor2", characterIndex: 4,
    note: "<faction:marauders> <role:warlord> <hostile:true>",
    priorityType: 1, walkAnime: true
});
addEvent({
    name: "Marauder Raider",
    x: 49, y: 191,
    characterName: "Actor2", characterIndex: 5,
    note: "<faction:marauders> <role:raider> <hostile:true>",
    priorityType: 1, walkAnime: true
});
addEvent({
    name: "Marauder War Totem",
    x: 50, y: 189,
    characterName: "!Other1", characterIndex: 6,
    note: "<faction:marauders> <structure:war_totem>",
    priorityType: 1, directionFix: true, walkAnime: false
});

// Generate 256x256 tiles and procedural wilderness events
const TILE_GRASS = 2863;
const TILE_RIVER_WEST = 2064;
const TILE_RIVER_DEEP = 2048;
const TILE_RIVER_EAST = 2072;
const TILE_LILYPAD = 253;
const TILE_SOIL = 2816;

for (let y = 0; y < H; y++) {
    // Meandering river anchored at x=136 at glade latitude (y=128)
    const meander = Math.sin((y - 128) * 0.035) * 12 + noise.sample((y - 128) * 0.02, 13.37) * 6;
    const riverCenter = Math.floor(136 + meander);

    for (let x = 0; x < W; x++) {
        // 1. Continuous River
        if (x >= riverCenter - 1 && x <= riverCenter + 1) {
            if (x === riverCenter - 1) {
                data[index(x, y, 0)] = TILE_RIVER_WEST;
            } else if (x === riverCenter) {
                data[index(x, y, 0)] = TILE_RIVER_DEEP;
                if ((x * 17 + y * 31) % 19 === 0) {
                    data[index(x, y, 1)] = TILE_LILYPAD;
                }
            } else {
                data[index(x, y, 0)] = TILE_RIVER_EAST;
            }
            data[index(x, y, 5)] = 10; // Region 10: River
            continue;
        }

        // 2. Fertile Embark Glade Sanctuary around Adam & Eve
        const distFromCenter = Math.hypot(x - 127, y - 128);
        if (distFromCenter < 7.5) {
            data[index(x, y, 0)] = TILE_GRASS;
            data[index(x, y, 5)] = 1; // Region 1: Glade Sanctuary
            continue;
        }

        // 3. Faction Settlement Clearings
        const distSylvan = Math.hypot(x - 60, y - 60);
        const distCrag = Math.hypot(x - 190, y - 50);
        const distRiverfolk = Math.hypot(x - 145, y - 195);
        const distMarauders = Math.hypot(x - 50, y - 190);
        if (distSylvan < 5 || distCrag < 5 || distRiverfolk < 5 || distMarauders < 5) {
            data[index(x, y, 0)] = (distCrag < 5 || distMarauders < 5) ? TILE_SOIL : TILE_GRASS;
            data[index(x, y, 5)] = 2; // Region 2: Faction Territory
            continue;
        }

        // 4. Wilderness elevation & biome fields
        const elevation = noise.octaves(x * 0.02, y * 0.02, 3);
        const forestVal = noise.octaves(x * 0.04, y * 0.04, 2);

        // Ground terrain
        if (elevation < -0.35) {
            data[index(x, y, 0)] = TILE_SOIL;
        } else {
            data[index(x, y, 0)] = TILE_GRASS;
        }

        // Sparse procedural entity placement across 256x256 (up to limit of 400 events)
        if (nextEventId < 350 && distFromCenter >= 10 && distSylvan >= 6 && distCrag >= 6 && distRiverfolk >= 6 && distMarauders >= 6) {
            const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
            const roll = hash - Math.floor(hash);

            // Boreal Taiga (high elevation): 2.5D Pine Trees & Granite Boulders
            if (elevation > 0.30) {
                if (roll < 0.03) {
                    addEvent({
                        name: "Wilderness Pine",
                        x: x, y: y,
                        characterName: "!$PineTree",
                        note: "<tree> <canopy> <harvestable>",
                        priorityType: 1, directionFix: true, walkAnime: false
                    });
                } else if (roll > 0.97) {
                    addEvent({
                        name: "Granite Boulder",
                        x: x, y: y,
                        characterName: "!$GraniteBoulder",
                        note: "<stone> <mineable>",
                        priorityType: 1, directionFix: true, walkAnime: false
                    });
                }
            }
            // Dense Timberland (temperate forest): 2.5D Timber Oaks & Berry Bushes
            else if (forestVal > 0.35) {
                if (roll < 0.035) {
                    addEvent({
                        name: "Wilderness Timber Oak",
                        x: x, y: y,
                        characterName: "!$TimberOak",
                        note: "<tree> <canopy> <harvestable>",
                        priorityType: 1, directionFix: true, walkAnime: false
                    });
                } else if (roll > 0.96) {
                    addEvent({
                        name: "Wild Berry Bush",
                        x: x, y: y,
                        characterName: "!$BerryBush",
                        note: "<bush> <harvestable>",
                        priorityType: 1, directionFix: true, walkAnime: false
                    });
                }
            }
            // Mineral Hills: Ironstone Deposits
            else if (elevation < -0.25 && roll < 0.02) {
                addEvent({
                    name: "Ironstone Deposit",
                    x: x, y: y,
                    characterName: "!$IronstoneDeposit",
                    note: "<mineral> <iron> <mineable>",
                    priorityType: 1, directionFix: true, walkAnime: false
                });
            }
        }
    }
}

mapData.data = data;
mapData.events = events;

fs.writeFileSync(mapPath, JSON.stringify(mapData));
console.log(`Successfully generated 256x256 Map002 with Middle Start at (128, 128) and ${events.length - 1} events.`);
