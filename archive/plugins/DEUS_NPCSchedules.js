//=============================================================================
// RPG Maker MZ - Ultima Fortress: Clockwork Autonomous NPC Schedules
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Schedules] 24-hour autonomous routines for fortress NPCs (workshops, tavern, dining hall, sleeping in beds).
 * @author Deepdelve Architect
 *
 * @help
 * ============================================================================
 * Ultima Fortress Schedules Plugin
 * ============================================================================
 * Allows NPCs to have authentic 24-hour schedules tied to $ufTime.
 *
 * Event Note Tags:
 * 1. Preset Occupations:
 *    <occupation: smith>
 *    <occupation: miner>
 *    <occupation: brewer>
 *    <occupation: guard>
 *
 * 2. Custom Schedule:
 *    <schedule: 6-7 eat 14,8; 7-18 work 20,12; 18-22 tavern 8,16; 22-6 sleep 4,6>
 *
 * When the world clock transitions, NPCs will smoothly pathfind to their
 * scheduled locations and adopt appropriate activity routines.
 */

(() => {
    "use strict";

    const pluginName = "DEUS_NPCSchedules";

    class UFScheduleManager {
        constructor() {
            this._schedules = new Map();
        }

        registerEvent(eventId, scheduleData) {
            this._schedules.set(eventId, scheduleData);
        }

        checkRoutines(hour, minute) {
            if (!$gameMap) return;

            for (const [eventId, sched] of this._schedules.entries()) {
                const ev = $gameMap.event(eventId);
                if (!ev || ev._erased) continue;

                const currentBlock = this.findActiveBlock(sched, hour);
                if (currentBlock && ev._ufCurrentActivity !== currentBlock.activity) {
                    ev._ufCurrentActivity = currentBlock.activity;
                    this.applyActivity(ev, currentBlock);
                }
            }
        }

        findActiveBlock(sched, hour) {
            for (const block of sched) {
                if (block.start < block.end) {
                    if (hour >= block.start && hour < block.end) return block;
                } else {
                    // Wraps around midnight (e.g. 22 to 6)
                    if (hour >= block.start || hour < block.end) return block;
                }
            }
            return null;
        }

        applyActivity(ev, block) {
            // Target coordinates
            if (block.x !== undefined && block.y !== undefined) {
                ev._ufTargetX = block.x;
                ev._ufTargetY = block.y;
                const dist = Math.hypot(ev.x - block.x, ev.y - block.y);
                if (dist > 0) {
                    ev.findPathTo(block.x, block.y);
                }
            }

            // Pose / Activity effects
            if (block.activity === "sleep") {
                ev.setStepAnime(false);
                ev.setDirection(8); // Face wall/pillow
                // V92: no status text over heads (sleep shows in the profile).
            } else if (block.activity === "work") {
                ev.setStepAnime(true);
                ev.setMoveFrequency(4);
            } else if (block.activity === "tavern") {
                ev.setStepAnime(false);
                ev.setDirection(2); // Face bar / table
            } else if (block.activity === "eat") {
                ev.setStepAnime(false);
            }
        }
    }

    window.$ufSchedules = new UFScheduleManager();

    // Simple pathfinding extension for Game_Character
    Game_Character.prototype.findPathTo = function(targetX, targetY) {
        const direction = this.findDirectionTo(targetX, targetY);
        if (direction > 0) {
            this.moveStraight(direction);
        }
    };

    const _Game_Event_update = Game_Event.prototype.update;
    Game_Event.prototype.update = function() {
        _Game_Event_update.call(this);
        if (!this.isMoving() && this._ufTargetX !== undefined && this._ufTargetY !== undefined) {
            if (this.x === this._ufTargetX && this.y === this._ufTargetY) {
                this._ufTargetX = undefined;
                this._ufTargetY = undefined;
            } else {
                if (Graphics.frameCount % 30 === (this.eventId() % 30)) {
                    this.findPathTo(this._ufTargetX, this._ufTargetY);
                }
            }
        }
    };

    // Initialize Event Schedules on Setup
    const _Game_Event_setupPage = Game_Event.prototype.setupPage;
    Game_Event.prototype.setupPage = function() {
        _Game_Event_setupPage.call(this);
        if (!this.event() || !this.event().note) return;

        const note = this.event().note;
        let scheduleBlocks = [];

        // Check occupation presets
        const occMatch = note.match(/<occupation:\s*(\w+)>/i);
        if (occMatch) {
            const occ = occMatch[1].toLowerCase();
            const homeX = this.x;
            const homeY = this.y;

            if (occ === "smith") {
                scheduleBlocks = [
                    { start: 6, end: 7, activity: "eat", x: homeX - 3, y: homeY },
                    { start: 7, end: 18, activity: "work", x: homeX, y: homeY },
                    { start: 18, end: 22, activity: "tavern", x: homeX - 4, y: homeY + 4 },
                    { start: 22, end: 6, activity: "sleep", x: homeX + 4, y: homeY }
                ];
            } else if (occ === "miner") {
                scheduleBlocks = [
                    { start: 6, end: 7, activity: "eat", x: homeX, y: homeY - 4 },
                    { start: 7, end: 18, activity: "work", x: homeX, y: homeY },
                    { start: 18, end: 22, activity: "tavern", x: homeX + 2, y: homeY - 4 },
                    { start: 22, end: 6, activity: "sleep", x: homeX + 4, y: homeY - 2 }
                ];
            } else if (occ === "guard") {
                scheduleBlocks = [
                    { start: 6, end: 18, activity: "work", x: homeX, y: homeY },
                    { start: 18, end: 22, activity: "tavern", x: homeX - 2, y: homeY + 2 },
                    { start: 22, end: 6, activity: "sleep", x: homeX, y: homeY + 5 }
                ];
            }
        }

        // Check custom schedule note
        const schedMatch = note.match(/<schedule:\s*(.+?)>/i);
        if (schedMatch) {
            scheduleBlocks = [];
            const rawParts = schedMatch[1].split(";");
            for (const part of rawParts) {
                const tokens = part.trim().split(/\s+/);
                if (tokens.length >= 3) {
                    const [range, activity, coords] = tokens;
                    const [s, e] = range.split("-").map(Number);
                    const [cx, cy] = coords.split(",").map(Number);
                    scheduleBlocks.push({ start: s, end: e, activity, x: cx, y: cy });
                }
            }
        }

        if (scheduleBlocks.length > 0) {
            $ufSchedules.registerEvent(this.eventId(), scheduleBlocks);
            if (window.$ufTime) {
                const initialBlock = $ufSchedules.findActiveBlock(scheduleBlocks, $ufTime.hour);
                if (initialBlock) {
                    this._ufCurrentActivity = initialBlock.activity;
                }
            }
        }
    };

})();
