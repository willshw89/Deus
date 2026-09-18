//=============================================================================
// UF_Factions.js - Factions rolled from the world seed on every New Game
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Factions] Factions generated from the world seed each New Game: species, stances, homes (surface or underground), relations from allied to at war. F = ledger.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_WorldGen
 *
 * @help
 * Every New Game rolls a new set of factions from the world seed (the same
 * seed that builds the surface and the caves), using the "factions" section
 * of data/UF_WorldCatalog.json: species, stances, name syllables, counts.
 * Your colony (Adam and Eve) is always faction "player".
 *
 * Each pair of factions has a relation from -100 (at war) to +100 (allied).
 * Every world has at least one strong alliance and one serious hostility.
 * Everything is saved with the world.
 *
 * Press F on the map for the faction ledger.
 *
 * API and checks: docs/systems/UF_Factions.md
 * Replaced core methods: none (aliases only).
 * Replaces the earlier draft (5 fixed factions, commit a09d3fd/3f687a0);
 * window.$factionManager is kept as a thin compatibility layer.
 */

(() => {
    "use strict";

    function hash32(...parts) {
        let h = 2166136261 >>> 0;
        for (const part of parts) {
            let v = part >>> 0;
            for (let i = 0; i < 4; i++) {
                h ^= v & 255;
                h = Math.imul(h, 16777619) >>> 0;
                v >>>= 8;
            }
        }
        return h >>> 0;
    }
    function mulberry32(a) {
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);
    const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };

    const TIERS = [
        { id: "allied", label: "Allied", min: 50, color: "#22c55e" },
        { id: "friendly", label: "Friendly", min: 15, color: "#60a5fa" },
        { id: "neutral", label: "Neutral", min: -14, color: "#e2e8f0" },
        { id: "hostile", label: "Hostile", min: -49, color: "#f59e0b" },
        { id: "war", label: "At war", min: -100, color: "#ef4444" }
    ];
    const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#22d3ee", "#a3e635", "#fb923c", "#e879f9"];

    //-------------------------------------------------------------------------
    // Generation

    const Factions = {
        TIERS,
        config: () => (window.$ufWorldCatalog && $ufWorldCatalog.factions) || null
    };
    window.UF = window.UF || {};
    window.UF.Factions = Factions;

    /** Roll factions from state.seed into state.factions (deterministic: same seed, same factions). */
    Factions.generate = function(state) {
        const cfg = this.config();
        if (!cfg || !state) return null;
        const rand = mulberry32(hash32(state.seed, 0xfac7));
        const pick = arr => arr[Math.floor(rand() * arr.length)];
        const weighted = items => {
            let r = rand() * items.reduce((s, it) => s + (it.weight || 1), 0);
            for (const it of items) {
                r -= it.weight || 1;
                if (r <= 0) return it;
            }
            return items[items.length - 1];
        };
        const size = state.size, layers = state.layers || 0;
        const [cmin, cmax] = cfg.count || [4, 7];
        const count = cmin + Math.floor(rand() * (cmax - cmin + 1));
        const usedNames = new Set();
        const makeName = sp => {
            for (let i = 0; i < 30; i++) {
                const stem = capitalize(pick(cfg.names.start) + (rand() < 0.45 ? pick(cfg.names.start) : "") + pick(cfg.names.end));
                const full = `The ${stem} ${pick(sp.groups && sp.groups.length ? sp.groups : ["Folk"])}`;
                if (!usedNames.has(full)) {
                    usedNames.add(full);
                    return full;
                }
            }
            return `The ${sp.name} of ${usedNames.size}`;
        };

        const mid = Math.floor(size / 2);
        const list = [{
            id: "player",
            name: cfg.playerFaction.name,
            species: cfg.playerFaction.species,
            ethos: [],
            home: { area: { x: state.startArea.x, y: state.startArea.y, z: 0 }, x: mid, y: mid },
            color: "#4ade80",
            isPlayer: true,
            met: true,
            population: 2
        }];
        const usedHomes = new Set([`${state.startArea.x},${state.startArea.y},0`]);
        for (let i = 0; i < count; i++) {
            const sp = weighted(cfg.species);
            const ethos = [pick(cfg.ethos).id];
            if (rand() < 0.4) {
                const second = pick(cfg.ethos).id;
                if (!ethos.includes(second)) ethos.push(second);
            }
            const z = sp.home === "underground" && layers >= 1 ? 1 : 0;
            let area = null;
            for (let t = 0; t < 100 && !area; t++) {
                const ax = Math.floor(rand() * state.areasX), ay = Math.floor(rand() * state.areasY);
                const key = `${ax},${ay},${z}`;
                if (usedHomes.has(key) || (ax === state.startArea.x && ay === state.startArea.y)) continue;
                usedHomes.add(key);
                area = { x: ax, y: ay, z };
            }
            if (!area) area = { x: (state.startArea.x + 1 + i) % state.areasX, y: (state.startArea.y + 1) % state.areasY, z };
            list.push({
                id: `f${i + 1}`,
                name: makeName(sp),
                species: sp.id,
                ethos,
                home: { area, x: 32 + Math.floor(rand() * (size - 64)), y: 32 + Math.floor(rand() * (size - 64)) },
                color: COLORS[i % COLORS.length],
                isPlayer: false,
                met: false,
                population: 8 + Math.floor(rand() * 53)
            });
        }

        // Relations: species affinity + both sides' stances + chance.
        const aff = cfg.speciesAffinity || {};
        const speciesTerm = (a, b) => (a === b ? (cfg.sameSpecies || 0) : (aff[`${a}|${b}`] !== undefined ? aff[`${a}|${b}`] : (aff[`${b}|${a}`] || 0)));
        const ethosById = {};
        for (const e of cfg.ethos) ethosById[e.id] = e;
        const stanceTerm = (A, B) => A.ethos.reduce((v, id) => {
            const e = ethosById[id];
            return e ? v + (e.toAll || 0) + (B.ethos.includes(id) ? (e.toSame || 0) : 0) : v;
        }, 0);
        const spread = cfg.randomSpread !== undefined ? cfg.randomSpread : 30;
        const relations = {};
        for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
                const A = list[i], B = list[j];
                const v = speciesTerm(A.species, B.species) + stanceTerm(A, B) + stanceTerm(B, A) + (rand() * 2 - 1) * spread;
                relations[pairKey(A.id, B.id)] = clamp(Math.round(v), -100, 100);
            }
        }
        // Every world has some alignment and some hostility (VISION V18).
        const keys = Object.keys(relations);
        if (keys.length >= 2) {
            if (!keys.some(k => relations[k] >= 40)) {
                const best = keys.reduce((a, b) => (relations[a] >= relations[b] ? a : b));
                relations[best] = 60;
            }
            if (!keys.some(k => relations[k] <= -40)) {
                const worst = keys.filter(k => relations[k] < 40).reduce((a, b) => (relations[a] <= relations[b] ? a : b));
                relations[worst] = -60;
            }
        }
        state.factions = { version: 1, list, relations, log: [] };
        emit("factions:generated", state.factions);
        return state.factions;
    };

    //-------------------------------------------------------------------------
    // Queries and changes

    const data = () => {
        const W = window.UF && UF.World;
        if (!W || !W.state) return null;
        if (!W.state.factions) Factions.generate(W.state); // e.g. a save from before factions existed
        return W.state.factions;
    };
    Factions.state = data;
    Factions.all = () => (data() ? data().list : []);
    Factions.get = id => Factions.all().find(f => f.id === id) || null;
    Factions.player = () => Factions.get("player");
    Factions.relation = (a, b) => {
        if (a === b) return 100;
        const d = data();
        return d && d.relations[pairKey(a, b)] !== undefined ? d.relations[pairKey(a, b)] : 0;
    };
    Factions.tierOf = value => TIERS.find(t => value >= t.min) || TIERS[TIERS.length - 1];
    Factions.tierBetween = (a, b) => Factions.tierOf(Factions.relation(a, b));
    Factions.setRelation = function(a, b, value, reason = "") {
        const d = data();
        if (!d || a === b) return;
        const before = this.relation(a, b);
        const after = clamp(Math.round(value), -100, 100);
        d.relations[pairKey(a, b)] = after;
        d.log.push({ a, b, before, after, reason, day: window.$ufTime ? $ufTime.dateString : "" });
        if (d.log.length > 200) d.log.shift();
        emit("factions:relationChanged", a, b, before, after, reason);
    };
    Factions.adjust = function(a, b, delta, reason = "") {
        this.setRelation(a, b, this.relation(a, b) + delta, reason);
    };
    Factions.alliesOf = id => Factions.all().filter(f => f.id !== id && Factions.relation(id, f.id) >= 15);
    Factions.enemiesOf = id => Factions.all().filter(f => f.id !== id && Factions.relation(id, f.id) <= -15);
    Factions.meet = id => {
        const f = Factions.get(id);
        if (f && !f.met) {
            f.met = true;
            emit("factions:met", f);
        }
    };
    Factions.speciesName = id => {
        const cfg = Factions.config();
        const sp = cfg && cfg.species.find(s => s.id === id);
        return sp ? sp.name : id;
    };
    Factions.stanceNames = f => {
        const cfg = Factions.config();
        return f.ethos.map(id => (cfg.ethos.find(e => e.id === id) || { name: id }).name);
    };

    // New Game rolls new factions together with the new world.
    if (window.UF.Events && UF.Events.on) UF.Events.on("world:created", state => Factions.generate(state));

    //-------------------------------------------------------------------------
    // Compatibility with the earlier draft's $factionManager (standing = relation with the player's colony)

    window.$factionManager = {
        getAllFactions: () => Factions.all().map(f => Object.assign({}, f, { standing: Factions.relation("player", f.id) })),
        getFaction: id => Factions.get(id),
        getAlignmentTier: standing => Factions.tierOf(standing),
        modifyStanding: (id, delta, reason) => Factions.adjust("player", id, delta, reason),
        discoverFaction: id => Factions.meet(id),
        toggleLedger: () => {
            const w = SceneManager._scene && SceneManager._scene._factionLedgerWindow;
            if (!w) return;
            if (w.visible) w.hide();
            else {
                w.refresh();
                w.show();
            }
        }
    };

    //-------------------------------------------------------------------------
    // Ledger window (F)

    class Window_FactionLedger extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 240;
            this.hide();
        }

        refresh() {
            this.contents.clear();
            const w = this.innerWidth;
            const list = Factions.all();
            let y = 4;
            this.contents.fontSize = 20;
            this.changeTextColor("#f59e0b");
            this.drawText("Factions of this world", 0, y, w, "center");
            y += 32;
            this.contents.fontSize = 13;
            for (const f of list) {
                this.contents.fillRect(4, y, w - 8, 44, "rgba(20, 25, 35, 0.75)");
                this.changeTextColor(f.color);
                this.contents.fontSize = 16;
                this.drawText(f.name, 12, y + 2, 300, "left");
                this.contents.fontSize = 12;
                this.changeTextColor("#94a3b8");
                const home = f.home.area;
                const where = `${home.z ? "underground" : "surface"}, area ${home.x},${home.y}`;
                const about = f.isPlayer ? `${Factions.speciesName(f.species)} · home: the glade` : `${Factions.speciesName(f.species)} · ${Factions.stanceNames(f).join(", ")} · ${f.population} people · ${where}`;
                this.drawText(about, 12, y + 22, w - 220, "left");
                if (!f.isPlayer) {
                    const rel = Factions.relation("player", f.id);
                    const tier = Factions.tierOf(rel);
                    this.contents.fontSize = 15;
                    this.changeTextColor(tier.color);
                    this.drawText(`${tier.label} (${rel > 0 ? "+" : ""}${rel})`, w - 200, y + 2, 188, "right");
                    const others = list.filter(o => o.id !== f.id && o.id !== "player");
                    const friend = others.reduce((best, o) => (!best || Factions.relation(f.id, o.id) > Factions.relation(f.id, best.id) ? o : best), null);
                    const foe = others.reduce((best, o) => (!best || Factions.relation(f.id, o.id) < Factions.relation(f.id, best.id) ? o : best), null);
                    this.contents.fontSize = 11;
                    this.changeTextColor("#cbd5e1");
                    if (friend && foe) this.drawText(`ally: ${friend.name.replace(/^The /, "")} · rival: ${foe.name.replace(/^The /, "")}`, w - 320, y + 24, 308, "right");
                } else {
                    this.contents.fontSize = 15;
                    this.changeTextColor("#4ade80");
                    this.drawText("Your colony", w - 200, y + 2, 188, "right");
                }
                y += 48;
            }
            this.contents.fontSize = 12;
            this.changeTextColor("#64748b");
            this.drawText("Relations with your colony shown on the right. Press F to close.", 0, y + 2, w, "center");
            this.resetTextColor();
        }
    }
    Factions.LedgerWindow = Window_FactionLedger;

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        const ww = Math.min(Graphics.boxWidth - 16, 780), wh = Math.min(Graphics.boxHeight - 16, 520);
        this._factionLedgerWindow = new Window_FactionLedger(new Rectangle((Graphics.boxWidth - ww) / 2, (Graphics.boxHeight - wh) / 2, ww, wh));
        this.addChild(this._factionLedgerWindow);
    };

    Input.keyMapper[70] = "ufFactionLedger"; // F
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (Input.isTriggered("ufFactionLedger")) $factionManager.toggleLedger();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "factions"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("factions", async t => {
            const cfg = Factions.config();
            const W = UF.World, st = W && W.state;
            const d = st && st.factions;
            t.check("generated_with_world", !!cfg && !!d && Array.isArray(d.list), d ? `${d.list.length - 1} factions + your colony, seed ${st.seed}` : "no factions in the world state");
            if (!d) return;
            const others = d.list.filter(f => !f.isPlayer);
            t.check("count_in_range", others.length >= cfg.count[0] && others.length <= cfg.count[1], `${others.length} (allowed ${cfg.count[0]}-${cfg.count[1]})`);
            const player = Factions.player();
            t.check("player_colony", !!player && player.home.area.x === st.startArea.x && player.home.area.y === st.startArea.y && player.species === cfg.playerFaction.species,
                player ? `${player.name}, ${player.species}, home area (${player.home.area.x},${player.home.area.y})` : "missing");
            const names = d.list.map(f => f.name);
            t.check("names_unique", new Set(names).size === names.length, names.join(" | "));

            const values = Object.values(d.relations);
            const pairs = (d.list.length * (d.list.length - 1)) / 2;
            t.check("relations_complete", values.length === pairs && values.every(v => v >= -100 && v <= 100),
                `${values.length} of ${pairs} pairs, range ${Math.min(...values)} to ${Math.max(...values)}`);
            const allied = Object.entries(d.relations).filter(([, v]) => v >= 40), hostile = Object.entries(d.relations).filter(([, v]) => v <= -40);
            t.check("aligned_and_disaligned", allied.length > 0 && hostile.length > 0, `${allied.length} strong alliance(s), ${hostile.length} serious hostility(ies)`);
            t.check("relation_symmetric", others.length > 1 && Factions.relation(others[0].id, others[1].id) === Factions.relation(others[1].id, others[0].id), "relation(a, b) = relation(b, a)");

            const badHomes = others.filter(f => {
                const a = f.home.area;
                const sp = cfg.species.find(s => s.id === f.species);
                const wantZ = sp && sp.home === "underground" && (st.layers || 0) >= 1 ? 1 : 0;
                return !W.inWorld(a.x, a.y, a.z) || (a.x === st.startArea.x && a.y === st.startArea.y) || a.z !== wantZ;
            });
            const under = others.filter(f => f.home.area.z === 1).length;
            t.check("homes_valid", badHomes.length === 0, badHomes.length ? `wrong homes: ${badHomes.map(f => f.name).join(", ")}` : `${others.length - under} on the surface, ${under} underground, none in the start area`);

            const again = Factions.generate({ seed: st.seed, size: st.size, layers: st.layers, areasX: st.areasX, areasY: st.areasY, startArea: st.startArea });
            const other = Factions.generate({ seed: st.seed + 1, size: st.size, layers: st.layers, areasX: st.areasX, areasY: st.areasY, startArea: st.startArea });
            const sig = f => JSON.stringify({ list: f.list, relations: f.relations });
            t.check("same_seed_same_factions", sig(again) === sig(d), "regenerated from the same seed: identical");
            t.check("new_seed_new_factions", sig(other) !== sig(d), `another seed gives: ${other.list.filter(f => !f.isPlayer).map(f => f.name).join(", ")}`);

            const saved = JsonEx.parse(JsonEx.stringify(st));
            t.check("saved_with_world", !!saved.factions && sig(saved.factions) === sig(d), "factions round-trip through the save format");

            $factionManager.toggleLedger();
            await t.waitFrames(10);
            const ledger = SceneManager._scene._factionLedgerWindow;
            t.check("ledger_opens", !!ledger && ledger.visible, "F toggles the ledger window");
            t.screenshot("ledger");
            $factionManager.toggleLedger();
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during faction checks");
        });
    }
})();
