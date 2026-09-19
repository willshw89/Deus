/*:
 * @target MZ
 * @plugindesc [UF Test Fixture] Individual sleep schedules; disposable snapshots only.
 * @help Never register in the live game. Prepared floor and beds isolate real decisions and walking.
 */
(() => {
    "use strict";
    const boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        if (UF.Test && UF.Test.active && UF.Test.only === "sleep_schedules") {
            const newWorld = UF.World.newWorld;
            UF.World.newWorld = function(seed) { return newWorld.call(this, seed || 20260919); };
        }
        boot.call(this);
        if (!UF.Test || !UF.Test.active) return;
        UF.Test.suite("sleep_schedules", async t => {
            const W=UF.World,L=UF.Levels,C=UF.Colonists,J=UF.Jobs,O=UF.Objects,Own=UF.Ownership;
            const errors0=t.errorsSoFar().length,c=C.state(), area={x:0,y:0},z=1;
            C.setEnabled(false); Own.setEnabled(false);
            for (const j of J.list()) if (["open","travel","work"].includes(j.state)) J.cancel(j.id,"sleep fixture isolation");
            for (const u of W.units().slice()) W.removeUnit(u.id);
            const local={version:2,factionId:c.factionId,siteId:9991,site:{x:96,y:96},area,z,radius:8,plan:[],stockpiles:[],log:[],adopted:true};
            c.settlements[local.siteId]=local; c.settlementsReady=true;
            // Prepared supported dry floor and stamped test beds: not a home-building demonstration.
            for(let y=84;y<=108;y++)for(let x=84;x<=110;x++) { L.setShape({area,z,x,y},"floor"); O.setIn({...area,z},x,y,null); }
            const cohort=[];
            for(let i=0;i<24;i++) {
                const u=W.addUnit({name:`TEST_Sleep_${i}`,image:{characterName:i%2?"$Eve":"$Adam",characterIndex:0},area,z,x:88+i%12,y:88+Math.floor(i/12),dir:2,
                    data:{kind:"colonist",ai:"colonist",faction:c.factionId,site:local.siteId,home:{area,z,x:96,y:96},species:"human",gender:i%2?"female":"male",age:25,familyDesire:false,
                        facets:{industriousness:100,curiosity:0,discipline:50,sociability:50},skills:{},needs:{hunger:0,thirst:0,sleep:50,social:0,nature:0},inventory:[],equipment:{},thoughts:[]}});
                if(u)cohort.push({u,s:C.sleepSchedule(u)});
            }
            const different=new Set(cohort.map(p=>p.s.bedMinute)), durations=new Set(cohort.map(p=>p.s.durationMinutes));
            t.check("same_facets_individual_schedules",cohort.length===24&&different.size>1&&durations.size>1,
                JSON.stringify({people:cohort.length,bedtimes:[...different],durations:[...durations]}));
            const night=cohort.filter(p=>p.s.bedMinute>=18*60).sort((a,b)=>a.s.bedMinute-b.s.bedMinute);
            const early=night[0],late=night[night.length-1];
            if(!early||!late||early.s.bedMinute===late.s.bedMinute){t.check("distinct_night_pair",false,"no distinct generated night schedules");return;}
            const a=early.u,b=late.u;
            for(const p of cohort)if(p.u!==a&&p.u!==b)W.removeUnit(p.u.id);
            a.name="TEST_EarlySleeper"; b.name="TEST_LateSleeper";
            const place=(u,x,y)=>{W.moveUnitToLevel(u,z,x,y);const ev=W.eventOf(u.id);if(ev)ev.locate(x,y);u.goal=null;};
            place(a,92,96);place(b,102,96);
            const beds=[{area,z,x:96,y:94},{area,z,x:100,y:94}];
            for(let i=0;i<2;i++) {const p=beds[i];O.setIn({...area,z},p.x,p.y,"floor_straw");Own.assignBed(i?b:a,p);}
            t.check("real_owned_beds",[a,b].every((u,i)=>{const p=Own.bedOf(u);return p&&p.z===z&&p.x===beds[i].x&&p.y===beds[i].y;}),JSON.stringify([Own.bedOf(a),Own.bedOf(b)]));
            L.setView(z,{center:{x:98,y:95}});
            await t.waitUntil(()=>!L.switching()&&!$gamePlayer.isTransferring()&&W.viewLevel().z===z,20000,"sleep arena view");
            if(UF.Fog.setEnabled)UF.Fog.setEnabled(false);
            const minute=early.s.bedMinute;
            $ufTime.setTime(Math.floor(minute/60),minute%60);
            a.data.needs.sleep=b.data.needs.sleep=50;
            const expectedFrames=C.sleepFrames(a), first=C.decide(a), second=C.decide(b);
            t.check("same_clock_different_sleep_decisions",C.sleepingHours(a)&&!C.sleepingHours(b)&&first&&first.type==="sleep"&&(!second||second.type!=="sleep"),
                JSON.stringify({minute,early:early.s,late:late.s,jobs:[first&&{type:first.type,state:first.state,target:first.target},second&&{type:second.type,state:second.state}]}));
            t.check("personal_duration_and_owned_target",first&&first.params.frames===expectedFrames&&first.target.z===z&&first.target.x===beds[0].x&&first.target.y===beds[0].y,
                JSON.stringify({expectedFrames,job:first&&{frames:first.params.frames,target:first.target}}));
            if(second)J.cancel(second.id,"keep later sleeper visible and awake"); b.goal=null;
            UF.Time.setLevel(UF.Time.speeds.length-1);UF.Time.resume();
            await t.waitUntil(()=>first&&first.state==="work",12000,"early person to walk to bed").catch(()=>{});
            t.check("physically_reached_assigned_bed",first&&first.state==="work"&&a.z===z&&a.x===beds[0].x&&a.y===beds[0].y,
                JSON.stringify({job:first&&first.state,position:{x:a.x,y:a.y,z:a.z},bed:beds[0],stand:first&&first.stand}));
            UF.Time.pause();
            await t.waitFrames(4);
            const sprites=SceneManager._scene._spriteset._characterSprites;
            const drawn=[a,b].map(u=>{const ev=W.eventOf(u.id),s=sprites.find(s=>s._character===ev);return {id:u.id,event:!!ev,sprite:!!s,visible:!!s&&s.visible,opacity:s&&s.opacity,ready:!!s&&s.bitmap&&s.bitmap.isReady(),x:s&&s.x,y:s&&s.y};});
            t.check("both_people_drawn",drawn.every(p=>p.event&&p.sprite&&p.visible&&p.opacity>0&&p.ready),JSON.stringify(drawn));
            t.screenshot("different_sleep_choices");
            const saved=JsonEx.parse(JsonEx.stringify(DataManager.makeSaveContents()));
            t.check("rmmz_save_retains_personal_schedules",[a,b].every(u=>JSON.stringify(saved.ufWorld.units[u.id].data.sleepSchedule)===JSON.stringify(u.data.sleepSchedule)),
                JSON.stringify([saved.ufWorld.units[a.id].data.sleepSchedule,saved.ufWorld.units[b.id].data.sleepSchedule]));
            if(first)J.cancel(first.id,"test off-schedule exhaustion");a.goal=null;
            $ufTime.setTime(12,0);a.data.needs.sleep=90;
            const exhausted=C.decide(a);
            t.check("exhaustion_overrides_personal_window",!C.sleepingHours(a)&&exhausted&&exhausted.type==="sleep"&&exhausted.params.frames===C.sleepFrames(a)&&exhausted.target.x===beds[0].x,
                JSON.stringify({insideWindow:C.sleepingHours(a),need:a.data.needs.sleep,job:exhausted&&{type:exhausted.type,frames:exhausted.params.frames,target:exhausted.target}}));
            // Actual extraction hook, not merely comparing a separately serialized copy.
            DataManager.extractSaveContents(saved);
            const reloaded=[a,b].map(u=>W.unit(u.id));
            t.check("reload_reuses_saved_schedule",reloaded.every((u,i)=>u&&u!==[a,b][i]&&JSON.stringify(C.sleepSchedule(u))===JSON.stringify([early.s,late.s][i])),"real RMMZ extraction retained each person's persisted timing");
            t.check("no_errors",t.errorsSoFar().length===errors0,t.errorsSoFar().slice(errors0).join(" | ")||"none during personal-sleep integration");
        },{isDefault:false});
    };
})();
