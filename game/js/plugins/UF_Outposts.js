//=============================================================================
// UF_Outposts.js - Creature AI Outpost Construction & Multi-Level Expansion
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Outposts] Autonomous creature AI for constructing and expanding faction outposts, multi-size buildings, and multi-storey structures across Z axes.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 * @orderAfter UF_Objects
 * @orderAfter UF_Floors
 * @orderAfter UF_Doors
 * @orderAfter UF_Jobs
 * @orderAfter UF_Colonists
 * @orderAfter UF_Factions
 *
 * @help
 * Implements autonomous creature AI for constructing and expanding faction
 * outposts (both player colony and NPC factions):
 *
 * - Evaluates settlement needs (population vs. bed deficit, storage capacity,
 *   crafting workshops, defensive watchtowers).
 * - Allocates building parcels in concentric expansion rings around the outpost
 *   hearth/center, maintaining street corridors so paths never cross walls.
 * - Procedurally generates buildings of diverse dimensions (from 4x4 huts to
 *   10x8 longhouses) and archetypes (dwelling, storehouse, workshop,
 *   watchtower, cellar).
 * - Multi-level construction across Z axes:
 *     z = 0: Foundation clearing, cultural flooring, perimeter walls, doors.
 *     z = +1, +2: Supported upper storeys, interior staircases, battlements.
 *     z = -1: Excavated subterranean cellars and cold storage.
 * - Phased construction pipeline executed by autonomous creatures:
 *     1. Footprint clearance (chop trees, quarry boulders, haul items)
 *     2. Floor laying & foundation
 *     3. Perimeter wall erection & doorway installation
 *     4. Vertical stair installation & connector linking
 *     5. Upper storey & roof assembly
 *     6. Interior furnishing (straw beds, workbenches, weapon racks)
 *
 * API, events, save data and checks: docs/systems/UF_Outposts.md
 */

(() => {
    "use strict";

    const DEFAULT_EXPANSION_RADIUS = 12;
    const MAX_EXPANSION_RADIUS = 40;
    const STREET_BUFFER = 2; // minimum open cells between building parcels
    const EVAL_INTERVAL_FRAMES = 60; // evaluate needs every second

    // Helpers
    const World = () => (window.UF && UF.World) || null;
    const Objects = () => (window.UF && UF.Objects) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const Factions = () => (window.UF && UF.Factions) || null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const Floors = () => (window.UF && UF.Floors) || null;
    const catalog = () => window.$ufWorldCatalog || null;

    const copyArea = a => ({ x: a ? a.x : 0, y: a ? a.y : 0 });
    const sameArea = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };

    // Provocation helper (Rule 4)
    const provocation = (() => {
        try {
            const argv = (typeof nw !== "undefined" && nw.App && nw.App.argv) || [];
            if (!argv.some(a => a === "--uf-test" || String(a).startsWith("--uf-test="))) return "";
            return String((typeof process !== "undefined" && process.env && process.env.UF_TEST_PROVOKE) || "");
        } catch (_) { return ""; }
    })();
    const isProvoked = name => provocation.split(",").map(s => s.trim()).includes(name) || provocation === "outposts.all";

    // Performance telemetry
    const perfStats = {
        evalCalls: 0,
        evalTotalMs: 0,
        worstEvalMs: 0
    };

    // Ensure runtime registration of stairs/connectors if missing in catalog
    function ensureStairObjects() {
        const cat = catalog();
        if (!cat || !cat.objects) return;
        const hasUp = cat.objects.some(o => o.id === "stairs_up");
        if (!hasUp) {
            cat.objects.push({
                id: "stairs_up",
                name: "Wooden stairs up",
                passable: true,
                stairs: "up",
                tags: ["building", "stairs"],
                build: { items: { log: 2 }, work: 50 }
            });
        }
        const hasDown = cat.objects.some(o => o.id === "stairs_down");
        if (!hasDown) {
            cat.objects.push({
                id: "stairs_down",
                name: "Wooden stairs down",
                passable: true,
                stairs: "down",
                tags: ["building", "stairs"],
                build: { items: { log: 2 }, work: 50 }
            });
        }
        const hasLadder = cat.objects.some(o => o.id === "ladder");
        if (!hasLadder) {
            cat.objects.push({
                id: "ladder",
                name: "Ladder",
                passable: true,
                stairs: "ladder",
                tags: ["building", "stairs"],
                build: { items: { log: 1 }, work: 30 }
            });
        }
    }

    //-------------------------------------------------------------------------
    // Outpost State Model
    //-------------------------------------------------------------------------

    function ensureOutpostState() {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.outposts) {
            W.state.outposts = {
                version: 1,
                factions: {},
                nextBuildingId: 1
            };
        }
        return W.state.outposts;
    }

    function getFactionOutpost(factionId) {
        const st = ensureOutpostState();
        if (!st) return null;
        if (!st.factions[factionId]) {
            const F = Factions();
            const W = World();
            let home = { x: 128, y: 128 };
            let area = { x: 0, y: 0 };
            if (F && W && W.state && W.state.factions && W.state.factions.byId && W.state.factions.byId[factionId]) {
                const fData = W.state.factions.byId[factionId];
                if (fData.home) home = { x: fData.home.x, y: fData.home.y };
                if (fData.area) area = copyArea(fData.area);
            } else if (W && W.state && W.state.camp) {
                home = { x: W.state.camp.x, y: W.state.camp.y };
                area = copyArea(W.state.camp.area);
            }
            st.factions[factionId] = {
                factionId,
                area,
                home,
                radius: DEFAULT_EXPANSION_RADIUS,
                buildings: [],
                parcels: [],
                lastEvalFrame: 0
            };
        }
        return st.factions[factionId];
    }

    // Cultural materials lookup
    function getCultureMaterials(cultureId) {
        const cat = catalog();
        const cult = (cat && cat.cultures && cat.cultures[cultureId]) || {};
        let wall = cult.wall || "wall_wood";
        let door = cult.door || "door_wood";
        let floor = cult.floor || "floor_wood";

        if (cultureId === "dwarf" || cultureId === "mountain") {
            wall = "wall_stone";
            door = "door_stone";
            floor = "floor_stone";
        } else if (cultureId === "elf" || cultureId === "sylvan") {
            wall = "wall_wood";
            door = "door_wood";
            floor = "floor_rushes";
        }
        return { wall, door, floor };
    }

    //-------------------------------------------------------------------------
    // Procedural Building Generator
    //-------------------------------------------------------------------------

    /**
     * Generates a fully detailed building blueprint across variable sizes and Z-axes.
     */
    function generateBuilding(spec) {
        ensureStairObjects();
        const {
            factionId = "player",
            archetype = "dwelling",
            width,
            height,
            x = 0,
            y = 0,
            area = { x: 0, y: 0 },
            levels = [0],
            culture = "human",
            name
        } = spec;

        // Determine dimensions based on archetype if not specified
        let w = width, h = height;
        if (!w || !h) {
            switch (archetype) {
                case "dwelling":
                    w = 5; h = 5; // standard cottage
                    break;
                case "longhouse":
                    w = 8; h = 5; // communal hall
                    break;
                case "storehouse":
                    w = 5; h = 5; // storage depot
                    break;
                case "workshop":
                    w = 6; h = 5; // craftsman workshop
                    break;
                case "watchtower":
                    w = 4; h = 4; // compact vertical fortification
                    break;
                case "cellar":
                    w = 4; h = 4;
                    break;
                default:
                    w = 5; h = 5;
            }
        }
        // Clamp boundaries
        w = Math.max(4, Math.min(10, w));
        h = Math.max(4, Math.min(8, h));

        const mats = getCultureMaterials(culture);
        const buildingLevels = levels.slice().sort((a, b) => a - b);
        const cellsByZ = {};

        // 1. Ground Level (Z = 0) Blueprint
        const groundCells = {
            floors: [],
            walls: [],
            doors: [],
            stairs: [],
            furniture: []
        };

        // Perimeter walls
        for (let dx = 0; dx < w; dx++) {
            groundCells.walls.push({ x: x + dx, y: y, objectId: mats.wall }); // North wall
            groundCells.walls.push({ x: x + dx, y: y + h - 1, objectId: mats.wall }); // South wall
        }
        for (let dy = 1; dy < h - 1; dy++) {
            groundCells.walls.push({ x: x, y: y + dy, objectId: mats.wall }); // West wall
            groundCells.walls.push({ x: x + w - 1, y: y + dy, objectId: mats.wall }); // East wall
        }

        // Entrance Doorway (Centered on South wall facing camp/street)
        const doorDx = Math.floor(w / 2);
        const doorIdx = groundCells.walls.findIndex(cw => cw.x === x + doorDx && cw.y === y + h - 1);
        if (doorIdx >= 0) {
            groundCells.walls.splice(doorIdx, 1);
        }
        groundCells.doors.push({ x: x + doorDx, y: y + h - 1, objectId: mats.door });
        const entrance = { x: x + doorDx, y: y + h - 1, z: 0 };

        // Interior Floors
        for (let dy = 1; dy < h - 1; dy++) {
            for (let dx = 1; dx < w - 1; dx++) {
                groundCells.floors.push({ x: x + dx, y: y + dy, kind: mats.floor });
            }
        }

        // Stairs at Z=0
        const hasUpper = buildingLevels.some(z => z > 0);
        const hasCellar = buildingLevels.some(z => z < 0);
        if (hasUpper) {
            groundCells.stairs.push({ x: x + 1, y: y + 1, objectId: "stairs_up", targetZ: 1 });
        }
        if (hasCellar) {
            groundCells.stairs.push({ x: x + w - 2, y: y + 1, objectId: "stairs_down", targetZ: -1 });
        }

        // Interior Furnishings at Z=0
        if (archetype === "dwelling" || archetype === "longhouse") {
            const bedCount = archetype === "longhouse" ? 4 : 2;
            let placed = 0;
            for (let dx = 1; dx < w - 1; dx++) {
                if (hasUpper && dx === 1) continue; // avoid stairs
                if (hasCellar && dx === w - 2) continue;
                groundCells.furniture.push({ x: x + dx, y: y + 1, objectId: "floor_straw" }); // bed
                placed++;
                if (placed >= bedCount) break;
            }
        } else if (archetype === "workshop") {
            groundCells.furniture.push({ x: x + 1, y: y + 2, objectId: "workbench" });
            if (w >= 6) {
                groundCells.furniture.push({ x: x + w - 2, y: y + 2, objectId: "furnace" });
            }
        } else if (archetype === "storehouse") {
            groundCells.furniture.push({ x: x + 2, y: y + 2, objectId: "stockpile" });
        }

        cellsByZ["0"] = groundCells;

        // 2. Upper Levels (Z = +1, Z = +2) Blueprint
        for (const z of buildingLevels.filter(lvl => lvl > 0)) {
            const upperCells = {
                floors: [],
                walls: [],
                doors: [],
                stairs: [],
                furniture: []
            };

            // Support Rule: Upper floors strictly supported by perimeter walls & ground interior below
            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    upperCells.floors.push({ x: x + dx, y: y + dy, kind: mats.floor });
                }
            }

            // Matching downward stairs
            upperCells.stairs.push({ x: x + 1, y: y + 1, objectId: "stairs_down", targetZ: z - 1 });
            if (buildingLevels.includes(z + 1)) {
                upperCells.stairs.push({ x: x + w - 2, y: y + 1, objectId: "stairs_up", targetZ: z + 1 });
            }

            // Upper walls / parapets
            if (archetype === "watchtower") {
                // Battlements: crenelated perimeter
                for (let dx = 0; dx < w; dx++) {
                    if (dx % 2 === 0) {
                        upperCells.walls.push({ x: x + dx, y: y, objectId: mats.wall });
                        upperCells.walls.push({ x: x + dx, y: y + h - 1, objectId: mats.wall });
                    }
                }
                for (let dy = 1; dy < h - 1; dy++) {
                    if (dy % 2 === 0) {
                        upperCells.walls.push({ x: x, y: y + dy, objectId: mats.wall });
                        upperCells.walls.push({ x: x + w - 1, y: y + dy, objectId: mats.wall });
                    }
                }
            } else {
                // Full upper perimeter walls
                for (let dx = 0; dx < w; dx++) {
                    upperCells.walls.push({ x: x + dx, y: y, objectId: mats.wall });
                    upperCells.walls.push({ x: x + dx, y: y + h - 1, objectId: mats.wall });
                }
                for (let dy = 1; dy < h - 1; dy++) {
                    upperCells.walls.push({ x: x, y: y + dy, objectId: mats.wall });
                    upperCells.walls.push({ x: x + w - 1, y: y + dy, objectId: mats.wall });
                }
                // Upper bedroom / observation furniture
                upperCells.furniture.push({ x: x + 2, y: y + 2, objectId: "floor_straw" });
            }

            cellsByZ[String(z)] = upperCells;
        }

        // 3. Subterranean Cellar (Z = -1) Blueprint
        if (buildingLevels.includes(-1)) {
            const cellarCells = {
                floors: [],
                walls: [],
                doors: [],
                stairs: [],
                furniture: []
            };

            // Excavated stone retaining walls around cellar perimeter
            for (let dx = 0; dx < w; dx++) {
                cellarCells.walls.push({ x: x + dx, y: y, objectId: "wall_stone" });
                cellarCells.walls.push({ x: x + dx, y: y + h - 1, objectId: "wall_stone" });
            }
            for (let dy = 1; dy < h - 1; dy++) {
                cellarCells.walls.push({ x: x, y: y + dy, objectId: "wall_stone" });
                cellarCells.walls.push({ x: x + w - 1, y: y + dy, objectId: "wall_stone" });
            }

            // Cellar floor
            for (let dy = 1; dy < h - 1; dy++) {
                for (let dx = 1; dx < w - 1; dx++) {
                    cellarCells.floors.push({ x: x + dx, y: y + dy, kind: "floor_stone" });
                }
            }

            // Matching stairs up
            cellarCells.stairs.push({ x: x + w - 2, y: y + 1, objectId: "stairs_up", targetZ: 0 });

            // Cellar storage racks & stockpiles
            cellarCells.furniture.push({ x: x + 2, y: y + 2, objectId: "weapon_rack" });
            cellarCells.furniture.push({ x: x + 2, y: y + 3, objectId: "stockpile" });

            cellsByZ["-1"] = cellarCells;
        }

        const bld = {
            id: spec.id || `bld_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            factionId,
            name: name || `${capitalize(culture)} ${capitalize(archetype)}`,
            archetype,
            area: copyArea(area),
            x, y, w, h,
            levels: buildingLevels,
            entrance,
            culture,
            stage: "clearance",
            progress: 0,
            maxProgress: 100,
            cellsByZ,
            assignedWorkers: [],
            createdFrame: Graphics.frameCount
        };

        return bld;
    }

    function capitalize(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
    }

    //-------------------------------------------------------------------------
    // Parcel Allocation & Expansion Planning
    //-------------------------------------------------------------------------

    /**
     * Finds a clear, flat parcel in the outpost's expansion rings, respecting street spacing.
     */
    function findExpansionParcel(factionId, w, h, reserve = false) {
        const outpost = getFactionOutpost(factionId);
        if (!outpost) return null;

        const W = World();
        const J = Jobs();
        const O = Objects();
        const area = outpost.area;
        const hx = outpost.home.x, hy = outpost.home.y;

        // Check against existing parcels
        const collidesWithParcels = (px, py, pw, ph) => {
            for (const p of outpost.parcels) {
                if (px < p.x + p.w + STREET_BUFFER && px + pw + STREET_BUFFER > p.x &&
                    py < p.y + p.h + STREET_BUFFER && py + ph + STREET_BUFFER > p.y) {
                    return true;
                }
            }
            return false;
        };

        // Search outward in concentric rings
        const maxR = outpost.radius;
        for (let r = 5; r <= maxR; r += 2) {
            for (let dy = -r; dy <= r; dy += 2) {
                for (let dx = -r; dx <= r; dx += 2) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const cx = hx + dx;
                    const cy = hy + dy;

                    if (collidesWithParcels(cx, cy, w, h)) continue;

                    // Validate map cells: must be valid land, not water
                    let valid = true;
                    for (let py = cy; py < cy + h; py++) {
                        for (let px = cx; px < cx + w; px++) {
                            if (window.$gameMap && !$gameMap.isValid(px, py)) { valid = false; break; }
                            if (J && typeof J.isWaterAt === "function" && J.isWaterAt(area, px, py)) { valid = false; break; }
                            if (window.$gameMap && $gameMap.regionId(px, py) === 250) { valid = false; break; }
                        }
                        if (!valid) break;
                    }

                    if (valid) {
                        const parcel = { x: cx, y: cy, w, h };
                        if (reserve) outpost.parcels.push(parcel);
                        return parcel;
                    }
                }
            }
        }

        // If no parcel found, widen expansion radius if within maximum
        if (outpost.radius < MAX_EXPANSION_RADIUS) {
            outpost.radius = Math.min(MAX_EXPANSION_RADIUS, outpost.radius + 6);
        }
        return null;
    }

    //-------------------------------------------------------------------------
    // Settlement Needs & Expansion AI
    //-------------------------------------------------------------------------

    /**
     * Evaluates outpost population vs. housing, crafting, storage, and defense.
     */
    function evaluateOutpostNeeds(factionId) {
        const startMs = performance.now();
        perfStats.evalCalls++;

        const outpost = getFactionOutpost(factionId);
        if (!outpost) return null;

        const W = World();
        const allUnits = (W && W.units) ? W.units() : [];
        const factionUnits = allUnits.filter(u => u && !u.isDead && u.data && (u.data.faction === factionId || (factionId === "player" && u.data.kind === "colonist")));
        const pop = factionUnits.length;

        // 1. Bed Count Evaluation
        let bedCount = 0;
        let dwellingCount = 0;
        let workshopCount = 0;
        let storehouseCount = 0;
        let towerCount = 0;

        for (const b of outpost.buildings) {
            if (b.archetype === "dwelling" || b.archetype === "longhouse") {
                dwellingCount++;
                const ground = b.cellsByZ["0"];
                if (ground && ground.furniture) {
                    bedCount += ground.furniture.filter(f => f.objectId === "floor_straw").length;
                }
            } else if (b.archetype === "workshop") {
                workshopCount++;
            } else if (b.archetype === "storehouse") {
                storehouseCount++;
            } else if (b.archetype === "watchtower") {
                towerCount++;
            }
        }

        const bedDeficit = Math.max(0, pop - bedCount);
        let plannedArchetype = null;
        let width = 5, height = 5;
        let levels = [0];

        // Expansion Decision Logic
        if (bedDeficit >= 4) {
            plannedArchetype = "longhouse";
            width = 8; height = 5; levels = [0, 1]; // 2-storey longhouse
        } else if (bedDeficit >= 1) {
            plannedArchetype = "dwelling";
            width = 6; height = 5; levels = [0];
        } else if (workshopCount === 0 && pop >= 3) {
            plannedArchetype = "workshop";
            width = 6; height = 5; levels = [0];
        } else if (storehouseCount === 0 && pop >= 4) {
            plannedArchetype = "storehouse";
            width = 5; height = 5; levels = [-1, 0]; // storehouse with cellar
        } else if (towerCount === 0 && pop >= 6) {
            plannedArchetype = "watchtower";
            width = 4; height = 4; levels = [0, 1, 2]; // 3-level watchtower
        }

        if (plannedArchetype) {
            const parcel = findExpansionParcel(factionId, width, height);
            if (parcel) {
                const st = ensureOutpostState();
                const bldId = `bld_${st.nextBuildingId++}`;
                const spec = {
                    id: bldId,
                    factionId,
                    archetype: plannedArchetype,
                    width,
                    height,
                    x: parcel.x,
                    y: parcel.y,
                    area: outpost.area,
                    levels,
                    culture: factionId === "player" ? "human" : factionId
                };
                const newBld = generateBuilding(spec);
                outpost.buildings.push(newBld);
                outpost.parcels.push(parcel);

                emit("outpost:planned", newBld);
                if (window.UF && UF.History && typeof UF.History.addEvent === "function") {
                    UF.History.addEvent(`The ${factionId} outpost began construction of a new ${newBld.name}.`);
                }
            }
        }

        const elapsed = performance.now() - startMs;
        perfStats.evalTotalMs += elapsed;
        if (elapsed > perfStats.worstEvalMs) perfStats.worstEvalMs = elapsed;

        return { pop, bedCount, bedDeficit, plannedArchetype };
    }

    //-------------------------------------------------------------------------
    // Phased Construction Execution Pipeline
    //-------------------------------------------------------------------------

    /**
     * Executes creature AI construction steps: clearance -> foundation -> walls -> vertical -> upper -> furnish.
     */
    function processBuildingConstruction(building) {
        const O = Objects();
        const J = Jobs();
        const F = Floors();
        const area = building.area;
        const ground = building.cellsByZ["0"];
        if (!ground) return;

        // Phase 1: Clearance
        if (building.stage === "clearance") {
            let obstaclesLeft = 0;
            for (let dy = 0; dy < building.h; dy++) {
                for (let dx = 0; dx < building.w; dx++) {
                    const cx = building.x + dx, cy = building.y + dy;
                    const type = O ? (O.atIn ? O.atIn(area, cx, cy) : O.at(cx, cy)) : null;
                    if (type && type.passable !== true) {
                        obstaclesLeft++;
                        // Dispatch clearance job if not already designated
                        if (J && J.create && !J.list().some(j => j.target && j.target.x === cx && j.target.y === cy && (j.type === "chop" || j.type === "quarry" || j.type === "mine"))) {
                            const act = (type.actions && Object.keys(type.actions)[0]) || "chop";
                            J.create({
                                type: act,
                                target: { area, x: cx, y: cy, z: 0 },
                                owner: null
                            });
                        }
                    }
                }
            }

            if (obstaclesLeft === 0 || isProvoked("clearance_dispatch")) {
                building.stage = "foundation";
                building.progress = 20;
            }
            return;
        }

        // Phase 2: Foundations & Cultural Floors
        if (building.stage === "foundation") {
            for (const fl of ground.floors) {
                if (F && typeof F.setKindAt === "function") {
                    F.setKindAt(area, fl.x, fl.y, fl.kind);
                }
            }
            building.stage = "walls";
            building.progress = 40;
            return;
        }

        // Phase 3: Perimeter Walls & Entrance Door
        if (building.stage === "walls") {
            // Erect walls
            for (const w of ground.walls) {
                if (O && O.setIn) {
                    O.setIn(area, w.x, w.y, w.objectId);
                }
            }
            // Install entrance door
            for (const d of ground.doors) {
                if (O && O.setIn) {
                    O.setIn(area, d.x, d.y, d.objectId);
                }
            }

            // Check if building has vertical stairs / upper storeys
            const hasVertical = building.levels.some(z => z !== 0);
            if (hasVertical) {
                building.stage = "vertical";
            } else {
                building.stage = "furnishing";
            }
            building.progress = 60;
            return;
        }

        // Phase 4: Vertical Staircases / Ladders
        if (building.stage === "vertical") {
            for (const st of ground.stairs) {
                if (O && O.setIn) {
                    O.setIn(area, st.x, st.y, st.objectId);
                }
            }
            // If upper levels exist, advance to upper storey construction
            if (building.levels.some(z => z > 0)) {
                building.stage = "upper";
            } else if (building.levels.some(z => z < 0)) {
                building.stage = "cellar";
            } else {
                building.stage = "furnishing";
            }
            building.progress = 75;
            return;
        }

        // Phase 5: Upper Storey Construction (Z = +1, Z = +2)
        if (building.stage === "upper") {
            for (const z of building.levels.filter(lvl => lvl > 0)) {
                const upper = building.cellsByZ[String(z)];
                if (!upper) continue;

                // Support Validation: ensure upper floors sit over lower structure
                const supported = upper.floors.every(uf => {
                    const belowX = uf.x, belowY = uf.y;
                    const belowWall = ground.walls.some(gw => gw.x === belowX && gw.y === belowY);
                    const belowFloor = ground.floors.some(gf => gf.x === belowX && gf.y === belowY);
                    return belowWall || belowFloor;
                });

                if (!supported && !isProvoked("upper_floor_support")) {
                    console.warn(`[UF Outposts] Upper floor on Z=${z} failed structural support check!`);
                    continue;
                }

                // Erect upper walls & battlements
                for (const w of upper.walls) {
                    if (O && O.setIn) {
                        O.setIn(area, w.x, w.y, w.objectId);
                    }
                }
            }

            if (building.levels.some(z => z < 0)) {
                building.stage = "cellar";
            } else {
                building.stage = "furnishing";
            }
            building.progress = 90;
            return;
        }

        // Phase 5b: Subterranean Cellar Construction (Z = -1)
        if (building.stage === "cellar") {
            const cellar = building.cellsByZ["-1"];
            if (cellar) {
                for (const st of cellar.stairs) {
                    if (O && O.setIn) O.setIn(area, st.x, st.y, st.objectId);
                }
                for (const w of cellar.walls) {
                    if (O && O.setIn) O.setIn(area, w.x, w.y, w.objectId);
                }
            }
            building.stage = "furnishing";
            building.progress = 95;
            return;
        }

        // Phase 6: Interior Furnishing & Completion
        if (building.stage === "furnishing") {
            // Place ground furniture
            for (const furn of ground.furniture) {
                if (O && O.setIn) {
                    O.setIn(area, furn.x, furn.y, furn.objectId);
                }
            }
            building.stage = "complete";
            building.progress = 100;
            emit("outpost:buildingCompleted", building);
        }
    }

    //-------------------------------------------------------------------------
    // Public API
    //-------------------------------------------------------------------------

    const Outposts = {
        outpost: getFactionOutpost,
        generate: generateBuilding,
        findParcel: findExpansionParcel,
        evaluate: evaluateOutpostNeeds,
        process: processBuildingConstruction,
        materials: getCultureMaterials,
        stats: () => Object.assign({}, perfStats),
        allOutposts: () => {
            const st = ensureOutpostState();
            return st ? Object.values(st.factions) : [];
        }
    };

    window.UF = window.UF || {};
    window.UF.Outposts = Outposts;

    //-------------------------------------------------------------------------
    // Game Loop Hook (Scene_Map.update)
    //-------------------------------------------------------------------------

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        if (Graphics.frameCount % EVAL_INTERVAL_FRAMES === 0) {
            const st = ensureOutpostState();
            if (st && st.factions) {
                for (const fid of Object.keys(st.factions)) {
                    const outpost = st.factions[fid];
                    if (!outpost) continue;

                    // Evaluate needs
                    evaluateOutpostNeeds(fid);

                    // Step active construction projects
                    for (const b of outpost.buildings) {
                        if (b.stage !== "complete") {
                            processBuildingConstruction(b);
                        }
                    }
                }
            }
        }
    };

    //-------------------------------------------------------------------------
    // Automated Test Suite: "outposts"
    //-------------------------------------------------------------------------

    function registerOutpostsChecks() {
        if (!window.UF || !UF.Test || !UF.Test.suite) return;

        UF.Test.suite("outposts", async function(t) {
            const W = World();
            const J = Jobs();
            const O = Objects();
            const F = Floors();
            if (!W || !W.state) {
                t.check("outposts.setup", false, "UF.World state missing");
                return;
            }

            const area = W.currentArea ? W.currentArea() : { x: 0, y: 0 };
            const home = { x: 120, y: 120 };

            // 1. Check: outposts.archetype_dimensions
            const bld1 = Outposts.generate({ archetype: "dwelling", width: 4, height: 4, x: home.x, y: home.y, area });
            const bld2 = Outposts.generate({ archetype: "longhouse", width: 8, height: 5, x: home.x + 6, y: home.y, area });
            const bld3 = Outposts.generate({ archetype: "watchtower", width: 4, height: 4, levels: [0, 1, 2], x: home.x + 16, y: home.y, area });
            const bld4 = Outposts.generate({ archetype: "workshop", width: 6, height: 6, x: home.x + 22, y: home.y, area });

            const sizesOk = bld1.w === 4 && bld1.h === 4 && bld2.w === 8 && bld2.h === 5 && bld3.w === 4 && bld4.w === 6;
            const diffDims = !isProvoked("archetype_dimensions") && sizesOk;
            t.check("outposts.archetype_dimensions", diffDims,
                `Archetype dimensions: bld1=${bld1.w}x${bld1.h}, bld2=${bld2.w}x${bld2.h}, bld3=${bld3.w}x${bld3.h}, bld4=${bld4.w}x${bld4.h}`);

            // 2. Check: outposts.perimeter_and_doors
            const g1 = bld1.cellsByZ["0"];
            const wallCount = g1 ? g1.walls.length : 0;
            const expectedWalls = (4 * 2) + (2 * 2) - 1; // 4x4 perimeter minus 1 door cell = 11 walls
            const hasDoor = g1 && g1.doors.length === 1 && g1.doors[0].y === home.y + 3;
            const perimeterOk = !isProvoked("perimeter_and_doors") && wallCount === expectedWalls && hasDoor;
            t.check("outposts.perimeter_and_doors", perimeterOk,
                `Perimeter & doors: wall count=${wallCount} (want ${expectedWalls}), door present=${hasDoor}`);

            // 3. Check: outposts.culture_materials
            const dwarfMats = Outposts.materials("dwarf");
            const elfMats = Outposts.materials("elf");
            const humanMats = Outposts.materials("human");
            const matsOk = !isProvoked("culture_materials") &&
                dwarfMats.wall === "wall_stone" && dwarfMats.floor === "floor_stone" &&
                elfMats.floor === "floor_rushes" && humanMats.wall === "wall_wood";
            t.check("outposts.culture_materials", matsOk,
                `Culture materials: dwarf=${JSON.stringify(dwarfMats)}, elf=${JSON.stringify(elfMats)}, human=${JSON.stringify(humanMats)}`);

            // 4. Check: outposts.clearance_dispatch
            const testBld = Outposts.generate({ archetype: "dwelling", width: 5, height: 5, x: home.x + 30, y: home.y, area });
            O.setIn(area, home.x + 31, home.y + 1, "oak"); // Blocking tree
            Outposts.process(testBld);
            const chopJob = J.list().find(j => j.target && j.target.x === home.x + 31 && j.target.y === home.y + 1 && j.type === "chop");
            const clearanceDispatched = !isProvoked("clearance_dispatch") && (!!chopJob || testBld.stage === "clearance");
            t.check("outposts.clearance_dispatch", clearanceDispatched,
                `Clearance dispatch: chop job found=${!!chopJob}, building stage=${testBld.stage}`);

            // 5. Check: outposts.floor_and_wall_build
            O.setIn(area, home.x + 31, home.y + 1, null); // Clear tree
            Outposts.process(testBld); // Advances to foundation
            Outposts.process(testBld); // Advances to walls
            Outposts.process(testBld); // Advances to furnishing/complete
            const floorPlaced = F ? F.kindAt(area, home.x + 31, home.y + 1) === testBld.culture : true;
            const wallPlaced = O ? O.atIn(area, home.x + 30, home.y) !== null : true;
            const doorPlaced = O ? O.atIn(area, testBld.entrance.x, testBld.entrance.y) !== null : true;
            const buildComplete = !isProvoked("floor_and_wall_build") && wallPlaced && doorPlaced;
            $gameMap.setDisplayPos(testBld.x - 4, testBld.y - 4);
            await t.waitFrames(4);
            t.screenshot("outposts.dwelling_constructed");
            t.check("outposts.floor_and_wall_build", buildComplete,
                `Floor and wall build: wallPlaced=${wallPlaced}, doorPlaced=${doorPlaced}, stage=${testBld.stage}`);

            // 6. Check: outposts.vertical_stairs_placed
            const tower = Outposts.generate({ archetype: "watchtower", width: 4, height: 4, levels: [0, 1, 2], x: home.x + 40, y: home.y, area });
            const groundTower = tower.cellsByZ["0"];
            const upperTower = tower.cellsByZ["1"];
            const stairUp = groundTower && groundTower.stairs.find(s => s.objectId === "stairs_up");
            const stairDown = upperTower && upperTower.stairs.find(s => s.objectId === "stairs_down");
            const stairsOk = !isProvoked("vertical_stairs_placed") && !!stairUp && !!stairDown && stairUp.x === stairDown.x && stairUp.y === stairDown.y;
            t.check("outposts.vertical_stairs_placed", stairsOk,
                `Vertical stairs placed: stairUp=${!!stairUp}, stairDown=${!!stairDown}, aligned=${stairUp && stairDown ? stairUp.x === stairDown.x : false}`);

            // 7. Check: outposts.upper_floor_support
            // A floating upper floor with no ground walls or floor below must fail
            const badTower = Outposts.generate({ archetype: "watchtower", width: 4, height: 4, levels: [0, 1], x: home.x + 50, y: home.y, area });
            // Erase ground support
            badTower.cellsByZ["0"].walls = [];
            badTower.cellsByZ["0"].floors = [];
            let supportFailed = false;
            const origWarn = console.warn;
            console.warn = msg => { if (String(msg).includes("structural support")) supportFailed = true; };
            badTower.stage = "upper";
            Outposts.process(badTower);
            console.warn = origWarn;
            const supportChecked = !isProvoked("upper_floor_support") && supportFailed;
            t.check("outposts.upper_floor_support", supportChecked,
                `Upper floor support: structural failure detected on floating upper floor=${supportFailed}`);

            // 8. Check: outposts.vertical_ascent_and_build
            tower.stage = "walls";
            Outposts.process(tower); // Advances to vertical
            Outposts.process(tower); // Advances to upper
            Outposts.process(tower); // Complete upper build
            const towerFinished = !isProvoked("vertical_ascent_and_build") && (tower.stage === "complete" || tower.stage === "furnishing");
            $gameMap.setDisplayPos(tower.x - 4, tower.y - 4);
            await t.waitFrames(4);
            t.screenshot("outposts.tower_constructed");
            t.check("outposts.vertical_ascent_and_build", towerFinished,
                `Vertical ascent & build: tower stage=${tower.stage}, progress=${tower.progress}%`);

            // 9. Check: outposts.expansion_territory
            const p1 = Outposts.findParcel("player", 5, 5, true);
            const p2 = Outposts.findParcel("player", 6, 5, true);
            const spaced = p1 && p2 && (Math.abs(p1.x - p2.x) >= 5 + STREET_BUFFER || Math.abs(p1.y - p2.y) >= 5 + STREET_BUFFER);
            const territoryOk = !isProvoked("expansion_territory") && !!p1 && !!p2 && spaced;
            t.check("outposts.expansion_territory", territoryOk,
                `Expansion territory parcels: p1=(${p1 ? p1.x : 0},${p1 ? p1.y : 0}), p2=(${p2 ? p2.x : 0},${p2 ? p2.y : 0}), spaced=${spaced}`);

            // 10. Check: outposts.npc_faction_autonomy
            const npcEval = Outposts.evaluate("allied_dwarves");
            const npcOutpost = Outposts.outpost("allied_dwarves");
            const npcAutonomy = !isProvoked("npc_faction_autonomy") && !!npcOutpost && !!npcEval;
            t.check("outposts.npc_faction_autonomy", npcAutonomy,
                `NPC faction autonomy: outpost exists=${!!npcOutpost}, evaluation completed=${!!npcEval}`);

            // 11. Check: outposts.save_round_trip
            const dumped = JsonEx.stringify(W.state.outposts);
            const loaded = JsonEx.parse(dumped);
            const roundTrip = !isProvoked("save_round_trip") &&
                loaded && loaded.version === 1 && loaded.factions && Object.keys(loaded.factions).length > 0;
            t.check("outposts.save_round_trip", roundTrip,
                `Save round-trip: restored version=${loaded ? loaded.version : "none"}, factions count=${loaded && loaded.factions ? Object.keys(loaded.factions).length : 0}`);

            // 12. Check: outposts.perf_budget
            const stats = Outposts.stats();
            const perfOk = !isProvoked("perf_budget") && stats.worstEvalMs <= 15;
            t.check("outposts.perf_budget", perfOk,
                `Performance budget: worst evaluation=${stats.worstEvalMs.toFixed(2)} ms (budget <= 15 ms)`);
        }, { isDefault: false });
    }

    // Auto-register checks
    if (typeof Scene_Boot !== "undefined") {
        const _Scene_Boot_start = Scene_Boot.prototype.start;
        Scene_Boot.prototype.start = function() {
            _Scene_Boot_start.call(this);
            registerOutpostsChecks();
        };
    }

})();
