/*:
 * @target MZ
 * @plugindesc [UF Agriculture] Saved, layer-aware plots, physical planting/tending and real food harvests.
 * @author Codex
 * @base UF_World
 * @base UF_Jobs
 * @orderAfter UF_Levels
 * @orderAfter UF_Items
 * @orderAfter UF_Ownership
 * @orderAfter UF_Households
 * @orderAfter UF_Skills
 * @help
 * Two initial crop families use existing items and the existing farm_plot.
 * Work and carried planting inputs are real jobs. Growth uses saved calendar
 * minutes on every layer, never the viewed map or elapsed wall-clock time.
 * No free seeds, terrain excavation, animal husbandry or market simulation.
 * API and limits: docs/systems/UF_Agriculture.md. No core methods replaced.
 */
(() => {
    "use strict";
    const VERSION=1, MAX_PLOTS=32, MAX_WORKERS=3, SEARCH=80, RETRY=60, MAX_ELAPSED=30, CARE=360, MAX_CARE=720;
    const CROPS=[
        {id:"root",name:"Root vegetables",levels:[0,1,2],inputs:{seeds:1},outputs:{root:3,seeds:1},growMinutes:2880,minTemp:4,maxTemp:35},
        {id:"mushroom",name:"Cave mushrooms",levels:[-1,-2],inputs:{mushroom:1,straw:1},outputs:{mushroom:4},growMinutes:2160,minTemp:5,maxTemp:28}
    ];
    const SOIL=new Set(["grass","soil","meadow","tropical_grass","dry_grass","shrub_soil","forest_floor","needle_floor","jungle_floor","tundra","red_clay","mud","swamp_mud","dirt","cursed_grass","blessed_grass"]);
    const ACTIONS=["till","plant","tend","harvest"], WORK={till:180,plant:120,tend:120,harvest:180};
    const W=()=>UF.World,J=()=>UF.Jobs,O=()=>UF.Objects,I=()=>UF.Items,C=()=>UF.Colonists;
    const own=()=>UF.Ownership;
    const z=r=>r&&r.z!==undefined?r.z:r&&r.area&&r.area.z!==undefined?r.area.z:0;
    const area=r=>({x:r.area?r.area.x:r.x,y:r.area?r.area.y:r.y,z:z(r)});
    const ref=r=>({area:{x:r.area.x,y:r.area.y},z:z(r),x:r.x,y:r.y});
    const same=(a,b)=>!!a&&!!b&&area(a).x===area(b).x&&area(a).y===area(b).y&&z(a)===z(b);
    const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
    const active=j=>j&&["open","travel","work"].includes(j.state);
    const dead=u=>!u||!u.data||u.data.dead||u.data.dying||u.data._isDying||(Number.isFinite(u.data.hp)&&u.data.hp<=0);
    const crop=id=>CROPS.find(c=>c.id===id)||null;
    const emit=(name,...args)=>{if(UF.Events&&UF.Events.emit)UF.Events.emit(name,...args);};
    const peek=()=>W()&&W().state&&W().state.agriculture||null;
    function state() {
        const w=W(); if(!w||!w.state)return null;
        if(!w.state.agriculture)w.state.agriculture={version:VERSION,plots:{},settlements:{}};
        return w.state.agriculture;
    }
    function valid(r) {
        const w=W(),a=r&&r.area;
        return !!(w&&w.state&&a&&Number.isInteger(a.x)&&Number.isInteger(a.y)&&Number.isInteger(z(r))&&z(r)>=-2&&z(r)<=2&&
            Number.isInteger(r.x)&&Number.isInteger(r.y)&&r.x>=0&&r.y>=0&&r.x<w.state.size&&r.y<w.state.size&&
            (!w.inWorld||w.inWorld(a.x,a.y,z(r))));
    }
    const idOf=r=>valid(r)?`plot:${r.area.x},${r.area.y},${z(r)}:${r.x},${r.y}`:null;
    const at=r=>{const s=peek(),id=idOf(r);return s&&id&&s.plots[id]||null;};
    const reserved=r=>!!at(r);
    function plots(filter={}) {
        return Object.values(peek()&&peek().plots||{}).filter(p=>(!filter.area||(p.area.x===filter.area.x&&p.area.y===filter.area.y))&&
            (filter.z===undefined&&(filter.area&&filter.area.z)===undefined||z(p)===(filter.z===undefined?filter.area.z:filter.z))&&
            (filter.siteId===undefined||p.siteId===filter.siteId)&&(filter.faction===undefined||p.faction===filter.faction));
    }
    function nowMinutes() {
        const t=window.$ufTime;
        if(!t||![t.year,t.monthIndex,t.day,t.hour,t.minute].every(Number.isFinite))return null;
        return (((t.year*12+t.monthIndex)*28+t.day-1)*24+t.hour)*60+t.minute;
    }
    const siteKey=c=>`${c.factionId}:${c.siteId}:${c.area.x},${c.area.y},${z(c)}`;
    function settlement(u) {
        const c=u&&C()&&C().state(u);
        return c&&u.data&&c.site&&same(c,u)&&c.siteId===u.data.site&&c.factionId===u.data.faction?c:null;
    }
    function eligible(u) {
        if(!u || !W() || W().unit(u.id) !== u || dead(u)) return false;
        const d = u.data;
        if(!d || !Number.isFinite(d.age) || d.age < 18) return false;
        if(d.inCombat || d.burning) return false;
        if(d.thermal && (d.thermal.stage === "heatstroke" || d.thermal.stage === "hypothermia")) return false;
        if(d.needs && (d.needs.hunger >= 90 || d.needs.thirst >= 90 || d.needs.sleep >= 90)) return false;
        return (d.kind === "colonist" || d.kind === "person" && d.ai === "settlement") && !!settlement(u);
    }
    function siteRecord(c) {
        const s=state(),key=siteKey(c);
        return s.settlements[key]||(s.settlements[key]={faction:c.factionId,siteId:c.siteId,area:{...c.area},z:z(c),lastSearch:null,searchCursor:0,blocked:"",missingInputs:[],harvests:0});
    }
    function members(c) {
        return W().units().filter(u=>!dead(u)&&same(c,u)&&u.data.faction===c.factionId&&u.data.site===c.siteId&&["colonist","person"].includes(u.data.kind));
    }
    function ownerAllowed(u,owner) {
        return !owner||owner.kind==="public"||owner.kind==="unit"&&owner.id===u.id||owner.kind==="faction"&&owner.id===u.data.faction;
    }
    const objectOwner=p=>own()&&own().ownerOf({kind:"object",...ref(p)});
    function plotOwnerAllowed(p,u) {
        const owner=objectOwner(p);
        return !owner||owner.kind==="public"||owner.kind==="faction"&&owner.id===p.faction||
            owner.kind==="unit"&&(u?owner.id===u.id:owner.id===p.founderId);
    }
    function protectedCell(p) {
        const w=W(),cs=w.state.colony;
        for(const c of [cs,...Object.values(cs&&cs.settlements||{})].filter(Boolean))if(same(c,p)) {
            if(c.site&&distance(c.site,p)<=1)return true;
            for(const s of c.plan||[])if(s.build)for(const [dx,dy]of s.cells||[])if(c.site.x+dx===p.x&&c.site.y+dy===p.y)return true;
        }
        for(const h of Object.values(w.state.households&&w.state.households.byId||{}))if(same(h,p)&&h.home) {
            for(const b of [h.home,...h.home.annexes||[]])if(p.x>=b.x-1&&p.y>=b.y-1&&p.x<=b.x+b.w&&p.y<=b.y+b.h)return true;
        }
        const n=w.state.naturalConnections;
        for(const a of (n&&n.links||[]).flatMap(l=>[l.a,l.b]).concat((n&&n.chains||[]).flatMap(c=>c.landings||[])))if(same(a,p)&&distance(a,p)<=1)return true;
        if(UF.NaturalConnections && typeof UF.NaturalConnections.reserved === "function" && UF.NaturalConnections.reserved(p)) return true;
        return false;
    }
    function ground(p) {
        const l=UF.Levels,cell=l&&l.cellAt(p);
        if(!cell||cell.shape!=="floor"||cell.constructed)return null;
        if(z(p)!==0)return {soil:cell.material==="soil",material:cell.material,kind:cell.material};
        const tile=W().getTile&&W().getTile(p.area.x,p.area.y,p.x,p.y,0,0);
        const k=UF.Tiles&&UF.Tiles.kindOfTile&&UF.Tiles.kindOfTile(tile);
        // A known current tile wins over the original generator, particularly roads and floors.
        if(k)return {soil:SOIL.has(k.id),material:SOIL.has(k.id)?"soil":"stone",kind:k.id};
        return null; // Unknown edited/stock tiles are not evidence of natural soil.
    }
    function sky(p) {
        if(z(p)<0)return false;
        const l=UF.Levels;if(!l||!l.shapeAt)return false;
        for(let level=z(p)+1;level<=2;level++)if(l.shapeAt({...ref(p),z:level})!=="open")return false;
        return true;
    }
    function waterNear(p) {
        const j=J();if(!j||!j.isWaterAt)return false;
        for(let r=1;r<=8;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r&&j.isWaterAt(area(p),p.x+dx,p.y+dy))return true;
        return false;
    }
    function temperature(p) {
        if(UF.Environment && typeof UF.Environment.ambientTemperature === "function") {
            const amb = UF.Environment.ambientTemperature(area(p), p.x, p.y);
            if(Number.isFinite(amb)) return amb;
        }
        if(z(p)===-1)return 13;
        if(z(p)===-2)return 16;
        const g=UF.WorldGen,info=g&&g.cellInfoLocal&&g.cellInfoLocal(p.area.x,p.area.y,p.x,p.y,0);
        const f=info&&info.fields&&info.fields.t;
        const a=Number.isFinite(f)?Math.max(0,Math.min(1,f)):0.5;
        const base=a<=0.25?-25+a*100:a<=0.5?(a-0.25)*72:a<=0.75?18+(a-0.5)*48:30+(a-0.75)*60;
        const hour=window.$ufTime?$ufTime.hour+($ufTime.minute||0)/60:12;
        return base-(z(p)===1?4:z(p)===2?10:0)+6*Math.cos((hour-14)*Math.PI/12);
    }
    function suitability(p,cropId) {
        const c=crop(cropId),out={ok:false,reason:"invalid plot or crop",soil:false,water:false,light:false,temperature:null};
        if(!valid(p)||!c||!c.levels.includes(z(p)))return {...out,reason:"crop does not grow on this level"};
        const g=ground(p);
        if(!g||!W().walkable(p.area.x,p.area.y,p.x,p.y,{z:z(p),ground:true})||J().isWaterAt(area(p),p.x,p.y))return {...out,reason:"needs dry natural supported ground"};
        out.soil=g.soil;out.material=g.material;out.kind=g.kind;
        if(c.id==="root"&&!g.soil)return {...out,reason:"roots need natural soil, not paving or rock"};
        if(c.id==="mushroom"&&!["soil","stone"].includes(g.material))return {...out,reason:"needs stone or soil with organic substrate"};
        out.sky=sky(p);out.light=c.id==="mushroom"?!out.sky:out.sky;
        if(!out.light)return {...out,reason:"roots need open sky"};
        out.water=waterNear(p);
        if(!out.water)return {...out,reason:"needs fresh water within eight cells"};
        out.temperature=temperature(p);out.temperatureOk=out.temperature>=c.minTemp&&out.temperature<=c.maxTemp;
        // Planting/tilling may happen at night or during a cold spell; actual growth cannot.
        return {...out,ok:true,reason:""};
    }
    function cellReady(p,u,phase) {
        if(!valid(p)||protectedCell(p))return "plot overlaps a home, building plan or passage";
        if(!plotOwnerAllowed(p,u))return "plot belongs to someone else";
        const o=O().atIn(area(p),p.x,p.y);
        if(phase==="reserved") {
            if(o&&o.id!=="farm_plot")return "plot cell is occupied by an object";
            if(o&&o.id==="farm_plot"&&!at(p))return "existing plot is not this reservation";
            if(W().units().some(v=>v!==u&&!dead(v)&&same(v,p)&&v.x===p.x&&v.y===p.y))return "another creature occupies the plot";
        }else if(!o||o.id!=="farm_plot")return "the tilled plot is gone";
        if(UF.Fire&&UF.Fire.isBurning&&UF.Fire.isBurning(area(p),p.x,p.y))return "plot is burning";
        return suitability(p,p.cropId).reason;
    }
    function designate(u,target,cropId) {
        if(!eligible(u)||!valid(target)||!same(u,target)||nowMinutes()===null)return null;
        const c=settlement(u),prior=at(target);
        if(prior)return prior.faction===u.data.faction&&prior.siteId===u.data.site&&prior.cropId===cropId?prior:null;
        if(plots({area:c.area,z:z(c),siteId:c.siteId,faction:c.factionId}).length>=MAX_PLOTS)return null;
        const p={id:idOf(target),...ref(target),cropId,faction:c.factionId,siteId:c.siteId,founderId:u.id,phase:"reserved",epoch:1,revision:0,cycle:0,
            growthMinutes:0,careMinutes:0,lastMinute:nowMinutes(),plantedMinute:null,harvests:0,blocked:"",lastWork:null};
        if(cellReady(p,u,"reserved")||!W().reachable(area(p),u.x,u.y,p.x,p.y))return null;
        state().plots[p.id]=p;siteRecord(c);emit("agriculture:designated",p,u);return p;
    }
    function carried(u,id) {
        return I().inventoryOf(u.id).filter(it=>it.type===id&&ownerAllowed(u,own()&&own().ownerOf({kind:"item",id:it.id}))).reduce((n,it)=>n+it.count,0);
    }
    const missing=(p,u)=>Object.entries(crop(p.cropId).inputs).filter(([id,n])=>carried(u,id)<n).map(([itemId,n])=>({itemId,count:n-carried(u,itemId)}));
    const actionFor=p=>p.phase==="reserved"?"till":p.phase==="tilled"?"plant":p.phase==="ripe"?"harvest":p.phase==="growing"&&p.careMinutes<=60?"tend":null;
    function refusal(job,why) {job.params.refusal=why;return "continue";}
    function validate(job,u,applying=false) {
        const s=peek(),p=s&&s.plots[job.params.plotId],a=job.type.replace(/^farm_/,"");
        if(job.params.refusal)return {reason:job.params.refusal};
        if(!eligible(u)||!p||!same(u,p)||job.assigned!==u.id||p.faction!==u.data.faction||p.siteId!==u.data.site)return {reason:"worker no longer belongs to this plot's settlement"};
        if(!job.target||idOf(job.target)!==p.id||job.params.epoch!==p.epoch||job.params.revision!==p.revision||job.params.cycle!==p.cycle)return {reason:"plot changed while the work was pending"};
        if(!ACTIONS.includes(a)||a==="till"&&p.phase!=="reserved"||a==="plant"&&p.phase!=="tilled"||a==="tend"&&p.phase!=="growing"||a==="harvest"&&p.phase!=="ripe")return {reason:"crop phase does not permit this work"};
        const reason=cellReady(p,u,p.phase);if(reason)return {reason};
        if(a==="plant"&&missing(p,u).length)return {reason:"planting inputs are missing"};
        if(a==="tend"&&p.careMinutes>MAX_CARE-CARE)return {reason:"plot does not need more tending"};
        if(a==="harvest"&&I().atIn(area(p),p.x,p.y).some(it=>!ownerAllowed(u,own()&&own().ownerOf({kind:"item",id:it.id}))))return {reason:"another owner has items on the harvest cell"};
        if(applying&&distance(u,p)>1)return {reason:"worker is no longer beside the plot"};
        return {p,a};
    }
    function recordWork(p,u,job,a,items=[]) {
        p.revision++;p.blocked="";
        const receipt={jobId:job.id,unitId:u.id,plotId:p.id,action:a,revision:p.revision,epoch:p.epoch,cycle:p.cycle,minute:nowMinutes(),items};
        p.lastWork=receipt;
        job.result={farm:true,...receipt,at:ref(p),yields:a==="harvest"?{...crop(p.cropId).outputs}:{}};
        const work=u.data.farming||(u.data.farming={jobs:0,harvests:0,lastAction:null});
        work.jobs++;if(a==="harvest")work.harvests++;work.lastAction=a;
        emit("agriculture:worked",p,u,a,job);
    }
    function applyWork(job,u) {
        const check=validate(job,u,true);if(check.reason)return refusal(job,check.reason);
        const {p,a}=check,c=crop(p.cropId);
        if(a==="till") {
            if(!O().type("farm_plot")||O().setIn(area(p),p.x,p.y,"farm_plot")===false||!O().atIn(area(p),p.x,p.y)||O().atIn(area(p),p.x,p.y).id!=="farm_plot")return refusal(job,"tilling could not change the ground object");
            if(own()&&!objectOwner(p))own().claim({kind:"object",...ref(p)},{kind:"faction",id:p.faction},{reason:"settlement farm"});
            p.phase="tilled";p.lastMinute=nowMinutes();
        }else if(a==="plant") {
            if(Object.keys(c.outputs).some(id=>!I().type(id)))return refusal(job,"crop output definitions are unavailable");
            // Sufficiency of ALL inputs was checked immediately before any consumption.
            for(const [id,n]of Object.entries(c.inputs)) {
                let left=n;
                for(const it of I().inventoryOf(u.id).filter(it=>it.type===id&&ownerAllowed(u,own()&&own().ownerOf({kind:"item",id:it.id})))) {
                    left-=I().consume(it.id,Math.min(left,it.count));if(left<=0)break;
                }
                if(left!==0)return refusal(job,"planting input consumption failed");
            }
            p.phase="growing";p.cycle++;p.growthMinutes=0;p.careMinutes=120;p.lastMinute=nowMinutes();p.plantedMinute=p.lastMinute;
            p.substrate=c.id==="mushroom"?{itemId:"straw",count:1,cycle:p.cycle}:null;
        }else if(a==="tend") {p.careMinutes=Math.min(MAX_CARE,p.careMinutes+CARE);p.lastMinute=nowMinutes();}
        else {
            const outputs=[];
            for(const [id,n]of Object.entries(c.outputs)) {
                const before=new Map(I().atIn(area(p),p.x,p.y).filter(it=>it.type===id).map(it=>[it.id,it.count]));
                for(const it of I().drop(area(p),p.x,p.y,id,n)) {
                    const added=it.count-(before.get(it.id)||0);if(added>0)outputs.push({id:it.id,type:id,count:added});
                    if(own()&&!own().ownerOf({kind:"item",id:it.id}))own().claim({kind:"item",id:it.id},{kind:"faction",id:p.faction},{reason:"farm harvest"});
                }
                if(outputs.filter(it=>it.type===id).reduce((v,it)=>v+it.count,0)!==n)return refusal(job,"harvest output could not be placed");
            }
            p.phase="tilled";p.harvests++;p.growthMinutes=0;p.careMinutes=0;p.lastMinute=nowMinutes();
            siteRecord(settlement(u)).harvests++;recordWork(p,u,job,a,outputs);return;
        }
        recordWork(p,u,job,a);
    }
    function confirmedJob(job,u) {
        const r=job&&job.result,p=r&&peek()&&peek().plots[r.plotId],a=job&&job.type&&job.type.replace(/^farm_/,"");
        if(!job||job.state!=="done"||!ACTIONS.includes(a)||!r||r.farm!==true||!p||!u||!same(u,p)||job.assigned!==u.id||
            !p.lastWork||p.lastWork.jobId!==job.id||p.lastWork.unitId!==u.id||p.lastWork.action!==a||r.action!==a||
            p.revision!==r.revision||p.epoch!==r.epoch||p.cycle!==r.cycle||idOf(job.target)!==p.id||
            !O().atIn(area(p),p.x,p.y)||O().atIn(area(p),p.x,p.y).id!=="farm_plot")return false;
        return a!=="harvest"||Object.entries(crop(p.cropId).outputs).every(([id,n])=>
            (r.items||[]).filter(out=>out.type===id&&(()=>{const it=I().get(out.id);return it&&it.holder===null&&same(it,p)&&it.x===p.x&&it.y===p.y&&it.type===id&&it.count>=out.count;})()).reduce((v,out)=>v+out.count,0)===n);
    }
    function order(u,plotId,action) {
        if(!eligible(u)||J().of(u.id))return null;
        const p=typeof plotId==="object"?at(plotId):peek()&&peek().plots[plotId],a=String(action||p&&actionFor(p)||"").replace(/^farm_/,"");
        if(!p||!ACTIONS.includes(a)||J().list(j=>active(j)&&j.params&&j.params.plotId===p.id).length)return null;
        const job=J().create({type:`farm_${a}`,owner:u.id,target:ref(p),params:{agriculture:true,farm:true,plotId:p.id,epoch:p.epoch,revision:p.revision,cycle:p.cycle}});
        return job&&job.state!=="failed"?job:null;
    }
    function processGrowth() {
        const now=nowMinutes(),st=peek();if(now===null||!st)return 0;
        let changed=0;
        for(const p of Object.values(st.plots)) {
            if(!Number.isFinite(p.lastMinute)){p.lastMinute=now;continue;}
            const elapsed=Math.min(MAX_ELAPSED,Math.max(0,now-p.lastMinute));p.lastMinute=now;
            if(p.phase!=="growing"||elapsed===0)continue;
            const c=crop(p.cropId);if(!c)continue;
            const obj=O().atIn(area(p),p.x,p.y);
            if(!obj||obj.id!=="farm_plot") {p.phase="reserved";p.growthMinutes=0;p.careMinutes=0;p.epoch++;p.revision++;p.blocked="crop lost with its plot";continue;}
            const conditions=suitability(p,p.cropId);
            if(!plotOwnerAllowed(p,null)){p.blocked="plot ownership changed";continue;}
            if(!conditions.ok){p.blocked=conditions.reason;continue;}
            if(!conditions.temperatureOk){p.blocked="temperature outside crop range";continue;}
            if(UF.Fire&&UF.Fire.isBurning&&UF.Fire.isBurning(area(p),p.x,p.y)){p.blocked="plot is burning";continue;}
            const h=window.$ufTime?$ufTime.hour+($ufTime.minute||0)/60:12;
            if(c.id==="root"&&(h<6||h>=19)){p.blocked="waiting for daylight";continue;}
            if(c.id==="mushroom"&&(!p.substrate||p.substrate.cycle!==p.cycle)){p.blocked="organic substrate is missing";continue;}
            const gained=Math.min(elapsed,p.careMinutes,c.growMinutes-p.growthMinutes);
            if(gained<=0){p.blocked="needs tending";continue;}
            p.growthMinutes+=gained;p.careMinutes-=gained;p.blocked="";changed++;
            if(p.growthMinutes>=c.growMinutes){p.phase="ripe";p.revision++;emit("agriculture:ripe",p);}
        }
        return changed;
    }
    function foodUnits(c) {
        const people=members(c),ids=new Set(people.map(u=>u.id));
        return I().all().filter(it=>{
            const type=I().type(it.type);if(!type||!type.food)return false;
            if(it.holder!==null&&it.holder!==undefined)return ids.has(it.holder);
            if(!same(it,c)||distance(it,c.site)>Math.max(12,c.radius||0))return false;
            const owner=own()&&own().ownerOf({kind:"item",id:it.id});return !owner||owner.kind==="public"||owner.kind==="faction"&&owner.id===c.factionId;
        }).reduce((n,it)=>n+it.count,0);
    }
    function inputJob(u,p,s) {
        const needs=missing(p,u);s.missingInputs=needs;if(!needs.length)return null;
        for(const need of needs) {
            const groundItems=I().find({area:area(u),z:z(u),near:{x:u.x,y:u.y},radius:32,id:need.itemId,limit:20});
            for(const found of groundItems) {
                const it=found.item;if(!ownerAllowed(u,own()&&own().ownerOf({kind:"item",id:it.id}))||protectedCell(it)||
                    !ownerAllowed(u,objectOwner(it))||J().list(j=>active(j)&&j.params&&j.params.itemId===it.id).length)continue;
                const job=createInput(u,p,"fetch",{...ref(it)},{itemId:it.id,inputType:need.itemId});if(job)return job;
            }
            const sources=O().findIn(area(u),{near:{x:u.x,y:u.y},radius:32,limit:100});
            for(const f of sources) {
                const target={area:{...u.area},z:z(u),x:f.x,y:f.y},type=f.type;
                if(!type||protectedCell(target)||reserved(target)||!ownerAllowed(u,objectOwner(target))||(type.tags||[]).some(t=>["building","wall","door","bed","stockpile","ruin"].includes(t)))continue;
                const action=Object.entries(type.actions||{}).find(([id,a])=>J().handler(id)&&(a.yields||{})[need.itemId]>0);
                if(!action||J().list(j=>active(j)&&j.target&&idOf(j.target)===idOf(target)).length)continue;
                const job=createInput(u,p,action[0],target,{inputType:need.itemId,inputObject:type.id});if(job)return job;
            }
        }
        s.blocked=`Missing planting inputs: ${needs.map(n=>`${n.count} ${n.itemId}`).join(", ")}`;return null;
    }
    function createInput(u,p,type,target,params) {
        wrapInput(type);
        const job=J().create({type,owner:u.id,target,params:{...params,agriculture:true,farmInput:true,plotId:p.id,epoch:p.epoch,revision:p.revision,cycle:p.cycle}});
        return job&&job.state!=="failed"?job:null;
    }
    function inputReason(job,u,applying) {
        if(job.params.refusal)return job.params.refusal;
        const p=peek()&&peek().plots[job.params.plotId],t=job.target;
        if(!eligible(u)||job.assigned!==u.id||!p||!same(p,u)||p.faction!==u.data.faction||p.siteId!==u.data.site||p.phase!=="tilled"||
            p.epoch!==job.params.epoch||p.revision!==job.params.revision||p.cycle!==job.params.cycle)return "planting request changed";
        if(!t||!same(t,u)||protectedCell(t)||!ownerAllowed(u,objectOwner(t)))return "source is reserved or belongs to someone else";
        if(job.params.itemId) {
            const it=I().get(job.params.itemId);
            if(!it||it.holder!==null||!same(it,u)||it.x!==t.x||it.y!==t.y||it.type!==job.params.inputType||!ownerAllowed(u,own()&&own().ownerOf({kind:"item",id:it.id})))return "planting input is no longer freely available";
        }else {
            const o=O().atIn(area(t),t.x,t.y);
            if(!o||o.id!==job.params.inputObject||reserved(t)||(o.tags||[]).some(k=>["building","wall","door","bed","stockpile","ruin"].includes(k)))return "planting source changed";
        }
        if(applying&&distance(u,t)>1)return "worker left the planting source";
        return "";
    }
    function wrapInput(type) {
        const old=J()&&J().handler(type);if(!old||old.agricultureGuard)return;
        J().define(type,{...old,agricultureGuard:true,
            plan(job,u){const why=job.params&&job.params.farmInput&&inputReason(job,u,false);return why?{ok:false,reason:why}:old.plan(job,u);},
            apply(job,u){const why=job.params&&job.params.farmInput&&inputReason(job,u,true);return why?refusal(job,why):old.apply(job,u);}});
    }
    function findPlot(u,c,s,cropId) {
        const now=nowMinutes();if(now===null||s.lastSearch!==null&&now-s.lastSearch<RETRY)return null;
        s.lastSearch=now;
        // 80 candidates out of a 33x33 square, rotating the cursor after a miss.
        const seed=W().hash32(W().state.seed,0xfa41,c.siteId,z(c));
        for(let n=0;n<SEARCH;n++) {
            const k=(s.searchCursor++*37+seed)%1089,x=c.site.x+(k%33)-16,y=c.site.y+Math.floor(k/33)-16;
            const p=designate(u,{area:{...c.area},z:z(c),x,y},cropId);if(p)return p;
        }
        s.blocked="No free, watered, suitable farm cell in the bounded search";return null;
    }
    function planJob(u) {
        if(!eligible(u)||J().of(u.id)||nowMinutes()===null)return null;
        if(UF.Combat&&UF.Combat.inCombat&&UF.Combat.inCombat(u))return null;
        const n=u.data.needs||{};if((n.hunger||0)>=75||(n.thirst||0)>=75||(n.sleep||0)>=85)return null;
        const c=settlement(u),s=siteRecord(c),list=plots({area:c.area,z:z(c),siteId:c.siteId,faction:c.factionId});
        if(J().list(j=>active(j)&&j.assigned&&j.params&&j.params.agriculture&&list.some(p=>p.id===j.params.plotId)).length>=MAX_WORKERS)return null;
        const count=members(c).length,target=Math.min(MAX_PLOTS,count*2),food=foodUnits(c);
        s.targetPlots=target;s.population=count;s.foodUnits=food;s.missingInputs=[];
        const sorted=list.slice().sort((a,b)=>({ripe:0,growing:1,tilled:2,reserved:3})[a.phase]-({ripe:0,growing:1,tilled:2,reserved:3})[b.phase]||distance(u,a)-distance(u,b));
        for(const p of sorted) {
            const a=actionFor(p);if(!a||J().list(j=>active(j)&&j.params&&j.params.plotId===p.id).length)continue;
            // With ample stock, leave expansion/planting time for homes and equipment.
            if(food>=count*6&&["plant","till"].includes(a))continue;
            if(a==="plant"&&missing(p,u).length) {const job=inputJob(u,p,s);if(job)return job;continue;}
            const job=order(u,p.id,a);if(job){s.blocked="";return job;}
            p.blocked=cellReady(p,u,p.phase)||"farm work is unreachable or unavailable";s.blocked=p.blocked;
        }
        if(list.length<target&&food<count*6) {
            const p=findPlot(u,c,s,z(c)<0?"mushroom":"root");if(p)return order(u,p.id,"till");
        }
        return null;
    }
    function describe(u) {
        const c=settlement(u);if(!c)return null;
        const ps=plots({area:c.area,z:z(c),siteId:c.siteId,faction:c.factionId}),population=members(c).length;
        const s=peek()&&peek().settlements[siteKey(c)],phases={reserved:0,tilled:0,growing:0,ripe:0};for(const p of ps)if(phases[p.phase]!==undefined)phases[p.phase]++;
        return {siteId:c.siteId,faction:c.factionId,area:{...c.area},z:z(c),population,targetPlots:Math.min(MAX_PLOTS,population*2),plotCount:ps.length,phases,
            unmetPlots:Math.max(0,Math.min(MAX_PLOTS,population*2)-ps.length),harvests:s&&s.harvests||0,foodUnits:foodUnits(c),
            blocked:s&&s.blocked||ps.find(p=>p.blocked)&&ps.find(p=>p.blocked).blocked||"",missingInputs:(s&&s.missingInputs||[]).map(p=>({...p})),
            crops:CROPS.map(crop=>({id:crop.id,name:crop.name,plots:ps.filter(p=>p.cropId===crop.id).length,growing:ps.filter(p=>p.cropId===crop.id&&p.phase==="growing").length,ripe:ps.filter(p=>p.cropId===crop.id&&p.phase==="ripe").length})),
            personal:u.data.farming?{...u.data.farming}:null};
    }
    let hooked=false;
    function install() {
        if(!J())return;
        for(const a of ACTIONS) {
            J().define(`farm_${a}`,{verb:({till:"Tilling",plant:"Planting",tend:"Tending",harvest:"Harvesting"})[a],work:WORK[a],
                plan(job,u){const v=validate(job,u);if(v.reason)return {ok:false,reason:v.reason};const stand=J().standFor(ref(v.p),u,false);return stand?{ok:true,stand}:{ok:false,reason:"cannot reach plot"};},
                apply:applyWork,describe:job=>`${({till:"Tilling",plant:"Planting",tend:"Tending",harvest:"Harvesting"})[a]} ${crop(peek()&&peek().plots[job.params.plotId]&&peek().plots[job.params.plotId].cropId)?.name||"farm plot"}`});
            if(UF.Skills&&UF.Skills.mapJob)UF.Skills.mapJob(`farm_${a}`,"farming");
        }
        for(const type of ["fetch","gather","pick","chop"])wrapInput(type);
        if(!hooked&&UF.Events) {hooked=true;UF.Events.on("time:minute",processGrowth);}
    }
    UF.Agriculture={VERSION,crops:()=>CROPS.map(c=>({...c,levels:c.levels.slice(),inputs:{...c.inputs},outputs:{...c.outputs}})),state,peek,plots,at,suitability,designate,order,planJob,describe,reserved,processGrowth,nowMinutes,confirmedJob};
    const boot=Scene_Boot.prototype.start;
    Scene_Boot.prototype.start=function(){install();boot.call(this);};
    install();
})();
