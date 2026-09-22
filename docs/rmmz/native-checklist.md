# RPG Maker MZ Native Capability Checklist — Project DEUS

**Audit Scope**: RPG Maker MZ v1.10.00 Native Desktop Session Verification  
**Repository Root**: `C:\Users\snewt\OneDrive\Desktop\UF`  
**Execution Status**: `NOT RUN` (All native interactive GUI verification items)  
**Documented Blocker**: Direct native observation requires a targetable RPG Maker MZ desktop window with active human/GUI input injection. The current audit runs in an automated, non-interactive agent environment without an attached desktop GUI automation session. Native checks are recorded with step-by-step procedures for user-operated native Playtest (F5) validation.

---

## 1. Summary of Native Checkpoints

| Check ID | Verification Area | Target Capability | Native Status | Blocker / Requirement |
|---|---|---|---|---|
| `NAT-001` | Project & Bootstrap | Editor loads `game.rmmzproject` without schema error | `NOT RUN` | Requires opening `RPGMZ.exe` GUI and inspecting map editor hierarchy. |
| `NAT-002` | Project & Bootstrap | Title screen boots directly to `Scene_Title` with custom background | `NOT RUN` | Requires visual inspection of desktop canvas output. |
| `NAT-003` | Lifecycle & Hooks | New Game transition from `Scene_Title` to `Scene_Map` via `DataManager.setupNewGame` | `NOT RUN` | Requires clicking "New Game" in desktop window. |
| `NAT-004` | Rendering & Camera | Fixed aspect ratio letterboxing / pillarboxing on window resize (F3 / F4) | `NOT RUN` | Requires native desktop window resizing and fullscreen toggle. |
| `NAT-005` | Rendering & 2.5D | Dynamic depth sorting of tall walls and multi-tile sprites during traversal | `NOT RUN` | Requires character movement across Y/Z plane in active playtest. |
| `NAT-006` | Input & Interception | HUD windows intercept mouse clicks without passing clicks through to map | `NOT RUN` | Requires pointer click on active HUD button while observing map cursor. |
| `NAT-007` | Input & Screen Transform | Accurate tile/entity picking under cursor across letterboxed window | `NOT RUN` | Requires hovering and clicking across varied screen positions. |
| `NAT-008` | Persistence & Storage | Saving game creates valid compressed `.rmmzsave` in `game/save/` | `NOT RUN` | Requires triggering Save menu in desktop playtest. |
| `NAT-009` | Persistence & Storage | Loading saved game restores colonist state, items, and map modifications | `NOT RUN` | Requires restarting playtest and clicking Continue. |
| `NAT-010` | Error Handling | Missing sprite or image renders fallback or reports clean error in F8 console | `NOT RUN` | Requires inspecting DevTools console in active NW.js session. |
| `NAT-011` | Streaming & Chunks | Continuous player movement across chunk boundary without hitching or freeze | `NOT RUN` | Requires real-time traversal across 256x256 chunk seams. |
| `NAT-012` | Frame Rate & Throttling | Window maintains 60 FPS when focused; halts updates when minimized | `NOT RUN` | Requires monitoring native FPS counter (F2) and alt-tabbing. |

---

## 2. Step-by-Step Manual Native Test Procedures

### NAT-001: Editor Project Loading
1. Launch `C:\Program Files (x86)\Steam\steamapps\common\RPG Maker MZ\RPGMZ.exe`.
2. Open `C:\Users\snewt\OneDrive\Desktop\UF\game\game.rmmzproject`.
3. **Expected**: Project opens cleanly. Map list displays `Map001` ("The Bastion of Kraghold"). Database opens without parsing warnings.
4. **Failure Criteria**: Editor displays "Failed to load project", XML/JSON syntax errors, or corrupted map tree.

### NAT-002 & NAT-003: Title Screen & New Game Transition
1. In the RMMZ editor, press **F5** (or run `launch_demo.bat`).
2. Observe boot sequence in NW.js window.
3. **Expected**: Center loading spinner appears briefly, then cleanly fades into `Scene_Title` displaying `DEUS_Title` graphic.
4. Select **New Game**.
5. **Expected**: Direct transfer into `Scene_Map` at starting coordinates `(25, 20)` on Bastion template. No infinite loading spinner. Zero errors in DevTools console (**F8**).
6. **Failure Criteria**: Loading spinner hangs indefinitely; console reports `ReferenceError`, `TypeError`, or unhandled promise rejection.

### NAT-004: Window Resizing & Aspect Ratio Scaling
1. While running Playtest in windowed mode, click and drag window borders to change aspect ratio (e.g. ultra-wide or vertical).
2. Press **F4** to toggle fullscreen.
3. **Expected**: Canvas remains crisp and centered with black letterbox/pillarbox bars preserving the native logical aspect ratio. Sprites do not stretch or distort.
4. **Failure Criteria**: Distorted pixels, blurred scaling, or canvas stretching to non-uniform aspect ratios.

### NAT-005: 2.5D Depth Sorting & Occlusion
1. Move the avatar or observe colonists walking behind a 2-grid-high wall (upper 48px black top-cap).
2. Move in front of the wall.
3. **Expected**: When the character's base $Y$ is less than the wall base $Y$, the character renders behind the wall. When the character passes south of the wall base, the character renders in front of the lower face.
4. **Failure Criteria**: Character renders on top of the black wall-top cap while standing behind it, or flickers between front and back.

### NAT-006 & NAT-007: Input Routing & Screen-to-World Picking
1. Click on the Colony Overseer HUD or inspector window.
2. Click on ground tiles behind or adjacent to the HUD window.
3. **Expected**: Clicks on HUD elements activate HUD buttons and DO NOT issue movement or job orders to the world beneath. Clicks on the game world correctly select the entity or tile directly under the mouse pointer.
4. **Failure Criteria**: Clicking a UI button simultaneously commands a colonist to walk to the tile beneath the button.

### NAT-008 & NAT-009: Save / Load Integrity
1. In-game, open menu (Escape / Right-click) and select **Save**.
2. Save to Slot 1. Confirm `.rmmzsave` is written to `game/save/file1.rmmzsave`.
3. Press **F5** to restart the game.
4. Select **Continue** -> Slot 1.
5. **Expected**: World state, colonist positions, inventory items, and dynamic structures resume exactly as saved. No crash on `JsonEx.parse`.
6. **Failure Criteria**: Crash with "Object too deep", corrupted map data, missing colonists, or lost inventory items.

### NAT-010: Missing Asset Defensive Handling
1. Request a non-existent character sprite name via console: `$gamePlayer.setImage("NonExistent_Sprite", 0)`.
2. **Expected**: Engine reports `LoadError` in console with clear file path; development harness traps error or presents clean diagnostic message.
3. **Failure Criteria**: Silent hard freeze of process with unhandled crash.

### NAT-011: Map & Chunk Traversal
1. Move colonist/avatar across area boundary.
2. **Expected**: Seam transition occurs within 1 frame (< 16ms) without dropped frames or stutter.
3. **Failure Criteria**: Audio glitches, frame hitching > 100ms, or visible void tears.

### NAT-012: Background Focus & 60 FPS Stability
1. Press **F2** to display the native FPS counter.
2. Observe FPS during active simulation (should display steady 60 FPS).
3. Click away from the playtest window (lose focus).
4. **Expected**: When window loses focus, engine pauses scene updates (`SceneManager.isGameActive() === false`). When refocused, simulation resumes smoothly without time-jump explosion.
5. **Failure Criteria**: CPU spikes to 100% when unfocused, or simulation accumulates huge delta ticks causing teleportation.

