// tools/test_container_item_interactions.js
// Verification suite: Right-click item to use (eating food/satisfying hunger),
// left-click item to attach to mouse cursor, drop to ground outside window,
// and transfer into creature inventory.

"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const NW = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\RPG Maker MZ\\nwjs-win\\nw.exe";
const gameDir = path.resolve(path.join(__dirname, "..", "game"));
const resultsFile = path.join(gameDir, "test_output", "results.txt");

const harnessScript = `
(() => {
    if (!window.UF || !UF.Test) return;

    UF.Test.suite("item_interactions", async (t) => {
        SceneManager.goto(Scene_Map);
        await t.waitUntil(() => SceneManager._scene instanceof Scene_Map && SceneManager._scene.isStarted(), 15000, "Scene_Map started");
        await t.waitFrames(30);

        const scene = SceneManager._scene;
        const W = window.UF.World;
        const C = window.UF.Containers;
        const I = window.UF.Items;
        const S = window.UF.Select;
        const Sheet = window.UF.Sheet;
        const ItemDrag = window.UF.ItemDrag;

        t.check("world_ready", !!W && !!W.state, "World is active");
        t.check("containers_ready", !!C, "Containers API active");
        t.check("item_drag_ready", !!ItemDrag, "ItemDrag API active");

        // 1. Locate colonist and wooden chest
        const allUnits = W.units ? W.units() : (W.state && W.state.units ? Object.values(W.state.units) : []);
        t.check("colonist_exists", allUnits.length > 0, "Colonists exist in world: " + allUnits.length);
        const u = allUnits[0];
        t.check("unit_ready", !!u, "Active unit resolved: " + (u ? (u.name || "Unit " + u.id) : "null"));

        const allConts = C.list ? C.list() : [];
        let cont = allConts.find(c => c.type === "chest_wood");
        if (!cont) {
            cont = C.create("chest_wood", { area: W.currentArea(), x: u.x + 1, y: u.y, z: 0 });
        }
        t.check("chest_ready", !!cont, "Chest ready: " + cont.id);

        // Put fresh cooked meat into chest for food testing
        const foodItem = I.create("meat_cooked", 5, { container: cont.id });
        if (!cont.items.includes(foodItem.id)) cont.items.push(foodItem.id);

        // Select unit Kara/colonist and open sheet & chest docked side-by-side
        S.setSelection([u.id]);
        Sheet.open(u.id);
        if (Sheet.window()) Sheet.window().switchTab(1); // Page 2: Inventory
        const cx = (cont.loc ? cont.loc.x : cont.x) || (u.x + 1);
        const cy = (cont.loc ? cont.loc.y : cont.y) || u.y;
        scene._ufContainerCard.openFor(cont.id, cx, cy, u.area);
        await t.waitFrames(15);

        t.check("card_and_sheet_docked", scene._ufContainerCard.visible && Sheet.window().visible, "Container card and Sheet docked side-by-side");

        // Set colonist needs and damage
        if (!u.data) u.data = {};
        if (!u.data.needs) u.data.needs = {};
        u.data.needs.hunger = 80;
        u.data.needs.thirst = 40;
        u.data.hp = 6;
        u.data.maxHp = 12;

        const card = scene._ufContainerCard;
        const sheetWin = Sheet.window();
        card.refresh();
        sheetWin.redraw();
        await t.waitFrames(10);

        // Find slot index of foodItem in chest
        const chestItems = C.itemsIn(cont.id);
        const foodSlotIdx = chestItems.findIndex(it => it.type === "meat_cooked");
        t.check("food_slot_found", foodSlotIdx >= 0, "Food found in container slot " + foodSlotIdx);

        function triggerClick(x, y) {
            TouchInput._x = x;
            TouchInput._y = y;
            TouchInput._triggerX = x;
            TouchInput._triggerY = y;
            TouchInput._newState.triggered = true;
            TouchInput._currentState.triggered = true;
            TouchInput._newState.cancelled = false;
            TouchInput._currentState.cancelled = false;
            TouchInput._newState.pressed = false;
            TouchInput._currentState.pressed = false;
        }

        function cancelClick(x, y) {
            TouchInput._x = x;
            TouchInput._y = y;
            TouchInput._triggerX = x;
            TouchInput._triggerY = y;
            TouchInput._newState.cancelled = true;
            TouchInput._currentState.cancelled = true;
            TouchInput._newState.triggered = false;
            TouchInput._currentState.triggered = false;
            TouchInput._newState.pressed = false;
            TouchInput._currentState.pressed = false;
        }

        function clearTouch() {
            TouchInput._newState.triggered = false;
            TouchInput._currentState.triggered = false;
            TouchInput._newState.cancelled = false;
            TouchInput._currentState.cancelled = false;
            TouchInput._newState.pressed = false;
            TouchInput._currentState.pressed = false;
        }

        const slotRect = card._slotRects[foodSlotIdx];
        const foodSlotScreenX = card.x + card.padding + slotRect.x + slotRect.w / 2;
        const foodSlotScreenY = card.y + card.padding + slotRect.y + slotRect.h / 2;

        const foodEntry = chestItems[foodSlotIdx];
        const foodStartCount = foodEntry.count;

        // =========================================================================
        // TEST 1: RIGHT-CLICK FOOD IN CHEST CONSUMES IT (Hunger down, HP healed, chest stays open)
        // =========================================================================
        cancelClick(foodSlotScreenX, foodSlotScreenY);
        scene.update();
        clearTouch();
        await t.waitFrames(5);

        t.check("chest_still_open_after_right_click", card.visible, "Container card did NOT close on right-clicking food");
        t.check("hunger_reduced", u.data.needs.hunger < 80, "Hunger reduced from 80 to " + u.data.needs.hunger);
        t.check("hp_healed", u.data.hp > 6, "HP healed from 6 to " + u.data.hp);

        const updatedFood = I.get(foodEntry.id);
        const updatedCount = updatedFood ? updatedFood.count : 0;
        t.check("food_count_decremented", updatedCount === foodStartCount - 1, "Food stack in chest decremented to " + (foodStartCount - 1) + " (actual: " + updatedCount + ")");

        // =========================================================================
        // TEST 2: LEFT-CLICK FOOD PICKS IT UP ONTO MOUSE CURSOR
        // =========================================================================
        triggerClick(foodSlotScreenX, foodSlotScreenY);
        scene.update();
        clearTouch();
        await t.waitFrames(5);

        t.check("item_attached_to_mouse", ItemDrag.hasAttached() === true, "Item successfully attached to mouse cursor");
        t.check("attached_source_is_container", ItemDrag.source() && ItemDrag.source().kind === "container", "Drag source is container");

        // =========================================================================
        // TEST 3: RIGHT-CLICK WHILE ATTACHED CANCELS PICKUP WITHOUT CLOSING WINDOW
        // =========================================================================
        cancelClick(foodSlotScreenX, foodSlotScreenY);
        scene.update();
        clearTouch();
        await t.waitFrames(5);

        t.check("pickup_cancelled_on_right_click", ItemDrag.hasAttached() === false, "Mouse pickup cancelled on right click");
        t.check("chest_remains_open_on_cancel", card.visible, "Container card remains open after cancelling pickup");

        // =========================================================================
        // TEST 4: LEFT-CLICK TO ATTACH, THEN LEFT-CLICK INTO CREATURE INVENTORY SLOT
        // =========================================================================
        // Pick up again from chest
        triggerClick(foodSlotScreenX, foodSlotScreenY);
        scene.update();
        clearTouch();
        await t.waitFrames(5);
        t.check("item_attached_second_time", ItemDrag.hasAttached() === true, "Item attached for transfer");

        // Click over creature sheet inventory grid slot 0
        const gridSlotRect = sheetWin._layout.grid.slots[0];
        const invSlotScreenX = sheetWin.x + sheetWin.padding + gridSlotRect.x + gridSlotRect.w / 2;
        const invSlotScreenY = sheetWin.y + sheetWin.padding + gridSlotRect.y + gridSlotRect.h / 2;

        triggerClick(invSlotScreenX, invSlotScreenY);
        scene.update();
        clearTouch();
        await t.waitFrames(10);

        t.check("pickup_detached_after_transfer", ItemDrag.hasAttached() === false, "Item detached after depositing into inventory");
        const invItems = I.inventoryOf(u.id);
        const transferredFood = invItems.find(it => it.type === "meat_cooked");
        t.check("food_transferred_to_unit", !!transferredFood, "Food is now in colonist inventory: " + (transferredFood ? transferredFood.count : 0));

        // =========================================================================
        // TEST 5: LEFT-CLICK FROM CREATURE INVENTORY, THEN CLICK OUTSIDE TO DROP ON GROUND
        // Pick up from creature inventory slot 0 (query current layout position)
        const curGridSlot = sheetWin._layout.grid.slots[0];
        const pickInvX = sheetWin.x + sheetWin.padding + curGridSlot.x + curGridSlot.w / 2;
        const pickInvY = sheetWin.y + sheetWin.padding + curGridSlot.y + curGridSlot.h / 2;

        triggerClick(pickInvX, pickInvY);
        scene.update();
        clearTouch();
        await t.waitFrames(25);

        t.check("item_attached_from_inventory", ItemDrag.hasAttached() === true, "Item attached from colonist inventory");
        t.check("attached_source_is_inventory", ItemDrag.source() && ItemDrag.source().kind === "inventory", "Drag source is inventory");

        // Click outside both windows on empty ground (e.g. top-left of screen at 24, 24)
        const dropGroundScreenX = 24;
        const dropGroundScreenY = 24;
        const dropCellX = $gameMap.canvasToMapX(dropGroundScreenX);
        const dropCellY = $gameMap.canvasToMapY(dropGroundScreenY);

        triggerClick(dropGroundScreenX, dropGroundScreenY);
        scene.update();
        clearTouch();
        await t.waitFrames(10);

        t.check("putdown_debug", !!ItemDrag._lastDropResult, "putDown result: " + JSON.stringify(ItemDrag._lastDropResult));
        const itemAfterDrop = I.get(transferredFood.id);
        t.check("item_after_drop", !!itemAfterDrop, "Item state: " + (itemAfterDrop ? JSON.stringify({ id: itemAfterDrop.id, area: itemAfterDrop.area, x: itemAfterDrop.x, y: itemAfterDrop.y, holder: itemAfterDrop.holder }) : "null"));
        const groundItems = I.itemsOnCell ? I.itemsOnCell(W.currentArea(), dropCellX, dropCellY) : I.at(dropCellX, dropCellY);
        const droppedFood = groundItems.find(it => it.type === "meat_cooked");
        t.check("food_dropped_on_ground_cell", !!droppedFood, "Food successfully placed on map ground cell (" + dropCellX + "," + dropCellY + ")");

        t.screenshot("item_interactions_verified");
    });
})();
`;

// Run test harness with NW.js
function run() {
    const testFile = path.join(gameDir, "js", "plugins", "UF_TestItemInteractions.js");
    fs.writeFileSync(testFile, harnessScript, "utf8");

    // Inject into plugins.js if needed
    const pluginsJsPath = path.join(gameDir, "js", "plugins.js");
    let pluginsCode = fs.readFileSync(pluginsJsPath, "utf8");
    const pluginEntry = '{"name":"UF_TestItemInteractions","status":true,"description":"","parameters":{}}';
    let injected = false;
    if (!pluginsCode.includes("UF_TestItemInteractions")) {
        pluginsCode = pluginsCode.replace(/];\s*$/, `,${pluginEntry}\n];`);
        fs.writeFileSync(pluginsJsPath, pluginsCode, "utf8");
        injected = true;
    }

    if (fs.existsSync(resultsFile)) {
        try { fs.unlinkSync(resultsFile); } catch (_) {}
    }

    console.log("Starting test run via NW.js...");
    const profile = path.join(require("os").tmpdir(), `uf_test_profile_${process.pid}_${Date.now()}`);
    const noThrottle = [
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-features=CalculateNativeWinOcclusion"
    ];
    const p = spawn(NW, [gameDir, `--user-data-dir=${profile}`, ...noThrottle, "--deus-test=item_interactions"], { stdio: "pipe" });

    let stdout = "";
    p.stdout.on("data", (d) => {
        stdout += d.toString();
        process.stdout.write(d);
    });
    p.stderr.on("data", (d) => {
        process.stderr.write(d);
    });

    const timeout = setTimeout(() => {
        console.error("Test timed out after 30 seconds!");
        p.kill();
        cleanup();
        process.exit(1);
    }, 30000);

    function cleanup() {
        clearTimeout(timeout);
        try { if (fs.existsSync(testFile)) fs.unlinkSync(testFile); } catch (_) {}
        if (injected) {
            try {
                let pCode = fs.readFileSync(pluginsJsPath, "utf8");
                pCode = pCode.replace(`,${pluginEntry}\n`, "").replace(`,${pluginEntry}`, "");
                fs.writeFileSync(pluginsJsPath, pCode, "utf8");
            } catch (_) {}
        }
    }

    p.on("exit", (code) => {
        cleanup();
        let pass = false;
        if (fs.existsSync(resultsFile)) {
            const res = fs.readFileSync(resultsFile, "utf8");
            console.log("\nResults file content:\n" + res);
            if (res.includes("RESULT: PASS") || res.includes("0 failed")) pass = true;
        } else if (stdout.includes("RESULT: PASS") || (stdout.includes("passed") && !stdout.includes("failed"))) {
            pass = true;
        }

        if (pass) {
            console.log("\nAll item interaction tests PASSED!");
            process.exit(0);
        } else {
            console.error("\nItem interaction tests FAILED! Exit code: " + code);
            process.exit(code || 1);
        }
    });
}

run();
