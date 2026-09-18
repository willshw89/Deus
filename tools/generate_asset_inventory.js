const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const catalogFile = path.join(root, "game", "data", "UF_WorldCatalog.json");
const cat = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
const inventoryFile = path.join(root, "docs", "ASSET_INVENTORY.md");

const charDir = path.join(root, "game", "img", "characters");
const tileDir = path.join(root, "game", "img", "tilesets");
const sysDir = path.join(root, "game", "img", "system");

function fileExists(relPath) {
    if (fs.existsSync(path.join(charDir, relPath))) return true;
    if (fs.existsSync(path.join(charDir, relPath + ".png"))) return true;
    if (fs.existsSync(path.join(tileDir, relPath))) return true;
    if (fs.existsSync(path.join(tileDir, relPath + ".png"))) return true;
    if (fs.existsSync(path.join(sysDir, relPath))) return true;
    if (fs.existsSync(path.join(sysDir, relPath + ".png"))) return true;
    return false;
}

function hasSidecar(relPath) {
    const base = relPath.replace(/\.png$/i, "");
    if (fs.existsSync(path.join(charDir, base + ".json"))) return true;
    return false;
}

const entries = [];

// 1. Terrain & Water
entries.push({
    category: "Terrain & Water",
    id: "terrain_grass",
    name: cat.terrain.grass.name || "Meadow grass",
    image: cat.terrain.grass.image,
    requestId: cat.terrain.grass.requestId,
    status: cat.terrain.grass.status,
    notes: "Seamless U7 meadow grass A2 autotile (SHAPES 4, 23, 5, 3x integer)"
});

entries.push({
    category: "Terrain & Water",
    id: "terrain_water_fresh",
    name: "River fresh water",
    image: cat.terrain.water.image,
    requestId: cat.terrain.water.requestId,
    status: cat.terrain.water.status,
    notes: "A1 fresh water with shoreline banks, 3-frame flow animation"
});

for (const [k, w] of Object.entries(cat.water.surface)) {
    if (k === "fresh") continue;
    entries.push({
        category: "Terrain & Water",
        id: `water_${k}`,
        name: w.name,
        image: w.image,
        requestId: w.requestId,
        status: w.status,
        notes: `Surface water variant (${k})`
    });
}

// Ground Kinds (sample / representative)
for (const g of cat.groundKinds) {
    entries.push({
        category: "Ground Kinds (Biomes)",
        id: `ground_${g.id}`,
        name: g.name,
        image: g.image,
        requestId: g.requestId,
        status: g.status,
        notes: `Procedural ground pattern: ${g.pattern}`
    });
}

// 2. Colonists (Adam & Eve)
for (const ev of cat.start.events) {
    const name = ev.name.replace("{male}", "Adam").replace("{female}", "Eve");
    const img = ev.image.characterName;
    entries.push({
        category: "Colonists",
        id: `colonist_${name.toLowerCase()}`,
        name: `${name} (Naked Start)`,
        image: `${img}.png`,
        requestId: ev.requestId,
        status: ev.status,
        notes: "U7 native 3x unclad figure, 4 facings (E/W transposed), 3-frame walk"
    });
}

// 3. World Objects
for (const o of cat.objects) {
    entries.push({
        category: "World Objects & Flora",
        id: o.id,
        name: o.name,
        image: `${o.image}.png`,
        requestId: o.requestId,
        status: o.status,
        notes: `Density: ${o.density}, Clump: ${o.clump || 0}, collision-aligned anchor`
    });
}

// 4. Ground Resource Items (23 items)
for (const it of cat.items) {
    entries.push({
        category: "Ground Resource Items",
        id: it.id,
        name: it.name,
        image: `${it.image}.png`,
        requestId: it.requestId,
        status: it.status,
        notes: `Category: ${it.category}, 3x native pixel art, grounded bottom-anchor`
    });
}

// 5. Wildlife Fauna
for (const w of cat.wildlife.species) {
    entries.push({
        category: "Wildlife & Fauna",
        id: w.id,
        name: w.name,
        image: `${w.image}.png`,
        requestId: w.requestId,
        status: w.status,
        notes: `Herd: [${w.herd.join("-")}], 4 facings (E/W transposed)`
    });
}

// 6. Factions Civilized Species
for (const sp of cat.factions.species) {
    entries.push({
        category: "Faction Civilized Species",
        id: `faction_${sp.id}`,
        name: `${sp.name} Civilian/Warrior`,
        image: `${sp.image}.png`,
        requestId: sp.requestId,
        status: sp.status,
        notes: "4 facings (E/W transposed), 3-frame walk, U7 daylight palette"
    });
}

// 7. UI, Gumps & System
for (const [k, u] of Object.entries(cat.ui)) {
    entries.push({
        category: "UI & System",
        id: `ui_${k}`,
        name: u.name,
        image: u.image,
        requestId: u.requestId,
        status: u.status,
        notes: "U7 styling (carved oak, gold trim, high-visibility)"
    });
}

// 8. Retired Subterranean Assets
entries.push({
    category: "Retired Subterranean Assets (V20 Retired)",
    id: "cave_floor",
    name: "Cave floor autotile",
    image: "U7_Dungeon_A2.png",
    requestId: "AR-040",
    status: "retired (stand-in retained on disk)",
    notes: "Subterranean level retired by user 2026-09-18"
});
entries.push({
    category: "Retired Subterranean Assets (V20 Retired)",
    id: "cave_rock",
    name: "Cave solid rock autotile",
    image: "Dungeon_A4.png",
    requestId: "AR-041",
    status: "retired",
    notes: "Subterranean level retired by user 2026-09-18"
});
entries.push({
    category: "Retired Subterranean Assets (V20 Retired)",
    id: "cave_mouth",
    name: "Cave mouth entrance",
    image: "!$U7_CaveMouth.png",
    requestId: "AR-042",
    status: "retired (stand-in retained on disk)",
    notes: "Subterranean level retired by user 2026-09-18"
});
entries.push({
    category: "Retired Subterranean Assets (V20 Retired)",
    id: "cave_ladder",
    name: "Cave ascent ladder",
    image: "!$U7_CaveLadder.png",
    requestId: "AR-043",
    status: "retired (stand-in retained on disk)",
    notes: "Subterranean level retired by user 2026-09-18"
});

// Build Markdown
let md = `# ASSET INVENTORY: Ultima Fortress Art Manifest

**Generated:** 2026-09-18  
**Rules Reference:** \`AGENTS.md\`, \`docs/ART_STANDARD.md\`, \`docs/ASSET_REQUESTS.md\`  
**Catalog Authority:** \`game/data/UF_WorldCatalog.json\` (Version 3)  
**Palette:** Authentic Ultima VII 256-color daylight palette (\`PALETTES.FLX\` Record 0)  
**Projection:** 2.5D axonometric (45° up-left lean for height; flat top-down for ground; transposed East/West facings, never mirrored; 3× integer nearest-neighbor scale).

---

## Summary of Asset Coverage

| Category | Total Entries | U7 Stand-in | Original | Code-Drawn | Stock RMMZ | Retired |
|---|---|---|---|---|---|---|
`;

const categories = [...new Set(entries.map(e => e.category))];
let totalCount = 0;
let totalStandin = 0, totalOriginal = 0, totalCode = 0, totalStock = 0, totalRetired = 0;

for (const catName of categories) {
    const subset = entries.filter(e => e.category === catName);
    const count = subset.length;
    const standin = subset.filter(e => e.status === "U7 stand-in").length;
    const orig = subset.filter(e => e.status === "original").length;
    const code = subset.filter(e => e.status === "code-drawn placeholder").length;
    const stock = subset.filter(e => e.status === "stock RMMZ").length;
    const ret = subset.filter(e => e.status.includes("retired")).length;

    totalCount += count;
    totalStandin += standin;
    totalOriginal += orig;
    totalCode += code;
    totalStock += stock;
    totalRetired += ret;

    md += `| ${catName} | ${count} | ${standin} | ${orig} | ${code} | ${stock} | ${ret} |\n`;
}

md += `| **TOTAL** | **${totalCount}** | **${totalStandin}** | **${totalOriginal}** | **${totalCode}** | **${totalStock}** | **${totalRetired}** |\n\n`;

md += `> [!NOTE]
> Every asset in the catalog names its exact image file, its request ID, and its status.
> All visual entities in-game reflect this metadata when hovered by the mouse cursor.
> Subterranean level was retired 2026-09-18 per user directive.

---

`;

for (const catName of categories) {
    md += `## ${catName}\n\n`;
    md += `| Catalog ID | Name | File Path | Request ID | Status | On Disk | Sidecar | Notes |\n`;
    md += `|---|---|---|---|---|---|---|---|\n`;

    const subset = entries.filter(e => e.category === catName);
    for (const item of subset) {
        const onDisk = fileExists(item.image) ? "✓ YES" : "✗ MISSING";
        const sidecar = hasSidecar(item.image) ? "✓ YES" : "—";
        md += `| \`${item.id}\` | ${item.name} | \`${item.image}\` | \`${item.requestId}\` | **${item.status}** | ${onDisk} | ${sidecar} | ${item.notes} |\n`;
    }
    md += `\n`;
}

fs.writeFileSync(inventoryFile, md, "utf8");
console.log(`Generated ${inventoryFile} with ${entries.length} assets!`);

