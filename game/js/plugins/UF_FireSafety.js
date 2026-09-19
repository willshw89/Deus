/*:
 * @target MZ
 * @plugindesc [UF FireSafety] Local adult firefighting and physical hearth clearance for every settlement.
 * @author Codex
 * @base UF_Fire
 * @base UF_Colonists
 * @orderAfter UF_Households
 * @help
 * Colony planner adapter: nearby fires preempt routine work, never explicit
 * orders, combat or critical bodily needs. Water and both walking legs are
 * checked before replacing a job. Adults of every settlement can respond on
 * their own level; emergency dispatch stops at three active local responders.
 * Ordinary player douse designations can assign additional workers.
 * Hearth clearance uses ordinary gathering jobs and respects ownership.
 * It never removes a building, grants water or extinguishes a fire for free.
 * No core methods replaced. API: docs/systems/UF_FireSafety.md.
 */
(() => {
    "use strict";
    const N4 = [[0,-1],[-1,0],[1,0],[0,1]], LIMIT = 3, RETRY = 120;
    const W = () => UF.World, J = () => UF.Jobs, F = () => UF.Fire, O = () => UF.Objects;
    const z = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    const area = r => ({x:r.area ? r.area.x : r.x,y:r.area ? r.area.y : r.y,z:z(r)});
    const same = (a,b) => a && b && area(a).x === area(b).x && area(a).y === area(b).y && z(a) === z(b);
    const ref = (a,x,y) => ({area:{x:a.x,y:a.y},x,y,z:z(a)});
    const distance = (a,b) => Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
    const active = j => j && ["open","travel","work"].includes(j.state);
    const now = () => UF.Time && UF.Time.ticks ? UF.Time.ticks() : W()._frame || 0;
    const tries = new Map();
    let cachedWorld = null;
    function eligible(u) {
        if (!u || !u.data || !W() || W().unit(u.id) !== u || u.data.dead || u.data.dying || u.data._isDying || (Number.isFinite(u.data.hp) && u.data.hp <= 0)) return false;
        if (UF.Combat && UF.Combat.inCombat && UF.Combat.inCombat(u)) return false;
        const d=u.data,n=d.needs||{};
        if (d.burning || d.thermal && ["hypothermia_severe","critical","heatstroke"].includes(d.thermal.stage)) return false;
        return (d.kind === "colonist" || (d.kind === "person" && d.ai === "settlement")) && Number.isFinite(d.age) && d.age >= 18 &&
            !!UF.Colonists.state(u) && (n.hunger||0)<75 && (n.thirst||0)<75 && (n.sleep||0)<85;
    }
    function homes(u) {
        const H=UF.Households, h=H && H.of(u);
        return h && same(h,u) ? (H.structures ? H.structures(h) : h.home ? [h.home] : []) : [];
    }
    function local(u,p) {
        if (!same(u,p)) return false;
        const c=UF.Colonists.state(u);
        return !!c && same(c,u) && (distance(p,c.site)<=Math.max(20,(c.radius||0)+4) || homes(u).some(h=>p.x>=h.x-5&&p.y>=h.y-5&&p.x<=h.x+h.w+4&&p.y<=h.y+h.h+4));
    }
    function path(u,from,to) {
        if (!to || !same(u,to) || !W().findPath) return false;
        if (from.x===to.x && from.y===to.y) return !F().isBurning(area(u),to.x,to.y);
        const p=W().findPath(area(u),from.x,from.y,to.x,to.y,{unit:u,allowPartial:false,resolveBlocked:false,maxNodes:3000});
        return !!p && !p.partial && p.length>0 && p[p.length-1].x===to.x && p[p.length-1].y===to.y &&
            p.every(c=>!F().isBurning(area(u),c.x,c.y));
    }
    function ownedByOther(u,p) {
        const owner=UF.Ownership && UF.Ownership.ownerOf({kind:"object",...p});
        if (!owner || owner.kind === "public") return false;
        if (owner.kind === "faction") return owner.id !== u.data.faction;
        return owner.kind !== "unit" || owner.id !== u.id;
    }
    function clearing(u,p) {
        const t=O().atIn(area(p),p.x,p.y);
        if (!t || !F().flammableAt(area(p),p.x,p.y)) return {safe:true};
        if ((t.tags||[]).some(k=>["building","wall","door","bed","stockpile","ruin"].includes(k)) || ownedByOther(u,p)) return {safe:false,reason:"flammable structure or owned object beside hearth"};
        // Only actions that actually remove/change fuel; eating berries is not a firebreak.
        const choice=Object.entries(t.actions||{}).find(([type,a])=>J().handler(type) && Object.prototype.hasOwnProperty.call(a,"becomes") && a.becomes!==t.id);
        if (!choice) return {safe:false,reason:"no physical clearance action"};
        const spec={type:choice[0],target:p,params:{fireSafety:true,clearance:true,siteId:u.data.site}};
        const probe={...spec,phase:0};
        const plan=J().handler(spec.type).plan(probe,u);
        if (!plan || plan.ok===false || !path(u,u,plan.stand)) return {safe:false,reason:"hearth clearance unreachable"};
        return {safe:false,spec};
    }
    function hearthPreparation(u,p) {
        if (!u || !p || !same(u,p) || !F() || !O()) return {safe:false,reason:"hearth level unavailable"};
        let next=null;
        for (const [dx,dy] of N4) {
            const check=clearing(u,ref(area(p),p.x+dx,p.y+dy));
            if (!check.safe && !check.spec) return check;
            if (check.spec && !next) next=check;
        }
        return next || {safe:true};
    }
    function countResponders(u) {
        return J().list(j=>active(j)&&j.type==="douse"&&j.assigned&&j.params&&j.params.faction===u.data.faction&&j.params.siteId===u.data.site&&same(j.target,u)).length;
    }
    function response(u) {
        const fires=F().burningCells().filter(p=>local(u,p)&&distance(u,p)<=40);
        // Homes, beds and stores before surrounding brush, then proximity.
        const threat=p=>{
            const t=O().atIn(area(p),p.x,p.y),tags=t&&t.tags||[];
            return tags.some(k=>["building","bed","stockpile"].includes(k)) ? 0 : 1;
        };
        fires.sort((a,b)=>threat(a)-threat(b)||distance(u,a)-distance(u,b)||a.y-b.y||a.x-b.x);
        for (const p of fires.slice(0,6)) {
            const existing=F().douseJobs().find(j=>same(j.target,p)&&j.target.x===p.x&&j.target.y===p.y);
            if (existing && (existing.assigned || existing.params.faction!==u.data.faction)) continue;
            const probe={type:"douse",target:p,phase:0,params:{fire:p,fireKey:p.key,faction:u.data.faction}};
            const plan=J().handler("douse").plan(probe,u);
            if (!plan || plan.ok===false || !path(u,u,plan.stand)) continue;
            const virtual={...u,x:plan.stand.x,y:plan.stand.y};
            const stand=F().standBeside(area(p),p.x,p.y,virtual);
            if (!stand || !path(u,plan.stand,stand)) continue;
            return {p,existing};
        }
        return null;
    }
    function respond(u) {
        if (!F() || !J() || !J().handler("douse") || !eligible(u) || !F().count()) return null;
        const current=J().of(u.id);
        if (current && (current.type==="douse" || current.params&&current.params.ordered || ["eat","drink","sleep","mate","attack","hunt","flee"].includes(current.type))) return null;
        if (cachedWorld!==W().state) {cachedWorld=W().state;tries.clear();}
        if ((tries.get(u.id)||0)>now() || countResponders(u)>=LIMIT) return null;
        tries.set(u.id,now()+RETRY);
        const found=response(u);
        if (!found) return null; // failed preflight never cancels useful work
        const job=found.existing || F().douse(area(found.p),found.p.x,found.p.y,{cause:"settlement safety",faction:u.data.faction});
        if (!job) return null;
        job.params.siteId=u.data.site; job.params.fireSafety=true;
        if (current) J().cancel(current.id,"protecting the settlement from fire");
        const assigned=J().assign(job.id,u.id);
        return assigned && assigned.state!=="failed" ? assigned : null;
    }
    function prevent(u) {
        if (!F() || !J() || !eligible(u) || J().of(u.id)) return null;
        const c=UF.Colonists.state(u), candidates=[];
        if (same(c,u)) candidates.push(ref(area(c),c.site.x,c.site.y));
        for (const h of homes(u)) if(h.hearth)candidates.push(ref(area(u),h.hearth.x,h.hearth.y));
        for (const p of candidates.slice(0,8)) {
            const type=O().atIn(area(p),p.x,p.y);
            if (!type || !(type.tags||[]).includes("fire")) continue;
            const next=hearthPreparation(u,p);
            if (!next.spec) continue;
            const s=next.spec;
            if (J().list(j=>active(j)&&same(j.target,s.target)&&j.target.x===s.target.x&&j.target.y===s.target.y).length) continue;
            const job=J().create({...s,owner:u.id});
            if (job && job.state!=="failed") return job;
        }
        return null;
    }
    UF.FireSafety={respond,prevent,hearthPreparation,eligible,LIMIT};
})();
