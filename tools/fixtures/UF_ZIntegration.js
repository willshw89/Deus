/*:
 * @target MZ
 * @plugindesc [UF Test Fixture] Five-map integration; disposable snapshots only.
 * @base UF_Levels
 * @help Never register in the live game. Used by the z_integration suite.
 */
(() => {
    "use strict";
    const boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        boot.call(this);
        if (!UF.Test || !UF.Test.active) return;
        UF.Test.suite("z_integration", async t => {
            const W = UF.World, L = UF.Levels, O = UF.Objects, I = UF.Items, G = UF.WorldGen;
            const st = W.state, H = st.history, factions = st.factions.list;
            t.check("five_complete_maps", [-2,-1,0,1,2].every(z => {
                const map = W.buildArea(0, 0, z);
                return map.width === 256 && map.height === 256 && map.data.length === 256 * 256 * 6 && W.levelOfMapId(W.areaMapId(0,0,z)).z === z;
            }), `levels ${Object.keys(st.levels || {}).join(",")}; size ${st.size}`);
            const dwarves = factions.filter(f => f.species === "dwarf");
            const expected = ($ufWorldCatalog.factions.founders.male | 0) + ($ufWorldCatalog.factions.founders.female | 0);
            const report = dwarves.map(f => {
                const sites = H.sites.filter(s => s.faction === f.id);
                const people = W.units().filter(u => u.data && u.data.faction === f.id && u.data.species === "dwarf");
                return { f, sites, people };
            });
            t.check("dwarf_dual_settlements", report.length > 0 && report.every(r => r.sites.length === 2 && [-1,-2].every(z => r.sites.filter(s => s.z === z).length === 1 && r.people.some(u => u.z === z && u.data.site === r.sites.find(s => s.z === z).id)) && r.people.length === expected && r.people.every(u => u.z === -1 || u.z === -2)),
                JSON.stringify(report.map(r => ({ id:r.f.id, sites:r.sites.map(s => ({id:s.id,z:s.z})), people:r.people.map(u => ({id:u.id,z:u.z,site:u.data.site})) }))));
            const kitProblems = [];
            for (const { sites } of report) for (const s of sites) {
                const a = { ...s.area, z:s.z }, c = G.kitCentres(a.x,a.y,a.z).find(c => c.camp === s.id);
                const fire = O.atIn(a,s.x,s.y);
                if (!c || !fire || !(fire.tags || []).includes("fire")) kitProblems.push(`${s.id}: missing kit centre/fire`);
                const objects = O.findIn(a,{near:{x:s.x,y:s.y},radius:20});
                const worth = {log:0,stone:0,fiber:0,straw:0,food:0};
                for (const o of objects) {
                    const v = G.objectWorth(o.typeId || (o.type && o.type.id) || o.id);
                    if (v) for (const k of Object.keys(worth)) worth[k] += v[k] || 0;
                }
                if (Object.values(worth).some(n => n <= 0)) kitProblems.push(`${s.id}: ${JSON.stringify(worth)}`);
                let water = false;
                for (let dy=-20;dy<=20 && !water;dy++) for (let dx=-20;dx<=20;dx++) if (Math.hypot(dx,dy)<=20 && G.isWaterAt(a.x*256+s.x+dx,a.y*256+s.y+dy,s.z)) {water=true;break;}
                if (!water) kitProblems.push(`${s.id}: no local water`);
            }
            t.check("underground_local_starts", report.length > 0 && !kitProblems.length, kitProblems.join(" | ") || "both camps have local water and every starter resource class");
            t.check("no_surface_dwarf_kits", !G.kitCentres(0,0,0).some(c => dwarves.some(f => f.id === c.faction)), JSON.stringify(G.kitCentres(0,0,0)));
            for (const z of [-1,-2]) {
                const s = report[0] && report[0].sites.find(s => s.z === z);
                if (!s) continue;
                L.setView(z,{center:{x:s.x,y:s.y}});
                await t.waitUntil(() => !L.switching() && !$gamePlayer.isTransferring() && W.viewLevel() && W.viewLevel().z===z,20000,`show ${z}`);
                await t.waitFrames(8);
                t.screenshot(`dwarf_start_${Math.abs(z)}`);
                t.check(`drawn_start_${Math.abs(z)}`, report[0].people.filter(u => u.z===z).some(u => {
                    const e=W.eventOf(u.id); return e && e.x===u.x && e.y===u.y;
                }), `view ${JSON.stringify(W.viewLevel())}`);
            }
            // Real map-update combat loop, five groups at identical coordinates, with a sixth wrong-level target.
            L.setView(0);
            await t.waitUntil(() => !L.switching() && !$gamePlayer.isTransferring() && W.viewLevel() && W.viewLevel().z===0,20000,"return ground");
            let base = null;
            for(let y=10;y<246&&!base;y++) for(let x=10;x<245;x++) if(W.cellFree(0,0,x,y)&&W.cellFree(0,0,x+1,y)) {base={x,y};break;}
            const made=[], hits=[], C=UF.Combat;
            UF.Events.on("combat:hit", e => { if(made.some(u=>u.id===e.attacker.id)) hits.push(e); });
            if (base) for(const z of [-2,-1,0,1,2]) {
                for(const x of [base.x,base.x+1]) {
                    O.setIn({x:0,y:0,z},x,base.y,null);
                    if(z!==0) L.setShape({area:{x:0,y:0},x,y:base.y,z},"floor");
                }
                const make=(x,name)=>W.addUnit({area:{x:0,y:0},x,y:base.y,z,name,image:{characterName:"People1",characterIndex:2},data:{kind:"test",hp:99,combatLevels:{attack:1,strength:1,defence:1,hitpoints:99},combat:{mode:"manual",retaliate:false}}});
                const a=make(base.x,`TEST_attacker_${z}`), b=make(base.x+1,`TEST_target_${z}`); made.push(a,b); C.engage(a,b);
            }
            const before = made.length ? made[3].data.hp : null;
            t.check("cross_level_attack_refused", made.length===10 && C.resolveAttack(made[0],made[3])===null && !C.engage(made[0],made[3]) && made[3].data.hp===before,"same x/y does not allow an attack across rock floors");
            const only=UF.Test.only; C.testFilter=new Set(made.map(u=>u.id)); UF.Test.only="combat";
            try { await t.waitFrames(180); } finally { UF.Test.only=only; C.testFilter=null; }
            t.check("combat_all_five_concurrent", [-2,-1,0,1,2].every(z=>hits.some(e=>e.attacker.z===z&&e.target.z===z)),`view ${W.viewLevel().z}; hits by level ${JSON.stringify(hits.map(e=>e.attacker.z))}`);
            const victim=made[1];
            if(victim) {victim.data.equipment={weapon:"stone_knife"}; C.onUnitDeath(victim,null);}
            t.check("death_drop_own_level", !!victim && I.count({area:{x:0,y:0},x:victim.x,y:victim.y,z:-2},"stone_knife")>0 && I.count({area:{x:0,y:0},x:victim.x,y:victim.y,z:0},"stone_knife")===0,"underground equipment does not fall onto Ground");
            for(const u of made) if(W.unit(u.id)) W.removeUnit(u.id);
            const saved=JsonEx.parse(JsonEx.stringify(DataManager.makeSaveContents()));
            t.check("settlements_saved", report.length>0 && report.every(r=>r.sites.every(s=>saved.ufWorld.history.sites.some(v=>v.id===s.id&&v.z===s.z)) && r.people.every(u=>saved.ufWorld.units[u.id]&&saved.ufWorld.units[u.id].z===u.z)),"both site records and founder levels survive actual save serialization");
            t.check("no_errors",t.errorsSoFar().length===0,t.errorsSoFar().join(" | ")||"none");
        }, {isDefault:false});
    };
})();
