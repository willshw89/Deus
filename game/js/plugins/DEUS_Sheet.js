//=============================================================================
// DEUS_Sheet.js - Select anything in the world and see its inventory grid (VISION V59, V49)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Sheet] Entity inspection panel: 14-slot equipment paperdoll, inventory grid, attributes, and object contents.
 * @author UF project
 * @base DEUS_World
 * @base DEUS_Items
 * @orderAfter DEUS_Interact
 *
 * @help
 * The selection panel (user, 2026-09-19: "The player should be able to
 * select anything in the game world and see its inventory grid"; VISION V59,
 * extending V49).
 *
 * Left-click a cell of the map that holds something: a unit first, then a
 * stockpile or workshop (their contents are the items lying on them), then
 * the items on the cell, then the object. Bare ground opens nothing.
 * The panel sits on the right of the screen, below the clock:
 *   header     face (units) or picture (things), name, kind, species or
 *              object type, faction with its stance colour, what it's doing,
 *              and what it carries ("Carrying 3 logs to the woodpile"; VISION
 *              V89: carried loads are written here, never drawn on the sprite)
 *   units      equipment slots (head, weapon, shield, torso, legs; the old
 *              equipment.tool shows as weapon and equipment.clothes as
 *              torso), the six stats with their modifiers, needs and mood
 *              (colonists), what an animal drops (catalog yields)
 *   things     state lines, the catalog actions it offers
 *   grid       the inventory, or what lies on a stockpile / workshop / pile:
 *              catalog sheet.grid (default 8 x 4 slots of 36 x 36), item
 *              icons from each item type's catalog image, stack counts
 *   buttons    your own colonists only: Drop (the selected stack goes to the
 *              colonist's cell) and Pick up (a stack lying on that cell)
 * Clicking a slot shows the item's name, count and tags in the footer.
 * Escape, a right-click on the panel, or its close box close it.
 * The right-click menu (UF_Interact) gains "Inventory" on every cell that
 * holds something.
 *
 * Input order: this plugin aliases Scene_Map.prototype.update and reads the
 * click after the original update has run, which includes
 * UF_ColonyOverseer's select/move handling and UF_Interact's menu handling.
 * A click on the map is never consumed here, so the Overseer still selects
 * colonists and orders moves. Clicks that land on the panel itself belong to
 * the panel: it handles them in its own window update (earlier in the same
 * frame) and clears that frame's trigger/cancel flags, the way RMMZ's own
 * windows consume input, so a click on the panel is never read as a map
 * order.
 *
 * API, state, events and checks: docs/systems/UF_Sheet.md
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const CHECK_EVERY = 15;        // frames between signature checks while the panel is open
    const PANEL_TOP = 82;          // below UF_DayNight's clock and UF_TimeSpeed's controls (top-right corner)
    const PANEL_MARGIN = 4;
    const PICTURE = 72;            // face / picture box
    const PICTURE_ICON = 64;       // an item or object picture inside that box
    const CLOSE = 18;
    const HEADER_H = 74;
    const LOAD_H = 18;             // the "Carrying ..." line under the header (units carrying something)
    const LOAD_KINDS = 3;          // item kinds named in the load line before "and N more"
    const MASS_WORDS = ["meat", "fiber", "straw", "wool", "charcoal", "leather", "firewood", "fish", "ore", "water"]; // no "a", no plural
    const TEXT_X = PICTURE + 8;
    const MAX_DROPS = 8;
    const MAX_STOCKPILE_CELLS = 64;
    const MAX_STATE_LINES = 4;
    const MAX_ACTION_LINES = 6;
    const FACE_COLS = 4;           // RPG Maker face sheets: 4 columns x 2 rows
    const DEFAULTS = {
        grid: { columns: 8, rows: 4, slot: 36 },
        slots: [
            "head", "eyes", "neck", "shoulders",
            "armor", "torso", "waist", "arms",
            "hands", "ring1", "ring2", "feet",
            "mainHand", "offHand"
        ],
        slotAliases: {
            weapon: "mainHand",
            tool: "mainHand",
            shield: "offHand",
            legs: "feet",
            clothes: "torso",
            body: "armor"
        }
    };
    const STAT_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
    const VERBS = { chop: "Chop down", gather: "Gather", pick: "Pick up", quarry: "Quarry", mine: "Mine" };
    const KIND_LABELS = { colonist: "Colonist", person: "Person", stranger: "Stranger", animal: "Animal", test: "Test unit", unit: "Unit",
        items: "Items", stockpile: "Stockpile", workshop: "Workshop", building: "Building", object: "Object" };
    const COLORS = {
        text: "#ffffff", dim: "#b8c0cc", doing: "#f0dca0", count: "#ffffff", equipped: "#7dd3fc", select: "#ffe066",
        well: "rgba(0, 0, 0, 0.45)", shade: "rgba(0, 0, 0, 0.75)", light: "rgba(255, 255, 255, 0.3)",
        button: "rgba(24, 22, 30, 0.92)", buttonEdge: "#c8a860", disabled: "#6b7280", pictureBack: "rgba(0, 0, 0, 0.35)",
        barBack: "rgba(20, 20, 25, 0.85)"
    };

    const DND_SKILLS = [
        { name: "Acrobatics", ability: "dex" },
        { name: "Animal Handling", ability: "wis" },
        { name: "Arcana", ability: "int" },
        { name: "Athletics", ability: "str" },
        { name: "Deception", ability: "cha" },
        { name: "History", ability: "int" },
        { name: "Insight", ability: "wis" },
        { name: "Intimidation", ability: "cha" },
        { name: "Investigation", ability: "int" },
        { name: "Medicine", ability: "wis" },
        { name: "Nature", ability: "int" },
        { name: "Perception", ability: "wis" },
        { name: "Performance", ability: "cha" },
        { name: "Persuasion", ability: "cha" },
        { name: "Religion", ability: "int" },
        { name: "Sleight of Hand", ability: "dex" },
        { name: "Stealth", ability: "dex" },
        { name: "Survival", ability: "wis" }
    ];

    const CRAFTING_RECIPES_2X2 = [
        { inputs: ["log"], output: "firewood", count: 4 },
        { inputs: ["fiber"], output: "fiber_wrap", count: 1 },
        { inputs: ["hide"], output: "hide_wrap", count: 1 },
        { inputs: ["straw", "straw"], output: "floor_straw", count: 1 },
        { inputs: ["stone", "log"], output: "stone_axe", count: 1 },
        { inputs: ["stone", "stone"], output: "stone_pick", count: 1 },
        { inputs: ["stone", "fiber"], output: "stone_knife", count: 1 },
        { inputs: ["firewood", "fiber"], output: "torch", count: 2 },
        { inputs: ["firewood", "firewood"], output: "firewood", count: 3 },
        { inputs: ["meat_raw", "firewood"], output: "meat_cooked", count: 1 },
        { inputs: ["fiber", "fiber"], output: "fiber_wrap", count: 2 },
        { inputs: ["log", "log", "fiber"], output: "chest_wood", count: 1 },
        { inputs: ["log", "log", "log", "log"], output: "workbench", count: 1 }
    ];

    const RACIAL_TRAITS_TABLE = {
        human: [
            { name: "Versatility", desc: "+1 to ability scores, resilient fortitude." },
            { name: "Determination", desc: "Driven to master crafts, industry, and diverse biomes." }
        ],
        dwarf: [
            { name: "Dwarven Resilience", desc: "Advantage on saves vs poison, resistance to poison damage." },
            { name: "Stonecunning", desc: "Double proficiency on history checks related to stonework." }
        ],
        elf: [
            { name: "Fey Ancestry", desc: "Advantage on saves vs charm, immune to magical sleep." },
            { name: "Trance", desc: "Meditate deeply for 4 hours instead of 8 hours of sleep." }
        ],
        halfling: [
            { name: "Lucky", desc: "Reroll a d20 result of 1 on attacks, ability checks, and saves." },
            { name: "Brave", desc: "Advantage on saving throws against being frightened." }
        ],
        dragonborn: [
            { name: "Draconic Ancestry", desc: "Draconic breath weapon and inherent damage resistance." },
            { name: "Breath Weapon", desc: "Exhale destructive energy in a 15-ft cone (2d6 elemental damage)." }
        ],
        gnome: [
            { name: "Gnome Cunning", desc: "Advantage on all Int, Wis, and Cha saves against magic." },
            { name: "Artificer's Lore", desc: "Double proficiency on technological, mechanical, and gem checks." }
        ],
        tiefling: [
            { name: "Hellish Resistance", desc: "Resistance to fire damage, darkvision 60 ft." },
            { name: "Infernal Legacy", desc: "Thaumaturgy cantrip at will, innate fire incantations." }
        ],
        half_orc: [
            { name: "Relentless Endurance", desc: "When reduced to 0 HP, drop to 1 HP instead once per long rest." },
            { name: "Savage Attacks", desc: "Roll one additional weapon damage die on critical hits." }
        ],
        half_elf: [
            { name: "Fey Ancestry", desc: "Advantage on saves vs charm, immune to magical sleep." },
            { name: "Skill Versatility", desc: "Gain proficiency in two additional skills of your choice." }
        ]
    };

    function darkvisionOf(species) {
        const sp = String(species || "").toLowerCase();
        if (["dwarf", "elf", "gnome", "tiefling", "half_orc", "drow", "orc", "goblin", "kobold"].includes(sp)) {
            return "60 ft";
        }
        return "None (0 ft)";
    }

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Factions = () => (window.UF && UF.Factions) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const lower = s => String(s || "").toLowerCase();
    const cap = s => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "");
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const copyArea = a => ({ x: a.x, y: a.y });
    const clampInt = (v, lo, hi, dflt) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : dflt);
    const signed = n => (n >= 0 ? `+${n}` : `${n}`);
    const statMod = score => Math.floor((score - 10) / 2);

    //-------------------------------------------------------------------------
    // Catalog: sheet.grid, sheet.slots, sheet.slotAliases, sheet.faces

    function config() {
        const s = (catalog() && catalog().sheet) || {};
        const g = s.grid || {};
        return {
            columns: clampInt(g.columns, 1, 12, DEFAULTS.grid.columns),
            rows: clampInt(g.rows, 1, 8, DEFAULTS.grid.rows),
            slot: clampInt(g.slot, 24, 64, DEFAULTS.grid.slot),
            slots: Array.isArray(s.slots) && s.slots.length ? s.slots.slice(0, 14) : DEFAULTS.slots,
            aliases: s.slotAliases && typeof s.slotAliases === "object" ? s.slotAliases : DEFAULTS.slotAliases,
            faces: s.faces && typeof s.faces === "object" ? s.faces : {}
        };
    }

    // A file under the game folder exists (NW.js); in a browser build every catalog file is trusted.
    // Missing images must never reach ImageManager: a failed load throws a LoadError at the next scene change.
    const existsCache = new Map();
    let fsMod = null, pathMod = null, baseDir = null;
    try {
        if (typeof require === "function") {
            fsMod = require("fs");
            pathMod = require("path");
            baseDir = (typeof nw !== "undefined" && nw.__dirname) || process.cwd();
        }
    } catch (e) {
        fsMod = null;
    }
    function fileExists(rel) {
        if (!fsMod) return true;
        if (existsCache.has(rel)) return existsCache.get(rel);
        let ok = false;
        try { ok = fsMod.existsSync(pathMod.join(baseDir, rel)); } catch (e) { ok = false; }
        existsCache.set(rel, ok);
        return ok;
    }

    //-------------------------------------------------------------------------
    // Icons: one Bitmap per item type (and per object type for the picture box), built once from the catalog image's
    // frame (the frame UF_Items draws on the ground: sidecar frame size, else column 1 row 0 of the 3x4 sheet),
    // trimmed to its opaque pixels, drawn at the art's own size (shrunk only when larger than the slot), tinted like the
    // ground sprite. Cached for the whole session.

    const icons = new Map();   // key -> { spec, size, state: "loading" | "ready" | "error", source, bitmap }
    let iconsVersion = 0;      // bumped when an image or sidecar finishes loading
    let bitmapsMade = 0;       // every Bitmap this plugin creates (the perf check reads it)

    function itemIconSpec(typeId) {
        const I = Items();
        const t = I ? I.type(typeId) : null;
        if (!t || !t.image) return null;
        return { key: `item:${t.id}`, kind: "character", rule: "item", name: t.image, tint: t.tint || null };
    }
    function objectIconSpec(type) {
        if (!type) return null;
        if (type.image) return { key: `object:${type.id}`, kind: "character", rule: "object", name: type.image, tint: type.tint || null };
        if (type.tile && type.tile.sheet) return { key: `object:${type.id}`, kind: "tile", sheet: type.tile.sheet, id: type.tile.id | 0, tint: type.tint || null };
        if (type.gen) return { key: `object:${type.id}`, kind: "gen", name: type.gen, tint: type.tint || null };
        return null;
    }

    // The frame rectangle of a spec on its loaded source, or null while a sidecar is still loading.
    function frameRect(spec, source) {
        if (spec.kind === "gen") return { x: 0, y: 0, w: source.width, h: source.height };
        if (spec.kind === "tile") {
            const id = spec.id, s = 48;
            return { x: ((Math.floor(id / 128) % 2) * 8 + (id % 8)) * s, y: (Math.floor((id % 256) / 8) % 16) * s, w: s, h: s };
        }
        if (spec.rule === "item") {
            const I = Items();
            const sc = I && typeof I.sidecar === "function" ? I.sidecar(spec.name) : null;
            if (sc === undefined) return null;
            const fw = (sc && sc.frameWidth > 0 ? sc.frameWidth : 0) || Math.floor(source.width / 3);
            const fh = (sc && sc.frameHeight > 0 ? sc.frameHeight : 0) || Math.floor(source.height / 4);
            return { x: fw, y: 0, w: fw, h: fh };
        }
        // Objects: UF_Objects' rule (sidecar frame size and animations.stand[0] column of row 0, else column 1 row 0).
        const S = window.UF && UF.Sidecars;
        let sc = null;
        if (S && typeof S.get === "function") {
            sc = S.get(spec.name);
            if (!sc && typeof S.isLoaded === "function" && !S.isLoaded(spec.name)) return null;
        }
        const big = ImageManager.isBigCharacter(spec.name);
        const fw = (sc && sc.frameWidth > 0 ? sc.frameWidth : 0) || Math.floor(source.width / (big ? 3 : 12));
        const fh = (sc && sc.frameHeight > 0 ? sc.frameHeight : 0) || Math.floor(source.height / (big ? 4 : 8));
        const col = sc && sc.animations && Array.isArray(sc.animations.stand) && sc.animations.stand.length ? sc.animations.stand[0] | 0 : 1;
        return { x: col * fw, y: 0, w: fw, h: fh };
    }

    function renderIcon(source, frame, size, tint, name) {
        const img = source._canvas || source._image;
        let bx = frame.x, by = frame.y, bw = frame.w, bh = frame.h;
        // Trim to the opaque pixels, read from a scratch canvas (the shared source bitmap is left as it is).
        try {
            const tmp = document.createElement("canvas");
            tmp.width = frame.w;
            tmp.height = frame.h;
            const tctx = tmp.getContext("2d");
            tctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
            const data = tctx.getImageData(0, 0, frame.w, frame.h).data;
            let x0 = frame.w, y0 = frame.h, x1 = -1, y1 = -1;
            for (let y = 0; y < frame.h; y++) {
                for (let x = 0; x < frame.w; x++) {
                    if (data[(y * frame.w + x) * 4 + 3] > 16) {
                        if (x < x0) x0 = x;
                        if (x > x1) x1 = x;
                        if (y < y0) y0 = y;
                        if (y > y1) y1 = y;
                    }
                }
            }
            if (x1 >= 0) {
                bx = frame.x + x0;
                by = frame.y + y0;
                bw = x1 - x0 + 1;
                bh = y1 - y0 + 1;
            }
        } catch (e) { /* keep the whole frame */ }
        // One pixel density for all art (VISION V2): an icon is drawn at the art's own size and only shrunk to fit.
        const scale = Math.min(1, size / bw, size / bh);
        const dw = Math.max(1, Math.round(bw * scale)), dh = Math.max(1, Math.round(bh * scale));
        const dx = Math.floor((size - dw) / 2), dy = Math.floor((size - dh) / 2);
        const b = new Bitmap(size, size);
        bitmapsMade++;
        const ctx = b.context;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, bx, by, bw, bh, dx, dy, dw, dh);
        if (tint) { // the ground sprite's tint multiplies the colours; the same here, keeping the alpha
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = tint;
            ctx.fillRect(0, 0, size, size);
            ctx.globalCompositeOperation = "destination-in";
            ctx.drawImage(img, bx, by, bw, bh, dx, dy, dw, dh);
            ctx.globalCompositeOperation = "source-over";
        }
        b._baseTexture.update();
        b._ufName = `UF_SheetIcon_${name}`;
        return b;
    }

    /** The icon entry for a spec at a size: { state, bitmap } (state "loading" until its image and sidecar are in). */
    function iconFor(spec, size) {
        if (!spec) return null;
        const key = `${spec.key}@${size}`;
        let e = icons.get(key);
        if (!e) {
            e = { spec, size, state: "loading", source: null, bitmap: null, listening: false };
            icons.set(key, e);
        }
        if (e.state !== "loading") return e;
        if (!e.source) {
            if (spec.kind === "character") {
                if (!fileExists(`img/characters/${spec.name}.png`)) { e.state = "error"; return e; }
                e.source = ImageManager.loadCharacter(spec.name);
            } else if (spec.kind === "tile") {
                if (!fileExists(`img/tilesets/${spec.sheet}.png`)) { e.state = "error"; return e; }
                e.source = ImageManager.loadTileset(spec.sheet);
            } else {
                const O = Objects();
                const gen = O && O.generated ? O.generated[spec.name] : null;
                e.source = typeof gen === "function" ? gen() : null;
                if (!e.source) { e.state = "error"; return e; }
            }
        }
        if (e.source.isError && e.source.isError()) { e.state = "error"; return e; }
        if (!e.source.isReady()) {
            if (!e.listening) {
                e.listening = true;
                e.source.addLoadListener(() => { iconsVersion++; });
            }
            return e;
        }
        const frame = frameRect(spec, e.source);
        if (!frame) return e; // a sidecar is still loading: the next signature check looks again
        if (frame.w <= 0 || frame.h <= 0) { e.state = "error"; return e; }
        e.bitmap = renderIcon(e.source, frame, size, spec.tint, spec.key);
        e.state = "ready";
        iconsVersion++;
        return e;
    }

    //-------------------------------------------------------------------------
    // Faces: the stock face sheets by species and gender (catalog sheet.faces), else a code-drawn silhouette

    const genFaces = new Map();
    function genFace(kind, color) {
        const key = `${kind}:${color}`;
        if (genFaces.has(key)) return genFaces.get(key);
        const b = new Bitmap(PICTURE, PICTURE);
        bitmapsMade++;
        const ctx = b.context;
        ctx.fillStyle = "#1d1b26";
        ctx.fillRect(0, 0, PICTURE, PICTURE);
        ctx.fillStyle = color;
        if (kind === "beast") {
            ctx.beginPath(); ctx.moveTo(19, 16); ctx.lineTo(29, 30); ctx.lineTo(15, 32); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(53, 16); ctx.lineTo(57, 32); ctx.lineTo(43, 30); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.ellipse(36, 40, 20, 16, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(36, 53, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#1d1b26";
            ctx.fillRect(27, 35, 4, 4);
            ctx.fillRect(41, 35, 4, 4);
            ctx.fillRect(33, 53, 6, 3);
        } else {
            ctx.beginPath(); ctx.arc(36, 28, 13, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(31, 38, 10, 10);
            ctx.beginPath(); ctx.ellipse(36, 74, 28, 24, 0, Math.PI, 0); ctx.fill();
        }
        b._baseTexture.update();
        b._ufName = "UF_GenFace";
        genFaces.set(key, b);
        return b;
    }

    const WILDLIFE_BEAST_FACES = {
        wolf: 0, boar: 1, bear: 2, hare: 3, rabbit: 3, ox: 4, sheep: 5,
        dog: 6, fox: 6, songbird: 6, rat: 7, wildcat: 7, lynx: 7
    };

    const WILDLIFE_MONSTER_FACES = {
        troll: 0, bog_horror: 1, giant_spider: 2, spider: 2, sand_stalker: 3, serpent: 3,
        bat: 4, restless_dead: 5, skeleton: 5, zombie: 5, ghost: 5, ice_wraith: 6, wraith: 6, aurochs: 7
    };

    const TREE_FLORA_FACES = {
        oak: { sheet: "UF_Faces_Trees_Nature", index: 0 },
        tree_savanna: { sheet: "UF_Faces_Trees_Nature", index: 0 },
        bush: { sheet: "UF_Faces_Trees_Nature", index: 0 },
        desert_shrub: { sheet: "UF_Faces_Trees_Nature", index: 0 },
        snow_bush: { sheet: "UF_Faces_Trees_Nature", index: 0 },
        sapling: { sheet: "UF_Faces_Trees_Nature", index: 0 },
        birch: { sheet: "UF_Faces_Trees_Nature", index: 1 },
        pine: { sheet: "UF_Faces_Trees_Nature", index: 2 },
        fir_snow: { sheet: "UF_Faces_Trees_Nature", index: 2 },
        fir: { sheet: "UF_Faces_Trees_Nature", index: 2 },
        fruit_tree: { sheet: "UF_Faces_Trees_Nature", index: 3 },
        fruit_tree_bare: { sheet: "UF_Faces_Trees_Nature", index: 3 },
        berry_bush: { sheet: "UF_Faces_Trees_Nature", index: 3 },
        berry_bush_bare: { sheet: "UF_Faces_Trees_Nature", index: 3 },
        palm: { sheet: "UF_Faces_Trees_Nature", index: 4 },
        tree_tropical: { sheet: "UF_Faces_Trees_Nature", index: 4 },
        cactus: { sheet: "UF_Faces_Trees_Nature", index: 4 },
        cactus_tall: { sheet: "UF_Faces_Trees_Nature", index: 4 },
        tree_swamp: { sheet: "UF_Faces_Trees_Nature", index: 5 },
        mangrove: { sheet: "UF_Faces_Trees_Nature", index: 5 },
        willow: { sheet: "UF_Faces_Trees_Nature", index: 5 },
        reeds: { sheet: "UF_Faces_Trees_Nature", index: 5 },
        lily_pad: { sheet: "UF_Faces_Trees_Nature", index: 5 },
        fern: { sheet: "UF_Faces_Trees_Nature", index: 5 },
        dead_tree: { sheet: "UF_Faces_Trees_Nature", index: 6 },
        tree_cursed: { sheet: "UF_Faces_Trees_Nature", index: 6 },
        stump: { sheet: "UF_Faces_Trees_Nature", index: 6 },
        tower_cap: { sheet: "UF_Faces_Trees_Nature", index: 7 },
        glow_caps: { sheet: "UF_Faces_Trees_Nature", index: 7 },
        cave_mushrooms: { sheet: "UF_Faces_Trees_Nature", index: 7 },
        cave_moss: { sheet: "UF_Faces_Trees_Nature", index: 7 },
        spore_reeds: { sheet: "UF_Faces_Trees_Nature", index: 7 },
        granite_boulder: { sheet: "UF_Faces_Minerals", index: 0 },
        ironstone_outcrop: { sheet: "UF_Faces_Minerals", index: 1 },
        copper_outcrop: { sheet: "UF_Faces_Minerals", index: 2 },
        gold_outcrop: { sheet: "UF_Faces_Minerals", index: 3 },
        crystal_cluster: { sheet: "UF_Faces_Minerals", index: 4 },
        small_crystals: { sheet: "UF_Faces_Minerals", index: 5 },
        loose_stones: { sheet: "UF_Faces_Minerals", index: 6 },
        ancient_bones: { sheet: "UF_Faces_Minerals", index: 7 },
        old_bones: { sheet: "UF_Faces_Minerals", index: 7 },
        rubble: { sheet: "UF_Faces_Minerals", index: 6 },
        fallen_pillar: { sheet: "UF_Faces_Minerals", index: 6 }
    };

    function faceOfObject(type) {
        if (!type) return null;
        const id = lower(type.id || type.name || "").replace(/\s+/g, "_");
        if (id && Object.prototype.hasOwnProperty.call(TREE_FLORA_FACES, id)) {
            const spec = TREE_FLORA_FACES[id];
            if (fileExists(`img/faces/${spec.sheet}.png`)) return spec;
        }
        return null;
    }

    // { type: "face", sheet, index, frame } from unit.data.face or the catalog, else { type: "gen", kind, color, frame }.
    // frame: the culture whose code-drawn frame goes around the picture (UF.Factions.drawPortrait), or null.
    function faceSpecOf(u, species) {
        const d = u.data || {};
        if (d.face && d.face.sheet && fileExists(`img/faces/${d.face.sheet}.png`)) return { type: "face", sheet: String(d.face.sheet), index: d.face.index | 0 };
        // VISION V100: the culture's face sheets, then its people's species sheets (catalog "faces"); else the older
        // pick below, in a frame in the culture's colours until the culture's sheets exist.
        const F = Factions();
        const frame = F && typeof F.faceFrameCulture === "function" ? F.faceFrameCulture(u) : null;
        const cf = F && typeof F.cultureFace === "function" ? F.cultureFace(u) : null;
        if (cf && fileExists(`img/faces/${cf.sheet}.png`)) return { type: "face", sheet: cf.sheet, index: cf.index, from: cf.from, culture: cf.culture, frame: cf.framed === false ? frame : null };
        const spId = lower((species && species.id) || d.species || u.name || "").replace(/\s+/g, "_");
        if (spId) {
            if (Object.prototype.hasOwnProperty.call(WILDLIFE_BEAST_FACES, spId)) {
                const sheet = "UF_Faces_Wildlife_Beasts";
                if (fileExists(`img/faces/${sheet}.png`)) return { type: "face", sheet, index: WILDLIFE_BEAST_FACES[spId], frame };
            }
            if (Object.prototype.hasOwnProperty.call(WILDLIFE_MONSTER_FACES, spId)) {
                const sheet = "UF_Faces_Wildlife_Monsters";
                if (fileExists(`img/faces/${sheet}.png`)) return { type: "face", sheet, index: WILDLIFE_MONSTER_FACES[spId], frame };
            }
        }
        const entry = config().faces[d.species];
        if (entry && typeof entry === "object") {
            const g = lower(d.gender) || "any";
            const list = (d.stage && entry[`${lower(d.stage)}_${g}`]) || entry[g] || entry.any || null;
            const usable = Array.isArray(list) ? list.filter(p => Array.isArray(p) && p[0] && fileExists(`img/faces/${p[0]}.png`)) : [];
            if (usable.length) {
                const pick = usable[Math.abs(u.id | 0) % usable.length]; // stable per unit, no randomness
                return { type: "face", sheet: String(pick[0]), index: pick[1] | 0, frame };
            }
        }
        const beast = d.kind === "creature";
        const people = catalog() && catalog().people ? catalog().people[d.species] : null;
        const color = d.tint || (species && species.tint) || (people && people.tint) || (beast ? "#9a8a70" : "#8a8f98");
        return { type: "gen", kind: beast ? "beast" : "person", color, frame };
    }

    //-------------------------------------------------------------------------
    // Reading the world: what a cell holds and what the panel shows for it

    const onMap = (x, y) => !!window.$gameMap && !!window.$dataMap && $gameMap.isValid(x, y);

    /** The world unit standing on a cell of the map on screen, or null. */
    function unitAt(x, y) {
        const W = World();
        if (!W || !onMap(x, y)) return null;
        for (const ev of $gameMap.eventsXy(x, y)) {
            if (ev.isTransparent()) continue;
            const u = W.unitOfEvent ? W.unitOfEvent(ev) : null;
            if (u) return u;
        }
        return null;
    }
    const tagsOf = type => (type && Array.isArray(type.tags) ? type.tags : []);
    const isStockpile = type => tagsOf(type).includes("stockpile");
    const isWorkshop = type => tagsOf(type).includes("workplace");
    const isContainer = type => isStockpile(type) || isWorkshop(type);
    function objectKind(type) {
        if (isStockpile(type)) return "stockpile";
        if (isWorkshop(type)) return "workshop";
        if (tagsOf(type).includes("building")) return "building";
        return "object";
    }

    /**
     * What a click on a cell of the map on screen selects: { kind: "unit", unitId } | { kind: "cell", area, x, y } | null.
     * Units first; then a stockpile or workshop (the items on it are its contents); then items; then the object; bare ground: null.
     */
    function subjectAt(x, y) {
        const W = World();
        if (!W || !onMap(x, y)) return null;
        const u = unitAt(x, y);
        if (u) return { kind: "unit", unitId: u.id };
        const area = W.currentArea();
        if (!area) return null;
        const O = Objects(), I = Items();
        const obj = O ? O.at(x, y) : null;
        const C = window.UF && UF.Containers;
        const isChest = obj && (obj.id === "chest_wood" || obj.id === "crate_wood" || obj.id === "barrel_wood");
        if (isChest) return null; // Physical containers must never open the generic cellModel card
        if (obj || (I && I.at(x, y).length)) return { kind: "cell", area: copyArea(area), x, y };
        return null;
    }

    function isPlayersFaction(f) {
        if (!f) return false;
        if (f === "player") return true;
        const F = Factions();
        const pid = F && typeof F.playerId === "function" ? F.playerId() : null;
        return !!pid && f === pid;
    }
    function isPlayersColonist(u) {
        const d = u && u.data;
        return !!d && d.kind === "colonist" && (d.faction === undefined || d.faction === null || isPlayersFaction(d.faction));
    }
    function unitKind(u) {
        const d = u.data || {};
        if (d.kind === "colonist") return isPlayersColonist(u) ? "colonist" : "stranger";
        if (d.kind === "person") return isPlayersFaction(d.faction) ? "person" : "stranger";
        if (d.kind === "creature") return "animal";
        if (d.kind === "test") return "test";
        return "unit";
    }
    function wildSpecies(id) {
        const cat = catalog();
        const list = cat && cat.wildlife && Array.isArray(cat.wildlife.species) ? cat.wildlife.species : [];
        return list.find(s => s.id === id) || null;
    }
    function itemName(typeId) {
        const I = Items();
        const t = I ? I.type(typeId) : null;
        return t ? t.name : String(typeId);
    }
    function objectName(id) {
        const O = Objects();
        const t = O ? O.type(id) : null;
        return t ? t.name : String(id);
    }
    const costText = items => {
        const parts = Object.keys(items || {}).map(id => `${items[id]} ${itemName(id)}`);
        return parts.length ? parts.join(", ") : "nothing";
    };

    // Equipment: the catalog's slots; a value is an item record id (UF_Items/UF_Jobs) or an item type id (UF_Combat).
    function resolveEquip(unit, v) {
        const I = Items();
        if (!I || v === null || v === undefined || v === "") return null;
        if (typeof v === "number") {
            const it = I.get(v);
            return it ? { itemId: it.id, typeId: it.type, count: it.count, carried: it.holder === unit.id } : null;
        }
        if (typeof v === "string") {
            const t = I.type(v) || I.types().find(ty => ty.name === v) || null;
            return t ? { itemId: null, typeId: t.id, count: 1, carried: false } : null;
        }
        if (typeof v === "object" && v.type) return resolveEquip(unit, v.id !== undefined ? v.id : v.type);
        return null;
    }
    function equipmentOf(u, cfg) {
        const eq = (u.data && u.data.equipment) || {};
        const out = cfg.slots.map(slot => ({ slot, via: slot, ...(resolveEquip(u, eq[slot]) || { itemId: null, typeId: null, count: 0 }) }));
        for (const legacy of Object.keys(cfg.aliases)) {
            const slot = cfg.aliases[legacy];
            const e = out.find(o => o.slot === slot);
            if (!e || e.typeId) continue;
            const r = resolveEquip(u, eq[legacy]);
            if (r) Object.assign(e, r, { via: legacy });
        }
        return out;
    }
    function statsOf(stats) {
        if (!stats || typeof stats !== "object") return null;
        const out = [];
        for (const k of STAT_KEYS) {
            const s = Number(stats[k]);
            if (!Number.isFinite(s)) return null;
            out.push({ key: k, label: k.toUpperCase(), score: s, mod: statMod(s) });
        }
        return out;
    }
    function gridSlots(list, cfg, equipped) {
        const cap0 = cfg.columns * cfg.rows;
        const slots = new Array(cap0).fill(null);
        list.slice(0, cap0).forEach((it, i) => { slots[i] = { itemId: it.id, typeId: it.type, count: it.count, equipped: !!equipped && equipped.has(it.id) }; });
        return { slots, total: list.length, overflow: Math.max(0, list.length - cap0) };
    }
    function factionLine(u) {
        const F = Factions(), S = window.UF && UF.Stance;
        const d = u.data || {};
        const f = F && d.faction ? F.get(d.faction) : null;
        const stance = S && typeof S.of === "function" ? S.of(u) : null;
        return {
            faction: f ? f.name : (d.faction ? String(d.faction) : "No faction"),
            stance: stance ? { id: stance, label: typeof S.label === "function" ? S.label(stance) : cap(stance), color: typeof S.color === "function" ? S.color(stance) : "#ffffff" } : null
        };
    }
    function doingOf(u) {
        const d = u.data || {};
        if (d.intent && d.intent.text) return String(d.intent.text);
        const J = Jobs();
        const job = J && typeof J.of === "function" ? J.of(u.id) : null;
        if (job) return J.describe(job);
        return u.goal ? "Walking" : "Idle";
    }

    //-------------------------------------------------------------------------
    // The load: what a unit carries, in words (VISION V89, user 2026-09-19: "Whatever they are carrying can be documented
    // in their profile as opposed to animated"). Loads are never drawn on the sprite (UF_Anim); the profile says them:
    // this panel and the Overseer's colonist card.

    const lastWord = name => lower(name).split(/\s+/).pop();
    /** "log" -> "logs", "stone knife" -> "stone knives"; "berries" and "raw meat" stay as they are. */
    function pluralName(name) {
        const n = lower(name), w = lastWord(n);
        if (MASS_WORDS.includes(w) || /s$/.test(w)) return n;
        if (/knife$/.test(n)) return n.slice(0, -2) + "ves";
        if (/(x|z|ch|sh)$/.test(n)) return n + "es";
        if (/[^aeiou]y$/.test(n)) return n.slice(0, -1) + "ies";
        return n + "s";
    }
    /** An item name with its count: "a log", "3 logs", "an iron axe", "raw meat", "2 raw meat", "berries", "5 berries". */
    function countedName(name, count) {
        const n = lower(name), w = lastWord(n);
        const bare = MASS_WORDS.includes(w) || /s$/.test(w);
        if (!(count > 1)) return bare ? n : `${/^[aeiou]/.test(n) ? "an" : "a"} ${n}`;
        return `${count} ${bare ? n : pluralName(n)}`;
    }
    const isBuiltThing = t => ["building", "stockpile", "workplace"].some(tag => tagsOf(t).includes(tag));
    /**
     * Where a haul goes, in words: the colony plan step whose cells hold that cell ("the woodpile", "the larder", "the
     * shelter"), else the building on it ("the stockpile", "the work stone"), else a building marked there ("the wooden
     * wall being built"), else the cell ("(12, 8)").
     */
    function placeName(to) {
        if (!to || !to.area) return "";
        const W = World(), O = Objects(), J = Jobs();
        const c = W && W.state ? W.state.colony : null;
        if (c && Array.isArray(c.plan) && c.site && sameArea(c.area, to.area)) {
            const dx = to.x - c.site.x, dy = to.y - c.site.y;
            const step = c.plan.find(p => p && p.build && Array.isArray(p.cells) && p.cells.some(cl => Array.isArray(cl) && cl[0] === dx && cl[1] === dy));
            if (step && step.id) return `the ${lower(String(step.id).replace(/_/g, " "))}`;
        }
        const t = O && typeof O.atIn === "function" ? O.atIn(to.area, to.x, to.y) : null;
        if (t && t.name && isBuiltThing(t)) return `the ${lower(t.name)}`;
        const marked = J && typeof J.list === "function" ? J.list(j => j.type === "build" && !!j.target && sameArea(j.target.area, to.area) && j.target.x === to.x && j.target.y === to.y && j.state !== "done" && j.state !== "failed" && j.state !== "cancelled") : [];
        const bt = marked.length && marked[0].params && O ? O.type(marked[0].params.objectId) : null;
        if (bt && bt.name) return `the ${lower(bt.name)} being built`;
        return `(${to.x}, ${to.y})`;
    }
    // Item record ids the unit wears or wields (any key of data.equipment: head, weapon, tool, clothes, ...).
    function equippedIds(u) {
        const eq = (u.data && u.data.equipment) || {};
        const out = new Set();
        for (const k of Object.keys(eq)) {
            const v = eq[k];
            if (typeof v === "number") out.add(v);
            else if (v && typeof v === "object" && typeof v.id === "number") out.add(v.id);
        }
        return out;
    }
    /**
     * What a unit carries: { kind, items: [{ typeId, name, count }], to: { area, x, y, name } | null, jobId, text }, or
     * null when it carries nothing. kind "haul": the item its haul or fetch job moves, in its hands (with where a haul
     * takes it); "water": water for a fire (UF_Fire's douse job after filling up); "held": the stacks it holds but doesn't
     * wear or wield, by item type in pick-up order.
     */
    function loadOf(unitOrId) {
        const W = World(), I = Items(), J = Jobs();
        const u = typeof unitOrId === "number" ? (W ? W.unit(unitOrId) : null) : unitOrId;
        if (!u || !I) return null;
        const job = J && typeof J.of === "function" ? J.of(u.id) : null;
        let load = null;
        if (job && (job.type === "haul" || job.type === "fetch") && job.params) {
            const it = I.get(job.params.itemId);
            if (it && it.holder === u.id) {
                const to = job.type === "haul" && job.params.to && job.params.to.area ? job.params.to : null;
                load = { kind: "haul", items: [{ typeId: it.type, name: itemName(it.type), count: it.count }],
                    to: to ? { area: copyArea(to.area), x: to.x | 0, y: to.y | 0, name: placeName(to) } : null, jobId: job.id };
            }
        }
        if (!load && job && job.type === "douse" && (job.phase | 0) >= 1) {
            load = { kind: "water", items: [{ typeId: null, name: "water", count: 1 }], to: { area: null, x: 0, y: 0, name: "the fire" }, jobId: job.id };
        }
        if (!load) {
            const worn = equippedIds(u), byType = new Map();
            for (const it of I.inventoryOf(u.id)) {
                if (worn.has(it.id)) continue;
                const e = byType.get(it.type);
                if (e) e.count += it.count;
                else byType.set(it.type, { typeId: it.type, name: itemName(it.type), count: it.count });
            }
            if (byType.size) load = { kind: "held", items: Array.from(byType.values()), to: null, jobId: job ? job.id : null };
        }
        if (load) load.text = loadText(load);
        return load;
    }
    /** The load in words, naming at most maxKinds item kinds: "Carrying 3 logs to the woodpile", "Carrying raw meat and a stone knife"; "" for none. */
    function loadText(load, maxKinds) {
        if (!load || !Array.isArray(load.items) || !load.items.length) return "";
        const k = Math.max(1, (maxKinds | 0) || LOAD_KINDS);
        const parts = load.items.slice(0, k).map(e => (e.typeId === null ? lower(e.name) : countedName(e.name, e.count)));
        const more = load.items.length - parts.length;
        const what = more > 0 ? `${parts.join(", ")} and ${more} more` : parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
        return `Carrying ${what}${load.to && load.to.name ? ` to ${load.to.name}` : ""}`;
    }
    /** The load text that fits a width (fewer item kinds named until it does); widthOf(text) measures in the caller's font. */
    function fittedLoadText(load, width, widthOf) {
        let text = loadText(load);
        for (let k = LOAD_KINDS - 1; k >= 1 && text && widthOf(text) > width; k--) text = loadText(load, k);
        return text;
    }

    function unitModel(u) {
        const I = Items(), cfg = config(), d = u.data || {};
        const kind = unitKind(u);
        const readOnly = kind !== "colonist";
        const inv = I ? I.inventoryOf(u.id) : [];
        const equipment = equipmentOf(u, cfg);
        const equipped = new Set((equipment || []).filter(e => e.itemId !== null && e.itemId !== undefined).map(e => e.itemId));
        const species = wildSpecies(d.species);
        const speciesText = species ? `${species.name}${species.kind ? ` (${species.kind})` : ""}` : cap(d.species || "");
        const who = [d.gender ? lower(d.gender) : "", d.age !== undefined && kind !== "animal" ? `age ${d.age}` : ""].filter(Boolean).join(", ");
        const fl = factionLine(u);
        const P = window.UF && UF.Proficiency;
        const profInfo = P && typeof P.emergentProfession === "function" ? P.emergentProfession(u) : null;
        const profTitle = profInfo && profInfo.id !== "settler" ? profInfo.title : null;
        const Env = window.UF && UF.Environment;
        const th = Env && typeof Env.unitThermal === "function" ? Env.unitThermal(u) : null;
        const cond = Env && typeof Env.conditionLabel === "function" ? Env.conditionLabel(u) : "";
        const thermalText = th ? `${th.bodyTemp}°C${cond ? ` [${cond}]` : ""}` : "";
        const here = I && u.area ? I.atIn(u.area, u.x, u.y) : [];
        const grid = gridSlots(inv, cfg, equipped);
        const drops = kind === "animal" && species && species.yields ? Object.keys(species.yields).slice(0, MAX_DROPS).map(id => ({ typeId: id, count: species.yields[id] | 0 })) : (kind === "animal" ? [] : null);
        let capabilities = null;
        if (P && d.proficiencyXp && typeof d.proficiencyXp === "object") {
            const list = [];
            for (const [profId, xp] of Object.entries(d.proficiencyXp)) {
                if (typeof xp === "number" && xp > 0) {
                    const def = P.DEFINITIONS ? P.DEFINITIONS[profId] : null;
                    const r = P.resolveCapability(u, profId);
                    list.push({
                        id: profId,
                        name: def ? def.name : cap(profId),
                        capability: r.capability,
                        profLabel: r.profLabel,
                        abilityKey: r.abilityKey,
                        abilityMod: r.abilityMod,
                        profBonus: r.profBonus
                    });
                }
            }
            list.sort((a, b) => b.capability - a.capability);
            if (list.length) capabilities = list.slice(0, 3);
        }
        const Dnd = window.UF && UF.Dnd5e;
        let dnd = d.dnd || null;
        if (!dnd && Dnd && typeof Dnd.assignClass === "function") {
            const curStats = d.stats || Dnd.rollAbilityScores(42, u.id, d.species || "human");
            dnd = Dnd.assignClass(curStats, 42, u.id);
            d.dnd = dnd;
            d.dndClass = dnd.id;
            d.className = dnd.name;
            d.hitDie = dnd.hitDie;
            d.hpMax = dnd.hpMax;
            d.hp = dnd.hp;
            d.ac = dnd.ac;
            d.savingThrows = dnd.savingThrows;
        }

        const tabs = (kind === "colonist" || kind === "person") ? [
            { id: "record", label: "1: Record" },
            { id: "inventory", label: "2: Inventory" },
            { id: "spellbook", label: "3: Spell Book" },
            { id: "priest", label: "4: Priest Scroll" }
        ] : null;

        const classSubtitle = dnd ? `${dnd.name} 1` : profTitle;

        const m = {
            subject: { kind: "unit", unitId: u.id }, kind, readOnly,
            title: u.name || "", subtitle: [KIND_LABELS[kind], classSubtitle, speciesText, who, thermalText].filter(Boolean).join(" · "),
            faction: fl.faction, stance: fl.stance, doing: doingOf(u),
            load: loadOf(u),
            picture: faceSpecOf(u, species),
            equipment, stats: statsOf(d.stats), statsShown: true,
            capabilities,
            dnd, tabs,
            needs: null,
            mood: null,
            drops, stateLines: null, actions: null,
            grid: Object.assign({ title: "Inventory" }, grid),
            buttons: readOnly ? [] : [
                { id: "drop", label: "Drop" },
                { id: "pickup", label: here.length ? `Pick up (${here.length} here)` : "Pick up", enabled: here.length > 0 && inv.length < grid.slots.length }
            ],
            hint: readOnly ? "Read-only: not one of your people." : "Click a stack, then Drop puts it at their feet.",
            here: here.map(it => it.id)
        };
        m.sig = JSON.stringify([m.kind, m.title, m.subtitle, m.faction, m.stance && m.stance.id, m.doing, m.load ? m.load.text : "", inv.map(it => `${it.id}:${it.type}:${it.count}`),
            equipment ? equipment.map(e => `${e.itemId}:${e.typeId}`) : null, m.stats ? m.stats.map(s => s.score) : null,
            capabilities ? capabilities.map(c => `${c.id}:${c.capability}`) : null,
            dnd ? dnd.name : "",
            m.here, m.picture]);
        return m;
    }

    // The stockpile's cells: 4-connected cells holding the same stockpile object, from the clicked cell (capped).
    function stockpileCells(area, x, y, typeId) {
        const O = Objects();
        const out = [], seen = new Set([`${x},${y}`]), queue = [[x, y]];
        while (queue.length && out.length < MAX_STOCKPILE_CELLS) {
            const [cx, cy] = queue.shift();
            out.push({ x: cx, y: cy });
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`;
                if (seen.has(k)) continue;
                seen.add(k);
                if (O.typeIdIn(area, nx, ny) === typeId) queue.push([nx, ny]);
            }
        }
        return out;
    }

    function cellModel(s) {
        const O = Objects(), I = Items(), W = World();
        if (!W) return null;
        const cfg = config();
        const type = O ? O.atIn(s.area, s.x, s.y) : null;
        const items = I ? I.atIn(s.area, s.x, s.y) : [];
        if (!type && !items.length) return null;
        const kind = type && (isContainer(type) || !items.length) ? objectKind(type) : "items";
        const m = {
            subject: { kind: "cell", area: copyArea(s.area), x: s.x, y: s.y }, kind, readOnly: true,
            title: "", subtitle: "", faction: null, stance: null, doing: null, load: null, picture: null,
            equipment: null, stats: null, statsShown: false, needs: null, mood: null, drops: null,
            stateLines: null, actions: null, grid: null, buttons: [], hint: "Click a stack for its name, count and tags.", here: []
        };
        if (kind === "items") {
            const first = items[0];
            m.title = items.length === 1 ? `${itemName(first.type)}${first.count > 1 ? ` × ${first.count}` : ""}` : `${items.length} stacks`;
            m.subtitle = `Items on the ground${type ? ` · on ${type.name}` : ""}`;
            m.picture = { type: "icon", spec: itemIconSpec(first.type) };
            m.grid = Object.assign({ title: "Lying here" }, gridSlots(items, cfg, null));
        } else {
            m.title = type.name;
            m.subtitle = [KIND_LABELS[kind], tagsOf(type).join(", ")].filter(Boolean).join(" · ");
            const face = faceOfObject(type);
            m.picture = face ? { type: "face", sheet: face.sheet, index: face.index } : { type: "icon", spec: objectIconSpec(type) };
            const lines = [];
            lines.push(type.passable === true ? "Can be walked over" : "Blocks the way");
            const regrow = O && typeof O.regrowList === "function" ? O.regrowList().find(r => sameArea(r.area, s.area) && r.x === s.x && r.y === s.y) : null;
            if (regrow) {
                const hours = typeof O.hourNow === "function" ? Math.max(0, Math.ceil(regrow.due - O.hourNow())) : null;
                lines.push(`Grows back into ${objectName(regrow.to)}${hours !== null ? ` in ${hours} h` : ""}`);
            }
            let cells = [{ x: s.x, y: s.y }];
            if (kind === "stockpile") {
                cells = stockpileCells(s.area, s.x, s.y, O.typeIdIn(s.area, s.x, s.y));
                const st = W.state && W.state.colony && Array.isArray(W.state.colony.stockpiles) ? W.state.colony.stockpiles : [];
                const stores = [];
                for (const p of st) if (cells.some(c => c.x === p.x && c.y === p.y)) for (const tag of p.stores || []) if (!stores.includes(tag)) stores.push(tag);
                lines.push(`${cells.length} cell${cells.length === 1 ? "" : "s"}${stores.length ? ` · stores ${stores.join(", ")}` : ""}`);
            }
            if (type.build && Object.keys(type.build.items || {}).length) lines.push(`Built from ${costText(type.build.items)}`);
            const Int = window.UF && UF.Interact;
            const marked = Int && typeof Int.designationsAt === "function" ? Int.designationsAt(s.x, s.y, s.area) : [];
            if (marked.length) lines.push(`Marked: ${marked.map(j => j.type).join(", ")}`);
            m.stateLines = lines.slice(0, MAX_STATE_LINES);
            const acts = [];
            for (const a of Object.keys(type.actions || {})) {
                const spec = type.actions[a] || {};
                const yields = Object.keys(spec.yields || {}).map(id => `${spec.yields[id]} ${itemName(id)}`).join(", ");
                acts.push({ id: a, text: `${VERBS[a] || cap(a)}: ${yields || "nothing"} · leaves ${spec.becomes ? objectName(spec.becomes) : "nothing"}` });
            }
            if (type.build || type.ruin) {
                const back = type.build && Object.keys(type.build.items || {}).length ? costText(type.build.items) : "";
                acts.push({ id: "dismantle", text: back ? `Dismantle: gives back ${back}` : "Dismantle: gives nothing back" });
            }
            m.actions = acts.slice(0, MAX_ACTION_LINES);
            if (kind === "stockpile" || kind === "workshop") {
                const list = [];
                for (const c of cells) for (const it of I.atIn(s.area, c.x, c.y)) list.push(it);
                m.grid = Object.assign({ title: kind === "stockpile" ? "Stored here" : "Materials on it" }, gridSlots(list, cfg, null));
            }
        }
        const gridItems = m.grid ? m.grid.slots.filter(Boolean).map(g => `${g.itemId}:${g.typeId}:${g.count}`) : null;
        m.sig = JSON.stringify([m.kind, m.title, m.subtitle, m.stateLines, m.actions && m.actions.length, gridItems, m.grid && m.grid.total]);
        return m;
    }

    function buildModel(subject) {
        if (!subject) return null;
        if (subject.kind === "unit") {
            const W = World();
            const u = W ? W.unit(subject.unitId) : null;
            return u ? unitModel(u) : null;
        }
        return cellModel(subject);
    }

    //-------------------------------------------------------------------------
    // Layout (contents coordinates) for a model

    function layoutFor(m, iw, cfg, activeTab = 0) {
        const s = cfg.slot;
        const L = { picture: { x: 0, y: 0, w: PICTURE, h: PICTURE }, close: { x: iw - CLOSE, y: 0, w: CLOSE, h: CLOSE } };
        let y = HEADER_H + 4;
        if (m.load) {
            L.load = { x: 0, y: HEADER_H, w: iw, h: LOAD_H - 2 };
            y += LOAD_H;
        }

        if (m.tabs && m.tabs.length) {
            const tabCount = m.tabs.length;
            const tabGap = 4;
            const tabW = Math.floor((iw - (tabCount - 1) * tabGap) / tabCount);
            const tabH = 22;
            L.tabs = m.tabs.map((tab, i) => ({
                id: tab.id,
                label: tab.label,
                x: i * (tabW + tabGap),
                y,
                w: tabW,
                h: tabH
            }));
            y += tabH + 6;

            if (activeTab === 0) {
                // PAGE 1: RECORD / STATUS / EXP (Baldur's Gate 1 style)
                L.record = {
                    x: 0, y, w: iw,
                    bannerH: 22,
                    statsH: 36,
                    vitalsH: 36,
                    savesH: 26,
                    expH: 26,
                    featsH: 64,
                    profsH: 44,
                    carryingH: 42
                };
                L.stats = { x: 0, y: y + 22, w: iw, h: 36 };
                y += 22 + 36 + 36 + 26 + 26 + 64 + 44 + 42 + 10;
            } else if (activeTab === 1) {
                // PAGE 2: INVENTORY & EQUIPMENT
                if (m.equipment) {
                    const cols = 7;
                    const rows = Math.ceil(m.equipment.length / cols);
                    const slotW = 34, slotH = 34;
                    const gapX = cols > 1 ? Math.max(2, Math.floor((iw - cols * slotW) / (cols - 1))) : 0;
                    const totalW = cols * slotW + (cols - 1) * gapX;
                    const startX = Math.max(0, Math.floor((iw - totalW) / 2));
                    const rowH = slotH + 13 + 3;
                    const slots = m.equipment.map((e, i) => {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        return {
                            slot: e.slot,
                            x: startX + col * (slotW + gapX),
                            y: y + 14 + row * rowH,
                            w: slotW,
                            h: slotH
                        };
                    });
                    L.equipment = { y, slots };
                    y += 14 + rows * rowH + 4;
                }
                if (m.statsShown) {
                    L.stats = { x: 0, y, w: iw, h: 32 };
                    y += 34;
                }
                if (m.grid) {
                    const gx = Math.max(0, Math.floor((iw - cfg.columns * s) / 2));
                    const slots = [];
                    for (let i = 0; i < cfg.columns * cfg.rows; i++) slots.push({ x: gx + (i % cfg.columns) * s, y: y + 14 + Math.floor(i / cfg.columns) * s, w: s, h: s });
                    L.grid = { y, x: gx, w: cfg.columns * s, h: 14 + cfg.rows * s, slots };
                    y += 14 + cfg.rows * s + 4;
                }
                if (m.buttons && m.buttons.length) {
                    L.buttons = [];
                    let bx = 0;
                    for (const b of m.buttons) {
                        const w = b.id === "drop" ? 96 : Math.min(iw - bx, 170);
                        L.buttons.push({ id: b.id, x: bx, y, w, h: 24 });
                        bx += w + 8;
                    }
                    y += 30;
                }
            } else if (activeTab === 2) {
                // PAGE 3: SPELL BOOK (Arcane Spells)
                L.spellbook = { x: 0, y, w: iw, h: 260 };
                y += 264;
            } else if (activeTab === 3) {
                // PAGE 4: PRIEST SCROLL (Divine Spells)
                L.priest = { x: 0, y, w: iw, h: 260 };
                y += 264;
            }
        } else {
            // Non-character objects / animal fallback
            if (m.equipment) {
                const cols = 7;
                const rows = Math.ceil(m.equipment.length / cols);
                const slotW = 34;
                const slotH = 34;
                const gapX = cols > 1 ? Math.max(2, Math.floor((iw - cols * slotW) / (cols - 1))) : 0;
                const totalW = cols * slotW + (cols - 1) * gapX;
                const startX = Math.max(0, Math.floor((iw - totalW) / 2));
                const rowH = slotH + 13 + 3;
                const slots = m.equipment.map((e, i) => {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    return {
                        slot: e.slot,
                        x: startX + col * (slotW + gapX),
                        y: y + 14 + row * rowH,
                        w: slotW,
                        h: slotH
                    };
                });
                L.equipment = { y, slots };
                y += 14 + rows * rowH + 4;
            }
            if (m.statsShown) {
                L.stats = { x: 0, y, w: iw, h: 32 };
                y += 34;
                if (m.capabilities && m.capabilities.length) {
                    L.capabilities = { x: 0, y, w: iw, h: 16 };
                    y += 18;
                }
            }
            if (m.needs) {
                L.needs = { x: 0, y, w: iw, h: 3 * 15 };
                y += 3 * 15 + 4;
            }
            if (m.drops) {
                L.drops = { y, slots: m.drops.map((d, i) => ({ x: i * s, y: y + 14, w: s, h: s })) };
                y += m.drops.length ? 14 + s + 4 : 18;
            }
            if (m.stateLines && m.stateLines.length) {
                L.state = { x: 0, y, w: iw, h: m.stateLines.length * 16 };
                y += m.stateLines.length * 16 + 4;
            }
            if (m.actions) {
                const n = Math.max(1, m.actions.length);
                L.actions = { x: 0, y, w: iw, h: 14 + n * 16 };
                y += 14 + n * 16 + 4;
            }
            if (m.grid) {
                const gx = Math.max(0, Math.floor((iw - cfg.columns * s) / 2));
                const slots = [];
                for (let i = 0; i < cfg.columns * cfg.rows; i++) slots.push({ x: gx + (i % cfg.columns) * s, y: y + 14 + Math.floor(i / cfg.columns) * s, w: s, h: s });
                L.grid = { y, x: gx, w: cfg.columns * s, h: 14 + cfg.rows * s, slots };
                y += 14 + cfg.rows * s + 4;
            }
            if (m.buttons.length) {
                L.buttons = [];
                let bx = 0;
                for (const b of m.buttons) {
                    const w = b.id === "drop" ? 96 : Math.min(iw - bx, 170);
                    L.buttons.push({ id: b.id, x: bx, y, w, h: 24 });
                    bx += w + 8;
                }
                y += 30;
            }
        }
        L.footer = { x: 0, y, w: iw, h: 18 };
        y += 18;
        L.height = y;
        return L;
    }

    //-------------------------------------------------------------------------
    // The panel window

    const perf = { frameMs: 0, openFrames: 0, openMs: 0, closedFrames: 0, closedMs: 0, checks: 0, redraws: 0, bitmaps0: 0 };
    const inRect = (p, r) => !!r && p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h;

    class Window_UFSheet extends Window_Base {
        initialize(rect) {
            this._maxHeight = rect.height;
            Window_Base.prototype.initialize.call(this, rect);
            this.backOpacity = 235;
            this._subject = null;
            this._model = null;
            this._layout = null;
            this._activeTab = 0;
            this._age = 0;
            this._dirty = false;
            this._pending = 0;
            this._drawnIcons = -1;
            this._selSlot = -1;
            this._selEquip = null;
            this._footer = "";
            this.hide();
        }
        contentsHeight() {
            return Math.max(1, (this._maxHeight || this.height) - this.padding * 2);
        }

        subject() { return this._subject; }
        model() { return this._model; }
        layout() { return this._layout; }
        pending() { return this._pending; }
        footer() { return this._footer; }
        activeTab() { return this._activeTab; }

        switchTab(t) {
            if (this._activeTab === t) return;
            this._activeTab = t;
            SoundManager.playCursor();
            this.redraw();
        }

        /** Show a subject (see subjectAt). Returns false when it shows nothing. */
        setSubject(subject) {
            const m = buildModel(subject);
            if (!m) return false;
            const same = this._subject && JSON.stringify(this._subject) === JSON.stringify(m.subject);
            this._subject = m.subject;
            if (!same) {
                this._selSlot = -1;
                this._selEquip = null;
                this._footer = "";
                this._activeTab = 0;
            }
            this._model = m;
            this.redraw();
            this.show();
            this._age = 0;
            return true;
        }
        clearSubject() {
            this._subject = null;
            this._model = null;
            this._selSlot = -1;
            this._selEquip = null;
            this._footer = "";
            this._activeTab = 0;
            this.hide();
        }

        update() {
            if (!this.visible) return; // closed: no work at all (the perf check counts it)
            const t0 = performance.now();
            Window_Base.prototype.update.call(this);
            this.processPanelTouch();
            if (this.visible && this._model && this._model.tabs) {
                if (Input.isTriggered("1") || Input.isTriggered("one")) this.switchTab(0);
                else if (Input.isTriggered("2") || Input.isTriggered("two")) this.switchTab(1);
                else if (Input.isTriggered("3") || Input.isTriggered("three")) this.switchTab(2);
                else if (Input.isTriggered("4") || Input.isTriggered("four")) this.switchTab(3);
            }
            if (this.visible && this._subject) {
                this._age++;
                const iconsChanged = this._pending > 0 && this._drawnIcons !== iconsVersion;
                if (this._age >= CHECK_EVERY || this._dirty || iconsChanged) {
                    const retry = this._pending > 0; // an image or sidecar wasn't in at the last draw: try again on every check
                    this._age = 0;
                    perf.checks++;
                    const m = buildModel(this._subject);
                    if (!m) {
                        Sheet.close();
                    } else if (m.sig !== this._model.sig || this._dirty || iconsChanged || retry) {
                        this._model = m;
                        this.redraw();
                    }
                }
            }
            perf.frameMs += performance.now() - t0;
        }

        // Point of the pointer relative to the window (wx, wy) and to its contents (x, y). The window layer isn't
        // scaled (UF_Camera zooms only the tilemap), so plain offsets are exact, even before the first render.
        localPointer() {
            const layer = this.parent;
            const wx = TouchInput.x - (layer ? layer.x : 0) - this.x, wy = TouchInput.y - (layer ? layer.y : 0) - this.y;
            return { x: wx - this.padding, y: wy - this.padding, wx, wy };
        }
        isPointerInside() {
            if (!this.visible || !this.parent) return false;
            const p = this.localPointer();
            return p.wx >= 0 && p.wy >= 0 && p.wx < this.width && p.wy < this.height;
        }
        // A window drawn over this one (the right-click menu, the ledger, ...) under the pointer takes the click.
        isCoveredAtPointer() {
            const layer = this.parent;
            if (!layer) return false;
            const mx = TouchInput.x - layer.x, my = TouchInput.y - layer.y;
            const i = layer.children.indexOf(this);
            for (let k = i + 1; k < layer.children.length; k++) {
                const w = layer.children[k];
                if (!w || !w.visible || !(w.width > 0) || !(w.height > 0)) continue;
                if (typeof w.isOpen === "function" && !w.isOpen()) continue;
                if (mx >= w.x && my >= w.y && mx < w.x + w.width && my < w.y + w.height) return true;
            }
            return false;
        }

        processPanelTouch() {
            const left = TouchInput.isTriggered(), right = TouchInput.isCancelled();
            if (!left && !right) return;
            const Int = window.UF && UF.Interact;
            if (Int && typeof Int.isOpen === "function" && Int.isOpen()) return; // the menu is modal while it's open
            if (!this.isPointerInside() || this.isCoveredAtPointer()) return;
            consumeClick();
            if (right) {
                Sheet.close(true);
                return;
            }
            const p = this.localPointer(), L = this._layout;
            if (!L) return;
            if (inRect(p, L.close)) {
                Sheet.close(true);
                return;
            }
            if (L.tabs) {
                const t = L.tabs.findIndex(r => inRect(p, r));
                if (t >= 0) return this.switchTab(t);
            }
            if (L.grid) {
                const i = L.grid.slots.findIndex(r => inRect(p, r));
                if (i >= 0) return this.selectSlot(i);
            }
            if (L.equipment) {
                const e = L.equipment.slots.find(r => inRect(p, r));
                if (e) return this.selectEquip(e.slot);
            }
            if (L.drops) {
                const i = L.drops.slots.findIndex(r => inRect(p, r));
                if (i >= 0) return this.showDrop(i);
            }
            if (L.buttons) {
                const b = L.buttons.find(r => inRect(p, r));
                if (b) return this.pressButton(b.id);
            }
        }

        slotText(entry) {
            const I = Items();
            const t = I ? I.type(entry.typeId) : null;
            const tags = t && Array.isArray(t.tags) && t.tags.length ? ` · ${t.tags.join(", ")}` : "";
            return `${t ? t.name : entry.typeId} × ${entry.count}${tags}${entry.equipped ? " · equipped" : ""}`;
        }
        selectSlot(i) {
            const m = this._model;
            const entry = m && m.grid ? m.grid.slots[i] : null;
            this._selSlot = i;
            this._selEquip = null;
            this._footer = entry ? this.slotText(entry) : "Empty slot";
            SoundManager.playCursor();
            this.redraw();
            return entry;
        }
        selectEquip(slot) {
            const FULL_LABELS = {
                mainHand: "Main Hand",
                offHand: "Off Hand",
                ring1: "Ring 1",
                ring2: "Ring 2"
            };
            const e = this._model && this._model.equipment ? this._model.equipment.find(q => q.slot === slot) : null;
            this._selEquip = slot;
            this._selSlot = -1;
            const slotName = FULL_LABELS[slot] || cap(slot);
            this._footer = e && e.typeId ? `${slotName}: ${this.slotText(Object.assign({ equipped: false }, e))}` : `${slotName}: nothing`;
            SoundManager.playCursor();
            this.redraw();
            return e;
        }
        showDrop(i) {
            const d = this._model && this._model.drops ? this._model.drops[i] : null;
            if (d) this._footer = `Drops ${this.slotText({ typeId: d.typeId, count: d.count })}`;
            SoundManager.playCursor();
            this.redraw();
        }
        selectedEntry() {
            const m = this._model;
            return m && m.grid && this._selSlot >= 0 ? m.grid.slots[this._selSlot] : null;
        }
        canDrop() {
            const e = this.selectedEntry();
            return !!e && !e.equipped && !this._model.readOnly;
        }
        pressButton(id) {
            const r = id === "drop" ? Sheet.drop() : id === "pickup" ? Sheet.pickUp() : null;
            if (r) SoundManager.playOk();
            else SoundManager.playBuzzer();
            return r;
        }

        //---------------------------------------------------------------------
        // Drawing (only from setSubject, a selection, or a changed signature; never per frame)

        text(str, x, y, w, h, size, color, align) {
            const c = this.contents;
            c.fontSize = size;
            c.outlineWidth = size <= 12 ? 2 : 3;
            c.textColor = color;
            c.drawText(String(str), x, y, w, h, align || "left");
        }
        drawSlotFrame(r, selected) {
            const c = this.contents;
            c.fillRect(r.x, r.y, r.w, r.h, COLORS.well);
            c.fillRect(r.x, r.y, r.w, 1, COLORS.shade);
            c.fillRect(r.x, r.y, 1, r.h, COLORS.shade);
            c.fillRect(r.x, r.y + r.h - 1, r.w, 1, COLORS.light);
            c.fillRect(r.x + r.w - 1, r.y, 1, r.h, COLORS.light);
            if (selected) {
                c.fillRect(r.x, r.y, r.w, 2, COLORS.select);
                c.fillRect(r.x, r.y + r.h - 2, r.w, 2, COLORS.select);
                c.fillRect(r.x, r.y, 2, r.h, COLORS.select);
                c.fillRect(r.x + r.w - 2, r.y, 2, r.h, COLORS.select);
            }
        }
        drawItemIn(r, typeId, count, equipped) {
            const e = iconFor(itemIconSpec(typeId), r.w - 4);
            if (e && e.state === "ready") this.contents.blt(e.bitmap, 0, 0, e.bitmap.width, e.bitmap.height, r.x + 2, r.y + 2);
            else if (e && e.state === "loading") this._pending++;
            else this.text("?", r.x, r.y, r.w, r.h, 16, COLORS.dim, "center");
            if (count > 1) this.text(count, r.x, r.y + r.h - 15, r.w - 3, 14, 12, COLORS.count, "right");
            if (equipped) this.text("E", r.x + 3, r.y + 1, 10, 12, 10, COLORS.equipped, "left");
        }
        drawPicture(m, L) {
            const c = this.contents, r = L.picture, F = Factions();
            c.fillRect(r.x, r.y, r.w, r.h, COLORS.pictureBack);
            c.fillRect(r.x, r.y, r.w, 1, COLORS.light);
            c.fillRect(r.x, r.y, 1, r.h, COLORS.light);
            c.fillRect(r.x, r.y + r.h - 1, r.w, 1, COLORS.shade);
            c.fillRect(r.x + r.w - 1, r.y, 1, r.h, COLORS.shade);
            const p = m.picture;
            if (!p) return;
            if (p.type === "face") {
                const bmp = ImageManager.loadFace(p.sheet);
                if (!bmp.isReady()) {
                    this._pending++;
                    if (!bmp._ufSheetListening) {
                        bmp._ufSheetListening = true;
                        bmp.addLoadListener(() => { iconsVersion++; });
                    }
                    return;
                }
                const fw = ImageManager.faceWidth, fh = ImageManager.faceHeight;
                const draw = (x, y, S) => c.blt(bmp, (p.index % FACE_COLS) * fw, Math.floor(p.index / FACE_COLS) * fh, fw, fh, x, y, S, S);
                if (p.frame && F && typeof F.drawPortrait === "function") F.drawPortrait(c, r.x, r.y, r.w, p.frame, draw); // VISION V100
                else draw(r.x, r.y, r.w);
            } else if (p.type === "gen") {
                const b = genFace(p.kind, p.color);
                const draw = (x, y, S) => c.blt(b, 0, 0, b.width, b.height, x, y, S, S);
                if (p.frame && F && typeof F.drawPortrait === "function") F.drawPortrait(c, r.x, r.y, r.w, p.frame, draw);
                else draw(r.x, r.y, r.w);
            } else if (p.type === "icon") {
                const e = iconFor(p.spec, PICTURE_ICON);
                if (e && e.state === "ready") c.blt(e.bitmap, 0, 0, PICTURE_ICON, PICTURE_ICON, r.x + (r.w - PICTURE_ICON) / 2, r.y + (r.h - PICTURE_ICON) / 2);
                else if (e && e.state === "loading") this._pending++;
            }
        }
        drawCloseBox(r) {
            const c = this.contents;
            c.fillRect(r.x, r.y, r.w, r.h, "rgba(0, 0, 0, 0.5)");
            c.fillRect(r.x, r.y, r.w, 1, COLORS.light);
            c.fillRect(r.x, r.y + r.h - 1, r.w, 1, COLORS.shade);
            for (let i = 0; i < 10; i++) {
                c.fillRect(r.x + 4 + i, r.y + 4 + i, 2, 2, COLORS.text);
                c.fillRect(r.x + 4 + i, r.y + 13 - i, 2, 2, COLORS.text);
            }
        }
        drawHeader(m, L) {
            const iw = this.innerWidth, c = this.contents;
            this.drawPicture(m, L);
            this.drawCloseBox(L.close);
            this.text(m.title, TEXT_X, 0, iw - TEXT_X - CLOSE - 4, 22, 18, COLORS.text);
            this.text(m.subtitle, TEXT_X, 22, iw - TEXT_X, 16, 12, COLORS.dim);
            if (m.faction !== null) {
                let tx = TEXT_X;
                if (m.stance) {
                    c.fillRect(TEXT_X, 42, 10, 10, "rgba(0, 0, 0, 0.8)");
                    c.fillRect(TEXT_X + 1, 43, 8, 8, m.stance.color);
                    tx += 14;
                }
                this.text(`${m.faction}${m.stance ? ` · ${m.stance.label}` : ""}`, tx, 39, iw - tx, 16, 12, m.stance ? m.stance.color : COLORS.text);
            }
            if (m.doing !== null) this.text(`Doing: ${m.doing}`, TEXT_X, 56, iw - TEXT_X, 16, 12, COLORS.doing);
            if (m.load && L.load) this.drawLoad(m, L);
        }
        // "Carrying 3 logs to the woodpile" (V89): the whole width under the picture; fewer item kinds named if it's too long.
        drawLoad(m, L) {
            const r = L.load, c = this.contents;
            c.fontSize = 13;
            this._loadText = fittedLoadText(m.load, r.w, text => c.measureTextWidth(text));
            this.text(this._loadText, r.x, r.y, r.w, r.h, 13, COLORS.doing);
        }
        drawEquipment(m, L) {
            const sys = ColorManager.systemColor();
            this.text("Equipment", 0, L.equipment.y, 200, 14, 12, sys);
            const SHORT_LABELS = {
                mainHand: "Main",
                offHand: "Off",
                shoulders: "Shldr",
                ring1: "Ring1",
                ring2: "Ring2"
            };
            m.equipment.forEach((e, i) => {
                const r = L.equipment.slots[i];
                this.drawSlotFrame(r, this._selEquip === e.slot);
                if (e.typeId) this.drawItemIn(r, e.typeId, 1, false);
                const lbl = SHORT_LABELS[e.slot] || cap(e.slot);
                this.text(lbl, r.x - 4, r.y + r.h, r.w + 8, 13, 10, COLORS.dim, "center");
            });
        }
        drawStats(m, L) {
            const r = L.stats, sys = ColorManager.systemColor();
            if (!m.stats) {
                this.text("Stats: not rolled yet", 0, r.y + 6, r.w, 18, 12, COLORS.dim);
                return;
            }
            const w = Math.floor(r.w / m.stats.length);
            m.stats.forEach((s, i) => {
                const x = r.x + i * w;
                this.text(s.label, x, r.y, w, 13, 11, sys, "center");
                this.text(`${s.score} ${signed(s.mod)}`, x, r.y + 13, w, 18, 13, COLORS.text, "center");
            });
        }
        drawCapabilities(m, L) {
            if (!m.capabilities || !m.capabilities.length) return;
            const r = L.capabilities;
            const text = "Cap: " + m.capabilities.map(c => `${c.name} ${signed(c.capability)} (${c.profLabel})`).join(" · ");
            this.text(text, r.x, r.y, r.w, r.h, 11, COLORS.doing);
        }
        drawDrops(m, L) {
            const sys = ColorManager.systemColor();
            if (!m.drops.length) {
                this.text("Drops: nothing", 0, L.drops.y, 200, 16, 12, COLORS.dim);
                return;
            }
            this.text("Drops when killed", 0, L.drops.y, 200, 14, 12, sys);
            m.drops.forEach((d, i) => {
                const r = L.drops.slots[i];
                this.drawSlotFrame(r, false);
                this.drawItemIn(r, d.typeId, d.count, false);
            });
        }
        drawState(m, L) {
            m.stateLines.forEach((line, i) => this.text(line, 0, L.state.y + i * 16, L.state.w, 16, 12, COLORS.text));
        }
        drawActions(m, L) {
            const r = L.actions;
            this.text("Actions", 0, r.y, 200, 14, 12, ColorManager.systemColor());
            if (!m.actions.length) this.text("None: nothing to do here", 0, r.y + 14, r.w, 16, 12, COLORS.dim);
            m.actions.forEach((a, i) => this.text(a.text, 0, r.y + 14 + i * 16, r.w, 16, 12, COLORS.text));
        }
        drawGrid(m, L) {
            const g = m.grid;
            const I = Items();
            const isUnit = m.subject && m.subject.kind === "unit";
            let weightInfo = "";
            if (isUnit && I) {
                const curW = I.carriedWeight(m.subject.unitId);
                const maxW = I.maxWeight(m.subject.unitId);
                const enc = typeof I.encumbrance === "function" ? I.encumbrance(m.subject.unitId) : null;
                const encLabel = enc && enc.status === "heavily_encumbered" ? " [HEAVY]" : (enc && enc.status === "encumbered" ? " [ENC]" : (enc && enc.status === "over_capacity" ? " [OVER]" : ""));
                weightInfo = ` · ${curW.toFixed(1)}/${maxW.toFixed(0)} lbs${encLabel}`;
            }
            const title = `${g.title} (${g.total}/${g.slots.length} slots${weightInfo})`;
            this.text(title, L.grid.x, L.grid.y, L.grid.w, 14, 12, ColorManager.systemColor());
            g.slots.forEach((entry, i) => {
                const r = L.grid.slots[i];
                this.drawSlotFrame(r, this._selSlot === i);
                if (entry) this.drawItemIn(r, entry.typeId, entry.count, entry.equipped);
            });
        }
        drawButtons(m, L) {
            const c = this.contents;
            m.buttons.forEach((b, i) => {
                const r = L.buttons[i];
                const enabled = b.id === "drop" ? this.canDrop() : b.enabled !== false;
                c.fillRect(r.x, r.y, r.w, r.h, COLORS.button);
                const edge = enabled ? COLORS.buttonEdge : COLORS.disabled;
                c.fillRect(r.x, r.y, r.w, 1, edge);
                c.fillRect(r.x, r.y + r.h - 1, r.w, 1, edge);
                c.fillRect(r.x, r.y, 1, r.h, edge);
                c.fillRect(r.x + r.w - 1, r.y, 1, r.h, edge);
                this.text(b.label, r.x, r.y, r.w, r.h, 14, enabled ? COLORS.text : COLORS.disabled, "center");
            });
        }

        drawTabs(m, L, activeTab) {
            const c = this.contents;
            L.tabs.forEach((tab, i) => {
                const isActive = (i === activeTab);
                const bg = isActive ? "rgba(45, 40, 60, 0.95)" : "rgba(18, 16, 22, 0.85)";
                const edge = isActive ? COLORS.select : COLORS.disabled;
                c.fillRect(tab.x, tab.y, tab.w, tab.h, bg);
                c.fillRect(tab.x, tab.y, tab.w, 1, edge);
                c.fillRect(tab.x, tab.y + tab.h - 1, tab.w, 1, edge);
                c.fillRect(tab.x, tab.y, 1, tab.h, edge);
                c.fillRect(tab.x + tab.w - 1, tab.y, 1, tab.h, edge);
                this.text(tab.label, tab.x, tab.y + 3, tab.w, tab.h - 4, 11, isActive ? COLORS.select : COLORS.dim, "center");
            });
        }

        drawPageRecord(m, L) {
            const c = this.contents;
            const r = L.record;
            if (!r) return;
            const dnd = m.dnd;
            const sys = ColorManager.systemColor();
            let curY = r.y;

            // 1. Class & Level Banner
            const title = dnd ? `${dnd.name} · Level ${dnd.level || 1} · ${dnd.casterType ? cap(dnd.casterType) : "Martial"}` : "Character Record";
            this.text(title, r.x, curY, r.w, 18, 14, COLORS.select);
            curY += r.bannerH;

            // 2. 6 Ability Scores Table (in classic BG1 box)
            c.fillRect(r.x, curY, r.w, r.statsH, COLORS.well);
            c.fillRect(r.x, curY, r.w, 1, COLORS.shade);
            c.fillRect(r.x, curY + r.statsH - 1, r.w, 1, COLORS.light);
            if (m.stats) {
                const colW = Math.floor(r.w / m.stats.length);
                m.stats.forEach((s, i) => {
                    const sx = r.x + i * colW;
                    this.text(s.label, sx, curY + 2, colW, 13, 11, sys, "center");
                    this.text(`${s.score} ${signed(s.mod)}`, sx, curY + 16, colW, 16, 12, COLORS.text, "center");
                });
            }
            curY += r.statsH + 4;

            // 3. Combat & Vitals (HP, AC, Attack Bonus, Prof)
            c.fillRect(r.x, curY, r.w, r.vitalsH, "rgba(20, 25, 35, 0.7)");
            const vitW = Math.floor(r.w / 4);
            const hpText = dnd ? `HP: ${dnd.hp}/${dnd.hpMax}` : "HP: 10/10";
            const acText = dnd ? `AC: ${dnd.ac}` : "AC: 10";
            const profBonus = dnd ? `+${dnd.proficiencyBonus}` : "+2";
            const primMod = m.stats ? (m.stats.find(s => s.key === (dnd && dnd.primaryAbility ? dnd.primaryAbility[0] : "str")) || { mod: 0 }).mod : 0;
            const atkText = `Atk: ${signed(primMod + 2)}`;

            this.text(hpText, r.x, curY + 2, vitW, 14, 11, "#86efac", "center");
            this.text(`(d${dnd ? dnd.hitDie : 8})`, r.x, curY + 16, vitW, 14, 10, COLORS.dim, "center");

            this.text(acText, r.x + vitW, curY + 2, vitW, 14, 11, COLORS.equipped, "center");
            this.text("Defense", r.x + vitW, curY + 16, vitW, 14, 10, COLORS.dim, "center");

            this.text(atkText, r.x + vitW * 2, curY + 2, vitW, 14, 11, COLORS.doing, "center");
            this.text("Bonus", r.x + vitW * 2, curY + 16, vitW, 14, 10, COLORS.dim, "center");

            this.text(`Prof: ${profBonus}`, r.x + vitW * 3, curY + 2, vitW, 14, 11, COLORS.select, "center");
            this.text("1st Tier", r.x + vitW * 3, curY + 16, vitW, 14, 10, COLORS.dim, "center");
            curY += r.vitalsH + 4;

            // 4. Saving Throws (with * for proficient saves)
            this.text("Saving Throws:", r.x, curY, 90, 14, 11, sys);
            if (m.stats) {
                const saveList = m.stats.map(s => {
                    const isProf = dnd && dnd.savingThrows && dnd.savingThrows.includes(s.key);
                    const bonus = s.mod + (isProf ? (dnd ? dnd.proficiencyBonus : 2) : 0);
                    return `${isProf ? "*" : ""}${s.label} ${signed(bonus)}`;
                }).join("  ");
                this.text(saveList, r.x + 85, curY, r.w - 85, 14, 11, COLORS.text);
            }
            curY += r.savesH;

            // 5. Experience Points & Progression
            const curExp = dnd ? (dnd.exp || 0) : 0;
            const nextExp = dnd ? (dnd.nextExp || 300) : 300;
            this.text(`EXP: ${curExp} / ${nextExp} to Level 2`, r.x, curY, r.w, 14, 11, COLORS.doing);
            const barY = curY + 14;
            c.fillRect(r.x, barY, r.w, 6, "rgba(0, 0, 0, 0.6)");
            const fillW = Math.max(0, Math.min(r.w, Math.floor(r.w * (curExp / nextExp))));
            if (fillW > 0) c.fillRect(r.x, barY, fillW, 6, COLORS.buttonEdge);
            c.fillRect(r.x, barY, r.w, 1, COLORS.shade);
            curY += r.expH;

            // 6. Class Features & Feats
            this.text("Feats & Class Features", r.x, curY, r.w, 14, 11, sys);
            curY += 14;
            if (dnd && dnd.features && dnd.features.length) {
                dnd.features.slice(0, 2).forEach(f => {
                    this.text(`• ${f.name}:`, r.x, curY, r.w, 13, 11, COLORS.select);
                    this.text(f.desc, r.x + 8, curY + 12, r.w - 8, 13, 10, COLORS.dim);
                    curY += 24;
                });
            } else {
                this.text("None at current rank.", r.x, curY, r.w, 14, 11, COLORS.dim);
                curY += 16;
            }

            // 7. Proficiencies & Skills
            this.text("Proficiencies & Skills", r.x, curY, r.w, 14, 11, sys);
            curY += 14;
            const weapons = dnd && dnd.weaponProficiencies ? dnd.weaponProficiencies.slice(0, 2).join(", ") : "Simple";
            const armors = dnd && dnd.armorProficiencies ? dnd.armorProficiencies.join(", ") : "None";
            const skills = dnd && dnd.skills ? dnd.skills.join(", ") : "None";
            this.text(`Weapons: ${weapons} · Armor: ${armors}`, r.x, curY, r.w, 13, 10, COLORS.text);
            this.text(`Skills: ${skills}`, r.x, curY + 13, r.w, 13, 10, COLORS.dim);
            curY += 28;

            // 8. Lifting & Carrying (d20 SRD rulebook)
            const I = Items();
            const curWeight = (m.subject && m.subject.kind === "unit" && I) ? I.carriedWeight(m.subject.unitId) : 0;
            const Dnd = window.UF && UF.Dnd5e;
            const carryCap = (m.subject && m.subject.kind === "unit" && Dnd && typeof Dnd.carryingCapacity === "function")
                ? Dnd.carryingCapacity(m.subject.unitId, null, curWeight)
                : { maxWeight: 150, pushDragLift: 300, encumbered: 50, heavilyEncumbered: 100, status: "unencumbered" };
            this.text("Carrying Capacity (d20 SRD)", r.x, curY, r.w, 14, 11, sys);
            curY += 14;
            const statusColor = carryCap.status === "over_capacity" ? "#ef4444" : (carryCap.status === "heavily_encumbered" ? "#f97316" : (carryCap.status === "encumbered" ? "#eab308" : "#86efac"));
            this.text(`Load: ${curWeight.toFixed(1)} / ${carryCap.maxWeight.toFixed(0)} lbs [${carryCap.status.replace("_", " ").toUpperCase()}]`, r.x, curY, r.w, 13, 11, statusColor);
            curY += 13;
            this.text(`Push/Drag/Lift: ${carryCap.pushDragLift.toFixed(0)} lbs · Encumb: ${carryCap.encumbered.toFixed(0)} lbs`, r.x, curY, r.w, 13, 10, COLORS.dim);
        }

        drawPageInventory(m, L) {
            if (L.equipment) this.drawEquipment(m, L);
            if (L.stats) this.drawStats(m, L);
            if (L.grid) this.drawGrid(m, L);
            if (L.buttons) this.drawButtons(m, L);
        }

        drawPageSpellBook(m, L) {
            const r = L.spellbook, c = this.contents;
            if (!r) return;
            const dnd = m.dnd;
            const isArcane = dnd && dnd.casterType === "arcane";

            // Header Banner
            this.text("MAGE SPELL BOOK (Arcane)", r.x, r.y, r.w, 18, 14, "#7dd3fc");
            if (isArcane) {
                const sub = `Spellcasting: ${dnd.spellAbility.toUpperCase()} · Save DC: ${dnd.spellSaveDC} · Attack: +${dnd.spellAttackBonus}`;
                this.text(sub, r.x, r.y + 18, r.w, 14, 11, COLORS.dim);

                const slots = dnd.spellSlots && dnd.spellSlots[1] ? `[ ${dnd.spellSlots[1].current} / ${dnd.spellSlots[1].max} slots remaining ]` : "[ 0 / 0 slots ]";
                this.text(`Level 1 Spell Slots: ${slots}`, r.x, r.y + 34, r.w, 14, 11, COLORS.doing);

                let curY = r.y + 54;
                // Cantrips
                this.text("Cantrips (At Will):", r.x, curY, r.w, 14, 11, ColorManager.systemColor());
                curY += 16;
                const cantrips = dnd.cantrips && dnd.cantrips.length ? dnd.cantrips : ["Fire Bolt", "Light", "Mage Hand"];
                cantrips.slice(0, 3).forEach(name => {
                    const sp = window.UF && UF.Dnd5e && UF.Dnd5e.spellDef(name);
                    const desc = sp ? `${sp.school}, ${sp.range} · ${sp.desc}` : "Cantrip incantation.";
                    this.text(`• ${name}`, r.x + 4, curY, 90, 13, 11, COLORS.select);
                    this.text(desc, r.x + 95, curY, r.w - 95, 13, 10, COLORS.text);
                    curY += 16;
                });

                curY += 6;
                // 1st Level Spells
                this.text("1st-Level Spells Inscribed:", r.x, curY, r.w, 14, 11, ColorManager.systemColor());
                curY += 16;
                const lvl1 = dnd.level1Spells && dnd.level1Spells.length ? dnd.level1Spells : ["Magic Missile", "Shield", "Mage Armor"];
                lvl1.slice(0, 5).forEach(name => {
                    const sp = window.UF && UF.Dnd5e && UF.Dnd5e.spellDef(name);
                    const desc = sp ? `${sp.school}, ${sp.range}, ${sp.comp} · ${sp.desc}` : "Arcane formula.";
                    this.text(`• ${name}`, r.x + 4, curY, 95, 13, 11, COLORS.select);
                    this.text(desc, r.x + 100, curY, r.w - 100, 13, 10, COLORS.dim);
                    curY += 16;
                });
            } else {
                c.fillRect(r.x, r.y + 30, r.w, 120, COLORS.well);
                this.text("This character is not an arcane spellcaster.", r.x + 10, r.y + 50, r.w - 20, 16, 12, COLORS.text, "center");
                this.text("No spellbook is carried. Arcane study requires Wizard,", r.x + 10, r.y + 72, r.w - 20, 14, 11, COLORS.dim, "center");
                this.text("Sorcerer, Warlock, or Bard training.", r.x + 10, r.y + 88, r.w - 20, 14, 11, COLORS.dim, "center");
                this.text("Arcane scrolls may be read once intelligence is trained.", r.x + 10, r.y + 112, r.w - 20, 14, 11, COLORS.doing, "center");
            }
        }

        drawPagePriestScroll(m, L) {
            const r = L.priest, c = this.contents;
            if (!r) return;
            const dnd = m.dnd;
            const isDivine = dnd && dnd.casterType === "divine";

            // Header Banner
            this.text("PRIEST SCROLL (Divine)", r.x, r.y, r.w, 18, 14, COLORS.select);
            if (isDivine) {
                const sub = `Spellcasting: ${dnd.spellAbility.toUpperCase()} · Save DC: ${dnd.spellSaveDC} · Attack: +${dnd.spellAttackBonus}`;
                this.text(sub, r.x, r.y + 18, r.w, 14, 11, COLORS.dim);

                const slots = dnd.spellSlots && dnd.spellSlots[1] ? `[ ${dnd.spellSlots[1].current} / ${dnd.spellSlots[1].max} prayers remaining ]` : "[ 0 / 0 prayers ]";
                this.text(`Level 1 Prayer Slots: ${slots}`, r.x, r.y + 34, r.w, 14, 11, COLORS.doing);

                let curY = r.y + 54;
                // Orisons / Cantrips
                this.text("Orisons & Miracles (At Will):", r.x, curY, r.w, 14, 11, ColorManager.systemColor());
                curY += 16;
                const cantrips = dnd.cantrips && dnd.cantrips.length ? dnd.cantrips : ["Sacred Flame", "Guidance", "Thaumaturgy"];
                cantrips.slice(0, 3).forEach(name => {
                    const sp = window.UF && UF.Dnd5e && UF.Dnd5e.spellDef(name);
                    const desc = sp ? `${sp.school}, ${sp.range} · ${sp.desc}` : "Divine orison.";
                    this.text(`• ${name}`, r.x + 4, curY, 95, 13, 11, COLORS.doing);
                    this.text(desc, r.x + 100, curY, r.w - 100, 13, 10, COLORS.text);
                    curY += 16;
                });

                curY += 6;
                // 1st Level Prayers
                this.text("1st-Level Divine Prayers Inscribed:", r.x, curY, r.w, 14, 11, ColorManager.systemColor());
                curY += 16;
                const prayers = dnd.level1Spells && dnd.level1Spells.length ? dnd.level1Spells : ["Bless", "Cure Wounds", "Healing Word", "Guiding Bolt"];
                prayers.slice(0, 5).forEach(name => {
                    const sp = window.UF && UF.Dnd5e && UF.Dnd5e.spellDef(name);
                    const desc = sp ? `${sp.school}, ${sp.range}, ${sp.duration} · ${sp.desc}` : "Divine prayer.";
                    this.text(`• ${name}`, r.x + 4, curY, 95, 13, 11, COLORS.select);
                    this.text(desc, r.x + 100, curY, r.w - 100, 13, 10, COLORS.dim);
                    curY += 16;
                });
            } else {
                c.fillRect(r.x, r.y + 30, r.w, 120, COLORS.well);
                this.text("This character has taken no divine vows.", r.x + 10, r.y + 50, r.w - 20, 16, 12, COLORS.text, "center");
                this.text("No priest scroll is inscribed. Divine prayers require Cleric,", r.x + 10, r.y + 72, r.w - 20, 14, 11, COLORS.dim, "center");
                this.text("Druid, or Paladin devotion.", r.x + 10, r.y + 88, r.w - 20, 14, 11, COLORS.dim, "center");
                this.text("Prayers and blessings may be received at sacred shrines.", r.x + 10, r.y + 112, r.w - 20, 14, 11, COLORS.doing, "center");
            }
        }

        redraw() {
            const m = this._model;
            if (!m) return;
            perf.redraws++;
            const cfg = config();
            this._pending = 0;
            this.resetFontSettings();
            this.contents.clear();
            this._loadText = "";
            const activeTab = (m.tabs && this._activeTab !== undefined) ? this._activeTab : 0;
            const L = this._layout = layoutFor(m, this.innerWidth, cfg, activeTab);
            const h = Math.min(this._maxHeight, L.height + this.padding * 2);
            if (this.height !== h) this.height = h;
            this.drawHeader(m, L);

            if (L.tabs) this.drawTabs(m, L, activeTab);

            if (m.tabs) {
                if (activeTab === 0) {
                    this.drawPageRecord(m, L);
                } else if (activeTab === 1) {
                    this.drawPageInventory(m, L);
                } else if (activeTab === 2) {
                    this.drawPageSpellBook(m, L);
                } else if (activeTab === 3) {
                    this.drawPagePriestScroll(m, L);
                }
            } else {
                if (L.equipment) this.drawEquipment(m, L);
                if (L.stats) this.drawStats(m, L);
                if (L.capabilities) this.drawCapabilities(m, L);
                if (L.drops) this.drawDrops(m, L);
                if (L.state) this.drawState(m, L);
                if (L.actions) this.drawActions(m, L);
                if (L.grid) this.drawGrid(m, L);
                if (L.buttons) this.drawButtons(m, L);
            }

            this.text(this._footer || m.hint || "", 0, L.footer.y, L.footer.w, L.footer.h, 12, this._footer ? COLORS.doing : COLORS.dim);
            this._drawnIcons = iconsVersion;
            this._dirty = false;
            this.resetFontSettings();
        }

        /** Pixels with alpha above minAlpha in a rectangle of the contents (tests read what was drawn). */
        opaqueCount(r, minAlpha = 200) {
            if (!r || r.w <= 0 || r.h <= 0) return 0;
            const data = this.contents.context.getImageData(r.x, r.y, r.w, r.h).data;
            let n = 0;
            for (let i = 3; i < data.length; i += 4) if (data[i] > minAlpha) n++;
            return n;
        }
    }

    // Clears this frame's click flags (a click on the panel belongs to the panel), keeping the pointer position.
    function consumeClick() {
        TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false, cancelled: false });
    }

    //-------------------------------------------------------------------------
    // The public object

    const sceneWindow = () => {
        const s = SceneManager._scene;
        return s instanceof Scene_Map && s._ufSheetWindow ? s._ufSheetWindow : null;
    };

    const Sheet = {
        CHECK_EVERY, PANEL_TOP, Window: Window_UFSheet,
        config,
        subjectAt,
        buildModel,
        layoutFor,
        itemIconSpec,
        objectIconSpec,
        /** What a unit carries (V89): { kind, items, to, jobId, text } or null (it carries nothing). Also read by the Overseer's colonist card. */
        loadOf,
        loadText,
        fittedLoadText,
        countedName,
        placeName,
        /** The load line as last drawn on the open panel ("" when none). */
        drawnLoadText: () => {
            const w = sceneWindow();
            return w && w.visible ? w._loadText || "" : "";
        },
        /** The icon entry of an item type at a size ({ state, bitmap }); cached, built once. */
        itemIcon: (typeId, size) => iconFor(itemIconSpec(typeId), size || config().slot - 4),
        window: sceneWindow,
        isOpen() {
            const w = sceneWindow();
            return !!w && w.visible && !!w.subject();
        },
        subject() {
            const w = sceneWindow();
            return w && w.visible ? w.subject() : null;
        },
        model() {
            const w = sceneWindow();
            return w && w.visible ? w.model() : null;
        },
        layout() {
            const w = sceneWindow();
            return w && w.visible ? w.layout() : null;
        },
        pending() {
            const w = sceneWindow();
            return w ? w.pending() : 0;
        },
        footer() {
            const w = sceneWindow();
            return w ? w.footer() : "";
        },
        /**
         * Open the panel: a unit id, { kind: "unit", unitId }, or { kind: "cell", area?, x, y } (area defaults to the one on screen).
         * Returns true when something is shown.
         */
        open(what) {
            // Group selection suppresses inventory window per user directive 2026-09-22
            if (window.UF && UF.Select && typeof UF.Select.selected === "function" && UF.Select.selected().length > 1) {
                return false;
            }
            const w = sceneWindow();
            if (!w) return false;
            let subject = null;
            if (typeof what === "number") subject = { kind: "unit", unitId: what };
            else if (what && what.kind === "unit") subject = { kind: "unit", unitId: what.unitId };
            else if (what && what.kind === "cell") {
                const W = World();
                const area = what.area || (W && W.currentArea());
                if (area) subject = { kind: "cell", area: copyArea(area), x: what.x | 0, y: what.y | 0 };
            }
            if (!subject || !w.setSubject(subject)) return false;
            emit("sheet:opened", w.subject());
            return true;
        },
        /** Open the panel for whatever a click on this cell selects (units first). False on bare ground. */
        openAt(x, y) {
            const W = World();
            const area = W ? W.currentArea() : { x: 0, y: 0 };
            const O = Objects();
            const obj = O ? O.at(x, y) : null;
            const isChest = obj && (obj.id === "chest_wood" || obj.id === "crate_wood" || obj.id === "barrel_wood");
            if (isChest) {
                const C = window.UF && UF.Containers;
                if (C && typeof C.openChestInfo === "function") {
                    return C.openChestInfo(x, y, area);
                }
                return false;
            }
            const s = subjectAt(x, y);
            return s ? Sheet.open(s) : false;
        },
        subjectAt(x, y) {
            return subjectAt(x, y);
        },
        close(withSound) {
            const w = sceneWindow();
            if (!w || !w.visible) return false;
            w.clearSubject();
            if (withSound) SoundManager.playCancel();
            emit("sheet:closed");
            return true;
        },
        selectSlot(i) {
            const w = sceneWindow();
            return w && w.visible ? w.selectSlot(i) : null;
        },
        /** Drop the selected stack of the player's colonist on its cell (UF.Items.putDown). Returns the ground stack or null. */
        drop() {
            const w = sceneWindow(), I = Items(), W = World();
            if (!w || !w.visible || !I || typeof I.putDown !== "function" || !w.canDrop()) return null;
            const s = w.subject(), e = w.selectedEntry();
            const u = s && s.kind === "unit" && W ? W.unit(s.unitId) : null;
            if (!u || !isPlayersColonist(u) || !e) return null;
            const it = I.get(e.itemId);
            if (!it || it.holder !== u.id) return null;
            const ground = I.putDown(it.id, u.area, u.x, u.y);
            if (!ground) return null;
            w._selSlot = -1;
            w._footer = `Dropped ${itemName(ground.type)} at (${u.x},${u.y})`;
            w._dirty = true;
            emit("sheet:dropped", u, ground);
            return ground;
        },
        /** The player's colonist on the panel picks up the first stack lying on its cell (UF.Items.pickUp). Returns the item or null. */
        pickUp() {
            const w = sceneWindow(), I = Items(), W = World();
            if (!w || !w.visible || !I || typeof I.pickUp !== "function") return null;
            const s = w.subject();
            const u = s && s.kind === "unit" && W ? W.unit(s.unitId) : null;
            if (!u || !isPlayersColonist(u) || !u.area) return null;
            const cfg = config();
            if (I.inventoryOf(u.id).length >= cfg.columns * cfg.rows) return null;
            const here = I.atIn(u.area, u.x, u.y);
            if (!here.length || !I.pickUp(here[0].id, u.id)) return null;
            w._footer = `Picked up ${itemName(here[0].type)} × ${here[0].count}`;
            w._dirty = true;
            emit("sheet:pickedUp", u, here[0]);
            return here[0];
        },
        /** A panel rectangle in screen pixels: ("slot", i), ("equip", slotName), ("drop", i), ("button", id), ("close"). */
        screenRect(kind, which) {
            const w = sceneWindow();
            let L = w && w.visible ? w.layout() : null;
            if (!L) return null;
            let r = null;
            if (kind === "slot") {
                if (!L.grid && typeof w.switchTab === "function") {
                    w.switchTab(1);
                    L = w.layout();
                }
                if (L.grid) r = L.grid.slots[which];
            }
            else if (kind === "equip") {
                if (!L.equipment && typeof w.switchTab === "function") {
                    w.switchTab(1);
                    L = w.layout();
                }
                if (L.equipment) {
                    const cfg = config();
                    const target = (cfg.aliases && cfg.aliases[which]) || which;
                    r = L.equipment.slots.find(s => s.slot === which || s.slot === target);
                }
            }
            else if (kind === "drop" && L.drops) r = L.drops.slots[which];
            else if (kind === "button") {
                if (!L.buttons && typeof w.switchTab === "function") {
                    w.switchTab(1);
                    L = w.layout();
                }
                if (L.buttons) r = L.buttons.find(b => b.id === which);
            }
            else if (kind === "close") r = L.close;
            else if (L[kind] && typeof L[kind].x === "number") r = L[kind];
            if (!r) return null;
            const ox = w.x + (w.parent ? w.parent.x : 0) + w.padding, oy = w.y + (w.parent ? w.parent.y : 0) + w.padding;
            return { x: ox + r.x, y: oy + r.y, w: r.w, h: r.h, cx: Math.round(ox + r.x + r.w / 2), cy: Math.round(oy + r.y + r.h / 2) };
        },
        /** Opaque pixels drawn in a layout rectangle of the panel (contents coordinates). */
        opaqueCount(r, minAlpha) {
            const w = sceneWindow();
            return w ? w.opaqueCount(r, minAlpha) : 0;
        },
        /** Per-frame cost of this plugin: { openFrames, openAvgMs, closedFrames, closedAvgMs, checks, redraws, bitmapsMade } since resetPerf(). */
        perf() {
            return {
                openFrames: perf.openFrames, openAvgMs: perf.openFrames ? perf.openMs / perf.openFrames : 0,
                closedFrames: perf.closedFrames, closedAvgMs: perf.closedFrames ? perf.closedMs / perf.closedFrames : 0,
                checks: perf.checks, redraws: perf.redraws, bitmapsMade: bitmapsMade - perf.bitmaps0
            };
        },
        resetPerf() {
            Object.assign(perf, { frameMs: 0, openFrames: 0, openMs: 0, closedFrames: 0, closedMs: 0, checks: 0, redraws: 0, bitmaps0: bitmapsMade });
        },
        bitmapsMade: () => bitmapsMade,
        iconCacheSize: () => icons.size,
        /** The "Inventory" option added to UF_Interact's menu on every cell that holds something (idempotent). */
        withInventoryOption(opts, x, y) {
            if (!Array.isArray(opts) || opts.some(o => o && o.id === "inventory") || !subjectAt(x, y)) return opts;
            const opt = { id: "inventory", label: "Inventory", enabled: true, run: () => (Sheet.openAt(x, y) ? Sheet.subject() : null) };
            const out = opts.slice();
            const look = out.findIndex(o => o && o.id === "look");
            out.splice(look >= 0 ? look : out.length, 0, opt);
            return out;
        }
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Sheet = Sheet;

    //-------------------------------------------------------------------------
    // Engine hooks

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        const cfg = config();
        const pad = $gameSystem.windowPadding();
        const w = Math.min(Graphics.boxWidth - 2 * PANEL_MARGIN, Math.max(Math.round(Graphics.boxWidth / 3), cfg.columns * cfg.slot + 2 * pad));
        const h = Graphics.boxHeight - PANEL_TOP - PANEL_MARGIN;
        this._ufSheetWindow = new Window_UFSheet(new Rectangle(Graphics.boxWidth - w - PANEL_MARGIN, PANEL_TOP, w, h));
        this._windowLayer.addChildAt(this._ufSheetWindow, 0); // under every other window: menus and ledgers draw over it
    };

    // After the original update (which ran the Overseer's select/move and UF_Interact's menu): a left-click on the map
    // opens the panel for what the cell holds; Escape closes it. Map clicks are only read here, never consumed.
    // Whether the click landed on a window is judged before the update, on the windows the player saw when clicking
    // (the Overseer's card appears during the update and may cover the colonist that was just clicked).
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        const t0 = performance.now();
        const click = TouchInput.isTriggered();
        const overUI = click && !!this._ufSheetWindow && pointerOverUI(this);
        perf.frameMs += performance.now() - t0;
        _Scene_Map_update.call(this);
        const t1 = performance.now();
        const w = this._ufSheetWindow;
        if (w) {
            if (w.visible && Input.isTriggered("escape") && !interactBusy()) Sheet.close(true);
            if (click && !overUI && TouchInput.isTriggered()) handleMapClick(this); // still set: nothing on screen took it
        }
        perf.frameMs += performance.now() - t1;
        if (w && w.visible) {
            perf.openFrames++;
            perf.openMs += perf.frameMs;
        } else {
            perf.closedFrames++;
            perf.closedMs += perf.frameMs;
        }
        perf.frameMs = 0;
    };

    function interactBusy() {
        const Int = window.UF && UF.Interact;
        if (!Int) return false;
        if (typeof Int.isOpen === "function" && Int.isOpen()) return true;
        return typeof Int.swallowedFrame === "function" && Int.swallowedFrame() === Graphics.frameCount;
    }
    function pointerOverUI(scene) {
        if (typeof scene.isAnyWindowUnderMouse === "function" && scene.isAnyWindowUnderMouse()) return true;
        const L = window.UF && UF.Look;
        return !!L && typeof L.isOverUI === "function" && L.isOverUI();
    }
    function handleMapClick(scene) {
        if (interactBusy() || !window.$gameMap || ($gameMessage && $gameMessage.isBusy())) return;
        // Group selection suppresses inventory window per user directive 2026-09-22
        if (window.UF && UF.Select && typeof UF.Select.selected === "function" && UF.Select.selected().length > 1) return;
        const x = $gameMap.canvasToMapX(TouchInput.x), y = $gameMap.canvasToMapY(TouchInput.y);
        const s = subjectAt(x, y);
        if (!s) return; // bare ground: nothing opens (the Overseer may have ordered a move there)
        const W = World();
        const u = s.kind === "unit" && W ? W.unit(s.unitId) : null;
        if (Sheet.open(s) && !(u && isPlayersColonist(u))) SoundManager.playCursor(); // the Overseer already sounds for colonists
    }

    // Runtime wraps of other plugins' public functions, installed once they exist (after Scene_Boot.start).
    let wrapped = false;
    function installWraps() {
        if (wrapped) return;
        wrapped = true;
        // Listen to selection changes to pop up inventory on single unit select or close on group/deselect
        if (window.UF && UF.Events && typeof UF.Events.on === "function") {
            UF.Events.on("select:changed", ids => {
                if (Array.isArray(ids)) {
                    if (ids.length === 1) {
                        Sheet.open(ids[0]);
                    } else if (ids.length > 1) {
                        Sheet.close();
                    }
                }
            });
        }
        // The panel counts as a window under the mouse for the Overseer (no select/move through it).
        const _isAny = Scene_Map.prototype.isAnyWindowUnderMouse;
        Scene_Map.prototype.isAnyWindowUnderMouse = function() {
            if (typeof _isAny === "function" && _isAny.call(this)) return true;
            const w = this._ufSheetWindow;
            return !!w && w.visible && w.isPointerInside();
        };
        const Int = window.UF && UF.Interact;
        if (!Int) return;
        // "Inventory" on every cell that holds something: the option list, the menu as opened, and the list after "Back".
        if (typeof Int.optionsFor === "function") {
            const _optionsFor = Int.optionsFor;
            Int.optionsFor = function(x, y) {
                return Sheet.withInventoryOption(_optionsFor.call(this, x, y), x, y);
            };
        }
        if (typeof Int.open === "function") {
            const _open = Int.open;
            Int.open = function(x, y, at) {
                const win = _open.call(this, x, y, at);
                if (win && typeof win.options === "function" && typeof win.setOptions === "function") {
                    const opts = win.options();
                    const withInv = Sheet.withInventoryOption(opts, x, y);
                    if (withInv !== opts) win.setOptions(withInv, win.header());
                }
                return win;
            };
        }
        const Menu = Int.MenuWindow;
        if (Menu && Menu.prototype && typeof Menu.prototype.setOptions === "function") {
            const _setOptions = Menu.prototype.setOptions;
            Menu.prototype.setOptions = function(options, header) {
                const cell = typeof this.cell === "function" ? this.cell() : null;
                const topLevel = Array.isArray(options) && options.some(o => o && o.id === "look") && !options.some(o => o && o.id === "back");
                const list = cell && topLevel ? Sheet.withInventoryOption(options, cell.x, cell.y) : options;
                return _setOptions.call(this, list, header);
            };
        }
    }
    Sheet.installWraps = installWraps;

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        installWraps();
        if (window.UF && UF.Test && UF.Test.write) UF.Test.write("DEBUG_SHEET: Scene_Boot.start called");
        if (window.UF && UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "sheet"; run it by name)

    function registerChecks() {
        UF.Test.suite("sheet", async t => {
            await t.waitUntil(() => !!(World() && World().currentArea && World().currentArea() && window.$colonyManager && Sheet.window()), 10000, "world, area, colony manager and sheet window").catch(() => {});
            const W = World(), O = Objects(), I = Items(), J = Jobs(), F = Factions();
            const C = window.UF.Colonists, Int = window.UF.Interact, Time = window.UF.Time, Cam = window.UF.Camera;
            const scene = SceneManager._scene;
            const win = Sheet.window();
            const area = W && W.currentArea();
            const ready = !!(W && O && I && J && F && Int && area && win && scene instanceof Scene_Map && window.$colonyManager);
            t.check("sheet_ready", ready, `World ${!!W}, Objects ${!!O}, Items ${!!I}, Jobs ${!!J}, Factions ${!!F}, Interact ${!!Int}, Overseer ${!!window.$colonyManager}, area ${JSON.stringify(area)}, panel window ${!!win}`);
            if (!ready) return;
            const errors0 = t.errorsSoFar().length;
            const fx = {
                units: [], placed: [], jobsBefore: new Set(J.list().map(j => j.id)), itemsBefore: new Set(Object.keys(I.state().byId)),
                mouse: {}, wasPaused: !!(Time && Time.paused), colonistsOn: C && typeof C.isEnabled === "function" ? C.isEnabled() : null,
                level: Cam && typeof Cam.level === "function" ? Cam.level() : null, player: { x: $gamePlayer.x, y: $gamePlayer.y },
                display: { x: $gameMap.displayX(), y: $gameMap.displayY() }
            };
            // The checks drive the mouse; the real pointer must not move it meanwhile (restored at the end).
            for (const k of ["_onHover", "_onMove", "_onTrigger", "_onCancel", "_onRelease"]) {
                fx.mouse[k] = TouchInput[k];
                TouchInput[k] = () => {};
            }
            try {
                await runChecks(t, fx, { W, O, I, J, F, C, Int, Time, Cam, scene, win, area });
            } finally {
                cleanup(fx, { W, O, I, J, C, Time, Cam });
            }
            await t.waitFrames(3);
            const errs = t.errorsSoFar().slice(errors0);
            t.check("no_errors", errs.length === 0, errs.length ? `${errs.length} error(s), first: ${errs[0]}` : "none during the sheet checks");
        }, { isDefault: false });
    }

    function cleanup(fx, k) {
        try { Sheet.close(); } catch (e) { /* the scene may be gone */ }
        if (k.Int && k.Int.isOpen && k.Int.isOpen()) k.Int.close();
        if (window.$colonyManager) $colonyManager.deselect();
        for (const u of fx.units) if (k.W.unit(u.id)) k.W.removeUnit(u.id);
        for (const j of k.J.list()) if (!fx.jobsBefore.has(j.id) && j.state !== "done" && j.state !== "failed") k.J.cancel(j.id, "test over");
        for (const id of Object.keys(k.I.state().byId)) if (!fx.itemsBefore.has(id)) k.I.remove(Number(id));
        for (const p of fx.placed.slice().reverse()) k.O.set(p.x, p.y, p.was || null);
        for (const key of Object.keys(fx.mouse)) TouchInput[key] = fx.mouse[key];
        TouchInput._x = 0;
        TouchInput._y = 0;
        if (k.C && fx.colonistsOn !== null && typeof k.C.setEnabled === "function") k.C.setEnabled(fx.colonistsOn);
        if (k.Time) {
            if (fx.wasPaused && !k.Time.paused) k.Time.pause();
            if (!fx.wasPaused && k.Time.paused) k.Time.resume();
        }
        if (k.Cam && fx.level !== null) k.Cam.setLevel(fx.level);
        $gamePlayer.locate(fx.player.x, fx.player.y);
        $gameMap.setDisplayPos(fx.display.x, fx.display.y);
    }

    async function runChecks(t, fx, k) {
        const { W, O, I, J, F, C, Int, Time, Cam, scene, win, area } = k;
        const cm = window.$colonyManager;
        const mid = Math.floor(W.state.size / 2);
        const put = (x, y, id) => {
            fx.placed.push({ x, y, was: O.typeIdAt(x, y) });
            return O.set(x, y, id);
        };
        const typeOr = (...ids) => ids.find(id => id && I.type(id)) || null;

        // World still, colonist decisions off, zoom 1.
        if (Time && !Time.paused) Time.pause();
        if (C && typeof C.setEnabled === "function") C.setEnabled(false);
        if (Cam) Cam.setLevel(0);
        cm.cameraFollowUnit = null;
        await t.waitFrames(2);

        // An arena of 9 x 7 cells of open land near the centre: no water, no units, no items; objects cleared (restored after).
        const water = (x, y) => (typeof J.isWaterAt === "function" ? J.isWaterAt(area, x, y) : Tilemap.isWaterTile($gameMap.tileId(x, y, 0)));
        const cellOk = (x, y) => $gameMap.isValid(x, y) && !water(x, y) && $gameMap.regionId(x, y) !== 250 && $gameMap.checkPassage(x, y, 0x0f)
            && $gameMap.eventsXy(x, y).length === 0 && I.at(x, y).length === 0;
        const candidates = [[-4, 14], [-4, -22], [14, -3], [-24, -3], [14, 14], [-24, 14], [14, -22], [-24, -22], [-4, 28], [-4, -34], [28, -3], [-36, -3]];
        let arena = null, best = null;
        for (const [dx, dy] of candidates) {
            const x0 = mid + dx, y0 = mid + dy;
            let good = 0;
            for (let y = y0; y < y0 + 7; y++) for (let x = x0; x < x0 + 9; x++) if (cellOk(x, y)) good++;
            if (!best || good > best.good) best = { x0, y0, good };
            if (good === 63) { arena = best; break; }
        }
        if (!arena) arena = best;
        const { x0, y0 } = arena;
        for (let y = y0; y < y0 + 7; y++) for (let x = x0; x < x0 + 9; x++) if (O.typeIdAt(x, y)) put(x, y, null);
        $gamePlayer.locate(x0 + 7, y0 + 3);
        $gameMap.setDisplayPos(x0 - 1, y0 - 2);
        await t.waitFrames(2);

        const zoom = () => (Cam ? Cam.zoom() : 1);
        const screenOfCell = (x, y) => ({ x: Math.round(($gameMap.adjustX(x) + 0.5) * $gameMap.tileWidth() * zoom()), y: Math.round(($gameMap.adjustY(y) + 0.5) * $gameMap.tileHeight() * zoom()) });
        const clickScreen = async (sx, sy, right) => {
            TouchInput._x = sx;
            TouchInput._y = sy;
            if (right) {
                TouchInput._newState.cancelled = true;
                TouchInput._currentState.cancelled = true;
            } else {
                TouchInput._newState.triggered = true;
                TouchInput._currentState.triggered = true;
                TouchInput._triggerX = sx;
                TouchInput._triggerY = sy;
            }
            await t.waitFrames(1); // read on this frame
            await t.waitFrames(1); // and gone on the next
        };
        const clickCell = async (x, y, right) => {
            const p = screenOfCell(x, y);
            await clickScreen(p.x, p.y, right);
            return p;
        };
        const clickRect = r => (r ? clickScreen(r.cx, r.cy) : Promise.resolve());
        const waitDrawn = () => t.waitUntil(() => Sheet.isOpen() && Sheet.pending() === 0, 8000, "the panel's icons and face to load").catch(() => {});
        const inner = r => ({ x: r.x + 3, y: r.y + 3, w: r.w - 6, h: r.h - 6 });
        const filled = r => Sheet.opaqueCount(inner(r)) >= 12;
        const panelPlaced = () => win.visible && win.parent === scene._windowLayer && win.x >= Graphics.boxWidth / 2 && win.x + win.width <= Graphics.boxWidth
            && win.y >= PANEL_TOP && win.y + win.height <= Graphics.boxHeight;
        const statsRight = (m, want) => !!m.stats && m.stats.length === 6 && m.stats.every(s => s.score === want[s.key] && s.mod === Math.floor((want[s.key] - 10) / 2));
        // Screenshots without UF_Look's cursor tooltip (it draws over every window, next to the simulated pointer).
        const Look = window.UF.Look;
        const shot = async name => {
            const was = Look ? Look.enabled : null;
            if (Look) Look.enabled = false;
            await t.waitFrames(2);
            t.screenshot(name);
            if (Look) Look.enabled = was;
        };

        // Fixtures: one of your colonists, a stranger of another faction, a deer, a stockpile with 3 stacks, an oak, a pile.
        const pid = F.playerId();
        const pf = F.get(pid);
        const other = F.all().find(f => f.id !== pid) || null;
        const cat = catalog();
        const sheetOk = name => !!name && fileExists(`img/characters/${name}.png`);
        const imageOf = sp => { const p = cat.people && cat.people[sp]; return p && Array.isArray(p.images) && sheetOk(p.images[0]) ? p.images[0] : "People1"; };
        const deerSp = wildSpecies("deer") || cat.wildlife.species.find(s => s.yields && Object.keys(s.yields).length >= 2) || cat.wildlife.species[0];
        const deerImage = sheetOk(deerSp.image) ? deerSp.image : "People1";
        const colStats = { str: 14, dex: 12, con: 15, int: 9, wis: 8, cha: 13 };
        const strStats = { str: 11, dex: 16, con: 10, int: 12, wis: 7, cha: 18 };
        const deerStats = { str: 14, dex: 15, con: 12, int: 2, wis: 12, cha: 5 };
        // Screen rows 3-5 at zoom 1: clear of the colonist card (bottom-left) and of the clock and time controls (top-right).
        const cell = { col: { x: x0 + 1, y: y0 + 1 }, str: { x: x0 + 3, y: y0 + 1 }, deer: { x: x0 + 5, y: y0 + 1 }, pile: { x: x0 + 1, y: y0 + 3 },
            oak: { x: x0 + 3, y: y0 + 3 }, loose: { x: x0 + 5, y: y0 + 3 }, bare: { x: x0 + 5, y: y0 + 2 } };
        const col = W.addUnit({ name: "TEST_SheetColonist", image: { characterName: imageOf(pf ? pf.species : "human"), characterIndex: 0 }, area, x: cell.col.x, y: cell.col.y, dir: 2,
            data: { kind: "colonist", faction: pid, species: pf ? pf.species : "human", gender: "male", ai: null, stats: colStats,
                needs: { hunger: 30, thirst: 40, sleep: 20, social: 50, nature: 10 }, mood: "Content", moodScore: 20, inventory: [], equipment: { tool: null, clothes: null },
                thoughts: [], facets: {}, skills: {}, tier: 0 } });
        fx.units.push(col);
        const tLog = typeOr("log"), tStone = typeOr("stone"), tBerry = typeOr("berries", "fruit");
        const tAxe = typeOr("stone_axe") || (I.types().find(ty => ty.tool) || {}).id;
        const tWrap = typeOr("fiber_wrap") || (I.types().find(ty => ty.wear) || {}).id;
        I.give(tLog, 5, col.id);
        I.give(tStone, 3, col.id);
        I.give(tBerry, 2, col.id);
        const axe = I.give(tAxe, 1, col.id)[0];
        const wrap = I.give(tWrap, 1, col.id)[0];
        col.data.equipment = { tool: axe.id, clothes: wrap.id };
        const tWeapon = (I.types().find(ty => ty.weapon && !ty.tool) || I.types().find(ty => ty.weapon) || {}).id;
        const tArmor = (I.types().find(ty => ty.armor && ty.armor.slot === "torso") || {}).id;
        const str = W.addUnit({ name: "TEST_SheetStranger", image: { characterName: imageOf(other ? other.species : "human"), characterIndex: 0 }, area, x: cell.str.x, y: cell.str.y, dir: 2,
            data: { kind: "person", faction: other ? other.id : "TEST_nobody", species: other ? other.species : "human", gender: "female", ai: null, stats: strStats,
                inventory: [], equipment: { weapon: tWeapon || null, torso: tArmor || null } } });
        fx.units.push(str);
        I.give(typeOr("hide", "leather"), 2, str.id);
        I.give(typeOr("bone", "stone"), 3, str.id);
        const deer = W.addUnit({ name: "TEST_SheetDeer", image: { characterName: deerImage, characterIndex: 0 }, area, x: cell.deer.x, y: cell.deer.y, dir: 2,
            data: { kind: "creature", species: deerSp.id, tags: [deerSp.kind], faction: null, ai: null, stats: deerStats } });
        fx.units.push(deer);
        put(cell.pile.x, cell.pile.y, "stockpile");
        const pileStacks = [I.drop(area, cell.pile.x, cell.pile.y, tLog, 3)[0], I.drop(area, cell.pile.x, cell.pile.y, tStone, 4)[0], I.drop(area, cell.pile.x, cell.pile.y, tBerry, 2)[0]];
        const oakType = O.type("oak") || O.types().find(ty => tagsOf(ty).includes("tree") && ty.actions && ty.actions.chop);
        put(cell.oak.x, cell.oak.y, oakType.id);
        const loose = I.drop(area, cell.loose.x, cell.loose.y, tLog, 2)[0];
        await t.waitFrames(3);
        const panelLeft = win.x + (win.parent ? win.parent.x : 0);
        const cardTop = scene._colonyCard ? scene._colonyCard.y : Graphics.boxHeight;
        const cellsClear = Object.keys(cell).every(key => {
            const p = screenOfCell(cell[key].x, cell[key].y);
            return p.x < panelLeft - 8 && p.y < cardTop - 8 && p.y > PANEL_TOP && $gameMap.canvasToMapX(p.x) === cell[key].x && $gameMap.canvasToMapY(p.y) === cell[key].y;
        });
        t.check("fixtures", arena.good === 63 && cellsClear && !!col && !!str && !!deer && !!axe && !!wrap && !!oakType && pileStacks.every(Boolean),
            `arena (${x0},${y0}) 9x7 with ${arena.good}/63 open cells; every fixture cell left of the panel (x ${panelLeft}) and maps back to itself: ${cellsClear}; stranger's faction ${other ? other.name : "none"}; deer species ${deerSp.id}; oak type ${oakType && oakType.id}`);

        // sheet.colonist: a click on the colonist opens the panel with its inventory, equipment, stats, needs.
        await clickCell(col.x, col.y);
        const openedOnCol = Sheet.isOpen() && Sheet.subject().kind === "unit" && Sheet.subject().unitId === col.id;
        await waitDrawn();
        const showInventoryTab = () => {
            if (win && typeof win.switchTab === "function") win.switchTab(1);
        };
        showInventoryTab();
        await waitDrawn();
        await t.waitFrames(2);
        let m = Sheet.model(), L = Sheet.layout();
        const inv = I.inventoryOf(col.id);
        const shown = m ? m.grid.slots.filter(Boolean) : [];
        const sameStacks = !!m && shown.length === inv.length && inv.every((it, i) => m.grid.slots[i] && m.grid.slots[i].itemId === it.id && m.grid.slots[i].count === it.count && m.grid.slots[i].typeId === it.type)
            && inv.length === col.data.inventory.length && inv.every((it, i) => col.data.inventory[i] === it.id);
        const gridDrawn = !!L && !!L.grid && L.grid.slots.map(r => filled(r));
        const gridPixelsOk = !!gridDrawn && gridDrawn.slice(0, inv.length).every(Boolean) && gridDrawn.slice(inv.length).every(v => !v);
        const eq = m && m.equipment ? Object.fromEntries(m.equipment.map(e => [e.slot, e])) : {};
        const weaponSlot = eq.mainHand || eq.weapon;
        const torsoSlot = eq.torso || eq.clothes;
        const headSlot = eq.head;
        const shieldSlot = eq.offHand || eq.shield;
        const legsSlot = eq.feet || eq.legs;
        const eqOk = !!weaponSlot && weaponSlot.itemId === axe.id && !!torsoSlot && torsoSlot.itemId === wrap.id && !headSlot.typeId && !shieldSlot.typeId && !legsSlot.typeId;
        const eqPixels = !!L && L.equipment ? Object.fromEntries(L.equipment.slots.map(r => [r.slot, filled(r)])) : {};
        const weaponDrawn = eqPixels.mainHand || eqPixels.weapon;
        const torsoDrawn = eqPixels.torso || eqPixels.clothes;
        const headDrawn = eqPixels.head;
        const shieldDrawn = eqPixels.offHand || eqPixels.shield;
        const legsDrawn = eqPixels.feet || eqPixels.legs;
        const eqDrawn = weaponDrawn && torsoDrawn && !headDrawn && !shieldDrawn && !legsDrawn;
        const statsOk = !!m && statsRight(m, colStats) && !!L.stats && Sheet.opaqueCount(L.stats, 150) >= 60;
        const needsOk = !!m && m.needs === null && m.mood === null;
        const faceOk = !!m && !!L && Sheet.opaqueCount(L.picture) >= 1000;
        const placed = panelPlaced();
        await t.waitFrames(2);
        const colDrop = Sheet.screenRect("button", "drop");
        await shot("colonist");
        t.check("colonist", openedOnCol && sameStacks && gridPixelsOk && eqOk && eqDrawn && statsOk && needsOk && faceOk && placed && !!m && !m.readOnly && m.kind === "colonist",
            `click at the colonist's cell (${col.x},${col.y}) -> panel open on it: ${openedOnCol}; kind ${m && m.kind}, read-only ${m && m.readOnly}; ` +
            `grid ${shown.map(s => `${s.typeId}x${s.count}${s.equipped ? "(E)" : ""}`).join(", ")} vs data.inventory ${inv.map(it => `${it.type}x${it.count}`).join(", ")} -> same stacks in order ${sameStacks}; ` +
            `slots drawn ${gridDrawn ? gridDrawn.slice(0, inv.length + 2).map(v => (v ? "#" : ".")).join("") : "?"} (want ${"#".repeat(inv.length)}..) ${gridPixelsOk}; ` +
            `equipment weapon ${weaponSlot && weaponSlot.typeId} via ${weaponSlot && weaponSlot.via}, torso ${torsoSlot && torsoSlot.typeId} via ${torsoSlot && torsoSlot.via}: ${eqOk}, drawn ${JSON.stringify(eqPixels)}; ` +
            `stats ${m && m.stats ? m.stats.map(s => `${s.label} ${s.score} ${signed(s.mod)}`).join(" ") : "none"} ${statsOk}; needs ${m && m.needs ? "present" : "pruned"} ${needsOk}; ` +
            `face ${m && m.picture ? JSON.stringify(m.picture) : "none"} drawn ${faceOk}; panel at (${win.x},${win.y}) ${win.width}x${win.height} in the right part of ${Graphics.boxWidth}x${Graphics.boxHeight}: ${placed}`);

        // sheet.overseer_intact: the same click selected the colonist in the Overseer; right-click orders a move; a panel click doesn't.
        const selectedByClick = !!cm.selectedColonist && cm.selectedColonist.id === col.id;
        const cardShown = !scene._colonyCard || scene._colonyCard.visible;
        await clickCell(cell.bare.x, cell.bare.y, true);
        const move = J.of(col.id);
        const moved = !!move && move.type === "move" && move.owner === col.id && move.target.x === cell.bare.x && move.target.y === cell.bare.y && move.state !== "failed";
        const stayed = Sheet.isOpen() && Sheet.subject().unitId === col.id;
        const emptySlot = Sheet.screenRect("slot", inv.length + 1);
        await clickRect(emptySlot);
        const after = J.of(col.id);
        const panelClickIgnored = after === move && !!cm.selectedColonist && cm.selectedColonist.id === col.id && Sheet.isOpen();
        t.check("overseer_intact", selectedByClick && cardShown && moved && stayed && panelClickIgnored,
            `click on the colonist: Overseer selected ${cm.selectedColonist ? cm.selectedColonist.name : "nobody"} (${selectedByClick}), card shown ${cardShown}; ` +
            `right-click on bare ground (${cell.bare.x},${cell.bare.y}) with it selected: job ${move ? `${move.type} #${move.id} owner ${move.owner} to (${move.target.x},${move.target.y}) ${move.state}` : "none"} -> ${moved}; panel still on the colonist ${stayed}; ` +
            `click on an empty grid slot of the panel at (${emptySlot && emptySlot.cx},${emptySlot && emptySlot.cy}): job unchanged ${after === move}, still selected ${!!cm.selectedColonist}, panel open ${Sheet.isOpen()}`);
        if (move) J.cancel(move.id, "test over");
        cm.deselect();

        // sheet.stranger_readonly: another faction's person: its grid, no buttons, clicks change nothing.
        await clickCell(str.x, str.y);
        await waitDrawn();
        showInventoryTab();
        await t.waitFrames(2);
        m = Sheet.model();
        L = Sheet.layout();
        const strInv = I.inventoryOf(str.id);
        const strShown = m ? m.grid.slots.filter(Boolean) : [];
        const strEq = m && m.equipment ? Object.fromEntries(m.equipment.map(e => [e.slot, e])) : {};
        const strWeapon = strEq.mainHand || strEq.weapon;
        const strTorso = strEq.torso || strEq.clothes;
        const invBefore = JSON.stringify(strInv.map(it => [it.id, it.holder, it.count]));
        await clickRect(Sheet.screenRect("slot", 0));
        const footer0 = Sheet.footer();
        // Where the colonist's Drop button was (still inside this panel, else its footer): nothing may happen there.
        const target = colDrop && colDrop.cy < win.y + win.height - 4 ? colDrop : Sheet.screenRect("footer");
        await clickRect(target);
        const invAfter = JSON.stringify(I.inventoryOf(str.id).map(it => [it.id, it.holder, it.count]));
        const strOk = !!m && m.subject.unitId === str.id && m.kind === "stranger" && m.readOnly && m.buttons.length === 0 && !L.buttons
            && strShown.length === strInv.length && strInv.every((it, i) => m.grid.slots[i].itemId === it.id) && invAfter === invBefore && I.at(str.x, str.y).length === 0
            && (!tWeapon || (strWeapon && strWeapon.typeId === tWeapon)) && (!tArmor || (strTorso && strTorso.typeId === tArmor)) && footer0.includes(itemName(strInv[0].type));
        t.check("stranger_readonly", strOk,
            `panel on ${m && m.title} (${m && m.subtitle}; ${m && m.faction}${m && m.stance ? ` · ${m.stance.label}` : ""}): kind ${m && m.kind}, read-only ${m && m.readOnly}, buttons ${m ? m.buttons.length : "?"}; ` +
            `grid ${strShown.map(s => `${s.typeId}x${s.count}`).join(", ")} vs inventory ${strInv.map(it => `${it.type}x${it.count}`).join(", ")}; equipment from type ids: weapon ${strWeapon && strWeapon.typeId} (want ${tWeapon}), torso ${strTorso && strTorso.typeId} (want ${tArmor}); ` +
            `slot click footer "${footer0}"; click where Drop would be at (${target && target.cx},${target && target.cy}): inventory unchanged ${invAfter === invBefore}, nothing on its cell ${I.at(str.x, str.y).length === 0}`);

        // sheet.animal: species, stats with modifiers rounded down, drops from the catalog yields.
        await clickCell(deer.x, deer.y);
        await waitDrawn();
        await t.waitFrames(2);
        m = Sheet.model();
        L = Sheet.layout();
        const yields = Object.keys(deerSp.yields || {}).map(id => [id, deerSp.yields[id] | 0]);
        const dropsOk = !!m && Array.isArray(m.drops) && m.drops.length === yields.length && yields.every(([id, n], i) => m.drops[i].typeId === id && m.drops[i].count === n);
        const dropsDrawn = !!L && !!L.drops && L.drops.slots.length === yields.length && L.drops.slots.every(r => filled(r));
        const animalEqOk = !!m && Array.isArray(m.equipment) && m.equipment.length === 14;
        const animalOk = !!m && m.subject.unitId === deer.id && m.kind === "animal" && m.readOnly && m.subtitle.includes(deerSp.name) && statsRight(m, deerStats)
            && animalEqOk && dropsOk && dropsDrawn && Sheet.opaqueCount(L.stats, 150) >= 60 && Sheet.opaqueCount(L.picture) >= 1000;
        showInventoryTab();
        await t.waitFrames(2);
        await shot("animal");
        t.check("animal", animalOk,
            `panel on ${m && m.title}: "${m && m.subtitle}", kind ${m && m.kind}, read-only ${m && m.readOnly}, equipment ${m && Array.isArray(m.equipment) ? `${m.equipment.length} slots` : "none"}; ` +
            `stats ${m && m.stats ? m.stats.map(s => `${s.label} ${s.score} ${signed(s.mod)}`).join(" ") : "none"} (int 2 -> -4, cha 5 -> -3 when rounded down); ` +
            `drops ${m && m.drops ? m.drops.map(d => `${d.typeId}x${d.count}`).join(", ") : "none"} vs catalog ${yields.map(([id, n]) => `${id}x${n}`).join(", ")} -> ${dropsOk}, drawn ${dropsDrawn}; face ${m && JSON.stringify(m.picture)}`);

        // sheet.stockpile: 3 stacks on a stockpile cell -> a grid of exactly 3.
        await clickCell(cell.pile.x, cell.pile.y);
        await waitDrawn();
        await t.waitFrames(2);
        m = Sheet.model();
        L = Sheet.layout();
        const pileShown = m && m.grid ? m.grid.slots.filter(Boolean) : [];
        const pileIds = pileStacks.map(it => it.id).sort((a, b) => a - b).join(",");
        const pileDrawn = !!L && !!L.grid && L.grid.slots.map(r => filled(r));
        const pileOk = !!m && m.kind === "stockpile" && pileShown.length === 3 && pileShown.map(s => s.itemId).sort((a, b) => a - b).join(",") === pileIds
            && !!pileDrawn && pileDrawn.slice(0, 3).every(Boolean) && pileDrawn.slice(3).every(v => !v);
        await shot("stockpile");
        t.check("stockpile", pileOk,
            `panel on (${cell.pile.x},${cell.pile.y}): "${m && m.title}" kind ${m && m.kind}; grid ${pileShown.map(s => `${s.typeId}x${s.count}`).join(", ")} (want the 3 stacks ${pileStacks.map(it => `${it.type}x${it.count}`).join(", ")}); ` +
            `slots drawn ${pileDrawn ? pileDrawn.slice(0, 5).map(v => (v ? "#" : ".")).join("") : "?"} (want ###..); state ${m && m.stateLines ? m.stateLines.join(" | ") : ""}`);

        // sheet.object: a tree has no grid; its catalog actions are listed.
        await clickCell(cell.oak.x, cell.oak.y);
        await waitDrawn();
        await t.waitFrames(2);
        m = Sheet.model();
        L = Sheet.layout();
        const wantActs = Object.keys(oakType.actions || {});
        const oakPictureOk = !!m && m.picture && m.picture.type === "face" && Sheet.opaqueCount(L.picture) >= 1000;
        await shot("oak_sheet");
        const objOk = !!m && m.kind === "object" && m.title === oakType.name && m.grid === null && !L.grid && Array.isArray(m.actions) && wantActs.length > 0
            && wantActs.every(a => m.actions.some(x => x.id === a)) && !!L.actions && Sheet.opaqueCount(L.actions, 150) >= 60 && oakPictureOk;
        t.check("object", objOk,
            `panel on the ${oakType.name} at (${cell.oak.x},${cell.oak.y}): kind ${m && m.kind}, grid ${m && m.grid ? "SHOWN" : "none"}; picture ${m && JSON.stringify(m.picture)} (drawn ${oakPictureOk}); state ${m && m.stateLines ? m.stateLines.join(" | ") : ""}; ` +
            `actions ${m && m.actions ? m.actions.map(a => `"${a.text}"`).join(", ") : "none"} (catalog: ${wantActs.join(", ")})`);

        // sheet.menu_option: "Inventory" in the right-click menu on a unit's cell and an items cell, not on bare ground; choosing it opens the panel.
        Sheet.close();
        const has = list => list.some(o => o.id === "inventory" && o.label === "Inventory");
        const optCol = Int.optionsFor(col.x, col.y), optLoose = Int.optionsFor(cell.loose.x, cell.loose.y), optBare = Int.optionsFor(cell.bare.x, cell.bare.y);
        const menu = Int.open(cell.loose.x, cell.loose.y, screenOfCell(cell.loose.x, cell.loose.y));
        const labels = menu ? menu.labels() : [];
        const chosen = Int.choose("Inventory");
        await t.waitFrames(2);
        m = Sheet.model();
        const menuOk = has(optCol) && has(optLoose) && !has(optBare) && labels.includes("Inventory") && !!chosen && !Int.isOpen() && !!m && m.kind === "items"
            && m.grid.slots.filter(Boolean).length === 1 && m.grid.slots[0].itemId === loose.id;
        t.check("menu_option", menuOk,
            `options on the colonist's cell: ${optCol.map(o => o.label).join(" / ")}; on the log pile: ${optLoose.map(o => o.label).join(" / ")}; on bare ground: ${optBare.map(o => o.label).join(" / ")}; ` +
            `the menu opened on the pile lists ${labels.join(" / ")}; choosing "Inventory" -> panel ${m ? `${m.kind} "${m.title}" with ${m.grid ? m.grid.slots.filter(Boolean).length : 0} stack(s)` : "closed"}, menu closed ${!Int.isOpen()}`);

        // sheet.drop_pickup: select the stone stack, Drop -> on the colonist's cell; Pick up -> back; an equipped stack can't be dropped.
        Sheet.open(col.id);
        await waitDrawn();
        showInventoryTab();
        await t.waitFrames(2);
        const stone = I.inventoryOf(col.id).find(it => it.type === tStone);
        const stoneIdx = I.inventoryOf(col.id).findIndex(it => it.id === stone.id);
        const n0 = I.inventoryOf(col.id).length;
        await clickRect(Sheet.screenRect("slot", stoneIdx));
        const footer1 = Sheet.footer();
        const tagsStone = (I.type(tStone).tags || []);
        const footerOk = footer1.includes(itemName(tStone)) && footer1.includes(String(stone.count)) && tagsStone.every(tag => footer1.includes(tag));
        await clickRect(Sheet.screenRect("button", "drop"));
        await t.waitFrames(CHECK_EVERY + 2);
        const sAfterDrop = I.get(stone.id);
        const gridAfterDrop = Sheet.model().grid.slots.filter(Boolean).length;
        const droppedText = sAfterDrop ? `holder ${sAfterDrop.holder}, on cell ${sAfterDrop.area ? `(${sAfterDrop.x},${sAfterDrop.y})` : "none"}` : "gone";
        const droppedOk = !!sAfterDrop && sAfterDrop.holder === null && !!sAfterDrop.area && sAfterDrop.x === col.x && sAfterDrop.y === col.y && !col.data.inventory.includes(stone.id)
            && gridAfterDrop === n0 - 1;
        await clickRect(Sheet.screenRect("button", "pickup"));
        await t.waitFrames(CHECK_EVERY + 2);
        const sAfterPick = I.get(stone.id);
        const gridAfterPick = Sheet.model().grid.slots.filter(Boolean).length;
        const pickedOk = !!sAfterPick && sAfterPick.holder === col.id && col.data.inventory.includes(stone.id) && I.atIn(area, col.x, col.y).length === 0
            && gridAfterPick === n0;
        const axeIdx = I.inventoryOf(col.id).findIndex(it => it.id === axe.id);
        await clickRect(Sheet.screenRect("slot", axeIdx));
        await clickRect(Sheet.screenRect("button", "drop"));
        const axeKept = I.get(axe.id).holder === col.id && col.data.equipment.tool === axe.id;
        t.check("drop_pickup", footerOk && droppedOk && pickedOk && axeKept,
            `select slot ${stoneIdx}: footer "${footer1}" (name, count, tags: ${footerOk}); Drop -> stone #${stone.id} ${droppedText} (colonist at (${col.x},${col.y})), grid ${n0} -> ${gridAfterDrop}: ${droppedOk}; ` +
            `Pick up -> holder ${sAfterPick && sAfterPick.holder}, cell empty ${I.atIn(area, col.x, col.y).length === 0}, grid ${gridAfterPick}: ${pickedOk}; the equipped axe (slot ${axeIdx}) after Drop: still carried and equipped ${axeKept}`);

        // sheet.close: Escape; a right-click on the panel (the Overseer keeps its selection); the close box. The window is reused.
        const winBefore = Sheet.window(), contentsBefore = winBefore.contents;
        Input._currentState.escape = true;
        await t.waitFrames(1);
        Input._currentState.escape = false;
        await t.waitFrames(1);
        const escClosed = !Sheet.isOpen();
        await clickCell(col.x, col.y); // selects it in the Overseer and opens the panel
        await t.waitFrames(1);
        const reopened = Sheet.isOpen();
        await clickRect(Sheet.screenRect("slot", 0) || Sheet.screenRect("close"));
        const selectedBefore = cm.selectedColonist;
        const r0 = Sheet.screenRect("slot", 2);
        await clickScreen(r0.cx, r0.cy, true);
        const rightClosed = !Sheet.isOpen() && cm.selectedColonist === selectedBefore && !!selectedBefore && !Int.isOpen();
        Sheet.open(col.id);
        await t.waitFrames(2);
        await clickRect(Sheet.screenRect("close"));
        const boxClosed = !Sheet.isOpen();
        Sheet.open(deer.id);
        await t.waitFrames(1);
        const reused = Sheet.window() === winBefore && winBefore.contents === contentsBefore && Sheet.isOpen();
        t.check("close", escClosed && reopened && rightClosed && boxClosed && reused,
            `Escape closed it ${escClosed}; reopened by a click ${reopened}; right-click on the panel closed it ${!Sheet.isOpen() || rightClosed} with the Overseer still selecting ${selectedBefore ? selectedBefore.name : "nobody"} and no menu: ${rightClosed}; ` +
            `close box closed it ${boxClosed}; same window and contents bitmap on reopening ${reused}`);
        Sheet.close();
        cm.deselect();

        // sheet.perf: per-frame cost with the world running at x1: open on the colonist (needs change), then closed.
        if (Time && typeof Time.setLevel === "function") Time.setLevel(0);
        if (Time && Time.paused) Time.resume();
        Sheet.open(col.id);
        await t.waitFrames(5);
        Sheet.resetPerf();
        // Worst case: a need changes before every signature check, so every check redraws the whole panel.
        const until = Graphics.frameCount + 120;
        await t.waitUntil(() => {
            if (Graphics.frameCount % CHECK_EVERY === 0) col.name = `TEST_Col_${Graphics.frameCount}`;
            return Graphics.frameCount >= until;
        }, 10000, "120 frames with the panel open").catch(() => {});
        const pOpen = Sheet.perf();
        Sheet.close();
        await t.waitFrames(2);
        Sheet.resetPerf();
        await t.waitFrames(120);
        const pClosed = Sheet.perf();
        if (Time && !Time.paused) Time.pause();
        const perfOk = pOpen.openFrames >= 100 && pOpen.openAvgMs <= 0.5 && pOpen.bitmapsMade === 0 && pOpen.redraws >= 4
            && pClosed.closedFrames >= 100 && pClosed.openFrames === 0 && pClosed.checks === 0 && pClosed.redraws === 0 && pClosed.bitmapsMade === 0 && pClosed.closedAvgMs <= 0.05;
        t.check("perf", perfOk,
            `open (world running at x1, a need changed before every check so each check redraws; performance.now around the panel's update and the scene hook): ${pOpen.openFrames} frames, avg ${pOpen.openAvgMs.toFixed(4)} ms, ${pOpen.checks} signature checks, ${pOpen.redraws} redraws (want >= 4), ${pOpen.bitmapsMade} new bitmaps; ` +
            `closed: ${pClosed.closedFrames} frames, avg ${pClosed.closedAvgMs.toFixed(4)} ms, ${pClosed.checks} checks, ${pClosed.redraws} redraws, ${pClosed.bitmapsMade} new bitmaps; icon cache ${Sheet.iconCacheSize()} entries`);

        // sheet.shows_load and sheet.card_shows_load (VISION V89, user 2026-09-19: "Whatever they are carrying can be documented
        // in their profile as opposed to animated"): a real haul. A colonist of yours walks to 3 logs, picks them up and carries
        // them 6 cells to a stockpile; while it holds them the panel and the Overseer's card say "Carrying 3 logs to <the place>",
        // and once they are down neither says anything. Its sprite shows walk (and stand) frames, never a carry pose (UF_Anim).
        Sheet.close();
        cm.deselect();
        const Anim = window.UF.Anim;
        const hauler = W.addUnit({ name: "TEST_SheetHauler", image: { characterName: imageOf(pf ? pf.species : "human"), characterIndex: 0 }, area, x: x0 + 8, y: y0, dir: 4,
            data: { kind: "colonist", faction: pid, species: pf ? pf.species : "human", gender: "female", ai: null, stats: colStats,
                needs: { hunger: 30, thirst: 40, sleep: 20, social: 50, nature: 10 }, mood: "Content", moodScore: 20, inventory: [], equipment: { tool: null, clothes: null },
                thoughts: [], facets: {}, skills: {}, tier: 0 } });
        fx.units.push(hauler);
        const src = { x: x0 + 6, y: y0 }, dest = { x: x0, y: y0 };
        put(dest.x, dest.y, "stockpile");
        const logs = I.drop(area, src.x, src.y, tLog, 3)[0] || null;
        const atDest0 = I.count({ area, x: dest.x, y: dest.y }, tLog);
        await t.waitFrames(2);
        // The place, worked out here: a cell of the colony's plan is named by its step, else it is the stockpile put there.
        const colony = W.state.colony;
        const destStep = colony && Array.isArray(colony.plan) && colony.site && sameArea(colony.area, area)
            ? colony.plan.find(p => p && p.build && Array.isArray(p.cells) && p.cells.some(c => c[0] === dest.x - colony.site.x && c[1] === dest.y - colony.site.y)) : null;
        const wantPlace = destStep ? `the ${String(destStep.id).replace(/_/g, " ")}` : "the stockpile";
        const wantLoad = `Carrying 3 ${lower(itemName(tLog))}s to ${wantPlace}`;
        const loadBefore = Sheet.loadOf(hauler);
        Sheet.open(hauler.id);
        cm.select(hauler.id);
        await t.waitFrames(2);
        const cardBefore = UF.Overseer.cardLoadText();
        const card = scene._colonyCard;
        const cardPixels = () => {
            if (!card || !card.contents) return 0;
            const r = UF.Overseer.loadRect();
            if (!r) return 0;
            const data = card.contents.context.getImageData(r.x, r.y, r.w, r.h).data;
            let n = 0;
            for (let i = 3; i < data.length; i += 4) if (data[i] > 150) n++;
            return n;
        };
        const cardPixels0 = cardPixels();
        const haul = logs ? J.create({ type: "haul", target: { area: copyArea(area), x: src.x, y: src.y }, params: { itemId: logs.id, to: { area: copyArea(area), x: dest.x, y: dest.y } }, owner: hauler.id }) : null;
        if (Time && typeof Time.setLevel === "function") Time.setLevel(0);
        if (Time && Time.paused) Time.resume();
        let heldFrames = 0, measured = false, panelPixels = 0, cardPx = 0, drawnAt = "", cardAt = "";
        const panelTexts = new Set(), drawnTexts = new Set(), cardTexts = new Set(), animWants = new Set();
        for (let f = 1; f <= 1500; f++) {
            await t.waitFrames(1);
            const it = logs ? I.get(logs.id) : null;
            if (it && it.holder === hauler.id) {
                heldFrames++;
                const fo = Anim && typeof Anim.frameOf === "function" ? Anim.frameOf(hauler) : null;
                if (fo) animWants.add(fo.want);
                const m = Sheet.model();
                if (m && m.load) panelTexts.add(m.load.text);
                if (Sheet.drawnLoadText()) drawnTexts.add(Sheet.drawnLoadText());
                if (UF.Overseer.cardLoadText()) cardTexts.add(UF.Overseer.cardLoadText());
                const ev = W.eventOf(hauler.id);
                if (!measured && Sheet.drawnLoadText() === wantLoad && (!card || UF.Overseer.cardLoadText() === wantLoad) && ev && ev.isMoving()) {
                    measured = true;
                    const L = Sheet.layout();
                    panelPixels = L && L.load ? Sheet.opaqueCount(L.load, 150) : 0;
                    cardPx = cardPixels();
                    drawnAt = Sheet.drawnLoadText();
                    cardAt = UF.Overseer.cardLoadText();
                    if (Time) Time.pause();
                    await shot("shows_load"); // the hauler mid-walk with the logs (no load drawn on it), the panel and the card saying so
                    if (Time) Time.resume();
                }
            }
            if (!haul || haul.state === "done" || haul.state === "failed" || haul.state === "cancelled") break;
        }
        await t.waitFrames(CHECK_EVERY * 2 + 2); // the panel looks every 15 frames, the card every 30
        if (Time && !Time.paused) Time.pause();
        const arrived = I.count({ area, x: dest.x, y: dest.y }, tLog) - atDest0;
        const mAfter = Sheet.model(), LAfter = Sheet.layout();
        const drawnAfter = Sheet.drawnLoadText(), cardAfter = UF.Overseer.cardLoadText(), cardPixelsAfter = cardPixels();
        const haulText = haul ? `haul #${haul.id} ${haul.state}` : "no haul (no logs)";
        const animOk = !Anim || (animWants.has("walk") && !animWants.has("carry"));
        t.check("shows_load",
            !!haul && haul.state === "done" && arrived === 3 && heldFrames >= 30 && loadBefore === null && measured && panelTexts.size === 1 && panelTexts.has(wantLoad) &&
            drawnTexts.size === 1 && drawnAt === wantLoad && panelPixels >= 60 && !!mAfter && mAfter.load === null && !!LAfter && !LAfter.load && drawnAfter === "" && animOk,
            `${haulText}: 3 ${tLog} from (${src.x},${src.y}) to the stockpile put at (${dest.x},${dest.y})${destStep ? ` (a cell of the colony's plan step ${destStep.id})` : ""}, ${arrived} arrived; ` +
            `before the haul (empty hands): load ${JSON.stringify(loadBefore)} (want null); while holding them (${heldFrames} frames): panel model ${Array.from(panelTexts).map(x => `"${x}"`).join(" / ") || "none"}, ` +
            `drawn ${Array.from(drawnTexts).map(x => `"${x}"`).join(" / ") || "none"} (want only "${wantLoad}"), ${panelPixels} text pixels in its line (want >= 60); ` +
            `after it put them down: panel load ${mAfter ? JSON.stringify(mAfter.load) : "panel closed"}, line in the layout ${LAfter && LAfter.load ? "YES" : "no"}, drawn "${drawnAfter}" (want null / no / ""); ` +
            `the hauler's sprite states while carrying: ${Array.from(animWants).join("/") || "none"} (want walk, never carry${Anim ? "" : "; UF_Anim not loaded"})`);
        t.check("card_shows_load",
            !card || (measured && cardBefore === "" && cardPixels0 === 0 && cardTexts.size === 1 && cardAt === wantLoad && cardPx >= 40 && cardAfter === "" && cardPixelsAfter === 0 && card.visible),
            `Overseer card on ${hauler.name} (card ${card && card.visible ? "shown" : (card ? "HIDDEN" : "none")}): before the haul "${cardBefore}" with ${cardPixels0} pixels in the load line (want "" / 0); ` +
            `while carrying ${Array.from(cardTexts).map(x => `"${x}"`).join(" / ") || "none"} (want only "${wantLoad}"), ${cardPx} text pixels in the load line (want >= 40); ` +
            `after: "${cardAfter}" with ${cardPixelsAfter} pixels (want "" / 0)`);

        // sheet.load_words: counts and names in words; a cell of the colony's plan is named by its step; loose goods are the
        // load, worn or wielded things are not; more than three kinds end in "and N more"; empty hands say nothing.
        const words = [["Log", 1, "a log"], ["Log", 3, "3 logs"], ["Iron axe", 1, "an iron axe"], ["Raw meat", 2, "2 raw meat"], ["Berries", 1, "berries"], ["Stone knife", 2, "2 stone knives"], ["Leather leggings", 1, "leather leggings"]];
        const wordsGot = words.map(([n, k]) => Sheet.countedName(n, k));
        const wordsOk = words.every((w, i) => wordsGot[i] === w[2]);
        const planStep = colony && Array.isArray(colony.plan) && colony.site ? colony.plan.find(p => p && p.build && Array.isArray(p.cells) && p.cells.length) : null;
        const planCell = planStep ? { area: colony.area, x: colony.site.x + planStep.cells[0][0], y: colony.site.y + planStep.cells[0][1] } : null;
        const planName = planCell ? Sheet.placeName(planCell) : null;
        const planOk = !planStep || planName === `the ${String(planStep.id).replace(/_/g, " ")}`;
        const tMeat = typeOr("meat_raw", "fish", "berries");
        const meat = I.give(tMeat, 2, hauler.id)[0];
        const axe2 = I.give(tAxe, 1, hauler.id)[0];
        hauler.data.equipment = { tool: axe2 ? axe2.id : null, clothes: null };
        const oneKind = Sheet.loadOf(hauler);
        const extra = [typeOr("stone"), typeOr("berries", "fruit"), typeOr("fiber", "straw")].filter(Boolean);
        for (const ty of extra) I.give(ty, 2, hauler.id);
        const manyKinds = Sheet.loadOf(hauler);
        for (const it of I.inventoryOf(hauler.id).slice()) if (!axe2 || it.id !== axe2.id) I.remove(it.id);
        const wornOnly = Sheet.loadOf(hauler);
        const wantOne = `Carrying ${Sheet.countedName(itemName(tMeat), 2)}`;
        const looseOk = !!meat && !!oneKind && oneKind.kind === "held" && oneKind.text === wantOne && oneKind.items.length === 1 &&
            !!manyKinds && manyKinds.items.length === 1 + extra.length && (extra.length < 3 || /and 1 more$/.test(manyKinds.text)) && wornOnly === null;
        t.check("load_words", wordsOk && planOk && looseOk,
            `words: ${words.map((w, i) => `${w[0]} x${w[1]} -> "${wordsGot[i]}"${wordsGot[i] === w[2] ? "" : ` (want "${w[2]}")`}`).join(", ")}; ` +
            `the colony's plan step ${planStep ? `${planStep.id} at (${planCell.x},${planCell.y}) -> "${planName}"` : "none (not checked)"}; ` +
            `2 ${tMeat} in the hands and an equipped ${tAxe} -> "${oneKind ? oneKind.text : "nothing"}" (want "${wantOne}"); with ${extra.join(", ")} too -> "${manyKinds ? manyKinds.text : "nothing"}"; ` +
            `only the equipped axe left -> ${JSON.stringify(wornOnly)} (want null)`);
        cm.deselect();
        Sheet.close();
    }
})();

