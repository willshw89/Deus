const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'elf_live');

console.log(`Setting up Elf in-game test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// 1. Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

// 2. Update catalog in snapshot ONLY
const catalogPath = path.join(SNAPSHOT_DIR, 'data', 'UF_WorldCatalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Wire Elf people sprites
if (catalog.people && catalog.people.elf) {
    catalog.people.elf.images = ["$UF_Elf_Male", "$UF_Elf_Female"];
}

// Add Elven racial weapons (V103)
const elvenItems = [
    {
        id: "elf_moonblade",
        name: "Elven Curved Moonblade",
        image: "!$UF_Item_ElfMoonblade",
        tags: ["weapon", "melee", "sword", "elf"],
        stack: 1,
        material: "mithril",
        weight: 1.6,
        weapon: {
            speed: 6,
            types: ["slash", "pierce"],
            styles: ["accurate", "rapid"],
            hands: 1,
            reach: 1,
            bonuses: { attack: { slash: 22, pierce: 14 } }
        }
    },
    {
        id: "elf_longbow",
        name: "Elven Recurve Longbow",
        image: "!$UF_Item_ElfLongbow",
        tags: ["weapon", "ranged", "bow", "elf"],
        stack: 1,
        material: "wood",
        weight: 1.8,
        weapon: {
            speed: 5,
            types: ["ranged"],
            styles: ["accurate", "rapid"],
            hands: 2,
            reach: 2,
            bonuses: { attack: { ranged: 24 } }
        }
    },
    {
        id: "elf_sylvan_staff",
        name: "Sylvan Nature Staff",
        image: "!$UF_Item_ElfSylvanStaff",
        tags: ["weapon", "magic", "staff", "elf"],
        stack: 1,
        material: "wood",
        weight: 2.0,
        weapon: {
            speed: 5,
            types: ["magic", "crush"],
            styles: ["accurate"],
            hands: 2,
            reach: 1,
            bonuses: { attack: { magic: 26, crush: 10 } }
        }
    }
];

if (catalog.items && Array.isArray(catalog.items.types)) {
    for (const it of elvenItems) {
        if (!catalog.items.types.some(t => t.id === it.id)) {
            catalog.items.types.push(it);
        }
    }
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log('Updated catalog in snapshot: elven people sprites & racial weapons registered.');

// 3. Inject live Elf showcase into UF_Test.js in snapshot
const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const elfShowcaseCode = `
        // --- Live In-Game Elf Faction Showcase (V103, V104) ---
        const W = window.UF && UF.World;
        const I = window.UF && UF.Items;
        const curArea = W ? W.currentArea() : null;
        const px = $gamePlayer.x || 15;
        const py = $gamePlayer.y || 15;

        if (W && curArea) {
            // Lineup of Elf units:
            // 1. Male Settler ($UF_Elf_Male)
            W.addUnit({ name: "Elf Ranger", image: { characterName: "$UF_Elf_Male", characterIndex: 0 }, area: curArea, x: px - 3, y: py, dir: 2, data: { species: "elf", gender: "male" } });
            // 2. Female Settler ($UF_Elf_Female)
            W.addUnit({ name: "Elf Maiden", image: { characterName: "$UF_Elf_Female", characterIndex: 0 }, area: curArea, x: px - 2, y: py, dir: 2, data: { species: "elf", gender: "female" } });
            // 3. Moonblade Slash Attack ($UF_Elf_Attack_Sword)
            W.addUnit({ name: "Elf Blademaster", image: { characterName: "$UF_Elf_Attack_Sword", characterIndex: 0 }, area: curArea, x: px - 1, y: py, dir: 2, data: { species: "elf" } });
            // 4. Recurve Longbow Attack ($UF_Elf_Attack_Bow)
            W.addUnit({ name: "Elf Marksman", image: { characterName: "$UF_Elf_Attack_Bow", characterIndex: 0 }, area: curArea, x: px, y: py, dir: 2, data: { species: "elf" } });
            // 5. Sylvan Staff Nature Cast ($UF_Elf_Cast_Staff)
            W.addUnit({ name: "Elf Druid", image: { characterName: "$UF_Elf_Cast_Staff", characterIndex: 0 }, area: curArea, x: px + 1, y: py, dir: 2, data: { species: "elf" } });
            // 6. Male Profile West
            W.addUnit({ name: "Elf Scout W", image: { characterName: "$UF_Elf_Male", characterIndex: 0 }, area: curArea, x: px + 2, y: py, dir: 4, data: { species: "elf" } });
            // 7. Female Profile East
            W.addUnit({ name: "Elf Scout E", image: { characterName: "$UF_Elf_Female", characterIndex: 0 }, area: curArea, x: px + 3, y: py, dir: 6, data: { species: "elf" } });

            // Layer-equipped Elves in back row:
            W.addUnit({ name: "Elf Captain", image: { characterName: "$UF_Elf_Male", characterIndex: 0 }, area: curArea, x: px - 2, y: py - 1, dir: 2, data: { species: "elf", equipment: { weapon: "elf_moonblade" } } });
            W.addUnit({ name: "Elf Archer", image: { characterName: "$UF_Elf_Male", characterIndex: 0 }, area: curArea, x: px, y: py - 1, dir: 2, data: { species: "elf", equipment: { weapon: "elf_longbow" } } });
            W.addUnit({ name: "Elf Shaman", image: { characterName: "$UF_Elf_Male", characterIndex: 0 }, area: curArea, x: px + 2, y: py - 1, dir: 2, data: { species: "elf", equipment: { weapon: "elf_sylvan_staff" } } });

            // Ground items in front row:
            if (I && typeof I.create === "function") {
                I.create("elf_moonblade", 1, { area: curArea, x: px - 1, y: py + 1 });
                I.create("elf_longbow", 1, { area: curArea, x: px, y: py + 1 });
                I.create("elf_sylvan_staff", 1, { area: curArea, x: px + 1, y: py + 1 });
            }
        }

        // Capture in-game screenshots at multiple zoom levels
        if (UF.Camera && typeof UF.Camera.setLevel === "function") {
            UF.Camera.setLevel(0);
        }
        await t.waitFrames(25);
        t.screenshot("elf_faction_live_ingame_closeup");

        if (UF.Camera && typeof UF.Camera.setLevel === "function") {
            UF.Camera.setLevel(1);
        }
        await t.waitFrames(25);
        t.screenshot("elf_faction_live_ingame");

        if (UF.Camera && typeof UF.Camera.setLevel === "function") {
            UF.Camera.setLevel(2);
        }
        await t.waitFrames(20);
        t.screenshot("elf_faction_live_ingame_wide");

        ${targetHook}`;

testCode = testCode.replace(targetHook, elfShowcaseCode);
fs.writeFileSync(testJsPath, testCode);
console.log('Injected Elf faction showcase into snapshot test suite.');

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
        if (f.startsWith('smoke.elf_') && f.endsWith('.png')) {
            const cleanName = f.replace('smoke.', '');
            fs.copyFileSync(path.join(snapOutDir, f), path.join(outDir, cleanName));
            fs.copyFileSync(path.join(snapOutDir, f), path.join(brainDir, cleanName));
            console.log(`Copied in-game screenshot to: game/test_output/${cleanName} and brain folder`);
        }
    }
}

// 6. Crop and scale 2x closeup of the elf combat scene
const closeupPath = path.join(outDir, 'elf_faction_live_ingame_closeup.png');
if (fs.existsSync(closeupPath)) {
    const imgBuf = fs.readFileSync(closeupPath);
    const decoded = decodePNG(imgBuf, 'elf_faction_live_ingame_closeup.png');

    // Crop center 480x240 region where elves stand
    const cropX = Math.round(decoded.width / 2 - 240);
    const cropY = Math.round(decoded.height / 2 - 120);
    const cropW = 480, cropH = 240;

    const cropped = Buffer.alloc(cropW * cropH * 4);
    for (let dy = 0; dy < cropH; dy++) {
        for (let dx = 0; dx < cropW; dx++) {
            const sIdx = ((cropY + dy) * decoded.width + (cropX + dx)) * 4;
            const dIdx = (dy * cropW + dx) * 4;
            cropped[dIdx] = decoded.data[sIdx];
            cropped[dIdx + 1] = decoded.data[sIdx + 1];
            cropped[dIdx + 2] = decoded.data[sIdx + 2];
            cropped[dIdx + 3] = decoded.data[sIdx + 3];
        }
    }

    const cropOutPath = path.join(outDir, 'elf_combat_live_ingame_crop.png');
    writePNG(cropOutPath, cropW, cropH, cropped);
    fs.copyFileSync(cropOutPath, path.join(brainDir, 'elf_combat_live_ingame_crop.png'));

    // Scale 2x for showcase
    const scale2x = Buffer.alloc(cropW * 2 * cropH * 2 * 4);
    for (let dy = 0; dy < cropH * 2; dy++) {
        const sy = Math.floor(dy / 2);
        for (let dx = 0; dx < cropW * 2; dx++) {
            const sx = Math.floor(dx / 2);
            const sIdx = (sy * cropW + sx) * 4;
            const dIdx = (dy * (cropW * 2) + dx) * 4;
            scale2x[dIdx] = cropped[sIdx];
            scale2x[dIdx + 1] = cropped[sIdx + 1];
            scale2x[dIdx + 2] = cropped[sIdx + 2];
            scale2x[dIdx + 3] = cropped[sIdx + 3];
        }
    }
    const crop2xOutPath = path.join(outDir, 'elf_combat_live_ingame_crop_2x.png');
    writePNG(crop2xOutPath, cropW * 2, cropH * 2, scale2x);
    fs.copyFileSync(crop2xOutPath, path.join(brainDir, 'elf_combat_live_ingame_crop_2x.png'));
    console.log('Saved 2x cropped in-game combat screenshot!');
}

console.log('=== Elf Live In-Game Test Complete ===');
