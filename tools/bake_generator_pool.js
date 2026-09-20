'use strict';

const fs = require('fs');
const path = require('path');
const { decodePNG } = require('./png_read');
const { writePNG } = require('./png_util');
const { compositeCharset, compositePortrait, HAIR_RAMPS } = require('./test_generator_combinations');

const ROOT = path.resolve(__dirname, '..');
const OUT_CHAR_DIR = path.join(ROOT, 'game', 'img', 'characters', 'gen');
const OUT_FACE_DIR = path.join(ROOT, 'game', 'img', 'faces', 'gen');

[OUT_CHAR_DIR, OUT_FACE_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

console.log('Baking procedural character and portrait pool...');
const start = Date.now();

const POOL = [];

// 1. Adult Males: 60 combinations
const hairColors = ['brown', 'blonde', 'black', 'red'];
for (let s = 1; s <= 3; s++) { // 3 skin tones
    for (let h = 1; h <= 4; h++) { // 4 hair styles
        for (let c = 1; c <= 4; c++) { // 4 clothes
            const hc = hairColors[(s + h + c) % hairColors.length];
            const b = (s + h) % 4; // beards 0..3
            POOL.push({
                key: `m_s${s}_h${h}_${hc}_b${b}_c${c}`,
                gender: 'male',
                stage: 'adult',
                skinTone: s,
                hairStyle: h,
                hairColor: hc,
                beard: b,
                clothing: c
            });
            if (POOL.length >= 60) break;
        }
        if (POOL.length >= 60) break;
    }
    if (POOL.length >= 60) break;
}

// 2. Adult Females: 40 combinations
const femaleStart = POOL.length;
for (let s = 1; s <= 3; s++) {
    for (let h = 1; h <= 4; h++) {
        for (let c = 1; c <= 4; c++) {
            const hc = hairColors[(s * 2 + h + c) % hairColors.length];
            POOL.push({
                key: `f_s${s}_h${h}_${hc}_c${c}`,
                gender: 'female',
                stage: 'adult',
                skinTone: s,
                hairStyle: h,
                hairColor: hc,
                beard: 0,
                clothing: c
            });
            if (POOL.length - femaleStart >= 40) break;
        }
        if (POOL.length - femaleStart >= 40) break;
    }
    if (POOL.length - femaleStart >= 40) break;
}

// 3. Children: 10 combinations
for (let s = 1; s <= 3; s++) {
    for (const hc of ['brown', 'blonde', 'black']) {
        POOL.push({
            key: `c_boy_s${s}_${hc}`,
            gender: 'male',
            stage: 'child',
            skinTone: s,
            hairStyle: 1,
            hairColor: hc,
            beard: 0,
            clothing: 1
        });
        POOL.push({
            key: `c_girl_s${s}_${hc}`,
            gender: 'female',
            stage: 'child',
            skinTone: s,
            hairStyle: 2,
            hairColor: hc,
            beard: 0,
            clothing: 4
        });
    }
}
// Keep 10 children
while (POOL.length > femaleStart + 40 + 10) POOL.pop();

// 4. Elders: 10 combinations
for (let s = 1; s <= 3; s++) {
    for (let c = 1; c <= 3; c++) {
        POOL.push({
            key: `m_elder_s${s}_b${c}_c${c}`,
            gender: 'male',
            stage: 'elder',
            skinTone: s,
            hairStyle: 4,
            hairColor: 'silver',
            beard: c,
            clothing: c
        });
        POOL.push({
            key: `f_elder_s${s}_c${c}`,
            gender: 'female',
            stage: 'elder',
            skinTone: s,
            hairStyle: 4,
            hairColor: 'silver',
            beard: 0,
            clothing: c === 1 ? 4 : c
        });
    }
}
// Trim to 120 total
while (POOL.length > 120) POOL.pop();

console.log(`Baking ${POOL.length} modular character combinations...`);

let count = 0;
for (let i = 0; i < POOL.length; i++) {
    const spec = POOL[i];
    spec.id = i;

    // Charset: $gen_KEY.png and indexed alias $gen_cINDEX.png
    const charBuf = compositeCharset(spec);
    writePNG(path.join(OUT_CHAR_DIR, `$gen_${spec.key}.png`), 144, 192, charBuf);
    writePNG(path.join(OUT_CHAR_DIR, `$gen_c${i}.png`), 144, 192, charBuf);
    writePNG(path.join(ROOT, 'game', 'img', 'characters', `$gen_${spec.key}.png`), 144, 192, charBuf);
    writePNG(path.join(ROOT, 'game', 'img', 'characters', `$gen_c${i}.png`), 144, 192, charBuf);

    // Portrait: face_gen_KEY.png and indexed alias face_gen_cINDEX.png
    const faceBuf = compositePortrait(spec);
    writePNG(path.join(OUT_FACE_DIR, `face_gen_${spec.key}.png`), 144, 144, faceBuf);
    writePNG(path.join(OUT_FACE_DIR, `face_gen_c${i}.png`), 144, 144, faceBuf);
    writePNG(path.join(ROOT, 'game', 'img', 'faces', `face_gen_${spec.key}.png`), 144, 144, faceBuf);
    writePNG(path.join(ROOT, 'game', 'img', 'faces', `face_gen_c${i}.png`), 144, 144, faceBuf);

    count++;
}

// Deploy clothing/armor layers for dynamic portrait overlay
const GEN_FACE_DIR = path.join(ROOT, 'game', 'img', 'generator', 'face');
for (let c = 1; c <= 4; c++) {
    ['male_cloth_', 'female_cloth_'].forEach(pfx => {
        const fn = `${pfx}${c}.png`;
        const src = path.join(GEN_FACE_DIR, fn);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(ROOT, 'game', 'img', 'faces', fn));
            fs.copyFileSync(src, path.join(OUT_FACE_DIR, fn));
        }
    });
}

// Write the pool manifest for in-engine lookup
fs.writeFileSync(
    path.join(ROOT, 'game', 'data', 'UF_GeneratorPool.json'),
    JSON.stringify(POOL, null, 2),
    'utf8'
);

console.log(`Baking complete: ${count} combinations (4x files each) generated in ${Date.now() - start} ms!`);
console.log(`Manifest written to game/data/UF_GeneratorPool.json`);
