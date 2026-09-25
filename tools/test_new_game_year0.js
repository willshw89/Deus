#!/usr/bin/env node
"use strict";

/**
 * tools/test_new_game_year0.js
 *
 * Verification suite for INV-SIM-01 / ATK-YEAR0-001:
 * Proves standard New Game begins at World Year 0.
 *
 * Required gates:
 * 1. Default embark year in Window_NewGameSetup is 0.
 * 2. UF.NewGameSetup.year === 0 when setup window is not touched during embark.
 * 3. Fallback year in onNewGameEmbark is 0 (not 1).
 * 4. Rule 4 mutant check: a mutant restoring default 1 MUST be caught and exit 1.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PLUGINS = path.join(ROOT, "game", "js", "plugins");

function createEnv(sourceOverrides = {}) {
    const ns = {};
    const env = {
        window: null,
        document: {
            createElement: () => ({
                style: {},
                addEventListener: () => {},
                appendChild: () => {},
                parentNode: { removeChild: () => {} },
                focus: () => {},
                select: () => {},
                blur: () => {}
            }),
            getElementById: () => null,
            head: { appendChild: () => {} },
            body: { style: {}, appendChild: () => {} }
        },
        Math,
        parseInt,
        isNaN,
        String,
        Rectangle: function(x, y, w, h) { this.x = x; this.y = y; this.width = w; this.height = h; },
        PIXI: { InteractionManager: function() {} },
        PluginManager: { parameters: () => ({}), registerCommand: () => {} },
        SceneManager: { goto: () => {} },
        Graphics: { boxWidth: 816, boxHeight: 624 },
        ImageManager: { loadSystem: () => ({ isReady: () => true }) },
        SoundManager: { playCursor: () => {}, playOk: () => {}, playCancel: () => {} },
        DataManager: { setupNewGame: () => {} },
        TouchInput: { clear: () => {} },
        Input: { clear: () => {}, keyMapper: {} },
        $gameSystem: {},
        UF: ns,
        DEUS: ns
    };
    env.window = env;
    const rmmzClasses = [
        "Window_Base", "Window_Selectable", "Window_TitleCommand", "Window_SavefileList",
        "Scene_Base", "Scene_Boot", "Scene_Title", "Scene_Map", "Scene_MenuBase", "Scene_Menu",
        "Game_Actor", "Sprite", "Bitmap"
    ];
    for (const name of rmmzClasses) {
        env[name] = vm.runInNewContext(`(function ${name}(){ if (this.initialize) this.initialize(...arguments); })`);
        env[name].prototype.initialize = function() {};
    }
    env.Window_Selectable.prototype.initialize = function() {
        this.innerWidth = 318;
        this.contents = { fontSize: 16 };
        this.contentsBack = { fillRect: () => {} };
    };
    env.Window_Selectable.prototype.open = function() {};
    env.Window_Selectable.prototype.close = function() {};
    env.Window_Selectable.prototype.index = function() { return this._index || 0; };
    env.Window_Selectable.prototype.select = function(i) { this._index = i; };
    env.Window_Selectable.prototype.refresh = function() {};
    env.Window_Selectable.prototype.redrawItem = function() {};
    env.Window_Selectable.prototype.itemLineRect = function() { return new env.Rectangle(0, 0, 100, 32); };
    env.Scene_Title.prototype.addWindow = function() {};
    env.Scene_Title.prototype.fadeOutAll = function() {};

    let src = fs.readFileSync(path.join(PLUGINS, "DEUS_FactionMenus.js"), "utf8");
    for (const [target, replacement] of Object.entries(sourceOverrides)) {
        if (!src.includes(target)) {
            throw new Error(`Override target not found in DEUS_FactionMenus.js: ${target.slice(0, 50)}`);
        }
        src = src.replace(target, replacement);
    }

    const ctx = vm.createContext(env);
    vm.runInContext(src, ctx, { filename: "DEUS_FactionMenus.js" });
    return env;
}

function runChecks(env) {
    const failures = [];
    const checks = [];

    // Check 1: Window_NewGameSetup default _year is 0
    const win = new env.Window_NewGameSetup(new env.Rectangle(0, 0, 350, 285));
    const winYear = win.currentYear();
    checks.push({
        name: "window_default_year_is_0",
        pass: winYear === 0,
        msg: `Window_NewGameSetup.currentYear() === ${winYear} (expected 0)`
    });

    // Check 2: onNewGameEmbark without touching window sets UF.NewGameSetup.year to 0
    const titleScene = new env.Scene_Title();
    titleScene._newGameSetupWindow = win;
    titleScene.onNewGameEmbark();
    const embarkYear = env.UF.NewGameSetup ? env.UF.NewGameSetup.year : null;
    checks.push({
        name: "embark_year_is_0",
        pass: embarkYear === 0,
        msg: `UF.NewGameSetup.year === ${embarkYear} on untouched embark (expected 0)`
    });

    // Check 3: fallback when setup window is null is 0 (not 1)
    const titleSceneNoWin = new env.Scene_Title();
    titleSceneNoWin._newGameSetupWindow = null;
    titleSceneNoWin.onNewGameEmbark();
    const fallbackYear = env.UF.NewGameSetup ? env.UF.NewGameSetup.year : null;
    checks.push({
        name: "fallback_embark_year_is_0",
        pass: fallbackYear === 0,
        msg: `Fallback UF.NewGameSetup.year === ${fallbackYear} when window is null (expected 0)`
    });

    for (const c of checks) {
        if (!c.pass) failures.push(`FAIL ${c.name}: ${c.msg}`);
    }

    return { checks, failures };
}

function main() {
    console.log("=== DEUS NEW GAME YEAR 0 TEST SUITE (INV-SIM-01) ===");

    // 1. Baseline Run on Active Code
    const env = createEnv();
    const { checks, failures } = runChecks(env);

    for (const c of checks) {
        console.log(`  [${c.pass ? "PASS" : "FAIL"}] ${c.name}: ${c.msg}`);
    }

    if (failures.length > 0) {
        console.error("\nTEST SUITE FAILED:");
        for (const f of failures) console.error("  " + f);
        process.exit(1);
    }

    // 2. Rule 4 Mutant Verification (Test Must Be Able to Fail)
    console.log("\n--- Rule 4 Mutation Check: Mutant Restoring Default 1 ---");
    const mutantEnv = createEnv({
        "this._year = 0;": "this._year = 1; /* MUTANT */"
    });
    const mutantResult = runChecks(mutantEnv);
    const mutantCaught = mutantResult.failures.some(f => f.includes("window_default_year_is_0") || f.includes("embark_year_is_0"));

    if (mutantCaught) {
        console.log(`  [PASS] rule4_mutant_caught: Mutant restoring default 1 caught (${mutantResult.failures.length} failures triggered)`);
    } else {
        console.error("  [FAIL] rule4_mutant_caught: Mutant restoring default 1 was NOT caught!");
        process.exit(1);
    }

    console.log("\n==================================================");
    console.log("ALL YEAR 0 CHECKS PASSED (INV-SIM-01 VERIFIED). EXIT 0.");
    console.log("==================================================");
    process.exit(0);
}

main();
