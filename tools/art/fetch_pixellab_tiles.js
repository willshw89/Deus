const fs = require('fs');
const https = require('https');
const path = require('path');
const cp = require('child_process');

const tokenPath = path.resolve('.pixellab_token');
const token = fs.readFileSync(tokenPath, 'utf8').trim();

const ids = [
  '34f6bc9b-17ce-49e8-852d-ad5cd1ca9c68',
  '92ce97ee-5e8b-4a32-a84f-4ac212c2bb64',
  '5b87448c-0852-4370-bb25-a9bc78af799c',
  'aa902541-ba31-4f77-8e4b-ad530685a9d8',
  'b8b3d0b3-50be-491a-b431-f55cb63a3eb1',
  'b36d5ea3-5576-49be-a4f9-53d31c52004f'
];

async function downloadOne(id, index) {
  const targetDir = path.resolve('art/staging/pixellab_tilesets', `set_${index}`);
  fs.mkdirSync(targetDir, { recursive: true });
  const zipPath = path.join(targetDir, 'tiles.zip');

  return new Promise((resolve, reject) => {
    const url = `https://api.pixellab.ai/mcp/tiles-pro/${id}/download`;
    https.get(url, { headers: { 'Authorization': `Bearer ${token}` } }, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${id}`));
      }
      const file = fs.createWriteStream(zipPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`Downloaded set ${index} (${id}): ${fs.statSync(zipPath).size} bytes`);
          try {
            cp.execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`);
            console.log(`Extracted set ${index}`);
          } catch (e) {
            console.error(`Extract error for set ${index}:`, e.message);
          }
          resolve();
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  for (let i = 0; i < ids.length; i++) {
    await downloadOne(ids[i], i);
  }
  console.log('ALL 6 SETS DOWNLOADED AND EXTRACTED SUCCESSFULLY.');
}

run().catch(console.error);
