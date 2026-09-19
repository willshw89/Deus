/*:
 * @target MZ
 * @plugindesc [UF Test Fixture] Fire-safety planner runtime; snapshots only.
 * @help Prepared terrain and fire, real movement/water jobs. Never register live.
 */
(() => {
    const boot=Scene_Boot.prototype.start;
    Scene_Boot.prototype.start=function(){
        if(UF.Test&&UF.Test.active&&UF.Test.only==="fire_safety"){
            const nw=UF.World.newWorld;UF.World.newWorld=function(seed){return nw.call(this,seed===undefined?20260919:seed);};
        }
        boot.call(this);
        if(!UF.Test||!UF.Test.active)return;
        UF.Test.suite("fire_safety",async t=>{
            const W=UF.World,L=UF.Levels,C=UF.Colonists,J=UF.Jobs,F=UF.Fire,O=UF.Objects,S=UF.FireSafety;
            const errors=t.errorsSoFar().length;
            C.setEnabled(false);if(UF.Ownership)UF.Ownership.setEnabled(false);
            for(const j of J.list())if(["open","travel","work"].includes(j.state))J.cancel(j.id,"fixture isolation");
            for(const u of W.units().slice())W.removeUnit(u.id);
            const faction=W.state.factions.list.find(f=>f.id!==UF.Factions.playerId());
            const a={x:0,y:0,z:-1},siteId=9981,c=C.state();
            c.settlements[siteId]={version:2,factionId:faction.id,siteId,site:{x:96,y:96},area:{x:0,y:0},z:-1,radius:8,plan:[],stockpiles:[],log:[],adopted:true};
            c.settlementsReady=true;
            for(let y=87;y<=106;y++)for(let x=87;x<=110;x++){
                L.setShape({area:a,z:-1,x,y},"floor",{material:"stone"});O.setIn(a,x,y,null);
                if(Tilemap.isWaterTile(W.getTile(0,0,x,y,0,-1)))W.setTile(0,0,x,y,0,Tilemap.TILE_ID_A2,-1);
            }
            W.setTile(0,0,96,98,0,Tilemap.TILE_ID_A1,-1);
            O.setIn(a,99,96,"wall_wood");
            const u=W.addUnit({name:"TEST_LocalFirefighter",area:{x:0,y:0},z:-1,x:96,y:96,image:{characterName:"$Adam",characterIndex:0},
                data:{kind:"person",ai:"settlement",species:"human",faction:faction.id,site:siteId,age:25,hp:100,inventory:[],equipment:{},skills:{},facets:{industriousness:100},thoughts:[],needs:{hunger:0,thirst:0,sleep:0,social:0,nature:0},home:{area:{x:0,y:0},z:-1,x:96,y:96}}});
            const old=J.create({type:"move",target:{area:{x:0,y:0},z:-1,x:108,y:96},params:{},owner:u.id});
            const lit=F.ignite(a,99,96,{cause:"test"});
            C.setEnabled(true);C._internal.scan();C.setEnabled(false);
            const job=J.of(u.id);
            t.check("npc_interrupts_routine_work",lit&&old.state==="failed"&&old.reason==="protecting the settlement from fire"&&job&&job.type==="douse"&&job.params.faction===faction.id&&job.params.siteId===siteId,
                JSON.stringify({old:old.state,job:job&&job.type,faction:job&&job.params.faction,npc:faction.id,reason:job&&job.reason}));
            const groundBefore=W.viewLevel().z;
            UF.Time.setLevel(UF.Time.speeds.length-1);
            await t.waitUntil(()=>job&&["done","failed"].includes(job.state),20000,"offscreen local fire response").catch(()=>{});
            t.check("real_water_job_offscreen",job&&job.state==="done"&&job.result&&job.result.doused&&job.params.filled&&job.params.filled.z===-1&&!F.isBurning(a,99,96)&&O.atIn(a,99,96)&&O.atIn(a,99,96).id==="wall_wood"&&W.viewLevel().z===groundBefore,
                JSON.stringify({state:job&&job.state,result:job&&job.result,filled:job&&job.params.filled,view:W.viewLevel().z,worker:u.z}));
            UF.Time.pause();L.setView(-1,{center:{x:99,y:96}});
            await t.waitUntil(()=>!L.switching()&&!$gamePlayer.isTransferring()&&W.viewLevel().z===-1,20000,"show preserved wall");
            if(UF.Sheet)UF.Sheet.open(u.id);await t.waitFrames(3);t.screenshot("saved_wooden_wall");
            if(UF.Sheet)UF.Sheet.close();
            // A real gather job, not instant deletion, removes brush next to a hearth.
            O.setIn(a,96,96,"campfire");O.setIn(a,95,96,"grass_tuft");
            const before=O.atIn(a,95,96),clear=S.prevent(u);
            t.check("prevention_is_physical_job",before&&clear&&clear.params.clearance&&O.atIn(a,95,96)===before,JSON.stringify({type:clear&&clear.type,reason:clear&&clear.reason}));
            UF.Time.setLevel(UF.Time.speeds.length-1);
            UF.Time.resume();
            await t.waitUntil(()=>clear&&["done","failed"].includes(clear.state),12000,"hearth brush clearance").catch(()=>{});
            t.check("clearance_finishes",clear&&clear.state==="done"&&!F.flammableAt(a,95,96),JSON.stringify({state:clear&&clear.state,result:clear&&clear.result}));
            // Restore grass and omit the production safety job: source physics must still be hazardous.
            const original=F.ruleFor("campfire").escapeChance;
            F.ruleFor("campfire").escapeChance=1;
            for(let i=0;i<5;i++)F.step();
            const safe=!F.isBurning(a,95,96);
            O.setIn(a,95,96,"grass_tuft");F.step();
            t.check("clear_gap_blocks_not_immunity",safe&&F.isBurning(a,95,96),"cleared neighbor stays safe; flammable grass touching the same hearth still ignites under forced test risk");
            F.ruleFor("campfire").escapeChance=original;
            UF.Time.pause();await t.waitFrames(3);t.screenshot("clearance_and_hazard_control");
            const save=JsonEx.parse(JsonEx.stringify(DataManager.makeSaveContents()));
            t.check("saved_fire_jobs",!!save.ufWorld.fire&&job&&save.ufWorld.jobs.list.some(j=>j.id===job.id&&j.result&&j.result.doused),"RMMZ serialization retains actual response and fire state");
            t.check("no_errors",t.errorsSoFar().length===errors&&F.errors().length===0,t.errorsSoFar().slice(errors).join(" | ")||"none");
        },{isDefault:false});
    };
})();
