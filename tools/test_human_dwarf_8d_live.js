const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'human_dwarf_8d_live');

console.log(`Setting up Human & Dwarf 8D Live In-Game test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Update catalog in snapshot ONLY
const catalogPath = path.join(SNAPSHOT_DIR, 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Wire Dwarf & Human people sprites
if (catalog.people) {
    if (catalog.people.dwarf) {
        catalog.people.dwarf.images = ["$UF_Dwarf_Male", "$UF_Dwarf_Female"];
    }
    if (catalog.people.human) {
        catalog.people.human.images = ["$UF_Human_Male", "$UF_Human_Female"];
    }
}

// Ensure dwarven items registered
const dwarvenItems = [
    {
        id: "dwarf_axe",
        name: "Dwarven Runic Battleaxe",
        image: "!$UF_Item_DwarfAxe",
        tags: ["weapon", "melee", "axe", "dwarf"],
        stack: 1,
        material: "iron",
        weight: 2.4,
        weapon: {
            speed: 5,
            types: ["slash", "crush"],
            styles: ["aggressive", "accurate"],
            hands: 2,
            reach: 1,
            bonuses: { attack: { slash: 24, crush: 16 } }
        }
    },
    {
        id: "dwarf_crossbow",
        name: "Dwarven Heavy Arbalest",
        image: "!$UF_Item_DwarfCrossbow",
        tags: ["weapon", "ranged", "crossbow", "dwarf"],
        stack: 1,
        material: "iron",
        weight: 3.6,
        weapon: {
            speed: 4,
            types: ["ranged"],
            styles: ["accurate", "rapid"],
            hands: 2,
            reach: 1,
            bonuses: { attack: { ranged: 20 } }
        }
    },
    {
        id: "dwarf_rune_hammer",
        name: "Dwarven Earth Rune Hammer",
        image: "!$UF_Item_DwarfRuneHammer",
        tags: ["weapon", "magic", "hammer", "dwarf"],
        stack: 1,
        material: "stone",
        weight: 3.2,
        weapon: {
            speed: 5,
            types: ["crush", "magic"],
            styles: ["aggressive", "accurate"],
            hands: 1,
            reach: 1,
            bonuses: { attack: { crush: 14, magic: 18 } }
        }
    }
];

if (catalog.items && Array.isArray(catalog.items.types)) {
    for (const it of dwarvenItems) {
        if (!catalog.items.types.some(t => t.id === it.id)) {
            catalog.items.types.push(it);
        }
    }
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log('Updated catalog in snapshot with human/dwarf sprites and dwarven items.');

// 3. Inject live showcase into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const showcaseCode = `
        // --- Live In-Game Human & Dwarf 8-Directional & Combat Showcase ---
        const W = window.UF && UF.World;
        const curArea = W ? W.currentArea() : null;
        const px = $gamePlayer.x || 15;
        const py = $gamePlayer.y || 15;

        if (W && curArea) {
            // Row py - 3: Human 8-Direction Compass Ring / Lineup
            // Facings: 2 (S), 4 (W), 6 (E), 8 (N) standard RMMZ
            W.addUnit({ name: "Human S", image: { characterName: "$UF_Human_Male", characterIndex: 0 }, area: curArea, x: px - 4, y: py - 3, dir: 2, data: { species: "human", gender: "male" } });
            W.addUnit({ name: "Human W", image: { characterName: "$UF_Human_Male", characterIndex: 0 }, area: curArea, x: px - 3, y: py - 3, dir: 4, data: { species: "human", gender: "male" } });
            W.addUnit({ name: "Human E", image: { characterName: "$UF_Human_Male", characterIndex: 0 }, area: curArea, x: px - 2, y: py - 3, dir: 6, data: { species: "human", gender: "male" } });
            W.addUnit({ name: "Human N", image: { characterName: "$UF_Human_Male", characterIndex: 0 }, area: curArea, x: px - 1, y: py - 3, dir: 8, data: { species: "human", gender: "male" } });
            W.addUnit({ name: "Human Fem S", image: { characterName: "$UF_Human_Female", characterIndex: 0 }, area: curArea, x: px, y: py - 3, dir: 2, data: { species: "human", gender: "female" } });
            W.addUnit({ name: "Human Fem W", image: { characterName: "$UF_Human_Female", characterIndex: 0 }, area: curArea, x: px + 1, y: py - 3, dir: 4, data: { species: "human", gender: "female" } });
            W.addUnit({ name: "Human Fem E", image: { characterName: "$UF_Human_Female", characterIndex: 0 }, area: curArea, x: px + 2, y: py - 3, dir: 6, data: { species: "human", gender: "female" } });
            W.addUnit({ name: "Human Fem N", image: { characterName: "$UF_Human_Female", characterIndex: 0 }, area: curArea, x: px + 3, y: py - 3, dir: 8, data: { species: "human", gender: "female" } });

            // Row py - 2: Dwarf 8-Direction Lineup
            W.addUnit({ name: "Dwarf S", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px - 4, y: py - 2, dir: 2, data: { species: "dwarf", gender: "male" } });
            W.addUnit({ name: "Dwarf W", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px - 3, y: py - 2, dir: 4, data: { species: "dwarf", gender: "male" } });
            W.addUnit({ name: "Dwarf E", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px - 2, y: py - 2, dir: 6, data: { species: "dwarf", gender: "male" } });
            W.addUnit({ name: "Dwarf N", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px - 1, y: py - 2, dir: 8, data: { species: "dwarf", gender: "male" } });
            W.addUnit({ name: "Dwarf Fem S", image: { characterName: "$UF_Dwarf_Female", characterIndex: 0 }, area: curArea, x: px, y: py - 2, dir: 2, data: { species: "dwarf", gender: "female" } });
            W.addUnit({ name: "Dwarf Fem W", image: { characterName: "$UF_Dwarf_Female", characterIndex: 0 }, area: curArea, x: px + 1, y: py - 2, dir: 4, data: { species: "dwarf", gender: "female" } });
            W.addUnit({ name: "Dwarf Fem E", image: { characterName: "$UF_Dwarf_Female", characterIndex: 0 }, area: curArea, x: px + 2, y: py - 2, dir: 6, data: { species: "dwarf", gender: "female" } });
            W.addUnit({ name: "Dwarf Fem N", image: { characterName: "$UF_Dwarf_Female", characterIndex: 0 }, area: curArea, x: px + 3, y: py - 2, dir: 8, data: { species: "dwarf", gender: "female" } });

            // Row py - 1: Combat & Magic Classes (Human & Dwarf)
            W.addUnit({ name: "Human Knight", image: { characterName: "$UF_Human_Attack_Sword", characterIndex: 0 }, area: curArea, x: px - 4, y: py - 1, dir: 2, data: { species: "human" } });
            W.addUnit({ name: "Human Ranger", image: { characterName: "$UF_Human_Attack_Bow", characterIndex: 0 }, area: curArea, x: px - 3, y: py - 1, dir: 2, data: { species: "human" } });
            W.addUnit({ name: "Human Wizard", image: { characterName: "$UF_Human_Cast", characterIndex: 0 }, area: curArea, x: px - 2, y: py - 1, dir: 2, data: { species: "human" } });
            W.addUnit({ name: "Dwarf Berserker", image: { characterName: "$UF_Dwarf_Attack_Axe", characterIndex: 0 }, area: curArea, x: px, y: py - 1, dir: 2, data: { species: "dwarf" } });
            W.addUnit({ name: "Dwarf Arbalestier", image: { characterName: "$UF_Dwarf_Attack_Crossbow", characterIndex: 0 }, area: curArea, x: px + 1, y: py - 1, dir: 2, data: { species: "dwarf" } });
            W.addUnit({ name: "Dwarf Geomancer", image: { characterName: "$UF_Dwarf_Cast_Hammer", characterIndex: 0 }, area: curArea, x: px + 2, y: py - 1, dir: 2, data: { species: "dwarf" } });
        }

        // Close-up capture (Zoom Level 0)
        if (UF.Camera && typeof UF.Camera.setLevel === "function") {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(25);
        t.screenshot("human_dwarf_8d_live_closeup");

        // Normal capture (Zoom Level 1)
        if (UF.Camera && typeof UF.Camera.setLevel === "function") {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(25);
        t.screenshot("human_dwarf_8d_live_normal");

        ${targetHook}`;

testCode = testCode.replace(targetHook, showcaseCode);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected Human & Dwarf 8D showcase into snapshot test suite.');

// 4. Run snapshot smoke test
console.log('Launching NW.js test harness on snapshot...');
try {
    const out = childProcess.execSync(`"${process.execPath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (err) {
    console.error('Test stdout:', err.stdout);
    console.error('Test stderr:', err.stderr);
}

// 5. Copy captured screenshots back to game/test_output/
const outDir = path.join(ROOT, 'game', 'test_output');
fs.mkdirSync(outDir, { recursive: true });

const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
if (fs.existsSync(snapOutDir)) {
    for (const f of fs.readdirSync(snapOutDir)) {
        if (f.startsWith('smoke.human_dwarf_8d_') && f.endsWith('.png')) {
            const cleanName = f.replace('smoke.', '');
            fs.copyFileSync(path.join(snapOutDir, f), path.join(outDir, cleanName));
            console.log(`Copied in-game screenshot to: game/test_output/${cleanName}`);
        }
    }
}
console.log('=== Human & Dwarf Live In-Game Test Complete ===');
