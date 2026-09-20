# UF_FarmView

Date: 2026-09-19. Read-only stage indicators and hover explanations for `UF_Agriculture` plots. Load after Agriculture and Look. The actual cultivated object remains the catalog's `farm_plot`; temporary native-resolution code-drawn sprouts/caps and a small stage bar show saved growth. Dashed bounds mean a reserved but not yet tilled plot. Original crop-state art is requested separately; these indicators are not approved final artwork.

## API

- `model(plot)`: detached `{id,cropId,name,area,x,y,z,phase,phaseText,progress,stage,needsCare,reason}` or null. Progress derives from actual recorded growth and crop duration, never elapsed render time.
- `inspect(ref)`: the above model for a saved plot at `{area,x,y,z}`; missing state remains missing.
- `lines(ref)`: cultivation and optional condition strings. A reserved bed is not described as planted; a ripe crop is not described as harvested.
- `decorate(lines,x,y)`: returns the existing Look lines plus farm information for the viewed level only. Keeps unexplored cells unknown and removes stale/duplicate farm additions.
- `markers()`: visible pooled plot sprites of the current scene, with `_ufFarm` read-only view models; intended for tests.

## Hooks and state

Aliases `Spriteset_Map.createCharacters/update` for direct tilemap-child markers and `Scene_Boot.start` for Look integration. Public Look describe/inspect readers and its documented `TipSprite.update` seam are decorated; the latter matters because live hover uses closure-local inspection. No core file or Look source is edited. Existing modal and fog behavior remains with Look. No input, job, growth event, saved state or action text over creatures is added.

Only plots on the displayed level and within the viewport margin draw. Sprites are pooled; bitmaps are reused by crop/phase/stage/care state. No per-frame bitmap creation and no simulation initializer is called. There is no animation generated in code.

## Checks and status

`node tools/test_farm_view.js` loads actual source with explicit UI/engine doubles. Covers factual growth/care text, level-specific tooltip, live hover seam, no duplicate lines, fog, read purity, correct marker position/level, pool reuse, bitmap reuse, offscreen hiding and missing-state purity. `--mutate-view` deliberately reads Ground plots while underground and must fail marker assertions. Runtime screenshots and editor F5/F8 remain separate acceptance evidence.

Known limits: small indicators are temporary art; no manual farm-designation interface or new hotkey, crop disease, irrigation structures or animated plant sway is supplied by this view. Unknown/unsupported saved plot phases are not drawn as healthy growing crops.
