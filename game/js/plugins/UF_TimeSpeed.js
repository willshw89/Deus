//=============================================================================
// UF_TimeSpeed.js - Speed time up (never backward), plus game-time timers
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF TimeSpeed] Run the world faster: 1x, 2x, 4x, 8x ("]" faster, "[" slower, never below 1x, no rewind). Game-time timers for AI.
 * @author UF project
 * @orderAfter UF_DayNight
 *
 * @param Speeds
 * @text Speed steps
 * @desc Comma-separated multipliers, lowest first. The lowest is normal speed (1).
 * @default 1, 2, 4, 8
 *
 * @help
 * Speed-up runs more game updates per displayed frame while on the map, so
 * everything moves on together: the clock, walking, needs, AI timers.
 * Time only ever goes forward; there's no rewind and nothing below 1x.
 *
 * Keys: "]" = faster, "[" = slower. The clock shows the speed.
 *
 * For code: use UF.Time.after(frames, fn) / UF.Time.every(frames, fn)
 * instead of setTimeout / setInterval, so behavior follows game time (and
 * the speed-up) and pauses with the map. 60 frames = 1 game minute at the
 * default UF_Core TimeSpeed.
 *
 * API and checks: docs/systems/UF_TimeSpeed.md
 * Replaced core methods: none (aliases only).
 */

(() => {
    "use strict";

    const P = PluginManager.parameters("UF_TimeSpeed");
    const SPEEDS = String(P.Speeds || "1, 2, 4, 8").split(",").map(Number).filter(n => n >= 1).sort((a, b) => a - b);
    if (SPEEDS[0] !== 1) SPEEDS.unshift(1);

    let index = 0;
    const timers = new Map(); // id -> { due, fn, every }
    let nextId = 1;
    let ticks = 0;            // map updates since boot

    const Time = {
        speeds: SPEEDS.slice(),
        multiplier: () => SPEEDS[index],
        level: () => index,
        /** Set by index (0 = normal). Can't go below normal: time never runs backward. */
        setLevel(i) {
            index = Math.max(0, Math.min(SPEEDS.length - 1, i | 0));
            if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit("time:speedChanged", SPEEDS[index]);
            return SPEEDS[index];
        },
        faster() { return this.setLevel(index + 1); },
        slower() { return this.setLevel(index - 1); },
        /** Run fn after `frames` map updates. Returns an id for cancel(). */
        after(frames, fn) {
            const id = nextId++;
            timers.set(id, { due: ticks + Math.max(1, frames | 0), fn, every: 0 });
            return id;
        },
        /** Run fn every `frames` map updates. */
        every(frames, fn) {
            const id = nextId++;
            const n = Math.max(1, frames | 0);
            timers.set(id, { due: ticks + n, fn, every: n });
            return id;
        },
        cancel: id => timers.delete(id),
        ticks: () => ticks
    };
    window.UF = window.UF || {};
    window.UF.Time = Time;

    // More game updates per displayed frame while the map is running.
    const _determineRepeatNumber = SceneManager.determineRepeatNumber;
    SceneManager.determineRepeatNumber = function(deltaTime) {
        const n = _determineRepeatNumber.call(this, deltaTime);
        const scene = this._scene;
        const running = scene instanceof Scene_Map && scene.isActive() && !$gameMessage.isBusy() && !$gamePlayer.isTransferring();
        return running ? n * SPEEDS[index] : n;
    };

    // Timers advance with the map (paused in menus and while the map isn't updating).
    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        ticks++;
        if (timers.size === 0) return;
        for (const [id, t] of Array.from(timers)) {
            if (t.due > ticks) continue;
            if (t.every) t.due += t.every;
            else timers.delete(id);
            try {
                t.fn();
            } catch (e) {
                console.error(e);
            }
        }
    };

    Input.keyMapper[221] = "ufFaster"; // ]
    Input.keyMapper[219] = "ufSlower"; // [
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (!this.isActive()) return;
        if (Input.isTriggered("ufFaster")) Time.faster();
        else if (Input.isTriggered("ufSlower")) Time.slower();
    };

    //-------------------------------------------------------------------------
    // Checks (UF_Test suite "timespeed")

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        if (window.UF.Test && UF.Test.active) registerChecks();
    };

    function registerChecks() {
        UF.Test.suite("timespeed", async t => {
            t.check("starts_normal", Time.multiplier() === 1, `speed x${Time.multiplier()}; steps ${SPEEDS.map(s => `x${s}`).join(" ")}`);
            Time.setLevel(0);
            t.check("no_slower_than_normal", Time.slower() === 1 && Time.multiplier() === 1, "slower() at x1 stays x1 (no slow motion, no rewind)");

            // Measure game updates per real second at x1 and at x4.
            const rate = async () => {
                const f0 = Graphics.frameCount, t0 = performance.now();
                await t.waitUntil(() => performance.now() - t0 >= 1500, 6000, "1.5 s of real time");
                return (Graphics.frameCount - f0) / ((performance.now() - t0) / 1000);
            };
            const base = await rate();
            Time.setLevel(SPEEDS.indexOf(4) >= 0 ? SPEEDS.indexOf(4) : SPEEDS.length - 1);
            const fast = await rate();
            const ratio = fast / base;
            t.check("speeds_up", ratio > Time.multiplier() * 0.7, `${Math.round(base)} updates/s at x1, ${Math.round(fast)} at x${Time.multiplier()} (ratio ${ratio.toFixed(2)})`);

            // Game clock runs with it.
            if (window.$ufTime) {
                const m0 = $ufTime.hour * 60 + $ufTime.minute + $ufTime.day * 1440, t0 = performance.now();
                await t.waitUntil(() => performance.now() - t0 >= 1500, 6000, "1.5 s of real time");
                const gained = $ufTime.hour * 60 + $ufTime.minute + $ufTime.day * 1440 - m0;
                t.check("clock_speeds_up", gained >= 4, `${gained} game minutes in 1.5 real seconds at x${Time.multiplier()}`);
            }

            // Game-time timers fire on schedule.
            let fired = 0;
            const f0 = Graphics.frameCount;
            Time.after(30, () => { fired = Graphics.frameCount - f0; });
            await t.waitUntil(() => fired > 0, 5000, "a 30-frame timer").catch(() => {});
            t.check("timers_follow_game_time", fired >= 30 && fired <= 32, `30-frame timer fired after ${fired} frames`);
            if (SceneManager._scene._ufClock) {
                await t.waitFrames(4);
                t.check("clock_shows_speed", SceneManager._scene._ufClock._text.includes(`x${Time.multiplier()}`), `clock reads "${SceneManager._scene._ufClock._text}"`);
            }
            Time.setLevel(0);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during time-speed checks");
        });
    }
})();
