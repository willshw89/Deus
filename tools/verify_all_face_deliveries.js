const { execSync } = require('child_process');
const fs = require('fs');

const NODE_EXE = '"C:/Program Files/nodejs/node.exe"';

const factions = [
    'human', 'elf', 'dwarf', 'gnome', 'goblin',
    'orc', 'lizardfolk', 'kobold', 'undead', 'starborn', 'swarm'
];

console.log('=== 1. VERIFYING GAME FACE SHEETS (art_check.js --native) ===');
let artCheckFails = 0;
for (const fac of factions) {
    for (const num of [1, 2]) {
        const file = `game/img/faces/UF_Faces_${fac}_${num}.png`;
        try {
            const out = execSync(`${NODE_EXE} tools/art_check.js "${file}" --native`, { encoding: 'utf8' });
            if (out.includes('FILE PASS')) {
                const match = out.match(/(\d+) colours/);
                console.log(`PASS: ${file} (${match ? match[1] : '?'} colours)`);
            } else {
                console.log(`FAIL: ${file}\n${out}`);
                artCheckFails++;
            }
        } catch (e) {
            console.log(`ERROR: ${file}\n${e.stdout || e.message}`);
            artCheckFails++;
        }
    }
}
console.log(`Game Face Sheets: ${artCheckFails === 0 ? 'ALL 22 PASS (100%)' : `${artCheckFails} FAILED`}\n`);

console.log('=== 2. VERIFYING MASTER FACE SHEETS (art_check.js --native --sidecar) ===');
let masterCheckFails = 0;
for (const fac of factions) {
    for (const num of [1, 2]) {
        const file = `art/masters/face_${fac}_${num}.png`;
        try {
            const out = execSync(`${NODE_EXE} tools/art_check.js "${file}" --native --sidecar`, { encoding: 'utf8' });
            if (out.includes('FILE PASS')) {
                console.log(`PASS: ${file}`);
            } else {
                console.log(`FAIL: ${file}\n${out}`);
                masterCheckFails++;
            }
        } catch (e) {
            console.log(`ERROR: ${file}\n${e.stdout || e.message}`);
            masterCheckFails++;
        }
    }
}
console.log(`Master Face Sheets: ${masterCheckFails === 0 ? 'ALL 22 PASS (100%)' : `${masterCheckFails} FAILED`}\n`);

console.log('=== 3. VERIFYING ORIGINALITY (originality_check.js distance >= 0.28) ===');
let origFails = 0;
for (const fac of factions) {
    for (const num of [1, 2]) {
        const file = `game/img/faces/UF_Faces_${fac}_${num}.png`;
        try {
            const out = execSync(`${NODE_EXE} tools/originality_check.js "${file}"`, { encoding: 'utf8' });
            if (out.includes('FILE PASS')) {
                const distMatch = out.match(/closest distance ([\d\.]+)/);
                console.log(`PASS: ${file} (dist=${distMatch ? distMatch[1] : '?'})`);
            } else {
                console.log(`FAIL: ${file}\n${out}`);
                origFails++;
            }
        } catch (e) {
            console.log(`ERROR: ${file}\n${e.stdout || e.message}`);
            origFails++;
        }
    }
}
console.log(`Originality Checks: ${origFails === 0 ? 'ALL 22 PASS (100%)' : `${origFails} FAILED`}\n`);
