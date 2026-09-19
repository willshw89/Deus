const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'walls_live');

console.log(`Setting up in-game test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {
    // Robocopy exit code 1 means files copied successfully
}

// Modify UF_Walls.js ONLY IN SNAPSHOT to wait for area and add full buildings to the test screenshot
const wallsJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Walls.js');
let wallsJs = fs.readFileSync(wallsJsPath, 'utf8');

const suiteStartHook = 'const W = World(), O = Objects(), area = W && W.currentArea();';
const waitAreaCode = `await t.waitUntil(() => window.UF && UF.World && UF.World.currentArea() && window.$gameMap, 10000, "world area ready").catch(() => {});
            const W = World(), O = Objects(), area = W && W.currentArea();`;

wallsJs = wallsJs.replace(suiteStartHook, waitAreaCode);

const targetHook = 't.screenshot("two_square_wall");';
const customShowcase = `
            // In-Game Live Buildings Showcase: Wooden House & Stone House
            const wx = center.x - 7, wy = center.y - 2;
            // Clear ground under wood house
            for (let dy = -1; dy <= 5; dy++) {
                for (let dx = -1; dx <= 6; dx++) {
                    O.setIn(area, wx + dx, wy + dy, null);
                }
            }
            // Wood House (5x4 outer walls, with door)
            for (let x = wx; x <= wx + 4; x++) O.setIn(area, x, wy, "wall_wood");
            for (let y = wy + 1; y <= wy + 3; y++) {
                O.setIn(area, wx, y, "wall_wood");
                O.setIn(area, wx + 4, y, "wall_wood");
            }
            O.setIn(area, wx, wy + 4, "wall_wood");
            O.setIn(area, wx + 1, wy + 4, "wall_wood");
            // wx + 2 is doorway
            O.setIn(area, wx + 3, wy + 4, "wall_wood");
            O.setIn(area, wx + 4, wy + 4, "wall_wood");

            // Stone House (5x4 outer walls, with door)
            const sx = center.x + 3, sy = center.y - 2;
            for (let dy = -1; dy <= 5; dy++) {
                for (let dx = -1; dx <= 6; dx++) {
                    O.setIn(area, sx + dx, sy + dy, null);
                }
            }
            for (let x = sx; x <= sx + 4; x++) O.setIn(area, x, sy, "wall_stone");
            for (let y = sy + 1; y <= sy + 3; y++) {
                O.setIn(area, sx, y, "wall_stone");
                O.setIn(area, sx + 4, y, "wall_stone");
            }
            O.setIn(area, sx, sy + 4, "wall_stone");
            O.setIn(area, sx + 1, sy + 4, "wall_stone");
            // sx + 2 is doorway
            O.setIn(area, sx + 3, sy + 4, "wall_stone");
            O.setIn(area, sx + 4, sy + 4, "wall_stone");

            $gamePlayer.locate(center.x, center.y + 2);
            O.refresh();
            await t.waitFrames(15);
            t.screenshot("live_enclosed_buildings");

            // Underground Level -1 Dwarven Stone Rooms (matching user's screenshot)
            if (window.UF && UF.Levels && typeof UF.Levels.setView === "function") {
                UF.Levels.setView(-1);
                await t.waitUntil(() => W.viewLevel() && W.viewLevel().z === -1 && !UF.Levels.switching(), 15000, "Level -1 view").catch(() => {});
                await t.waitFrames(15);
                const uArea = W.viewLevel();
                if (uArea) {
                    const ux = $gamePlayer.x, uy = $gamePlayer.y;
                    // Dwarven stone house (4x3)
                    for (let dy = -1; dy <= 4; dy++) {
                        for (let dx = -1; dx <= 5; dx++) {
                            O.setIn(uArea, ux + dx, uy + dy, null);
                        }
                    }
                    for (let x = ux; x <= ux + 3; x++) O.setIn(uArea, x, uy, "wall_stone");
                    O.setIn(uArea, ux, uy + 1, "wall_stone");
                    O.setIn(uArea, ux + 3, uy + 1, "wall_stone");
                    O.setIn(uArea, ux, uy + 2, "wall_stone");
                    O.setIn(uArea, ux + 1, uy + 2, "wall_stone");
                    // ux + 2 is doorway
                    O.setIn(uArea, ux + 3, uy + 2, "wall_stone");

                    O.refresh();
                    await t.waitFrames(15);
                    t.screenshot("live_underground_stone_rooms");
                }
                UF.Levels.setView(0);
                await t.waitUntil(() => W.viewLevel() && W.viewLevel().z === 0 && !UF.Levels.switching(), 15000, "Ground view").catch(() => {});
                await t.waitFrames(10);
            }

            t.screenshot("two_square_wall");
`;

if (!wallsJs.includes(targetHook)) {
    console.error(`Could not find target hook "${targetHook}" in UF_Walls.js`);
    process.exit(1);
}

wallsJs = wallsJs.replace(targetHook, customShowcase);
fs.writeFileSync(wallsJsPath, wallsJs, 'utf8');
console.log('Injected enclosed buildings showcase into snapshot UF_Walls.js');

// Run tests on the snapshot
console.log('Running test harness on snapshot...');
try {
    const output = childProcess.execSync(
        `"C:\\Program Files\\nodejs\\node.exe" "${path.join(ROOT, 'tools', 'run_tests.js')}" walls --game "${SNAPSHOT_DIR}"`,
        { stdio: 'pipe' }
    ).toString();
    console.log(output);
} catch (err) {
    console.error('Test execution failed:');
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
}

// Copy screenshot to art/review/
const srcShot = path.join(SNAPSHOT_DIR, 'test_output', 'walls.live_enclosed_buildings.png');
const dstShot = path.join(ROOT, 'art', 'review', 'walls_live_enclosed_buildings.png');
if (fs.existsSync(srcShot)) {
    fs.copyFileSync(srcShot, dstShot);
    console.log(`Live screenshot copied to: ${dstShot}`);
} else {
    console.error(`Screenshot not found at: ${srcShot}`);
    process.exit(1);
}

const srcUnderground = path.join(SNAPSHOT_DIR, 'test_output', 'walls.live_underground_stone_rooms.png');
const dstUnderground = path.join(ROOT, 'art', 'review', 'walls_live_underground_stone_rooms.png');
if (fs.existsSync(srcUnderground)) {
    fs.copyFileSync(srcUnderground, dstUnderground);
    console.log(`Live underground screenshot copied to: ${dstUnderground}`);
}
