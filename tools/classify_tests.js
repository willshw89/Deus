//=============================================================================
// classify_tests.js
// Classifies all scripts in tools/ into authoritative operational categories:
// - HEADLESS_AUTOMATED: Headless node unit/proof suites (runnable in CI)
// - PLAYTEST_IN_GAME: Live RMMZ browser / canvas / WebGL visual tests
// - ART_PIPELINE: Nano Banana Pro, palette, sprite packing & originality checks
// - UTILITY_TOOL: CLI tools, generators, benchmarks, audit harnesses
// - LEGACY_OR_STALE: Deprecated or retired test scripts
//=============================================================================

"use strict";

const fs = require("fs");
const path = require("path");

const toolsDir = path.join(__dirname, "../tools");
const files = fs.readdirSync(toolsDir).filter(f => f.endsWith(".js"));

const categories = {
    HEADLESS_AUTOMATED: [],
    PLAYTEST_IN_GAME: [],
    ART_PIPELINE: [],
    UTILITY_TOOL: [],
    LEGACY_OR_STALE: []
};

for (const file of files) {
    const fullPath = path.join(toolsDir, file);
    const content = fs.readFileSync(fullPath, "utf8");

    // Classification heuristics
    if (file.startsWith("bench_") || file.startsWith("benchmark_") || file === "health_audit.js" || file === "classify_tests.js" || file === "generate_asset_inventory.js" || file === "add_test_plugin.js" || file === "register_world_plugins.js") {
        categories.UTILITY_TOOL.push({ file, reason: "Diagnostic, benchmark, or build utility" });
    } else if (file.includes("sprite") || file.includes("palette") || file.includes("originality") || file.includes("quantize") || file.includes("atlas") || file.includes("color_map") || file.includes("render_sheet") || file.includes("clean_sheet")) {
        categories.ART_PIPELINE.push({ file, reason: "Art pipeline / image processing tool" });
    } else if (content.includes("puppeteer") || content.includes("chrome-launcher") || content.includes("headless: false") || file.includes("live") || file.includes("playtest") || file.includes("screenshot") || content.includes("nw.Window")) {
        categories.PLAYTEST_IN_GAME.push({ file, reason: "Requires live RMMZ / browser environment" });
    } else if (content.includes("RETIRED") || content.includes("deprecated") || content.includes("v47_d20") || content.includes("legacy_test")) {
        categories.LEGACY_OR_STALE.push({ file, reason: "Marked as retired or legacy" });
    } else if (file.startsWith("test_")) {
        categories.HEADLESS_AUTOMATED.push({ file, reason: "Automated headless Node test script" });
    } else {
        categories.UTILITY_TOOL.push({ file, reason: "General utility script" });
    }
}

// Generate report
let md = "# Project DEUS — Test Classification & Execution Authority\n\n";
md += `Generated: ${new Date().toISOString().split("T")[0]}\n`;
md += `Total scripts audited: ${files.length}\n\n`;

md += `## Summary\n`;
md += `- **Headless Automated Proofs/Suites (CI/Regression)**: ${categories.HEADLESS_AUTOMATED.length}\n`;
md += `- **Playtest / In-Game Live Suites (Browser/Canvas)**: ${categories.PLAYTEST_IN_GAME.length}\n`;
md += `- **Art Production & Verification Pipeline**: ${categories.ART_PIPELINE.length}\n`;
md += `- **Diagnostic & Build Utilities**: ${categories.UTILITY_TOOL.length}\n`;
md += `- **Legacy / Stale Scripts**: ${categories.LEGACY_OR_STALE.length}\n\n`;

for (const [catName, list] of Object.entries(categories)) {
    md += `### ${catName} (${list.length})\n`;
    md += `| File | Purpose / Reason |\n`;
    md += `|---|---|\n`;
    for (const item of list.sort((a, b) => a.file.localeCompare(b.file))) {
        md += `| \`${item.file}\` | ${item.reason} |\n`;
    }
    md += `\n`;
}

const outPath = path.join(__dirname, "../docs/TEST_CLASSIFICATION.md");
fs.writeFileSync(outPath, md, "utf8");
console.log(`Test classification complete. Written to docs/TEST_CLASSIFICATION.md`);
console.log(`Headless: ${categories.HEADLESS_AUTOMATED.length}, Playtest: ${categories.PLAYTEST_IN_GAME.length}, Art: ${categories.ART_PIPELINE.length}, Utilities: ${categories.UTILITY_TOOL.length}`);
