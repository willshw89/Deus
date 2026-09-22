//=============================================================================
// DEUS_Combat.js - Real-time combat on the map in ticks (VISION V64)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Combat] Real-time tick-based combat: SRD 5.1 attack/defense rolls, hit resolution, damage splats, and health bars.
 * @author UF project
 * @base DEUS_World
 * @orderAfter DEUS_Items
 * @orderAfter DEUS_Wildlife
 * @orderAfter DEUS_Stance
 *
 * @help
 * Combat follows a classic tick-based model with the project's own numbers and words
 * (VISION V64, user 2026-09-19; the d20 rules of V47 are retired). Data:
 * game/data/UF_WorldCatalog.json (combat, items.types weapon / armor /
 * shield / ammo blocks, wildlife.species[].combat). Doc:
 * docs/systems/UF_Combat.md.
 *
 *   - A tick is catalog combat.tickFrames map updates (36 = 0.6 s at x1;
 *     the speed keys play more map updates, so ticks speed up with them).
 *   - Per attack: an accuracy roll 0..A against a defence roll 0..D (both
 *     seeded); A and D come from the effective levels (level + style bonus
 *     + 8) and the equipment bonuses (+64). A hit deals a seeded 0..max hit.
 *   - Weapons have an attack speed in ticks, attack types (stab, slash,
 *     crush, ranged, magic) and the styles they offer (accurate,
 *     aggressive, defensive, controlled, rapid, longrange). Bows use up
 *     one arrow per shot.
 *   - Units fight by attack mode (nearest, weakest, strongest, protect,
 *     defend, flee, manual) in unit.data.combat.mode; a unit attacked with
 *     no target hits back. Hostile units seek out friendly ones.
 *   - Hitsplats (red with the damage, blue 0 for a miss) and a health bar
 *     over units in combat. No code-made motion: attack, hurt and death
 *     frames come from the sprite sheets (UF_Anim).
 *   - Events: combat:hit { attacker, target, damage, hit, style,
 *     attackType } after every attack; combat:kill { attacker, target }.
 *
 * Debug key: K spawns two hostile wolves near the view centre, only while
 * UF.Test.active, or after UF.Combat.debug = true (F8 console), or when the
 * game is launched with --uf-debug.
 *
 * Replaced core methods: none, aliases only (Game_Map.update,
 * Scene_Map.update, Spriteset_Map.createCharacters, Scene_Boot.start).
 */

(() => {
    "use strict";

    const TYPES = ["stab", "slash", "crush", "ranged", "magic"];
    const SKILLS = ["attack", "strength", "defence", "ranged", "magic", "hitpoints"];
    const STYLES = ["accurate", "aggressive", "defensive", "controlled", "rapid", "longrange"];
    const MODES = ["nearest", "weakest", "strongest", "protect", "defend", "flee", "manual"];
    const SEEKING = new Set(["nearest", "weakest", "strongest", "protect"]);
    const SLOTS = [
        "head", "eyes", "neck", "shoulders",
        "armor", "torso", "waist", "arms",
        "hands", "ring1", "ring2", "feet",
        "mainHand", "offHand"
    ];
    const N4 = [[0, 1], [0, -1], [-1, 0], [1, 0]];
    const SALT = { attack: 0xc0b7a1, spawn: 0xc0b7a2, pick: 0xc0b7a3, duel: 0xc0b7a5 };
    const FX_Z = 900000;            // over every unit (z = foot row), under the fog (1 000 000)
    const IN_COMBAT_TICKS = 10;     // 6 s at x1 after the last attack made or taken
    const SPLAT_OFFSETS = [[0, 0], [0, -15], [-13, 9], [13, 9]];

    const DEFAULTS = {
        tickFrames: 36,
        levelOffset: 8,
        styles: {
            accurate: { accuracy: 3 }, aggressive: { strength: 3 }, defensive: { defence: 3 },
            controlled: { accuracy: 1, strength: 1, defence: 1 }, rapid: { speed: -1 }, longrange: { defence: 3, range: 2 }
        },
        magicDefence: { magic: 0.7, defence: 0.3 },
        creatureStyle: "controlled",
        unarmed: { speed: 4, types: ["crush"], styles: ["accurate", "aggressive", "defensive"], reach: 1 },
        people: { attack: 1, strength: 1, defence: 1, ranged: 1, magic: 1, hitpoints: 10 },
        defaultModes: { hostile: "nearest", fleeing: "flee", other: "defend" },
        aggroRadius: 8,
        leash: 16,
        fleeRadius: 5,
        aidRadius: 10,
        regen: { hp: 1, everyTicks: 100 },
        display: { splatMs: 1000, maxSplats: 4, barHideMs: 6000, barWidth: 30 },
        aliases: {
            weapon: "mainHand",
            tool: "mainHand",
            shield: "offHand",
            legs: "feet",
            clothes: "torso",
            body: "armor"
        },
        quality: { bonus: [0.8, 0.9, 1, 1.1, 1.2, 1.3] }
    };

    const World = () => (window.UF && UF.World) || null;
    const Items = () => (window.UF && UF.Items) || null;
    const catalog = () => window.$ufWorldCatalog || null;
    const num = v => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    const pos = (v, fallback) => (typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.floor(v) : fallback);
    const Space = () => (window.UF && UF.Space) || null;
    const cheb = (a, b) => (Space() ? Space().chebyshev(a, b) : Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)));
    const manhattan = (a, b) => (Space() ? Space().manhattan(a, b) : Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
    const zOf = o => (Space() ? Space().zOf(o) : (o && o.z !== undefined ? o.z : o && o.area && o.area.z !== undefined ? o.area.z : 0));
    const levelArea = u => ({ x: u.area.x, y: u.area.y, z: zOf(u) });
    const viewArea = w => typeof w.viewLevel === "function" ? w.viewLevel() : w.currentArea();
    const sameArea = (a, b) => (Space() ? Space().sameArea(a, b) : (!!a && !!b && !!a.area && !!b.area && a.area.x === b.area.x && a.area.y === b.area.y && zOf(a) === zOf(b)));
    const nowMs = () => performance.now();

    const Combat = {
        enabled: true,
        debug: false,
        useRules: true,
        /** Tests only: a Set of unit ids; while set, the combat loop looks at those units and no others. */
        testFilter: null,
        stats: { attacks: 0, hits: 0, kills: 0, ticks: 0 },
        perf: { updates: 0, simMs: 0, simWorst: 0, drawUpdates: 0, drawMs: 0, drawWorst: 0 },
        errors: [],
        TYPES, SKILLS, STYLES, MODES, SLOTS
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Combat = Combat;

    function report(where, e) {
        Combat.errors.push(`${where}: ${(e && e.message) || e}`);
        if (Combat.errors.length > 20) Combat.errors.shift();
        console.error("[UF_Combat]", where, e);
    }
    const emit = (name, payload) => {
        if (window.UF && UF.Events && typeof UF.Events.emit === "function") UF.Events.emit(name, payload);
    };

    //-------------------------------------------------------------------------
    // Configuration (catalog "combat" over the defaults above)

    let cfgCache = null, cfgSource;
    function cfg() {
        const c = catalog();
        const src = (c && c.combat) || null;
        if (cfgCache && cfgSource === src) return cfgCache;
        const m = Object.assign({}, DEFAULTS, src || {});
        for (const k of ["styles", "magicDefence", "unarmed", "people", "defaultModes", "regen", "display", "aliases", "quality"]) {
            m[k] = Object.assign({}, DEFAULTS[k], (src && src[k] && typeof src[k] === "object") ? src[k] : {});
        }
        m.tickFrames = pos(m.tickFrames, 36);
        m.levelOffset = Number.isFinite(m.levelOffset) ? m.levelOffset : 8;
        cfgCache = m;
        cfgSource = src;
        return m;
    }
    Combat.config = cfg;

    let spSrc, spTable = new Map();
    function speciesById(id) {
        const c = catalog();
        const list = (c && c.wildlife && Array.isArray(c.wildlife.species)) ? c.wildlife.species : null;
        if (list !== spSrc) {
            spSrc = list;
            spTable = new Map((list || []).map(s => [s.id, s]));
        }
        return spTable.get(id) || null;
    }
    const speciesOf = unit => (unit && unit.data && unit.data.species ? speciesById(unit.data.species) : null);
    function creatureBlock(unit) {
        const s = speciesOf(unit);
        return s && s.combat && typeof s.combat === "object" ? s.combat : null;
    }
    function itemType(id) {
        if (id === null || id === undefined) return null;
        const I = Items();
        if (I && typeof I.type === "function") return I.type(id);
        const c = catalog();
        const types = c && c.items && c.items.types;
        if (!types) return null;
        if (Array.isArray(types)) return types.find(t => t && t.id === id) || null;
        if (typeof types === "object") return types[id] || null;
        return null;
    }

    //-------------------------------------------------------------------------
    // State: UF.World.state.combat (saved) and unit.data.combat / data.hp (saved)

    const fallbackState = { updates: 0, tick: 0, seq: 0, spawns: 0 };
    function cstate() {
        const w = World();
        if (!w || !w.state) return fallbackState;
        let s = w.state.combat;
        if (!s || typeof s !== "object") s = w.state.combat = { updates: 0, tick: 0, seq: 0, spawns: 0 };
        return s;
    }
    Combat.state = cstate;
    Combat.tick = () => cstate().tick;
    Combat.updates = () => cstate().updates;

    function cd(unit) {
        const d = unit.data || (unit.data = {});
        let c = d.combat;
        if (!c || typeof c !== "object") c = d.combat = {};
        if (c.targetId === undefined) c.targetId = null;
        if (!Number.isFinite(c.nextAttackTick)) c.nextAttackTick = 0;
        if (!Number.isFinite(c.lastTick)) c.lastTick = -1000;
        return c;
    }
    const isDead = u => !u || !u.data || u.data._isDying === true || u.data.dead === true || (typeof u.data.hp === "number" && u.data.hp <= 0);

    //-------------------------------------------------------------------------
    // Levels and hitpoints

    /**
     * A combat level: a creature's catalog block; else UF.Skills.level(unit, skill) when UF_Skills exists; else
     * unit.data.combatLevels; else the catalog's people defaults (hitpoints 10); else 1.
     */
    function level(unit, skill) {
        const block = creatureBlock(unit);
        if (block) return pos(block[skill], 1);
        const S = window.UF && UF.Skills;
        if (S && typeof S.level === "function") {
            let v;
            try {
                v = S.level(unit, skill);
            } catch (e) {
                report("UF.Skills.level", e);
            }
            if (typeof v === "number" && Number.isFinite(v) && v >= 1) return Math.floor(v);
        }
        const cl = unit && unit.data && unit.data.combatLevels;
        if (cl && typeof cl[skill] === "number" && cl[skill] >= 1) return Math.floor(cl[skill]);
        return pos(cfg().people[skill], 1);
    }
    function maxHp(unit) {
        const block = creatureBlock(unit);
        return Math.max(1, block ? pos(block.hitpoints, 1) : level(unit, "hitpoints"));
    }
    function ensureHp(unit) {
        const d = unit.data || (unit.data = {});
        const m = maxHp(unit);
        d.maxHp = m;
        if (typeof d.hp !== "number" || !Number.isFinite(d.hp)) d.hp = m;
        return d.hp;
    }
    function combatLevel(unit) {
        const L = s => level(unit, s);
        const base = 0.25 * (L("defence") + L("hitpoints"));
        const melee = 0.325 * (L("attack") + L("strength"));
        const range = 0.325 * Math.floor(1.5 * L("ranged"));
        const mage = 0.325 * Math.floor(1.5 * L("magic"));
        return Math.floor(base + Math.max(melee, range, mage));
    }
    Combat.level = level;
    Combat.maxHp = maxHp;
    Combat.hp = unit => (unit ? ensureHp(unit) : 0);
    Combat.combatLevel = combatLevel;

    //-------------------------------------------------------------------------
    // Equipment and bonuses

    /** The item in a slot: { type, record } (record null for a type id written straight into the slot), or null. */
    function slotItem(unit, slot) {
        const eq = unit && unit.data && unit.data.equipment;
        if (!eq || typeof eq !== "object") return null;
        let v = eq[slot];
        if (v === null || v === undefined || v === "") {
            const al = cfg().aliases;
            if (al) {
                for (const k of Object.keys(al)) {
                    if (al[k] === slot && eq[k] !== null && eq[k] !== undefined && eq[k] !== "") {
                        v = eq[k];
                        break;
                    }
                }
                if ((v === null || v === undefined || v === "") && al[slot] && eq[al[slot]] !== null && eq[al[slot]] !== undefined && eq[al[slot]] !== "") {
                    v = eq[al[slot]];
                }
            }
        }
        return resolveItem(unit, v);
    }
    function resolveItem(unit, v) {
        if (v === null || v === undefined || v === "") return null;
        const I = Items();
        if (typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v))) {
            const rec = I && typeof I.get === "function" ? I.get(Number(v)) : null;
            if (!rec || rec.holder !== unit.id) return null; // dropped or given away: not held any more
            const type = itemType(rec.type);
            return type ? { type, record: rec } : null;
        }
        if (typeof v === "string") {
            const type = itemType(v);
            return type ? { type, record: null } : null;
        }
        return null;
    }
    const zeroBonuses = () => ({
        attack: { stab: 0, slash: 0, crush: 0, ranged: 0, magic: 0 },
        defence: { stab: 0, slash: 0, crush: 0, ranged: 0, magic: 0 },
        strength: 0, rangedStrength: 0, magicStrength: 0
    });
    function addBonuses(sum, b, mult) {
        if (!b || typeof b !== "object") return;
        const m = typeof mult === "number" ? mult : 1;
        for (const t of TYPES) {
            if (b.attack) sum.attack[t] += num(b.attack[t]) * m;
            if (b.defence) sum.defence[t] += num(b.defence[t]) * m;
        }
        sum.strength += num(b.strength) * m;
        sum.rangedStrength += num(b.rangedStrength) * m;
        sum.magicStrength += num(b.magicStrength) * m;
    }
    function qualityMult(record) {
        const q = record && record.quality;
        const arr = cfg().quality.bonus;
        return Number.isInteger(q) && Array.isArray(arr) && typeof arr[q] === "number" ? arr[q] : 1;
    }
    // While the loop runs a tick, each unit's side, weapon profile and bonuses are worked out once (equipment does not
    // change inside a tick; everything outside the loop reads them fresh).
    let tickCache = null;
    function cached(unit) {
        if (!tickCache || !unit || unit.id === undefined) return null;
        let e = tickCache.get(unit.id);
        if (!e) {
            e = { side: undefined, prof: null, bon: null };
            tickCache.set(unit.id, e);
        }
        return e;
    }
    /** Sum of the bonuses of everything worn and held, plus a creature's own. */
    function bonusesOf(unit) {
        const e = cached(unit);
        if (e && e.bon) return e.bon;
        const s = computeBonuses(unit);
        if (e) e.bon = s;
        return s;
    }
    function computeBonuses(unit) {
        const s = zeroBonuses();
        const block = creatureBlock(unit);
        if (block) addBonuses(s, block.bonuses, 1);
        for (const slot of SLOTS) {
            const it = slotItem(unit, slot);
            if (!it) continue;
            const t = it.type;
            const blk = (slot === "weapon" || slot === "mainHand") ? (t.weapon || t.bonuses)
                      : (slot === "shield" || slot === "offHand") ? (t.shield || t.armor || t.bonuses)
                      : (t.armor || t.bonuses || (t.gear && t.gear.bonuses));
            if (blk && typeof blk === "object") {
                const b = blk.bonuses || blk;
                if (b && typeof b === "object") addBonuses(s, b, qualityMult(it.record));
            }
        }
        for (const t of TYPES) {
            s.attack[t] = Math.round(s.attack[t]);
            s.defence[t] = Math.round(s.defence[t]);
        }
        s.strength = Math.round(s.strength);
        s.rangedStrength = Math.round(s.rangedStrength);
        s.magicStrength = Math.round(s.magicStrength);
        return s;
    }
    Combat.bonusesOf = bonusesOf;

    const validTypes = list => (Array.isArray(list) ? list.filter(t => TYPES.includes(t)) : []);
    const validStyles = list => (Array.isArray(list) ? list.filter(s => STYLES.includes(s)) : []);
    function unarmedProfile() {
        const u = cfg().unarmed;
        const types = validTypes(u.types), styles = validStyles(u.styles);
        return { name: "fists", itemType: null, record: null, speed: pos(u.speed, 4), types: types.length ? types : ["crush"],
            styles: styles.length ? styles : ["accurate", "aggressive", "defensive"], reach: pos(u.reach, 1), ranged: null, ammo: null, unarmed: true };
    }
    function ammoOf(unit, ammoTypeId, rangedBlock) {
        const I = Items();
        if (!I || typeof I.inventoryOf !== "function") return null;
        const stack = I.inventoryOf(unit.id).find(r => r && r.type === ammoTypeId && r.count > 0);
        if (!stack) return null;
        const t = itemType(ammoTypeId);
        const a = t && t.ammo && typeof t.ammo === "object" ? t.ammo : null;
        let rs = num(rangedBlock.ammoStrength);
        if (a) {
            rs = num(a.rangedStrength);
            if (stack.material && a.byMaterial && typeof a.byMaterial[stack.material] === "number") rs = a.byMaterial[stack.material];
        }
        return { type: ammoTypeId, record: stack, count: I.count(unit.id, ammoTypeId), rangedStrength: Math.round(rs * qualityMult(stack)) };
    }
    /** How a unit attacks right now: its natural weapon (creatures), its held weapon, or its fists (also when out of ammunition). */
    function weaponOf(unit) {
        const e = cached(unit);
        if (e && e.prof) return e.prof;
        const p = computeWeapon(unit);
        if (e) e.prof = p;
        return p;
    }
    function computeWeapon(unit) {
        const block = creatureBlock(unit);
        if (block) {
            const type = TYPES.includes(block.attackType) ? block.attackType : "crush";
            const style = STYLES.includes(block.style) ? block.style : (STYLES.includes(cfg().creatureStyle) ? cfg().creatureStyle : "controlled");
            const far = type === "ranged" || type === "magic";
            return { name: "natural", itemType: null, record: null, speed: pos(block.attackSpeed, 4), types: [type], styles: [style], reach: 1,
                ranged: far ? { range: pos(block.range, 5), ammo: null } : null, ammo: null, natural: true };
        }
        const it = slotItem(unit, "mainHand") || slotItem(unit, "weapon");
        const w = it && it.type.weapon;
        if (w && typeof w === "object") {
            const ranged = w.ranged && typeof w.ranged === "object" && typeof w.ranged.ammo === "string" && w.ranged.ammo ? w.ranged : null;
            let types = validTypes(w.types);
            if (ranged) types = ["ranged"];
            let styles = validStyles(w.styles);
            if (!styles.length) styles = ranged ? ["accurate", "rapid", "longrange"] : ["accurate", "aggressive", "defensive"];
            const prof = { name: it.type.name, itemType: it.type.id, record: it.record, speed: pos(w.speed, 4), types: types.length ? types : ["crush"],
                styles, reach: pos(w.reach, 1), ranged: ranged ? { range: pos(ranged.range, 5), ammo: ranged.ammo } : null, ammo: null };
            if (prof.ranged) {
                prof.ammo = ammoOf(unit, ranged.ammo, ranged);
                if (!prof.ammo) return Object.assign(unarmedProfile(), { outOfAmmo: ranged.ammo, held: it.type.id });
            }
            return prof;
        }
        return unarmedProfile();
    }
    Combat.weaponOf = weaponOf;

    function styleOf(unit, prof) {
        const want = unit && unit.data && unit.data.combat ? unit.data.combat.style : null;
        if (want && prof.styles.includes(want)) return want;
        if (prof.natural) return prof.styles[0];
        if (prof.ranged) return prof.styles.includes("rapid") ? "rapid" : prof.styles[0];
        return prof.styles.includes("accurate") ? "accurate" : prof.styles[0];
    }
    function attackTypeOf(unit, prof) {
        const want = unit && unit.data && unit.data.combat ? unit.data.combat.attackType : null;
        return want && prof.types.includes(want) ? want : prof.types[0];
    }
    function styleBonus(style) {
        const s = cfg().styles[style] || {};
        return { accuracy: num(s.accuracy), strength: num(s.strength), defence: num(s.defence), speed: num(s.speed), range: num(s.range) };
    }

    //-------------------------------------------------------------------------
    // The formulas

    const hitChance = (A, D) => (A > D ? 1 - (D + 2) / (2 * (A + 1)) : A / (2 * (D + 1)));
    const maxHitFor = (effective, bonus) => Math.max(0, Math.floor(0.5 + effective * (bonus + 64) / 640));
    const accuracySkill = type => (type === "ranged" ? "ranged" : type === "magic" ? "magic" : "attack");
    Combat.hitChance = hitChance;
    Combat.maxHitFor = maxHitFor;

    function attackRollOf(attacker, style, type, bon) {
        const eff = level(attacker, accuracySkill(type)) + styleBonus(style).accuracy + cfg().levelOffset;
        return Math.max(0, eff * (bon.attack[type] + 64));
    }
    /** The max defence roll of a unit against an attack type, in its current style and gear. */
    function defenceRoll(defender, type) {
        if (!defender || !defender.data) return 0;
        const t = TYPES.includes(type) ? type : "slash";
        const prof = weaponOf(defender);
        const sb = styleBonus(styleOf(defender, prof)).defence;
        const off = cfg().levelOffset;
        let eff;
        if (t === "magic" && !creatureBlock(defender)) {
            const md = cfg().magicDefence;
            eff = Math.floor(num(md.magic) * level(defender, "magic")) + Math.floor(num(md.defence) * (level(defender, "defence") + sb)) + off;
        } else if (t === "magic") {
            eff = level(defender, "magic") + sb + off;
        } else {
            eff = level(defender, "defence") + sb + off;
        }
        return Math.max(0, eff * (bonusesOf(defender).defence[t] + 64));
    }
    function maxHitOf(attacker, prof, style, type, bon) {
        const sb = styleBonus(style);
        let lvl, add, bonus;
        if (type === "ranged") {
            lvl = level(attacker, "ranged");
            add = sb.accuracy;
            bonus = bon.rangedStrength + (prof.ammo ? prof.ammo.rangedStrength : 0);
        } else if (type === "magic") {
            lvl = level(attacker, "magic");
            add = sb.accuracy;
            bonus = bon.magicStrength;
        } else {
            lvl = level(attacker, "strength");
            add = sb.strength;
            bonus = bon.strength;
        }
        const block = creatureBlock(attacker);
        return Math.max(0, maxHitFor(lvl + add + cfg().levelOffset, bonus) + (block ? Math.round(num(block.maxHitBonus)) : 0));
    }
    /** Every number of one attack from attacker on target, without rolling. */
    function numbers(attacker, target) {
        const prof = weaponOf(attacker);
        const style = styleOf(attacker, prof), type = attackTypeOf(attacker, prof);
        const bon = bonusesOf(attacker);
        const sb = styleBonus(style);
        const A = attackRollOf(attacker, style, type, bon);
        const D = target ? defenceRoll(target, type) : 0;
        return {
            A, D, chance: hitChance(A, D), maxHit: maxHitOf(attacker, prof, style, type, bon),
            speed: Math.max(1, prof.speed + sb.speed), range: prof.ranged ? Math.max(1, prof.ranged.range + sb.range) : prof.reach,
            style, attackType: type, weapon: prof.name, weaponType: prof.itemType, ranged: !!prof.ranged,
            ammo: prof.ammo ? { type: prof.ammo.type, count: prof.ammo.count } : null, outOfAmmo: prof.outOfAmmo || null, prof
        };
    }
    /** One attack's rolls: accuracy 0..A against defence 0..D (a hit when higher), then damage 0..maxHit on a hit. */
    function roll(n, rng) {
        const a = Math.floor(rng() * (n.A + 1));
        const d = Math.floor(rng() * (n.D + 1));
        const hit = a > d;
        const rolled = hit ? Math.floor(rng() * (n.maxHit + 1)) : 0;
        return { a, d, hit, rolled };
    }
    Combat.roll = roll;
    Combat.defenceRoll = defenceRoll;
    Combat.describeAttack = (attacker, target) => {
        const n = numbers(attacker, target);
        delete n.prof;
        return n;
    };
    /** Authoritative AC: delegates to UF.Rules.armorClass when active, with legacy defence roll fallback. */
    Combat.calcAC = function(unit, attackType) {
        if (!unit || !unit.data) return 0;
        ensureHp(unit);
        if (window.UF && window.UF.Rules && typeof UF.Rules.armorClass === "function" && Combat.useRules !== false) {
            return UF.Rules.armorClass(unit).ac;
        }
        return defenceRoll(unit, attackType || "slash");
    };

    /** Maps a weapon profile or catalog item to a standardized SRD 5.1 weapon key. */
    Combat.resolveWeaponKey = function(prof) {
        if (!prof) return "unarmed";
        if (prof.natural) {
            if (prof.types && prof.types.includes("stab")) return "bite";
            if (prof.types && prof.types.includes("slash")) return "claws";
            return "unarmed";
        }
        const name = String(prof.name || "").toLowerCase();
        const type = String(prof.itemType || "").toLowerCase();
        if (name.includes("dagger") || type.includes("dagger") || name.includes("knife")) return "dagger";
        if (name.includes("long bow") || type.includes("long_bow")) return "longbow";
        if (name.includes("short bow") || name.includes("bow") || type.includes("bow")) return "shortbow";
        if (name.includes("sling") || type.includes("sling")) return "sling";
        if (name.includes("spear") || type.includes("spear")) return "spear";
        if (name.includes("club") || type.includes("club")) return "club";
        if (name.includes("mace") || type.includes("mace")) return "mace";
        if (name.includes("short sword") || type.includes("short_sword")) return "shortsword";
        if (name.includes("long sword") || type.includes("long_sword") || name.includes("sword")) return "longsword";
        if (name.includes("iron axe") || name.includes("battleaxe")) return "battleaxe";
        if (name.includes("stone axe") || name.includes("handaxe") || name.includes("axe")) return "handaxe";
        if (name.includes("pick") || name.includes("warhammer")) return "warhammer";
        if (name.includes("halberd")) return "halberd";
        if (name.includes("greatsword")) return "greatsword";
        if (name.includes("rapier")) return "rapier";
        if (name.includes("scimitar")) return "scimitar";
        return "unarmed";
    };

    function attackRng(attacker, target) {
        const w = World();
        const st = cstate();
        st.seq = (st.seq + 1) >>> 0;
        const seed = w && w.state ? w.state.seed >>> 0 : 0;
        return w.mulberry32(w.hash32(seed, SALT.attack, attacker.id >>> 0, target.id >>> 0, st.tick >>> 0, st.seq));
    }

    //-------------------------------------------------------------------------
    // Attacks

    function speedOf(unit) {
        const prof = weaponOf(unit);
        return Math.max(1, prof.speed + styleBonus(styleOf(unit, prof)).speed);
    }
    function modeOf(unit) {
        const c = unit && unit.data && unit.data.combat;
        if (c && MODES.includes(c.mode)) return c.mode;
        const dm = cfg().defaultModes;
        if (sideOf(unit) === "hostile") return MODES.includes(dm.hostile) ? dm.hostile : "nearest";
        const sp = speciesOf(unit);
        if (sp && sp.hunt && sp.hunt.flees === true) return MODES.includes(dm.fleeing) ? dm.fleeing : "flee";
        return MODES.includes(dm.other) ? dm.other : "defend";
    }
    Combat.modeOf = modeOf;
    Combat.styleOf = unit => styleOf(unit, weaponOf(unit));

    function factionOf(unit) {
        if (!unit || !unit.data) return null;
        if (unit.data.faction) {
            if (unit.data.faction === "player" && window.UF && UF.Factions && typeof UF.Factions.playerId === "function") {
                return UF.Factions.playerId();
            }
            return unit.data.faction;
        }
        if (unit.data.kind === "colonist") {
            return (window.UF && UF.Factions && typeof UF.Factions.playerId === "function") ? UF.Factions.playerId() : "player";
        }
        return null;
    }
    Combat.factionOf = factionOf;

    function retaliate(target, attacker, tick) {
        if (!attacker || !attacker.data || attacker.id === undefined || isDead(target)) return;
        const c = cd(target);
        const mode = modeOf(target);
        if (mode === "flee") {
            c.fleeFrom = attacker.id;
            return;
        }
        if (mode === "manual" || c.retaliate === false) return;
        if (c.targetId !== null && c.targetId !== undefined) {
            const cur = World() ? World().unit(c.targetId) : null;
            if (cur && !isDead(cur) && sameArea(cur, target)) return; // already fighting something
        }
        c.targetId = attacker.id;
        c.chase = null;
        c.nextAttackTick = Math.max(c.nextAttackTick, tick + Math.ceil(speedOf(target) / 2));
        if (target.data && target.data.ai === "colonist" && window.UF && UF.Jobs && typeof UF.Jobs.cancel === "function") {
            const j = typeof UF.Jobs.of === "function" ? UF.Jobs.of(target.id) : null;
            if (j && j.id) {
                UF.Jobs.cancel(j.id, "attacked");
            }
        }
    }

    function aidFaction(victim, attacker, tick) {
        if (!victim || !attacker || isDead(attacker)) return [];
        const f = factionOf(victim);
        if (!f) return [];
        const af = factionOf(attacker);
        if (af && af === f) return []; // intra-faction fight does not call faction aid

        const w = World();
        if (!w) return [];
        const R = cfg().aidRadius || 10;
        const helpers = [];

        for (const m of w.units()) {
            if (!m || m === victim || m === attacker || isDead(m)) continue;
            if (!sameArea(m, victim)) continue;
            if (factionOf(m) !== f) continue;
            const dest = (m.data && m.data.destiny) || (window.UF && UF.Goals && UF.Goals.destinyOf && UF.Goals.destinyOf(m));
            const bonusR = (dest && (dest.id === "legendary_guardian" || dest.id === "hearth_tender")) ? 4 : 0;
            if (cheb(m, victim) > (R + bonusR)) continue;

            const mode = modeOf(m);
            if (mode === "flee" || mode === "manual") continue;

            const mc = cd(m);
            if (mc.retaliate === false) continue;

            if (mc.targetId !== null && mc.targetId !== undefined && mc.targetId !== attacker.id) {
                const cur = w.unit(mc.targetId);
                if (cur && !isDead(cur) && sameArea(cur, m)) continue;
            }

            mc.targetId = attacker.id;
            mc.chase = null;
            mc.nextAttackTick = Math.max(mc.nextAttackTick, tick + Math.ceil(speedOf(m) / 2));

            if (m.data && m.data.ai === "colonist" && window.UF && UF.Jobs && typeof UF.Jobs.cancel === "function") {
                const j = typeof UF.Jobs.of === "function" ? UF.Jobs.of(m.id) : null;
                if (j && j.id) {
                    UF.Jobs.cancel(j.id, "aid_faction");
                }
            }

            helpers.push(m);
        }

        if (helpers.length > 0) {
            emit("combat:aid", { victim, attacker, helpers });
        }
        return helpers;
    }
    Combat.callFactionAid = aidFaction;

    /**
     * One attack now, whatever the range and timer (the loop checks those). opts.rng: a function returning [0, 1)
     * (tests and tools; the default is seeded from the world seed, both unit ids, the tick and a counter).
     * Authoritative resolution: delegates to UF.Rules.attack & UF.Rules.damage when available, preserving same-Z invariant,
     * critical dice doubling, and hitsplat visuals.
     * Returns { hit, damage, rolled, maxHit, attackRoll, defenceRoll, chance, style, attackType, speed, weapon, killed, critical, fumble } or null.
     */
    Combat.resolveAttack = function(attacker, target, opts) {
        if (!attacker || !target || !attacker.data || !target.data || attacker === target) return null;
        if (!sameArea(attacker, target)) return null;
        if (isDead(attacker) || target.data._isDying || target.data.dead) return null;
        ensureHp(attacker);
        ensureHp(target);
        if (target.data.hp <= 0) return null;

        const o = opts || {};
        const n = numbers(attacker, target);
        const rngFn = typeof o.rng === "function" ? o.rng : attackRng(attacker, target);

        // SRD 5.1 Rules Resolution via UF.Rules
        const Rules = window.UF && window.UF.Rules;
        const useSRD = Rules && typeof Rules.attack === "function" && Combat.useRules !== false && !o.legacy;

        let hit = false;
        let rolled = 0;
        let isCrit = false;
        let isFumble = false;
        let rollA = 0;
        let rollD = 0;
        let weaponKey = "unarmed";
        let attResult = null;

        if (useSRD) {
            weaponKey = Combat.resolveWeaponKey(n.prof);
            attResult = Rules.attack(attacker, target, weaponKey, {
                rng: rngFn,
                advantage: o.advantage,
                disadvantage: o.disadvantage,
                coverBonus: o.coverBonus,
                targetAC: o.targetAC,
                weaponBonus: o.weaponBonus
            });

            // Same-Z combat invariant check
            if (attResult.sameZViolation) {
                return { hit: false, error: "Different Z level (same-Z combat invariant)", sameZViolation: true };
            }

            hit = !!attResult.hit;
            isCrit = !!attResult.critical;
            isFumble = !!attResult.fumble;
            rollA = attResult.roll;
            rollD = attResult.effectiveAC;

            if (hit) {
                const dmgResult = Rules.damage(attacker, target, attResult, { rng: rngFn, extraDamage: o.extraDamage });
                rolled = dmgResult.damage;
            }
        } else {
            // Legacy tick/OSRS formula fallback
            const r = roll(n, rngFn);
            hit = r.hit;
            rolled = r.rolled;
            rollA = r.a;
            rollD = r.d;
        }

        const damage = Math.min(rolled, Math.max(0, target.data.hp));
        const I = Items();
        if (n.prof.ammo && n.prof.ammo.record && I && typeof I.consume === "function") {
            I.consume(n.prof.ammo.record.id, 1);
            const e = cached(attacker);
            if (e) e.prof = null; // the stack may be spent
        }
        const tick = cstate().tick;
        cd(attacker).lastTick = tick;
        cd(target).lastTick = tick;
        target.data.hp -= damage;
        try {
            Combat.playAttackAnimation(attacker, target);
            Combat.playHitAnimation(target, attacker);
        } catch (e) {
            report("animation hooks", e);
        }
        addSplat(target, damage);
        markBar(attacker);
        if (target.data.hp > 0) retaliate(target, attacker, tick);
        aidFaction(target, attacker, tick);
        Combat.stats.attacks++;
        if (hit) Combat.stats.hits++;
        const result = {
            hit,
            damage,
            rolled,
            maxHit: n.maxHit,
            attackRoll: useSRD ? rollA : n.A,
            defenceRoll: useSRD ? rollD : n.D,
            chance: n.chance,
            style: n.style,
            attackType: n.attackType,
            speed: n.speed,
            weapon: n.weapon,
            weaponKey,
            rolls: { a: rollA, d: rollD },
            critical: isCrit,
            fumble: isFumble,
            advantage: attResult ? !!attResult.advantage : false,
            disadvantage: attResult ? !!attResult.disadvantage : false,
            killed: false
        };
        emit("combat:hit", {
            attacker,
            target,
            damage,
            hit,
            style: n.style,
            attackType: n.attackType,
            critical: isCrit,
            fumble: isFumble,
            advantage: attResult ? !!attResult.advantage : false,
            disadvantage: attResult ? !!attResult.disadvantage : false,
            roll: rollA
        });
        if (target.data.hp <= 0) {
            target.data.hp = 0;
            result.killed = true;
            Combat.onUnitDeath(target, attacker);
        }
        return result;
    };

    /**
     * Kept name (UF_Anim wraps it and plays the sheet's attack columns): the attacker turns to face its target.
     * No code-made motion (VISION V58).
     */
    Combat.playAttackAnimation = function(attacker, target) {
        const w = World();
        if (!w || !attacker || !target || attacker.id === undefined) return false;
        const ev = w.eventOf(attacker.id);
        if (!ev) return false;
        const dx = target.x - attacker.x, dy = target.y - attacker.y;
        if (dx || dy) ev.setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8));
        markBar(attacker);
        return true;
    };
    /** Kept name (UF_Anim wraps it and plays the sheet's hurt column): shows the target's health bar. No code-made motion. */
    Combat.playHitAnimation = function(target) {
        if (target && target.id !== undefined) markBar(target);
        return true;
    };

    /**
     * Death at 0 hitpoints: the creature's yields and any equipment written as a type id drop on its cell (carried
     * items drop when the unit is removed, UF_Items), a person's death goes into the chronicle, combat:kill is emitted,
     * and the unit is removed (UF_Anim plays the death from the sheet and leaves the remains).
     */
    Combat.onUnitDeath = function(victim, killer) {
        if (!victim || !victim.data) return false;
        const d = victim.data;
        if (d._isDying === true) return false;
        d._isDying = true;
        d.dead = true;
        d.hp = 0;
        const w = World();
        const area = victim.area ? levelArea(victim) : (w ? viewArea(w) : null);
        const x = victim.x, y = victim.y;
        const I = Items();
        if (I && typeof I.drop === "function" && area) {
            try {
                const sp = speciesOf(victim);
                if (sp && sp.yields) for (const id of Object.keys(sp.yields)) if ((sp.yields[id] | 0) > 0 && itemType(id)) I.drop(area, x, y, id, sp.yields[id] | 0);
                const eq = d.equipment;
                if (eq && typeof eq === "object") {
                    const seen = new Set();
                    for (const v of Object.values(eq)) {
                        if (typeof v !== "string" || /^\d+$/.test(v) || seen.has(v) || !itemType(v)) continue;
                        seen.add(v);
                        I.drop(area, x, y, v, 1);
                    }
                }
            } catch (e) {
                report("death drops", e);
            }
        }
        const H = window.UF && UF.History;
        if (H && typeof H.addEvent === "function" && (d.kind === "colonist" || d.kind === "person")) {
            try {
                const kname = killer && typeof killer.name === "string" ? killer.name : "";
                const kIsCreature = !!speciesOf(killer);
                const by = kname ? (kIsCreature ? `a ${kname.toLowerCase()}` : kname) : "";
                const lvl = combatLevel(victim);
                const text = d.deathCause === "old_age"
                    ? `${victim.name} passed away peacefully of old age at the age of ${d.age || 60}.`
                    : (by ? `${victim.name} (fighting level ${lvl}) was killed by ${by}.` : `${victim.name} (fighting level ${lvl}) died of wounds.`);
                const fid = d.faction === "player" && w && w.state && w.state.factions ? w.state.factions.playerId : d.faction;
                H.addEvent({ type: "death", text, factions: fid ? [fid] : [], area, x, y });
            } catch (e) {
                report("chronicle", e);
            }
        }
        Combat.stats.kills++;
        const r = fx.get(victim.id);
        if (r) r.last = -Infinity;
        emit("combat:kill", { attacker: killer || null, target: victim });
        if (w && w.unit(victim.id)) w.removeUnit(victim.id);
        return true;
    };

    /** A fight of two units worked out in ticks without touching them (tests, balance). */
    Combat.duel = function(a, b, seed, maxTicks) {
        const w = World();
        const rng = w.mulberry32(w.hash32(w.state ? w.state.seed >>> 0 : 0, SALT.duel, (seed | 0) >>> 0));
        const na = numbers(a, b), nb = numbers(b, a);
        let ha = maxHp(a), hb = maxHp(b), ta = 0, tb = Math.ceil(nb.speed / 2);
        const limit = maxTicks || 3000;
        for (let t = 0; t < limit; t++) {
            if (t >= ta) {
                hb -= roll(na, rng).rolled;
                ta = t + na.speed;
                if (hb <= 0) return { winner: "a", ticks: t, hpA: ha, hpB: 0 };
            }
            if (t >= tb) {
                ha -= roll(nb, rng).rolled;
                tb = t + nb.speed;
                if (ha <= 0) return { winner: "b", ticks: t, hpA: 0, hpB: hb };
            }
        }
        return { winner: null, ticks: limit, hpA: ha, hpB: hb };
    };

    //-------------------------------------------------------------------------
    // Orders

    Combat.setMode = function(unit, mode) {
        if (!unit || !MODES.includes(mode)) return false;
        const c = cd(unit);
        c.mode = mode;
        if (mode === "flee" || mode === "manual") { c.targetId = null; c.chase = null; }
        return true;
    };
    Combat.setStyle = function(unit, style) {
        if (!unit || !STYLES.includes(style)) return false;
        cd(unit).style = style;
        return true;
    };
    Combat.setAttackType = function(unit, type) {
        if (!unit || !TYPES.includes(type)) return false;
        cd(unit).attackType = type;
        return true;
    };
    Combat.engage = function(attacker, target) {
        if (!attacker || !target || attacker === target || isDead(target)) return false;
        if (!sameArea(attacker, target)) return false;
        const c = cd(attacker);
        c.targetId = target.id;
        c.chase = null;
        ensureHp(attacker);
        ensureHp(target);
        return true;
    };
    Combat.disengage = function(unit) {
        const c = unit && unit.data && unit.data.combat;
        if (!c) return false;
        c.targetId = null;
        c.chase = null;
        return true;
    };
    /** True while the unit has a living target, or attacked or was attacked within the last 10 ticks (6 s at x1). */
    Combat.inCombat = function(unit) {
        const c = unit && unit.data && unit.data.combat;
        if (!c) return false;
        if (c.targetId !== null && c.targetId !== undefined) {
            const t = World() ? World().unit(c.targetId) : null;
            if (t && !isDead(t)) return true;
        }
        return cstate().tick - num(c.lastTick) < IN_COMBAT_TICKS;
    };
    Combat.describe = function(unit) {
        if (!unit || !unit.data) return null;
        const n = numbers(unit, null);
        const c = unit.data.combat || {};
        const levels = {};
        for (const s of SKILLS) levels[s] = level(unit, s);
        return { combatLevel: combatLevel(unit), levels, hp: ensureHp(unit), maxHp: maxHp(unit), mode: modeOf(unit), style: n.style,
            attackType: n.attackType, weapon: n.weapon, speed: n.speed, range: n.range, maxHit: n.maxHit, ammo: n.ammo, outOfAmmo: n.outOfAmmo,
            bonuses: bonusesOf(unit), targetId: c.targetId === undefined ? null : c.targetId, inCombat: Combat.inCombat(unit) };
    };

    //-------------------------------------------------------------------------
    // The loop: one combat tick every tickFrames map updates (so it pauses with the map and speeds up with it)

    const loopBlocked = () => !!(window.UF && UF.Test && UF.Test.active && UF.Test.only !== "combat");

    function sideOf(u) {
        const e = cached(u);
        if (e && e.side !== undefined) return e.side;
        const v = computeSide(u);
        if (e) e.side = v;
        return v;
    }
    function computeSide(u) {
        const d = u && u.data;
        if (!d) return null;
        if (Array.isArray(d.tags) && d.tags.includes("hostile")) return "hostile";
        const S = window.UF && UF.Stance;
        const s = S && typeof S.of === "function" ? S.of(u) : (d.kind === "colonist" || d.faction === "player" ? "friendly" : null);
        return s === "hostile" ? "hostile" : s === "friendly" ? "friendly" : null;
    }
    Combat.sideOf = sideOf;

    function pickKey(u, e, mode, tick, seed) {
        const dist = manhattan(u, e); // reach is orthogonal: a diagonal neighbour is two steps away
        const tie = (World().hash32(seed, SALT.pick, tick >>> 0, u.id >>> 0, e.id >>> 0) % 1000) / 1e6;
        if (mode === "weakest") return ensureHp(e) * 1000 + dist + tie;
        if (mode === "strongest") return -combatLevel(e) * 1000 + dist + tie;
        return dist + tie;
    }
    function seek(u, enemies, tick, byId, seed) {
        const mode = modeOf(u);
        if (!SEEKING.has(mode)) return;
        const c = u.data.combat;
        if (c && c.targetId !== null && c.targetId !== undefined) {
            const cur = byId.get(c.targetId);
            if (cur && !isDead(cur) && cheb(u, cur) <= cfg().leash) return;
        }
        const R = cfg().aggroRadius;
        const mySide = sideOf(u);
        let best = null, bestKey = Infinity;
        for (const e of enemies) {
            if (isDead(e) || cheb(u, e) > R) continue;
            let key;
            if (mode === "protect") {
                const ec = e.data.combat;
                const victim = ec && ec.targetId !== null && ec.targetId !== undefined ? byId.get(ec.targetId) : null;
                const sameFac = victim && factionOf(victim) && factionOf(victim) === factionOf(u);
                if (!victim || victim === u || (!sameFac && sideOf(victim) !== mySide)) continue;
                key = pickKey(u, e, "nearest", tick, seed) + (c && c.protectId !== undefined && c.protectId !== null && victim.id !== c.protectId ? 1000 : 0);
            } else {
                key = pickKey(u, e, mode, tick, seed);
            }
            if (key < bestKey) {
                bestKey = key;
                best = e;
            }
        }
        if (best) Combat.engage(u, best);
    }
    function canChase(u) {
        const d = u.data;
        if (d.ai === "colonist" && window.UF.Jobs && typeof UF.Jobs.of === "function" && UF.Jobs.of(u.id)) return false; // busy: fights what is in reach
        return true;
    }
    function walkableFor(w, area, x, y, u) {
        if (typeof w.walkable === "function") return w.walkable(area.x, area.y, x, y, { unit: u, z: zOf(u) });
        return w.cellFree(area.x, area.y, x, y, u.id, zOf(u));
    }
    function chase(u, t, occ, size, area) {
        const w = World();
        const c = cd(u);
        let goal = null, best = Infinity;
        for (const [dx, dy] of N4) {
            const x = t.x + dx, y = t.y + dy;
            if (x < 0 || y < 0 || x >= size || y >= size) continue;
            const o = occ.get(y * size + x);
            if (o && o !== u) continue;
            if (!walkableFor(w, area, x, y, u)) continue;
            const dd = Math.abs(x - u.x) + Math.abs(y - u.y);
            if (dd < best) {
                best = dd;
                goal = { x, y };
            }
        }
        if (!goal) return; // Wait for an adjacent square to open rather than walking onto an occupied square
        if (!c.chase || c.chase.x !== goal.x || c.chase.y !== goal.y || !u.goal) {
            w.sendUnit(u.id, { area: levelArea(u), x: goal.x, y: goal.y, z: zOf(u) });
            c.chase = goal;
        }
    }
    function flee(u, units, tick, size, area) {
        const w = World();
        const c = cd(u);
        const R = cfg().fleeRadius;
        const side = sideOf(u);
        let threat = null, bd = Infinity;
        for (const e of units) {
            if (e === u || isDead(e)) continue;
            const ec = e.data && e.data.combat;
            const enemy = (ec && ec.targetId === u.id) || c.fleeFrom === e.id || (side === "friendly" && sideOf(e) === "hostile");
            if (!enemy) continue;
            const dist = cheb(u, e);
            if (dist <= R && dist < bd) {
                bd = dist;
                threat = e;
            }
        }
        if (!threat) return;
        if (u.goal && tick - num(c.fleeTick) < 3) return;
        let dx = Math.sign(u.x - threat.x), dy = Math.sign(u.y - threat.y);
        if (!dx && !dy) dx = 1;
        const far = R + 2;
        const tries = [[dx, dy], [dx, 0], [0, dy], [dx || 1, -dy || 1], [-dx || -1, dy || 1]];
        for (const [tx, ty] of tries) {
            const x = Math.max(0, Math.min(size - 1, u.x + tx * far)), y = Math.max(0, Math.min(size - 1, u.y + ty * far));
            if (walkableFor(w, area, x, y, u)) {
                w.sendUnit(u.id, { area: levelArea(u), x, y, z: zOf(u) });
                c.fleeTick = tick;
                c.targetId = null;
                return;
            }
        }
    }
    function act(u, t, tick, occ, size, area) {
        const c = u.data.combat;
        const prof = weaponOf(u);
        const style = styleOf(u, prof);
        const range = prof.ranged ? Math.max(1, prof.ranged.range + styleBonus(style).range) : 1;
        const inReach = prof.ranged ? cheb(u, t) <= range : manhattan(u, t) === 1;
        const cellOcc = occ.get(u.y * size + u.x);
        const exclusiveSquare = cellOcc === u;
        if (inReach && exclusiveSquare) {
            if (c.chase) {
                World().stopUnit(u.id);
                c.chase = null;
            }
            if (tick >= c.nextAttackTick) {
                const r = Combat.resolveAttack(u, t);
                if (r) c.nextAttackTick = tick + r.speed;
            }
        } else if (canChase(u)) {
            chase(u, t, occ, size, area);
        }
    }
    function combatTick(tick) {
        tickCache = new Map();
        try {
            runTick(tick);
        } finally {
            tickCache = null;
        }
    }
    function runTick(tick) {
        const w = World();
        if (!w || !w.state) return;
        const allUnits = w.units();
        if (!allUnits || allUnits.length === 0) return;
        // Fast-path: if no unit has combat data, hostile side, or target, avoid level grouping
        let anyCombatOrHostile = false;
        if (Combat.testFilter) {
            anyCombatOrHostile = true;
        } else {
            for (let i = 0; i < allUnits.length; i++) {
                const u = allUnits[i];
                const d = u.data;
                if (!d || isDead(u)) continue;
                if (d.hostile || d.side === "hostile" || (d.combat && d.combat.targetId !== null) || d.ai === "hostile" || (d.species && d.species.includes("wolf"))) {
                    anyCombatOrHostile = true;
                    break;
                }
            }
        }
        if (!anyCombatOrHostile) return;

        const groups = new Map();
        for (let i = 0; i < allUnits.length; i++) {
            const u = allUnits[i];
            if (!u.area || !w.inWorld(u.area.x, u.area.y, zOf(u))) continue;
            const key = `${u.area.x},${u.area.y},${zOf(u)}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(u);
        }
        for (const all of groups.values()) runLevelTick(tick, all, levelArea(all[0]));
    }
    function runLevelTick(tick, all, area) {
        const w = World();
        const units = Combat.testFilter ? all.filter(u => Combat.testFilter.has(u.id)) : all;
        if (!units.length) return;
        const size = w.state.size, seed = w.state.seed >>> 0;
        const occ = new Map();
        for (const u of all) {
            const k = u.y * size + u.x;
            if (occ.has(k)) occ.set(k, "SHARED");
            else occ.set(k, u);
        }
        const byId = new Map();
        const hostiles = [], friendlies = [];
        for (const u of units) {
            byId.set(u.id, u);
            if (isDead(u)) continue;
            const side = sideOf(u);
            if (side === "hostile") hostiles.push(u);
            else if (side === "friendly") friendlies.push(u);
        }
        if (hostiles.length && friendlies.length) {
            for (const u of hostiles) seek(u, friendlies, tick, byId, seed);
            for (const u of friendlies) seek(u, hostiles, tick, byId, seed);
        }
        const leash = cfg().leash;
        for (const u of units) {
            const c = u.data && u.data.combat;
            if (!c || isDead(u)) continue;
            if (modeOf(u) === "flee") {
                flee(u, units, tick, size, area);
                continue;
            }
            if (c.targetId === null || c.targetId === undefined) continue;
            const t = byId.get(c.targetId);
            if (!t || isDead(t) || cheb(u, t) > leash) {
                c.targetId = null;
                c.chase = null;
                continue;
            }
            act(u, t, tick, occ, size, area);
        }
    }
    function regen() {
        const r = cfg().regen;
        const n = Math.floor(num(r.hp));
        if (n <= 0) return;
        for (const u of World().units()) {
            const d = u.data;
            if (!d || typeof d.hp !== "number" || isDead(u)) continue;
            const m = maxHp(u);
            if (d.hp < m) d.hp = Math.min(m, d.hp + n);
        }
    }
    function step() {
        const w = World();
        if (!Combat.enabled || !w || !w.state || loopBlocked() || (window.UF && UF.Time && UF.Time.paused)) return;
        const st = cstate();
        st.updates++;
        if (st.updates % cfg().tickFrames !== 0) return;
        st.tick++;
        Combat.stats.ticks++;
        const t0 = performance.now();
        combatTick(st.tick);
        const ms = performance.now() - t0;
        Combat.perf.ticks = (Combat.perf.ticks || 0) + 1;
        Combat.perf.tickMs = (Combat.perf.tickMs || 0) + ms;
        if (ms > (Combat.perf.tickWorst || 0)) Combat.perf.tickWorst = ms;
        const every = pos(cfg().regen.everyTicks, 100);
        if (st.tick % every === 0) regen();
    }

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        const t0 = performance.now();
        try {
            step();
        } catch (e) {
            report("step", e);
        }
        const ms = performance.now() - t0;
        Combat.perf.updates++;
        Combat.perf.simMs += ms;
        if (ms > Combat.perf.simWorst) Combat.perf.simWorst = ms;
    };

    //-------------------------------------------------------------------------
    // Test spawning and the debug key

    Combat.spawnHostile = function(speciesName, x, y) {
        const w = World();
        if (!w || !w.state) return null;
        const area = viewArea(w);
        if (!area) return null;
        const c = catalog();
        const list = (c && c.wildlife && Array.isArray(c.wildlife.species)) ? c.wildlife.species : [];
        const sp = speciesById(speciesName || "wolf") || list.find(s => s.kind === "predator" && s.combat) || null;
        if (!sp) return null;
        const size = w.state.size;
        if (x === null || x === undefined || y === null || y === undefined) {
            const st = cstate();
            st.spawns = (st.spawns + 1) >>> 0;
            const h = w.hash32(w.state.seed >>> 0, SALT.spawn, st.spawns);
            const cx = window.$gamePlayer ? $gamePlayer.x : size >> 1, cy = window.$gamePlayer ? $gamePlayer.y : size >> 1;
            x = cx + (h & 7) - 3 + ((h & 8) ? 4 : -4);
            y = cy + ((h >>> 4) & 7) - 3;
        }
        x = Math.max(1, Math.min(size - 2, x | 0));
        y = Math.max(1, Math.min(size - 2, y | 0));
        const free = w.nearestFreeCell(area.x, area.y, x, y, 6, undefined, zOf(area));
        if (!free) return null;
        const u = w.addUnit({
            name: sp.name, image: { characterName: sp.image, characterIndex: 0 }, area: { x: area.x, y: area.y }, z: zOf(area), x: free.x, y: free.y, dir: 2,
            data: { kind: "creature", species: sp.id, tags: [sp.kind, "hostile"].filter(Boolean), tint: sp.tint, through: sp.kind === "flier",
                ai: "combat", faction: null, home: { x: free.x, y: free.y }, combat: { mode: "nearest", targetId: null, nextAttackTick: 0, lastTick: -1000 } }
        });
        ensureHp(u);
        return u;
    };
    Combat.testRaid = function() {
        return [Combat.spawnHostile("wolf"), Combat.spawnHostile("wolf")].filter(Boolean);
    };
    const argvDebug = (() => {
        try {
            return typeof nw !== "undefined" && nw.App && Array.isArray(nw.App.argv) && nw.App.argv.includes("--uf-debug");
        } catch (e) {
            return false;
        }
    })();
    Combat.debugKeysOn = () => !!(Combat.debug === true || argvDebug || (window.UF && UF.Test && UF.Test.active));

    Input.keyMapper[75] = "ufCombatRaid"; // K
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (this.isActive() && Combat.debugKeysOn() && Input.isTriggered("ufCombatRaid")) Combat.testRaid();
    };

    //-------------------------------------------------------------------------
    // Hitsplats and health bars (interface: real-time ms, not simulation)

    const fx = new Map(); // unitId -> { splats: [{ dmg, born, slot }], last: ms of the last attack made or taken, sprite, anchor }
    function fxOf(id) {
        let r = fx.get(id);
        if (!r) {
            r = { splats: [], last: -Infinity, sprite: null, anchor: null };
            fx.set(id, r);
        }
        return r;
    }
    function addSplat(unit, dmg) {
        const w = World();
        if (!unit || unit.id === undefined || !w || !w.state || !w.isDisplayed(unit)) return null;
        const r = fxOf(unit.id);
        const max = pos(cfg().display.maxSplats, 4);
        while (r.splats.length >= max) {
            const old = r.splats.shift();
            if (old.sprite) {
                const L = Combat.layer();
                if (L) L.releaseSplat(old.sprite);
                old.sprite = null;
            }
        }
        const used = new Set(r.splats.map(s => s.slot));
        let slot = 0;
        while (used.has(slot)) slot++;
        const s = { dmg: Math.max(0, dmg | 0), born: nowMs(), slot, sprite: null };
        r.splats.push(s);
        r.last = s.born;
        return s;
    }
    function markBar(unit) {
        const w = World();
        if (!unit || unit.id === undefined || !w || !w.state || !w.unit(unit.id) || !w.isDisplayed(unit)) return;
        fxOf(unit.id).last = nowMs();
    }
    let removalHooked = false;
    function hookRemovals() {
        if (removalHooked || !window.UF || !UF.Events || typeof UF.Events.on !== "function") return;
        removalHooked = true;
        UF.Events.on("world:unitRemoved", u => {
            if (u && u.id !== undefined && !(u.data && (u.data._isDying || u.data.dead))) dropFx(u.id);
        });
    }
    Combat.fxOf = id => fx.get(id) || null;
    function dropFx(id) {
        const r = fx.get(id);
        if (!r) return;
        const L = Combat.layer();
        if (L) L.release(r);
        fx.delete(id);
    }
    Combat.clearFx = () => {
        for (const id of Array.from(fx.keys())) dropFx(id);
    };
    /** Kept name: shows a hitsplat on the unit standing on the cell (the number in text, else a blue 0). No floating text. */
    Combat.addPopup = function(cellX, cellY, text) {
        const w = World();
        const area = w && w.state ? viewArea(w) : null;
        if (!area) return null;
        const u = w.unitsInArea(area.x, area.y, zOf(area)).find(v => v.x === cellX && v.y === cellY && !(v.data && v.data._isDying));
        if (!u) return null;
        const m = String(text === null || text === undefined ? "" : text).match(/\d+/);
        return addSplat(u, m ? parseInt(m[0], 10) : 0);
    };
    /** The hitsplats on screen now, as { unitId, damage, born }. (Kept name; the old floating text popups are gone.) */
    Object.defineProperty(Combat, "popups", {
        enumerable: true,
        get() {
            const out = [];
            for (const [id, r] of fx) for (const s of r.splats) out.push({ unitId: id, damage: s.dmg, born: s.born });
            return out;
        }
    });

    const splatCache = new Map();
    function numberFont() {
        return window.$gameSystem && typeof $gameSystem.numberFontFace === "function" ? $gameSystem.numberFontFace() : "sans-serif";
    }
    /** The hitsplat bitmap for a damage number (0 = the blue miss splat), drawn once and cached (UF_GenHitsplat). */
    function splatBitmap(dmg) {
        const key = Math.max(0, dmg | 0);
        let b = splatCache.get(key);
        if (b) return b;
        const text = String(key);
        const W = text.length >= 3 ? 34 : 28, H = 24, cx = W / 2, cy = H / 2;
        b = new Bitmap(W, H);
        const ctx = b.context;
        ctx.save();
        ctx.beginPath();
        if (key > 0) {
            const n = 14;
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 - Math.PI / 2;
                const ry = i % 2 ? H / 2 - 3.5 : H / 2 - 0.5, rx = ry * (W / H);
                if (i === 0) ctx.moveTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
                else ctx.lineTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
            }
            ctx.closePath();
            ctx.fillStyle = "#b8140f";
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#3c0503";
            ctx.stroke();
        } else {
            ctx.moveTo(cx, 1);
            ctx.quadraticCurveTo(W - 2, 1, W - 2.5, cy - 1);
            ctx.quadraticCurveTo(W - 4, H - 3, cx, H - 1);
            ctx.quadraticCurveTo(4, H - 3, 2.5, cy - 1);
            ctx.quadraticCurveTo(2, 1, cx, 1);
            ctx.closePath();
            ctx.fillStyle = "#2a58cc";
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#0a1a4c";
            ctx.stroke();
        }
        ctx.restore();
        b.fontFace = numberFont();
        b.fontSize = 15;
        b.fontBold = true;
        b.textColor = "#ffffff";
        b.outlineColor = "rgba(0, 0, 0, 0.85)";
        b.outlineWidth = 3;
        b.drawText(text, 0, 0, W, H, "center"); // also refreshes the texture after the canvas drawing above
        b._ufSplat = key;
        b._ufName = "UF_GenHitsplat";
        Combat.perf.splatBitmaps = (Combat.perf.splatBitmaps || 0) + 1;
        splatCache.set(key, b);
        return b;
    }
    Combat.splatBitmap = splatBitmap;
    let barBack = null, barFill = null;
    function barBitmaps() {
        const bw = pos(cfg().display.barWidth, 30);
        if (!barBack || barBack.width !== bw + 2) {
            barBack = new Bitmap(bw + 2, 6);
            barBack.fillRect(0, 0, bw + 2, 6, "#000000");
            barBack.fillRect(1, 1, bw, 4, "#c41a14");
            barBack._ufBar = "back";
            barBack._ufName = "UF_GenHealthBar";
            barFill = new Bitmap(bw, 4);
            barFill.fillRect(0, 0, bw, 4, "#24c424");
            barFill.fillRect(0, 0, bw, 1, "#78ec78");
            barFill._ufBar = "fill";
            barFill._ufName = "UF_GenHealthBar";
        }
        return { back: barBack, fill: barFill, width: bw };
    }
    Combat.barBitmaps = barBitmaps;

    // The first opaque row of a sheet frame (so the bar sits on the head, not on the top of a tall empty frame). Cached.
    const topCache = new Map();
    let scratch = null;
    /** The pixels of a frame of a bitmap, read through a small CPU canvas (the bitmap itself is not touched). */
    function framePixels(bmp, f) {
        const src = bmp._canvas || bmp._image;
        if (!src) return null;
        if (!scratch) {
            const cv = document.createElement("canvas");
            scratch = { cv, cx: cv.getContext("2d", { willReadFrequently: true }) };
        }
        if (scratch.cv.width < f.width || scratch.cv.height < f.height) {
            scratch.cv.width = Math.max(scratch.cv.width, f.width);
            scratch.cv.height = Math.max(scratch.cv.height, f.height);
        }
        scratch.cx.clearRect(0, 0, f.width, f.height);
        scratch.cx.drawImage(src, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height);
        Combat.perf.frameReads = (Combat.perf.frameReads || 0) + 1;
        return scratch.cx.getImageData(0, 0, f.width, f.height).data;
    }
    Combat.framePixels = framePixels;
    function opaqueTop(bmp, f) {
        if (!bmp || !bmp.isReady() || !f || !f.width || !f.height) return 0;
        const key = `${bmp._url || bmp._ufName || "?"}|${f.x},${f.y},${f.width},${f.height}`;
        const hit = topCache.get(key);
        if (hit !== undefined) return hit;
        let top = 0;
        try {
            const data = framePixels(bmp, f);
            if (!data) return 0;
            top = f.height - 1;
            outer: for (let y = 0; y < f.height; y++) {
                for (let x = 0; x < f.width; x++) {
                    if (data[(y * f.width + x) * 4 + 3] > 16) {
                        top = y;
                        break outer;
                    }
                }
            }
        } catch (e) {
            top = 0;
        }
        if (bmp._url) topCache.set(key, top);
        return top;
    }
    function geometry(sp) {
        const f = sp._frame;
        if (!sp.bitmap || !f || !f.height) return { x: sp.x, foot: sp.y, head: sp.y - 40 };
        const sy = sp.scale ? sp.scale.y : 1;
        const frameTop = sp.y - sp.anchor.y * f.height * sy;
        return { x: sp.x, foot: sp.y, head: frameTop + opaqueTop(sp.bitmap, f) * sy };
    }
    Combat.headOf = geometry;

    class Sprite_UFCombatFx extends Sprite {
        constructor(spriteset) {
            super();
            this.z = FX_Z;
            this._ufCombatFx = true;
            this._spriteset = spriteset;
            this._barLayer = new Sprite();
            this._splatLayer = new Sprite();
            this.addChild(this._barLayer);
            this.addChild(this._splatLayer);
            this._freeBars = [];
            this._freeSplats = [];
        }
        update() {
            const t0 = performance.now();
            try {
                this.layout();
            } catch (e) {
                report("layout", e);
            }
            const ms = performance.now() - t0;
            Combat.perf.drawUpdates++;
            Combat.perf.drawMs += ms;
            if (ms > Combat.perf.drawWorst) Combat.perf.drawWorst = ms;
            if (ms > 1) Combat.perf.drawOver1 = (Combat.perf.drawOver1 || 0) + 1;
        }
        spriteOf(r, ev) {
            const s = r.sprite;
            if (s && s._character === ev && s.parent) return s;
            const list = this._spriteset && this._spriteset._characterSprites;
            r.sprite = list ? list.find(x => x._character === ev) || null : null;
            return r.sprite;
        }
        /** The sprite's centre, foot and head row (its first opaque row), kept on the record; the head is re-read only when the frame changes. */
        geo(r, sp) {
            const g = r.geo || (r.geo = { x: 0, head: 0, foot: 0 });
            const f = sp._frame, bmp = sp.bitmap;
            g.x = sp.x;
            g.foot = sp.y;
            if (!bmp || !f || !f.height) {
                g.head = sp.y - 40;
                return g;
            }
            if (r.topBmp !== bmp || r.topFx !== f.x || r.topFy !== f.y || r.topFw !== f.width || r.topFh !== f.height) {
                const ready = bmp.isReady();
                r.top = ready ? opaqueTop(bmp, f) : 0;
                r.topBmp = ready ? bmp : null;
                r.topFx = f.x;
                r.topFy = f.y;
                r.topFw = f.width;
                r.topFh = f.height;
            }
            const sy = sp.scale.y;
            g.head = sp.y - sp.anchor.y * f.height * sy + r.top * sy;
            return g;
        }
        acquireBar() {
            let pair = this._freeBars.pop();
            if (!pair) {
                const bm = barBitmaps();
                const back = new Sprite(bm.back), fill = new Sprite(bm.fill);
                back._ufKind = "barBack";
                fill._ufKind = "barFill";
                this._barLayer.addChild(back);
                this._barLayer.addChild(fill);
                pair = [back, fill];
            }
            pair[1]._ufW = -1;
            return pair;
        }
        releaseBar(pair) {
            pair[0].visible = false;
            pair[1].visible = false;
            this._freeBars.push(pair);
        }
        acquireSplat(dmg) {
            let sp = this._freeSplats.pop();
            if (!sp) {
                sp = new Sprite();
                sp.anchor.set(0.5, 0.5);
                sp._ufKind = "splat";
                this._splatLayer.addChild(sp);
            }
            const bmp = splatBitmap(dmg);
            if (sp.bitmap !== bmp) sp.bitmap = bmp;
            sp._ufDmg = dmg;
            return sp;
        }
        releaseSplat(sp) {
            sp.visible = false;
            this._freeSplats.push(sp);
        }
        release(r) {
            for (const s of r.splats) {
                if (s.sprite) {
                    this.releaseSplat(s.sprite);
                    s.sprite = null;
                }
            }
            if (r.bar) {
                this.releaseBar(r.bar);
                r.bar = null;
            }
        }
        layout() {
            const w = World();
            if (!w || !w.state || !fx.size || !window.$gameMap) return;
            const d = cfg().display;
            const now = nowMs();
            const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
            const bm = barBitmaps();
            const cur = viewArea(w), events = $gameMap._events, base = w.EVENT_BASE;
            for (const [id, r] of fx) {
                let k = 0;
                for (let i = 0; i < r.splats.length; i++) {
                    const s = r.splats[i];
                    if (now - s.born < d.splatMs) r.splats[k++] = s;
                    else if (s.sprite) {
                        this.releaseSplat(s.sprite);
                        s.sprite = null;
                    }
                }
                r.splats.length = k;
                const u = w.unit(id);
                const alive = !!u && !isDead(u);
                const barOn = alive && now - r.last < d.barHideMs;
                if (!barOn && r.bar) {
                    this.releaseBar(r.bar);
                    r.bar = null;
                }
                if (!k && !barOn) {
                    fx.delete(id);
                    continue;
                }
                let geo = null;
                if (alive && cur && u.area.x === cur.x && u.area.y === cur.y && zOf(u) === zOf(cur)) {
                    const ev = events[base + id];
                    const sp = ev ? this.spriteOf(r, ev) : null;
                    if (sp && sp.visible) {
                        geo = this.geo(r, sp);
                        const bx = $gameMap.adjustX(ev._realX) * tw, by = $gameMap.adjustY(ev._realY) * th;
                        const a = r.anchor || (r.anchor = { mx: 0, my: 0, dx: 0, dh: 0, df: 0 });
                        a.mx = ev._realX;
                        a.my = ev._realY;
                        a.area = levelArea(u);
                        a.dx = geo.x - bx;
                        a.dh = geo.head - by;
                        a.df = geo.foot - by;
                    }
                }
                if (!geo && r.anchor && k && cur && r.anchor.area && r.anchor.area.x === cur.x && r.anchor.area.y === cur.y && zOf(r.anchor.area) === zOf(cur)) {
                    const a = r.anchor, bx = $gameMap.adjustX(a.mx) * tw, by = $gameMap.adjustY(a.my) * th;
                    geo = r.geo || (r.geo = { x: 0, head: 0, foot: 0 });
                    geo.x = bx + a.dx;
                    geo.head = by + a.dh;
                    geo.foot = by + a.df;
                }
                if (!geo) {
                    if (r.bar) r.bar[0].visible = r.bar[1].visible = false;
                    for (const s of r.splats) if (s.sprite) s.sprite.visible = false;
                    continue;
                }
                if (barOn) {
                    const pair = r.bar || (r.bar = this.acquireBar());
                    const back = pair[0], fill = pair[1];
                    const max = u.data.maxHp > 0 ? u.data.maxHp : maxHp(u);
                    const fw = Math.round(bm.width * Math.max(0, Math.min(1, num(u.data.hp) / max)));
                    back.x = Math.round(geo.x - (bm.width + 2) / 2);
                    back.y = Math.round(geo.head - 9);
                    fill.x = back.x + 1;
                    fill.y = back.y + 1;
                    if (fill._ufW !== fw) {
                        fill.setFrame(0, 0, fw, 4);
                        fill._ufW = fw;
                    }
                    back._ufUnit = fill._ufUnit = id;
                    back.visible = fill.visible = true;
                }
                const body = geo.foot - geo.head;
                const midY = body >= 24 ? geo.head + body * 0.45 : geo.foot - 12;
                for (const s of r.splats) {
                    const sp = s.sprite || (s.sprite = this.acquireSplat(s.dmg));
                    const off = SPLAT_OFFSETS[s.slot % SPLAT_OFFSETS.length];
                    sp.x = Math.round(geo.x + off[0]);
                    sp.y = Math.round(midY + off[1]);
                    sp._ufUnit = id;
                    sp._ufSlot = s.slot;
                    sp.visible = true;
                }
            }
        }
        /** Tests: the visible sprites, [{ kind, unitId, damage?, slot?, x, y, width, height, bitmap, sprite }]. */
        visibleSprites() {
            const out = [];
            const add = (s, extra) => {
                if (s && s.visible) out.push(Object.assign({ kind: s._ufKind, unitId: s._ufUnit, x: s.x, y: s.y, width: s._frame.width, height: s._frame.height, bitmap: s.bitmap, sprite: s }, extra || {}));
            };
            for (const r of fx.values()) {
                if (r.bar) {
                    add(r.bar[0]);
                    add(r.bar[1]);
                }
                for (const s of r.splats) if (s.sprite) add(s.sprite, { damage: s.sprite._ufDmg, slot: s.sprite._ufSlot });
            }
            return out;
        }
        allChildren() {
            return [...this._barLayer.children, ...this._splatLayer.children];
        }
        poolSizes() {
            return { bars: this._barLayer.children.length / 2, freeBars: this._freeBars.length, splats: this._splatLayer.children.length, freeSplats: this._freeSplats.length };
        }
    }

    const _Spriteset_Map_createCharacters = Spriteset_Map.prototype.createCharacters;
    Spriteset_Map.prototype.createCharacters = function() {
        _Spriteset_Map_createCharacters.call(this);
        fx.clear(); // ids of another map or another save mean nothing here
        hookRemovals();
        this._ufCombatFx = new Sprite_UFCombatFx(this);
        this._tilemap.addChild(this._ufCombatFx);
    };
    Combat.layer = () => {
        const s = SceneManager._scene && SceneManager._scene._spriteset;
        return s && s._ufCombatFx ? s._ufCombatFx : null;
    };

    //-------------------------------------------------------------------------
    // UF.Test suite "combat" (registered at boot, test runs only)

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("combat", async t => {
            const w = UF.World, I = UF.Items;
            if (window.UF && UF.Levels && typeof UF.Levels.view === "function" && UF.Levels.view() !== 0) {
                UF.Levels.setView(0);
                await t.waitUntil(() => !!(w && w.currentArea && w.currentArea()), 10000, "Ground view for combat checks").catch(() => {});
            }
            const area = w && w.currentArea();
            if (!area || !Combat.layer()) throw new Error(`not ready: area ${!!area}, layer ${!!Combat.layer()}`);
            const cat = window.$ufWorldCatalog || {};
            const speciesList = (cat.wildlife && cat.wildlife.species) || [];
            const sp = id => speciesList.find(s => s.id === id) || null;
            const peopleImgs = cat.people && cat.people.human && Array.isArray(cat.people.human.images) ? cat.people.human.images : [];
            const personImg = peopleImgs[0] || "$Adam";
            const size = w.state.size, mid = size >> 1;
            const errors0 = t.errorsSoFar().length;
            const combatErrors0 = Combat.errors.length;
            const made = new Set();
            const st = cstate();
            const zoom0 = UF.Camera ? UF.Camera.level() : null;
            const speed0 = UF.Time && typeof UF.Time.level === "function" ? UF.Time.level() : null;
            if (UF.Time && typeof UF.Time.setLevel === "function") UF.Time.setLevel(0);
            // Levels in these checks come from data.combatLevels: with UF_Skills loaded, its levels would override them.
            const S = window.UF.Skills;
            const skillsLevel0 = S && typeof S.level === "function" ? S.level : null;
            if (skillsLevel0) {
                S.level = function(unit, skill) {
                    const cl = unit && unit.data && unit.data.kind === "test" ? unit.data.combatLevels : null;
                    if (cl && typeof cl[skill] === "number") return cl[skill];
                    return skillsLevel0.apply(this, arguments);
                };
            }
            const add = (name, image, x, y, data, dir) => {
                const u = w.addUnit({ name, image: { characterName: image, characterIndex: 0 }, area: { x: area.x, y: area.y }, x, y, dir: dir || 2,
                    data: Object.assign({ kind: "test", inventory: [], equipment: {}, thoughts: [] }, data || {}) });
                made.add(u.id);
                return u;
            };
            const L = (a, s, d, hp, extra) => Object.assign({ attack: a, strength: s, defence: d, ranged: 1, magic: 1, hitpoints: hp }, extra || {});
            const person = (name, x, y, levels, equipment, extra) => add(name, personImg, x, y, Object.assign({ faction: "player", combatLevels: levels, equipment: equipment || {} }, extra || {}));
            const foe = (name, x, y, levels, extra) => add(name, personImg, x, y, Object.assign({ tags: ["hostile"], combatLevels: levels }, extra || {}));
            const creature = (name, id, x, y, extra) => {
                const s = sp(id);
                return add(name, s ? s.image : personImg, x, y, Object.assign({ species: id, tags: s ? [s.kind] : [], tint: s ? s.tint : undefined }, extra || {}));
            };
            const removeAll = () => {
                for (const id of made) if (w.unit(id)) w.removeUnit(id);
                made.clear();
            };
            const hits = [];
            const kills = [];
            const onHit = e => hits.push({ e, updates: st.updates, frame: Graphics.frameCount });
            const onKill = e => kills.push(e);
            UF.Events.on("combat:hit", onHit);
            UF.Events.on("combat:kill", onKill);
            const alwaysHigh = () => 0.999999;

            const alwaysLow = () => 0;

            // An arena: a free block near the middle, away from other units.
            const blockFree = (x0, y0, bw, bh) => {
                if (x0 < 2 || y0 < 2 || x0 + bw + 2 >= size || y0 + bh + 2 >= size) return false;
                for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) if (!w.cellFree(area.x, area.y, x, y)) return false;
                return true;
            };
            const findBlock = (bw, bh, avoid) => {
                const units = w.unitsInArea(area.x, area.y);
                for (let r = 8; r <= 110; r += 3) {
                    for (let k = 0; k < 32; k++) {
                        const a = (k / 32) * Math.PI * 2;
                        const x0 = Math.round(mid + Math.cos(a) * r - bw / 2), y0 = Math.round(mid + Math.sin(a) * r - bh / 2);
                        if (!blockFree(x0, y0, bw, bh)) continue;
                        if (avoid && units.some(u => u.x >= x0 - 4 && u.x < x0 + bw + 4 && u.y >= y0 - 4 && u.y < y0 + bh + 4)) continue;
                        return { x: x0, y: y0 };
                    }
                }
                return null;
            };
            const arena = findBlock(14, 8, true) || { x: mid - 7, y: mid + 6 };
            const ax = arena.x, ay = arena.y;
            const view = (x, y, level) => {
                if (UF.Camera) UF.Camera.setLevel(level || 0);
                $gamePlayer.locate(x, y);
            };
            view(ax + 7, ay + 4, 0);
            Combat.testFilter = new Set();
            await t.waitFrames(10);

            // Code-made motion watch: every frame, the fighters' sprites stay where RMMZ puts them.
            const motion = { samples: 0, bad: [], watched: new Map() };
            const spriteOfUnit = u => {
                const ev = w.eventOf(u.id);
                const ss = SceneManager._scene._spriteset;
                return ev && ss ? ss._characterSprites.find(s => s._character === ev) || null : null;
            };
            // Each watched sprite is checked at the moment it sets its position (a wrapper on that one sprite's
            // updatePosition, test only): the position every plugin's updatePosition gives it against its event's screen
            // position right then, so frames with two updates and walking units compare like with like.
            const watch = u => {
                const sp = spriteOfUnit(u);
                if (!sp || sp._ufMotionWatch) return;
                const rec = { name: u.name, base: null };
                const orig = sp.updatePosition;
                sp._ufMotionWatch = rec;
                sp.updatePosition = function() {
                    orig.call(this);
                    const ch = this._character;
                    if (!ch) return;
                    const dx = this.x - ch.screenX(), dy = this.y - ch.screenY();
                    if (!rec.base) {
                        rec.base = { dx, dy };
                        return;
                    }
                    motion.samples++;
                    const bc = this.getBlendColor();
                    if (dx !== rec.base.dx || dy !== rec.base.dy || this.rotation || this.scale.x !== 1 || this.scale.y !== 1 || bc[3] || ch._combatOffset || ch._combatAnim || ch.jumpHeight()) {
                        if (motion.bad.length < 5) motion.bad.push(`${rec.name}: offset (${dx - rec.base.dx},${dy - rec.base.dy}) rotation ${this.rotation} scale ${this.scale.x}/${this.scale.y} blend ${bc[3]} combatOffset ${!!ch._combatOffset} combatAnim ${!!ch._combatAnim} jump ${ch.jumpHeight()}`);
                    }
                };
                motion.watched.set(u.id, rec);
            };
            const sampleMotion = () => {};
            const framesWatching = async n => {
                for (let i = 0; i < n; i++) {
                    await t.waitFrames(1);
                    sampleMotion();
                }
            };
            const waitWatching = async (cond, ms) => {
                const end = performance.now() + ms;
                while (!cond()) {
                    if (performance.now() > end) return false;
                    await t.waitFrames(1);
                    sampleMotion();
                }
                return true;
            };

            try {
                // 1. hit_chance: 100,000 seeded rolls per pair against the formula.
                {
                    const rng = w.mulberry32(0xc0ffee);
                    const pairs = [[1850, 576], [768, 1344], [4000, 4000]];
                    const N = 100000;
                    const res = pairs.map(([A, D]) => {
                        let h = 0;
                        for (let i = 0; i < N; i++) if (roll({ A, D, maxHit: 0 }, rng).hit) h++;
                        return { A, D, observed: h / N, formula: Combat.hitChance(A, D) };
                    });
                    const exact = Math.abs(Combat.hitChance(1850, 576) - (1 - 578 / 3702)) < 1e-12 && Math.abs(Combat.hitChance(768, 1344) - 768 / 2690) < 1e-12;
                    t.check("hit_chance", exact && res.every(r => Math.abs(r.observed - r.formula) <= 0.01),
                        res.map(r => `A ${r.A} D ${r.D}: ${N} rolls hit ${(r.observed * 100).toFixed(2)}%, formula ${(r.formula * 100).toFixed(2)}%`).join("; ") + `; formula values exact ${exact}`);
                }

                // 2. max_hit: known effective strength and bonus -> known max hit; 3000 attacks never exceed it and span 0..max.
                const dummy = person("TEST_combat_dummy", ax + 1, ay + 1, L(1, 1, 1, 99), {}, { combat: { mode: "manual" } });
                {
                    const known = [[71, 50, 13], [9, 0, 1], [110, 100, 28], [68, 24, 9]];
                    const formulaOk = known.every(([e, b, m]) => Combat.maxHitFor(e, b) === m);
                    const att = person("TEST_combat_striker", ax + 2, ay + 1, L(99, 60, 1, 99), { weapon: "sword_long" }, { combat: { style: "aggressive", mode: "manual" } });
                    const n = Combat.describeAttack(att, dummy);
                    // strength 60 + aggressive 3 + 8 = 71; long sword strength bonus from the catalog
                    const bonus = Combat.bonusesOf(att).strength;
                    const want = Math.floor(0.5 + 71 * (bonus + 64) / 640);
                    const seen = new Map();
                    let maxSeen = 0, over = 0, hitsN = 0;
                    for (let i = 0; i < 3000; i++) {
                        dummy.data.hp = 99;
                        const r = Combat.resolveAttack(att, dummy);
                        if (!r) continue;
                        if (r.hit) hitsN++;
                        seen.set(r.damage, (seen.get(r.damage) || 0) + 1);
                        if (r.damage > maxSeen) maxSeen = r.damage;
                        if (r.damage > n.maxHit) over++;
                    }
                    const span = [];
                    for (let v = 0; v <= n.maxHit; v++) if (!seen.has(v)) span.push(v);
                    t.check("max_hit", formulaOk && n.maxHit === want && want > 0 && over === 0 && maxSeen === n.maxHit && span.length === 0,
                        `formula: ${known.map(([e, b, m]) => `(${e}, ${b}) -> ${Combat.maxHitFor(e, b)} want ${m}`).join(", ")}; strength 60 aggressive with a long sword (strength bonus ${bonus}): max hit ${n.maxHit}, want ${want}; ` +
                        `3000 attacks, ${hitsN} hits, largest ${maxSeen}, over the max ${over}, damage values never seen in 0..${n.maxHit}: ${span.length ? span.join(",") : "none"}`);
                    made.delete(att.id);
                    w.removeUnit(att.id);
                }

                // 3. styles: aggressive raises the max hit, defensive the defence roll, accurate the attack roll; combat:hit carries the style.
                {
                    const att = person("TEST_combat_stylist", ax + 2, ay + 1, L(60, 60, 60, 99), { weapon: "sword_long" }, { combat: { mode: "manual" } });
                    Combat.setStyle(att, "accurate");
                    const acc = Combat.describeAttack(att, dummy), accDef = Combat.defenceRoll(att, "slash");
                    Combat.setStyle(att, "aggressive");
                    const agg = Combat.describeAttack(att, dummy);
                    Combat.setStyle(att, "defensive");
                    const defDef = Combat.defenceRoll(att, "slash");
                    const before = hits.length;
                    const order = ["aggressive", "defensive", "controlled", "accurate"];
                    for (const s of order) {
                        Combat.setStyle(att, s);
                        dummy.data.hp = 99;
                        Combat.resolveAttack(att, dummy);
                    }
                    const evs = hits.slice(before).map(h => h.e);
                    const keysOk = evs.every(e => Object.keys(e).sort().join(",") === "attackType,attacker,damage,hit,style,target" && e.attacker === att && e.target === dummy &&
                        typeof e.damage === "number" && typeof e.hit === "boolean" && TYPES.includes(e.attackType) && (e.hit || e.damage === 0));
                    const stylesOk = evs.length === 4 && evs.every((e, i) => e.style === order[i]);
                    t.check("styles", agg.maxHit > acc.maxHit && defDef > accDef && acc.A > agg.A && stylesOk && keysOk,
                        `long sword, levels 60: max hit accurate ${acc.maxHit}, aggressive ${agg.maxHit}; attack roll accurate ${acc.A}, aggressive ${agg.A}; defence roll (slash) accurate ${accDef}, defensive ${defDef}; ` +
                        `combat:hit styles ${evs.map(e => e.style).join(", ")} (want ${order.join(", ")}); payload keys ${evs.length ? Object.keys(evs[0]).join(",") : "none"}, types ${evs.map(e => e.attackType).join(",")}: ${keysOk}`);
                    made.delete(att.id);
                    w.removeUnit(att.id);
                }

                // 4. equipment: an iron sword beats a stone knife in expected damage per tick; iron and copper beat stone and wood
                //    within a class; a bow fires one arrow per shot and falls back to fists when they run out.
                {
                    const wolf = creature("TEST_combat_wolf_target", "wolf", ax + 4, ay + 1, { combat: { mode: "manual" } });
                    const att = person("TEST_combat_armed", ax + 5, ay + 1, L(40, 40, 40, 99), {}, { combat: { mode: "manual" } });
                    const ep = {};
                    for (const id of ["stone_knife", "dagger_iron", "sword_short", "stone_axe", "axe_iron", "club", "mace"]) {
                        att.data.equipment = { weapon: id };
                        const n = Combat.describeAttack(att, wolf);
                        ep[id] = n.chance * (n.maxHit / 2) / n.speed;
                    }
                    att.data.equipment = { weapon: "bow_short" };
                    let bowOk = false, bowDetail = "no UF.Items";
                    if (I && typeof I.give === "function") {
                        I.give("arrows", 3, att.id);
                        const counts = [I.count(att.id, "arrows")];
                        const shots = [];
                        for (let i = 0; i < 3; i++) {
                            const r = Combat.resolveAttack(att, wolf);
                            wolf.data.hp = Combat.maxHp(wolf);
                            shots.push(r ? r.attackType : "none");
                            counts.push(I.count(att.id, "arrows"));
                        }
                        const after = Combat.describeAttack(att, wolf);
                        bowOk = counts.join(",") === "3,2,1,0" && shots.every(s => s === "ranged") && after.outOfAmmo === "arrows" && after.attackType === "crush";
                        bowDetail = `bow with 3 arrows: arrows ${counts.join(" -> ")} after each shot (types ${shots.join(",")}); then out of ammo "${after.outOfAmmo}", attacking with ${after.weapon} (${after.attackType})`;
                    }
                    const f = v => v.toFixed(3);
                    const tiers = ep.sword_short > ep.stone_knife && ep.dagger_iron > ep.stone_knife && ep.axe_iron > ep.stone_axe && ep.mace > ep.club;
                    t.check("equipment", tiers && bowOk,
                        `expected damage per tick vs a wolf, levels 40: stone knife ${f(ep.stone_knife)}, iron dagger ${f(ep.dagger_iron)}, iron short sword ${f(ep.sword_short)}; stone axe ${f(ep.stone_axe)}, iron axe ${f(ep.axe_iron)}; wooden club ${f(ep.club)}, copper mace ${f(ep.mace)}; ${bowDetail}`);
                    for (const u of [wolf, att]) { made.delete(u.id); w.removeUnit(u.id); }
                }

                // 5. creatures: every species has a combat block; wolf, hare and troll as specified; a level-1 colonist usually loses to a wolf.
                {
                    const keys = ["attack", "strength", "defence", "ranged", "magic", "hitpoints", "attackSpeed", "attackType", "maxHitBonus", "bonuses"];
                    const missing = speciesList.filter(s => !s.combat || keys.some(k => s.combat[k] === undefined)).map(s => s.id);
                    const wolf = creature("TEST_combat_wolf", "wolf", ax + 7, ay + 1, { combat: { mode: "manual" } });
                    const hare = creature("TEST_combat_hare", "hare", ax + 8, ay + 1, { combat: { mode: "manual" } });
                    const troll = creature("TEST_combat_troll", "troll", ax + 9, ay + 1, { combat: { mode: "manual" } });
                    const cat2 = creature("TEST_combat_wildcat", "wildcat", ax + 10, ay + 1, { combat: { mode: "manual" } });
                    const hb = sp("hare") && sp("hare").combat;
                    const hareOk = !!hb && ["attack", "strength", "defence", "ranged", "magic"].every(k => hb[k] === 1) && hb.hitpoints === 2 && Combat.maxHp(hare) === 2;
                    const lv = { wolf: Combat.combatLevel(wolf), troll: Combat.combatLevel(troll), hare: Combat.combatLevel(hare) };
                    const typesOk = Combat.describeAttack(wolf, hare).attackType === "stab" && Combat.describeAttack(troll, hare).attackType === "crush" && Combat.describeAttack(cat2, hare).attackType === "slash";
                    const novice = person("TEST_combat_novice", ax + 11, ay + 1, L(1, 1, 1, 10), {});
                    const veteran = person("TEST_combat_veteran", ax + 12, ay + 1, L(40, 40, 40, 40), { weapon: "sword_short", torso: "mail_iron", head: "helmet_iron", shield: "shield_iron" });
                    let wolfWins = 0, vetWins = 0, ticks = 0;
                    for (let s = 1; s <= 100; s++) {
                        const r = Combat.duel(novice, wolf, s);
                        if (r.winner === "b") wolfWins++;
                        ticks += r.ticks;
                        if (Combat.duel(veteran, wolf, 1000 + s).winner === "a") vetWins++;
                    }
                    t.check("creatures", missing.length === 0 && hareOk && lv.wolf >= 15 && lv.wolf <= 25 && lv.troll >= 60 && lv.troll <= 80 && typesOk && wolfWins >= 80 && vetWins >= 80,
                        `${speciesList.length} species, without a full combat block: ${missing.join(", ") || "none"}; hare 1s and 2 hp ${hareOk}; fighting levels wolf ${lv.wolf}, troll ${lv.troll}, hare ${lv.hare}; ` +
                        `attack types wolf/troll/wildcat stab/crush/slash ${typesOk}; 100 duels: the wolf beat a level-1 colonist (10 hp, fists) ${wolfWins} times (avg ${(ticks / 100).toFixed(1)} ticks); a level-40 colonist in iron beat the wolf ${vetWins} times`);
                    for (const u of [wolf, hare, troll, cat2, novice, veteran]) { made.delete(u.id); w.removeUnit(u.id); }
                }

                // 6. hitsplats: a hit shows a red splat with its number, a miss a blue 0; at most 4 stack; gone after 1 s; no text popups.
                const fxLayer = Combat.layer();
                const splatsOn = u => fxLayer.visibleSprites().filter(s => s.kind === "splat" && s.unitId === u.id);
                const barOn = u => fxLayer.visibleSprites().filter(s => (s.kind === "barBack" || s.kind === "barFill") && s.unitId === u.id);
                const striker = person("TEST_combat_hitter", ax + 2, ay + 1, L(99, 50, 1, 99), { weapon: "sword_short" }, { combat: { mode: "manual" } });
                {
                    Combat.clearFx();
                    await t.waitFrames(2);
                    dummy.data.hp = 99;
                    const r1 = Combat.resolveAttack(striker, dummy, { rng: alwaysHigh });
                    await t.waitFrames(2);
                    const red = splatsOn(dummy);
                    const px = (bmp, x, y) => {
                        const hex = bmp.getPixel(x, y);
                        return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
                    };
                    const dsp = spriteOfUnit(dummy);
                    const redPx = red[0] ? px(red[0].bitmap, 4, 12) : [0, 0, 0];
                    const redOk = !!r1 && r1.hit && r1.damage > 0 && red.length === 1 && red[0].damage === r1.damage && red[0].bitmap === Combat.splatBitmap(r1.damage) &&
                        red[0].bitmap._ufSplat === r1.damage && redPx[0] > 140 && redPx[1] < 80 && redPx[2] < 80 && !!dsp && Math.abs(red[0].x - dsp.x) <= 2 && red[0].y < dsp.y && red[0].y > dsp.y - 80;
                    Combat.clearFx();
                    await t.waitFrames(2);
                    const r0 = Combat.resolveAttack(striker, dummy, { rng: alwaysLow });
                    await t.waitFrames(2);
                    const blue = splatsOn(dummy);
                    const bluePx = blue[0] ? px(blue[0].bitmap, 5, 12) : [0, 0, 0];
                    const blueOk = !!r0 && !r0.hit && r0.damage === 0 && blue.length === 1 && blue[0].damage === 0 && blue[0].bitmap === Combat.splatBitmap(0) && bluePx[2] > 140 && bluePx[0] < 100;
                    for (let i = 0; i < 6; i++) {
                        dummy.data.hp = 99;
                        Combat.resolveAttack(striker, dummy);
                    }
                    await t.waitFrames(2);
                    const stacked = splatsOn(dummy);
                    const slots = new Set(stacked.map(s => s.slot));
                    const stackOk = stacked.length === 4 && slots.size === 4;
                    const popup = Combat.addPopup(dummy.x, dummy.y, "MISS");
                    await t.waitFrames(65);
                    const gone = splatsOn(dummy).length;
                    const ss = SceneManager._scene._spriteset;
                    const kids = fxLayer.allChildren();
                    const onlyCached = kids.every(s => !s.bitmap || s.bitmap._ufSplat !== undefined || s.bitmap._ufBar !== undefined);
                    const noText = ss._ufCombatPopups === undefined && onlyCached && !!popup && popup.dmg === 0;
                    t.check("hitsplats", redOk && blueOk && stackOk && gone === 0 && noText,
                        `hit: damage ${r1 && r1.damage}, ${red.length} splat(s) showing ${red[0] ? red[0].damage : "-"} at (${red[0] ? red[0].x : "-"},${red[0] ? red[0].y : "-"}) over the unit at (${dsp ? dsp.x : "-"},${dsp ? dsp.y : "-"}), colour rgb(${redPx.join(",")}): ${redOk}; ` +
                        `miss: ${blue.length} splat(s) showing ${blue[0] ? blue[0].damage : "-"}, colour rgb(${bluePx.join(",")}): ${blueOk}; after 7 more attacks ${stacked.length} splats in ${slots.size} slots; ${gone} left after ~1 s; ` +
                        `old popup layer ${ss._ufCombatPopups === undefined ? "absent" : "present"}, ${kids.length} layer sprites all cached splat/bar bitmaps ${onlyCached}, addPopup("MISS") -> splat ${popup ? popup.dmg : "none"}`);
                }

                // 7. health_bar: green over red above the head while in combat, width = hp share, hidden 6 s after the last hit.
                {
                    const bystander = person("TEST_combat_bystander", ax + 4, ay + 1, L(1, 1, 1, 10), {});
                    Combat.clearFx();
                    dummy.data.hp = 99;
                    Combat.resolveAttack(striker, dummy, { rng: alwaysHigh });
                    await t.waitFrames(2);
                    const bm = Combat.barBitmaps();
                    const bars1 = barOn(dummy);
                    const back = bars1.find(s => s.kind === "barBack"), fill = bars1.find(s => s.kind === "barFill");
                    const want1 = Math.round(bm.width * dummy.data.hp / Combat.maxHp(dummy));
                    // The head: the first opaque row of the dummy's frame, found here independently of the plugin.
                    const dsp = spriteOfUnit(dummy);
                    let head = null;
                    if (dsp && dsp.bitmap && dsp.bitmap.isReady()) {
                        const f = dsp._frame, cv = document.createElement("canvas");
                        cv.width = f.width;
                        cv.height = f.height;
                        const cx = cv.getContext("2d", { willReadFrequently: true });
                        cx.drawImage(dsp.bitmap._canvas || dsp.bitmap._image, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height);
                        const data = cx.getImageData(0, 0, f.width, f.height).data;
                        let top = -1;
                        for (let y = 0; y < f.height && top < 0; y++) for (let x = 0; x < f.width; x++) if (data[(y * f.width + x) * 4 + 3] > 16) { top = y; break; }
                        head = dsp.y - dsp.anchor.y * f.height + top;
                    }
                    const gpx = bm.fill.getPixel(5, 2), rpx = bm.back.getPixel(bm.width - 2, 3);
                    const colours = parseInt(gpx.slice(3, 5), 16) > 150 && parseInt(gpx.slice(1, 3), 16) < 100 && parseInt(rpx.slice(1, 3), 16) > 150 && parseInt(rpx.slice(3, 5), 16) < 80;
                    const placed = !!back && !!fill && head !== null && back.y + 6 <= head && back.y >= head - 16 && Math.abs(back.x + (bm.width + 2) / 2 - dsp.x) <= 1;
                    const width1 = fill ? fill.width : -1;
                    dummy.data.hp = 40;
                    Combat.resolveAttack(striker, dummy, { rng: alwaysLow });
                    await t.waitFrames(2);
                    const fill2 = barOn(dummy).find(s => s.kind === "barFill");
                    const want2 = Math.round(bm.width * 40 / Combat.maxHp(dummy));
                    const noBarBystander = barOn(bystander).length === 0;
                    const shownAt = performance.now();
                    await t.waitUntil(() => barOn(dummy).length === 0, 9000, "the health bar to hide");
                    const hiddenAfter = (performance.now() - shownAt) / 1000;
                    t.check("health_bar", !!back && !!fill && width1 === want1 && !!fill2 && fill2.width === want2 && want1 !== want2 && placed && colours && noBarBystander && hiddenAfter >= 5.5 && hiddenAfter <= 6.8,
                        `after a hit: bar ${back ? `at (${back.x},${back.y})` : "missing"}, green ${width1} px of ${bm.width} (want ${want1}), head row y ${head === null ? "?" : head.toFixed(1)}: above the head ${placed}; ` +
                        `at 40/${Combat.maxHp(dummy)} hp green ${fill2 ? fill2.width : -1} px (want ${want2}); colours green ${gpx} over red ${rpx}: ${colours}; bystander bar ${!noBarBystander}; hidden ${hiddenAfter.toFixed(2)} s after the last hit`);
                    made.delete(bystander.id);
                    w.removeUnit(bystander.id);
                }
                made.delete(striker.id);
                w.removeUnit(striker.id);

                // 8. attack_speed (+ no_code_motion samples): unarmed (4 ticks) and an iron axe (6 ticks) through the loop.
                {
                    const a4 = person("TEST_combat_fists", ax + 2, ay + 4, L(1, 1, 1, 99), {}, { combat: { mode: "manual" } });
                    const t4 = person("TEST_combat_post4", ax + 3, ay + 4, L(1, 1, 99, 99), {}, { combat: { mode: "manual" } });
                    const a6 = person("TEST_combat_axe", ax + 6, ay + 4, L(1, 1, 1, 99), { weapon: "axe_iron" }, { combat: { mode: "manual" } });
                    const t6 = person("TEST_combat_post6", ax + 7, ay + 4, L(1, 1, 99, 99), {}, { combat: { mode: "manual" } });
                    for (const u of [a4, t4, a6, t6]) Combat.testFilter.add(u.id);
                    await t.waitFrames(3);
                    for (const u of [a4, t4, a6, t6]) watch(u);
                    Combat.engage(a4, t4);
                    Combat.engage(a6, t6);
                    const from = hits.length;
                    const of = a => hits.slice(from).filter(h => h.e.attacker === a);
                    const inTime = await waitWatching(() => of(a4).length >= 5 && of(a6).length >= 4, 20000);
                    const gaps = list => list.slice(1).map((h, i) => [h.updates - list[i].updates, h.frame - list[i].frame]);
                    const g4 = gaps(of(a4)), g6 = gaps(of(a6));
                    const tf = cfg().tickFrames;
                    const exact = g4.every(g => g[0] === 4 * tf) && g6.every(g => g[0] === 6 * tf);
                    const frames = g4.every(g => Math.abs(g[1] - 4 * tf) <= 2) && g6.every(g => Math.abs(g[1] - 6 * tf) <= 2);
                    t.check("attack_speed", inTime && exact && frames && tf === 36,
                        `${inTime ? "" : "TIMED OUT (20 s) before 5 unarmed and 4 axe attacks; "}tick = ${tf} map updates at x${UF.Time && UF.Time.multiplier ? UF.Time.multiplier() : 1}; unarmed (4 ticks) gaps in map updates / frames: ${g4.map(g => g.join("/")).join(", ")}; iron axe (6 ticks): ${g6.map(g => g.join("/")).join(", ")}`);
                    for (const u of [a4, t4, a6, t6]) { Combat.testFilter.delete(u.id); made.delete(u.id); w.removeUnit(u.id); }
                }

                // 9. retaliate: a hostile 4 cells away seeks out a friendly, walks up and attacks; the friendly hits back.
                //    A fleeing unit and a manual one do not hit back.
                {
                    const friend = person("TEST_combat_friend", ax + 2, ay + 6, L(10, 10, 10, 99), {});
                    const raider = foe("TEST_combat_raider", ax + 6, ay + 6, L(10, 10, 10, 99));
                    const runner = person("TEST_combat_runner", ax + 10, ay + 2, L(1, 1, 1, 99), {}, { combat: { mode: "flee" } });
                    const stoic = person("TEST_combat_stoic", ax + 12, ay + 2, L(1, 1, 1, 99), {}, { combat: { mode: "manual" } });
                    const poker = foe("TEST_combat_poker", ax + 11, ay + 3, L(1, 1, 1, 99), { combat: { mode: "manual" } });
                    for (const u of [friend, raider]) Combat.testFilter.add(u.id);
                    await t.waitFrames(3);
                    for (const u of [friend, raider]) watch(u);
                    const from = hits.length;
                    const by = (a, b) => hits.slice(from).filter(h => h.e.attacker === a && h.e.target === b);
                    const tick0 = st.tick;
                    const inTime = await waitWatching(() => by(raider, friend).length >= 1 && by(friend, raider).length >= 1, 20000);
                    const firstHit = by(raider, friend)[0], firstBack = by(friend, raider)[0];
                    const back = friend.data.combat && friend.data.combat.targetId === raider.id;
                    Combat.resolveAttack(poker, runner);
                    Combat.resolveAttack(poker, stoic);
                    const runnerOk = runner.data.combat.targetId === null && runner.data.combat.fleeFrom === poker.id;
                    const stoicOk = stoic.data.combat.targetId === null;
                    t.check("retaliate", inTime && !!firstHit && !!firstBack && back && firstBack.updates > firstHit.updates && runnerOk && stoicOk,
                        `${inTime ? "" : "TIMED OUT (20 s) waiting for the raider's hit and the friend's reply; "}raider (hostile, mode ${Combat.modeOf(raider)}, started 4 cells away at tick ${tick0}) chose the friend itself and hit it at map update ${firstHit ? firstHit.updates : "never"}; ` +
                        `friend (mode ${Combat.modeOf(friend)}) targeted the raider: ${back}, hit back at update ${firstBack ? firstBack.updates : "never"}; fleeing unit: target ${runner.data.combat.targetId}, flees from ${runner.data.combat.fleeFrom}; manual unit: target ${stoic.data.combat.targetId}`);
                    for (const u of [friend, raider, runner, stoic, poker]) { Combat.testFilter.delete(u.id); made.delete(u.id); w.removeUnit(u.id); }
                }

                // Screenshot: a fight at zoom 1 with hitsplats and health bars.
                {
                    const troll = creature("TEST_combat_troll_shot", "troll", ax + 6, ay + 3, { tags: ["monster", "hostile"], combat: { mode: "nearest" } });
                    const wolf = creature("TEST_combat_wolf_shot", "wolf", ax + 9, ay + 3, { tags: ["predator", "hostile"], combat: { mode: "nearest" } });
                    const p1 = person("TEST_combat_guard", ax + 5, ay + 3, L(60, 60, 60, 99), { weapon: "sword_long", torso: "mail_iron", shield: "shield_iron" }, { combat: { mode: "nearest" } });
                    const p2 = person("TEST_combat_hunter", ax + 10, ay + 3, L(30, 30, 30, 99), { weapon: "mace" }, { combat: { mode: "nearest" } });
                    const p3 = person("TEST_combat_scout", ax + 6, ay + 4, L(20, 20, 20, 99), { weapon: "dagger_iron" }, { combat: { mode: "nearest" } });
                    Combat.hp(troll);
                    Combat.hp(wolf);
                    troll.data.hp = 60; // part-empty bars, and nobody dies before the picture
                    wolf.data.hp = 18;
                    for (const u of [troll, wolf, p1, p2, p3]) Combat.testFilter.add(u.id);
                    view(ax + 7, ay + 3, 0);
                    await t.waitFrames(3);
                    for (const u of [troll, wolf, p1, p2, p3]) watch(u);
                    const from = hits.length;
                    const shotReady = await waitWatching(() => {
                        const recent = hits.slice(from).filter(h => st.updates - h.updates <= 24);
                        return recent.length >= 3 && new Set(recent.map(h => h.e.target.id)).size >= 2;
                    }, 20000);
                    if (!shotReady) console.warn("[UF_Combat test] the screenshot fight had no three recent hits on two units within 20 s");
                    view(ax + 7, ay + 3, 0);
                    await t.waitFrames(1);
                    t.screenshot("fight_zoom1");
                    for (const u of [troll, wolf, p1, p2, p3]) { Combat.testFilter.delete(u.id); made.delete(u.id); w.removeUnit(u.id); }
                }

                // 10. no_code_motion: the watched fighters' sprites never left RMMZ's position, turned, scaled or flashed.
                {
                    const probe = person("TEST_combat_probe", ax + 2, ay + 2, L(1, 1, 1, 99), {}, { combat: { mode: "manual" } });
                    await t.waitFrames(2);
                    watch(probe);
                    Combat.playAttackAnimation(probe, dummy);
                    Combat.playHitAnimation(probe, dummy);
                    await framesWatching(20);
                    t.check("no_code_motion", motion.samples >= 500 && motion.bad.length === 0,
                        `${motion.samples} sprite position updates of ${motion.watched.size} fighters over the speed, retaliation and screenshot fights plus direct attack/hit animation calls, each checked as the sprite set its position; off its event's position, rotated, scaled, flashed or jumping: ${motion.bad.length ? motion.bad.join(" | ") : "never"}`);
                    made.delete(probe.id);
                    w.removeUnit(probe.id);
                }

                // 11. death: 0 hp -> removed, the species yields drop, combat:kill; a person's death goes into the chronicle.
                {
                    const killer = person("TEST_combat_slayer", ax + 2, ay + 2, L(99, 99, 99, 99), { weapon: "sword_short" }, { combat: { mode: "manual" } });
                    const wolf = creature("TEST_combat_doomed_wolf", "wolf", ax + 3, ay + 2, { combat: { mode: "manual" } });
                    const cell = { area: { x: area.x, y: area.y }, x: wolf.x, y: wolf.y };
                    const yields = (sp("wolf") && sp("wolf").yields) || {};
                    const before = {};
                    for (const id of Object.keys(yields)) before[id] = I ? I.count(cell, id) : 0;
                    wolf.data.hp = 1;
                    const k0 = kills.length, h0 = hits.length;
                    const r = Combat.resolveAttack(killer, wolf, { rng: alwaysHigh });
                    const removed = !w.unit(wolf.id);
                    const dropsOk = !!I && Object.keys(yields).length > 0 && Object.keys(yields).every(id => I.count(cell, id) === before[id] + yields[id]);
                    const k = kills.slice(k0);
                    const killOk = k.length === 1 && k[0].attacker === killer && k[0].target === wolf && hits.length === h0 + 1 && hits[h0].e.target === wolf && hits[h0].e.damage === 1;
                    const victim = person("TEST_combat_fallen", ax + 3, ay + 2, L(5, 5, 5, 10), {}, { kind: "person", combat: { mode: "manual" } });
                    victim.data.hp = 1;
                    const H = window.UF.History;
                    const ev0 = H && H.current && H.current() ? H.current().events.length : 0;
                    Combat.resolveAttack(killer, victim, { rng: alwaysHigh });
                    const evs = H && H.current && H.current() ? H.current().events.slice(ev0) : [];
                    const chron = !H || evs.some(e => e.type === "death" && e.text.includes("TEST_combat_fallen") && e.text.includes("TEST_combat_slayer"));
                    t.check("death", !!r && r.killed && removed && dropsOk && killOk && chron && !w.unit(victim.id),
                        `wolf at 1 hp: killed ${r && r.killed}, removed ${removed}; on its cell ${Object.keys(yields).map(id => `${id} ${before[id]} -> ${I ? I.count(cell, id) : "?"}`).join(", ")} (yields ${JSON.stringify(yields)}): ${dropsOk}; ` +
                        `combat:kill ${k.length}x with attacker/target right ${killOk} (combat:hit first, damage ${hits[h0] ? hits[h0].e.damage : "-"}); person killed: removed ${!w.unit(victim.id)}, chronicle ${H ? `"${(evs.find(e => e.type === "death") || {}).text || "no line"}"` : "no UF.History"}`);
                    made.delete(killer.id);
                    w.removeUnit(killer.id);
                    made.delete(wolf.id);
                    made.delete(victim.id);
                }

                // 12. regen: 1 hitpoint per 100 ticks, on the tick.
                {
                    const hurt = person("TEST_combat_mending", ax + 2, ay + 2, L(1, 1, 1, 20), {});
                    Combat.hp(hurt);
                    hurt.data.hp = 17;
                    const full = person("TEST_combat_whole", ax + 3, ay + 2, L(1, 1, 1, 20), {});
                    Combat.hp(full);
                    const every = pos(cfg().regen.everyTicks, 100);
                    const tf = cfg().tickFrames;
                    // Move the counters to one update before the last tick of a regen period.
                    st.tick = Math.ceil((st.tick + 2) / every) * every - 1;
                    st.updates = st.tick * tf + (tf - 1);
                    const tick0 = st.tick;
                    await t.waitUntil(() => st.tick > tick0, 5000, "the next tick");
                    const one = hurt.data.hp;
                    await t.waitUntil(() => st.tick > tick0 + 1, 5000, "one more tick");
                    const still = hurt.data.hp;
                    t.check("regen", one === 18 && still === 18 && full.data.hp === 20,
                        `hp 17/20 -> ${one} on tick ${tick0 + 1} (a multiple of ${every}), ${still} a tick later; a unit at 20/20 stays at ${full.data.hp}`);
                    for (const u of [hurt, full]) { made.delete(u.id); w.removeUnit(u.id); }
                }

                // 13. saved: unit.data.combat and hp, and UF.World.state.combat survive a save round-trip.
                {
                    const u = person("TEST_combat_saved", ax + 2, ay + 2, L(5, 5, 5, 30), {}, { combat: { mode: "protect", style: "defensive", attackType: "crush" } });
                    Combat.engage(u, dummy);
                    u.data.hp = 23;
                    u.data.combat.nextAttackTick = st.tick + 3;
                    const contents = DataManager.makeSaveContents();
                    const back = JsonEx.parse(JsonEx.stringify(contents));
                    const bu = back.ufWorld && back.ufWorld.units ? back.ufWorld.units[u.id] : null;
                    const same = !!bu && JSON.stringify(bu.data.combat) === JSON.stringify(u.data.combat) && bu.data.hp === 23 && bu.data.maxHp === u.data.maxHp;
                    const stSame = !!back.ufWorld && JSON.stringify(back.ufWorld.combat) === JSON.stringify(st);
                    t.check("saved", contents.ufWorld === w.state && same && stSame,
                        `save holds the live world ${contents.ufWorld === w.state}; unit data.combat ${bu ? JSON.stringify(bu.data.combat) : "missing"} hp ${bu ? bu.data.hp : "-"}: ${same}; state.combat ${back.ufWorld ? JSON.stringify(back.ufWorld.combat) : "-"}: ${stSame}`);
                    made.delete(u.id);
                    w.removeUnit(u.id);
                }
                made.delete(dummy.id);
                w.removeUnit(dummy.id);

                // 13b. Faction aid: nearby faction members come to the aid of an attacked ally
                {
                    const axf = ax + 2, ayf = ay + 2;
                    const victim = person("TEST_fac_victim", axf, ayf, L(10, 10, 10, 50), {}, { faction: "test_aid_fac", combat: { mode: "defend" } });
                    const helperClose = person("TEST_fac_helper_close", axf + 3, ayf, L(10, 10, 10, 50), {}, { faction: "test_aid_fac", combat: { mode: "defend" } });
                    const helperFar = person("TEST_fac_helper_far", axf + 15, ayf, L(10, 10, 10, 50), {}, { faction: "test_aid_fac", combat: { mode: "defend" } });
                    const otherFac = person("TEST_fac_other", axf + 2, ayf + 1, L(10, 10, 10, 50), {}, { faction: "other_fac", combat: { mode: "defend" } });
                    const attacker = foe("TEST_fac_attacker", axf + 1, ayf, L(10, 10, 10, 50), { faction: "enemy_fac" });

                    let aidEvent = null;
                    const onAid = e => { aidEvent = e; };
                    UF.Events.on("combat:aid", onAid);

                    try {
                        const res = Combat.resolveAttack(attacker, victim, { rng: () => 0.5 });
                        t.check("faction_aid_called", !!res && !!aidEvent && aidEvent.victim === victim && aidEvent.attacker === attacker && aidEvent.helpers.includes(helperClose) && helperClose.data.combat.targetId === attacker.id,
                            `aid called: event ${!!aidEvent}, helper target ${helperClose.data.combat.targetId} === attacker ${attacker.id}`);

                        t.check("faction_aid_range", helperFar.data.combat.targetId !== attacker.id,
                            `far helper (> aidRadius 10) did not acquire target: targetId ${helperFar.data.combat.targetId}`);

                        t.check("faction_aid_isolated", otherFac.data.combat.targetId !== attacker.id,
                            `other faction helper did not join: targetId ${otherFac.data.combat.targetId}`);
                    } finally {
                        UF.Events.off("combat:aid", onAid);
                        for (const u of [victim, helperClose, helperFar, otherFac, attacker]) {
                            made.delete(u.id);
                            if (w.unit(u.id)) w.removeUnit(u.id);
                        }
                    }
                }

                // 14. perf: 100 units fighting (50 pairs), zoom 1/3 so all are drawn; the combat loop plus hitsplats and bars per frame.
                {
                    const pa = findBlock(20, 10, false) || { x: mid - 10, y: mid - 5 };
                    const fighters = [];
                    for (let r = 0; r < 10; r++) {
                        for (let c = 0; c < 5; c++) {
                            const x = pa.x + c * 4, y = pa.y + r;
                            const f = person(`TEST_combat_perf_f${r}_${c}`, x, y, L(20, 20, 50, 99), { weapon: "sword_short" });
                            const h = foe(`TEST_combat_perf_h${r}_${c}`, x + 1, y, L(20, 20, 50, 99), { combat: { mode: "nearest" } });
                            fighters.push(f, h);
                        }
                    }
                    for (const u of fighters) Combat.testFilter.add(u.id);
                    view(pa.x + 10, pa.y + 5, UF.Camera ? UF.Camera.levels.length - 1 : 0);
                    await t.waitFrames(40);
                    Combat.perf.simWorst = 0;
                    Combat.perf.drawWorst = 0;
                    Combat.perf.tickWorst = 0;
                    const p0 = Object.assign({}, Combat.perf), f0 = Graphics.frameCount, h0 = hits.length;
                    await t.waitFrames(360);
                    const frames = Graphics.frameCount - f0;
                    const sim = Combat.perf.simMs - p0.simMs, draw = Combat.perf.drawMs - p0.drawMs;
                    const perFrame = (sim + draw) / frames;
                    const hitsN = hits.length - h0;
                    const shown = fxLayer.visibleSprites();
                    const bars = shown.filter(s => s.kind === "barBack").length;
                    const perfOk = perFrame <= 0.5 && hitsN >= 50 && bars >= 50;
                    const perfDetail =
                        `${fighters.length} units fighting, ${frames} frames at x1, zoom ${UF.Camera ? UF.Camera.zoom().toFixed(2) : 1}: ${perFrame.toFixed(3)} ms per frame (loop ${(sim / frames).toFixed(3)}, drawing ${(draw / frames).toFixed(3)}; worst single update in the window: loop ${Combat.perf.simWorst.toFixed(2)} ms, drawing ${Combat.perf.drawWorst.toFixed(2)} ms, drawing updates over 1 ms: ${(Combat.perf.drawOver1 || 0) - (p0.drawOver1 || 0)}; frame reads ${(Combat.perf.frameReads || 0) - (p0.frameReads || 0)}, new splat bitmaps ${(Combat.perf.splatBitmaps || 0) - (p0.splatBitmaps || 0)}; ${(Combat.perf.ticks || 0) - (p0.ticks || 0)} ticks at ${(((Combat.perf.tickMs || 0) - (p0.tickMs || 0)) / Math.max(1, (Combat.perf.ticks || 0) - (p0.ticks || 0))).toFixed(2)} ms each, worst ${(Combat.perf.tickWorst || 0).toFixed(2)} ms; performance.now); ` +
                        `${hitsN} attacks, ${bars} health bars and ${shown.filter(s => s.kind === "splat").length} hitsplats drawn at the end`;
                    for (const u of fighters) { Combat.testFilter.delete(u.id); made.delete(u.id); if (w.unit(u.id)) w.removeUnit(u.id); }
                    // Normal play: the loop without the test filter looks at every unit in the area (reported, not a condition).
                    const filter0 = Combat.testFilter;
                    Combat.testFilter = null;
                    const k0 = Combat.perf.ticks || 0, m0 = Combat.perf.tickMs || 0;
                    const all = w.unitsInArea(area.x, area.y).length;
                    await t.waitUntil(() => (Combat.perf.ticks || 0) >= k0 + 5, 10000, "5 unfiltered ticks");
                    Combat.testFilter = filter0;
                    t.check("perf", perfOk, perfDetail + `; normal play (no test filter, not part of the condition): ${all} units in the area, ${(((Combat.perf.tickMs || 0) - m0) / 5).toFixed(2)} ms per tick over 5 ticks`);
                }

                // 15. no_math_random: the plugin file has no unseeded randomness.
                {
                    let text = "";
                    try {
                        const fs = require("fs"), path = require("path");
                        text = fs.readFileSync(path.join(nw.__dirname || process.cwd(), "js", "plugins", "UF_Combat.js"), "utf8");
                    } catch (e) {
                        text = "";
                    }
                    const needle = "Math" + ".random";
                    const count = text.split(needle).length - 1;
                    t.check("no_math_random", text.length > 5000 && text.includes("UF_Combat") && count === 0,
                        `js/plugins/UF_Combat.js read: ${text.length} characters; "${needle}" found ${count} time(s)`);
                }
            } finally {
                UF.Events.off("combat:hit", onHit);
                UF.Events.off("combat:kill", onKill);
                removeAll();
                Combat.testFilter = null;
                if (skillsLevel0) S.level = skillsLevel0;
                if (zoom0 !== null && UF.Camera) UF.Camera.setLevel(zoom0);
                if (speed0 !== null && UF.Time && typeof UF.Time.setLevel === "function") UF.Time.setLevel(speed0);
            }

            // 16. no_errors
            const errs = t.errorsSoFar().slice(errors0), mine = Combat.errors.slice(combatErrors0);
            t.check("no_errors", errs.length === 0 && mine.length === 0,
                `uncaught errors during the suite: ${errs.length ? errs.join("; ") : "none"}; errors caught inside UF_Combat: ${mine.length ? mine.join("; ") : "none"}`);
        });
    }
})();
