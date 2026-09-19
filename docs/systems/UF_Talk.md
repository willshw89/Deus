# UF_Talk
Conversations with anyone, laid out like the old portrait-and-keyword conversations (VISION V25, V62 as revised 2026-09-19: "I dont like the current talk system. I want talk to be modeled after U7"). Right-click a person (your colonist or a stranger, never an animal) and choose **Talk to <name>**. The world pauses and the talk is written straight onto the screen over the map. There is no dialog window:
- **Top left:** the other person's portrait (96×96 frame). Beside it, what they say, **a page at a time** (4 lines), over a faint darkening of the map behind the text only. A small "more" mark shows while pages remain; a click, Enter or Space turns the page.
- **Lower left:** your portrait (the colonist selected in the Overseer, else your band's leader, else your nearest grown person; a shield in your colours when nobody can). Beside it, your **keywords** written as words you can click: `name`, `job`, `bye` first, then every topic the other person has mentioned (their partner, leader, children, a place, a faction, the news, a need, their family, home, mood). The pointed-at keyword is highlighted. Asked keywords are dimmed but can still be clicked.
- **Middle left:** a colonist of yours standing within 4 cells may **chime in** with their own portrait and line. They always do when the answer concerns them. Otherwise it happens now and then, seeded.
- `bye` ends the talk: the farewell floats over the person's head and the world runs again. **Hostile people refuse:** their refusal floats over their head (through `UF.Speech.say` when UF_Speech is loaded) and no talk opens. Babies babble over their heads.

Nothing is scripted. Every line is a catalog template (`talk.lines`, then the older `talk` sections) filled with names and facts read from the simulation.

**History (all 2026-09-19):**
- Morning: built as one bottom window with a portrait, the line and a grid of keyword buttons.
- About 10:40: another run reworked it into three windows at the bottom (review finding M1). That rework added whoever speaks for you (`voiceOf`), content-based companion lines (`talk.chime`) and the `more` word (`talk.words.more`).
- About 11:00: rebuilt on the U7 model in screen space: sprites over the map, no windows. It keeps that run's voice rule, its companion lines and its `more` word, adds seeded companion remarks (`talk.lines.chime`), `[topic]` words that grow the keyword list, the `need` topic, trade and title, and over-head refusals and farewells. The suite was rewritten (13 checks).

**Status (2026-09-19):**
- Suite `talk` on request, 13 checks. It passed 13/13 on a snapshot of `game/` with this file and `talk.lines`. It passed 12/12 before the `voice` check was added: on a snapshot with UF_Speech registered (the refusal went through `UF.Speech.say`), and on a fresh snapshot of `game/` after the first copy-back.
- A run with `TestProvoke` = `all` failed 13/13, each check for its own reason (see Checks).
- With UF_Talk: `smoke` 13/13 and `overseer` 6/6. `look` was 17/21, with the same 4 failures in a control run of an unmodified snapshot (`cell_lines`, `asset_line_names_status`, `hunt_and_haul_options`, `saved`).
- Registered in the real `game/js/plugins.js` (status true), so Playtest loads it.
- Not checked: the editor's Playtest (F5) and its console (F8).

**File:** `game/js/plugins/UF_Talk.js` · **Load order:** after `UF_World` and `UF_Interact` (required); `UF_Factions`, `UF_History`, `UF_Jobs`, `UF_Colonists`, `UF_Stance`, `UF_TimeSpeed`, `UF_Camera`, `UF_Look`, `UF_Sheet`, `UF_Speech` are optional and read at runtime. Before `UF_Test`. **Catalog:** `talk` (top-level key of `data/UF_WorldCatalog.json`).

## Layout (screen pixels, 816 × 624)
| Part | Where | What |
|---|---|---|
| The person's portrait | (16, 16), 96×96 | Face-sheet cell scaled from 144 to 92 inside a 2 px frame (`#b89a5e`), or the code-drawn `UF_GenFace` |
| Their words | x 126, top at 16; column up to 384 px wide (it ends left of the clock and speed controls at the top right) | Serif font (`Georgia, 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', serif`), 20 px, 25 px lines, 4 lines a page, `#f4ecd8` with a dark outline. Behind the page only, a darkening sized to the text: 4 nested rectangles 2 px apart of `rgba(8,6,4,0.13)`, about 43% dark in the middle and 13% at the edge, with no border line. The "more" mark (the catalog word `talk.words.more`, italic, and a small down-pointing triangle, gold, blinking) sits under the bottom right of a page with more after it. |
| A companion | portrait at (16, 142), words beside it at x 126 | Appears with the last page of the answer it follows. Hidden again on the next question. |
| Your portrait | (16, 512), 96×96; moves up when the keywords need more than 3 rows | The voice's face, or `UF_GenEmblem` |
| Your keywords | beside your portrait from x 122, in rows of 28 px, 14 px apart, bottom-anchored, up to 6 rows | 20 px serif. Each word is one cached white bitmap, tinted: `#eee4cc` normal, `#b9b09c` at 165 opacity when asked, `#ffd45e` when pointed at or selected. All at 90 opacity while the answer still has pages. A darkening behind the block, like the words. |

While a talk is open:
- The **window layer is hidden** (the Overseer's colonist card and anything else there step aside) and UF_Sheet's panel is closed.
- The map takes no mouse input: `UF.Interact.handleMouse` returns `true`, which also skips the Overseer's select, move, deselect and camera panning.
- `UF.Look.isOverUI()` returns `true`, so no map tooltip shows and UF_Sheet opens nothing.
- Everything is sprites in one container added on top of the map scene (one per scene, reused for every talk).

## Keys and mouse
| Input | While the answer has pages left | On its last page |
|---|---|---|
| Left click (anywhere) | next page | on a keyword: ask it |
| Enter / Z / Space | next page | ask the selected keyword |
| Arrows / WASD | nothing | left/right: previous/next keyword; up/down: the nearest keyword in the row above/below |
| Right-click / Esc / X | jump to the last page | `bye` |
| Mouse move | nothing | the keyword under the pointer becomes the selected one |

- Input waits 2 frames (`INPUT_DELAY`) after the talk opens and after each answer, so the click that chose Talk or asked a keyword does nothing more.
- **Space:** a capture-phase `keydown` listener on `window` takes Space while a talk is open and stops it there. It never reaches UF_TimeSpeed's pause toggle (a `document` listener) or RMMZ's `Input`, and UF_Talk handles it as OK.
- Arrows and WASD are mapped to camera panning (UF_ColonyOverseer); the talk reads the camera names too.
- The context menu entry: right-click on a person → "Talk to <name>".

## API (`UF.Talk`)
| Member | Description |
|---|---|
| `open(unitOrId)` | Opens a talk with a person on the map on screen and returns `current()`. It closes an open talk first, picks your voice (`voiceOf`), shows the greeting (paged, maybe with a companion's line), hides the window layer and pauses the world (`UF.Time.pause()`) when it was running. Returns `null` when the unit isn't talkable or this isn't a map scene. A **hostile** person or a **baby** also gets `null`: their line (a `talk.lines.refuse` / `baby` template) floats over their head through `sayOverHead`, `lastRefusal()` records it, and `talk:refused(unit, mode, text)` is emitted. Otherwise emits `talk:opened(unit, mode)`. |
| `ask(keywordIdOrLabel)` | Asks a keyword of the open talk: an id (`"name"`, `"need:hunger"`, `"person:17"`, `"faction:f2"`, `"site:4"`) or its label, case-insensitive. Returns the answer, or `null` (nothing open, unknown keyword). New keywords from the answer, and from a companion's line, are appended and flagged `isNew`. The answer is paged, a companion may chime in (`chimeFor`), and `talk:asked(unit, keywordId, text)` is emitted. `bye` returns the farewell, closes the talk at once and floats the farewell over the person's head. |
| `next()` / `skip()` / `pagesLeft()` | Next page / jump to the last page (`false` when on the last) / pages still to come |
| `learn(id)` | Adds a keyword to the open talk as if it had been mentioned (`family`, `home`, `mood`, `others`, `news`, `need:<need>`, `person:<id>`, `faction:<id>`). `false` if unknown or already there. |
| `close()` / `closeNow()` | Say `bye` / close without a farewell. Either one restores the window layer, eases your colonist's social need after at least one question (`easeSocial`), resumes the world only if this talk paused it, and emits `talk:closed(unit)`. |
| `isOpen()` / `current()` | Whether a talk is open on this map scene / a copy: `{ unitId, name, mode, stance, playerId, voice: { unitId, name, from }, text, pages: [[line]], page, phase: "reading" or "choosing", more, chime: { unitId, name, text, variants, why, shown } or null, pausedByTalk, asked: { id: n }, sel, keywords: [{ id, label, topic, ref, asked, isNew }] }` |
| `keywords()` / `line()` / `page()` / `screen()` / `layout()` | Labels / the whole answer / `{ index, count, lines, more }` / the screen object (sprites, bitmaps) / where everything is: `{ other, comp: { face, faceInfo, words, drawn: { lines, w, h, more }, more }, player: { face, faceInfo, unitId, keywords: [{ id, label, x, y, w, h, visible }], back } }` in screen pixels |
| `voiceOf(unitOrId)` | Whoever speaks for you in a talk with this person (there is no protagonist, V4): `{ unitId, name, from }`. Tried in this order: `selected` (the colonist selected in the Overseer), `ruler` (your faction's highest rank ≥ 1, the band leader), `nearest` (your nearest adult or elder in the area). Never the person spoken to, never a baby. `null` when nobody can speak; your portrait is then the emblem. |
| `companionsNear(unitOrId, voiceId?)` / `companionsOf(...)` | Your colonists within `talk.lines.chime.range` (4) cells (Chebyshev, event cells on screen) of the person, nearest first. Never the person, your voice, babies or children. Units / ids. |
| `chimeFor(unitOrId, keywordId, n, lineAdds, voiceId?)` | Pure and seeded: what a companion says after the person answered that keyword the n-th time (`"greet"` for the greeting), or `null`: `{ unitId, name, variants, text, adds, why }`. First the nearest companion the answer concerns (`chimeAbout`, `why` = "about them"). Otherwise, with chance `talk.lines.chime.chance` (30%) from `hash32(seed, personId, 0xc41e, strHash(keywordId), n)`, a remark (`chimeRemark`, `why` = "remark") by the companion that `hash32(…, 1)` picks. Never on `bye`, never in a hostile or baby talk. |
| `chimeAbout(c, u, key, n, lineAdds)` / `chimeRemark(c, u, key, n)` | The two kinds of companion line, from `talk.chime` and `talk.lines.chime` (see Companions) |
| `lineFor(unitOrId, keywordId, n = 0, label?)` | Pure: `{ text, adds: [keyword], key }`, the line a unit says for a keyword the n-th time. The template choice is `hash32(seed, unitId, 0x7a1c, strHash(section.key), n)`, so the same question gets the same answer until it is asked again. |
| `initialKeywords()` | `name`, `job`, `bye` |
| `facts(unitOrId)` | `{ id, name, mode, stage, faction, doing, trade, title, partner, children, leader, superior, home, knows, news, need }` |
| `tradeOf(unit)` / `titleOf(unit)` | "a woodcutter" from the best skill in `data.skills` (a number or `{ level }` per skill; none when no skill stands out) and `talk.lines.trades` / the rank title: `data.title`, else `talk.lines.titles.ruler` or `.leader` by gender (rank 2 / rank 1, V52) |
| `isTalkable` / `isOwn` / `stageOf` / `stanceOf` / `modeOf` / `portraitOf` | As before: `talk.kinds` and alive / your faction / `baby` (age < 2), else `data.stage`, else `UF.History.stageOf(age)` / `own`, `friendly`, `wary`, `hostile` (UF_Stance, else the factions' tier) / `baby` first, else the stance / the portrait source (see Portraits) |
| `sayOverHead(unitOrId, text, frames = 180)` / `lastOverHead()` / `overHead()` / `lastRefusal()` | A line over a unit's head: `UF.Speech.say(unitId, text, { frames, kind: "remark" })` when it returns line ids, else this plugin's fallback line. Returns `{ via: "UF.Speech" or "fallback", unitId, text, ids or sprite }` / the last one / the fallback lines on screen / the last refusal `{ unitId, mode, text, via }` |
| `easeSocial(unit)` / `lastSocial()` | `UF.Colonists.satisfyNeed(unit, "social", 10)` **when that API exists**. It doesn't yet, so `lastSocial()` says `applied: false`. |
| `optionFor(x, y)` / `withTalk(options, x, y)` | The context-menu entry for a cell / the options with Talk inserted before the unit's own entries (a cell's top-level list only) |
| `tick()` / `stats()` / `resetStats()` / `bitmapsMade()` | Per frame (from `Scene_Map.update`): the over-head fallback lines, then the open talk's input / `{ frames, ms }` of `tick` / every Bitmap this plugin made (the perf check: none per frame) |
| `templates()` / `section(name)` | The catalog's `talk` / a section, `talk.lines.<name>` first, then `talk.<name>` |
| `FACE` 96, `PAGE_LINES` 4, `INPUT_DELAY` 2, `OH_Z` 900000, `OH_FRAMES` 180, `SOCIAL_RELIEF` 10, `BANNED` | Constants |

### What the topics read
| Keyword | Reads | Adds keywords for |
|---|---|---|
| greeting | the mood band of `data.mood` (your own) or the stance (strangers) | the player's faction; `[news]`, `[mood]` words |
| `name` | `unit.name`, the title (V52), the faction, `data.rank`, the stage; wary strangers answer grudgingly (`wary_*` variants); adults with a partner or children add a `[family]` sentence | the faction, `family` |
| `job` | `UF.Jobs.describe(UF.Jobs.of(id))`, else `data.intent.text`, else idle; the trade (`tradeOf`); rank; `data.superior`; then a `[home]` sentence when there is a home, a `[need]` sentence when a need is ≥ `talk.needAt` (60), else (your own) a `[mood]` hint | the superior, a person the job names, `home`, `need:<need>`, `mood` |
| `family` | `data.partner`, else `data.pregnancy.fatherId`, else a child's other parent; children (`motherId`/`fatherId`, `data.children`); `data.motherId`/`fatherId` | partner, each child, mother, father |
| `home` | `UF.History.siteById(data.site)`; your own: `UF.Colonists.site()`; else `data.home`; distance and direction | the site |
| `mood` | the mood band, a `[need]` sentence, `data.thoughts[0].text` | `need:<need>` |
| `need:<need>` | `talk.lines.needTopic.<need>` (hunger, thirst, sleep, social, nature), else `talk.needs.<need>` | — |
| `others` | your own: factions met; strangers: factions with \|relation\| ≥ 15 and yours; at most 3 | each faction |
| `news` | the newest `UF.History.events({ faction })` (at the speaker's site first), else the newest event at a site within 40 cells | the event's factions and site when named |
| `faction:<id>` | your own faction: species, member count, the ruler, and an `[others]` sentence when they know other factions; another: `UF.Factions.tierBetween(own, it)` | the leader, `others` |
| `person:<id>` | who they are to the speaker and what they are doing now | a person their job names |
| `site:<id>` | kind, faction, distance and direction | — |

Labels come from `talk.keywords` (topic words), `talk.lines.needWords` (needs: hunger, thirst, sleep, company, the wild), names (people, sites) and faction names without a leading "The".

## Companions
- **About them** (`talk.chime`, from the review run): the nearest companion the answer concerns speaks, using one of these variants:
  - `self`: the topic is them.
  - `named`: the answer names them.
  - `partner`, `child`, `mother`, `father`: the topic is that relative of theirs.
  - `factionGood`, `factionBad`: a faction theirs is allied or friendly with, or hostile to or at war with.
- **Remarks** (`talk.lines.chime`): otherwise, now and then (30%, seeded), one of them remarks on the topic. Each section is tried in order and the first with a usable template wins: `name`, `job`, `family`, `home`, `mood` (also for needs), `others`, `news`, `faction_own`, `faction_<tier>`, `person`. If none fits, the person's stance (`own`, `friendly`, `wary`) is tried, then `any`.
- Slots in both sets: `{name}` is the companion, `{speaker}` is the person spoken to, plus `{person}` and `{faction}`. A companion's line adds its own keywords too.
- The review run's `greetFriendly`, `greetWary` and `news` lists in `talk.chime` are kept and still readable, but this version doesn't use them. Greetings and news get remarks instead.

## Over-head lines (refusals, farewells, babble)
- With UF_Speech loaded, the line goes through `UF.Speech.say(unitId, text, { frames: 180, kind: "remark" })`.
- Without it, a small fallback: plain text in the serif font, 18 px, with an outline and no box. Its sprites sit in the tilemap at z 900000 (above characters, below the fog at 1e6; WORLD_ARCHITECTURE §4).
  - It follows the unit's event and is scaled by 1/zoom, so it stays screen-size at every zoom level (UF_Camera).
  - It shows 2 lines at most, lasts 180 frames and fades over the last 30.
  - A pool of 4 sprites per spriteset. Each sprite's bitmap is made once and redrawn only when a line is said.
- UF_Speech's file appeared in `game/js/plugins/` at 10:45 on 2026-09-19. It is not yet in the real `plugins.js`, so Playtest uses the fallback until UF_Speech is registered.

## State it saves
None. A conversation is view state (not saved; a loaded game has no talk open). Everything it says is read from `UF.World.state` and `unit.data` when asked.

## Events
- Emits `talk:opened(unit, mode)`, `talk:asked(unit, keywordId, text)`, `talk:chimed(companion, unit, text)`, `talk:refused(unit, mode, text)` and `talk:closed(unit|null)`.
- Listens to nothing.
- Reads `window.$colonyManager.selectedColonist` (UF_ColonyOverseer) for your voice.

## Catalog `talk`
- **The older keys**, unchanged and still read as fallbacks: `about`, `kinds`, `optionLabel`, `keywords`, `stanceLabels`, `stages`, `moodBands`, `needAt`, `directions`, `words` (incl. `more`), `greet`, `refuse`, `baby`, `name`, `job`, `family`, `home`, `site`, `mood`, `needs`, `others`, `news`, `faction`, `person`, `bye`, `unknown`, `chime` (the review run's), `portraits`.
- **`talk.lines`**, added 2026-09-19 by a layout-preserving script. The script re-reads the catalog right before writing and asserts that every other top-level key and every other `talk` key is unchanged, and that the bytes outside the inserted block are identical.
  - Wording follows V65 in plain generic terms ("Well met", "Good morrow", "Fare you well"), with no named lore.
  - Settings: `about`, `titles` (`ruler`: lord / lady, `leader`: leader), `trades` (skill → trade noun), `needWords`.
  - Template lists that override the old ones: `greet`, `refuse`, `baby`, `name` (+ `wary_ruler`, `wary_leader`, `wary_default`, `family`), `job` (+ `trade`, `noTrade`, `home`, `need`, `moodHint`), `family`, `home`, `mood` (+ `need`), `needTopic`, `others`, `news`, `faction` (+ `othersHint`), `bye`, and `chime` (`about`, `chance` 30, `range` 4 and the remark lists).
- **Markup:**
  - `{slot}`: a name or fact. A slot that names a person, faction or place adds that keyword.
  - `[topic]` or `[words|topic]`: the label or the words are written into the line and the topic joins the keyword list. Topics are `family`, `home`, `mood`, `others`, `news`, and `need` (the speaker's most pressing need).
  - A template is skipped when the speaker lacks one of its slots or topics.
  - A slot that opens a sentence is capitalised.

## Portraits
- The source is tried in this order:
  1. `unit.data.face` (when the file exists).
  2. `catalog.faces[species][gender]`: where AR-700 plugs in, when it exists.
  3. `catalog.sheet.faces[species]`: UF_Sheet's rule (`<stage>_<gender>`, `<gender>`, `any`; unit id mod the list), so the talk shows the same face as the selection panel.
  4. `talk.portraits[species][gender][stage]`.
  5. Otherwise a code-drawn silhouette.
- Every face file is checked with `fs.existsSync` before `ImageManager.loadFace`. A sheet still loading draws the silhouette first and the face when it arrives.
- The silhouette (`UF_GenFace`) is a head-and-shoulders bust with no features: species tint on the skin, your faction's colour on the shoulders, hair by gender, grey for elders, smaller for children.
- `UF_GenEmblem` is a shield in your faction's colour.

## Assets used
| Asset | What for | Status |
|---|---|---|
| `img/faces/People1`–`People4`, `Nature`, `Evil` (the cells in `catalog.sheet.faces` and `talk.portraits`) | Portraits of people by species and gender | stock RMMZ placeholders until **AR-700** (face sets in the U7 portrait style, 96×96, REQUESTED). Anime-style, one or a few per species and gender, so two people can share a face (seen: a dwarf woman and her companion). |
| `UF_GenFace` | Every species without a face entry (goblins, orcs, …), and any face that is missing | generated (code-drawn placeholder) |
| `UF_GenEmblem` | Your portrait when nobody of yours can speak | generated (code-drawn); no request |
| Fonts: Georgia (or Palatino Linotype, Book Antiqua, Times New Roman, serif) | The words, keywords and fallback over-head lines | system fonts on Windows, not shipped; the generic `serif` elsewhere |
| `$U7_Hare`, `people.<species>.images[0]` | The suite's test hare and test strangers | U7 stand-ins, already listed |
- **No window skin.** The talk draws no windows.
- **AR-700 needs no code change.** Fill `catalog.faces[species][gender]` (a list of `"Sheet:index"`, `[sheet, index]`, `{ sheet, index }` or `{ sheet, indices }`, or per stage `{ child, adult, elder }`) or `catalog.sheet.faces`, or set `unit.data.face`.

## Efficiency (V50)
- Nothing is drawn per frame.
- A page is drawn once, when it is shown. A keyword word is drawn once per label and cached, 64 per screen, least recently used dropped.
- Portraits are drawn once per talk, and again only when a face sheet finishes loading.
- The screen's bitmaps are made once per map scene.
- Per frame with a talk open, `tick` reads the input, hit-tests up to about 40 keyword rectangles when the pointer moved, and sets a tint or opacity when the selection changes.
- Measured 2026-09-19 (`performance.now` around `tick`, pointer moving over the keywords every frame):
  - 0.02–0.04 ms per frame over 90 frames.
  - 0 Bitmaps made in those frames.
  - 0.03 ms per generated line.

## Checks (suite `talk`, on request: `node tools/run_tests.js talk --game <snapshot>`)
| Check | What would make it FAIL |
|---|---|
| `option_listed` | `UF.Interact.optionsFor` on a colonist's or a test stranger's cell has no `talk` entry for that unit; the test hare's cell has one, or has no `hunt`; the real menu on the colonist's cell has no row starting "Talk" |
| `layout` | Choosing Talk in the real menu (world running) doesn't open the talk; the other portrait isn't at x, y ≤ 40, 96×96, with > 400 opaque pixels in its middle; the words aren't beside it (right of it, overlapping its rows) or have < 150 inked pixels; the darkening's middle alpha isn't 40–200, any edge pixel is brighter than 40 or as opaque as the middle (a border); your portrait isn't at x ≤ 40 in the lower half below the other one, drawn; the keywords aren't right of it, or the first three aren't `name`, `job`, `bye`, or the first has < 30 inked pixels; the screen is a Window or holds one, a window other than the closing context menu joined the window layer, or the layer is visible; UF_Look's tooltip shows |
| `pause_and_resume` | Opened while running: not paused by the talk, `UF.Time.ticks()` moves in 20 frames, a real Space `keydown` doesn't ask the selected keyword or unpauses; after `bye`: not running, or < 10 ticks in 30 frames; opened while paused: paused by the talk, or not paused after `bye` |
| `name_job_bye` | The first three keywords aren't `name`, `job`, `bye`; the `name` answer lacks the name; the `job` answer lacks `UF.Jobs.describe` of the job (or the intent, or an idle template) or the trade (`a woodcutter`, from a skill the test gives); a ranked person's `name` lacks their title; after `bye` the talk is open, the farewell isn't a `bye.friendly` template, or it isn't over the stranger's head |
| `voice` | With another colonist selected in the Overseer, the talk's voice isn't that colonist (`from: selected`), or your portrait isn't drawn for them |
| `paging` | The colonist's `mood` answer, with a long test thought, is < 2 pages; page 1 isn't drawn exactly, has no "more" mark, the keywords aren't faint or the phase isn't `reading`; a real click (`TouchInput._onTrigger` then `_onRelease`) doesn't draw page 2 exactly; the pages together don't give back every word |
| `keywords_grow` | The faction keyword was there before `name` or isn't added after; `family` isn't added after `name`; the partner's keyword was there before `family`, isn't added (flagged new), isn't drawn, or the answer lacks the partner's name |
| `companion_chimes_in` | `TEST_companion` (one of yours, placed ≤ 4 cells away) isn't in `companionsNear`; a listed companion is out of range, your voice or the person; one of yours farther away is listed; any of up to 30 questions chimes differently from the pure `chimeFor` prediction; no chime in 30 questions; the speaker isn't a listed companion; the companion's portrait isn't drawn between the other and yours, or its words aren't the chime's text; the text isn't from `talk.chime` or `talk.lines.chime` |
| `hostile_refuses_over_head` | A test stranger of a faction at −80: Talk not offered; `open` returns a talk or a talk is open; the world stopped; the refusal isn't a `refuse` template with mode `hostile`; the over-head line isn't that text for that unit; fallback: the sprite isn't in the tilemap, visible, at z 900000, above the unit and inked; UF_Speech: `UF.Speech.lines(unit)` isn't that text |
| `lines_well_formed` | < 200 generated lines (every topic, need and added keyword of every talkable unit in the area and the test people, 4 variants, and companion remarks and lines about them), or any is empty, has an unfilled `{slot}` or `[topic]`, or a sentence starting in lower case |
| `no_banned_words` | < 50 template strings or < 200 generated lines, or any contains a banned word (the AGENTS.md list) |
| `perf` | `tick` averages > 0.2 ms per frame over 90 frames with a talk open and the pointer moving over the keywords, any Bitmap is made in those frames, or a line takes > 2 ms on average |
| `no_errors` | Any uncaught error recorded by the harness during the suite |

**Screenshots:**
- `talk.stranger.png`: a friendly stranger after `job`, with the portraits, the words and the keyword list.
- `talk.paging.png`: page 1 of the long mood answer, with the "more" mark and faint keywords.
- `talk.companion.png`: a companion's portrait and line under the person's.
- `talk.refuse.png`: the hostile stranger's refusal over their head.

**Provocation:** the plugin parameter `TestProvoke` breaks the behaviour each check guards. It isn't declared in the header, is honoured only in `--uf-test` runs, and is set only in a snapshot's `plugins.js`: `all`, or a comma list of check names. What it does per check:
- `option_listed`: Talk offered on creatures instead of people.
- `layout`: the other portrait moved to the bottom right, your portrait to the top, and a light border drawn around the darkenings.
- `pause_and_resume`: no pause, and Space not taken.
- `name_job_bye`: "someone" and "working", and `bye` first.
- `voice`: the selection ignored.
- `paging`: one page only.
- `keywords_grow`: no keywords added and the partner unreadable.
- `companion_chimes_in`: no chime.
- `hostile_refuses_over_head`: hostile treated as wary.
- `lines_well_formed` and `no_banned_words`: a banned word and an unfilled slot appended to every line.
- `perf`: a 2 ms busy wait and a Bitmap every frame.
- `no_errors`: an error entry pushed into the harness's list. A real uncaught error stops RMMZ, so the run could never print the FAIL.

The 2026-09-19 run with `all` gave 0 passed and 13 failed, each for its own reason. Some of its lines:
- `FAIL talk.layout - other portrait at (704,512) … darkening: middle alpha 109, edge alpha max 255, edge brightness max 232 (a border would be bright); …`
- `FAIL talk.voice - Braar (#3) selected: voice #2 Peria (from ruler), …`
- `FAIL talk.paging - mood answer 333 chars in 1 page(s) …, more mark false, …`
- `FAIL talk.companion_chimes_in - … no chime in 30 questions; …`
- `FAIL talk.hostile_refuses_over_head - … open returned a talk, talk open true, …`
- `FAIL talk.perf - tick 2.1927 ms per frame … 90 Bitmap(s) made in those frames; …`

The tests set up what the world lacks and restore it afterwards:
- A partner, when the colonist has none.
- A rank 2, when the faction has no ranked unit.
- Two relations and the `met` flags.
- A long thought.
- The Overseer's selection.
- The test units (`TEST_talker`, `TEST_grump`, `TEST_hare`, `TEST_companion`), which are removed.

## Replaced core methods
None; aliases only:
- `Scene_Map.prototype.update` (the tick), `Scene_Map.prototype.terminate` (closes a talk with its scene) and `Scene_Boot.prototype.start` (the hooks and the checks).
- `UF.Interact.MenuWindow.prototype.initialize` / `setOptions`.

Runtime wraps of other plugins' public API: `UF.Interact.optionsFor`, `UF.Interact.handleMouse` and `UF.Look.isOverUI`. It also adds one capture-phase `keydown` listener on `window`, for Space during a talk.

## Known limits
- **Social need:** not eased. UF_Colonists has no public API for needs (`easeSocial` reports `applied: false`). It needs `UF.Colonists.satisfyNeed(unit, need, amount)`.
- **Hotkeys:** the map hotkeys (F ledger, H chronicle, K test spawn, `[` / `]` speed) still act while a talk is open.
- **Placeholder portraits:** often one per species and gender, so two people can look the same. Humans get anime-style stock faces, goblins and orcs the silhouette. AR-700 replaces them.
- **Fallback over-head lines:** they use Georgia (the talk's font), while UF_Speech uses the game font. Once UF_Speech is registered, the refusals and farewells use its style.
- **Fonts:** Georgia and the other serif fonts are Windows system fonts. On a system without them the words fall back to the generic `serif`.
- **The person:** doesn't turn to face anyone and keeps their job. Your voice is a portrait only: that colonist doesn't walk over, and nothing checks that they are near.
- **Companions:** only one speaks per answer. They never ask their own questions or talk to each other.
- **Keywords:** they don't carry over between talks; nothing about a talk is remembered. More than 6 rows of keywords aren't shown (about 40 keywords).
- **Group names:** treated as plural ("The Belar Clan are welcome among us").
- **News:** chronicle events only (V31: no history at generation).
- **The `look` suite:** it fails 4 checks with or without UF_Talk: `cell_lines`, `asset_line_names_status`, `hunt_and_haul_options`, `saved`. Seen 2026-09-19 in a control run of an unmodified snapshot.
