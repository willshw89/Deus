'use strict';

const fs = require('fs');
const path = require('path');
const { readPNG } = require('./png_read');
const { writePNG } = require('./png_util');

const ROOT = path.resolve(__dirname, '..');
const v3Png = path.join(ROOT, 'art', 'raw', 'chest_wood_v3.png');
const img = readPNG(v3Png);

const auditDir = path.join(ROOT, 'art', 'staging', 'chest_audit');
if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });

const cw = Math.floor(img.width / 3);
const ch = Math.floor(img.height / 4);

console.log(`Image: ${img.width}x${img.height}, cell: ${cw}x${ch}`);

const frameReport = [];

for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 3; c++) {
        const frameId = `R${r}C${c}`;
        const rowIdx = r - 1;
        const colIdx = c - 1;
        const cellBuf = Buffer.alloc(cw * ch * 4);
        
        let nonMagenta = 0;
        let minX = cw, maxX = 0, minY = ch, maxY = 0;

        for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) {
                const sIdx = ((rowIdx * ch + y) * img.width + (colIdx * cw + x)) * 4;
                const dIdx = (y * cw + x) * 4;
                const red = img.data[sIdx], grn = img.data[sIdx + 1], blu = img.data[sIdx + 2], alp = img.data[sIdx + 3];
                cellBuf[dIdx] = red;
                cellBuf[dIdx + 1] = grn;
                cellBuf[dIdx + 2] = blu;
                cellBuf[dIdx + 3] = alp;

                const isMag = (red > 180 && blu > 180 && grn < 80);
                if (!isMag) {
                    nonMagenta++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        const outPath = path.join(auditDir, `${frameId}.png`);
        writePNG(outPath, cw, ch, cellBuf);

        frameReport.push({
            frameId,
            row: r,
            col: c,
            nonMagentaPixels: nonMagenta,
            bounds: { minX, maxX, width: maxX - minX + 1, minY, maxY, height: maxY - minY + 1 },
            filePath: outPath
        });
    }
}

fs.writeFileSync(path.join(auditDir, 'audit_report.json'), JSON.stringify(frameReport, null, 2));
console.log('Saved 12 individual frame assets to:', auditDir);

