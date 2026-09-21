/*:
 * @target MZ
 * @plugindesc [UF] Saved natural passages connecting Ground, -1 and -2; checked physical traversal.
 * @author Codex
 * @base UF_World
 * @base UF_Levels
 * @base UF_Jobs
 * @orderAfter UF_History
 * @orderAfter UF_Levels
 * @orderAfter UF_Jobs
 * @help
 * New worlds receive paired natural passages in existing clear, dry cave
 * columns. No terrain, resource, settlement or catalog records are replaced.
 * Passage art reuses UF_Levels' existing stair placeholders. World.newWorld
 * is aliased so selection happens after founding and founder seating.
 * Old saves are unchanged; UF.NaturalConnections.generate() explicitly adds
 * passages if a save has no record. Failed generation explains why, without
 * pretending a disconnected/blocked world has a usable chain.
 *
 * UF.NaturalConnections.travel(unitOrId, linkId) assigns a natural_travel
 * job: walk to the exact entrance, then traverse only if its landing is free.
 * This does not turn camera layer switches into creature movement and does
 * not replace general World.sendUnit pathfinding or another active job.
 * F6: selected player colonist uses the nearest reachable downward passage.
 * Shift+F6: upward. These explicit orders replace work only after preflight.
 * API, limits and checks: docs/systems/UF_NaturalConnections.md
 * Replaced core methods: none (aliases only).
 */
(() => {
    "use strict";
    const VERSION = 1, TYPE = "natural_travel", DEPTHS = [0, -1, -2];
    const N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
    const W = () => window.UF && UF.World;
    const L = () => window.UF && UF.Levels;
    const J = () => window.UF && UF.Jobs;
    const copy = value => JSON.parse(JSON.stringify(value));
    const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    const areaEqual = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const sameCell = (a, b) => !!a && !!b && areaEqual(a.area, b.area) && zOf(a) === zOf(b) && a.x === b.x && a.y === b.y;
    const ref = (area, x, y, z) => ({ area: { x: area.x, y: area.y }, x, y, z });
    let lastRefusal = null;
    const reject = reason => { lastRefusal = reason; return null; };
    function validCell(r) {
        const world = W(), st = world && world.state;
        return !!st && !!r && !!r.area && Number.isInteger(r.area.x) && Number.isInteger(r.area.y) &&
            Number.isInteger(r.x) && Number.isInteger(r.y) && DEPTHS.includes(zOf(r)) &&
            r.x >= 0 && r.y >= 0 && r.x < st.size && r.y < st.size && world.inWorld(r.area.x, r.area.y, zOf(r));
    }
    function dry(r, unit) {
        if (!validCell(r)) return false;
        if (hasFluid(r, "water")) return false;
        const levels = L(), z = zOf(r);
        if (z < 0 && (!levels.standableShape(r) || levels.waterAt(r))) return false;
        return W().walkable(r.area.x, r.area.y, r.x, r.y, { z, unit });
    }
    function free(r, unit) {
        return dry(r, unit) && W().cellFree(r.area.x, r.area.y, r.x, r.y, unit ? unit.id : 0, zOf(r));
    }
    function neighbor(r) {
        for (const [dx, dy] of N4) {
            const n = ref(r.area, r.x + dx, r.y + dy, zOf(r));
            if (free(n) && W().reachable({ x: r.area.x, y: r.area.y, z: zOf(r) }, r.x, r.y, n.x, n.y)) return n;
        }
        return null;
    }
    function exactPath(unit, to) {
        if (!unit || !areaEqual(unit.area, to.area) || zOf(unit) !== zOf(to) || !dry(to, unit)) return false;
        const path = W().findPath({ x: to.area.x, y: to.area.y, z: zOf(to) }, unit.x, unit.y, to.x, to.y,
            { unit, z: zOf(to), allowPartial: false, resolveBlocked: false, maxNodes: W().state.size * W().state.size });
        return !!path && !path.partial && (sameCell(unit, to) || path.length > 0 && path[path.length - 1].x === to.x && path[path.length - 1].y === to.y);
    }
    function state() { return W() && W().state ? W().state.naturalConnections || null : null; }
    function links() { const s = state(); return s && s.version === VERSION && Array.isArray(s.links) ? s.links : []; }
    function list(filter = {}) {
        return links().filter(link => [link.a, link.b].some(e =>
            (filter.z === undefined || zOf(e) === filter.z) && (!filter.area || areaEqual(e.area, filter.area)))).map(copy);
    }
    function at(cell) { return validCell(cell) ? links().filter(link => sameCell(link.a, cell) || sameCell(link.b, cell)).map(copy) : []; }
    function endpoints(link, unit) {
        if (!link || !unit || !validCell(link.a) || !validCell(link.b) || !areaEqual(link.a.area, link.b.area) ||
            Math.abs(zOf(link.a) - zOf(link.b)) !== 1 || link.a.x !== link.b.x || link.a.y !== link.b.y) return null;
        for (const [from, to] of [[link.a, link.b], [link.b, link.a]]) {
            if (areaEqual(from.area, unit.area) && zOf(from) === zOf(unit)) return { from, to };
        }
        return null;
    }
    function protectedCell(r, sites, reservations) {
        if (reservations.has(`${zOf(r)}:${r.x},${r.y}`)) return true;
        return sites.some(s => areaEqual(s.area, r.area) && zOf(s) === zOf(r) &&
            Math.max(Math.abs(r.x - s.x), Math.abs(r.y - s.y)) <= Math.max(4, Number(s.radius) || 0) + 2);
    }
    function generationReservations(area) {
        const out = new Set(), st = W().state;
        const add = (x, y, z) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.add(`${z}:${x + dx},${y + dy}`); };
        // Include retained former homes: a household merge does not free its building.
        for (const h of Object.values(st.households && st.households.byId || {})) if (areaEqual(h.area, area)) {
            const structures = UF.Households && typeof UF.Households.structures === "function" ? UF.Households.structures(h) : [h.home];
            for (const p of structures.filter(Boolean)) {
                for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) add(x, y, zOf(h));
                if (p.entrance) add(p.entrance.x, p.entrance.y, zOf(h));
            }
        }
        const settlements = UF.Colonists && UF.Colonists.settlements ? UF.Colonists.settlements() : [];
        for (const c of settlements) if (areaEqual(c.area, area)) {
            const radius = Math.max(4, Number(c.radius) || 0);
            // Outside the planned enclosure, not just between two future wall pieces.
            for (let y = c.site.y - radius; y <= c.site.y + radius; y++) for (let x = c.site.x - radius; x <= c.site.x + radius; x++) add(x, y, zOf(c));
            for (const step of c.plan || []) for (const [dx, dy] of step.cells || []) add(c.site.x + dx, c.site.y + dy, zOf(c));
        }
        return out;
    }
    /** Endpoint and one-cell clearance kept available for later home planners. */
    function reserved(cell) {
        return validCell(cell) && links().some(link => [link.a, link.b].some(e => areaEqual(e.area, cell.area) && e.z === zOf(cell) &&
            Math.max(Math.abs(cell.x - e.x), Math.abs(cell.y - e.y)) <= 1));
    }
    function anchorFor(area) {
        const world = W(), units = world.units().filter(u => areaEqual(u.area, area) && zOf(u) === 0 && dry(u, u));
        const home = UF.History && UF.History.homeSite ? UF.History.homeSite() : null;
        if (home && zOf(home) === 0 && areaEqual(home.area, area)) {
            units.sort((a, b) => (a.data && a.data.faction === home.faction ? 0 : 1) -
                (b.data && b.data.faction === home.faction ? 0 : 1) ||
                Math.abs(a.x - home.x) + Math.abs(a.y - home.y) - Math.abs(b.x - home.x) - Math.abs(b.y - home.y) || a.id - b.id);
        } else units.sort((a, b) => a.id - b.id);
        if (units.length) return units[0];
        // A terrain-only world can use an actual clear central cell, not an invented unit.
        const size = world.state.size, candidates = [];
        for (let y = 2; y < size - 2; y++) for (let x = 2; x < size - 2; x++) candidates.push({ x, y, d: Math.abs(x - size / 2) + Math.abs(y - size / 2) });
        candidates.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
        for (const c of candidates) { const r = ref(area, c.x, c.y, 0); if (dry(r)) return r; }
        return null;
    }
    /** Idempotent: never rerolls saved links or silently changes an old generator record. */
    function generate() {
        const world = W(), levels = L(), st = world && world.state;
        if (!st || !levels || !st.levels) return reject("world levels are not initialized");
        if (st.naturalConnections) return st.naturalConnections;
        const saved = { version: VERSION, seed: st.seed, status: "blocked", links: [], chains: [], reason: "", survey: { candidates: 0, tested: 0 } };
        st.naturalConnections = saved;
        const area = { x: st.startArea.x, y: st.startArea.y }, anchor = anchorFor(area);
        if (!anchor) { saved.reason = "No dry surface anchor exists; terrain excavation needs approval."; return saved; }
        saved.anchor = ref(area, anchor.x, anchor.y, 0);
        const sites = UF.History && UF.History.sites ? UF.History.sites() : ((st.history && st.history.sites) || []);
        const reservations = generationReservations(area);
        const b1 = levels.baseline(-1, area.x, area.y), b2 = levels.baseline(-2, area.x, area.y), size = st.size;
        const candidates = [];
        for (let y = 2; y < size - 2; y++) for (let x = 2; x < size - 2; x++) {
            const i = y * size + x;
            // Baseline filters are only a shortcut; actual saved shape/tile/object checks follow.
            if (b1.shape[i] !== levels.SHAPES.floor || b2.shape[i] !== levels.SHAPES.floor || b1.water && b1.water[i] || b2.water && b2.water[i]) continue;
            const cells = DEPTHS.map(z => ref(area, x, y, z));
            if (cells.some(c => protectedCell(c, sites, reservations))) continue;
            candidates.push({ x, y, distance: Math.abs(x - anchor.x) + Math.abs(y - anchor.y),
                tie: world.hash32(st.seed, x, y, 0x4e4154) >>> 0 });
        }
        candidates.sort((a, b) => a.distance - b.distance || a.tie - b.tie || a.y - b.y || a.x - b.x);
        saved.survey.candidates = candidates.length;
        for (const candidate of candidates) {
            if (saved.chains.length && Math.max(Math.abs(candidate.x - saved.chains[0].x), Math.abs(candidate.y - saved.chains[0].y)) < 48) continue;
            saved.survey.tested++;
            const cells = DEPTHS.map(z => ref(area, candidate.x, candidate.y, z));
            if (cells.some(c => !free(c))) continue;
            const landings = cells.map(neighbor);
            if (landings.some(n => !n) || !exactPath(anchor, cells[0])) continue;
            const chain = saved.chains.length + 1, id = `natural_${area.x}_${area.y}_${chain}`;
            saved.links.push({ id: `${id}_upper`, chain, kind: "natural_passage", a: cells[0], b: cells[1] });
            saved.links.push({ id: `${id}_lower`, chain, kind: "natural_passage", a: copy(cells[1]), b: cells[2] });
            saved.chains.push({ id, x: candidate.x, y: candidate.y, area: copy(area), landings });
            if (saved.chains.length >= 2) break;
        }
        const cliffMouths = levels.cliffCaveMouths ? levels.cliffCaveMouths(area) : [];
        for (let mi = 0; mi < cliffMouths.length; mi++) {
            const cm = cliffMouths[mi];
            const linkId = `cliff_cave_${area.x}_${area.y}_${mi + 1}`;
            if (!saved.links.some(l => l.id === linkId)) {
                saved.links.push({
                    id: linkId,
                    chain: saved.chains.length + 1,
                    kind: "cliff_cave_passage",
                    a: ref(area, cm.terminus.x, cm.terminus.y, 0),
                    b: ref(area, cm.terminus.x, cm.terminus.y, -1)
                });
            }
        }
        saved.status = (saved.chains.length || saved.links.length) ? "ready" : "blocked";
        saved.reason = (saved.chains.length || saved.links.length) ? "" : "No existing clear, dry cave column connects the reachable surface to both depths. Excavation or another generator seam is required.";
        if (UF.Events) UF.Events.emit("naturalConnections:generated", saved);
        return saved;
    }
    function validateTravel(job, unit, requireArrival) {
        if (job.params.refusal) return { ok: false, reason: job.params.refusal };
        const link = links().find(c => c.id === job.params.linkId), route = endpoints(link, unit);
        if (!route || !sameCell(route.from, job.target)) return { ok: false, reason: "the passage is not on the worker's level" };
        if (requireArrival && !sameCell(unit, route.from)) return { ok: false, reason: "the worker has not reached the entrance" };
        if (!dry(route.from, unit)) return { ok: false, reason: "the entrance is blocked or unsupported" };
        if (!free(route.to, unit)) return { ok: false, reason: "the landing is occupied, blocked, wet or unsupported" };
        return { ok: true, route };
    }
    function defineJob() {
        J().define(TYPE, {
            verb: "Traversing a natural passage", work: 60,
            plan(job, unit) {
                const check = validateTravel(job, unit, false);
                if (!check.ok) return check;
                if (!exactPath(unit, check.route.from)) return { ok: false, reason: "cannot reach the natural entrance" };
                return { ok: true, stand: copy(check.route.from) };
            },
            apply(job, unit) {
                const check = validateTravel(job, unit, true);
                const refuse = reason => { job.params.refusal = reason; return "continue"; };
                // Returning continue makes the next plan fail normally. Jobs.finish
                // would overwrite a cancellation inside apply with a false success.
                if (!check.ok) return refuse(check.reason);
                const from = copy(check.route.from), to = copy(check.route.to);
                if (!W().moveUnitToLevel(unit, to.z, to.x, to.y)) return refuse("the level move was refused");
                job.target = copy(to); // terminal record must name the worker's new level
                job.stand = null;
                job.result = { moved: true, linkId: job.params.linkId, from, to };
                if (UF.Events) UF.Events.emit("naturalConnections:traversed", unit, copy(job.result));
            },
            describe(job) {
                const link = links().find(c => c.id === job.params.linkId);
                const destination = link && [link.a, link.b].find(e => !sameCell(e, job.target));
                return `Traversing a natural passage${destination ? ` to ${destination.z === 0 ? "Ground" : destination.z}` : ""}`;
            }
        });
    }
    function travel(unitOrId, linkId) {
        lastRefusal = null;
        const world = W(), unit = typeof unitOrId === "object" ? unitOrId : world && world.unit(unitOrId);
        if (!unit || !world || world.unit(unit.id) !== unit || !J()) return reject("no world worker");
        if (J().of(unit.id) || unit.goal) return reject("the worker already has an order");
        const link = links().find(c => c.id === linkId), route = endpoints(link, unit);
        if (!route) return reject("no passage from the worker's current area and level");
        const job = J().create({ type: TYPE, owner: unit.id, target: copy(route.from), params: { linkId }, priority: 60 });
        if (job && job.state === "failed") lastRefusal = job.reason || "cannot use passage";
        return job;
    }

    /**
     * Universal creature traversal: allows any creature, wildlife, monster, or unit
     * to physically travel through a natural connection between layers.
     */
    function traverse(unitOrId, linkOrRoute) {
        lastRefusal = null;
        const world = W(), unit = typeof unitOrId === "object" ? unitOrId : world && world.unit(unitOrId);
        if (!unit || !world || world.unit(unit.id) !== unit) return reject("no world creature");
        let route = null;
        if (linkOrRoute && linkOrRoute.from && linkOrRoute.to) {
            route = linkOrRoute;
        } else if (linkOrRoute) {
            const link = typeof linkOrRoute === "object" ? linkOrRoute : links().find(c => c.id === linkOrRoute);
            route = link ? endpoints(link, unit) : null;
        } else {
            const here = at(unit);
            if (here && here.length > 0) {
                route = endpoints(here[0], unit);
            }
        }
        if (!route) return reject("no passage from creature's location");
        if (!dry(route.from, unit)) return reject("the entrance is blocked or unsupported");
        if (!free(route.to, unit)) return reject("the landing is occupied, blocked, wet or unsupported");
        const from = copy(route.from), to = copy(route.to);
        if (!world.moveUnitToLevel(unit, to.z, to.x, to.y)) return reject("the level move was refused");
        if (unit.data) {
            unit.data._lastLayerTraverse = (UF.Time && typeof UF.Time.ticks === "function") ? UF.Time.ticks() : Date.now();
        }
        const result = { moved: true, unitId: unit.id, from, to };
        if (UF.Events) {
            UF.Events.emit("naturalConnections:traversed", unit, copy(result));
            UF.Events.emit("creature:traversed", unit, copy(result));
        }
        return result;
    }

    //-------------------------------------------------------------------------
    // Liquid physics across natural connections

    const fluidKey = r => `${r.area ? r.area.x : 0},${r.area ? r.area.y : 0}:${zOf(r)}:${r.x},${r.y}`;

    function fluidsState() {
        const s = state();
        if (!s) return null;
        if (!s.fluids) s.fluids = { cells: {} };
        return s.fluids;
    }

    function hasFluid(r, type = "water") {
        if (!validCell(r)) return false;
        const fs = fluidsState();
        if (fs && fs.cells) {
            const entry = fs.cells[fluidKey(r)];
            if (entry && (!type || entry.type === type)) return true;
        }
        return false;
    }

    function isWater(r) {
        if (!validCell(r)) return false;
        if (hasFluid(r, "water")) return true;
        const levels = L();
        if (levels && typeof levels.waterAt === "function" && levels.waterAt(r)) return true;
        const jobs = J();
        if (jobs && typeof jobs.isWaterAt === "function" && jobs.isWaterAt(r.area || { x: 0, y: 0 }, r.x, r.y)) return true;
        return false;
    }

    const modifiedBaselines = [];
    function addFluid(r, type = "water") {
        if (!validCell(r)) return false;
        const fs = fluidsState();
        if (!fs) return false;
        fs.cells[fluidKey(r)] = { type, time: (UF.Time && typeof UF.Time.ticks === "function") ? UF.Time.ticks() : 0 };
        const levels = L(), world = W();
        const z = zOf(r);
        if (z < 0 && levels && typeof levels.baseline === "function" && world && world.state) {
            const b = levels.baseline(z, r.area ? r.area.x : 0, r.area ? r.area.y : 0);
            if (b && b.water) {
                const idx = r.y * (world.state.size || 24) + r.x;
                if (!b.water[idx]) {
                    b.water[idx] = 1;
                    modifiedBaselines.push({ b, idx });
                }
            }
        }
        return true;
    }

    function clearFluids() {
        const fs = fluidsState();
        if (fs) fs.cells = {};
        while (modifiedBaselines.length > 0) {
            const m = modifiedBaselines.pop();
            if (m.b && m.b.water) m.b.water[m.idx] = 0;
        }
    }

    function updateFluids() {
        const cList = links();
        if (!cList.length) return [];
        const flows = [];
        const nowTicks = (UF.Time && typeof UF.Time.ticks === "function") ? UF.Time.ticks() : 0;

        for (const link of cList) {
            const upper = zOf(link.a) > zOf(link.b) ? link.a : link.b;
            const lower = zOf(link.a) > zOf(link.b) ? link.b : link.a;

            // Liquid flows down only if liquid is actually present at the upper entrance
            if (isWater(upper)) {
                addFluid(lower, "water");

                const flow = { linkId: link.id, type: "water", from: copy(upper), to: copy(lower), tick: nowTicks };
                flows.push(flow);
                if (UF.Events) {
                    UF.Events.emit("naturalConnections:fluidFlow", flow);
                    UF.Events.emit("fluids:flow", flow);
                }
            }
        }
        return flows;
    }

    function stepCreatures() {
        const world = W();
        if (!world || !world.state) return;
        const nowTicks = (UF.Time && typeof UF.Time.ticks === "function") ? UF.Time.ticks() : 0;
        const cList = links();
        if (!cList.length) return;

        for (const u of world.units()) {
            if (!u || !u.data) continue;
            // People and colonists follow player orders and jobs, not wandering auto-step
            if (u.data.kind === "colonist" || u.data.kind === "person") continue;
            if (J() && typeof J().of === "function" && J().of(u.id)) continue;
            if (u.goal) continue;

            const last = u.data._lastLayerTraverse || 0;
            if (last && nowTicks - last < 150) continue;

            const here = at(u);
            if (!here.length) continue;

            const route = endpoints(here[0], u);
            if (!route || !free(route.to, u)) continue;

            traverse(u, route);
        }
    }

    let feedback = { text: "", until: 0 };
    function showFeedback(text) {
        feedback = { text, until: Graphics.frameCount + 240 };
        const scene = SceneManager._scene, panel = scene && scene._ufPassageNotice;
        if (panel) {
            panel.contents.clear(); panel.contents.fontSize = 17;
            const words = text.split(/\s+/); let line = "", y = 0;
            for (const word of words) {
                const next = line ? `${line} ${word}` : word;
                if (panel.textWidth(next) > panel.innerWidth && line) { panel.drawText(line, 0, y, panel.innerWidth); y += 23; line = word; } else line = next;
            }
            panel.drawText(line, 0, y, panel.innerWidth); panel.show();
        } else console.warn(`UF_NaturalConnections: ${text}`);
    }
    function selectedPlayer() {
        const colonists = UF.Colonists, select = UF.Select;
        const primary = select && typeof select.primary === "function" ? select.primary() : null;
        const current = primary || window.$colonyManager && $colonyManager.selectedColonist;
        const unit = current && W().unit(typeof current === "object" ? current.id : current);
        return unit && colonists && colonists.isColonist(unit) ? unit : null;
    }
    /** Explicit player command; invalid preflight never cancels the current order. */
    function orderSelected(direction = -1) {
        const unit = selectedPlayer(), colony = UF.Colonists;
        if (!unit) { showFeedback("Select one of your colonists. F6 descends; Shift+F6 ascends."); return reject("no selected player colonist"); }
        if (direction !== -1 && direction !== 1) return reject("direction must be -1 or 1");
        const choices = links().map(link => ({ link, route: endpoints(link, unit) })).filter(c => c.route && c.route.to.z - c.route.from.z === direction);
        choices.sort((a, b) => Math.abs(unit.x - a.route.from.x) + Math.abs(unit.y - a.route.from.y) -
            Math.abs(unit.x - b.route.from.x) - Math.abs(unit.y - b.route.from.y) || a.link.id.localeCompare(b.link.id));
        for (const c of choices) {
            const check = validateTravel({ target: c.route.from, params: { linkId: c.link.id } }, unit, false);
            if (!check.ok || !exactPath(unit, c.route.from)) continue;
            const job = colony.order(unit.id, { type: TYPE, target: copy(c.route.from), params: { linkId: c.link.id } });
            if (job && job.state !== "failed") {
                lastRefusal = null; showFeedback(`${unit.name}: walking to a natural passage to ${c.route.to.z === 0 ? "Ground" : c.route.to.z}.`); return job;
            }
            showFeedback(`Cannot use that passage: ${job && job.reason || "order refused"}.`); return job;
        }
        const reason = state() && state().status === "blocked" ? state().reason : "No reachable, clear natural passage in that direction. Current order kept.";
        showFeedback(reason); return reject(reason);
    }
    // Existing Levels B-sheet placeholder art, independent of Ground's tileset.
    // No catalog object or surface tile is overwritten to display an entrance.
    class PassageMarkers {
        constructor(tilemap) { this.tilemap = tilemap; this.pool = []; }
        update() {
            for (const s of this.pool) s.visible = false;
            const world = W(), view = world && world.viewLevel(), levels = L();
            if (!view || !levels || !window.$gameMap) return;
            const bitmap = levels.composedSheets().B;
            if (!bitmap || !bitmap.isReady()) return;
            const cells = new Map();
            for (const link of links()) for (const e of [link.a, link.b]) {
                if (!areaEqual(e.area, view) || e.z !== view.z) continue;
                const key = `${e.x},${e.y}`, c = cells.get(key) || { ref: e, up: false, down: false };
                const other = e === link.a ? link.b : link.a;
                if (other.z > e.z) c.up = true; else c.down = true;
                cells.set(key, c);
            }
            let n = 0;
            for (const c of cells.values()) {
                const sx = $gameMap.adjustX(c.ref.x), sy = $gameMap.adjustY(c.ref.y);
                if (sx < -1 || sy < -1 || sx > $gameMap.screenTileX() + 1 || sy > $gameMap.screenTileY() + 1) continue;
                const tile = levels.tileOf(c.up && c.down ? "stair_both" : c.up ? "stair_up" : "stair_down");
                if (!(tile > 0 && tile < 256)) continue;
                let sprite = this.pool[n++];
                if (!sprite) { sprite = new Sprite(); sprite.anchor.set(0.5, 1); this.pool.push(sprite); this.tilemap.addChild(sprite); }
                sprite.bitmap = bitmap;
                sprite.setFrame(((Math.floor(tile / 128) % 2) * 8 + tile % 8) * 48, Math.floor(tile % 128 / 8) * 48, 48, 48);
                sprite.x = Math.round((sx + 0.5) * 48); sprite.y = Math.round((sy + 1) * 48);
                sprite.z = 2; sprite.visible = true; sprite._ufPassage = copy(c.ref);
            }
        }
    }
    window.UF = window.UF || {};
    const API = { VERSION, TYPE, generate, list, at, reserved, travel, orderSelected, state, lastRefusal: () => lastRefusal,
        traverse, updateFluids, hasFluid, addFluid, clearFluids, isWater,
        markers: () => { const s = SceneManager._scene; const m = s && s._spriteset && s._spriteset._ufPassageMarkers; return m ? m.pool.filter(p => p.visible) : []; } };
    UF.NaturalConnections = API;
    let hooked = false;
    function hook() {
        if (hooked || !W() || !L() || !J()) return;
        hooked = true; defineJob();
        const original = W().newWorld;
        W().newWorld = function() {
            // Fixed runtime fixture seed, only for this exact harness suite.
            const args = Array.from(arguments);
            const argv = typeof nw !== "undefined" && nw.App ? nw.App.argv : [];
            if (UF.Test && UF.Test.active && argv.includes("--uf-test=natural_connections") && args[0] === undefined) args[0] = 20260919;
            const result = original.apply(this, args); generate(); return result;
        };
        if (L() && typeof L().waterAt === "function") {
            const origWaterAt = L().waterAt;
            L().waterAt = function(r) {
                if (hasFluid(r, "water")) return true;
                return origWaterAt.apply(this, arguments);
            };
        }
    }
    const _boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { hook(); if (UF.Test && UF.Test.active) registerChecks(); _boot.call(this); };
    const _characters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() { _characters.call(this); this._ufPassageMarkers = new PassageMarkers(this._tilemap); };
    const _update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() { _update.call(this); if (this._ufPassageMarkers) this._ufPassageMarkers.update(); };
    const shortcut = !Input.keyMapper[117];
    if (shortcut) Input.keyMapper[117] = "uf_naturalPassage";
    const _windows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _windows.call(this);
        this._ufPassageNotice = new Window_Base(new Rectangle(16, Graphics.boxHeight - 94, Graphics.boxWidth - 32, 78));
        this._ufPassageNotice.hide(); this.addWindow(this._ufPassageNotice);
    };
    const _sceneUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _sceneUpdate.call(this);
        if (this._ufPassageNotice && this._ufPassageNotice.visible && Graphics.frameCount > feedback.until) this._ufPassageNotice.hide();
        if (shortcut && this.isActive() && Input.isTriggered("uf_naturalPassage") && !$gameMessage.isBusy() && !$gameMap.isEventRunning()) orderSelected(Input.isPressed("shift") ? 1 : -1);
        if (Graphics.frameCount % 30 === 0) {
            updateFluids();
            stepCreatures();
        }
    };

    function registerChecks() {
        UF.Test.suite("natural_connections", async t => {
            const world = W(), jobs = J(), levels = L(), items = UF.Items, colony = UF.Colonists;
            const enabled = colony && colony.isEnabled(), errors0 = t.errorsSoFar().length;
            const oldSelection = window.$colonyManager && $colonyManager.selectedColonist;
            const wasPaused = UF.Time && UF.Time.paused;
            const s = state(), all = list(), chain = s && s.chains[0];
            t.check("generated_chain", !!s && s.status === "ready" && !!chain && all.some(l => l.a.z === 0 && l.b.z === -1) && all.some(l => l.a.z === -1 && l.b.z === -2), JSON.stringify(s));
            if (!chain) return;
            const upper = all.find(l => l.chain === 1 && l.a.z === 0), lower = all.find(l => l.chain === 1 && l.a.z === -1);
            t.check("dry_supported_landings", all.every(l => [l.a, l.b].every(e => dry(e) && !!neighbor(e))), `${all.length} paired links checked against current shapes/tiles/objects`);
            const before = JSON.stringify(s); generate();
            t.check("idempotent_save", JSON.stringify(state()) === before && JSON.parse(JSON.stringify(DataManager.makeSaveContents().ufWorld)).naturalConnections.links.length === all.length, "saved world contains unchanged paired links");
            let worker = null, blocker = null;
            if (colony) colony.setEnabled(false);
            if (window.$colonyManager) $colonyManager.cameraFollowUnit = null;
            try {
                const start = neighbor(upper.a), model = world.units().find(u => u.data && u.data.kind === "person");
                worker = world.addUnit({ name: "TEST_PassageWalker", area: copy(start.area), x: start.x, y: start.y, z: 0,
                    image: model ? copy(model.image) : { characterName: "$Adam", characterIndex: 0 }, dir: 2,
                    data: { kind: "person", species: "human", ai: null, age: 25, stage: "adult", needs: { hunger: 0, thirst: 0, sleep: 0 }, inventory: [], equipment: {} } });
                const token = items.give("stone", 1, worker.id);
                const carried = items.inventoryOf(worker.id).map(i => i.id);
                if (world.viewLevel().z !== 0) { levels.setView(0); await t.waitUntil(() => world.viewLevel().z === 0 && !levels.switching(), 15000, "Ground view"); }
                $gamePlayer.locate(upper.a.x, upper.a.y); $gameMap.setDisplayPos(upper.a.x - $gameMap.screenTileX() / 2, upper.a.y - $gameMap.screenTileY() / 2);
                await t.waitFrames(3);
                const visible = API.markers(), marker = visible.find(m => sameCell(m._ufPassage, upper.a));
                let alpha = 0;
                if (marker) for (let y = 0; y < 48; y += 3) for (let x = 0; x < 48; x += 3) if (marker.bitmap.getAlphaPixel(marker._frame.x + x, marker._frame.y + y)) alpha++;
                t.check("visible_marker", !!marker && marker.visible && alpha > 0, `${visible.length} markers; entrance opaque samples ${alpha}`);
                t.screenshot("ground_entrance");
                const first = travel(worker, upper.id), initialZ = zOf(worker);
                await t.waitUntil(() => first && ["done", "failed"].includes(first.state), 15000, "first natural traversal").catch(() => {});
                t.check("walk_then_descend", initialZ === 0 && first && first.state === "done" && sameCell(worker, upper.b) && first.result && first.result.moved, `${first && first.state}: ${first && first.reason}; worker (${worker.x},${worker.y},${worker.z})`);
                const deep = travel(worker, lower.id);
                await t.waitUntil(() => deep && ["done", "failed"].includes(deep.state), 15000, "offscreen deep traversal").catch(() => {});
                t.check("offscreen_chain_inventory", deep && deep.state === "done" && sameCell(worker, lower.b) && world.viewLevel().z === 0 && carried.every(id => items.get(id) && items.get(id).holder === worker.id && items.get(id).z === worker.z), `${deep && deep.state}; view ${world.viewLevel().z}, worker ${worker.z}, carried ${carried.join(",")}, token ${!!token}`);
                worker.data.kind = "colonist"; worker.data.faction = colony.faction().id;
                $colonyManager.selectedColonist = { id: worker.id };
                jobs.define("TEST_passage_wait", { plan: () => ({ ok: true, stand: null }), work: 1200, apply() {} });
                const prior = jobs.create({ type: "TEST_passage_wait", owner: worker.id });
                Input._currentState.uf_naturalPassage = true; await t.waitFrames(1); Input._currentState.uf_naturalPassage = false; await t.waitFrames(1);
                t.check("invalid_f6_keeps_order", shortcut && jobs.of(worker.id) === prior && prior.state !== "failed" && /Current order kept/.test(feedback.text), `${prior.state}; feedback ${feedback.text}`);
                jobs.cancel(prior.id, "test over");
                blocker = world.addUnit({ name: "TEST_PassageBlocker", area: copy(lower.a.area), x: lower.a.x, y: lower.a.y, z: -1, image: copy(worker.image), data: { ai: null } });
                const refused = travel(worker, lower.id);
                t.check("occupied_landing_refused", sameCell(blocker, lower.a) && refused && refused.state === "failed" && worker.z === -2 && /landing/.test(refused.reason || ""), `${refused && refused.state}: ${refused && refused.reason}`);
                world.removeUnit(blocker.id); blocker = null;
                const back = travel(worker, lower.id);
                await t.waitUntil(() => back && ["done", "failed"].includes(back.state), 15000, "return traversal").catch(() => {});
                t.check("reverse_traversal", back && back.state === "done" && sameCell(worker, lower.a), `${back && back.state}; worker ${worker.z}`);
                levels.setView(-1, { center: { x: lower.a.x, y: lower.a.y } });
                await t.waitUntil(() => world.viewLevel().z === -1 && !levels.switching(), 15000, "underground marker view"); await t.waitFrames(3);
                t.screenshot("middle_entrance");
                UF.Time.pause();
                // RMMZ tracks one latest newly pressed button. Hold the modifier
                // first, as a keyboard chord, rather than making two synthetic
                // keys new in the same Input.update (which selects only Shift).
                Input._currentState.shift = true; await t.waitFrames(1);
                Input._currentState.uf_naturalPassage = true;
                await t.waitFrames(1); Input._currentState.uf_naturalPassage = false; Input._currentState.shift = false;
                const ordered = jobs.of(worker.id), atPause = { x: worker.x, y: worker.y, z: worker.z, tick: UF.Time.ticks(), progress: ordered && ordered.progress };
                await t.waitFrames(40);
                t.check("shift_f6_order_and_pause", shortcut && ordered && ordered.type === TYPE && ordered.params.ordered && ordered.owner === worker.id &&
                    atPause.tick === UF.Time.ticks() && atPause.progress === ordered.progress && worker.x === atPause.x && worker.y === atPause.y && worker.z === atPause.z,
                    `ordered ${ordered && ordered.type}; progress ${atPause.progress}->${ordered && ordered.progress}, tick ${atPause.tick}->${UF.Time.ticks()}`);
                t.screenshot("passage_order_paused");
                UF.Time.resume();
                await t.waitUntil(() => ordered && ["done", "failed"].includes(ordered.state), 15000, "keyboard return to Ground").catch(() => {});
                t.check("keyboard_order_moves_unit", ordered && ordered.state === "done" && worker.z === 0, `${ordered && ordered.state}; worker ${worker.z}; view ${world.viewLevel().z}`);

                // Creature traversal check: non-colonist creatures can travel between layers
                const testWolf = world.addUnit({ name: "TEST_Wolf", area: copy(upper.a.area), x: upper.a.x, y: upper.a.y, z: 0,
                    image: { characterName: "$Wolf", characterIndex: 0 }, data: { kind: "creature", species: "wolf" } });
                const travRes = API.traverse(testWolf, upper.id);
                t.check("creature_traversal", travRes && travRes.moved && testWolf.z === -1 && testWolf.x === upper.b.x && testWolf.y === upper.b.y,
                    `creature traversal: moved ${travRes && travRes.moved}, z ${testWolf.z} (expected -1)`);
                world.removeUnit(testWolf.id);

                // Liquid physics check: water flows down connections to lower levels
                API.addFluid(upper.a, "water");
                t.check("liquid_present_at_entrance", API.hasFluid(upper.a, "water"), `water added to upper entrance: ${API.hasFluid(upper.a, "water")}`);
                const flows = API.updateFluids();
                t.check("liquid_flow_through_connection", flows.length > 0 && API.hasFluid(upper.b, "water"),
                    `flows ${flows.length}, water reached lower landing: ${API.hasFluid(upper.b, "water")}`);
                API.clearFluids();

                t.check("no_errors", t.errorsSoFar().length === errors0, `${t.errorsSoFar().length - errors0} new errors`);
            } finally {
                Input._currentState.uf_naturalPassage = false; Input._currentState.shift = false;
                if (UF.Time) { if (wasPaused) UF.Time.pause(); else UF.Time.resume(); }
                if (window.$colonyManager) $colonyManager.selectedColonist = oldSelection;
                if (worker) { const job = jobs.of(worker.id); if (job) jobs.cancel(job.id, "test over"); for (const item of items.inventoryOf(worker.id).slice()) items.remove(item.id); world.removeUnit(worker.id); }
                if (blocker) world.removeUnit(blocker.id);
                if (colony) colony.setEnabled(enabled);
            }
        }, { isDefault: false });
    }
})();
