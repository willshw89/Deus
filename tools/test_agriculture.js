"use strict";
// Actual Agriculture, Jobs, Items and Skills sources. Terrain, movement,
// object application, ownership, climate and engine classes are explicit doubles.
// This is not a renderer, real generator, Colonists planner or editor-F5 test.
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert/strict");
const root = path.resolve(__dirname, ".."), read = name => fs.readFileSync(path.join(root, "game/js/plugins", name + ".js"), "utf8");
let agriculture = read("UF_Agriculture");
const originals = { UF_Items: read("UF_Items"), UF_Jobs: read("UF_Jobs"), UF_Skills: read("UF_Skills") };
const catalog = JSON.parse(fs.readFileSync(path.join(root, "game/data/UF_WorldCatalog.json"), "utf8"));
const mutant = (process.argv.find(a => a.startsWith("--mutant=")) || "").slice(9);
const mutations = {};
if (mutant) { assert.ok(mutations[mutant], "known mutation"); const [a,b] = mutations[mutant]; assert.ok(agriculture.includes(a), "mutation target still exists"); agriculture = agriculture.replace(a,b); }
let passed = 0, failed = 0;
function check(name, fn) { try { fn(); passed++; console.log(`PASS agriculture.${name}`); } catch(e) { failed++; console.error(`FAIL agriculture.${name}: ${e.stack || e.message}`); } }
const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
const area = z => ({x:0,y:0,z});
const ref = (x=12,y=12,z=0) => ({area:{x:0,y:0},x,y,z});
function fixture() {
    const size=32, objects=new Map(), ground=new Map(), shapes=new Map(), owners=new Map(), reserved=new Set(), water=new Set(), fire=new Set(), events=new Map(), logs=[], done=[], mappings=[];
    let nextId=1,tick=0,viewZ=0,temperature=18,weather="clear",blockedPath=false,refuseObject=false;
    const key=(a,x,y)=>`${a.x},${a.y},${zOf(a)}:${x},${y}`;
    const cat=JSON.parse(JSON.stringify(catalog));
    const types=cat.objects.map((o,i)=>({...o,typeId:i+1}));
    const clock={year:125,monthIndex:0,day:1,hour:10,minute:0,isPaused:false};
    const W={state:{version:4,seed:20260919,size,startArea:{x:0,y:0},units:{},objectDiffs:{},diffs:{}},EVENT_BASE:1000,
        isLevel:z=>Number.isInteger(z)&&z>=-2&&z<=2,inWorld:(x,y,z=0)=>x===0&&y===0&&Number.isInteger(z)&&z>=-2&&z<=2,
        hash32(...xs){let h=2166136261;for(const x of xs){h^=Number(x)||0;h=Math.imul(h,16777619);}return h>>>0;},
        levelKey:(x,y,z)=>`${x},${y},${z}`,zOf,viewLevel:()=>area(viewZ),currentArea:()=>viewZ===0?{x:0,y:0}:null,levelOfMapId:()=>area(viewZ),
        unit:id=>W.state.units[id]||null,units:()=>Object.values(W.state.units),eventOf:()=>null,
        unitsInArea:(x,y,z=0)=>W.units().filter(u=>u.area.x===x&&u.area.y===y&&u.z===z),
        getTile:(ax,ay,x,y,layer,z=0)=>water.has(key({x:ax,y:ay,z},x,y))?9:(ground.get(key({x:ax,y:ay,z},x,y))||"grass"),
        walkable(ax,ay,x,y,opts={}){const a={x:ax,y:ay,z:opts.z===undefined?0:opts.z},s=shape(ref(x,y,a.z)),o=O.atIn(a,x,y);return x>=0&&y>=0&&x<size&&y<size&&!water.has(key(a,x,y))&&s.shape!=="solid"&&s.shape!=="open"&&(opts.ground||!o||o.passable===true);},
        cellFree(ax,ay,x,y,ignore,z=0){return W.walkable(ax,ay,x,y,{z})&&!W.units().some(u=>u.id!==ignore&&u.z===z&&u.x===x&&u.y===y);},
        findPath(a,sx,sy,gx,gy,opts={}){if(blockedPath||!W.walkable(a.x,a.y,gx,gy,{z:zOf(a)}))return null;const queue=[[sx,sy]],seen=new Map([[`${sx},${sy}`,null]]);for(let n=0;n<queue.length;n++){const [x,y]=queue[n];if(x===gx&&y===gy){const out=[];let p=[x,y];while(p&&(p[0]!==sx||p[1]!==sy)){out.push({x:p[0],y:p[1]});p=seen.get(`${p[0]},${p[1]}`);}return out.reverse();}for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!seen.has(k)&&W.walkable(a.x,a.y,nx,ny,{z:zOf(a)})){seen.set(k,[x,y]);queue.push([nx,ny]);}}}return null;},
        reachable(a,sx,sy,gx,gy){return !!W.findPath(a,sx,sy,gx,gy);},sendUnit(id,g){const u=W.unit(id);if(!u||u.z!==zOf(g))return false;u.goal=g;return true;},stopUnit(id){if(W.unit(id))W.unit(id).goal=null;},
        setObject(ax,ay,x,y,t,z=0){return O.setIn({x:ax,y:ay,z},x,y,t);},getObject:(ax,ay,x,y,z=0)=>{const t=O.atIn({x:ax,y:ay,z},x,y);return t?t.typeId:0;}
    };
    function shape(r){return shapes.get(key({...r.area,z:zOf(r)},r.x,r.y))||{shape:zOf(r)>0?"open":"floor",material:zOf(r)===0?"stone":"soil",constructed:false,water:false};}
    const O={types:()=>types,type:id=>types.find(t=>typeof id==="number"?t.typeId===id:t.id===id)||null,typeId:id=>{const t=O.type(id);return t?t.typeId:0;},
        atIn:(a,x,y)=>O.type(objects.get(key(a,x,y)))||null,setIn(a,x,y,id){if(refuseObject)return false;const t=id?O.type(id):null;if(id&&!t)return false;const before=O.atIn(a,x,y);if(t)objects.set(key(a,x,y),t.id);else objects.delete(key(a,x,y));W.state.objectDiffs[key(a,x,y)]=t?t.id:null;context.UF.Events.emit(zOf(a)?"objects:levelChanged":"objects:changed",a,x,y,before&&before.id,t&&t.id);return true;},
        findIn(a,o){const out=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++){const t=O.atIn(a,x,y),d=Math.hypot(x-o.near.x,y-o.near.y);if(t&&d<=(o.radius||20)&&(!o.id||o.id===t.id)&&(!o.action||t.actions&&t.actions[o.action])&&(!o.tags||o.tags.every(k=>(t.tags||[]).includes(k))))out.push({x,y,type:t,dist:d});}return out.sort((a,b)=>a.dist-b.dist||a.y-b.y||a.x-b.x).slice(0,o.limit||Infinity);},
        applyIn(a,x,y,action,u){const t=O.atIn(a,x,y),act=t&&t.actions&&t.actions[action];if(!act)return null;if(!O.setIn(a,x,y,act.becomes||null))return null;const items=[];for(const [id,n]of Object.entries(act.yields||{}))items.push(...context.UF.Items.drop(a,x,y,id,n));return {ok:true,from:t.id,to:act.becomes||null,yields:act.yields||{},items};},
        hourNow:()=>(((clock.year*12+clock.monthIndex)*28+clock.day-1)*24+clock.hour),refresh(){},generated:{}}
    const site={area:{x:0,y:0},z:0,site:{x:8,y:8},siteId:1,factionId:"npc",radius:4,plan:[]};
    class Base{update(){}start(){}createCharacters(){}createAllWindows(){}isMapPassable(){return true;}}
    class Sprite extends Base{constructor(){super();this.children=[];this.anchor={set(){}};this.scale={set(){}};}addChild(s){this.children.push(s);s.parent=this;}removeChild(s){this.children=this.children.filter(x=>x!==s);}setFrame(){}hide(){this.visible=false;}show(){this.visible=true;}}
    const context={console:{log(){},warn(...a){logs.push(a.join(" "));},error(...a){logs.push(a.join(" "));}},performance,Sprite,Bitmap:class{constructor(w,h){this.width=w;this.height=h;}clear(){}drawText(){}fillRect(){}isReady(){return true;}},
        Scene_Map:class extends Base{},Scene_Boot:class extends Base{},Game_Map:class extends Base{},Game_CharacterBase:class extends Base{},Game_Event:class extends Base{},Spriteset_Map:class extends Base{},Rectangle:class{},
        SceneManager:{},Graphics:{boxWidth:816,boxHeight:624},ImageManager:{loadCharacter:()=>({isReady:()=>true,width:144,height:192}),loadTileset:()=>({isReady:()=>true})},
        Tilemap:{isWaterTile:t=>t===9,isTileA1:t=>t===9},Input:{keyMapper:{},isTriggered:()=>false,isPressed:()=>false},TouchInput:{isTriggered:()=>false,isCancelled:()=>false},
        PluginManager:{parameters:()=>({})},DataManager:{createGameObjects(){},extractSaveContents(contents){W.state=contents.ufWorld;Object.assign(clock,contents.ufTime);}},$ufWorldCatalog:cat,$ufTime:clock,
        UF:{World:W,Objects:O,Time:{ticks:()=>tick,get paused(){return clock.isPaused;}},
            Events:{on(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn);},emit(name,...args){if(name==="jobs:done")done.push(args[0]);for(const fn of events.get(name)||[])fn(...args);}},
            Levels:{cellAt:shape,shapeAt:r=>shape(r).shape,standableShape:r=>["floor","ramp","stairUp","stairDown","stairBoth"].includes(shape(r).shape),isConnectorCell:r=>/stair|ramp/.test(shape(r).shape),waterAt:r=>water.has(key({...r.area,z:zOf(r)},r.x,r.y))},
            WorldGen:{cellInfoLocal:(ax,ay,x,y,z=0)=>({ground:ground.get(key({x:ax,y:ay,z},x,y))||(z===0?"grass":"soil"),water:water.has(key({x:ax,y:ay,z},x,y)),walkable:W.walkable(ax,ay,x,y,{z,ground:true}),fields:{t:0.5,r:0.6,d:0.5},biomeId:"TEST_Biome"})},
            Tiles:{kindOfTile:t=>({id:t,passable:!["rock","peak_rock",9].includes(t)})},
            DayNight:{hours:()=>clock.hour+clock.minute/60,daylight:(h,z=0)=>z<0?0:h>=7&&h<19?1:0},Environment:{ambientTemperature:()=>temperature,weather:()=>weather},
            Fire:{isBurning:(a,x,y)=>fire.has(key(a,x,y))},Combat:{inCombat:u=>!!u.data.inCombat},Factions:{playerId:()=>"player"},
            Ownership:{ownerOf:r=>owners.get(key({...r.area,z:zOf(r)},r.x,r.y))||null,canUse:(u,r)=>{const o=owners.get(key({...r.area,z:zOf(r)},r.x,r.y));return !o||o.kind==="public"||o.kind==="faction"&&o.id===u.data.faction||o.kind==="unit"&&o.id===u.id;},claim:(r,o)=>{owners.set(key({...r.area,z:zOf(r)},r.x,r.y),o);return o;},setOwner(r,o){owners.set(key({...r.area,z:zOf(r)},r.x,r.y),o);return true;}},
            NaturalConnections:{reserved:r=>reserved.has(key({...r.area,z:zOf(r)},r.x,r.y))},
            Households:{of:()=>null,structures:()=>[],state:()=>({byId:{}})},Floors:{roomAt:()=>null},
            Colonists:{state:u=>u?{...site,z:u.z,factionId:u.data.faction,siteId:u.data.site}:site,settlements:()=>[site],units:()=>W.units(),isColonist:u=>u.data.kind==="colonist",_internal:{}},
            Select:{primary:()=>null},Interact:{isOpen:()=>false},CultureGrowth:{record(){}}}};
    context.window=context;vm.createContext(context);
    for(const name of ["UF_Items","UF_Jobs","UF_Skills"])vm.runInContext(originals[name],context,{filename:name+".js"});
    const realMap=context.UF.Skills.mapJob;context.UF.Skills.mapJob=function(...args){mappings.push(args);return realMap(...args);};
    vm.runInContext(agriculture,context,{filename:"UF_Agriculture.js"});new context.Scene_Boot().start();
    const I=context.UF.Items,J=context.UF.Jobs,A=context.UF.Agriculture;
    J.define("TEST_work",{plan:()=>({ok:true,stand:null}),work:100000,apply(){}});
    function unit(z=0,data={},x=8,y=12){const u={id:nextId++,name:"TEST_Farmer",area:{x:0,y:0},z,x,y,data:{kind:"person",ai:"settlement",species:"human",faction:"npc",site:1,age:30,hp:30,needs:{hunger:0,thirst:0,sleep:0},inventory:[],equipment:{},skillXp:{farming:0},...data}};W.state.units[u.id]=u;return u;}
    function update(n=1){for(let i=0;i<n;i++){if(clock.isPaused)continue;tick++;for(const u of W.units())if(u.goal){const p=W.findPath({...u.area,z:u.z},u.x,u.y,u.goal.x,u.goal.y);if(p&&p.length){u.x=p[0].x;u.y=p[0].y;}if(u.x===u.goal.x&&u.y===u.goal.y)u.goal=null;}J.update();}}
    function minutes(n){if(clock.isPaused)return;for(let i=0;i<n;i++){clock.minute++;if(clock.minute>=60){clock.minute=0;clock.hour++;}if(clock.hour>=24){clock.hour=0;clock.day++;}if(clock.day>28){clock.day=1;clock.monthIndex++;}if(clock.monthIndex>=12){clock.monthIndex=0;clock.year++;}context.UF.Events.emit("time:minute",clock.hour,clock.minute);if(clock.minute===0)context.UF.Events.emit("time:hour",clock.hour);}}
    function settle(job,max=5000){for(let i=0;job&&!["done","failed"].includes(job.state)&&i<max;i++)update();return job;}
    return {W,O,I,J,A,context,clock,site,types,objects,ground,shapes,owners,reserved,water,fire,logs,done,mappings,key,unit,update,minutes,settle,
        setView:z=>{viewZ=z;},setTemperature:n=>{temperature=n;},setWeather:s=>{weather=s;},blockPath:b=>{blockedPath=b;},refuseObject:b=>{refuseObject=b;},
        put:(r,id)=>O.setIn({...r.area,z:zOf(r)},r.x,r.y,id),setShape:(r,s)=>shapes.set(key({...r.area,z:zOf(r)},r.x,r.y),s),
        reload(){const save=JSON.parse(JSON.stringify({ufWorld:W.state,ufTime:clock}));context.DataManager.extractSaveContents(save);return save;}};
}

function prepared(z=0,cropId=z<0?"mushroom":"root") {
    const h=fixture(),u=h.unit(z,{},14,18),r=ref(18,18,z);
    h.water.add(h.key(area(z),18,16));
    const suitability=h.A.suitability(r,cropId);assert.ok(suitability.ok,JSON.stringify(suitability));
    const p=h.A.designate(u,r,cropId);assert.ok(p,"plot designated");
    return {...h,u,r,p,cropId};
}
function tilled(z=0,cropId) {const h=prepared(z,cropId),j=h.A.order(h.u,h.p.id,"till");assert.ok(j,"till order exists");h.settle(j);assert.equal(j.state,"done",j.reason);assert.equal(h.A.at(h.r).phase,"tilled");return h;}
function planted(z=-1,cropId="mushroom") {const h=tilled(z,cropId),c=h.A.crops().find(c=>c.id===cropId);assert.ok(c);for(const [id,n]of Object.entries(c.inputs))h.I.give(id,n,h.u.id);const j=h.A.order(h.u,h.p.id,"plant");assert.ok(j,"plant order exists");h.settle(j);assert.equal(j.state,"done",j.reason);assert.equal(h.A.at(h.r).phase,"growing");return {...h,c};}
function mature(h) {for(let n=0;n<10000&&h.A.at(h.r).phase!=="ripe";n++){const p=h.A.at(h.r);if(p.careMinutes<90){const j=h.A.order(h.u,p.id,"tend");assert.ok(j,"tend exists");h.settle(j);assert.equal(j.state,"done",j.reason);}h.minutes(30);h.A.processGrowth();}assert.equal(h.A.at(h.r).phase,"ripe","crop eventually ripe under suitable conditions and care");return h;}

check("inspection_does_not_initialize",()=>{const h=fixture(),before=JSON.stringify(h.W.state);assert.equal(h.A.peek(),null);h.A.plots();h.A.at(ref());h.A.describe(h.unit());assert.equal(h.W.state.agriculture,undefined);assert.ok(before);});
check("custom_jobs_map_to_farming",()=>{const h=fixture();for(const type of ["farm_till","farm_plant","farm_tend","farm_harvest"]){assert.ok(h.J.handler(type),type);assert.equal(h.context.UF.Skills.skillOfJob(type),"farming",type);}});
check("reservation_then_physical_tilling",()=>{const h=prepared();assert.equal(h.p.phase,"reserved");assert.equal(h.O.atIn(area(0),18,18),null);const j=h.A.order(h.u,h.p.id,"till");assert.ok(j);h.update(1);assert.notEqual(j.state,"done");assert.equal(h.O.atIn(area(0),18,18),null);h.settle(j);assert.equal(j.state,"done",j.reason);assert.equal(h.O.atIn(area(0),18,18).id,"farm_plot");assert.equal(h.A.at(h.r).phase,"tilled");assert.ok(h.context.UF.Skills.xp(h.u,"farming")>0);});
check("till_object_failure_not_success",()=>{const h=prepared(),j=h.A.order(h.u,h.p.id,"till");h.refuseObject(true);h.settle(j);assert.equal(j.state,"failed");assert.equal(h.A.at(h.r).phase,"reserved");assert.equal(h.context.UF.Skills.xp(h.u,"farming"),0);});
check("plant_consumes_real_inputs_after_work",()=>{const h=tilled(-1),c=h.A.crops().find(c=>c.id==="mushroom");for(const [id,n]of Object.entries(c.inputs))h.I.give(id,n,h.u.id);const j=h.A.order(h.u,h.p.id,"plant");assert.ok(j);h.update(1);for(const [id,n]of Object.entries(c.inputs))assert.equal(h.I.count(h.u.id,id),n);assert.equal(h.A.at(h.r).phase,"tilled");h.settle(j);assert.equal(j.state,"done",j.reason);for(const id of Object.keys(c.inputs))assert.equal(h.I.count(h.u.id,id),0);assert.equal(h.A.at(h.r).phase,"growing");});
check("missing_plant_stock_no_growth",()=>{const h=tilled(),j=h.A.order(h.u,h.p.id,"plant");if(j)h.settle(j);assert.ok(!j||j.state==="failed");assert.equal(h.A.at(h.r).phase,"tilled");assert.equal(h.I.count(h.u.id,"root"),0);});
check("input_disappears_during_plant_no_false_success",()=>{const h=tilled(),stock=h.I.give("seeds",1,h.u.id),j=h.A.order(h.u,h.p.id,"plant");assert.ok(j);h.update(1);h.I.remove(stock[0].id);const xp=h.context.UF.Skills.xp(h.u,"farming");h.settle(j);assert.equal(j.state,"failed");assert.equal(h.A.at(h.r).phase,"tilled");assert.equal(h.context.UF.Skills.xp(h.u,"farming"),xp);});
check("planting_cancellation_consumes_nothing",()=>{const h=tilled();h.I.give("seeds",1,h.u.id);const j=h.A.order(h.u,h.p.id,"plant");assert.ok(j);h.update(1);h.J.cancel(j.id,"TEST_interrupt");h.update(500);assert.equal(h.I.count(h.u.id,"seeds"),1);assert.equal(h.A.at(h.r).phase,"tilled");});
check("offscreen_saved_calendar_growth",()=>{const h=planted();h.setView(0);const p=h.A.at(h.r),before=p.growthMinutes;h.minutes(30);h.A.processGrowth();assert.ok(h.A.at(h.r).growthMinutes>before);assert.equal(h.W.viewLevel().z,0);assert.equal(h.A.at(ref(18,18,0)),null);});
check("growth_requires_care",()=>{const h=planted(),p=h.A.at(h.r);p.careMinutes=0;const before=p.growthMinutes;h.minutes(60);h.A.processGrowth();assert.equal(p.growthMinutes,before);assert.notEqual(p.phase,"ripe");});
check("growth_requires_water",()=>{const h=planted(),p=h.A.at(h.r),before=p.growthMinutes;h.water.clear();h.minutes(60);h.A.processGrowth();assert.equal(p.growthMinutes,before);});
check("growth_requires_temperature",()=>{const h=planted(),p=h.A.at(h.r),before=p.growthMinutes;h.setTemperature(-50);h.minutes(60);h.A.processGrowth();assert.equal(p.growthMinutes,before);});
check("root_darkness_does_not_grow",()=>{const h=planted(0,"root");h.clock.hour=23;h.clock.minute=0;h.A.at(h.r).lastMinute=h.A.nowMinutes();const before=h.A.at(h.r).growthMinutes;h.minutes(30);h.A.processGrowth();assert.equal(h.A.at(h.r).growthMinutes,before);});
check("paused_calendar_has_no_growth",()=>{const h=planted(),before=JSON.stringify(h.A.at(h.r)),now=h.A.nowMinutes();h.clock.isPaused=true;h.minutes(120);h.update(100);h.A.processGrowth();assert.equal(h.A.nowMinutes(),now);assert.equal(JSON.stringify(h.A.at(h.r)),before);});
check("growth_duplicate_pass_and_clock_rollback",()=>{const h=planted();h.minutes(30);h.A.processGrowth();const before=h.A.at(h.r).growthMinutes;h.A.processGrowth();h.A.processGrowth();assert.equal(h.A.at(h.r).growthMinutes,before);h.clock.hour--;h.A.processGrowth();assert.equal(h.A.at(h.r).growthMinutes,before);});
check("bounded_growth_catchup",()=>{const h=planted(),p=h.A.at(h.r),before=p.growthMinutes;h.clock.day+=3;h.A.processGrowth();assert.ok(p.growthMinutes-before<=30,"one catchup pass cannot award days of crop growth");});
check("tending_is_work_not_instant_care",()=>{const h=planted(),p=h.A.at(h.r);p.careMinutes=0;const j=h.A.order(h.u,p.id,"tend");assert.ok(j);h.update(1);assert.equal(p.careMinutes,0);h.settle(j);assert.equal(j.state,"done",j.reason);assert.ok(p.careMinutes>0&&p.careMinutes<=720);});
check("harvest_real_output_once_after_work",()=>{const h=mature(planted()),p=h.A.at(h.r),count=h.I.count({...h.r},"mushroom"),j=h.A.order(h.u,p.id,"harvest");assert.ok(j);h.update(1);assert.equal(h.I.count({...h.r},"mushroom"),count);h.settle(j);assert.equal(j.state,"done",j.reason);assert.equal(h.I.count({...h.r},"mushroom"),count+4);assert.equal(p.phase,"tilled");const again=h.A.order(h.u,p.id,"harvest");if(again)h.settle(again);assert.ok(!again||again.state==="failed");assert.equal(h.I.count({...h.r},"mushroom"),count+4);});
check("stale_revision_cannot_harvest",()=>{const h=mature(planted()),p=h.A.at(h.r),j=h.A.order(h.u,p.id,"harvest");assert.ok(j);p.revision++;h.settle(j);assert.equal(j.state,"failed");assert.equal(h.I.count({...h.r},"mushroom"),0);});
check("plot_object_removed_before_harvest",()=>{const h=mature(planted()),j=h.A.order(h.u,h.p.id,"harvest");assert.ok(j);h.put(h.r,null);h.settle(j);assert.equal(j.state,"failed");assert.equal(h.I.count({...h.r},"mushroom"),0);});
check("worker_changed_level_refused",()=>{const h=prepared(),j=h.A.order(h.u,h.p.id,"till");assert.ok(j);h.u.z=-1;h.settle(j);assert.equal(j.state,"failed");assert.equal(h.O.atIn(area(0),18,18),null);assert.equal(h.O.atIn(area(-1),18,18),null);});
check("plot_faction_cannot_be_stolen",()=>{const h=tilled(),other=h.unit(0,{faction:"other"},17,18);h.I.give("seeds",1,other.id);const j=h.A.order(other,h.p.id,"plant");if(j)h.settle(j);assert.ok(!j||j.state==="failed");assert.equal(h.I.count(other.id,"seeds"),1);assert.equal(h.A.at(h.r).phase,"tilled");});
check("invalid_order_preserves_current_job",()=>{const h=prepared(),old=h.J.create({type:"TEST_work",owner:h.u.id});h.A.order(h.u,h.p.id,"harvest");assert.equal(h.J.of(h.u.id),old);assert.notEqual(old.state,"failed");});
check("adults_and_urgent_needs_only",()=>{for(const data of [{age:undefined},{age:17},{dead:true},{_isDying:true},{hp:0},{inCombat:true},{burning:true},{thermal:{stage:"heatstroke"}},{needs:{hunger:90}},{needs:{thirst:90}},{needs:{sleep:99}}]){const h=prepared();Object.assign(h.u.data,data);const before=h.J.list().length;const j=h.A.planJob(h.u);assert.equal(j,null,JSON.stringify(data));assert.equal(h.J.list().length,before);}});
check("autonomy_keeps_explicit_work",()=>{const h=prepared(),old=h.J.create({type:"TEST_work",owner:h.u.id,params:{ordered:true}});assert.equal(h.A.planJob(h.u),null);assert.equal(h.J.of(h.u.id),old);});
check("unsuitable_ground_or_support_refused",()=>{for(const mode of ["water","rock","wood","solid","air","connector"]){const h=fixture(),r=ref(18,18,mode==="rock"?0:-1);h.water.add(h.key(area(zOf(r)),18,16));if(mode==="water")h.water.add(h.key(area(zOf(r)),18,18));if(mode==="rock")h.ground.set(h.key(area(0),18,18),"rock");if(mode==="wood")h.setShape(r,{shape:"floor",material:"wood",constructed:true});if(mode==="solid")h.setShape(r,{shape:"solid",material:"soil",constructed:false});if(mode==="air")h.setShape(r,{shape:"open",material:"soil",constructed:false});if(mode==="connector")h.setShape(r,{shape:"stairBoth",material:"soil",constructed:false});assert.equal(h.A.suitability(r,zOf(r)?"mushroom":"root").ok,false,mode);}});
check("layer_crop_permissions",()=>{const h=fixture();for(const z of [-2,-1,0,1,2]){const r=ref(18,18,z);h.water.add(h.key(area(z),18,16));if(z>=0)assert.equal(h.A.suitability(r,"mushroom").ok,false,`fungus at ${z}`);if(z<0)assert.equal(h.A.suitability(r,"root").ok,false,`root at ${z}`);}});
check("other_owned_objects_and_passages_protected",()=>{for(const mode of ["owned","passage"]){const h=fixture(),u=h.unit(),r=ref(18,18);h.water.add(h.key(area(0),18,16));if(mode==="owned")h.owners.set(h.key(area(0),18,18),{kind:"faction",id:"other"});else h.reserved.add(h.key(area(0),18,18));assert.equal(h.A.designate(u,r,"root"),null,mode);assert.equal(h.O.atIn(area(0),18,18),null);}});
check("missing_seed_planner_does_not_invent_stock",()=>{const h=tilled(),before=h.I.all().length;for(let i=0;i<20;i++){const j=h.A.planJob(h.u);if(j)h.settle(j);}assert.equal(h.A.at(h.r).phase,"tilled");assert.equal(h.I.all().length,before);});
check("save_reload_keeps_crop_calendar_and_job",()=>{const h=planted();h.minutes(30);h.A.processGrowth();const id=h.u.id,r=h.r,before=JSON.stringify(h.A.at(r)),n=h.A.nowMinutes();h.reload();assert.equal(JSON.stringify(h.A.at(r)),before);assert.equal(h.A.nowMinutes(),n);const u=h.W.unit(id);const j=h.A.order(u,h.A.at(r).id,"tend");assert.ok(j);h.settle(j);assert.equal(j.state,"done",j.reason);assert.ok(h.A.at(r).careMinutes>0);});
check("no_captured_contract_errors",()=>{const h=mature(planted());const j=h.A.order(h.u,h.p.id,"harvest");h.settle(j);assert.deepEqual(h.logs,[]);assert.deepEqual(Array.from(h.context.UF.Skills.errors),[]);});

console.log(`RESULT: ${passed} passed, ${failed} failed`);
if (!passed && !failed) { console.error("FAIL agriculture.no_cases: source test construction is incomplete"); process.exitCode=1; }
else process.exitCode=failed?1:0;
