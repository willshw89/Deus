//=============================================================================
// DEUS_Look.js - A cursor tooltip: what is under the mouse, the land it stands on, the art it uses
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Look] Cursor inspection tooltip: cell terrain, biome properties, occupants, objects, and asset provenance.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_Camera
 * @orderAfter DEUS_Stance
 * @orderAfter DEUS_Jobs
 *
 * @help
 * A compact text tooltip (up to three short lines, 13 px font) follows the
 * mouse over the map, 14 px right and below the pointer and flipped to the
 * other side at the screen edges (user decision 2026-09-18: a tooltip next
 * to the cursor, not a box in a corner). It is hidden when the mouse is
 * over a UI window or off the map.
 *
 *   line 1  what is there, the first of: a unit (name · stance · job for
 *           colonists, name · stance otherwise), the items (3 × Log), the
 *           object (Oak — chop), the site (UF.History.describeSite), or
 *           nothing
 *   line 2  Biome · Savagery, Alignment · ground kind (· water: kind)
 *   line 3  the art: <file> — <status> (<request id>) from UF.Assets
 *
 * UF.Assets reads data/UF_AssetIndex.json (written by
 * tools/generate_asset_inventory.js) when that file exists, and otherwise
 * falls back to name rules: U7_ = "U7 stand-in", UF_Gen = "code-drawn
 * placeholder", a stock RPG Maker name = "stock RMMZ", else "original".
 *
 * UF.Look.describeCell(x, y) returns the three lines (tests, UF_Interact).
 * UF.Look.show(x, y, seconds) pins the lines of a cell for a while (the
 * context menu's "Look").
 *
 * API, state, events and checks: docs/systems/UF_Look.md
 * Architecture: docs/design/WORLD_ARCHITECTURE.md section 5.10
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const FONT_SIZE = 13;
    const LINE_H = 16;
    const PAD_X = 7, PAD_Y = 5;
    const OFFSET = 14;            // px right of and below the mouse (contract 5.10)
    const MAX_WIDTH = 440;        // px; longer lines are squeezed by Bitmap.drawText
    const REFRESH_FRAMES = 20;    // re-read the cell this often while the mouse stays (units walk, jobs change)
    const PIN_FRAMES_PER_S = 60;
    const INDEX_VAR = "$ufAssetIndex";
    const INDEX_FILE = "UF_AssetIndex.json";
    const COLORS = ["#f8fafc", "#cbd5e1", "#7dd3fc"]; // line 1 white, line 2 grey, line 3 sky

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const lower = s => String(s || "").toLowerCase();
    const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

    //-------------------------------------------------------------------------
    // UF.Assets: the status of an image or tile (index file, else name rules)

    // The default RPG Maker MZ project assets (img/characters, img/tilesets, img/system) by file name.
    const STOCK = new Set([
        "Actor1", "Actor2", "Actor3", "Damage1", "Damage2", "Damage3", "Evil", "Monster", "Nature", "People1", "People2", "People3", "People4", "Vehicle",
        "!Chest", "!Crystal", "!Door1", "!Door2", "!Flame", "!Other1", "!Other2", "!Switch1", "!Switch2", "!Weapon", "!$Gate1", "!$Gate2", "$BigMonster1", "$BigMonster2",
        "SF_Actor1", "SF_Actor2", "SF_Actor3", "SF_Damage1", "SF_Damage2", "SF_Monster", "SF_People1", "SF_People2", "SF_People3", "SF_Vehicle",
        "!SF_Chest", "!SF_Door1", "!SF_Door2", "!SF_Switch1", "!$SF_Gate1", "!$SF_Gate2", "!$SF_Gate3",
        "Dungeon_A1", "Dungeon_A2", "Dungeon_A4", "Dungeon_A5", "Dungeon_B", "Dungeon_C",
        "Inside_A1", "Inside_A2", "Inside_A4", "Inside_A5", "Inside_B", "Inside_C",
        "Outside_A1", "Outside_A2", "Outside_A3", "Outside_A4", "Outside_A5", "Outside_B", "Outside_C",
        "World_A1", "World_A2", "World_B", "World_C",
        "SF_Inside_A4", "SF_Inside_B", "SF_Inside_C", "SF_Outside_A3", "SF_Outside_A4", "SF_Outside_A5", "SF_Outside_B", "SF_Outside_C",
        "Balloon", "ButtonSet", "GameOver", "IconSet", "Shadow1", "Shadow2", "Splash", "States", "Weapons1", "Weapons2", "Weapons3", "Window"
    ]);
    const STATUS = { standin: "U7 stand-in", generated: "code-drawn placeholder", stock: "stock RMMZ", original: "original" };

    let indexOverride;   // undefined = use the loaded file; null or an object = what the tests set
    let indexLoading = false;

    // The index is a database file only when it exists: DataManager never finishes loading when a listed file is missing.
    function loadIndexIfPresent() {
        try {
            if (typeof require !== "function") return false;
            const fs = require("fs"), path = require("path");
            const base = (typeof nw !== "undefined" && nw.__dirname) || process.cwd();
            if (!fs.existsSync(path.join(base, "data", INDEX_FILE))) return false;
            if (!DataManager._databaseFiles.some(f => f.name === INDEX_VAR)) DataManager._databaseFiles.push({ name: INDEX_VAR, src: INDEX_FILE });
            indexLoading = true;
            return true;
        } catch (e) {
            return false;
        }
    }
    if (!DataManager.isBattleTest() && !DataManager.isEventTest()) loadIndexIfPresent();

    function statusByName(name) {
        const n = String(name || "");
        const bare = n.replace(/^[!$]+/, "");
        if (/^U7_/.test(bare)) return STATUS.standin;
        if (/^UF_Gen/.test(bare)) return STATUS.generated;
        return STOCK.has(n) || STOCK.has(bare) ? STATUS.stock : STATUS.original;
    }
    function indexEntry(idx, name) {
        if (!idx || !name) return null;
        const keys = [name, `${name}.png`, `img/characters/${name}.png`, `img/tilesets/${name}.png`, `img/system/${name}.png`, `img/characters/${name}`, `img/tilesets/${name}`];
        if (name.includes("#")) {
            const [sheet, id] = name.split("#");
            keys.push(`img/tilesets/${sheet}.png#${id}`, `${sheet}.png#${id}`);
        }
        for (const k of keys) if (Object.prototype.hasOwnProperty.call(idx, k) && idx[k] && typeof idx[k] === "object") return idx[k];
        return null;
    }

    const Assets = {
        STATUS,
        stockNames: () => Array.from(STOCK),
        /** The loaded data/UF_AssetIndex.json (or what setIndex gave), else null. */
        index: () => (indexOverride !== undefined ? indexOverride : (window[INDEX_VAR] && typeof window[INDEX_VAR] === "object" ? window[INDEX_VAR] : null)),
        /** Replace the index (tests): an object, null for "no index", undefined to go back to the file. */
        setIndex(obj) {
            indexOverride = obj;
        },
        indexFileListed: () => indexLoading,
        /** Status of a name by the name rules alone (no index). */
        statusByName,
        isStockName: name => STOCK.has(String(name || "")) || STOCK.has(String(name || "").replace(/^[!$]+/, "")),
        /** { file, status, request, text } for an image name, "Sheet#id" or { sheet, id }; null for nothing. */
        describe(ref) {
            let name = "";
            if (typeof ref === "string") name = ref;
            else if (ref && ref.sheet) name = `${ref.sheet}#${ref.id | 0}`;
            else if (ref && ref.image) name = String(ref.image);
            if (!name) return null;
            const sheet = name.includes("#") ? name.split("#")[0] : name;
            const idx = Assets.index();
            const entry = indexEntry(idx, name) || (sheet !== name ? indexEntry(idx, sheet) : null);
            const status = entry && entry.status ? String(entry.status) : statusByName(sheet);
            const request = entry && entry.request ? String(entry.request) : "none yet";
            return { file: name, status, request, fromIndex: !!entry, text: `${name} — ${status} (${request})` };
        }
    };

    //-------------------------------------------------------------------------
    // Reading a cell

    const onMap = (x, y) => !!window.$gameMap && !!window.$dataMap && $gameMap.isValid(x, y);
    const isColonistUnit = u => !!u && !!u.data && (u.data.kind === "colonist" || (window.UF.Colonists && typeof UF.Colonists.isColonist === "function" && UF.Colonists.isColonist(u)));

    // The Overseer's adapter for a character (pre-Colonists: the start pair's events; later: the colonist units).
    function overseerAdapterOf(ev, unit) {
        const cm = window.$colonyManager;
        if (!cm || !Array.isArray(cm.colonists)) return null;
        return cm.colonists.find(c => (ev && c.event === ev) || (unit && c.id === unit.id)) || null;
    }

    /** The unit on a cell of the map on screen: { unit, event, colonist, creature, name, image, adapter } or null. */
    function unitAt(x, y) {
        if (!onMap(x, y)) return null;
        const W = World();
        for (const ev of $gameMap.eventsXy(x, y)) {
            if (ev.isTransparent()) continue;
            const u = W && W.unitOfEvent ? W.unitOfEvent(ev) : null;
            if (u) {
                return {
                    unit: u, event: ev, name: u.name, image: u.image.characterName,
                    colonist: isColonistUnit(u), creature: !!u.data && u.data.kind === "creature", person: !!u.data && u.data.kind === "person",
                    adapter: overseerAdapterOf(ev, u)
                };
            }
            const data = ev.event ? ev.event() : null;
            if (data && typeof data.note === "string" && data.note.includes("<colonist")) {
                return { unit: null, event: ev, name: data.name, image: ev.characterName(), colonist: true, creature: false, person: false, adapter: overseerAdapterOf(ev, null) };
            }
        }
        return null;
    }

    function jobTextOf(hit) {
        const J = window.UF.Jobs;
        if (hit.unit && J && typeof J.of === "function") {
            const job = J.of(hit.unit.id);
            return job ? J.describe(job) : "Idle";
        }
        if (hit.adapter && hit.adapter.currentJob) return String(hit.adapter.currentJob);
        return "Idle";
    }

    function imageOfType(type) {
        if (!type) return "";
        if (type.image) return type.image;
        if (type.tile && type.tile.sheet) return `${type.tile.sheet}#${type.tile.id | 0}`;
        if (type.gen) return `UF_Gen${cap(type.gen)}`;
        return "";
    }

    const WILDLIFE_BEAST_FACES = {
        deer: 0, stag: 0, wild_horse: 0, wild_sheep: 0,
        boar: 1,
        wolf: 2,
        fox: 3, jackal: 3, arctic_fox: 3,
        bear: 4,
        hare: 5, rabbit: 5,
        hawk: 6, fowl: 6, falcon: 6, songbird: 6,
        wildcat: 7, lynx: 7
    };

    const WILDLIFE_MONSTER_FACES = {
        troll: 0,
        bog_horror: 1,
        giant_spider: 2, spider: 2,
        sand_stalker: 3, serpent: 3,
        bat: 4, rat: 4,
        restless_dead: 5, skeleton: 5, zombie: 5, ghost: 5,
        ice_wraith: 6, wraith: 6,
        aurochs: 7
    };

    const TREE_FLORA_FACES = {
        oak: 0, tree_savanna: 0, bush: 0, desert_shrub: 0, snow_bush: 0, sapling: 0,
        birch: 1,
        pine: 2, fir_snow: 2, fir: 2,
        fruit_tree: 3, fruit_tree_bare: 3, berry_bush: 3, berry_bush_bare: 3,
        palm: 4, tree_tropical: 4, cactus: 4, cactus_tall: 4,
        tree_swamp: 5, mangrove: 5, willow: 5, reeds: 5, lily_pad: 5, fern: 5,
        dead_tree: 6, tree_cursed: 6, stump: 6,
        tower_cap: 7, glow_caps: 7, cave_mushrooms: 7, cave_moss: 7, spore_reeds: 7
    };

    function faceOfSubject(subject) {
        if (!subject) return null;
        if (subject.kind === "unit" && subject.hit) {
            const hit = subject.hit;
            if (hit.unit && hit.unit.data && hit.unit.data.face && hit.unit.data.face.sheet) {
                return { sheet: hit.unit.data.face.sheet, index: hit.unit.data.face.index | 0 };
            }
            const F = window.UF && UF.Factions;
            if (hit.unit && F && typeof F.cultureFace === "function") {
                const cf = F.cultureFace(hit.unit);
                if (cf && cf.sheet) return { sheet: cf.sheet, index: cf.index | 0 };
            }
            const spId = (hit.unit && hit.unit.data && hit.unit.data.species) || lower(hit.name);
            if (spId) {
                if (Object.prototype.hasOwnProperty.call(WILDLIFE_BEAST_FACES, spId)) {
                    return { sheet: "UF_Faces_Wildlife_Beasts", index: WILDLIFE_BEAST_FACES[spId] };
                }
                if (Object.prototype.hasOwnProperty.call(WILDLIFE_MONSTER_FACES, spId)) {
                    return { sheet: "UF_Faces_Wildlife_Monsters", index: WILDLIFE_MONSTER_FACES[spId] };
                }
            }
            if (hit.colonist || hit.person) {
                const culture = (hit.unit && hit.unit.data && (hit.unit.data.culture || hit.unit.data.species)) || "human";
                return { sheet: `UF_Faces_${culture}_1`, index: 0 };
            }
        }
        if (subject.kind === "object" && subject.object) {
            const objId = subject.object.id || lower(subject.object.name);
            if (objId && Object.prototype.hasOwnProperty.call(TREE_FLORA_FACES, objId)) {
                return { sheet: "UF_Faces_Trees_Nature", index: TREE_FLORA_FACES[objId] };
            }
        }
        return null;
    }

    /** Line 1: { kind: "unit"|"items"|"object"|"site", text, file, ... } or null. */
    function subjectAt(x, y) {
        const hit = unitAt(x, y);
        if (hit) {
            const S = window.UF.Stance;
            const stance = S && typeof S.describe === "function" ? S.describe(hit.unit || hit.event) : "";
            const parts = [hit.name, stance];
            if (hit.colonist) parts.push(jobTextOf(hit));
            const Env = window.UF && UF.Environment;
            const cond = Env && typeof Env.conditionLabel === "function" ? Env.conditionLabel(hit.unit) : "";
            if (cond) parts.push(`[${cond}]`);
            return { kind: "unit", text: parts.filter(Boolean).join(" · "), file: hit.image, hit };
        }
        const O = window.UF.Objects;
        const type = O && typeof O.at === "function" ? O.at(x, y) : null;
        const isStructure = type && (type.door || (Array.isArray(type.tags) && (type.tags.includes("door") || type.tags.includes("building") || type.tags.includes("wall"))) || type.autotile === "wall");
        if (isStructure) {
            const D = window.UF && UF.Doors;
            const open = D && typeof D.isOpen === "function" && D.isOpen(x, y);
            let stateStr = type.door ? (open ? " (open)" : " (closed)") : "";
            let actions = Object.keys(type.actions || {});
            if (type.door && !actions.length) actions = [open ? "close" : "open"];
            if (!actions.length && (type.build || type.ruin)) actions = ["dismantle"];
            const desc = actions.length ? `${type.name}${stateStr} — ${actions.join(", ")}` : `${type.name}${stateStr}`;
            return { kind: "object", text: desc, file: imageOfType(type), object: type };
        }
        const I = window.UF.Items;
        const items = I && typeof I.describe === "function" ? I.describe(x, y) : null;
        if (items && items.items && items.items.length) {
            const first = I.type(items.items[0].type);
            return { kind: "items", text: items.text, file: first ? first.image : "", items: items.items };
        }
        if (type) {
            let actions = Object.keys(type.actions || {});
            if (!actions.length && (type.build || type.ruin)) actions = ["dismantle"];
            return { kind: "object", text: actions.length ? `${type.name} — ${actions.join(", ")}` : type.name, file: imageOfType(type), object: type };
        }
        const H = window.UF.History;
        const W = World();
        const onGround = !!W && !!W.currentArea(); // sites are on the ground (VISION V80: another level on screen shows none)
        const site = onGround && H && typeof H.describeSite === "function" ? H.describeSite(x, y) : null;
        if (site) return { kind: "site", text: site, file: "" };
        return null;
    }

    function tierName(group, id) {
        const cat = catalog();
        const list = (cat && cat.regions && cat.regions[group]) || [];
        const t = list.find(e => e.id === id);
        return t ? t.name : cap(id);
    }
    function groundName(id) {
        const cat = catalog();
        const k = ((cat && cat.groundKinds) || []).find(g => g.id === id);
        return k ? k.name : cap(String(id || "").replace(/_/g, " "));
    }
    function biomeName(info) {
        if (!info) return "";
        if (info.biome && info.biome.name) return info.biome.name;
        const cat = catalog();
        const b = cat && cat.biomes && cat.biomes[info.biomeId];
        return b && b.name ? b.name : cap(String(info.biomeId || "").replace(/_/g, " "));
    }

    /** Line 2: { text, biome, biomeId, region, ground, water, file } for a cell of the map on screen. */
    function cellAt(x, y) {
        if (!onMap(x, y)) return null;
        const W = World(), G = window.UF.WorldGen, T = window.UF.Tiles;
        // Another level on screen (VISION V80): UF_Levels says what the cell is ("-1 · Cave floor", "+1 · Open air").
        const view = W && W.viewLevel ? W.viewLevel() : null;
        if (view && view.z !== 0) {
            const L = window.UF.Levels;
            const ref = { area: { x: view.x, y: view.y }, x, y, z: view.z };
            const text = L && typeof L.describeCell === "function" ? L.describeCell(ref) : `Level ${view.z}`;
            const file = L && typeof L.cellArt === "function" ? L.cellArt(ref) : "";
            return { text, biome: "", biomeId: null, region: null, ground: null, water: null, file, level: view.z };
        }
        const area = W ? W.currentArea() : null;
        let info = null;
        if (area && G && typeof G.cellInfoLocal === "function") {
            try { info = G.cellInfoLocal(area.x, area.y, x, y); } catch (e) { info = null; }
        }
        const tileId = $gameMap.tileId(x, y, 0);
        const kind = T && typeof T.kindOfTile === "function" ? T.kindOfTile(tileId) : null;
        const water = Tilemap.isTileA1(tileId);
        const waterKey = water ? ((T && typeof T.waterKindOfTile === "function" && T.waterKindOfTile(tileId)) || (info && info.water) || "water") : null;
        const groundId = kind ? kind.id : (info ? info.ground : null);
        const names = $gameMap.tileset() ? $gameMap.tileset().tilesetNames : [];
        const region = info && info.region ? { savagery: info.region.savagery, alignment: info.region.alignment } : null;
        const parts = [];
        if (info) parts.push(biomeName(info));
        if (region) parts.push(`${tierName("savagery", region.savagery)}, ${tierName("alignment", region.alignment)}`);
        if (groundId) parts.push(kind ? kind.name : groundName(groundId));
        if (water) parts.push(`water: ${waterKey}`);
        const Env = window.UF && UF.Environment;
        if (Env && typeof Env.ambientTemperature === "function") {
            const temp = Env.ambientTemperature(area, x, y, 0);
            const w = typeof Env.weather === "function" ? Env.weather(area) : "";
            parts.push(`${temp}°C${w ? ` (${cap(w)})` : ""}`);
        }
        return {
            text: parts.join(" · "), biome: info ? biomeName(info) : "", biomeId: info ? info.biomeId : null, region, ground: groundId, water: waterKey,
            file: water ? (names[0] || "") : (kind ? (names[1] || "") : "")
        };
    }

    /** The single clean name of whatever is at (x, y) on the map: "Oak", "Verelle", "Hare", "Fresh water", "Meadow", etc. */
    function nameAt(x, y) {
        if (!onMap(x, y)) return "";
        const F = window.UF.Fog;
        if (F && typeof F.isExplored === "function" && !F.isExplored(x, y)) return "Unexplored";
        const hit = unitAt(x, y);
        if (hit) return hit.name || "Unit";
        const I = window.UF.Items;
        const items = I && typeof I.describe === "function" ? I.describe(x, y) : null;
        if (items && items.items && items.items.length) {
            const first = I.type ? I.type(items.items[0].type) : null;
            if (items.items.length === 1 && first) return first.name;
            return `${items.items.length} items`;
        }
        const O = window.UF.Objects;
        const type = O && typeof O.at === "function" ? O.at(x, y) : null;
        if (type) return type.name;
        const H = window.UF.History;
        const W = World();
        const onGround = !!W && !!W.currentArea();
        const site = onGround && H && typeof H.describeSite === "function" ? H.describeSite(x, y) : null;
        if (site) return site;
        const c = cellAt(x, y);
        if (c) {
            if (c.water) return c.water === "water" ? "Water" : `${cap(c.water.replace(/_/g, " "))} water`;
            if (c.ground) return groundName(c.ground);
            if (c.biome) return c.biome;
        }
        return "";
    }

    /** Everything the tooltip shows for a cell: { x, y, lines: [l1, l2, l3], subject, cell, art, face, unexplored } or null off the map. */
    function inspect(x, y) {
        if (!onMap(x, y)) return null;
        const F = window.UF.Fog;
        if (F && typeof F.isExplored === "function" && !F.isExplored(x, y)) return { x, y, lines: ["Unexplored", "", ""], subject: null, cell: null, art: null, face: null, unexplored: true };
        const subject = subjectAt(x, y);
        const cell = cellAt(x, y);
        const file = (subject && subject.file) || (cell && cell.file) || "";
        const art = file ? Assets.describe(file) : null;
        const face = faceOfSubject(subject);
        return { x, y, lines: [subject ? subject.text : "", cell ? cell.text : "", art ? art.text : ""], subject, cell, art, face, unexplored: false };
    }

    //-------------------------------------------------------------------------
    // The tooltip sprite (a child of the scene, above the window layer)

    class Sprite_UFLookTip extends Sprite {
        constructor() {
            super();
            this.bitmap = new Bitmap(8, 8);
            this.visible = false;
            this._text = "";
            this._lines = [];
            this._cell = { x: NaN, y: NaN };
            this._age = REFRESH_FRAMES;
            this._pin = null;
            this._shownAt = { x: 0, y: 0 };
        }

        update() {
            super.update();
            this._age++;
            const scene = SceneManager._scene;
            const W = World();
            if (!Look.enabled || !(scene instanceof Scene_Map) || !window.$gameMap || !W || !(W.viewLevel ? W.viewLevel() : W.currentArea())) return this.hideTip();
            if (this._pin) {
                if (--this._pin.frames <= 0) {
                    this._pin = null;
                    this._age = REFRESH_FRAMES; // re-read the cell under the mouse at once
                } else {
                    this.setTip(this._pin.lines);
                    this.place(this._pin.sx, this._pin.sy);
                    this.visible = this._lines.length > 0;
                    return;
                }
            }
            if (Look.isOverUI()) return this.hideTip();
            const cell = Look.cellUnderMouse();
            if (!cell) return this.hideTip();
            if (!this._cell || cell.x !== this._cell.x || cell.y !== this._cell.y || this._age >= REFRESH_FRAMES) {
                this._cell = cell;
                this._age = 0;
                const name = nameAt(cell.x, cell.y);
                this.setTip(name ? [name] : []);
            }
            if (!this._lines.length) return this.hideTip();
            this.place(TouchInput.x, TouchInput.y);
            this.visible = true;
        }

        hideTip() {
            this.visible = false;
        }

        pin(lines, sx, sy, frames) {
            this._pin = { lines: (lines || []).slice(), sx, sy, frames: Math.max(1, frames | 0) };
        }

        setLines(lines) {
            this.setTip(lines);
        }

        setTip(lines) {
            const shown = (lines || []).filter(l => typeof l === "string" && l.length);
            let name = "";
            if (shown.length > 0) {
                name = shown[0].split(" — ")[0].split(" · ")[0].trim();
            }
            const displayLines = name ? [name] : [];
            const text = displayLines.join("\n");
            if (text === this._text) return;
            this._text = text;
            this._lines = displayLines;
            this.redraw();
        }

        redraw() {
            const lines = this._lines;
            if (!lines.length) return;
            const probe = this.bitmap || new Bitmap(8, 8);
            probe.fontSize = FONT_SIZE;
            let widest = 0;
            for (const l of lines) widest = Math.max(widest, probe.measureTextWidth(l));

            const textW = Math.min(MAX_WIDTH, Math.ceil(widest));
            const w = textW + PAD_X * 2;
            const textH = lines.length * LINE_H;
            const h = textH + PAD_Y * 2;

            const b = new Bitmap(w, h);
            b.fillRect(0, 0, w, h, "rgba(12, 14, 18, 0.90)");
            b.fillRect(0, 0, w, 1, "rgba(255, 255, 255, 0.20)");
            b.fillRect(0, h - 1, w, 1, "rgba(255, 255, 255, 0.20)");
            b.fillRect(0, 0, 1, h, "rgba(255, 255, 255, 0.20)");
            b.fillRect(w - 1, 0, 1, h, "rgba(255, 255, 255, 0.20)");

            b.fontSize = FONT_SIZE;
            b.outlineWidth = 2;
            b.outlineColor = "rgba(0, 0, 0, 0.8)";
            b.textColor = "#ffffff";
            lines.forEach((l, i) => {
                b.drawText(l, PAD_X, PAD_Y + i * LINE_H, textW, LINE_H, "left");
            });
            const old = this.bitmap;
            this.bitmap = b;
            if (old && old !== b) old.destroy();
        }

        // 14 px right of and below the point; flipped to the other side when that would leave the screen.
        place(mx, my) {
            const w = this.bitmap ? this.bitmap.width : 0, h = this.bitmap ? this.bitmap.height : 0;
            let x = mx + OFFSET, y = my + OFFSET;
            if (x + w > Graphics.width) x = mx - OFFSET - w;
            if (y + h > Graphics.height) y = my - OFFSET - h;
            this.x = Math.max(0, Math.round(x));
            this.y = Math.max(0, Math.round(y));
            this._shownAt = { x: mx, y: my };
        }
    }

    const tip = () => {
        const s = SceneManager._scene;
        return s && s._ufLookTip ? s._ufLookTip : null;
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this._ufLookTip = new Sprite_UFLookTip();
        this.addChild(this._ufLookTip); // after the window layer, so it draws over every window
    };

    //-------------------------------------------------------------------------
    // The public object

    const Look = {
        enabled: true,
        FONT_SIZE, OFFSET, REFRESH_FRAMES,
        TipSprite: Sprite_UFLookTip,
        /** The three lines for a cell of the map on screen: [what, land, art] (strings, "" when empty); null off the map. */
        describeCell: (x, y) => {
            const i = inspect(x, y);
            return i ? i.lines.slice() : null;
        },
        inspect,
        subjectAt,
        cellAt,
        unitAt,
        /** The map cell under the mouse, or null when the pointer is off the map. */
        cellUnderMouse() {
            if (!window.$gameMap || !window.$dataMap) return null;
            const x = $gameMap.canvasToMapX(TouchInput.x), y = $gameMap.canvasToMapY(TouchInput.y);
            return $gameMap.isValid(x, y) ? { x, y } : null;
        },
        /** True when the mouse is over a visible, open window of the scene's window layer. */
        isOverUI() {
            const scene = SceneManager._scene;
            const layer = scene && scene._windowLayer;
            if (!layer) return false;
            const mx = TouchInput.x - layer.x, my = TouchInput.y - layer.y;
            for (const w of layer.children) {
                if (!w || !w.visible || w.width <= 0 || w.height <= 0) continue;
                if (typeof w.isOpen === "function" && !w.isOpen()) continue;
                if (mx >= w.x && my >= w.y && mx < w.x + w.width && my < w.y + w.height) return true;
            }
            return false;
        },
        /** Pin a cell's lines next to that cell for `seconds` (the context menu's "Look"). Extra lines replace the cell's when given. */
        show(x, y, seconds = 3, lines) {
            const s = tip();
            if (!s || !onMap(x, y)) return false;
            const i = inspect(x, y);
            const text = lines || (i ? i.lines : []) || [];
            const face = lines ? null : (i ? i.face : null);
            const z = window.UF.Camera ? UF.Camera.zoom() : 1;
            const sx = Math.round(($gameMap.adjustX(x) + 1) * $gameMap.tileWidth() * z);
            const sy = Math.round(($gameMap.adjustY(y) + 0.5) * $gameMap.tileHeight() * z);
            s.pin(text, sx, sy, Math.round(seconds * PIN_FRAMES_PER_S), face);
            s.update();
            emit("look:shown", x, y, text);
            return true;
        },
        hide() {
            const s = tip();
            if (s) {
                s._pin = null;
                s.hideTip();
            }
        },
        sprite: tip,
        /** The text now drawn in the tooltip (lines joined by newlines), "" when hidden or empty. */
        text: () => (tip() && tip().visible ? tip()._text : ""),
        lines: () => (tip() ? tip()._lines.slice() : []),
        face: () => (tip() && tip().visible ? tip()._face : null),
        faceAt: (x, y) => {
            const i = inspect(x, y);
            return i ? i.face : null;
        },
        isPinned: () => !!(tip() && tip()._pin),
        /** Screen position the tooltip was last placed for ({ x, y } of the mouse or the pinned cell). */
        anchor: () => (tip() ? Object.assign({}, tip()._shownAt) : null)
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Look = Look;
    window.UF.Assets = Assets;

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "look"). UF_Interact, when installed, registers the combined suite and calls runChecks.

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active && !window.UF.Interact) {
            UF.Test.suite("look", async t => {
                const fx = await Look.runChecks(t);
                if (fx) Look.cleanup(fx);
                await t.waitFrames(5);
                t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during look checks");
            });
        }
    };

    /** Undo what runChecks placed: test units, items, objects, tiles; zoom and view back to the start. */
    Look.cleanup = function(fx) {
        const W = World(), O = window.UF.Objects, I = window.UF.Items;
        if (!fx || !W || !W.state) return;
        for (const u of fx.units) if (W.unit(u.id)) W.removeUnit(u.id);
        if (I) for (const id of Object.keys(I.state().byId)) if (!fx.itemsBefore.has(id)) I.remove(Number(id));
        if (O) for (const p of fx.placed.slice().reverse()) O.set(p.x, p.y, p.was);
        for (const tl of fx.tiles) W.setTile(fx.area.x, fx.area.y, tl.x, tl.y, 0, tl.was);
        for (const k of Object.keys(fx.mouseLock || {})) TouchInput[k] = fx.mouseLock[k];
        Assets.setIndex(undefined);
        Look.hide();
        if (window.UF.Camera) UF.Camera.setLevel(1);
        $gamePlayer.locate(fx.mid, fx.mid);
        TouchInput._x = 0;
        TouchInput._y = 0;
    };

    /** The look checks. Returns the test fixtures it placed so the caller (UF_Interact's suite) can reuse and clean them up. */
    Look.runChecks = async function(t) {
        await t.waitUntil(() => !!(World() && World().currentArea && World().currentArea()), 10000, "world area").catch(() => {});
        const W = World(), O = window.UF.Objects, I = window.UF.Items, T = window.UF.Tiles;
        const area = W && W.currentArea();
        t.check("look_ready", !!area && !!O && !!I && !!T && !!tip(), area ? `area (${area.x},${area.y}); Objects ${!!O}, Items ${!!I}, Tiles ${!!T}, tooltip sprite ${!!tip()}` : "not on an area map");
        const mid = Math.floor(W.state.size / 2);
        const fx = {
            area, mid, placed: [], units: [], tiles: [], itemsBefore: new Set(Object.keys(I.state().byId)),
            arena: { x0: mid - 10, y0: mid + 16, x1: mid + 10, y1: mid + 27 },
            mouseLock: {}
        };

        // The checks drive the mouse through TouchInput._x/_y. The real pointer must not overwrite them mid-check
        // (the document listeners are bound, so the handlers they call are replaced instead; restored by cleanup).
        for (const k of ["_onHover", "_onMove", "_onTrigger", "_onCancel", "_onRelease"]) {
            fx.mouseLock[k] = TouchInput[k];
            TouchInput[k] = () => {};
        }
        const put = (x, y, id) => {
            fx.placed.push({ x, y, was: O.typeIdAt(x, y) });
            return O.set(x, y, id);
        };
        // An arena south of the home site, cleared of generated objects (restored by the caller's cleanup), close up.
        for (let y = fx.arena.y0; y <= fx.arena.y1; y++) for (let x = fx.arena.x0; x <= fx.arena.x1; x++) if (O.typeIdAt(x, y)) put(x, y, null);
        if (window.UF.Camera) UF.Camera.setLevel(0);
        $gamePlayer.locate(mid, mid + 21);
        await t.waitFrames(3);

        const cells = { oak: { x: mid - 3, y: mid + 19 }, water: { x: mid + 4, y: mid + 19 }, unit: { x: mid + 1, y: mid + 22 }, bare: { x: mid - 1, y: mid + 24 } };
        put(cells.oak.x, cells.oak.y, "oak");
        const cat = catalog();
        const freshBase = (cat && cat.water && cat.water.surface && cat.water.surface.fresh) || 2048;
        fx.tiles.push({ x: cells.water.x, y: cells.water.y, was: W.getTile(area.x, area.y, cells.water.x, cells.water.y, 0) });
        W.setTile(area.x, area.y, cells.water.x, cells.water.y, 0, freshBase);
        const unit = W.addUnit({ name: "TEST_looker", image: { characterName: "$U7_Ranger" }, area, x: cells.unit.x, y: cells.unit.y, dir: 2,
            data: { kind: "colonist", faction: "player", inventory: [], equipment: {} } });
        fx.units.push(unit);
        await t.waitFrames(2);

        // cell_lines: three lines for a tree, a water cell and a unit.
        const L1 = Look.describeCell(cells.oak.x, cells.oak.y), L2 = Look.describeCell(cells.water.x, cells.water.y), L3 = Look.describeCell(cells.unit.x, cells.unit.y);
        const info = cellAt(cells.oak.x, cells.oak.y);
        // The oak's picture comes from the catalog (a stock tile since the V9 stock swap, 2026-09-19), not a fixed name.
        const oakFile = imageOfType(O.type("oak"));
        const okTree = !!L1 && L1.length === 3 && L1[0] === "Oak — chop" && L1[1].includes(info.biome) && L1[1].includes(groundName(info.ground)) && !!oakFile && L1[2].startsWith(`${oakFile} — `);
        const okWater = !!L2 && L2[1].includes("water: fresh") && /^Outside_A1 — /.test(L2[2]);
        const okUnit = !!L3 && L3[0] === "TEST_looker · Friendly · Idle" && L3[2].startsWith("$U7_Ranger — U7 stand-in");
        t.check("cell_lines", okTree && okWater && okUnit,
            `tree ${JSON.stringify(L1)} (catalog image "${oakFile}"); water ${JSON.stringify(L2)}; unit ${JSON.stringify(L3)}`);

        // cell_lines & face_portraits: three lines and face metadata for tree, water and unit.
        const fOak = Look.faceAt(cells.oak.x, cells.oak.y);
        const fWater = Look.faceAt(cells.water.x, cells.water.y);
        const fUnit = Look.faceAt(cells.unit.x, cells.unit.y);
        const okFaces = !!fOak && fOak.sheet === "UF_Faces_Trees_Nature" && fOak.index === 0 && fWater === null && !!fUnit && !!fUnit.sheet;
        t.check("face_portraits", okFaces,
            `tree face: ${JSON.stringify(fOak)}; water face: ${JSON.stringify(fWater)}; unit face: ${JSON.stringify(fUnit)}`);

        // asset_line_names_status: by the name rules (the index, if one is loaded, is set aside for this check).
        const hadIndex = Assets.index();
        Assets.setIndex(null);
        put(cells.bare.x - 3, cells.bare.y, "sapling");         // Outside_B tile
        const l3 = (x, y) => (Look.describeCell(x, y) || ["", "", ""])[2];
        // No catalog object draws U7 art since the V9 stock swap (2026-09-19), so the U7_ name rule is read from a name.
        const u7 = Assets.describe("!$U7_Flat-toptree");
        const a1 = u7 ? u7.text : "", a2 = l3(cells.bare.x, cells.bare.y), a3 = l3(cells.bare.x - 3, cells.bare.y);
        const groundFile = ($gameMap.tileset() && $gameMap.tileset().tilesetNames[1]) || "";
        t.check("asset_line_names_status", a1.startsWith("!$U7_Flat-toptree — U7 stand-in") && a2.startsWith(`${groundFile} — code-drawn placeholder`) && a3.startsWith("Outside_B#") && a3.includes("— stock RMMZ"),
            `U7 name: "${a1}"; ground (${groundFile}): "${a2}"; stock tile: "${a3}"${hadIndex ? "; an asset index was loaded and set aside for this check" : "; no asset index file"}`);
        Assets.setIndex({ "!$TimberOak": { status: "original", request: "AR-021", usedBy: ["oak"] } });
        const viaIndex = Assets.describe("!$TimberOak");
        const notInIndex = Assets.describe("!$U7_Shrub");
        Assets.setIndex(undefined);
        t.check("asset_index_used", !!viaIndex && viaIndex.fromIndex && viaIndex.text === "!$TimberOak — original (AR-021)" && !!notInIndex && !notInIndex.fromIndex && notInIndex.status === STATUS.standin && Assets.index() === hadIndex,
            `with a test index: "${viaIndex && viaIndex.text}" (from index ${viaIndex && viaIndex.fromIndex}); a name not in it: "${notInIndex && notInIndex.text}"; index restored: ${Assets.index() === hadIndex}; index file listed for loading: ${Assets.indexFileListed()}`);

        // window_follows_mouse: the tooltip text changes with the mouse cell, 14 px right/below the pointer.
        const z = window.UF.Camera ? UF.Camera.zoom() : 1;
        const screenOf = c => ({ x: Math.round(($gameMap.adjustX(c.x) + 0.5) * 48 * z), y: Math.round(($gameMap.adjustY(c.y) + 0.5) * 48 * z) });
        const moveMouse = c => {
            const p = screenOf(c);
            TouchInput._x = p.x;
            TouchInput._y = p.y;
            return p;
        };
        // Expected corner: 14 px right/below the mouse, or 14 px left/above when the box would leave the screen.
        const wantAt = (p, sp) => ({
            x: p.x + OFFSET + sp.bitmap.width > Graphics.width ? p.x - OFFSET - sp.bitmap.width : p.x + OFFSET,
            y: p.y + OFFSET + sp.bitmap.height > Graphics.height ? p.y - OFFSET - sp.bitmap.height : p.y + OFFSET
        });
        const p1 = moveMouse(cells.oak);
        await t.waitFrames(2);
        const s = tip();
        const t1 = Look.text(), v1 = !!s && s.visible, pos1 = s ? { x: s.x, y: s.y } : null;
        const want1 = s ? wantAt(p1, s) : null;
        const at1 = !!pos1 && pos1.x === want1.x && pos1.y === want1.y;
        const p2 = moveMouse(cells.water);
        await t.waitFrames(2);
        const t2 = Look.text(), pos2 = s ? { x: s.x, y: s.y } : null;
        const want2 = s ? wantAt(p2, s) : null;
        const at2 = !!pos2 && pos2.x === want2.x && pos2.y === want2.y;
        t.check("window_follows_mouse", v1 && t1 === "Oak" && t2 === "Fresh water" && t1 !== t2 && at1 && at2 && s.bitmap.fontSize === FONT_SIZE,
            `mouse at (${p1.x},${p1.y}) over the oak: visible ${v1}, tooltip at (${pos1 && pos1.x},${pos1 && pos1.y}) [want (${want1 && want1.x},${want1 && want1.y})], text "${t1}"; ` +
            `mouse at (${p2.x},${p2.y}) over water: tooltip at (${pos2 && pos2.x},${pos2 && pos2.y}) [want (${want2 && want2.x},${want2 && want2.y}), ${s ? s.bitmap.width : "?"} px wide${want2 && want2.x < p2.x ? ", flipped left at the screen edge" : ""}], text "${t2}"; font ${s && s.bitmap.fontSize}px`);

        // Flipped at the screen edges; hidden over a UI window.
        TouchInput._x = Graphics.width - 4;
        TouchInput._y = Graphics.height - 4;
        await t.waitFrames(2);
        const flipped = !!s && (!s.visible || (s.x + s.bitmap.width <= Graphics.width && s.y + s.bitmap.height <= Graphics.height && s.x < TouchInput.x && s.y < TouchInput.y));
        const flipText = s ? `at (${s.x},${s.y}) ${s.bitmap.width}x${s.bitmap.height}, visible ${s.visible}` : "no sprite";
        const scene = SceneManager._scene;
        const probeWin = new Window_Base(new Rectangle(40, 40, 200, 80));
        scene.addWindow(probeWin);
        TouchInput._x = 60;
        TouchInput._y = 60;
        await t.waitFrames(2);
        const overUI = Look.isOverUI(), hiddenUI = !s.visible;
        scene._windowLayer.removeChild(probeWin);
        await t.waitFrames(1);
        t.check("edges_and_ui", flipped && overUI && hiddenUI, `mouse at the bottom-right corner: tooltip ${flipText}; over a 200x80 test window at (40,40): isOverUI ${overUI}, tooltip hidden ${hiddenUI}`);

        // show(): the lines pin next to the cell for a while, then the mouse takes over again.
        moveMouse(cells.bare);
        Look.show(cells.oak.x, cells.oak.y, 0.5);
        await t.waitFrames(2);
        const pinnedText = Look.text(), pinned = Look.isPinned();
        await t.waitFrames(40);
        const unpinned = !Look.isPinned();
        t.check("show_pins_lines", pinned && pinnedText === "Oak" && unpinned, `pinned ${pinned} with "${pinnedText.split("\n")[0]}" while the mouse is over bare ground; released after 0.5 s: ${unpinned}`);

        moveMouse(cells.oak);
        await t.waitFrames(10);
        t.screenshot("look_label");
        fx.cells = cells;
        return fx;
    };
})();
