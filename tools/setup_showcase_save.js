"use strict";
const fs = require("fs");
const path = require("path");
const pako = require("../game/js/libs/pako.min.js");

const savePath = path.join(__dirname, "../game/save/file0.rmmzsave");
const backupPath = path.join(__dirname, "../game/save/file0.rmmzsave.bak");
const globalPath = path.join(__dirname, "../game/save/global.rmmzsave");

if (fs.existsSync(savePath)) {
    fs.copyFileSync(savePath, backupPath);
    console.log("Created backup at", backupPath);
}

const raw = fs.readFileSync(savePath, "utf8");
const data = JSON.parse(pako.inflate(raw, { to: "string" }));

// 1. Switch player faction to f1 (The Ostbela Kingdom, human)
const factions = data.ufWorld.factions;
factions.playerId = "f1";
const f1 = factions.list.find(f => f.id === "f1");
const f2 = factions.list.find(f => f.id === "f2");
if (f1) f1.isPlayer = true;
if (f2) f2.isPlayer = false;

// 2. Set home colony to site 2 (Solirwyn, x: 69, y: 54)
const site2 = data.ufWorld.history.sites.find(s => s.id === 2);
if (site2) {
    site2.faction = "f1";
    site2.ruined = null;
}
data.ufWorld.colony = {
    version: 2,
    factionId: "f1",
    siteId: 2,
    site: { x: 69, y: 54 },
    area: { x: 0, y: 0 },
    z: 0,
    radius: 4,
    plan: data.ufWorld.colony ? data.ufWorld.colony.plan : [],
    stockpiles: data.ufWorld.colony ? data.ufWorld.colony.stockpiles : [],
    log: [{ tick: 0, text: "The Ostbela Kingdom settled at Solirwyn" }],
    settlements: {},
    settlementsReady: true
};

// 3. Move camera and player to (69, 54)
data.player._x = 69;
data.player._y = 54;
data.player._realX = 69;
data.player._realY = 54;
data.player._direction = 2;
data.map._displayX = 69 - 8;
data.map._displayY = 54 - 6;

// 4. Gather f1 units and set them to kind: 'colonist', ai: 'colonist'
const units = data.ufWorld.units;
const f1Units = Object.values(units).filter(u => u.data && u.data.faction === "f1");

// Cluster existing 8 adults nicely around the campfire (69, 54)
const adultOffsets = [
    [-1, -1], [0, -1], [1, -1],
    [-2, 0],           [2, 0],
    [-1, 1],  [0, 1],  [1, 1]
];

f1Units.forEach((u, i) => {
    u.data.kind = "colonist";
    u.data.ai = "colonist";
    const off = adultOffsets[i % adultOffsets.length];
    u.x = 69 + off[0];
    u.y = 54 + off[1];
    u.z = 0;
    u.area = { x: 0, y: 0 };
    u.goal = null;
    u.stuckFrames = 0;
    const v = u.data.variation || 1;
    const isMale = u.data.gender === "male";
    u.image = { characterName: isMale ? `$UF_Human_Male_${v}_Walk` : `$UF_Human_Female_${v}_Walk`, characterIndex: 0 };
    u.data.face = { sheet: isMale ? "UF_Faces_human_1" : "UF_Faces_human_2", index: v - 1 };
    delete u.data.tint;
});

// 5. Add 2 Children and 2 Elders to complete demographic showcase
const newMembers = [
    {
        id: 301,
        name: "Robbie",
        gender: "male",
        age: 6,
        stage: "child",
        variation: 1,
        image: "$UF_Human_Child_Walk",
        face: { sheet: "UF_Faces_human_1", index: 6 },
        x: 69 - 1,
        y: 54 + 2,
        fatherId: 7,
        motherId: 8
    },
    {
        id: 302,
        name: "Elise",
        gender: "female",
        age: 8,
        stage: "child",
        variation: 2,
        image: "$UF_Human_Child_Walk",
        face: { sheet: "UF_Faces_human_1", index: 7 },
        x: 69 + 1,
        y: 54 + 2,
        fatherId: 11,
        motherId: 12
    },
    {
        id: 303,
        name: "Aldous",
        gender: "male",
        age: 60,
        stage: "elder",
        variation: 1,
        image: "$UF_Human_Male_1_Walk",
        face: { sheet: "UF_Faces_human_2", index: 6 },
        x: 69 - 2,
        y: 54 + 1
    },
    {
        id: 304,
        name: "Marta",
        gender: "female",
        age: 63,
        stage: "elder",
        variation: 2,
        image: "$UF_Human_Female_1_Walk",
        face: { sheet: "UF_Faces_human_2", index: 7 },
        x: 69 + 2,
        y: 54 + 1
    }
];

for (const m of newMembers) {
    units[m.id] = {
        id: m.id,
        name: m.name,
        image: { characterName: m.image, characterIndex: 0 },
        area: { x: 0, y: 0 },
        x: m.x,
        y: m.y,
        z: 0,
        dir: 2,
        dir8: 2,
        goal: null,
        stuckFrames: 0,
        data: {
            kind: "colonist",
            faction: "f1",
            species: "human",
            ai: "colonist",
            home: { area: { x: 0, y: 0 }, x: 69, y: 54, z: 0 },
            wander: 6,
            site: 2,
            age: m.age,
            stage: m.stage,
            gender: m.gender,
            variation: m.variation,
            motherId: m.motherId || null,
            fatherId: m.fatherId || null,
            sight: 8,
            tier: 0,
            face: m.face,
            facets: { curiosity: 50, industriousness: 50, bravery: 50, sociability: 50, cheerfulness: 50 },
            skills: { woodcutting: 1, gathering: 2, hauling: 3 },
            needs: { hunger: 20, thirst: 20, sleep: 15, social: 25, nature: 20, waste: 10 },
            inventory: [],
            equipment: { tool: null, clothes: null },
            workRate: 1,
            thoughts: [{ text: "Glad to be home in Solirwyn.", strength: 8, hour: 9, tick: 15570 }],
            moodScore: 80,
            mood: "Happy",
            jobsDone: {},
            ageSeconds: 0
        }
    };
}

// 6. Save compressed file0.rmmzsave
const outJson = JSON.stringify(data);
const outZip = pako.deflate(outJson, { to: "string", level: 1 });
fs.writeFileSync(savePath, outZip, "utf8");
console.log("Updated file0.rmmzsave successfully. Colonists in f1:", Object.values(units).filter(u => u.data && u.data.faction === "f1" && u.data.kind === "colonist").length);

// 7. Update global.rmmzsave with Human U7 portrait preview
const globalInfo = [
    {
        title: "Ultima Fortress - The Living Mountainhall",
        characters: [["$UF_Human_Male_1_Walk", 0]],
        faces: [["UF_Faces_human_1", 0]],
        playtime: "00:08:30",
        timestamp: Date.now()
    }
];
const globalZip = pako.deflate(JSON.stringify(globalInfo), { to: "string", level: 1 });
fs.writeFileSync(globalPath, globalZip, "utf8");
console.log("Updated global.rmmzsave successfully.");
