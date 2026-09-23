#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PLUGIN = path.join(ROOT, "game/js/plugins/DEUS_HistoricalDemographics.js");
const MODULES = ["World", "WorldGen", "Factions", "History", "Levels"];

function loadEngine() {
    const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "game/data/UF_WorldCatalog.json"), "utf8"));
    const env = {
        window: null, UF: {}, DEUS: {}, Math: Object.create(Math), console, performance,
        PluginManager: { parameters: () => ({}), registerCommand() {} },
        DataManager: { _databaseFiles: [], onLoad() {}, isBattleTest: () => false, isEventTest: () => false },
        Input: { keyMapper: {} }, TouchInput: {}, SceneManager: { _scene: null },
        Graphics: { frameCount: 0, boxWidth: 816, boxHeight: 624 }, $gameMap: { mapId: () => 0 }, $gamePlayer: {}, $gameSystem: {},
        ImageManager: { loadTileset() {} }, Utils: { isOptionValid: () => false },
        Scene_Boot: { prototype: { start() {} } },
        Tilemap: { FLOOR_AUTOTILE_TABLE: [] }, Sprite: function() {}
    };
    env.$ufWorldCatalog = cat;
    env.$deusWorldCatalog = cat;
    env.window = env;

    const filePaths = MODULES.map(m => `DEUS_${m}.js`);
    filePaths.push("DEUS_HistoricalDemographics.js");
    const sources = filePaths.map(f => fs.readFileSync(path.join(ROOT, "game/js/plugins", f), "utf8"));
    const names = new Set(["Sprite", "Window_Base", "Window_Selectable", "Scene_Map", "Scene_Boot", "Rectangle"]);
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype/g)) names.add(m[1]);
    for (const name of names) env[name] = function() {};
    for (const name of names) env[name].prototype = {};
    for (const source of sources) for (const m of source.matchAll(/\b((?:Game|Scene|Window|Spriteset|Sprite)_[A-Za-z0-9_]+)\.prototype\.([A-Za-z0-9_]+)/g)) {
        env[m[1]].prototype[m[2]] = () => {};
    }

    sources.forEach((src, i) => vm.runInNewContext(src, env, { filename: filePaths[i] }));
    const world = env.UF.World.newWorld(20260923);
    env.UF.Levels.ensureWorldLevels(world);
    env.UF.Factions.generate(world);
    env.UF.History.generate(world);
    return { api: env.UF.HistoricalDemographics, world };
}

if (process.argv.includes("--child-hash")) {
    const idx = process.argv.indexOf("--child-hash");
    const { api, world } = loadEngine();
    const p = JSON.parse(process.argv[idx + 1]);
    const s = api.create(world, { profiles: p });
    process.stdout.write(s.profileHash);
    process.exit(0);
}

function runTests() {
    const { api, world } = loadEngine();
    let passed = 0, failed = 0;
    const assert = (condition, msg) => {
        if (!condition) {
            console.error(`FAIL: ${msg}`);
            failed++;
            throw new Error(msg);
        }
        passed++;
    };

    console.log("=== Fast Local Metadata & Provenance Contract Suite ===");

    // 1. Promoted defaults
    const def = api.create(world);
    assert(def.profileKind === "promoted-default", "1.1 profileKind is promoted-default");
    assert(def.profileId === "v1", "1.2 profileId is v1");
    assert(def.profileVersion === "1.0.0-provisional-astra08", "1.3 profileVersion is 1.0.0-provisional-astra08");
    assert(typeof def.profileHash === "string" && /^[0-9a-f]{64}$/.test(def.profileHash), "1.4 deterministic 64-hex profileHash");
    console.log("PASS 1: Promoted defaults metadata");

    // 2. Custom biology
    const customProfiles = JSON.parse(JSON.stringify(api.DEFAULT_PROFILES));
    customProfiles.human.birthChance = 0.123;
    const custom = api.create(world, { profiles: customProfiles, demographicProfileVersion: "v1" });
    assert(custom.profileKind === "custom", "2.1 custom profileKind is custom");
    assert(custom.profileId === null, "2.2 custom profileId is null even if caller requested v1");
    assert(custom.demographicProfileVersion === "custom", "2.3 demographicProfileVersion normalized to custom");
    assert(typeof custom.profileHash === "string" && /^[0-9a-f]{64}$/.test(custom.profileHash), "2.4 custom profileHash present");
    console.log("PASS 2: Custom biology metadata and provenance protection");

    // 3. Changing biological parameter changes hash
    const custom2 = JSON.parse(JSON.stringify(customProfiles));
    custom2.human.birthChance = 0.124;
    const customDiff = api.create(world, { profiles: custom2 });
    assert(custom.profileHash !== def.profileHash, "3.1 custom hash differs from promoted default hash");
    assert(custom.profileHash !== customDiff.profileHash, "3.2 single parameter change alters profileHash");
    console.log("PASS 3: Biological parameter alteration changes profileHash");

    // 4. Identical custom profile produces identical hash across fresh processes
    const sameCustom = api.create(world, { profiles: JSON.parse(JSON.stringify(customProfiles)) });
    assert(custom.profileHash === sameCustom.profileHash, "4.1 identical custom profiles yield identical profileHash");
    // Cross-process check
    const child = spawnSync(process.execPath, [__filename, "--child-hash", JSON.stringify(customProfiles)], { encoding: "utf8" });
    if (child.status !== 0 || child.stdout !== custom.profileHash) {
        console.error("child stderr:", child.stderr, "stdout:", child.stdout);
    }
    assert(child.status === 0 && child.stdout === custom.profileHash, "4.2 cross-process SHA-256 repeatability");
    console.log("PASS 4: Fresh-process profileHash repeatability");

    // 5. Schema, model, and capacity IDs validate independently
    assert(def.schemaVersion === 7, "5.1 schemaVersion is 7");
    assert(def.historyModelId === "historical_demographics_v1", "5.2 historyModelId is historical_demographics_v1");
    assert(def.historyModelVersion === 1, "5.3 historyModelVersion is 1");
    assert(def.capacityModelId === "local_density_v1", "5.4 capacityModelId is local_density_v1");
    assert(def.capacityModelVersion === 1, "5.5 capacityModelVersion is 1");
    assert(api.validate(def) === true, "5.6 validate(def) passes");
    console.log("PASS 5: Independent schema and model identifiers");

    // 6. Unsupported model IDs fail
    const badHistoryModel = JSON.parse(JSON.stringify(def));
    badHistoryModel.historyModelId = "unsupported_history_model";
    let caughtHistory = false;
    try { api.validate(badHistoryModel); } catch (_) { caughtHistory = true; }
    assert(caughtHistory, "6.1 unsupported historyModelId rejected");

    const badHistoryVersion = JSON.parse(JSON.stringify(def));
    badHistoryVersion.historyModelVersion = 999;
    let caughtHistVer = false;
    try { api.validate(badHistoryVersion); } catch (_) { caughtHistVer = true; }
    assert(caughtHistVer, "6.2 unsupported historyModelVersion rejected");

    const badCapacityModel = JSON.parse(JSON.stringify(def));
    badCapacityModel.capacityModelId = "unsupported_capacity_model";
    let caughtCapacity = false;
    try { api.validate(badCapacityModel); } catch (_) { caughtCapacity = true; }
    assert(caughtCapacity, "6.3 unsupported capacityModelId rejected");

    const badCapacityVersion = JSON.parse(JSON.stringify(def));
    badCapacityVersion.capacityModelVersion = 999;
    let caughtCapVer = false;
    try { api.validate(badCapacityVersion); } catch (_) { caughtCapVer = true; }
    assert(caughtCapVer, "6.4 unsupported capacityModelVersion rejected");

    const badConfigCapacity = JSON.parse(JSON.stringify(def));
    badConfigCapacity.config.capacityModel.id = "TEST_UNSUPPORTED_CAPACITY";
    let caughtConfigCap = false;
    try { api.validate(badConfigCapacity); } catch (_) { caughtConfigCap = true; }
    assert(caughtConfigCap, "6.5 unsupported config.capacityModel.id rejected");

    let caughtCreateCap = false;
    try { api.create(world, { capacityModel: { id: "TEST_UNSUPPORTED_CAPACITY" } }); } catch (_) { caughtCreateCap = true; }
    assert(caughtCreateCap, "6.6 create with unsupported capacityModel.id rejected");

    const spoofedProfile = JSON.parse(JSON.stringify(custom));
    spoofedProfile.profileKind = "promoted-default";
    let caughtSpoof = false;
    try { api.validate(spoofedProfile); } catch (_) { caughtSpoof = true; }
    assert(caughtSpoof, "6.7 custom profile pretending to be promoted-default rejected");
    console.log("PASS 6: Rejection of unsupported models and spoofed provenance");

    // 7. Save / load roundtrip preserves all metadata exactly
    const serialized = JSON.stringify(def);
    const restored = JSON.parse(serialized);
    assert(api.validate(restored) === true, "7.1 restored state validates");
    assert(restored.schemaVersion === def.schemaVersion, "7.2 restored schemaVersion identical");
    assert(restored.historyModelId === def.historyModelId, "7.3 restored historyModelId identical");
    assert(restored.historyModelVersion === def.historyModelVersion, "7.4 restored historyModelVersion identical");
    assert(restored.capacityModelId === def.capacityModelId, "7.5 restored capacityModelId identical");
    assert(restored.capacityModelVersion === def.capacityModelVersion, "7.6 restored capacityModelVersion identical");
    assert(restored.profileKind === def.profileKind, "7.7 restored profileKind identical");
    assert(restored.profileId === def.profileId, "7.8 restored profileId identical");
    assert(restored.profileVersion === def.profileVersion, "7.9 restored profileVersion identical");
    assert(restored.profileHash === def.profileHash, "7.10 restored profileHash identical");
    console.log("PASS 7: Serialization / deserialization roundtrip preservation");

    // 8. Migration preserves and assigns correct provenance
    // Generate a minimal populated v6-style state
    const v6State = {
        version: 6,
        domain: "historical",
        seed: 20260923,
        yearsSimulated: 0,
        startYear: 1,
        currentYear: 1,
        dimensions: def.dimensions,
        config: {
            profiles: customProfiles,
            names: def.config.names,
            recentYears: 20,
            eventLimit: 400,
            dynastyInheritance: "maternal",
            compression: "deferred"
        },
        factions: def.factions,
        sites: JSON.parse(JSON.stringify(def.sites)).map(s => {
            const copy = Object.assign({}, s);
            delete copy.historicalCapacity;
            return copy;
        }),
        people: JSON.parse(JSON.stringify(def.people)),
        dynasties: JSON.parse(JSON.stringify(def.dynasties)),
        rulers: JSON.parse(JSON.stringify(def.rulers)),
        partnerships: JSON.parse(JSON.stringify(def.partnerships)),
        events: JSON.parse(JSON.stringify(def.events)),
        nextEventId: def.nextEventId,
        eventsDiscarded: 0
    };
    api.migrate(v6State);
    assert(v6State.version === 7 && v6State.schemaVersion === 7, "8.1 migration upgrades schema to 7");
    assert(v6State.historyModelId === "historical_demographics_v1" && v6State.historyModelVersion === 1, "8.2 migration assigns history model v1");
    assert(v6State.capacityModelId === "local_density_v1" && v6State.capacityModelVersion === 1, "8.3 migration assigns capacity model v1");
    assert(v6State.profileKind === "custom", "8.4 migration detects custom biology in legacy state");
    assert(v6State.profileId === null, "8.5 migration sets profileId to null for custom legacy biology");
    assert(v6State.profileHash === custom.profileHash, "8.6 migration computes deterministic profileHash matching custom biology");
    assert(v6State.demographicProfileVersion === "custom", "8.7 migration assigns demographicProfileVersion custom for custom biology");
    assert(api.validate(v6State) === true, "8.8 migrated state validates cleanly");
    console.log("PASS 8: Migration provenance and validity");

    console.log(`\nALL METADATA CONTRACTS PASSED (${passed} checks, 0 failed).`);
}

try {
    runTests();
    process.exitCode = 0;
} catch (e) {
    console.error(`FATAL: ${e.message}`);
    process.exitCode = 1;
}
