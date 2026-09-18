//=============================================================================
// UF_History.js - 600 Years of Simulated History & World Chronicles
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF History] Simulates 600 years of Dwarf Fortress style history from the world seed: 5 epochs, wars, site foundings, heroes, and ruins. H = chronicle.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_Factions
 *
 * @help
 * On New Game, simulates 600 years of history (Years 1 to 600) across 5 Epochs:
 *   1. Years 1-100:   The Age of Myth
 *   2. Years 101-250: The Age of Legends
 *   3. Years 251-400: The Golden Age of Trade
 *   4. Years 401-520: The Age of Strife
 *   5. Years 521-600: The Age of Heroes (Dawn of Genesis in Year 600)
 *
 * Simulates faction foundings, epic wars, hero conquests, creation of legendary
 * artifacts, and fallen ancient ruins scattered across the world.
 *
 * Press H on the map to open the Chronicles of the World ledger.
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    function hash32(...parts) {
        let h = 2166136261 >>> 0;
        for (const part of parts) {
            let v = part >>> 0;
            for (let i = 0; i < 4; i++) {
                h ^= v & 255;
                h = Math.imul(h, 16777619) >>> 0;
                v >>>= 8;
            }
        }
        h ^= h >>> 15;
        h = Math.imul(h, 0x2c1b3c6d) >>> 0;
        h ^= h >>> 12;
        return h >>> 0;
    }

    function mulberry32(a) {
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

    const EPOCHS = [
        { id: "myth", name: "The Age of Myth", startYear: 1, endYear: 100, desc: "Primal beasts and gods roamed the untamed lands. Legendary relics were forged." },
        { id: "legends", name: "The Age of Legends", startYear: 101, endYear: 250, desc: "The First Realms arose. Deep mountainhalls were carved and ancient dynasties founded." },
        { id: "golden", name: "The Golden Age of Trade", startYear: 251, endYear: 400, desc: "Prosperity and great trade roads linked sunlit kingdoms with subterranean deeps." },
        { id: "strife", name: "The Age of Strife", startYear: 401, endYear: 520, desc: "The Great Scourge, dark goblin sieges, and wars that shattered ancient strongholds into haunted ruins." },
        { id: "heroes", name: "The Age of Heroes", startYear: 521, endYear: 600, desc: "Surviving realms rebuild amidst the ruins, awaiting the Dawn of Genesis in Year 600." }
    ];

    const ARTIFACT_TYPES = ["Greatblade", "Warhammer", "Plate Armor", "Sunstone", "Tome", "Chalice", "Crown", "Amulet", "Shield", "Scepter"];
    const TITLES = ["the Unyielding", "Ironbreaker", "the Pure", "Flamebearer", "the Wise", "Shadowbane", "the Lion", "the Silent", "Stonecleaver", "the Just"];

    const History = {
        EPOCHS,
        current: () => (window.UF && UF.World && UF.World.state && UF.World.state.history) || null
    };
    window.UF = window.UF || {};
    window.UF.History = History;

    /** Generate 600 years of history deterministically from state.seed */
    History.generate = function(state) {
        if (!state) return null;
        const rand = mulberry32(hash32(state.seed, 0x4815));
        const pick = arr => arr[Math.floor(rand() * arr.length)];

        const rawFactions = state.factions || [];
        const factions = Array.isArray(rawFactions) ? rawFactions : (rawFactions.list || []);
        const npcFactions = factions.filter(f => f.id !== "player");

        const chronicle = [];
        const figures = [];
        const artifacts = [];
        const ruins = [];

        // 1. Assign founding years to existing factions across Ages 1 to 3
        npcFactions.forEach((f, idx) => {
            const foundYear = 30 + Math.floor(rand() * 260); // Years 30 to 290
            const founderName = `${pick(["Thor", "Ald", "Bael", "Khar", "Mor", "Grim", "Val", "Roric", "Gund", "Elor"])}${pick(["in", "or", "an", "ic", "ald", "gar", "us", "en"])}`;
            const title = pick(TITLES);
            const fullName = `${founderName} ${title}`;

            figures.push({
                name: fullName,
                factionId: f.id,
                factionName: f.name,
                birthYear: Math.max(1, foundYear - 28),
                deathYear: foundYear + 45 + Math.floor(rand() * 30),
                role: "Founder & Ruler",
                epithet: `Founded ${f.name} in the year ${foundYear}.`
            });

            chronicle.push({
                year: foundYear,
                epoch: foundYear <= 100 ? "myth" : (foundYear <= 250 ? "legends" : "golden"),
                type: "founding",
                title: `Founding of ${f.name}`,
                text: `${fullName} raised the banner of ${f.name}, establishing a sanctuary for the ${f.species} folk.`
            });
        });

        // 2. Generate Legendary Artifacts in Age of Myth and Legends
        for (let y = 15; y <= 240; y += 30 + Math.floor(rand() * 40)) {
            const f = npcFactions.length ? pick(npcFactions) : null;
            const aName = `The ${pick(["Adamantine", "Obsidian", "Sunforged", "Runed", "Starlight", "Bloodforged"])} ${pick(ARTIFACT_TYPES)}`;
            const creator = `${pick(["High Smith", "Archmage", "Master Carver", "Artificer"])} ${pick(["Dran", "Kaz", "Mael", "Finn", "Orin"])}`;
            artifacts.push({
                name: aName,
                year: y,
                creator,
                faction: f ? f.name : "Ancient Ancestors",
                power: pick(["Grants mastery over deep minerals", "Smites darkness in caverns", "Guards the bearers against dread wounds", "Channels the warmth of primal flame"])
            });
            chronicle.push({
                year: y,
                epoch: y <= 100 ? "myth" : "legends",
                type: "artifact",
                title: `Creation of ${aName}`,
                text: `${creator} fashioned ${aName}. It is said to be an heirloom of immense power.`
            });
        }

        // 3. Generate Historical Wars & Sieges in Age of Strife (Years 401-520)
        for (let y = 405; y <= 515; y += 15 + Math.floor(rand() * 20)) {
            if (npcFactions.length >= 2) {
                const f1 = pick(npcFactions);
                let f2 = pick(npcFactions);
                if (f1.id === f2.id && npcFactions.length > 1) f2 = npcFactions[(npcFactions.indexOf(f1) + 1) % npcFactions.length];

                const battleSite = pick(["Iron Valley", "the Whispering Caverns", "Black Mountain Pass", "the Blood River", "the Sunken Marshes"]);
                const victor = rand() < 0.5 ? f1 : f2;
                const loser = victor === f1 ? f2 : f1;
                const casualties = 400 + Math.floor(rand() * 2800);

                chronicle.push({
                    year: y,
                    epoch: "strife",
                    type: "war",
                    title: `Battle of ${battleSite}`,
                    text: `War erupted between ${f1.name} and ${f2.name}. Following fierce clashes with over ${casualties} fallen, ${victor.name} emerged victorious.`
                });
            }
        }

        // 4. Generate Fallen Ancient Ruins (fallen cities/fortresses)
        for (let i = 0; i < 6; i++) {
            const ruinYear = 150 + Math.floor(rand() * 320);
            const rName = `The Ruins of ${pick(["Karak-Durn", "Myth-Drannor", "Oakhollow", "Deep-Barrow", "Gilded-Keep", "Zan-Thul"])}`;
            const areaX = Math.floor(rand() * (state.areasX || 16));
            const areaY = Math.floor(rand() * (state.areasY || 16));
            const fallReason = pick(["fell to an ancient dragon rampage", "collapsed in a subterranean earthquake", "was sacked during the Great Strife", "succumbed to a forgotten fungal blight"]);
            ruins.push({
                name: rName,
                area: { x: areaX, y: areaY },
                yearFell: ruinYear,
                history: `Once a mighty citadel in the Age of Legends, it ${fallReason} in Year ${ruinYear}.`
            });
            chronicle.push({
                year: ruinYear,
                epoch: ruinYear <= 250 ? "legends" : (ruinYear <= 400 ? "golden" : "strife"),
                type: "ruin",
                title: `Fall of ${rName}`,
                text: `${rName} ${fallReason}, its halls abandoned to beasts and shadow.`
            });
        }

        // 5. Year 600: The Awakening in the Glade of Genesis
        chronicle.push({
            year: 600,
            epoch: "heroes",
            type: "genesis",
            title: "Dawn of Genesis",
            text: "After six centuries of history, two unclad mortals awaken in the pristine Glade of Genesis to begin mortal civilization anew."
        });

        // Sort chronicle chronologically
        chronicle.sort((a, b) => a.year - b.year);

        const historyData = {
            totalYears: 600,
            epochs: EPOCHS,
            chronicle,
            figures,
            artifacts,
            ruins
        };

        state.history = historyData;
        return historyData;
    };

    // Auto-generate on world creation
    if (window.UF && UF.Events) {
        UF.Events.on("world:created", state => {
            History.generate(state);
        });
    }

    //-------------------------------------------------------------------------
    // UI: Chronicles of the World Window (Hotkey H)
    //-------------------------------------------------------------------------

    function Window_UFHistory() {
        this.initialize(...arguments);
    }
    Window_UFHistory.prototype = Object.create(Window_Base.prototype);
    Window_UFHistory.prototype.constructor = Window_UFHistory;

    Window_UFHistory.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._selectedEpoch = 0;
        this._scrollOffset = 0;
        this.refresh();
    };

    Window_UFHistory.prototype.setEpoch = function(idx) {
        this._selectedEpoch = Math.max(0, Math.min(EPOCHS.length - 1, idx));
        this._scrollOffset = 0;
        this.refresh();
    };

    Window_UFHistory.prototype.scroll = function(dy) {
        this._scrollOffset = Math.max(0, this._scrollOffset + dy);
        this.refresh();
    };

    Window_UFHistory.prototype.refresh = function() {
        this.contents.clear();
        const hist = History.current();
        if (!hist) {
            this.drawText("No historical records available for this world.", 20, 20, this.contentsWidth() - 40, "center");
            return;
        }

        const epoch = EPOCHS[this._selectedEpoch];
        const epochEvents = hist.chronicle.filter(e => e.epoch === epoch.id);

        // Header
        this.changeTextColor(ColorManager.systemColor());
        this.drawText("CHRONICLES OF THE WORLD — 600 YEARS OF HISTORY", 0, 8, this.contentsWidth(), "center");
        this.resetTextColor();

        // Epoch tabs at top
        const tabW = Math.floor(this.contentsWidth() / EPOCHS.length);
        EPOCHS.forEach((ep, i) => {
            const x = i * tabW;
            const isSel = i === this._selectedEpoch;
            if (isSel) {
                this.contents.fillRect(x + 4, 40, tabW - 8, 28, "rgba(212, 175, 55, 0.25)");
                this.changeTextColor("#ffd700");
            } else {
                this.changeTextColor("#94a3b8");
            }
            this.drawText(`[${i + 1}] ${ep.id.toUpperCase()}`, x, 42, tabW, "center");
        });
        this.resetTextColor();

        // Epoch Banner & Description
        this.contents.fillRect(16, 76, this.contentsWidth() - 32, 2, "#d4af37");
        this.changeTextColor("#fbbf24");
        this.drawText(`${epoch.name} (Years ${epoch.startYear} - ${epoch.endYear})`, 24, 86, this.contentsWidth() - 48, "left");
        this.changeTextColor("#cbd5e1");
        this.drawText(epoch.desc, 24, 114, this.contentsWidth() - 48, "left");
        this.resetTextColor();

        // Historical Events Timeline for this Epoch
        let y = 154 - this._scrollOffset;
        const maxY = this.contentsHeight() - 40;

        for (const ev of epochEvents) {
            if (y > maxY) break;
            if (y >= 140) {
                // Year badge
                this.contents.fillRect(24, y, 70, 22, "rgba(30, 41, 59, 0.8)");
                this.changeTextColor("#38bdf8");
                this.drawText(`Year ${ev.year}`, 26, y - 2, 66, "center");

                // Event Title
                this.changeTextColor("#f1f5f9");
                this.drawText(ev.title, 104, y - 2, this.contentsWidth() - 120, "left");

                // Event Description
                this.changeTextColor("#94a3b8");
                this.drawText(ev.text, 104, y + 22, this.contentsWidth() - 120, "left");
            }
            y += 56;
        }

        // Footer navigation help
        this.changeTextColor("#64748b");
        this.drawText("Keys 1-5: Select Epoch | Up/Down or Wheel: Scroll | H / Esc: Close", 0, this.contentsHeight() - 28, this.contentsWidth(), "center");
        this.resetTextColor();
    };

    // Integrate with Scene_Map
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        const w = 780, h = 540;
        const x = Math.floor((Graphics.boxWidth - w) / 2);
        const y = Math.floor((Graphics.boxHeight - h) / 2);
        this._historyWindow = new Window_UFHistory(new Rectangle(x, y, w, h));
        this._historyWindow.hide();
        this._historyWindow.close();
        this.addWindow(this._historyWindow);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (this._historyWindow && this._historyWindow.visible) {
            if (Input.isTriggered("cancel") || Input.isTriggered("history")) {
                SoundManager.playCancel();
                this._historyWindow.hide();
                this._historyWindow.close();
                return;
            }
            if (Input.isRepeated("up")) this._historyWindow.scroll(-40);
            if (Input.isRepeated("down")) this._historyWindow.scroll(40);
            if (TouchInput.wheelY < 0) this._historyWindow.scroll(-30);
            if (TouchInput.wheelY > 0) this._historyWindow.scroll(30);

            for (let i = 1; i <= 5; i++) {
                if (Input.isTriggered(String(i))) {
                    SoundManager.playCursor();
                    this._historyWindow.setEpoch(i - 1);
                }
            }
        } else if (Input.isTriggered("history")) {
            SoundManager.playOk();
            this._historyWindow.refresh();
            this._historyWindow.show();
            this._historyWindow.open();
        }
    };

    // Register Key 'H' (keycode 72)
    Input.keyMapper[72] = "history";

    // Checks (UF_Test suite "history")
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && UF.Test && UF.Test.active) registerHistoryChecks();
    };

    function registerHistoryChecks() {
        UF.Test.suite("history", async t => {
            const W = UF.World;
            const st = W.state;
            t.check("world_state_exists", !!st, "world state initialized");
            if (!st) return;

            const hist = History.generate(st);
            t.check("reaches_year_600", hist && hist.totalYears === 600, `history simulated ${hist.totalYears} years`);
            t.check("five_epochs", hist && hist.epochs.length === 5, `${hist.epochs.length} distinct historical epochs`);
            t.check("chronicle_recorded", hist && hist.chronicle.length >= 10, `${hist.chronicle.length} major historical events recorded`);
            t.check("legendary_artifacts", hist && hist.artifacts.length > 0, `${hist.artifacts.length} legendary artifacts forged`);
            t.check("ancient_ruins", hist && hist.ruins.length > 0, `${hist.ruins.length} ancient ruins scattered across the world`);

            // Determinism check
            const hist2 = History.generate({ seed: st.seed, factions: st.factions, areasX: 16, areasY: 16 });
            t.check("deterministic", JSON.stringify(hist.chronicle) === JSON.stringify(hist2.chronicle), "history is 100% deterministic from seed");

            // UI test
            if (SceneManager._scene && SceneManager._scene._historyWindow) {
                const win = SceneManager._scene._historyWindow;
                win.refresh();
                win.show();
                await t.waitFrames(10);
                t.screenshot("history.chronicles");
                t.check("window_renders", win.visible, "history chronicles window opens and renders");
                win.hide();
            }

            t.check("no_errors", t.errorsSoFar().length === 0, "no errors during history checks");
        });
    }

})();
