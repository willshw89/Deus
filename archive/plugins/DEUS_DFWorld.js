//=============================================================================
// RPG Maker MZ - Ultima Fortress: Multi-Racial Living World & Personality
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS DFWorld] Authentic Multi-Racial Kaldurath living world: Karadrim, Valen, Sylvathi, Morvath, Kitterkin, Vorgari, and Precursor Automata with linguistic names, bionics, and psychological profiles.
 * @author Deepdelve Architect
 *
 * @help
 * ============================================================================
 * Ultima Fortress Multi-Racial Living World (Science-Fantasy Fusion)
 * ============================================================================
 * Generates authentic linguistic names, racial traits, beliefs, preferences,
 * and cybernetic/bionic augments across 6 distinct civilized species:
 * - Karadrim: Mountain metallurgists, rune-smiths, Black Iron-Stout, star-iron.
 * - Valen: Sovereign plains diplomats, knights, tech-relic traders, chivalric code.
 * - Sylvathi: Canopy-kin, living-wood shapers, bio-luminescent optics, root guardians.
 * - Morvath: Trench-kin, lightless chasm scavengers, plasma cutters, barbed chains.
 * - Kitterkin: Warren-slinkers, lock-turners, circuit scavengers, twitching tails.
 * - Vorgari: Zenith-kin of basalt hide; Dual Axioms (Will & Form) bound by Endurance.
 * - Automata: Precursor security and maintenance constructs in deep vaults.
 *
 * Event Note Tags:
 * <df_citizen: smith, karadrim>
 * <df_citizen: brewer, karadrim>
 * <df_citizen: merchant, valen>
 * <df_citizen: ranger, sylvathi>
 * <df_citizen: scholar, vorgari>
 * <df_citizen: thief, kitterkin>
 * <df_citizen: raider, morvath>
 * <df_citizen: sentinel, automaton>
 *
 * Interacting with an NPC while holding Shift (or facing them) opens their
 * authentic living personality profile and bionic inspection window.
 */

(() => {
    "use strict";

    const pluginName = "DEUS_DFWorld";
    window.UF_DFWorld = {};

    let dfLexicon = null;
    let dfCreatures = null;
    let dfEntities = null;

    // Load data from files or fallback
    function initData() {
        if (typeof require === "function") {
            try {
                const fs = require("fs");
                const path = require("path");
                const base = path.dirname(process.mainModule.filename);
                const lexFile = path.join(base, "data", "df_lexicon.json");
                if (fs.existsSync(lexFile)) dfLexicon = JSON.parse(fs.readFileSync(lexFile, "utf8"));
                const creatFile = path.join(base, "data", "df_creatures.json");
                if (fs.existsSync(creatFile)) dfCreatures = JSON.parse(fs.readFileSync(creatFile, "utf8"));
                const entFile = path.join(base, "data", "df_entities.json");
                if (fs.existsSync(entFile)) dfEntities = JSON.parse(fs.readFileSync(entFile, "utf8"));
            } catch (e) {
                // fall through to fetch
            }
        }
        if (!dfLexicon) {
            fetch("data/df_lexicon.json").then(r => r.json()).then(d => { dfLexicon = d; }).catch(() => {});
        }
        if (!dfCreatures) {
            fetch("data/df_creatures.json").then(r => r.json()).then(d => { dfCreatures = d; }).catch(() => {});
        }
        if (!dfEntities) {
            fetch("data/df_entities.json").then(r => r.json()).then(d => { dfEntities = d; }).catch(() => {});
        }
    }
    initData();

    // Fallback dictionary for instant generation
    const FALLBACK_NAMES = {
        karadrim: [
            { native: "Kragan", english: "Stone-Smith" },
            { native: "Thorgar", english: "Deep-Ale" },
            { native: "Kogan", english: "Shield-Thane" },
            { native: "Baruk", english: "Forge-Axe" },
            { native: "Grond", english: "Hammer-Fall" },
            { native: "Meng", english: "Ore-Seeker" }
        ],
        valen: [
            { native: "Aldric", english: "Noble-Ruler" },
            { native: "Cedric", english: "Guild-Master" },
            { native: "Doran", english: "Blade-Knight" },
            { native: "Rowena", english: "Star-Fame" },
            { native: "Caelan", english: "Dawn-Herald" }
        ],
        sylvathi: [
            { native: "Caerith", english: "Song-Weaver" },
            { native: "Sylvanna", english: "Canopy-Warden" },
            { native: "Aeloria", english: "Leaf-Whisper" },
            { native: "Llyran", english: "River-Stride" },
            { native: "Eluned", english: "Star-Bough" }
        ],
        morvath: [
            { native: "Gorgar", english: "Blood-Trench" },
            { native: "Kraznok", english: "Chain-Lasher" },
            { native: "Skulgor", english: "Bone-Cleaver" },
            { native: "Varkat", english: "Ash-Scourge" }
        ],
        kitterkin: [
            { native: "Tik-Chit", english: "Quick-Finger" },
            { native: "Skrit-Zik", english: "Spark-Turner" },
            { native: "Pip-Skit", english: "Tail-Twitch" },
            { native: "Nip-Krak", english: "Lock-Cracker" }
        ],
        vorgari: [
            { native: "Vor-Tek", english: "Will-Form" },
            { native: "Xan-Vath", english: "Endurance-Basalt" },
            { native: "Khor-Form", english: "Great-Structure" },
            { native: "Zar-Will", english: "True-Passion" },
            { native: "Borin", english: "Forge-Artisan" }
        ],
        automaton: [
            { native: "Unit-77", english: "Vault-Sentinel" },
            { native: "Unit-04", english: "Pneumatic-Warden" },
            { native: "Prime-8", english: "Matrix-Overseer" }
        ]
    };

    const RACIAL_CONFIG = {
        karadrim: {
            name: "Karadrim (Mountain-Kin)",
            roots: ["Iron", "Stone", "Star", "Steel", "Basalt", "Anvil", "Rune", "Deep", "Forge", "Core"],
            suffixes: ["forge", "hammer", "delver", "shield", "cleaver", "breaker", "helm", "vein", "beard"],
            traits: [
                "Values hard toil, runic metallurgy, and masterwork engineering.",
                "Drinks Black Iron-Stout to fortify blood against subterranean cold.",
                "Fascinated by star-iron alloys and ancient pre-collapse energy conduits.",
                "Dreams of unearthing an intact precursor orbital power core.",
                "Takes fierce pride in clan lineage, runic oaths, and heavy plate armor."
            ],
            preferences: [
                "Prefers Black Iron-Stout, Star-Iron battleaxes, and roasted glow-spores.",
                "Likes native aurum, deep basalt paver stones, and precision chisels.",
                "Appreciates the deep hum of geothermal plasma smelters."
            ],
            bionics: [
                "None (Dense Bone Frame)",
                "Galvanic Star-Iron Arm (+15% Forging Power)",
                "Reinforced Pneumatic Knee (+10% Haul Capacity)",
                "Optic Delve Visor (Infra-Red Darkvision)"
            ],
            description: "A stout Karadrim of dense bone constitution with a braided beard, runic iron mail, and soot-stained calloused hands."
        },
        valen: {
            name: "Valen (Sovereign Humans)",
            roots: ["Bright", "Shield", "Dawn", "Aura", "Iron", "Storm", "Silver", "Crown", "Star"],
            suffixes: ["ward", "bearer", "ford", "crest", "blade", "brook", "helm", "reach", "vale"],
            traits: [
                "Driven by diplomatic commerce, guild charters, and chivalric prowess.",
                "Seeks to salvage and decipher pre-collapse orbital tech relics.",
                "Values adaptability and grand multi-racial trade alliances across Kaldurath.",
                "Upholds written legal contracts and formal peace accords."
            ],
            preferences: [
                "Prefers spiced highland mead, Star-Iron rapiers, and trade ledgers.",
                "Likes imported surface silks, polished silver coins, and photon crystals.",
                "Appreciates traveling merchant caravans, cartography, and fair barter."
            ],
            bionics: [
                "None (Natural Humanoid Frame)",
                "Precursor Dermal Mesh (+2 Kinetic Armor)",
                "Galvanic Reflex Node (+10% Initiative)"
            ],
            description: "A versatile Valen diplomat-adventurer wearing fine traveling leathers, a guild crest, and a keen, watchful gaze."
        },
        sylvathi: {
            name: "Sylvathi (Canopy-Kin)",
            roots: ["Leaf", "Star", "Dew", "Wind", "Aura", "Root", "Canopy", "Whisper", "Song"],
            suffixes: ["song", "whisper", "weaver", "fall", "branch", "walker", "glade", "shade", "wood"],
            traits: [
                "Dedicated to the ruthless protection of primordial living roots.",
                "Grafts bio-luminescent fiber-optics and living-wood into symbiotic armor.",
                "Views ancient crashed starship hulls as metal scars upon the earth.",
                "Possesses supernatural agility and uncanny silence in darkness."
            ],
            preferences: [
                "Prefers glow-berry wine, living-wood composite bows, and starflowers.",
                "Likes bio-luminescent canopy paths, clean mountain wind, and quiet vigils.",
                "Appreciates choral root-hymns and ancient living-wood shaping."
            ],
            bionics: [
                "None (Pure Biological Frame)",
                "Symbiotic Living-Wood Arm Graft (Enhanced Draw Weight)",
                "Bio-Luminescent Spore Eye (Thermal Sight)"
            ],
            description: "A tall, slender Sylvathi with piercing almond eyes and silent footfalls. A living-wood circlet woven with glowing fiber rests on their brow."
        },
        morvath: {
            name: "Morvath (Trench-Kin)",
            roots: ["Bone", "Spike", "Flay", "Cruel", "Trench", "Scourge", "Ash", "Rift"],
            suffixes: ["lasher", "fang", "snarl", "scourge", "crusher", "hide", "strike", "rot"],
            traits: [
                "Thrives in the lightless chasms and radioactive rift trenches.",
                "Wields barbed iron chains, salvaged plasma cutters, and scrap armor.",
                "Believes physical dominance and terror are the only true laws.",
                "Endures extreme subterranean sulfur heat without flinching."
            ],
            preferences: [
                "Prefers raw subterranean meat, serrated plasma blades, and sulfur stew.",
                "Likes barbed iron chains, glowing power cells, and giant rift toads.",
                "Enjoys echoing war drums and the hiss of overcharged arc-whips."
            ],
            bionics: [
                "None (Scarred Sallow Frame)",
                "Barbed Scrap Claw (+10 Bleed Damage)",
                "Pneumatic Piston Leg (+20% Leap Distance)"
            ],
            description: "A sinewy, sallow-skinned Morvath with sharp fangs, scarred limbs, and a predatory sneer, brandishing barbed iron weaponry."
        },
        kitterkin: {
            name: "Kitterkin (Warren-Slinkers)",
            roots: ["Quick", "Shadow", "Tik", "Chit", "Glint", "Cog", "Spark", "Wire"],
            suffixes: ["finger", "prowl", "whisper", "skitter", "tooth", "shank", "step", "turner"],
            traits: [
                "Endlessly obsessed with collecting shiny pre-collapse circuit chips and brass cogs.",
                "Innate genius for disarming security traps, picking locks, and slicing consoles.",
                "Communicates in rapid chattering clicks and utterances; long tail twitches when nervous.",
                "Lightning fast; slips through cracks when outmatched."
            ],
            preferences: [
                "Prefers roasted cave grubs, copper wire coils, and quantum photon crystals.",
                "Likes narrow ventilation ducts, dark scrap alcoves, and pocket-sized tools.",
                "Enjoys tinkering with salvaged clockwork servos and energy cells."
            ],
            bionics: [
                "None (Nimble Fur/Scaled Frame)",
                "Prehensile Tail-Tip Pick Implant (Instant Lockpicking)",
                "Galvanic Micro-Welder Finger"
            ],
            description: "A diminutive Kitterkin with large expressive ears, a twitching furred tail, and pockets overflowing with copper cogs and shiny wires."
        },
        vorgari: {
            name: "Vorgari (Zenith-Kin)",
            roots: ["Zenith", "Will", "Form", "Endurance", "Basalt", "Volcano", "Axiom"],
            suffixes: ["will", "form", "zenith", "truth", "stone", "forge", "scholar", "exarch"],
            traits: [
                "Guided by the Dual Axioms: Will (Intent & Passion) and Form (Structure & Restraint), bound by Endurance.",
                "Studies stellar navigation codices and quantum flux equations on basalt tablets.",
                "Immune to extreme volcanic magma heat and cold void vacuum.",
                "Speaks with deliberate, solemn cadence and deep resonating authority."
            ],
            preferences: [
                "Prefers volcanic nectar, Star-Iron glaives, and quantum energy matrices.",
                "Likes geothermal magma vents, basalt observatories, and rhythmic hammercraft.",
                "Appreciates unbreakable basalt-bronze armor and flawless geometric architecture."
            ],
            bionics: [
                "None (Obsidian Basalt Hide)",
                "Aetheric Wing Actuators (+25% Flight Speed)",
                "Hardened Obsidian Cyber-Horn (Arc Focus)"
            ],
            description: "A majestic Vorgari with crimson-grey basalt hide, sweeping obsidian horns, and a solemn gaze radiating the balance of Will and Form."
        },
        automaton: {
            name: "Precursor Automaton",
            roots: ["Unit", "Prime", "Warden", "Matrix", "Chassis", "Protocol", "Drone"],
            suffixes: ["warden", "sentinel", "core", "unit", "prime", "vessel", "drone"],
            traits: [
                "Operates under pre-collapse security protocols; immune to toxins and fatigue.",
                "Maintains eternal sentinel vigil over forgotten subterranean derelict vaults.",
                "Aetheric power core hums with high-frequency quantum energy."
            ],
            preferences: [
                "Prefers charged aetheric cells, fresh hydraulic fluid, and undisturbed vaults."
            ],
            bionics: [
                "Factory Standard (Full Star-Iron Chassis)",
                "Overcharged Plasma Torch Servo-Arm",
                "High-Torque Pneumatic Actuators"
            ],
            description: "A hulking pre-collapse construct with weathered star-iron plating, a glowing cyan optic eye, and pneumatic actuator arms."
        }
    };

    // Aliases for backward compatibility
    RACIAL_CONFIG["dwarf"] = RACIAL_CONFIG["karadrim"];
    RACIAL_CONFIG["human"] = RACIAL_CONFIG["valen"];
    RACIAL_CONFIG["elf"] = RACIAL_CONFIG["sylvathi"];
    RACIAL_CONFIG["goblin"] = RACIAL_CONFIG["morvath"];
    RACIAL_CONFIG["kobold"] = RACIAL_CONFIG["kitterkin"];
    RACIAL_CONFIG["gargoyle"] = RACIAL_CONFIG["vorgari"];
    FALLBACK_NAMES["dwarf"] = FALLBACK_NAMES["karadrim"];
    FALLBACK_NAMES["human"] = FALLBACK_NAMES["valen"];
    FALLBACK_NAMES["elf"] = FALLBACK_NAMES["sylvathi"];
    FALLBACK_NAMES["goblin"] = FALLBACK_NAMES["morvath"];
    FALLBACK_NAMES["kobold"] = FALLBACK_NAMES["kitterkin"];
    FALLBACK_NAMES["gargoyle"] = FALLBACK_NAMES["vorgari"];

    UF_DFWorld.generateProfile = function(profession = "Craftsperson", race = "karadrim") {
        race = race.toLowerCase();
        if (!RACIAL_CONFIG[race]) {
            if (race === "dwarf") race = "karadrim";
            else if (race === "human") race = "valen";
            else if (race === "elf") race = "sylvathi";
            else if (race === "goblin") race = "morvath";
            else if (race === "kobold") race = "kitterkin";
            else if (race === "gargoyle") race = "vorgari";
            else race = "karadrim";
        }
        const cfg = RACIAL_CONFIG[race] || RACIAL_CONFIG["karadrim"];

        let fnNative = "";
        let fnEnglish = "";

        // Check loaded lexicon
        if (dfLexicon && dfLexicon.length > 0) {
            const entry = dfLexicon[Math.floor(Math.random() * dfLexicon.length)];
            if ((race === "karadrim" || race === "dwarf") && (entry.karadic || entry.dwarven)) {
                const w = entry.karadic || entry.dwarven;
                fnNative = w.charAt(0).toUpperCase() + w.slice(1);
                fnEnglish = entry.english ? entry.english.charAt(0).toUpperCase() + entry.english.slice(1) : "";
            } else if ((race === "valen" || race === "human") && (entry.valic || entry.human)) {
                const w = entry.valic || entry.human;
                fnNative = w.charAt(0).toUpperCase() + w.slice(1);
                fnEnglish = entry.english ? entry.english.charAt(0).toUpperCase() + entry.english.slice(1) : "";
            } else if ((race === "sylvathi" || race === "elf") && (entry.sylvic || entry.elven)) {
                const w = entry.sylvic || entry.elven;
                fnNative = w.charAt(0).toUpperCase() + w.slice(1);
                fnEnglish = entry.english ? entry.english.charAt(0).toUpperCase() + entry.english.slice(1) : "";
            } else if ((race === "morvath" || race === "goblin") && (entry.morvathic || entry.goblin)) {
                const w = entry.morvathic || entry.goblin;
                fnNative = w.charAt(0).toUpperCase() + w.slice(1);
                fnEnglish = entry.english ? entry.english.charAt(0).toUpperCase() + entry.english.slice(1) : "";
            } else if ((race === "kitterkin" || race === "kobold") && (entry.kitter || entry.kobold)) {
                const w = entry.kitter || entry.kobold;
                fnNative = w.toUpperCase();
                fnEnglish = entry.english || "Chitter";
            } else if ((race === "vorgari" || race === "gargoyle") && (entry.vorgash || entry.gargish)) {
                const w = entry.vorgash || entry.gargish;
                fnNative = w.toUpperCase();
                fnEnglish = entry.english || "Will";
            }
        }

        if (!fnNative) {
            const list = FALLBACK_NAMES[race] || FALLBACK_NAMES.karadrim;
            const chosen = list[Math.floor(Math.random() * list.length)];
            fnNative = chosen.native;
            fnEnglish = chosen.english;
        }

        const root = cfg.roots[Math.floor(Math.random() * cfg.roots.length)];
        const suff = cfg.suffixes[Math.floor(Math.random() * cfg.suffixes.length)];
        const fullName = `${fnNative} ${root}${suff}`;
        const translation = fnEnglish ? `("${fnEnglish} ${root} ${suff}")` : `("${root} ${suff}")`;

        const trait1 = cfg.traits[Math.floor(Math.random() * cfg.traits.length)];
        let trait2 = cfg.traits[Math.floor(Math.random() * cfg.traits.length)];
        if (trait2 === trait1 && cfg.traits.length > 1) {
            trait2 = cfg.traits[(cfg.traits.indexOf(trait1) + 1) % cfg.traits.length];
        }
        const pref = cfg.preferences[Math.floor(Math.random() * cfg.preferences.length)];
        const bionic = cfg.bionics[Math.floor(Math.random() * cfg.bionics.length)];

        return {
            fullName,
            translation,
            profession,
            race: cfg.name,
            traits: [trait1, trait2],
            preference: pref,
            bionic: bionic,
            description: cfg.description
        };
    };

    //-----------------------------------------------------------------------------
    // Window_UFProfile (Multi-Racial DF Character Inspection Window)
    //-----------------------------------------------------------------------------
    class Window_UFProfile extends Window_Base {
        constructor(profile) {
            const width = 620;
            const height = 410;
            const x = Math.floor((Graphics.width - width) / 2);
            const y = Math.floor((Graphics.height - height) / 2);
            super(new Rectangle(x, y, width, height));

            this.opacity = 250;
            this.profile = profile;
            this.refresh();
        }

        refresh() {
            this.contents.clear();
            const p = this.profile;

            // Header - Name & Translation
            this.contents.fontSize = 18;
            this.changeTextColor(ColorManager.textColor(14)); // Gold
            this.drawText(p.fullName, 0, 8, this.innerWidth, "center");

            this.contents.fontSize = 12;
            this.changeTextColor(ColorManager.textColor(7));
            this.drawText(p.translation, 0, 32, this.innerWidth, "center");

            this.contents.fontSize = 13;
            this.changeTextColor(ColorManager.textColor(6)); // Cyan
            this.drawText(`Species: ${p.race}   |   Occupation: ${p.profession}`, 20, 56, this.innerWidth - 40, "left");

            // Divider
            this.contents.fillRect(16, 78, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.5)");

            // Description
            this.changeTextColor(ColorManager.normalColor());
            this.contents.fontSize = 12;
            this.drawText(p.description, 20, 86, this.innerWidth - 40, "left");

            // Bionic / Cybernetic Augment
            this.contents.fillRect(16, 116, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.5)");
            this.changeTextColor(ColorManager.textColor(14));
            this.contents.fontSize = 13;
            this.drawText("CYBERNETIC / BIONIC AUGMENTATION", 20, 122, 400, "left");
            this.changeTextColor(ColorManager.textColor(3)); // Green
            this.drawText(`* ${p.bionic}`, 28, 144, this.innerWidth - 50, "left");

            // Traits & Beliefs
            this.contents.fillRect(16, 172, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.5)");
            this.changeTextColor(ColorManager.textColor(14));
            this.drawText("PERSONALITY TRAITS & BELIEFS", 20, 180, 400, "left");

            this.changeTextColor(ColorManager.normalColor());
            this.drawText(`* ${p.traits[0]}`, 28, 204, this.innerWidth - 50, "left");
            this.drawText(`* ${p.traits[1]}`, 28, 228, this.innerWidth - 50, "left");

            // Preferences
            this.contents.fillRect(16, 258, this.innerWidth - 32, 2, "rgba(200, 157, 92, 0.5)");
            this.changeTextColor(ColorManager.textColor(14));
            this.drawText("PREFERENCES & CRAFTS", 20, 266, 400, "left");
            this.changeTextColor(ColorManager.normalColor());
            this.drawText(`* ${p.preference}`, 28, 290, this.innerWidth - 50, "left");

            // Footer
            this.contents.fontSize = 12;
            this.changeTextColor(ColorManager.textColor(7));
            this.drawText("Press [OK], [ESC], or [Shift] to Close", 0, this.innerHeight - 24, this.innerWidth, "center");
        }

        update() {
            super.update();
            if (Input.isTriggered("ok") || Input.isTriggered("cancel") || Input.isTriggered("shift")) {
                SoundManager.playCancel();
                this.close();
            }
        }

        close() {
            super.close();
            if (this.parent) this.parent.removeChild(this);
            if (SceneManager._scene) SceneManager._scene._activeProfileWindow = null;
        }
    }

    UF_DFWorld.showProfile = function(profile) {
        if (!SceneManager._scene) return;
        if (SceneManager._scene._activeProfileWindow) {
            SceneManager._scene._activeProfileWindow.close();
        }
        const win = new Window_UFProfile(profile);
        SceneManager._scene._activeProfileWindow = win;
        SceneManager._scene.addChild(win);
        SoundManager.playOk();
    };

    // Attach profile to events from Note Tags: <df_citizen: [profession], [race]>
    const _Game_Event_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
        _Game_Event_setupPage.call(this);
        if (this.event() && this.event().note) {
            const match = this.event().note.match(/<df_citizen:\s*([^,>]+)(?:,\s*([^>]+))?>/i);
            if (match) {
                const prof = match[1].trim().charAt(0).toUpperCase() + match[1].trim().slice(1);
                const race = match[2] ? match[2].trim().toLowerCase() : "karadrim";
                this._dfProfile = UF_DFWorld.generateProfile(prof, race);
            }
        }
    };

    // Trigger profile inspection when pressing Shift near event
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (Input.isTriggered("shift") && !$gameMessage.isBusy()) {
            const frontX = $gameMap.roundXWithDirection($gamePlayer.x, $gamePlayer.direction());
            const frontY = $gameMap.roundYWithDirection($gamePlayer.y, $gamePlayer.direction());
            const events = $gameMap.eventsXy(frontX, frontY);
            for (const ev of events) {
                if (ev._dfProfile) {
                    UF_DFWorld.showProfile(ev._dfProfile);
                    return;
                }
            }
        }
    };

})();
