const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'dwarf_live');

console.log(`Setting up Dwarf in-game test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Update catalog in snapshot ONLY
const catalogPath = path.join(SNAPSHOT_DIR, 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Wire Dwarf people sprites
if (catalog.people && catalog.people.dwarf) {
    catalog.people.dwarf.images = ["$UF_Dwarf_Male", "$UF_Dwarf_Female"];
}

// Add Dwarven racial weapons (V103)
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
console.log('Updated catalog in snapshot: dwarven people sprites & racial weapons registered.');

// 3. Inject live Dwarf showcase into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const dwarfShowcaseCode = `
        // --- Live In-Game Dwarf Faction Showcase (V103, V104) ---
        const W = window.UF && UF.World;
        const I = window.UF && UF.Items;
        const curArea = W ? W.currentArea() : null;
        const px = $gamePlayer.x || 15;
        const py = $gamePlayer.y || 15;

        if (W && curArea) {
            // Lineup of Dwarf units:
            // 1. Male Settler ($UF_Dwarf_Male)
            W.addUnit({ name: "Dwarf Miner", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px - 3, y: py, dir: 2, data: { species: "dwarf", gender: "male" } });
            // 2. Female Settler ($UF_Dwarf_Female)
            W.addUnit({ name: "Dwarf Craftswoman", image: { characterName: "$UF_Dwarf_Female", characterIndex: 0 }, area: curArea, x: px - 2, y: py, dir: 2, data: { species: "dwarf", gender: "female" } });
            // 3. Berserker Cleave Attack ($UF_Dwarf_Attack_Axe)
            W.addUnit({ name: "Dwarf Berserker", image: { characterName: "$UF_Dwarf_Attack_Axe", characterIndex: 0 }, area: curArea, x: px - 1, y: py, dir: 2, data: { species: "dwarf" } });
            // 4. Arbalestier Aim Attack ($UF_Dwarf_Attack_Crossbow)
            W.addUnit({ name: "Dwarf Arbalestier", image: { characterName: "$UF_Dwarf_Attack_Crossbow", characterIndex: 0 }, area: curArea, x: px, y: py, dir: 2, data: { species: "dwarf" } });
            // 5. Geomancer Rune Cast ($UF_Dwarf_Cast_Hammer)
            W.addUnit({ name: "Dwarf Geomancer", image: { characterName: "$UF_Dwarf_Cast_Hammer", characterIndex: 0 }, area: curArea, x: px + 1, y: py, dir: 2, data: { species: "dwarf" } });
            // 6. Male Profile West
            W.addUnit({ name: "Dwarf Guardian", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px + 2, y: py, dir: 4, data: { species: "dwarf" } });
            // 7. Female Profile East
            W.addUnit({ name: "Dwarf Scout", image: { characterName: "$UF_Dwarf_Female", characterIndex: 0 }, area: curArea, x: px + 3, y: py, dir: 6, data: { species: "dwarf" } });

            // Layer-equipped Dwarves in back row:
            W.addUnit({ name: "Dwarf Thane", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px - 2, y: py - 1, dir: 2, data: { species: "dwarf", equipment: { weapon: "dwarf_axe" } } });
            W.addUnit({ name: "Dwarf Sniper", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px, y: py - 1, dir: 2, data: { species: "dwarf", equipment: { weapon: "dwarf_crossbow" } } });
            W.addUnit({ name: "Dwarf Runemaster", image: { characterName: "$UF_Dwarf_Male", characterIndex: 0 }, area: curArea, x: px + 2, y: py - 1, dir: 2, data: { species: "dwarf", equipment: { weapon: "dwarf_rune_hammer" } } });

            // Ground items in front row:
            if (I && typeof I.create === "function") {
                I.create("dwarf_axe", 1, { area: curArea, x: px - 1, y: py + 1 });
                I.create("dwarf_crossbow", 1, { area: curArea, x: px, y: py + 1 });
                I.create("dwarf_rune_hammer", 1, { area: curArea, x: px + 1, y: py + 1 });
            }
        }

        // Capture in-game screenshots at multiple zoom levels
        if (UF.Camera && typeof UF.Camera.setLevel === "function") {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(25);
        t.screenshot("dwarf_faction_live_ingame_closeup");

        if (UF.Camera && typeof UF.Camera.setLevel === "function") {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(25);
        t.screenshot("dwarf_faction_live_ingame");

        if (UF.Camera && typeof UF.Camera.setLevel === "function") {
            UF.Camera.setLevel(2);
        }
        await t.waitFrames(20);
        t.screenshot("dwarf_faction_live_ingame_wide");

        ${targetHook}`;

testCode = testCode.replace(targetHook, dwarfShowcaseCode);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected Dwarf faction showcase into snapshot test suite.');

// 4. Run snapshot smoke test
console.log('Launching NW.js test harness on snapshot...');
try {
    const out = childProcess.execSync(`"${process.execPath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (err) {
    console.error('Test stdout:', err.stdout);
    console.error('Test stderr:', err.stderr);
}

// 5. Copy captured screenshots back to game/test_output/ and brain folder
const outDir = path.join(ROOT, 'game', 'test_output');
const brainDir = 'C:/Users/snewt/.gemini/antigravity/brain/8584d1db-b919-4549-a06e-7f379ac517a3';
fs.mkdirSync(outDir, { recursive: true });

const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
if (fs.existsSync(snapOutDir)) {
    for (const f of fs.readdirSync(snapOutDir)) {
        if (f.startsWith('smoke.dwarf_') && f.endsWith('.png')) {
            const cleanName = f.replace('smoke.', '');
            fs.copyFileSync(path.join(snapOutDir, f), path.join(outDir, cleanName));
            fs.copyFileSync(path.join(snapOutDir, f), path.join(brainDir, cleanName));
            console.log(`Copied in-game screenshot to: game/test_output/${cleanName} and brain folder`);
        }
    }
}
console.log('=== Dwarf Live In-Game Test Complete ===');
