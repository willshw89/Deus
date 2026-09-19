/*:
 * @target MZ
 * @plugindesc [UF Culture Growth] Remember successful work, inherit individual tastes, and rank feasible faction plans.
 * @base UF_World
 * @orderAfter UF_Colonists
 * @help
 * Saves learned practices in UF.World.state.cultureGrowth. Knowledge records
 * confirmed work, not technology permission or free skill XP. Personal tastes
 * remain separate from species capabilities and personality facets.
 * Colonists may call rankCandidates after survival priorities. This plugin
 * never creates work, goods, partners, births, or factions. All level queries
 * use the actor/target, never the viewed map. See UF_CultureGrowth.md.
 * Replaced core methods: none. Aliases Scene_Boot.start for event registration.
 */
(() => {
    "use strict";
    const DOMAINS = ["building", "gathering", "woodcutting", "mining", "crafting", "cooking", "smithing", "hauling", "hunting"];
    const WORK = { build: "building", floor: "building", gather: "gathering", pick: "gathering", chop: "woodcutting", mine: "mining", quarry: "mining", fetch: "hauling", haul: "hauling", hunt: "hunting" };
    const MECHANICS = {
        human: { id: "apprentice_observation", text: "Nearby adults observe successful work and favour practising what they have seen." },
        elf: { id: "renewable_sources", text: "When the same resource is available, prefer a regrowing source." },
        dwarf: { id: "shared_construction", text: "Join another resident's active construction project before starting a separate one." },
        gnome: { id: "trade_diversification", text: "Prefer an available trade that the local community has practised less." },
        goblin: { id: "reuse_existing_stock", text: "Fetch an existing requested product before crafting another of the same type." },
        orc: { id: "equipment_first", text: "Make needed equipment before optional domestic decoration." },
        automaton: { id: "bounded_batches", text: "Repeat a successful recipe in batches of three, then prefer a different available recipe." }
    };
    const W = () => window.UF && UF.World;
    const C = () => window.$ufWorldCatalog || {};
    const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    const validZ = r => Number.isInteger(zOf(r)) && zOf(r) >= -2 && zOf(r) <= 2;
    const areaOf = r => r && r.area ? { x: r.area.x, y: r.area.y, z: zOf(r) } : null;
    const samePlace = (a, b) => !!(a && b && a.area && b.area && validZ(a) && validZ(b) && a.area.x === b.area.x && a.area.y === b.area.y && zOf(a) === zOf(b));
    const person = u => !!(u && u.data && ["person", "colonist"].includes(u.data.kind));
    const adult = u => person(u) && Number.isFinite(u.data.age) && u.data.age >= 18 && !["baby", "child", "teen"].includes(u.data.stage) && !u.data.dead;
    const factionId = ref => {
        let id = ref && ref.data ? ref.data.faction : ref && typeof ref === "object" ? ref.id : ref;
        if (id === "player") id = W() && W().state && W().state.factions && W().state.factions.playerId;
        return id === undefined || id === null ? null : String(id);
    };
    const factionOf = ref => {
        const id = factionId(ref), all = W() && W().state && W().state.factions;
        return id === null ? null : ((all && all.list) || []).find(f => String(f.id) === id) || null;
    };
    const recipe = id => ((C().recipes && C().recipes.list) || []).find(r => r.id === id) || null;
    const objectType = id => window.UF && UF.Objects && UF.Objects.type ? UF.Objects.type(id) : (C().objects || []).find(t => t.id === id) || null;
    const item = id => window.UF && UF.Items && UF.Items.get ? UF.Items.get(id) : null;
    const itemType = id => ((C().items && C().items.types) || []).find(t => t.id === id) || null;
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const tick = () => window.UF && UF.Time && UF.Time.ticks ? UF.Time.ticks() : 0;
    const emit = (name, ...args) => { if (window.UF && UF.Events) UF.Events.emit(name, ...args); };
    function roll(id, key, salt = 0) {
        let h = ((W() && W().state && W().state.seed) || 0) ^ (Number(id) * 2654435761) ^ salt;
        for (const c of String(key)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
        h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13;
        return (h >>> 0) / 4294967296;
    }
    function state() {
        const world = W() && W().state;
        if (!world) return null;
        if (!world.cultureGrowth) world.cultureGrowth = { version: 1, factions: {}, people: {}, households: {} };
        return world.cultureGrowth;
    }
    function ensureFaction(ref) {
        const s = state(), f = factionOf(ref), id = factionId(ref);
        if (!s || !f || id === null) return null;
        if (!s.factions[id]) s.factions[id] = { id, species: f.species, practices: {}, knowledge: {}, generations: 0 };
        return s.factions[id];
    }
    function ensurePerson(u) {
        if (!person(u) || !Number.isInteger(u.id)) return null;
        const s = state(), f = ensureFaction(u);
        if (!s || !f) return null;
        let p = s.people[u.id];
        if (!p) {
            const preferences = {};
            for (const d of DOMAINS) preferences[d] = Math.round(35 + roll(u.id, d) * 30);
            p = s.people[u.id] = { id: u.id, faction: f.id, species: u.data.species || f.species, preferences, practices: {}, exposure: {}, generation: 0, parents: [], lastJob: 0, inherited: false, batch: null };
        }
        // This mirror is replaced after JSON load, without overwriting facets or skills.
        u.data.preferences = p.preferences;
        return p;
    }
    function domainOf(jobOrType) {
        const j = typeof jobOrType === "string" ? { type: jobOrType } : (jobOrType || {});
        if (j.type !== "craft") return WORK[j.type] || null;
        const r = recipe(j.params && j.params.recipeId), skill = r && r.skill;
        return skill === "cooking" ? "cooking" : ["smithing", "smelting"].includes(skill) ? "smithing" : "crafting";
    }
    function householdKey(u) {
        const d = u && u.data || {};
        const raw = d.householdId !== undefined ? d.householdId : d.household;
        const id = raw && typeof raw === "object" ? raw.id : raw;
        return id === undefined || id === null ? null : `${factionId(u)}:${id}`;
    }
    function householdPractice(u) {
        const s = state(), key = householdKey(u);
        return s && key ? (s.households[key] || (s.households[key] = { practices: {} })).practices : null;
    }
    function confirmed(job, u) {
        if (!job || job.state !== "done" || !Number.isInteger(job.id) || job.id <= 0 || !person(u) || u.data.dead) return false;
        if (job.assigned !== undefined && job.assigned !== null && job.assigned !== u.id) return false;
        if (job.target && !samePlace(job.target, u)) return false;
        const params = job.params || {}, I = window.UF && UF.Items, O = window.UF && UF.Objects;
        if (job.type === "build") {
            const target = job.target, t = objectType(params.objectId);
            const at = target && O && O.atIn ? O.atIn(areaOf(target), target.x, target.y) : null;
            return !!(t && t.build && at && at.id === t.id);
        }
        if (job.type === "craft") {
            const r = recipe(params.recipeId), ids = job.result && job.result.items;
            if (!r || !Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) return false;
            const counts = {};
            for (const id of ids) { const it = item(id); if (!it || it.holder !== u.id || !(it.count > 0) || !r.outputs[it.type]) return false; counts[it.type] = (counts[it.type] || 0) + it.count; }
            return Object.entries(r.outputs || {}).length > 0 && Object.entries(r.outputs).every(([id, n]) => counts[id] >= n);
        }
        if (["fetch", "haul"].includes(job.type)) {
            const it = item(job.result && job.result.itemId || params.itemId);
            return !!(it && (job.type === "fetch" ? it.holder === u.id : job.target && it.holder == null && samePlace(it, job.target) && it.x === job.target.x && it.y === job.target.y));
        }
        if (["gather", "pick", "chop", "mine", "quarry", "hunt"].includes(job.type)) {
            const ys = job.result && job.result.yields, target = job.target;
            if (!ys || !target || !I || !I.atIn) return false;
            const list = I.atIn(areaOf(target), target.x, target.y);
            const entries = Object.entries(ys).filter(([, n]) => n > 0);
            return entries.length > 0 && entries.every(([id, n]) => itemType(id) && list.filter(it => it.type === id).reduce((sum, it) => sum + it.count, 0) >= n);
        }
        // No result evidence means no learned achievement (including eat/floor).
        return false;
    }
    function recordJob(job, u) {
        if (!confirmed(job, u)) return false;
        const p = ensurePerson(u), f = ensureFaction(u), d = domainOf(job);
        if (!p || !f || !d || job.id <= p.lastJob) return false;
        p.lastJob = job.id; // One monotonically increasing watermark per person, not an unbounded job-ID log.
        p.practices[d] = (p.practices[d] || 0) + 1;
        f.practices[d] = (f.practices[d] || 0) + 1;
        p.preferences[d] = clamp(p.preferences[d] + 0.25, 0, 100);
        const hp = householdPractice(u); if (hp) hp[d] = (hp[d] || 0) + 1;
        const key = job.type === "craft" ? `recipe:${job.params.recipeId}` : job.type === "build" ? `building:${job.params.objectId}` : `work:${d}`;
        if (!Object.prototype.hasOwnProperty.call(f.knowledge, key)) f.knowledge[key] = { by: u.id, tick: tick(), generation: p.generation };
        if (job.type === "craft") {
            const id = job.params.recipeId;
            p.batch = p.batch && p.batch.recipe === id ? { recipe: id, count: p.batch.count + 1 } : { recipe: id, count: 1 };
        }
        // Observation is not a successful achievement, technology unlock, item, or skill XP.
        if (f.species === "human" && adult(u)) for (const other of W().units()) {
            if (other.id === u.id || !adult(other) || factionId(other) !== f.id || other.data.site !== u.data.site || !samePlace(other, u) || Math.max(Math.abs(other.x - u.x), Math.abs(other.y - u.y)) > 6) continue;
            const learner = ensurePerson(other);
            if (learner && (learner.practices[d] || 0) < p.practices[d]) learner.exposure[d] = Math.min(12, (learner.exposure[d] || 0) + 1);
        }
        emit("culture:practice", u, d, key);
        return true;
    }
    function inherit(child, mother, father) {
        const p = ensurePerson(child);
        if (!p || p.inherited) return p;
        const parents = [mother, father].filter(u => person(u) && u.id !== child.id).map(ensurePerson).filter(Boolean);
        const unique = parents.filter((q, i) => parents.findIndex(v => v.id === q.id) === i);
        const hp = householdPractice(child) || householdPractice(mother) || {};
        const total = Object.values(hp).reduce((a, b) => a + b, 0);
        for (const d of DOMAINS) {
            const mean = unique.length ? unique.reduce((n, q) => n + q.preferences[d], 0) / unique.length : 50;
            const exposure = total ? ((hp[d] || 0) / total - 1 / DOMAINS.length) * 20 : 0;
            p.preferences[d] = Math.round(clamp(0.55 * mean + 0.45 * p.preferences[d] + exposure + (roll(child.id, d, 91421) - 0.5) * 12, 5, 95));
        }
        p.parents = unique.map(q => q.id);
        p.generation = unique.length ? Math.max(...unique.map(q => q.generation)) + 1 : 0;
        p.inherited = true;
        const f = ensureFaction(child); if (f) f.generations = Math.max(f.generations, p.generation);
        emit("culture:inherited", child, p.parents.slice());
        return p;
    }
    function priorityFor(u, jobOrType) {
        const p = ensurePerson(u), f = ensureFaction(u), d = domainOf(jobOrType);
        if (!p || !f || !d) return 1;
        const total = Object.values(f.practices).reduce((a, b) => a + b, 0);
        const tradition = total ? (f.practices[d] || 0) / total : 0;
        return clamp(1 + (p.preferences[d] - 50) / 250 + Math.min(0.08, tradition * 0.08), 0.8, 1.28);
    }
    function mechanicFor(ref) {
        const f = factionOf(ref), profile = f && MECHANICS[f.species];
        return profile ? { species: f.species, id: profile.id, text: profile.text } : { species: f && f.species || null, id: "individual_practice", text: "Individual tastes and remembered work guide choices." };
    }
    function outputTypes(c) {
        const j = c.spec || {}, p = j.params || {};
        const r = recipe(p.recipeId || c.step && c.step.craft);
        if (j.type === "craft" && r) return Object.keys(r.outputs || {});
        if (["fetch", "haul"].includes(j.type)) { const it = item(p.itemId); return it ? [it.type] : []; }
        const t = j.target && window.UF && UF.Objects && UF.Objects.atIn ? UF.Objects.atIn(areaOf(j.target), j.target.x, j.target.y) : null;
        return t && t.actions && t.actions[j.type] ? Object.keys(t.actions[j.type].yields || {}) : [];
    }
    const project = c => { const p = c.spec && c.spec.params || {}; return p.householdId || p.household || p.project || c.step && (c.step.householdId || c.step.household || c.step.project || c.step.id) || p.plan || null; };
    function rankCandidates(u, candidates) {
        const p = ensurePerson(u), f = ensureFaction(u), mechanism = mechanicFor(u).id;
        const rows = (candidates || []).map(c => Object.assign({}, c, { score: (Number.isFinite(c.score) ? c.score : 1) * priorityFor(u, c.spec), cultureReason: null }));
        if (!p || !f || rows.length < 2) return rows;
        const boost = (r, reason, value = 0.35) => { r.score += value; r.cultureReason = reason; };
        const outputs = new Map(rows.map(r => [r, outputTypes(r)]));
        const sameOutput = (a, b) => outputs.get(a).some(id => outputs.get(b).includes(id));
        if (mechanism === "apprentice_observation") for (const r of rows) {
            const d = domainOf(r.spec); if (d && (p.exposure[d] || 0) > (p.practices[d] || 0)) boost(r, "Practise work observed nearby", 0.25);
        }
        if (mechanism === "renewable_sources") for (const r of rows) {
            const j = r.spec || {}, t = j.target && UF.Objects && UF.Objects.atIn ? UF.Objects.atIn(areaOf(j.target), j.target.x, j.target.y) : null;
            const action = t && t.actions && t.actions[j.type], after = action && objectType(action.becomes);
            const renewable = t && t.regrow || after && after.regrow;
            if (renewable && rows.some(q => q !== r && ["chop", "quarry", "mine"].includes(q.spec.type) && sameOutput(r, q))) boost(r, "Use a renewable source of the same resource");
        }
        if (mechanism === "shared_construction") {
            const active = UF.Jobs && UF.Jobs.list ? UF.Jobs.list().filter(j => !["done", "failed", "cancelled"].includes(j.state)) : [];
            for (const r of rows) if (project(r) && active.some(j => {
                const worker = W().unit(j.assigned || j.owner);
                return worker && worker.id !== u.id && factionId(worker) === f.id && worker.data.site === u.data.site && samePlace(worker, u) && project({ spec: j }) === project(r);
            })) boost(r, "Finish a shared local construction project");
        }
        if (mechanism === "trade_diversification") {
            const counts = {};
            for (const resident of W().units()) if (person(resident) && factionId(resident) === f.id && resident.data.site === u.data.site && samePlace(resident, u)) {
                const q = ensurePerson(resident); for (const d of DOMAINS) counts[d] = (counts[d] || 0) + (q.practices[d] || 0);
            }
            const domains = rows.map(r => domainOf(r.spec)).filter(Boolean), low = Math.min(...domains.map(d => counts[d] || 0)), high = Math.max(...domains.map(d => counts[d] || 0));
            if (high > low) for (const r of rows) if (domainOf(r.spec) && (counts[domainOf(r.spec)] || 0) === low) boost(r, "Develop an under-practised local trade");
        }
        if (mechanism === "reuse_existing_stock") for (const r of rows) if (["fetch", "haul"].includes(r.spec.type) && rows.some(q => q.spec.type === "craft" && sameOutput(r, q))) boost(r, "Use an existing product before making another");
        if (mechanism === "equipment_first" && rows.some(r => r.step && r.step.optional === true && r.spec.type === "build")) for (const r of rows) {
            if (r.spec.type === "craft" && outputs.get(r).some(id => { const t = itemType(id); return t && (t.tool || (t.tags || []).some(tag => ["weapon", "armor", "shield"].includes(tag))); })) boost(r, "Supply equipment before optional furnishings");
        }
        if (mechanism === "bounded_batches" && p.batch) {
            const crafts = rows.filter(r => r.spec.type === "craft"), same = crafts.filter(r => r.spec.params && r.spec.params.recipeId === p.batch.recipe), other = crafts.filter(r => !same.includes(r));
            if (same.length && other.length) for (const r of p.batch.count < 3 ? same : other) boost(r, p.batch.count < 3 ? "Complete the current three-job batch" : "Rotate after a completed three-job batch");
        }
        return rows.sort((a, b) => b.score - a.score || (a.order || 0) - (b.order || 0));
    }
    function describeFaction(ref) {
        const f = ensureFaction(ref); if (!f) return null;
        const professions = {};
        for (const u of W().units()) if (person(u) && factionId(u) === f.id && !u.data.dead) {
            const role = professionFor(u); if (role) professions[role] = (professions[role] || 0) + 1;
        }
        return { id: f.id, species: f.species, mechanic: mechanicFor(ref), generations: f.generations,
            practices: Object.entries(f.practices).sort((a, b) => b[1] - a[1]).map(([domain, count]) => ({ domain, count })),
            knowledge: Object.keys(f.knowledge).sort(), professions };
    }
    function professionFor(u) {
        const p = ensurePerson(u);
        const entries = p ? Object.entries(p.practices).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) : [];
        return entries.length ? entries[0][0] : null;
    }
    function initialize() { if (!W() || !W().state) return; for (const f of (W().state.factions && W().state.factions.list) || []) ensureFaction(f.id); for (const u of W().units()) ensurePerson(u); }
    let hooked = false;
    function hook() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        UF.Events.on("world:created", initialize);
        UF.Events.on("colonists:ready", initialize);
        UF.Events.on("jobs:done", recordJob);
        UF.Events.on("colonists:born", inherit);
        UF.Events.on("world:unitRemoved", u => { const p = person(u) && state() && state().people[u.id]; if (p && u.data.dead) p.deceased = true; });
    }
    window.UF = window.UF || {};
    UF.CultureGrowth = { state, ensureFaction, ensurePerson, priorityFor, recordJob, inherit, describeFaction, mechanicFor, rankCandidates, domainOf, professionFor, initialize, DOMAINS: DOMAINS.slice() };
    const boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { hook(); boot.call(this); };
})();
