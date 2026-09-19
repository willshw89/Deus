// tools/generate_asset_inventory.js
// Lists every image or tile the engine uses, what uses it, the interaction states the art needs, its status
// and its request row, so Gemini can see what still needs art without reading code.
//
// Reads:  game/data/UF_WorldCatalog.json  (objects image/tile/gen, items, wildlife, people, start pair + tiers,
//                                          tilesets, ground kinds, water kinds, biomes, recipes)
//         game/js/plugins/UF_*.js         (characterName: "...", ImageManager.load*("..."), drawFace("..."),
//                                          "img/<folder>/<name>", UF_Gen* names, string literals naming a file)
//         game/img/**                     (which files exist; .json sidecars next to character sheets)
//         docs/STATUS.md                  (the "Stand-ins" section: files that are U7-derived whatever their name)
//         docs/ASSET_REQUESTS.md          (the "| AR-nnn |" rows)
//         git                             (baseline commit 8e5fdc1 = stock RMMZ; what changed since)
// Writes: docs/ASSET_INVENTORY.md (tables by category, sorted missing > stock > stand-in > generated > original,
//         a "Needs a request" section) and game/data/UF_AssetIndex.json ({ "<key>": { status, request, usedBy,
//         states, ... } }) for UF_Look's UF.Assets.describe.
// Run:    "C:\Program Files\nodejs\node.exe" tools\generate_asset_inventory.js   (from the project root or anywhere)
// Every check prints PASS/FAIL with what it measured; the exit code is 1 when any check fails.
// Contract: docs/design/WORLD_ARCHITECTURE.md §1.11 and §5.12. Owner: Claude Code (Gemini runs it, never edits it).
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const GAME = path.join(ROOT, "game");
const IMG = path.join(GAME, "img");
const CATALOG_FILE = path.join(GAME, "data", "UF_WorldCatalog.json");
const PLUGIN_DIR = path.join(GAME, "js", "plugins");
const STATUS_FILE = path.join(ROOT, "docs", "STATUS.md");
const REQUESTS_FILE = path.join(ROOT, "docs", "ASSET_REQUESTS.md");
const OUT_MD = path.join(ROOT, "docs", "ASSET_INVENTORY.md");
const OUT_JSON = path.join(GAME, "data", "UF_AssetIndex.json");

// The project's first commit holds the stock RPG Maker MZ assets. A file that is in that tree and has not
// changed since is "stock RMMZ" (WORLD_ARCHITECTURE §5.12).
const BASELINE = "8e5fdc1";
// Tilemap constants (rmmz_core.js): A2 ground autotiles start at 2816 (A1 water at 2048, which the catalog
// lists per kind), 48 tile ids per autotile kind.
const TILE_ID_A2 = 2816, AUTOTILE_SPAN = 48;
const STATUS_ORDER = ["missing", "stock RMMZ", "U7 stand-in", "generated", "original"];
const CATEGORIES = [
    ["tiles", "Ground and water tiles"],
    ["objects", "Objects (plants, stones, ore, buildings)"],
    ["items", "Items"],
    ["creatures", "Creatures"],
    ["people", "People"],
    ["ui", "UI and system"],
    ["generated", "Generated placeholders (drawn in code)"]
];
// Stock names, used only when git is unavailable (the git answer is the authority).
const STOCK_NAME_RE = /^(Outside_|Inside_|Dungeon_|World_|SF_|Actor\d|People\d|Monster$|Nature$|Evil$|Vehicle$|Damage\d|!Chest|!Crystal|!Door\d|!Flame|!Other\d|!Switch\d|!Weapon|\$BigMonster\d|Window$|IconSet$|Balloon$|ButtonSet$|GameOver$|Shadow\d|States$|Splash$|Weapons\d)/;
const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const DATE = today();

//---------------------------------------------------------------------------------------------------------------
// Checks: the tool's own suite. Each one can fail and says what it measured.

const checks = [];
function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} inventory.${name}: ${detail}`);
    return !!ok;
}
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

//---------------------------------------------------------------------------------------------------------------
// Inputs

let cat = null;
try {
    cat = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8"));
} catch (e) {
    check("catalog_loaded", false, `${CATALOG_FILE}: ${e.message}`);
    finish();
}
const catalogOk = cat && Array.isArray(cat.objects) && cat.items && Array.isArray(cat.items.types) && cat.wildlife && Array.isArray(cat.wildlife.species) && cat.people && Array.isArray(cat.groundKinds) && cat.water && cat.water.surface && cat.tilesets && cat.tilesets.surface;
check("catalog_loaded", catalogOk, catalogOk
    ? `version ${cat.version}: ${cat.objects.length} objects, ${cat.items.types.length} item types, ${cat.wildlife.species.length} species, ${Object.keys(cat.people).filter(k => k !== "about").length} people species, ${cat.groundKinds.length} ground kinds, ${Object.keys(cat.water.surface).length} water kinds`
    : "catalog lacks one of objects / items.types / wildlife.species / people / groundKinds / water.surface / tilesets.surface");
if (!catalogOk) finish();

// Files under game/img, as "folder/name.ext" with forward slashes (folder may be nested: system/u7_gumps).
function walk(dir, rel, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const r = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(path.join(dir, entry.name), r, out);
        else out.push(r);
    }
    return out;
}
const imgFiles = walk(IMG, "", []);
const fileSet = new Set(imgFiles);
const pngExists = (folder, name) => fileSet.has(`${folder}/${name}.png`);
const sidecarExists = name => fileSet.has(`characters/${name}.json`);
const namesInFolder = folder => imgFiles.filter(f => f.startsWith(`${folder}/`) && f.endsWith(".png") && !f.slice(folder.length + 1).includes("/")).map(f => f.slice(folder.length + 1, -4));

// git: which img files are stock (in the baseline tree and untouched since).
const gitInfo = { ok: false, baseline: new Set(), changed: new Set(), why: "" };
(function readGit() {
    const candidates = ["git", "C:\\Program Files\\Git\\bin\\git.exe", "C:\\Program Files\\Git\\cmd\\git.exe"];
    let lastError = null;
    const run = args => {
        for (const g of candidates) {
            try {
                return execFileSync(g, ["-c", "core.quotePath=false", ...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
            } catch (e) { lastError = e; }
        }
        throw lastError || new Error("git not found");
    };
    const lines = s => s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    try {
        for (const f of lines(run(["ls-tree", "-r", BASELINE, "--name-only", "--", "game/img"]))) gitInfo.baseline.add(f);
        for (const f of lines(run(["log", "--format=", "--name-only", `${BASELINE}..HEAD`, "--", "game/img"]))) gitInfo.changed.add(f);
        for (const f of lines(run(["diff", "--name-only", "HEAD", "--", "game/img"]))) gitInfo.changed.add(f);
        gitInfo.ok = true;
    } catch (e) {
        gitInfo.why = (e.stderr && String(e.stderr).trim()) || e.message;
    }
})();
check("git_baseline", gitInfo.ok, gitInfo.ok
    ? `${gitInfo.baseline.size} files under game/img in ${BASELINE}; ${gitInfo.changed.size} of them changed since (commits or working tree)`
    : `git unavailable (${gitInfo.why}); stock status falls back to name rules`);

// docs/STATUS.md → Stand-ins: every backticked file name (or glob) under that heading counts as a U7 stand-in.
const standins = { names: new Set(), globs: [], lines: 0 };
(function readStandins() {
    let text = "";
    try { text = fs.readFileSync(STATUS_FILE, "utf8"); } catch (e) { return; }
    const lines = text.split(/\r?\n/);
    let i = lines.findIndex(l => /^##\s+Stand-ins/i.test(l));
    if (i < 0) return;
    for (i++; i < lines.length && !/^##\s/.test(lines[i]); i++) {
        if (!/^\s*-\s/.test(lines[i])) continue;
        standins.lines++;
        for (const m of lines[i].matchAll(/`([^`]+)`/g)) {
            let tok = m[1].trim().replace(/^game\/img\//, "").replace(/\.(png|json)$/i, "");
            if (!tok || /\s/.test(tok)) continue;
            if (tok.endsWith("/")) tok += "*";
            if (tok.includes("*")) standins.globs.push(new RegExp("^" + tok.split("*").map(escapeRe).join(".*") + "$", "i"));
            else standins.names.add(tok.toLowerCase());
        }
    }
})();
const standinListed = (folder, name) => {
    const a = name.toLowerCase(), b = `${folder}/${name}`.toLowerCase();
    if (standins.names.has(a) || standins.names.has(b)) return true;
    return standins.globs.some(re => re.test(name) || re.test(`${folder}/${name}`));
};
check("standins_parsed", standins.lines > 0, `${plural(standins.lines, "line")} under STATUS.md → Stand-ins: ${standins.names.size} names, ${standins.globs.length} globs`);

// docs/ASSET_REQUESTS.md rows: "| AR-nnn | Asset | Needed for | Priority | Status |" (withdrawn rows are ~~struck~~).
const requestRows = [];
(function readRequests() {
    let text = "";
    try { text = fs.readFileSync(REQUESTS_FILE, "utf8"); } catch (e) { return; }
    text.split(/\r?\n/).forEach((line, idx) => {
        const m = /^\|\s*(~~)?\s*(AR-\d+)\s*(~~)?\s*\|(.*)$/.exec(line);
        if (!m) return;
        const cells = line.split("|").map(c => c.trim()).filter(Boolean);
        const statusCell = cells[cells.length - 1] || "";
        const statusWord = (/^[A-Z][A-Z ]*[A-Z]/.exec(statusCell.replace(/~~/g, "")) || [""])[0].trim();
        const withdrawn = !!(m[1] || m[3]) || /WITHDRAWN/.test(statusCell);
        const fileNames = new Set(), globs = [];
        for (const t of line.matchAll(/`([^`]+)`/g)) {
            let tok = t[1].trim().replace(/^game\/img\/(characters|tilesets|system|faces|pictures)\//, "").replace(/\.png$/i, "");
            if (!tok || /\s/.test(tok)) continue;
            const range = /^(.*?)(\d+)\.\.(?:[A-Za-z_]*?)(\d+)$/.exec(tok); // "$U7_Adam_T1..T3"
            if (range) {
                for (let n = Number(range[2]); n <= Number(range[3]); n++) fileNames.add(`${range[1]}${n}`.toLowerCase());
            } else if (tok.includes("*")) {
                globs.push(new RegExp("^" + tok.split("*").map(escapeRe).join(".*") + "$", "i"));
            } else fileNames.add(tok.toLowerCase());
        }
        requestRows.push({ id: m[2], line: idx + 1, withdrawn, status: statusWord || (withdrawn ? "WITHDRAWN" : "?"), text: line, lower: line.toLowerCase(), fileNames, globs });
    });
})();
check("requests_parsed", requestRows.length > 0, `${plural(requestRows.length, "request row")} in docs/ASSET_REQUESTS.md (${requestRows.filter(r => r.withdrawn).length} withdrawn)`);

//---------------------------------------------------------------------------------------------------------------
// The asset list. One record per image file, tile (sheet#id) or code-drawn bitmap.

const assets = new Map();
function record(key, init) {
    let a = assets.get(key);
    if (!a) {
        a = Object.assign({ key, usedBy: [], states: [], ids: new Set(), names: new Set(), tileId: null, requests: [] }, init);
        assets.set(key, a);
    }
    return a;
}
const use = (a, who) => { if (!a.usedBy.includes(who)) a.usedBy.push(who); };
const state = (a, text, by) => { by = by || null; if (!a.states.some(s => s.text === text && s.by === by)) a.states.push({ by, text }); };

// A character sheet in img/characters (objects, items, creatures, people all use this folder).
function charAsset(name, category) {
    return record(name, { category, kind: "char", folder: "characters", name, file: `img/characters/${name}.png`, exists: pngExists("characters", name), sidecar: sidecarExists(name) });
}
// One 48×48 tile of a B/C tileset sheet (id 0-255 = B, 256-511 = C).
function tileAsset(sheet, id, category) {
    const a = record(`${sheet}#${id}`, { category, kind: "tile", folder: "tilesets", name: sheet, tileId: id, file: `img/tilesets/${sheet}.png (tile ${id})`, exists: pngExists("tilesets", sheet), sidecar: false });
    use(sheetAsset(sheet), `tile ${id} (${category})`);
    return a;
}
// A whole tileset sheet.
function sheetAsset(sheet) {
    if (/^UF_Gen/.test(sheet)) return genAsset(sheet);
    return record(sheet, { category: "tiles", kind: "sheet", folder: "tilesets", name: sheet, file: `img/tilesets/${sheet}.png`, exists: pngExists("tilesets", sheet), sidecar: false });
}
// A bitmap drawn in code (UF_Gen*), never a file.
function genAsset(name, category) {
    return record(name, { category: category || "generated", kind: "gen", folder: null, name, file: "(drawn in code)", exists: true, sidecar: false });
}
// Images outside img/characters and img/tilesets are keyed by their path (UF_Look looks up "img/system/<name>.png").
function systemAsset(name, category) {
    return folderAsset("system", name, category);
}
function folderAsset(folder, name, category) {
    if (folder === "characters") return charAsset(name, category);
    if (folder === "tilesets") return sheetAsset(name);
    return record(`img/${folder}/${name}.png`, { category: category || "ui", kind: folder, folder, name, file: `img/${folder}/${name}.png`, exists: pngExists(folder, name), sidecar: false });
}

const objById = Object.fromEntries(cat.objects.map(o => [o.id, o]));
const itemById = Object.fromEntries(cat.items.types.map(i => [i.id, i]));
const objName = id => (objById[id] ? objById[id].name : id);
const itemName = id => (itemById[id] ? itemById[id].name : id);
const yieldsText = y => Object.entries(y || {}).map(([id, n]) => `${n} ${itemName(id)}`).join(", ") || "nothing";
const listText = (arr, max = 6) => arr.length <= max ? arr.join(", ") : `${arr.slice(0, max).join(", ")} … (+${arr.length - max})`;
const biomes = Object.entries(cat.biomes || {}).filter(([k, v]) => k !== "about" && v && typeof v === "object");
const recipes = (cat.recipes && cat.recipes.list) || [];

// --- Objects -------------------------------------------------------------------------------------------------
const becomesFrom = {}, regrowFrom = {}, ruinFrom = {};
for (const o of cat.objects) {
    for (const [act, a] of Object.entries(o.actions || {})) if (a && a.becomes) (becomesFrom[a.becomes] = becomesFrom[a.becomes] || []).push(`${o.name} (${act})`);
    if (o.regrow && o.regrow.to) (regrowFrom[o.regrow.to] = regrowFrom[o.regrow.to] || []).push(o.name);
    if (o.ruin) (ruinFrom[o.ruin] = ruinFrom[o.ruin] || []).push(o.name);
}
const objectsWithoutArt = [];
for (const o of cat.objects) {
    let a;
    if (o.image) a = charAsset(o.image, "objects");
    else if (o.tile && o.tile.sheet) a = tileAsset(o.tile.sheet, o.tile.id, "objects");
    else if (o.gen) a = genAsset(`UF_Gen${cap(o.gen)}`);
    else { objectsWithoutArt.push(o.id); continue; }
    a.ids.add(o.id); a.names.add(o.name);
    use(a, `object ${o.id} "${o.name}"${o.tint ? ` (tint ${o.tint})` : ""}`);
    const tags = o.tags || [];
    for (const [act, ac] of Object.entries(o.actions || {})) {
        if (!ac) continue;
        state(a, `${act}: ${o.name} → ${ac.becomes ? objName(ac.becomes) : "gone"} (yields ${yieldsText(ac.yields)})`, o.id);
    }
    if (o.regrow && o.regrow.to) state(a, `regrows into ${objName(o.regrow.to)} after ${o.regrow.hours} h`, o.id);
    if (o.build) {
        const need = Object.entries(o.build.items || {}).map(([id, n]) => `${n} ${itemName(id)}`).join(", ");
        state(a, `building: unbuilt (${need ? `needs ${need} on the cell` : "no materials"}) / built`, o.id);
    }
    if (o.ruin) state(a, `ruined → ${objName(o.ruin)} (when its site is sacked)`, o.id);
    if (tags.includes("fire")) state(a, "unlit / lit (a fire: cooking happens next to it)", o.id);
    if (becomesFrom[o.id]) state(a, `is the after-state of ${listText(becomesFrom[o.id])}`, o.id);
    if (regrowFrom[o.id]) state(a, `is the regrown state of ${listText(regrowFrom[o.id])}`, o.id);
    if (ruinFrom[o.id]) state(a, `is the ruin of ${listText(ruinFrom[o.id])}`, o.id);
    if (!o.actions && !o.build && !o.regrow && !becomesFrom[o.id] && !regrowFrom[o.id] && !ruinFrom[o.id]) state(a, "one state (nothing interacts with it yet)", o.id);
    if (o.onWater) state(a, "sits on water cells", o.id);
    // Format facts are shared by every kind on the image, so they carry no id (one line, not one per kind).
    state(a, o.under ? "flat: drawn under units and items" : (o.passable ? "walk-through" : "blocks movement (units work from a neighbouring cell)"));
}

// --- Items ---------------------------------------------------------------------------------------------------
const tierItems = {};
for (const it of cat.items.types) {
    if (!it.image) continue;
    const a = charAsset(it.image, "items");
    a.ids.add(it.id); a.names.add(it.name);
    use(a, `item ${it.id} "${it.name}"${it.tint ? ` (tint ${it.tint})` : ""}`);
    state(a, "lies on a cell as a stack (one frame; carried items are not drawn yet)");
    if (it.food) state(a, `eaten: −${it.food.hunger || 0} hunger${it.food.thirst ? `, −${it.food.thirst} thirst` : ""}`, it.id);
    if (it.tool) state(a, `held tool (${Object.entries(it.tool).map(([j, m]) => `${j} ×${m}`).join(", ")}): shown in the hand on the held layer (AR-600)`, it.id);
    if (it.wear) { state(a, `worn: clothing tier ${it.wear.tier} (the wearer's sheet changes)`, it.id); tierItems[it.wear.tier] = it.name; }
    const madeBy = recipes.filter(r => r.outputs && r.outputs[it.id]).map(r => r.name);
    const usedIn = recipes.filter(r => r.inputs && r.inputs[it.id]).map(r => r.name);
    if (madeBy.length) state(a, `made by: ${listText(madeBy)}`, it.id);
    if (usedIn.length) state(a, `used in: ${listText(usedIn)}`, it.id);
}

// --- Creatures -----------------------------------------------------------------------------------------------
for (const s of cat.wildlife.species) {
    if (!s.image) continue;
    const a = charAsset(s.image, "creatures");
    a.ids.add(s.id); a.names.add(s.name);
    use(a, `creature ${s.id} "${s.name}" (${s.kind}${s.tint ? `, tint ${s.tint}` : ""})`);
    state(a, "4 facings × stand/walk (3 columns × 4 rows)");
    if (s.hunt) state(a, `alive / dead: hunted (work ${s.hunt.work}${s.hunt.flees ? ", flees the hunter" : ""}) → drops ${yieldsText(s.yields)}`, s.id);
    if (s.kind === "flier") state(a, "flies over objects", s.id);
    if (s.kind === "monster") state(a, "hostile to everyone (red stance square)", s.id);
    if (s.minSavagery) state(a, `only in ${s.minSavagery}+ regions`, s.id);
    if (s.alignment) state(a, `only in ${s.alignment} regions`, s.id);
}

// --- People --------------------------------------------------------------------------------------------------
for (const [species, p] of Object.entries(cat.people)) {
    if (species === "about" || !p || !Array.isArray(p.images)) continue;
    for (const img of p.images) {
        const a = charAsset(img, "people");
        a.ids.add(species);
        use(a, `people ${species}${p.tint ? ` (tint ${p.tint})` : ""}`);
        state(a, "4 facings × stand/walk (3 columns × 4 rows)");
        state(a, "faction member at a site (wanders); the player's faction's people become colonists and work: chop / gather / build / carry / hunt (AR-600 work, carry, attack columns)");
    }
}
const pair = (cat.start && cat.start.pair) || [];
for (const p of pair) {
    if (!p.image) continue;
    const base = charAsset(p.image, "people");
    base.ids.add(`pair_${p.gender}`);
    use(base, `start.pair ${p.gender}: tier 0 (UF_Colonists human ${p.gender} tiers[0]; generator start events until UF_Colonists)`);
    state(base, "4 facings × stand/walk (3 columns × 4 rows)");
    state(base, "clothing tier 0: unclad");
    (p.tiers || []).forEach((tier, i) => {
        if (i === 0 || !tier) return;
        const a = charAsset(tier, "people");
        a.ids.add(`pair_${p.gender}_tier${i}`);
        use(a, `start.pair ${p.gender}: clothing tier ${i} (UF_Colonists.setTier)`);
        state(a, "4 facings × stand/walk (3 columns × 4 rows)");
        state(a, `worn on the pair: clothing tier ${i}${tierItems[i] ? ` = ${tierItems[i]} equipped` : " (no item reaches this tier yet)"}`);
    });
}

// --- Ground kinds (A2, drawn in code) and water kinds (A1) -----------------------------------------------------
const surface = cat.tilesets.surface;
const a2 = sheetAsset(surface.A2 || "UF_GenGround_A2");
use(a2, `tileset 91 slot A2: all ${cat.groundKinds.length} ground kinds (UF_Tiles draws them from groundKinds[].colors/pattern)`);
state(a2, `${cat.groundKinds.length} kinds × 47 autotile shapes on one 768×576 sheet`);
const cursedSwap = (cat.regions && cat.regions.cursedGround) || {}, blessedSwap = (cat.regions && cat.regions.blessedGround) || {};
cat.groundKinds.forEach((g, i) => {
    const a = record(`${surface.A2}#${TILE_ID_A2 + i * AUTOTILE_SPAN}`, { category: "tiles", kind: "gen", folder: null, name: surface.A2, tileId: TILE_ID_A2 + i * AUTOTILE_SPAN, file: `(drawn in code: ${surface.A2}, kind ${i})`, exists: true, sidecar: false });
    a.ids.add(g.id); a.names.add(g.name);
    use(a, `ground kind ${g.id} "${g.name}"`);
    const inBiomes = biomes.filter(([, b]) => b.ground === g.id).map(([id]) => id);
    if (inBiomes.length) use(a, `biomes: ${listText(inBiomes, 8)}`);
    const cursedOf = Object.entries(cursedSwap).filter(([, v]) => v === g.id).map(([k]) => k);
    const blessedOf = Object.entries(blessedSwap).filter(([, v]) => v === g.id).map(([k]) => k);
    if (cursedOf.length) use(a, `cursed regions: replaces ${cursedOf.join(", ")}`);
    if (blessedOf.length) use(a, `blessed regions: replaces ${blessedOf.join(", ")}`);
    if (g.id === "dirt") use(a, "dig job result (UF_Interact)");
    state(a, "autotile: 47 edge shapes against every neighbouring kind (biome borders show)");
    if (g.passable === false) state(a, "impassable (rock faces on peaks, region 250)");
    state(a, `placeholder pattern "${g.pattern}", colors ${(g.colors || []).join(" ")}`);
});
const a1 = sheetAsset(surface.A1);
use(a1, `tileset 91 slot A1: the ${Object.keys(cat.water.surface).length} water kinds`);
for (const [kind, tileId] of Object.entries(cat.water.surface)) {
    const a = record(`${surface.A1}#${tileId}`, { category: "tiles", kind: "tile", folder: "tilesets", name: surface.A1, tileId, file: `img/tilesets/${surface.A1}.png (A1 autotile ${tileId})`, exists: pngExists("tilesets", surface.A1), sidecar: false });
    a.ids.add(kind); a.names.add(`${cap(kind)} water`);
    use(a, `water kind ${kind}`);
    const inBiomes = biomes.filter(([, b]) => b.water === kind).map(([id]) => id);
    if (inBiomes.length) use(a, `biomes: ${listText(inBiomes, 8)}`);
    if (kind === "fresh") use(a, "rivers and the start pond");
    if (kind === "icy") use(a, "rivers where it is cold");
    if (["pond", "brackish", "salt"].includes(kind)) use(a, "lakes by salinity");
    if (kind === "blighted") use(a, "water in cursed regions");
    state(a, "animated autotile: 3 frames × 47 shapes (banks against land; joins other water kinds)");
}
for (const slot of ["A5", "B", "C"]) if (surface[slot]) use(sheetAsset(surface[slot]), `tileset 91 slot ${slot}`);

// --- Plugins: sheets and bitmaps named in code ------------------------------------------------------------------
const pluginFiles = fs.existsSync(PLUGIN_DIR) ? fs.readdirSync(PLUGIN_DIR).filter(f => /^UF_.*\.js$/.test(f)).sort() : [];
const known = { characters: new Set(namesInFolder("characters")), system: new Set(namesInFolder("system")), faces: new Set(namesInFolder("faces")), tilesets: new Set(namesInFolder("tilesets")), pictures: new Set(namesInFolder("pictures")) };
let pluginRefs = 0;
const refFromPlugin = (folder, name, plugin, inSuite) => {
    if (!name || /[\s*%]/.test(name) || name.startsWith("UF_Gen")) return;
    const who = `plugin ${plugin}${inSuite ? " (test suite)" : ""}`;
    let a;
    if (folder === "characters") {
        const existing = assets.get(name);
        a = existing || charAsset(name, name.startsWith("!$") ? "objects" : "people");
        if (!existing) state(a, name.startsWith("!") ? "one frame" : "4 facings × stand/walk (3 columns × 4 rows)");
    } else a = folderAsset(folder, name, folder === "tilesets" ? "tiles" : "ui");
    use(a, who);
    pluginRefs++;
};
for (const f of pluginFiles) {
    const text = fs.readFileSync(path.join(PLUGIN_DIR, f), "utf8");
    const suiteAt = text.indexOf("UF.Test.suite(");
    const inSuite = idx => suiteAt >= 0 && idx >= suiteAt;
    const seen = new Set();
    const hit = (folder, name, idx) => { const k = `${folder}/${name}/${inSuite(idx) ? "s" : "m"}`; if (seen.has(k)) return; seen.add(k); refFromPlugin(folder, name, f, inSuite(idx)); };
    for (const m of text.matchAll(/characterName:\s*"([^"]+)"/g)) hit("characters", m[1], m.index);
    for (const m of text.matchAll(/ImageManager\.load(System|Character|Tileset|Picture|Face)\(\s*"([^"]+)"/g)) hit({ System: "system", Character: "characters", Tileset: "tilesets", Picture: "pictures", Face: "faces" }[m[1]], m[2], m.index);
    for (const m of text.matchAll(/ImageManager\.loadBitmap\(\s*"img\/([a-z0-9_]+)\/"\s*,\s*"([^"]+)"/g)) hit(m[1], m[2], m.index);
    for (const m of text.matchAll(/drawFace\(\s*"([^"]+)"/g)) hit("faces", m[1], m.index);
    for (const m of text.matchAll(/"img\/(characters|system|faces|tilesets|pictures)\/([^"]+?)(?:\.png)?"/g)) hit(m[1], m[2], m.index);
    // UF_Gen* bitmap names, in code or comments. A name ending in "_" is a family prefix built at runtime
    // ("UF_GenDesignation_" + type, or "UF_GenStance_<stance>" in a comment). When the plugin's own code names
    // concrete members (UF_Stance's BITMAP_NAMES) those are the assets; when only its tests do (UF_Interact),
    // the family is listed once as "<prefix>*" with the variants the tests name.
    const genHits = [...text.matchAll(/\bUF_Gen[A-Za-z0-9_]+/g)].map(m => ({ name: m[0], index: m.index }));
    const families = new Set(genHits.filter(h => h.name.endsWith("_")).map(h => h.name));
    const concrete = genHits.filter(h => !h.name.endsWith("_"));
    const skip = new Set();
    for (const prefix of families) {
        const members = concrete.filter(h => h.name.startsWith(prefix));
        if (members.some(h => !inSuite(h.index))) continue; // the code names the members itself
        const a = genAsset(`${prefix}*`);
        use(a, `plugin ${f}`);
        const variants = [...new Set(members.map(h => h.name.slice(prefix.length)))];
        if (variants.length) use(a, `variants named in its tests: ${variants.join(", ")}`);
        for (const h of members) skip.add(h.name);
        pluginRefs++;
    }
    for (const h of concrete) {
        if (skip.has(h.name)) continue;
        use(genAsset(h.name), `plugin ${f}${inSuite(h.index) ? " (test suite)" : ""}`);
        pluginRefs++;
    }
    // Any other string literal that names an existing file (e.g. UF_Gumps assigns "u7_gump_chest" to a variable).
    // A name that also exists in img/characters is a character sheet (caught above), not a face or system image.
    // A line holding several quoted names is a list (UF_Look's table of stock names), not an image the plugin draws.
    for (const m of text.matchAll(/"([^"\\\n]{3,64})"/g)) {
        const lit = m[1];
        const line = text.slice(text.lastIndexOf("\n", m.index) + 1, text.indexOf("\n", m.index));
        if ((line.match(/"[^"]*"/g) || []).length >= 4) continue;
        if (known.characters.has(lit)) { if (/^[!$]/.test(lit)) hit("characters", lit, m.index); continue; }
        for (const folder of ["system", "faces"]) {
            if (known[folder].has(lit)) { hit(folder, lit, m.index); break; }
        }
    }
}
check("plugins_scanned", pluginFiles.length > 0 && pluginRefs > 0, `${plural(pluginFiles.length, "UF_*.js file")}, ${plural(pluginRefs, "image or bitmap reference")}`);

// RMMZ's own system images (used by every window, icon, balloon and touch button).
for (const [name, why] of [["Window", "RMMZ core: skin of every window"], ["IconSet", "RMMZ core: icons"], ["Balloon", "RMMZ core: speech balloons"], ["ButtonSet", "RMMZ core: touch buttons"]]) {
    const a = systemAsset(name, "ui");
    use(a, why);
    state(a, name === "Window" ? "9-slice window skin, 192×192 (frame, background, cursor, arrows)" : "sheet of fixed-size pieces (RMMZ layout)");
}
// Non-file UI states worth naming for the artist.
for (const [key, text] of [["img/system/U7_Cursor.png", "2-frame pulse under the mouse cell"], ["img/system/U7_Select.png", "one frame under the selected unit"]]) if (assets.has(key)) state(assets.get(key), text);
if (assets.has("UF_GenStance_friendly") || assets.has("UF_GenStance_indifferent") || assets.has("UF_GenStance_hostile")) {
    for (const s of ["friendly", "indifferent", "hostile"]) if (assets.has(`UF_GenStance_${s}`)) state(assets.get(`UF_GenStance_${s}`), `48×48 square under a unit's feet, color ${(cat.stance && cat.stance.colors && cat.stance.colors[s]) || "?"} at alpha ${(cat.stance && cat.stance.alpha) || "?"}`);
}
if (assets.has("UF_GenSelect")) state(assets.get("UF_GenSelect"), "four corner brackets around the selected unit's feet (AR-031 look)");
if (assets.has("UF_GenDesignation_*")) state(assets.get("UF_GenDesignation_*"), "48×48 outline on a designated cell with a small glyph per job type (chop, gather, pick, quarry, mine, hunt, build, haul, dig, fish, dismantle); gone when the job finishes or is cancelled");
if (assets.has("UF_GenStockpile")) state(assets.get("UF_GenStockpile"), "flat dashed 48×48 square on the ground");

//---------------------------------------------------------------------------------------------------------------
// Status: missing > U7 stand-in > generated > stock RMMZ > original.

function statusOf(a) {
    if (a.kind === "gen") return ["generated", "drawn in code (UF_Gen*)"];
    const rel = `${a.folder}/${a.name}.png`;
    if (!fileSet.has(rel)) return ["missing", `no file game/img/${rel}`];
    if (/^(!?\$)?[Uu]7_/.test(a.name)) return ["U7 stand-in", "name starts with U7_"];
    if (standinListed(a.folder, a.name)) return ["U7 stand-in", "listed in docs/STATUS.md → Stand-ins"];
    if (gitInfo.ok) {
        const gp = `game/img/${rel}`;
        if (gitInfo.baseline.has(gp) && !gitInfo.changed.has(gp)) return ["stock RMMZ", `in ${BASELINE} and unchanged since`];
        if (gitInfo.baseline.has(gp)) return ["original", `in ${BASELINE} but changed since`];
        return ["original", `not in ${BASELINE}`];
    }
    if (STOCK_NAME_RE.test(a.name)) return ["stock RMMZ", "stock RMMZ name (git unavailable)"];
    return ["original", "not a stock name (git unavailable)"];
}
for (const a of assets.values()) [a.status, a.statusWhy] = statusOf(a);

//---------------------------------------------------------------------------------------------------------------
// Requests: which AR row mentions the file, the tile, the catalog id or the name.

// Match strength: 3 = the row names the file (or the tile: sheet + number), 2.5 = a glob in the row covers the
// file (only globs with a real prefix, so "$U7_*" in a wildlife row doesn't claim every U7 sheet), 2 = the row
// says the catalog id, 1 = the row says the display name (only names long enough to be specific).
// A tile or ground-kind entry never matches through its sheet's name: the sheet has its own entry.
const wordRe = (s, extra = "") => new RegExp(`(^|[^a-z0-9_${extra}])${escapeRe(s.toLowerCase())}([^a-z0-9_]|$)`);
const usableGlob = re => re.source.indexOf(".*") >= 7; // "^" + at least 6 literal chars before the first "*"
function matchesFor(a) {
    const out = [];
    for (const row of requestRows) {
        let strength = 0;
        if (a.tileId === null) {
            // A plain-text mention counts only for names that can't be ordinary words ("!$TimberOak", "U7_Cursor",
            // "People1"); "States" or "Window" must appear as a backticked file name. A UF_Gen* name also matches
            // through its family prefix: "UF_GenDesignation" in a row covers "UF_GenDesignation_*".
            const distinctive = /^[!$]/.test(a.name) || /[_0-9]/.test(a.name);
            const forms = [a.name];
            if (a.kind === "gen") {
                let p = a.name.replace(/_\*$/, "");
                for (;;) {
                    if (p !== a.name) forms.push(p);
                    const cut = p.lastIndexOf("_");
                    if (cut < "UF_Gen".length) break; // never shorter than "UF_Gen<Something>"
                    p = p.slice(0, cut);
                }
            }
            if (forms.some(x => row.fileNames.has(x.toLowerCase()))) strength = 3;
            else if (distinctive && forms.some(x => /^[!$]/.test(x) ? row.lower.includes(x.toLowerCase()) : wordRe(x, "$!").test(row.lower))) strength = 3;
            else if (row.globs.some(re => usableGlob(re) && re.test(a.name))) strength = 2.5;
        } else if (a.kind === "tile" && wordRe(a.name, "$!").test(row.lower) && new RegExp(`(^|[^0-9])${a.tileId}([^0-9]|$)`).test(row.lower)) strength = 3;
        if (!strength) for (const id of a.ids) { if (wordRe(id).test(row.lower) || (id.includes("_") && wordRe(id.replace(/_/g, " ")).test(row.lower))) { strength = 2; break; } }
        if (!strength) for (const name of a.names) { if ((name.includes(" ") || name.length >= 7) && wordRe(name).test(row.lower)) { strength = 1; break; } }
        if (strength) out.push({ row, strength });
    }
    return out;
}
const CLOSED = new Set(["DELIVERED", "CHECKED", "APPROVED", "INTEGRATED", "WITHDRAWN"]);
const isOpen = row => !row.withdrawn && !CLOSED.has(row.status);
const matches = new Map();
const coverage = {}; // how many assets of a category a row matches: a row that lists the whole category beats an incidental word
for (const a of assets.values()) {
    const m = matchesFor(a);
    matches.set(a.key, m);
    for (const { row } of m) { coverage[row.id] = coverage[row.id] || {}; coverage[row.id][a.category] = (coverage[row.id][a.category] || 0) + 1; }
}
for (const a of assets.values()) {
    const cov = row => (coverage[row.id] || {})[a.category] || 0;
    let m = matches.get(a.key);
    // Name-only matches are a fallback: keep them only when nothing mentions the file or the id.
    if (m.some(x => x.strength >= 2)) m = m.filter(x => x.strength >= 2);
    // A bare id word in a row that matches nothing else of this category is usually incidental ("oak" in the window skin row).
    m = m.filter(x => x.strength >= 2.5 || cov(x.row) >= 2 || !m.some(y => y !== x && y.strength >= 2.5));
    // Order: still-open rows first (that is the work queue), then how directly the row names it, then coverage, then file order.
    m = m.slice().sort((x, y) => (Number(isOpen(y.row)) - Number(isOpen(x.row))) || (y.strength - x.strength) || (cov(y.row) - cov(x.row)) || (x.row.line - y.row.line));
    a.requests = m.map(x => x.row.id + (x.row.withdrawn ? " (withdrawn)" : ""));
    const live = m.find(x => !x.row.withdrawn);
    a.request = live ? live.row.id : "none yet";
    a.requestStatus = live ? live.row.status : (m.length ? "WITHDRAWN" : "");
}

//---------------------------------------------------------------------------------------------------------------
// Output

const list = [...assets.values()];
const byStatus = Object.fromEntries(STATUS_ORDER.map(s => [s, list.filter(a => a.status === s).length]));
const sortKey = a => [STATUS_ORDER.indexOf(a.status), a.key.toLowerCase()];
const sorted = list.slice().sort((x, y) => { const a = sortKey(x), b = sortKey(y); return (a[0] - b[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0); });
const statesOf = a => {
    const shared = a.ids.size > 1;
    const out = [];
    for (const s of a.states) { const t = shared && s.by ? `${s.by}: ${s.text}` : s.text; if (!out.includes(t)) out.push(t); }
    return out;
};
const needs = sorted.filter(a => a.request === "none yet");
const missing = sorted.filter(a => a.status === "missing");

// Files on disk that nothing references (informational: candidates for deletion or forgotten deliveries).
const referenced = new Set(list.filter(a => a.folder).map(a => `${a.folder}/${a.name}.png`));
const unreferenced = imgFiles.filter(f => f.endsWith(".png") && /^(characters|tilesets|system|faces)\//.test(f) && !referenced.has(f)).map(f => {
    const folder = f.slice(0, f.lastIndexOf("/")), name = f.slice(f.lastIndexOf("/") + 1, -4);
    return { f, status: statusOf({ kind: "file", folder, name })[0] };
});
const unrefByStatus = Object.fromEntries(STATUS_ORDER.map(s => [s, unreferenced.filter(u => u.status === s).length]));

const md = [];
md.push(`# ASSET INVENTORY: every image and tile the engine uses`);
md.push(``);
md.push(`Generated ${DATE} by \`tools/generate_asset_inventory.js\` (do not edit by hand; run the tool). Inputs: \`game/data/UF_WorldCatalog.json\` (version ${cat.version}), ${plural(pluginFiles.length, "plugin")} in \`game/js/plugins/UF_*.js\`, \`game/img/**\` (${imgFiles.length} files), \`docs/STATUS.md\` → Stand-ins, the ${plural(requestRows.length, "row")} of \`docs/ASSET_REQUESTS.md\`, git baseline \`${BASELINE}\`${gitInfo.ok ? "" : " (git was unavailable: stock status by name rules)"}. The same data is in \`game/data/UF_AssetIndex.json\` for the look tooltip (UF_Look).`);
md.push(``);
md.push(`## Summary`);
md.push(``);
md.push(`| Status | Count | Meaning |`);
md.push(`|---|---|---|`);
const meanings = {
    "missing": "referenced by the catalog or a plugin, but no file: the game draws nothing there",
    "stock RMMZ": `the file is in the project's first commit \`${BASELINE}\` and unchanged since; RPG Maker's placeholder, to be replaced by an original (every one needs a request)`,
    "U7 stand-in": "name starts with `U7_` or the file is listed under Stand-ins in `docs/STATUS.md`; dev only, replaced before any release",
    "generated": "drawn in code (`UF_Gen*`); replaced when its request says so",
    "original": "our own art (not stock, not a stand-in)"
};
for (const s of STATUS_ORDER) md.push(`| ${s} | ${byStatus[s]} | ${meanings[s]} |`);
md.push(`| **total** | **${list.length}** | ${needs.length} with no request row (see "Needs a request") |`);
md.push(``);
md.push(`| Category | ${STATUS_ORDER.join(" | ")} | total |`);
md.push(`|---|${STATUS_ORDER.map(() => "---").join("|")}|---|`);
for (const [cid, label] of CATEGORIES) {
    const sub = list.filter(a => a.category === cid);
    md.push(`| ${label} | ${STATUS_ORDER.map(s => sub.filter(a => a.status === s).length).join(" | ")} | ${sub.length} |`);
}
md.push(``);
md.push(`## How to read the tables`);
md.push(``);
md.push(`- **Key** is what the engine calls the asset: a character sheet name (\`img/characters/<key>.png\`; \`$\` = one character per sheet, \`!\` = no shadow offset), \`<sheet>#<tile id>\` for one 48×48 tile of a tileset (ids 0–255 = B, 256–511 = C, 2048+ = A1 water autotile base, 2816+ = A2 ground autotile base), the path \`img/system/<name>.png\` for system and face images, or a \`UF_Gen*\` bitmap drawn in code. \`+json\` after a file means a sidecar exists.`);
md.push(`- **Used by** names the catalog entries (objects, items, species, people, ground and water kinds, biomes) and plugins that reference it. "(test suite)" = only a test uses it.`);
md.push(`- **States the art needs** come from the catalog: \`actions\` (what it turns into and yields), \`regrow\`, \`build\` (unbuilt/built), \`ruin\`, the \`fire\` tag (unlit/lit), \`hunt\` (alive/dead), clothing \`tiers\`, and the sheet format. When several kinds share one image (tints), each kind's states are prefixed with its id.`);
md.push(`- **Format, unless a row says otherwise:** objects and items use one frame of a 3×4 sheet (sidecar \`animations.stand[0]\`, else column 1 row 0), anchored at the bottom-centre of their cell (or the sidecar's \`anchor\`); creatures and people use the 4 rows as facings S, W, E, N and the 3 columns as walk frames; tiles are 48×48. Specs: \`docs/ART_STANDARD.md\`, \`docs/ASSET_REQUESTS.md\` (AR-600 for the layered sheet standard).`);
md.push(`- **Request** is the \`AR-\` row in \`docs/ASSET_REQUESTS.md\` that mentions the file, the tile, the catalog id or the name (its status word in brackets); other matching rows follow in smaller type. "none yet" = no row: tell Claude Code, don't invent an ID.`);
md.push(``);
for (const [cid, label] of CATEGORIES) {
    const sub = sorted.filter(a => a.category === cid);
    md.push(`## ${label}`);
    md.push(``);
    if (!sub.length) { md.push(`(nothing in this category)`); md.push(``); continue; }
    md.push(`| Key | File | Used by | States the art needs | Status | Request |`);
    md.push(`|---|---|---|---|---|---|`);
    for (const a of sub) {
        const file = a.file + (a.sidecar ? " +json" : "");
        const req = a.request === "none yet" ? "**none yet**" : `${a.request}${a.requestStatus ? ` (${a.requestStatus})` : ""}`;
        const others = a.requests.filter(r => r.split(" ")[0] !== a.request);
        md.push(`| \`${esc(a.key)}\` | ${esc(file)} | ${esc(a.usedBy.join("; "))} | ${esc(statesOf(a).join("; "))} | ${a.status} | ${req}${others.length ? ` <sub>${esc(others.join(", "))}</sub>` : ""} |`);
    }
    md.push(``);
}
md.push(`## Needs a request`);
md.push(``);
md.push(`Assets with no \`AR-\` row in \`docs/ASSET_REQUESTS.md\` that mentions them. Claude Code writes the request; Gemini doesn't invent IDs. Stock RMMZ entries here break the rule that every stock asset in use has a replacement request.`);
md.push(``);
if (!needs.length) md.push(`(none: every asset in use has a request row)`);
else {
    md.push(`| Key | Category | Status | Used by |`);
    md.push(`|---|---|---|---|`);
    for (const a of needs) md.push(`| \`${esc(a.key)}\` | ${a.category} | ${a.status} | ${esc(listText(a.usedBy, 3))} |`);
}
md.push(``);
md.push(`## Missing files`);
md.push(``);
if (!missing.length) md.push(`(none: every referenced file exists)`);
else for (const a of missing) md.push(`- \`${esc(a.key)}\`: ${esc(a.file)} (used by ${esc(a.usedBy.join("; "))})`);
md.push(``);
md.push(`## Files on disk that nothing references`);
md.push(``);
md.push(`Informational (\`img/characters\`, \`img/tilesets\`, \`img/system\`, \`img/faces\`): ${unreferenced.length} files, of which ${STATUS_ORDER.filter(s => unrefByStatus[s]).map(s => `${unrefByStatus[s]} ${s}`).join(", ") || "none"}. Not counted above. The non-stock ones:`);
md.push(``);
// Nested folders (system/u7_gumps/…) are summarized as one entry; top-level files are named one by one.
const unrefNonStock = [], nested = {};
for (const u of unreferenced.filter(u => u.status !== "stock RMMZ")) {
    const parts = u.f.split("/");
    if (parts.length > 2) nested[parts.slice(0, -1).join("/")] = (nested[parts.slice(0, -1).join("/")] || 0) + 1;
    else unrefNonStock.push(`\`${u.f}\``);
}
for (const [folder, n] of Object.entries(nested)) unrefNonStock.push(`\`${folder}/\` (${plural(n, "file")})`);
md.push(unrefNonStock.length ? listText(unrefNonStock, 400) : "(none)");
md.push(``);
fs.writeFileSync(OUT_MD, md.join("\n"), "utf8");

const index = {};
for (const a of sorted) {
    index[a.key] = {
        status: a.status,
        request: a.request,
        requests: a.requests,
        usedBy: a.usedBy,
        states: statesOf(a),
        category: a.category,
        file: a.file,
        exists: !!a.exists,
        sidecar: !!a.sidecar,
        statusWhy: a.statusWhy
    };
}
fs.writeFileSync(OUT_JSON, JSON.stringify(index, null, 1), "utf8");

//---------------------------------------------------------------------------------------------------------------
// Checks on what was produced

check("objects_have_art", objectsWithoutArt.length === 0, objectsWithoutArt.length ? `objects with no image/tile/gen: ${objectsWithoutArt.join(", ")}` : `all ${cat.objects.length} catalog objects have an image, tile or gen`);
check("assets_listed", list.length >= 100, `${list.length} assets: ${CATEGORIES.map(([cid]) => `${list.filter(a => a.category === cid).length} ${cid}`).join(", ")}`);
check("status_counts", STATUS_ORDER.every(s => typeof byStatus[s] === "number") && Object.values(byStatus).reduce((x, y) => x + y, 0) === list.length, STATUS_ORDER.map(s => `${byStatus[s]} ${s}`).join(", "));
check("every_asset_marked", list.every(a => STATUS_ORDER.includes(a.status) && a.usedBy.length > 0 && a.statusWhy), `${list.length} assets have a status, a reason and at least one user`);
check("missing_files", missing.length === 0, missing.length ? `${missing.length} referenced files do not exist: ${listText(missing.map(a => a.key), 10)}` : `all ${list.filter(a => a.kind !== "gen").length} referenced files exist under game/img`);
const catalogAssets = list.filter(a => a.ids.size > 0 && a.category !== "tiles");
check("states_present", catalogAssets.every(a => a.states.length > 0), `${catalogAssets.length} catalog-backed assets all list at least one interaction state`);
const stockInUse = list.filter(a => a.status === "stock RMMZ");
check("stock_detected", stockInUse.length > 0 && stockInUse.every(a => gitInfo.ok ? gitInfo.baseline.has(`game/img/${a.folder}/${a.name}.png`) : true), `${stockInUse.length} stock RMMZ assets in use (e.g. ${listText(stockInUse.slice(0, 3).map(a => a.key), 3)})`);
const standinCount = list.filter(a => a.status === "U7 stand-in").length;
check("standins_detected", standinCount > 0, `${standinCount} U7 stand-ins in use (${list.filter(a => a.statusWhy.includes("STATUS.md")).length} of them found only through STATUS.md → Stand-ins)`);
const badRequest = list.filter(a => a.request !== "none yet" && !requestRows.some(r => r.id === a.request));
check("request_ids_exist", badRequest.length === 0, badRequest.length ? `unknown request ids: ${badRequest.map(a => `${a.key}→${a.request}`).join(", ")}` : `${list.filter(a => a.request !== "none yet").length} assets matched to a request row, ${needs.length} need one`);
let parsed = null, jsonWhy = "";
try {
    parsed = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
    const keys = Object.keys(parsed);
    const bad = keys.filter(k => !parsed[k] || typeof parsed[k].status !== "string" || typeof parsed[k].request !== "string" || !Array.isArray(parsed[k].usedBy) || !Array.isArray(parsed[k].states));
    jsonWhy = `${keys.length} keys in ${path.relative(ROOT, OUT_JSON)}, ${fs.statSync(OUT_JSON).size} bytes${bad.length ? `; entries without status/request/usedBy/states: ${listText(bad, 5)}` : "; every entry has status, request, usedBy, states"}`;
    check("json_valid", keys.length === list.length && bad.length === 0, jsonWhy);
} catch (e) {
    check("json_valid", false, `${OUT_JSON}: ${e.message}`);
}
const mdText = fs.readFileSync(OUT_MD, "utf8");
const wantHeadings = ["## Summary", ...CATEGORIES.map(([, l]) => `## ${l}`), "## Needs a request", "## Missing files"];
const missingHeadings = wantHeadings.filter(h => !mdText.includes(`\n${h}\n`));
check("md_sections", missingHeadings.length === 0, missingHeadings.length ? `headings missing from ${path.relative(ROOT, OUT_MD)}: ${missingHeadings.join(", ")}` : `${path.relative(ROOT, OUT_MD)}: ${mdText.split("\n").length} lines, ${wantHeadings.length} sections, ${needs.length} in "Needs a request", ${unreferenced.length} unreferenced files noted`);
finish();

function finish() {
    const failed = checks.filter(c => !c.ok).length;
    console.log(`RESULT ${failed ? "FAIL" : "PASS"} ${checks.length - failed}/${checks.length} checks (inventory)`);
    process.exit(failed ? 1 : 0);
}
