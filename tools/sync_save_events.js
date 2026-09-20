'use strict';
const fs = require('fs');
const path = require('path');
const pako = require('../game/js/libs/pako.min.js');

const savePath = path.join(__dirname, '../game/save/file0.rmmzsave');
const raw = fs.readFileSync(savePath, 'utf8');
const data = JSON.parse(pako.inflate(raw, { to: 'string' }));

const units = data.ufWorld.units;
const events = data.map._events;

let updated = 0;
for (const [id, u] of Object.entries(units)) {
    const evId = 1000 + parseInt(id);
    const ev = events[evId];
    if (ev && u.image && u.image.characterName) {
        if (ev._characterName !== u.image.characterName) {
            console.log(`Updating Event ${evId} (${u.name}): '${ev._characterName}' -> '${u.image.characterName}'`);
            ev._characterName = u.image.characterName;
            ev._characterIndex = 0;
            updated++;
        }
    }
}

const outJson = JSON.stringify(data);
const outZip = pako.deflate(outJson, { to: 'string', level: 1 });
fs.writeFileSync(savePath, outZip, 'utf8');
console.log(`Saved file0.rmmzsave successfully. Updated ${updated} colonist event sprites.`);
