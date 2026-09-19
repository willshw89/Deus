# PERSONALITY: traits, values, opinions and social life (VISION V94)

**Decided by the user.** On 2026-09-19 at 14:15 the user said: "I want each creature to have personality shit that factors into their dialogue and how they interact with others" (VISION V94). V94 as recorded: every person has personality traits and values (the ten colonist facets, extended), rolled at birth with culture and family influence; animals and monsters have a temperament; traits and values decide the wording and tone of everything a person says, how often they talk and about what, and how they deal with each other (friends, rivals, partners; helping, gossip, jokes, arguments, comfort, fights; how they take orders); each person remembers others as opinions shaped by shared events; the profile describes the personality in words and lists relationships; only speech appears over heads.

**Other decisions this design follows:** V17 (people act on their own; social life needs no player input), V23 (work and life chosen by personality and skills), V26 (children, growing up), V39 (each culture has a personality bias), V48 (every living thing decides or follows a decision every beat), V50 (measured budgets), V52 (ranks and orders), V59 (the profile shows what a person is doing and is), V62 (speech over heads, U7-style conversations), V71 (ownership; gifts need their own approved rule), V78 (privacy for intimacy), V87 (eleven peoples), V92 (over-head text is speech only).

**Status (2026-09-19 14:30):** design only. Nothing in `game/` is built or changed by this file. Written by Claude Code (the personality run, STATUS "In progress" claim of 14:17). Numbers in it are starting tuning that goes into the catalog, not locked rules. The formulas in §2, §5 and §7 were checked with a seeded scratch model (`personality_model.js` in the session scratchpad, 2026-09-19); its results are quoted where they are used.

**Sources, mechanics only.** Dwarf Fortress (the local install and `release notes.txt`, read-only): the idea of many personality facets plus a set of held values, needs, thoughts that come from events, memories that fade and can shift a personality, relationships that form from repeated contact and compatibility, grudges, arguments and non-lethal brawls, conversation that depends on personality. Ultima VII: people whose way of speaking shows who they are. No names, text, tokens or numbers are copied from either. Player text in this file is our own and plain; the peoples' in-world words follow docs/design/PEOPLES.md §1.2.

---

## 0. In short

| Part | What it is | Where it lives |
|---|---|---|
| Traits | 16 per person: the 10 existing facets + kindness, temper, pride, humour, anxiety, trust; 0–100 | `data.facets` (the ten, unchanged), `data.traits` (the six) |
| Values | 10 per person: family, friendship, craft, nature, tradition, power, knowledge, courage, fairness, peace; −3..+3 | `data.values` (sparse, zeros left out) |
| Temperament | 5 per animal or monster: boldness, aggression, curiosity, herding, skittishness; 0–100 around the species' norm | `data.temperament` |
| Opinions (bonds) | per pair that met: opinion −100..100, familiarity 0..100, flags; labels acquaintance, friend, close friend, rival, grudge, partner, family | `data.bonds` (sparse, capped) |
| Memories | up to 6 notable events per person; fade; can shift traits a little | `data.memories` |
| Social life | each beat, free people near each other may greet, chat, joke, gossip, compliment, comfort, give a gift, ask for help, argue, insult, brawl or court | new `UF_Personality.js` |
| Tone | warm, cheerful, boastful, formal, curt, gruff, shy, anxious (or plain), chosen from the speaker's traits and their opinion of the listener | catalog `personality.tones`, `@tone` variants in `talk.lines` |
| Profile | a "Person" page on the selection panel: traits in words, values, mood reasons, relationships, recent dealings | a small hook in `UF_Sheet.js` |

---

## 1. What exists today (read 2026-09-19 14:18)

- **Ten facets, colonists only.** `UF_Colonists.js` `facetsFor` (line 172) rolls each of `colony.facets` (curiosity, industriousness, patience, bravery, sociability, natureAffinity, tidiness, ambition, cheerfulness, discipline) as a uniform 0–100 plus the culture's `facetBias`, clamped. `convertPerson` (line 263) gives them to the player's people. Code reads four of them: bravery (hunting, lines 485, 507, 729), discipline (sleep window, 613), curiosity (exploring when idle, 1227), industriousness (lazy breaks, 1261). The other six are rolled and read by nothing. The colonists suite counts `Object.keys(data.facets)` against `colony.facets` (around line 1554), so new keys cannot go into `data.facets` without breaking that check.
- **Other factions' people have no facets.** `UF_History.js` `spawnFounders` (around line 1368) writes kind `person`, faction, age, stage, gender, rank and stats, nothing else.
- **Children** get `facetsFor(st.seed, ticks())` (`UF_Colonists.js` line 878): no culture bias, no parents, and two children born in the same tick get identical facets.
- **Thoughts and mood** exist: `addThought(unit, text, strength)` (line 193) keeps 8 thoughts and a mood score for any unit with `data`; public as `UF.Colonists.addThought`.
- **Social need**: rate 0.15 per game minute, threshold 40 (25 in the evening). The social branch of `needJob` (line 674) sends the colonist to talk with the first free colonist within 40 cells; the `talk` job (`UF_Jobs.js` line 535) lowers both people's social need by 55 and gives "Enjoyed talking with X." Nothing about who is chosen or what is said depends on personality.
- **Partners**: nothing sets `data.partner` in play (UF_Talk reads it; only its test fixture sets it). `nightlyMateJob` (line 769) pairs any two eligible adults of the faction, opposite gender preferred.
- **Speech**: `UF.Speech.say(speaker, text, { kind })` (`UF_Speech.js` line 256) draws over-head lines; kinds remark, bark, shout, order, thought. The catalog `speech` key holds display settings only, no line templates. Spoken templates today: `talk` and `talk.lines` (410 strings), `skills.speech.text` (the level-up remark), `command.lines` later.
- **Talk**: every answer is a template picked by `sayIn` (`UF_Talk.js` line 517) from `talk.lines.<section>[variant]`, filled by `fill`, returned by `lineFor` (line 710). The listener (your voice, `voiceOf`, line 774) plays no part in the wording.
- **Combat**: `UF.Combat` exposes `level`, `maxHp`, `maxHitFor`, `roll`, `defenceRoll`, `describeAttack`, `playAttackAnimation`, `playHitAnimation`, `inCombat` (`UF_Combat.js` lines 228–718). There is no non-lethal mode.
- **Wildlife**: fear range 7 (predators), 5 (people), herd alarm range 5 are constants (`UF_Wildlife.js` lines 73–75); `hunt.flees` per species in the catalog. Nothing varies per animal.
- **Legacy**: `UF_DFWorld.js` (an early plugin) has "psychological profiles" built on names in VISION's "Proposed but not approved" list. This design does not use or extend it.

---

## 2. Traits of people

### 2.1 The set: sixteen
The ten facets stay, with their ids, range and roll, because job choice already reads them. Six are added because each drives a social behaviour or a tone that none of the ten covers:

| New trait | High means | Drives |
|---|---|---|
| `kindness` | cares for others, generous | compliments, comfort, gifts, the warm tone; low kindness drives insults |
| `temper` | quick to anger | arguments, insults, brawls, the gruff tone; how hard an insult lands |
| `pride` | high self-regard | the boastful tone; takes insults and orders from those it doesn't respect badly; grudges fade slower |
| `humour` | likes a joke | jokes, laughing at others' jokes, part of the cheerful tone |
| `anxiety` | worries | the shy and anxious tones; stronger bad thoughts from frightening events |
| `trust` | believes and confides in others | how much a person shares in a talk (§7.4), whether gossip sways them, how fast friendship forms |

Considered and folded in: generosity (into kindness), honesty (into the fairness value; this build has no lying), loyalty (it comes from opinion and discipline), vanity (pride), greed (ambition with low kindness), romance (courting comes from sociability, kindness and compatibility). Sixteen keeps the profile readable and the save small.

How the old ten join social life: sociability sets how often a person talks; patience damps arguments and drives the curt tone; discipline stops brawls and shapes answers to orders; cheerfulness is the baseline for the cheerful tone and for mood; bravery decides whether a hothead backs down; ambition feeds the boastful tone and answers to orders; curiosity, natureAffinity, tidiness and industriousness feed compatibility (§5.2).

### 2.2 Range and words
All sixteen are integers 0–100, 50 is ordinary. The profile (§8) describes a trait only outside the middle band:

| Band | 0–15 | 16–35 | 36–64 | 65–84 | 85–100 |
|---|---|---|---|---|---|
| shown as | very low word | low word | nothing | high word | very high word |

| Trait | Very low | Low | High | Very high |
|---|---|---|---|---|
| curiosity | Wants nothing new | Not one for questions | Curious | Wants to know how everything works |
| industriousness | Avoids work where possible | Easily idle | Hard-working | Never stops working |
| patience | Has no patience at all | Impatient | Patient | Patient as stone |
| bravery | Frightened of almost everything | Timid | Brave | Fearless |
| sociability | Prefers to be alone | Reserved | Enjoys company | Loves a crowd |
| natureAffinity | Has no love for the wild | Prefers a roof overhead | Loves the outdoors | Happiest under open sky |
| tidiness | Lives in a mess | Untidy | Tidy | Keeps everything in its place |
| ambition | Content with little | Unambitious | Ambitious | Means to rise high |
| cheerfulness | Gloomy | Often downcast | Cheerful | Always in good spirits |
| discipline | Follows every whim | Easily distracted | Disciplined | Duty above all |
| kindness | Cruel | Unkind | Kind | Kind to everyone |
| temper | Never angry | Even-tempered | Quick to anger | Flies into rages |
| pride | Humble to a fault | Modest | Proud | Vain |
| humour | Never laughs | Serious | Likes a joke | Always joking |
| anxiety | Never worries | Calm | A worrier | Frets over everything |
| trust | Trusts no one | Wary of others | Trusting | Believes anyone |

### 2.3 Rolling at birth, with culture bias (V39, V87)
- **The ten:** exactly `UF.Colonists.facetsFor(seed, unitId, cultures[species].facetBias)`, the existing formula, for every person of every faction. For the player's founders this gives the same numbers `convertPerson` writes, so the two plugins never disagree.
- **The six:** a triangular roll, `round((r1 + r2) × 50)` with `r1, r2 = unit01(hash32(seed, SALT_TRAIT, unitId, index, 1|2))`, plus `personality.peoples[species].traitBias[trait]`, clamped 0–100. Triangular, not uniform, because these traits drive visible conflict: with a uniform roll 15% of people would fly into rages; the scratch model gives 5.1% with the triangular roll.
- **Seeded only.** `hash32`/`mulberry32` from UF_World; never `Math.random`. The same seed and unit id always give the same person.

### 2.4 Children inherit (V26, V94 "family influence")
A child with both parents known (`data.motherId`, `data.fatherId` at `world:unitAdded`):
- trait = `clamp(round(w × parentMean + (1 − w) × ownRoll), 0, 100)`, `w = personality.traits.inherit` (0.4). `ownRoll` is §2.3's roll for the child's id, culture bias included (the parents carry their own bias already).
- one parent known: `w = inheritOne` (0.25) with that parent's value.
- values: `clamp(round(0.5 × parentMean + 0.5 × ownRoll + bias), −3, 3)`; children pick up a household's values more than its temperament.
- keyed by the child's unit id, so twins differ. UF_Personality writes all sixteen on `world:unitAdded`, replacing the `facetsFor(seed, ticks())` roll of `giveBirth` (§1). This is a deliberate change of UF_Colonists' child facets, owned by this run, and it needs no edit in UF_Colonists.

### 2.5 Stable for life, with slow drift
The birth roll is the person. Only strong memories move it (§5.7): each memory kind has a small drift vector (±1 to ±3 points), applied at most once per trait per game day, and the total drift of a trait over a life is capped at ±15 (`traits.driftCap`). Drift is stored sparse as `data.persona.drift = { trait: n }`; the effective trait is the stored roll (which already includes drift) and the drift record only enforces the cap. Values drift the same way with a cap of ±1 (a life can move one step in what a person holds dear).

### 2.6 Who has them (V87)
Every unit of kind `colonist` or `person`, of every faction, from founding, arrival and birth. Per-people settings in `personality.peoples[id]`:

| People | talks | bonds | courts | brawl | new-six bias (proposal) | value bias (proposal) |
|---|---|---|---|---|---|---|
| human | yes | yes | yes | 1.0 | kindness +5 | family +1, tradition +0.5 |
| elf | yes | yes | yes | 0.3 | pride +10, temper −10 | nature +2, knowledge +1, power −0.5 |
| dwarf | yes | yes | yes | 1.0 | pride +10, trust −5 | craft +2, tradition +1, family +0.5 |
| gnome | yes | yes | yes | 0.5 | humour +15, anxiety +5 | knowledge +2, craft +1 |
| goblin | yes | yes | yes | 1.2 | temper +10, kindness −10, humour +5 | power +1, fairness −1, tradition −0.5 |
| orc | yes | yes | yes | 1.5 | temper +15, pride +10 | courage +2, power +1, peace −1.5 |
| lizardfolk | yes | yes | yes | 0.6 | anxiety −10, humour −5 | nature +1, family +1, tradition +0.5 |
| kobold | yes | yes | yes | 0.8 | anxiety +15, trust −5 | family +1.5, craft +1, courage −1 |
| undead | yes | yes | no (no births) | 0 | kindness −15, humour −20, anxiety −20 | tradition +2, power +1, friendship −1, nature −2 |
| starborn | yes | yes | yes | 0 | temper −15, pride +10 | knowledge +2, tradition +1, power −1, peace +1 |
| swarm | **no** | **no** | no | 0 | none | none |
| automaton (constructs) | yes, never chats | no | no | 0 | kindness −10, humour −30, anxiety −30 | tradition +1, craft +1 |

- The ten facets keep their bias in `cultures[id].facetBias` (existing, and PEOPLES.md's proposals for the new peoples).
- The swarm (PEOPLES.md §3.11, "they don't talk") and the constructs still roll all sixteen traits (V94: every creature has a personality), shown in the profile, but they take part in no conversation, bond or brawl. Constructs answer the player's talk and orders in the formal tone.
- `brawl` multiplies the brawl chance (§6.4); 0 means never.
- Biases are tuning numbers, not lore; the peoples' names and words stay PEOPLES.md's proposals.

---

## 3. Values

### 3.1 The list, range and roll
Ten values, each an integer −3..+3 (0 = indifferent):

| Id | Shown as | Id | Shown as |
|---|---|---|---|
| `family` | family | `power` | rank and power |
| `friendship` | friendship | `knowledge` | learning |
| `craft` | good work | `courage` | courage |
| `nature` | the wild | `fairness` | fair dealing |
| `tradition` | the old ways | `peace` | peace |

Roll: `clamp(round((r1 + r2 − 1) × 3 + valueBias), −3, 3)` (triangular around 0). Stored sparse in `data.values` (zeros left out). Children: §2.4.

Profile words: +3 "Holds dear", +2 "Cares about", −2 "Has little use for", −3 "Scorns"; ±1 is not shown.

### 3.2 Approving and disapproving of others' deeds
A **deed** is something a person does that others can see. Each deed touches some values:

| Deed | Comes from | Values touched |
|---|---|---|
| `fell_tree` | `jobs:done` chop | nature −2 |
| `hunt` | `jobs:done` hunt | courage +1, nature −1 |
| `build` | `jobs:done` build | craft +2, tradition +1 |
| `craft` | `jobs:done` craft | craft +2 |
| `forage` | `jobs:done` gather, pick | nature +1 |
| `labour` | `jobs:done` haul, fetch | craft +1 |
| `defend` | `combat:hit` by a person on a hostile unit | courage +2, family +1, peace −1 |
| `learn` | `skills:levelUp` | knowledge +1, craft +1 |
| `brawl` | a brawl (§6.4) | courage +1, peace −3, fairness −1 |
| `insult` | an insult (§6.3) | fairness −2, friendship −1 |
| `comfort` | a comfort (§6.3) | friendship +2, family +1 |
| `gossip` | gossip, heard by the listener only | fairness −1, friendship −1 |
| `obey` | an order carried out (later, UF_Command) | tradition +1, power +1 |

**Witnessing.** People who are awake, on the same level, within `deeds.range` (6) cells of the doer, and not the doer, react:
- `Δ = clamp(round(Σ_v witness.values[v] × deed[v] / 3), −3, +3)` on the witness's opinion of the doer.
- Only `|Δ| ≥ 1` counts; a new bond is created only when `|Δ| ≥ 2` (sparse, §5.6).
- At most once per witness, doer and deed kind per game hour (a session map, not saved).
- With `|Δ| ≥ 3` the witness may say something (25%, seeded, only when not already speaking): an approving line (`lines.approve.<value>`, which counts as a compliment, §6.3) or a disapproving one (`lines.disapprove.<value>`, "Must you fell every tree in sight?"). A doer with temper ≥ 65 may answer (`lines.retort`).

Values also steer talk: people chat about what they value (§6.3 chat), share their values with those they trust (§7.4), and argue about the values they disagree on.

---

## 4. Animal and monster temperament

Every unit of kind `creature` gets `data.temperament = { bold, aggr, curious, herd, skittish }`, each 0–100, rolled on `world:unitAdded` (spawns, births, ecology refills):

- **Norm per kind** (`personality.temperament.kinds`):

| Kind | bold | aggr | curious | herd | skittish |
|---|---|---|---|---|---|
| grazer | 30 | 15 | 40 | 75 | 70 |
| predator | 65 | 60 | 50 | 35 | 35 |
| vermin | 25 | 20 | 55 | 40 | 75 |
| flier | 35 | 20 | 45 | 50 | 70 |
| monster | 85 | 80 | 30 | 15 | 10 |

- **Species overrides** (`temperament.species`), for example boar and aurochs bold 60, aggr 40–45 (grazers that stand their ground, `hunt.flees: false`); wolf herd 75; hawk bold 60, aggr 50; restless dead curious 5, skittish 0. A grazer with `hunt.flees: false` and no override gets bold +25.
- **Individual spread:** `norm + round((r1 + r2 − 1) × spread)`, `spread` 15, clamped 0–100, seeded by unit id.
- **Words** (profile): bold: Cowers from everything / Timid / Bold / Fearless; aggr: Placid / Mild / Fierce / Savage; curious: Ignores everything / Aloof / Inquisitive / Pokes its nose into everything; herd: Always alone / Strays from its {group} / Keeps close to its {group} / Never leaves its {group} ({group} = herd, pack, flock or brood by kind); skittish: Unflappable / Steady / Easily startled / Bolts at a shadow.
- **No opinions or talk for animals** (DF stopped animals forming chat relationships; the same here). Bonds between animals and people (pets, tamed beasts) are not in this build.

**What UF_Wildlife's owner can read (that file is claimed by another session and is not edited here):** `UF.Personality.temperament(unit)` or `unit.data.temperament`. Suggested uses, all multipliers around 1 at the norm:
| Wildlife constant or rule | Suggested scale |
|---|---|
| `PREDATOR_FEAR_RANGE` 7, `COLONIST_FEAR_RANGE` 5 | × (0.6 + skittish / 125) |
| `HERD_ALARM_RANGE` 5, and whether an alarm spreads | range × (0.5 + herd / 100); a unit with herd < 30 ignores alarms 50% of the time |
| retaliating instead of fleeing | a fleeing species retaliates when bold ≥ 75 |
| predator hunting chance | × (0.5 + aggr / 100) |
| idle behaviour | curious ≥ 70: walk to within 4 cells of a person in sight and stand a while (DF-like curiosity) |
| grazing chance 0.40 | × (1.2 − skittish / 250) |
UF_Combat's owner (the carry and combat run) could scale `aggroRadius` 8 by `(0.7 + aggr / 170)` for hostile creatures. Until either owner reads it, temperament shows in the profile only; the report says so.

---

## 5. Opinions, bonds and memories

### 5.1 The bond record
Directed and sparse: A's view of B is not B's view of A (as in DF). `A.data.bonds[B.id] = [o, f, day, flags]`:
- `o` opinion −100..100 (integer).
- `f` familiarity 0..100: how well A knows B.
- `day` the game day of the last contact (for decay).
- `flags` bits: 1 partner, 2 grudge, 4 met at founding, 8 courting, 16 values shared (A has heard B's values in a talk).

### 5.2 Compatibility
A pure function of the two people, computed when needed (cached per session, never saved), `c(A,B)` in −1..1:
```
V = clamp( Σ_values A.v × B.v / 20, −1, 1 )                                  shared values
S = mean over sociability, industriousness, natureAffinity, tidiness, curiosity, discipline of
    clamp( 1 − |A.t − B.t| / 33.3, −1, 1 )                                     a similar way of life
L = 0.35 k'(B) + 0.25 h'(B) + 0.2 ch'(B) − 0.35 te'(B) − 0.15 p'(B)             how likable B is
    (x' = (x − 50) / 50: kindness, humour, cheerfulness, temper, pride)
F = 0.15 if both temper ≥ 70, + 0.1 if both pride ≥ 70                         friction
c = clamp( 0.4 V + 0.25 S + 0.7 L − F, −1, 1 ); if c > 0 and A.trust < 35: c × 0.8
```
The scratch model (20 000 random pairs): mean −0.006, standard deviation 0.22, 5th percentile −0.38, 95th +0.34; 7.7% of directed pairs have `100c ≥ 30` (friend level) and 9.3% `≤ −30` (rival level); in 86% of bands of eight at least one directed pair reaches friend level and in 88% rival level.

### 5.3 How opinions change
- **Every contact** (greet, chat, working side by side, a talk with the player's voice): `o ← o + round(step × (T − o)) + bonus` where `T = clamp(100 c, −100, 100)` is the pair's natural level, `step` 0.15 for a chat (0.05 for a greeting) and `bonus` +1 (plain company is mildly pleasant); `f` +3 for a chat, +1 for a greeting, +2 for working side by side (same job target within 2 cells, once per game hour).
- **Events** add fixed amounts on top (§6.3 table): comfort, compliments, gifts, jokes, insults, arguments, brawls, courting, gossip, witnessed deeds (§3.2).
- **Receiver's traits** scale what they receive: pride amplifies insults and compliments (× (1 + 0.5 p')), kindness softens insults (× (1 − 0.3 k')), humour decides whether a joke lands.
- With repeated contact, opinions settle near `T` and events push them away. The scratch model's two-day soak (11 bands of 8, contact only): Spearman correlation between `c` and `o` 0.996; 44 friend-or-better and 18 rival-or-worse directed pairs; 10 of 11 bands with a friend pair. The same soak with `T` replaced by noise gives 0.077 (so the check in §11 can fail).

### 5.4 Labels
Computed from the record each time they are asked for (never stored), with hysteresis so labels don't flicker:

| Label | Enters when | Leaves when | Shown as |
|---|---|---|---|
| partner | flag 1 (§6.5) | the flag is cleared | partner |
| family | mother, father, child, or sibling (a shared mother or father), from `motherId`/`fatherId` | never | mother, father, son, daughter, brother, sister; with "(fond)" at o ≥ 30, "(at odds)" at o ≤ −30 |
| grudge | flag 2 set by an event (§6.3) while o ≤ −40, or o ≤ −70 | o > −30 (the flag is cleared) | holds a grudge |
| close friend | o ≥ 60 and f ≥ 40 | o < 50 | close friend |
| friend | o ≥ 30 and f ≥ 20 | o < 20 | friend |
| rival | o ≤ −30 and f ≥ 20 | o > −20 | rival |
| acquaintance | any other bond | | acquaintance (not listed in the profile) |

Partner and family win over the others; within the rest, grudge > close friend > friend > rival > acquaintance.

### 5.5 Decay
Handled in the round-robin of the social director (§6.1), so there is no daily spike: when a person is considered, each bond is decayed for the whole game days since `persona.decayDay`:
- `o` moves toward 0 by 1 per day for acquaintances and friends, 0.5 for close friends, 0 for partners and family (only events change those), and `0.25 × (1 − 0.5 p')` for a grudge (proud people nurse grudges longer).
- `f` −1 per day without contact (not for partners and family).
- A bond with `f = 0`, `|o| < 5` and no flags is removed.
DF learned to stop people forgetting friends and grudges too fast; decay here is slow on purpose (a friend with o 40 needs about 20 days without contact to drop below "friend").

### 5.6 Sparse data and caps
A bond exists only for a pair that **met**: founders of one band (flag 4, created at `world:created`), family at birth (a child and its parents; siblings when the younger is born), an interaction between them, a witnessed deed with `|Δ| ≥ 2`, a talk the player opens (voice and person). Gossip never creates a bond with someone never met. At most `bonds.cap` (24) bonds per person: when full, the bond with the lowest `|o| + f/2` and no flags (not family) is dropped. Bonds of a removed unit are dropped from everyone (after the grief rule, §5.8).

### 5.7 Memories
`data.memories = [[kind, otherId, day, strength], ...]`, at most `memories.cap` (6), the weakest dropped first. Strength halves every `memories.halfLife` (4) game days; below 2 the memory goes. Once per game day, the strongest memory with strength ≥ 8 is "relived": a thought (`memories.<kind>.relive`, for example "Still smarting from what {name} said.") and, at most once per day per trait, its drift vector (§2.5).

| Kind | Made when | Strength | Drift (starting values) |
|---|---|---|---|
| `insulted` | insulted by someone | 12 | pride ≥ 60: temper +1; else anxiety +1 |
| `comforted` | comforted by someone | 10 | trust +2, anxiety −1 |
| `brawl_lost` / `brawl_won` | a brawl ends (§6.4) | 14 / 8 | temper +1, trust −1 / pride +2 |
| `gift` | given a gift | 8 | trust +1 |
| `partnered` | became partners | 16 | cheerfulness +1, trust +1 |
| `child_born` | own child born | 16 | kindness +1 |
| `rejected` | a courting turned away | 10 | pride −1, anxiety +1 |
| `grief` | a partner, family member or friend died | 20 (partner, family), 12 (friend) | anxiety +2, cheerfulness −1; family value +1 when family |
| `death_seen` | saw a person die within 6 cells | 10 | anxiety +2 |

### 5.8 Founders and death
- **Founders know each other.** At `world:created` every pair of one band's founders gets a bond: `f` 30, `o = round(20 c)`, flag 4 (they travelled together; proposal, §14 Q6). Other factions' people are strangers until they meet.
- **Death** (`combat:kill`, `anim:death`, or `world:unitRemoved` of a unit with `data.dead`): everyone with a partner, family or friend-or-better bond to the dead gets a `grief` memory and a thought ("Grieved for {name}.", strength −8 to −20 by opinion); people within 6 cells get `death_seen`; a partner's `data.partner` is cleared; then the bonds to the dead are dropped. UF_Talk's `person:<id>` answer for someone gone already says so.

---

## 6. Social life

### 6.1 When: the beat, free time, cadence
- **The beat** is UF_Core's `time:minute` (one game minute, one real second at ×1, V46), with a fallback of every 60 map updates if UF_Core is missing. Nothing in this plugin runs per frame except a running brawl's exchanges and queued replies (§9).
- **The social director** considers a slice of the people each beat, round-robin by unit id, so each person is considered once every `social.considerEvery` (5) beats. For a considered person A:
  1. A can act: alive, not a baby, their people `talks`, not asleep (a `sleep` job), not in combat (`UF.Combat.inCombat`), not in a brawl, not fleeing, `persona.next` ≤ now (cooldown `social.cooldown` 20 beats after an interaction).
  2. **Free time:** no job, or a stroll/wander/move job, or a `talk` job, or the evening leisure hours 19:00–22:00, or (for people without a decision loop yet, the other factions' `wander` people) any time. While A works, only a greeting in passing is possible, at 0.2 × the chance.
  3. **Neighbours:** people within `social.range` (3) cells, same level, found through a per-beat bucket of people by level and 8×8-cell block (one pass over the units per beat).
  4. **Chance to interact:** `0.35 × (0.4 + 1.2 × sociability / 100) × needFactor × freeFactor`, `needFactor = clamp(0.6 + needs.social / 60, 0.6, 2)` where the person has needs, else 1. Seeded by `hash32(seed, SALT_SOCIAL, A.id, minute)`.
  5. **Choice:** over the nearest 6 neighbours B and every kind k A may use with B, a seeded roulette on `w(A, B, k)` (§6.2).
  6. **Do it** (§6.3). A's cooldown starts; B's `persona.next` moves to at least now + 5.
- **Hostility:** only between people whose factions are at neutral or better (`UF.Factions.tierBetween`) and whose stance isn't hostile. Across factions only greet, chat, joke, compliment, argue and insult are possible; no gossip, help, gifts, courting or brawls.
- **Age:** babies nothing; children (to 11) greet, chat, joke, argue; teens (12–17) also gossip, compliment, comfort, ask for help, insult; adults everything. Courting, partners and brawls are for adults only (stage `adult` or `elder`; brawls `adult` only).
- **The existing social job.** When a colonist's social need sends them to talk (`UF_Colonists` social branch), the partner is chosen by `UF.Personality.pickCompanion(u, candidates)` (a hook, §10.2): friends and people they like first, weighted `max(0.1, 1 + o/50) × (partner or family ? 2 : 1)`. When that `talk` job finishes (`jobs:done`), the director runs one conversational interaction between the two (chat, joke, gossip, compliment, comfort, argue or court), without extra social-need relief (the job already gave 55).

### 6.2 Weights: which interaction
`x'` is `(x − 50) / 50`; `o` is A's opinion of B (0 with no bond); `mood'` is `moodScore / 50`, clamped.

| Kind | Weight `w(A, B, k)` (0 when a condition fails) |
|---|---|
| greet | 4 if the pair hasn't greeted today; 3 × (0.5 + sociability/100) with no bond; else 0.3 |
| chat | 2 × (1 + soc'); × 0.3 if o < −20 |
| joke | (1.5 × max(0, humour') + 0.3); needs mood not bad and o ≥ −10 |
| gossip | max(0, soc') × 1.2; needs o ≥ 20 and a third person C with `|o(A,C)| ≥ 40` whom B has met |
| compliment | 1.2 × max(0, kind'); needs o ≥ 0 |
| comfort | 4 × (0.5 + kind'); needs o ≥ 20 and B unhappy (moodScore ≤ −10), hurt (hp < 70% of max) or grieving (a `grief` memory ≥ 8) |
| gift | 0.4 × max(0, kind'); needs o ≥ 40 and something to give; **off until the user approves the rule (§6.6)** |
| ask for help | 1; needs o ≥ 10, A on a build, haul or chop job, B free |
| argue | 1.5 × max(0, te' + 0.5 d − 0.5 pa'); needs o ≤ 20. `d` = 1 when A and B hold one value at ≥ +2 and ≤ −2 (that value is the topic), else 0 |
| insult | 2 × max(0, te' − k'); needs o ≤ −30 |
| brawl | only by the rules of §6.4, never picked by the roulette directly |
| court | 2 × (0.5 + 0.5 soc' + 0.3 k'); needs §6.5's conditions |

### 6.3 What each interaction does
Every interaction: **(1)** A's line over A's head (`UF.Speech.say(A, text, { kind: "remark" })`, "shout" for a brawl start and yield), from `personality.lines.<kind>` in A's tone toward B (§7); **(2)** for the kinds with a reply, B's line 45 map updates later (a `UF.Time.after` timer; not saved), in B's tone toward A, chosen by B's reaction; **(3)** opinion changes on both sides; **(4)** a thought for each (through `UF.Colonists.addThought`, which works for any unit); **(5)** an entry in both people's `data.social` log (the profile's "Lately", §8); **(6)** social-need relief where the person has needs; **(7)** `personality:interaction` emitted; **(8)** a memory where the table says so. Lines are drawn only for the level on screen (UF_Speech's rule); everything else happens everywhere.

| Kind | B's reaction | Opinion change (B of A / A of B) | Thoughts (A / B) | Social relief | Memory |
|---|---|---|---|---|---|
| greet | a greeting back | contact step 0.05, f +1 / same | none | 3 / 3 | |
| chat (topic: A's highest value that B doesn't hold at ≤ −2, else `any`) | a reply on the topic | contact step 0.15, f +3; +2 more if B holds the topic value ≥ 1, −2 if ≤ −2 / same | "Had a good talk with {name}." +6 / same | 25 / 25 | |
| joke | laughs if `humour'(B) + o(B,A)/60 ≥ −0.2`, else groans | laugh: +3 + 2 h'(B) / +1; groan: −1 (−2 at temper ≥ 65) / 0 | "Laughed with {name}." +5 / laugh +5, groan −1 "Sat through {name}'s bad joke." | 15 / 15 | |
| gossip about C | agrees, or objects when B holds fairness ≥ +2 | +2, or −2 when B objects / +1; B's view of C moves 20% toward A's when o(B,A) ≥ 20 and B's trust ≥ 35 | "Traded news with {name}." +2 / same | 15 / 15 | |
| compliment | thanks | +4 × (1 + 0.5 p'(B)) / +1 | none / "Was praised by {name}." +6 | 0 / 10 | |
| comfort | thanks | +8 / +2 | "Comforted {name}." +4 / "Was comforted by {name}." +8 | 25 / 25 | B: comforted |
| gift (off) | thanks | +10 / +2 | "Gave {name} a gift." +4 / "Was given {item} by {name}." +10 | 10 / 10 | B: gift |
| ask for help | agrees when `o(B,A) ≥ 10` and `industriousness'(B) + k'(B) > −0.3`, else declines | agree +1, decline 0 / agree +3, decline −2 | agree "Got help from {name}." +3 / "Helped {name}." +2 | 5 / 5 | |
| argue (topic: the value they disagree on) | argues back | −3 × (1 + 0.5 p'(B)), f +2 / −3, f +2 | "Argued with {name} about {topic}." −4 / same | 5 / 5 | |
| insult | retorts (temper ≥ 50), or goes quiet | −10 × (1 + 0.5 p'(B)) × (1 − 0.3 k'(B)); grudge flag when the result is ≤ −40 and B's pride ≥ 60 / −2 | none / "Was insulted by {name}." −8 | 0 / 0 | B: insulted |
| brawl | §6.4 | §6.4 | §6.4 | 0 | both |
| court | accepts or turns away (§6.5) | accept +5 / +3; turned away: 0 / −3 (−5 at pride ≥ 65) | accept "Spent a warm moment with {name}." +8 / same; turned away A −6 "Was turned away by {name}." | 25 / 25 | A: rejected when turned away |

**Ask for help** today only makes the exchange and the opinions. B joining A's work needs `UF.Colonists.give` from the bands run (CHAIN_OF_COMMAND §6.2); when it exists, an agreeing B gets a job of the same type at the same target area.

**Gossip** is the only way opinions spread second-hand, and only between people who have met.

### 6.4 Brawls: a non-lethal scuffle on UF_Combat's rules
**Who** (all must hold, `personality.brawl`):
- both adults, same faction or factions at neutral or better, adjacent (Chebyshev 1), same level;
- A's temper ≥ `minTemper` (70), A's opinion of B ≤ `maxOpinion` (−50), A's discipline < `maxDiscipline` (60), A's bravery ≥ 30 (a coward backs off with a shouted insult instead);
- not family unless o ≤ −80;
- a trigger in the last 10 beats: B insulted or argued with A, or A's own insult to B escalates;
- the culture allows it: the chance is `0.5 × (1 − discipline/100) × peoples[species].brawl` (0 for undead, starborn, swarm, constructs);
- no danger: no hostile unit within 8 cells (UF_Command's threat list when it exists); neither in combat; both at ≥ 60% of max hitpoints.

**How it runs** (UF_Personality's own loop; it never calls `resolveAttack`, `engage` or `onUnitDeath`):
- Both get a `brawl` job (defined here with `UF.Jobs.define`: stand next to the other, work until the brawl ends, "Brawling with {name}" in the profile). Their previous jobs are cancelled with the reason "in a brawl".
- Every `everyTicks` (36 map updates, UF_Combat's `tickFrames`), the side whose turn it is swings, with fists, on UF_Combat's formulas: `A = (UF.Combat.level(x, "attack") + offset) × 64`, `D = UF.Combat.defenceRoll(y, "crush")`, `maxHit = UF.Combat.maxHitFor(UF.Combat.level(x, "strength") + offset, 0)` (offset is `UF.Combat.config().levelOffset`), then `UF.Combat.roll({ A, D, maxHit }, rng)` with `rng = mulberry32(hash32(seed, SALT_BRAWL, x.id, y.id, exchange))`. `UF.Combat.playAttackAnimation(x, y)` and `playHitAnimation(y)` play the sheet frames (UF_Anim wraps them, V58, V89).
- Damage lowers hitpoints but never below the **floor**, `ceil(maxHp × floor)`, `floor` 0.5. The side that reaches its floor **yields** (a shouted yield line) and the other wins.
- It also ends after `maxExchanges` (8) as a draw, when a **stopper** steps in, when danger appears, or when either's brawl job is cancelled (a player order does that).
- **Stoppers:** any person of either brawler's faction within 6 cells, awake and free, with discipline ≥ 65 and (rank ≥ 2 or kindness ≥ 60), or either brawler's superior with discipline ≥ 50, stops it at their next beat with a break-up line. The brawlers' opinion of the stopper −1 when their pride ≥ 65, else +1.
- **After:** loser's opinion of winner −15 and the grudge flag; winner's of loser −5; memories `brawl_lost`/`brawl_won`; thoughts "Lost a scuffle with {name}." −12, "Won a scuffle with {name}." +3 (+6 at pride ≥ 60), "Came to blows with {name}." −8 for a draw or a stop; witnesses judge the `brawl` deed (§3.2). Hitpoints come back through UF_Combat's regeneration. No `combat:hit` is emitted, so no combat experience is given (V63 experience is for real fights; a later rule can change that).
- **Chronicle** for the player's faction: "{a} and {b} came to blows." (at most one social chronicle line per faction per game hour).

### 6.5 Courting and partners (V26, V78)
- **Who:** two adults of one faction whose people `courts`, not family, neither with a partner (or already each other's partner, which gives a "tender word" line instead), A's opinion of B ≥ 45 and familiarity ≥ 30. Who may court whom follows today's pairing rule in UF_Colonists (adults of the faction, opposite gender preferred); §14 Q3 asks the user.
- **B accepts** when `o(B,A) ≥ 40` and a seeded roll `< 0.5 + 0.3 soc'(B) + o(B,A)/200`; else B turns A away.
- **Two accepted courtings on different game days** make them partners: `data.partner` both ways (UF_Talk already reads it), flag 1 both ways, memory `partnered`, thought "Became partners with {name}." +15, chronicle "{a} and {b} became partners." for the player's faction.
- **Intimacy** stays UF_Colonists' `mate` job; V78's privacy rule belongs to that build. This design adds one filter (§10.2): `UF.Personality.mateFilter(u, candidates)` keeps only u's partner, when the partner's opinion of u is ≥ 20 (both must be willing). §14 Q2 asks whether that is wanted, because it changes today's pairing, where any two eligible adults may pair nightly.
- **Parting** (proposal, §14 Q8): partners whose opinions of each other both stay ≤ −30 for 3 game days part: flags cleared, `data.partner` cleared, thought "Parted from {name}." −10, chronicle line.

### 6.6 Gifts (V71: needs the user's approval)
V71 says gifting and ownership transfer need their own approved rule. Proposed rule: A gives B one unit from a stack in A's inventory that A owns (or that is unowned and carried by A), which is not food A needs now, not equipped, and not a tool of A's current job; ownership moves to B (`UF.Ownership.claim(ref, B, { force: true, reason: "gift" })`, when UF_Ownership is loaded); B remembers it. Until the user approves, `personality.interactions.gift.enabled` is false and the director never picks it.

### 6.7 Rate limits
- At most `social.maxPerBeat` (8) interactions world-wide per beat.
- On the level on screen, at most `social.maxExchangesPer10Beats` (3) exchanges with lines, so the view never fills with chatter (UF_Speech also caps 12 lines on screen).
- Per pair: the same kind at most once per 60 beats; a greeting once per game day.

### 6.8 The current decision (V48, V59)
An interaction in passing takes no job. The profile's "Lately" list shows it, and the talk job ("Talking with X"), the brawl job ("Brawling with X") and the courting walk (a `talk` job) show in "Doing". UF_Personality does not write `data.intent`, which other runs use.

---

## 7. Dialogue tone

### 7.1 The tones
| Tone | Sounds like | Modifier (applied to any line, seeded) |
|---|---|---|
| plain | the template as written | none |
| warm | fond, generous | the listener's name before the final mark of the first sentence (50%) |
| cheerful | bright, lively | opener "Ha!" or "Well now!" (30%); first "." becomes "!" (50%) |
| boastful | self-regarding | a tag sentence: "Not that I needed the practice." / "I could do it in my sleep." (35%); the longest usable template |
| formal | correct, distant | contractions written out ("I'm" → "I am"); the listener's rank name before the final mark when known (50%) |
| curt | few words | the shortest usable template; over heads, only the first sentence |
| gruff | rough, short-tempered | opener "Hmph." or "Bah." (50%); the shortest usable template; "!" becomes "." |
| shy | hesitant | opener "Oh." or "Um." (30%); the last "." becomes "..." (50%) |
| anxious | worried | opener "Oh!" or "Forgive me." (40%); a tag "Is something wrong?" (15%) |

Openers and tags are whole sentences, so a filled line stays well formed (a capital after every sentence end; UF_Talk's `lines_well_formed` check keeps holding).

### 7.2 Choosing the tone
`toneOf(speaker, listener, ctx)`. With `x' = (x − 50)/50`, `op = clamp(o(speaker, listener) / 60, −1, 1)` (0 with no bond), `mood' = clamp(moodScore / 50, −1, 1)`:
```
warm     = 0.8 k' + 1.2 max(0, op) + 0.3 [listener is partner or family]
cheerful = 0.9 ch' + 0.5 h' + 0.4 mood' − 0.8 max(0, −op)
boastful = 1.0 p' + 0.4 ambition'
formal   = 0.7 discipline' + 0.4 tradition/3 + 0.6 [listener outranks the speaker or is a stranger]
curt     = −0.8 patience' − 0.4 soc' + 0.5 [speaker busy] + 0.7 max(0, −op)
gruff    = 0.9 te' − 0.6 k' + 0.8 max(0, −op) − 0.6 max(0, op)
shy      = −0.8 soc' + 0.6 anxiety' − 0.5 f/100
anxious  = 1.0 anxiety' − 0.4 bravery' − 0.5 mood'
```
The highest score wins if it is above `tones.threshold` (0.6), else plain; ties go to the table order. Constructs always use formal (their `toneLock`). Worked examples from the scratch model (all other traits 50):
- a cheerful person (cheerfulness 90, humour 80, kindness 80, temper 10) to an acquaintance: cheerful 1.10 (warm 0.48) → **cheerful**;
- a grumpy person (cheerfulness 10, temper 85, kindness 20, patience 30, humour 20) to an acquaintance: gruff 0.99 (curt 0.32) → **gruff**;
- the grumpy person to a close friend (o 70): warm 0.72, gruff 0.39 → **warm**;
- the cheerful person to a rival (o −60): curt 0.70, cheerful 0.30 → **curt**.
Random people speaking to acquaintances: plain 41.6%, cheerful 13.4%, curt 10.7%, boastful 7.7%, anxious 6.8%, gruff 6.4%, formal 6.2%, shy 5.3%, warm 1.9% (warm needs a friendship).

### 7.3 Variants and modifiers in the catalog
- **Every spoken template gets the modifiers** of its speaker's tone, wherever it is spoken through the two hooks: UF_Talk (always) and `UF.Speech.say` with `opts.voice` (opt-in callers: UF_Personality, the level-up remark of UF_Skills, UF_Command's answers later). The catalog `speech` key has display settings only; the spoken templates are `talk`, `talk.lines`, `skills.speech.text`, `command.lines` (later) and `personality.lines`.
- **Hand-written variants** where lines are heard most: a section's variant list may have siblings named `<variant>@<tone>` (for example `talk.lines.greet["own_fine@gruff"]`). UF_Talk tries `<variant>@<tone>` before `<variant>`; a found variant is used as written (no modifier on top, except the vocative). This build writes `@tone` variants for `talk.lines.greet` (own_good, own_fine, own_bad, friendly, wary), `bye` (own, friendly, wary), `job.busy`, `job.idle`, `mood` (good, fine, bad) and `refuse`: eight tones each, two lines per tone where it fits.
- **`personality.lines`** (new) is written per kind and tone in full: `lines.<kind>.<tone>` lists (plain always present), plus `lines.chat.<value>.<tone>` for the chat topics, `lines.reply.<kind>.<reaction>.<tone>`, `lines.approve.<value>`, `lines.disapprove.<value>`, `lines.retort`, `lines.brawl.{start, yield, win, stop}`. Slots: `{name}` (the listener), `{speaker}`, `{topic}` (a value's word), `{about}` (the gossip's third person), `{item}`, `{skill}`.
- The choice of template inside a list stays seeded as today (`hash32(seed, unitId, salt, key, n)`), so the same question gets the same answer.
- `lineFor` returns `{ text, base, tone }`: `base` is the untoned fill. The talk suite's template comparisons (`name_job_bye` and the others) compare `base` and accept `@tone` siblings as the same section, so those checks keep testing the talk and the personality suite tests the tone.

### 7.4 UF_Talk: tone, sharing by opinion, topics by values
- **Listener:** the talk's voice (`voiceOf`). The person's tone is `toneOf(person, voice)`. Companions who chime in speak in their own tone toward the person spoken to (a friend backs them up, a rival jabs), and their chance is `talk.lines.chime.chance × (0.5 + sociability/100)`.
- **Share level** 0–3: `clamp(round(2 + o/40 + 0.5 trust'), 0, 3)` with a bond; **2 with no bond**, which is exactly what UF_Talk says today, so the talk suite's expectations hold. Worked values (trust 50): no bond 2; o −80: 0; −45: 1; −10 to 29: 2; 30 and above: 3.
- **What each level shares** (each sentence of an answer carries a level; a sentence above the share level is left out, and a topic whose main sentence is left out answers with `personality.talk.guarded.<topic>`, "That is my own affair."):
  | Level | Sentences |
  |---|---|
  | 0 public | name, faction, rank, greeting, farewell, what they are doing |
  | 1 casual | trade, superior, home, others (factions they know), news |
  | 2 personal | the family sentence and topic, mood and need, the latest thought, the value sentence (below) |
  | 3 private | the new `friends` topic, opinions of third people in `person:<id>` answers, a relived memory in `mood` |
- **New topics** (answered by UF_Personality through the `talkExtra` hook): `friends` (label from `personality.talk.words.friends`): the speaker's close friends and partner at level 2, rivals and grudges at level 3; `beliefs`: the speaker's values ±2 and ±3 in words, at level 2; asking it sets flag 16 on the speaker's bond with the voice (the profile then shows the stranger's values, §8).
- **Topics follow values:** at share ≥ 2 the greeting adds one sentence about the speaker's top value (`personality.talk.values.<value>`, with a `[beliefs]` mark so the keyword joins the list), and `person:<id>` answers at level 3 add the speaker's view of that person (`personality.talk.opinion.<label>`, "{person}? A good friend of mine.").
- **Opinions from talking:** a talk the player opens counts as a chat between the voice and the person when it closes after at least one question (`talk:closed`), and the person's reply tone and share level move with that bond next time.

### 7.5 Over-head lines (V62, V92)
UF_Personality's lines are all speech: kind `remark`, and `shout` for brawl starts and yields. It never draws a status, an action description or a thought over a head. All its texts are filled templates of `personality.lines`, or toned `talk`/`skills.speech` templates, and the session log keeps the template id of each (the check in §11 relies on it).

### 7.6 Answers to orders (V52; a hook for the chain-of-command build)
`UF.Personality.answerOrder(member, giver, order)` → `{ band, e, tone, text, delayBeats }`, pure:
```
e = 0.5 discipline' + 0.4 op(member → giver) − 0.4 max(0, p') × (giver's rank ≤ member's, or op < 0 ? 1 : 0.3)
    + 0.3 mood' + 0.2 tradition/3 + 0.2 power/3 × [giver outranks] − 0.3 [the order's kind clashes with a value ≥ 2]
    (clashes: chop and hunt with nature, hunt with peace)
eager e ≥ 0.4 · plain −0.2 ≤ e < 0.4 · reluctant −0.6 ≤ e < −0.2 · grudging e < −0.6
```
- The text comes from `personality.orders.<band>.<tone>` (tone of member toward giver), for UF_Command to say over the member's head as a `remark` just after the commander's order line.
- `UF.Personality.onOrder(member, giver, order, phase)` applies opinions: a grudging answer −1 on the member's view of the giver; an order finished by an eager member +1 on the giver's view of the member.
- **No refusals.** CHAIN_OF_COMMAND §8 keeps disobedience out; `delayBeats` is 0 unless the user approves a 1-beat late start for grudging members (§14 Q5).
- Commanders' own order lines may have `command.lines.<kind>@<tone>` variants (chosen with `toneOf(commander, member)`); they must stay within that design's 40 characters and pass its `spoken` check. That choice belongs to the UF_Command build.

---

## 8. The profile (V59)
UF_Sheet's unit panel gets a second page, "Person", beside the current one (§10.2). For a person:
```
Ways:        Quick to anger · Kind · Loves a crowd · A worrier · Proud
Holds dear:  family      Cares about: good work, learning      Scorns: the old ways
Mood:        Content (+18)
   +12  Became partners with Wenna.
    +8  Had a good talk with Tamsin.
    −8  Was insulted by Dorar.
Close to:    Wenna, partner · Tamsin, close friend · Ostis, father (fond)
At odds:     Dorar, rival · Brenn, holds a grudge
Lately:      Joked with Tamsin · Argued with Dorar about the old ways · Greeted Ostis
```
- **Ways:** the five traits farthest from 50 that are outside the middle band (§2.2), strongest first.
- **Values:** ±2 and ±3 only (§3.1).
- **Mood:** the mood word and score (as today), then the three thoughts with the largest strength, with their sign.
- **Relationships:** up to 8 bonds that are not acquaintances: partner and family first, then by opinion; "Close to" for labels with o ≥ 0, "At odds" for the others.
- **Lately:** the last three `data.social` entries in words (`personality.profile.lately.<kind>`).
- **Strangers** (read-only): Ways and their bonds with your people; values only after one of your people asked them about `beliefs` (flag 16).
- **Animals:** "Temperament:" and the words of the axes outside the middle band.
The page's model is rebuilt only when UF_Sheet rebuilds its own (every 15 frames while open) and folded into its redraw signature.

---

## 9. Performance and save (V50; WORLD_ARCHITECTURE §1.8: all AI per beat ≤ 4 ms for about 400 units)

| What | Budget | How it is kept |
|---|---|---|
| The social director, per beat | ≤ 0.4 ms average, ≤ 2 ms worst, at about 400 people | a slice of one fifth of the people per beat; one pass to bucket people by level and 8×8 block; at most 6 neighbours and 12 kinds scored per person; at most 8 interactions per beat |
| Decay | inside the director's budget | per person when considered, for the days since the last decay (no daily pass) |
| Witnessed deeds | ≤ 0.05 ms per deed | the same buckets; at most 12 witnesses per deed; hourly rate limit |
| Per frame | ≤ 0.02 ms average at ×1 | nothing per frame except the exchanges of a running brawl (every 36 map updates) and reply timers |
| A toned line | ≤ 0.1 ms | catalog lookups, one hash, a few string operations |
| A talk answer | ≤ 0.3 ms | as today plus the share filter |
| The profile page | ≤ 0.5 ms per rebuild | only while the panel is open, every 15 frames |
| Bitmaps | none | the plugin draws nothing itself |
| Save | ≤ 800 bytes per person on average after a two-day soak; ≤ 90 bytes per creature | arrays for bonds and memories, sparse values and drift, caps of 24 bonds, 6 memories, 5 log entries |

At ×8 the beats come eight times as often and the per-beat budget holds per beat; 0.4 ms × 8 beats per second stays far below the frame budget.

**What is saved** (all through `UF.World.state`, so RMMZ's save carries it; ENGINE_RULES §2):
- On each person's `unit.data`: `traits`, `values`, `bonds`, `memories`, `social` (log), `persona = { v: 1, drift, next, decayDay, talks }`; the ten `facets` stay where they are.
- On each creature: `temperament`.
- `state.personality = { v: 1, cursor, brawls: [...] }` (the director's place in the round-robin, running brawls).
- Not saved (session only): the compatibility cache, the witness rate-limit map, reply timers, the session log for tests. A load loses at most a pending reply line.

**Old saves and new units:** on `DataManager.extractSaveContents` and `world:created`, every person or creature without `persona`/`temperament` is rolled from the seed and unit id (the same numbers a new game would give), with no bonds. `persona.v` allows later migrations.

---

## 10. Hooks and files

### 10.1 New files
- `game/js/plugins/UF_Personality.js`: rolls, bonds, memories, the director, interactions, brawls, tone, the talk and sheet providers, answers to orders, the `personality` suite.
- `docs/systems/UF_Personality.md`: the system doc (ENGINE_RULES §2 sections).
- Catalog key `personality` in `game/data/UF_WorldCatalog.json`, added by a layout-preserving script kept in the session scratchpad (not in `tools/`, which this run doesn't claim): it re-reads the file right before writing, inserts only the `personality` key, and asserts that every other top-level key reads back unchanged and the bytes outside the inserted block are identical. Talk's `@tone` variants go into `talk.lines` by the same kind of script, asserting every other `talk` key unchanged. The shape:
```json
"personality": {
  "about": "Traits, values, temperament, opinions and social life (UF_Personality, VISION V94). Owner: Claude Code.",
  "beat": { "event": "time:minute", "fallbackTicks": 60 },
  "traits": { "new": ["kindness", "temper", "pride", "humour", "anxiety", "trust"], "inherit": 0.4, "inheritOne": 0.25,
              "driftCap": 15, "bands": [15, 35, 64, 84], "words": { "temper": ["Never angry", "Even-tempered", "Quick to anger", "Flies into rages"] } },
  "values": { "list": ["family", "friendship", "craft", "nature", "tradition", "power", "knowledge", "courage", "fairness", "peace"],
              "inherit": 0.5, "driftCap": 1, "names": { "craft": "good work" }, "words": { "3": "Holds dear", "2": "Cares about", "-2": "Has little use for", "-3": "Scorns" } },
  "peoples": { "human": { "talks": true, "bonds": true, "courts": true, "brawl": 1, "traitBias": { "kindness": 5 }, "valueBias": { "family": 1, "tradition": 0.5 } } },
  "compat": { "values": 0.4, "life": 0.25, "likable": 0.7, "hotheads": 0.15, "proud": 0.1, "wary": 0.8 },
  "bonds": { "cap": 24, "stepChat": 0.15, "stepGreet": 0.05, "contactBonus": 1, "foundersFamiliarity": 30, "foundersOpinion": 20,
             "labels": { "friend": [30, 20, 20], "close": [60, 40, 50], "rival": [-30, 20, -20], "grudge": [-40, -70, -30] },
             "decay": { "plain": 1, "close": 0.5, "grudge": 0.25, "familiarity": 1 } },
  "memories": { "cap": 6, "halfLife": 4, "kinds": { "insulted": { "strength": 12, "relive": "Still smarting from what {name} said.", "drift": { "temper": 1 } } } },
  "deeds": { "range": 6, "fell_tree": { "nature": -2 } },
  "social": { "considerEvery": 5, "range": 3, "cooldown": 20, "base": 0.35, "maxPerBeat": 8, "maxExchangesPer10Beats": 3 },
  "interactions": { "gift": { "enabled": false } },
  "brawl": { "minTemper": 70, "maxOpinion": -50, "maxDiscipline": 60, "floor": 0.5, "maxExchanges": 8, "everyTicks": 36 },
  "tones": { "threshold": 0.6, "gruff": { "open": ["Hmph.", "Bah."], "openChance": 0.5, "pick": "shortest" } },
  "talk": { "words": { "friends": "friends", "beliefs": "beliefs" }, "guarded": { "mood": ["I am well enough. That is all you need to know."] } },
  "orders": { "eager": { "plain": ["At once."] }, "grudging": { "plain": ["You again? Fine."] }, "delayBeats": 0 },
  "lines": { "greet": { "plain": ["Good day, {name}."], "gruff": ["Hmph. Day."] } },
  "temperament": { "spread": 15, "kinds": { "grazer": { "bold": 30, "aggr": 15, "curious": 40, "herd": 75, "skittish": 70 } } },
  "profile": { "lately": { "joke": "Joked with {name}" } }
}
```
(Lists are shortened here; the build writes them in full.)

### 10.2 Small edits in other files (MERGE RULE for each: compare `game/`'s copy with the snapshot's starting copy right before copying back; re-apply onto a changed version)
| File | Edit | Size |
|---|---|---|
| `UF_Talk.js` | `sayIn`: try `<variant>@<tone>` first; after `fill`, apply `UF.Personality.voice`; `lineFor` gains the listener (the open talk's voice) and returns `{ text, base, tone }`; each answer sentence carries its share level and is dropped above `UF.Personality.shareLevel`; `friends` and `beliefs` topics and the opinion sentence through `UF.Personality.talkExtra`; `talk:closed` already exists; the suite compares `base` | about 40 lines |
| `UF_Speech.js` | in `say`: when `opts.voice` and `UF.Personality.voice` exist, `text = UF.Personality.voice(speakerUnit, text, opts.voice)` inside try/catch; everything else unchanged (the speech suite never passes `voice`) | about 6 lines |
| `UF_Sheet.js` | `UF.Sheet.addUnitPage(id, label, fn)`: a page list; the unit panel's header shows a tab per page; the chosen page's `fn(unit)` returns `[{ title, rows: [{ text, color? }] }]`, drawn with the panel's text helper and folded into `m.sig`. If the chain-of-command build's `addUnitLines` lands first, both keep working (lines on the first page, pages beside it) | about 40 lines |
| `UF_Colonists.js` | social branch of `needJob`: `const partner = P && P.pickCompanion ? P.pickCompanion(u, candidates) : candidates[0]`, where `candidates` is the list the current `colonists().find(...)` searches, made with `filter` instead; `nightlyMateJob`: `if (P && P.mateFilter) candidates = P.mateFilter(u, candidates)` (only after the user answers §14 Q2). If the bands run's `addDecider` has landed, the first edit becomes a decider instead of an edit | about 6 lines |

### 10.3 What is used without editing
- `UF.World` (units, `eventOf`, `hash32`, `mulberry32`, `state`), `UF.Events` (`world:created`, `world:unitAdded`, `world:unitRemoved`, `colonists:ready`, `colonists:born`, `time:minute`, `jobs:done`, `combat:hit`, `combat:kill`, `anim:death`, `skills:levelUp`, `talk:closed`), `UF.Colonists.addThought` and `facetsFor`, `UF.Jobs.define/create/cancel/of`, `UF.Time.after`, `UF.Combat` (§6.4), `UF.Stance.of`, `UF.Factions.tierBetween`, `UF.History.addEvent`, `UF.Speech.say`.
- Not edited: `UF_Wildlife.js` (claimed; §4 lists what its owner can read), `UF_Combat.js`, `UF_History.js`, `UF_Skills.js` (its owner may pass `voice: true` in `sayOverHead`, one line, for toned level-up remarks), `UF_Jobs.js`.

### 10.4 Load order and registration (for the build)
`… UF_Sheet > UF_Talk > UF_Fire > UF_Personality > UF_Test`: all its hooks into other plugins are runtime calls to `window.UF.Personality`, so it only needs to load after the plugins whose public objects it wraps or defines jobs in (UF_Jobs, UF_Colonists, UF_Combat, UF_Speech, UF_Sheet, UF_Talk). The build reports the exact `plugins.js` entry and the `tools/register_world_plugins.js` `ORDER` change ("UF_Personality" between "UF_Fire" and "UF_Test", plus its description) for the lead; the RMMZ editor rule applies (AGENTS.md).

### 10.5 API (`UF.Personality`)
| Member | Description |
|---|---|
| `trait(u, name)`, `traits(u)`, `values(u)`, `temperament(u)` | reads (defaults 50 / 0 / the species norm) |
| `rollFor(seed, unitId, species, parents?)` | the pure roll of §2.3–2.4 (tests and old saves) |
| `compat(a, b)`, `bond(a, b)`, `opinion(a, b)`, `label(a, b)`, `bondsOf(u)` | §5; `bond` returns a copy or null |
| `memories(u)`, `socialLog(u)` | copies |
| `toneOf(speaker, listener, ctx?)`, `voice(speaker, text, opts)`, `variantsFor(unit, section, variants, listener)` | §7 |
| `shareLevel(speaker, listener)`, `talkExtra(u, key, listener, n)` | §7.4 |
| `answerOrder(member, giver, order)`, `onOrder(member, giver, order, phase)` | §7.6 |
| `pickCompanion(u, candidates)`, `mateFilter(u, candidates)` | §6.1, §6.5 |
| `choose(a, { dry })`, `interact(a, b, kind, opts)` | the director's choice for one person (pure with `dry`), and one interaction by hand (tests, later systems) |
| `brawls()`, `stopBrawl(id, why)` | running brawls |
| `soak(beats, { mingle, speech })` | runs the director headless on the live state; `mingle` treats one band at one site as near each other; returns counts |
| `profile(u)` | the Person page's sections |
| `config()`, `stats()`, `perf()`, `resetPerf()`, `log()` | settings with defaults, counters, cost meter, the session log of lines and interactions |
| `TRAITS`, `VALUES`, `TONES`, `KINDS` | constants |

Events emitted: `personality:rolled(unit)`, `personality:interaction({ kind, a, b, tone, texts, delta })`, `personality:label(a, b, from, to)`, `personality:partners(a, b, on)`, `personality:brawl({ id, a, b, phase, winner })`, `personality:memory(unit, memory)`, `personality:deed({ doer, deed, witnesses })`.

---

## 11. Checks (suite `personality`, on request: `node tools/run_tests.js personality --game <snapshot>`)
Fixed seed; run on a snapshot (docs/systems/UF_Test.md). Each check must be seen failing once; the plugin parameter `TestProvoke` (honoured only in `--uf-test` runs, set only in a snapshot's `plugins.js`, `all` or a comma list) breaks what the check guards:

| Check | FAILs when | Provoked by |
|---|---|---|
| `everyone_has_one` | After New Game, a forced birth, a test arrival and an ecology monster spawn: a person (any faction) lacks one of the ten `facets`, the six `traits`, valid `values` (known keys, −3..3) or `persona`; a faction has no such person; a swarm person has `talks` true; a creature lacks any of the five `temperament` axes or one is outside 0–100; `rollFor(seed, id, species)` differs from a founder's stored traits; a colonist's `facets` differ from `UF.Colonists.facetsFor(seed, id, bias)` | only the player's colonists rolled; creatures skipped |
| `inherited` | 20 children of two test parents at 90 on every trait and +3 on every value, and 20 of two at 10 and −3 (forced births through `UF.Colonists.giveBirth`): the mean over all traits of (high children − low children) is < 25 (the formula gives 32), any single trait is not higher for the high group, the values' pooled difference is < 1.5 (formula 3), or two children share all sixteen traits | `inherit` weights 0 |
| `tone_varies` | Test people "cheerful" and "grumpy" (§7.2's traits) with no bond to the listener: `toneOf` isn't cheerful and gruff; for every `talk.lines` section with `@cheerful` and `@gruff` variants and 20 other templates (talk, `personality.lines`, `skills.speech.text`), the two texts are equal or either lacks its tone's variant or modifier; the grumpy to a close friend (o 70, f 60) isn't warm; the cheerful to a rival (o −60) isn't curt; a `plain` voice changes the template | tone forced to plain |
| `opinions_form` | `soak(2880, { mingle: true })` from New Game: Spearman correlation of `compat` and opinion over all bonded directed pairs < 0.5 (scratch model 0.996, with noise 0.077); fewer than 60% of bands with a friend-or-better pair; fewer than 3 rival-or-worse pairs world-wide; a label differs from the one §5.4 computes; a bond between two people who never met (the soak log lists every contact); more bonds than the cap | compatibility replaced by seeded noise |
| `interactions_logged` | Live at the player's camp, zoom 1: each kind forced once on staged pairs (a sad friend, a hothead rival, a courting pair, a builder and a free helper; gift refused while disabled), then 300 beats at ×8 of free choice. A kind never occurs when forced; the free run shows fewer than 5 kinds; an occurrence lacks the speaker's line over their head within 2 frames (`UF.Speech.lines`), the reply (kinds with one), an opinion change on both sides, a thought on both, a `data.social` entry on both; any `say` by UF_Personality has a kind other than remark or shout, a text that isn't a filled template (by the session log's template id), or a status word (a UF_Jobs verb, "Zzz", "Level") | the line said as "Chatting" with kind thought, and B's log entry and thought skipped |
| `brawl_rules` | Staged adjacent adults at full hitpoints: (a) temper 90, o −70, discipline 10, bravery 60, after an insult: no brawl within 10 beats; an exchange whose numbers differ from §6.4's formulas; hitpoints below the floor; a `combat:kill` or a death chronicle line; `UF.Combat.inCombat` true after; memories or the grudge flag missing. (b) temper 40, (c) o +20, (d) discipline 90, (f) an undead test faction (brawl 0), (g) a teen: any brawl in 30 beats of repeated insults. (e) as (a) with a superior of discipline 70 within 6 cells: not stopped within 2 exchanges, or no break-up line | temper and discipline tests removed, floor 0 |
| `talk_shares_by_opinion` | UF_Talk with one person P and voices V1 (P's opinion 70), V2 (−60), V3 (no bond): V1's answers to greet, name, job, mood and family lack a level-3 part or add fewer than 2 keywords more than V2's; V2's mood answer isn't a `guarded` line or its family answer names the partner; V3's `base` texts differ from `lineFor` without UF_Personality's share filter (today's output); the greeting tones for V1 and V2 are the same | share level fixed at 2 |
| `profile_shows` | `UF.Sheet.open` on a colonist, Person page: the model lacks the words of the five most extreme out-of-band traits or shows a middle-band one; values ±2/±3 missing or ±1 shown; the three strongest thoughts missing; a non-acquaintance bond missing (up to 8) or its label differs from `label()`; "Lately" differs from the last three log entries; a section's rectangle has fewer than 100 opaque pixels; on an animal no "Temperament:" line; on a stranger values shown before `beliefs` was asked | the page provider not registered |
| `saved` | After the soak and a brawl, a JsonEx round-trip of `UF.World.state` changes any person's `facets`, `traits`, `values`, `persona`, `bonds`, `memories` or `social`, any creature's `temperament`, or `state.personality`; after `DataManager.extractSaveContents` of that copy, `choose(a, { dry: true })` differs for any person from the same call before saving; a copy with every personality field removed doesn't re-roll the same traits, or throws | bonds kept in a session Map |
| `perf` | New Game plus 300 `TEST_` people around the camp (about 390 people) and all creatures, 240 beats at ×8: director average > 0.4 ms per beat or worst > 2 ms; per-frame average > 0.02 ms; 200 toned lines average > 0.1 ms; profile model > 0.5 ms; personality fields > 800 bytes per person on average in `JsonEx.stringify(state)`; any Bitmap made by UF_Personality. The detail names the method (performance.now around the handlers) and the machine | the director runs every map update over everyone, plus a 2 ms busy wait per beat |
| `no_errors` | any uncaught error recorded during the suite | an error pushed into the harness's list (as UF_Talk's suite does) |

**Screenshots** (the builder opens and describes each): `personality.chat` (two people exchanging lines over their heads at zoom 1, nothing else over any head), `personality.brawl` (a shout over a brawler's head, both still standing), `personality.profile` (the Person page), `personality.animal` (an animal's temperament), `personality.talk_friend` and `personality.talk_rival` (the same person's answers to two voices).

Also run with UF_Personality on the same snapshot: `talk`, `speech`, `sheet`, `colonists`, `combat`, `skills`, `smoke`. Their existing checks must still pass (the talk suite with the `base` comparison of §7.3).

---

## 12. Sample lines (tone variants)
All new, our own, plain. The first nine are one template (`personality.lines.greet`) in every tone, said to Wenna.

| # | Kind, tone (who) | Line |
|---|---|---|
| 1 | greet, plain | Good day, Wenna. |
| 2 | greet, warm (kind, close friend) | Wenna! Good to see you. |
| 3 | greet, cheerful | Good day to you! A lovely morning! |
| 4 | greet, boastful | Good day. Seen my new wall yet? |
| 5 | greet, formal (Wenna outranks the speaker) | Good day to you, Wenna. I trust you are well. |
| 6 | greet, curt | Day. |
| 7 | greet, gruff | Hmph. Day. |
| 8 | greet, shy | Oh. Um, good day. |
| 9 | greet, anxious | Oh! Good day. Is all well? |
| 10 | talk greeting `own_fine@cheerful` (the cheerful test person) | Ask away! I am in fine spirits today. |
| 11 | talk greeting `own_fine@gruff` (the grumpy test person, same template) | What now? Be quick about it. |
| 12 | level-up remark, boastful modifier on `skills.speech.text` | I'm getting better at woodcutting. Not that I needed the practice. |
| 13 | talk `mood`, share 3 (to a close friend) | Honestly? I am unhappy. I have not forgotten what Dorar said to me. |
| 14 | talk `mood`, share 1 (to a rival), guarded | I am well enough. That is all you need to know. |
| 15 | chat about good work, warm | Your joints are true, Dorar. Who taught you? |
| 16 | joke, cheerful | I asked the goat for advice. It ate my hat! |
| 17 | gossip, plain | Tamsin naps by the woodpile every noon, you know. |
| 18 | compliment, warm | That was fine work on the roof, Ostis. |
| 19 | comfort, warm | Sit with me a while. It will pass. |
| 20 | ask for help, formal | Would you lend me a hand with these logs? |
| 21 | argue about the old ways, gruff | The old ways kept us alive. Leave them be! |
| 22 | argue, reply, curt (values learning) | Old ways, old mistakes. |
| 23 | insult, gruff | You work like a wet sack of meal. |
| 24 | brawl start, shout | Say that again, I dare you! |
| 25 | brawl stopped, formal (a disciplined superior) | Enough, both of you! Back to work. |
| 26 | court, shy | I kept a place by the fire for you. |
| 27 | court, reply, warm (accepts) | Then I will sit by you. |
| 28 | order answer, eager | At once. |
| 29 | order answer, grudging (a rival gives the order) | You again? Fine. |
| 30 | disapproving a felled tree (holds the wild dear) | Must you fell every tree in sight? |

---

## 13. Not in this build
- Refusing orders, or starting them late without the user's yes (§7.6, §14 Q5).
- Gifts, until the user approves the rule (§6.6).
- Values weighting work choice (V23 today uses the facets only).
- Lies, secrets, schemes and intrigue; group conversations of three or more; meeting halls and taverns.
- Animals bonding with people (pets, tamed beasts), and animals remembering people.
- Discontent that makes people leave and found a faction (V42): a later `UF.Personality.discontent(u)` can feed it.
- Mental breaks and tantrums.
- The colonist card (UF_ColonyOverseer) and the look tooltip showing personality; the profile page does.
- Wildlife and combat actually reading temperament: that is their owners' change (§4).

## 14. Decisions for the user
1. **Gifts (V71).** Approve the gift rule of §6.6 (one unit of an item the giver owns and doesn't need; ownership moves)? Until then gifts are off.
2. **Intimacy only between partners?** Recommended yes (V78 says relationship rules gate it), which means couples form by courting first. Today any two eligible adults of a band may pair each night.
3. **Who may court whom?** Today's code prefers a man and a woman for children. Keep that for partners, or may any two adults become partners?
4. **Brawls among your own people.** Allowed under §6.4's rules (non-lethal, stopped by disciplined people), or off for the player's faction?
5. **Grudging answers to orders.** May a grudging member start an order one beat late, or should answers only be words?
6. **Founders know each other** at the start (familiarity 30, opinions from compatibility)? Recommended yes: they are a band around one fire.
7. **Strangers' profiles.** Show their ways at once and their values only after someone asked them (recommended), or everything at once?
8. **Partners parting** after three days of mutual dislike: yes, or partners for life?
