const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/snewt/.gemini/antigravity/brain/e6a9a54f-2cc6-432e-b7ec-5affda42dd85';

function toBase64(filePath) {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
}

console.log('Encoding assets to base64...');
const maleSheet = toBase64('art/raw/u7_modular_portraits_nano_pro.png');
const femaleSheet = toBase64('art/raw/u7_female_modular_portraits_nano_pro.png');
const childWalk = toBase64('art/raw/human_child_walk_nano_pro.png');
const modularHairBeards = toBase64('art/raw/modular_hair_beards_nano_pro.png');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Human Faction Genetics & Aging System — Nano Banana Pro</title>
<style>
  body {
    background: #0d1117;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 24px;
    line-height: 1.5;
  }
  h1 { color: #f6ad55; margin-bottom: 6px; font-size: 26px; }
  p.lead { color: #a0aec0; margin-top: 0; font-size: 15px; margin-bottom: 24px; max-width: 900px; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; background: #2b6cb0; color: white; margin-bottom: 12px; }
  .badge-nano { background: #6b46c1; }
  .badge-gen { background: #2c7a7b; }
  
  .section-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 28px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }
  .section-card h2 {
    color: #63b3ed;
    margin-top: 0;
    font-size: 18px;
    border-bottom: 1px solid #30363d;
    padding-bottom: 10px;
  }
  .image-container {
    text-align: center;
    background: #090d13;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #21262d;
    margin-top: 12px;
  }
  .image-container img {
    image-rendering: pixelated;
    max-width: 100%;
    height: auto;
    border: 1px solid #30363d;
    border-radius: 4px;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .feature-list {
    margin: 10px 0 0 0;
    padding-left: 20px;
    font-size: 14px;
    color: #cbd5e0;
  }
  .feature-list li { margin-bottom: 6px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14px;
    font-size: 13px;
  }
  th, td {
    border: 1px solid #30363d;
    padding: 8px 12px;
    text-align: left;
  }
  th { background: #21262d; color: #f6ad55; font-weight: 600; }
  tr:nth-child(even) { background: #1a202c; }
  code { background: #21262d; padding: 2px 6px; border-radius: 3px; color: #68d391; font-family: Consolas, monospace; }
  .highlight { color: #f6ad55; font-weight: bold; }
</style>
</head>
<body>

<h1>Human Faction Genetics, Aging &amp; Modular Art Pipeline</h1>
<p class="lead">Generated exclusively using <strong>Google Nano Banana Pro</strong> (<code>gemini-3-pro-image</code>). Demonstrating the 1:1 synchronization between <strong>Ultima VII Style Painted Portraits</strong> and <strong>16-bit Western FF5 Serious Chibi Charsets</strong> across all human demographics, genetic traits, and life stages.</p>

<!-- SECTION 1: MALE PORTRAITS -->
<div class="section-card">
  <span class="badge badge-nano">Nano Banana Pro — Master Sheet 1</span>
  <h2>1. Human Adult Male: Modular U7 Portraits &amp; Armor Busts</h2>
  <p style="font-size: 14px; color: #a0aec0; margin: 0 0 12px 0;">
    Features 3 stone-arch face bases (Nobleman, Scarred Warrior, Elder), 4 modular hairstyles (Parted brown, Blonde crop, Black curls, Receding gray), 4 modular beards (Goatee, Bushy brown, Braided white, Eyepatch stubble), and 4 modular armor/clothing busts (Leather jerkin, Steel gorget, Ranger mantle, Blacksmith apron).
  </p>
  <div class="image-container">
    <img src="${maleSheet}" style="max-height: 520px;" alt="Human Male Modular Portraits">
  </div>
</div>

<!-- SECTION 2: FEMALE & CHILD PORTRAITS -->
<div class="section-card">
  <span class="badge badge-nano">Nano Banana Pro — Master Sheet 2</span>
  <h2>2. Human Female &amp; Children: Modular U7 Portraits &amp; Dress/Armor Busts</h2>
  <p style="font-size: 14px; color: #a0aec0; margin: 0 0 12px 0;">
    Features 3 female stone-arch face bases (Youthful noblewoman, Fierce warrior knight, Elder matriarch), 4 modular female hairstyles (Flowing auburn, Blonde side braid, Coiled black bun, Silver bob), 2 child face bases (Young boy, Young girl), and 4 female armor/clothing busts (Leather jerkin, Steel cuirass, Hooded green mantle, Linen herbalist dress).
  </p>
  <div class="image-container">
    <img src="${femaleSheet}" style="max-height: 520px;" alt="Human Female Modular Portraits">
  </div>
</div>

<!-- SECTION 3: CHARSETS & AGING -->
<div class="grid-2">
  <!-- Child Walk -->
  <div class="section-card">
    <span class="badge badge-gen">Life Stage: Child (28–32 px)</span>
    <h2>3. Human Child Walk Charset</h2>
    <p style="font-size: 13px; color: #a0aec0;">
      12-sprite walk cycle (South, West, East, North) in serious chibi style (~2.5 heads tall) wearing a simple linen peasant tunic with rope belt and turnshoes.
    </p>
    <div class="image-container">
      <img src="${childWalk}" style="max-height: 380px;" alt="Human Child Walk Sheet">
    </div>
  </div>

  <!-- Modular Hair & Beards -->
  <div class="section-card">
    <span class="badge badge-gen">Modular Charset Layers</span>
    <h2>4. 4-Direction Hair &amp; Beard Overlays</h2>
    <p style="font-size: 13px; color: #a0aec0;">
      Modular hair wigs (Short crop, Shoulder wavy, Curly, Braided ponytail) and beards (Goatee, Full beard, Braided elder beard) in all 4 facings, ready to stack onto base bodies.
    </p>
    <div class="image-container">
      <img src="${modularHairBeards}" style="max-height: 380px;" alt="Modular Hair and Beards">
    </div>
  </div>
</div>

<!-- SECTION 4: GENETICS & AGING MATRIX -->
<div class="section-card">
  <span class="badge badge-gen">Genetics &amp; Inheritance Architecture</span>
  <h2>5. How Genetics &amp; Aging Operate in the Engine</h2>
  
  <table>
    <thead>
      <tr>
        <th>Trait / Locus</th>
        <th>Face Asset (Portrait 144×144)</th>
        <th>Charset Asset (Sprite 48×48)</th>
        <th>Variations</th>
        <th>Inheritance Mechanism</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Skin Complexion</strong></td>
        <td>Fair, Medium/Tanned, Dark bases</td>
        <td>Fair, Medium, Dark body sheets</td>
        <td>3 tones</td>
        <td><strong>Blended:</strong> Averages mother and father tones &plusmn; 5% variation</td>
      </tr>
      <tr>
        <td><strong>Hair Style</strong></td>
        <td>Modular hair wig overlays (Row 1)</td>
        <td>Modular hair sprite overlays (4 directions)</td>
        <td>4 per gender</td>
        <td><strong>Allele:</strong> Inherited from mother, father, or grandparent allele</td>
      </tr>
      <tr>
        <td><strong>Hair Color</strong></td>
        <td>Black, Brown, Red, Blonde ramps</td>
        <td>Matching 4 palette ramps</td>
        <td>4 colors</td>
        <td><strong>Mendelian:</strong> Black/Brown dominant (B), Blonde/Red recessive (b)</td>
      </tr>
      <tr>
        <td><strong>Facial Hair (Male)</strong></td>
        <td>Clean, Goatee, Bushy, Braided (Row 2)</td>
        <td>Matching beard sprite overlays</td>
        <td>3 + Clean</td>
        <td><strong>Sex-linked:</strong> Passed via genetics, expressed at age 16+</td>
      </tr>
      <tr>
        <td><strong>Aging: Child (3–15)</strong></td>
        <td>Child face base (Young boy / girl)</td>
        <td>Child walk sheet (28 px tunic)</td>
        <td>1 body base</td>
        <td><strong>Life Stage:</strong> Simple clothing, zero facial hair, innocent eyes</td>
      </tr>
      <tr>
        <td><strong>Aging: Adult (16–55)</strong></td>
        <td>Adult face base + equipped armor gorget</td>
        <td>Adult body (40–44 px) + equipped armor</td>
        <td>Full gear</td>
        <td><strong>Life Stage:</strong> Beard unlocks, one armor model equips across all bodies</td>
      </tr>
      <tr>
        <td><strong>Aging: Elder (55+)</strong></td>
        <td>Weathered face wrinkles + silver hair ramp</td>
        <td>Adult body with silver hair palette</td>
        <td>Silver ramp</td>
        <td><strong>Life Stage:</strong> Hair turns gray/white automatically via palette ramp</td>
      </tr>
    </tbody>
  </table>

  <h3 style="color: #63b3ed; margin-top: 20px; font-size: 15px;">Combinatorial Colonist Count Per Faction:</h3>
  <ul class="feature-list">
    <li><span class="highlight">576 Unique Adult Male Colonists</span> = 3 skin tones &times; 4 hair colors &times; 4 hairstyles &times; 4 beard states &times; 3 face bases.</li>
    <li><span class="highlight">144 Unique Adult Female Colonists</span> = 3 skin tones &times; 4 hair colors &times; 4 hairstyles &times; 3 face bases.</li>
    <li><span class="highlight">Over 700+ Unique Colonists</span> produced from only <strong>17 modular face images + 17 modular charset sheets</strong>!</li>
    <li><span class="highlight">One Armor Model Equips All:</span> When any adult colonist equips Iron Mail or Leather Jerkin, 1 single armor layer fits their unique genetic body and portrait perfectly.</li>
  </ul>
</div>

</body>
</html>
`;

fs.writeFileSync(path.join(ARTIFACT_DIR, 'human_genetics_showcase.html'), html);
console.log('Showcase artifact successfully created at:', path.join(ARTIFACT_DIR, 'human_genetics_showcase.html'));
