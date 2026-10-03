# Owner follow-up and resume dispatch

Recorded 2026-10-02 from the Owner's pasted instructions (20:25, 20:26, 20:43 and 20:45 CT directives plus the depth direction). Explicit instructions here override stale dispatch restrictions in BRIEF.md. No main checkout, stash or backup-branch changes; no merge before Deus checks on the laptop.

## ORG-0.2: continue now

Latest Owner steering, 2026-10-02: the depth queue is accepted, including the DEC-011 correction. ORG-0.2 is the only active lane. Log art-scale/fullscreen/RMMZ/depth questions and queue them; spend no implementation time on them before green. Next report must focus on items (a) and (c), with commit SHAs and fresh controlled-seed run_tests.bat RESULT lines.

Claude remains the sole writer, strongest available model/max effort. Grok reviews the completed exact SHA. Seed 1920951434, year 500, no Z-range override for every run. Keep the existing controlled-snapshot method and the real run_tests.bat entry point. One commit per fix; after each, retain the actual RESULT and tested SHA. No test loosening, new plugins, art, faction/society work or game/js/libs edits.

The previous worker committed 248fc691 and built snap_F1_248fc691, then stopped before a recorded F1 result. On 2026-10-02 the PM's live process census found neither the recorded Claude PID 11064 nor launcher PID 6616 nor a live NW.js test. The old registry's RUNNING label is stale. The cause of the stop is unknown; do not label it quota exhaustion or a failed fix.

Resume by validating the snapshot/source/seed, run the missing post-fix test, record item (a)'s outcome and inspect every produced screenshot. If item (a) is demonstrated repaired, continue (b) early NW.js exit/missing RESULT, then (c) rivers, (d) density, (e) camps and (f) remaining listed defects. The earlier item-(a)-only dispatch is superseded. Maintain scratchpad/lane-worldgen-green/NOTES.md. Stop dependent work for any unapproved test correction; two unsuccessful fixes of one item require PM handoff to another model with notes.

## Item (c): approved input correction

The Owner explicitly approves replacing DEUS_WorldGen.js:2225's const rivers = [] with WorldGen.riverModels(st) or equivalent, after repairing that API to read rivers actually carved into generated-world hydrology/tile data. Never create catalogue-only river objects or fake data to satisfy tests. Keep rivers_count, river_not_through_start, continuity and distance assertions and thresholds exactly unchanged. If a correct world still fails one, report it; do not change it.

Run git log -L or blame and name the introducing commit/agent. The earlier PM record identifies 2c23b61b68dc53b73b6a764cbc6de2c43579bb0a, subject [astra] WG.WORLDGEN.06 Engine Bridge, Git author deus-pm. Recheck attribution; recorded author and subject are evidence, not proof of the actual model. Audit other literal [] / {} / 0 test inputs and their consumers. Distinguish ordinary empty fixtures/accumulators from stubs and vacuous checks. The old river distance and continuity checks can now fail for real; fix the world, not their thresholds.

## Usage policy

Use docs/ops/USAGE.md before every assignment. Writers may finish while reviewers are out; review queues, and merges wait. No mid-lane writer switch merely for low quota. Unknown reset dates stay unknown.

## Queue after ORG-0.2 green: UI-FULLSCREEN

Owner authorized; not started. Writer Grok, reviewer Claude. No parallel worldgen work. Fill the monitor at boot and resize at any aspect ratio, with Graphics.resize and corresponding scene/spriteset, tilemap and culling viewport updates. Extra space shows more world; no stretching or fixed 816x624 letterbox. Integer 1x/2x pixel scaling stays crisp. Use NW.js fullscreen for F4 or Alt+Enter and a start-fullscreen option. Anchor level, speed, zoom and hotbar HUD to screen edges. Prove culling covers the larger viewport, run_tests.bat is no worse, and report before/after frame time at 1920x1080 and 2560x1440 with the measurement method. Inspect screenshots at 1920x1080 and ultrawide or 16:10 showing no bars and correct HUD placement.

## Queue: RMMZ-DISABLE audit before implementation

Owner authorized; PM queues it after green to keep the current work serial. Writer Grok, reviewer Claude. Step 1 is read-only: list built-ins, cite the actual DEUS replacement and report whether each built-in currently runs or draws. Candidates: weather; tint/flash/shake; map fog/parallax; encounters; battle; menu/items/skills/equip/status; followers/vehicles/map NPCs; tilemap passability/region IDs; duplicated clocks/day-night; autosave/title only if replaced. Check actual engine call sites rather than trusting names in the candidate list.

Step 2 is Owner approval of the concrete list. Anything without a replacement stays on. Step 3 disables only approved built-ins at their source in one early DEUS_RMMZOverrides.js plugin (or the later core section), with comments naming replacements. This new-plugin exception belongs to that future lane, not ORG-0.2. Final proof: no stock Weather sprite/update, DEUS weather still visible, tests no worse, docs/architecture/RMMZ_OVERRIDES.md, inspected rain screenshot. Deferred DEUS weather is not a functioning replacement; report it during the audit rather than expanding weather scope.

## Depth presentation: all work waits for green

Use DEC-011 for flat rendering (the pasted DEC-010 reference is a numbering error; DEC-010 concerns rock ledge support). Every z-level has equal relative scale; no default blur, depth zoom or colour filter. Preserve the existing shared camera zoom decision.

Implement approved art/draw-order cues first, in this order: inner side walls inside openings; rim shadows on the layer below; darker, cooler palettes baked into deeper art; height edges/ramps/half-steps with front faces; hanging/falling roots, vines, stalactites, waterfalls and light shafts; deep light sources such as lava, fungus and torches. Existing art authority still applies: no autonomous generation, and no new animation mandate.

Only openings reveal lower layers. At each exposed location stop at the first solid surface; never draw covered tiles, units, props or effects underneath. Hide the upper level when looking down; dither cutaways around colonists and the cursor using the same canopy fade as trees. Test whole-pixel parallax, code-applied haze and slightly smaller lower layers independently, each off by default; enable only after measured benchmark headroom and Owner in-game approval.

Repair the layer switch as a quick presentation fade with no map reload and no one-tile unit jump; preserve state and movement. Earlier DEC-020 specifies continuous no-fade ramp traversal; apply this fade to explicit view switches, retaining continuous unit traversal unless the Owner directs otherwise. This is the PM's interpretation of the two compatible requirements, to be checked in the eventual brief. No rendering switch is implemented or enabled by this record.
