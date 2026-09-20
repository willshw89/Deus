/*:
 * @target MZ
 * @plugindesc [UF Goals] Persistent personal ambitions, physical work priorities, and a selected-creature goals panel (F7).
 * @author UF project
 * @base UF_World
 * @orderAfter UF_Colonists
 * @orderAfter UF_Skills
 * @orderAfter UF_Households
 * @orderAfter UF_CultureGrowth
 * @help
 * People retain short, medium and long horizon lifeGoals in their unit data.
 * UF_Colonists consumes planSteps and choosePlan after survival needs and
 * player orders. No jobs, items, offspring, skills or houses are granted here.
 * Animal goals are observations of the existing wildlife controller, not a
 * replacement animal AI. F7 shows the selected unit; no overhead labels.
 * API and limits: docs/systems/UF_Goals.md. Core methods: aliases only.
 */
(() => {
    "use strict";
    const VERSION = 1, BATCH = 24, MAX_ACHIEVEMENTS = 32;
    const W = () => window.UF && UF.World;
    const cat = () => window.$ufWorldCatalog || {};
    const jobs = () => window.UF && UF.Jobs;
    const items = () => window.UF && UF.Items;
    const recipes = () => (cat().recipes && cat().recipes.list) || [];
    const recipe = id => recipes().find(r => r.id === id) || null;
    const item = id => items() && items().type ? items().type(id) : ((cat().items && cat().items.types) || []).find(t => t.id === id);
    const zOf = u => u && u.z !== undefined ? u.z : u && u.area && u.area.z !== undefined ? u.area.z : 0;
    const sameLevel = (a, b) => !!a && !!b && !!a.area && !!b.area && a.area.x === b.area.x && a.area.y === b.area.y && zOf(a) === zOf(b);
    const person = u => !!(u && u.data && ["person", "colonist"].includes(u.data.kind));
    const creature = u => person(u) || !!(u && u.data && u.data.kind === "creature");
    const resolve = u => typeof u === "number" ? W() && W().unit(u) : u;
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    const facet = (u, key) => Number.isFinite(u.data.facets && u.data.facets[key]) ? clamp(u.data.facets[key], 0, 100) : 50;
    const adult = u => !["baby", "child", "teen"].includes(u.data.stage) && Number.isFinite(u.data.age) && u.data.age >= 18;
    const level = (u, skill) => UF.Skills && typeof UF.Skills.level === "function" ? Math.max(1, UF.Skills.level(u, skill) || 1) : 1;
    const minute = () => {
        const t = window.$ufTime;
        if (t) return (((Number(t.year) || 0) * 336 + (Number(t.monthIndex) || 0) * 28 + Math.max(0, (Number(t.day) || 1) - 1)) * 24 + (Number(t.hour) || 0)) * 60 + (Number(t.minute) || 0);
        return Math.floor((UF.Time && UF.Time.ticks ? UF.Time.ticks() : 0) / 60);
    };
    function random(u, salt) {
        const w = W(), seed = w && w.state ? w.state.seed : 0;
        return w && w.hash32 ? (w.hash32(seed, 0x601a, u.id, salt) >>> 0) / 4294967296 : ((Math.imul((seed | 0) ^ u.id ^ salt, 1664525) + 1013904223) >>> 0) / 4294967296;
    }
    const PROFESSIONS = Object.freeze([
        { id: "woodworker", label: "Woodworker", skill: "woodcutting", tool: "stone_axe", jobs: ["chop"], trait: "natureAffinity" },
        { id: "miner", label: "Miner", skill: "mining", tool: "stone_pick", jobs: ["mine", "quarry", "pick"], trait: "patience" },
        { id: "craftsperson", label: "Craftsperson", skill: "crafting", tool: "stone_knife", jobs: ["craft", "gather"], trait: "curiosity" },
        { id: "cook", label: "Cook", skill: "cooking", tool: "stone_knife", jobs: ["craft", "gather", "hunt"], trait: "sociability" },
        { id: "carpenter", label: "Carpenter", skill: "carpentry", tool: "stone_axe", jobs: ["build", "chop", "craft"], trait: "industriousness" },
        { id: "smith", label: "Smith", skill: "smithing", tool: "stone_pick", jobs: ["mine", "craft"], trait: "discipline" },
        { id: "hunter", label: "Hunter", skill: "hunting", tool: "stone_knife", jobs: ["hunt"], trait: "natureAffinity" },
        { id: "warrior", label: "Warrior", skill: "attack", tool: "stone_knife", jobs: ["hunt"], trait: "bravery" }
    ]);
    const DESTINIES = Object.freeze([
        {
            id: "great_artificer",
            title: "The Master Artificer",
            category: "creation",
            motto: "To forge creations that endure long after stone has turned to dust.",
            jobAffinities: { craft: 1.35, build: 1.25, chop: 1.15, mine: 1.15 },
            target: 10,
            targetLabel: "Craft 10 durable items or structures",
            traits: ["industriousness", "curiosity"],
            thought: "Envisioned a masterwork waiting to be forged."
        },
        {
            id: "legendary_guardian",
            title: "The Legendary Guardian",
            category: "protection",
            motto: "To stand as an unbreakable shield between peril and my kin.",
            jobAffinities: { hunt: 1.4, patrol: 1.3, build: 1.15 },
            target: 5,
            targetLabel: "Defend allies and defeat 5 threats",
            traits: ["bravery", "discipline"],
            thought: "Vigilantly surveyed the settlement's perimeter."
        },
        {
            id: "grand_lorekeeper",
            title: "The Grand Lorekeeper",
            category: "discovery",
            motto: "To seek the hidden truths of the world and preserve the ancient records.",
            jobAffinities: { talk: 1.4, explore: 1.3, gather: 1.2 },
            target: 6,
            targetLabel: "Establish deep social contacts and study the world",
            traits: ["curiosity", "sociability"],
            thought: "Contemplated the deep mysteries of the realm."
        },
        {
            id: "dynastic_founder",
            title: "The Dynastic Founder",
            category: "dynasty",
            motto: "To build a flourishing homestead whose hearth shelters generations to come.",
            jobAffinities: { build: 1.35, craft: 1.2, stock: 1.2, cook: 1.2 },
            target: 2,
            targetLabel: "Establish a complete furnished home and raise lineage",
            traits: ["sociability", "ambition"],
            thought: "Dreamed of a legacy that will endure for generations."
        },
        {
            id: "beast_communer",
            title: "The Warden of the Wilds",
            category: "harmony",
            motto: "To walk in balance with the primal earth and master the ways of beasts.",
            jobAffinities: { hunt: 1.25, gather: 1.35, chop: 1.1 },
            target: 8,
            targetLabel: "Forage wild bounty and track creatures of the wild",
            traits: ["natureAffinity", "patience"],
            thought: "Listened attentively to the distant calls of beasts."
        },
        {
            id: "master_cultivator",
            title: "The Master of the Harvest",
            category: "abundance",
            motto: "To turn barren soils into boundless abundance and nourish all living folk.",
            jobAffinities: { farm: 1.4, gather: 1.3, cook: 1.3, stock: 1.2 },
            target: 10,
            targetLabel: "Cultivate, harvest, or prepare 10 provisions",
            traits: ["patience", "industriousness"],
            thought: "Inspected the soil and anticipated a bountiful season."
        },
        {
            id: "worldstrider_delver",
            title: "The Deep Worldstrider",
            category: "exploration",
            motto: "To delve into the deepest strata of the world and bridge realms across the abyss.",
            jobAffinities: { mine: 1.4, quarry: 1.35, pick: 1.3, explore: 1.3 },
            target: 8,
            targetLabel: "Mine deep strata and traverse underground connections",
            traits: ["bravery", "curiosity"],
            thought: "Yearned for the cool depths and echoing stone."
        },
        {
            id: "high_sovereign",
            title: "The Sovereign of Order",
            category: "mastery",
            motto: "To forge order out of chaos and lead my people toward a glorious era.",
            jobAffinities: { build: 1.3, talk: 1.25, stock: 1.25, craft: 1.2 },
            target: 8,
            targetLabel: "Coordinate settlement works and unite the community",
            traits: ["ambition", "discipline"],
            thought: "Reflected on the destiny and prosperity of the folk."
        },
        {
            id: "wealth_accumulator",
            title: "The Master of Treasures",
            category: "abundance",
            motto: "To uncover precious veins, amass shining relics, and build an empire of gold.",
            jobAffinities: { mine: 1.35, craft: 1.3, stock: 1.3 },
            target: 8,
            targetLabel: "Acquire wealth, ores, and valuable crafted goods",
            traits: ["ambition", "tidiness"],
            thought: "Pondered where rich veins of treasure lie hidden."
        },
        {
            id: "hearth_tender",
            title: "The Keeper of the Hearth",
            category: "harmony",
            motto: "To bring warmth to the weary, comfort to the grieving, and light to the dark.",
            jobAffinities: { cook: 1.4, talk: 1.3, gather: 1.2, stock: 1.2 },
            target: 8,
            targetLabel: "Provide nourishment and solace to fellow companions",
            traits: ["sociability", "patience"],
            thought: "Felt grateful for the warmth of friends and family."
        },
        {
            id: "shadow_operative",
            title: "The Phantom of the Shadows",
            category: "mastery",
            motto: "To walk unseen, strike without a whisper, and master the art of subtlety.",
            jobAffinities: { hunt: 1.35, explore: 1.35, gather: 1.2 },
            target: 6,
            targetLabel: "Scout hostile perimeter and execute decisive hunts",
            traits: ["discipline", "natureAffinity"],
            thought: "Watched silently from the shadows, unnoticed."
        },
        {
            id: "monument_builder",
            title: "The Builder of Eternity",
            category: "creation",
            motto: "To raise towering stoneworks that stand undaunted through the turning of ages.",
            jobAffinities: { build: 1.4, quarry: 1.35, mine: 1.25 },
            target: 10,
            targetLabel: "Construct stone edifices and shape solid rock",
            traits: ["industriousness", "patience"],
            thought: "Imagined towering halls of stone standing through the ages."
        }
    ]);
    function isSentient(u) {
        if (!u || !u.data) return false;
        if (person(u) || u.data.sentient === true) return true;
        if (u.data.kind === "creature") {
            const sp = (UF.Wildlife && UF.Wildlife.speciesOf ? UF.Wildlife.speciesOf(u) : null) ||
                       ((cat().wildlife && cat().wildlife.species) || []).find(s => s.id === u.data.species);
            if (sp && (sp.kind === "herbivore" || sp.kind === "predator" || sp.kind === "prey" || sp.kind === "vermin")) {
                return false;
            }
            const score = Number(u.data.stats && u.data.stats.int);
            if (Number.isFinite(score) && score >= 6) return true;
        }
        return false;
    }
    function destinyFor(u) {
        if (!isSentient(u)) return null;
        if (u.data && u.data.destiny) return u.data.destiny;
        const weights = DESTINIES.map(d => {
            let w = 1.0;
            for (const t of d.traits) w *= (0.4 + facet(u, t) / 100);
            const species = u.data && u.data.species;
            if (species === "dwarf" && (d.id === "worldstrider_delver" || d.id === "monument_builder" || d.id === "great_artificer")) w *= 1.3;
            if (species === "elf" && (d.id === "beast_communer" || d.id === "grand_lorekeeper")) w *= 1.3;
            if (species === "gnome" && (d.id === "great_artificer" || d.id === "grand_lorekeeper")) w *= 1.3;
            if (species === "orc" && (d.id === "legendary_guardian" || d.id === "shadow_operative")) w *= 1.3;
            return w;
        });
        const total = weights.reduce((a, b) => a + b, 0);
        let roll = random(u, 0xde57) * total, chosen = DESTINIES[0];
        for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll <= 0) { chosen = DESTINIES[i]; break; } }
        return {
            id: chosen.id,
            title: chosen.title,
            category: chosen.category,
            motto: chosen.motto,
            jobAffinities: Object.assign({}, chosen.jobAffinities),
            target: chosen.target,
            targetLabel: chosen.targetLabel,
            progress: 0,
            fulfilled: false,
            fulfilledAt: null,
            thought: chosen.thought
        };
    }
    function capability(u) {
        if (!person(u)) return { mode: "instinctive_observation", planningBudget: 0, intelligence: null };
        const score = Number(u.data.stats && u.data.stats.int);
        const intelligence = Number.isFinite(score) ? clamp(score, 1, 30) : 10;
        return { mode: adult(u) ? "sapient" : "developing", planningBudget: adult(u) ? clamp(1 + Math.floor((intelligence - 6) / 6), 1, 3) : 0, intelligence };
    }
    function professionFor(u) {
        const culture = UF.Colonists && UF.Colonists.culture ? UF.Colonists.culture(u) : null;
        const weights = PROFESSIONS.map(p => {
            const affinity = culture && culture.priorities ? Math.max(0.25, ...p.jobs.map(j => Number(culture.priorities[j]) || 1)) : 1;
            return (0.4 + facet(u, p.trait) / 100) * (1 + Math.min(40, level(u, p.skill)) / 40) * Math.sqrt(affinity);
        });
        let roll = random(u, 7) * weights.reduce((a, b) => a + b, 0), chosen = PROFESSIONS[0];
        for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll <= 0) { chosen = PROFESSIONS[i]; break; } }
        return { id: chosen.id, label: chosen.label, skill: chosen.skill, startingLevel: level(u, chosen.skill), targetLevel: Math.min(99, level(u, chosen.skill) + 3 + Math.floor(facet(u, "ambition") / 34)) };
    }
    const goal = (id, kind, label, extra) => Object.assign({ id, kind, label, state: "active", progress: 0, target: 1, created: minute() }, extra || {});
    function ensure(ref) {
        const u = resolve(ref);
        if (!creature(u)) return null;
        if (u.data.lifeGoals && typeof u.data.lifeGoals === "object") {
            if (isSentient(u) && !u.data.destiny && W() && W().state) {
                u.data.destiny = destinyFor(u);
                u.data.lifeGoals.destiny = u.data.destiny;
            } else if (u.data.destiny && !u.data.lifeGoals.destiny) {
                u.data.lifeGoals.destiny = u.data.destiny;
            }
            return u.data.lifeGoals;
        }
        // Catalogs load before units. Never save an irreversible empty aspiration during boot.
        if (!W() || !W().state) return null;
        const cap = capability(u);
        const s = { version: VERSION, mode: cap.mode, capability: cap, destiny: null, profession: null, short: null, medium: [], long: [], achievements: [], contacts: {}, failures: {}, evaluatedAt: null };
        u.data.lifeGoals = s;
        if (isSentient(u)) {
            u.data.destiny = u.data.destiny || destinyFor(u);
            s.destiny = u.data.destiny;
        }
        if (!person(u)) return s;
        s.profession = professionFor(u);
        const p = PROFESSIONS.find(p => p.id === s.profession.id), r = recipe(p.tool);
        if (r) {
            const output = Object.keys(r.outputs || {})[0], t = item(output);
            if (output && t) s.medium.push(goal(`goal_${u.id}_equipment`, "equipment", `Obtain a ${String(t.name || output).toLowerCase()}`, { recipe: r.id, item: output }));
        }
        if (facet(u, "sociability") >= 40) s.medium.push(goal(`goal_${u.id}_relationship`, "relationship", "Get to know someone", { target: 3 }));
        s.long.push(goal(`goal_${u.id}_home`, "home", "Live in a furnished family home"));
        s.long.push(goal(`goal_${u.id}_profession`, "profession", `Develop as a ${s.profession.label.toLowerCase()}`, { skill: s.profession.skill, target: s.profession.targetLevel }));
        if (facet(u, "sociability") >= 45 || random(u, 31) > 0.65) s.long.push(goal(`goal_${u.id}_parenthood`, "parenthood", "Become a parent"));
        return s;
    }
    function household(u) {
        const H = UF.Households;
        if (!H || typeof H.of !== "function" || typeof H.describe !== "function") return null;
        const h = H.of(u);
        return h ? H.describe(h) : null;
    }
    function inventory(u) { return items() && items().inventoryOf ? items().inventoryOf(u.id) : []; }
    function achievement(s, g) {
        if (g.state === "achieved") return;
        g.state = "achieved"; g.completedAt = minute(); delete g.blockedReason;
        if (!s.achievements.some(a => a.id === g.id)) s.achievements.push({ id: g.id, kind: g.kind, label: g.label, at: g.completedAt });
        if (s.achievements.length > MAX_ACHIEVEMENTS) s.achievements.splice(0, s.achievements.length - MAX_ACHIEVEMENTS);
    }
    function shortTerm(u, s) {
        const J = jobs(), j = J && J.of ? J.of(u.id) : null;
        if (j) return { kind: "job", jobId: j.id, type: j.type, label: J.describe ? J.describe(j) : j.type, observed: true };
        if (!person(u)) {
            const d = u.data, state = d.state || (u.goal ? "wander" : "idle");
            const labels = { hunt: "Hunting", feed: "Feeding", graze: "Grazing", sleep: "Sleeping", flee: "Escaping danger", retaliate: "Defending itself", wander: "Exploring nearby", idle: "Resting or watching" };
            return { kind: "observed_behavior", type: state, label: labels[state] || String(state), observed: true };
        }
        const n = u.data.needs || {}, th = (cat().colony && cat().colony.thresholds) || {};
        for (const [key, label] of [["thirst", "Find a drink"], ["hunger", "Find food"], ["sleep", "Get some sleep"], ["social", "Find company"]]) {
            if ((n[key] || 0) >= (th[key] || (key === "sleep" ? 75 : 55))) return { kind: "need", type: key, label, observed: false };
        }
        return { kind: "idle", type: "idle", label: s.mode === "developing" ? "Grow and learn" : "Consider useful work", observed: false };
    }
    function refresh(ref) {
        const u = resolve(ref), s = ensure(u);
        if (!s) return null;
        s.capability = capability(u); s.mode = s.capability.mode; s.short = shortTerm(u, s); s.evaluatedAt = minute();
        if (!person(u)) {
            const sp = UF.Wildlife && UF.Wildlife.speciesOf ? UF.Wildlife.speciesOf(u) : null;
            s.medium = [{ id: "observed_food", kind: "observation", label: sp && (sp.kind === "predator" || sp.kind === "monster") ? "Find prey and feed" : "Find forage and safety", state: "observational" }];
            s.long = [{ id: "observed_range", kind: "observation", label: u.data.herd ? "Remain near its herd and home range" : "Remain within its home range", state: "observational" }];
            return s;
        }
        const inv = inventory(u), h = household(u), all = W().units();
        for (const g of [...s.medium, ...s.long]) {
            if (g.state === "achieved") continue;
            let complete = false;
            if (g.kind === "equipment") { g.progress = inv.some(i => i.type === g.item && i.holder === u.id && i.count > 0) ? 1 : 0; complete = g.progress === 1; }
            if (g.kind === "profession") { g.progress = level(u, g.skill); complete = g.progress >= g.target; }
            if (g.kind === "relationship") { g.progress = Math.max(0, ...Object.values(s.contacts)); complete = g.progress >= g.target; }
            if (g.kind === "parenthood") { g.progress = all.some(c => c.data && (c.data.motherId === u.id || c.data.fatherId === u.id)) ? 1 : 0; complete = g.progress === 1; }
            if (g.kind === "home") { g.progress = h && h.complete === true ? 1 : 0; complete = g.progress === 1; }
            if (complete) achievement(s, g);
        }
        if (s.destiny && !s.destiny.fulfilled) {
            if (s.destiny.id === "dynastic_founder") {
                let prog = 0;
                if (h && h.complete) prog++;
                if (all.some(c => c.data && (c.data.motherId === u.id || c.data.fatherId === u.id))) prog++;
                s.destiny.progress = Math.max(s.destiny.progress, prog);
            }
            if (s.destiny.progress >= s.destiny.target) {
                s.destiny.fulfilled = true;
                s.destiny.fulfilledAt = minute();
                achievement(s, { id: `destiny_${u.id}_${s.destiny.id}`, kind: "destiny", label: `Fulfilled Destiny: ${s.destiny.title}` });
            }
        }
        return s;
    }
    function planSteps(ref) {
        const u = resolve(ref), s = refresh(u);
        if (!s || s.mode !== "sapient") return [];
        const out = [];
        for (const g of s.medium) {
            if (g.kind !== "equipment" || g.state === "achieved" || !recipe(g.recipe)) continue;
            const f = s.failures[g.id];
            if (f && f.retryAt > minute()) continue;
            const t = item(g.item);
            out.push({ id: g.id, craft: g.recipe, each: true, equip: !!(t && (t.tool || t.wear)), goalOwner: u.id, goalId: g.id, goalKind: g.kind });
            if (out.length >= s.capability.planningBudget) break;
        }
        return out;
    }
    function priorities(ref) {
        const u = resolve(ref), s = ensure(u), out = {};
        if (!s || !person(u)) return out;
        const p = PROFESSIONS.find(p => s.profession && p.id === s.profession.id);
        if (p) for (const j of p.jobs) out[j] = 1.15 + facet(u, "ambition") / 400;
        const home = s.long.find(g => g.kind === "home");
        if (home && home.state !== "achieved") out.build = Math.max(out.build || 1, 1.15 + facet(u, "tidiness") / 500);
        if (s.destiny && s.destiny.jobAffinities) {
            for (const [j, mult] of Object.entries(s.destiny.jobAffinities)) {
                out[j] = (out[j] || 1) * mult;
            }
        }
        return out;
    }
    function choosePlan(ref, candidates) {
        const u = resolve(ref), s = ensure(u), pref = priorities(u);
        if (!s) return (candidates || []).slice();
        return (candidates || []).filter(c => !c.step || c.step.goalOwner === undefined || c.step.goalOwner === u.id).map((c, index) => {
            const spec = c.spec || {}, own = c.step && c.step.goalOwner === u.id;
            const r = spec.type === "craft" && spec.params ? recipe(spec.params.recipeId) : null;
            const skill = r && ({ stonework: "crafting", smelting: "smithing", bowyery: "fletching", tanning: "leatherwork" }[r.skill] || r.skill);
            const specialty = skill && s.profession && skill === s.profession.skill ? 0.2 : 0;
            const destinyBonus = (s.destiny && s.destiny.jobAffinities && s.destiny.jobAffinities[spec.type]) ? (s.destiny.jobAffinities[spec.type] - 1) * 0.8 : 0;
            const score = (Number.isFinite(c.score) ? c.score : 1) + ((pref[spec.type] || 1) - 1) + (own ? 0.25 : 0) + specialty + destinyBonus;
            return { c, index, score };
        }).sort((a, b) => b.score - a.score || (a.c.order || 0) - (b.c.order || 0) || a.index - b.index).map(x => Object.assign({}, x.c, { score: x.score }));
    }
    function describe(ref) {
        const u = resolve(ref), s = refresh(u);
        if (!s) return null;
        return { unitId: u.id, name: u.name, z: zOf(u), mode: s.mode, capability: Object.assign({}, s.capability),
            destiny: s.destiny ? Object.assign({}, s.destiny) : null,
            profession: s.profession && Object.assign({}, s.profession),
            short: Object.assign({}, s.short), medium: s.medium.map(g => Object.assign({}, g)), long: s.long.map(g => Object.assign({}, g)), achievements: s.achievements.map(a => Object.assign({}, a)), household: person(u) ? household(u) : null,
            limits: person(u) ? "Ambitions influence work; no automatic trade, combat training or forced relationships." : "Observational only: the existing wildlife controller still makes decisions; animal thirst and persistent needs are not implemented here." };
    }
    function onFailed(j) {
        const u = j && W() && W().unit(j.assigned || j.owner), s = u && ensure(u), id = j && j.params && (j.params.goalId || j.params.plan);
        if (!s || !id || ![...s.medium, ...s.long].some(g => g.id === id)) return;
        if (/ordered|replaced|too thirsty|too hungry|test over/i.test(j.reason || "")) return;
        const f = s.failures[id] || { attempts: 0 }; f.attempts = Math.min(6, f.attempts + 1);
        f.retryAt = minute() + Math.min(120, 5 * Math.pow(2, f.attempts - 1)); f.reason = String(j.reason || "Work could not proceed"); s.failures[id] = f;
        const g = [...s.medium, ...s.long].find(g => g.id === id); if (g) g.blockedReason = f.reason;
    }
    function onDone(j, u) {
        if (!u || !person(u)) return;
        const s = ensure(u); if (!s) return;
        const id = j.params && (j.params.goalId || j.params.plan);
        if (id && s.failures[id]) delete s.failures[id];
        if (j.type === "talk") {
            const other = W().unit(j.params && j.params.unitId);
            if (person(other) && sameLevel(u, other)) for (const [a, b] of [[u, other], [other, u]]) {
                const as = ensure(a); if (as) { as.contacts[b.id] = Math.min(100, (as.contacts[b.id] || 0) + 1); refresh(a); }
            }
        }
        if (s.destiny && !s.destiny.fulfilled) {
            const dest = s.destiny;
            let progressed = false;
            if (dest.id === "great_artificer" && (j.type === "craft" || j.type === "build")) {
                dest.progress++; progressed = true;
            } else if (dest.id === "legendary_guardian" && (j.type === "hunt" || j.type === "attack")) {
                dest.progress++; progressed = true;
            } else if (dest.id === "grand_lorekeeper" && (j.type === "talk" || j.type === "explore")) {
                dest.progress++; progressed = true;
            } else if (dest.id === "beast_communer" && (j.type === "gather" || j.type === "hunt")) {
                dest.progress++; progressed = true;
            } else if (dest.id === "master_cultivator" && (j.type === "farm" || j.type === "gather" || (j.type === "craft" && /cook/i.test(j.params && j.params.recipeId || "")))) {
                dest.progress++; progressed = true;
            } else if (dest.id === "worldstrider_delver" && (j.type === "mine" || j.type === "quarry" || j.type === "pick")) {
                dest.progress++; progressed = true;
            } else if (dest.id === "high_sovereign" && (j.type === "build" || j.type === "talk" || j.type === "haul")) {
                dest.progress++; progressed = true;
            } else if (dest.id === "wealth_accumulator" && (j.type === "mine" || (j.type === "craft" && /gem|gold|silver|iron/i.test(j.params && j.params.recipeId || "")))) {
                dest.progress++; progressed = true;
            } else if (dest.id === "hearth_tender" && (j.type === "cook" || j.type === "talk" || (j.type === "craft" && /cook|bread|stew/i.test(j.params && j.params.recipeId || "")))) {
                dest.progress++; progressed = true;
            } else if (dest.id === "shadow_operative" && (j.type === "hunt" || j.type === "explore")) {
                dest.progress++; progressed = true;
            } else if (dest.id === "monument_builder" && (j.type === "build" || j.type === "quarry")) {
                dest.progress++; progressed = true;
            }
            if (dest.progress >= dest.target && !dest.fulfilled) {
                dest.fulfilled = true;
                dest.fulfilledAt = minute();
                achievement(s, { id: `destiny_${u.id}_${dest.id}`, kind: "destiny", label: `Fulfilled Destiny: ${dest.title}` });
            }
        }
        refresh(u);
    }
    let cursor = 0;
    function refreshBatch() {
        if (!W() || !W().state || (UF.Time && UF.Time.paused)) return;
        const units = W().units().filter(creature);
        if (!units.length) return;
        for (let i = 0; i < Math.min(BATCH, units.length); i++) { refresh(units[cursor % units.length]); cursor++; }
        cursor %= units.length;
    }
    let hooked = false;
    function hook() {
        if (hooked || !UF.Events) return; hooked = true;
        // History rolls stats after addUnit; Colonists fills facets afterwards.
        // Founders must not permanently choose a career from missing defaults.
        UF.Events.on("world:unitAdded", u => { if (!person(u) || u.data.facets) ensure(u); });
        UF.Events.on("colonists:ready", () => { cursor = 0; refreshBatch(); });
        UF.Events.on("world:created", () => { cursor = 0; });
        UF.Events.on("time:minute", refreshBatch);
        UF.Events.on("jobs:done", onDone);
        UF.Events.on("jobs:failed", onFailed);
        UF.Events.on("skills:levelUp", u => refresh(u));
        UF.Events.on("colonists:born", (child, mother, father) => { ensure(child); if (mother) refresh(mother); if (father) refresh(father); });
        UF.Events.on("combat:kill", (victim, attacker) => {
            if (attacker && person(attacker)) {
                const s = ensure(attacker);
                if (s && s.destiny && !s.destiny.fulfilled && (s.destiny.id === "legendary_guardian" || s.destiny.id === "shadow_operative")) {
                    s.destiny.progress++;
                    if (s.destiny.progress >= s.destiny.target) {
                        s.destiny.fulfilled = true;
                        s.destiny.fulfilledAt = minute();
                        achievement(s, { id: `destiny_${attacker.id}_${s.destiny.id}`, kind: "destiny", label: `Fulfilled Destiny: ${s.destiny.title}` });
                    }
                }
            }
        });
        UF.Events.on("combat:aid", e => {
            const helpers = (e && e.helpers) || [];
            for (const h of helpers) {
                if (!person(h)) continue;
                const s = ensure(h);
                if (s && s.destiny && !s.destiny.fulfilled && (s.destiny.id === "legendary_guardian" || s.destiny.id === "hearth_tender")) {
                    s.destiny.progress++;
                    if (s.destiny.progress >= s.destiny.target) {
                        s.destiny.fulfilled = true;
                        s.destiny.fulfilledAt = minute();
                        achievement(s, { id: `destiny_${h.id}_${s.destiny.id}`, kind: "destiny", label: `Fulfilled Destiny: ${s.destiny.title}` });
                    }
                }
            }
        });
    }
    function selected() {
        const sub = UF.Sheet && UF.Sheet.subject ? UF.Sheet.subject() : null;
        if (sub && sub.kind === "unit") return W() && W().unit(sub.unitId);
        const S = UF.Select, primary = S && typeof S.primary === "function" ? S.primary() : null;
        if (primary) return resolve(primary);
        const c = window.$colonyManager && $colonyManager.selectedColonist;
        return c && W() ? W().unit(c.id) : null;
    }
    function panel() { const scene = SceneManager._scene; return scene instanceof Scene_Map ? scene._ufGoalsWindow || null : null; }
    function showSelected() { const p = panel(), u = selected(); if (!p || !u) return false; p.showUnit(u); return true; }
    class Window_UFGoals extends Window_Base {
        initialize(rect) { super.initialize(rect); this._unitId = null; this._refreshCount = 0; this.hide(); }
        showUnit(u) { this._unitId = u.id; this.redraw(); this.show(); }
        redraw() {
            this.contents.clear(); const d = describe(this._unitId); if (!d) { this.hide(); return; }
            this.contents.fontSize = 17; const width = this.innerWidth || this.contentsWidth(), line = 23; let y = 0;
            const draw = (text, color) => { if (color) this.changeTextColor(color); else this.resetTextColor(); this.drawText(text, 0, y, width); y += line; };
            const textGoal = g => `${g.state === "achieved" ? "Done: " : ""}${g.label}${g.target > 1 ? ` (${g.progress || 0}/${g.target})` : ""}`;
            draw(`${d.name} - goals (F7 closes)`, ColorManager.systemColor());
            if (d.destiny) {
                draw(`Destiny: ${d.destiny.title} [${d.destiny.fulfilled ? "Fulfilled" : "Active"}]`, ColorManager.crisisColor ? ColorManager.crisisColor() : "#e0c068");
                draw(`"${d.destiny.motto}"`);
                draw(`Target: ${d.destiny.targetLabel} (${d.destiny.progress || 0}/${d.destiny.target})`);
            }
            draw(`${d.profession ? d.profession.label : "Instinctive creature"} | z ${d.z} | ${d.mode}`);
            draw(`Now: ${d.short.label}`);
            draw("Medium term", ColorManager.systemColor()); for (const g of d.medium.slice(0, 3)) draw(textGoal(g));
            draw("Long term", ColorManager.systemColor()); for (const g of d.long.slice(0, 3)) draw(textGoal(g));
            if (d.household) { draw("Household", ColorManager.systemColor()); draw(`${(d.household.members || []).length} members | ${d.household.complete ? "Furnished home" : "Home still needs work"}`); }
            draw(d.mode === "instinctive_observation" ? "Animal plans are observations, not new AI." : "Ambitions yield to needs and your orders.");
        }
        update() { super.update(); if (this.visible && ++this._refreshCount % 30 === 0) this.redraw(); }
    }
    window.UF = window.UF || {};
    const Goals = { VERSION, BATCH, ensure, refresh, describe, priorities, planSteps, choosePlan, capability, refreshBatch, showSelected, selected, window: panel, Window: Window_UFGoals, onDone, onFailed, destinyOf: ref => { const u = resolve(ref); return (u && u.data && u.data.destiny) || (ensure(u) && ensure(u).destiny) || null; }, DESTINIES, isSentient };
    window.UF.Goals = Goals;
    const _boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { hook(); if (UF.Test && UF.Test.active) registerChecks(); _boot.call(this); };
    const _loaded = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) { _loaded.call(this, contents); cursor = 0; };
    const _windows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _windows.call(this); const w = Math.min(620, Graphics.boxWidth - 32), h = Math.min(430, Graphics.boxHeight - 112);
        // Existing look, level and speed HUDs occupy the top 80 px.
        this._ufGoalsWindow = new Window_UFGoals(new Rectangle(16, 96, w, h)); this.addWindow(this._ufGoalsWindow);
    };
    const shortcut = !Input.keyMapper[118];
    if (shortcut) Input.keyMapper[118] = "uf_goals";
    const _sceneUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _sceneUpdate.call(this);
        if (!shortcut || !this.isActive() || !Input.isTriggered("uf_goals") || $gameMessage.isBusy() || $gameMap.isEventRunning()) return;
        const p = panel(); if (p && p.visible) p.hide(); else showSelected();
    };
    function registerChecks() {
        UF.Test.suite("goals", async t => {
            const world = W(), J = jobs(), I = items(), C = UF.Colonists, enabled = C && C.isEnabled();
            const errors0 = t.errorsSoFar().length;
            let worker = null;
            if (C) C.setEnabled(false);
            try {
                const view = world.viewLevel(), prototype = world.units().find(u => person(u) && sameLevel(u, { area: view, z: view.z }));
                let cell = null;
                const cx = prototype ? prototype.x : $gamePlayer.x, cy = prototype ? prototype.y : $gamePlayer.y;
                for (let r = 1; r <= 12 && !cell; r++) for (let dx = -r; dx <= r && !cell; dx++) for (const dy of [-r, r]) if (J.standable(view, cx + dx, cy + dy)) { cell = { x: cx + dx, y: cy + dy }; break; }
                if (!cell) { t.check("test_cell", false, "No standable cell near the viewed settlement"); return; }
                worker = world.addUnit({ name: "TEST_GoalMaker", image: prototype ? Object.assign({}, prototype.image) : { characterName: "$Adam", characterIndex: 0 },
                    area: { x: view.x, y: view.y }, z: view.z, x: cell.x, y: cell.y, dir: 2,
                    data: { kind: "person", species: "human", ai: null, age: 25, stage: "adult", stats: { int: 12 }, facets: { sociability: 75, ambition: 65 }, needs: { hunger: 0, thirst: 0, sleep: 0 }, inventory: [], equipment: {} } });
                const initial = refresh(worker), step = planSteps(worker)[0], g = initial.medium.find(g => g.kind === "equipment");
                t.check("persistent_aspiration", !!step && step.goalOwner === worker.id && g.state === "active" && initial.profession && initial.long.length >= 2,
                    `worker ${worker.id}, profession ${initial.profession.label}, step ${JSON.stringify(step)}, equipment ${g.state}`);
                t.check("destiny_assigned", !!worker.data.destiny && !!initial.destiny && initial.destiny.id === worker.data.destiny.id && typeof initial.destiny.motto === "string",
                    `worker ${worker.id}, destiny ${worker.data.destiny && worker.data.destiny.title}`);
                const r = recipe(step.craft);
                for (const [id, count] of Object.entries(r.inputs)) I.give(id, count, worker.id);
                const job = J.create({ type: "craft", owner: worker.id, target: { area: Object.assign({}, worker.area), z: zOf(worker), x: worker.x, y: worker.y }, params: { recipeId: r.id, plan: step.id, goalId: g.id } });
                await t.waitUntil(() => !job || ["done", "failed"].includes(job.state), 15000, "the physical ambition craft to finish").catch(() => {});
                refresh(worker);
                t.check("physical_goal_job", job && job.state === "done" && inventory(worker).some(i => i.type === g.item) && g.state === "achieved" && planSteps(worker).length === 0,
                    `craft ${r.id}: ${job && job.state}, ${job && job.reason}; inventory ${inventory(worker).map(i => i.type + "x" + i.count).join(",")}; goal ${g.state}`);
                const profession = initial.long.find(g => g.kind === "profession"), oldLevel = level(worker, profession.skill);
                t.check("skill_not_timer", profession.state === "active" && profession.progress < profession.target,
                    `${profession.skill}: level ${oldLevel}, target ${profession.target}, state ${profession.state}`);
                const saved = JSON.parse(JSON.stringify(worker.data.lifeGoals)); worker.data.lifeGoals = saved;
                t.check("save_goal_identity", ensure(worker) === saved && saved.achievements.some(a => a.id === g.id) && saved.profession.id === initial.profession.id && saved.destiny && saved.destiny.id === initial.destiny.id,
                    `round-trip preserves profession ${saved.profession.id}, destiny ${saved.destiny && saved.destiny.id} and ${saved.achievements.length} achievement(s)`);
                const choices = choosePlan(worker, [{ step: { id: "other", goalOwner: worker.id + 999 }, spec: { type: "craft" }, score: 100 }, { step: { id: "own", goalOwner: worker.id }, spec: { type: "craft" }, score: 1 }]);
                t.check("other_person_goal_refused", choices.length === 1 && choices[0].step.id === "own", `candidate ids ${choices.map(c => c.step.id).join(",")}`);
                if (UF.Sheet && UF.Sheet.open) UF.Sheet.open(worker.id);
                const opened = showSelected(), p = panel(); await t.waitFrames(2);
                t.check("selected_readout", opened && p && p.visible && p._unitId === worker.id && p.contents && p.contents.width > 0,
                    `selected ${selected() && selected().id}, panel ${p && p.visible}, unit ${p && p._unitId}`);
                t.screenshot("selected_goals");
                t.check("no_errors", t.errorsSoFar().length === errors0, `${t.errorsSoFar().length - errors0} new errors`);
            } finally {
                const p = panel(); if (p) p.hide();
                if (UF.Sheet && UF.Sheet.close) UF.Sheet.close();
                if (worker) { const j = J.of(worker.id); if (j) J.cancel(j.id, "test over"); for (const it of inventory(worker).slice()) I.remove(it.id); world.removeUnit(worker.id); }
                if (C) C.setEnabled(enabled);
            }
        }, { isDefault: false });
    }
})();
