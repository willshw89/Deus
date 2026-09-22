"use strict";
// Executes the real additive plugin. Engine/UI doubles are deliberate; pixel
// rendering and native Sheet behavior are tested by its RMMZ runtime suite.
const fs = require("fs"), path = require("path"), vm = require("vm");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_ProfileTabs.js"), "utf8");
const mutations = {
    "--mutate-containment": ["            consume();", "            // mutation: click leaks to map"],
    "--mutate-level": ["y: h.area.y, z: zOf(h)", "y: h.area.y, z: 0"],
    "--mutate-unknown": ["Object.entries(d.needs || {})", "Object.entries(d.needs || { hunger: 0 })"],
    "--mutate-native": ["if (p.tab === \"inventory\") p.info.hide();", "if (p.tab === \"inventory\") p.info.show();"],
    "--mutate-poll": ["const POLL = 30,", "const POLL = 1,"],
    "--mutate-load-guard": ["const loadRecorded = !!(st.jobs && st.items && st.items.byId && Array.isArray(d.inventory));", "const loadRecorded = true;"],
    "--mutate-sleep": ["clockText(sleep.bedMinute)", "clockText(1320)"],
    "--mutate-annex": ["...(Array.isArray(h.home.annexes) ? h.home.annexes : [])", "...[]"],
    "--mutate-farm-inspection": ["const farm = agriculture.describe(u);", "agriculture.state(); const farm = agriculture.describe(u);"],
    "--mutate-farm-harvest": ["Completed harvests: ${farm.harvests}", "Completed harvests: ${farm.plotCount}"]
};
for (const [flag, [from, to]] of Object.entries(mutations)) if (process.argv.includes(flag)) {
    if (!source.includes(from)) throw new Error(`Mutation no longer matches source: ${flag}`);
    source = source.replace(from, to);
}
let passed = 0, failed = 0;
function check(name, value, detail = "") { value ? passed++ : failed++; console.log(`${value ? "PASS" : "FAIL"} profile_tabs.${name}${detail ? " - " + detail : ""}`); }
function fixture() {
    const units = {}, objects = new Map(), calls = { map: 0, mutator: 0, picture: 0 }, events = {};
    const st = { units, factions: { list: [{ id: 1, name: "TEST_Faction", species: "dwarf" }] },
        households: { byUnit: {}, byId: {}, people: {} }, cultureGrowth: { people: {}, factions: {} } };
    const catalog = { colony: { thresholds: { hunger: 55, thirst: 55 } }, cultures: { dwarf: { wall: "wall_stone", door: "door_stone" } },
        wildlife: { species: [{ id: "wolf", name: "Wolf", combat: { attack: 7, hitpoints: 12 } }] } };
    class WindowBase {
        constructor(...args) { this.initialize(...args); }
        initialize(r) { Object.assign(this, r); this.padding = 12; this.visible = true; this.windowskin = { name: "TEST_Skin" }; this.contents = { fontSize: 15, clear() {}, fillRect() {}, blt() {} }; }
        get innerWidth() { return this.width - this.padding * 2; }
        get innerHeight() { return this.height - this.padding * 2; }
        update() {} render() { return "engine renderer"; } hide() { this.visible = false; } show() { this.visible = true; } isOpen() { return true; }
        drawText() {} textWidth(s) { return String(s).length * 7; }
    }
    class SceneMap {
        createAllWindows() {
            this._windowLayer = { x: 0, y: 0, children: [], addChildAt(w, at) { w.parent = this; this.children.splice(at, 0, w); } };
            const sheet = new WindowBase({ x: 500, y: 82, width: 312, height: 500 });
            sheet._subject = null; sheet._model = null; sheet._layout = { grid: { token: "original grid" }, equipment: { token: "original equipment" } };
            sheet.subject = () => sheet._subject; sheet.model = () => sheet._model; sheet.layout = () => sheet._layout; sheet.hide();
            this._ufSheetWindow = sheet; this._windowLayer.addChildAt(sheet, 0);
        }
        update() { for (const w of this._windowLayer.children) w.update(); if (sandbox.TouchInput.isTriggered()) calls.map++; }
        isAnyWindowUnderMouse() { return false; }
    }
    class SceneBoot { start() {} }
    const Events = { on(name, fn) { (events[name] || (events[name] = [])).push(fn); }, emit(name, ...args) { for (const fn of events[name] || []) fn(...args); } };
    const native = { window: () => sandbox.SceneManager._scene._ufSheetWindow, Window: class {},
        open(ref) { const w = this.window(), sub = typeof ref === "number" ? { kind: "unit", unitId: ref } : ref;
            w._subject = sub; w._model = { subject: sub, readOnly: sub.kind !== "unit" || units[sub.unitId].data.kind !== "colonist", picture: { type: "test" } }; w.show(); Events.emit("sheet:opened", sub); return true; },
        close() { const w = this.window(); w.hide(); w._subject = null; Events.emit("sheet:closed"); return true; },
        isOpen() { return this.window().visible; }, layout() { return this.window().layout(); }, loadOf: () => null };
    native.Window.prototype.drawPicture = () => { calls.picture++; };
    const sandbox = { console, Window_Base: WindowBase, Rectangle: class { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); } },
        Scene_Map: SceneMap, Scene_Boot: SceneBoot, SceneManager: { _scene: null }, Graphics: { boxWidth: 816, boxHeight: 624 },
        TouchInput: { x: 0, y: 0, _currentState: {}, isTriggered() { return !!this._currentState.triggered; }, isCancelled() { return !!this._currentState.cancelled; } },
        $ufWorldCatalog: catalog, UF: { Sheet: native, Events, World: { state: st, unit: id => units[id] || null },
            Jobs: { of: id => units[id] && units[id].job || null, describe: job => `Working: ${job.type}` },
            Objects: { atIn: (a, x, y) => objects.get(`${a.z}:${x},${y}`) || null },
            Skills: { skills: () => Array.from({ length: 22 }, (_, i) => ({ id: `skill${i}`, name: `Recorded skill ${i}` })), MAX_LEVEL: 99,
                level: (u, id) => Math.floor((u.data.skillXp[id] || 0) / 100) + 1, xp: (u, id) => u.data.skillXp[id] || 0, xpForLevel: lv => (lv - 1) * 100,
                adopt: () => { calls.mutator++; throw new Error("Inspection must not adopt skills"); } },
            Goals: { describe: () => { calls.mutator++; throw new Error("Inspection must not refresh saved goals"); } },
            CultureGrowth: { mechanicFor: () => ({ text: "TEST_Conditional construction policy" }), ensurePerson: () => { calls.mutator++; throw new Error("Inspection must not initialize culture"); } },
            Interact: { isOpen: () => false } } };
    sandbox.window = sandbox; vm.createContext(sandbox); vm.runInContext(source, sandbox); new SceneBoot().start();
    const scene = sandbox.SceneManager._scene = new SceneMap(); scene.createAllWindows();
    function add(id, data = {}, z = 0) { return units[id] = { id, name: `TEST_Creature_${id}`, area: { x: 0, y: 0 }, x: 12, y: 14, z,
        data: { kind: "colonist", faction: 1, species: "dwarf", age: 25, stage: "adult", ...data } }; }
    function click(rect, right = false) {
        sandbox.TouchInput.x = rect.cx; sandbox.TouchInput.y = rect.cy; sandbox.TouchInput._currentState = { triggered: !right, cancelled: right };
        scene.update(); sandbox.TouchInput._currentState = {};
    }
    return { API: sandbox.UF.ProfileTabs, native, scene, sandbox, st, add, calls, catalog, objects, click };
}
const text = m => m.rows.map(r => r.text).join("\n");
{
    const f = fixture(), u = f.add(1);
    f.sandbox.UF.Jobs.of = () => { f.st.jobs = { nextId: 1, list: [] }; return null; };
    f.native.loadOf = () => { f.st.items = { nextId: 1, byId: {} }; u.data.inventory = []; return null; };
    const before = JSON.stringify(f.st);
    for (const tab of f.API.tabs()) f.API.model(u, tab.id);
    check("sparse_world_inspection_never_initializes_state", JSON.stringify(f.st) === before && !f.st.items && !f.st.jobs && !u.data.inventory);
    f.st.jobs = { nextId: 2, list: [{ id: 1, assigned: u.id, state: "work", type: "mine" }] };
    check("current_action_from_real_saved_job", /Working: mine/.test(text(f.API.model(u))));
}
{
    const f = fixture(), u = f.add(1, { age: 0, stage: "baby", needs: { hunger: 61 }, mood: "Content", thoughts: [{ text: "TEST_Thought" }], skillXp: { skill0: 800 }, skills: { skill0: 20 } }, -2);
    check("four_tabs", f.API.tabs().length === 4 && f.API.tabs()[3].id === "inventory");
    check("overview_actual_age_and_level", /Age: 0/.test(text(f.API.model(u))) && /z=-2/.test(text(f.API.model(u))));
    const needs = text(f.API.model(u, "needs"));
    check("needs_explain_urgency", /Hunger: 61; seeks relief around 55/.test(needs) && /Higher need/.test(needs) && /TEST_Thought/.test(needs));
    check("sleep_schedule_not_initialized", /No valid personal sleep schedule/.test(needs) && !u.data.sleepSchedule);
    u.data.sleepSchedule = { version: 1, bedMinute: 1275, wakeMinute: 345, durationMinutes: 510, chronotype: "early" };
    check("saved_personal_sleep_schedule", /21:15 to 05:45; 8.5 game hours/.test(text(f.API.model(u, "needs"))) && /Chronotype: Early/.test(text(f.API.model(u, "needs"))));
    u.data.sleepSchedule = { version: 1, bedMinute: 45, wakeMinute: 435, durationMinutes: 390, chronotype: "late" };
    check("distinct_saved_sleep_schedule", /00:45 to 07:15; 6.5 game hours/.test(text(f.API.model(u, "needs"))) && /Chronotype: Late/.test(text(f.API.model(u, "needs"))));
    u.data.sleepSchedule.wakeMinute = 100;
    const malformed = JSON.stringify(u.data.sleepSchedule);
    check("invalid_sleep_record_not_repaired", /No valid personal sleep schedule/.test(text(f.API.model(u, "needs"))) && JSON.stringify(u.data.sleepSchedule) === malformed);
    const a = f.add(2, { kind: "creature", faction: null, species: "wolf", age: undefined, stage: undefined });
    check("animal_needs_not_invented", /No persistent needs/.test(text(f.API.model(a, "needs"))) && !/Hunger: 0/.test(text(f.API.model(a, "needs"))));
    check("animal_household_not_invented", /No humanoid household/.test(text(f.API.model(a, "family"))));
    const before = JSON.stringify(f.st); for (const t of f.API.tabs()) f.API.model(u, t.id);
    check("all_tabs_read_only", JSON.stringify(f.st) === before && f.calls.mutator === 0);
    check("invalid_subject_or_tab", f.API.model(999) === null && f.API.model(u, "missing") === null);
}
{
    const f = fixture(), u = f.add(1, { motherId: 9, fatherId: 10, socialBonds: [{ unitId: 2, conversations: 3, familiarity: 24 }] }, -1); f.add(2);
    f.st.households.byUnit[1] = "TEST_House";
    f.st.households.people[9] = { name: "TEST_Mother", deceased: true };
    f.st.households.people[1] = { generation: 2 };
    f.st.households.byId.TEST_House = { id: "TEST_House", area: { x: 0, y: 0 }, z: -1, members: [1], home: { x: 5, y: 5, wall: "wall_stone", door: "door_stone", walls: [{ x: 5, y: 5 }], doors: [], beds: [{ x: 6, y: 6 }, { x: 7, y: 6 }], hearth: { x: 7, y: 7 } } };
    f.objects.set("-1:5,5", { id: "wall_stone" }); f.objects.set("-1:6,6", { id: "floor_straw" });
    const family = text(f.API.model(u, "family"));
    check("family_genealogy_and_contacts", /TEST_Mother/.test(family) && /Recorded generation: 2/.test(family) && /3 conversations; familiarity 24/.test(family));
    check("home_counts_actual_own_level", /Walls: 1 built \/ 1 planned/.test(family) && /Bed spaces: 1 built \/ 2 planned/.test(family), family.match(/Walls:.*/)[0]);
    check("no_fixed_household_size_rule", /not a household size rule/.test(family) && !/four|maximum 4|capacity 4/i.test(family));
    const home = f.st.households.byId.TEST_House;
    home.home.annexes = [{ x: 15, y: 15, wall: "wall_stone", door: "door_stone", walls: [{ x: 15, y: 15 }], doors: [],
        beds: [{ x: 16, y: 16 }, { x: 17, y: 16 }, { x: 18, y: 16 }], hearth: null, storage: null,
        design: { size: "bedroom", variant: "long", width: 5, height: 6, rotation: 1, mirrored: true, householdSize: 5, requiredBeds: 3 } }];
    f.objects.set("-1:15,15", { id: "wall_stone" }); f.objects.set("-1:16,16", { id: "floor_straw" }); f.objects.set("0:17,16", { id: "floor_straw" });
    f.sandbox.UF.Households = { structures: () => { throw new Error("Do not lazily initialize household state"); }, demands: () => { throw new Error("Do not reconcile household demand"); } };
    home.expansionBlocked = true; home.expansionReason = "TEST_No dry plot";
    const expanded = text(f.API.model(u, "family"));
    check("all_saved_home_structures_counted", /Recorded buildings: 2; planned bed spaces across them: 5/.test(expanded) && /Bedroom annex 1/.test(expanded) && /Bed spaces: 1 built \/ 3 planned/.test(expanded));
    check("saved_design_and_expansion_reason", /Bedroom, Long, 5 by 6 tiles, rotation 1, mirrored/.test(expanded) && /Residents when designed: 5; beds required then: 3/.test(expanded) && /TEST_No dry plot/.test(expanded));
    home.members.push(2); f.st.households.byUnit[2] = home.id; f.sandbox.UF.World.unit(2).data._isDying = true;
    check("dying_resident_not_counted_alive", /Living residents: 1/.test(text(f.API.model(u, "family"))));
}
{
    const f = fixture(), u = f.add(1, {}, -2), requested = [];
    const summary = { siteId: 4, faction: 1, area: { x: 0, y: 0 }, z: -2, population: 3, targetPlots: 2, plotCount: 1,
        phases: { reserved: 1, tilled: 0, growing: 0, ripe: 0 }, unmetPlots: 1, harvests: 0, foodUnits: 7,
        blocked: "TEST_No substrate", missingInputs: [{ itemId: "straw", count: 1 }],
        crops: [{ id: "mushrooms", name: "TEST_Cave mushrooms", plots: 1, growing: 0, ripe: 0 }], personal: { jobs: 2, harvests: 0, lastAction: "farm_tend" } };
    f.sandbox.UF.Agriculture = {
        describe: actor => { requested.push(actor.id); if (actor.z !== summary.z) throw new Error("wrong layer"); return summary; },
        state: () => { f.st.agriculture = { createdByInspection: true }; },
        planSteps: () => { throw new Error("Inspection must not plan farms"); }
    };
    const before = JSON.stringify(f.st), farm = text(f.API.model(u, "family"));
    check("farm_inspection_read_only_actor_scoped", JSON.stringify(f.st) === before && !f.st.agriculture && requested.length === 1 && requested[0] === u.id && /Farm level: z=-2/.test(farm));
    check("farm_plans_not_completed_harvests", /Plots recorded: 1; planning target: 2/.test(farm) && /Reserved plots: 1/.test(farm) && /Completed harvests: 0/.test(farm) && /Reserved or growing crops are not ready food/.test(farm));
    check("farm_stock_blocked_and_personal_work_explained", /Available edible stock: 7 units across the settlement/.test(farm) && /TEST_No substrate/.test(farm) && /Missing planting input: Straw × 1/.test(farm) && /confirmed farm work: 2 jobs; 0 harvests/.test(farm) && /TEST_Cave mushrooms/.test(farm));
    f.sandbox.UF.Agriculture.describe = () => null;
    check("farm_unknowns_not_zeroes", /No same-level settlement farming information/.test(text(f.API.model(u, "family"))) && !/Completed harvests:/.test(text(f.API.model(u, "family"))));
}
{
    const bonds = []; for (let i = 0; i < 30; i++) bonds.push({ unitId: 10 + i, conversations: 5, familiarity: 10 });
    const f = fixture(), u = f.add(1, { socialBonds: bonds }); f.native.open(u.id);
    const p = f.API.windows(), grid = f.native.layout().grid;
    check("engine_render_method_not_shadowed", p.info.render === f.sandbox.Window_Base.prototype.render && p.info.render() === "engine renderer");
    check("open_companion_preserves_native_subject", f.API.current().unitId === 1 && p.side.visible && p.info.visible && f.native.isOpen());
    check("fits_816_by_624", [p.side, p.info].every(w => w.x >= 0 && w.y >= 0 && w.x + w.width <= 816 && w.y + w.height <= 624));
    f.click(f.API.screenRect("tab", "family"));
    check("tab_touch_contained", f.API.current().tab === "family" && f.calls.map === 0 && p.info._renderedLines.length > 0, `map orders=${f.calls.map}`);
    const page = f.API.current().page; f.click(f.API.screenRect("next"));
    check("long_page_navigation", f.API.current().pages > 1 && f.API.current().page === page + 1);
    f.click(f.API.screenRect("tab", "inventory"));
    check("native_inventory_not_overlaid", !p.info.visible && p.side.visible && f.native.layout().grid === grid && f.native.layout().equipment.token === "original equipment");
    const npc = f.add(2, { kind: "person" }); f.native.open(npc.id);
    check("new_subject_resets_page", f.API.current().unitId === 2 && f.API.current().tab === "overview" && f.API.current().page === 0 && f.native.window().model().readOnly);
    f.click(f.API.screenRect("close"));
    check("close_hides_both", !f.native.isOpen() && !p.side.visible && !p.info.visible && f.API.current() === null);
    f.native.open(npc.id);
    check("reopening_resets_overview", f.API.current().tab === "overview" && f.API.current().page === 0);
    f.native.open(u.id); f.native.open({ kind: "cell", area: { x: 0, y: 0 }, x: 8, y: 8 });
    check("object_sheet_unchanged", f.native.isOpen() && f.native.window().subject().kind === "cell" && !p.side.visible && !p.info.visible);
    f.native.open(u.id); const checks = p.checks; for (let i = 0; i < 5; i++) f.scene.update();
    check("bounded_open_polling", p.checks === checks, `${p.checks - checks} checks during 5 idle render frames`);
    f.native.close(); const closed = p.checks; for (let i = 0; i < 40; i++) f.scene.update();
    check("closed_no_polling", p.checks === closed);
    f.native.open(u.id); u.z = -2; for (let i = 0; i < f.API.POLL; i++) f.scene.update();
    check("live_actor_level_not_camera", p.model.z === -2);
    const cover = new f.sandbox.Window_Base({ x: p.side.x, y: p.side.y, width: p.side.width, height: p.side.height });
    f.scene._windowLayer.addChildAt(cover, f.scene._windowLayer.children.length);
    f.click(f.API.screenRect("tab", "family"));
    check("covered_tabs_do_not_steal_modal_click", f.API.current().tab === "overview");
    cover.hide(); f.click(f.API.screenRect("tab", "needs"), true);
    check("right_click_closes", !f.native.isOpen() && !p.side.visible && !p.info.visible);
}
console.log(`RESULT: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
