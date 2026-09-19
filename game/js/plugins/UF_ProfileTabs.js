/*:
 * @target MZ
 * @plugindesc [UF] Explanatory creature profile tabs; native inventory stays intact.
 * @author Codex
 * @base UF_Sheet
 * @orderAfter UF_Sheet
 * @orderAfter UF_Goals
 * @orderAfter UF_CultureGrowth
 * @help
 * Selecting a creature opens Overview, Needs, Skills, Personality, Goals,
 * Family, Culture and Inventory tabs beside the existing Sheet. Inventory
 * uses the original Sheet and its equipment/item controls. Objects and
 * stockpiles retain their original interface. Tabs never give orders.
 * The selected information page has Previous/Next buttons when needed.
 * Unknown and unmodelled factors are labeled, not replaced with zeroes.
 * No saved data is created or changed by profile inspection.
 * Reuses the current Sheet skin and portrait, creates no art or world state.
 * Replaced core methods: none. Aliases Scene_Map createAllWindows/update,
 * isAnyWindowUnderMouse and Scene_Boot.start. See UF_ProfileTabs.md.
 */
(() => {
    "use strict";
    const TABS = ["Overview", "Needs", "Skills", "Personality", "Goals", "Family", "Culture", "Inventory"];
    const POLL = 30, MAX_ROWS = 160, ROW_H = 22, SIDE_W = 112, TAB_H = 30;
    const EXPLANATIONS = {
        curiosity: "Influences how far they wander during idle time.",
        industriousness: "Influences how often they take a breather before work.",
        patience: "Helps shape the initial mining aspiration.",
        bravery: "Influences willingness to hunt dangerous prey.",
        sociability: "Helps shape relationship and family ambitions.",
        natureAffinity: "Helps shape woodcutting and hunting aspirations.",
        tidiness: "Adds a modest priority to an outstanding home goal.",
        ambition: "Shapes professional targets and work priorities.",
        cheerfulness: "A recorded disposition; no direct decision effect is shown here.",
        discipline: "Shifts preferred sleep hours and helps shape smithing aspirations."
    };
    const W = () => window.UF && UF.World;
    const S = () => window.UF && UF.Sheet;
    const cat = () => window.$ufWorldCatalog || {};
    const zOf = u => u && u.z !== undefined ? u.z : u && u.area && u.area.z !== undefined ? u.area.z : 0;
    const label = s => String(s || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
    const known = n => typeof n === "number" && Number.isFinite(n);
    const clockText = n => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
    const person = u => !!(u && u.data && ["person", "colonist"].includes(u.data.kind));
    const worldState = () => W() && W().state || {};
    const unit = ref => typeof ref === "object" ? ref : W() && W().unit(ref);
    const levelText = z => z === 0 ? "Ground (z=0)" : `z=${z > 0 ? "+" : ""}${z}`;
    const recordName = id => {
        if (id === undefined || id === null) return "Not recorded";
        const u = W() && W().unit(id), h = worldState().households, old = h && h.people && h.people[id];
        return u && u.name || old && old.name || `Recorded person #${id}`;
    };
    const species = u => ((cat().wildlife && cat().wildlife.species) || []).find(s => s.id === u.data.species) || null;
    const faction = u => {
        const all = worldState().factions;
        return ((all && all.list) || []).find(f => String(f.id) === String(u.data.faction)) || null;
    };
    function activity(u) {
        const J = UF.Jobs, saved = worldState().jobs;
        const j = ((saved && saved.list) || []).find(j => j.assigned === u.id && (j.state === "travel" || j.state === "work"));
        if (j) return J && J.describe ? J.describe(j) : label(j.type);
        if (u.data.state) return label(u.data.state);
        if (u.goal) return "Walking";
        return "No current action recorded";
    }
    /** Pure inspection: no ensure/adopt/refresh/reconcile calls, even for missing records. */
    function model(ref, tab = "overview") {
        const u = unit(ref);
        if (!u || !u.data || !TABS.some(t => t.toLowerCase() === tab)) return null;
        const d = u.data, st = worldState(), rows = [], f = faction(u), sp = species(u);
        const add = (text, tone = "text") => { if (rows.length < MAX_ROWS) rows.push({ text: String(text), tone }); };
        const head = text => add(text, "heading");
        const missing = text => add(text, "dim");
        const c = st.cultureGrowth, cp = c && c.people && c.people[u.id];
        const hstate = st.households, hid = hstate && hstate.byUnit && hstate.byUnit[u.id];
        const h = hstate && hstate.byId && hstate.byId[hid];
        if (tab === "overview") {
            head("Identity and current activity");
            add(`Species: ${sp && sp.name || label(d.species) || "Not recorded"}`);
            add(`Age: ${known(d.age) ? d.age : "Not recorded"}${d.stage ? `; stage: ${label(d.stage)}` : ""}`);
            if (d.gender) add(`Gender: ${label(d.gender)}`);
            add(`Location: ${levelText(zOf(u))}, cell (${u.x}, ${u.y})`);
            add(`Faction: ${f ? f.name : d.faction !== undefined && d.faction !== null ? `#${d.faction}` : "None recorded"}`);
            add(`Current action: ${activity(u)}`);
            if (known(d.hp)) add(`Health: ${d.hp}${known(d.maxHp) ? ` / ${d.maxHp}` : " (maximum not recorded)"}`);
            else missing("Health has not been recorded for this creature.");
            const loadRecorded = !!(st.jobs && st.items && st.items.byId && Array.isArray(d.inventory));
            const load = loadRecorded && S() && S().loadOf ? S().loadOf(u) : null;
            add(loadRecorded ? load && load.text || "No carried load reported." : "Carried-load information is not recorded.");
            if (d.lifeGoals && d.lifeGoals.profession) add(`Professional aspiration: ${d.lifeGoals.profession.label}`);
            const practice = cp && Object.entries(cp.practices || {}).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
            if (practice && practice.length) add(`Most practised trade: ${label(practice[0][0])} (${practice[0][1]} confirmed jobs)`);
            missing("An aspiration is a motive; practised work is evidence. Neither is a compulsory class.");
        } else if (tab === "needs") {
            head("Needs and recent thoughts");
            missing("Higher need values mean greater urgency, not greater satisfaction.");
            const entries = Object.entries(d.needs || {}).filter(([, n]) => known(n));
            if (!entries.length) missing("No persistent needs are recorded for this creature. Animal behavior is not a complete hunger/thirst model.");
            const thresholds = cat().colony && cat().colony.thresholds || {};
            for (const [k, v] of entries) add(`${label(k)}: ${Math.round(v)}${known(thresholds[k]) ? `; seeks relief around ${thresholds[k]}` : " (threshold not recorded)"}`);
            if (d.mood || known(d.moodScore)) add(`Mood: ${d.mood || "Not named"}${known(d.moodScore) ? ` (${d.moodScore})` : ""}`);
            const sleep = d.sleepSchedule;
            if (person(u) || sleep) {
                head("Personal sleep rhythm");
                if (sleep && sleep.version === 1 && known(sleep.bedMinute) && sleep.bedMinute >= 0 && sleep.bedMinute < 1440 &&
                    known(sleep.durationMinutes) && sleep.durationMinutes >= 360 && sleep.durationMinutes <= 660 &&
                    sleep.wakeMinute === (sleep.bedMinute + sleep.durationMinutes) % 1440) {
                    add(`Preferred sleep: ${clockText(sleep.bedMinute)} to ${clockText(sleep.wakeMinute)}; ${sleep.durationMinutes / 60} game hours.`);
                    if (sleep.chronotype) add(`Chronotype: ${label(sleep.chronotype)}.`);
                    missing("This is a personal schedule, not proof they are asleep. Urgent needs and danger may interrupt it.");
                } else missing("No valid personal sleep schedule is recorded. Inspection does not assign one.");
            }
            const thoughts = Array.isArray(d.thoughts) ? d.thoughts.slice(0, 8) : [];
            if (thoughts.length) { head("Recent thoughts"); for (const t of thoughts) if (t && t.text) add(t.text); }
            else missing("No recent thoughts recorded.");
        } else if (tab === "skills") {
            head(person(u) ? "Learned skills" : "Recorded creature abilities");
            const skills = UF.Skills;
            if (!skills || !skills.skills || !skills.level || !skills.xp) missing("The skills system is unavailable.");
            else if (person(u) && d.skillXp && typeof d.skillXp === "object") {
                missing("Experience comes from successful work and combat. These are the current XP-based levels, not the older work counters.");
                for (const s of skills.skills()) {
                    if (s.scope === "faction") { add(`${s.name || label(s.id)}: faction-scoped (see the faction system)`); continue; }
                    const lv = skills.level(u, s.id), xp = skills.xp(u, s.id), next = lv < (skills.MAX_LEVEL || 99) && skills.xpForLevel ? skills.xpForLevel(lv + 1) : null;
                    add(`${s.name || label(s.id)}: level ${lv}; ${Math.floor(xp)} XP${next !== null ? ` / ${next} for level ${lv + 1}` : " (maximum level)"}`);
                }
            } else if (!person(u)) {
                const levels = Object.assign({}, sp && sp.combat || {}, d.combatLevels || {});
                const entries = Object.entries(levels).filter(([id, value]) => ["attack", "strength", "defence", "ranged", "magic", "hitpoints"].includes(id) && known(value));
                for (const [id, value] of entries) add(`${label(id)}: ${value}`);
                if (!entries.length) missing("No combat ability values are recorded.");
                missing("These are creature capabilities, not a personal training or XP progression record.");
            } else missing("No skill XP record exists yet. Opening this profile does not roll or award skills.");
        } else if (tab === "personality") {
            head("Individual traits");
            const facets = Object.entries(d.facets || {}).filter(([, n]) => known(n));
            if (!facets.length) missing("No personal traits are recorded for this creature.");
            for (const [key, value] of facets) add(`${label(key)}: ${Math.round(value)}/100. ${EXPLANATIONS[key] || "Recorded trait; its behavioral effect is not described here."}`);
            head("Learned work preferences");
            const prefs = Object.entries(cp && cp.preferences || d.preferences || {}).filter(([, n]) => known(n));
            if (!prefs.length) missing("No learned work preferences recorded.");
            for (const [key, value] of prefs) add(`${label(key)}: ${Math.round(value)}/100${cp && cp.practices && known(cp.practices[key]) ? `; ${cp.practices[key]} confirmed jobs` : ""}`);
            missing("Preferences modestly influence feasible work. They are separate from skill, inherited identity and immediate needs.");
        } else if (tab === "goals") {
            const g = d.lifeGoals;
            head("Current focus"); add(activity(u));
            if (!g) missing("No saved ambitions are recorded. This page does not create them.");
            else {
                if (g.mode === "instinctive_observation") missing("Observed animal behavior only. The wildlife controller, not a human ambition planner, makes these decisions.");
                if (g.mode === "developing") missing("Developing or unknown-age person: no personal industrial goals are dispatched.");
                if (g.profession) add(`Professional aspiration: ${g.profession.label}`);
                for (const [key, name] of [["medium", "Medium-term goals"], ["long", "Long-term goals"]]) {
                    head(name);
                    const list = Array.isArray(g[key]) ? g[key] : [];
                    if (!list.length) missing("None recorded.");
                    for (const goal of list.slice(0, 16)) {
                        add(`${goal.label || label(goal.kind)} — ${goal.state || "recorded"}${known(goal.progress) ? ` (${goal.progress}${known(goal.target) ? ` / ${goal.target}` : ""})` : ""}`);
                        if (goal.blockedReason) add(`Blocked: ${goal.blockedReason}`, "dim");
                    }
                }
                head("Remembered achievements");
                const done = Array.isArray(g.achievements) ? g.achievements : [];
                if (!done.length) missing("None recorded.");
                for (const a of done.slice(-12)) add(a.label || label(a.kind));
            }
        } else if (tab === "family") {
            head("Recorded family and household");
            if (!person(u)) missing("No humanoid household or genealogy system is recorded for this creature.");
            else {
                add(`Mother: ${recordName(d.motherId)}`); add(`Father: ${recordName(d.fatherId)}`);
                add(`Partner: ${recordName(d.partner || d.partnerId)}`);
                const genealogy = hstate && hstate.people && hstate.people[u.id];
                if (genealogy && known(genealogy.generation)) add(`Recorded generation: ${genealogy.generation}`);
                if (h) {
                    add(`Household: ${h.id}; home level: ${levelText(zOf(h))}`);
                    const residents = (h.members || []).filter(id => hstate.byUnit && hstate.byUnit[id] === h.id).map(id => W().unit(id)).filter(o => o && !o.data.dead && !o.data._isDying);
                    add(`Living residents: ${residents.length}`);
                    for (const resident of residents.slice(0, 12)) add(`${recordName(resident.id)}${known(resident.data.age) ? `, age ${resident.data.age}` : ""}`);
                    if (h.home) {
                        // Read saved structures directly: H.structures/demands resolve via a lazy state initializer.
                        const buildings = [h.home, ...(Array.isArray(h.home.annexes) ? h.home.annexes : [])].filter(p => p && typeof p === "object");
                        const area = h.area && { x: h.area.x, y: h.area.y, z: zOf(h) }, O = UF.Objects;
                        const built = (cells, type) => area && O && O.atIn ? cells.filter(cell => { const o = O.atIn(area, cell.x, cell.y); return o && o.id === type; }).length : null;
                        const capacity = buildings.reduce((n, p) => n + (Array.isArray(p.beds) ? p.beds.length : 0), 0);
                        add(`Recorded buildings: ${buildings.length}; planned bed spaces across them: ${capacity}.`);
                        if (residents.length > capacity) add(`Residents beyond planned bed spaces: ${residents.length - capacity}. More space is needed.`);
                        for (const [index, p] of buildings.entries()) {
                            head(`${index ? `Bedroom annex ${index}` : "Main home"} at (${p.x}, ${p.y}), ${levelText(zOf(h))}`);
                            const design = p.design;
                            if (design) {
                                const details = [design.size, design.variant].filter(Boolean).map(label);
                                if (known(design.width) && known(design.height)) details.push(`${design.width} by ${design.height} tiles`);
                                if (known(design.rotation)) details.push(`rotation ${design.rotation}`);
                                if (design.mirrored === true) details.push("mirrored");
                                if (details.length) add(`Saved design: ${details.join(", ")}.`);
                                if (known(design.householdSize)) add(`Residents when designed: ${design.householdSize}${known(design.requiredBeds) ? `; beds required then: ${design.requiredBeds}` : ""}.`);
                            }
                            for (const [name, cells, type] of [["Walls", p.walls, p.wall], ["Doors", p.doors, p.door], ["Bed spaces", p.beds, "floor_straw"]]) {
                                if (!Array.isArray(cells)) continue;
                                const count = built(cells, type);
                                add(`${name}: ${count === null ? "built count unavailable" : `${count} built`} / ${cells.length} planned`);
                            }
                            if (p.hearth) add(`Cooking hearth: ${built([p.hearth], "campfire") === 1 ? "present" : "not observed"}`);
                            if (p.storage) add(`Storage: ${built([p.storage], "stockpile") === 1 ? "present" : "not observed"}`);
                        }
                        missing("Planned bed spaces are not a household size rule. Built furniture alone does not prove supplies, ownership or privacy.");
                    } else missing("No home plan recorded.");
                    if (h.expansionBlocked) add(`Expansion blocked: ${h.expansionReason || "recorded without a reason"}`, "dim");
                    else if (h.expansionReason) add(h.expansionReason, "dim");
                    if (h.reason) add(h.reason, "dim");
                } else missing("No household membership recorded.");
                if (d.pregnancy && known(d.pregnancy.daysLeft)) add(`Pregnancy: ${Math.max(0, d.pregnancy.daysLeft)} game days remaining (birth still needs a safe cell).`);
                const bonds = Array.isArray(d.socialBonds) ? d.socialBonds : [];
                if (bonds.length) { head("Recorded social contacts"); for (const b of bonds.slice(0, 16)) add(`${recordName(b.unitId)}: ${known(b.conversations) ? b.conversations : "unknown"} conversations${known(b.familiarity) ? `; familiarity ${b.familiarity}` : ""}`); }
                missing("Genealogy here is a simulation record, not a claim about what every character knows.");
            }
        } else if (tab === "culture") {
            head("Faction background and learned culture");
            if (!f) missing("No faction culture recorded for this creature.");
            else {
                add(`${f.name} — ${label(f.species)}`);
                const base = cat().cultures && cat().cultures[f.species];
                if (base) { if (base.wall) add(`Traditional wall material: ${label(base.wall)}`); if (base.door) add(`Traditional door: ${label(base.door)}`); }
                const cg = UF.CultureGrowth, mechanism = cg && cg.mechanicFor ? cg.mechanicFor(u) : null;
                if (mechanism && mechanism.text) { head("Conditional planning policy"); add(mechanism.text); }
                const learned = c && c.factions && c.factions[String(f.id)];
                head("Confirmed community practice");
                const practices = Object.entries(learned && learned.practices || {}).sort((a, b) => b[1] - a[1]);
                if (!practices.length) missing("No successful community work has been recorded yet.");
                for (const [key, value] of practices) add(`${label(key)}: ${value} confirmed jobs`);
                if (learned && known(learned.generations)) add(`Greatest recorded generation: ${learned.generations}`);
                head("Remembered knowledge");
                const knowledge = Object.keys(learned && learned.knowledge || {});
                if (!knowledge.length) missing("None recorded.");
                for (const key of knowledge.slice(0, 40)) add(label(key.replace(":", ": ")));
                if (knowledge.length > 40) add(`${knowledge.length - 40} further records not listed.`, "dim");
                missing("Remembered work is not a technology unlock or proof that tools and supplies still exist. Individuals of the same faction can differ.");
            }
        } else missing("The original Sheet inventory and equipment controls are shown.");
        return { unitId: u.id, name: u.name || `Creature #${u.id}`, kind: d.kind || "unit", z: zOf(u), tab, rows };
    }
    const inRect = (p, r) => !!r && p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h;
    const consume = () => { TouchInput._currentState = Object.assign({}, TouchInput._currentState, { triggered: false, cancelled: false }); };
    const scene = () => SceneManager._scene instanceof Scene_Map ? SceneManager._scene : null;
    const parts = () => { const s = scene(); return s && s._ufProfileTabs || null; };
    function rectOnScreen(win, r) {
        if (!win || !r) return null;
        const x = win.x + (win.parent && win.parent.x || 0) + win.padding + r.x, y = win.y + (win.parent && win.parent.y || 0) + win.padding + r.y;
        return { x, y, w: r.w, h: r.h, cx: x + r.w / 2, cy: y + r.h / 2 };
    }
    class ProfileWindow extends Window_Base {
        initialize(rect) { super.initialize(rect); this.backOpacity = 235; this._pending = 0; this._rows = []; this._page = 0; this._pages = 1; this._renderedLines = []; this.hide(); }
        pointer() { return { x: TouchInput.x - this.x - (this.parent && this.parent.x || 0) - this.padding, y: TouchInput.y - this.y - (this.parent && this.parent.y || 0) - this.padding }; }
        containsPointer() { const p = this.pointer(); return p.x >= -this.padding && p.y >= -this.padding && p.x < this.width - this.padding && p.y < this.height - this.padding; }
        covered() {
            if (!this.parent) return false;
            const x = TouchInput.x - this.parent.x, y = TouchInput.y - this.parent.y, index = this.parent.children.indexOf(this);
            return this.parent.children.slice(index + 1).some(w => w && w.visible && (!w.isOpen || w.isOpen()) && x >= w.x && y >= w.y && x < w.x + w.width && y < w.y + w.height);
        }
        update() {
            super.update(); if (!this.visible || !this.containsPointer() || this.covered() || UF.Interact && UF.Interact.isOpen && UF.Interact.isOpen()) return;
            const left = TouchInput.isTriggered(), right = TouchInput.isCancelled();
            if (!left && !right) return;
            consume();
            if (right) { S().close(true); sync(scene(), true); return; }
            const p = this.pointer();
            if (this._side) { const hit = this._buttons.find(b => inRect(p, b)); if (hit) selectTab(hit.id); }
            else if (inRect(p, this._close)) { S().close(true); sync(scene(), true); }
            else if (inRect(p, this._previous)) turnPage(-1);
            else if (inRect(p, this._next)) turnPage(1);
        }
        write(text, x, y, w, color = "#ffffff", size = 15, align = "left") { this.contents.fontSize = size; this.contents.textColor = color; this.drawText(String(text), x, y, w, align); }
        sidebar(tab) {
            this.contents.clear(); this._side = true; this._buttons = [];
            TABS.forEach((name, i) => {
                const r = { id: name.toLowerCase(), x: 0, y: i * TAB_H, w: this.innerWidth, h: TAB_H - 2 };
                this._buttons.push(r);
                this.contents.fillRect(r.x, r.y, r.w, r.h, r.id === tab ? "rgba(108,80,30,0.9)" : "rgba(0,0,0,0.35)");
                this.write(name, 0, r.y - 1, r.w, r.id === tab ? "#ffe09a" : "#ffffff", 13, "center");
            });
        }
        wrap(rows) {
            const out = []; this.contents.fontSize = 15;
            for (const row of rows) {
                let line = "";
                for (const word of row.text.split(/\s+/)) {
                    const next = line ? `${line} ${word}` : word;
                    if (line && this.textWidth(next) > this.innerWidth - 4) { out.push({ text: line, tone: row.tone }); line = word; } else line = next;
                }
                if (line) out.push({ text: line, tone: row.tone });
            }
            return out;
        }
        redrawProfile(m, native, page) {
            this.contents.clear(); this._side = false; this._pending = 0;
            this._close = { x: this.innerWidth - 20, y: 0, w: 20, h: 24 };
            if (native && native.picture && S().Window && S().Window.prototype.drawPicture) S().Window.prototype.drawPicture.call(this, native, { picture: { x: 0, y: 0, w: 72, h: 72 } });
            this.write(m.name, 80, 0, Math.max(20, this.innerWidth - 104), "#ffe09a", 17);
            this.write(label(m.tab), 80, 24, this.innerWidth - 80, "#ffffff", 17);
            this.write(levelText(m.z), 80, 48, this.innerWidth - 80, "#b8c0cc", 13);
            this.write("×", this._close.x, 0, 20, "#ffffff", 18, "center");
            this._rows = this.wrap(m.rows); this._bodyY = 82;
            const count = Math.max(1, Math.floor((this.innerHeight - this._bodyY - 40) / ROW_H));
            this._pages = Math.max(1, Math.ceil(this._rows.length / count)); this._page = Math.max(0, Math.min(this._pages - 1, page | 0));
            this._renderedLines = this._rows.slice(this._page * count, (this._page + 1) * count);
            this._renderedLines.forEach((row, i) => this.write(row.text, 0, this._bodyY + i * ROW_H, this.innerWidth, row.tone === "heading" ? "#ffe09a" : row.tone === "dim" ? "#b8c0cc" : "#ffffff", 15));
            const y = this.innerHeight - 32;
            this._previous = { x: 0, y, w: 72, h: 28 }; this._next = { x: this.innerWidth - 72, y, w: 72, h: 28 };
            this.write("Previous", 0, y, 72, this._page ? "#ffffff" : "#707780", 13);
            this.write(`${this._page + 1} / ${this._pages}`, 76, y, this.innerWidth - 152, "#b8c0cc", 13, "center");
            this.write("Next", this._next.x, y, 72, this._page + 1 < this._pages ? "#ffffff" : "#707780", 13, "right");
        }
    }
    function sync(map, force = false) {
        const p = map && map._ufProfileTabs, sheet = S() && S().window(), sub = sheet && sheet.visible && sheet.subject();
        if (!p) return;
        if (!sub || sub.kind !== "unit" || !W() || !W().unit(sub.unitId)) { p.side.hide(); p.info.hide(); p.unitId = null; return; }
        if (p.unitId !== sub.unitId) { p.unitId = sub.unitId; p.tab = "overview"; p.page = 0; force = true; }
        if (sheet.windowskin && p.info.windowskin !== sheet.windowskin) { p.info.windowskin = p.side.windowskin = sheet.windowskin; force = true; }
        p.side.show(); if (p.tab === "inventory") p.info.hide(); else p.info.show();
        if (!force && ++p.age < POLL) return;
        p.age = 0;
        const m = model(p.unitId, p.tab), native = sheet.model(), sig = JSON.stringify([m, p.page, native && native.picture]);
        p.checks++;
        if (!force && sig === p.sig && !p.info._pending) return;
        p.sig = sig; p.model = m; p.side.sidebar(p.tab);
        if (p.tab !== "inventory") { p.info.redrawProfile(m, native, p.page); p.page = p.info._page; }
        p.redraws++;
    }
    function selectTab(tab) {
        const p = parts(); if (!p || !p.unitId || !TABS.some(name => name.toLowerCase() === tab)) return false;
        p.tab = tab; p.page = 0; sync(scene(), true); return true;
    }
    function turnPage(delta) { const p = parts(); if (!p || !p.info.visible) return false; p.page = Math.max(0, Math.min(p.info._pages - 1, p.page + delta)); sync(scene(), true); return true; }
    window.UF = window.UF || {};
    const API = UF.ProfileTabs = { model, selectTab, turnPage, tabs: () => TABS.map(name => ({ id: name.toLowerCase(), name })), POLL,
        windows: parts, current: () => { const p = parts(); return p && p.unitId ? { unitId: p.unitId, tab: p.tab, page: p.page, pages: p.info._pages } : null; },
        sync: () => sync(scene(), true), screenRect(kind, which) { const p = parts(); if (!p) return null; return kind === "tab" ? rectOnScreen(p.side, p.side._buttons && p.side._buttons.find(b => b.id === which)) : rectOnScreen(p.info, kind === "close" ? p.info._close : kind === "next" ? p.info._next : p.info._previous); } };
    const _windows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _windows.call(this);
        const sheet = this._ufSheetWindow; if (!sheet) return;
        const sw = Math.max(80, Math.min(SIDE_W, sheet.x - 4));
        const side = new ProfileWindow(new Rectangle(Math.max(0, sheet.x - sw - 4), sheet.y, sw, TABS.length * TAB_H + sheet.padding * 2));
        const info = new ProfileWindow(new Rectangle(sheet.x, sheet.y, sheet.width, Graphics.boxHeight - sheet.y - 4));
        const at = this._windowLayer.children.indexOf(sheet) + 1;
        this._windowLayer.addChildAt(side, at); this._windowLayer.addChildAt(info, at + 1);
        this._ufProfileTabs = { side, info, unitId: null, tab: "overview", page: 0, age: 0, sig: "", checks: 0, redraws: 0 };
    };
    const _mapUpdate = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() { sync(this); _mapUpdate.call(this); };
    const _underMouse = Scene_Map.prototype.isAnyWindowUnderMouse;
    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        if (_underMouse && _underMouse.call(this)) return true;
        const p = this._ufProfileTabs; return !!p && [p.side, p.info].some(w => w.visible && w.containsPointer());
    };
    let hooked = false;
    function hook() {
        if (hooked || !UF.Events) return; hooked = true;
        UF.Events.on("sheet:opened", () => sync(scene(), true)); UF.Events.on("sheet:closed", () => sync(scene(), true));
    }
    const _boot = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() { hook(); if (UF.Test && UF.Test.active) registerChecks(); _boot.call(this); };
    function registerChecks() {
        UF.Test.suite("profile_tabs", async t => {
            const world = W(), sheet = S(), C = UF.Colonists, time = UF.Time, enabled = C && C.isEnabled(), wasPaused = time && time.paused;
            const errors = t.errorsSoFar().length, candidates = world.units().filter(u => C && C.isColonist(u)), own = candidates[0], npc = world.units().find(u => u.data.kind === "person"), animal = world.units().find(u => u.data.kind === "creature");
            t.check("subjects_exist", !!own && !!npc && !!animal, "real founder, NPC and wildlife subjects"); if (!own || !npc || !animal) return;
            if (C) C.setEnabled(false); if (time) time.pause();
            // Fixture setup, not inspection: ask the real planner for a feasible reservation.
            // Starting dwarves may still have no house plan when this suite begins.
            const savedHome = u => { const hs = world.state.households; return hs && hs.byId && hs.byId[hs.byUnit && hs.byUnit[u.id]]; };
            let homeSubject = candidates.find(u => savedHome(u) && savedHome(u).home);
            if (!homeSubject && UF.Households && UF.Households.planSteps) for (const u of candidates.slice(0, 12)) {
                UF.Households.planSteps(u);
                if (savedHome(u) && savedHome(u).home) { homeSubject = u; break; }
            }
            const click = async r => { TouchInput._x = r.cx; TouchInput._y = r.cy; TouchInput._triggerX = r.cx; TouchInput._triggerY = r.cy; TouchInput._newState.triggered = true; await t.waitFrames(2); };
            const textPixels = win => {
                const bytes = win.contents.context.getImageData(0, win._bodyY, win.innerWidth, Math.min(ROW_H * 3, win.innerHeight - win._bodyY)).data;
                let count = 0; for (let i = 3; i < bytes.length; i += 4) if (bytes[i] > 100) count++; return count;
            };
            let inventoryFixture = null, testStone = null;
            try {
                sheet.open(own.id); await t.waitFrames(2);
                const p = parts(), before = JSON.stringify({ goal: own.goal, job: UF.Jobs.of(own.id), data: own.data });
                t.check("overview_visible", p.info.visible && p.side.visible && API.current().tab === "overview" && p.info._renderedLines.some(r => /Species:/.test(r.text)), "selected creature has readable overview rows");
                t.check("fits_screen", [p.side, p.info].every(w => w.x >= 0 && w.y >= 0 && w.x + w.width <= Graphics.boxWidth && w.y + w.height <= Graphics.boxHeight), `${Graphics.boxWidth}x${Graphics.boxHeight}`);
                for (const tab of TABS.map(s => s.toLowerCase()).filter(s => s !== "inventory")) {
                    await click(API.screenRect("tab", tab));
                    const pixels = textPixels(p.info);
                    t.check(`touch_${tab}`, API.current().tab === tab && p.info.visible && p.info._renderedLines.length > 0 && pixels > 30, `active=${API.current().tab}; ${p.info._renderedLines.length} lines; ${pixels} text pixels`);
                }
                t.check("inspection_keeps_state", JSON.stringify({ goal: own.goal, job: UF.Jobs.of(own.id), data: own.data }) === before, "paused tab clicks create no orders or character changes");
                await click(API.screenRect("tab", "skills"));
                await t.waitUntil(() => !p.info._pending, 8000, "profile portrait"); t.screenshot("skills");
                const showRow = async pattern => {
                    for (let i = 1; !p.info._renderedLines.some(r => pattern.test(r.text)) && i < p.info._pages; i++) await click(API.screenRect("next"));
                    return p.info._renderedLines.some(r => pattern.test(r.text));
                };
                await click(API.screenRect("tab", "needs"));
                const sleep = own.data.sleepSchedule, sleepVisible = await showRow(/Preferred sleep:/);
                t.check("saved_sleep_visible", !!sleep && sleepVisible && p.model.rows.some(r => r.text.includes(`${clockText(sleep.bedMinute)} to ${clockText(sleep.wakeMinute)}`)), "the real saved personal schedule is reachable by page buttons");
                t.screenshot("needs");
                if (homeSubject) { sheet.open(homeSubject.id); await t.waitFrames(2); }
                await click(API.screenRect("tab", "family"));
                const h = homeSubject && savedHome(homeSubject);
                const homeVisible = h && h.home && await showRow(/Main home at/);
                t.check("saved_home_visible", !!homeVisible && p.model.rows.some(r => r.text.includes(`Main home at (${h.home.x}, ${h.home.y})`)), "the real reserved household home is reachable by page buttons");
                t.screenshot("family");
                if (homeSubject && homeSubject.id !== own.id) { sheet.open(own.id); await t.waitFrames(2); }
                await click(API.screenRect("tab", "inventory"));
                t.check("inventory_native", !p.info.visible && sheet.isOpen() && !!sheet.layout().grid && !!sheet.layout().equipment, "native inventory and equipment remain available");
                // Ground only: the pre-existing native Sheet omits z on item transfers.
                const I = UF.Items;
                let itemSubject = candidates.find(u => zOf(u) === 0 && I.atIn(u.area, u.x, u.y).length === 0 && I.inventoryOf(u.id).length < 20);
                if (!itemSubject) {
                    const anchor = world.units().find(u => zOf(u) === 0 && u.area);
                    let cell = null;
                    if (anchor) for (let dy = -6; dy <= 6 && !cell; dy++) for (let dx = -6; dx <= 6 && !cell; dx++) {
                        const x = anchor.x + dx, y = anchor.y + dy;
                        if (world.cellFree(anchor.area.x, anchor.area.y, x, y, null, 0) && !I.atIn(anchor.area, x, y).length) cell = { x, y };
                    }
                    if (cell) itemSubject = inventoryFixture = world.addUnit({ name: "TEST_ProfileInventory", image: own.image,
                        area: { x: anchor.area.x, y: anchor.area.y }, z: 0, x: cell.x, y: cell.y,
                        data: { kind: "colonist", faction: own.data.faction, species: own.data.species, age: 25, stage: "adult",
                            gender: own.data.gender, inventory: [], equipment: {}, needs: { hunger: 0, thirst: 0, sleep: 0 } } });
                }
                testStone = itemSubject && I.give("stone", 2, itemSubject.id)[0];
                t.check("inventory_ground_fixture", !!testStone && zOf(itemSubject) === 0 && testStone.holder === itemSubject.id, "test-given stone belongs to a Ground player founder or Ground test clone");
                if (testStone) {
                    sheet.open(itemSubject.id); await t.waitFrames(2); await click(API.screenRect("tab", "inventory"));
                    const index = sheet.model().grid.slots.findIndex(s => s && s.itemId === testStone.id);
                    const idle = JSON.stringify({ goal: itemSubject.goal, job: UF.Jobs.of(itemSubject.id) });
                    await click(sheet.screenRect("slot", index));
                    t.check("inventory_slot_touch", !p.info.visible && sheet.window().selectedEntry() && sheet.window().selectedEntry().itemId === testStone.id, "native stack selection receives actual TouchInput");
                    await click(sheet.screenRect("button", "drop")); await t.waitFrames(sheet.CHECK_EVERY + 2);
                    const dropped = I.get(testStone.id);
                    t.check("inventory_drop_touch", dropped && dropped.holder === null && zOf(dropped) === 0 && dropped.x === itemSubject.x && dropped.y === itemSubject.y && !itemSubject.data.inventory.includes(testStone.id), "native Drop moves the stone to the Ground subject's cell");
                    await click(sheet.screenRect("button", "pickup")); await t.waitFrames(sheet.CHECK_EVERY + 2);
                    const picked = I.get(testStone.id);
                    t.check("inventory_pickup_touch", picked && picked.holder === itemSubject.id && picked.count === 2 && itemSubject.data.inventory.includes(testStone.id) && !I.atIn(itemSubject.area, itemSubject.x, itemSubject.y).length, "native Pick up returns the same 2-stone stack");
                    t.check("inventory_controls_no_orders", JSON.stringify({ goal: itemSubject.goal, job: UF.Jobs.of(itemSubject.id) }) === idle && API.current().tab === "inventory", "stack/button clicks preserve the subject's current order");
                }
                t.screenshot("inventory");
                sheet.open(npc.id); await t.waitFrames(2);
                t.check("npc_selection", API.current().unitId === npc.id && API.current().tab === "overview" && sheet.model().readOnly, "NPC selection is inspected without player item controls");
                sheet.open(animal.id); await t.waitFrames(2); await click(API.screenRect("tab", "needs"));
                t.check("animal_unknowns", API.current().unitId === animal.id && model(animal, "needs").rows.some(r => /No persistent needs|Higher need/.test(r.text)), "wildlife entries use recorded values only");
                t.screenshot("animal");
                await click(API.screenRect("close"));
                t.check("close_all", !sheet.isOpen() && !p.info.visible && !p.side.visible, "close box closes profile and native Sheet");
                sheet.open(own.id); await t.waitFrames(2); sheet.close(); await t.waitFrames(2);
                const checks = p.checks; await t.waitFrames(35);
                t.check("closed_no_polling", p.checks === checks, `${p.checks - checks} hidden signature checks`);
                t.check("no_errors", t.errorsSoFar().length === errors, `${t.errorsSoFar().length - errors} new errors`);
            } finally {
                sheet.close(); if (testStone && UF.Items) UF.Items.remove(testStone.id);
                if (inventoryFixture) world.removeUnit(inventoryFixture.id);
                if (C) C.setEnabled(enabled); if (time && !wasPaused) time.resume();
            }
        }, { isDefault: false });
    }
})();
