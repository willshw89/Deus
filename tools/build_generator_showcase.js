const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

function toBase64(filePath) {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
}

const face13 = toBase64('art/generator_demo/Face/Male/FG_Face_p13_c1_m001.png');
const face14 = toBase64('art/generator_demo/Face/Male/FG_Face_p14_c1_m001.png');
const face15 = toBase64('art/generator_demo/Face/Male/FG_Face_p15_c1_m001.png');

const iconFace13 = toBase64('art/generator_demo/Variation/Male/icon_Face_p13.png');
const iconFace14 = toBase64('art/generator_demo/Variation/Male/icon_Face_p14.png');
const iconFace15 = toBase64('art/generator_demo/Variation/Male/icon_Face_p15.png');

const walk27 = toBase64('art/generator_demo/TV/Male/TV_Clothing2_p27.png');
const walk28 = toBase64('art/generator_demo/TV/Male/TV_Clothing2_p28.png');
const walk29 = toBase64('art/generator_demo/TV/Male/TV_Clothing2_p29.png');

const iconCloth27 = toBase64('art/generator_demo/Variation/Male/icon_Clothing_p27.png');
const iconCloth28 = toBase64('art/generator_demo/Variation/Male/icon_Clothing_p28.png');
const iconCloth29 = toBase64('art/generator_demo/Variation/Male/icon_Clothing_p29.png');

const tvd27 = toBase64('art/generator_demo/TVD/Male/TVD_Clothing_p27.png');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RMMZ Character Generator Demo — U7 Portraits & Western FF5 Sprites</title>
<style>
  body {
    background: #11141a;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 24px;
  }
  h1 { color: #f6ad55; margin-bottom: 6px; font-size: 24px; }
  p.subtitle { color: #a0aec0; margin-top: 0; font-size: 14px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
  .card {
    background: #1a202c;
    border: 1px solid #2d3748;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }
  .card h3 { color: #63b3ed; margin-top: 0; font-size: 16px; border-bottom: 1px solid #2d3748; padding-bottom: 8px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #2b6cb0; color: white; margin-bottom: 12px; }
  .preview-row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
  .portrait-box { text-align: center; }
  .portrait-box img {
    image-rendering: pixelated;
    width: 144px;
    height: 144px;
    border: 2px solid #4a5568;
    background: #0f1318;
    border-radius: 4px;
  }
  .sprite-box { text-align: center; flex: 1; }
  .sprite-box img {
    image-rendering: pixelated;
    border: 1px solid #4a5568;
    background: #0f1318;
    border-radius: 4px;
  }
  .icon-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; font-size: 12px; color: #a0aec0; }
  .icon-row img { width: 32px; height: 32px; image-rendering: pixelated; border: 1px solid #4a5568; border-radius: 4px; }
  .instructions {
    background: #232d3f;
    border-left: 4px solid #f6ad55;
    padding: 16px 20px;
    border-radius: 6px;
    margin-top: 24px;
  }
  .instructions h2 { color: #f6ad55; margin-top: 0; font-size: 18px; }
  ol { margin: 8px 0 0 20px; padding: 0; font-size: 14px; line-height: 1.6; }
  code { background: #1a202c; padding: 2px 6px; border-radius: 3px; color: #68d391; font-family: Consolas, monospace; }
</style>
</head>
<body>

<h1>RPG Maker MZ Character Generator Demo Pack</h1>
<p class="subtitle">Authentic <strong>Ultima VII Style Painted Portraits</strong> paired with <strong>Distinctly Western FF5 Chibi Character Sets</strong></p>

<div class="grid">
  <!-- Preset 1 -->
  <div class="card">
    <span class="tag">Preset 1: Townsman / Forester</span>
    <h3>Face p13 &amp; Clothing p27</h3>
    <div class="preview-row">
      <div class="portrait-box">
        <div style="font-size:11px; color:#cbd5e0; margin-bottom:4px;">U7 Portrait (144×144)</div>
        <img src="${face13}" alt="Cedric U7">
      </div>
      <div class="sprite-box">
        <div style="font-size:11px; color:#cbd5e0; margin-bottom:4px;">Western FF5 (144×192)</div>
        <img src="${walk27}" style="width:144px; height:192px;" alt="FF5 Walk 1">
      </div>
    </div>
    <div class="icon-row">
      <img src="${iconFace13}" alt="Face Icon">
      <span>Face icon <code>icon_Face_p13.png</code></span>
    </div>
    <div class="icon-row">
      <img src="${iconCloth27}" alt="Cloth Icon">
      <span>Clothing icon <code>icon_Clothing_p27.png</code></span>
    </div>
  </div>

  <!-- Preset 2 -->
  <div class="card">
    <span class="tag">Preset 2: Iron Guard / Knight</span>
    <h3>Face p14 &amp; Clothing p28</h3>
    <div class="preview-row">
      <div class="portrait-box">
        <div style="font-size:11px; color:#cbd5e0; margin-bottom:4px;">U7 Portrait (144×144)</div>
        <img src="${face14}" alt="Kogan U7">
      </div>
      <div class="sprite-box">
        <div style="font-size:11px; color:#cbd5e0; margin-bottom:4px;">Western FF5 (144×192)</div>
        <img src="${walk28}" style="width:144px; height:192px;" alt="FF5 Walk 2">
      </div>
    </div>
    <div class="icon-row">
      <img src="${iconFace14}" alt="Face Icon">
      <span>Face icon <code>icon_Face_p14.png</code></span>
    </div>
    <div class="icon-row">
      <img src="${iconCloth28}" alt="Cloth Icon">
      <span>Clothing icon <code>icon_Clothing_p28.png</code></span>
    </div>
  </div>

  <!-- Preset 3 -->
  <div class="card">
    <span class="tag">Preset 3: Veteran Smith / Craftsman</span>
    <h3>Face p15 &amp; Clothing p29</h3>
    <div class="preview-row">
      <div class="portrait-box">
        <div style="font-size:11px; color:#cbd5e0; margin-bottom:4px;">U7 Portrait (144×144)</div>
        <img src="${face15}" alt="Kragan U7">
      </div>
      <div class="sprite-box">
        <div style="font-size:11px; color:#cbd5e0; margin-bottom:4px;">Western FF5 (144×192)</div>
        <img src="${walk29}" style="width:144px; height:192px;" alt="FF5 Walk 3">
      </div>
    </div>
    <div class="icon-row">
      <img src="${iconFace15}" alt="Face Icon">
      <span>Face icon <code>icon_Face_p15.png</code></span>
    </div>
    <div class="icon-row">
      <img src="${iconCloth29}" alt="Cloth Icon">
      <span>Clothing icon <code>icon_Clothing_p29.png</code></span>
    </div>
  </div>
</div>

<div class="card" style="margin-bottom:24px;">
  <h3>Downed Character Set (TVD - 144×48)</h3>
  <p style="font-size:13px; color:#a0aec0; margin-top:0;">Downed/incapacitated frames installed into <code>TVD_Clothing_p27.png</code>, <code>p28</code>, <code>p29</code>:</p>
  <img src="${tvd27}" style="image-rendering:pixelated; width:288px; height:96px; border:1px solid #4a5568; background:#0f1318; border-radius:4px;" alt="TVD Downed">
</div>

<div class="instructions">
  <h2>How to Test Live in RPG Maker MZ Right Now</h2>
  <ol>
    <li>In RPG Maker MZ, open the <strong>Character Generator</strong> window (click the icon in the top toolbar with the character face, or press <code>Tools → Character Generator</code>).</li>
    <li>Select the <strong>Male</strong> tab.</li>
    <li>Click on the <strong>Clothing</strong> category on the left:
      <ul>
        <li>Scroll to the end of the icons grid. You will see three new icons: slots <strong>27</strong>, <strong>28</strong>, and <strong>29</strong>!</li>
        <li>Click any of them. Notice the 3×4 walking sprite and downed sprite in the preview immediately update to our authentic Western FF5 look!</li>
      </ul>
    </li>
    <li>Click on the <strong>Face</strong> category on the left:
      <ul>
        <li>Scroll to the end of the face icons grid. You will see slots <strong>13</strong>, <strong>14</strong>, and <strong>15</strong>!</li>
        <li>Click any of them. Notice the top-left portrait immediately displays the authentic Ultima VII painted medieval portrait!</li>
      </ul>
    </li>
    <li>Click <strong>"Face Image..."</strong> or <strong>"Walking Character..."</strong> to export directly into your game!</li>
  </ol>
</div>

</body>
</html>
`;

fs.writeFileSync(path.join(ARTIFACT_DIR, 'rmmz_generator_demo_showcase.html'), html);
console.log('Showcase artifact written to:', path.join(ARTIFACT_DIR, 'rmmz_generator_demo_showcase.html'));

