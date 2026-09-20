'use strict';

const childProcess = require('child_process');
const path = require('path');
const fs = require('fs');

function convertJpgToPng(jpgPath, pngPath) {
    const absJpg = path.resolve(jpgPath);
    const absPng = path.resolve(pngPath);
    const ps = `Add-Type -AssemblyName System.Drawing; [System.Drawing.Image]::FromFile('${absJpg.replace(/'/g, "''")}').Save('${absPng.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::Png);`;
    childProcess.execSync(`powershell -NoProfile -Command "${ps}"`);
    console.log(`Converted ${path.basename(jpgPath)} -> ${path.basename(pngPath)}`);
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length >= 2) {
        convertJpgToPng(args[0], args[1]);
    }
}

module.exports = { convertJpgToPng };

