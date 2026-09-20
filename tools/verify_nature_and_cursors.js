const { execSync } = require('child_process');
const fs = require('fs');

const NODE_EXE = '"C:/Program Files/nodejs/node.exe"';

const faceFiles = [
    'game/img/faces/UF_Faces_Wildlife_Beasts.png',
    'game/img/faces/UF_Faces_Wildlife_Monsters.png',
    'game/img/faces/UF_Faces_Trees_Nature.png'
];

const masterFaceFiles = [
    'art/masters/face_wildlife_beasts.png',
    'art/masters/face_wildlife_monsters.png',
    'art/masters/face_trees_nature.png'
];

const menuFiles = [
    'game/img/pictures/UF_Menu_wildlife.png',
    'game/img/pictures/UF_Menu_cavern.png',
    'game/img/system/Window_wildlife.png',
    'game/img/system/Window_cavern.png'
];

const factions = [
    'human', 'elf', 'dwarf', 'gnome', 'goblin',
    'orc', 'lizardfolk', 'kobold', 'undead', 'starborn', 'swarm'
];

console.log('=== 1. VERIFYING WILDLIFE & NATURE FACE SHEETS ===');
for (const f of faceFiles) {
    const out = execSync(`${NODE_EXE} tools/art_check.js "${f}" --native`, { encoding: 'utf8' });
    console.log(out.includes('FILE PASS') ? `PASS: ${f}` : `FAIL: ${f}\n${out}`);
}
for (const f of masterFaceFiles) {
    const out = execSync(`${NODE_EXE} tools/art_check.js "${f}" --native --sidecar`, { encoding: 'utf8' });
    console.log(out.includes('FILE PASS') ? `PASS: ${f}` : `FAIL: ${f}\n${out}`);
}

console.log('\n=== 2. VERIFYING ORIGINALITY ON FACE SHEETS ===');
for (const f of faceFiles) {
    const out = execSync(`${NODE_EXE} tools/originality_check.js "${f}"`, { encoding: 'utf8' });
    const match = out.match(/closest distance ([\d\.]+)/);
    console.log(out.includes('FILE PASS') ? `PASS: ${f} (dist=${match ? match[1] : '?'})` : `FAIL: ${f}\n${out}`);
}

console.log('\n=== 3. VERIFYING MENU THEMES & WINDOW SKINS ===');
for (const f of menuFiles) {
    const out = execSync(`${NODE_EXE} tools/art_check.js "${f}" --native`, { encoding: 'utf8' });
    console.log(out.includes('FILE PASS') ? `PASS: ${f}` : `FAIL: ${f}\n${out}`);
}

console.log('\n=== 4. VERIFYING 11 BESPOKE FACTION CURSORS ===');
for (const fac of factions) {
    const f = `game/img/system/Cursor_${fac}.png`;
    const out = execSync(`${NODE_EXE} tools/art_check.js "${f}" --native`, { encoding: 'utf8' });
    console.log(out.includes('FILE PASS') ? `PASS: Cursor_${fac}` : `FAIL: ${f}\n${out}`);
}

console.log('\nALL CHECKS COMPLETED!');
