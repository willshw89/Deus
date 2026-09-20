'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TEST_OUT = path.join(ROOT, 'game', 'test_output');
const REVIEW_OUT = path.join(ROOT, 'art', 'review', 'menus');

fs.mkdirSync(REVIEW_OUT, { recursive: true });

// We can add a temporary test to UF_FactionMenus or run a script that captures Scene_Title
const testScript = `
(() => {
    const _Scene_Title_start = Scene_Title.prototype.start;
    Scene_Title.prototype.start = function() {
        _Scene_Title_start.call(this);
        setTimeout(() => {
            const snap = Graphics.app.renderer.plugins.extract.canvas(Graphics.app.stage);
            const dataUrl = snap.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\\/png;base64,/, '');
            const fs = require('fs');
            fs.writeFileSync('test_output/title_menu_default.png', base64Data, 'base64');
            console.log('CAPTURED_TITLE_MENU');
            setTimeout(() => {
                if (typeof nw !== 'undefined' && nw.App) nw.App.quit();
            }, 500);
        }, 800);
    };
})();
`;

const fixturePath = path.join(ROOT, 'game', 'js', 'plugins', 'UF_TempTitleCapture.js');
fs.writeFileSync(fixturePath, testScript);

// Enable in plugins.js
const pluginsJsPath = path.join(ROOT, 'game', 'js', 'plugins.js');
const origPluginsJs = fs.readFileSync(pluginsJsPath, 'utf8');
const modifiedPluginsJs = origPluginsJs.replace(
    'var $plugins =',
    'var $plugins = [\n{"name":"UF_TempTitleCapture","status":true,"description":"","parameters":{}},'
);
fs.writeFileSync(pluginsJsPath, modifiedPluginsJs);

console.log('Running title menu capture in NW.js...');
try {
    childProcess.execSync('nw.exe game', { cwd: ROOT, timeout: 15000 });
} catch (e) {
    // NW process exit is expected
}

// Restore plugins.js and delete fixture
fs.writeFileSync(pluginsJsPath, origPluginsJs);
try { fs.unlinkSync(fixturePath); } catch (e) {}

const shotSrc = path.join(TEST_OUT, 'title_menu_default.png');
if (fs.existsSync(shotSrc)) {
    const shotDst = path.join(REVIEW_OUT, 'title_menu_default.png');
    fs.copyFileSync(shotSrc, shotDst);
    console.log(`Successfully preserved title menu capture: ${shotDst}`);
} else {
    console.log('Title screenshot not found in test_output.');
}
