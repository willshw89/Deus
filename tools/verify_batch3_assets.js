const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NODE = 'C:\\Program Files\\nodejs\\node.exe';
const ART_CHECK = path.join(ROOT, 'tools', 'art_check.js');
const ORIG_CHECK = path.join(ROOT, 'tools', 'originality_check.js');

const files = [
    'game/img/faces/UF_Faces_Trees_Ex.png',
    'game/img/faces/UF_Faces_CaveFlora.png',
    'game/img/characters/!$UF_Fir_Snow.png',
    'game/img/characters/!$UF_Mangrove.png',
    'game/img/characters/!$UF_Tree_Tropical.png',
    'game/img/characters/!$UF_Palm.png',
    'game/img/characters/!$UF_Tree_Cursed.png',
    'game/img/characters/!$UF_Fir_Snow_Stump.png',
    'game/img/characters/!$UF_Mangrove_Stump.png',
    'game/img/characters/!$UF_Tropical_Stump.png',
    'game/img/characters/!$UF_Palm_Stump.png',
    'game/img/characters/!$UF_Cursed_Stump.png',
    'game/img/characters/!$UF_GlowCaps.png',
    'game/img/characters/!$UF_CaveMushrooms.png',
    'game/img/characters/!$UF_CaveMoss.png',
    'game/img/characters/!$UF_SporeReeds.png',
    'game/img/characters/!$UF_Stalagmite.png',
    'game/img/characters/!$UF_CrystalSpire.png'
];

console.log('=== Running art_check on all 18 Batch 3 & Cave Assets ===');
let artFails = 0;
for (const f of files) {
    const full = path.join(ROOT, f);
    try {
        const out = execSync(`"${NODE}" "${ART_CHECK}" "${full}" --sidecar`, { encoding: 'utf8' });
        if (out.includes('RESULT FAIL') || out.includes('FILE FAIL')) {
            console.log(`FAIL: ${f}`);
            console.log(out);
            artFails++;
        } else {
            console.log(`PASS: ${f}`);
        }
    } catch (e) {
        console.log(`FAIL (exception): ${f}`);
        console.log(e.stdout || e.message);
        artFails++;
    }
}
console.log(`art_check summary: ${files.length - artFails}/${files.length} passed.`);

console.log('\n=== Running originality_check on all 18 Batch 3 & Cave Assets ===');
let origFails = 0;
for (const f of files) {
    const full = path.join(ROOT, f);
    try {
        const out = execSync(`"${NODE}" "${ORIG_CHECK}" "${full}"`, { encoding: 'utf8' });
        if (out.includes('RESULT FAIL') || out.includes('FAIL:')) {
            console.log(`FAIL: ${f}`);
            console.log(out);
            origFails++;
        } else {
            console.log(`PASS: ${f}`);
        }
    } catch (e) {
        console.log(`FAIL (exception): ${f}`);
        console.log(e.stdout || e.message);
        origFails++;
    }
}
console.log(`originality_check summary: ${files.length - origFails}/${files.length} passed.`);

if (artFails > 0 || origFails > 0) {
    process.exit(1);
} else {
    console.log('\nALL 18 BATCH 3 & CAVE ASSETS PASSED BOTH ART_CHECK AND ORIGINALITY_CHECK 100%!');
}
