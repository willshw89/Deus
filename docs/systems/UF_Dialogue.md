# UF_Dialogue

## 1. Purpose

`game/js/plugins/UF_Dialogue.js` is the legacy event dialogue window. It opens a keyword-driven conversation for an event note tag, shows a portrait, and retains the plugin's existing party recruitment and dismissal behavior. Its portrait is the stock RPG Maker MZ `People1` face sheet while original faction portraits await approval; no Ultima-derived face is loaded at runtime.

The newer generated-world conversation system is `UF_Talk`. This plugin remains enabled for legacy authored events and is not a replacement for `UF_Talk`.

## 2. Public API

- `UF_Dialogue.start(key)` closes an existing legacy dialogue window, then opens the database entry named by `key`. An unknown key falls back to the first legacy entry.
- `UF_Dialogue.faceSheet()` returns the runtime portrait sheet name, currently `People1`.
- An event whose note contains `<dialogue: Key>` calls `UF_Dialogue.start(Key)` instead of its ordinary event start.

The window owns its keyword list, conversation log, selection rectangles, and selected keyword. These are implementation details. The face indices in the internal database are integers from 0 through 7, matching the stock sheet's 4-by-2 layout.

`Window_Base.drawFace` blits synchronously. The dialogue therefore listens for the stock face bitmap to finish loading and refreshes an open window once, so the first portrait opened from a cold cache is not left blank. Closing the window prevents that callback from repainting it.

## 3. Events

None. The plugin aliases `Game_Event.start` for the note tag and `Scene_Boot.start` only to register its opt-in test suite after `UF_Test` has loaded.

## 4. Save data

No custom save key. Recruitment and dismissal use RPG Maker's `$gameParty`, whose actor membership is saved by the engine.

## 5. Checks

Run the opt-in suite on a fresh snapshot:

```text
node tools/run_tests.js dialogue --game <snapshot>
```

- `dialogue.stock_face_contract`: the configured sheet is `People1` and every dialogue face index fits 0 through 7.
- `dialogue.stock_face_loaded`: the actual stock bitmap is ready at 576 by 288 pixels and a dialogue window opened.
- `dialogue.portrait_drawn`: pixels strictly inside the portrait destination are opaque, so the frame border cannot satisfy the check.
- `dialogue.dialogue_visible`: the real window is attached, open, visible, and within the game viewport.
- `dialogue.closed`: closing detaches the window and clears the active-window reference.
- `dialogue.no_errors`: the exercise recorded no new uncaught errors.

The suite is not a default smoke suite. It takes `dialogue.stock_portrait.png`; open that image before reporting the visual result. To demonstrate the runtime inventory guard can fail, change only the snapshot's runtime face literal back to the forbidden legacy face, rerun the inventory generator with both `--game` and a snapshot-local `--out`, and observe `runtime_no_standins` fail. Do not make that mutation in the live project.

## 6. Status

The stock portrait replacement and cold-cache redraw are implemented on 2026-09-19. The plugin's hardcoded legacy dialogue, names, compatibility aliases, and recruitment model predate the generated-world systems. Some legacy player-facing terminology does not meet the current naming rules; that content is a known separate cleanup and was not rewritten as part of the runtime-art task. RMMZ editor Playtest remains a project gate even when the snapshot suite passes.
