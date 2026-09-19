# UF_Gumps: legacy containers and actor paperdoll

**Owner:** Codex · **File:** `game/js/plugins/UF_Gumps.js`

## 1. Purpose

Provides the existing event-container windows and party-leader equipment panel. The container background is an in-memory `Bitmap` with a plain dark interior and two-pixel border, attached to the window's visible back sprite. The paperdoll uses the stock `People1` face 0 placeholder (AR-700); container art remains under AR-800. These windows do not load the former stand-in face or container images. This is the legacy actor/party interface, separate from the world-unit sheet in `UF_Sheet`.

## 2. Public API

The compatibility namespace remains `window.UF_Gumps`.

| Member | Arguments and result |
|---|---|
| `UF_Gumps.openContainer(containerId, type = "chest")` | Opens a centered 360×240 item list in the current scene, replacing an existing container window. Returns `undefined`; disabled by `EnableGumps = false`. |
| `UF_Gumps.openPaperdoll()` | Toggles the centered 480×480 panel for `$gameParty.leader()`. Returns `undefined`; disabled by `EnablePaperdoll = false`. |
| `$ufContainers` | Existing global dictionary keyed by container ID. Each value is `{ type: string, items: [{ id: number, amount: number }] }`. A new container is created lazily when opened. |

An item selection transfers one database item into the party, decrements the container amount, removes an exhausted stack, and refreshes the list. The final row closes the container. Type labels include chest, barrel, backpack, sack and crate; all use the same plain panel.

Plugin commands remain `OpenContainer` (`containerId`, optional `type`) and `OpenPaperdoll`. Event notes matching `<container: TYPE>` or `<container: TYPE, ID>` open a container instead of starting that event's command list. Without an ID, the key is `chest_<eventId>`.

The `I` key toggles the paperdoll when no game message is busy. Menu/cancel input closes it. The paperdoll shows actor name, class, level, experience, attributes, equipment and HP/MP; portrait redraw waits for the stock face bitmap to finish loading.

## 3. Events

No UF events emitted or listened to. Aliases `Game_Event.start`, `Scene_Map.update`, `Scene_Map.updateScene`, `DataManager.makeSaveContents`, `DataManager.extractSaveContents` and `Scene_Boot.start`, calling the original in each case except the existing container-note interception of `Game_Event.start`. Core rendering overrides are confined to this plugin's container subclass (`_refreshBack`).

## 4. Save data

`DataManager.makeSaveContents().ufContainers` contains the dictionary described above. `extractSaveContents` restores that key when present. Windows, generated bitmaps and portrait resources remain outside save contents. Save shape is unchanged by the 2026-09-19 stock-art swap.

## 5. Checks

The opt-in `gumps` suite registers at boot only while `UF.Test.active` is true. Run it on a disposable snapshot with both plugin parameters enabled:

```text
node tools/run_tests.js gumps --game <snapshot>
```

| Check | What it proves |
|---|---|
| `enabled` | Both interfaces are enabled in the tested plugin parameters. |
| `plain_chest`, `plain_barrel`, `plain_backpack`, `plain_sack`, `plain_crate` | The window is visible, open, attached and on screen; its displayed bitmap is the generated 360×240 panel with opaque interior pixels and border, no image URL, and no skin frame. |
| `take_item` | Selecting the first item adds one to the party and leaves one in the container. |
| `save_roundtrip` | Real save serialization/deserialization retains the container type and remaining quantity. |
| `close_<type>` | Selecting each container's final row detaches it and clears the active-window reference. |
| `stock_face_drawn` | The paperdoll displays the loaded `People1` bitmap and has more than 1,000 painted pixels in its portrait rectangle. |
| `runtime_no_standins` | Observed image requests include the stock face and contain no former stand-in prefix. |
| `no_container_images` | Opening all five types requests no gump image. |
| `paperdoll_toggle` | Calling the paperdoll API a second time detaches it. |
| `no_new_errors` | The run records no new uncaught errors during these operations. |

The suite produces `gumps.plain_container.png` and `gumps.stock_paperdoll.png` for visual review. It restores the test container, party item quantity and image-loader methods afterward. Fault injection belongs only in a disposable snapshot: replace the `PAPERDOLL_FACE` constant with the former stand-in face to challenge the portrait/runtime checks, or change the generated interior fill to challenge all five plain-panel checks. `tools/generate_asset_inventory.js` supplies the broader `runtime_no_standins` scan across plugins.

## 6. Status (2026-09-19)

- Implementation: former stand-in loads replaced by a code-drawn visible panel and stock face, with a load listener for the first paperdoll opening. Static syntax and snapshot evidence are recorded in `docs/STATUS.md` by the integration run; this page does not claim F5 validation.
- RMMZ editor F5/F8 and user approval: not checked in this implementation subtask.
- Existing limits retained: container IDs default only from event ID (not map ID); item IDs try items before weapons/armors and carry no database-kind discriminator; these containers are party inventory, not the world-unit item system. Despite legacy drag fields, dragging and depositing are not implemented. The existing save hook does not clear containers when loading a save that lacks the key. The paperdoll uses one placeholder portrait for every party leader.
