/*:
 * @target MZ
 * @plugindesc [UF Test Fixture] Household construction and family integration; disposable snapshots only.
 * @help Never register in the live game. Explicit prepared terrain/materials; real planner, movement and jobs.
 */
(() => {
    "use strict";
    const boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        if (UF.Test && UF.Test.active && UF.Test.only === "society_runtime") {
            const newWorld = UF.World.newWorld;
            UF.World.newWorld = function(seed) { return newWorld.call(this, seed || 20260919); };
        }
        boot.call(this);
        if (!UF.Test || !UF.Test.active) return;
        UF.Test.suite("society_runtime", async t => {
            const W=UF.World, L=UF.Levels, C=UF.Colonists, H=UF.Households, G=UF.Goals, I=UF.Items, O=UF.Objects, J=UF.Jobs;
            const errors0=t.errorsSoFar().length, st=W.state, c=C.state(), fid=c.factionId;
            C.setEnabled(false);
            const surveyStart=performance.now(), survey=[];
            H.reconcile();
            for(const local of C.settlements()) {
                const u=W.units().find(u=>u.data&&u.data.site===local.siteId&&u.z===local.z&&u.data.age>=18);
                if(!u)continue;
                H.planSteps(u);const h=H.of(u);
                survey.push({site:local.siteId,z:local.z,home:!!(h&&h.home),design:h&&h.home&&h.home.design,reason:h&&h.reason});
            }
            t.check("generated_home_search_is_bounded",survey.length>0&&survey.every(s=>s.home||/space|unavailable|settlement/.test(s.reason||"")),JSON.stringify({milliseconds:Math.round(performance.now()-surveyStart),survey}));
            if(UF.Ownership.setEnabled) UF.Ownership.setEnabled(false);
            for(const j of J.list()) if(["open","travel","work"].includes(j.state)) J.cancel(j.id,"fixture isolation");
            for(const u of W.units().slice()) W.removeUnit(u.id);
            // Prepared dry supported arenas, not evidence of excavation or natural generation.
            const locals=[];
            for(const z of [-1,1]) {
                const local={version:2,factionId:fid,siteId:9900+z,site:{x:96,y:96},area:{x:0,y:0},z,radius:8,plan:[],stockpiles:[],log:[],adopted:true};
                c.settlements[local.siteId]=local; locals.push(local);
                for(let y=64;y<=126;y++) for(let x=64;x<=126;x++) { L.setShape({area:{x:0,y:0},z,x,y},"floor"); O.setIn({x:0,y:0,z},x,y,null); }
            }
            c.settlementsReady=true;
            const made=[];
            const add=(local,name,gender,dx=0)=> {
                const u=W.addUnit({name,image:{characterName:gender==="female"?"$Eve":"$Adam",characterIndex:0},area:{x:0,y:0},z:local.z,x:96+dx,y:96,dir:2,
                    data:{kind:"colonist",ai:"colonist",faction:fid,site:local.siteId,home:{area:{x:0,y:0},z:local.z,x:96,y:96},species:"human",gender,age:25,familyDesire:true,
                    facets:{industriousness:100,ambition:65,discipline:50,sociability:70},skills:{},needs:{hunger:0,thirst:0,sleep:0,social:0,nature:0},inventory:[],equipment:{},thoughts:[]}});
                made.push(u); return u;
            };
            const a=add(locals[1],"TEST_HouseBuilder_A","male"), b=add(locals[1],"TEST_HouseBuilder_B","female",1), d=add(locals[0],"TEST_DeepBuilder","male");
            H.reconcile();
            const h=H.formPair(a,b), underground=H.of(d);
            const steps=H.planSteps(a), deepSteps=H.planSteps(d);
            t.check("real_home_plans", !!h && !!h.home && !!underground.home && steps.length===5 && deepSteps.length===5 && h.z===1 && underground.z===-1,
                JSON.stringify([h&&h.home&&{id:h.id,x:h.home.x,y:h.home.y,z:h.z,design:h.home.design},underground.home&&{id:underground.id,x:underground.home.x,y:underground.home.y,z:underground.z,design:underground.home.design}]));
            if(!h || !h.home || !underground.home) return;
            // Exact real costs are staged on build cells. This isolates physical building, not resource abundance.
            let staged=0;
            for(const u of [a,d]) for(const step of H.planSteps(u)) for(const [dx,dy] of step.cells) {
                const target={area:{...u.area},z:u.z,x:C.state(u).site.x+dx,y:C.state(u).site.y+dy};
                for(const [id,n] of Object.entries(O.type(step.build).build.items||{})) {I.drop({...target.area,z:target.z},target.x,target.y,id,n);staged+=n;}
            }
            t.check("staged_materials_exist",[a,d].every(u=>H.planSteps(u).every(step=>step.cells.every(([dx,dy])=>Object.entries(O.type(step.build).build.items||{}).every(([id,n])=>I.count({area:u.area,z:u.z,x:C.state(u).site.x+dx,y:C.state(u).site.y+dy},id)>=n)))),`prepared ${staged} physical items on their exact build cells`);
            // Give only recipe inputs; goals still require real craft outputs.
            for(const u of made) {
                G.refresh(u);
                for(const step of G.planSteps(u)) {
                    const recipe=$ufWorldCatalog.recipes.list.find(r=>r.id===step.craft);
                    for(const [id,n] of Object.entries(recipe.inputs||{})) I.give(id,n,u.id);
                }
            }
            $ufTime.hour=12;
            L.setView(1,{center:{x:h.home.x+Math.floor(h.home.w/2),y:h.home.y+Math.floor(h.home.h/2)}});
            await t.waitUntil(()=>!L.switching()&&!$gamePlayer.isTransferring()&&W.viewLevel().z===1,20000,"view the household construction");
            if(UF.Fog.setEnabled) UF.Fog.setEnabled(false);
            UF.Time.setLevel(UF.Time.speeds.length-1);
            const probes=made.map(u=>{
                const cell=C._internal.buildCells(H.planSteps(u)[0],u)[0], type=O.type(H.planSteps(u)[0].build);
                const job=C._internal.planJob(u);
                return {unit:u.id,z:u.z,home:H.of(u).id,cell:{x:cell.x,y:cell.y,state:cell.state},cost:type.build.items,
                    items:I.atIn({x:0,y:0,z:u.z},cell.x,cell.y).map(i=>[i.type,i.count]),
                    walk:W.walkable(0,0,cell.x-1,cell.y,{z:u.z}),stand:J.standable({x:0,y:0,z:u.z},cell.x-1,cell.y,u.id),job:job&&{type:job.type,state:job.state,reason:job.reason,target:job.target}};
            });
            t.check("planner_probe",probes.every(p=>p.job),JSON.stringify(probes));
            const changes=[];
            UF.Events.on("jobs:done",(job,u)=>{if(made.includes(u)&&job.type==="build")changes.push({z:u.z,type:job.params.objectId,id:job.id});});
            C.setEnabled(true);
            const start=performance.now();
            await t.waitUntil(()=>H.describe(h).complete&&H.describe(underground).complete&&made.every(u=>G.planSteps(u).length===0),145000,"both material-built homes and personal tool jobs to finish").catch(()=>{});
            C.setEnabled(false);
            for(const u of made) {const j=J.of(u.id);if(j)J.cancel(j.id,"fixture inspection");u.goal=null;}
            t.check("autonomous_real_builds_both_layers", H.describe(h).complete&&H.describe(underground).complete&&[-1,1].every(z=>changes.some(j=>j.z===z)),
                JSON.stringify({seconds:Math.round((performance.now()-start)/1000),staged,builds:changes.length,byLevel:changes.reduce((o,j)=>(o[j.z]=(o[j.z]||0)+1,o),{}),surface:H.demands(h),deep:H.demands(underground),last:C.doneLog().slice(-12),failed:J.list().filter(j=>j.state==="failed").slice(-12).map(j=>({type:j.type,why:j.reason,target:j.target,unit:j.owner})),plans:made.map(u=>({id:u.id,plan:C.planStatus(u)}))}));
            t.check("materials_consumed",staged>0&&[a,d].every(u=>H.planSteps(u).some(s=>s.cells.some(([dx,dy])=>Object.entries(O.type(s.build).build.items||{}).some(([id])=>I.count({area:u.area,z:u.z,x:C.state(u).site.x+dx,y:C.state(u).site.y+dy},id)===0)))),"real construction consumes staged items; no direct object stamping in the build phase");
            t.check("personal_tools_made",made.every(u=>G.describe(u).medium.some(g=>g.kind==="equipment"&&g.state==="achieved")),JSON.stringify(made.map(u=>({id:u.id,items:I.inventoryOf(u.id).map(i=>i.type),goals:G.describe(u).medium}))));
            const place=(u,p)=>{W.moveUnitToLevel(u,u.z,p.x,p.y);const e=W.eventOf(u.id);if(e)e.locate(p.x,p.y);u.goal=null;};
            const spots=h.home.spots||[{x:h.home.x+3,y:h.home.y+2},{x:h.home.x+4,y:h.home.y+2}];
            place(a,spots[0]);place(b,spots[1]);
            for(const p of h.home.doors) {const s=UF.Doors.stateAt({x:0,y:0,z:h.z},p.x,p.y);if(s){s.heldOpen=false;s.openUntil=0;}}
            const room=H.roomForPair(a,b);
            const familyBefore=H.demands(h).beds;
            t.check("completed_private_room",!!room&&!!C._internal.privatePairRoom(a,b,true),JSON.stringify({room:room&&room.householdId,beds:made.slice(0,2).map(u=>UF.Ownership.bedOf(u))}));
            b.data._forceConceive=true;
            const mate=C.onMated(a,b), repeat=C.onMated(a,b);
            t.check("adult_pair_once",mate===true&&repeat===false&&!!b.data.pregnancy,"guarded adult pair in its real room; duplicate completion refused");
            const baby=b.data.pregnancy?C.giveBirth(b):null;
            t.check("child_joins_and_adds_need",!!baby&&H.of(baby)===h&&H.describe(h).generation===1&&H.demands(h).beds===familyBefore+1&&baby.z===1,
                JSON.stringify({baby:baby&&baby.id,household:baby&&H.of(baby)&&H.of(baby).id,demands:H.demands(h),generation:H.describe(h).generation}));
            if(baby) {
                place(baby,h.home.sleeping.find(p=>!spots.some(s=>s.x===p.x&&s.y===p.y)));
                delete a.data.lastMatedDate;delete b.data.lastMatedDate;
                t.check("child_blocks_privacy",H.roomForPair(a,b)===null&&C.onMated(a,b)===false,"a child in the sleeping room prevents adult intimacy");
                const before=J.list().length;C.decide(baby);
                t.check("infant_not_worker",J.list().length===before&&!J.of(baby.id),"newborn creates no industrial, hunting or relationship job");
                const mainShape=JSON.stringify({x:h.home.x,y:h.home.y,walls:h.home.walls,doors:h.home.doors,beds:h.home.beds});
                const growth=H.planSteps(a).filter(s=>!s.done || s.done!==true);
                const annexes=H.structures(h).slice(1);
                t.check("growth_requests_real_annex",annexes.length>0&&growth.some(s=>s.id.includes("annex"))&&H.demands(h).beds>0,
                    JSON.stringify({annexes:annexes.map(a=>({w:a.w,h:a.h,design:a.design})),demands:H.demands(h)}));
                for(const step of growth)for(const [dx,dy] of step.cells||[]){
                    const x=C.state(a).site.x+dx,y=C.state(a).site.y+dy;
                    if(O.atIn({...a.area,z:a.z},x,y)&&O.atIn({...a.area,z:a.z},x,y).id===step.build)continue;
                    for(const [id,n]of Object.entries(O.type(step.build).build.items||{}))I.drop({...a.area,z:a.z},x,y,id,n);
                }
                C.setEnabled(true);UF.Time.resume();
                await t.waitUntil(()=>H.describe(h).complete,45000,"material-built family growth annex").catch(()=>{});
                C.setEnabled(false);
                for(const u of made){const j=J.of(u.id);if(j)J.cancel(j.id,"fixture inspection");u.goal=null;}
                t.check("annex_physically_built_without_resize",annexes.length>0&&H.describe(h).complete&&!!UF.Ownership.bedOf(baby)&&
                    JSON.stringify({x:h.home.x,y:h.home.y,walls:h.home.walls,doors:h.home.doors,beds:h.home.beds})===mainShape,
                    JSON.stringify({demands:H.demands(h),bed:UF.Ownership.bedOf(baby),builds:changes.length}));
            }
            const culture=UF.CultureGrowth.describeFaction(fid);
            t.check("learned_from_building",!!culture&&Object.keys(UF.CultureGrowth.ensureFaction(fid).knowledge).length>0,JSON.stringify(culture));
            const saved=JsonEx.parse(JsonEx.stringify(DataManager.makeSaveContents()));
            t.check("actual_save_contains_society",!!saved.ufWorld.households.byId[h.id]&&!!saved.ufWorld.cultureGrowth.factions[fid]&&!!saved.ufWorld.units[a.id].data.lifeGoals&&(!baby||saved.ufWorld.units[baby.id].data.motherId===b.id),"actual RMMZ save serialization includes households, genealogy, goals and faction practice");
            UF.Time.pause();
            if(UF.Sheet&&UF.Sheet.open)UF.Sheet.open(a.id);
            G.showSelected();await t.waitFrames(3);t.screenshot("household_goals");
            if(G.window())G.window().hide();if(UF.Sheet&&UF.Sheet.close)UF.Sheet.close();await t.waitFrames(3);t.screenshot("material_built_home");
            const annex=H.structures(h)[1];
            if(annex){$gamePlayer.locate(annex.x+Math.floor(annex.w/2),annex.y+Math.floor(annex.h/2));await t.waitFrames(3);t.screenshot("family_growth_annex");}
            L.setView(-1,{center:{x:underground.home.x+Math.floor(underground.home.w/2),y:underground.home.y+Math.floor(underground.home.h/2)}});
            await t.waitUntil(()=>!L.switching()&&!$gamePlayer.isTransferring()&&W.viewLevel().z===-1,20000,"view the other built design");
            await t.waitFrames(3);t.screenshot("underground_home_design");
            t.check("no_errors",t.errorsSoFar().length===errors0,t.errorsSoFar().slice(errors0).join(" | ")||"none during society integration");
        },{isDefault:false});
    };
})();
