//=============================================================================
// UF_Skills.js - Skills that grow by doing (VISION V63): levels 1-99 from jobs and fights; speed, yield, quality
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Skills] Every person has skills (trades and the fighting skills) that level from 1 to 99 by doing them; higher levels work faster, yield more and make better things.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_World
 * @orderAfter UF_Jobs
 * @orderAfter UF_Colonists
 * @orderAfter UF_Combat
 * @orderAfter UF_Speech
 *
 * @help
 * Every person (unit.data.kind "colonist" or "person") carries
 * unit.data.skillXp = { skillId: xp }. The skills, the job types and recipes
 * each one covers, the xp per job, the effects and the starting-level rules
 * are the catalog's "skills" key (data/UF_WorldCatalog.json).
 *
 * Levels 1-99 on the classic growing curve:
 *   xp for level L = floor( sum_{i=1}^{L-1} floor(i + 300 * 2^(i/7)) / 4 )
 *   (level 2 = 83, 10 = 1154, 50 = 101333, 92 = 6517253, 99 = 13034431).
 *
 * Experience by doing:
 *   jobs:done   -> the job type's skill (base + perWork x the job's work)
 *   jobs:kill   -> hunting
 *   combat:hit  -> 4 xp per damage point to the style's skill (accurate:
 *                  attack, aggressive: strength, defensive: defence,
 *                  controlled: a third each; ranged styles: ranged, long
 *                  range: ranged + defence) plus 1.33 hitpoints per damage.
 * Effects: UF.Skills.rate(unit, jobType) = 1 + (level - 1) x 0.01 (UF_Jobs
 * multiplies its work rate by it); a seeded chance of level/200 of one more
 * of the first yield after gather, chop, mine, quarry, fish and hunt;
 * qualityRoll(unit, skill) 0-5 for crafted things; meets(unit, requirement).
 * Level-ups show over the head (UF.Speech.say, else the UF_Visuals bark),
 * milestone levels and the deaths of skilled people go to the chronicle.
 *
 * Wildlife and monsters don't level: level() reads data.combatLevels, then
 * the catalog's wildlife.species[].combat, else 1 (hitpoints 10).
 *
 * API, state, events and checks: docs/systems/UF_Skills.md
 *
 * Replaced core methods: none (aliases only: DataManager.extractSaveContents,
 * Scene_Boot.prototype.start).
 */

(() => {
    "use strict";

    const SALT = { start: 0x5c11, yield: 0x5c12, quality: 0x5c13 };
    const MAX_LEVEL = 99;
    const PRAYER_OMITTED = 0; // the classic combat level counts prayer / 2; there is no prayer skill (see combatLevel)

    const catalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const round1 = v => Math.round(v * 10) / 10;
    const lower = s => String(s || "").toLowerCase();
    const isPerson = u => !!(u && u.data && (u.data.kind === "colonist" || u.data.kind === "person"));

    const errors = [];
    let errorCount = 0;
    function report(where, e) {
        errorCount++;
        errors.push(`${where}: ${e && e.message ? e.message : e}`);
        if (errors.length > 20) errors.shift();
        console.error(`UF_Skills ${where}:`, e);
    }

    //-------------------------------------------------------------------------
    // The curve (computed once from the formula)

    const XP = new Array(MAX_LEVEL + 1).fill(0);
    (() => {
        let sum = 0;
        for (let L = 2; L <= MAX_LEVEL; L++) {
            sum += Math.floor((L - 1) + 300 * Math.pow(2, (L - 1) / 7));
            XP[L] = Math.floor(sum / 4);
        }
    })();
    /** The xp at which level L starts (L clamped to 1-99). */
    const xpForLevel = L => XP[clamp(Math.floor(L) || 1, 1, MAX_LEVEL)];
    /** The level an xp total gives (1-99). */
    function levelForXp(xp) {
        if (!(xp > 0)) return 1;
        let lo = 1, hi = MAX_LEVEL;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (XP[mid] <= xp) lo = mid; else hi = mid - 1;
        }
        return lo;
    }

    //-------------------------------------------------------------------------
    // Config from the catalog, cached until the catalog object changes

    const runtimeJobs = new Map(); // mapJob(type, skillId): job types other plugins define
    let cfgCache = null, cfgFrom = null, cfgSkills = null, cfgRev = 0, jobsRev = 0;
    function cfg() {
        const c = catalog();
        const sk = c && c.skills;
        if (cfgCache && cfgFrom === c && cfgSkills === sk && cfgRev === jobsRev) return cfgCache;
        cfgFrom = c; cfgSkills = sk; cfgRev = jobsRev;
        const s = sk || {};
        const list = Array.isArray(s.list) ? s.list.filter(e => e && e.id) : [];
        const byId = {};
        for (const e of list) byId[e.id] = e;
        const jobSkill = {}, recipeSkill = {}, recipeAt = {};
        const buildTags = [];
        let craftDefault = null;
        for (const e of list) {
            for (const j of e.jobs || []) if (!jobSkill[j]) jobSkill[j] = e.id;
            for (const r of e.recipeSkills || []) if (!recipeSkill[r]) recipeSkill[r] = e.id;
            for (const a of e.recipeAt || []) if (!recipeAt[a]) recipeAt[a] = e.id;
            for (const t of e.buildTags || []) buildTags.push({ tag: t, id: e.id });
            if (e.craftDefault && !craftDefault) craftDefault = e.id;
        }
        for (const [type, id] of runtimeJobs) {
            if (id) jobSkill[type] = id; else delete jobSkill[type];
        }
        const recipes = {};
        for (const r of (c && c.recipes && Array.isArray(c.recipes.list) ? c.recipes.list : [])) if (r && r.id) recipes[r.id] = r;
        const species = {};
        for (const sp of (c && c.wildlife && Array.isArray(c.wildlife.species) ? c.wildlife.species : [])) if (sp && sp.id) species[sp.id] = sp;
        const eff = s.effects || {};
        const start = s.start || {};
        cfgCache = {
            present: !!sk,
            list, byId, jobSkill, recipeSkill, recipeAt, buildTags, craftDefault, recipes, species,
            trades: list.filter(e => e.kind !== "combat"),
            combat: list.filter(e => e.kind === "combat"),
            maxXp: s.maxXp > 0 ? s.maxXp : 200000000,
            noSkill: new Set(Array.isArray(s.noSkill) ? s.noSkill : []),
            xp: Object.assign({ workCap: 600, buildShare: 0.5 }, s.xp || {}),
            speedPerLevel: typeof eff.speedPerLevel === "number" ? eff.speedPerLevel : 0.01,
            extraYield: Object.assign({ jobs: [], chancePerLevel: 0.005 }, eff.extraYield || {}),
            quality: Object.assign({ perLevel: 0.0357, spread: 2.5, max: 5 }, eff.quality || {}),
            combatXp: s.combatXp || { hitpointsPerDamage: 0 },
            start,
            stages: start.stages || {},
            oldRecord: s.oldRecord || { levelPerPoint: 4.9, map: {} },
            chronicle: Object.assign({ levels: [], who: "all", deathMinTotal: Infinity, deathBest: 3, deathExclude: [] }, s.chronicle || {}),
            speech: Object.assign({ text: "{skill} level {level}", kind: "thought", barkFrames: 180 }, s.speech || {})
        };
        cfgCache.extraYield.set = new Set(cfgCache.extraYield.jobs || []);
        return cfgCache;
    }
    const skillName = id => (cfg().byId[id] && cfg().byId[id].name) || id;

    /** The skill a job trains: mapJob overrides, the catalog's jobs lists; a craft by its recipe's skill, then its workshop tag, then the default craft skill. */
    function skillOfJob(type, job) {
        if (!type) return null;
        const c = cfg();
        if (type === "craft" && !runtimeJobs.has("craft")) {
            const r = job && job.params ? c.recipes[job.params.recipeId] : null;
            if (r) {
                if (r.skill && c.recipeSkill[r.skill]) return c.recipeSkill[r.skill];
                if (r.skill && c.byId[r.skill]) return r.skill;
                if (r.at && c.recipeAt[r.at]) return c.recipeAt[r.at];
            }
            return c.craftDefault;
        }
        return c.jobSkill[type] || null;
    }
    /** Map a job type another plugin defines to a skill (null removes it). Not saved; call it at load. */
    function mapJob(type, skillId) {
        if (!type) return false;
        runtimeJobs.set(String(type), skillId || null);
        jobsRev++;
        return true;
    }

    //-------------------------------------------------------------------------
    // State: unit.data.skillXp = { skillId: xp } (people only); UF.World.state.skills = { version, rolls }

    function skillsState() {
        const W = World();
        if (!W || !W.state) return null;
        if (!W.state.skills) W.state.skills = { version: 1, rolls: 0 };
        return W.state.skills;
    }
    const seedOf = () => {
        const W = World();
        return W && W.state ? W.state.seed | 0 : 0;
    };
    const hash = (...p) => {
        const W = World();
        return W && W.hash32 ? W.hash32(...p) : 0;
    };
    // One uniform draw per key. The raw FNV hash of sequential keys is biased (0.44-0.54 for a 0.5 threshold over
    // 2000 job ids, measured 2026-09-19), so the draw goes through mulberry32 seeded by it.
    const u01 = (...p) => {
        const W = World();
        return W && W.mulberry32 ? W.mulberry32(hash(...p))() : 0;
    };

    function speciesCombat(unit) {
        const sp = cfg().species[unit && unit.data && unit.data.species];
        return sp && sp.combat && typeof sp.combat === "object" ? sp.combat : null;
    }

    /** A unit's level in a skill: people from their xp; others from data.combatLevels, the species' catalog combat block, else 1 (hitpoints 10). */
    function level(unit, id) {
        const d = unit && unit.data;
        if (!d) return id === "hitpoints" ? 10 : 1;
        const rec = d.skillXp;
        if (rec && typeof rec === "object") return levelForXp(rec[id] || 0);
        const cl = d.combatLevels;
        if (cl && typeof cl[id] === "number") return Math.max(1, cl[id]);
        const sc = speciesCombat(unit);
        if (sc && typeof sc[id] === "number") return Math.max(1, sc[id]);
        return id === "hitpoints" ? 10 : 1;
    }
    /** xp in a skill (people: the record; others: the xp their level starts at). */
    function xp(unit, id) {
        const rec = unit && unit.data && unit.data.skillXp;
        if (rec && typeof rec === "object") return rec[id] || 0;
        return xpForLevel(level(unit, id));
    }
    /** Set a person's level in a skill (xp = the level's start); no events. Returns false for non-people. */
    function setLevel(unit, id, L) {
        if (!unit || !unit.data || !cfg().byId[id]) return false;
        if (!unit.data.skillXp) {
            if (!isPerson(unit)) return false;
            adopt(unit);
        }
        const x = xpForLevel(L);
        if (x > 0) unit.data.skillXp[id] = x; else delete unit.data.skillXp[id];
        return true;
    }
    const total = unit => cfg().list.reduce((s, e) => s + level(unit, e.id), 0);
    /** The n best skills: [{ id, name, level, xp }] by level, then xp, then catalog order; opts.exclude = ids to leave out. */
    function best(unit, n, opts) {
        const ex = new Set((opts && opts.exclude) || []);
        const out = cfg().list.filter(e => !ex.has(e.id)).map((e, i) => ({ id: e.id, name: e.name, level: level(unit, e.id), xp: xp(unit, e.id), i }));
        out.sort((a, b) => b.level - a.level || b.xp - a.xp || a.i - b.i);
        return out.slice(0, n > 0 ? n : out.length).map(({ id, name, level, xp }) => ({ id, name, level, xp }));
    }
    /**
     * The classic combat level from { attack, strength, defence, hitpoints, ranged, magic } (prayer omitted: we have
     * no prayer skill, so its term floor(prayer / 2) is 0, which is also what prayer level 1 gives):
     * floor( 0.25 x (defence + hitpoints) + max( 0.325 x (attack + strength), 0.325 x floor(1.5 x ranged), 0.325 x floor(1.5 x magic) ) ).
     * All 1 with hitpoints 10 gives 3; all 99 gives 113.
     */
    function combatLevelFrom(L) {
        const g = k => (L && L[k] > 0 ? L[k] : (k === "hitpoints" ? 10 : 1));
        const base = 0.25 * (g("defence") + g("hitpoints") + Math.floor(PRAYER_OMITTED / 2));
        const melee = 0.325 * (g("attack") + g("strength"));
        const range = 0.325 * Math.floor(3 * g("ranged") / 2);
        const mage = 0.325 * Math.floor(3 * g("magic") / 2);
        return Math.floor(base + Math.max(melee, range, mage));
    }
    const combatLevel = unit => combatLevelFrom({ attack: level(unit, "attack"), strength: level(unit, "strength"), defence: level(unit, "defence"),
        hitpoints: level(unit, "hitpoints"), ranged: level(unit, "ranged"), magic: level(unit, "magic") });

    //-------------------------------------------------------------------------
    // Starting levels (seeded by the world seed and the unit id; shaped by life stage, species and culture)

    function stageOf(unit) {
        const c = cfg(), d = (unit && unit.data) || {};
        if (typeof d.stage === "string" && c.stages[d.stage]) return d.stage;
        if (typeof d.age === "number") {
            const a = Object.assign({ baby: 1, child: 12, teen: 18, elder: 60 }, c.start.stageAges || {});
            const s = d.age < a.baby ? "baby" : d.age < a.child ? "child" : d.age < a.teen ? "teen" : d.age < a.elder ? "adult" : "elder";
            if (c.stages[s]) return s;
        }
        return c.start.defaultStage && c.stages[c.start.defaultStage] ? c.start.defaultStage : Object.keys(c.stages)[0] || "adult";
    }
    // Old skill names (the pre-V63 record, and labors.list[].skill) to the new ids.
    const oldToNew = name => {
        const m = cfg().oldRecord.map || {};
        if (Array.isArray(m[name])) return m[name];
        return cfg().byId[name] ? [name] : [];
    };
    function cultureFactor(skill, species) {
        const c = catalog() || {};
        const cul = (c.cultures && c.cultures[species]) || null;
        if (!cul) return 1;
        const pr = cul.priorities || {}, cw = cul.chainWeights || {};
        const jobs = (skill.jobs || []).slice();
        if ((skill.recipeSkills && skill.recipeSkills.length) || (skill.recipeAt && skill.recipeAt.length)) jobs.push("craft");
        let job = null;
        for (const j of jobs) if (typeof pr[j] === "number") job = job === null ? pr[j] : Math.max(job, pr[j]);
        let chain = null;
        for (const lab of ((c.labors && c.labors.list) || [])) {
            if (!lab || typeof cw[lab.id] !== "number") continue;
            if (oldToNew(lab.skill).includes(skill.id)) chain = chain === null ? cw[lab.id] : Math.max(chain, cw[lab.id]);
        }
        return (job === null ? 1 : job) * (chain === null ? 1 : chain);
    }
    /** Pure: the starting levels of a unit-like { id, data: { stage|age, species } } for a seed. Returns { stage, levels, trades }. */
    function startLevels(unit, seed) {
        const c = cfg(), W = World();
        const d = (unit && unit.data) || {};
        const stage = stageOf(unit);
        const rules = c.stages[stage] || {};
        const rng = W.mulberry32(W.hash32(seed === undefined ? seedOf() : seed, SALT.start, unit.id | 0));
        const between = r => (Array.isArray(r) ? r[0] + Math.floor(rng() * (r[1] - r[0] + 1)) : 1);
        const fav = new Set(((c.start.favoured || {})[d.species]) || []);
        const levels = {};
        for (const e of c.list) levels[e.id] = 1;
        // Trades: a weighted draw without repeats.
        const tw = c.start.tradeWeight || {};
        const exp = typeof c.start.cultureExponent === "number" ? c.start.cultureExponent : 1;
        const pool = c.trades.map(e => ({ id: e.id, w: (typeof tw[e.id] === "number" ? tw[e.id] : 1) * Math.pow(cultureFactor(e, d.species), exp) })).filter(p => p.w > 0);
        const n = between(rules.trades || [0, 0]);
        const trades = [];
        for (let k = 0; k < n && pool.length; k++) {
            const sum = pool.reduce((s, p) => s + p.w, 0);
            let r = rng() * sum, i = 0;
            while (i < pool.length - 1 && r >= pool[i].w) { r -= pool[i].w; i++; }
            const pick = pool.splice(i, 1)[0];
            levels[pick.id] = clamp(between(rules.tradeLevel || [1, 1]), 1, MAX_LEVEL);
            trades.push(pick.id);
        }
        // Fighting skills: the stage's range for the skill (magic, hitpoints) or its combat range; favoured roll twice.
        for (const e of c.combat) {
            const range = rules[e.id] || rules.combat || [1, 1];
            let L = between(range);
            if (fav.has(e.id)) L = Math.max(L, between(range));
            levels[e.id] = clamp(L, 1, MAX_LEVEL);
        }
        if (levels.hitpoints !== undefined) levels.hitpoints = Math.max(c.start.hitpointsMin || 10, levels.hitpoints);
        return { stage, levels, trades };
    }
    /** An old record (skill name: 0-20 points) as levels of the new skills: 1 + round(points x levelPerPoint), the highest where two old names meet. */
    function convertOld(record) {
        const out = {};
        if (!record || typeof record !== "object") return out;
        const per = typeof cfg().oldRecord.levelPerPoint === "number" ? cfg().oldRecord.levelPerPoint : 4.9;
        for (const name of Object.keys(record)) {
            const v = Number(record[name]);
            if (!(v >= 0)) continue;
            const L = clamp(1 + Math.round(v * per), 1, MAX_LEVEL);
            for (const id of oldToNew(name)) if (cfg().byId[id]) out[id] = Math.max(out[id] || 1, L);
        }
        return out;
    }
    /**
     * Give a person their record now if they have none: the seeded starting levels; with opts.convertOld, an old
     * data.skills record raises any skill to its converted level. data.stats (the old d20 scores) is not touched.
     */
    function adopt(unit, opts) {
        if (!unit || !unit.data || (unit.data.skillXp && typeof unit.data.skillXp === "object")) return false;
        if (!isPerson(unit) && !(opts && opts.force)) return false;
        if (!cfg().present) return false;
        const s = startLevels(unit, opts && opts.seed !== undefined ? opts.seed : undefined);
        const levels = s.levels;
        let from = "rolled";
        if (opts && opts.convertOld && unit.data.skills && typeof unit.data.skills === "object") {
            const conv = convertOld(unit.data.skills);
            for (const id of Object.keys(conv)) if (conv[id] > (levels[id] || 1)) levels[id] = conv[id];
            from = "rolled+old";
        }
        const rec = {};
        for (const id of Object.keys(levels)) {
            const x = xpForLevel(levels[id]);
            if (x > 0) rec[id] = x;
        }
        unit.data.skillXp = rec;
        unit.data.skillsFrom = from;
        return true;
    }
    /** Every person in a world state without a record gets one, converting old records (a save made before skills). */
    function migrateState(state) {
        if (!state || !state.units) return 0;
        let n = 0;
        for (const id of Object.keys(state.units)) {
            const u = state.units[id];
            if (isPerson(u) && !(u.data.skillXp && typeof u.data.skillXp === "object") && adopt(u, { convertOld: true, seed: state.seed | 0 })) n++;
        }
        return n;
    }

    //-------------------------------------------------------------------------
    // Gaining experience

    let lastLine = null; // { unitId, text, via } of the newest level-up line (tests, the report)

    // UF_Visuals' bark draws with CanvasRenderingContext2D.roundRect, which this NW.js lacks (the bark throws), so
    // without UF_Speech the line is drawn here: plain text over the head (V62), following the unit, fading out.
    const canBark = () => typeof CanvasRenderingContext2D !== "undefined" && typeof CanvasRenderingContext2D.prototype.roundRect === "function";
    const LINE_W = 260, LINE_H = 30, LINE_ABOVE = 54, LINE_FADE = 30;
    const activeLines = new Map(); // unit id -> sprite (a newer line replaces an older one on the same unit)
    class Sprite_UFSkillLine extends Sprite {
        constructor(unitId, character, text, frames) {
            super(new Bitmap(LINE_W, LINE_H));
            this._ufSkillUnit = unitId;
            this._character = character;
            this._life = Math.max(LINE_FADE + 1, frames | 0);
            this._max = this._life;
            this.anchor.x = 0.5;
            this.anchor.y = 1;
            this.z = 900001; // over units and objects, under the fog (WORLD_ARCHITECTURE section 4)
            const b = this.bitmap;
            b.fontSize = 18;
            b.fontBold = true;
            b.textColor = "#ffe39f";
            b.outlineColor = "rgba(0, 0, 0, 0.9)";
            b.outlineWidth = 4;
            b.drawText(text, 0, 0, LINE_W, LINE_H, "center");
            this._ufText = text;
            this.place();
        }
        place() {
            this.x = this._character.screenX();
            this.y = this._character.screenY() - LINE_ABOVE;
        }
        update() {
            super.update();
            this._life--;
            this.place();
            if (this._life < LINE_FADE) this.opacity = Math.max(0, 255 * this._life / LINE_FADE);
            if (this._life <= 0) this.finish();
        }
        finish() {
            if (activeLines.get(this._ufSkillUnit) === this) activeLines.delete(this._ufSkillUnit);
            if (this.parent) this.parent.removeChild(this);
            const b = this.bitmap;
            this.bitmap = null;
            if (b) b.destroy();
        }
    }
    function drawLine(unit, ev, text, frames) {
        const scene = SceneManager._scene;
        const tm = scene && scene._spriteset && scene._spriteset._tilemap;
        if (!tm) return false;
        const old = activeLines.get(unit.id);
        if (old) old.finish();
        const sp = new Sprite_UFSkillLine(unit.id, ev, text, frames);
        tm.addChild(sp);
        activeLines.set(unit.id, sp);
        return true;
    }
    function sayOverHead(unit, text) {
        const sp = cfg().speech;
        const S = window.UF && UF.Speech;
        if (S && typeof S.say === "function") {
            try {
                S.say(unit, text, { kind: sp.kind || "thought" });
                lastLine = { unitId: unit.id, text, via: "speech" };
                return true;
            } catch (e) { report("speech", e); }
        }
        const W = World();
        const ev = W ? W.eventOf(unit.id) : null;
        if (!ev) { lastLine = { unitId: unit.id, text, via: "none" }; return false; } // not on screen
        const V = (window.UF && UF.Visuals && typeof UF.Visuals.bark === "function") ? UF.Visuals : window.UF_Visuals;
        if (V && typeof V.bark === "function" && canBark()) {
            try {
                V.bark(ev, text, sp.barkFrames || 180);
                lastLine = { unitId: unit.id, text, via: "bark" };
                return true;
            } catch (e) { report("bark", e); }
        }
        try {
            const ok = drawLine(unit, ev, text, sp.barkFrames || 180);
            lastLine = { unitId: unit.id, text, via: ok ? "line" : "none" };
            return ok;
        } catch (e) { report("line", e); }
        return false;
    }
    function factionName(id) {
        const F = window.UF && UF.Factions;
        const f = F && typeof F.get === "function" && id ? F.get(id) : null;
        return f && f.name ? f.name : null;
    }
    function chronicle(type, text, unit) {
        const H = window.UF && UF.History;
        if (!H || typeof H.addEvent !== "function") return null;
        const e = { type, text, factions: unit.data && unit.data.faction ? [unit.data.faction] : [] };
        if (unit.area) { e.area = { x: unit.area.x, y: unit.area.y }; e.x = unit.x; e.y = unit.y; }
        try { return H.addEvent(e); } catch (err) { report("chronicle", err); return null; }
    }
    const whoOf = unit => {
        const f = factionName(unit.data && unit.data.faction);
        return f ? `${unit.name} of ${f}` : String(unit.name || "Someone");
    };
    function onLevelUp(unit, id, from, to) {
        const c = cfg();
        if (id === "hitpoints" && typeof unit.data.hp === "number") unit.data.hp += to - from; // the new maximum comes with the level
        const text = String(c.speech.text || "I'm getting better at {skilllower}.").replace("{skilllower}", lower(skillName(id))).replace("{skill}", skillName(id)).replace("{level}", String(to));
        sayOverHead(unit, text);
        const who = c.chronicle.who === "player" ? (window.UF && UF.Factions && UF.Factions.player ? UF.Factions.player() : null) : null;
        if (c.chronicle.who !== "player" || (who && unit.data.faction === who.id)) {
            const crossed = (c.chronicle.levels || []).filter(m => m > from && m <= to);
            if (crossed.length) chronicle("skill_level", `${whoOf(unit)} reached ${lower(skillName(id))} level ${Math.max(...crossed)}.`, unit);
        }
        emit("skills:levelUp", unit, id, to);
    }
    /** Add xp to a person's skill: { levelsGained, level, xp }. Creatures and other non-people don't level (levelsGained 0). */
    function add(unit, id, amount) {
        const c = cfg();
        if (!unit || !unit.data || !c.byId[id]) return { levelsGained: 0, level: 1, xp: 0 };
        if (!(unit.data.skillXp && typeof unit.data.skillXp === "object")) {
            if (!isPerson(unit) || !adopt(unit)) return { levelsGained: 0, level: level(unit, id), xp: xp(unit, id) };
        }
        const rec = unit.data.skillXp;
        const before = rec[id] || 0;
        if (!(amount > 0)) return { levelsGained: 0, level: levelForXp(before), xp: before };
        const after = Math.min(c.maxXp, round1(before + amount));
        rec[id] = after;
        const L0 = levelForXp(before), L1 = levelForXp(after);
        if (L1 > L0) {
            try { onLevelUp(unit, id, L0, L1); } catch (e) { report("levelUp", e); }
        }
        return { levelsGained: L1 - L0, level: L1, xp: after };
    }

    /** The xp one finished job gives its skill: base + perWork x min(work, workCap); work = the job's progress (its work in ticks). */
    function jobXp(id, job) {
        const s = cfg().byId[id];
        const x = (s && s.xp) || {};
        const work = Math.max(0, Math.min(Number(job && job.progress) || 0, cfg().xp.workCap));
        return round1((x.base || 0) + (x.perWork || 0) * work);
    }

    // One more of the first yield on the job's cell, with a seeded chance of level x chancePerLevel.
    function extraYield(job, unit, id, levelAtWork) {
        const c = cfg();
        if (!c.extraYield.set.has(job.type)) return null;
        const r = job.result;
        const I = Items();
        if (!r || !I) return null;
        let type = null, at = null;
        if (job.type === "fish") {
            if (!r.caught || !Array.isArray(r.items) || !r.items.length) return null;
            const it = I.get(r.items[0]);
            type = it ? it.type : null;
            at = r.at || null;
        } else {
            const ys = r.yields || {};
            type = Object.keys(ys).find(k => (ys[k] | 0) > 0) || null;
            at = job.type === "hunt" ? r.at || null : job.target || null;
        }
        if (!type || !at || !at.area) return null;
        const chance = (levelAtWork > 0 ? levelAtWork : level(unit, id)) * c.extraYield.chancePerLevel;
        if (u01(seedOf(), SALT.yield, unit.id, job.id | 0) >= chance) return null;
        const z = at.z === undefined ? (at.area.z === undefined ? 0 : at.area.z) : at.z;
        const dropped = I.drop({ x: at.area.x, y: at.area.y, z }, at.x, at.y, type, 1);
        if (!dropped || !dropped.length) return null;
        r.extra = { type, count: 1 };
        emit("skills:extraYield", unit, job, type);
        return r.extra;
    }

    function onJobDone(job, unit) {
        if (!job || !isPerson(unit)) return;
        if (job.type === "hunt") { // the xp came with the kill (jobs:kill); the extra yield comes now
            extraYield(job, unit, "hunting");
            return;
        }
        const id = skillOfJob(job.type, job);
        if (!id) return;
        const amount = jobXp(id, job);
        extraYield(job, unit, id, level(unit, id)); // rolled at the level the work was done at, before this job's xp
        add(unit, id, amount);
        if (job.type === "build" && cfg().buildTags.length) {
            const O = window.UF && UF.Objects;
            const t = O && typeof O.type === "function" ? O.type(job.params && job.params.objectId) : null;
            const tags = (t && t.tags) || [];
            const done = new Set();
            for (const b of cfg().buildTags) {
                if (tags.includes(b.tag) && !done.has(b.id) && b.id !== id) {
                    done.add(b.id);
                    add(unit, b.id, round1(amount * cfg().xp.buildShare));
                }
            }
        }
    }
    function onKill(job, prey, hunter) {
        if (!isPerson(hunter) || !job) return;
        add(hunter, "hunting", jobXp("hunting", job));
    }
    function onCombatHit(e) {
        if (!e || !isPerson(e.attacker) || e.hit === false || !(e.damage > 0)) return;
        const t = cfg().combatXp || {};
        const kind = e.attackType === "ranged" ? "ranged" : e.attackType === "magic" ? "magic" : "melee";
        const table = t[kind] || {};
        const split = table[e.style] || table[(t.fallback || {})[kind]] || {};
        for (const id of Object.keys(split)) add(e.attacker, id, split[id] * e.damage);
        if (t.hitpointsPerDamage > 0) add(e.attacker, "hitpoints", t.hitpointsPerDamage * e.damage);
    }

    //-------------------------------------------------------------------------
    // Effects read by other plugins

    /** Work speed: 1 + (level - 1) x speedPerLevel in the skill the job trains; 1 for jobs no skill covers. jobType may be the job itself. */
    function rate(unit, jobType, job) {
        if (!unit || !unit.data) return 1;
        const j = job || (jobType && typeof jobType === "object" ? jobType : null);
        const type = jobType && typeof jobType === "object" ? jobType.type : jobType;
        const id = skillOfJob(type, j);
        if (!id) return 1;
        return 1 + (level(unit, id) - 1) * cfg().speedPerLevel;
    }
    /** A crafted thing's quality 0-5 from the crafter's level in a skill (or a recipe id's skill); seeded by the world's roll counter. */
    function qualityRoll(unit, id) {
        const c = cfg();
        const skill = c.byId[id] ? id : (c.recipes[id] ? skillOfJob("craft", { params: { recipeId: id } }) : null);
        const L = skill ? level(unit, skill) : 1;
        const st = skillsState();
        const n = st ? st.rolls++ : 0;
        const q = c.quality;
        const r = u01(seedOf(), SALT.quality, unit ? unit.id | 0 : 0, n);
        return clamp(Math.floor((L - 1) * q.perLevel + r * q.spread), 0, q.max | 0);
    }
    /**
     * Whether a unit meets a requirement: { skill, level }, a map { skillId: level }, or a recipe with minLevel (a number
     * for the recipe's own skill, or a map). null / no requirement = true.
     */
    function meets(unit, req) {
        if (!req) return true;
        const c = cfg();
        if (typeof req.skill === "string" && typeof req.level === "number" && c.byId[req.skill]) return level(unit, req.skill) >= req.level;
        if (req.minLevel !== undefined) {
            if (typeof req.minLevel === "number") {
                const id = skillOfJob("craft", { params: { recipeId: req.id } }) || (c.byId[req.skill] ? req.skill : null);
                return id ? level(unit, id) >= req.minLevel : true;
            }
            return meets(unit, req.minLevel);
        }
        for (const k of Object.keys(req)) {
            if (c.byId[k] && typeof req[k] === "number" && level(unit, k) < req[k]) return false;
        }
        return true;
    }

    //-------------------------------------------------------------------------
    // Deaths of skilled people

    const mourned = new Set(); // unit ids already written this session (combat:kill and anim:death can both report one death)
    function onDeath(unit) {
        if (!isPerson(unit) || !(unit.data.skillXp && typeof unit.data.skillXp === "object")) return null;
        if (mourned.has(unit.id) || unit.data.skillsMourned) return null;
        const c = cfg();
        const sum = total(unit);
        mourned.add(unit.id);
        unit.data.skillsMourned = true;
        if (!(sum > c.chronicle.deathMinTotal)) return null;
        const top = best(unit, c.chronicle.deathBest || 3, { exclude: c.chronicle.deathExclude || [] });
        const parts = top.map(s => `${lower(s.name)} ${s.level}`);
        const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts.join("");
        const ev = chronicle("death_skilled", `${whoOf(unit)} was lost, and all they knew with them: ${list} (total level ${sum}).`, unit);
        emit("skills:lost", unit, top, sum);
        return ev;
    }
    const isDeadData = u => !!(u && u.data && (u.data.dead === true || (typeof u.data.hp === "number" && u.data.hp <= 0)));

    //-------------------------------------------------------------------------
    // Wiring

    let hooked = false;
    function hookEvents() {
        if (hooked || !(window.UF && UF.Events)) return;
        hooked = true;
        const E = UF.Events;
        const guard = (where, fn) => (...a) => { try { fn(...a); } catch (e) { report(where, e); } };
        E.on("world:unitAdded", guard("unitAdded", u => { if (isPerson(u)) adopt(u); }));
        E.on("world:created", guard("created", state => {
            mourned.clear();
            skillsState();
            for (const id of Object.keys((state && state.units) || {})) adopt(state.units[id]);
        }));
        E.on("jobs:done", guard("jobs:done", onJobDone));
        E.on("jobs:kill", guard("jobs:kill", onKill));
        E.on("combat:hit", guard("combat:hit", onCombatHit));
        E.on("combat:kill", guard("combat:kill", e => { if (e && e.target) onDeath(e.target); }));
        E.on("anim:death", guard("anim:death", u => onDeath(u)));
        E.on("world:unitRemoved", guard("unitRemoved", u => { if (isDeadData(u)) onDeath(u); }));
    }
    hookEvents(); // UF_Core's bus exists by now (it loads first); Scene_Boot.start tries again in case it didn't

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        mourned.clear();
        try {
            const W = World();
            if (W && W.state) {
                skillsState();
                migrateState(W.state);
            }
        } catch (e) { report("load", e); }
    };

    const Skills = {
        MAX_LEVEL,
        xpForLevel, levelForXp,
        level, xp, add, setLevel, total, best, combatLevel, combatLevelFrom,
        rate, qualityRoll, meets,
        skillOfJob, mapJob, jobXp,
        skills: () => cfg().list.slice(),
        name: skillName,
        startLevels, stageOf, convertOld, adopt, migrateState,
        isPerson,
        errors,
        errorCount: () => errorCount,
        lastLine: () => lastLine,
        _onDeath: onDeath
    };
    window.UF = window.UF || {};
    window.UF.Skills = Skills;

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        hookEvents();
        if (window.UF.Test && UF.Test.active) registerChecks();
        _Scene_Boot_start.call(this);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "skills")

    function registerChecks() {
        UF.Test.suite("skills", async t => {
            const W = UF.World, I = UF.Items, J = UF.Jobs;
            const S = Skills;
            const errors0 = t.errorsSoFar().length, inner0 = errorCount;
            const area = W.currentArea();
            const made = [];
            const freeNear = (x, y) => W.nearestFreeCell(area.x, area.y, x, y, 10) || { x, y };
            const mk = (name, data, x, y) => {
                const c = freeNear(x, y);
                const u = W.addUnit({ name, image: { characterName: "$U7_Townsman", characterIndex: 0 }, area: { x: area.x, y: area.y }, x: c.x, y: c.y, dir: 2, data });
                made.push(u.id);
                return u;
            };
            const cx = $gamePlayer.x, cy = $gamePlayer.y;
            const lv = (u, id) => S.level(u, id);
            const x1 = v => Math.round(v * 10) / 10;

            // 1. curve
            const want = { 2: 83, 10: 1154, 50: 101333, 92: 6517253, 99: 13034431 };
            const got = Object.keys(want).map(L => `${L}: ${S.xpForLevel(+L)}`);
            let mono = true;
            for (let L = 2; L <= 99; L++) if (!(S.xpForLevel(L) > S.xpForLevel(L - 1))) mono = false;
            const bounds = [[0, 1], [82, 1], [83, 2], [1153, 9], [1154, 10], [13034430, 98], [13034431, 99], [200000000, 99]];
            const badBounds = bounds.filter(([x, L]) => S.levelForXp(x) !== L);
            t.check("curve", Object.keys(want).every(L => S.xpForLevel(+L) === want[L]) && mono && badBounds.length === 0,
                `xpForLevel ${got.join(", ")} (want ${Object.keys(want).map(L => `${L}: ${want[L]}`).join(", ")}); rising 1-99: ${mono}; levelForXp boundaries wrong: ${badBounds.length ? badBounds.map(([x, L]) => `${x} -> ${S.levelForXp(x)} (want ${L})`).join("; ") : "none"}`);

            // 2. starting_levels
            const rules = cfg().stages;
            const inRange = (v, r) => Array.isArray(r) && v >= r[0] && v <= r[1];
            const people = W.units().filter(u => S.isPerson(u));
            const startProblems = [];
            const tradeIds = cfg().trades.map(e => e.id), combatIds = cfg().combat.map(e => e.id);
            const judge = (u, s, label) => {
                const r = rules[s.stage];
                if (!r) { startProblems.push(`${label}: stage ${s.stage} has no rules`); return; }
                const chosen = tradeIds.filter(id => s.levels[id] > 1);
                if (!inRange(s.trades.length, r.trades) || s.trades.some(id => !inRange(s.levels[id], r.tradeLevel)) || chosen.some(id => !s.trades.includes(id)))
                    startProblems.push(`${label} (${s.stage}): trades ${s.trades.map(id => `${id} ${s.levels[id]}`).join(", ") || "none"} (want ${r.trades.join("-")} in ${r.tradeLevel.join("-")})`);
                for (const id of combatIds) {
                    const range = r[id] || r.combat;
                    const L = s.levels[id];
                    if (id === "hitpoints" ? !(L >= 10 && L <= Math.max(10, range[1])) : !inRange(L, range)) startProblems.push(`${label} (${s.stage}): ${id} ${L} (want ${range.join("-")}${id === "hitpoints" ? ", >= 10" : ""})`);
                }
            };
            let recorded = 0, below = 0, notSame = 0;
            for (const u of people) {
                const s1 = S.startLevels(u), s2 = S.startLevels(u);
                if (JSON.stringify(s1) !== JSON.stringify(s2)) notSame++;
                judge(u, s1, u.name);
                if (u.data.skillXp) {
                    recorded++;
                    if (u.data.skillsFrom === "rolled" && Object.keys(s1.levels).some(id => (u.data.skillXp[id] || 0) < S.xpForLevel(s1.levels[id]))) below++;
                }
            }
            const child = mk("TEST_SkillChild", { kind: "person", species: "human", age: 5 }, cx + 2, cy + 3);
            const elder = mk("TEST_SkillElder", { kind: "person", species: "human", age: 70 }, cx + 3, cy + 3);
            const childOk = !!child.data.skillXp && cfg().list.every(e => lv(child, e.id) === (e.id === "hitpoints" ? 10 : 1));
            const es = S.startLevels(elder);
            judge(elder, es, "TEST_SkillElder");
            const elderOk = !!elder.data.skillXp && es.stage === "elder" && cfg().list.every(e => lv(elder, e.id) === es.levels[e.id]);
            // Culture: 300 seeded adults of two cultures (pure, nothing added to the world).
            const share = (species, skill) => {
                let n = 0;
                for (let k = 0; k < 300; k++) if (S.startLevels({ id: 500000 + k, data: { kind: "person", species, stage: "adult" } }).trades.includes(skill)) n++;
                return n;
            };
            const dwarfMining = share("dwarf", "mining"), elfMining = share("elf", "mining");
            const elfFletch = share("elf", "fletching"), dwarfFletch = share("dwarf", "fletching");
            t.check("starting_levels", people.length > 0 && recorded === people.length && startProblems.length === 0 && below === 0 && notSame === 0 && childOk && elderOk && dwarfMining > elfMining && elfFletch > dwarfFletch,
                `${recorded}/${people.length} people in the world have a record (all rolled at appearance; ${below} below their roll, ${notSame} rolls not repeatable); rule problems: ${startProblems.length ? startProblems.slice(0, 4).join("; ") : "none"}; ` +
                `sample ${people[0] ? `${people[0].name} (${S.stageOf(people[0])}, ${people[0].data.species}): ${S.best(people[0], 4).map(s => `${s.id} ${s.level}`).join(", ")}, combat level ${S.combatLevel(people[0])}, total ${S.total(people[0])}` : "none"}; ` +
                `child age 5: ${childOk ? "all 1, hitpoints 10" : `WRONG ${JSON.stringify(child.data.skillXp)}`}; elder age 70: ${es.trades.map(id => `${id} ${es.levels[id]}`).join(", ")} ${elderOk ? "" : "(record differs)"}; ` +
                `mining a trade for ${dwarfMining}/300 dwarves vs ${elfMining}/300 elves; fletching for ${elfFletch}/300 elves vs ${dwarfFletch}/300 dwarves`);

            // 3. xp_by_doing
            const P = mk("TEST_Skiller", { kind: "person", species: "human", stage: "adult" }, cx - 3, cy + 3);
            const snap = u => JSON.stringify(u.data.skillXp);
            const delta = (u, id, fn) => { const b = S.xp(u, id); fn(); return x1(S.xp(u, id) - b); };
            const fakeJob = (id, type, extra) => Object.assign({ id, type, target: { area: { x: area.x, y: area.y }, x: P.x, y: P.y }, params: {}, progress: 0, state: "done", result: { yields: {} } }, extra || {});
            const dChop = delta(P, "woodcutting", () => UF.Events.emit("jobs:done", fakeJob(900001, "chop", { progress: 240 }), P));
            const dCook = delta(P, "cooking", () => UF.Events.emit("jobs:done", fakeJob(900002, "craft", { progress: 90, params: { recipeId: "cook_meat" } }), P));
            const dBar = delta(P, "smithing", () => UF.Events.emit("jobs:done", fakeJob(900003, "craft", { progress: 10, params: { recipeId: "bar_iron" } }), P));
            let dMason = 0;
            const dBuild = delta(P, "building", () => { dMason = delta(P, "masonry", () => UF.Events.emit("jobs:done", fakeJob(900004, "build", { progress: 150, params: { objectId: "wall_stone" } }), P)); });
            const dKill = delta(P, "hunting", () => UF.Events.emit("jobs:kill", fakeJob(900005, "hunt", { progress: 120, params: { unitId: -1 } }), { id: -1, name: "TEST_prey", data: { species: "hare" }, area: { x: area.x, y: area.y }, x: P.x, y: P.y }, P));
            const dHuntDone = delta(P, "hunting", () => UF.Events.emit("jobs:done", fakeJob(900006, "hunt", { progress: 120 }), P));
            const before = snap(P);
            UF.Events.emit("jobs:done", fakeJob(900007, "drink", { progress: 60 }), P);
            const drinkSame = snap(P) === before;
            // A real job through UF_Jobs: a test job type mapped to woodcutting.
            J.define("test_skills_work", { verb: "Testing", plan: () => ({ ok: true, stand: null }), work: 60, apply: () => {} });
            S.mapJob("test_skills_work", "woodcutting");
            const wc0 = S.xp(P, "woodcutting");
            const real = J.create({ type: "test_skills_work", owner: P.id, target: { area: { x: area.x, y: area.y }, x: P.x, y: P.y } });
            await t.waitUntil(() => !real || real.state === "done" || real.state === "failed", 8000, "the test job to finish").catch(() => {});
            const dReal = x1(S.xp(P, "woodcutting") - wc0);
            const realWant = real ? S.jobXp("woodcutting", real) : NaN;
            t.check("xp_by_doing", dChop === 29 && dCook === 19 && dBar === 25 && dBuild === 20 && dMason === 10 && dKill === 28 && dHuntDone === 0 && drinkSame && !!real && real.state === "done" && dReal === realWant && dReal >= 11 && dReal <= 11.3,
                `jobs:done chop (work 240) woodcutting +${dChop} (want 29); craft cook_meat (90) cooking +${dCook} (want 19); craft bar_iron (10) smithing +${dBar} (want 25); build wall_stone (150) building +${dBuild} (want 20) and masonry +${dMason} (want 10); ` +
                `jobs:kill of a hunt (120) hunting +${dKill} (want 28); jobs:done of the hunt +${dHuntDone} (want 0: the kill gave it); a drink changed nothing: ${drinkSame}; ` +
                `a real UF_Jobs job (test_skills_work, work 60, mapped to woodcutting) ${real ? `${real.state}, progress ${real.progress.toFixed(2)}` : "NOT CREATED"}: woodcutting +${dReal} (want ${realWant}, 11-11.3)`);

            // 4. combat_xp
            const dummy = { id: -2, name: "TEST_dummy", data: { kind: "creature", species: "wolf" } };
            const hit = (style, attackType, damage, h) => UF.Events.emit("combat:hit", { attacker: P, target: dummy, damage, hit: h !== false, style, attackType });
            const d4 = ids => { const b = {}; for (const id of ids) b[id] = S.xp(P, id); return () => ids.map(id => x1(S.xp(P, id) - b[id])); };
            let m = d4(["strength", "hitpoints", "attack", "defence"]); hit("aggressive", "slash", 10);
            const [aggStr, aggHp, aggAtt, aggDef] = m();
            m = d4(["attack", "strength", "defence", "hitpoints"]); hit("controlled", "stab", 10);
            const ctrl = m();
            m = d4(["ranged", "defence", "hitpoints"]); hit("longrange", "ranged", 10);
            const lr = m();
            m = d4(["attack", "strength", "defence", "hitpoints"]); hit("accurate", "crush", 0, false);
            const miss = m();
            const wolfish = { id: -3, name: "TEST_wolf", data: { kind: "creature", species: "wolf" } };
            UF.Events.emit("combat:hit", { attacker: wolfish, target: P, damage: 5, hit: true, style: "aggressive", attackType: "slash" });
            t.check("combat_xp", aggStr === 40 && Math.abs(aggHp - 13.3) < 0.05 && aggAtt === 0 && aggDef === 0 && ctrl.slice(0, 3).every(v => Math.abs(v - 13.3) < 0.05) && Math.abs(ctrl[3] - 13.3) < 0.05 &&
                lr[0] === 20 && lr[1] === 20 && Math.abs(lr[2] - 13.3) < 0.05 && miss.every(v => v === 0) && wolfish.data.skillXp === undefined,
                `aggressive slash 10: strength +${aggStr} (want 40), hitpoints +${aggHp} (want 13.3), attack +${aggAtt}, defence +${aggDef} (want 0); controlled stab 10: attack/strength/defence/hitpoints +${ctrl.join("/")} (want 13.3 each); ` +
                `long-range shot 10: ranged +${lr[0]}, defence +${lr[1]} (want 20, 20), hitpoints +${lr[2]}; a miss: +${miss.join("/")} (want 0); a wolf attacker got a record: ${wolfish.data.skillXp !== undefined}`);

            // 5. level_up_line (a colonist on screen, at zoom 1)
            const col = W.unitsInArea(area.x, area.y).find(u => u.data && u.data.kind === "colonist" && W.eventOf(u.id)) || null;
            const saved = col ? { rec: JSON.stringify(col.data.skillXp || null), hp: col.data.hp } : null;
            let levelUp = null, lineOk = false, chronOk = false, hpOk = false, seen = null, res = null, lineText = "", ev0 = null;
            if (col) {
                if (UF.Camera) UF.Camera.setLevel(0);
                $gamePlayer.locate(col.x, col.y);
                await t.waitFrames(20);
                const heard = [];
                const onUp = (u, id, L) => heard.push({ u: u.id, id, L });
                UF.Events.on("skills:levelUp", onUp);
                S.setLevel(col, "woodcutting", 9);
                col.data.skillXp.woodcutting = S.xpForLevel(10) - 2;
                const events0 = UF.History && UF.History.current() ? UF.History.current().events.length : 0;
                res = S.add(col, "woodcutting", 5);
                const ln = S.lastLine();
                lineText = ln ? `${ln.text} via ${ln.via}` : "none";
                const ev = W.eventOf(col.id);
                ev0 = ev;
                const tm = SceneManager._scene && SceneManager._scene._spriteset ? SceneManager._scene._spriteset._tilemap : null;
                seen = !tm ? null : ln && ln.via === "bark" ? tm.children.find(ch => ch && ch.character === ev && ch.constructor && ch.constructor.name === "Sprite_UFBark")
                    : ln && ln.via === "line" ? tm.children.find(ch => ch instanceof Sprite_UFSkillLine && ch._ufSkillUnit === col.id && ch._ufText === ln.text && ch.visible && ch.opacity > 0) : null;
                const headOk = !!seen && (ln.via === "bark" || (Math.abs(seen.x - ev.screenX()) < 1 && seen.y < ev.screenY() - 40));
                lineOk = !!ln && ln.unitId === col.id && ln.text === String(cfg().speech.text || "I'm getting better at {skilllower}.").replace("{skilllower}", "woodcutting").replace("{skill}", "Woodcutting").replace("{level}", "10") && (ln.via === "speech" || headOk);
                const evs = UF.History && UF.History.current() ? UF.History.current().events : [];
                const last = evs.length > events0 ? evs[evs.length - 1] : null;
                chronOk = !!last && last.type === "skill_level" && last.text.includes(col.name) && last.text.includes("woodcutting level 10");
                levelUp = heard.find(h => h.u === col.id && h.id === "woodcutting" && h.L === 10) || null;
                UF.Events.off("skills:levelUp", onUp);
                await t.waitFrames(12);
                t.screenshot("level_up");
                if (chronOk) lineText += `; chronicle: "${last.text}"`;
                // hitpoints: one level up adds one hit point (after the shot, so its line doesn't cover the first).
                S.setLevel(col, "hitpoints", 12);
                col.data.skillXp.hitpoints = S.xpForLevel(13) - 1;
                col.data.hp = 12;
                S.add(col, "hitpoints", 2);
                hpOk = col.data.hp === 13 && S.level(col, "hitpoints") === 13;
            }
            t.check("level_up_line", !!col && !!res && res.levelsGained === 1 && res.level === 10 && !!levelUp && lineOk && chronOk && hpOk,
                `${col ? `colonist ${col.name} at (${col.x},${col.y}), zoom ${UF.Camera ? UF.Camera.zoom() : 1}` : "NO COLONIST ON SCREEN"}; add 5 xp at 2 below level 10: ${res ? `levelsGained ${res.levelsGained}, level ${res.level}` : "-"}; skills:levelUp heard: ${!!levelUp}; ` +
                `line ${lineText}${seen ? ` (sprite in the tilemap at (${Math.round(seen.x)},${Math.round(seen.y)}), the colonist's feet at (${ev0 ? Math.round(ev0.screenX()) : "?"},${ev0 ? Math.round(ev0.screenY()) : "?"}))` : ""}; chronicle line: ${chronOk}; hitpoints 12 -> 13 took hp 12 -> ${col ? col.data.hp : "-"} (want 13)`);
            if (col && saved) {
                col.data.skillXp = JSON.parse(saved.rec);
                if (saved.hp === undefined) delete col.data.hp; else col.data.hp = saved.hp;
            }

            // 6. rate
            S.setLevel(P, "woodcutting", 1);
            const r1 = S.rate(P, "chop");
            S.setLevel(P, "woodcutting", 99);
            const r99 = S.rate(P, "chop");
            S.setLevel(P, "cooking", 50);
            const rCook = S.rate(P, "craft", { type: "craft", params: { recipeId: "cook_meat" } });
            const rDrink = S.rate(P, "drink"), rWolf = S.rate({ id: -4, data: { kind: "creature", species: "wolf" } }, "chop");
            // Measured in UF_Jobs: a job that never finishes, at level 1 and at 99.
            J.define("test_skills_rate", { verb: "Testing", plan: () => ({ ok: true, stand: null }), work: 1e9, apply: () => {} });
            S.mapJob("test_skills_rate", "woodcutting");
            const measure = async L => {
                S.setLevel(P, "woodcutting", L);
                const job = J.create({ type: "test_skills_rate", owner: P.id, target: { area: { x: area.x, y: area.y }, x: P.x, y: P.y } });
                await t.waitUntil(() => job.state === "work" && job.progress > 0, 3000, "work to start").catch(() => {});
                const p0 = job.progress, k0 = UF.Time.ticks();
                await t.waitFrames(30);
                const perTick = (job.progress - p0) / Math.max(1, UF.Time.ticks() - k0);
                J.cancel(job.id, "test over");
                return perTick;
            };
            const m1 = await measure(1), m99 = await measure(99);
            const ratio = m99 / (m1 || 1);
            const hook = Math.abs(ratio - 1.98) < 0.03 ? "present" : Math.abs(ratio - 1) < 0.02 ? "absent" : "unexpected";
            t.check("rate", r1 === 1 && Math.abs(r99 - 1.98) < 1e-9 && Math.abs(rCook - 1.49) < 1e-9 && rDrink === 1 && rWolf === 1 && hook !== "unexpected",
                `rate(chop) ${r1} at woodcutting 1 (want 1), ${r99.toFixed(4)} at 99 (want 1.98); craft cook_meat at cooking 50: ${rCook.toFixed(2)} (want 1.49); drink ${rDrink}, a wolf chopping ${rWolf} (want 1, 1); ` +
                `measured in UF_Jobs: ${m1.toFixed(3)} per tick at level 1, ${m99.toFixed(3)} at 99, ratio ${ratio.toFixed(3)}: the UF_Jobs rateOf hook is ${hook}`);

            // 6b. quality_and_meets
            const qualities = L => {
                S.setLevel(P, "smithing", L);
                const out = [];
                for (let k = 0; k < 200; k++) out.push(S.qualityRoll(P, "smithing"));
                return out;
            };
            const rolls0 = W.state.skills.rolls;
            const q1 = qualities(1), q50 = qualities(50), q99 = qualities(99);
            const qRecipe = S.qualityRoll(P, "sword_short");
            const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
            const qRange = a => `${Math.min(...a)}-${Math.max(...a)} (mean ${mean(a).toFixed(2)})`;
            S.setLevel(P, "smithing", 29);
            const m29 = [S.meets(P, { skill: "smithing", level: 30 }), S.meets(P, { id: "sword_short", minLevel: 30 }), S.meets(P, { smithing: 29, woodcutting: 1 }), S.meets(P, null)];
            S.setLevel(P, "smithing", 30);
            const m30 = [S.meets(P, { skill: "smithing", level: 30 }), S.meets(P, { id: "sword_short", minLevel: 30 }), S.meets(P, { minLevel: { smithing: 31 } })];
            t.check("quality_and_meets", Math.max(...q1) <= 2 && Math.min(...q99) >= 3 && Math.max(...q99) <= 5 && mean(q1) < mean(q50) && mean(q50) < mean(q99) && qRecipe >= 3 &&
                W.state.skills.rolls === rolls0 + 601 && m29.join() === "false,false,true,true" && m30.join() === "true,true,false",
                `qualityRoll at smithing 1: ${qRange(q1)} (want 0-2); 50: ${qRange(q50)}; 99: ${qRange(q99)} (want 3-5); recipe sword_short at 99: ${qRecipe}; roll counter +${W.state.skills.rolls - rolls0} (want 601); ` +
                `meets at smithing 29: ${m29.join(", ")} (want false, false, true, true); at 30: ${m30.join(", ")} (want true, true, false)`);

            // 7. extra_yield: 200 chops at 99, 200 at 1 (seeded by the job ids), on a cell with no items.
            let yc = null;
            for (let r = 2; r < 12 && !yc; r++) for (let dx = -r; dx <= r && !yc; dx++) {
                const x = cx + dx, y = cy - r;
                if (I.atIn(area, x, y).length === 0) yc = { x, y };
            }
            yc = yc || { x: cx, y: cy - 2 };
            const logs = () => I.count({ area, x: yc.x, y: yc.y }, "log");
            const runChops = (L, base) => {
                const b = logs();
                for (let k = 0; k < 200; k++) {
                    S.setLevel(P, "woodcutting", L);
                    UF.Events.emit("jobs:done", { id: base + k, type: "chop", target: { area: { x: area.x, y: area.y }, x: yc.x, y: yc.y }, params: {}, progress: 240, state: "done", result: { yields: { log: 3 } } }, P);
                }
                return logs() - b;
            };
            const e99 = runChops(99, 700000), e1 = runChops(1, 710000);
            const again = (() => { let n = 0; for (let k = 0; k < 200; k++) if (u01(seedOf(), SALT.yield, P.id, 700000 + k) < 99 * cfg().extraYield.chancePerLevel) n++; return n; })();
            for (const it of I.atIn(area, yc.x, yc.y)) if (it.type === "log") I.consume(it.id, it.count);
            t.check("extra_yield", e99 >= 70 && e99 <= 130 && e1 <= 5 && again === e99,
                `200 chops at woodcutting 99: ${e99} extra logs (want about 99, 70-130); 200 at level 1: ${e1} (want about 1, <= 5); the same 200 rolls recomputed: ${again} (want ${e99}); cell (${yc.x},${yc.y})`);

            // 8. combat_level
            const cases = [
                [{ attack: 60, strength: 70, defence: 50, hitpoints: 65, ranged: 40, magic: 1 }, 71],
                [{ attack: 1, strength: 1, defence: 1, hitpoints: 10, ranged: 1, magic: 1 }, 3],
                [{ attack: 99, strength: 99, defence: 99, hitpoints: 99, ranged: 99, magic: 99 }, 113],
                [{ attack: 1, strength: 1, defence: 1, hitpoints: 10, ranged: 99, magic: 1 }, 50]
            ];
            const outs = cases.map(([L]) => S.combatLevelFrom(L));
            const pLevels = {}; for (const id of combatIds) pLevels[id] = lv(P, id);
            t.check("combat_level", cases.every(([, w], i) => outs[i] === w) && S.combatLevel(P) === S.combatLevelFrom(pLevels),
                `${cases.map(([L, w], i) => `${JSON.stringify(L)} -> ${outs[i]} (want ${w})`).join("; ")}; TEST_Skiller ${JSON.stringify(pLevels)} -> ${S.combatLevel(P)}`);

            // 9. old_record_converted: a save made before skills (units with data.skills, no skillXp), migrated as a load does.
            const copy = JsonEx.parse(JsonEx.stringify(W.state));
            const oldRec = { woodcutting: 10, gathering: 4, stonework: 20, fighting: 8, archery: 3, cooking: 0 };
            const stats = { str: 12, dex: 9, con: 14, int: 10, wis: 11, cha: 8 };
            copy.units[987654] = { id: 987654, name: "TEST_OldSave", image: {}, area: { x: area.x, y: area.y }, x: 0, y: 0, dir: 2, data: { kind: "colonist", species: "human", stage: "adult", skills: Object.assign({}, oldRec), stats: Object.assign({}, stats) } };
            const others = Object.keys(copy.units).filter(id => id !== "987654").map(id => [id, JSON.stringify(copy.units[id].data.skillXp || null)]);
            const migrated = S.migrateState(copy);
            const ou = copy.units[987654];
            const roll = S.startLevels(ou, copy.seed).levels;
            const expect = { woodcutting: 50, foraging: 21, mining: 99, attack: 40, strength: 40, defence: 40, ranged: 16, cooking: 1 };
            const wrong = Object.keys(expect).filter(id => lv(ou, id) !== Math.max(expect[id], roll[id]));
            const othersSame = others.every(([id, s]) => JSON.stringify(copy.units[id].data.skillXp || null) === s);
            t.check("old_record_converted", migrated === 1 && !!ou.data.skillXp && wrong.length === 0 && ou.data.skillsFrom === "rolled+old" && JSON.stringify(ou.data.stats) === JSON.stringify(stats) && JSON.stringify(ou.data.skills) === JSON.stringify(oldRec) && othersSame,
                `old record ${JSON.stringify(oldRec)} -> ${Object.keys(expect).map(id => `${id} ${lv(ou, id)}`).join(", ")} (want each max(converted ${Object.keys(expect).map(id => expect[id]).join("/")}, rolled)); wrong: ${wrong.join(", ") || "none"}; ` +
                `migrated ${migrated} unit(s) (want 1; units that had a record unchanged: ${othersSame}); skillsFrom ${ou.data.skillsFrom}; data.stats untouched: ${JSON.stringify(ou.data.stats) === JSON.stringify(stats)}; old record kept: ${JSON.stringify(ou.data.skills) === JSON.stringify(oldRec)}`);

            // 10. death_chronicle
            const H = UF.History;
            const lines = name => (H && H.current() ? H.current().events.filter(e => e.type === "death_skilled" && e.text.includes(name)) : []);
            const D1 = mk("TEST_Mourned", { kind: "person", species: "human", stage: "adult" }, cx - 4, cy + 4);
            S.setLevel(D1, "smithing", 70); S.setLevel(D1, "woodcutting", 60); S.setLevel(D1, "mining", 45);
            UF.Events.emit("combat:kill", { attacker: null, target: D1 });
            D1.data.hp = 0;
            W.removeUnit(D1.id);
            const D2 = mk("TEST_Fallen", { kind: "person", species: "human", stage: "adult" }, cx - 5, cy + 4);
            S.setLevel(D2, "fletching", 66); S.setLevel(D2, "hunting", 52); S.setLevel(D2, "ranged", 40);
            D2.data.hp = 0;
            W.removeUnit(D2.id);
            const D3 = mk("TEST_Small", { kind: "person", species: "human", age: 4 }, cx - 6, cy + 4);
            UF.Events.emit("combat:kill", { attacker: null, target: D3 });
            W.removeUnit(D3.id);
            const D4 = mk("TEST_Leaving", { kind: "person", species: "human", stage: "adult" }, cx - 7, cy + 4);
            S.setLevel(D4, "cooking", 80);
            const d4Total = S.total(D4);
            W.removeUnit(D4.id);
            const l1 = lines("TEST_Mourned"), l2 = lines("TEST_Fallen"), l3 = lines("TEST_Small"), l4 = lines("TEST_Leaving");
            const order = l1[0] ? ["smithing 70", "woodcutting 60", "mining 45"].map(s => l1[0].text.indexOf(s)) : [];
            t.check("death_chronicle", !!H && l1.length === 1 && order.length === 3 && order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])) && l2.length === 1 && l2[0].text.includes("fletching 66") && l3.length === 0 && l4.length === 0,
                `combat:kill then removal of TEST_Mourned: ${l1.length} line(s) (want 1)${l1[0] ? `: "${l1[0].text}"` : ""}; hp 0 removal of TEST_Fallen (${window.UF.Anim ? "UF_Anim's anim:death" : "world:unitRemoved"}): ${l2.length} (want 1)${l2[0] ? `: "${l2[0].text}"` : ""}; ` +
                `a child (total ${cfg().list.length + 9}) killed: ${l3.length} (want 0); a skilled person (total ${d4Total}) removed alive: ${l4.length} (want 0); threshold total > ${cfg().chronicle.deathMinTotal}`);

            // 11. saved
            const copy2 = JsonEx.parse(JsonEx.stringify(W.state));
            const contents = DataManager.makeSaveContents();
            const ids = [P.id].concat(col ? [col.id] : []);
            const keptAll = ids.every(id => copy2.units[id] && JSON.stringify(copy2.units[id].data.skillXp) === JSON.stringify(W.unit(id).data.skillXp));
            const inSave = ids.every(id => contents.ufWorld && contents.ufWorld.units[id] && contents.ufWorld.units[id].data.skillXp === W.unit(id).data.skillXp);
            t.check("saved", keptAll && inSave && !!copy2.skills && copy2.skills.rolls === W.state.skills.rolls,
                `JsonEx round-trip keeps skillXp of ${ids.length} unit(s): ${keptAll}; makeSaveContents().ufWorld holds the live records: ${inSave}; state.skills ${JSON.stringify(copy2.skills)}`);

            // 12. perf: events through the bus, and rate() as UF_Jobs calls it every tick.
            S.setLevel(P, "woodcutting", 50); S.setLevel(P, "strength", 50); S.setLevel(P, "hitpoints", 50);
            const N = 2000;
            let t0 = performance.now();
            for (let k = 0; k < N; k++) UF.Events.emit("jobs:done", { id: 600000 + k, type: "chop", target: { area: { x: area.x, y: area.y }, x: yc.x, y: yc.y }, params: {}, progress: 240, state: "done", result: { yields: {} } }, P);
            const msDone = (performance.now() - t0) / N;
            t0 = performance.now();
            for (let k = 0; k < N; k++) UF.Events.emit("combat:hit", { attacker: P, target: dummy, damage: 7, hit: true, style: "aggressive", attackType: "slash" });
            const msHit = (performance.now() - t0) / N;
            const rj = { type: "craft", params: { recipeId: "cook_meat" } };
            t0 = performance.now();
            let acc = 0;
            for (let k = 0; k < 20000; k++) acc += S.rate(P, "chop") + S.rate(P, "craft", rj);
            const msRate = (performance.now() - t0) / 40000;
            t.check("perf", msDone <= 0.1 && msHit <= 0.1 && msRate <= 0.01 && acc > 0,
                `jobs:done ${msDone.toFixed(4)} ms per event, combat:hit ${msHit.toFixed(4)} ms per event (budget 0.1; ${N} each through UF.Events, level-ups included: woodcutting now ${lv(P, "woodcutting")}, strength ${lv(P, "strength")}); rate() ${(msRate * 1000).toFixed(2)} us per call (budget 10 us)`);

            // Clean up.
            S.mapJob("test_skills_work", null);
            S.mapJob("test_skills_rate", null);
            for (const id of made) if (W.unit(id)) W.removeUnit(id);
            if (UF.Camera) UF.Camera.setLevel(1);

            // 13. no_errors
            const newErrors = t.errorsSoFar().slice(errors0);
            const newInner = errorCount - inner0;
            t.check("no_errors", newErrors.length === 0 && newInner === 0,
                `${newErrors.length} uncaught error(s)${newErrors.length ? `, first: ${newErrors[0]}` : ""}; ${newInner} caught inside UF_Skills${newInner ? `, last: ${errors[errors.length - 1]}` : ""}`);
        });
    }
})();
