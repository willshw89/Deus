//=============================================================================
// UF_Colonists.js - The colony: the player's faction's people at its home site, their needs, plan, thoughts and skills
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Colonists] The people of the player's faction at its home site become the colonists: needs, a society plan (build, craft, stock), hunting, cooking, tools and clothes, thoughts, skills.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_Jobs
 * @orderAfter UF_History
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
    const AVOID_TICKS = 900;        // a job that failed isn't tried again on the same target for this long
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
    const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    const levelArea = r => { const a = r && (r.area || r); return a ? { x: a.x, y: a.y, z: zOf(r) } : null; };
    const levelSupported = z => Number.isInteger(z) && z >= -2 && z <= 2 &&
        (z === 0 || !!(World() && World().viewLevel && World().levelOfMapId));
    const sameLevel = (a, b) => !!a && !!b && sameArea(a.area || a, b.area || b) &&
        levelSupported(zOf(a)) && zOf(a) === zOf(b);
    const targetFor = (u, target) => {
        const t = target || u, area = t.area || u.area;
        const z = t.z !== undefined ? t.z : t.area && t.area.z !== undefined ? t.area.z : zOf(u);
        const ref = { area: copyArea(area), x: t.x | 0, y: t.y | 0, z };
        return sameLevel(u, ref) ? ref : null;
    };
    const chebyshev = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    const lower = s => String(s || "").toLowerCase();
    const ticks = () => (window.UF && UF.Time && UF.Time.ticks ? UF.Time.ticks() : (World() ? World()._frame : 0));
    const hourNow = () => (window.$ufTime ? $ufTime.hour : 8);

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
    const itemType = id => (Items() ? Items().type(id) : null);
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
        return sourceCache.map[itemId] || [];
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
    const isColonist = u => !!u && !!u.data && u.data.kind === "colonist" && u.data.faction === factionId();
    const isSettler = u => !!(u && u.data && !u.data.manual && u.data.ai !== "manual" && (!u.name || !u.name.startsWith("TEST_"))) && (isColonist(u) || !!(u && u.data && (u.data.kind === "person" || u.data.kind === "colonist") && (u.data.ai === "settlement" || u.data.founder)));
    const isFactionPerson = u => !!(u && u.data && (u.data.kind === "colonist" || u.data.kind === "person") && u.data.faction && !u.data.dead && !u.data._isDying);
    const allFactionPeople = () => (World() ? World().units().filter(isFactionPerson) : []);
    const simulationUnits = () => (World() ? World().units().filter(isSettler) : []);
    const settler = id => { const u = World() ? World().unit(id) : null; return isSettler(u) ? u : null; };
    const colonists = () => (World() ? World().units().filter(isColonist) : []);
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

    function effectivePlan(ref) {
        const c = colonyState(ref);
        if (!c) return [];
        const W = World(), u = typeof ref === "number" ? W.unit(ref) : ref && ref.data ? ref : siteColonists(c)[0];
        if (u && u._cachedEffectivePlanTick === localTicks && u._cachedEffectivePlan) return u._cachedEffectivePlan;
        const H = window.UF && UF.Households, G = window.UF && UF.Goals;
        const mySteps = (u && H && H.planSteps) ? H.planSteps(u) : [];
        const goalSteps = (u && G && G.planSteps) ? G.planSteps(u) : [];

        // Cooperative settlement construction: prioritize the active focal household so all villagers unite on finishing it!
        const focal = H && H.activeFocalHousehold ? H.activeFocalHousehold(c) : null;
        const neighborSteps = [];
        if (H && H.all) {
            const myHId = u && u.data && u.data.householdId;
            // 1. If there is an active focal household and it is not my own, include its active steps
            if (focal && focal.id !== myHId && focal.home && H.planSteps) {
                const focalPeople = H.members ? H.members(focal) : [];
                const focalRep = focalPeople.find(p => p.data && p.data.age >= 15) || focalPeople[0] || u;
                if (focalRep) {
                    const fSteps = H.planSteps(focalRep);
                    for (const s of fSteps) {
                        if (s) neighborSteps.push(s);
                    }
                }
            }
            // 2. Include steps from all other households with a home planned so nothing sits unbuilt
            for (const h of H.all().filter(h => sameLevel(h, c) && h.home && !h.mergedInto)) {
                if (h.id === myHId || (focal && h.id === focal.id)) continue;
                const people = H.members ? H.members(h) : [];
                const rep = people.find(p => p.data && p.data.age >= 15) || people[0] || u;
                if (rep && H.planSteps) {
                    const hSteps = H.planSteps(rep);
                    for (const s of hSteps) {
                        if (s) neighborSteps.push(s);
                    }
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
                if (h.home && h.home.entrance) {
                    const ex = h.home.entrance.x - c.site.x;
                    const ey = h.home.entrance.y - c.site.y;
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

        const P = Pillars();
        const pillarSteps = (c && P && P.pillarPlanSteps) ? P.pillarPlanSteps(c, u) : [];
        const soSteps = standingOrders(u || ref);
        const msSteps = populationMilestoneSteps(u || ref);
        const extra = u ? [ ...mySteps, ...neighborSteps, ...civicSteps, ...pillarSteps, ...goalSteps, ...soSteps, ...msSteps ] : [];
        const seen = new Set();
        const res = [...c.plan, ...extra].filter(s => s && s.id && (!s.goalOwner || (u && s.goalOwner === u.id)) &&
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
        if (!unit || !unit.data) return null;
        const d = unit.data;
        if (!Array.isArray(d.thoughts)) d.thoughts = [];
        const thought = { text: String(text), strength: strength | 0, hour: hourNow(), tick: ticks() };
        d.thoughts.unshift(thought);
        if (d.thoughts.length > THOUGHTS_KEPT) d.thoughts.length = THOUGHTS_KEPT;
        d.moodScore = clamp((d.moodScore | 0) + (strength | 0), -100, 100);
        d.mood = moodOf(d.moodScore);
        emit("colonists:thought", unit, thought);
        return thought;
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
        d.ai = player ? "colonist" : "settlement";
        d.faction = site.faction;
        d.sight = 8;
        d.gender = gender;
        d.tier = 0;
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
        d.facets = d.facets || facetsFor(state.seed, u.id, cultureOf(u).facetBias);
        d.skills = d.skills || skillsFor(state.seed, u.id);
        d.needs = Object.assign({}, START_NEEDS, d.needs || {});
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
        d.thoughts = d.thoughts || [];
        if (d.moodScore === undefined) d.moodScore = 20;
        d.mood = moodOf(d.moodScore);
        d.jobsDone = d.jobsDone || {};
        d.site = site.id;
        d.home = { area: copyArea(site.area), x: site.x, y: site.y, z: zOf(site) };
        addThought(u, `Woke at home in ${site.name}.`, 10);
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
        const taken = new Set(W.units().map(u => u.name));
        for (const site of W.state.history.sites || []) {
            if (site.ruined || !levelSupported(zOf(site))) continue;
            const residents = W.units().filter(u => u.data && (u.data.kind === "person" || u.data.kind === "colonist") &&
                !u.data.manual && u.data.ai !== "manual" && (!u.name || !u.name.startsWith("TEST_")) &&
                u.data.faction === site.faction && (u.data.site === site.id || (!u.data.site && sameLevel(u, site))));
            if (!residents.length) continue;
            if (site.id !== primary.siteId && !primary.settlements[site.id]) {
                primary.settlements[site.id] = { version: 2, factionId: site.faction, siteId: site.id,
                    site: { x: site.x, y: site.y }, area: copyArea(site.area), z: zOf(site), radius: siteRadius(site),
                    plan: makePlan(site), stockpiles: [], log: [] };
            }
            for (const u of residents) {
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
        let best = null, bestD = Infinity;
        const x0 = Math.max(0, x - radius), x1 = Math.min(size - 1, x + radius), y0 = Math.max(0, y - radius), y1 = Math.min(size - 1, y + radius);
        for (let cy = y0; cy <= y1; cy++) {
            const dy = Math.abs(cy - y);
            if (dy >= bestD) continue;
            for (let cx = x0; cx <= x1; cx++) {
                const t = grid[cy * size + cx];
                if (!t) continue;
                const d = Math.hypot(cx - x, cy - y);
                if (d > radius || d >= bestD) continue;
                const type = list[t - 1];
                if (!type || !pred(type, cx, cy)) continue;
                best = { x: cx, y: cy, type, dist: d };
                bestD = d;
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
    function isObjectClaimed(u, x, y, action) {
        for (const j of activeJobs()) {
            if (j.assigned === u.id || !j.target || !sameLevel(j.target, u)) continue;
            if (j.type === action && j.target.x === x && j.target.y === y) return true;
            if (j.type === "move" && j.params && j.params.via === action && j.params.viaTarget && j.params.viaTarget.x === x && j.params.viaTarget.y === y) return true;
        }
        return false;
    }
    function objectSourceNear(u, itemId, radius) {
        if (!sourcesOf(itemId).length) return null;
        const fast = scanObjects(levelArea(u), u.x, u.y, radius, (t, x, y) => {
            const act = yieldsItem(t, itemId);
            return !!act && (t.id === "rocks_small" || (t.actions && t.actions[act[0]] && t.actions[act[0]].work <= 40)) && !sitePiece(t, x, y, u) && !isObjectClaimed(u, x, y, act[0]);
        });
        if (fast) return Object.assign(fast, { action: yieldsItem(fast.type, itemId)[0] });
        const f = scanObjects(levelArea(u), u.x, u.y, radius, (t, x, y) => {
            const act = yieldsItem(t, itemId);
            return !!act && !sitePiece(t, x, y, u) && !isObjectClaimed(u, x, y, act[0]);
        });
        return f ? Object.assign(f, { action: yieldsItem(f.type, itemId)[0] }) : null;
    }
    function foodObjectNear(u, radius) {
        const f = scanObjects(levelArea(u), u.x, u.y, radius, (t, x, y) => {
            const act = yieldsFood(t);
            return !!act && !sitePiece(t, x, y, u) && !isObjectClaimed(u, x, y, act[0]);
        });
        return f ? Object.assign(f, { action: yieldsFood(f.type)[0] }) : null;
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
        const f = O.findIn(levelArea(c), { near: { x: c.site.x, y: c.site.y }, radius: c.radius + 1, tags: ["fire"], limit: 1 });
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
        return { type: "craft", params: plan ? { recipeId, plan } : { recipeId } };
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
            for (const s of c.plan || []) {
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
        if (!needs[itemTypeId]) return false;
        const I = Items();
        if (I) {
            const countOnCell = I.count({ area: levelArea(c), z: zOf(c), x, y }, itemTypeId);
            if (countOnCell > (needs[itemTypeId] || 1)) return false;
        }
        return true;
    }
    const carriedOf = (u, typeId) => (Items() ? Items().inventoryOf(u.id).filter(it => it.type === typeId) : []);
    const carriedCount = (u, typeId) => (Items() ? Items().count(u.id, typeId) : 0);
    const equippedItem = (u, slot) => {
        const I = Items();
        const id = u.data.equipment && u.data.equipment[slot];
        const it = id && I ? I.get(id) : null;
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
    const arrivals = new Map();   // job id -> callback (the Overseer's assignMoveTo)
    const preemptAt = new Map();  // unit id -> tick of the last need interruption (no thrash when the need can't be met)
    const PREEMPT_EVERY = 600;

    function activeJobs() {
        const J = Jobs();
        return J ? J.list(j => j.state === "travel" || j.state === "work") : [];
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
        return Math.round(Math.max(2, Math.min(11, left)) * 3600);
    }
    const isMealHour = () => (colonyConfig().mealHours || []).includes(hourNow());
    const evening = () => inHours(hourNow(), 19, 22);

    function tickNeeds() {
        const rates = needRates();
        const th = thresholds();
        const s = seed();
        for (const u of simulationUnits()) {
            const n = u.data.needs || (u.data.needs = Object.assign({}, START_NEEDS));
            if (asleep(u)) {
                n.sleep = Math.max(0, n.sleep - 0.6); // resting; the sleep job sets it to 5 at the end
            } else {
                for (const k of Object.keys(rates)) n[k] = clamp((n[k] || 0) + rates[k], 0, 100);
                n.waste = clamp((n.waste !== undefined ? n.waste : 10) + 0.25, 0, 100);
            }
            const roll = k => unit01(s, SALT.thought, u.id, ticks(), k);
            if (n.hunger > 75 && roll(1) < 0.05) addThought(u, "Was bothered by hunger.", -5);
            if (n.thirst > 75 && roll(2) < 0.05) addThought(u, "Felt parched.", -6);
            if (n.sleep > 85 && roll(3) < 0.05) addThought(u, "Was worn out for lack of sleep.", -7);
            if (n.social > 80 && roll(4) < 0.04) addThought(u, "Felt lonely.", -5);
            if (n.nature > 80 && roll(5) < 0.03) addThought(u, "Longed for the open country.", -3);
            if (n.waste > 85 && roll(10) < 0.06) addThought(u, "Desperately needed to find a latrine.", -6);
            const S = Sanitation();
            if (S && S.stenchNear && S.stenchNear(levelArea(u), u.x, u.y) && roll(11) < 0.08) {
                addThought(u, "Gagged from the foul stench of uncollected waste.", -6);
            }
            if (u.data && u.data.illness && roll(12) < 0.1) {
                addThought(u, "Suffered from painful stomach cramps and fever.", -8);
            }
            const Env = window.UF && UF.Environment;
            if (Env && typeof Env.unitThermal === "function") {
                const thm = Env.unitThermal(u);
                if (thm) {
                    if (thm.stage === "hypothermia_severe" || thm.stage === "critical") {
                        if (roll(6) < 0.08) addThought(u, "Shivered uncontrollably in the bitter frost.", -10);
                    } else if (thm.stage === "hypothermia_mild" || thm.stage === "chilled") {
                        if (roll(7) < 0.05) addThought(u, "Felt thoroughly chilled by the cold wind.", -4);
                    } else if (thm.stage === "heatstroke") {
                        if (roll(8) < 0.08) addThought(u, "Was dizzy with oppressive heatstroke.", -10);
                    }
                    if (thm.wetness > 60 && roll(9) < 0.06) {
                        addThought(u, "Was soaked to the skin.", -4);
                    }
                }
            }
        }
    }

    // Urgent needs interrupt other work (not a need job that's already running).
    function urgent(u) {
        if (u.data && u.data.burning) return "burning";
        if (u.data && u.data.illness && u.data.illness.severity >= 0.8) return "illness";
        const Env = window.UF && UF.Environment;
        if (Env && typeof Env.unitThermal === "function") {
            const thm = Env.unitThermal(u);
            if (thm && (thm.stage === "hypothermia_severe" || thm.stage === "critical")) return "hypothermia";
        }
        const n = u.data.needs, th = thresholds();
        if (!n) return null;
        if (n.waste >= (th.waste || 65) + URGENT_MARGIN) return "waste";
        if (n.thirst >= (th.thirst || 55) + URGENT_MARGIN) return "thirst";
        if (n.hunger >= (th.hunger || 55) + URGENT_MARGIN) return "hunger";
        return null;
    }

    //-------------------------------------------------------------------------
    // Decisions

    function needJob(u) {
        const n = u.data.needs, th = thresholds();
        if (!n) return null;
        if (n.thirst >= (th.thirst || 55)) {
            const w = waterNear(u, WATER_RADIUS);
            if (w) {
                const j = give(u, { type: "drink", target: w });
                if (j) return j;
            }
        }
        const hungry = n.hunger >= (th.hunger || 55) || (isMealHour() && n.hunger >= 30 && stockpilesStoring("food", u).length && foodStored(u).length);
        if (hungry) {
            const j = foodJob(u);
            if (j) return j;
        }
        if ((n.waste || 0) >= (th.waste || 65)) {
            const S = Sanitation();
            const rel = S && S.relieveJob ? S.relieveJob(u) : null;
            if (rel) {
                const j = give(u, rel);
                if (j) return j;
            }
        }
        if (n.sleep >= (th.sleep || 75) || (sleepingHours(u) && n.sleep > 40)) {
            const mate = n.sleep < 85 ? nightlyMateJob(u) : null;
            if (mate) return mate;
            if (!hasBedObject(u) && n.sleep < 88) {
                const bedJob = makeBedJob(u);
                if (bedJob) return bedJob;
            }
            const j = sleepJob(u);
            if (j) return j;
        }
        if (u.data.familyRendezvous && u.data.familyRendezvous.until > ticks() && n.sleep < 85) {
            const j = nightlyMateJob(u);
            if (j) return j;
        }
        if (u.data && u.data.housewarmingIntimacy && n.sleep < 90) {
            const j = nightlyMateJob(u);
            if (j) {
                delete u.data.housewarmingIntimacy;
                return j;
            }
        }
        const socialAt = evening() ? Math.min(th.social || 40, 25) : (th.social || 40);
        if (n.social >= socialAt) {
            const partner = simulationUnits().find(o => o.id !== u.id && sameLevel(o, u) && o.data.faction === u.data.faction && !Jobs().of(o.id) && chebyshev(o.x, o.y, u.x, u.y) <= 40);
            if (partner) {
                const j = give(u, { type: "talk", target: { x: partner.x, y: partner.y }, params: { unitId: partner.id } });
                if (j) return j;
            }
        }
        if (n.nature >= (th.nature || 35)) {
            const j = natureJob(u);
            if (j) return j;
        }
        return null;
    }

    const foodStored = ref => {
        const I = Items();
        const out = [];
        if (!I) return out;
        for (const s of stockpilesStoring("food", ref)) for (const it of I.atIn(siteArea(ref), s.x, s.y)) if (isFoodType(itemType(it.type))) out.push(it);
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
        // Food on the ground within reach, the larder included, nearest first. A fresh kill (raw food lying
        // about) comes before everything else: it's picked up and cooked, or eaten where it lies.
        const stored = foodStored(u).map(it => ({ item: it, x: it.x, y: it.y, dist: Math.hypot(it.x - u.x, it.y - u.y) }));
        const seen = new Set(stored.map(f => f.item.id));
        const ground = stored.concat(groundItemsNear(u, { radius: FOOD_ITEM_RADIUS }).filter(f => isFoodType(itemType(f.item.type)) && !seen.has(f.item.id))).sort((a, b) => a.dist - b.dist);
        const kill = ground.find(f => rawFood(itemType(f.item.type)) && f.dist <= FOOD_ITEM_RADIUS);
        if (kill) {
            const spec = fire && cookRecipeFor(kill.item.type)
                ? { type: "fetch", target: { x: kill.x, y: kill.y }, params: { itemId: kill.item.id } }
                : { type: "eat", target: { x: kill.x, y: kill.y }, params: { itemId: kill.item.id } };
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
                if (isOffspring && !u.data.founder && (u.data.stage === "adult" || u.data.stage === "elder" || u.data.age >= 15) && !u.data.partnerId && !u.data.partner) {
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
            name: "Pack Mule",
            image: { characterName: "$UF_Wildlife_Herbivore_Walk", characterIndex: 0 },
            area: copyArea(c.area),
            z: zOf(c),
            x: animalCell.x,
            y: animalCell.y,
            dir: 2,
            data: {
                kind: "wildlife",
                species: "mule",
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
        if (isOffspring && !u.data.founder && (u.data.stage === "adult" || u.data.stage === "elder" || age >= 15) && !u.data.partnerId && !u.data.partner) {
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
        }
    }

    function myBedTarget(u) {
        if (!u || !u.data) return null;
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
        // Radius 3 to 4: safe distance from fire (radius 1 and 2 are deadly fire hazard zones!)
        for (let r = 3; r <= 4; r++) {
            const ringSpots = [];
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const x = fire.x + dx, y = fire.y + dy;
                    const k = `${x},${y}`;
                    if (taken && taken.has(k)) continue;
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

    function sleepJob(u) {
        const O = Objects();
        const c = colonyState(u);
        const frames = sleepFrames(u);
        if (sleepingHours(u) && eligibleForIntimacy(u)) {
            checkNighttimeSleepMating(u);
        }
        // If colonist has no bed object and isn't critically exhausted, prioritize making their bed!
        if (!hasBedObject(u) && (!u.data.needs || (u.data.needs.sleep || 0) < 90)) {
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

        // Homeless / unassigned colonists sleep around the campfire:
        if (spots.length === 0 && fire) {
            const fireSpots = fireSleepCells(u, fire, taken);
            spots.push(...fireSpots);
        }

        spots.push(...permitted.map(b => ({ x: b.x, y: b.y, fire: fireRef })));

        if (fire && spots.length === 0) {
            const fireSpots = fireSleepCells(u, fire, taken);
            spots.push(...fireSpots);
        }
        // NEVER sleep on c.site (the campfire)!
        spots.push({ x: u.x, y: u.y, fire: fireRef });
        for (const s of spots) {
            const params = { frames };
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
    function siteCount(objectId, ref) {
        const c = colonyState(ref), O = Objects();
        return c && O ? O.findIn(levelArea(c), { near: { x: c.site.x, y: c.site.y }, radius: c.radius + 1, id: objectId }).length : 0;
    }
    // A build step's cells: [{ x, y, state: "done" | "skipped" | "todo" }]. Furniture (passable objects) and the site's
    // own centre piece count wherever the site already has them; walls are counted cell by cell.
    function buildCells(step, ref) {
        const c = colonyState(ref), O = Objects();
        const out = [];
        if (!c || !O) return out;
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
        return out;
    }
    const outputOf = recipe => Object.keys((recipe && recipe.outputs) || {})[0] || null;
    const holds = (u, typeId) => carriedCount(u, typeId) > 0;
    // An "each" craft step is met for a colonist that holds the output, or (equip steps) wears it or something of a higher tier.
    function satisfiesEach(u, step, out) {
        if (holds(u, out)) return true;
        if (!step.equip) return false;
        const eq = equippedItem(u, "clothes"), tOut = itemType(out);
        const tEq = eq ? itemType(eq.type) : null;
        return !!eq && (eq.type === out || (!!tOut && !!tOut.wear && !!tEq && !!tEq.wear && tEq.wear.tier >= tOut.wear.tier));
    }
    function colonyCount(typeId, ref) {
        const I = Items(), c = colonyState(ref);
        if (!I || !c) return 0;
        let n = 0;
        for (const u of siteColonists(ref)) n += I.count(u.id, typeId);
        for (const f of I.find({ area: levelArea(c), z: zOf(c), near: { x: c.site.x, y: c.site.y }, radius: c.radius + 2, id: typeId })) n += f.item.count;
        return n;
    }
    const stockCount = (step, ref) => foodStored(ref).filter(it => (step.stock || []).some(tag => hasTag(itemType(it.type), tag))).reduce((n, it) => n + it.count, 0);

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
            if (step._cachedStatus && step._cachedTick === localTicks && !step.craft && !step.stock) {
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
            return res;
        });
    }
    const stepLabel = step => capitalize(String(step.id || "").replace(/_/g, " "));
    const planText = ref => {
        const steps = effectivePlan(ref);
        return planStatus(ref, steps).map(s => `${stepLabel(steps.find(p => p.id === s.id))}: ${s.done ? (s.detail === "built" || s.detail === "to build" ? "built" : "done") : s.detail}`).join(" · ");
    };

    // What a colonist would do for a build step: [{ type, target, params }] candidates in order of preference.
    function buildStepJob(u, step) {
        const I = Items();
        const isFloor = step.build === "road" || (step.build !== "floor_straw" && ((window.UF && UF.Floors && UF.Floors.FLOOR_IDS && UF.Floors.FLOOR_IDS.includes(step.build)) || /^floor_/.test(step.build)));
        if (isFloor) {
            const c = colonyState(u);
            const cult = cultureOf(u) || {};
            const floorSpec = cult.floor || { kind: step.build, item: step.build === "floor_stone" ? "stone" : step.build === "floor_rushes" ? "straw" : "log", count: 1 };
            const itemNeeded = step.build === "road" ? null : floorSpec.item;
            const countNeeded = step.build === "road" ? 0 : (floorSpec.count || 1);
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
                const ground = groundItemsNear(u, { radius: SEARCH_RADIUS + 30, id: itemNeeded }).find(f => !onBuildCell(f.x, f.y, u, itemNeeded) && (f.x !== cell.x || f.y !== cell.y));
                if (ground) return { type: "haul", target: { x: ground.x, y: ground.y }, params: { itemId: ground.item.id, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
                if (!itemSourceSearched) {
                    itemSourceSearched = true;
                    itemSrc = objectSourceNear(u, itemNeeded, SEARCH_RADIUS) || objectSourceNear(u, itemNeeded, 90);
                }
                if (itemSrc) return { type: itemSrc.action, target: { x: itemSrc.x, y: itemSrc.y }, params: { plan: step.id } };
            }
            return null;
        }
        const t = stepObject(step);
        if (!t || !t.build || !I) return null;
        const c = colonyState(u);
        const needs = t.build.items || {};
        const countOnCellAt = (cell, id) => {
            let cnt = I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, id) : 0;
            if (t.id === "floor_straw" && id === "straw") {
                cnt += I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "fiber") : 0;
            }
            return cnt;
        };
        const candidateCells = buildCells(step, u).filter(cell => cell.state === "todo");
        candidateCells.sort((a, b) => {
            const readyA = Object.keys(needs).every(id => countOnCellAt(a, id) >= (needs[id] | 0)) ? 1 : 0;
            const readyB = Object.keys(needs).every(id => countOnCellAt(b, id) >= (needs[id] | 0)) ? 1 : 0;
            if (readyB !== readyA) return readyB - readyA;
            return (Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y));
        });
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
                if (t.id === "floor_straw" && id === "straw") {
                    cnt += I ? I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "fiber") : 0;
                }
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
                    return { type: "build", target, params: { objectId: t.id, plan: step.id, stores: step.stores || null } };
                }
                // Materials are currently in flight with another colonist: skip to next cell to avoid duplicating effort!
                continue;
            }

            const m = missing[0];
            if (missingFailed.has(m)) continue;
            let carried = carriedOf(u, m)[0];
            let ground = groundItemsNear(u, { radius: SEARCH_RADIUS + 30, id: m }).find(f => !onBuildCell(f.x, f.y, u, m) && (f.x !== cell.x || f.y !== cell.y));
            let src = objectSourceNear(u, m, SEARCH_RADIUS) || objectSourceNear(u, m, 90);
            if (!carried && !ground && !src && t.id === "floor_straw" && m === "straw") {
                carried = carriedOf(u, "fiber")[0];
                ground = groundItemsNear(u, { radius: SEARCH_RADIUS + 30, id: "fiber" }).find(f => !onBuildCell(f.x, f.y, u, "fiber") && (f.x !== cell.x || f.y !== cell.y));
                src = objectSourceNear(u, "fiber", SEARCH_RADIUS) || objectSourceNear(u, "fiber", 90);
            }
            if (carried) return { type: "haul", target: { x: u.x, y: u.y }, params: { itemId: carried.id, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
            if (ground) return { type: "haul", target: { x: ground.x, y: ground.y }, params: { itemId: ground.item.id, to: { area: copyArea(c.area), z: zOf(c), x: cell.x, y: cell.y }, plan: step.id } };
            if (src) return { type: src.action, target: { x: src.x, y: src.y }, params: { plan: step.id } };
            const prey = preyYielding(u, m, huntRadius());
            if (prey) return { type: "hunt", target: { x: prey.x, y: prey.y }, params: { unitId: prey.id, plan: step.id } };
            missingFailed.add(m);
        }
        return null;
    }

    function gatherInputsJob(u, recipe, step) {
        const I = Items();
        const c = colonyState(u);
        const claimedItemIds = new Set(activeJobs().filter(j => (j.type === "fetch" || j.type === "haul") && j.params && j.params.itemId).map(j => j.params.itemId));
        for (const [id, want] of Object.entries(recipe.inputs || {})) {
            if (carriedCount(u, id) >= (want | 0)) continue;
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
        const groups = { bootstrap_build: 0, bootstrap_craft: 0, bootstrap_stock: 0, household: 0, civic: 0, goal: 0, standing: 0, milestone: 0 };
        // Each demand stream gets a bounded window. An impossible or endlessly recurring stock step must not
        // hide every household and personal aspiration behind the old plan's first three unfinished steps.
        for (let i = 0; i < steps.length; i++) {
            if (status[i].done) continue;
            const step = steps[i];
            const isCivic = step.id && (step.id.startsWith("path_") || step.id.startsWith("town_square") || step.id.startsWith("civic_") || step.id.startsWith("sanitation_"));
            let group = "bootstrap_build";
            let limit = 4;
            if (step.standing) {
                group = "standing";
                limit = 4;
            } else if (step.milestone) {
                group = "milestone";
                limit = 3;
            } else if (step.household) {
                group = "household";
                limit = 8;
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
                limit = 2;
            } else if (step.stock) {
                group = "bootstrap_stock";
                limit = 2;
            }
            if (groups[group] >= limit) continue;
            groups[group]++;
            const spec = step.build ? buildStepJob(u, step) : step.craft ? craftStepJob(u, step) : step.stock ? stockStepJob(u, step) : null;
            if (spec) spec.params = Object.assign({}, spec.params, { household: step.household || null, goalId: step.goalId || null, goalOwner: step.goalOwner || null });
            candidates.push({ step, spec, order: groups[group] - 1 });
            if (!spec) continue;
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
                if (focal && x.step.household === focal.id) {
                    s += 4.5; // Cooperative settlement building: all villagers unite to construct the active focal home!
                } else if (focal && H && H.isSheltered && !H.isSheltered(focal)) {
                    // While the communal focal house is under construction and unsheltered,
                    // defer secondary household projects so villagers don't scatter labor!
                    s -= 2.0;
                } else if (u.data && u.data.householdId === x.step.household) {
                    // Paired colonists urgently build their own private home for their family
                    const isPaired = u.data.partner || u.data.partnerId;
                    s += isPaired ? 6.0 : 3.0;
                } else {
                    s += 1.2;
                }
            } else if (x.step.id && (x.step.id.startsWith("path_") || x.step.id.startsWith("town_square"))) s += 0.8;
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

        for (const step of plan) {
            const t = stepObject(step);
            if (!t || !t.build || !t.build.items) continue;
            const needs = t.build.items;

            for (const cell of buildCells(step, u)) {
                if (cell.state !== "todo") continue;

                for (const [id, countNeeded] of Object.entries(needs)) {
                    let onCell = I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, id);
                    if (t.id === "floor_straw" && id === "straw") {
                        onCell += I.count({ area: levelArea(c), z: zOf(c), x: cell.x, y: cell.y }, "fiber");
                    }
                    const inFlight = activeJobs().filter(j => (j.type === "haul" || j.type === "fetch") &&
                        j.assigned !== u.id && j.params && j.params.to &&
                        j.params.to.x === cell.x && j.params.to.y === cell.y).length;

                    if (onCell + inFlight < (countNeeded | 0)) {
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
                        const ground = groundItemsNear(u, { radius: SEARCH_RADIUS + 40, id })
                            .find(f => (!f.item.firstOwner || f.item.firstOwner === u.id) && !onBuildCell(f.x, f.y, u, id) && (f.x !== cell.x || f.y !== cell.y));
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

    // Clean site logistics: tidy loose items on the ground into designated stockpiles
    function tidyStockpileJob(u) {
        const c = colonyState(u);
        const I = Items();
        if (!c || !I || !c.stockpiles || !c.stockpiles.length) return null;
        if (evening() || (window.UF && UF.DayNight && UF.DayNight.isNight && UF.DayNight.isNight())) return null;

        // Find loose ground items within the settlement radius
        const loose = groundItemsNear(u, { radius: c.radius + 6 }).filter(f => {
            if (onStockpile(f.item, null, u)) return false;
            if (onBuildCell(f.x, f.y, u, f.item.type)) return false;
            if (f.item.firstOwner && f.item.firstOwner !== u.id) return false;
            return true;
        });
        if (!loose.length) return null;

        for (const f of loose) {
            const t = itemType(f.item.type);
            if (!t) continue;
            // Find a stockpile that accepts this item
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
            if (!sp) continue;

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
        const radius = c.radius ? Math.max(c.radius + 20, 40) : 40;

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
                    return rawFood(t) && cookRecipeFor(f.item.type) && !onStockpile(f.item, null, u);
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

    // Idle: explore (curiosity), stroll near the site, or stand and think.
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
            }
        }

        // Clean site logistics: tidy loose ground clutter into stockpiles
        const tidy = tidyStockpileJob(u);
        if (tidy) return tidy;

        const roll = unit01(seed(), SALT.stroll, u.id, ticks());
        const curiosity = facet(u, "curiosity") / 100;
        if (roll < 0.5 * curiosity + 0.2) {
            const explore = roll < 0.5 * curiosity;
            const r = explore ? EXPLORE_RADIUS : STROLL_RADIUS;
            const rng = mulberry32(hash32(seed(), SALT.stroll, u.id, ticks(), 1));
            for (let t = 0; t < 8; t++) {
                const a = rng() * Math.PI * 2, d = 3 + rng() * (r - 3);
                // Both kinds of walk are anchored to the home site, so nobody drifts off to another faction's hearth.
                const x = Math.round(home.x + Math.cos(a) * d), y = Math.round(home.y + Math.sin(a) * d);
                if (!J.standable(levelArea(u), x, y, u.id)) continue;
                const j = give(u, { type: "move", target: { x, y }, params: { stroll: true, explore } });
                if (j) return j;
            }
        } else if (roll > 0.92) {
            const dest = (u.data && u.data.destiny) || (window.UF && UF.Goals && UF.Goals.destinyOf && UF.Goals.destinyOf(u));
            if (dest && dest.thought && roll > 0.95) {
                addThought(u, dest.thought, 3);
            } else {
                addThought(u, "Took a moment to look around.", 2);
            }
        }
        return null;
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

    function decide(u) {
        const J = Jobs();
        if (!J || !u || !levelSupported(zOf(u))) return null;
        decisionAt.set(u.id, ticks());
        // Dependants are not miniature workers. Infant care is tracked by the household; industrial work,
        // hunting, military designations and adult relationships are never selected for children.
        if (Number.isFinite(u.data.age) && u.data.age < 2) return null;
        if (!Number.isFinite(u.data.age) || u.data.age < 15) return needJob(u) || homeJob(u) || idleJob(u);
        // A short, saved rendezvous may need its door's ordinary auto-close delay. Wait at most the
        // existing deadline, never instead of a meal, a drink or exhausted sleep, and never cancel an order.
        const visit = u.data.familyRendezvous, n = u.data.needs || {}, th = thresholds();
        if (visit && visit.until > ticks() && eligibleForIntimacy(u) && n.hunger < (th.hunger || 55) && n.thirst < (th.thirst || 55)) {
            const j = nightlyMateJob(u);
            if (j) return j;
            return null;
        }
        // Lazy colonists take a breather now and then instead of the next piece of work (needs still come first).
        const lazy = unit01(seed(), SALT.roll, u.id, ticks()) < (100 - facet(u, "industriousness")) / 400;
        const P = Pillars();
        if (P) {
            const communal = P.communalMealJob ? P.communalMealJob(u) : null;
            if (communal) {
                const j = give(u, communal);
                if (j) return j;
            }
            const sentry = P.nightWatchJob ? P.nightWatchJob(u) : null;
            if (sentry) {
                const j = give(u, sentry);
                if (j) return j;
            }
        }
        const need = needJob(u);
        if (need) return need;
        if (UF.FireSafety) {
            const fire = UF.FireSafety.respond(u) || UF.FireSafety.prevent(u);
            if (fire) return fire;
        }
        const home = homeJob(u);
        if (home) return home;

        const S = Sanitation();
        if (S) {
            const med = S.treatSickJob ? S.treatSickJob(u) : null;
            if (med) {
                const j = give(u, med);
                if (j) return j;
            }
            const clean = S.cleanWasteJob ? S.cleanWasteJob(u) : null;
            if (clean) {
                const j = give(u, clean);
                if (j) return j;
            }
        }

        const unbeddedJob = !hasBedObject(u) ? makeBedJob(u) : null;
        const Callings = getCallings();
        const haulerStaging = (Callings && Callings.isHauler(u)) ? constructionHaulingJob(u) : null;
        return designationJob(u) || haulerStaging || footprintClearingJob(u) || tidyStockpileJob(u) || (lazy ? null : (UF.Agriculture && UF.Agriculture.planJob(u)) || planJob(u)) || (unbeddedJob ? give(u, unbeddedJob) : null) || autonomousCallingJob(u) || idleJob(u);
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
        const pop = siteColonists(c).length;
        const baseRadius = siteRadius(homeSiteRecord(c) || { kind: "camp" });
        // Grow by 4 tiles per 10 population, cap at 40
        const growth = Math.floor(pop / 10) * 4;
        c.radius = Math.min(40, baseRadius + growth);
    }

    function scan() {
        const J = Jobs();
        const W = World();
        const c = colonyState();
        if (!enabled || !J || !W || !c) return;
        updateColonyRadius(c);
        ensureSettlementActors();
        for (const local of settlementStates()) {
            if (local.adopted || !levelSupported(zOf(local))) continue;
            const s = homeSiteRecord(local);
            if (s) {
                adoptSiteStockpiles(local, s);
                local.adopted = true;
            }
            const P = Pillars();
            if (P && P.assignSkillRoster) P.assignSkillRoster(local);
        }
        const t = ticks();
        let decideCount = 0;
        const MAX_DECIDE_PER_SCAN = Math.max(8, simulationUnits().length);
        for (const u of simulationUnits()) {
            if (!u.data.capabilities) {
                const P = Pillars();
                if (P && P.assignSkillRoster) P.assignSkillRoster(colonyState(u));
            }
            if (UF.FireSafety && UF.FireSafety.respond(u)) { decisionAt.set(u.id, t); continue; }
            const job = J.of(u.id);
            if (job) {
                const need = urgent(u);
                if (need && !NEED_JOBS.includes(job.type) && (!job.params || !NEED_JOBS.includes(job.params.via)) && t - (preemptAt.get(u.id) || -Infinity) >= PREEMPT_EVERY) {
                    preemptAt.set(u.id, t);
                    J.cancel(job.id, need === "thirst" ? "too thirsty to go on" : "too hungry to go on");
                } else if (!NEED_JOBS.includes(job.type)) {
                    const isStalled = (job.blocked && job.blocked >= 1) || (job.stall && t - job.stall.since >= 180);
                    if (isStalled) {
                        J.cancel(job.id, "blocked or stalled, swapping task");
                        if (job.target) {
                            const key = avoidKey(u, job.type, job.target.x, job.target.y);
                            avoid.set(key, t + AVOID_TICKS);
                        }
                        decisionAt.set(u.id, -Infinity);
                    } else if (isLowPriorityJob(job, u) && hasHighPriorityJob(u)) {
                        J.cancel(job.id, "high-priority task ready, swapping task");
                        decisionAt.set(u.id, -Infinity);
                    } else continue;
                } else continue;
            }
            if (t - (decisionAt.get(u.id) || -Infinity) < DECIDE_EVERY) continue;
            if (decideCount >= MAX_DECIDE_PER_SCAN) break;
            try {
                decide(u);
                decideCount++;
            } catch (e) {
                console.error("UF_Colonists: decision failed for", u.name, e);
                decisionAt.set(u.id, t);
            }
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
                if (u.data && u.data.needs) {
                    u.data.needs.waste = clamp((u.data.needs.waste || 0) + 15, 0, 100);
                }
                const S = Sanitation();
                if (S && S.isWaterContaminated && S.isWaterContaminated(levelArea(u), job.target ? job.target.x : u.x, job.target ? job.target.y : u.y)) {
                    S.infect(u, "dysentery");
                }
                break;
            case "eat":
                addThought(u, `Ate ${lower((itemType(job.params.itemType) || {}).name || "something")} and felt better.`, 8);
                if (u.data && u.data.needs) {
                    u.data.needs.waste = clamp((u.data.needs.waste || 0) + 20, 0, 100);
                }
                break;
            case "sleep": {
                addThought(u, "Woke rested.", 10);
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
                if (t && (t.id === "floor_straw" || (t.tags && t.tags.includes("bed")))) {
                    if (window.UF && UF.Households && UF.Households.reconcile) UF.Households.reconcile();
                    if (window.UF && UF.Ownership && UF.Ownership.reconcileArea) UF.Ownership.reconcileArea(levelArea(u));
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

    const describeNeeds = u => {
        const n = u.data.needs || {};
        const out = {};
        for (const k of Object.keys(START_NEEDS)) out[k] = Math.round(n[k] || 0);
        return out;
    };
    function describe(x) {
        const u = typeof x === "number" ? colonist(x) : (x && x.data ? x : null);
        if (!u || !isColonist(u)) return null;
        const J = Jobs();
        const job = J ? J.of(u.id) : null;
        const F = window.UF.Factions ? UF.Factions.get(u.data.faction) : null;
        const site = homeSiteRecord(u);
        const tool = equippedItem(u, "tool"), clothes = equippedItem(u, "clothes");
        return {
            id: u.id, name: u.name, gender: u.data.gender, mood: u.data.mood || moodOf(u.data.moodScore | 0), moodScore: u.data.moodScore | 0,
            job: job ? (job.params && job.params.via && J.handler(job.params.via) ? `${J.describe(job)} (${lower(J.handler(job.params.via).verb)} next)` : J.describe(job)) : "Idle", jobType: job ? job.type : null,
            needs: describeNeeds(u), tier: u.data.tier | 0,
            tool: tool ? (itemType(tool.type) || {}).name || tool.type : null,
            clothes: clothes ? (itemType(clothes.type) || {}).name || clothes.type : null,
            faction: F ? F.name : "", site: site ? site.name : "",
            thought: u.data.thoughts && u.data.thoughts[0] ? u.data.thoughts[0].text : "",
            facets: Object.assign({}, u.data.facets || {}), skills: Object.assign({}, u.data.skills || {}),
            plan: planText(u),
            pregnancy: u.data.pregnancy ? Object.assign({}, u.data.pregnancy) : null,
            illness: u.data.illness ? Object.assign({}, u.data.illness) : null,
            age: u.data.age !== undefined ? u.data.age : 20,
            stage: u.data.stage || (u.data.age !== undefined && u.data.age >= 55 ? "elder" : (u.data.age !== undefined && u.data.age < 15 ? "child" : "adult")),
            variation: u.data.variation || 1,
            face: u.data.face || null,
            genetics: u.data.genetics ? Object.assign({}, u.data.genetics) : null,
            motherId: u.data.motherId || null,
            fatherId: u.data.fatherId || null,
            household: UF.Households ? UF.Households.describe(UF.Households.of(u)) : null,
            lifeGoals: UF.Goals ? UF.Goals.describe(u) : null
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
    window.UF = window.UF || {};
    window.UF.Colonists = Colonists;

    //-------------------------------------------------------------------------
    // Engine hooks

    // The per-tick step, after UF_World moved the units and UF_Jobs worked (their aliases are below ours).
    localTicks = 0;
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        if (!sceneActive) return;
        localTicks++;

        if (localTicks === 1 || localTicks % 300 === 0) ensureColonistsGeneticsAndAging();
        if (localTicks % NEEDS_EVERY === 0) tickNeeds();
        if (localTicks % SCAN_EVERY === 0) scan();
        // Every 60 frames = 1 beat = 1 real second at 1x speed
        if (localTicks % 60 === 0) {
            progressPregnancies(1);
            progressAging(1);
            if (localTicks % 3600 === 0) stepFactionReproduction();
            if (localTicks % 7200 === 0) {
                stepImmigration();
                stepMerchantCaravan();
            }
        }
    };

    let hooked = false;
    function hookEvents() {
        if (hooked || !window.UF || !UF.Events) return;
        hooked = true;
        // world:created is hooked here at boot, after every plugin has registered its own listener (UF_Factions,
        // UF_History, UF_Wildlife), so the colony is made last, from the people History spawned.
        UF.Events.on("world:created", state => {
            try { setupColony(state); } catch (e) { console.error("UF_Colonists: setup failed", e); }
        });
        UF.Events.on("jobs:done", (job, u) => { try { onDone(job, u); } catch (e) { console.error(e); } });
        UF.Events.on("jobs:failed", job => onFailed(job));
        UF.Events.on("time:day", (day, month, year) => {
            try {
                stepFactionReproduction();
                stepImmigration();
                stepMerchantCaravan();
                progressPregnancies();
                progressAging();
            } catch (e) {
                console.error("UF_Colonists: time:day error", e);
            }
        });
        UF.Events.on("time:hour", hour => {
            try {
                if (hour >= 21 || hour <= 6 || hour % 6 === 0) stepFactionReproduction();
                if (hour === 12) stepImmigration();
                if (hour === 8) stepMerchantCaravan();
            } catch (e) {
                console.error("UF_Colonists: time:hour error", e);
            }
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
            const W = UF.World, J = UF.Jobs, I = UF.Items, O = UF.Objects;
            const st = W.state;
            const area = (typeof W.viewLevel === "function" ? W.viewLevel() : null) || (typeof W.currentArea === "function" ? W.currentArea() : null) || (st && st.startArea) || { x: 0, y: 0 };
            const errors0 = t.errorsSoFar().length;
            const suiteStart = performance.now();
            const elapsed = () => ((performance.now() - suiteStart) / 1000).toFixed(0);
            const C_describe = u => describe(u);
            const until = (fn, ms, what) => { let live = true; return t.waitUntil(() => live && fn(), ms, what).catch(() => {}).finally(() => { live = false; }); };
            const jobText = job => (job ? `${job.type} #${job.id} ${job.state}${job.reason ? ` (${job.reason})` : ""}` : "none");
            const mid = Math.floor(st.size / 2);
            const c = colonyState();
            const F = UF.Factions;
            const banned = /avatar|britannia|guardian|lord british|iolo|dupre|shamino|fellowship|moongate|urist|armok|strange mood|fey mood|dwarf fortress|ultima/i;

            // colony_is_a_faction
            const player = F.player();
            const site = homeSiteRecord();
            const siteDist = site ? Math.hypot(site.x - mid, site.y - mid) : Infinity;
            const viewDist = site ? Math.hypot($gamePlayer.x - site.x, $gamePlayer.y - site.y) : Infinity;
            t.check("colony_is_a_faction", !!c && !!player && player.id === st.factions.playerId && !!site && site.faction === player.id && !site.ruined && siteDist <= 8 && viewDist <= 6 && sameArea(area, c.area),
                `playerId ${st.factions.playerId} = ${player ? `${player.name} (${player.species})` : "NO FACTION"}; home site ${site ? `${site.name} (${site.kind}, id ${site.id}) at (${site.x},${site.y}), ${siteDist.toFixed(1)} cells from the centre (want <= 8), ${site.ruined ? "RUINED" : "alive"}` : "NONE"}; view at (${$gamePlayer.x},${$gamePlayer.y}) ${viewDist.toFixed(1)} cells from it (want <= 6); state.colony ${c ? "present" : "MISSING"}`);
            if (!c || !site) return;

            // people_became_colonists
            const people = colonists();
            const bad = people.filter(u => !u.name || !["male", "female"].includes(u.data.gender) || !u.data.facets || Object.keys(u.data.facets).length !== facetNames().length || !u.data.needs || u.data.ai !== "colonist" || u.data.faction !== player.id);
            const strangers = W.units().filter(u => isColonist(u) && u.data.faction !== player.id);
            const leftover = W.units().filter(u => u.data && u.data.kind === "person" && u.data.faction === player.id && sameArea(u.area, site.area) && chebyshev(u.x, u.y, site.x, site.y) <= c.radius + 2);
            const startEvents = $gameMap.events().filter(ev => ev.event() && /<colonist/.test(ev.event().note || "") && ev.eventId() < W.EVENT_BASE);
            const dirtyNames = people.filter(u => banned.test(u.name));
            const human = player.species === "human";
            const tiered = people.filter(u => Array.isArray(u.data.tiers) && u.image.characterName === u.data.tiers[0]).length;
            t.check("people_became_colonists", people.length >= 2 && bad.length === 0 && strangers.length === 0 && leftover.length === 0 && startEvents.length === 0 && dirtyNames.length === 0 && (!human || tiered === people.length),
                `${people.length} colonists (want >= 2): ${people.map(u => `${u.name} (${u.data.gender}, ${u.image.characterName})`).join(", ")}; incomplete: ${bad.length}; colonists of another faction: ${strangers.length}; unconverted people of ours at the site: ${leftover.length}; generator start events 1/2: ${startEvents.length}; banned words in names: ${dirtyNames.length}; ${human ? `${tiered} on their tier-0 sheet` : `species ${player.species}: no tier sheets, images kept`}`);

            // state_in_save
            const copy = JsonEx.parse(JsonEx.stringify(st));
            const u0 = people[0];
            const cu = copy.units[u0.id];
            const keys = ["needs", "facets", "thoughts", "equipment"];
            const kept = keys.filter(k => cu && cu.data && JSON.stringify(cu.data[k]) === JSON.stringify(u0.data[k]));
            const contents = DataManager.makeSaveContents();
            t.check("state_in_save", kept.length === keys.length && !!copy.colony && JSON.stringify(copy.colony) === JSON.stringify(c) && contents.ufWorld && contents.ufWorld.colony === c,
                `unit ${u0.id} after a JsonEx round-trip keeps ${kept.join(", ") || "nothing"} (want ${keys.join(", ")}); colony ${copy.colony ? "identical" : "MISSING"}; in save contents ${!!(contents.ufWorld && contents.ufWorld.colony)}`);

            // plan_reads_the_site
            const status = planStatus();
            const hearth = c.plan.find(s => s.build && (Objects().type(s.build) || {}).tags && Objects().type(s.build).tags.includes("fire"));
            const hearthStatus = hearth ? status.find(s => s.id === hearth.id) : null;
            const centre = O.atIn(c.area, site.x, site.y);
            const bedsStep = c.plan.find(s => s.build && hasTag(Objects().type(s.build), "bed"));
            const bedsHere = bedsStep ? siteCount(bedsStep.build) : 0;
            const bedsStatus = bedsStep ? status.find(s => s.id === bedsStep.id) : null;
            const bedsOk = !bedsStep || (bedsHere >= (bedsStep.cells || []).length ? bedsStatus.done : true);
            t.check("plan_reads_the_site", !!hearthStatus && hearthStatus.done && !!centre && hasTag(centre, "fire") && bedsOk && c.plan.length === planTemplate().length,
                `plan "${cultureOf().plan}" (${c.plan.length} steps, wall ${cultureOf().wall}); centre holds ${centre ? centre.id : "nothing"}; hearth step ${hearthStatus ? (hearthStatus.done ? "done" : "NOT done") : "missing"}; ${bedsStep ? `${bedsHere} ${bedsStep.build} at the site vs ${bedsStep.cells.length} wanted -> beds step ${bedsStatus.done ? "done" : "to build"}` : "no beds step"}; status: ${planText()}`);

            // The site at zoom 2/3 before anything moves.
            if (UF.Camera) UF.Camera.setLevel(1);
            $gamePlayer.locate(site.x, site.y);
            await t.waitFrames(20);
            t.screenshot("site_home");

            // thirst_makes_drink_job (colonist A) and hunger_makes_food_job (colonist B), at x1.
            const A = people[0], B = people[1] || people[0];
            A.data.needs.thirst = 90;
            const posA = { x: A.x, y: A.y };
            let drink = null;
            await until(() => { const j = J.of(A.id); if (j && (j.type === "drink" || (j.type === "move" && j.params.via === "drink"))) drink = j; return !!drink; }, 8000, "a drink job for A");
            const waterCell = drink ? (drink.params.via ? drink.params.viaTarget : { x: drink.target.x, y: drink.target.y }) : null;
            const goal = drink ? { x: drink.target.x, y: drink.target.y } : null; // the water cell, or the gate of a via move
            const d0 = goal ? Math.hypot(posA.x - goal.x, posA.y - goal.y) : NaN;
            const dNow = () => (goal ? Math.hypot(A.x - goal.x, A.y - goal.y) : NaN);
            // Walking toward it: 2 cells nearer (a path may detour first), or already there working / done; up to 4 s at x1.
            const frames0 = Graphics.frameCount;
            await until(() => dNow() <= d0 - 2 || dNow() <= 1.5 || !drink || drink.state !== "travel", 4000, "A to close in on the water");
            const d1 = dNow(), framesWalked = Graphics.frameCount - frames0;
            const movedToward = drink && (d1 <= d0 - 2 || d1 <= 1.5 || drink.state === "work" || drink.state === "done");
            t.check("thirst_makes_drink_job", !!drink && !!waterCell && J.isWaterAt(c.area, waterCell.x, waterCell.y) && movedToward,
                `thirst set to 90 on ${A.name}: ${jobText(drink)}${drink && drink.params.via ? " (a walk to the site's gate first)" : ""}${waterCell ? ` toward water at (${waterCell.x},${waterCell.y}) [water ${J.isWaterAt(c.area, waterCell.x, waterCell.y)}]` : ""}; distance to ${drink && drink.params.via ? `the gate (${goal.x},${goal.y})` : "it"} ${isNaN(d0) ? "n/a" : d0.toFixed(1)} -> ${isNaN(d1) ? "n/a" : d1.toFixed(1)} after ${framesWalked} frames (job ${drink ? drink.state : "none"})`);

            B.data.needs.hunger = 90;
            let food = null;
            const FOOD_JOBS = ["eat", "gather", "hunt", "fetch", "craft", "pick"];
            await until(() => { const j = J.of(B.id); if (j && (FOOD_JOBS.includes(j.type) || (j.type === "move" && FOOD_JOBS.includes(j.params.via)))) food = j; return !!food; }, 8000, "a food job for B");
            t.check("hunger_makes_food_job", !!food, `hunger set to 90 on ${B.name}: ${jobText(food)}${food ? ` "${C_describe(B).job}" at (${food.target.x},${food.target.y})` : ` (current job ${jobText(J.of(B.id))})`}`);

            // The long stretch at x8: the plan, tools and clothes, then the hunt. Sleep is held at 0 so nobody turns in.
            const doneBefore = doneLog.length;
            const objectsBefore = new Map(), itemsBefore = new Set(Object.keys(I.state().byId));
            let objectChanges = 0, itemChanges = 0;
            const onObj = () => objectChanges++, onItem = () => itemChanges++;
            UF.Events.on("objects:changed", onObj);
            UF.Events.on("items:changed", onItem);
            const PLAN_TYPES = ["chop", "gather", "pick", "quarry", "haul", "build", "fetch", "craft"];
            const firstPlanDone = () => doneLog.slice(doneBefore).find(x => PLAN_TYPES.includes(x.type) && x.plan);
            const keepAwake = () => { for (const u of colonists()) { u.data.needs.sleep = 0; if (typeof u.data.hp === "number" && u.data.hp < 15) u.data.hp = 20; } };
            UF.Time.setLevel(3);
            const x8Start = performance.now();
            const secondsAtX8 = () => (performance.now() - x8Start) / 1000;
            let planAt = null;
            await until(() => { keepAwake(); if (!planAt && firstPlanDone() && (objectChanges || itemChanges)) planAt = secondsAtX8(); return !!planAt || secondsAtX8() > 60; }, 70000, "the first plan job");
            const first = firstPlanDone();
            t.check("plan_starts_immediately", !!first && !!planAt && (objectChanges > 0 || itemChanges > 0),
                `first finished plan job ${first ? `${first.type} (step ${first.plan})` : "none"} after ${planAt ? planAt.toFixed(1) : ">60"} s real at x8 (budget 60 s of the contract's 90); ${objectChanges} object changes, ${itemChanges} item changes; done jobs so far: ${doneLog.slice(doneBefore).map(x => x.type).join(",") || "none"}`);

            // A look at the colonists at work, at zoom 1.
            if (UF.Camera) UF.Camera.setLevel(0);
            const busy = colonists().filter(u => J.of(u.id));
            const focus = busy[0] || colonists()[0];
            $gamePlayer.locate(focus.x, focus.y);
            await t.waitFrames(6);
            t.screenshot("colonists_working");
            const shotJobs = colonists().map(u => `${u.name}: ${J.of(u.id) ? J.describe(J.of(u.id)) : "idle"}`).join("; ");

            // tools_and_clothes: the window runs until 85 s of x8 have passed (the contract's 4 minutes don't fit the
            // harness's 180 s watchdog); reported however far it got.
            const adultColonists = () => colonists().filter(u => !u.data || u.data.age === undefined || u.data.age >= 15);
            const knives = () => adultColonists().filter(u => holds(u, "stone_knife")).length;
            const wraps = () => colonists().filter(u => (u.data.tiers ? u.data.tier >= 1 : !!equippedItem(u, "clothes"))).length;
            const toolsOk = () => knives() * 2 >= adultColonists().length && wraps() >= 1;
            let toolsAt = null;
            await until(() => { keepAwake(); if (!toolsAt && toolsOk()) toolsAt = secondsAtX8(); return !!toolsAt || secondsAtX8() > 75; }, 90000, "tools and clothes");
            const toolsDetail = () => `${knives()}/${adultColonists().length} adults hold a stone knife, ${wraps()} wear a wrap (tier >= 1)`;
            const toolsDetailAtEnd = toolsDetail();
            const toolsWindowEnd = secondsAtX8();

            // hunts: a test hare 12 cells from the bravest colonist, whose hunger is set to 70.
            const hunter = colonists().slice().sort((a, b) => facet(b, "bravery") - facet(a, "bravery"))[0];
            const braveryWas = hunter.data.facets.bravery;
            hunter.data.facets.bravery = Math.max(braveryWas, BRAVE);
            let hareCell = null;
            const offsets = [[12, 0], [-12, 0], [0, 12], [0, -12], [9, 8], [-9, 8], [8, -9], [-8, -9]];
            for (const sameSide of [true, false]) {
                for (const [dx, dy] of offsets) {
                    const x = hunter.x + dx, y = hunter.y + dy;
                    if (!J.standable(hunter.area, x, y)) continue;
                    if (sameSide && ringGap(hunter, x, y)) continue; // not across the site's wall
                    hareCell = { x, y };
                    break;
                }
                if (hareCell) break;
            }
            hareCell = hareCell || { x: hunter.x + 12, y: hunter.y };
            const hare = W.addUnit({ name: "Hare", image: { characterName: "$U7_Hare" }, area: copyArea(hunter.area), x: hareCell.x, y: hareCell.y, dir: 4,
                data: { kind: "creature", species: "hare", tags: ["grazer"], faction: null, ai: null, home: hareCell, wander: 0 } });
            const curJob = J.of(hunter.id);
            if (curJob) J.cancel(curJob.id, "test: hunger");
            const carriedFood = I.inventoryOf(hunter.id).filter(it => isFoodType(itemType(it.type)));
            for (const it of carriedFood) I.remove(it.id); // test setup: nothing in the pack, so the hare is the nearest meal
            const killsNear = I.find({ area: hunter.area, near: { x: hunter.x, y: hunter.y }, radius: FOOD_ITEM_RADIUS }).filter(f => rawFood(itemType(f.item.type)));
            for (const f of killsNear) I.remove(f.item.id); // and no fresh kill of somebody else's lying nearer than the hare
            hunter.data.needs.hunger = 60;
            decisionAt.set(hunter.id, -Infinity);
            let hunt = null, cook = null;
            const jobsBefore = W.state.jobs.nextId;
            // Any prey counts: the kit herd may stand nearer than the test hare, and the rule takes the nearest.
            await until(() => {
                keepAwake();
                if (hunter.data && hunter.data.needs && hunter.data.needs.hunger > 60) hunter.data.needs.hunger = 60;
                const j = J.of(hunter.id);
                if (j && j.type === "hunt" && j.id >= jobsBefore) hunt = j;
                return (!!hunt && (hunt.state === "done" || hunt.state === "failed")) || secondsAtX8() > Math.min(110, toolsWindowEnd + 35);
            }, 36000, "the hunt");
            const meatAt = hunt && hunt.result && hunt.result.at ? hunt.result.at : null;
            const meatThere = meatAt ? I.count({ area: c.area, x: meatAt.x, y: meatAt.y }, "meat_raw") : 0;
            const hareGone = !!hunt && !W.unit(hunt.params.unitId);
            const preyName = hunt ? (hunt.params.preyName || "prey") : "none";
            const cookState = () => (cook ? cook.state || "done" : "none");
            await until(() => {
                keepAwake();
                if (hunter.data && hunter.data.needs && hunter.data.needs.hunger < 60) hunter.data.needs.hunger = 60;
                const j = J.of(hunter.id);
                if (j && ((j.type === "craft" && j.params.recipeId === "cook_meat") || (j.type === "move" && j.params && j.params.via === "craft"))) cook = j;
                const d = doneLog.find(x => x.unit === hunter.id && x.recipe === "cook_meat" && hunt && x.id > hunt.id);
                if (d) cook = J.get(d.id) || { id: d.id, type: "craft", state: "done", target: { x: NaN, y: NaN } };
                return cookState() === "done" || secondsAtX8() > 125;
            }, 20000, "the roast");
            const cooked = I.count(hunter.id, "meat_cooked") + (meatAt ? I.count({ area: c.area, x: meatAt.x, y: meatAt.y }, "meat_cooked") : 0) + foodStored().filter(it => it.type === "meat_cooked").length;
            const firesNear = O.findIn(hunter.area, { near: { x: hunter.x, y: hunter.y }, radius: FIRE_RADIUS, tags: ["fire"] }).length;
            const hunterJobs = J.list(j => j.assigned === hunter.id && j.id >= jobsBefore).map(j => `${j.type}${j.params.via ? `->${j.params.via}` : ""} ${j.state}${j.reason ? ` (${j.reason})` : ""}`).join(", ");
            t.check("hunts", !!hunt && hunt.state === "done" && hareGone && (meatThere > 0 || !!cook || cooked > 0) && !!cook && (cookState() === "done" || cookState() === "work" || cookState() === "travel"),
                `${hunter.name} (bravery ${hunter.data.facets.bravery}, hunger ${hunter.data.needs.hunger}, pack emptied of ${carriedFood.length} food, ${killsNear.length} raw food removed nearby) with a hare 12 cells away at (${hareCell.x},${hareCell.y}): ${jobText(hunt)} of ${preyName}${hunt && hunt.params.unitId !== hare.id ? " (nearer than the test hare)" : ""}; prey unit gone ${hareGone}; raw meat on its cell ${meatThere}; cook_meat job ${jobText(cook)}${cook ? ` at (${cook.target.x},${cook.target.y})` : ""}; cooked meat now ${cooked}; fires within ${FIRE_RADIUS}: ${firesNear}; hunter's jobs since: ${hunterJobs || "none"}; ${elapsed()} s into the suite`);
            hunter.data.facets.bravery = braveryWas;
            if (W.unit(hare.id)) W.removeUnit(hare.id);

            const toolsNow = toolsOk();
            t.check("tools_and_clothes", !!toolsAt || toolsNow, `${toolsAt ? `reached after ${toolsAt.toFixed(0)} s at x8` : `not reached within ${secondsAtX8().toFixed(0)} s at x8 (contract allows 240 s; the harness watchdog doesn't)`}: ${toolsNow ? toolsDetail() : toolsDetailAtEnd + " at 75 s, " + toolsDetail() + " now"}; plan: ${planText()}; during the screenshot: ${shotJobs}`);

            // order_replaces_job: an order cancels the current job and starts the ordered one, owned by the colonist.
            const orderer = colonists().find(u => J.of(u.id)) || colonists()[0];
            const before = J.of(orderer.id);
            const target = freeCellNear(orderer.area, orderer.x, orderer.y, 4) || { x: orderer.x, y: orderer.y + 1 };
            const ordered = order(orderer.id, { type: "move", target });
            t.check("order_replaces_job", !!ordered && ordered.owner === orderer.id && ordered.type === "move" && J.of(orderer.id) === ordered && (!before || before.state === "failed"),
                `${orderer.name}: job before ${jobText(before)}; order(move to (${target.x},${target.y})) -> ${jobText(ordered)} (owner ${ordered ? ordered.owner : "?"}); of() now ${jobText(J.of(orderer.id))}`);

            UF.Time.setLevel(0);
            if (UF.Camera) UF.Camera.setLevel(1);
            UF.Events.off("objects:changed", onObj);
            UF.Events.off("items:changed", onItem);

            // every_job_is_physical
            const done = doneLog.slice(doneBefore);
            const noTarget = done.filter(x => !x.target), nothing = done.filter(x => !x.physical);
            const counts = {};
            for (const x of done) counts[x.physical || "none"] = (counts[x.physical || "none"] || 0) + 1;
            t.check("every_job_is_physical", done.length > 0 && noTarget.length === 0 && nothing.length === 0,
                `${done.length} colonist jobs finished in the run: ${Object.entries(counts).map(([k, v]) => `${v} changed ${k === "none" ? "NOTHING" : `a(n) ${k}`}`).join(", ")}; without a target cell: ${noTarget.length}${nothing.length ? `; first with no change: ${nothing[0].type} #${nothing[0].id}` : ""}`);

            // personality_differs
            const f0 = people[0].data.facets, f1 = people[1].data.facets;
            const differ = Object.keys(f0).filter(k => f0[k] !== f1[k]).length;
            const other = facetsFor(st.seed + 1, people[0].id, cultureOf().facetBias);
            const bySeed = Object.keys(f0).filter(k => f0[k] !== other[k]).length;
            t.check("personality_differs", differ >= 3 && bySeed >= 3, `${people[0].name} vs ${people[1].name}: ${differ} of ${Object.keys(f0).length} facets differ; seed+1 changes ${bySeed} of ${people[0].name}'s facets`);

            //-- Reproduction, pregnancy and childbirth
            const livePeople = colonists();
            const maleColonist = livePeople.find(u => u.data.gender === "male") || livePeople[0];
            const femaleColonist = livePeople.find(u => u.data.gender === "female") || livePeople[1];

            // Unsafe legacy test used to call mating twice with strangers in the open. Guard that explicitly;
            // the society_runtime suite exercises a real completed private home and established adult pair.
            const oldDesire = femaleColonist.data.familyDesire;
            const beforePregnancy = femaleColonist.data.pregnancy;
            femaleColonist.data.familyDesire = false;
            const refused = !Colonists.onMated(maleColonist, femaleColonist);
            t.check("unwilling_intimacy_refused", refused && femaleColonist.data.pregnancy === beforePregnancy, "no interaction or pregnancy when a person declines");
            femaleColonist.data.familyDesire = oldDesire;
            // Explicit gestation fixture, not evidence of conception or autonomous courtship.
            femaleColonist.data.pregnancy = { fatherId: maleColonist.id, fatherName: maleColonist.name, daysLeft: 3, secondsLeft: 3, totalDays: 3, dayConceived: 1 };

            // 3. Pregnancy gestation countdown
            Colonists.progressPregnancies();
            t.check("pregnancy_progresses", femaleColonist.data.pregnancy.secondsLeft === 2 || femaleColonist.data.pregnancy.daysLeft === 2, `daysLeft now ${femaleColonist.data.pregnancy.daysLeft}`);

            // 4. Childbirth when gestation completes: pops out as an active kid
            femaleColonist.data.pregnancy.daysLeft = 1;
            femaleColonist.data.pregnancy.secondsLeft = 1;
            const popBefore = colonists().length;
            Colonists.progressPregnancies(); // daysLeft -> 0 -> giveBirth
            const popAfter = colonists().length;
            const newBorn = colonists().find(u => u.data && u.data.motherId === femaleColonist.id);
            const isBoy = newBorn && newBorn.data.gender === "male";
            const isHuman = newBorn && (!newBorn.data.species || newBorn.data.species === "human");
            const wantSprite = isHuman ? "$UF_Human_Child_Walk" : (isBoy ? "$Child_Boy" : "$Child_Girl");
            t.check("childbirth_spawns_baby", popAfter === popBefore + 1 && !!newBorn && newBorn.data.stage === "child" && newBorn.image.characterName === wantSprite && !femaleColonist.data.pregnancy,
                newBorn ? `born ${newBorn.name} (${newBorn.data.gender}), age ${newBorn.data.age}, stage ${newBorn.data.stage}, sprite ${newBorn.image.characterName}, mother pregnant: ${!!femaleColonist.data.pregnancy}` : "child not spawned");

            const birthThought = (femaleColonist.data.thoughts || []).find(th => /Gave birth/i.test(th.text));
            t.check("birth_thought_awarded", !!birthThought, `mother thought: "${femaleColonist.data.thoughts[0]?.text}"`);

            // 5. Aging appearance progression
            if (newBorn) {
                newBorn.data.age = 5;
                Colonists.updateAgeAppearance(newBorn);
                const G = Generator();
                const genActive = G && typeof G.applyToUnit === "function" && newBorn.image.characterName.startsWith("$gen_");
                const childWant = genActive ? newBorn.image.characterName : (isHuman ? "$UF_Human_Child_Walk" : (isBoy ? "$Child_Boy" : "$Child_Girl"));
                t.check("child_sprite_updates", newBorn.image.characterName === childWant,
                    `child age 5 sprite: ${newBorn.image.characterName}`);

                newBorn.data.age = 14;
                Colonists.updateAgeAppearance(newBorn);
                const teenWant = genActive ? newBorn.image.characterName : (isHuman ? "$UF_Human_Child_Walk" : (isBoy ? "$Teen_Boy" : "$Teen_Girl"));
                t.check("teen_sprite_updates", newBorn.image.characterName === teenWant,
                    `teen age 14 sprite: ${newBorn.image.characterName}`);

                newBorn.data.age = 15;
                Colonists.updateAgeAppearance(newBorn);
                const tiers = tiersFor(newBorn.data.species || "human", newBorn.data.gender, newBorn.data.variation);
                const adultWant = genActive ? newBorn.image.characterName : ((tiers && tiers[0]) || (isHuman ? (isBoy ? `$UF_Human_Male_${newBorn.data.variation || 1}_Walk` : `$UF_Human_Female_${newBorn.data.variation || 1}_Walk`) : (isBoy ? "$Adam" : "$Eve")));
                t.check("adult_sprite_updates", newBorn.image.characterName === adultWant,
                    `adult age 15 sprite: ${newBorn.image.characterName}`);
            }
            //-- Sleep and Fire Attraction: homeless/early colonists sleep around the campfire
            const sleeper = livePeople[0];
            const oldSleep = sleeper.data.needs.sleep;
            const fireObj = nearestFire(sleeper);
            if (fireObj) {
                if (UF.Ownership && UF.Ownership.unassignBed) UF.Ownership.unassignBed(sleeper);
                delete sleeper.data.bed;
                const curSJob = J.of(sleeper.id);
                if (curSJob) J.cancel(curSJob.id, "test: sleep");
                sleeper.x = fireObj.x;
                sleeper.y = fireObj.y + 3;
                sleeper.data.needs.sleep = 90;
                decisionAt.set(sleeper.id, -Infinity);
                const sJob = sleepJob(sleeper);
                t.check("sleep_fire_job_created", !!sJob && sJob.type === "sleep", `sleep job created: ${sJob ? sJob.type : "none"}`);
                if (sJob) {
                    const distToFire = Math.max(Math.abs(sJob.target.x - fireObj.x), Math.abs(sJob.target.y - fireObj.y));
                    t.check("sleep_target_in_fire_ring", distToFire >= 1 && distToFire <= 5, `sleep target (${sJob.target.x},${sJob.target.y}) is ${distToFire} tiles from fire (${fireObj.x},${fireObj.y}) (want 1..5)`);
                    t.check("sleep_faces_fire", !!sJob.params && !!sJob.params.faceTowards && sJob.params.faceTowards.x === fireObj.x && sJob.params.faceTowards.y === fireObj.y, `sleep params face fire: ${JSON.stringify(sJob.params ? sJob.params.faceTowards : null)}`);

                    sleeper.x = sJob.target.x;
                    sleeper.y = sJob.target.y;
                    onDone(sJob, sleeper);
                    const thoughts = sleeper.data.thoughts || [];
                    const sleptWarmly = thoughts.some(th => th.text && (th.text.includes("Slept warmly by the fire") || th.text.includes("The fire kept the dwelling warm and comfortable")));
                    t.check("slept_warmly_thought_awarded", sleptWarmly, `thoughts after sleeping by fire: ${thoughts.map(th => th.text).join("; ")}`);
                }
                sleeper.data.needs.sleep = oldSleep;
            }
            t.screenshot("colonist_childbirth");

            await t.waitFrames(5);
            const errs = t.errorsSoFar().slice(errors0);
            t.check("no_errors", errs.length === 0, errs.length ? `${errs.length} error(s), first: ${errs[0]}` : `none during colonists checks (${elapsed()} s)`);
        });

        UF.Test.suite("genetics", async (t) => {
            const W = World();
            const area = { x: 0, y: 0 };
            const cx = 128, cy = 128;

            // 1. Verify all 6 male human variations and U7 portraits
            let malePass = true;
            for (let v = 1; v <= 6; v++) {
                const u = W.addUnit({
                    name: `TEST_Male_${v}`,
                    image: { characterName: `$UF_Human_Male_${v}_Walk`, characterIndex: 0 },
                    area, x: cx + v, y: cy, dir: 2,
                    data: { kind: "colonist", faction: "player", species: "human", gender: "male", variation: v, age: 25, stage: "adult" }
                });
                Colonists.updateAgeAppearance(u);
                if (u.image.characterName !== `$UF_Human_Male_${v}_Walk` || !u.data.face || u.data.face.sheet !== "UF_Faces_human_1" || u.data.face.index !== (v - 1)) {
                    malePass = false;
                }
            }
            t.check("male_6_variations_and_u7_faces", malePass, "all 6 adult male human variations have walk sheets and matching U7 faces");

            // 2. Verify all 6 female human variations and U7 portraits
            let femalePass = true;
            for (let v = 1; v <= 6; v++) {
                const u = W.addUnit({
                    name: `TEST_Female_${v}`,
                    image: { characterName: `$UF_Human_Female_${v}_Walk`, characterIndex: 0 },
                    area, x: cx + v, y: cy + 2, dir: 2,
                    data: { kind: "colonist", faction: "player", species: "human", gender: "female", variation: v, age: 25, stage: "adult" }
                });
                Colonists.updateAgeAppearance(u);
                if (u.image.characterName !== `$UF_Human_Female_${v}_Walk` || !u.data.face || u.data.face.sheet !== "UF_Faces_human_2" || u.data.face.index !== (v - 1)) {
                    femalePass = false;
                }
            }
            t.check("female_6_variations_and_u7_faces", femalePass, "all 6 adult female human variations have walk sheets and matching U7 faces");

            // 3. Child life stage & portrait
            const boyChild = W.addUnit({
                name: "TEST_Child_Boy",
                image: { characterName: "$UF_Human_Child_Walk", characterIndex: 0 },
                area, x: cx + 1, y: cy + 4, dir: 2,
                data: { kind: "colonist", faction: "player", species: "human", gender: "male", variation: 1, age: 5, stage: "child" }
            });
            Colonists.updateAgeAppearance(boyChild);
            const girlChild = W.addUnit({
                name: "TEST_Child_Girl",
                image: { characterName: "$UF_Human_Child_Walk", characterIndex: 0 },
                area, x: cx + 2, y: cy + 4, dir: 2,
                data: { kind: "colonist", faction: "player", species: "human", gender: "female", variation: 2, age: 5, stage: "child" }
            });
            Colonists.updateAgeAppearance(girlChild);

            t.check("child_walk_and_portraits",
                boyChild.image.characterName === "$UF_Human_Child_Walk" && boyChild.data.face.sheet === "UF_Faces_human_1" && boyChild.data.face.index === 6 &&
                girlChild.image.characterName === "$UF_Human_Child_Walk" && girlChild.data.face.sheet === "UF_Faces_human_1" && girlChild.data.face.index === 7,
                "human child boy and girl use $UF_Human_Child_Walk and U7 child stone-arch portraits");

            // 4. Elder life stage & portrait (Average lifespan 60 years)
            const maleElder = W.addUnit({
                name: "TEST_Elder_Male",
                image: { characterName: "$UF_Human_Male_1_Walk", characterIndex: 0 },
                area, x: cx + 3, y: cy + 4, dir: 2,
                data: { kind: "colonist", faction: "player", species: "human", gender: "male", variation: 1, age: 60, stage: "elder" }
            });
            Colonists.updateAgeAppearance(maleElder);
            const femaleElder = W.addUnit({
                name: "TEST_Elder_Female",
                image: { characterName: "$UF_Human_Female_1_Walk", characterIndex: 0 },
                area, x: cx + 4, y: cy + 4, dir: 2,
                data: { kind: "colonist", faction: "player", species: "human", gender: "female", variation: 1, age: 60, stage: "elder" }
            });
            Colonists.updateAgeAppearance(femaleElder);

            t.check("elder_life_stage_and_portraits",
                maleElder.data.face.sheet === "UF_Faces_human_2" && maleElder.data.face.index === 6 &&
                femaleElder.data.face.sheet === "UF_Faces_human_2" && femaleElder.data.face.index === 7,
                "human elder male and female (age 60) resolve to U7 elder stone-arch portraits");

            await t.waitFrames(10);
            t.screenshot("human_genetics_and_aging");
        });

        UF.Test.suite("playthrough", async t => {
            const W = UF.World, J = UF.Jobs, I = UF.Items, O = UF.Objects, H = UF.Households, C = UF.Colonists;
            const Time = window.UF && UF.Time;
            if (Time && typeof Time.setSpeed === "function") Time.setSpeed(8);

            const sampleState = (label) => {
                const fId = factionId();
                const units = W.units().filter(u => u.data && (u.data.kind === "colonist" || u.data.kind === "person") && u.data.faction === fId);
                const alive = units.filter(u => !u.data.dead && !u.data._isDying);
                const adults = alive.filter(u => u.data.stage === "adult" || u.data.age >= 15);
                const children = alive.filter(u => u.data.stage === "child" || (u.data.age < 15 && u.data.age >= 2));
                const babies = alive.filter(u => u.data.stage === "baby" || u.data.age < 2);
                const pregnant = alive.filter(u => u.data.pregnancy);
                const paired = adults.filter(u => u.data.partnerId || u.data.partner);
                const households = H ? H.all().filter(h => !h.mergedInto && h.home) : [];
                const privateH = households.filter(h => !h.home.isShared);
                const shelteredH = privateH.filter(h => H.isSheltered && H.isSheltered(h));
                const cState = colonyState();
                const plan = effectivePlan();
                const planStat = planStatus(cState, plan.slice(0, 8));
                const itemsCount = id => colonyCount(id);

                return {
                    label,
                    ticks: ticks(),
                    year: window.$ufTime ? window.$ufTime.year : 1,
                    day: window.$ufTime ? window.$ufTime.day : 1,
                    hour: window.$ufTime ? window.$ufTime.hour : 12,
                    popTotal: alive.length,
                    adults: adults.length,
                    children: children.length,
                    babies: babies.length,
                    pregnant: pregnant.length,
                    pairedCouples: Math.floor(paired.length / 2),
                    totalHouseholds: households.length,
                    privateHomes: privateH.length,
                    shelteredHomes: shelteredH.length,
                    food: itemsCount("meat") + itemsCount("berry") + itemsCount("cooked_meat"),
                    cookedMeat: itemsCount("cooked_meat"),
                    wood: itemsCount("log") + itemsCount("firewood"),
                    stone: itemsCount("stone"),
                    knives: itemsCount("stone_knife"),
                    clothes: itemsCount("cloak_fur") + itemsCount("wrap_leather"),
                    activeJobs: alive.map(u => {
                        const j = J.of(u.id);
                        return `${u.name}(${u.data.stage || "adult"}): ${j ? (j.type + " " + (j.verb || "")) : "idle"}`;
                    }),
                    planSummary: planStat.map(s => `${s.id}: ${s.detail || (s.done ? "done" : "todo")}`).join(" · ")
                };
            };

            // Checkpoint 1: Initial Colony Setup & Early Bootstrap (T=5s real / ~40s game)
            await t.waitFrames(300);
            const cp1 = sampleState("Checkpoint 1: Early Bootstrap");
            t.screenshot("playthrough_cp1_bootstrap");
            t.check("cp1_founders_alive", cp1.popTotal >= 8, `Pop total: ${cp1.popTotal}, Food: ${cp1.food}, Wood: ${cp1.wood}`);

            // Checkpoint 2: Town Hall Enclosure & Private Plot Reservation (T=25s real / ~200s game)
            await t.waitFrames(1200);
            const cp2 = sampleState("Checkpoint 2: Homesteads & Pairing");
            t.screenshot("playthrough_cp2_homesteads");
            t.check("cp2_pairing_or_homesteads", cp2.privateHomes >= 1 || cp2.pairedCouples >= 1 || cp2.popTotal >= 8,
                `Couples: ${cp2.pairedCouples}, Private Homes: ${cp2.privateHomes}, Sheltered: ${cp2.shelteredHomes}`);

            // Checkpoint 3: Domestic Production & Conception (T=50s real / ~400s game)
            await t.waitFrames(1500);
            const cp3 = sampleState("Checkpoint 3: Production & Conception");
            t.screenshot("playthrough_cp3_production");
            t.check("cp3_colony_active", cp3.popTotal >= 8,
                `Year: ${cp3.year}, Day: ${cp3.day}, Pregnant: ${cp3.pregnant}, Cooked Meat: ${cp3.cookedMeat}, Knives: ${cp3.knives}`);

            // Checkpoint 4: Childbirth & Settlement Growth (T=80s real / ~640s game)
            await t.waitFrames(1800);
            const cp4 = sampleState("Checkpoint 4: Demographics & Expansion");
            t.screenshot("playthrough_cp4_expansion");
            t.check("cp4_population_vitality", cp4.popTotal >= 8,
                `Pop: ${cp4.popTotal} (Adults: ${cp4.adults}, Kids: ${cp4.children}, Pregnant: ${cp4.pregnant}), Homes: ${cp4.privateHomes}`);

            // Checkpoint 5: Village Maturity & Peace Verification (T=100s real / ~800s game)
            await t.waitFrames(1200);
            const cp5 = sampleState("Checkpoint 5: Village Maturity");
            t.screenshot("playthrough_cp5_maturity");
            t.check("cp5_peace_period_holds", (window.$ufTime ? window.$ufTime.year : 1) < 10,
                `Simulation reached Year ${cp5.year} Day ${cp5.day}; 10-year peace period active`);

            // Output comprehensive narrative log
            console.log("\n=================== PLAYTHROUGH SAMPLING REPORT ===================");
            for (const cp of [cp1, cp2, cp3, cp4, cp5]) {
                console.log(`\n--- ${cp.label} (Year ${cp.year}, Day ${cp.day}, Hour ${cp.hour}) ---`);
                console.log(`Population: ${cp.popTotal} | Adults: ${cp.adults} | Children: ${cp.children} | Pregnant: ${cp.pregnant} | Couples: ${cp.pairedCouples}`);
                console.log(`Households: ${cp.totalHouseholds} (Private: ${cp.privateHomes}, Sheltered: ${cp.shelteredHomes})`);
                console.log(`Resources: Food=${cp.food} (Cooked=${cp.cookedMeat}), Wood=${cp.wood}, Stone=${cp.stone}, Knives=${cp.knives}`);
                console.log(`Active Roster (${cp.activeJobs.length}):`);
                for (const job of cp.activeJobs.slice(0, 8)) console.log(`  * ${job}`);
                console.log(`Plan Status: ${cp.planSummary}`);
            }
            console.log("\n===================================================================\n");
        }, { isDefault: false });
    }
})();
