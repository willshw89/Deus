'use strict';

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

const PROMPT_DWARF = `16-bit SNES pixel art mouse cursor of an Ornate Dwarven Runic War Pick on a solid flat uniform magenta #FF00FF background.
Single cursor, angled diagonally pointing toward the upper-left (top-left).
Features: Heavy forged steel dwarven war pick with a sharp armor-piercing pointed spike tip at the top-left, glowing golden rune engravings on the steel head, sturdy dark oak handle with brass wire wrap, and an iron butt cap.
CRITICAL: The steel pick spike must taper to a razor-sharp single point at the top-left for precision pointing.
Crisp pixel art, clean dark silhouette outlines, no blur, solid flat magenta #FF00FF background.`;

const PROMPT_ORC = `16-bit SNES pixel art mouse cursor of a Brutal Orc Iron War Dagger / Pointed Cleaver on a solid flat uniform magenta #FF00FF background.
Single cursor, angled diagonally pointing toward the upper-left (top-left).
Features: Heavy brutal jagged black iron blade with blood-stained notches tapering to an ultra-sharp wicked point at the top-left, wrapped beast-leather grip, crude bone crossguard and tusk pommel.
CRITICAL: The iron blade must taper to a razor-sharp single point at the top-left for precision pointing.
Crisp pixel art, clean dark silhouette outlines, no blur, solid flat magenta #FF00FF background.`;

async function main() {
    console.log('Generating Dwarf War Pick Cursor...');
    await generateWithNanoBananaPro({
        prompt: PROMPT_DWARF,
        outputPath: path.join(RAW_DIR, 'cursor_dwarf_pick_raw.png'),
        referenceImagePaths: []
    });

    console.log('Generating Orc War Dagger Cursor...');
    await generateWithNanoBananaPro({
        prompt: PROMPT_ORC,
        outputPath: path.join(RAW_DIR, 'cursor_orc_dagger_raw.png'),
        referenceImagePaths: []
    });

    console.log('Both cursors generated successfully!');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
