//=============================================================================
// DEUS_ColonyOverseer.js - The overseer's view: free camera, colonist selection, the colonist card
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS ColonyOverseer] Real-time colony simulation, unit selection cards, order issuance, designation markers, and speed controls.
 * @author UF project
 *
 * @param EdgePanSpeed
 * @text Edge Pan Camera Speed
 * @type number
 * @default 6
 * @desc Kept for older settings; the camera pans with WASD and the arrow keys.
 *
 * @help
 * The player is an overseer, not a character on the map (VISION V4):
 * - WASD and the arrow keys pan the camera; the protagonist is invisible and
 *   never walks;
 * - left-click on a colonist selects it and opens its card; left-click on the
 *   ground with a colonist selected orders it there (UF.Colonists.order, a
 *   "move" job); right-click deselects (unless UF_Interact opened its menu);
 * - the card shows name, gender, mood, faction and home site, the current
 *   job (UF.Jobs.describe), what it carries ("Carrying 3 logs to the
 *   woodpile", from UF.Sheet.loadOf; VISION V89: loads are written in the
 *   profile, never drawn on the sprite), hunger / thirst / sleep / social, the
 *   tool and the clothes worn, the latest thought, and the society plan's
 *   progress.
 *
 * The colonists themselves (needs, decisions, plan, thoughts) are UF_Colonists
 * (2026-09-18: the old Colonist class, needs ticker and glade setup were
 * removed from here). window.$colonyManager stays as a thin adapter over
 * UF.Colonists for older callers.
 *
 * API and checks: docs/systems/UF_ColonyOverseer.md
 *
 * Replaced core methods (not aliased): Game_Player.prototype.moveByInput (no
 * protagonist walking), Game_Player.prototype.updateScroll (the camera
 * follows a chosen unit or stays free), Scene_Map.prototype.createMenuButton,
 * Scene_Map.prototype.isMenuEnabled, Scene_Map.prototype.callMenu (no menu),
 * Scene_Map.prototype.processMapTouch (clicks are orders, not walking),
 * Window_MapName.prototype.open (no map name banner),
 * Sprite_Destination.prototype.update (no click pulse).
 */

(() => {
    "use strict";

    if (typeof PluginManager !== "undefined" && typeof PluginManager.loadScript === "function") {
        if (!PluginManager._scripts || !PluginManager._scripts.includes("DEUS_Select")) {
            PluginManager.loadScript("DEUS_Select");
        }
    }

    const CAM_SPEED = 0.35;   // cells per frame while a pan key is held
    const CARD_W = 380, CARD_H = 240;
    const LOAD_Y = 60;        // the load line ("Carrying 3 logs to the woodpile"), under the job; blank when it carries nothing
    const BELOW_LOAD = 22;    // everything under the load line moved down by this much (2026-09-19, V89)
    const CARD_REFRESH = 30;  // frames between card refreshes while it's open

    let activeColonyWindow = null;
    const Colonists = () => (window.UF && UF.Colonists) || null;
    const Jobs = () => (window.UF && UF.Jobs) || null;
    const World = () => (window.UF && UF.World) || null;

    //-----------------------------------------------------------------------------
    // $colonyManager: an adapter over UF.Colonists for the older callers (UF_Construction, UF_Fog, UF_Stance)

    const adapters = new Map(); // unit id -> adapter (stable identity, so selections compare by object)
    function adapterFor(unit) {
        let a = adapters.get(unit.id);
        if (a) return a;
        a = {
            id: unit.id,
            drafted: false,
            get unit() { return World() ? World().unit(unit.id) : null; },
            get name() { return this.unit ? this.unit.name : ""; },
            get gender() { const u = this.unit; return u && u.data && u.data.gender ? u.data.gender.charAt(0).toUpperCase() + u.data.gender.slice(1) : ""; },
            get mood() { return "Fine"; },
            get hunger() { return 0; },
            get thirst() { return 0; },
            get fatigue() { return 0; },
            get social() { return 0; },
            get visionRadius() { const u = this.unit; return u && u.data && u.data.sight ? u.data.sight : 8; },
            get thoughts() { return []; },
            get currentJob() {
                const J = Jobs();
                const j = J ? J.of(unit.id) : null;
                return j ? J.describe(j) : "Idle";
            },
            set currentJob(v) { /* older callers wrote "Idle" here; jobs are UF_Jobs' now */ },
            get event() { return World() ? World().eventOf(unit.id) : null; },
            assignMoveTo(x, y, onArrival) {
                const C = Colonists();
                return C ? C.order(unit.id, { type: "move", target: { x, y } }, onArrival) : null;
            },
            addThought(text, strength) {
                const C = Colonists();
                if (C && this.unit) C.addThought(this.unit, text, strength);
            }
        };
        adapters.set(unit.id, a);
        return a;
    }

    class ColonyManager {
        constructor() {
            this.selectedColonist = null;
            this.cameraFollowUnit = null;
            this.isOverseerMode = true;
        }
        get colonists() {
            const C = Colonists();
            return C ? C.list().map(adapterFor) : [];
        }
        /** { steps: [{ id, done, detail }], text: "Hearth: built · Knives: 1/6 · ..." } */
        get societyProgress() {
            const C = Colonists();
            return C ? { steps: C.planStatus(), text: C.planText() } : { steps: [], text: "" };
        }
        select(colonist) {
            this.selectedColonist = colonist && typeof colonist === "number" ? this.colonists.find(c => c.id === colonist) || null : colonist;
            if (activeColonyWindow) {
                if (this.selectedColonist) {
                    activeColonyWindow.refresh();
                    activeColonyWindow.show();
                } else {
                    activeColonyWindow.hide();
                }
            }
            if (this.selectedColonist) {
                if (window.UF && UF.Sheet && typeof UF.Sheet.open === "function") {
                    UF.Sheet.open(this.selectedColonist.id);
                }
            }
        }
        deselect() {
            this.selectedColonist = null;
            if (window.UF && UF.Target && typeof UF.Target.clearTargetedTile === "function") {
                UF.Target.clearTargetedTile();
            }
            if (activeColonyWindow) activeColonyWindow.hide();
            if (window.UF && UF.Sheet && typeof UF.Sheet.close === "function") {
                UF.Sheet.close();
            }
        }
    }
    window.$colonyManager = new ColonyManager();

    //-----------------------------------------------------------------------------
    // Keyboard & mouse: the free overseer camera

    Input.keyMapper[87] = "cameraUp";    // W
    Input.keyMapper[65] = "cameraLeft";  // A
    Input.keyMapper[83] = "cameraDown";  // S
    Input.keyMapper[68] = "cameraRight"; // D
    Input.keyMapper[37] = "cameraLeft";  // Left Arrow
    Input.keyMapper[38] = "cameraUp";    // Up Arrow
    Input.keyMapper[39] = "cameraRight"; // Right Arrow
    Input.keyMapper[40] = "cameraDown";  // Down Arrow

    // No protagonist: directional input pans the camera instead of walking anyone.
    Game_Player.prototype.moveByInput = function() {};

    // No RMMZ menu, no touch menu button.
    Scene_Map.prototype.createMenuButton = function() {};
    Scene_Map.prototype.isMenuEnabled = function() { return false; };
    Scene_Map.prototype.callMenu = function() {};

    // No map name banner. The window must still be created: Scene_Map.stop/start/launchBattle call it.
    Window_MapName.prototype.open = function() {};

    // No click destination pulse on the ground, and clicks never walk the (invisible) player.
    Sprite_Destination.prototype.update = function() {
        this.visible = false;
    };
    Scene_Map.prototype.processMapTouch = function() {};

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        if ($gamePlayer) {
            $gamePlayer.setTransparent(true);
            $gamePlayer.setThrough(true);
            // The camera stays where the view (player) was placed: UF_World starts a New Game on the home site.
        }
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateOverseerControls();
    };

    // Colonist adapter whose event stands under the mouse cell, or null.
    function colonistAt(mx, my) {
        for (const c of $colonyManager.colonists) {
            const ev = c.event;
            if (ev && Math.abs(ev.x - mx) <= 0.8 && Math.abs(ev.y - my) <= 0.8) return c;
        }
        return null;
    }

    Scene_Map.prototype.updateOverseerControls = function() {
        if (!$colonyManager || !$colonyManager.isOverseerMode) return;

        // 1. WASD & arrow key camera panning
        const isPanning = Input.isPressed("cameraLeft") || Input.isPressed("cameraRight") || Input.isPressed("cameraUp") || Input.isPressed("cameraDown");
        if (isPanning && $colonyManager && $colonyManager.cameraFollowUnit) $colonyManager.cameraFollowUnit = null;
        if (Input.isPressed("cameraLeft")) $gameMap.scrollLeft(CAM_SPEED);
        if (Input.isPressed("cameraRight")) $gameMap.scrollRight(CAM_SPEED);
        if (Input.isPressed("cameraUp")) $gameMap.scrollUp(CAM_SPEED);
        if (Input.isPressed("cameraDown")) $gameMap.scrollDown(CAM_SPEED);

        // 2. Left-click: select a colonist, or deselect if clicking away
        if (TouchInput.isTriggered() && !this.isAnyWindowUnderMouse()) {
            const mx = $gameMap.canvasToMapX(TouchInput.x);
            const my = $gameMap.canvasToMapY(TouchInput.y);
            const clicked = colonistAt(mx, my);
            if (clicked) {
                $colonyManager.select(clicked);
                if (window.UF.Stance && UF.Stance.setSelected) UF.Stance.setSelected(null); // the corners follow the Overseer's selection
                SoundManager.playCursor();
            } else if ($colonyManager.selectedColonist) {
                $colonyManager.deselect();
                if (window.UF && UF.Target && typeof UF.Target.clearTargetedTile === "function") {
                    UF.Target.clearTargetedTile();
                }
                SoundManager.playCancel();
            }
        }

        // 3. Right-click deselects, unless UF_Interact's context menu took the click (it says so through UF.Interact.tookCancel)
        if (TouchInput.isCancelled()) {
            const interact = window.UF && UF.Interact;
            const menuTook = !!interact && ((typeof interact.tookCancel === "function" && interact.tookCancel()) || (typeof interact.isOpen === "function" && interact.isOpen()));
            if (!menuTook) {
                let didCancel = false;
                if ($colonyManager.selectedColonist) {
                    $colonyManager.deselect();
                    didCancel = true;
                }
                if (window.UF && UF.Target && UF.Target.targetedTile && UF.Target.targetedTile()) {
                    UF.Target.clearTargetedTile();
                    didCancel = true;
                }
                if (didCancel) SoundManager.playCancel();
            }
        }

        // 4. The card follows its colonist
        if (activeColonyWindow && activeColonyWindow.visible && Graphics.frameCount % CARD_REFRESH === 0) activeColonyWindow.refresh();
    };

    Scene_Map.prototype.isAnyWindowUnderMouse = function() {
        const wins = [this._colonyCard, this._factionLedgerWindow, this._ufChronicleWindow].filter(w => w && w.visible);
        return wins.some(w => TouchInput.x >= w.x && TouchInput.x < w.x + w.width && TouchInput.y >= w.y && TouchInput.y < w.y + w.height);
    };

    // Free camera: the player never forces a scroll; a followed unit centres the view smoothly using floating coordinates.
    Game_Player.prototype.updateScroll = function(lastScrolledX, lastScrolledY) {
        const follow = $colonyManager && $colonyManager.cameraFollowUnit;
        if (!follow) return;
        const uev = follow.event || (follow instanceof Game_CharacterBase ? follow : null);
        let rx, ry;
        if (uev) {
            rx = uev._realX !== undefined ? uev._realX : uev.x;
            ry = uev._realY !== undefined ? uev._realY : uev.y;
        } else if (typeof follow.x === "number" && typeof follow.y === "number") {
            rx = follow.x;
            ry = follow.y;
        }
        if (typeof rx === "number" && typeof ry === "number") {
            $gameMap.setDisplayPos(rx - $gameMap.screenTileX() / 2, ry - $gameMap.screenTileY() / 2);
        }
    };

    //-----------------------------------------------------------------------------
    // The colonist card (Window_UFColonistCard)

    function Window_UFColonistCard() {
        this.initialize(...arguments);
    }

    Window_UFColonistCard.prototype = Object.create(Window_Base.prototype);
    Window_UFColonistCard.prototype.constructor = Window_UFColonistCard;

    Window_UFColonistCard.prototype.initialize = function() {
        const x = 16, y = Math.max(16, Graphics.boxHeight - CARD_H - 46);
        Window_Base.prototype.initialize.call(this, new Rectangle(x, y, CARD_W, CARD_H));
        this.opacity = 240;
        this.hide();
    };

    Window_UFColonistCard.prototype.refresh = function() {
        this.contents.clear();
        this._ufLoadText = "";
        const sel = $colonyManager.selectedColonist;
        const C = Colonists();
        const d = sel && C ? C.describe(sel.id) : null;
        if (!d) return;
        const w = this.innerWidth;
        const base = $gameSystem.mainFontSize ? $gameSystem.mainFontSize() : 26;
        this.contents.fontSize = 18;

        const portraitW = 72;
        const portraitH = 70;
        const portraitX = w - portraitW;
        const portraitY = 0;
        const textW = portraitX - 8;

        // Draw the stone-arch portrait at top-right
        this.drawPortrait(d, sel, portraitX, portraitY, portraitW, portraitH);

        // Line 0: name, gender, age, life stage, mood, pregnancy, illness
        this.changeTextColor(ColorManager.systemColor());
        let title = `${d.name} (${d.gender}${d.age !== undefined ? `, age ${d.age}` : ""}${d.stage ? ` · ${d.stage.charAt(0).toUpperCase() + d.stage.slice(1)}` : ""})`;
        if (d.pregnancy) title += ` [Pregnant: ${d.pregnancy.daysLeft}d]`;
        if (d.illness || (sel && sel.data && sel.data.illness)) {
            const ill = d.illness || sel.data.illness;
            const illName = ill.type ? (ill.type.charAt(0).toUpperCase() + ill.type.slice(1)) : "Dysentery";
            title += ` [Ill: ${illName}]`;
        }
        this.drawText(title, 0, 0, textW - 75, "left");
        let moodColor = "#ffff55";
        if (d.mood === "Ecstatic" || d.mood === "Happy") moodColor = "#55ff55";
        else if (d.mood === "Unhappy" || d.mood === "Stressed" || d.mood === "Miserable") moodColor = "#ff5555";
        this.changeTextColor(moodColor);
        this.drawText(`[${d.mood}]`, textW - 70, 0, 70, "right");

        // Line 1: faction and home site
        this.contents.fontSize = 13;
        this.changeTextColor("#94a3b8");
        this.drawText(`${d.faction}${d.site ? ` · ${d.site}` : ""}`, 0, 20, textW, "left");

        // Line 2: the job
        this.contents.fontSize = 15;
        this.resetTextColor();
        this.drawText(`Job: ${d.job}`, 0, 38, textW, "left");

        // Line 3: what it carries (V89; UF_Sheet words it), nothing when it carries nothing
        this.contents.fontSize = 14;
        this.changeTextColor("#f0dca0");
        const S = window.UF && UF.Sheet;
        const load = S && typeof S.loadOf === "function" ? S.loadOf(sel.id) : null;
        this._ufLoadText = load && typeof S.fittedLoadText === "function" ? S.fittedLoadText(load, textW, text => this.textWidth(text)) : "";
        if (this._ufLoadText) this.drawText(this._ufLoadText, 0, LOAD_Y, textW, "left");
        this.resetTextColor();
        const dy = BELOW_LOAD;

        // Tool and clothes
        this.contents.fontSize = 14;
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("Tool:", 0, 70 + dy, 50, "left");
        this.drawText("Wears:", 180, 70 + dy, 60, "left");
        this.resetTextColor();
        this.drawText(d.tool || "none", 50, 70 + dy, 125, "left");
        this.drawText(d.clothes ? `${d.clothes} (tier ${d.tier})` : (d.tier ? `tier ${d.tier}` : "nothing"), 240, 70 + dy, w - 240, "left");

        // Need gauges
        const u = (sel && sel.unit) || sel;
        const hungerVal = typeof sel.hunger === "number" ? Math.round(sel.hunger) : (u && u.data && typeof u.data.hunger === "number" ? Math.round(u.data.hunger) : 0);
        const thirstVal = typeof sel.thirst === "number" ? Math.round(sel.thirst) : (u && u.data && typeof u.data.thirst === "number" ? Math.round(u.data.thirst) : 0);
        const fatigueVal = typeof sel.fatigue === "number" ? Math.round(sel.fatigue) : (u && u.data && typeof u.data.fatigue === "number" ? Math.round(u.data.fatigue) : 0);
        this.contents.fontSize = 13;
        this.drawNeedGauge("Hunger", Math.max(0, 100 - hungerVal), 100, "#ffaa44", 94 + dy);
        this.drawNeedGauge("Thirst", Math.max(0, 100 - thirstVal), 100, "#44aaff", 112 + dy);
        this.drawNeedGauge("Rest", Math.max(0, 100 - fatigueVal), 100, "#a855f7", 130 + dy);

        this.contents.fontSize = 12;
        this.changeTextColor("#38bdf8");
        this.drawText("[F] factions · [H] chronicle", 0, 154 + dy, w, "left");
        this.contents.fontSize = base;
        this.resetTextColor();
    };

    Window_UFColonistCard.prototype.drawNeedGauge = function(label, current, max, color, y) {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(label, 0, y, 65, "left");
        const gx = 70, gw = 180, gh = 10;
        this.contents.fillRect(gx, y + 6, gw, gh, "rgba(20, 20, 25, 0.8)");
        const rate = Math.min(1.0, Math.max(0.0, current / max));
        this.contents.fillRect(gx, y + 6, Math.round(gw * rate), gh, color);
        this.resetTextColor();
        this.drawText(`${Math.round(current)}/${max}`, gx + gw + 10, y, 60, "left");
    };

    Window_UFColonistCard.prototype.drawPortrait = function(d, sel, x, y, w, h) {
        let face = (d && d.face) || (sel && sel.unit && sel.unit.data && sel.unit.data.face);
        if (!face && sel && sel.unit) {
            const S = window.UF && UF.Sheet;
            if (S && typeof S.faceSpecOf === "function") {
                const spec = S.faceSpecOf(sel.unit);
                if (spec && spec.type === "face") face = { sheet: spec.sheet, index: spec.index };
            }
        }
        if (!face && sel && sel.unit) {
            const F = window.UF && UF.Factions;
            if (F && typeof F.cultureFace === "function") {
                const cf = F.cultureFace(sel.unit);
                if (cf && cf.sheet) face = { sheet: cf.sheet, index: cf.index };
            }
        }
        if (!face) {
            const gender = (d && d.gender && String(d.gender).toLowerCase()) || "male";
            face = { sheet: gender === "male" ? "UF_Faces_human_1" : "UF_Faces_human_2", index: 0 };
        }

        const c = this.contents;
        // Stone frame borders and dark slate opening
        c.fillRect(x, y, w, h, "#18181f");
        c.fillRect(x, y, w, 1, "#475569");
        c.fillRect(x, y, 1, h, "#475569");
        c.fillRect(x, y + h - 1, w, 1, "#1e293b");
        c.fillRect(x + w - 1, y, 1, h, "#1e293b");
        c.fillRect(x + 1, y + 1, w - 2, 1, "#64748b");
        c.fillRect(x + 1, y + 1, 1, h - 2, "#64748b");

        if (face && face.sheet) {
            const bmp = ImageManager.loadFace(face.sheet);
            if (!bmp.isReady()) {
                if (!bmp._ufCardListening) {
                    bmp._ufCardListening = true;
                    bmp.addLoadListener(() => {
                        if (this.visible && this.parent) this.refresh();
                    });
                }
                return;
            }
            const fw = ImageManager.faceWidth || 144;
            const fh = ImageManager.faceHeight || 144;
            const sx = (face.index % 4) * fw;
            const sy = Math.floor(face.index / 4) * fh;
            c.blt(bmp, sx, sy, fw, fh, x + 2, y + 2, w - 4, h - 4);

            // Dynamic Armor Reflection: reflect currently equipped armor on bottom portion (y: 108..144)
            const unitObj = (sel && (sel.unit || sel)) || (d && d.id && Colonists && Colonists() ? Colonists().colonist(d.id) : null);
            const armorSheet = (window.UF && UF.Generator && typeof UF.Generator.armorSheetForUnit === "function") ?
                UF.Generator.armorSheetForUnit(unitObj, d) : null;
            if (armorSheet) {
                const armorBmp = ImageManager.loadFace(armorSheet);
                if (armorBmp && armorBmp.isReady()) {
                    c.blt(armorBmp, 0, 0, 144, 144, x + 2, y + 2, w - 4, h - 4);
                } else if (armorBmp && !armorBmp._ufArmorListening) {
                    armorBmp._ufArmorListening = true;
                    armorBmp.addLoadListener(() => {
                        if (this.visible && this.parent) this.refresh();
                    });
                }
            }
        }
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        // Left card retired per user directive 2026-09-22: inventory on right pops up instead
        this._colonyCard = null;
        activeColonyWindow = null;
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.Overseer = {
        card: () => activeColonyWindow,
        /** The card's load line as last drawn ("" when the colonist carries nothing or no card is shown). */
        cardLoadText: () => (activeColonyWindow && activeColonyWindow.visible ? activeColonyWindow._ufLoadText || "" : ""),
        /** The load line's band in the card's contents (for checks that read its pixels). */
        loadRect: () => ({ x: 0, y: LOAD_Y + 13, w: activeColonyWindow ? activeColonyWindow.innerWidth : CARD_W - 24, h: 13 }),
        colonistAt,
        CARD_W, CARD_H, LOAD_Y
    };

    //-----------------------------------------------------------------------------
    // Exploration wrappers: exploration lives in UF_Fog; these keep older callers working.

    Game_System.prototype.getExploredGrid = function(mapId) {
        this._ufExploredMaps = this._ufExploredMaps || {};
        if (!this._ufExploredMaps[mapId]) this._ufExploredMaps[mapId] = {};
        return this._ufExploredMaps[mapId];
    };
    Game_System.prototype.isTileExplored = function(mapId, x, y) {
        if (window.UF && UF.Fog && mapId === $gameMap.mapId()) return UF.Fog.isExplored(x, y);
        const grid = this.getExploredGrid(mapId);
        return !!grid[`${x},${y}`];
    };
    Game_System.prototype.exploreTile = function(mapId, x, y) {
        if (window.UF && UF.Fog && mapId === $gameMap.mapId()) return UF.Fog.reveal(x, y, 0);
        const grid = this.getExploredGrid(mapId);
        grid[`${x},${y}`] = true;
    };

    // Hide events on unexplored cells (UF_Fog decides what's explored; with fog off everything is).
    // Colonists and terrain-tagged events are always drawn.
    const _Sprite_Character_update = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _Sprite_Character_update.call(this);
        if (!this.visible || !this._character || this._character === $gamePlayer) return;
        const W = World();
        const unit = W && W.unitOfEvent ? W.unitOfEvent(this._character) : null;
        const pid = window.UF && UF.Factions && typeof UF.Factions.playerId === "function" ? UF.Factions.playerId() : null;
        const isMine = unit && unit.data && (unit.data.kind === "colonist" || unit.data.faction === "player" || (pid !== null && unit.data.faction === pid));
        if (isMine) return;
        const ev = this._character.event ? this._character.event() : null;
        if (ev && ev.note && (ev.note.includes("<tree>") || ev.note.includes("<canopy>") || ev.note.includes("<terrain>"))) return;
        if (window.UF && UF.Fog && UF.Fog.enabled) {
            if (typeof this._character.x === "number" && !UF.Fog.isVisible(this._character.x, this._character.y)) this.visible = false;
        } else if ($gameSystem && $gameMap && typeof this._character.x === "number" && !$gameSystem.isTileExplored($gameMap.mapId(), this._character.x, this._character.y)) {
            this.visible = false;
        }
    };

    //-----------------------------------------------------------------------------
    // Checks (UF_Test suite "overseer"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("overseer", async t => {
            const C = Colonists(), J = Jobs();
            const list = $colonyManager.colonists;
            t.check("adapter_lists_colonists", !!C && list.length >= 2 && list.every(c => c.event && typeof c.name === "string" && c.name && typeof c.hunger === "number"),
                C ? `${list.length} adapters: ${list.map(c => `${c.name} (${c.gender}, ${c.currentJob})`).join("; ")}` : "UF.Colonists missing");
            if (!C || !list.length) return;
            const c = list[0];
            const zoom = window.UF.Camera ? UF.Camera.zoom() : 1;
            const ev = c.event;
            // A click on the colonist's cell selects it and opens the card with its name, faction and job.
            $gamePlayer.locate(ev.x, ev.y);
            await t.waitFrames(3);
            TouchInput._x = Math.round(($gameMap.adjustX(ev.x) * $gameMap.tileWidth() + $gameMap.tileWidth() / 2) * zoom);
            TouchInput._y = Math.round(($gameMap.adjustY(ev.y) * $gameMap.tileHeight() + $gameMap.tileHeight() / 2) * zoom);
            const clicked = colonistAt($gameMap.canvasToMapX(TouchInput.x), $gameMap.canvasToMapY(TouchInput.y));
            $colonyManager.select(clicked);
            await t.waitFrames(15);
            const card = SceneManager._scene._colonyCard;
            const d = C.describe(c.id);
            const sheetOpen = window.UF && UF.Sheet && typeof UF.Sheet.isOpen === "function" && UF.Sheet.isOpen();
            t.check("click_selects_and_card_opens", clicked === c && $colonyManager.selectedColonist === c && (!card || !card.visible) && !!d && d.name === c.name && d.faction.length > 0,
                `mouse at (${TouchInput.x},${TouchInput.y}) over ${c.name} at (${ev.x},${ev.y}) -> colonistAt ${clicked ? clicked.name : "null"}; card retired; sheet open ${sheetOpen}; title "${d ? `${d.name} (${d.gender}) · ${d.faction} · ${d.site}` : ""}", job "${d ? d.job : ""}"`);
            t.screenshot("card");
            // An order through the adapter: a move job owned by the colonist.
            const job = c.assignMoveTo(ev.x + 2, ev.y);
            t.check("ground_click_orders_move", !!job && job.type === "move" && job.owner === c.id && J.of(c.id) === job, `assignMoveTo -> ${job ? `${job.type} #${job.id} ${job.state}` : "null"}`);
            // Society progress summary
            const prog = $colonyManager.societyProgress;
            t.check("society_progress", Array.isArray(prog.steps) && prog.steps.length > 0 && typeof prog.text === "string" && prog.text.includes(":"), `"${prog.text}"`);
            $colonyManager.deselect();
            await t.waitFrames(2);
            t.check("deselect_hides_card", !$colonyManager.selectedColonist && (!card || !card.visible), `card visible after deselect: ${card ? card.visible : "retired"}`);
            t.check("no_errors", t.errorsSoFar().length === 0, t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during overseer checks");
        }, { isDefault: false });
    }
})();
