### C539 ADR:1637 game/js/plugins/DEUS_Doors.js:442-451 (bare, file from 0 line(s) back) OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
   442  s.hp = Math.max(0, s.hp - Math.max(0, Number(amount) || 0));
   443  if (s.hp > 0) { emit("doors:damaged", key, s.hp); return { broken: false, hp: s.hp }; }
   444  const O = Objects(), type = O && O.type(s.objectId), ruin = type && type.ruin ? type.ruin : "rubble";
      ...
   450  emit("doors:broken", key, ruin);
   451  return { broken: true, hp: 0, ruin };

### C540 ADR:1637 game/js/plugins/DEUS_Doors.js:18 (bare, file from 0 line(s) back) OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
    18  * and become their catalog ruin when destroyed.

### C541 ADR:1637 game/data/UF_WorldCatalog.json:2147 OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
  2147  "ruin": "bones_pile"

### C542 ADR:1637 game/data/UF_WorldCatalog.json:2188 (bare, file from 0 line(s) back) OK
section: 17.1 What exists
claim: - **Broken doors become their catalog ruin.** `ruin` defaults to `rubble` (`DEUS_Doors.js:444`; the break at `:442-451`; header `:18`). Catalog objects carry a `ruin` variant (for example `UF_WorldCatalog.json:2147`, `:2188`).
  2188  "ruin": "rubble"

### C543 ADR:1638 game/js/plugins/DEUS_Ecology.js:308-389 OK
section: 17.1 What exists
claim: - **Regrowth exists.** Ecology schedules regrowth records by game hour (`scheduleResource`, `processResources`, `DEUS_Ecology.js:308-389`) and matures sprouts by beat count (`stepBeat`, `DEUS_Ecology.js:764-873`).
   308  function scheduleResource(area, x, y, fromId, expectedId, opts) {
   309  const st = state(), O = Objects(), o = opts || {};
   310  const from = O && O.type ? O.type(fromId) : null;
      ...
   388  return result;
   389  }

### C544 ADR:1638 game/js/plugins/DEUS_Ecology.js:764-873 OK
section: 17.1 What exists
claim: - **Regrowth exists.** Ecology schedules regrowth records by game hour (`scheduleResource`, `processResources`, `DEUS_Ecology.js:308-389`) and matures sprouts by beat count (`stepBeat`, `DEUS_Ecology.js:764-873`).
   764  function stepBeat(opts) {
   765  const W = World(), O = Objects(), st = state(), o = opts || {};
   766  if (!enabled && !o.force || !W || !W.state || !O) return { spawned: 0, matured: 0 };
      ...
   872  return result;
   873  }

### C550 ADR:1713 docs/OWNER_DECISIONS.md:183 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: - DEC-013 item 4, "Cross-Layer Blast & Structural Damage" (`docs/OWNER_DECISIONS.md:183`);
   183  4. **Cross-Layer Blast & Structural Damage:** Explosions and blasts (e.g. fireball) damage floors and propagate damage to the layer below depending on floor material, thickness, and attenuation. `applyVolumeDamage` propa

### C551 ADR:1714 docs/OWNER_DECISIONS.md:251-263 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: - DEC-018, "SRD spells are hyper-realistic: effects play out physically in the simulation; SRD numbers stay the rules baseline" (`docs/OWNER_DECISIONS.md:251-263`);
   251  ### Decision `DEC-018`: SRD spells are hyper-realistic: effects play out physically in the simulation; SRD numbers stay the rules baseline
   252  - **Date Logged:** 2026-09-26
   253  - **Decider:** Owner (01:39 CT, relayed by PM 0028-AC)
      ...
   262  - **Open Sub-Question (PM default):** Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the 
   263  - **WBS Integration:** `SIM.60.01` (audit), `SIM.60.02` (schema), `SIM.60.03` (runtime), `SIM.60.04` (QA fixtures).

### C552 ADR:1715 docs/OWNER_DECISIONS.md:304-312 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: - DEC-022, "Cross-Layer 3D Targeting, Ballistics, and Volume Damage" (`docs/OWNER_DECISIONS.md:304-312`).
   304  ### Decision `DEC-022`: Cross-Layer 3D Targeting, Ballistics, and Volume Damage
   305  - **Date Logged:** 2026-09-26
   306  - **Status:** `DECIDED` (Owner ruling 01:35 CT, directive 0021-V Addendum §20)
      ...
   311  3. **Vertical Modifiers:** Falling projectiles and dropped objects gain velocity/impact damage based on height fallen; shooting upward incurs a range penalty.
   312  4. **Volume Area Damage:** Area-of-effect blasts (fireball, explosive shells) hitting a floor propagate cross-layer volume damage downward per DEC-013 §12. Targeting UI allows selecting visible cells on lower layers view

### C553 ADR:1717 docs/worldgen/DEUS_WORLDGEN_WBS.md:533 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   533  | SIM.40.01 | **Support model design & blast propagation** (materials, vertical propagation, span limits, cross-layer blast attenuation, V128 natural rock, V133 change-driven). Load-bearing rules, span capacities, and ve

### C554 ADR:1717 docs/worldgen/DEUS_WORLDGEN_WBS.md:558-561 (bare, file from 0 line(s) back) OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   558  | SIM.60.01 | **SRD spell-effect audit** (`docs/audits/SRD_SPELL_EFFECT_AUDIT.md`, `docs/audits/srd_spell_effect_audit.json`). Classify all 327 spells in `game/data/srd51/spells.json` by world systems needed: heat, force
   559  | SIM.60.02 | **Spell-effect schema** (data-driven JSON Schema of reusable primitives: ignite, heat flux, impulse/blast via SIM.40.01, fluid source/sink, temperature/freeze, mass-conserving terrain edit, light, growth/de
   560  | SIM.60.03 | **Spell-effect runtime in headless sim core** (physical propagation of heat, impulse, fluids, freezing, terrain alteration decoupled from presentation frames) | PLANNED | Directive 0028-AC §5; DEC-018 | SIM
   561  | SIM.60.04 | **Spell-effect QA fixtures** (fireball floor breach, flood down stairwell, lake freeze, stone wall vs mass ledger, SRD stat invariance) | PLANNED | Directive 0028-AC §5; DEC-018 | dep: SIM.60.03 | Claude → 

### C555 ADR:1717 docs/worldgen/DEUS_WORLDGEN_WBS.md:577 (bare, file from 0 line(s) back) OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   577  | GP.07.02 | **Cross-layer 3D targeting, ballistics & volume damage** (spells, arrows, thrown items through multi-Z openings, true 3D Euclidean range, vertical impact bonus / upward range penalty, cross-layer volume blas

### C556 ADR:1717 docs/VISION.md:404 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   404  - 2026-09-26: V143 added by the user: **Hyper-Realistic SRD Spell Effects** (DEC-018, Directive 0028-AC §5): Spell effects play out physically in the living-world simulation: fire ignites combustible materials and spread

### C557 ADR:1717 docs/VISION.md:412 OK
section: 18. Cross-Layer Blasts, Volume Damage and Targeting
claim: **WBS:** SIM.40.01 (support model and blast propagation, `docs/worldgen/DEUS_WORLDGEN_WBS.md:533`), SIM.60.01–.04 (spell effects, `:558-561`) and GP.07.02 (cross-layer targeting, `:577`). VISION: V143 (`docs/VISION.md:404`) and V151 (`docs/VISION.md:412`).
   412  - 2026-09-26: V151 added by the user: **Cross-Layer 3D Targeting, Ballistics & Volume Damage** (DEC-022, Directive 0021-V Addendum §20): Spells, arrows, and thrown items can target cells and units on lower and upper laye

### C558 ADR:1723 game/js/plugins/DEUS_Levels.js:1783-1855 OK
section: 18.1 What exists (design input)
claim: `applyVolumeDamage` has two forms (`DEUS_Levels.js:1783-1855`). Both cross levels.
  1783  /**
  1784  * Damage a volume. Two forms:
  1785  *   applyVolumeDamage(area, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact"[, { source }]):
      ...
  1854  return sum;
  1855  }

### C559 ADR:1725 game/js/plugins/DEUS_Levels.js:1795-1820 OK
section: 18.1 What exists (design input)
claim: **The box** (`DEUS_Levels.js:1795-1820`):
  1795  function applyVolumeDamage(a, minX, minY, minZ, minS, maxX, maxY, maxZ, maxS, damage, damageType = "impact", opts = {}) {
  1796  if (a && typeof a === "object" && a.radius !== undefined) return sphereDamage(a);
  1797  const W = World(), st = W && W.state;
      ...
  1819  return sum;
  1820  }

### C560 ADR:1726 game/js/plugins/DEUS_Levels.js:1805 (bare, file from 1 line(s) back) OK
section: 18.1 What exists (design input)
claim: - It turns level and stratum bounds into one elevation scale, `e = (z + 2) * STRATA + s`, clipped to 0..24 (`:1805`).
  1805  const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);

### C561 ADR:1727 game/js/plugins/DEUS_Levels.js:1809-1816 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Every non-air stratum in the box takes the full damage (`:1809-1816`; the call to `damageCell` is at `:1815`).
  1809  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
  1810  for (let z = levelOfElevation(e0); z <= levelOfElevation(e1); z++) {
  1811  if (damageRefusal(st, ax, ay, x, y, z)) { sum.skipped++; continue; }
  1812  const hits = [];
  1813  for (let s = 0; s < STRATA; s++) { const e = (z + 2) * STRATA + s; if (e >= e0 && e <= e1) hits.push([s, damage]); }
  1814  if (!anyMatter(st, ax, ay, y * st.size + x, z, hits)) continue;
  1815  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);
  1816  }

### C562 ADR:1727 game/js/plugins/DEUS_Levels.js:1815 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Every non-air stratum in the box takes the full damage (`:1809-1816`; the call to `damageCell` is at `:1815`).
  1815  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C563 ADR:1729 game/js/plugins/DEUS_Levels.js:1821-1855 OK
section: 18.1 What exists (design input)
claim: **The sphere** (`sphereDamage`, `DEUS_Levels.js:1821-1855`):
  1821  function sphereDamage(spec) {
  1822  const W = World(), st = W && W.state;
  1823  if (!st || !st.levels) return { ok: false, reason: "no levels in this world" };
      ...
  1854  return sum;
  1855  }

### C564 ADR:1731 game/js/plugins/DEUS_Levels.js:1845-1846 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Each stratum whose centre lies inside the radius takes `damage × falloff(distance / radius)` (`:1845-1846`). The falloff is constant, linear (the default, `:1826`) or quadratic (`FALLOFF`, `:1764`).
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;
  1846  if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);

### C565 ADR:1731 game/js/plugins/DEUS_Levels.js:1826 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Each stratum whose centre lies inside the radius takes `damage × falloff(distance / radius)` (`:1845-1846`). The falloff is constant, linear (the default, `:1826`) or quadratic (`FALLOFF`, `:1764`).
  1826  const cs = c.s !== undefined ? c.s : 2, falloff = FALLOFF[spec.falloff || "linear"];

### C566 ADR:1731 game/js/plugins/DEUS_Levels.js:1764 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Each stratum whose centre lies inside the radius takes `damage × falloff(distance / radius)` (`:1845-1846`). The falloff is constant, linear (the default, `:1826`) or quadratic (`FALLOFF`, `:1764`).
  1764  const FALLOFF = { constant: t => 1, linear: t => 1 - t, quadratic: t => (1 - t) * (1 - t) };

### C567 ADR:1732 game/js/plugins/DEUS_Levels.js:1833 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Horizontal distance is in feet, with 5 ft cells (`:1833`, `:1839`). Vertical distance counts strata as feet (`:1833`, `:1845`).
  1833  const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;

### C568 ADR:1732 game/js/plugins/DEUS_Levels.js:1839 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Horizontal distance is in feet, with 5 ft cells (`:1833`, `:1839`). Vertical distance counts strata as feet (`:1833`, `:1845`).
  1839  const dx = (x + 0.5) * CELL_FT - px, dy = (y + 0.5) * CELL_FT - py, h2 = dx * dx + dy * dy;

### C569 ADR:1732 game/js/plugins/DEUS_Levels.js:1833 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Horizontal distance is in feet, with 5 ft cells (`:1833`, `:1839`). Vertical distance counts strata as feet (`:1833`, `:1845`).
  1833  const px = (c.x + 0.5) * CELL_FT, py = (c.y + 0.5) * CELL_FT, pe = (c.z + 2) * STRATA + cs + 0.5;

### C570 ADR:1732 game/js/plugins/DEUS_Levels.js:1845 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Horizontal distance is in feet, with 5 ft cells (`:1833`, `:1839`). Vertical distance counts strata as feet (`:1833`, `:1845`).
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;

### C571 ADR:1733 game/js/plugins/DEUS_Levels.js:1849 (bare, file from 4 line(s) back) OK
section: 18.1 What exists (design input)
claim: - The call to `damageCell` is at `:1849`.
  1849  addResults(sum, damageCell(st, ax, ay, x, y, z, hits, damageType, source), x, y, z);

### C572 ADR:1735 game/js/plugins/DEUS_Levels.js:1676-1707 OK
section: 18.1 What exists (design input)
claim: **The material response** (`damageStratum`, `DEUS_Levels.js:1676-1707`):
  1676  // One stratum of a record takes damage (the record changes in place). effective = damage x the material's resist
  1677  // for the damage type, then the hooks. HP bytes lost = ceil(effective x 255 / maxHP): any damage > 0 costs at least
  1678  // one step (maxHP / 255 HP). HP 0: the stratum becomes air.
      ...
  1706  return out;
  1707  }

### C573 ADR:1736 game/js/plugins/DEUS_Levels.js:1691 (bare, file from 1 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Effective damage is the damage × the material's `resist` for the damage type (`:1691`). Registered damage hooks may then change it (`:1692-1693`).
  1691  ctx.effective = damage * (mat.resist[damageType] !== undefined ? mat.resist[damageType] : 1);

### C574 ADR:1736 game/js/plugins/DEUS_Levels.js:1692-1693 (bare, file from 1 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Effective damage is the damage × the material's `resist` for the damage type (`:1691`). Registered damage hooks may then change it (`:1692-1693`).
  1692  runHooks(mat.key, ctx);
  1693  runHooks("*", ctx);

### C575 ADR:1737 game/js/plugins/DEUS_Levels.js:1697 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - HP bytes lost are `ceil(effective × 255 / maxHP)` (`:1697`). At HP 0 the stratum becomes air and its debris is named (`:1699-1703`).
  1697  const hp = Math.max(0, out.hpBefore - Math.ceil(ctx.effective * 255 / mat.maxHP - 1e-9));

### C576 ADR:1737 game/js/plugins/DEUS_Levels.js:1699-1703 (bare, file from 2 line(s) back) OK
section: 18.1 What exists (design input)
claim: - HP bytes lost are `ceil(effective × 255 / maxHP)` (`:1697`). At HP 0 the stratum becomes air and its debris is named (`:1699-1703`).
  1699  if (hp === 0) {
  1700  out.destroyed = true;
  1701  out.debris = mat.debris;
  1702  rec[REC_M + s] = M_AIR;
  1703  rec[REC_HP + s] = 0;

### C577 ADR:1738 game/js/plugins/DEUS_Levels.js:1005-1007 (bare, file from 3 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Resist differs by type: stone takes fire × 0.1 and wood fire × 2, and `impact`, `dig` and `blast` differ as well (`:1005-1007`).
  1005  { id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble", resist: { impact: 0.5, dig: 1, blast: 1, fire: 0.1 } },
  1006  { id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, support: 0.5, debris: "loose_earth", resist: { impact: 1, dig: 2, blast: 1.5, fire: 0.2 } },
  1007  { id: M_WOOD, key: "wood", solid: true, fluid: false, maxHP: 60, support: 0.7, debris: "broken_timber", resist: { impact: 1, dig: 1, blast: 1.2, fire: 2 } },

### C578 ADR:1739 game/js/plugins/DEUS_Levels.js:1685-1689 (bare, file from 4 line(s) back) OK
section: 18.1 What exists (design input)
claim: - Fluid strata take no damage but still run the hooks (`:1685-1689`).
  1685  if (FLUID_B[byte] === 1) {
  1686  out.fluid = true;
  1687  runHooks(mat.key, ctx);
  1688  runHooks("fluid", ctx);
  1689  return out;

### C579 ADR:1742 game/js/plugins/DEUS_Levels.js:1844-1846 (bare, file from 7 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **No attenuation.** Every stratum inside the box or radius takes its share, whatever lies between it and the centre: the sphere looks only at distance (`:1844-1846`). A fireball on a stone floor damages the room below as if the floor weren't there.
  1844  for (let s = 0; s < STRATA; s++) {
  1845  const de = (z + 2) * STRATA + s + 0.5 - pe, d2 = h2 + de * de;
  1846  if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);

### C580 ADR:1745 game/js/plugins/DEUS_Levels.js:1805 (bare, file from 10 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **The 5-level scale:** the elevation cap is 24 (`:1805`, `:1835`), and a stratum counts as 1 ft (§15.0).
  1805  const e0 = Math.max(0, (minZ + 2) * STRATA + minS), e1 = Math.min(24, (maxZ + 2) * STRATA + maxS);

### C581 ADR:1745 game/js/plugins/DEUS_Levels.js:1835 (bare, file from 10 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **The 5-level scale:** the elevation cap is 24 (`:1805`, `:1835`), and a stratum counts as 1 ft (§15.0).
  1835  const e0 = Math.max(0, Math.floor(pe - radius)), e1 = Math.min(24, Math.floor(pe + radius));

### C582 ADR:1746 game/js/plugins/DEUS_Levels.js:1764 (bare, file from 11 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **Floats:** float falloff and `Math.sqrt` (`:1764`, `:1846`), which the core forbids in decisions (§10.4).
  1764  const FALLOFF = { constant: t => 1, linear: t => 1 - t, quadratic: t => (1 - t) * (1 - t) };

### C583 ADR:1746 game/js/plugins/DEUS_Levels.js:1846 (bare, file from 11 line(s) back) OK
section: 18.1 What exists (design input)
claim: - **Floats:** float falloff and `Math.sqrt` (`:1764`, `:1846`), which the core forbids in decisions (§10.4).
  1846  if (d2 <= r2) hits.push([s, damage * falloff(Math.sqrt(d2) / radius)]);

### C584 ADR:1774 game/js/plugins/DEUS_Levels.js:1005-1007 OK
section: 18.2 The rule
claim: - `fire` barely passes solids (a low `passPm`), hits combustibles hard (today's resist: wood 2, stone 0.1; `DEUS_Levels.js:1005-1007`), and **ignites**. Every combustible stratum or object it reaches above an ignition threshold becomes a Fire record (§18.6). So a fireball on a wooden floor burns through it, and the Fire system can then spread (SIM.50.05).
  1005  { id: M_STONE, key: "stone", solid: true, fluid: false, maxHP: 120, support: 1, debris: "rubble", resist: { impact: 0.5, dig: 1, blast: 1, fire: 0.1 } },
  1006  { id: M_SOIL, key: "soil", solid: true, fluid: false, maxHP: 40, support: 0.5, debris: "loose_earth", resist: { impact: 1, dig: 2, blast: 1.5, fire: 0.2 } },
  1007  { id: M_WOOD, key: "wood", solid: true, fluid: false, maxHP: 60, support: 0.7, debris: "broken_timber", resist: { impact: 1, dig: 1, blast: 1.2, fire: 2 } },

### C585 ADR:1782 game/js/plugins/DEUS_Levels.js:1792 OK
section: 18.2 The rule
claim: - **Bounds.** Targets are clipped to `zMin..zMax`, with no 0..24 cap. The radius is capped by the spell schema (SIM.60.02). Today's sphere leaves out cells past the area's edge (`DEUS_Levels.js:1792`). In the core those cells are processed in the neighbouring area, in area order, in the same event.
  1792  * One area per call (cells past the area's edge are left out). Returns { ok, cells, strataHit, strataDestroyed,

### C586 ADR:1786 game/js/plugins/DEUS_Levels.js:1720-1722 OK
section: 18.3 What a blast changes in the rest of the core
claim: - **Debris.** Every destroyed stratum becomes debris at its cell: `ledger.transform(stratum → debris)`, using the material table's `debris`, which today is only named in the event (`DEUS_Levels.js:1720-1722`). Q-MASS doesn't change (§7.8). Debris is placed as a rubble form, as in a collapse (§16.4).
  1720  stats.strataDestroyed++;
  1721  emit("levels:strataDestroyed", { area: { x: ax, y: ay }, x, y, z, stratum: r.stratum, material: r.material, constructed: r.constructed,
  1722  debris: r.debris, damageType, source });

### C587 ADR:1788 game/js/plugins/DEUS_Fluid.js:941-944 OK
section: 18.3 What a blast changes in the rest of the core
claim: - **Fluid.** Geometry changes wake fluid through the existing `levels:*` hook (`DEUS_Fluid.js:941-944`). A breached floor under a pool drains it down a layer. SIM.60.04's "flood down a stairwell" fixture takes the same path.
   941  UF.Events.on("levels:cellChanged", handleGeometryChange);
   942  UF.Events.on("levels:shapeChanged", handleGeometryChange);
   943  UF.Events.on("levels:strataChanged", handleGeometryChange);
   944  UF.Events.on("levels:strataDestroyed", handleGeometryChange);

### C588 ADR:1812 docs/OWNER_DECISIONS.md:255-261 OK
section: 18.6 Spell effects as core primitives (DEC-018)
claim: DEC-018 keeps SRD 5.1 damage, range, saves, area, duration and casting as the rules baseline. It adds physical consequences on top and allows no per-spell code (`docs/OWNER_DECISIONS.md:255-261`). In this architecture there are two layers:
   255  - **Ruling:** Spell effects play out physically in the living-world simulation:
   256  - Fire ignites combustible materials and spreads
   257  - Blasts damage structures and can breach floors into lower layers
   258  - Water floods and flows
   259  - Cold freezes liquid into ice
   260  - Earth spells reshape physical terrain strata
   261  SRD 5.1 damage, range, saves, area, duration and casting stay the rules baseline, and physical consequences are added on top, never replacing SRD numbers. It is data-driven: one spell-effect schema of reusable primitives

### C589 ADR:1863 docs/OWNER_DECISIONS.md:230-235 OK
section: 19. Owner Decisions at the Sim/Render Boundary
claim: | **DEC-016**, "The scale chart is the governing size authority for the art catalogue, templates and placement" (`docs/OWNER_DECISIONS.md:230-235`) | no pixels anywhere. Distances are in half-feet from DEC-013's scale (§15.0) | every pixel size, envelope, footprint and anchor, and `stratumPx` (an Owner question under DEC-016) | nothing new: the view gives heights in strata, and the host converts them |
   230  ### Decision `DEC-016`: The scale chart is the governing size authority for the art catalogue, templates and placement
   231  - **Date Logged:** 2026-09-26
   232  - **Decider:** Owner (00:11 CT, "the most important is the scale chart"; relayed by PM 0019-S/0028-AC)
   233  - **Status:** `DECIDED`
   234  - **Ruling:** Every catalogue entry's pixel size, envelope, footprint and anchor derive from the scale chart (`art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`, whose numeric source is `game/data/DEUS_ScaleRegistry.json`; th
   235  - **Open:** If "the scale chart" means a different file, the Owner names it and DEC-016 is amended.

### C590 ADR:1864 docs/OWNER_DECISIONS.md:267-278 OK
section: 19. Owner Decisions at the Sim/Render Boundary
claim: | **DEC-019**, "In-Layer Height (Strata) Presentation & Movement Rules" (`docs/OWNER_DECISIONS.md:267-278`) | the step rules and falls: a 1-stratum step is normal, a 2-stratum step is a climb or jump, a full layer needs stairs, a ladder or a ramp. Falling, reach and line of sight use real heights (§3.9, §18.5) | the draw offset per stratum of ground height: a straight pixel shift, no scale (DEC-011) | `SimView.surfaceStratumAt(ax, ay, x, y, z)` and each unit's stratum; `UNIT_MOVED` carries the strata it moved between |
   267  ### Decision `DEC-019`: In-Layer Height (Strata) Presentation & Movement Rules
   268  - **Date Logged:** 2026-09-26
   269  - **Status:** `DECIDED` (Owner ruling 01:17–01:19 CT, directive 0021-V Addendum §15)
      ...
   277  3. **3D Height Mechanics:** Falling damage, melee reach, and line-of-sight elevation advantage use real 3D vertical height differences.
   278  4. **Art Preparation:** Catalogue requires one top-surface tile per terrain plus auto-placed edge/cliff-face strips per height difference (1 to 5 strata) and height shading; NOT a full tile set per height. Catalogue plac

### C591 ADR:1865 docs/OWNER_DECISIONS.md:282-289 OK
section: 19. Owner Decisions at the Sim/Render Boundary
claim: | **DEC-020**, "Seamless Inter-Layer Ramps and Camera-Follow Behavior" (`docs/OWNER_DECISIONS.md:282-289`) | a ramp is a run of cells rising one stratum per cell. At the top stratum the unit's `z` becomes `z + 1` inside an ordinary movement step: no transfer, fade or pause (§3.9). Ramps, stairs and ladders are planner edges, and building a ramp is a job | the camera following the player's layer (DEC-020's default), Lane N's in-place layer switch, and Lane K's per-frame layer membership | `UNIT_MOVED` with `fromZ ≠ z`; the host's next `FOCUS_SET` after the camera follows (§5.3) |
   282  ### Decision `DEC-020`: Seamless Inter-Layer Ramps and Camera-Follow Behavior
   283  - **Date Logged:** 2026-09-26
   284  - **Status:** `DECIDED` (Owner ruling 01:21 CT, directive 0021-V Addendum §16)
   285  - **Decider:** Owner
   286  - **Summary:**
   287  1. **Seamless Transitions:** Ramps and slopes carry units continuously from one layer to the next. A ramp is a run of cells rising one stratum per cell (5 cells = one 10 ft layer). At the top stratum, the unit's Z become
   288  2. **Camera-Follow Default:** When the player unit crosses a ramp boundary between layers, the camera view automatically follows the player's current layer. Non-player units crossing simply transfer layer membership list
   289  3. **Pathfinding & Construction:** Multi-Z pathfinding treats ramps, stairs, and ladders as traversable layer connectors. Colonists can build ramps. Art catalogue adds ramp/slope pieces per terrain (placeholders only; DE

### C592 ADR:1866 docs/OWNER_DECISIONS.md:293-300 OK
section: 19. Owner Decisions at the Sim/Render Boundary
claim: | **DEC-021**, "Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)" (`docs/OWNER_DECISIONS.md:293-300`) | nothing. Occlusion isn't sim state; the core only provides rows and revision counters | the visible-depth mask: per screen cell, from the viewed layer down to the first opaque surface, recomputed per chunk from `CELL_SHAPE` records and `rev()`. The host draws and reads only exposed cells, so `view.read_ms` follows the exposed area, not the layer count (§9.2) | `copyRow` and `rev()` out; the `FOCUS_SET` region set, computed by the shared exposure module, in (§13.2) |
   293  ### Decision `DEC-021`: Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)
   294  - **Date Logged:** 2026-09-26
   295  - **Status:** `DECIDED` (Owner ruling 01:24 CT, directive 0021-V Addendum §18)
   296  - **Decider:** Owner
   297  - **Summary:**
   298  1. **Occlusion Culling Rule:** Any cell, entity, prop, or effect covered by an opaque upper layer is not drawn at all.
   299  2. **Bounded Draw Cost:** Draw cost is strictly bounded by exposed visible screen area (VISION V133), NOT by total layer count. For each screen column/cell, rendering traverses only from the currently viewed layer downwa
   300  3. **Benchmark Requirement:** Applied in Lane K follow-up, the 32-layer refactor, and future overlook view. Benchmark target: the stress scene with 32 layers must cost approximately the same frame time as with 5 layers w

### C598 ADR:1884 game/js/plugins/DEUS_Core.js:505-510 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.3 | Calendar on `Scene_Map.update`: Core L505 | **Confirmed** (`DEUS_Core.js:505-510`). Also called on sub-ticks (`DEUS_TimeSpeed.js:236`) | §1.1 |
   505  Scene_Map.prototype.update = function() {
   506  _Scene_Map_update.call(this);
   507  $ufTime.update();
   508  if (window.UF && UF.Time && typeof UF.Time.update === "function") {
   509  UF.Time.update(1 / 60);
   510  }

### C599 ADR:1884 game/js/plugins/DEUS_TimeSpeed.js:236 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.3 | Calendar on `Scene_Map.update`: Core L505 | **Confirmed** (`DEUS_Core.js:505-510`). Also called on sub-ticks (`DEUS_TimeSpeed.js:236`) | §1.1 |
   236  if (window.$ufTime) $ufTime.update();

### C610 ADR:1888 game/js/plugins/DEUS_World.js:127-128 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:380-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
   127  areasX: num("AreasX", 1),
   128  areasY: num("AreasY", 1),

### C611 ADR:1888 game/js/plugins.js:58 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:380-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
    58  "parameters": {}

### C612 ADR:1888 game/js/plugins/DEUS_Fluid.js:356-376 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:380-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
   356  function stepArea(ax, ay, budget) {
   357  const data = getAreaData(ax, ay);
   358  const queue = data.queue;
      ...
   375  
   376  while (data.head < limit) {

### C613 ADR:1888 game/js/plugins/DEUS_Fluid.js:380-383 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:380-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
   380  
   381  decodeCellId(size, cellId);
   382  const x = coordX, y = coordY, z = coordZ;
   383  const gridZ = data.grids.get(z);

### C614 ADR:1888 game/js/plugins/DEUS_Fluid.js:1016-1019 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.7 | Fluid steps only the viewed area (L736-745) | **Confirmed, with a qualification.** The default world has one area (`DEUS_World.js:127-128`; `plugins.js:58`), so the viewed area is the whole world. Its queue holds cells of all 5 levels (`DEUS_Fluid.js:356-376`; the level is decoded per cell, `DEUS_Fluid.js:380-383`). There is also no `sceneActive` gate (`DEUS_Fluid.js:1016-1019`) | §1.3 |
  1016  Game_Map.prototype.update = function(sceneActive) {
  1017  _Game_Map_update.call(this, sceneActive);
  1018  Fluid.tick();
  1019  };

### C615 ADR:1889 game/js/plugins/DEUS_Ecology.js:22-27 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
    22  * Every six game hours, the current area and one rotating world area get a
    23  * deterministic population roll. Prey can recover toward the area's original
    24  * population. Monsters can replenish or first appear only in catalog-approved
    25  * biomes/regions. Both populations have hard area caps. Monster cells must be
    26  * free and remain outside the protected start, camps, active faction sites,
    27  * nearby people, and the player's view radius.

### C616 ADR:1889 game/js/plugins/DEUS_Ecology.js:907-914 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   907  if (at % POPULATION_INTERVAL === 0) {
   908  seen.clear();
   909  for (const a of [here, rotate]) {
   910  if (!a || seen.has(areaKey(a))) continue;
   911  seen.add(areaKey(a));
   912  result.areas.push(processArea(a, { hour: at }));
   913  }
   914  }

### C617 ADR:1889 game/js/plugins/DEUS_Ecology.js:876 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   876  // Hourly driver: resources every hour, populations every six hours.

### C618 ADR:1889 game/js/plugins/DEUS_Ecology.js:888-905 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   888  function tickHour(hour) {
   889  const O = Objects(), W = World(), st = state();
   890  const at = Number.isFinite(hour) ? hour : (O && O.hourNow ? O.hourNow() : 0);
      ...
   904  stepBreeding(a, at);
   905  }

### C619 ADR:1889 game/js/plugins/DEUS_World.js:532 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   532  World.currentArea = () => (window.$gameMap && World.state ? World.areaOfMapId($gameMap.mapId()) : null);

### C620 ADR:1889 game/js/plugins/DEUS_Ecology.js:803 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   803  const baseArea = (W.currentArea && W.currentArea()) || { x: 0, y: 0 };

### C621 ADR:1889 game/js/plugins/DEUS_Ecology.js:452-453 (bare, file from 0 line(s) back) OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.8 | Ecology rolls the current area plus one rotating area (L22-27) | **Confirmed, with the same qualification, and made precise.** The header describes the population roll, which runs every six game hours (`DEUS_Ecology.js:22-27`, `:907-914`). Plant spreading and breeding run on the same two areas every game hour (`DEUS_Ecology.js:876`, `:888-905`). Other view dependence: ground-only `currentArea` (`DEUS_World.js:532`), sprouts in the current area only (`DEUS_Ecology.js:803`), player-position protection (`:452-453`) | §1.3 |
   452  const here = W.currentArea();
   453  if (sameArea(here, area) && window.$gamePlayer && Math.hypot(x - $gamePlayer.x, y - $gamePlayer.y) < PLAYER_CLEARANCE) return "player";

### C622 ADR:1890 game/js/plugins/DEUS_World.js:801 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.9 | Terrain is read through RMMZ-format `$dataMap` builds (World.buildArea L595-640), cached 6 deep (peekArea L797-822) | **Confirmed** (`PEEK_CACHE = 6`, `DEUS_World.js:801`; `buildArea` `DEUS_World.js:599`) | §1.3 |
   801  const PEEK_CACHE = 6;

### C623 ADR:1890 game/js/plugins/DEUS_World.js:599 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.9 | Terrain is read through RMMZ-format `$dataMap` builds (World.buildArea L595-640), cached 6 deep (peekArea L797-822) | **Confirmed** (`PEEK_CACHE = 6`, `DEUS_World.js:801`; `buildArea` `DEUS_World.js:599`) | §1.3 |
   599  World.buildArea = function(ax, ay, z = 0) {

### C633 ADR:1897 game/js/plugins/DEUS_Core.js:304-311 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
   304  update() {
   305  if (this.isPaused || $gameMessage.isBusy()) return;
   306  this._timer += 1 / 60; // Assuming 60fps
   307  if (this._timer >= timeSpeed) {
   308  this._timer -= timeSpeed;
   309  this.advanceMinute(1);
   310  }
   311  }

### C634 ADR:1897 game/js/plugins/DEUS_Core.js:376-378 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
   376  ticksPerMinute() {
   377  return Math.max(1, Math.round(timeSpeed * 60));
   378  }

### C635 ADR:1897 game/js/plugins/DEUS_Colonists.js:48 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    48  const NEEDS_EVERY = 60;         // ticks per needs tick (one game minute)

### C636 ADR:1897 game/js/plugins/DEUS_Environment.js:52 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    52  const TICKS_PER_STEP = 60; // 1 beat / 1 game second

### C637 ADR:1897 game/js/plugins/DEUS_TimeSpeed.js:33 OK
section: Appendix A. Re-verification of the PM survey (0018-R §3c, evidence at `d1f9cec5`)
claim: | A.16 | "1 tick = 1 RMMZ updateMain; 10 ticks = 1 game minute (DEUS_Core L60-61)" | **Confirmed.** In `DEUS_Core.js`, L59-60 is the comment and L61 the code (`timeSpeed = 1/6`); the timer is at `DEUS_Core.js:304-311` and `ticksPerMinute` at `DEUS_Core.js:376-378`. Other files disagree: `DEUS_Colonists.js:48`, `DEUS_Environment.js:52`, `DEUS_TimeSpeed.js:33` | §1.1 |
    33  * speed-up and the pause). 60 frames = 1 game minute at the default UF_Core

