/*:
 * @target MZ
 * @plugindesc [UF Households] Persistent families and exact, material-built household homes.
 * @author Codex
 * @base UF_Colonists
 * @base UF_Ownership
 * @orderAfter UF_Colonists
 * @orderAfter UF_Ownership
 * @help
 * Keeps existing parentage and explicit adult partnerships; unrelated founders
 * remain separate households. Does not create marriages, babies or objects.
 * planSteps(unit) supplies exact build steps to the colonist planner. Materials,
 * hauling, work and interruptions remain ordinary UF_Jobs operations.
 * Saved home designs vary in shape and orientation, sized for actual residents.
 * Growth reserves physical bedroom annexes without resizing existing walls.
 * Main homes have sleeping/common rooms, doors, beds, hearth and storage. No excavation,
 * unsupported upper-floor construction, dining furniture, windows or keys.
 * Saved under UF.World.state.households. Only actual death records mark a
 * person deceased; a missing unit is not presumed dead. No core replacements.
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : {});
    root.UF = root.UF || {};
    const UF = root.UF;
    const W = () => UF.World;
    const C = () => UF.Colonists;
    const O = () => UF.Objects;
    const Own = () => UF.Ownership;
    const zOf = r => r && r.z !== undefined ? r.z : r && r.area && r.area.z !== undefined ? r.area.z : 0;
    const copyArea = a => ({ x: a ? a.x : 0, y: a ? a.y : 0 });
    const areaOf = r => ({ x: (r && r.area) ? r.area.x : 0, y: (r && r.area) ? r.area.y : 0, z: zOf(r) });
    const samePlace = (a, b) => !!a && !!b && !!a.area && !!b.area &&
        a.area.x === b.area.x && a.area.y === b.area.y && zOf(a) === zOf(b);
    const unitOf = u => u && typeof u === "object" ? u : W() && W().unit(u);
    const dead = u => !!(u && u.data && (u.data.dead === true || u.data._isDying === true));
    const person = u => !!(u && u.data && ["colonist", "person"].includes(u.data.kind));
    const adult = u => !!(u && u.data && (Number.isFinite(u.data.age) ? u.data.age >= 15 : (u.data.stage === "adult" || u.data.stage === "elder")));
    const tick = () => window.UF && UF.Time && typeof UF.Time.ticks === "function" ? UF.Time.ticks() : W() && W()._frame || 0;
    const day = () => window.$ufTime ? `${$ufTime.year || 0}:${$ufTime.monthIndex || 0}:${$ufTime.day || 0}` : "0:0:0";
    const emit = (event, ...args) => { if (window.UF && UF.Events) UF.Events.emit(event, ...args); };
    const key = (x, y) => `${x},${y}`;
    const has = (o, tag) => !!(o && o.tags && o.tags.includes(tag));
    const SUPPORTED = ["floor_straw", "campfire", "stockpile"];
    const CAPACITY = 4;
    const SEARCH_RINGS = 4; // 80 candidates, never a full-map scan.
    let reconciling = false;

    function state() {
        const w = W();
        if (!w || !w.state) return null;
        const s = w.state.households || (w.state.households = { version: 1, nextId: 1, byId: {}, byUnit: {}, people: {} });
        s.byId = s.byId || {}; s.byUnit = s.byUnit || {}; s.people = s.people || {};
        s.nextId = Math.max(1, s.nextId | 0);
        return s;
    }
    function context(u) {
        const d = u && u.data, c = C() && C().state(u), home = d && d.home;
        if (!d || !d.faction) return null;
        const siteId = (d.site !== undefined && d.site !== null) ? d.site : (c && c.siteId !== undefined ? c.siteId : (d.kind === "colonist" ? 1 : null));
        if (siteId === null || siteId === undefined) return null;
        if (d.site === undefined) d.site = siteId;
        const a = c || (home && home.area ? home : u), z = zOf(a);
        if (!a.area || !Number.isInteger(z) || z < -2 || z > 2) return null;
        return { faction: d.faction, siteId: d.site, area: { x: a.area.x, y: a.area.y }, z };
    }
    const fits = (h, c) => !!h && !!c && !h.mergedInto && h.faction === c.faction && h.siteId === c.siteId && samePlace(h, c);
    function all() { const s = state(); return s ? Object.values(s.byId).filter(h => !h.mergedInto) : []; }
    function of(u) { const s = state(), id = u && typeof u === "object" ? u.id : u; return s && s.byId[s.byUnit[id]] || null; }
    function resolve(h) { const s = state(); return h && typeof h === "object" ? h : s && s.byId[h] || null; }
    function structures(refH) {
        const h = resolve(refH);
        return h && h.home ? [h.home, ...(h.home.annexes || []).filter(a => a && Array.isArray(a.beds))] : [];
    }
    function members(ref) {
        const h = resolve(ref), s = state();
        return h && s ? (h.members || []).map(unitOf).filter(u => person(u) && !dead(u) && s.byUnit[u.id] === h.id && fits(h, context(u))) : [];
    }
    function remember(u, death = false) {
        const s = state();
        if (!s || !person(u)) return;
        const old = s.people[u.id] || {}, d = u.data;
        s.people[u.id] = Object.assign(old, { id: u.id, name: u.name || "", species: d.species || "human",
            familyId: d.familyId || old.familyId || null,
            surname: d.surname || old.surname || null,
            lineageId: d.lineageId || old.lineageId || null,
            motherId: d.motherId === undefined ? old.motherId || null : d.motherId,
            fatherId: d.fatherId === undefined ? old.fatherId || null : d.fatherId });
        if (death || dead(u)) { old.deceased = true; if (old.deathTick === undefined) old.deathTick = tick(); }
    }
    function join(u, h) {
        const s = state();
        if (!s || !u || !fits(h, context(u))) return null;
        s.byUnit[u.id] = h.id;
        if (!h.members.includes(u.id)) h.members.push(u.id);
        u.data.householdId = h.id;
        if (u.data && u.data.familyId && !h.familyId) h.familyId = u.data.familyId;
        if (u.data && u.data.surname && !h.surname) h.surname = u.data.surname;
        if (u.data && u.data.lineageId && !h.lineageId) h.lineageId = u.data.lineageId;
        return h;
    }
    function make(u) {
        const s = state(), c = context(u);
        if (!s || !c) return null;
        const h = Object.assign({ id: `household:${s.nextId++}`, members: [], foundedTick: tick(), generation: 0, home: null, reason: "No home planned" }, c);
        if (u.data && u.data.familyId) h.familyId = u.data.familyId;
        if (u.data && u.data.surname) h.surname = u.data.surname;
        if (u.data && u.data.lineageId) h.lineageId = u.data.lineageId;
        s.byId[h.id] = h;
        return join(u, h);
    }
    function merge(a, b) {
        if (!a || !b || a.id === b.id || !fits(a, b)) return a;
        // Never discard a constructed/reserved home. A merged record retains its
        // former home reservation until a future explicit moving/demolition rule.
        if ((!a.home && b.home) || (!!a.home === !!b.home && a.foundedTick > b.foundedTick)) [a, b] = [b, a];
        for (const u of members(b)) join(u, a);
        a.familyId = a.familyId || b.familyId || null;
        a.surname = a.surname || b.surname || null;
        a.lineageId = a.lineageId || b.lineageId || null;
        b.mergedInto = a.id;
        emit("households:merged", a, b);
        return a;
    }
    function ancestors(u, depth = 3) {
        const s = state(), seen = new Set(), queue = [[u.id, 0]];
        while (queue.length) {
            const [id, d] = queue.shift();
            if (seen.has(id)) continue;
            seen.add(id);
            const p = s && s.people[id] || (unitOf(id) && unitOf(id).data);
            if (!p || d >= depth) continue;
            for (const parent of [p.motherId, p.fatherId]) if (parent !== undefined && parent !== null) queue.push([parent, d + 1]);
        }
        return seen;
    }
    function closeKin(a, b) {
        if (!a || !b) return true;
        const aa = ancestors(a), bb = ancestors(b);
        return [...aa].some(id => bb.has(id));
    }
    function partnerId(u) { return u && u.data ? u.data.partner || u.data.partnerId || null : null; }
    function pairReason(a, b) {
        if (!person(a) || !person(b) || a.id === b.id || dead(a) || dead(b)) return "not living people";
        if (!adult(a) || !adult(b)) return "adults only";
        if (a.data.familyDesire === false || b.data.familyDesire === false || a.data.willingToPartner === false || b.data.willingToPartner === false) return "unwilling";
        if (!samePlace(a, b) || !fits(Object.assign({ mergedInto: null }, context(a)), context(b))) return "different settlement or level";
        const sa = a.data.species || "human", sb = b.data.species || "human";
        if (sa !== sb || /automaton|undead|swarm/i.test(sa) || a.data.reproduction === false || b.data.reproduction === false) return "incompatible life cycle";
        for (const [u, other] of [[a, b], [b, a]]) {
            const existing = unitOf(partnerId(u));
            if (existing && !dead(existing) && existing.id !== other.id) return "already partnered";
        }
        if (closeKin(a, b)) return "close relatives";
        return null;
    }
    function formPair(a, b) {
        a = unitOf(a); b = unitOf(b);
        if (!a || !b) return null;
        reconcile();
        if (pairReason(a, b)) return null;
        a.data.partner = b.id;
        a.data.partnerId = b.id;
        a.data.partnerName = b.name;
        b.data.partner = a.id;
        b.data.partnerId = a.id;
        b.data.partnerName = a.name;

        const ha = of(a);
        const hb = of(b);

        // If either unit is living with parents or other relatives, they branch off to establish
        // their own independent household rather than merging parental households together!
        const aHasFamily = ha && members(ha).some(m => m.id !== a.id && m.id !== b.id);
        const bHasFamily = hb && members(hb).some(m => m.id !== b.id && m.id !== a.id);

        let h;
        if (aHasFamily || bHasFamily) {
            if (ha) ha.members = (ha.members || []).filter(id => id !== a.id && id !== b.id);
            if (hb && hb.id !== (ha && ha.id)) hb.members = (hb.members || []).filter(id => id !== a.id && id !== b.id);
            h = make(a);
            join(b, h);
        } else {
            h = merge(ha || make(a), hb || make(b));
        }

        if (h && !h.surname) {
            h.surname = a.data.surname || b.data.surname || (ha && ha.surname) || (hb && hb.surname) || "Newfamily";
        }

        emit("households:paired", a, b, h);
        emit("colonists:pairbonded", a, b, h);
        return h;
    }
    function generations() {
        const s = state(), memo = {}, visiting = new Set();
        const gen = id => {
            if (memo[id] !== undefined) return memo[id];
            if (visiting.has(id) || visiting.size > 64) return 0;
            const p = s.people[id];
            if (!p) return 0;
            visiting.add(id);
            const ps = [p.motherId, p.fatherId].filter(n => n !== null && n !== undefined);
            const g = ps.length ? 1 + Math.max(...ps.map(gen)) : 0;
            visiting.delete(id); p.generation = g; memo[id] = g;
            return g;
        };
        Object.keys(s.people).forEach(gen);
        for (const h of all()) h.generation = Math.max(0, ...(h.members || []).map(id => memo[id] || 0));
    }
    function reconcile() {
        const s = state(), w = W();
        if (!s || !w || reconciling) return all();
        reconciling = true;
        try {
            const people = w.units().filter(u => person(u) && !dead(u) && context(u)).sort((a, b) => a.id - b.id);
            for (const u of w.units().filter(person)) remember(u);
            for (const u of people) if (!fits(of(u), context(u))) make(u);
            for (const u of people) {
                const p = unitOf(partnerId(u));
                if (p && partnerId(p) === u.id && !pairReason(u, p)) {
                    const hu = of(u), hp = of(p);
                    if (hu && hp && hu.id !== hp.id) {
                        const uHasOther = members(hu).some(m => m.id !== u.id && m.id !== p.id);
                        const pHasOther = members(hp).some(m => m.id !== p.id && m.id !== u.id);
                        if (uHasOther || pHasOther) {
                            if (hu) hu.members = (hu.members || []).filter(id => id !== u.id && id !== p.id);
                            if (hp && hp.id !== hu.id) hp.members = (hp.members || []).filter(id => id !== u.id && id !== p.id);
                            const h = make(u);
                            join(p, h);
                            if (!h.surname) h.surname = u.data.surname || p.data.surname || (hu && hu.surname) || (hp && hp.surname) || "Newfamily";
                            emit("households:paired", u, p, h);
                        } else {
                            merge(hu, hp);
                        }
                    }
                }
            }
            // A child joins a known parent's household; parenthood does not
            // invent a marriage or merge two unpartnered parents' households.
            for (const u of people) if (!adult(u)) {
                const p = unitOf(u.data.motherId) || unitOf(u.data.fatherId);
                if (p && !dead(p) && fits(of(p), context(u))) {
                    const previous = of(u); join(u, of(p));
                    if (previous && previous.id !== of(p).id && !members(previous).length) previous.mergedInto = of(p).id;
                }
            }
            // Home inheritance: when all members of a household are dead, any homeless
            // faction member can claim the vacant home. Nothing sits unbuilt.
            const vacantHomes = [];
            for (const h of all()) {
                if (h.mergedInto || !h.home || h.home.isShared) continue;
                const alive = members(h);
                if (alive.length === 0) vacantHomes.push(h);
            }
            if (vacantHomes.length) {
                // Find homeless faction people (in shared town hall or no home at all)
                const homeless = people.filter(u => {
                    const uh = of(u);
                    if (!uh) return true;
                    if (uh.home && uh.home.isShared) return true; // still in town hall
                    if (!uh.home) return true;
                    return false;
                });
                // Prioritize paired couples first, then singles
                homeless.sort((a, b) => {
                    const pairA = (a.data && (a.data.partner || a.data.partnerId)) ? 1 : 0;
                    const pairB = (b.data && (b.data.partner || b.data.partnerId)) ? 1 : 0;
                    return (pairB - pairA) || (a.id - b.id);
                });

                for (const vacant of vacantHomes) {
                    if (!homeless.length) break;
                    const claimer = homeless.shift();
                    const oldH = of(claimer);
                    // Move claimer into the vacant household
                    if (oldH) oldH.members = (oldH.members || []).filter(id => id !== claimer.id);
                    join(claimer, vacant);
                    vacant.reason = "Inherited home";
                    // If claimer has a partner, bring them too
                    const partner = unitOf(partnerId(claimer));
                    if (partner && !dead(partner)) {
                        const idx = homeless.indexOf(partner);
                        if (idx >= 0) homeless.splice(idx, 1);
                        const partnerH = of(partner);
                        if (partnerH && partnerH.id !== vacant.id) {
                            partnerH.members = (partnerH.members || []).filter(id => id !== partner.id);
                        }
                        join(partner, vacant);
                    }
                    emit("households:inherited", vacant, claimer);
                }
            }
            generations();
            ensureTownHallHomes(people);
            for (const h of all()) if (h.home) syncHome(h);
            return all();
        } finally { reconciling = false; }
    }
    function ensureTownHallHomes(people) {
        const w = W();
        if (!w || !w.state) return;
        const sites = (w.state.history && Array.isArray(w.state.history.sites) && w.state.history.sites.length)
            ? w.state.history.sites
            : (C() && typeof C().site === "function" && C().site() ? [C().site()] : []);
        if (!sites.length) return;
        for (const site of sites) {
            if (!site || site.ruined) continue;
            const siteId = site.id || 1;
            site.id = siteId;
            const siteArea = site.area || (w.viewLevel ? w.viewLevel() : { x: 0, y: 0 });
            site.area = siteArea;
            const siteUnits = people.filter(u => u.data && (u.data.site === siteId || (u.data.site === undefined && samePlace(u, site) && Math.max(Math.abs(u.x - site.x), Math.abs(u.y - site.y)) <= 8)));
            const founders = siteUnits.filter(u => u.data && (u.data.founder === true || (u.data.founder !== false && !u.data.motherId && !u.data.fatherId && u.data.stage !== "child")));
            if (founders.length < 2) continue;
            const founderH = [...new Set(founders.map(u => of(u)).filter(Boolean))];
            if (founderH.length === 0) continue;
            const allPrivateMovedIn = founderH.every(h => h.home && !h.home.isShared && h.isMovedIn);
            if (allPrivateMovedIn) continue;

            const area = { x: site.area.x, y: site.area.y };
            const z = zOf(site);
            const x0 = site.x - 3, y0 = site.y - 3;
            const x1 = site.x + 3, y1 = site.y + 3;
            const wSpan = 7, hSpan = 7;
            const doorPos = { x: site.x, y: y1 };

            const bedPositions = [
                { x: site.x - 2, y: site.y - 2 }, { x: site.x - 1, y: site.y - 2 },
                { x: site.x + 1, y: site.y - 2 }, { x: site.x + 2, y: site.y - 2 },
                { x: site.x - 2, y: site.y + 1 }, { x: site.x - 2, y: site.y + 2 },
                { x: site.x + 2, y: site.y + 1 }, { x: site.x + 2, y: site.y + 2 }
            ];

            const culture = (C() && typeof C().culture === "function" && C().culture(founders[0])) || {};
            const wallId = culture.wall || "wall_wood";
            const doorId = culture.door || (wallId.includes("stone") ? "door_stone" : "door_wood");
            const floorId = (culture.floor && culture.floor.kind) || (wallId.includes("stone") ? "floor_stone" : "floor_wood");

            const walls = [];
            for (let y = y0; y <= y1; y++) {
                for (let x = x0; x <= x1; x++) {
                    if (x === x0 || x === x1 || y === y0 || y === y1) {
                        if (x !== doorPos.x || y !== doorPos.y) {
                            walls.push({ x, y });
                        }
                    }
                }
            }

            const floors = [];
            for (let y = y0 + 1; y < y1; y++) {
                for (let x = x0 + 1; x < x1; x++) {
                    floors.push({ x, y });
                }
            }

            const orderedFounders = [];
            const visited = new Set();
            for (const f of founders) {
                if (visited.has(f.id)) continue;
                orderedFounders.push(f);
                visited.add(f.id);
                const partner = f.data && (unitOf(f.data.partner) || unitOf(f.data.partnerId));
                if (partner && founders.some(u => u.id === partner.id) && !visited.has(partner.id)) {
                    orderedFounders.push(partner);
                    visited.add(partner.id);
                }
            }
            for (const f of founders) {
                if (!visited.has(f.id)) {
                    orderedFounders.push(f);
                    visited.add(f.id);
                }
            }

            const sharedBeds = [];
            for (let i = 0; i < 8; i++) {
                const bPos = bedPositions[i];
                const member = orderedFounders[i] || null;
                const unitId = member ? member.id : null;
                sharedBeds.push({ x: bPos.x, y: bPos.y, unitId });
                if (member && member.data && (!of(member) || !of(member).isMovedIn)) {
                    member.data.bed = { area: copyArea(area), x: bPos.x, y: bPos.y, z, isShared: true };
                }
            }

            let townHall = (founderH.find(h => h.home && h.home.isShared) || {}).home;
            if (!townHall) {
                townHall = {
                    id: `town_hall_${site.id}`,
                    x: x0, y: y0, w: wSpan, h: hSpan,
                    area: copyArea(area), z,
                    wall: wallId,
                    door: doorId,
                    floor: floorId,
                    walls,
                    doors: [doorPos],
                    floors,
                    entrance: { x: site.x, y: y1 + 1 },
                    sleeping: bedPositions.map(p => ({ x: p.x, y: p.y })),
                    spots: [
                        { x: site.x - 2, y: site.y - 2 }, { x: site.x - 1, y: site.y - 2 }
                    ],
                    beds: sharedBeds,
                    hearth: { x: site.x, y: site.y },
                    storage: { x: site.x - 5, y: site.y },
                    isShared: true,
                    rooms: [
                        { type: "communal", name: "Town Hall", x: x0, y: y0, w: wSpan, h: hSpan, hearth: { x: site.x, y: site.y } }
                    ],
                    annexes: []
                };
            } else {
                townHall.beds = sharedBeds;
                townHall.floors = floors;
                townHall.floor = floorId;
            }

            for (const h of founderH) {
                if (!h.home || h.home.isShared || !h.isMovedIn) {
                    if (h.home && !h.home.isShared) {
                        h.privateHomestead = h.home;
                    }
                    h.home = townHall;
                }
            }
        }
    }
    function object(h, p) { return p ? (O() && O().atIn(areaOf(h), p.x, p.y)) : null; }
    function ref(h, p) { return p ? { kind: "object", area: { x: h.area.x, y: h.area.y }, z: h.z, x: p.x, y: p.y } : null; }
    function dry(h, x, y) {
        const w = W(), j = window.UF && UF.Jobs;
        return !!(w && w.state && x >= 1 && y >= 1 && x < w.state.size - 1 && y < w.state.size - 1 &&
            w.walkable && w.walkable(h.area.x, h.area.y, x, y, { z: h.z, ground: true }) &&
            !(j && j.isWaterAt && j.isWaterAt(areaOf(h), x, y)));
    }
    function hash(...parts) {
        let n = 2166136261;
        for (const c of parts.join("|")) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
        return n >>> 0;
    }
    const SHAPES_BY_SPECIES = {
        elf: ["octagonal", "cruciform", "t_shape", "longhouse", "l_shape"],
        dwarf: ["octagonal", "cruciform", "t_shape", "box", "l_shape"],
        orc: ["alcove", "l_shape", "longhouse", "box", "t_shape"],
        goblin: ["alcove", "l_shape", "box", "octagonal", "longhouse"],
        human: ["l_shape", "t_shape", "alcove", "octagonal", "cruciform", "longhouse", "box"],
        default: ["l_shape", "t_shape", "alcove", "octagonal", "cruciform", "longhouse", "box"]
    };

    function makeFootprint(shape, width, height, sleepRows = 2) {
        const divider = sleepRows + 1;
        const grid = [];
        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) grid[y][x] = false;
        }

        if (shape === "box") {
            for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) grid[y][x] = true;
        } else if (shape === "l_shape") {
            const cutX = Math.max(5, Math.floor(width * 0.6));
            const cutY = Math.max(divider + 1, Math.floor(height * 0.6));
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (x >= cutX && y >= cutY) continue;
                    grid[y][x] = true;
                }
            }
        } else if (shape === "octagonal") {
            const corner = Math.min(2, Math.floor(Math.min(width, height) / 4));
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (x + y < corner) continue;
                    if ((width - 1 - x) + y < corner) continue;
                    if (x + (height - 1 - y) < corner) continue;
                    if ((width - 1 - x) + (height - 1 - y) < corner) continue;
                    grid[y][x] = true;
                }
            }
        } else if (shape === "t_shape") {
            const stemW = Math.max(5, Math.floor(width * 0.6));
            const stemX0 = Math.floor((width - stemW) / 2);
            const stemX1 = stemX0 + stemW;
            const hTop = divider;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (y < hTop || (x >= stemX0 && x < stemX1)) {
                        grid[y][x] = true;
                    }
                }
            }
        } else if (shape === "cruciform") {
            const cutW = Math.max(1, Math.floor(width * 0.22));
            const cutH = Math.max(1, Math.floor(height * 0.22));
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const isTL = (x < cutW && y < cutH);
                    const isTR = (x >= width - cutW && y < cutH);
                    const isBL = (x < cutW && y >= height - cutH);
                    const isBR = (x >= width - cutW && y >= height - cutH);
                    if (isTL || isTR || isBL || isBR) continue;
                    grid[y][x] = true;
                }
            }
        } else if (shape === "alcove") {
            const cutW = Math.max(2, Math.floor(width * 0.25));
            const cutH = Math.max(2, Math.floor(height * 0.25));
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (x >= width - cutW && y >= height - cutH) continue;
                    grid[y][x] = true;
                }
            }
        } else if (shape === "u_shape") {
            const cutY = Math.max(divider + 2, Math.floor(height * 0.7));
            const courtW = Math.max(3, Math.floor(width * 0.35));
            const cutX0 = Math.floor((width - courtW) / 2);
            const cutX1 = cutX0 + courtW;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (y >= cutY && x >= cutX0 && x < cutX1) continue;
                    grid[y][x] = true;
                }
            }
        } else if (shape === "longhouse") {
            for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) grid[y][x] = true;
        } else {
            for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) grid[y][x] = true;
        }

        return (x, y) => {
            if (x < 0 || y < 0 || x >= width || y >= height) return false;
            return !!grid[y][x];
        };
    }

    function designFor(h, need, annex = false) {
        const people = members(h), social = Math.round(people.reduce((n, u) => n +
            (u.data.facets && Number.isFinite(u.data.facets.sociability) ? u.data.facets.sociability : 50), 0) / Math.max(1, people.length));
        const roll = hash(W().state.seed || 0, h.id, h.faction, h.siteId, h.z, annex ? structures(h).length : 0, social);
        const variant = roll % 100 < 25 + social / 2 ? 1 : 0;
        const maxRank = Math.max(0, ...people.map(u => (u && u.data && Number.isFinite(u.data.rank) ? u.data.rank : 0)));
        let capacity, width, height, sleepRows, size;
        if (annex) {
            capacity = need <= 2 ? 2 : Math.ceil(need / 2) * 2;
            width = capacity <= 4 ? 7 + variant : 9 + variant;
            sleepRows = Math.max(3, Math.ceil(capacity / 2)); height = sleepRows + 2; size = "annex";
        } else if (maxRank >= 2) {
            // Higher ranks in society get larger homes: Ruler / Lord Manor / Great Hall
            capacity = Math.max(8, need);
            width = variant ? 13 : 11;
            sleepRows = Math.max(3, Math.ceil(capacity / 4));
            height = sleepRows + 7;
            size = "manor";
        } else if (maxRank === 1) {
            // Site Leader / Elder / Master Craftsman Estate / Longhouse
            capacity = Math.max(4, need);
            width = variant ? 11 : 9;
            sleepRows = Math.max(2, Math.ceil(capacity / 2));
            height = sleepRows + 6;
            size = "estate";
        } else if (need <= 2) {
            capacity = 2; width = variant ? 7 : 6; height = 8; sleepRows = 2; size = "small";
        } else if (need <= 4) {
            capacity = 4; width = variant ? 9 : 7; height = variant ? 8 : 9; sleepRows = variant ? 2 : 3; size = "family";
        } else if (need <= 8) {
            capacity = 8; width = variant ? 11 : 9; height = variant ? 9 : 10; sleepRows = variant ? 3 : 4; size = "extended";
        } else {
            capacity = Math.ceil(need / 4) * 4; width = variant ? 13 : 11;
            sleepRows = Math.ceil(capacity / 4); height = sleepRows + 6; size = "large";
        }

        // Cultural architectural footprint archetype:
        let shape = "box";
        if (!annex) {
            const species = (people[0] && people[0].data && people[0].data.species) || "human";
            const pool = SHAPES_BY_SPECIES[species] || SHAPES_BY_SPECIES.default;
            const validPool = pool.filter(s => {
                if (s === "u_shape" && width < 9) return false;
                if (s === "cruciform" && width < 8) return false;
                if (width < 7 && s !== "box" && s !== "longhouse") return false;
                return true;
            });
            const shapeIdx = (roll >>> 5) % validPool.length;
            shape = validPool[shapeIdx];
        }

        return { version: 1, kind: annex ? "bedroom" : "home", size, variant, capacity, width, height, sleepRows,
            shape,
            rotation: (roll >>> 8) % 4, mirrored: !!((roll >>> 10) & 1),
            outerLane: 2 + (roll >>> 12) % (width - 4), innerLane: 2 + (roll >>> 17) % (width - 4),
            householdSize: people.length, requiredBeds: need, sociability: social, rank: maxRank };
    }
    function dimensions(d) { return d.rotation % 2 ? { w: d.height, h: d.width } : { w: d.width, h: d.height }; }
    function layout(x, y, wall, door, design) {
        const width = design.width, height = design.height, divider = design.sleepRows + 1, annex = design.kind === "bedroom";
        const shape = design.shape || "box";
        const inFootprint = makeFootprint(shape, width, height, design.sleepRows);

        const transform = p => {
            let px = design.mirrored ? width - 1 - p.x : p.x, py = p.y;
            if (design.rotation === 1) [px, py] = [height - 1 - py, px];
            else if (design.rotation === 2) [px, py] = [width - 1 - px, height - 1 - py];
            else if (design.rotation === 3) [px, py] = [py, width - 1 - px];
            return { x: x + px, y: y + py };
        };

        const isPerim = (px, py) => !inFootprint(px - 1, py) || !inFootprint(px + 1, py) ||
                                    !inFootprint(px, py - 1) || !inFootprint(px, py + 1);

        // Find valid outerLane on the true bottom wall (y = height - 1)
        let outerLane = design.outerLane;
        let bottomY = height - 1;
        const isValidBottom = px => inFootprint(px, height - 1) && !inFootprint(px, height) &&
                                    inFootprint(px, height - 2) && inFootprint(px - 1, height - 1) && inFootprint(px + 1, height - 1);
        if (!isValidBottom(outerLane)) {
            let candidates = [];
            for (let px = 1; px < width - 1; px++) {
                if (isValidBottom(px)) candidates.push(px);
            }
            if (candidates.length > 0) {
                candidates.sort((a, b) => Math.abs(a - design.outerLane) - Math.abs(b - design.outerLane));
                outerLane = candidates[0];
            } else {
                for (let px = 1; px < width - 1; px++) {
                    if (inFootprint(px, height - 1)) { outerLane = px; break; }
                }
            }
        }

        // Interior door on divider: must have walkable interior floor on BOTH sides (divider - 1 and divider + 1)
        let innerLane = design.innerLane;
        const isValidDivider = px => inFootprint(px, divider) && !isPerim(px, divider) &&
                                     inFootprint(px, divider - 1) && !isPerim(px, divider - 1) &&
                                     inFootprint(px, divider + 1) && !isPerim(px, divider + 1);
        if (!isValidDivider(innerLane)) {
            let candidates = [];
            for (let px = 1; px < width - 1; px++) {
                if (isValidDivider(px)) candidates.push(px);
            }
            if (candidates.length > 0) {
                candidates.sort((a, b) => Math.abs(a - design.innerLane) - Math.abs(b - design.innerLane));
                innerLane = candidates[0];
            }
        }

        const doors = [{ x: outerLane, y: bottomY }];
        if (!annex) doors.push({ x: innerLane, y: divider });

        const walls = [], sleeping = [], beds = [], floors = [];
        for (let py = 0; py < height; py++) {
            for (let px = 0; px < width; px++) {
                if (!inFootprint(px, py)) continue;

                const isPerimeter = isPerim(px, py);
                const isDivider = !annex && py === divider && !isPerimeter;
                const isDoor = doors.some(d => d.x === px && d.y === py);

                if ((isPerimeter || isDivider) && !isDoor) {
                    walls.push(transform({ x: px, y: py }));
                }
                if (!isPerimeter && py > 0 && py <= design.sleepRows) {
                    sleeping.push(transform({ x: px, y: py }));
                }
                if (!isPerimeter && !isDivider) {
                    floors.push(transform({ x: px, y: py }));
                }
            }
        }

        // Beds placement in sleeping area
        const bedColumns = !annex && width >= 11 ? [1, width - 2, 2, width - 3] : [1, width - 2];
        for (let py = 1; py <= design.sleepRows; py++) {
            for (const px of bedColumns) {
                if (beds.length < design.capacity && inFootprint(px, py)) {
                    if (!isPerim(px, py) && py < divider) {
                        beds.push(Object.assign(transform({ x: px, y: py }), { unitId: null }));
                    }
                }
            }
        }
        if (beds.length < design.capacity) {
            for (let py = 1; py <= design.sleepRows; py++) {
                for (let px = 1; px < width - 1; px++) {
                    if (beds.length >= design.capacity) break;
                    if (inFootprint(px, py) && !isPerim(px, py) && py < divider) {
                        const pt = transform({ x: px, y: py });
                        if (!beds.some(b => b.x === pt.x && b.y === pt.y)) {
                            beds.push(Object.assign(pt, { unitId: null }));
                        }
                    }
                }
            }
        }
        if (beds.length < design.capacity) {
            for (let py = 1; py < height - 1; py++) {
                if (py === divider) continue;
                for (let px = 1; px < width - 1; px++) {
                    if (beds.length >= design.capacity) break;
                    if (inFootprint(px, py) && !isPerim(px, py)) {
                        const pt = transform({ x: px, y: py });
                        if (!beds.some(b => b.x === pt.x && b.y === pt.y)) {
                            beds.push(Object.assign(pt, { unitId: null }));
                        }
                    }
                }
            }
        }

        // Spots (2 adjacent cells for couple)
        let s0 = null, s1 = null;
        const midX = Math.floor(width / 2);
        const sPy = Math.min(design.sleepRows, divider - 1);
        for (let px = 1; px < width - 2; px++) {
            if (inFootprint(px, sPy) && inFootprint(px + 1, sPy) && !isPerim(px, sPy) && !isPerim(px + 1, sPy)) {
                s0 = transform({ x: px, y: sPy });
                s1 = transform({ x: px + 1, y: sPy });
                break;
            }
        }
        if (!s0) {
            s0 = sleeping[0] || transform({ x: 1, y: 1 });
            s1 = sleeping[1] || transform({ x: 2, y: 1 });
        }

        // Hearth: in living area, with distance >= 2 from all walls, doors, beds, storage
        let hearth = null;
        if (!annex) {
            const existingBlocked = [...walls, ...doors.map(transform), ...beds];
            const isSafeHearth = pt => existingBlocked.every(p => Math.abs(p.x - pt.x) + Math.abs(p.y - pt.y) >= 2);
            let candidates = [];
            for (let py = divider + 1; py < height - 1; py++) {
                for (let px = 1; px < width - 1; px++) {
                    if (inFootprint(px, py) && !isPerim(px, py)) {
                        const pt = transform({ x: px, y: py });
                        if (isSafeHearth(pt)) {
                            const score = Math.abs(px - midX) + Math.abs(py - (divider + 2));
                            candidates.push({ px, py, pt, score });
                        }
                    }
                }
            }
            if (candidates.length > 0) {
                candidates.sort((a, b) => a.score - b.score);
                hearth = { x: candidates[0].px, y: candidates[0].py };
            } else {
                hearth = { x: midX, y: Math.min(height - 2, divider + 2) };
            }
        }

        // Domestic furniture & amenities:
        const hearthPt = hearth ? transform(hearth) : null;
        let storage = null;
        if (!annex) {
            for (let py = height - 2; py > divider; py--) {
                for (let px = width - 2; px > 1; px--) {
                    if (inFootprint(px, py) && !isPerim(px, py)) {
                        const pt = transform({ x: px, y: py });
                        if (!hearthPt || (Math.abs(pt.x - hearthPt.x) + Math.abs(pt.y - hearthPt.y) >= 2)) {
                            storage = pt;
                            break;
                        }
                    }
                }
                if (storage) break;
            }
        }

        const kitchenCounter = annex || width < 7 ? null : transform({ x: 1, y: Math.min(height - 2, divider + 2) });
        const kitchenPantry = annex || width < 7 ? null : transform({ x: 2, y: Math.min(height - 2, divider + 2) });
        const diningTable = annex || width < 7 ? null : transform({ x: midX, y: Math.min(height - 3, divider + 3) });
        const diningBench = annex || width < 7 ? null : transform({ x: midX + 1, y: Math.min(height - 3, divider + 3) });
        const workbench = annex || width < 7 ? null : transform({ x: 1, y: height - 2 });
        const weaponRack = annex || width < 7 ? null : transform({ x: width - 2, y: Math.min(height - 2, divider + 2) });
        const crib = annex || width < 7 ? null : transform({ x: width - 2, y: 1 });
        const shopCounter = annex || width < 7 ? null : transform({ x: width - 3, y: height - 2 });

        return Object.assign({
            x, y, wall, door, design, walls,
            doors: doors.map(transform),
            sleeping, beds, floors,
            spots: [s0, s1],
            hearth: hearth && transform(hearth),
            kitchenCounter, kitchenPantry, diningTable, diningBench, storage,
            workbench, weaponRack, crib, shopCounter,
            hearthClearance: hearth ? [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => transform({ x: hearth.x + dx, y: hearth.y + dy })) : [],
            entrance: transform({ x: outerLane, y: bottomY + 1 }),
            steps: []
        }, dimensions(design));
    }
    function isNaturalRock(h, x, y, z) {
        const L = window.UF && UF.Levels;
        if (!L || typeof L.shapeAt !== "function") return false;
        const currentZ = z !== undefined ? z : zOf(h);
        const s = L.shapeAt({ area: areaOf(h), x, y, z: currentZ });
        return s === "solid" || s === 1;
    }
    function isStructuralEnclosureAt(h, x, y, z, expectedWallId) {
        if (isNaturalRock(h, x, y, z)) return true;
        const obj = object(h, { x, y });
        if (!obj) return false;
        if (expectedWallId && obj.id === expectedWallId) return true;
        if (obj.type && Array.isArray(obj.type.tags) && obj.type.tags.includes("wall")) return true;
        if (typeof obj.id === "string" && (obj.id.startsWith("wall_") || obj.id.includes("wall"))) return true;
        return false;
    }
    function isDoorEnclosureAt(h, x, y, z, expectedDoorId) {
        const obj = object(h, { x, y });
        if (!obj) return false;
        if (expectedDoorId && obj.id === expectedDoorId) return true;
        if (obj.type && Array.isArray(obj.type.tags) && obj.type.tags.includes("door")) return true;
        if (typeof obj.id === "string" && (obj.id.startsWith("door_") || obj.id.includes("door"))) return true;
        return false;
    }
    function footprintOK(h, home, u, reservations, occupied, bootstrap) {
        const built = new Set([...home.walls, ...home.doors, ...home.beds, home.hearth, home.kitchenCounter, home.kitchenPantry, home.diningTable, home.diningBench, home.storage, home.workbench, home.weaponRack, home.crib].filter(Boolean).map(p => key(p.x, p.y)));
        const clear = new Set((home.hearthClearance || []).map(p => key(p.x, p.y)));
        const isWallCell = (x, y) => home.walls.some(w => w.x === x && w.y === y);
        for (let y = home.y; y < home.y + home.h; y++) for (let x = home.x; x < home.x + home.w; x++) {
            const k = key(x, y), p = { x, y }, o = object(h, p);
            if (UF.Agriculture && UF.Agriculture.reserved({ area: h.area, x, y, z: zOf(h) })) return false;
            // Natural solid geological terrain & existing structural walls satisfy perimeter boundary!
            if (isWallCell(x, y) && (isNaturalRock(h, x, y, zOf(h)) || isStructuralEnclosureAt(h, x, y, zOf(h), home.wall))) {
                if (reservations.has(k) || occupied.has(k) || bootstrap.has(k)) return false;
                continue;
            }
            if (!dry(h, x, y) || reservations.has(k) || occupied.has(k) || bootstrap.has(k) || has(o, "building") || has(o, "ruin")) return false;
            if (Own() && Own().ownerOf(ref(h, p))) return false;
            if (clear.has(k) && o) return false; // No existing plant/furniture in the hearth's four-neighbor buffer.
            if (o && o.passable !== true && (!built.has(k) || !o.actions || !Object.keys(o.actions).length)) return false;
        }
        const e = home.entrance, eo = object(h, e);
        if (UF.Agriculture && UF.Agriculture.reserved({ area: h.area, x: e.x, y: e.y, z: zOf(h) })) return false;
        if (!dry(h, e.x, e.y) || (eo && eo.passable !== true) || occupied.has(key(e.x, e.y)) || reservations.has(key(e.x, e.y))) return false;
        const w = W();
        return typeof w.reachable === "function" && w.reachable(areaOf(h), u.x, u.y, e.x, e.y);
    }
    function findPlot(h, u, design, annex = false) {
        let c = C() && C().state(u);
        if (!c || !samePlace(h, c)) {
            const w = W();
            const sites = (w && w.state && w.state.history && w.state.history.sites) || [];
            const siteRec = sites.find(s => s.id === h.siteId || (s.faction === h.faction && samePlace(h, s)));
            if (siteRec) {
                c = { site: { x: siteRec.x, y: siteRec.y }, area: copyArea(siteRec.area), z: zOf(siteRec) };
            }
        }
        const o = O(), culture = C() && C().culture(u) || {};
        if (!c || !samePlace(h, c) || !o) { h.reason = "No same-level settlement"; return null; }
        let wall = (window.UF && UF.CultureGrowth && UF.CultureGrowth.preferredWall) ?
            UF.CultureGrowth.preferredWall(h.faction) : (culture.wall || "wall_wood");
        let door = (window.UF && UF.CultureGrowth && UF.CultureGrowth.preferredDoor) ?
            UF.CultureGrowth.preferredDoor(h.faction) : (culture.door || "door_wood");
        // Some approved cultures start with a ruin-style wall descriptor that
        // has no recipe. Only their own existing laterWall is a valid fallback.
        if (!o.type(wall) || !o.type(wall).build) {
            if (culture.laterWall) wall = culture.laterWall;
            else wall = "wall_wood";
        }
        if ((!window.UF || !UF.CultureGrowth || !UF.CultureGrowth.preferredDoor) && (wall === "wall_stone" || wall.includes("stone"))) {
            if (o.type("door_stone") && o.type("door_stone").build) door = "door_stone";
        }
        if (!o.type(door) || !o.type(door).build) door = "door_wood";
        if ([wall, door, ...SUPPORTED].some(id => !o.type(id) || !o.type(id).build)) { h.reason = "Home building definitions unavailable"; return null; }
        const reserved = new Set(), occupied = new Set(), bootstrap = new Set();
        // Natural passages and their access cells survive later housing growth.
        // Markers are not catalog objects, so the ordinary building test alone cannot protect them.
        const connections = W().state.naturalConnections;
        const access = (connections && connections.links || []).flatMap(link => [link.a, link.b])
            .concat((connections && connections.chains || []).flatMap(chain => chain.landings || []));
        for (const p of access) if (samePlace(h, p)) {
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reserved.add(key(p.x + dx, p.y + dy));
        }
        for (const other of Object.values(state().byId)) if (samePlace(h, other)) for (const p of structures(other))
            for (let y = p.y - 1; y <= p.y + p.h; y++) for (let x = p.x - 1; x <= p.x + p.w; x++) reserved.add(key(x, y));
        for (const p of W().units()) if (!dead(p) && samePlace(h, p)) occupied.add(key(p.x, p.y));
        // Contiguous Family Housing Search ("Homes Into Each Other"):
        // Abutting candidates sharing party walls are strictly for bedroom annexes of the same household.
        // Distinct household homes must remain detached with buffer spacing for settlement navigation.
        const kinStructures = [];
        const isAnnex = !!annex || (design && design.kind === "bedroom");
        if (isAnnex && h.home) kinStructures.push(...structures(h));

        if (kinStructures.length > 0) {
            const size = dimensions(design);
            for (const anchor of kinStructures) {
                // Abutting candidates sharing party walls on 4 sides:
                const candidates = [
                    layout(anchor.x + anchor.w - 1, anchor.y, wall, door, design),
                    layout(anchor.x, anchor.y + anchor.h - 1, wall, door, design),
                    layout(anchor.x - size.w + 1, anchor.y, wall, door, design),
                    layout(anchor.x, anchor.y - size.h + 1, wall, door, design)
                ];
                for (const candidate of candidates) {
                    if (candidate.x < 1 || candidate.y < 1 || candidate.x + size.w >= (W().state.size - 1) || candidate.y + size.h >= (W().state.size - 1)) continue;
                    const anchorBuffer = new Set();
                    for (let ay = anchor.y - 1; ay <= anchor.y + anchor.h; ay++) {
                        for (let ax = anchor.x - 1; ax <= anchor.x + anchor.w; ax++) {
                            anchorBuffer.add(key(ax, ay));
                        }
                    }
                    const candidateReserved = new Set([...reserved].filter(k => !anchorBuffer.has(k)));
                    if (footprintOK(h, candidate, u, candidateReserved, occupied, bootstrap)) {
                        candidate.sharedPartyWall = true;
                        candidate.anchorHomeId = h.id ? `${h.id}:main` : "home:main";
                        candidate.anchorHouseholdId = h.id || null;
                        Object.defineProperty(candidate, "anchorHome", {
                            get: function() { return h && h.home ? h.home : null; },
                            enumerable: false,
                            configurable: true
                        });
                        return candidate;
                    }
                }
            }
        }

        for (let r = 1; r <= SEARCH_RINGS; r++) for (let gy = -r; gy <= r; gy++) for (let gx = -r; gx <= r; gx++) {
            if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
            const size = dimensions(design);
            const candidate = layout(c.site.x - Math.floor(size.w / 2) + gx * 9,
                c.site.y - Math.floor(size.h / 2) + gy * 9, wall, door, design);
            if (footprintOK(h, candidate, u, reserved, occupied, bootstrap)) {
                return candidate;
            }
        }
        h.reason = "No dry accessible space within the bounded home search";
        return null;
    }
    function claimVacantHome(h, u) {
        const s = state();
        if (!s) return null;
        const vacant = Object.values(s.byId).find(otherH =>
            otherH.id !== h.id && !otherH.mergedInto && otherH.home && !otherH.home.isShared && members(otherH).length === 0 && samePlace(otherH, h)
        );
        if (vacant) {
            h.previousSharedHome = h.home;
            h.home = vacant.home;
            h.reason = "Claimed vacant homestead; construction continuing";
            vacant.mergedInto = h.id;
            emit("households:homePlanned", h, h.home);
            emit("households:inherited", h, u);
            return h.home;
        }
        return null;
    }
    function ensureHome(h, u) {
        if (h.home && !h.home.isShared) return h.home;
        if (h.home && h.home.isShared) {
            // The original 8 founders share the Town Hall communally.
            // They only leave when they pair up (forming a new family household).
            // Non-founders (immigrants, grown children) always seek private homes.
            const mems = members(h);
            const allFounders = mems.every(m => m.data && m.data.founder);
            const hasPair = mems.length >= 2 && mems.some(m => m.data && (m.data.partner || m.data.partnerId));

            // Founders without a partner stay in the town hall
            if (allFounders && !hasPair) return h.home;

            // Any home without ownership can be claimed by a member of the faction
            const claimed = claimVacantHome(h, u);
            if (claimed) return claimed;

            // Once the town hall is sheltered, paired founders and non-founders seek private plots
            const sheltered = typeof isSheltered === "function" ? isSheltered(h) : h.home.isRoofed;
            if (sheltered) {
                if (h.lastSearchDay === day()) return h.home;
                h.lastSearchDay = day();
                const p = findPlot(h, u, designFor(h, Math.max(2, mems.length)));
                if (p) {
                    h.previousSharedHome = h.home;
                    h.home = p;
                    h.reason = hasPair ? "Newlywed homestead reserved; construction needed"
                                       : "Private homestead reserved; construction needed";
                    emit("households:homePlanned", h, p);
                    return p;
                }
            }
            return h.home;
        }
        const claimed = claimVacantHome(h, u);
        if (claimed) return claimed;
        if (h.lastSearchDay === day()) return null;
        h.lastSearchDay = day();
        const p = findPlot(h, u, designFor(h, members(h).length));
        if (p) { h.home = p; h.reason = "Home reserved; construction needed"; emit("households:homePlanned", h, p); }
        return p;
    }
    function ensureExpansion(h, u) {
        const count = members(h).length, capacity = structures(h).reduce((n, p) => n + p.beds.length, 0), missing = count - capacity;
        if (missing <= 0) { h.expansionBlocked = false; return; }
        const request = `${day()}:${count}`;
        if (h.expansionSearch === request) return;
        h.expansionSearch = request;
        const homeReason = h.reason;
        const p = findPlot(h, u, designFor(h, missing, true));
        h.reason = homeReason;
        if (p) {
            (h.home.annexes || (h.home.annexes = [])).push(p);
            h.expansionBlocked = false; h.expansionReason = "Bedroom annex reserved; materials and construction needed";
            emit("households:annexPlanned", h, p);
        } else { h.expansionBlocked = true; h.expansionReason = "Expansion blocked: no dry accessible bedroom plot; a larger home is still needed"; }
    }
    function syncHome(h) {
        const home = h.home, own = Own(), current = members(h);
        if (!home) return;
        const buildings = structures(h), beds = buildings.flatMap(p => p.beds);
        const residents = home.isShared ? all().filter(otherH => otherH.home === home).flatMap(otherH => members(otherH)) : current;
        const ids = new Set(residents.map(u => u.id));
        for (const b of beds) if (!ids.has(b.unitId)) b.unitId = null;
        for (const u of current) if (!beds.some(b => b.unitId === u.id)) {
            const b = beds.find(b => b.unitId === null);
            if (b) b.unitId = u.id;
        }
        if (own) for (const b of beds) {
            const u = unitOf(b.unitId), owner = own.ownerOf(ref(h, b));
            if (u && samePlace(h, u) && object(h, b) && object(h, b).id === "floor_straw" &&
                (!owner || (owner.kind === "unit" && owner.id === u.id))) {
                const assigned = own.bedOf ? own.bedOf(u) : u.data.bed;
                if (!assigned || !samePlace(h, assigned) || assigned.x !== b.x || assigned.y !== b.y) {
                    if (typeof own.assignBed === "function") own.assignBed(u, ref(h, b));
                    else u.data.bed = { area: copyArea(h.area), x: b.x, y: b.y, z: zOf(h) };
                }
            }
        }
        const doors = window.UF && UF.Doors;
        if (doors && doors.stateAt) for (const building of buildings) for (const p of building.doors) {
            // Reserved footprints contained no prior doors; this state belongs
            // to construction for this household, not the default player faction.
            const owner = own && own.ownerOf(ref(h, p));
            if (object(h, p) && object(h, p).id === building.door && (!owner || owner.kind === "faction" && owner.id === h.faction)) {
                const s = doors.stateAt(areaOf(h), p.x, p.y);
                if (s) s.faction = h.faction;
            }
        }
        // Physical Move-In / Housewarming event: couple occupies their private homestead
        const targetHome = h.privateHomestead || (!home.isShared ? home : null);
        if (h && !h.isMovedIn && targetHome && strictEnclosure(h, targetHome) && (targetHome.beds || []).some(b => object(h, b))) {
            h.isMovedIn = true;
            h.previousSharedHome = h.home;
            h.home = targetHome;
            delete h.privateHomestead;
            if (h.previousSharedHome) {
                for (const m of current) {
                    if (m.data && m.data.bed && m.data.bed.isShared) {
                        const thBed = (h.previousSharedHome.beds || []).find(b => b.unitId === m.id);
                        if (thBed) thBed.unitId = null;
                        m.data.bed = null;
                    }
                }
            }
            for (const m of current) {
                if (m && m.data) {
                    m.data.housewarmingIntimacy = true;
                    if (window.UF && UF.Colonists && typeof UF.Colonists.addThought === "function") {
                        UF.Colonists.addThought(m, "Moved into our new home!", 15);
                    }
                }
            }
            emit("households:movedIn", h, current);
        }
    }
    function callingFor(u) {
        u = unitOf(u);
        if (!u || !u.data) return null;
        if (u.data.callingStation) return u.data.callingStation;

        const WORKSTATIONS = {
            blacksmith: { station: "smithy", station2: "furnace", title: "Blacksmith", shop: "Forge & Armory" },
            carpenter: { station: "workbench", station2: "chest_wood", title: "Carpenter", shop: "Woodcraft Shop" },
            potter: { station: "pottery_kiln", station2: "chest_wood", title: "Potter & Brickmaker", shop: "Kiln & Brickyard" },
            mason: { station: "mason_bench", station2: "chest_wood", title: "Stone Mason", shop: "Mason's Yard" },
            bowyer: { station: "bowyer_bench", station2: "fletcher_bench", title: "Bowyer & Fletcher", shop: "Archery Shop" },
            tanner: { station: "tanning_rack", station2: "chest_wood", title: "Tanner & Furrier", shop: "Leather Shop" },
            apothecary: { station: "apothecary_bench", station2: "kitchen_pantry", title: "Apothecary", shop: "Apothecary" },
            cook: { station: "kitchen_hearth", station2: "dining_table", title: "Chef & Baker", shop: "Tavern & Bakery" },
            merchant: { station: "shop_counter", station2: "chest_wood", title: "Merchant", shop: "General Store" }
        };

        const CALLING_TO_STATION = {
            blacksmith: "blacksmith", weaponsmith: "blacksmith", armorsmith: "blacksmith",
            carpenter: "carpenter",
            potter: "potter", brickmaker: "potter",
            mason: "mason", stonemason: "mason", stonecutter: "mason",
            fletcher: "bowyer", bowyer: "bowyer",
            tanner: "tanner", leatherworker: "tanner",
            physician: "apothecary", medic: "apothecary", herbalist: "apothecary", surgeon: "apothecary", alchemist: "apothecary",
            chef: "cook", butcher: "cook", brewer: "cook", cheesewright: "cook", miller: "cook",
            merchant: "merchant", shopkeeper: "merchant", broker: "merchant", innkeep: "merchant"
        };

        // Check if unit has assigned callings that map to a domestic workstation
        const callingsList = Array.isArray(u.data.callings) ? u.data.callings : (u.data.calling ? [u.data.calling] : []);
        for (const c of callingsList) {
            const cid = typeof c === "string" ? c.toLowerCase() : (c && c.id);
            const mapped = CALLING_TO_STATION[cid];
            if (mapped && WORKSTATIONS[mapped]) {
                const res = Object.assign({ id: mapped, score: 150 }, WORKSTATIONS[mapped]);
                u.data.callingStation = res;
                if (u.data.calling && typeof u.data.calling === "object") Object.assign(u.data.calling, res);
                else if (!u.data.calling) u.data.calling = res;
                return res;
            }
        }

        const facets = u.data.facets || {};
        const skills = u.data.skills || {};
        const getF = k => Number.isFinite(facets[k]) ? facets[k] : 50;
        const getS = k => (skills[k] && skills[k].level) || 0;

        const scores = {
            blacksmith: getF("industriousness") * 1.2 + getF("bravery") * 0.8 + getS("smithing") * 10 + getS("mining") * 5,
            carpenter: getF("curiosity") * 1.0 + getF("industriousness") * 1.0 + getS("carpentry") * 10 + getS("crafting") * 5,
            potter: getF("industriousness") * 1.0 + getF("patience") * 1.0 + getS("crafting") * 10,
            mason: getF("industriousness") * 1.1 + getF("bravery") * 0.9 + getS("stonework") * 10 + getS("mining") * 5,
            bowyer: getF("natureAffinity") * 1.2 + getF("patience") * 0.8 + getS("fletching") * 10 + getS("ranged") * 5,
            tanner: getF("industriousness") * 1.0 + getF("tidiness") * 1.0 + getS("leatherwork") * 10,
            apothecary: getF("curiosity") * 1.2 + getF("natureAffinity") * 0.8 + getS("healing") * 10,
            cook: getF("sociability") * 1.2 + getF("cheerfulness") * 0.8 + getS("cooking") * 10,
            merchant: getF("ambition") * 1.3 + getF("sociability") * 0.9
        };

        let best = null, maxScore = 0;
        for (const [trade, score] of Object.entries(scores)) {
            if (score > maxScore) { maxScore = score; best = trade; }
        }
        if (maxScore < 100) return null;

        const res = Object.assign({ id: best, score: Math.round(maxScore) }, WORKSTATIONS[best]);
        u.data.callingStation = res;
        if (u.data.calling && typeof u.data.calling === "object") Object.assign(u.data.calling, res);
        else if (!u.data.calling) u.data.calling = res;
        return res;
    }

    function planSteps(u) {
        u = unitOf(u);
        if (!person(u) || dead(u)) return [];
        if (!of(u)) reconcile();
        const h = of(u);
        if (!h || !samePlace(h, u) || !adult(u)) return [];
        let c = C() && C().state(u);
        if (!c || !samePlace(h, c) || !c.site) {
            const w = W();
            const sites = (w && w.state && w.state.history && w.state.history.sites) || [];
            const siteRec = sites.find(s => s.id === h.siteId || (s.faction === h.faction && samePlace(h, s)));
            if (siteRec) {
                c = { site: { x: siteRec.x, y: siteRec.y }, area: copyArea(siteRec.area), z: zOf(siteRec) };
            } else if (h.home) {
                c = { site: { x: h.home.x, y: h.home.y }, area: copyArea(h.area), z: zOf(h) };
            }
        }
        if (!c || !c.site) return [];
        const home = (h.privateHomestead && !h.isMovedIn) ? h.privateHomestead : ensureHome(h, u);
        if (!home) return [];
        ensureExpansion(h, u);
        syncHome(h);
        const previous = new Map((home.steps || []).map(s => [s.id, s]));
        const step = (suffix, build, cells, extras) => {
            const id = `${h.id}_${suffix}`, offsets = cells.map(p => [p.x - c.site.x, p.y - c.site.y]);
            const existing = previous.get(id);
            if (existing && existing.build === build && JSON.stringify(existing.cells) === JSON.stringify(offsets)) return existing;
            // Only a changed step loses its completion/celebration flags. Stable
            // objects let save data and the executor retain real plan progress.
            return Object.assign({ id, build, cells: offsets, exact: true, household: h.id }, extras || {});
        };
        // Exact placement is essential: another household's beds/hearth do not
        // satisfy these steps. Natural rock boundaries do not require construction.
        const buildableWalls = home.walls.filter(w => !isNaturalRock(h, w.x, w.y, zOf(h)));
        const culture = C() && C().culture(u) || {};
        const o = O();

        // 5 base bootstrap steps for fresh unbuilt homes:
        home.steps = [
            step("walls", home.wall, buildableWalls),
            step("doors", home.door, home.doors),
            step("beds", "floor_straw", home.beds.filter(b => b.unitId !== null)),
            step("hearth", "campfire", [home.hearth].filter(Boolean)),
            step("storage", "stockpile", [home.storage].filter(Boolean), { stores: ["food"] })
        ];

        for (let i = 0; i < (home.annexes || []).length; i++) {
            const a = home.annexes[i];
            const annexWalls = a.walls.filter(w => !isNaturalRock(h, w.x, w.y, zOf(h)));
            home.steps.push(
                step(`annex${i}_doors`, a.door, a.doors),
                step(`annex${i}_walls`, a.wall, annexWalls),
                step(`annex${i}_beds`, "floor_straw", a.beds.filter(b => b.unitId !== null))
            );
        }

        const baseBuilt = strictEnclosure(h, home) &&
            home.beds.some(b => object(h, b) && (object(h, b).id === "floor_straw" || object(h, b).id === "bed_wood")) &&
            object(h, home.hearth) && (object(h, home.hearth).id === "campfire" || object(h, home.hearth).id === "kitchen_hearth") &&
            object(h, home.storage) && (object(h, home.storage).id === "stockpile" || object(h, home.storage).id === "chest_wood");
        const d = demands(h);
        const noDemands = !d.bedrooms && !d.beds && !d.cooking && !d.storage;

        // Progressive domestic improvement: floors, furniture, kitchens, calling workshops & shops:
        if (baseBuilt && noDemands && home.design && o) {
            // Stage 2: Interior floors
            const cultureFloor = (culture.floor && culture.floor.kind) || (zOf(h) < 0 || h.faction === "dwarf" ? "floor_stone" : "floor_wood");
            if (home.floors && home.floors.length) {
                home.steps.push(step("floors", cultureFloor, home.floors));
            }
            for (let i = 0; i < (home.annexes || []).length; i++) {
                const a = home.annexes[i];
                if (a.floors && a.floors.length) {
                    home.steps.push(step(`annex${i}_floors`, a.floor || cultureFloor, a.floors));
                }
            }

            // Stage 3: Kitchen & Dining appointments
            if (home.kitchenCounter && o.type("kitchen_counter") && o.type("kitchen_counter").build) {
                home.steps.push(step("kitchen_counter", "kitchen_counter", [home.kitchenCounter]));
            }
            if (home.kitchenPantry && o.type("kitchen_pantry") && o.type("kitchen_pantry").build) {
                home.steps.push(step("kitchen_pantry", "kitchen_pantry", [home.kitchenPantry], { stores: ["food"] }));
            }
            if (home.hearth && o.type("kitchen_hearth") && o.type("kitchen_hearth").build) {
                home.steps.push(step("kitchen_hearth", "kitchen_hearth", [home.hearth]));
            }
            if (home.diningTable && o.type("dining_table") && o.type("dining_table").build) {
                home.steps.push(step("dining_table", "dining_table", [home.diningTable]));
            }
            if (home.diningBench && o.type("dining_bench") && o.type("dining_bench").build) {
                home.steps.push(step("dining_bench", "dining_bench", [home.diningBench]));
            }

            // Stage 4: Bed upgrades & Domestic Storage Chest
            if (o.type("bed_wood") && o.type("bed_wood").build) {
                home.steps.push(step("beds_wood", "bed_wood", home.beds.filter(b => b.unitId !== null)));
            }
            if (home.storage && o.type("chest_wood") && o.type("chest_wood").build) {
                home.steps.push(step("chest_wood", "chest_wood", [home.storage]));
            }

            // Stage 5: Personality Calling Workstations & Shops
            const calling = members(h).map(callingFor).filter(Boolean)[0];
            if (calling) {
                if (home.workbench && o.type(calling.station) && o.type(calling.station).build) {
                    home.steps.push(step("calling_station", calling.station, [home.workbench]));
                }
                if (home.shopCounter && o.type("shop_counter") && o.type("shop_counter").build) {
                    home.steps.push(step("shop_counter", "shop_counter", [home.shopCounter]));
                }
            } else if (home.workbench && o.type("workbench") && o.type("workbench").build) {
                home.steps.push(step("workbench", "workbench", [home.workbench]));
            }

            if (home.weaponRack && o.type("weapon_rack") && o.type("weapon_rack").build) {
                home.steps.push(step("weapon_rack", "weapon_rack", [home.weaponRack]));
            }
            if (home.crib && o.type("crib") && o.type("crib").build && members(h).some(m => m.data && Number.isFinite(m.data.age) && m.data.age < 3)) {
                home.steps.push(step("crib", "crib", [home.crib]));
            }

            home.steps.push(step("stock_food", null, [home.storage], { stock: ["food"], count: 5, exact: true }));
            home.steps.push(step("stock_wood", null, [home.storage], { stock: ["wood"], count: 5, exact: true }));

            // Stage 6: Refined Wall Sturdiness Upgrades
            const advancedWall = (window.UF && UF.CultureGrowth && UF.CultureGrowth.preferredWall) ?
                UF.CultureGrowth.preferredWall(h.faction) : home.wall;
            if (advancedWall !== home.wall && o.type(advancedWall) && o.type(advancedWall).build) {
                home.steps.push(step("wall_upgrade", advancedWall, buildableWalls, { upgrade: true }));
            }
        }
        return home.steps;
    }
    function strictEnclosure(h, p = h && h.home) {
        if (!p) return false;
        const enclosed = (p.walls || []).every(c => isStructuralEnclosureAt(h, c.x, c.y, zOf(h), p.wall)) &&
            (p.doors || []).every(c => isDoorEnclosureAt(h, c.x, c.y, zOf(h), p.door));
        if (enclosed && !p.isRoofed) {
            Object.defineProperty(p, "isRoofed", { value: true, writable: true, configurable: true, enumerable: false });
            const F = window.UF && UF.Floors;
            if (F && typeof F.applyRoofedUpperDeck === "function") {
                const targetCells = (p.walls || []).concat(p.doors || []).concat(p.floors || []);
                const isStone = (p.wall && p.wall.includes("stone")) || (zOf(h) < 0) || (p.walls || []).some(c => isNaturalRock(h, c.x, c.y, zOf(h)));
                F.applyRoofedUpperDeck(areaOf(h), targetCells.length ? targetCells : { x0: p.x, y0: p.y, x1: p.x + p.w - 1, y1: p.y + p.h - 1 }, isStone ? "stone" : "wood");
            }
            if (F && typeof F.setFloor === "function" && p.floors && p.floors.length) {
                const culture = (C() && typeof C().culture === "function" && C().culture(members(h)[0])) || {};
                const floorKind = p.floor || (culture.floor && culture.floor.kind) || (zOf(h) < 0 || (h && h.faction === "dwarf") || (p.wall && p.wall.includes("stone")) ? "floor_stone" : "floor_wood");
                for (const fl of p.floors) {
                    if (!F.isFloorAt(areaOf(h), fl.x, fl.y)) {
                        F.setFloor(areaOf(h), fl.x, fl.y, floorKind);
                    }
                }
            }
        }
        return enclosed;
    }
    function demands(refH) {
        const h = resolve(refH), people = h ? members(h) : [], p = h && h.home;
        const buildings = structures(h), beds = buildings.flatMap(b => b.beds);
        const bedCount = p ? beds.filter(b => people.some(u => u.id === b.unitId) && object(h, b) && (object(h, b).id === "floor_straw" || object(h, b).id === "bed_wood") &&
            (!Own() || !Own().ownerOf(ref(h, b)) || Own().ownerOf(ref(h, b)).kind === "unit" && Own().ownerOf(ref(h, b)).id === b.unitId)).length : 0;
        return { members: people.length, bedrooms: people.length ? (p ? (buildings.some(b => !strictEnclosure(h, b)) ? 1 : 0) : 1) : 0,
            beds: Math.max(0, people.length - bedCount), cooking: people.length && !(p && object(h, p.hearth) && (object(h, p.hearth).id === "campfire" || object(h, p.hearth).id === "kitchen_hearth")) ? 1 : 0,
            storage: people.length && !(p && object(h, p.storage) && (object(h, p.storage).id === "stockpile" || object(h, p.storage).id === "chest_wood" || object(h, p.storage).id === "crate_wood")) ? 1 : 0,
            capacity: beds.length, overflow: Math.max(0, people.length - beds.length), expansionBlocked: !!(h && h.expansionBlocked),
            blocked: !p && !!(h && h.lastSearchDay !== undefined) || !!(h && h.expansionBlocked),
            unsupported: ["windows", "locks"] };
    }
    function describe(refH) {
        const h = resolve(refH);
        if (!h) return null;
        const d = demands(h), people = members(h);
        return { id: h.id, members: people.map(u => u.id), generation: h.generation, home: h.home,
            complete: d.members > 0 && !d.bedrooms && !d.beds && !d.cooking && !d.storage && !d.overflow,
            demands: d, children: people.filter(u => Number.isFinite(u.data.age) && u.data.age < 15).map(u => u.id),
            reason: h.expansionBlocked ? h.expansionReason : h.reason };
    }
    function isEnclosed(refH) {
        const h = resolve(refH);
        return !!(h && h.home && strictEnclosure(h, h.home));
    }
    function isSheltered(refH) {
        const h = resolve(refH);
        if (!h || !h.home) return false;
        if (h.home.isSheltered === true || h.isSheltered === true) return true;
        if (!strictEnclosure(h, h.home)) return false;
        const d = demands(h);
        return !d.beds && !d.cooking;
    }
    function childRooms(refH) {
        const h = resolve(refH);
        if (!h || !h.home || h.home.isShared) return 0;
        if (Array.isArray(h.home.rooms)) {
            return h.home.rooms.filter(r => r.type === "child").length;
        }
        // Count total bed capacity across all structures (main + annexes) minus 2 for parents
        const structs = structures(h);
        if (structs.length > 0) {
            const totalBeds = structs.reduce((n, s) => n + (Array.isArray(s.beds) ? s.beds.length : 0), 0);
            return Math.max(0, totalBeds - 2); // 2 beds reserved for the couple
        }
        if (Array.isArray(h.home.beds)) {
            return Math.max(0, h.home.beds.length - 2);
        }
        return 0;
    }
    function hasCommunalLiving(refH) {
        const h = resolve(refH);
        if (!h || !h.home) return false;
        if (Array.isArray(h.home.rooms) && h.home.rooms.some(r => r.type === "communal" || r.type === "living")) {
            return true;
        }
        return !!(h.home.hearth && (h.home.livingArea || (Array.isArray(h.home.rooms) && h.home.rooms.length >= 2)));
    }
    function hasBedroom(refH) {
        const h = resolve(refH);
        if (!h || !h.home) return false;
        if (Array.isArray(h.home.rooms) && h.home.rooms.some(r => r.type === "master" || r.type === "bedroom")) {
            return true;
        }
        return !!(h.home.beds && h.home.beds.length > 0);
    }
    function canConceiveChild(refH) {
        const h = resolve(refH);
        if (!h || !isSheltered(h)) return false; // A pair needs to build a home before having children
        if (h.home && h.home.isShared) return false; // Must build their own private home
        if (!hasCommunalLiving(h) || !hasBedroom(h)) return false; // Every home requires communal living area and at least one bedroom
        const people = members(h);
        const livingChildren = people.filter(m => m && m.data && Number.isFinite(m.data.age) && m.data.age < 15 && !dead(m)).length;
        const availableChildRooms = childRooms(h);
        // For every child they have, they need to build a room:
        return availableChildRooms > livingChildren;
    }
    function activeFocalHousehold(c) {
        const s = state();
        if (!s || !c) return null;
        const siteH = Object.values(s.byId).filter(h => !h.mergedInto && samePlace(h, c) && h.home)
            .sort((a, b) => (a.foundedTick || 0) - (b.foundedTick || 0) || String(a.id).localeCompare(String(b.id)));
        if (!siteH.length) return null;
        // 1. Primary priority: first household whose home is not yet sheltered
        const unsheltered = siteH.find(h => !isSheltered(h));
        if (unsheltered) return unsheltered;
        // 2. Secondary priority: any household whose home is not yet completely built
        const incomplete = siteH.find(h => !describe(h).complete);
        if (incomplete) return incomplete;
        return siteH[0];
    }
    function sitePlanSteps(c, u) {
        const s = state();
        if (!s || !c) return [];
        const siteH = Object.values(s.byId).filter(h => !h.mergedInto && samePlace(h, c));
        const allSteps = [];
        for (const h of siteH) {
            const people = members(h);
            const adults = people.filter(adult);
            const rep = adults[0] || people[0];
            if (rep) {
                allSteps.push(...planSteps(rep));
            }
        }
        return allSteps;
    }
    function roomForPair(a, b) {
        a = unitOf(a); b = unitOf(b);
        if (pairReason(a, b) || partnerId(a) !== b.id || partnerId(b) !== a.id) return null;
        const h = of(a);
        if (!h || of(b) !== h || !samePlace(h, a)) return null;
        const home = structures(h).find(p => p && Array.isArray(p.beds) && p.beds.some(bed => bed.unitId === a.id || bed.unitId === b.id || (!bed.unitId && p.beds.length === 1)));
        if (!home || !strictEnclosure(h, home)) return null;
        const sleeping = home.sleeping || (home.beds ? home.beds.map(b => ({ x: b.x, y: b.y })) : []);
        const room = new Set(sleeping.map(p => key(p.x, p.y)));
        if (W().units().some(u => !dead(u) && u.id !== a.id && u.id !== b.id && samePlace(h, u) && room.has(key(u.x, u.y)))) return null;
        for (const p of sleeping) {
            const o = object(h, p);
            if (!dry(h, p.x, p.y) || o && o.passable !== true) return null;
        }
        const doors = window.UF && UF.Doors;
        if (doors && doors.at && Array.isArray(home.doors)) for (const p of home.doors) {
            const d = doors.at(areaOf(h), p.x, p.y);
            if (!d || d.state.heldOpen || doors.isOpen && doors.isOpen(areaOf(h), p.x, p.y) ||
                !doors.canUnitPass(a, d) || !doors.canUnitPass(b, d)) return null;
        }
        const aBed = Array.isArray(home.beds) ? home.beds.find(p => p.unitId === a.id) : null;
        const bBed = Array.isArray(home.beds) ? home.beds.find(p => p.unitId === b.id) : null;
        if (!aBed || !bBed || !has(object(h, aBed), "bed") || !has(object(h, bBed), "bed")) return null;
        return { householdId: h.id, area: { x: h.area.x, y: h.area.y }, z: h.z,
            spots: (home.spots || [{ x: home.x + 3, y: home.y + 2 }, { x: home.x + 4, y: home.y + 2 }]).map(p => ({ x: p.x, y: p.y })),
            cells: sleeping.map(p => ({ x: p.x, y: p.y })), door: ref(h, (home.doors && (home.doors[1] || home.doors[0])) || null) };
    }
    function hasFloors(refH) {
        const h = resolve(refH);
        if (!h || !h.home || !h.home.floors || !h.home.floors.length) return false;
        const F = window.UF && UF.Floors;
        if (!F || typeof F.isFloorAt !== "function") return true;
        const area = areaOf(h);
        return h.home.floors.every(fl => F.isFloorAt(area, fl.x, fl.y));
    }
    function invalidateRoomEnclosure(area, x, y, z) {
        const s = state();
        if (!s || !s.byId) return;
        for (const h of Object.values(s.byId)) {
            if (h.area && area && (h.area.x !== area.x || h.area.y !== area.y)) continue;
            if (zOf(h) !== undefined && z !== undefined && zOf(h) !== z) continue;
            for (const b of structures(h)) {
                if (!b) continue;
                const touches = (b.walls && b.walls.some(w => w.x === x && w.y === y)) ||
                                (b.doors && b.doors.some(d => d.x === x && d.y === y)) ||
                                (b.floors && b.floors.some(f => f.x === x && f.y === y));
                if (touches) {
                    const wasRoofed = b.isRoofed;
                    const nowEnclosed = strictEnclosure(h, b);
                    if (!nowEnclosed && wasRoofed) {
                        b.isRoofed = false;
                        emit("households:enclosureBreached", h, b, { x, y, z });
                    }
                }
            }
        }
    }
    UF.Households = { state, all, of, members, structures, reconcile, formPair, pairReason: (a, b) => pairReason(unitOf(a), unitOf(b)),
        closeKin: (a, b) => closeKin(unitOf(a), unitOf(b)), planSteps, sitePlanSteps, demands, describe, roomForPair, CAPACITY, callingFor,
        isEnclosed, isSheltered, activeFocalHousehold, childRooms, canConceiveChild, hasCommunalLiving, hasBedroom, hasFloors, join, make,
        designFor, layout, findPlot, invalidateRoomEnclosure, isStructuralEnclosure: isStructuralEnclosureAt, isNaturalRock, strictEnclosure };
    function checkEnclosures() {
        const s = state();
        if (!s || !s.byId) return;
        for (const h of Object.values(s.byId)) {
            for (const b of structures(h)) {
                strictEnclosure(h, b);
            }
        }
    }
    let hooked = false;
    function hook() {
        if (hooked || !UF.Events) return;
        hooked = true;
        UF.Events.on("colonists:ready", reconcile);
        UF.Events.on("colonists:born", reconcile);
        UF.Events.on("time:day", reconcile);
        UF.Events.on("objects:changed", checkEnclosures);
        UF.Events.on("objects:levelChanged", checkEnclosures);
        UF.Events.on("jobs:done", job => {
            const h = job && job.params && resolve(job.params.household);
            if (h && h.home) syncHome(h);
            checkEnclosures();
        });
        UF.Events.on("world:unitRemoved", u => { if (person(u)) { remember(u, dead(u)); reconcile(); } });
        UF.Events.on("combat:kill", event => { if (event && person(event.target)) remember(event.target, true); });
    }
    if (typeof Scene_Boot !== "undefined" && Scene_Boot.prototype) {
        const boot = Scene_Boot.prototype.start;
        Scene_Boot.prototype.start = function() { hook(); boot.call(this); };
    }
    if (typeof DataManager !== "undefined") {
        const extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) { if (extract) extract.call(this, contents); reconcile(); };
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UF.Households;
    }
})();
