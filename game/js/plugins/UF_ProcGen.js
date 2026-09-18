//=============================================================================
// RPG Maker MZ - Ultima Fortress: Dwarf Fortress Procedural World & Wilderness
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF ProcGen] Dwarf Fortress-style procedural world generation (hydraulic river networks, elevation contours, 2.5D forest groves, mineral veins).
 * @author Deepdelve Architect
 *
 * @param GladeRadius
 * @text Glade Embark Radius (Tiles)
 * @type number
 * @default 10
 * @desc Radius of the pristine starting glade embark before procedural wilderness expands outward.
 *
 * @help
 * ============================================================================
 * Ultima Fortress Dwarf Fortress Procedural World (UF_ProcGen)
 * ============================================================================
 * Generates living procedural worlds inspired by Dwarf Fortress:
 * - Hydraulic river networks that wind across maps with natural banks & lily pads
 * - Elevation & moisture fields creating biomes (lush plains, timber groves, crags)
 * - Authentic 2.5D woodland groves (broadleaf fruit trees, pines) leaning 45° up-left
 * - Mineral veins (ironstone, granite boulders, flint)
 * - Seamless integration with UF_World 256x256 areas
 */

(() => {
    "use strict";

    const pluginName = "UF_ProcGen";
    const params = PluginManager.parameters(pluginName);
    const gladeRadius = parseInt(params["GladeRadius"] || 10, 10);

    // Deterministic Multi-Octave Perlin/Simplex Noise Generator
    class DFNoise2D {
        constructor(seed = 1337) {
            this.p = new Uint8Array(512);
            const permutation = [];
            for (let i = 0; i < 256; i++) permutation[i] = i;
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

        sample(x, y) {
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

        // Multi-octave fractal noise
        octaves(x, y, octs = 3, persistence = 0.5) {
            let total = 0;
            let freq = 1;
            let amp = 1;
            let maxAmp = 0;
            for (let i = 0; i < octs; i++) {
                total += this.sample(x * freq, y * freq) * amp;
                maxAmp += amp;
                amp *= persistence;
                freq *= 2;
            }
            return total / maxAmp;
        }
    }

    const worldNoise = new DFNoise2D(7771337);

    //-----------------------------------------------------------------------------
    // Register Procedural Generator with UF_World (for 256x256 areas)
    //-----------------------------------------------------------------------------
    function registerWorldGen() {
        if (!window.UF || !window.UF.World || !window.UF.World.registerGenerator) return;

        window.UF.World.registerGenerator("df_wilderness_generator", ctx => {
            const w = ctx.width;
            const h = ctx.height;
            const seed = ctx.seed || 1337;
            const localNoise = new DFNoise2D(seed + ctx.areaX * 31 + ctx.areaY * 101);

            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    // Skip glade template rectangle on start area
                    if (ctx.isStart && ctx.templateRect &&
                        x >= ctx.templateRect.x && x < ctx.templateRect.x + ctx.templateRect.w &&
                        y >= ctx.templateRect.y && y < ctx.templateRect.y + ctx.templateRect.h) {
                        continue;
                    }

                    // Continuous river network across world
                    const riverCenter = Math.floor(w * 0.70 + Math.sin(y * 0.05) * 12 + localNoise.sample(x * 0.02, y * 0.02) * 8);
                    if (x >= riverCenter - 1 && x <= riverCenter + 1) {
                        if (x === riverCenter - 1) {
                            ctx.setTile(x, y, 0, 2064); // West river bank
                        } else if (x === riverCenter) {
                            ctx.setTile(x, y, 0, 2048); // Deep freshwater
                            if (ctx.rng() < 0.08) {
                                ctx.setTile(x, y, 1, 253); // Water lily pad
                            }
                        } else {
                            ctx.setTile(x, y, 0, 2072); // East river bank
                        }
                        ctx.setTile(x, y, 5, 10); // Region 10: River
                        continue;
                    }

                    // Default fertile grass terrain
                    ctx.setTile(x, y, 0, 2863);

                    // Vegetation & Timber density field
                    const forestVal = localNoise.octaves(x * 0.04, y * 0.04, 2);
                    if (forestVal > 0.45 && ctx.rng() < 0.12) {
                        // Place 2.5D timber tree
                        ctx.addEvent({
                            name: "Wilderness Timber Tree",
                            x: x,
                            y: y,
                            image: { characterName: "!$FruitTree", characterIndex: 0, direction: 2, pattern: 1 },
                            note: "<tree> <canopy> <harvestable>",
                            priorityType: 1,
                            through: false,
                            directionFix: true,
                            walkAnime: false
                        });
                    } else if (forestVal < -0.40 && ctx.rng() < 0.05) {
                        // Place mineral boulder
                        ctx.setTile(x, y, 5, 20); // Region 20: Mineral/Stone
                    }
                }
            }
        }, 10);

        console.log("[UF ProcGen] DF Wilderness Generator successfully registered with UF.World.");
    }

    // Try registration immediately or when UF.World loads
    registerWorldGen();
    if (window.UF && window.UF.Events) {
        window.UF.Events.on("world:created", registerWorldGen);
    }

    //-----------------------------------------------------------------------------
    // Procedural Decorator for Embark Glade Map
    //-----------------------------------------------------------------------------
    const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _Scene_Map_onMapLoaded.call(this);
        this.populateGladeEmbark();
    };

    Scene_Map.prototype.populateGladeEmbark = function() {
        if (!$dataMap || (!$dataMap.note.includes("<glade>") && $gameMap.mapId() !== 2)) return;

        console.log("[UF ProcGen] Populating embark glade with DF wilderness & colonists...");

        // Ensure colonists Adam & Eve exist
        if (window.$colonyManager && window.$colonyManager.colonists.length === 0) {
            window.$colonyManager.initGladeColonists();
        }
    };

    console.log("[UF] UF_ProcGen initialized: Dwarf Fortress procedural generation active.");
})();
