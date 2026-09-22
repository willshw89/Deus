const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const NW = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe';
const gameDir = path.resolve(__dirname, '..', 'game');
const profile = path.join(os.tmpdir(), 'debug_trace_' + Date.now());
const PORT = 9228;

async function check() {
  const child = spawn(NW, [
    gameDir,
    '--remote-debugging-port=' + PORT,
    'test'
  ], { cwd: gameDir, stdio: 'pipe' });

  child.stdout.on('data', d => console.log('[STDOUT]', d.toString().trim()));
  child.stderr.on('data', d => console.log('[STDERR]', d.toString().trim()));

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
        await call('Console.enable');

        ws.addEventListener('message', (ev) => {
          const raw = typeof ev.data === 'string' ? ev.data : ev.data.toString();
          const data = JSON.parse(raw);
          if (data.method === 'Runtime.consoleAPICalled') {
            console.log('[GAME_LOG ' + data.params.type + ']', data.params.args.map(a => a.value).join(' '));
          } else if (data.method === 'Runtime.exceptionThrown') {
            console.error('[GAME_EXC]', JSON.stringify(data.params.exceptionDetails));
          }
        });

        // Trace every 500ms for 8 seconds
        for (let s = 1; s <= 16; s++) {
          await new Promise(r => setTimeout(r, 500));
          const evalStr = `(() => {
            const s = SceneManager._scene;
            const unready = [];
            for (const url in ImageManager._cache) {
              const b = ImageManager._cache[url];
              if (!b.isReady() || b.isError()) {
                unready.push({ url, ready: b.isReady(), error: b.isError(), loading: b._isLoading });
              }
            }
            return JSON.stringify({
              time: (${s} * 0.5) + 's',
              scene: s ? s.constructor.name : null,
              next: SceneManager._nextScene ? SceneManager._nextScene.constructor.name : null,
              started: s ? s._started : null,
              ready: s ? s.isReady() : null,
              loadingCount: Graphics._loadingCount,
              unreadyBitmaps: unready
            });
          })()`;
          const res = await call('Runtime.evaluate', { expression: evalStr });
          console.log('TRACE:', res.result.value);
        }
        child.kill();
        ws.close();
        try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
        process.exit(0);
      }
    } catch(e) {}
  }
}
check();
