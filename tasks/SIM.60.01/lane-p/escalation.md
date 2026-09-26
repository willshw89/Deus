# Escalation: SIM.60.01 lane-p, 2026-09-26

**Rule:** BRIEF standing rule 6 ("two sources that disagree in a way the brief does not settle").
**Status:** Open. The writer has not resolved it. It is listed as Owner question Q2 in `docs/audits/SRD_SPELL_EFFECT_AUDIT.md` §6.

## What the brief asks
Deliverable 2 asks for a schema that maps "duration -> lifetime ticks". That mapping needs the number of game seconds per simulation tick for spell effects. The sources give four different answers.

## The sources

| # | Source | What it says | A 1-minute SRD spell (10 rounds) lasts |
|---|---|---|---|
| 1 | SRD 5.1 (quoted in `game/data/srd51/spells.json`) | 1 round = 6 seconds; durations are written in rounds, minutes and hours | 60 game seconds |
| 2 | `game/js/plugins/DEUS_Core.js:59-61` (code on `main`) | "1 real minute = 1 season (6h)"; "1/6 real seconds per game minute" | 1/6 of a real second at 1x |
| 3 | `docs/adr/ADR-003_sim_render_split_and_lod.md` Rev 2 §3.2 (PROPOSED, `c456cb73` on `task/lane-m`; Rev 3 is being written) | 10 Hz tick; "One tick is **36 game-seconds**" (matches #2) | 1.67 ticks, also 1/6 of a real second at 1x |
| 4 | `docs/VISION.md:55` V46 and `:112` V101 | "1 beat per second at normal speed"; "The beat is 1 second (60 map updates at x1, one game minute)"; one clock for the whole game. The 2026-09-18 log entry says "1 game hour per real minute" | 1 beat (1 real second) |
| 5 | `docs/SRD5_1_INTEGRATION.md:66` | "1 tactical combat round ≈ 6 Action Seconds. Resting and combat durations use domain-tagged Action timers, immune to accelerated historical clock compression." | 60 action seconds, on a separate action clock |

Sources 2-3 and 4 disagree about the world clock (6 game hours versus 1 game hour per real minute). Source 5 proposes a separate action clock, which V101 ("one clock for the whole game") appears to rule out. Under 2-3, most SRD durations (a 1-minute Wall of Fire, a 10-minute Fog Cloud) end within a few real seconds.

## What the writer did
- Did not choose a rate.
- In the schema proposal, durations are stored as SRD seconds (1 round = 6 s) with a `timeDomain` tag (`action` or `historical`). Conversion is `ticks = ceil(seconds / secondsPerTick[timeDomain])`, where `secondsPerTick` is a named parameter left open.
- Continued the audit, because the classification and the schema do not depend on the value. Only the tick counts in SIM.60.03 do.

## Needed
An Owner ruling (with the ADR-003 Rev 3 writer, Lane M) on how many game seconds a tick represents for action-domain spell durations, and whether spell combat runs on a separate action clock. This is Owner question Q2 in the audit doc.
