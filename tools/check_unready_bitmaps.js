const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const NW = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe';
const gameDir = path.resolve(__dirname, '..', 'game');
const profile = path.join(os.tmpdir(), 'debug_img_' + Date.now());
const PORT = 9227;

async function check() {
  const child = spawn(NW, [
    gameDir,
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile,
    'test'
  ], { cwd: gameDir, stdio: 'pipe' });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json');
      const targets = await res.json();
      const t = targets.find(x => x.type === 'page');
      if (t && t.webSocketDebuggerUrl) {
        const ws = new WebSocket(t.webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);
        let id = 1;
        const call = (method, params) => new Promise((resolve) => {
          const reqId = id++;
          const handler = (ev) => {
            const raw = typeof ev.data === 'string' ? ev.data : ev.data.toString();
            const data = JSON.parse(raw);
            if (data.id === reqId) {
              ws.removeEventListener('message', handler);
              resolve(data.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id: reqId, method, params }));
        });

        await call('Runtime.enable');
        // Wait 4s
        await new Promise(r => setTimeout(r, 4000));
        const evalStr = `(() => {
          const s = SceneManager._scene;
          return JSON.stringify({
            scene: s ? s.constructor.name : null,
            started: s ? s._started : null,
            databaseLoaded: s ? s._databaseLoaded : null,
            dataManagerLoaded: DataManager.isDatabaseLoaded(),
            dataManagerErrors: DataManager._errors,
            databaseFilesNotLoaded: DataManager._databaseFiles.filter(f => !window[f.name]).map(f => f.name + ' (' + f.src + ')'),
            playerDataLoaded: s && s.isPlayerDataLoaded ? s.isPlayerDataLoaded() : null,
            fontReady: typeof FontManager !== 'undefined' ? FontManager.isReady() : null
          });
        })()`;
        const res = await call('Runtime.evaluate', { expression: evalStr });
        console.log('BITMAP_CHECK:', res.result.value);
        child.kill();
        ws.close();
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
        process.exit(0);
      }
    } catch(e) {}
  }
}
check();
