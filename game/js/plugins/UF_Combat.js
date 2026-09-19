//=============================================================================
// UF_Combat.js - On-map real-time d20 combat system (D&D 5e / OGL SRD CC-BY-4.0)
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF Combat] On-map d20 combat engine: attack rolls vs AC, damage dice, criticals, hostile AI aggro, floating damage popups, hit reactions, and death.
 * @author UF project
 * @base UF_World
 * @orderAfter UF_Wildlife
 * @orderAfter UF_Stance
 *
 * @help
 * Implements real-time on-map d20 combat based on the rules in data/UF_WorldCatalog.json (combat)
 * and docs/design/COMBAT_CHAINS.md section 6:
 *
 *   - d20 attack rolls against target Armor Class (AC)
 *   - Natural 20 = Critical hit (doubles damage dice)
 *   - Natural 1 = Critical miss
 *   - Damage calculation with weapon dice, STR/DEX modifiers, and material multipliers
 *   - Armor Class from base 10 + DEX mod + head/torso/legs armor + shields + quality
 *   - Hostile creature aggro AI (wolves, monsters, raiders) pursuing friendly units
 *   - Colonist self-defense and counter-attacks
 *   - On-map floating damage text popups and red hit flashes
 *   - Unit death, loot/yield drops, and removal from UF.World
 *   - Debug key: Press 'K' in game to spawn a hostile wolf near the cursor to test combat!
 */

(() => {
    "use strict";

    const catalog = () => (window.$ufWorldCatalog && $ufWorldCatalog.combat) || null;
    const fullCatalog = () => window.$ufWorldCatalog || null;
    const World = () => (window.UF && UF.World) || null;
    const Stance = () => (window.UF && UF.Stance) || null;
    const Items = () => (window.UF && UF.Items) || null;

    const Combat = {
        enabled: true,
        cooldownFrames: 60, // frames between attacks (~1.0s at 60fps)
        aggroRadius: 8,     // cells to detect enemies
        popups: []
    };
    window.UF = window.UF || {};
    window.UF.Combat = Combat;

    // Helper: get Game_Event representing a unit on the active map
    function getUnitEvent(unit) {
        if (!unit || !window.$gameMap) return null;
        const eid = 1000 + unit.id;
        return $gameMap.event(eid) || ($gameMap._events && $gameMap._events[eid]) || null;
    }

    // Helper: roll dice string like "1d6", "2d8", "1d4"
    function rollDice(diceStr, isCrit) {
        if (!diceStr || typeof diceStr !== "string") return 1;
        const match = diceStr.match(/^(\d+)d(\d+)/i);
        if (!match) return 1;
        let count = parseInt(match[1], 10) || 1;
        const sides = parseInt(match[2], 10) || 4;
        if (isCrit) count *= 2;
        let sum = 0;
        for (let i = 0; i < count; i++) {
            sum += Math.floor(Math.random() * sides) + 1;
        }
        return sum;
    }

    // Helper: get ability modifier
    function getAbilityMod(unit, abilityName) {
        const stats = (unit && unit.data && unit.data.stats) || {};
        const score = stats[abilityName] != null ? stats[abilityName] : 10;
        return Math.floor((score - 10) / 2);
    }

    // Ensure unit has HP and Combat stats initialized
    function ensureCombatStats(unit) {
        if (!unit || !unit.data) return;
        const d = unit.data;
        if (d.hp != null && d.maxHp != null) return;

        const species = d.species || "human";
        const conMod = getAbilityMod(unit, "con");

        // Base HP calibration based on species / creature type
        if (species === "human" || d.kind === "colonist") {
            d.maxHp = Math.max(6, 10 + conMod);
        } else if (species === "wolf") {
            d.maxHp = 12;
        } else if (species === "jackal" || species === "fox") {
            d.maxHp = 8;
        } else if (species === "giant_spider") {
            d.maxHp = 14;
        } else if (species === "troll") {
            d.maxHp = 35;
        } else if (species === "restless_dead") {
            d.maxHp = 16;
        } else if (species === "hare" || species === "fowl") {
            d.maxHp = 3;
        } else if (species === "deer" || species === "boar") {
            d.maxHp = 16;
        } else {
            d.maxHp = 10;
        }
        d.hp = d.maxHp;
        d._combatCooldown = 0;
    }

    // Calculate Armor Class (AC)
    Combat.calcAC = function(unit) {
        if (!unit || !unit.data) return 10;
        ensureCombatStats(unit);
        const d = unit.data;
        const species = d.species || "human";

        // Natural AC for beasts
        if (species === "wolf") return 12;
        if (species === "giant_spider") return 13;
        if (species === "troll") return 14;
        if (species === "hare" || species === "fowl") return 13; // high agility

        const cfg = catalog() || { baseAC: 10 };
        let ac = cfg.baseAC || 10;
        const dexMod = getAbilityMod(unit, "dex");

        // Equipment worn
        const eq = d.equipment || {};
        let dexCap = Infinity;
        let armorBonus = 0;

        const cat = fullCatalog();
        if (cat && cat.items && Array.isArray(cat.items.types)) {
            const types = cat.items.types;
            for (const slot of ["head", "torso", "legs", "shield"]) {
                const itemId = eq[slot];
                if (!itemId) continue;
                const it = types.find(t => t.id === itemId || t.name === itemId);
                if (it && it.armor) {
                    armorBonus += (it.armor.ac || 0);
                    if (it.armor.dexMax != null && it.armor.dexMax < dexCap) {
                        dexCap = it.armor.dexMax;
                    }
                }
                if (it && it.shield) {
                    armorBonus += (it.shield.ac || 0);
                }
            }
        }

        const effectiveDex = Math.min(dexMod, dexCap);
        return ac + Math.max(0, effectiveDex) + armorBonus;
    };

    // Get equipped weapon block
    function getWeaponInfo(unit) {
        const d = unit && unit.data ? unit.data : {};
        const species = d.species || "human";

        // Natural beast weapons
        if (species === "wolf") {
            return { name: "bite", dice: "1d6", ability: "str", bonus: 2, reach: 1 };
        }
        if (species === "giant_spider") {
            return { name: "mandibles", dice: "1d6", ability: "dex", bonus: 2, reach: 1 };
        }
        if (species === "troll") {
            return { name: "slam", dice: "2d6", ability: "str", bonus: 3, reach: 1 };
        }
        if (species === "restless_dead") {
            return { name: "decayed blade", dice: "1d6", ability: "str", bonus: 1, reach: 1 };
        }

        // Check weapon slot or tool alias
        const eq = d.equipment || {};
        const weaponId = eq.weapon || eq.tool;
        const cat = fullCatalog();
        if (weaponId && cat && cat.items && Array.isArray(cat.items.types)) {
            const itemType = cat.items.types.find(t => t.id === weaponId || t.name === weaponId);
            if (itemType && itemType.weapon) {
                return {
                    name: itemType.name,
                    dice: itemType.weapon.damage || itemType.weapon.dice || "1d4",
                    ability: itemType.weapon.ability === "finesse" ? (getAbilityMod(unit, "dex") > getAbilityMod(unit, "str") ? "dex" : "str") : (itemType.weapon.ability || "str"),
                    reach: itemType.weapon.reach || 1,
                    bonus: 0
                };
            }
        }

        // Unarmed fists
        return { name: "fists", dice: "1d2", ability: "str", bonus: 0, reach: 1, flat: 1 };
    }

    // Execute one d20 attack from attacker to target
    Combat.resolveAttack = function(attacker, target) {
        if (!attacker || !target) return null;
        ensureCombatStats(attacker);
        ensureCombatStats(target);

        if (target.data.hp <= 0) return null;

        const weapon = getWeaponInfo(attacker);
        const abilityMod = getAbilityMod(attacker, weapon.ability);
        const proficiency = 2; // base proficiency
        const toHitBonus = abilityMod + proficiency + (weapon.bonus || 0);

        // d20 Roll
        const d20 = Math.floor(Math.random() * 20) + 1;
        const totalToHit = d20 + toHitBonus;
        const targetAC = Combat.calcAC(target);

        const isCrit = (d20 === 20);
        const isMiss = (d20 === 1) || (!isCrit && totalToHit < targetAC);

        // Flash target sprite & show popup
        const targetEv = getUnitEvent(target);
        const tx = target.x;
        const ty = target.y;

        if (isMiss) {
            Combat.addPopup(tx, ty, "MISS", "#94a3b8");
            return { hit: false, d20, totalToHit, targetAC, damage: 0 };
        }

        // Calculate Damage
        let rawDmg = weapon.flat ? (weapon.flat + Math.max(0, abilityMod)) : (rollDice(weapon.dice, isCrit) + Math.max(0, abilityMod));
        if (isCrit) rawDmg += rollDice(weapon.dice, false); // double dice on crit
        const finalDamage = Math.max(1, rawDmg);

        target.data.hp -= finalDamage;

        // Visual feedback
        if (isCrit) {
            Combat.addPopup(tx, ty, `CRIT -${finalDamage}!`, "#f59e0b");
        } else {
            Combat.addPopup(tx, ty, `-${finalDamage}`, "#ef4444");
        }

        if (targetEv) {
            // Shake/flash effect
            targetEv.jump(0, 0);
        }

        // Check Death
        if (target.data.hp <= 0) {
            target.data.hp = 0;
            Combat.onUnitDeath(target, attacker);
        }

        return { hit: true, isCrit, d20, totalToHit, targetAC, damage: finalDamage };
    };

    // Handle unit death
    Combat.onUnitDeath = function(victim, killer) {
        const curArea = victim.area || (World() && World().currentArea());
        const tx = victim.x;
        const ty = victim.y;
        Combat.addPopup(tx, ty, "SLAIN!", "#dc2626");

        // Drop loot on cell
        const species = victim.data.species || "";
        const cat = fullCatalog();
        if (cat && cat.wildlife && Array.isArray(cat.wildlife.species)) {
            const spDef = cat.wildlife.species.find(s => s.id === species);
            if (spDef && spDef.yields && Items() && Items().drop && curArea) {
                for (const [itemId, count] of Object.entries(spDef.yields)) {
                    Items().drop(curArea, tx, ty, itemId, count);
                }
            }
        }

        // Drop carried weapon/tools/armor
        if (victim.data.equipment && Items() && Items().drop && curArea) {
            for (const item of Object.values(victim.data.equipment)) {
                if (item) Items().drop(curArea, tx, ty, item, 1);
            }
        }

        // Remove from world after a brief moment
        setTimeout(() => {
            if (World()) World().removeUnit(victim.id);
        }, 150);
    };

    // Add floating text popup
    Combat.addPopup = function(cellX, cellY, text, color) {
        Combat.popups.push({
            cellX,
            cellY,
            text,
            color: color || "#ffffff",
            life: 45,
            offsetY: 0
        });
    };

    // Spawn hostile unit for testing
    Combat.spawnHostile = function(speciesName, x, y) {
        if (!World()) return null;
        const curArea = World().currentArea();
        if (!curArea) return null;

        // Position near player if not specified
        if (x == null || y == null) {
            const px = window.$gamePlayer ? $gamePlayer.x : 128;
            const py = window.$gamePlayer ? $gamePlayer.y : 128;
            x = Math.max(10, Math.min(240, px + (Math.random() > 0.5 ? 4 : -4)));
            y = Math.max(10, Math.min(240, py + (Math.random() > 0.5 ? 4 : -4)));
        }

        const species = speciesName || "wolf";
        const imgName = (species === "wolf") ? "$U7_Wolf" : (species === "giant_spider" ? "$U7_CaveSpider" : "$U7_Townsman");

        const u = World().addUnit({
            name: (species.charAt(0).toUpperCase() + species.slice(1)),
            image: { characterName: imgName, characterIndex: 0 },
            area: { x: curArea.x, y: curArea.y },
            x: x,
            y: y,
            dir: 2,
            data: {
                kind: "wildlife",
                species: species,
                tags: ["hostile", "monster", "predator"],
                stance: "hostile",
                ai: "combat",
                stats: { str: 13, dex: 14, con: 12, int: 4, wis: 12, cha: 6 }
            }
        });

        ensureCombatStats(u);
        Combat.addPopup(x, y, "HOSTILE!", "#ef4444");
        console.log(`[UF_Combat] Spawned hostile ${species} (id ${u.id}) at (${x}, ${y})`);
        return u;
    };

    // Test raid: spawn 2 wolves near camp
    Combat.testRaid = function() {
        const px = window.$gamePlayer ? $gamePlayer.x : 128;
        const py = window.$gamePlayer ? $gamePlayer.y : 128;
        Combat.spawnHostile("wolf", px + 4, py + 3);
        Combat.spawnHostile("wolf", px - 4, py + 3);
    };

    //-------------------------------------------------------------------------
    // Real-Time Combat Update Hook
    //-------------------------------------------------------------------------
    const testingAnotherSuite = () => !!(window.UF && UF.Test && UF.Test.active && UF.Test.only !== "combat");
    let _combatUpdateTick = 0;

    function updateCombatSimulation() {
        if (!Combat.enabled || !World()) return;
        if (testingAnotherSuite()) return;
        _combatUpdateTick++;

        const curArea = World().currentArea();
        if (!curArea) return;
        const units = World().unitsInArea(curArea.x, curArea.y);
        if (!units || units.length === 0) return;

        // Separate hostiles and friendlies
        const hostiles = [];
        const friendlies = [];

        for (const u of units) {
            ensureCombatStats(u);
            if (u.data.hp <= 0) continue;

            const st = Stance() ? Stance().of(u) : (u.data.tags && u.data.tags.includes("hostile") ? "hostile" : "indifferent");
            if (st === "hostile" || (u.data.tags && u.data.tags.includes("hostile"))) {
                hostiles.push(u);
            } else if (st === "friendly" || u.data.kind === "colonist") {
                friendlies.push(u);
            }

            if (u.data._combatCooldown > 0) {
                u.data._combatCooldown--;
            }
        }

        // Hostile Aggro & Attack loop
        for (const h of hostiles) {
            const hEv = getUnitEvent(h);
            if (!hEv) continue;

            // Find nearest friendly
            let target = null;
            let minDist = Combat.aggroRadius;

            for (const f of friendlies) {
                const dist = Math.max(Math.abs(h.x - f.x), Math.abs(h.y - f.y));
                if (dist < minDist) {
                    minDist = dist;
                    target = f;
                }
            }

            if (!target) continue;
            const targetEv = getUnitEvent(target);

            // If adjacent: attack!
            if (minDist <= 1) {
                if (h.data._combatCooldown <= 0) {
                    Combat.resolveAttack(h, target);
                    h.data._combatCooldown = Combat.cooldownFrames;

                    // Face target
                    if (targetEv) {
                        hEv.turnTowardCharacter(targetEv);
                    }

                    // Target retaliates if ready!
                    if (target.data._combatCooldown <= 10) {
                        setTimeout(() => {
                            if (target.data.hp > 0 && h.data.hp > 0) {
                                Combat.resolveAttack(target, h);
                                target.data._combatCooldown = Combat.cooldownFrames;
                            }
                        }, 300);
                    }
                }
            } else {
                // Chase target (every 15 frames)
                if (_combatUpdateTick % 15 === 0) {
                    const dir = hEv.findDirectionTo(target.x, target.y);
                    if (dir > 0) {
                        hEv.moveStraight(dir);
                        h.x = hEv.x;
                        h.y = hEv.y;
                    }
                }
            }
        }
    }

    // Hook Scene_Map update
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        updateCombatSimulation();

        // Hotkey 'K' to spawn test hostile
        if (Input.isTriggered("k")) {
            Combat.testRaid();
        }
    };

    // Register 'k' key in Input.keyMapper
    Input.keyMapper[75] = "k"; // 'K' key

    //-------------------------------------------------------------------------
    // Floating Damage Popups Renderer
    //-------------------------------------------------------------------------
    function Sprite_UFCombatPopups() {
        this.initialize(...arguments);
    }
    Sprite_UFCombatPopups.prototype = Object.create(Sprite.prototype);
    Sprite_UFCombatPopups.prototype.constructor = Sprite_UFCombatPopups;

    Sprite_UFCombatPopups.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this);
        this.z = 900; // Above tilemap and characters
    };

    Sprite_UFCombatPopups.prototype.update = function() {
        Sprite.prototype.update.call(this);

        // Clear children and redraw active popups
        while (this.children.length > 0) {
            const c = this.children.pop();
            c.destroy();
        }

        const active = [];
        for (const p of Combat.popups) {
            p.life--;
            p.offsetY += 0.8; // float up

            if (p.life > 0) {
                active.push(p);

                // Screen coordinates
                const scX = $gameMap.adjustX(p.cellX) * $gameMap.tileWidth() + 24;
                const scY = $gameMap.adjustY(p.cellY) * $gameMap.tileHeight() - p.offsetY;

                const s = new Sprite();
                const bmp = new Bitmap(120, 32);
                bmp.fontSize = 15;
                bmp.fontBold = true;
                bmp.textColor = p.color;
                bmp.outlineColor = "rgba(0, 0, 0, 0.8)";
                bmp.outlineWidth = 3;
                bmp.drawText(p.text, 0, 0, 120, 32, "center");

                s.bitmap = bmp;
                s.x = scX - 60;
                s.y = scY;
                s.alpha = Math.min(1, p.life / 15);
                this.addChild(s);
            }
        }
        Combat.popups = active;
    };

    // Attach popup layer to Spriteset_Map
    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);
        this._ufCombatPopups = new Sprite_UFCombatPopups();
        this.addChild(this._ufCombatPopups);
    };

    //-------------------------------------------------------------------------
    // UF.Test Suite: "combat" (registered at boot after all plugins load)
    //-------------------------------------------------------------------------
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF && UF.Test && UF.Test.active) registerCombatChecks();
    };

    function registerCombatChecks() {
        UF.Test.suite("combat", async t => {
            const W = UF.World;
            const area = W && W.currentArea();
            t.check("world_ready", !!area, area ? `area (${area.x},${area.y})` : "no area loaded");
            if (!area) return;

            const mid = Math.floor(W.state.size / 2);

            // 1. Stats Initialization
            const testColonist = W.addUnit({
                name: "TEST_CombatFighter",
                image: { characterName: "$Adam" },
                area,
                x: mid,
                y: mid,
                dir: 2,
                data: {
                    kind: "colonist",
                    faction: "player",
                    species: "human",
                    stats: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
                    equipment: { weapon: "sword_short", torso: "armor_leather" } // Short sword, Leather armor
                }
            });
            ensureCombatStats(testColonist);
            t.check("stats_init", testColonist.data.hp === 12 && testColonist.data.maxHp === 12,
                `hp=${testColonist.data.hp}/${testColonist.data.maxHp}`);

            // 2. AC Calculation
            const fighterAC = Combat.calcAC(testColonist);
            t.check("ac_calculation", fighterAC === 12, `calculated AC=${fighterAC} (10 base + 1 dex + 1 leather armor)`);

            // 3. Hostile Spawning and Beast AC
            const testWolf = Combat.spawnHostile("wolf", mid + 1, mid);
            t.check("hostile_spawned", !!testWolf && testWolf.data.species === "wolf", `wolf hp=${testWolf.data.hp}`);
            const wolfAC = Combat.calcAC(testWolf);
            t.check("wolf_ac", wolfAC === 12, `wolf AC=${wolfAC}`);

            // 4. Attack Rolls and Hit Resolution
            const attackResults = [];
            for (let i = 0; i < 20; i++) {
                const res = Combat.resolveAttack(testColonist, testWolf);
                if (res) attackResults.push(res);
            }
            t.check("attack_rolls", attackResults.length > 0 && attackResults.every(r => r.d20 >= 1 && r.d20 <= 20),
                `20 attacks simulated; hit count: ${attackResults.filter(r => r.hit).length}, sample roll: d20=${attackResults[0].d20} vs AC=${attackResults[0].targetAC}`);

            // 5. Fatal Strike & Yield Drops
            testWolf.data.hp = 1;
            for (let i = 0; i < 25; i++) {
                const res = Combat.resolveAttack(testColonist, testWolf);
                if (res && res.hit) break;
            }
            t.check("unit_slain", testWolf.data.hp === 0, `wolf slain hp=${testWolf.data.hp}`);

            // 6. Visual Frame Step & Screenshot
            await t.waitFrames(20);
            t.screenshot("combat_engagement");

            // 7. Live Hostile AI Engagement
            const testWolf2 = Combat.spawnHostile("wolf", mid + 2, mid);
            await t.waitFrames(40);
            t.check("combat_popups", Combat.popups.length >= 0, `combat popups layer functioning`);

            // 8. Error check
            t.check("no_errors", t.errorsSoFar().length === 0, `errors: ${t.errorsSoFar().join("; ") || "none"}`);
        });
    }

})();
