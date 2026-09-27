"use strict";

// Observations of generated worlds, not fixtures or generation substitutes. The
// cardinal search is an independent conservative reachability oracle; its cells
// use the actual registered World.walkable path and generated object grids.
const fs = require("fs");
const path = require("path");

const speciesReference = JSON.parse(fs.readFileSync(path.resolve(__dirname,
    "../../game/data/srd5_1/species_reference.json"), "utf8"));
const darkvision = new Map(speciesReference.species.map(s => [s.id, s.darkvisionFeet]));
const PROVOCATIONS = Object.freeze(["founder_population", "founder_links", "founder_cells",
    "camp_chests", "camp_clearance", "food_reachable", "water_reachable", "light_reachable", "surface_kit"]);

function at(rec) {
    const a = rec.area || {};
    return `area=${a.x},${a.y} cell=${rec.x},${rec.y},z=${rec.z}`;
}
function unitLabel(u) { return `founder=${u.id} ${u.data.species} site=${u.data.site} ${at(u)}`; }
function siteLabel(s) { return `site=${s.id} faction=${s.faction} ${at(s)}`; }
function summary(problems, success) {
    return problems.length ? `${problems.length} problem(s): ${problems.slice(0, 10).join(" | ")}`
        + (problems.length > 10 ? ` | ${problems.length - 10} further problem(s)` : "") : success;
}
function foundersOf(state) {
    return Object.values(state.units || {}).filter(u => u.data && u.data.historicalFounder === true && !u.data.dead);
}
function sourceTypes(catalog) {
    const foodItems = new Set((catalog.items.types || []).filter(t => t.food).map(t => t.id));
    const food = new Set(), fungus = new Set();
    for (let i = 0; i < catalog.objects.length; i++) {
        const o = catalog.objects[i];
        const yieldsFood = Object.values(o.actions || {}).some(a =>
            Object.entries(a.yields || {}).some(([id, count]) => foodItems.has(id) && Number(count) > 0));
        if (!yieldsFood) continue;
        food.add(i + 1);
        if ((o.tags || []).includes("fungus")) fungus.add(i + 1);
    }
    return { food, fungus, glow: catalog.objects.findIndex(o => o.id === "glow_caps") + 1 };
}
function needsLight(species) {
    const feet = darkvision.get(String(species).replace(/-/g, "_"));
    if (feet === undefined) throw new Error(`No independent SRD darkvision record for ${species}`);
    return feet === 0;
}
function inMap(rec, size, maps) {
    return rec && rec.area && rec.area.x === 0 && rec.area.y === 0 && maps.has(rec.z)
        && Number.isInteger(rec.x) && Number.isInteger(rec.y)
        && rec.x >= 0 && rec.y >= 0 && rec.x < size && rec.y < size;
}

function waterObserver(env, maps) {
    const drinkable = new Set(env.$ufWorldCatalog.start.kit.water.kinds);
    const { Levels, Fluid, Tiles } = env.UF;
    return (z, x, y) => {
        if (z >= 0) {
            const map = maps.get(z);
            return drinkable.has(Tiles.waterKindOfTile(map.data[y * map.width + x]));
        }
        const fluidType = Fluid && Fluid.typeAt(0, 0, x, y, z);
        if (fluidType === "lava" || Levels.isLavaAt(0, 0, z, x, y)) return false;
        return Levels.isWaterAt(0, 0, z, x, y)
            || !!(fluidType === "water" && Fluid.depthAt(0, 0, x, y, z) > 0);
    };
}

function surveyViability(runtime, maps, check) {
    const env = runtime.env, { World } = env.UF, state = World.state;
    const catalog = env.$ufWorldCatalog, size = state.size, cells = size * size;
    const factions = (state.factions && state.factions.list) || [];
    const history = state.history || {}, sites = history.sites || [];
    const demographics = history.demographics || {};
    const founders = foundersOf(state);
    const byFaction = new Map(factions.map(f => [f.id, f]));
    const bySite = new Map(sites.map(s => [s.id, s]));
    const byDemographicSite = new Map((demographics.sites || []).map(s => [s.id, s]));
    const expectedSpecies = catalog.factions.species.map(s => s.id).sort();
    const fc = catalog.factions.founders, perFaction = fc.male + fc.female;
    const populationProblems = [];
    if (expectedSpecies.length !== 9 || factions.length !== 9
        || factions.map(f => f.species).sort().join("|") !== expectedSpecies.join("|")
        || byFaction.size !== factions.length) populationProblems.push("expected all nine distinct catalog species/faction IDs");
    if (perFaction !== 8 || founders.length !== 72) populationProblems.push(`living founders=${founders.length}, catalog founders/faction=${perFaction}; expected 72 and 8`);
    for (const f of factions) {
        const group = founders.filter(u => u.data.faction === f.id);
        const male = group.filter(u => u.data.gender === "male").length;
        const female = group.filter(u => u.data.gender === "female").length;
        if (group.length !== perFaction || male !== fc.male || female !== fc.female || f.population !== perFaction) {
            populationProblems.push(`${f.id}/${f.species} ${at(f.home || {})}: living=${group.length}, male=${male}, female=${female}, faction.population=${f.population}`);
        }
    }
    check("founder_population", populationProblems.length === 0,
        summary(populationProblems, `${founders.length} living founders; nine species, ${fc.male} male/${fc.female} female per faction`));

    const linkProblems = [];
    if (sites.length !== factions.length || bySite.size !== sites.length) linkProblems.push(`sites=${sites.length}, distinct sites=${bySite.size}, factions=${factions.length}`);
    for (const f of factions) {
        const owned = sites.filter(s => s.faction === f.id);
        const s = owned[0], h = f.home;
        if (owned.length !== 1 || !inMap(h, size, maps) || !s || !h || s.x !== h.x || s.y !== h.y || s.z !== h.z
            || !s.area || s.area.x !== h.area.x || s.area.y !== h.area.y) {
            linkProblems.push(`faction=${f.id} home ${at(h || {})}: expected one matching site; found=${owned.length}`);
        }
    }
    for (const u of founders) {
        const d = u.data, f = byFaction.get(d.faction), s = bySite.get(d.site);
        const ds = byDemographicSite.get(d.siteId);
        const p = (demographics.people || [])[d.historicalPersonId];
        const h = d.home;
        if (!f || d.species !== f.species || !s || s.faction !== d.faction
            || !u.area || !s.area || u.area.x !== s.area.x || u.area.y !== s.area.y || u.z !== s.z
            || !ds || ds.sourceSiteId !== d.site || ds.factionId !== d.faction || ds.z !== u.z
            || !p || p.died !== null || p.factionId !== d.faction || p.siteId !== d.siteId
            || !h || !h.area || h.area.x !== s.area.x || h.area.y !== s.area.y || h.x !== s.x || h.y !== s.y || h.z !== s.z) {
            linkProblems.push(`${unitLabel(u)}: inconsistent faction, site, demographic person or home reference`);
        }
    }
    check("founder_links", founders.length > 0 && linkProblems.length === 0,
        summary(linkProblems, `${founders.length} founders linked to ${sites.length} real camps and demographic sites`));

    const types = sourceTypes(catalog), waterAt = waterObserver(env, maps);
    const grids = new Map();
    const metrics = { founders: founders.length, factions: factions.length, sites: sites.length,
        components: 0, reachableCells: 0, walkabilityQueries: 0, founderComponents: [], surfaceKits: [] };
    function gridFor(z) {
        if (!grids.has(z)) grids.set(z, { map: maps.get(z), walk: new Uint8Array(cells),
            labels: new Int32Array(cells), components: [null], water: new Uint8Array(cells) });
        return grids.get(z);
    }
    function canWalk(z, i) {
        const g = gridFor(z);
        if (!g.walk[i]) {
            const typeId = g.map.ufObjects[i], object = catalog.objects[typeId - 1];
            // The explicit physical-grid check also sees post-generation output
            // mutations even if the world's own peek cache has another map object.
            const physical = !typeId || !!(object && object.passable === true);
            metrics.walkabilityQueries++;
            g.walk[i] = physical && World.walkable(0, 0, i % size, Math.floor(i / size), { z }) ? 2 : 1;
        }
        return g.walk[i] === 2;
    }
    function hasWater(z, i) {
        const g = gridFor(z);
        if (!g.water[i]) g.water[i] = waterAt(z, i % size, Math.floor(i / size)) ? 2 : 1;
        return g.water[i] === 2;
    }
    function neighbors(i) {
        const x = i % size, y = Math.floor(i / size), out = [];
        if (x > 0) out.push(i - 1);
        if (x + 1 < size) out.push(i + 1);
        if (y > 0) out.push(i - size);
        if (y + 1 < size) out.push(i + size);
        return out;
    }
    function component(z, start) {
        const g = gridFor(z);
        if (!canWalk(z, start)) return null;
        if (g.labels[start]) return g.components[g.labels[start]];
        const id = g.components.length, q = new Int32Array(cells);
        const c = { id, z, size: 0, food: false, water: false, light: false };
        g.components.push(c);
        let head = 0, tail = 1;
        q[0] = start; g.labels[start] = id;
        const foodTypes = z < 0 ? types.fungus : types.food;
        while (head < tail) {
            const i = q[head++], adjacent = neighbors(i);
            const object = g.map.ufObjects[i];
            if (foodTypes.has(object)) c.food = true;
            if (types.glow && object === types.glow) c.light = true;
            if (!c.water && hasWater(z, i)) c.water = true;
            for (const j of adjacent) {
                // Gathering and drinking can occur from an orthogonal working
                // cell; a blocking fruit tree/bush need not itself be walkable.
                if (!c.food && foodTypes.has(g.map.ufObjects[j])) c.food = true;
                if (!c.water && hasWater(z, j)) c.water = true;
                if (!g.labels[j] && canWalk(z, j)) { g.labels[j] = id; q[tail++] = j; }
            }
        }
        c.size = tail; metrics.components++; metrics.reachableCells += tail;
        return c;
    }

    const cellProblems = [];
    const occupied = new Map(), componentRows = new Map();
    let lightRequired = 0;
    for (const u of founders) {
        const key = `${u.area && u.area.x},${u.area && u.area.y},${u.z},${u.x},${u.y}`;
        const valid = inMap(u, size, maps);
        if (occupied.has(key)) cellProblems.push(`${unitLabel(u)}: shares cell with founder=${occupied.get(key)}`);
        occupied.set(key, u.id);
        const c = valid ? component(u.z, u.y * size + u.x) : null;
        if (!c) cellProblems.push(`${unitLabel(u)}: ${valid ? "not walkable" : "invalid map or coordinates"}`);
        const caseId = `founder:${u.id}`;
        const componentDetail = c ? ` in ${c.size}-cell component` : "; start blocked";
        check("food_reachable", !!(c && c.food),
            `${caseId} ${unitLabel(u)}: ${u.z < 0 ? "fungal food" : "food source"} ${c && c.food ? "reachable" : "unreachable"}${componentDetail}`, caseId);
        check("water_reachable", !!(c && c.water),
            `${caseId} ${unitLabel(u)}: drinkable water ${c && c.water ? "reachable" : "unreachable"}${componentDetail}`, caseId);
        if (u.z < 0 && needsLight(u.data.species)) {
            lightRequired++;
            check("light_reachable", !!(c && c.light),
                `${caseId} ${unitLabel(u)}: glow_caps ${c && c.light ? "reachable" : "unreachable"}${componentDetail}`, caseId);
        }
        if (c) {
            const ck = `${u.data.site}:${u.z}:${c.id}`;
            if (!componentRows.has(ck)) componentRows.set(ck, { site: u.data.site, faction: u.data.faction,
                z: u.z, component: c.id, cells: c.size, food: c.food, water: c.water, light: c.light, founders: 0 });
            componentRows.get(ck).founders++;
        }
    }
    metrics.founderComponents = [...componentRows.values()];
    check("founder_cells", founders.length > 0 && cellProblems.length === 0,
        summary(cellProblems, `${founders.length} distinct walkable founder cells, actual World.walkable and object grids`));

    const chestType = catalog.objects.findIndex(o => o.id === "chest_wood") + 1;
    const chestProblems = [], clearanceProblems = [];
    for (const s of sites) {
        if (!inMap(s, size, maps)) {
            chestProblems.push(`${siteLabel(s)}: invalid camp cell`);
            clearanceProblems.push(`${siteLabel(s)}: invalid camp cell`);
            continue;
        }
        const map = maps.get(s.z), actual = map.ufObjects[s.y * size + s.x];
        if (!chestType || actual !== chestType) chestProblems.push(`${siteLabel(s)}: centre=${(catalog.objects[actual - 1] || {}).id || actual}, expected chest_wood`);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const x = s.x + dx, y = s.y + dy;
            if (x < 0 || y < 0 || x >= size || y >= size || map.ufObjects[y * size + x]) {
                clearanceProblems.push(`${siteLabel(s)}: ring cell=${x},${y} out of bounds or occupied by object=${map.ufObjects[y * size + x]}`);
            }
        }
    }
    check("camp_chests", sites.length > 0 && chestProblems.length === 0,
        summary(chestProblems, `${sites.length} physical chest_wood camp centres`));
    check("camp_clearance", sites.length > 0 && clearanceProblems.length === 0,
        summary(clearanceProblems, `${sites.length} camps each have eight object-free neighbor cells`));
    if (!founders.length) {
        check("food_reachable", false, "founders_required: no living founders to audit", "founders_required");
        check("water_reachable", false, "founders_required: no living founders to audit", "founders_required");
    }
    if (!lightRequired) check("light_reachable", false,
        "light_required: no underground founders without SRD darkvision were audited", "light_required");

    const kit = catalog.start.kit, radius = kit.radius[1];
    const typeById = new Map(catalog.objects.map((o, i) => [o.id, i + 1]));
    const surfaceSites = sites.filter(s => s.z === 0);
    for (const s of surfaceSites) {
        const caseId = `site:${s.id}`, kitProblems = [];
        if (!inMap(s, size, maps)) {
            check("surface_kit", false, `${caseId} ${siteLabel(s)}: invalid map or camp cell`, caseId);
            continue;
        }
        const counts = new Map(), map = maps.get(0);
        for (let y = Math.max(0, s.y - radius); y <= Math.min(size - 1, s.y + radius); y++) {
            for (let x = Math.max(0, s.x - radius); x <= Math.min(size - 1, s.x + radius); x++) {
                if ((x - s.x) ** 2 + (y - s.y) ** 2 > radius * radius) continue;
                const type = map.ufObjects[y * size + x];
                counts.set(type, (counts.get(type) || 0) + 1);
            }
        }
        const observed = {};
        for (const [id, minimum] of Object.entries(kit.objects)) {
            const count = counts.get(typeById.get(id)) || 0;
            observed[id] = count;
            if (count < minimum) kitProblems.push(`${siteLabel(s)}: ${id}=${count}/${minimum} within radius ${radius}`);
        }
        const ore = kit.ore.ids.reduce((sum, id) => sum + (counts.get(typeById.get(id)) || 0), 0);
        observed.ore = ore;
        if (ore < kit.ore.count[0]) kitProblems.push(`${siteLabel(s)}: ore=${ore}/${kit.ore.count[0]} within radius ${radius}`);
        metrics.surfaceKits.push({ site: s.id, faction: s.faction, x: s.x, y: s.y, radius, observed });
        check("surface_kit", kitProblems.length === 0,
            `${caseId} ${summary(kitProblems, `${siteLabel(s)}: actual catalog starter-object and ore minimums within radius ${radius}`)}`, caseId);
    }
    if (!surfaceSites.length) check("surface_kit", false,
        "surface_sites_required: no surface camps to audit", "surface_sites_required");
    return metrics;
}

function provokeViability(name, runtime, maps) {
    if (!PROVOCATIONS.includes(name)) throw new Error(`Unknown viability provocation ${name}`);
    const { env } = runtime, W = env.UF.World, state = W.state, cat = env.$ufWorldCatalog;
    const founders = foundersOf(state), sites = state.history.sites;
    if (!founders.length || !sites.length) throw new Error(`Cannot provoke ${name}: no generated founders/camps`);
    const first = founders[0], site = sites.find(s => s.id === first.data.site) || sites[0];
    let changed = 0, detail = "";
    if (name === "founder_population") {
        delete state.units[first.id]; changed = 1; detail = `deleted ${unitLabel(first)}`;
    } else if (name === "founder_links") {
        first.data.site = -2147483648; changed = 1; detail = `broke historical site reference on founder=${first.id}`;
    } else if (name === "founder_cells") {
        first.area = { ...site.area }; first.z = site.z; first.x = site.x; first.y = site.y;
        const id = maps.get(site.z).ufObjects[site.y * state.size + site.x];
        if (!id || cat.objects[id - 1].passable === true) throw new Error("Founder-cell provocation requires an actual blocking camp object");
        changed = 1; detail = `moved ${unitLabel(first)} onto existing ${cat.objects[id - 1].id}`;
    } else if (name === "camp_chests") {
        const map = maps.get(site.z), i = site.y * state.size + site.x;
        changed = map.ufObjects[i] ? 1 : 0; map.ufObjects[i] = 0; detail = `removed centre object at ${siteLabel(site)}`;
    } else if (name === "camp_clearance") {
        const rock = cat.objects.findIndex(o => o.id === "granite_boulder") + 1;
        if (!rock || site.x + 1 >= state.size) throw new Error("No valid blocking-object camp-clearance provocation");
        maps.get(site.z).ufObjects[site.y * state.size + site.x + 1] = rock;
        changed = 1; detail = `blocked east ring cell of ${siteLabel(site)} with real granite_boulder type`;
    } else if (name === "water_reachable") {
        const waterAt = waterObserver(env, maps);
        for (const z of new Set(sites.map(s => s.z))) {
            for (let i = 0; i < state.size * state.size && !changed; i++) {
                if (waterAt(z, i % state.size, Math.floor(i / state.size))) changed = 1;
            }
            if (changed) break;
        }
        env.UF.Tiles.waterKindOfTile = () => null;
        env.UF.Levels.isWaterAt = () => false;
        if (env.UF.Fluid) {
            const original = env.UF.Fluid.typeAt;
            env.UF.Fluid.typeAt = function(...args) { const type = original.apply(this, args); return type === "water" ? null : type; };
        }
        detail = "removed observed water through Tiles/Levels/Fluid water-query behavior after generation";
    } else {
        const sources = sourceTypes(cat);
        const berry = cat.objects.findIndex(o => o.id === "berry_bush") + 1;
        for (const [z, map] of maps) {
            if (name === "surface_kit" && z !== 0) continue;
            if (name === "light_reachable" && z >= 0) continue;
            for (let i = 0; i < map.ufObjects.length; i++) {
                const type = map.ufObjects[i];
                const remove = name === "food_reachable" ? sources.food.has(type)
                    : name === "light_reachable" ? sources.glow > 0 && type === sources.glow : berry > 0 && type === berry;
                if (remove) { map.ufObjects[i] = 0; changed++; }
            }
        }
        detail = `removed ${changed} real generated ${name === "food_reachable" ? "food-source" : name === "light_reachable" ? "underground glow_caps" : "surface berry_bush"} objects`;
    }
    if (!changed) throw new Error(`Viability provocation ${name} did not change an observed generated condition`);
    return { name, changed, detail };
}

module.exports = { surveyViability, provokeViability, PROVOCATIONS };
