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
 * @desc Show day and time on screen. Off by default (user, 2026-09-18); a ">> xN" badge still shows while time is sped up.
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

    const DayNight = {
        /** Hours as a decimal 0 <= h < 24. */
        hours: () => (window.$ufTime ? $ufTime.hour + $ufTime.minute / 60 : 12),
        /** Tone for an hour. */
        toneFor(h) {
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
        daylight(h = DayNight.hours()) {
            const tone = DayNight.toneFor(h);
            return Math.max(0, Math.min(1, 1 + (tone[0] + tone[1]) / 155));
        },
        phase(h = DayNight.hours()) {
            if (h >= 7.5 && h < 17) return "day";
            if (h >= 17 && h < 21.5) return "dusk";
            if (h >= 4.5 && h < 7.5) return "dawn";
            return "night";
        },
        isNight: (h = DayNight.hours()) => DayNight.phase(h) === "night",
        /** Multiplier for sight radius: 1 by day, NightVision at night. */
        visionFactor(h = DayNight.hours()) {
            return NIGHT_VISION + (1 - NIGHT_VISION) * DayNight.daylight(h);
        },
        onWorldMap: () => !!(window.UF && UF.World && UF.World.currentArea && UF.World.currentArea())
    };
    window.UF = window.UF || {};
    window.UF.DayNight = DayNight;

    //-------------------------------------------------------------------------
    // Light: set the screen tone every frame on world maps (smooth, no restarting fades)

    const _Game_Screen_update = Game_Screen.prototype.update;
    Game_Screen.prototype.update = function() {
        _Game_Screen_update.call(this);
        if (!DayNight.onWorldMap() || !(SceneManager._scene instanceof Scene_Map)) return;
        this._tone = DayNight.toneFor(DayNight.hours());
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
            // No day/time display unless ShowClock is on (user, 2026-09-18); the speed badge shows while sped up.
            this.visible = DayNight.onWorldMap() && !!window.$ufTime && (SHOW_CLOCK || multiplier > 1);
            if (!this.visible) return;
            const speed = multiplier > 1 ? `>> x${multiplier}` : "";
            let text = speed;
            if (SHOW_CLOCK) {
                const hh = String($ufTime.hour).padStart(2, "0"), mm = String($ufTime.minute).padStart(2, "0");
                const where = DayNight.phase().replace(/^./, c => c.toUpperCase());
                text = `Day ${$ufTime.day}  ${hh}:${mm}  ${where}${speed ? "  " + speed : ""}`;
            }
            if (text === this._text) return;
            this._text = text;
            const b = this.bitmap;
            b.clear();
            b.fillRect(0, 0, b.width, b.height, "rgba(10, 14, 20, 0.6)");
            b.fontSize = 18;
            b.textColor = DayNight.phase() === "night" ? "#9fb4ff" : "#ffe9a8";
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

            // Live: jump the clock and watch the screen and the fog respond.
            const saved = { h: $ufTime.hour, m: $ufTime.minute };
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
            $ufTime.setTime(saved.h, saved.m);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during day/night checks");
        });
    }
})();
