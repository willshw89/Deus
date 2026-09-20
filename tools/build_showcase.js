const fs = require('fs');
const { writePNG } = require('./png_util');
const { readPNG } = require('./read_png');

const files = [
    { name: 'eye_e1', label: 'Option 1: 2x2 Catchlight Eyes (e1)' },
    { name: 'eye_e2', label: 'Option 2: 2x1 Sclera Eyes (e2)' },
    { name: 'eye_e6', label: 'Option 3: 2x2 Framed Sclera Eyes (e6)' },
    { name: 'settler_v13', label: 'Option 4: Chibi Inset Eyes (v13)' }
];

// Let's create an HTML review page in artifacts / test_output
let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Settler Male 16x16 Sprite Candidates</title>
<style>
body { background: #1a1a24; color: #e2e8f0; font-family: system-ui, sans-serif; padding: 24px; }
h1 { color: #f8fafc; margin-bottom: 8px; }
p { color: #94a3b8; font-size: 14px; margin-top: 0; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 24px; }
.card { background: #242436; border: 1px solid #383854; border-radius: 8px; padding: 16px; text-align: center; }
.card h3 { margin: 0 0 12px 0; color: #38bdf8; font-size: 16px; }
.preview-box { background: #0f0f18; padding: 16px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; gap: 20px; }
.scale-box { display: flex; flex-direction: column; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }
img.pixelated { image-rendering: pixelated; image-rendering: crisp-edges; }
</style>
</head>
<body>
<h1>16x16 Native Human Male Settler - FF6 / Shining Force Style</h1>
<p>NATIVE 16x16 resolution, #FF00FF background, upright 3/4 top-down facing south, head ~1/3 total height, undyed pale-brown homespun tunic, brown rope belt, dark grey-brown trousers, simple dark boots touching row 16.</p>
<div class="card-grid">
`;

for (const f of files) {
    const p1 = `settler_${f.name}_1x.png`;
    // copy 1x to test_output if needed
    html += `
    <div class="card">
      <h3>${f.label}</h3>
      <div class="preview-box">
        <div class="scale-box">
          <img class="pixelated" src="${f.name}_1x.png" width="16" height="16">
          <span>1x (16px)</span>
        </div>
        <div class="scale-box">
          <img class="pixelated" src="${f.name}_1x.png" width="48" height="48">
          <span>3x (48px)</span>
        </div>
        <div class="scale-box">
          <img class="pixelated" src="${f.name}_16x.png" width="128" height="128">
          <span>8x (128px)</span>
        </div>
      </div>
    </div>
    `;
}

html += `
</div>
</body>
</html>
`;

fs.writeFileSync('game/test_output/settler_review.html', html);
console.log('Written settler_review.html');

