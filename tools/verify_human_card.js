'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const gameDir = path.resolve(__dirname, '..', 'game');
const resultsFile = path.join(gameDir, 'test_output', 'results.txt');
fs.rmSync(resultsFile, { force: true });

// Add a one-shot verification suite to UF_Test in memory by invoking NW with --uf-test=human_generator
const child = spawn(NW, [
    gameDir,
    '--uf-test=human_generator'
], { stdio: 'inherit' });

child.on('exit', (code) => {
    console.log('Test process exited with code', code);
    if (fs.existsSync(resultsFile)) {
        console.log(fs.readFileSync(resultsFile, 'utf8'));
    }
});
