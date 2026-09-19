# CLASSES: classes opened by what the faction builds (VISION V88)

Written 2026-09-19 by Claude Code. **Design only.** Nothing in `game/`, the catalog or any other doc was changed for this file, and nothing in it is built or tested. It is the spec for one new plugin, `UF_Classes.js`, for the catalog key `classes`, and for the small hooks it needs in other plugins (§11).

This file merges two independent drafts written earlier on 2026-09-19: draft A ("the faction's buildings are the gate") and draft B ("the person's path is the gate"). Both drafts were deleted once merged. §17 records how they were judged, what came from each, and what was dropped.

**Reviewed 2026-09-19 by a critic run** against the code in `game/js/plugins/`, the catalog, VISION, PEOPLES.md, TECH_TREE.md, CRAFTING.md, CHAIN_OF_COMMAND.md, the IP rules and V50. `docs/design/ABILITIES.md` was edited in the same review so the two files agree. §19 lists every change and why. Nothing in `game/` was changed.

**The user's words** (2026-09-19 13:47, VISION V88): "I would also like a class system that enhances / unlocks skills and abilities based on certain criteria, like building a temple for acolytes, or a a tower for wizards, etc."

**Every name in this file is a PROPOSAL** (AGENTS rule 7). That covers classes, seats, seat pieces, branches, advanced classes and abilities. Until the user approves a name, the catalog carries it as `TEST_<name>` (§15). Ids are neutral and never reach the player.

**Who owns what** (so nothing is decided twice):

| Topic | Owner |
|---|---|
| Which classes exist; what opens them; seats, grades and places; tiers; joining, the word, lapsing and leaving; class AI; class UI; class gates on work | **this file** |
| The ability record, the pools (devotion, stamina, inner light, the swarm's store), casting, cooldowns, the ability AI, the ability bar, the devotion skill, magic's experience sources | `docs/design/ABILITIES.md` |
| The faction Building level, the node tree, `UF.Tech.meets`, culture permissions, personal skill-level unlocks | `docs/design/TECH_TREE.md` |
| People ids, life cycles, eggs and nests, the mound and its castes, raising the dead, constructs | `docs/design/PEOPLES.md` |
| Reviews, orders, commanders' lines, task kinds | `docs/design/CHAIN_OF_COMMAND.md` |
| Workshops, furniture, recipes, the altar (P20), the relic bench, salvage, remedies and `tend` | `docs/design/CRAFTING.md` (proposals) |
| Remains, bones, burial state | `docs/design/REMAINS.md` |
| What magic and faith are (T20, T21), buildings (T16), relics (T18), ranks (T11) | `docs/design/THEME.md` (proposals) |

**Decisions it builds on** (docs/VISION.md): V16 and V17 (emergence; people act on their own), V21 (what people do shows physically), V31 (no history at generation), V39 and V76 (a culture per faction), V50 (budgets), V51 (every faction lives by the same AI), V52 (ranks in threes; the head gives orders), V58 and V89 (sprites only), V59 and V92 (status goes to the profile; only speech over heads), V62 (speech), V63 and V84 (OSRS-style skills; personal levels unlock; building and technology are faction-wide), V64 (OSRS combat), V65 (Arthurian fantasy with relics of a fallen star-faring past), V66 (crafting by material tiers), V71 (ownership), V77 (build N of X unlocks Y), V80 (five levels), V85 (beats and difficulty), V87 (eleven peoples), V97 and V98 (work on an object runs down its HP, and a whole HP bar yields a sensible amount; these replace gathering's attempts), V88 (classes), V94 (personality).

**Time units:** 1 beat = 1 game minute = 1 real second at ×1 (V46, WORK_TIMING §3). A game hour is 60 beats and a game day is 1,440 beats.

**Inspiration, not copying.** Mechanics only, in our own words and numbers:
- From Dwarf Fortress: a temple is a room around an altar; positions come with room requirements; priests comfort the stressed; guilds and temples are petitioned for when enough people want them.
- From Old School RuneScape: level-gated spells and prayers; a prayer pool refilled at an altar; spells paid with a consumed item.
- From Ultima VII: casters who carry reagents and study in a tower.

No name, spell name, prayer name, number, lore or text is taken from any of them (§15.3 lists the words avoided).

---

## 0. In short
- **A building opens a class for the faction.** A class is *open* in a faction when the faction owns a valid **seat**, a room or yard holding the class's seat object (a temple with an altar, a tower with a study table, a practice yard with pells), and meets any other faction criteria through `UF.Tech.meets` (§2.1).
- **A person joins through three gates** (§7):
  - **the path:** real skill levels plus **tallies**, counts of things the person has done in play;
  - **a free place** at one of the faction's seats of the class;
  - **the word:** an order from a commander in the person's own chain (V52).

  The person walks to the seat and is **inducted** there (V21).
- **Nobody holds a class at a New Game** (V31): nothing is built, and the tallies come only from play.
- **Aspirants drive building.** A person who meets the path of a class the faction can't yet seat becomes an **aspirant**. The head's review then orders the seat built (§8.2). Buildings go up because people want them (V16, V17).
- **Tiers I–V** come from the class's **key skill** (1, 20, 40, 60, 80), capped by the grade of the faction's best seat of the class. Grade 1 allows tiers I–II, grade 2 allows III–IV, and grade 3 allows V (§2.4). Each grade is a better room: more cells, floors, stone walls, support pieces, and for some classes a higher or deeper level (V80).
- **A class enhances** its favoured skills: experience, work speed, success, yield and effective combat levels, rising with tier. The enhancements are written as passive abilities (ABILITIES AD2). **Class bonuses never meet a level requirement** (§5).
- **A class unlocks** (§6):
  - its abilities (ABILITIES records with `source.class` and `tier`);
  - work only its members may do (a few top recipes and resources);
  - faction technology (TECH_TREE's `requires.classes`);
  - the peoples' own acts, made faster or stronger.
- **Starter set: 13 classes** (§3). Nine are shared by most peoples: Acolyte, Wizard, Man-at-arms, Archer, Herbalist, Smith, Lodge-mason, Prospector, Salvor. Four belong to the peoples who live differently: Dust-speaker (undead), Lens-keeper (star-born), Mound-tender (swarm), Clutch-warden (lizardfolk and kobolds).
- **One class at a time.** Losing a seat **lapses** the class (no effects) for up to 7 game days, and then the person leaves it. Leaving keeps every point of experience (§7.4).
- **AI:** a class pass inside UF_Command's review (§8). **UI:** sheet lines, a seat panel and a Classes page (§9). **Saved** in `unit.data.class`, `unit.data.tallies` and `state.classes` (§10). **Checked** by the suite `classes`, with 26 checks, each with a way to make it fail (§12).
- **Words:** the path's counters are **tallies** (draft B called them "deeds"). ABILITIES A9 proposes "Deed" as the display word for a special attack, so this file never uses "deed" for anything else.
- **Built in six phases**, after UF_Tech, UF_Command, UF_Abilities and the V87 peoples waves they depend on (§13).

---

## 1. Decisions made in this file (design, not lore)
| # | Decision | Why |
|---|---|---|
| D1 | **Class ids are neutral and stable:** `faith`, `arcane`, `arms`, `bow`, `herb`, `smith`, `mason`, `delve`, `salvage`, `grave`, `light`, `brood`, `clutch`. Display names come from the catalog. | Names can change without touching saves (the CRAFTING D4 rule). |
| D2 | **No class at a New Game.** Every path needs a tally, and nobody takes a class in their first game day in the band. | V31. |
| D3 | **A seat is a seat object in a setting:** a room from `UF.Rooms.roomAt`, or a yard around the object. It must be owned by the faction (V71). Grade and places are computed, never saved. Only the seat objects' cells are saved, as a small index (§10.3), so a load never scans the map to find them. | Reuses rooms, floors and doors (V56, V57) and the DF idea of a temple as a room around an altar. V50. |
| D4 | **Tiers are computed, never stored:** `tier = f(key level, best seat grade)`. Only the chosen branch is stored. | A save can't hold a stale tier, and a catalog change takes effect at once. |
| D5 | **Skills still reach 99 for everyone** (V63). A class never caps anyone else. | V63. Draft B considered capping non-members at 60 and rejected it. |
| D6 | **Abilities live only in `abilities.list`** (ABILITIES AD1). A class record never lists its abilities; UF_Abilities derives them from `source.class`. The tables in §4 show them for reading only. | One truth. ABILITIES' `catalog_valid` fails a class record that carries an ability list. |
| D7 | **The enhancements are passive ability records** (ABILITIES AD2), generated by the catalog tool from this file's numbers (§5). | One mechanism for every bonus. |
| D8 | **Anyone may train devotion and magic; only members use class abilities** (ABILITIES A1, recommended there). Neither draft's "sealed" or "locked" skill is used. | Consistency with ABILITIES. The user can still choose the lock (CL6). |
| D9 | **No overhead text except speech** (V62, V92). Induction orders, the new member's answer, a tier-up remark and ability shouts are speech. Tiers, places, grades and pools go to the profile and the chronicle. | V92. |
| D10 | **New objects are only appended** to `catalog.objects`. | CRAFTING D8: UF_Objects saves objects by index. |
| D11 | **Content is data.** The code knows a small set of grade tests (§2.2), tally sources (§7.1) and gate kinds (§6.2), and holds no class, seat or ability names. | WORLD_ARCHITECTURE §1 rule 4. |
| D12 | **A class name never equals a rank name, a labour name or a culture label** that a people able to take the class could show. The `catalog` check tests it against `rank_names.proposal.json` / `command.rankNames`, THEME T11's ladder, `labors.list` and `cultures.*.name`. The names of the swarm's and the star-born's classes, seats and abilities, and of any seat those peoples may build, also avoid PEOPLES §1.1's scoped words (brood, hive, nest, queen, drone, spire, forge, gateway and the rest; PE21). | Both drafts slipped here (§17.3); the review found three more (§19). |
| D13 | **"Adult" and "teen" follow each people's life stages** (PEOPLES §3: kobolds are grown at 5, the star-born at 60, the swarm at "grown", the undead keep the age they died at). CHAIN_OF_COMMAND's `rankAge` (18) applies only to a people with no stage table. | V87: an 18-year rule would keep kobolds (life 20–30) out of classes for most of their lives and let star-born children (child to 30) join. |
| D14 | **Position-dependent class effects are evaluated on beats, never per attack or per frame.** Effects that depend on where a member stands (Shoulder to shoulder, Clutch guard, Tower-light's bonus, Keep the dust) are re-read on ABILITIES' pool sweep (each unit every 10 beats, ABILITIES §9) and on `classes:grade`. A scan for danger near a seat (Omen) runs once per seat every 10 beats. | V50. |

---

## 2. The model

### 2.1 Opening: a building opens the class for the faction
A class `k` is **open** in faction `f` when both hold:
1. **A seat:** `f` owns at least one seat of `k` at grade 1 or better (§2.2).
2. **Faction criteria:** `UF.Tech.meets(f, k.open.requires).ok` is true (TECH_TREE §8.1 returns `{ ok, missing }`; UF_Tech is not built yet). `requires` uses TECH_TREE's vocabulary: `level` (faction Building level), `built` (structures completed, "build N of X"), `members`, `stock`, `classes`, `after`. It is usually empty, because the seat object is already gated by the tech tree (§2.6). It exists for a seat picked up from elsewhere, such as a captured site, which should not open a class early.

A class that loses its last seat **closes**, and its members lapse (§7.4). `UF.Classes.isOpen(f, k)` and `UF.Classes.missing(f, k)` answer for the UI: the missing criteria as text, with numbers.

Whether the faction's *people* may take the class is a separate, fixed rule (§3.2). A class a people can never take is never shown to that faction.

### 2.2 Seats: the seat object, its setting, the grade
- **Seat object:** an object whose id is listed in a grade row's `key`. It is built like any object: a `build` job, the tech tree's permission, and materials. Several key objects in one setting count as one seat, graded by the best.
- **Setting,** per grade row:
  - `room`: the room around the key object (`UF.Rooms.roomAt`, at most 64 cells and 2 gaps), with a door;
  - `yard`: the passable cells within `radius` of the key object, on its level, outside any room;
  - `mound`: the swarm's mound object (PEOPLES §3.11).
- **Grade** is the highest g (1–3) for which the seat meets row g and every lower row. A row is a list of tests, all read from existing state:

  | Test | Reads |
  |---|---|
  | `key: [ids]` | the seat object is one of these (a better key for a better grade) |
  | `cells ≥ n` | the room's interior cells, or the yard's passable cells |
  | `door: true` | the room has at least one door or gap (UF_Floors allows 2). Today's room record is `{ id, area, cells, gaps, siteId }` (`UF_Floors.js` lines 115–117): gaps are listed, doors are not, so the test looks at the barrier cells next to `cells` for one tagged `door` |
  | `floored ≥ f` | `UF.Rooms.value(room)`, the floored share (0–1, V56) |
  | `walls: "later"` | every boundary wall or door of the room carries the material tag (`stone` or `wood`) of the faction culture's `laterWall`: stone for most peoples, wood for elves, goblins and lizardfolk. The merge wrote `"stone"` for every seat, but TECH_TREE §2.3 never lets those three build `wall_stone`, so they could never reach a stone-walled grade (an elf Wizard could not even get a grade-1 tower). **Wherever §4 says "stone walls" or "stone-walled", it means this test.** The boundary is not in the room record; the test walks the 4 neighbours of each of at most 64 cells (`MAX_ROOM_CELLS`), only when a grade is computed |
  | `support: { id or "tag:x": n }` | objects of that id or tag inside the room or yard |
  | `z: n` or `z: [lo, hi]` | the level of the seat object (V80) |
  | `roomBelow: { walls }` | a room directly under it on z − 1, joined by a stair (a tower) |
  | `near: { id or "tag:x", within: n }` | such an object within n cells on the same level (a well, a known wreck heap). No seat tests for a crystal cluster: a crystal that a building needs nearby is the Pylon PEOPLES §1.1 forbids |
  | `stock: { item: n }` | items of that type lying on the room's cells (bones in an ossuary) |
  | `dug: { z, within, cells }` | open floor cells on level z within that many cells, counted through UF_Levels (a pithead) |
  | `members ≥ n` | mound only: the mound's living members (PEOPLES) |

- **Ownership:** the seat object's owner is the faction (V71). A seat owned by one person (a private altar) doesn't count.
- **When a grade is computed:** on `objects:changed(area, x, y, fromId, toId)` (`UF_Objects.js` line 176), `floors:laid` / `floors:removed` (`UF_Floors.js` lines 185 and 192), or a room invalidation inside the seat's bounds, at most once per seat per game minute. The result is cached with a signature of the setting.
- **Finding seat objects** (V50): `objects:changed` with a seat key id as `toId` adds the cell to the saved seat index (§10.3), and one with a seat key id as `fromId` removes it. `UF.Objects.setIn` emits it for every change it makes (`UF_Objects.js` line 176). A change made straight through `UF.World.setObject` emits only `world:objectChanged(area, x, y, typeIndex)` (`UF_World.js` line 532), so UF_Classes also listens to that and drops an index entry whose cell no longer holds a seat key. A load reads the index; it never scans the map. Old saves hold no seat objects (they are new ids), so they start with an empty index.
- **Grade drops** (a wall broken, a bench burnt, a floor torn up) take effect at once. Tiers above the new cap stop working at once (they are computed, D4). Members beyond the new place count lapse, newest first (§7.4).
- **A blocking seat inside a room** needs the UF_Floors fix in §11.8. Today a room holding any blocking object is not a room at all (verified 2026-09-19, `UF_Floors.js` lines 78 and 108).

### 2.3 Places
Each seat gives `places[grade − 1]` places, with `places = [2, 3, 5]` (the mound gives `[1, 2, 3]`). A class's places in a faction are the sum over its seats: more seats give more members ("build N of X gives Y", V77). Each member is attached to one seat (`seatId`), so losing that seat is felt by its own members first.

### 2.4 Tiers
| Tier | Key skill level | Seat grade needed | What it opens |
|---|---|---|---|
| I | the path (at joining) | 1 | the first abilities and the tier-I trait |
| II | 20 | 1 | the second abilities |
| III | 40 | 2 | the third abilities; the branch choice (phase 6) |
| IV | 60 | 2 | the fourth abilities; some tiers also need rank (CL17) |
| V | 80 | 3 | the best abilities; advanced classes open (phase 6) |

`tierOf(unit) = max { t : key(unit) ≥ keyLevel[t] and bestGrade(faction, class) ≥ gradeFor[t] and rank rules of t met }`. It is at least I while the class is held and not lapsed, and 0 when the unit holds no class or the class is lapsed.

- **Why these numbers:** ABILITIES' starter records already sit on them. Its tier-2 abilities need levels 20–30 and its tier-3 abilities levels 45–55 (ABILITIES §7.2). Our own numbers: no OSRS or U7 ladder is copied.
- **The key skill** is one existing skill per class (§4). No new skill is added beyond ABILITIES' devotion (ABILITIES §6.4). The Man-at-arms uses the lowest of attack, strength and defence (`"key": { "min": [...] }`), which rewards balance. The Lodge-mason uses masonry, or carpentry where the culture's `laterWall` is wood (`"key": { "byWall": {...} }`).
- **The training ceiling:** duties that consume nothing (study, drill, practice at the butts, §8.4) raise the key skill only up to `trainMaxLevel` 40, which is tier III. Tiers IV and V need real work: rites with offerings, spells, fights, hunts, crafts. "Drills teach the basics; mastery comes from doing."
- **Pacing** (calculated on 2026-09-19 with UF_Skills' own curve, `UF_Skills.js` lines 78–85, by a Node script; not measured in play). The merge's figures (level 20 in 0.9 game hours, level 40 in 4.4) were wrong by about 60 times; the review recomputed them:

  | Duty (experience per 40 beats) | Level 1 → 20 | Level 1 → 40 | At a 0.3 duty share of 16 work hours a day |
  |---|---|---|---|
  | study, `25 + 2.5 × level` | 56 game hours | 265 game hours | 12 and 55 game days |
  | drill or practice, `12 + level` | 127 game hours | 625 game hours | 26 and 130 game days |

  So duty alone reaches tier II within a couple of weeks of game time and tier III only slowly; drill is a floor for bands that rarely fight, not a route to tier III. An undead raiser needs magic 10 (1,154 experience): 17–21 game hours of study from a starting magic of 3 or 1, about 2 game days at the undead's 0.6 share of 16 work hours. Tiers IV–V come from ordinary work at the pace CRAFTING §3.11 gives. These are catalog numbers (`classes.duty`), and the user may want them faster (CL10).

### 2.5 The rule that keeps levels honest
**Class bonuses never meet a requirement.** Every gate reads the real level through `UF.Skills.level` / `meets`, never an effective level:
- the path;
- tier thresholds;
- TECH_TREE's personal unlocks (recipes, resources, abilities);
- ABILITIES' `source.level`;
- wield and wear levels.

The class traits change only experience rates, work speed, success rolls, yield and UF_Combat's effective levels. This is a deliberate difference from OSRS, where boosts can meet requirements. It keeps "what can this person do?" answerable from the sheet.

### 2.6 The seats on the tech tree (V77, V84)
Every seat and support object is an ordinary buildable object on UF_Tech's tree, so a faction must unlock it before it can build it:
- **Culture permission:** a culture may build a class's seat objects when its people may take the class (§3.2) and that seat is its variant (§3.4). This needs one more source in TECH_TREE's permission rule (§11.1).
- **Nodes:** one small chain per seat kind, in TECH_TREE's own format. The numbers are placeholders for TECH_TREE to own. The pattern is B's "build N of X": a better seat needs lesser seats of its kind built first.

  | Node pattern | Requires (placeholder) | Permits |
  |---|---|---|
  | `<seat>_1` | Building 4–6; a class-specific structure count (below) | the grade-1 key object and its grade-1 support pieces |
  | `<seat>_2` | Building 10; `built: { <grade-1 key>: 1 }` | the grade-2 key and supports |
  | `<seat>_3` | Building 20; `built: { <grade-2 key>: 2 }` | the grade-3 key and supports |

  First nodes, as proposals:
  - `yard_1`: Building 4, a `weapon_rack` built. Permits pell, quintain and archery butt.
  - `temple_1`: Building 5, 12 structures tagged `wall`. Permits the plain altar, bench, candle stand and standing stone.
  - `tower_1`: Building 6, 1 `gem_rough` held (`stock`; mining a `crystal` cluster yields `gem_rough` in the 2026-09-19 catalog, and there is no crystal item yet). Permits the study table.
  - `lens_hall_1`: Building 6, for cultures whose people may take `light`. Permits the light-lens. No crystal-range criterion (PEOPLES §1.1).
  - `ossuary_1`: Building 2 for the `undead` culture only (an override), because raising is how the undead grow (§4.10).

- **Reachability:** TECH_TREE's plan simulation reaches Building 4–5 from each culture's plan alone (TECH_TREE §2.4). So grade-1 seats are reachable early, and grades 2–3 follow the faction's house building. None of this is measured.

---

## 3. The starter set

### 3.1 Overview
Names are the recommended proposals of §15. The data carries `TEST_` names until approval.

| Id | Class (PROPOSAL) | Key skill | Seat (PROPOSAL) · setting | For |
|---|---|---|---|---|
| `faith` | Acolyte | devotion | Temple · room, or Stone ring · yard (the two ways, §3.4) | rites, laying the dead to rest, healing and protective prayers |
| `arcane` | Wizard | magic | Tower · room, rising through +1 and +2 | spells paid with charged shards; light, binding, fire and stone |
| `arms` | Man-at-arms / Woman-at-arms | lowest of attack, strength, defence | Practice yard · yard, then a hall of arms · room | trained melee fighters, the core of V43's soldiers |
| `bow` | Archer | ranged | Archery butts · yard | trained shots for the hunt and the wall |
| `herb` | Herbalist | healing | Still-room · room (an infirmary at grade 2) | remedies and the `tend` job |
| `smith` | Smith | smithing | Smiths' hall · room | better smithing; the only way to the fallen-star metals |
| `mason` | Lodge-mason (stone) / Housewright (wood) | masonry or carpentry by culture | Lodge · room | faster building; a key to the faction's castle pieces |
| `delve` | Prospector | mining | Pithead · yard over a stair down (V80) | finding ore; a key to the sealed deep regions |
| `salvage` | Salvor | mining | Salvage yard · yard near a known wreck | wreck-metal, relic parts and relics (THEME T18) |
| `grave` | Dust-speaker | magic | Ossuary · room, a crypt on −1 at grade 3 | the undead's raisers (PEOPLES §3.9) |
| `light` | Lens-keeper | magic | Lens hall · room, rising through +1 and +2 | the star-born's casters, with inner light |
| `brood` | Mound-tender | magic | The mound · mound | steers what the swarm's mound breeds |
| `clutch` | Clutch-warden | healing | Clutch hall · room (kobolds), or Nesting ground · yard (lizardfolk) (§3.4) | lizardfolk and kobold egg-keeping |

**Later, not in the starter set** (CL2): the Trapper (draft B), waiting for traps (PEOPLES §3.8: "snares when traps exist"); the Seer as a third way of belief (draft B, CL12 C); branches and advanced classes (§7.6).

### 3.2 Which peoples may take which class (CL11)
Following draft A's principle: **restrict only where V87 or PEOPLES states a fact.** Every other combination is allowed, because that invents no lore (V76: differences "cannot invent faction lore"). "✓" is allowed, "V" allowed with an extra seat variant (§3.4), and "–" not allowed. Faith is open to both of its ways for every people that may take it (§3.4).

| Class | human | elf | dwarf | gnome | goblin | orc | lizardfolk | kobold | undead | starborn | swarm |
|---|---|---|---|---|---|---|---|---|---|---|---|
| faith | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| arcane | ✓ | V bower | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| arms | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| bow | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| herb | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – | ✓ | – |
| smith | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| mason | ✓ | ✓ wood | ✓ | ✓ | ✓ wood | ✓ | ✓ wood | ✓ | ✓ | ✓ | – |
| delve | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| salvage | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| grave | – | – | – | – | – | – | – | – | ✓ | – | – |
| light | – | – | – | – | – | – | – | – | – | ✓ | – |
| brood | – | – | – | – | – | – | – | – | – | – | ✓ (workers) |
| clutch | – | – | – | – | – | – | V yard | V room | – | – | – |

Why each restriction:
- **Undead** "do not eat, drink, sleep or bear children, and raise the dead from remains" (V87). They mend with bone at a crypt rather than heal by remedies (PEOPLES §3.9), so there is no Herbalist. Laying the dead to rest is the living's answer to raising (ABILITIES A11), so there is no Acolyte; this one rests on a pending proposal (A11), not on V87, and changes with it. Their own class is the Dust-speaker.
- **The swarm** uses no tools or arms, doesn't talk, and gets its castes by birth (PEOPLES §3.11). No shared class fits. Its one class is the Mound-tender, open to the worker caste only.
- **The star-born** are "crystal, light and mind" (V87). The Lens-keeper is theirs alone, because only they have inner light (ABILITIES §2.3). They may also take the Wizard: the merge barred them from it, but no V87 or PEOPLES fact says so, so the review lifted the bar (CL11).
- **Egg-layers:** lizardfolk and kobolds "hatch from eggs", so they get the Clutch-warden.
- **Wood cultures:** the mason's key skill follows the culture's `laterWall` (§4.7). Elves, goblins and lizardfolk build in wood.
- **Constructs** (the automaton units of PEOPLES §4, `data.construct: true`) never take a class. An old save's automaton faction is people, not constructs (its units lack `data.construct`); it follows the star-born row without `light`.

Stricter matrices are options, not recommendations, because each invents lore (CL11 B): draft B's elves barred from the forge (cold iron, THEME T4 A and PEOPLES PE22, both pending), faith and arcane open to only four peoples, and the merge's split of the faith ways by people (CL12 B).

### 3.3 Culture weights (how much a head wants each class)
These are multipliers on the AI's choice score (§8.3), in catalog `cultures.<id>.classWeights`. A missing key counts as 1. They are read from culture data that exists today (`priorities`, `chainWeights`, the favoured skills), not from lore.

| Culture | Weights |
|---|---|
| human | mason 1.3 (build 1.3). The merge's "faith 1.2" had no data behind it (piety is a faction ethos, `factions.ethos` "pious", read by `calling` in §8.3, not a culture value), so the review dropped it |
| elf | bow 1.5, herb 1.2, smith 0.7 |
| dwarf | smith 1.5, delve 1.5, mason 1.2, bow 0.7 |
| gnome | arcane 1.4, salvage 1.3, mason 1.2 |
| goblin | salvage 1.4, bow 1.3, smith 0.6 |
| orc | arms 1.5, bow 0.8 |
| lizardfolk (PEOPLES: hunt 1.5, favours defence and hitpoints) | clutch 1.5, arms 1.2, bow 1.2 |
| kobold (PEOPLES: mine 1.6, favours ranged) | delve 1.5, clutch 1.3, bow 1.2 |
| undead (PEOPLES: favours defence, magic) | grave 1.5, arms 1.2 |
| starborn (PEOPLES: craft 1.5, favours magic) | light 1.5, salvage 1.3, smith 1.2 |
| swarm | brood 1 (its only class) |

### 3.4 Seat variants per people (data only)
A people can have its own seat for a class under one shared class id (`classes.seats[].peoples`):
- **Faith, the two ways of THEME T21 A** (CL12): the **temple way** (a room around an altar) and the **stone-ring way** (a yard of standing stones). **Both are open to every people that may take faith.** Which one a band builds first is a culture preference in data, `cultures.<id>.seatPrefer: { faith: "stone_ring" }`, read only by the seat-demand step of the class pass (§8.2): elves, orcs and lizardfolk prefer the ring, everyone else the temple. The merge made this split a hard rule by people; THEME T21 A names no peoples, and V76 forbids inventing faction lore, so the review made it a reversible preference and moved the hard split to CL12 B. The ability that differs by way (§4.1 tier III) follows the seat the member is attached to (ABILITIES §2.2 `source.seat`).
- **Arcane, the elves' bower** (from draft B, CL8): grade 2's lens may stand in a wood-walled room on a tree's heavy branches on +1 instead of over a stone room. PEOPLES §3.2 lets elves climb to the trunk and heavy branches on +1 only; the canopy on +2 is not climbable, so the merge's "canopy on +1 or +2" was wrong. Grade 3 is the ordinary tower's. It waits for PE23 (elves climbing) and for building on +1 (VERTICAL_BUILD_PLAN). Elves may always build the ordinary tower instead.
- **Clutch, by people** (PEOPLES §3.7, §3.8): kobold nests must lie within 2 cells of a heat source, so the kobolds' seat is a **Clutch hall**, a room with a hearth or fire. Lizardfolk nests lie on land within 3 cells of water, and PE17 lets a roof or shade decide the hatchlings' sex, so a room would push every clutch one way. Their seat is a **Nesting ground**, a yard, and the seat never requires or forbids a roof: which nests are shaded stays the band's choice.
- Any other culture can get a variant later with no code change.

---

## 4. The classes one by one
Each block gives the seat grades, the path, the key skill, favoured skills and duty, and the unlocks by tier. **Ability ids in `code` are ABILITIES' records** (re-keyed per §6.1). *Italic* entries are new records this file proposes for ABILITIES' list, with working names that are proposals (§15.2). Faction Building levels are TECH_TREE's placeholders (§2.6).

### 4.1 `faith`: Acolyte
- **Seats:**
  - Temple (room): **1** the plain altar (`altar_plain`), in a room of ≥ 12 cells with a door. **2** ≥ 20 cells, floored ≥ 0.5, 2 benches, 2 candle stands. **3** the fine altar (CRAFTING's gold-fitted `altar`, P20), ≥ 30 cells, floored 1, stone walls, 4 benches, a bell.
  - Stone ring (yard, radius 5 around the key stone): **1** 5 standing stones. **2** 8 standing stones. **3** 8 standing stones and a table stone at the centre.
  - This resolves CRAFTING P20: the altar comes with the classes (CL13).
  - `altar_plain`, `altar`, `standing_stone` and `table_stone` carry the tag `altar`, so ABILITIES' `rite` (which targets an object tagged `altar`, ABILITIES §4.5) works at both ways. Which way a band builds first is its culture's `seatPrefer` (§3.4); both are open to it.
- **Path:** healing 5, or foraging 20, or devotion 5 (a lay person who kept rites; ABILITIES A1); and 5 `gathered` tallies; and **clean hands**: no person slain in the last 28 game days.
- **Leaning:** patience, sociability. **Ethos:** pious +0.5.
- **Key:** devotion. **Favoured:** experience in devotion and healing; speed on `rite`, `tend` and remedies.
- **Duty:** rites at its own seat (ABILITIES' `rite` job, with an offering when the band has one), plus laying its band's dead to rest.
- **Temple room:** for ABILITIES' devotion refill (+1 per 20 beats) and its ×1.5 rite experience, a "temple room" is the room of a temple seat of grade ≥ 1, or the yard of a stone ring: `UF.Classes.seatRoomAt(cellRef, "faith")` (§10.5).

| Tier | Abilities | Other |
|---|---|---|
| I | `steadfast_vigil` (devotion 1), `mending_touch` (5), `laying_to_rest` (10) | the tier-I trait |
| II | `oath_fire` (20), `heartening_word` (30); *Comfort* (removes one stress thought from an ally; waits for V94's thoughts) | |
| III | `hallowing` (55; the one hallowing rule, CL26). **Stone-ring way** (`source.seat: "stone_ring"`): *Omen* (from draft B: a spoken warning when a predator or monster is within 20 cells of the ring, plus a forced review; checked once per ring every 10 beats against `UF.Command.threats(area)`, CHAIN_OF_COMMAND's shared threat list, D14). **Temple way** (`source.seat: "temple"`): *Vigil of the dead* (kin of the laid-to-rest get a good thought; waits for V94's thoughts) | branch (phase 6) |
| IV | *Ward* (a blessing on one ally within 5 cells: `damageTaken` of every attack type × 0.85 for 30 beats; 8 devotion; cooldown 60). The merge's Ward was a prayer that cut one chosen attack type to × 0.6: that is OSRS's protection prayers, down to their 40% cut against players, so the review replaced it | |
| V | *Band blessing* (after a dawn rite at a grade-3 seat: band members' experience × 1.05 for a game day) | Prior opens (phase 6) |

### 4.2 `arcane`: Wizard
- **Seats** (Tower, room): **1** a study table in a stone-walled room of ≥ 9 cells, on z ≥ 0. **2** a lens in a stone-walled room of ≥ 9 cells on **z +1**, over a stone room joined by a stair. **3** an orrery in a stone-walled room on **z +2**, floored 1, 2 shelves. The tower is literally a tower: its height is its grade.
  - Elves' bower variant: §3.4.
  - Until building upward exists (VERTICAL_BUILD_PLAN), towers stay at grade 1 and wizards at tier II.
- **Path:** magic 3 and (crafting 5 or mining 10); and 5 `mined` or 5 `made_crafts` tallies. **Leaning:** curiosity. **Ethos:** scholarly +0.5.
- **Key:** magic. **Favoured:** experience in magic and crafting; speed on `charge`.
- **Duty:** study at the seat (magic experience, up to the training ceiling), and charging shards when the stock is low.
- **Reagent:** charged shards (THEME T20 A, ABILITIES §2.3).
  - Every seat object of the tower carries the `charge_stone` tag, so the `charge` job runs there.
  - Trait: at its own seat, a wizard's `charge` makes +1 shard per crystal (from draft A's lens-hall idea).

| Tier | Abilities | Other |
|---|---|---|
| I | `pale_lamp` (magic 1), `star_dart` (1) | study duty |
| II | `rime_fetter` (20), `quenching_mist` (25) | |
| III | `stone_stair` (45), `cinder_bloom` (50) | branch (phase 6) |
| IV | *Seal* (a door opens only for the faction and takes half damage for a game day; V57, V95). A door that only its makers can open is also D&D's *arcane lock* (SRD 5.1, CC-BY-4.0): the mechanic may stay, but the name gets a search (§15.2) | |
| V | *Tower-light* (cast from the tower's +2 room: light radius 12 around the tower all night; allies inside get magic accuracy × 1.10) | Tower-master opens (phase 6) |

### 4.3 `arms`: Man-at-arms / Woman-at-arms
- **Seats:** **1** Practice yard (yard, radius 5 around a pell): 2 pells and a weapon rack. **2** 4 pells and a quintain in a yard of ≥ 30 passable cells. **3** Hall of arms (room): ≥ 24 cells, stone walls, 4 pells, 2 weapon racks.
- **Path:** attack, strength and defence 10 each; and 1 `slew_beast` tally. **Leaning:** bravery; `refuseBelow` bravery 20. **Ethos:** warlike +0.5.
- **Key:** the lowest of attack, strength and defence. **Favoured:** experience in those three and hitpoints; effective levels in attack, strength and defence.
- **Duty:** drill at the pells (experience in the member's style skill, `12 + level` per 40 beats, up to the ceiling). This is V63's "by doing" for bands that rarely fight early.
- **Rank:** tiers IV–V also need rank ≥ 2 (draft A, CL17).

| Tier | Abilities |
|---|---|
| I | `felling_stroke`, `old_scars` |
| II | `set_shield` |
| III | *Onset* (a `special`, shown as a Deed, ABILITIES A9: armed, then spent on the next attack; if the target is 2–3 cells away the member walks to it at its normal pace, since V58 forbids a code-made lunge, and that attack has accuracy × 1.2) |
| IV | *Shoulder to shoulder* (a passive: while a shield-bearing member of its band stands in one of the 8 cells around it, a shield-bearing member gets defence roll × 1.08; re-read on the pool sweep, D14). The merge's name "Hold the line" is a lord ability in Total War: Warhammer (from memory; §15.3) |
| V | – (the Knight-errant opens, phase 6) |

### 4.4 `bow`: Archer
- **Seats** (Archery butts, yard, radius 12, each butt with 6 clear cells in front): **1** 2 butts and a fletcher's bench. **2** 3 butts and a bowyer's bench. **3** 6 butts and a weapon rack.
- **Path:** ranged 10, or hunting 10; and 3 `hunted` or `slew_beast` tallies. **Leaning:** patience, natureAffinity.
- **Key:** ranged. **Favoured:** experience in ranged, fletching and hunting; speed on fletching; success on the hunt strike; yield on hunting; effective ranged level.
- **Duty:** practice at the butts, up to the ceiling. The arrows are picked up again.

| Tier | Abilities | Other |
|---|---|---|
| I | `long_draw` | |
| II | *Track* (from draft B; a passive: the member's hunt search radius is `colony.huntRadius` (45, `UF_Colonists.js` line 102) + 15) | |
| III | – | the fire-arrow recipe, class-gated; fire arrows set flammable objects alight (`UF.Fire.ignite`). CRAFTING has no fire arrow: the recipe is new here and goes to CRAFTING's owner with C1 |
| IV | *Flight of shafts* (a 3 × 3 area; one roll per hostile unit, ABILITIES A5). The merge's name "Volley" is a well-known MMO archer ability (WoW's hunter), the same kind of slip as "Aimed shot" (§15.3) | |
| V | *Sure mark* (a passive: range +2; hunt strike chance × 1.10). The merge's "Keen eye" sat beside OSRS's ranged prayers (Sharp Eye, Hawk Eye, Eagle Eye), which also boost ranged | |

### 4.5 `herb`: Herbalist
- **Seats:** **1** Still-room (room): CRAFTING's herbalist's table (`herb_table`) and 2 objects tagged `bed` (today only `floor_straw` carries the tag). **2** An infirmary: 4 beds, floored 1. **3** Stone walls, 2 shelves, and a well within 10 cells.
- **Path:** healing 10, or foraging 25; and 10 `gathered` tallies. **Leaning:** patience, natureAffinity.
- **Key:** healing. **Favoured:** experience in healing, foraging and farming; speed and success on remedies and `tend`; yield on herb foraging (V98's extra yield; foraging has no success roll under V97).
- **Duty:** tending the band's hurt (CRAFTING §2.11's `tend`), and making remedies when the stock is low.
- ABILITIES' `bind_wounds` stays a skill milestone that needs no class: anyone may bandage.

| Tier | Abilities | Other |
|---|---|---|
| I | *Herb-lore* (a passive: `yieldChance` + 0.05 on the herb plants of CRAFTING §1.6, yarrow, comfrey and betony. The merge's "foraging chance" has no roll to act on under V97) | the `tend` job with remedies |
| II | *Triage* (a passive: the tend AI picks the lowest HP share first, then rank) | the remedies from the betony draught up (healing 26, CRAFTING §2.11) are class-gated (CL19). The merge gated them at tier III (healing 40), which would have moved the draught's own level 26 up to 40 |
| III | – | branch (phase 6) |
| IV | *Green dressing* (an active `technique` trained in healing, like ABILITIES' `bind_wounds`: an ally within 1 cell, heal 12 over 20 beats, costs 1 of CRAFTING's `bandage` (not in the catalog yet), cooldown 20. "Poultice" was dropped as a name: CRAFTING already has the remedy `yarrow_poultice`) | |
| V | *Teacher* (a passive: other Herbalists seated at the same seat get healing experience × 1.25) | |

### 4.6 `smith`: Smith
- **Seats** (Smiths' hall, room): **1** a smithy and a furnace in a stone-walled room (needs the UF_Floors fix, §11.8). **2** plus a quench trough. **3** a second smithy, floored 1, ≥ 24 cells.
- **Path:** smithing 20; and 10 `made_metal` tallies. **Leaning:** industriousness, discipline. **Ethos:** industrious +0.5.
- **Key:** smithing. **Favoured:** experience, speed and success on smithing, including the iron smelt's roll.
- **Duty:** its trade, through commanders' orders weighted by class (§8.5).

| Tier | Unlock |
|---|---|
| I | the trait only |
| II | *Melt down*, a recipe: 2 items of a metal tier give back 1 bar |
| III | thunder-iron (CRAFTING P1's meteoric tier) is worked only by a Smith of tier III or more, as well as at its smithing level (CL19) |
| IV | wreck-metal items at the relic bench only by a Smith of tier IV or more |
| V | *Maker's mark* (a passive: the items it makes carry `madeBy`; the look names the maker; the chronicle notes a top-tier piece; no quality roll, V66) |

### 4.7 `mason`: Lodge-mason (stone cultures) / Housewright (wood cultures)
- **Seats** (Lodge, room): **1** CRAFTING's mason's bench (wood: the carpenter's bench). **2** 2 shelves, floored 1. **3** ≥ 40 cells and a statue or pillar. Stone cultures also need stone walls.
- **Key:** masonry, or carpentry where the culture's `laterWall` is wood. On the 2026-09-19 catalog and PEOPLES' new blocks, that is elves, goblins and lizardfolk.
- **Path:** the key skill 10; and 5 `built_stone` tallies (wood: `built_wood`).
- **Favoured:** experience in masonry and carpentry; speed on `build` and `floor` of structures of the key's material; **faction Building experience** from this member's construction × (1 + 0.05 × tier).
- **Unlocks, as faction tech criteria** (§6.3; draft A's link, not draft B's personal gate):
  - II: building on +1, if the user makes vertical access earned (TECH_TREE D8, CL20);
  - III: the castle wall node;
  - IV: the castle gate node, and building on +2 (same condition);
  - V: the relic bench at a lower Building level than CRAFTING's 65 (TECH_TREE's number).

### 4.8 `delve`: Prospector
- **Seats** (Pithead, yard of radius 16 around a stair from z 0 down to −1, V80): **1** ≥ 20 open cells dug on −1 within 16. **2** ≥ 60 cells dug, and an ore stockpile on −1 within 16. **3** a stair from −1 on to −2 within 16.
- **Path:** mining 20; and 20 `mined` tallies. **Leaning:** discipline, bravery.
- **Key:** mining. **Favoured:** experience in mining; speed on `mine`, `quarry` and `dig` (under V97 the speed is the damage per beat on the object's HP); yield on mining. The merge's "success on ore" was dropped: V97 replaced gathering attempts with HP, so there is no roll to improve.
- Kobolds' ore-sense (PEOPLES PE18) is a people trait and stacks with nothing here.

| Tier | Unlock |
|---|---|
| I | *Sound the rock* (terrain `reveal` of ore within 10 cells, on its own level). The merge's "Prospect" is OSRS's own right-click option on rocks, with the same purpose |
| II | – |
| III | *Deep sense* (the same, on the level below) |
| IV | the faction may open the sealed deep regions of −2 (VERTICAL_WORLD's gates), as a tech criterion |
| V | *Follow the vein* (a passive: +1 ore from each ore object it works down to 0 HP, on top of V98's yield for the whole HP bar) |

### 4.9 `salvage`: Salvor
- Needs wrecks (THEME T16 B, pending) and CRAFTING's `salvage` action (D14).
- **Seats** (Salvage yard, yard of radius 6 within 40 cells of a known wreck heap): **1** a salvage rack and a stockpile. **2** the relic bench in the yard. **3** the relic bench inside a stone-walled room in the yard.
- **Path:** mining 10, or crafting 15; and 10 `mined` tallies. The merge asked for 1 `salvaged` tally, but tier II makes salvaging wreck heaps a Salvor's work (CL19), so nobody could earn that tally before joining: a circle. Salvaging itself needs mining 66 (CRAFTING §1.2.1), so in practice a Salvor salvages from tier IV (mining 60) on, or at tier II under a grade-1 seat once its mining reaches 66.
- **Key:** mining (CRAFTING D14: salvage uses mining). **Favoured:** experience in mining and crafting; speed and yield on `salvage` only (a wreck heap is object work, V97: no success roll).

| Tier | Unlock |
|---|---|
| I | *Read the old works* (the look view shows what a relic does, THEME T18) |
| II | wreck-metal heaps are salvaged only by Salvors (CL19) |
| III | *Quiet the sentinel* (a wreck's sentinel stays passive for a game hour, THEME T14) |
| IV | cutting wreck-metal and starcloth at the relic bench only by a Salvor of tier IV or more |
| V | *Restore* (3 relic parts make 1 working relic of a kind the world holds; the user decides which, THEME T18) |

### 4.10 `grave`: Dust-speaker (undead only)
- **Seats** (Ossuary, room): **1** a bone niche in a room of ≥ 6 cells with ≥ 10 bones lying in it. **2** ≥ 20 cells, ≥ 40 bones, stone walls. **3** on z −1 (a crypt), 2 niches, ≥ 100 bones.
  - The seat's room counts as PEOPLES' crypt, where the undead mend with bone.
  - Its first node is at Building 2 for the undead culture (§2.6).
- **Path:** magic 3 and crafting 5; and 3 `made_crafts` tallies. **Leaning:** patience, discipline.
- **Key:** magic. **Favoured:** experience in magic and crafting; effective magic level.
- **Duty:** study at the ossuary, at a doubled share (the undead don't sleep, eat or drink).
- **Raising stays PEOPLES' act** (PE13): any undead with magic 10 may raise, and binds 1 + floor(magic / 10) risen. The class makes an undead band's raiser: the study duty takes magic from its starting 1–3 to 10.

| Tier | Unlock |
|---|---|
| I | `wake_the_bones` (ABILITIES; magic 15; its summons take bonds from PEOPLES' one bond cap, ABILITIES #22); *Keep the dust* (remains in the seat room don't rot, UF_Remains; re-read on `classes:grade` and on the remains' own decay step, D14) |
| II | raises at full speed; non-members raise at a quarter (CL21) |
| III | *Bone-work* (bone recipes at +15% speed) |
| IV | +1 bond (one more risen bound) |
| V | *Grave ward* (a passive: the risen bound to this member get defence roll × 1.10. The merge tied it to "a rite", but rites are the devotion refill at an altar and an ossuary has none) |

### 4.11 `light`: Lens-keeper (star-born only)
- **Seats** (Lens hall, room): **1** a light-lens in a stone-walled room of ≥ 9 cells. **2** the lens on z +1, floored 1. **3** on z +2, floored 1, 2 shelves. The merge required crystal clusters within 20 cells for grades 1 and 3. That is a crystal that powers a nearby building, the Pylon that PEOPLES §1.1 and PE16 forbid ("crystals are natural and never power anything built"), so the review removed it. Height is the grade, as for the tower.
  - Its room is "the star-born's own building" where ABILITIES' inner light refills to full.
- **Path:** magic 3 and crafting 10; and 5 `made_crafts` tallies. **Leaning:** curiosity, discipline.
- **Key:** magic. **Favoured:** experience in magic and crafting; effective magic level. **Pool:** inner light (ABILITIES).
- **Constructs stay PEOPLES' act** (PE16): made at the relic bench by a star-born with crafting 40, or woken at wrecks.

| Tier | Unlock |
|---|---|
| I | `light_ward` |
| II | *Still the mind* (a person or beast drops its target and seeks none for 8 beats: a `modify` flag `noSeek`, read by UF_Combat's `seek`; gated by a magic accuracy roll) |
| III | *Calm* (a non-monster beast turns indifferent for a game hour: a `modify` flag `calm`, read by UF_Wildlife's stance choice; both flags are new rows in ABILITIES §2.6) |
| IV | +1 to the band's construct cap per Lens-keeper of tier IV or more (CL23) |
| V | *Wide light* (a passive: the keeper's own faint self-light, PEOPLES §3.10, reaches radius 3 instead of 1; waits for the light model). The merge's *Grow crystal* made crystal clusters by an act of the band, and PEOPLES §3.10 says clusters are natural and never built, so the review replaced it |

### 4.12 `brood`: Mound-tender (swarm workers only)
- **Seat:** the mound (PEOPLES §3.11). **1** the mound. **2** ≥ 20 members. **3** ≥ 30 members. Places `[1, 2, 3]`.
- **Path:** a grown worker (PEOPLES caste) that has spent a game day in the mound. The swarm doesn't talk, so the word is the Dam's (the band's head) and is not spoken.
- **Key:** magic (ABILITIES trains swarm abilities in magic). **Pool:** the swarm's store, id `flesh` (ABILITIES §2.3; its display name is proposed there).
- **Castes stay PEOPLES' rule:** the mound chooses each egg's caste by its needs. The Mound-tender only breaks ties between needs.
- **No speech:** the swarm doesn't talk (PEOPLES §3.11), so a Mound-tender says no induction line and no tier-up remark (CL28 excludes it).

| Tier | Unlock |
|---|---|
| I | `alarm_scent` (ABILITIES #23; it replaces ABILITIES' first `brood_call`, see ABILITIES §7.2) |
| II | *Steer the laying* (once per game day, when the mound's needs call for two or more castes at once, the tender picks which the next egg is; never a caste the needs don't call for, and never one the mound hasn't adapted to. The merge let the tender pick any unlocked caste, which overrode PEOPLES' needs rule, and its name used "brood", a word PEOPLES §1.1 bans for the swarm's own names) |
| III | nymphs mature 25% sooner in a mound with a tier-III tender |
| IV | adapting (PE14) counts the tender's mound's tally at × 1.5 toward caste unlocks |
| V | the Dam may lay 4 eggs a day instead of 3 |

All of these wait for PEOPLES wave 2.

### 4.13 `clutch`: Clutch-warden (lizardfolk and kobolds)
- **Seats** (two variants, §3.4):
  - Kobolds, **Clutch hall** (room): **1** 2 nests (PEOPLES' object) and an object tagged `heat` in a room; each nest within 2 cells of heat is PEOPLES' own rule. **2** 4 nests. **3** 6 nests and stone walls.
  - Lizardfolk, **Nesting ground** (yard, radius 5 around a nest; the nests lie on land within 3 cells of water, where PEOPLES §3.7 places them): **1** 2 nests. **2** 4 nests. **3** 6 nests and a campfire in the yard (their warmth need). No roof test either way (PE17).
- **Path:** healing 5 or defence 10; and 3 `gathered` or `hunted` tallies. **Leaning:** patience.
- **Key:** healing (care of the young; no new skill, ABILITIES §6.4; draft A's husbandry is CL4 B). **Favoured:** experience in healing and defence.
- **Duty:** nest duty at the seat. PEOPLES has an adult stand nest duty "the way a soldier stands guard", and the Clutch-warden is the one who does it best.

| Tier | Unlock |
|---|---|
| I | *Turn the eggs* (a nest with a warden within 6 cells loses no egg to neglect) |
| II | *Warm the clutch* (kobold eggs away from heat are lost at half PEOPLES' rate; lizardfolk eggs in a nest the warden tends hatch after × 0.85 of the incubation. The merge's "lose no egg to cold biomes" named a rule PEOPLES doesn't have) |
| III | *Read the clutch* (the look shows each egg's hatchling's strongest favoured skill) |
| IV | hatchlings of the hall start with +2 levels in one of the culture's favoured skills |
| V | *Clutch guard* (a passive: the band's members inside the seat's room or yard get defence roll × 1.10; re-read on the pool sweep, D14) |

All of these wait for PEOPLES wave 1 (eggs and nests).

---

## 5. Enhancements: the class trait

### 5.1 Numbers (our own; catalog `classes.trait`)
| Stat (ABILITIES §2.6 `modify`) | Per tier t | At tier V | Applies to the class's |
|---|---|---|---|
| `xpMul.<skill>` | × (1 + 0.04 t) | × 1.20 | `favoured.xp` skills |
| `perkSpeed.<jobType or skill>` | × (1 + 0.03 t) | × 1.15 | `favoured.speed` |
| `chanceMul.<jobType>` (attempt actions: since V97 only the hunt strike and fishing; work on an object has HP, not attempts) | × (1 + 0.02 t) | × 1.10 | `favoured.success` |
| `perkFail.<skill>` (progress actions) | × (1 − 0.08 t) | × 0.60 | `favoured.success` |
| `yieldChance.<jobType>` | + 0.01 t | + 0.05 | `favoured.yield` |
| `level.<combat skill>` (mode `add`) | + t | + 5 | `favoured.combat` |
| `factionXpMul.building` (new stat, now in ABILITIES §2.6; §11.2) | × (1 + 0.05 t) | × 1.25 | the mason only |

- **Written as data:** the catalog tool writes one `passive` record per class, `source: { class, tier: 1 }`, `name: "TEST_<Class> trait"`. Its `modify` values are `{ "perTier": 0.04 }` and the like, which UF_Abilities resolves with `UF.Classes.tierOf`. ABILITIES §2.6 now allows `modify.value` to be `{ base, perTier }` (added in this review; the pattern its `heal.amount` already uses with `perLevel`). The fallback, if ABILITIES' builder prefers, is five records per class, one per tier, with `stack: "strongest"`.
- **Off while lapsed:** a lapsed member has `tierOf` 0, so it knows none of these (ABILITIES §3.1 recomputes on `classes:changed`).
- **Never a requirement** (§2.5).

### 5.2 Worked examples (calculated, not measured)
- **A tier-III Smith at smithing 30** crafting steel: speed × 1.09 over its level rate; experience × 1.12; a progress failure chance (V85) × 0.76. The recipe's level gate still reads 30.
- **A tier-II Man-at-arms** with attack 20, strength 18 and defence 15 in the aggressive style: effective strength = 18 + 3 (style, `UF_Combat.js` line 66) + 2 (class) + 8 = 31, against 29 without the class. The unrounded max hit rises by about 7%, but `maxHitFor` rounds (`UF_Combat.js` line 409): with no strength bonus it is 3 either way, and with a bonus of 20 it is 4 either way. The class's +1 per tier shows in low-level fights mostly through accuracy, and in max hit only at higher levels or tiers. The display level and the combat level are unchanged.
- **A tier-I Wizard at magic 3** knows `pale_lamp` and `star_dart` and nothing more. Nothing lets it cast `rime_fetter` (magic 20) early.

---

## 6. Unlocks

### 6.1 Abilities: the re-key of ABILITIES' working ids
Done in ABILITIES.md in this review (2026-09-19): its records now name these class ids, and its §7.1 records the old working ids. The table stays as the map between the two.

| ABILITIES working id (before the review) | Class here | Records |
|---|---|---|
| `acolyte` | `faith` | 1–6 |
| `wizard` | `arcane` | 7–12 |
| `martial` | `arms` | 13–15 |
| `archer` | `bow` | 16 |
| `crafter` | none: `sure_hands` is now a crafting-30 skill milestone with no class (ABILITIES A1 allows milestones) | 17 |
| `starborn_adept` | `light` | 21 |
| `undead_raiser` | `grave` | 22 |
| `swarm_brooder` | `brood` | 23 (now `alarm_scent`: ABILITIES' first `brood_call`, a timed summon of "brood", was StarCraft's broodlings, ABILITIES §7.2) |

ABILITIES' tier numbers stay as they are. They already fit §2.4's thresholds, which is why those thresholds were chosen. The new records in §4 (in italics) go to ABILITIES' list at the build, with `TEST_` names, and pass its `catalog_valid`. Two of them need fields ABILITIES gained in this review: `source.seat` (Omen, Vigil of the dead) and the `noSeek` and `calm` flags (Still the mind, Calm).

### 6.2 Work only members may do (personal gates, CL19)
A small catalog list `classes.gates`, checked as a fourth step of `UF.Tech.canWork` (culture → faction unlock → personal level → **class**, §11.1):

| Gate | Class · tier | Reason text |
|---|---|---|
| `recipe:` thunder-iron items | smith III | "needs a TEST_Smith of tier III" |
| `recipe:` wreck-metal items | smith IV | same pattern |
| `recipe:cut_relic` (smithing 72) | smith IV **or** salvage IV (`anyOf`) | "needs a TEST_Smith or a TEST_Salvor of tier IV" |
| `recipe:` starcloth (crafting 66) | salvage IV | |
| `action:salvage` on wreck heaps | salvage II | |
| `recipe:` remedies from the betony draught up (healing 26) | herb II (the merge said III, above the draught's own level) | |
| `recipe:` fire arrows | bow III | |
| `recipe:` melt down | smith II | |

A gate names one `class` and `tier`, or `anyOf: [{ class, tier }]`. Every class gate sits at or below the level the work already needs, so a gate never raises a CRAFTING level: thunder-iron 53 ≥ tier III's 40, wreck-metal 72 and `cut_relic` 72 ≥ tier IV's 60, starcloth 66 ≥ 60, salvage 66 ≥ tier II's 20, the betony draught 26 ≥ tier II's 20. Anyone below the gate passes the job over, and the next qualified person takes it (TECH_TREE's `take` dry run). The right-click menu names who qualifies, as TECH_TREE §2.6 does for levels.

### 6.3 Classes as faction tech criteria (V77)
TECH_TREE already accepts `requires.classes: { classId: { tier, count } }`, read through `UF.Classes.count(fid, classId, minTier)`. That count covers members that are not lapsed and have a tier of at least `minTier`. Proposed uses (CL20):
- the castle wall node needs a mason of tier III, and the castle gate a mason of tier IV;
- opening the sealed deep regions of −2 needs a Prospector of tier IV;
- building on +1 and +2 needs a mason of tier II or IV, only if TECH_TREE D8 makes vertical access earned.

So buildings open classes, and classes open further buildings. The Unlocks view shows the class criterion with the others.

### 6.4 The peoples' own acts
The owner is always PEOPLES. The class only speeds or strengthens an act:
- raising (grave);
- constructs (light);
- the brood's castes (brood);
- nests and eggs (clutch).

Until each act exists, its row shows "waits for <system>" on the sheet and in the Classes page, and the ability isn't offered.

---

## 7. Joining, the word, leaving

### 7.1 Tallies
A tally is a counter on the person (`unit.data.tallies`). UF_Classes counts them from events that exist on 2026-09-19. Each job is counted once, and a hunt counts on `jobs:kill` only, never also on `jobs:done`.

| Tally | Counted on | Filter |
|---|---|---|
| `hunted` | `jobs:kill(job, prey, hunter)` | a person hunter |
| `slew_beast` | `combat:kill({ attacker, target })` (`UF_Combat.js` line 654; `attacker` may be null) | a person attacker; target kind predator or monster |
| `slew_person` | the same event | a person attacker; target is a person; stamps `lastSlewPerson` (game minute) |
| `made_metal`, `made_crafts`, `cooked` | `jobs:done` of `craft` | the recipe's skill is smithing, crafting or cooking |
| `built_stone`, `built_wood` | `jobs:done` of `build` | the object has the tag `stone` or `wood` |
| `mined` | `jobs:done` of `mine`, `quarry` (UF_Jobs' object actions) and `dig` (UF_Interact's job) | – |
| `gathered` | `jobs:done` of `gather`, `pick` | – |
| `salvaged`, `tended`, `buried`, `hatched`, `raised` | later systems (CRAFTING, REMAINS, PEOPLES) | shown as "waits for <system>" until their events exist |

### 7.2 Who can join: `canJoin(unit, classId)` → `{ ok, reason, aspirant }`
Checked in order. The first failure is the reason, and the sheet shows it.
1. A person (not a construct) who is grown by its people's life stages (D13; `rankAge` 18 only for a people with no stage table), and has been in the band at least 1 game day.
2. Its people may take the class (§3.2).
3. It holds no class; it is not within `changeDays` (7) of leaving one; the player hasn't refused it (§7.3).
4. **The path:** one alternative's real skill levels (`UF.Skills.meets`) and every tally count. Example reason: "needs healing 5 or foraging 20 (has 3, 12)".
5. Rank, where the class or tier sets `rankMin`.
6. The class-specific rule, if any (faith: clean hands).
7. **The class is open** (§2.1) and a seat has a free place. Example reasons: "needs a TEST_Temple", "the TEST_Temple is full (2 of 2)".

A person who passes 1–6 but fails 7 is an **aspirant** (`data.aspires` = the class with its best score, §8.3), as long as the missing seat is one its faction may build now (`UF.Tech.allows`). A person whose missing seat isn't unlocked yet stays "on the path", which the sheet shows.

### 7.3 The word and the induction
1. **The head's class pass** (§8.2) picks a candidate and a seat.
2. **The confirmer** is the first member up the candidate's chain (`UF.Command.chainOf`) whose rank is at least the class's `word`: 2 for base classes, `"head"` for advanced classes. In practice that is the candidate's own commander, so a line names only the speaker's own group (CHAIN_OF_COMMAND §5.1). In a band of one, the head gives the word to itself.
3. **The order:** `UF.Command.give(candidate, { kind: "induct", anchor: seatCell, thing: <class name>, count: 1 }, { by: confirmer })`. The confirmer speaks one line, kind `order` (≤ 40 characters, templates in §9.4).
4. **The induction** is a job of type `induct`. The candidate walks to a cell beside the seat object and works `inductBeats` (60) there, playing work frames, or cast frames for a casting class (`data.casting`). Survival and danger come first (CHAIN_OF_COMMAND §4.1).
   - On completion, `join()` sets `data.class`, emits `classes:joined` and `classes:changed`, and writes a chronicle line when this is the faction's first of that class. The new member says one line, kind `remark` (not the swarm, which doesn't talk).
   - An induction not done within `inductTimeoutDays` (2) is dropped.
   - The job is not a skill job (`UF.Skills.mapJob("induct", null)`).
5. **The player's band:** the head decides, as in every band (V52). The Classes page (§9.3) lets the player:
   - **Assign** a candidate: a direct order with `by: "player"`, which the head never undoes;
   - **Refuse** a candidate: the head won't pick that person for 7 game days;
   - **Hold** a class: no new inductions until lifted;
   - **Release** a member: it leaves;
   - switch **"Appointments: the head / mine only"** (draft A's mode). With "mine only", the head's pass only **suggests**, and the suggestions are shown on the page and the seat panel.

### 7.4 Lapse, leave, change
- **Lapse** (`data.class.lapsedAt` set) when:
  - a member's seat is destroyed, ruined, loses its room or leaves the faction's ownership, and no free place exists at another seat of the class (the member is moved to one if it exists);
  - places fall below members (the newest lapse first: `since`, then unit id);
  - the member changes faction (a V42 split) and the new faction has no free place.
- **While lapsed:** `tierOf` is 0, so there are no traits, no abilities and no duty. The key skill keeps every point. The sheet says "Lapsed: no place at a TEST_Temple (5 days left)".
- **Restore:** when a place frees within `lapseDays` (7), the member is reattached with no new induction.
- **Leave** when:
  - `lapseDays` run out (end `lapsed`);
  - the player chooses Release (end `released`);
  - the member takes an advanced class (end `advanced`);
  - death (end `died`);
  - later, its own choice when its calling for the class falls below −1. V94's personality build may move facets, so this is a later rule.
- **On leaving:** `data.class` becomes null, and `data.classPast` gains `{ id, from, to, tierMax, end, branch }` (at most 6 kept). Toggled prayers and effects of the class stop (UF_Abilities on `classes:changed`). **No experience is lost** (V63). `classes:left` fires.
- **Change:** a member must leave first, then wait `changeDays` (7) before another induction. Coming back to a former class brings back the tier its key skill and the seat allow, and the old branch from `classPast`.
- **Death:** a member of tier II or more gets a chronicle line, `class_lost`, beside UF_Skills' death line.

### 7.5 Novices (CL18)
A teen by its people's life stages (D13; 12–17 for humans) whose parent or commander holds a class can be that class's **novice** (`data.novice`). It gets key-skill experience × 1.25 while it works a duty beside a member, has no abilities, needs no place, and joins through the normal gates once grown. Peoples with no teen stage (the swarm, the undead) have no novices.

### 7.6 Branches and advanced classes (phase 6, CL24; from draft B)
- **Branches** at tier III, two per class where the data names them. Non-player bands take the higher leaning. The player's band is asked on the Classes page, and the higher leaning is the default after a game day. The branch is stored in `data.class.branch`. Examples, with names as proposals:
  - faith: mending or warding;
  - arcane: war or star-reading;
  - arms: holdfast or vanguard;
  - herb: physician or midwife (Midwife waits for birth risk, V26).
- **Advanced classes** replace their base class and keep its key skill and tier:

  | Advanced (PROPOSAL) | From | Milestones | Seat | Word | Adds |
  |---|---|---|---|---|---|
  | Knight-errant (CL13) | arms | arms tier III; rank ≥ 2; 3 `slew_beast` tallies; faction Building 40 | a grade-3 hall of arms | the head | effective levels +6; a squad it leads gets accuracy +2 levels |
  | Prior / Prioress (a real monastic office: under THEME T21 A, "no real-world religion's names", option 3 Temple-elder fits better, §15.1) | faith | faith tier IV; the faction holds 2 grade-2 temples | a grade-3 temple | the head | +1 place at every temple; the band's rites give +10%; one per faction |
  | Tower-master / Tower-mistress | arcane | arcane tier V; the tower's grade-3 room built by a mason of tier III | the orrery | the head | spells cost a shard every second cast; Wizards in its tower get magic experience × 1.10 |

---

## 8. What the AI does

### 8.1 Where it runs
UF_Classes adds a **class pass** to the head's review. The review runs every 10 game minutes per band, at the band's own slot (CHAIN_OF_COMMAND §3.1), through a new `UF.Command.addReviewStep(fn(fid, tasks))`. The pass runs before the commanders hand out orders. It reads only state, the catalog and the seed; ties go to seniority, then unit id. Nothing runs per frame (V50). Other factions run the same code (V51); off-screen bands run it at their lower cadence (V80).

### 8.2 The class pass (per band)
1. **Seats:** `seats(fid)`, each with its grade and places. The list is cached and invalidated only by the seat events of §2.2.
2. **Members:** lapse or restore each member (§7.4).
3. **Aspirants:** each adult without a class is checked with `canJoin` for every class its people may take. The best-scoring class it qualifies for, or aspires to, is stored in `data.aspires`. Adults are checked 3 per review in rotation, not all at once.
4. **Induction:** at most `ritesPerReview` (1) per band per review and `ritesPerDay` (2) per band per game day. The `induct` order has weight `induct` 62: below the player's designations (100) and band focus (80) and a tired member's rest (65) (CHAIN_OF_COMMAND §3.2), so the head's class wishes never outrank the player's orders (V52). The merge had 90, above the player's focus. In a band with fewer than `smallBand` (12) adults, at most `smallBandShare` (0.5) of the adults may hold classes (draft A's K14). The pass takes the best (seat, candidate) pair by score (§8.3), skips classes on hold, and has the confirmer give the `induct` order (§7.3). With "mine only", it records a suggestion instead.
5. **Seat demand:** a class with an aspirant and no seat, or with 2 or more aspirants and no free place, adds one `build` task for its next grade-1 seat. That needs the seat object allowed by `UF.Tech.allows`. For faith, the seat kind is the culture's `seatPrefer` when it is allowed, else the other way (§3.4). The task has weight `seatBuild` 30: below guard (120), rest (65–70), the society's house builds (60), cooking (55), food when short (40–70) and the plan's first three steps (50, 45, 40 × the culture's build priority), and below hauling (35). The merge's 45 sat above food and the plan's third step while its own text said "below food and shelter". The room is built with the band's house plan (UF_Society rooms; UF_Society.js is the bands run's new plugin, not built yet), with the seat object as the room's last piece.
6. **Upgrades:** when every place of a class is taken, or a member's tier is held back by the seat grade, and the next grade's objects are allowed, the pass adds a task to build them (weight `seatUpgrade` 20).

### 8.3 The choice score (draft A's need, draft B's calling)
```
score(u, k) = cultureWeight[k] × need(k) × keep(u) × (1 + (key(u, k) − 1) / 50) × (1 + 0.5 × calling(u, k))
calling(u, k) = clamp( Σ_f k.leaning[f] × (facet_f − 50) / 50  +  k.ethos[faction ethos] , −1, 1 )
```
- `cultureWeight` comes from §3.3.
- `need(k)`:
  - herb × 2 while anyone in the band is under half HP;
  - arms and bow × 1.5 while CHAIN_OF_COMMAND's threat list is not empty;
  - faith × 1.5 for 3 game days after a band member's death;
  - grave × 2 while an undead band has no member with magic ≥ 10 (PEOPLES: the band's first task is a raiser);
  - otherwise 1.
- `keep(u)` = 0.3 for the band's only member with foraging, hunting or fishing ≥ 10 while food is short (CHAIN_OF_COMMAND §3.2's food test), so the last good provider stays on the work.
- A person below a class's `refuseBelow` facet never aspires to it.
- The facets are catalog `colony.facets`; V94's personality build will extend them, and this score reads whatever facets exist.

### 8.4 Duty
- A member with no order, in work hours, with its needs above their thresholds, takes its **duty** as the first of its own choices (CHAIN_OF_COMMAND §4.1, after orders). It is registered as a decider in the `afterSurvival` slot, after UF_Command's order decider, and returns null when the member has an order.
- **Share:** `duty.share` 0.3 of its work-hour beats per game day. Peoples without the sleep, hunger and thirst needs (the undead) get `shareNoNeeds` 0.6.
- **Kinds:**
  - `rite` (faith, ABILITIES' job at the seat's altar or stones);
  - `study` (arcane, grave, light): 40 beats, magic experience `25 + 2.5 × level`, only below the ceiling;
  - `drill` (arms): 40 beats, style-skill experience `12 + level`, below the ceiling;
  - `practice` (bow): the same numbers for ranged;
  - `charge` (arcane, ABILITIES) when the shard stock is below target;
  - `tend` (herb);
  - `nest` (clutch);
  - the trade itself (smith, mason, delve, salvage).
- Study, drill and practice are new experience sources. They are listed here, in ABILITIES §6.2's table for magic (added in this review), and must be added to UF_Skills' contract (`docs/systems/UF_Skills.md`) at the build (§11.2).
- **Commanders' duty orders:** a commander may also give a `duty` order (weight 40) when the band isn't short of food.

### 8.5 Orders to class members
When a commander scores a member for a task kind (CHAIN_OF_COMMAND §3.3), the score gets × (1 + 0.1 × tier) when the kind is the class's favoured work. CHAIN_OF_COMMAND's score formula has no hook for this; it needs a new `UF.Command.addScoreFactor(fn(member, task) → factor)` (§11.4). Examples: `craft` of a smithing recipe for a Smith, `quarry` for a Prospector, `build` for a mason, `hunt` for an Archer.

### 8.6 Abilities
ABILITIES §4 owns the ability AI: the combat choice, the support scan, the upkeep jobs (`rite`, `charge`, `fetch`, `consume`) and the player's policy. Class-specific triggers go into the records' `ai` hints. For example, a Prospector casts Sound the rock on arriving in an unprospected block of 10 cells, and a faith member uses Comfort on a stressed ally within 10 cells. UF_Classes adds no second AI for abilities.

### 8.7 Cost budget (V50; to be measured by the `perf` check, not measured yet)
- **Class pass:** ≤ 0.3 ms per band review (at most one review per game minute across bands).
- **Grades:** only on events inside a seat's bounds, at most once per seat per game minute, from `UF.Rooms`' cached room.
- **Tallies:** one counter write per event.
- **Duty decider:** one field check without a class.
- **Position-dependent effects** (D14): re-read on ABILITIES' pool sweep, a tenth of the units per beat, each reading at most its band's members (≤ 20) or one cached room. **Omen:** one pass over `UF.Command.threats(area)` (CHAIN_OF_COMMAND §6.5, already computed for the review) per stone ring every 10 beats. Nothing per attack, nothing per frame.
- **Average:** UF_Classes' own work ≤ 0.05 ms per frame on average at ×8 over 60 s, with the New Game bands, one test seat per band and two aspirants each. No single map update above 2 ms.

---

## 9. What the player sees

### 9.1 The sheet (`UF.Sheet.addUnitLines`, CHAIN_OF_COMMAND §6.3)
| Who | Lines |
|---|---|
| A member | `Class: TEST_Acolyte, tier II (devotion 27)` · `Seat: TEST_Temple (grade 2), 14 cells NE: tiers up to IV` · `Next: tier III at devotion 40` · `Inducted by: <R2> Wenna, day 12` |
| … held back by the seat | `Next: tier III needs a grade-2 TEST_Temple (20 cells, half floored, 2 benches, 2 candle stands)` |
| … lapsed | `Lapsed: no place at a TEST_Temple (5 days left)` |
| An aspirant | `Aspires to: TEST_Wizard: needs a TEST_Tower (study table)` |
| On a path, nothing open | `Nearest class: TEST_Archer (ranged 7 of 10, 1 of 3 hunts)` (the player's band only) |
| A novice | `Novice of the TEST_Smith (under 18)` |
| Anyone | `Past classes: TEST_Archer (tier II), days 3–40` |

Pools, the abilities list and the bar are ABILITIES' (§5.3 there). Strangers show only `Class:` (V49).

### 9.2 The seat panel (`UF.Sheet.addObjectLines`, new, §11.5)
Shown when a seat object is selected (V59):
- `TEST_Temple · grade 2 of 3 · The Valgarde Kingdom`
- `Opens: TEST_Acolyte, tiers I–IV (tier V needs grade 3)`
- **Next grade:** each missing test with its numbers: `Stone walls (3 of 18 pieces)` · `Floored 100% (18 of 30 cells)` · `4 benches (2)` · `A bell (0)`.
- **Places 3:** `Wenna, tier II · devotion 27` · `Tamsin, tier I · devotion 9` · `— open`; with "mine only": `Suggested: Dorar`.
- **Buttons** (the player's own faction): Assign…, Release.
- Other factions' seats show the header and the number of places taken, read-only.

### 9.3 The Classes page
A second page of TECH_TREE's Unlocks view (key U; Tab turns pages), so no new key is needed. The fallback, if the tech build lands without pages, is a "Classes…" option on the player's head, the same wrap UF_Command uses for "Band orders…". One block per class the faction's people may take:
```
TEST_Acolyte   open · 2 seats · 4 of 5 places · best grade 2 (tiers up to IV)          [Hold]
  Wenna      tier II   devotion 27                                                 [Release]
  aspirants: Tamsin (score 1.8)                                                     [Assign] [Refuse]
TEST_Wizard    closed · needs a TEST_Tower (study table: unlocked) · aspirants: Ysise
TEST_Salvor    locked · needs a known wreck, Building 10 (you have 7)
```
Plus one line: `Appointments: the head [mine only]`.

### 9.4 Speech (V62, V92; catalog `classes.lines`, our own wording, ≤ 40 characters, variant by `hash32(seed, 0xc1a5, orderId)`)
| When | Speaker · kind | Lines |
|---|---|---|
| Induction order | the confirmer · `order` | "{name}, go to the {seat} and be taken in." · "{name}, the {seat} is ready for you." |
| Inducted | the new member · `remark` | "I will serve the {seat}." · "I'll do my part." |
| Released | the confirmer · `order` | "{name}, your service there is done." |
| Tier up (CL28) | the member · `remark` (not the swarm) | "I'm surer at the {seat} now." |
| Ability shouts | per ABILITIES record `say` · `shout` | e.g. *Omen*: "Something hunts near {dir}." |

Nothing else about classes floats over a head.

### 9.5 The look and the chronicle
- **Look:** "Wenna (TEST_Acolyte)" after the name, for people of known factions.
- **Chronicle** (`UF.History.addEvent`, register of THEME §2.13):

  | Type | When |
  |---|---|
  | `class_opened` | a faction's first seat of a class ("The Valgarde Kingdom raised its first temple.") |
  | `class_joined` | a faction's first member of a class |
  | `class_tier` | tiers IV and V |
  | `class_branch`, `class_advanced` | phase 6 |
  | `class_left` | tier III and above |
  | `class_lost` | a death at tier II and above |

  Every line passes the banned-word check (§12 `catalog`).

### 9.6 Animation and garb
- **Induction and casting** set `data.casting`, so UF_Anim plays the cast columns 11–13 (the state exists). Effect layers are ABILITIES' (`fx`). Missing art draws nothing (V58, V89).
- **Class garb** (CL25): an optional layer per class on the AR-600 grid, drawn through the V61 compositor. Until art exists nothing shows.

---

## 10. Data

### 10.1 Catalog key `classes` (the shape)
```json
"classes": {
  "about": "Classes (VISION V88; docs/design/CLASSES.md). Names are TEST_ until the user approves them (AGENTS rule 7). Abilities live in abilities.list (ABILITIES AD1).",
  "tiers": { "keyLevel": [1, 20, 40, 60, 80], "gradeFor": [1, 1, 2, 2, 3] },
  "places": [2, 3, 5],
  "trait": { "xpMul": 0.04, "perkSpeed": 0.03, "chanceMul": 0.02, "perkFail": -0.08, "yieldChance": 0.01, "level": 1, "factionXpMul": 0.05 },
  "duty": { "share": 0.3, "shareNoNeeds": 0.6, "beats": 40, "trainMaxLevel": 40,
            "study": { "xpBase": 25, "xpPerLevel": 2.5 }, "drill": { "xpBase": 12, "xpPerLevel": 1 }, "practice": { "xpBase": 12, "xpPerLevel": 1 } },
  "review": { "ritesPerReview": 1, "ritesPerDay": 2, "minDaysInBand": 1, "smallBand": 12, "smallBandShare": 0.5, "keepFactor": 0.3,
              "inductBeats": 60, "inductTimeoutDays": 2, "lapseDays": 7, "changeDays": 7, "refuseDays": 7, "aspirantsPerReview": 3 },
  "weights": { "induct": 62, "seatBuild": 30, "seatUpgrade": 20, "duty": 40, "classWorkPerTier": 0.1 },
  "need": { "herbHurt": 2, "armsThreat": 1.5, "faithDeathDays": 3, "faithDeath": 1.5, "graveNoRaiser": 2 },
  "tallies": [ { "id": "hunted", "on": "jobs:kill" },
             { "id": "made_metal", "on": "jobs:done", "type": "craft", "skill": "smithing" },
             { "id": "salvaged", "on": "jobs:done", "type": "salvage", "waitsFor": "CRAFTING salvage" } ],
  "seats": [
    { "id": "temple", "name": "TEST_Temple", "class": "faith", "peoples": null,
      "grades": [
        { "setting": "room", "key": ["altar_plain", "altar"], "cells": 12, "door": true },
        { "setting": "room", "key": ["altar_plain", "altar"], "cells": 20, "floored": 0.5, "support": { "bench": 2, "candle_stand": 2 } },
        { "setting": "room", "key": ["altar"], "cells": 30, "floored": 1, "walls": "later", "support": { "bench": 4, "bell": 1 } } ] },
    { "id": "stone_ring", "name": "TEST_Stone_ring", "class": "faith", "peoples": null,
      "grades": [
        { "setting": "yard", "radius": 5, "key": ["standing_stone"], "support": { "standing_stone": 5 } },
        { "setting": "yard", "radius": 5, "key": ["standing_stone"], "support": { "standing_stone": 8 } },
        { "setting": "yard", "radius": 5, "key": ["table_stone"], "support": { "standing_stone": 8 } } ] },
    { "id": "tower", "name": "TEST_Tower", "class": "arcane", "peoples": null,
      "grades": [
        { "setting": "room", "key": ["study_table", "lens", "orrery"], "cells": 9, "walls": "later", "z": [0, 2] },
        { "setting": "room", "key": ["lens", "orrery"], "cells": 9, "walls": "later", "z": 1, "roomBelow": { "walls": "later" } },
        { "setting": "room", "key": ["orrery"], "cells": 9, "walls": "later", "z": 2, "floored": 1, "support": { "shelf": 2 } } ] },
    { "id": "clutch_hall", "name": "TEST_Clutch_hall", "class": "clutch", "peoples": ["kobold"],
      "grades": [
        { "setting": "room", "key": ["nest"], "support": { "nest": 2, "tag:heat": 1 } },
        { "setting": "room", "key": ["nest"], "support": { "nest": 4, "tag:heat": 1 } },
        { "setting": "room", "key": ["nest"], "walls": "later", "support": { "nest": 6, "tag:heat": 1 } } ] },
    { "id": "nesting_ground", "name": "TEST_Nesting_ground", "class": "clutch", "peoples": ["lizardfolk"],
      "grades": [
        { "setting": "yard", "radius": 5, "key": ["nest"], "support": { "nest": 2 } },
        { "setting": "yard", "radius": 5, "key": ["nest"], "support": { "nest": 4 } },
        { "setting": "yard", "radius": 5, "key": ["nest"], "support": { "nest": 6, "campfire": 1 } } ] }
  ],
  "list": [
    { "id": "faith", "name": "TEST_Acolyte", "names": {}, "peoples": { "deny": ["undead", "swarm"] }, "seats": ["temple", "stone_ring"],
      "open": { "requires": {} },
      "path": { "any": [ { "healing": 5 }, { "foraging": 20 }, { "devotion": 5 } ], "tallies": { "gathered": 5 }, "cleanHandsDays": 28 },
      "leaning": { "patience": 1, "sociability": 1 }, "ethos": { "pious": 0.5 }, "refuseBelow": null,
      "word": 2, "rankMin": {}, "key": "devotion",
      "favoured": { "xp": ["devotion", "healing"], "speed": ["rite", "tend", "skill:healing"], "success": [], "yield": [], "combat": [] },
      "duty": ["rite"], "branches": [], "advanced": [] },
    { "id": "arms", "…": "…", "key": { "min": ["attack", "strength", "defence"] }, "rankMin": { "4": 2, "5": 2 } },
    { "id": "mason", "…": "…", "key": { "byWall": { "stone": "masonry", "wood": "carpentry" } } }
  ],
  "gates": [ { "kind": "recipe", "tag": "thunder_iron", "class": "smith", "tier": 3 },
             { "kind": "recipe", "id": "cut_relic", "anyOf": [ { "class": "smith", "tier": 4 }, { "class": "salvage", "tier": 4 } ] },
             { "kind": "action", "action": "salvage", "class": "salvage", "tier": 2 } ],
  "lines": { "induct": ["{name}, go to the {seat} and be taken in.", "{name}, the {seat} is ready for you."],
             "inducted": ["I will serve the {seat}.", "I'll do my part."], "release": ["{name}, your service there is done."],
             "tier": ["I'm surer at the {seat} now."] },
  "approvedNames": []
}
```
Written by a layout-preserving node script, `tools/add_classes_catalog.js`, never `ConvertTo-Json` (ENGINE_RULES §4). The script re-reads the file right before writing, changes only the keys named here, and asserts that every other key parses back unchanged.

### 10.2 Other catalog changes
- **`cultures.<id>.classWeights`:** §3.3.
- **`cultures.<id>.seatPrefer`:** `{ faith: "stone_ring" }` for elves, orcs and lizardfolk; nothing (the temple) for the rest (§3.4). Read only by the seat-demand step (§8.2).
- **`objects`, appended** (D10). Every seat and support piece carries the tags `furniture` and `class_seat` or `class_support`, and blocks movement.
  - New here: `altar_plain`, `bench`, `candle_stand`, `bell`, `standing_stone` (THEME T16), `table_stone`, `study_table`, `lens`, `orrery`, `pell`, `quintain`, `archery_butt`, `quench_trough`, `salvage_rack`, `bone_niche`, `light_lens`.
  - CRAFTING's pieces, when C1 is approved: `altar`, `shelf`, `herb_table`, `mason_bench`, `carpenter_bench`, statue and pillar, `relic_bench`.
  - PEOPLES' pieces: `nest`, the mound.
  - `charge_stone` tag: `standing_stone`, `study_table`, `lens`, `orrery`, `light_lens`.
  - `altar` tag (ABILITIES' `rite` target): `altar_plain`, `altar`, `standing_stone`, `table_stone`.
  - None of `furniture`, `class_seat`, `class_support`, `charge_stone` or `altar` exists as a tag in the 2026-09-19 catalog; all are new.
- **`abilities.list`, appended:** the class traits (§5.1) and the new records of §4, with `TEST_` names.
- **`tech.nodes` and `tech.cultures`:** the seat nodes of §2.6 and the culture permissions (§11.1), through TECH_TREE's own tool.

### 10.3 Saved state
| Where | Shape | Notes |
|---|---|---|
| `unit.data.class` | `{ id, since, seatId, by, branch, lapsedAt }` or null | `seatId` = `"ax,ay:x,y,z"` of the seat object; `by` = unit id or `"player"`; about 80 bytes |
| `unit.data.classPast` | `[{ id, from, to, tierMax, end, branch }]`, the last 6 | |
| `unit.data.tallies` | `{ tallyId: count, lastSlewPerson }`, sparse | at most about 12 keys |
| `unit.data.aspires`, `unit.data.novice` | class id or null | rewritten by the class pass |
| `UF.World.state.classes.seatIndex` | `{ "<ax>,<ay>": ["x,y,z", …] }`, the cells of seat key objects only (§2.2) | kept from `objects:changed` and `world:objectChanged`; a few bytes per seat; grades and places are still computed |
| `UF.World.state.classes` | `{ version: 1, factions: { [fid]: { mode: "head" \| "mine", hold: { classId: true }, refused: { unitId: untilMinute }, day: { n, count }, firsts: { classId: unitId }, opened: { classId: minute }, suggestions: [...], tally: { inducted, lapsed, left, released } } } }` | player choices, pacing and firsts only |

- **Never saved:** grades, places, tiers, caches (D4). Only the seat cells are saved (`seatIndex`), so a load finds seats without a map scan (V50). Pools, cooldowns and effects are ABILITIES' (`data.abil`, `data.pools`, `data.mods`).
- **Times** are game minutes (CHAIN_OF_COMMAND §2.4's `now()`).
- **Old saves** load with no class, no tallies and no aspirations, and tallies start counting from the load. No migration is needed.
- **Everything is plain data** for RMMZ's `JsonEx`. Nothing lives in a plugin `Map` (CHAIN_OF_COMMAND's `saved` lesson).
- **Size:** a few KB per world, within V50's 3 MB.

### 10.4 Events
- **Emits:**
  - `classes:opened(fid, classId)` and `classes:closed(fid, classId)`;
  - `classes:grade(seatId, grade, old)`;
  - `classes:joined(unit, classId, seatId)` and `classes:left(unit, classId, end)`;
  - `classes:lapsed(unit, classId, why)` and `classes:restored(unit, classId)`;
  - `classes:tier(unit, classId, tier, old)`;
  - `classes:branch(unit, classId, branch)`;
  - `classes:aspires(unit, classId)`;
  - **`classes:changed(unit, { from, to, tier, lapsed })`**, fired on every join, leave, lapse, restore and tier change. UF_Abilities recomputes the known set on it.
- **Listens:**
  - `world:created`, `jobs:done`, `jobs:kill`, `combat:kill`;
  - `objects:changed`, `world:objectChanged`, `floors:laid`, `floors:removed`;
  - `skills:levelUp`, and `skills:factionLevelUp` (TECH_TREE §5; not in UF_Skills yet);
  - `tech:unlocked` (UF_Tech, not built), `command:review` (through the step hook) and `command:ranks` (UF_Command, not built);
  - `world:unitRemoved`, `anim:death`, `time:day`.

  Emitted today (checked 2026-09-19 in `game/js/plugins/`): `world:created`, `jobs:done` (`UF_Jobs.js` line 828), `jobs:kill` (line 476), `combat:kill` (`UF_Combat.js` line 654), `objects:changed`, `world:objectChanged`, `floors:laid`, `floors:removed`, `skills:levelUp` (`UF_Skills.js` line 495), `world:unitRemoved`, `anim:death`, `time:day`. The rest come with the builds named.

### 10.5 API (`UF.Classes`)
| Member | Returns |
|---|---|
| `list()`, `get(id)` | the class records |
| `isOpen(fid, id)`, `missing(fid, id)` | bool; the missing criteria as `[{ what, have, want }]` |
| `seats(fid, id?)`, `gradeOf(seatId)`, `explainGrade(seatId)` | seats with grade and places; a grade; the next grade's tests with numbers |
| `of(unit)`, `tierOf(unit, id?)`, `capOf(unit)` | the class record of the unit; tier 0–5 (0 when not held or lapsed); the seat cap |
| `count(fid, id, minTier)` | members not lapsed at that tier or more (TECH_TREE's criterion) |
| `canJoin(unit, id)`, `aspirants(fid)` | `{ ok, reason, aspirant }`; the aspirant list |
| `tallies(unit)`, `addTally(unit, id, n)` | read; tests only |
| `assign(unit, id, seatId?, { by })`, `release(unit, { by })`, `refuse(unit, days)`, `hold(fid, id, on)`, `setMode(fid, mode)` | player and head actions |
| `seatRoomAt(cellRef, classId?)`, `ownSeatRoom(unit)` | the seat whose room or yard holds the cell, `{ seatId, classId, fid, grade }` or null (ABILITIES' temple room for devotion, the Lens hall for inner light); the member's own seat room. The merge's `templeRoomAt` is `seatRoomAt(cell, "faith")` |
| `gateFor(unit, job)` | `{ ok, reason }` for §6.2 |
| `review(fid, { dry })` | run the class pass now; `dry` returns the choices without acting |
| `perf()`, `resetPerf()`, `config()`, `errors`, `errorCount()` | cost meter, catalog settings, caught errors |

---

## 11. Hooks into other systems
Every file named here is Claude Code's. Before editing one, the build checks `docs/STATUS.md` → In progress. A file another run holds is asked about first, or wrapped at run time instead.

### 11.1 UF_Tech (TECH_TREE.md; being built by the DF-mechanics run)
- **Opening:** `UF.Tech.meets(fid, requires)` evaluates `classes.list[].open.requires`. TECH_TREE §2.4 names this shared evaluator; its §8.1 API table should list it.
- **Class criteria in nodes:** `requires.classes` reads `UF.Classes.count` (already in TECH_TREE §2.4).
- **Building counts:** `UF.Tech.built(fid, key)` and `tech:counted` for "build N of X" in the seat nodes (§2.6).
- **Unlocks:** `UF.Tech.allows(fid, "building", id)` decides whether an aspirant's seat can be built (§7.2, §8.2).
- **Culture permission, a 7th source** for `tools/add_tech_catalog.js` (TECH_TREE §2.3): the seat and support objects of every class a culture's people may take, in that culture's seat variant. Without it, `tech.catalog_valid` would find the seat objects unpermitted, and no faction could build them.
- **Culture walls:** the `walls: "later"` test (§2.2) reads `cultures.<id>.laterWall`, the same field TECH_TREE §2.3 rule 2 permits, so a seat never asks for a wall its culture may not build.
- **Work gates:** a 4th step in `UF.Tech.canWork`, class gates (§6.2). The clean way is a registry, `UF.Tech.addGate(fn(unit, job) → { ok, reason })`. The fallback is a run-time wrap of `UF.Tech.canWork` by UF_Classes.
- **Unlocks view:** a "Classes" page (§9.3) through a page hook, or the fallback menu.

### 11.2 UF_Skills
- **Only `addXpModifier` is needed** (answering TECH_TREE D11). `addSealFilter` and `rollLevel` are not needed under D8 and §5. None of the three exists in `UF_Skills.js` today, and TECH_TREE D11's recommended option leaves them to the Classes build, so `addXpModifier` is built with UF_Abilities' UF_Skills change (ABILITIES §11.1: `add` multiplies by `xpMul`), about 20 lines with a synthetic-provider test.
  - UF_Abilities registers the one provider that applies `xpMul` (ABILITIES §11.1).
  - Because `add(person, "building", xp)` routes to the faction pool (TECH_TREE §2.1), the same registry carries the mason's `factionXpMul.building`, as long as the modifier runs before the routing.
- **`addRateModifier` and `addYieldModifier`** are built by the TECH_TREE work (TECH_TREE §7.2; not in `UF_Skills.js` yet). UF_Abilities registers providers for `perkSpeed` and `yieldChance` there, until V85's `perk()` path replaces the rate path.
- **New experience sources:** `study` (magic), `drill` (the style skill) and `practice` (ranged), paid through `UF.Skills.add`, capped at `trainMaxLevel`. Map them with `UF.Skills.mapJob(...)` to no automatic job experience, because UF_Classes pays them. They are listed in `docs/systems/UF_Skills.md` and ABILITIES §6.2.
- **`mapJob("induct", null)`.**
- The combat level and devotion: ABILITIES A2 (not decided here).

### 11.3 UF_Abilities (ABILITIES.md; not built)
- `source.class` and `tier` read `UF.Classes.tierOf(unit, classId)`; the known set recomputes on `classes:changed`.
- The class traits are passive records (§5.1). `modify.value` may be `{ base, perTier }` (in ABILITIES §2.6 since this review).
- `source.seat` (ABILITIES §2.2, added in this review) reads the seat kind of `UF.Classes.of(unit).seatId`, for the faith abilities that differ by way.
- The temple room for devotion refill is `UF.Classes.seatRoomAt(cell, "faith")`. Inner light's full refill is inside `seatRoomAt(cell, "light")` of the unit's own faction, for every star-born, member or not. The swarm store's refill near the mound is PEOPLES' mound, not a class seat.
- The new records of §4 are appended with `TEST_` names. `sure_hands` follows §6.1.

### 11.4 UF_Colonists and the chain of command (UF_Command; not built, waits for the bands run)
- `UF.Command.addReviewStep(fn(fid, tasks))`: the class pass (§8.2) adds its tasks before the commanders' passes.
- New task kinds `induct` and `duty` (CHAIN_OF_COMMAND's 12 become 14). With ABILITIES' `rite`, `charge`, `attend` and `cast`, the list grows to 18. The `orders_follow_chain` check lists them. ABILITIES called its escort-and-heal kind `tend`, the same word as CRAFTING's `tend` job that the Herbalist's duty uses; the review renamed ABILITIES' kind `attend`.
- `UF.Command.chainOf`, `give`, `headOf`, `commands`, `rankName` for the confirmer and the lines.
- The commanders' score: × (1 + 0.1 × tier) for class-favoured kinds (§8.5), through a new `UF.Command.addScoreFactor(fn(member, task) → factor)`, multiplied into CHAIN_OF_COMMAND §3.3's score. Neither it nor `addReviewStep` is in CHAIN_OF_COMMAND.md yet; both go to its owner.
- `UF.Command.threats(area)` (CHAIN_OF_COMMAND §6.5) for Omen and for `need(k)`.
- `UF.Colonists.addDecider("afterSurvival", dutyDecider)`, registered after UF_Command's order decider (§8.4).
- `UF.Colonists.members(fid)`, `workHours(u)`, `survival(u)`, `give(u, spec)` (CHAIN_OF_COMMAND §6.2).
- UF_Society's house plan builds the seat room when the class pass adds a seat task (§8.2 step 5). UF_Society.js is new in the bands run (CHAIN_OF_COMMAND §6.6's load order) and doesn't exist in `game/js/plugins/` yet.

### 11.5 UF_Sheet
- `UF.Sheet.addUnitLines(fn)` (CHAIN_OF_COMMAND §6.3): the class lines of §9.1.
- **New:** `UF.Sheet.addObjectLines(fn(objectType, cellRef) → { lines, buttons })` for the seat panel (§9.2). It is about the same size as `addUnitLines`: a provider list, the lines folded into the redraw signature, and buttons as `{ label, enabled, onClick }`.

### 11.6 UF_Speech
- `UF.Speech.say(confirmer, text, { kind: "order", queue: true })` for the induction and release lines.
- `say(member, text, { kind: "remark" })` for the answer and the tier-up remark.
- Shouts come from ABILITIES' `say`. Kinds used: `order`, `remark`, `shout` (all exist, UF_Speech line 43). Lines ≤ 40 characters.

### 11.7 UF_Anim
- `data.casting` during the induction of a casting class, and during class abilities (ABILITIES). UF_Anim already plays `cast` (columns 11–13) while it is set (`UF_Anim.js` lines 309–310; the merge cited 303–304).
- Class garb layers (CL25) go through the V61 compositor and need no new code beyond a layer entry.

### 11.8 UF_Floors (a finding, verified 2026-09-19)
- `cellWalkableForRoom` (`UF_Floors.js` line 78) treats a cell holding a blocking object as outside a room, and `computeRoom` then fails the whole room (line 108). **So a room holding a furnace, a smithy, an altar or any other blocking object is not a room today.** Every seat object blocks.
- **The fix:** an object tagged `furniture` counts as an interior cell for the room test while still blocking movement. `cellWalkableForRoom` stays as it is for floors.
- **Also needed:** rooms with `z` (V80) for the level tests, and a `rooms:changed(area, z)` event, or UF_Classes listens to the object and floor events and calls `invalidate` itself.

### 11.9 UF_History, UF_Remains, UF_Peoples, UF_Levels, UF_Jobs, UF_Interact
- **UF_History:** `addEvent` for the chronicle types of §9.5.
- **UF_Remains:** laying to rest sets the person record's `burial` (REMAINS §3.9; "laid to rest" stops raising, ABILITIES A11). Bones lying in a room count for the ossuary grade. *Keep the dust* pauses decay for records in the seat room.
- **UF_Peoples** (PEOPLES waves 1–2): raising speed and bonds, nests and eggs, the mound's caste choice and egg cap, the construct cap. Each is read from `UF.Classes.tierOf` by the owner's code, or registered as a modifier; UF_Classes writes nothing into their state.
- **UF_Levels** (V80): `z` of objects and rooms; the stair connectors; the bounded count of dug cells for the pithead.
- **UF_Jobs:** `UF.Jobs.define("induct" | "study" | "drill" | "practice" | "nest", …)` from UF_Classes; UF_Jobs itself is not edited.
- **UF_Interact:** the fallback "Classes…" option, wrapped at run time as UF_Command does.

---

## 12. Checks (suite `classes`)
Run on a snapshot of `game/` (docs/systems/UF_Test.md), at ×8 where a check says so. **Every check must be seen failing once** against a sabotaged copy in its own snapshot (the last column), and the FAIL line is quoted in the build report. Test people and seats are `TEST_`-named and placed by the test (`UF.Objects.setIn`, walls, floors) on free land beside the player's camp. The checks read units and objects themselves, so a bug in a summary can't hide a broken rule.

| Check | FAILs when | Provoked by |
|---|---|---|
| `catalog` | A class names a missing skill, object, tally, people or seat id; tiers don't rise; a class record carries an ability list (D6); a class has no trait record; a name isn't `TEST_` or in `approvedNames`; a name holds a banned word (AGENTS list, THEME §3.3, PEOPLES §1.1, §15.3 here); a class name equals a rank name, a labour name or a culture label (D12); a class, seat or ability name the swarm or the star-born can show contains one of PEOPLES §1.1's scoped words (D12); a seat grade asks for `walls: "stone"` instead of `"later"`; a gate raises the level its work already needs (§6.2) | a seat whose key object id doesn't exist |
| `no_class_at_start` | After a New Game, any unit has `data.class` or a tally count above 0 | founders given 5 `hunted` tallies |
| `open_and_close` | With no seat, `isOpen(player, "faith")` is true; after a plain altar in a 12-cell walled room with a door, it isn't open within 1 game minute; after the door is removed, it isn't closed and its member isn't lapsed | the room test skipped (any altar opens) |
| `seat_grades` | A synthetic temple, stone ring and tower built to exactly grade g, and to one test short of g, don't grade g and g − 1; `explainGrade` doesn't name the missing test with its numbers; an elf faction's tower walled with `wall_wood` doesn't reach grade 1 (the later-wall test, §2.2). The tower's z rows run only when UF_Levels exists; otherwise the detail says "z grades not run: UF_Levels missing", and those rows count as not checked | `floored` compared with `>` instead of `>=` |
| `seat_rules` | Another faction's altar counts; a ruined altar counts; an altar outside any room counts; a smithy and furnace in a walled room don't make a smiths' hall (the §11.8 fix) | the furniture fix reverted |
| `places` | A grade-1 seat doesn't take 2 members and refuse a third with "full (2 of 2)"; after a second seat is built, the third isn't accepted | `places[grade]` instead of `places[grade − 1]` |
| `path_gate` | A person below every path alternative gets `ok`; at the path, with a seat and a word, it doesn't; the reason doesn't name the missing level; a boosted effective level passes the path (§2.5) | the path test removed from `canJoin` |
| `tallies_counted` | 3 synthetic `jobs:kill` don't give `hunted` 3; a `jobs:done` of the same hunt counts again; a `drink` changes `tallies` | `hunted` counted on both events |
| `tiers` | Members at key 19 / 20 / 39 / 40 / 59 / 60 / 79 / 80 with best grade 1 / 2 / 3 don't get the check's table of tiers; `classes:tier` fires twice for one change; a lapsed member's `tierOf` isn't 0; arms tier IV is given at rank 1 | `>=` replaced by `>` in the tier function |
| `training_ceiling` | From magic 38 (`setLevel`), 100 game hours of `study` (driven through the beat counter) raise it above 40; from magic 1, 10 game hours of study pay a different total from the catalog sum (the check sums it); the same two for `drill` from attack 38 over 200 game hours. Without the ceiling, study passes 40 after about 59 game hours from 38 and drill after about 141 (§2.4), so each run can fail. The merge's version (200 game hours from magic 1) could never fail: pure study reaches only about level 36 in that time | `trainMaxLevel` ignored |
| `word_chain` | An `induct` order from outside the candidate's chain, or below `word`, is accepted; an advanced class's order from a rank-2 is accepted; a held class gets an induction | the confirmer taken as any member |
| `induct_to_class` | Within 40 s at ×8, the order doesn't take the candidate to the seat; `data.class` is set before the 60 beats end, or not at all; there isn't exactly one first-member chronicle line; there is no `order` line by the member's own commander of at most 40 characters; any non-speech text shows over a head | class set when the order is given |
| `player_controls` | Assign isn't a direct order with `by: "player"`; the head's next 3 passes undo it; Refuse doesn't block for 7 game days; Hold doesn't block; Release doesn't end the class; with "mine only", any pass inducts anyone, or no suggestion reaches the page model | the player flag not checked in the pass |
| `traits` | A faith tier-II member doesn't get healing experience × 1.08 (to 0.001); a non-member, a lapsed member or a non-favoured skill gets any; an arms tier-III member's effective attack in UF_Combat isn't +3 while its `UF.Skills.level` stays unchanged; a mason's build doesn't add × 1.05 per tier to the faction pool | the multiplier applied to every skill |
| `never_meets_requirements` | A tier-V Smith at smithing 50 may take a smithing-53 recipe; a tier-V Wizard at magic 20 may cast `rime_fetter` below 20; a tier-V Prospector at mining 30 may mine an ore that needs 35 | the effective level used in `meets` |
| `abilities_follow_tier` | (with UF_Abilities) the known set doesn't gain the tier-II abilities in the same frame as the tier change; a lapse doesn't remove them; a person with magic 99 and no class knows a class spell (ABILITIES A1) | `classes:changed` not emitted on lapse |
| `class_gates` | A tier-II Smith isn't refused a thunder-iron recipe with a reason naming the class; a tier-III Smith is refused; a tier-II Herbalist at healing 26 is refused the betony draught; a tier-IV Salvor at smithing 72 is refused `cut_relic`; `UF.Classes.count(fid, "mason", 3)` counts a lapsed member; a node with `classes: { mason: { tier: 3 } }` unlocks without one (when UF_Tech is present; without it the detail says "UF_Tech missing" and the check fails, because it is a dependency) | `count` including lapsed members |
| `lapse_leave_change` | A destroyed seat doesn't lapse its members (newest first when places shrink); a rebuilt seat within 7 days doesn't restore without a new induction; after 7 days the class isn't left; leaving changes any experience; a new induction within `changeDays` isn't refused | experience reset on leaving |
| `peoples` | An undead may join faith or herb; a swarm member anything but brood; a star-born is refused arcane (allowed since the review); a human may join clutch; a kobold's clutch opens with a yard of nests or a lizardfolk's with a room; an elf faction's faith opens with a stone ring but not with a temple (both are open, §3.4) | the matrix ignored |
| `ai_demand` | A band with an aspirant, an allowed seat object and no seat gets no seat `build` task within 2 reviews; a band with no aspirant gets one; an elf band's first faith seat task isn't a stone ring while standing stones are allowed (`seatPrefer`); the seat task's weight is above a food task's while food is short | `seatBuild` weight 0 |
| `ai_pacing` | More than 1 induction in one review or 2 in one game day; anyone inducted on their first game day; a band of 8 with 5 of its adults classed; the chosen candidate isn't the highest score of §8.3 (computed by the check) | `ritesPerReview` unlimited |
| `ai_duty` | Over 2 game days at ×8, a member with no orders spends under 20% or over 40% of its work-hour beats on duty (target 0.3; 0.6 for a test undead) | the duty share ignored |
| `death_split` | A tier-III member's death doesn't give exactly one `class_lost` line; a split member keeps its class unlapsed in a new faction without a seat | the split handler skipped |
| `saved_deterministic` | A `JsonEx` round trip changes `data.class`, `tallies`, `classPast` or `state.classes` (with `seatIndex`); after a load, `seats(fid)` differs from before the save; after loading, a pending induction isn't carried out within 2 game hours; two New Games with one seed and the same scripted seats give different aspirants or inductions; `review(fid, { dry: true })` twice differs; the file contains `Math.random`, `Date.now` or `Graphics.frameCount` | a `Math.random` tie-break |
| `perf` | Over 60 s at ×8 with every New Game band given one test seat and two aspirants: UF_Classes averages over 0.05 ms per frame; a class pass over 0.3 ms; a grade recomputed more than once per seat per game minute; `command` or `colonists` `perf` over their own budgets | a grade recomputed every frame |
| `no_errors` | Any uncaught error during the suite, or any error caught inside UF_Classes | a throw in the tally handler |

**Screenshots** (the builder opens and describes each one, AGENTS rule 5):
- `classes.seat_panel`: a grade-2 temple's panel with its places, next-grade tests and buttons;
- `classes.sheet`: a tier-II Acolyte's sheet with the class lines;
- `classes.induct_line`: a commander's induction line over its head, with the named member walking to the seat;
- `classes.page`: the Classes page with one held class and one aspirant.

**Also run on the same snapshot:** `skills`, `tech`, `command`, `colonists`, `jobs`, `sheet`, `speech`, `history`, `abilities` (when built) and `smoke`. Suites that pass without UF_Classes must still pass with it.

---

## 13. Build order: what waits for which build
Each phase is its own slice (AGENTS rule 1) and waits for the user's approval of the one before. The RMMZ editor must be closed before `game/data` or `plugins.js` changes (AGENTS → RMMZ editor safety).

| Phase | What | Waits for | Checks |
|---|---|---|---|
| **0** | The user answers §16 and approves names (§15) | – | – |
| **1** Core | `tools/add_classes_catalog.js` (the `classes` key, classWeights, seat objects appended); UF_Classes: seats and grades, opening, tallies, `canJoin`, tiers, lapse and leave, API, sheet lines, chronicle; the UF_Floors furniture fix; the seat nodes and culture permissions through TECH_TREE's tool | **UF_Tech and the UF_Skills V84 changes** (the DF-mechanics run, in flight since 13:45); **PEOPLES wave 0** (the eleven peoples' data, in flight) for the people ids; UF_Sheet `addUnitLines` (made by the UF_Command build, or here in the same 10 lines if that build hasn't landed) | `catalog`, `no_class_at_start`, `open_and_close`, `seat_grades`, `seat_rules`, `places`, `path_gate`, `tallies_counted`, `tiers`, `lapse_leave_change`, `peoples`, `death_split`, `saved_deterministic`, `perf`, `no_errors` |
| **2** The word and the AI | the class pass, aspirants, seat demand, inductions, duty (study, drill, practice), the player controls, the seat panel, the Classes page | **UF_Command** (CHAIN_OF_COMMAND; not built: waits for the bands run's UF_Colonists APIs); UF_Society's house plan for seat rooms; `addObjectLines` | `training_ceiling`, `word_chain`, `induct_to_class`, `player_controls`, `ai_demand`, `ai_pacing`, `ai_duty` |
| **3** Traits and abilities | the trait records; the re-keyed ABILITIES records for faith, arcane, arms and bow; the new records of §4.1–4.4 | **UF_Abilities** phases B1–B3 (not built); UF_Skills `addXpModifier`; **UF_Remains** (in flight) for laying to rest; THEME T20/T21 answers | `traits`, `never_meets_requirements`, `abilities_follow_tier` |
| **4** The trade classes | herb, smith, mason, delve and salvage unlocks, gates and tech criteria; tower grades 2–3 | **CRAFTING C1/C2** (proposals; the benches, the altar, the relic bench, salvage, `tend`, thunder-iron); **WORK_TIMING** (V85) for `perkFail` and `chanceMul`; **UF_Levels** slices (in flight) for z rooms, stairs and dug cells; THEME T16 B for wrecks | `class_gates` |
| **5** People-bound classes | grave, light, brood and clutch | **PEOPLES waves 1–2** (UF_Peoples: eggs and nests, raising, the mound, constructs, inner light) | their rows in `peoples`, `tiers` and `abilities_follow_tier` |
| **6** Depth | branches, advanced classes, novices, class garb | phases 1–5; the art | new rows in `tiers` and `induct_to_class` |

Until phase 5, the four people-bound classes are in the data and shown as locked, with "waits for <system>" as the reason, so nothing claims to work that doesn't.

---

## 14. Art this needs (for `docs/handoffs/HANDOFF_classes.md` and `docs/ASSET_REQUESTS.md` at build time)
Nothing is requested yet: this design edits no other file. Formats follow `docs/ART_STANDARD.md`, `docs/RMMZ_ASSET_SPEC.md` and V70. Sizes are against the 48 px square (V44, V81).

| Group | Pieces | States (V36, V60) | Plugs in through |
|---|---|---|---|
| Seat and support objects | altar (plain), bench, candle stand (lit loop), bell, standing stone, table stone, study table, lens, orrery (slow turning loop), pell, quintain, archery butt, quench trough, salvage rack, bone niche, light-lens (faint glow loop): 16 objects | built; in use where animated; ruined | `objects[].image` (placed by play, never by world generation) |
| Class garb (CL25) | 13 layers on the AR-600 grid, with every row including cast | worn | the V61 compositor |
| Ability effects and icons | the new records of §4 | – | ABILITIES §12 (its own handoff) |

**Stock placeholders (V9):** the stock RPG Maker altars, statues, bookshelves, anvils, candles and training dummies from the Inside and Outside B/C sets are used until delivery. Each stock asset used gets its own generation request naming the stock file in the Status column (CLAUDE.md).

---

## 15. Names (every one a PROPOSAL, AGENTS rule 7)
Until approved, the data uses `TEST_` names. The recommended option is first. **No web search was run for this merge or for the review.** Draft B's searches of 2026-09-19 are carried over, and every name below needs a search before approval. The review's changes to names come from memory and from PEOPLES §1.1's lists.

### 15.1 Classes and seats
| Slot | Recommended | Option 2 | Option 3 | Note |
|---|---|---|---|---|
| faith | **Acolyte** | Votary | Almoner | the user's word |
| arcane | **Wizard** | Magus | Lorewright | the user's word |
| arms | **Man-at-arms / Woman-at-arms** | Armsman / Armswoman | Shield-bearer | |
| bow | **Archer** | Bowman / Bowwoman | Longbowman | |
| herb | **Herbalist** | Leech | Physician | "Healer" avoided: CRAFTING's proposed labour `healer` (D12) |
| smith | **Smith** | Anvil-hand | Hammerwright | "Master smith" avoided: THEME T11's craft master title |
| mason (stone) | **Lodge-mason** | Stonewright | Waller | "Wright" avoided: a rank name (gnome_bench) |
| mason (wood) | **Housewright** | Joiner | Timberwright | "Carpenter" is a labour name |
| delve | **Prospector** | Seamfinder | Sapper | "Tunneller" avoided: the kobold culture label "Tunnellers" (PEOPLES §3.8 spells it with two l's); "Delver": a rank name and VISION's rejected protagonist. "Prospector" is a plain English word, but OSRS also has a prospector outfit that adds mining experience (from memory): search before approval |
| salvage | **Salvor** | Salvager | Wreck-finder | draft B's search: "Salvor DEEP", a 2025 indie game; also a real English word |
| grave | **Dust-speaker** | Lych-keeper | Barrow-singer | draft B's search found nothing for Dust-speaker; "Grave-caller" rejected (several games) |
| light | **Lens-keeper** | Glass-singer | Light-shaper | "Lightwright" avoided: a rank name (gnome_relic); close to the star-born culture label "Light-keepers" |
| brood | **Mound-tender** | Comb-tender | Dam's-hand | PEOPLES' words "mound", "comb" and "the Dam". The merge's options "Brood-shaper" and "Nest-tender" were dropped: PE21 bans "brood" and "nest" for the swarm's own names |
| clutch | **Clutch-warden** | Egg-keeper | Hatch-tender | "Hatchery" is banned (PEOPLES §1.1) |
| temple seat | **Temple** | Chapel (THEME T16) | Sanctuary | the user's word; "Shrine" avoided (Ultima's virtue shrines, THEME §3.3) |
| stone-ring seat | **Stone ring** | Standing stones | Henge | |
| tower seat | **Tower** | Star tower | Lore tower | the user's word |
| arms seats | **Practice yard** · **Hall of arms** | Tiltyard (THEME T16) | Drill ground | |
| bow seat | **Archery butts** (THEME T16) | Shooting ground | Butts field | |
| herb seat | **Still-room** (an infirmary at grade 2) | Infirmary | Sickhouse | |
| smith seat | **Smiths' hall** | Hammer hall | Forge hall (not for the star-born: "Forge" is a Protoss building, PEOPLES §1.1) | the merge recommended "Forge hall"; the star-born may take Smith, so the review moved it to option 3 |
| mason seat | **Lodge** | Masons' lodge | Builders' hall | |
| delve seat | **Pithead** | Mine head | Shaft house | |
| salvage seat | **Salvage yard** | Wreck camp | Relic store | |
| grave seat | **Ossuary** | Bone hall | Charnel house | |
| light seat | **Lens hall** | Light-well | Crystal hall | |
| clutch seat, kobolds | **Clutch hall** | Egg house | Nest hall | |
| clutch seat, lizardfolk | **Nesting ground** | Egg-bank | Clutch yard | new in the review (§3.4) |
| advanced, arms | **Knight-errant** | Knight (the rank sets that use it then change, CL13) | Sworn blade | "Champion" avoided: THEME T11 orc squad leader |
| advanced, faith | **Prior / Prioress** | Abbot / Abbess (a THEME T11 chapel title: avoid unless that title is dropped) | Temple-elder | Prior and Abbot are real monastic offices. THEME T21 A allows no real-world religion's names, so under T21 A option 3 is the safe pick; under T21 B the first two fit |
| advanced, arcane | **Tower-master / Tower-mistress** | High magus | Keeper of the tower | |

Plain words for pieces (altar, bench, candle stand, bell, standing stone, table stone, study table, lens, orrery, pell, quintain, archery butt, quench trough, salvage rack, bone niche, light-lens, nest) are proposed as one batch.

### 15.2 New ability names (working names; ABILITIES owns its 23)
Comfort · Omen · Vigil of the dead · Ward · Band blessing · Seal · Tower-light · Onset · Shoulder to shoulder · Track · Flight of shafts · Sure mark · Herb-lore · Triage · Green dressing · Teacher · Melt down · Maker's mark · Sound the rock · Deep sense · Follow the vein · Read the old works · Quiet the sentinel · Restore · Keep the dust · Bone-work · Grave ward · Still the mind · Calm · Wide light · Steer the laying · Turn the eggs · Warm the clutch · Read the clutch · Clutch guard.

A naming pass gives three options each before phase 3. Search first: *Seal* (D&D's arcane lock does the same), *Calm* (D&D's calm emotions), *Track* (WoW's track beasts shows beasts on the map), *Ward*. The review renamed Hold the line, Volley, Keen eye, Poultice, Prospect, Grow crystal and Steer the brood (§15.3, §19).

### 15.3 Avoided on purpose (from the drafts' slips and the lists in ABILITIES §7.3 and THEME §3.3)
| Word | Why | Draft |
|---|---|---|
| Wright, Lightwright, Warder, Delver | rank names in `rank_names.proposal.json` (checked with a Node scan, 2026-09-19) | A (first two), B (Warder) |
| Huntsman, Master smith, Knight, Champion, Squire, Chaplain, Forge-master | THEME T11's rank and title ladder | B (first three) |
| Tunneller | the kobold culture label "Tunnellers" (PEOPLES §3.8) | B |
| Bolt, Bind, Charge | OSRS spell names; `charge` is also ABILITIES' shard job | B (first two) |
| Shove | an OSRS special attack | A |
| Aimed shot, Shield wall | well-known MMO abilities | A |
| Last rite(s) | a real religious rite (THEME §3.4) | A, B |
| Far sight | Warhammer 40,000's "Farsight" | B |
| Shrine | Ultima's virtue shrines (THEME §3.3) | B |
| Falling light, Starfall | "Starfall" is another game's spell | A |
| Hatchery, Broodmother, drone, larva, hive-mind, creep | StarCraft terms (PEOPLES §1.1) | – |
| Cleric, Paladin, Ranger, Warlock, Sorcerer, Druid, Templar | D&D's class list; Templar also StarCraft | – |
| prayer, rune, essence | OSRS terms (ABILITIES, THEME) | – |
| Volley | WoW's hunter ability of the same effect (an area of arrows) | the merge |
| Keen eye | beside OSRS's Sharp Eye, Hawk Eye and Eagle Eye, which boost ranged | the merge |
| Prospect | OSRS's right-click option on rocks, with the same purpose (learn the ore) | the merge |
| Hold the line | a lord ability in Total War: Warhammer (from memory) | the merge |
| Poultice | CRAFTING's remedy `yarrow_poultice` already uses the word | the merge |
| Brood, Nest (for the swarm) | PEOPLES §1.1 and PE21: banned for the swarm's own names, castes, buildings and items | the merge (Steer the brood, Brood-shaper, Nest-tender) |
| Forge (for the star-born) | a Protoss building (PEOPLES §1.1); the star-born may take Smith | the merge (Forge hall) |
| Hive (for the swarm) | PEOPLES §1.1; ABILITIES' "hive-flesh" and "the hive" are renamed there | ABILITIES |
| Hallow | D&D's *hallow* spell sanctifies an area (SRD 5.1); ABILITIES now recommends "Greening Rite" | ABILITIES |

---

## 16. Proposals for the user (recommended option first)
Answer by number, for example "CL1 A, CL6 A, CL12 B".

1. **CL1 The gates.** **A:** the building opens the class for the faction; a person joins by path (skills and tallies), a free place and the word of a commander in its chain (this file). · B: the building alone (draft A): any adult of an allowed people can be seated, and skill only decides the tier. · C: the player assigns classes by hand, and nothing else gates them.
2. **CL2 The starter set.** **A:** the 13 classes of §3.1, with the four people-bound ones data-only until their peoples' mechanics exist. · B: the 9 shared classes first. · C: add the Trapper now.
3. **CL3 Tiers.** **A:** key levels 1/20/40/60/80, seat grades 1/1/2/2/3 (fits ABILITIES' levels). · B: 1/10/25/40/55 with four grades and a second building for tier 5 (draft A).
4. **CL4 Key skills.** **A:** one existing skill per class; no new skill besides ABILITIES' devotion. · B: a new husbandry skill for the brood and clutch classes (draft A). · C: a dedicated class skill per class.
5. **CL5 One class per person.** **A:** one. · B: one calling plus one craft class.
6. **CL6 Unlocking skills.** **A:** ABILITIES A1: anyone trains devotion and magic; only members use class prayers and spells. · B: the skill itself is sealed outside the class (both drafts): no experience at all without the class. The user's words "unlocks skills" support B; V88's own examples ("prayers for acolytes, spells for wizards") support A.
7. **CL7 Tallies in the path** (draft B): **yes** · no, skills only.
8. **CL8 Level-based grades:** the tower and the Lens hall rise through +1 and +2, the pithead reaches −1 and −2, the crypt is on −1, and the elves' bower may stand on a tree's heavy branches on +1 (PE23). **Yes** · no: grades from the room only.
9. **CL9 The class trait** of §5.1 (+4% experience, +3% speed, success, yield, +1 effective combat level per tier; never meets a requirement). **Yes** · other numbers (all catalog tuning).
10. **CL10 The training ceiling and duty pace:** input-free duties stop at key level 40. At the §2.4 rates (recomputed in the review), duty alone takes a member to tier II in about 12 game days and to tier III in about 55. **Yes** · another level · none · faster duty experience (catalog numbers only).
11. **CL11 The peoples matrix.** **A:** restrict only on V87 and PEOPLES facts (§3.2). The review lifted the star-born's bar from the Wizard for that reason. The undead's bar from faith rests on ABILITIES A11 and follows it. · B: draft B's stricter matrix (elves never smith, faith and arcane for four peoples only).
12. **CL12 Faith** (recommendation changed in the review). **A:** THEME T21 A's two ways, the temple and the stone ring, as one class, **both open to every people that may take faith**. Each culture's first choice is reversible data (`seatPrefer`: elves, orcs and lizardfolk the ring, everyone else the temple). · B: the merge's hard split by people (the ring only for elves, orcs and lizardfolk). It assigns beliefs to peoples, which THEME T21 A doesn't do and V76 forbids inventing. · C: draft B's Seer as a third way for goblins, orcs, lizardfolk and kobolds (new lore).
13. **CL13 The altar** (CRAFTING P20): **A:** a plain altar for temple grades 1–2 and CRAFTING's gold-fitted altar as the grade-3 key. · B: keep CRAFTING's single altar.
14. **CL14 Appointments.** **A:** the head inducts in every band, including the player's; the player can Assign, Refuse, Hold, Release and switch to "mine only". · B: every induction in the player's band waits for the player.
15. **CL15 Pacing caps:** 1 induction per review, 2 per band per game day, none in a person's first game day, at most half the adults of a band under 12. **Yes** · change the numbers.
16. **CL16 Lapse and change:** a lost seat lapses the class for 7 game days, then the person leaves; changing class waits 7 game days; no experience is ever lost. **Yes** · leave at once.
17. **CL17 Rank as a criterion:** Man-at-arms tiers IV–V need rank ≥ 2, and advanced classes need rank ≥ 2 and the head's word. **Yes** · no rank criteria.
18. **CL18 Novices:** teens 12–17 with a classed parent or commander get key experience × 1.25 beside a member, with no abilities and no place. **Yes** · no.
19. **CL19 Personal class gates** (§6.2): thunder-iron (Smith III); wreck-metal items (Smith IV); cutting wreck-metal (Smith IV or Salvor IV); starcloth (Salvor IV); salvaging wreck heaps (Salvor II); the remedies from the betony draught up (Herbalist II, lowered from III in the review so the gate never raises the draught's own level 26); fire arrows (Archer III). No gate raises a level CRAFTING already sets. **Yes** · none.
20. **CL20 Classes as faction tech criteria** (§6.3): castle wall and gate by mason tiers III and IV, and the sealed deep regions by Prospector IV. Building on +1/+2 by mason tier only if TECH_TREE D8 makes vertical access earned. **Yes** · no.
21. **CL21 Raising the dead.** **A:** PEOPLES' rule stands (any undead with magic 10 raises). A Dust-speaker of tier II raises at full speed and others at a quarter, and tier IV adds a bond. · B: only Dust-speakers raise.
22. **CL22 The swarm.** **A:** castes stay PEOPLES' (born by the mound's needs), and the swarm's one class is the Mound-tender, who only breaks ties between the needs (*Steer the laying*). Its first ability is ABILITIES' `alarm_scent`, not ABILITIES' first `brood_call` (a timed summon of "brood", which is StarCraft's broodlings). · B: no swarm class. · Rejected: draft B's molting castes, which contradict PEOPLES §3.11.
23. **CL23 Constructs** never take a class; a Lens-keeper of tier IV raises its band's construct cap by 1 (PEOPLES PE16 owns constructs). **Yes** · no cap change.
24. **CL24 Branches at tier III and advanced classes** (Knight-errant, Prior, Tower-master) in phase 6. **Yes** · not at all.
25. **CL25 Class garb layers** (V61) as art requests in phase 6. **Yes** · no class look.
26. **CL26 Hallowing:** ABILITIES' `hallowing` (faith tier III) is the one rule for turning cursed land (it merges draft A's tier-5 Hallow and draft B's C15). **Yes** · none in the first set.
27. **CL27 Names:** the tables of §15.
28. **CL28 A tier-up is said aloud** as a short remark (speech, V92), like a level-up; never by the swarm, which doesn't talk. **Yes** · silent (profile and chronicle only).
29. **CL29 One ability list** (new in the review). TECH_TREE §2.5.3 keeps its skill-milestone perks in `skills.unlocks`, read through `UF.Skills.abilities()` and `perk()`, and its line 210 says class abilities use that shape. ABILITIES AD1 keeps every ability in `abilities.list`. This file follows ABILITIES. **A:** one list, ABILITIES' `abilities.list`; TECH_TREE's 17 milestone perks become passive or work-perk records there, and the Unlocks view reads them. · B: two lists, milestones in `skills.unlocks` and class and spell abilities in `abilities.list`, with a check that no skill level appears in both.
30. **CL30 Seat walls follow the culture** (new in the review): every "stone walls" test reads the culture's later wall, so the wood cultures (elves, goblins, lizardfolk) reach every grade with wood walls. **Yes** · keep stone, and those three never reach the grades that need it (for elves and goblins that includes the tower's grade 1 and every Smiths' hall).

Related decisions owned elsewhere, not repeated here:
- ABILITIES A2: devotion in the combat level. Both drafts recommended against it; ABILITIES recommends for it.
- ABILITIES A3 and A4: what magic and faith are (THEME T20, T21).
- TECH_TREE D8: whether vertical access is earned.
- PEOPLES PE13, PE14, PE16 and PE17.

---

## 17. How the two drafts were judged
Both drafts were written before `PEOPLES.md` and `TECH_TREE.md` existed (both checked at about 13:53). They are judged against those files anyway, because the merged design has to fit them. Scores are 1–5, from reading both drafts in full against the files named.

### 17.1 Scores
| Criterion | Draft A: buildings are the gate | Draft B: the person's path is the gate |
|---|---|---|
| Fits the user's words (a building opens a class; classes enhance and unlock skills and abilities) | **5**: the building opens the class, literally | **4**: the seat is required, but framed as second to the path |
| Fits V39, V52, V76, V77, V84, V85, V87, V88 | **3**: clean V77/V84 link (classes as tech criteria); but the undead class uses devotion where PEOPLES and ABILITIES raise with magic, "choose the form" overlaps PEOPLES' caste choice, and the 1/10/25/40/55 tiers misfit ABILITIES' levels | **4**: tiers match ABILITIES; the class pass sits in CHAIN_OF_COMMAND's review; tallies honour V31; but molting castes contradict PEOPLES, and its mason-only upper building makes building personal against V84's reading |
| Simplicity to build on the existing code | **3**: composable grade tests, a separate daily review, sealed skills, its own fervour pool, a 14-day unseated state with tier-1 effects | **4**: grade is the seat object, tiers are never stored, one review step; branches and advanced classes add scope |
| Emergent play | **4**: need-driven appointments, raids that drop grades, classes feeding the tech tree | **5**: aspirants make leaders build seats, tallies come from real play, leaning comes from personality and ethos |
| Per-people distinctness | **3**: permissive matrix, two faith ways, four people-bound classes | **5**: seat variants, seers, trappers, castes, the elves' bower; some of it invented lore |
| Naming discipline | **3**: `TEST_` throughout and an avoided-word list; but Wright and Lightwright are rank names, and Shove, Aimed shot, Shield wall and Last rites slipped in | **3**: `TEST_` throughout and web searches; but Huntsman, Master smith, Knight, Warder and Tunneller collide, and Bolt, Bind, Far sight and Last rite slipped in |
| **Total (of 30)** | **21** | **25** |

**Base: draft B.** Its seat model is simpler, its tiers match ABILITIES, its AI lives where CHAIN_OF_COMMAND already reviews, and its aspirant loop is the strongest source of emergent play.

### 17.2 What came from each, and what was dropped
- **From draft B (the base):**
  - the path of skills and tallies; aspirants and seat demand;
  - the word through the chain; the class pass inside the review;
  - computed tiers and the 20/40/60/80 thresholds with grades 1/1/2/2/3; places summed over seats;
  - the 7-day lapse; the duty share, doubled for the undead; leaning from facets and ethos;
  - the Dust-speaker (magic) and the Lens-keeper; the elves' bower;
  - Track, Omen and Keep the dust;
  - branches and advanced classes (phase 6); novices without a place;
  - neutral ids; its name searches; **the UF_Floors finding** (verified here).
- **Grafted from draft A:**
  - **a building opens the class for the faction** (`isOpen`, `missing`, locked classes listed with their criteria);
  - room grade tests (cells, floored share, stone walls, support pieces, z, near, stock) on top of B's seat objects;
  - classes as faction tech criteria instead of B's personal build gate;
  - the need factors in the AI; the daily and small-band caps; the 7-day change cooldown;
  - the training ceiling; the rule that bonuses never meet a requirement;
  - the seat panel with next-grade tests; the "mine only" mode;
  - the matrix principle (restrict only on stated facts); THEME T21 A's two faith ways;
  - the culture weights; the Clutch-warden and the Mound-tender;
  - the smith's and prospector's tier unlocks; Quiet the sentinel; Grow crystal (replaced by Wide light in the review, §19); Seal.
- **Changed for consistency with ABILITIES, TECH_TREE and PEOPLES:**
  - no sealed or locked skills (ABILITIES A1);
  - no fervour or grace pool (ABILITIES' devotion pool);
  - no husbandry skill (ABILITIES §6.4 adds no other skill);
  - B's joining `rite` renamed `induct` (ABILITIES' `rite` is the devotion refill);
  - class traits as passive records (ABILITIES AD2);
  - no ability lists in class records (ABILITIES AD1);
  - raising and constructs left to PEOPLES; B's molting castes dropped.
- **Dropped:**
  - A's 14-day "unseated" state with tier-1 effects (B's lapse is simpler and makes seats matter);
  - A's dismissal of a member for a better candidate;
  - A's second-building-plus-20-people rule for tier 5 (replaced by the grade-3 node's "2 grade-2 seats built");
  - B's cold-iron bar on elves and its Seer as a third faith (both kept as options, CL11 B and CL12 C).

### 17.3 Findings for other owners (recorded here; in the review only ABILITIES.md was also edited)
- **F1 (UF_Floors):** rooms holding a blocking object are not rooms (lines 78 and 108, read 2026-09-19). Seats need the furniture fix (§11.8).
- **F2 (TECH_TREE.md):**
  - Lines 10, 115 and 410 cite `classes_draft_a.md`, which this merge replaced and deleted. They should cite this file: §6.3 for the class criterion and §11.2 for the modifier registries.
  - TECH_TREE D11 is answered: of the three registries the drafts asked for, only `addXpModifier` is needed.
- **F3 (TECH_TREE.md and ABILITIES.md):** the two files each hold skill-milestone abilities.
  - Both have one at woodcutting 30: TECH_TREE's `wc_swing` and ABILITIES' `clean_felling`.
  - Both propose the name **"Seam Sense"** for different effects: TECH_TREE's `mn_seam` at mining 60 (yield) and ABILITIES' `seam_sense` at mining 40 (reveal).
  - ABILITIES AD1 asks for one truth; the owners should pick one list.
  - More than names: TECH_TREE line 210 says class abilities use TECH_TREE's record shape through `UF.Skills.abilities(unit)` and `perk()`, while ABILITIES AD1 and this file put every class ability in `abilities.list`. That is the user's decision CL29.
- **F4 (PEOPLES.md and ABILITIES.md):** PEOPLES' raise (magic 10, makes a member) and ABILITIES' `wake_the_bones` (magic 15, a bound summon) are different acts. This file keeps both (§4.10) and asks CL21. **Resolved in part by the review:** `wake_the_bones`' summons now take bonds from PEOPLES' one cap (1 + floor(magic / 10)), so a raiser can't hold a full set of risen and a full set of summons at once.
- **F5 (ABILITIES.md): resolved in the review.** Its records now use this file's class ids, `modify.value` accepts `{ base, perTier }`, `study` is in its magic-experience table, and `source.seat`, `factionXpMul`, `noSeek` and `calm` are in its tables. UF_Skills' contract (`docs/systems/UF_Skills.md`) still needs `study`, `drill` and `practice` at the build.
- **F6 (names):** both drafts collided with rank names, THEME T11's ladder, a culture label and OSRS or MMO ability names (§15.3). The `catalog` check here tests equality with all four lists.
- **F7 (CHAIN_OF_COMMAND.md):** `rankAge` 18 is one age for every people. PEOPLES' stages make kobolds grown at 5 (they live 20–30) and star-born children until 30, so ranks, like classes (D13), should read each people's stages.
- **F8 (CHAIN_OF_COMMAND.md):** this file needs `UF.Command.addReviewStep` and `UF.Command.addScoreFactor`, neither of which that design has yet (§11.4).
- **F9 (WORK_TIMING.md):** it still describes gathering as attempts with a success chance (its §6.1 table). V97 (2026-09-19 14:24) replaced that with HP. The class trait's `chanceMul` now applies only to hunting and fishing (§5.1).
- **F10 (TECH_TREE.md §2.3):** the culture permissions never let elves, goblins or lizardfolk build `wall_stone`. Every design that asks for "stone walls" in a room test must say what wood cultures do; this file reads the culture's later wall (§2.2, CL30).

---

## 18. Known limits and not in the first build
- **Every number is ours and unmeasured:** tiers, traits, duty rates, beats, caps, grade tests and node levels. The checks prove the rules, not the balance. A balance pass belongs to seeded long runs and UF_Combat's review (CRAFTING D12).
- **Room detection is on the critical path:** the UF_Floors fix, rooms with z (V80), and the uncached room-scan budget problem noted in `docs/systems/UF_Floors.md`.
- **Towers, Lens halls, pitheads and crypts need the five levels.** Until upward building exists, towers and Lens halls stop at grade 1, and Wizards and Lens-keepers at tier II.
- **Four classes wait for mechanics that don't exist yet:** eggs, the mound, raising and constructs. They ship as locked data with honest reasons.
- **Faith needs** (a worship need, as in DF) are THEME T21's "later"; Comfort waits for V94's thoughts.
- **Not in the first build:**
  - casting by hand beyond ABILITIES' bar;
  - class quests and vows (THEME T23);
  - a member leaving by its own choice (waits for facets that move, V94);
  - the head dismissing a member for a better candidate;
  - item wear;
  - animal care (the hound and live-capture branches).

---

## 19. The critic's review (2026-09-19)
A critic run read this file and `docs/design/ABILITIES.md` in full and checked them against the plugins in `game/js/plugins/`, the live catalog, VISION rows V39, V50, V52, V63–V66, V76, V77, V84, V85, V87–V89, V92 and V95–V98, and PEOPLES.md, TECH_TREE.md, CRAFTING.md, CHAIN_OF_COMMAND.md, WORK_TIMING.md and THEME.md. It edited only these two files. It ran no game, test or web search. The pacing figures below come from a Node script run on UF_Skills' own curve.

### 19.1 IP (names, spells, signature mechanics)
| Found | Where | Fix |
|---|---|---|
| The Lens hall graded by crystal clusters within 20 cells: a crystal that powers a building, the Pylon PEOPLES §1.1 and PE16 forbid | §4.11 | graded by room and height only |
| *Grow crystal* placed crystal clusters; PEOPLES §3.10 says they are natural and never built | §4.11 | *Wide light* |
| ABILITIES' `brood_call`: timed spawned "brood", which is StarCraft's broodlings; "brood" and "hive" in swarm names (PE21); a creature PEOPLES doesn't have | ABILITIES #23 | `alarm_scent`, from real social insects |
| *Ward* cut one chosen attack type to × 0.6: OSRS's protection prayers, down to their 40% cut against players | §4.1 | a blessing: all types × 0.85 for 30 beats |
| *Volley* (WoW's hunter), *Keen eye* (beside OSRS's ranged prayers), *Prospect* (OSRS's rock option), *Hold the line* (Total War: Warhammer, from memory) | §4.3, §4.4, §4.8 | *Flight of shafts*, *Sure mark*, *Sound the rock*, *Shoulder to shoulder* |
| *Steer the brood*, Brood-shaper and Nest-tender (swarm names with banned words); "Hive-flesh" (ABILITIES) | §4.12, §15.1 | *Steer the laying*; Comb-tender, Dam's-hand; the pool's display name is now ABILITIES A9's proposal "Fat-store" |
| "Forge hall" for a seat the star-born may build ("Forge" is a Protoss building) | §3.1, §15.1 | Smiths' hall recommended |
| ABILITIES: `volcanic_ash` (one of the U7-derived reagent rows its own §13 refuses; U7's fire reagent is an ash) as the fire reagent; Oath-Fire's ×1.05 attack and strength, the exact numbers of OSRS's first attack and strength prayers; the op id `douse` (a U7 spell name) | ABILITIES §2.3, #2, §2.7 | `charcoal` (in the catalog); ×1.06; `extinguish`, UF_Fire's own function name |
| Names left for the search, with the reason: Seal (D&D's arcane lock), Calm, Track, Ward, Prospector (OSRS's prospector outfit), Heartening Word (close to D&D's healing word), Hallowing (D&D's hallow; Greening Rite now first), Prior and Abbot (real monastic offices, THEME T21 A) | §15, ABILITIES §7.2 | flagged, not renamed |

### 19.2 VISION
| Found | Row | Fix |
|---|---|---|
| The faith ways were a hard split by people. THEME T21 A names no peoples, and V76 forbids inventing faction lore; it also broke CL11's own principle | V76 | both ways open to all; a reversible `seatPrefer` per culture; the split is CL12 B |
| The star-born were barred from the Wizard with no V87 or PEOPLES fact | V87, CL11 | allowed |
| "Success on ore" and on salvage, and Herb-lore's "foraging chance": V97 replaced gathering attempts with HP, so there is no roll | V97, V98 | speed (damage per beat) and yield; `chanceMul` only for hunting and fishing |
| The `induct` weight 90 sat above the player's band focus (80); `seatBuild` 45 sat above food (40+) while the text said "below food" | V52, CHAIN_OF_COMMAND §3.2 | 62, 30 and 20 |
| Classes and novices used `rankAge` 18 for every people: kobolds (grown at 5, life 20–30) would wait most of their lives, star-born children (to 30) could join | V87 | each people's life stages (D13) |
| Lizardfolk nests in a roofed room would push every clutch one way under PE17; the tier-II effect named a cold rule PEOPLES doesn't have | V87, PE17 | a Nesting ground yard with no roof test; incubation × 0.85 |
| Mound-tender tier II let the tender pick any caste, over PEOPLES' needs rule | V87, PE14 | it only breaks ties between needs |
| The elves' bower "in the canopy on +1 or +2"; PEOPLES lets elves climb only to the heavy branches on +1 | V80, PE23 | +1 only |
| The swarm doesn't talk, but was given induction and tier-up remarks | V87, V92 | none for the swarm |
| *Onset* "closes up to 3 cells": a code-made lunge would break V58 | V58 | the member walks at its normal pace |

### 19.3 Code and hooks
| Found | Fix |
|---|---|
| UF_Anim's cast state is at `UF_Anim.js` lines 309–310, not 303–304 | cited correctly |
| Seats were "found from `jobs:done` of build, never by scanning", but seats aren't saved, so a load had no way to find them; and changes made through `UF.World.setObject` emit only `world:objectChanged` | a saved `seatIndex` of seat cells, kept from both events (§2.2, §10.3) |
| The room record has no doors, walls or z (`UF_Floors.js` lines 115–117) | the grade tests say how they read the boundary |
| `skills:factionLevelUp`, `tech:unlocked`, `command:review`, `command:ranks`, `addXpModifier`, `addRateModifier`, `addYieldModifier`, `addUnitLines`, `addDecider` and UF_Society.js don't exist yet | each marked with the build that brings it (§10.4, §11) |
| The commanders' class factor had no hook in CHAIN_OF_COMMAND | `UF.Command.addScoreFactor` (new, §11.4) |
| ABILITIES claimed a "unit query around a cell" that UF_Combat's seek uses; there is none (`seek` walks a list) | the support scan walks the caster's band |
| ABILITIES used `UF.Items.consume` for types; it takes an instance id | `consumeFrom(unitId, typeId, count)` |
| ABILITIES' `UF.Jobs.beatNow()` doesn't exist | marked as WORK_TIMING's; UF_Fire keeps the only beat counter today |
| The tower, Smiths' hall and others required stone walls, which TECH_TREE §2.3 never lets elves, goblins or lizardfolk build | `walls: "later"`, the culture's own later wall (CL30) |

### 19.4 Consistency between the two files and with CRAFTING
| Found | Fix |
|---|---|
| ABILITIES still used working class ids (`acolyte`, `wizard`, `martial`, `archer`, `crafter`, `starborn_adept`, `swarm_brooder`, `undead_raiser`); `crafter` doesn't exist here, so its `catalog_valid` would fail | re-keyed; `sure_hands` is a crafting-30 milestone |
| `modify.value { base, perTier }`, `factionXpMul`, study experience, a per-way ability source, and the flags for Still the mind and Calm were used here but absent there | added to ABILITIES §2.2, §2.6 and §6.2 |
| "Deed" meant a special attack there and a counter here | the counters are tallies |
| ABILITIES' commander kind `tend` clashed with CRAFTING's `tend` job, the Herbalist's duty | `attend` |
| The stone ring had no object ABILITIES' `rite` could target | the stones carry the tag `altar` |
| ABILITIES' separate dawn rite versus this file's duty share | the duty share only |
| `wake_the_bones` had its own cap beside PEOPLES' bonds | one shared bond cap |
| The Salvor's path needed a `salvaged` tally, but salvaging is gated to Salvors: a circle | 10 `mined` tallies |
| The betony draught (healing 26) gated at Herbalist III (healing 40) | tier II; §6.2 now states that no gate raises a CRAFTING level |
| `cut_relic` was gated to two classes with no rule for either-or | `anyOf` |
| *Grave ward* was triggered by "a rite" at an ossuary, which has no altar | a passive on the member's bound risen |
| *Poultice* duplicated CRAFTING's remedy name, and was a "blessing-like act" in a skill with no devotion | *Green dressing*, an active technique (ABILITIES §2.1 now allows one) |
| Human faith weight 1.2 had no data behind it; kobold and star-born "favoured" skills didn't match PEOPLES | fixed from the data |

### 19.5 Numbers and checks
- **Pacing was wrong by about 60 times.** Duty study reaches level 20 in 56 game hours and 40 in 265, not 0.9 and 4.4 (§2.4).
- **`training_ceiling` could never fail.** 200 game hours of study from magic 1 reach only level 36, so a missing ceiling was invisible. It now starts from level 38 (§12).
- **The Man-at-arms example** claimed a 7% higher max hit. `maxHitFor` rounds, so at low levels the max hit doesn't change (§5.2).
- **New check rows:** later walls, the faith preference, the betony and `cut_relic` gates, the seat index round trip, and the scoped banned words.

### 19.6 Performance (V50)
- Position-dependent effects (Shoulder to shoulder, Clutch guard, Tower-light, Keep the dust) are now re-read on the pool sweep (each unit every 10 beats), never per attack (D14).
- Omen reads CHAIN_OF_COMMAND's shared threat list once per ring every 10 beats.
- ABILITIES' light and quench triggers run inside the support scan; quench reads `UF.Fire.burningCells()`.
- Nothing in either file now scans the map or the world's unit list per frame or per beat. None of this is measured: the `perf` checks of both suites measure it at the build.

### 19.7 Still open after the review
- **CL29:** one ability list or two. TECH_TREE line 210 still points class abilities at its own record shape.
- **Other owners' files:** the findings F1–F10 (§17.3) belong to other files and were not edited.
- **Names:** every name, old and new, still needs a web search and the user's approval (AGENTS rule 7).
