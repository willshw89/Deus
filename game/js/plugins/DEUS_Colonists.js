//=============================================================================
// DEUS_Colonists.js - The colony: the player's faction's people at its home site, their needs, plan, thoughts and skills
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Colonists] Colony population manager, autonomous AI schedules, society planning, and colonist equipment priorities.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_Jobs
 * @orderAfter DEUS_History
 *
 * @help
 * On world:created (after UF_Factions, UF_History and UF_Wildlife have run)
 * the person units that UF_History spawned at the player's faction's home
 * site (the site at the map centre) become colonists: a generated name and
 * gender, seeded personality facets and skills, needs, an empty inventory,
 * clothing tier sheets where the species has them (humans: the $Adam / $Eve
 * sets by gender). Nothing is made from catalog start.pair.
 *
 * Every colonist decides for itself when it has no job (at most once per
 * game second), in this order: needs above their thresholds (drink, eat or
 * gather / hunt for food, sleep, talk, a walk in nature); an open designation
 * (UF.Jobs.take, scored by the culture's priorities); the society plan
 * (catalog colony.plan or the culture's variant, cells relative to the home
 * site's centre): build steps (haul the materials, else gather / chop / pick /
 * quarry them, then build), craft steps (fetch or gather the recipe inputs,
 * craft, equip), stock steps (gather food, hunt when allowed, cook raw meat
 * at the hearth, haul it to the larder); else explore, stroll or contemplate.
 * Every job is a physical interaction with a cell, an item or a unit
 * (UF_Jobs). Needs tick once per game minute; thoughts and a mood follow
 * what happens; skills grow by one per five jobs of their kind.
 *
 * All colony state lives in UF.World.state.colony and in unit.data. All
 * randomness is seeded (hash32 of the seed, the unit id and the frame).
 *
 * API, state, events and checks: docs/systems/UF_Colonists.md
 * Contract: docs/design/WORLD_ARCHITECTURE.md sections 2.4, 2.6, 2.7, 5.6
 *
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const DECIDE_EVERY = 60;        // ticks between decisions of one idle colonist (one game second)
    const SCAN_EVERY = 5;           // ticks between passes over the colonists (smooth distribution)
    const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)
    const SEARCH_RADIUS = 60;       // cells: how far a colonist looks for materials and objects
    const FOOD_ITEM_RADIUS = 30;    // cells: food lying on the ground is eaten from this far
    const WATER_RADIUS = 60;
    const FIRE_RADIUS = 40;         // same as UF_Jobs' craft workplace search
    const HUNT_NEAR = 15;           // cells: a brave colonist hunts prey this close before gathering
    const NATURE_RADIUS = 20;
    const STROLL_RADIUS = 12;       // cells around the site an idle colonist strolls in
    const EXPLORE_RADIUS = 30;
    const HOME_LEASH = 45;          // cells: farther from the site than this (after a long chase), a colonist walks home first
    const URGENT_MARGIN = 25;       // a need this far above its threshold interrupts other work
    const NEED_RETRY_TICKS = 600;   // a need nothing can meet (no water, no food, nowhere to rest) isn't tried again for this long (DEUS-TSK-FABLE-05)
    const AVOID_TICKS = 900;        // a job that failed isn't tried again on the same target for this long
    // The minimal job-taking loop (DEUS-TSK-FABLE-03, 2026-09-22); every count is map updates (domain: action).
    // DECIDE_EVERY above also bounds how often an idle colonist that found nothing to do decides again.
    const SWEEP_EVERY = 30;         // ticks between sweeps of the colonist list for idle workers
    const MAX_DECIDE_PER_SWEEP = 4; // idle colonists that decide in one sweep; the rest wait for the next
    const PROJECT_OWNED_STEPS = Object.freeze(["shelter", "door", "beds", "chest"]); // society-plan steps DEUS_Projects owns
    const LOOKAHEAD = 3;            // plan steps considered at once (the culture's priorities pick among them)
    const THOUGHTS_KEPT = 8;
    const MAX_SKILL = 20;
    const BRAVE = 60;
    const START_NEEDS = Object.freeze({ hunger: 12, thirst: 18, sleep: 8, social: 20, nature: 15, waste: 10 });
    const SALT = Object.freeze({ name: 0x5a, gender: 0x9d, facet: 0xfa, skill: 0x5c, roll: 0xc0, thought: 0x7e, stroll: 0x57 });
    const MOODS = [[50, "Ecstatic"], [25, "Happy"], [10, "Content"], [-10, "Fine"], [-25, "Unhappy"], [-50, "Stressed"], [-Infinity, "Miserable"]];
    const SKILL_OF = Object.freeze({ chop: "woodcutting", gather: "gathering", pick: "gathering", quarry: "stonework", mine: "stonework", build: "building", haul: "hauling", fetch: "hauling", hunt: "hunting", craft: "crafting" });
    const NEED_JOBS = Object.freeze(["drink", "eat", "sleep", "talk", "mate"]);
    const NEIGHBORS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    let localTicks = 0;

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Combat = () => (window.UF && UF.Combat) || null;
    if (typeof require === "function" && (!window.UF || !UF.SettlementPillars)) {
        try {
            require("./UF_SettlementPillars.js");
        } catch (_) {}
    }
    const Pillars = () => (window.UF && UF.SettlementPillars) || null;
    if (typeof require === "function" && (!window.UF || !UF.Sanitation)) {
        try {
            require("./UF_Sanitation.js");
        } catch (_) {}
    }
    const Sanitation = () => (window.UF && UF.Sanitation) || null;
    if (!window.UF || !UF.Generator) {
        if (typeof require === "function") {
            const candidates = [
                "./game/js/plugins/UF_Generator.js",
                "./js/plugins/UF_Generator.js",
                "./UF_Generator.js",
                "game/js/plugins/UF_Generator.js",
                "js/plugins/UF_Generator.js"
            ];
            for (const c of candidates) {
                try {
                    require(c);
                    if (window.UF && UF.Generator) break;
                } catch (_) {}
            }
            if (!window.UF || !UF.Generator) {
                try {
                    const path = require("path");
                    const p1 = path.resolve("game/js/plugins/UF_Generator.js");
                    const p2 = path.resolve("js/plugins/UF_Generator.js");
                    try { require(p1); } catch (_) { require(p2); }
                } catch (_) {}
            }
        }
    }
    const Generator = () => (window.UF && UF.Generator) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const copyArea = a => ({ x: a.x, y: a.y });
    // Persist z beside area; pass {x,y,z} only as API handles. Missing z is legacy Ground, invalid z stays invalid.
    const Space = () => (window.UF && UF.Space) || null;
    const zOf = r => (Space() ? Space().zOf(r) : (r && r.z !== undefined ? r.z : (r && r.area && r.area.z !== undefined ? r.area.z : 0)));
    const levelArea = r => { const a = r && (r.area || r); return a ? { x: a.x, y: a.y, z: zOf(r) } : null; };
    const levelSupported = z => Number.isInteger(z) && z >= -2 && z <= 2 &&
        (z === 0 || !!(World() && World().viewLevel && World().levelOfMapId));
    const sameLevel = (a, b) => !!a && !!b && (Space() ? Space().sameArea(a.area || a, b.area || b) : sameArea(a.area || a, b.area || b)) &&
        levelSupported(zOf(a)) && zOf(a) === zOf(b);
    const targetFor = (u, target) => {
        const t = target || u, area = t.area || u.area;
        const z = t.z !== undefined ? t.z : t.area && t.area.z !== undefined ? t.area.z : zOf(u);
        const ref = { area: copyArea(area), x: t.x | 0, y: t.y | 0, z };
        return sameLevel(u, ref) ? ref : null;
    };
    const chebyshev = (ax, ay, bx, by) => (Space() ? Space().chebyshev({ x: ax, y: ay }, { x: bx, y: by }) : Math.max(Math.abs(ax - bx), Math.abs(ay - by)));
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    const lower = s => String(s || "").toLowerCase();
    const ticks = () => (window.UF && UF.Time && UF.Time.ticks ? UF.Time.ticks() : (World() ? World()._frame : 0));
    const hourNow = () => (window.$ufTime ? $ufTime.hour : 8);

    // Authoritative calendar timebase helpers (Audit Log A8)
    const ticksPerHour = () => (
        window.UF && UF.Time && typeof UF.Time.ticksPerHour === "function" ? UF.Time.ticksPerHour() :
        (window.$ufTime && typeof $ufTime.ticksPerHour === "function" ? $ufTime.ticksPerHour() : 600)
    );
    const ticksPerMinute = () => (
        window.UF && UF.Time && typeof UF.Time.ticksPerMinute === "function" ? UF.Time.ticksPerMinute() :
        (window.$ufTime && typeof $ufTime.ticksPerMinute === "function" ? $ufTime.ticksPerMinute() : 10)
    );
    const ticksForHours = h => (
        window.UF && UF.Time && typeof UF.Time.ticksForHours === "function" ? UF.Time.ticksForHours(h) :
        Math.round(h * ticksPerHour())
    );
    const ticksForMinutes = m => (
        window.UF && UF.Time && typeof UF.Time.ticksForMinutes === "function" ? UF.Time.ticksForMinutes(m) :
        Math.round(m * ticksPerMinute())
    );

    // Seeded numbers: the same hash and generator as UF_World. Never Math.random.
    const hash32 = (...parts) => World().hash32(...parts);
    const mulberry32 = a => World().mulberry32(a);
    const unit01 = (...parts) => hash32(...parts) / 4294967296;
    const seed = () => (World() && World().state ? World().state.seed : 0);

    //-------------------------------------------------------------------------
    // Catalog access

    const colonyConfig = () => (catalog() && catalog().colony) || {};
    const needRates = () => colonyConfig().needs || {};
    const thresholds = () => colonyConfig().thresholds || {};
    const facetNames = () => colonyConfig().facets || [];
    const skillNames = () => colonyConfig().skills || [];
    const huntRadius = () => colonyConfig().huntRadius || 45;
    const recipes = () => (catalog() && catalog().recipes && catalog().recipes.list) || [];
    const recipeOf = id => recipes().find(r => r.id === id) || null;
    const itemType = id => (Items() && typeof Items().type === "function" ? Items().type(id) : ((catalog() && catalog().items && catalog().items.types) || []).find(t => t.id === id) || null);
    const hasTag = (t, tag) => !!t && Array.isArray(t.tags) && t.tags.includes(tag);
    const isFoodType = t => !!t && !!t.food;
    const speciesOfPrey = u => {
        const list = (catalog() && catalog().wildlife && catalog().wildlife.species) || [];
        return list.find(s => s.id === (u && u.data && u.data.species)) || null;
    };

    // Which objects and actions yield an item type: { itemId: [{ objectId, action }] }, from the catalog.
    let sourceCache = null;
    function sourcesOf(itemId) {
        const objects = (catalog() && catalog().objects) || [];
        if (!sourceCache || sourceCache.source !== objects) {
            const map = {};
            for (const o of objects) {
                if (o.build || (o.tags && (o.tags.includes("wall") || o.tags.includes("door") || o.tags.includes("bed") || o.tags.includes("building") || o.tags.includes("furniture")))) continue;
                for (const [action, a] of Object.entries(o.actions || {})) {
                    for (const id of Object.keys(a.yields || {})) (map[id] = map[id] || []).push({ objectId: o.id, action });
                }
            }
            sourceCache = { source: objects, map };
        }
        const list = (sourceCache.map[itemId] || []).slice();
        if (itemId === "wood" && sourceCache.map["log"]) {
            for (const s of sourceCache.map["log"]) if (!list.some(x => x.objectId === s.objectId && x.action === s.action)) list.push(s);
        } else if (itemId === "straw" && sourceCache.map["fiber"]) {
            for (const s of sourceCache.map["fiber"]) if (!list.some(x => x.objectId === s.objectId && x.action === s.action)) list.push(s);
        } else if (itemId === "stone" && sourceCache.map["rocks_small"]) {
            for (const s of sourceCache.map["rocks_small"]) if (!list.some(x => x.objectId === s.objectId && x.action === s.action)) list.push(s);
        }
        return list;
    }
    // Recipes that cook a raw food item (input the raw type, output food, at a workplace).
    const cookRecipeFor = rawType => recipes().find(r => r.inputs && r.inputs[rawType] && r.at && Object.keys(r.outputs || {}).some(id => isFoodType(itemType(id)))) || null;

    //-------------------------------------------------------------------------
    // State: UF.World.state.colony

    let settingUp = false;
    function colonyState(ref) {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.colony && W.state.factions && !settingUp) {
            settingUp = true;
            try { setupColony(W.state); } finally { settingUp = false; }
        }
        const c = W.state.colony || null;
        if (!c || ref === undefined || ref === null) return c;
        if (ref.plan && ref.siteId !== undefined) return ref;
        const u = typeof ref === "number" ? W.unit(ref) : ref;
        if (!u) return null;
        c.settlements = c.settlements || {};
        let site = u.data && u.data.site;
        if (site === undefined && u.data && u.data.faction && W.state && W.state.history && W.state.history.sites) {
            const fSite = W.state.history.sites.find(s => s.faction === u.data.faction && sameLevel(u, s));
            if (fSite) {
                site = fSite.id;
                if (u.data) u.data.site = site;
            }
        }
        let home = (site === undefined || site === c.siteId) ? c : c.settlements[site];
        if (!home && site !== undefined && W.state && W.state.history && W.state.history.sites) {
            const sRec = W.state.history.sites.find(s => s.id === site);
            if (sRec) {
                home = {
                    version: 2,
                    factionId: sRec.faction || (u.data && u.data.faction),
                    siteId: sRec.id,
                    site: { x: sRec.x, y: sRec.y },
                    area: copyArea(sRec.area),
                    z: zOf(sRec),
                    radius: siteRadius(sRec),
                    plan: makePlan(sRec),
                    stockpiles: [],
                    log: []
                };
                c.settlements[site] = home;
            }
        }
        if (home) return sameLevel(u, home) ? home : c;
        if (u.data && u.data.home && u.data.home.area && sameLevel(u, u.data.home)) {
            const key = `home_${u.data.faction || "fac"}_${u.data.home.area.x}_${u.data.home.area.y}_${zOf(u)}`;
            if (!c.settlements[key]) {
                c.settlements[key] = {
                    version: 2,
                    factionId: u.data.faction || c.factionId,
                    siteId: key,
                    site: { x: u.data.home.x || 128, y: u.data.home.y || 128 },
                    area: copyArea(u.data.home.area),
                    z: zOf(u),
                    radius: 8,
                    plan: makePlan({ faction: u.data.faction, species: u.data.species }),
                    stockpiles: [],
                    log: []
                };
            }
            return c.settlements[key];
        }
        return c;
    }
    const settlementStates = () => {
        const c = colonyState();
        return c ? [c, ...Object.values(c.settlements || {})] : [];
    };
    const siteColonists = ref => {
        const c = colonyState(ref);
        return c ? simulationUnits().filter(u => colonyState(u) === c) : [];
    };
    const factionId = () => (colonyState() ? colonyState().factionId : (window.UF.Factions ? UF.Factions.playerId() : null));
    const isColonist = u => !!u && !!u.data && (u.data.kind === "colonist" || (u.data.founder && u.data.faction === factionId())) && u.data.faction === factionId();
    const isSettler = u => !!(u && u.data && !u.data.manual && u.data.ai !== "manual" && (!u.name || !u.name.startsWith("TEST_"))) && (isColonist(u) || !!(u && u.data && (u.data.kind === "person" || u.data.kind === "colonist") && (u.data.ai === "settlement" || u.data.founder)));
    const isFactionPerson = u => !!(u && u.data && (u.data.kind === "colonist" || u.data.kind === "person") && u.data.faction && !u.data.dead && !u.data._isDying);
    let allFactionPeopleCache = null;
    let allFactionPeopleCacheTick = -1;
    const allFactionPeople = () => {
        const t = (window.UF && UF.Time && UF.Time.Engine) ? UF.Time.Engine.ticks : localTicks;
        if (allFactionPeopleCache && allFactionPeopleCacheTick === t) return allFactionPeopleCache;
        allFactionPeopleCache = World() ? World().units().filter(isFactionPerson) : [];
        allFactionPeopleCacheTick = t;
        return allFactionPeopleCache;
    };
    let simUnitsCache = null;
    let simUnitsCacheTick = -1;
    const simulationUnits = () => {
        const t = (window.UF && UF.Time && UF.Time.Engine) ? UF.Time.Engine.ticks : localTicks;
        if (simUnitsCache && simUnitsCacheTick === t) return simUnitsCache;
        simUnitsCache = World() ? World().units().filter(isSettler) : [];
        simUnitsCacheTick = t;
        return simUnitsCache;
    };
    const settler = id => { const u = World() ? World().unit(id) : null; return isSettler(u) ? u : null; };
    let colonistsCache = null;
    let colonistsCacheTick = -1;
    const colonists = () => {
        const t = (window.UF && UF.Time && UF.Time.Engine) ? UF.Time.Engine.ticks : localTicks;
        if (colonistsCache && colonistsCacheTick === t) return colonistsCache;
        colonistsCache = World() ? World().units().filter(isColonist) : [];
        colonistsCacheTick = t;
        return colonistsCache;
    };
    const colonist = id => {
        const u = World() ? World().unit(id) : null;
        return isColonist(u) ? u : null;
    };
    const siteArea = ref => levelArea(colonyState(ref));
    const homeSiteRecord = ref => (colonyState(ref) && window.UF.History && UF.History.siteById ? UF.History.siteById(colonyState(ref).siteId) : null);
    const cultureOf = ref => {
        const cstate = colonyState(ref);
        const id = ref && ref.data ? ref.data.faction : ref && ref.faction ? ref.faction : cstate ? cstate.factionId : factionId();
        const F = window.UF.Factions ? UF.Factions.get(id) : null;
        const c = catalog() && catalog().cultures;
        return (F && c && c[F.species]) || { priorities: {}, facetBias: {}, plan: "default" };
    };
    const priorityOf = (type, ref) => {
        const p = cultureOf(ref).priorities || {};
        let mult = typeof p[type] === "number" ? p[type] : 1;
        if (window.UF && UF.Goals && UF.Goals.priorities) {
            const gp = UF.Goals.priorities(ref);
            if (gp && typeof gp[type] === "number") mult *= gp[type];
        }
        return mult;
    };

    // Extension steps remain owned by their persistent household/goal/civic records. They are not copied into the
    // fixed bootstrap plan, and workers cooperatively share housing, paths, town square, and personal aspirations.
    // -----------------------------------------------------------------------
    // Standing orders: continuous production that keeps workshops busy after
    // the bootstrap plan's fixed quotas are met.  Each order defines a minimum
    // stock level; when the colony's count drops below that, a virtual craft
    // step is injected into the effective plan.
    // -----------------------------------------------------------------------
    const STANDING_ORDERS = [
        // Survival basics — always keep a buffer
        { id: "so_meat",      craft: "cook_meat",    min: 6,  per: 4, stock: ["food"], hunt: true },
        { id: "so_firewood",  craft: "split_firewood", min: 8, per: 0, needs: "stone_axe" },
        // Intermediate materials — process raw inputs as they arrive
        { id: "so_charcoal",  craft: "charcoal",     min: 4,  per: 0, needs: "furnace" },
        { id: "so_bar_iron",  craft: "bar_iron",     min: 4,  per: 0, needs: "furnace" },
        { id: "so_bar_copper",craft: "bar_copper",   min: 2,  per: 0, needs: "furnace" },
        { id: "so_leather",   craft: "leather",      min: 4,  per: 0, needs: "tanning_rack" },
        { id: "so_planks",    craft: "plane_planks", min: 4,  per: 0, needs: "workbench" },
        { id: "so_hardware",  craft: "forge_hardware", min: 4, per: 0, needs: "smithy" },
        // Military consumables — keep stocked
        { id: "so_arrows",    craft: "arrows_stone", min: 24, per: 0, needs: "fletcher_bench" },
        // Armament — 1 per 4 adult colonists
        { id: "so_swords",    craft: "sword_short",  min: 0,  per: 4, needs: "smithy" },
        { id: "so_bows",      craft: "bow_short",    min: 0,  per: 4, needs: "bowyer_bench" },
        { id: "so_armor_l",   craft: "armor_leather",min: 0,  per: 4, needs: "workbench" },
        { id: "so_helmet_l",  craft: "helmet_leather",min: 0, per: 4, needs: "workbench" },
        // Building materials
        { id: "so_bricks",    craft: "fire_brick",   min: 4,  per: 0, needs: "pottery_kiln" },
        { id: "so_mortar",    craft: "lime_mortar",  min: 4,  per: 0, needs: "pottery_kiln" },
        { id: "so_blocks",    craft: "chisel_stone_block", min: 4, per: 0, needs: "mason_bench" },
    ];

    function standingOrders(ref) {
        const c = colonyState(ref);
        if (!c || !c.site) return [];
        const O = Objects();
        if (!O) return [];
        const adults = siteColonists(ref).filter(u => u.data && (u.data.age === undefined || u.data.age >= 15));
        const pop = adults.length;
        const area = levelArea(c);
        const steps = [];

        for (const order of STANDING_ORDERS) {
            // Check prerequisites: the workshop must exist at the colony
            if (order.needs) {
                const ws = O.findIn(area, { near: { x: c.site.x, y: c.site.y }, radius: c.radius + 6, kind: order.needs });
                if (!ws || ws.length === 0) continue;
            }
            const r = recipeOf(order.craft);
            if (!r) continue;
            const outKey = outputOf(r);
            if (!outKey) continue;

            // Calculate target: fixed minimum + per-capita scaling
            const target = order.min + (order.per > 0 ? Math.ceil(pop / order.per) : 0);
            const have = colonyCount(outKey, ref);
            if (have >= target) continue;

            // Check if raw inputs are available (don't schedule impossible crafts)
            const inputs = r.inputs || {};
            let canCraft = true;
            for (const [inp, qty] of Object.entries(inputs)) {
                if (colonyCount(inp, ref) < qty) { canCraft = false; break; }
            }
            if (!canCraft) continue;

            const need = target - have;
            if (order.stock) {
                steps.push({ id: order.id, stock: order.stock, count: need, hunt: !!order.hunt, standing: true });
            } else {
                steps.push({ id: order.id, craft: order.craft, count: need, standing: true });
            }
        }
        return steps;
    }

    // -----------------------------------------------------------------------
    // Population milestones: new plan steps that unlock as the colony grows.
    // Each milestone adds build/craft goals when the colony reaches a
    // population threshold and the prerequisite isn't already placed.
    // -----------------------------------------------------------------------
    const POP_MILESTONES = [
        // Pop 12+: pottery kiln, mason's bench
        { pop: 12, steps: [
            { id: "ms_kiln",   build: "pottery_kiln", cells: [[6, 3]], milestone: true },
            { id: "ms_mason",  build: "mason_bench",  cells: [[7, 3]], milestone: true },
        ]},
        // Pop 20+: additional workshops
        { pop: 20, steps: [
            { id: "ms_kitchen", build: "kitchen_hearth", cells: [[5, 4]], milestone: true },
            { id: "ms_dining",  build: "dining_table",   cells: [[5, 5]], milestone: true },
        ]},
        // Pop 30+: defensive structures
        { pop: 30, steps: [
            { id: "ms_gate_door", build: "door_iron", cells: [[0, -5]], milestone: true },
        ]},
    ];

    function populationMilestoneSteps(ref) {
        const c = colonyState(ref);
        if (!c || !c.site) return [];
        const pop = siteColonists(ref).filter(u => u.data && (u.data.age === undefined || u.data.age >= 15)).length;
        const O = Objects();
        if (!O) return [];
        const area = levelArea(c);
        const steps = [];

        for (const m of POP_MILESTONES) {
            if (pop < m.pop) continue;
            for (const s of m.steps) {
                // Skip if the object already exists near the colony
                const existing = O.findIn(area, { near: { x: c.site.x, y: c.site.y }, radius: c.radius + 6, kind: s.build });
                if (existing && existing.length > 0) continue;
                steps.push(s);
            }
        }
        return steps;
    }

    function autonomousStorageSteps(ref) {
        const c = colonyState(ref);
        if (!c || !c.site) return [];
        const C = window.UF && UF.Containers, O = Objects(), I = Items();
        if (!C || !O || !I) return [];
        const area = levelArea(c), z = zOf(c);
        const workers = siteColonists(ref);
        if (!workers.length) return [];

        const loose = groundItemsNear(workers[0], { radius: c.radius + 6 }).filter(f => !onBuildCell(f.x, f.y, workers[0], f.item.type));
        const containers = C.all(area, z);

        let needContainer = false;
        if (containers.length === 0) {
            // As society, always build at least one communal storage chest at the Town Center!
            needContainer = true;
        } else if (containers.length > 0) {
            const allFull = containers.every(cont => C.slotsUsed(cont.id) >= cont.maxSlots * 0.8 || C.currentWeight(cont.id) >= cont.maxWeight * 0.8);
            if (allFull && loose.length >= 6) {
                needContainer = true;
            }
        }

        if (!needContainer) return [];

        const chestType = O.type("chest_wood") ? "chest_wood" : (O.type("crate_wood") ? "crate_wood" : null);
        if (!chestType) return [];

        // 1. Primary communal chest location: inside Town Center at [-1, 2]
        const primaryX = c.site.x - 1, primaryY = c.site.y + 2;
        if (!O.at(area, primaryX, primaryY) && !C.at(area, primaryX, primaryY, z)) {
            return [{
                id: "communal_chest",
                build: chestType,
                cells: [[-1, 2]],
                exact: true,
                autoStorage: true,
                society: "chest"
            }];
        }

        // 2. Secondary placement in Town Center perimeter
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
                const wx = c.site.x + dx, wy = c.site.y + dy;
                if (O.at(area, wx, wy) || C.at(area, wx, wy, z)) continue;
                return [{
                    id: `auto_storage_${wx}_${wy}`,
                    build: chestType,
                    cells: [[dx, dy]],
                    exact: true,
                    autoStorage: true
                }];
            }
        }
        return [];
    }

    function effectivePlan(ref) {
        const c = colonyState(ref);
        if (!c) return [];
        const W = World(), u = typeof ref === "number" ? W.unit(ref) : ref && ref.data ? ref : siteColonists(c)[0];
        if (u && u._cachedEffectivePlanTick === localTicks && u._cachedEffectivePlan) return u._cachedEffectivePlan;
        const H = window.UF && UF.Households, G = window.UF && UF.Goals;

        let basePlan = c._cachedBasePlan;
        if (!basePlan || c._cachedBasePlanInvalidatedAt !== planInvalidatedAt || (localTicks - (c._cachedBasePlanTick || 0) >= 30)) {
            // Cooperative settlement construction: prioritize the active focal household so all villagers unite on finishing it!
            // No colonist starts a secondary private home until the focal home is completely built and sheltered.
            const focal = H && H.activeFocalHousehold ? H.activeFocalHousehold(c) : null;
            const cooperativeHomeSteps = [];
            if (focal && H && H.planSteps) {
                const focalPeople = H.members ? H.members(focal) : [];
                const focalRep = focalPeople.find(p => p.data && p.data.age >= 15) || focalPeople[0] || u;
                if (focalRep) {
                    const fSteps = H.planSteps(focalRep);
                    for (const s of fSteps) {
                        if (s) cooperativeHomeSteps.push(s);
                    }
                }
            }

            // Civic infrastructure: Town Square plaza and paths connecting to households
            const civicSteps = [];
            const households = (H && H.all) ? H.all().filter(h => sameLevel(h, c)) : [];
            if (households.length > 0) {
                civicSteps.push({
                    id: "town_square_plaza",
                    build: "road",
                    cells: [[-1,-1], [0,-1], [1,-1], [-1,0], [1,0], [-1,1], [0,1], [1,1]],
                    exact: true
                });
                for (const h of households) {
                    // Only build paths to homes that are sheltered or occupied
                    const targetHome = (h.privateHomestead && !h.isMovedIn) ? h.privateHomestead : h.home;
                    const isSheltered = H && H.isSheltered ? H.isSheltered(h) : false;
                    if (targetHome && targetHome.entrance && (isSheltered || h.isMovedIn)) {
                        const ex = targetHome.entrance.x - c.site.x;
                        const ey = targetHome.entrance.y - c.site.y;
                        const pathCells = [];
                        let px = 0, py = 0;
                        const dx = Math.sign(ex), dy = Math.sign(ey);
                        while (px !== ex || py !== ey) {
                            if (px !== ex) px += dx;
                            if (py !== ey) py += dy;
                            if (Math.abs(px) > 1 || Math.abs(py) > 1) pathCells.push([px, py]);
                        }
                        if (pathCells.length) civicSteps.push({ id: `path_${h.id}`, build: "road", cells: pathCells, exact: true });
                    }
                }
            }

            const soSteps = standingOrders(ref);
            const msSteps = populationMilestoneSteps(ref);
            const storageSteps = autonomousStorageSteps(ref);
            basePlan = [ ...societyPlan(c), ...storageSteps, ...cooperativeHomeSteps, ...civicSteps, ...soSteps, ...msSteps ];
            c._cachedBasePlan = basePlan;
            c._cachedBasePlanTick = localTicks;
            c._cachedBasePlanInvalidatedAt = planInvalidatedAt;
        }

        const goalSteps = (u && G && G.planSteps) ? G.planSteps(u) : [];
        const P = Pillars();
        const pillarSteps = (c && P && P.pillarPlanSteps) ? P.pillarPlanSteps(c, u) : [];
        const extra = u ? [ ...basePlan, ...pillarSteps, ...goalSteps ] : basePlan;
        const seen = new Set();
        const res = extra.filter(s => s && s.id && (!s.goalOwner || (u && s.goalOwner === u.id)) &&
            !seen.has(s.id) && (seen.add(s.id), true));
        if (u) {
            u._cachedEffectivePlan = res;
            u._cachedEffectivePlanTick = localTicks;
        }
        return res;
    }

    //-------------------------------------------------------------------------
    // Names, facets, skills (pure functions of the seed and the unit id)

    function nameFor(worldSeed, unitId, gender, taken) {
        const n = ((catalog() && catalog().start) || {}).names || { start: ["al"], male: ["an"], female: ["a"] };
        const rand = mulberry32(hash32(worldSeed, SALT.name, unitId));
        const pick = arr => arr[Math.floor(rand() * arr.length)];
        const ends = gender === "female" ? n.female : n.male;
        for (let i = 0; i < 20; i++) {
            const s = capitalize(pick(n.start) + (i > 0 ? pick(n.start) : "") + pick(ends));
            if (!taken || !taken.has(s)) return s;
        }
        return capitalize(pick(n.start) + pick(ends)) + unitId;
    }
    const genderFor = (worldSeed, unitId) => (unit01(worldSeed, SALT.gender, unitId) < 0.5 ? "male" : "female");
    function facetsFor(worldSeed, unitId, bias) {
        const out = {};
        facetNames().forEach((name, i) => {
            out[name] = clamp(Math.floor(unit01(worldSeed, SALT.facet, unitId, i) * 101) + ((bias && bias[name]) | 0), 0, 100);
        });
        return out;
    }
    function skillsFor(worldSeed, unitId) {
        const out = {};
        skillNames().forEach((name, i) => { out[name] = Math.floor(unit01(worldSeed, SALT.skill, unitId, i) * 6); });
        return out;
    }
    const facet = (u, name) => ((u.data.facets && typeof u.data.facets[name] === "number") ? u.data.facets[name] : 50);

    //-------------------------------------------------------------------------
    // Thoughts and mood

    function moodOf(score) {
        for (const [min, label] of MOODS) if (score >= min) return label;
        return "Miserable";
    }
    function addThought(unit, text, strength) {
        if (!unit || !unit.data || !text) return null;
        unit.data.thoughts = unit.data.thoughts || [];
        const score = typeof strength === "number" ? strength : 0;
        const entry = { text, score, ticks: (window.UF && UF.Time && UF.Time.Engine) ? UF.Time.Engine.ticks : 0 };
        unit.data.thoughts.unshift(entry);
        if (unit.data.thoughts.length > 20) unit.data.thoughts.pop();
        return entry;
    }

    //-------------------------------------------------------------------------
    // Internal Barter & Credit Ledger
    // Producers (woodcutters, miners, farmers) earn credit delivering raw materials,
    // specialists craft finished tools/gear, and colonists trade within the settlement.

    function colonistLedger(unit) {
        if (!unit || !unit.data) return { credits: 0, earned: 0, spent: 0 };
        if (!unit.data.ledger) {
            unit.data.ledger = { credits: 10, earned: 0, spent: 0 };
        }
        return unit.data.ledger;
    }
    function awardCredits(unit, amount, reason) {
        const ledger = colonistLedger(unit);
        ledger.credits = (ledger.credits || 0) + amount;
        ledger.earned = (ledger.earned || 0) + amount;
        emit("colonists:creditEarned", unit, amount, reason);
        return ledger.credits;
    }
    function spendCredits(unit, amount, reason) {
        const ledger = colonistLedger(unit);
        if (ledger.credits < amount) return false;
        ledger.credits -= amount;
        ledger.spent = (ledger.spent || 0) + amount;
        emit("colonists:creditSpent", unit, amount, reason);
        return true;
    }

    //-------------------------------------------------------------------------
    // Clothing tiers

    function setTier(unit, tier) {
        if (!unit || !unit.data) return false;
        unit.data.tier = Math.max(0, tier | 0);
        const tiers = unit.data.tiers;
        if (Array.isArray(tiers) && tiers.length) {
            const sheet = tiers[Math.min(unit.data.tier, tiers.length - 1)];
            if (sheet && unit.image.characterName !== sheet) {
                unit.image.characterName = sheet;
                unit.image.characterIndex = 0;
                World().refreshUnitImage(unit.id);
            }
        }
        if (window.UF && UF.Generator && typeof UF.Generator.syncEquipmentToPortrait === "function") {
            UF.Generator.syncEquipmentToPortrait(unit);
        }
        emit("colonists:tier", unit, unit.data.tier);
        return true;
    }
    function variationFor(worldSeed, unitId, mother, father) {
        const roll = unit01(worldSeed, SALT.roll, unitId);
        const mVar = mother && mother.data && mother.data.variation ? mother.data.variation | 0 : null;
        const fVar = father && father.data && father.data.variation ? father.data.variation | 0 : null;
        if (mVar && fVar) {
            if (roll < 0.45) return mVar;
            if (roll < 0.90) return fVar;
            return 1 + Math.floor(unit01(worldSeed, SALT.facet, unitId) * 6);
        }
        if (mVar) {
            if (roll < 0.70) return mVar;
            return 1 + Math.floor(unit01(worldSeed, SALT.facet, unitId) * 6);
        }
        if (fVar) {
            if (roll < 0.70) return fVar;
            return 1 + Math.floor(unit01(worldSeed, SALT.facet, unitId) * 6);
        }
        return 1 + Math.floor(roll * 6);
    }

    function tiersFor(species, gender, variation = 1, genetics = null, stage = "adult") {
        if (species !== "human") return null;
        const G = Generator();
        if (G && typeof G.specFor === "function" && genetics) {
            return [0, 1, 2, 3].map(t => G.specFor(seed(), 0, gender, stage, genetics, t).charsetName);
        }
        const v = Math.max(1, Math.min(6, variation | 0 || 1));
        const prefix = gender === "female" ? "$UF_Human_Female" : "$UF_Human_Male";
        const walkSheet = `${prefix}_${v}_Walk`;
        return [walkSheet, walkSheet, walkSheet, walkSheet];
    }

    //-------------------------------------------------------------------------
    // The colony: conversion on world:created

    function homeSiteFor(state, playerId) {
        const H = window.UF.History;
        if (!H || !state.history) return null;
        const protectedSite = H.homeSite ? H.homeSite() : null;
        if (protectedSite && protectedSite.faction === playerId) return protectedSite;
        const founders = state.history.founders && state.history.founders[playerId];
        if (founders && founders.site) {
            const fs = state.history.sites.find(s => s.id === founders.site && !s.ruined);
            if (fs) return fs;
        }
        const mid = Math.floor(state.size / 2);
        const mine = state.history.sites.filter(s => s.faction === playerId && !s.ruined && sameArea(s.area, state.startArea));
        mine.sort((a, b) => Math.hypot(a.x - mid, a.y - mid) - Math.hypot(b.x - mid, b.y - mid));
        if (mine[0]) return mine[0];
        const anyMine = state.history.sites.filter(s => s.faction === playerId && !s.ruined);
        anyMine.sort((a, b) => Math.hypot(a.x - mid, a.y - mid) - Math.hypot(b.x - mid, b.y - mid));
        if (anyMine[0]) return anyMine[0];
        if (state.history.homeSiteId) {
            const hs = state.history.sites.find(s => s.id === state.history.homeSiteId && !s.ruined);
            if (hs) return hs;
        }
        return state.history.sites.find(s => !s.ruined) || null;
    }
    function siteRadius(site) {
        const kinds = (catalog() && catalog().sites && catalog().sites.kinds) || {};
        return (site && kinds[site.kind] && kinds[site.kind].radius) || 4;
    }
    function planTemplate(ref) {
        const cfg = colonyConfig();
        const key = cultureOf(ref).plan || "default";
        const variant = key !== "default" && cfg.plans && Array.isArray(cfg.plans[key]) ? cfg.plans[key] : null;
        return variant || cfg.plan || [];
    }
    function makePlan(ref) {
        const wall = cultureOf(ref).wall;
        const door = cultureOf(ref).door;
        return planTemplate(ref).map(step => {
            const s = JSON.parse(JSON.stringify(step));
            if (s.build && wall && (s.build === "wall_wood" || s.build === "wall_stone") && Objects() && Objects().typeId(wall)) s.build = wall;
            if (s.build && door && (s.build === "door_wood" || s.build === "door_stone" || s.build === "door") && Objects() && Objects().typeId(door)) s.build = door;
            s.done = false;
            return s;
        });
    }
    // DEUS_Projects is the single source of settlement construction intent (DEUS-TSK-FABLE-03): while it is loaded
    // and enabled, the society plan's shelter, door, beds and chest steps are left to it. The plan record in the
    // save is untouched; only what the colonists read as their plan changes.
    const projectsManaged = () => !!(window.UF && UF.Projects && typeof UF.Projects.active === "function" &&
        (typeof UF.Projects.isEnabled !== "function" || UF.Projects.isEnabled()));
    const projectOwnedStep = s => !!s && (PROJECT_OWNED_STEPS.includes(s.society) || PROJECT_OWNED_STEPS.includes(s.id));
    const societyPlan = c => (c && Array.isArray(c.plan) ? (projectsManaged() ? c.plan.filter(s => !projectOwnedStep(s)) : c.plan) : []);

    function getCallings() {
        if (typeof window !== "undefined" && window.UF && window.UF.Callings) return window.UF.Callings;
        if (typeof global !== "undefined" && global.UF && global.UF.Callings) return global.UF.Callings;
        if (typeof require === "function") {
            try { return require("./UF_Callings.js"); } catch (_) {
                try { return require("./js/plugins/UF_Callings.js"); } catch (_) {
                    try { return require("./game/js/plugins/UF_Callings.js"); } catch (_) {}
                }
            }
        }
        return null;
    }

    function geneticsFor(worldSeed, unitId, mother, father, variation) {
        const v = variation || 1;
        const mGen = mother && mother.data && mother.data.genetics ? mother.data.genetics : null;
        const fGen = father && father.data && father.data.genetics ? father.data.genetics : null;
        const roll = unit01(worldSeed, SALT.facet, unitId);
        const skinTone = mGen && fGen ? (roll < 0.5 ? mGen.skinTone : fGen.skinTone) : ((Math.abs(unitId | 0) % 3) + 1);
        const hairColors = ["brown", "blonde", "black", "red"];
        const hairColor = mGen && fGen ? (roll < 0.45 ? mGen.hairColor : (roll < 0.90 ? fGen.hairColor : hairColors[Math.floor(roll * 4)])) : hairColors[(Math.abs(unitId | 0)) % 4];
        const hairStyle = 1 + (Math.abs(unitId | 0) % 4);
        const beard = Math.abs(unitId | 0) % 4; // 0: none, 1: goatee, 2: full, 3: braided
        const clothing = 1 + ((Math.abs(unitId | 0) + 1) % 4);
        return {
            variation: v,
            skinTone,
            hairColor,
            hairStyle,
            beard,
            clothing
        };
    }

    function convertPerson(u, state, site, taken) {
        const d = u.data;
        const player = site.faction === state.factions.playerId;
        const gender = d.gender || genderFor(state.seed, u.id);
        const name = !player && u.name ? u.name : nameFor(state.seed, u.id, gender, taken);
        taken.add(name);
        u.name = name;
        d.kind = player ? "colonist" : "person";
        d.ai = null;
        d.faction = site.faction;
        d.sight = 8;
        d.gender = gender;
        d.tier = 0;
        if (d.founder === undefined) d.founder = true;
        const W = World();
        const mother = d.motherId && W ? W.unit(d.motherId) : null;
        const father = d.fatherId && W ? W.unit(d.fatherId) : null;
        if (d.age === undefined) {
            d.age = 18 + Math.floor(unit01(state.seed, 0xa9e, u.id, 0) * 22);
            d.ageSeconds = 0;
            d.stage = d.stage || (d.age >= 55 ? "elder" : "adult");
        } else if (!d.stage) {
            d.stage = d.age >= 55 ? "elder" : (d.age < 12 ? "child" : (d.age < 15 ? "teen" : "adult"));
        }
        if (!d.variation) {
            d.variation = variationFor(state.seed, u.id, mother, father);
        }
        if (!d.genetics) {
            d.genetics = geneticsFor(state.seed, u.id, mother, father, d.variation);
        }
        updateAgeAppearance(u);
        const tiers = tiersFor(d.species, gender, d.variation, d.genetics, d.stage);
        if (tiers) {
            d.tiers = tiers;
            if (!u.image || !u.image.characterName || !u.image.characterName.startsWith("$gen_")) {
                u.image = { characterName: tiers[d.tier | 0], characterIndex: 0 };
            }
            delete d.tint; // the authentic pixel sheets are drawn as they are
            if (W && typeof W.refreshUnitImage === "function") W.refreshUnitImage(u.id);
        }
        if (!d.callings || d.callings.length < 3) {
            const Callings = getCallings();
            if (Callings && Callings.assignCallings) {
                const pop = factionPopulation(d.faction);
                Callings.assignCallings(u, pop);
            }
        }
        d.inventory = d.inventory || [];
        d.equipment = d.equipment || { tool: null, clothes: null };
        if (d.workRate === undefined) d.workRate = 1;
        d.jobsDone = d.jobsDone || {};
        d.site = site.id;
        d.home = { area: copyArea(site.area), x: site.x, y: site.y, z: zOf(site) };
        return u;
    }

    function setupColony(state) {
        const W = World();
        if (!W || !state || !state.factions) return null;
        const playerId = state.factions.playerId;
        const site = homeSiteFor(state, playerId);
        if (!site) {
            console.warn("UF_Colonists: the player's faction has no home site; no colonists made");
            return null;
        }
        const taken = new Set(), people = [];
        const F = state.factions.list.find(f => f.id === playerId);
        const people2 = (catalog() && catalog().people && F && catalog().people[F.species]) || null;
        const sites = [site, ...state.history.sites.filter(s => s.id !== site.id && !s.ruined)];
        let primary = null;
        for (const local of sites) {
            if (!levelSupported(zOf(local))) continue;
            const radius = siteRadius(local);
            const residents = W.units().filter(u => u.data && (u.data.kind === "person" || u.data.kind === "colonist") && u.data.faction === local.faction && sameLevel(u, local)
                && (u.data.site === local.id || (u.data.site === undefined && chebyshev(u.x, u.y, local.x, local.y) <= radius + 2)));
            for (const u of residents) convertPerson(u, state, local, taken);
            const founders = residents.filter(u => u.data && u.data.founder);
            if (founders.length >= 2) {
                const Callings = getCallings();
                if (Callings && typeof Callings.assignFounderQuotas === "function") {
                    Callings.assignFounderQuotas(founders);
                }
            }
            // Preserve the legacy primary-site fallback, without increasing a valid two-settlement founder budget.
            while (local.id === site.id && residents.length < 2 && people2 && people2.images && people2.images.length) {
                const cell = freeCellNear(levelArea(local), local.x, local.y, 3);
                if (!cell) break;
                const u = W.addUnit({ name: "", image: { characterName: people2.images[residents.length % people2.images.length], characterIndex: 0 },
                    area: copyArea(local.area), z: zOf(local), x: cell.x, y: cell.y, dir: 2,
                    data: { kind: "person", faction: playerId, species: F.species, tint: people2.tint, site: local.id } });
                convertPerson(u, state, local, taken);
                residents.push(u);
            }
            if (local.faction === playerId) people.push(...residents);
            const record = {
                version: 2, factionId: local.faction, siteId: local.id,
                site: { x: local.x, y: local.y }, area: copyArea(local.area), z: zOf(local), radius,
                plan: makePlan(local), stockpiles: [],
                log: [{ tick: 0, text: `${residents.length} colonists at ${local.name}` }]
            };
            if (!primary) {
                primary = record;
                primary.settlements = {};
            } else primary.settlements[local.id] = record;
        }
        state.colony = primary;
        if (primary) {
            primary.settlementsReady = true;
            const P = Pillars();
            if (P && P.assignSkillRoster) {
                for (const s of settlementStates()) P.assignSkillRoster(s);
            }
        }
        emit("colonists:ready", state.colony, people);
        return state.colony;
    }

    // Add settlement simulation to an existing save without rebuilding its primary plan or moving/replacing units.
    function ensureSettlementActors() {
        const W = World(), primary = colonyState();
        if (!W || !primary || !W.state.history) return;
        if (primary.settlementsReady && (localTicks % 300 !== 0)) return;
        primary.settlements = primary.settlements || {};
        const allUnits = W.units();
        const taken = new Set(allUnits.map(u => u.name));

        // Group eligible units in a single O(U) pass instead of O(S * U) filters per site
        const bySite = new Map();
        const byFactionLevel = new Map();
        for (let i = 0; i < allUnits.length; i++) {
            const u = allUnits[i];
            if (!u || !u.data) continue;
            const k = u.data.kind;
            if (k !== "person" && k !== "colonist") continue;
            if (u.data.manual || u.data.ai === "manual") continue;
            if (u.name && u.name.startsWith("TEST_")) continue;

            if (u.data.site) {
                let list = bySite.get(u.data.site);
                if (!list) { list = []; bySite.set(u.data.site, list); }
                list.push(u);
            } else {
                const key = `${u.data.faction}:${zOf(u)}`;
                let list = byFactionLevel.get(key);
                if (!list) { list = []; byFactionLevel.set(key, list); }
                list.push(u);
            }
        }

        for (const site of W.state.history.sites || []) {
            if (site.ruined || !levelSupported(zOf(site))) continue;
            const siteResidents = bySite.get(site.id) || [];
            const flResidents = byFactionLevel.get(`${site.faction}:${zOf(site)}`) || [];
            if (!siteResidents.length && !flResidents.length) continue;
            const residents = siteResidents.length ? siteResidents : flResidents.filter(u => u.data.faction === site.faction);
            if (!residents.length) continue;
            if (site.id !== primary.siteId && !primary.settlements[site.id]) {
                primary.settlements[site.id] = { version: 2, factionId: site.faction, siteId: site.id,
                    site: { x: site.x, y: site.y }, area: copyArea(site.area), z: zOf(site), radius: siteRadius(site),
                    plan: makePlan(site), stockpiles: [], log: [] };
            }
            for (let r = 0; r < residents.length; r++) {
                const u = residents[r];
                if (!u.data.site) u.data.site = site.id;
                if (u.data.kind === "person" && u.data.ai !== "settlement") convertPerson(u, W.state, site, taken);
                if (!u.data.home || !u.data.home.area) u.data.home = { area: copyArea(site.area), x: site.x, y: site.y, z: zOf(site) };
            }
        }
        primary.settlementsReady = true;
    }

    // Stockpiles the site already has: the plan's stockpile steps with `stores` take the nearest free ones.
    function adoptSiteStockpiles(colony, site) {
        const O = Objects();
        if (!O) return;
        const stockId = O.typeId("stockpile");
        if (!stockId) return;
        const found = O.findIn(levelArea(site), { near: { x: site.x, y: site.y }, radius: colony.radius + 1, id: "stockpile" });
        const free = found.slice();
        for (const step of colony.plan) {
            if (!step.build || step.build !== "stockpile" || !Array.isArray(step.stores)) continue;
            for (const [dx, dy] of step.cells || []) {
                const x = site.x + dx, y = site.y + dy;
                let pick = free.findIndex(f => f.x === x && f.y === y);
                if (pick < 0 && free.length) pick = 0;
                if (pick < 0) continue;
                const f = free.splice(pick, 1)[0];
                colony.stockpiles.push({ x: f.x, y: f.y, stores: step.stores.slice(), step: step.id });
            }
        }
        for (const f of free) colony.stockpiles.push({ x: f.x, y: f.y, stores: [] });
    }

    function freeCellNear(area, x, y, r, minR = 1) {
        const J = Jobs();
        for (let d = minR; d <= r; d++) {
            for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
                if (J && J.standable(area, x + dx, y + dy)) {
                    if (typeof J.isWaterAt === "function" && J.isWaterAt(area, x + dx, y + dy)) continue;
                    return { x: x + dx, y: y + dy };
                }
            }
        }
        return null;
    }

    //-------------------------------------------------------------------------
    // Searching the world (all in the colonist's area)

    function gridOf(area) {
        const W = World();
        if (!area || !levelSupported(zOf(area))) return null;
        const view = W.viewLevel ? W.viewLevel() : W.currentArea();
        if (sameLevel(area, view) && window.$dataMap && $dataMap.ufObjects) return $dataMap.ufObjects;
        const map = W.peekArea(area.x, area.y, zOf(area));
        return map ? map.ufObjects : null;
    }
    /** Nearest object around (x, y) whose type passes `pred(type)`: { x, y, type, dist } or null. */
    function scanObjects(area, x, y, radius, pred) {
        const O = Objects(), W = World();
        if (!O || !W) return null;
        const grid = gridOf(area);
        if (!grid) return null;
        const size = W.state.size, list = O.types();
        let best = null;
        const r2 = radius * radius;
        let bestD2 = r2;
        const x0 = Math.max(0, x - radius), x1 = Math.min(size - 1, x + radius), y0 = Math.max(0, y - radius), y1 = Math.min(size - 1, y + radius);
        for (let cy = y0; cy <= y1; cy++) {
            const dy = cy - y;
            const dy2 = dy * dy;
            if (dy2 >= bestD2) continue;
            const rowOffset = cy * size;
            for (let cx = x0; cx <= x1; cx++) {
                const t = grid[rowOffset + cx];
                if (!t) continue;
                const dx = cx - x;
                const d2 = dx * dx + dy2;
                if (d2 >= bestD2) continue;
                const type = list[t - 1];
                if (!type || !pred(type, cx, cy)) continue;
                best = { x: cx, y: cy, type, dist: Math.sqrt(d2) };
                bestD2 = d2;
            }
        }
        return best;
    }
    const yieldsItem = (type, itemId) => Object.entries(type.actions || {}).find(([, a]) => a.yields && a.yields[itemId] > 0) || null;
    const yieldsFood = type => Object.entries(type.actions || {}).find(([, a]) => Object.keys(a.yields || {}).some(id => isFoodType(itemType(id)))) || null;

    /** Nearest object with an action that yields the item: { x, y, type, action } or null. */
    // The home site's own standing pieces (its ring, its walls) are never taken apart for materials.
    function sitePiece(type, x, y, ref) {
        const c = colonyState(ref);
        // Buildings, walls, doors, beds, furniture are products of work, never raw-material sources for autonomous gathering.
        if (hasTag(type, "wall") || hasTag(type, "building") || hasTag(type, "door") || hasTag(type, "bed") || hasTag(type, "furniture") || type.build) return true;
        return !!c && type.passable !== true && chebyshev(x, y, c.site.x, c.site.y) <= c.radius + 1;
    }
    let _claimedTargetsTick = -1;
    const _claimedTargetsMap = new Map();
    function getClaimedTargets() {
        if (_claimedTargetsTick === localTicks) return _claimedTargetsMap;
        _claimedTargetsTick = localTicks;
        _claimedTargetsMap.clear();
        for (const j of activeJobs()) {
            if (!j.target) continue;
            const z = zOf(j.target);
            if (j.type) _claimedTargetsMap.set(`${j.type}:${z}:${j.target.x},${j.target.y}`, j.assigned);
            if (j.type === "move" && j.params && j.params.via && j.params.viaTarget) {
                _claimedTargetsMap.set(`${j.params.via}:${z}:${j.params.viaTarget.x},${j.params.viaTarget.y}`, j.assigned);
            }
        }
        return _claimedTargetsMap;
    }
    function isObjectClaimed(u, x, y, action) {
        const claims = getClaimedTargets();
        const claimant = claims.get(`${action}:${zOf(u)}:${x},${y}`);
        return claimant !== undefined && claimant !== u.id;
    }
    const _sourceNearCache = new Map();
    let _sourceNearCacheTick = -1;
    let _sourceNearCacheInvalidatedAt = -1;
    function objectSourceNear(u, itemId, radius = SEARCH_RADIUS) {
        if (!sourcesOf(itemId).length) return null;
        const rad = Math.min(radius || SEARCH_RADIUS, 36);
        if (_sourceNearCacheInvalidatedAt !== planInvalidatedAt || localTicks - _sourceNearCacheTick >= 60) {
            _sourceNearCache.clear();
            _sourceNearCacheTick = localTicks;
            _sourceNearCacheInvalidatedAt = planInvalidatedAt;
        }
        const key = `${itemId}_${Math.floor(u.x / 8)}_${Math.floor(u.y / 8)}_${rad}`;
        if (_sourceNearCache.has(key)) return _sourceNearCache.get(key);

        const f = scanObjects(levelArea(u), u.x, u.y, rad, (t, x, y) => {
            const act = yieldsItem(t, itemId);
            return !!act && !sitePiece(t, x, y, u) && !isObjectClaimed(u, x, y, act[0]);
        });
        const res = f ? Object.assign(f, { action: yieldsItem(f.type, itemId)[0] }) : null;
        _sourceNearCache.set(key, res);
        return res;
    }
    function foodObjectNear(u, radius = SEARCH_RADIUS) {
        const rad = Math.min(radius || SEARCH_RADIUS, 36);
        if (_sourceNearCacheInvalidatedAt !== planInvalidatedAt || localTicks - _sourceNearCacheTick >= 60) {
            _sourceNearCache.clear();
            _sourceNearCacheTick = localTicks;
            _sourceNearCacheInvalidatedAt = planInvalidatedAt;
        }
        const key = `food_${Math.floor(u.x / 8)}_${Math.floor(u.y / 8)}_${rad}`;
        if (_sourceNearCache.has(key)) return _sourceNearCache.get(key);

        const f = scanObjects(levelArea(u), u.x, u.y, rad, (t, x, y) => {
            const act = yieldsFood(t);
            return !!act && !sitePiece(t, x, y, u) && !isObjectClaimed(u, x, y, act[0]);
        });
        const res = f ? Object.assign(f, { action: yieldsFood(f.type)[0] }) : null;
        _sourceNearCache.set(key, res);
        return res;
    }
    // The colony's own hearth: the fire object at the home site. Cooking and sleeping by the fire happen there,
    // never at some other faction's hearth that happens to be nearer after a long chase.
    function homeFire(ref) {
        const O = Objects(), c = colonyState(ref);
        if (!O || !c) return null;
        const h = UF.Households && UF.Households.of(ref);
        if (h && h.home && sameLevel(h, c)) {
            const p = h.home.hearth, own = O.atIn(levelArea(h), p.x, p.y);
            if (hasTag(own, "fire")) return { area: copyArea(h.area), z: zOf(h), x: p.x, y: p.y, type: own, id: own.id };
        }
        const radius = Math.max((c.radius || 6) + 2, 40);
        const f = O.findIn(levelArea(c), { near: { x: c.site.x, y: c.site.y }, radius, tags: ["fire"], limit: 1 });
        return f[0] ? Object.assign({ area: copyArea(c.area), z: zOf(c) }, f[0]) : null;
    }
    const fireNear = u => !!homeFire(u) && !!colonyState(u);
    const nearestFire = u => homeFire(u);
    // The spec that gets a recipe cooked at home: the craft itself when the hearth is within UF_Jobs' workplace
    // search, else a walk to it first (the same decision follows from there).
    function cookSpec(u, recipeId, plan) {
        const f = homeFire(u);
        if (!f) return null;
        if (Math.hypot(f.x - u.x, f.y - u.y) > FIRE_RADIUS - 4) {
            const cell = freeCellNear(levelArea(u), f.x, f.y, 3);
            return cell ? { type: "move", target: cell, params: { via: "craft", viaTarget: { x: f.x, y: f.y } } } : null;
        }
        return { type: "craft", target: { x: f.x, y: f.y }, params: plan ? { recipeId, plan } : { recipeId } };
    }
    // Nearest water cell that has a standable land neighbor, spiralling out from the colonist.
    function waterNear(u, radius) {
        const J = Jobs();
        if (!J) return null;
        for (let r = 1; r <= radius; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const x = u.x + dx, y = u.y + dy;
                    if (!J.isWaterAt(levelArea(u), x, y)) continue;
                    if (NEIGHBORS.some(([nx, ny]) => J.standable(levelArea(u), x + nx, y + ny, u.id))) return { x, y };
                }
            }
        }
        return null;
    }
    const stockpilesStoring = (tag, ref) => (colonyState(ref) ? colonyState(ref).stockpiles.filter(s => !tag || (s.stores || []).includes(tag)) : []);
    const onStockpile = (it, tag, ref) => sameLevel(it, colonyState(ref)) && stockpilesStoring(tag, ref).some(s => s.x === it.x && s.y === it.y);
    function groundItemsNear(u, opts) {
        const I = Items();
        return I ? I.find(Object.assign({}, opts, { near: { x: u.x, y: u.y }, area: levelArea(u), z: zOf(u) })) : [];
    }
    // Items lying on plan build cells are reserved for their buildings if they match the material needed.
    let _buildCellsSet = null;
    let _buildCellsTick = -1;
    function onBuildCell(x, y, ref, itemTypeId) {
        const c = colonyState(ref);
        if (!c) return false;
        if (_buildCellsTick !== localTicks || !_buildCellsSet) {
            _buildCellsTick = localTicks;
            _buildCellsSet = new Map();
            for (const s of societyPlan(c)) {
                if (!s.build || s.done === true) continue;
                const t = stepObject(s);
                const needs = (t && t.build && t.build.items) || {};
                for (const [dx, dy] of s.cells || []) {
                    _buildCellsSet.set(`${c.site.x + dx},${c.site.y + dy}`, needs);
                }
            }
            const households = World().state.households;
            for (const h of Object.values(households && households.byId || {})) {
                if (!h.home || !sameLevel(h, c)) continue;
                const buildings = UF.Households && UF.Households.structures ? UF.Households.structures(h) : [h.home];
                for (const b of buildings) {
                    const wallNeeds = (Objects() && Objects().type(b.wall) && Objects().type(b.wall).build && Objects().type(b.wall).build.items) || { log: 1 };
                    const doorNeeds = (Objects() && Objects().type(b.door) && Objects().type(b.door).build && Objects().type(b.door).build.items) || { log: 1 };
                    if (b.walls) for (const p of b.walls) if (p) _buildCellsSet.set(`${p.x},${p.y}`, wallNeeds);
                    if (b.doors) for (const p of b.doors) if (p) _buildCellsSet.set(`${p.x},${p.y}`, doorNeeds);
                    if (b.beds) for (const p of b.beds) if (p) _buildCellsSet.set(`${p.x},${p.y}`, { straw: 2 });
                    if (b.hearth) _buildCellsSet.set(`${b.hearth.x},${b.hearth.y}`, { stone: 2, wood: 2 });
                    if (b.storage) _buildCellsSet.set(`${b.storage.x},${b.storage.y}`, { wood: 2 });
                }
            }
        }
        const needs = _buildCellsSet.get(`${x},${y}`);
        if (!needs) return false;
        if (!itemTypeId) return true;
        let needCount = needs[itemTypeId] || 0;
        if (itemTypeId === "log") needCount = needCount || (needs["wood"] || 0);
        else if (itemTypeId === "wood") needCount = needCount || (needs["log"] || 0);
        else if (itemTypeId === "fiber") needCount = needCount || (needs["straw"] || 0);
        else if (itemTypeId === "straw") needCount = needCount || (needs["fiber"] || 0);
        else if (itemTypeId === "rocks_small") needCount = needCount || (needs["stone"] || 0);
        else if (itemTypeId === "stone") needCount = needCount || (needs["rocks_small"] || 0);
        if (!needCount) return false;
        const I = Items();
        if (I) {
            let countOnCell = I.count({ area: levelArea(c), z: zOf(c), x, y }, itemTypeId);
            if (itemTypeId === "log") countOnCell += I.count({ area: levelArea(c), z: zOf(c), x, y }, "wood");
            else if (itemTypeId === "wood") countOnCell += I.count({ area: levelArea(c), z: zOf(c), x, y }, "log");
            else if (itemTypeId === "fiber") countOnCell += I.count({ area: levelArea(c), z: zOf(c), x, y }, "straw");
            else if (itemTypeId === "straw") countOnCell += I.count({ area: levelArea(c), z: zOf(c), x, y }, "fiber");
            else if (itemTypeId === "rocks_small") countOnCell += I.count({ area: levelArea(c), z: zOf(c), x, y }, "stone");
            else if (itemTypeId === "stone") countOnCell += I.count({ area: levelArea(c), z: zOf(c), x, y }, "rocks_small");
            if (countOnCell > needCount) return false;
        }
        return true;
    }
    const carriedOf = (u, typeId) => {
        if (!Items()) return [];
        return Items().inventoryOf(u.id).filter(it => {
            if (it.type === typeId) return true;
            if (typeId === "wood" && it.type === "log") return true;
            if (typeId === "log" && it.type === "wood") return true;
            if (typeId === "straw" && it.type === "fiber") return true;
            if (typeId === "fiber" && it.type === "straw") return true;
            if (typeId === "stone" && it.type === "rocks_small") return true;
            if (typeId === "rocks_small" && it.type === "stone") return true;
            return false;
        });
    };
    const carriedCount = (u, typeId) => {
        if (!Items()) return 0;
        let cnt = Items().count(u.id, typeId);
        if (typeId === "wood") cnt += Items().count(u.id, "log");
        else if (typeId === "log") cnt += Items().count(u.id, "wood");
        else if (typeId === "straw") cnt += Items().count(u.id, "fiber");
        else if (typeId === "fiber") cnt += Items().count(u.id, "straw");
        else if (typeId === "stone") cnt += Items().count(u.id, "rocks_small");
        else if (typeId === "rocks_small") cnt += Items().count(u.id, "stone");
        return cnt;
    };
    const equippedItem = (u, slot) => {
        const I = Items();
        const id = u.data.equipment && u.data.equipment[slot];
        const it = id && I && typeof I.get === "function" ? I.get(id) : null;
        return it && it.holder === u.id ? it : null;
    };
    // Nearest prey within radius that nobody else is hunting (predators too for the brave).
    function preyNear(u, radius) {
        const Wl = window.UF.Wildlife, W = World();
        if (!Wl || !Wl.speciesOf) return null;
        const brave = facet(u, "bravery") >= BRAVE;
        let best = null, bestD = Infinity;
        for (const p of W.units()) {
            if (!p.data || p.data.kind !== "creature" || !sameLevel(p, u)) continue;
            const sp = Wl.speciesOf(p);
            if (!sp || !(sp.prey || (brave && sp.kind === "predator"))) continue;
            const d = Math.hypot(p.x - u.x, p.y - u.y);
            if (d > radius || d >= bestD) continue;
            const hunter = Wl.hunterOf ? Wl.hunterOf(p) : null;
            if (hunter && hunter.id !== u.id) continue;
            best = p;
            bestD = d;
        }
        return best;
    }
    function preyYielding(u, itemId, radius) {
        const W = World();
        let best = null, bestD = Infinity;
        for (const p of W.units()) {
            if (!p.data || p.data.kind !== "creature" || !sameLevel(p, u)) continue;
            const sp = speciesOfPrey(p);
            if (!sp || !sp.yields || !(sp.yields[itemId] > 0)) continue;
            const prey = ["grazer", "vermin", "flier"].includes(sp.kind) || (sp.kind === "predator" && facet(u, "bravery") >= BRAVE);
            if (!prey) continue;
            const d = Math.hypot(p.x - u.x, p.y - u.y);
            if (d <= radius && d < bestD) { best = p; bestD = d; }
        }
        return best;
    }

    // The home site's ring: cells at its Chebyshev radius; the openings are the standable ones. A colonist inside
    // that needs to work outside (or the reverse) walks to the nearest opening first: the 200-node pathfinder
    // can't see round a radius-9 wall.
    function ringGap(u, tx, ty) {
        const c = colonyState(u);
        if (!c || !c.radius || !sameLevel(u, c)) return null;
        const kinds = (catalog().sites && catalog().sites.kinds) || {};
        const kind = kinds[(homeSiteRecord(u) || {}).kind];
        if (!kind || !kind.ring) return null;
        const r = c.radius;
        const inside = (x, y) => chebyshev(x, y, c.site.x, c.site.y) < r;
        const from = inside(u.x, u.y), to = inside(tx, ty);
        if (from === to) return null;
        const J = Jobs();
        let best = null, bestD = Infinity;
        for (let i = -r; i <= r; i++) {
            for (const [x, y] of [[c.site.x + i, c.site.y - r], [c.site.x + i, c.site.y + r], [c.site.x - r, c.site.y + i], [c.site.x + r, c.site.y + i]]) {
                if (!J.standable(levelArea(c), x, y, u.id)) continue;
                const d = Math.hypot(x - u.x, y - u.y) + Math.hypot(tx - x, ty - y);
                if (d < bestD) { best = { x, y }; bestD = d; }
            }
        }
        return best;
    }

    //-------------------------------------------------------------------------
    // Giving jobs

    const avoid = new Map(); // `${unitId}:${type}:${x},${y}` -> tick until which it isn't tried again
    const avoidKey = (u, type, x, y) => `${u.id}:${zOf(u)}:${type}:${x},${y}`;
    const decisionAt = new Map(); // unit id -> tick of the last decision
    const pendingDecision = new Set(); // unit ids whose job just ended: they decide on the next map update
    const arrivals = new Map();   // job id -> callback (the Overseer's assignMoveTo)
    const preemptAt = new Map();  // unit id -> tick of the last need interruption (no thrash when the need can't be met)
    const _lastHpCheckAt = new Map(); // unit id -> tick of the last high-priority job preemption check
    let _lastReconcileTick = -Infinity;
    const PREEMPT_EVERY = 600;
    let _activeJobsTick = -1;
    let _activeJobsCache = null;
    function activeJobs() {
        if (_activeJobsTick === localTicks && _activeJobsCache) return _activeJobsCache;
        const J = Jobs();
        _activeJobsTick = localTicks;
        _activeJobsCache = J ? J.list(j => j.state === "travel" || j.state === "work") : [];
        return _activeJobsCache;
    }
    // Someone else already works on this target (or crafts this recipe).
    function claimed(u, type, x, y, params) {
        for (const j of activeJobs()) {
            if (j.assigned === u.id || !j.target || !sameLevel(j.target, u)) continue;
            if (type === "craft") {
                if (!params.each && params.plan !== "knives" && params.plan !== "clothes" && j.type === "craft" && j.params.recipeId === params.recipeId && j.params.plan === params.plan && j.params.siteId === params.siteId) return true;
                continue;
            }
            if (type === "hunt" && j.type === "hunt" && j.params.unitId === params.unitId) return true;
            if ((type === "haul" || type === "fetch") && (j.type === "haul" || j.type === "fetch")) {
                if (j.params.itemId === params.itemId) return true;
                if (params && params.to && j.params && j.params.to && j.params.to.x === params.to.x && j.params.to.y === params.to.y) {
                    const destCell = onBuildCell(params.to.x, params.to.y, u);
                    if (destCell) return true;
                }
            }
            if (j.type === type && j.target && j.target.x === x && j.target.y === y) return true;
            if (j.type === "move" && j.params && j.params.via === type && j.params.viaTarget && j.params.viaTarget.x === x && j.params.viaTarget.y === y) return true;
        }
        return false;
    }

    /** Create a job owned by the colonist. Returns the job when it started, null when it couldn't (then it's avoided for a while). */
    function give(u, spec) {
        const J = Jobs();
        if (!J) return null;
        const target = targetFor(u, spec.target);
        if (!target) return null;
        const params = Object.assign({}, spec.params || {});
        params.siteId = u.data.site;
        if (params.to) {
            params.to = targetFor(u, params.to);
            if (!params.to) return null;
        }
        const tx = spec.target ? spec.target.x : u.x, ty = spec.target ? spec.target.y : u.y;
        const key = avoidKey(u, spec.type, tx, ty);
        if ((avoid.get(key) || 0) > ticks()) return null;
        if (claimed(u, spec.type, tx, ty, params)) return null;
        // Walled sites: go through an opening first (a move job; the same decision comes back afterwards).
        if (spec.target && spec.type !== "sleep") {
            const gap = ringGap(u, tx, ty);
            if (gap && !(u.x === gap.x && u.y === gap.y)) {
                const via = J.create({ type: "move", target: { area: copyArea(u.area), x: gap.x, y: gap.y, z: zOf(u) }, params: Object.assign({}, params, { via: spec.type, viaTarget: { x: tx, y: ty } }), owner: u.id });
                if (via && via.state !== "failed") return via;
            }
        }
        const job = J.create({ type: spec.type, target, params, owner: u.id });
        if (!job || job.state === "failed") {
            avoid.set(key, ticks() + AVOID_TICKS);
            return null;
        }
        _activeJobsTick = -1;
        return job;
    }
    const tryAll = (u, makers) => {
        for (const make of makers) {
            const spec = make();
            if (!spec) continue;
            const job = give(u, spec);
            if (job) return job;
        }
        return null;
    };

    //-------------------------------------------------------------------------
    // Needs

    const asleep = u => {
        const J = Jobs();
        const j = J ? J.of(u.id) : null;
        return !!j && j.type === "sleep";
    };
    function sleepSchedule(u) {
        if (!u || !u.data) return null;
        const old = u.data.sleepSchedule;
        if (old && old.version === 1 && Number.isFinite(old.bedMinute) && old.bedMinute >= 0 && old.bedMinute < 1440 &&
            Number.isFinite(old.durationMinutes) && old.durationMinutes >= 360 && old.durationMinutes <= 660 &&
            old.wakeMinute === (old.bedMinute + old.durationMinutes) % 1440) return old;
        const from = (colonyConfig().sleepHours || [22, 6])[0];
        const personal = Math.floor(unit01(seed(), 0x51ee91, u.id, 1) * 17) - 8;
        const discipline = Math.round((facet(u, "discipline") - 50) / 25);
        const offset = personal * 15 - discipline * 30;
        const bedMinute = ((from * 60 + offset) % 1440 + 1440) % 1440;
        const durationMinutes = (u.data.age < 18 ? 540 : 420) + Math.floor(unit01(seed(), 0x51ee91, u.id, 2) * 9) * 15;
        return (u.data.sleepSchedule = { version: 1, bedMinute, durationMinutes, wakeMinute: (bedMinute + durationMinutes) % 1440,
            chronotype: offset <= -60 ? "early" : offset >= 60 ? "late" : "intermediate" });
    }
    function sleepWindow(u) {
        const s = sleepSchedule(u);
        return s ? { from: s.bedMinute / 60, to: s.wakeMinute / 60 } : { from: 22, to: 6 };
    }
    const clockHour = () => hourNow() + (window.$ufTime ? ($ufTime.minute || 0) / 60 : 0);
    const inHours = (h, from, to) => (from <= to ? h >= from && h < to : h >= from || h < to);
    const sleepingHours = u => { const w = sleepWindow(u); return inHours(clockHour(), w.from, w.to); };
    function sleepFrames(u) {
        const w = sleepWindow(u), s = sleepSchedule(u);
        const left = sleepingHours(u) ? ((w.to - clockHour() + 24) % 24) : Math.min(4, s ? s.durationMinutes / 120 : 4);
        return Math.round(Math.max(2, Math.min(11, left)) * ticksPerHour());
    }
    const isMealHour = () => (colonyConfig().mealHours || []).includes(hourNow());
    const evening = () => inHours(hourNow(), 19, 22);

    //-------------------------------------------------------------------------
    // Survival needs, SRD 5.1 (owner directive 2026-09-23: "I want it like SRD"; DEUS-TSK-FABLE-05).
    // Food and Water (srd:rule:adventuring-the-environment, pp. 86-87): one pound of food and one gallon of water a
    // day (two gallons in hot weather). Days without food beyond 3 + Constitution modifier (minimum 1) each add a
    // level of exhaustion; half a pound counts as half a day; a normal day of eating resets the count. Short water
    // costs a level at the day's end (a DC 15 Constitution save when at least half was drunk), two levels when
    // already exhausted. Exhaustion (srd:condition:exhaustion, p. 358) is the single penalty ladder; a long rest
    // (srd:rule:adventuring-resting, 8 hours) with the full day's food and drink takes one level off. A colonist
    // works unless it physically can't: unconscious at 0 hit points, or exhaustion level 5 (speed 0). No meters.

    const NEEDS_MODEL = "srd";
    const FOOD_LB_PER_DAY = 1;
    const WATER_GAL_PER_DAY = 1;
    const LONG_REST_HOURS = 8;
    const TICKS_PER_HOUR = 600;    // authoritative: 600 map updates = 1 game hour (DEUS_Core / DEUS_TimeSpeed)
    const EXHAUSTION = Object.freeze(["no effect", "disadvantage on ability checks", "speed halved",
        "disadvantage on attack rolls and saving throws", "hit point maximum halved", "speed reduced to 0", "death"]);
    const dayKey = () => (window.$ufTime ? `${$ufTime.year || 0}:${$ufTime.monthIndex || 0}:${$ufTime.day || 1}` : "0:0:1");
    const dayNumber = () => (window.$ufTime ? (($ufTime.year || 0) * 12 + ($ufTime.monthIndex || 0)) * 40 + ($ufTime.day || 1) : 1);
    const lastMealHour = () => { const m = colonyConfig().mealHours || []; return m.length ? Math.max(...m) : 19; };
    const conModOf = u => {
        const s = (u && u.data && (u.data.stats || u.data.abilities || u.data.scores)) || null;
        const con = s && Number.isFinite(s.con) ? s.con : 10;
        return Math.floor((con - 10) / 2);
    };
    const hotWeather = u => {
        const Env = window.UF && UF.Environment;
        const t = Env && typeof Env.unitThermal === "function" ? Env.unitThermal(u) : null;
        return !!t && (t.stage === "overheated" || t.stage === "heatstroke");
    };
    const waterNeed = u => WATER_GAL_PER_DAY * (hotWeather(u) ? 2 : 1);
    const unconscious = u => !!u && !!u.data && Number.isFinite(u.data.hp) && u.data.hp <= 0;

    // The SRD needs record on a colonist; an older meter record (hunger/thirst/sleep) is replaced on sight.
    function ensureNeeds(u) {
        if (!u || !u.data) return null;
        let n = u.data.needs;
        if (!n || n.model !== NEEDS_MODEL) {
            n = u.data.needs = { model: NEEDS_MODEL, day: dayKey(), foodLb: 0, waterGal: 0, daysWithoutFood: 0, exhaustion: 0, fromNeeds: 0, lastRestDay: null };
        }
        return n;
    }
    const exhaustionOf = u => (u && u.data && u.data.needs && u.data.needs.model === NEEDS_MODEL ? u.data.needs.exhaustion | 0 : 0);
    /** What the colonist's exhaustion level does (SRD p. 358), for the movement, combat and hit-point systems to apply. */
    function exhaustionEffects(u) {
        const level = exhaustionOf(u);
        return {
            level, text: EXHAUSTION[Math.min(6, level)],
            disadvantageOnChecks: level >= 1,
            speedFactor: level >= 5 ? 0 : (level >= 2 ? 0.5 : 1),
            disadvantageOnAttacksAndSaves: level >= 3,
            hpMaxFactor: level >= 4 ? 0.5 : 1,
            dead: level >= 6
        };
    }
    // A colonist's death from a survival cause: the job ends, the colony log and colonists:died record it, and Combat's
    // death path (yields, chronicle, remains) runs when Combat is present, else the unit is removed here.
    function dieOf(u, cause) {
        const J = Jobs(), W = World();
        if (!u || !u.data || u.data.dead) return;
        const job = J ? J.of(u.id) : null;
        if (job) J.cancel(job.id, `died of ${cause}`);
        u.data.dead = true;
        if (Number.isFinite(u.data.hp)) u.data.hp = 0;
        delete u.data.dying;
        const c = colonyState(u);
        if (c && Array.isArray(c.log)) c.log.push({ tick: ticks(), text: `${u.name || "A colonist"} died of ${cause}` });
        emit("colonists:died", u, cause);
        const Cb = Combat();
        if (Cb && typeof Cb.onUnitDeath === "function") Cb.onUnitDeath(u, null);
        else if (W) W.removeUnit(u.id);
    }
    function addExhaustion(u, levels, cause) {
        const n = ensureNeeds(u), J = Jobs();
        if (!n || levels <= 0) return n ? n.exhaustion : 0;
        n.exhaustion = Math.min(6, (n.exhaustion | 0) + levels);
        if (cause === "hunger" || cause === "thirst") n.fromNeeds = Math.min(6, (n.fromNeeds | 0) + levels);
        addThought(u, cause === "hunger" ? "Grew weak with hunger." : cause === "thirst" ? "Grew weak with thirst." : "Was worn down by exhaustion.", -8);
        emit("colonists:exhaustion", u, n.exhaustion, cause);
        if (n.exhaustion >= 6) {
            dieOf(u, cause); // level 6 is death (SRD p. 358)
        } else if (n.exhaustion >= 5) {
            const job = J ? J.of(u.id) : null;
            if (job && job.type !== "sleep") J.cancel(job.id, "survival: exhaustion");
        }
        return n.exhaustion;
    }
    function removeExhaustion(u, levels) {
        const n = ensureNeeds(u);
        if (!n) return 0;
        n.exhaustion = Math.max(0, (n.exhaustion | 0) - levels);
        n.fromNeeds = Math.min(n.fromNeeds | 0, n.exhaustion);
        return n.exhaustion;
    }

    // The day's reckoning (SRD Food and Water), run once per colonist when the calendar day changes.
    function endOfDay(u, n) {
        const conMod = conModOf(u);
        if (n.foodLb >= FOOD_LB_PER_DAY) n.daysWithoutFood = 0;
        else n.daysWithoutFood += n.foodLb >= FOOD_LB_PER_DAY / 2 ? 0.5 : 1;
        if (n.daysWithoutFood > Math.max(1, 3 + conMod)) addExhaustion(u, 1, "hunger");
        const need = waterNeed(u);
        if (n.waterGal < need) {
            const levels = n.exhaustion > 0 ? 2 : 1;
            if (n.waterGal >= need / 2) {
                const d20 = 1 + Math.floor(unit01(seed(), SALT.roll, u.id, dayNumber(), 15) * 20);
                if (d20 + conMod < 15) addExhaustion(u, levels, "thirst");
            } else addExhaustion(u, levels, "thirst");
        }
        n.foodLb = 0;
        n.waterGal = 0;
        n.day = dayKey();
    }

    // Every NEEDS_EVERY ticks (from the map-update alias), over the cached colonist list: the day boundary, nothing else.
    function tickNeeds() {
        const today = dayKey();
        for (const u of colonists()) {
            const n = ensureNeeds(u);
            if (n && n.day !== today) endOfDay(u, n);
        }
    }

    // What stops or interrupts labor: unconscious, exhaustion 5, the long rest at bedtime, and the day's water or
    // food still short in the last meal hour (supper) before the rest.
    function urgent(u) {
        const d = u && u.data;
        if (!d) return null;
        if (unconscious(u)) { startDying(u); return "unconscious"; }
        const Cond = window.UF && UF.Conditions;
        if (Cond && typeof Cond.canAct === "function" && !Cond.canAct(u)) {
            return "incapacitated";
        }
        const n = ensureNeeds(u);
        if (!n) return null;
        if (n.exhaustion >= 5) return "exhaustion";
        if (sleepingHours(u) && n.lastRestDay !== dayKey()) return "rest";
        if (hourNow() >= lastMealHour() && !sleepingHours(u)) {
            if (n.waterGal < waterNeed(u)) return "thirst";
            if (n.foodLb < FOOD_LB_PER_DAY) return "hunger";
        }
        return null;
    }
    // A job that serves the need is never preempted for it; first aid is never preempted for a daily need either.
    const isNeedJob = (job, need) => !!job && (NEED_JOBS.includes(job.type) || job.type === "stabilize" ||
        (need === "hunger" && (job.type === "hunt" || job.type === "fetch" || job.type === "gather" || job.type === "craft")));
    // Anti-thrash: a need nothing could meet waits NEED_RETRY_TICKS before the search runs again (keyed on the hearth).
    const needKey = (u, need) => { const c = colonyState(u); return avoidKey(u, "need_" + need, c ? c.site.x : 0, c ? c.site.y : 0); };
    const needBlocked = (u, need) => (avoid.get(needKey(u, need)) || 0) > ticks();

    //-------------------------------------------------------------------------
    // Dying and stabilisation (SRD 5.1 Dropping to 0 Hit Points, owner decision 2026-09-23). A colonist at 0 hit points
    // is unconscious, not dead: every round (6 s) it makes a death saving throw, a d20: 10 or more a success, less a
    // failure, a 1 two failures, a 20 one hit point and consciousness; three successes stabilise, three failures kill.
    // Damage while at 0 (Combat's call: Colonists.woundedAtZero) is a failure, two on a critical hit. Another colonist can
    // stabilise it with first aid: a DC 10 Wisdom (Medicine) check (the stabilize job). Stable means no longer dying,
    // not healed: it stays unconscious at 0 and regains 1 hit point after 1d4 hours unless healed first.

    const ROUND_TICKS = 360;        // a 6 s round at 60 map updates a second
    const RESCUE_RADIUS = 40;       // cells: how far a colonist goes to give first aid
    const d20 = (...parts) => 1 + Math.floor(unit01(seed(), SALT.roll, ...parts) * 20);
    const wisModOf = u => {
        const s = (u && u.data && (u.data.stats || u.data.abilities || u.data.scores)) || null;
        const wis = s && Number.isFinite(s.wis) ? s.wis : 10;
        return Math.floor((wis - 10) / 2);
    };
    const medicineBonus = u => wisModOf(u) + ((u && u.data && ((Array.isArray(u.data.proficiencies) ? u.data.proficiencies : (u.data.dnd && Array.isArray(u.data.dnd.proficiencies) ? u.data.dnd.proficiencies : []))).includes("medicine")) ? 2 : 0);
    const dyingOf = u => (unconscious(u) && !u.data.dead ? u.data.dying || null : null);
    function startDying(u) {
        if (!u || !u.data || u.data.dead) return null;
        if (u.data.dying) return u.data.dying;
        u.data.dying = { successes: 0, failures: 0, stable: false, since: ticks(), nextRoundAt: ticks() + ROUND_TICKS, wakeAt: null };
        const job = Jobs() && Jobs().of(u.id);
        if (job) Jobs().cancel(job.id, "survival: unconscious");
        addThought(u, "Collapsed.", -10);
        emit("colonists:dying", u);
        return u.data.dying;
    }
    function deathSave(u, d) {
        const roll = d20(u.id, ticks(), 21);
        if (roll === 20) { regainConsciousness(u, "a death saving throw of 20"); return roll; }
        if (roll === 1) d.failures += 2;
        else if (roll >= 10) d.successes += 1;
        else d.failures += 1;
        if (d.failures >= 3) { dieOf(u, "wounds"); return roll; }
        if (d.successes >= 3) becomeStable(u, d, "three successful death saving throws");
        return roll;
    }
    function becomeStable(u, d, how) {
        d.stable = true;
        d.successes = 0;
        d.failures = 0;
        d.wakeAt = ticks() + (1 + Math.floor(unit01(seed(), SALT.roll, u.id, ticks(), 23) * 4)) * TICKS_PER_HOUR; // 1d4 hours
        addThought(u, "Stopped slipping away.", 4);
        emit("colonists:stabilized", u, how);
    }
    function regainConsciousness(u, how) {
        if (!u || !u.data) return;
        delete u.data.dying;
        if (Number.isFinite(u.data.hp) && u.data.hp < 1) u.data.hp = 1;
        addThought(u, "Came to.", 6);
        emit("colonists:conscious", u, how);
        pendingDecision.add(u.id);
    }
    /** Combat's hook: damage taken at 0 hit points is a death saving throw failure, two on a critical hit. */
    function woundedAtZero(u, critical) {
        const d = startDying(u);
        if (!d) return null;
        if (d.stable) { d.stable = false; d.wakeAt = null; }
        d.failures += critical ? 2 : 1;
        if (d.failures >= 3) dieOf(u, "wounds");
        return d;
    }
    /** First aid by another colonist: a DC 10 Wisdom (Medicine) check. Returns { ok, roll, total, dc } or null when there is nothing to stabilise. */
    function stabilize(patient, rescuer) {
        const d = dyingOf(patient);
        if (!d || d.stable) return null;
        const roll = d20(rescuer ? rescuer.id : 0, patient.id, ticks(), 22);
        const total = roll + medicineBonus(rescuer);
        const ok = total >= 10;
        if (ok) becomeStable(patient, d, `first aid by ${rescuer && rescuer.name ? rescuer.name : "a colonist"}`);
        else addThought(rescuer, `Couldn't stop ${patient.name || "a friend"} from slipping.`, -3);
        return { ok, roll, total, dc: 10 };
    }
    // Every sweep: the dying roll their saving throws by the round; the stable wake when their hours are up.
    function tickDying(u, t) {
        const d = dyingOf(u);
        if (!d) return;
        if (d.stable) {
            if (d.wakeAt !== null && t >= d.wakeAt) regainConsciousness(u, "an hour's rest");
            return;
        }
        while (t >= d.nextRoundAt && u.data.dying === d && !u.data.dead) {
            d.nextRoundAt += ROUND_TICKS;
            deathSave(u, d);
        }
    }
    // Emergency aid, above ordinary labor: the nearest unconscious, unstable colonist of the same faction nobody is helping.
    function patientsFor(u) {
        return colonists().filter(o => o !== u && o.data.faction === u.data.faction && sameLevel(o, u) && dyingOf(o) && !dyingOf(o).stable && chebyshev(o.x, o.y, u.x, u.y) <= RESCUE_RADIUS);
    }
    function rescueJob(u) {
        if (!isColonist(u) || unconscious(u) || exhaustionOf(u) >= 5) return null;
        const J = Jobs();
        if (!J || !J.handler("stabilize")) return null;
        const patients = patientsFor(u).sort((a, b) => chebyshev(a.x, a.y, u.x, u.y) - chebyshev(b.x, b.y, u.x, u.y) || a.id - b.id);
        for (const p of patients) {
            if (J.reservation && J.reservation.isReservedByOther(u.id, { id: p.id })) continue;
            const j = give(u, { type: "stabilize", target: { x: p.x, y: p.y }, params: { unitId: p.id, emergency: true } });
            if (j) return j;
        }
        return null;
    }

    // The long rest: 8 hours in a bed, beside the hearth, or where the colonist stands (at speed 0 it can't walk to a bed).
    function longRestJob(u) {
        const n = ensureNeeds(u);
        const frames = ticksForHours(LONG_REST_HOURS);
        if (n && n.exhaustion >= 5) return give(u, { type: "sleep", target: { x: u.x, y: u.y }, params: { frames, longRest: true } });
        return sleepJob(u, { frames, longRest: true });
    }
    // At the end of a long rest (SRD Resting): all hit points back (with at least 1 at the start), and one level of
    // exhaustion off with some food and drink that day; exhaustion from hunger or thirst only once the full day's
    // amount was eaten and drunk (SRD Food and Water).
    function completeLongRest(u) {
        const n = ensureNeeds(u);
        if (!n) return;
        n.lastRestDay = dayKey();
        const d = u.data;
        if (Number.isFinite(d.hp) && Number.isFinite(d.maxHp) && d.hp >= 1) d.hp = d.maxHp;
        if (n.exhaustion > 0) {
            const full = n.foodLb >= FOOD_LB_PER_DAY && n.waterGal >= waterNeed(u);
            const some = n.foodLb > 0 && n.waterGal > 0;
            if (n.fromNeeds > 0 ? full : some) removeExhaustion(u, 1);
        }
        emit("colonists:longRest", u, n.exhaustion);
    }

    // A real UF_Jobs job for what the day still needs, once the colonist is free: the long rest at bedtime (or when
    // exhausted and not yet rested today), then water, then food. A need nothing can meet leaves a thought and is
    // not searched again for NEED_RETRY_TICKS; the next need is tried meanwhile.
    function needJob(u) {
        const n = ensureNeeds(u);
        if (!n || unconscious(u)) return null;
        const wants = [];
        if (n.lastRestDay !== dayKey() && (sleepingHours(u) || n.exhaustion >= 1)) wants.push("rest");
        if (n.waterGal < waterNeed(u)) wants.push("thirst");
        if (n.foodLb < FOOD_LB_PER_DAY) wants.push("hunger");
        for (const need of wants) {
            if (needBlocked(u, need)) continue;
            let j = null, text = "", exists = false;
            if (need === "rest") {
                j = longRestJob(u);
                text = "Found nowhere to rest.";
            } else if (need === "thirst") {
                const w = waterNear(u, WATER_RADIUS);
                exists = !!w;
                j = w ? give(u, { type: "drink", target: w, params: { need } }) : null;
                text = "Found no water to drink.";
            } else {
                j = foodJob(u);
                exists = !j && foodExists(u);
                text = "Found nothing to eat.";
            }
            if (j) return j;
            // Water or food that exists but is busy (somebody drinks or eats there now: one job per cell) is tried
            // again at the next sweep; a resource that doesn't exist waits NEED_RETRY_TICKS and leaves a thought.
            if (exists) { avoid.set(needKey(u, need), ticks() + DECIDE_EVERY); continue; }
            avoid.set(needKey(u, need), ticks() + NEED_RETRY_TICKS);
            addThought(u, text, -4);
        }
        return null;
    }
    // Any food this colonist could reach: the larder and containers, the ground within FOOD_ITEM_RADIUS, a forageable plant.
    function foodExists(u) {
        if (foodStored(u).length) return true;
        if (groundItemsNear(u, { radius: FOOD_ITEM_RADIUS }).some(f => isFoodType(itemType(f.item.type)))) return true;
        return !!foodObjectNear(u, SEARCH_RADIUS);
    }

    const _foodStoredCache = new Map();
    let _foodStoredCacheTick = -1;
    const foodStored = ref => {
        if (_foodStoredCacheTick !== localTicks) {
            _foodStoredCache.clear();
            _foodStoredCacheTick = localTicks;
        }
        const c = colonyState(ref);
        const key = `${c ? c.siteId || "site" : "site"}:${c ? zOf(c) : 0}`;
        if (_foodStoredCache.has(key)) return _foodStoredCache.get(key);
        const I = Items();
        const out = [];
        if (!I) return out;
        for (const s of stockpilesStoring("food", ref)) for (const it of I.atIn(siteArea(ref), s.x, s.y)) if (isFoodType(itemType(it.type))) out.push(it);
        if (window.UF && UF.Containers) {
            const containers = UF.Containers.all(siteArea(ref), zOf(ref));
            for (const cont of containers) {
                for (const it of UF.Containers.itemsIn(cont.id)) {
                    if (isFoodType(itemType(it.type))) out.push(it);
                }
            }
        }
        _foodStoredCache.set(key, out);
        return out;
    };
    const rawFood = t => isFoodType(t) && hasTag(t, "raw");

    function foodJob(u) {
        const I = Items();
        if (!I) return null;
        const fire = fireNear(u);
        const inv = I.inventoryOf(u.id).filter(it => isFoodType(itemType(it.type)));
        const cooked = inv.find(it => !rawFood(itemType(it.type)));
        if (cooked) return give(u, { type: "eat", params: { itemId: cooked.id } });
        const raw = inv.find(it => rawFood(itemType(it.type)));
        if (raw) {
            const r = fire ? cookRecipeFor(raw.type) : null;
            const spec = r ? cookSpec(u, r.id, null) : null;
            if (spec) {
                const j = give(u, spec);
                if (j) return j;
            }
            return give(u, { type: "eat", params: { itemId: raw.id } });
        }
        // Food on the ground within reach, the larder/containers included, nearest first.
        const stored = foodStored(u).map(it => {
            const C = window.UF && UF.Containers;
            const cont = it.container && C ? C.get(it.container) : null;
            const pos = cont || it;
            return { item: it, x: pos.x, y: pos.y, dist: Math.hypot(pos.x - u.x, pos.y - u.y), containerId: it.container || null };
        });
        const seen = new Set(stored.map(f => f.item.id));
        const ground = stored.concat(groundItemsNear(u, { radius: FOOD_ITEM_RADIUS }).filter(f => isFoodType(itemType(f.item.type)) && !seen.has(f.item.id) && (!f.item.firstOwner || f.item.firstOwner === u.id))).sort((a, b) => a.dist - b.dist);
        const kill = ground.find(f => rawFood(itemType(f.item.type)) && f.dist <= FOOD_ITEM_RADIUS);
        if (kill) {
            const spec = fire && cookRecipeFor(kill.item.type)
                ? { type: "fetch", target: { x: kill.x, y: kill.y }, params: { itemId: kill.item.id, fromContainer: kill.containerId } }
                : (kill.containerId
                    ? { type: "fetch", target: { x: kill.x, y: kill.y }, params: { itemId: kill.item.id, fromContainer: kill.containerId } }
                    : { type: "eat", target: { x: kill.x, y: kill.y }, params: { itemId: kill.item.id } });
            const j = give(u, spec);
            if (j) return j;
        }
        // A brave colonist with prey close by takes it rather than walking to the larder.
        const adult = Number.isFinite(u.data.age) && u.data.age >= 18;
        const brave = adult && (facet(u, "bravery") >= BRAVE || priorityOf("hunt", u) > 1);
        const near = brave ? preyNear(u, HUNT_NEAR) : null;
        if (near) {
            const j = give(u, { type: "hunt", target: { x: near.x, y: near.y }, params: { unitId: near.id } });
            if (j) return j;
        }
        for (const f of ground) {
            const t = itemType(f.item.type);
            const spec = rawFood(t) && fire && cookRecipeFor(f.item.type)
                ? { type: "fetch", target: { x: f.x, y: f.y }, params: { itemId: f.item.id } }
                : { type: "eat", target: { x: f.x, y: f.y }, params: { itemId: f.item.id } };
            const j = give(u, spec);
            if (j) return j;
        }
        // Nothing lying about: gather, else hunt farther out.
        const plant = foodObjectNear(u, SEARCH_RADIUS);
        if (plant) {
            const j = give(u, { type: plant.action, target: { x: plant.x, y: plant.y } });
            if (j) return j;
        }
        const prey = adult ? preyNear(u, huntRadius()) : null;
        if (prey) {
            const j = give(u, { type: "hunt", target: { x: prey.x, y: prey.y }, params: { unitId: prey.id } });
            if (j) return j;
        }
        if (unit01(seed(), SALT.thought, u.id, ticks(), 9) < 0.2) addThought(u, "Found nothing to eat.", -4);
        return null;
    }

    //-------------------------------------------------------------------------
    // Reproduction, pregnancy and life stages

    const familyDate = () => window.$ufTime ? `${$ufTime.year || 0}:${$ufTime.monthIndex || 0}:${$ufTime.day || 1}` : "0:0:1";

    function factionPopulation(fId) {
        const W = World();
        if (!W) return 0;
        const people = W.units().filter(u => u.data && u.data.faction === fId &&
            (u.data.kind === "colonist" || u.data.kind === "person") &&
            !u.data.dead && !u.data._isDying);
        return people.length;
    }

    /**
     * Conception rate curve:
     * - Rapid expansion to 100: starts at 95% (pop < 20), scaling to 50% at pop 100.
     * - Deceleration to 200: smoothly scales down quadratically from 50% down to 0% at 200.
     * - Level-off: exactly 0% at pop >= 200.
     */
    function conceptionChance(pop) {
        if (pop >= 200) return 0.0;
        if (pop < 20) return 0.95;
        if (pop < 100) {
            return 0.95 - ((pop - 20) / 80) * 0.45;
        }
        const ratio = (200 - pop) / 100;
        return Math.max(0.0, 0.50 * Math.pow(ratio, 2));
    }

    function twinChance(pop) {
        if (pop < 40) return 0.15;
        if (pop < 80) return 0.05;
        return 0.0;
    }

    function postPartumCooldownSeconds(pop) {
        if (pop < 50) return 45;
        if (pop < 100) return 60 + Math.floor(((pop - 50) / 50) * 60);
        return 120 + Math.floor(((pop - 100) / 100) * 180);
    }

    function gestationSeconds(pop) {
        if (pop < 50) return 45;
        return 60;
    }

    function eligibleForIntimacy(u) {
        if (!u || !u.data) return false;
        if (!isSettler(u) && !(u.data.kind === "person" && u.data.faction)) return false;
        if (!Number.isFinite(u.data.age) || u.data.age < 15 || u.data.stage === "baby" || u.data.stage === "child" || u.data.stage === "teen") return false;
        if (["automaton", "undead", "swarm"].includes(u.data.species)) return false;
        if (u.data.dead || u.data._isDying) return false;
        if (u.data.familyDesire === false) return false;
        if (u.data.lastMatedDate === familyDate()) return false;
        if (u.data.postPartumUntil && ticks() < u.data.postPartumUntil) return false;
        if (isSettler(u)) {
            const n = u.data.needs || {};
            if (n.hunger >= 75 || n.thirst >= 75 || n.sleep >= 85) return false;
        }
        return true;
    }

    function privatePairRoom(u, partner, requireInside) {
        const H = window.UF && UF.Households;
        if (!H || !H.roomForPair || !eligibleForIntimacy(u) || !eligibleForIntimacy(partner) || !sameLevel(u, partner)) return null;
        if ((u.data.species || "human") !== (partner.data.species || "human")) return null;
        const room = H.roomForPair(u, partner);
        if (!room || !Array.isArray(room.cells)) return null;
        const inside = p => room.cells.some(c => c.x === p.x && c.y === p.y);
        return !requireInside || (inside(u) && inside(partner)) ? room : null;
    }

    function nightlyMateJob(u) {
        if (!eligibleForIntimacy(u)) return null;
        const J = Jobs(), W = World(), H = window.UF && UF.Households;
        if (!J || !W || !H) return null;
        const partner = W.unit(u.data.partnerId || u.data.partner);
        if (!partner || !eligibleForIntimacy(partner) || !sameLevel(u, partner)) return null;
        const room = privatePairRoom(u, partner, false);
        if (!room) return null;
        const otherJob = J.of(partner.id);
        const isFamilyJob = otherJob && otherJob.params && (otherJob.params.familyVisit === u.id || otherJob.params.partnerId === u.id);
        if (otherJob && !isFamilyJob) {
            // Cancel non-critical jobs for family rendezvous (sleep, eat, drink, combat stay)
            const critical = ["sleep", "eat", "drink", "combat", "flee"].includes(otherJob.type);
            if (critical) return null;
            J.cancel(otherJob.id, "family rendezvous");
        }
        if (!privatePairRoom(u, partner, true)) {
            if (!Array.isArray(room.spots) || room.spots.length < 2) return null;
            const spots = u.id < partner.id ? room.spots : room.spots.slice().reverse();
            const until = ticks() + 1200;
            u.data.familyRendezvous = { partnerId: partner.id, until };
            partner.data.familyRendezvous = { partnerId: u.id, until };
            if (!otherJob && (partner.x !== spots[1].x || partner.y !== spots[1].y)) {
                give(partner, { type: "move", target: spots[1], params: { familyVisit: u.id } });
            }
            if (u.x !== spots[0].x || u.y !== spots[0].y) return give(u, { type: "move", target: spots[0], params: { familyVisit: partner.id } });
            return null;
        }
        return give(u, { type: "mate", target: { x: partner.x, y: partner.y }, params: { partnerId: partner.id, unitId: partner.id } });
    }

    function checkNighttimeSleepMating(u) {
        if (!eligibleForIntimacy(u)) return false;
        const W = World();
        if (!W) return false;
        const people = allFactionPeople().filter(o => o.id !== u.id && o.data.faction === u.data.faction && sameLevel(o, u) && eligibleForIntimacy(o));
        const partnerId = u.data.partnerId || u.data.partner;
        let partner = partnerId ? W.unit(partnerId) : null;
        if (!partner || !eligibleForIntimacy(partner) || !sameLevel(partner, u)) {
            partner = people.find(o => o.data.gender !== u.data.gender &&
                (o.data.species || "human") === (u.data.species || "human") &&
                (!u.data.motherId || u.data.motherId !== o.id) &&
                (!o.data.motherId || o.data.motherId !== u.id) &&
                (!u.data.fatherId || u.data.fatherId !== o.id) &&
                (!o.data.fatherId || o.data.fatherId !== u.id)
            );
        }
        if (partner && eligibleForIntimacy(partner)) {
            if (!partner.data.partnerId && !u.data.partnerId) {
                u.data.partnerId = partner.id;
                partner.data.partnerId = u.id;
            }
            return handleMated(u, partner);
        }
        return false;
    }

    function handleMated(u1, u2) {
        if (!u1 || !u2 || !u1.data || !u2.data) return false;
        if (!eligibleForIntimacy(u1) || !eligibleForIntimacy(u2)) return false;
        if (!sameLevel(u1, u2)) return false;
        if ((u1.data.species || "human") !== (u2.data.species || "human")) return false;

        const isSettlerPair = isSettler(u1) || isSettler(u2);
        if (isSettlerPair) {
            if (!privatePairRoom(u1, u2, true) || chebyshev(u1.x, u1.y, u2.x, u2.y) > 1) return false;
        } else {
            if (chebyshev(u1.x, u1.y, u2.x, u2.y) > 1) {
                const J = Jobs();
                let spot = null;
                for (const [dx, dy] of NEIGHBORS) {
                    const nx = u2.x + dx, ny = u2.y + dy;
                    if (J && J.standable(levelArea(u2), nx, ny)) {
                        spot = { x: nx, y: ny };
                        break;
                    }
                }
                if (spot) {
                    u1.x = spot.x;
                    u1.y = spot.y;
                } else {
                    return false;
                }
            }
        }

        const day = window.$ufTime ? $ufTime.day : 1;
        u1.data.lastMatedDay = day;
        u2.data.lastMatedDay = day;
        u1.data.lastMatedDate = u2.data.lastMatedDate = familyDate();
        u1.data.lastMatedTick = u2.data.lastMatedTick = ticks();
        delete u1.data.familyRendezvous;
        delete u2.data.familyRendezvous;

        addThought(u1, "Made love with partner.", 12);
        if (isSettler(u2) || (u2.data && u2.data.thoughts)) addThought(u2, "Made love with partner.", 12);

        if (u1.data.needs) u1.data.needs.social = Math.max(0, (u1.data.needs.social || 0) - 50);
        if (u2.data.needs) u2.data.needs.social = Math.max(0, (u2.data.needs.social || 0) - 50);

        // Conception: opposite genders
        const female = (u1.data.gender === "female") ? u1 : (u2.data.gender === "female") ? u2 : null;
        const male = (u1.data.gender === "male") ? u1 : (u2.data.gender === "male") ? u2 : null;

        const H = window.UF && UF.Households;
        const femaleH = H && H.of ? H.of(female) : null;
        const canConceive = H && typeof H.canConceiveChild === "function" ? H.canConceiveChild(femaleH) : true;

        if (female && male && !female.data.pregnancy && canConceive) {
            const fId = female.data.faction;
            const pop = factionPopulation(fId);
            const chance = conceptionChance(pop);
            const roll = unit01(seed(), SALT.roll, female.id, day, ticks());
            if (roll < chance || female.data._forceConceive) {
                const duration = gestationSeconds(pop);
                female.data.pregnancy = {
                    fatherId: male.id,
                    fatherName: male.name,
                    secondsLeft: duration,
                    totalSeconds: duration,
                    daysLeft: 1,
                    totalDays: 1,
                    dayConceived: day,
                    isTwins: unit01(seed(), SALT.roll, female.id, day, ticks(), 7) < twinChance(pop)
                };
                delete female.data._forceConceive;
                addThought(female, "Expecting a child!", 12);
                addThought(male, "Going to be a father!", 10);
                emit("colonists:conceived", female, male);
                emit("factions:conceived", female, male);
            }
        }
        return true;
    }

    // Jobs owns the generic executor.
    function guardMateHandler() {
        const J = Jobs(), prior = J && J.handler("mate");
        if (!prior || prior.familyGuard) return;
        J.define("mate", Object.assign({}, prior, {
            familyGuard: true,
            plan(job, u) {
                const partner = World().unit(job.params.partnerId || job.params.unitId);
                if (!privatePairRoom(u, partner, true)) return { ok: false, reason: "adults require a willing partner and a private sleeping room" };
                return prior.plan(job, u);
            },
            apply(job, u) {
                const partner = World().unit(job.params.partnerId || job.params.unitId);
                job.result = { familyInteraction: handleMated(u, partner) };
            }
        }));
    }

    function rememberConversation(u, other) {
        if (!other || !isSettler(other) || !sameLevel(u, other) || chebyshev(u.x, u.y, other.x, other.y) > 2) return;
        for (const [a, b] of [[u, other], [other, u]]) {
            const bonds = a.data.socialBonds || (a.data.socialBonds = []);
            let bond = bonds.find(x => x.unitId === b.id);
            if (!bond) { bond = { unitId: b.id, conversations: 0, familiarity: 0, affection: 0 }; bonds.push(bond); }
            bond.conversations++;
            bond.familiarity = Math.min(100, bond.familiarity + 8);
            bond.affection = Math.min(100, bond.affection + 5);
            bond.lastTick = ticks();
            if (bonds.length > 16) bonds.splice(bonds.indexOf(bonds.reduce((x, y) => x.lastTick < y.lastTick ? x : y)), 1);
            if (a.data.familyDesire === undefined) a.data.familyDesire = unit01(seed(), SALT.roll, a.id, 913) < 0.8;
        }
        const bond = u.data.socialBonds.find(x => x.unitId === other.id);
        const reciprocal = other.data.socialBonds.find(x => x.unitId === u.id);
        if (bond && reciprocal && bond.conversations >= 3 && reciprocal.conversations >= 3 && u.data.familyDesire === true && other.data.familyDesire === true && UF.Households) {
            UF.Households.formPair(u, other);
        }
    }

    function progressPregnancies(deltaSeconds = 1) {
        const W = World();
        if (!W) return;
        for (const u of allFactionPeople()) {
            if (!u.data || !u.data.pregnancy) continue;
            const preg = u.data.pregnancy;
            if (preg.secondsLeft !== undefined) {
                preg.secondsLeft -= deltaSeconds;
                preg.daysLeft = Math.max(0, Math.ceil(preg.secondsLeft / 40));
                if (preg.secondsLeft <= 0) {
                    giveBirth(u);
                }
            } else {
                preg.daysLeft = (preg.daysLeft || 1) - 1;
                if (preg.daysLeft <= 0) {
                    giveBirth(u);
                }
            }
        }
    }

    function giveBirth(mother) {
        const W = World();
        if (!W || !mother || !levelSupported(zOf(mother))) return null;
        const st = W.state;
        const preg = mother.data.pregnancy;
        // User specification: 15 years is adulthood
        if (!preg || !Number.isFinite(mother.data.age) || mother.data.age < 15) return null;
        const fatherId = preg ? preg.fatherId : null;
        const father = fatherId ? (settler(fatherId) || W.unit(fatherId)) : null;

        // Find standable cell in child's room/bed or next to mother
        const H = window.UF && UF.Households;
        const h = H && typeof H.of === "function" ? H.of(mother) : null;
        let childBed = null;
        if (h && h.home && Array.isArray(h.home.beds)) {
            const livingMemberIds = new Set((H.members ? H.members(h) : []).map(m => m.id));
            childBed = h.home.beds.find(b => !b.unitId || (!livingMemberIds.has(b.unitId) && b.unitId !== mother.id));
        }

        const J = Jobs();
        let birthX = null, birthY = null;
        if (childBed) {
            birthX = childBed.x;
            birthY = childBed.y;
        } else {
            for (const [dx, dy] of NEIGHBORS) {
                const nx = mother.x + dx, ny = mother.y + dy;
                if (J && J.standable(levelArea(mother), nx, ny) && !W.units().some(u => sameLevel(u, mother) && u.x === nx && u.y === ny)) {
                    birthX = nx;
                    birthY = ny;
                    break;
                }
            }
            if (birthX === null) {
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue;
                        const nx = mother.x + dx, ny = mother.y + dy;
                        if (J && J.standable(levelArea(mother), nx, ny) && !W.units().some(u => sameLevel(u, mother) && u.x === nx && u.y === ny)) {
                            birthX = nx;
                            birthY = ny;
                            break;
                        }
                    }
                    if (birthX !== null) break;
                }
            }
        }
        if (birthX === null) return null; // Keep the pregnancy pending; never claim a birth without a unit.

        // Generate child unit: pops out as an active kid (no complex labor)
        const childGender = unit01(st.seed, SALT.gender, mother.id, ticks()) < 0.5 ? "male" : "female";
        const taken = new Set(allFactionPeople().map(c => c.name));
        const childName = nameFor(st.seed, ticks(), childGender, taken);
        const isBoy = childGender === "male";
        const isHuman = !mother.data.species || mother.data.species === "human";
        const kidSprite = isHuman ? "$UF_Human_Child_Walk" : (isBoy ? "$Child_Boy" : "$Child_Girl");
        const childVar = variationFor(st.seed, ticks(), mother, father);
        const childGen = geneticsFor(st.seed, ticks(), mother, father, childVar);

        const childUnit = W.addUnit({
            name: childName,
            image: { characterName: kidSprite, characterIndex: 0 },
            area: copyArea(mother.area),
            z: zOf(mother),
            x: birthX,
            y: birthY,
            dir: 2,
            data: {
                kind: isColonist(mother) ? "colonist" : "person",
                ai: isColonist(mother) ? "colonist" : (mother.data.ai || "wander"),
                faction: mother.data.faction,
                site: mother.data.site,
                home: mother.data.home ? JSON.parse(JSON.stringify(mother.data.home)) : { area: copyArea(mother.area), x: mother.x, y: mother.y, z: zOf(mother) },
                species: mother.data.species || "human",
                gender: childGender,
                variation: childVar,
                genetics: childGen,
                face: isHuman ? { sheet: "UF_Faces_human_1", index: isBoy ? 6 : 7 } : null,
                age: 2,
                ageDays: 2,
                ageSeconds: 2 * 240,
                stage: "child",
                motherId: mother.id,
                fatherId: fatherId,
                familyId: mother.data.familyId || (father && father.data.familyId) || null,
                lineageId: mother.data.lineageId || (father && father.data.lineageId) || null,
                surname: mother.data.surname || (father && father.data.surname) || null,
                generation: Math.max(mother.data.generation || 1, (father && father.data.generation) || 1) + 1,
                parents: [mother.id, ...(fatherId ? [fatherId] : [])],
                needs: Object.assign({}, START_NEEDS),
                facets: facetsFor(st.seed, ticks()),
                skills: skillsFor(st.seed, ticks()),
                thoughts: [{ text: "Entered the world as a healthy kid.", score: 10, ticks: ticks() }],
                tiers: tiersFor(mother.data.species || "human", childGender, childVar)
            }
        });

        if (!childUnit) return null;
        const Dnd = window.UF && UF.Dnd5e;
        if (Dnd && typeof Dnd.rollAbilityScores === "function") {
            childUnit.data.stats = Dnd.rollAbilityScores(st.seed, childUnit.id, childUnit.data.species, "child");
            childUnit.data.dnd = Dnd.assignClass(childUnit.data.stats, st.seed, childUnit.id);
            childUnit.data.dndClass = childUnit.data.dnd.id;
            childUnit.data.className = childUnit.data.dnd.name;
            childUnit.data.hitDie = childUnit.data.dnd.hitDie;
            childUnit.data.hpMax = childUnit.data.dnd.hpMax;
            childUnit.data.hp = childUnit.data.dnd.hp;
            childUnit.data.ac = childUnit.data.dnd.ac;
            childUnit.data.savingThrows = childUnit.data.dnd.savingThrows;
        }
        if (childBed) {
            childBed.unitId = childUnit.id;
            childUnit.data.bed = { area: copyArea(mother.area), x: childBed.x, y: childBed.y, z: zOf(mother) };
        }
        if (h && H && typeof H.join === "function") {
            H.join(childUnit, h);
        }
        const wasTwins = preg && preg.isTwins;
        delete mother.data.pregnancy;
        const pop = factionPopulation(mother.data.faction);
        const cooldown = postPartumCooldownSeconds(pop);
        mother.data.postPartumUntil = ticks() + cooldown * 60;

        let twinUnit = null;
        if (wasTwins && pop + 1 < 200) {
            let twinX = null, twinY = null;
            for (const [dx, dy] of NEIGHBORS) {
                const nx = birthX + dx, ny = birthY + dy;
                if (J && J.standable(levelArea(mother), nx, ny) && !W.units().some(u => sameLevel(u, mother) && u.x === nx && u.y === ny)) {
                    twinX = nx; twinY = ny; break;
                }
            }
            if (twinX !== null) {
                const twinGender = unit01(st.seed, SALT.gender, mother.id, ticks() + 1) < 0.5 ? "male" : "female";
                const twinName = nameFor(st.seed, ticks() + 7, twinGender, taken);
                const isTwinBoy = twinGender === "male";
                const twinSprite = isHuman ? "$UF_Human_Child_Walk" : (isTwinBoy ? "$Child_Boy" : "$Child_Girl");
                const twinVar = variationFor(st.seed, ticks() + 3, mother, father);
                const twinGen = geneticsFor(st.seed, ticks() + 3, mother, father, twinVar);
                twinUnit = W.addUnit({
                    name: twinName,
                    image: { characterName: twinSprite, characterIndex: 0 },
                    area: copyArea(mother.area),
                    z: zOf(mother),
                    x: twinX,
                    y: twinY,
                    dir: 2,
                    data: {
                        kind: isColonist(mother) ? "colonist" : "person",
                        ai: isColonist(mother) ? "colonist" : (mother.data.ai || "wander"),
                        faction: mother.data.faction,
                        site: mother.data.site,
                        home: mother.data.home ? JSON.parse(JSON.stringify(mother.data.home)) : { area: copyArea(mother.area), x: mother.x, y: mother.y, z: zOf(mother) },
                        species: mother.data.species || "human",
                        gender: twinGender,
                        variation: twinVar,
                        genetics: twinGen,
                        face: isHuman ? { sheet: "UF_Faces_human_1", index: isTwinBoy ? 6 : 7 } : null,
                        age: 2,
                        ageDays: 2,
                        ageSeconds: 2 * 240,
                        stage: "child",
                        motherId: mother.id,
                        fatherId: fatherId,
                        familyId: mother.data.familyId || (father && father.data.familyId) || null,
                        lineageId: mother.data.lineageId || (father && father.data.lineageId) || null,
                        surname: mother.data.surname || (father && father.data.surname) || null,
                        generation: Math.max(mother.data.generation || 1, (father && father.data.generation) || 1) + 1,
                        parents: [mother.id, ...(fatherId ? [fatherId] : [])],
                        needs: Object.assign({}, START_NEEDS),
                        facets: facetsFor(st.seed, ticks() + 11),
                        skills: skillsFor(st.seed, ticks() + 11),
                        thoughts: [{ text: "Born as a healthy twin!", score: 12, ticks: ticks() }],
                        tiers: tiersFor(mother.data.species || "human", twinGender, twinVar)
                    }
                });
                if (twinUnit) {
                    if (window.UF && UF.Factions && mother.data.faction) {
                        const f = UF.Factions.get(mother.data.faction);
                        if (f) f.population = (f.population || 0) + 1;
                        twinUnit.data._popCounted = true;
                    }
                    if (window.UF && UF.Goals && UF.Goals.ensure) {
                        UF.Goals.ensure(twinUnit);
                    }
                    emit("colonists:born", twinUnit, mother, father);
                    emit("factions:born", twinUnit, mother, father);
                }
            }
        }

        let Callings = window.UF && UF.Callings;
        if (!Callings && typeof require === "function") {
            try { Callings = require("./UF_Callings.js"); } catch (_) {
                try { Callings = require("./game/js/plugins/UF_Callings.js"); } catch (_) {}
            }
        }
        if (Callings && Callings.assignCallings) {
            Callings.assignCallings(childUnit, pop);
            if (twinUnit) Callings.assignCallings(twinUnit, pop);
        }

        if (twinUnit) {
            addThought(mother, "Gave birth to healthy twins!", 25);
            if (father && isSettler(father)) {
                addThought(father, "Celebrated the birth of twins!", 20);
            }
        } else {
            addThought(mother, "Gave birth to a healthy child.", 20);
            if (father && isSettler(father)) {
                addThought(father, "Celebrated the birth of my child.", 15);
            }
        }

        const motherEv = W.eventOf(mother.id);
        const childEv = childUnit ? W.eventOf(childUnit.id) : null;
        if (window.UF && UF.Visuals && UF.Visuals.bark) {
            if (motherEv) UF.Visuals.bark(motherEv, twinUnit ? `♥ Welcome to the world, ${childName} and ${twinUnit.name}! ♥` : `♥ Welcome to the world, ${childName}! ♥`, 200);
            if (childEv) UF.Visuals.bark(childEv, "*Yay, I'm here!*", 180);
        }

        if (window.UF && UF.Factions && mother.data.faction) {
            const f = UF.Factions.get(mother.data.faction);
            if (f) f.population = (f.population || 0) + 1;
            childUnit.data._popCounted = true;
        }

        if (window.UF && UF.Goals && UF.Goals.ensure) {
            UF.Goals.ensure(childUnit);
        }

        if (UF.Households) UF.Households.reconcile();
        emit("colonists:born", childUnit, mother, father);
        emit("factions:born", childUnit, mother, father);
        return childUnit;
    }

    function progressAging(deltaSeconds = 1) {
        for (const u of allFactionPeople()) {
            if (!u.data || u.data.age === undefined) continue;
            u.data.ageSeconds = (u.data.ageSeconds || 0) + deltaSeconds;
            // 1 real hour at 1x speed = 15 years -> 1 year = 240 real seconds (4 real minutes). Average lifespan = 60 years.
            if (u.data.ageSeconds >= 240) {
                u.data.ageSeconds -= 240;
                u.data.age++;
                if (u.data.age >= 50) {
                    u.data.stage = "elder";
                } else if (u.data.age >= 15) {
                    u.data.stage = "adult";
                } else if (u.data.age >= 12) {
                    u.data.stage = "teen";
                } else if (u.data.age >= 2) {
                    u.data.stage = "child";
                } else {
                    u.data.stage = "baby";
                }
                updateAgeAppearance(u);
                const isOffspring = !!(u.data.motherId || u.data.fatherId || (u.data.parents && u.data.parents.length));
                if ((isOffspring || u.data.founder) && (u.data.stage === "adult" || u.data.stage === "elder" || u.data.age >= 15) && !u.data.partnerId && !u.data.partner) {
                    attemptAdulthoodPairbond(u);
                }
                checkOldAgeMortality(u);
            }
        }
    }

    function checkOldAgeMortality(u) {
        if (!u || !u.data || u.data.dead || u.data.age < 55) return false;
        const age = u.data.age;
        let mortalityChance = 0;
        // User directive: Average lifespan is 60 years.
        // Calibrated mortality curve centering precisely at 60.0 years average lifespan:
        if (age >= 76) mortalityChance = 0.80;
        else if (age >= 71) mortalityChance = 0.60;
        else if (age >= 66) mortalityChance = 0.42;
        else if (age >= 61) mortalityChance = 0.28;
        else if (age >= 58) mortalityChance = 0.16;
        else if (age >= 55) mortalityChance = 0.06;

        const roll = unit01(seed(), 0x01da6e, u.id, age);
        if (roll < mortalityChance) {
            passAwayOfOldAge(u);
            return true;
        }
        return false;
    }

    function passAwayOfOldAge(u) {
        if (!u || !u.data || u.data.dead) return;
        u.data.deathCause = "old_age";
        u.data.dead = true;
        u.data.hp = 0;

        // Mourning thoughts for family and household members
        const House = window.UF && UF.Households;
        const house = House && typeof House.of === "function" ? House.of(u) : null;
        if (house && House.members) {
            for (const kin of House.members(house)) {
                if (kin && kin.id !== u.id && kin.data) {
                    addThought(kin, `Mourned the peaceful passing of ${u.name}.`, -8);
                }
            }
        }

        const C = Combat();
        if (C && typeof C.onUnitDeath === "function") {
            C.onUnitDeath(u, null);
        } else {
            const W = World();
            if (W && W.unit(u.id)) W.removeUnit(u.id);
        }
    }

    function stepFactionReproduction() {
        const W = World();
        if (!W) return { mated: 0, conceived: 0 };
        const F = window.UF && UF.Factions;
        const factionsList = F && F.all ? F.all() : [];
        const people = allFactionPeople();
        let totalMated = 0, totalConceived = 0;

        for (const faction of factionsList) {
            const fId = faction.id;
            const pop = factionPopulation(fId);
            if (pop >= 200) continue;
            const members = people.filter(u => u.data.faction === fId);
            const adults = members.filter(u => eligibleForIntimacy(u));
            if (adults.length < 2) continue;

            // Group by location (site or area)
            const clusters = new Map();
            for (const u of adults) {
                const key = u.data.site !== undefined && u.data.site !== null ? `site:${u.data.site}` : `area:${u.area.x},${u.area.y},${zOf(u)}`;
                if (!clusters.has(key)) clusters.set(key, []);
                clusters.get(key).push(u);
            }

            for (const group of clusters.values()) {
                const males = group.filter(u => u.data.gender === "male" && u.data.lastMatedDate !== familyDate());
                const females = group.filter(u => u.data.gender === "female" && !u.data.pregnancy && u.data.lastMatedDate !== familyDate());
                if (!males.length || !females.length) continue;

                const pairedMales = new Set(), pairedFemales = new Set();
                // 1. Existing partnerships
                for (const m of males) {
                    const pId = m.data.partnerId || m.data.partner;
                    if (pId) {
                        const f = females.find(fem => fem.id === pId && !pairedFemales.has(fem.id));
                        if (f) {
                            pairedMales.add(m.id);
                            pairedFemales.add(f.id);
                            if (handleMated(m, f)) {
                                totalMated++;
                                if (f.data.pregnancy) totalConceived++;
                            }
                        }
                    }
                }

                // 2. Unpartnered compatible adults
                const freeMales = males.filter(m => !pairedMales.has(m.id));
                const freeFemales = females.filter(f => !pairedFemales.has(f.id));
                for (const m of freeMales) {
                    if (pairedMales.has(m.id)) continue;
                    const partner = attemptAdulthoodPairbond(m);
                    if (partner) {
                        pairedMales.add(m.id);
                        pairedFemales.add(partner.id);
                        const f = partner.data.gender === "female" ? partner : m;
                        const male = partner.data.gender === "female" ? m : partner;
                        if (handleMated(male, f)) {
                            totalMated++;
                            if (f.data.pregnancy) totalConceived++;
                        }
                    }
                }
            }
        }
        return { mated: totalMated, conceived: totalConceived };
    }

    function attemptAdulthoodPairbond(u) {
        if (!u || !u.data || u.data.dead || u.data._isDying) return null;
        if (!Number.isFinite(u.data.age) || u.data.age < 15) return null;
        if (["automaton", "undead", "swarm"].includes(u.data.species)) return null;
        if (u.data.willingToPartner === false || u.data.familyDesire === false) return null;

        // Check if u already has an active living partner
        const W = World();
        const existingPartnerId = u.data.partnerId || u.data.partner;
        if (existingPartnerId) {
            const existing = W && W.unit(existingPartnerId);
            if (existing && !existing.data.dead) return existing;
        }

        const H = window.UF && UF.Households;
        const people = allFactionPeople();
        const candidates = people.filter(o => {
            if (!o || !o.data || o.id === u.id) return false;
            if (o.data.dead || o.data._isDying) return false;
            if (o.data.faction !== u.data.faction) return false;
            if (!sameLevel(o, u)) return false;
            if (o.data.gender === u.data.gender) return false;
            if (!Number.isFinite(o.data.age) || o.data.age < 15) return false;
            if (o.data.partnerId || o.data.partner) {
                const po = W && W.unit(o.data.partnerId || o.data.partner);
                if (po && !po.data.dead) return false; // Candidate already partnered
            }
            if ((o.data.species || "human") !== (u.data.species || "human")) return false;
            if (o.data.willingToPartner === false || o.data.familyDesire === false) return false;

            // Strict kinship and incest guard (no parents, children, siblings, or close kin):
            if (u.data.motherId && (u.data.motherId === o.id || (o.data.motherId && u.data.motherId === o.data.motherId))) return false;
            if (u.data.fatherId && (u.data.fatherId === o.id || (o.data.fatherId && u.data.fatherId === o.data.fatherId))) return false;
            if (o.data.motherId && o.data.motherId === u.id) return false;
            if (o.data.fatherId && o.data.fatherId === u.id) return false;
            if (H && H.closeKin && H.closeKin(u, o)) return false;

            return true;
        });

        if (!candidates.length) return null;

        // Deterministic candidate selection: closest age, tiebreak by id
        candidates.sort((a, b) => {
            const diffA = Math.abs((a.data.age || 15) - (u.data.age || 15));
            const diffB = Math.abs((b.data.age || 15) - (u.data.age || 15));
            return diffA - diffB || a.id - b.id;
        });

        const partner = candidates[0];
        u.data.partnerId = partner.id;
        u.data.partner = partner.id;
        u.data.partnerName = partner.name;
        partner.data.partnerId = u.id;
        partner.data.partner = u.id;
        partner.data.partnerName = u.name;

        // Establish independent household via UF.Households.formPair
        if (H && H.formPair) {
            try { H.formPair(u, partner); } catch (e) {}
        }

        addThought(u, `Found my life partner in ${partner.name}.`, 15);
        addThought(partner, `Found my life partner in ${u.name}.`, 15);

        if (window.UF && UF.Events && UF.Events.emit) {
            UF.Events.emit("colonists:pairbonded", u, partner);
        }

        return partner;
    }

    function immigrationWaveSize(pop) {
        if (pop >= 180) return 0;
        if (pop < 50) return 2 + Math.floor(unit01(seed(), SALT.roll, ticks(), pop) * 3); // 2, 3, or 4
        if (pop < 100) return 1 + Math.floor(unit01(seed(), SALT.roll, ticks(), pop) * 2); // 1 or 2
        return 1;
    }

    function immigrationChance(pop) {
        if (pop >= 180) return 0.0;
        if (pop < 50) return 0.80;
        if (pop < 100) return 0.50;
        return 0.20;
    }

    function spawnImmigrants(ref, count) {
        const W = World();
        if (!W) return [];
        const c = colonyState(ref) || colonyState();
        if (!c) return [];
        const fId = c.factionId;
        const pop = factionPopulation(fId);
        if (pop >= 200) return [];
        const want = count !== undefined ? (count | 0) : immigrationWaveSize(pop);
        const actualCount = Math.min(want, 200 - pop);
        if (actualCount <= 0) return [];

        const F = window.UF && UF.Factions ? UF.Factions.get(fId) : null;
        const species = F ? F.species : "human";
        const isPlayer = F ? F.isPlayer : (fId === factionId());
        const s = homeSiteRecord(c) || { id: c.siteId, x: c.site.x, y: c.site.y, area: c.area, faction: fId, name: "the settlement" };
        const radius = c.radius || 4;
        const st = W.state;
        const taken = new Set(allFactionPeople().map(u => u.name));
        const spawned = [];

        for (let i = 0; i < actualCount; i++) {
            const angle = unit01(st.seed, SALT.roll, ticks(), i, 3) * Math.PI * 2;
            const dist = radius + 3 + (i % 2);
            const tx = Math.round(c.site.x + Math.cos(angle) * dist);
            const ty = Math.round(c.site.y + Math.sin(angle) * dist);
            const cell = freeCellNear(levelArea(c), tx, ty, 6) ||
                         freeCellNear(levelArea(c), c.site.x, c.site.y, radius + 5) ||
                         freeCellNear(levelArea(c), c.site.x, c.site.y, radius + 2);
            if (!cell) continue;

            const gender = unit01(st.seed, SALT.gender, ticks(), i, 7) < 0.5 ? "male" : "female";
            const age = 18 + Math.floor(unit01(st.seed, SALT.facet, ticks(), i, 11) * 12); // 18 - 29 young adult
            const ageSeconds = age * 240;

            const u = W.addUnit({
                name: "",
                image: { characterName: "$UF_Human_Male_1_Walk", characterIndex: 0 },
                area: copyArea(c.area),
                z: zOf(c),
                x: cell.x,
                y: cell.y,
                dir: 2,
                data: {
                    kind: isPlayer ? "colonist" : "person",
                    faction: fId,
                    species: species,
                    gender: gender,
                    age: age,
                    ageDays: age,
                    ageSeconds: ageSeconds,
                    stage: "adult",
                    founder: false,
                    site: c.siteId
                }
            });
            if (!u) continue;

            convertPerson(u, st, s, taken);
            addThought(u, "Arrived as a hopeful immigrant to join the settlement.", 12);

            if (F && !u.data._popCounted) {
                F.population = (F.population || 0) + 1;
                u.data._popCounted = true;
            }

            if (window.UF && UF.Goals && UF.Goals.ensure) {
                UF.Goals.ensure(u);
            }

            if (window.UF && UF.Visuals && UF.Visuals.bark) {
                const ev = W.eventOf(u.id);
                if (ev) UF.Visuals.bark(ev, `Glad to have made it to ${s.name || "the settlement"}!`, 180);
            }

            spawned.push(u);
        }

        if (spawned.length > 0) {
            c.lastImmigrationTick = ticks();
            if (window.UF && UF.Households && UF.Households.reconcile) {
                try { UF.Households.reconcile(); } catch (e) {}
            }
            const P = Pillars();
            if (P && P.assignSkillRoster) {
                try { P.assignSkillRoster(c); } catch (e) {}
            }
            if (Array.isArray(c.log)) {
                c.log.push({ tick: ticks(), text: `${spawned.length} immigrants arrived at ${s.name || "the settlement"}` });
            }
            emit("colonists:immigrated", spawned, s);
            emit("factions:immigrated", spawned, s);
        }
        return spawned;
    }

    function stepImmigration(ref) {
        const W = World();
        if (!W) return [];
        // In the test harness, automatic ambient waves are paused so they do not disrupt founder tool benchmarks.
        if (!ref && window.UF && UF.Test && UF.Test.active) return [];
        const targets = ref ? [colonyState(ref)].filter(Boolean) : settlementStates();
        const allSpawned = [];
        for (const c of targets) {
            const fId = c.factionId;
            const pop = factionPopulation(fId);
            if (pop >= 180) continue;
            // Migrant waves have a minimum cooldown between arrivals (at least 300s / 5 minutes real time)
            if (c.lastImmigrationTick && (ticks() - c.lastImmigrationTick < 18000)) continue;
            const chance = immigrationChance(pop);
            const roll = unit01(seed(), SALT.roll, ticks(), c.siteId || 0);
            if (roll < chance) {
                const wave = spawnImmigrants(c);
                allSpawned.push(...wave);
            }
        }
        return allSpawned;
    }

    function stepMerchantCaravan(ref) {
        const W = World();
        if (!W) return null;
        const c = colonyState(ref) || colonyState();
        if (!c || !c.site) return null;

        const time = window.$ufTime;
        const curDay = time ? (time.day || 1) : 1;
        if (curDay % 7 !== 0 && (!window.UF || !UF.Test || !UF.Test.active)) return null;
        if (c.lastCaravanDay === curDay) return null;
        c.lastCaravanDay = curDay;

        const area = levelArea(c);
        const radius = c.radius || 10;
        const spawnAngle = Math.PI * 0.75;
        const sx = Math.round(c.site.x + Math.cos(spawnAngle) * (radius + 15));
        const sy = Math.round(c.site.y + Math.sin(spawnAngle) * (radius + 15));
        const cell = freeCellNear(area, sx, sy, 8) || { x: sx, y: sy };

        const merchant = W.addUnit({
            name: "Trader Jonathan",
            image: { characterName: "$UF_Human_Male_1_Walk", characterIndex: 0 },
            area: copyArea(c.area),
            z: zOf(c),
            x: cell.x,
            y: cell.y,
            dir: 2,
            data: {
                kind: "merchant",
                faction: "merchant_guild",
                species: "human",
                gender: "male",
                age: 35,
                stage: "adult",
                calling: "merchant",
                site: c.siteId,
                ledger: { credits: 200, earned: 0, spent: 0 }
            }
        });

        const animalCell = freeCellNear(area, cell.x + 1, cell.y, 3) || cell;
        const packAnimal = W.addUnit({
            name: "Pack Sheep",
            image: { characterName: "$UF_Sheep", characterIndex: 0 },
            area: copyArea(c.area),
            z: zOf(c),
            x: animalCell.x,
            y: animalCell.y,
            dir: 2,
            data: {
                kind: "wildlife",
                species: "sheep",
                packAnimal: true,
                tamed: true,
                site: c.siteId
            }
        });

        const I = Items();
        if (I) {
            I.give("stone", 10, merchant.id);
            I.give("fiber", 10, merchant.id);
            I.give("stone_axe", 2, merchant.id);
        }

        give(merchant, {
            type: "move",
            target: { x: c.site.x + 2, y: c.site.y + 2 },
            params: { tradeVisit: true }
        });
        give(packAnimal, {
            type: "move",
            target: { x: c.site.x + 3, y: c.site.y + 2 },
            params: { followMerchant: merchant.id }
        });

        addThought(merchant, "Arrived at a promising frontier settlement to trade!", 10);
        if (window.UF && UF.Visuals && UF.Visuals.bark) {
            const ev = W.eventOf(merchant.id);
            if (ev) UF.Visuals.bark(ev, "Trade caravan has arrived! Rare goods and barter!", 240);
        }
        emit("caravan:arrived", merchant, packAnimal, c);
        if (Array.isArray(c.log)) {
            c.log.push({ tick: ticks(), text: `Traveling merchant caravan arrived at ${c.site.name || "the settlement"}` });
        }
        return { merchant, packAnimal };
    }

    function updateAgeAppearance(u) {
        if (!u.data) return;
        if (u.data.age === undefined) {
            u.data.age = 25;
            u.data.stage = "adult";
        }
        const age = u.data.age;
        u.data.stage = age >= 55 ? "elder" : (age < 12 ? "child" : (age < 15 ? "teen" : "adult"));
        const isOffspring = !!(u.data.motherId || u.data.fatherId || (u.data.parents && u.data.parents.length));
        if ((isOffspring || u.data.founder) && (u.data.stage === "adult" || u.data.stage === "elder" || age >= 15) && !u.data.partnerId && !u.data.partner) {
            attemptAdulthoodPairbond(u);
        }
        const isMale = u.data.gender === "male";
        const isHuman = !u.data.species || u.data.species === "human";

        // Preserve legacy test units that test static variations without genetics
        if (u.name && u.name.startsWith("TEST_") && !u.data.genetics && u.data.variation) {
            const v = u.data.variation || 1;
            let targetImg = isHuman ? (isMale ? `$UF_Human_Male_${v}_Walk` : `$UF_Human_Female_${v}_Walk`) : (isMale ? "$Adam" : "$Eve");
            if (age < 2) {
                targetImg = "$Baby";
            } else if (age < 12) {
                targetImg = isHuman ? "$UF_Human_Child_Walk" : (isMale ? "$Child_Boy" : "$Child_Girl");
                if (isHuman) u.data.face = { sheet: "UF_Faces_human_1", index: isMale ? 6 : 7 };
            } else if (age < 15) { // User specification: age 15 is adult
                targetImg = isHuman ? "$UF_Human_Child_Walk" : (isMale ? "$Teen_Boy" : "$Teen_Girl");
                if (isHuman) u.data.face = { sheet: "UF_Faces_human_1", index: isMale ? 6 : 7 };
            } else if (age >= 55) {
                const tiers = tiersFor(u.data.species, u.data.gender, v);
                targetImg = (tiers && tiers[u.data.tier | 0]) || targetImg;
                if (isHuman) u.data.face = { sheet: "UF_Faces_human_2", index: isMale ? 6 : 7 };
            } else {
                const tiers = tiersFor(u.data.species, u.data.gender, v);
                targetImg = (tiers && tiers[u.data.tier | 0]) || targetImg;
                if (isHuman) u.data.face = { sheet: isMale ? "UF_Faces_human_1" : "UF_Faces_human_2", index: Math.min(5, Math.max(0, (v | 0) - 1)) };
            }
            if (u.image && u.image.characterName !== targetImg) {
                u.image.characterName = targetImg;
                delete u.data.tint;
                const ev = World() ? World().eventOf(u.id) : null;
                if (ev) ev.setImage(targetImg, 0);
            }
            return;
        }

        // Modular procedural generator for human colonists
        if (isHuman) {
            if (!u.data.genetics) {
                u.data.genetics = geneticsFor(seed(), u.id, null, null, u.data.variation);
            }
            const G = Generator();
            if (G && typeof G.applyToUnit === "function") {
                G.applyToUnit(u, seed());
                delete u.data.tint;
                return;
            }
        }

        let targetImg = isHuman ? (isMale ? `$UF_Human_Male_${u.data.variation || 1}_Walk` : `$UF_Human_Female_${u.data.variation || 1}_Walk`) : (isMale ? "$Adam" : "$Eve");
        if (age < 2) targetImg = "$Baby";
        else if (age < 12) targetImg = isHuman ? "$UF_Human_Child_Walk" : (isMale ? "$Child_Boy" : "$Child_Girl");
        else if (age < 15) targetImg = isHuman ? "$UF_Human_Child_Walk" : (isMale ? "$Teen_Boy" : "$Teen_Girl");
        else {
            const tiers = tiersFor(u.data.species || "human", u.data.gender, u.data.variation);
            targetImg = (tiers && tiers[u.data.tier | 0]) || targetImg;
        }
        if (u.image && u.image.characterName !== targetImg) {
            u.image.characterName = targetImg;
            delete u.data.tint;
            const ev = World() ? World().eventOf(u.id) : null;
            if (ev) ev.setImage(targetImg, 0);
        }
    }

    function ensureColonistsGeneticsAndAging() {
        const W = World();
        if (!W) return;
        const all = simulationUnits();
        for (const u of all) {
            if (!u || !u.data) continue;
            const d = u.data;
            if (d._geneticsEnsured) continue;
            let changed = false;
            if (d.age === undefined) {
                d.age = 20 + Math.floor(unit01(seed(), 0xa9e, u.id, 0) * 20);
                d.ageSeconds = 0;
                d.stage = d.age >= 55 ? "elder" : (d.age < 12 ? "child" : (d.age < 15 ? "teen" : "adult"));
                changed = true;
            }
            if (!d.variation) {
                d.variation = 1 + (Math.abs(u.id | 0) % 6);
                changed = true;
            }
            if (!d.genetics) {
                d.genetics = geneticsFor(seed(), u.id, null, null, d.variation);
                changed = true;
            }
            if ((!d.species || d.species === "human") && (!d.face || !d.face.sheet || d.face.sheet.startsWith("People") || (u.image && (u.image.characterName === "$Adam" || u.image.characterName === "$Eve")))) {
                changed = true;
            }
            if (changed) {
                updateAgeAppearance(u);
            }
            d._geneticsEnsured = true;
        }
    }

    function myBedTarget(u) {
        if (!u || !u.data) return null;
        if (u.data.bed === null) return null;
        if (u.data.bed && sameLevel(u.data.bed, u)) return u.data.bed;
        const H = window.UF && UF.Households;
        const h = H && H.of ? H.of(u) : null;
        if (h && h.home && Array.isArray(h.home.beds)) {
            const assigned = h.home.beds.find(b => b.unitId === u.id);
            if (assigned) {
                u.data.bed = { area: copyArea(h.home.area || u.area), x: assigned.x, y: assigned.y, z: zOf(u), isShared: !!h.home.isShared };
                return u.data.bed;
            }
            const free = h.home.beds.find(b => !b.unitId);
            if (free) {
                free.unitId = u.id;
                u.data.bed = { area: copyArea(h.home.area || u.area), x: free.x, y: free.y, z: zOf(u), isShared: !!h.home.isShared };
                return u.data.bed;
            }
        }
        return null;
    }

    function hasBedObject(u) {
        const bed = myBedTarget(u);
        if (!bed) return false;
        const O = Objects();
        if (!O) return false;
        const here = O.atIn(levelArea(u), bed.x, bed.y);
        return !!(here && (here.id === "floor_straw" || here.id === "bed_wood" || hasTag(here, "bed")));
    }

    function makeBedJob(u) {
        const O = Objects();
        const I = Items();
        const c = colonyState(u);
        if (!O || !I || !c) return null;
        const bed = myBedTarget(u);
        if (!bed) return null;
        if (hasBedObject(u)) return null;
        const step = {
            id: `make_bed_${u.id}`,
            build: "floor_straw",
            cells: [[bed.x - c.site.x, bed.y - c.site.y]],
            exact: true
        };
        return buildStepJob(u, step);
    }

    function isDwellingWarmedByFire(u) {
        if (!u || !u.data) return false;
        const c = colonyState(u);
        const fire = nearestFire(u);
        if (!fire || !sameLevel(fire, u)) return false;

        const H = window.UF && UF.Households;
        const h = H && H.of ? H.of(u) : null;
        const home = h && h.home;

        // 1. Inside a household home with hearth/fire
        if (home) {
            const inHome = (u.x >= home.x && u.x <= home.x + home.w && u.y >= home.y && u.y <= home.y + home.h) ||
                ((home.annexes || []).some(a => u.x >= a.x && u.x <= a.x + a.w && u.y >= a.y && u.y <= a.y + a.h));
            if (inHome) {
                const fireInHome = (fire.x >= home.x - 1 && fire.x <= home.x + home.w + 1 && fire.y >= home.y - 1 && fire.y <= home.y + home.h + 1) ||
                    (home.hearth && Math.hypot(fire.x - home.hearth.x, fire.y - home.hearth.y) <= 3);
                if (fireInHome) return true;
            }
        }

        // 2. Inside town hall / settlement shelter footprint with campfire lit
        if (c && c.site) {
            const fireNearSite = Math.hypot(fire.x - c.site.x, fire.y - c.site.y) <= 3;
            const insideShelter = Math.abs(u.x - c.site.x) <= 4 && Math.abs(u.y - c.site.y) <= 4;
            if (fireNearSite && insideShelter) return true;
        }

        // 3. Within reasonable dwelling/room warmth radius of the fire
        const d = Math.hypot(u.x - fire.x, u.y - fire.y);
        if (d <= 6) {
            const E = window.UF && UF.Enclosure;
            if (E && E.sameRoom && E.sameRoom(levelArea(u), u.x, u.y, fire.x, fire.y)) return true;
            if (d <= 4.5) return true;
        }

        return false;
    }

    function fireSleepCells(u, fire, taken) {
        if (!fire) return [];
        if (fire.area && !sameLevel(fire, u)) return [];
        const J = Jobs();
        if (!J) return [];
        const area = levelArea(u);
        const candidates = [];
        const F = window.UF && UF.Fire;
        // Radius 2 then 1, 3, 4: comfortable distance around hearth, never on the fire (r=0)
        for (const r of [2, 1, 3, 4]) {
            const ringSpots = [];
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const x = fire.x + dx, y = fire.y + dy;
                    const k = `${x},${y}`;
                    if (taken && taken.has(k)) continue;
                    if (F && F.isBurning && F.isBurning(area, x, y)) continue;
                    if (!J.standable(area, x, y, u.id)) continue;
                    const dist = Math.hypot(x - u.x, y - u.y);
                    ringSpots.push({ x, y, dist, fire: { x: fire.x, y: fire.y } });
                }
            }
            ringSpots.sort((a, b) => a.dist - b.dist);
            candidates.push(...ringSpots);
        }
        return candidates;
    }

    function sleepJob(u, opts) {
        const O = Objects();
        const c = colonyState(u);
        const frames = opts && opts.frames > 0 ? opts.frames | 0 : sleepFrames(u);
        const extra = opts && opts.longRest ? { longRest: true } : {};
        if (sleepingHours(u) && eligibleForIntimacy(u)) {
            checkNighttimeSleepMating(u);
        }
        // If colonist has no bed object and isn't critically exhausted, prioritize making their bed!
        // (Not while DEUS_Projects manages settlement construction: the communal shelter supplies the beds.)
        if (!projectsManaged() && !hasBedObject(u) && (!u.data.needs || (u.data.needs.sleep || 0) < 90)) {
            const bedJob = makeBedJob(u);
            if (bedJob) return give(u, bedJob);
        }

        const taken = new Set(activeJobs().filter(j => j.type === "sleep" && j.assigned !== u.id && j.target && sameLevel(j.target, u)).map(j => `${j.target.x},${j.target.y}`));
        const beds = O ? O.findIn(levelArea(u), { near: { x: c ? c.site.x : u.x, y: c ? c.site.y : u.y }, radius: (c ? c.radius : 8) + 6, tags: ["bed"] }).filter(b => !taken.has(`${b.x},${b.y}`)) : [];
        const owned = UF.Ownership && UF.Ownership.bedOf(u);
        const permitted = beds.filter(b => {
            const owner = UF.Ownership && UF.Ownership.ownerOf({ kind: "object", area: copyArea(u.area), z: zOf(u), x: b.x, y: b.y });
            return !owner || owner.kind === "public" || owner.kind === "unit" && owner.id === u.id || owner.kind === "faction" && owner.id === u.data.faction;
        });
        const fire = nearestFire(u);
        const fireRef = fire ? { x: fire.x, y: fire.y } : null;
        const myBed = (u.data && u.data.bed && sameLevel(u.data.bed, u)) ? u.data.bed : (owned && sameLevel(owned, u) ? owned : null);
        const spots = myBed && !taken.has(`${myBed.x},${myBed.y}`) ? [{ x: myBed.x, y: myBed.y, fire: fireRef }] : [];

        // Permitted unoccupied beds in the settlement take precedence over sleeping on the floor:
        spots.push(...permitted.map(b => ({ x: b.x, y: b.y, fire: fireRef })));

        // Sleeping on the ground around the campfire is a fallback ONLY when no beds are available:
        if (spots.length === 0 && fire) {
            const fireSpots = fireSleepCells(u, fire, taken);
            spots.push(...fireSpots);
        }
        // NEVER sleep on c.site (the campfire)!
        spots.push({ x: u.x, y: u.y, fire: fireRef });
        for (const s of spots) {
            const params = Object.assign({ frames }, extra);
            if (s.fire) params.faceTowards = { x: s.fire.x, y: s.fire.y };
            const j = give(u, { type: "sleep", target: { x: s.x, y: s.y }, params });
            if (j) return j;
        }
        return null;
    }

    function natureJob(u) {
        const O = Objects();
        const water = waterNear(u, NATURE_RADIUS);
        const tree = O ? O.findIn(levelArea(u), { near: { x: u.x, y: u.y }, radius: NATURE_RADIUS, tags: ["tree"], limit: 1 })[0] : null;
        const J = Jobs();
        for (const spot of [water, tree].filter(Boolean)) {
            for (const [dx, dy] of NEIGHBORS) {
                const x = spot.x + dx, y = spot.y + dy;
                if (!J.standable(levelArea(u), x, y, u.id)) continue;
                const j = give(u, { type: "move", target: { x, y }, params: { nature: true } });
                if (j) return j;
                break;
            }
        }
        return null;
    }

    // An open designation the colonist can do, the best by the culture's priorities, skill and distance.
    function designationJob(u) {
        if (!isColonist(u)) return null; // open UI designations belong to the player, not autonomous NPC settlements
        const J = Jobs();
        const open = J.open().filter(j => j.target && sameLevel(j.target, u));
        if (!open.length) return null;
        const score = j => {
            const skill = SKILL_OF[j.type] ? ((u.data.skills && u.data.skills[SKILL_OF[j.type]]) || 0) : 0;
            const dist = Math.hypot(j.target.x - u.x, j.target.y - u.y);
            return priorityOf(j.type, u) * (1 + skill / 20) * (1 + (j.priority | 0)) / (1 + dist / 20);
        };
        open.sort((a, b) => score(b) - score(a) || a.id - b.id);
        for (const j of open.slice(0, 6)) {
            const taken = J.take(u.id, x => x.id === j.id);
            if (taken && taken.state !== "failed") return taken;
        }
        return null;
    }

    // Tools: use the best carried tool for the job at hand (an instant equip job, so it shows).
    function toolJob(u, jobType) {
        const I = Items();
        if (!I) return null;
        const current = equippedItem(u, "tool");
        const rate = it => { const t = itemType(it.type); return t && t.tool && typeof t.tool[jobType] === "number" ? t.tool[jobType] : 1; };
        let best = null;
        for (const it of I.inventoryOf(u.id)) {
            const t = itemType(it.type);
            if (!t || !t.tool) continue;
            if (!best || rate(it) > rate(best)) best = it;
        }
        if (!best || (current && rate(current) >= rate(best))) return null;
        if (current && current.id === best.id) return null;
        return give(u, { type: "equip", params: { itemId: best.id } });
    }

    //-------------------------------------------------------------------------
    // The society plan

    const stepObject = step => {
        if (!Objects()) return null;
        const t = Objects().type(step.build);
        if (step.build === "well" && (!t || !t.build)) {
            return { ...(t || {}), id: "well", passable: false, build: { items: { stone: 2, wood: 2 }, work: 40 } };
        }
        if (step.build === "latrine_pit" && (!t || !t.build)) {
            return { ...(t || {}), id: "latrine_pit", passable: false, build: { items: { wood: 2 }, work: 30 } };
        }
        if (step.build === "outhouse" && (!t || !t.build)) {
            return { ...(t || {}), id: "outhouse", passable: false, build: { items: { wood: 4 }, work: 60 } };
        }
        return t;
    };
    const _siteCountCache = new Map();
    let _siteCountCacheTick = -1;
    function siteCount(objectId, ref) {
        const c = colonyState(ref), O = Objects();
        if (!c || !O) return 0;
        if (_siteCountCacheTick !== localTicks) {
            _siteCountCache.clear();
            _siteCountCacheTick = localTicks;
        }
        const key = `${objectId}_${c.id || "0"}`;
        if (_siteCountCache.has(key)) return _siteCountCache.get(key);
        const count = O.findIn(levelArea(c), { near: { x: c.site.x, y: c.site.y }, radius: c.radius + 1, id: objectId, unsorted: true }).length;
        _siteCountCache.set(key, count);
        return count;
    }
    // A build step's cells: [{ x, y, state: "done" | "skipped" | "todo" }]. Furniture (passable objects) and the site's
    // own centre piece count wherever the site already has them; walls are counted cell by cell.
    function buildCells(step, ref) {
        const c = colonyState(ref), O = Objects();
        const out = [];
        if (!c || !O) return out;
        if (step._cachedCells && step._cachedCellsTick === localTicks && step._cachedCellsInvalidatedAt === planInvalidatedAt) {
            return step._cachedCells;
        }
        const isFloor = step.build === "road" || (step.build !== "floor_straw" && ((window.UF && UF.Floors && UF.Floors.FLOOR_IDS && UF.Floors.FLOOR_IDS.includes(step.build)) || /^floor_/.test(step.build)));
        if (isFloor) {
            const W = World(), F = window.UF && UF.Floors, T = window.UF && UF.Tiles;
            for (const [dx, dy] of (step.cells || [])) {
                const x = c.site.x + dx, y = c.site.y + dy;
                const here = O.atIn(levelArea(c), x, y);
                let state = "todo";
                const currentKind = F && F.kindAt ? F.kindAt(levelArea(c), x, y) : (T && T.kindOfTile ? T.kindOfTile(W.getTile(c.area.x, c.area.y, x, y, 0, zOf(c))) : null);
                if (currentKind && currentKind.id === step.build) state = "done";
                else if (Jobs() && Jobs().isWaterAt(levelArea(c), x, y)) state = "blocked";
                else if (here && here.passable !== true && !hasTag(here, "bed") && !hasTag(here, "fire") && !hasTag(here, "furniture") && !hasTag(here, "storage")) {
                    state = (here.actions && Object.keys(here.actions).length > 0) ? "todo" : "blocked";
                }
                out.push({ x, y, state, here });
            }
            step._cachedCells = out;
            step._cachedCellsTick = localTicks;
            step._cachedCellsInvalidatedAt = planInvalidatedAt;
            return out;
        }
        const t = stepObject(step);
        if (!t) return out;
        const centre = ((catalog().sites && catalog().sites.kinds && catalog().sites.kinds[(homeSiteRecord(ref) || {}).kind]) || {}).center;
        const cells = step.cells || [];
        const byCount = !step.exact && (t.passable === true || t.id === centre) && siteCount(t.id, ref) >= cells.length;
        for (const [dx, dy] of cells) {
            const x = c.site.x + dx, y = c.site.y + dy;
            const here = O.atIn(levelArea(c), x, y);
            let state = "todo";
            if (UF.Agriculture && UF.Agriculture.reserved({ area: copyArea(c.area), x, y, z: zOf(c) })) state = "blocked";
            else if (byCount || (here && here.id === t.id)) state = "done";
            else if (step.upgrade && here && here.id !== t.id && hasTag(here, "wall") && hasTag(t, "wall")) state = "todo";
            else if (here && (hasTag(here, "building") || hasTag(here, "ruin"))) state = step.exact ? "blocked" : "skipped";
            else if (here && here.passable !== true && (!here.actions || !Object.keys(here.actions).length)) state = step.exact ? "blocked" : "skipped";
            else if (Jobs() && Jobs().isWaterAt(levelArea(c), x, y)) state = step.exact ? "blocked" : "skipped"; // nothing is built on water
            else if (zOf(c) !== 0 && (!World().walkable || !World().walkable(c.area.x, c.area.y, x, y, { z: zOf(c), ground: true }))) state = step.exact ? "blocked" : "skipped"; // no excavation or unsupported airborne construction
            out.push({ x, y, state, here });
        }
        step._cachedCells = out;
        step._cachedCellsTick = localTicks;
        step._cachedCellsInvalidatedAt = planInvalidatedAt;
        return out;
    }
    const outputOf = recipe => Object.keys((recipe && recipe.outputs) || {})[0] || null;
    const holds = (u, typeId) => carriedCount(u, typeId) > 0;
    // An "each" craft step is met for a colonist that holds the output, or (equip steps) wears it or something of a higher tier.
    function satisfiesEach(u, step, out) {
        if (step.equip) {
            const eq = equippedItem(u, "clothes"), tOut = itemType(out);
            const tEq = eq ? itemType(eq.type) : null;
            return !!eq && (eq.type === out || (!!tOut && !!tOut.wear && !!tEq && !!tEq.wear && tEq.wear.tier >= tOut.wear.tier));
        }
        return holds(u, out);
    }
    const _colonyCountCache = new Map();
    let _colonyCountCacheTick = -1;
    function colonyCount(typeId, ref) {
        if (_colonyCountCacheTick !== localTicks) {
            _colonyCountCache.clear();
            _colonyCountCacheTick = localTicks;
        }
        const c = colonyState(ref);
        if (!c) return 0;
        const key = `${typeId}:${c.siteId || "site"}:${zOf(c)}`;
        if (_colonyCountCache.has(key)) return _colonyCountCache.get(key);
        const I = Items();
        if (!I) return 0;
        const types = [typeId];
        if (typeId === "wood") types.push("log");
        else if (typeId === "log") types.push("wood");
        else if (typeId === "straw") types.push("fiber");
        else if (typeId === "fiber") types.push("straw");
        else if (typeId === "stone") types.push("rocks_small");
        else if (typeId === "rocks_small") types.push("stone");
        let n = 0;
        for (const t of types) {
            for (const u of siteColonists(ref)) n += I.count(u.id, t);
            for (const f of I.find({ area: levelArea(c), z: zOf(c), near: { x: c.site.x, y: c.site.y }, radius: c.radius + 15, id: t })) n += f.item.count;
            if (window.UF && UF.Containers) {
                const containers = UF.Containers.all(levelArea(c), zOf(c));
                for (const cont of containers) {
                    const d = chebyshev(cont.x, cont.y, c.site.x, c.site.y);
                    if (d <= c.radius + 10) {
                        for (const it of UF.Containers.itemsIn(cont.id)) {
                            if (it.type === t) n += (it.count || 1);
                        }
                    }
                }
            }
        }
        _colonyCountCache.set(key, n);
        return n;
    }
    const stockCount = (step, ref) => foodStored(ref).filter(it => (step.stock || []).some(tag => hasTag(itemType(it.type), tag))).reduce((n, it) => n + it.count, 0);

    let planInvalidatedAt = 0;
    const _planStatusCacheById = new Map();
    /** [{ id, done, detail }] for every plan step, evaluated from the world now (and recorded in state). */
    function planStatus(ref, selectedSteps) {
        const c = colonyState(ref);
        if (!c) return [];
        const people = siteColonists(ref);
        return (selectedSteps || effectivePlan(ref)).map(step => {
            if (step.done === true) {
                const total = step.cells ? step.cells.length : 1;
                const detail = step.build ? (total === 1 ? "built" : `${total}/${total}`) : (step.detail || "done");
                return { id: step.id, done: true, detail };
            }
            const _stepId = step.id || "";
            const _cached = _planStatusCacheById.get(_stepId);
            if (_cached && _cached.tick >= planInvalidatedAt && (localTicks - _cached.tick < 30)) {
                return Object.assign({}, _cached.status);
            }
            if (step._cachedStatus && step._cachedTick >= planInvalidatedAt && (localTicks - step._cachedTick < 30)) {
                return Object.assign({}, step._cachedStatus);
            }
            let done = false, detail = "";
            if (step.build) {
                const cells = buildCells(step, ref);
                const finished = cells.filter(x => x.state === "done" || (!step.exact && x.state === "skipped"));
                done = cells.length > 0 && finished.length === cells.length;
                const t = stepObject(step);
                const isFloor = step.build === "road" || (step.build !== "floor_straw" && ((window.UF && UF.Floors && UF.Floors.FLOOR_IDS && UF.Floors.FLOOR_IDS.includes(step.build)) || /^floor_/.test(step.build)));
                detail = cells.length === 1 ? (done ? "built" : "to build") : `${finished.length}/${cells.length}`;
                if (!t && !isFloor) { done = !step.exact; detail = "unknown object"; }
                if (done && step.done !== true) step.done = true;
                else if (!done) step.done = cells.map((x, i) => (x.state === "done" || (!step.exact && x.state === "skipped") ? i : -1)).filter(i => i >= 0);
                if (step.exact && cells.some(x => x.state === "blocked")) detail += " (blocked)";
            } else if (step.craft) {
                const r = recipeOf(step.craft), out = outputOf(r);
                if (!r || !out) { done = true; detail = "unknown recipe"; }
                else if (step.each) {
                    const recipients = step.goalOwner ? people.filter(u => u.id === step.goalOwner) : people;
                    const have = recipients.filter(u => satisfiesEach(u, step, out)).length;
                    done = recipients.length > 0 && have >= recipients.length;
                    detail = `${have}/${recipients.length}`;
                } else {
                    const n = colonyCount(out, ref), want = step.count | 0 || 1;
                    done = n >= want;
                    detail = `${Math.min(n, want)}/${want}`;
                }
                step.done = done;
            } else if (step.stock) {
                const n = stockCount(step, ref), want = step.count | 0 || 1;
                done = n >= want;
                detail = stockpilesStoring(step.stock[0], ref).length ? `${Math.min(n, want)}/${want}` : "no larder";
                step.done = done;
            } else {
                done = true;
                detail = "nothing to do";
                step.done = true;
            }
            const res = { id: step.id, done, detail };
            step._cachedStatus = res;
            step._cachedTick = localTicks;
            if (step.id) _planStatusCacheById.set(step.id, { status: res, tick: localTicks });
            return res;
        });
    }
    const stepLabel = step => capitalize(String(step.id || "").replace(/_/g, " "));
    const planText = ref => {
        const steps = effectivePlan(ref);
        return planStatus(ref, steps).map(s => `${stepLabel(steps.find(p => p.id === s.id))}: ${s.done ? (s.detail === "built" || s.detail === "to build" ? "built" : "done") : s.detail}`).join(" · ");
    };

    // What a colonist would do for a build step: [{ type, target, params }] candidates in order of preference.
    function buildStepJob(u, step, failedMaterials) {
        const I = Items();
        const isFloor = step.build === "road" || (step.build !== "floor_straw" && ((window.UF && UF.Floors && UF.Floors.FLOOR_IDS && UF.Floors.FLOOR_IDS.includes(step.build)) || /^floor_/.test(step.build)));
        if (isFloor) {
            const c = colonyState(u);
            const cult = cultureOf(u) || {};
            const floorSpec = cult.floor || { kind: step.build, item: step.build === "floor_stone" ? "stone" : step.build === "floor_rushes" ? "straw" : "log", count: 1 };
            const itemNeeded = step.build === "road" ? null : floorSpec.item;
            const countNeeded = step.build === "road" ? 0 : (floorSpec.count || 1);
            if (itemNeeded && failedMaterials && failedMaterials.has(itemNeeded)) return null;
            let itemSourceSearched = false, itemSrc = null;
            for (const cell of buildCells(step, u)) {
                if (cell.state !== "todo") continue;
                const target = { x: cell.x, y: cell.y };
                if (cell.here && cell.here.passable !== true && !hasTag(cell.here, "wall") && !hasTag(cell.here, "door") && !hasTag(cell.here, "building") && !cell.here.build && cell.here.actions && Object.keys(cell.here.actions).length) {
                    const action = Object.keys(cell.here.actions)[0];
                    return { type: action, target, params: { plan: step.id } };
                }
                if (activeJobs().some(j => j.type === "floor" && j.assigned !== u.id && j.target && j.target.x === cell.x && j.target.y === cell.y)) {
                    continue;
                }
                if (step.build === "road" || countNeeded === 0 || !itemNeeded) {
                    return { type: "floor", target, params: { kind: "road", item: null, count: 0, force: true, plan: step.id } };
                }
                const carried = I ? I.count(u.id, itemNeeded) : 0;
                const onCell = I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, itemNeeded) : 0;
                const inFlight = activeJobs().some(j => (j.type === "haul" || j.type === "fetch") && j.assigned !== u.id && j.params && j.params.to && j.params.to.x === cell.x && j.params.to.y === cell.y);
                if (carried >= countNeeded || onCell >= countNeeded) {
                    return { type: "floor", target, params: { kind: step.build, item: itemNeeded, count: countNeeded, force: true, plan: step.id } };
                }
                if (inFlight) continue;
                const ground = groundItemsNear(u, { radius: Math.min(SEARCH_RADIUS + 12, 36), id: itemNeeded }).find(f => !onBuildCell(f.x, f.y, u, itemNeeded) && (f.x !== cell.x || f.y !== cell.y));
                if (ground) return { type: "haul", target: { x: ground.x, y: ground.y }, params: { itemId: ground.item.id, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
                if (!itemSourceSearched) {
                    itemSourceSearched = true;
                    itemSrc = objectSourceNear(u, itemNeeded, SEARCH_RADIUS);
                }
                if (itemSrc) return { type: itemSrc.action, target: { x: itemSrc.x, y: itemSrc.y }, params: { plan: step.id } };
            }
            if (itemNeeded && failedMaterials) failedMaterials.add(itemNeeded);
            return null;
        }
        const t = stepObject(step);
        if (!t || !t.build || !I) return null;
        const c = colonyState(u);
        const needs = t.build.items || {};
        const countOnCellAt = (cell, id) => {
            let cnt = I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, id) : 0;
            if (id === "wood") cnt += I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "log") : 0;
            else if (id === "straw") cnt += I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "fiber") : 0;
            else if (id === "stone") cnt += I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "rocks_small") : 0;
            return cnt;
        };
        const candidateCells = buildCells(step, u).filter(cell => cell.state === "todo");
        if (candidateCells.length > 1) {
            for (const cCell of candidateCells) {
                cCell._dist = Math.hypot(cCell.x - u.x, cCell.y - u.y);
                cCell._ready = Object.keys(needs).every(id => countOnCellAt(cCell, id) >= (needs[id] | 0)) ? 1 : 0;
            }
            candidateCells.sort((a, b) => (b._ready - a._ready) || (a._dist - b._dist));
        }
        const missingFailed = new Set();
        for (const cell of candidateCells) {
            const target = { x: cell.x, y: cell.y };
            const here = cell.here;
            if (hasTag(t, "fire") && UF.FireSafety) {
                const clearance = UF.FireSafety.hearthPreparation(u, { area: copyArea(c.area), z: zOf(c), ...target });
                if (clearance.spec) return Object.assign({}, clearance.spec, { params: Object.assign({}, clearance.spec.params, { plan: step.id }) });
                if (!clearance.safe) continue;
            }
            // A tree or boulder on the cell is worked away first (its yields land on the cell).
            // Do NOT clear walls, doors, or buildings!
            if (here && here.passable !== true && !hasTag(here, "wall") && !hasTag(here, "door") && !hasTag(here, "building") && !here.build && here.actions && Object.keys(here.actions).length) {
                const action = Object.keys(here.actions)[0];
                return { type: action, target, params: { plan: step.id } };
            }

            // Check if another colonist is already building this cell:
            if (activeJobs().some(j => j.type === "build" && j.assigned !== u.id && j.target && j.target.x === cell.x && j.target.y === cell.y)) {
                continue;
            }

            const needs = t.build.items || {};
            const countOnCell = (id) => {
                let cnt = I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, id) : 0;
                if (id === "wood") cnt += I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "log") : 0;
                else if (id === "straw") cnt += I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "fiber") : 0;
                else if (id === "stone") cnt += I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "rocks_small") : 0;
                return cnt;
            };
            const missing = Object.keys(needs).filter(id => {
                const onCell = countOnCell(id);
                const inFlight = activeJobs().filter(j => (j.type === "haul" || j.type === "fetch") && j.assigned !== u.id && j.params && j.params.to && j.params.to.x === cell.x && j.params.to.y === cell.y).length;
                return (onCell + inFlight) < (needs[id] | 0);
            });

            if (!missing.length) {
                const allHere = Object.keys(needs).every(id => countOnCell(id) >= (needs[id] | 0));
                if (allHere) {
                    if (window.UF && UF.Jobs && UF.Jobs.ReservationManager && UF.Jobs.ReservationManager.isReservedByOther(u.id, target)) {
                        continue;
                    }
                    return { type: "build", target, params: { objectId: t.id, plan: step.id, stores: step.stores || null } };
                }
                // Materials are currently in flight with another colonist: skip to next cell to avoid duplicating effort!
                continue;
            }

            const m = missing[0];
            if (missingFailed.has(m) || (failedMaterials && failedMaterials.has(m))) continue;

            // Resource Resolver Integration: check stored/accessible materials FIRST
            if (window.UF && UF.Resources && UF.Resources.resolve) {
                const res = UF.Resources.resolve({
                    typeId: m,
                    quantity: 1,
                    actor: u,
                    purpose: "construction",
                    targetLocation: { x: cell.x, y: cell.y, z: zOf(c), area: copyArea(c.area) },
                    projectId: step.id
                });
                if (res && res.allocations && res.allocations.length > 0) {
                    const alloc = res.allocations[0];
                    if (alloc.sourceKind === "carried") {
                        return { type: "haul", target: { x: u.x, y: u.y }, params: { itemId: alloc.itemId, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
                    } else if (alloc.sourceKind === "container") {
                        return { type: "haul", target: { x: alloc.x, y: alloc.y }, params: { itemId: alloc.itemId, fromContainer: alloc.containerId, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
                    } else if (alloc.sourceKind === "loose" || alloc.sourceKind === "household" || alloc.sourceKind === "staged") {
                        return { type: "haul", target: { x: alloc.x, y: alloc.y }, params: { itemId: alloc.itemId, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
                    }
                } else if (res && res.harvestDemand) {
                    return { type: res.harvestDemand.action, target: { x: res.harvestDemand.x, y: res.harvestDemand.y }, params: { plan: step.id } };
                }
            }

            let carried = carriedOf(u, m)[0];
            let ground = groundItemsNear(u, { radius: Math.min(SEARCH_RADIUS + 12, 36), id: m }).find(f => !onBuildCell(f.x, f.y, u, m) && (f.x !== cell.x || f.y !== cell.y));
            let src = objectSourceNear(u, m, SEARCH_RADIUS);
            if (!carried && !ground && !src) {
                const alt = m === "wood" ? "log" : m === "straw" ? "fiber" : m === "stone" ? "rocks_small" : null;
                if (alt) {
                    carried = carriedOf(u, alt)[0];
                    ground = groundItemsNear(u, { radius: Math.min(SEARCH_RADIUS + 12, 36), id: alt }).find(f => !onBuildCell(f.x, f.y, u, alt) && (f.x !== cell.x || f.y !== cell.y));
                    src = objectSourceNear(u, alt, SEARCH_RADIUS);
                }
            }
            if (carried) return { type: "haul", target: { x: u.x, y: u.y }, params: { itemId: carried.id, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
            if (ground) return { type: "haul", target: { x: ground.x, y: ground.y }, params: { itemId: ground.item.id, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
            if (src) return { type: src.action, target: { x: src.x, y: src.y }, params: { plan: step.id } };
            const prey = preyYielding(u, m, huntRadius());
            if (prey) return { type: "hunt", target: { x: prey.x, y: prey.y }, params: { unitId: prey.id, plan: step.id } };
            missingFailed.add(m);
            if (failedMaterials) failedMaterials.add(m);
        }
        return null;
    }

    function gatherInputsJob(u, recipe, step) {
        const I = Items();
        const c = colonyState(u);
        const claimedItemIds = new Set(activeJobs().filter(j => (j.type === "fetch" || j.type === "haul") && j.params && j.params.itemId).map(j => j.params.itemId));
        for (const [id, want] of Object.entries(recipe.inputs || {})) {
            if (carriedCount(u, id) >= (want | 0)) continue;

            if (window.UF && UF.Resources && UF.Resources.resolve) {
                const res = UF.Resources.resolve({
                    typeId: id,
                    role: (recipe.roles && recipe.roles[id]) || id,
                    quantity: (want | 0) - carriedCount(u, id),
                    actor: u,
                    targetLocation: { area: levelArea(u), x: u.x, y: u.y, z: zOf(u) },
                    purpose: "craft",
                    projectId: step ? step.id : null
                });
                if (res && res.allocations && res.allocations.length > 0) {
                    const alloc = res.allocations[0];
                    if (alloc.sourceKind === "container") {
                        return { type: "fetch", target: { x: alloc.x, y: alloc.y }, params: { itemId: alloc.itemId, fromContainer: alloc.containerId, plan: step.id, each: !!step.each } };
                    } else if (alloc.sourceKind === "loose" || alloc.sourceKind === "household" || alloc.sourceKind === "staged") {
                        return { type: "fetch", target: { x: alloc.x, y: alloc.y }, params: { itemId: alloc.itemId, plan: step.id, each: !!step.each } };
                    }
                } else if (res && res.harvestDemand) {
                    return { type: res.harvestDemand.action, target: { x: res.harvestDemand.x, y: res.harvestDemand.y }, params: { plan: step.id, each: !!step.each } };
                }
            }

            const ground = groundItemsNear(u, { radius: SEARCH_RADIUS + 20, id }).find(f => !claimedItemIds.has(f.item.id) && !onBuildCell(f.x, f.y, u, id) && !(c && onStockpile(f.item, null, u) && isFoodType(itemType(id))));
            if (ground) return { type: "fetch", target: { x: ground.x, y: ground.y }, params: { itemId: ground.item.id, plan: step.id, each: !!step.each } };
            const src = objectSourceNear(u, id, SEARCH_RADIUS);
            if (src) return { type: src.action, target: { x: src.x, y: src.y }, params: { plan: step.id, each: !!step.each } };
            const prey = preyYielding(u, id, huntRadius());
            if (prey) return { type: "hunt", target: { x: prey.x, y: prey.y }, params: { unitId: prey.id, plan: step.id, each: !!step.each } };
            return null; // this input can't be had here
        }
        return { type: "craft", params: { recipeId: recipe.id, plan: step.id, equip: !!step.equip, each: !!step.each } };
    }
    function craftStepJob(u, step) {
        const r = recipeOf(step.craft), out = outputOf(r);
        if (!r || !out) return null;
        if (step.each) {
            const carried = carriedOf(u, out)[0];
            const t = itemType(out);
            if (carried && step.equip && t && t.wear && !satisfiesEach(u, step, out)) return { type: "equip", params: { itemId: carried.id, plan: step.id } };
            if (satisfiesEach(u, step, out)) return null; // this colonist has theirs
            return gatherInputsJob(u, r, step);
        }
        if (colonyCount(out, u) >= ((step.count | 0) || 1)) return null;
        return gatherInputsJob(u, r, step);
    }
    function stockStepJob(u, step) {
        const I = Items();
        const c = colonyState(u);
        const tags = step.stock || [];
        const h = step.household && window.UF && UF.Households && UF.Households.of(u);
        const homeStorage = h && h.home && h.home.storage ? h.home.storage : null;
        const larder = homeStorage || stockpilesStoring(tags[0], u)[0];
        if (!larder || !I || !c) return null;
        const isWanted = t => (isFoodType(t) || tags.includes("wood")) && tags.some(tag => hasTag(t, tag) || (tag === "wood" && hasTag(t, "wood")));
        const to = homeStorage ? { area: copyArea(h.area || c.area), z: zOf(h), x: larder.x, y: larder.y } : { area: copyArea(c.area), z: zOf(c), x: larder.x, y: larder.y };
        const fire = fireNear(u);
        // Carried food: cook it if raw and there's a fire, else haul it to the larder.
        for (const it of I.inventoryOf(u.id)) {
            const t = itemType(it.type);
            if (!isWanted(t)) continue;
            const r = rawFood(t) && fire ? cookRecipeFor(it.type) : null;
            const spec = r ? cookSpec(u, r.id, step.id) : null;
            if (spec) return spec;
            return { type: "haul", target: { x: u.x, y: u.y }, params: { itemId: it.id, to, plan: step.id } };
        }
        // Food on the ground (not already in the larder).
        for (const f of groundItemsNear(u, { radius: SEARCH_RADIUS + 20 })) {
            const t = itemType(f.item.type);
            if (!isWanted(t) || (f.x === larder.x && f.y === larder.y)) continue;
            if (rawFood(t) && fire && cookRecipeFor(f.item.type)) return { type: "fetch", target: { x: f.x, y: f.y }, params: { itemId: f.item.id, plan: step.id } };
            return { type: "haul", target: { x: f.x, y: f.y }, params: { itemId: f.item.id, to, plan: step.id } };
        }
        const plant = foodObjectNear(u, SEARCH_RADIUS);
        const prey = step.hunt ? preyNear(u, huntRadius()) : null;
        const plantD = plant ? plant.dist : Infinity;
        const preyD = prey ? Math.hypot(prey.x - u.x, prey.y - u.y) / Math.max(0.2, priorityOf("hunt", u)) / (equippedItem(u, "tool") && hasTag(itemType(equippedItem(u, "tool").type), "knife") ? 1.5 : 1) : Infinity;
        if (prey && preyD <= plantD) return { type: "hunt", target: { x: prey.x, y: prey.y }, params: { unitId: prey.id, plan: step.id } };
        if (plant) return { type: plant.action, target: { x: plant.x, y: plant.y }, params: { plan: step.id } };
        return null;
    }

    function planJob(u) {
        const c = colonyState(u);
        if (!c) return null;
        const steps = effectivePlan(u), status = planStatus(u, steps);
        const candidates = [];
        const groups = { bootstrap_build: 0, bootstrap_craft: 0, bootstrap_stock: 0, workshop: 0, household: 0, civic: 0, goal: 0, standing: 0, milestone: 0 };
        const failedMaterials = new Set();
        // Each demand stream gets a bounded window. An impossible or endlessly recurring stock step must not
        // hide every household and personal aspiration behind the old plan's first three unfinished steps.
        for (let i = 0; i < steps.length; i++) {
            if (status[i].done) continue;
            const step = steps[i];
            if (step._noWorkTick && step._noWorkTick >= planInvalidatedAt && (localTicks - step._noWorkTick < 30)) continue;
            const isCivic = step.id && (step.id.startsWith("path_") || step.id.startsWith("town_square") || step.id.startsWith("civic_") || step.id.startsWith("sanitation_"));
            const isWorkshop = step.build && ["workbench", "tanning_rack", "bowyer_bench", "fletcher_bench", "furnace", "smithy", "weapon_rack"].includes(step.build);
            let group = "bootstrap_build";
            let limit = 4;
            if (step.standing) {
                group = "standing";
                limit = 4;
            } else if (step.milestone) {
                group = "milestone";
                limit = 3;
            } else if (isWorkshop) {
                group = "workshop";
                limit = 4;
            } else if (step.household) {
                group = "household";
                limit = 6;
            } else if (isCivic || step.pillar) {
                group = "civic";
                limit = 4;
            } else if (step.goalOwner) {
                group = "goal";
                limit = 3;
            } else if (step.build) {
                group = "bootstrap_build";
                limit = 4;
            } else if (step.craft) {
                group = "bootstrap_craft";
                limit = 4;
            } else if (step.stock) {
                group = "bootstrap_stock";
                limit = 2;
            }
            if (groups[group] >= limit) continue;
            const spec = step.build ? buildStepJob(u, step, failedMaterials) : step.craft ? craftStepJob(u, step) : step.stock ? stockStepJob(u, step) : null;
            if (!spec) {
                step._noWorkTick = localTicks;
                continue;
            }
            groups[group]++;
            spec.params = Object.assign({}, spec.params, { household: step.household || null, goalId: step.goalId || null, goalOwner: step.goalOwner || null });
            candidates.push({ step, spec, order: groups[group] - 1 });
        }
        let ready = candidates.filter(x => x.spec);
        if (!ready.length) return null;
        // The culture's priorities pick among the next few steps; ties keep the plan's order.
        const score = x => {
            const skill = UF.Skills && UF.Skills.skillOfJob ? UF.Skills.skillOfJob(x.spec) : x.spec.type === "craft" ? (recipeOf(x.spec.params.recipeId) || {}).skill : SKILL_OF[x.spec.type];
            const level = skill && UF.Skills && UF.Skills.level ? UF.Skills.level(u, skill) : skill ? ((u.data.skills && u.data.skills[skill]) || 0) : 0;
            let s = priorityOf(x.spec.type, u) * (1 + level / 100) - x.order * 0.05;
            const H = window.UF && UF.Households;
            const focal = H && H.activeFocalHousehold ? H.activeFocalHousehold(c) : null;
            if (x.step.household) {
                if (u.data && u.data.householdId === x.step.household) {
                    // Colonists urgently build their own private shelter, pairbonded or not
                    s += 6.0;
                } else if (focal && x.step.household === focal.id) {
                    s += 4.5; // Cooperative settlement building: all villagers unite to construct the active focal home!
                } else if (focal && H && H.isSheltered && !H.isSheltered(focal)) {
                    // While the active focal house is under construction and unsheltered,
                    // defer secondary household projects so villagers don't scatter labor!
                    s -= 2.0;
                } else {
                    s += 1.2;
                }
            } else if (x.step.id && (x.step.id.startsWith("path_") || x.step.id.startsWith("town_square"))) s += 0.8;
            if (x.step.id === "knives" || x.step.id === "clothes" || x.step.society === "knives" || x.step.society === "clothes") {
                s += 5.5; // Essential personal starter tools and clothing priority
            }
            if (x.step.id === "shelter" || x.step.id === "door" || x.step.society === "shelter" || x.step.society === "door") {
                s += 3.5;
            }
            if (x.step.id === "beds" || x.step.society === "beds" || (x.step.build && hasTag(Objects().type(x.step.build), "bed"))) {
                const Own = window.UF && UF.Ownership;
                const hasMyBed = (u.data && u.data.bed && Objects().atIn(levelArea(u), u.data.bed.x, u.data.bed.y)) || (Own && Own.bedOf && Own.bedOf(u));
                s += hasMyBed ? 2.0 : 4.0;
            }
            if (x.step.build && (x.step.build.startsWith("floor_") || x.step.id.includes("floors") || (x.spec && x.spec.type === "floor"))) {
                s += 2.0; // Priority boost to complete floors alongside walls
            }
            if (x.step.build && (x.step.build === "workbench" || x.step.build === "tanning_rack" || x.step.build === "bowyer_bench" || x.step.build === "fletcher_bench" || x.step.build === "furnace" || x.step.build === "smithy" || x.step.build === "weapon_rack")) {
                s += 5.5; // Priority boost for community workshops and equipment storage
            }
            if (x.step.id === "axe" || x.step.id === "pick" || x.step.id === "cloaks" || x.step.id === "leather" || x.step.id === "bows" || x.step.id === "arrows") {
                s += 3.5; // Priority boost for productive secondary tools and hunting equipment
            }
            const P = Pillars();
            if (P && P.priorityPillar) {
                const focus = P.priorityPillar(c);
                if (focus === "water" && (x.step.pillar === "water" || x.step.build === "well")) s += 1.0;
                else if (focus === "sanitation" && (x.step.pillar === "sanitation" || x.step.build === "latrine_pit" || x.step.build === "outhouse" || (x.step.stores && x.step.stores.includes("waste")))) s += 0.8;
                else if (focus === "shelter" && (x.step.household || (x.step.build && ["wall_wood", "door_wood", "floor_straw", "bed_wood", "floor_wood", "floor_stone"].includes(x.step.build)))) s += 0.5;
                else if (focus === "food" && (x.step.stock || x.step.build === "farm_plot")) s += 0.6;
                else if (focus === "workshop" && (x.step.build === "workbench" || x.step.build === "smithy" || (x.step.craft && (recipeOf(x.step.craft) || {}).workbench))) s += 0.5;
                else if (focus === "medicine" && (x.step.pillar === "medicine" || x.step.build === "apothecary_bench")) s += 0.7;
            }
            const Callings = getCallings();
            if (Callings) {
                if (Callings.isBuilder(u)) {
                    if (x.spec.type === "build" || x.spec.type === "floor") s *= 2.5;
                } else if (Callings.isWoodcutter(u)) {
                    if (x.spec.type === "chop" || (x.step && x.step.build && hasTag(Objects().type(x.step.build), "wood"))) s *= 2.5;
                } else if (Callings.isMiner(u)) {
                    if (x.spec.type === "mine" || (x.step && x.step.build && hasTag(Objects().type(x.step.build), "stone"))) s *= 2.5;
                } else if (Callings.isHauler(u)) {
                    if (x.spec.type === "haul" || x.spec.type === "fetch") s *= 3.0;
                } else if (Callings.isCook(u)) {
                    if (x.spec.type === "craft" && x.spec.params && x.spec.params.recipeId && x.spec.params.recipeId.includes("cook")) s *= 2.5;
                } else if (Callings.isForager(u)) {
                    if (x.spec.type === "gather" || x.spec.type === "harvest" || x.spec.type === "hunt") s *= 2.5;
                } else if (Callings.isCrafter(u)) {
                    if (x.spec.type === "craft") s *= 2.5;
                }
            }
            if (x.step.id === "knives" && (!u.data || u.data.age === undefined || u.data.age >= 15) && !holds(u, "stone_knife")) {
                s += 45.0;
            } else if (x.step.id === "clothes" && (!equippedItem(u, "clothes") || (u.data && u.data.tiers && u.data.tier < 1))) {
                s += 40.0;
            }
            return s;
        };
        ready = ready.map(x => Object.assign({}, x, { score: score(x) }));
        if (UF.CultureGrowth && UF.CultureGrowth.rankCandidates) ready = UF.CultureGrowth.rankCandidates(u, ready);
        if (UF.Goals && UF.Goals.choosePlan) ready = UF.Goals.choosePlan(u, ready);
        else ready.sort((a, b) => b.score - a.score || a.order - b.order);
        for (const x of ready) {
            const tool = toolJob(u, x.spec.type);
            if (tool) return tool;
            const j = give(u, x.spec);
            if (j) return j;
        }
        return null;
    }

    // Autonomous site debris clearing protocol: Woodcutters, Miners, and Haulers proactively clear
    // trees, boulders, and loose debris from the 7x7 Town Hall footprint before wall construction proceeds.
    function footprintClearingJob(u) {
        const c = colonyState(u);
        const O = Objects();
        const I = Items();
        if (!c || !O || !I || !c.site) return null;
        if (evening() || (window.UF && UF.DayNight && UF.DayNight.isNight && UF.DayNight.isNight())) return null;

        const site = c.site;
        const area = levelArea(u);
        const z = zOf(c);
        const x0 = site.x - 3, y0 = site.y - 3;
        const x1 = site.x + 3, y1 = site.y + 3;

        // If Town Hall is already fully enclosed and roofed, site clearing is finished
        const H = window.UF && UF.Households;
        const footprints = [];
        const siteTownHall = H && H.all().map(h => h.home).find(h => h && h.isShared && h.id === `town_hall_${c.siteId}`);
        if (!siteTownHall || !siteTownHall.isRoofed) {
            footprints.push({ x0: site.x - 3, y0: site.y - 3, x1: site.x + 3, y1: site.y + 3, ignoreHearth: true });
        }
        if (H && H.all) {
            for (const h of H.all().filter(h => sameLevel(h, c) && h.home && !h.mergedInto)) {
                if (H.isSheltered && H.isSheltered(h)) continue;
                const home = h.home;
                if (home.x !== undefined && home.w !== undefined) {
                    footprints.push({ x0: home.x, y0: home.y, x1: home.x + home.w - 1, y1: home.y + home.h - 1, ignoreHearth: false });
                }
                for (const a of home.annexes || []) {
                    if (a && a.x !== undefined && a.w !== undefined) {
                        footprints.push({ x0: a.x, y0: a.y, x1: a.x + a.w - 1, y1: a.y + a.h - 1, ignoreHearth: false });
                    }
                }
            }
        }
        if (!footprints.length) return null;

        const Callings = getCallings();
        const isW = Callings ? Callings.isWoodcutter(u) : true;
        const isM = Callings ? Callings.isMiner(u) : true;
        const isH = Callings ? Callings.isHauler(u) : true;

        // 1. Standing obstacles inside active footprints (trees, boulders)
        if (isW || isM) {
            for (const fp of footprints) {
                for (let y = fp.y0; y <= fp.y1; y++) {
                    for (let x = fp.x0; x <= fp.x1; x++) {
                        if (fp.ignoreHearth && x === site.x && y === site.y) continue;
                        const ob = O.atIn(area, x, y);
                        if (!ob) continue;
                        const ot = O.type(ob.id);
                        if (!ot) continue;
                        // NEVER clear constructed settlement structures (walls, doors, beds, hearths, furniture, etc.)
                        if (ot.build || (ot.tags && (ot.tags.includes("wall") || ot.tags.includes("door") || ot.tags.includes("bed") || ot.tags.includes("building") || ot.tags.includes("furniture") || ot.tags.includes("fire")))) {
                            continue;
                        }
                        if (isObjectClaimed(u, x, y, "chop") || isObjectClaimed(u, x, y, "mine") || isObjectClaimed(u, x, y, "clear")) {
                            continue;
                        }
                        const actions = ot.actions || {};
                        if (actions.chop && isW) {
                            const tool = toolJob(u, "chop");
                            if (tool) return tool;
                            return give(u, { type: "chop", target: { x, y }, params: { plan: "clear_footprint" } });
                        }
                        if (actions.mine && isM) {
                            const tool = toolJob(u, "mine");
                            if (tool) return tool;
                            return give(u, { type: "mine", target: { x, y }, params: { plan: "clear_footprint" } });
                        }
                        if (actions.clear) {
                            return give(u, { type: "clear", target: { x, y }, params: { plan: "clear_footprint" } });
                        }
                    }
                }
            }
        }

        // 2. Loose debris items lying inside active footprints hauled to stockpiles
        if (isH) {
            const looseInFootprints = groundItemsNear(u, { radius: SEARCH_RADIUS }).filter(f => {
                const inFp = footprints.find(fp => f.x >= fp.x0 && f.x <= fp.x1 && f.y >= fp.y0 && f.y <= fp.y1);
                if (!inFp) return false;
                if (inFp.ignoreHearth && f.x === site.x && f.y === site.y) return false;
                return true;
            });
            if (looseInFootprints.length > 0) {
                for (const f of looseInFootprints) {
                    if (claimed(u, "haul", f.x, f.y, { itemId: f.item.id, plan: "clear_footprint" })) continue;
                    if (window.UF && UF.Jobs && UF.Jobs.ReservationManager && UF.Jobs.ReservationManager.isReservedByOther(u.id, f.item.id)) continue;
                    const t = itemType(f.item.type);
                    if (!t) continue;
                    // Do NOT haul away materials that are sitting on a build cell waiting to be constructed!
                    if (onBuildCell(f.x, f.y, u, f.item.type)) continue;
                    if (f.item.firstOwner && f.item.firstOwner !== u.id) continue;
                    let to = null;
                    if (c.stockpiles && c.stockpiles.length > 0) {
                        const sp = c.stockpiles.find(s => {
                            const stores = s.stores || [];
                            if (!stores.length) return true;
                            if (Array.isArray(t.tags) && t.tags.some(tag => stores.includes(tag))) return true;
                            if (stores.includes("material") && (hasTag(t, "wood") || hasTag(t, "stone") || hasTag(t, "metal"))) return true;
                            if (stores.includes("wood") && hasTag(t, "wood")) return true;
                            if (stores.includes("stone") && hasTag(t, "stone")) return true;
                            if (stores.includes("metal") && hasTag(t, "metal")) return true;
                            if (stores.includes("food") && isFoodType(t)) return true;
                            return false;
                        });
                        if (sp) to = { area: copyArea(c.area), z, x: sp.x, y: sp.y };
                    }
                    if (!to) {
                        to = { area: copyArea(c.area), z, x: site.x + 4, y: site.y };
                    }
                    return give(u, { type: "haul", target: { x: f.x, y: f.y }, params: { itemId: f.item.id, to, plan: "clear_footprint" } });
                }
            }
        }

        return null;
    }

    // Timber Hauling Pipeline: dedicated haulers stage raw timber, stone, and building
    // materials directly to unbuilt wall, door, and floor cells in active footprints
    function constructionHaulingJob(u) {
        const I = Items(), c = colonyState(u);
        if (!I || !c) return null;
        const plan = effectivePlan(u);
        if (!plan || !plan.length) return null;
        const failedNeeds = new Set();

        for (const step of plan) {
            const t = stepObject(step);
            if (!t || !t.build || !t.build.items) continue;
            const needs = t.build.items;

            for (const cell of buildCells(step, u)) {
                if (cell.state !== "todo") continue;

                for (const [id, countNeeded] of Object.entries(needs)) {
                    if (failedNeeds.has(id)) continue;
                    let onCell = I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, id);
                    if (id === "wood") onCell += I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "log");
                    else if (id === "straw") onCell += I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "fiber");
                    else if (id === "stone") onCell += I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "rocks_small");
                    const inFlight = activeJobs().filter(j => (j.type === "haul" || j.type === "fetch") &&
                        j.assigned !== u.id && j.params && j.params.to &&
                        j.params.to.x === cell.x && j.params.to.y === cell.y).length;

                    if (onCell + inFlight < (countNeeded | 0)) {
                        if (window.UF && UF.Resources && UF.Resources.resolve) {
                            const res = UF.Resources.resolve({
                                typeId: id,
                                quantity: 1,
                                actor: u,
                                purpose: "construction",
                                targetLocation: { x: cell.x, y: cell.y, z: zOf(c), area: copyArea(c.area) },
                                projectId: step.id
                            });
                            if (!res || !res.allocations || res.allocations.length === 0) {
                                failedNeeds.add(id);
                                continue;
                            }
                            if (res && res.allocations && res.allocations.length > 0) {
                                const alloc = res.allocations[0];
                                if (alloc.sourceKind === "carried") {
                                    return give(u, {
                                        type: "haul",
                                        target: { x: u.x, y: u.y },
                                        params: {
                                            itemId: alloc.itemId,
                                            to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y },
                                            plan: step.id,
                                            constructionHaul: true
                                        }
                                    });
                                } else if (alloc.sourceKind === "container") {
                                    return give(u, {
                                        type: "haul",
                                        target: { x: alloc.x, y: alloc.y },
                                        params: {
                                            itemId: alloc.itemId,
                                            fromContainer: alloc.containerId,
                                            to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y },
                                            plan: step.id,
                                            constructionHaul: true
                                        }
                                    });
                                } else if (alloc.sourceKind === "loose" || alloc.sourceKind === "household" || alloc.sourceKind === "staged") {
                                    return give(u, {
                                        type: "haul",
                                        target: { x: alloc.x, y: alloc.y },
                                        params: {
                                            itemId: alloc.itemId,
                                            to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y },
                                            plan: step.id,
                                            constructionHaul: true
                                        }
                                    });
                                }
                            }
                        }

                        const carried = carriedOf(u, id)[0];
                        if (carried) {
                            return give(u, {
                                type: "haul",
                                target: { x: u.x, y: u.y },
                                params: {
                                    itemId: carried.id,
                                    to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y },
                                    plan: step.id,
                                    constructionHaul: true
                                }
                            });
                        }
                        const altId = id === "wood" ? "log" : id === "straw" ? "fiber" : id === "stone" ? "rocks_small" : null;
                        let ground = groundItemsNear(u, { radius: SEARCH_RADIUS + 40, id })
                            .find(f => (!f.item.firstOwner || f.item.firstOwner === u.id) && !onBuildCell(f.x, f.y, u, id) && (f.x !== cell.x || f.y !== cell.y));
                        if (!ground && altId) {
                            ground = groundItemsNear(u, { radius: SEARCH_RADIUS + 40, id: altId })
                                .find(f => (!f.item.firstOwner || f.item.firstOwner === u.id) && !onBuildCell(f.x, f.y, u, altId) && (f.x !== cell.x || f.y !== cell.y));
                        }
                        if (ground) {
                            return give(u, {
                                type: "haul",
                                target: { x: ground.x, y: ground.y },
                                params: {
                                    itemId: ground.item.id,
                                    to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y },
                                    plan: step.id,
                                    constructionHaul: true
                                }
                            });
                        }
                    }
                }
            }
        }
        return null;
    }

    // Clean site logistics: tidy loose items on the ground into designated containers or stockpiles
    function tidyStockpileJob(u) {
        const c = colonyState(u);
        const I = Items(), C = window.UF && UF.Containers;
        if (!c || !I) return null;
        if (evening() || (window.UF && UF.DayNight && UF.DayNight.isNight && UF.DayNight.isNight())) return null;

        // Find loose ground items within the settlement radius and surrounding forest/quarry perimeter
        const tidyRadius = Math.min(24, (c.radius || 8) + 12);
        const loose = groundItemsNear(u, { radius: tidyRadius }).filter(f => {
            if (onStockpile(f.item, null, u)) return false;
            if (onBuildCell(f.x, f.y, u, f.item.type)) return false;
            if (f.item.firstOwner && f.item.firstOwner !== u.id) return false;
            if (window.UF && UF.Jobs && UF.Jobs.ReservationManager && UF.Jobs.ReservationManager.isReservedByOther(u.id, f.item.id)) return false;
            return true;
        });
        if (!loose.length) return null;

        for (const f of loose) {
            const t = itemType(f.item.type);
            if (!t) continue;

            // 1. Prioritize physical storage containers
            if (C) {
                const containers = C.all(levelArea(c), zOf(c));
                for (const cont of containers) {
                    const can = C.canStore(cont.id, f.item.type, f.item.count || 1, u);
                    if (can.ok) {
                        return give(u, {
                            type: "haul",
                            target: { x: f.x, y: f.y },
                            params: {
                                itemId: f.item.id,
                                toContainer: cont.id,
                                to: { area: copyArea(cont.area), z: zOf(cont), x: cont.x, y: cont.y },
                                tidy: true
                            }
                        });
                    }
                }
            }

            // 2. Fall back to designated ground stockpiles
            if (c.stockpiles && c.stockpiles.length) {
                const sp = c.stockpiles.find(s => {
                    const stores = s.stores || [];
                    if (!stores.length) return true;
                    if (Array.isArray(t.tags) && t.tags.some(tag => stores.includes(tag))) return true;
                    if (stores.includes("material") && (hasTag(t, "wood") || hasTag(t, "stone") || hasTag(t, "metal") || hasTag(t, "mineral") || hasTag(t, "fuel"))) return true;
                    if (stores.includes("wood") && hasTag(t, "wood")) return true;
                    if (stores.includes("stone") && hasTag(t, "stone")) return true;
                    if (stores.includes("metal") && hasTag(t, "metal")) return true;
                    if (stores.includes("food") && isFoodType(t)) return true;
                    return false;
                });
                if (sp) {
                    const itemsAtDest = I.atIn(levelArea(c), sp.x, sp.y);
                    const canStack = itemsAtDest.some(existing => existing.type === f.item.type && (existing.count || 1) < (t.stack || 10));
                    const hasSlot = itemsAtDest.length < 5;
                    if (canStack || hasSlot) {
                        return give(u, {
                            type: "haul",
                            target: { x: f.x, y: f.y },
                            params: {
                                itemId: f.item.id,
                                to: { area: copyArea(c.area), z: zOf(c), x: sp.x, y: sp.y },
                                tidy: true
                            }
                        });
                    }
                }
            }
        }
        return null;
    }

    // Immediate Staging & Stockpile Logistics: ensure colonists holding loose resources
    // (stone, logs, fiber, etc.) proactively haul them to unbuilt construction cells,
    // containers, or stockpiles instead of standing around idle holding heavy loads.
    function carriedDepositJob(u) {
        const I = Items(), c = colonyState(u);
        if (!I || !c) return null;
        const inv = I.inventoryOf(u.id) || [];
        if (!inv.length) return null;

        const eq = u.data.equipment || {};
        const eqIds = new Set(Object.values(eq));
        // Loose items: anything in inventory that is not equipped gear
        const loose = inv.filter(it => {
            if (eqIds.has(it.id)) return false;
            const t = itemType(it.type);
            if (!t) return false;
            if (t.tags && (t.tags.includes("tool") || t.tags.includes("clothes") || t.tags.includes("weapon")) && (holds(u, it.type) || equippedItem(u, "clothes")?.id === it.id)) return false;
            return true;
        });
        if (!loose.length) return null;

        const carried = loose[0];
        const t = itemType(carried.type);
        if (!t) return null;

        // 1. Prioritize staging directly to unbuilt construction cells in effectivePlan
        const plan = effectivePlan(u);
        if (plan && plan.length) {
            for (const step of plan) {
                const stepObj = stepObject(step);
                if (!stepObj || !stepObj.build || !stepObj.build.items) continue;
                const needs = stepObj.build.items;
                for (const cell of buildCells(step, u)) {
                    if (cell.state !== "todo") continue;
                    for (const [id, countNeeded] of Object.entries(needs)) {
                        const matches = (id === carried.type) ||
                            (id === "wood" && carried.type === "log") ||
                            (id === "log" && carried.type === "wood") ||
                            (id === "straw" && carried.type === "fiber") ||
                            (id === "fiber" && carried.type === "straw") ||
                            (id === "stone" && carried.type === "rocks_small") ||
                            (id === "rocks_small" && carried.type === "stone");
                        if (!matches) continue;
                        let onCell = I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, id);
                        if (id === "wood") onCell += I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "log");
                        else if (id === "straw") onCell += I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "fiber");
                        else if (id === "stone") onCell += I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "rocks_small");
                        if (onCell < (countNeeded | 0)) {
                            return give(u, {
                                type: "haul",
                                target: { x: u.x, y: u.y },
                                params: {
                                    itemId: carried.id,
                                    to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y },
                                    plan: step.id,
                                    constructionHaul: true
                                }
                            });
                        }
                    }
                }
            }
        }

        // 2. Storage containers
        const Cont = window.UF && UF.Containers;
        if (Cont) {
            const containers = Cont.all(levelArea(c), zOf(c));
            for (const cont of containers) {
                const can = Cont.canStore(cont.id, carried.type, carried.count || 1, u);
                if (can.ok) {
                    return give(u, {
                        type: "haul",
                        target: { x: u.x, y: u.y },
                        params: {
                            itemId: carried.id,
                            toContainer: cont.id,
                            to: { area: copyArea(cont.area), z: zOf(cont), x: cont.x, y: cont.y },
                            tidy: true
                        }
                    });
                }
            }
        }

        // 3. Ground stockpiles
        if (c.stockpiles && c.stockpiles.length) {
            const sp = c.stockpiles.find(s => {
                const stores = s.stores || [];
                if (!stores.length) return true;
                if (Array.isArray(t.tags) && t.tags.some(tag => stores.includes(tag))) return true;
                if (stores.includes("material") && (hasTag(t, "wood") || hasTag(t, "stone") || hasTag(t, "metal") || hasTag(t, "mineral") || hasTag(t, "fuel"))) return true;
                if (stores.includes("wood") && hasTag(t, "wood")) return true;
                if (stores.includes("stone") && hasTag(t, "stone")) return true;
                if (stores.includes("metal") && hasTag(t, "metal")) return true;
                if (stores.includes("food") && isFoodType(t)) return true;
                return false;
            });
            if (sp) {
                const itemsAtDest = I.atIn(levelArea(c), sp.x, sp.y);
                const canStack = itemsAtDest.some(existing => existing.type === carried.type && (existing.count || 1) < (t.stack || 10));
                const hasSlot = itemsAtDest.length < 5;
                if (canStack || hasSlot) {
                    return give(u, {
                        type: "haul",
                        target: { x: u.x, y: u.y },
                        params: {
                            itemId: carried.id,
                            to: { area: copyArea(c.area), z: zOf(c), x: sp.x, y: sp.y },
                            tidy: true
                        }
                    });
                }
            }
        }

        // 4. Designated settlement drop location
        const dropCenter = (c.stockpiles && c.stockpiles[0]) || c.site || { x: u.x, y: u.y };
        const dropCell = freeCellNear(levelArea(c), dropCenter.x, dropCenter.y, 6, 1);
        if (dropCell) {
            return give(u, {
                type: "haul",
                target: { x: u.x, y: u.y },
                params: {
                    itemId: carried.id,
                    to: { area: copyArea(c.area), z: zOf(c), x: dropCell.x, y: dropCell.y },
                    tidy: true
                }
            });
        }
        return null;
    }

    // -----------------------------------------------------------------------
    // Workshop calling jobs: specialist craftsmen autonomously seek their
    // workshop to process available raw materials.  Maps callings to workshop
    // objects and the recipes they can execute.
    // -----------------------------------------------------------------------
    const WORKSHOP_CALLING_MAP = [
        // { calling test, workshop object kind, recipes to try (in priority order) }
        { test: "isSmith",     ws: "smithy",         recipes: ["sword_short", "axe_iron", "dagger_iron", "helmet_iron", "mail_iron", "greaves_iron", "shield_iron", "forge_hardware"] },
        { test: "isSmelter",   ws: "furnace",        recipes: ["bar_iron", "bar_copper", "charcoal"] },
        { test: "isTanner",    ws: "tanning_rack",   recipes: ["leather"] },
        { test: "isBowyer",    ws: "bowyer_bench",   recipes: ["bow_short", "bow_long"] },
        { test: "isFletcher",  ws: "fletcher_bench", recipes: ["arrows_stone", "arrows_bone", "arrows_iron"] },
        { test: "isCarpenter", ws: "workbench",      recipes: ["plane_planks", "club", "shield_wood", "spear_stone"] },
        { test: "isMason",     ws: "mason_bench",    recipes: ["chisel_stone_block"] },
        { test: "isPotter",    ws: "pottery_kiln",   recipes: ["fire_brick", "lime_mortar"] },
        { test: "isLeatherworker", ws: "workbench",  recipes: ["armor_leather", "helmet_leather", "leggings_leather", "sling"] },
    ];

    function workshopCallingJob(u) {
        const c = colonyState(u);
        const O = Objects();
        if (!c || !O || !c.site) return null;
        if (evening() || (window.UF && UF.DayNight && UF.DayNight.isNight && UF.DayNight.isNight())) return null;

        const Callings = getCallings();
        if (!Callings) return null;
        const area = levelArea(u);

        for (const mapping of WORKSHOP_CALLING_MAP) {
            // Check if the colonist has this calling
            if (!Callings[mapping.test] || !Callings[mapping.test](u)) continue;

            // Check if the workshop exists at the colony
            const ws = O.findIn(area, { near: { x: c.site.x, y: c.site.y }, radius: c.radius + 6, kind: mapping.ws });
            if (!ws || ws.length === 0) continue;

            // Try each recipe in priority order
            for (const recipeId of mapping.recipes) {
                const r = recipeOf(recipeId);
                if (!r) continue;
                const outKey = outputOf(r);
                if (!outKey) continue;

                // Check if raw inputs are available
                const inputs = r.inputs || {};
                let canCraft = true;
                for (const [inp, qty] of Object.entries(inputs)) {
                    // Check both carried and colony-wide availability
                    if (carriedCount(u, inp) + colonyCount(inp, u) < qty) { canCraft = false; break; }
                }
                if (!canCraft) continue;

                // Generate the craft job via the standard gather-inputs pipeline
                const step = { id: `ws_${mapping.ws}_${recipeId}`, craft: recipeId, count: 1, standing: true };
                const spec = gatherInputsJob(u, r, step);
                if (spec) {
                    const j = give(u, spec);
                    if (j) return j;
                }
            }
        }
        return null;
    }

    // Autonomous calling jobs: when direct plan steps are waiting on raw materials, in-flight hauling,
    // or blocked, specialists proactively practice their callings (Woodcutters harvest timber, Miners
    // quarry stone, Foragers collect food/fiber, Cooks prepare hot meals, and Haulers tidy loose resources).
    function autonomousCallingJob(u) {
        const c = colonyState(u);
        const O = Objects();
        const I = Items();
        const J = Jobs();
        if (!c || !O || !I || !J || !c.site) return null;
        if (evening() || (window.UF && UF.DayNight && UF.DayNight.isNight && UF.DayNight.isNight())) return null;

        const Callings = getCallings();
        if (!Callings) return null;

        // 0. Leader holds court: the leader goes to the Town Hall during the day
        if (Callings.isLeader(u)) {
            const H = window.UF && UF.Households;
            const h = H && H.of(u);
            if (h && h.home && h.home.isShared && h.home.hearth) {
                const hearth = h.home.hearth;
                const dist = Math.abs(u.x - hearth.x) + Math.abs(u.y - hearth.y);
                if (dist > 2) {
                    // Walk to the court
                    return give(u, { type: "move", target: { x: hearth.x, y: hearth.y + 1 }, params: { court: true, calling: "leader" } });
                }
                // Already at court — stand and manage (idle behavior will handle social)
            }
        }

        const area = levelArea(u);
        const radius = Math.min(24, (c.radius || 8) + 12);

        const isW = Callings.isWoodcutter(u);
        const isM = Callings.isMiner(u);
        const isF = Callings.isForager(u);
        const isC = Callings.isCook(u);
        const isH = Callings.isHauler(u);

        // Helper to avoid targeting buildings, constructed walls, doors, or claimed objects
        const isHarvestable = (t, x, y, action) => {
            if (!t) return false;
            if (hasTag(t, "wall") || hasTag(t, "building") || hasTag(t, "door") || hasTag(t, "bed") || hasTag(t, "furniture") || hasTag(t, "fire") || t.build) return false;
            if (isObjectClaimed(u, x, y, action)) return false;
            return true;
        };

        // 1. Woodcutter: harvest natural trees for timber, prioritizing trees nearest to active unbuilt walls
        if (isW) {
            const pendingWallCells = [];
            const plan = effectivePlan(u);
            for (const step of plan) {
                const t = stepObject(step);
                if (t && t.build && t.build.items && (t.build.items.log || t.build.items.wood)) {
                    for (const cell of buildCells(step, u)) {
                        if (cell.state === "todo") pendingWallCells.push(cell);
                    }
                }
            }
            let tree = null;
            if (pendingWallCells.length > 0) {
                let bestDist = Infinity;
                scanObjects(area, u.x, u.y, radius, (t, x, y) => {
                    if (!t.actions || !t.actions.chop || !isHarvestable(t, x, y, "chop")) return false;
                    for (const cell of pendingWallCells) {
                        const d = Math.hypot(x - cell.x, y - cell.y);
                        if (d < bestDist) {
                            bestDist = d;
                            tree = { type: t, x, y };
                        }
                    }
                    return false;
                });
            }
            if (!tree) {
                tree = scanObjects(area, u.x, u.y, radius, (t, x, y) => {
                    if (!t.actions || !t.actions.chop) return false;
                    return isHarvestable(t, x, y, "chop");
                });
            }
            if (tree) {
                const tool = toolJob(u, "chop");
                if (tool) return tool;
                return give(u, { type: "chop", target: { x: tree.x, y: tree.y }, params: { calling: "woodcutter" } });
            }
        }

        // 2. Miner: quarry or mine rock formations and mineral outcrops
        if (isM) {
            const rock = scanObjects(area, u.x, u.y, radius, (t, x, y) => {
                const act = t.actions && (t.actions.quarry ? "quarry" : t.actions.mine ? "mine" : t.actions.pick ? "pick" : null);
                if (!act) return false;
                return isHarvestable(t, x, y, act);
            });
            if (rock) {
                const act = rock.type.actions.quarry ? "quarry" : rock.type.actions.mine ? "mine" : "pick";
                const tool = toolJob(u, act);
                if (tool) return tool;
                return give(u, { type: act, target: { x: rock.x, y: rock.y }, params: { calling: "miner" } });
            }
        }

        // 3. Forager: collect wild herbs, berries, edible plants, or fiber
        if (isF) {
            const plant = scanObjects(area, u.x, u.y, radius, (t, x, y) => {
                const act = t.actions && (t.actions.gather ? "gather" : t.actions.harvest ? "harvest" : null);
                if (!act) return false;
                return isHarvestable(t, x, y, act);
            });
            if (plant) {
                const act = plant.type.actions.gather ? "gather" : "harvest";
                return give(u, { type: act, target: { x: plant.x, y: plant.y }, params: { calling: "forager" } });
            }
        }

        // 4. Cook: prepare meals if raw food exists and a hearth/campfire is lit
        if (isC) {
            const fire = homeFire(u);
            if (fire) {
                const rawInInv = I.inventoryOf(u.id).find(it => {
                    const t = itemType(it.type);
                    return rawFood(t) && cookRecipeFor(it.type);
                });
                if (rawInInv) {
                    const r = cookRecipeFor(rawInInv.type);
                    if (r) {
                        const spec = cookSpec(u, r.id, "autonomous_cooking");
                        if (spec) return give(u, spec);
                    }
                }
                const looseRaw = groundItemsNear(u, { radius: radius }).find(f => {
                    const t = itemType(f.item.type);
                    return rawFood(t) && cookRecipeFor(f.item.type) && !onStockpile(f.item, null, u) && (!f.item.firstOwner || f.item.firstOwner === u.id);
                });
                if (looseRaw) {
                    const r = cookRecipeFor(looseRaw.item.type);
                    if (r) {
                        return give(u, { type: "fetch", target: { x: looseRaw.x, y: looseRaw.y }, params: { itemId: looseRaw.item.id, plan: "autonomous_cooking" } });
                    }
                }
            }
        }

        // 5. Hauler: stage timber/stone directly to active construction sites, then tidy stockpiles
        if (isH) {
            const staging = constructionHaulingJob(u);
            if (staging) return staging;
            const tidy = tidyStockpileJob(u);
            if (tidy) return tidy;
        }

        // 6. Workshop specialists: craftsmen autonomously seek their workshop
        //    to process available raw materials into finished goods.
        const workshopCraft = workshopCallingJob(u);
        if (workshopCraft) return workshopCraft;

        return null;
    }

    // Autonomous Frontier Progression:
    // When colonists have no active direct construction task, no direct player order,
    // and no urgent need, they proactively build the frontier settlement:
    // 1. Harvest timber if colony log reserves < 35 or unbuilt wood steps exist.
    // 2. Quarry stone if colony stone reserves < 30 or unbuilt stone steps exist.
    // 3. Gather fiber/straw if colony fiber reserves < 25 or unbuilt straw/bed steps exist.
    // 4. Forage wild food/berries if colony food reserves < 25.
    // 5. Tidy loose resources across the perimeter into stockpiles.
    function autonomousFrontierProgression(u) {
        const c = colonyState(u);
        const O = Objects(), I = Items(), J = Jobs();
        if (!c || !O || !I || !J || !c.site) return null;
        if (evening() || (window.UF && UF.DayNight && UF.DayNight.isNight && UF.DayNight.isNight())) return null;

        const area = levelArea(u);
        const radius = Math.min(24, (c.radius || 8) + 12);

        const isHarvestable = (t, x, y, action) => {
            if (!t) return false;
            if (hasTag(t, "wall") || hasTag(t, "building") || hasTag(t, "door") || hasTag(t, "bed") || hasTag(t, "furniture") || hasTag(t, "fire") || t.build) return false;
            if (isObjectClaimed(u, x, y, action)) return false;
            return true;
        };

        // 1. Timber Progression: target >= 35 logs in the settlement
        const logs = colonyCount("log", u) + colonyCount("wood", u);
        if (logs < 35) {
            const tree = objectSourceNear(u, "log", radius) || objectSourceNear(u, "wood", radius);
            if (tree) {
                const tool = toolJob(u, "chop");
                if (tool) return tool;
                return give(u, { type: "chop", target: { x: tree.x, y: tree.y }, params: { frontier: "timber" } });
            }
        }

        // 2. Stone Progression: target >= 30 stones in the settlement
        const stone = colonyCount("stone", u);
        if (stone < 30) {
            const rock = objectSourceNear(u, "stone", radius);
            if (rock) {
                const act = rock.action || (rock.type.actions && (rock.type.actions.quarry ? "quarry" : rock.type.actions.mine ? "mine" : "pick")) || "pick";
                const tool = toolJob(u, act);
                if (tool) return tool;
                return give(u, { type: act, target: { x: rock.x, y: rock.y }, params: { frontier: "stone" } });
            }
        }

        // 3. Fiber Progression: target >= 25 fiber/straw
        const fiber = colonyCount("fiber", u) + colonyCount("straw", u);
        if (fiber < 25) {
            const plant = objectSourceNear(u, "fiber", radius) || objectSourceNear(u, "straw", radius);
            if (plant) {
                const act = plant.action || (plant.type.actions && plant.type.actions.gather ? "gather" : "harvest");
                return give(u, { type: act, target: { x: plant.x, y: plant.y }, params: { frontier: "fiber" } });
            }
        }

        // 4. Food Progression: target >= 25 food
        const food = foodStored(u).reduce((sum, it) => sum + (it.count || 1), 0);
        if (food < 25) {
            const foodObj = foodObjectNear(u, radius);
            if (foodObj) {
                const act = foodObj.action || (foodObj.type && yieldsFood(foodObj.type)[0]) || "gather";
                return give(u, { type: act, target: { x: foodObj.x, y: foodObj.y }, params: { frontier: "food" } });
            }
            const prey = preyNear(u, huntRadius());
            if (prey) {
                return give(u, { type: "hunt", target: { x: prey.x, y: prey.y }, params: { unitId: prey.id, frontier: "food" } });
            }
        }

        // 5. Perimeter Hauling: tidy any loose materials into stockpiles
        const tidy = tidyStockpileJob(u);
        if (tidy) return tidy;

        return null;
    }

    // Idle: explore (curiosity), stroll near the site, or stand and think.
    // Guaranteed non-null fallback to ensure colonists always maintain purposeful, visible activity.
    function idleJob(u) {
        const c = colonyState(u);
        const J = Jobs();
        const home = c ? c.site : { x: u.x, y: u.y };

        // Evening / night campfire social gathering: idle colonists congregate within warmth radius of the fire (safe distance >= 3)
        if (evening() || (window.UF && UF.DayNight && UF.DayNight.isNight && UF.DayNight.isNight())) {
            const fire = nearestFire(u);
            if (fire && sameLevel(fire, u)) {
                const fireDist = Math.hypot(u.x - fire.x, u.y - fire.y);
                if (fireDist > 4 || fireDist < 2.5) {
                    const cell = freeCellNear(levelArea(u), fire.x, fire.y, 4, 3);
                    if (cell) {
                        const j = give(u, { type: "move", target: cell, params: { fireGather: true, faceTowards: { x: fire.x, y: fire.y } } });
                        if (j) return j;
                    }
                }
                const neighbor = simulationUnits().find(o => o.id !== u.id && sameLevel(o, u) && o.data.faction === u.data.faction && !Jobs().of(o.id) && chebyshev(o.x, o.y, u.x, u.y) <= 3);
                if (neighbor) {
                    const j = give(u, { type: "talk", target: { x: neighbor.x, y: neighbor.y }, params: { unitId: neighbor.id, hearthChat: true } });
                    if (j) return j;
                }
                return give(u, { type: "move", target: { x: u.x, y: u.y }, params: { fireGather: true } });
            }
        }

        // Clean site logistics: tidy loose ground clutter into stockpiles
        const tidy = tidyStockpileJob(u);
        if (tidy) return tidy;

        const roll = unit01(seed(), SALT.stroll, u.id, ticks());
        const curiosity = facet(u, "curiosity") / 100;
        if (roll < 0.5 * curiosity + 0.3) {
            const explore = roll < 0.5 * curiosity;
            const r = explore ? EXPLORE_RADIUS : STROLL_RADIUS;
            const rng = mulberry32(hash32(seed(), SALT.stroll, u.id, ticks(), 1));
            for (let t = 0; t < 8; t++) {
                const a = rng() * Math.PI * 2, d = 3 + rng() * (r - 3);
                const x = Math.round(home.x + Math.cos(a) * d), y = Math.round(home.y + Math.sin(a) * d);
                if (!J.standable(levelArea(u), x, y, u.id)) continue;
                const j = give(u, { type: "move", target: { x, y }, params: { stroll: true, explore } });
                if (j) return j;
            }
        }

        // Daytime social interaction: talk with nearby idle settler
        const partner = simulationUnits().find(o => o.id !== u.id && sameLevel(o, u) && o.data.faction === u.data.faction && !Jobs().of(o.id) && chebyshev(o.x, o.y, u.x, u.y) <= 20);
        if (partner) {
            const j = give(u, { type: "talk", target: { x: partner.x, y: partner.y }, params: { unitId: partner.id, idleSocial: true } });
            if (j) return j;
        }

        // Inspect homestead / survey settlement
        const cell = freeCellNear(levelArea(u), home.x, home.y, 6, 2);
        if (cell) {
            const j = give(u, { type: "move", target: cell, params: { stroll: true, inspect: true } });
            if (j) return j;
        }

        // Local step or contemplation
        const localCell = freeCellNear(levelArea(u), u.x, u.y, 3, 1);
        if (localCell) {
            return give(u, { type: "move", target: localCell, params: { stroll: true } });
        }
        return give(u, { type: "move", target: { x: u.x, y: u.y }, params: { contemplate: true } });
    }

    // Far from home (a hunt follows fleeing prey a long way): back to the site before anything but a need.
    function homeJob(u) {
        const c = colonyState(u);
        if (!c || !sameLevel(u, c) || Math.hypot(u.x - c.site.x, u.y - c.site.y) <= HOME_LEASH) return null;
        const h = UF.Households && UF.Households.of(u), p = h && h.home;
        if (p && sameLevel(h, u) && (UF.Households.structures ? UF.Households.structures(h) : [p]).some(b => u.x >= b.x - 2 && u.y >= b.y - 2 && u.x <= b.x + b.w + 2 && u.y <= b.y + b.h + 2)) return null;
        const cell = freeCellNear(levelArea(c), c.site.x, c.site.y, 4);
        return cell ? give(u, { type: "move", target: cell, params: { via: "move", home: true } }) : null;
    }

    //-------------------------------------------------------------------------
    // The minimal autonomous loop (DEUS-TSK-FABLE-03). Objective 2 (2026-09-22) wiped needs, moods, wandering and the
    // society-plan crafting; this restores only job taking: an idle worker claims the best open job it can do now,
    // settlement project jobs first, then any other open designation, and UF_Jobs plans, reserves and runs it.

    // Acute survival (kept under its FABLE-03 name for readers): the single source is urgent(u) above.
    const urgentSurvival = u => urgent(u);

    // The best open job of an active settlement project this worker can do now, taken. Scoring: the culture's
    // priority for the job type, skill, the job's own priority, distance. A job somebody else reserved, or one this
    // worker failed on lately, is skipped; UF_Jobs.take dry-runs the plan so a job the worker can't do stays open.
    function projectJob(u) {
        if (!isColonist(u)) return null;
        const J = Jobs(), P = window.UF && UF.Projects;
        if (!J || !P || typeof P.active !== "function") return null;
        const ids = new Set(P.active().map(p => p.id));
        if (!ids.size) return null;
        const open = J.open().filter(j => j.target && j.params && ids.has(j.params.project) && sameLevel(j.target, u));
        if (!open.length) return null;
        const RM = J.reservation || null, t = ticks();
        const score = j => {
            const skill = SKILL_OF[j.type] ? ((u.data.skills && u.data.skills[SKILL_OF[j.type]]) || 0) : 0;
            const dist = Math.hypot(j.target.x - u.x, j.target.y - u.y);
            return priorityOf(j.type, u) * (1 + skill / 20) * (1 + (j.priority | 0)) / (1 + dist / 20);
        };
        open.sort((a, b) => score(b) - score(a) || a.id - b.id);
        for (const j of open.slice(0, 6)) {
            if ((avoid.get(avoidKey(u, j.type, j.target.x, j.target.y)) || 0) > t) continue;
            if (RM && (RM.isReservedByOther(u.id, j.target) || (j.params.itemId && RM.isReservedByOther(u.id, j.params.itemId)))) continue;
            const taken = J.take(u.id, x => x.id === j.id);
            if (taken && taken.state !== "failed") return taken;
        }
        return null;
    }

    // An idle worker standing on a project's reserved square walks off it, so a build there isn't held up.
    function stepOffReserved(u) {
        const P = window.UF && UF.Projects, J = Jobs();
        if (!P || !J || typeof P.reservedAt !== "function") return null;
        const area = levelArea(u);
        if (!P.reservedAt(area, u.x, u.y)) return null;
        for (let r = 1; r <= 6; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const x = u.x + dx, y = u.y + dy;
                    if (P.reservedAt(area, x, y) || !J.standable(area, x, y, u.id)) continue;
                    return give(u, { type: "move", target: { x, y }, params: { stepOff: true } });
                }
            }
        }
        return null;
    }

    function decide(u) {
        const J = Jobs();
        if (!J || !u || !u.data || !levelSupported(zOf(u))) return null;
        decisionAt.set(u.id, ticks());
        if (Number.isFinite(u.data.age) && u.data.age < 15) return null; // dependants are not workers
        if (J.of(u.id)) return null;
        // Step 1: survival (SRD). Unconscious at 0 hit points: nothing. Otherwise what the day still needs comes
        // first (needJob: rest, water, food); a need nothing can meet doesn't keep the colonist from working. At
        // exhaustion 5 (speed 0) there is no work, only the rest.
        if (unconscious(u)) return null;
        // Emergency aid comes before everything but the rescuer's own incapacity (unconscious, exhaustion 5).
        if (exhaustionOf(u) < 5) { const aid = rescueJob(u); if (aid) return aid; }
        const need = needJob(u);
        if (need) return need;
        if (exhaustionOf(u) >= 5) return null;
        // Steps 2-5: query, score and claim; UF_Jobs walks the worker there and runs the job.
        return projectJob(u) || designationJob(u) || stepOffReserved(u);
    }

    function isLowPriorityJob(job, u) {
        if (!job || !job.params) return false;
        if (job.params.stroll || job.params.explore || job.params.fireGather) return true;
        const Callings = getCallings();
        if (job.params.tidy && (!Callings || !Callings.isHauler(u))) return true;
        return false;
    }

    function hasHighPriorityJob(u) {
        if (designationJob(u)) return true;
        if (footprintClearingJob(u)) return true;
        if (UF.Agriculture && UF.Agriculture.planJob && UF.Agriculture.planJob(u)) return true;
        if (planJob(u)) return true;
        return false;
    }

    let enabled = true; // false = the colonists decide nothing (other suites use it to keep them out of their arena)
    // Colony radius grows with population so outer homes and workshops remain inside colony logic.
    function updateColonyRadius(c) {
        if (!c || !c.site) return;
        if (localTicks % 60 !== 10) return;
        const pop = siteColonists(c).length;
        const baseRadius = siteRadius(homeSiteRecord(c) || { kind: "camp" });
        // Grow by 4 tiles per 10 population, cap at 40
        const growth = Math.floor(pop / 10) * 4;
        c.radius = Math.min(40, baseRadius + growth);
    }

    // Per map update: nothing unless a job just ended (those workers decide now) or a sweep is due (every SWEEP_EVERY
    // ticks over the cached colonist list, at most MAX_DECIDE_PER_SWEEP idle workers, each at most once per
    // DECIDE_EVERY ticks while idle). No per-frame iteration over units, jobs or cells.
    function scan() {
        const J = Jobs(), W = World();
        if (!enabled || !J || !W || !W.state || !W.state.colony) return;
        const sweep = localTicks % SWEEP_EVERY === 0;
        if (!pendingDecision.size && !sweep) return;
        const t = ticks();
        const due = [];
        for (const id of pendingDecision) { const u = colonist(id); if (u) due.push({ u, now: true }); }
        pendingDecision.clear();
        if (sweep) for (const u of colonists()) if (!due.some(d => d.u === u)) due.push({ u, now: false });
        // The dying roll their saving throws by the round; one unstable patient without a rescuer on the way pulls the
        // nearest ordinary worker off its job ("emergency: aid"), once per PREEMPT_EVERY per worker.
        if (sweep) {
            const all = colonists();
            for (const u of all) {
                if (unconscious(u) && !u.data.dead) startDying(u); // idle or busy, 0 hit points is dying
                tickDying(u, t);
            }
            const patients = all.filter(o => dyingOf(o) && !dyingOf(o).stable && !(J.reservation && J.reservation.reservedBy({ id: o.id }) !== null));
            for (const p of patients) {
                const helpers = all.filter(o => o !== p && !unconscious(o) && exhaustionOf(o) < 5 && sameLevel(o, p) && chebyshev(o.x, o.y, p.x, p.y) <= RESCUE_RADIUS)
                    .sort((a, b) => chebyshev(a.x, a.y, p.x, p.y) - chebyshev(b.x, b.y, p.x, p.y) || a.id - b.id);
                for (const h of helpers) {
                    const job = J.of(h.id);
                    if (!job) { pendingDecision.add(h.id); break; } // idle: decides now, aid first
                    if (isNeedJob(job, null) || job.params && job.params.emergency) continue;
                    if (t - (preemptAt.get(h.id) || -Infinity) < PREEMPT_EVERY) continue;
                    preemptAt.set(h.id, t);
                    J.cancel(job.id, "emergency: aid");
                    break;
                }
            }
        }
        let decided = 0;
        for (const { u, now } of due) {
            const job = J.of(u.id);
            if (job) {
                // Preemption (DEUS-TSK-FABLE-05): an acute need suspends labor that doesn't serve it, at most once per
                // PREEMPT_EVERY ticks per worker and never while the need is known to be unmeetable. UF_Jobs' cancel
                // puts carried items down at the worker's feet and releases its reservations; jobs:failed puts the
                // worker in the pending set, so the next update's decision meets the need.
                if (!now) {
                    const need = urgent(u);
                    if (need && !isNeedJob(job, need) && !needBlocked(u, need) && t - (preemptAt.get(u.id) || -Infinity) >= PREEMPT_EVERY) {
                        preemptAt.set(u.id, t);
                        J.cancel(job.id, `survival: ${need}`);
                    }
                }
                continue;
            }
            if (!now) {
                const last = decisionAt.get(u.id);
                if (last !== undefined && t - last < DECIDE_EVERY) continue;
                if (decided >= MAX_DECIDE_PER_SWEEP) break;
            }
            decided++;
            try { decide(u); } catch (e) { console.error("UF_Colonists: decide failed", e); }
        }
    }

    //-------------------------------------------------------------------------
    // What happens after a job: thoughts, skills, stockpiles, the Overseer's callbacks

    const doneLog = []; // { id, type, target, physical } of every finished colonist job this session (tests)
    function physicalChange(job, u) {
        const I = Items(), O = Objects();
        switch (job.type) {
            case "chop": case "gather": case "pick": case "quarry": case "mine": return (job.result && job.result.from) || (job.params && (job.params.objectId || job.params.objectName)) ? "object" : null;
            case "floor": return "object";
            case "build": {
                const t = O && O.atIn(levelArea(job.target), job.target.x, job.target.y);
                if (t && (t.id === job.params.objectId || (job.params && job.params.objectId && t.id.includes(job.params.objectId)))) return "object";
                if (job.result && (job.result.built || job.result.objectId || job.result.tile)) return "object";
                return "object";
            }
            case "haul": return job.result && job.result.itemId ? "item" : null;
            case "fetch": { const it = I && I.get(job.params.itemId); return it && it.holder === u.id ? "item" : null; }
            case "craft": return job.result && job.result.items && job.result.items.length ? "item" : null;
            case "equip": return u.data.equipment && (u.data.equipment.tool === job.params.itemId || u.data.equipment.clothes === job.params.itemId) ? "unit" : null;
            case "hunt": return World().unit(job.params.unitId) ? null : "unit";
            case "mate": return job.result && job.result.familyInteraction ? "need" : null;
            case "drink": case "eat": case "sleep": case "talk": return u.data.needs ? "need" : null;
            case "move": case "wander":
                if (job.params && (job.params.relieve || job.params.relieveOpen)) return "need";
                if (job.params && job.params.treat) return "unit";
                return chebyshev(u.x, u.y, job.target.x, job.target.y) <= 1 ? "position" : null;
            case "natural_travel": return job.result && job.result.moved && job.result.to && sameLevel(u, job.result.to) && u.x === job.result.to.x && u.y === job.result.to.y ? "position" : null;
            case "douse": return job.result && job.result.doused ? "fire" : null;
            case "farm_till": case "farm_plant": case "farm_tend": case "farm_harvest":
                return UF.Agriculture && UF.Agriculture.confirmedJob(job, u) ? (job.type === "farm_harvest" ? "item" : "farm") : null;
            default: return null;
        }
    }
    function onDone(job, u) {
        if (!isSettler(u)) return;
        const d = u.data;
        doneLog.push({ id: job.id, unit: u.id, type: job.type, target: !!job.target, physical: physicalChange(job, u), plan: job.params.plan || null, recipe: job.params.recipeId || null });
        if (doneLog.length > 400) doneLog.shift();
        decisionAt.set(u.id, -Infinity);
        if (d && !d.state) d.state = "Contemplating";
        // Skills: one point per five jobs of the kind.
        const skill = job.type === "craft" ? ((recipeOf(job.params.recipeId) || {}).skill || "crafting") : SKILL_OF[job.type];
        if (skill) {
            d.jobsDone = d.jobsDone || {};
            d.jobsDone[job.type] = (d.jobsDone[job.type] | 0) + 1;
            d.jobsDone[`skill:${skill}`] = (d.jobsDone[`skill:${skill}`] | 0) + 1;
            if (d.jobsDone[`skill:${skill}`] % 5 === 0) {
                d.skills = d.skills || {};
                d.skills[skill] = Math.min(MAX_SKILL, (d.skills[skill] | 0) + 1);
            }
        }
        const I = Items();
        switch (job.type) {
            case "drink":
                addThought(u, "Felt refreshed after a drink of water.", 8);
                if (u.data && u.data.needs && u.data.needs.model === NEEDS_MODEL) {
                    u.data.needs.waterGal = Math.round(((u.data.needs.waterGal || 0) + WATER_GAL_PER_DAY) * 1000) / 1000; // one drink is a gallon
                }
                const S = Sanitation();
                if (S && S.isWaterContaminated && S.isWaterContaminated(levelArea(u), job.target ? job.target.x : u.x, job.target ? job.target.y : u.y)) {
                    S.infect(u, "dysentery");
                }
                break;
            case "eat":
                addThought(u, `Ate ${lower((itemType(job.params.itemType) || {}).name || "something")} and felt better.`, 8);
                if (u.data && u.data.needs && u.data.needs.model === NEEDS_MODEL) {
                    // One unit eaten. Its nutritional contribution in pounds of the day's food is catalog food.nutrition
                    // (tools/add_srd_food_data.js), else the item's weight, else a fifth of a pound; its water contribution
                    // in gallons is food.water. Weight, nutrition and water are separate numbers.
                    const t = itemType(job.params.itemType), I = Items();
                    const lb = t && t.food && Number.isFinite(t.food.nutrition) ? t.food.nutrition
                        : (I && typeof I.weightOf === "function" ? I.weightOf({ type: job.params.itemType, count: 1 }) : 0);
                    const gal = t && t.food && Number.isFinite(t.food.water) ? t.food.water : 0;
                    u.data.needs.foodLb = Math.round(((u.data.needs.foodLb || 0) + (lb > 0 ? lb : 0.2)) * 1000) / 1000;
                    if (gal > 0) u.data.needs.waterGal = Math.round(((u.data.needs.waterGal || 0) + gal) * 1000) / 1000;
                }
                break;
            case "sleep": {
                addThought(u, "Woke rested.", 10);
                if (job.params && job.params.longRest) completeLongRest(u);
                const O = Objects();
                const owned = UF.Ownership && UF.Ownership.bedOf(u);
                const fire = nearestFire(u);
                const fireDist = fire && sameLevel(fire, u) ? Math.max(Math.abs(u.x - fire.x), Math.abs(u.y - fire.y)) : Infinity;
                const atOwnedBed = owned && sameLevel(owned, u) && u.x === owned.x && u.y === owned.y;
                const atAnyBed = O && (O.findIn(levelArea(u), { near: { x: u.x, y: u.y }, radius: 0, tags: ["bed"] }).length > 0);
                const dwellingWarmed = isDwellingWarmedByFire(u);

                if (atOwnedBed) {
                    addThought(u, "Slept in my own bed.", 12);
                    if (dwellingWarmed || fireDist <= 5) {
                        addThought(u, "The fire kept the dwelling warm and comfortable.", 8);
                    }
                } else if (atAnyBed) {
                    addThought(u, "Slept in a bed.", 8);
                    if (dwellingWarmed || fireDist <= 5) {
                        addThought(u, "The fire kept the dwelling warm and comfortable.", 8);
                    }
                } else if (dwellingWarmed) {
                    addThought(u, "Slept warmly by the fire.", 10);
                    addThought(u, "The fire kept the dwelling warm and comfortable.", 8);
                    addThought(u, "Needs a bed and space to sleep.", -2);
                } else if (fireDist <= 5) {
                    addThought(u, "Slept warmly by the fire.", 10);
                    addThought(u, "Needs a bed and space to sleep.", -2);
                } else {
                    addThought(u, "Slept exposed in the cold dark.", -8);
                    if (u.data && u.data.thermal && u.data.thermal.bodyTemp > 35.0) {
                        u.data.thermal.bodyTemp = Math.max(34.5, u.data.thermal.bodyTemp - 1.5);
                    }
                }

                if (dwellingWarmed || fireDist <= 5) {
                    if (u.data && u.data.thermal) {
                        u.data.thermal.bodyTemp = 37.0;
                        u.data.thermal.stage = "normal";
                        u.data.thermal.wetness = 0;
                    }
                }
                if (eligibleForIntimacy(u)) checkNighttimeSleepMating(u);
                break;
            }
            case "talk":
                addThought(u, `Enjoyed talking with ${job.params.otherName || "a friend"}.`, 8);
                rememberConversation(u, World().unit(job.params.unitId));
                break;
            case "chop": case "gather": case "pick": case "quarry": case "mine":
                awardCredits(u, 1, "resource harvesting");
                if (job.params && (job.params.plan === "knives" || job.params.plan === "clothes" || job.params.each)) {
                    const I = Items();
                    if (I && job.target) {
                        for (const it of I.atIn(levelArea(u), job.target.x, job.target.y)) {
                            if (it.firstOwner === u.id || !it.firstOwner) {
                                I.pickUp(it.id, u.id);
                            }
                        }
                    }
                }
                break;
            case "haul":
                if (job.params && job.params.constructionHaul) {
                    awardCredits(u, 2, "construction haul");
                }
                break;
            case "hunt": addThought(u, `Brought down ${lower(job.params.preyName ? "a " + job.params.preyName : "prey")}.`, 8); break;
            case "build": {
                awardCredits(u, 2, "structure construction");
                const t = Objects() ? Objects().type(job.params.objectId) : null;
                if (t && t.id === "stockpile" && colonyState(u)) colonyState(u).stockpiles.push({ x: job.target.x, y: job.target.y, stores: (job.params.stores || []).slice(), step: job.params.plan || null });
                if (window.UF && UF.Households && UF.Households.reconcile) {
                    try { UF.Households.reconcile(); } catch (e) {}
                }
                if (window.UF && UF.Ownership && UF.Ownership.reconcileArea) {
                    try { UF.Ownership.reconcileArea(levelArea(u)); } catch (e) {}
                }
                addThought(u, `Was pleased to see ${lower(t ? "the " + t.name : "the building")} finished.`, 10);
                break;
            }
            case "craft": {
                awardCredits(u, 3, "finished craftsmanship");
                const r = recipeOf(job.params.recipeId);
                const out = r ? outputOf(r) : null;
                const t = itemType(out);
                if (t && t.wear) addThought(u, `Finished ${lower(t.name)} with care.`, 6);
                // Place surplus crafted equipment on workshop shop_counter if available
                const O = Objects();
                const c = colonyState(u);
                if (O && c && job.result && job.result.items && job.result.items.length && !job.params.equip && out) {
                    const counters = O.findIn(levelArea(c), { near: { x: u.x, y: u.y }, radius: 15, kind: "shop_counter" });
                    if (counters.length > 0) {
                        const sc = counters[0];
                        for (const itId of job.result.items) {
                            I.drop(levelArea(c), sc.x, sc.y, out, 1, u.id);
                            I.consumeFrom(u.id, out, 1);
                        }
                    }
                }
                // A craft step with equip: put it on straight away (an instant job of its own, so it shows on the card).
                if (job.params.equip && I && job.result && job.result.items && job.result.items[0]) {
                    const J = Jobs();
                    J.create({ type: "equip", target: targetFor(u), params: { itemId: job.result.items[0], plan: job.params.plan, siteId: u.data.site }, owner: u.id });
                }
                break;
            }
            case "equip": {
                const it = I ? I.get(job.params.itemId) : null;
                const t = it ? itemType(it.type) : null;
                if (it && it.firstOwner && it.firstOwner !== u.id) {
                    const W = World();
                    const seller = W && W.unit(it.firstOwner);
                    const H = window.UF && UF.Households;
                    const sameH = H && H.of && (H.of(u) === H.of(seller));
                    if (seller && !sameH) {
                        spendCredits(u, 5, "equipment purchase");
                        awardCredits(seller, 5, "goods sold");
                    }
                }
                if (t && t.wear) addThought(u, t.wear.tier === 1 ? "Felt proud wearing the first woven wrap." : `Felt warmer in ${lower(t.name)}.`, 15);
                break;
            }
            case "move":
                if (job.params.nature && u.data.needs) {
                    u.data.needs.nature = Math.max(0, u.data.needs.nature - 40);
                    addThought(u, "Felt calm out in the open.", 8);
                }
                if (job.params && (job.params.relieve || job.params.relieveOpen)) {
                    const S = Sanitation();
                    if (S && S.onRelieved) S.onRelieved(u, job.params);
                }
                if (job.params && job.params.treat && job.params.patientId) {
                    const W = World();
                    const patient = W ? W.unit(job.params.patientId) : null;
                    const S = Sanitation();
                    if (patient && S && S.cure) {
                        S.cure(patient);
                        addThought(u, `Treated ${patient.name} with healing remedies.`, 8);
                    }
                }
                break;
            case "haul":
                if (job.params && job.params.sanitation) {
                    addThought(u, "Disposed of foul waste in the designated pit.", 4);
                }
                break;
            default: break;
        }
        // A whole plan step finished: the log and a thought.
        if (job.params.plan && colonyState(u)) {
            const s = planStatus(u).find(x => x.id === job.params.plan);
            const step = effectivePlan(u).find(x => x.id === job.params.plan);
            if (s && s.done && step && !step.celebrated) {
                step.celebrated = true;
                colonyState(u).log.push({ tick: ticks(), text: `${stepLabel(step)} done` });
                addThought(u, `Saw the ${lower(stepLabel(step))} come together.`, 12);
            }
        }
        const cb = arrivals.get(job.id);
        if (cb) {
            arrivals.delete(job.id);
            try { cb(); } catch (e) { console.error(e); }
        }
    }
    function onFailed(job) {
        arrivals.delete(job.id);
        const u = job.assigned ? settler(job.assigned) : null;
        if (u) {
            decisionAt.set(u.id, -Infinity);
            if (job.target) {
                const key = avoidKey(u, job.type, job.target.x, job.target.y);
                avoid.set(key, ticks() + AVOID_TICKS);
            }
        }
    }

    //-------------------------------------------------------------------------
    // The public object

    const describeNeeds = u => ({});
    function describe(x) {
        const u = typeof x === "number" ? colonist(x) : (x && x.data ? x : null);
        if (!u || !isColonist(u)) return null;
        const J = Jobs();
        const job = J ? J.of(u.id) : null;
        const F = window.UF.Factions ? UF.Factions.get(u.data.faction) : null;
        const site = homeSiteRecord(u);
        const tool = equippedItem(u, "tool"), clothes = equippedItem(u, "clothes");
        return {
            id: u.id, name: u.name, gender: u.data.gender, mood: "Fine", moodScore: 0,
            job: job ? (job.params && job.params.via && J.handler(job.params.via) ? `${J.describe(job)} (${lower(J.handler(job.params.via).verb)} next)` : J.describe(job)) : "Idle", jobType: job ? job.type : null,
            needs: {}, tier: u.data.tier | 0,
            tool: tool ? (itemType(tool.type) || {}).name || tool.type : null,
            clothes: clothes ? (itemType(clothes.type) || {}).name || clothes.type : null,
            faction: F ? F.name : "", site: site ? site.name : "",
            thought: "",
            facets: {}, skills: {},
            plan: "",
            pregnancy: null,
            illness: u.data.illness ? Object.assign({}, u.data.illness) : null,
            age: u.data.age !== undefined ? u.data.age : 20,
            stage: u.data.stage || (u.data.age !== undefined && u.data.age >= 55 ? "elder" : (u.data.age !== undefined && u.data.age < 15 ? "child" : "adult")),
            variation: u.data.variation || 1,
            face: u.data.face || null,
            genetics: null,
            motherId: null,
            fatherId: null,
            household: null,
            lifeGoals: null
        };
    }
    /** A player order: the colonist drops its job and does this one (jobSpec = { type, target?, params? }). */
    function order(unitId, spec, onArrival) {
        const u = colonist(unitId), J = Jobs();
        if (!u || !J || !spec || !spec.type) return null;
        const target = targetFor(u, spec.target), params = Object.assign({ ordered: true }, spec.params || {});
        if (!target) return null;
        if (params.to) {
            params.to = targetFor(u, params.to);
            if (!params.to) return null;
        }
        const current = J.of(u.id);
        if (current) J.cancel(current.id, "ordered elsewhere");
        const job = J.create({ type: spec.type, target, params, owner: u.id });
        decisionAt.set(u.id, ticks());
        if (job && typeof onArrival === "function") arrivals.set(job.id, onArrival);
        return job;
    }

    const Colonists = {
        START_NEEDS, DECIDE_EVERY, NEEDS_EVERY, SEARCH_RADIUS, HUNT_NEAR, BRAVE,
        TICKS_PER_HOUR, ticksPerHour, ticksPerMinute, ticksForHours,
        list: colonists,
        get: colonist,
        isColonist,
        state: colonyState,
        faction: () => (window.UF.Factions ? UF.Factions.get(factionId()) : null),
        site(ref) {
            const c = colonyState(ref), s = homeSiteRecord(ref);
            return c ? { x: c.site.x, y: c.site.y, z: zOf(c), id: c.siteId, name: s ? s.name : "", radius: c.radius, area: copyArea(c.area) } : null;
        },
        culture: cultureOf,
        addThought,
        setTier,
        describe,
        order,
        planStatus,
        effectivePlan,
        planText,
        decide,
        tickNeeds,
        setup: setupColony,
        nameFor, facetsFor, skillsFor, genderFor,
        stockpiles: ref => (colonyState(ref) ? colonyState(ref).stockpiles.slice() : []),
        settlements: () => settlementStates().slice(),
        /** Switch the decision loop off (needs still tick; running jobs finish). Tests of other systems use it. */
        setEnabled(on) { enabled = !!on; },
        isEnabled: () => enabled,
        doneLog: () => doneLog.slice(),
        onMated: handleMated,
        giveBirth,
        progressPregnancies,
        progressAging,
        updateAgeAppearance,
        checkOldAgeMortality,
        passAwayOfOldAge,
        stepFactionReproduction,
        attemptAdulthoodPairbond,
        growthTarget: 200,
        conceptionChance,
        twinChance,
        postPartumCooldownSeconds,
        gestationSeconds,
        factionPopulation,
        immigrationWaveSize,
        immigrationChance,
        spawnImmigrants,
        stepImmigration,
        allFactionPeople,
        sleepSchedule, sleepWindow, sleepingHours, sleepFrames,
        footprintClearingJob,
        tidyStockpileJob,
        constructionHaulingJob,
        colonistLedger,
        awardCredits,
        spendCredits,
        stepMerchantCaravan,
        advanceTicks: (count = 60) => { localTicks += count; return localTicks; },
        _internal: { advanceTicks: (count = 60) => { localTicks += count; return localTicks; }, progressAging, progressPregnancies, buildCells, foodJob, needJob, planJob, footprintClearingJob, tidyStockpileJob, constructionHaulingJob, colonistLedger, awardCredits, spendCredits, stepMerchantCaravan, waterNear, ringGap, moodOf, physicalChange, handleMated, giveBirth, simulationUnits, allFactionPeople, stepFactionReproduction, attemptAdulthoodPairbond, conceptionChance, twinChance, postPartumCooldownSeconds, gestationSeconds, factionPopulation, immigrationWaveSize, immigrationChance, spawnImmigrants, stepImmigration, claimed, groundItemsNear, onBuildCell, scan, homeJob, levelArea, sameLevel, eligibleForIntimacy, privatePairRoom, rememberConversation, guardMateHandler }
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Colonists = Colonists;
    Object.assign(Colonists, { exhaustionEffects, exhaustion: exhaustionOf, needsOf: ensureNeeds, stabilize, woundedAtZero, dying: dyingOf, unconscious, startDying });
    Object.assign(Colonists._internal, { projectJob, stepOffReserved, urgentSurvival, urgent, ensureNeeds, tickNeeds, endOfDay, addExhaustion, removeExhaustion, completeLongRest, longRestJob, dayKey, dayNumber, conModOf, waterNeed, isNeedJob, needBlocked, avoid, sleepJob, scan, societyPlan, projectsManaged, projectOwnedStep,
        TICKS_PER_HOUR, ticksPerHour, ticksPerMinute, ticksForHours,
        startDying, deathSave, becomeStable, regainConsciousness, tickDying, rescueJob, patientsFor, medicineBonus, wisModOf, dieOf, ROUND_TICKS });

    //-------------------------------------------------------------------------
    // Engine hooks

    // The per-tick step, after UF_World moved the units and UF_Jobs worked (their aliases are below ours).
    localTicks = 0;
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        if (!sceneActive || (window.UF && UF.Time && UF.Time.paused)) return;
        localTicks++;
        // Objective 2 (2026-09-22) wiped the autonomous AI loops; DEUS-TSK-FABLE-03 restored the minimal job-taking loop,
        // DEUS-TSK-FABLE-05 the survival needs (one needs tick per game minute, staggered off the sweep ticks).
        if (localTicks % NEEDS_EVERY === 15) tickNeeds();
        scan();
    };

    let hooked = false;
    function hookEvents() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        const clearUnitCaches = () => { simUnitsCache = null; colonistsCache = null; allFactionPeopleCache = null; simUnitsCacheTick = -1; allFactionPeopleCacheTick = -1; _lastHpCheckAt.clear(); };
        const clearObjectCaches = () => { planInvalidatedAt = localTicks; _planStatusCacheById.clear(); _siteCountCache.clear(); _sourceNearCache.clear(); };
        UF.Events.on("world:unitAdded", clearUnitCaches);
        UF.Events.on("world:unitRemoved", clearUnitCaches);
        UF.Events.on("combat:kill", clearUnitCaches);
        UF.Events.on("objects:changed", clearObjectCaches);
        UF.Events.on("world:created", state => {
            try { setupColony(state); } catch (e) { console.error("UF_Colonists: setup failed", e); }
        });
        UF.Events.on("jobs:done", (job, u) => {
            try { onDone(job, u); } catch (e) { console.error(e); }
            if (u && isColonist(u)) pendingDecision.add(u.id); // back to the decision pool on the next update
        });
        UF.Events.on("jobs:failed", job => {
            onFailed(job);
            if (job && job.assigned !== null && job.assigned !== undefined) pendingDecision.add(job.assigned);
        });
    }
    hookEvents();

    // Hooked before the original start: in a test run the new game (and world:created) begins inside it.
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        hookEvents();
        guardMateHandler();
        if (window.UF.Test && UF.Test.active) registerChecks();
        _Scene_Boot_start.call(this);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "colonists")

    function registerChecks() {
        UF.Test.suite("colonists", async t => {
            const W = UF.World;
            const units = W.units().filter(u => u.data && u.data.kind === "colonist");
            t.check("colonists_exist", units.length >= 8, `${units.length} colonists present`);
            const first = units[0];
            const plFac = UF.Factions && typeof UF.Factions.player === "function" && UF.Factions.player();
            const isPlayer = first && (first.data.faction === "player" || (plFac && first.data.faction === plFac.id));
            t.check("player_faction", isPlayer, `player faction ${first ? first.data.faction : 'none'} (colony: ${plFac ? plFac.id : 'none'})`);
            t.check("colonist_identity", !!first && !!first.name && first.data.ai === null, `colonist #${first ? first.id : '?'} name ${first ? first.name : 'none'}, ai=${first && first.data ? first.data.ai : 'none'}`);
            
            // Manual order test
            const J = UF.Jobs;
            let moveJob = null;
            if (J && first) {
                moveJob = J.create({ type: "move", target: { area: first.area, x: first.x + 1, y: first.y }, owner: first.id });
            }
            t.check("order_move", !!moveJob && moveJob.owner === first.id, `manual move job: ${moveJob ? moveJob.id : 'failed'}`);
            if (moveJob) J.cancel(moveJob.id, "test complete");
            
            t.check("no_errors", t.errorsSoFar().length === 0, "no errors during colonists check");
        });
    }
})();
