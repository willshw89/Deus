const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'animated_objects_live');

if (fs.existsSync(SNAPSHOT_DIR)) {
    fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
}
console.log(`Setting up animated objects live test snapshot at: ${SNAPSHOT_DIR}`);
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

// Sync game/ to snapshot using robocopy
try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {
    // Robocopy exit code 1 means files copied successfully
}

// Modify UF_Anim.js in snapshot to inject a live scene of all animated object categories
const animJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Anim.js');
let animJs = fs.readFileSync(animJsPath, 'utf8');

const hookPoint = 'const objectsBefore = cat.objects;';
const injection = `
        // Injected Live Animated Objects Showcase Test
        {
            await t.waitUntil(() => window.UF && UF.World && UF.World.currentArea() && window.$gameMap, 25000, "world area ready").catch(() => {});
            const W = UF.World, O = UF.Objects, Anim = UF.Anim;
            const area = W.currentArea();
            const cx = Math.floor(W.state.size / 2), cy = Math.floor(W.state.size / 2);

            // Clean 12x8 area around center
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -6; dx <= 6; dx++) {
                    O.setIn(area, cx + dx, cy + dy, null);
                }
            }

            // Move colonists clear
            const colList = (window.UF && UF.Colonists && UF.Colonists.list && UF.Colonists.list()) || [];
            for (const c of colList) {
                if (Math.abs(c.x - cx) <= 7 && Math.abs(c.y - cy) <= 5) {
                    c.x = cx; c.y = cy + 7;
                }
            }

            // Place objects from different animation categories
            // Row -2: Plants & Foliage (sway)
            O.setIn(area, cx - 5, cy - 2, "grass_tuft");
            O.setIn(area, cx - 3, cy - 2, "reeds");
            O.setIn(area, cx - 1, cy - 2, "flowers");
            O.setIn(area, cx + 1, cy - 2, "wild_grain");
            O.setIn(area, cx + 3, cy - 2, "fern");
            O.setIn(area, cx + 5, cy - 2, "berry_bush");

            // Row 0: Fire & Water
            O.setIn(area, cx - 4, cy, "bush");
            O.setIn(area, cx - 1, cy, "campfire");
            O.setIn(area, cx + 2, cy, "well");
            O.setIn(area, cx + 4, cy, "lily_pad");

            // Row +2: Cavern Flora, Fungi & Crystals
            O.setIn(area, cx - 4, cy + 2, "glow_caps");
            O.setIn(area, cx - 2, cy + 2, "cave_mushrooms");
            O.setIn(area, cx + 0, cy + 2, "cave_moss");
            O.setIn(area, cx + 2, cy + 2, "crystal");
            O.setIn(area, cx + 4, cy + 2, "crystal_spire");

            $gamePlayer.locate(cx, cy);
            await t.waitFrames(15);

            // Observe animation frames cycling across 45 frames
            const testCells = [
                { id: "campfire", x: cx - 1, y: cy, state: "lit" },
                { id: "grass_tuft", x: cx - 5, y: cy - 2, state: "sway" },
                { id: "reeds", x: cx - 3, y: cy - 2, state: "sway" },
                { id: "flowers", x: cx - 1, y: cy - 2, state: "sway" },
                { id: "glow_caps", x: cx - 4, y: cy + 2, state: "idle" },
                { id: "crystal", x: cx + 2, y: cy + 2, state: "idle" },
                { id: "well", x: cx + 2, y: cy, state: "idle" }
            ];

            const colsSeen = testCells.map(() => new Set());
            for (let f = 0; f < 45; f++) {
                await t.waitFrames(1);
                testCells.forEach((c, idx) => {
                    const info = Anim.objectAt(c.x, c.y);
                    if (info && info.col !== null && info.col !== undefined) {
                        colsSeen[idx].add(info.col);
                    }
                });
            }

            t.screenshot("live_animated_objects_scene");

            testCells.forEach((c, idx) => {
                const seen = Array.from(colsSeen[idx]).sort((a,b) => a - b);
                const animated = seen.length >= 2;
                t.check("anim_step_" + c.id, animated, c.id + " animated across frames: " + seen.join(",") + " (state " + c.state + ")");
            });
        }
`;

animJs = animJs.replace(hookPoint, injection + '\n' + hookPoint);
fs.writeFileSync(animJsPath, animJs, 'utf8');

console.log('Running live in-engine NW.js test...');
const rmmzDir = process.env.RMMZ_DIR || "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ";
const nwExe = path.join(rmmzDir, 'nwjs-win', 'nw.exe');

const profileDir = path.join(os.tmpdir(), `uf_test_profile_${process.pid}_${Date.now()}`);
const nwArgs = [
    SNAPSHOT_DIR,
    `--user-data-dir=${profileDir}`,
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion',
    'test',
    '--uf-test=anim'
];

try {
    const child = childProcess.spawnSync(nwExe, nwArgs, {
        cwd: SNAPSHOT_DIR,
        encoding: 'utf8',
        timeout: 45000
    });
    console.log(child.stdout || child.stderr || 'NW.js exited cleanly.');
} catch (e) {
    console.log(e.stdout || e.message);
} finally {
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (_) {}
}

// Copy screenshots to art/review/
const testOut = path.join(SNAPSHOT_DIR, 'test_output');
if (fs.existsSync(testOut)) {
    const files = fs.readdirSync(testOut);
    for (const f of files) {
        if (f.endsWith('.png')) {
            const dest = path.join(ROOT, 'art', 'review', f);
            fs.copyFileSync(path.join(testOut, f), dest);
            console.log(`Copied review screenshot to: ${dest}`);
        }
    }
}
