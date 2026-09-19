// Switches the catalog's objects and items that name U7 art (U7_ files and U7-derived files without the prefix)
// to stock RPG Maker MZ art: objects to Outside_B / Outside_C tiles (tile blocks for trees), items to stock
// IconSet icons cut by tools/extract_stock_icons.js (VISION V9, user 2026-09-19: "stock is fine").
//
// Concurrency: other runs edit the same catalog (wildlife combat blocks, item weapon/armour blocks, start.kit).
// So this tool never re-serializes the file. It re-reads the file, edits only the "image" / "tile" / "tint" text
// inside the one line of each mapped entry (objects[] and items.types[] are one entry per line), re-reads the file
// again immediately before writing (and starts over if it changed meanwhile), writes, reads it back and asserts
// that every other top-level key, and every other field of every entry, equals the fresh read.
//
// Usage: "C:\Program Files\nodejs\node.exe" tools\switch_things_to_stock.js [--dry-run] [--check] [--file <catalog>]
//   (default)  apply the mapping; entries whose image is neither the expected old one nor the target are skipped
//   --dry-run  print what would change; writes nothing
//   --check    exit 1 unless every mapped entry already has its target image/tile/tint and no object or item names
//              a U7 file (the U7_ prefix or a name in U7_DERIVED); writes nothing
// Output ends with "RESULT PASS|FAIL ...". Exit code 0 ok, 1 a check or an assertion failed, 2 bad input.
// Tile and icon choices were made by looking at crops of the stock sheets (2026-09-19); docs/systems/UF_Objects.md
// and UF_Items.md list them. Owner: Claude Code.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const FILE = path.resolve(opt("--file", path.join(ROOT, "game", "data", "UF_WorldCatalog.json")));
const DRY = args.includes("--dry-run");
const CHECK = args.includes("--check");

// U7-derived files without the U7_ prefix (docs/STATUS.md -> Stand-ins, plus byte-identical copies found 2026-09-19).
const U7_DERIVED = ["!$TimberOak", "!$PineTree", "!$FruitTree", "!$BerryBush", "!$Campfire", "!$GraniteBoulder", "!$IronstoneDeposit",
    "!$TreeStump", "!$UF_Stump", "!$UF_Wildflowers", "!$UF_Item_Firewood", "!$UF_Item_Fish", "!$BirchTree", "!$CaveLadder", "!$CaveMouth",
    "!$CrystalCluster", "!$DeadTree", "!$FallenPillar", "!$LooseStones", "!$OldBones", "!$Reeds", "!$StrawBed", "!$TallGrass",
    "!$WildShrub", "!$IronOreVein"];
const isU7 = name => typeof name === "string" && (/U7_/.test(name) || U7_DERIVED.includes(name));

const B = (id, w, h) => ({ sheet: "Outside_B", id, ...(w > 1 ? { w } : {}), ...(h > 1 ? { h } : {}) });
const C = id => ({ sheet: "Outside_C", id });

// id: [expected old image, new tile, tint or null]
const OBJECTS = {
    oak:             ["!$TimberOak",            B(176, 2, 2), null],       // Large Tree, 2x2 round broadleaf
    birch:           ["!$TimberOak",            B(157, 1, 2), "#e6f0e0"],  // Tree 157 over 165: tall narrow broadleaf
    pine:            ["!$PineTree",             B(221, 1, 2), "#6aa86a"],  // Conifer Tree (Snow) 221 over 229, tinted green
    fir_snow:        ["!$PineTree",             B(192, 2, 2), null],       // Large Conifer Tree (Snow), 2x2
    fruit_tree:      ["!$FruitTree",            B(176, 2, 2), "#ffd0a0"],
    fruit_tree_bare: ["!$FruitTree",            B(176, 2, 2), "#9a9a8a"],
    tree_savanna:    ["!$U7_Flat-toptree",      B(176, 2, 2), "#ffb8a0"],
    tree_swamp:      ["!$U7_Swamptree",         B(157, 1, 2), "#98b090"],
    mangrove:        ["!$U7_Swamptree",         B(157, 1, 2), "#c8e0a0"],
    tree_tropical:   ["!$U7_Broadleafgiant",    B(176, 2, 2), "#90e888"],
    dead_tree:       ["!$U7_Deadtree",          B(232, 1, 2), null],       // Dead Tree 232 over 240
    tree_cursed:     ["!$U7_Deadtree",          B(232, 1, 2), "#c0a0e0"],
    stump:           ["!$UF_Stump",             B(156), null],             // Stump
    bush:            ["!$U7_Shrub",             B(166), null],             // Bush
    desert_shrub:    ["!$U7_Shrub",             B(241), null],             // Dead Tree (Shrub)
    grass_tuft:      ["!$U7_TallGrass",         B(153), null],             // Grass B
    reeds:           ["!$U7_Reeds",             B(251), null],             // Susuki Grass (lichen shares it, tinted)
    flowers:         ["!$UF_Wildflowers",       B(163), null],             // Flowers D (orange)
    flowers_purple:  ["!$U7_Wildflowers",       B(161), null],             // Flowers B
    flowers_blue:    ["!$U7_Wildflowers",       B(162), null],             // Flowers C
    flowers_white:   ["!$U7_Wildflowers",       B(160), null],             // Flowers A
    rocks_small:     ["!$U7_LooseStones",       B(171), null],             // Rocks
    gravel:          ["!$U7_Gravel",            B(171), "#a0a0a8"],
    granite_boulder: ["!$GraniteBoulder",       B(159), null],             // Boulder A (grey)
    ironstone:       ["!$IronstoneDeposit",     B(167), null],             // Boulder B (rust brown)
    copper_outcrop:  ["!$U7_MalachiteOutcrop",  C(282), "#90d0b0"],        // Rubble, tinted green
    gold_outcrop:    ["!$U7_GoldVeinOutcrop",   C(285), "#ffe070"],        // Rubble D, tinted gold
    crystal:         ["!$U7_CrystalSpire",      C(287), null],             // Rubble F (glowing green stones)
    crystal_small:   ["!$U7_SmallCrystals",     B(171), "#90f0e0"],        // Rocks, tinted
    bones_pile:      ["!$U7_OldBones",          C(281), null]              // Bones B
};

// id: [expected old image, IconSet icon, tint or null]
const ITEMS = {
    firewood:         ["!$UF_Item_Firewood",      295, null],
    gold:             ["!$U7_Item_GoldNugget",    169, null],
    gem_rough:        ["!$U7_Item_RoughGem",      301, null],
    gem_cut:          ["!$U7_Item_CutGem",        300, null],
    bar_iron:         ["!$U7_Item_MetalBar",      313, null],
    fruit:            ["!$U7_Item_TreeFruit",     265, null],
    mushroom:         ["!$U7_Item_CaveMushroom",  261, null],
    root:             ["!$U7_Item_RootVegetable", 256, null],
    seeds:            ["!$U7_Item_SeedPouch",     274, null],
    fiber:            ["!$U7_Item_PlantFiber",    290, null],
    fish:             ["!$UF_Item_Fish",          260, null],
    hide:             ["!$U7_Item_LeatherHide",   291, null],
    bone:             ["!$U7_Item_AnimalBone",    298, null],
    wool:             ["!$U7_Item_WoolFleece",    289, null],
    stone_axe:        ["!$U7_Item_RoughStone",     99, "#c8b8a0"],
    stone_knife:      ["!$U7_Item_RoughStone",    120, "#c8b8a0"],
    stone_pick:       ["!$U7_Item_RoughStone",    216, null],
    fiber_wrap:       ["!$U7_Item_PlantFiber",    136, null],
    hide_cloak:       ["!$U7_Item_LeatherHide",   138, null],
    charcoal:         ["!$U7_Item_Firewood",      167, null],
    bar_copper:       ["!$U7_Item_MetalBar",      313, "#e0a070"],
    feathers:         ["!$U7_Item_PlantFiber",    297, null],
    leather:          ["!$U7_Item_LeatherHide",   291, "#d09060"],
    arrows:           ["!$U7_Item_AnimalBone",    225, null],
    bow_short:        ["!$U7_Item_WoodLog",       102, null],
    bow_long:         ["!$U7_Item_WoodLog",       102, "#c8a070"],
    sling:            ["!$U7_Item_LeatherHide",   114, null],
    club:             ["!$U7_Item_WoodLog",       110, null],
    spear:            ["!$U7_Item_WoodLog",       107, null],
    dagger_iron:      ["!$U7_Item_MetalBar",      120, null],
    sword_short:      ["!$U7_Item_MetalBar",       96, null],
    sword_long:       ["!$U7_Item_MetalBar",       97, null],
    axe_iron:         ["!$U7_Item_MetalBar",       99, null],
    mace:             ["!$U7_Item_MetalBar",       98, null],
    helmet_leather:   ["!$U7_Item_LeatherHide",   150, null],
    helmet_iron:      ["!$U7_Item_MetalBar",      132, null],
    armor_leather:    ["!$U7_Item_LeatherHide",   153, null],
    mail_iron:        ["!$U7_Item_MetalBar",      135, null],
    leggings_leather: ["!$U7_Item_LeatherHide",   140, null],
    greaves_iron:     ["!$U7_Item_MetalBar",      141, null],
    shield_wood:      ["!$U7_Item_WoodLog",       129, null],
    shield_iron:      ["!$U7_Item_MetalBar",      128, null]
};

const iconName = n => `!$UF_Icon_${n}`;
const tileText = t => `"tile": { "sheet": "${t.sheet}", "id": ${t.id}${t.w ? `, "w": ${t.w}` : ""}${t.h ? `, "h": ${t.h}` : ""} }`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const without = (o, keys) => { const c = {}; for (const k of Object.keys(o)) if (!keys.includes(k)) c[k] = o[k]; return c; };
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function die(msg, code) {
    console.log(`RESULT FAIL: ${msg}`);
    process.exit(code);
}

/** [start, end) line indexes of the array opened by the line matching `open`, closed by the next line matching `close`. */
function range(lines, open, close, from) {
    const s = lines.findIndex((l, i) => i >= (from || 0) && open.test(l));
    if (s < 0) return null;
    const e = lines.findIndex((l, i) => i > s && close.test(l));
    return e < 0 ? null : [s + 1, e];
}

/** The line index of entry `id` inside [a, b), or -1 / -2 (none / several). */
function entryLine(lines, [a, b], id) {
    const re = new RegExp(`^\\s*\\{ "id": "${escRe(id)}",`);
    const hits = [];
    for (let i = a; i < b; i++) if (re.test(lines[i])) hits.push(i);
    return hits.length === 1 ? hits[0] : hits.length ? -2 : -1;
}

/** Edits one entry line: the image field becomes `newField`, the tint becomes `tint` (null = none). Returns the line or an error string. */
function editLine(line, oldImage, newField, tint) {
    const imgRe = new RegExp(`"image": "${escRe(oldImage)}"`, "g");
    const imgHits = line.match(imgRe) || [];
    if (imgHits.length !== 1) return `"image": "${oldImage}" found ${imgHits.length} times`;
    const tintRe = /, "tint": "#[0-9a-fA-F]{6}"/g;
    const tintHits = line.match(tintRe) || [];
    if (tintHits.length > 1) return `${tintHits.length} "tint" fields`;
    // Function replacements, so a "$" in a name is never read as a replacement pattern.
    let out = line.replace(imgRe, () => newField);
    if (tintHits.length && tint) out = out.replace(tintRe, () => `, "tint": "${tint}"`);
    else if (tintHits.length && !tint) out = out.replace(tintRe, () => "");
    else if (!tintHits.length && tint) out = out.replace(newField, () => `${newField}, "tint": "${tint}"`);
    return out;
}

/** The planned text for a fresh read: { text, changes, skipped, already }. */
function plan(text) {
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(eol);
    const catalog = JSON.parse(text.replace(/^\uFEFF/, ""));
    const objRange = range(lines, /^  "objects": \[\s*$/, /^  \],?\s*$/);
    const itemsAt = lines.findIndex(l => /^  "items": \{\s*$/.test(l));
    const typeRange = itemsAt >= 0 ? range(lines, /^    "types": \[\s*$/, /^    \],?\s*$/, itemsAt) : null;
    if (!objRange || !typeRange) die(`could not find the objects[] or items.types[] block (objects ${!!objRange}, types ${!!typeRange})`, 2);
    const changes = [], skipped = [], already = [];
    const doOne = (kind, rng, list, id, oldImage, targetImage, targetTile, tint) => {
        const entry = list.find(e => e.id === id);
        if (!entry) { skipped.push(`${kind} ${id}: not in the catalog`); return; }
        const done = targetTile ? same(entry.tile, targetTile) && entry.image === undefined : entry.image === targetImage;
        if (done && (entry.tint || null) === tint) { already.push(`${kind} ${id}`); return; }
        if (entry.image !== oldImage) { skipped.push(`${kind} ${id}: image is ${JSON.stringify(entry.image)}, expected "${oldImage}"; left alone`); return; }
        const li = entryLine(lines, rng, id);
        if (li < 0) { skipped.push(`${kind} ${id}: ${li === -1 ? "no line" : "several lines"} start with its id; left alone`); return; }
        const newField = targetTile ? tileText(targetTile) : `"image": "${targetImage}"`;
        const edited = editLine(lines[li], oldImage, newField, tint);
        if (!edited.startsWith(lines[li].match(/^\s*/)[0] + "{")) { skipped.push(`${kind} ${id}: ${edited}; left alone`); return; }
        changes.push({ kind, id, line: li + 1, from: `${oldImage}${entry.tint ? ` tint ${entry.tint}` : ""}`,
            to: `${targetTile ? `${targetTile.sheet}#${targetTile.id}${targetTile.w || targetTile.h ? ` ${targetTile.w || 1}x${targetTile.h || 1}` : ""}` : targetImage}${tint ? ` tint ${tint}` : ""}` });
        lines[li] = edited;
    };
    for (const [id, [oldImage, tile, tint]] of Object.entries(OBJECTS)) doOne("object", objRange, catalog.objects, id, oldImage, null, tile, tint);
    for (const [id, [oldImage, icon, tint]] of Object.entries(ITEMS)) doOne("item", typeRange, catalog.items.types, id, oldImage, iconName(icon), null, tint);
    return { text: lines.join(eol), changes, skipped, already };
}

/** Problems (strings) when `after` differs from `before` anywhere except the mapped image/tile/tint fields. */
function compare(beforeText, afterText) {
    const problems = [];
    const A = JSON.parse(beforeText.replace(/^\uFEFF/, "")), Z = JSON.parse(afterText.replace(/^\uFEFF/, ""));
    if (!same(Object.keys(A), Object.keys(Z))) problems.push("top-level keys differ");
    for (const k of Object.keys(A)) if (k !== "objects" && k !== "items" && !same(A[k], Z[k])) problems.push(`top-level "${k}" changed`);
    if (!same(without(A.items, ["types"]), without(Z.items, ["types"]))) problems.push("items (other than types) changed");
    const entries = (kind, a, z, map, fields) => {
        if (a.length !== z.length) { problems.push(`${kind}: ${a.length} entries before, ${z.length} after`); return; }
        a.forEach((e, i) => {
            const f = z[i];
            if (!same(without(e, fields), without(f, fields))) problems.push(`${kind} ${e.id}: a field other than ${fields.join("/")} changed`);
            if (!map[e.id] && fields.some(k => !same(e[k], f[k]))) problems.push(`${kind} ${e.id}: not mapped but its ${fields.join("/")} changed`);
        });
    };
    entries("object", A.objects, Z.objects, OBJECTS, ["image", "tile", "tint"]);
    entries("item", A.items.types, Z.items.types, ITEMS, ["image", "tint"]);
    const aLines = beforeText.split(/\r?\n/), zLines = afterText.split(/\r?\n/);
    if (aLines.length !== zLines.length) problems.push(`line count ${aLines.length} -> ${zLines.length}`);
    return problems;
}

/** Mapped entries not at their target, and objects/items still naming U7 files. */
function checkTargets(text) {
    const c = JSON.parse(text.replace(/^\uFEFF/, ""));
    const bad = [];
    for (const [id, [, tile, tint]] of Object.entries(OBJECTS)) {
        const o = c.objects.find(e => e.id === id);
        if (o && !(same(o.tile, tile) && o.image === undefined && (o.tint || null) === tint)) bad.push(`object ${id}: image ${JSON.stringify(o.image)} tile ${JSON.stringify(o.tile)} tint ${o.tint || "none"}; want ${JSON.stringify(tile)} tint ${tint || "none"}`);
    }
    for (const [id, [, icon, tint]] of Object.entries(ITEMS)) {
        const t = c.items.types.find(e => e.id === id);
        if (t && !(t.image === iconName(icon) && (t.tint || null) === tint)) bad.push(`item ${id}: image ${t.image} tint ${t.tint || "none"}; want ${iconName(icon)} tint ${tint || "none"}`);
    }
    for (const o of c.objects) if (isU7(o.image)) bad.push(`object ${o.id} still names U7 art ${o.image}`);
    for (const t of c.items.types) if (isU7(t.image)) bad.push(`item ${t.id} still names U7 art ${t.image}`);
    return bad;
}

function main() {
    if (!fs.existsSync(FILE)) die(`no catalog at ${FILE}`, 2);
    if (CHECK) {
        const bad = checkTargets(fs.readFileSync(FILE, "utf8"));
        for (const b of bad) console.log(`FAIL ${b}`);
        console.log(`RESULT ${bad.length ? "FAIL" : "PASS"}: ${Object.keys(OBJECTS).length} objects and ${Object.keys(ITEMS).length} items mapped; ${bad.length} problem(s)`);
        process.exit(bad.length ? 1 : 0);
    }
    for (let attempt = 1; attempt <= 3; attempt++) {
        const fresh = fs.readFileSync(FILE, "utf8");
        const p = plan(fresh);
        const problems = compare(fresh, p.text);
        if (problems.length) die(`the planned edit would change more than image/tile/tint: ${problems.join("; ")}`, 1);
        for (const c of p.changes) console.log(`${DRY ? "would change" : "change"} ${c.kind} ${c.id} (line ${c.line}): ${c.from} -> ${c.to}`);
        for (const s of p.skipped) console.log(`skipped ${s}`);
        if (p.already.length) console.log(`already on stock: ${p.already.join(", ")}`);
        if (DRY || !p.changes.length) {
            console.log(`RESULT PASS: ${p.changes.length} change(s) ${DRY ? "planned (dry run)" : "needed"}, ${p.skipped.length} skipped, ${p.already.length} already done`);
            process.exit(0);
        }
        // Immediately before writing: the file must still be the one the plan was made from.
        if (fs.readFileSync(FILE, "utf8") !== fresh) { console.log(`the catalog changed while planning (attempt ${attempt}); planning again`); continue; }
        fs.writeFileSync(FILE, p.text);
        const back = fs.readFileSync(FILE, "utf8");
        const after = compare(fresh, back);
        const exact = back === p.text;
        const targets = checkTargets(back).filter(b => p.changes.some(c => b.startsWith(`${c.kind} ${c.id}:`)));
        if (after.length || targets.length) die(`after writing: ${after.concat(targets).join("; ")}${exact ? "" : " (the file on disk is not the text written: another writer?)"}`, 1);
        console.log(`RESULT PASS: ${p.changes.length} entries changed (${p.changes.filter(c => c.kind === "object").length} objects, ${p.changes.filter(c => c.kind === "item").length} items), ${p.skipped.length} skipped, ${p.already.length} already done; read back: every other top-level key and every other field of every entry equals the fresh read${exact ? "" : "; NOTE the file on disk differs from the text written (another writer after this one)"}`);
        process.exit(0);
    }
    die("the catalog kept changing while planning (3 attempts); nothing written", 1);
}

main();
