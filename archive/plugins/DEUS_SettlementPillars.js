//=============================================================================
// DEUS_SettlementPillars.js - The 10 Core Settlement Pillars & Colony Progression AI
//
// The foundational settlement model:
//   Water -> Food -> Shelter -> Sanitation -> Workshop -> Medicine -> Storage -> Security -> Governance -> Community
//
// Evaluates settlement infrastructure, reserves, health, defense, and social
// cohesion, directing collective AI planning, shelter completion, and
// overlapping skill coverage across the settlement.
//=============================================================================

(() => {
    "use strict";

    const PILLARS = Object.freeze([
        "water",
        "food",
        "shelter",
        "sanitation",
        "workshop",
        "medicine",
        "storage",
        "security",
        "governance",
        "community"
    ]);

    const PILLAR_LABELS = Object.freeze({
        water: "Water",
        food: "Food",
        shelter: "Shelter",
        sanitation: "Sanitation",
        workshop: "Workshop",
        medicine: "Medicine",
        storage: "Storage",
        security: "Security",
        governance: "Governance",
        community: "Community"
    });

    const CAPABILITIES = Object.freeze([
        "farming",
        "medicine",
        "carpentry",
        "smithing",
        "masonry",
        "cooking",
        "hunting",
        "textiles",
        "security",
        "sanitation"
    ]);

    const World = () => (window.UF && UF.World) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const Households = () => (window.UF && UF.Households) || null;
    const catalog = () => window.$ufWorldCatalog || null;
    const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    const levelArea = r => { const a = r && (r.area || r); return a ? { x: a.x, y: a.y, z: zOf(r) } : null; };
    const copyArea = a => ({ x: a.x, y: a.y });
    const hourNow = () => (window.$ufTime ? $ufTime.hour : (window.UF && UF.Time && UF.Time.hour ? UF.Time.hour() : 8));
    const isMealHour = () => [8, 12, 18].includes(hourNow());
    const isNightHour = () => { const h = hourNow(); return h >= 22 || h <= 5; };

    function colonyRef(ref) {
        if (ref && ref.plan && ref.siteId !== undefined) return ref;
        const C = Colonists();
        return C && C.state ? C.state(ref) : null;
    }

    function siteUnits(c) {
        const W = World();
        if (!W || !c) return [];
        return W.units().filter(u => u.data && (u.data.kind === "colonist" || u.data.kind === "person") &&
            u.data.site === c.siteId && zOf(u) === zOf(c));
    }

    /**
     * Evaluates the 10 settlement pillars for a given settlement record.
     * Returns an object mapping each pillar ID to { id, name, score: 0..1, status, detail }.
     */
    function evaluatePillars(ref) {
        const c = colonyRef(ref);
        const res = {};
        for (const p of PILLARS) res[p] = { id: p, name: PILLAR_LABELS[p], score: 1.0, status: "secure", detail: "" };
        if (!c) return res;

        const O = Objects(), J = Jobs(), I = Items(), H = Households(), W = World();
        const units = siteUnits(c);
        const adults = units.filter(u => !u.data || u.data.age === undefined || u.data.age >= 15);
        const sitePos = c.site || { x: 128, y: 128 };
        const radius = c.radius || 8;

        // 1. WATER: Natural water within 15 cells or constructed well
        let naturalWaterDist = Infinity;
        if (J && J.isWaterAt) {
            for (let r = 1; r <= 30; r++) {
                for (let dx = -r; dx <= r; dx++) {
                    for (let dy = -r; dy <= r; dy++) {
                        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                        if (J.isWaterAt(levelArea(c), sitePos.x + dx, sitePos.y + dy)) {
                            naturalWaterDist = Math.hypot(dx, dy);
                            break;
                        }
                    }
                    if (naturalWaterDist < Infinity) break;
                }
                if (naturalWaterDist < Infinity) break;
            }
        }
        const wells = O ? O.findIn(levelArea(c), { near: sitePos, radius: radius + 4, id: "well" }) : [];
        if (wells.length > 0) {
            res.water = { id: "water", name: "Water", score: 1.0, status: "secure", detail: `Well built at (${wells[0].x},${wells[0].y})` };
        } else if (naturalWaterDist <= 15) {
            res.water = { id: "water", name: "Water", score: 1.0, status: "secure", detail: `Natural water ${naturalWaterDist.toFixed(1)} cells away` };
        } else if (naturalWaterDist <= 30) {
            res.water = { id: "water", name: "Water", score: 0.6, status: "distant", detail: `Water distant (${naturalWaterDist.toFixed(1)} cells); well needed` };
        } else {
            res.water = { id: "water", name: "Water", score: 0.2, status: "critical", detail: "No natural water near; well required immediately" };
        }

        // 2. FOOD: Reserves in larder, farm plots, cooked preservation
        let storedFood = 0;
        let cookedCount = 0;
        let rawMeatCount = 0;
        if (I) {
            const items = I.find({ area: levelArea(c), z: zOf(c), near: sitePos, radius: radius + 4 });
            for (const f of items) {
                const it = f.item || f;
                if (!it) continue;
                if (it.type === "meat_cooked" || it.type === "berries" || it.type === "bread") {
                    storedFood += it.count;
                    cookedCount += it.count;
                } else if (it.type === "meat_raw" || it.type === "fish_raw") {
                    storedFood += it.count;
                    rawMeatCount += it.count;
                }
            }
        }
        const farmPlots = O ? O.findIn(levelArea(c), { near: sitePos, radius: radius + 6, id: "farm_plot" }) : [];
        const foodScore = Math.min(1.0, (storedFood / 12) * 0.7 + (farmPlots.length > 0 ? 0.3 : 0));
        res.food = {
            id: "food", name: "Food", score: foodScore,
            status: foodScore >= 0.8 ? "secure" : foodScore >= 0.4 ? "adequate" : "low",
            detail: `${storedFood} food stored (${cookedCount} cooked, ${rawMeatCount} raw), ${farmPlots.length} farm plots`
        };

        // 3. SHELTER: Weatherproof homes (walls, doors, floors, beds, hearth)
        let totalWanted = 0, totalBuilt = 0;
        const allHouseholds = H && H.all ? H.all().filter(h => h.faction === c.factionId && zOf(h) === zOf(c)) : [];
        for (const h of allHouseholds) {
            const home = h.home;
            if (!home) continue;
            const walls = home.walls || [];
            const doors = home.doors || [];
            const beds = home.beds || [];
            const floors = home.floors || [];
            totalWanted += walls.length + doors.length + beds.length + (floors.length ? 1 : 0) + 1; // +1 hearth
            for (const w of walls) { const obj = O && O.atIn(levelArea(c), w.x, w.y); if (obj && obj.id === home.wall) totalBuilt++; }
            for (const d of doors) { const obj = O && O.atIn(levelArea(c), d.x, d.y); if (obj && obj.id === home.door) totalBuilt++; }
            for (const b of beds) { const obj = O && O.atIn(levelArea(c), b.x, b.y); if (obj && (obj.id === "floor_straw" || obj.id === "bed_wood")) totalBuilt++; }
            if (home.hearth) { const obj = O && O.atIn(levelArea(c), home.hearth.x, home.hearth.y); if (obj && (obj.id === "campfire" || obj.id === "kitchen_hearth")) totalBuilt++; }
            if (floors.length) {
                let fBuilt = 0;
                const F = window.UF && UF.Floors;
                for (const fl of floors) {
                    const kind = F && F.kindAt ? F.kindAt(levelArea(c), fl.x, fl.y) : null;
                    if (kind) fBuilt++;
                }
                if (fBuilt >= floors.length * 0.5) totalBuilt++;
            }
        }
        const shelterScore = totalWanted > 0 ? Math.min(1.0, totalBuilt / totalWanted) : 0.5;
        res.shelter = {
            id: "shelter", name: "Shelter", score: shelterScore,
            status: shelterScore >= 0.95 ? "secure" : `${Math.round(shelterScore * 100)}% complete`,
            detail: `${totalBuilt}/${totalWanted} shelter components built across ${allHouseholds.length} households`
        };

        // 4. SANITATION: Waste pit separated from clean water & hearths + Latrines
        const stockpiles = (c.stockpiles || []).concat(O ? O.findIn(levelArea(c), { near: sitePos, radius: radius + 4, id: "stockpile" }) : []);
        const S = window.UF && UF.Sanitation;
        if (S && S.evaluateSanitation) {
            res.sanitation = S.evaluateSanitation(c);
        } else {
            const wastePits = stockpiles.filter(s => s.stores && s.stores.includes("waste"));
            let safeDistance = true;
            for (const wp of wastePits) {
                const dWater = Math.hypot(wp.x - sitePos.x, wp.y - sitePos.y);
                if (dWater < 5) safeDistance = false;
            }
            if (wastePits.length > 0 && safeDistance) {
                res.sanitation = { id: "sanitation", name: "Sanitation", score: 1.0, status: "secure", detail: `${wastePits.length} waste pit(s) safely separated from water` };
            } else if (wastePits.length > 0) {
                res.sanitation = { id: "sanitation", name: "Sanitation", score: 0.6, status: "poor_placement", detail: "Waste pit too close to living area / water" };
            } else {
                res.sanitation = { id: "sanitation", name: "Sanitation", score: 0.3, status: "no_waste_pit", detail: "No refuse dump designated; waste uncontained" };
            }
        }

        // 5. WORKSHOP: Essential crafts and energy/fuel
        const workbenches = O ? O.findIn(levelArea(c), { near: sitePos, radius: radius + 4, id: "workbench" }) : [];
        const smithies = O ? O.findIn(levelArea(c), { near: sitePos, radius: radius + 4, id: "smithy" }) : [];
        const furnaces = O ? O.findIn(levelArea(c), { near: sitePos, radius: radius + 4, id: "furnace" }) : [];
        let firewoodCount = 0;
        if (I) {
            const items = I.find({ area: levelArea(c), z: zOf(c), near: sitePos, radius: radius + 4, id: "split_firewood" });
            firewoodCount = items.reduce((sum, it) => sum + (it.item ? it.item.count : 0), 0);
        }
        const workshopScore = Math.min(1.0, (workbenches.length ? 0.4 : 0) + (smithies.length || furnaces.length ? 0.3 : 0) + (firewoodCount >= 4 ? 0.3 : firewoodCount > 0 ? 0.15 : 0));
        res.workshop = {
            id: "workshop", name: "Workshop", score: workshopScore,
            status: workshopScore >= 0.8 ? "secure" : "developing",
            detail: `${workbenches.length} workbenches, ${smithies.length} smithies, ${firewoodCount} firewood fuel stored`
        };

        // 6. MEDICINE: Medical practitioner and apothecary bench
        const apothecaries = O ? O.findIn(levelArea(c), { near: sitePos, radius: radius + 4, id: "apothecary_bench" }) : [];
        const hasHealer = units.some(u => u.data && (u.data.calling?.id === "apothecary" || (u.data.capabilities && u.data.capabilities.includes("medicine"))));
        const medScore = (hasHealer ? 0.6 : 0.2) + (apothecaries.length ? 0.4 : 0);
        res.medicine = {
            id: "medicine", name: "Medicine", score: medScore,
            status: medScore >= 0.8 ? "secure" : "lacking",
            detail: `${hasHealer ? "Practitioner present" : "No dedicated healer"}, ${apothecaries.length} apothecary bench(es)`
        };

        // 7. STORAGE: Categorized stockpiles (food, wood, stone, arms)
        const hasLarder = stockpiles.some(s => s.stores && s.stores.includes("food"));
        const hasWood = stockpiles.some(s => s.stores && s.stores.includes("wood"));
        const hasStone = stockpiles.some(s => s.stores && s.stores.includes("stone"));
        const storageScore = ((hasLarder ? 1 : 0) + (hasWood ? 1 : 0) + (hasStone ? 1 : 0)) / 3;
        res.storage = {
            id: "storage", name: "Storage", score: storageScore,
            status: storageScore >= 0.9 ? "secure" : "partial",
            detail: `Larder: ${hasLarder ? "YES" : "NO"} · Wood: ${hasWood ? "YES" : "NO"} · Stone: ${hasStone ? "YES" : "NO"}`
        };

        // 8. SECURITY: Equipped guards, fire safety, sentry coverage
        const armed = adults.filter(u => u.data && u.data.equipment && u.data.equipment.tool);
        const armRatio = adults.length > 0 ? armed.length / adults.length : 1;
        const fireSafe = window.UF && UF.FireSafety && UF.FireSafety.safe ? UF.FireSafety.safe() : true;
        const secScore = Math.min(1.0, armRatio * 0.5 + (fireSafe ? 0.5 : 0.2));
        res.security = {
            id: "security", name: "Security", score: secScore,
            status: secScore >= 0.8 ? "secure" : "vulnerable",
            detail: `${armed.length}/${adults.length} adults armed, fire safety: ${fireSafe ? "vigilant" : "warning"}`
        };

        // 9. GOVERNANCE: Social hierarchy home scaling and overlapping skill coverage
        const hasLeadership = allHouseholds.some(h => h.home && h.home.design && (h.home.design.includes("manor") || h.home.design.includes("estate")));
        const allCovered = units.every(u => u.data && u.data.capabilities && u.data.capabilities.length >= 2);
        const govScore = (hasLeadership ? 0.5 : 0.3) + (allCovered ? 0.5 : 0.3);
        res.governance = {
            id: "governance", name: "Governance", score: govScore,
            status: govScore >= 0.8 ? "secure" : "basic",
            detail: `${hasLeadership ? "Hierarchy dwellings active" : "Camp stage"}, redundant skill allocation: ${allCovered ? "100%" : "partial"}`
        };

        // 10. COMMUNITY: Children, communal meals, population morale
        const children = units.filter(u => u.data && (u.data.stage === "child" || (u.data.age !== undefined && u.data.age < 15)));
        const avgMood = units.reduce((sum, u) => sum + (u.data && u.data.moodScore !== undefined ? u.data.moodScore : 20), 0) / Math.max(1, units.length);
        const comScore = Math.min(1.0, (children.length > 0 ? 0.5 : 0.3) + (avgMood >= 20 ? 0.5 : avgMood >= 0 ? 0.3 : 0.1));
        res.community = {
            id: "community", name: "Community", score: comScore,
            status: comScore >= 0.8 ? "thriving" : "developing",
            detail: `${children.length} child(ren), average colonist morale score ${Math.round(avgMood)}`
        };

        return res;
    }

    /**
     * Determines the highest priority deficient pillar according to the sequence:
     * Water -> Food -> Shelter -> Sanitation -> Workshop -> Medicine -> Storage -> Security -> Governance -> Community
     */
    function priorityPillar(ref) {
        const evalResults = evaluatePillars(ref);
        for (const p of PILLARS) {
            const stat = evalResults[p];
            if (stat && stat.score < 0.8) return p;
        }
        return "community";
    }

    /**
     * Compact summary string for HUD and cards:
     * "Pillars: W:OK · F:OK · Sh:85% · San:OK · Wk:OK · Med:OK · St:OK · Sec:OK · Gov:OK · Com:OK [Focus: Shelter]"
     */
    function statusSummary(ref) {
        const evalResults = evaluatePillars(ref);
        const priority = priorityPillar(ref);
        const shortCodes = {
            water: "W", food: "F", shelter: "Sh", sanitation: "San", workshop: "Wk",
            medicine: "Med", storage: "St", security: "Sec", governance: "Gov", community: "Com"
        };
        const parts = PILLARS.map(p => {
            const ev = evalResults[p];
            const code = shortCodes[p];
            const val = ev.score >= 0.95 ? "OK" : `${Math.round(ev.score * 100)}%`;
            return `${code}:${val}`;
        });
        return `Pillars: ${parts.join(" · ")} [Focus: ${PILLAR_LABELS[priority]}]`;
    }

    /**
     * Generates concrete civic plan steps addressing deficient pillars.
     */
    function pillarPlanSteps(ref, u) {
        const c = colonyRef(ref);
        if (!c) return [];
        const priority = priorityPillar(c);
        const steps = [];

        // 1. Water deficient: Build civic well
        if (priority === "water") {
            const O = Objects();
            const existingWell = O ? O.findIn(levelArea(c), { near: c.site, radius: (c.radius || 8) + 4, id: "well" }) : [];
            if (!existingWell.length) {
                steps.push({
                    id: "civic_well",
                    build: "well",
                    cells: [[1, 2]],
                    exact: true,
                    pillar: "water"
                });
            }
        }

        // 2. Sanitation deficient: Build civic latrine and safe waste pit
        if (priority === "sanitation") {
            const O = Objects();
            const existingLatrine = O ? O.findIn(levelArea(c), { near: c.site, radius: (c.radius || 8) + 6 })
                .filter(o => o.id === "latrine_pit" || o.id === "outhouse") : [];
            if (!existingLatrine.length) {
                steps.push({
                    id: "civic_latrine",
                    build: "latrine_pit",
                    cells: [[-3, 4]],
                    exact: true,
                    pillar: "sanitation"
                });
            }
            const stockpiles = c.stockpiles || [];
            const hasWastePit = stockpiles.some(s => s.stores && s.stores.includes("waste"));
            if (!hasWastePit) {
                steps.push({
                    id: "sanitation_waste_pit",
                    build: "stockpile",
                    cells: [[-6, -6]],
                    stores: ["waste", "bones", "rubble"],
                    pillar: "sanitation"
                });
            }
        }

        // 3. Medicine deficient: Build apothecary bench
        if (priority === "medicine") {
            const O = Objects();
            const existingBench = O ? O.findIn(levelArea(c), { near: c.site, radius: (c.radius || 8) + 4, id: "apothecary_bench" }) : [];
            if (!existingBench.length) {
                steps.push({
                    id: "civic_apothecary_bench",
                    build: "apothecary_bench",
                    cells: [[-2, -1]],
                    exact: true,
                    pillar: "medicine"
                });
            }
        }

        return steps;
    }

    /**
     * Assigns 2-3 overlapping capabilities to each colonist across the 10 core settlement disciplines.
     */
    function assignSkillRoster(ref) {
        const c = colonyRef(ref);
        if (!c) return;
        const units = siteUnits(c);
        if (!units.length) return;

        units.forEach((u, i) => {
            if (!u.data) return;
            const facets = u.data.facets || {};
            const skills = u.data.skills || {};
            const getF = k => Number.isFinite(facets[k]) ? facets[k] : 50;

            const scores = [
                { cap: "farming", score: getF("natureAffinity") * 1.2 + getF("industriousness") * 0.8 },
                { cap: "medicine", score: getF("curiosity") * 1.1 + getF("sociability") * 1.1 + getF("natureAffinity") * 0.8 },
                { cap: "carpentry", score: getF("curiosity") * 1.0 + getF("industriousness") * 1.0 },
                { cap: "smithing", score: getF("industriousness") * 1.3 + getF("bravery") * 0.7 },
                { cap: "masonry", score: getF("industriousness") * 1.1 + getF("patience") * 0.9 },
                { cap: "cooking", score: getF("sociability") * 1.1 + getF("tidiness") * 1.1 },
                { cap: "hunting", score: getF("bravery") * 1.2 + getF("natureAffinity") * 1.0 },
                { cap: "textiles", score: getF("tidiness") * 1.2 + getF("patience") * 1.0 },
                { cap: "security", score: getF("bravery") * 1.4 + getF("industriousness") * 0.8 },
                { cap: "sanitation", score: getF("tidiness") * 1.3 + getF("industriousness") * 0.9 }
            ];

            // Tie-break with unit ID to distribute evenly across population
            scores.sort((a, b) => b.score - a.score);
            const primary = scores[0].cap;
            const secondary = scores[1].cap;
            const tertiary = scores[(i % (scores.length - 2)) + 2].cap;

            u.data.capabilities = [primary, secondary, tertiary];
        });
    }

    /**
     * Communal meal gathering during meal hours (08:00, 12:00, 18:00).
     */
    function communalMealJob(u) {
        if (!u || !u.data || !isMealHour()) return null;
        const J = Jobs(), C = Colonists(), I = Items(), c = colonyRef(u);
        if (!J || !C || !c) return null;
        const n = u.data.needs || {};
        if (n.hunger < 25) return null; // Rested/full

        const lastMealHour = u.data._lastCommunalMealHour;
        const h = hourNow();
        if (lastMealHour === h) return null; // Already attended this meal

        const isReadyFood = t => t && t.food && (!t.tags || !t.tags.includes("raw"));

        // Check if colonist has food in inventory
        if (I && I.inventoryOf) {
            const inv = I.inventoryOf(u.id);
            const food = inv.find(it => {
                const t = I.type ? I.type(it.type) : null;
                return isReadyFood(t);
            });
            if (food) {
                u.data._lastCommunalMealHour = h;
                if (C.addThought) C.addThought(u, "Shared a hearty communal meal with the colony.", 10);
                return {
                    type: "eat",
                    target: { x: u.x, y: u.y },
                    params: { itemId: food.id, communal: true, siteId: c.siteId }
                };
            }
            // Check for food on ground near site / hearth
            if (I.find) {
                const ground = I.find({ area: levelArea(c), z: zOf(c), near: c.site, radius: (c.radius || 8) + 4 });
                const groundFood = ground.find(it => {
                    const itemObj = it.item || it;
                    const t = I.type ? I.type(itemObj.type) : null;
                    return isReadyFood(t);
                });
                if (groundFood) {
                    const itemObj = groundFood.item || groundFood;
                    u.data._lastCommunalMealHour = h;
                    if (C.addThought) C.addThought(u, "Shared a hearty communal meal with the colony.", 10);
                    return {
                        type: "eat",
                        target: { x: groundFood.x, y: groundFood.y },
                        params: { itemId: itemObj.id, communal: true, siteId: c.siteId }
                    };
                }
            }
        }

        return null;
    }

    /**
     * Night Watch / Sentry patrol during darkness (22:00–06:00).
     */
    function nightWatchJob(u) {
        if (!u || !u.data || !isNightHour()) return null;
        const J = Jobs(), c = colonyRef(u);
        if (!J || !c) return null;
        const caps = u.data.capabilities || [];
        if (!caps.includes("security")) return null;

        const n = u.data.needs || {};
        if (n.sleep >= 85 || n.hunger >= 75 || n.thirst >= 75) return null; // Critical need takes precedence

        // Patrol perimeter offset: rotate around site
        const patrolPoints = [
            { x: c.site.x, y: c.site.y - 4 },
            { x: c.site.x + 4, y: c.site.y },
            { x: c.site.x, y: c.site.y + 4 },
            { x: c.site.x - 4, y: c.site.y }
        ];
        const pt = patrolPoints[Math.floor(Math.random() * patrolPoints.length)];
        return {
            type: "move",
            target: pt,
            params: { sentry: true, siteId: c.siteId }
        };
    }

    // Export API
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.SettlementPillars = {
        PILLARS,
        PILLAR_LABELS,
        CAPABILITIES,
        isMealHour,
        isNightHour,
        hourNow,
        evaluatePillars,
        priorityPillar,
        statusSummary,
        pillarPlanSteps,
        assignSkillRoster,
        communalMealJob,
        nightWatchJob
    };
})();
