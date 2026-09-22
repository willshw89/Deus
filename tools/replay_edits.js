"use strict";
const fs = require("fs");
const path = require("path");

const transcriptPath = "C:/Users/snewt/.gemini/antigravity/brain/28d55bd5-5c9e-48a3-84ae-0a03f62bd3d0/.system_generated/logs/transcript_full.jsonl";
const content = fs.readFileSync(transcriptPath, "utf8");
const lines = content.split("\n");

const sessionEdits = [];

for (let i = 11625; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch (e) { continue; }

    if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
            if (tc.name === "replace_file_content") {
                const args = tc.args;
                const file = args.TargetFile || args.targetFile;
                if (file && file.includes("game") && file.includes("plugins") && !file.includes("apply_deus_rename.js") && !file.includes("UF_ProfileTabs.js")) {
                    sessionEdits.push(args);
                }
            }
        }
    }
}

console.log(`Found ${sessionEdits.length} plugin edits in this session:`);
for (const edit of sessionEdits) {
    const file = edit.TargetFile || edit.targetFile;
    console.log(`- ${path.basename(file)}: ${edit.Instruction}`);
}

// Replay them in order
for (const edit of sessionEdits) {
    const filePath = edit.TargetFile || edit.targetFile;
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        continue;
    }
    let text = fs.readFileSync(filePath, "utf8");
    const target = edit.TargetContent;
    const replacement = edit.ReplacementContent;
    if (text.includes(target)) {
        text = text.replace(target, replacement);
        fs.writeFileSync(filePath, text, "utf8");
        console.log(`Applied edit to ${path.basename(filePath)}: ${edit.Instruction}`);
    } else {
        console.warn(`Target not found in ${path.basename(filePath)}: ${edit.Instruction}`);
    }
}
