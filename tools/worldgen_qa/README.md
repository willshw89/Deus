# WG.84.01 headless procedural-world audit

Run from the repository root:

```powershell
node tools/worldgen_qa/test_multiseed_worldgen_qa.js
node tools/check_deus_syntax.js
```

The default audit always tests the same 20 distinct pseudorandom seeds from a
xorshift32 stream with master seed `20260927`. It has no option to shorten the
roster. Every seed runs twice in separate foreground Node processes with fresh
VMs and default 256×256, Year 0, human-player, GEN5, −16…15 worlds. It builds all
32 levels through the registered generators, then rebuilds them in reverse
order. It compares every tile, object, event, shape, five-stratum material,
connector, baseline metadata and the complete saved world state. The sole
omitted baseline field is the measured generation duration `features.ms`.

`runtime.js` reads enabled entries and parameters from `game/js/plugins.js`,
loads the unmodified selected production modules in registry order, resolves
the listed Core companions, and calls their real boot aliases. The entry point
is `UF.World.newWorld(seed)`; maps come from `UF.World.buildArea(0,0,z)`.
There are no replacement world generators, fixture worlds, expected golden
hashes, or source-text acceptance assertions. The source regex constructs only
the RMMZ class host, whose unexpected execution throws.

This is a simulation host, not a full RMMZ application boot. Engine scenes,
rendering and browser I/O are excluded. Canvas and bitmap calls discard all
output; image-data buffers have length zero. No pixels, image assets, audio or
screenshots are created, read, requested or integrated. Generation still uses
the production Tiles metadata, shade-slot logic, flags and World path rules.
The exact module list and omitted gameplay systems are documented in REPORT.md.

Each child has a 45-second wall timeout, a 768 MiB V8 old-space cap and a 4 MiB
captured-output cap. The driver runs synchronously, without background jobs.
It continues through all 20 seeds after failures. `@@stage`, `@@seed`,
`@@provocation` and `@@summary` lines carry machine-readable evidence. A failing
check includes seed, stage, case ID and detail. A timed-out/crashed worker keeps
its last observed stage. Stage times and observed/OS peak memory are reported;
the heap cap is not a claim of a total RSS cap.

Settlement checks inspect actual founders/sites and generated map contents:
population and links, unique walkable founder positions, physical camp chests,
clear camp neighbors, food/water/light access, and catalog starter resources.
Food/water access is a **same-level cardinal connectivity** test; it does not
prove survival or rule out a route via another level. Surface resource counts
use the existing circular radius-20 starter-kit contract. No preferred biome or
spacing heuristic is promoted to an unconditional invariant.

The default gate also runs every control in `contracts.js`. Mutations affect
only an isolated in-memory production run. To count a control as caught, the
same seed/check/case must pass in the unmodified reference and fail under the
mutation. Existing failures elsewhere do not count as detection. Every real
baseline failure remains gating even if all controls are caught.

For review, an individual control can be run independently:

```powershell
node tools/worldgen_qa/test_multiseed_worldgen_qa.js --provoke=food_reachable
```

The ordinary gate exits 0 only when all baseline checks and controls pass;
otherwise it exits 1. A standalone negative control deliberately exits 1 when
its rejection is demonstrated, and 2 when the proof is missing or the command
is invalid. The worker itself is also directly reproducible, for diagnosis:

```powershell
node tools/worldgen_qa/seed_worker.js 288419699
```

The single-seed diagnostic/negative-control commands do not replace the
20-seed acceptance gate. Neither gate changes production files or policy.
