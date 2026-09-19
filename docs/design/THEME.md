# THEME: Arthurian fantasy with science-fiction elements (VISION V65)

Written 2026-09-19 by Claude Code (design) for everyone who makes content: the engineers who fill `game/data/UF_WorldCatalog.json`, the art generators (through `docs/handoffs/GENERATOR_PROMPTS.md`), and the user, who approves every named thing.

**Decided by the user.** On 2026-09-19 the user said: "The overall theme of this game is arthurian fantasy with scifi elements" (V65, and V8 revised) and "Crafting should basically work like OSRS as well, albeit with different ores" (V66). The standing rules still apply. V9: setting, names and terms are original, and public-domain myth is fine. AGENTS rule 7: no new lore, places, races, factions or named characters without approval. AGENTS → Reference vs. shipped content: no Ultima, DF or D&D product-identity terms in player text.

**Not decided.** Everything else in this file. Each choice is marked **PROPOSAL Tn** and lists its options with the recommended one first. The user can answer by number, for example "T1 A, T4 B, T9 yes". §5 lists every decision in order. Nothing in `game/` was changed for this file.

**Read with it.** VISION V4, V16, V31, V39, V51, V52 and V63–V66, and "Proposed but not approved"; `docs/design/COMBAT_CHAINS.md`, whose item and recipe data the V66 tiers will replace; `docs/design/SCALE.md`, which leaves the world scale open, so sizes here are given against known creatures rather than in pixels; `docs/handoffs/GENERATOR_PROMPTS.md`.

**Written against** the working-tree catalog of 2026-09-19. Its only uncommitted edit is the `ambient` block. Names, titles, species and cultures are as committed in 255bf47.

**Sources.** The legends and other games below are cited from memory. They were not checked against the texts in this session. Check each name or motif against its public-domain text (§3.1) before it goes into the game.

## 0. What this file does not do
- **It does not revive the earlier session's unapproved inventions** (VISION → Proposed but not approved). Three of them sit close to this brief: "Star-Iron" (close to star-metal, §2.8), "Precursor Automata" (the catalog's automata, §2.1) and "Precursor fabricators" (the relic workshops, §2.7). This file uses none of those names. Whether any of them comes back is the user's call.
- **It does not set V66 tiers, numbers or recipes.** Those belong to the crafting spec. §2.8 only proposes what the themed tiers are called and where they come from.

## 1. Pillars and tone

### 1.1 Four pillars
1. **Oath and rank.** People are bound to each other: a leader's word, a knight's vow, a treaty between factions. V52's ladder of ranks uses this language: king, lord, knight, squire, reeve.
2. **Hearth, hall and keep.** Most of life is work, and the work is medieval: fields, smithies, timber round halls, palisades that become stone keeps, a chapel with a bell. It is drawn as real craft (V2: "fantasy realism on a small scale").
3. **The old wild.** Past the fields, the land is older than the kingdoms: deep forest, moor and fen, the fey in the hollow hills, giants and great beasts. The world fields already put this on the map: savagery (tame, wild, primeval) and alignment (cursed, neutral, blessed) in the catalog's `regions`.
4. **The fallen stars.** These are rare, strange and valuable. Wrecks of a star-faring age lie half-buried in the land, with metal no smith can make, crystal that glows, and silent machines that still keep their old orders. Lights cross the night sky. The best materials and the worst dangers are found here.

### 1.2 Tone
| It is | It is not |
|---|---|
| Earnest and grounded, a little elegiac: the romances' sense of a golden age passing | Parody (nothing from Monty Python) or grimdark gore |
| Wonder is rare. Most days are fields, meals and walls. | A wizard on every hill |
| A high-medieval look, about 1100–1300: mail, surcoats, kite and heater shields, great helms, timber halls, early stone keeps | Late plate armour, Roman or Viking dress, fantasy spikes |
| Science fiction as old, rare, broken and half-understood things | Steampunk (brass gears, steam, goggles), cyberpunk (neon, screens, guns), space opera (nobody flies) |
| Stories that come out of the simulation (V16). A colonist draws a sword from a stone because her attack level has reached it. A knight dies hunting a giant, and the chronicle says so. | Scripted plots or hand-written named characters (rejected in VISION) |

### 1.3 PROPOSAL T1: where the fantasy and the science fiction meet
- **A (recommended): misunderstood wonders.** The star-farers' age ended long ago, and its wrecks, machines and crystal lie in the land. Today's people see them through the romances. A wreck is a castle that fell from heaven, a working machine is an enchanted knight, and a healing machine is a cauldron of rebirth. The text the player reads uses the people's words (T2). The art shows the truth: machined seams, smooth hull plates, faint light. So the player knows more than the characters do. The text never explains the past unless the user approves a backstory.
- **B: open ruins of an advanced past.** People know that people like them made the old works long ago, and they call them machines and engines. This is clearer and less mysterious.
- **C: the fey are the star-farers.** The Otherworld, fey glamour and changelings are all star-farer technology: a fairy ring is a landing place, and being taken by the fey means being taken aboard. This ties two pillars together, but it fixes a big piece of lore now.
- **D (an add-on to A, B or C; recommended with A): the sky is still active.** Lights still cross the night sky, and things still fall. A falling star is a world event in play: it leaves a new wreck with sky-iron and crystal (§2.7, §2.8), and the chronicle records it. This is emergent (V16) and physical (V21).

Option A reads naturally because the romances already contain most of these wonders:

| Public-domain motif | What it really is under A | In the game |
|---|---|---|
| A fortress of glass whose garrison of thousands stands silent on the wall, and whose sentinel is hard to speak with (the Welsh poem *Preiddeu Annwfn*) | a wreck with dormant machines | a wreck site guarded by sentinels (§2.6, §2.7) |
| Metal men over castle gates (the copper knight of the Dolorous Guard, Prose Lancelot) | an automaton | sentinel monsters; the automaton species |
| The cauldron that brings the dead back (*Branwen*, the Second Branch of the Mabinogi) | a healing machine | a relic (§2.9) |
| The head that kept talking and feasting for years (Brân, in the same tale) | a thinking machine's core | a relic that gives news (§2.9) |
| The sword that burns when a worthy man draws it; the sword in the stone that only the rightful one can draw | a heated blade; a lock that knows its owner | relic weapons with a level requirement (§2.9) |
| The mantle that hides its wearer; the board whose pieces play by themselves (the Welsh list of thirteen treasures) | a cloaking field; a game machine | relics (§2.9) |
| The waste land around a wounded king (the Grail romances) | poisoned land around a wreck | the catalog's cursed regions (§2.5) |
| The hollow hills where the fey live | buried vaults | vault sites (§2.7) |
| Falling stars, strange lights, portents | debris and old craft in the sky | T1 D sky events |

### 1.4 PROPOSAL T2: words for the science fiction in player text
- **A (recommended with T1 A): in-world words only.** Use: relic, wonder, fallen star, sky-iron, the wreck, the old works, automaton, engine (in its medieval sense), crystal, light. Never use: robot, android, cyborg, alien, spaceship, starship, laser, blaster, energy, power cell, battery, computer, program, AI, technology, radiation, plasma, electric, aetheric. "Aetheric" is also the unapproved earlier lore.
- **B:** plain modern words are allowed in look descriptions ("a crashed ship"), and in-world words are used in speech.

With A, T10's banned-word check can also carry the "never" list for player text.

## 2. What the theme changes, system by system

| System | Change | Where in the engine | Data only today? | Art |
|---|---|---|---|---|
| Species (§2.1) | Reframe the seven species; one new display name | `factions.species[].name`, `people.<species>`, `cultures.<species>` | yes | people sheets later (AR-400, AR-600) |
| Faction names (§2.2) | Themed group words now, name templates later | `factions.species[].groups`; `UF_Factions.js` lines 107–108 build "The {stem} {group}" | group words yes; templates need code | heraldry later |
| Person and place names (§2.3) | Syllable tables per species | `start.names`, `people.<species>.names`, `factions.names` | yes, except for the player's colonists (UF_Colonists reads only `start.names`) | none |
| Ranks and titles (§2.4) | A title ladder per species and gender | `factions.founders.titles` today; a new ladder key later | leader titles yes; the ladder needs code | none |
| Cultures and regions (§2.5) | Theme labels | `cultures.<species>.name`, `regions.alignment[].name` | yes | none |
| Creatures (§2.6) | Folklore creatures added | `wildlife.species` | yes, with tinted stand-ins; lairs and unique beasts need code | new sheets |
| Buildings and world features (§2.7) | Halls, keeps, chapels, stones, wrecks, vaults | `objects`, `sites`, a new world-feature pass in UF_WorldGen | objects yes; features need code | new objects |
| Materials (§2.8) | Names for the themed top tiers | `materials`, `items.types`, `recipes` (V66 spec) | with the V66 build | item icons |
| Relics (§2.9) | A few relics shaped by the legends | `items.types`, `objects`, level requirements (V63) | no | relic objects and icons |
| Gear names (§2.10) | High-medieval words | `items.types[].name` | with the V64/V66 data | none |
| Magic and faith (§2.12) | What magic and worship are | the V63 magic skill, V64 magic attacks; worship later | no | effects |
| Talk text (§2.13) | Register | `talk.*`, `arrivals.kinds.*.bark` | yes | none |
| Art prompts (§2.14) | A theme paragraph | `docs/handoffs/GENERATOR_PROMPTS.md` | docs only | all new art |

### 2.1 Species (PROPOSALS T3–T7)
The ids stay as they are (`human`, `elf`, `dwarf`, `gnome`, `goblin`, `orc`, `automaton`) because every key, sheet and check uses them. Only the words the player reads change.

| Species | Place in the theme | Options |
|---|---|---|
| Humans | The knightly kingdoms: the hill-halls of a Brythonic flavour and the castles and courts of an Old French flavour, in one culture | **PROPOSAL T3 A (recommended): keep, with one culture whose names mix both flavours (§2.3).** B: two human cultures. That needs cultures per faction instead of per species, which is a code change. |
| Elves | The fey folk: courts ruled by a queen or a king, the hollow hills and the deep forest, glamour, and harm from iron (the folklore of cold iron) | **PROPOSAL T4 A (recommended): keep the name "Elves" and give them the place of the fey.** B: change the display name to "Fair Folk". C: keep the elves as plain forest folk and add the fey later as a separate people. In every option, avoid Welsh-sounding elf names and elves with crystal gear, because both belong to OSRS's elves (Prifddinas, the Iorwerth and Cadarn clans, crystal bows). Also avoid DF's elves who refuse to use wood. |
| Dwarves | The hill-folk of the old mines, the first to work sky-iron | **PROPOSAL T3: keep.** They mine and smith, as the catalog's chain weights already say. They did not build the machines: dwarves who made lost machines are the Elder Scrolls' Dwemer. |
| Gnomes | Earth-folk who keep hoards and hidden ways under the hills, and gather relics | **PROPOSAL T5 A (recommended): keep them and reframe them as hoard-keepers.** The earth-spirits of Renaissance folklore guard buried treasure. The culture name becomes "Hoard-keepers". B: keep them as relic tinkers (today's "Tinkers"), although tinker gnomes read like D&D's Dragonlance. C: fold them into the goblins. |
| Goblins | Hob-folk and wreck-pickers who scavenge the fallen stars, like the goblins of Welsh mine folklore | **PROPOSAL T3: keep.** Their culture is already called "Scavengers". |
| Orcs | The giant-blooded clans of the hills | **PROPOSAL T6 A (recommended): change the display name to "Ogres"; the id stays `orc`.** The word "ogre" first appears in Chrétien's *Perceval*, where the realm "was once the land of ogres", so the name belongs to this theme. B: keep "Orcs". C: "Giant-kin". |
| Automata | The silent servants of the fallen age, still keeping their last orders | **PROPOSAL T7 A (recommended): keep "Automata" and keep them unplayable, as now.** They get new group words (§2.2) and a look of their own. Not a walking suit of plate, which reads like the automatons of Ultima VII's Serpent Isle, and not a bronze giant, which is DF's bronze colossus. B: rename them "the Brazen". C: no automaton faction; machines appear only as sentinel monsters at wrecks. **Sub-question:** automaton founders are "three men and three women", and V26 lets them have children. The theme suggests they grow by waking dormant machines at wrecks instead. That is code, and it comes later. |

### 2.2 Faction names (PROPOSAL T8)
Today, `UF_Factions.js` (lines 107–108) builds each faction name as "The " + a stem from `factions.names` + " " + a group word from `factions.species[].groups`. Examples: "The Ostwyn League", "The Pelirwyn Warren".

Three words need care:
- **"Fellowship" is on AGENTS' banned list** (Ultima's Fellowship), so "fellowships of knights" can never use that word. "Company" and "Order" carry the same idea.
- **"Collective"** (a current automaton group word) reads like Star Trek's Borg, and **"Horde"** (a current orc group word) reads like Warcraft. Both go.

**T8 A (recommended now, data only): new group words in today's "The {stem} {group}" form.** The stems in the examples come from the T9 place table.

| Species | Today | Proposed `groups` | Reads like |
|---|---|---|---|
| human | League, Freehold, Company, Kingdom | Kingdom, Realm, March, Order, Company, Freehold | The Valgarde Kingdom, The Caerwyn March, The Penmont Order |
| elf | Circle, Grove, Court | Court, Hollow, Circle | The Morance Court, The Glasydd Hollow |
| dwarf | Hold, Deep, Clan | Hold, Clan, Hall | The Dunoc Hold |
| gnome | Guild, Burrow, Workshop | Hoard, Burrow, Guild | The Rosford Hoard |
| goblin | Warren, Pack, Rabble | Warren, Pack, Rabble (unchanged) | The Hely Warren |
| orc | Horde, Band, Warclan | Clan, Host, Warband | The Trehelmont Host |
| automaton | Collective, Array, Foundry | Garrison, Watch, Engine | The Falais Garrison |

**T8 B (later): group words become templates with `{name}`**, so the patterns of the legends read right. This is a small code change in UF_Factions. Examples: "The Kingdom of {name}", "The Order of the {charge}", "The {name} Company", "The Court of {name}", "The Hold of {name}", "Clan {name}", "The Host of {name}", "The Garrison of {name}".
- `{charge}` comes from a heraldic list: Hart, Boar, Swan, Raven, Hound, Oak, Tower, Bell, Lantern, Key, Wheel, Thorn, Anvil.
- Never use the names of real orders: Garter, Golden Fleece, Bath, Thistle, Templar, Hospitaller, Teutonic.
- Camp names come from the same stem table (`UF_History.js`, `makeNamer`), so they change with T9.

### 2.3 Person and place names (PROPOSALS T9, T10)
**How names are made today.**
- **People:** a start syllable, sometimes a second one, then an ending (`UF_History.js` `personName`, from line 334; `UF_Colonists.js` `nameFor`, lines 160–169). UF_History uses `people.<species>.names` when a species has its own table (none does yet), and otherwise `start.names`.
- **The player's colonists:** UF_Colonists always uses `start.names`, so they get the shared table whatever their species. Reading the species table there is a one-line code change.
- **Factions and camps:** the stems come from `factions.names` (a start, an optional second start, an end), which every species shares.

**PROPOSAL T9 (recommended: yes): these syllable tables, in the catalog's own shape.**
- **Humans:** Brythonic/Welsh-like and Old French-like syllables, mixed. This is also the shared fallback table.
- **Elves:** soft and sibilant. They are deliberately not Welsh (OSRS's elves have Welsh names) and not Tolkien's.
- **Dwarves:** short, hard, a little Cornish.
- **Gnomes:** small and homely.
- **Goblins:** harsh.
- **Ogres/orcs:** heavy.
- **Automata:** clipped Latin, the learned tongue of the old age.
- **Places:** Brythonic (aber, caer, pen, tre, lan) and Old French (garde, mont, -ais, -ance).

```json
"start":  { "names": { "start":  ["aed","ang","bel","bleid","cad","ceri","clar","dyf","eli","gwyn","hel","jeh","llyw","mad","mel","nes","odo","rhod","ros","ser","tal","tud","gui","ys"],
                       "male":   ["an","ard","aut","ed","ic","ier","on","oc","ot","udd","wyn","yn"],
                       "female": ["a","aine","es","eth","ette","ine","ise","wen","ydd","ande"] } },
"people": {
  "elf":       { "names": { "start": ["aer","cyl","eir","fin","ilm","iss","lys","nym","or","sel","sion","thyl","ul","vaer","yss"], "male": ["an","ior","is","ro","un","ael","ith"], "female": ["a","ae","ia","ielle","ise","une"] } },
  "dwarf":     { "names": { "start": ["bor","brun","cor","dol","dur","gar","hed","hod","nod","rud","stan","tor","trev","hal"], "male": ["ak","an","ek","o","ric","um","ur"], "female": ["a","is","ra","unn","ey","hild"] } },
  "gnome":     { "names": { "start": ["bim","cob","dim","fen","gil","kip","lob","mip","nib","pim","quil","tib","wim"], "male": ["ble","do","kin","le","ny","wick"], "female": ["a","bel","ella","ie","ina","sy"] } },
  "goblin":    { "names": { "start": ["bik","dreg","grib","krat","mog","rik","skab","snag","tuk","vrik","zub"], "male": ["ak","ek","it","ob","uk","wort"], "female": ["a","et","ig","ni","sa","ub"] } },
  "orc":       { "names": { "start": ["bor","dun","gor","hru","mor","og","rag","thar","ur","vod"], "male": ["ag","ath","og","ul","um","ush"], "female": ["a","ah","ga","ra","uth"] } },
  "automaton": { "names": { "start": ["aes","cel","cust","fer","lum","noct","orb","sil","tac","vig"], "male": ["a","ens","is","o","or","um","us"], "female": ["a","ens","is","o","or","um","us"] } }
},
"factions": { "names": { "start": ["aber","bel","caer","cor","dun","glas","lan","mor","pen","ros","tre","val","car","fal","hel","mael","ys","gwen"],
                         "end":   ["ais","ant","ec","ford","garde","mont","oc","wyn","y","ydd","on","el","ance"] } }
```

These `people.<species>` entries only add `names`. The existing `images`, `tint` and `stats` keys stay.

Samples from a scratch generator that uses the engine's pattern (2026-09-19):

| Table | Men | Women |
|---|---|---|
| Humans | Nesoc, Cadot, Sermadaut, Talier, Gwynyn | Ysise, Sereth, Ceriydd, Elieliande, Jehes |
| Elves | Lysael, Sionoran, Finis, Aercylun, Finro | Ilmune, Sionise, Lysia, Orielle, Nymae |
| Dwarves | Hedan, Borric, Dolur, Trevric, Toro | Hodunn, Garey, Bruna, Duris, Borey |
| Gnomes | Quilwick, Bimloble, Nibny, Nibdo, Fenble | Mipbel, Nibella, Cobbel, Mipina, Gilella |
| Goblins | Dregit, Kratrikwort, Zubgribob, Vrikrikuk | Bikig, Tuksa, Zubtuket, Riksa, Dregig |
| Ogres/orcs | Hruul, Morath, Vodag, Urvodum, Ragath | Ogga, Vodra, Borah, Mora, Tharra |
| Automata | Noctvigum, Tacus, Silor, Lumferor | Aesis, Noctens, Custus, Celum, Custo |
| Places | Valgarde, Caerwyn, Falais, Trehelmont, Morance, Rosydd, Duncarance | |

**PROPOSAL T10 (recommended: yes): extend the banned-name check, and re-roll banned names.** On 2026-09-19 a scratch Node script built every one- and two-syllable name each table can make and compared it exactly with about 250 names. The list covered the AGENTS list, Ultima's people and places, OSRS's places, people, gods and ores, the famous Arthurian and Mabinogion figures and places, D&D and Tolkien names, and VISION's unapproved names. It found:
- **The current catalog can already make two OSRS names.** `factions.names` can make "Zanaris" (zan + ar + is, OSRS's fairy city), and `start.names` can make "Doric" (dor + ic, OSRS's dwarf smith). Neither word is on the lists the checks scan today, so `history.no_banned_words` would let both through.
- **The first draft of the human table made "Vivian"** (vi + vi + an), a name of the Lady of the Lake. "vi" was replaced with "gui".
- **The tables above make none of the listed names.** The list is not complete; it covers the names most likely to matter.

The proposal:
- Add the OSRS, Ultima-place and famous-figure lists, plus T2 A's "never" words, to the banned-word checks (`UF_History`'s `no_banned_words` and `tools/check_catalog.js`).
- Make the name generators (UF_History `personName` and `makeNamer`, UF_Colonists `nameFor`, the UF_Factions stem) skip a banned result and roll again.

These files are Claude Code's, and nothing changes in play except the names.

### 2.4 Ranks and titles for V52 (PROPOSALS T11, T12)
Today only a band's leader has a title: one of `factions.founders.titles` (Chief, Warden, Speaker, Reeve), for every species and gender (`UF_History.js` lines 382–386). The chronicle shows it ("led by Chief Zorette"). `history.titles` is the list of the generator that is switched off.

**PROPOSAL T11 A (recommended): a ladder per species, gendered where the language is gendered, used as the V51/V52 societies grow.**
- **Code:** titles by rank, species and gender, under a new key such as `cultures.<species>.ranks`. The engineer who builds it names the key.
- **The ruler's title grows with the faction** (a band, then one built site, then several sites), the way DF's positions grow with a fort.

| Rank (V52) | Humans | Elves (fey court) | Dwarves | Gnomes | Goblins | Ogres/orcs | Automata |
|---|---|---|---|---|---|---|---|
| Ruler of a band (nothing built yet) | Reeve | Warden | Warden | Keeper | Boss | Headman | Keeper |
| Ruler of one built site | Lord / Lady | Lord / Lady | Hold-warden | Hoard-keeper | Chief | Chieftain | Warden |
| Ruler of several sites | King / Queen | King / Queen | Thane | Eldest | High Chief | Warlord | First |
| Leader of a site under the ruler | Castellan, or Lord / Lady | Lord / Lady | Hold-warden | Keeper | Boss | Chieftain | Warden |
| Squad leader (V43 soldiers) | Knight (Sir / Dame) | Huntsman / Huntress | Shield-captain | Watch-captain | Gang-boss | Champion | Sentinel |
| Work-group leader | Reeve (fields), Steward (stores), Master (a craft, e.g. master smith) | Warden | Mine-captain, Forge-master | Master | Boss | Headman | Overseer |
| Chapel (with T21) | Abbot / Abbess, Chaplain | – | – | – | – | – | – |
| Teen in training at arms (V40) | Squire | – | – | Apprentice | – | – | – |
| Child in a knight's household | Page | – | – | – | – | – | – |

**T11 B (data only, now): one themed, gender-neutral list for every leader.** Set `factions.founders.titles` to ["Reeve", "Warden", "Chief", "Steward"], replacing "Speaker". The gain is small; the ladder in A is where the theme shows. Recommended: B now, then A with the societies.

**PROPOSAL T12 (recommended: yes, with T11 A): honorifics.**
- A knight's name reads "Sir Cadot" or "Dame Ysise" in the look label, on the sheet, in speech and in the chronicle.
- Rulers read "King Tudot" or "Queen Mipbel".
- Code: one display-name helper that those readers use.

Epithets earned by deeds are on the Backlog list (§2.15).

### 2.5 Cultures and regions (PROPOSAL T13)
**PROPOSAL T13 (recommended: yes, data only).**
- **Culture labels (`cultures.<species>.name`).** A search of `game/js/plugins` on 2026-09-19 found no plugin that reads them, so nothing on screen changes yet.

  | Species | Today | Proposed |
  |---|---|---|
  | human | Settlers | Hall-folk |
  | elf | Grove-keepers | Fey court |
  | dwarf | Stone-holders | Stone-holders (keep) |
  | gnome | Tinkers | Hoard-keepers (with T5 A) |
  | goblin | Scavengers | Scavengers (keep) |
  | orc | War-bands | Giant-kin |
  | automaton | Foundry-minds | Silent garrison |

- **Region labels (`regions.alignment[].name`).** These show in the look tooltip (`UF_Look.js` line 268).
  - "Cursed" becomes "Waste", after the waste land of the Grail romances.
  - "Blessed" becomes "Hallowed".
  - The savagery names (Tame, Wild, Primeval) stay.
  - The ground and plant names already fit ("Blighted grass", "Blighted tree", "Flowering grass").
  - The ids stay `cursed` and `blessed`.

### 2.6 Creatures (PROPOSALS T14, T15)
All 23 current species fit: deer, boar, aurochs, wolves, foxes, hawks, trolls, the restless dead and the rest. The theme adds creatures from British and French folklore and from the romances.
- **Sizes are given relative to other creatures**, because the world scale is still open (SCALE.md).
- **Each one needs combat levels** from the V64 work, and art.
- **Until its sheet exists, a new species can run on a tinted stand-in sheet.** Duplicate placeholders with tints were approved on 2026-09-18. With a stand-in, adding the species is data only (`wildlife.species`).

**PROPOSAL T14 (recommended): add the first batch now; add the second batch once wrecks and lairs exist.**

| Creature (proposed name) | Source (public domain) | Kind and where it lives | Behaviour hook | Size | Stand-in | Batch |
|---|---|---|---|---|---|---|
| White hart | The hunt of the white stag (Chrétien, *Erec and Enide*) | Rare grazer; broadleaf forest, hallowed regions | Fleeing prey. Killing one is a chronicle event. | a deer | deer sheet, white tint | 1 |
| Black dog | Black dog folklore (the Welsh gwyllgi, the black dogs of East Anglia) | Lone predator at night; moor, heath and waste regions | An omen: people who see it get a thought | a big hound | wolf sheet, black tint | 1 |
| Pale hound | The white, red-eared hounds of the Otherworld (*Pwyll*, the First Branch) | Pack predator; primeval forest | Hunts in packs at night | a wolf | wolf sheet, white tint | 1 |
| Marsh light | The corpse candle (Welsh), the will-o'-the-wisp | A harmless light that drifts over marsh and swamp at night. It cannot be hunted. | Under T1 A it is a surveying machine | a lantern flame | an effect sprite | 1 |
| Giant | The giants of the romances and Welsh tales (the giant of Mont Saint-Michel; the chief giant of *Culhwch and Olwen*) | Lone monster; mountains and hills, wild and primeval | Carries a tree-trunk club; keeps a lair of bones | two to three times a person | troll sheet, tint | 1 |
| Wyvern | Heraldry and the bestiaries | Flying monster; mountains and badlands, primeval | Takes livestock and hunters | a horse's length, with wide wings | needs art (the hawk sheet is too small) | 2 |
| Questing beast | Malory's beast with a serpent's head, a leopard's body, a lion's haunches and a hart's feet, with the noise of hounds in its belly | Rare monster; primeval wild land. It flees and is pursued. | Hunting it is a quest (§2.15) | a horse | needs art | 2 |
| Great boar | The great boar hunted across the land (*Culhwch and Olwen*) | Monster boar; primeval broadleaf forest | Charges; a herd of boar gathers around it | an aurochs | boar sheet, tint | 2 |
| Water horse | The kelpie, the Welsh water horse | Lakes and rivers | Lures a rider and drags them under | a horse | wild horse sheet, tint | 2 |
| Hag | The hags of the Welsh tales | Human-like monster; waste regions | – | a person | needs art | 2 |
| Sentinel | T1: the silent garrison of the glass fortress | Machine monster. It stays at wrecks and vaults and never roams. | Defends its site; drops sky-iron and relic parts | a person to a troll | needs art | with wrecks |
| Dragon | The red and white dragons beneath the tower (Geoffrey of Monmouth) | At most one per world, with a mountain lair and a hoard | A unique beast (needs lair and uniqueness code) | several cells | needs art | later |

Some names are avoided on purpose:
- **Ultima:** "wisp" (Ultima's Wisps), golem (Ultima VII's golems), gargoyle, gazer, headless, reaper, emp, mongbat.
- **D&D:** night hag, owlbear, rust monster, displacer beast and the other D&D creatures (§3.3), and colour-coded dragon families (D&D's chromatic and metallic dragons).
- **DF:** "forgotten beast", "titan", "megabeast", the bronze colossus.
- **Dune:** sandworm.

**PROPOSAL T15 (recommended: keep every current creature name).**
- The options were to rename `bog_horror` to "Afanc" (the Welsh lake monster that Peredur kills) and move it to lakes, and to reframe `sand_stalker` as a machine left in the deserts by the wrecks.
- The recommendation keeps both names, because the new creatures already carry the theme.

### 2.7 Buildings, sites and world features (PROPOSAL T16)
Today's pieces (catalog `objects`) all fit: palisade and stone walls, wooden and stone doors, campfire, straw beds, work stone, furnace, smithy, bowyer's and fletcher's benches, tanning rack, weapon rack, well, farm plot and bridge. Under V31 nothing is built at a New Game; the bands build everything in play (V51).

**PROPOSAL T16 A (recommended): add these pieces in this order, each as catalog objects with art and build rules, when the society work reaches them.**

| Piece | What it is | In the engine | When |
|---|---|---|---|
| Wattle wall and thatch | The round timber-and-wattle hall of the hill-kingdoms, for the humans' first houses | A culture wall piece (`cultures.human.wall`), with plan cells in a ring | with V51 houses |
| Stone keep, tower corner, gatehouse | The palisade camp grows into a keep and then a castle, with V43's gates and guards | Wall pieces and a gate object (a door kind); site-kind names "camp", "hall", "castle" | with V43 walls and gates |
| Chapel (altar and bell) | The room that makes a chapel (in DF, a temple is a room with an altar) | An `altar` object and a room kind | with T21 |
| Abbey | A site of the chapel way: chapel, cloister and fields | A site kind | after chapels |
| Standing stone | The place of the old ways, and where magic is charged (T20 A) | A buildable object and a world feature | with T20 |
| Round council table | A table where leaders sit as equals | Hall furniture (room value) | with furniture |
| Tiltyard, archery butts | Practice grounds where the combat skills train (V63: skills level by doing) | Workplace objects for a `train` job | with V63/V64 |
| Holy well | A well in a hallowed region, visited for healing | A `well` variant | later |
| Relic bench | A workshop built from wreck parts, where wreck-metal is worked | A workshop object (the `at` tag of the top V66 tier) | with the top V66 tiers |
| Mill, mews, kennels, dovecote | Ordinary medieval buildings | – | later |

**PROPOSAL T16 B (recommended: yes): allow world features at generation.** These are terrain, like boulders and ore, and no faction builds them. V31 says "nothing is built" at a New Game, so this needs the user's yes. The recommended set places a few per map, from a new feature pass in UF_WorldGen (code):
- **Wreck,** the centre of the science fiction (T1): a crater with broken hull pieces half-buried and overgrown, crystal growing from the breaks, sky-iron and wreck-metal to salvage (the top V66 tiers), and sentinels (T14). The land around it may be waste (T13).
- **Vault:** a hollow hill, a barrow with a sealed door, holding relics (§2.9) and sentinels.
- **Standing stones and barrows:** the old wild.
- **Glass tower in a lake** (rare): the glass fortress from T1's table.

### 2.8 Materials for the V66 tiers (PROPOSAL T17)
V66 calls for materials in tiers that are reached at rising levels: "our own ores ... not OSRS's". The V66 crafting spec owns the tier numbers and recipes. This section covers only the names and where the themed tiers come from.
- **Common tiers are real metals and stones.** Real words are free to use: copper, tin, bronze, iron, steel, silver, gold, charcoal, coal. The catalog already has iron, copper and gold outcrops, and a bronze row with no tin to make it (COMBAT_CHAINS D1).
- **PROPOSAL T17 A (recommended): two themed top tiers from the fallen stars.**
  - **Sky-iron:** meteoric iron, mined at fallen-star craters and wrecks. It is an ore at a high mining level.
  - **Wreck-metal:** the star-farers' hull metal. It is salvaged from wrecks, never mined or smelted from ore, and worked only at a relic bench.
  - **Glowing crystal** (the catalog's crystal clusters) serves as a material for edges, arrowheads and magic (T20).
- **T17 B: "star-metal"**, the example word in V65's row. It is close to the unapproved "Star-Iron", and a star-metal tier that falls in meteor showers already exists in another game (Conan Exiles, from memory).
- **Never use these:**
  - OSRS material names: runite, rune, mithril, adamant, dragon as a metal, rune essence, pure essence, blurite, barronite, daeyalt, lovakite. "Adamant" is also close to DF's adamantine.
  - "Black" or "white" as metal tiers (OSRS's black and white gear, the White and Black Knights).
  - Any metal the fey make: "elf-silver" reads as mithril.
- **Woods are real trees:** oak, ash, yew, hazel, rowan, holly, birch, pine. The yew bow is historical. Never "magic" logs (OSRS). "Yew" is a tree only, never a place name, because Yew is an Ultima town.
- **A later combat hook for V64:** iron and steel hurt the fey more, from the cold iron of folklore.

### 2.9 Relics (PROPOSAL T18)
- **Relics are found, never made.** No craftsman seized by a mood makes one; that is DF's strange moods, which are banned.
- **They lie in vaults and wrecks** (T16 B), or arrive with visitors.
- **They are generic, never named after the legends.** There is no Grail and no Excalibur; both are also OSRS quest items.

**PROPOSAL T18 (recommended): build the first relic now and the next two later.**

| Relic | Legend motif | What it does (engine hooks) | Under T1 A it is |
|---|---|---|---|
| **1. The sword in the stone** | The sword only the rightful one can draw | An object (a stone holding a sword) at a vault or a wreck. Its "draw" action succeeds only at a given attack level: a V63 requirement, OSRS's "you need level N to wield this". The sword is the best weapon of its tier, and the chronicle records who drew it. | a lock that knows its owner |
| 2. The healing cup | The cup of the Grail romances, and the waste land made whole | Carried to a waste region, it slowly turns the land around it hallowed and heals the sick in its hall. Pilgrims arrive (V19). Changing a region in play needs a per-cell override (code). | a machine that mends land and bodies |
| 3. The speaking head | The head that kept talking | Set in a hall, it gives news of far places through UF_Talk's `news` keyword: unmet factions, wrecks, beasts | a ship's mind |
| Later | The cauldron of rebirth, the ever-full hamper, the mantle that hides, the board that plays itself, the lamp that never goes out, the horn that calls | In order: revive someone newly dead; food every day; stealth; room value; light without fuel; call allies | medical, food, cloaking, game, light and signal machines |

### 2.10 Gear names (PROPOSAL T19)
**PROPOSAL T19 (recommended: yes): high-medieval words for the V64/V66 gear.**
- **Weapons:** arming sword, longsword, falchion, spear, lance, mace, war hammer, axe, dagger, short bow, long bow, sling.
- **Armour and shields:** mail shirt (hauberk), coif, padded coat (gambeson), coat of plates, great helm, kettle hat, kite shield, heater shield, buckler.
- **Faction dress:** a surcoat in the faction's colours.
- **Pattern:** gear is named "<material> <item>", for example "bronze mace" or "sky-iron longsword".
- **Never OSRS's own spellings:** platebody, chainbody, platelegs, plateskirt, full helm, med helm, sq shield, "kiteshield" as one word, 2h sword.
- **Never OSRS's unique items:** whips, godswords, anything "dragon".

### 2.11 How the science fiction looks
This section belongs to T1 and to the art paragraph (T22).
- **Old, weathered, overgrown and half-buried:** moss on hull plates, roots through the seams.
- **Manufactured shapes among hand-made things:** smooth curves, exact edges and repeated panels, with no rivets or planks.
- **Light is rare and pale.** The palette (`art/palette/uf.hex`, checked 2026-09-19) has pale blue-white and sky-blue tones (#E7E7FF, #CECEFF, #B2D7F3, #71AEE7) and no light cool green, so relic light is pale blue-white. No neon.
- **No readable text, screens or symbols on relics.** Nothing looks like a gun, and nothing flies. The burning sword burns with a heated edge; it is not a beam of light (a lightsaber).
- **Automata have shapes of their own** (T7), with a line of pale light where eyes would be.
- **In the sky** (T1 D): a slow light crossing the stars at night, the streak of a falling star, an aurora over waste land.

### 2.12 Magic and faith (PROPOSALS T20, T21)
V63 lists a magic skill, and V64 a magic attack type. What magic is belongs to the theme.
- **PROPOSAL T20 A (recommended): relic-light.**
  - Casting spends charged crystal shards. Shards are gathered from crystal clusters and wrecks, then charged at standing stones.
  - This is the mechanic of OSRS's rune-making with our own names. The words "rune" and "essence" are never used.
  - Spells look like pale light.
  - B: fey craft (song, herbs, glamour; no technology). C: both, as two schools.
- **PROPOSAL T21 A (recommended): two unnamed ways of belief, the chapel and the old stones.**
  - Both get original symbols. No real-world religion's names or symbols (no cross, no saints by name), and nothing from Ultima's virtues, shrines or ankh.
  - Chapels (T16) and standing stones are their places, and the catalog's "pious" ethos already exists.
  - A worship need, as in DF, comes later.
  - B: the Christianity of the legends as written. C: no faith in the game.

### 2.13 Talk, barks and the chronicle
These are data only (`talk.greet`, `talk.bye`, `arrivals.kinds.*.bark`).
- **The register is plain and a little formal, with no proper nouns.** No "thee" and "thou": that speech reads like Ultima.
- **Most current lines already fit:** "Well met, friend of {playerFaction}.", "Safe roads to you.", and the raiders' "Your stores are ours now!" stays.
- **Lines to add with T13:**
  - "Hail. Our hearth is open to {playerFaction}."
  - "Go well, and keep your word."
  - "A light fell in the night, away to the {dir}." (with T1 D)
- **Chronicle lines use the same register**, for example "Cadot of The Valgarde Kingdom drew the sword from the stone." (T18).

### 2.14 Art prompts: the theme paragraph (PROPOSAL T22)
**PROPOSAL T22 (recommended: yes).** Add the paragraph below to every STYLE AND RULES block in `docs/handoffs/GENERATOR_PROMPTS.md`, right after the block's first paragraph ("You are making original game art ..."). The "crosses or other real religious symbols" clause follows T21 A. Under T21 B, drop it.

```text
THEME: the world is Arthurian fantasy with science-fiction elements. Everyday life looks like the high Middle Ages of the old British and French romances of knights, about 1100 to 1300: homespun wool and linen for common folk; mail, padded coats, surcoats in plain heraldic colours, kite and heater shields, great helms and kettle hats for fighters; timber round halls with thatch, palisades, early stone keeps, chapels with a bell, standing stones in the fields. Draw it as real craft, worn and used. Beyond the fields lies the old wild: deep forest, moor and fen, beasts of folklore. Under it all lie the remains of a fallen star-faring age: wrecks half-buried and overgrown, smooth manufactured shapes with exact edges and repeated panels, metal that does not rust, crystal that gives a faint pale blue-white light, silent machines. These must look old and out of place beside the hand-made world. Never: late plate armour, Roman or Viking dress, fantasy spikes, brass gears or steam, neon, screens, text or symbols on relics, guns, beams of light, flying craft, crosses or other real religious symbols, the heraldry of real families or of other games.
```

Each group's prompt also gets one line the next time that group is prompted:
- people wear the high-medieval clothes above;
- buildings follow §2.7;
- monsters follow §2.6;
- relics and wrecks follow §2.11.

The four approved style-lock anchors (the settler, the oak, the palisade, the meadow) already fit, so nothing needs redoing.

### 2.15 Later ideas for the Backlog (PROPOSAL T23)
None of these is a first change. Each is its own feature for a later slice (AGENTS rule 1). **PROPOSAL T23 (recommended: yes)** asks to list them in `docs/STATUS.md` → Backlog:
- **Vows and quests.** A knight (a rank) takes a vow drawn from what the world holds: hunt the white hart, kill the giant of the hills, find the relic in the wreck to the north. The knight leaves and succeeds or dies, and the chronicle records it. Built from the world's state, never scripted (V16, V17).
- **Heraldry.** Each faction gets arms: its `color` from UF_Factions plus a charge. The arms appear on shields, surcoats and banners as tinted layer sheets (V61), and a knight is known by his arms.
- **Epithets.** Names earned by deeds, such as "Cadot the Hunter" or "Ysise of the Red Shield", recorded in the chronicle.
- **Knights errant.** A lone wandering knight among the V19 arrivals, who may challenge a champion.
- **The wild hunt.** On some nights the fey court's huntsmen ride out with their pale hounds.
- **Feasts.** A ruler holds a feast in the hall at midsummer and at midwinter.
- **Unique beasts and falling stars.** The dragon and other unique beasts with lairs, and falling-star events (T1 D) that make new wrecks in play.
- **A devotion skill.** Trained at chapels and stones, if T21 A is chosen. It is OSRS's prayer under our own name.

### 2.16 The game's title (PROPOSAL T24, optional)
The game has no release title yet. STATUS K15 notes that System.json still says "Ultima Fortress - The Living Mountainhall", and "Ultima" is banned in player text.
- **A (recommended): "Under Fallen Stars".** It fits the theme and keeps the working initials UF.
- **B:** "Oath and Engine" or "The Fallen Star Kingdoms".
- **C:** the user names it.

## 3. Rules for theme content

### 3.1 Public-domain sources
These medieval and 19th-century texts are long out of copyright. Quote a translation that is in the public domain, or use our own words.
- Geoffrey of Monmouth, *History of the Kings of Britain* (about 1136)
- Chrétien de Troyes, the romances (about 1170–1190): *Erec and Enide*, *Yvain*, *Lancelot*, *Perceval*
- The Vulgate (Lancelot-Grail) cycle (about 1215–1235), including the Prose Lancelot
- *Sir Gawain and the Green Knight* (late 14th century)
- Thomas Malory, *Le Morte d'Arthur* (1485)
- The Welsh tales:
  - the Four Branches of the Mabinogi, *Culhwch and Olwen*, *Peredur*
  - the poem *Preiddeu Annwfn*
  - the list of thirteen treasures
  - Lady Charlotte Guest's translation (1838–1849)
- Tennyson, *Idylls of the King* (1859–1885)
- British and Breton folklore: black dogs, corpse candles, water horses, hollow hills, cold iron

Never draw on modern works, which are under copyright:
- **Books:** T. H. White, Mary Stewart, Marion Zimmer Bradley, Bernard Cornwell, Stephen Lawhead, Lloyd Alexander's Prydain books.
- **Screen:** Disney's *The Sword in the Stone*, *Excalibur* (1981), Monty Python, the BBC's *Merlin*.
- **Games.**

### 3.2 What we take, and what needs approval (PROPOSAL T25)
**Free to take, as kinds.** Each piece still needs the user's approval like any other proposal.
- **Titles and ranks:** king, queen, lord, lady, knight, squire, page, reeve, steward, castellan, abbot, abbess.
- **Kinds of place:** keep, castle, chapel, abbey, hermitage, holy well, standing stone, barrow, hollow hill, waste land, glass tower.
- **Motifs:** vows, quests, tournaments, the hunt of the white hart, the sword in the stone, the wounded land, the cup that heals, the head that speaks, the beheading challenge, the loathly lady.
- **The folklore creatures of §2.6 and the relic kinds of §2.9.**

**Needs the user's approval, name by name:** any proper name from the legends used as a name in the game.
- **The famous figures as characters:** Arthur, Merlin, Morgan, Guinevere, Lancelot, Gawain, Galahad, Perceval, Tristan, Isolde, Mordred, Kay, Bedivere, Nimue, the Fisher King, the Green Knight, the Lady of the Lake and the rest.
- **Their places:** Camelot, Avalon, Logres, Tintagel, Lyonesse, Broceliande, Caerleon, Annwn and the rest.
- **Their named things:** Excalibur, the Grail, the Round Table as an institution.

**PROPOSAL T25 A (recommended): none of them for now.** They are famous enough to turn a generated world into a retelling. OSRS also uses several of them (Camelot, King Arthur, Merlin, Excalibur, the Grail quest), so in a game with OSRS-like mechanics they would read like OSRS. B: allow some of them by name.

### 3.3 Never
| Source | Never use (in player text, names or looks) |
|---|---|
| Ultima (AGENTS list) | Avatar, Britannia, Guardian, Lord British, Iolo, Dupre, Shamino, Fellowship, moongate |
| Ultima (also) | the virtues and their shrines, the ankh, the Codex; Britain, Trinsic, Yew, Minoc, Moonglow, Jhelom, Skara Brae, Vesper, Serpent's Hold, Empath Abbey, the Lycaeum, Castle British, Sosaria; blackrock; gargoyles, emps, wisps, golems, gazers, headless, reapers, mongbats; the knights of Monitor with their animal totems and knight's test; Exodus (a machine villain); a realm of virtue-towns under one good king; "thee and thou" speech |
| Dwarf Fortress (AGENTS list) | Urist, Armok, strange mood, fey mood. The word "fey" on its own is fine. |
| Dwarf Fortress (also) | artifacts made in moods, adamantine, forgotten beasts, titans, megabeasts, the bronze colossus, Mountainhomes, elves who refuse wood |
| OSRS | runite, rune, rune essence, mithril, adamant, dragon as a metal, blurite, barronite, daeyalt, lovakite; black and white gear tiers; its places (Camelot, Kandarin, Falador, Varrock, Ardougne, Zanaris, Keldagrim, Prifddinas, Lletya, Tirannwn and others); its people (Doric, Thurgo and others); its elf clans (Iorwerth, Cadarn, Crwys, Amlodd, Hefin, Ithell, Meilyr, Trahaearn); its gods (Saradomin, Zamorak, Guthix, Armadyl, Bandos, Zaros, Seren); the White, Black and Temple Knights; crystal elf gear; its item spellings (§2.10) |
| D&D product identity (AGENTS list) | beholder, mind flayer, illithid, displacer beast, githyanki |
| D&D (also, to be safe) | githzerai, umber hulk, yuan-ti, kuo-toa, slaad, modron, warforged, owlbear, rust monster, drow, tarrasque; named gods and wizards; chromatic and metallic dragon families; Dragonlance's tinker gnomes |
| Other works | Tolkien's names and mithril; the Elder Scrolls' Dwemer (dwarves who built machines); Halo's Forerunners and "Precursors" ("Precursor" is also unapproved lore here); Star Trek's Borg "Collective"; Warcraft's "Horde"; Dune's sandworms; lightsabers |
| VISION → Proposed but not approved (until the user approves them) | Kaldurath, Karadrim, Valen, Sylvathi, Vorgari, Kitterkin, Morvath, Precursor Automata, Star-Iron, aetheric power cells, Dual Axioms, Precursor fabricators, Deep-Frost |

### 3.4 Real religion and real peoples
- **No real-world religion's names or symbols** unless T21 B is chosen.
- **No species stands for a real people.** The ogres are not Saxons, and the goblins are no one. The human names borrow the sounds of Welsh and Old French, not stereotypes.

### 3.5 Every name stays a proposal (AGENTS rule 7)
Every name in this file is a proposal until the user approves it: creatures, relics, titles, group words, culture labels, syllable tables and the game title. Any placeholder that has to go into the game before approval starts with `TEST_`.

### 3.6 How the rules are checked
- **Names:** the collision run of §2.3 (scratch, 2026-09-19). With T10, the same lists go into UF_History's `no_banned_words` and `tools/check_catalog.js`. The run can fail: it found "Zanaris" and "Doric" in today's tables, and "Vivian" in a first draft.
- **Art:** delivered art is checked against ART_STANDARD §8 and the "Never" list of the T22 paragraph.

## 4. First changes the user could approve at once
All of these are catalog data or docs, except F10, which is a small change to Claude Code's code and tools.
- **Editor safety:** catalog edits need the RMMZ editor closed (AGENTS → RMMZ editor safety), and the user reopens the project afterwards.
- **The rules are the same as for any change:** a claim in STATUS, the checks run on a snapshot copy, and one commit per task.

| # | Change | Catalog key or file | Code? | Art? | Where the change shows |
|---|---|---|---|---|---|
| F1 | Human and shared name syllables (T9) | `start.names` | No. UF_Colonists already reads this key, so the player's colonists change too. | no | colonists' and founders' names |
| F2 | Name tables for the other six species (T9) | `people.<species>.names` (adds `names` only) | No for the other factions, because UF_History reads these tables. The player's colonists need UF_Colonists to read `people[species].names` (one small change). | no | other factions' founders |
| F3 | Place and faction stem syllables (T9) | `factions.names.start`, `factions.names.end` | no | no | faction and camp names, the ledger (F), the chronicle (H) |
| F4 | New group words, dropping "Collective" and "Horde" (T8 A) | `factions.species[].groups` | no | no | faction names |
| F5 | A themed, gender-neutral list of leader titles (T11 B) | `factions.founders.titles`; also `history.titles`, used only by the generator that is switched off | no | no | the chronicle's "led by …" |
| F6 | The display name "Ogres", if T6 A is chosen | `factions.species[]` entry `orc`: `name` | no | no | the chronicle's founding line, the ledger |
| F7 | Culture labels (T13) | `cultures.<species>.name` | no | no | nothing on screen today |
| F8 | The region labels Waste and Hallowed (T13) | `regions.alignment[].name` | no | no | the look tooltip |
| F9 | The theme paragraph in the art prompts (T22) | `docs/handoffs/GENERATOR_PROMPTS.md` | no | guides all new art | the next deliveries |
| F10 | Banned-name lists and re-rolls (T10) | UF_History's check and namers, UF_Colonists `nameFor`, the UF_Factions stem, `tools/check_catalog.js` | yes, small (Claude Code's files) | no | a check fails on a banned name |

Checks that F1–F6 touch:
- `history.no_banned_words`.
- `history.founders`, which requires names.
- `history.no_years`. Its founding-line pattern "<Word> <species> of <faction> settled by <camp>." uses the species' display name in lower case, and "ogres" still matches it.
- `factions.names_unique`.

## 5. Decisions needed (recommended option first)
1. **T1:** where the fantasy and the science fiction meet. A misunderstood wonders, plus D the sky is still active / B open ruins of an advanced past / C the fey are the star-farers.
2. **T2:** science-fiction words in player text. A in-world words only / B modern words allowed in look text.
3. **T3:** keep the humans (one culture, Brythonic and Old French names), the dwarves and the goblins in their theme roles / split the humans into two cultures (code).
4. **T4:** the elves as the fey, keeping the name "Elves" / rename them "Fair Folk" / plain forest folk, with the fey added later.
5. **T5:** the gnomes as hoard-keepers of the hills / keep them as relic tinkers / fold them into the goblins.
6. **T6:** show the orcs as "Ogres" (id unchanged) / keep "Orcs" / "Giant-kin".
7. **T7:** keep the automata, unplayable, with their own look, growing later by waking machines rather than by births / rename them "the Brazen" / machines only as monsters at wrecks.
8. **T8:** themed group words in today's form now, name templates later / templates now.
9. **T9:** the syllable tables for people of every species and for places. Yes / no.
10. **T10:** add the OSRS, Ultima-place and famous-figure lists to the banned-name checks and re-roll banned names. Yes / no.
11. **T11:** neutral leader titles now (B), then a title ladder per species and gender as the societies grow (A) / neutral titles only.
12. **T12:** "Sir" / "Dame" and "King" / "Queen" before names. Yes / no.
13. **T13:** the culture labels, and the region labels Waste and Hallowed. Yes / no.
14. **T14:** a first creature batch (white hart, black dog, pale hound, marsh light, giant), and a second batch after wrecks and lairs exist. Yes / change the batch.
15. **T15:** keep the current creature names / bog horror becomes "Afanc" and the sand stalker becomes a machine.
16. **T16:** A the themed buildings in the order of §2.7; B allow world features at generation (wrecks, vaults, standing stones, barrows, a rare glass tower) despite V31's "nothing is built". Recommended: yes to both.
17. **T17:** top tiers named sky-iron and wreck-metal / "star-metal".
18. **T18:** the first relic is the sword in the stone with a level requirement; the healing cup and the speaking head come later. Yes / choose another.
19. **T19:** high-medieval gear names, with no OSRS spellings. Yes / no.
20. **T20:** magic as relic-light from charged crystal / fey craft / both.
21. **T21:** faith as two unnamed ways with original symbols / the legends' Christianity / none.
22. **T22:** add the theme paragraph to every art prompt. Yes / no.
23. **T23:** put vows and quests, heraldry, epithets, knights errant, the wild hunt, feasts, unique beasts, falling stars and a devotion skill on the STATUS Backlog. Yes / no.
24. **T24 (optional):** the title "Under Fallen Stars" / "Oath and Engine" / the user names it.
25. **T25:** no famous Arthurian figures, places or named things as names for now / allow some by name.
