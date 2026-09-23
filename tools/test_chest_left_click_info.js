// tools/test_chest_left_click_info.js
// Verification suite: Clicking the chest with no unit selected pops up the chest info card.
// Also verifies that the generic cellModel card is never displayed for chests,
// and clicking elsewhere on the map closes the chest info card.

"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const gameDir = path.resolve(path.join(__dirname, "..", "game"));
const resultsFile = path.join(gameDir, "test_output", "results.txt");

// Test script to inject into harness
const harnessScript = `
(() => {
    if (!window.UF || !UF.Test) return;

    UF.Test.suite("chest_left_click", async (t) => {
        SceneManager.goto(Scene_Map);
        await t.waitUntil(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted(), 15000, "Scene_Map started");
        await t.waitFrames(30);

        const scene = SceneManager._scene;
        const W = window.UF.World;
        const C = window.UF.Containers;
        const O = window.UF.Objects;
        const S = window.UF.Select;
        const Sheet = window.UF.Sheet;

        t.check("world_ready", !!W && !!W.state, "World is active");
        t.check("containers_ready", !!C, "Containers API active");

        // 1. Locate the wooden chest
        const area = W.currentArea();
        let chestX = -1, chestY = -1;
        const allConts = C.list ? C.list() : [];
        const found = allConts.find(c => c.type === "chest_wood");
        if (found && found.loc) {
            chestX = found.loc.x;
            chestY = found.loc.y;
        } else {
            // Find in Objects
            for (let y = 0; y < 256; y++) {
                for (let x = 0; x < 256; x++) {
                    const obj = O.at(x, y);
                    if (obj && (obj.id === "chest_wood" || obj.id === "crate_wood")) {
                        chestX = x;
                        chestY = y;
                        break;
                    }
                }
                if (chestX >= 0) break;
            }
        }

        t.check("chest_located", chestX >= 0 && chestY >= 0, "Wooden chest located at (" + chestX + "," + chestY + ")");

        // 2. Ensure NO units are selected
        S.clearSelection();
        if (window.$colonyManager) $colonyManager.deselect();
        if (Sheet) Sheet.close();
        if (scene._ufContainerCard) scene._ufContainerCard.close();
        await t.waitFrames(10);

        t.check("no_units_selected", S.selected().length === 0, "No units selected");
        t.check("sheet_closed_initially", !Sheet.window() || !Sheet.window().visible, "Character sheet closed initially");
        t.check("container_card_closed_initially", !scene._ufContainerCard || !scene._ufContainerCard.visible, "Container card closed initially");

        // 3. Center camera on chest and click it with left-click
        $gamePlayer.center(chestX, chestY);
        await t.waitFrames(15);

        const zoom = (window.UF && UF.Camera && typeof UF.Camera.zoom === "function") ? UF.Camera.zoom() : 1;
        const screenX = ($gameMap.adjustX(chestX) * $gameMap.tileWidth() + $gameMap.tileWidth() / 2) * zoom;
        const screenY = ($gameMap.adjustY(chestY) * $gameMap.tileHeight() + $gameMap.tileHeight() / 2) * zoom;

        t.check("canvas_resolves_to_chest", $gameMap.canvasToMapX(screenX) === chestX && $gameMap.canvasToMapY(screenY) === chestY, "Click coordinates resolve to chest: " + $gameMap.canvasToMapX(screenX) + "," + $gameMap.canvasToMapY(screenY));

        TouchInput._x = screenX;
        TouchInput._y = screenY;
        TouchInput._triggerX = screenX;
        TouchInput._triggerY = screenY;
        TouchInput._newState.triggered = true;
        TouchInput._currentState.triggered = true;
        TouchInput._currentState.pressed = false;

        scene.update();
        await t.waitFrames(10);

        // 4. Assert Container Card popped up
        t.check("container_card_popped_up", !!scene._ufContainerCard && scene._ufContainerCard.visible, "Container card is visible on left-click chest");
        t.check("sheet_window_not_opened", !Sheet.window() || !Sheet.window().visible, "Generic character/cell sheet did NOT open");
        t.check("container_card_standalone", scene._ufContainerCard && scene._ufContainerCard._standalone === true, "Container card is in standalone inspection mode");

        t.screenshot("chest_left_click_info_popup");

        // 5. Left-click elsewhere on empty ground to the West (chestX - 4, chestY)
        const emptyX = chestX - 4;
        const emptyY = chestY;
        const emptyScreenX = ($gameMap.adjustX(emptyX) * $gameMap.tileWidth() + $gameMap.tileWidth() / 2) * zoom;
        const emptyScreenY = ($gameMap.adjustY(emptyY) * $gameMap.tileHeight() + $gameMap.tileHeight() / 2) * zoom;

        TouchInput._x = emptyScreenX;
        TouchInput._y = emptyScreenY;
        TouchInput._triggerX = emptyScreenX;
        TouchInput._triggerY = emptyScreenY;
        TouchInput._newState.triggered = true;
        TouchInput._currentState.triggered = true;
        TouchInput._currentState.pressed = false;

        scene.update();
        await t.waitFrames(10);

        // 6. Assert Container Card closed
        t.check("container_card_closed_on_outside_click", !scene._ufContainerCard || !scene._ufContainerCard.visible, "Container card closed upon clicking empty ground");

        t.screenshot("chest_closed_after_outside_click");
    }, { isDefault: false });
})();
`;

// Temporarily append the harness suite to DEUS_Containers.js or inject it via plugin
const containersPath = path.join(gameDir, "js", "plugins", "DEUS_Containers.js");
const origContainers = fs.readFileSync(containersPath, "utf8");

fs.writeFileSync(containersPath, origContainers + "\n" + harnessScript, "utf8");

const profile = path.join(require("os").tmpdir(), "uf_test_profile_chest_" + Date.now());
fs.rmSync(resultsFile, { force: true });

console.log("Running --deus-test=chest_left_click...");
const noThrottle = [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-features=CalculateNativeWinOcclusion"
];

const child = spawn(NW, [gameDir, `--user-data-dir=${profile}`, ...noThrottle, "--deus-test=chest_left_click"], { stdio: ["ignore", "pipe", "pipe"] });

child.on("exit", (code) => {
    // Restore DEUS_Containers.js
    fs.writeFileSync(containersPath, origContainers, "utf8");
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}

    if (fs.existsSync(resultsFile)) {
        const text = fs.readFileSync(resultsFile, "utf8");
        console.log(text);
        const m = text.match(/^RESULT: (\d+) passed, (\d+) failed \(exit (\d)\)$/m);
        if (m) {
            process.exit(Number(m[3]));
        }
    }
    console.error("Test finished without RESULT line.");
    process.exit(1);
});
