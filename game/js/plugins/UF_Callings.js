/*:
 * @target MZ
 * @plugindesc [UF Callings] Creature callings and professions with population-scaled weighting.
 * @author Gemini
 * @orderAfter UF_Core
 * @orderAfter UF_World
 * @orderAfter UF_Factions
 * @help
 * Implements 89 medieval colony and fantasy callings/professions with population-dependent
 * probability weighting. Every faction creature receives 3 distinct callings:
 * - When society is small (founders, pop <= 8), generation is heavily weighted toward
 *   the critical survival end (Farmers, Carpenters, Blacksmiths, Medics, etc.).
 * - As society grows up to the 200 population cap, the tail progressively opens with
 *   more lenience toward artisans, scholars, merchants, situational casters, and nobles.
 */

(() => {
    "use strict";

    const RAW_PROFESSIONS = [
        [1, "Farmer", "Critical"],
        [2, "Carpenter", "Critical"],
        [3, "Physician", "Critical"],
        [4, "Blacksmith", "Critical"],
        [5, "Engineer", "Critical"],
        [6, "Laborer", "Critical"],
        [7, "Mason", "Critical"],
        [8, "Farmhand", "Critical"],
        [9, "Lumberjack", "Critical"],
        [10, "Miller", "Critical"],
        [11, "Medic", "Critical"],
        [12, "Shepherd", "Critical"],
        [13, "Butcher", "Critical"],
        [14, "Fisherman", "Critical"],
        [15, "Herbalist", "Critical"],
        [16, "Surgeon", "Critical"],
        [17, "Waste Collector", "Critical"],
        [18, "Hunter", "Critical"],
        [19, "Veterinarian", "Very high"],
        [20, "Potter", "Very high"],
        [21, "Construction Worker", "Very high"],
        [22, "Tanner", "Very high"],
        [23, "Leatherworker", "Very high"],
        [24, "Dresser", "Very high"],
        [25, "Animal Trainer", "Very high"],
        [26, "Weaver", "Very high"],
        [27, "Chef", "Very high"],
        [28, "Cleaner", "Very high"],
        [29, "Spinner", "Very high"],
        [30, "Trapper", "Very high"],
        [31, "Brewer", "High"],
        [32, "Cheesewright", "High"],
        [33, "Ranger", "High"],
        [34, "Mechanic", "High"],
        [35, "Alchemist", "High"],
        [36, "Miner", "High"],
        [37, "Druid", "High"],
        [38, "Fletcher", "High"],
        [39, "Stonecutter", "High"],
        [40, "Manager", "High"],
        [41, "Cleric", "High"],
        [42, "Beekeeper", "High"],
        [43, "Sheriff", "High"],
        [44, "Scholar", "High"],
        [45, "Private", "Moderate-high"],
        [46, "Sergeant", "Moderate-high"],
        [47, "Merchant", "Moderate-high"],
        [48, "Mayor", "Moderate-high"],
        [49, "Boatman", "Moderate-high*"],
        [50, "Sailor", "Moderate-high*"],
        [51, "Glasswright", "Moderate"],
        [52, "Weaponsmith", "Moderate"],
        [53, "Armorsmith", "Moderate"],
        [54, "Shopkeeper", "Moderate"],
        [55, "Bookkeeper", "Moderate"],
        [56, "Broker", "Moderate"],
        [57, "Innkeep", "Moderate"],
        [58, "Captain", "Moderate"],
        [59, "Knight", "Moderate"],
        [60, "Paladin", "Moderate"],
        [61, "Fighter", "Moderate"],
        [62, "Wizard", "Situational"],
        [63, "Road Builder", "Situational"],
        [64, "Sage", "Situational"],
        [65, "Ambassador", "Situational"],
        [66, "Jailor", "Situational"],
        [67, "Commander", "Situational"],
        [68, "Stone Carver", "Low"],
        [69, "Paperwright", "Low"],
        [70, "Mortician", "Low"],
        [71, "Bard", "Low"],
        [72, "Barbarian", "Low"],
        [73, "Sorcerer", "Situational"],
        [74, "General", "Low"],
        [75, "Grappler", "Low"],
        [76, "Devout", "Low"],
        [77, "Preacher", "Low"],
        [78, "Jeweler", "Low"],
        [79, "Engraver", "Low"],
        [80, "Illusionist", "Low"],
        [81, "Necromancer", "Highly situational"],
        [82, "Thief", "Little colony value"],
        [83, "Pirate", "Little colony value"],
        [84, "Knave", "Little colony value"],
        [85, "Gambler", "Little colony value"],
        [86, "Lord", "Prestige rather than production"],
        [87, "Baron", "Prestige rather than production"],
        [88, "Count", "Prestige rather than production"],
        [89, "Duke", "Prestige rather than production"]
    ];

    function slugify(name) {
        return String(name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
    }

    const PROFESSIONS = Object.freeze(
        RAW_PROFESSIONS.map(([rank, name, tier]) => Object.freeze({
            rank,
            name,
            id: slugify(name),
            tier
        }))
    );

    const BY_RANK = new Map(PROFESSIONS.map(p => [p.rank, p]));
    const BY_ID = new Map(PROFESSIONS.map(p => [p.id, p]));

    /**
     * Compute exponential decay rate lambda for population P in [1, 200].
     * P=1..8: steep decay (~0.095), Critical dominates heavily.
     * P=200: lenient decay (~0.012), wider tail across all professions.
     */
    function decayRate(population) {
        const p = Math.max(1, Math.min(200, population || 8));
        const t = (p - 1) / 199; // 0.0 at p=1, 1.0 at p=200
        return 0.095 * (1 - t) + 0.012 * t;
    }

    /**
     * Raw weights for all 89 professions at a given population.
     */
    function getWeights(population) {
        const lambda = decayRate(population);
        return PROFESSIONS.map(p => Math.exp(-lambda * (p.rank - 1)));
    }

    /**
     * Sample `count` distinct callings without replacement for a given population.
     */
    function sampleCallings(population, count = 3, rng = Math.random) {
        const weights = getWeights(population);
        const available = PROFESSIONS.map((prof, i) => ({ prof, weight: weights[i] }));
        const chosen = [];
        const n = Math.min(count, available.length);

        for (let c = 0; c < n; c++) {
            let totalWeight = 0;
            for (let i = 0; i < available.length; i++) totalWeight += available[i].weight;
            if (totalWeight <= 0) {
                chosen.push(available.shift().prof);
                continue;
            }
            let roll = rng() * totalWeight;
            let chosenIdx = 0;
            for (let i = 0; i < available.length; i++) {
                roll -= available[i].weight;
                if (roll <= 0) {
                    chosenIdx = i;
                    break;
                }
            }
            chosen.push(available[chosenIdx].prof);
            available.splice(chosenIdx, 1); // Sample without replacement
        }
        return chosen;
    }

    /**
     * Get live faction population from UF.World state.
     */
    function factionPopulation(factionId, state) {
        const rootUF = typeof window !== "undefined" ? window.UF : (typeof globalThis !== "undefined" ? globalThis.UF : null);
        const W = rootUF && rootUF.World;
        const st = state || (W && W.state);
        if (!st) return 8;
        if (st.units) {
            const list = Array.isArray(st.units) ? st.units : Object.values(st.units);
            const live = list.filter(u => u && !u.isDead && u.data && u.data.faction === factionId);
            if (live.length > 0) return live.length;
        }
        if (st.factions && Array.isArray(st.factions.list)) {
            const f = st.factions.list.find(x => x && x.id === factionId);
            if (f && typeof f.settled === "number" && f.settled > 0) return f.settled;
            if (f && typeof f.population === "number" && f.population > 0) return f.population;
        }
        return 8;
    }

    /**
     * Assign 3 callings to a unit if not already assigned.
     */
    function assignCallings(unit, population, rng) {
        if (!unit || !unit.data) return [];
        if (Array.isArray(unit.data.callings) && unit.data.callings.length >= 3) {
            if (!unit.data.calling) unit.data.calling = unit.data.callings[0];
            return unit.data.callings;
        }
        const pop = typeof population === "number" && population > 0
            ? population
            : factionPopulation(unit.data.faction);
        const callings = sampleCallings(pop, 3, rng || Math.random);
        unit.data.callings = callings;
        unit.data.calling = callings[0];
        return callings;
    }

    function callingIdOf(u) {
        if (!u) return "";
        const c = u.calling || (u.data && (u.data.calling || (u.data.callings && u.data.callings[0])));
        if (!c) return "";
        return typeof c === "string" ? c.toLowerCase() : (c.id || slugify(c.name) || "").toLowerCase();
    }

    function isLeader(u) {
        if (u && ((u.leader || (u.data && (u.data.rank === 1 || u.data.leader))) && !u.dead)) return true;
        const id = callingIdOf(u);
        return id === "mayor" || id === "leader" || id === "chief" || id === "speaker" || id === "reeve" || id === "warden" || id === "captain";
    }

    function isBuilder(u) {
        const id = callingIdOf(u);
        return id === "carpenter" || id === "mason" || id === "construction_worker";
    }

    function isWoodcutter(u) {
        const id = callingIdOf(u);
        return id === "lumberjack";
    }

    function isMiner(u) {
        const id = callingIdOf(u);
        return id === "miner" || id === "stonecutter";
    }

    function isHauler(u) {
        const id = callingIdOf(u);
        return id === "laborer" || id === "waste_collector" || id === "cleaner";
    }

    function isCook(u) {
        const id = callingIdOf(u);
        return id === "chef" || id === "cook" || id === "butcher";
    }

    function isForager(u) {
        const id = callingIdOf(u);
        return id === "herbalist" || id === "farmer" || id === "farmhand" || id === "hunter" || id === "trapper" || id === "forager";
    }

    function isCrafter(u) {
        const id = callingIdOf(u);
        return id === "blacksmith" || id === "tanner" || id === "leatherworker" || id === "fletcher" || id === "potter" || id === "weaver" || id === "crafter";
    }

    function assignFounderQuotas(unitsOrPlan, rng = Math.random) {
        if (!Array.isArray(unitsOrPlan) || unitsOrPlan.length === 0) return;
        const leaderIdx = unitsOrPlan.findIndex(p => p && (p.leader || (p.data && (p.data.leader || p.data.rank === 1))));
        const nonLeaders = unitsOrPlan.map((p, i) => i).filter(i => i !== leaderIdx);

        function makeCallings(primaryId) {
            const primary = BY_ID.get(primaryId) || PROFESSIONS.find(x => x.id === primaryId) || PROFESSIONS[0];
            const pool = sampleCallings(8, 8, rng);
            const secondaries = [];
            for (const c of pool) {
                if (c && c.id !== primary.id && !secondaries.some(s => s.id === c.id)) {
                    secondaries.push(c);
                    if (secondaries.length >= 2) break;
                }
            }
            for (const c of PROFESSIONS) {
                if (secondaries.length >= 2) break;
                if (c.id !== primary.id && !secondaries.some(s => s.id === c.id)) {
                    secondaries.push(c);
                }
            }
            return [primary, secondaries[0], secondaries[1]];
        }

        const leadObj = leaderIdx >= 0 ? unitsOrPlan[leaderIdx] : unitsOrPlan[0];
        const leadCallings = makeCallings("mayor");
        const leadCalling = leadCallings[0];
        if (leadObj.data) {
            leadObj.data.calling = leadCalling;
            leadObj.data.callings = leadCallings;
        }
        leadObj.calling = leadCalling;
        leadObj.callings = leadCallings;

        const otherRoles = [
            "carpenter",
            "lumberjack",
            "miner",
            "laborer",
            "chef",
            "herbalist",
            "blacksmith"
        ];

        const remainingIndices = leaderIdx >= 0 ? nonLeaders : unitsOrPlan.slice(1).map((_, i) => i + 1);
        for (let i = 0; i < remainingIndices.length; i++) {
            const idx = remainingIndices[i];
            const p = unitsOrPlan[idx];
            if (!p) continue;
            const primaryId = otherRoles[i % otherRoles.length];
            const callings = makeCallings(primaryId);
            const primaryCalling = callings[0];
            if (p.data) {
                p.data.calling = primaryCalling;
                p.data.callings = callings;
            }
            p.calling = primaryCalling;
            p.callings = callings;
        }
    }

    const UF_Callings = {
        PROFESSIONS,
        BY_RANK,
        BY_ID,
        decayRate,
        getWeights,
        sampleCallings,
        factionPopulation,
        assignCallings,
        assignFounderQuotas,
        callingByRank: rank => BY_RANK.get(rank) || null,
        callingById: id => BY_ID.get(id) || null,
        callingIdOf,
        isLeader,
        isBuilder,
        isWoodcutter,
        isMiner,
        isHauler,
        isCook,
        isForager,
        isCrafter
    };

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};
    root.UF.Callings = UF_Callings;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = UF_Callings;
    }
})();
