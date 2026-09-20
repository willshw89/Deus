"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
let source = fs.readFileSync(path.join(__dirname, "../game/js/plugins/UF_FarmView.js"), "utf8");
if (process.argv.includes("--mutate-view")) {
    assert(source.includes("z: view.z }))"), "mutation target missing");
    source = source.replace("z: view.z }))", "z: 0 }))");
}
let passed = 0, failed = 0;
function check(name, fn) { try { fn(); passed++; console.log(`PASS farm_view.${name}`); } catch (e) { failed++; console.log(`FAIL farm_view.${name}: ${e.message}`); } }
const plot = { id: "plot:0,0,-1:8,9", cropId: "mushroom", area: { x: 0, y: 0 }, x: 8, y: 9, z: -1, phase: "growing", growthMinutes: 1080, careMinutes: 60 };
let state = { plots: [plot] }, view = { x: 0, y: 0, z: -1 }, bitmapCount = 0, mutationCalls = 0;
class Bitmap { constructor(w,h) { this.width=w;this.height=h;this.rects=[];bitmapCount++; } fillRect(...args) { this.rects.push(args); } }
class Sprite { constructor() { this.anchor = { set() {} }; this.visible = true; } }
function Spriteset_Map() { this._tilemap = { children: [], addChild(s) { this.children.push(s); } }; }
Spriteset_Map.prototype.createCharacters = function() {}; Spriteset_Map.prototype.update = function() {};
function Scene_Boot() {} Scene_Boot.prototype.start = function() {};
function Tip() { this.visible=true;this._cell={x:8,y:9};this._lines=["Farm plot","Cave floor","art"]; }
Tip.prototype.update = function() {}; Tip.prototype.setLines = function(lines) { this._lines=lines; };
const crops = [{ id: "mushroom", name: "Cave mushrooms", growthMinutes: 2160 }, { id: "root", name: "Root vegetables", growthMinutes: 2880 }];
const ctx = { console, Bitmap, Sprite, Spriteset_Map, Scene_Boot, SceneManager: { _scene: {} },
    $gameMap: { adjustX:x=>x, adjustY:y=>y, screenTileX:()=>17, screenTileY:()=>13 },
    UF: { World: { viewLevel:()=>view }, Agriculture: {
        peek:()=>state, crops:()=>crops,
        at:r=>state && state.plots.find(p=>p.x===r.x&&p.y===r.y&&p.z===r.z&&p.area.x===r.area.x&&p.area.y===r.area.y),
        plots:q=>state?state.plots.filter(p=>p.z===q.z&&p.area.x===q.area.x&&p.area.y===q.area.y):[],
        state:()=>{mutationCalls++;throw Error("view initialized simulation");}, processGrowth:()=>{mutationCalls++;throw Error("view grew crop");}
    }, Look: { describeCell:()=>["Farm plot","Cave floor","art"], inspect:()=>({lines:["Farm plot","Cave floor","art"]}), TipSprite:Tip } } };
ctx.window=ctx; vm.createContext(ctx);vm.runInContext(source,ctx,{filename:"UF_FarmView.js"});new Scene_Boot().start();
const V=ctx.UF.FarmView, before=JSON.stringify(state);
check("actual_record_progress_and_care",()=>{const m=V.inspect(plot);assert.strictEqual(m.progress,50);assert.strictEqual(m.needsCare,false);assert(V.lines(plot)[0].includes("50%"));plot.careMinutes=0;assert(V.lines(plot)[1].includes("tending required"));plot.careMinutes=60;});
check("viewed_level_tooltip",()=>{assert(ctx.UF.Look.describeCell(8,9).some(x=>x.startsWith("Cultivation: ")));view.z=0;assert(!ctx.UF.Look.describeCell(8,9).some(x=>x.startsWith("Cultivation: ")));view.z=-1;});
check("live_tip_not_only_facade",()=>{const tip=new Tip();tip.update();tip.update();assert.strictEqual(tip._lines.filter(x=>x.startsWith("Cultivation: ")).length,1);});
check("fog_stays_unknown",()=>assert.deepStrictEqual(Array.from(V.decorate(["Unexplored","",""],8,9)),["Unexplored","",""]));
check("no_read_mutation",()=>{assert.strictEqual(mutationCalls,0);assert.strictEqual(JSON.stringify(state),before);});
const sprites=new Spriteset_Map();sprites.createCharacters();ctx.SceneManager._scene._spriteset=sprites;
check("marker_in_correct_level_and_cell",()=>{sprites.update();const shown=V.markers();assert.strictEqual(shown.length,1);assert.strictEqual(shown[0]._ufFarm.id,plot.id);assert.strictEqual(shown[0].x,408);assert.strictEqual(shown[0].y,480);assert.strictEqual(shown[0].z,478);assert(shown[0].bitmap.rects.length>0);});
check("other_level_hides_and_reuses_pool",()=>{const first=V.markers()[0];view.z=0;sprites.update();assert.strictEqual(V.markers().length,0);view.z=-1;sprites.update();assert.strictEqual(V.markers()[0],first);});
check("no_bitmap_per_frame",()=>{const start=bitmapCount;for(let i=0;i<120;i++)sprites.update();assert.strictEqual(bitmapCount,start);});
check("offscreen_plot_hidden",()=>{plot.x=100;sprites.update();assert.strictEqual(V.markers().length,0);plot.x=8;});
check("missing_state_never_initialized",()=>{state=null;sprites.update();assert.strictEqual(V.markers().length,0);assert.strictEqual(V.inspect(plot),null);assert.strictEqual(mutationCalls,0);});
console.log(`RESULT: ${passed} passed, ${failed} failed`);process.exitCode=failed?1:0;
