//=============================================================================
// UF_DayNight.js - Day and night: light, vision and a clock, driven by UF_Core's time
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF DayNight] Day/night cycle on world maps: smooth light from UF_Core's clock, shorter sight at night, speed/pause badge.
 * @author UF project
 * @base UF_Core
 * @orderAfter UF_World
 * @orderAfter UF_Visuals
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

    const P = PluginManager.parameters("UF_DayNight");
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
    window.UF = window.UF || {};
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
            return baseObservers().map(o => Object.assign({}, o, { radius: Math.max(1, Math.round(o.radius * f)) }));
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
                text = `Day ${$ufTime.day}  ${hh}:${mm}  ${where}${speed ? "  " + speed : ""}`;
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
