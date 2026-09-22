//=============================================================================
// DEUS_Sanitation.js - Waste, Sanitation, Latrines, and Contamination Prevention
//
// Manages colonist bodily waste needs, latrine and outhouse infrastructure,
// night soil waste collection and hauling, water contamination hazards,
// foul stench morale impacts, and filth-borne sickness (dysentery).
//=============================================================================

(() => {
    "use strict";

    const World = () => (window.UF && UF.World) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const catalog = () => window.$ufWorldCatalog || null;
    const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    const levelArea = r => { const a = r && (r.area || r); return a ? { x: a.x, y: a.y, z: zOf(r) } : null; };
    const copyArea = a => ({ x: a.x, y: a.y });
    const chebyshev = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

    // In-memory catalog injection for sanitation objects & items
    function ensureCatalog() {
        const cat = catalog();
        if (!cat) return;

        // 1. Objects
        cat.objects = cat.objects || [];
        if (!cat.objects.some(o => o.id === "latrine_pit")) {
            cat.objects.push({
                id: "latrine_pit",
                name: "Pit Latrine",
                tags: ["building", "sanitation", "latrine"],
                passable: false,
                image: "!$UF_Latrine_Pit",
                build: { items: { wood: 2 }, work: 30 },
                capacity: 10
            });
        }
        if (!cat.objects.some(o => o.id === "outhouse")) {
            cat.objects.push({
                id: "outhouse",
                name: "Outhouse",
                tags: ["building", "sanitation", "outhouse"],
                passable: false,
                image: "!$UF_Outhouse",
                build: { items: { wood: 4 }, work: 60 },
                capacity: 25
            });
        }

        // 2. Items
        cat.items = cat.items || {};
        cat.items.types = cat.items.types || [];
        if (!cat.items.types.some(t => t.id === "night_soil")) {
            cat.items.types.push({
                id: "night_soil",
                name: "Night Soil",
                tags: ["waste", "organic"],
                image: "!$UF_Item_Night_Soil"
            });
        }
    }

    ensureCatalog();

    function colonyRef(ref) {
        if (ref && ref.plan && ref.siteId !== undefined) return ref;
        const C = Colonists();
        return C && C.state ? C.state(ref) : null;
    }

    /**
     * Latrine state tracking on the world object or internal map
     */
    const latrineStateMap = new Map(); // key `${z}:${x},${y}` -> { uses, capacity, full }

    function latrineKey(area, x, y) {
        return `${zOf(area)}:${x},${y}`;
    }

    function getLatrineData(area, x, y, typeId) {
        const key = latrineKey(area, x, y);
        let data = latrineStateMap.get(key);
        if (!data) {
            const cap = typeId === "outhouse" ? 25 : 10;
            data = { uses: 0, capacity: cap, full: false };
            latrineStateMap.set(key, data);
        }
        return data;
    }

    /**
     * Finds usable latrines/outhouses near the colonist
     */
    function findAvailableLatrine(u, radius = 40) {
        const O = Objects(), c = colonyRef(u);
        if (!O || !c) return null;
        const latrines = O.findIn(levelArea(c), { near: { x: u.x, y: u.y }, radius })
            .filter(o => o.id === "latrine_pit" || o.id === "outhouse");

        for (const lat of latrines) {
            const data = getLatrineData(levelArea(c), lat.x, lat.y, lat.id);
            if (!data.full) {
                return { object: lat, data };
            }
        }
        return null;
    }

    /**
     * Relieve job: walk to latrine, reset waste need, increment uses.
     */
    function relieveJob(u) {
        const C = Colonists(), c = colonyRef(u);
        if (!C || !c || !u || !u.data) return null;
        const n = u.data.needs || {};
        if (n.waste < 55) return null;

        const found = findAvailableLatrine(u);
        if (found) {
            return {
                type: "move",
                target: { x: found.object.x, y: found.object.y },
                params: {
                    relieve: true,
                    latrineX: found.object.x,
                    latrineY: found.object.y,
                    latrineId: found.object.id
                }
            };
        }

        // If no latrine exists and waste is desperate (> 85), find a private secluded spot away from camp center
        if (n.waste >= 85) {
            const dx = Math.sign(u.x - c.site.x) || 1;
            const dy = Math.sign(u.y - c.site.y) || 1;
            const target = { x: u.x + dx * 3, y: u.y + dy * 3 };
            return {
                type: "move",
                target,
                params: {
                    relieveOpen: true,
                    desperate: true
                }
            };
        }

        return null;
    }

    /**
     * Called when a relieve job completes
     */
    function onRelieved(u, params) {
        if (!u || !u.data) return;
        const C = Colonists(), I = Items(), c = colonyRef(u);
        const n = u.data.needs || (u.data.needs = {});
        n.waste = 0;

        if (params && params.relieve) {
            const area = levelArea(c || u);
            const data = getLatrineData(area, params.latrineX, params.latrineY, params.latrineId);
            data.uses++;
            if (data.uses >= data.capacity) {
                data.full = true;
                // Drop night soil adjacent to latrine for sanitation worker collection
                if (I && I.drop) {
                    I.drop(area, params.latrineX, params.latrineY, "night_soil", 1);
                }
            }
            if (C && C.addThought) C.addThought(u, "Relieved myself in a proper latrine.", 4);
        } else if (params && params.relieveOpen) {
            // Unsanitary accident / outdoor relief
            const area = levelArea(c || u);
            if (I && I.drop) {
                I.drop(area, u.x, u.y, "night_soil", 1);
            }
            if (C && C.addThought) {
                if (params.desperate) {
                    C.addThought(u, "Had an unsanitary accident in the dirt.", -8);
                } else {
                    C.addThought(u, "Relieved myself in the bushes without privacy.", -3);
                }
            }
        }
    }

    /**
     * Checks if water at (x, y) is contaminated by nearby waste (< 6 cells).
     */
    function isWaterContaminated(area, x, y) {
        const I = Items(), O = Objects(), c = colonyRef(area);
        if (!I) return false;

        // Check night soil items within 6 cells
        const items = I.find({ area: levelArea(area), z: zOf(area), near: { x, y }, radius: 6, id: "night_soil" });
        if (items.length > 0) return true;

        // Check full/unemptied latrines within 6 cells
        if (O) {
            const latrines = O.findIn(levelArea(area), { near: { x, y }, radius: 6 })
                .filter(o => o.id === "latrine_pit" || o.id === "outhouse");
            for (const lat of latrines) {
                const data = getLatrineData(levelArea(area), lat.x, lat.y, lat.id);
                if (data.full) return true;
            }
        }

        // Check waste pits placed within 6 cells
        if (c && c.stockpiles) {
            for (const s of c.stockpiles) {
                if (s.stores && s.stores.includes("waste")) {
                    if (Math.hypot(s.x - x, s.y - y) < 6) return true;
                }
            }
        }

        return false;
    }

    /**
     * Checks if uncollected waste is causing a foul stench near (x, y) (< 4 cells).
     */
    function stenchNear(area, x, y) {
        const I = Items();
        if (!I) return false;
        const waste = I.find({ area: levelArea(area), z: zOf(area), near: { x, y }, radius: 4, id: "night_soil" });
        return waste.length > 0;
    }

    /**
     * Sanitation worker waste collection and hauling job
     */
    function cleanWasteJob(u) {
        if (!u || !u.data) return null;
        const caps = u.data.capabilities || [];
        if (!caps.includes("sanitation") && !caps.includes("hauling")) return null;

        const I = Items(), c = colonyRef(u);
        if (!I || !c) return null;

        // Find designated waste pit stockpile
        const wastePits = (c.stockpiles || []).filter(s => s.stores && s.stores.includes("waste"));
        if (!wastePits.length) return null;

        // Choose safest/farthest waste pit
        const dest = wastePits[0];

        // Find uncollected night soil lying near living quarters
        const items = I.find({ area: levelArea(c), z: zOf(c), near: c.site, radius: (c.radius || 8) + 6, id: "night_soil" });
        const uncontained = items.filter(it => {
            const itemObj = it.item || it;
            const atPit = wastePits.some(p => p.x === it.x && p.y === it.y);
            return !atPit;
        });

        if (uncontained.length > 0) {
            const targetItem = uncontained[0];
            const itemObj = targetItem.item || targetItem;
            return {
                type: "haul",
                target: { x: targetItem.x, y: targetItem.y },
                params: {
                    itemId: itemObj.id,
                    to: { x: dest.x, y: dest.y },
                    sanitation: true
                }
            };
        }

        return null;
    }

    /**
     * Sickness and Contagion Mechanics
     */
    function infect(u, illness = "dysentery") {
        if (!u || !u.data) return;
        const C = Colonists();
        u.data.illness = {
            type: illness,
            contractedTick: (window.UF && UF.Time && UF.Time.ticks ? UF.Time.ticks() : 0),
            severity: 1.0
        };
        if (C && C.addThought) {
            C.addThought(u, "Felt violently ill with stomach cramps and fever.", -12);
        }
    }

    function cure(u) {
        if (!u || !u.data || !u.data.illness) return;
        const C = Colonists();
        delete u.data.illness;
        if (C && C.addThought) {
            C.addThought(u, "Recovered from sickness with careful medicine.", 8);
        }
    }

    function isSick(u) {
        return !!(u && u.data && u.data.illness);
    }

    /**
     * Medical treatment job by apothecary / healer
     */
    function treatSickJob(healer) {
        if (!healer || !healer.data) return null;
        const caps = healer.data.capabilities || [];
        if (!caps.includes("medicine") && healer.data.calling?.id !== "apothecary") return null;

        const W = World(), c = colonyRef(healer);
        if (!W || !c) return null;

        const sickUnit = W.units().find(u => u.data && u.data.site === c.siteId && u.data.illness);
        if (!sickUnit) return null;

        return {
            type: "move",
            target: { x: sickUnit.x, y: sickUnit.y },
            params: {
                treat: true,
                patientId: sickUnit.id
            }
        };
    }

    /**
     * Evaluates settlement sanitation pillar comprehensively
     */
    function evaluateSanitation(ref) {
        const c = colonyRef(ref);
        if (!c) return { score: 1.0, status: "secure", detail: "No colony" };

        const O = Objects(), I = Items(), W = World();
        const sitePos = c.site || { x: 128, y: 128 };
        const radius = c.radius || 8;
        const units = W ? W.units().filter(u => u.data && u.data.site === c.siteId && !u.data.dead) : [];

        // 1. Latrines
        const latrines = O ? O.findIn(levelArea(c), { near: sitePos, radius: radius + 6 })
            .filter(o => o.id === "latrine_pit" || o.id === "outhouse") : [];
        let totalCapacity = 0;
        let fullLatrines = 0;
        for (const lat of latrines) {
            const data = getLatrineData(levelArea(c), lat.x, lat.y, lat.id);
            totalCapacity += data.capacity;
            if (data.full) fullLatrines++;
        }

        const latrineRatio = latrines.length === 0 ? 0.0 : (units.length > 0 ? (latrines.length / Math.ceil(units.length / 4)) : 1.0);
        const cleanlinessRatio = latrines.length > 0 ? ((latrines.length - fullLatrines) / latrines.length) : 0.0;

        // 2. Waste separation
        const stockpiles = (c.stockpiles || []);
        const wastePits = stockpiles.filter(s => s.stores && s.stores.includes("waste"));
        let safeSeparation = wastePits.length > 0;
        for (const wp of wastePits) {
            if (Math.hypot(wp.x - sitePos.x, wp.y - sitePos.y) < 5) safeSeparation = false;
        }

        // 3. Uncollected waste near living area
        const looseWaste = I ? I.find({ area: levelArea(c), z: zOf(c), near: sitePos, radius: radius + 2, id: "night_soil" }) : [];

        // 4. Contagion / Illness count
        const sickCount = units.filter(u => u.data && u.data.illness).length;

        // Calculate aggregate score
        let score = (Math.min(1.0, latrineRatio) * 0.35) +
                    (cleanlinessRatio * 0.25) +
                    (safeSeparation ? 0.25 : wastePits.length > 0 ? 0.1 : 0.0) +
                    (looseWaste.length === 0 ? 0.15 : 0.0);

        if (sickCount > 0) score = Math.max(0.1, score - sickCount * 0.2);

        let status = "secure";
        if (score < 0.4) status = "critical";
        else if (score < 0.8) status = "needs_attention";

        return {
            id: "sanitation",
            name: "Sanitation",
            score: Math.min(1.0, Math.max(0.0, score)),
            status,
            detail: `${latrines.length} latrine(s) (${fullLatrines} full), ${wastePits.length} waste pit(s), ${looseWaste.length} uncollected filth, ${sickCount} sick`
        };
    }

    // Export API
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Sanitation = {
        ensureCatalog,
        relieveJob,
        onRelieved,
        isWaterContaminated,
        stenchNear,
        cleanWasteJob,
        infect,
        cure,
        isSick,
        treatSickJob,
        evaluateSanitation,
        getLatrineData,
        latrineStateMap
    };
})();
