//=============================================================================
// DEUS_Interact.js - Right-click context menu: everything that can be done on a cell becomes a designation
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Interact] Contextual right-click interaction menu, order designation markers, and immediate job creation.
 * @author UF project
 * @base DEUS_World
 * @base DEUS_Jobs
 * @orderAfter DEUS_Look
 * @orderAfter DEUS_ColonyOverseer
 *
 * @help
 * Every cell offers at least two options (user decision 2026-09-18: every
 * tile is interactive):
 *   object     its catalog actions ("Chop down oak", "Gather berry bush",
 *              "Pick up loose stones", "Quarry ...", "Mine ..."); a building
 *              also "Dismantle ..." (work 60: its build items lie on the cell)
 *   items      "Haul to stockpile" (nearest stockpile storing one of the
 *              item's tags, else any), "Eat ..." for food
 *   creature   "Hunt ..."; a colonist: "Select", "Follow with camera",
 *              "Info"; another faction's person: "Info"
 *   land       "Build here" (a submenu of every buildable object, the
 *              culture's wall first), "Stockpile here", "Dig" (work 80: the
 *              ground becomes dirt, a stone drops 1 time in 4)
 *   water      "Fish here" (stand beside it, work 200, a fish 2 times in 3),
 *              "Drink here" (the selected colonist, else the nearest)
 *   always     "Cancel designation" when a job targets the cell, and "Look"
 * Choosing an action creates an open job (owner null): a designation that
 * any colonist may take (UF.Jobs.take). A code-drawn marker
 * (UF_GenDesignation_<type>: an outline with a small glyph) sits on the
 * cell at z = foot row - 49 until the job is done or cancelled.
 *
 * The menu is a Window_Command at the mouse. Esc or a right-click elsewhere
 * closes it. Left-click select/move stays with UF_ColonyOverseer; its
 * right-click deselect only fires when this menu did not open (this plugin
 * aliases Scene_Map.updateOverseerControls so its handler runs first and
 * swallows the click).
 *
 * API, state, events and checks: docs/systems/UF_Interact.md
 * Architecture: docs/design/WORLD_ARCHITECTURE.md section 5.10
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const DISMANTLE_WORK = 60;
    const DIG_WORK = 80;
    const FISH_WORK = 200;
    const DIG_STONE_ONE_IN = 4;   // a dig drops a stone 1 time in 4 (seeded)
    const FISH_CATCH_OF = 3;      // a fish 2 times in 3 (seeded)
    const DIG_GROUND = "dirt";
    const DIG_STONE_ITEM = "stone";
    const FISH_ITEM = "fish";
    const STOCKPILE_OBJECT = "stockpile";
    const STOCKPILE_SEARCH = 80;  // cells: how far "Haul to stockpile" looks for a stockpile object
    const COLONIST_SEARCH = 120;  // cells: "Drink here" / "Eat" go to the nearest colonist within this
    const LOOK_SECONDS = 3;
    const SIZE = 48;
    const Z_BELOW_FEET = 49;      // marker z = foot row - 49 (WORLD_ARCHITECTURE section 4: just above the stance square)
    const Z_MIN = 6;
    const VIEW_MARGIN = 2;
    const MENU_FONT = 18;
    const MENU_LINE = 26;
    const MENU_MIN_WIDTH = 190;
    const MENU_MAX_WIDTH = 400;
    const MENU_MAX_ROWS = 14;
    const NEIGHBORS8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    const VERBS = { chop: "Chop down", gather: "Gather", pick: "Pick up", quarry: "Quarry", mine: "Mine" };
    const MARKER_COLORS = {
        chop: "#f5c542", gather: "#a3e635", pick: "#e5e7eb", quarry: "#d6d3d1", mine: "#fb923c", dismantle: "#f87171",
        build: "#38bdf8", dig: "#c08a4a", fish: "#60a5fa", hunt: "#ef4444", haul: "#86efac", eat: "#fde68a", drink: "#7dd3fc", move: "#e2e8f0"
    };
    // 7x7 glyphs, drawn 3 px per cell in the middle of the marker.
    const GLYPHS = {
        chop: [".###...", ".####..", "..##...", "...#...", "....#..", ".....#.", "......#"],
        gather: ["...##..", "..####.", ".#####.", ".####..", "..##...", ".#.....", "#......"],
        pick: [".......", ".##....", ".##.##.", "....##.", "..##...", "..##...", "......."],
        quarry: [".#####.", "#.....#", "...#...", "...#...", "...#...", "...#...", "...#..."],
        mine: [".#####.", "#.....#", "...#...", "...#...", "...#...", "...#...", "...#..."],
        dismantle: ["#.....#", ".#...#.", "..#.#..", "...#...", "..#.#..", ".#...#.", "#.....#"],
        build: ["#######", "#.....#", "#.###.#", "#.#.#.#", "#.###.#", "#.....#", "#######"],
        dig: ["...#...", "...#...", "...#...", "#..#..#", ".#.#.#.", "..###..", "...#..."],
        fish: ["....#..", "....#..", "....#..", "....#..", "#...#..", "#...#..", ".###..."],
        hunt: ["...####", ".....##", "....#.#", "...#..#", "..#....", ".#.....", "#......"],
        haul: ["...#...", "....#..", "#####..", "......#", "#####..", "....#..", "...#..."],
        eat: [".......", "#######", ".#####.", "..###..", "...#...", "...#...", "......."],
        drink: ["...#...", "...#...", "..###..", ".#####.", ".#####.", "..###..", "......."],
        move: ["...#...", "...#...", ".......", "##...##", ".......", "...#...", "...#..."],
        default: [".......", ".......", "..###..", "..###..", "..###..", ".......", "......."]
    };

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Look = () => (window.UF && UF.Look) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const copyArea = a => ({ x: a.x, y: a.y });
    const lower = s => String(s || "").toLowerCase();
    const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
    const withArticle = name => {
        const n = lower(name);
        if (!n) return "";
        if (/s$/.test(n)) return n;
        return (/^[aeiou]/.test(n) ? "an " : "a ") + n;
    };
    const manhattan = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
    const hash32 = (...p) => (World() && World().hash32 ? World().hash32(...p) : 0);
    const seed = () => (World() && World().state ? World().state.seed | 0 : 0);

    //-------------------------------------------------------------------------
    // Job types: dismantle, dig, fish (UF_Jobs is not edited)

    let jobsDefined = false;
    function defineJobTypes() {
        const J = Jobs();
        if (jobsDefined || !J) return false;
        jobsDefined = true;

        J.define("dismantle", {
            verb: "Dismantling",
            plan(job, unit) {
                const O = Objects();
                const t = O ? O.atIn(job.target.area, job.target.x, job.target.y) : null;
                if (!t || !(t.build || t.ruin)) return { ok: false, reason: "nothing to dismantle there" };
                job.params.objectName = t.name;
                const stand = J.standFor(job.target, unit, t.passable !== true);
                return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
            },
            work: DISMANTLE_WORK,
            apply(job) {
                const O = Objects(), I = Items();
                const t = O.atIn(job.target.area, job.target.x, job.target.y);
                if (!t) throw new Error("nothing left to dismantle");
                const items = (t.build && t.build.items) || {};
                const dropped = [];
                if (I) for (const id of Object.keys(items)) for (const it of I.drop(job.target.area, job.target.x, job.target.y, id, items[id] | 0)) dropped.push(it.id);
                O.setIn(job.target.area, job.target.x, job.target.y, null);
                job.result = { from: t.id, yields: Object.assign({}, items), items: dropped };
            },
            describe: job => `Dismantling ${withArticle(job.params.objectName || "building")}`
        });

        J.define("dig", {
            verb: "Digging",
            plan(job, unit) {
                const d = diggable(job.target.area, job.target.x, job.target.y);
                if (!d.ok) return { ok: false, reason: d.reason };
                const stand = J.standFor(job.target, unit, false);
                return stand ? { ok: true, stand } : { ok: false, reason: "can't reach it" };
            },
            work: DIG_WORK,
            apply(job) {
                const r = digCell(job.target.area, job.target.x, job.target.y);
                if (!r) throw new Error("can't dig there");
                const roll = hash32(seed(), 0xd16, job.target.x, job.target.y, job.id) % DIG_STONE_ONE_IN;
                const stone = roll === 0 ? 1 : 0;
                const I = Items();
                if (stone && I) I.drop(job.target.area, job.target.x, job.target.y, DIG_STONE_ITEM, stone);
                job.result = { ground: DIG_GROUND, from: r.from, tileId: r.tileId, shape: r.shape, stone, roll };
            },
            describe: () => "Digging the ground"
        });

        J.define("fish", {
            verb: "Fishing",
            plan(job, unit) {
                if (!J.isWaterAt(job.target.area, job.target.x, job.target.y)) return { ok: false, reason: "no water there" };
                const stand = J.standFor(job.target, unit, true);
                return stand ? { ok: true, stand } : { ok: false, reason: "can't reach the water" };
            },
            work: FISH_WORK,
            apply(job, unit) {
                const roll = hash32(seed(), 0xf15, job.target.x, job.target.y, job.id) % FISH_CATCH_OF;
                const caught = roll !== 0;
                const I = Items();
                const dropped = [];
                if (caught && I) for (const it of I.drop(unit.area, unit.x, unit.y, FISH_ITEM, 1)) dropped.push(it.id);
                job.result = { caught, roll, at: { area: copyArea(unit.area), x: unit.x, y: unit.y }, items: dropped };
            },
            describe: () => "Fishing"
        });
        return true;
    }

    //-------------------------------------------------------------------------
    // Digging: the ground kind of a cell becomes dirt, with autotile shapes for it and its neighbors

    // Autotile shape from the 8 neighbors (the same derivation UF_WorldGen uses, kept here in case it's absent).
    let shapeLookup = null;
    function autotileShape(same) {
        const G = window.UF.WorldGen;
        if (G && typeof G.autotileShape === "function") return G.autotileShape(same);
        if (!shapeLookup) {
            shapeLookup = new Map();
            for (let s = 0; s < 47; s++) shapeLookup.set(JSON.stringify(Tilemap.FLOOR_AUTOTILE_TABLE[s]), s);
        }
        const n = same(0, -1), s = same(0, 1), w = same(-1, 0), e = same(1, 0);
        const nw = same(-1, -1), ne = same(1, -1), sw = same(-1, 1), se = same(1, 1);
        const tl = n && w ? (nw ? [2, 4] : [2, 0]) : (!n && !w ? [0, 2] : (n ? [0, 4] : [2, 2]));
        const tr = n && e ? (ne ? [1, 4] : [3, 0]) : (!n && !e ? [3, 2] : (n ? [3, 4] : [1, 2]));
        const bl = s && w ? (sw ? [2, 3] : [2, 1]) : (!s && !w ? [0, 5] : (s ? [0, 3] : [2, 5]));
        const br = s && e ? (se ? [1, 3] : [3, 1]) : (!s && !e ? [3, 5] : (s ? [3, 3] : [1, 5]));
        const key = JSON.stringify([tl, tr, bl, br]);
        return shapeLookup.has(key) ? shapeLookup.get(key) : 0;
    }

    const groundKindAt = (area, x, y) => {
        const W = World(), T = window.UF.Tiles;
        if (!W || !T || !W.state || x < 0 || y < 0 || x >= W.state.size || y >= W.state.size) return null;
        return T.kindOfTile(W.getTile(area.x, area.y, x, y, 0));
    };

    /** { ok, reason }: land, an A2 ground kind that isn't rock face, no blocking object, not water. */
    function diggable(area, x, y) {
        const W = World(), T = window.UF.Tiles, O = Objects(), J = Jobs();
        if (!W || !T || !W.state || !area) return { ok: false, reason: "no world" };
        if (T.groundBase(DIG_GROUND) === null) return { ok: false, reason: "no dirt ground kind" };
        if (J && J.isWaterAt(area, x, y)) return { ok: false, reason: "can't dig water" };
        const kind = groundKindAt(area, x, y);
        if (!kind) return { ok: false, reason: "no ground to dig" };
        if (kind.passable === false) return { ok: false, reason: "solid rock" };
        if (O && O.blocksIn(area, x, y)) return { ok: false, reason: "something stands there" };
        return { ok: true, kind };
    }

    // Re-shape one A2 ground cell against its neighbors of the same kind (cells outside the area count as the same kind).
    function reshapeGround(area, x, y) {
        const W = World(), T = window.UF.Tiles;
        const kind = groundKindAt(area, x, y);
        if (!kind) return null;
        const size = W.state.size;
        const same = (dx, dy) => {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) return true;
            const k = groundKindAt(area, nx, ny);
            return !!k && k.id === kind.id;
        };
        const shape = autotileShape(same);
        const tileId = T.groundBase(kind.id) + shape;
        if (W.getTile(area.x, area.y, x, y, 0) !== tileId) W.setTile(area.x, area.y, x, y, 0, tileId);
        return { tileId, shape };
    }

    /** Turn a cell's ground into dirt and fix the autotile shapes around it. Returns { from, tileId, shape } or null. */
    function digCell(area, x, y) {
        const W = World(), T = window.UF.Tiles;
        const d = diggable(area, x, y);
        if (!d.ok) return null;
        const base = T.groundBase(DIG_GROUND);
        W.setTile(area.x, area.y, x, y, 0, base); // the kind first, so the shapes below see dirt here
        const r = reshapeGround(area, x, y);
        for (const [dx, dy] of NEIGHBORS8) reshapeGround(area, x + dx, y + dy);
        emit("interact:dug", area, x, y, d.kind.id);
        return { from: d.kind.id, tileId: r.tileId, shape: r.shape };
    }

    //-------------------------------------------------------------------------
    // Designations: open jobs (owner null) at a cell

    const isDesignation = job => !!job && job.owner === null && (job.state === "open" || job.state === "travel" || job.state === "work");

    function designations() {
        const J = Jobs();
        return J ? J.list(isDesignation) : [];
    }
    function designationsAt(x, y, area) {
        const W = World();
        const a = area || (W && (W.viewLevel ? W.viewLevel() : W.currentArea()));
        if (!a) return [];
        const targetZ = typeof a.z === "number" ? a.z : 0;
        return designations().filter(j => sameArea(j.target.area, a) && (typeof (j.target && j.target.z) === "number" ? j.target.z : 0) === targetZ && j.target.x === x && j.target.y === y);
    }
    /** Create an open job (owner null) at a target: the designation. Returns the job or null. */
    function designate(spec) {
        const J = Jobs();
        if (!J || !spec || !spec.target) return null;
        const job = J.create({ type: spec.type, target: spec.target, params: spec.params || {}, owner: null, priority: spec.priority | 0 });
        if (job) emit("interact:designated", job);
        return job;
    }
    function cancelAt(x, y, area) {
        const J = Jobs();
        let n = 0;
        for (const job of designationsAt(x, y, area)) if (J.cancel(job.id, "cancelled by the player")) n++;
        if (n) emit("interact:cancelled", x, y, n);
        return n;
    }

    //-------------------------------------------------------------------------
    // Who does personal jobs (drink, eat): the selected colonist, else the nearest one, else anyone (open)

    const colonistUnits = area => {
        const W = World();
        if (!W || !area) return [];
        const C = window.UF.Colonists;
        const list = C && typeof C.list === "function" ? C.list() : W.units().filter(u => u.data && u.data.kind === "colonist");
        return list.filter(u => sameArea(u.area, area));
    };
    function selectedColonistId() {
        const cm = window.$colonyManager, W = World();
        const sel = cm && cm.selectedColonist;
        if (!sel || !W) return null;
        const u = sel.event ? W.unitOfEvent(sel.event) : null;
        if (u) return u.id;
        const byId = typeof sel.id === "number" ? W.unit(sel.id) : null;
        return byId && byId.data && byId.data.kind === "colonist" ? byId.id : null;
    }
    function nearestColonistId(x, y, area) {
        let best = null, bestD = Infinity;
        for (const u of colonistUnits(area)) {
            const d = manhattan(u.x, u.y, x, y);
            if (d < bestD && d <= COLONIST_SEARCH) {
                best = u;
                bestD = d;
            }
        }
        return best ? best.id : null;
    }
    function personalJob(type, target, params) {
        const J = Jobs();
        if (!J) return null;
        const id = selectedColonistId() || nearestColonistId(target.x, target.y, target.area);
        if (id) {
            const C = window.UF.Colonists;
            if (C && typeof C.order === "function") {
                const job = C.order(id, { type, target, params: params || {} });
                if (job) return job;
            }
            return J.create({ type, target, params: params || {}, owner: id });
        }
        return designate({ type, target, params });
    }

    // Stockpiles: the colony's list (UF_Colonists) plus stockpile objects near the cell; prefer one that stores a tag of the item.
    function stockpileFor(item, target) {
        const W = World(), O = Objects(), I = Items();
        const st = W && W.state;
        const t = I ? I.type(item.type) : null;
        const tags = (t && t.tags) || [];
        const piles = [];
        const colony = st && st.colony && Array.isArray(st.colony.stockpiles) ? st.colony.stockpiles : [];
        for (const p of colony) piles.push({ x: p.x, y: p.y, stores: p.stores || [], area: p.area || target.area });
        if (O) for (const f of O.findIn(target.area, { near: { x: target.x, y: target.y }, radius: STOCKPILE_SEARCH, tags: [STOCKPILE_OBJECT] })) {
            if (!piles.some(p => p.x === f.x && p.y === f.y)) piles.push({ x: f.x, y: f.y, stores: [], area: target.area });
        }
        const near = piles.filter(p => sameArea(p.area, target.area));
        const dist = p => manhattan(p.x, p.y, target.x, target.y);
        const matching = near.filter(p => p.stores.some(tag => tags.includes(tag))).sort((a, b) => dist(a) - dist(b));
        const any = near.slice().sort((a, b) => dist(a) - dist(b));
        const pick = matching[0] || any[0];
        return pick ? { area: copyArea(pick.area), x: pick.x, y: pick.y } : null;
    }

    //-------------------------------------------------------------------------
    // Options for a cell

    const speciesOfPlayer = () => {
        const F = window.UF.Factions;
        const p = F && typeof F.player === "function" ? F.player() : null;
        return p ? p.species : null;
    };
    function cultureWall() {
        const C = window.UF.Colonists;
        if (C && typeof C.culture === "function") {
            const c = C.culture();
            if (c && c.wall) return c.wall;
        }
        const cat = catalog();
        const sp = speciesOfPlayer();
        const c = cat && cat.cultures && sp ? cat.cultures[sp] : null;
        return c && c.wall ? c.wall : null;
    }
    const costText = build => {
        const I = Items();
        const items = (build && build.items) || {};
        const parts = Object.keys(items).map(id => `${items[id]} ${lower(I && I.type(id) ? I.type(id).name : id)}`);
        return parts.length ? parts.join(", ") : "nothing";
    };

    /** The build submenu: every catalog object with `build`, the culture's wall first. */
    function buildOptions(target) {
        const O = Objects(), W = World();
        const list = O ? O.types().filter(t => t.build) : [];
        const wall = cultureWall();
        list.sort((a, b) => (b.id === wall ? 1 : 0) - (a.id === wall ? 1 : 0));
        const tx = target && typeof target.x === "number" ? target.x : 0;
        const ty = target && typeof target.y === "number" ? target.y : 0;
        const targetArea = target && target.area ? target.area : (W && (W.viewLevel ? W.viewLevel() : W.currentArea()));
        const opts = [{ id: "back", label: "Back", enabled: true, run: () => ({ submenu: optionsFor(tx, ty), header: headerFor(tx, ty) }) }];
        const D = window.UF && UF.Doors;
        const betweenWalls = D && typeof D.isBetweenBottomWalls === "function" && targetArea
            ? D.isBetweenBottomWalls(targetArea, tx, ty)
            : false;
        for (const t of list) {
            const isDoor = (Array.isArray(t.tags) && t.tags.includes("door")) || String(t.id).startsWith("door_");
            const allowed = !isDoor || betweenWalls;
            const label = isDoor && !betweenWalls
                ? `${t.name} — ${costText(t.build)} (must be between walls)`
                : `${t.name} — ${costText(t.build)}`;
            opts.push({ id: `build:${t.id}`, label, enabled: allowed, objectId: t.id,
                run: () => allowed ? designate({ type: "build", target: target || { area: targetArea, x: tx, y: ty }, params: { objectId: t.id } }) : null });
        }
        return opts;
    }

    function selectColonist(hit, follow) {
        const cm = window.$colonyManager;
        if (!cm) return false;
        let adapter = hit.adapter;
        if (!adapter && hit.unit) {
            const W = World(), unit = hit.unit;
            adapter = { id: unit.id, name: unit.name, gender: unit.data.gender || "", mood: unit.data.mood || "", currentJob: "", thoughts: [],
                hunger: 0, thirst: 0, fatigue: 0, social: 0, hp: 0, maxHp: 0, get event() { return W.eventOf(unit.id); } };
        }
        if (!adapter) return false;
        cm.select(adapter);
        if (follow !== undefined) cm.cameraFollowUnit = follow ? adapter : null;
        return true;
    }

    function infoLines(x, y, hit) {
        const L = Look();
        const lines = L ? L.describeCell(x, y) || [] : [];
        const u = hit.unit;
        if (u && u.data && u.data.faction && lines.length) {
            const F = window.UF.Factions;
            const f = F && typeof F.get === "function" ? F.get(u.data.faction) : null;
            const tier = F && typeof F.tierBetween === "function" ? F.tierBetween("player", u.data.faction) : null;
            if (f) lines[0] = `${lines[0] || hit.name} · ${f.name}${tier ? ` (${tier.id})` : ""}`;
        }
        return lines;
    }

    /** What the menu offers on a cell of the map on screen: [{ id, label, enabled, run }]. */
    function optionsFor(x, y) {
        const W = World(), O = Objects(), I = Items(), J = Jobs(), L = Look();
        const area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
        if (!area || !window.$gameMap || !$gameMap.isValid(x, y) || !J) return [];
        const z = typeof area.z === "number" ? area.z : 0;
        const target = { area: copyArea(area), x, y, z };
        const opts = [];
        const add = (id, label, run, enabled = true) => opts.push({ id, label, enabled, run });
        const type = O ? (O.atIn ? O.atIn(area, x, y) : O.at(x, y)) : null;
        const hit = L && L.unitAt ? L.unitAt(x, y) : null;
        const onCell = I ? (I.atIn ? I.atIn(area, x, y) : I.at(x, y)) : [];
        const water = J.isWaterAt(area, x, y);
        const blocking = !!type && type.passable !== true;

        if (type && type.actions) {
            for (const action of Object.keys(type.actions)) {
                if (!J.handler(action)) continue;
                add(`action:${action}`, `${VERBS[action] || cap(action)} ${lower(type.name)}`, () => designate({ type: action, target }));
            }
        }
        if (type && (type.build || type.ruin)) add("dismantle", `Dismantle ${lower(type.name)}`, () => designate({ type: "dismantle", target }));

        // Natural subterranean walls (solid rock / soil walls at z < 0)
        if (!type && z < 0) {
            const Lv = window.UF && UF.Levels;
            if (Lv && typeof Lv.shapeAt === "function" && Lv.shapeAt(target) === "solid") {
                const c = Lv.cellAt ? Lv.cellAt(target) : null;
                const matName = c && c.material === "soil" ? "soil wall" : "rock wall";
                if (J.handler("mine")) add("action:mine", `Mine ${matName}`, () => designate({ type: "mine", target }));
                if (J.handler("quarry")) add("action:quarry", `Quarry ${matName}`, () => designate({ type: "quarry", target }));
            }
        }

        if (onCell.length) {
            const pile = stockpileFor(onCell[0], target);
            add("haul", pile ? "Haul to stockpile" : "Haul to stockpile (none built)", () => {
                const made = [];
                for (const it of onCell) {
                    const to = stockpileFor(it, target);
                    if (to) made.push(designate({ type: "haul", target, params: { itemId: it.id, itemType: it.type, to } }));
                }
                return made;
            }, !!pile);
        }

        if (hit) {
            if (hit.creature && hit.unit) add("hunt", `Hunt ${lower(hit.name)}`, () => designate({ type: "hunt", target, params: { unitId: hit.unit.id } }));
            else if (hit.colonist) {
                add("select", "Select", () => selectColonist(hit));
                add("follow", "Follow with camera", () => selectColonist(hit, true));
                add("info", "Info", () => { selectColonist(hit); if (L) L.show(x, y, LOOK_SECONDS, infoLines(x, y, hit)); });
            } else add("info", "Info", () => (L ? L.show(x, y, LOOK_SECONDS, infoLines(x, y, hit)) : false));
        }

        if (!water && !blocking) {
            add("build", "Build here", () => ({ submenu: buildOptions(target), header: "Build here" }));
            if (O && O.typeId(STOCKPILE_OBJECT)) add("stockpile", "Stockpile here", () => designate({ type: "build", target, params: { objectId: STOCKPILE_OBJECT } }));
            const d = diggable(area, x, y);
            add("dig", d.ok ? "Dig" : `Dig (${d.reason})`, () => designate({ type: "dig", target }), d.ok);
        }
        if (water) {
            add("fish", "Fish here", () => designate({ type: "fish", target }));
        }
        const here = designationsAt(x, y, area);
        if (here.length) add("cancel", here.length > 1 ? `Cancel ${here.length} designations` : "Cancel designation", () => cancelAt(x, y, area));
        add("look", "Look", () => (L ? L.show(x, y, LOOK_SECONDS) : false));
        return opts;
    }

    function headerFor(x, y) {
        const L = Look();
        const lines = L ? L.describeCell(x, y) : null;
        if (!lines) return "";
        if (lines[0]) return lines[0];
        const cell = L.cellAt(x, y);
        return cell ? (cell.text.split(" · ").pop() || "") : "";
    }

    //-------------------------------------------------------------------------
    // The menu window

    class Window_UFContextMenu extends Window_Command {
        initialize(rect, options, header, cell) {
            this._options = options || [];
            this._header = header || "";
            this._cell = cell || null;
            Window_Command.prototype.initialize.call(this, rect);
            this.opacity = 235;
            this.select(this._header ? Math.min(1, this.maxItems() - 1) : 0);
        }
        lineHeight() { return MENU_LINE; }
        itemHeight() { return MENU_LINE + 4; }
        itemTextAlign() { return "left"; }
        resetFontSettings() {
            Window_Command.prototype.resetFontSettings.call(this);
            this.contents.fontSize = MENU_FONT;
        }
        makeCommandList() {
            if (this._header) this.addCommand(this._header, "header", false, -1);
            this._options.forEach((o, i) => this.addCommand(o.label, "pick", o.enabled !== false, i));
        }
        drawItem(index) {
            if (this._list[index].symbol === "header") {
                const rect = this.itemLineRect(index);
                this.changePaintOpacity(true);
                this.changeTextColor(ColorManager.systemColor());
                this.drawText(this.commandName(index), rect.x, rect.y, rect.width, "left");
                return;
            }
            Window_Command.prototype.drawItem.call(this, index);
        }
        /** The option labels (without the header). */
        labels() { return this._options.map(o => o.label); }
        options() { return this._options.slice(); }
        header() { return this._header; }
        cell() { return this._cell ? Object.assign({}, this._cell) : null; }
        /** Replace the list (a submenu) and refit the window at the same corner. */
        setOptions(options, header) {
            this._options = options || [];
            this._header = header || "";
            const rect = Interact.menuRect(this._options, this._header, this.x, this.y, true);
            this.move(rect.x, rect.y, rect.width, rect.height);
            this.createContents();
            this.refresh();
            this.select(this._header ? Math.min(1, this.maxItems() - 1) : 0);
            this.activate();
        }
    }

    let menu = null;        // the open Window_UFContextMenu
    let swallowFrame = -1;  // the Graphics.frameCount of the last input the menu consumed (opened, chose, or closed)
    const graveyard = [];   // closed windows, removed and destroyed on the next frame (never inside their own update)

    function purgeGraveyard() {
        while (graveyard.length) {
            const w = graveyard.pop();
            try {
                if (w.parent) w.parent.removeChild(w);
                w.destroy();
            } catch (e) { /* already gone with its scene */ }
        }
    }

    function measureWidth(labels) {
        const probe = new Bitmap(4, 4);
        probe.fontSize = MENU_FONT;
        let w = 0;
        for (const l of labels) w = Math.max(w, probe.measureTextWidth(l));
        probe.destroy();
        return Math.ceil(w);
    }

    const Interact = {
        DISMANTLE_WORK, DIG_WORK, FISH_WORK, DIG_STONE_ONE_IN, FISH_CATCH_OF, Z_BELOW_FEET, SIZE,
        jobTypes: ["dismantle", "dig", "fish"],
        MenuWindow: Window_UFContextMenu,
        markersEnabled: true,
        optionsFor,
        buildOptions,
        designate,
        designations,
        designationsAt,
        cancelAt,
        diggable,
        digCell,
        stockpileFor,
        selectedColonistId,
        nearestColonistId,
        autotileShape,
        defineJobTypes,
        /** Window rectangle for a list at a screen point (window-layer coordinates), kept inside the box. */
        menuRect(options, header, sx, sy, keepCorner) {
            const labels = options.map(o => o.label).concat(header ? [header] : []);
            const pad = $gameSystem.windowPadding();
            const w = Math.max(MENU_MIN_WIDTH, Math.min(MENU_MAX_WIDTH, measureWidth(labels) + pad * 2 + 8 * 2 + 12));
            const rows = Math.min(MENU_MAX_ROWS, options.length + (header ? 1 : 0));
            const h = rows * (MENU_LINE + 4) + pad * 2;
            // A submenu keeps the corner the menu opened at; a fresh menu sits at the pointer. Both stay inside the box.
            const x = Math.max(0, Math.min(Graphics.boxWidth - w, sx));
            const y = Math.max(0, Math.min(Graphics.boxHeight - h, sy));
            return new Rectangle(Math.round(x), Math.round(y), w, h);
        },
        /** Open the menu for a cell of the map on screen at a screen point (default: the mouse). Returns the window or null. */
        open(x, y, at) {
            const scene = SceneManager._scene;
            if (!(scene instanceof Scene_Map) || !scene._windowLayer) return null;
            Interact.close();
            const options = optionsFor(x, y);
            if (!options.length) return null;
            const header = headerFor(x, y);
            const layer = scene._windowLayer;
            const sx = (at ? at.x : TouchInput.x) - layer.x, sy = (at ? at.y : TouchInput.y) - layer.y;
            const win = new Window_UFContextMenu(Interact.menuRect(options, header, sx, sy, false), options, header, { x, y });
            win.setHandler("pick", () => Interact.pick());
            win.setHandler("cancel", () => Interact.close(true));
            scene.addWindow(win);
            menu = win;
            swallowFrame = Graphics.frameCount;
            emit("interact:menuOpened", x, y, options);
            return win;
        },
        /** Run the highlighted option of the open menu (the "pick" handler). */
        pick() {
            const win = menu;
            if (!win) return null;
            const i = win.currentExt();
            const opt = i >= 0 ? win._options[i] : null;
            if (!opt || opt.enabled === false) {
                win.activate();
                return null;
            }
            return Interact.run(opt);
        },
        /** Run an option object: a submenu keeps the menu open with the new list, anything else closes it. */
        run(opt) {
            let result = null;
            try {
                result = opt.run();
            } catch (e) {
                console.error(e);
            }
            if (result && result.submenu && menu) {
                menu.setOptions(result.submenu, result.header || "");
                swallowFrame = Graphics.frameCount;
                return result;
            }
            Interact.close();
            emit("interact:chosen", opt.id, result);
            return result;
        },
        /** Choose an option of the open menu by label (prefix match, case-insensitive) or index. Returns what its run() returned. */
        choose(which) {
            if (!menu) return null;
            const opts = menu._options;
            let opt = null;
            if (typeof which === "number") opt = opts[which] || null;
            else {
                const want = lower(which);
                opt = opts.find(o => lower(o.label) === want) || opts.find(o => lower(o.label).startsWith(want)) || opts.find(o => o.id === which) || null;
            }
            if (!opt || opt.enabled === false) return null;
            return Interact.run(opt);
        },
        close(fromCancel) {
            if (!menu) return false;
            const win = menu;
            menu = null;
            win.deactivate();
            win.visible = false;
            graveyard.push(win);
            swallowFrame = Graphics.frameCount;
            emit("interact:menuClosed", !!fromCancel);
            return true;
        },
        isOpen() {
            if (!menu) return false;
            const scene = SceneManager._scene;
            if (!scene || !scene._windowLayer || menu.parent !== scene._windowLayer) { // the scene changed under it
                menu = null;
                return false;
            }
            return true;
        },
        menu: () => (Interact.isOpen() ? menu : null),
        swallowedFrame: () => swallowFrame,
        /**
         * The per-frame mouse handler, run before UF_ColonyOverseer's controls. Returns true when the menu is open,
         * just opened on this right-click, or just consumed a click (the Overseer then skips its select/move/deselect).
         */
        handleMouse() {
            purgeGraveyard();
            if (!(SceneManager._scene instanceof Scene_Map) || !window.$gameMap) return false;
            if (Interact.isOpen()) return true;
            if (swallowFrame === Graphics.frameCount) return true;
            if (!TouchInput.isCancelled()) return false;
            const L = Look();
            if (L && L.isOverUI()) return false;
            const cell = L && L.cellUnderMouse ? L.cellUnderMouse() : null;
            if (!cell) return false;
            return !!Interact.open(cell.x, cell.y);
        },
        // Markers (below)
        bitmap: null,
        markers: null,
        markerAt: null,
        markerOf: null
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Interact = Interact;

    //-------------------------------------------------------------------------
    // Designation markers: one pooled sprite per designation in view, inside the tilemap at z = foot row - 49

    const hexToRgb = hex => {
        const n = parseInt(String(hex).replace("#", ""), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    const bitmaps = {};
    Interact.bitmap = function(type) {
        const key = GLYPHS[type] ? type : "default";
        if (bitmaps[type]) return bitmaps[type];
        const rgb = hexToRgb(MARKER_COLORS[type] || "#f8fafc");
        const b = new Bitmap(SIZE, SIZE);
        b.fillRect(2, 2, SIZE - 4, SIZE - 4, rgba(rgb, 0.12));
        b.fillRect(2, 2, SIZE - 4, 2, rgba(rgb, 0.95));
        b.fillRect(2, SIZE - 4, SIZE - 4, 2, rgba(rgb, 0.95));
        b.fillRect(2, 2, 2, SIZE - 4, rgba(rgb, 0.95));
        b.fillRect(SIZE - 4, 2, 2, SIZE - 4, rgba(rgb, 0.95));
        const g = GLYPHS[key], px = 3, ox = Math.floor((SIZE - 7 * px) / 2), oy = ox;
        for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (g[y][x] === "#") {
            b.fillRect(ox + x * px - 1, oy + y * px - 1, px + 2, px + 2, "rgba(0,0,0,0.55)");
        }
        for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (g[y][x] === "#") b.fillRect(ox + x * px, oy + y * px, px, px, rgba(rgb, 1));
        b._ufName = `UF_GenDesignation_${type}`;
        bitmaps[type] = b;
        return b;
    };

    class Sprite_UFDesignation extends Sprite {
        constructor() {
            super();
            this.anchor.set(0.5, 1);
            this.visible = false;
            this.z = Z_MIN;
            this._ufJob = 0;
            this._ufType = "";
            this._ufFrame = -1;
            this._ufCell = null;
        }
        setType(type) {
            if (this._ufType === type && this.bitmap) return;
            this._ufType = type;
            this.bitmap = Interact.bitmap(type);
        }
        get jobId() { return this._ufJob; }
        get jobType() { return this._ufType; }
        get cell() { return this._ufCell ? Object.assign({}, this._ufCell) : null; }
    }
    Interact.MarkerSprite = Sprite_UFDesignation;

    class DesignationMarkers {
        constructor(tilemap) {
            this._tilemap = tilemap;
            this._pool = [];
            this._byJob = new Map();
            this.stats = { frames: 0, ms: 0, shown: 0 };
        }
        sync() {
            const t0 = performance.now();
            const frame = Graphics.frameCount;
            const W = World(), area = W && (W.viewLevel ? W.viewLevel() : W.currentArea());
            let shown = 0;
            if (Interact.markersEnabled && area && window.$gameMap && Jobs()) {
                const targetZ = typeof area.z === "number" ? area.z : 0;
                const offX = $gameMap.adjustX(0), offY = $gameMap.adjustY(0);
                const cols = $gameMap.screenTileX(), rows = $gameMap.screenTileY();
                for (const job of designations()) {
                    if (!sameArea(job.target.area, area)) continue;
                    if ((typeof (job.target && job.target.z) === "number" ? job.target.z : 0) !== targetZ) continue;
                    const sx = job.target.x + offX, sy = job.target.y + offY;
                    if (sx < -1 - VIEW_MARGIN || sy < -1 - VIEW_MARGIN || sx > cols + VIEW_MARGIN || sy > rows + VIEW_MARGIN) continue;
                    let m = this._byJob.get(job.id);
                    if (!m) {
                        m = this.acquire();
                        m._ufJob = job.id;
                        this._byJob.set(job.id, m);
                    }
                    m.setType(job.type);
                    m._ufCell = { x: job.target.x, y: job.target.y };
                    m.x = Math.round((sx + 0.5) * SIZE);
                    m.y = Math.round((sy + 1) * SIZE);
                    m.z = Math.max(Z_MIN, m.y - Z_BELOW_FEET);
                    m.visible = true;
                    m._ufFrame = frame;
                    shown++;
                }
            }
            for (const m of this._pool) if (m.visible && m._ufFrame !== frame) this.release(m);
            this.stats.frames++;
            this.stats.ms += performance.now() - t0;
            this.stats.shown = shown;
        }
        acquire() {
            let m = this._pool.find(s => !s.visible && !s._ufJob);
            if (!m) {
                m = new Sprite_UFDesignation();
                this._pool.push(m);
                this._tilemap.addChild(m);
            }
            return m;
        }
        release(m) {
            if (m._ufJob) this._byJob.delete(m._ufJob);
            m._ufJob = 0;
            m._ufCell = null;
            m.visible = false;
        }
        list() { return this._pool.filter(m => m.visible); }
        markerOf(jobId) {
            const m = this._byJob.get(jobId);
            return m && m.visible ? m : null;
        }
        markerAt(x, y) {
            return this._pool.find(m => m.visible && m._ufCell && m._ufCell.x === x && m._ufCell.y === y) || null;
        }
    }
    const markerLayer = () => {
        const s = SceneManager._scene;
        return s && s._spriteset && s._spriteset._ufDesignations ? s._spriteset._ufDesignations : null;
    };
    Interact.markers = () => (markerLayer() ? markerLayer().list() : []);
    Interact.markerAt = (x, y) => (markerLayer() ? markerLayer().markerAt(x, y) : null);
    Interact.markerOf = jobId => (markerLayer() ? markerLayer().markerOf(jobId) : null);
    Interact.markerStats = () => (markerLayer() ? markerLayer().stats : null);

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        this._ufDesignations = new DesignationMarkers(this._tilemap);
    };
    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        if (this._ufDesignations) this._ufDesignations.sync();
    };

    //-------------------------------------------------------------------------
    // Engine hooks: the mouse handler runs before the Overseer's controls (or from Scene_Map.update without it)

    if (typeof Scene_Map.prototype.updateOverseerControls === "function") {
        const _updateOverseerControls = Scene_Map.prototype.updateOverseerControls;
        Scene_Map.prototype.updateOverseerControls = function() {
            if (Interact.handleMouse()) return; // the menu took this frame's input: no select, move or deselect
            _updateOverseerControls.call(this);
        };
    } else {
        const _Scene_Map_update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            _Scene_Map_update.call(this);
            Interact.handleMouse();
        };
    }

    defineJobTypes();
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        defineJobTypes();
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "look": the UF_Look checks first, then the menu, designations and new job types)

    function registerChecks() {
        UF.Test.suite("look", async t => {
            const L = Look();
            const fx = L && typeof L.runChecks === "function" ? await L.runChecks(t) : null;
            const W = World(), O = Objects(), I = Items(), J = Jobs();
            const area = W && W.currentArea();
            if (!fx || !area || !O || !I || !J) {
                t.check("interact_ready", false, `look fixtures ${!!fx}, area ${JSON.stringify(area)}, Objects ${!!O}, Items ${!!I}, Jobs ${!!J}`);
                return;
            }
            const errors0 = t.errorsSoFar().length;
            const mid = fx.mid, cells = fx.cells;
            const put = (x, y, id) => {
                fx.placed.push({ x, y, was: O.typeIdAt(x, y) });
                return O.set(x, y, id);
            };
            const z = window.UF.Camera ? UF.Camera.zoom() : 1;
            const screenOf = (x, y) => ({ x: Math.round(($gameMap.adjustX(x) + 0.5) * 48 * z), y: Math.round(($gameMap.adjustY(y) + 0.5) * 48 * z) });
            const mouseTo = (x, y) => {
                const p = screenOf(x, y);
                TouchInput._x = p.x;
                TouchInput._y = p.y;
                return p;
            };
            const footY = y => Math.round($gameMap.adjustY(y) * 48 + 48);
            const jobText = job => (job ? `${job.type} #${job.id} ${job.state}${job.reason ? ` (${job.reason})` : ""} progress ${job.progress}` : "no job");
            const isFinished = job => job.state === "done" || job.state === "failed";
            const waitJob = (job, ms, what) => t.waitUntil(() => isFinished(job), ms, what || `job ${job.id} (${job.type}) to finish`).catch(() => {});
            const jobsBefore = new Set(J.list().map(j => j.id));
            const unitsBefore = new Set(W.units().map(u => u.id));
            const enabledLabels = opts => opts.filter(o => o.enabled !== false).map(o => o.label);

            t.check("job_types_defined", Interact.jobTypes.every(ty => !!J.handler(ty)), `handlers: ${Interact.jobTypes.map(ty => `${ty} ${J.handler(ty) ? "yes" : "MISSING"}`).join(", ")}`);

            // every_cell_has_options: one cell of every kind plus a seeded spread over the map, each with >= 2 enabled options.
            put(mid + 2, mid + 24, "grass_tuft");
            const log = I.drop(area, mid - 5, mid + 24, "log", 2)[0];
            const hare = W.addUnit({ name: "Hare", image: { characterName: "$U7_Hare" }, area, x: mid + 6, y: mid + 24, dir: 4, data: { kind: "creature", species: "hare", tags: ["grazer"], faction: null, ai: null } });
            fx.units.push(hare);
            put(mid + 8, mid + 21, "wall_wood");
            await t.waitFrames(2);
            const kinds = [
                ["tree", cells.oak.x, cells.oak.y], ["grass", mid + 2, mid + 24], ["bare ground", cells.bare.x, cells.bare.y], ["water", cells.water.x, cells.water.y],
                ["item", mid - 5, mid + 24], ["creature", mid + 6, mid + 24], ["colonist", cells.unit.x, cells.unit.y], ["site wall", mid + 8, mid + 21]
            ];
            const spread = [];
            for (let i = 0; i < 12; i++) spread.push([`cell ${i}`, 8 + ((i * 97) % 240), 8 + ((i * 53) % 240)]); // seeded spread, includes the ocean rim and far corners
            const sampled = kinds.concat(spread).map(([what, x, y]) => {
                const opts = optionsFor(x, y);
                return { what, x, y, n: enabledLabels(opts).length, labels: enabledLabels(opts), subject: (L.describeCell(x, y) || [""])[0] };
            });
            const short = sampled.filter(s => s.n < 2);
            t.check("every_cell_has_options", sampled.length === 20 && short.length === 0,
                `${sampled.length} cells sampled; ${short.length} with fewer than 2 options${short.length ? ` (${short.map(s => `${s.what} (${s.x},${s.y}): ${s.labels.join("/") || "none"}`).join("; ")})` : ""}; ` +
                kinds.map(([what, x, y]) => { const s = sampled.find(v => v.what === what); return `${what}: ${s.labels.join(" / ")}`; }).join(" | "));

            // menu_lists_actions: the menu opens on the oak with "Chop down oak".
            const at = mouseTo(cells.oak.x, cells.oak.y);
            const win = Interact.open(cells.oak.x, cells.oak.y);
            await t.waitFrames(3);
            const scene = SceneManager._scene;
            const inLayer = !!win && win.parent === scene._windowLayer && win.visible && win.active;
            const labels = win ? win.labels() : [];
            const chopLabel = labels.find(l => l.startsWith("Chop down"));
            const near = !!win && Math.abs(win.x + scene._windowLayer.x - at.x) <= win.width && Math.abs(win.y + scene._windowLayer.y - at.y) <= win.height;
            t.screenshot("context_menu");
            t.check("menu_lists_actions", inLayer && !!chopLabel && labels.includes("Look") && near && Interact.isOpen() && win.header() === "Oak — chop",
                win ? `menu at (${win.x},${win.y}) ${win.width}x${win.height} for the mouse at (${at.x},${at.y}); header "${win.header()}"; options: ${labels.join(" / ")}; in the window layer ${inLayer}` : "no menu window");

            // menu_creates_designation: choosing it makes an open chop job and a marker at z = foot row - 49.
            const chop = Interact.choose("Chop down");
            await t.waitFrames(2);
            const marker = Interact.markerAt(cells.oak.x, cells.oak.y);
            const wantZ = Math.max(Z_MIN, footY(cells.oak.y) - Z_BELOW_FEET);
            const tilemap = scene._spriteset._tilemap;
            const objSprite = O.spriteAt(cells.oak.x, cells.oak.y);
            t.check("menu_creates_designation", !!chop && chop.type === "chop" && chop.owner === null && chop.state === "open" && chop.target.x === cells.oak.x && chop.target.y === cells.oak.y && !Interact.isOpen()
                && !!marker && marker.visible && marker.parent === tilemap && marker.z === wantZ && marker.bitmap._ufName === "UF_GenDesignation_chop" && marker.bitmap.getAlphaPixel(3, 24) > 200 && (!objSprite || marker.z < objSprite.z),
                `${jobText(chop)} owner ${chop && chop.owner} at (${chop && chop.target.x},${chop && chop.target.y}); menu closed ${!Interact.isOpen()}; marker ${marker ? `at (${marker.x},${marker.y}) z ${marker.z} (want ${wantZ}, oak sprite z ${objSprite ? objSprite.z : "?"}), bitmap ${marker.bitmap._ufName}, outline alpha ${marker.bitmap.getAlphaPixel(3, 24)}` : "MISSING"}`);

            // menu_precedence: a right-click over the map opens the menu and keeps the Overseer's selection; over a UI window it deselects.
            // The oak's cell is in the top half of the screen, clear of the colonist card that appears at the bottom-left on select.
            const cm = window.$colonyManager;
            const adapter = cm && cm.colonists && cm.colonists.length ? cm.colonists[0] : null;
            if (adapter) cm.select(adapter);
            const pm = mouseTo(cells.oak.x, cells.oak.y);
            const overUIBefore = L.isOverUI();
            TouchInput._currentState.cancelled = true;
            scene.updateOverseerControls();
            const openedOnMap = Interact.isOpen(), keptSel = !adapter || cm.selectedColonist === adapter;
            TouchInput._currentState.cancelled = false;
            Interact.close();
            await t.waitFrames(2);
            // Over the colonist card (visible after select) or a probe window when there's no card.
            const card = scene._colonyCard && scene._colonyCard.visible ? scene._colonyCard : new Window_Base(new Rectangle(40, 40, 200, 80));
            if (card !== scene._colonyCard) scene.addWindow(card);
            TouchInput._x = card.x + scene._windowLayer.x + 20;
            TouchInput._y = card.y + scene._windowLayer.y + 20;
            TouchInput._currentState.cancelled = true;
            scene.updateOverseerControls();
            const openedOnUI = Interact.isOpen(), deselected = !adapter || cm.selectedColonist === null;
            TouchInput._currentState.cancelled = false;
            if (card !== scene._colonyCard) scene._windowLayer.removeChild(card);
            t.check("menu_precedence", openedOnMap && keptSel && !openedOnUI && deselected && !overUIBefore,
                `right-click on the oak's cell (${cells.oak.x},${cells.oak.y}) at screen (${pm.x},${pm.y}) [over a window: ${overUIBefore}]: menu opened ${openedOnMap}, selection kept ${keptSel}${adapter ? ` (${adapter.name})` : " (no Overseer colonist to select)"}; right-click over a window at (${TouchInput._x},${TouchInput._y}): menu opened ${openedOnUI}, Overseer deselected ${deselected}`);

            // cancel_designation: the option appears on the designated cell and removes the job and its marker.
            const optsOak = optionsFor(cells.oak.x, cells.oak.y);
            const cancelOpt = optsOak.find(o => o.id === "cancel");
            const n = cancelOpt ? cancelOpt.run() : 0;
            await t.waitFrames(2);
            t.check("cancel_designation", !!cancelOpt && n === 1 && chop.state === "failed" && !Interact.markerAt(cells.oak.x, cells.oak.y) && !optionsFor(cells.oak.x, cells.oak.y).some(o => o.id === "cancel"),
                `option "${cancelOpt ? cancelOpt.label : "MISSING"}" cancelled ${n} job(s): ${jobText(chop)}; marker after: ${Interact.markerAt(cells.oak.x, cells.oak.y) ? "still there" : "gone"}`);

            // build submenu: the culture's wall first, choosing one makes an open build job.
            const openB = Interact.open(cells.bare.x, cells.bare.y);
            const sub = Interact.choose("Build here");
            const subLabels = Interact.isOpen() ? Interact.menu().labels() : [];
            const wall = cultureWall();
            const wallName = wall && O.type(wall) ? O.type(wall).name : null;
            const buildJob = Interact.choose(1); // the first buildable after "Back"
            await t.waitFrames(2);
            const buildMarker = Interact.markerAt(cells.bare.x, cells.bare.y);
            t.check("build_submenu", !!openB && !!sub && sub.submenu && subLabels[0] === "Back" && subLabels.length >= 3 && (!wallName || subLabels[1].startsWith(wallName)) && !!buildJob && buildJob.type === "build" && buildJob.owner === null && buildJob.params.objectId === (wall || buildJob.params.objectId) && !!buildMarker && buildMarker.bitmap._ufName === "UF_GenDesignation_build",
                `submenu: ${subLabels.join(" / ")}; culture wall "${wall}" (${wallName}); chose: ${jobText(buildJob)} objectId ${buildJob && buildJob.params.objectId}; marker ${buildMarker ? buildMarker.bitmap._ufName : "MISSING"}`);
            if (buildJob) J.cancel(buildJob.id, "test over");

            // The rest runs at x8 with a test worker that takes the designations (UF.Jobs.take), like a colonist's planner would.
            if (window.UF.Time) UF.Time.setLevel(3);
            const worker = W.addUnit({ name: "TEST_digger", image: { characterName: "$U7_Townsman" }, area, x: mid - 6, y: mid + 25, dir: 8,
                data: { kind: "test", faction: "player", inventory: [], equipment: {} } });
            fx.units.push(worker);

            // dig_and_fish
            const dx = mid - 6, dy = mid + 22;
            for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) fx.tiles.push({ x: dx + ox, y: dy + oy, was: W.getTile(area.x, area.y, dx + ox, dy + oy, 0) });
            const kindBefore = window.UF.Tiles.kindOfTile($gameMap.tileId(dx, dy, 0));
            const digOpt = optionsFor(dx, dy).find(o => o.id === "dig");
            const dig = digOpt && digOpt.enabled ? digOpt.run() : null;
            const tookDig = dig ? J.take(worker.id) : null;
            if (dig) await waitJob(dig, 20000);
            const kindAfter = window.UF.Tiles.kindOfTile($gameMap.tileId(dx, dy, 0));
            const shapeNow = kindAfter ? ($gameMap.tileId(dx, dy, 0) - window.UF.Tiles.groundBase(kindAfter.id)) : -1;
            const wantShape = autotileShape((ox, oy) => { const k = window.UF.Tiles.kindOfTile($gameMap.tileId(dx + ox, dy + oy, 0)); return !!k && k.id === DIG_GROUND; });
            const stones = I.count({ area, x: dx, y: dy }, DIG_STONE_ITEM);
            const digOk = !!dig && tookDig === dig && dig.state === "done" && !!kindBefore && kindBefore.id !== DIG_GROUND && !!kindAfter && kindAfter.id === DIG_GROUND && shapeNow === wantShape && dig.result && stones === dig.result.stone && (dig.result.roll === 0) === (dig.result.stone === 1);
            const fishCell = cells.water;
            const fishOpt = optionsFor(fishCell.x, fishCell.y).find(o => o.id === "fish");
            const fish = fishOpt ? fishOpt.run() : null;
            const tookFish = fish ? J.take(worker.id) : null;
            let fishStand = null;
            if (fish) await t.waitUntil(() => { if (fish.state === "work" && !fishStand) fishStand = { x: worker.x, y: worker.y }; return isFinished(fish); }, 25000, "the fishing to finish").catch(() => {});
            const r = fish && fish.result;
            const fishHere = r && r.at ? I.count({ area, x: r.at.x, y: r.at.y }, FISH_ITEM) : 0;
            const fishOk = !!fish && tookFish === fish && fish.state === "done" && !!fishStand && manhattan(fishStand.x, fishStand.y, fishCell.x, fishCell.y) === 1 && !!r && r.caught === (r.roll !== 0) && fishHere === (r.caught ? 1 : 0);
            t.check("dig_and_fish", digOk && fishOk,
                `dig at (${dx},${dy}): ${jobText(dig)} taken by the worker ${tookDig === dig}; ground ${kindBefore ? kindBefore.id : "?"} -> ${kindAfter ? kindAfter.id : "?"}, shape ${shapeNow} (want ${wantShape}); roll ${dig && dig.result ? dig.result.roll : "?"} of ${DIG_STONE_ONE_IN} -> ${dig && dig.result ? dig.result.stone : "?"} stone, ${stones} on the cell | ` +
                `fish at (${fishCell.x},${fishCell.y}): ${jobText(fish)} taken ${tookFish === fish}; stood at ${fishStand ? `(${fishStand.x},${fishStand.y})` : "nowhere"}; roll ${r ? r.roll : "?"} of ${FISH_CATCH_OF} -> ${r ? (r.caught ? "a fish" : "nothing (the miss is reported)") : "?"}, fish on the stand cell ${fishHere}`);

            // dismantle: the wall's build items lie on the cell, the wall is gone.
            const wx = mid + 8, wy = mid + 21;
            const dmOpt = optionsFor(wx, wy).find(o => o.id === "dismantle");
            const dm = dmOpt ? dmOpt.run() : null;
            const tookDm = dm ? J.take(worker.id) : null;
            if (dm) await waitJob(dm, 20000);
            const logsHere = I.count({ area, x: wx, y: wy }, "log");
            t.check("dismantle", !!dmOpt && dmOpt.label === "Dismantle wooden wall" && !!dm && tookDm === dm && dm.state === "done" && O.typeIdAt(wx, wy) === 0 && logsHere === 1,
                `option "${dmOpt ? dmOpt.label : "MISSING"}": ${jobText(dm)}; cell (${wx},${wy}) now ${O.at(wx, wy) ? O.at(wx, wy).id : "empty"}, logs on it ${logsHere} (a wooden wall costs 1 log)`);

            // designation_done_by_colonist: a chop designation is taken and the tree becomes a stump; the marker goes.
            const chop2 = designate({ type: "chop", target: { area, x: cells.oak.x, y: cells.oak.y } });
            await t.waitFrames(2);
            const markerBefore = !!Interact.markerAt(cells.oak.x, cells.oak.y);
            const colonists = colonistUnits(area).filter(u => !fx.units.includes(u));
            let taker = null, path;
            if (window.UF.Colonists && colonists.length) {
                path = `waited for one of ${colonists.length} colonists (UF_Colonists present)`;
                await t.waitUntil(() => isFinished(chop2) || (chop2.assigned && (taker = W.unit(chop2.assigned))), 60000, "a colonist to take the chop designation").catch(() => {});
                await waitJob(chop2, 60000);
            } else {
                path = `${window.UF.Colonists ? "UF_Colonists present but no colonist unit exists in this area" : "UF_Colonists absent"}: a test worker took it with UF.Jobs.take`;
                taker = J.take(worker.id) === chop2 ? worker : null;
                await waitJob(chop2, 30000);
            }
            await t.waitFrames(2);
            const stump = O.typeIdAt(cells.oak.x, cells.oak.y) === O.typeId("stump");
            const logsOak = I.count({ area, x: cells.oak.x, y: cells.oak.y }, "log");
            t.check("designation_done_by_colonist", !!chop2 && markerBefore && !!taker && chop2.state === "done" && stump && logsOak === 3 && !Interact.markerAt(cells.oak.x, cells.oak.y),
                `${path}; ${jobText(chop2)} taken by ${taker ? taker.name : "nobody"}; marker before ${markerBefore}, after ${Interact.markerAt(cells.oak.x, cells.oak.y) ? "STILL THERE" : "gone"}; cell now ${O.at(cells.oak.x, cells.oak.y) ? O.at(cells.oak.x, cells.oak.y).id : "empty"}, logs ${logsOak}`);

            // hunt and haul options create the right open jobs.
            const huntOpt = optionsFor(hare.x, hare.y).find(o => o.id === "hunt");
            const hunt = huntOpt ? huntOpt.run() : null;
            put(mid - 5, mid + 26, STOCKPILE_OBJECT);
            const haulOpt = optionsFor(log.x, log.y).find(o => o.id === "haul");
            const hauls = haulOpt && haulOpt.enabled ? haulOpt.run() : null;
            const haul = hauls && hauls[0];
            // The destination is a stockpile: the test one 2 cells away, unless the colony lists a woodpile that stores wood (preferred).
            const to = haul && haul.params.to;
            const colonyPiles = (W.state.colony && Array.isArray(W.state.colony.stockpiles)) ? W.state.colony.stockpiles : [];
            const toIsPile = !!to && (O.typeIdAt(to.x, to.y) === O.typeId(STOCKPILE_OBJECT) || colonyPiles.some(p => p.x === to.x && p.y === to.y));
            const woodPile = colonyPiles.find(p => Array.isArray(p.stores) && p.stores.includes("wood"));
            const toIsRight = !!to && (woodPile ? to.x === woodPile.x && to.y === woodPile.y : to.x === mid - 5 && to.y === mid + 26);
            t.check("hunt_and_haul_options", !!hunt && hunt.type === "hunt" && hunt.params.unitId === hare.id && hunt.owner === null && !!haulOpt && haulOpt.enabled && !!haul && haul.type === "haul" && haul.params.itemId === log.id && toIsPile && toIsRight,
                `"${huntOpt ? huntOpt.label : "MISSING"}" -> ${jobText(hunt)} prey ${hunt && hunt.params.unitId} (hare ${hare.id}); "${haulOpt ? haulOpt.label : "MISSING"}" -> ${jobText(haul)} item ${haul && haul.params.itemId} to (${to && to.x},${to && to.y}) [test stockpile at (${mid - 5},${mid + 26}); colony stockpiles: ${colonyPiles.length}${woodPile ? `, woodpile at (${woodPile.x},${woodPile.y}) preferred` : ""}]`);
            const perf = Interact.markerStats();
            const p0 = perf ? { frames: perf.frames, ms: perf.ms } : null;
            await t.waitFrames(60);
            const avg = perf && perf.frames > p0.frames ? (perf.ms - p0.ms) / (perf.frames - p0.frames) : NaN;
            t.check("markers_perf", avg <= 0.5, `marker sync averaged ${avg.toFixed(3)} ms over ${perf ? perf.frames - p0.frames : 0} frames with ${perf ? perf.shown : "?"} markers shown and ${J.list().length} jobs in the list`);

            // saved: designations and the new job types are in the world state.
            const copy = JsonEx.parse(JsonEx.stringify(W.state));
            const savedDig = copy.jobs && copy.jobs.list.find(j => j.id === dig.id);
            t.check("saved", !!savedDig && savedDig.type === "dig" && savedDig.state === "done" && !!savedDig.result && savedDig.result.ground === DIG_GROUND,
                `dig #${dig && dig.id} after a JsonEx round-trip: ${savedDig ? `${savedDig.type} ${savedDig.state}, result ${JSON.stringify(savedDig.result)}` : "missing"}`);

            // Clean up: menu, jobs, this suite's units, then the look fixtures (units, items, objects, tiles, zoom, view).
            Interact.close();
            for (const j of J.list()) if (!jobsBefore.has(j.id) && !isFinished(j)) J.cancel(j.id, "test over");
            for (const u of W.units()) if (!unitsBefore.has(u.id)) W.removeUnit(u.id);
            if (window.UF.Time) UF.Time.setLevel(0);
            L.cleanup(fx);
            await t.waitFrames(5);
            const errs = t.errorsSoFar().slice(errors0);
            t.check("no_errors", errs.length === 0, errs.length ? `${errs.length} error(s), first: ${errs[0]}` : "none during look/interact checks");
        });
    }
})();
