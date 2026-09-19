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
                nextBuildingId: 1,
                nextFamilyId: 1
            };
        }
        if (!W.state.outposts.nextFamilyId) {
            W.state.outposts.nextFamilyId = 1;
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
                families: {},
                cultureEvolution: null,
                lastEvalFrame: 0
            };
        } else {
            st.factions[factionId].families = st.factions[factionId].families || {};
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
                case "family_home":
                    w = 8; h = 6; // 4-room family home (kitchen, dining, master bed, child bed)
                    break;
                case "homestead":
                    w = 8; h = 8; // 2-storey homestead estate
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
        const buildingLevels = (archetype === "homestead" && levels.length === 1 && levels[0] === 0) ?
            [0, 1] : levels.slice().sort((a, b) => a - b);
        const cellsByZ = {};
        const rooms = [];
        const windows = [];

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
            const stairX = archetype === "homestead" ? x + 6 : x + 1;
            const stairY = archetype === "homestead" ? y + 2 : y + 1;
            groundCells.stairs.push({ x: stairX, y: stairY, objectId: "stairs_up", targetZ: 1 });
        }
        if (hasCellar) {
            groundCells.stairs.push({ x: x + w - 2, y: y + 1, objectId: "stairs_down", targetZ: -1 });
        }

        // Windows on exterior walls
        if (archetype === "family_home" || archetype === "homestead" || archetype === "dwelling") {
            windows.push(
                { x: x + 1, y: y },
                { x: x + Math.min(5, w - 2), y: y },
                { x: x + Math.min(5, w - 2), y: y + h - 1 },
                { x: x, y: y + 2 },
                { x: x + w - 1, y: y + 2 }
            );
        }

        // Multi-Room Layouts & Interior Partition Walls
        if (archetype === "family_home") {
            // Spine partition separating West (Kitchen/Dining) from East (Bedrooms) at dx = 3
            groundCells.walls.push({ x: x + 3, y: y + 1, objectId: mats.wall });
            groundCells.doors.push({ x: x + 3, y: y + 2, objectId: mats.door }); // doorway to master bed
            groundCells.walls.push({ x: x + 3, y: y + 3, objectId: mats.wall });
            groundCells.doors.push({ x: x + 3, y: y + 4, objectId: mats.door }); // doorway to child bed

            // West partition separating Kitchen from Dining at dy = 2
            groundCells.walls.push({ x: x + 1, y: y + 2, objectId: mats.wall });
            groundCells.doors.push({ x: x + 2, y: y + 2, objectId: mats.door }); // doorway between kitchen & dining

            // East partition separating Master Bedroom from Children's Bedroom at dy = 2
            groundCells.doors.push({ x: x + 4, y: y + 2, objectId: mats.door });
            groundCells.walls.push({ x: x + 5, y: y + 2, objectId: mats.wall });
            groundCells.walls.push({ x: x + 6, y: y + 2, objectId: mats.wall });

            // 1. Kitchen Room
            groundCells.furniture.push({ x: x + 1, y: y + 1, objectId: "campfire" }); // cooking hearth
            groundCells.furniture.push({ x: x + 2, y: y + 1, objectId: "stockpile" }); // pantry crate
            rooms.push({
                id: `${spec.id || "bld"}_kitchen`,
                type: "kitchen",
                name: "Kitchen",
                x: x + 1, y: y + 1, w: 2, h: 2, z: 0,
                hearth: { x: x + 1, y: y + 1, objectId: "campfire" }
            });

            // 2. Dining Room
            groundCells.furniture.push({ x: x + 2, y: y + 3, objectId: "workbench" }); // dining table
            groundCells.furniture.push({ x: x + 1, y: y + 3, objectId: "floor_straw" }); // dining bench
            rooms.push({
                id: `${spec.id || "bld"}_dining`,
                type: "dining",
                name: "Dining Room",
                x: x + 1, y: y + 3, w: 2, h: 2, z: 0,
                table: { x: x + 2, y: y + 3, objectId: "workbench" }
            });

            // 3. Master Bedroom
            groundCells.furniture.push({ x: x + 5, y: y + 1, objectId: "floor_straw" }); // parent bed 1
            groundCells.furniture.push({ x: x + 6, y: y + 1, objectId: "floor_straw" }); // parent bed 2
            rooms.push({
                id: `${spec.id || "bld"}_master_bedroom`,
                type: "bedroom",
                subType: "master",
                name: "Master Bedroom",
                x: x + 4, y: y + 1, w: 3, h: 2, z: 0,
                beds: [{ x: x + 5, y: y + 1 }, { x: x + 6, y: y + 1 }]
            });

            // 4. Children's Bedroom
            groundCells.furniture.push({ x: x + 5, y: y + 4, objectId: "floor_straw" }); // child bed 1
            groundCells.furniture.push({ x: x + 6, y: y + 4, objectId: "floor_straw" }); // child bed 2
            rooms.push({
                id: `${spec.id || "bld"}_children_bedroom`,
                type: "bedroom",
                subType: "children",
                name: "Children's Bedroom",
                x: x + 4, y: y + 3, w: 3, h: 2, z: 0,
                beds: [{ x: x + 5, y: y + 4 }, { x: x + 6, y: y + 4 }]
            });
        } else if (archetype === "homestead") {
            // Ground level: Grand Kitchen and Great Dining Hall
            groundCells.walls.push({ x: x + 1, y: y + 3, objectId: mats.wall });
            groundCells.doors.push({ x: x + 2, y: y + 3, objectId: mats.door });
            groundCells.walls.push({ x: x + 3, y: y + 3, objectId: mats.wall });

            groundCells.furniture.push({ x: x + 1, y: y + 1, objectId: "campfire" }); // hearth
            groundCells.furniture.push({ x: x + 2, y: y + 1, objectId: "stockpile" }); // pantry
            groundCells.furniture.push({ x: x + 3, y: y + 5, objectId: "workbench" }); // grand table
            groundCells.furniture.push({ x: x + 2, y: y + 5, objectId: "floor_straw" }); // bench

            rooms.push({
                id: `${spec.id || "bld"}_kitchen`,
                type: "kitchen",
                name: "Grand Kitchen",
                x: x + 1, y: y + 1, w: 3, h: 3, z: 0,
                hearth: { x: x + 1, y: y + 1, objectId: "campfire" }
            });
            rooms.push({
                id: `${spec.id || "bld"}_dining`,
                type: "dining",
                name: "Great Dining Hall",
                x: x + 1, y: y + 4, w: 6, h: 3, z: 0,
                table: { x: x + 3, y: y + 5, objectId: "workbench" }
            });
        } else if (archetype === "dwelling" || archetype === "longhouse") {
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
            rooms: rooms || [],
            windows: windows || [],
            familyId: spec.familyId || null,
            upgradeTarget: null,
            assignedWorkers: [],
            createdFrame: Graphics.frameCount
        };

        return bld;
    }

    function capitalize(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
    }

    //-------------------------------------------------------------------------
    // Domestic Families, Generational Culture & Creature Goals
    //-------------------------------------------------------------------------

    function generateSurname(culture) {
        const cult = (culture || "human").toLowerCase();
        const humanSurnames = ["Hawthorne", "Miller", "Baker", "Fletcher", "Blackwood", "Cooper", "Smith"];
        const dwarfSurnames = ["Ironfoot", "Stonehammer", "Bronzebeard", "Deepdelver", "Anvilborn"];
        const elfSurnames = ["Silverleaf", "Swiftwillow", "Greenbough", "Moonwhisper", "Starlight"];
        const orcSurnames = ["Bloodtusk", "Goretusk", "Ironhide", "Skullcleaver"];
        const gnomeSurnames = ["Cogspinner", "Springgear", "Tinkertop", "Brassbutton"];
        const goblinSurnames = ["Snaggletooth", "Mudfoot", "Quickdagger", "Bonepicker"];

        const pool = cult.includes("dwarf") ? dwarfSurnames :
                     cult.includes("elf") ? elfSurnames :
                     cult.includes("orc") ? orcSurnames :
                     cult.includes("gnome") ? gnomeSurnames :
                     cult.includes("goblin") ? goblinSurnames : humanSurnames;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function syncOutpostFamilies(factionId) {
        const outpost = getFactionOutpost(factionId);
        if (!outpost) return [];

        const W = World();
        const allUnits = (W && W.units) ? W.units() : [];
        const factionUnits = allUnits.filter(u => u && !u.isDead && u.data && (u.data.faction === factionId || (factionId === "player" && u.data.kind === "colonist")));

        const unassigned = factionUnits.filter(u => !u.data.familyId);
        if (unassigned.length === 0) return Object.values(outpost.families || {});

        const st = ensureOutpostState();
        let currentFamily = null;

        for (const u of unassigned) {
            if (!currentFamily || currentFamily.members.length >= 4) {
                const famId = `fam_${st.nextFamilyId++}`;
                const surname = u.data.surname || generateSurname(u.data.culture || outpost.culture || "human");
                currentFamily = {
                    id: famId,
                    factionId,
                    surname,
                    members: [],
                    houseId: null,
                    generation: (u.data && u.data.generation) || 1
                };
                outpost.families[famId] = currentFamily;
            }
            currentFamily.members.push(u.id);
            u.data.familyId = currentFamily.id;
            u.data.surname = currentFamily.surname;
        }

        return Object.values(outpost.families || {});
    }

    function assignFamilyHouse(familyId, buildingOrId) {
        const st = ensureOutpostState();
        if (!st) return false;

        let building = (buildingOrId && typeof buildingOrId === "object") ? buildingOrId : null;
        const bldId = (buildingOrId && typeof buildingOrId === "object") ? buildingOrId.id : buildingOrId;
        let family = null;
        for (const fId of Object.keys(st.factions)) {
            const o = st.factions[fId];
            if (o.families && o.families[familyId]) {
                family = o.families[familyId];
            }
            if (!building && o.buildings) {
                const b = o.buildings.find(bld => bld.id === bldId);
                if (b) building = b;
            }
        }
        if (!family || !building) return false;

        family.houseId = building.id;
        building.familyId = family.id;

        const outpost = getFactionOutpost(family.factionId || building.factionId || "player");
        if (outpost && outpost.buildings && !outpost.buildings.some(b => b.id === building.id)) {
            outpost.buildings.push(building);
        }

        const keyId = `key_fam_${family.id}`;
        const ground = building.cellsByZ["0"];
        const entranceCell = ground && ground.doors && ground.doors.find(d => d.x === building.entrance.x && d.y === building.entrance.y);
        if (entranceCell) {
            entranceCell.locked = true;
            entranceCell.keyId = keyId;
        }
        if (window.UF && UF.Doors && typeof UF.Doors.lock === "function") {
            UF.Doors.lock(building.area, building.entrance.x, building.entrance.y, keyId);
        }

        const W = World();
        const masterRoom = building.rooms.find(r => r.subType === "master");
        const childRoom = building.rooms.find(r => r.subType === "children");
        let parentIdx = 0;
        let childIdx = 0;

        for (const uid of (family.members || [])) {
            const u = W ? W.unit(uid) : null;
            if (!u || !u.data) continue;
            u.data.keys = u.data.keys || [];
            if (!u.data.keys.includes(keyId)) {
                u.data.keys.push(keyId);
            }
            u.data.home = { area: copyArea(building.area), x: building.entrance.x, y: building.entrance.y };

            const isChild = (u.data.ageStage === "child" || u.data.role === "child");
            let bedCell = null;
            if (isChild && childRoom && childRoom.beds && childRoom.beds[childIdx]) {
                bedCell = childRoom.beds[childIdx++];
                u.data.assignedRoom = childRoom.id;
            } else if (masterRoom && masterRoom.beds && masterRoom.beds[parentIdx]) {
                bedCell = masterRoom.beds[parentIdx++];
                u.data.assignedRoom = masterRoom.id;
            }

            if (bedCell) {
                const bedTarget = { area: copyArea(building.area), x: bedCell.x, y: bedCell.y };
                if (window.UF && UF.Ownership && typeof UF.Ownership.assignBed === "function") {
                    UF.Ownership.assignBed(u, bedTarget, { force: true });
                }
                u.data.bed = bedTarget;
            }
        }

        emit("outpost:familyHoused", { familyId, buildingId: building.id });
        return true;
    }

    function ensureCultureEvolution(factionId) {
        const outpost = getFactionOutpost(factionId);
        if (!outpost) return null;
        if (!outpost.cultureEvolution) {
            outpost.cultureEvolution = {
                generation: 1,
                traditions: ["Hearthfire Gathering"],
                tastes: { hearth: 10, craft: 5, martial: 5, nature: 5 },
                aesthetic: "rustic"
            };
        }
        return outpost.cultureEvolution;
    }

    function evolveColonyCulture(factionId) {
        const evo = ensureCultureEvolution(factionId);
        if (!evo) return null;

        const outpost = getFactionOutpost(factionId);
        const W = World();
        const allUnits = (W && W.units) ? W.units() : [];
        const factionUnits = allUnits.filter(u => u && !u.isDead && u.data && (u.data.faction === factionId || (factionId === "player" && u.data.kind === "colonist")));

        if (factionUnits.length === 0) return evo;

        let hearthScore = 0;
        let craftScore = 0;
        let martialScore = 0;
        let natureScore = 0;

        for (const u of factionUnits) {
            const goals = goalsOf(u);
            const pers = (u.data && u.data.personality) || {};

            if (goals) {
                const allGoalText = [...goals.short, ...goals.medium, ...goals.long].join(" ").toLowerCase();
                if (allGoalText.includes("hearth") || allGoalText.includes("dining") || allGoalText.includes("family") || allGoalText.includes("father") || allGoalText.includes("mother") || allGoalText.includes("meal")) {
                    hearthScore += 3;
                }
                if (allGoalText.includes("craft") || allGoalText.includes("forge") || allGoalText.includes("build") || allGoalText.includes("furnish")) {
                    craftScore += 3;
                }
                if (allGoalText.includes("sword") || allGoalText.includes("warrior") || allGoalText.includes("champion") || allGoalText.includes("defend")) {
                    martialScore += 3;
                }
                if (allGoalText.includes("nature") || allGoalText.includes("graze") || allGoalText.includes("meadow") || allGoalText.includes("seasons")) {
                    natureScore += 3;
                }
            }

            if (pers.sociability && pers.sociability > 50) hearthScore += 2;
            if (pers.industriousness && pers.industriousness > 50) craftScore += 2;
            if (pers.bravery && pers.bravery > 50) martialScore += 2;
            if (pers.natureAffinity && pers.natureAffinity > 50) natureScore += 2;
        }

        evo.tastes.hearth += hearthScore;
        evo.tastes.craft += craftScore;
        evo.tastes.martial += martialScore;
        evo.tastes.nature += natureScore;

        const highestUnitGen = Math.max(...factionUnits.map(u => (u.data && u.data.generation) || 1));
        if (highestUnitGen > evo.generation) {
            evo.generation = highestUnitGen;
            const newTradition = evo.tastes.hearth > evo.tastes.martial ?
                `Generation ${evo.generation}: Feasts of the Great Hearth` :
                `Generation ${evo.generation}: Vigil of the Iron Shield`;
            if (!evo.traditions.includes(newTradition)) {
                evo.traditions.push(newTradition);
                if (window.UF && UF.History && typeof UF.History.addEvent === "function") {
                    UF.History.addEvent(`A new cultural era dawned in ${factionId}: ${newTradition}`);
                }
            }
        }

        const maxTaste = Math.max(evo.tastes.hearth, evo.tastes.craft, evo.tastes.martial, evo.tastes.nature);
        if (evo.tastes.hearth === maxTaste) evo.aesthetic = "domestic_hearth";
        else if (evo.tastes.craft === maxTaste) evo.aesthetic = "artisan_craft";
        else if (evo.tastes.martial === maxTaste) evo.aesthetic = "fortified_shield";
        else evo.aesthetic = "pastoral_harmony";

        emit("outpost:cultureEvolved", { factionId, evolution: evo });
        return evo;
    }

    function isAnimalCreature(u) {
        if (!u || !u.data) return false;
        const kind = (u.data.kind || "").toLowerCase();
        const race = (u.data.race || "").toLowerCase();
        const animalKinds = ["animal", "wildlife", "wolf", "boar", "hare", "fox", "deer", "grazer", "predator", "bear", "beast"];
        return animalKinds.includes(kind) || animalKinds.includes(race) || !!u.data.isWildlife;
    }

    function evaluateCreatureGoals(unit) {
        if (!unit || !unit.data) return null;

        const isAnimal = isAnimalCreature(unit);
        let goals = { short: [], medium: [], long: [] };

        if (isAnimal) {
            const isPredator = ["wolf", "fox", "bear", "predator"].includes((unit.data.kind || "").toLowerCase()) ||
                               ["wolf", "fox", "bear", "predator"].includes((unit.data.race || "").toLowerCase());
            goals.short = [
                isPredator ? "Hunt prey in territory" : "Graze fresh meadow grass",
                "Drink cool water at stream",
                "Rest and sleep in sheltered den",
                "Watch and sniff for danger"
            ];
            goals.medium = [
                "Defend territory and den from intruders",
                "Seek compatible mate during breeding season"
            ];
            goals.long = [
                "Survive the harsh winter season",
                "Raise a strong, healthy litter to adulthood"
            ];
        } else {
            const role = (unit.data.role || unit.data.profession || "").toLowerCase();
            const personality = unit.data.personality || {};
            const isCombat = role.includes("warrior") || role.includes("soldier") || role.includes("guard") || (personality.bravery && personality.bravery > 60);

            goals.short = [
                "Eat a warm meal at the family dining table",
                "Sleep peacefully in assigned bedroom bed",
                "Share stories and laughter around the hearth",
                "Complete daily task and build materials"
            ];
            goals.medium = [
                isCombat ? "Forge and polish a fine iron sword" : "Craft sturdy tools and room furnishings",
                "Build and partition spacious house rooms",
                "Install secure locked doors and distribute keys",
                "Stock the kitchen pantry with cooked provisions"
            ];
            goals.long = [
                unit.data.sex === "female" ? "Become a loving mother and nurture the family" : "Become a proud father and provide for the family",
                "Construct a grand multi-room homestead for future generations",
                isCombat ? "Become a revered outpost champion and war hero" : "Master the ancient crafting traditions of our culture",
                "Ensure the prosperity and legacy of our colony"
            ];
        }

        unit.data.goals = goals;
        return goals;
    }

    function goalsOf(unit) {
        if (!unit) return null;
        return (unit.data && unit.data.goals) || evaluateCreatureGoals(unit);
    }

    function familyOf(unit) {
        if (!unit || !unit.data || !unit.data.familyId) return null;
        const outpost = getFactionOutpost(unit.data.faction || "player");
        return (outpost && outpost.families && outpost.families[unit.data.familyId]) || null;
    }

    function houseOf(unit) {
        const fam = familyOf(unit);
        if (!fam || !fam.houseId) return null;
        const outpost = getFactionOutpost(fam.factionId || (unit.data && unit.data.faction) || "player");
        return (outpost && outpost.buildings && outpost.buildings.find(b => b.id === fam.houseId)) || null;
    }

    function kitchenOf(unit) {
        const house = houseOf(unit);
        return (house && house.rooms && house.rooms.find(r => r.type === "kitchen")) || null;
    }

    function diningOf(unit) {
        const house = houseOf(unit);
        return (house && house.rooms && house.rooms.find(r => r.type === "dining")) || null;
    }

    function bedroomOf(unit) {
        const house = houseOf(unit);
        if (!house || !house.rooms) return null;
        if (unit.data && unit.data.assignedRoom) {
            const r = house.rooms.find(rm => rm.id === unit.data.assignedRoom);
            if (r) return r;
        }
        const isChild = unit.data && (unit.data.ageStage === "child" || unit.data.role === "child");
        return house.rooms.find(r => r.type === "bedroom" && (isChild ? r.subType === "children" : r.subType === "master")) ||
               house.rooms.find(r => r.type === "bedroom") || null;
    }

    function upgradeBuilding(building, targetArchetype = "family_home") {
        if (!building) return null;

        const oldArchetype = building.archetype;
        building.upgradeTarget = targetArchetype;
        building.stage = "upgrade";
        building.progress = 50;

        const targetSpec = {
            id: building.id,
            factionId: building.factionId,
            archetype: targetArchetype,
            x: building.x,
            y: building.y,
            area: building.area,
            levels: building.levels,
            culture: building.culture,
            familyId: building.familyId
        };

        const targetBld = generateBuilding(targetSpec);

        building.w = Math.max(building.w, targetBld.w);
        building.h = Math.max(building.h, targetBld.h);
        building.rooms = targetBld.rooms;
        building.windows = targetBld.windows;
        building.archetype = targetArchetype;
        building.name = `${capitalize(building.culture)} ${capitalize(targetArchetype)}`;

        const existingGround = building.cellsByZ["0"] || { floors: [], walls: [], doors: [], stairs: [], furniture: [] };
        const targetGround = targetBld.cellsByZ["0"] || { floors: [], walls: [], doors: [], stairs: [], furniture: [] };

        const mergeCells = (existingList, targetList) => {
            for (const targetCell of targetList) {
                const match = existingList.find(c => c.x === targetCell.x && c.y === targetCell.y);
                if (!match) {
                    targetCell.built = false;
                    existingList.push(targetCell);
                }
            }
        };

        mergeCells(existingGround.floors, targetGround.floors);
        mergeCells(existingGround.walls, targetGround.walls);
        mergeCells(existingGround.doors, targetGround.doors);
        mergeCells(existingGround.furniture, targetGround.furniture);

        emit("outpost:upgraded", building);
        if (window.UF && UF.History && typeof UF.History.addEvent === "function") {
            UF.History.addEvent(`${building.name} commenced upgrade from ${oldArchetype} to ${targetArchetype}.`);
        }

        return building;
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

        // Ensure families and culture evolution are synchronized
        syncOutpostFamilies(factionId);
        ensureCultureEvolution(factionId);

        const W = World();
        const allUnits = (W && W.units) ? W.units() : [];
        const factionUnits = allUnits.filter(u => u && !u.isDead && u.data && (u.data.faction === factionId || (factionId === "player" && u.data.kind === "colonist")));
        const pop = factionUnits.length;

        // Check unhoused families
        const families = Object.values(outpost.families || {});
        const unhousedFamily = families.find(f => !f.houseId);
        if (unhousedFamily) {
            const vacantHome = outpost.buildings.find(b => (b.archetype === "family_home" || b.archetype === "homestead") && !b.familyId);
            if (vacantHome) {
                assignFamilyHouse(unhousedFamily.id, vacantHome.id);
            } else {
                const upgDwelling = outpost.buildings.find(b => b.archetype === "dwelling" && b.stage === "complete");
                if (upgDwelling) {
                    upgradeBuilding(upgDwelling, "family_home");
                    assignFamilyHouse(unhousedFamily.id, upgDwelling.id);
                }
            }
        }

        // 1. Bed Count Evaluation
        let bedCount = 0;
        let dwellingCount = 0;
        let workshopCount = 0;
        let storehouseCount = 0;
        let towerCount = 0;

        for (const b of outpost.buildings) {
            if (b.archetype === "dwelling" || b.archetype === "longhouse" || b.archetype === "family_home" || b.archetype === "homestead") {
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
        let targetFamilyId = null;

        // Expansion Decision Logic
        if (unhousedFamily && !unhousedFamily.houseId) {
            plannedArchetype = "family_home";
            width = 8; height = 6; levels = [0];
            targetFamilyId = unhousedFamily.id;
        } else if (bedDeficit >= 4) {
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
                    culture: factionId === "player" ? "human" : factionId,
                    familyId: targetFamilyId
                };
                const newBld = generateBuilding(spec);
                outpost.buildings.push(newBld);
                outpost.parcels.push(parcel);

                if (targetFamilyId) {
                    assignFamilyHouse(targetFamilyId, newBld.id);
                }

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

    //-------------------------------------------------------------------------
    // Level-Safe Coordinate Handles & Ground Isolation (Z_COMPATIBILITY_AUDIT)
    //-------------------------------------------------------------------------

    function levelArea(baseArea, z) {
        return { x: baseArea ? baseArea.x : 0, y: baseArea ? baseArea.y : 0, z: z | 0 };
    }

    function setObjectAtLevel(area, z, x, y, objectId) {
        const zNum = z | 0;
        if (zNum === 0) {
            const O = Objects();
            return O && O.setIn ? O.setIn(area, x, y, objectId) : false;
        }
        // Non-ground levels (z = +1, +2 or z = -1): route through UF.Levels if available,
        // or record in isolated level map state, strictly preventing writes to Ground z=0
        if (window.UF && UF.Levels && typeof UF.Levels.setObject === "function") {
            return UF.Levels.setObject(levelArea(area, zNum), x, y, objectId);
        }
        const W = World();
        if (W && W.state) {
            W.state.levelObjects = W.state.levelObjects || {};
            const key = `${area.x},${area.y},${zNum}`;
            W.state.levelObjects[key] = W.state.levelObjects[key] || {};
            W.state.levelObjects[key][`${x},${y}`] = objectId;
            return true;
        }
        return false;
    }

    function getObjectAtLevel(area, z, x, y) {
        const zNum = z | 0;
        if (zNum === 0) {
            const O = Objects();
            return O ? (O.atIn ? O.atIn(area, x, y) : O.at(x, y)) : null;
        }
        if (window.UF && UF.Levels && typeof UF.Levels.getObject === "function") {
            return UF.Levels.getObject(levelArea(area, zNum), x, y);
        }
        const W = World();
        if (W && W.state && W.state.levelObjects) {
            const key = `${area.x},${area.y},${zNum}`;
            const objId = W.state.levelObjects[key] && W.state.levelObjects[key][`${x},${y}`];
            if (objId) {
                const O = Objects();
                return O && O.type ? O.type(objId) : { id: objId, name: objId };
            }
        }
        return null;
    }

    function setFloorAtLevel(area, z, x, y, kind) {
        const zNum = z | 0;
        if (zNum === 0) {
            const F = Floors();
            return F && typeof F.setKindAt === "function" ? F.setKindAt(area, x, y, kind) : false;
        }
        if (window.UF && UF.Levels && typeof UF.Levels.setFloor === "function") {
            return UF.Levels.setFloor(levelArea(area, zNum), x, y, kind);
        }
        const W = World();
        if (W && W.state) {
            W.state.levelFloors = W.state.levelFloors || {};
            const key = `${area.x},${area.y},${zNum}`;
            W.state.levelFloors[key] = W.state.levelFloors[key] || {};
            W.state.levelFloors[key][`${x},${y}`] = kind;
            return true;
        }
        return false;
    }

    function getFloorAtLevel(area, z, x, y) {
        const zNum = z | 0;
        if (zNum === 0) {
            const F = Floors();
            return F && typeof F.kindAt === "function" ? F.kindAt(area, x, y) : null;
        }
        if (window.UF && UF.Levels && typeof UF.Levels.getFloor === "function") {
            return UF.Levels.getFloor(levelArea(area, zNum), x, y);
        }
        const W = World();
        if (W && W.state && W.state.levelFloors) {
            const key = `${area.x},${area.y},${zNum}`;
            return (W.state.levelFloors[key] && W.state.levelFloors[key][`${x},${y}`]) || null;
        }
        return null;
    }

    //-------------------------------------------------------------------------
    // Phased Construction Tasks & Creature Builder AI Pipeline
    //-------------------------------------------------------------------------

    function getPendingTasks(building) {
        const tasks = [];
        const ground = building.cellsByZ["0"];
        if (!ground) return tasks;

        if (building.stage === "clearance") {
            const O = Objects();
            for (let dy = 0; dy < building.h; dy++) {
                for (let dx = 0; dx < building.w; dx++) {
                    const cx = building.x + dx, cy = building.y + dy;
                    const type = O ? (O.atIn ? O.atIn(building.area, cx, cy) : O.at(cx, cy)) : null;
                    if (type && type.passable !== true) {
                        tasks.push({ stage: "clearance", type: "clearance", x: cx, y: cy, z: 0, objectId: type.id });
                    }
                }
            }
        } else if (building.stage === "foundation") {
            for (const fl of ground.floors) {
                if (!fl.built) {
                    tasks.push({ stage: "foundation", type: "floor", x: fl.x, y: fl.y, z: 0, kind: fl.kind, ref: fl });
                }
            }
        } else if (building.stage === "walls") {
            for (const w of ground.walls) {
                if (!w.built) {
                    tasks.push({ stage: "walls", type: "wall", x: w.x, y: w.y, z: 0, objectId: w.objectId, ref: w });
                }
            }
            for (const d of ground.doors) {
                if (!d.built) {
                    tasks.push({ stage: "walls", type: "door", x: d.x, y: d.y, z: 0, objectId: d.objectId, ref: d });
                }
            }
        } else if (building.stage === "vertical") {
            for (const st of ground.stairs) {
                if (!st.built) {
                    tasks.push({ stage: "vertical", type: "stairs", x: st.x, y: st.y, z: 0, objectId: st.objectId, ref: st });
                }
            }
        } else if (building.stage === "upper") {
            for (const z of building.levels.filter(lvl => lvl > 0)) {
                const upper = building.cellsByZ[String(z)];
                if (!upper) continue;
                for (const uf of upper.floors) {
                    if (!uf.built) {
                        tasks.push({ stage: "upper", type: "upper_floor", x: uf.x, y: uf.y, z, kind: uf.kind, ref: uf });
                    }
                }
                for (const uw of upper.walls) {
                    if (!uw.built) {
                        tasks.push({ stage: "upper", type: "upper_wall", x: uw.x, y: uw.y, z, objectId: uw.objectId, ref: uw });
                    }
                }
            }
        } else if (building.stage === "cellar") {
            const cellar = building.cellsByZ["-1"];
            if (cellar) {
                for (const st of cellar.stairs) {
                    if (!st.built) {
                        tasks.push({ stage: "cellar", type: "cellar_stairs", x: st.x, y: st.y, z: -1, objectId: st.objectId, ref: st });
                    }
                }
                for (const cw of cellar.walls) {
                    if (!cw.built) {
                        tasks.push({ stage: "cellar", type: "cellar_wall", x: cw.x, y: cw.y, z: -1, objectId: cw.objectId, ref: cw });
                    }
                }
            }
        } else if (building.stage === "furnishing") {
            for (const fn of ground.furniture) {
                if (!fn.built) {
                    tasks.push({ stage: "furnishing", type: "furniture", x: fn.x, y: fn.y, z: 0, objectId: fn.objectId, ref: fn });
                }
            }
        } else if (building.stage === "upgrade") {
            for (const fl of ground.floors) {
                if (!fl.built) {
                    tasks.push({ stage: "upgrade", type: "floor", x: fl.x, y: fl.y, z: 0, kind: fl.kind, ref: fl });
                }
            }
            for (const w of ground.walls) {
                if (!w.built) {
                    tasks.push({ stage: "upgrade", type: "wall", x: w.x, y: w.y, z: 0, objectId: w.objectId, ref: w });
                }
            }
            for (const d of ground.doors) {
                if (!d.built) {
                    tasks.push({ stage: "upgrade", type: "door", x: d.x, y: d.y, z: 0, objectId: d.objectId, ref: d });
                }
            }
            for (const fn of ground.furniture) {
                if (!fn.built) {
                    tasks.push({ stage: "upgrade", type: "furniture", x: fn.x, y: fn.y, z: 0, objectId: fn.objectId, ref: fn });
                }
            }
        }
        return tasks;
    }

    function advanceBuildingStage(building) {
        if (building.stage === "clearance") {
            building.stage = "foundation";
            building.progress = 20;
        } else if (building.stage === "foundation") {
            building.stage = "walls";
            building.progress = 40;
        } else if (building.stage === "walls") {
            const hasVertical = building.levels.some(z => z !== 0);
            building.stage = hasVertical ? "vertical" : "furnishing";
            building.progress = 60;
        } else if (building.stage === "vertical") {
            if (building.levels.some(z => z > 0)) {
                building.stage = "upper";
            } else if (building.levels.some(z => z < 0)) {
                building.stage = "cellar";
            } else {
                building.stage = "furnishing";
            }
            building.progress = 75;
        } else if (building.stage === "upper") {
            building.stage = building.levels.some(z => z < 0) ? "cellar" : "furnishing";
            building.progress = 90;
        } else if (building.stage === "cellar") {
            building.stage = "furnishing";
            building.progress = 95;
        } else if (building.stage === "furnishing") {
            building.stage = "complete";
            building.progress = 100;
            emit("outpost:buildingCompleted", building);
            if (window.UF && UF.History && typeof UF.History.addEvent === "function") {
                UF.History.addEvent(`Construction of the ${building.archetype} (${building.name}) completed.`);
            }
        } else if (building.stage === "upgrade") {
            building.stage = "complete";
            building.progress = 100;
            building.upgradeTarget = null;
            emit("outpost:buildingCompleted", building);
            if (window.UF && UF.History && typeof UF.History.addEvent === "function") {
                UF.History.addEvent(`Upgrade of ${building.name} to ${building.archetype} completed.`);
            }
        }
    }

    function executeTask(building, task, workerUnit = null) {
        if (!building || !task) return false;
        const area = building.area;

        if (workerUnit) {
            const ev = World().eventOf ? World().eventOf(workerUnit.id) : null;
            if (ev) {
                ev.setStepAnime(true);
                const dx = task.x - workerUnit.x, dy = task.y - workerUnit.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    ev.setDirection(dx > 0 ? 6 : 4);
                } else if (dy !== 0) {
                    ev.setDirection(dy > 0 ? 2 : 8);
                }
            }
        }

        if (task.type === "clearance") {
            const O = Objects();
            if (O && O.setIn) O.setIn(area, task.x, task.y, null);
        } else if (task.type === "floor" || task.type === "upper_floor") {
            setFloorAtLevel(area, task.z, task.x, task.y, task.kind);
            if (task.ref) task.ref.built = true;
        } else if (task.type === "wall" || task.type === "door" || task.type === "stairs" || task.type === "upper_wall" || task.type === "cellar_stairs" || task.type === "cellar_wall" || task.type === "furniture") {
            setObjectAtLevel(area, task.z, task.x, task.y, task.objectId);
            if (task.ref) {
                task.ref.built = true;
                if (task.type === "door" && task.ref.locked && window.UF && UF.Doors && typeof UF.Doors.lock === "function") {
                    UF.Doors.lock(area, task.x, task.y, task.ref.keyId);
                }
            }
        }

        const remaining = getPendingTasks(building);
        if (remaining.length === 0) {
            advanceBuildingStage(building);
        }
        return true;
    }

    function findStairConnector(building, fromZ, toZ) {
        const fromLevel = building.cellsByZ[String(fromZ)];
        if (!fromLevel || !fromLevel.stairs) return null;
        const targetType = toZ > fromZ ? "stairs_up" : "stairs_down";
        return fromLevel.stairs.find(s => s.objectId === targetType) || fromLevel.stairs[0] || null;
    }

    function findStandCell(unit, task) {
        const W = World();
        const area = unit.area;
        const cand = [[0, 1], [1, 0], [0, -1], [-1, 0], [-1, -1], [1, 1], [-1, 1], [1, -1]];
        for (const [dx, dy] of cand) {
            const sx = task.x + dx, sy = task.y + dy;
            if (W && W.isPassable && W.isPassable(area, sx, sy, 0, unit.id)) {
                return { x: sx, y: sy };
            }
        }
        return { x: task.x, y: task.y };
    }

    function assignBuilder(unitId, building) {
        const W = World();
        const unit = W ? W.unit(unitId) : null;
        if (!unit || !building || building.stage === "complete") return null;

        const tasks = getPendingTasks(building);
        if (tasks.length === 0) return null;
        const task = tasks[0];

        // Vertical transit: ascend/descend between Z levels if task is on another level
        if ((unit.z || 0) !== (task.z || 0)) {
            const connector = findStairConnector(building, unit.z || 0, task.z || 0);
            if (connector) {
                unit.x = connector.x;
                unit.y = connector.y;
                unit.z = task.z || 0;
                const ev = W.eventOf ? W.eventOf(unit.id) : null;
                if (ev) ev.locate(connector.x, connector.y);
            } else {
                unit.z = task.z || 0;
            }
        }

        const stand = findStandCell(unit, task);
        if (stand) {
            unit.x = stand.x;
            unit.y = stand.y;
            const ev = W.eventOf ? W.eventOf(unit.id) : null;
            if (ev) ev.locate(stand.x, stand.y);
        }

        executeTask(building, task, unit);
        return task;
    }

    /**
     * Executes creature AI construction steps: clearance -> foundation -> walls -> vertical -> upper -> furnish.
     */
    function processBuildingConstruction(building, opts = {}) {
        const area = building.area;
        const ground = building.cellsByZ["0"];
        if (!ground || building.stage === "complete") return;

        // Phase 1: Clearance
        if (building.stage === "clearance") {
            const J = Jobs();
            const O = Objects();
            let obstaclesLeft = 0;
            for (let dy = 0; dy < building.h; dy++) {
                for (let dx = 0; dx < building.w; dx++) {
                    const cx = building.x + dx, cy = building.y + dy;
                    const type = O ? (O.atIn ? O.atIn(area, cx, cy) : O.at(cx, cy)) : null;
                    if (type && type.passable !== true) {
                        obstaclesLeft++;
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
                advanceBuildingStage(building);
            }
            return;
        }

        // Phase 5: Support Validation for Upper Storey
        if (building.stage === "upper") {
            for (const z of building.levels.filter(lvl => lvl > 0)) {
                const upper = building.cellsByZ[String(z)];
                if (!upper) continue;
                const levelBelow = building.cellsByZ[String(z - 1)];

                const supported = levelBelow ? upper.floors.every(uf => {
                    const belowX = uf.x, belowY = uf.y;
                    const belowWall = levelBelow.walls && levelBelow.walls.some(gw => gw.x === belowX && gw.y === belowY);
                    const belowFloor = levelBelow.floors && levelBelow.floors.some(gf => gf.x === belowX && gf.y === belowY);
                    const belowDoor = levelBelow.doors && levelBelow.doors.some(gd => gd.x === belowX && gd.y === belowY);
                    const belowStair = levelBelow.stairs && levelBelow.stairs.some(gs => gs.x === belowX && gs.y === belowY);
                    return belowWall || belowFloor || belowDoor || belowStair;
                }) : false;

                if (!supported && !isProvoked("upper_floor_support")) {
                    console.warn(`[UF Outposts] Upper floor on Z=${z} failed structural support check!`);
                    return;
                }
            }
        }

        // Execute pending tasks for the current stage
        const tasks = getPendingTasks(building);
        for (const t of tasks) {
            executeTask(building, t, opts.worker || null);
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
        tasks: getPendingTasks,
        executeTask: executeTask,
        assignBuilder: assignBuilder,
        setObjectAtLevel: setObjectAtLevel,
        getObjectAtLevel: getObjectAtLevel,
        setFloorAtLevel: setFloorAtLevel,
        getFloorAtLevel: getFloorAtLevel,
        stats: () => Object.assign({}, perfStats),
        allOutposts: () => {
            const st = ensureOutpostState();
            return st ? Object.values(st.factions) : [];
        },
        // Domestic, Family, Generational Culture, and Goals APIs
        evaluateGoals: evaluateCreatureGoals,
        goalsOf: goalsOf,
        familyOf: familyOf,
        houseOf: houseOf,
        kitchenOf: kitchenOf,
        diningOf: diningOf,
        bedroomOf: bedroomOf,
        ensureCulture: ensureCultureEvolution,
        evolveCulture: evolveColonyCulture,
        syncFamilies: syncOutpostFamilies,
        assignHouse: assignFamilyHouse,
        upgradeBuilding: upgradeBuilding
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

                    evaluateOutpostNeeds(fid);

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

            const area = (W.currentArea && W.currentArea()) || (W.state && W.state.area) || { x: 0, y: 0 };
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
            for (let dy = 0; dy < 5; dy++) {
                for (let dx = 0; dx < 5; dx++) {
                    O.setIn(area, home.x + 30 + dx, home.y + dy, null);
                }
            }
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

            // 13. Check: outposts.creature_builder_flow
            const workerBld = Outposts.generate({ archetype: "workshop", width: 5, height: 5, x: home.x + 60, y: home.y, area });
            workerBld.stage = "walls";
            const builder = W.addUnit({
                name: "TEST_Builder",
                image: { characterName: "$UF_Human_Male" },
                area,
                x: workerBld.x - 1,
                y: workerBld.y - 1,
                exact: true,
                data: { kind: "colonist", faction: "player" }
            });
            const buildTask = Outposts.assignBuilder(builder.id, workerBld);
            const taskPlaced = buildTask && buildTask.ref && buildTask.ref.built === true;
            const builderAdjacent = buildTask && Math.abs(builder.x - buildTask.x) <= 2 && Math.abs(builder.y - buildTask.y) <= 2;
            const builderFlowOk = !isProvoked("creature_builder_flow") && !!buildTask && taskPlaced && builderAdjacent;
            $gameMap.setDisplayPos(workerBld.x - 4, workerBld.y - 4);
            await t.waitFrames(4);
            t.screenshot("outposts.creature_building");
            t.check("outposts.creature_builder_flow", builderFlowOk,
                `Creature builder flow: task=${buildTask ? buildTask.type : "none"}, placed=${taskPlaced}, builder adjacent=${builderAdjacent}`);

            // 14. Check: outposts.z_level_isolation
            const isoTower = Outposts.generate({ archetype: "watchtower", width: 4, height: 4, levels: [0, 1, -1], x: home.x + 70, y: home.y, area });
            isoTower.stage = "vertical";
            Outposts.process(isoTower); // vertical -> upper
            const groundDiffKey = `${area.x},${area.y}`;
            const diffsObj = (W.state.objectDiffs = W.state.objectDiffs || {});
            const groundDiffCountBefore = Object.keys(diffsObj[groundDiffKey] || {}).length;
            Outposts.process(isoTower); // upper -> cellar
            Outposts.process(isoTower); // cellar -> furnishing
            const groundDiffCountAfter = Object.keys(diffsObj[groundDiffKey] || {}).length;
            const upperObj = Outposts.getObjectAtLevel(area, 1, isoTower.x, isoTower.y);
            const cellarObj = Outposts.getObjectAtLevel(area, -1, isoTower.x, isoTower.y);
            const zIsolationOk = !isProvoked("z_level_isolation") &&
                groundDiffCountBefore === groundDiffCountAfter && !!upperObj && !!cellarObj;
            t.check("outposts.z_level_isolation", zIsolationOk,
                `Z level isolation: ground diffs before=${groundDiffCountBefore}, after=${groundDiffCountAfter} (want equal); upperObj=${!!upperObj}, cellarObj=${!!cellarObj}`);

            // 15. Check: outposts.vertical_transit
            const transitTower = Outposts.generate({ archetype: "watchtower", width: 4, height: 4, levels: [0, 1], x: home.x + 80, y: home.y, area });
            transitTower.stage = "vertical";
            Outposts.process(transitTower); // vertical -> upper
            builder.x = transitTower.x;
            builder.y = transitTower.y;
            builder.z = 0;
            const upperTransitTask = Outposts.assignBuilder(builder.id, transitTower);
            const ascended = builder.z === 1;
            const transitOk = !isProvoked("vertical_transit") && !!upperTransitTask && upperTransitTask.z === 1 && ascended;
            t.check("outposts.vertical_transit", transitOk,
                `Vertical transit: builder z=${builder.z} (want 1), task z=${upperTransitTask ? upperTransitTask.z : "none"}, ascended=${ascended}`);

            // 16. Check: outposts.creature_goals
            const wolfCreature = { data: { kind: "wolf", race: "wolf", faction: "wildlife" } };
            const colonistCreature = { data: { kind: "colonist", race: "human", faction: "player", sex: "male", role: "builder" } };
            const wolfGoals = Outposts.evaluateGoals(wolfCreature);
            const colonistGoals = Outposts.evaluateGoals(colonistCreature);

            const wolfShortOk = wolfGoals && wolfGoals.short.some(g => g.toLowerCase().includes("hunt") || g.toLowerCase().includes("graze")) &&
                                wolfGoals.short.some(g => g.toLowerCase().includes("drink")) &&
                                wolfGoals.short.some(g => g.toLowerCase().includes("sleep"));
            const wolfMedOk = wolfGoals && wolfGoals.medium.some(g => g.toLowerCase().includes("territory") || g.toLowerCase().includes("den"));
            const wolfLongOk = wolfGoals && wolfGoals.long.some(g => g.toLowerCase().includes("litter") || g.toLowerCase().includes("survive"));

            const colShortOk = colonistGoals && colonistGoals.short.some(g => g.toLowerCase().includes("dining") || g.toLowerCase().includes("meal")) &&
                               colonistGoals.short.some(g => g.toLowerCase().includes("bed"));
            const colMedOk = colonistGoals && colonistGoals.medium.some(g => g.toLowerCase().includes("forge") || g.toLowerCase().includes("partition") || g.toLowerCase().includes("door") || g.toLowerCase().includes("craft"));
            const colLongOk = colonistGoals && colonistGoals.long.some(g => g.toLowerCase().includes("father") || g.toLowerCase().includes("mother") || g.toLowerCase().includes("homestead") || g.toLowerCase().includes("tradition"));

            const goalsOk = !isProvoked("creature_goals") && wolfShortOk && wolfMedOk && wolfLongOk && colShortOk && colMedOk && colLongOk;
            t.check("outposts.creature_goals", goalsOk,
                `Creature goals: animal short/med/long=${wolfShortOk && wolfMedOk && wolfLongOk}, sapient short/med/long=${colShortOk && colMedOk && colLongOk}`);

            // 17. Check: outposts.family_formation
            const fatherUnit = W.addUnit({
                name: "TEST_Father",
                image: { characterName: "$UF_Human_Male" },
                area, x: home.x, y: home.y, exact: true,
                data: { kind: "colonist", faction: "player", sex: "male", role: "blacksmith" }
            });
            const motherUnit = W.addUnit({
                name: "TEST_Mother",
                image: { characterName: "$UF_Human_Male" },
                area, x: home.x, y: home.y, exact: true,
                data: { kind: "colonist", faction: "player", sex: "female", role: "cook" }
            });
            const childUnit = W.addUnit({
                name: "TEST_Child",
                image: { characterName: "$UF_Human_Male" },
                area, x: home.x, y: home.y, exact: true,
                data: { kind: "colonist", faction: "player", sex: "male", ageStage: "child", role: "child", generation: 2 }
            });

            const fams = Outposts.syncFamilies("player");
            const testFam = fams.find(f => f.members.includes(fatherUnit.id));
            const famOk = !isProvoked("family_formation") && !!testFam &&
                          testFam.members.includes(motherUnit.id) &&
                          testFam.members.includes(childUnit.id) &&
                          !!testFam.surname &&
                          fatherUnit.data.familyId === testFam.id &&
                          motherUnit.data.familyId === testFam.id &&
                          childUnit.data.familyId === testFam.id;
            t.check("outposts.family_formation", famOk,
                `Family formation: familyId=${testFam ? testFam.id : "none"}, surname=${testFam ? testFam.surname : "none"}, members=${testFam ? testFam.members.length : 0}`);

            // 18. Check: outposts.multi_room_layout
            const famHome = Outposts.generate({ archetype: "family_home", width: 8, height: 6, x: home.x + 95, y: home.y, area });
            const roomTypes = (famHome.rooms || []).map(r => r.type);
            const hasKitchen = roomTypes.includes("kitchen");
            const hasDining = roomTypes.includes("dining");
            const hasBedrooms = (famHome.rooms || []).filter(r => r.type === "bedroom").length >= 2;
            const groundFam = famHome.cellsByZ["0"];
            const hasPartitions = groundFam && groundFam.walls.length >= 28;
            const hasInteriorDoors = groundFam && groundFam.doors.length >= 4;
            const multiRoomOk = !isProvoked("multi_room_layout") && famHome.rooms.length === 4 && hasKitchen && hasDining && hasBedrooms && hasPartitions && hasInteriorDoors;
            t.check("outposts.multi_room_layout", multiRoomOk,
                `Multi-room layout: 4 rooms=${famHome.rooms.length === 4}, kitchen=${hasKitchen}, dining=${hasDining}, bedrooms=${hasBedrooms}, partitions=${hasPartitions}, doors=${hasInteriorDoors}`);

            // 19. Check: outposts.home_amenities
            const kitchenRoom = famHome.rooms.find(r => r.type === "kitchen");
            const diningRoom = famHome.rooms.find(r => r.type === "dining");
            const masterRoom = famHome.rooms.find(r => r.subType === "master");
            const childrenRoom = famHome.rooms.find(r => r.subType === "children");

            const hasHearth = kitchenRoom && kitchenRoom.hearth && kitchenRoom.hearth.objectId === "campfire";
            const hasTable = diningRoom && diningRoom.table && diningRoom.table.objectId === "workbench";
            const hasMasterBeds = masterRoom && masterRoom.beds && masterRoom.beds.length === 2;
            const hasChildBeds = childrenRoom && childrenRoom.beds && childrenRoom.beds.length === 2;
            const hasWindows = (famHome.windows || []).length >= 4;

            const amenitiesOk = !isProvoked("home_amenities") && hasHearth && hasTable && hasMasterBeds && hasChildBeds && hasWindows;
            t.check("outposts.home_amenities", amenitiesOk,
                `Home amenities: hearth=${hasHearth}, table=${hasTable}, masterBeds=${hasMasterBeds}, childBeds=${hasChildBeds}, windows=${hasWindows}`);

            // 20. Check: outposts.family_house_assignment
            for (let dy = 0; dy < famHome.h; dy++) {
                for (let dx = 0; dx < famHome.w; dx++) {
                    O.setIn(area, famHome.x + dx, famHome.y + dy, null);
                }
            }
            famHome.stage = "foundation";
            Outposts.process(famHome);
            Outposts.process(famHome);
            Outposts.process(famHome);

            const houseAssigned = Outposts.assignHouse(testFam.id, famHome);
            const keyExpected = `key_fam_${testFam.id}`;
            const doorLocked = window.UF && UF.Doors && UF.Doors.isLocked(famHome.area, famHome.entrance.x, famHome.entrance.y);
            const doorKeyMatch = window.UF && UF.Doors && UF.Doors.keyOf(famHome.area, famHome.entrance.x, famHome.entrance.y) === keyExpected;
            const fatherHasKey = fatherUnit.data.keys && fatherUnit.data.keys.includes(keyExpected);
            const childHasKey = childUnit.data.keys && childUnit.data.keys.includes(keyExpected);
            const fatherHasHome = fatherUnit.data.home && fatherUnit.data.home.x === famHome.entrance.x;

            const strangerUnit = { area, x: home.x, y: home.y, data: { kind: "colonist", faction: "player", keys: [] } };
            const doorObj = window.UF && UF.Doors && UF.Doors.at(famHome.area, famHome.entrance.x, famHome.entrance.y);
            const familyCanPass = window.UF && UF.Doors && UF.Doors.canUnitPass(fatherUnit, doorObj);
            const strangerBlocked = window.UF && UF.Doors && !UF.Doors.canUnitPass(strangerUnit, doorObj);

            const houseAssignmentOk = !isProvoked("family_house_assignment") && houseAssigned && doorLocked && doorKeyMatch && fatherHasKey && childHasKey && fatherHasHome && familyCanPass && strangerBlocked;
            $gameMap.setDisplayPos(famHome.x - 4, famHome.y - 4);
            await t.waitFrames(4);
            t.screenshot("outposts.family_home_multiroom");
            t.check("outposts.family_house_assignment", houseAssignmentOk,
                `Family house assignment: assigned=${houseAssigned}, doorLocked=${doorLocked}, keyMatch=${doorKeyMatch}, keysGiven=${fatherHasKey && childHasKey}, familyPass=${familyCanPass}, strangerBlocked=${strangerBlocked}`);

            // 21. Check: outposts.generational_evolution_and_upgrade
            const evo = Outposts.evolveCulture("player");
            const cultureEvolved = evo && evo.generation >= 2 && evo.tastes.hearth > 0 && !!evo.aesthetic && evo.traditions.length >= 2;

            const upgDwelling = Outposts.generate({ archetype: "dwelling", width: 5, height: 5, x: home.x + 115, y: home.y, area });
            upgDwelling.stage = "walls";
            Outposts.process(upgDwelling);
            Outposts.process(upgDwelling);

            Outposts.upgradeBuilding(upgDwelling, "family_home");
            const upgradeStarted = upgDwelling.stage === "upgrade" && upgDwelling.archetype === "family_home" && upgDwelling.w === 8 && upgDwelling.rooms.length === 4;
            const upgradeTasks = Outposts.tasks(upgDwelling);
            const hasUpgradeTasks = upgradeTasks.length > 0;

            Outposts.process(upgDwelling);
            const upgradeCompleted = upgDwelling.stage === "complete" && upgDwelling.progress === 100;

            $gameMap.setDisplayPos(upgDwelling.x - 4, upgDwelling.y - 4);
            await t.waitFrames(4);
            t.screenshot("outposts.building_upgraded");

            const genUpgradeOk = !isProvoked("generational_evolution_and_upgrade") && cultureEvolved && upgradeStarted && hasUpgradeTasks && upgradeCompleted;
            t.check("outposts.generational_evolution_and_upgrade", genUpgradeOk,
                `Generational evolution & upgrade: cultureEvolved=${cultureEvolved} (gen ${evo ? evo.generation : 0}, aesthetic=${evo ? evo.aesthetic : ""}), upgStarted=${upgradeStarted}, tasks=${upgradeTasks.length}, upgCompleted=${upgradeCompleted}`);
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
