# CHAIN OF COMMAND: ranks in threes, orders down the chain

Design written 2026-09-19 by Claude Code, revised the same afternoon to the user's tree of threes. Not built yet. This is the spec for one build of a new plugin, `UF_Command`.

The user's words (2026-09-19 afternoon):
- "I want a societal hierarchy where one character within a faction gives orders to others."
- "The faction command sstrcutre should be that for every 3 rank 1, theres a rank 2, for every 3 rank 2, theres a rank 3, and so on. Each faction should have lore names for their ranks"

Decisions it implements (docs/VISION.md): V52 (every faction has a power structure; ranks are a tree of threes, and eight founders make five rank 1, two rank 2 and one rank 3; every faction has its own rank names; orders flow down; members obey unless hunger, thirst, exhaustion or danger comes first; orders are spoken over the head and shown on the sheet; the player's orders enter at the top), V39 (each faction has a culture), V42 (splits), V62 (orders are over-head text), V4 (every band starts as eight peasants around a lit campfire, one of them the leader), V17 (orders are never required), V23 (work chosen by skills and personality), V63 (skills 1–99), V64 (combat levels), V65 (Arthurian fantasy with science-fiction elements), V7 and V9 (names are our own). AGENTS rule 7: every rank name is a proposal until the user approves it (§10). Contract rules: docs/design/WORLD_ARCHITECTURE.md §1 (state in `UF.World.state` / `unit.data`, seeded randomness, budgets), §2.10 "Societies and rank".

**What this revision changed (2026-09-19 afternoon).** Rank 1 is now the base. The first draft numbered rank as height in the tree (0 member, 1 leader), and so does UF_History's code of 2026-09-19. A band is now a tree: each rank k+1 person commands one to three rank k people, up to one head (§1.2). How many hold each rank follows one fill rule (§1.3). One seniority order decides who holds which rank and forms the groups (§1.4). The tree is repaired in one pass whenever the band changes (§1.5), and succession uses that pass (§1.6). Every faction takes a set of rank names from its culture (§1.7; the names go in §10). Orders now flow down the tree: the head sets the band's priorities, and each commander orders its own group (§3.3). Unchanged: the order record (§2), how members obey with danger and survival first (§4), what the player sees apart from the rank names (§5), and what the bands run must expose (§6.2).

**Review fixes (later on 2026-09-19).**
- Someone who joins from another band now counts as a newcomer. It starts at rank 1, whatever rank it held there (§1.5 step 2).
- The V42 build now makes a split's new band record with `UF.Command.startBand`, which sets its head and signature, so the leavers keep their ranks (§1.5, Splits; §6.5).
- §10.6 item 1 now lists every rank name that puts a thing in front of a name.
- The automata's Array set is replaced by the Glass garrison (§10.3).

**Build after:** the bands run lands (every faction's band runs UF_Colonists' loop: `state.societies[factionId]`, jobs with `params.faction`), and UF_Speech is registered. §6.2 lists exactly what UF_Command needs from those.

**Art:** none. Lines are text drawn by UF_Speech; the sheet and the menu are text. No handoff and no ASSET_REQUESTS entry.

---

## 0. In short
- Every adult (18 or older) in a band holds a rank. Rank 1 is the base. A rank k+1 person commands one to three rank k people. One head is at the top. Children and teens hold no rank; each one is in the care of a commander.
- How many hold each rank follows one rule (§1.3). Eight founders make five rank 1, two rank 2 and one rank 3.
- At founding the head is UF_History's leader. The others take ranks by seniority: eldest first, then total skill, then unit id. Each commander's group holds up to three, with kin together where there is room.
- The tree is repaired in one pass, with no random numbers, whenever the band changes: a birth, a coming of age, a death, someone joining or leaving, a split. A dead head is succeeded by the most senior of the rank below, and the places below are refilled the same way. Someone who joins from another band starts at rank 1, whatever rank it held there.
- Every 10 game minutes the head reads the band and sets its priorities (a task list). Then every commander, from the top down, gives its own group orders from that list. An order is a record on the member (`data.order`) from its own superior.
- A member's turn goes: danger, survival (thirst, hunger, exhaustion, night), then its order, then its own choice.
- Each commander says its orders over its own head and names only its own group ("<R2> Wenna, cut us some wood."; in this file <Rk> stands for the band's name for rank k). The sheet shows a member's rank name, its superior, its group and its order.
- Every faction has its own rank names: one set from its culture's sets in the catalog, picked by seed. Factions of one culture get different sets where the culture has enough.
- The player sits above the head. Designations and a "Band orders" menu go to the head. A direct order to one colonist goes straight to that colonist and outranks every commander.

---

## 1. Who commands

### 1.1 The band
- A **band** is the living members of one faction's society: `UF.Colonists.members(factionId)` (the player's colonists, or another faction's people running the colonist loop).
- **Ranked members** are those with `data.age >= rankAge` (18, catalog `command.rankAge`). The age decides, not `data.stage`: UF_Colonists ages children by one year every 7 days but doesn't update `stage`.
- **Wards** are the members under 18: babies, children and teens.
- The player's band has the same tree (V52: "The player's faction keeps its ranks too"). §5.3 says how the player's orders sit on top.

### 1.2 Ranks and the data on each unit
Rank 1 is the base. The head holds the band's highest rank, h, which is also the number of ranks. The first draft of this file numbered the other way (0 member, 1 leader), and so does UF_History's code of 2026-09-19 (leader 1, everyone else 0). That numbering is retired, and the code that reads it changes in this build (§6.3). The retired settling generator (ruler 2, site leader 1) is switched off and is not converted.

| Field | A ranked member | A ward (under 18) |
|---|---|---|
| `data.rank` | 1 … h | 0 |
| `data.superior` | the unit id of its commander, one rank higher; `null` for the head only | the commander who has its care (§1.4); `null` when the band has no head |
| `data.title` | the band's name for its rank (§1.7), in the member's gender form | removed |

UF_Command keeps a cache per band in `state.command.bands[factionId]` (§2.5): `headId`, `counts` (the fill result at the last repair), `sig` (the member signature at the last repair), `culture` and `rankSet`. The truth stays on the units. The cache is checked at every review.

**The tree invariant.** All of these hold after every repair. The checks test exactly these (§7).
1. Exactly one head: a ranked member with `superior` null and rank h = `counts.length`. `bands[fid].headId` names it.
2. The number of ranked members at rank k is `fill(N)[k − 1]` for every k, where N is the number of ranked members (§1.3).
3. Every ranked member except the head names as `superior` a living member of the same band whose rank is one higher.
4. Every member of rank k ≥ 2 has one to three ranked subordinates, all of rank k − 1. Wards don't count.
5. From any member, following `superior` reaches the head in at most h steps. So there are no cycles and no strays.
6. Every ward has rank 0 and a `superior` who is a ranked member of the band (when the band has a head).
7. Every ranked member's `title` is its rank's name in the band's set.

### 1.3 The fill rule: how many hold each rank
In words: put as many people as possible at rank 1, then as many as possible at rank 2, and so on. Three limits apply:
- everyone at rank k needs a commander, so rank k+1 holds at least ⌈n_k / 3⌉;
- every commander needs someone to command, so rank k+1 holds at most n_k;
- the top rank holds exactly one.

When the band size fits the threes, rank k+1 holds exactly ⌈n_k / 3⌉, as the user said. When it doesn't, the one or two people left over become commanders: a rank gets one more commander than the threes need (six people: 3/2/1), or a head is added over a single commander (five people: 3/1/1).

```js
// fill(n): people per rank in a band of n ranked members: [rank 1, rank 2, ..., 1 (the head)]. [] when n = 0.
function fill(n) {
  const above = c => (c <= 1 ? 0 : Math.ceil(c / 3) + above(Math.ceil(c / 3))); // fewest people needed over c people
  const out = [];
  let below = 0, left = n;                         // below: people at the rank just filled; left: people not placed yet
  while (left > 0) {
    const lo = below ? Math.ceil(below / 3) : 1;   // enough commanders for everyone below
    let c = below ? Math.min(below, left) : left;  // no commander without someone to command
    while (c > lo && c + above(c) > left) c--;     // leave enough people to command this rank
    out.push(c); left -= c; below = c;
  }
  return out;
}
```

Run on 2026-09-19 with `"C:\Program Files\nodejs\node.exe" -e "<the function above>; for (let n = 1; n <= 40; n++) console.log(String(n).padStart(2), fill(n).join('/').padEnd(10), 'head rank', fill(n).length);"`. The output as printed (people per rank, rank 1 first):

```
 1 1          head rank 1
 2 1/1        head rank 2
 3 2/1        head rank 2
 4 3/1        head rank 2
 5 3/1/1      head rank 3
 6 3/2/1      head rank 3
 7 4/2/1      head rank 3
 8 5/2/1      head rank 3
 9 6/2/1      head rank 3
10 6/3/1      head rank 3
11 7/3/1      head rank 3
12 8/3/1      head rank 3
13 9/3/1      head rank 3
14 9/3/1/1    head rank 4
15 9/3/2/1    head rank 4
16 9/4/2/1    head rank 4
17 10/4/2/1   head rank 4
18 11/4/2/1   head rank 4
19 12/4/2/1   head rank 4
20 12/5/2/1   head rank 4
21 13/5/2/1   head rank 4
22 14/5/2/1   head rank 4
23 15/5/2/1   head rank 4
24 15/6/2/1   head rank 4
25 16/6/2/1   head rank 4
26 17/6/2/1   head rank 4
27 18/6/2/1   head rank 4
28 18/6/3/1   head rank 4
29 18/7/3/1   head rank 4
30 19/7/3/1   head rank 4
31 20/7/3/1   head rank 4
32 21/7/3/1   head rank 4
33 21/8/3/1   head rank 4
34 22/8/3/1   head rank 4
35 23/8/3/1   head rank 4
36 24/8/3/1   head rank 4
37 24/9/3/1   head rank 4
38 25/9/3/1   head rank 4
39 26/9/3/1   head rank 4
40 27/9/3/1   head rank 4
```

Cross-checks run the same day (a scratch script, not in the repo):
- For n = 1 to 45 the rule gives the same result as a brute-force search over every valid list of counts that takes the most at rank 1, then the most at rank 2, and so on.
- For n = 1 to 5000 every result obeys the three limits. The number of ranks is always the least possible (h ranks hold at most (3^h − 1) / 2 people). At most two one-person ranks sit at the top.
- With `Math.floor` in place of `Math.ceil`, n = 8 gives 6/2 (no head). So the `fill_rule` check can fail (§7).

**Edge cases.**

| People (N) | Per rank | How it resolves |
|---|---|---|
| 0 | none | No head and no ranks (§1.8). |
| 1 | 1 | A band of one is its own head, at rank 1. It commands nobody, gives no orders and lives by its own choice. |
| 2 | 1/1 | The head is rank 2 and commands one rank 1. |
| 3 | 2/1 | The head is rank 2 and commands two. |
| 4 | 3/1 | The head is rank 2 and commands three: a full group. |
| 5 | 3/1/1 | A thin top: the head (rank 3) commands one rank 2, who commands three. Thin tops come only just after a band outgrows a full tree: at 2, 5, 14, 41, 122, 365 and 1094 people. |
| 8 | 5/2/1 | The founders (V52). |

The largest band per head rank: rank 2 holds up to 4 people, rank 3 up to 13, rank 4 up to 40, rank 5 up to 121, rank 6 up to 364, rank 7 up to 1093.

**Past rank 7.** The rule has no cap. A band of 1094 people or more gets a rank-8 head (729/243/81/27/9/3/1/1). The rank names stop at 7, so a rank above 7 shows the set's rank-7 name. The budgets (V50) keep bands far below that size. The `fill_rule` check covers it anyway.

### 1.4 Who holds which rank
**Seniority** is one order, used everywhere: promotion, stepping down, succession and groups.
1. The elder first: the higher `data.age`.
2. Equal ages: the smaller `data.born`.
3. The higher total skill level (`UF.Skills.total(unit)`; skipped when UF_Skills is absent).
4. The lower unit id.

**Rank, then seniority** sorts by the current `data.rank` (highest first; missing counts as 0), then by seniority.

**At founding.** On `world:created`, after UF_History has spawned the founders. UF_Command's listener runs later than UF_History's because it loads later.
1. The head is UF_History's leader: the unit in `history.rulers[factionId][0].unitId`, drawn by UF_History's seeded roll, unchanged. It gets rank h.
2. The other founders go in seniority order. The first `counts[h − 2]` get rank h − 1, the next `counts[h − 3]` get rank h − 2, and so on. The rest get rank 1. With eight founders, the two eldest besides the head are rank 2 and the other five are rank 1.
3. The groups are formed as below.
4. Every title is set (§1.7). The ruler record's `title` becomes the head's rank name.

This is the repair of §1.5 on a band that has no record yet: every founder counts as a newcomer (step 2), and the head comes from the ruler record (step 3).

**Groups.** For each rank r from h − 1 down to 1, the rank r members are placed under the rank r + 1 members (the commanders, taken in seniority order):
1. **Keep.** In seniority order, each member whose current `superior` is one of these commanders stays with it, while that commander has fewer than three.
2. **Place.** The rest go one at a time, in seniority order, to the first commander with room (fewer than three) who is kin of the member or already has kin of the member in its group. If there is none, the member goes to the commander with room that has the fewest (ties: the more senior commander).
3. **No empty commanders.** While a commander has nobody, it takes the least senior member of the commander with the most (ties: the less senior commander).

Kin means partner (`data.partner`), mother or father (`data.motherId`, `data.fatherId`), child, or sibling (the same mother or the same father). There is always room, because the fill rule gives each rank at most three and at least one per commander. At founding nobody has a superior yet, so the place step deals the five rank 1 in turn: the senior rank 2 gets three and the other gets two.

**Wards.** A member under 18 has rank 0. Its `superior` is the commander who has its care:
- take its mother if she is a ranked member of the band, else its father if he is;
- that parent itself when the parent holds rank 2 or more or is the head, else the parent's own superior;
- the head when neither parent is a ranked member of the band.

Wards don't count toward the three. Babies and children get no orders. Teens get the teen kinds (§2.2) from that commander.

**Example** (from the scratch model): eight founders, ids 1–8, aged 30, 38, 25, 40, 22, 35, 19 and 27, with equal skills. UF_History's leader is id 3 (25). The head is id 3, rank 3. Rank 2 goes to id 4 (40) and id 2 (38). Id 4 leads ids 6, 8 and 7; id 2 leads ids 1 and 5.

### 1.5 Keeping the tree right: the repair
`repair(factionId)` is one pass. It uses no random numbers and reads only the band's units and its record, so the same seed and the same events always give the same tree.
1. N is the number of members aged 18 or older; `counts = fill(N)`; h = `counts.length`. If N is 0, every member gets rank 0 and `superior` null, `headId` becomes null, titles are removed, and the pass stops (§1.8).
2. **Newcomers.** Before anything is sorted, every adult member whose id is not in the record's `sig` gets rank 0.
   - This covers a member who joins from another band. It may bring that band's `data.rank`, `superior` and `title`. Here it starts from rank 0, like someone who has just come of age, so it can't become head or take a commander's place ahead of the band's own members.
   - A ward who comes of age is already in `sig` and already holds rank 0.
   - A band with no record yet (at founding, or on an old save's first repair) has no `sig`. All its adults count as newcomers, and its head comes from the ruler record (step 3).
3. **The head.**
   - The recorded head (`headId`) stays if it is still a living adult member of the band.
   - If the band has no record yet, the head is the unit named by the faction's open ruler record: the record in `state.history.rulers[factionId]` with `to` null. UF_History writes the leader's unit id there. That unit must be a living adult member.
   - Otherwise succession picks one (§1.6).
   - The head gets rank h and `superior` null.
4. **Ranks.** The other adults are sorted by rank, then seniority. The first `counts[h − 2]` get rank h − 1, and so on down; the rest get rank 1. Because the current rank sorts first, people keep their rank whenever the counts allow. When a rank needs one more person, the most senior of the rank below is promoted. When a rank needs one fewer, its least senior steps down. Newcomers hold rank 0 after step 2, so they sort after everyone who already has a rank. A newcomer starts at rank 1 unless the band has too few ranked members for the ranks above. For example, if five people join a band of one, the two most senior of them become rank 2.
5. **Groups**, as in §1.4 (keep, place, no empty commanders).
6. **Wards**, as in §1.4.
7. **Titles** (§1.7).
8. **Record.** `counts`, `sig` and `headId` are saved. If any rank or superior changed, `command:ranks(factionId, { counts, changes: [{ id, from, to, superior }] })` is emitted. A new head runs the succession effects (§1.6). Orders already given stand until they end (§4.5). The next review uses the new groups.

**When it runs.**

| Change | Trigger | Result |
|---|---|---|
| Founding | `world:created` | Every band's tree is built (§1.4). |
| Birth | `colonists:born`, `world:unitAdded` | The baby becomes a ward. No rank changes. |
| Coming of age | `time:day` when a member has reached 18 (UF_Colonists ages children on the same event and registered first) | The new adult joins at rank 1. Someone is promoted if a rank needs one more. |
| Death | `world:unitRemoved`, `combat:kill`, `anim:death` for a band member | The empty place is refilled from the rank below, down the chain. If the counts shrink, a rank steps down instead. |
| Joining or leaving (a faction change) | No event exists; the signature check below finds it. | A joiner is a newcomer (step 2). It starts at rank 1, whatever rank it held in its old band, and its old `superior` and `title` are replaced. A leaver is handled as a death. |
| Split (V42) | The V42 build calls `UF.Command.startBand` for the new band, then `UF.Command.repair` on both bands. | See below. |
| Anything missed | At the start of every review and on `time:hour`, the band's signature (its member ids, sorted, each with an adult flag) is compared with `sig`. | A repair when they differ. Old saves (leader 1, everyone else 0) convert on their first repair. They have no record, so the head is the open ruler record's unit, which is the old leader (step 3). The others take ranks by seniority. |

Events in one frame are queued. Each band repairs at most once per frame, at the end of the map update.

**The scratch model.** The rules above were run in a scratch script (not in the repo). It was re-run on 2026-09-19 after the newcomer rule (step 2) was added.
- **What it did.** It founded 300 bands of eight. Then it made 35,324 random events: births, deaths (15% of them aimed at the head), arrivals, departures, comings of age, splits, and pairs who left to found a band of two.
- **Joiners.** Half the arrivals were joiners from another band. Each carried a rank from 1 to 4 and a superior from its old band. A quarter of them arrived in the same frame as the head's death.
- **Results.** Every founding came out 5/2/1. The invariant held after every repair. A second repair never changed anything. One event changed at most 3 ranks besides the newcomer's own, or 5 for a split.
- **Joiner results.** All 4,530 joiners ended at rank 1. None became head over a native adult, including the 1,058 who arrived as the head died. All 61 pairs were headed by their more senior member.
- **Kin.** At the end, 247 of the 317 pairs of kin at rank 1 had the same commander.
- **The model can fail.** In a copy without step 2, 2,262 joiners ended above rank 1, and 699 became head over a native adult. The invariant still held after every repair, so the invariant alone can't catch this. `tree_after_changes` (f) and (h) test it (§7). In a copy where a leaving pair's head was not set, 2 of 61 pairs were headed by the less senior member.
- **The expected results of `tree_after_changes` (f), (g) and (h)** (§7) were also run on the model. All three passed. In the copy without step 2, (f) and both parts of (h) failed.

**Splits** (V42; the split itself is not built yet). V52 says that who leads a split flows down the ranks.
- A split takes one commander below the head, with everyone under it: its subtree and their wards. `UF.Command.subtree(unitId)` lists who goes.
- The V42 build makes the new band's record before any repair, with `UF.Command.startBand(newFid, headId, memberIds)` (§6.5). That sets `bands[newFid].headId` to the leaving commander and `sig` to the signature of everyone who leaves.
- Because they are all in `sig`, none of the leavers counts as a newcomer. The commander stays head, and the others keep their ranks as far as the new band's counts allow. Example: a rank-3 commander who leaves with one rank 2 and one rank 1 heads a band of three, so it holds rank 2 there, and the other two hold rank 1.
- A rank 1 who leaves alone or with its partner makes a band of one or two. The V42 build calls `startBand` with the more senior of the two as head, whatever their ranks were, and both as members.
- Then both bands are repaired, and the new faction picks its rank names (§1.7).

### 1.6 Succession of the head
**Trigger.** The head is gone: its unit no longer exists, `data.dead` is true, `data.hp <= 0`, or its faction changed. Checked on `world:unitRemoved`, `combat:kill` and `anim:death`, and at the start of every review, so a missed event can't leave a band headless.

**Rule** (repair step 3; no roll). The first member by rank, then seniority: the most senior member of the highest rank left. With a sound tree those are the old head's direct subordinates, so no rank is skipped (open question 4). Newcomers hold rank 0 by then (step 2), so someone who has just joined from another band never succeeds ahead of the band's own ranks. The same pass then refills the successor's old place from the rank below, and so on down the chain. If the band has no adult left, it has no head (§1.8).

**Effects.**
- The new head gets rank h for the band's new size, `superior` null, and its rank's name as title.
- `state.history.rulers[factionId]`: the open record gets `to` = `UF.History.currentYear()`, and a new record `{ name, title, from: currentYear, to: null, unitId }` is pushed. This goes through `UF.History.addRuler(factionId, record)` if UF_History has it; otherwise UF_Command writes it directly in the documented shape (WORLD_ARCHITECTURE §2.7).
- One chronicle line: `UF.History.addEvent({ type: "succession", text, factions: [factionId] })`, text "Tamsin became <title> of The Ostwyn League after Dorar died." ("was lost" when removed without a death, "left" when the faction changed).
- The new head says one line (kind "remark"): "I will lead us now."
- Orders the old head gave stand until they end (each keeps `byName`). The next review is forced (§3.1).
- `command:succession(factionId, newHead, { id, name })` is emitted.

**The head's rank changes without a succession** when the band grows or shrinks past a limit, for example from 13 to 14 people (rank 3 to rank 4). Its title changes with it. The open ruler record's `title` is updated, and one chronicle line is added: "Tamsin of The Ostwyn League is now <title>." (type "title").

### 1.7 Rank names per faction
**Catalog.** A new key `command.rankNames`, keyed by culture. The catalog's `cultures` object is keyed by species id: `human` (Settlers), `elf` (Grove-keepers), `dwarf` (Stone-holders), `gnome` (Tinkers), `goblin` (Scavengers), `orc` (War-bands) and `automaton` (Foundry-minds). A faction's culture is `cultures[faction.species]` (`UF.Colonists.culture(factionId)` in the bands run). The `default` list serves any culture without its own.
```
"rankNames": {
  "about": "...",
  "human": [ { "id": "human_a", "names": ["<rank 1>", "<rank 2>", "<rank 3>", "<rank 4>", "<rank 5>", "<rank 6>", "<rank 7>"] },
             { "id": "human_b", "names": [ ... ] }, ... ],
  "elf": [ ... ], "dwarf": [ ... ], "gnome": [ ... ], "goblin": [ ... ], "orc": [ ... ], "automaton": [ ... ],
  "default": [ ... ]
}
```
A name is a string, or `{ "male": "...", "female": "..." }` when the word is gendered.

**The pick** (by seed, at the band's first repair):
- For culture c, take its factions in `state.factions.list` order (f0, f1, …) and its s sets.
- `start = hash32(seed, SALT_RANKS, <a string hash of c>) % s`.
- Faction fi gets set `(start + i) % s`. So up to s factions of one culture get different sets; a world with more of them repeats sets.
- A faction that appears later (a split) takes the first set, counting from `start`, that no living faction of its culture holds. If every set is held, it takes set `(start + its index in the list) % s`.
- The set's id is saved in `bands[factionId].rankSet`, so a later catalog edit doesn't rename a saved game's ranks. If the id is no longer in the catalog, the same rule picks again.

**The name for rank k** is `names[min(k, 7) − 1]`, in the member's gender form when the name has two. Without `command.rankNames` the names are the placeholders `TEST_Rank1` … `TEST_Rank7` (AGENTS rule 7). UF_History keeps drawing the old leader title from `factions.founders.titles`, so every seed still gives the same founders; UF_Command replaces that title at founding.

**How many sets.** At least three per culture. Species are drawn independently by weight, so with seven factions, three human factions happen about one world in five (0.205), and four about one in twenty (0.054). Three factions of elves, dwarves, goblins or orcs happen 0.079 of the time, three of gnomes or automata 0.013. (Computed from the `factions.species` weights on 2026-09-19.)

**Where the names show.** The sheet (§5.2), the over-head order lines (§5.1), the chronicle, and the talk window's name answer (UF_Talk reads `data.title`).

**What a set must meet** (the rules for §10):
- Seven names, from rank 1 (the base) up to rank 7. Players will mostly see ranks 1 to 4 for a long time: eight founders have a rank-3 head, and 14 to 40 people a rank-4 head.
- At most 12 characters each. Rank 2 and above must read well in front of a person's name ("<R2> Wenna"). Rank 1 says what someone is and is never put in front of a name.
- Each set fits its culture (V39) and the theme (V65). Public-domain Arthurian words and plain words are fine.
- No word from the banned lists (AGENTS.md, and THEME.md's lists of Ultima, DF, D&D and OSRS terms). No real trademarks. The checks scan every name (§7).
- No name twice in one set.
- THEME.md §2.4 (T11) proposed a ladder by role (the ruler of a band, of a site, of several sites; squad and work-group leaders). The tree of threes replaces those roles, but its words can seed the sets.

### 1.8 A band without a head
When no member is 18 or older there is no head, no review and no new order. Standing orders run out. Wards live on their own loop (V17). The sheet says "No head". The first member to turn 18, or an adult who joins, becomes the head at the next repair.

---

## 2. What an order is

### 2.1 The record: `unit.data.order`
Saved with the unit. `null` when the member has no order.

| Field | Type | Meaning |
|---|---|---|
| `id` | number | `state.command.nextOrderId++` |
| `kind` | string | one of the 12 task kinds (§2.2). A player's direct order keeps the job type instead (`move`, `drink`, `chop`…) |
| `by` | unit id or `"player"` | who gave it: the member's superior at that time. The head gets orders only from the player |
| `byName`, `byTitle` | string, string or null | the giver's name and rank name at that time, kept for the sheet after the giver is gone or has moved |
| `via` | [unit id] | the chain above the giver, up to the head; `[]` when the head gave it |
| `faction` | faction id | the member's faction when it was given |
| `at` | number | game minute it was given (§2.4) |
| `until` | number | game minute it expires |
| `anchor` | `{ area, x, y }` | where the work is: the plan step's cell, the designation's cell, the prey's cell, the post, or the camp centre |
| `target` | `{ area, x, y }` or null | the current target cell (the first job's target, then updated per job) |
| `thing` | string or null | what it is about, for the line and the sheet: an object name ("oak"), an item ("berries"), a step label ("hearth"), a prey species ("deer") |
| `unitId` | unit id or null | hunt: the prey; follow: the unit to follow |
| `item` | item type id or null | the item the order is for (gather, chop, quarry, haul) |
| `step` | plan step id or null | the society plan step it serves (jobs get `params.plan`) |
| `recipeId` | string or null | craft and cook |
| `jobId` | job id or null | a designation this order hands out (§5.3) |
| `radius` | number | work area around `anchor` (catalog `workRadius`, 12) |
| `count` | number | jobs to finish; 0 = until the step is done or nothing is left in the work area |
| `done`, `misses`, `fails` | numbers | jobs finished under it; decisions in a row that found nothing to do; its jobs that failed |
| `state` | `"given"` / `"working"` / `"paused"` | for the sheet |
| `pause` | null / `"thirst"` / `"hunger"` / `"sleep"` / `"night"` / `"danger"` | why it's paused |
| `preempt` | bool | cancel the member's own-choice job at once (guard for danger, player channel) instead of waiting for it to end |

When an order ends, `data.order` becomes `null` and `data.lastOrder = { kind, thing, by, byName, end, reason, at, endedAt }` with `end` one of `done`, `expired`, `impossible`, `replaced`, `cancelled`.

### 2.2 Task kinds and how each maps onto jobs and the plan
"Maker" is how the member turns the order into its next job (§4.2). All finders are UF_Colonists' own, limited to `radius` around `anchor` (§6.2).

| Kind | Jobs it makes | Plan link | Skill (V63) | Anchor / target | Ends `done` when | Default minutes / count |
|---|---|---|---|---|---|---|
| `gather` | `gather`, `pick` on objects whose action yields `item` (food plants when `item` is null) | stock step (food); craft or build inputs (fiber, straw) | foraging | the camp, or the object | `count` jobs done, or the step met | 120 / 4 |
| `chop` | `chop` on trees (objects whose `chop` yields logs) | build and craft inputs that need logs (walls, campfire, workbench, firewood) | woodcutting | the tree | `count` trees | 120 / 2 |
| `hunt` | `hunt { unitId }`; if that prey is gone, the nearest prey in the work area | stock step with `hunt: true`; inputs from prey (hide) | hunting | the prey's cell | one kill | 180 / 1 |
| `fish` | `fish` (UF_Interact's type) at a water cell with a standable neighbour | stock step (food) | fishing | the water cell | `count` casts | 120 / 3 |
| `quarry` | `quarry`, `mine`, and `pick` of loose stones, on objects yielding `item` (stone, ore) | build and craft inputs of stone or ore | mining | the boulder or outcrop | `count` jobs | 120 / 2 |
| `haul` | `haul`, `fetch` | build steps (materials to the cell), the stock step (food to the larder), loose items to a stockpile | hauling | the item's cell | nothing left to haul in the work area | 60 / 0 |
| `build` | whatever `stepSpec(u, step)` returns for a build step: `build`, or the `haul` / `chop` / `quarry` / `gather` its materials need; or the designation job itself | build steps; UF_Society's house jobs | building | the step's first unbuilt cell | the step is done (or the designation is done) | 240 / 0 |
| `cook` | the cooking `craft` at the hearth (`cookSpec`), after `fetch` of raw food | the stock step (raw food on hand) | cooking | the hearth | no raw food left in reach | 60 / 0 |
| `craft` | whatever `stepSpec(u, step)` returns for a craft step (`fetch`, `gather`, `chop`, `hunt` of inputs, then `craft`, then `equip`) | craft steps (knives, axe, clothes, cloaks…) | the recipe's skill | the workplace, or the member | the step is met | 120 / 0 |
| `guard` | `guard` (new job type, §6.4): stand at the post and keep watch | none now (the plan's later `arm` step) | none (no xp) | a post between the camp and the threat | time up, or the threat gone | 60 / 0 |
| `rest` | `sleep` at the member's sleep spot (bed, hearth, camp) | none | none | the bed or hearth | woken | until the wake hour / 1 |
| `follow` | `follow { unitId }` (new job type, §6.4): stay beside that unit | none | none | the unit | time up | 30 / 0 |

Survival jobs (`drink`, `eat`, `sleep` for need) and `talk`, `mate` are never ordered.

**Who can get which kind:** babies and children get no orders. Teens (wards aged 12–17): gather, haul, fish, cook, rest, follow. Elders: all but hunt, quarry, guard. Adults: all. (Catalog `command.stages`.)

### 2.3 How an order ends
| End | When |
|---|---|
| `done` | the goal in §2.2 is met (checked on `jobs:done` of a job with `params.order`) |
| `expired` | game minute ≥ `until`; or a work order when the member's work hours end (commanders' orders only; §3.2 gives `rest` at bedtime) |
| `impossible` | the maker found nothing to do `missesToEnd` (2) decisions in a row with `done` = 0, or `failsToEnd` (2) of its jobs failed for a reason that isn't a pause. The reason is kept ("nothing left to chop there", "can't reach it", "the prey got away"). If `done` ≥ 1 when the misses run out, the end is `done` instead. |
| `replaced` | a new order from a higher giver: the player over any commander's order, or a commander's forced order (guard for danger) over its own earlier one |
| `cancelled` | the giver is no longer valid (§4.5), or the member left the band |

A job cancelled because of survival or danger ("too thirsty to go on", "too hungry to go on", "danger nearby") pauses the order; it does not count as a fail.

After `impossible` the band record notes it: `avoid[memberId][kind] = now + avoidMinutes` (30). No commander gives that member that kind until then. `command:orderEnded(order, member, end)` is emitted for every end.

### 2.4 Game time
`UF.Time.ticks()` restarts at 0 on every boot, so it can't stamp saved orders. Orders use the **game minute** from the saved clock:
`now() = (((year × 12 + monthIndex) × 28 + (day − 1)) × 24 + hour) × 60 + minute` from `$ufTime`.
If the clock moves backwards (tests call `$ufTime.setTime`), an order with `at > now` gets `at = now` and `until` shifted by the same amount. The display is `hh:mm` of `now % 1440`.

### 2.5 Band state: `UF.World.state.command`
Its own key. UF_Command never writes into `state.societies` (the bands run owns it).
```
state.command = {
  version: 2,
  nextOrderId: 1,
  bands: {
    [factionId]: {
      headId,                    // cached; checked at every review
      counts,                    // fill(N) at the last repair, e.g. [5, 2, 1]
      sig,                       // the member signature at the last repair (sorted ids, each with an adult flag)
      culture, rankSet,          // the culture key and the chosen rank-name set id (§1.7)
      slot,                      // 0..reviewEvery-1: the minute of the cycle this band reviews on
      lastReview,                // game minute
      focus: null | { kind, at, until },   // the player's group order (player's band only)
      standDown: false,          // player's band only: no commander gives orders
      tasks: [ { kind, weight, slots, anchor, thing, item, step, recipeId, jobId } ],  // last review, ≤ 16
      avoid: { [memberId]: { [kind]: untilMinute } },
      tally: { given, done, expired, impossible, replaced, cancelled, successions, repairs, promotions, stepDowns }
    }
  }
}
```
Created lazily at the first repair after societies exist, so load order against `world:created` doesn't matter. About 1.5 KB per band of eight.

---

## 3. How orders flow

### 3.1 Cadence
- Each band reviews once every `reviewEvery` (10) game minutes: when `now() % reviewEvery === slot`, on `time:minute`. `slot = (factionIndex × 3) % reviewEvery`, so 7 factions get 7 different minutes and at most one review runs per game minute. One review is the head's pass (§3.2) followed by every commander's pass (§3.3), in the same call.
- A band that missed its minute (the clock was set) reviews when `now() − lastReview ≥ reviewEvery + 5`.
- **Forced reviews** (queued, still at most one per game minute, bands in faction-list order): succession; the player sets a focus or stands down; a player designation (`interact:designated`); a threat enters the camp's guard radius (the danger sweep, §4.3).
- 10 game minutes is 10 s at ×1, 1.25 s at ×8.

### 3.2 The head's pass: the band's priorities
The head reads the band once per review and turns it into a task list with weights and slots. Everything read here already exists in state. Weights and numbers are catalog `command.weights` (defaults below).

| Signal | Task | Weight | Slots |
|---|---|---|---|
| Threats within `guardRadius` (16) of the camp centre: a unit of a dangerous wildlife species (`UF.Wildlife` `dangerous`: predator, monster), or a person of a faction whose `UF.Factions.tierBetween` with this one is hostile or at war | `guard`, post = the free cell 3 cells from the camp centre toward the threat | 120 | min(threats, ceil(free adults / 3)); `preempt: true` |
| The player's open designations (`UF.Jobs.open()` with `params.faction` = the band's faction, made by UF_Interact) | the designation's kind (chop→chop, gather/pick→gather, quarry/mine/dig→quarry, build→build, haul→haul, hunt→hunt, fish→fish; other types are left for members to take themselves), `jobId` | 100 | 1 each, at most 8 |
| The player's band focus (§5.3) | the focus kind | 80 | every free member except one kept on food when food is below one per head |
| Start of the band's sleep window (`colony.sleepHours`, or the daily run's schedule) | `rest` | 70 | everyone free |
| A member with sleep ≥ 60 or mood Stressed or worse, in work hours | `rest`, that member | 65 | 1 each |
| Other open jobs of the faction (UF_Society's house builds: `params.society`) | `build` / `haul`, `jobId` | 60 | 1 each, at most 4 |
| Raw food at the camp ≥ 2 and a fire (the society's hearth) | `cook` | 55 | 1 |
| Plan step i of the first 3 undone steps (`UF.Colonists.planStatus(factionId)`): build | `build`, `step` | (50 − 5i) × the culture's priority for build | walls: min(unbuilt cells, 2); one-cell pieces: 1 |
| Plan step i: craft | `craft` (or `cook` for a cooking recipe), `step` | (50 − 5i) × the culture's priority for craft | `each` steps: one per member who lacks it, given to that member; `count` steps: 1 |
| Plan step i: build materials missing (the step's `build.items` not on its cells and none on the ground within 20 of the camp) | `chop` (logs), `quarry` (stone, ore), `gather` (fiber, straw) with `item` | (45 − 5i) × the culture's priority for that kind | 1 per missing item type |
| Food short: stock S (food in the larder, in the band's packs, and on the ground within the camp radius + 2) below T = members × `foodPerHead` (2) | `food` (resolved per member, below) | 40 + 30 × (T − S) / T | ceil(free × (T − S) / (2T)) |
| Loose items within the camp radius + 8, not on a stockpile, 4 stacks or more, and a stockpile exists | `haul` | 35 | 1 |
| Nothing else | no order: the member keeps its own choice (V17) | | |

In the band's leisure and sleep hours only `guard` and `rest` are given. Anchors within `dangerRadius` (6) of a threat are skipped.

**Food per member.** A `food` slot becomes, for the member it goes to: `hunt` if prey stands within `colony.huntRadius` of the camp and the member's hunting level ≥ their foraging level (or the culture's hunt priority > 1); else `fish` if the `fish` job type exists, water is within 30 of the camp and fishing ≥ foraging; else `gather`.

### 3.3 The commanders' passes: handing out orders
1. **The list.** The head's pass leaves the task list with its slots (§3.2), stored in `bands[fid].tasks`.
2. **The order of commanders.** The head first, then the rank h − 1 commanders in seniority order, then rank h − 2, and so on down to rank 2. Orders flow down, so the higher groups are served first.
3. **Each commander's group** is its ranked subordinates plus its wards who are teens. A group member is **free** when it has no live order, `UF.Colonists.survival(u)` is null, it is not asleep, and it is not running a player's direct order (`params.ordered`). Members busy with their own choice count as free: the order starts when their current job ends, unless the task is `preempt`.
4. **Score** every (task with a slot left, free group member) pair the stage rules allow and `avoid` doesn't block:
   `score = weight × (1 + (level − 1) / 50) × continuity / (1 + distance / 30)`
   - `level` = `UF.Skills.level(member, skill of the kind)` (1–99; 1 when UF_Skills is absent or the kind has no skill), so a level-99 woodcutter scores about 3× a beginner for `chop` (V63).
   - `continuity` = 1.25 when the member's `lastOrder` was the same kind and ended `done`, else 1 (fewer switches).
   - `distance` = Chebyshev cells from the member to the task's anchor.
5. **Greedy, within the group.** Sort the group's pairs by score (high first), then task index, then member id. Walk the list and give the pair when the task still has a slot and the member is still free. Slots belong to the whole band: an order given by one commander uses up that slot for the commanders after it. Stop at `maxOrdersPerReview` (12) orders in the band.
6. **Give.** Make the record (§2.1: `by` = the commander, `via` = the commander's chain, `at = now`, `until = now + minutes`, `anchor`, `thing`, `count` from the catalog kind unless the task set one), emit `command:order`, then the commander speaks (§5.1). A `preempt` order cancels the member's own-choice job with the reason "called away" (never a need job).
7. **The head and the commanders work too.** The head gets no order from anyone but the player; it works by its own choice. Every other commander is a worker as well, ordered by its own superior like any member. Commanding takes no time in this build: it is thinking done inside the review, so no commander stops working to command.

Targets are **not** searched at review time. The member's maker finds them on its next turn (§4.2). That search replaces the plan search the member would have done anyway, so it adds no cost.

A band of one has no group, so its review gives nothing and says nothing.

**Determinism.** The review reads only state, the catalog and the seed. Commanders go in the fixed order of step 2. Ties break by task index and unit id. The only varied choice, which line template to speak, is `hash32(seed, 0xc0de, order.id) % variants`. Nothing uses `Math.random`, `Date.now` or `Graphics.frameCount`.

### 3.4 Cost budget (7 factions × 8 people = 56 members)
- **Reviews:** 7 per 10 game minutes, never two in one game minute. Each one costs ≤ 0.5 ms: one `planStatus(factionId)` (the bands run caches it for 30 ticks), one pass over the faction's open jobs, the threat list (shared, §4.3), and ≤ 16 tasks × the band's members of scoring in total (each member is scored once, inside its own group). At ×8 that is about 0.09 reviews per frame, so about 0.05 ms per frame on average.
- **Repairs:** at most one per band per frame, and only when the band changed. A repair sorts the band once and places each member once. Bands stay small within the V50 budgets. The `perf` check measures repairs with the rest.
- **Member side:** without an order, one field check. With one, the maker is a single search within `radius` (12) of the anchor (≤ 625 cells) instead of the plan's 60-cell search.
- **Danger sweep:** every 30 ticks, one pass over the area's units to list threats, then per band member a check against that short list.
- **Budget:** UF_Command's own work (performance.now around its update alias, its event handlers, repairs, reviews and the decider) ≤ 0.1 ms per frame on average at ×8 over 60 s, and no single map update above 2 ms. The bands' `UF.Colonists.perf().avgMs` stays within its own 1 ms budget with UF_Command loaded.

---

## 4. How members obey

### 4.1 Order of precedence in a member's turn
1. **Danger** (UF_Command's decider in slot `"first"`, §4.3).
2. **Survival** (UF_Colonists): thirst, hunger (or a meal hour with food stored), exhaustion (sleep ≥ threshold), night (in the sleep window with sleep > 40). The urgent pre-emption stays as it is (a running non-need job is cancelled at threshold + 25).
3. **A player's direct order.** This is a running job made by `UF.Colonists.order`, so the loop doesn't decide while it runs. The urgent pre-emption still applies to it, as it does now.
4. **Its superior's order** (UF_Command's decider in slot `"afterSurvival"`, §4.2).
5. **Own wants and own choice:** social, nature, walk home, open designations, the plan, idle. The lazy roll only applies here; an order is not skipped for laziness.

Social and nature needs wait behind an order. Commanders give work orders only in work hours, and the evening leisure hours meet those needs (the daily run's schedule).

### 4.2 The member's turn with an order
```
orderDecider(u):                       // slot "afterSurvival", runs inside withSociety(societyOf(u))
  o = u.data.order;  if (!o) return null
  if (!validGiver(u, o))                          { end(u, "cancelled", "not my commander"); return null }
  if (now() >= o.until)                           { end(u, "expired"); return null }
  if (o.by !== "player" && o.kind !== "rest" && o.kind !== "guard" && !UF.Colonists.workHours(u))
                                                  { end(u, "expired", "the day's work is done"); return null }
  spec = MAKER[o.kind](u, o)                      // §2.2; null = nothing to do in the work area
  if (!spec) { o.misses++; if (o.misses >= missesToEnd) end(u, o.done ? "done" : "impossible", reasonFor(o)); return null }
  spec.params = Object.assign({}, spec.params, { order: o.id, faction: u.data.faction })
  if (o.step) spec.params.plan = o.step
  job = UF.Colonists.give(u, spec)                // claims and the failed-target memory apply as for any job
  if (!job) { o.misses++; ...same as above...; return null }
  o.misses = 0; o.state = "working"; o.pause = null; o.target = job.target || o.target
  return job
```
A designation order's maker is different: if the designation job is still `open`, `UF.Jobs.assign(o.jobId, u.id)`; if it is `done`, end `done`; otherwise end `impossible`.

`jobs:done` with `params.order`: `o.done++`, then check the goal (§2.2). `jobs:failed` with `params.order`: a pause reason sets `o.state = "paused"` and `o.pause`; any other reason is `o.fails++`.

When a survival job starts while an order stands, UF_Command sets `o.state = "paused"` and `o.pause` from `UF.Colonists.survival(u)` (read at the member's next scan). The order picks up again at the next decision after the need is met.

### 4.3 Danger
- **Threats** are listed every 30 ticks, once per area: units of a dangerous wildlife species that are alive, and people of factions at hostile or war tier with the band (`UF.Factions.tierBetween`).
- **A member is in danger** when a threat is within `dangerRadius` (6) cells, unless the member is on a `guard` order or its current job hunts that very unit.
- **In danger:** a running order job is cancelled ("danger nearby"), the order pauses with `pause: "danger"`, and the member walks back to a free cell beside its hearth (a `move` job with `params.retreat`, made by the slot `"first"` decider). When no threat is within range any more, the order resumes at the next decision.
- **At the camp:** a threat within `guardRadius` of the camp forces a review, which hands out `guard` orders (§3.2).
- Fighting is UF_Combat's. A guard stands its post and keeps watch; whether it strikes depends on UF_Combat's AI (see §8).

### 4.4 Finished, impossible, expired
See §2.3. After any end, the member takes its own choice at once (its next decision comes within one scan), and its commander can give a new order at the next review. Commanders learn of it through `bands[fid].avoid` and the tally; nothing is spoken for an ending.

### 4.5 Only one's own faction, only one's own chain
- A member obeys an order only when `validGiver` holds: the order's `faction` equals the member's faction, and `by` is either `"player"` with the member in the player's faction, or a unit that was the member's superior when the order was given (`by`, with the chain above it in `via`). Orders outlive a regrouping, a promotion and the giver's death; they end by their own rules (§2.3).
- `UF.Command.give(member, spec, { by })` refuses (returns null) new orders when `by` is a unit of another faction, when `by` is not the member's current superior or an ancestor in its chain, when the member is the head and `by` isn't `"player"`, or when `by` is `"player"` and the member isn't the player's.
- The review only reads `UF.Colonists.members(factionId)` of its own faction and only designations with its own `params.faction`.
- Every job an order makes carries `params.faction` = the member's faction, so UF_Jobs' faction rule (from the bands run) also holds.
- The "Band orders…" menu (§5.3) is offered only on the player's own head.

---

## 5. What the player sees

### 5.1 The commanders' spoken lines (V62)
- Each commander speaks its own orders over its own head: `UF.Speech.say(commander, text, { kind: "order", queue: true })`. Plain text in the "order" colour of the speech catalog. UF_Speech decides whether it shows (on screen, zoom); UF_Command records the line either way in a session log (`UF.Command.lines()`).
- **A line names only the speaker's own group.** A commander never names someone another commander leads.
- **Addressing by rank.** A subordinate of rank 2 or more is called by its rank name and name ("<R2> Wenna, cut us some wood.") when that line fits in 40 characters; otherwise by name alone. Rank 1 members and wards are called by name.
- **One commander makes at most 3 lines per review** (`maxLinesPerCommander`). Its orders are grouped by kind and thing:
  - one member: the kind's line with `{name}`;
  - two: "{a} and {b}, {verb}.";
  - three or more: "You {n}, {verb}." (n as a word: three, four …);
  - every free member of its group got the same kind: "All of you, {verb}!".
- **The whole band at once.** When every free member of the band got the same kind (a focus, bedtime), only the head speaks: "Everyone, {verb}!". The other commanders stay silent for that review.
- Lines stay at most 40 characters (UF_Speech wraps at 22 per row). If the version with `{thing}` is longer, the version without it is used.
- Templates (catalog `command.lines`, our own wording, plain and a little old-fashioned to fit V65, no names from other games; the variant is picked by the order id):

| Kind | Lines | Group verb |
|---|---|---|
| gather | "{name}, gather {thing}." · "{name}, go and forage." | gather {thing} |
| chop | "{name}, cut us some wood." · "{name}, fell that {thing}." | cut wood |
| hunt | "{name}, hunt the {thing}." · "{name}, bring us meat." | go hunting |
| fish | "{name}, go and fish." · "{name}, see what the water gives." | fish |
| quarry | "{name}, break us some stone." · "{name}, work that {thing}." | break stone |
| haul | "{name}, carry the {thing} in." · "{name}, fetch and carry." | fetch and carry |
| build | "{name}, raise the {thing}." · "{name}, work on the {thing}." | build the {thing} |
| cook | "{name}, see to the fire." · "{name}, cook for us." | cook |
| craft | "{name}, make a {thing}." · "{name}, set to your crafting." | make {thing} |
| guard | "{name}, keep watch." · "{name}, guard the camp." | keep watch |
| rest | "{name}, rest now." · "Enough, {name}. Rest." | rest (band line: "Enough for today. Rest.") |
| follow | "{name}, follow me." · "{name}, with me." | follow me |
| (succession) | "I will lead us now." (kind "remark") | |

`{name}` is the member's name, with its rank name in front for rank 2 and above (see "Addressing by rank"). `{thing}` is the order's `thing` in lower case. Person names come from the generators and rank names from the catalog (§1.7); nothing else is invented. The checks scan every line for the banned words of AGENTS.md.

### 5.2 The sheet (UF_Sheet)
UF_Sheet builds its model inside its own closure, so UF_Command can't wrap it. UF_Sheet gains one small hook (§6.3): `UF.Sheet.addUnitLines(fn)`, where `fn(unit)` returns text lines that the panel draws in its existing "state lines" section (and folds into its redraw signature). UF_Command's lines:

| Who | Lines |
|---|---|
| Every ranked member | `Rank: <R1> (rank 1 of 3)` · `Answers to: <R2> Wenna` |
| A commander | `Leads: Tamsin, Dorar, Zorette` (its ranked subordinates) · `Cares for: <names>` when it has wards |
| The head | `Heads: The Ostwyn League, 8 people in 3 ranks` · `Band orders: Quarry stone (from you, until 18:00)`, `Band orders: as the head sees fit`, or `Band orders: none (stood down)` |
| A ward | `No rank yet (under 18)` · `In the care of: <R2> Wenna` |
| A member with an order | `Order: Cut wood (1 of 2 done)` · `From: <R2> Wenna at 14:20, until 16:20` |
| … paused | `Order: Cut wood · paused: thirsty` (hungry, tired, night, danger) |
| … from the player | `Order: Walk there · from you` |
| A member without one | `Order: none (own choice)` · `Last: Cut wood, done` when there is a `lastOrder` |
| A band without a head | `No head` |

The same lines show for strangers (you can hear their commanders too).

### 5.3 The player's orders enter at the top
There are three ways in. They combine in one order of precedence: **the player's direct order > the player's orders to the head (designations, band focus) > the head's own priorities, handed down by the commanders > the member's own choice.** Danger and survival stay above all of them, as in §4.1.

1. **Designating work (right-click a cell, UF_Interact).** Designations are open jobs with the player's `params.faction`. They are the player's orders to the head: the next review (forced within one game minute) puts each one on the task list (weight 100, §3.2), and the first commander in the §3.3 order with a well-suited free member hands it over as an order with `jobId` and says so ("Wenna, fell that oak."). A member with no order still takes designations on its own, as it does now. Nothing about designating changes for the player.
2. **Commanding the head.** Right-click the player's head: UF_Interact's menu gains **"Band orders…"** (only on the player's own head), a submenu with Cut wood, Gather food, Hunt, Fish, Quarry stone, Fetch and carry, Build (the plan), Guard the camp, Rest, Follow me, **As you see fit** (clears the focus) and **Stand down** (no commander gives orders until another choice; `standDown`). A focus lasts `focusMinutes` (240) and makes a forced review. The commanders turn it into member orders (weight 80), and the head speaks the band line ("Everyone, break stone!"). The focus never takes the last food gatherer while food is below one per head. Stand down gives the player DF-style direct control: members live on their own loop and take designations themselves.
3. **A direct order to one colonist** (select a colonist, click the ground; "Drink here", "Eat" and other personal jobs, all through `UF.Colonists.order`). UF_Command wraps `UF.Colonists.order` and records `data.order = { by: "player", kind: <job type>, count: 1, … }`, ending with that job. No commander gives that member a new order while it runs, and a commander's order the member had is `replaced`. As now, the job starts at once and only the urgent pre-emption interrupts it.

The player's orders only ever reach the player's faction (`UF.Colonists.order` already refuses other factions' people; the "Band orders…" option only appears on the player's head).

---

## 6. Hooks and files

### 6.1 New files
- `game/js/plugins/UF_Command.js`: the plugin (the tree and its repair, reviews, orders, succession, danger, lines, the menu wrap, the sheet lines, the two job types, the `command` suite). The span of three is a constant in the code (`SPAN = 3`), not a catalog number: the user set it.
- `docs/systems/UF_Command.md`: the system doc (WORLD_ARCHITECTURE §8 template).
- Catalog key `command` in `game/data/UF_WorldCatalog.json` (a layout-preserving node script that re-reads the file right before writing, changes only `command`, and asserts every other top-level key is unchanged):
```
"command": {
  "about": "...",
  "rankAge": 18,
  "reviewEvery": 10, "maxOrdersPerReview": 12, "focusMinutes": 240,
  "workRadius": 12, "dangerRadius": 6, "guardRadius": 16, "foodPerHead": 2,
  "missesToEnd": 2, "failsToEnd": 2, "avoidMinutes": 30, "maxLinesPerCommander": 3, "maxLineChars": 40,
  "stages": { "teen": ["gather","haul","fish","cook","rest","follow"],
              "elder": ["gather","chop","fish","haul","build","cook","craft","rest","follow"] },
  "weights": { "guard": 120, "designation": 100, "focus": 80, "rest": 70, "tired": 65, "societyJob": 60,
               "cook": 55, "plan": 50, "planStep": 5, "material": 45, "foodBase": 40, "foodShort": 30, "haul": 35 },
  "kinds": { "gather": { "skill": "foraging", "minutes": 120, "count": 4 }, "chop": { "skill": "woodcutting", "minutes": 120, "count": 2 },
             "hunt": { "skill": "hunting", "minutes": 180, "count": 1 }, "fish": { "skill": "fishing", "minutes": 120, "count": 3 },
             "quarry": { "skill": "mining", "minutes": 120, "count": 2 }, "haul": { "skill": "hauling", "minutes": 60, "count": 0 },
             "build": { "skill": "building", "minutes": 240, "count": 0 }, "cook": { "skill": "cooking", "minutes": 60, "count": 0 },
             "craft": { "skill": "crafting", "minutes": 120, "count": 0 }, "guard": { "skill": null, "minutes": 60, "count": 0 },
             "rest": { "skill": null, "minutes": 600, "count": 1 }, "follow": { "skill": null, "minutes": 30, "count": 0 } },
  "lines": { "<kind>": ["...", "..."], "verbs": { "<kind>": "..." }, "two": "{a} and {b}, {verb}.", "many": "You {n}, {verb}.",
             "group": "All of you, {verb}!", "all": "Everyone, {verb}!", "restAll": "Enough for today. Rest.", "succeed": "I will lead us now." },
  "rankNames": { "about": "...", "<culture>": [ { "id": "...", "names": ["<rank 1>", "...", "<rank 7>"] } ], "default": [ ... ] }
}
```
The `rankNames` sets go in only after the user approves §10. Until then the build ships `TEST_` placeholders (§1.7).

### 6.2 What the bands run must expose first
Checked against the bands run's working copy of UF_Colonists.js on 2026-09-19 (`%TEMP%\uf_snapshots\bands_r8`). It already has `members(fid)`, `allMembers()`, `society(fid)`, `societyOf(u)`, `isMember(u)`, `planStatus(fid)`, `site(fid)`, `culture(fid)`, `playerFactionId()`, `order(...)` limited to the player's colonists, `perf()`, and `params.faction` on jobs. Its `scan()` calls the private `decide(u)`, so wrapping the public `UF.Colonists.decide` would not reach the loop. UF_Command needs these on `UF.Colonists`, each running inside `withSociety(societyOf(u))`:

| Member | Returns | What it wraps |
|---|---|---|
| `addDecider(slot, fn)` | – | `decide(u)` becomes: freeing a trapped unit → deciders of slot `"first"` → survival (the thirst, hunger, sleep and night part of `needJob`) → deciders of slot `"afterSurvival"` → wants (the social and nature part of `needJob`) → `homeJob` → `designationJob` → plan (with the lazy roll) → `idleJob`. `fn(u)` returns a job or null. |
| `survival(u)` | `"thirst"` / `"hunger"` / `"sleep"` / `"night"` / null | the same thresholds and hours `needJob` uses |
| `workHours(u)` | bool | the daily run's schedule; without it, not in the sleep window and not 19:00–22:00 |
| `give(u, spec)` | job or null | the private `give` (claims, the failed-target memory, the ring gap) |
| `stepSpec(u, stepId)` | `{ type, target, params }` or null | `buildStepJob` / `craftStepJob` / `stockStepJob` for that step of u's society; makes no job |
| `find(u, what, opts)` | a spec or null | `what`: `"source"` (an object action yielding `opts.item`, optional `opts.actions`), `"food"` (a food plant), `"prey"` (optional `opts.yields`), `"water"` (a water cell with a standable neighbour, for `fish`), `"cook"` (`cookSpec`), `"sleep"` (the sleep spot of `sleepJob`), `"haul"` (a loose item and a stockpile that stores one of its tags; the destination through `UF.Interact.stockpileFor` when present). All take `opts.near` and `opts.radius`. |

Also needed (already in the bands run's brief): jobs carry `params.faction` and `UF.Jobs.take` honours it; `UF.Colonists.order` refuses anyone who isn't the player's colonist.

If the bands run lands without some of these, the UF_Command build adds them to UF_Colonists.js in one edit (thin wrappers around existing private functions, about 60 lines), after checking in docs/STATUS.md that no run holds the file. If one does, it asks the user first.

### 6.3 Small edits in other files (made by the UF_Command build)
Every file here is Claude Code's. Before editing one, the build checks docs/STATUS.md → In progress. On 2026-09-19 `UF_History.js` is claimed by the "Campfire start" and "Paths and DF life" runs; if a claim still stands, the build asks the user first.
- **UF_Sheet.js:** `UF.Sheet.addUnitLines(fn)`. It keeps a provider list; `unitModel(u)` sets `m.stateLines` to the providers' lines (capped at `MAX_STATE_LINES`, each provider in try/catch) and adds them to `m.sig`. The layout and drawing of `stateLines` already exist. About 10 lines.
- **UF_History.js** (the old numbering is read here):
  - `spawnFounders` keeps its seeded draws, including the leader's title from `factions.founders.titles`, so every seed still gives the same founders. It still writes leader 1 and others 0; UF_Command renumbers them on `world:created` (§1.4).
  - The `stats_and_ranks` check changes to the new numbering: exactly one head per faction (`superior` null), the chronicle's ruler record names it, and, when UF_Command is registered, the counts are 5/2/1 for eight founders. Without UF_Command it keeps its current test.
  - `describeUnit` and the chronicle pages (in the code of 2026-09-19, `rank >= 2` means ruler and `rank >= 1` means leader) use `UF.Command.isHead(u)` and `UF.Command.commands(u)` when UF_Command is present.
  - Optional: `addRuler(factionId, { unitId, name, title, from })`, which closes the open record and pushes the new one. Without it UF_Command writes `state.history.rulers` directly.
  - `docs/systems/UF_History.md` follows.
- **UF_Talk.js** (reads the old numbering too): `rulerOf(fid)` becomes the band's head; `nameLine` and `jobLine` use the "ruler" lines for the head, the "leader" lines for other commanders, and the plain lines for rank 1 (left as it is, the new numbering would make every adult claim "The others look to me"); `titleOf` reads `data.title`. The `name_job_bye` fixture that sets a leader to rank 2 sets the head instead. `docs/systems/UF_Talk.md` follows.
- **UF_Society.js** (only if registered): when `window.UF.Command` exists, skip its own leader bark for a new house (the commanders' order lines replace it); keep its chronicle line. Its open build jobs go on the task list as `build` tasks (weight 60) with no change there.
- **tools/register_world_plugins.js**: `UF_Command` in ORDER after UF_Sheet, before UF_Test. The RMMZ editor rule applies (AGENTS.md).

### 6.4 What UF_Command.js hooks
Core aliases (no replaced core methods):
- `Scene_Boot.prototype.start`: hook the events, define the job types, register the deciders, wrap `UF.Colonists.order` and UF_Interact, add the sheet provider, and register the `command` suite when `UF.Test.active`. Then call the original.
- `Game_Map.prototype.update`: the queued repairs, the danger sweep every 30 ticks, the missed-review fallback, the forced-review queue, and the perf meter.

Runtime wraps (plugin objects, not core):
- `UF.Colonists.order`: after the original returns a job, record the player's order (§5.3).
- `UF.Interact.optionsFor`, `UF.Interact.open`, `UF.Interact.MenuWindow.prototype.setOptions`: add "Band orders…" on the player's head's cell, the same three wraps UF_Sheet uses for "Inventory". Each is idempotent and only touches a top-level list.

Registered through APIs:
- `UF.Colonists.addDecider("first", dangerDecider)` and `UF.Colonists.addDecider("afterSurvival", orderDecider)`.
- `UF.Jobs.define("guard", …)`: `plan` = stand on or beside `target` (`UF.Jobs.standFor`); `work` = `params.minutes × 60` ticks; `replanEvery` 120 (face the nearest threat); `apply` does nothing; `describe` "Keeping watch".
- `UF.Jobs.define("follow", …)`: `plan` = the followed unit exists in the area (else fail "they are gone"), stand = a standable neighbour of it; `replanEvery` 30; `work` = `params.minutes × 60` ticks; `apply` does nothing; `describe` "Following <name>".
- `UF.Skills.mapJob("guard", null)`, `UF.Skills.mapJob("follow", null)`: no experience.
- `UF.Sheet.addUnitLines(commandLines)`.

Events listened: `world:created` (founding: build every band's tree, §1.4; clear session caches), `time:minute` (review cadence), `time:hour` (expiry sweep of all orders; the signature check), `time:day` (coming of age), `jobs:done`, `jobs:failed`, `world:unitAdded`, `colonists:born` (wards), `world:unitRemoved`, `combat:kill`, `anim:death` (repair and succession), `interact:designated` (forced review).
Events emitted: `command:ranks(factionId, { counts, changes })`, `command:review(factionId, { tasks, orders })`, `command:order(order, member, giver)`, `command:orderEnded(order, member, end)`, `command:succession(factionId, newHead, old)`, `command:focus(factionId, focus)`.

### 6.5 API (`UF.Command`)
| Member | Description |
|---|---|
| `now()` | the game minute (§2.4) |
| `fill(n)` | the fill rule (§1.3), pure |
| `headOf(factionId)`, `bandOf(unit)` | the head unit or null; the faction id of the unit's band or null |
| `isHead(unit)`, `commands(unit)` | the band's head; holds rank 2 or more |
| `superiorOf(unit)`, `subordinatesOf(unit)`, `wardsOf(unit)`, `chainOf(unit)` | the direct superior; its ranked subordinates; its wards; the ids above it up to the head |
| `subtree(unitId)` | the unit and everyone under it, with their wards (for splits, §1.5) |
| `rankName(unit)`, `rankNameOf(factionId, rank, gender)` | the band's name for a rank (§1.7) |
| `rankSet(factionId)`, `pickSets(factions, seed)` | the band's set id; the pick of §1.7 as a pure function (tests) |
| `tree(factionId)` | `{ headId, counts, groups: { [commanderId]: [ids] }, wards: { [commanderId]: [ids] } }` |
| `repair(factionId)` | runs the repair now (§1.5); returns the list of changes |
| `startBand(factionId, headId, memberIds)` | makes the record of a band that split off (§1.5, Splits): `headId`, and `sig` from `memberIds`, so none of them counts as a newcomer. It refuses (returns false) when the band already has a record or `headId` is not among `memberIds`. For the V42 build. |
| `check(factionId)` | the invariant (§1.2) as a list of problems; `[]` when sound |
| `orderOf(unit)` | `data.order` or null |
| `give(member, spec, { by })` | gives an order (spec: `kind`, `anchor?`, `unitId?`, `item?`, `step?`, `recipeId?`, `jobId?`, `count?`, `minutes?`, `thing?`, `preempt?`); null when refused (§4.5) |
| `end(member, how, reason?)` | ends the member's order |
| `review(factionId, { dry })` | runs a review now; `dry` returns `{ tasks, assignments }` without giving anything |
| `setFocus(kind or null)`, `focus()`, `standDown(on)` | the player's band only |
| `successorOf(factionId)` | who would succeed the head now (pure) |
| `succeed(factionId)` | runs the succession now; the new head or null |
| `lines()`, `log()` | this session's spoken lines `{ minute, speakerId, text, orderIds, shown }` and orders given and ended (tests) |
| `threats(area)` | the current threat list |
| `perf()`, `resetPerf()`, `config()`, `KINDS` | cost meter, catalog settings with defaults, the 12 kinds |

### 6.6 Load order
`… UF_Jobs > UF_Colonists > UF_Wildlife > UF_Society > … > UF_Combat > UF_Skills > UF_Speech > … > UF_Interact > UF_Sheet > UF_Command > UF_Test`. UF_History loads before UF_Command, so its `world:created` listener (the founders) runs first.

---

## 7. Checks (suite `command`)
Run on a snapshot (docs/systems/UF_Test.md): New Game, clock set to 08:00, ×8 where it says so. Each check must be seen failing once. The last column is how the builder provokes that failure (on a snapshot copy only). The tree checks walk the units themselves; they don't call `UF.Command.check`, so a bug in `check` can't hide a broken tree.

| Check | FAILs when | Seen failing by |
|---|---|---|
| `fill_rule` | `UF.Command.fill(n)` for n = 1 to 40 differs from the table in §1.3 (the check holds that table as its expected list); for n = 0 to 1200 a result breaks a limit of §1.3 (the sum isn't n, the top isn't 1, or a rank holds fewer than ⌈below / 3⌉ or more than the rank below); `fill(1093)` doesn't have 7 ranks or `fill(1094)` doesn't have 8 | `Math.ceil` replaced by `Math.floor` in `fill` (n = 8 then gives 6/2) |
| `founding_5_2_1` | after New Game, a band of eight founders isn't 5 rank 1, 2 rank 2 and 1 rank 3; its head isn't `history.rulers[fid][0].unitId`; its two rank 2 aren't the two most senior of the other seven (seniority computed in the check from age, born, skill and id); the groups aren't three and two, with the senior rank 2 leading three while no founder has kin (no code sets `data.partner` at founding on 2026-09-19); a title isn't the band's set's name for that rank and gender; or the ruler record's title isn't the head's | the founding listener not registered (the ranks stay UF_History's 1 and 0) |
| `tree_invariant` | in any band, at the end of every other check of the suite: one of the seven rules of §1.2 is broken (the check's own walk) | the test sets one rank 1's `superior` to a rank-1 peer, then gives one commander a fourth subordinate, and confirms FAIL for each before repairing |
| `tree_after_changes` | on a copy of a founding band of eight (restored from a JsonEx copy before each step), after the step the invariant breaks or the ranks differ from: (a) a rank 1 dies → 4/2/1, no other rank changes; (b) a rank 2 dies → 4/2/1, the most senior rank 1 becomes rank 2, no other rank changes; (c) the head dies → 4/2/1, the more senior rank 2 heads at rank 3, the most senior rank 1 becomes rank 2; (d) a baby is born to a rank-1 mother → rank 0, `superior` = the mother's commander, no rank changes; (e) a test member aged 17 turns 18 at `time:day` → it is rank 1, 6/2/1, no other rank changes; (f) five founders of another band, still holding its ranks (one rank 3, one rank 2 and three rank 1, with that band's superiors and titles), change faction into the band with no event → within one game hour 9/3/1, the head unchanged, all five newcomers at rank 1 with a superior in this band and this band's rank-1 title, the most senior old rank 1 promoted, no other rank changes; (g) one rank 2's `subtree` moves to a test faction, `UF.Command.startBand(test faction, the rank 2, the leavers)` makes its record (§1.5, Splits), and both bands are repaired → both pass, that rank 2 heads the new band at rank 2, and the others who left stay rank 1; (h) a test adult aged 20 holding rank 3, `superior` null and a head's title in another band changes faction into the band with no event → it is rank 1, the tree is 6/2/1, and no other rank changes; then, on a fresh copy, the same joiner arrives in the frame the head dies (one repair covers both) → 5/2/1, the more senior old rank 2 heads at rank 3, the other old rank 2 stays rank 2, the most senior old rank 1 becomes rank 2, and the joiner is rank 1 | the rank-then-seniority sort reversed to least senior first (fails b and c); the signature check removed (fails f); the newcomer rule (§1.5 step 2) removed (fails f and h) |
| `succession` | in a non-player band with ages set so that the most senior rank 2 isn't the lowest id, the head removed with `data.dead = true`: within 2 game minutes the new head isn't the one §1.6 picks (computed in the check); its rank isn't h for the new size, its title isn't that rank's name, or its superior isn't null; the refill below isn't the most senior rank 1; `history.rulers[fid]` lacks the closed and the new record; there isn't exactly one `succession` chronicle event naming both; or the band gets no order at the next review. Then the same on the player's band | successor = the lowest unit id |
| `rank_names` | a faction's set isn't one of its culture's sets (or `default`); `pickSets` on a test list of three factions of one culture that has three or more sets gives two of them the same set; a split faction doesn't take an unused set when one is free; rank 8 doesn't show the rank-7 name; a catalog rank name is longer than 12 characters or holds a banned word; a ranked member's `title` isn't its rank's name | every faction given set 0 |
| `orders_follow_chain` | within 40 s at ×8: in a band of eight, fewer than half the free adults have an order; an order's `by` isn't the member's superior at that time, or `via` isn't the chain above it; the head gets an order from anyone but the player; an order has a kind outside the 12, another faction, `at > now`, `until ≤ at`, or no anchor | all orders given by the head (the per-commander pass replaced by one pass for the whole band) |
| `orders_follow_need` | on the player's band with every food item removed (larder, packs, ground within 30 of the camp) and a forced review: no food order (gather, hunt or fish); then with 12 food items in the larder and another forced review: no fewer food orders than before, or no non-food order | `foodShort` and `foodBase` weights set to 0 |
| `skills_pick_the_worker` | two free members of one group at equal distance from one chop task, woodcutting 60 and 1 (`UF.Skills.setLevel`): the order doesn't go to the 60; levels swapped: it doesn't go to the other | the skill factor forced to 1 |
| `members_obey` | an order `{ kind: chop, anchor: an oak 6 cells away, count: 1 }` given by M's superior to a member M busy with its own plan job: within 5 s at ×8 M's job isn't a `chop` with `params.order` = the order id; the oak isn't a stump afterwards; the order didn't end `done`; or, over 30 s under a count-3 order, fewer than 80% of M's non-survival jobs carried `params.order` | the decider not registered |
| `survival_first` | M on a count-3 chop order with thirst set to 90: no `drink` job within 8 s, or the order is gone instead of `paused: thirst`; after drinking, no job with `params.order` within 8 s; the same for hunger 90 (a food job) and sleep 90 (a `sleep` job) | the order decider registered in slot `"first"` |
| `danger_first` | a test wolf placed 4 cells from M on an order: within 3 s the order job isn't cancelled or the order isn't `paused: danger`; M isn't at least 3 cells farther from the wolf within 10 s; after the wolf is removed, no job with `params.order` within 8 s | `dangerRadius` set to 0 |
| `impossible_and_finished` | a chop order in a work area whose only tree is removed: it doesn't end `impossible` with a reason within 6 s, M's next job still carries `params.order`, or `avoid[M].chop` isn't set; a gather order with count 2 on two berry bushes doesn't end `done` after exactly 2 gathers | `missesToEnd` set to 1000 |
| `expiry` | a guard order with `until = now + 5` isn't `expired` 6 game minutes later; with the clock set to the start of the sleep window, a running work order doesn't end `expired` or no `rest` orders follow at the next review | the expiry test removed from the decider |
| `no_cross_faction` | over the suite, an order (session log) whose giver's faction differs from the member's (other than `"player"` on the player's own); a job with `params.order` whose `params.faction` isn't its unit's; `UF.Command.give(member of B, spec, { by: head of A })` isn't null; `give(member, spec, { by: a commander of its band that isn't its superior or an ancestor })` isn't null; `give(member of B, spec, { by: "player" })` isn't null; "Band orders…" appears on another faction's head | the faction and chain tests in `give` removed |
| `player_orders_at_top` | (a) a player designation (chop, `UF.Interact.designate`) isn't handed by a commander of the player's band to a player member as an order with that `jobId` within 2 game minutes; (b) after `UF.Colonists.order(M, move)`, `M.data.order.by` isn't `"player"`, or a commander gives M an order while that job runs (3 reviews); (c) "Band orders…" → "Quarry stone" on the head (`UF.Interact.open` + `choose`): the next review gives quarry orders to fewer than half the free members; (d) "Stand down": any order in the next 2 reviews | `focus` weight set to 0 (fails c) |
| `spoken` | UF_Speech is missing; with the player's head on screen, a review that gave orders made no `say` of kind `"order"` (`UF.Speech.lines(speaker)` empty within 2 frames); a line names someone outside its speaker's own group; a line doesn't name the member(s) or say "Everyone" / "All of you" / "You n"; a rank-2-or-higher member is addressed without its rank name although the line would fit 40 characters; a line is longer than 40 characters, matches no catalog template, or holds a banned word; a commander made more than 3 lines in one review | `say` called with kind `"remark"`; the rank name left out of addresses |
| `sheet_shows_order` | `UF.Sheet.open(M)` on an ordered rank-1 member: its model's `stateLines` lack `Rank: <its rank name>`, `Answers to: <its superior>`, `Order: <kind label>` or `From: <giver>`; on a member with no order they lack `Order: none`; on a commander they lack `Leads:` with its subordinates' names; on the head they lack `Heads:` | the sheet provider not registered |
| `deterministic` | two New Games from the same seed give different `{ unit id → rank, superior, title }` maps or different rank sets; `repair` run a second time changes anything; `repair` on a JsonEx copy gives a different tree; `review(fid, { dry: true })` twice on the live state, and once on a JsonEx copy, gives different tasks or assignments; the chosen line variant differs for the same seed and order id; UF_Command.js contains `Math.random`, `Date.now` or `Graphics.frameCount` (`performance.now` only inside the perf meter) | a `Math.random()` tie-break in the seniority order |
| `saved` | a JsonEx round-trip of `UF.World.state` changes `state.command`, any `data.order`, or any `data.rank`, `data.superior` or `data.title`; after loading that copy through `DataManager.extractSaveContents`, a member with an order doesn't start a job with `params.order` within 5 s, or the tree fails the invariant | orders or the tree kept in a plugin Map instead of state |
| `perf` | 60 s at ×8 with the New Game bands (7 × 8 when the seed gives 7 factions; the detail says how many), with one death and one birth forced in every band: UF_Command averages more than 0.1 ms per frame, one map update takes more than 2 ms, a game minute has more than one review, or `UF.Colonists.perf().avgMs` exceeds 1 ms | `reviewEvery` 1 with every band on slot 0 |
| `no_errors` | an uncaught error during the suite | a thrown error in a test decider |

**Screenshots** (the builder opens and describes each): the player's camp at zoom 1 with two commanders' order lines over their heads, each naming only its own group, and a named member walking to the work; the sheet open on a rank-1 member showing `Rank:`, `Answers to:`, `Order:` and `From:`; the sheet open on the head showing `Heads:`; another band's camp at zoom ⅔ with a commander speaking.

Also run on the same snapshot: `colonists`, `jobs`, `society` (if registered), `sheet`, `speech`, `look`, `history`, `talk`, `smoke`. The existing checks must still pass (`history` and `talk` with the §6.3 changes).

---

## 8. Not in this build
- Group orders: the head telling a commander what its whole group works on, and the player ordering one commander's group.
- Squads (V43 soldiers), night watches and patrols as their own trees.
- Sites: when a faction holds several sites, a site could be one subtree. With one camp per faction there is nothing to split yet.
- What rank buys: who eats first, who sleeps where (V52). Rank decides orders only in this build.
- Mood from being promoted or stepped down.
- Labors (V43) and the faction menu (V49) as a filter on who may get which kind.
- Disobedience from personality or mood. Every member obeys, subject to §4.1.
- Commanders walking over to far members, or needing to be within earshot. Orders reach the whole group; the line shows over the commander.
- Guards fighting. A guard stands and keeps watch; striking is UF_Combat's AI.
- The split itself (V42): who decides to leave and where they go. The tree's rule for it is in §1.5.
- The colonist card (UF_ColonyOverseer) and the look tooltip showing the rank and the order. The sheet shows them in this build.
- Orders across areas. There is one surface area (2026-09-19).

---

## 9. Open questions for the user
1. **Should your own band's head give your colonists orders by default?** Proposed: yes, as V52 says ("The player's faction keeps its ranks too"), with **Stand down** in the head's "Band orders…" menu for direct control. The alternative is off by default for your band, on for everyone else.
2. **Seniority: who is promoted, who steps down, who succeeds?** Proposed: the eldest adult, then the most skilled, then the lowest id. Alternatives: the most skilled first; the old head's partner for succession; or, for your band only, you choose.
3. **What does a member do in danger?** Proposed: the minimal rule in §4.3. Any band member within 6 cells of a predator, monster or enemy walks back to its hearth, and its order waits. The alternative is that orders only pause, and the reaction to danger waits for the combat work.
4. **Can a rank be skipped when a commander dies?** Proposed: no. The successor comes from the highest rank left (with a sound tree, the dead commander's own rank or the head's direct subordinates), and the places below are refilled one rank at a time. The alternative is that the most senior adult of the whole band takes over, whatever its rank.
5. **Where does a replacement come from?** Proposed: the most senior member of the whole rank below, the one rule you asked for. The alternative is the most senior member of the dead commander's own group, which keeps groups together but can promote a younger person over an elder in another group.
6. **Odd band sizes.** Proposed: never more than three under anyone. The one or two people left over become extra commanders (six people: 3/2/1, where one rank 2 leads a single person) or a head over a single commander (five people: 3/1/1; again at 14 and 41). The alternative is to allow a fourth under a commander until the band grows.
7. **The head's title.** Proposed: the head carries its rank's name, so the title grows with the band (a rank-3 name for eight founders, rank 4 from 14 people). The alternative is a separate head title in every set, used whatever the head's rank.
8. **Teens.** Proposed: no rank before 18; a teen is in the care of its parent's commander and gets only teen tasks. The alternative is rank 1 from an earlier age, such as 16.
9. **The rank names in §10.** Approve, change or reject each culture's sets. Nothing goes into the catalog before that (AGENTS rule 7).

---

## 10. Rank names (PROPOSAL, awaiting the user's approval)
Written 2026-09-19 by Claude Code (the naming review). **Every name here is a proposal until the user approves it** (AGENTS rule 7). Nothing goes into the catalog before that. Until then the build uses `TEST_Rank1` … `TEST_Rank7` (§1.7).

The same sets, as data: `docs/design/rank_names.proposal.json`, in the shape proposed for the catalog key `command.rankNames` (§10.6 item 9 on how it relates to the sketch in §1.7).

### 10.1 How to read the tables
- Rank 1 is everyone. Eight founders make 5/2/1 (§1.3), so **the rank-3 name is the first title the player sees on every band's head**, and the rank-2 name is on its two commanders. A head reaches rank 4 at 14 people, rank 5 at 41, rank 6 at 122 and rank 7 at 365.
- "Name / Female" means the word is gendered and has a female form. A single word is used for everyone.
- Words ending in "-master" have one form for everyone. Several "-mistress" forms run past 12 characters (Wreckmistress, Clockmistress), so one rule serves them all.
- The letter after a set's label is the proposal it came from (§10.3). `*` marks a name changed from that proposal: taken from another set or proposal, or shortened. `†` marks a new name from this review. §10.4 lists every change and why.
- The order of a culture's sets doesn't matter to the pick (§1.7). They are listed best first.

### 10.2 The sets

#### Settlers (`human`)
| Rank | Manor and shire (A) | Knight and banner (A) | Freehold (B) |
|---|---|---|---|
| 1 | Villein | Liegeman / Liegewoman * | Freeman / Freewoman |
| 2 | Hayward | Sergeant | Yeoman / Yeowoman |
| 3 (head at founding) | Reeve | Knight / Dame | Headman / Headwoman |
| 4 | Bailiff | Banneret | Tithingman / Tithingwoman |
| 5 | Seneschal | Baron / Baroness | Hundredman / Hundredwoman |
| 6 | Earl / Countess | Under-king / Under-queen | Shire-reeve * |
| 7 | King / Queen | High King / High Queen | Lord Marcher / Lady Marcher |

Less common words:
- **Villein**: a tenant who owes the lord work on his land.
- **Hayward**: keeps the hedges and the common herd.
- **Reeve**: chosen by the villagers to run the work. It is already one of today's leader titles.
- **Bailiff**: runs an estate over several reeves.
- **Seneschal**: a lord's high steward.
- **Liegeman**: sworn by oath to a lord.
- **Banneret**: a knight who leads other knights under his own banner.
- **Under-king**: a king who serves a high king.
- **Yeoman**: a free farmer who works his own land.
- **Tithingman**, **Hundredman**: answer for a tithing (ten households) and for a hundred (many tithings).
- **Shire-reeve**: keeps a whole shire. It is the old form of "sheriff".
- **Lord Marcher**: holds a border march.

#### Grove-keepers (`elf`)
| Rank | Fey court (B) | Royal forest (A) | Hart and mist (C) |
|---|---|---|---|
| 1 | Fernling | Woodward | Reedkin |
| 2 | Thornward | Forester | Harrier |
| 3 (head at founding) | Glade Knight / Glade Dame | Regarder | Huntmaster |
| 4 | Grove Lord / Grove Lady | Verderer | Hart-Knight / Hart-Dame |
| 5 | Wild Lord / Wild Lady * | Justiciar | Mistwarden |
| 6 | Fey Prince / Fey Princess * | Forest Lord / Forest Lady | Hunt-Lord / Hunt-Lady † |
| 7 | Fey King / Fey Queen | Sovereign * | Hart-King / Hart-Queen † |

Less common words:
- **Fernling**: one of the fern-folk of the court.
- **Thornward**: guards three, as a thorn hedge guards a glade.
- **Woodward**: keeps a stand of trees.
- **Forester**: walks the woods and guards the game.
- **Regarder**: rides the forest bounds and inspects them.
- **Verderer**: judge of the green.
- **Justiciar**: holds the high forest court.
- **Harrier**: one who harries: drives the game toward the hunters. (Not the hawk; see §10.4.)
- **Hart-Knight**: sworn to follow the white hart.
- **Mistwarden**: keeps the mists that hide the court's land.

#### Stone-holders (`dwarf`)
| Rank | Mine law (A) | Anvil (C) | Hold (C) |
|---|---|---|---|
| 1 | Tinner | Hewer | Delver |
| 2 | Free Miner | Anvil-Sworn | Lodesman / Lodeswoman |
| 3 (head at founding) | Barmaster | Forgekeeper | Keystone |
| 4 | Gaveller | Oathsmith | Hallmaster |
| 5 | Stannator | Clanfather / Clanmother | Hold-Lord / Hold-Lady † |
| 6 | Vice-warden | Starsmith | Cornerstone |
| 7 | Lord Warden / Lady Warden | High Anvil | Stone-King / Stone-Queen |

Less common words:
- **Tinner**: a miner of tin and ore.
- **Free Miner**: a sworn miner who may hold a working.
- **Barmaster**: keeps the mine law and measures the ore.
- **Gaveller**: grants the mine plots and takes the lord's share.
- **Stannator**: sits in the mine parliament.
- **Lord Warden**: head of all the mines.
- **Hewer**: cuts and carries stone.
- **Oathsmith**: hammers the clan's oaths into iron.
- **Starsmith**: works the metal that fell from the sky.
- **High Anvil**: the anvil every forge answers to.
- **Delver**: digs and hauls.
- **Lodesman**: leads three along a lode of ore.
- **Keystone**: holds up the arch, as the head holds up the band.
- **Cornerstone**: the stone that many holds are laid on.

#### Tinkers (`gnome`)
| Rank | Craft guild (A) | The bench (B) | Relic burrow (C) |
|---|---|---|---|
| 1 | Apprentice | Mender | Rivet |
| 2 | Journeyman / Journeywoman | Fitter | Burnisher † |
| 3 (head at founding) | Craftmaster | Wright | Relic-Reader |
| 4 | Alderman / Alderwoman | Contriver | Clockmaster |
| 5 | Portreeve † | Engineer | Lightwright |
| 6 | Burgrave / Burgravine | Inventor | Engine-Sage |
| 7 | Landgrave / Landgravine † | Archwright * | Wonderkeeper † |

Less common words:
- **Journeyman**: a trained worker paid by the day.
- **Craftmaster**: has made a masterpiece and may run a workshop.
- **Alderman**: a guild elder on the town council.
- **Portreeve**: the head of a market town.
- **Burgrave**: count of a walled town.
- **Landgrave**: count of a whole land.
- **Wright**: makes a whole device.
- **Contriver**: works out new contraptions.
- **Engineer**: in its old sense, a maker of engines.
- **Archwright**: first among all wrights.
- **Burnisher**: polishes old relics clean.
- **Relic-Reader**: reads the marks on old relics.
- **Clockmaster**: keeps the great clock and the hours.
- **Lightwright**: makes lamps that burn without fire.
- **Engine-Sage**: knows the thinking engines best.
- **Wonderkeeper**: keeps the wonders the burrows have found.

#### Scavengers (`goblin`)
| Rank | Warren (C) | Misrule court (A) | The haul (B) |
|---|---|---|---|
| 1 | Grubber | Churl | Pocket |
| 2 | Sniffer | Knave | Sack |
| 3 (head at founding) | Heap-Chief | Ruffler | Barrow |
| 4 | Wreckmaster | Scrap Knight / Scrap Dame * | Cart |
| 5 | Packlord / Packlady | Rag Baron / Rag Baroness | Wagon |
| 6 | Warrenfather / Warrenmother | Misrule Lord / Misrule Lady | Caravan |
| 7 | Midden-King / Midden-Queen † | Beggar King / Beggar Queen | Trove † |

Less common words:
- **Heap-Chief**: sits on the band's heap of finds.
- **Wreckmaster**: holds the picking rights to a field of old wrecks.
- **Midden**: a refuse heap.
- **Churl**: a rough common fellow.
- **Knave**: a rascal.
- **Ruffler**: a swaggering ringleader of vagabonds.
- **Scrap Knight**: wears armour patched from scrap.
- **Misrule Lord**: after the Lord of Misrule of the midwinter revels.
- **The haul**: ranked by what you can carry, from a pocket up to the trove, a store of found treasure where every haul ends up.

#### War-bands (`orc`)
| Rank | Warclan (C) | Horn and scar (C) | Battle line (B) |
|---|---|---|---|
| 1 | Tusk | Bloodkin † | Spear |
| 2 | Axe-Brother / Axe-Sister | Breacher | Shield |
| 3 (head at founding) | Firebrand | Horncaller | Axe |
| 4 | Chieftain * | Scarbearer | Banner |
| 5 | Raid-Lord / Raid-Lady | Bloodfather / Bloodmother | Drum |
| 6 | Iron Tusk | Great Horn | Horn |
| 7 | Overking / Overqueen | Ash-King / Ash-Queen | War King / War Queen |

Less common words:
- **Firebrand**: carries the brand lit from the band's fire, the campfire every band starts around (V4).
- **Iron Tusk**: has tusks capped in iron.
- **Overking**: king over kings.
- **Breacher**: first through the breach.
- **Horncaller**: sounds the horn that calls the band.
- **Bloodfather**: head of a blood-kin of many bands.
- **Battle line**: each rank is what it carries or sounds, from spear to horn.

#### Foundry-minds (`automaton`)
| Rank | Brazen court (A) | Iron oath (C) | Glass garrison (this review) |
|---|---|---|---|
| 1 | Page | Vassal | Warder † |
| 2 | Armiger | Iron Squire | Gatekeeper † |
| 3 (head at founding) | Brass Knight / Brass Dame * | Iron Knight / Iron Dame | Constable † |
| 4 | Marshal | Steward * | Glass Warden † |
| 5 | Palatine | Castle-Mind | Glass Lord / Glass Lady † |
| 6 | Regent | Oath-Engine | Duke / Duchess † |
| 7 | Brazen Head | Crown-Engine * | Emperor / Empress † |

Less common words:
- **Armiger**: bears arms, a step below a knight.
- **Brass Knight**: after the metal knights over castle gates in the romances (THEME.md §1.3).
- **Palatine**: rules a province with a king's powers.
- **Regent**: rules in another's name.
- **Brazen Head**: after the brass head of legend that could answer any question.
- **Castle-Mind**: the mind of a whole castle-foundry.
- **Oath-Engine**: keeps the oaths every frame was built with.
- **Glass garrison**: named after the fortress of glass in an old Welsh poem, whose garrison stands silent on the wall. Under THEME T1 A the people see a wreck with dormant machines that way (THEME.md §1.3). The ranks go from the garrison's own posts, to the lords of glass fortresses, to duke and emperor. THEME T8 A already proposes Garrison and Watch as the automata's group words.
- **Warder**: keeps watch on the wall.
- **Gatekeeper**: keeps a gate and the warders on it.
- **Constable**: commands the garrison of a tower.
- **Glass Warden**: keeps a whole fortress of glass, with its towers and gates.
- **Glass Lord**: holds several fortresses of glass.

#### `default` (any culture without its own sets)
| Rank | Plain (this review) |
|---|---|
| 1 | Commoner † |
| 2 | Foreman / Forewoman † |
| 3 (head at founding) | Chief † |
| 4 | Captain † |
| 5 | Lord / Lady † |
| 6 | Prince / Princess † |
| 7 | Ruler † |

Plain words on purpose. No culture needs this set today. It is there for §1.7's fallback, for a species added later.

### 10.3 How the sets were chosen
Three proposals were written independently on 2026-09-19. Each gave two sets per culture, 42 sets in all:
- **A**: Arthurian court and chivalry, from real medieval offices.
- **B**: plain words and ladders of things (leaf to crown, cog to governor).
- **C**: fantasy titles with a science-fiction layer (wrecks, sky-metal, thinking machines).

Each set was scored 1 to 5 on six points, 30 at most:
1. It fits the culture (V39) and the theme (V65, THEME.md).
2. It reads clearly as rising authority.
3. It is easy to read at a glance, and ranks 2 and up read well in front of a name (§1.7).
4. It is distinct from the other cultures.
5. It is free of banned terms (AGENTS.md, THEME.md §3.3, T2 and T25), and every name fits in 12 characters.
6. It doesn't copy a known game's rank ladder.

The three best sets per culture were kept, after the fixes a single name could make. A name was replaced only to meet a rule or to stop a name appearing twice. Scores are for the sets as submitted. For kept sets the score after the §10.4 changes follows the arrow.

| Culture | Kept | Not kept, and why |
|---|---|---|
| Settlers | Manor and shire A (27), Freehold B (27), Knight and banner A (25 → 27) | C Hall and banner (22): repeats Reeve, Baron, Earl and High King, and its meanings add an unapproved fleet backstory. B Manor (21): repeats Reeve and Bailiff, and Sheriff was a Dwarf Fortress noble post. C Charter and helm (21): Captal and Grand Amiral read as typos for Capital and Admiral, and Mate reads as slang. |
| Grove-keepers | Fey court B (26 → 27), Royal forest A (23 → 24), Hart and mist C (22 → 25) | B The tree (23): Twig, Branch and Bough don't read as titles in front of a name ("Branch Lysael"), and no single change fixes that. Royal forest and Hart and mist pass it after their fixes. C Circle (20): Lantern and Stargazer don't read as rising, "Stargazer" contains Ultima's gazer, and it repeats Thornward and Fey Prince. A Hawks of rank (18): uses Merlin (T25), and hawk names read as given names and clash with the hawk wildlife. |
| Stone-holders | Mine law A (26), Anvil C (25 → 26), Hold C (24 → 26) | B The line (23): "Grandsire" reads oddly on a 25-year-old, and the hearth-and-ancestor pattern sits near Dwarf Fortress and Warhammer dwarves. B Stonework (23): Cobble, Lintel and Pillar don't read as titles, and it repeats Keystone and Cornerstone. A Keep and fealty (21): castle offices suit the humans better, and Lord Paramount is 14 characters. |
| Tinkers | Craft guild A (24 → 26), The bench B (24), Relic burrow C (24 → 26) | B Bright ideas (23): Candle, Lamp and Beacon don't read as titles. C Guild of engines (22): coils and sparks are the steampunk and "electric" look that THEME §1.2 and T2 rule out. A Engines and seals (19): Artificer is a D&D class, and Master Engineer and Lord Chancellor are 15 characters. |
| Scavengers | Warren C (26 → 27), Misrule court A (25 → 26), The haul B (24 → 25) | C Mock court (21): a second mock court beside Misrule, its metal tiers read like game tiers, and three female forms run 13 to 14 characters. B Rags (21): Hood, Boots and Cloak don't show which is higher. A Kennel and chase (18): court hunting offices (Berner, Lymerer) fit goblins poorly and are hard to read, and the elves already have a hunt set. |
| War-bands | Horn and scar C (23 → 24), Warclan C (21 → 24), Battle line B (22) | A Shield-wall (20): an Old English war ladder (fyrd, thegn, ealdorman) makes the orcs stand for the Saxons, which THEME §3.4 rules out, and Dux Bellorum is Arthur's own title. A Border reivers (19): Laird and Heidsman tie the orcs to real Scots borderers, and it repeats Lord Marcher. B Beasts (17): Wolf and Bear ranks for warriors echo Serpent Isle's knights of Monitor and their animal totems (THEME §3.3), and the beasts are also wildlife. |
| Foundry-minds | Brazen court A (26 → 27), Iron oath C (23 → 25), Glass garrison (written by this review; not scored) | C Array (23): kept in the first draft of this review, then dropped. Node and Relay are network words (T2). Its glosses, a lattice "that thinks as one" and a choir "speaking in one voice", describe a hive mind, the Borg "Collective" that THEME §3.3 rules out. T1 A says machines are named in the people's romance words. Its ranks 2 to 7 are all things (point 3). The frame and Guild of engines were rejected on the same T2 grounds, and THEME T8 A drops "Collective" and "Array" as the automata's group words. No automaton proposal was left that passes, so this review wrote the Glass garrison. A Grail order (21): uses the Grail (T25), and novice, brother and prior are real monastic words (THEME §3.4). B Gear train (21): brass gears are the steampunk THEME §1.2 rules out. B The frame (18): Mainframe is a computer word (T2), and Rivet repeats the gnomes. |

Not every kept set passes point 3. Some rank names from 2 up name a thing, not a person or an office:
- Two whole ladders do: The haul (goblins) and Battle line (orcs). They were the best third sets left.
- Three more sets have one or two such names: Hold, Anvil, and Horn and scar.
- In three sets the founding head's title is a thing: Barrow, Axe and Keystone.

The first draft of this paragraph named only the two ladders. It also missed that every rank 2 to 7 of Array was a thing. §10.6 item 1 lists every such name and asks what to do with them.

### 10.4 Changes from the proposals
| Culture, set | Rank | Proposed | Now | Why |
|---|---|---|---|---|
| Settlers, Knight and banner | label | Round Table | Knight and banner | The Round Table is a named Arthurian institution (T25). |
| Settlers, Knight and banner | 1 | Freeman | Liegeman / Liegewoman * (from A's Stone-holders set) | Freeman stays in the Freehold. |
| Settlers, Freehold | 6 | Alderman | Shire-reeve * (from B's own note) | It completes tithing, hundred, shire, and it leaves Alderman to the Tinkers. |
| Grove-keepers, Fey court | 5 | Forest Lord | Wild Lord / Wild Lady * (B's own word "wild") | Forest Lord stays in the Royal forest. |
| Grove-keepers, Fey court | 6 | Wild Prince | Fey Prince / Fey Princess * (from C) | "Wild Princess" is 13 characters. |
| Grove-keepers, Royal forest | 7 | Green Sovereign | Sovereign * | 15 characters. |
| Grove-keepers, Hart and mist | label | Lake Court | Hart and mist | The lake names are gone (below), and the white hart is the set's own motif. |
| Grove-keepers, Hart and mist | 2 | Harrier | Harrier | The name stays. Its meaning is now "one who harries", a person, and no longer the hawk. A hawk in front of a name fails §1.7, and hawks are wildlife (the reason A Hawks of rank was not kept, §10.3). |
| Grove-keepers, Hart and mist | 4 | Hart-Knight | Hart-Knight / Hart-Dame | A female form, as for every other knight. |
| Grove-keepers, Hart and mist | 6 | Lake Lord / Lake Lady | Hunt-Lord / Hunt-Lady † | "Lake Lady" reads as the Lady of the Lake (T25). |
| Grove-keepers, Hart and mist | 7 | Lodestar | Hart-King / Hart-Queen † | A star isn't a title before a name, and B used Lodestar too. |
| Stone-holders, Anvil | 6 | Starsmith | Starsmith | The name stays. Its meaning no longer says "star-iron", which is unapproved lore (VISION → Proposed but not approved). |
| Stone-holders, Hold | 5 | Holdfast | Hold-Lord / Hold-Lady † | It doesn't read as a rank, and it is also a video game's title. |
| Tinkers, Craft guild | 5 | Mayor | Portreeve † | Mayor is a Dwarf Fortress position (V9). |
| Tinkers, Craft guild | 7 | Guild Prince / Guild Princess | Landgrave / Landgravine † | "Guild Princess" is 14 characters. Landgrave follows Burgrave. |
| Tinkers, The bench | 7 | Wonderwright | Archwright * (from C) | It caps Wright at rank 3. "Wonder" goes to the Relic burrow. |
| Tinkers, Relic burrow | 2 | Mender | Burnisher † | Mender is The bench's rank 1. |
| Tinkers, Relic burrow | 7 | Merlin | Wonderkeeper † | Merlin is a famous figure (T25). |
| Scavengers, Warren | 7 | Hoard-King | Midden-King / Midden-Queen † | THEME T5 and T8 propose "Hoard" as the gnomes' word. |
| Scavengers, Misrule court | 4 | Robber Knight | Scrap Knight / Scrap Dame * (from C) | "Robber Knight" is 13 characters. |
| Scavengers, The haul | 7 | Hoard | Trove † | The same T5 reason. |
| War-bands, Warclan | 4 | Black Knight | Chieftain * (from THEME T11) | OSRS has Black Knights (THEME §3.3). |
| War-bands, Horn and scar | label | Horde | Horn and scar | Warcraft's Horde (THEME §3.3). |
| War-bands, Horn and scar | 1 | Spear | Bloodkin † | Spear stays in the Battle line. It goes with Bloodfather at rank 5. |
| Foundry-minds, Brazen court | 3 | Copper Knight / Copper Dame | Brass Knight / Brass Dame * | 13 characters. Brass matches the Brazen Head. |
| Foundry-minds | set | Array (C) | Glass garrison † (all seven ranks new) | T2, THEME §3.3 and point 3 (§10.3). The first draft kept Array with rank 7 changed from Prime Mover ("Prime" is Transformers' leader title) to First Mind. That set is dropped now. |
| Foundry-minds, Iron oath | 3 | Iron Knight | Iron Knight / Iron Dame | A female form. |
| Foundry-minds, Iron oath | 4 | Seneschal | Steward * (from B) | Seneschal stays with the Settlers. |
| Foundry-minds, Iron oath | 7 | Crowned Engine | Crown-Engine * | 14 characters. |
| all | – | the "-mistress" forms | dropped | One form for every "-master" word (§10.1). |

### 10.5 The check
A scratch script (in the session's scratchpad, not in the repo) checks `rank_names.proposal.json`:
- The JSON parses.
- Every key other than `about` and `default` is a culture id in `game/data/UF_WorldCatalog.json`, and every catalog culture has sets.
- Every culture has at least three sets. Each set has a unique id, a label and ranks 1 to 7 in order.
- Every name and female form has at most 12 characters (§1.7) and at most 14 letters.
- No name appears twice in the file.
- No name, female form, label or id contains a banned term. The scan is case-insensitive, on letters only, so "Star-Iron" also matches "stariron". Fifteen short terms are matched as whole words, such as AI, Kay, Yew and Boss. There are 232 terms:
  - AGENTS.md's list and `tools/check_catalog.js`'s;
  - the lists in THEME.md §3.3: Ultima, Dwarf Fortress, OSRS, D&D, other works and VISION's unapproved lore;
  - T2's "never" words;
  - T25's famous Arthurian names;
  - rank words of known games that the proposals avoided.

Re-run on 2026-09-19 after the review fixes (the Glass garrison in place of Array), with `"C:\Program Files\nodejs\node.exe" check_rank_names.js`:
```
PASS json_parses: C:\Users\snewt\OneDrive\Desktop\UF\docs\design\rank_names.proposal.json
PASS culture_ids: 7 keys, all catalog culture ids; every catalog culture present (human, elf, dwarf, gnome, goblin, orc, automaton); plus about and default
PASS ranks_1_to_7: 22 sets, each with ranks 1..7 in order; every culture has at least 3 sets; set ids unique
PASS name_length: 206 names and female forms, longest "Tithingwoman" (12 characters)
PASS no_repeats: 206 distinct names; none appears twice in a set or across the file
PASS no_banned_terms: 251 strings scanned against 232 terms (case-insensitive; substring on letters only, whole word for 15 short terms)
RESULT PASS 6
```
It can fail. The broken copies below were re-run on the same day against the revised file. On a copy with the Settlers' rank-2 "Hayward" changed to "Guardian" it printed:
```
FAIL no_banned_terms: human/human_manor/rank 2: "Guardian" contains banned term "Guardian"
RESULT FAIL 1
```
Other broken copies were also caught:
- "Wild Guardian-Lord" failed on length and on the banned term.
- A key "dragonkin" failed `culture_ids` (and `ranks_1_to_7` and `no_repeats`, because it copied the orc sets).
- A rank numbered 9 failed `ranks_1_to_7`.
- "Guild Princess" failed `name_length`.
- A second "Tusk" failed `no_repeats`.
- "Collective" as the Glass garrison's rank 5 failed `no_banned_terms`.

The scan can't tell whether a name is a person or a thing (§10.6 item 1). That was read by hand.

Run on the three proposals as submitted, the check found:
- 21 names over 12 characters, for example "Green Sovereign", "Robber Knight" and "Crowned Engine".
- 13 names that hit the scan: Merlin (twice), Black Knight, Lake Lady, Mayor, Sheriff, Artificer, Grail King, Grail Queen, Mainframe, Prime Mover, Holdfast and Stargazer.
- Three labels that hit it: Round Table, Horde and Grail order.

Each one is changed or left out above.

### 10.6 Risks and choices for the user
1. **Things in front of a name.** §1.7 asks that ranks 2 and up read as a title in front of a name ("<R2> Wenna"). The names below name a thing instead. They were found by reading every rank-2-to-7 name by hand, because the scan in §10.5 can't tell a person from a thing.
   - **Whole ladders.**
     - The haul (goblins): Sack, Barrow, Cart, Wagon, Caravan, Trove.
     - Battle line (orcs): Shield, Axe, Banner, Drum, Horn.
     - "Sack Bikig" and "Axe Hruul" read as war-names more than titles.
   - **Single names in sets that are otherwise titles.**
     - Hold (dwarves): rank 3 Keystone and rank 6 Cornerstone.
     - Anvil (dwarves): rank 7 High Anvil.
     - Horn and scar (orcs): rank 6 Great Horn.
   - **Founding head titles.** Three of these names are the head's title at founding, which is the first title the player sees on a band (§10.1): Barrow, Axe and Keystone. So 3 of the 21 culture sets open with a thing.
   - **Closer calls.**
     - Warclan's rank 6, Iron Tusk, is a body part. It reads as a war-name.
     - Brazen court's rank 7, Brazen Head, is the legend's talking head. "Head" is also the band's head.
     - Iron oath's ranks 5 to 7 are Castle-Mind, Oath-Engine and Crown-Engine. For automata, "mind" and "engine" say what the bearer is, and T2 A allows "engine" in its medieval sense, so these may read as titles.
   - **The first draft of this item** named only The haul and Battle line. It also kept Array, whose ranks 2 to 7 were all things. Array is now replaced (§10.3). Harrier is now read as a person (§10.4).
   - **Choices,** for each set or each name:
     - keep it, so the thing reads as an honour, like a war-name;
     - swap each named rank for a person-word, one name at a time as in §10.4 (this review can propose the swaps);
     - drop the set, which leaves that culture with two sets, one fewer than §1.7 asks for;
     - or have those bands address people by name alone.
2. **Knights at rank 3.** Four sets have a knight word at rank 3: Knight, Glade Knight, Brass Knight and Iron Knight. The names differ, but the pattern repeats. "Knight Cadot" also reads less well than "Sir Cadot". THEME's T12 honorifics would fix the address.
3. **Hard words.** Villein reads like "villain" (Cottar is a plain swap). Regarder, Verderer, Justiciar, Gaveller, Stannator, Portreeve, Burgrave, Landgrave, Armiger, Palatine, Ruffler and Churl are real but little known. The sheet could show a one-line meaning later. That isn't in this build.
4. **Echoes to look at.** These are from memory; no trademark search was run.
   - Justiciar is one letter from "Justicar" (Warhammer 40,000; Vampire: the Masquerade).
   - Marshal, Palatine and Steward are real titles that Warhammer 40,000 also uses. No set copies a ladder from it.
   - Ash-King sits near Morrowind's ash-land tribes.
   - The Iron oath names may pull the automaton art toward a walking suit of plate. THEME T7 says that look reads like Serpent Isle's automatons.
   - Craftmaster, Firebrand and Breacher are common words that games have also used.
   - Warder (Glass garrison, rank 1) is also the word for the sworn guards in the Wheel of Time books. It is a common English word for a guard.
5. **Real institutions.** Mine law draws on real English mine courts, the tin stannaries and the Forest of Dean free miners. The Freehold draws on the English tithing and hundred. These are institutions, not peoples (THEME §3.4).
6. **Rare female forms.** Yeowoman, Tithingwoman, Hundredwoman, Liegewoman, Hart-Dame, Iron Dame, Scrap Dame and Brass Dame. Any of them can fall back to one form for everyone.
7. **Many kings.** Ten of the 21 culture sets end in a king or a queen. Each has a different name. The Glass garrison ends in an emperor.
8. **New names.** This review added 17 names to the culture sets (†): 10 single names and the 7 ranks of the Glass garrison. It also took Chieftain from THEME T11 and wrote the 7 plain names of `default`.
9. **Data shape.** The JSON uses the shape this review was asked for: `{ "id", "label", "ranks": [ { "rank", "name", "female"? } ] }`. It adds `id` for §1.7's `rankSet`. §1.7 sketches `{ "id", "names": [ ... ] }` with `{ "male", "female" }` for gendered names. Both carry the same data. The build picks one when the names are approved and updates §1.7 to match.
10. **Culture labels may change.** THEME T13 proposes new culture labels. The sets are keyed by species id, so a relabel changes nothing here. If T5 A is chosen (the gnomes as hoard-keepers), the Relic burrow fits it best. "Hoard" was kept out of the goblin sets for that reason.
11. **The Glass garrison is new.** This review wrote it after Array was dropped (§10.3). No proposal scored it, and only the check in §10.5 has been run on it.
    - It depends on T1 A. The fortress of glass with its silent garrison, from the old Welsh poem, is how the people see a wreck with dormant machines (THEME §1.3). If T1 A isn't chosen, the glass words are only a look.
    - Ranks 1 to 4 are a castle's posts and offices. Rank 5 is a lord, rank 6 a duke and rank 7 an emperor. So every rank from 2 up names a person.
    - If you don't want it, you can drop it, which leaves the Foundry-minds with Brazen court and Iron oath, one set fewer than §1.7 asks for. Or you can ask for another set.
