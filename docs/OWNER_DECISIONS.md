# DEUS — OWNER DECISIONS LOG
**Status:** CANONICAL & BINDING  
**Authority:** Owner Directive 001 (2026-09-25)  
**Rule:** Nothing in Project DEUS waits on Owner input unless it is explicitly logged as an open entry in this file.

---

## 1. Decision Schema

Every decision item recorded in this log must provide:
- **Decision ID:** Stable identifier (e.g. `DEC-001`)
- **Date Logged:** ISO date (`YYYY-MM-DD`)
- **Question:** Concrete, unambiguous question requiring Owner ruling
- **Options:** Distinct, enumerated options
- **Recommended Default:** The engineering/architecture team's recommended choice
- **What Happens If Unanswered:** Safe default fallback behavior if no active decision is given within window
- **Status:** `OPEN` | `DECIDED` | `SUSPENDED`
- **Owner Ruling & Date:** Recorded upon Owner response

---

## 2. Seeded Decisions

### Decision `DEC-001`: Native Playtest Proof Requirement for A10-1 (WG.00.08)
- **Date Logged:** 2026-09-25
- **Question:** Does the Owner require an interactive human RMMZ editor Playtest (F5) inspection of a natural Z-2 ravine cut before WG.00.08 returns to `DONE`, or is the automated plain Node run with RMMZ stubs + real engine sources plus the rendered 512×512 PNG proof (`game/test_output/z2_cut_proof_seed18_194_89.png`) sufficient?
- **Options:**
  1. Automated plain Node run with RMMZ stubs + real engine sources + rendered 2D visual map proof is sufficient for gate closure.
  2. Owner must personally launch RMMZ editor (F5) and observe a Z-2 cut on Seed 18 before closure.
- **Recommended Default:** Option 1 (Automated plain Node run with RMMZ stubs + real engine sources + rendered map proof) for automated gate closure, with Option 2 performed as part of Slice 1 overall review.
- **What Happens If Unanswered:** Remains in `REVIEW`; WG.00.08 cannot transition to `DONE`.
- **Status:** Option 1 accepted in principle; SUSPENDED pending a passing proof
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner / PM Grok Bot review): Option 1 accepted in principle; SUSPENDED pending a passing proof. PM review verdict = REJECT on initial proof (exits 1 on main with 44 fluid under-carve errors). Interactive F5 check moves to Slice 1 milestone review.
- **Owner Ruling on Fluids over Voids (2026-09-25):** Fluid may sit above a void only with >=1 solid layer between; fluid directly on air is a defect; fluid on fluid is normal.
- **WBS Impact:** `WG.00.08` stays in `REVIEW`. Fresh proof assigned to Lane H.

---

### Decision `DEC-002`: Society WBS Baseline Approval (DEUS_SOCIETY_WBS.md)
- **Date Logged:** 2026-09-25
- **Question:** Does the Owner approve freezing the planning baseline of `docs/society/DEUS_SOCIETY_WBS.md` (Rev 2, covering SOC.01 through SOC.70), transitioning it from a planning skeleton to an active authoritative WBS?
- **Options:**
  1. Approve `DEUS_SOCIETY_WBS.md` as canonical frozen baseline.
  2. Request specific adjustments to institutional roles, civic offices, or currency tiers.
- **Recommended Default:** Option 1 (Approve baseline).
- **What Happens If Unanswered:** Society WBS remains a planning skeleton; implementation leaves remain blocked.
- **Status:** `OPEN`

---

### Decision `DEC-003`: Authorization to Create `CRFT` Branch from SRD 5.1
- **Date Logged:** 2026-09-25
- **Question:** Is the team authorized to create the dedicated `CRFT` task branch to ingest D&D 5.1 SRD open equipment, crafting recipes, and material properties (from local `SRD_CC_v5.1.pdf`) into `game/data/UF_WorldCatalog.json`?
- **Options:**
  1. Authorize creation of `CRFT` branch for SRD 5.1 crafting schema drafting.
  2. Defer all crafting and item additions until after repository migration to `C:\Dev\DEUS`.
- **Recommended Default:** Option 2 (Defer until after migration to `C:\Dev\DEUS` to preserve migration freeze boundary).
- **What Happens If Unanswered:** Crafting branch creation is deferred; zero new branches created prior to migration.
- **Status:** `OPEN`

---

### Decision `DEC-004`: Git Pre-Commit Hook Bypass Policy
- **Date Logged:** 2026-09-25
- **Question:** Under what exceptional emergency circumstances may an agent utilize `--no-verify` to bypass `tools/governance/check_claims.js`?
- **Options:**
  1. `--no-verify` is strictly prohibited under all circumstances without prior written entry in this document signed by Owner.
  2. Coordinator (Gemini) may bypass only for emergency repository recovery following a verified machine crash, logging the event immediately.
- **Recommended Default:** Option 1 (Zero bypass without written Owner entry).
- **What Happens If Unanswered:** Option 1 applies strictly.
- **Status:** `OPEN`

---

### Decision `DEC-005`: External Off-Disk Backup Target Selection (WG.00.12)
- **Date Logged:** 2026-09-25
- **Question:** What is the authoritative off-disk backup target for the pre-migration backup of Project DEUS before any copy to `C:\Dev\DEUS`?
- **Options:**
  1. Private git remote (e.g. GitHub/GitLab), pushing all branches, then verifying by cloning into a temporary folder and executing full test suite.
  2. External physical drive / USB drive mount (e.g. `D:\`, `E:\`), running `tools/backup_project.ps1` via robocopy to mirror the repo off-disk.
  3. Both private git remote and external physical drive mirror.
- **Recommended Default:** Option 1 (Private git remote) + test clone and run.
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner): Option 1. Private GitHub remote `https://github.com/willshw89/Deus.git` (private remote). Verified live, 10,259 tracked files pushed (`game/img` whitelisted, `game/data/df_*.json` tracked). Pre-migration backup requirement complete. Pending: Owner off-laptop copy of `C:\Users\snewt\DEUS_backups\deus_untracked_2026-09-25.zip` (BLOCKER-BACKUP resolved with this caveat).

---

### Decision `DEC-006` / `R1`: WG.00.09 Depth Shading Rule vs Palette Reality
- **Date Logged:** 2026-09-25
- **Question:** How should multi-Z lower levels darken under WG.00.09 depth rendering given current tile art palette?
- **Options:**
  - Option A: Plan's 2-step rule (~33% darker at depth 1, ~67% darker at depth 3).
  - Option B: One darkening step at depths 3–4 only.
  - Option C: Fixed dither pattern between neighbouring palette colors.
  - Option D: Scale-only depth separation, no color darkening, until tile art is migrated to the master palette. Revisit shading after migration.
- **Recommended Default:** Option D.
- **What Happens If Unanswered:** WG.00.09 DEFINE stays BLOCKED.
- **Status:** `SUPERSEDED by DEC-011`
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner): Option D. Scale-only depth separation, no colour darkening, until tile art is migrated to the master palette. Revisit shading after migration. Fold R1=D plus items R2–R11 into the depth attack plan. Superseded by DEC-011 (2026-09-25 23:54 CT).

---

### Decision `DEC-007`: No art generation without Owner involvement
- **Date Logged:** 2026-09-25
- **Question:** May agents generate, request from generators, or integrate newly generated art autonomously?
- **Options:**
  1. Autonomous generation permitted under Rules 11 and 13.
  2. No art generated, requested, or integrated without direct Owner involvement.
- **Recommended Default:** Option 2.
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Owner, relayed by PM 001-L): No art of any kind may be generated, requested from a generator, or integrated as newly generated art by anyone (the PM, Gemini or any worker) without the Owner's direct involvement. All earlier autonomous-generation mandates (AGENTS.md Rules 11/13, GEMINI.md, CLAUDE.md, art briefs, packets) are suspended until the Owner rewrites them.
- **Owner Ruling Amendment (2026-09-25, 23:41 CT):** Scope clarification: Allowed without the Owner (these are not art): the art CATALOGUE (manifest of every tile/sprite with sheet, slot, pixel coordinates, size and palette), BLANK template tilesets (empty grids and slot IDs generated from the catalogue), and PLACEMENT/validation tooling that places Owner-approved art into catalogue slots. Only generating the art itself requires the Owner.
- **Owner Amendment (2026-09-29, given directly to Claude Code in chat): PixelLab opening for the natural world.** Owner's words: "I am opening up Pixellab to generate assets as needed using the OBJECTS and MAPS [options] only, in order to make tilesets, charsets, chipsets, etc to complete the natural world. No 'Creator' or 'Character' prompts. Everything generated must have been catalogued first, must be prompted consistent with our SOP, and must go through QA vetting process." On QA, same day: it "should ensure art style, dimensions, camera orientation, etc. It should ensure animated assets work as intended. Basically that everything works and nothing [substandard] is getting through." On variety: "we get a lot of variety from our object prompts. Use that variety in the world to make the world diverse" and "Diverse but READABLE. It should not be confusing to the player."
  - **Allowed:** PixelLab OBJECTS and MAPS tools, as needed, for natural-world tilesets, charsets, chipsets and similar. **Exact generators (Owner, 2026-09-29, with screenshots): terrain tiles come from Maps → Tiles ("New Tiles", square top-down tile groups: "For tiles, I want to use the tiles generation"); objects come from the Objects generator ("For objects, object generation").** The Tiles tab held 0 tile groups that day, so no tile made before then came from the allowed generator. (Art the PM makes: Pixflux and Bitforge only, DEC-063 item 3.)
  - **Not allowed:** PixelLab "Creator" or "Character" prompts; any other generator, tool or scope without the Owner.
  - **Every generated asset:** (1) has its record in `art/catalogue/catalogue.json` before generation; (2) is prompted consistent with the SOP (`docs/art/DEUS_ASSET_STANDARD.md`, confirmed as the SOP by the Owner the same day); (3) passes QA vetting before it enters the game: art style, dimensions, camera orientation, and animation working as intended. Anything substandard is rejected.
  - **Variety:** place an object's approved variants across the world for diversity, keeping it readable. (Recorder's note: variants of one object should still read as that object, and different objects should stay easy to tell apart.)
  - **Owner sign-off:** "I am the final QA, and YOU will present assets to me for signoff." After QA vetting, Claude presents each asset to the Owner, and it enters the game only with the Owner's sign-off (AGENTS.md Rule 6, VISION V11). AGENTS.md Rules 11 and 13 stay suspended.
  - **PM visual review (Owner, 2026-09-29, "I want your review on art as well"):** before any board reaches the Owner, the PM (Claude) opens it and writes a per-variant review: style, dimensions, camera, animation, readability against its neighbours, with the machine QA numbers beside it and a YEA / replace-these-variants / NAY recommendation per set. The Owner's verdict stands over the PM's. Art already in `game/img` gets the same review in retro boards.
  - **Rejected art (Owner, 2026-09-29, "any reject art can be deleted from pixellab"):** a generation the review rejects may be deleted from the PixelLab account once its local raw and manifest (id, tool, prompt hash, sha256, verdict, board, date) exist under `art/masters/source_sets/`; never one with a YEA ledger row or whose sheet still supplies kept variants. The local raw is kept.
  - **Style influences (Owner, 2026-09-29, "I want to add to future art Prompts English, britannic influence as part of the general world feel alongside U7 / Everquest"):** every future art prompt carries, in its style tail, an English / British Isles influence (countryside, weather, hedgerow and heath flora, stone and timber material culture, the look of the older Britain that Ultima VII drew on) alongside the existing Ultima VII and EverQuest references. This is an art-direction influence for prompts and boards; the Rule 7 ban on Ultima proper nouns (Britannia, Avatar, ...) in player-facing text is unchanged. Owner, same day: "You can add that to our artistic vision as well, and use that as part of your guidance for accepting or rejecting art": recorded as VISION V152; the PM’s board reviews accept or reject art against this feel as well as the technical checks. Owner, same day: "Like an english / british feel on the races, dragons, the demon influence of tieflings, etc.": the feel extends to peoples, dragons and demons (detail in V152 and AS-LOOK-002); living beings stay Owner-generated. **Correction (Owner, same day):** "Not english countryside, english folklore flavor to the game." The influence is English folklore (fair folk, barrows, standing stones, wyrms, black dogs, boggarts, hobs, church-carving devils), not countryside realism; landscapes follow their biome. V152 and AS-LOOK-002 are reworded; the style tail is now "world feel: English folklore, in the spirit of Ultima VII and EverQuest".
  - **Race canvases (Owner, 2026-09-29, "Small races are 48x48. Human size races are 48x76. Large races are 48x96"):** character canvas by size tier, placement by the Owner the same day ("Humans, elves, tieflings, half elves - med / dwarf, halfling, gnome - small / Dragonborn, half-orc - large"): Small 48×48 (Dwarf, Halfling, Gnome), Medium 48×76 (Human, Elf, Half-Elf, Tiefling), Large 48×96 (Dragonborn, Half-Orc). Supersedes the 48 px canvas in AS-CHMAP-001 for characters. Prompts for male and female of every SRD race: `docs/art/RACE_PROMPTS.md`. Living beings stay Owner-generated (DEC-007).
  - **Race motifs (Owner, 2026-09-29, "Each race needs a motif, like an artistic motif, there should be some written down somewhere"):** `docs/art/RACE_MOTIFS.md` is the one place: per people a motif line, folklore root, silhouette, palette and heraldic tinctures, banner device, materials and buildings, small details, and what would break it, all under V152. Prompts carry the motif line; the PM’s reviews accept or reject against it. Two banner devices are proposed changes awaiting the Owner: gnome gears -> gold acorn on brown; elf leaf -> white hart on green. The six non-SRD peoples’ motifs are proposals pending Owner approval.
  - **Race outfits, colour schemes, readability (Owner, 2026-09-29, "each race should have their own motif for Basic clothes, robes, light armor, medium armor, and heavy armor. Consult SRD"; "Every race should also have a color scheme"; "Everything should be oriented towards readability"):** `docs/art/RACE_OUTFITS.md` gives each of the nine peoples one drawing per outfit tier (the five AS-CHMAP-001 states mapped to the SRD: clothes; robes; padded / leather / studded; hide / chain shirt / scale / breastplate / half plate; ring / chain / splint / plate), each tier drawn as the one SRD armour that people would make, and one colour scheme of master-palette entries that fills `RAMP_RACE_<RACE>`; readability rules R1–R8 (tier by silhouette and value, people by identity hue and value accent, device only on HEAVY) are AS-READ-002 and VISION V153; `tools/art/check_race_schemes.js` fails on any breach. PM-proposed and pending the Owner: the nine schemes, the dwarf palette change (dark red and dark green -> blue-grey, iron black, bronze), the halfling woman's dress (blue -> apple green), the archetype picks and the thresholds. Living beings stay Owner-generated (DEC-007).
  - **Owner-generated art (Owner, 2026-09-29, "While you were offline I was generating art for the biome"):** the Owner generates art personally with any PixelLab tool; the freeze and the catalogue-first rule bind agents, not the Owner. Owner-made art enters the game by the same road as everything else: the PM catalogues it (retroactive catalogue rows are allowed for Owner-made art only), runs the machine QA (dimensions, seams, palette, camera, readability) and a board, and the Owner's YEA row in `art/APPROVALS.md` inducts it. First case: six PixelLab Maps -> Tiles groups (16-tile dirt-to-grass transition sets, `art/staging/pixellab_tilesets/set_0..5`, fetched 15:23 CT) and the six meadow variants processed from them.
  - **The Owner generates all the art (Owner, 2026-09-29, "I will generate all the art"):** from this ruling no agent generates art on its own initiative, with any tool; the agents' side of the PixelLab opening above is closed. Owner, same day: "If you see something I passed directly to gemini to do for me, thats fine." An agent may generate what the Owner hands it directly; that is the Owner's generation, and the agent quotes the Owner's words in the source-set manifest and its next report. PixelLab stays open to agents read-only: list, get and download the Owner's generations, `get_balance`, and free settings reads such as `get_tiles_pro`. The generation budget is the Owner's. Agent art work is everything around generation: catalogue rows (they may be written before or after the Owner generates), generation cards that tell the Owner what to make, with which PixelLab tool, which settings and which prompt, pickup and archive of the raw output with its settings and cost, palette snap and slicing, machine QA, the PM's visual review, boards and in-game 1:1 previews, placement after the YEA, and the engine and world-generation work that gives each asset a place to appear. Rejected Owner generations are deleted from PixelLab only as the rejected-art rule above allows. The autonomous generation loop (directive 0157-C) and the agent replacement queue end; their items become generation cards.
  - **Art restart (Owner, 2026-09-29, "I want to completely restart art generation"; choices the same evening: "Archive all, start blank" and "Look first, then pipeline"):** every existing generated art sheet leaves the game and goes into a dated archive; nothing is deleted. The archive keeps the Owner's six biome tile sets (`art/masters/owner/2026-09-29_biome/`) and the five YEA sheets as references the Owner may re-approve. Until new art is approved the game shows blank placeholder templates (allowed without the Owner: "BLANK template tilesets", this decision's banner). Order: (1) the look first: one style bible (palette, camera, light, outline, scale, readability, folklore feel) and a small set of anchor pieces the Owner generates and approves; (2) then one asset proven end to end through catalogue, processing, checks, board, YEA and placement into the running game; (3) then batch production. The temperate queue of 2026-09-29 (`docs/art/GENERATION_QUEUE_TEMPERATE.md`) and the earlier art plans are superseded by the restart plan; the ground-connection and council consults feed it.
  - **Prompt structure (Owner, 2026-09-29: "We will structure our art prompts like this: World paragraph / Faction/biome paragraph / item description / Specs"):** every art prompt has four parts in this order: (1) the World paragraph, the same in every prompt (Emerys, the look, camera, light, palette intent, folklore feel); (2) one Faction or Biome paragraph from a fixed set (per people; per biome and depth band for terrain and natural things); (3) the Item description; (4) the Specs (size, view, frames, outline, palette, transparency, PixelLab tool settings). The reusable blocks are drafted with the braintrust in the art restart and become part of the style bible; AS-LOOK-002’s style tail moves into the World paragraph.
  - **Camera (Owner, 2026-09-29, "high topdown"):** every PixelLab prompt for every asset class (terrain tiles, objects, props, creatures) uses the PixelLab view setting **high top-down**. This is the one camera; `docs/art/DEUS_ASSET_STANDARD.md` AS-LOOK-001 / AS-PROJ-001 ("RMMZ standard top-down 3/4 view") describe the same camera as the engine presents it. Any note that says low top-down is superseded.
  - **Ground tile variants (Owner, 2026-09-29, "I want more variants of each type of tile so there's a gradient on the ground"):** each ground kind gets several tile variants, placed so the ground shifts gradually instead of repeating one stamp, while ground kinds stay distinguishable. Counts, format and placement rule to be recorded as their own decision once the design is settled.

- **Amendment (2026-09-30, DEC-056): the PM chooses what art goes in game (art only).** Owner: "You can choose what goes in game, and if I want to change something I will bring it up". The Owner-YEA gate on art entering the game is replaced by a PM YEA with an Owner veto; see DEC-056.
---

### Decision `DEC-008`: Heavy-Job Cap Lifted & Power-Off Concurrency Tripwire
- **Date Logged:** 2026-09-25
- **Question:** Is the laptop thermal issue resolved, and can multi-worker concurrent execution proceed?
- **Status:** `DECIDED`
- **Owner Ruling & Date:** 2026-09-25 (Decider: Owner): Heavy-job cap lifted; power-off tripwire reinstates MAX_SIMULTANEOUS_HEAVY_LOCAL_JOBS=1; laptop power-loss issue considered fixed.

---

### Decision `DEC-009`: Master Palette Engine Migration Release-Blocking Status
- **Date Logged:** 2026-09-25
- **Question:** Is `art/palette/uf.hex` (the Ultima VII daylight palette) allowed to ship, or must the master-palette migration (WG.00.13) be release-blocking?
- **Source:** ADR-002 §7 item 3.
- **Options:**
  1. Release-blocking: `uf.hex` is an interim runtime palette; master palette migration (WG.00.13) must be complete before any public/player release.
  2. Non-blocking: `uf.hex` may ship in early alpha builds, with migration occurring in background.
- **Recommended Default:** Option 1 (Release-blocking).
- **What Happens If Unanswered:** Treated as release-blocking.
- **Status:** `OPEN`

---

### Decision `DEC-010`: Rock Ledge Support vs. Lateral Edge Connectivity in Cuts/Caves
- **Date Logged:** 2026-09-25
- **Question:** In procedural cut and cave carving (WG.00.08), does a solid stone stratum require direct vertical support from below, or is horizontal/lateral connectivity to the rock wall / bedrock / area edge sufficient (e.g. natural rock overhangs or ledges over air, as found at (190,72))?
- **Source:** Directive 0016-P / `DEF-Z2-PROOF-LEDGE-01`.
- **Options:**
  1. Lateral connectivity is sufficient: natural rock ledges and overhangs attached to solid cavern/ravine walls are structurally valid (matches the engine's cleanup rule).
  2. Full vertical column support required: any stratum with air directly beneath it must be carved or eliminated, disallowing all natural stone overhangs.
- **Recommended Default:** Option 1 (Lateral connectivity is sufficient; natural overhangs allowed if grounded to wall/edge).
- **What Happens If Unanswered:** Treated as Option 1 default.
- **Status:** `OPEN`

---

### Decision `DEC-011`: Owner overrides DEC-006/R1 (Option D). Flat layer rendering
- **Date Logged:** 2026-09-25
- **Decider:** Owner (23:54 CT, relayed by PM 0017-Q)
- **Status:** `DECIDED`
- **Owner Ruling:** Owner overrides R1/Option D. Every Z layer renders 1:1. That means no blur, no scale or zoom, no parallax or projection offset, and no ColorMatrix, alpha or tint depth shading or any other filter. The first goal is correct layer display. Visual depth effects will be revisited later, and only with the Owner.
- **Engine Fact:** Option D was never implemented in the engine. `main` still ships `DEUS_Depth` with Preset `deus` (`game/js/plugins.js`, lines ~270-278: `"Preset": "deus"`, `"EyeHeightFt": "140"`). That preset gives camera-model scale 0.959/0.921 plus ColorMatrix plus BlurFilter 0.6/1.2 px (`DEUS_Depth.js` L121-124, L135, L203). R1 exists only in the Lane E plan doc and in WORK_QUEUE WB-007.
- **Lane E Consequence:** WB-007's plan mandates "scale-only recession (DEC-006 / R1 = Option D)". Pause Lane E until the PM re-scopes it to DEC-011. Do not merge Lane E as written.
- **DEC-011 Amendment Note (Owner Directive 0021-V Addendum §19, 01:28 CT):** Owner wants all nine depth cues eventually; 1:1 correctness first. Cues 1–6 (visible inner side walls of openings, rim shadows, darker baked tile palettes, height edges/ramps, hanging/falling props, deep light sources) are art/draw-order only and in scope under DEC-011. Cues 7–9 (depth parallax, code-applied haze/darkening, slight scale-down) amend DEC-011 and are approved in principle for an Owner-led review session after Lanes K and N land and 1:1 correctness is verified; each will be an independent toggle off by default with measured benchmark cost.
- **DEC-011 Amendment Note (Owner Requirement 2026-09-26 11:31 CT, Directive 0083-CF):** When looking down through layers, every visible lower layer shows its effects, HP bars, status indicators, and other combat or spell overlays, not just terrain and sprites. Under DEC-011, these overlays render at 1:1 scale with zero filters (no blur, tint, fog, desaturation, or scaling applied to them).
- **DEC-011 Amendment Note (Owner Requirement 2026-09-26 11:32 CT, Directive 0084-CG):** Multi-unit selection and group orders operate across layers. The player can select units on several layers at once and give them orders together (for example, box-select through visible lower layers, or add units from other layers to the current selection with modifier-click or modifier-box).
- **DEC-011 Amendment Note (Owner, 2026-09-29 16:35 CT, to Antigravity: "Also give me a zoom slider from 0.5 to 3x"):** the player camera zooms from 0.5× to 3.0× (slider, mouse wheel, presets; `105e18aa`, `DEUS_Camera.js`). This is an Owner exception to the "no scale or zoom" clause for the viewer camera only: every Z layer still renders 1:1 relative to the others, with no depth blur, tint or projection. Art is still judged at 1× and whole-number multiples (AS-RENDER-001); at in-between zooms (for example 1.5×, 2.5×) pixels draw at uneven sizes, which the Owner has accepted by asking for the range. Recorded by the PM the same day. **Update (Owner, same day, to Antigravity, `1c25c789`: "I want the zoom options to just be 3: 1x zoom, 2x Zoom, and 0.5 zoom. So one zoom in, and one zoom out from 1x"):** the zoom is three steps, 0.5×, 1× and 2×. 2× is a whole-number multiple and stays crisp; at 0.5× every other pixel row and column is dropped, so 1 px details (outlines, ledge rims, 12 px items) can vanish there, and art is still judged at 1× and 2×.

---

### Decision `DEC-012`: Sim/render split and level-of-detail simulation are adopted architecture
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner order 2026-09-26 00:00 CT, directive 0018-R)
- **Decider:** Owner
- **Summary:**
  1. **Sim/render split:** The simulation becomes plain JavaScript modules with ZERO dependency on RPG Maker, PIXI, or the DOM. Headless node runs the entire simulation on its own fixed tick (10 Hz). RPG Maker is purely an observer/renderer that consumes state snapshots and issues player orders into a command queue.
  2. **Level-of-Detail (LOD):** The active player/camera region simulates at full tick fidelity. Distant regions simulate as coarse aggregate summaries at reduced frequency (water volume, populations, biomass, temperature). Promotion from coarse to fine is deterministic (same seed + state = identical world); demotion conserves all mass, energy, and population.
  3. **Roadmap:** Implemented in milestone M3 (SIM.00 and SIM.30 packages). Lane M writes the architectural decision record (ADR-003).
- **Amendment (Owner, 2026-10-01):** in item 2, the coarse population summaries, and the population that demotion conserves, cover only people, owned livestock and notable creatures (tamed, captured, named, quest and lair creatures, and any creature carrying items); flora biomass stays. Anonymous wildlife and monsters are not summarized: they despawn when far away and out of sight, the spawn rules place them again, and they are outside the closed-mass ledger (SIM.30.01-05 shrink to match); see DEC-073. DEC-080 amends this: away from the player they are kept as counts per spawn anchor, not despawned.

---

### Decision `DEC-013`: Thirty-Two Z Layers, Nine Races, Home Layer Ranges, Five Biome Bands, and Governing Scale
- **Date Logged:** 2026-09-26 (Amended 01:10 CT per Owner Directive 0021-V Addendum §12–§13; supersedes 9-layer baseline)
- **Status:** `DECIDED` (Owner ruling 00:34, 00:37, 01:06–01:10 CT)
- **Decider:** Owner
- **Summary:**
  1. **Thirty-Two Z Layers:** The world simulation and presentation expand to 32 vertical Z layers (superseding 9 layers; formerly -2..+2). Total vertical headroom: 320 ft. The Z-range refactor targets 32 as the default gameplay layer count and must still support running at 9 in automated tests.
  2. **Governing Geometry & Scale:**
     - 1 square / cell = 5 ft × 5 ft (D&D movement standard).
     - 1 Z layer = 10 ft tall (equivalent to 2 cubes).
     - 5 strata per layer = 2 ft per stratum (5 strata × 2 ft = 10 ft).
  3. **Mandatory Sparse Storage:** Memory, state arrays, and save size must scale with occupied cells/entities, NOT with 32 × area. Empty sky and untouched solid rock cost near zero.
  4. **Cross-Layer Blast & Structural Damage:** Explosions and blasts (e.g. fireball) damage floors and propagate damage to the layer below depending on floor material, thickness, and attenuation. `applyVolumeDamage` propagates vertically with distance falloff and solid material attenuation (fire vs impact).
  5. **Nine Races with Home Layer Ranges:** Exactly 9 races exist in the world, each assigned one native home layer range within the biome bands where its settlements and natural habitat generate (supersedes "one layer per race").
  6. **Soft Home Boundaries:** "Home layer range" defines where a race's settlements and native populations materialize; it is not a hard barrier. Races may travel, explore, trade, migrate, and engage in conflict across all Z layers.
  7. **Five Vertical Biome Bands Spanning 32 Layers:** The 25 pipeline biomes are partitioned into 5 vertical bands of 5 biomes each across the 32 layers (-16..+15, surface at 0):
     - **Lower-2 (Deep Caverns):** Layers -16..-9 (8 layers, 5 biomes)
     - **Lower-1 (Shallow Underground):** Layers -8..-1 (8 layers, 5 biomes)
     - **Surface:** Layers 0..+3 (4 layers: ground, hills, low buildings; 5 biomes)
     - **Upper-1 (Low Sky / Towers / Canopy):** Layers +4..+9 (6 layers, 5 biomes)
     - **Upper-2 (High Sky / Peaks / Cloud Realm):** Layers +10..+15 (6 layers, 5 biomes)
- **Open Sub-Questions (with PM defaults):**
  - **Z-Range Coordinate Mapping:** Default `-16..+15` (surface = 0). Status: `OPEN` (PM default).
  - **Race-to-Band/Layer-Range Mapping:** Which specific race occupies which home layer range. Status: `OPEN` (Owner assigns).
  - **Biome Assignment per Band:** Mapping of the 25 specific biomes into the 5 bands. Status: `OPEN` (Owner assigns).
- **Amendment Note (2026-09-26, Directive 0035-AJ D-2 & D-3):**
  - **D-2 Stratum/slice thickness is 2 ft:** A layer is 10 ft = 5 slices of 2 ft; squares are 5 ft. Stale code references to 1-ft strata and 5-ft levels (audit F-01) are superseded; WG.00.17 aligns all feet conversions (`Z_STEP_FEET`, blast geometry).
  - **D-3 Sparse storage is mandatory in-memory as well as in saves:** Uniform columns stored compactly (run-length), levels allocated on demand, bounded 3D path-search scratch (audit F-02). WG.00.17 DoD enforces the in-memory layout.

---

### Decision `DEC-014`: Population Simulation Budget, Crowd Counts LOD, and Anti-Snowball Pressures
- **Date Logged:** 2026-09-26
- **Status:** `OPEN` (Owner discussion 00:46-00:50 CT, directive 0021-V Addendum §9; PM defaults recorded)
- **Decider:** Owner
- **Summary:**
  1. **No Population Cap:** The simulation enforces no arbitrary ceiling on total world population.
  2. **Detailed Individual Budget vs Crowd LOD:** A detailed individual simulation budget (named, fully simulated individual agents) is sized by post-split simulation performance benchmarks. Population beyond the budget is simulated as aggregate counts (crowd LOD) and promoted to individuals when entering the player's focus bubble, becoming leaders, heroes, or soldiers in formed armies.
  3. **Three-Axis Identity & Obligation Retention:** Crowd counts maintain the SOC.10.01 three-axis identity (`craft`, `civicOffice`, `class`) plus an obligation level (duty to defend or serve), ensuring military levies and labor forces draw from appropriate demographics and casualties feed back accurately into counts.
  4. **Anti-Snowball Pressures:** Large, dominant factions experience emergent counter-pressures: regional rebellions, epidemic disease in dense settlements, supply/logistical strain, and dynastic succession crises, ensuring faction supremacy must be continuously maintained rather than permanently snowballing.
  5. **Monster Origins:** Default rule is that most monsters reproduce biologically like animals; per-species origin settings (`breeds`, `spawned`, `created`, `unique`) are preserved for lore exceptions (Owner assigns).
- **Amendment (Owner, 2026-10-01):** item 5's default is reversed: wildlife and monsters do not reproduce, and their default origin is `spawned`, placed and removed by the seeded runtime spawn rules. The per-species origin field stays for exceptions, such as a `unique` lair boss that is gone for good once killed; only people and owned livestock keep breeding (civilization phase); see DEC-073.

---

### Decision `DEC-015`: Data-Driven Per-Faction Development Plans
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 00:52 CT, directive 0021-V Addendum §10)
- **Decider:** Owner
- **Summary:**
  1. **Preplanned Societal Expansion:** Each of the 9 races follows an authored Faction Development Plan defining how its civilization builds itself out from founding to empire.
  2. **Data-Driven Architecture:** Plans are authored as structured JSON data schemas consumed by autonomous civilization logic (`docs/design/AUTONOMOUS_CIVILIZATION.md`) and deep-history generation, rather than hardcoded logic.
  3. **Plan Components:**
     - **Settlement Stages:** Progressive stages (e.g. camp, hamlet, village, town, city, capital) with required population, buildings, roles, and institutions.
     - **Build-Order Priorities:** Stage-specific construction preferences (shelter, water, food, storage, defense, workshops, temples, government seats) dynamically adapting under threat, famine, or abundance.
     - **Class & Occupation Mix:** Demographic targets per stage mapped to SOC.10.01 identity and obligation levels.
     - **Technology & Knowledge Paths:** Craft and construction unlocks.
     - **Architectural Style:** Cultural building profiles linked to `docs/art/DEUS_RACIAL_BUILDING_BIBLE_TEMPLATE.md` adapted to the race's DEC-013 home-layer band.
     - **Expansion & Failure Modes:** Colonization distance/terrain rules and societal regression/collapse conditions.
  4. **Owner Separation:** Technical schema and structural template are engineering tasks; race-specific cultural lore, names, and values remain Owner-authored (TODO).

---

### Decision `DEC-016`: The scale chart is the governing size authority for the art catalogue, templates and placement
- **Date Logged:** 2026-09-26
- **Decider:** Owner (00:11 CT, "the most important is the scale chart"; relayed by PM 0019-S/0028-AC)
- **Status:** `DECIDED`
- **Ruling:** Every catalogue entry's pixel size, envelope, footprint and anchor derive from the scale chart (`art/reference/DEUS_HUMAN_SCALE_STRIP_V1.png`, whose numeric source is `game/data/DEUS_ScaleRegistry.json`; the two are not independent evidence), citing one chart row per entry. The catalogue builder (`tools/art/build_catalogue.js`), template generator (`tools/art/make_blank_templates.js`) and placement validator (`tools/art/validate_art.js`) enforce it. Disagreements with other documents go to the Owner and are never resolved by workers. Sim distances (DEC-013 geometry) govern the simulation. Where geometry and chart imply different px/ft, it is an Owner question (`stratumPx`).
- **Open:** If "the scale chart" means a different file, the Owner names it and DEC-016 is amended.
- **Amendment (Owner, 2026-10-01):** nine per-row size overrides for the catalogue-rows lane (lane-pg) are approved; see DEC-066 item 1. Other disagreements still go to the Owner.
- **Amendment (Owner, 2026-10-01, ~23:25Z):** "I will solve size mismatches when I see them in the game". A size mismatch against a catalogue envelope no longer holds council-passed art back. The PM puts the piece in at its drawn size, in the smallest 48-multiple frame that holds it, and lists each mismatch with the induction. The Owner adjusts sizes after seeing them in the game.

---

### Decision `DEC-017`: Keep RMMZ for menus, dialogue, saving, database and battle; fallback map renderer is a custom multi-layer PixiJS renderer inside RMMZ, decided after demo benchmarks
- **Date Logged:** 2026-09-26
- **Decider:** Owner (01:38 CT, relayed by PM 0028-AC)
- **Status:** `DECIDED` (shell). The fallback trigger is `OPEN` until the benchmarks.
- **Ruling:** RMMZ remains the engine for menus, dialogue, saving, the database and battle screens. If the stock RMMZ map (`Spriteset_Map`/`Tilemap`) cannot meet the goals, the fallback is a **custom multi-layer PixiJS map renderer inside RMMZ**. It replaces map drawing inside `Scene_Map` only; all other scenes, windows, save, database and battle are untouched, so it is not an engine swap. The goals are 32 layers, the §18 occlusion rule, DEC-011 1:1 flat layers, and the stress scene within frame budget. The go/no-go is decided with the Owner after the demo benchmarks: Lane K normal plus 0019-T stress baselines, and the §18 32-vs-5-layer occlusion benchmark. No renderer code lane opens before then.
- **Consequences:**
  - ADR-003 Rev 3 adopts this as its exit/fallback path (§13 "Engine Exit Path").
  - Added WBS placeholder row "Custom multi-layer PixiJS map renderer (fallback)" (`WG.00.24`), gated on Lane K benchmarks and Owner go/no-go.
  - Benchmark hygiene note: benchmarks share CPU with other workers, so each perf record must note concurrent worker count and CPU %, and go/no-go evidence needs one quiet-machine rerun.

---

### Decision `DEC-018`: SRD spells are hyper-realistic: effects play out physically in the simulation; SRD numbers stay the rules baseline
- **Date Logged:** 2026-09-26
- **Decider:** Owner (01:39 CT, relayed by PM 0028-AC)
- **Status:** `DECIDED`. Per-spell details are `OPEN` pending the audit.
- **Ruling:** Spell effects play out physically in the living-world simulation:
  - Fire ignites combustible materials and spreads
  - Blasts damage structures and can breach floors into lower layers
  - Water floods and flows
  - Cold freezes liquid into ice
  - Earth spells reshape physical terrain strata
  SRD 5.1 damage, range, saves, area, duration and casting stay the rules baseline, and physical consequences are added on top, never replacing SRD numbers. It is data-driven: one spell-effect schema of reusable primitives, and ZERO per-spell code.
- **Open Sub-Question (PM default):** Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the conservation ledger like the rain/evaporation exception.
- **WBS Integration:** `SIM.60.01` (audit), `SIM.60.02` (schema), `SIM.60.03` (runtime), `SIM.60.04` (QA fixtures).

---

### Decision `DEC-019`: In-Layer Height (Strata) Presentation & Movement Rules
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 01:17–01:19 CT, directive 0021-V Addendum §15)
- **Decider:** Owner
- **Summary:**
  1. **Visual Presentation:** Characters and objects are rendered raised by a fixed pixel offset per stratum of ground height (a straight vertical pixel shift, no scale/projection deformation; DEC-011 compliant).
  2. **Movement Rules:**
     - 1 stratum difference (2 ft): Normal step (traversable without penalty).
     - 2 strata difference (4 ft): Climb or jump (reduced movement speed or skill check).
     - Full layer difference (10 ft / 5 strata): Requires stairs, ladder, or ramp.
  3. **3D Height Mechanics:** Falling damage, melee reach, and line-of-sight elevation advantage use real 3D vertical height differences.
  4. **Art Preparation:** Catalogue requires one top-surface tile per terrain plus auto-placed edge/cliff-face strips per height difference (1 to 5 strata) and height shading; NOT a full tile set per height. Catalogue placeholders only; no art generation (DEC-007).

- **Amendment (2026-09-30): edge art by face material.** Owner, 2026-09-30, answering Claude's option "Faces by material, not by terrain: a cliff shows what's underneath, not the grass on top, so soil, rock, sand and mud faces cover all 17 terrains, about 112 pieces. The top tile shows which terrain it is.": "yeah".
  - **Faces by material, not by terrain.** Cliff and edge faces, ramp cells and ramp side faces are drawn per face material: SOIL, ROCK, SAND or MUD. The terrain's own top tile shows which terrain it is.
  - PM mapping, Owner may adjust:
    - SOIL: meadow, dirt, forest floor, needle floor, shrub soil, dry grass, road, mined soil;
    - ROCK: rock, stony, scree, peak rock, cave floor, mined stone;
    - SAND: sand;
    - MUD: mud, swamp mud.
  - **Heights are cut, not drawn.** The shorter heights H1-H4 are cut from the full face by the catalogue tool (the STRATA_WINDOW rule). Only the full faces are drawn.
  - **Count.** For the temperate biome that is about 112 drawn pieces: 4 materials x (4 full edge faces + 20 ramp cells + 4 full ramp sides). The per-terrain plan was 1,088.
  - The running game's natural walls already use this model (rock and soil A4 faces).
  - The catalogue restructure is a gated data lane (DEC-052); the per-terrain placeholder rows are replaced, not duplicated.
---

### Decision `DEC-020`: Seamless Inter-Layer Ramps and Camera-Follow Behavior
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 01:21 CT, directive 0021-V Addendum §16)
- **Decider:** Owner
- **Summary:**
  1. **Seamless Transitions:** Ramps and slopes carry units continuously from one layer to the next. A ramp is a run of cells rising one stratum per cell (5 cells = one 10 ft layer). At the top stratum, the unit's Z becomes Z+1 with zero screen transfer, fade, or pause. Depends on Lane N (in-place layer switch) and DEC-019 stratum height offsets.
  2. **Camera-Follow Default:** When the player unit crosses a ramp boundary between layers, the camera view automatically follows the player's current layer. Non-player units crossing simply transfer layer membership lists (Lane K per-frame membership refresh).
  3. **Pathfinding & Construction:** Multi-Z pathfinding treats ramps, stairs, and ladders as traversable layer connectors. Colonists can build ramps. Art catalogue adds ramp/slope pieces per terrain (placeholders only; DEC-007).
- **DEC-020 Amendment Note (Owner requirement 2026-09-26 12:12 CT, Directive 0090-CM):** A hill can span several Z layers, and units walk straight up it with no stairs, no transfer, and no loading. Terrain rises continuously across layer boundaries (multi-layer hills, not only single 5-cell ramps) via slope and ramp tiles between Z layers. Pathfinding across Z treats walkable slopes as ordinary path edges between layers. The camera follows the controlled unit's layer while it walks across slopes (no fade, pause, or load). Selected units and group orders keep working while crossing layers on slopes (selection is not dropped at a layer change).

- **Amendment (2026-09-30): ramp and slope art by face material.** Owner, 2026-09-30, answering Claude's option "Faces by material, not by terrain: a cliff shows what's underneath, not the grass on top, so soil, rock, sand and mud faces cover all 17 terrains, about 112 pieces. The top tile shows which terrain it is.": "yeah". See the DEC-019 amendment of the same date: ramp cells and ramp side faces are drawn per material (SOIL, ROCK, SAND, MUD), not per terrain.
---

### Decision `DEC-021`: Occlusion Rule for Layer Rendering (Zero-Cost Solid Cover)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 01:24 CT, directive 0021-V Addendum §18)
- **Decider:** Owner
- **Summary:**
  1. **Occlusion Culling Rule:** Any cell, entity, prop, or effect covered by an opaque upper layer is not drawn at all.
  2. **Bounded Draw Cost:** Draw cost is strictly bounded by exposed visible screen area (VISION V133), NOT by total layer count. For each screen column/cell, rendering traverses only from the currently viewed layer downward to the first opaque surface; cells under solid cover cost zero.
  3. **Benchmark Requirement:** Applied in Lane K follow-up, the 32-layer refactor, and future overlook view. Benchmark target: the stress scene with 32 layers must cost approximately the same frame time as with 5 layers when upper layers are solid.

---

### Decision `DEC-022`: Cross-Layer 3D Targeting, Ballistics, and Volume Damage
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 01:35 CT, directive 0021-V Addendum §20)
- **Decider:** Owner
- **Summary:**
  1. **3D Targeting:** Spells, arrows, and thrown items can target cells and entities on lower (and upper) layers whenever there is an unobstructed 3D line of sight through openings (shafts, ravines, stairwells, overlooks).
  2. **True 3D Geometry:** Range calculation uses true 3D Euclidean distance (5 ft grid cells, 10 ft layer height).
  3. **Vertical Modifiers:** Falling projectiles and dropped objects gain velocity/impact damage based on height fallen; shooting upward incurs a range penalty.
  4. **Volume Area Damage:** Area-of-effect blasts (fireball, explosive shells) hitting a floor propagate cross-layer volume damage downward per DEC-013 §12. Targeting UI allows selecting visible cells on lower layers viewed through openings.

---

### Decision `DEC-023`: Ore and Mineral Deposits Never Respawn (Ruling D-5)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling relayed by PM, Directive 0035-AJ §1)
- **Decider:** Owner
- **Summary:**
  1. **Finite Minerals:** VISION rules V74, V83, INV-SIM-03, and LIFE-002 stand as binding law. Ore, stone, and gem deposits are finite in the geological stratum.
  2. **Bug Removal:** Sprouting of ores, stones, and gems over time in `DEUS_Ecology.js` (audit VEG-1, F-03) is classified as a code defect to be removed in `SIM.50.12`.
  3. **No Spontaneous Regeneration:** Minerals do not respawn silently. Any reintroduction of materials must occur solely through closed-loop mass conservation / erosion / reclamation mechanics (see DEC-028).

---

### Decision `DEC-024`: Unified Water Simulation Authority (`DEUS_Fluid`) & Legacy Flood Retirement (Ruling D-4)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED (PM)` (Owner may object; Directive 0035-AJ §1)
- **Decider:** PM (Grok Bot)
- **Summary:**
  1. **Single Water Authority:** The physical fluid solver `DEUS_Fluid` is established as the sole authoritative water simulation system in Project DEUS.
  2. **Retirement of Volume-Less Flood Fill:** The legacy flood-fill mechanism in `DEUS_Levels.js:3389` that generated water without conserved volume (audit WAT-1, F-05) is retired.
  3. **Reconciliation:** All four disparate water stores (WAT-5) converge onto `DEUS_Fluid`. The integration is validated in Playtest (F5) with `window.UF.Fluid`.

---

### Decision `DEC-025`: Nine SRD Culture and Faction Development Plans (Ruling D-6)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED (PM)` (Owner may object; Directive 0035-AJ §1)
- **Decider:** PM (Grok Bot)
- **Summary:**
  1. **Nine Culture Plans:** Each of the 9 SRD 5.1 races (Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling per `game/data/srd51/character_options.json`) receives its own dedicated culture and faction development plan (DEC-015, SOC.10.03 slots).
  2. **Catalog Expansion:** Expands the world catalog culture templates from 7 to 9.
  3. **Layer Mapping:** Specific race-to-home-layer assignments remain `OPEN` (DEC-013).

---

### Decision `DEC-026`: Calendar Scale vs Solar Day (`OWNER_OPEN`, Ruling D-1)
- **Date Logged:** 2026-09-26
- **Status:** `OPEN` (Owner question relayed by PM, Directive 0035-AJ §1)
- **Decider:** Owner
- **Question:** How should the game calendar reconcile the solar day with the annual seasonal cycle given VISION rule V123 (1 game day = 1 year, making seasons the four 6-hour quarters of a day)?
- **Options:**
  - Option A: Decouple the solar day from the calendar year (multi-day year with distinct diurnal cycles per season).
  - Option B: Retain V123 (1 day = 1 year; 6-hour micro-seasons).
  - Option C: Slow both the biological lifecycle clock and the calendar in lockstep.
- **Recommended Default:** Option A.
- **What Happens If Unanswered:** `SIM.50.06` (seasonal simulation) remains held until an authoritative ruling is recorded.

---

### Decision `DEC-027`: SRD 5.1 Combat Authority (d20 vs AC, SRD Damage, HP, Actions, Conditions; V64 Retired)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 08:20 CT, Directive 0062-BK)
- **Decider:** Owner
- **Summary:**
  1. **Authoritative Combat Law:** DEUS combat mechanics are canonically governed by SRD 5.1 rules — d20 attack rolls vs Armor Class (AC), SRD damage dice, SRD stat blocks/hit points, initiative, action economy, and conditions.
  2. **Retirement of V64:** VISION rule V64 (OSRS-style accuracy/strength combat) is formally RETIRED. Rule V47 is reinstated as the authoritative combat specification.
  3. **Data & Engine Integration:** The SRD 5.1 dataset in `game/data/srd51/` is authoritative for combat resolution. Rules are evaluated behind `UF.Rules` with pure, deterministic, seeded dice logic compatible with headless simulation under ADR-003.

---

### Decision `DEC-028`: Matter Conservation by Weight & Closed-Loop World Reclamation
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 08:25 CT, Directive 0063-BL)
- **Decider:** Owner
- **Summary:**
  1. **Conservation by Weight:** Every material, block, item, and structure carries an invariant weight. Mining a block yields items of equivalent aggregate weight; building consumes exact weight; structural collapse yields debris/rubble of identical weight. Matter is neither created nor destroyed.
  2. **World Terrain Reclamation:** The terrain slowly reclaims loose and abandoned outdoor items (stone, timber, bone, metal, corpses, ruins) by weight. When sufficient mass accumulates at a coordinate, it regenerates solid terrain blocks of the corresponding base material:
     - Stone / masonry rubble → solid stone.
     - Wood / organic detritus / corpses / bone → soil / fertile earth.
     - Metals → rust / scrap or trace mineral veins, never virgin ore veins (finite ore rule DEC-023 preserved).
  3. **Exemptions:** Items stored within active, claimed, or enclosed structures are exempt from reclamation.
  4. **Accounting Authority:** The per-class mass ledger `game/js/sim/ledger*` (`WG.65.15`) is the single authoritative accounting instrument across mining, construction, collapse (`SIM.40.01`), decay (`SIM.40.05`), and reclamation.
- **Amendment (Owner, 2026-10-01):** in item 2, the remains of spawned wildlife and monsters (corpses, bone) are outside the closed-mass ledger and never reclaim into conserved soil or fertile earth. The other reclamation rules are unchanged; see DEC-073.

---

### Decision `DEC-029`: Handling Policy for Credential Incidents (SEC-2026-09-26-01)
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling ~07:40 CT, Directive 0060-BI)
- **Decider:** Owner
- **Summary:**
  1. **In-Tree Remediation:** Incident `SEC-2026-09-26-01` (hardcoded API key literal committed in historical commit `224b1b36`) is resolved in-tree via Lane Z security tooling (`OPS.70.02`), removing the fallback and redacting references.
  2. **History Purge Declined:** The Owner explicitly DECLINED git history purges, filter-repo, or forced pushes on `origin/main` to preserve absolute commit immutability.
  3. **Revocation Authority:** Credential revocation is handled directly by the Owner externally.



### Decision DEC-030: World Grid and Vertical Biomes (Owner & PM delegated, 2026-09-26)
- **Vertical extent:** 32 layers (-16..+15). Top 4 layers (+12..+15) are reserved open air (no natural terrain). Natural terrain tops out at +11.
- **Biomes (6):** VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD.
- **Depth bands (5):** Deep Earth (-16..-11), Caverns (-10..-5), Lowlands (-4..+1), Uplands (+2..+6), Highlands (+7..+11).
- **Geology-first method:** Rock bodies span layers. Per-biome placement rules on top of geology. Vertical links: physical cause, surface tells, passages, shared resources.
- **Supersedes:** WG.00.04 (old 5 biomes) and DEC-013 band ranges. Replaces 25-biome drafting (Directive 0069-BR). Each of the 6 biomes is expressed across all 5 depths (30 biome-depth combinations).
- **World Map:** 3x3 grid of 256x256 maps (approx 768x768 tiles). Wraps on all edges (round world). Coarse resolution whole-world generation first. Current map runs full detail, other 8 run at ADR-003 LOD summary level.
- **Transitions:** 15 pairwise biome transitions (6 choose 2).
- **Engine Data:** Grid size is data so it can be re-scaled (e.g. to 4x4) later.
- **Map Edges:** Seamless transitions reuse Lane N's in-place swap, with no load screen.

---

### Decision `DEC-031`: Crossload Routing and Effort Policy
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 10:19 CT)
- **Decider:** Owner
- **Summary:**
  1. **Routing during Claude constraint:** While Claude is >=97% usage or Codex is exhausted: Writers = Grok (grok-4.7). Reviewers of Grok code = Gemini (or Claude if budget allows). Reviewers of Claude code = Grok. No model reviews its own code. Claude budget reserved for in-flight work.
  2. **Models:** Frontier only (no flash/mini/small tiers).
  3. **Effort by judgment:** `top` (grok xhigh / claude max / codex ultra) for hard/high-risk writing (sim engines, refactors) and its reviews; `high` for ordinary lanes and reviews; `medium` or lower for routine ops, pulses, and record-only work.
  4. **Tooling:** `pm_ops\start_review.ps1 -Provider gemini` runs Gemini reviews. Gemini reviews must touch only `tasks/<T>/<lane>/review_gemini_<sha8>.md`, use subject `[gemini] <T> review <sha8>`, and hold exactly one VERDICT line. lane.json reviewer must be `gemini`.

---

### Decision `DEC-032`: Owner Model Standard
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 11:23–11:24 CT, Directive 0082-CE)
- **Decider:** Owner
- **Summary:**
  1. **Tiers:** "Big" designates the hardest or highest-risk lanes: WG.00.17 (32-layer core), SIM.60.05 / SIM.60.06 (SRD combat), SIM.40.00 / SIM.40.11 (mass ledger), and SIM.00.01 (ADR-003 performance). Everything else is "Standard".
  2. **Claude:** Standard is `claude-opus-5-5` at effort `high`. Big is `claude-fable-5-1` at effort `max` (writer).
  3. **Codex:** Standard is `gpt-5.6-sol` at `xhigh`. Big is `gpt-6-astra` at `ultra`. Codex is exhausted account-wide (5.6 included) until Tue Sep 29 21:34 CT.
  4. **Gemini:** `gemini-3.1-pro-preview` at thinking `HIGH`, falling back to `gemini-3.8-flash` at thinking `HIGH` (Gemini CLI 0.61.0).
  5. **Grok:** `grok-4.7` at `xhigh`. `xhigh` is the Grok floor; nothing launches Grok below it.
  6. **Effort Floor:** Effort never falls below the tier standard, including on fallback models.
  7. **Fallback:** Step down each provider's model chain on limit errors, and return to the top model after the reset.
  8. **Multi-Agent:** On for every provider and role by default. The only exception is tiny routine or record-only jobs.
  9. **Reviews:** Never review your own provider's code.
  10. **Context:** Y and Z reviews that ran at high effort are being re-run at xhigh (launched 11:27 CT).

---

### Decision `DEC-033`: Recruitable Non-Core Humanoids, Capture/Domestication, and Tamed Party Creatures
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner rulings 12:59 CT and 13:01 CT, Directive 0096-CS)
- **Decider:** Owner
- **Summary:**
  1. **Recruitable Non-Core Humanoids:** Non-core humanoids (11 extra face cultures beyond the 9 SRD races: goblin, orc, kobold, etc.) can be persuaded or recruited into the player's party. They receive full paper-doll bodies on shared body templates (same layer and anchor rules as the 9 SRD races). Monstrous types (undead, elementals, etc.) remain fixed-sprite (no paper-doll).
  2. **Capture and Domestication:** Enemies and wildlife can be captured and tamed into pets, mounts, livestock, and work animals. Captured humanoids become prisoners or recruits.
  3. **Tamed Creatures in the Party:** Tamed creatures fight in the party using only their basic SRD 5.1 stat blocks and natural attacks and defenses. There are NO creature armor or equipment slots, no barding, and no crafted creature gear (Owner 13:01 CT ruling supersedes equipment exploration). A riding saddle is a visual marker only (no equipment slot, no mechanical stats).

---

### Decision `DEC-034`: Gemini Flash Final Merge Gate During Pro Quota Block
- **Date Logged:** 2026-09-26
- **Status:** `DECIDED` (Owner ruling 20:45 CT, Directive 0122-DR)
- **Decider:** Owner
- **Summary:**
  1. **Final Merge Gate Authorization:** `gemini-3.8-flash` (thinking `HIGH`) is authorized as the authoritative final merge gate while `gemini-3.1-pro` is quota-blocked (until the reset window ~2026-09-27 19:04 CT / 7:04 PM CT).
  2. **Supersession of Prior Pro-Required Holds:** Prior holds requiring a secondary or combined `gemini-3.1-pro` review pass before merge (e.g. Lane AA WG.00.17 second pass, Lane AL WG.20.01 combined pass) are superseded by an Owner-authorized Flash thinking `HIGH` review verdict.
  3. **Unblocking Downstream Writers:** With Flash final gate reviews completed (Lane AL CLEAN PASS at `c17da05f`, Lane AA PASS WITH NOTES at `d2c6614f`), Lane AA and Lane AL merges to `main` are executed (`1c2fcc28` and `c1bb4469`), unblocking dependent downstream writer lanes (SIM.40.11, SIM.50.13, COMBAT-U7, WORLD-ITEMS, DEPTH-DEMO).

---

### Decision `DEC-035`: Gate Tests Before Review, Mechanical Writer Effort, and Model Routing Rules
- **Date Logged:** 2026-09-27
- **Status:** `DECIDED` (Owner rulings 11:26 CT and 11:49 CT, Directives 0141-EK, 0142-EL)
- **Decider:** Owner
- **Summary:**
  1. **Gate Tests Before Review:** The PM runs every `lane.json` gate test on the writer tip, in a fresh clone, before launching any Gemini review. Any lane with a failing gate test goes back to a fix pass instead of review.
  2. **Writer Effort by Lane Type:** Grok writers stay at `xhigh` for simulation, worldgen, rendering, combat, AI, and tricky logic. `high` is permitted ONLY for purely mechanical lanes (data files, schemas, templates, catalog entries, formatting, simple specs). This supersedes DEC-032 item 5 ("xhigh is the Grok floor; nothing launches Grok below it") and the item 6 effort floor for mechanical Grok writer lanes only; big-tier lanes, reviews, and all other cases keep the floor. Implemented in Lane BC (`pm_ops/top_models.ps1` honoring explicit Grok `high` when `effortClass` is mechanical).
  3. **Model Routing Rule:** Quality first: the strongest available model at `xhigh` for hard logic (sim, worldgen, rendering, combat, AI, tooling logic); `high` effort or cheaper models only for purely mechanical work. When Claude/Codex return (Tue Sep 29) or Gemini 3.1 Pro resets (~7:04 PM CT today), re-route each task to whichever available model is strongest for it. Gemini 3.1 Pro becomes the merge-gate reviewer again once back (gemini-3.8-flash thinking HIGH remains the DEC-034 gate only while Pro is unavailable).

---

### Decision `DEC-036`: Race-Class Affinities, No Race-Class Locks, and Role Distribution Rule
- **Date Logged:** 2026-09-27
- **Status:** `DECIDED` (Owner rulings 11:59 CT, 12:30 CT, 12:31 CT, 12:33 CT, Directives 0143-EM, 0144-EN)
- **Decider:** Owner
- **Summary:**
  1. **No Race-Class Locks:** Every race can take every class without exception. No class is ever locked to any race. The three-axis person identity model (SOC.10.01) allows any combination.
  2. **Race-Class Affinity Table:** Each race receives small thematic affinities (a small bonus and town AI weighting). The authoritative table (Owner 12:30 CT, corrections at 12:31 CT and 12:33 CT):
     | Race | Affinity classes |
     |---|---|
     | Human | Fighter, Wizard, Cleric |
     | Dwarf | Paladin, Cleric, Rogue |
     | Elf | Ranger, Druid, Sorcerer |
     | Half-elf | Fighter, Druid, Bard |
     | Halfling | Fighter, Druid, Rogue |
     | Gnome | Fighter, Cleric, Wizard |
     | Half-orc | Barbarian, Druid, Fighter |
     | Tiefling | Fighter, Warlock, Cleric |
     | Dragonborn | Fighter, Monk, Cleric |
  3. **Role Distribution Rule:** Each race favours one tank, one healer, and one damage class. The Owner counts Ranger as a tank.
  4. **Unset Authoring Values (OWNER_TODO):**
     - Bonus size: `OWNER_TODO`
     - Job-pick weight: `OWNER_TODO`
     - Role tags for non-obvious rows (e.g. Half-elf Fighter/Druid/Bard, Half-orc Barbarian/Druid/Fighter): `OWNER_TODO`
     - Playtest starting suggestions (unapproved, pending Owner ruling): +1 on class main rolls, ~10% faster class XP, ~1.5x job-pick weight.
  5. **Cross-References:** DEC-013 item 5 (nine races), SOC.10.01 (person identity class axis allows any class for any race; merged at `099be7b9`), SOC.11.01 (2014 SRD class integration), SOC.13.01 (central duty scheduler). Planning task tracked in SOC.11.02.

---

### Decision `DEC-037`: Lean Natural World v1 Phase Lock & Causal Dependency Chain
- **Date Logged:** 2026-09-28
- **Status:** `DECIDED` (Owner Directive 2026-09-28)
- **Decider:** Owner
- **Summary:**
  1. **Lean Natural World v1 Phase Lock:** Engineering effort must focus strictly on what materially matters to completing a believable, deterministic, playable natural world. Defer luxury features, eliminate redundant systems, and trim speculative complexity.
  2. **Upstream-First Causal Dependency Order:**
     `Physical Space -> Physical Matter -> Water -> Geomorphology / Soil -> Climate -> Flora -> Fauna`.
     Do not implement downstream runtime systems until their upstream physical contracts exist and have passed required gates.
  3. **Tiered Allocation:**
     - **CORE:** Focus implementation and review resources on a few robust physical authorities.
     - **DERIVED:** Prefer outcomes emerging from core systems and prove them with tests; avoid redundant feature systems.
     - **ENRICHMENT:** Wait.
     - **PRESENTATION:** Wait unless needed for verification, within existing approvals and DEC-007.
     - **CIVILIZATION:** Frozen. No civilization, farming, faction, or society implementation under this phase.
     - **CUT / superseded:** Allocate no new work.
- **Focus (Owner, 2026-09-29: "All I want is the solid world generation and physics, water physics, lava, etc"):** engineering work narrows to two things: (1) world generation that fills all 32 layers with real geology by depth band (DEC-030), caves, ravines and the deep magma, and (2) the physics that runs on it: water (one water authority, flow across layers, aquifers, springs), lava (magma, flow, lava meeting water), matter (collapse when support is removed) and soil/sediment movement, each bridged into the running game and visible in F5. Climate, flora, fauna, UI features, society and the art pipeline wait; placeholder art only as far as the physics must be readable.
- **Amendment (Owner, 2026-10-01):** in item 2's chain, Fauna is no longer a population simulation downstream of Climate and Flora: wildlife and monsters are spawned at runtime from world-generation spawn designations (biome-depth cell, danger tier, encounter tables, lair and den anchors) and live conditions such as light and time of day. The spawner is built now, in its planned waves after the physics lanes it depends on, not after a climate or flora simulation; for the creature spawner this replaces "fauna" in the Focus paragraph's list of work that waits (2026-09-29); see DEC-073.

---

### Decision `DEC-038`: Lean Natural World v1 Physical Foundations & Mathematical Calibration (Amended)
- **Date Logged:** 2026-09-28
- **Status:** `DECIDED` (Owner rulings 2026-09-28 on Mathematical and Physical Foundations, with Final Ratification Amendments)
- **Decider:** Owner
- **Summary:**
  1. **Physical Continua over Categorical Biome Enums:** The fundamental physical authorities are four continuous dimensions: temperature, moisture, volcanism, and wildness, anchored to discrete physical elevation (stratum/Z). Biome designations (e.g. tundra, taiga, temperate marsh, primeval forest, arid scrub, geothermal caldera) are derived content/presentation labels, not primitive physics enums.
  2. **Restoration of Canonical Five-Band Depth Architecture:** The tested five-band vertical stratification is canonically restored:
     - Deep Earth: Z = -16 .. -11 (6 levels = 60 ft)
     - Caverns: Z = -10 .. -5 (6 levels = 60 ft)
     - Lowlands: Z = -4 .. +1 (6 levels = 60 ft)
     - Uplands: Z = +2 .. +6 (5 levels = 50 ft)
     - Highlands: Z = +7 .. +11 (5 levels = 50 ft)
     - Sky (Atmosphere): Z = +12 .. +15 (4 levels = 40 ft)
  3. **Authoritative Integer Internal-Unit Policy (Zero Ambiguity):**
     - Spatial Address: Integer cell (x, y, z) and stratum s in [0..4].
     - Mass: Integer centipounds (1 unit = 0.01 lb).
     - Water Mass: Authoritative mass in centipounds; display volume in derived gallons (1 gal = 834 centipounds).
     - Saturation: Integer basis points (0 .. 10000, where 10000 = 100.00%).
     - Hydraulic Head: Integer millistrata (1000 units = 1 stratum = 2 ft; elevation head relative to global bedrock datum).
     - Temperature: Integer centi-Fahrenheit (7250 = 72.50°F).
     - Simulation Time: Integer ticks.
  4. **Slope Generation via Continuous Target Gradient + Accumulated 2-ft Rasterization:** Rather than quantizing slopes to coarse cell multiples, the terrain generator accumulates continuous rise (accumulatedRise += 5 ft * targetSlope). When accumulatedRise >= 2 ft, elevation rises one stratum and decrements 2 ft, preserving the exact 2-ft vertical lattice while supporting arbitrary smooth grades.
  5. **Aquifer Equations & Hydraulic Precision (NAT.03.01):**
     - Total hydraulic head h = elevationHead + pressureHead using a global bedrock elevation datum.
     - Interface conductivity across adjacent cells uses the harmonic mean: K_interface = (2 * K_A * K_B) / (K_A + K_B).
     - Discrete flow calculations carry a deterministic fractional residual accumulator to prevent small flows from permanently truncating to zero. Net mass strictly conserved in ledger.
  6. **Configurable Climate Scaling:** Elevation cooling is defined as a configurable gameplay coefficient (CLIMATE_CONFIG.elevationScale = -35 centi-F/Z, initial baseline -0.35°F/Z) rather than a hardcoded atmospheric lapse rate, subject to tuning after playtest observation.
  7. **Natural World v1 Simulation Envelopes:** 32 Z vertically and 768x768 (3x3 regions) horizontally are formally declared as the Natural World v1 simulation envelopes, not permanent engine-level maximum ceilings.
  8. **Deterministic Calendar Math:** Authoritative 360-day calendar (12x30 days, 4x90 seasons) uses explicit zero-based day-of-year wrapping:
     dayOfYear = absoluteDay % 360 (0..359); month = Math.floor(dayOfYear / 30) + 1 (1..12); dayOfMonth = (dayOfYear % 30) + 1 (1..30); season = Math.floor(dayOfYear / 90) (0=Spring, 1=Summer, 2=Autumn, 3=Winter).
  9. **Ratification of NAT.03.01 in Lane bx:** Lean Aquifer & Water Table Kernel authorized for execution in lane-bx with MiniMax M3 writer and Grok reviewer under these exact specifications.

---

### Decision `DEC-039`: Rules-Source Hierarchy (SRD 5.1 -> Minecraft Reference -> DEUS Law)
- **Date Logged:** 2026-09-28
- **Status:** `DECIDED` (Owner Directive 2026-09-28)
- **Decider:** Owner
- **Summary:**
  1. **Canonical Five-Tier Rules Hierarchy:**
     1. **OWNER DECISIONS** (Project vision, architectural rulings, freezes, explicit directives).
     2. **SRD 5.1 (CC-BY-4.0)** (Creatures, class/spell mechanics, ability scores, combat, saving throws, core traits).
     3. **VANILLA MINECRAFT (Java Edition Stable Behavior)** (Default behavioral/gameplay reference when SRD is silent or too abstract for a simulated world).
     4. **DEUS-SPECIFIC PHYSICAL INTERPRETATION** (Translation to 5-ft lattice, 32 Z, 2-ft strata, continuous coordinates, closed mass).
     5. **ORIGINAL DEUS CONTENT** (Original pixel art, lore, factions, original code; zero asset copying).
  2. **Core Operational Rule:** Use the SRD wherever it gives an answer. When the SRD is silent or too abstract to define a functioning simulated world, use vanilla Minecraft Java Edition as the default behavioral reference unless an explicit DEUS decision overrides it.
  3. **Behavior Reference vs Implementation:** Copy gameplay logic and reference behavior, NEVER textures, source code, sounds, names, or art.
  4. **World Generation vs Regeneration Philosophy:**
     - **Generation Order:** `WORLD SEED -> base terrain -> geology -> water -> soil/environment -> vegetation -> fauna/monsters -> structures/features`. Establishes initial world state.
     - **Regeneration Law:** Regeneration happens ONLY through physical world rules (seed dispersal, suitable soil/light/moisture for plants; breeding/migration for wildlife). Zero magic chunk reload respawning or arbitrary respawn timers. Supernatural entities follow explicit SRD rules.
  5. **Minecraft Rule Record Format:** Every Minecraft-derived DEUS specification must document: `SOURCE`, `REFERENCE BEHAVIOR`, `DEUS TRANSLATION`, and `DEVIATIONS`.
- **Amendment (Owner, 2026-10-01):** item 4's Regeneration Law no longer applies to wildlife and monsters: they do not regenerate by breeding or migration but are spawned and despawned at runtime, Minecraft-style, by seeded intelligent rules (biome-depth cell, danger tier, encounter tables, light, time of day, season (weights off while DEC-059 defers seasons), density caps, herd sizes, distance from the player, starts and settlements). Plants still regenerate by physical world rules, the ban on chunk-reload respawning and arbitrary respawn timers still holds for everything else, and supernatural entities still follow explicit SRD rules. An area thinned by heavy hunting refills by those rules after a few in-game days, and finite minerals never spawn (DEC-023). In the Generation Order, the fauna/monsters step sets down spawn designations, lairs and dens and notable creatures; ordinary wildlife and monsters are transient spawns, not stored world state; see DEC-073.

---

### Decision `DEC-040`: Universal Closed-Mass World Invariant & Magma/Core Reservoirs
- **Date Logged:** 2026-09-28
- **Status:** `DECIDED` (Owner Directive 2026-09-28)
- **Decider:** Owner
- **Summary:**
  1. **Master Conservation Law:** Project DEUS is a closed-mass world. Matter may move, combine, separate, change phase, decay, burn, be eaten, mined, crafted, carried, dissolved, or transformed—but total world mass never changes:
     $$\text{WORLD\_TOTAL\_MASS}(t) \equiv \text{WORLD\_TOTAL\_MASS}(\text{Year 0})$$
     Strictly enforced in authoritative integer centipounds ($1\text{ unit} = 0.01\text{ lb}$).
  2. **No Deletion Sinks:** No sink—including lava, deep earth, fire, decay, digestion, or offscreen simulation—may delete matter. Every transformation identifies source reservoir, destination reservoir, and conserved transferred mass.
  3. **Core Environmental Reservoirs:** Solid strata, loose items/rubble, carried/container inventory, liquid water/groundwater, atmospheric/gaseous products, living plant biomass, creature body mass, magma/core reservoirs.
  4. **Subsystem Conservation Contracts:**
     - **Mining/Excavation:** Displaced solid stratum mass transfers exactly to loose rubble/ore item mass.
     - **Logging/Harvesting:** Plant biomass transfers into logs, branches, stumps, crop food, and seeds.
     - **Fauna/Digestion:** Consumed food transfers to creature body mass and waste; death transfers body mass to corpse, meat, bones, hide, and decay products.
     - **Smelting/Burning:** Wood/ore mass transfers exactly into metal, slag, ash, and smoke/combustion gases.
  5. **Magma & Planetary Core as Mass-Bearing Reservoirs:**
     - Lava is a mass-transfer and transformation system, not a deletion sink.
     - Matter engulfed by lava melts/decomposes into magma mass, dissolved minerals, and volcanic gases/ash.
     - Magma reservoirs track mass, temperature, pressure, density, viscosity, volatile load, and composition.
     - Magma outputs (eruptions, intrusions, basalt ridges, ash clouds, geothermal deposits) transfer mass out of the magma reservoir with exact balance.
     - Deep Earth ($Z \in [-16 \dots -11]$) interfaces with an aggregated mantle/core reservoir beneath the playable 32-Z stack. The planetary core is not an infinite material faucet.
- **Owner Clarification (2026-09-29, given directly to Claude Code in chat): scope and intent.** Where this differs from the summary above, this governs. Owner's words: "The mass conservation is specifically for natural world materials like Stone, iron, copper, etc"; "Anything that is generated with the world, it's mined, crafted, etc, rusts, breaks, eventually reclaimed by the world, and across that timeline the mass stays the same, so that reclaimed items end up becoming the same amount [of] earth ... its not meant to [hamstring] soil because soil weighs more than sand"; "Water, yes ... Plants, creatures, gases are not as important. The intent is that water, lava, and the natural world are able to erode, reclaim, and keep the natural world going so it doesnt eventually become a million crafted items because nothing ever degrades ... But that degradation has to form a world of equal mass as the world it came from ... its not a semantic chemistry/physics thing to complicate soil."
  - **Purpose:** the natural world renews itself. Water, lava and natural processes erode, degrade and reclaim what is mined, built or crafted, and what they reclaim returns as the same weight of natural material.
  - **Conserved:** material generated with the world (stone, soil, sand, clay, ores, and metals such as iron and copper) through its whole life (mined, crafted, rusted, broken, reclaimed), plus water. Lava and magma remain transfer paths (item 5).
  - **Out of scope:** plants, creatures and gases are not part of this rule. The Owner, correcting an earlier "lower priority" wording the same day: "I dont care about these. thats not my intent."
  - **Weight, not chemistry:** the ledger counts weight. Material type, volume and density may change along the way; soil weighs more than sand. This is not a chemistry or physics exercise and must not complicate soil.
  - **Blocking defects:** material or water that appears from nothing, or disappears without a destination.
- **Water never leaves (Owner, 2026-09-29: "One more rule tho: Any water that leaves the world, rains back into the world"):** water is a closed loop. Water that leaves the simulated world by any route (off a map edge, out of the bottom layer, into a drain or sink, evaporated past the modelled air) is not deleted: its mass is held and returns to the world as rain. There is no water deletion sink anywhere (this retires the "sink" wording in INV-FLD-02).
- **Amendment (Owner, 2026-10-01):** spawned wildlife and monster bodies sit outside the closed-mass ledger (as the 2026-09-29 clarification puts creatures out of scope), so spawning or despawning one is neither a mass source nor a deletion sink under items 2 and 4. A despawning creature drops any conserved world material it carries, and spawned-creature remains never become conserved soil; see DEC-073.

---

### Decision `DEC-041`: 24/7 Multi-Agent Orchestration Architecture & Natural World v1 Exit Gate
- **Date Logged:** 2026-09-28
- **Status:** `DECIDED` (Owner Directive 2026-09-28)
- **Decider:** Owner
- **Summary:**
  1. **Campaign & Execution Architecture:**
     - `/teamwork-preview`: Multi-day Natural World campaign coordinator.
     - `/goal`: Bounded current task objectives (single-lane completion through review, gate, and merge).
     - `/schedule`: Idempotent 5-minute watchdog pulse (`*/5 * * * *`).
  2. **Watchdog Idempotency & Per-Lane Leases:**
     - Every pulse verifies: worker active (PID + output stream), review active, merge in progress, SHA reviewed, lane merged, Owner approval present.
     - If an active lease exists, the watchdog observes; it never launches duplicate workers or reviews.
     - If rate-limited, records timestamp in `provider_status.json` and sleeps until reset without spinning context.
  3. **Strict Lane Exit States:** Every lane terminates in exactly one of: `MERGED`, `REJECTED`, `SUPERSEDED`, or `PAUSED-BLOCKED`.
  4. **Automated Worktree Archiving:** Worktrees are removed (`git worktree remove`) ONLY after merge SHA, remote push, review evidence, and task report are safely recorded on `main`.
  5. **Hard Owner Package Gates:** Orchestration autonomously advances approved leaves through `Writer -> Verify -> Review -> Merge Gate -> Main`. However, upon package completion (e.g. Package 3 Water -> Package 4 Soil), it produces read-only preflight and proposal, then HALTS for explicit Owner approval before opening implementation lanes.
  6. **Single Machine-Readable Canonical Registry:** Master truth resides in `tasks/wbs_registry.json`. Markdown WBS and `docs/STATUS.md` derive from or reference this registry.
  7. **Natural World v1 Exit Gate (Final 12-Point Scenario):**
     Before final Natural World v1 sign-off, a fixed-seed in-engine scenario must prove:
     1. World topology survives region seams and save/load cycles;
     2. Physical world objects remain persistent;
     3. Excavation exposes predetermined geological strata;
     4. Unsupported terrain triggers cascading collapse into rubble;
     5. Groundwater breach produces conserved Darcy seepage;
     6. Groundwater and surface water hydrate soil moisture;
     7. Terrain elevation and volcanism dynamically drive continuous climate;
     8. Soil moisture, light, and temperature govern plant germination and growth;
     9. Vegetation biomass determines herbivore carrying capacity;
     10. Wildlife populations persist and reproduce rather than arbitrarily respawning;
     11. Full region unload and reload reproduces bit-identical state;
     12. Quiescent sleep guarantees zero global full-world per-frame scans.
- **Amendment (Owner, 2026-10-01):** in item 7, points 9 and 10 (already deferred by DEC-057) are withdrawn for wildlife and monsters: there is no carrying capacity or breeding for them; the seeded spawner places them, they despawn only when far away and out of sight (DEC-080: kept as counts per spawn anchor away from the player instead, in every area), and tamed, captured, named, quest and lair creatures, and any creature carrying items, persist. Point 11's bit-identical state excludes transient spawned creatures and still includes spawn designations, lairs and dens, the depletion record and notable creatures; see DEC-073.


---

### Decision `DEC-042`: Claude Code is the current PM
- **Date Logged:** 2026-09-29
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-29: "You are the current PM")
- **Decider:** Owner
- **Summary:** Claude Code holds the PM role from 2026-09-29: it interprets Owner intent, records Owner decisions in this file, opens and closes lanes (`[pm]` commits to `tasks/<id>/<lane>/lane.json`, which `tools/governance/merge_gate.js` trusts), routes review, and presents QA-passed art to the Owner for sign-off (DEC-007 amendment). Gemini / Antigravity remains the coordinator for its own worker fleet and keeps the integration duties it already has; the merge gate stays the only way into `main` for reviewed code. Where `docs/CANONICAL_ROLES.md` or older briefs say otherwise, this decision governs until the roles document is rewritten. Zero self-certification still applies to the PM: the PM never reviews its own family's code.
- **Amendment (Owner, 2026-09-29, "Sometimes I just quickly articulate a feature I want, its fine."):** a feature the Owner states in chat to any agent is an Owner directive and its own authorization, including inside a frozen phase (only as far as the words go). The agent may build it at once and commit it; the commit message quotes the Owner's words and carries the tag `[owner-request]`. The PM records the words and routes an independent review after the fact; defects found go back as fix commits. The PM does not treat such work as a process violation. Owner, same day: "If you see something I passed directly to gemini to do for me, thats fine." This covers anything the Owner hands an agent directly, art included. First cases the same day, all to Antigravity: the 0.5×–3× zoom slider (`105e18aa`), the title-screen menu fixes and 14-biome carousel, click-a-unit inventory on the right with drag-and-drop equipment slots.
- **Amendment (Owner, 2026-09-29: "Your job is to keep AG laser focused on completion of WBS tasks with minimal side-show bullshit, or weird plugins that are features / emergent states as opposed to things to program."):** the PM holds the coordinator to finishing WBS leaves. Work that is not a WBS leaf or an Owner request is a side-show and is stopped. A plugin that hard-codes an outcome the simulation should produce by itself (a feature or state that ought to emerge from general systems plus data) is refused in favour of the general system (V16, V125, ENGINEERING_STANDARD System + Data = Content). Each pulse, the PM reports AG’s work as WBS progress versus side-show.

---

### Decision `DEC-043`: Construction and crafting model (recorded design; implementation deferred)
- **Date Logged:** 2026-09-29
- **Status:** `DECIDED` as design direction (Owner, in chat with Claude Code, 2026-09-29). **Not a lane authorization:** building and crafting are civilization systems and stay frozen under DEC-037 until the Owner opens them.
- **Decider:** Owner
- **Summary (Owner's words, lightly trimmed):** "The way building will work, is there will be a 'Ghost model' when there is intent to build. The ghost model will also have a black box inventory like a creature. Once the correct construction items are placed in the ghost model, you can click 'Construct', the model will become 'the under construction model' and then once construction is complete, there will be the final model. Crafting works the same way. Say there's a workbench, there will be a black inventory box on the workbench, and then the opportunity to 'combine', the creature will make a craft attempt. All of this bears in mind skill checks using SRD."
  1. **Three build states per structure:** ghost (intent), under construction, final. Each is a distinct model.
  2. **Ghost model inventory:** a ghost holds a black-box inventory like a creature's; construction begins ("Construct") only when the required items are inside it.
  3. **Crafting is the same pattern at a workbench:** the workbench has a black-box inventory; "Combine" makes the creature attempt the craft.
  4. **Skill checks:** construction and craft attempts use SRD 5.1 skill checks (DEC-039).
  5. **Closed mass (DEC-040):** the items placed in a ghost or workbench are the material of the result; nothing is created from nothing.
- **Art implication (when opened):** every buildable structure needs ghost, under-construction and final art; every workbench needs an interior-inventory presentation. Catalogue records first, per DEC-007.

---

### Decision `DEC-045`: Ground tile variants and the gradient placement rule
- **Date Logged:** 2026-09-29
- **Status:** `DECIDED` (Owner directive "I want more variants of each type of tile so there's a gradient on the ground", then "Use your judgement" on the four rulings below; rulings made by the PM, Claude Code, under that delegation, DEC-042)
- **Decider:** Owner (design and rulings delegated to the PM)
- **Summary:**
  1. **Design adopted: "Dryness Triplets".** Every gradient ground kind gets painted variants, damp (V1), base (V2) and dry (V3); the four most-seen kinds (meadow, dirt, forest_floor, dry_grass) may carry four or five. Built or impassable kinds (road, floor_wood, floor_stone, floor_rushes, peak_rock) stay uniform. V2 is tool-tiled 2×3 into the kind's existing A2 autotile block (which also closes AUDIT_LOG A9-1, the 22 unpainted A2 kinds). V1/V3 (and any V4/V5) are 48×48 stamps placed per cell on map layer 1 by `DEUS_Tiles` from the existing dryness field, with per-kind quantile bands, ±1-step smoothing and despeckle, so no cell jumps from damp to dry and the drift continues across `joins()` families. Derived at area build, never saved, no per-frame work, no runtime tint. Readability rule: variants of one kind stay within one grey-value step and keep their hue; the driest look of a kind must still read apart from the dampest look of any kind it borders.
  2. **Sheet slot ruling:** ground variants take the D tile sheet (`game/img/tilesets/DEUS_GroundVar_D.png`, ids 512+4k+j). The older reservation of D for biome-edge fringes (`docs/art/DEUS_TILESET_SCALE_STANDARD.md`) is superseded; fringes move to A5 when they exist. WG.30.01's allocation is amended the same way.
  3. **Renderer ruling:** build on today's RMMZ A2 autotile + layer-1 overlay path now. AS-TERR-001's Wang dual-grid renderer stays a future option; the 48 px plain stamps made here are the fills it would need, so nothing is thrown away.
  4. **AG's 26 tiles in `art/tilesets/individual_48/`:** made with `create_image_pro_flash`, which is not an OBJECTS or MAPS tool (DEC-007 amendment), and 14 of 26 fail the repository seam test. Not used. All 26 kinds are regenerated through PixelLab Maps → Tiles (tile groups, square top-down, 48 px, view high top-down, no outline; API `create_tiles_pro`), one tile group per ground kind holding its variants, catalogue rows first. Owner confirmation 2026-09-29: "For tiles, I want to use the tiles generation tho." (PM-made ground is now Pixflux and Bitforge, DEC-063; tile sets the Owner made stand and are not redone, DEC-063 item 7.)
  5. **WBS:** this fulfils **WG.21.01** "Ground Autotile & Macro-Variety Rules" (`docs/worldgen/DEUS_WORLDGEN_WBS.md:151`), reassigned from Gemini to a split lane: runtime and tooling by Claude, generation by Gemini/Antigravity under the SOP, review by Grok. No new leaf is opened.
  6. **Pipeline:** catalogue rows (68: `SURFACE_SHARED_TERRAIN_<KIND>_V1..V3_DEFAULT`, status REQUESTED) are committed before any call; one pilot kind is generated first and shown to the Owner as a 10-minute strip to lock the prompt; then three batches; every stamp passes `tools/art/check_ground_variants.js` (48×48, opaque, master palette, ≤8 colours per stamp, self-seam ≤1.0, pair-seam V1|V2 and V2|V3 ≤1.25, one-value-step order, family readability) before it reaches the Owner's board; Owner sign-off per stamp in the SHA-256 ledger; placement tooling writes the sheets; in-game proof is an F5 screenshot at zoom 1 of a meadow-to-dry-grass drift with no quarter misalignment.
  7. **Scope not covered here (future rulings):** hilltop levels (+1/+2) and underground floors (tileset 92 looks); corner blends between variants; retiring the code-dithered shade painter is a reversible switch (`groundShades.render`), not a deletion.

---

### Decision `DEC-046`: Natural-phenomena presentation: integrity indicators and sprite animations
- **Date Logged:** 2026-09-29
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-29)
- **Decider:** Owner
- **Owner's words:** "for natural phenomena ingame, like water pressure breaking a barrier of earth, etc, I want visual indicators of weakening structural integrity, etc, as well as animations for all of the shifting and rearranging of the natural world."
- **Summary:**
  1. **Three presentation parts for every natural process that changes the world:** (a) a **pre-failure indicator ladder** on the affected cells, at least three states (sound, strained, failing), driven by the simulation's real state, never by a timer: structural load from NAT.02.01, hydraulic head against a barrier from NAT.03.01, moisture and repose from NAT.04.01, heat from lava; (b) a **transient sprite animation** for the change itself: cave-in (falling debris, dust), slide (sediment cascade), breach (water burst through earth), erosion (sediment plume), freeze/thaw, lava meeting water (steam, quench), fire spread and burn-out; (c) **persistent aftermath art**: rubble, deposited sediment, flooded cells, scars, ash.
  2. **Rule 12 stands:** every motion is sprite frames on the sheets; no procedural motion, tint, scale or shader.
  3. **Art follows the DEC-007 amendment:** one catalogue row per state and per animation (frame count and rate recorded), OBJECTS/MAPS tools only, QA, boards to the Owner, ledger sign-off, then induction. If the allowed PixelLab tools cannot produce a frame sequence for an effect, the PM reports that gap to the Owner rather than substituting a banned tool or code-drawn motion.
  4. **Order (DEC-037):** design and catalogue now; runtime hooks land with each package's engine bridge (soil with lane-cf; collapse indicators with the NAT.02.01 bridge). Water pressure breaking an earth barrier needs a rule that does not exist yet: this decision opens **NAT.02.02 Barrier integrity and breach** (barrier cells carry an integrity value fed by hydraulic head, load and moisture; failure moves the water and the earth with closed mass) and **ART.NAT.01 Natural-phenomena presentation set** (the state ladders, animations and aftermath rows). The PM assigns both.
- **Owner Amendment (2026-09-30, in chat with Claude Code): static first, animation deferred.** Owner's words: "We dont need do animate the natural world yet btw. I want everything visually represented, but not necessarily animated yet. Animations can wait".
  - **Now:** every natural-world thing the simulation produces gets a visual: at least one static frame (tile, object or state art). This covers terrain, flora, rock, water, lava, the indicator ladder states in part 1(a) and the aftermath art in part 1(c). QA checks style, dimensions, camera and readability; for natural-world art, working animation is not a QA gate for now.
  - **Deferred:** the transient animations in part 1(b), and multi-frame loops for trees, water, fire and the like. Catalogue rows may record the planned frame count as a later field; nothing waits on animation frames.
  - **Unchanged:** Rule 12. A static sprite stays static; the engine never fakes motion with tint, scale, sway or shaders to cover the missing frames. DEC-007 still governs who generates art and the Owner's sign-off.

---

### Decision `DEC-047`: Tripartite Overarching Art Directive (English Folklore / Ultima VII / Classic Everquest)
- **Date Logged:** 2026-09-29
- **Status:** `DECIDED` (Owner directive: "I want the prompts to reference the art styles of British / U7 / everquest these are overarching art directives"; Owner correction 2026-09-29: "Not english countryside, english folklore flavor to the game.")
- **Decider:** Owner
- **Summary:**
  All prompt generation, style references, environment art, and world prop production across Project DEUS must adhere to the three foundational style pillars:
  1. **English Folklore Flavor:** Authentically grounded in English folklore in the spirit of British Isles mythology and mystery (e.g. the fair folk and the hollow hill, barrows and standing stones, fairy rings, holy wells, wyrm lairs, knocker-haunted mine seams, will-o'-the-wisp bogs, black dogs, boggarts, giants, church-carving devils). Owner's exact words: "Not english countryside, english folklore flavor to the game."
  2. **Ultima VII (The Black Gate / Serpent Isle) World Density & Tactile Grit:** 90s Western CRPG pixel density, tangible interactable environmental clutter, rich earthy palette midtones, grounded contact shadows, high top-down readability, and zero plastic vector smoothing. (AS-LOCK-001: no outlines on terrain; AS-VIEW-002: high top-down view).
  3. **Classic Everquest (1999 Norrath / Antonica / Faydwer) Nostalgic Wilderness:** Evocative high-fantasy adventure ambiance, untamed frontier wilderness (misty plains, primeval canopy, craggy bandit hills), ancient megalithic ruins/standing stones reclaimed by roots, high-stakes exploration mood.
  - **Canonical Style Tail:** `world feel: English folklore, in the spirit of Ultima VII and EverQuest`



---

### Decision `DEC-048`: AG proposes, the PM executes (coordinator limits)
- **Date Logged:** 2026-09-30
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-30: "yes and yes"; this ruling is the second "yes")
- **Decider:** Owner
- **Background:**
  - Two independent braintrust process evaluations (PROCEVAL: Grok Heavy and Gemini Pro, 2026-09-30) found the coordinator over-empowered.
  - In one day of PM checks against git, AG:
    - force-removed a worktree that held 15.5 KB of uncommitted work;
    - edited main's working copy;
    - reported usage numbers that had no source;
    - reported a worktree count that was wrong;
    - staffed a packet at a quarter of the size asked;
    - built a status board with 10 phantom archive rows.
  - Both evaluations recommended that AG proposes and the PM executes, with rules enforced by machine before the fact, not by review afterwards.
- **Summary:**
  1. **AG no longer:**
     - commits to main (except its own mail lines until mail moves off main);
     - runs merge_gate or merges anything;
     - removes worktrees or branches, drops stashes, uses `--force`, `git clean`, or `reset --hard` outside a lane it owns;
     - edits files in main's working copy.
  2. **AG still:**
     - dispatches writers and reviewers into lane worktrees; writers commit and push their own `task/*` branches;
     - sends mail;
     - runs read-only commands.
     A lane ready to merge is announced as MERGE-READY (lane, tip, review file, gate result).
  3. **The PM (Claude) executes:**
     - merge_gate `--no-ff` after checking that the reviewer's CLEAN PASS is on the tip;
     - worktree and branch removal;
     - archive moves on main;
     - Owner-decision commits.
  4. **Machine enforcement:** hooks that make these limits hold without anyone's good behaviour. They are designed through the braintrust, built in one lane under the PM (not by AG), reviewed by a different family, and installed by the PM. Until then the limits bind as rules.
  5. The writer/reviewer family split and merge_gate stay as they are.
- **Amendment (Owner, 2026-10-01):** once lane-gg (merge_gate authorship check) merges, AG may run merge_gate itself under the limits of DEC-082 item 3; until then the PM merges. See DEC-082.

---

### Decision `DEC-049`: Design program for deep geology and magma, one water authority with lava, and collapse
- **Date Logged:** 2026-09-30
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-30: "yes and yes"; this ruling is the first "yes")
- **Decider:** Owner
- **Background:** The braintrust system evaluation (SYSEVAL B01/B03, Grok Heavy, PM-checked against the code, 2026-09-30) found that the Owner's stated want (DEC-037 focus) is largely unbuilt:
  - `DEUS_Levels.js:1356-1361` makes every layer outside the core uniform stone or air;
  - lava exists only as a hard-coded `z === -2` (`DEUS_Levels.js:1379`);
  - runtime collapse is absent (`effectiveSupport` is diagnostic only, `DEUS_Levels.js:2333`, and the NAT.02.01 engine is not bridged);
  - three bodies of code model water (`DEUS_Fluid` + `sim/hydro`, the NAT.03.01 kernel `sim/hydrology`, and Levels' flood BFS);
  - water meeting lava sets an overlay bit only.
- **Summary:** Claude runs three designs through the braintrust and brings each to the Owner before any new WBS leaf opens:
  - **D1:** deep geology by depth band across all 32 layers, with caves, ravines and deep magma (DEC-030, DEC-038 bands, DEC-040 magma/core reservoirs).
  - **D2:** one water authority (surface fluid, groundwater and the flood overlay unified), plus lava as a fluid and the water/lava meeting under the DEC-040 mass ledger.
  - **D3:** the runtime collapse bridge (NAT.02.01 into the game), with the DEC-046 integrity indicators, static first.

  Each design names:
  - its WBS leaves;
  - the tests that must fail without it;
  - the order that respects DEC-037's upstream-first chain.

  Implementation starts only on the Owner's approval of the design.

---

### Decision `DEC-050`: Nine race starts spread across the layers, a danger gradient between them, and an SRD bestiary per biome
- **Date Logged:** 2026-09-30
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-30)
- **Decider:** Owner
- **Owner's words:** "The way I want world generation to work is the 9 races start relatively equidistant from eqach other across the layers. Monsters are easier near the starting areas and more dangerous in the pockets between. I want the SRD monsters catalogued and assigned to each biome. Same with wildlife. That way we can flesh out the entire biome"
- **Summary:**
  1. **Race starts:** world generation places the nine races' starting areas (DEC-013) relatively equidistant from one another in three dimensions, across the 32 layers, not only across the surface. This gives the spacing rule for DEC-013's open race-to-layer question. The per-race home ranges come from the braintrust design (D4) and need Owner approval.
  2. **Danger gradient:** creature difficulty is low near every starting area and rises in the pockets between them. Challenge rating is driven by a world danger field that is derived from the starts, deterministic from the seed.
  3. **Bestiary per biome:** all 317 SRD 5.1 creatures (`game/data/srd51/creatures.json`) and the wildlife species are catalogued and assigned to the 30 biome-depth cells of DEC-030: 6 families (VOLCANIC, WET, ARID, TEMPERATE, COLD, WILD) x 5 vertical varieties (Deep Earth, Caverns, Lowlands, Uplands, Highlands). The Owner confirmed this the same day: "There should be 6 biome families, with 5 varieties vertically each." Each creature carries a danger tier from CR. The assignment lives in a DEUS-owned layer keyed by `srd:` ids. `srd51` records are never edited. A record is verified when it is activated for gameplay (SRD policy, 2026-09-22).
  4. **Order (PM default; the Owner may change it):** the layout design (D4) and the bestiary run through the braintrust now. Placement of starts is part of world generation, so it joins D1. Runtime creature spawning follows the physics work (DEC-037 chain) unless the Owner brings it forward.
- **Amendment (Owner, 2026-10-01):** item 4's "Runtime creature spawning follows the physics work" is replaced: the runtime spawner is the creature model and is built now, in the natural-world build, by lane-fc, lane-fe, lane-ff and lane-fi in their planned waves after the physics lanes they depend on. It picks creatures by the danger tier of item 2 and the biome bestiary of item 3; see DEC-073.

---

### Decision `DEC-051`: One set of directives, kept in sync as we go
- **Date Logged:** 2026-09-30
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-30)
- **Decider:** Owner
- **Owner's words:** "Sync and correct files in the repo / markdowns, etc as we progress. Everyhting should be synced up so there arent different directives about"
- **Summary:**
  1. **Every ruling lands everywhere it applies, in the same change.** When the Owner rules, the PM updates every file that states the old directive:
     - AGENTS.md, CLAUDE.md, GEMINI.md and `.agents/rules/*`;
     - VISION, STATUS, the WBS and design docs;
     - registries and catalogues.
     Governance and decision docs are PM edits on main. Data, code and tooling changes go to a reviewed lane (DEC-048).
  2. **Superseded text is marked, not left standing:** it points to the decision that replaced it. Deleting history is not required; contradicting it is not allowed.
  3. **Precedence while syncing:** the Owner's latest explicit ruling wins, then OWNER_DECISIONS in date order, then AGENTS.md, then everything else.
  4. **A sweep now:** the braintrust lists every live contradiction across the directive docs. The PM applies the governance fixes and dispatches the data and tooling fixes. Examples already found:
     - the 5-family art biome registry vs DEC-030's 6 families;
     - DEC-013 band ranges vs DEC-030/DEC-038;
     - the "mandatory Nano Banana Pro" and "Gemini makes the non-living art" lines vs DEC-007 (the Owner generates all art);
     - Claude's older role text vs DEC-042 and DEC-048.

---

### Decision `DEC-052`: The system under control: real work only, braintrust-answerable, trackable, traceable, serialized, codified
- **Date Logged:** 2026-09-30
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-30)
- **Decider:** Owner
- **Owner's words:**
  - "I want the entire project aligned and organized and correct. I want everything synced and prune what doesnt belong"
  - "The entire system should be under control"
  - "Trackable, traceable, serialized"
  - "consistently, and codified"
  - "I dont want AIs working on bullshit fake work anymore either. Every work assigned should be evaluated and answeredable to the brain trust"
- **Summary:**
  1. **Real work only; a braintrust gate before work starts.** No lane, packet or worker is dispatched until its brief has passed a braintrust WORK-GATE, which the PM runs in the chats.
     - Every brief states: the Owner want or decision it serves (DEC-037 focus first); evidence that the need is real; scope; files; the tests that must fail without it; size; and the writer and reviewer families.
     - Verdicts: REAL (go), RESCOPE (change it, then go) or NOT-NOW/FAKE (do not start).
     - Work already in flight is gated retroactively.
  2. **Answerable at the end.** A finished lane's claims are checked against evidence: tests that can fail, a mass or behaviour check where it applies, and F5 where it applies. A braintrust voice judges whether the result does what the brief promised before the PM merges. Rejected work is reported, not hidden.
  3. **Trackable and serialized.** Every unit of work, decision, braintrust job, mail and merge has a serial ID and a record: WBS leaf or OPS id, lane, BT-job id, mail id, commit. One registry lists the live items and their state.
  4. **Traceable.** Every change links back along the chain Owner decision -> WBS leaf -> brief -> gate verdict -> lane -> commits -> review -> merge -> STATUS row. A change without a link is out of control and is flagged.
  5. **Consistent and codified.** Rules live as machine checks wherever possible, not only as prose: the DEC-048 hooks (CLAMP), the control-board test, the mail v2 validator, a registry/trace checker, and a directive-sync check (DEC-051). A rule that exists only in prose is a gap to close.
  6. **Aligned and pruned.** An ALIGN program inventories the whole repo and prunes what does not belong, by archive and always reversibly, under the order and gates already set (DEC-048, the prune lanes).
  7. **Self-improving (Owner amendment, 2026-09-30: “Also I want every process refined and improved over time. our deus ecosystem should be self improving”):**
     - Every finished lane, braintrust job and merge leaves a short after-action record: what went wrong, what rule or check would have caught it, and the cost.
     - The PM tracks the process metrics: idle chat minutes, quota unused at reset, claim-mismatch rate, review misses, gate verdicts, and cycle time from brief to merge.
     - At a regular cadence, a braintrust PROCESS-IMPROVE job reviews the after-action log and the metrics and proposes changes. The PM codifies the accepted ones as checks or tools first and prose second. Governance changes go to the Owner.
     - Each improvement is serialized and traced like any other work.

---

### Decision `DEC-053`: All SRD 5.1 content is in Emerys
- **Date Logged:** 2026-09-30
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-09-30)
- **Decider:** Owner
- **Owner's words:** "Catalogue all of the items, enemies, etc in SRD, include anything in SRD in our world. Thats free content."
- **Summary:**
  1. **Everything in `game/data/srd51` (1,325 records) is included in the world of Emerys:**
     - 317 creatures;
     - 226 equipment items (armor, weapons, gear, tools, vehicles, mounts, trade goods);
     - 240 magic items;
     - 319 spells;
     - 39 character options (the nine races, which are the SRD races; 12 classes; subclasses; background; feat);
     - 176 rules, including 28 hazards and 15 conditions.

     SRD 5.1 has no product-identity creatures; any found are flagged and renamed.
  2. **Each record gets a DEUS adaptation row in a DEUS-owned layer keyed by its `srd:` id.** `srd51` itself is never edited. The row places the record in the world:
     - creatures: DEC-050 biome-depth cell and danger tier;
     - items: where found (loot tier, lair hoard, merchant, crafted by which peoples), materials and mass (DEC-040), rarity;
     - spells: who casts them and their physical effect (the SIM.60.01 audit);
     - hazards: which biome cells and which physics system owns them;
     - character options: the nine peoples' cultures and classes (civilization stays frozen for runtime; the catalogue work is allowed).
  3. **This updates the SRD readiness policy of 2026-09-22.** The catalogue is no longer dormant: every record is selected for adaptation. Verification still means comparing a record with the rendered source page (`tools/srd_extract/verification/mark_verified.js`, hash-bound). It is done record by record as each adaptation row is written, and never by marking in bulk without checking. Activation into runtime gameplay follows the DEC-037 physics-first order unless the Owner brings it forward.
  4. **The work runs through the braintrust (the thinking) and gated lanes (the data), per DEC-052,** with the CC-BY-4.0 attribution kept in the game credits.
- **Owner Amendment (2026-09-30): art catalogue rows and a generation prompt for everything.** Owner's words: "I also want then added to the art catalogue, with specs related to scale in pixels as it relates to the world to make generation easier" and "Also a generation prompt for everything catalogued, etc".
  - Every SRD record that needs art gets its row(s) in `art/catalogue/catalogue.json` before any generation (DEC-007): creatures, equipment, magic items, and spell or hazard effects where they need a sprite. Each row carries pixel specs derived from world scale: 48 px per 5-ft cell, the ~42 px adult human as yardstick, native 1:1 (`docs/art/DEUS_HUMAN_WORLD_SCALE_STANDARD.md`); footprint in cells from SRD size (Tiny, Small and Medium 1x1; Large 2x2; Huge 3x3; Gargantuan 4x4 or more); a visual envelope with the overhang allowed; anchor; facings and frames (static first, DEC-046).
  - Every catalogued row, SRD or not, gets a generation card: tool and settings (PixelLab; PM-made natural-world art: Pixflux or Bitforge, DEC-063), the prompt in the SOP's four-part structure with the DEC-047 style tail, and its size. The Owner generates (DEC-007). Cards are written by the braintrust and added through the catalogue build in a gated lane (DEC-052), never hand-edited into catalogue.json.

---

### Decision `DEC-054`: The world is named Emerys
- **Date:** 2026-09-30
- **Source:** Owner, 2026-09-30, in chat with Claude Code: "Lets call the world Emerys".
- **Ruling:** the world's name is **Emerys**. It replaces the earlier spelling "Emrys" (VISION V154, 2026-09-29) everywhere the current name is stated: lore, decisions, art prompts and generation cards, catalogues, braintrust packets and any player-facing text.
- **Kept as written:** Owner quotes and dated decision-log lines that used "Emrys" are records of what was said and stay verbatim. Archived PixelLab prompt records under art/staging keep the text that was actually sent.
- **Synced now:** VISION V154 row; docs/lore/EMRYS_LORE.md renamed to docs/lore/EMERYS_LORE.md; docs/art/cards/TEMPERATE_BATCH1_PROMPTS.md; DEC-053 and the prompt-structure text in this file.
- **Synced next:** docs/art/cards/TEMPERATE_BATCH1_GENERATIONS.md, after lane-cs2 (which edits that file) merges, so the two changes do not collide.

---

### Decision `DEC-055`: Organize the assets around what PixelLab produces
- **Date:** 2026-09-30
- **Source:** Owner, 2026-09-30, in chat with Claude Code: "Lets organize our assets to make best use of our pixellab outputs instead of trying to conform pixellab into other things".
- **Ruling:** the asset pipeline, catalogue and engine take PixelLab's outputs in the forms PixelLab makes them, instead of converting them into other formats. Examples include each tool's tile sets, transition sets, object sprites at their generated sizes, and their variants. The engine and the catalogue adapt to the art; the art is not reshaped to fit a format chosen beforehand.
- **Held now, pending the design:** any work that converts PixelLab output into another shape. That covers:
  - tool-tiling a ground tile into an RMMZ A2 autotile block;
  - forcing sprites into fixed cells or repacked sheets for the game;
  - the lane-cv meadow A2 block board.
  Owner review boards that show PixelLab output as it is (for example the A2 object contact sheets) continue.
- **Design:** the braintrust designs the PixelLab-native organization: the tool-by-tool output forms, the catalogue schema, how the engine renders them (ground transitions, object sprites, depth pieces), and what earlier rules change. The Owner approves it. Until then, earlier art rules that assume a conversion (A2 blocks, derived autotiles, fixed cell sizes) are on hold, not deleted.
- **Amended 2026-10-01 for the PM's art (DEC-063 item 10).** The Owner: "Using RMMZ's own format should make it easy to tool into the game as well" (06:01 UTC) and, of RMMZ's own assets, "use all those as format examples, and then U7 as style examples" (06:15 UTC). The art the PM makes is delivered in RMMZ's own sheet formats (the A1-A5 tileset layouts; B-E object sheets of 768x768 on the 48 px grid), with RMMZ stock as the format example and Ultima VII as the style example. For the Owner's own PixelLab outputs the hold above stands, except where DEC-060 item 5 allows A2 for the ground induction.

---

### Decision `DEC-056`: The PM chooses what ART goes in game; the Owner can change it
- **Date:** 2026-09-30
- **Source:** Owner, 2026-09-30, in chat with Claude Code, right after asking the PM to "fill what you can with the best specimens": "You can choose what goes in game, and if I want to change something I will bring it up".
- **Ruling:** the PM (Claude) makes the final call on which ART assets enter the game. Clarified by the Owner the same day: "What goes in game in terms of art" and "I only meant art". The delegation covers art only; slices, rulings, designs, code and everything else stay with the Owner. The Owner no longer has to sign off each asset first. The Owner may change any choice at any time; when the Owner raises one, the PM changes it.
- **How the PM decides:**
  - catalogue row first (DEC-007);
  - machine QA: size, camera, palette, seams, readability;
  - the braintrust's pick where there is a choice (DEC-052);
  - the PM opens every image.
  Each choice is recorded in art/APPROVALS.md as "PM YEA (DEC-056)" with its reason and source file, so the Owner can see and reverse it.
- **Unchanged:**
  - The Owner generates all art; agents generate nothing on their own (DEC-007 addendum). Owner, same day: "I will still generate tho".
  - DEC-055: assets are used in PixelLab's native forms; conversions stay on hold until the design is approved. For the art the PM makes, DEC-063 item 10 amends this: RMMZ's own sheet formats.
  - The Owner still approves slices, rulings and designs.
- **Replaces:** "Nothing enters the game without the Owner's YEA" and "The Owner is the final QA" in the DEC-007 banner of AGENTS.md, CLAUDE.md and GEMINI.md, and the art half of AGENTS.md Rule 6.

---

### Decision `DEC-057`: Natural world re-scoped: soil deferred; monsters, flora and fauna placed by seeded random rules for now
- **Date:** 2026-09-30
- **Source:** Owner, 2026-09-30, in chat with Claude Code, after the PM listed what remains before the natural world is complete: "We can nix soil for now. We can RNG monsters and flora and fauna into the world for now and refine systems later."
- **Ruling:**
  1. **Soil is deferred.**
     - No soil runtime, soil bridge, soil moisture or erosion work in this phase.
     - The NAT.04.01 kernel stays on main, unbridged.
     - lane-cf (the DEUS_SimBridge soil bridge, three Grok FAILs) stops; its branch is kept.
     - Collapse produces rubble and stops there; there is no rubble-to-sediment transfer.
  2. **Monsters, flora and fauna are placed into the world by seeded random rules for now.**
     - Placement is deterministic from the world seed and follows the biome cell (DEC-030), the danger field (DEC-050) and the bestiary assignment (DEC-053).
     - Physical growth, biomass carrying capacity, breeding and food webs are refined later.
  3. **The natural-world exit gate (DEC-041 item 7) changes to match.**
     - The points about soil moisture, flora germination and growth, biomass carrying capacity and persistent breeding wildlife are deferred.
     - Seeded random placement of flora, fauna and monsters by biome cell and danger tier stands in for them.
     - Space, matter, water, lava and collapse stay in scope.
- **Open:** climate is not named in the ruling. Seeded flora placement does not need a climate engine, so the PM treats climate as deferred with flora unless the Owner says otherwise.
- **Supersedes in part:** DEC-037's upstream order (Geomorphology/Soil, then Climate, Flora and Fauna as simulations) for this phase, and DEC-041 points 6 and 8-10 as exit criteria.
- **Amendment (Owner, 2026-10-01):** for wildlife and monsters, item 2's seeded placement becomes a seeded runtime spawner (spawn and despawn during play) that uses the same three inputs plus light, time of day, season (weights off while DEC-059 defers seasons), density caps, herd sizes and distance, and the breeding, carrying capacity and food webs that item 2 left for later (and item 3's persistent breeding wildlife) are dropped, not deferred. Flora physical growth stays deferred as before; see DEC-073.

---

### Decision `DEC-058`: Build the natural-world systems we have landed on
- **Date:** 2026-09-30
- **Source:** Owner, 2026-09-30, in chat with Claude Code: "You can build the rest of the natural world systems we have landed on".
- **Ruling:** implementation of the natural world is approved on the designs the braintrust has landed on. This satisfies DEC-049 for these designs:
  - D1 geology by DEC-030 band, caves and ravines, magma and a finite core reservoir;
  - D2 one water authority, closed water loop, lava as a fluid, water/lava quench;
  - D3 collapse, repair-first, dry cave-in first;
  - D4 nine race starts and the danger field;
  - the SRD bestiary placement;
  - the shared mass (centipounds) and Levels write-path foundation;
  - all within DEC-057 (soil deferred; flora, fauna and monsters placed by seeded random rules).
- **Who decides what:** the PM settles each design's open questions from the braintrust recommendations and records each choice. The Owner can change any of them.
- **How it is built:** AG swarms the lanes (writers and reviewers from different families). Each lane has a brief and a merge_gate manifest, and passes the braintrust answerability check (DEC-052) before the PM merges it. F5 evidence is required where the design says so.

---

### Decision `DEC-059`: No authority blocks on the natural-world build
- **Date:** 2026-09-30
- **Source:** Owner, 2026-09-30. The Owner asked: "So now there are no more authority blocks between now and world completion?" The PM listed the remaining Owner gates and asked four questions; the Owner chose the recommended option each time:
  1. "Yes, build straight through";
  2. "Yes, keep it closed";
  3. "Yes, you decide both";
  4. "Defer them all".
- **Ruling:**
  1. **Build straight through.** For the natural world, the hard Owner gate after each package (DEC-041, .agents/rules/deus-natural-world.md) and the slice gate of AGENTS.md Rule 6 are waived. The PM builds package to package. The Owner gets progress reports and can stop or change anything at any time. The Owner's final Natural World v1 sign-off stays.
  2. **The RMMZ editor stays closed for the build.** The PM may change game/js/plugins.js and game/data/*.json without asking each time. The PM tells the Owner when it is safe to reopen the editor, and before any F5 check the Owner needs to run.
  3. **The PM decides the PixelLab-native art layout (DEC-055) and signs ADR-003** (the sim/render split and LOD), from the braintrust recommendations, recording each choice. The Owner can change them.
  4. **Optional extras are deferred for this phase:** fire, seasons and weather, animal migration, rare geological events (quakes, sinkholes, eruptions) and structure decay. Climate is deferred with flora (DEC-057).
- **Still with the Owner:**
  - the final Natural World v1 sign-off;
  - Rule 10 escalations (two failed fixes);
  - any change to the read-only engine core (Rule 9);
  - generating all art.
- **Amendment (Owner, 2026-10-01):** in item 4, animal migration is cut rather than deferred (WG.68.12 and SIM.50.07); seasons stay deferred, so the creature spawner's season weights stay off until seasons open. The other deferred extras are unchanged; see DEC-073.

---

### Decision `DEC-060`: Group 3 (cliffs, edges, ramps, natural walls) by Nano Banana Pro; PM generates and judges; ground induction may use A2 for now
- **Date:** 2026-10-01
- **Source:** Owner, 2026-10-01:
  - "Group 3 Cliffs, edges, ramps and natural walls. I want you to prompt nano banana pro for these";
  - "I want you to generate the images, and figure out if they are suitable or not";
  - two answers to the PM's questions: "Yes, download them" and "A2 is fine for now".
  - Earlier the same day, the Owner told the PM: "I instructed AG to induct all of the ground tiles from pixellab and integrate them into a world generation".
- **Ruling:**
  1. **Group 3 of the temperate list is generated with Nano Banana Pro (Gemini 3 Pro Image) by the PM**, in the Owner's Gemini app. Under DEC-007 this is a direct Owner hand-off and counts as the Owner's generation. For Group 3 this overrides SOP AS-GEN-004/AS-GEN-005 (PixelLab only, one generator per set) and DEC-055's PixelLab-native rule. The PixelLab ground tops beside these faces are an accepted mix. **Superseded 2026-10-01 (Owner 02:43 UTC: "Try to run those art prompts in pixellab actuall"; DEC-063 item 1): Group 3 is made in PixelLab Pixflux and Bitforge.**
  2. **The PM judges suitability** and records each pick as PM YEA or NAY under DEC-056. Rejected images are not used.
  3. **Post-processing is allowed for Group 3**: resampling to the art-pixel grid, the palette snap to the material ramp, and slicing into catalogue slots.
  4. **The PM may download the generated images** from gemini.google.com for QA (the Owner's yes, 2026-10-01).
  5. **The ground-tile induction (AG) may convert PixelLab corner sets to RMMZ A2 tilesets for now.** The native corner renderer (RENDER.NATIVE) comes later. The work still goes through a reviewed lane, not main's working copy (DEC-048).

---

### Decision `DEC-061`: the originality check is removed entirely
- **Date:** 2026-10-01
- **Source:** Owner, 2026-10-01: "We can nix the originality check entirely. delete it off the planet. we are already controlling for originality".
- **Ruling:**
  1. **`tools/originality_check.js` and its checks are deleted, not archived** (the Owner said delete). This covers `tools/originality_check.js`, `tools/check_furniture_originality.js`, `tools/test_object_originality.js`, the originality step in every pipeline script that calls it, and the quarantine entries that name it.
  2. **AGENTS.md Rule 8 no longer requires the originality check.** U7 art stays usable as examples, stand-ins, style references and training data, and everything that ships is still our own work. Originality is controlled by how the art is made (PixelLab generation from our own prompts, guides and style swatches, never a copy, trace, recolour or crop of a U7 image) and by the art council (DEC-062).
  3. **The removal runs as a reviewed AG cleanup lane** (about 25 scripts and about 30 docs cite it), not on main's working copy (DEC-048), scheduled after wave 1 launches. The PM syncs the binding rule files now (AGENTS.md Rule 8, VISION); the lane sweeps the rest.

---

### Decision `DEC-062`: art enters the game only on a unanimous art-council YEA; every NAY is recorded with its reason; strict style bar
- **Date:** 2026-10-01
- **Source:** Owner, 2026-10-01:
  - "You continue generating art and taking feedback from art council. 1 nay = no. They must all unimously vote yes. I do want a record of why things were no'd though. I want strict U7/everquest/English folklore and uniquely represented style";
  - "A vote no MUST include a reason why".
- **Ruling:**
  1. **The art council is the four braintrust chats** (ChatGPT Pro, Grok Heavy, Gemini Pro, MiniMax M3). Each judges every piece independently.
  2. **Unanimity.** A piece passes only if all four judges vote YEA. One NAY, or one REDO, means no. This tightens DEC-056: the PM records a PM YEA only after a unanimous council YEA, the catalogue row and machine QA. The Owner can still change any choice.
  3. **Every no carries its reason.** A NAY or REDO without a reason is incomplete, and the PM goes back to that judge for the reason before the round closes. Every no is recorded with each judge's reason in `art/COUNCIL_RECORD.md`, and rejected pieces get a NAY row in `art/APPROVALS.md` pointing to it.
  4. **Style bar:** strict Ultima VII / EverQuest / English folklore, rendered in a style that is uniquely DEUS: not generic pixel art and not a copy of any of them. Every council prompt and every generation card states this bar.
  5. **The PM keeps generating** (the Owner's direct hand-off under DEC-007; the U7 method of 2026-10-01: PixelLab Bitforge and Pixflux), iterating on the council's reasons and resubmitting until the vote is unanimous.
- **Amendment (Owner, 2026-10-01, later the same day):** "I simply want the jduges to confirm it is roughly the same quality and consistent as U7 art, that should suffice as long as you can tool it etc?"
  - Item 4 is replaced. The judges answer one question per piece: **is it roughly the same quality as Ultima VII art, and consistent with it?** YES, or NO with the reason.
  - The PM confirms each piece can be tooled before it goes to the judges: machine QA of the RMMZ format, seams, anchors, palette and size.
  - Items 1, 2, 3 and 5 stand: four judges, unanimity, and every NO recorded with its reason. The English folklore / Ultima VII / EverQuest direction (DEC-047) stays the art direction, but it is no longer a separate judging test.
- **Amendment (Owner, 2026-10-01, ~12:15Z, answering the PM's question on judges who keep splitting):** "strict 4/4". Unanimity stays strict even when further rounds do not close a split: a piece without four YES votes stays out of the game. The PM had offered three choices (strict 4/4; 3 of 4 with the dissent recorded; the Owner breaks ties) after seven council rounds split on cliffs 2, 5, 6, 9 and 10, the hanging vines, the stalactites and both apple trees (`art/COUNCIL_RECORD.md`).

---
- **Amendment (Owner, 2026-10-01):** thresholds (4/4 passes, 3/4 goes to the Owner, fewer is out), Owner override, the YES WITH FIX answer and packets of ten; see DEC-069 items 1-3.
- **Amendment (Owner, 2026-10-01):** the PM makes the fauna (Group 7) in the PixelLab character creator as eight-way still sprites, with no animations; see DEC-071.
- **Amendment (Owner, 2026-10-01):** MiniMax is removed from the project, so the council is three judges (ChatGPT Pro, Grok Heavy, Gemini Pro): 3/3 passes, 2/3 goes to the Owner, fewer is out; see DEC-076.
- **Amendment (Owner, 2026-10-01):** the council is suspended for now; the Owner grades the art; see DEC-079.

### Decision `DEC-063`: The U7 method: the PM makes natural-world art in PixelLab Pixflux and Bitforge, in RMMZ's own sheet formats; RMMZ reference, Ultima 7 style; no creatures, faces, character sheets or animations yet; a stump is its own tree cut down
- **Date:** 2026-10-01
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-10-01)
- **Source:** Owner, 2026-10-01, in chat with Claude Code (times UTC, when each message was sent):
  - 02:43 "Try to run those art prompts in pixellab actuall";
  - 02:50-02:53 "You can also try to batch multiple shits on one sheet since the output size can get pretty big", "You can show it RMMZ tilesets as examples", "See how many assets you can get to print on one sheet";
  - 03:16 "Use reference and style pictures. For style pictures I want you to use Ultima 7", "RMMZ reference, Ultima 7 style";
  - 03:48 "I prefer the U7, and I would like you to continue working that method for the art we need";
  - 03:52 "Lets just use bitforge and pixflux where we need more size. I think you prompted those well.";
  - 03:54 "I think we should redo trees. if trees are being cut, the stumps should really reference the trees so the stumps match what was there.you can bitforge those"; 04:05 "and then the stumps need to look like those trees cut down"; 04:13 "pixflux then?";
  - 04:40-04:43 "I dont want you working on animals, monsters, or people yet", "I want our natural world to have that u7 flavor", "No animals, monsters, people, or animations. Other than that, the world art is fair game. You will yuse Pixflux and bitforge";
  - 04:54 "All of the Ultima 7 games are reinstalled, reference anything you need at all";
  - 05:05 "WAlright we can finish the art later as long as we have it figured out"; 05:32 "Can you manage the project and keep the art running both according to SOP?"; 05:34 "Okay so youre going to generate on pixellab and continue to PM?";
  - 05:53 "Your not redoing tiles I alreadu did are you?";
  - 05:54, answering the PM's question "Besides cliffs/edges/ramps/walls and trees/stumps, which of the remaining art-list groups should I make with Pixflux/Bitforge (none of these have sets from you yet)?": the Owner ticked "Depth pieces (Group 4)", "Water, lava, steam (Group 5)" and "Integrity marks (Group 6)", and also the fourth option, "None: just Group 3 + trees";
  - 06:00 "Basically anything there is an RMMZ asset for, I want an asset for our game. Bear in mind the way inventories work, there are no icons, the loot is items dragged between containers like Ultima";
  - 06:01 "Using RMMZ's own format should make it easy to tool into the game as well";
  - 06:03 "Not facesets or chatsets yet";
  - 06:15 "There are RMMZ trees and shtit oo im sure, use all those as format examples, and then U7 as style examples";
  - 06:22 "You can use 500 generations. Each pixflux or bitforge costs 1. I want the world fleshed out";
  - 06:27 "You can always open more rows for assets we need".
- **Ruling:**
  1. **Group 3 (cliffs, edges, ramps, natural walls) is made in PixelLab, not Nano Banana Pro.** This supersedes DEC-060 item 1. DEC-060 items 2-5 stand.
  2. **Style: RMMZ reference, Ultima 7 style.** RMMZ's stock sheets are the format examples: layouts, A4 blocks, autotile cells, and the B-E object sheets with their trees and natural objects. Ultima VII is the style example. Ultima VII art (the installed games, `reference/u7_style_dataset`) is used for style images, colour references and council reference boards, never as a copy, trace, recolour or crop (DEC-061 item 2).
  3. **Tools.** The PM makes natural-world art with PixelLab Pixflux and Bitforge only (Bitforge up to 200x200, Pixflux above that). The Create Image Pro sheets made 02:51-03:24 under the 02:43-02:53 hand-off are concept sources only. The Owner's own generations may still use any PixelLab tool (DEC-007).
  4. **Scope limits.** No animals, monsters, people or animations for now (04:40-04:43), and no facesets or character sheets (06:03). Other world art is fair game (04:43), static first (DEC-046 amendment); items 7 and 8 say what the PM makes.
  5. **Stumps.** A tree's stump is that tree cut down, made in PixelLab (Bitforge or Pixflux) from that tree's own trunk base and roots, one per tree species and variant.
  6. **Pause and restart.** At 05:05 the Owner paused the art for the 75-lane build; at 05:32 the Owner asked for it to keep running under the SOP: catalogue row first, the SOP's four-part prompt, the PM's tool check, four council YEAs, then the PM's YEA or NAY.
  7. **The Owner's tile sets stand.** The PM never redoes or restyles a tile set the Owner made; ground the Owner made stays as it is (05:53).
  8. **The PM's art scope** is Groups 3, 4, 5 and 6 of `docs/art/TEMPERATE_GENERATION_LIST.md` (cliffs, edges, ramps and natural walls; shared depth pieces; water, lava and steam; integrity states and aftermath), plus trees and their stumps (05:54). Recorder's note: "None: just Group 3 + trees" was ticked as well; the PM reads the answer as Groups 3 to 6 plus trees and stumps, and the Owner can correct that reading.
  9. **Every RMMZ asset gets a DEUS asset** (06:00), except the icon set: there is none, because inventory works as in Ultima VII, where items are their own sprites, dragged between containers (VISION V90). Facesets and character sheets wait with the creatures (item 4).
  10. **RMMZ's own formats.** The art the PM makes is delivered in RMMZ's own sheet formats, so it tools straight into the game (06:01, 06:15): the A1-A5 tileset layouts, and B-E object sheets of 768x768 on the 48 px grid. This amends DEC-055 ("PixelLab-native, conversions on hold") for the PM's art. DEC-055 still covers the Owner's own generations.
  11. **Budget.** From 06:22 the PM may spend up to 500 PixelLab generations (Pixflux or Bitforge, 1 each) on natural-world art, to flesh out the world. Every generation still follows item 6 and is logged (AS-GEN-001).
  12. **Catalogue rows.** The PM may add catalogue rows for any asset the world needs without asking each time (06:27). Rows are data, so they go through a reviewed lane (DEC-048, DEC-052), and a row still comes before its generation (DEC-007).
- **Unchanged:** DEC-007 (catalogue first, SOP prompts, QA), the DEC-046 static-first amendment, and DEC-056 as tightened by DEC-062 and its amendment.

- **Amendment (Owner, 2026-10-01):** script work on the PixelLab output of the PM's art may ship; see DEC-066 item 2 (the piece still starts from a Pixflux or Bitforge generation and needs the unanimous council).
---
- **Amendment (Owner, 2026-10-01):** Create Image Pro allowed, the cliff-set method is the default, and the PixelLab balance is spent to zero; see DEC-069 items 4-5.
- **Amendment (Owner, 2026-10-01):** the PM makes the fauna (Group 7) in the PixelLab character creator as eight-way still sprites, with no animations; see DEC-071.

### Decision `DEC-064`: "Lets do all these": the PM's nine-item improvement list of 2026-10-01 is approved work
- **Date:** 2026-10-01
- **Status:** `DECIDED` (Owner, in chat with Claude Code, 2026-10-01 05:25 UTC)
- **Source:** Owner, 2026-10-01 05:25 UTC, in chat with Claude Code: the Owner pasted the PM's list "What can still be done, by payoff" and wrote "Lets do all these". The list, as approved (the PM's words, shortened only by dropping the explanations):
  1. Launch wave 1, then drive to wave 4; lane-cu is the gate.
  2. lane-cz: mail and telemetry off main.
  3. Clear the merge backlog: co, then ct and cu; lane-cy needs world-generation integration and a council vote before it can merge.
  4. Plan deadlines before they bite: by wave 2 the D1 ownership reconciliation; by wave 3 the home-area generation rule and reclaimable collapse rubble; by wave 4 the D1 obligations assigned to their owners; before later consumers, ADR-003's 14 amendments.
  5. "The other four process lanes from the braintrust review, one at a time": reviewer launches that don't create commits; one manifest contract checked at every step; automatic checking of AG's claims; reliable braintrust delivery.
  6. Test health: the strata test's timing bounds under load, and the CRLF sensitivity in the gate's fresh clones.
  7. Commit the pending records: DEC-061/062, the art council record, and the wave-1 governance records.
  8. Art, when un-paused: the U7 ground method; RMMZ quarter-corner cliff inner corners; the rebuilt stumps and redone trees through the council; the council on the 42 ground tiles.
  9. "The originality-check deletion lane, after wave 1 launches."
  The PM also offered a live dashboard page; it was built (the DEUS build board artifact).
- **Ruling:** the nine items are approved work. This entry records the approval; it is the authority line for the process-lane briefs (lane-cz, lane-pa to lane-pf) and the deadline records.
- **Not decided by this entry:** exceptions the WORK-GATE of 2026-10-01 says need the Owner: a DEC-048 exception for lane-pa and a separate authorization for lane-pb (merge_gate changes); whether lane-pe may start before natural-world wave 3 (PI-1); lane-pe's repo-wide `.gitattributes` change and Codex writing outside its CANONICAL_ROLES bound. Item 9 states its own timing ("after wave 1 launches"); whether that overrides PI-1's wave-3 hold for lane-pf is also the Owner's to confirm.
- **Unchanged:** DEC-048, DEC-052 and PI-1 stand except where the Owner rules on the items above.

---

### Decision `DEC-065`: New Game builds each faction-home area once and keeps lazy (area, z) demand; natural collapse rubble is reclaim-eligible and registered once
- **Date:** 2026-10-01
- **Decider:** the PM (Claude). DEC-058 has the PM settle each design's open questions from the braintrust recommendations and record each choice; DEC-059 item 1 has the PM build the natural world straight through, with no Owner gate between packages. The Owner can change either item at any time.
- **Status:** `DECIDED (PM)`
- **Source:** WORK-GATE G02, the merged braintrust verdict on the natural-world build plan (binding; `C:/Users/snewt/.deus_pm/braintrust/2026-10-01/WORK-GATE-G02_merged_chatgpt_pro.md`), section 4, the two rows due in wave 3:
  - before lane-dd (line 95): "Record: New Game may generate each faction-home area once, including all nine areas when all nine hold homes. This authorizes required home-area/floor generation, not eager materialization of all 32 levels in every area. Measure the actual shipped-grid cost; retain lazy `(area,z)` demand."
  - before lane-dr (line 96): "Confirm natural collapse rubble is explicitly reclaim-eligible and registered once, as already required by the reconciled MASS work. Do not reopen soil or decay."
  - Design inputs: the merged D1 design (`C:/Users/snewt/.deus_pm/braintrust/2026-10-01/DESIGN-D1_merged_grok_heavy.md`, section 3.2: "New Game warms the viewed area + ring, not 32×9 areas") and the merged D3 design (`C:/Users/snewt/.deus_pm/braintrust/2026-09-30/DESIGN-D3_merged_chatgpt_pro.md`, section 3.2, and NAT.02.MASS test 4 in section 4: "Collapse registration posts once and does not default natural rubble to exempt").
- **Ruling** (code line numbers are at main `f2f57eaf`; some cited lines have moved since, and lane-da (WG.00.43, `2f504c62`) rewrote `tools/test_32_levels_generation.js`, as item 1's Dropped bullet records):
  1. **New Game may generate each faction-home area once.** This applies to WG.00.46 (lane-dd, lazy area generation), WG.00.25 (lane-de, the shipped 3x3 grid) and WG.62.02 (lane-fb, race starts).
     - At New Game, Levels itself generates only the start area. Any other area that holds a faction home may be generated once, by the request that needs its floor (founders, camp, kit). In a 3x3 world that can be all nine areas. Today the home roll gives each faction a non-start area and then moves the player's home to the start area (`game/js/plugins/DEUS_Factions.js:175-183`, `:247`). The D4 start solver replaces the roll at lane-fb.
     - This covers home-area and home-floor generation only. It does not allow a check or rule that requires all 32 levels of every area at New Game, generating an area that holds no home and that nothing has requested, or generating any area twice.
     - Demand stays lazy and keyed by (area, z). Every other level of every other area is generated on its first request (`baseline(z, ax, ay)`, `game/js/plugins/DEUS_Levels.js:1073`). A map load still warms only the levels within `LOAD_WARM_REACH = 4` of the view (`game/js/plugins/DEUS_World.js:984`). Generator 5 builds all of an area's levels in one pass and keeps the levels outside the core as UNIFORM chunks with no arrays (`DEUS_Levels.js:879`, `:1355-1362`, `:2522-2527`); that pass is the area's one generation. Generator 6 (the merged D1 design) generates per (area, z).
     - All 32 levels stay reconstructible from the seed with unchanged baseline output (WG.00.43). No check requires them to be generated, saved or checksummed at New Game.
     - **The cost is measured, not assumed.** Before lane-dd is dispatched, the PM measures the New Game time on the shipped grid (1x1 until lane-de: `DEUS_World.js:130-131` default to one area, and `game/js/plugins.js:55-58` sets no parameters) at the commit lane-dd will start from, on a snapshot copy, and writes the time, the commit and the grid into this entry (next bullet) and into lane-dd's brief. The measurement is a prerequisite of lane-dd's start: lane-dd is not dispatched while the next bullet has no number. lane-dd prints, at its base and at its tip, the same shipped-grid time and, on an explicit 3x3 grid, the total time, the areas generated, which of them hold homes, which request generated each, and the median time per area. lane-de makes 3x3 the shipped grid in wave 4 and prints the same for the NW.js New Game with homes. Both bounds are linear. lane-dd (node): T(3x3) <= T(1x1) + (k - 1) x Tarea x 1.25, where k is the number of distinct areas generated at New Game and Tarea the median ms per generated area in the same run. lane-de (NW.js, nine homes): T(3x3) <= T(1x1) + 8 x Tarea x 1.5. **The double-generation case:** an area generated a second time at New Game (for example the founders' floor request and the kit's camp request each generating the same home area, or a load that regenerates an area already generated in this world state). A whole-world double generation (the mutant regenerate_twice: every generated area generated again) adds about (k - 1) x Tarea against a margin of 0.25 x (k - 1) x Tarea for lane-dd and about 8 x Tarea against 4 x Tarea for lane-de, so both bounds catch it. One area generated twice adds about one Tarea, which is under lane-dd's margin once k - 1 >= 4 and always under lane-de's, so the time bound is not the check for it: lane-dd's `new_game_3x3_areas_attributed` is (each area generated at most once, its requester recorded), and lane-de runs it too (`tools/test_lazy_area_generation.js` is in lane-de's gates). The PM adds each lane's printed numbers to its WBS row when it merges (WG.00.46, WG.00.25).
     - **Shipped-grid New Game time at lane-dd's base: not measured yet (lane-dd is not dispatched until an amendment line of this entry gives the time, the commit and the grid).**
     - **This narrows the Owner's request of 2026-09-29, and the Owner decides before lane-dd merges.** The request: "I also want to generate all 32 layers on world generation, im tired of not seeing that done" (commit `a8c1e62a`, relayed by AG; in no decision file). G02 directs the narrowing (section 2, row da; section 3, "da → dc → dd").
       - Preserved: all 32 levels of every area exist, can be visited, and are rebuilt from the seed with unchanged baseline output (WG.00.43); every faction-home area may be generated at New Game, all nine when all nine hold homes; under generator 5 each generated area builds all 32 of its levels in its one pass.
       - Dropped: generating every level of every area at New Game; any acceptance check that requires all 32 levels of every area to be generated, saved or checksummed at New Game (today `complete_at_start`, `DEUS_Levels.js:5729-5737` at `f2f57eaf`, which requires every level of the range to be made at New Game; lane-da, WG.00.43, already keeps save entries and checksums to the core and rewrote `tools/test_32_levels_generation.js` to match); and, from generator 6 (lane-dg, wave 10; merged D1 generates per (area, z)), the start area too builds each level on its first request instead of all 32 at New Game.
       - **lane-dd does not merge until the Owner has accepted or rejected this narrowing**, and the answer is on main: the Owner's words in an amendment line of this entry, or an Owner decision entry. If the Owner accepts, lane-dd merges as briefed. If the Owner rejects it, eager generation of all 32 levels of every area at New Game stays an acceptance rule, and the PM changes lane-dd's brief (and this item) before lane-dd merges. lane-dd may be dispatched and reviewed while the answer is pending; only its merge waits. This is not a package gate under DEC-059 item 1: it is the Owner's own request that is being narrowed.
     - This replaces the build plan's lane-dd goal "ensureWorldLevels generates only the start area (all 32 layers)".
  2. **Natural collapse rubble is reclaim-eligible and registered once.** This applies to NAT.02.MASS (lane-dr, the only `reclaim.js` writer) and NAT.02.01 (lane-eq, which commits collapse plans).
     - lane-dr registers rubble from a natural collapse with reclaim by a named registration for its class and lineage, not as exempt. The slice default in `reclaim.js` (`exempt: o.exempt !== false`, `game/js/sim/reclaim.js:576`) then no longer applies to that rubble. Exempt only keeps a place out of the reclaim walk (`reclaim.js:513`); the mass is registered in the ledger either way (`reclaim.js:551`), so the closed-mass accounts (DEC-040) hold the rubble whether it is exempt or not. No other category's exemption changes.
     - Each conversion is posted once. `note("collapse")` for a conversion that is already posted debits nothing. lane-eq calls it once per committed collapse plan.
     - **This is consistent with DEC-057 item 1.** Eligibility is registration and accounting only. Collapse still produces rubble and stops there. Nothing in the running game moves rubble along its reclaim path in this phase: the `weather:rubble->sediment` and `lithify:sediment->stone` steps (`game/data/sim/materials.json:514-518`) stay data, and today no file in `game/js/plugins/` loads `reclaim.js`. Runtime code that later posts collapses (lane-eq, from `game/js/sim/structural/collapse.js`) calls `note("collapse")` only. Running that walk is soil and decay work, deferred by DEC-057 item 1 and DEC-059 item 4. This item does not reopen soil or decay.
     - lane-dr's must-fail check injects the exemption, so it fails on today's main whichever path natural collapse rubble takes: `::natural_rubble_reclaim_eligible` registers natural collapse rubble with `exempt: true` injected (and once more through `registerSlice` with no flag, which defaults to exempt, `reclaim.js:576`), posts the collapse through `note("collapse")`, and requires the natural-rubble places to be not exempt and in the walk set, the injected exemption refused for that class by name, and an unrelated category's `exempt: true` kept. Main has no named natural-rubble registration, so the injected exemption stands and the check fails there.
     - lane-dr adds a guard: no runtime file calls the reclaim walk (`note("tick")`, `note("decay")` or a reclaim session's `tick()`), and `note("collapse")` advances no place. The same scan that passes on the runtime files must fail on a file that calls the walk, and a mutant whose `note("collapse")` also runs the walk must fail the guard.
     - ADR-003's sign-off amendments A6 and A7 (rubble is the terminal form under DEC-057) are read together with this item: rubble is terminal in the running game and eligible in the accounts.
- **Records updated with this entry:** `docs/worldgen/DEUS_WORLDGEN_WBS.md` (section 5.3 rows PM-2 and PM-3, the WG.00.46 row, the revision log) and `tasks/wbs_registry.json` (the `decisions` lists of WG.CELL-WRITE, NAT.02.MASS and WG.00.46). The briefs of lanes dd, dr, de, fb and eq carry it when each lane is dispatched. Drafted as DEC-063 and renamed DEC-065 on 2026-10-01: DEC-063 and DEC-064 are taken on main (the PM's U7 art program; "Lets do all these").

---
- **Amendment (Owner, 2026-10-01):** item 1 holds only under conditions A-C; see DEC-070 item 1.

### Decision `DEC-066`: Owner rulings of 2026-10-01 on the PM's morning questions: nine size overrides approved; script work on PixelLab output may ship; WG.64.01 and WG.64.02 superseded
- **Date:** 2026-10-01 (~12:30Z)
- **Decider:** Owner, in chat with the PM, answering the PM's plain-language questions (`C:/Users/snewt/.deus_ops/MORNING_DECISIONS.md` items 7, 8/18 and 17): "8-18 a 7 yes ... 17 a". Item 19 (the all-32-levels narrowing of DEC-065) is still open: the Owner asked whether factions still develop the same, and the PM is answering that first.
- **Status:** `DECIDED`
- **Ruling:**
  1. **Size overrides (DEC-016), option (a).** The Owner approves the nine per-row size exceptions of the catalogue-rows lane (lane-pg, WG.20.03), measured on 2026-10-01 at the council-passed versions: trees oak 56-89 x 72-96, dead 56-84 x 72-96, birch 44-70 x 76-118, pine 42-96 x 80-132; stumps oak 16-28 x 12-21, swamp 16-40 x 12-34, dead 16-31 x 12-23, pine 16-34 x 12-20, birch 11-28 x 12-20 (px, width x height). Each widens only its own B-sheet row; the scale-chart rows, the charset trees (CAT 7713-7726) and every slot and anchor stay as they are, and each override is listed in `art/catalogue/conflicts.md`. This is lane-pg's precondition 5. Any other override still goes to the Owner under DEC-016.
  2. **Script work on PixelLab output may ship (question D2), option (a) "yes".** Art the PM makes may ship with pixels that a script changed after the PixelLab generation: cutting and rearranging into RMMZ layouts, transparency clean-up, palette snapping, and recolours or fills that use the piece's own colours (for example the mottled flat fills of cliffs 4, 7 and 8, and stumps cut from their tree before the Pixflux pass). The piece still starts from a PixelLab Pixflux or Bitforge generation (DEC-063 item 3), passes the PM's machine QA, and needs the four-judge unanimous council (DEC-062, strict 4/4) before a PM YEA (DEC-056).
  3. **WG.64.01 and WG.64.02 are superseded, option (a).** WG.64.01 (karst dissolution and cave architecture) and WG.64.02 (structural fault fractures and chasms) are retired as `SUPERSEDED` by WG.62.03 (D1 caves, ravines and shafts, generated directly at world creation; lane-dh wave 5, lane-fn, lane-di). No process simulation of dissolution or tectonics is planned. Geological events during play (sinkholes, quakes, eruptions) stay deferred under DEC-059 item 4.
- **Records updated with this entry:** a pointer under DEC-016 and DEC-063; `docs/worldgen/DEUS_WORLDGEN_WBS.md` (WG.64.01 and WG.64.02 `SUPERSEDED`, the WG.62.03 row, Rev 37 and its log row); `docs/worldgen/DEUS_NATURAL_WORLD_SYSTEMS.md` section J; `art/COUNCIL_RECORD.md` (D2 answered).

### Decision `DEC-067`: Natural-world build scope of 2026-10-01: five lanes cut or merged, spawn plumbing kept, start kit and art cards out, wet collapse approximate, Minecraft-like water with pressure
- **Date:** 2026-10-01 (~14:45-15:05Z)
- **Decider:** Owner, in chat with the PM, answering the PM's scope review of the 60 unmerged natural-world lanes (the Owner: "If any physics or world generation task sound s silly of out of scope let me know and i will review it. I dont want to spin the wheels on bullshit").
- **Status:** `DECIDED`
- **Ruling:**
  1. **Cuts and merges ("Yes, your proposed strong flags are fine").** lane-ek (NAT.03.06 mixed-LOD water service for remote regions, off by default) is cut. lane-ec2 (fluid save codec) shrinks to the current save format only: no v1 conversion, no legacy hydro stores, because no player saves exist. lane-ds (NAT.02.MASS part 6, one density source enforced by a repo scan) is cut under the Owner's closed-mass scope (a lifecycle weight ledger, not density). lane-fu (NAT.02.MASS part 7, barrier parameters and the versioned head/saturation conversion) folds into lane-fj (NAT.02.02 barrier breach). lane-fv (NAT.02.01 part 5, structural save codec) merges into lane-eu (versioned structural save), which keeps the id.
  2. **Spawn designations are world generation.** "Spawn designations are part of world generaiton and that means putting them in the correct spots." lane-fc (danger field and tiers T0-T4), lane-fe (seeded creature placement), lane-ff (wildlife spawns) and lane-fi (lazy wildlife population) stay. "build plumbing for things we dont have art for yes": systems are built even where their art does not exist yet.
  3. **Start kits leave the build.** "We will worry about this layer, this isnt even a worldgen thing." lane-fa (WG.62.01 start kit and Year-0 underground settle) is withdrawn from the natural-world build; WG.62.01 waits for the civilization phase. Equal starts stay with lane-ez (merged), lane-fn, lane-fb and lane-fh.
  4. **Art rows and cards deferred.** "Yeah, use lessons learned to refine prompts." lane-fl (ART.NAT.01 catalogue rows and Owner cards beyond the indicators) waits until the Owner funds art; the PM's analysis of the 2026-10-01 generations refines the prompts instead.
  5. **Wet collapse is approximate.** Asked "How approximate are we talking?", the Owner answered with the water direction in item 6; the PM chose the approximate option as the one consistent with it (the Owner may revise): strata whose footprint touches fluid collapse by the dry path (lane-ew), and on the following water ticks the water authority moves water out of cells that now hold rubble into the nearest open cells; water stays conserved (moved, never deleted) and pore water stays in the rubble as moisture. lane-fk is re-scoped to this (one M lane, including the in-game collapse_wet proof); lane-fq, lane-fr and lane-fs are withdrawn.
  6. **Water direction (binding on every water lane).** "I want water physics to operate like minecraft but with pressure and realism. So you kno whow minecraft water spreads kinda slow." (a) Water spreads visibly cell by cell over ticks at a slow, Minecraft-like pace; the spread rate is a named tunable in each brief, never instant. (b) Pressure: connected water seeks a common level, pushes up through connections and loads barriers (lane-fj). (c) Realism: water is finite and conserved (closed mass), flows downhill and down levels, and there are no infinite sources. Applies to lane-ec, ec2, ee, ef, eg, ei, ej, em, fj, fm and fk, and to any later water lane.
- **Records updated with this entry:** `docs/worldgen/DEUS_WORLDGEN_WBS.md` (revision log); the PM's plan of record (lane table); mail to AG.
- **Amendment (Owner, 2026-10-01):** the four lanes item 2 kept now build the runtime spawner: lane-fc the danger field and tiers (NAT.07.02), lane-fe the spawn rules and draw (NAT.07.04), lane-ff despawn, notable persistence and lair refill (NAT.07.05) and lane-fi spawn on the first build of each (area, z) (WG.00.47). lane-fe's seeded creature placement becomes spawning during play, and lane-fi no longer builds a lazy wildlife population; see DEC-073.

### Decision `DEC-068`: Every door is two tiles tall and flush with the walls and roof
- **Date:** 2026-10-01 (~14:05Z)
- **Decider:** Owner, in chat: "I decided all doors in this game are going to be 2 tiles tall and flish with the walls and roof".
- **Status:** `DECIDED`
- **Ruling:** Every door is one cell wide and two cells tall (48x96 px), set in the wall plane with no protruding frame, its top meeting the roof line. Doors are civilization art (frozen in the natural-world phase, DEC-037): the ruling is recorded now and applied when doors are built. Any existing door row, request or spec that says otherwise is corrected when that work opens.
- **Records updated with this entry:** none yet (doors are not in the natural-world build).

### Decision `DEC-069`: The art rules of 2026-10-01: thresholds, the YES WITH FIX answer, packets of ten, the generation method and the budget (amends DEC-062 and DEC-063)
- **Date:** 2026-10-01 (~12:15-14:50Z)
- **Decider:** Owner, in chat with the PM (quotes in `art/COUNCIL_RECORD.md`).
- **Status:** `DECIDED`
- **Ruling:**
  1. **Thresholds (amends DEC-062).** Final rule: "if its 4/4 instapass it, if its 3/4 i will decide, itf its less than that chuck it". The Owner may override the council either way ("I can also override art council if I like something"). A piece that fails three full rounds is set aside. Every NO keeps its reason in `art/COUNCIL_RECORD.md`.
  2. **YES WITH FIX.** "Also give them the option of accepting the art with a recolor or small correction, tint, etc." Judges answer YES, YES WITH FIX (the exact recolour, tint or small correction) or NO with a reason; a YES WITH FIX counts once the PM applies the fix by tooling and records it; conflicting fixes go to the Owner.
  3. **Cadence.** "Generate 10 things and send them a packet"; "Feel free to generate 10 things at a time on pixellab".
  4. **Method (amends DEC-063 item 3).** Create Image Pro is allowed ("pro with reference and style images. RMMZ reference, U7 style, and make sure fo give Pixel size dimensions on everything"; "You can also use RMMZ examples + pro to develop entire sheets and tool off of them"; "you can even tool RMMZ assets onto examples that are the same size as the output"); the default is the method of the ten temperate cliff sets ("I want you to prompt however you were prompting those for things going forward"). Repeating tiles state their repeatable middle in the prompt ("Maybe thats something we can indicate in the prompt") and pass the RMMZ-table assembly test before a vote.
  5. **Budget (amends DEC-063).** "Continue generating art, no limit on generations", then "Use the rest of our generations ... (Ill pay for art after)": the PM spends the PixelLab balance to zero, then reports what worked and prioritizes the remaining art.
  6. **The ten temperate cliff sets are in game** by the Owner's override ("I think those all look great"; "All 10 go in").
- **Records updated with this entry:** pointer lines under DEC-062 and DEC-063; `art/COUNCIL_RECORD.md` holds the votes and quotes.
- **Amendment (Owner, 2026-10-01):** item 1 now counts three judges, MiniMax being removed: 3/3 passes, 2/3 goes to the Owner, fewer is out; see DEC-076.
- **Amendment (Owner, 2026-10-01):** for now the Owner grades the art and item 1's thresholds are not used; see DEC-079.

### Decision `DEC-070`: Equal faction starts, acceptable FPS, and the conditions on generating areas on first request (amends DEC-065 item 1)
- **Date:** 2026-10-01 (~12:45-13:00Z)
- **Decider:** Owner, in chat with the PM.
- **Status:** `DECIDED`
- **Ruling:**
  1. **Generation on first request, conditional.** "If they develop the same go for it, if it results in factions starting at different times because they werent generated? No way." Binding conditions: (A) no faction starts late: every faction-home area and home floor is generated at New Game, and lane-dd adds a check that all of them exist at tick 0; (B) built-late equals built-at-New-Game: lane-dd adds lazy-vs-eager and build-order permutation checks against lane-dc's eager 3x3 fixture (per-area checksums), and lane-dg repeats them per (area, z) for generator 6; (C) nothing that runs over time may make an area built later differ from one built at New Game: every lane that registers something at first build (lane-fi wildlife against Ecology baselines; water sources and rain targets; barrier pressure; lane-dl magma core funding) registers it at New Game for every area or catches up to the current game time, proven by a lazy-vs-eager test. Where a system cannot meet this, the eager rule (all 32 levels of every area at New Game) applies to that system.
  2. **Equal starts.** "I want all of the factions to have requally good starts, we need to balance plant growth and stuff across the biomes." Measurable parity rules (metrics, tolerances, tests, lane placement) come from the braintrust design round DESIGN-NW-1; any new plan leaf it needs goes to the Owner first.
  3. **FPS.** "FPS has to be acceptable. Anything we implement cannot slow FPS to a grind ingame. Part of it is figuring out a solution and another part is streamlining it." Every lane must keep frame time acceptable; the binding frame budget and the per-lane performance gate come from DESIGN-NW-1 and go to the Owner with it.
- **Records updated with this entry:** a pointer line under DEC-065.
- **Amendment (Owner, 2026-10-01):** in item 1 condition C, ordinary wildlife registers nothing at first build and needs no catch-up, so lane-fi registers no wildlife against Ecology baselines. Spawn designations (tier, tables, lair and den anchors, caps), lairs and dens, the depletion record and notable creatures must still come out identical whether an (area, z) is built at New Game or later, and per-area checksums exclude transient spawned creatures and include those; see DEC-073.

### Decision `DEC-071`: The PM makes the fauna in the PixelLab character creator as eight-way still sprites (amends DEC-062 and DEC-063, "no animals")
- **Date:** 2026-10-01
- **Decider:** Owner, in chat with the PM.
- **Status:** `DECIDED`
- **Quotes:** "I will work on fauna, give me cards"; "Every card should come with a RMMZ sheet example, and a U7 example"; "Actually, you know what, you can generate fauna. use the character creatuor with V3, high top down, and the corret sprite size, highly detailed, selective outlining"; "No animations for the fauna tho, just the 8 way sprite"; "bro what, literally a quadraped option" (with a screenshot of PixelLab Create Character, Quadruped selected, where v3 is greyed out and Pro is the selected mode).
- **Ruling:**
  1. **The PM generates the Group 7 fauna** (the 19 species in `docs/art/TEMPERATE_GENERATION_LIST.md` Group 7) in PixelLab Create Character. Humanoid-shaped creatures (troll, restless dead, bog horror) use v3 with view high top-down, outline "selective outline" and detail "high detail". Four-legged animals use the Quadruped type, which offers Pro mode only (v3 is not offered for quadrupeds); creatures with no quadruped skeleton (birds, bat, serpent, spider) also use Pro mode. Pro ignores the outline and detail settings, so its prompt states "highly detailed" and "selective outline". Every creature is drawn at its correct sprite size, within the frames of DEC-072.
  2. **No animations.** Eight-direction still sprites only. The game uses S, W, E and N for creatures (AS-GLOBAL-022); the four diagonals are kept.
  3. **Every piece is shown with its RMMZ example and its U7 example:** the stock RMMZ sheet it replaces and the matching Ultima VII sprite, in its card and in its council packet.
  4. **Unchanged:** catalogue row first, the council (DEC-062 as amended by DEC-069), the PM YEA in `art/APPROVALS.md` (DEC-056). People, facesets and character sheets for people stay with the Owner.
  5. **Temperate bestiary, row-first waived for this batch.** "You can do the fauna and monsters for the biome"; "Use the rest of the credits and present to the art council". Asked whether to waive DEC-007 row-first for the temperate creatures of the adopted bestiary (`docs/design/bestiary/BESTIARY_grok_heavy.md`, NAT.07.01) so the remaining PixelLab credits are spent now, the Owner chose "Waive, generate now". Their catalogue rows land through a reviewed lane before any of them enters the game. The six AS-SEX-002 partners (doe, sow, mare, aurochs cow, ewe, rooster) were generated before their rows the same day and are covered by the same condition.
- **Records updated with this entry:** pointer lines under DEC-062 and DEC-063; the art banners in `CLAUDE.md` and `AGENTS.md`.
- **Amendment (Owner, 2026-10-01, ~22:35Z):** "I said use V3 for humanoids. See he difference in animation style? I want V3 for humanoids and pro for animals." Humanoid shapes are generated in PixelLab v3 from text only: no Pixflux front view as a reference image, because that changed the look. Animals and other bodies are generated in Pro. Width is checked under the DEC-072 amendment of ~22:50Z.

### Decision `DEC-072`: Sprite scale and frames: small races 48 px tall, dwarves 60, humans 72, large races 96; tall humanoids in 48x96, long animals in 96x48, giants up to 96x96 (amends AS-GLOBAL-021, AS-PM-001 and AS-SIZE-001)
- **Date:** 2026-10-01
- **Decider:** Owner, in chat with the PM, while the PM was generating the Group 7 fauna (DEC-071).
- **Status:** `DECIDED`
- **Quotes:** "Lets try to keep the proportions right as well, I know pixellab lets us make longer quadrupeds, idk how that works in rmmz"; "Nah, now small races are 48, large races are 96, and humans are 72 in height"; "I would actually prefer tall humanoids like trolls fit inside of 48x96"; "And keep long animals within 96x48"; "And then giant shit I would like to limit to 96x96, thats like, dragons"; "So obviously the scale wont be perfect but its fantasy and its approximate and I think it wil look good". Then: "And then dwarves will be 60 tall. gnomes and halflings will be 48 tall".
- **Ruling:**
  1. **Heights.** Small races are 48 px tall (gnomes and halflings 48 px), dwarves 60 px, humans 72 px, large races 96 px. This replaces the 42 px adult human (AS-GLOBAL-021, scale chart row `CHARACTER_HUMAN_ADULT`) and the race heights in AS-PM-001.
  2. **Frames (RMMZ `$` sheets; the frame is drawn centred on the creature's tile with its bottom on the tile's bottom edge, so a larger frame overhangs the neighbouring tiles).** Small creatures fit inside 48x48. Tall humanoids, trolls included, fit inside 48x96. Long animals fit inside 96x48. Giant creatures, such as dragons, are limited to 96x96. The Huge 144 and Gargantuan 192 frames in AS-SIZE-001 and AS-PM-001 are withdrawn for map sprites.
  3. **Approximate.** Relative sizes follow real proportions only as far as these frames allow; every facing of a sprite must fit its frame.
- **Records updated with this entry:** amendment notes on AS-GLOBAL-021, AS-PM-001 and AS-SIZE-001 in `docs/art/DEUS_ASSET_STANDARD.md`; DEC-071 item 1.
- **Amendment (Owner, 2026-10-01, later the same day):** "We dont have to use my sizing rule. I Do want sizing to cap out at 96x96, and doors are going to be 48x96". Item 2 is replaced: the frame-shape rule (48x48 / 96x48 / 48x96, with 96x96 for giants only) no longer binds. Every map sprite, in every facing, fits within 96x96, in the smallest 48-multiple frame that holds it (48x48, 96x48, 48x96 or 96x96), so a long animal that is tall when it faces north or south may use a 96x96 frame. Doors are 48x96 (DEC-068). The heights of item 1 stay as the scale anchors (Owner, same exchange: "yeah keep the height anchors, its so all the humanoids fit inside all doors etc"). Relative sizes follow the art council's ART-SCALE-1 advice under the 96x96 cap. Not yet updated (data, through a reviewed lane): `game/data/DEUS_ScaleRegistry.json`, `art/catalogue/scale_chart.json`, the catalogue frame classes for humanoid rows, and the 42 px wording in `docs/art/TEMPERATE_GENERATION_LIST.md` and `docs/art/TEMPERATE_ART_NEEDS.md`.
- **Amendment (Owner, 2026-10-01, ~20:20Z):** "They need to look good in a 48 pixel wide space because if they are going to walk down a hallway we dont want them clipping". Every humanoid, giants and trolls included, is drawn at most 48 px wide in all four facings the game uses (south, west, east, north), so it walks a one-tile hallway or a 48x96 door without overlapping the walls. Heights stay as item 1. Width comes from the drawing (a narrow pose, arms and weapons held close), never from squeezing a finished sprite. The 18 humanoids measured wider on 2026-10-01 are redrawn.
- **Amendment (Owner, 2026-10-01, ~22:50Z), on pure v3 humanoids measuring 54-79 px wide:** "As long as the body is within 48px its fine. I dont want to change a bunch of stuff. If weapons or something clip the wall thats fine, as long as its just a pixel or two". The 48-px limit applies to the body in the four game facings. A held weapon or other gear may overhang a one-tile hallway by a pixel or two. A sprite whose body is wider than 48 px is redrawn; otherwise the drawing stands. Generation method: DEC-071 amendment.

### Decision `DEC-073`: Creatures are spawned, Minecraft-style but intelligent; no ecology simulation for wildlife and monsters
- **Date:** 2026-10-01
- **Decider:** Owner, in chat with the PM (ruling, then six questions the PM asked after a 13-agent repo sweep that found 124 affected lines).
- **Status:** `DECIDED`
- **Quote:** "We can just spawn shit into the woirorld like minecraft, the more I think about how deep I wanna get with ecology, we cna just spawn stuff in, but intelligently".
- **Ruling:**
  1. **Spawning replaces population simulation.** Wildlife and monsters are not produced by an ecology simulation: no breeding, birth or death curves, carrying capacity, food webs, migration or persistent population vectors for them. A seeded runtime spawner places them by intelligent rules: the biome-depth cell (DEC-030), the danger field and tiers (DEC-050), the bestiary rows and encounter tables (NAT.07.01, NAT.07.03), light, time of day, season (season weights stay off while DEC-059 defers seasons), density caps per cell, herd and group sizes, and distance from the player, starts and settlements. Each spawn is a pure function of the seed, the cell, the tier, z, the time window and an attempt index, checked against live nearby counts. Finite minerals never spawn (DEC-023).
  2. **Hunting thins, then recovers** (Owner answer: "Thin, then recover"). Heavy hunting lowers an area's spawn rate for a few in-game days, then the normal rules refill it. This is one small per-area depletion record, not a population.
  3. **Where spawns happen** (Owner answer: "Player + faction homes"). Around the player and around active AI faction settlements, so factions can hunt and be raided while the player is elsewhere. Hostile monsters are kept out of a radius around settlements and starts.
  4. **Despawn and persistence** (Owner answer: "Notables persist"). Tamed, captured, named, quest and lair creatures, and any creature carrying items, persist with stable IDs. Every other creature despawns only when it is far away and out of sight, so a herd the player can see never vanishes.
  5. **Lairs** (Owner answer: "Boss gone, minions refill"). A lair's boss is unique and gone for good once killed; its lesser occupants refill over time by the spawn rules.
  6. **Build now** (Owner answer: "Now, in planned waves"). The spawner is built in the natural-world build by the four lanes DEC-067 item 2 kept, in their planned waves after the physics lanes they depend on: lane-fc (danger field and tiers, NAT.07.02), lane-fe (spawn rules and draw, NAT.07.04), lane-ff (despawn, notable persistence and lair refill, NAT.07.05) and lane-fi (spawn on the first build of each (area, z), WG.00.47). This replaces DEC-050 item 4's "after the physics work".
  7. **Plan changes** (Owner answer: "Approve"). Cut: WG.68.09 food webs, WG.68.11 persistent populations, WG.68.12 and SIM.50.07 migration. Repurposed to the spawner: lane-fe, lane-ff, lane-fi, WG.68.08 (spawn eligibility, no carrying-capacity solver) and the Ecology increment of SIM.00.05 (flora regrowth plus spawn and despawn, no herd breeding). Shrunk to people, owned livestock, flora and notable creatures: SIM.40.10, WG.68.07 (a spawn profile, no population fields), WG.68.13 (spawn-origin classes), WG.68.14, SIM.30.01-05 (anonymous wildlife leaves the LOD summaries). Kept: lane-fd and lane-ex (the spawn tables), WG.68.10 (lairs and dens as persistent anchors), WG.68.15, WG.68.16, WG.00.38 (taming makes a creature persistent), SIM.50.12, GP.07.01 (its dependencies move to NAT.07.04/05, WG.68.07, WG.68.10, WG.68.16). In live code, DEUS_Ecology's hourly herd breeding (stepBreeding) and its New-Game baseline caps are retired by archiving, not deleting; its capped seeded spawn core (attemptSpawn, candidateValid, protectedReason) is the spawner's start.
  8. **DEC-070 condition C.** Ordinary wildlife registers nothing at first build and needs no catch-up. What must still come out identical whether an (area, z) is built at New Game or later: spawn designations (tier, tables, lair and den anchors, caps), lairs and dens, the depletion record, and notable creatures. Per-area checksums exclude transient spawned creatures and include those.
  9. **Mass ledger.** Spawned creature bodies sit outside the closed-mass ledger (DEC-040 as clarified 2026-09-29): spawning or despawning one is neither a mass source nor a sink. A despawning creature drops any conserved world material it carries; spawned-creature remains never become conserved soil.
- **Amendment (Owner, 2026-10-01):** items 3 and 4 are replaced: creatures spawn in and respawn across the whole world, not around the player, and a sky view shows their density and spawn points at the end of world generation; see DEC-080.
- **Unchanged:** flora regrowth by physical world rules (DEC-039 item 4 for plants); people and owned livestock keep lifecycle and breeding (civilization phase, SIM.40.10); the bestiary and encounter data; the eight-way still sprites of DEC-071.
- **Records updated with this entry:** pointer and amendment lines on DEC-012, DEC-014, DEC-028, DEC-037, DEC-039, DEC-040, DEC-041, DEC-050, DEC-057, DEC-059, DEC-067 and DEC-070; VISION, the rules files, ENGINE_RULES, ENGINEERING_STANDARD, ARCHITECTURE, PERFORMANCE_ARCHITECTURE, the WBS and registry, and the ecology design documents (sync per DEC-051, from the sweep's list of 124 verified lines and the completeness critic's 20 additions).

### Decision `DEC-074`: Mounting is a feature: ride tamed horses and similar mounts (scheduled after the natural-world phase)
- **Date:** 2026-10-01
- **Decider:** Owner, in chat with the PM.
- **Status:** `DECIDED` (timing: after the world-generation sprint, under DEC-037, unless the Owner moves it earlier)
- **Quote:** "With hourse being thesize they are, can we have  mounting as a feature" (after DEC-072's 96x96 cap let long animals use full-length 96x96 frames).
- **Ruling (the PM's answer, recorded as the feature definition):**
  1. A tamed mount (horse, pony, mule, warhorse, and any SRD creature the rules allow as a mount) carries one rider. Taming follows AS-TAME-001/002 and WG.00.39 (SRD 5.1 stat blocks, no creature gear or barding).
  2. Map art: the mounted pair is one sprite within 96x96: the mount's eight-direction sprite with a seated rider layered at the `MOUNT_SADDLE` socket (AS-BEAST sockets), using the mount's `SADDLE` variant (AS-SEX-002). Saddled mount variants are fauna art the PM makes (DEC-071); seated-rider poses are people art, made by the Owner.
  3. Rules: SRD 5.1 Mounted Combat (mounting or dismounting costs half the rider's speed; the mount moves at its own speed; a controlled mount can only Dash, Disengage or Dodge).
  4. World: a rider dismounts to pass a 48x96 door (DEC-068), a ladder, a shaft or a tight cave; deep water and dense woods restrict or slow a mount.
  5. Build: a new WBS leaf after the natural-world phase (DEC-037 keeps player and civilization systems frozen until then); it opens with the Owner's go.

### Decision `DEC-075`: MiniMax made a launchable autonomous worker (withdrawn the same day by DEC-076)
- **Date:** 2026-10-01 (AG commit `51058aa3`, 18:43Z)
- **Decider:** Owner, to AG in the Antigravity chat. AG's commit subject cited "DEC-075: Full Autonomous Minimax Authorization (Owner ruling)" but added neither this entry nor the Owner's words. The Owner confirmed it to the PM on 2026-10-01 (~19:13Z): "I did give that and then I nixxed minimax altogherht".
- **Status:** `SUPERSEDED` by DEC-076.
- **What it changed (commit `51058aa3`):** a `minimax` provider in `tools/ops/launch_worker.ps1` (run through `tools/ops/minimax_cli.js`, effort fixed at high), and the routing rule in `.agents/rules/deus-multiagent-routing.md` changed to "MiniMax is fully supported via the minimax_cli.js adapter". The same commit put a byte-order mark at the start of both files and re-encoded `docs/VISION.md` (repaired in `dd4b52ea`).

### Decision `DEC-076`: MiniMax is removed from the project altogether: no worker, no lane role, no braintrust consult, no art-council vote (supersedes DEC-075; amends DEC-062 item 1 and DEC-069 item 1)
- **Date:** 2026-10-01 (given to AG after DEC-075; confirmed to the PM ~19:13Z)
- **Decider:** Owner.
- **Status:** `DECIDED`
- **Quote:** "I did give that and then I nixxed minimax altogherht" (answering the PM's question whether AG's DEC-075 was the Owner's ruling).
- **Ruling:**
  1. MiniMax is not used for anything in DEUS: no worker launches, no lane roles, no braintrust consults and no art-council votes. `tools/ops/minimax_cli.js` is not run. The `minimax` provider that DEC-075 added to `tools/ops/launch_worker.ps1`, and the `minimax` entry in `tools/ops/pace.js`, come out through the coordinator. No open lane names MiniMax (lane-bv and lane-bx, its two writer lanes, are finished).
  2. **Art council (amends DEC-062 item 1):** the judges are the three remaining braintrust chats, ChatGPT Pro, Grok Heavy and Gemini Pro. The PM reads "altogether" as including the council; the Owner can restore a fourth judge.
  3. **Thresholds on three judges (amends DEC-069 item 1):** 3 of 3 passes; 2 of 3 goes to the Owner; fewer is out. The Owner's override and the YES WITH FIX answer are unchanged.
  4. **Past votes stand.** MiniMax's votes in rounds already tallied stay in `art/COUNCIL_RECORD.md` as history. Open rounds (ART-COUNCIL-16 onward) are tallied on the three judges; in ART-COUNCIL-16 MiniMax voted YES on all eleven pieces, so no outcome changes.
  5. **Braintrust consults** go to every remaining member: Codex (gpt-6-sol, DEC-077), Grok, ChatGPT and Gemini. The Owner's burn order of 2026-10-01 (MiniMax first, Codex second, Grok third) loses its first entry.
- **Records updated with this entry:** pointer lines under DEC-062 and DEC-069; the art banners in `CLAUDE.md` and `AGENTS.md`; the judges line in `art/COUNCIL_RECORD.md`; `.agents/rules/deus-multiagent-routing.md` (the DEC-075 line withdrawn, the byte-order mark removed); the MiniMax lines in `docs/CANONICAL_ROLES.md` and `tools/ops/ANTIGRAVITY.md`. The launcher and pace changes went to the coordinator (MSG-PRUNE-PM-120): `11d7e5c8` (pace, and the gpt-6-sol flag) and `9bb685f0` (the minimax provider removed). Under DEC-048 tooling changes on main are the PM's; the PM's mail asked for these, so that slip is the PM's.

### Decision `DEC-077`: OpenAI use is capped at gpt-6-sol, at ultra effort
- **Date:** 2026-10-01 (~19:00Z)
- **Decider:** Owner, in chat with the PM.
- **Status:** `DECIDED`
- **Quotes:** "Lets cap out openAI usae at GPT 6 SOL, astra is draining us too fast"; briefly "Actually lets cap OpenAI at gpt 6 luna"; then "ok, GPT6 sol then" and "Bump it to ultra".
- **Ruling:**
  1. Every OpenAI call (Codex writers and reviewers, Codex consults, the PM's ask helper) uses gpt-6-sol. gpt-6-astra is not called; work that seems to need more goes to the Owner.
  2. Effort: ultra (the launcher's Codex cap is already ultra).
- **Where it is set:** the PM's Codex config (`~/.codex/config.toml`: model and default subagent model gpt-6-sol, effort ultra) and the PM's ask helper. In the main working copy, `tools/ops/launch_worker.ps1` passes `--model gpt-6-sol` to Codex, uncommitted when this entry was written; the coordinator commits it with the DEC-076 launcher change.
- **Records updated with this entry:** this log; `.agents/rules/deus-multiagent-routing.md` names the cap.

### Decision `DEC-078`: Each AI may work several lanes at once
- **Date:** 2026-10-01 (~19:50Z)
- **Decider:** Owner, in chat with the PM.
- **Status:** `DECIDED`
- **Quote:** "We can have each AI doing multiple lanes" (after the PM's lane report: wave 2 had run one worker at a time, and 60 of 73 build lanes had not started).
- **Ruling:**
  1. A provider (Codex, Grok, Gemini, Claude) may hold several lanes at the same time, as writer in some and reviewer in others. The coordinator launches every lane whose brief, manifest and dependencies are ready, and does not queue a lane behind another lane's unrelated review.
  2. Unchanged: each lane's writer and reviewer come from different families (DEC-031, DEC-058). Lanes running at the same time do not share files (`docs/CANONICAL_ROLES.md` section 4, one writer per file set; the catalogue slot of WORK-GATE G02 section 4). Reviews are real launches through `tools/ops/launch_worker.ps1` (`docs/AUDIT_LOG.md` A12). Quotas are paced, and OpenAI stays capped at gpt-6-sol (DEC-077).
- **Records updated with this entry:** `docs/CANONICAL_ROLES.md` section 4; `.agents/rules/deus-multiagent-routing.md`.

### Decision `DEC-079`: The braintrust is dropped for now, and the Owner grades the art (suspends the art council of DEC-062, DEC-069 and DEC-076)
- **Date:** 2026-10-01 (~19:55Z)
- **Decider:** Owner, in chat with the PM.
- **Status:** `DECIDED` ("for now": until the Owner restores the braintrust)
- **Quotes:** "Drop the braintrust for now"; then "I will grade the art".
- **Ruling:**
  1. **No braintrust consults** until the Owner restores them: no chat packets, no Codex or Grok consults, no braintrust WORK-GATE or answerability checks. The PM makes those calls directly and records them. Merges still go through merge_gate with a real cross-family review (DEC-048, `docs/AUDIT_LOG.md` A12).
  2. **The Owner grades the art.** The art council is suspended. The PM machine-checks each piece (RMMZ format, seams, anchors, palette, size, no squash, door fit), shows the Owner a board of the exact versions, and records the Owner's grade with any reason in `art/COUNCIL_RECORD.md`. The PM YEA or NAY follows in `art/APPROVALS.md`.
  3. **Rounds in flight.** ART-ANALYSIS-1, sent to ChatGPT, Grok, Gemini (through AG) and Codex at ~19:37Z, is withdrawn, and the PM writes the analysis. ART-COUNCIL-16's votes were cast before this ruling. They are recorded as history, and its pieces go to the Owner for grading.
- **Records updated with this entry:** pointer lines under DEC-062 and DEC-069; the art banners in `CLAUDE.md`, `AGENTS.md` and `GEMINI.md` (GEMINI.md also gets the DEC-071 and DEC-076 text it had missed); the judges line in `art/COUNCIL_RECORD.md`.

### Decision `DEC-080`: Creatures spawn in and respawn across the whole world, and a sky view shows their density and spawn points (amends DEC-073 items 3 and 4)
- **Date:** 2026-10-01 (~20:00Z)
- **Decider:** Owner, in chat with the PM.
- **Status:** `DECIDED`
- **Quotes:** "One thing about monster and wilflife population, I want to be able to see it, I dont want it to just generate around the character. I want them to  spawn in and respawn"; then "So I should be able to look, at the end of world gen, scroll across the lands from the sky and see the density of wildlife and enemies and where they spawn etc".
- **Ruling** (the PM's reading for the spawner lanes; the Owner can correct it):
  1. **The whole world, not a bubble around the player** (replaces DEC-073 item 3's "around the player and around active AI faction settlements"). Every area has its own wildlife and monster population, whether or not the player is near. Spawn designations (anchors, tier, caps, density per cell) are pure functions of the seed and the cell (DEC-073 item 1), so world generation computes them for every area, including areas whose terrain has not been built yet. Hostile monsters stay out of the radius around settlements and starts.
  2. **Spawn in.** Creatures enter the world at in-world spawn anchors: dens, lairs, burrows, roosts, cave mouths, water edges, and the area's own edges, where they walk in from off-map. They never appear out of thin air beside the player or in the player's view.
  3. **Respawn.** A creature that dies, is hunted out or leaves is replaced over time by its anchor's rules. DEC-073 item 2 (heavy hunting thins an area, then it recovers) and item 5 (a lair's boss is gone for good; its minions refill) still apply.
  4. **Persistence** (amends DEC-073 item 4). Creatures belong to their area and do not despawn because the player walked away. Away from the player, anonymous creatures are kept as counts and respawn timers per anchor, not as live units, so they cost no per-frame work (DEC-070, AGENTS.md Rule 14). They become units again when their area is shown. Notables persist as DEC-073 item 4 says.
  5. **The sky view.** At the end of world generation the Owner can scroll across the whole world from the sky. It shows where wildlife and monsters are, how dense they are and where they spawn: anchors by kind, tier, caps, counts and respawn timers, per area and z. The view reads the spawn designations and anchor counts; it does not build terrain for every area. It is part of the spawner build (lanes fc, fe, ff and fi plus one view lane the PM mints when it is briefed, Owner request 2026-10-01). It is also the acceptance view for creature placement in world generation.
  6. **Unchanged:** DEC-073 items 1, 2, 5 and 7 to 9; DEC-070 condition C as DEC-073 item 8 applies it, with the anchor counts starting full and identical whether an area is first built at New Game or later; the mass rule of DEC-073 item 9.
- **Records updated with this entry:** a pointer line under DEC-073; `docs/design/SPAWNER_DEC073.md` (a DEC-080 note before section 1); the WG.00.47 row of `docs/worldgen/DEUS_WORLDGEN_WBS.md` (a note); DEC-080 notes on the lines that stated DEC-073 items 3 and 4 in the DEC-012 and DEC-041 amendment lines here, ENGINEERING_STANDARD, ENGINE_RULES, PERFORMANCE_ARCHITECTURE (two lines), ADR-003 (its header and two LOD lines), RESOURCE_ATLAS, WORLD_ARCHITECTURE, DEUS_Ecology and DEUS_CREATURE_ECOLOGY.

### Decision `DEC-081`: Agent mail runs on a half-hour schedule
- **Date:** 2026-10-01 (~20:07Z)
- **Decider:** Owner, in chat with the PM.
- **Status:** `DECIDED`
- **Quote:** "We can do the mail on a half hour schedule" (after the PM reported that AG mail commits had landed on main during merge_gate runs, which refused the lane-db merge twice with MAIN_DIRTY).
- **Ruling:**
  1. PM and AG exchange mail twice an hour, in windows at :00 and :30 UTC. In each window each side reads the other's mail and sends what it has batched as one mail commit on main. No mail commits land on main between windows.
  2. merge_gate runs between windows, never from :55 to :05 or from :25 to :35, so a mail commit cannot land during a merge. A merge, and the PM's telemetry snapshot just before it, are not mail.
  3. The Owner's own instructions to AG in the Antigravity chat are not mail and are not held for a window.
- **Records updated with this entry:** `docs/agents/mailboxes/README.md` (a Schedule section); `.agents/rules/deus-multiagent-routing.md` (one line).

### Decision `DEC-082`: AG keeps working when the PM is out of usage: a hand-off queue, a merge_gate authorship check, then AG may run merge_gate (amends DEC-048 once lane-gg merges)
- **Date:** 2026-10-01 (~19:05Z, recorded ~20:20Z)
- **Decider:** Owner, answering the PM's question after "When you run out of usage how can AG operate without you".
- **Status:** `DECIDED`
- **Owner's choice:** "Do all three": "Hand-off queue now; governance lane for the authorship check (reviewed by an independent family); then AG may run merge_gate itself; fauna scripts moved into tools/art/fauna/."
- **Ruling:**
  1. **Hand-off queue.** `C:/Users/snewt/.deus_ops/AG_QUEUE.md` is the PM-offline playbook. It lists what AG may do without the PM (launch ready lanes, request real reviews, mail the Owner) and what waits for the PM (new briefs, rulings, merges until item 3, art choices).
  2. **Authorship lane.** lane-gg (OPS.GATE.AUTHOR; writer codex, reviewer grok) makes merge_gate refuse a commit whose author is not the identity its tag requires: `deus-<provider>` for workers, `deus-pm` for the PM, `deus-ops` for the coordinator (AUDIT_LOG A12-3).
  3. **Then AG may run merge_gate** (amends DEC-048 items 1 and 3, effective when lane-gg merges). Only through merge_gate, with `--no-ff` and never `--force`. Only on a lane whose review is a real launch by a family independent of the writer, and never on a lane AG wrote or reviewed. Merges run between mail windows (DEC-081). Before then, the PM merges.
  4. **Fauna scripts in the repo:** done, `tools/art/fauna/` on lane-gf (`6ae73064`).
- **Records updated with this entry:** a pointer under DEC-048; `docs/AUDIT_LOG.md` A12-3 (the lane that answers it).

### Decision `DEC-084`: MiniMax re-enabled temporarily
- **Date:** 2026-10-01 (~18:25 local)
- **Decider:** Owner
- **Status:** `DECIDED`
- **Quote:** "Task out minimac too until that sub runs out"
- **Ruling:**
  1. MiniMax (minimax provider) is authorized for launches and lane roles again, suspending DEC-076.
- **Records updated with this entry:** .agents/rules/deus-multiagent-routing.md.

