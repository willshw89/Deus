const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const charsets = [
  '!$UF_Cactus.png',
  '!$UF_CactusTall.png',
  '!$UF_GrassTuft.png',
  '!$UF_Reeds.png',
  '!$UF_Wildflowers.png',
  '!$UF_Flowers_Purple.png',
  '!$UF_Flowers_Blue.png',
  '!$UF_Flowers_White.png',
  '!$UF_Wheat_Wild.png',
  '!$UF_Wild_Grain.png',
  '!$UF_Lichen.png',
  '!$UF_Lily_Pad.png',
  '!$UF_GraniteBoulder.png',
  '!$UF_IronstoneDeposit.png',
  '!$UF_CopperOutcrop.png',
  '!$UF_GoldOutcrop.png',
  '!$UF_CrystalCluster.png',
  '!$UF_SmallCrystals.png',
  '!$UF_LooseStones.png',
  '!$UF_Gravel.png',
  '!$UF_OldBones.png',
  '!$UF_FallenPillar.png'
];

const faces = [
  'UF_Faces_Plants.png',
  'UF_Faces_Minerals.png'
];

console.log(`=== Verifying ${charsets.length} charsets and ${faces.length} face sets ===`);

let artFailCount = 0;
let origFailCount = 0;

for (const c of charsets) {
  const p = path.join(ROOT, 'game', 'img', 'characters', c);
  try {
    const res = execSync(`"${process.execPath}" tools/art_check.js "${p}" --summary`, { encoding: 'utf8' }).trim();
    if (res.includes('RESULT FAIL')) {
      console.error(`[FAIL art_check] ${c}: ${res}`);
      artFailCount++;
    }
  } catch (e) {
    console.error(`[FAIL art_check] ${c}: ${e.stdout || e.message}`);
    artFailCount++;
  }

  try {
    const res = execSync(`"${process.execPath}" tools/originality_check.js "${p}"`, { encoding: 'utf8' }).trim();
    if (res.includes('RESULT FAIL')) {
      console.error(`[FAIL originality] ${c}: ${res}`);
      origFailCount++;
    }
  } catch (e) {
    console.error(`[FAIL originality] ${c}: ${e.stdout || e.message}`);
    origFailCount++;
  }
}

for (const f of faces) {
  const p = path.join(ROOT, 'game', 'img', 'faces', f);
  try {
    const res = execSync(`"${process.execPath}" tools/art_check.js "${p}" --summary`, { encoding: 'utf8' }).trim();
    if (res.includes('RESULT FAIL')) {
      console.error(`[FAIL art_check] ${f}: ${res}`);
      artFailCount++;
    }
  } catch (e) {
    console.error(`[FAIL art_check] ${f}: ${e.stdout || e.message}`);
    artFailCount++;
  }

  try {
    const res = execSync(`"${process.execPath}" tools/originality_check.js "${p}"`, { encoding: 'utf8' }).trim();
    if (res.includes('RESULT FAIL')) {
      console.error(`[FAIL originality] ${f}: ${res}`);
      origFailCount++;
    }
  } catch (e) {
    console.error(`[FAIL originality] ${f}: ${e.stdout || e.message}`);
    origFailCount++;
  }
}

console.log(`Summary: art_check FAILs = ${artFailCount}, originality FAILs = ${origFailCount}`);
if (artFailCount === 0 && origFailCount === 0) {
  console.log('ALL 24 ASSETS 100% PASSED AUTOMATED CHECKS!');
} else {
  process.exit(1);
}
