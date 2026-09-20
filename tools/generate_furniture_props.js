'use strict';

const path = require('path');
const fs = require('fs');
const { generateWithNanoBananaPro } = require('./generate_nano_banana_pro');

const ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT, 'art', 'raw');

async function main() {
    console.log('=== Generating Domestic Furniture, Kitchen, and Shop Props with Google Nano Banana Pro ===');

    const promptDomestic = `Pixel art sprite sheet, 16-bit serious chibi aesthetic, 3/4 top-down perspective RPG Maker style, showing 9 distinct domestic furniture, kitchen, and shop world objects arranged in a clean 3x3 grid on a SOLID UNIFORM BRIGHT MAGENTA (#FF00FF) BACKGROUND with no shadows on the background.

Grid items (each object is neatly separated and centered in its cell):
- Top-Left (Row 1, Col 1): STURDY WOODEN BED. Handcrafted solid oak bed frame, carved headboard, linen mattress, white pillow, dark green folded woolen blanket at foot.
- Top-Center (Row 1, Col 2): IRON-BANDED CHEST. Heavy dark oak wooden storage chest with reinforced iron corner brackets, heavy brass latch, and iron side handles.
- Top-Right (Row 1, Col 3): TIMBER DINING TABLE. Solid heavy wood plank trestle table with wooden trencher plates, carved bowls, and two pewter tankards.
- Mid-Left (Row 2, Col 1): WOODEN DINING BENCH. Sturdy wooden dining bench / chair matching the oak table with turned wood legs.
- Mid-Center (Row 2, Col 2): KITCHEN PREP COUNTER. Butcher-block food preparation counter with wooden cutting board, small iron kitchen knife/cleaver, and hanging bunch of herbs.
- Mid-Right (Row 2, Col 3): KITCHEN PANTRY & LARDER. Tall wooden storage larder shelves with clay storage jars, small wooden pickle cask, and hanging dried roots/sausages.
- Bottom-Left (Row 3, Col 1): STONE COOKING HEARTH. Fieldstone cooking hearth/stove with an iron cauldron pot simmering over red glowing campfire embers and a rustic stone chimney base.
- Bottom-Center (Row 3, Col 2): SHOP / TRADE COUNTER. Polished wooden merchant trade counter with hanging brass balance scales, open ledger book, and a red display cloth runner.
- Bottom-Right (Row 3, Col 3): APOTHECARY & HERBALIST WORKBENCH. Craft bench with stone mortar and pestle, drying rack with green herbal sprigs, and small glass apothecary phials.

Style: Authentic 16-bit pixel art, crisp pixels, dark near-black outer contour lines, grounded medieval tactical RPG aesthetic (Tactics Ogre / FF5), warm earth and wood tones, clean alpha edges against flat magenta #FF00FF. ZERO 3D rendering, ZERO smooth blurry gradients.`;

    const outPropsPath = path.join(RAW_DIR, 'props_domestic_kitchen_shops_nano_pro.png');
    console.log(`Generating 9 domestic & shop props -> ${outPropsPath}`);
    await generateWithNanoBananaPro({
        prompt: promptDomestic,
        outputPath: outPropsPath
    });

    const promptHearthAnim = `Pixel art sprite strip, 16-bit serious chibi aesthetic, 3/4 top-down perspective RPG Maker style, showing 3 ANIMATION FRAMES of a STONE COOKING HEARTH in a single horizontal row of 3 frames on a SOLID UNIFORM BRIGHT MAGENTA (#FF00FF) BACKGROUND.
Frame 1: Stone cooking hearth with iron cauldron pot, calm warm burning embers and small licking yellow-orange flame beneath pot.
Frame 2: Stone cooking hearth with iron cauldron pot, flame flickers taller to the right side with orange heat glow.
Frame 3: Stone cooking hearth with iron cauldron pot, flame shifts to the left with tiny rising ember sparks.
Style: Crisp 16-bit pixel art, bold dark outlines, cobblestone masonry texture, warm glowing hearth fire loop, flat magenta #FF00FF background.`;

    const outHearthPath = path.join(RAW_DIR, 'kitchen_hearth_anim_nano_pro.png');
    console.log(`Generating 3-frame cooking hearth animation -> ${outHearthPath}`);
    await generateWithNanoBananaPro({
        prompt: promptHearthAnim,
        outputPath: outHearthPath
    });

    console.log('=== Generation Complete ===');
}

main().catch(err => {
    console.error('Error generating props:', err);
    process.exit(1);
});
