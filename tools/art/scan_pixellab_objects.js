const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.resolve('.pixellab_token');
const token = fs.readFileSync(tokenPath, 'utf8').trim();

async function callMcp(name, args) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.pixellab.ai/mcp', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const lines = d.split('\n');
        for (const l of lines) {
          if (l.startsWith('data: ')) {
            try { return resolve(JSON.parse(l.slice(6))); } catch (e) {}
          }
        }
        resolve(d);
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name, arguments: args || {} }, id: 1 }));
    req.end();
  });
}

async function run() {
  const seenTypes = new Map();
  // Fetch up to 1000 objects in batches of 100
  for (let offset = 0; offset <= 900; offset += 100) {
    console.log(`Querying offset ${offset}...`);
    // Note: list_objects takes offset and limit, but default is 10 if not specified. Let's see if limit is supported.
    const res = await callMcp('list_objects', { offset });
    if (res && res.result && res.result.content) {
      const text = res.result.content[0].text;
      const lines = text.split('\n');
      for (const line of lines) {
        const m = line.match(/^\s*([a-f0-9-]+)\s*\|\s*(.*?)\s*\|\s*(.*)$/);
        if (m) {
          const [_, id, desc, meta] = m;
          const key = desc.substring(0, 30);
          if (!seenTypes.has(key)) {
            seenTypes.set(key, { id, desc, meta, count: 1 });
          } else {
            seenTypes.get(key).count++;
          }
        }
      }
    }
  }
  console.log('\n--- DISTINCT OBJECT FAMILIES IN PIXELLAB ---');
  for (const [k, v] of seenTypes.entries()) {
    console.log(`- [${v.count} items] "${v.desc}" (sample ID: ${v.id}, meta: ${v.meta})`);
  }
}

run().catch(console.error);
