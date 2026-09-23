/*:
 * @target MZ
 * @plugindesc [DEUS HistoricalDemographics] Explicit annual demographics and version 7 historical registry.
 * @author Gemini & Astra
 * @orderAfter DEUS_World
 * @orderAfter DEUS_History
 * @help
 * HIST-01/minimum HIST-02/HIST-09. No listeners, automatic generation, live units,
 * terrain edits, or save hooks. create(world, options) imports canonical
 * Year-1 history into a separate state; the caller owns attachment/persistence.
 * Promoted default biological profiles and localized site capacity models are provided.
 * API/schema: docs/systems/UF_History.md. Historical years only.
 * Deaths precede births each year. Partnerships persist until a partner dies.
 * Infant deaths use causeOfDeath=disease and deathDetail=infant; the first
 * annual mortality assessment after birth applies the infant hazard.
 * Explicit casualty IDs are idempotent: an already deceased target is ignored.
 * Rulers can be minors; isMinor records minority, without simulating a regent.
 * Sites never move or expand. Deep-history compression is deferred: historic
 * records remain complete and retain pedigree anchors for a later migration.
 * Replaced core methods: none.
 */
(() => {
    "use strict";
    const UF = window.DEUS || window.UF;
    if (!UF || !UF.World || typeof UF.World.hash32 !== "function" || typeof UF.World.mulberry32 !== "function")
        throw new Error("HistoricalDemographics requires UF.World deterministic helpers");
    const check = (ok, text) => { if (!ok) throw new Error(`HistoricalDemographics: ${text}`); };
    const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
    const integer = n => Number.isSafeInteger(n);
    const probability = n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
    function jsonSafe(value, path = "state", seen = new Set()) {
        if (value === null || typeof value === "string" || typeof value === "boolean") return;
        if (typeof value === "number") { check(Number.isFinite(value), `${path} must be finite`); return; }
        check(typeof value === "object" && !seen.has(value) && (Array.isArray(value) || Object.prototype.toString.call(value) === "[object Object]"), `${path} is not JSON safe`);
        seen.add(value);
        for (const key of Object.keys(value)) jsonSafe(value[key], `${path}.${key}`, seen);
        seen.delete(value);
    }
    const copy = value => { jsonSafe(value); return JSON.parse(JSON.stringify(value)); };
    function namesValid(names) {
        check(names && ["start", "male", "female"].every(k => Array.isArray(names[k]) && names[k].length && names[k].every(v => typeof v === "string" && v.length)), "name syllable tables required");
    }
    function profilesValid(profiles, species) {
        check(profiles && typeof profiles === "object" && !Array.isArray(profiles), "explicit species profiles required");
        for (const id of species) {
            check(typeof id === "string" && own(profiles, id), `missing explicit profile ${id}`);
            const p = profiles[id];
            check(p && ["lifespan", "reproductiveAge"].every(k => Array.isArray(p[k]) && p[k].length === 2 && p[k].every(n => integer(n) && n >= 1) && p[k][0] <= p[k][1]), `invalid age profile ${id}`);
            check(p.reproductiveAge[0] < p.lifespan[1] && p.reproductiveAge[1] < p.lifespan[1], `reproductive window exceeds lifespan for ${id}`);
            check(["birthChance", "infantMortality", "diseaseMortality", "exposureMortality"].every(k => probability(p[k])) && integer(p.birthSpacingYears) && p.birthSpacingYears >= 1, `invalid demographic probabilities ${id}`);
            if (p.names) namesValid(p.names);
        }
    }
    const DEFAULT_PROFILES = Object.freeze({
        human: Object.freeze({ lifespan: [60, 90], reproductiveAge: [18, 55], birthChance: 0.36, birthSpacingYears: 3, infantMortality: 0.004, diseaseMortality: 0.0003, exposureMortality: 0.0003 }),
        elf: Object.freeze({ lifespan: [350, 750], reproductiveAge: [60, 350], birthChance: 0.025, birthSpacingYears: 12, infantMortality: 0.002, diseaseMortality: 0.0001, exposureMortality: 0.0001 }),
        dwarf: Object.freeze({ lifespan: [250, 350], reproductiveAge: [40, 240], birthChance: 0.09, birthSpacingYears: 6, infantMortality: 0.006, diseaseMortality: 0.0003, exposureMortality: 0.0003 }),
        halfling: Object.freeze({ lifespan: [120, 150], reproductiveAge: [20, 110], birthChance: 0.20, birthSpacingYears: 4, infantMortality: 0.012, diseaseMortality: 0.0008, exposureMortality: 0.0006 }),
        gnome: Object.freeze({ lifespan: [350, 500], reproductiveAge: [40, 200], birthChance: 0.05, birthSpacingYears: 10, infantMortality: 0.005, diseaseMortality: 0.0002, exposureMortality: 0.0002 }),
        dragonborn: Object.freeze({ lifespan: [65, 80], reproductiveAge: [15, 60], birthChance: 0.34, birthSpacingYears: 3, infantMortality: 0.004, diseaseMortality: 0.0003, exposureMortality: 0.0003 }),
        "half-elf": Object.freeze({ lifespan: [140, 180], reproductiveAge: [20, 125], birthChance: 0.12, birthSpacingYears: 5, infantMortality: 0.010, diseaseMortality: 0.0005, exposureMortality: 0.0005 }),
        "half-orc": Object.freeze({ lifespan: [55, 75], reproductiveAge: [14, 50], birthChance: 0.40, birthSpacingYears: 2, infantMortality: 0.004, diseaseMortality: 0.0003, exposureMortality: 0.0003 }),
        tiefling: Object.freeze({ lifespan: [70, 110], reproductiveAge: [18, 65], birthChance: 0.30, birthSpacingYears: 3, infantMortality: 0.004, diseaseMortality: 0.0003, exposureMortality: 0.0003 })
    });
    const DEFAULT_CAPACITY_MODEL = Object.freeze({
        version: 1,
        defaultBaseline: 160,
        minimumScale: 0.10,
        minCapacity: 60,
        maxCapacity: 350
    });
    function deriveSiteCapacity(seedOrState, sourceSiteId, z, kind, capacityModel) {
        const seed = typeof seedOrState === "object" && seedOrState ? seedOrState.seed : seedOrState;
        const cfg = capacityModel || (typeof seedOrState === "object" && seedOrState && seedOrState.config && seedOrState.config.capacityModel) || DEFAULT_CAPACITY_MODEL;
        const base = z === 0 ? 170 : (z === -1 ? 155 : 145);
        const rng = UF.World.mulberry32(UF.World.hash32(seed, sourceSiteId, 0x43415041));
        const mod = Math.floor(rng() * 31) - 15;
        const cap = base + mod;
        return Math.max(cfg.minCapacity, Math.min(cfg.maxCapacity, cap));
    }
    function alive(person) { return person.died === null; } // HIST_MUTANT_DEAD_REPRODUCE
    function lifespan(state, person) { return state.config.profiles[person.species].lifespan; } // HIST_MUTANT_UNIFORM_LIFESPAN
    const random = (state, year, id, salt) => UF.World.mulberry32(UF.World.hash32(state.seed, year, id, salt));
    const atBirth = (person, year) => person.born < year && (person.died === null || person.died > year);
    function ancestor(state, parentId, personId) {
        const pending = state.people[personId].parents.slice(), seen = new Set();
        while (pending.length) {
            const id = pending.pop();
            if (id === parentId) return true;
            if (!seen.has(id)) { seen.add(id); check(state.people[id], "invalid ancestry reference"); pending.push(...state.people[id].parents); }
        }
        return false;
    }
    function kinshipRelated(state, a, b) {
        check(integer(a) && integer(b) && state.people[a] && state.people[b], "kinship IDs invalid");
        return a === b || state.people[a].parents.some(id => state.people[b].parents.includes(id)) || ancestor(state, a, b) || ancestor(state, b, a);
    }
    function emit(state, type, factionId, siteId, personIds, text) {
        state.events.push({ id: state.nextEventId++, year: state.currentYear, type, factionId, siteId, personIds, text });
        if (state.events.length > state.config.eventLimit) { state.events.shift(); state.eventsDiscarded++; }
    }
    function partner(state, mother, father, imported = false) {
        const p = { id: state.partnerships.length, motherId: mother.id, fatherId: father.id, siteId: mother.siteId,
            fromYear: state.currentYear, toYear: null, lastBirthYear: null, imported };
        state.partnerships.push(p); mother.partnershipId = p.id; father.partnershipId = p.id;
        emit(state, "partnership", mother.factionId, mother.siteId, [mother.id, father.id], `${mother.name} and ${father.name} established a household.`);
    }
    function fertile(state, person) {
        const bounds = state.config.profiles[person.species].reproductiveAge, age = state.currentYear - person.born;
        return alive(person) && age >= bounds[0] && age <= bounds[1];
    }
    function pair(state) {
        const available = state.people.filter(p => fertile(state, p) && p.partnershipId === null);
        for (const mother of available.filter(p => p.gender === "female")) {
            const candidates = available.filter(p => p.gender === "male" && p.partnershipId === null && p.siteId === mother.siteId && p.species === mother.species && p.factionId === mother.factionId && !kinshipRelated(state, p.id, mother.id));
            if (!candidates.length) continue;
            // Preserve imported founder families when both partners reach maturity.
            const family = mother.sourceFamilyId && candidates.find(p => p.sourceFamilyId === mother.sourceFamilyId);
            const rng = random(state, state.currentYear, mother.id, 0x50414952);
            partner(state, mother, family || candidates[Math.floor(rng() * candidates.length)]);
        }
    }
    function succession(state, initial = {}) {
        for (const faction of Object.values(state.factions)) {
            const previous = faction.activeRulerId === null ? null : state.rulers[faction.activeRulerId];
            if (previous && alive(state.people[previous.personId])) { previous.isMinor = state.currentYear - state.people[previous.personId].born < state.config.profiles[state.people[previous.personId].species].reproductiveAge[0]; continue; } // HIST_MUTANT_SKIP_SUCCESSION
            if (previous) { previous.toYear = state.currentYear; state.people[previous.personId].title = null; }
            const prior = previous || (faction.lastRulerId === null ? null : state.rulers[faction.lastRulerId]);
            const living = state.people.filter(p => p.factionId === faction.id && alive(p));
            living.sort((a, b) => a.born - b.born || a.id - b.id);
            const heirs = prior ? living.filter(p => ancestor(state, prior.personId, p.id)) : [];
            // Direct children precede other descendants, regardless of the other
            // parent's genealogy depth; seniority resolves each class.
            heirs.sort((a, b) => Number(b.parents.includes(prior.personId)) - Number(a.parents.includes(prior.personId)) || a.born - b.born || a.id - b.id);
            const chosen = initial[faction.id] === undefined ? (heirs[0] || living[0]) : state.people[initial[faction.id]];
            faction.activeRulerId = null;
            if (!chosen) continue;
            const ruler = { id: state.rulers.length, factionId: faction.id, personId: chosen.id, siteId: chosen.siteId, dynastyId: chosen.dynastyId,
                fromYear: state.currentYear, toYear: null, successionType: prior ? (heirs.includes(chosen) ? "hereditary" : "seniority") : "appointment",
                isMinor: state.currentYear - chosen.born < state.config.profiles[chosen.species].reproductiveAge[0] };
            state.rulers.push(ruler); faction.activeRulerId = ruler.id; faction.lastRulerId = ruler.id;
            chosen.title = faction.rulerTitle; chosen.wasRuler = true; chosen.pedigreeAnchor = true;
            emit(state, prior ? "succession" : "ruler", faction.id, chosen.siteId, prior ? [prior.personId, chosen.id] : [chosen.id], `${chosen.name} became ${chosen.title}.`);
        }
    }
    function create(world, options = {}) {
        check(world && integer(world.seed) && world.seed >= 0 && world.seed <= 0xffffffff && world.history && world.history.version === 5 && world.history.startYear === 1 && world.history.years === 0, "canonical Year-1 history v5 required");
        check(world.factions && Array.isArray(world.factions.list) && world.factions.list.length && Array.isArray(world.history.sites) && world.history.founders, "canonical faction/site/founder records required");
        check(integer(world.size) && world.size > 0 && integer(world.areasX) && world.areasX > 0 && integer(world.areasY) && world.areasY > 0, "world dimensions invalid");
        const species = [...new Set(world.factions.list.map(f => f.species))];
        const isDefaultProfiles = options.profiles === undefined || options.profiles === "default";
        const profiles = isDefaultProfiles ? copy(DEFAULT_PROFILES) : options.profiles;
        profilesValid(profiles, species);
        const catalog = window.$deusWorldCatalog || window.$ufWorldCatalog;
        const names = options.names || (catalog && catalog.start && catalog.start.names);
        namesValid(names);
        const capacityModel = copy(Object.assign({}, DEFAULT_CAPACITY_MODEL, options.capacityModel || {}));
        const config = copy({ profiles, names, capacityModel, recentYears: options.recentYears === undefined ? 20 : options.recentYears,
            eventLimit: options.eventLimit === undefined ? 400 : options.eventLimit,
            dynastyInheritance: options.dynastyInheritance || "maternal", compression: "deferred" });
        check(integer(config.recentYears) && config.recentYears >= 0 && integer(config.eventLimit) && config.eventLimit >= 1 && ["maternal", "paternal"].includes(config.dynastyInheritance), "invalid retention/inheritance options");
        const demographicProfileVersion = isDefaultProfiles
            ? "1.0.0-provisional-astra08"
            : (options.demographicProfileVersion || "custom");
        const state = { version: 7, historyModelVersion: 1, demographicProfileVersion, capacityModelVersion: 1, domain: "historical", seed: world.seed, yearsSimulated: 0, startYear: 1, currentYear: 1,
            dimensions: { size: world.size, areasX: world.areasX, areasY: world.areasY }, config,
            factions: {}, sites: [], people: [], dynasties: [], rulers: [], partnerships: [], events: [], nextEventId: 1, eventsDiscarded: 0 };
        const sourceSites = new Map(), initial = {};
        for (const f of world.factions.list) {
            check(typeof f.id === "string" && f.id.length && !own(Object.prototype, f.id) && !own(state.factions, f.id), "duplicate/invalid faction ID");
            state.factions[f.id] = { id: f.id, culture: f.culture || f.species, species: f.species, homeSiteId: null, activeRulerId: null, lastRulerId: null, dynastyIds: [], siteIds: [], rulerTitle: "" };
        }
        for (const s of world.history.sites) {
            check(integer(s.id) && !sourceSites.has(s.id) && own(state.factions, s.faction) && s.founded === 1 && s.ruined === null, "invalid canonical source site ID/faction/year");
            const zRange = s.zRange === undefined ? [s.z, s.z] : s.zRange.slice();
            const historicalCapacity = options.siteCapacity && options.siteCapacity[s.id] !== undefined
                ? options.siteCapacity[s.id]
                : deriveSiteCapacity(state.seed, s.id, s.z, s.kind, capacityModel);
            check(integer(historicalCapacity) && historicalCapacity >= capacityModel.minCapacity && historicalCapacity <= capacityModel.maxCapacity, "invalid historicalCapacity");
            const site = { id: state.sites.length, sourceSiteId: s.id, factionId: s.faction, name: s.name, kind: s.kind,
                area: copy(s.area), x: s.x, y: s.y, z: s.z, zRange, foundedYear: s.founded,
                abandonedYear: null, isRuined: false, population: 0, peakPopulation: 0, historicalCapacity };
            state.sites.push(site); sourceSites.set(s.id, site.id); state.factions[s.faction].siteIds.push(site.id);
            emit(state, "founding", s.faction, site.id, [], `${site.name} was founded.`);
        }
        for (const f of world.factions.list) {
            const record = world.history.founders[f.id], faction = state.factions[f.id], families = new Map();
            check(record && Array.isArray(record.plan) && record.plan.length && sourceSites.has(record.site), `missing founders ${f.id}`);
            faction.homeSiteId = sourceSites.get(record.site);
            for (const plan of record.plan) {
                const siteId = sourceSites.get(plan.site === undefined ? record.site : plan.site);
                check(siteId !== undefined && state.sites[siteId].factionId === f.id && (plan.z === undefined || plan.z === state.sites[siteId].z), "founder site mismatch");
                check(typeof plan.name === "string" && plan.name.length && ["male", "female"].includes(plan.gender) && integer(plan.age) && plan.age >= 0, "invalid founder identity/age");
                const family = plan.familyId || `individual:${state.people.length}`;
                if (!families.has(family)) {
                    const dynasty = { id: state.dynasties.length, name: plan.surname || plan.name, factionId: f.id, founderId: state.people.length, foundedYear: 1 };
                    state.dynasties.push(dynasty); families.set(family, dynasty.id); faction.dynastyIds.push(dynasty.id);
                }
                const person = { id: state.people.length, name: plan.name, gender: plan.gender, species: f.species, factionId: f.id, siteId,
                    born: 1 - plan.age, died: null, causeOfDeath: null, deathDetail: null, parents: [], dynastyId: families.get(family), generation: 0,
                    title: null, isFounder: true, wasRuler: false, pedigreeAnchor: true, tier: "living", partnershipId: null,
                    sourceFamilyId: plan.familyId || null, lastBirthYear: null };
                state.people.push(person); state.sites[siteId].population++;
                if (plan.leader) { check(initial[f.id] === undefined, "multiple source leaders"); initial[f.id] = person.id; faction.rulerTitle = plan.title || "Leader"; }
            }
            check(initial[f.id] !== undefined, `missing canonical leader ${f.id}`);
        }
        for (const site of state.sites) {
            check(world.history.sites.find(s => s.id === site.sourceSiteId).pop === site.population, "canonical site/founder census mismatch");
            site.peakPopulation = site.population;
        }
        succession(state, initial);
        for (const mother of state.people.filter(p => p.gender === "female" && p.sourceFamilyId !== null)) {
            const family = state.people.filter(p => p.factionId === mother.factionId && p.sourceFamilyId === mother.sourceFamilyId);
            const father = family.find(p => p.gender === "male");
            if (family.length === 2 && father && father.siteId === mother.siteId) {
                check(mother.partnershipId === null && father.partnershipId === null, "duplicate canonical founder household");
                partner(state, mother, father, true);
            }
        }
        pair(state); validate(state); return state;
    }
    function validate(state) {
        jsonSafe(state);
        check(state.version !== 6, "unsupported schema version: 6 (explicit migration required via UF.HistoricalDemographics.migrate)");
        check(state.version === 7, `unsupported demographics schema version: ${state.version}`);
        check(state.historyModelVersion === 1, `unsupported historyModelVersion: ${state.historyModelVersion}`);
        check(state.capacityModelVersion === 1, `unsupported capacityModelVersion: ${state.capacityModelVersion}`);
        check(typeof state.demographicProfileVersion === "string" && state.demographicProfileVersion.length > 0, "invalid demographicProfileVersion");
        check(state.domain === "historical" && integer(state.seed) && state.seed >= 0 && state.seed <= 0xffffffff, "invalid demographics schema/seed");
        check(state.config && typeof state.config === "object" && !Array.isArray(state.config), "invalid config");
        const cm = state.config.capacityModel;
        check(cm && typeof cm === "object" && !Array.isArray(cm), "invalid capacityModel config");
        check(cm.version === state.capacityModelVersion, "capacityModel version mismatch");
        check(integer(cm.version) && cm.version >= 1 && probability(cm.minimumScale) && integer(cm.defaultBaseline) && cm.defaultBaseline > 0 && integer(cm.minCapacity) && integer(cm.maxCapacity) && cm.minCapacity > 0 && cm.minCapacity <= cm.maxCapacity, "invalid capacityModel config");
        check(state.startYear === 1 && integer(state.yearsSimulated) && state.yearsSimulated >= 0 && state.currentYear === state.startYear + state.yearsSimulated, "historical clock mismatch");
        check(state.dimensions && ["size", "areasX", "areasY"].every(k => integer(state.dimensions[k]) && state.dimensions[k] > 0), "invalid world dimensions");
        check(state.config && integer(state.config.recentYears) && state.config.recentYears >= 0 && integer(state.config.eventLimit) && state.config.eventLimit >= 1 && ["maternal", "paternal"].includes(state.config.dynastyInheritance) && state.config.compression === "deferred", "invalid state retention/inheritance config");
        check(state.factions && typeof state.factions === "object" && !Array.isArray(state.factions) && Object.keys(state.factions).length, "invalid faction registry");
        namesValid(state.config.names); profilesValid(state.config.profiles, Object.values(state.factions).map(f => f.species));
        check(["sites", "people", "dynasties", "rulers", "partnerships", "events"].every(k => Array.isArray(state[k])), "registry arrays required");
        const residents = new Array(state.sites.length).fill(0), paired = new Set(), sourceSites = new Set(), intervals = new Map(), births = new Map();
        for (const [i, s] of state.sites.entries()) {
            const d = state.dimensions;
            check(s.id === i && own(state.factions, s.factionId) && s.area && integer(s.area.x) && integer(s.area.y) && s.area.x >= 0 && s.area.x < d.areasX && s.area.y >= 0 && s.area.y < d.areasY && integer(s.x) && integer(s.y) && s.x >= 0 && s.x < d.size && s.y >= 0 && s.y < d.size, "invalid site coordinate/ID");
            check(integer(s.z) && Array.isArray(s.zRange) && s.zRange.length === 2 && s.zRange.every(z => integer(z) && z >= -2 && z <= 2) && s.zRange[0] <= s.z && s.z <= s.zRange[1], "invalid site z/zRange");
            check(integer(s.sourceSiteId) && !sourceSites.has(s.sourceSiteId) && s.foundedYear === 1 && typeof s.name === "string" && s.name.length && typeof s.kind === "string" && s.isRuined === false, "invalid imported site metadata"); sourceSites.add(s.sourceSiteId);
            check(integer(s.population) && s.population >= 0 && s.peakPopulation >= s.population && (s.abandonedYear === null || (integer(s.abandonedYear) && s.abandonedYear <= state.currentYear && s.population === 0)), "invalid site population/abandonment");
            check(integer(s.historicalCapacity) && s.historicalCapacity >= cm.minCapacity && s.historicalCapacity <= cm.maxCapacity, "invalid historicalCapacity");
        }
        for (const [i, p] of state.people.entries()) {
            check(p.id === i && integer(p.siteId) && integer(p.dynastyId) && (p.partnershipId === null || integer(p.partnershipId)) && state.sites[p.siteId] && state.sites[p.siteId].factionId === p.factionId && own(state.factions, p.factionId) && p.species === state.factions[p.factionId].species && ["male", "female"].includes(p.gender), "invalid person identity/site");
            check(integer(p.born) && p.born <= state.currentYear && (p.died === null || integer(p.died) && p.died >= p.born && p.died <= state.currentYear), "invalid lifetime");
            check((p.died === null && p.tier === "living" && p.causeOfDeath === null && p.deathDetail === null) || (p.died !== null && ["recent", "historic"].includes(p.tier) && ["old_age", "disease", "exposure", "violence"].includes(p.causeOfDeath)), "invalid mortality tier/cause");
            check(p.deathDetail === null || (p.deathDetail === "infant" && p.causeOfDeath === "disease" && p.died - p.born <= 1), "invalid death detail");
            if (p.causeOfDeath === "old_age") check(p.died - p.born >= state.config.profiles[p.species].lifespan[0], "death precedes species old-age baseline");
            check(state.dynasties[p.dynastyId] && state.dynasties[p.dynastyId].factionId === p.factionId && Array.isArray(p.parents) && (p.parents.length === 0 || p.parents.length === 2), "invalid dynasty/parents");
            if (p.parents.length) {
                const [m, f] = p.parents.map(id => state.people[id]);
                check(p.parents.every(id => integer(id) && id >= 0 && id < p.id) && m && f && m.gender === "female" && f.gender === "male" && m.species === p.species && f.species === p.species && !kinshipRelated(state, m.id, f.id), "invalid parentage/kinship");
                check([m, f].every(x => atBirth(x, p.born) && p.born - x.born >= state.config.profiles[x.species].reproductiveAge[0] && p.born - x.born <= state.config.profiles[x.species].reproductiveAge[1]), "deceased or ineligible parent reproduced");
                check(state.partnerships.some(h => h.motherId === m.id && h.fatherId === f.id && h.siteId === p.siteId && h.fromYear <= p.born && (h.toYear === null || h.toYear > p.born)), "birth outside partnership/site");
                check(p.generation === 1 + Math.max(m.generation, f.generation), "invalid genealogy depth");
                check(p.dynastyId === (state.config.dynastyInheritance === "paternal" ? f.dynastyId : m.dynastyId), "invalid inherited dynasty");
                const history = births.get(m.id) || []; history.push(p.born); births.set(m.id, history);
            } else check(p.isFounder && p.generation === 0, "nonfounder lacks parents");
            if (p.died === null) residents[p.siteId]++;
        }
        state.sites.forEach((s, i) => check(s.population === residents[i], "site census mismatch"));
        for (const p of state.people) {
            const history = births.get(p.id) || []; history.sort((a, b) => a - b);
            check(p.lastBirthYear === (history.length ? history[history.length - 1] : null) && history.every((year, i) => !i || year - history[i - 1] >= state.config.profiles[p.species].birthSpacingYears), "invalid birth spacing/last birth");
        }
        state.dynasties.forEach((d, i) => check(d.id === i && integer(d.founderId) && state.people[d.founderId] && state.people[d.founderId].factionId === d.factionId, "invalid dynasty founder"));
        for (const [i, h] of state.partnerships.entries()) {
            const m = state.people[h.motherId], f = state.people[h.fatherId];
            check(h.id === i && integer(h.motherId) && integer(h.fatherId) && integer(h.siteId) && m && f && m.gender === "female" && f.gender === "male" && m.siteId === h.siteId && f.siteId === h.siteId && m.species === f.species && m.factionId === f.factionId && !kinshipRelated(state, m.id, f.id), "invalid partnership");
            check(integer(h.fromYear) && h.fromYear >= 1 && h.fromYear <= state.currentYear && (h.toYear === null || integer(h.toYear) && h.toYear >= h.fromYear && h.toYear <= state.currentYear), "invalid partnership interval");
            check(typeof h.imported === "boolean" && [m, f].every(p => atBirth(p, h.fromYear)), "partnership predates life or follows death");
            if (h.imported) check(h.fromYear === 1 && m.isFounder && f.isFounder && m.sourceFamilyId !== null && m.sourceFamilyId === f.sourceFamilyId, "invalid imported founder partnership");
            else check([m, f].every(p => h.fromYear - p.born >= state.config.profiles[p.species].reproductiveAge[0] && h.fromYear - p.born <= state.config.profiles[p.species].reproductiveAge[1]), "ineligible person established partnership");
            const ended = [m.died, f.died].filter(year => year !== null);
            check(h.toYear === (ended.length ? Math.min(...ended) : null), "partnership end does not match partner death");
            for (const id of [m.id, f.id]) {
                const prior = intervals.get(id) || [];
                check(prior.every(old => (old.toYear !== null && old.toYear <= h.fromYear) || (h.toYear !== null && h.toYear <= old.fromYear)), "overlapping partnerships");
                prior.push(h); intervals.set(id, prior);
            }
            if (h.toYear === null) { check(m.died === null && f.died === null && !paired.has(m.id) && !paired.has(f.id) && m.partnershipId === h.id && f.partnershipId === h.id, "dead/duplicate active partnership"); paired.add(m.id); paired.add(f.id); }
        }
        for (const p of state.people) check(p.partnershipId === null || (state.partnerships[p.partnershipId] && state.partnerships[p.partnershipId].toYear === null && paired.has(p.id)), "stale partnership link");
        for (const [i, r] of state.rulers.entries()) {
            const p = state.people[r.personId];
            check(r.id === i && integer(r.personId) && integer(r.siteId) && integer(r.dynastyId) && p && p.factionId === r.factionId && p.dynastyId === r.dynastyId && p.siteId === r.siteId && integer(r.fromYear) && r.fromYear >= 1 && r.fromYear <= state.currentYear, "invalid ruler record");
            check(p.born <= r.fromYear && (p.died === null || p.died > r.fromYear), "ruler not alive at accession");
            check(r.toYear === null ? p.died === null : integer(r.toYear) && r.toYear >= r.fromYear && r.toYear <= state.currentYear && r.toYear === p.died, "invalid ruler end year");
        }
        for (const [key, f] of Object.entries(state.factions)) {
            const living = state.people.some(p => p.factionId === f.id && p.died === null), active = state.rulers.filter(r => r.factionId === f.id && r.toYear === null);
            check(active.length === (living ? 1 : 0) && (living ? f.activeRulerId === active[0].id : f.activeRulerId === null), "exactly one living ruler required for each nonextinct faction");
            check(f.id === key && integer(f.homeSiteId) && (f.activeRulerId === null || integer(f.activeRulerId)) && (f.lastRulerId === null || integer(f.lastRulerId)) && typeof f.culture === "string" && typeof f.rulerTitle === "string" && Array.isArray(f.siteIds) && new Set(f.siteIds).size === f.siteIds.length && f.siteIds.includes(f.homeSiteId) && f.siteIds.every(id => integer(id) && state.sites[id] && state.sites[id].factionId === f.id) && state.sites.filter(s => s.factionId === f.id).length === f.siteIds.length, "invalid faction sites/metadata");
            check(Array.isArray(f.dynastyIds) && new Set(f.dynastyIds).size === f.dynastyIds.length && f.dynastyIds.every(id => integer(id) && state.dynasties[id] && state.dynasties[id].factionId === f.id) && state.dynasties.filter(d => d.factionId === f.id).length === f.dynastyIds.length, "invalid faction dynasty registry");
            const reigns = state.rulers.filter(r => r.factionId === f.id);
            check(reigns.length && f.lastRulerId === reigns[reigns.length - 1].id && new Set(reigns.map(r => r.personId)).size === reigns.length && reigns.every((r, i) => r.fromYear === (i ? reigns[i - 1].toYear : 1)), "invalid succession continuity");
        }
        check(integer(state.nextEventId) && state.nextEventId >= 1 && integer(state.eventsDiscarded) && state.eventsDiscarded >= 0 && state.events.length + state.eventsDiscarded === state.nextEventId - 1 && state.events.length <= state.config.eventLimit, "event retention mismatch");
        state.events.forEach((e, i) => check(e.id === state.eventsDiscarded + i + 1 && integer(e.year) && e.year >= 1 && e.year <= state.currentYear && own(state.factions, e.factionId) && integer(e.siteId) && state.sites[e.siteId] && Array.isArray(e.personIds) && e.personIds.every(id => integer(id) && state.people[id]) && typeof e.text === "string", "invalid chronicle event"));
        return true;
    }
    function conditionsValid(state, conditions) {
        jsonSafe(conditions);
        check(conditions && typeof conditions === "object" && !Array.isArray(conditions) && Object.keys(conditions).every(k => ["casualtyIds", "siteRisks"].includes(k)), "invalid annual conditions");
        const casualties = conditions.casualtyIds === undefined ? [] : conditions.casualtyIds, risks = conditions.siteRisks === undefined ? {} : conditions.siteRisks;
        check(Array.isArray(casualties) && new Set(casualties).size === casualties.length && casualties.every(id => integer(id) && state.people[id]), "invalid casualty IDs");
        check(risks && typeof risks === "object" && !Array.isArray(risks) && Object.keys(risks).every(id => integer(Number(id)) && state.sites[id] && risks[id] && typeof risks[id] === "object" && !Array.isArray(risks[id]) && Object.keys(risks[id]).every(k => ["disease", "exposure"].includes(k) && probability(risks[id][k]))), "invalid site risks");
    }
    function step(state, conditions = {}) {
        validate(state); conditionsValid(state, conditions);
        check(state.currentYear < 1000000 && state.people.length < 1000000, "historical proof registry/year bound exceeded");
        state.currentYear++; state.yearsSimulated++;
        const startOfYearPopulation = new Map();
        for (const s of state.sites) {
            startOfYearPopulation.set(s.id, s.population);
        }
        const casualties = new Set(conditions.casualtyIds || []);
        for (const p of state.people.filter(alive)) {
            const profile = state.config.profiles[p.species], [lo, hi] = lifespan(state, p), age = state.currentYear - p.born;
            const rng = random(state, state.currentYear, p.id, 0x44454144), risk = (conditions.siteRisks || {})[p.siteId] || {};
            let cause = casualties.has(p.id) ? "violence" : null, detail = null;
            if (!cause && age <= 1 && rng() < profile.infantMortality) { cause = "disease"; detail = "infant"; }
            if (!cause && rng() < Math.min(1, profile.diseaseMortality + (risk.disease || 0))) cause = "disease";
            if (!cause && rng() < Math.min(1, profile.exposureMortality + (risk.exposure || 0))) cause = "exposure";
            if (!cause && age >= lo && (age >= hi || rng() < (age - lo + 1) / (hi - lo + 1))) cause = "old_age";
            if (cause && p.died === null) {
                p.died = state.currentYear; p.causeOfDeath = cause; p.deathDetail = detail; p.tier = "recent"; state.sites[p.siteId].population--;
                emit(state, "death", p.factionId, p.siteId, [p.id], `${p.name} died (${cause}).`);
            }
        }
        for (const h of state.partnerships.filter(h => h.toYear === null)) {
            if (!alive(state.people[h.motherId]) || !alive(state.people[h.fatherId])) {
                h.toYear = state.currentYear; state.people[h.motherId].partnershipId = null; state.people[h.fatherId].partnershipId = null;
            }
        }
        pair(state);
        const capModel = state.config.capacityModel;
        for (const h of state.partnerships.filter(h => h.toYear === null)) {
            const mother = state.people[h.motherId], father = state.people[h.fatherId], profile = state.config.profiles[mother.species];
            if (!fertile(state, mother) || !fertile(state, father) || (mother.lastBirthYear !== null && state.currentYear - mother.lastBirthYear < profile.birthSpacingYears)) continue;
            const site = state.sites[mother.siteId];
            const startPop = startOfYearPopulation.get(mother.siteId);
            const cap = site.historicalCapacity;
            const scale = Math.max(capModel.minimumScale, 1 - (startPop / cap));
            const effectiveBirthChance = profile.birthChance * scale;
            const rng = random(state, state.currentYear, h.id, 0x42495254);
            if (rng() >= effectiveBirthChance) continue;
            const gender = rng() < 0.5 ? "female" : "male", names = profile.names || state.config.names;
            const raw = names.start[Math.floor(rng() * names.start.length)] + names[gender][Math.floor(rng() * names[gender].length)];
            const person = { id: state.people.length, name: raw.charAt(0).toUpperCase() + raw.slice(1), gender, species: mother.species, factionId: mother.factionId, siteId: mother.siteId,
                born: state.currentYear, died: null, causeOfDeath: null, deathDetail: null, parents: [mother.id, father.id],
                dynastyId: state.config.dynastyInheritance === "paternal" ? father.dynastyId : mother.dynastyId,
                generation: 1 + Math.max(mother.generation, father.generation), title: null, isFounder: false, wasRuler: false, pedigreeAnchor: false,
                tier: "living", partnershipId: null, sourceFamilyId: null, lastBirthYear: null };
            state.people.push(person); state.sites[person.siteId].population++;
            mother.lastBirthYear = state.currentYear; h.lastBirthYear = state.currentYear; mother.pedigreeAnchor = father.pedigreeAnchor = true;
            emit(state, "birth", person.factionId, person.siteId, [person.id, mother.id, father.id], `${person.name} was born to ${mother.name} and ${father.name}.`);
        }
        succession(state);
        for (const s of state.sites) {
            s.peakPopulation = Math.max(s.peakPopulation, s.population);
            if (!s.population && s.abandonedYear === null) { s.abandonedYear = state.currentYear; emit(state, "abandonment", s.factionId, s.id, [], `${s.name} became uninhabited.`); }
        }
        for (const p of state.people) if (p.died !== null && state.currentYear - p.died >= state.config.recentYears) p.tier = "historic";
        return state;
    }
    function simulate(state, years, options = {}) {
        check(integer(years) && years >= 0 && years <= 10000 && state.currentYear + years <= 1000000, "invalid simulation years");
        check(options && typeof options === "object" && !Array.isArray(options) && Object.keys(options).every(k => ["conditions", "conditionsByYear"].includes(k)), "invalid simulation options");
        check(!(own(options, "conditions") && own(options, "conditionsByYear")), "choose fixed or year-indexed conditions");
        validate(state);
        if (own(options, "conditions")) conditionsValid(state, options.conditions);
        if (own(options, "conditionsByYear")) {
            jsonSafe(options.conditionsByYear);
            check(options.conditionsByYear && typeof options.conditionsByYear === "object" && !Array.isArray(options.conditionsByYear), "invalid year-indexed conditions");
            for (const [year, c] of Object.entries(options.conditionsByYear)) {
                check(integer(Number(year)) && Number(year) > state.currentYear && Number(year) <= state.currentYear + years, "condition year outside simulation");
                conditionsValid(state, c);
            }
        }
        for (let i = 0; i < years; i++) step(state, options.conditions || (options.conditionsByYear || {})[state.currentYear + 1] || {});
        return state;
    }
    function summary(state) {
        validate(state);
        const living = state.people.filter(p => p.died === null), cohorts = {};
        for (const p of living) { const age = state.currentYear - p.born; cohorts[age] = (cohorts[age] || 0) + 1; }
        return { currentYear: state.currentYear, yearsSimulated: state.yearsSimulated, living: living.length, deceased: state.people.length - living.length,
            archived: state.people.filter(p => p.tier !== "living").length, cohorts,
            settlementsActive: state.sites.filter(s => s.abandonedYear === null).length, settlementsAbandoned: state.sites.filter(s => s.abandonedYear !== null).length,
            dynasties: state.dynasties.length, activeRulers: state.rulers.filter(r => r.toYear === null).length,
            eventsGenerated: state.nextEventId - 1, eventsRetained: state.events.length };
    }
    function migrate(state) {
        check(state && typeof state === "object" && !Array.isArray(state), "invalid state object for migration");
        jsonSafe(state);
        if (state.version === 7) {
            validate(state);
            return state;
        }
        check(state.version === 6, `unsupported migration source version: ${state.version}`);
        state.version = 7;
        state.historyModelVersion = 1;
        state.capacityModelVersion = 1;
        if (!state.demographicProfileVersion) {
            state.demographicProfileVersion = "legacy-v6";
        }
        state.migratedFromVersion = 6;
        if (!state.config) state.config = {};
        if (!state.config.capacityModel) {
            state.config.capacityModel = copy(DEFAULT_CAPACITY_MODEL);
        } else {
            state.config.capacityModel = Object.assign({}, DEFAULT_CAPACITY_MODEL, state.config.capacityModel);
        }
        check(Array.isArray(state.sites), "sites array required for migration");
        for (const site of state.sites) {
            if (site.historicalCapacity === undefined) {
                site.historicalCapacity = deriveSiteCapacity(state.seed, site.sourceSiteId, site.z, site.kind, state.config.capacityModel);
            }
        }
        validate(state);
        return state;
    }
    UF.HistoricalDemographics = { create, step, simulate, kinshipRelated, validate, summary, migrate, DEFAULT_PROFILES, DEFAULT_CAPACITY_MODEL, deriveSiteCapacity };
})();
