// tools/check_catalog.js
// Validates game/data/UF_WorldCatalog.json as a whole: every id one section names in another exists, every
// weapon's combat block is well formed (speed, attack types, styles, bonuses; OSRS model, VISION V64), every armor
// sits in one of the five slots with bonuses, every wildlife species has a combat block, every material and labor referenced exists,
// every plan step points at real objects, recipes and tags, every object's becomes / ruin / regrow target exists,
// every wildlife yield is an item, no banned word (AGENTS.md list plus "Dwarf Fortress" and "Ultima") appears in
// any string, and the catalog's images and tile sheets exist on disk.
// Prints one "FAIL <check>: <what is wrong>" line per problem and "RESULT PASS|FAIL <n> checks"; exit 1 on FAIL.
//
//   "C:\Program Files\nodejs\node.exe" tools\check_catalog.js [--file <catalog.json>] [--quiet]
//   "C:\Program Files\nodejs\node.exe" tools\check_catalog.js --selftest
//       breaks a scratch copy of the catalog in every way a check covers, one at a time, and asserts each
//       break is caught by that check (and nothing else); "RESULT PASS|FAIL <n> selftests".
// Contract: docs/design/COMBAT_CHAINS.md section 9. Owner: Claude Code. Written 2026-09-18.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_CATALOG = path.join(ROOT, "game", "data", "UF_WorldCatalog.json");
const IMG = path.join(ROOT, "game", "img");

const SLOTS = ["head", "weapon", "shield", "torso", "legs"];
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha", "finesse"];
const TYPES = ["stab", "slash", "crush", "ranged", "magic"];
const STYLES = ["accurate", "aggressive", "defensive", "controlled", "rapid", "longrange"];
const CREATURE_KEYS = ["attack", "strength", "defence", "ranged", "magic", "hitpoints", "attackSpeed", "attackType", "maxHitBonus", "bonuses"];
// A bonuses block: { attack: {type: n}, defence: {type: n}, strength, rangedStrength, magicStrength }; returns problems.
function bonusProblems(b) {
    const out = [];
    if (b === undefined) return out;
    if (!b || typeof b !== "object" || Array.isArray(b)) return ["bonuses must be an object"];
    for (const k of Object.keys(b)) {
        if (k === "attack" || k === "defence") {
            const g = b[k];
            if (!g || typeof g !== "object") { out.push(`bonuses.${k} must be an object`); continue; }
            for (const t of Object.keys(g)) {
                if (!TYPES.includes(t)) out.push(`bonuses.${k}.${t} is not an attack type (${TYPES.join("/")})`);
                else if (!Number.isFinite(g[t]) || Math.abs(g[t]) > 200) out.push(`bonuses.${k}.${t} must be a number within +-200`);
            }
        } else if (["strength", "rangedStrength", "magicStrength", "hitpoints"].includes(k)) {
            if (!Number.isFinite(b[k]) || Math.abs(b[k]) > 200) out.push(`bonuses.${k} must be a number within +-200`);
        } else out.push(`bonuses.${k} is not a bonus key`);
    }
    return out;
}
// AGENTS.md "Reference vs. shipped content" plus the two game names.
const BANNED = ["Avatar", "Britannia", "Guardian", "Lord British", "Iolo", "Dupre", "Shamino", "Fellowship", "moongate",
    "Urist", "Armok", "strange mood", "fey mood", "beholder", "mind flayer", "illithid", "displacer beast", "githyanki",
    "Dwarf Fortress", "Ultima"];
const BANNED_RE = BANNED.map(w => ({ word: w, re: new RegExp(`(^|[^A-Za-z])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "i") }));

//---------------------------------------------------------------------------------------------------------------
// The checks. run(cat, opts) -> { fails: [{ check, msg }], checks: [names] }

function run(cat, opts) {
    opts = opts || {};
    const fails = [];
    const checks = [];
    const fail = (check, msg) => fails.push({ check, msg });
    const check = name => { checks.push(name); return msg => fail(name, msg); };

    const items = (cat.items && cat.items.types) || [];
    const itemIds = new Set(items.map(t => t.id));
    const objects = cat.objects || [];
    const objIds = new Set(objects.map(o => o.id));
    const recipes = (cat.recipes && cat.recipes.list) || [];
    const recipeIds = new Set(recipes.map(r => r.id));
    const materials = (cat.materials && cat.materials.list) || [];
    const materialIds = new Set(materials.map(m => m.id));
    const labors = (cat.labors && cat.labors.list) || [];
    const laborIds = new Set(labors.map(l => l.id));
    const skills = new Set((cat.colony && cat.colony.skills) || []);
    const species = (cat.wildlife && cat.wildlife.species) || [];
    const itemsWithTag = tag => items.filter(t => Array.isArray(t.tags) && t.tags.includes(tag));
    const objectsWithTag = tag => objects.filter(o => Array.isArray(o.tags) && o.tags.includes(tag));

    // ids
    {
        const f = check("unique_ids");
        for (const [what, list] of [["item", items], ["object", objects], ["recipe", recipes], ["material", materials], ["labor", labors], ["species", species]]) {
            const seen = new Set();
            for (const e of list) {
                if (!e || typeof e.id !== "string" || !e.id) { f(`${what} without an id: ${JSON.stringify(e).slice(0, 60)}`); continue; }
                if (seen.has(e.id)) f(`${what} id "${e.id}" appears twice`);
                seen.add(e.id);
            }
        }
    }
    // recipes
    {
        const f = check("recipe_items_exist");
        for (const r of recipes) {
            for (const id of Object.keys(r.inputs || {})) if (!itemIds.has(id)) f(`recipe ${r.id} input "${id}" is not an item type`);
            for (const id of Object.keys(r.outputs || {})) if (!itemIds.has(id)) f(`recipe ${r.id} output "${id}" is not an item type`);
            if (!r.outputs || !Object.keys(r.outputs).length) f(`recipe ${r.id} has no outputs`);
            for (const id of Object.keys(r.inputs || {})) if (!(r.inputs[id] > 0)) f(`recipe ${r.id} input "${id}" count must be > 0`);
            for (const id of Object.keys(r.outputs || {})) if (!(r.outputs[id] > 0)) f(`recipe ${r.id} output "${id}" count must be > 0`);
            if (!(r.work > 0)) f(`recipe ${r.id} work must be > 0`);
        }
    }
    {
        const f = check("recipe_at_is_object_tag");
        for (const r of recipes) if (r.at && !objectsWithTag(r.at).length) f(`recipe ${r.id} at "${r.at}" matches no object tag`);
    }
    {
        const f = check("recipe_labor_and_skill");
        for (const r of recipes) {
            if (r.labor !== undefined && !laborIds.has(r.labor)) f(`recipe ${r.id} labor "${r.labor}" is not in labors`);
            if (r.skill !== undefined && !skills.has(r.skill)) f(`recipe ${r.id} skill "${r.skill}" is not in colony.skills`);
            if (r.ability !== undefined && !ABILITIES.includes(r.ability)) f(`recipe ${r.id} ability "${r.ability}" is not one of ${ABILITIES.join("/")}`);
            if (r.material !== undefined && !materialIds.has(r.material)) f(`recipe ${r.id} material "${r.material}" is not in materials`);
            if (r.tool !== undefined && r.tool !== null && !itemsWithTag(r.tool).some(t => t.tool)) f(`recipe ${r.id} tool tag "${r.tool}" matches no tool item`);
        }
    }
    // items
    {
        const f = check("item_basics");
        for (const t of items) {
            if (typeof t.name !== "string" || !t.name) f(`item ${t.id} has no name`);
            if (typeof t.image !== "string" || !t.image.startsWith("!$")) f(`item ${t.id} image must be a "!$" character sheet`);
            if (!(t.stack >= 1)) f(`item ${t.id} stack must be >= 1`);
            if (!Array.isArray(t.tags)) f(`item ${t.id} has no tags array`);
            if (t.tint !== undefined && !/^#[0-9a-fA-F]{6}$/.test(t.tint)) f(`item ${t.id} tint "${t.tint}" is not #rrggbb`);
            if (t.weight !== undefined && !(t.weight >= 0)) f(`item ${t.id} weight must be >= 0`);
            if (t.labor !== undefined && !laborIds.has(t.labor)) f(`item ${t.id} labor "${t.labor}" is not in labors`);
        }
    }
    {
        const f = check("weapon_blocks");
        for (const t of items) {
            if (!t.weapon) continue;
            const w = t.weapon;
            for (const old of ["damage", "ability", "versatile", "properties", "skill"]) if (w[old] !== undefined) f(`item ${t.id} weapon has the d20 key "${old}" (retired 2026-09-19, VISION V64)`);
            if (!(Number.isInteger(w.speed) && w.speed >= 1 && w.speed <= 10)) f(`item ${t.id} weapon speed must be an integer 1-10 (ticks)`);
            if (!Array.isArray(w.types) || !w.types.length || w.types.some(x => !TYPES.includes(x))) f(`item ${t.id} weapon types must be a non-empty list of ${TYPES.join("/")}`);
            if (!Array.isArray(w.styles) || !w.styles.length || w.styles.some(x => !STYLES.includes(x))) f(`item ${t.id} weapon styles must be a non-empty list of ${STYLES.join("/")}`);
            if (w.hands !== undefined && ![1, 2].includes(w.hands)) f(`item ${t.id} weapon hands must be 1 or 2`);
            if (w.reach !== undefined && !(w.reach >= 1)) f(`item ${t.id} weapon reach must be >= 1`);
            for (const p of bonusProblems(w.bonuses)) f(`item ${t.id} weapon ${p}`);
            if (w.ranged) {
                if (!(Number.isInteger(w.ranged.range) && w.ranged.range >= 1)) f(`item ${t.id} ranged range must be an integer >= 1 cell`);
                if (!itemIds.has(w.ranged.ammo)) f(`item ${t.id} ranged ammo "${w.ranged.ammo}" is not an item type`);
                if (!Array.isArray(w.types) || !w.types.includes("ranged")) f(`item ${t.id} has a ranged block but no "ranged" attack type`);
            }
        }
    }
    {
        const f = check("ammo_for_ranged_weapons");
        for (const t of items) {
            if (!t.ammo) continue;
            if (!Array.isArray(t.ammo.for) || !t.ammo.for.length) { f(`item ${t.id} ammo.for must list weapon ids`); continue; }
            if (t.ammo.rangedStrength !== undefined && !Number.isFinite(t.ammo.rangedStrength)) f(`item ${t.id} ammo.rangedStrength must be a number`);
            for (const id of t.ammo.for) {
                const w = items.find(x => x.id === id);
                if (!w) f(`item ${t.id} ammo.for "${id}" is not an item type`);
                else if (!w.weapon || !w.weapon.ranged || w.weapon.ranged.ammo !== t.id) f(`item ${t.id} ammo.for "${id}" is not a ranged weapon that fires it`);
            }
        }
    }
    {
        const f = check("armor_slots");
        for (const t of items) {
            if (t.armor) {
                if (!SLOTS.includes(t.armor.slot)) f(`item ${t.id} armor slot "${t.armor.slot}" is not one of ${SLOTS.join("/")}`);
                if (t.armor.slot === "weapon" || t.armor.slot === "shield") f(`item ${t.id} armor slot "${t.armor.slot}" is not a body slot`);
                for (const old of ["ac", "dexMax", "soak", "minStr"]) if (t.armor[old] !== undefined) f(`item ${t.id} armor has the d20 key "${old}" (retired 2026-09-19)`);
                if (!t.armor.bonuses) f(`item ${t.id} armor has no bonuses`);
                for (const p of bonusProblems(t.armor.bonuses)) f(`item ${t.id} armor ${p}`);
            }
            if (t.shield) {
                if (t.shield.ac !== undefined) f(`item ${t.id} shield has the d20 key "ac" (retired 2026-09-19)`);
                if (!t.shield.bonuses) f(`item ${t.id} shield has no bonuses`);
                for (const p of bonusProblems(t.shield.bonuses)) f(`item ${t.id} shield ${p}`);
            }
            if (t.shield && t.armor) f(`item ${t.id} cannot be both armor and shield`);
        }
    }
    {
        const f = check("materials_exist");
        for (const t of items) if (t.material !== undefined && !materialIds.has(t.material)) f(`item ${t.id} material "${t.material}" is not in materials`);
        for (const m of materials) {
            for (const k of ["density", "hardness", "value", "damage", "armor"]) if (typeof m[k] !== "number" || !(m[k] >= 0)) f(`material ${m.id} ${k} must be a number >= 0`);
            if (typeof m.name !== "string" || !m.name) f(`material ${m.id} has no name`);
        }
    }
    {
        const f = check("labors_and_skills");
        for (const l of labors) {
            if (!skills.has(l.skill)) f(`labor ${l.id} skill "${l.skill}" is not in colony.skills`);
            if (!Array.isArray(l.jobs) || !l.jobs.length) f(`labor ${l.id} has no jobs`);
        }
    }
    // objects
    {
        const f = check("object_targets_exist");
        for (const o of objects) {
            for (const a of Object.keys(o.actions || {})) {
                const act = o.actions[a];
                if (act.becomes !== null && act.becomes !== undefined && !objIds.has(act.becomes)) f(`object ${o.id} action ${a} becomes "${act.becomes}" is not an object`);
                for (const id of Object.keys(act.yields || {})) if (!itemIds.has(id)) f(`object ${o.id} action ${a} yields "${id}" is not an item type`);
            }
            if (o.ruin !== undefined && o.ruin !== null && !objIds.has(o.ruin)) f(`object ${o.id} ruin "${o.ruin}" is not an object`);
            if (o.regrow && !objIds.has(o.regrow.to)) f(`object ${o.id} regrow.to "${o.regrow.to}" is not an object`);
            if (o.build) for (const id of Object.keys(o.build.items || {})) if (!itemIds.has(id)) f(`object ${o.id} build item "${id}" is not an item type`);
            if (!o.image && !o.tile && !o.gen) f(`object ${o.id} has no image, tile or gen`);
            if (o.tile && (!o.tile.sheet || !(o.tile.id >= 0 && o.tile.id < 512))) f(`object ${o.id} tile needs a sheet and an id 0-511`);
        }
    }
    {
        const f = check("workshops_one_cell");
        for (const o of objects) {
            if (!Array.isArray(o.tags) || !o.tags.includes("workplace")) continue;
            if (o.tile && ((o.tile.w | 0) > 1 || (o.tile.h | 0) > 1)) f(`workplace ${o.id} must fit one cell (VISION V44)`);
            if (o.passable === true) f(`workplace ${o.id} must not be passable (crafters stand beside it)`);
        }
    }
    // wildlife
    {
        const f = check("wildlife_yields_exist");
        for (const s of species) for (const id of Object.keys(s.yields || {})) if (!itemIds.has(id)) f(`species ${s.id} yields "${id}" is not an item type`);
    }
    // plans
    {
        const f = check("plan_steps");
        const plans = [["colony.plan", (cat.colony && cat.colony.plan) || []]];
        for (const k of Object.keys((cat.colony && cat.colony.plans) || {})) if (k !== "about") plans.push([`colony.plans.${k}`, cat.colony.plans[k]]);
        for (const [name, plan] of plans) {
            if (!Array.isArray(plan)) { f(`${name} is not a list`); continue; }
            const ids = new Set(), cells = new Map();
            for (const s of plan) {
                if (!s.id) { f(`${name}: a step has no id`); continue; }
                if (ids.has(s.id)) f(`${name}: step id "${s.id}" appears twice`);
                ids.add(s.id);
                const kinds = ["build", "craft", "stock", "arm"].filter(k => s[k] !== undefined);
                if (kinds.length !== 1) f(`${name} step ${s.id} must have exactly one of build/craft/stock/arm`);
                if (s.build !== undefined) {
                    if (!objIds.has(s.build)) f(`${name} step ${s.id} builds "${s.build}", not an object`);
                    if (!Array.isArray(s.cells) || !s.cells.length) f(`${name} step ${s.id} has no cells`);
                    else for (const c of s.cells) {
                        if (!Array.isArray(c) || c.length !== 2 || !Number.isInteger(c[0]) || !Number.isInteger(c[1])) { f(`${name} step ${s.id} has a bad cell ${JSON.stringify(c)}`); continue; }
                        const key = `${c[0]},${c[1]}`;
                        if (cells.has(key) && cells.get(key) !== s.id) f(`${name} step ${s.id} cell ${key} is also used by step ${cells.get(key)}`);
                        cells.set(key, s.id);
                    }
                    if (s.stores !== undefined && !(Array.isArray(s.stores) && s.stores.every(tag => itemsWithTag(tag).length))) f(`${name} step ${s.id} stores a tag no item carries`);
                }
                if (s.craft !== undefined) {
                    if (!recipeIds.has(s.craft)) f(`${name} step ${s.id} crafts "${s.craft}", not a recipe`);
                    if (s.each === undefined && !(s.count >= 1)) f(`${name} step ${s.id} needs each or count >= 1`);
                }
                if (s.stock !== undefined) {
                    if (!Array.isArray(s.stock) || !s.stock.length || !s.stock.every(tag => itemsWithTag(tag).length)) f(`${name} step ${s.id} stocks a tag no item carries`);
                    if (!(s.count >= 1)) f(`${name} step ${s.id} needs count >= 1`);
                }
                if (s.arm !== undefined) {
                    if (!Array.isArray(s.arm) || !s.arm.length || !s.arm.every(tag => itemsWithTag(tag).length)) f(`${name} step ${s.id} arms with a tag no item carries`);
                    if (!(s.share > 0 && s.share <= 1)) f(`${name} step ${s.id} share must be in (0, 1]`);
                    if (s.first !== undefined && !(Array.isArray(s.first) && s.first.every(id => laborIds.has(id)))) f(`${name} step ${s.id} first must list labor ids`);
                }
            }
        }
        for (const sp of Object.keys(cat.cultures || {})) {
            const c = cat.cultures[sp];
            if (sp === "about" || !c || typeof c !== "object") continue;
            if (c.plan !== "default" && !(cat.colony && cat.colony.plans && Array.isArray(cat.colony.plans[c.plan]))) f(`culture ${sp} plan "${c.plan}" is not a plans variant`);
        }
    }
    {
        const f = check("culture_chain_weights");
        for (const sp of Object.keys(cat.cultures || {})) {
            const c = cat.cultures[sp];
            if (sp === "about" || !c || typeof c !== "object") continue;
            if (c.chainWeights) for (const k of Object.keys(c.chainWeights)) {
                if (!laborIds.has(k)) f(`culture ${sp} chainWeights "${k}" is not a labor`);
                if (!(c.chainWeights[k] >= 0)) f(`culture ${sp} chainWeights ${k} must be >= 0`);
            }
            if (c.arms) {
                for (const id of c.arms.prefer || []) {
                    const t = items.find(x => x.id === id);
                    if (!t) f(`culture ${sp} arms.prefer "${id}" is not an item type`);
                    else if (!t.weapon && !t.armor && !t.shield) f(`culture ${sp} arms.prefer "${id}" is neither weapon, armor nor shield`);
                }
                if (c.arms.scavenge !== undefined && !(c.arms.scavenge >= 0 && c.arms.scavenge <= 1)) f(`culture ${sp} arms.scavenge must be 0-1`);
            }
        }
    }
    {
        const f = check("combat_rules");
        const c = cat.combat;
        if (!c) f("no combat key");
        else {
            if (JSON.stringify(c.slots) !== JSON.stringify(SLOTS)) f(`combat.slots must be ${JSON.stringify(SLOTS)}`);
            for (const old of ["baseAC", "proficiency", "critical", "abilities"]) if (c[old] !== undefined) f(`combat.${old} is a d20 key (retired 2026-09-19)`);
            if (!(Number.isInteger(c.tickFrames) && c.tickFrames >= 1)) f("combat.tickFrames must be an integer >= 1 (map updates per tick)");
            const st = c.styles || {};
            for (const k of STYLES) if (!st[k] || typeof st[k] !== "object") f(`combat.styles.${k} is missing`);
            if (!c.people || !(c.people.hitpoints >= 1)) f("combat.people must give default levels with hitpoints >= 1");
            const q = c.quality || {};
            for (const k of ["names", "bonus", "value"]) if (!Array.isArray(q[k]) || q[k].length !== 6) f(`combat.quality.${k} must have 6 entries (quality 0-5)`);
            if (c.aliases && (c.aliases.tool !== "weapon" || c.aliases.clothes !== "torso")) f("combat.aliases must map tool -> weapon and clothes -> torso");
        }
    }
    {
        const f = check("creature_combat");
        for (const s of species) {
            const b = s.combat;
            if (!b || typeof b !== "object") { f(`species ${s.id} has no combat block`); continue; }
            for (const k of CREATURE_KEYS) if (b[k] === undefined) f(`species ${s.id} combat.${k} is missing`);
            for (const k of ["attack", "strength", "defence", "ranged", "magic", "hitpoints", "attackSpeed"]) if (b[k] !== undefined && !(Number.isInteger(b[k]) && b[k] >= 1 && b[k] <= 99)) f(`species ${s.id} combat.${k} must be an integer 1-99`);
            if (b.attackType !== undefined && !TYPES.includes(b.attackType)) f(`species ${s.id} combat.attackType "${b.attackType}" is not one of ${TYPES.join("/")}`);
            if (b.maxHitBonus !== undefined && !Number.isFinite(b.maxHitBonus)) f(`species ${s.id} combat.maxHitBonus must be a number`);
            for (const p of bonusProblems(b.bonuses)) f(`species ${s.id} combat ${p}`);
        }
    }
    // text
    {
        const f = check("banned_words");
        const walk = (v, where) => {
            if (typeof v === "string") { for (const b of BANNED_RE) if (b.re.test(v)) f(`${where}: banned word "${b.word}" in ${JSON.stringify(v.length > 60 ? v.slice(0, 57) + "..." : v)}`); }
            else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
            else if (v && typeof v === "object") for (const k of Object.keys(v)) walk(v[k], where ? `${where}.${k}` : k);
        };
        walk(cat, "");
    }
    // files
    if (!opts.noFiles) {
        const f = check("images_exist");
        const seen = new Set();
        const need = (kind, name, who) => {
            const file = kind === "tile" ? path.join(IMG, "tilesets", `${name}.png`) : path.join(IMG, "characters", `${name}.png`);
            const key = `${kind}:${name}`;
            if (seen.has(key)) return;
            seen.add(key);
            if (!fs.existsSync(file)) f(`${who}: ${path.relative(ROOT, file)} does not exist`);
        };
        for (const t of items) if (t.image) need("char", t.image, `item ${t.id}`);
        for (const o of objects) { if (o.image) need("char", o.image, `object ${o.id}`); if (o.tile && o.tile.sheet) need("tile", o.tile.sheet, `object ${o.id}`); }
        for (const s of species) if (s.image) need("char", s.image, `species ${s.id}`);
    }
    return { fails, checks };
}

//---------------------------------------------------------------------------------------------------------------
// Self-test: each mutation must be caught by the named check and by no other.

function selftest(catalogFile) {
    const base = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
    const clean = run(base, { noFiles: true });
    const results = [];
    const expect = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} selftest.${name}: ${detail}`); };
    expect("clean_catalog_passes", clean.fails.length === 0, clean.fails.length ? `the real catalog fails: ${clean.fails.map(x => x.msg).join("; ")}` : `the real catalog passes ${clean.checks.length} checks`);
    const item = id => c.items.types.find(t => t.id === id);
    const obj = id => c.objects.find(o => o.id === id);
    const recipe = id => c.recipes.list.find(r => r.id === id);
    let c;
    const cases = [
        ["unique_ids", () => { c.items.types.push({ ...item("log") }); }],
        ["recipe_items_exist", () => { recipe("stone_knife").inputs.unobtainium = 1; }],
        ["recipe_items_exist", () => { recipe("cook_meat").outputs = { nothing_here: 1 }; }],
        ["recipe_at_is_object_tag", () => { recipe("cook_meat").at = "volcano"; }],
        ["recipe_labor_and_skill", () => { recipe("bar_iron").labor = "wizard"; }],
        ["recipe_labor_and_skill", () => { recipe("bar_iron").skill = "juggling"; }],
        ["recipe_labor_and_skill", () => { recipe("sword_short").material = "mithril"; }],
        ["item_basics", () => { item("bow_short").stack = 0; }],
        ["item_basics", () => { item("bow_short").labor = "nobody"; }],
        ["weapon_blocks", () => { item("bow_short").weapon.speed = 0; }],
        ["weapon_blocks", () => { item("sword_long").weapon.types = ["pierce"]; }],
        ["weapon_blocks", () => { item("sword_long").weapon.styles = []; }],
        ["weapon_blocks", () => { item("club").weapon.damage = "1d4"; }],
        ["weapon_blocks", () => { item("mace").weapon.bonuses.attack.fire = 3; }],
        ["weapon_blocks", () => { item("axe_iron").weapon.bonuses.strength = "lots"; }],
        // the sling: its ammo (stone) has no ammo.for back-reference, so only weapon_blocks may fire
        ["weapon_blocks", () => { item("sling").weapon.ranged.ammo = "pebbles"; }],
        ["weapon_blocks", () => { item("bow_long").weapon.types = ["slash"]; }],
        ["ammo_for_ranged_weapons", () => { item("arrows").ammo.for = ["club"]; }],
        ["armor_slots", () => { item("helmet_iron").armor.slot = "hat"; }],
        ["armor_slots", () => { item("mail_iron").armor.ac = 6; }],
        ["armor_slots", () => { delete item("helmet_leather").armor.bonuses; }],
        ["armor_slots", () => { item("shield_wood").shield.bonuses.defence.stab = "high"; }],
        ["materials_exist", () => { item("axe_iron").material = "adamant"; }],
        ["materials_exist", () => { c.materials.list.find(m => m.id === "iron").damage = "high"; }],
        ["labors_and_skills", () => { c.labors.list.find(l => l.id === "bowyer").skill = "whittling"; }],
        ["object_targets_exist", () => { obj("oak").actions.chop.becomes = "sawdust_pile"; }],
        ["object_targets_exist", () => { obj("campfire").ruin = "ashes"; }],
        ["object_targets_exist", () => { obj("berry_bush_bare").regrow.to = "berry_tree"; }],
        ["object_targets_exist", () => { obj("smithy").build.items.anvil = 1; }],
        ["object_targets_exist", () => { obj("oak").actions.chop.yields = { planks: 2 }; }],
        ["workshops_one_cell", () => { obj("furnace").passable = true; }],
        ["wildlife_yields_exist", () => { c.wildlife.species.find(s => s.id === "fowl").yields.eggs = 2; }],
        ["plan_steps", () => { c.colony.plan.find(s => s.id === "furnace").build = "blast_furnace"; }],
        ["plan_steps", () => { c.colony.plan.find(s => s.id === "blades").craft = "lightsaber"; }],
        ["plan_steps", () => { c.colony.plan.find(s => s.id === "arm").first = ["knight"]; }],
        ["plan_steps", () => { c.colony.plan.find(s => s.id === "food").stock = ["caviar"]; }],
        ["plan_steps", () => { c.colony.plans.stone.find(s => s.id === "smithy").cells = [[3, -1]]; }],
        ["plan_steps", () => { c.cultures.elf.plan = "jungle"; }],
        ["culture_chain_weights", () => { c.cultures.dwarf.chainWeights.alchemist = 2; }],
        ["culture_chain_weights", () => { c.cultures.orc.arms.prefer.push("berries"); }],
        ["combat_rules", () => { c.combat.slots = ["head", "weapon", "torso"]; }],
        ["combat_rules", () => { c.combat.quality.bonus = [1, 1, 1]; }],
        ["combat_rules", () => { c.combat.baseAC = 10; }],
        ["combat_rules", () => { delete c.combat.styles.rapid; }],
        ["creature_combat", () => { delete c.wildlife.species.find(s => s.id === "wolf").combat; }],
        ["creature_combat", () => { c.wildlife.species.find(s => s.id === "troll").combat.attackType = "club"; }],
        ["creature_combat", () => { c.wildlife.species.find(s => s.id === "hare").combat.hitpoints = 0; }],
        ["banned_words", () => { item("sword_short").name = "Sword of Britannia"; }],
        ["banned_words", () => { obj("furnace").name = "Dwarf Fortress furnace"; }],
        ["banned_words", () => { c.colony.plans.about = "As seen in Ultima"; }]
    ];
    const counts = {};
    for (const [check, mutate] of cases) {
        c = JSON.parse(JSON.stringify(base));
        let err = null;
        try { mutate(); } catch (e) { err = e; }
        counts[check] = (counts[check] || 0) + 1;
        const name = `${check}_${counts[check]}`;
        if (err) { expect(name, false, `the mutation itself threw: ${err.message}`); continue; }
        const r = run(c, { noFiles: true });
        const caughtBy = [...new Set(r.fails.map(x => x.check))];
        const ok = caughtBy.length >= 1 && caughtBy.includes(check) && caughtBy.every(x => x === check);
        expect(name, ok, ok ? `caught by ${check}: ${r.fails[0].msg}` : `expected only ${check} to fail, got [${caughtBy.join(", ")}]${r.fails.length ? `: ${r.fails.map(x => x.msg).join("; ")}` : ""}`);
    }
    // a missing image is caught by images_exist (files on)
    {
        c = JSON.parse(JSON.stringify(base));
        item("log").image = "!$U7_Item_DoesNotExist";
        const r = run(c, {});
        const ok = r.fails.length === 1 && r.fails[0].check === "images_exist";
        expect("images_exist_1", ok, ok ? `caught: ${r.fails[0].msg}` : `expected only images_exist to fail, got ${JSON.stringify(r.fails)}`);
    }
    // every check has at least one self-test case
    {
        const covered = new Set(cases.map(x => x[0]).concat(["images_exist"]));
        const missing = clean.checks.filter(x => !covered.has(x));
        expect("every_check_has_a_case", missing.length === 0, missing.length ? `no self-test for: ${missing.join(", ")}` : `all ${clean.checks.length} checks have a case`);
    }
    const failed = results.filter(r => !r.ok).length;
    console.log(`RESULT ${failed ? "FAIL" : "PASS"} ${results.length - failed}/${results.length} selftests (check_catalog)`);
    process.exit(failed ? 1 : 0);
}

//---------------------------------------------------------------------------------------------------------------

function main() {
    const argv = process.argv.slice(2);
    const fileIdx = argv.indexOf("--file");
    const file = fileIdx >= 0 ? path.resolve(argv[fileIdx + 1]) : DEFAULT_CATALOG;
    if (argv.includes("--selftest")) return selftest(file);
    let cat;
    try { cat = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.log(`FAIL parse: ${file}: ${e.message}`); console.log("RESULT FAIL 0 checks"); process.exit(1); }
    const r = run(cat, {});
    for (const x of r.fails) console.log(`FAIL ${x.check}: ${x.msg}`);
    const failedChecks = new Set(r.fails.map(x => x.check));
    if (!argv.includes("--quiet")) for (const name of r.checks) if (!failedChecks.has(name)) console.log(`PASS ${name}`);
    console.log(`RESULT ${r.fails.length ? "FAIL" : "PASS"} ${r.checks.length} checks (${r.fails.length} problems, ${failedChecks.size} checks failing) on ${path.relative(ROOT, file)}`);
    process.exit(r.fails.length ? 1 : 0);
}

main();
