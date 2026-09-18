//=============================================================================
// UF_TimeSpeed.js - Speed time up (never backward), pause it (Space), plus game-time timers
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [UF TimeSpeed] Run the world faster: 1x, 2x, 4x, 8x ("]" faster, "[" slower, never below 1x, no rewind). Space pauses the world; the view keeps working. Game-time timers for AI.
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
 * Pause (Space) stops the world: Game_Map.update (events, units, fog, the
 * game-time timers below) and the map timer don't run, the speed multiplier
 * doesn't apply, and UF_Core's clock stands still. The view keeps working:
 * WASD panning, the cursor, zoom, screen tone. UF_DayNight's badge reads
 * PAUSED. Space is read with a keydown listener while the map scene is up
 * and no message, event or selectable window is busy, so RMMZ's own
 * Space = "ok" mapping is untouched.
 *
 * Keys: "]" = faster, "[" = slower, Space = pause / resume.
 *
 * For code: use UF.Time.after(frames, fn) / UF.Time.every(frames, fn)
 * instead of setTimeout / setInterval, so behavior follows game time (the
 * speed-up and the pause). 60 frames = 1 game minute at the default UF_Core
 * TimeSpeed. UF.Time.paused, pause(), resume(), togglePause(); events
 * time:paused / time:resumed on UF.Events.
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
    let paused = false;       // a view state, not saved: a new or loaded game starts running
    const timers = new Map(); // id -> { due, fn, every }
    let nextId = 1;
    let ticks = 0;            // map updates since boot (doesn't advance while paused)

    const emit = (name, ...args) => {
        if (window.UF && UF.Events && UF.Events.emit) UF.Events.emit(name, ...args);
    };

    const Time = {
        speeds: SPEEDS.slice(),
        multiplier: () => SPEEDS[index],
        level: () => index,
        /** Set by index (0 = normal). Can't go below normal: time never runs backward. */
        setLevel(i) {
            index = Math.max(0, Math.min(SPEEDS.length - 1, i | 0));
            emit("time:speedChanged", SPEEDS[index]);
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
        ticks: () => ticks,

        /** True while the world stands still (Space). */
        get paused() { return paused; },
        /** Stop the world. Returns false if it was already paused (no event then). */
        pause() {
            if (paused) return false;
            paused = true;
            if (window.$ufTime) $ufTime.isPaused = true; // UF_Core's clock checks this flag itself
            emit("time:paused");
            return true;
        },
        /** Let the world run again. Returns false if it wasn't paused. */
        resume() {
            if (!paused) return false;
            paused = false;
            if (window.$ufTime) $ufTime.isPaused = false;
            emit("time:resumed");
            return true;
        },
        /** Returns the new state: true = now paused. */
        togglePause() {
            if (paused) this.resume();
            else this.pause();
            return paused;
        }
    };
    window.UF = window.UF || {};
    window.UF.Time = Time;

    // More game updates per displayed frame while the map is running (not while paused: the base count then).
    const _determineRepeatNumber = SceneManager.determineRepeatNumber;
    SceneManager.determineRepeatNumber = function(deltaTime) {
        const n = _determineRepeatNumber.call(this, deltaTime);
        const scene = this._scene;
        const running = scene instanceof Scene_Map && scene.isActive() && !paused && !$gameMessage.isBusy() && !$gamePlayer.isTransferring();
        return running ? n * SPEEDS[index] : n;
    };

    // Timers advance with the map (paused in menus, while paused, and while the map isn't updating).
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

    // Pause: the world stands still, the view keeps working. $gameMap.update drives events, units (UF_World), fog and
    // the timers above; $gameTimer is the map timer: both are skipped. $gamePlayer is the view/cursor and $gameScreen
    // carries tone, shake and flash, so both keep updating. (The overseer's WASD pan writes the display position from
    // Scene_Map.update, which still runs.)
    const _Scene_Map_updateMain = Scene_Map.prototype.updateMain;
    Scene_Map.prototype.updateMain = function() {
        if (!paused) {
            _Scene_Map_updateMain.call(this);
            return;
        }
        $gamePlayer.update(this.isPlayerActive());
        $gameScreen.update();
    };

    // A new or loaded game starts running: pause is a view state, not part of the save.
    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        Time.resume();
    };

    //-------------------------------------------------------------------------
    // Keys

    Input.keyMapper[221] = "ufFaster"; // ]
    Input.keyMapper[219] = "ufSlower"; // [
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (!this.isActive()) return;
        if (Input.isTriggered("ufFaster")) Time.faster();
        else if (Input.isTriggered("ufSlower")) Time.slower();
    };

    // Space = pause, read straight from the document so RMMZ's Space = "ok" mapping stays as it is. While a message,
    // an event or a selectable window (a gump, a choice list) is busy, Space belongs to them and doesn't toggle.
    const busyWindowIn = (node, depth = 0) => {
        if (!node || !node.children || depth > 3) return false;
        for (const child of node.children) {
            if (child instanceof Window_Selectable && child.active && child.visible && child.isOpen()) return true;
            if (busyWindowIn(child, depth + 1)) return true;
        }
        return false;
    };
    const canTogglePause = () => {
        const scene = SceneManager._scene;
        if (!(scene instanceof Scene_Map) || !scene.isActive() || scene.isBusy() || SceneManager.isSceneChanging()) return false;
        if ($gameMessage.isBusy() || $gameMap.isEventRunning()) return false;
        return !busyWindowIn(scene);
    };
    document.addEventListener("keydown", e => {
        if (e.code !== "Space" || e.repeat) return;
        if (canTogglePause()) Time.togglePause();
    });

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

            //-- Pause (WORLD_ARCHITECTURE §5.11)
            Time.resume();
            const seen = { paused: 0, resumed: 0 };
            const onPaused = () => seen.paused++, onResumed = () => seen.resumed++;
            UF.Events.on("time:paused", onPaused);
            UF.Events.on("time:resumed", onResumed);
            const clockMinute = () => (window.$ufTime ? $ufTime.day * 1440 + $ufTime.hour * 60 + $ufTime.minute : 0);

            // Look at the middle of the area and start a walker there. It walks through objects (through: true): this
            // measures the pause, not passability.
            const area = UF.World && UF.World.state ? UF.World.currentArea() : null;
            const mid = area ? Math.floor(UF.World.state.size / 2) : 0;
            const wx = mid - 5, wy = mid + 2;
            let walker = null, walkerEvent = null;
            if (area) {
                $gamePlayer.locate(mid, mid);
                walker = UF.World.addUnit({ name: "TEST_pause_walker", image: { characterName: "$U7_Townsman", characterIndex: 0 }, area, x: wx, y: wy, dir: 6, data: { kind: "test", through: true } });
                UF.World.sendUnit(walker.id, { area, x: wx + 10, y: wy });
                await t.waitUntil(() => { const e = UF.World.eventOf(walker.id); return !!e && e._realX !== wx; }, 3000, "the walker to start walking").catch(() => {});
                walkerEvent = UF.World.eventOf(walker.id);
            }
            const snap = () => ({ ticks: Time.ticks(), minute: clockMinute(), rx: walkerEvent ? walkerEvent._realX : 0, ry: walkerEvent ? walkerEvent._realY : 0, frame: Graphics.frameCount });
            const at = s => `(${s.rx.toFixed(2)},${s.ry.toFixed(2)})`;

            Time.pause();
            const p0 = snap();
            await t.waitFrames(70);
            const p1 = snap();
            t.check("pause_stops_world", Time.paused && !!window.$ufTime && $ufTime.isPaused === true && p1.ticks === p0.ticks && p1.minute === p0.minute && p1.rx === p0.rx && p1.ry === p0.ry && !!walker && !!walker.goal,
                `${p1.frame - p0.frame} frames while paused: UF.Time.ticks ${p0.ticks} -> ${p1.ticks}, clock minute ${p0.minute} -> ${p1.minute}, walker ${walker ? `(goal ${walker.goal ? "set" : "none"}) at ${at(p0)} -> ${at(p1)}` : "missing (no UF.World)"}; $ufTime.isPaused ${window.$ufTime ? $ufTime.isPaused : "n/a"}`);

            const clock = SceneManager._scene._ufClock;
            await t.waitFrames(3);
            t.check("badge_shows_paused", !!clock && clock.visible && /PAUSED/.test(clock._text) && !/>> x/.test(clock._text),
                clock ? `badge ${clock.visible ? "visible" : "hidden"}, reads "${clock._text}"` : "no UF_DayNight clock sprite");
            t.screenshot("paused");

            // The multiplier doesn't apply while paused.
            const fastIndex = SPEEDS.indexOf(4) >= 0 ? SPEEDS.indexOf(4) : SPEEDS.length - 1;
            Time.setLevel(fastIndex);
            const pf0 = Graphics.frameCount, pt0 = performance.now();
            await t.waitUntil(() => performance.now() - pt0 >= 700, 6000, "0.7 s of real time");
            const pausedRate = (Graphics.frameCount - pf0) / ((performance.now() - pt0) / 1000);
            Time.setLevel(0);
            t.check("no_speedup_while_paused", pausedRate < base * 2, `${Math.round(pausedRate)} updates/s at speed x${SPEEDS[fastIndex]} while paused (${Math.round(base)} at x1 running; about ${Math.round(base * SPEEDS[fastIndex])} if the multiplier applied)`);

            // The view keeps working: the overseer's WASD pan and the cursor's own steps.
            const dx0 = $gameMap.displayX();
            Input._currentState.cameraRight = true; // the overseer's D key (Input.keyMapper[68])
            await t.waitFrames(20);
            Input._currentState.cameraRight = false;
            const dx1 = $gameMap.displayX();
            const cx0 = $gamePlayer.x;
            $gamePlayer.moveStraight(6);
            await t.waitUntil(() => !$gamePlayer.isMoving(), 3000, "the view cell to finish a step").catch(() => {});
            const stillPaused = Time.paused && Time.ticks() === p1.ticks;
            t.check("view_moves_while_paused", stillPaused && dx1 > dx0 && $gamePlayer.x === cx0 + 1,
                `display x ${dx0.toFixed(2)} -> ${dx1.toFixed(2)} over 20 frames of simulated D (Input._currentState.cameraRight); view cell ${cx0} -> ${$gamePlayer.x} after moveStraight(6); ticks ${Time.ticks()} (${stillPaused ? "still paused" : "NOT paused any more"})`);

            Time.resume();
            const r0 = snap();
            const walked = () => (walkerEvent ? Math.abs(walkerEvent._realX - p1.rx) : 0);
            await t.waitUntil(() => Time.ticks() - r0.ticks >= 60 && clockMinute() !== r0.minute && (!walker || walked() >= 3), 10000, "ticks, the clock and the walker to move on after resume").catch(() => {});
            const r1 = snap();
            t.check("resume_continues", !Time.paused && !!window.$ufTime && $ufTime.isPaused === false && r1.ticks - r0.ticks >= 60 && r1.minute !== r0.minute && !!walker && walked() >= 3 && seen.paused >= 1 && seen.resumed >= 1,
                `after resume: ${r1.ticks - r0.ticks} ticks in ${r1.frame - r0.frame} frames, clock minute ${r0.minute} -> ${r1.minute}, walker ${walked().toFixed(2)} cells east of where it froze; events time:paused x${seen.paused}, time:resumed x${seen.resumed}`);
            await t.waitFrames(3);
            t.check("badge_clears_on_resume", !!clock && !/PAUSED/.test(clock._text) && (!clock.visible || clock._text !== ""),
                clock ? `badge ${clock.visible ? "visible" : "hidden"}, reads "${clock._text}" at x${Time.multiplier()}` : "no UF_DayNight clock sprite");

            // Space toggles through the document listener; a key repeat doesn't; RMMZ's Space = "ok" is untouched.
            const press = init => {
                const e = new KeyboardEvent("keydown", Object.assign({ code: "Space", key: " ", keyCode: 32, bubbles: true, cancelable: true }, init || {}));
                document.dispatchEvent(e);
                return e;
            };
            const e1 = press();
            const afterPress = Time.paused;
            const okSeen = !!Input._currentState.ok; // RMMZ's own listener maps keyCode 32 to "ok" (informational: synthetic events may carry keyCode 0)
            press({ repeat: true });
            const afterRepeat = Time.paused;
            press();
            const afterSecond = Time.paused;
            Input._currentState.ok = false;
            t.check("space_toggles", afterPress === true && afterRepeat === true && afterSecond === false && Input.keyMapper[32] === "ok" && !e1.defaultPrevented,
                `keydown code "Space" on document: paused ${afterPress}; after a key-repeat keydown ${afterRepeat}; after a second press ${afterSecond}. Input.keyMapper[32] is "${Input.keyMapper[32]}", defaultPrevented ${e1.defaultPrevented}, RMMZ saw "ok" pressed: ${okSeen}`);

            $gameMessage.add("TEST_message"); // a message is pending: Space belongs to it
            press();
            const pausedWhileBusy = Time.paused;
            $gameMessage.clear();
            t.check("space_ignored_while_busy", pausedWhileBusy === false, `with $gameMessage busy, a Space keydown left paused = ${pausedWhileBusy}`);

            Time.resume();
            UF.Events.off("time:paused", onPaused);
            UF.Events.off("time:resumed", onResumed);
            if (walker) UF.World.removeUnit(walker.id);
            Time.setLevel(0);
            await t.waitFrames(5);
            t.check("no_errors", t.errorsSoFar().length === 0,
                t.errorsSoFar().length ? `${t.errorsSoFar().length} error(s), first: ${t.errorsSoFar()[0]}` : "none during time-speed checks");
        });
    }
})();
