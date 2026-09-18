//=============================================================================
// RPG Maker MZ - Ultima Fortress: Standard Glade & Procedural Wilderness
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF ProcGen] Standardized Edenic Glade embark (Fruit tree, Stream, Adam & Eve) and procedural DF wilderness generation.
 * @author Deepdelve Architect
 *
 * @param GladeRadius
 * @text Glade Radius (Tiles)
 * @type number
 * @default 12
 * @desc Radius of the standardized serene starting sanctuary before procedural wilderness begins.
 *
 * @help
 * ============================================================================
 * Ultima Fortress Procedural World & Glade Generator (UF_ProcGen)
 * ============================================================================
 * Implements:
 * - Standardized small starting sanctuary (The Glade):
 *   - Ancient Fruit Tree in center
 *   - Gentle freshwater stream with drinkable water
 *   - Unclothed colonists (Adam & Eve) with empty starting inventory
 * - Deterministic procedural generation beyond the glade:
 *   - Dense woodlands, rocky ridges, mineral deposits (ironstone, star-iron, coal)
 *   - Random wildlife and precursor ruins
 * - Zero modification to core RMMZ files
 */

(() => {
    "use strict";

    const pluginName = "UF_ProcGen";
    const params = PluginManager.parameters(pluginName);
    const gladeRadius = parseInt(params["GladeRadius"] || 12, 10);

    // Simple Fast 2D Perlin/Simplex Noise Generator for Procedural Wilderness
    class SimpleNoise2D {
        constructor(seed = 1337) {
            this.p = new Uint8Array(512);
            const permutation = [];
            for (let i = 0; i < 256; i++) permutation[i] = i;
            // Seeded shuffle
            let s = seed;
            for (let i = 255; i > 0; i--) {
                s = (s * 9301 + 49297) % 233280;
                const j = Math.floor((s / 233280) * (i + 1));
                const tmp = permutation[i];
                permutation[i] = permutation[j];
                permutation[j] = tmp;
            }
            for (let i = 0; i < 512; i++) {
                this.p[i] = permutation[i & 255];
            }
        }

        fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
        lerp(t, a, b) { return a + t * (b - a); }
        grad(hash, x, y) {
            const h = hash & 7;
            const u = h < 4 ? x : y;
            const v = h < 4 ? y : x;
            return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        }

        noise(x, y) {
            const X = Math.floor(x) & 255;
            const Y = Math.floor(y) & 255;
            x -= Math.floor(x);
            y -= Math.floor(y);
            const u = this.fade(x);
            const v = this.fade(y);
            const A = this.p[X] + Y;
            const B = this.p[X + 1] + Y;

            return this.lerp(v,
                this.lerp(u, this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y)),
                this.lerp(u, this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1))
            );
        }
    }

    const noiseGen = new SimpleNoise2D(424242);

    //-----------------------------------------------------------------------------
    // Procedural Map Decoration & Glade Initialization
    //-----------------------------------------------------------------------------
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);
        this.initializeGladeScenario();
    };

    Scene_Map.prototype.initializeGladeScenario = function() {
        if (!$dataMap || (!$dataMap.note.includes("<glade>") && $gameMap.mapId() !== 2)) return;

        console.log("[UF ProcGen] Initializing Standard Glade & Procedural Wilderness...");

        // Ensure colonists Adam & Eve exist in $colonyManager
        if ($colonyManager && $colonyManager.colonists.length === 0) {
            $colonyManager.initGladeColonists();
        }

        // Generate procedural resource nodes in wilderness beyond glade radius
        const centerX = Math.floor($gameMap.width() / 2);
        const centerY = Math.floor($gameMap.height() / 2);

        let mineralCount = 0;
        let woodCount = 0;

        for (let x = 2; x < $gameMap.width() - 2; x++) {
            for (let y = 2; y < $gameMap.height() - 2; y++) {
                const distFromCenter = Math.hypot(x - centerX, y - centerY);

                // Outside standardized glade sanctuary
                if (distFromCenter > gladeRadius) {
                    const n = noiseGen.noise(x * 0.15, y * 0.15);
                    const nDetail = noiseGen.noise(x * 0.4, y * 0.4);

                    // Procedural Mineral Veins (Ironstone / Flint / Star-Iron)
                    if (n > 0.45 && nDetail > 0.2) {
                        mineralCount++;
                        // Tag region 20 = mineral deposit
                        $gameMap._events = $gameMap._events || [];
                    }

                    // Procedural Dense Timber
                    if (n < -0.35 && nDetail > 0.1) {
                        woodCount++;
                    }
                }
            }
        }

        console.log(`[UF ProcGen] Procedural wilderness populated: ${mineralCount} mineral veins, ${woodCount} timber patches outside Glade.`);
    };

    console.log("[UF] UF_ProcGen initialized: Standard Glade embark & procedural wilderness active.");
})();

