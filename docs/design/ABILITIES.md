# ABILITIES: the data-driven abilities framework (VISION V84, V88)

Written 2026-09-19 by Claude Code. **Design only. No code, catalog or art was changed for this file.** Nothing here is built or tested. It is the spec for one new plugin, `UF_Abilities`, and for the small hooks it needs in other plugins (§11).

**Reviewed 2026-09-19** together with `docs/design/CLASSES.md`, against the code, VISION, PEOPLES.md, the IP rules and V50. The review re-keyed the class ids to CLASSES.md's, replaced one swarm ability and several names, and fixed hook references. CLASSES.md §19 lists every change to both files.

The user's words (2026-09-19):
- 13:35, recorded as V84: "Skills should unlock abilities and crafts and stuff as they level".
- 13:47, recorded as V88: "I would also like a class system that enhances / unlocks skills and abilities based on certain criteria, like building a temple for acolytes, or a a tower for wizards, etc."

**What this file is.** It is the one mechanism behind every ability in the game:
- the prayers, blessings and spells that a class unlocks (V88);
- the abilities that personal skill levels unlock (V84);
- the passive perks that express a class's "enhances skills";
- creature abilities (the ice wraith's cold spell, the undead raising the dead).

It defines:
- the ability record (§2);
- how an ability is known, paid for, cast and resolved (§3);
- how the AI chooses (§4) and how the player triggers one (§5);
- the new devotion skill and the magic skill made real (§6);
- a starter list of 23 abilities (§7);
- save data (§8), performance (§9) and checks (§10).

**Decisions it builds on** (docs/VISION.md):

| Row | What it says |
|---|---|
| V39, V52 | Cultures; ranks and orders |
| V58 | Sprites only: no code-made motion |
| V62 | Overhead text is dialogue only |
| V63, V64 | OSRS-style skills; OSRS-style combat |
| V65 | Arthurian fantasy with relics of a fallen star-faring past |
| V66, V76, V77 | Crafting tiers; per-culture trees; build N of X to unlock Y |
| V80 | Five levels |
| V84 | Skill levels unlock abilities; building and technology are faction-wide |
| V85 | Actions in world beats, each with a difficulty |
| V86 | Drag selection |
| V87 | Eleven peoples |
| V88 | Classes |
| V89 | All combat animated with sprite frames, spell effects as effect sprites |
| V92 | Over-head text is only speech |
| V95, V97, V98 | Objects have HP and armour; work on an object runs down its HP (no attempts); a whole HP bar yields a sensible amount |

**Owned here, and owned elsewhere.**
- **This file owns:**
  - the ability record and its catalog key `abilities`;
  - the point pools (devotion, stamina, inner light, the swarm's store);
  - the rules for casting, cooldowns, effects and the ability AI;
  - the ability bar;
  - the devotion skill and the magic skill's experience sources.
- **Owned elsewhere:**
  - **`docs/design/CLASSES.md`** (V88): which classes exist, what opens them (a temple, a tower, the faction's Building level, rank), their tiers, and who assigns them. Since the review this file uses CLASSES.md's class ids (`faith`, `arcane`, `arms`, `bow`, `grave`, `light`, `brood`); §7.1 keeps the old working ids for reference.
  - **`docs/design/TECH_TREE.md`** (being written by the DF-mechanics run): the faction tree and the personal unlock list of V84. That list *shows* ability unlocks by reading this catalog key. It doesn't copy them, so there is one truth.
  - **`docs/design/PEOPLES.md`**: the ids of the eleven peoples. §1.3 there fixes `starborn`, `swarm` and `undead`, the ids used here. Its §1.1 lists the words and mechanics the star-born and the swarm must never take from their sources.
  - **UF_Combat** (`docs/systems/UF_Combat.md`): the accuracy and max-hit formulas. Abilities call them and never restate them.
  - **UF_Skills** (`docs/systems/UF_Skills.md`): the curve and `add`/`level`.
  - **`docs/design/WORK_TIMING.md`**: the beat and the success/failure model of V85, which ability casts reuse.

**Inspiration, not copying.** Mechanics only, in our own words and numbers:
- **OSRS:** a prayer point pool equal to the skill level, recharged at an altar; toggled prayers that drain points while on; prayer experience from offerings; a level-gated spellbook; reagents spent per cast; autocast; a special-attack energy bar.
- **DF:** a temple as a room around an altar; priests; worship as a need.
- **U7:** mages who carry reagents for each spell.

No names, spell names, prayer names, numbers, lore or text from OSRS, DF, U7 or D&D. The names in §7 were checked against the lists in §7.3 from memory. They were **not** web-searched, and each needs a search before approval (the way CRAFTING P1 was searched).

**Names are proposals (AGENTS rule 7).** Every player-facing name here is a PROPOSAL. That covers ability names, kind names, pool names, the devotion skill's name and the reagent name. Until the user approves a name, the catalog stores it as `TEST_<working name>`.

**Time units.** 1 world beat = 60 map updates = 1 real second at ×1 = 1 game minute (V46, WORK_TIMING §3). 1 game day = 1440 beats. Combat keeps its 36-update tick (0.6 beats; V64). Durations and cooldowns are in beats; attack speeds are in combat ticks.

---

## 0. In short
- **One record per ability** in catalog `abilities.list` (§2). Everything an ability does is data:
  - kind and source (class tier and/or skill level);
  - cost (reagent items, or points from a pool);
  - cast time and cooldown in beats, and difficulty (V85);
  - targets, range and levels (V80);
  - effects as a list of typed entries;
  - animation (the cast columns 11–13 and effect sheets from the art);
  - AI hints and experience.
- **Seven kinds:**
  - spell (magic, reagents);
  - prayer (devotion, a toggle that drains points);
  - blessing (devotion, a cast on others);
  - special attack (stamina; display name proposed as "Deed");
  - passive perk;
  - work perk;
  - trade technique.
- **Four pools:**
  - **devotion points:** maximum = the devotion level; refilled only by rites at an altar or inside a temple room;
  - **stamina:** everyone; 100; regenerates;
  - **inner light:** the star-born; recharged in sky light or at their own building;
  - **the swarm's store** (id `flesh`; display name A9): the swarm; from remains and the mound.

  Reagents are ordinary items in the inventory.
- **Known abilities** are derived, never saved: class tier from UF_Classes, and skill levels from UF_Skills. They are recomputed on level-ups and class changes.
- **Using an ability** is a job (`cast`) out of combat. In combat it is UF_Combat's attack slot. Passives and perks are read by the systems they change: UF_Combat's effective levels, WORK_TIMING's `perkSpeed` and `perkFail`, and UF_Skills' experience.
- **The AI uses abilities on its own** (V17):
  - in combat, by expected damage and by thresholds for heals and buffs;
  - out of combat, in a staggered support scan;
  - in upkeep jobs (rites, charging shards).

  The player's faction has a policy per kind: automatic, or only when ordered.
- **The player uses them** through:
  - a bar for the selected unit (keys 1–9, target mode, V86 multi-selection);
  - right-click entries in UF_Interact's menu;
  - an Abilities section on the character sheet.
- **Two skill changes:**
  - a new **devotion** skill: rites, offerings and burial give experience; it joins the combat level exactly as OSRS's prayer term does;
  - **magic** made trainable: experience per cast, per damage and per charged shard; its levels gate spells and charging yield.
- **23 starter abilities** (§7): six faith, six arcane, three arms, one bow, four skill milestones (one of them was the craft class's, which CLASSES.md doesn't have), and one each for the star-born, the swarm and the undead.
- **Art:** the body's cast columns 11–13 (AR-600), plus three effect sheet kinds per ability: an `fx` layer on the caster, an impact sheet over the target, and a looping area or aura sheet. Missing art draws nothing and the effect still happens (V58). No travelling projectile sprite (A6).

---

## 1. Decisions

### 1.1 PROPOSALS for the user (the recommended option is first)
| # | PROPOSAL | Options | Where |
|---|---|---|---|
| A1 | **Who can use prayers, blessings and spells** | **A: anyone can *train* devotion and magic** (rites, burial and charging shards). **Only a member of a class that grants them can *use* its prayers, blessings and spells.** This is V88 read literally: "unlocks … abilities the person could not use otherwise". Skill-milestone abilities (§7.2 group 7) need no class. · B: also give a few basic lay abilities at skill levels with no class. | §2.2, §6 |
| A2 | **Devotion joins the combat level** | **Yes: the classic prayer term, `floor(devotion / 2)` inside the defence and hitpoints quarter** (§6.3). Nobody's combat level changes until they train devotion. With every skill at 99 it is 126 instead of 113. · No: devotion stays outside the combat level. | §6.3 |
| A3 | **What magic is** (THEME T20, still open) | **T20 A, relic-light:** spells spend **charged crystal shards**, made at a standing stone (or the tower) from mined crystal. This file is written for A. · T20 B or C (fey craft: herbs and song): only the reagent items in the records change, with no code change. | §2.3, §6.2 |
| A4 | **What faith is** (THEME T21, still open) | **T21 A, two unnamed ways of belief:** prayers and blessings belong to both ways, and the altar belongs to whichever way the temple follows. · Other T21 options change only the names and the altar art. | §6.1 |
| A5 | **Friendly fire** | **Area damage hits only units hostile to the caster** (UF_Stance's side). Allies and indifferent units are never hurt. · Hits everything in the area, DF style. | §2.6 |
| A6 | **Projectiles** | **No travelling sprite.** The caster plays its cast frames, and the impact sheet plays on the target when the spell resolves. A sprite moved across the map by the engine would be code-made motion (V58). · Move a projectile sprite from caster to target, as AR-906's arrow in flight implies. That needs the user to say V58 allows it. V89 (13:52) asks for "ranged shots and spell effects as effect sprites"; it doesn't say whether a shot's sprite may travel, so this stays the user's call. | §2.8 |
| A7 | **Stock placeholders for effects** | **None.** RMMZ's stock battle animations are Effekseer files (`game/effects/*.efkefc`) played by a particle runtime, which is motion made at run time. Until the art arrives, an effect shows nothing (V58). The bar uses stock `IconSet.png` icons, each with a replacement request. · Use the stock Effekseer effects as placeholders. | §2.8, §12 |
| A8 | **Names** | The names in §7.2. Every row has a recommended name first and alternates after it. | §7 |
| A9 | **Display words for the kinds and pools** | Spell, Prayer, Blessing, **Deed** (a special attack; the "deeds of arms" of the romances) · Feat · Stroke; **Trait** (a passive); **Knack** (a work perk); Technique. Pools: **Devotion**, **Stamina** · Wind, **Inner Light** (star-born; THEME T2 bans "energy" and "power cell") · Glow, **Fat-store** (swarm; real insects keep their reserve in a fat body) · Reserve. The first draft's "Hive-flesh" and "Brood" were dropped in the review: PEOPLES §1.1 and PE21 ban "hive" and "brood" for the swarm's own names and items. Reagent: **charged shard** · lit shard. | §2.1, §2.3 |
| A10 | **Autocast for the player's faction** | **Automatic** for heals, buffs, prayers, deeds, attack spells and work perks. **Only when ordered** for terrain spells, summons, and anything costing more than 3 reagents or 10 points. · Everything automatic. · Everything only when ordered. | §4.6 |
| A11 | **Raising the dead** (the undead) | **Consumes the remains.** Remains laid to rest by a blessing can't be raised, so the temple is the living's answer to the undead. The raised body is bound to its raiser until destroyed. Its summons count against PEOPLES' one bond cap (1 + floor(magic / 10), PE13), shared with PEOPLES' raise job. · Raised dead expire after a time. | §7 #22, #4 |

### 1.2 Decisions made in this file (design, not lore)
| # | Decision | Why |
|---|---|---|
| AD1 | **The ability record is the one truth.** A class record never lists its abilities. UF_Classes derives them with `list.filter(a => a.source.class === id)`. The personal unlock list of TECH_TREE reads them the same way. | V84 and V88 both point at abilities. Two lists would drift apart. |
| AD2 | **A class's "enhances skills" is written as passive and work-perk abilities** (`modify` with `xpMul`, `perkSpeed` or `perkFail`). | One mechanism for every bonus. CLASSES.md sets the numbers; this file only provides the stats. |
| AD3 | **Spell damage uses UF_Combat's own magic formulas.** The accuracy is `A` from effective magic × (magic attack bonus + 64). The max hit is `floor(0.5 + power × effectiveMagic × (magicStrength + 64) / 640)`: UF_Combat's `maxHitFor` with the spell's `power` inside it (power 1 gives exactly `maxHitFor`). At power 1 with no gear, in the accurate style: 1 at magic 1, 6 at 50, 11 at 99. OSRS spells have fixed max hits; ours scale with level, and that difference is deliberate. | One meaning for `magicStrength` (it is already the ice wraith's and the cloth's). V64: "our own numbers". |
| AD4 | **Costs are paid when the ability resolves, not when the cast starts.** An interrupted cast costs only time. A difficulty failure costs `time` (nothing paid) or `wasted` (the reagents are spent), using WORK_TIMING §4.3's outcome words. | V85; a missed swing costs only time. |
| AD5 | **Abilities keep their own saved beat counter** (`state.abilities.beat`). It advances whenever `UF.Jobs.beatNow()` does, so cooldowns and durations survive save and load. WORK_TIMING's `beatNow()` restarts at boot and can't stamp saved cooldowns. `UF.Jobs.beatNow()` is WORK_TIMING's design and doesn't exist yet; the only beat counter in the code today is UF_Fire's own saved one (`UF.Fire.beatNow()`, `UF_Fire.js` line 1064). | Same reason CHAIN_OF_COMMAND §2.4 uses the game minute. |
| AD6 | **`combat:hit` keeps exactly its six keys.** Spells go through `UF.Combat.resolveAttack` with `attackType: "magic"`, so UF_Skills' per-damage magic experience applies unchanged. UF_Abilities emits its own `abilities:used` event and pays the spell's base experience itself. | The UF_Combat/UF_Skills contract, and the `combat.styles` check, which fails on any extra key. |
| AD7 | **Creatures pay nothing.** A species' abilities ignore item and pool costs, but keep cooldowns and cast times. | Creatures don't carry reagents or level up (UF_Skills). |
| AD8 | **Everything is seeded.** Rolls use `mulberry32(hash32(seed, 0xab1e, unitId, state.abilities.seq))` with a saved counter. AI ties use `hash32(seed, 0xab11, unitId, beat)`. Nothing uses `Math.random`. | WORLD_ARCHITECTURE §1. |
| AD9 | **Nothing about an ability floats over a head.** No names, cooldowns, buffs or "casting" labels (V59, V62). The live action ("Casting TEST_Star-Dart at a wolf") is the unit's `data.intent` in the profile. A buff shows on the map only as its own aura art. A record may carry an optional spoken line (`say`, kind `shout`), but none of the 23 starter records does. | V62: overhead text is dialogue only. |

---

## 2. The ability record

### 2.1 Kinds
| Kind id | How it's used | Skill it scales with and trains | Cost | Display (A9) |
|---|---|---|---|---|
| `spell` | Cast on a target (or on a cell, or on itself) | `magic`: per-cast experience, plus per-damage experience through `combat:hit` | reagent items; a people pool for the star-born and the swarm | Spell |
| `prayer` | A **toggle** on the caster, which drains points while it is on | `devotion`: 0.5 experience per point drained | devotion, per beat | Prayer |
| `blessing` | Cast on others (or on remains, or on land) | `devotion`: per cast | devotion, per cast | Blessing |
| `special` | **Armed**, then spent on the next weapon attack | none of its own (the attack's own `combat:hit` experience applies) | stamina | Deed |
| `passive` | Always on; may react to an event (`trigger`) | – | – | Trait |
| `workPerk` | Always on for the listed job types or skills | – | – | Knack |
| `technique` | Applied when its job type is done (a new way of doing a job). **Or, when the record has a `target`, used actively like a blessing** (`bind_wounds`, CLASSES' *Green dressing*): a `cast` job that trains the record's own skill, not devotion or magic | the job's skill (the job pays); the record's skill when used actively | stamina or items, per job or per use | Technique |

### 2.2 Source: where an ability comes from
`source` holds one or more of these conditions, and all of them must hold:

| Field | Meaning | Read from |
|---|---|---|
| `class`, `tier` | The unit holds that class at that tier or higher | `UF.Classes.tierOf(unit, classId)` (CLASSES.md) |
| `level` | The record's `skill` is at least this level | `UF.Skills.level(unit, skill)` |
| `skill`, `level` | A skill milestone that needs no class, e.g. `{ skill: "woodcutting", level: 30 }` | UF_Skills |
| `people` | A list of people ids allowed (V76, V87); `null` means any | `unit.data.species` |
| `seat` | With `class`: the member's seat is of this seat kind (for abilities that differ by way, such as faith's temple and stone ring; CLASSES §4.1). Added in the review | the seat kind of `UF.Classes.of(unit).seatId` |

Creatures take abilities from their species block (`wildlife.species[].abilities: [id]`) and need no source. The ice wraith's `rime_fetter` (§7.2 #9) is the first example.

### 2.3 Cost and the pools
```
"cost": { "items": { "shard_charged": 2 }, "pool": "devotion", "amount": 3, "drainPerBeat": 0 }
```
- **`items`** are consumed from the caster's inventory with `UF.Items.consumeFrom(unitId, typeId, count)` (`UF_Items.js` line 354; `UF.Items.consume` takes one item instance id, not a type). V71: the caster's own, or faction-owned items the AI fetched first, §4.5.
- **`pool`** and `amount` are paid per cast. **`drainPerBeat`** is paid per beat while a toggle is on.
- **Reagents (A3 = T20 A).** The everyday reagent is **`shard_charged`**: a crystal shard charged at a standing stone or the tower by the `charge` job (§6.2). Higher spells add one reagent of a role, using item ids already in the catalog: `charcoal` (fire), `bone` (the dead), `gold` (a costly offering). None for cold yet. **This framework does not adopt the manifest's U7-derived reagent rows as a spell reagent set** (see §13, note for Codex). The first draft named `volcanic_ash` as the fire reagent, but that is one of those U7-derived rows (U7's fire reagent is an ash) and not in the catalog, so the review replaced it with `charcoal`; it also dropped `frost_organ`, which no record used and the catalog doesn't have.

| Pool | Who has it | Maximum | Refill | Spent by | Shown |
|---|---|---|---|---|---|
| `devotion` | every person | the devotion level | **Only at an altar:** a `rite` job (3 beats) at an object tagged `altar` fills it to maximum (the plain or fine altar, or a standing or table stone; CLASSES §10.2). Inside a faith seat's room or ring (`UF.Classes.seatRoomAt(cell, "faith")`, CLASSES §4.1), it rises by 1 per 20 beats. Nowhere else. | prayers (per beat), blessings (per cast) | sheet bar |
| `stamina` | every person; creatures with a deed | 100 | +2 per beat out of combat, +1 per beat in combat (`UF.Combat.inCombat`); full on waking from sleep | deeds, techniques | sheet bar |
| `inner` (inner light) | the star-born people | 20 + magic level | +1 per 4 beats while the unit stands in sky light: a cell exposed to the sky on its level (V80 §6.3), between game hours 6 and 18. Full inside a Lens hall of its own faction (`UF.Classes.seatRoomAt(cell, "light")`, CLASSES §4.11), member or not. Nothing else underground or at night. PEOPLES' light *need* (§3.10) is a separate meter; this pool is only for abilities. | star-born abilities | sheet bar |
| `flesh` (the store; display name A9) | the swarm people | 10 + floor(magic / 2) | +8 per remains consumed (a `consume` job, 2 beats; remains laid to rest can't be consumed); +1 per 5 beats within 6 cells of the mound (PEOPLES §3.11). It gains nothing but points from what it eats: no trait, no caste (PEOPLES §1.1, PE14) | swarm abilities | sheet bar |

All numbers are our own. A catalog key `abilities.pools` holds them.

### 2.4 Timing and difficulty (V85)
| Field | Unit | Meaning |
|---|---|---|
| `castBeats` | beats | The wind-up. The cast frames loop and the unit stands still. 0 means instant (a one-shot of the cast frames). |
| `speedTicks` | combat ticks | For an ability used as an attack (a combat spell): the attack's speed in place of the weapon's. |
| `cooldown` | beats | Beats after resolving before it can be used again. 0 means none (the cost limits it). |
| `duration` | beats | On effects that last (a buff, a light, a summon). 0 means until toggled off, or permanent. |
| `difficulty` | – | Non-combat abilities only: `{ chance: [low, high], fail: "time" \| "wasted" }`. The success chance is WORK_TIMING's `pLevel(L)` (CRAFTING §3.1), anchored at the ability's required level. Combat damage and debuff spells have no difficulty; their accuracy roll is the difficulty (V64). |
| `interruptible` | bool | Default: true when `castBeats` ≥ 3. Taking damage cancels the cast, and nothing is paid (AD4). |

### 2.5 Targets and range on five levels
```
"target": { "type": "unit", "side": "enemy", "range": 7, "los": true, "radius": 0, "levels": 0 }
```
- **`type`:**

  | Value | What it targets |
  |---|---|
  | `self` | the caster |
  | `unit` | one unit |
  | `cell` | one cell |
  | `area` | a cell plus a radius around it |
  | `remains` | a remains entry: UF_Anim's `remains`, or UF_Remains' when it lands |
  | `object` | an object with a tag, e.g. `{ tag: "altar" }` |

- **`side`:** `self`, `ally` (friendly per UF_Stance, including self), `own` (the caster's faction), `enemy` (hostile), `any`.
- **Range is in cells.** Horizontal distance is Chebyshev. **Vertical separation counts `abilities.levelCells` (3) cells per level** (V80 §7.4: "Range uses horizontal distance plus vertical separation"). `levels` is how many levels up or down the target may be: 0 means the same level only.
- **Line of sight** (`los: true`) goes through `UF.World.lineOfSight(a, b)`. It crosses levels only through open or permeable cells (V80 §7.4). That helper doesn't exist yet (UF_Combat has no line of sight either). It is a dependency (§11), and until it lands `los` isn't enforced (§13).
- **`requires`** (optional): `weaponTypes` (e.g. `["crush", "slash"]`), `shield: true`, `near: { tag, radius }`, `z: [allowed levels]`, `daylight: true`, `notInCombat: true`.
- **`exclusive`** (optional, toggles): a group name. Turning one prayer of the group on turns the others off.

### 2.6 Effects as data
`effects` is an ordered list. Each entry has a `type`, and the entries resolve in list order against each target.

| Type | Fields | What it does, and who executes it |
|---|---|---|
| `damage` | `attackType` (`magic`, `stab`, `slash`, `crush`, `ranged`), `power` (max-hit multiplier, default 1), `accuracyMul`, `auto` (true = no accuracy roll) | **UF_Combat.** `resolveAttack(caster, target, { ability })`: the accuracy roll `A` against `D` and the max hit from effective magic (AD3) × `power`, with a seeded 0..max. One `combat:hit` per target. Area damage rolls separately per hostile unit (A5). |
| `heal` | `amount: { base, perLevel }` (uses the record's `skill`), `overBeats` | Adds to `data.hp`, capped at `UF.Combat.maxHp`. With `overBeats`, the amount is split evenly across those beats. |
| `modify` | `stat`, `mode` (`add`, `mul`, `flag`), `value`, `duration` (beats; 0 = while toggled or passive), `stack` (`refresh`, `strongest`, `add`), `maxStacks`, `tag` | Writes a modifier to `unit.data.mods` (§8). The system that owns the stat reads it (table below). `value` may be a number or `{ base, perTier }`, resolved with the unit's tier in the record's `source.class` (`UF.Classes.tierOf`); CLASSES §5.1's class traits use it (added in the review, the same pattern as `heal.amount`'s `perLevel`). |
| `absorb` | `amount: { base, perLevel }`, `duration` | A barrier that UF_Combat subtracts from incoming damage until it is used up or expires. |
| `summon` | `species`, `count`, `duration` (0 = until destroyed), `cap: { base, perLevel }`, `from: "cell" \| "remains"` | `UF.World.addUnit` with the V68 guard: a passable cell only, nearest free otherwise. `data.summon = { by, a, until }`. The summon fights on the caster's side and follows it. At the end it is removed as a plain removal, with no death, remains or chronicle line. |
| `light` | `radius`, `level` (0–15), `duration`, `carried` (it follows a unit) | A point light: on its own level, and downward through open cells, never through a floor (V80 §6.3). Read through `UF.Abilities.lightAt(cellRef)` until the five-level light cache (V80 §3.2 `light`) exists. |
| `terrain` | `op`, `radius`, `duration` (0 = permanent), op fields | See §2.7. |
| `remains` | `op`: `rest` (laid to rest: it can't be raised or consumed, and kin get a good thought when UF_Colonists' thoughts take it) or `consume` | UF_Anim's `remains` list now, UF_Remains later (flag on the entry, or remove it). |
| `cleanse` | `tags` | Removes `data.mods` entries with those tags, e.g. `debuff`, `cold`. |
| `pool` | `pool`, `amount` | Restores a pool. Rites use it. |
| `technique` | `jobType`, `stamina` or `items` per job, `job: { regrowNow, extraYieldMul, … }` | Changes how one job is done. UF_Jobs asks `UF.Abilities.techniqueFor(unit, job)` when the job applies. |

**Stats that `modify` may name, and the system that reads each one:**

| Stat | Mode | Read by |
|---|---|---|
| `level.attack`, `level.strength`, `level.defence`, `level.ranged`, `level.magic` | mul / add | UF_Combat effective level: `floor(level × mul) + add + style + 8`. The display level and the combat level are unchanged (OSRS prayers work the same way). |
| `accuracy` | mul | UF_Combat: the max attack roll `A` |
| `maxHit` | mul | UF_Combat |
| `defenceRoll` | mul | UF_Combat: the max defence roll `D` |
| `damageTaken.<attackType>` | mul | UF_Combat, after the roll |
| `attackSpeed` | add (ticks) | UF_Combat's attack timer |
| `range` | add (cells) | UF_Combat: ranged and magic reach |
| `rooted` | flag | `UF.World.sendUnit` refuses to move the unit (the one function that moves units) |
| `noFlee` | flag | UF_Combat ignores `flee` mode |
| `regen` | mul | UF_Combat's hitpoint regeneration |
| `perkSpeed.<jobType or skill>` | mul | WORK_TIMING §4.1 `perkSpeed` (UF_Jobs); under V97, the damage per beat on an object's HP for object work |
| `perkFail.<skill>` | mul | WORK_TIMING §4.1 `perkFail` (the end roll) |
| `chanceMul.<jobType>` | mul | WORK_TIMING §4.2 attempt chance. Since V97, only the attempt actions left: the hunt strike and fishing |
| `yieldChance.<jobType>` | add | UF_Skills' extra-yield roll |
| `xpMul.<skill>` | mul | `UF.Skills.add` (a class's "faster experience", AD2) |
| `factionXpMul.<skill>` | mul | `UF.Skills.add`, before experience in a faction skill is routed to the faction pool (TECH_TREE §2.1): the mason's bonus to the faction's Building (CLASSES §5.1). Added in the review |
| `noSeek` | flag | UF_Combat's `seek` (`UF_Combat.js` line 767) skips the unit: it drops its target and picks none (CLASSES' *Still the mind*). Added in the review |
| `calm` | flag | UF_Wildlife's stance choice: the beast is indifferent while it holds (CLASSES' *Calm*). Added in the review |

### 2.7 Terrain effects on the five levels (V80)
Every target is a full `CellRef { area, x, y, z }`. An area effect applies on the target's level only, unless the op says otherwise. Nothing scans a whole level: an op touches its radius and enqueues the neighbour-level work that V80 already requires (support, fluids, light). Effects on levels off screen still happen in state, with no effect art drawn.

| Op | What it does | Owner it calls |
|---|---|---|
| `reveal` | Clears the `hidden` flag of natural cells within the radius, on the target level only (for example on −1/−2 around a mine) | UF_Levels |
| `stair` | Carves a connector pair in natural solid: `dir: "down"` makes stairDown at z and stairUp at z−1, `"up"` the reverse. Both cells must pass V80 §3.3's connector rules, and support is rechecked (V80 §5.2). | UF_Levels' carve-connector designation, done at once |
| `open` | Mines one natural solid cell to floor with no yield | UF_Levels `mine`, with the yield suppressed |
| `alignment` | Moves each cell one step toward `to` (cursed → neutral → blessed) and swaps its ground kind through the reverse of `regions.cursedGround`. Permanent. | a per-cell alignment override (new; THEME T18's healing cup needs the same thing) |
| `extinguish` / `ignite` | Puts out or starts fire on the cells | `UF.Fire.extinguish` / `UF.Fire.ignite` (both exported, `UF_Fire.js` lines 1066–1067). The first draft's op id `douse` was renamed after UF_Fire's own function; "Douse" is also a U7 spell name |
| `regrow` | Turns stumps and saplings in the radius into grown plants (V74) | UF_Ecology / regrow |
| `barrier` | A temporary blocking object on free cells (never on a unit, V68). It is removed at the end. | UF_Objects `setObject`, with the revert saved (§8) |

### 2.8 How it animates (V3, V58, V61)
- **The caster.**
  - It turns to face its target in all eight facings (V3).
  - An instant ability plays `UF.Anim.play(unit, "cast")`: columns 11–13 once, in the facing row.
  - An ability with `castBeats` > 0 sets `unit.data.casting = abilityId` for the cast. UF_Anim loops columns 11–13 (the `cast` state already exists; UF_Anim.md) and the flag is cleared on resolve or interrupt.
  - A prayer plays the one-shot when it is switched on.
  - Deeds use the attack frames the attack already plays.
- **The caster's effect layer** (`fx`): `$UF_fx_<abilityId>_cast.png`, on the AR-600 grid (20 columns × 8 facing rows). Only columns 11–13 are painted. AR-600's compose order already ends in `fx`. UF_Anim draws it as one more layer on the body's current frame while `data.fx` names it. This needs a small UF_Anim change (§11).
- **The impact:** `$UF_fx_<abilityId>_hit.png`. One row of 3–4 frames, 48×48 (96×96 for area abilities). It is played once, centred on the target's cell when the ability resolves, above units and under the hitsplats. It is drawn by UF_Abilities' own pooled tilemap layer (the way UF_Anim draws deaths).
- **What lasts:**
  - Area effects and lights use `!$UF_fx_<abilityId>_area.png`: 2–4 looping frames per affected cell, drawn flat under units like AR-906's `!$UF_fx_blood`.
  - Buffs, debuffs and barriers on a unit use `$UF_fx_<abilityId>_on.png`: an aura layer on the AR-600 grid with every column painted, so it follows the body's frames (UF_Anim's layer mechanism).
- **The clock** is UF_Anim's (map updates, `frameMs` 150, sidecar per sheet). It stops when paused and speeds up with the speed keys.
- **Missing art:** nothing is drawn, and the ability still resolves. That matches V58's rule and the way UF_Anim treats sheets with no death frames. There is no stock placeholder (A7) and no code-drawn glow, flash, shake, lunge or moving projectile (A6).
- **The one code-drawn part is interface:** the bar and the range overlay in target mode (§5). These are UI like the hitsplats and the drag rectangle, not world animation.

### 2.9 Two complete records
```json
{
  "id": "star_dart", "name": "TEST_Star-Dart", "kind": "spell", "skill": "magic",
  "source": { "class": "arcane", "tier": 1, "level": 1 },
  "cost": { "items": { "shard_charged": 1 } },
  "castBeats": 0, "speedTicks": 5, "cooldown": 0,
  "target": { "type": "unit", "side": "enemy", "range": 7, "los": true, "levels": 1 },
  "effects": [ { "type": "damage", "attackType": "magic", "power": 1.0 } ],
  "xp": { "base": 5 },
  "anim": { "caster": "cast", "casterFx": "$UF_fx_star_dart_cast", "impactFx": "$UF_fx_star_dart_hit" },
  "ai": { "use": "attack", "autocast": true, "policy": "auto" },
  "tags": ["arcane", "light"]
}
```
```json
{
  "id": "mending_touch", "name": "TEST_Mending Touch", "kind": "blessing", "skill": "devotion",
  "source": { "class": "faith", "tier": 1, "level": 5 },
  "cost": { "pool": "devotion", "amount": 3 },
  "castBeats": 1, "cooldown": 8,
  "target": { "type": "unit", "side": "ally", "range": 5, "los": true },
  "effects": [ { "type": "heal", "amount": { "base": 2, "perLevel": 0.15 } } ],
  "xp": { "base": 4, "perHeal": 1 },
  "anim": { "caster": "cast", "casterFx": "$UF_fx_mending_touch_cast", "impactFx": "$UF_fx_mending_touch_hit" },
  "ai": { "use": "heal", "hpBelow": 0.6, "policy": "auto" },
  "tags": ["faith", "heal"]
}
```
Required fields: `id`, `name`, `kind`, `source`, `target` (except passives), `effects`, `ai`. Every other field has a default in `abilities.defaults`.

---

## 3. Knowing, using and resolving

### 3.1 The known set
- `UF.Abilities.known(unit)` returns a list of ids. It is computed from the sources (§2.2) and cached per unit for the session.
- The cache is recomputed on `skills:levelUp`, `classes:changed` (UF_Classes), `world:unitAdded` and load. It is never recomputed per frame or per beat.
- `locked(unit)` returns the next abilities the unit could get, with their requirements (`"Tier II TEST_Acolyte"`, `"Magic 20"`). The sheet shows them greyed out, the way OSRS's spellbook greys out spells.

### 3.2 `canUse(unit, id, target)` → `{ ok, reason }`
Checked in this order. The first failure's reason is shown on the bar and in a refused order:

| Order | Condition | Reason text |
|---|---|---|
| 1 | Not known | "not learned" |
| 2 | Busy casting | "already casting" |
| 3 | Cooldown not over | "ready in N beats" |
| 4 | Items missing | "needs 2 charged shards" |
| 5 | Pool too low | "needs 3 devotion" |
| 6 | A `requires` not met | "needs a shield", "needs a crush weapon", "only by day", "not on this level" |
| 7 | Target type or side invalid | "not a valid target" |
| 8 | Out of range | "out of reach" |
| 9 | No line of sight | "can't see it" |
| 10 | Rooted (movement abilities only) | "can't move" |

The reason texts are proposals too (plain English, no names).

### 3.3 The five ways an ability runs
1. **A player order** (§5): a direct order that creates a `cast` job (below). It outranks every commander (CHAIN_OF_COMMAND §4.1, precedence 3).
2. **The AI outside combat** (§4.3–§4.5): a `cast`, `rite`, `charge` or `consume` job, given through `UF.Colonists.give`.
3. **In combat** (§4.2): inside UF_Combat's attack slot, with no job. An attack spell replaces the weapon swing, an armed deed modifies it, and a heal or buff is cast instead of the swing.
4. **Passives and work perks:** read by their owners (the stat table in §2.6). A `trigger` passive, such as `seam_sense` on `jobs:done` of `mine`, runs its effects when the event fires.
5. **Techniques:** UF_Jobs asks `techniqueFor(unit, job)` when the job applies and pays the technique's cost from the worker. When the worker can't pay, the job is done the plain way.

**The `cast` job type** (registered with `UF.Jobs.define`; UF_Jobs is not edited):
- **plan:** finds a stand cell within range and line of sight of the target, on the target's level or within `levels`. A self-target stands where it is. `{ ok: false, reason }` comes from `canUse`.
- **work:** `castBeats` beats (0 resolves on arrival), with `data.casting` set.
- **apply:** resolves (§3.4).
- It trains nothing through UF_Skills' `jobXp`, because the ability pays its own experience: `skills.noSkill` gets `cast`.
- The unit's intent text is "Casting <name>" (V48, V59).

### 3.4 Resolving, in order
1. `canUse` is checked again. If it now fails, the job fails with the reason, nothing is paid, and no cooldown starts.
2. **Difficulty** (non-combat abilities with `difficulty`): the seeded roll. On failure with `time`, stop: nothing is paid and no cooldown starts. On failure with `wasted`, pay the items and pool, start no cooldown and pay no experience. Either way, `abilities:failed`.
3. **Pay** the items and the pool (AD4).
4. **Effects:** each entry in list order, against each target. An area gathers its targets once, at resolve.
5. **Experience:** `UF.Skills.add(unit, skill, xp.base + xp.perHeal × healed + …)`. Per-damage experience comes from `combat:hit` through UF_Skills (AD6), so it is not added here.
6. **Cooldown:** `readyAt = beat + cooldown`.
7. **Emit** `abilities:used(unit, id, targets, result)`.

**Toggles.** On, it drains `drainPerBeat` from the pool every beat (§9: on the per-beat toggle list, never per frame). When the pool reaches 0 it goes off with `abilities:toggled(unit, id, false, "no devotion")`. A toggle in an `exclusive` group turns its group's others off.

**Deeds.** `arm(unit, id)` sets `data.abil.armed`. UF_Combat spends it on the unit's next attack that meets `requires`, pays the stamina at that moment, and applies the deed's `accuracy` and `maxHit` modifiers to that attack only. With too little stamina at that moment the deed is disarmed and the attack is plain.

**Autocast spell.** `data.combat.spell = id` makes that spell the unit's attack. `weaponOf` returns a spell weapon (`speedTicks`, `types: ["magic"]`, `range`), and every attack pays its cost. When the unit can't pay, it fights with its weapon, like `outOfAmmo`, and `describe` reports `outOfReagents`.

### 3.5 Events
- **Emits:**
  - `abilities:used(unit, id, targets, result)`;
  - `abilities:failed(unit, id, reason)`;
  - `abilities:toggled(unit, id, on, reason?)`;
  - `abilities:expired(unit, modOrEffect)`;
  - `abilities:summoned(caster, unit)`;
  - `abilities:known(unit, added, removed)`.
- **Listens:**
  - `skills:levelUp`, `classes:changed`;
  - `world:unitAdded`, `world:unitRemoved` (bound summons go when their caster dies or leaves; its cooldowns and mods go with it);
  - `jobs:done` (triggers, techniques);
  - `combat:hit` (interrupts);
  - UF_Anim's `anim:death`.

---

## 4. How the AI chooses

### 4.1 Rules for every AI decision
- Only units that know at least one active ability are looked at. They are kept in a sparse set, `casters`, updated with the known set.
- Scores come from numbers the systems already compute (`UF.Combat.describeAttack`, `hitChance`, hitpoints, pools) and never from test rolls. Ties go to `hash32(seed, 0xab11, unitId, beat)`. The same seed gives the same choices (check `ai_choice`).
- The player's faction obeys its policy per kind and per ability (§4.6), and each unit's autocast switch on the bar. Other factions use everything automatically (V51: every faction lives by the same AI).
- Monsters use their species abilities through the same combat choice (§4.2).

### 4.2 In combat: UF_Combat's attack slot
When a unit that knows combat abilities reaches `nextAttackTick`, UF_Combat asks `UF.Abilities.combatChoice(unit, target)` before swinging. The first match wins:

| Order | Choice | When |
|---|---|---|
| 1 | **Save itself** (a heal or barrier on self) | hp / max < `ai.hpBelow` (0.35), and one is ready and affordable |
| 2 | **Save an ally** (a heal, barrier or cleanse) | an ally within range has hp / max < 0.35. Pick the lowest fraction, then the highest rank (V52), then the lowest id. |
| 3 | **Prayers on** | the unit is in combat, the prayer is off, the pool is at least 20% of maximum, and the fight is worth it: the enemy's combat level is at least the unit's minus 10, or two or more enemies are within 6 cells. Prayers go off after 5 beats out of combat (on the toggle list, §9). |
| 4 | **Buffs** (`use: "buff"`) | not active on the unit, and at least `ai.minAllies` (2) allies within its radius are in combat |
| 5 | **Debuff** (`use: "debuff"`) | on the strongest enemy engaged with the unit's side, not already on it, and the fight is expected to last more than 10 ticks (the enemy's hp / the side's expected damage per tick) |
| 6 | **Deed** | stamina ≥ its cost, and the target's hp ≥ half the deed's max hit (don't waste it on the nearly dead). Arms it for this attack. |
| 7 | **Attack spell or weapon** | Expected damage per tick `E = hitChance(A, D) × maxHit / 2 / speedTicks`; for an area spell, × the hostile units in the radius (A5: no allies hit). Cast the spell when its `E` ≥ 1.1 × the weapon's `E`, or when the target is out of weapon reach but in spell range. **Reagent reserve:** the player's faction keeps `ai.reserve` (10) charged shards in stock unless the caster or an ally is below half hitpoints. |
| 8 | **Plain attack** | everything else |

Cost: one pass over the unit's known combat abilities (at most about 8) per attack, from cached numbers. Budget: ≤ 5 µs per attack (§9).

### 4.3 Support outside combat
- Every 3 beats, a third of the `casters` that know a heal, cleanse or buff run a scan, staggered by `unitId mod 3`.
- The scan covers allies within range plus 4 cells of walking, on the caster's level. There is no spatial unit query in the code today: UF_Combat's `seek` walks a list of units with a Chebyshev test (`UF_Combat.js` lines 767–790), and `UF.World.units()` returns every unit. So the scan walks the caster's own band (`UF.Colonists.members(fid)`, at most about 20) with a Chebyshev test bounded to 8 cells, never the world's unit list. The first draft claimed a "unit query around a cell" that doesn't exist.
- **Heal:** an ally with hp / max < `ai.hpBelow` (0.6). Score = (1 − hp/max) × (1.25 if in combat) + 0.05 × rank.
- **Rest the dead:** remains of the caster's faction or its allies within 20 cells, not laid to rest, with no hostile unit within 8 cells.
- The chosen cast becomes a `cast` job in the member's own-choice slot (CHAIN_OF_COMMAND §4.1, precedence 5). A heal on an ally below 0.35 goes in the `"first"` slot, ahead of an order, because it is an emergency.

### 4.4 While working
- **Techniques:** used when the job applies, if the worker can pay and the switch is on. With stamina the AI keeps 50% back for deeds: a technique runs only while stamina ≥ 50.
- **Light:** a caster with `use: "utility"` light casts it when the cell it or an ally within 4 cells is working on has `lightAt` < `ai.darkBelow` (4), and no ability light already covers the cell. This matters on −1/−2 and at night. Checked in the support scan (§4.3), never per frame.
- **Quench:** when a burning cell is within 10 cells of a building of the caster's faction. The burning cells come from `UF.Fire.burningCells()` (`UF_Fire.js` line 1072), read in the support scan; nothing scans the map.
- **Summons:** in combat, when the enemies within 8 cells are at least as many as the caster's side, or on a `guard` order. Raising the dead also needs remains within 6 cells and fewer raised than the cap.

### 4.5 Upkeep: jobs that keep abilities usable
These are own-choice steps, after survival and orders, the same as any other want:
- **`rite`** (at an object tagged `altar`, 3 beats): when devotion < 30% of maximum and an altar of the faction is within 40 cells. It fills devotion to maximum, burns one carried offering if the unit has one (§6.1), and pays devotion experience. The objects tagged `altar` are CLASSES §10.2's: the plain and fine altars and the standing and table stones. A `faith` member's rites at its own seat are its class duty (CLASSES §8.4, a 0.3 share of work hours); the first draft's separate dawn rite is dropped.
- **`charge`** (at an object tagged `charge_stone`, a standing stone or the tower's seat objects, CLASSES §10.2; 3 beats per crystal): when the faction's stock of `shard_charged` < `ai.stockTarget` (20) and an `arcane` member is idle.
- **`fetch` of reagents:** before a cast when the caster lacks them and the faction's stockpile has them (V71: faction-owned only).
- **`consume`** (swarm, 2 beats at remains): when the store is below 50%.
- **Commanders' orders** (CHAIN_OF_COMMAND §2.2) gain four task kinds in a later edit of that file:
  - `rite`;
  - `charge`;
  - `attend`: stay beside a group and heal it, used by the head's pass when the band is fighting. The first draft called it `tend`, which is CRAFTING's remedy job (§2.11 there) and the Herbalist's duty in CLASSES §8.4; the review renamed it;
  - `cast`: one ability on one target.

### 4.6 The player's faction: policy
- The faction menu (V49 behaviours, UF_Factions) gains an **Abilities** row per kind: *Automatic* / *Only when ordered*. The defaults follow A10.
- Each bar slot has a per-unit switch (autocast on or off) that overrides the kind's policy for that unit.
- The player's own direct orders always run.

---

## 5. How the player triggers abilities

### 5.1 The ability bar
- **When it shows:** a bar appears at the bottom centre when one or more of the player's units are selected (UF_Sheet's selection; V86's drag selection when UF_Select lands). Other factions' units show no bar.
- **Layout:** 9 slots, each 40×40 (a 32×32 icon inside a 4 px frame), with 4 px gaps, in the window skin in use. Keys 1–9 are unmapped by every UF plugin on 2026-09-19 (the key list in `docs/design/VERTICAL_BUILD_PLAN.md`, checked against the plugins' `Input.keyMapper` lines).
  - Slots fill with the unit's active abilities in catalog order.
  - A 10th slot, "More…", opens the sheet's Abilities section.
  - Passives and work perks have no slot.
- **Each slot shows:**
  - its key (1–9) at top left;
  - its cost at bottom right (for example "2" beside a shard);
  - while cooling down, a dimmed icon with the beats left as a number (the dim is static, with no animated sweep: AD9 and V60 are about world motion, but the bar still draws no motion);
  - greyed out when `canUse` fails without a target; hovering shows the reason;
  - a corner mark when autocast is on;
  - a lit frame when a prayer is on or a deed is armed.
- **Using a slot:** a key or a left-click on the slot.
  - **Self abilities and toggles** act at once as a direct order.
  - **Targeted abilities** enter **target mode**: the cursor changes, cells in range show a code-drawn outline, and right-click or Esc leaves (the same rule as V86's tools).
    - A left-click on a valid target gives the order.
    - An invalid click buzzes, and the reason shows in the look line (UF_Look). Nothing floats over a unit.
  - **Right-click on a slot** opens a small menu: *Autocast on/off*, *Use as attack* (spells, sets `data.combat.spell`) and *Details*.
- **Several units selected (V86):**
  - The bar shows every ability any of them knows. The slot's number is how many of them can use it now.
  - A targeted ability is cast by the best-placed one: in range and ready first, then the nearest, then the lowest id.
  - A toggle or self buff is used by every selected unit that knows it.
- **While paused (V33)** the bar works. Orders are queued and start on resume.

### 5.2 Right-click options
With one of the player's units selected, UF_Interact's menu for a cell gains entries at the top, one per ready ability whose target matches something on the cell: `"<Ability> — <caster's name>"`, e.g. "TEST_Mending Touch — Wenna".
- At most 6 are listed. Any more go in an "Abilities…" submenu.
- An ability that can't be used right now is listed disabled, with the reason in its label ("TEST_Star-Dart — needs 1 charged shard"), the way UF_Interact already labels a disabled "Haul".
- This is done by wrapping `UF.Interact.optionsFor` at run time (UF_Interact isn't edited; the same pattern UF_Speech uses on barks).

### 5.3 The character sheet
UF_Sheet gains an **Abilities** section:
- known abilities with their kind, cost, cooldown and autocast switch;
- the pool bars (devotion, stamina, and inner light or the swarm's store where the unit has them);
- active modifiers with their beats left;
- the next locked abilities with their requirements (§3.1).

The bar order can be changed there by moving a row up or down. Strangers show only what can be seen: active auras, and nothing else.

---

## 6. Skills: devotion (new) and magic (made real)

### 6.1 Devotion (skill id `devotion`, display name PROPOSED: **Devotion** · Faith · Worship)
THEME T23 already proposed a devotion skill, "OSRS's prayer under our own name".

**Catalog entry:** `skills.list` gains `{ "id": "devotion", "name": "TEST_Devotion", "kind": "combat" }` and `jobs: ["rite"]`, and UF_Skills.md's starting-level table gains a devotion column:

| Stage | Devotion levels |
|---|---|
| baby, child, teen | 1 |
| adult | 1–3 |
| elder | 1–5 |

PEOPLES.md may favour a people. Old saves need no migration: a missing skill is level 1.

**Experience** (our own numbers):

| Source | Experience |
|---|---|
| A rite at an altar, per offering burnt | bone 6; a large bone (UF_Remains' sizes) 15; a cooked meal 3; gold 40 |
| A rite with no offering | 2 (it still refills the pool) |
| Inside a faith seat's room or ring (the rite at the altar or stone there) | × `abilities.templeXp` (1.5). This is DF's room-value idea: a better place for the rite. |
| Laying the dead to rest (the blessing) | 25 |
| Blessings | per cast, from the record (`xp.base`, `xp.perHeal`) |
| Prayers | 0.5 per devotion point drained |
| Combat | none |

**What its levels unlock:**
- the prayers and blessings of §7.2, each at its level and class tier (A1);
- the size of the pool (maximum = level);
- at level 40, the rite's refill also works at any altar of an *allied* faction.

When a worship need exists (THEME T21 "later"; DF_GAP_MAP 7.11), a rite also meets it.

**The altar.** CRAFTING P20 held the altar back "until a magic design exists". This file is that design: an object tagged `altar` is the devotion refill point. CLASSES §4.1 (CL13) adds a plain altar (`altar_plain`) for temple grades 1–2, keeps CRAFTING's gold-fitted `altar` (§2.9 `altar_stone` and §2.10 there) for grade 3, and tags the stone ring's stones `altar` too. The temple is a room holding one; the stone ring is a yard of stones.

### 6.2 Magic (skill id `magic`, unchanged name) made trainable
Today, magic gains experience only from `combat:hit` with `attackType: "magic"`, which only the ice wraith makes. No person can train it (UF_Skills.md; UF_Combat.md, "Not built yet: … spells").

**Experience:**

| Source | Experience |
|---|---|
| Every spell cast that resolves | the record's `xp.base` (for example Star-Dart 5, Pale Lamp 6, Stone-Stair 60) |
| Combat spells | + UF_Skills' existing magic experience per damage point through `combat:hit` (2 per damage in the accurate and rapid styles; 1.33 plus defence 1 in long range) and hitpoints 1.33 per damage (AD6) |
| Charging shards (`charge` job, per crystal) | 4 + floor(level / 25): 4 at 1, 5 at 25, 6 at 50, 7 at 75 and at 99 |
| Study at a class seat (CLASSES §8.4: `arcane`, `grave` and `light` members' duty) | 25 + 2.5 × level per 40 beats, paid by UF_Classes, only below the training ceiling (magic 40). Added in the review. CLASSES' `drill` and `practice` pay attack, strength, defence or ranged the same way |
| Star-born and swarm abilities | their records' `xp.base`, to magic |

**What its levels unlock:**
- spells at their levels and the `arcane` class's tiers (§7.2; A1);
- the **charging yield**: 1 charged shard per crystal at level 1, 2 at 30, 3 at 60, 4 at 90 (our own thresholds);
- the maximum of inner light (star-born) and the swarm's store;
- magic gear, through CRAFTING's `equip.req` (cloth magic bonuses, D10; circlets, §5.9). The cloth and gem magic bonuses of CRAFTING now mean something: magic attack bonus raises spell accuracy, and magic strength raises spell max hit (AD3).

It stays a combat skill in the combat level (next section) and in magic defence (UF_Combat: 70% magic, 30% defence).

### 6.3 The combat level (A2)
```
combat = floor( 0.25 × (defence + hitpoints + floor(devotion / 2))
              + max( 0.325 × (attack + strength), 0.325 × floor(1.5 × ranged), 0.325 × floor(1.5 × magic) ) )
```
This is UF_Skills' `combatLevelFrom` with its omitted prayer term (`PRAYER_OMITTED`, line 54 on 2026-09-19) replaced by the devotion level. A missing `devotion` key counts as 1, so every existing input keeps its value:

| Inputs | Level |
|---|---|
| all 1, hitpoints 10 | 3 |
| all 99 with no devotion key | 113 |
| attack 60, strength 70, defence 50, hitpoints 65, ranged 40, magic 1 | 71 |
| all 99 with devotion 99 | **126** |
| all 1, hitpoints 10, devotion 50 | **9** |

UF_Combat's `combatLevel` (lines 220–227) duplicates the formula without the term. It changes to call `UF.Skills.combatLevel` when UF_Skills exists, so the two can't drift apart (check `combat_level_devotion`). Creatures have no devotion (level 1).

### 6.4 Not skills
Stamina, inner light and the swarm's store are pools, not skills. No other skill is added. A class's "faster experience" is `xpMul` on existing skills (AD2).

---

## 7. The starter list

### 7.1 Classes used here (CLASSES.md's ids; re-keyed in the review of 2026-09-19)
| Class id | Working id before the review | Opened by (CLASSES.md) | Pool / reagents |
|---|---|---|---|
| `faith` | `acolyte` | a temple (a room with an altar) or a stone ring | devotion |
| `arcane` | `wizard` | a tower | charged shards |
| `arms` | `martial` | a practice yard, then a hall of arms | stamina |
| `bow` | `archer` | archery butts | stamina |
| none | `crafter` | CLASSES.md has no craft class, so `sure_hands` (#17) is now a crafting-30 skill milestone | – |
| `light` | `starborn_adept` | a Lens hall | inner light |
| `brood` | `swarm_brooder` | the mound (PEOPLES §3.11) | the swarm's store |
| `grave` | `undead_raiser` | an ossuary (the first draft's "cursed shrine" is gone: "shrine" is avoided, THEME §3.3) | bone reagent |

The user's own words are "acolytes" and "wizards". The ids never reach the player; display names are CLASSES §15's proposals.

### 7.2 The 23 abilities
Names: the recommended name first, then alternates (A8). All are PROPOSALS, stored as `TEST_<name>` until approved. "Lv" is the record skill's level. "cd" is the cooldown in beats. "cast" is `castBeats`.

**Faith (`faith`; devotion):**

| # | id | Names (PROPOSALS) | Kind | Source | Cost | cast / cd | Target | Effects | AI |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `steadfast_vigil` | **Steadfast Vigil** · Stone Patience | prayer | faith 1, Lv 1 | 0.1 devotion per beat | 0 / 0 | self | `level.defence` ×1.04 while on; group `prayer.defence` | on in a fight worth it (§4.2 #3) |
| 2 | `oath_fire` | **Oath-Fire** · Kindled Arm | prayer | faith 2, Lv 20 | 0.2 per beat | 0 / 0 | self | `level.attack` ×1.06, `level.strength` ×1.06; group `prayer.melee`. The first draft's ×1.05 each matched OSRS's first attack and strength prayers exactly; the review moved it off that number | same |
| 3 | `mending_touch` | **Mending Touch** · Hearth-Balm | blessing | faith 1, Lv 5 | 3 | 1 / 8 | ally, range 5 | heal floor(2 + 0.15 × Lv) (2 at 1, 9 at 50, 16 at 99) | heal < 0.6 (§4.3), < 0.35 at once |
| 4 | `laying_to_rest` | **Laying to Rest** · The Quiet Word | blessing | faith 1, Lv 10 | 2 | 3 / 0 | remains, range 1 | remains `rest`; experience 25 | idle, own or allied remains within 20 (§4.3) |
| 5 | `heartening_word` | **Heartening Word** · Oath-Song (search: close in form to D&D's *healing word*) | blessing | faith 2, Lv 30 | 6 | 1 / 30 | area, radius 3 around self | allies: `accuracy` ×1.05 and `noFlee`, 40 beats | buff with 2 or more allies in the fight |
| 6 | `hallowing` | **Greening Rite** · Hallowing of the Land (D&D's *hallow* spell also sanctifies an area, SRD 5.1; the review put Greening Rite first) | blessing | faith 3, Lv 55 | 20 + 1 gold | 10 / 1440 | area radius 2, same level, range 1 | terrain `alignment` one step toward blessed, permanent; difficulty [0.6, 1.0], `wasted` | only when ordered (A10) |

**Arcane (`arcane`; charged shards):**

| # | id | Names (PROPOSALS) | Kind | Source | Cost | cast / cd | Target | Effects | AI |
|---|---|---|---|---|---|---|---|---|---|
| 7 | `pale_lamp` | **Pale Lamp** · Shard-Light · Glass Candle | spell | arcane 1, Lv 1 | 1 shard | 1 / 0 | cell or ally, range 6 | light radius 4, level 12, 600 beats; `carried` on a unit | dark work (§4.4) |
| 8 | `star_dart` | **Star-Dart** · Shard-Shot | spell | arcane 1, Lv 1 | 1 shard | 0, speed 5 ticks / 0 | enemy, range 7, 1 level | magic damage, power 1.0 (§2.9); autocastable | attack (§4.2 #7) |
| 9 | `rime_fetter` | **Rime Fetter** · Cold Shackle | spell | arcane 2, Lv 20; ice wraith (species) | 2 shards | 0, speed 5 / 20 | enemy, range 6 | gated by a magic accuracy roll: `rooted` 8 beats, `attackSpeed` +1 tick 8 beats, tag `cold` | debuff (§4.2 #5) |
| 10 | `quenching_mist` | **Quenching Mist** · Fire-Smother | spell | arcane 2, Lv 25 | 2 shards | 2 / 30 | area radius 2, range 6 | terrain `extinguish` | fire near own buildings (§4.4) |
| 11 | `stone_stair` | **Stone-Stair** · Rock-Parting | spell | arcane 3, Lv 45 | 5 shards | 8 / 240 | own cell or adjacent floor; `requires.z` not −2 for down | terrain `stair` (down, or up with `dir: "up"`); difficulty [0.5, 1.0], `wasted`; experience 60 | only when ordered |
| 12 | `cinder_bloom` | **Cinder Bloom** · Ember Rain | spell | arcane 3, Lv 50 | 3 shards + 1 charcoal (was volcanic ash, §2.3) | 1, speed 6 / 12 | area radius 1, range 6 | magic damage, power 0.8, to each hostile in the area (A5) | 3 or more hostiles in the area and no ally in it |

**Arms (`arms`; stamina):**

| # | id | Names (PROPOSALS) | Kind | Source | Cost | cast / cd | Target | Effects | AI |
|---|---|---|---|---|---|---|---|---|---|
| 13 | `felling_stroke` | **Felling Stroke** · Oak-Splitter | special | arms 1 | 50 stamina | – / 0 | the current target; `requires.weaponTypes` crush or slash | the next attack: `accuracy` ×1.25, `maxHit` ×1.15 | deed (§4.2 #6) |
| 14 | `set_shield` | **Set Shield** · Shield-Brace | special | arms 2 | 40 stamina | 0 / 30 | self; `requires.shield` | `defenceRoll` ×1.10, `damageTaken` stab, slash and crush ×0.85, 12 beats | 2 or more enemies adjacent, or hp < 0.5 |
| 15 | `old_scars` | **Old Scars** · Tough as Oak | passive | arms 1 | – | – | – | `regen` ×2 | – |

**Bow (`bow`; stamina):**

| # | id | Names (PROPOSALS) | Kind | Source | Cost | cast / cd | Target | Effects | AI |
|---|---|---|---|---|---|---|---|---|---|
| 16 | `long_draw` | **Long Draw** · Full Draw | special | bow 1 | 40 stamina | – / 0 | the current target; a bow | the next shot: `accuracy` ×1.4, `range` +2, `attackSpeed` +1 | target beyond normal range, or hp ≥ half the max hit |

**Crafting milestone (the first draft's `crafter` class; CLASSES.md has no craft class):**

| # | id | Names (PROPOSALS) | Kind | Source | Cost | cast / cd | Target | Effects | AI |
|---|---|---|---|---|---|---|---|---|---|
| 17 | `sure_hands` | **Sure Hands** · Guild-Craft | workPerk | crafting 30 (no class; A1 allows milestones) | – | – | – | `perkFail.crafting` ×0.5 (burnt and wasted chances halved). TECH_TREE's crafting-25 milestone *Thrifty Hands* sits beside it: one list or two is CLASSES CL29 | – |

**Skill milestones (no class; A1):**

| # | id | Names (PROPOSALS) | Kind | Source | Cost | cast / cd | Target | Effects | AI |
|---|---|---|---|---|---|---|---|---|---|
| 18 | `clean_felling` | **Clean Felling** · Forester's Cut | technique | woodcutting 30 | 8 stamina per tree | – | `chop` jobs | the stump becomes a sapling at once (V74), and the extra-yield chance ×1.5 | while stamina ≥ 50 |
| 19 | `seam_sense` | **Seam Sense** · Stone-Ear | passive (trigger) | mining 40 | – | – | `jobs:done` of `mine` on −1/−2 | terrain `reveal` radius 2 on the mined cell's level | – |
| 20 | `bind_wounds` | **Bind Wounds** · Field Dressing | technique (active) | healing 10 | 1 fiber | 3 / 20 | ally, range 1 | heal 1 + 0.1 × healing over 5 beats; cleanse `bleeding` (when injuries exist, Q12); healing experience 8 + 2 per hp | out of combat, ally < 0.7 hp, fiber carried |

**Peoples (V87; mechanics after PEOPLES.md):**

| # | id | Names (PROPOSALS) | Kind | Source | Cost | cast / cd | Target | Effects | AI |
|---|---|---|---|---|---|---|---|---|---|
| 21 | `light_ward` | **Light-Ward** · Veil of Glass | spell | light 1; people `starborn` | 8 inner light | 1 / 20 | ally, range 5 | `absorb` 3 + 0.1 × magic, 30 beats | ally in the fight, hp < 0.7, no ward |
| 22 | `wake_the_bones` | **Wake the Bones** · Grave-Call | spell | grave 1, Lv 15; people `undead` | 2 bone | 5 / 60 | remains, range 2, not laid to rest | `summon` restless dead (the existing `restless_dead` species) from the remains, until destroyed; each takes one bond from PEOPLES' cap of 1 + floor(magic / 10), shared with PEOPLES' raise job (PE13). The first draft had its own cap, 1 + floor(0.05 × magic), so a raiser could hold both sets; remains `consume` | summons rule (§4.4) |
| 23 | `alarm_scent` | **Alarm Scent** · Rally-Musk | spell | brood 1; people `swarm` | 12 of the store | 1 / 60 | area radius 6 around self, allies of its band | `accuracy` ×1.05 and `noFlee`, 30 beats (real colonies call their soldiers with an alarm scent) | buff with 2 or more allies in the fight (§4.2 #4) |

**Experience per cast** (`xp.base`) where the table doesn't say:
- Steadfast Vigil and Oath-Fire: per point, §6.1.
- Mending Touch 4 + 1 per hp. Heartening Word 10. Hallowing 120.
- Pale Lamp 6. Star-Dart 5. Rime Fetter 12. Quenching Mist 18. Cinder Bloom 20.
- Light-Ward 10. Wake the Bones 20. Alarm Scent 12.

The deeds, the passive and the work perk give none.

**Why #23 changed (review, 2026-09-19).** The first draft's `brood_call` ("Brood-Call · Hive-Birth") summoned two "brood" for 90 beats. Short-lived spawned minions are StarCraft's broodlings, one of the mechanics PEOPLES §1.1 names as never to copy; "brood" and "hive" are banned for the swarm's own names (PE21); and the summoned `swarm_brood` creature is not one of PEOPLES' castes. Alarm Scent is built from real social insects instead, and it needs no creature and no summon.

**Spread:** faith 6, arcane 6, arms 3, bow 1, skill milestones 4, peoples 3 (one each for the star-born, the undead and the swarm). The kinds cover everything the task asked for:
- damage and accuracy (8, 12, 13, 16);
- healing (3, 20);
- buffs and debuffs with durations (1, 2, 5, 9, 14, 21, 23);
- work speed and yield (17, 18, 19);
- summons (22);
- light (7);
- terrain on the five levels (6, 10, 11, 19).

### 7.3 Names avoided (the lists the §7.2 names were checked against, from memory; a web search follows before approval)
- **OSRS spells:** the strike, bolt, blast, wave and surge families; bind, snare, entangle, confuse, weaken, curse, stun, vulnerability, enfeeble; the teleports; alchemy; charge; heal other; vengeance; reanimate; the rush, burst, blitz and barrage families.
- **OSRS prayers:** thick skin, rock skin, steel skin, burst of strength, clarity of thought, sharp eye, hawk eye, eagle eye, mystic will, improved reflexes, rapid restore, rapid heal, protect item, protect from melee, protect from missiles, protect from magic, retribution, redemption, smite, preserve, chivalry, piety, rigour, augury.
- **OSRS special attacks:** puncture, cleave, sever, rampage, smash, shatter, shove, sweep, snapshot, sanctuary.
- **U7:** every spell name and the words of power; the eight reagent names.
- **D&D spells and features:** magic missile, cure wounds, healing word, bless, shield of faith, guiding bolt, sacred flame, spiritual weapon, eldritch blast, fireball, mage armor, misty step, hold person, animate dead, stone shape, feather fall, faerie fire, divine smite, lay on hands, second wind, action surge, rage, hunter's mark.
- **Well-known MMO abilities:** holy light, flash heal, frost nova, blink, shield wall, aimed shot, heroic strike, divine shield, consecration.
- **Others:** "Zeal" (a Diablo II skill); "Quickening" (Highlander); "Last Rites" (a real religious rite: THEME §3.4).
- **Added in the review:** StarCraft's broodlings (timed spawned minions) and every word PEOPLES §1.1 bans for the swarm's and the star-born's own names (brood, hive, nest, queen, spire, forge and the rest); D&D's *hallow*, *arcane lock* and *calm emotions*; OSRS's protection prayers (one attack type cut, 40% against players) and its prospect option on rocks; WoW's *volley* and *track beasts*; U7's *douse* and its fire reagent, the ash.

---

## 8. Save data
| Where | Shape | Size |
|---|---|---|
| `unit.data.abil` (only units that know an ability) | `{ cd: { id: readyBeat }, on: [id], armed: id \| null, auto: { id: false }, bar: [id] }`. Cooldowns already over are pruned when saving. `auto` stores only the switches turned off. `bar` is stored only when the player reordered it. | 40–150 bytes |
| `unit.data.pools` (only the pools the unit has) | `{ devotion, stamina, inner, flesh, t }`, one decimal; `t` = the beat of the last sweep | ≈ 50 bytes |
| `unit.data.mods` (active modifiers; at most 8 per unit, the oldest non-toggle dropped) | `[{ a: abilityId, by: unitId, s: stat, m: "add" \| "mul" \| "flag", v, u: untilBeat \| 0, t: tag, n: absorbLeft? }]` | ≈ 60 bytes each |
| `unit.data.summon` (summoned units) | `{ by, a, until }` | ≈ 30 bytes |
| `unit.data.combat.spell` (UF_Combat's saved record) | autocast spell id | ≈ 15 bytes |
| `UF.World.state.abilities` | `{ version: 1, beat, seq, effects: [{ id, a, kind: "light" \| "area" \| "barrier", cell: { area, x, y, z }, r, until, revert? }] }`; at most 256 effects, the oldest light dropped first | ≈ 120 bytes per effect |
| Remains flags | `laidToRest: true` on the remains entry, owned and saved by UF_Anim or UF_Remains | – |

- **Not saved:** known-ability caches, the `casters` set, AI scratch, effect sprites, the bar window, the expiry heap (rebuilt from `mods` and `effects` on load).
- **Estimate:** 200 people × 250 bytes + 256 effects × 120 bytes ≈ 80 KB, well inside V50's 3 MB.
- **Old saves:** no keys means full pools, no cooldowns and no mods. The migration writes nothing until something changes.
- **Permanent terrain changes** are saved by their owners (UF_Levels cell state, the alignment override store, UF_Tiles diffs), not here.

---

## 9. Performance (V50; budgets to be measured by the `perf` check, not measured yet)
- **No per-frame simulation.** Everything runs on beats or events, except UF_Anim's frame stepping for effects on screen.
- **The known set** changes only on events (§3.1): O(abilities) per unit per event.
- **The beat:**
  - The saved counter advances.
  - The expiry heap pops what is due (mods, effects, summons).
  - The **pool sweep** takes one tenth of the units with pools per beat, and each gets 10 beats of regeneration in its current context: in combat or not, sky light, temple room. **Reads are exact at any beat:** `pool(unit, id)` adds the credit still pending since `pools.t`, so `canUse` never sees a stale value. **Units with a toggle on** leave the sweep and are processed every beat: they drain, and they go off on the beat the pool reaches 0, or 5 beats after combat ends. Only prayer users in or near a fight are on that list.
  - The support scan runs for a third of the casters every 3 beats (§4.3), each over its own band, never over the world's unit list.
  - **Position-dependent passives** (CLASSES D14: *Shoulder to shoulder*, *Clutch guard*, *Tower-light*'s bonus) are re-read when the unit's pool sweep comes round (every 10 beats), from its band's positions or one cached room, and are held in `combatMods` until then. Never per attack or per frame.
  - Budget: **≤ 0.05 ms per beat on average with 200 people with pools and 40 casters.**
- **In combat:** `combatChoice` is one pass over the unit's combat abilities from cached numbers. `combatMods(unit)` returns a per-unit summed object, rebuilt only when that unit's `mods` change. Budget: **≤ 5 µs extra per attack.**
- **Work perks:** `perkSpeed` and `perkFail` are cached per unit and skill. Budget ≤ 1 µs per call.
- **Effect drawing:** only on screen, from pooled sprites. At most 32 impacts, 64 area cells and one aura per unit in view. No bitmap is made per frame. Budget: **≤ 0.1 ms per frame** at the farthest zoom with all of them showing.
- **The bar** redraws only when the selection, a cooldown's whole-beat number, a pool or a switch changes. Budget ≤ 0.02 ms per frame when idle.
- **Off-screen levels (V80):** effects apply in state, with no sprites.

---

## 10. Checks (suite `abilities`, registered by UF_Abilities)
Test units are `TEST_`-named people with `setLevel` levels and a stub class tier (`UF.Classes` stubbed when UF_Classes isn't loaded). They stand on a free block near the map centre at zoom 1. The suite drives the beat counter directly where a check needs time to pass, and restores everything at the end. At the build, every check must be seen failing against a sabotaged copy in its own snapshot (ENGINE_RULES §6).

| Check | What would make it FAIL |
|---|---|
| `catalog_valid` | Any of these: a record missing a required field (§2.9); an unknown kind, pool, item id, species, effect type, terrain op or stat; a cooldown, `castBeats` or `duration` that isn't a whole number ≥ 0; a `source.class` not in the catalog's `classes` (once UF_Classes exists); a `name` not starting with `TEST_` unless listed in `abilities.approvedNames`; a name or id containing a word from the AGENTS list, THEME §3.3 or §7.3; two records with one id; a class record carrying its own ability list (AD1). |
| `known_from_sources` | An `arcane` tier-1, magic-1 test person not knowing `star_dart` and `pale_lamp`, or knowing `rime_fetter`. After magic 20 and tier 2, not knowing it. A person with magic 99 and no class knowing any spell (A1). Woodcutting 29 giving `clean_felling`, or 30 not giving it. The known set not updated in the same frame as `skills:levelUp`. `locked()` not naming "Magic 20" for `rime_fetter`. |
| `cost_cooldown_refusal` | `star_dart` with 0 shards not refused with a reason containing "shard", or anything consumed. 3 shards not leaving 2 after one cast. `mending_touch` at devotion 2 not refused ("devotion"), or at 10 not leaving 7. A second Mending Touch before 8 beats not refused ("beats"), or at exactly 8 refused. A 3-beat cast interrupted by a hit paying anything or starting its cooldown (AD4). A `difficulty` failure with `time` paying anything. |
| `pools` | Devotion rising over 100 beats anywhere but at an altar or in a temple room. A rite not filling it to maximum within 3 beats of work. Stamina read through `pool()` not +2 per beat out of combat and +1 in combat (±0.01, read at every beat of a 50-beat window, so the pending credit is tested as well as the sweep). Inner light not rising in sky light at z 0 by day, or rising on −1 or at night. The swarm's store not +8 per consumed remains. |
| `prayer_toggle` | With `steadfast_vigil` on, `UF.Combat.describeAttack`'s defence roll not using `floor(level × 1.04)`. The drain not 10 points (±1) over 100 beats. At 0 points not off, with `abilities:toggled(…, false, "no devotion")`. Two prayers of one exclusive group both on. |
| `spell_damage` | 3000 seeded `star_dart` casts at magic 50 against a dummy: any damage above AD3's max hit, the maximum never seen, or the hit rate off `UF.Combat.hitChance(A, D)` by more than 2 points. A `combat:hit` that isn't exactly the six contract keys with `attackType` magic. Magic experience per cast not 5 + 2 × damage (±0.1), or hitpoints not 1.33 × damage. |
| `specials` | With `felling_stroke` armed, the next attack's `A` not ×1.25 or its max hit not ×1.15 of the same attack plain. Stamina not −50. The attack after it modified. Armed at 49 stamina. |
| `heal_buff_duration` | A heal taking hp above the maximum. `heartening_word`'s mods present on an ally outside radius 3 or missing inside it; the same for `alarm_scent` at radius 6, or on a unit of another band. The mods gone before beat 40 or present at beat 41. `refresh` stacking leaving two copies. An `absorb` not taking damage before hitpoints do. |
| `summon_and_remains` | `wake_the_bones` on a remains entry not putting a `restless_dead` on a passable cell within 1 of it (V68), bound (`data.summon.by`), with the remains consumed. Laid-to-rest remains not refused. The (cap + 1)th raise not refused. A `wake_the_bones` summon not taking one of PEOPLES' bonds, or a raise allowed when the raiser's bonds are full of summons. |
| `terrain_levels` | `stone_stair` at a floor cell on z 0 over natural solid on z −1 not making stairDown at z 0 and stairUp at z −1 that pass V80 §3.3's rules; a path not found between them afterwards; any cell on +1/+2 changed. `seam_sense` after a mine job at z −1 not revealing hidden cells within 2, or changing any cell on 0 or −2. `hallowing` on a cursed 5×5 not leaving the radius-2 cells neutral, or changing a cell outside it. `quenching_mist` not dousing a burning cell inside its radius, or dousing one outside it. |
| `light` | `pale_lamp` at z −1: `lightAt` of the centre not 12; non-zero at radius 5; non-zero on z −2 under a solid floor; still lit after 600 beats. A carried lamp not moving with its unit. |
| `anim_cast` | A 3-beat cast by an AR-600 test unit (`$TEST_AnimBody`) not showing columns 11–13 in the row facing its target (checked for two of the eight facings) during the cast, and idle after. The `fx` layer not on the body's column. The impact sheet not playing each frame once over the target. Any offset, rotation, scale, blend or filter change on any sprite involved (UF_Anim's `no_code_motion` probe). A unit whose sheet has no cast frames showing anything but its plain frames. Missing effect art drawing anything or raising an error. |
| `ai_choice` | An AI `faith` member with an ally at 30% hp within range not casting Mending Touch within 3 beats. An ally at full hp being healed. An AI `arcane` member, a wolf out of melee reach and shards in stock, not casting `star_dart` at it. A caster with 0 shards casting a spell. The player's faction with policy "Only when ordered" casting `hallowing` by itself. Two runs from the same seed making different choices. |
| `player_bar` | Selecting a test `arcane` member: no bar; the bar not at the bottom centre; its slots not the known actives in catalog order, with icons loaded, visible and inside their slots. Key 1 not entering target mode. A left-click on a wolf not creating a `cast` job for `star_dart` targeting it. Right-clicking the wolf not listing "TEST_Star-Dart — <name>" first. A slot at 0 shards not greyed, or its hover reason not naming the shard. Screenshot `abilities.bar.png`. |
| `combat_level_devotion` | `combatLevelFrom`: every skill at 99 with devotion 99 not 126; without a devotion key not 113; devotion 50 with the rest at 1 (hitpoints 10) not 9. `UF.Combat.combatLevel` differing from `UF.Skills.combatLevel` for any of 20 seeded people. |
| `devotion_magic_xp` | A rite burning 1 bone not paying devotion +6 (+9 in a temple room). A charge at magic 1 not paying +4 and making 1 shard, or at 30 not making 2. Laying to rest not +25. A prayer's drain not paying 0.5 per point. |
| `saved` | A `JsonEx` round trip changing any `data.abil`, `data.pools`, `data.mods`, `data.summon` or `state.abilities`. A cooldown restarting after a save and load. An old save with none of these keys not loading with full pools and no cooldowns. |
| `perf` | Any budget in §9 exceeded over at least 30 s of seeded play (`performance.now`; the machine and the unit counts recorded in the detail): 200 pooled people, 40 casters, a 20-unit fight with spells, 32 impacts and 64 area cells on screen. |
| `no_math_random` | `UF_Abilities.js` unreadable, shorter than 5000 characters, or containing the unseeded random call. |
| `no_errors` | Any uncaught error during the suite, or any error caught inside UF_Abilities. |

**Existing checks the build updates:**
- `skills.combat_level`: the devotion inputs above.
- `skills.starting_levels`: devotion within its stage ranges.
- `skills.curve`: unchanged.
- `combat.styles`: unchanged; it proves AD6 by still requiring exactly six keys.
- `anim.state_frames`: an `fx` layer following the cast columns.
- `look` (UF_Interact): the ability entries appear only with a player unit selected.

---

## 11. Hooks, dependencies and build plan

### 11.1 Hooks in other files (all Claude Code's; exact lines are written at the build)
| File | Change |
|---|---|
| `UF_Combat.js` | Effective level reads `UF.Abilities.combatMods(unit)` (level mul/add, accuracy, maxHit, defenceRoll, damageTaken, absorb, attackSpeed, range, noFlee, regen). `resolveAttack(…, { ability })` takes `power` and `accuracyMul` (AD3). The attack slot calls `combatChoice` (§4.2). `weaponOf` gives the autocast spell weapon. The armed deed is spent. `combatLevel` delegates to UF_Skills (§6.3). `combat:hit` stays six keys (AD6). |
| `UF_Skills.js` | The `devotion` skill (catalog). `PRAYER_OMITTED` becomes the devotion level. `add` multiplies by `xpMul`. Job mappings: `rite` → devotion, `charge` → magic; `cast` and `consume` go into `skills.noSkill`. The progression run also edits this file (the DF-mechanics claim in STATUS), so the change is merged after it lands. |
| `UF_Jobs.js` | `perkSpeed` and `perkFail` (WORK_TIMING §4.1) read `UF.Abilities`. `techniqueFor` is called when a job applies. The `cast`, `rite`, `charge` and `consume` job types are defined from UF_Abilities through `UF.Jobs.define`, so UF_Jobs itself isn't edited for them. |
| `UF_Anim.js` | An `fx` pseudo-slot drawn last, from `unit.data.fx` (the cast and aura layers). The `cast` state already exists (columns 11–13, `data.casting`). |
| `UF_World.js` | `sendUnit` refuses a unit with `rooted`. A `lineOfSight(a, b)` helper with V80's rules, shared with UF_Combat. |
| `UF_Interact.js` | None. It is wrapped at run time (§5.2). |
| `UF_Sheet.js` | The Abilities section (§5.3). |
| `UF_Factions.js` | The policy row in the faction menu (§4.6). |
| `CHAIN_OF_COMMAND.md` (a later edit) | The task kinds `rite`, `charge`, `tend` and `cast` (§4.5). |

### 11.2 Dependencies (the build waits for these)
- **UF_Classes / CLASSES.md** (`tierOf`, `classes:changed`, the class ids; V88).
- **UF_Tech and the UF_Skills personal unlocks** (V84; TECH_TREE.md).
- **WORK_TIMING** (V85): `beatNow`, `perkSpeed`, `perkFail`, `pLevel`.
- **UF_Levels** (V80): z on units and cells, hidden cells, connectors, the light cache.
- **UF_Remains** (bones and remains records).
- **PEOPLES.md** (V87): the ids for the star-born, the swarm and the undead (fixed in its §1.3); the mound and the bond cap (PE13) in its wave 2.
- **UF_Select** (V86): multi-selection for the bar.
- **CRAFTING's C1 data:** the `altar` object and `altar_stone`; charged shards and crystal; cloth magic bonuses.
- **THEME T20 and T21** (the user's answers; A3, A4).
- **The user's approval of names** (A8, A9).

### 11.3 Build plan (each phase ends with its checks passing on a snapshot, then Playtest F5 by the user)
| Phase | What | Checks |
|---|---|---|
| **B1 Data** (editor closed: AGENTS "RMMZ editor safety") | Catalog `abilities` (defaults, pools, the 23 records with `TEST_` names), the devotion skill, the item `shard_charged`, the `abilities` block on `ice_wraith`. A layout-preserving node script, never `ConvertTo-Json` (ENGINE_RULES §4). | `catalog_valid` |
| **B2 Core** | `UF_Abilities.js`: known set, `canUse`, costs, cooldowns, the pools and their sweep, the `cast`, `rite` and `charge` jobs, the effect types `heal`, `modify`, `absorb`, `pool`, `cleanse`, `technique`; save | `known_from_sources`, `cost_cooldown_refusal`, `pools`, `prayer_toggle`, `heal_buff_duration`, `devotion_magic_xp`, `saved` |
| **B3 Combat and animation** | The UF_Combat and UF_Anim hooks; the effect layer | `spell_damage`, `specials`, `combat_level_devotion`, `anim_cast` |
| **B4 Player** | The bar, target mode, right-click entries, the sheet section, the faction policy | `player_bar` (screenshot opened and described) |
| **B5 AI** | `combatChoice`, the support scan, work and upkeep | `ai_choice`, `perf` |
| **B6 World** (after UF_Levels and UF_Remains) | `light`, `terrain`, `summon`, `remains` | `terrain_levels`, `light`, `summon_and_remains` |
| **B7 Peoples** (after PEOPLES.md's mechanics wave) | Inner light and the swarm's store; records 21–23 | their rows in `pools`, `summon_and_remains` |

---

## 12. Art needed (the build writes `docs/handoffs/HANDOFF_abilities.md` and the AR rows from this list)
All art follows `docs/ART_STANDARD.md`, `docs/RMMZ_ASSET_SPEC.md` and Nano Banana (V69, V70), in pale relic-light for tower spells (THEME §2.11: the palette's pale blue-white). No readable symbols. No real religious symbols (THEME §3.4).

| What | File pattern | Spec | Per ability |
|---|---|---|---|
| Caster effect layer | `$UF_fx_<id>_cast.png` + sidecar `layer: "fx"` | AR-600 grid, 20 × 8 frames of 48×48; only columns 11–13 painted (pale relic-light gathering at the hands for spells, a soft held glow for blessings and prayers; no runes, letters or symbols), in every facing row | all active spells, blessings and prayers (15) |
| Impact | `$UF_fx_<id>_hit.png` | one row of 3–4 frames, 48×48 (96×96 for `cinder_bloom`, `quenching_mist` and `heartening_word`), centred on the cell, bottom-anchored | 13 |
| Area or light loop | `!$UF_fx_<id>_area.png` | 2–4 looping frames of 48×48 per cell, flat, under units | `pale_lamp`, `quenching_mist`, `hallowing`, `stone_stair` (dust) |
| Aura on a unit | `$UF_fx_<id>_on.png` | AR-600 grid, every column painted, a faint aura | `steadfast_vigil`, `oath_fire`, `heartening_word`, `rime_fetter`, `set_shield`, `light_ward`, `alarm_scent` (never a fleshy or pulsing look, PEOPLES §1.1) |
| Ability icons | 32×32 icons (RMMZ `IconSet.png` format) | one per active ability (20), plus the deed and trait markers. Stock `IconSet.png` icons are used until delivery, each named in the request's Status column (CLAUDE.md) | 20 |
| Bar slot frame | `UF_AbilitySlot.png` | 40×40, four states: normal, toggled on, autocast mark, locked | 1 |
| Target cursor | `UF_TargetCursor.png` | 32×32 pointer for target mode | 1 |
| Items | `shard_charged` ground item and icon | CRAFTING/AR-200 format | 1 |
| Summoned bodies | none new: `wake_the_bones` raises the existing `restless_dead`. The first draft's brood creature went with `brood_call` | – | 0 |

Bodies need their cast columns 11–13 drawn (AR-600 already asks for them; AR-400's human male set includes `cast`).

---

## 13. Not decided here, known limits, notes for other owners
- **Class ids, criteria, tiers and numbers** are CLASSES.md's. The records were re-keyed to its ids in the review (§7.1).
- **Line of sight** doesn't exist anywhere yet. Until `UF.World.lineOfSight` lands, `los` isn't enforced, and `canUse` reports it in its detail. This is a known gap, not a silent pass: the `cost_cooldown_refusal` detail prints "LOS not enforced".
- **What darkness does** (slower work, fog, fear) belongs to the five-level light model. Until it exists, `pale_lamp` sets light values that nothing reads, so its use is only visible in `lightAt` and the art.
- **Injuries** (Q12, still open): `cleanse bleeding` does nothing until wounds exist.
- **Balance** is first-pass and unmeasured. `UF.Combat.duel` against spells and deeds goes to UF_Combat's balance review (CRAFTING D12).
- **Note for Codex (resource manifest; not edited here):**
  - `RESOURCE_MANIFEST.json` maps U7's eight reagents one to one into canonical rows with the same real-world names (`black_pearl`, `blood_moss`, `garlic`, `ginseng`, `mandrake`, `nightshade`, `spider_silk`, `volcanic_ash`). As ids that's allowed, but as a set of spell reagents it would copy U7's reagent system, so this framework uses only `shard_charged` plus single role reagents (§2.3).
  - The processed row `rune_crystal` uses "rune", which CRAFTING and THEME ban as an OSRS name. The recommended id is `shard_charged`.
- **Not in this framework:**
  - learning abilities from books or teachers;
  - item-granted abilities (relics, THEME T18: a later `source.item`);
  - combos;
  - resurrection of the living dead;
  - the worship need.
