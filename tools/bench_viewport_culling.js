#!/usr/bin/env node
"use strict";

// Real RMMZ / PIXI microbenchmark; no simulated timings or synthetic busy loops.
//
// node tools/bench_viewport_culling.js --prepare --minimal
// node tools/run_tests.js culling --game <printed disposable game path>
// node tools/bench_viewport_culling.js --minimal
// node tools/bench_viewport_culling.js            (full baseline plugin stack)
//
// Only an OS-temporary runtime is written. The source game, plugin registration,
// database, assets and saves stay read-only. Generated runtime files are fixtures,
// not patch deliverables. --prepare stops before launching NW.js.
//
// Timing scope: 300 engine-domain fixture frames, each containing 64 genuine
// Game_Character updates, the culling manager query, Tilemap.update and a genuine
// PIXI renderer.render submission. This is CPU submission time, not GPU completion,
// wall-clock frame cadence or a 30-second gameplay/FPS measurement. Counters count
// Sprite_Character.update/updateFrame and Sprite._render invocations, not GPU draw calls.

const fs = require("fs");
const path = require("path");
const os = require("os");
const vm = require("vm");
const { spawnSync } = require("child_process");

function runtimeBenchmark(config) {
    "use strict";
    const mapSize = 256;
    const characterCount = 64;
    const frames = 300;
    const warmupFrames = 60;
    const seed = 0x41535452;
    const images = ["$UF_Human", "$UF_Deer"];

    function fixtureMap() {
        return {
            width: mapSize, height: mapSize, scrollType: 3, tilesetId: 1,
            data: new Array(mapSize * mapSize * 6).fill(0), events: [null],
            displayName: "TEST_ViewportCulling", note: "", meta: {},
            autoplayBgm: false, autoplayBgs: false,
            bgm: { name: "", volume: 0, pitch: 100, pan: 0 },
            bgs: { name: "", volume: 0, pitch: 100, pan: 0 },
            battleback1Name: "", battleback2Name: "", disableDashing: false,
            encounterList: [], encounterStep: 30, parallaxName: "",
            parallaxLoopX: false, parallaxLoopY: false, parallaxShow: false,
            parallaxSx: 0, parallaxSy: 0, specifyBattleback: false
        };
    }

    // A minimal runtime avoids loading unrelated simulation systems and legacy
    // culling. Intercept the in-memory map load; no database JSON is edited.
    if (config.minimal) {
        DataManager.loadMapData = function() {
            window.$dataMap = fixtureMap();
        };
    }

    UF.Test.suite("culling_benchmark", async t => {
        t.check("real_runtime", Utils.isNwjs() && !!Graphics.app.renderer,
            `RMMZ ${Utils.RPGMAKER_VERSION}; PIXI ${PIXI.VERSION}`);
        if (!t.check("plugin_loaded", !!UF.Culling && typeof UF.Culling.refresh === "function")) return;
        const bitmaps = images.map(name => ImageManager.loadCharacter(name));
        await t.waitUntil(() => bitmaps.every(b => b.isReady()), 10000, "benchmark character bitmaps");
        t.check("images_loaded", bitmaps.every(b => b.width > 0 && b.height > 0), images.join(", "));

        const oldData = $dataMap;
        const oldMap = $gameMap;
        const oldFrame = Graphics.frameCount;
        const oldEnabled = UF.Culling.enabled;
        const oldLevel = UF.Camera && UF.Camera.level();
        const oldUpdate = Sprite_Character.prototype.update;
        const oldUpdateFrame = Sprite_Character.prototype.updateFrame;
        const oldRender = Sprite.prototype._render;
        let currentCounters = null;
        const results = [];
        const setEnabled = value => {
            if (typeof UF.Culling.setEnabled === "function") UF.Culling.setEnabled(value);
            else UF.Culling.enabled = value;
        };

        Sprite_Character.prototype.update = function() {
            if (this._deusBenchmark && currentCounters) currentCounters.spriteUpdateCalls++;
            return oldUpdate.apply(this, arguments);
        };
        Sprite_Character.prototype.updateFrame = function() {
            if (this._deusBenchmark && currentCounters) currentCounters.spriteUpdates++;
            return oldUpdateFrame.apply(this, arguments);
        };
        Sprite.prototype._render = function() {
            if (this._deusBenchmark && currentCounters) currentCounters.spriteRenderCalls++;
            return oldRender.apply(this, arguments);
        };

        function randomSource() {
            let state = seed;
            return () => {
                state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
                return state / 4294967296;
            };
        }

        function phase(enabled) {
            const random = randomSource();
            setEnabled(enabled);
            Graphics.frameCount = oldFrame;
            $dataMap = fixtureMap();
            // Use actual Game_Map coordinate math and movement APIs. Avoid setup(),
            // whose integration hooks create the whole world and its unrelated AI.
            $gameMap = new Game_Map();
            $gameMap._mapId = 1;
            $gameMap._tilesetId = 1;
            $gameMap.setDisplayPos(120, 120);

            const tilemap = new Tilemap();
            tilemap.setData(mapSize, mapSize, $dataMap.data);
            tilemap.horizontalWrap = true;
            tilemap.verticalWrap = true;
            tilemap.tileWidth = $gameMap.tileWidth();
            tilemap.tileHeight = $gameMap.tileHeight();
            const zoom = UF.Camera ? UF.Camera.zoom() : 1;
            tilemap.width = Math.ceil(Graphics.width / zoom);
            tilemap.height = Math.ceil(Graphics.height / zoom);
            tilemap.scale.set(zoom, zoom);
            tilemap.origin.x = $gameMap.displayX() * tilemap.tileWidth;
            tilemap.origin.y = $gameMap.displayY() * tilemap.tileHeight;
            const stage = new PIXI.Container();
            stage.addChild(tilemap);
            const renderTarget = PIXI.RenderTexture.create({ width: Graphics.width, height: Graphics.height });
            const characters = [];
            const sprites = [];
            // Eight subjects inside the view plus 56 stratified across the map.
            // Alternate existing human/wildlife sheets; no generated artwork.
            for (let i = 0; i < characterCount; i++) {
                const character = new Game_Character();
                const x = i < 8 ? 124 + i % 4 * 2 : (i - 8) % 8 * 32 + 8 + Math.floor(random() * 16);
                const y = i < 8 ? 124 + Math.floor(i / 4) * 3 : Math.floor((i - 8) / 8) * 36 + 8 + Math.floor(random() * 16);
                character.setPosition(x, y);
                character.setImage(images[i % images.length], 0);
                character.setThrough(true);
                character.setMoveSpeed(3);
                character.setStepAnime(true);
                character._deusBenchmarkHome = { x, y };
                const sprite = new Sprite_Character(character);
                sprite._deusBenchmark = true;
                characters.push(character);
                sprites.push(sprite);
                tilemap.addChild(sprite);
            }
            const holder = { _tilemap: tilemap, _characterSprites: sprites };
            const counters = { logicalUpdates: 0, spriteUpdateCalls: 0, spriteUpdates: 0, spriteRenderCalls: 0 };
            const samples = [];
            const perFrameRenderCalls = [];
            const startPositions = characters.map(c => [c.x, c.y]);

            function tick(measured) {
                const started = performance.now();
                const before = counters.spriteRenderCalls;
                for (const character of characters) {
                    if (!character.isMoving()) {
                        const home = character._deusBenchmarkHome;
                        let direction = [2, 4, 6, 8][Math.floor(random() * 4)];
                        if (character.x < home.x - 2) direction = 6;
                        else if (character.x > home.x + 2) direction = 4;
                        else if (character.y < home.y - 2) direction = 2;
                        else if (character.y > home.y + 2) direction = 8;
                        character.moveStraight(direction);
                    }
                    character.update();
                    if (measured) counters.logicalUpdates++;
                }
                UF.Culling.refresh(holder);
                tilemap.update();
                Graphics.app.renderer.render(stage, renderTarget);
                const elapsed = performance.now() - started;
                if (measured) {
                    samples.push(elapsed);
                    perFrameRenderCalls.push(counters.spriteRenderCalls - before);
                }
                Graphics.frameCount++;
            }

            try {
                currentCounters = null;
                for (let i = 0; i < warmupFrames; i++) tick(false);
                const warmupStats = UF.Culling.stats ? UF.Culling.stats(holder) : null;
                currentCounters = counters;
                for (let i = 0; i < frames; i++) tick(true);
                currentCounters = null;
                const endPositions = characters.map(c => [c.x, c.y, c._realX, c._realY, c.isMoving()]);
                const sorted = samples.slice().sort((a, b) => a - b);
                const result = {
                    cullingEnabled: enabled,
                    frames, warmupFrames,
                    averageFrameMs: samples.reduce((sum, n) => sum + n, 0) / samples.length,
                    medianFrameMs: (sorted[149] + sorted[150]) / 2,
                    p95FrameMs: sorted[Math.ceil(frames * 0.95) - 1],
                    worstFrameMs: sorted[sorted.length - 1],
                    ...counters,
                    entryRefreshUpdates: warmupStats ? UF.Culling.stats(holder).woken - warmupStats.woken : 0,
                    minRenderedSubjectsPerFrame: Math.min(...perFrameRenderCalls),
                    maxRenderedSubjectsPerFrame: Math.max(...perFrameRenderCalls),
                    movedSubjects: endPositions.filter((p, i) => p[2] !== startPositions[i][0] || p[3] !== startPositions[i][1]).length,
                    finalLogicalState: endPositions,
                    samplesMs: samples,
                    cullingStats: UF.Culling.stats ? UF.Culling.stats(holder) : null
                };
                return result;
            } finally {
                currentCounters = null;
                if (typeof UF.Culling.release === "function") UF.Culling.release(holder);
                // Dispose fixture GPU resources, retaining shared loaded bitmaps.
                stage.destroy({ children: true, texture: false, baseTexture: false });
                renderTarget.destroy(true);
            }
        }

        try {
            if (UF.Camera && UF.Camera.levels) {
                const level = UF.Camera.levels.indexOf(1);
                if (level >= 0) UF.Camera.setLevel(level);
            }
            results.push(phase(false));
            results.push(phase(true));
        } finally {
            Sprite_Character.prototype.update = oldUpdate;
            Sprite_Character.prototype.updateFrame = oldUpdateFrame;
            Sprite.prototype._render = oldRender;
            $dataMap = oldData;
            $gameMap = oldMap;
            Graphics.frameCount = oldFrame;
            setEnabled(oldEnabled);
            if (UF.Camera && oldLevel !== undefined) UF.Camera.setLevel(oldLevel);
        }

        const [before, after] = results;
        const expectedUpdates = frames * characterCount;
        t.check("frames_measured", before.samplesMs.length === frames && after.samplesMs.length === frames, `${frames} per phase`);
        t.check("simulation_runs_every_frame", before.logicalUpdates === expectedUpdates && after.logicalUpdates === expectedUpdates,
            `disabled=${before.logicalUpdates}; enabled=${after.logicalUpdates}; expected=${expectedUpdates}`);
        t.check("same_movement_with_culling", JSON.stringify(before.finalLogicalState) === JSON.stringify(after.finalLogicalState),
            `seed=${seed}; moved disabled=${before.movedSubjects}, enabled=${after.movedSubjects}`);
        t.check("moving_subjects", before.movedSubjects > characterCount / 2 && after.movedSubjects > characterCount / 2);
        t.check("real_render_calls", before.spriteRenderCalls > 0 && after.spriteRenderCalls > 0);
        t.check("fewer_sprite_update_calls", after.spriteUpdateCalls < before.spriteUpdateCalls,
            `disabled=${before.spriteUpdateCalls}; enabled=${after.spriteUpdateCalls}`);
        // A newly visible sprite refreshes before rendering, then participates
        // in that frame's normal Tilemap.update. Count that explicit entry cost.
        t.check("frame_updates_within_entry_refresh_budget", after.spriteUpdates <= before.spriteUpdates + after.entryRefreshUpdates,
            `disabled=${before.spriteUpdates}; enabled=${after.spriteUpdates}; entry refreshes=${after.entryRefreshUpdates}`);
        t.check("render_calls_do_not_increase", after.spriteRenderCalls <= before.spriteRenderCalls,
            `disabled=${before.spriteRenderCalls}; enabled=${after.spriteRenderCalls}`);
        if (config.minimal) {
            t.check("unculled_baseline_updates_all", before.spriteUpdates === expectedUpdates);
            t.check("unculled_baseline_renders_all", before.spriteRenderCalls === expectedUpdates);
            t.check("fewer_frame_updates", after.spriteUpdates < before.spriteUpdates);
            t.check("fewer_render_calls", after.spriteRenderCalls < before.spriteRenderCalls);
        }
        t.check("finite_measurements", results.every(r => r.samplesMs.every(n => Number.isFinite(n) && n >= 0)));
        t.check("no_runtime_errors", t.errorsSoFar().length === 0, t.errorsSoFar().join(" | "));

        const nodeFs = require("fs");
        const nodePath = require("path");
        const nodeOs = require("os");
        const report = {
            method: "CPU performance.now: Game_Character.update + UF.Culling.refresh + Tilemap.update + PIXI renderer.render to RenderTexture; GPU execution is asynchronous",
            scope: config.minimal ? "stock RMMZ + DEUS_Camera + DEUS_Culling" : "baseline DEUS plugins, including existing legacy perspective/animation culling",
            order: ["disabled", "enabled"],
            warning: "300-frame controlled microbenchmark; not 30-second gameplay FPS or total-world AI/job profiling",
            map: { width: mapSize, height: mapSize, looping: "both", characters: characterCount },
            seed, timeDomain: "engine", viewport: { width: Graphics.width, height: Graphics.height, zoom: 1 },
            machine: { platform: process.platform, arch: process.arch, cpu: nodeOs.cpus()[0].model,
                node: process.version, nw: process.versions.nw, chromium: process.versions.chromium,
                rmmz: Utils.RPGMAKER_VERSION, pixi: PIXI.VERSION },
            results
        };
        const reportPath = nodePath.join(nw.__dirname || process.cwd(), "test_output", "viewport_culling_benchmark.json");
        nodeFs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
        UF.Test.write(`BENCHMARK_REPORT ${reportPath}`);
        for (const result of results) {
            UF.Test.write(`BENCHMARK culling=${result.cullingEnabled ? "enabled" : "disabled"} frames=${result.frames}` +
                ` averageFrameMs=${result.averageFrameMs} worstFrameMs=${result.worstFrameMs}` +
                ` spriteUpdateCalls=${result.spriteUpdateCalls} frameUpdates=${result.spriteUpdates}` +
                ` spriteRenderCalls=${result.spriteRenderCalls}` +
                ` logicalUpdates=${result.logicalUpdates}`);
        }
    }, { isDefault: false });
}

function prepare(options) {
    const game = path.resolve(options.game || path.join(__dirname, "..", "game"));
    const fallback = options.runtimeSource && path.resolve(options.runtimeSource);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "deus_astra_culling_"));
    const destination = path.join(root, "game");
    const omit = new Set(["save", "test_output", "node_modules", ".git"]);
    function copy(source, target, missingOnly) {
        fs.mkdirSync(target, { recursive: true });
        for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
            if (omit.has(entry.name) || /\.(?:log|bak|tmp)$/.test(entry.name)) continue;
            const src = path.join(source, entry.name);
            const dst = path.join(target, entry.name);
            if (entry.isDirectory()) copy(src, dst, missingOnly);
            else if (entry.isFile() && (!missingOnly || !fs.existsSync(dst))) fs.copyFileSync(src, dst);
        }
    }
    copy(game, destination, false);
    // Missing, ignored stock assets can be supplied explicitly from canonical.
    // Do not overlay code/data from another working copy onto the pinned baseline.
    if (fallback) {
        for (const directory of ["img", "audio", "fonts", "icon"]) {
            if (fs.existsSync(path.join(fallback, directory))) copy(path.join(fallback, directory), path.join(destination, directory), true);
        }
    }
    const pluginListFile = path.join(destination, "js", "plugins.js");
    const context = {};
    vm.runInNewContext(fs.readFileSync(pluginListFile, "utf8"), context);
    const entry = (name, parameters = {}) => ({ name, status: true, description: "TEST_ViewportCulling disposable runtime", parameters });
    let plugins = options.minimal ? [entry("DEUS_Test"), entry("DEUS_Camera", { Levels: "2,1,0.5", StartLevel: "1" })] : context.$plugins;
    plugins = plugins.filter(p => p.name !== "DEUS_Culling" && p.name !== "TEST_ViewportCullingBenchmark");
    if (!plugins.some(p => /^(?:DEUS|UF)_Test$/.test(p.name) && p.status)) plugins.push(entry("DEUS_Test"));
    plugins.push(entry("DEUS_Culling"), entry("TEST_ViewportCullingBenchmark"));
    for (const plugin of plugins.filter(p => p.status)) {
        if (plugin.name !== "TEST_ViewportCullingBenchmark" && !fs.existsSync(path.join(destination, "js", "plugins", plugin.name + ".js"))) {
            throw new Error(`Missing enabled plugin ${plugin.name} in source ${game}`);
        }
    }
    fs.writeFileSync(pluginListFile, "// Disposable benchmark registration.\nvar $plugins = " + JSON.stringify(plugins, null, 2) + ";\n");
    fs.writeFileSync(path.join(destination, "js", "plugins", "TEST_ViewportCullingBenchmark.js"),
        "// Generated exclusively for this disposable runtime.\n(" + runtimeBenchmark.toString() + ")(" + JSON.stringify({ minimal: options.minimal }) + ");\n");
    fs.writeFileSync(path.join(root, "fixture.json"), JSON.stringify({ sourceGame: game, minimal: options.minimal, createdAt: new Date().toISOString() }, null, 2) + "\n");
    return destination;
}

function main(args) {
    if (args.includes("--help")) {
        console.log("Usage: node tools/bench_viewport_culling.js [--prepare] [--minimal] [--game <source game>] [--runtime-source <missing asset source>]");
        console.log("Default: run the real NW.js benchmark in a new disposable OS-temp copy with baseline plugins.");
        console.log("--minimal: stock RMMZ + camera + culling; gives an actually unculled before baseline.");
        console.log("--prepare: print the disposable game path without launching NW.js; use it with tools/run_tests.js culling --game.");
        return 0;
    }
    const options = { minimal: args.includes("--minimal") };
    for (let i = 0; i < args.length; i++) {
        if (["--prepare", "--minimal"].includes(args[i])) continue;
        if (args[i] === "--game" || args[i] === "--runtime-source") {
            const name = args[i] === "--game" ? "game" : "runtimeSource";
            const value = args[++i];
            if (!value || value.startsWith("--")) throw new Error(`Missing value for ${args[i - 1]}`);
            options[name] = value;
        } else throw new Error(`Unknown argument ${args[i]}; use --help`);
    }
    const destination = prepare(options);
    console.log(`DISPOSABLE_GAME ${destination}`);
    if (args.includes("--prepare")) return 0;
    const result = spawnSync(process.execPath, [path.join(__dirname, "run_tests.js"), "culling_benchmark", "--game", destination],
        { stdio: "inherit", cwd: destination, windowsHide: true });
    if (result.error) throw result.error;
    return result.status === null ? 2 : result.status;
}

if (require.main === module) {
    try { process.exitCode = main(process.argv.slice(2)); }
    catch (error) { console.error(`BENCHMARK ERROR: ${error.stack || error}`); process.exitCode = 2; }
}

module.exports = { prepare, runtimeBenchmark };
