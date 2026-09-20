//=============================================================================
// UF_Ecology.js - Renewable plants, prey recovery, and capped monster spawning
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Ecology] Harvested plants regrow; depleted prey and monsters repopulate under biome, cap, passability, and settlement-distance rules.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 * @orderAfter UF_WorldGen
 * @orderAfter UF_Objects
 * @orderAfter UF_Wildlife
 * @orderAfter UF_History
 *
 * @help
 * VISION V74/V75. Renewable biological resources return after game-time
 * delays. Catalog-native regrowth (picked berry bushes and fruit trees) stays
 * with UF_Objects; this plugin fills the gaps for felled trees and harvested
 * bushes/plants. Ore, stone, gems, ruins, and constructed objects are finite.
 *
 * Every six game hours, the current area and one rotating world area get a
 * deterministic population roll. Prey can recover toward the area's original
 * population. Monsters can replenish or first appear only in catalog-approved
 * biomes/regions. Both populations have hard area caps. Monster cells must be
 * free and remain outside the protected start, camps, active faction sites,
 * nearby people, and the player's view radius.
 *
 * Save data: UF.World.state.ecology.
 * Events: ecology:resourceScheduled, ecology:resourceRegrown,
 * ecology:spawned, ecology:hour.
 * Public API: UF.Ecology.state(), resources(), scheduleResource(),
 * cancelResource(), processResources(), population(), capFor(),
 * protectedReason(), candidateValid(), findCandidate(), attemptSpawn(),
 * processArea(), tickHour(), isRenewableObject(), resourceHours().
 *
 * Replaced core methods: none (one alias of DataManager.extractSaveContents
 * and Scene_Boot.prototype.start).
 */

(() => {
    "use strict";

    const VERSION = 1;
    const POPULATION_INTERVAL = 6;
    const PREY_FLOOR = 8;
    const MONSTER_FLOOR = 2;
    const PREY_CHANCE = 0.55;
    const MONSTER_CHANCE = 0.25;
    const CANDIDATE_TRIES = 128;
    const MEMBER_TRIES = 32;
    const MEMBER_SPREAD = 3;
    const SITE_CLEARANCE = 20;
    const PERSON_CLEARANCE = 12;
    const PLAYER_CLEARANCE = 12;
    const TREE_HOURS = 28 * 24;
    const BUSH_HOURS = 7 * 24;
    const PLANT_HOURS = 3 * 24;
    const PREY_KINDS = Object.freeze(["grazer", "vermin", "flier"]);
    const DIRS = Object.freeze([2, 4, 6, 8]);

    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Wildlife = () => (window.UF && UF.Wildlife) || null;
    const WorldGen = () => (window.UF && UF.WorldGen) || null;
    const History = () => (window.UF && UF.History) || null;
    const catalog = () => window.$ufWorldCatalog || null;
    const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const copyArea = a => (a ? { x: a.x | 0, y: a.y | 0 } : { x: 0, y: 0 });
    const sameArea = (a, b) => !!a && !!b && (a.x | 0) === (b.x | 0) && (a.y | 0) === (b.y | 0);
    const areaKey = a => (a ? `${a.x | 0},${a.y | 0}` : "0,0");
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };

    let enabled = true;
    let hooked = false;
    let errorCount = 0;
    const errors = [];
    let lastHourReport = null;

    function report(where, e) {
        errorCount++;
        errors.push(`${where}: ${e && e.message ? e.message : e}`);
        if (errors.length > 20) errors.shift();
        console.error(`UF_Ecology ${where}:`, e);
    }

    function provoked(check) {
        if (!(window.UF && UF.Test && UF.Test.active) || typeof process === "undefined" || !process.env) return false;
        const set = new Set(String(process.env.UF_TEST_PROVOKE || "").split(",").map(s => s.trim()).filter(Boolean));
        return set.has("ecology.all") || set.has(`ecology.${check}`);
    }

    //-------------------------------------------------------------------------
    // Deterministic random numbers. Population changes never use Math.random.

    const FNV_OFFSET = 2166136261 >>> 0;
    function fnv(h, part) {
        let v = part >>> 0;
        for (let i = 0; i < 4; i++) {
            h ^= v & 255;
            h = Math.imul(h, 16777619) >>> 0;
            v >>>= 8;
        }
        return h;
    }
    function hash32(...parts) {
        let h = FNV_OFFSET;
        for (const p of parts) h = fnv(h, p);
        h ^= h >>> 15;
        h = Math.imul(h, 0x2c1b3c6d) >>> 0;
        return (h ^ (h >>> 12)) >>> 0;
    }
    function mulberry32(a) {
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    //-------------------------------------------------------------------------
    // Saved state and area baselines

    function blankState() {
        return {
            version: VERSION,
            resources: [],
            sprouts: [],
            beatCount: 0,
            areas: {},
            herds: {},
            cursor: 0,
            nextHerd: 1,
            nextSproutId: 1,
            lastHour: null,
            stats: { hours: 0, areas: 0, resources: 0, sprouts: 0, matured: 0, prey: 0, monsters: 0, attempts: 0, births: 0, germinated: 0, ms: 0 }
        };
    }

    function state() {
        const W = World();
        if (!W || !W.state) return null;
        let st = W.state.ecology;
        if (!st || typeof st !== "object") {
            st = W.state.ecology = blankState();
        } else {
            st.version = VERSION;
            if (!Array.isArray(st.resources)) st.resources = [];
            if (!Array.isArray(st.sprouts)) st.sprouts = [];
            if (!(st.beatCount >= 0)) st.beatCount = 0;
            if (!(st.nextSproutId > 0)) st.nextSproutId = 1;
            if (!st.areas || typeof st.areas !== "object") st.areas = {};
            if (!st.herds || typeof st.herds !== "object") st.herds = {};
            if (!(st.cursor >= 0)) st.cursor = 0;
            if (!(st.nextHerd > 0)) st.nextHerd = 1;
            if (!st.stats || typeof st.stats !== "object") st.stats = blankState().stats;
            for (const k of Object.keys(blankState().stats)) if (!Number.isFinite(st.stats[k])) st.stats[k] = 0;
        }
        return st;
    }

    function speciesOf(unit) {
        const wild = Wildlife();
        return wild && unit && unit.data && unit.data.kind === "creature" ? wild.speciesById(unit.data.species) : null;
    }

    function population(area) {
        const W = World();
        const out = { prey: 0, monsters: 0, predators: 0, creatures: 0, bySpecies: {} };
        if (!W || !W.state || !area) return out;
        for (const u of W.unitsInArea(area.x, area.y)) {
            const sp = speciesOf(u);
            if (!sp) continue;
            out.creatures++;
            out.bySpecies[sp.id] = (out.bySpecies[sp.id] || 0) + 1;
            if (sp.prey || PREY_KINDS.includes(sp.kind)) out.prey++;
            else if (sp.kind === "monster") out.monsters++;
            else if (sp.kind === "predator") out.predators++;
        }
        return out;
    }

    function ensureArea(area) {
        const st = state();
        if (!st || !area) return null;
        const key = areaKey(area);
        let a = st.areas[key];
        if (!a) {
            const p = population(area);
            a = st.areas[key] = {
                area: copyArea(area),
                baseline: { prey: p.prey, monsters: p.monsters },
                last: { prey: null, monsters: null },
                rolls: { prey: 0, monsters: 0 },
                spawned: { prey: 0, monsters: 0 }
            };
        } else {
            if (!a.area) a.area = copyArea(area);
            if (!a.baseline) a.baseline = { prey: 0, monsters: 0 };
            if (!a.last) a.last = { prey: null, monsters: null };
            if (!a.rolls) a.rolls = { prey: 0, monsters: 0 };
            if (!a.spawned) a.spawned = { prey: 0, monsters: 0 };
        }
        return a;
    }

    function initializeBaselines() {
        const W = World(), st = state();
        if (!W || !W.state || !st) return 0;
        let made = 0, maxHerd = 0;
        for (const u of W.units()) if (u.data && u.data.kind === "creature") maxHerd = Math.max(maxHerd, u.data.herd | 0);
        st.nextHerd = Math.max(st.nextHerd | 0, maxHerd + 1);
        for (let ay = 0; ay < W.state.areasY; ay++) for (let ax = 0; ax < W.state.areasX; ax++) {
            const key = `${ax},${ay}`;
            if (!st.areas[key]) { ensureArea({ x: ax, y: ay }); made++; }
        }
        return made;
    }

    function capFor(area, kind) {
        const a = ensureArea(area);
        if (!a) return 0;
        return kind === "monsters" || kind === "monster" ? Math.max(MONSTER_FLOOR, a.baseline.monsters | 0)
            : Math.max(PREY_FLOOR, a.baseline.prey | 0);
    }

    //-------------------------------------------------------------------------
    // Renewable harvested objects

    function isRenewableObject(idOrType) {
        const O = Objects();
        const type = typeof idOrType === "object" ? idOrType : (O && O.type ? O.type(idOrType) : null);
        if (!type) return false;
        if (type.renewable === false || type.id === "dead_tree") return false;
        if (!Array.isArray(type.tags)) return false;
        const tags = type.tags;
        if (tags.some(t => ["building", "mineral", "ore", "gem", "stone", "ruin"].includes(t))) return false;
        if (!tags.some(t => t === "tree" || t === "bush" || t === "plant" || t === "sapling" || t === "flower")) return false;
        return true;
    }

    function resourceHours(idOrType) {
        const O = Objects();
        const type = typeof idOrType === "object" ? idOrType : (O && O.type ? O.type(idOrType) : null);
        const tags = (type && type.tags) || [];
        if (tags.includes("tree")) return TREE_HOURS;
        if (tags.includes("bush")) return BUSH_HOURS;
        return PLANT_HOURS;
    }

    function startSapling(area, x, y, treeSpecies, opts) {
        const O = Objects(), st = state(), o = opts || {};
        if (!O || !st || !area) return null;
        const treeType = O.type(treeSpecies);
        if (!treeType) return null;
        cancelResource(area, x, y);
        O.setIn(area, x, y, "sapling");
        const at = (O.hourNow ? O.hourNow() : 0);
        const due = Number.isFinite(o.due) ? o.due : (at + (Number.isFinite(o.hours) ? o.hours : 48));
        const entry = {
            area: copyArea(area), x: x | 0, y: y | 0,
            from: "sapling", to: treeType.id,
            expected: "sapling",
            due
        };
        st.resources.push(entry);
        emit("ecology:resourceScheduled", Object.assign({}, entry));
        return entry;
    }

    function resourceIndex(area, x, y) {
        const st = state();
        if (!st) return -1;
        return st.resources.findIndex(e => sameArea(e.area, area) && (e.x | 0) === (x | 0) && (e.y | 0) === (y | 0));
    }

    function cancelResource(area, x, y) {
        const st = state();
        if (!st) return false;
        const i = resourceIndex(area, x, y);
        if (i < 0) return false;
        st.resources.splice(i, 1);
        return true;
    }

    function scheduleResource(area, x, y, fromId, expectedId, opts) {
        const st = state(), O = Objects(), o = opts || {};
        const from = O && O.type ? O.type(fromId) : null;
        const expected = expectedId ? O.type(expectedId) : null;
        if (!st || !from || !isRenewableObject(from)) return null;
        // UF_Objects already owns the normal picked-plant timer.
        if (!o.force && expected && expected.regrow && expected.regrow.to) {
            cancelResource(area, x, y);
            return null;
        }
        cancelResource(area, x, y);
        const target = from.regrow && from.regrow.to ? from.regrow.to : from.id;
        const entry = {
            area: copyArea(area), x: x | 0, y: y | 0,
            from: from.id, to: target,
            expected: expectedId || null,
            due: Number.isFinite(o.due) ? o.due : ((O && O.hourNow ? O.hourNow() : 0) + resourceHours(from))
        };
        st.resources.push(entry);
        emit("ecology:resourceScheduled", Object.assign({}, entry));
        return entry;
    }

    function currentObjectId(area, x, y) {
        const O = Objects(), type = O && O.atIn ? O.atIn(area, x, y) : null;
        return type ? type.id : null;
    }

    function standerAt(area, x, y) {
        const W = World();
        if (!W) return null;
        if (typeof W.standerAt === "function") return W.standerAt(area.x, area.y, x, y);
        return W.unitsInArea(area.x, area.y).find(u => u.x === x && u.y === y && !(u.data && u.data.through)) || null;
    }

    function processResources(hour) {
        const st = state(), O = Objects();
        if (!st || !O) return { due: 0, grown: 0, held: 0, cancelled: 0 };
        const at = Number.isFinite(hour) ? hour : (O.hourNow ? O.hourNow() : 0);
        const result = { due: 0, grown: 0, held: 0, cancelled: 0 };
        for (let i = st.resources.length - 1; i >= 0; i--) {
            const e = st.resources[i];
            if (!(e.due <= at)) continue;
            result.due++;
            const current = currentObjectId(e.area, e.x, e.y);
            if (current !== (e.expected || null)) {
                st.resources.splice(i, 1);
                result.cancelled++;
                continue;
            }
            const target = O.type(e.to);
            if (!target) {
                st.resources.splice(i, 1);
                result.cancelled++;
                continue;
            }
            const blocks = target.passable !== true && target.under !== true;
            if (blocks && standerAt(e.area, e.x, e.y)) {
                e.due = at + 1;
                result.held++;
                continue;
            }
            st.resources.splice(i, 1);
            if (O.setIn(e.area, e.x, e.y, e.to)) {
                result.grown++;
                st.stats.resources++;
                emit("ecology:resourceRegrown", e.area, e.x, e.y, e.to);
            } else {
                e.due = at + 1;
                st.resources.push(e);
                result.held++;
            }
        }
        return result;
    }

    function onObjectChanged(area, x, y, fromId, toId) {
        try {
            const st = state();
            if (!st) return;
            if (st.sprouts) {
                const z = (area && area.z !== undefined) ? area.z : 0;
                const spIdx = st.sprouts.findIndex(e => sameArea(e.area, area) && (e.z || 0) === z && e.x === x && e.y === y);
                if (spIdx >= 0) {
                    const sp = st.sprouts[spIdx];
                    if (toId !== sp.sproutType && toId !== sp.matureType) {
                        st.sprouts.splice(spIdx, 1);
                    }
                }
            }
            const i = resourceIndex(area, x, y), pending = i >= 0 ? st.resources[i] : null;
            if (isRenewableObject(fromId)) {
                scheduleResource(area, x, y, fromId, toId);
                return;
            }
            if (!pending) return;
            // Pulling a stump leaves the cell eligible for the already-scheduled tree.
            if (fromId === pending.expected && fromId === "stump" && !toId) {
                pending.expected = null;
                return;
            }
            // Any other use of the cell supersedes natural regrowth.
            if (toId !== pending.expected) st.resources.splice(i, 1);
        } catch (e) { report("objects:changed", e); }
    }

    //-------------------------------------------------------------------------
    // Population eligibility and protected space

    function activeSites() {
        const H = History();
        if (!H || typeof H.sites !== "function") return [];
        try { return (H.sites() || []).filter(s => s && s.area && !s.ruined && s.faction !== null && s.faction !== undefined); }
        catch (e) { report("sites", e); return []; }
    }

    function protectedReason(area, x, y, kind) {
        const W = World(), wild = Wildlife();
        if (!W || !W.state || kind !== "monsters" && kind !== "monster") return "";
        const size = W.state.size, gx = area.x * size + x, gy = area.y * size + y;
        const start = W.state.startArea;
        const sx = start.x * size + Math.floor(size / 2), sy = start.y * size + Math.floor(size / 2);
        const cfg = (catalog() && catalog().wildlife) || {};
        if (Math.hypot(gx - sx, gy - sy) < (Number(cfg.predatorFreeRadius) || 60)) return "protected start";

        const camps = wild && typeof wild.camps === "function" ? wild.camps() : [];
        const campGap = wild && typeof wild.kitConfig === "function" ? wild.kitConfig().predatorFree : SITE_CLEARANCE;
        for (const c of camps) if (sameArea(c.area, area) && Math.hypot(x - c.x, y - c.y) < campGap) return `camp ${c.id}`;
        for (const s of activeSites()) {
            if (!sameArea(s.area, area)) continue;
            const gap = Math.max(SITE_CLEARANCE, (s.radius | 0) + 4);
            if (Math.hypot(x - s.x, y - s.y) < gap) return `site ${s.id}`;
        }
        for (const u of W.unitsInArea(area.x, area.y)) {
            if (!u.data || (u.data.kind !== "colonist" && u.data.kind !== "person")) continue;
            if (Math.hypot(x - u.x, y - u.y) < PERSON_CLEARANCE) return `person ${u.id}`;
        }
        const here = W.currentArea();
        if (sameArea(here, area) && window.$gamePlayer && Math.hypot(x - $gamePlayer.x, y - $gamePlayer.y) < PLAYER_CLEARANCE) return "player";
        return "";
    }

    function campCellBlocked(area, x, y) {
        const wild = Wildlife();
        const camps = wild && typeof wild.camps === "function" ? wild.camps() : [];
        return camps.some(c => sameArea(c.area, area) && Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) <= 1);
    }

    function candidateValid(area, x, y, species, kind) {
        const W = World(), wild = Wildlife();
        if (!W || !W.state || !wild || !species || !W.inWorld(area.x, area.y)) return false;
        if (x < 0 || y < 0 || x >= W.state.size || y >= W.state.size) return false;
        if (!W.cellFree(area.x, area.y, x, y)) return false;
        if (campCellBlocked(area, x, y)) return false;
        if (protectedReason(area, x, y, kind)) return false;
        const gx = area.x * W.state.size + x, gy = area.y * W.state.size + y;
        return !!wild.allowedAt(species.id, gx, gy);
    }

    function speciesFor(kind, speciesId) {
        const wild = Wildlife();
        if (!wild) return [];
        return wild.species().filter(sp => (!speciesId || sp.id === speciesId) &&
            (kind === "monsters" || kind === "monster" ? sp.kind === "monster" : !!sp.prey || PREY_KINDS.includes(sp.kind)));
    }

    function findCandidate(area, kind, opts) {
        const W = World(), o = opts || {}, list = speciesFor(kind, o.speciesId);
        if (!W || !W.state || !area || !list.length) return null;
        const hour = Number.isFinite(o.hour) ? o.hour : (Objects() && Objects().hourNow ? Objects().hourNow() : 0);
        const roll = Number.isFinite(o.roll) ? o.roll : 0;
        const kindSalt = kind === "monsters" || kind === "monster" ? 0x6d : 0x70;
        const rng = mulberry32(hash32(W.state.seed, 0xec0109, area.x, area.y, hour, roll, kindSalt));
        const tries = o.tries > 0 ? o.tries | 0 : CANDIDATE_TRIES;
        for (let i = 0; i < tries; i++) {
            const sp = list[Math.floor(rng() * list.length)];
            const x = Math.floor(rng() * W.state.size), y = Math.floor(rng() * W.state.size);
            if (candidateValid(area, x, y, sp, kind)) return { area: copyArea(area), x, y, species: sp, rng };
        }
        return null;
    }

    function memberCell(center, species, kind, rng, used) {
        for (let i = 0; i < MEMBER_TRIES; i++) {
            const x = center.x + Math.floor(rng() * (MEMBER_SPREAD * 2 + 1)) - MEMBER_SPREAD;
            const y = center.y + Math.floor(rng() * (MEMBER_SPREAD * 2 + 1)) - MEMBER_SPREAD;
            const key = `${x},${y}`;
            if (used.has(key) || !candidateValid(center.area, x, y, species, kind)) continue;
            used.add(key);
            return { x, y };
        }
        return null;
    }

    function attemptSpawn(area, kind, opts) {
        const W = World(), wild = Wildlife(), st = state(), o = opts || {};
        const result = { area: area ? copyArea(area) : null, kind, status: "unavailable", cap: 0, before: 0, spawned: [], species: null, ms: 0 };
        const t0 = nowMs();
        if (!enabled && !o.force || !W || !W.state || !wild || !area || !W.inWorld(area.x, area.y)) return result;
        const a = ensureArea(area), p = population(area);
        const key = kind === "monsters" || kind === "monster" ? "monsters" : "prey";
        const at = Number.isFinite(o.hour) ? o.hour : (Objects() && Objects().hourNow ? Objects().hourNow() : 0);
        const current = p[key];
        const cap = Number.isFinite(o.cap) ? Math.max(0, o.cap | 0) : capFor(area, key);
        result.before = current; result.cap = cap;
        if (current >= cap) { result.status = "capped"; result.ms = nowMs() - t0; return result; }
        if (!o.force && a.last[key] !== null && at - a.last[key] < POPULATION_INTERVAL) {
            result.status = "interval"; result.ms = nowMs() - t0; return result;
        }
        a.last[key] = at;
        const roll = Number.isFinite(o.roll) ? o.roll : (a.rolls[key] | 0);
        a.rolls[key] = (a.rolls[key] | 0) + 1;
        st.stats.attempts++;
        const chance = key === "monsters" ? MONSTER_CHANCE : PREY_CHANCE;
        const chanceRoll = hash32(W.state.seed, 0xec0110, area.x, area.y, at, roll, key === "monsters" ? 1 : 0) / 4294967296;
        if (!o.force && chanceRoll >= chance) { result.status = "chance"; result.ms = nowMs() - t0; return result; }
        const center = findCandidate(area, key, { hour: at, roll, speciesId: o.speciesId, tries: o.tries });
        if (!center) { result.status = "no eligible cell"; result.ms = nowMs() - t0; return result; }
        const sp = center.species, range = Array.isArray(sp.herd) ? sp.herd : [1, 1];
        const lo = Math.max(1, range[0] | 0), hi = Math.max(lo, range[1] | 0);
        const requested = lo + Math.floor(center.rng() * (hi - lo + 1));
        const count = Math.min(requested, cap - current);
        const herd = st.nextHerd++;
        const used = new Set([`${center.x},${center.y}`]);
        const cells = [{ x: center.x, y: center.y }];
        while (cells.length < count) {
            const cell = memberCell(center, sp, key, center.rng, used);
            if (!cell) break;
            cells.push(cell);
        }
        for (const cell of cells) {
            const spec = wild.unitSpec(sp, area, cell.x, cell.y, herd, DIRS[Math.floor(center.rng() * DIRS.length)], center,
                { ecology: true, spawnedAt: at });
            const u = W.addUnit(Object.assign(spec, { snapToFree: 6 }));
            result.spawned.push(u);
        }
        result.species = sp.id;
        result.status = result.spawned.length ? "spawned" : "no eligible cell";
        a.spawned[key] += result.spawned.length;
        st.stats[key] += result.spawned.length;
        result.ms = nowMs() - t0;
        st.stats.ms += result.ms;
        if (result.spawned.length) emit("ecology:spawned", result);
        return result;
    }

    function processArea(area, opts) {
        const o = opts || {};
        const prey = attemptSpawn(area, "prey", Object.assign({}, o, o.prey || {}));
        const monsters = attemptSpawn(area, "monsters", Object.assign({}, o, o.monsters || {}));
        const st = state();
        if (st) st.stats.areas++;
        return { area: copyArea(area), prey, monsters };
    }

    function spreadPlants(area, hour, opts) {
        const W = World(), O = Objects(), st = state(), o = opts || {};
        const result = { area: copyArea(area), spread: 0, ms: 0 };
        const t0 = nowMs();
        if (!enabled && !o.force || !W || !W.state || !O || !area || !W.inWorld(area.x, area.y)) return result;
        const at = Number.isFinite(hour) ? hour : (O.hourNow ? O.hourNow() : 0);
        const size = W.state.size;
        const rng = mulberry32(hash32(W.state.seed, 0x501a47, area.x, area.y, at));

        let parents = [];
        if (typeof O.findIn === "function") {
            parents = (O.findIn(area, { near: { x: Math.floor(size / 2), y: Math.floor(size / 2) }, radius: size, limit: 64 }) || [])
                .filter(p => p && p.type && isRenewableObject(p.type) && p.type.id !== "sapling" && p.type.id !== "stump");
        }
        if (!parents.length) {
            const tries = o.tries > 0 ? o.tries : 32;
            for (let i = 0; i < tries; i++) {
                const sx = Math.floor(rng() * size), sy = Math.floor(rng() * size);
                const p = O.atIn(area, sx, sy);
                if (p && isRenewableObject(p) && p.id !== "sapling" && p.id !== "stump") {
                    parents.push({ x: sx, y: sy, type: p });
                }
            }
        }

        for (const parent of parents) {
            const sx = parent.x, sy = parent.y, pType = parent.type;
            const tags = pType.tags || [];
            const isTree = tags.includes("tree");
            const isBush = tags.includes("bush");
            const isWater = pType.id === "lily_pad" || pType.id === "reeds";

            const spreadRate = isTree ? 0.20 : (isBush ? 0.35 : 0.50);
            if (!o.force && rng() >= spreadRate) continue;

            let sprouted = false;
            for (let t = 0; t < 8 && !sprouted; t++) {
                const r = 1 + Math.floor(rng() * 3);
                const angle = rng() * Math.PI * 2;
                const tx = sx + Math.round(Math.cos(angle) * r);
                const ty = sy + Math.round(Math.sin(angle) * r);

                if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
                if (O.atIn(area, tx, ty)) continue;
                if (standerAt(area, tx, ty)) continue;

                const gx = area.x * size + tx, gy = area.y * size + ty;
                const info = (window.UF && UF.WorldGen && UF.WorldGen.cellInfo) ? UF.WorldGen.cellInfo(gx, gy) : null;
                if (info) {
                    if (isWater && !info.water) continue;
                    if (!isWater && (info.water || !info.walkable)) continue;
                }

                if (window.UF && UF.Floors && UF.Floors.isFloor && UF.Floors.isFloor(area, tx, ty)) continue;
                if (window.UF && UF.Roads && UF.Roads.isRoad && UF.Roads.isRoad(area, tx, ty)) continue;

                let densityCount = 0;
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nx = tx + dx, ny = ty + dy;
                        if (nx >= 0 && ny >= 0 && nx < size && ny < size) {
                            const nobj = O.atIn(area, nx, ny);
                            if (nobj && isRenewableObject(nobj)) densityCount++;
                        }
                    }
                }
                if (!o.force && densityCount / 25 > 0.35) continue;

                if (isTree) {
                    startSapling(area, tx, ty, pType.id, { hour: at, hours: 48 });
                    result.spread++;
                    sprouted = true;
                    if (st) st.stats.germinated = (st.stats.germinated || 0) + 1;
                    emit("ecology:germinated", { area: copyArea(area), x: tx, y: ty, kind: "sapling", parent: pType.id, via: "spread" });
                } else {
                    if (O.setIn(area, tx, ty, pType.id)) {
                        result.spread++;
                        sprouted = true;
                        if (st) st.stats.germinated = (st.stats.germinated || 0) + 1;
                        emit("ecology:germinated", { area: copyArea(area), x: tx, y: ty, kind: pType.id, parent: pType.id, via: "spread" });
                    }
                }
            }
        }
        result.ms = nowMs() - t0;
        return result;
    }

    function stepBreeding(area, hour, opts) {
        const W = World(), wild = Wildlife(), st = state(), o = opts || {};
        const result = { area: copyArea(area), births: 0, ms: 0 };
        const t0 = nowMs();
        if (!enabled && !o.force || !W || !W.state || !wild || !area || !W.inWorld(area.x, area.y)) return result;

        const at = Number.isFinite(hour) ? hour : (Objects() && Objects().hourNow ? Objects().hourNow() : 0);
        const p = population(area);
        const cap = capFor(area, "prey");
        if (p.prey >= cap && !o.force) return result;

        const units = W.unitsInArea(area.x, area.y).filter(u => u.data && u.data.kind === "creature");
        const herds = new Map();
        for (const u of units) {
            const hId = u.data.herd | 0;
            if (!herds.has(hId)) herds.set(hId, []);
            herds.get(hId).push(u);
        }

        const rng = mulberry32(hash32(W.state.seed, 0x627265, area.x, area.y, at));

        for (const [hId, members] of herds.entries()) {
            const count = members.length;
            const canBreed = count >= 2;
            if (!canBreed) continue;

            const sample = members[0];
            const sp = speciesOf(sample);
            if (!sp || sp.kind === "monster") continue;

            const herdMax = (Array.isArray(sp.herd) ? sp.herd[1] : 4) | 0;
            if (count >= herdMax && !o.force) continue;

            const herdRecord = st && st.herds && st.herds[hId];
            if (!o.force && herdRecord && herdRecord.lastBirth && at - herdRecord.lastBirth < 12) continue;

            const chance = sp.kind === "predator" ? 0.175 : 0.275; // halved per user directive 2026-09-20
            if (!o.force && rng() >= chance) continue;

            const parent = members[Math.floor(rng() * count)];
            let babyCell = null;
            for (let t = 0; t < 16; t++) {
                const bx = parent.x + Math.floor(rng() * 5) - 2;
                const by = parent.y + Math.floor(rng() * 5) - 2;
                if (candidateValid(area, bx, by, sp, "prey")) {
                    babyCell = { x: bx, y: by };
                    break;
                }
            }
            if (!babyCell) continue;

            const spec = wild.unitSpec(sp, area, babyCell.x, babyCell.y, hId, DIRS[Math.floor(rng() * DIRS.length)],
                parent.data.home || { x: parent.x, y: parent.y },
                { ecology: true, born: true, spawnedAt: at });
            const baby = W.addUnit(Object.assign(spec, { snapToFree: 6 }));
            if (baby) {
                result.births++;
                if (st) {
                    st.stats.births = (st.stats.births || 0) + 1;
                    st.stats.prey++;
                    st.herds = st.herds || {};
                    st.herds[hId] = Object.assign(st.herds[hId] || {}, { lastBirth: at, species: sp.id });
                }
                emit("ecology:born", { unit: baby, herd: hId, species: sp.id, area: copyArea(area) });
            }
        }
        result.ms = nowMs() - t0;
        return result;
    }

    //-------------------------------------------------------------------------
    // Per-Beat Resource Sprouting and Maturation (User specification 2026-09-19)
    // Resources sprout across axes 0, -1, -2 each beat and mature over 2-3 minutes.

    const SPROUT_CAP_PER_LEVEL = 40;
    const SPROUT_DEFS = {
        0: [
            { sprout: "sapling", matures: ["oak", "pine", "birch", "fruit_tree"], weights: [5, 2, 2, 1], delay: 120 },
            { sprout: "rocks_small", matures: ["ironstone", "copper_outcrop", "granite_boulder", "gold_outcrop"], weights: [4, 3, 2, 1], delay: 150 },
            { sprout: "bush", matures: ["berry_bush", "fruit_tree", "wild_grain"], weights: [5, 3, 2], delay: 120 }
        ],
        "-1": [
            { sprout: "cave_mushrooms", matures: ["tower_cap", "glow_caps", "cave_moss"], weights: [5, 3, 2], delay: 120 },
            { sprout: "rocks_small", matures: ["ironstone", "copper_outcrop", "granite_boulder", "gold_outcrop"], weights: [4, 3, 2, 1], delay: 150 },
            { sprout: "crystal_small", matures: ["crystal", "crystal_spire"], weights: [6, 4], delay: 180 }
        ],
        "-2": [
            { sprout: "glow_caps", matures: ["tower_cap", "crystal_spire"], weights: [6, 4], delay: 120 },
            { sprout: "rocks_small", matures: ["ironstone", "gold_outcrop", "granite_boulder"], weights: [4, 3, 3], delay: 150 },
            { sprout: "crystal_small", matures: ["crystal_spire", "crystal"], weights: [6, 4], delay: 180 }
        ]
    };

    function pickWeighted(items, weights, rng) {
        let total = weights.reduce((a, b) => a + b, 0);
        let roll = rng() * total;
        for (let i = 0; i < items.length; i++) {
            if (roll < weights[i]) return items[i];
            roll -= weights[i];
        }
        return items[0];
    }

    function stepBeat(opts) {
        const W = World(), O = Objects(), st = state(), o = opts || {};
        if (!enabled && !o.force || !W || !W.state || !O) return { spawned: 0, matured: 0 };
        st.beatCount++;
        const currentBeat = st.beatCount;
        const result = { spawned: 0, matured: 0 };

        // 1. Process maturation of existing sprouts
        for (let i = st.sprouts.length - 1; i >= 0; i--) {
            const s = st.sprouts[i];
            if (currentBeat >= s.matureBeat) {
                const levelArea = { x: s.area.x, y: s.area.y, z: s.z };
                const cur = O.atIn(levelArea, s.x, s.y);
                if (cur && cur.id === s.sproutType) {
                    if (!standerAt(levelArea, s.x, s.y)) {
                        O.setIn(levelArea, s.x, s.y, s.matureType);
                        st.stats.matured++;
                        result.matured++;
                        emit("ecology:resourceMatured", levelArea, s.x, s.y, s.matureType);
                    } else {
                        s.matureBeat += 5;
                        continue;
                    }
                }
                st.sprouts.splice(i, 1);
            }
        }

        // 2. Spawn new sprouts across axes 0, -1, -2
        const Levels = window.UF && UF.Levels;
        const JobsPlugin = window.UF && UF.Jobs;
        const H = History();
        const allSites = H && typeof H.sites === "function" ? H.sites() : [];
        const baseArea = (W.currentArea && W.currentArea()) || { x: 0, y: 0 };

        for (const z of [0, -1, -2]) {
            const activeOnLevel = st.sprouts.filter(s => s.z === z).length;
            if (activeOnLevel >= SPROUT_CAP_PER_LEVEL) continue;

            const rng = mulberry32(hash32(W.state.seed, 0x5b3a7, baseArea.x, baseArea.y, z, currentBeat));
            const defs = SPROUT_DEFS[z] || SPROUT_DEFS[0];
            const def = defs[Math.floor(rng() * defs.length)];
            const matureType = pickWeighted(def.matures, def.weights, rng);

            // Find sites on this level
            const levelSites = allSites.filter(s => !s.ruined && (s.z === z || (!s.z && z === 0)));
            const levelArea = { x: baseArea.x, y: baseArea.y, z };

            let placed = false;
            for (let attempt = 0; attempt < 8; attempt++) {
                let tx, ty;
                if (levelSites.length > 0 && rng() < 0.65) {
                    // Cluster near a colony/site (12 - 28 cells away)
                    const s = levelSites[Math.floor(rng() * levelSites.length)];
                    const ang = rng() * Math.PI * 2;
                    const dist = 12 + Math.floor(rng() * 16);
                    tx = Math.round(s.x + Math.cos(ang) * dist);
                    ty = Math.round(s.y + Math.sin(ang) * dist);
                } else {
                    tx = 5 + Math.floor(rng() * (W.state.size - 10));
                    ty = 5 + Math.floor(rng() * (W.state.size - 10));
                }

                if (tx < 2 || ty < 2 || tx >= W.state.size - 2 || ty >= W.state.size - 2) continue;
                if (JobsPlugin && JobsPlugin.isWaterAt && JobsPlugin.isWaterAt(levelArea, tx, ty)) continue;
                if (Levels && Levels.waterAt && Levels.waterAt({ area: levelArea, x: tx, y: ty, z })) continue;

                // Passability and shape check
                if (z === 0) {
                    if (!W.walkable(baseArea.x, baseArea.y, tx, ty, { z: 0, ground: true })) continue;
                } else {
                    if (!Levels || typeof Levels.shapeAt !== "function") continue;
                    const sh = Levels.shapeAt({ area: levelArea, x: tx, y: ty, z });
                    if (sh !== "floor" && sh !== 0) continue; // Must be open cavern floor, not solid cave rock
                }

                // Cell must be clear of objects and standing units
                if (O.atIn(levelArea, tx, ty)) continue;
                if (standerAt(levelArea, tx, ty)) continue;

                // Success! Place the sprout
                if (O.setIn(levelArea, tx, ty, def.sprout)) {
                    st.sprouts.push({
                        id: `sprout_${st.nextSproutId++}`,
                        area: copyArea(baseArea),
                        x: tx,
                        y: ty,
                        z,
                        sproutType: def.sprout,
                        matureType,
                        createdBeat: currentBeat,
                        matureBeat: currentBeat + def.delay
                    });
                    st.stats.sprouts++;
                    result.spawned++;
                    emit("ecology:sproutAppeared", levelArea, tx, ty, def.sprout, matureType);
                    placed = true;
                    break;
                }
            }
        }
        return result;
    }

    //-------------------------------------------------------------------------
    // Hourly driver: resources every hour, populations every six hours.

    function cursorArea() {
        const W = World(), st = state();
        if (!W || !W.state || !st) return null;
        const total = W.state.areasX * W.state.areasY;
        if (!total) return null;
        const i = st.cursor % total;
        st.cursor = (i + 1) % total;
        return { x: i % W.state.areasX, y: Math.floor(i / W.state.areasX) };
    }

    function tickHour(hour) {
        const O = Objects(), W = World(), st = state();
        const at = Number.isFinite(hour) ? hour : (O && O.hourNow ? O.hourNow() : 0);
        const result = { hour: at, resources: processResources(at), areas: [], ms: 0 };
        const t0 = nowMs();
        if (!enabled || !W || !W.state || !st) return result;
        st.lastHour = at;
        st.stats.hours++;

        const here = W.currentArea();
        const rotate = cursorArea();
        const seen = new Set();
        for (const a of [here, rotate]) {
            if (!a || seen.has(areaKey(a))) continue;
            seen.add(areaKey(a));
            spreadPlants(a, at);
            stepBreeding(a, at);
        }

        if (at % POPULATION_INTERVAL === 0) {
            seen.clear();
            for (const a of [here, rotate]) {
                if (!a || seen.has(areaKey(a))) continue;
                seen.add(areaKey(a));
                result.areas.push(processArea(a, { hour: at }));
            }
        }
        result.ms = nowMs() - t0;
        st.stats.ms += result.ms;
        lastHourReport = result;
        emit("ecology:hour", result);
        return result;
    }

    function hookEvents() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        UF.Events.on("objects:changed", onObjectChanged);
        UF.Events.on("time:hour", () => {
            try { tickHour(); } catch (e) { report("time:hour", e); }
        });
        UF.Events.on("world:created", () => {
            try { initializeBaselines(); } catch (e) { report("world:created", e); }
        });
    }

    const Ecology = {
        VERSION,
        config: Object.freeze({
            populationInterval: POPULATION_INTERVAL, preyFloor: PREY_FLOOR, monsterFloor: MONSTER_FLOOR,
            preyChance: PREY_CHANCE, monsterChance: MONSTER_CHANCE,
            siteClearance: SITE_CLEARANCE, personClearance: PERSON_CLEARANCE, playerClearance: PLAYER_CLEARANCE,
            treeHours: TREE_HOURS, bushHours: BUSH_HOURS, plantHours: PLANT_HOURS
        }),
        state,
        resources: () => (state() ? state().resources : []),
        sprouts: () => (state() ? state().sprouts : []),
        stepBeat,
        sproutDefs: () => SPROUT_DEFS,
        scheduleResource,
        cancelResource,
        processResources,
        startSapling,
        spreadPlants,
        stepBreeding,
        isRenewableObject,
        resourceHours,
        population,
        ensureArea,
        initializeBaselines,
        capFor,
        protectedReason,
        candidateValid,
        findCandidate,
        attemptSpawn,
        processArea,
        tickHour,
        lastHour: () => lastHourReport,
        setEnabled(on) { enabled = !!on; },
        isEnabled: () => enabled,
        errors,
        errorCount: () => errorCount
    };
    window.UF = window.UF || {};
    window.UF.Ecology = Ecology;

    hookEvents();

    let _beatFrame = 0;
    const _Game_Map_update_ecology = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update_ecology.call(this, sceneActive);
        if (sceneActive && window.UF && UF.World && UF.World.isWorldMap && UF.World.isWorldMap(this.mapId())) {
            _beatFrame++;
            if (_beatFrame >= 60) {
                _beatFrame = 0;
                stepBeat();
            }
        }
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        try { state(); initializeBaselines(); } catch (e) { report("load", e); }
    };

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        hookEvents();
        if (window.UF.Test && UF.Test.active) registerChecks();
        _Scene_Boot_start.call(this);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "ecology")

    function registerChecks() {
        UF.Test.suite("ecology", async t => {
            const W = UF.World, O = UF.Objects, E = Ecology;
            const errors0 = t.errorsSoFar().length, inner0 = errorCount;
            const check = (name, condition, detail) => t.check(name, !!condition && !provoked(name),
                `${detail || ""}${provoked(name) ? "; deliberately provoked through UF_TEST_PROVOKE" : ""}`);
            const priorEnabled = enabled;
            enabled = false;
            const area = W.currentArea() || (W.state && W.state.startArea) || { x: 0, y: 0 };
            initializeBaselines();

            // 1. state_saved: registry, baselines and counters live inside the world save.
            const st = E.state(), copy = JsonEx.parse(JsonEx.stringify(W.state)), contents = DataManager.makeSaveContents();
            const saved = !!st && st.version === VERSION && Array.isArray(st.resources) && !!st.areas[areaKey(area)] &&
                !!copy.ecology && copy.ecology.version === VERSION && contents.ufWorld.ecology === W.state.ecology;
            check("state_saved", saved,
                `version ${st && st.version}; ${Object.keys(st && st.areas || {}).length} area baseline(s); JsonEx ecology ${!!copy.ecology}; save points at live ecology ${contents.ufWorld && contents.ufWorld.ecology === W.state.ecology}`);

            // 2. renewable_only: biology comes back; stone and ore do not.
            const renew = E.isRenewableObject("oak") && E.isRenewableObject("bush") && E.isRenewableObject("grass_tuft");
            const finite = !E.isRenewableObject("ironstone") && !E.isRenewableObject("rocks_small") && !E.isRenewableObject("crystal");
            check("renewable_only", renew && finite && E.resourceHours("oak") > E.resourceHours("bush") && E.resourceHours("bush") > E.resourceHours("grass_tuft"),
                `oak/bush/grass renewable ${renew}; iron/stone/crystal finite ${finite}; hours tree/bush/plant ${E.resourceHours("oak")}/${E.resourceHours("bush")}/${E.resourceHours("grass_tuft")}`);

            const free = [];
            const size = W.state.size, cx = Math.floor(size / 2), cy = Math.floor(size / 2);
            for (let r = 3; r < Math.floor(size / 2) && free.length < 4; r++) {
                for (let dy = -r; dy <= r && free.length < 4; dy++) for (let dx = -r; dx <= r && free.length < 4; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const x = cx + dx, y = cy + dy;
                    if (W.cellFree(area.x, area.y, x, y)) free.push({ x, y });
                }
            }
            if (free.length < 2) {
                check("renewable_timer", false, `found ${free.length} free test cells (want 2)`);
                enabled = priorEnabled;
                return;
            }

            // 3. renewable_timer: a felled tree waits under a unit, then returns when the cell clears.
            const treeCell = free[0], made = [];
            O.setIn(area, treeCell.x, treeCell.y, "oak");
            const chopped = O.applyIn(area, treeCell.x, treeCell.y, "chop", "TEST");
            let entry = E.resources().find(e => sameArea(e.area, area) && e.x === treeCell.x && e.y === treeCell.y);
            const due = O.hourNow();
            if (entry) entry.due = due;
            const stander = W.addUnit({ name: "TEST_regrowth_watcher", image: { characterName: "$Adam", characterIndex: 0 }, area: copyArea(area),
                x: treeCell.x, y: treeCell.y, dir: 2, data: { kind: "test" } });
            made.push(stander.id);
            const held = E.processResources(due);
            entry = E.resources().find(e => sameArea(e.area, area) && e.x === treeCell.x && e.y === treeCell.y);
            W.removeUnit(stander.id); made.splice(made.indexOf(stander.id), 1);
            if (entry) entry.due = due;
            const grown = E.processResources(due);
            const returned = (O.atIn(area, treeCell.x, treeCell.y) || {}).id === "oak";
            check("renewable_timer", !!chopped && chopped.to === "stump" && held.held === 1 && grown.grown === 1 && returned,
                `chop -> ${chopped && chopped.to}; occupied pass due/grown/held ${held.due}/${held.grown}/${held.held}; clear pass grown ${grown.grown}; final ${(O.atIn(area, treeCell.x, treeCell.y) || {}).id || "none"}`);

            // 4. native_regrow_single: UF_Objects keeps its berry timer; Ecology does not duplicate it.
            const berryCell = free[1];
            O.setIn(area, berryCell.x, berryCell.y, "berry_bush");
            O.applyIn(area, berryCell.x, berryCell.y, "gather", "TEST");
            const native = O.regrowList().filter(e => sameArea(e.area, area) && e.x === berryCell.x && e.y === berryCell.y);
            const duplicate = E.resources().filter(e => sameArea(e.area, area) && e.x === berryCell.x && e.y === berryCell.y);
            check("native_regrow_single", native.length === 1 && duplicate.length === 0,
                `UF_Objects timers ${native.length}; Ecology timers ${duplicate.length}; cell ${(O.atIn(area, berryCell.x, berryCell.y) || {}).id || "none"}`);

            // Find one world area/species where a monster may safely appear.
            let monsterFixture = null;
            const existingMonster = W.units().find(u => {
                const sp = speciesOf(u); return sp && sp.kind === "monster";
            });
            const monsterSpecies = E ? Wildlife().species().filter(sp => sp.kind === "monster") : [];
            const areas = [];
            if (existingMonster) areas.push({ area: copyArea(existingMonster.area), speciesId: existingMonster.data.species });
            for (let ay = 0; ay < W.state.areasY; ay++) for (let ax = 0; ax < W.state.areasX; ax++) areas.push({ area: { x: ax, y: ay }, speciesId: null });
            for (const f of areas) {
                const ids = f.speciesId ? [f.speciesId] : monsterSpecies.map(sp => sp.id);
                for (const id of ids) {
                    const c = E.findCandidate(f.area, "monsters", { hour: 240, roll: 7, speciesId: id, tries: 192 });
                    if (c) { monsterFixture = { area: f.area, speciesId: id, candidate: c }; break; }
                }
                if (monsterFixture) break;
            }

            // 5. deterministic_safe_cell: same inputs pick the same legal, protected-distance cell.
            const mc1 = monsterFixture && monsterFixture.candidate;
            const mc2 = monsterFixture && E.findCandidate(monsterFixture.area, "monsters", { hour: 240, roll: 7, speciesId: monsterFixture.speciesId, tries: 192 });
            const deterministic = mc1 && mc2 && mc1.x === mc2.x && mc1.y === mc2.y && mc1.species.id === mc2.species.id;
            const safe = mc1 && E.candidateValid(mc1.area, mc1.x, mc1.y, mc1.species, "monsters") && !E.protectedReason(mc1.area, mc1.x, mc1.y, "monsters");
            check("deterministic_safe_cell", !!deterministic && !!safe,
                monsterFixture ? `${monsterFixture.speciesId} chose (${mc1 && mc1.x},${mc1 && mc1.y}) twice; safe ${!!safe}` : "no monster-eligible protected-distance cell found in the world");

            // 6. hard_cap: even a forced roll cannot exceed the supplied area cap.
            let capped = null;
            if (monsterFixture) {
                const p = E.population(monsterFixture.area);
                capped = E.attemptSpawn(monsterFixture.area, "monsters", { force: true, hour: 241, speciesId: monsterFixture.speciesId, cap: p.monsters });
            }
            check("hard_cap", !!capped && capped.status === "capped" && capped.spawned.length === 0,
                capped ? `status ${capped.status}; population/cap ${capped.before}/${capped.cap}; spawned ${capped.spawned.length}` : "no monster fixture");

            // 7. monster_replenishes: under cap, a forced roll adds only catalog-legal, free, protected-distance monsters.
            let monsterRun = null;
            if (monsterFixture) {
                const p = E.population(monsterFixture.area);
                monsterRun = E.attemptSpawn(monsterFixture.area, "monsters", { force: true, hour: 242, speciesId: monsterFixture.speciesId, cap: p.monsters + 2, roll: 8, tries: 192 });
                for (const u of monsterRun.spawned) made.push(u.id);
            }
            const monstersSafe = monsterRun && monsterRun.spawned.length > 0 && monsterRun.spawned.every(u => {
                const sp = speciesOf(u), gx = u.area.x * size + u.x, gy = u.area.y * size + u.y;
                return sp && sp.kind === "monster" && Wildlife().allowedAt(sp.id, gx, gy) && !E.protectedReason(u.area, u.x, u.y, "monsters") && W.cellFree(u.area.x, u.area.y, u.x, u.y, u.id);
            });
            check("monster_replenishes", !!monstersSafe,
                monsterRun ? `${monsterRun.status}: ${monsterRun.spawned.length} ${monsterRun.species || "?"} in area (${monsterRun.area.x},${monsterRun.area.y}), cap ${monsterRun.cap}` : "no monster fixture");
            if (monsterRun && monsterRun.spawned.length && sameArea(monsterRun.spawned[0].area, area) && window.UF.Look) {
                const u = monsterRun.spawned[0];
                if (u.data) u.data.ai = "none";
                $gamePlayer.locate(Math.max(0, u.x - 1), u.y);
                UF.Look.show(u.x, u.y, 4);
                await t.waitFrames(10);
                t.screenshot("replenished_monster");
            }

            // 8. prey_replenishes: game animals recover under the same free-cell and biome guard.
            const herePrey = W.unitsInArea(area.x, area.y).find(u => {
                const sp = speciesOf(u); return sp && sp.prey;
            });
            const beforePrey = E.population(area).prey;
            const preyRun = E.attemptSpawn(area, "prey", { force: true, hour: 243, speciesId: herePrey && herePrey.data.species, cap: beforePrey + 2, tries: 192 });
            for (const u of preyRun.spawned) { made.push(u.id); if (u.data) u.data.ai = "none"; }
            const preySafe = preyRun.spawned.length > 0 && preyRun.spawned.every(u => {
                const sp = speciesOf(u), gx = u.area.x * size + u.x, gy = u.area.y * size + u.y;
                return sp && sp.prey && Wildlife().allowedAt(sp.id, gx, gy) && W.cellFree(u.area.x, u.area.y, u.x, u.y, u.id);
            });
            check("prey_replenishes", preySafe && E.population(area).prey > beforePrey,
                `${preyRun.status}: ${preyRun.spawned.length} ${preyRun.species || "?"}; prey ${beforePrey} -> ${E.population(area).prey}`);
            if (preyRun.spawned.length && window.UF.Look) {
                const u = preyRun.spawned[0];
                $gamePlayer.locate(Math.max(0, u.x - 1), u.y);
                UF.Look.show(u.x, u.y, 4);
                await t.waitFrames(10);
                t.screenshot("replenished_prey");
            }

            // 9. bounded_work: cap exits and population scans stay outside a frame budget.
            const p0 = E.population(area), t0 = nowMs();
            let cappedRuns = 0;
            for (let i = 0; i < 100; i++) {
                const r = E.attemptSpawn(area, "prey", { force: true, hour: 300 + i, cap: 0 });
                if (r.status === "capped") cappedRuns++;
            }
            const elapsed = nowMs() - t0;
            enabled = true;
            const quietHour = E.tickHour(305), ecologyHour = E.tickHour(306);
            enabled = false;
            const driverBounded = quietHour.areas.length === 0 && ecologyHour.areas.length >= 1 && ecologyHour.areas.length <= 2;
            check("bounded_work", cappedRuns === 100 && elapsed <= 20 && driverBounded,
                `100 capped attempts in ${elapsed.toFixed(3)} ms (budget 20 ms); current prey/monsters ${p0.prey}/${p0.monsters}; hour 305/306 processed ${quietHour.areas.length}/${ecologyHour.areas.length} area(s)`);

            // 10. beat_sprouting: resources sprout across axes 0, -1, -2 each beat
            enabled = true;
            const sproutsBefore = E.sprouts().length;
            let totalSpawned = 0;
            for (let b = 0; b < 5; b++) {
                const stepRes = E.stepBeat({ force: true });
                totalSpawned += stepRes.spawned;
            }
            const sproutsAfter = E.sprouts();
            const zSet = new Set(sproutsAfter.map(s => s.z));
            const hasSprouts = sproutsAfter.length > sproutsBefore && totalSpawned > 0;
            check("beat_sprouting", hasSprouts && zSet.size > 0,
                `5 beats spawned ${totalSpawned} sprouts (total ${sproutsAfter.length} active); levels represented: ${Array.from(zSet).join(", ")}`);

            // 11. maturation_cycle: sprouts mature into full resources after delay
            let maturedSprout = null;
            if (sproutsAfter.length > 0) {
                const targetSprout = sproutsAfter[0];
                const st = E.state();
                st.beatCount = targetSprout.matureBeat;
                const matRes = E.stepBeat({ force: true });
                const levelArea = { x: targetSprout.area.x, y: targetSprout.area.y, z: targetSprout.z };
                const objAfter = O.atIn(levelArea, targetSprout.x, targetSprout.y);
                maturedSprout = objAfter && objAfter.id === targetSprout.matureType;
                check("maturation_cycle", !!maturedSprout && matRes.matured > 0,
                    `sprout ${targetSprout.sproutType} at (${targetSprout.x},${targetSprout.y},z=${targetSprout.z}) matured into ${targetSprout.matureType}: ${!!maturedSprout}`);
                O.setIn(levelArea, targetSprout.x, targetSprout.y, null);
            } else {
                check("maturation_cycle", false, "no active sprouts to mature");
            }

            for (const id of made) if (W.unit(id)) W.removeUnit(id);
            O.setIn(area, treeCell.x, treeCell.y, null);
            E.cancelResource(area, treeCell.x, treeCell.y);
            O.setIn(area, berryCell.x, berryCell.y, null);
            E.cancelResource(area, berryCell.x, berryCell.y);
            enabled = priorEnabled;

            // 10. no_errors
            const newErrors = t.errorsSoFar().slice(errors0), newInner = errorCount - inner0;
            check("no_errors", newErrors.length === 0 && newInner === 0,
                `${newErrors.length} uncaught error(s)${newErrors.length ? `, first: ${newErrors[0]}` : ""}; ${newInner} caught inside UF_Ecology${newInner ? `, last: ${errors[errors.length - 1]}` : ""}`);
        });
    }
})();
