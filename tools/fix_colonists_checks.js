"use strict";
const fs = require("fs");
const path = require("path");

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, "utf8");
    const idx1 = content.indexOf("    function registerChecks() {");
    if (idx1 === -1) return;
    const idx2 = content.indexOf("    function registerChecks() {", idx1 + 1);
    if (idx2 === -1) return;

    // Remove from idx1 up to idx2
    const before = content.slice(0, idx1);
    const after = content.slice(idx2);
    fs.writeFileSync(filePath, before + after, "utf8");
    console.log("Fixed duplicate registerChecks in", path.basename(filePath));
}

fixFile(path.join(__dirname, "..", "game", "js", "plugins", "DEUS_Colonists.js"));
fixFile(path.join(__dirname, "..", "archive", "plugins_uf_pre_rename", "UF_Colonists.js"));

