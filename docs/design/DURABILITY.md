# DURABILITY: hit points, armour, tools and yields for everything in the world (VISION V95–V98)

Written 2026-09-19 by Claude Code. **Design only:** no code, catalog or art was changed for this file, and nothing in it has run in the game. Every number below was computed from the formulas in a scratch Node script (not kept in the repo). None of them was measured in the game.

The user's words, 2026-09-19:
- 14:18: "Everything in the world should have an HP/armor value that determines how difficult it is to destroy" (V95).
- 14:19: "I mean, not items, but everything like walls, etc".
- 14:20: "Creatures need tools to dig, mine, chop, etc efficiently" (V96).
- 14:24: "The defense and armor of objects does not need to be displayed, but its HP should serve as both HP and "duration" for gathering, if that makes sense" (V97).
- 14:25: "Make the amount of resources gathered from a single HP bar of anything make sense" (V98).

**Binding decisions it follows:**
- V95, V96, V97, V98.
- V4 (the campfire start) and V67 (the start kit).
- V21 (work shows physically), V25, V34 and V38 (everything is interactive).
- V61 (tools show in the hand, drawn only from sprite layers).
- V63 and V84 (skills 1–99; building is a faction level).
- V64 (combat rolls), V66 (material tiers), V71 (ownership).
- V73 (two-square walls), V74 (replenishment; minerals never come back), V77 (the builder tech tree).
- V80 and VERTICAL_WORLD.md §4.3, §5, §7.4 and §9 (the five levels).
- V85 and WORK_TIMING.md (world beats), V87 (the peoples), V91 (stacked terrain).

**Not decided here.** Every new player-visible name is a **proposal**: Sapling, Broken timber, Stone hammer, Wooden spade, Iron pry bar and the condition words. Every number is a **tuning proposal**. The user's choices are DU1–DU16 in §15.

---

## 0. Summary
- **One model for all work on an object.** Every world beat, a worker on an object deals damage from a tool, and the object's armour takes some away. What is left comes off the object's HP. At zero HP the object becomes what it becomes: a stump, loose stones, a picked bush, rubble or nothing. The HP bar is also the job's length (V97). Cooking, crafting, smithing and building keep V85's fixed beats.
- **Damage per beat:**
  - damage = tool tier × tool kind × skill × the material's weakness to that kind of blow;
  - net = damage − armour.
  - With the **right tool**, the net damage is at least 1 a beat, so the job always ends.
  - A **wrong tool or bare hands** deals a third of its damage and gets no minimum. When the net is under 0.5 a beat, or the job would take more than 60 beats, the job is not offered, and the reason reads "needs an axe".
- **What that means at level 1, with the stone tools the band can make on day one:**

  | Job | Beats |
  |---|---|
  | Loose stones | 1 |
  | A grass tuft | 2 |
  | Reeds | 3 |
  | Berries | 4 |
  | A pine | 8 |
  | An oak | 14 |
  | Copper | 14 |
  | A boulder | 24 |
  | Ironstone | 30 |

  At level 50: oak 8, ironstone 11. Bare hands cannot fell a living tree or break stone. They can pick up, gather, pull reeds and scrape soft soil.
- **Yields (V98):**
  - Each object has a whole-bar yield that fits its size: an oak 6 logs and 3 firewood, a sapling 1 log and 1 firewood, a berry bush 4 berries, a grass tuft 1 bundle of fibre, a boulder 6 stones, an ore outcrop 4 lumps of ore.
  - One piece drops at each equal slice of the HP bar, so an interrupted job keeps what it made.
  - Skill adds up to 15% extra. A poor tool only costs time.
  - A dismantled wall gives back 75% of its materials, rounded up.
- **The start never dead-locks.** Hands give loose stones and grass. Those make a stone knife. The knife cuts a sapling, which gives the first log, and the log makes the stone axe. Every start kit gets 4 saplings (§5.8).
- **Armour is never shown.** HP shows only as work progress ("Chopping an oak (40%)") and as a condition word ("Wooden door (damaged)").
- **Fire, weapons and falls use the same HP.**
  - Fire burns HP by the material's flammability.
  - Attackers break doors and walls with ordinary V64 attack rolls.
  - Collapses and falls deal crushing damage.
- **Save:** only damaged or partly worked objects keep a record, and nothing runs per frame.

---

## 1. What we read

### 1.1 UF today (read on 2026-09-19)
| Fact | Evidence |
|---|---|
| An object is only a type number per cell. It has no HP and no per-cell state | `UF_Objects.js` help, lines 14–16; `setIn` lines 165–178 |
| An object action drops **all** its yields at once, then swaps in `becomes` | `UF_Objects.js` `applyIn` lines 185–204 |
| Object jobs (chop, gather, pick, quarry, mine) apply once when `progress ≥ action.work` | `UF_Jobs.js` lines 222–243 (`objectAction`), 873–874 |
| Work advances every map update: `progress += workRate × toolMultiplier × UF.Skills.rate` | `UF_Jobs.js` lines 783, 873 |
| **"A recipe's "tool" is a tag that helps (never required)"**. A tool only multiplies speed; a missing tool never stops a job | `UF_Jobs.js` lines 763–776 (comment at 771) |
| `jobs.tool_speeds_work` checks that a stone axe doubles chop progress | `UF_Jobs.js` lines 1083–1095 |
| Re-assigning a job resets its progress to 0, so interrupted work is lost | `UF_Jobs.js` lines 704–706, 665 |
| Dismantle: 60 updates of work, then all the build items drop and the cell empties. Dig: 80 updates, with a stone 1 time in 4 | `UF_Interact.js` lines 50–54, 128–171 |
| Doors are the only things with HP today: `door.hp` 20 (wood) and 40 (stone), kept per door by UF_Doors. At 0 a door becomes its `ruin`. Nothing outside UF_Doors calls `damage` | `UF_Doors.js` lines 73–87, 309–324; catalog `door_wood`, `door_stone`; grep on 2026-09-19 |
| Fire gives a burning cell `fuel = rule.burn` beats and spends 1 a beat. At 0 the object becomes the rule's `becomes`. Every tree burns 40 beats whatever its size | `UF_Fire.js` lines 229, 395–396, 276–289; catalog `fire.rules` |
| Combat never targets objects. It rolls accuracy against defence (`hitChance`), then 0..max hit | `UF_Combat.js` lines 408–409, 471–477; grep "door\|wall" in UF_Combat: no match |
| Skill speed is `1 + 0.01 × (L − 1)`. The extra-yield roll is `L × 0.005`, once per finished job, and adds 1 of the first yield | `UF_Skills.js` lines 594–601, 525–550; catalog `skills.effects` |
| Colonists equip the best **carried** tool. Nobody fetches a tool from a store | `UF_Colonists.js` lines 994–1008 |
| Tool items: stone axe `{chop: 2}`, stone knife `{hunt: 2, gather: 1.5, craft: 1.5}`, stone pick `{quarry: 2, mine: 2, pick: 1.5}`, iron dagger `{hunt: 2.5, …}`, iron axe `{chop: 3}`. There is **no hammer, spade, pry bar or sickle** | catalog `items.types` |
| `materials.list` has 7 rows (wood, stone, bone, leather, copper, bronze, iron) with `hardness` 0–10. Its `armor` is a multiplier for **item** armour in combat. It is not about objects | catalog `materials.about` |
| **A stone wall built from 2 stones gives back 4.** Quarrying it gives stone 2, then leaves `rubble`, which gives stone 2 more | catalog `wall_stone.actions.quarry`, `rubble.actions.pick` |
| Wooden walls, wooden doors and the timber benches leave stone `rubble` when broken. The campfire leaves "Old bones" | catalog `ruin` fields |
| The plans: `forest` has **no axe or pick step**; `stone` makes the pick 3rd and the axe 11th; `workshop` builds the work stone (1 log) **before** the knives. `default` has the axe 5th and the pick 11th | catalog `colony.plan`, `colony.plans` |
| Start kit: berry bush 8, oak 8, loose stones 10, grass 60, reeds 4, boulder 4, fruit tree 1, 1–2 ore outcrops. **No sapling and no dead tree** | catalog `start.kit.objects` |

### 1.2 Other designs this one meets
- **WORK_TIMING.md (V85):**
  - Its *attempt* model for chop, mine, quarry and gather (§4.2), the `hardness` factor, `hits`, `chance` and "give up" are **replaced** for work on objects by V97's HP depletion.
  - Its progress model (crafts, cooking, building) stays.
  - Fishing and hunting keep attempts, because water and creatures are not objects.
  - Its known limit "an interrupted chop starts over" (§14) goes away: the HP now lives on the object.
- **VISION V95's last clause** says "gathering that destroys nothing keeps the attempt model". V97, added six minutes later, says berries, grass, reeds and fruit are worked by HP. This design follows V97 and reads V95's clause as fishing. That is DU1.
- **CRAFTING.md:**
  - P18 (bare hands fell common trees at half speed) is answered by V96: they don't (DU3).
  - P9 (gathering ignores skill speed) gives way to V97: skill raises damage.
  - The "charges" of §1.2–1.6 become the yield steps of §7.
  - D9's sapling (a regrowth stage) is used here as a start-kit object too.
  - The tool tiers (stone, bronze, iron, steel, meteoric, wreck-metal) become the tier damage of §5.2.
- **REMAINS.md R3** (butchering: knife 2×, axe 1.5×, hands 0.5×) becomes the knife as the right tool, with the axe and hands as weaker wrong tools (§5.1).
- **PEOPLES.md:** kobolds burrow through soil at twice others' digging speed. That becomes a natural tool (§5.5). The swarm uses no tools, so its castes' bodies are their tools (wave 2).
- **Mechanics references.** Dwarf Fortress and Old School RuneScape were not re-read for this file. WORK_TIMING §1.1–1.2 records what applies: in DF a pick's material against the wall's material changes digging speed, and a top miner is about twice as fast as a novice. In OSRS a better tool and a higher level both speed gathering.

---

## 2. The model

**Size.** An object's size counts how much stuff it holds, in units of about one log or one building stone. An oak is 10, a sapling 2 and a grass tuft 1.

**HP.**
- A natural object: `HP = round(size × material.hpPerSize)`.
- A built object: `HP = round(Σ build items × hpPerItem × build factor) × (1 + 0.005 × (B − 1))`. B is the owner faction's Building level (§9.7).

**Damage per beat** from a worker with tool kind `k` (hands count as a kind) against the material `m`:
```
damage = tierDamage(tool material) × kindFactor(k) × skill(L) × affinity(m, type(k)) × (right ? 1 : 0.35) × (dismantle with a right tool ? 2 : 1)
net    = floor₀.₁(damage − armour(m))                         (to the tenth)
right tool:            net = max(1, net)                       the job always ends
wrong tool or hands:   no minimum; offered only if net ≥ 0.5 and ceil(HP / net) ≤ 60
skill(L) = 1 + 0.01 × (L − 1)                                  1.00 at 1, 1.49 at 50, 1.98 at 99 (UF_Skills.rate, V63)
```
- **The tool used** is the best of the worker's hands and the tools the worker carries or can fetch (§5.7). A worker with a knife picks berries with its hands.
- **Skill** is the job's skill: woodcutting for chop, mining for mine, quarry and dig, foraging for gather and pick. Dismantle and repair use the faction's Building level with the builder's carpentry or masonry, `f(B) × g(T)` as WORK_TIMING §4.1 defines it.
- **Beats for a fresh object:** `ceil(HP / net)`. The check `durability.hp_is_duration` proves the game matches this.

**A worked example.** A level-1 woodcutter with a stone axe fells an oak:
- damage = 8 (stone) × 1 (axe) × 1.00 × 1.0 (hardwood against cutting) = 8;
- net = 8 − 3 (hardwood armour) = 5 a beat;
- 70 HP ÷ 5 = **14 beats**.

One piece drops every 7.8 HP: a log six times and firewood three times (§7). At level 50 the damage is 11.9 and the net 8.9, so the oak takes **8 beats**. With an iron axe (12) at level 1 it takes 8 beats.

---

## 3. Materials (hidden armour and weakness to each kind of blow)
- **Damage types:**
  - cutting: axe, knife, sickle;
  - crushing: hammer, pry bar, bare hands;
  - piercing: pick;
  - digging: spade;
  - fire.
- **Affinity** multiplies the incoming damage of that type. 1 is normal, below 1 the material resists, above 1 it gives way easily.
- **Armour** is subtracted after the affinity. It never applies to fire. For fire the affinity is the whole defence (§9.2), so stone at 0 never burns. That is how V95's "damage that the armour reduces" holds for fire.
- **Where the ids live.** The ids are new rows in a new catalog block, `durability.materials` (§11). They are not added to `materials.list`, whose `armor` field means item armour in combat (COMBAT_CHAINS). A tool's *tier* is still read from its item's `material` in `materials.list`, or from CRAFTING's `tier` once that lands.

| Material (id) | Used by | HP per size unit | Armour | Cutting | Crushing | Piercing | Digging | Fire |
|---|---|---|---|---|---|---|---|---|
| Crop (`crop`) | the fruit tree's and berry bush's harvest (a second HP bar, §4.2) | 4 | 0 | 1 | 1 | 1 | 0.5 | 1 |
| Soft plant (`plant_soft`) | grass, fern, wild grain and wheat, flowers, lichen, lily pads | 4 | 0 | 1.5 | 1 | 0.5 | 1 | 1 |
| Reed (`reed`) | reeds | 4 | 0 | 1.5 | 0.7 | 0.5 | 0.8 | 2.5 |
| Succulent (`succulent`) | cactus, tall cactus | 5 | 0 | 1.5 | 0.8 | 1 | 0.8 | 0 |
| Woody shrub (`plant_woody`) | shrub, desert shrub, snow bush, a picked berry bush | 5 | 1 | 1.2 | 1 | 0.4 | 0.6 | 1.2 |
| Green wood (`wood_green`) | sapling (new) | 5 | 1 | 1.2 | 0.4 | 0.4 | 0.4 | 0.5 |
| Dead wood (`wood_dead`) | dead tree | 4 | 1 | 1 | 0.8 | 0.6 | 0.3 | 0.7 |
| Softwood (`wood_soft`) | pine, snow fir, birch, swamp tree, palm, blighted tree | 6 | 2 | 1 | 0.5 | 0.5 | 0.2 | 1.2 |
| Hardwood (`wood_hard`) | oak, fruit tree, flat-top tree, mangrove, broadleaf giant, stump | 7 | 3 | 1 | 0.5 | 0.5 | 0.2 | 1 |
| Timber, built (`timber`) | wooden wall, wooden door, benches, racks, bridge, plank floor | 8 | 2 | 1 | 1 | 0.5 | 0.2 | 1 |
| Straw (`straw`) | straw bed, rush floor | 2 | 0 | 1.5 | 1 | 1 | 1 | 0.5 |
| Cloth (`cloth`) | later: rugs, tents | 2 | 0 | 1.5 | 0.8 | 1 | 1 | 1 |
| Hide (`hide`) | later: hide tents | 3 | 1 | 1 | 0.6 | 1 | 0.5 | 0.5 |
| Bone (`bone`) | later: bone structures (loose bones are Loose pieces) | 4 | 2 | 0.5 | 1.2 | 0.8 | 0.5 | 0.1 |
| Loose pieces (`loose`) | loose stones, gravel, rubble, small crystals, old bones, broken timber (new), the campfire's ring | 3 | 0 | 0.1 | 1 | 1 | 1 | 0 |
| Soil (`soil`) | ground kinds meadow, lush grass, dry grass, scrub soil, leaf litter, needle floor, jungle floor, tundra, dirt, packed earth, ash, blighted and flowering grass; the farm plot | 4 | 0 | 0.3 | 0.5 | 0.7 | 1 | 0 |
| Stony soil (`soil_stony`) | stony ground, scree | 5 | 1 | 0.2 | 0.5 | 0.8 | 0.8 | 0 |
| Sand (`sand`) | sand | 3 | 0 | 0.2 | 0.3 | 0.5 | 1.2 | 0 |
| Clay (`clay`) | red clay | 5 | 1 | 0.3 | 0.5 | 0.8 | 0.9 | 0 |
| Mud (`mud`) | mud, swamp mud | 3 | 0 | 0.3 | 0.3 | 0.5 | 1 | 0 |
| Peat (`peat`) | later: peat earth on −1 | 4 | 0 | 0.6 | 0.5 | 0.6 | 1 | 0.3 |
| Snow (`snow`) | snow | 2 | 0 | 0.5 | 1 | 0.5 | 1.2 | 0 |
| Ice (`ice`) | ice | 5 | 2 | 0.3 | 1.2 | 1 | 0.3 | 0 |
| Soft stone (`stone_soft`) | later: sandstone, limestone, chalk on −1 | 8 | 3 | 0.05 | 0.9 | 1 | 0.1 | 0 |
| Hard stone (`stone_hard`) | granite boulder; bare rock and rock face; later granite and basalt cells | 9 | 5 | 0.05 | 0.8 | 1 | 0.05 | 0 |
| Dressed stone, built (`stone_dressed`) | stone wall, stone door, work stone, furnace, smithy, well, fallen pillar, flagstone floor | 8 | 3 | 0.05 | 1 | 1 | 0.05 | 0 |
| Obsidian (`obsidian`) | later: obsidian on −2 | 8 | 6 | 0.05 | 1.3 | 0.9 | 0.05 | 0 |
| Copper ore (`ore_copper`) | copper outcrop | 9 | 4 | 0.05 | 0.8 | 1 | 0.05 | 0 |
| Gold ore (`ore_gold`) | gold outcrop (gold in quartz) | 9 | 4 | 0.05 | 0.8 | 1 | 0.05 | 0 |
| Iron ore (`ore_iron`) | ironstone outcrop | 10 | 6 | 0.05 | 0.7 | 1 | 0.05 | 0 |
| Coal (`coal`) | later: coal seam (CRAFTING P4) | 7 | 3 | 0.1 | 1 | 1 | 0.2 | 0.5 |
| Crystal (`crystal`) | crystal cluster | 8 | 7 | 0.05 | 1 | 0.8 | 0.05 | 0 |
| Metal fittings, built (`metal`) | later: iron-bound doors, bars, grates | 10 | 10 | 0.1 | 0.6 | 0.4 | 0 | 0 |
| Flesh (`flesh`) | carcasses (REMAINS.md; not a catalog object) | 4 | 0 | 1.5 | 0.5 | 1 | 0.3 | 0.3 |
| Stockpile zone (`zone`) | stockpile (fire only; it stands for the goods stacked there) | 20 flat | 0 | 1 | 1 | 1 | 1 | 2 |

Rules of thumb behind the columns:
- Blades cannot cut stone, ore or metal (cutting 0.05–0.1).
- Wood shrugs off crushing and piercing (0.5), but built timber gives way at its joints to a hammer (1.0).
- Brittle crystal and obsidian are weak to crushing.
- Soil yields to digging and resists everything else.
- Armour climbs from plants (0) through woods (1–3) and stone (3–5) to iron ore (6) and crystal (7), so better tools matter more on harder things.

---

## 4. HP per object

### 4.1 The rules
- **Natural objects:** `HP = round(size × hpPerSize)`, with the size in the tables below. Size also drives the yield (§7.1), so HP and yield come from one number.
- **Built objects:** `HP = round(Σ count × hpPerItem × factor)`.
  - hpPerItem: log 8, stone 8, iron bar 10, copper bar 8, fibre 1, straw 1.
  - Factor: wall 2.5, door 2.5, bridge 2.5, workshop 1.5, furniture 1.5, floor 1.5, bed 1, hearth 0.5.
  - This keeps UF_Doors' door HP exactly: a wooden door is 1 log × 8 × 2.5 = 20, and a stone door is 2 × 8 × 2.5 = 40.
- **The owner faction's Building level** raises built HP by 0.5% a level (§9.7).
- **An explicit `hp` field on an object overrides the formula.** No current object needs one.

### 4.2 Two bars on one cell: the body and the crop
Picking fruit must not hurt the tree. So an object whose `gather` leaves it standing (the fruit tree and the berry bush) has two bars:
- the **crop** bar, the harvest (material `crop`): worked by gathering, and at zero the object becomes its picked state (`fruit_tree_bare`, `berry_bush_bare`);
- the **body** bar, the plant itself: worked by chopping, burnt by fire and damaged by attacks.

A regrown plant has both bars full. Every other object has only its body bar.

### 4.3 Natural objects: every current catalog object
Beats are at level 1 and at level 50, with the band's first right tool: hands, a stone knife, a stone axe or a stone pick. "Bare hands" is level 1 with no tool. "No headway" means the job isn't offered bare-handed (§2). Burn beats are an undamaged object's burn time, UF_Fire's rule today → this design (§9.2).

| Object | Material | Size | HP | Work: right tools | Beats L1 · L50 | Bare hands, L1 | Burns: today → new |
|---|---|---|---|---|---|---|---|
| Sapling (**new**, proposed) | wood_green | 2 | 10 | chop: axe, knife | 2 · 1 (stone axe); 4 · 3 (stone knife) | no headway | no rule → 20 |
| Palm | wood_soft | 4 | 24 | chop: axe | 4 · 3 | no headway | 40 → 20 |
| Dead tree | wood_dead | 5 | 20 | chop: axe | 3 · 2 | no headway | 30 → 29 |
| Blighted tree | wood_soft | 4 | 24 | chop: axe | 4 · 3 | no headway | 40 → 20 |
| Birch | wood_soft | 6 | 36 | chop: axe | 6 · 4 | no headway | 40 → 30 |
| Swamp tree | wood_soft | 6 | 36 | chop: axe | 6 · 4 | no headway | 40 → 30 |
| Flat-top tree | wood_hard | 6 | 42 | chop: axe | 9 · 5 | no headway | 40 → 42 |
| Mangrove | wood_hard | 6 | 42 | chop: axe | 9 · 5 | no headway | 40 → 42 |
| Fruit tree (body) | wood_hard | 6 | 42 | chop: axe | 9 · 5 | no headway | 40 → 42 |
| Fruit tree (picked) | wood_hard | 6 | 42 | chop: axe | 9 · 5 | no headway | 40 → 42 |
| Pine | wood_soft | 8 | 48 | chop: axe | 8 · 5 | no headway | 40 → 40 |
| Snow fir | wood_soft | 8 | 48 | chop: axe | 8 · 5 | no headway | 40 → 40 |
| Oak | wood_hard | 10 | 70 | chop: axe | 14 · 8 | no headway | 40 → 70 |
| Broadleaf giant | wood_hard | 14 | 98 | chop: axe | 20 · 12 | no headway | 40 → 98 |
| Stump | wood_hard | 2 | 14 | chop: axe | 3 · 2 | no headway | 20 → 14 |
| Fruit tree (crop) | crop | 4 | 16 | gather: hands, sickle | 6 · 4 (hands) | 6 | the body burns, not the crop |
| Berry bush (crop) | crop | 3 | 12 | gather: hands, sickle | 4 · 3 (hands) | 4 | the body burns |
| Berry bush (body; also the picked bush) | plant_woody | 2 | 10 | none today | – | – | 8 → 9 |
| Cactus | succulent | 2 | 10 | gather: knife, sickle | 3 · 2 (stone knife) | 13 (wrong tool: spines) | never |
| Tall cactus (action `chop` becomes `gather`, CRAFTING §1.6) | succulent | 4 | 20 | gather: knife, sickle | 5 · 3 (stone knife) | 25 (wrong tool) | never |
| Shrub | plant_woody | 2 | 10 | gather: hands, sickle | 5 · 3 (hands) | 5 | 8 → 9 |
| Desert shrub | plant_woody | 1.2 | 6 | gather: hands, sickle | 3 · 2 | 3 | 8 → 5 |
| Snow bush | plant_woody | 1.2 | 6 | gather: hands, sickle | 3 · 2 | 3 | 8 → 5 |
| Tall grass | plant_soft | 1 | 4 | gather: hands, sickle | 2 · 1 | 2 | 4 → 4 |
| Fern | plant_soft | 1 | 4 | gather: hands, sickle | 2 · 1 | 2 | 4 → 4 |
| Reeds | reed | 2.5 | 10 | gather: knife, sickle, hands | 3 · 2 (stone knife) | 5 | 4 → 4 |
| Wild grain | plant_soft | 2 | 8 | gather: hands, sickle | 3 · 2 | 3 | 4 → 8 |
| Wild wheat | plant_soft | 2 | 8 | gather: hands, sickle | 3 · 2 | 3 | 4 → 8 |
| Wildflowers, purple, blue and white flowers | plant_soft | 0.5 | 2 | none | – | – | 4 → 2 |
| Lichen | plant_soft | 0.5 | 2 | none | – | – | 4 → 2 |
| Lily pads | plant_soft | 0.5 | 2 | none | – | – | never (keeps UF_Fire's `never`) |
| Loose stones | loose | 1 | 3 | pick: hands | 1 · 1 | 1 | never |
| Gravel | loose | 0.7 | 2 | pick: hands | 1 · 1 | 1 | never |
| Rubble | loose | 1 | 3 | pick: hands | 1 · 1 | 1 | never |
| Old bones | loose | 0.7 | 2 | pick: hands | 1 · 1 | 1 | never |
| Small crystals | loose | 0.7 | 2 | pick: hands | 1 · 1 | 1 | never |
| Broken timber (**new**, proposed; §7.1) | loose | 1 | 3 | pick: hands | 1 · 1 | 1 | never (already burnt or broken) |
| Fallen pillar | stone_dressed | 4 | 32 | quarry: pick, hammer | 7 · 4 (stone pick) | no headway | never |
| Granite boulder | stone_hard | 8 | 72 | quarry: pick, hammer | 24 · 11 | no headway | never |
| Copper outcrop | ore_copper | 6 | 54 | mine: pick | 14 · 7 | no headway | never |
| Ironstone outcrop | ore_iron | 6 | 60 | mine: pick | 30 · 11 | no headway | never |
| Gold outcrop (mining 37, WORK_TIMING W4) | ore_gold | 5 | 45 | mine: pick | at 37: 7; at 50: 6 | no headway | never |
| Crystal cluster (mining 26, W4) | crystal | 4 | 32 | mine: pick | at 26: 32; at 50: 13 | no headway | never |

Note on the crystal cluster: with a stone pick the net is 8 × skill × 0.8 − 7. At level 26 that is 1.0, the right-tool minimum, so 32 beats. At level 50 it is 2.5 (13 beats). An iron pick at level 26 nets 5.0 (7 beats). Crystal is the one resource that pushes gem miners toward iron picks.

### 4.4 Built objects: every current catalog building, plus the floors
The dismantle beats use a stone hammer (§5.6) with the ×2 joint bonus of the owner's own dismantling (§5.1). The first figure is at faction Building 1 with trade 1. The second is at Building 50 with carpentry or masonry 50, `f × g` = 1.49 × 1.245. "Returns" is `ceil(75%)` of each build item (§7.1).

| Object | Build items | Material | Factor | HP | Dismantle beats | Bare hands | Returns | Ruin when broken by force | Burns: today → new |
|---|---|---|---|---|---|---|---|---|---|
| Campfire | log 3, stone 3 | loose (a ring of stones) | 0.5 | 24 | 4 · 3 (hands are the right tool) | 4 | log 3, stone 3 | loose stones (was old bones) | a fire source; never burns out |
| Wooden wall | log 1 | timber | 2.5 | 20 | 2 · 1 | no headway | log 1 | broken timber (was rubble) | 30 → 20 |
| Stone wall | stone 2 | stone_dressed | 2.5 | 40 | 4 · 2 | no headway | stone 2 | rubble | never |
| Wooden door | log 1 | timber | 2.5 | 20 (UF_Doors: 20) | 2 · 1 | no headway | log 1 | broken timber (was rubble) | 24 → 20 |
| Stone door | stone 2 | stone_dressed | 2.5 | 40 (UF_Doors: 40) | 4 · 2 | no headway | stone 2 | rubble | never |
| Straw bed | straw 2 | straw | 1 | 2 | 1 · 1 | 2 (wrong tool) | straw 2 | nothing | 6 → 4 |
| Work stone | stone 2, log 1 | stone_dressed | 1.5 | 36 | 3 · 2 | no headway | stone 2, log 1 | rubble | never |
| Furnace | stone 6 | stone_dressed | 1.5 | 72 | 6 · 3 | no headway | stone 5 | rubble | never |
| Smithy | stone 4, log 1, iron bar 1 | stone_dressed | 1.5 | 75 | 6 · 3 | no headway | stone 3, log 1, iron bar 1 | rubble | never |
| Bowyer's bench | log 2 | timber | 1.5 | 24 | 2 · 1 | no headway | log 2 | broken timber (was rubble) | 20 → 24 |
| Fletcher's bench | log 2, stone 1 | timber | 1.5 | 36 | 3 · 2 | no headway | log 2, stone 1 | broken timber (was rubble) | 20 → 36 |
| Tanning rack | log 3, fibre 2 | timber | 1.5 | 39 | 3 · 2 | no headway | log 3, fibre 2 | broken timber (was rubble) | 20 → 39 |
| Weapon rack | log 2 | timber | 1.5 | 24 | 2 · 1 | no headway | log 2 | broken timber (was rubble) | 10 → 24 |
| Plank bridge (no `build` today; log 2 proposed) | log 2 | timber | 2.5 | 40 | 3 · 2 | no headway | log 2 | nothing (open water again) | 24 → 40 |
| Well (no `build` today; stone 4 proposed) | stone 4 | stone_dressed | 1.5 | 48 | 4 · 2 | no headway | stone 3 | rubble | never |
| Farm plot | none | soil | – | 8 (flat) | dig it over: 2 with a wooden spade | 16 (wrong tool) | nothing | – | never |
| Stockpile | none | zone | – | 20 (flat) | removing the zone is instant, as today | – | – | – | 10 → 10 |
| Plank floor (UF_Floors ground kind; human, elf) | log 1 (culture data) | timber | 1.5 | 12 | 1 · 1 | no headway | log 1 | the ground under it | no rule → 12 |
| Flagstone floor (dwarf, gnome, automaton) | stone 1 | stone_dressed | 1.5 | 12 | 1 · 1 | no headway | stone 1 | the ground under it | never |
| Rush floor (goblin, orc) | straw 2 | straw | 1.5 | 3 | 1 · 1 | 3 (wrong tool) | straw 2 | the ground under it | no rule → 6 |

- **Walls take longer to smash than to build or dismantle.** A wooden wall is built in 3 beats (WORK_TIMING §6.3) and dismantled by its owner in 2. A troll needs about 5 blows to smash it (§9.1).
- **Later objects use the same rule.** A roof is a floor on the level above (VERTICAL_WORLD §5.3). V90's chests and barrels (DRAG_DROP.md), and furniture, use factor 1.5. For example, a chest of 2 logs would have 24 HP. They get rows when they reach the catalog.

### 4.5 Ground cells (dig, channel and mine; V80, V91)
The ground is not an object, but digging acts on it, so a cell gets a virtual HP bar from its ground kind's material. The bar is stored like an object's (§10).
- **Size 2:** stripping today's turf (UF_Interact's dig, which turns the ground to dirt).
- **Size 12:** removing a whole solid cell on −1 or −2, or inside a V91 hill (VERTICAL_WORLD §5.1 `mine`).
- **Size 4:** channelling (removing a floor).

Columns: wooden spade, iron spade, stone pick, iron pick, bare hands (all at level 1), and kobold claws (§5.5).

| Cell | Material | HP | Wooden spade | Iron spade | Stone pick | Iron pick | Hands | Kobold claws |
|---|---|---|---|---|---|---|---|---|
| Strip the turf (today's dig) | soil | 8 | 2 | 1 | 2 | 1 | 16 | 1 |
| Solid earth cell | soil | 48 | 12 | 4 | 9 | 6 | no headway | 3 |
| Stony ground cell | soil_stony | 60 | 28 | 7 | 12 | 7 | no headway | 6 |
| Sand cell | sand | 36 | 8 | 3 | 9 | 6 | no headway | 2 |
| Clay cell | clay | 60 | 24 | 7 | 12 | 7 | no headway | 5 |
| Mud cell | mud | 36 | 9 | 3 | 9 | 6 | no headway | 3 |
| Snow cell | snow | 24 | 5 | 2 | 6 | 4 | 24 | 2 |
| Soft stone cell | stone_soft | 96 | no headway | no headway | 20 | 11 | no headway | no headway |
| Hard stone cell (bare rock, rock face, granite) | stone_hard | 108 | no headway | no headway | 36 | 16 | no headway | no headway |

Yields:
- **Soil cells:** a stone 1 time in 4 at zero, today's rule. Earth items (clay, sand, peat) come with RESOURCE_ATLAS's resources.
- **Stone cells:** stone 8 (soft) or 9 (hard), one per step.
- **Ore veins inside cells:** follow their outcrop rows.
- **A change in today's rule:** today UF_Interact digs bare rock like soil. After this change, rock and rock face need a pick.

### 4.6 Not objects
- **Items** have no HP (the user, 14:19). Tools don't wear out.
- **Creatures and people** keep their combat hitpoints (V64).
- **Carcasses** are REMAINS' records, not catalog objects. REMAINS adopts §5.1's butchering rule with flesh HP by size class: small 8, medium 16, large 32, huge 64. With a stone knife those take 2, 4, 7 and 14 beats.

---

## 5. Tools (V96)

### 5.1 Each kind of work and its tools
| Work (action) | Skill | Right tools (full damage, at least 1 a beat) | Wrong tools that still make headway (a third of the damage, no minimum) | Bare hands |
|---|---|---|---|---|
| gather: berries, fruit, grass, fern, grain, shrubs | foraging | hands, sickle | an axe or knife does no better than hands, so hands are used | the right tool |
| gather: reeds | foraging | knife, sickle, hands | axe (3 beats) | right tool, slower (5 beats against 3 with a knife) |
| gather: cactus, tall cactus (spines) | foraging | knife, sickle | – | wrong tool: 13 and 25 beats |
| pick: loose stones, gravel, rubble, old bones, small crystals, broken timber | foraging | hands | any | the right tool |
| chop: trees, stumps | woodcutting | axe; **knife on a sapling only** | none on living trees | no headway |
| quarry: boulders, fallen pillar | mining | pick, hammer | – | no headway |
| mine: ore, crystal, stone cells | mining | pick | – | no headway |
| dig, channel: soil, sand, clay, mud, snow cells | mining | spade, pick | – | soft soil and snow only, slowly |
| dismantle: own or unowned built things (V71) | faction Building, with carpentry (timber) or masonry (stone) | hammer, pry bar; axe on timber; pick on dressed stone; hands on loose pieces (the campfire) | – | never timber or stone |
| repair (§9.6) | faction Building | hammer | hands at half rate | yes, slowly |
| butcher (REMAINS) | hunting | knife | axe | small and medium carcasses only (16 and 32 beats) |

**The joint bonus.** A right tool deals **×2** when dismantling. Taking a thing apart along its joints is quicker than smashing it. Enemies never dismantle: they break things through combat (§9.1). So owners strip a wall in 2 beats, and a troll needs 5 blows.

### 5.2 Damage by tool tier (right tool, level 1)
| Tier (item `material`; CRAFTING tiers later) | Tier damage | Axe on an oak (70) | Axe on a pine (48) | Pick on ironstone (60) | Pick on a boulder (72) |
|---|---|---|---|---|---|
| hands | 3 | – | – | – | – |
| wood (wooden spade) | 4 | – | – | – | – |
| bone | 5 | – | – | – | – |
| stone | 8 | net 5 → 14 beats | 6 → 8 | 2 → 30 | 3 → 24 |
| copper | 9 | 6 → 12 | 7 → 7 | 3 → 20 | 4 → 18 |
| bronze | 10 | 7 → 10 | 8 → 6 | 4 → 15 | 5 → 15 |
| iron | 12 | 9 → 8 | 10 → 5 | 6 → 10 | 7 → 11 |
| steel (CRAFTING) | 14 | 11 → 7 | 12 → 4 | 8 → 8 | 9 → 8 |
| meteoric (CRAFTING P1, proposal) | 16 | 13 → 6 | 14 → 4 | 10 → 6 | 11 → 7 |
| wreck-metal (CRAFTING P1, proposal) | 18 | 15 → 5 | 16 → 3 | 12 → 5 | 13 → 6 |

- **Kind factors:** axe, pick, spade, hammer, pry bar and hands 1.0; sickle 0.8; knife 0.4.
- **Damage types:** axe, knife and sickle cut; hammer, pry bar and hands crush; the pick pierces; the spade digs.
- **Higher tiers never make a job slower.** The check `durability.tool_tiers` proves it. Harder materials reward better tools most. Iron is 1.75× stone on an oak and 3× on ironstone, because armour takes the same amount off every blow.

### 5.3 Skill (V63)
| Level | skill(L) | Stone axe on an oak | Stone pick on ironstone | Stone knife on reeds |
|---|---|---|---|---|
| 1 | 1.00 | net 5 → 14 | 2 → 30 | 4.8 → 3 |
| 10 | 1.09 | 5.7 → 13 | 2.7 → 23 | 5.2 → 2 |
| 25 | 1.24 | 6.9 → 11 | 3.9 → 16 | 5.9 → 2 |
| 50 | 1.49 | 8.9 → 8 | 5.9 → 11 | 7.1 → 2 |
| 75 | 1.74 | 10.9 → 7 | 7.9 → 8 | 8.3 → 2 |
| 99 | 1.98 | 12.8 → 6 | 9.8 → 7 | 9.5 → 2 |

Skill multiplies the damage before armour. So a master is about ×2.3 faster on wood and ×4.3 faster on iron ore. That fits V63 ("higher levels work faster") and the DF note that skill matters most on hard rock. Required levels (V84, WORK_TIMING W4: gold 37, crystal 26) stop a person from taking the job at all. This file only reads them.

### 5.4 Wrong tools and bare hands (level 1)
| Worker and object | Net a beat | Beats |
|---|---|---|
| Stone knife on an oak | 0 | no headway ("needs an axe") |
| Iron dagger on an oak | 0 | no headway |
| Stone pick on an oak | 0 | no headway |
| Bare hands on an oak | 0 | no headway |
| Bare hands on a sapling | 0 | no headway |
| Stone knife on a sapling (the sapling lists the knife) | 2.8 | 4 |
| Bare hands on a dead tree | 0 | no headway |
| Bare hands on reeds (reeds list hands) | 2.1 | 5 |
| Stone axe on reeds | 4.2 | 3 |
| Bare hands on a cactus | 0.8 | 13 |
| Stone axe on a boulder | 0 | no headway ("needs a pick") |
| Stone hammer on a boulder (right tool for quarrying) | 1.4 | 52 (the pick takes 24) |
| Stone hammer on ironstone | 0 | no headway |
| Stone pick on a crystal cluster (right tool; the minimum applies; its level gate aside) | 1.0 | 32 (iron pick: 13) |
| Bare hands on a stone wall | 0 | no headway |
| Bare hands on a wooden wall | 0 | no headway |
| Stone axe on a wooden wall (own, dismantling) | 14 | 2 |

So hard materials cannot be worked bare-handed, and soft things can, slowly. That is V96 as the user put it.

### 5.5 Natural tools (creatures and peoples)
| Who | Natural tool | Acts as | Damage | Where it works | Status |
|---|---|---|---|---|---|
| Every person of every people | hands | hands | 3, crushing | picking, gathering, reeds, snow, turf | this design |
| Kobolds (PEOPLES: burrow soil, clay, sand and loam at twice others' digging speed, never stone) | claws | spade | 16, digging (a stone spade's 8, doubled) | soil, sand, clay, mud, peat, snow; stone gives no headway | PEOPLES proposal |
| Swarm castes (PEOPLES wave 2: "no tools or arms") | mandibles; digging claws | axe, knife; spade | 8 | wood and plants; soil | placeholder until the caste design |
| Boar | tusks | spade | 6 | turf and soil (rooting) | capability only; no behaviour uses it yet |
| Troll, bog horror | the body | combat (§9.1) | the V64 max hit | doors, walls, workshops | `breaks: true` (DU15) |
| Every other animal | – | – | – | never works or breaks objects | – |

A creature's natural tool is catalog data on its species or people (`natural: { kind, as, damage, materials }`). The engine treats it like a carried tool that is always present.

### 5.6 Tool items
| Item | Kind | Tier | Status | Recipe |
|---|---|---|---|---|
| stone_knife | knife | stone | exists | exists: stone 1, fibre 1 |
| stone_axe | axe | stone | exists | exists: stone 2, log 1, fibre 1 |
| stone_pick | pick | stone | exists | exists: stone 2, log 1, fibre 1 |
| dagger_iron | knife | iron | exists | exists (smithy) |
| axe_iron | axe | iron | exists | exists (smithy) |
| **stone_hammer**, "Stone hammer" (proposal) | hammer | stone | new | stone 2, log 1, fibre 1, anywhere (like the axe) |
| **spade_wood**, "Wooden spade" (proposal) | spade | wood | new | log 1, anywhere; a knife speeds it (recipe `tool`) |
| **prybar_iron**, "Iron pry bar" (proposal) | pry bar | iron | later | bar_iron 1 at the smithy |
| sickle (CRAFTING §2.3: bronze or iron) | sickle | bronze or iron | later | CRAFTING |

- **The item schema.** `tool: { kind: "axe" }` replaces `tool: { chop: 2 }`. The tier comes from the item's `material`.
- **Speed multipliers stay only for jobs that are not object work.** They live in `tool.speeds`: the knife's hunt ×2 and craft ×1.5, today's `hunt`, `gather` and `craft` numbers. `gather` is dropped, because gathering is object work now. WORK_TIMING's `toolSpeed` reads `speeds`.
- **Every new tool needs its art** before it ships (V61: sprites only): a ground sprite, a 32×32 icon and an 8-way equipment layer (AR-600). The build writes the requests (§9.5).

### 5.7 Fetching, equipping and who takes the job (V61, V96)
- **`UF.Durability.bestTool(unit, object, action)`** returns the option with the highest net damage. The options are the worker's hands, its natural tool, every tool it carries, and the nearest reachable unheld tool that the colony may use (V71: faction-owned or unowned) within the colony's radius (search order: a stockpile, a weapon rack, the ground). The answer is `{ kind, itemId | null, net, beats, fetch: { itemId, x, y } | null }`, or `null` with a reason.
- **Before an object job, UF_Colonists' planner:**
  1. equips the best carried tool when it isn't in hand (today's `toolJob`, 1 beat, shown in the hand through the V61 layer);
  2. fetches the best store tool first when it beats every carried option: a `fetch` job, then `equip`;
  3. when no tool makes headway and a recipe for a right tool exists that the band can make now, does that craft first (the "tool first" rule, §5.8);
  4. otherwise skips the step, and the designation keeps its reason ("needs an axe").
- **Job-taking prefers people who hold the right tool.**
  - `UF.Jobs.take` scores an object job for a unit by priority, then by whether the unit **holds** a right tool (holders first), then by distance.
  - A new object designation is also held for `durability.holderGraceBeats` (5) beats for units that hold a right tool. After that anyone who can fetch one may take it.
  - The dry run in `take` (UF_Jobs lines 735–742) already skips jobs a unit cannot plan. With this change `plan` fails with "needs an axe" when `bestTool` has nothing.
- **Tools stay with the worker** after the job, as today. Carried tools weigh what their items weigh. Returning tools to a store is a later hauling rule.
- **Replaced:**
  - the comment "tool helps, never required" (UF_Jobs line 771) and the `toolMultiplier` path for object jobs;
  - the check `jobs.tool_speeds_work` (lines 1083–1095), replaced by `durability.tool_tiers` and `durability.tools_required`;
  - the catalog `items.about` text "tool = what jobs it speeds up".
- **Kept:** recipes keep `tool` as a speed tag for crafting (V85's fixed beats). A recipe may name a compulsory tool with CRAFTING's `needs`.
- **Menu labels** (UF_Interact, V38): "Chop" becomes "Chop (needs an axe)" when nobody in the colony has or can make a right tool. The same pattern dig uses today at line 479. The option stays enabled as a designation that waits.

### 5.8 The start never dead-locks (V4, V67)
**The chain, from nothing but hands**, for the V67 kit plus the proposed saplings (computed by a fixed-point search over the kit and the tool recipes):
1. With hands: loose stones → stone; grass → fibre; reeds → straw; berries.
2. Stone + fibre → **stone knife**.
3. With the knife: a sapling → **log** (4 beats) and firewood.
4. Stone + log + fibre → **stone axe**, **stone pick** and **stone hammer**. Log → **wooden spade**.
5. With the axe: oaks. With the pick: boulders and ore.

**Without saplings the search stops at the stone knife.** No log can be had without an axe, and the axe needs a log. So:
- **`start.kit.objects.sapling: 4`** (DU4). UF_WorldGen already places missing kit objects within `radius` 5–20. The sapling is CRAFTING D9's object: passable, and it regrows into a tree later (UF_Ecology, Codex's file: a note for Codex).
- **World generation** also scatters saplings at the edges of tree clumps. The `mapKit.objects` minimum is 30.
- **The planner's "tool first" rule** (§5.7) reorders any plan whose early step needs an input only a tool can get. The workshop plan builds its work stone (1 log) before knives today. It now makes a knife and cuts a sapling first.
- **Every plan template gets its tools right after `knives` (DU13):**
  - default and forest: `axe` (count 2), then `pick` (1);
  - stone: `pick`, then `axe` (count 2);
  - workshop: `knives` moved before `workstone`, then `axe` and `pick`;
  - all plans: `hammer` (1) when the first dismantle or repair is designated, and `spade` (1) when the first dig is.

  The kit sizing (`start.kit.firstStage`) grows by 1 log, 2 stones and 1 fibre for the second axe. The worldgen check `kit_covers_plan` recomputes, and §7.4 lists the totals.
- **Hunger never waits on a tool:** berries, fruit, grain and small carcasses all work bare-handed.

---

## 6. HP as duration (V97)

### 6.1 One beat of work on an object
```
on each world beat (WORK_TIMING §3: UF.Jobs.beatNow()), for a job in state "work" on an object:
  opt  = UF.Durability.bestTool(unit, target, action)       (cached on the job; re-read when equipment changes)
  if there is no option → fail(job, reason)                  ("needs an axe")
  dealt = min(opt.net, hp(target, part))
  UF.Durability.damage(target, part, dealt, { type, source: unit, jobId })
     → the record's damage += dealt; each HP slice crossed releases one yield piece (§7.1)
     → skill xp += xpPerBar × dealt / maxHp (§6.4)
  if hp == 0 → UF.Objects.applyIn(area, x, y, action, unit, { yields: false }) (the object becomes its becomes; regrowth scheduled as today)
             → the damage record is removed → jobs:done
```
- **One step per beat**, only on beat boundaries. It never runs per frame (V50).
- **Interrupted jobs keep their place.** A job that is cancelled, re-assigned or interrupted by a need leaves the damage on the object. The next worker continues from there. So `assign()` resetting `progress` to 0 no longer loses work, because the HP holds it.
- **`job.progress`** becomes the damage this job dealt. It still feeds UF_Skills' and WORK_TIMING's readers.
- **Several workers on one object** isn't designed. The rule stays one job per object (§16).

### 6.2 What keeps V85's fixed beats
Cooking, crafting, smithing, smelting, fletching, carpentry, leatherwork, building, laying floors, hauling, equipping and needs keep WORK_TIMING's progress model. Fishing and hunting keep its attempt model, because water and creatures are not objects (DU1). Butchering follows §5.1 when REMAINS lands.

### 6.3 The common jobs, level 1 and level 50, with the band's first right tool
| Job | HP | Tool | L1 net → beats | L50 net → beats | Bare hands, L1 |
|---|---|---|---|---|---|
| Pick up loose stones | 3 | hands | 3 → **1** | 4.4 → 1 | 1 |
| Gather a grass tuft | 4 | hands | 3 → **2** | 4.4 → 1 | 2 |
| Cut a sapling | 10 | stone axe | 8.6 → **2** | 13.3 → 1 | no headway |
| Dismantle a wooden wall (own) | 20 | stone hammer ×2 | 14 → **2** | 27.6 → 1 | no headway |
| Dismantle a wooden door (own) | 20 | stone hammer ×2 | 14 → **2** | 27.6 → 1 | no headway |
| Cut reeds | 10 | stone knife | 4.8 → **3** | 7.1 → 2 | 5 |
| Gather berries | 12 | hands | 3 → **4** | 4.4 → 3 | 4 |
| Dismantle a stone wall (own) | 40 | stone hammer ×2 | 13 → **4** | 26.6 → 2 | no headway |
| Fell a pine | 48 | stone axe | 6 → **8** | 9.9 → 5 | no headway |
| Fell an oak | 70 | stone axe | 5 → **14** | 8.9 → 8 | no headway |
| Mine copper | 54 | stone pick | 4 → **14** | 7.9 → 7 | no headway |
| Quarry a granite boulder | 72 | stone pick | 3 → **24** | 6.9 → 11 | no headway |
| Mine ironstone | 60 | stone pick | 2 → **30** | 5.9 → 11 | no headway |

A sapling cut with the stone knife, the only way before the first axe, takes 4 beats at level 1 and 3 at level 50.

**Order check.** At level 1 the order is:

> loose stones 1 < grass 2 = sapling 2 = wooden wall 2 = door 2 < reeds 3 < berries 4 = stone wall 4 < pine 8 < oak 14 = copper 14 < boulder 24 < ironstone 30.

- The things V97 names come out in its order: "a berry bush takes a few beats, an oak many, ironstone more".
- Soft before hard; small before large; wood before stone; copper (the soft ore) before iron.
- Dismantling your own wall is short, but smashing it is not (§9.1).
- At level 50 the hard jobs shrink most: ironstone ×2.7, oak ×1.75, berries ×1.3. That is the point of skill on hard materials.

**Compared with WORK_TIMING's attempt estimates (§5):**
- An oak took 8 beats with a stone axe there; here it takes 14. It yielded 3 logs there; here it yields 6 logs and 3 firewood, so the time per log is about the same (2.7 there, 2.3 here).
- Ironstone took 22 beats; here it takes 30, for 4 ore instead of 2.
- Beats here are derived from HP, not stored as durations, so WORK_TIMING's `maxBeats` (30) doesn't bind them. Only one job takes longer than 30 beats with its first right tool at its gate level: the crystal cluster with a stone pick, 32 beats (§4.3 note).

### 6.4 Experience
- **When it is paid.** Experience comes as HP comes off, in proportion. The worker earns `xpPerBar × dealt / maxHp` each beat, so an interrupted job pays for what it did, and a full bar pays `xpPerBar`.
- **`xpPerBar`** is the action's `xp` field when it has one, else `round(perHp × HP)`. perHp: woodcutting 0.4, foraging 0.5, mining 0.5, faction Building 0.3.
  - Woodcutting: oak 28, pine 19, birch 14, broadleaf giant 39, sapling 4, stump 6.
  - Foraging: berries 6, fruit 8, grass 2, reeds 5.
  - Building: a wooden wall 6, a stone wall 12, a furnace 22.
- **Mining keeps WORK_TIMING §6.7's per-job values as `xp` overrides:** ironstone 37, copper 37, gold 45, crystal 29, granite boulder 29, fallen pillar 21. That way ore pays more than plain stone.
- **A better tool or a higher level pays more experience per beat**, as in OSRS, because the work is faster.
- **Beats that deal nothing pay nothing.** That can't happen with a right tool, whose minimum is 1.
- **Replaced:** WORK_TIMING's "experience once per finished action" for object work, and UF_Skills' `jobXp` for those job types.

---

## 7. Yields (V98)

### 7.1 The rules
- **The whole bar is data.** `actions.<a>.yields` lists everything the object gives from full HP to zero. The numbers are in §7.2 and follow the size: an object of size N gives about N pieces. Trees give a little less (bark and waste), and loose piles give a little more (small pieces).
- **Steps:**
  - The bar is cut into as many equal slices as there are pieces (U), and one piece is released as each slice boundary is crossed.
  - **Which piece:** unit j of an item listed with n units is due at fraction j/n of the bar. Pieces come out in order of their due fraction, ties in catalog order.
  - The oak (6 logs, 3 firewood) gives, slice by slice (7.8 HP each): log, log, firewood, log, log, firewood, log, log, firewood.
  - Ironstone (4 ore, 1 stone) gives ore, ore, ore, ore, stone.
- **Where pieces drop:**
  - on the object's cell when it's passable (grass, reeds, loose stones, a crop);
  - otherwise on the worker's stand cell, so the logs pile up beside the woodcutter as the tree comes down (V21);
  - the last piece lands on the object's cell when the object turns into something passable (a stump, loose stones);
  - pieces go through `UF.Items.drop` as today and stack by the item's `stack`.
- **Interrupted work keeps its pieces.** They are already on the ground, and the object keeps its damage (§10). The saved `released` count stops a slice from paying twice, even after a plant heals (§9.8).
- **Extra yield (V63).**
  - At each piece, a seeded roll gives one more of that piece with chance `level × 0.0015` (0.15% at 1, 7.5% at 50, 14.9% at 99). The roll is `hash32(seed, SALT_YIELD, cellKey, step, unitId)`.
  - An oak felled at 99 gives about 1.3 extra pieces on average.
  - This replaces UF_Skills' per-job roll (`L × 0.005` for 1 of the first yield) for object work. Fishing and hunting keep theirs.
- **A poor tool wastes nothing but time** (V98). Yields never depend on the tool, only the beats do.
- **Dismantling** gives `ceil(0.75 × n)` of each build item, released in steps like any yield, so "most of its material back". The item counts are in §4.4.
- **Broken by force** (siege, fire burn-out, collapse), a structure gives no pieces. It becomes its `ruin`, and the ruin's pickup gives what survived: rubble gives stone 2; broken timber gives firewood 2.
- **Fixes to today's data:**
  - `wall_stone.actions.quarry` becomes stone 2 with `becomes: null`. It was stone 2 plus rubble, 4 stones from a 2-stone wall.
  - Wooden things' `ruin` becomes the new `broken_timber`, not stone rubble.
  - The campfire's `ruin` becomes `rocks_small`, not old bones.

### 7.2 The yield table (every object with a work action)
The value of a beat at level 1 uses the internal worth table of the check (§7.3), with the band's first right tool.

| Object | Today (all at once) | Whole bar (new) | Pieces | HP per piece | Becomes | Value a beat, L1 | Group |
|---|---|---|---|---|---|---|---|
| Sapling (new) | – | log 1, firewood 1 | 2 | 5 | nothing | 2.00 | trees |
| Palm | log 1 | log 2, fibre 2 (fronds) | 4 | 6 | stump | 1.75 | trees |
| Dead tree | log 1, firewood 2 | log 1, firewood 4 | 5 | 4 | stump | 2.33 | trees |
| Blighted tree | log 1 | log 2, firewood 1 | 3 | 8 | stump | 1.75 | trees |
| Birch | log 2 | log 3, firewood 1 | 4 | 9 | stump | 1.67 | trees |
| Swamp tree | log 2 | log 3, firewood 1 | 4 | 9 | stump | 1.67 | trees |
| Flat-top tree | log 2 | log 3, firewood 2 | 5 | 8.4 | stump | 1.22 | trees |
| Mangrove | log 2 | log 3, firewood 2 | 5 | 8.4 | stump | 1.22 | trees |
| Fruit tree (body) | log 3 | log 3, firewood 2 | 5 | 8.4 | stump | 1.22 | trees |
| Fruit tree (picked) | log 3 | log 3, firewood 2 | 5 | 8.4 | stump | 1.22 | trees |
| Pine | log 3 | log 5, firewood 1 | 6 | 8 | stump | 2.00 | trees |
| Snow fir | log 3 | log 5, firewood 1 | 6 | 8 | stump | 2.00 | trees |
| Oak | log 3 | log 6, firewood 3 | 9 | 7.8 | stump | 1.50 | trees |
| Broadleaf giant | log 4 | log 9, firewood 4 | 13 | 7.5 | stump | 1.55 | trees |
| Stump | log 1 | log 1 | 1 | 14 | nothing | 1.00 | trees |
| Fruit tree (crop) | fruit 3 | fruit 5 | 5 | 3.2 | fruit_tree_bare | 1.25 | food |
| Berry bush (crop) | berries 2 | berries 4 (a handful) | 4 | 3 | berry_bush_bare | 1.00 | food |
| Cactus | fruit 1 | fruit 2 | 2 | 5 | nothing | 1.00 | food |
| Shrub | fibre 2 | fibre 2 | 2 | 5 | nothing | 0.20 | fibre |
| Desert shrub | fibre 1 | fibre 1 | 1 | 6 | nothing | 0.17 | fibre |
| Snow bush | fibre 1 | fibre 1 | 1 | 6 | nothing | 0.17 | fibre |
| Tall cactus | fibre 2 | fibre 2, firewood 1 (dry ribs) | 3 | 6.7 | nothing | 0.40 | fibre |
| Tall grass | fibre 1 | fibre 1 (a bundle) | 1 | 4 | nothing | 0.25 | fibre |
| Fern | fibre 1 | fibre 1 | 1 | 4 | nothing | 0.25 | fibre |
| Reeds | straw 2 | straw 2 | 2 | 5 | nothing | 0.33 | fibre |
| Wild grain | seeds 1, straw 1 | seeds 1, straw 1 | 2 | 4 | nothing | 0.33 | fibre |
| Wild wheat | seeds 1, straw 1 | seeds 1, straw 1 | 2 | 4 | nothing | 0.33 | fibre |
| Loose stones | stone 2 | stone 2 | 2 | 1.5 | nothing | 3.00 | loose |
| Gravel | stone 1 | stone 1 | 1 | 2 | nothing | 1.50 | loose |
| Rubble | stone 2 | stone 2 | 2 | 1.5 | nothing | 3.00 | loose |
| Old bones | bone 2 | bone 2 | 2 | 1 | nothing | 2.00 | loose |
| Broken timber (new) | – | firewood 2 | 2 | 1.5 | nothing | 2.00 | loose |
| Small crystals | rough gem 1 | rough gem 1 | 1 | 2 | nothing | 10.00 | precious |
| Fallen pillar | stone 3 | stone 4 | 4 | 8 | nothing | 0.86 | rock |
| Granite boulder | stone 4 | stone 6 (+ loose stones: 2 more) | 6 | 12 | rocks_small | 0.38 | rock |
| Copper outcrop | copper ore 2, stone 1 | copper ore 4, stone 1 (+ 2 in the loose stones) | 5 | 10.8 | rocks_small | 0.96 | rock |
| Ironstone outcrop | iron ore 2, stone 1 | iron ore 4, stone 1 (+ 2) | 5 | 12 | rocks_small | 0.58 | rock |
| Gold outcrop | gold 1, stone 1 | gold 2, stone 1 (+ 2) | 3 | 15 | rocks_small | 3.64 (at mining 37) | precious |
| Crystal cluster | rough gem 2 | rough gem 3 (+ 1 in the small crystals) | 3 | 10.7 | crystal_small | 0.94 (at mining 26) | precious |

- Wildflowers, lichen, lily pads and the picked berry bush have no work action and yield nothing, as today.
- Built objects' returns are in §4.4.
- Ore never regrows (V74). CRAFTING's P8 "veins return" would need the user to change V74.

### 7.3 The consistency check (value a beat)
**The worth table.** It is internal, used only by the check, and never shown: berries 1, fruit 1.5, seeds 0.5, fibre 0.5, straw 0.5, log 3, firewood 1, stone 1.5, copper ore 3, iron ore 4, bone 1, gold 12, rough gem 10. It can become trade value later.

**The rule.** An object's value a beat is the worth of its whole bar divided by its level-1 beats with the band's first right tool. Inside each group, every object must lie within **0.5–2.0×** of the group's median. Precious yields (gold, gems) are exempt, because they are gated by level and rarity and are checked by order only.

| Group | Objects | Median value a beat | Lowest | Highest | Range against the median | Result (computed) |
|---|---|---|---|---|---|---|
| trees | 15 | 1.67 | 1.00 (stump) | 2.33 (dead tree) | 0.60–1.40 | within bounds |
| food | 3 | 1.00 | 1.00 (berry bush) | 1.25 (fruit tree) | 1.00–1.25 | within bounds |
| fibre | 9 | 0.25 | 0.17 (desert shrub) | 0.40 (tall cactus) | 0.67–1.60 | within bounds |
| loose | 5 | 2.00 | 1.50 (gravel) | 3.00 (loose stones) | 0.75–1.50 | within bounds |
| rock | 4 | 0.72 | 0.38 (granite boulder) | 0.96 (copper) | 0.52–1.34 | within bounds |

**Order checks** (the same check):
- Whole-bar pieces: broadleaf giant 13 > oak 9 > pine 6 > birch 4 > sapling 2.
- A boulder gives more stone than loose stones: 6 + 2 against 2.
- Every ore outcrop gives at least 3 ore.
- A berry bush gives 3–6 berries. A grass tuft gives exactly 1 fibre.
- Dismantling returns at least 50% and never more than 100% of every build item. This catches the 4-from-2 wall.
- A full HP bar never yields less than 1 piece.

**Across groups** (reported, not bounded): quarrying and mining with stone tools pay the least per beat (0.4–1.0) and felling trees the most (1.2–2.3). Stone is hard work until iron picks. With an iron pick, ironstone rises to 1.8 a beat.

### 7.4 Effect on the start kit (V67)
The kit's own objects now hold:
- **Logs:** 8 oaks × (6 + 1 from the stump) + fruit tree 3 + 1 + 4 saplings × 1 = **64 logs** (was 36), plus 30 firewood.
- **Stones:** 20 from loose stones + 4 boulders × (6 + 2) = 32, plus 3 per ore outcrop, which is 55–58 (was 44).
- **Fibre:** 60 (unchanged).
- **Food:** 8 bushes × 4 berries + 5 fruit = 37 (was 19).

The need for the most demanding culture rises by the second axe: 17 logs, 42 stones and 59 fibre. Grass stays the tight one (60 against 59), so DU13 proposes `grass_tuft: 64` in the kit.

---

## 8. What the player sees (V97, V62)
- **Armour, defence, affinity and the numbers of HP are never shown.** They appear in no tooltip, card, sheet, menu, bark or log line. The check `durability.armour_hidden` enforces it.
- **Work progress replaces WORK_TIMING's attempt labels for object work** (`UF.Jobs.label`, §8 there):

  | Form | Text |
  |---|---|
  | Short (look tooltip) | "Chopping an oak (40%)" |
  | Long (colonist card, character sheet) | "Chopping an oak: 40% done, 4 of 9 pieces out, about 8 beats left" |
  | On the way | "Chopping an oak: on the way" |
  | No tool | "Chopping an oak: needs an axe" (the job's failure reason) |

  The percentage is `1 − hp/maxHp` of the bar being worked. "Pieces out" is the released count. "Beats left" is `ceil(hp / net)` for this worker.
- **Condition words** (proposals, plain English). UF_Look's object line (UF_Look line 223) puts the word in brackets after the name, for example "Wooden door (damaged) — dismantle":

  | Object and state | Word |
  |---|---|
  | A natural object partly worked | "partly chopped", "partly mined", "partly quarried", "partly picked", "partly dug" |
  | Burnt (the scorched flag, §9.2) | "scorched" |
  | A built object at 67–99% | "slightly damaged" |
  | A built object at 34–66% | "damaged" |
  | A built object at 1–33% | "badly damaged" |
  | A built object being dismantled by its owner | "partly dismantled" |
  | At full HP | nothing |

- **Nothing floats over heads** (V62). A breaking door is seen in its sprite state (§9.5) and in the chronicle line UF_Doors already writes ("A door was broken.").

---

## 9. Other things that deal damage

### 9.1 Weapons against structures (V64, VERTICAL_WORLD §7.4)
- **Only enemies smash.** A unit attacks a structure cell (a door, wall, workshop, bridge or floor) only when its faction is hostile to the owner and its AI needs the way through. VERTICAL_WORLD §7.4: "only if their species, equipment and faction rules grant that capability". Owners and unowned things are dismantled, never attacked.
- **Each attack is a normal V64 attack.** It happens at the weapon's speed in combat ticks, with the attacker's effective level, style and equipment bonuses, and V64's rolls.
- **A structure never dodges.** Its defence roll is 0, so the hit chance is `1 − 1/(A + 1)`, 0.99 or more for anyone.
- **Damage:** `net = floor₀.₁(rolled × affinity(material, type)) − armour`, with no minimum.
  - Stab counts as piercing, slash as cutting, and crush as crushing.
  - The right-tool minimum and the joint bonus don't apply. Smashing is slower than taking apart.
- **No combat experience** for hitting objects (DU15). Walls are not training dummies.
- **At zero** the structure becomes its `ruin` (§4.4). A door does so through `UF.Doors.damageAt`, which keeps UF_Doors' own record and chronicle line (§12).

Expected blows at ×1. Attack speed is in 0.6 s combat ticks, and max hits come from the catalog's combat data with `levelOffset` 8:

| Attacker | Max hit | Wooden door or wall (20) | Stone door or wall (40) |
|---|---|---|---|
| Troll (crush, 6 ticks) | 13 | 5 hits, about 18 s | 11 hits, about 40 s |
| Bog horror (slash, 5 ticks) | 9 | 8 hits, about 24 s | never (blades can't cut stone) |
| Person, strength 50, iron axe (slash, 6 ticks) | 9 | 8 hits, about 29 s | never |
| Person, strength 50, club or copper mace (crush, 4 ticks) | 7 | 11 hits, about 26 s | 32 hits, about 77 s |
| Person, strength 1, iron axe | 2 | never | never |
| Aurochs (crush, 5 ticks), if ever flagged | 3 | 80 hits, about 4 min | never |
| Wolf (stab, 4 ticks) | 3 | never | never |

So stone walls stop swords, maces take a minute, and trolls are the real threat. That is sensible for the first sieges. A band of five with clubs breaks a stone door in about 15 s.

### 9.2 Fire (UF_Fire)
- **Each beat a burning object takes `fire.damage × fire affinity`.** With `fire.damage` = 1, hardwood loses 1.0 a beat, softwood 1.2, straw 0.5 and stone 0. No armour applies (§3).
- **UF_Fire's per-rule `burn` goes away.** A burning cell's fuel becomes `ceil(hp / fireDamage)` at ignition and is re-read each beat, so a half-chopped oak burns for half as long.
- **Unchanged:** the rule's `spread`, `becomes`, `dousedBecomes`, `ground`, `destroysItems`, `never` and `source`.
- **At zero HP the rule's `becomes` applies,** as today. `UF.Durability.damage(..., { type: "fire" })` does it, so the damage record is cleaned up the same way.
- **A doused object keeps its damage** and gets the `scorched` flag (§8). A scorched structure can be repaired.
- **Burn times** of undamaged objects are in the tables of §4.3–4.4:
  - bigger trees burn longer (oak 70, pine 40, birch 30, broadleaf giant 98, where every tree burns 40 today);
  - wooden walls 20 (30 today), doors 20 (24), straw beds 4 (6), grass 4 (4).
- **These change how far fire spreads.** Spread per beat is unchanged, but burn time changes, so the fire suite re-measures (DU9).

### 9.3 Falls and collapse (VERTICAL_WORLD §5.2, §5.4)
- **Supports.** When a supporting wall, floor or natural cell reaches 0 HP, it is removed. VERTICAL_WORLD's support graph then re-checks only that component.
- **Collapse.** An unsupported component collapses as one queued event.
  - Every structure cell in it becomes its `ruin` at the landing cell, or its returns as items when the landing cell is taken.
  - Each deals `collapse.damage` (20) × levels fallen, as crushing, to the object on the landing cell. The object's affinity and armour apply as usual.
- **Falls.** A falling object deals and takes `fall.damage` (10) × levels fallen, crushing. Falling items have no HP (§4.6).
- **Creatures** that fall or are buried take VERTICAL_WORLD's own fall rule on their combat HP, not this one.
- **Trees across levels (§4.3 there).** A tree's HP bar is on its base cell at `z = 0`. When it reaches zero, the whole tree's cells on `+1` and `+2` go with it. Its pieces drop at `z = 0` around the base. A falling trunk hitting things below is a later option (§16).

### 9.4 Creatures that break things
- **Breakers.** Species with `breaks: true` may attack blocking structures under §9.1. Proposed: troll and bog horror (DU15).
- **Diggers.** Species with a natural digging tool (§5.5) may dig only where their behaviour asks for it: kobold burrows (PEOPLES) and boar rooting (later).
- **Animals** never work or break objects.
- **Whose code.** UF_Wildlife is claimed by the DF creature AI run and UF_Combat is shared, so the AI side is a hook by alias in the build (§12).

### 9.5 Damage states for the art (a request for Gemini)
The build adds these to `docs/ASSET_REQUESTS.md` and writes `docs/handoffs/HANDOFF_durability.md` (CLAUDE.md: every feature that needs art ships with a handoff). This file makes neither.
- **Overlays**, not new frames per object. They are drawn by UF_Durability over the object's own sprite, as art only (V58, V61).
  - `!$UF_Damage_Timber` and `!$UF_Damage_Stone`: two stages each, "cracked" (below 67% HP) and "broken" (below 34%), in 48×48 frames and in 48×96 wall frames (V73), bottom-centre anchored like the walls.
  - `!$UF_Damage_Scorch`: soot for timber and trees, in 48×48 and 48×96.
  - An object whose sidecar lists `animations.cracked` or `animations.broken` uses those frames instead.
- **New objects:** `sapling` (48×48, a young tree of the oak family at V81 small-plant scale) and `broken_timber` (48×48, a heap of splintered planks on the ground).
- **New tools:** stone hammer and wooden spade, each a ground sprite, a 32×32 icon and an AR-600 8-way equipment layer. The iron pry bar comes later.
- **Stand-ins until then:** stock RMMZ tiles for the sapling (Outside_B's small tree) and for broken timber. Each gets a replacement request naming the stock asset (CLAUDE.md). There are no code-drawn overlays: until the overlays arrive, the condition word is the only sign.

### 9.6 Repair
- **The job.** `repair` is a new job type on a damaged structure. It is offered to the owner faction only when the structure is below full HP.
- **Material.** The job needs `max(1, ceil(missing ÷ maxHp × Σ build items × 0.5))` of the object's main build item, fetched first. A wooden door at 10 of 20 needs 1 log. A stone wall at 20 of 40 needs 1 stone.
- **Work.** HP comes back at `tierDamage(hammer) × f(B) × g(T)` a beat, with bare hands at half rate. A stone hammer at Building 1 does 8 a beat, so that door takes 2 beats and that wall 3.
- **At full** the record is removed and the scorched flag clears.
- **Natural objects are never repaired.** They heal (§9.8).

### 9.7 The faction's Building level and materials (V84, V77)
- **Maximum HP grows with the owner's current Building level:** `maxHp = base × (1 + 0.005 × (B − 1))`. That is ×1.245 at 50 and ×1.49 at 99.
  - A structure's owner is its V71 owner or its site's faction. It is read live, so the effect is retroactive: a faction's walls strengthen as its builders gain experience.
  - The record stores **damage taken**, not HP left (§10). A rising level therefore adds HP to damaged structures too, and needs no per-structure data.
- **Materials set armour and HP per item.** Dressed stone takes swords to no effect (§9.1), and timber burns.
- **Later materials are catalog rows, unlocked through the V77 tech tree** (TECH_TREE.md). Examples in plain English, all proposals: brick; an iron-bound door (timber with 1 iron bar, armour 2 + 3). They add HP and armour without code.

### 9.8 Healing (V74)
- **Living plants heal fully.** When a partly worked tree, bush or crop is left alone for its heal time, it is back to full. The heal time is the object's `regrow.hours`, else 72 game hours for trees and 24 for other plants. The check is lazy: when the record is read (§10), `now − lastBeat ≥ healBeats` means full, and the record is deleted.
- **Minerals, built things and ground cells never heal** (V74: finite minerals don't come back).

---

## 10. Save, performance and the five levels

### 10.1 Save
```
UF.World.state.durability = {
  version: 1,
  cells: { "<ax>,<ay>,<z>:<x>,<y>[:crop]": [damage, lastBeat, released, flags] }   // only damaged or partly worked objects
}
```
- **`damage`** is HP taken, to the tenth. HP = maxHp − damage.
- **`lastBeat`** is the world beat of the last damage, used for healing.
- **`released`** is the number of yield pieces already out.
- **`flags`**: bit 1 = scorched.
- **When a record goes away:**
  - the object on the cell changes: UF_Objects emits `objects:changed`, and the record is deleted there, so a new object starts at full;
  - the object heals;
  - the object is repaired to full.
- **Doors keep UF_Doors' own record** (`hp`, `maxHp` per door; Codex's). UF_Durability reads and writes a door's HP through `UF.Doors`, so a door's HP is never stored twice (§12).
- **An old save** (no `durability` key) loads with every object at full HP. UF_Doors' records load as today.
- **Jobs saved in mid-work** keep their `lastBeat` reset (WORK_TIMING §3). The object's damage carries the progress, so neither a reload nor an interruption or re-assignment loses work. In WORK_TIMING (§14), landed hits live on the job, so an interrupted chop starts over.

### 10.2 Performance (V50)
- **No per-frame work.** Durability code runs only:
  - on a beat, for each object job in state `work` (one lookup and a few multiplications);
  - on a beat, for each burning cell (already UF_Fire's loop);
  - on a combat hit against a structure;
  - when an object changes (one key deleted);
  - when a label or look line asks for a condition (one lookup).
- **No scans.** Records are a plain object keyed by cell. Healing is lazy, and nothing sweeps the map.
- **Budget** (checked, §13): with 200 active object jobs, the durability step averages under 0.02 ms per job per beat (WORK_TIMING's work budget). A counter proves no durability code runs between beats.

### 10.3 The five levels (V80, V91)
- **Every key and API call carries `z`.** The same cell on two levels has two records. Before UF_Levels lands, `z` is 0.
- **Terrain cells on −1 and −2** (VERTICAL_WORLD §3.2 cell state), and V91's hill cells, get their material from the cell's stone or soil kind and their HP from §4.5.
- **Off-screen levels** only change when a job or event touches them. Nothing ticks there.
- **Multi-level trees** have one bar at the base (§9.3).

---

## 11. Catalog schema (written by the build with a layout-preserving node script; never `ConvertTo-Json`, ENGINE_RULES §4)
A new top-level key:
```json
"durability": {
  "about": "Hit points, armour, tools and yields for world objects (docs/design/DURABILITY.md, VISION V95-V98). Armour is never shown.",
  "version": 1,
  "minNet": 1, "noHeadway": 0.5, "wrongTool": 0.35, "wrongToolMaxBeats": 60, "skillPerLevel": 0.01,
  "types": ["cutting", "crushing", "piercing", "digging", "fire"],
  "materials": { "wood_hard": { "name": "Hardwood", "hpPerSize": 7, "armour": 3,
                 "affinity": { "cutting": 1, "crushing": 0.5, "piercing": 0.5, "digging": 0.2, "fire": 1 } } },
  "tools": {
    "tiers": { "hands": 3, "wood": 4, "bone": 5, "stone": 8, "copper": 9, "bronze": 10, "iron": 12, "steel": 14, "meteoric": 16, "relic": 18 },
    "kinds": { "axe": { "type": "cutting", "factor": 1 }, "pick": { "type": "piercing", "factor": 1 }, "spade": { "type": "digging", "factor": 1 },
               "hammer": { "type": "crushing", "factor": 1 }, "prybar": { "type": "crushing", "factor": 1 }, "knife": { "type": "cutting", "factor": 0.4 },
               "sickle": { "type": "cutting", "factor": 0.8 }, "hands": { "type": "crushing", "factor": 1 } }
  },
  "work": {
    "gather": { "skill": "foraging", "tools": ["hands", "sickle"] }, "pick": { "skill": "foraging", "tools": ["hands"] },
    "chop": { "skill": "woodcutting", "tools": ["axe"] }, "quarry": { "skill": "mining", "tools": ["pick", "hammer"] },
    "mine": { "skill": "mining", "tools": ["pick"] }, "dig": { "skill": "mining", "tools": ["spade", "pick"] },
    "dismantle": { "skill": "building", "tools": ["hammer", "prybar"], "byMaterial": { "timber": ["axe"], "stone_dressed": ["pick"], "loose": ["hands"] }, "jointBonus": 2, "returns": 0.75 },
    "repair": { "skill": "building", "tools": ["hammer"], "handsRate": 0.5, "materialShare": 0.5 },
    "butcher": { "skill": "hunting", "tools": ["knife"] }
  },
  "build": { "hpPerItem": { "log": 8, "stone": 8, "bar_iron": 10, "bar_copper": 8, "fiber": 1, "straw": 1 },
             "factor": { "wall": 2.5, "door": 2.5, "bridge": 2.5, "workshop": 1.5, "furniture": 1.5, "floor": 1.5, "bed": 1, "hearth": 0.5 },
             "factionPerLevel": 0.005 },
  "ground": { "strip": 2, "cell": 12, "channel": 4, "kinds": { "meadow": "soil", "stony": "soil_stony", "rock": "stone_hard" } },
  "fire": { "damage": 1 }, "fall": { "damage": 10 }, "collapse": { "damage": 20 },
  "heal": { "treeHours": 72, "plantHours": 24 },
  "yield": { "extraPerLevel": 0.0015 },
  "xp": { "perHp": { "woodcutting": 0.4, "foraging": 0.5, "mining": 0.5, "building": 0.3 } },
  "jobs": { "holderGraceBeats": 5 },
  "condition": { "bands": [0.67, 0.34], "built": ["slightly damaged", "damaged", "badly damaged"], "dismantling": "partly dismantled",
                 "worked": { "chop": "partly chopped", "mine": "partly mined", "quarry": "partly quarried", "gather": "partly picked", "dig": "partly dug" },
                 "scorched": "scorched" },
  "check": { "worth": { "berries": 1, "fruit": 1.5, "log": 3, "stone": 1.5 }, "bounds": [0.5, 2.0], "precious": ["gold", "gem_rough"] }
}
```
(`materials` holds every row of §3, and `ground.kinds` covers all 26 ground kinds. Both are shortened here.)

Fields on existing entries:
- **`objects[]`:**
  - `material`;
  - `size` for natural objects (built ones use `build.items`);
  - optional `hp`;
  - `crop: { material, size }` for the fruit tree and berry bush;
  - `breaks` is on species, not objects.
- **`objects[].actions.<a>`:**
  - `yields`: the whole bar (§7.2);
  - optional `tools` to override the work kind's list (sapling: axe, knife; reeds: knife, sickle, hands; cactus and tall cactus: knife, sickle);
  - optional `xp`;
  - optional `part: "crop"` (the fruit tree's and berry bush's `gather`);
  - `work` goes, because HP is the duration;
  - WORK_TIMING's `attempt`, `hits`, `chance` and `hardness` are never written for object actions, or are removed if they were.
- **`objects[]` fixes:**
  - `wall_stone.actions.quarry` becomes `becomes: null`;
  - `ruin` becomes `broken_timber` for wall_wood, door_wood, the three benches and the weapon rack;
  - the campfire's `ruin` becomes `rocks_small`;
  - `cactus_tall.actions.chop` becomes `gather`;
  - `bridge` and `well` get `build`.
- **New objects:** `sapling`, `broken_timber`.
- **`objects[].door.hp`** stays and equals the durability HP (UF_Doors reads it).
- **`items.types[].tool`:** `{ kind, speeds? }`, replacing the job-multiplier map (§5.6).
- **New items and recipes:** `stone_hammer`, `spade_wood`; later `prybar_iron`.
- **`wildlife.species[]`** and **`people[]`:** optional `natural` and `breaks`.
- **`start.kit.objects`:** + `sapling: 4`; `grass_tuft: 64` (DU13). **`start.mapKit.objects`:** + `sapling: { min: 30 }`.
- **`colony.plan`, `colony.plans.*`:** the tool steps of §5.8.
- **`fire.rules[].burn`** is removed (§9.2). `fire.about` is reworded.
- **`skills.effects.extraYield.jobs`** becomes `["fish", "hunt"]`. Object work uses `durability.yield`.
- **`items.about`, `recipes.about`:** the tool text is reworded (§5.7).

---

## 12. Engine changes (for the build)
| File (owner; claims in STATUS on 2026-09-19) | Change |
|---|---|
| new `UF_Durability.js` (Claude Code) | Materials, `maxHp`, `hp`, `condition`, `bestTool`, `net`, `damage(cell, part, amount, { type, source })`, yield steps and releases, extra-yield rolls, healing, the save state, the siege damage entry for UF_Combat, the fire hook, overlays drawn from the art sheets, `simulate(object, unitLike)` for checks and tuning, and the `durability` suite. Plugin order: after UF_Objects, UF_Items, UF_Jobs and UF_Skills, before UF_Colonists' checks. Registered with `tools/register_world_plugins.js` |
| `UF_Jobs.js` (Claude Code; the paths run and the work-timing build also edit it: merge rule) | Object work steps by HP (§6.1) in place of the attempt engine for chop, gather, pick, quarry and mine. `take()` puts tool holders first and honours the holder grace. `plan()` fails with the tool reason. The "helps, never required" path goes for object jobs. `label` gets the HP forms. The check `tool_speeds_work` is removed (§13 replaces it) |
| `UF_Objects.js` (the five-level run holds it for z: merge rule) | `applyIn(..., { yields: false })` for the final swap. `objects:changed` already exists and UF_Durability listens to it. The `objects` suite keeps its checks |
| `UF_Interact.js` (Claude Code) | Dismantle and dig by HP; dismantle returns by `returns`; the new `repair` job; menu reasons "(needs an axe)"; rock needs a pick |
| `UF_Colonists.js` (claimed by "Paths and DF life": merge rule) | `toolJob` becomes `bestTool` with fetching; the "tool first" rule; `sourcesOf` skips sources nobody can work; the card's job line uses the new label |
| `UF_Skills.js` (Claude Code; the progression run also edits it) | Experience in proportion to HP for object work; no per-job extra yield for object work |
| `UF_Fire.js` (Claude Code) | Fuel from HP; per-beat damage through UF_Durability; scorched on douse; the `burn` field is dropped; checks updated |
| `UF_Combat.js` (shared; the combat run's file: alias preferred) | A structure target, V64 rolls against defence 0, and damage through `UF.Durability.damage` (no experience). The AI choice to attack a blocker belongs to UF_Wildlife and UF_Combat, by alias |
| `UF_Look.js` | The condition word after the object's name |
| `UF_Doors.js` (**Codex's; not edited by us**) | Nothing required: UF_Durability calls `UF.Doors.damageAt` and reads `stateAt` for doors. **Note for Codex:** optionally read `maxHp` from `UF.Durability.maxHp` so a faction's Building level strengthens doors too |
| `UF_Floors.js` (**Codex's**) | **Note for Codex:** "Remove floor" becomes a dismantle job with HP (§4.4) instead of an instant change. Until then floors keep instant removal and get HP only for fire, siege and collapse |
| `UF_Walls.js` (**Codex's**) | Nothing: the damage overlays are drawn by UF_Durability over the wall sprite, 48×96 |
| `UF_Ecology.js` (**Codex's**) | **Note for Codex:** optionally regrow stump → sapling → tree (CRAFTING D9). Its renewable checks stay |
| `UF_WorldGen.js` (the campfire run holds the kit) | The kit places saplings, and `mapKit` saplings. `kit_covers_plan` reads the new yields |
| `UF_Remains.js` (not built yet) | Butchering by flesh HP and the knife (§4.6), when REMAINS is built |

---

## 13. Checks (suite `durability`, registered by UF_Durability) and how each is provoked to FAIL
- **Where it runs:** on a snapshot (`tools/test_snapshot.js`, `tools/run_tests.js durability --game <dir>`) in a cleared arena, like `jobs` and `work`.
- **Test workers:** `data.kind: "person"`, trades set with `UF.Skills.setLevel`, `workRate` 1.
- **Every check must be seen failing once.** The build provokes each one on a sabotaged snapshot and quotes the FAIL line in its report.

| Check | FAILs when | Provoke it by |
|---|---|---|
| `durability.catalog_complete` | Any object lacks a known `material`, or has neither a `size` nor `build.items`, or computes HP ≤ 0. Or any action's right tools name an unknown kind. Or a work kind has no right tool that some item, hands or a natural tool provides. Or a material lacks armour or any of the five affinities. Or a tool item lacks `tool.kind` or a tier. Or a yield names an unknown item. Or `door.hp` differs from the door's durability HP. Or `fire.rules[].burn` still exists | deleting `material` from the oak in the snapshot's catalog (want: `FAIL durability.catalog_complete: oak has no material`) |
| `durability.hp_is_duration` | A live level-1 woodcutter with a stone axe on a fresh oak, a level-50 miner with an iron pick on ironstone, and a hand gatherer on a berry bush don't finish in exactly `ceil(HP / net)` beats: 14, 6 and 4, counted from the first work beat. Or HP after each beat isn't max − beats × net (to the tenth). Or the live numbers differ from `simulate` | skipping the armour (then the oak falls in 9 beats; want 14) |
| `durability.tools_required` | A bare-handed worker can take a chop job on an oak, or a quarry job on a boulder. Or the job's reason isn't "needs an axe" or "needs a pick". Or the menu label lacks "(needs an axe)" when the colony has none. Or the same worker holding a stone axe can't take the oak | adding `hands` to the right tools of `chop` (the minimum of 1 then lets bare hands fell the oak in 70 beats) |
| `durability.tool_tiers` | Stone and iron axes on an oak don't take 14 and 8 beats; stone and iron picks on ironstone don't take 30 and 10. Or any tier in `tools.tiers` is slower than a lower one on any §5.2 object. Or a tier's damage isn't read from the item's material | giving `iron` the same damage as `stone` |
| `durability.wrong_tool_penalty` | A stone knife on an oak isn't "no headway". Or bare hands on a cactus don't take 13 beats, or a stone axe on reeds 3 (both wrong tools). Or a stone knife on a sapling doesn't take 4 beats (a right tool by the sapling's list). Or bare hands on reeds don't take 5 beats and a stone knife 3. Or a stone hammer on a boulder (a right but poor tool) doesn't take 52 beats. Or the stone pick on crystal (right tool, net 1) doesn't take 32 beats. Or any wrong-tool job longer than 60 beats is offered | dropping the ×0.35 wrong-tool factor (then bare hands on a cactus take 5 beats, want 13; a stone axe cuts reeds in 1, want 3) |
| `durability.worker_fetches_tool` | A colonist with no tool, an oak designation and a stone axe on the woodpile 8 cells away doesn't do fetch(axe), then equip, then chop, in that order. Or during the chop `equipment.tool` isn't the axe and the axe layer isn't on the body's frame (UF_Anim, V61). Or, with two colonists at equal distance, the one already holding an axe doesn't get the job | removing the fetch step from `bestTool` (the colonist then skips the oak: want `FAIL … no fetch job`) |
| `durability.yields_sensible` | Any group of §7.3 has an object outside 0.5–2.0× of its median. Or an order check of §7.3 fails. Or a dismantle returns more than a build item's count, or less than half of it. Or a full bar yields nothing | setting the oak's logs to 30 (value a beat 6.6, above 2 × 1.67), or restoring wall_stone's `becomes: "rubble"` (4 stones back from 2) |
| `durability.yield_steps` | On a test oak (9 pieces) the ground doesn't gain exactly the next piece of the release order at each 7.8-HP slice. Or cancelling at piece 4 doesn't leave 4 pieces on the ground and the oak at 70 − 4 × 7.8 or less HP. Or a second worker resuming doesn't end with exactly 9 pieces plus the seeded extra rolls. Or a record healed and worked again pays a slice twice | dropping every yield at zero HP (today's behaviour: 0 pieces after 4 slices) |
| `durability.armour_hidden` | For a damaged wooden door and a partly chopped oak, any of these texts contains "armour", "armor", "defence", "defense", "affinity", "HP", or an HP number such as "12/20": UF_Look's lines for those cells, the job line of the colonist card, UF_Sheet's doing line, `UF.Jobs.label` in both forms, UF_Interact's menu labels for those cells and the chronicle line. A colonist's own combat hitpoints elsewhere on the card are not objects and are not scanned. Or the condition words "damaged" and "partly chopped" are missing | adding the armour to the look line |
| `durability.fire_damage` | A lit undamaged oak doesn't burn out in exactly 70 beats and become a stump. Or an oak at 35 of 70 doesn't burn out in 35. Or a doused pine doesn't keep its damage and the scorched flag. Or a boulder can be lit | leaving UF_Fire's `burn` in charge (the half-chopped oak then burns 40) |
| `durability.siege_breaks_door` | A hostile test troll attacking a wooden door with fixed seeds doesn't break it within 12 hits (5 expected). Or the door doesn't become broken timber with UF_Doors' "A door was broken." Or a test wolf deals damage in 30 hits. Or a stone door takes fewer hits than the wooden one on the same seeds. Or any hit's damage isn't `floor₀.₁(rolled × affinity) − armour` (≥ 0). Or the troll gains combat experience from the door | skipping the armour (the wolf then breaks the door) |
| `durability.becomes_on_zero` | For every catalog object with a work action, spawned in the arena, driving HP to zero with `UF.Durability.damage` doesn't leave exactly its `becomes` (or nothing), schedule regrowth as UF_Objects does today, and delete the record. Or a structure broken by force doesn't become its `ruin` | not deleting the record (the key is still there after the change) |
| `durability.repair` | A wooden door at 10 of 20, with a builder holding a stone hammer and 1 log fetched, isn't back to 20 in 2 beats using the log. Or repair works without the material. Or a full wall offers a repair | letting repair skip the material check |
| `durability.start_not_deadlocked` | **Static:** for every culture's plan and the kit, the fixed-point search of §5.8 can't reach the first-stage items. **Live:** on a snapshot new game (the V4 start at ×8), within 120 s at ×8 the band hasn't made a stone knife, cut a log from a sapling and made a stone axe, or a colonist sits on "no headway" for more than 30 s at ×8. The window is re-measured and reported, not silently widened | removing `sapling` from `start.kit.objects` (want: `FAIL … log unreachable: needs an axe; the axe needs a log`) |
| `durability.saved` | An oak at 35 of 70 with 4 pieces out and a scorched flag, and a door at 12 of 20, don't survive a JsonEx round trip and a reload exactly. Or an untouched object has a record. Or a record survives its object's change. Or a save from before durability doesn't load with no records and every object at full | not writing `state.durability` |
| `durability.perf` (added) | With 200 active object jobs, the durability step averages over 0.02 ms per job per beat (`performance.now`, at least 30 beats). Or any durability code runs between beats (a counter) | a 0.2 ms busy loop per step, or a per-frame hook |
| `durability.no_errors` | Any uncaught error during the suite | a throw inside `damage` |

**Existing checks the build changes:**
- `jobs.tool_speeds_work`: removed.
- `jobs.travel_and_work`: the stump and 3 logs become the stump and 6 logs and 3 firewood, released in steps.
- `work.relative`, `work.tools_matter`, `work.success_chance` and `work.gives_up` (WORK_TIMING §11) keep only fishing and hunting. Their oak and ironstone parts move here.
- `skills.xp_by_doing`: a chop pays 28 per full oak.
- `fire.tree_to_stump`: the fuel is the oak's HP, 70.
- `objects` (the chop apply): yields released in steps.
- `worldgen.kit_covers_plan`: the new yields and saplings.
- `colonists.tools_and_clothes`: the plan's new tool steps, re-measured against the window.

---

## 14. Build order (after the work-timing build lands)
The STATUS claim of 2026-09-19 says this build follows the work-timing build (V85). It then replaces that build's attempt model for object work with HP depletion, and that build's object-work durations with HP. Each step ends with its checks passing and each seen failing once.

1. **Catalog:** the `durability` key, the object and item fields, the new objects, items and recipes, the kit, the plan steps and the data fixes (§11). The editor must be closed (AGENTS.md → RMMZ editor safety). A new tool `tools/add_durability.js` writes it with a layout-preserving node script, and `tools/check_catalog.js` gains `catalog_complete`'s static half.
2. **UF_Durability core:** materials, HP, `net`, `bestTool` (carried tools and hands), damage records, the save and healing. Checks: `catalog_complete`, `saved`, `perf`.
3. **UF_Jobs object work by HP:**
   - WORK_TIMING's §4.2 attempt engine for chop, gather, pick, quarry and mine is removed.
   - Its §6.1 and §6.2 tables are superseded by §4.3 here. Its §6.6 dig and dismantle beats are superseded by §4.4–4.5.
   - Its `label` forms for object work become §8's.

   Checks: `hp_is_duration`, `tools_required`, `tool_tiers`, `wrong_tool_penalty`, `becomes_on_zero`.
4. **Yields in steps and experience:** UF_Objects' final swap without yields, UF_Skills' experience in proportion and the per-step extra yield. Checks: `yield_steps`, `yields_sensible`.
5. **Tools in the colony:** fetch, equip, holder preference, the tool-first rule, the plan steps, saplings in the kit. Checks: `worker_fetches_tool`, `start_not_deadlocked`, and `colonists` re-measured.
6. **UF_Interact:** dismantle, dig and repair by HP; menu reasons. Check: `repair`.
7. **Fire:** fuel from HP, scorched. Check: `fire_damage`, and the fire suite re-measured.
8. **Siege:** a structure target in combat, through UF_Doors for doors. Check: `siege_breaks_door`.
9. **Look, labels and art:** condition words; the asset requests and `HANDOFF_durability.md`; stock stand-ins listed. Check: `armour_hidden`, plus a screenshot of a partly chopped oak and a damaged door at zoom 1, opened and described in the report.
10. **Five levels:** z in keys and terrain cells, after UF_Levels lands (VERTICAL_WORLD slices).

`docs/systems/UF_Durability.md` is written with step 2 and kept current at every step.

**If the work-timing build has not landed**, this build waits. Its object-work parts would otherwise be written twice.

---

## 15. Decisions for the user (PROPOSALS; the recommended option is first)
| # | Question | Options |
|---|---|---|
| DU1 | V95 says "gathering that destroys nothing keeps the attempt model"; V97 says berries, grass, reeds and fruit take HP | **Follow V97: all work on objects uses HP; only fishing and hunting (not objects) keep attempts; V95's clause is reworded to say so.** · Keep attempts for picking berries and fruit |
| DU2 | The pace (§6.3): at level 1 with stone tools, berries 4 beats, an oak 14, ironstone 30 (a beat is a game minute) | **As designed. After a playtest, scale every HP (a `durability.scale`) rather than single rows.** · Halve every HP (an oak 7, ironstone 15) |
| DU3 | Bare hands and wrong tools | **A third of the damage and no minimum; not offered under 0.5 a beat or over 60 beats. Hands can't fell living trees or work stone, but can pick, gather, pull reeds and scrape turf.** · CRAFTING P18: hands fell common trees at half speed (which V96 seems to rule out) |
| DU4 | The first log | **Saplings (CRAFTING D9's object), 4 in every start kit and 30 on the map; a stone knife cuts one in 4 beats.** · Dead trees in the kit (under DU3 neither hands nor a knife make headway on them, so they would need a rule of their own) · Let a stone knife fell common trees very slowly |
| DU5 | New tools and their names | **"Stone hammer" (dismantle, repair), "Wooden spade" (dig), later "Iron pry bar"; the sickle as CRAFTING has it** · other names |
| DU6 | The yields of §7.2 | **As tabled: trees give firewood as their branches; about one piece per size unit** (oak 6 logs and 3 firewood, was 3 logs; boulder 6 stones, was 4; ore 4 lumps, was 2; berries 4, was 2; fruit 5, was 3) · Keep today's counts and only spread them over the bar |
| DU7 | Dismantling | **75% back, rounded up; the owner's ×2 joint bonus; enemies can't dismantle, only smash (§9.1)** · 100% back · No joint bonus (then owners take 4 beats for a wooden wall) |
| DU8 | New ruins | **"Broken timber" (firewood 2) for wooden structures; loose stones for the campfire; the stone wall's quarry no longer leaves rubble** · Keep stone rubble for everything |
| DU9 | Fire | **Burn time = HP ÷ flammability (fire damage 1 a beat): bigger trees burn longer (oak 70, pine 40, birch 30), walls 20; the fire suite re-measures spread** · Keep today's per-rule burn beats and derive fire damage from them (every tree 40) |
| DU10 | Structures and the faction's Building level | **+0.5% maximum HP a level (×1.49 at 99), read live, so existing walls strengthen too** · Fixed at the level when built · No effect |
| DU11 | Condition words and the progress label | **§8's words; the progress shown as a percentage and pieces out** · A progress bar in the profile instead of the percentage |
| DU12 | Extra yield | **0.15% a level for each piece (≤ 15% at 99)** · Keep UF_Skills' 0.5% a level once per job |
| DU13 | Tool steps in the plans and the kit | **Axe ×2 and pick ×1 right after knives in every plan (stone plan: pick first; workshop plan: knives before the work stone); hammer and spade when first needed; `grass_tuft` 60 → 64 in the kit** · One axe per band |
| DU14 | Healing | **Living plants heal after their regrow time (trees 72 h, others 24 h); minerals and buildings never heal** · Nothing heals |
| DU15 | Who can smash structures, and experience | **Trolls and bog horrors (monsters) and hostile people, with no combat experience for hitting objects; animals never** · Also large animals when enraged · Pay experience |
| DU16 | Experience for object work | **Paid in proportion to HP removed; mining keeps WORK_TIMING's per-job values as its per-bar values** · Once per finished object, as WORK_TIMING designs |

---

## 16. Known limits and what is not in this design
- **One worker per object**, as today. Two woodcutters on one oak would each deal their damage per beat. That is a later option if playtests want it.
- **Tools don't wear out.** Items have no HP (the user, 14:19). Tool wear would be a separate decision.
- **Felled trees and collapses don't aim.** A falling trunk crushing what it lands on (VERTICAL_WORLD §5.4 lists felled trees as a fall source) is left for the five-level build.
- **Creatures choosing to break things** needs AI in UF_Wildlife and UF_Combat, which other runs hold. Here only the capability and the damage are designed.
- **Carcass butchering** is REMAINS' job type. §4.6 only sets its tool rule and HP.
- **Codex's files** (UF_Doors, UF_Floors, UF_Walls, UF_Ecology) are reached by adapters or left with notes. None is edited by this build.
- **Every number here was computed from the formulas**, by a scratch script run on 2026-09-19. None was measured in the game. The `durability` suite and a playtest in the RMMZ editor are the evidence the build must bring.
- **Not re-read:** Dwarf Fortress and OSRS were not re-read for this file; §1.2 relies on WORK_TIMING §1.
- **Not edited:** `docs/ASSET_REQUESTS.md` and the handoff are the build's to write (§9.5). This run edited only this file.
