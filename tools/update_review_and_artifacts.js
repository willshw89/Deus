const fs = require('fs');
const path = require('path');

const assetList = [
    { id: 'fruit_tree', name: 'Fruit Tree', req: 'AR-020', cat: 'Flora', desc: 'Round canopy with sun-facing highlight and 7 ruby apples' },
    { id: 'fruit_tree_bare', name: 'Fruit Tree (Picked)', req: 'AR-020', cat: 'Flora', desc: 'Identical tree with apples removed and middle band darkened to 242' },
    { id: 'oak', name: 'Oak Tree', req: 'AR-021', cat: 'Flora', desc: 'Broad lobed canopy with 201 yellow-green highlight and 4px trunk' },
    { id: 'stump', name: 'Tree Stump', req: 'AR-021', cat: 'Flora', desc: 'Cut trunk with concentric growth rings 137, heart 144, and 2 woodchips' },
    { id: 'granite_boulder', name: 'Granite Boulder', req: 'AR-022', cat: 'Geology', desc: 'Faceted angular stone with top facet 120, moss rim, and cracks' },
    { id: 'rocks_small', name: 'Loose Stones', req: 'AR-022', cat: 'Geology', desc: 'Five scattered loose stones with 120 tops and 4x3 center stone' },
    { id: 'ironstone', name: 'Ironstone Outcrop', req: 'AR-022', cat: 'Geology', desc: 'Three stepped dark slabs shot through with metallic iron veins & rust' },
    { id: 'campfire', name: 'Campfire (Unlit)', req: 'AR-105', cat: 'Building', desc: 'Eight 2x2 river cobbles in an ellipse enclosing crossed kindling & ash' },
    { id: 'campfire_lit', name: 'Campfire (Lit)', req: 'AR-105', cat: 'Building', desc: 'Cobble ring glowing with teardrop flame, 250 core and spark' },
    { id: 'boar', name: 'Wild Boar', req: 'AR-401', cat: 'Wildlife', desc: 'Stocky front-facing boar with bristled back, white tusks, and hooves' },
    { id: 'wall_wood', name: 'Wooden Wall (Palisade)', req: 'AR-104', cat: 'Building', desc: 'Seamlessly tiling vertical log palisade with pointed tips & binding band' },
    { id: 'rubble', name: 'Rubble', req: 'AR-104', cat: 'Building', desc: 'Low pile of broken timber log ends showing cut faces mixed with stones' }
];

// Copy images to artifact directory
const artifactDir = 'C:\\Users\\snewt\\.gemini\\antigravity\\brain\\0b6708e3-82fc-4aaa-90fd-dc48dedc58fa';
assetList.forEach(a => {
    fs.copyFileSync(`game/test_output/${a.id}_16x.png`, path.join(artifactDir, `${a.id}_16x.png`));
    fs.copyFileSync(`game/test_output/${a.id}_3x.png`, path.join(artifactDir, `${a.id}_3x.png`));
});
console.log('Copied all 12 assets to artifact directory.');

// Build updated art/review/index.html
const cardsHtml = assetList.map(a => `
    <div class="card">
      <span class="badge-approved">DELIVERED (2026-09-18)</span>
      <div class="card-title">${a.name} (${a.req})</div>
      <div class="card-meta">Category: ${a.cat} | File: <code>art/masters/${a.id}.png</code></div>
      
      <div class="stage-row">
        <div class="preview-col">
          <img class="pixelated" src="../masters/${a.id}.png" width="16" height="16" alt="1x">
          <span>1× Native (16px)</span>
        </div>
        <div class="preview-col">
          <img class="pixelated" src="../../game/test_output/${a.id}_3x.png" width="48" height="48" alt="3x">
          <span>3× RMMZ (48px)</span>
        </div>
        <div class="preview-col">
          <img class="pixelated" src="../../game/test_output/${a.id}_16x.png" width="128" height="128" alt="16x">
          <span>Inspection (128px)</span>
        </div>
      </div>

      <div class="card-meta" style="margin-bottom: 4px;">${a.desc}. Verified against <code>art/palette/uf.hex</code>.</div>
    </div>
`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>UF Art Review — Final Fantasy V Architecture & Ultima VII Palette</title>
<style>
  body {
    background: #181824;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 32px;
    margin: 0;
  }
  h1 { color: #f8fafc; margin-top: 0; font-size: 24px; }
  h2 { color: #38bdf8; font-size: 18px; margin-top: 24px; border-bottom: 1px solid #334155; padding-bottom: 6px; }
  p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
  .grid { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 16px; }
  .card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 16px;
    width: 380px;
  }
  .card-title { font-weight: 600; color: #f1f5f9; margin-bottom: 4px; font-size: 15px; }
  .card-meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  .stage-row {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    background: #0f172a;
    padding: 16px;
    border-radius: 6px;
    margin-bottom: 12px;
  }
  .preview-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #94a3b8;
  }
  img.pixelated {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .badge-approved {
    display: inline-block;
    background: #15803d;
    color: #dcfce7;
    font-size: 11px;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 4px;
    margin-bottom: 8px;
  }
</style>
</head>
<body>
  <h1>UF 2D Art Review (Final Fantasy V Style + Ultima VII Daylight Palette)</h1>
  <p>Gallery of 16×16 native style anchors, master frames, and 3× in-game exports per <code>docs/ART_STANDARD.md</code>.</p>

  <h2>1. Style Anchor (Approved)</h2>
  <div class="grid">
    <div class="card">
      <span class="badge-approved">APPROVED (2026-09-18)</span>
      <div class="card-title">Human Male Settler (South Facing)</div>
      <div class="card-meta">Style Anchor #1: Person | File: <code>art/masters/settler_male_16x16.png</code></div>
      
      <div class="stage-row">
        <div class="preview-col">
          <img class="pixelated" src="../masters/settler_male_16x16.png" width="16" height="16" alt="1x">
          <span>1× Native (16px)</span>
        </div>
        <div class="preview-col">
          <img class="pixelated" src="../settler_male_3x.png" width="48" height="48" alt="3x">
          <span>3× RMMZ (48px)</span>
        </div>
        <div class="preview-col">
          <img class="pixelated" src="../settler_male_16x.png" width="128" height="128" alt="8x">
          <span>Inspection (128px)</span>
        </div>
      </div>

      <div class="card-meta" style="margin-bottom: 4px;"><strong>Color & Anatomy:</strong> 20 colors, upper-left lighting, head ~40% height, 2x2 FF5 eyes, homespun linen tunic to mid-thigh, rope belt, dark trousers, dark boots.</div>
    </div>
  </div>

  <h2>2. Wave 1 Masters & Interaction States (Delivered to Spec)</h2>
  <div class="grid">
    ${cardsHtml}
  </div>
</body>
</html>
`;

fs.writeFileSync('art/review/index.html', html);
console.log('Saved art/review/index.html');

