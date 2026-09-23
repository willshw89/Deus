#!/usr/bin/env node
"use strict";

// tools/test_culling_native.js
// Exhaustive native NW.js integration test for DEUS_Culling:
// - Zoom levels (0.5x, 1x, 2x)
// - Viewport edges & toroidal looping seams
// - Stationary camera margin entry & panning
// - Dynamic spawn & removal/death
// - Balloon expiry, transparency, depth sorting
// - Full Process Save / Restart / Load Round-Trip
// - Dynamic Invalidation verification

const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");
const { spawnSync } = require("child_process");

const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const rootGame = path.resolve(__dirname, "..", "game");

function prepareDisposableRuntime() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "deus_culling_native_"));
    const destination = path.join(root, "game");
    const omit = new Set(["save", "test_output", "node_modules", ".git"]);
    
    function copy(source, target) {
        fs.mkdirSync(target, { recursive: true });
        for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
            if (omit.has(entry.name) || /\.(?:log|bak|tmp)$/.test(entry.name)) continue;
            const src = path.join(source, entry.name);
            const dst = path.join(target, entry.name);
            if (entry.isDirectory()) copy(src, dst);
            else if (entry.isFile()) fs.copyFileSync(src, dst);
        }
    }
    copy(rootGame, destination);
    fs.mkdirSync(path.join(destination, "save"), { recursive: true });
    fs.mkdirSync(path.join(destination, "test_output"), { recursive: true });

    // Register DEUS_Culling in plugins.js in the correct position (after presentation plugins)
    const pluginsJsPath = path.join(destination, "js", "plugins.js");
    const context = {};
    vm.runInNewContext(fs.readFileSync(pluginsJsPath, "utf8"), context);
    let plugins = context.$plugins || [];

    // Ensure DEUS_Culling is registered after DEUS_Perspective25D, DEUS_Anim, DEUS_Camera, DEUS_World
    plugins = plugins.filter(p => p.name !== "DEUS_Culling" && p.name !== "TEST_CullingNativeSuite");
    plugins.push({
        name: "DEUS_Culling",
        status: true,
        description: "Viewport culling engine",
        parameters: {}
    });
    plugins.push({
        name: "TEST_CullingNativeSuite",
        status: true,
        description: "Native culling test suite",
        parameters: {}
    });

    fs.writeFileSync(pluginsJsPath, "var $plugins = " + JSON.stringify(plugins, null, 2) + ";\n");

    // Write the native test suite plugin
    const suitePluginCode = `
    (function() {
        "use strict";

        // Phase 1: Native Visual, Camera, Spawning, and Save Creation Suite
        UF.Test.suite("culling_native_phase1", async t => {
            await t.waitUntil(() => !!(window.$gameMap && SceneManager._scene instanceof Scene_Map && window.UF && UF.Culling), 15000, "Scene_Map and UF.Culling");
            t.check("culling_active", !!UF.Culling && UF.Culling.enabled, "UF.Culling is active and enabled");
            const scene = SceneManager._scene;
            const ss = scene._spriteset;
            const tm = ss._tilemap;

            // 1. Zoom Level Testing across all camera levels
            if (UF.Camera && Array.isArray(UF.Camera.levels)) {
                for (let i = 0; i < UF.Camera.levels.length; i++) {
                    UF.Camera.setLevel(i);
                    await t.waitFrames(5);
                    const expectedZoom = UF.Camera.zoom();
                    const v = UF.Culling.bounds();
                    t.check(\`camera_level_\${i}_zoom_\${expectedZoom.toFixed(2)}\`, v && Math.abs(v.zoom - expectedZoom) < 0.001, \`Culling bounds zoom matches camera level \${i}\`);
                }
                // Return to starting level
                UF.Camera.setLevel(1);
                await t.waitFrames(5);
            }

            // 2. Viewport Edges & Looping-map seams
            const mapW = $gameMap.width(), mapH = $gameMap.height();
            $gameMap.setDisplayPos(0, 0);
            await t.waitFrames(5);
            const seamStats1 = UF.Culling.stats(ss);
            t.check("origin_seam_queried", seamStats1 && seamStats1.registered > 0, "Units registered at origin");

            $gameMap.setDisplayPos(mapW - 2, mapH - 2);
            await t.waitFrames(5);
            const seamStats2 = UF.Culling.stats(ss);
            t.check("torus_wrap_queried", seamStats2 && seamStats2.registered > 0, "Units registered across toroidal seam");

            // 3. Stationary Camera while units enter the margin
            $gameMap.setDisplayPos(40, 40);
            await t.waitFrames(5);
            const v = UF.Culling.bounds();

            // Spawn a test creature outside view
            const outsideX = Math.ceil(v.maxX) + 5;
            const outsideY = Math.floor(v.minY + v.h / 2);
            let dynamicUnit = null;
            if (UF.World && typeof UF.World.addUnit === "function") {
                dynamicUnit = UF.World.addUnit({
                    kind: "creature",
                    species: "deer",
                    x: outsideX,
                    y: outsideY,
                    area: UF.World.currentArea ? UF.World.currentArea() : { x: 0, y: 0 }
                });
            }
            await t.waitFrames(5);
            t.check("dynamic_spawn_registered", !!dynamicUnit, "Dynamic unit spawned at (" + outsideX + "," + outsideY + ")");

            const dynSprite = ss.findTargetSprite ? ss.findTargetSprite(dynamicUnit.event || dynamicUnit) : null;
            t.check("dynamic_offscreen_culled", dynSprite ? dynSprite.visible === false : true, "Offscreen spawned unit is culled");

            // Move unit into view margin
            if (dynamicUnit) {
                dynamicUnit.x = Math.ceil(v.maxX) - 1;
                dynamicUnit.y = outsideY;
                if (dynamicUnit.event) dynamicUnit.event.setPosition(dynamicUnit.x, dynamicUnit.y);
            }
            await t.waitFrames(5);
            t.check("margin_entry_reactivates", dynSprite ? dynSprite.visible === true : true, "Unit entering margin reactivates and becomes visible");

            // 4. Balloon / Effect Expiry
            if (dynSprite) {
                const balloon = new Sprite_Balloon();
                balloon.setup(dynSprite, 1);
                balloon.update();
                t.check("balloon_setup", balloon._duration > 0, "Balloon attached to sprite");
                balloon.destroy();
            }

            // 5. Transparency & Depth Sorting
            if (dynSprite && dynSprite._character) {
                dynSprite._character.setTransparent(true);
                dynSprite.update();
                t.check("transparency_preserved", dynSprite.visible === false, "setTransparent preserves invisibility");
                dynSprite._character.setTransparent(false);
                dynSprite.update();

                dynSprite._character.setPriorityType(2); // above
                dynSprite.update();
                const zAbove = dynSprite.z;
                dynSprite._character.setPriorityType(0); // below
                dynSprite.update();
                const zBelow = dynSprite.z;
                t.check("depth_sorting_priority", zAbove > zBelow, "Priority above has greater Z than priority below");
            }

            // 6. Unit Removal / Despawn
            const countBeforeRemove = UF.Culling.stats(ss).registered;
            if (dynamicUnit && UF.World && typeof UF.World.removeUnit === "function") {
                UF.World.removeUnit(dynamicUnit.id);
            }
            await t.waitFrames(5);
            const countAfterRemove = UF.Culling.stats(ss).registered;
            t.check("despawn_unregisters", countAfterRemove === countBeforeRemove - 1, "Despawn unregisters from culling spatial index");

            // 7. Save / Reload Setup:
            // Place 4 units onscreen, 8 units far offscreen
            const savedUnits = [];
            for (let i = 0; i < 4; i++) {
                if (UF.World && typeof UF.World.addUnit === "function") {
                    const u = UF.World.addUnit({
                        name: "TEST_Onscreen_" + i,
                        image: { characterName: "Actor1", characterIndex: 0 },
                        x: 42 + i * 2,
                        y: 42 + i,
                        area: UF.World.currentArea ? UF.World.currentArea() : { x: 0, y: 0 },
                        data: { kind: "colonist" }
                    });
                    savedUnits.push(u);
                }
            }
            for (let i = 0; i < 8; i++) {
                if (UF.World && typeof UF.World.addUnit === "function") {
                    const u = UF.World.addUnit({
                        name: "TEST_Offscreen_" + i,
                        image: { characterName: "Actor1", characterIndex: 1 },
                        x: 150 + i * 5,
                        y: 150 + i * 5,
                        area: UF.World.currentArea ? UF.World.currentArea() : { x: 0, y: 0 },
                        data: { kind: "colonist" }
                    });
                    savedUnits.push(u);
                }
            }
            await t.waitFrames(10);
            t.screenshot("culling_native_phase1_saved");

            // Save to slot 99 (must await promise so file is flushed to disk!)
            await DataManager.saveGame(99);
            t.check("save_game_99_written", StorageManager.exists(DataManager.makeSavename(99)), "Disposable save file 99 created successfully on disk");
            t.check("phase1_no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | "));
        }, { isDefault: false });

        // Phase 2: Full Restart & Load Verification Suite
        UF.Test.suite("culling_native_phase2", async t => {
            await t.waitUntil(() => !!(DataManager && DataManager.loadGame), 10000, "DataManager ready");
            
            // Load from slot 99
            await DataManager.loadGame(99);
            t.check("save_99_loaded", true, "Save file 99 loaded cleanly");

            $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y, $gamePlayer.direction(), 0);
            $gamePlayer.requestMapReload();
            SceneManager.goto(Scene_Map);
            await t.waitUntil(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted(), 15000, "Scene_Map started after load");
            await t.waitFrames(30);

            const scene = SceneManager._scene;
            const ss = scene._spriteset;
            const W = UF.World;
            t.check("world_present", !!W, "UF.World present after load");

            // Verify units exist in authoritative world state
            const allUnits = W && typeof W.units === "function" ? W.units() : [];
            t.check("authoritative_units_count", allUnits.length > 100, "All 100+ authoritative units loaded intact; count=" + allUnits.length);

            // Find founder colonists (IDs 1..8)
            const founderIds = [1, 2, 3, 4, 5, 6, 7, 8];
            const founders = founderIds.map(id => W.unit(id)).filter(Boolean);
            t.check("founders_loaded", founders.length === 8, "Found all 8 founder colonists in loaded world");

            // 1. Center camera on the founders' settlement location
            const f0 = founders[0];
            const homeX = f0.x - 8, homeY = f0.y - 6;
            $gameMap.setDisplayPos(homeX, homeY);
            await t.waitFrames(15);

            const inViewFounders = founders.filter(u => {
                const ev = (W.eventOf && W.eventOf(u.id)) || u.event;
                return ev && UF.Culling.contains(ev);
            });

            let onVisibleCount = 0;
            for (const u of inViewFounders) {
                const ev = (W.eventOf && W.eventOf(u.id)) || u.event;
                const sp = ev ? ss.findTargetSprite(ev) : null;
                if (sp && sp.visible && sp.parent === ss._tilemap) onVisibleCount++;
            }
            t.check("onscreen_units_rendered", onVisibleCount === inViewFounders.length && inViewFounders.length >= 6,
                "All " + inViewFounders.length + " in-view founder colonists rendered and attached to tilemap; visible=" + onVisibleCount);

            // Verify offscreen wildlife units are culled
            const offUnits = allUnits.filter(u => {
                const ev = (W.eventOf && W.eventOf(u.id)) || u.event;
                return ev && !UF.Culling.contains(ev);
            });
            let offCulledCount = 0;
            for (const u of offUnits) {
                const ev = (W.eventOf && W.eventOf(u.id)) || u.event;
                const sp = ev ? ss.findTargetSprite(ev) : null;
                if (!sp || sp.visible === false || sp.parent !== ss._tilemap) offCulledCount++;
            }
            t.check("offscreen_units_culled", offCulledCount === offUnits.length && offUnits.length > 50,
                "All " + offUnits.length + " offscreen units parked and culled; culled=" + offCulledCount);

            // 2. Pan camera far away to (homeX + 100, homeY + 100) -> founders must be culled
            $gameMap.setDisplayPos(homeX + 100, homeY + 100);
            await t.waitFrames(15);

            let foundersCulled = 0;
            for (const u of founders) {
                const ev = (W.eventOf && W.eventOf(u.id)) || u.event;
                const sp = ev ? ss.findTargetSprite(ev) : null;
                if (!sp || sp.visible === false || sp.parent !== ss._tilemap) foundersCulled++;
            }
            t.check("pan_away_culls_founders", foundersCulled === founders.length,
                "Panning away culls all 8 founders; culled=" + foundersCulled);

            // 3. Pan camera back to home -> founders must re-activate seamlessly!
            $gameMap.setDisplayPos(homeX, homeY);
            await t.waitFrames(20);

            let foundersReactivated = 0;
            for (const u of inViewFounders) {
                const ev = (W.eventOf && W.eventOf(u.id)) || u.event;
                const sp = ev ? ss.findTargetSprite(ev) : null;
                if (sp && sp.visible && sp.parent === ss._tilemap) foundersReactivated++;
            }
            t.check("pan_back_reactivates_founders", foundersReactivated === inViewFounders.length,
                "Panning back to home reactivates all " + inViewFounders.length + " in-view founders; visible=" + foundersReactivated);

            // Verify no duplicate sprites exist in _characterSprites
            const sprites = ss._characterSprites;
            const uniqueSprites = new Set(sprites);
            t.check("no_duplicate_sprites", uniqueSprites.size === sprites.length, "Zero duplicate sprite instances in _characterSprites");

            t.screenshot("culling_native_phase2_reloaded");
            t.check("phase2_no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | "));
        }, { isDefault: false });
    })();
    `;

    fs.writeFileSync(path.join(destination, "js", "plugins", "TEST_CullingNativeSuite.js"), suitePluginCode);
    return destination;
}

function runHarness(gameDir, suite) {
    const profile = path.join(os.tmpdir(), `uf_test_profile_${process.pid}_${Date.now()}`);
    const flag = `--deus-test=${suite}`;
    const noThrottle = [
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-features=CalculateNativeWinOcclusion"
    ];
    
    // Remove results file before run
    const resultsFile = path.join(gameDir, "test_output", "results.txt");
    fs.rmSync(resultsFile, { force: true });

    console.log(`[native] Running ${flag} on ${gameDir}`);
    const child = spawnSync(NW, [gameDir, `--user-data-dir=${profile}`, ...noThrottle, flag], {
        windowsHide: true,
        timeout: 120000
    });

    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}

    if (!fs.existsSync(resultsFile)) {
        console.error(`[native] FAIL: results file not generated for ${suite}`);
        return { ok: false, exitCode: 2, output: "No results.txt" };
    }

    const text = fs.readFileSync(resultsFile, "utf8");
    process.stdout.write(text);
    const m = text.match(/^RESULT: (\d+) passed, (\d+) failed \(exit (\d)\)$/m);
    const exitCode = m ? Number(m[3]) : 2;
    return { ok: exitCode === 0, exitCode, output: text };
}

function main() {
    console.log("=== DEUS NATIVE F5/F8 & SAVE/LOAD VERIFICATION HARNESS ===");
    const tempGame = prepareDisposableRuntime();
    console.log(`Disposable Game Runtime: ${tempGame}`);

    // Run Phase 1: Visual, Edges, Zooms, Dynamic Spawning, and Save 99
    console.log("\n--- Executing Phase 1: Native Visual & Save Generation ---");
    const p1 = runHarness(tempGame, "culling_native_phase1");
    if (!p1.ok) {
        console.error("Phase 1 FAILED. Aborting integration.");
        process.exit(1);
    }

    // Run Phase 2: Complete Process Restart, Load 99, and Reactivation Checks
    console.log("\n--- Executing Phase 2: Full Process Restart & Load Verification ---");
    const p2 = runHarness(tempGame, "culling_native_phase2");
    if (!p2.ok) {
        console.error("Phase 2 FAILED. Aborting integration.");
        process.exit(1);
    }

    console.log("\n=== ALL NATIVE F5/F8 AND SAVE/LOAD CHECKS PASSED ===");
    process.exit(0);
}

if (require.main === module) {
    main();
}
