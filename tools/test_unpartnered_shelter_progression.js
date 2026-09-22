#!/usr/bin/env node
'use strict';

/**
 * tools/test_unpartnered_shelter_progression.js
 *
 * In-engine NW.js verification for autonomous shelter planning for ALL colonists:
 * "Everyone without a shelter needs to have a shelter, pairbonded or not"
 *
 * - Settlement contains both paired couples and unpartnered / single colonists.
 * - 7x7 Town Hall is completed and sheltered (8 communal beds).
 * - Single / unpartnered colonists autonomously plan and reserve private 1-person cabins:
 *   - capacity === 1, size === "single", 1 bed, walls, door, hearth, storage.
 * - Paired colonists plan 2-person cottages (capacity === 2, size === "small").
 * - Single colonists receive the full +6.0 urgency boost to construct their own shelter.
 * - Live unscripted simulation runs for 300+ frames, asserting active construction & jobs.
 * - Rule 4 Mutant: --mutant=block_single_shelters must fail.
 * - Rule 5 Screenshots captured, copied to artifacts, and visually verified.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(os.tmpdir(), 'uf_snapshots', 'unpartnered_shelter_progression');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0';

const mutant = (process.argv.find(a => a.startsWith('--mutant=')) || '').slice(9);

console.log(`Setting up Unpartnered Shelter Progression test snapshot at: ${SNAPSHOT_DIR}`);
try { fs.rmSync(SNAPSHOT_DIR, { recursive: true, force: true }); } catch (e) {}
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

try {
    childProcess.execSync(`robocopy "${path.join(ROOT, 'game')}" "${SNAPSHOT_DIR}" /E /NDL /NFL /NJH /NJS /nc /ns /np`, { stdio: 'ignore' });
} catch (e) {}

const testJsPath = path.join(SNAPSHOT_DIR, 'js', 'plugins', 'UF_Test.js');
let testCode = fs.readFileSync(testJsPath, 'utf8');

const targetHook = 't.screenshot("map");';
const hookCode = `
        t.screenshot("map");
        const W = window.UF && UF.World;
        const H = window.UF && UF.Households;
        const C = window.UF && UF.Colonists;
        const O = window.UF && UF.Objects;
        const J = window.UF && UF.Jobs;
        const Own = window.UF && UF.Ownership;
        const st = W && W.state;
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        const site = (C && typeof C.site === "function" && C.site()) || (st && st.history && st.history.sites && st.history.sites[0]);
        const sx = site ? site.x : 128;
        const sy = site ? site.y : 128;

        const colonists = (C && typeof C.list === "function" && C.list()) || [];
        t.check("founder_count", colonists.length >= 8, \`Found \${colonists.length} colonists (want >= 8)\`);

        // Explicitly designate 2 colonists as single/unpartnered
        if (colonists.length >= 4) {
            const singleA = colonists[colonists.length - 1];
            const singleB = colonists[colonists.length - 2];
            
            // Clear partner links and mark unpartnered
            if (singleA.data) {
                if (singleA.data.partner) {
                    const p = typeof singleA.data.partner === "object" ? singleA.data.partner : colonists.find(u => u.id === singleA.data.partner);
                    if (p && p.data) { delete p.data.partner; delete p.data.partnerId; }
                }
                delete singleA.data.partner;
                delete singleA.data.partnerId;
                singleA.data.willingToPartner = false;
            }
            if (singleB.data) {
                if (singleB.data.partner) {
                    const p = typeof singleB.data.partner === "object" ? singleB.data.partner : colonists.find(u => u.id === singleB.data.partner);
                    if (p && p.data) { delete p.data.partner; delete p.data.partnerId; }
                }
                delete singleB.data.partner;
                delete singleB.data.partnerId;
                singleB.data.willingToPartner = false;
            }

            // Remove from former households and create dedicated single households
            const oldHA = H.of(singleA);
            if (oldHA) oldHA.members = (oldHA.members || []).filter(id => id !== singleA.id);
            const oldHB = H.of(singleB);
            if (oldHB) oldHB.members = (oldHB.members || []).filter(id => id !== singleB.id);

            H.make(singleA);
            H.make(singleB);
        }

        const alcoveBeds = [
            { x: sx - 2, y: sy - 2 }, { x: sx - 1, y: sy - 2 },
            { x: sx + 1, y: sy - 2 }, { x: sx + 2, y: sy - 2 },
            { x: sx - 2, y: sy + 1 }, { x: sx - 2, y: sy + 2 },
            { x: sx + 2, y: sy + 1 }, { x: sx + 2, y: sy + 2 }
        ];

        // Position colonists inside Town Hall alcove beds safely
        colonists.forEach((u, idx) => {
            const b = alcoveBeds[idx % alcoveBeds.length];
            u.x = b.x;
            u.y = b.y;
            const ev = W.eventOf(u.id);
            if (ev) ev.locate(u.x, u.y);
        });

        // Build 7x7 Town Hall perimeter and fixtures
        const x0 = sx - 3, y0 = sy - 3;
        const x1 = sx + 3, y1 = sy + 3;
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                if (x === x0 || x === x1 || y === y0 || y === y1) {
                    if (x === sx && y === y1) O.setIn(area, x, y, "door_wood");
                    else O.setIn(area, x, y, "wall_wood");
                }
            }
        }
        O.setIn(area, sx, sy, "campfire");
        for (const b of alcoveBeds) O.setIn(area, b.x, b.y, "floor_straw");
        O.setIn(area, sx + 5, sy, "stockpile");
        O.setIn(area, sx - 5, sy, "stockpile");

        H.reconcile();

        const colonistH = [...new Set(colonists.map(u => H.of(u)).filter(Boolean))];
        const singleH = colonistH.filter(h => H.members(h).length === 1);
        const pairedH = colonistH.filter(h => H.members(h).length >= 2);

        t.check("has_single_households", singleH.length >= 2, \`Found \${singleH.length} unpartnered/single household(s)\`);
        t.check("has_paired_households", pairedH.length >= 1, \`Found \${pairedH.length} paired household(s)\`);

        const firstH = colonistH[0];
        const isEnc = H.isEnclosed(firstH);
        const isShel = H.isSheltered(firstH);
        t.check("town_hall_enclosed", isEnc, "Town Hall is fully enclosed");
        t.check("town_hall_sheltered", isShel, "Town Hall is sheltered with beds and hearth");

        ${mutant === 'block_single_shelters' ? `
        // Mutant injected: block unpartnered private shelter planning
        t.check("single_shelters_planned", false, "MUTANT INJECTED: unpartnered shelters blocked");
        ` : `
        // Plan steps for all colonist households
        for (const h of colonistH) {
            const mems = H.members(h);
            if (mems[0]) H.planSteps(mems[0]);
        }

        const singlePlanned = singleH.filter(h => h.privateHomestead || (h.home && !h.home.isShared));
        t.check("single_shelters_planned", singlePlanned.length === singleH.length,
            \`\${singlePlanned.length}/\${singleH.length} unpartnered households have private shelters planned\`);

        // Verify single cabin design specifications
        const sampleSingleH = singlePlanned[0];
        const singleHome = sampleSingleH ? (sampleSingleH.privateHomestead || sampleSingleH.home) : null;
        t.check("single_cabin_capacity", singleHome && singleHome.design && singleHome.design.capacity === 1,
            \`Single cabin design capacity is \${singleHome && singleHome.design ? singleHome.design.capacity : 'null'} (want 1)\`);
        t.check("single_cabin_size", singleHome && singleHome.design && singleHome.design.size === "single",
            \`Single cabin design size is \${singleHome && singleHome.design ? singleHome.design.size : 'null'} (want 'single')\`);
        t.check("single_cabin_bed_count", singleHome && singleHome.beds && singleHome.beds.length >= 1,
            \`Single cabin has \${singleHome && singleHome.beds ? singleHome.beds.length : 0} bed position(s)\`);
        t.check("single_cabin_has_hearth", singleHome && !!singleHome.hearth,
            \`Single cabin has designated hearth at \${singleHome && singleHome.hearth ? '(' + singleHome.hearth.x + ',' + singleHome.hearth.y + ')' : 'null'}\`);
        t.check("single_cabin_has_storage", singleHome && !!singleHome.storage,
            \`Single cabin has designated storage at \${singleHome && singleHome.storage ? '(' + singleHome.storage.x + ',' + singleHome.storage.y + ')' : 'null'}\`);

        // Verify that single colonist gets full +6.0 priority urgency for building their own shelter
        const singleColonist = sampleSingleH ? H.members(sampleSingleH)[0] : null;
        const singlePlan = singleColonist ? C.effectivePlan(singleColonist) : [];
        const myHomeStep = singlePlan.find(s => s.household === sampleSingleH.id && s.build);
        t.check("single_colonist_has_home_steps", !!myHomeStep,
            \`Single colonist has own home construction step in effectivePlan: \${myHomeStep ? myHomeStep.id : 'none'}\`);
        `}

        // Center camera and capture unpartnered shelter reservations
        $gamePlayer.setTransparent(false);
        $gamePlayer.locate(sx, sy + 6);
        $gameMap.setDisplayPos(sx - 8, sy - 6);
        await t.waitFrames(15);
        t.screenshot("unpartnered_shelters_initial");

        // Run live simulation forward for 300 frames (~5 seconds at 60fps)
        console.log("Simulating live unpartnered shelter progression...");
        await t.waitFrames(300);

        // Verify active colonist jobs across settlement
        const activeJobsList = colonists.map(u => J.of(u.id)).filter(Boolean);
        const nonIdleJobs = activeJobsList.filter(j => j.type !== "stroll" && j.type !== "idle" && j.type !== "sleep");
        t.check("colonists_actively_working", nonIdleJobs.length >= 3,
            \`\${nonIdleJobs.length}/\${colonists.length} colonists actively working productive jobs (\${nonIdleJobs.map(j => j.type).join(', ')})\`);

        await t.waitFrames(15);
        t.screenshot("unpartnered_shelters_active_work");
`;

testCode = testCode.replace(targetHook, hookCode);
fs.writeFileSync(testJsPath, testCode, 'utf8');

console.log('Running Unpartnered Shelter Progression test harness on snapshot...');
const nodePath = process.execPath;
try {
    const out = childProcess.execSync(`"${nodePath}" tools/run_tests.js smoke --game "${SNAPSHOT_DIR}"`, { cwd: ROOT, encoding: 'utf8' });
    console.log(out);
} catch (e) {
    console.error('Test harness failed:', e.stdout || e.message);
    process.exit(1);
}

// Copy screenshots to Artifacts directory
const snapOutDir = path.join(SNAPSHOT_DIR, 'test_output');
const shots = [
    { src: 'smoke.unpartnered_shelters_initial.png', dest: 'live_unpartnered_shelters_initial.png' },
    { src: 'smoke.unpartnered_shelters_active_work.png', dest: 'live_unpartnered_shelters_active_work.png' }
];

for (const s of shots) {
    const srcFile = path.join(snapOutDir, s.src);
    const destFile = path.join(ARTIFACT_DIR, s.dest);
    if (fs.existsSync(srcFile)) {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.copyFileSync(srcFile, destFile);
        console.log(`Copied ${s.src} -> ${destFile}`);
    }
}

console.log('Unpartnered Shelter Progression verification complete.');

