const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const snapDir = path.join(require('os').tmpdir(), 'uf_snapshots', 'tilesets_showcase');

fs.mkdirSync(snapDir, { recursive: true });

// Copy game files to snapDir
const copyRecursive = (src, dst) => {
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name), d = path.join(dst, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'test_output') continue;
            copyRecursive(s, d);
        } else {
            fs.copyFileSync(s, d);
        }
    }
};

console.log('Copying project to snapshot dir for isolated showcase...');
copyRecursive(path.join(ROOT, 'game'), snapDir);

// Inject showcase script into snapDir/js/plugins/UF_ShowcaseTilesets.js
const showcasePlugin = `
(() => {
    "use strict";
    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        setTimeout(() => {
            try {
                this.setupTilesetShowcase();
            } catch (e) {
                console.error("Showcase setup error:", e);
            }
        }, 800);
    };

    Scene_Map.prototype.setupTilesetShowcase = function() {
        console.log("Setting up comprehensive Nano Banana Pro tileset showcase...");
        const map = $dataMap;
        const w = map.width, h = map.height;

        // Stamp water pond with organic shape at (8, 6) to (14, 12)
        // Layer 0: Water autotiles (base 2048)
        for (let y = 6; y <= 12; y++) {
            for (let x = 8; x <= 14; x++) {
                if ((x === 8 || x === 14) && (y === 6 || y === 12)) continue; // rounded corners
                // Use autotile shape calculator or raw autotile
                map.data[y * w + x] = 2048; 
            }
        }

        // Place a dirt path from (4, 14) to (20, 14)
        // Dirt autotile is kind 17 (2816 + 17*48 = 3632)
        for (let x = 4; x <= 20; x++) {
            map.data[14 * w + x] = 3632;
        }

        // Place cobblestone plaza at (16, 6) to (20, 10)
        // Cobblestone is kind 24 (2816 + 24*48 = 3968)
        for (let y = 6; y <= 10; y++) {
            for (let x = 16; x <= 20; x++) {
                map.data[y * w + x] = 3968;
            }
        }

        // Center player/camera at (12, 10)
        $gamePlayer.locate(12, 10);
        $gameMap.setDisplayPos(8, 5);

        // Refresh tilemap
        if (this._spriteset && this._spriteset._tilemap) {
            this._spriteset._tilemap.refresh();
        }

        setTimeout(() => {
            this.takeShowcaseShots();
        }, 1200);
    };

    Scene_Map.prototype.takeShowcaseShots = function() {
        const fs = require('fs');
        const path = require('path');
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        const outDir = path.join('${ROOT.replace(/\\/g, '/')}', 'art', 'review');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const url = canvas.toDataURL('image/png');
        const base64 = url.replace(/^data:image\\/png;base64,/, '');
        const outPath = path.join(outDir, 'nano_tilesets_live_showcase.png');
        fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log('Saved showcase screenshot to ' + outPath);

        // Create close-up crop
        const img = new Image();
        img.onload = () => {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = 480;
            cropCanvas.height = 360;
            const ctx = cropCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            // Crop around pond and path
            ctx.drawImage(canvas, 100, 80, 240, 180, 0, 0, 480, 360);
            const cropUrl = cropCanvas.toDataURL('image/png');
            const cropPath = path.join(outDir, 'nano_tilesets_live_crop_2x.png');
            fs.writeFileSync(cropPath, Buffer.from(cropUrl.replace(/^data:image\\/png;base64,/, ''), 'base64'));
            console.log('Saved 2x crop screenshot to ' + cropPath);
            setTimeout(() => { nw.App.quit(); }, 500);
        };
        img.src = url;
    };
})();
`;

fs.writeFileSync(path.join(snapDir, 'js', 'plugins', 'UF_ShowcaseTilesets.js'), showcasePlugin);

// Register plugin in plugins.js
const pluginsJsPath = path.join(snapDir, 'js', 'plugins.js');
let pjs = fs.readFileSync(pluginsJsPath, 'utf8');
pjs = pjs.replace(/\];\s*$/, ',{"name":"UF_ShowcaseTilesets","status":true,"description":"Showcase","parameters":{}}];');
fs.writeFileSync(pluginsJsPath, pjs);

console.log('Running isolated showcase in NW.js...');
const profileDir = path.join(require('os').tmpdir(), `uf_showcase_profile_${Date.now()}`);
const child = spawn(NW, [snapDir, `--user-data-dir=${profileDir}`, '--disable-background-timer-throttling'], { stdio: 'inherit' });
child.on('exit', (code) => {
    console.log('Showcase process exited with code:', code);
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (_) {}
});
