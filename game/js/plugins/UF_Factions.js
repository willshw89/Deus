//=============================================================================
// RPG Maker MZ - Ultima Fortress Procedural Factions & Dynamic Alignments (UF_Factions)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Factions] Procedurally generated world factions with dynamic alignments, territories, and diplomacy.
 * @author UF Project
 *
 * @help
 * ============================================================================
 * Ultima Fortress Procedural World Factions (UF_Factions)
 * ============================================================================
 * Generates living, emergent factions scattered across the 256x256 world:
 * - Distinct faction territories, leaders, ethos, and banners
 * - Dynamic mutual alignment scores (-100 to +100)
 * - Inter-faction rivalries and alliances
 * - Wandering scouts and border encounters
 * - Faction Ledger overlay in Overseer HUD
 */

(() => {
    "use strict";

    //-----------------------------------------------------------------------------
    // Faction Definitions & Procedural Archetypes
    //-----------------------------------------------------------------------------
    const FACTION_DEFINITIONS = [
        {
            id: "genesis",
            name: "The Genesis Tribe",
            settlement: "Embark Glade",
            center: { x: 127, y: 128 },
            leader: "Adam & Eve",
            ethos: "Survival, Harmony, Society Building",
            isPlayer: true,
            color: "#4ade80", // Emerald Green
            dispositionToPlayer: 100
        },
        {
            id: "sylvan",
            name: "Sylvan Wood-Walkers",
            settlement: "Deepwood Sanctuary",
            center: { x: 60, y: 60 },
            leader: "Shaman Lyra",
            ethos: "Nature Guardians, Solitary, Reclusive",
            isPlayer: false,
            color: "#22c55e", // Forest Green
            dispositionToPlayer: 25, // Friendly-leaning
            dispositions: {
                crag: -30,       // Resent crag miners cutting forest trees
                riverfolk: 15,   // Peaceful trade
                marauders: -80   // Detest destructive raiders
            }
        },
        {
            id: "crag",
            name: "High Crag Miners",
            settlement: "Granite Hold",
            center: { x: 190, y: 50 },
            leader: "Thane Torvald",
            ethos: "Stonecrafters, Metallurgists, Pragmatists",
            isPlayer: false,
            color: "#94a3b8", // Slate Gray
            dispositionToPlayer: 10, // Neutral pragmatic
            dispositions: {
                sylvan: -30,     // Dislike elven restrictions on timber
                riverfolk: 35,   // Trade iron for river fish & salt
                marauders: -50   // Repel raider attacks
            }
        },
        {
            id: "riverfolk",
            name: "Riverfolk Fisher Clan",
            settlement: "Reedbank Haven",
            center: { x: 145, y: 195 },
            leader: "Elder Maeve",
            ethos: "Waterway Navigation, Fishing, Open Trade",
            isPlayer: false,
            color: "#38bdf8", // Sky Blue
            dispositionToPlayer: 45, // Warm & welcoming
            dispositions: {
                sylvan: 15,
                crag: 35,
                marauders: -75   // Victims of river piracy
            }
        },
        {
            id: "marauders",
            name: "Wilderness Marauders",
            settlement: "Bloodrock Encampment",
            center: { x: 50, y: 190 },
            leader: "Warlord Gorgar",
            ethos: "Predatory, Scavengers, Blood Feud",
            isPlayer: false,
            color: "#f87171", // Blood Red
            dispositionToPlayer: -65, // Hostile
            dispositions: {
                sylvan: -80,
                crag: -50,
                riverfolk: -75
            }
        }
    ];

    class FactionManager {
        constructor() {
            this.factions = {};
            this.activeLedgerWindow = null;
            this.initFactions();
        }

        initFactions() {
            for (const def of FACTION_DEFINITIONS) {
                this.factions[def.id] = {
                    ...def,
                    standing: def.dispositionToPlayer,
                    discovered: def.isPlayer, // Player knows self initially
                    eventsLogged: []
                };
            }
            console.log("[UF Factions] Initialized 5 procedural world factions.");
        }

        getFaction(id) {
            return this.factions[id];
        }

        getAllFactions() {
            return Object.values(this.factions);
        }

        getAlignmentTier(standing) {
            if (standing >= 60) return { label: "Allied", color: "#22c55e" };
            if (standing >= 20) return { label: "Friendly", color: "#60a5fa" };
            if (standing >= -15) return { label: "Neutral", color: "#e2e8f0" };
            if (standing >= -50) return { label: "Suspicious", color: "#f59e0b" };
            return { label: "Hostile", color: "#ef4444" };
        }

        modifyStanding(factionId, delta, reason) {
            const f = this.factions[factionId];
            if (!f || f.isPlayer) return;

            f.standing = Math.max(-100, Math.min(100, f.standing + delta));
            f.discovered = true;
            f.eventsLogged.push({
                time: (window.$ufTime ? window.$ufTime.timeString : "") + ` (${delta > 0 ? '+' : ''}${delta}): ${reason}`
            });

            console.log(`[UF Factions] ${f.name} standing changed by ${delta} (${f.standing}): ${reason}`);

            if (this.activeLedgerWindow && this.activeLedgerWindow.visible) {
                this.activeLedgerWindow.refresh();
            }
        }

        discoverFaction(factionId) {
            const f = this.factions[factionId];
            if (f && !f.discovered) {
                f.discovered = true;
                if (window.$ufVisuals && window.$ufVisuals.addBark && $gamePlayer) {
                    window.$ufVisuals.addBark($gamePlayer, `Discovered: ${f.name}!`);
                }
            }
        }

        toggleLedger() {
            if (!this.activeLedgerWindow) {
                if (SceneManager._scene && SceneManager._scene._factionLedgerWindow) {
                    this.activeLedgerWindow = SceneManager._scene._factionLedgerWindow;
                }
            }
            if (this.activeLedgerWindow) {
                if (this.activeLedgerWindow.visible) {
                    this.activeLedgerWindow.hide();
                } else {
                    this.activeLedgerWindow.refresh();
                    this.activeLedgerWindow.show();
                }
            }
        }
    }

    window.$factionManager = new FactionManager();

    //-----------------------------------------------------------------------------
    // Faction Ledger UI Window
    //-----------------------------------------------------------------------------
    class Window_FactionLedger extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 240;
            this.hide();
        }

        refresh() {
            this.contents.clear();
            const w = this.innerWidth;
            let y = 10;

            // Title Header
            this.changeTextColor("#f59e0b");
            this.contents.fontSize = 20;
            this.drawText("WORLD FACTIONS & DIPLOMACY LEDGER", 0, y, w, "center");
            y += 32;

            this.contents.fontSize = 14;
            this.changeTextColor("#94a3b8");
            this.drawText("Alignments evolve based on encounters, resource harvesting, and proximity.", 0, y, w, "center");
            y += 26;

            // Factions List
            const factions = window.$factionManager.getAllFactions();
            for (const f of factions) {
                const tier = window.$factionManager.getAlignmentTier(f.standing);

                // Background box
                this.contents.fillRect(10, y, w - 20, 52, "rgba(20, 25, 35, 0.75)");

                // Faction Name & Settlement
                this.changeTextColor(f.color);
                this.contents.fontSize = 16;
                this.drawText(f.name, 20, y + 6, 260, "left");

                this.contents.fontSize = 12;
                this.changeTextColor("#94a3b8");
                this.drawText(`Settlement: ${f.settlement} (${f.center.x}, ${f.center.y})`, 20, y + 28, 260, "left");

                // Leader & Ethos
                this.changeTextColor("#cbd5e1");
                this.drawText(`Leader: ${f.leader}`, 290, y + 6, 260, "left");
                this.changeTextColor("#94a3b8");
                this.drawText(`Ethos: ${f.ethos}`, 290, y + 28, 260, "left");

                // Alignment Standing Badge
                this.changeTextColor(tier.color);
                this.contents.fontSize = 16;
                const standingText = f.isPlayer ? "COLONY" : `${tier.label} (${f.standing > 0 ? '+' : ''}${f.standing})`;
                this.drawText(standingText, w - 180, y + 14, 160, "right");

                y += 58;
            }

            // Footer tip
            this.contents.fontSize = 13;
            this.changeTextColor("#64748b");
            this.drawText("Press [F] or click the Faction button to close.", 0, y + 8, w, "center");
        }
    }

    //-----------------------------------------------------------------------------
    // Integrate Faction Ledger into Scene_Map
    //-----------------------------------------------------------------------------
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this.createFactionLedgerWindow();
    };

    Scene_Map.prototype.createFactionLedgerWindow = function() {
        const ww = 740;
        const wh = 420;
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        const rect = new Rectangle(wx, wy, ww, wh);
        this._factionLedgerWindow = new Window_FactionLedger(rect);
        this.addChild(this._factionLedgerWindow);
        window.$factionManager.activeLedgerWindow = this._factionLedgerWindow;
    };

    // Hotkey [F] (key code 70) to toggle Faction Ledger
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (Input.isTriggered("factionKey")) {
            window.$factionManager.toggleLedger();
        }
    };

    Input.keyMapper[70] = "factionKey"; // 'F'

    console.log("[UF] UF_Factions initialized with dynamic alignment matrix and Faction Ledger.");
})();
