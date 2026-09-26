#!/usr/bin/env node
// SIM.50.01 gap audit probe (read-only; touches nothing in game/ or tools/).
// Question: when DEUS_Core loads DEUS_Fluid with require() (DEUS_Core.js:73-104), does DEUS_Fluid register itself on
// window.UF, the object every consumer reads (DEUS_Levels.js:1890, DEUS_World.js:1994, DEUS_Minimap.js:300)?
// DEUS_Fluid.js:44 is `var UF = UF || {};` and DEUS_Fluid.js:1023 is `UF.Fluid = Fluid;`. Under a CommonJS module
// wrapper `var UF` is a function-local binding, so the probe expects window.UF.Fluid to stay unset.
// The probe loads the file two ways and prints what each one bound:
//   A. require() of the file as it is at the given commit (what DEUS_Core does in NW.js)
//   B. evaluation as a classic script in one shared global (what a plugins.js entry / vm test harness does)
// It gives the module every engine global it looks for (window, Game_Map, DataManager, UF.Events), i.e. the most
// favourable case for binding. It does not run NW.js; it tests the JavaScript scoping rule only.
// Exit 0 when A leaves window.UF.Fluid unset and B sets it (the expected contrast); exit 1 otherwise.
// Control (Rule 4, the probe must be able to fail): --control rewrites DEUS_Fluid.js:44 to `var UF = window.UF || {};`
// before loading; then A binds too, the contrast is gone, and the probe must exit 1.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const CONTROL = process.argv.includes("--control");
const COMMIT = process.argv.slice(2).find(a => !a.startsWith("--")) || "75cf2ff3";
const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
let src = execFileSync("git", ["show", `${COMMIT}:game/js/plugins/DEUS_Fluid.js`], { cwd: ROOT, encoding: "utf8" });
if (CONTROL) {
    if (!src.includes("var UF = UF || {};")) { console.log("CONTROL: line 44 not found"); process.exit(2); }
    src = src.replace("var UF = UF || {};", "var UF = window.UF || {};");
}

function engineGlobals(target) {
    const listeners = [];
    target.window = target;
    target.UF = { Events: { on: (name, fn) => listeners.push(name), emit() {} } };
    target.Game_Map = function Game_Map() {};
    target.Game_Map.prototype.update = function () {};
    target.DataManager = { makeSaveContents: () => ({}), extractSaveContents() {} };
    target.setInterval = setInterval; target.clearInterval = clearInterval; target.setTimeout = setTimeout;
    target.performance = { now: () => 0 };
    return listeners;
}

// A. require()
const tmp = path.join(os.tmpdir(), `deus_fluid_probe_${process.pid}.js`);
fs.writeFileSync(tmp, src);
const listenersA = engineGlobals(global);
const exported = require(tmp);
const a = {
    windowUFFluidSet: !!(global.window.UF && global.window.UF.Fluid),
    moduleExportsIsFluid: !!(exported && typeof exported.tick === "function"),
    eventListenersAttached: listenersA.length,
    gameMapUpdatePatched: global.Game_Map.prototype.update.toString().includes("Fluid.tick")
};
fs.unlinkSync(tmp);

// B. classic script in a shared global
const sandbox = {};
const listenersB = engineGlobals(sandbox);
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "DEUS_Fluid.js" });
const b = {
    windowUFFluidSet: !!(sandbox.window.UF && sandbox.window.UF.Fluid),
    eventListenersAttached: listenersB.length,
    gameMapUpdatePatched: sandbox.Game_Map.prototype.update.toString().includes("Fluid.tick")
};

console.log(`DEUS_Fluid.js at ${COMMIT}${CONTROL ? " (CONTROL: line 44 rewritten to bind window.UF)" : ""}`);
console.log(`A require():      window.UF.Fluid set: ${a.windowUFFluidSet}; module.exports is the Fluid API: ${a.moduleExportsIsFluid}; ` +
    `UF.Events listeners attached: ${a.eventListenersAttached}; Game_Map.update patched: ${a.gameMapUpdatePatched}`);
console.log(`B classic script: window.UF.Fluid set: ${b.windowUFFluidSet}; UF.Events listeners attached: ${b.eventListenersAttached}; ` +
    `Game_Map.update patched: ${b.gameMapUpdatePatched}`);
const expected = !a.windowUFFluidSet && b.windowUFFluidSet;
console.log(expected ? "RESULT: require() leaves window.UF.Fluid unset; a classic script sets it"
    : "RESULT: unexpected (the contrast did not hold)");
process.exit(expected ? 0 : 1);
