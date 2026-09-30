const fs = require('fs');
const path = require('path');
const https = require('https');

const tokenPath = path.resolve('.pixellab_token');
const token = fs.readFileSync(tokenPath, 'utf8').trim();

function callMcp(name, args) {
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

// Fetch all objects from PixelLab
async function fetchAllObjects() {
  const all = [];
  for (let offset = 0; offset <= 950; offset += 50) {
    const res = await callMcp('list_objects', { offset });
    if (res && res.result && res.result.content) {
      const lines = res.result.content[0].text.split('\n');
      for (const line of lines) {
        const m = line.match(/^\s*([a-f0-9-]+)\s*\|\s*(.*?)\s*\|\s*(.*)$/);
        if (m) {
          all.push({ id: m[1], desc: m[2], meta: m[3] });
        }
      }
    }
  }
  return all;
}

async function main() {
  console.log('Fetching full object library from PixelLab...');
  const all = await fetchAllObjects();
  console.log(`Retrieved ${all.length} object records.`);

  // Group by prompt prefix
  const groups = new Map();
  for (const obj of all) {
    // Clean desc
    const key = obj.desc.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().slice(0, 25);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(obj);
  }

  console.log(`\nIdentified ${groups.size} distinct prompt groups:`);
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [k, items] of sorted) {
    console.log(`- "${k}": ${items.length} items (e.g. ${items[0].id}, "${items[0].desc}")`);
  }

  // Save the full mapping to a JSON file for processing
  const outPath = path.resolve('art/staging/pixellab_object_groups.json');
  fs.writeFileSync(outPath, JSON.stringify(sorted.map(([k, items]) => ({
    key: k,
    count: items.length,
    description: items[0].desc,
    items
  })), null, 2), 'utf8');
  console.log(`\nSaved group catalog to ${outPath}`);
}

main().catch(console.error);
