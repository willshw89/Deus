//=============================================================================
// DEUS_DayNight.js - Day and night: light, vision and a clock, driven by UF_Core's time
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS DayNight] Celestial day/night cycle, dynamic ambient lighting, solar shadows, underground illumination, and clock HUD.
 * @author UF project
 * @base DEUS_Core
 * @orderAfter DEUS_World
 * @orderAfter DEUS_Visuals
 *
 * @param NightVision
 * @text Sight at night
 * @type number
 * @decimals 2
 * @min 0.1
 * @max 1
 * @default 0.55
 * @desc Share of normal sight radius at midnight (UF_Fog). Dawn and dusk blend between this and 1.
 *
 * @param ShowClock
 * @text Show clock
 * @type boolean
 * @default false
 * @desc Show day and time on screen. Off by default (user, 2026-09-18); a badge still shows ">> xN" while time is sped up and "PAUSED" while it is paused (UF_TimeSpeed).
 *
 * @help
 * Time comes from UF_Core ($ufTime: 1 game minute per TimeSpeed real
 * seconds; 24 real minutes per day by default).
 *
 * On surface world maps the screen tone follows the time of day smoothly:
 * night, dawn, day, dusk. Underground layers get a constant cave tone. The
 * sight radius of your faction (UF_Fog) shrinks at night.
 *
 * This takes over the day/night tint that UF_Visuals used to apply (its
 * EnableLighting parameter is turned off in plugins.js).
 *
 * API and checks: docs/systems/UF_DayNight.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const P = (PluginManager.parameters("DEUS_DayNight") && Object.keys(PluginManager.parameters("DEUS_DayNight")).length ? PluginManager.parameters("DEUS_DayNight") : PluginManager.parameters("UF_DayNight"));
    const NIGHT_VISION = Math.max(0.1, Math.min(1, Number(P.NightVision || 0.55)));
    const SHOW_CLOCK = (P.ShowClock || "true") === "true";

    // Tone keyframes by hour: [red, green, blue, grey]. Interpolated linearly, wrapping at midnight.
    const KEYS = [
        { h: 0, tone: [-80, -75, -15, 60] },
        { h: 4.5, tone: [-80, -75, -15, 60] },
        { h: 6.0, tone: [-25, -35, -20, 25] },   // dawn: rose
        { h: 7.5, tone: [0, 0, 0, 0] },          // full day
        { h: 17.0, tone: [0, 0, 0, 0] },
        { h: 18.5, tone: [25, -15, -35, 10] },   // golden hour
        { h: 20.0, tone: [-45, -50, -10, 40] },  // twilight
        { h: 21.5, tone: [-80, -75, -15, 60] },  // night
        { h: 24, tone: [-80, -75, -15, 60] }
    ];

    const lerp = (a, b, t) => a + (b - a) * t;
    const underground = z => z === -1 || z === -2;

    const DayNight = {
        /** The displayed world level, or null outside the world. Legacy World maps are Ground. */
        viewLevel() {
            const W = window.UF && UF.World;
            if (!W || !window.$gameMap) return null;
            if (typeof W.viewLevel === "function") {
                if (W.isWorldMap && !W.isWorldMap($gameMap.mapId())) return null;
                return W.viewLevel();
            }
            const area = W.areaOfMapId ? W.areaOfMapId($gameMap.mapId()) : null;
            return area ? { x: area.x, y: area.y, z: 0 } : null;
        },
        viewZ() { const v = DayNight.viewLevel(); return v ? v.z : 0; },
        /** Hours as a decimal 0 <= h < 24. */
        hours: () => (window.$ufTime ? $ufTime.hour + $ufTime.minute / 60 : 12),
        /** Ambient tone for an hour and level; omitted z preserves the surface-clock API. */
        toneFor(h, z = 0) {
            if (underground(z)) return KEYS[0].tone.slice();
            h = ((h % 24) + 24) % 24;
            for (let i = 0; i < KEYS.length - 1; i++) {
                const a = KEYS[i], b = KEYS[i + 1];
                if (h >= a.h && h <= b.h) {
                    const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
                    return a.tone.map((v, k) => Math.round(lerp(v, b.tone[k], t)));
                }
            }
            return KEYS[0].tone.slice();
        },
        /** 0 = full night, 1 = full day. */
        daylight(h = DayNight.hours(), z = 0) {
            const tone = DayNight.toneFor(h, z);
            return Math.max(0, Math.min(1, 1 + (tone[0] + tone[1]) / 155));
        },
        phase(h = DayNight.hours(), z = 0) {
            if (underground(z)) return "night";
            if (h >= 7.5 && h < 17) return "day";
            if (h >= 17 && h < 21.5) return "dusk";
            if (h >= 4.5 && h < 7.5) return "dawn";
            return "night";
        },
        isNight: (h = DayNight.hours(), z = 0) => DayNight.phase(h, z) === "night",
        /** Multiplier for sight radius: 1 by day, NightVision at night. */
        visionFactor(h = DayNight.hours(), z = DayNight.viewZ()) {
            return NIGHT_VISION + (1 - NIGHT_VISION) * DayNight.daylight(h, z);
        },
        onWorldMap: () => !!DayNight.viewLevel()
    };
    window.DEUS = window.DEUS || {};
    window.UF = window.DEUS;
    window.UF.DayNight = DayNight;

    //-------------------------------------------------------------------------
    // Light: set the screen tone every frame on world maps (smooth, no restarting fades)

    const _Game_Screen_update = Game_Screen.prototype.update;
    Game_Screen.prototype.update = function() {
        _Game_Screen_update.call(this);
        if (!DayNight.onWorldMap() || !(SceneManager._scene instanceof Scene_Map)) return;
        this._tone = DayNight.toneFor(DayNight.hours(), DayNight.viewZ());
        this._toneTarget = this._tone.slice();
        this._toneDuration = 0;
    };

    //-------------------------------------------------------------------------
    // Sight: UF_Fog scales observer radius by visionFactor()

    if (window.UF.Fog) {
        const baseObservers = UF.Fog.observers.bind(UF.Fog);
        UF.Fog.observers = function() {
            const f = DayNight.visionFactor();
            return baseObservers().map(o => {
                if (o.scaleWithDayNight === false) return o;
                return Object.assign({}, o, { radius: Math.max(1, Math.round(o.radius * f)) });
            });
        };
    }

    //-------------------------------------------------------------------------
    // Clock (top right): "Day 3  18:40  Dusk"

    class Sprite_UFClock extends Sprite {
        constructor() {
            super(new Bitmap(300, 30));
            this.x = Graphics.width - 308;
            this.y = 6;
            this._text = "";
        }

        update() {
            super.update();
            const multiplier = window.UF.Time ? UF.Time.multiplier() : 1;
            const paused = !!(window.UF.Time && UF.Time.paused);
            // No day/time display unless ShowClock is on (user, 2026-09-18); the badge shows while sped up or paused.
            this.visible = DayNight.onWorldMap() && !!window.$ufTime && (SHOW_CLOCK || multiplier > 1 || paused);
            if (!this.visible) {
                // Hidden = shows nothing: forget the old text, so _text always says what's drawn.
                if (this._text !== "") {
                    this._text = "";
                    this.bitmap.clear();
                }
                return;
            }
            const speed = paused ? "PAUSED" : multiplier > 1 ? `>> x${multiplier}` : "";
            let text = speed;
            if (SHOW_CLOCK) {
                const hh = String($ufTime.hour).padStart(2, "0"), mm = String($ufTime.minute).padStart(2, "0");
                const where = DayNight.phase(DayNight.hours(), DayNight.viewZ()).replace(/^./, c => c.toUpperCase());
                text = `Year ${$ufTime.year}  ${$ufTime.seasonName}  ${hh}:${mm}  ${where}${speed ? "  " + speed : ""}`;
            }
            if (text === this._text) return;
            this._text = text;
            const b = this.bitmap;
            b.clear();
            b.fillRect(0, 0, b.width, b.height, "rgba(10, 14, 20, 0.6)");
            b.fontSize = 18;
            b.textColor = paused ? "#ffb4b4" : DayNight.isNight(DayNight.hours(), DayNight.viewZ()) ? "#9fb4ff" : "#ffe9a8";
            b.drawText(text, 8, 0, b.width - 16, b.height, "right");
        }
    }
    DayNight.ClockSprite = Sprite_UFClock;
    DayNight.enableGlows = false; // Glow effects disabled for the moment per user directive

    //-------------------------------------------------------------------------
    // Colored Light Glows in the Dark (Disabled for the moment per user directive)
    //-------------------------------------------------------------------------

    class Sprite_UFGlowLayer extends Sprite {
        constructor() {
            super(new Bitmap(Graphics.width, Graphics.height));
            this.blendMode = (typeof PIXI !== "undefined" && PIXI.BLEND_MODES) ? PIXI.BLEND_MODES.ADD : 1;
            this._tick = 0;
            this._lastDraw = 0;
            this.visible = false;
        }

        update() {
            super.update();
            if (!DayNight.enableGlows || !DayNight.onWorldMap() || !(SceneManager._scene instanceof Scene_Map)) {
                if (this.visible) {
                    this.visible = false;
                    this.bitmap.clear();
                }
                return;
            }
            const z = DayNight.viewZ();
            const h = DayNight.hours();
            const dark = underground(z) ? 1.0 : Math.max(0, 1.0 - DayNight.daylight(h, z));
            if (dark <= 0.05) {
                if (this.visible) {
                    this.visible = false;
                    this.bitmap.clear();
                }
                return;
            }
            this.visible = true;
            this.opacity = Math.min(255, Math.round(dark * 255));
            this._tick++;
            if (this._tick - this._lastDraw < 2) return; // Update every 2 frames for smooth performance & flame flicker
            this._lastDraw = this._tick;
            this.renderGlows(z, dark);
        }

        isBlocked(area, x, y, z) {
            if (x < 0 || y < 0) return true;
            const W = window.UF && UF.World;
            const size = (W && W.state && W.state.size) || (window.$dataMap && window.$dataMap.width) || 256;
            if (x >= size || y >= size) return true;

            // 1. Objects: Walls and closed doors
            const O = window.UF && UF.Objects;
            if (O && typeof O.atIn === "function") {
                const obj = O.atIn(area, x, y);
                if (obj) {
                    if (obj.autotile === "wall" || (Array.isArray(obj.tags) && obj.tags.includes("wall"))) {
                        return true;
                    }
                    const isDoor = (Array.isArray(obj.tags) && obj.tags.includes("door")) ||
                                   (window.UF && UF.Doors && typeof UF.Doors.isDoorType === "function" && UF.Doors.isDoorType(obj));
                    if (isDoor) {
                        const isOpen = window.UF && UF.Doors && typeof UF.Doors.isOpen === "function" && UF.Doors.isOpen(area, x, y);
                        if (!isOpen) return true;
                    }
                }
            }

            // 2. Underground solid rock
            if (z < 0) {
                const L = window.UF && UF.Levels;
                if (L && typeof L.shapeAt === "function") {
                    const s = L.shapeAt({ area, x, y, z });
                    if (s === "solid" || s === 1) return true;
                }
            }

            // 3. Peak mountain region
            if (z === 0) {
                const map = window.$dataMap;
                if (map && map.data) {
                    const idx = y * size + x;
                    if (map.data[5 * size * size + idx] === 250) return true;
                }
            }

            return false;
        }

        isInFog(x, y) {
            const Fog = window.UF && UF.Fog;
            if (!Fog || !Fog.enabled || typeof Fog.isVisible !== "function") return false;
            return !Fog.isVisible(x, y);
        }

        hasBlockingInRadius(area, cx, cy, z, tileRadius) {
            const minX = Math.floor(cx - tileRadius);
            const maxX = Math.ceil(cx + tileRadius);
            const minY = Math.floor(cy - tileRadius);
            const maxY = Math.ceil(cy + tileRadius);
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (this.isBlocked(area, x, y, z) || this.isInFog(x, y)) return true;
                }
            }
            return false;
        }

        castRay(x0, y0, dx, dy, maxDist, area, z) {
            let mapX = Math.floor(x0);
            let mapY = Math.floor(y0);
            const deltaDistX = Math.abs(1 / (dx || 1e-9));
            const deltaDistY = Math.abs(1 / (dy || 1e-9));
            let stepX, stepY, sideDistX, sideDistY;
            if (dx < 0) {
                stepX = -1;
                sideDistX = (x0 - mapX) * deltaDistX;
            } else {
                stepX = 1;
                sideDistX = (mapX + 1.0 - x0) * deltaDistX;
            }
            if (dy < 0) {
                stepY = -1;
                sideDistY = (y0 - mapY) * deltaDistY;
            } else {
                stepY = 1;
                sideDistY = (mapY + 1.0 - y0) * deltaDistY;
            }

            let dist = 0;
            while (dist < maxDist) {
                if (sideDistX < sideDistY) {
                    dist = sideDistX;
                    sideDistX += deltaDistX;
                    mapX += stepX;
                } else {
                    dist = sideDistY;
                    sideDistY += deltaDistY;
                    mapY += stepY;
                }
                if (dist >= maxDist) {
                    return { x: x0 + maxDist * dx, y: y0 + maxDist * dy };
                }
                if (this.isBlocked(area, mapX, mapY, z) || this.isInFog(mapX, mapY)) {
                    // Hit wall or fog of war: stop at surface (do not display glow in fog of war)
                    const hitDist = this.isInFog(mapX, mapY) ? dist : dist + 0.3;
                    const rawX = x0 + hitDist * dx;
                    const rawY = y0 + hitDist * dy;
                    const clampedX = Math.max(mapX + 0.05, Math.min(mapX + 0.95, rawX));
                    const clampedY = Math.max(mapY + 0.05, Math.min(mapY + 0.95, rawY));
                    return { x: clampedX, y: clampedY };
                }
            }
            return { x: x0 + maxDist * dx, y: y0 + maxDist * dy };
        }

        renderGlows(z, dark) {
            const b = this.bitmap;
            b.clear();
            const ctx = b.context;
            const W = window.UF && UF.World;
            const O = window.UF && UF.Objects;
            const Fire = window.UF && UF.Fire;
            const Levels = window.UF && UF.Levels;
            const Cam = window.UF && UF.Camera;
            if (!W || !$gameMap) return;

            const area = DayNight.viewLevel();
            const zFactor = Cam && typeof Cam.zoom === "function" ? Cam.zoom() : 1.0;
            const dx = $gameMap.displayX(), dy = $gameMap.displayY();
            const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
            const minX = Math.max(0, Math.floor(dx) - 2);
            const maxX = Math.min(W.state ? W.state.size - 1 : 255, Math.ceil(dx + (Graphics.width / (tw * zFactor))) + 2);
            const minY = Math.max(0, Math.floor(dy) - 2);
            const maxY = Math.min(W.state ? W.state.size - 1 : 255, Math.ceil(dy + (Graphics.height / (th * zFactor))) + 2);

            const lights = [];
            // 1. Objects & terrain: skip anything in fog of war
            for (let cy = minY; cy <= maxY; cy++) {
                for (let cx = minX; cx <= maxX; cx++) {
                    if (this.isInFog(cx, cy)) continue;
                    const obj = O && O.atIn ? O.atIn(area, cx, cy) : null;
                    if (obj) {
                        const tags = obj.tags || [];
                        const id = obj.id || "";
                        if (id === "campfire" || tags.includes("fire") || tags.includes("light") || id === "torch" || id === "streetlamp" || id === "lantern") {
                            lights.push({ x: cx, y: cy, color: "255, 175, 55,", radius: 100, flicker: true });
                        } else if (id === "furnace" || id === "smithy" || id === "forge" || id === "kiln") {
                            lights.push({ x: cx, y: cy, color: "255, 105, 25,", radius: 90, flicker: true });
                        } else if (id.includes("crystal") || tags.includes("gem")) {
                            lights.push({ x: cx, y: cy, color: "65, 215, 255,", radius: 80, flicker: false });
                        } else if (id.includes("mushroom") || id.includes("glow") || id.includes("moss") || id === "glow_caps" || id === "tower_cap") {
                            lights.push({ x: cx, y: cy, color: "50, 255, 160,", radius: 75, flicker: false });
                        }
                    }
                    // Liquid lava on Z = -2
                    if (z === -2 && Levels) {
                        // Checkerboard stride to prevent redundant overlapping light circles on large lava lakes
                        if (((cx + cy) & 1) === 0) {
                            const isLava = typeof Levels.isLavaAt === "function" ? Levels.isLavaAt(area.x, area.y, z, cx, cy)
                                : (Levels.waterAt && Levels.waterAt({ area, x: cx, y: cy, z }));
                            if (isLava) {
                                lights.push({ x: cx, y: cy, color: "255, 65, 15,", radius: 75, flicker: true, noShadow: true });
                            }
                        }
                    }
                    // Burning cells from UF_Fire
                    if (Fire && Fire.isBurning && Fire.isBurning(area, cx, cy)) {
                        lights.push({ x: cx, y: cy, color: "255, 125, 20,", radius: 90, flicker: true });
                    }
                }
            }

            // 2. Units with light sources: skip units in fog of war
            if (W && typeof W.unitsInArea === "function") {
                for (const u of W.unitsInArea(area.x, area.y)) {
                    if (!u || (u.z !== undefined && u.z !== z)) continue;
                    if (this.isInFog(u.x, u.y)) continue;
                    const eq = u.equipment || {};
                    const tags = (u.data && u.data.tags) || [];
                    if (eq.tool === "torch" || eq.held === "torch" || eq.light || tags.includes("light") || tags.includes("fire")) {
                        lights.push({ x: u.x, y: u.y, color: "255, 175, 55,", radius: 85, flicker: true });
                    }
                }
            }

            for (const L of lights) {
                const sx = Math.round(((L.x - dx) + 0.5) * tw * zFactor);
                const sy = Math.round(((L.y - dy) + 0.5) * th * zFactor);
                const flick = L.flicker ? (1 + 0.08 * Math.sin((this._tick + L.x * 13 + L.y * 29) * 0.25)) : 1.0;
                const rad = Math.round(L.radius * flick * zFactor);
                const maxTileDist = (L.radius * flick) / tw;

                const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
                grad.addColorStop(0, `rgba(${L.color} 0.70)`);
                grad.addColorStop(0.35, `rgba(${L.color} 0.35)`);
                grad.addColorStop(0.7, `rgba(${L.color} 0.10)`);
                grad.addColorStop(1, `rgba(${L.color} 0.0)`);
                ctx.fillStyle = grad;

                const x0 = L.x + 0.5;
                const y0 = L.y + 0.5;

                if (L.noShadow || !this.hasBlockingInRadius(area, L.x, L.y, z, maxTileDist + 0.5)) {
                    ctx.beginPath();
                    ctx.arc(sx, sy, rad, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    const RAY_COUNT = 96;
                    ctx.save();
                    ctx.beginPath();
                    for (let i = 0; i < RAY_COUNT; i++) {
                        const angle = (i * 2 * Math.PI) / RAY_COUNT;
                        const rdx = Math.cos(angle);
                        const rdy = Math.sin(angle);
                        const pt = this.castRay(x0, y0, rdx, rdy, maxTileDist, area, z);
                        const px = ((pt.x - dx) * tw * zFactor);
                        const py = ((pt.y - dy) * th * zFactor);
                        if (i === 0) {
                            ctx.moveTo(px, py);
                        } else {
                            ctx.lineTo(px, py);
                        }
                    }
                    ctx.closePath();
                    ctx.clip();

                    ctx.beginPath();
                    ctx.arc(sx, sy, rad, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
            b._baseTexture.update();
        }
    }
    DayNight.GlowLayer = Sprite_UFGlowLayer;

    const _Spriteset_Map_createUpperLayer = Spriteset_Map.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function() {
        _Spriteset_Map_createUpperLayer.call(this);
        if (!this._ufGlowLayer) {
            this._ufGlowLayer = new Sprite_UFGlowLayer();
            this.addChild(this._ufGlowLayer);
        }
    };

    const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);
        this._ufClock = new Sprite_UFClock();
        this.addChild(this._ufClock);
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "daynight"), registered at boot after all plugins load

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("daynight", async t => {
            t.check("clock_running", !!window.$ufTime, window.$ufTime ? `game time ${$ufTime.timeString}, day ${$ufTime.day}` : "UF_Core's $ufTime missing");
            if (!window.$ufTime) return;
            const noon = DayNight.toneFor(12), midnight = DayNight.toneFor(0), dusk = DayNight.toneFor(19);
            const brightness = tone => tone[0] + tone[1] + tone[2];
            t.check("tones_by_hour", noon.every(v => v === 0) && midnight[0] < -50 && midnight[3] > 30 && brightness(dusk) < 0 && brightness(dusk) > brightness(midnight),
                `noon ${JSON.stringify(noon)}, 19:00 ${JSON.stringify(dusk)}, midnight ${JSON.stringify(midnight)}`);
            let maxStep = 0;
            for (let m = 0; m < 24 * 60; m += 5) {
                const a = DayNight.toneFor(m / 60), b = DayNight.toneFor((m + 5) / 60);
                maxStep = Math.max(maxStep, ...a.map((v, k) => Math.abs(v - b[k])));
            }
            t.check("smooth_over_the_day", maxStep <= 5, `largest tone change between 5-minute steps: ${maxStep}`);
            t.check("phases", DayNight.phase(12) === "day" && DayNight.phase(19) === "dusk" && DayNight.phase(2) === "night" && DayNight.phase(6) === "dawn", "12 day, 19 dusk, 2 night, 6 dawn");
            t.check("night_vision_shorter", DayNight.visionFactor(0, 0) < DayNight.visionFactor(12, 0) && Math.abs(DayNight.visionFactor(12, 0) - 1) < 1e-9,
                `sight x${DayNight.visionFactor(12, 0).toFixed(2)} at noon, x${DayNight.visionFactor(0, 0).toFixed(2)} at midnight`);

            const undergroundHours = [0, 6, 12, 19, 23.5];
            const equalTone = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
            t.check("underground_always_night", [-1, -2].every(z => undergroundHours.every(h =>
                equalTone(DayNight.toneFor(h, z), midnight) && DayNight.phase(h, z) === "night" &&
                DayNight.daylight(h, z) === 0 && DayNight.visionFactor(h, z) === NIGHT_VISION)),
                `-1/-2 at ${undergroundHours.join(", ")} hours: midnight tone ${JSON.stringify(midnight)}, night phase and sight x${NIGHT_VISION}`);

            // Live: jump the clock and watch the screen and the fog respond.
            const saved = { h: $ufTime.hour, m: $ufTime.minute };
            const W = UF.World, L = UF.Levels, originalView = DayNight.viewLevel();
            const originalCell = { x: $gamePlayer.x, y: $gamePlayer.y };
            const originalSpeed = UF.Time ? UF.Time.level() : 0, originallyPaused = !!(UF.Time && UF.Time.paused);
            const selectLevel = async (z, center) => {
                if (!L) return z === 0;
                if (DayNight.viewZ() !== z) {
                    if (!L.setView(z, center ? { center } : {})) return false;
                    await t.waitUntil(() => DayNight.viewZ() === z && !L.switching() && !$gamePlayer.isTransferring() &&
                        SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset, 20000, `level ${z} for lighting`);
                } else if (center) $gamePlayer.locate(center.x, center.y);
                await t.waitFrames(8);
                return true;
            };
            if (UF.Time) { UF.Time.resume(); UF.Time.setLevel(0); }
            if (L && L.follow) L.follow(null);
            if (!await selectLevel(0)) { t.check("surface_setup", false, "could not show Ground"); return; }
            if (UF.Fog && UF.Fog.observers().length) $gamePlayer.locate(UF.Fog.observers()[0].x, UF.Fog.observers()[0].y);
            $ufTime.setTime(12, 0);
            await t.waitFrames(8);
            const dayTone = $gameScreen.tone().slice();
            const dayRadius = UF.Fog && UF.Fog.observers().length ? UF.Fog.observers()[0].radius : null;
            t.screenshot("noon");
            $ufTime.setTime(23, 30);
            await t.waitFrames(8);
            const nightTone = $gameScreen.tone().slice();
            const nightRadius = UF.Fog && UF.Fog.observers().length ? UF.Fog.observers()[0].radius : null;
            t.check("screen_follows_clock", dayTone.every(v => v === 0) && nightTone[0] < -50,
                `screen tone at 12:00 ${JSON.stringify(dayTone)}, at 23:30 ${JSON.stringify(nightTone)}`);
            if (dayRadius !== null) t.check("fog_sight_shrinks_at_night", nightRadius < dayRadius, `colonist sight ${dayRadius} cells at noon, ${nightRadius} at 23:30`);
            const clock = SceneManager._scene._ufClock;
            const normalSpeed = !window.UF.Time || UF.Time.multiplier() === 1;
            if (SHOW_CLOCK) t.check("clock_shown", !!clock && clock.visible && clock._text.includes("23:30"), clock ? `clock reads "${clock._text}"` : "no clock sprite");
            else t.check("no_time_display", !!clock && (!clock.visible || !normalSpeed), `clock ${clock && clock.visible ? "visible" : "hidden"} at x${window.UF.Time ? UF.Time.multiplier() : 1} (ShowClock off)`);
            if (UF.Fog) UF.Fog.refresh();
            await t.waitFrames(8);
            t.screenshot("night");

            // Wall occlusion regression check: walls must block glowing light
            const O = UF.Objects, area = DayNight.viewLevel();
            const glowLayer = SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._ufGlowLayer;
            if (O && glowLayer && glowLayer.bitmap) {
                DayNight.enableGlows = true;
                let campX = -1, campY = -1;
                const minX = Math.max(0, Math.floor($gameMap.displayX()) - 5);
                const maxX = Math.min(255, Math.ceil($gameMap.displayX() + 30));
                const minY = Math.max(0, Math.floor($gameMap.displayY()) - 5);
                const maxY = Math.min(255, Math.ceil($gameMap.displayY() + 25));
                for (let y = minY; y <= maxY && campX < 0; y++) {
                    for (let x = minX; x <= maxX; x++) {
                        const o = O.atIn(area, x, y);
                        if (o && (o.id === "campfire" || (o.tags && o.tags.includes("fire")))) {
                            campX = x; campY = y; break;
                        }
                    }
                }

                if (campX >= 0) {
                    const origEast = O.typeIdIn(area, campX + 1, campY);
                    const origBehind = O.typeIdIn(area, campX + 2, campY);
                    O.setIn(area, campX + 1, campY, "wall_stone");
                    O.setIn(area, campX + 2, campY, null);
                    if (O.refresh) O.refresh();
                    await t.waitFrames(8);

                    const bmp = glowLayer.bitmap;
                    const ctx = bmp.context;
                    const tw = $gameMap.tileWidth(), th = $gameMap.tileHeight();
                    const zF = window.UF && UF.Camera ? UF.Camera.zoom() : 1.0;
                    const dX = $gameMap.displayX(), dY = $gameMap.displayY();
                    const sxBehind = Math.round(((campX + 2 - dX) + 0.5) * tw * zF);
                    const syBehind = Math.round(((campY - dY) + 0.5) * th * zF);
                    const behindAlpha = ctx.getImageData(sxBehind, syBehind, 1, 1).data[3];
                    const sxCenter = Math.round(((campX - dX) + 0.5) * tw * zF);
                    const syCenter = Math.round(((campY - dY) + 0.5) * th * zF);
                    const centerAlpha = ctx.getImageData(sxCenter, syCenter, 1, 1).data[3];
                    const sxWest = Math.round(((campX - 1 - dX) + 0.5) * tw * zF);
                    const syWest = Math.round(((campY - dY) + 0.5) * th * zF);
                    const westAlpha = ctx.getImageData(sxWest, syWest, 1, 1).data[3];

                    t.check("wall_blocks_glowing_light", centerAlpha > 30 && westAlpha > 30 && behindAlpha === 0,
                        `center ${centerAlpha}, open west ${westAlpha}, occluded behind wall ${behindAlpha} === 0`);
                    t.screenshot("night_wall_occlusion");

                    O.setIn(area, campX + 1, campY, origEast || null);
                    O.setIn(area, campX + 2, campY, origBehind || null);
                    if (O.refresh) O.refresh();
                    await t.waitFrames(4);

                    // Regression check: objects in fog of war must not display glow
                    if (window.UF && UF.Fog && UF.Fog.enabled) {
                        const fogX = 2, fogY = 2; // far corner cell in unexplored fog
                        const origFogObj = O.typeIdIn(area, fogX, fogY);
                        O.setIn(area, fogX, fogY, "campfire");
                        if (O.refresh) O.refresh();
                        await t.waitFrames(8);

                        const inFog = !UF.Fog.isVisible(fogX, fogY);
                        const sxFog = Math.round(((fogX - dX) + 0.5) * tw * zF);
                        const syFog = Math.round(((fogY - dY) + 0.5) * th * zF);
                        const fogGlowAlpha = (sxFog >= 0 && sxFog < bmp.width && syFog >= 0 && syFog < bmp.height)
                            ? ctx.getImageData(sxFog, syFog, 1, 1).data[3]
                            : 0;
                        t.check("glow_suppressed_in_fog", inFog && fogGlowAlpha === 0,
                            `far object at (${fogX},${fogY}) inFog=${inFog}, glow layer alpha=${fogGlowAlpha} (want 0 in fog)`);

                        O.setIn(area, fogX, fogY, origFogObj || null);
                        if (O.refresh) O.refresh();
                        await t.waitFrames(4);
                    }
                }
                DayNight.enableGlows = false; // Reset to disabled
            }

            if (L && W && typeof W.viewLevel === "function") {
                for (const z of [-1, -2]) {
                    const camp = W.state.history && W.state.history.sites.find(s => s.z === z && !s.ruined);
                    const selected = await selectLevel(z, camp ? { x: camp.x, y: camp.y } : null);
                    const samples = [];
                    for (const h of undergroundHours) {
                        $ufTime.setTime(Math.floor(h), Math.round((h % 1) * 60));
                        await t.waitFrames(4);
                        samples.push($gameScreen.tone().slice());
                    }
                    $ufTime.setTime(12, 0);
                    await t.waitFrames(8);
                    t.screenshot(z === -1 ? "cave_minus1_noon" : "cave_minus2_noon");
                    t.check(z === -1 ? "minus1_screen_stays_night" : "minus2_screen_stays_night",
                        selected && W.viewLevel().z === z && DayNight.onWorldMap() && samples.every(tone => equalTone(tone, midnight)) &&
                        equalTone($gameScreen.tone(), midnight) && DayNight.visionFactor() === NIGHT_VISION,
                        `view ${JSON.stringify(W.viewLevel())}, tone samples ${JSON.stringify(samples)}, noon sight ${DayNight.visionFactor()}`);
                }
                const beforeClock = $ufTime.hour * 60 + $ufTime.minute;
                await t.waitFrames(180);
                const afterClock = $ufTime.hour * 60 + $ufTime.minute;
                t.check("underground_clock_advances", afterClock > beforeClock && equalTone($gameScreen.tone(), midnight),
                    `180 rendered frames on -2 at x1: minute ${beforeClock} -> ${afterClock}; screen ${JSON.stringify($gameScreen.tone())}`);
                $ufTime.setTime(12, 0);
                const returned = await selectLevel(0, originalCell);
                t.check("ground_restores_daylight", returned && $gameScreen.tone().every(v => v === 0) && DayNight.visionFactor() === 1,
                    `Ground at noon after -2: tone ${JSON.stringify($gameScreen.tone())}, sight ${DayNight.visionFactor()}`);
                t.screenshot("ground_after_caves");
            }
            $ufTime.setTime(saved.h, saved.m);
            if (originalView && originalView.z !== 0) await selectLevel(originalView.z, originalCell);
            if (UF.Time) { UF.Time.setLevel(originalSpeed); if (originallyPaused) UF.Time.pause(); }
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during day/night checks");
        });
    }
})();
