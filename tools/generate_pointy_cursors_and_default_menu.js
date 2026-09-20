'use strict';

/**
 * tools/generate_pointy_cursors_and_default_menu.js
 *
 * Generates:
 * 1. Sheet of 12 Pointy Cursors (11 factions + 1 default main menu cursor)
 *    ALL CURSORS POINTY pointing top-left.
 * 2. Default Main Menu Theme Frame & Wallpaper (UF_Menu_default.png)
 * 3. Default Window Skin (Window_default.png)
 *
 * Powered 100% by Google Nano Banana Pro (gemini-3-pro-image) per Rule 11.
 */

const fs = require('fs');
const path = require('path');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

fs.mkdirSync(RAW_DIR, { recursive: true });

const CURSORS_RAW = path.join(RAW_DIR, 'pointy_cursors_12_raw.png');
const MENU_RAW = path.join(RAW_DIR, 'default_menu_theme_raw.png');
const WINDOW_RAW = path.join(RAW_DIR, 'default_window_skin_raw.png');

const PROMPT_CURSORS = `16-bit SNES pixel art mouse cursor sprite sheet, exactly 12 cursors arranged in a 4 columns by 3 rows grid on a solid flat uniform magenta #FF00FF background.
CRITICAL DESIGN REQUIREMENT: EVERY SINGLE CURSOR MUST BE POINTY! Each cursor must be angled diagonally pointing toward the upper-left (top-left) with a sharp, tapered, razor-pointed tip so it functions as a precision mouse pointer.
Grid cells:
Row 1:
- Cell 1 (Default / Main Menu): Classic ornate medieval fantasy steel arming pointer / dagger with sharp steel tip, gold crossguard, ruby pommel, angled pointing top-left.
- Cell 2 (Human): Polished steel gauntlet with pointed extended index finger, pointing top-left.
- Cell 3 (Elf): Elegant slender silver leaf-blade dagger with emerald vine wrap, sharp needle tip pointing top-left.
- Cell 4 (Dwarf): Ornate dwarven runic war-pick with a sharp pointed steel armor-piercing spike, pointing top-left.
Row 2:
- Cell 5 (Gnome): Brass clockwork drafting needle / tinker stylus with fine gears and a razor-sharp pointed needle tip, pointing top-left.
- Cell 6 (Goblin): Wicked jagged rusted iron shiv / barbed bone needle with a sharp vicious point, pointing top-left.
- Cell 7 (Orc): Brutal notched black iron war-dagger / cleaver with a sharp pointed tip, bone grip, pointing top-left.
- Cell 8 (Lizardfolk): Serrated obsidian fang dagger / sharp spiral shell spire with razor point, pointing top-left.
Row 3:
- Cell 9 (Kobold): Pointed iron mining pick spike with sharp steel tip and small warm ember glow, pointing top-left.
- Cell 10 (Undead): Skeletal hand holding a sharp needle-thin bone wand with a ghostly cyan soul flame at the sharp point, pointing top-left.
- Cell 11 (Starborn): Sharp radiant cosmic crystal needle / astral prism with glowing facets tapering to a razor point, pointing top-left.
- Cell 12 (Swarm): Sharp iridescent violet chitinous stinger / pointed insect mandible with a razor needle point, pointing top-left.
Every cursor has a distinct sharp point at the top-left, crisp pixel art, clean dark silhouette outlines, solid flat magenta #FF00FF background, no blur.`;

const PROMPT_DEFAULT_MENU = `16-bit SNES pixel art full-screen UI menu frame and background theme in serious chibi / Ultima Fortress style (816x624 aspect ratio, 4:3) on solid flat dark background.
Theme: Neutral Epic Fantasy Fortress / Citadel Main Menu Theme.
Framing elements:
- Outer border: Grand ancient fortress architecture with carved granite pillars on the left and right, iron-bound masonry battlements at the top with a sculpted stone fortress gate crest in the center, and a sturdy stone shelf at the bottom.
- Wallpaper / Backdrop: Seamless dark charcoal slate stone tile texture with subtle royal navy tint and fine masonry seams.
- Clean rectangular inner layout area for game menu windows.
Crisp pixel art, clean borders, rich fantasy RPG aesthetic, no blur.`;

const PROMPT_DEFAULT_WINDOW = `16-bit SNES pixel art RPG Maker MZ windowskin (192x192 pixels) on a solid flat magenta #FF00FF background.
Theme: Classic Fortress Granite and Burnished Bronze.
Standard RMMZ window skin components:
- Top-left 64x64: Dark textured slate stone background fill.
- Top-right 64x64: Carved granite window border with burnished bronze rivet corners and 8px beveled edge.
- Bottom-left 64x64: Semi-transparent window background tile and animated selection frame.
- Bottom-right 64x64: Directional scroll arrows, pause indicator, and clean UI markers.
Crisp pixel art, clean edges, solid flat magenta #FF00FF background.`;

async function main() {
    console.log('=== Step 1: Generating 12 Pointy Cursors ===');
    if (!fs.existsSync(CURSORS_RAW)) {
        console.log('Generating:', CURSORS_RAW);
        await generateWithNanoBananaPro({
            prompt: PROMPT_CURSORS,
            outputPath: CURSORS_RAW,
            referenceImagePaths: []
        });
        console.log('Pointy Cursors generated.');
    } else {
        console.log('Pointy Cursors already exists at:', CURSORS_RAW);
    }

    console.log('\n=== Step 2: Generating Default Main Menu Theme ===');
    if (!fs.existsSync(MENU_RAW)) {
        console.log('Generating:', MENU_RAW);
        await generateWithNanoBananaPro({
            prompt: PROMPT_DEFAULT_MENU,
            outputPath: MENU_RAW,
            referenceImagePaths: []
        });
        console.log('Default Menu Theme generated.');
    } else {
        console.log('Default Menu Theme already exists at:', MENU_RAW);
    }

    console.log('\n=== Step 3: Generating Default Window Skin ===');
    if (!fs.existsSync(WINDOW_RAW)) {
        console.log('Generating:', WINDOW_RAW);
        await generateWithNanoBananaPro({
            prompt: PROMPT_DEFAULT_WINDOW,
            outputPath: WINDOW_RAW,
            referenceImagePaths: []
        });
        console.log('Default Window Skin generated.');
    } else {
        console.log('Default Window Skin already exists at:', WINDOW_RAW);
    }

    console.log('\nAll raw assets successfully generated via Google Nano Banana Pro!');
}

main().catch(err => {
    console.error('Generation failed:', err);
    process.exit(1);
});
