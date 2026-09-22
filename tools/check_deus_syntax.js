"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pluginsDir = path.join(__dirname, "..", "game", "js", "plugins");
const files = fs.readdirSync(pluginsDir).filter(f => f.startsWith("DEUS_") && f.endsWith(".js"));

let bad = 0;
for (const file of files) {
    const fullPath = path.join(pluginsDir, file);
    try {
        execSync(`node -c "${fullPath}"`);
    } catch (e) {
        console.error("SYNTAX ERROR in " + file + ":", e.message);
        bad++;
    }
}

console.log(`Checked ${files.length} DEUS plugin files. Errors: ${bad}`);
process.exit(bad > 0 ? 1 : 0);

