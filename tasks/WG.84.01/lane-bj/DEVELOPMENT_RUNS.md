# WG.84.01 additional diagnostic commands — 2026-09-27

The acceptance evidence is the full gate and every integrated control in REPORT.md. These preliminary commands helped inspect or harden the harness; their results do not replace that gate.

## Seed 424242 pilot

```powershell
$auditClock = [Diagnostics.Stopwatch]::StartNew()
node tools/worldgen_qa/seed_worker.js 424242 2>&1 | Tee-Object -FilePath tasks/WG.84.01/lane-bj/pilot_424242.log
$auditExit = $LASTEXITCODE
$auditClock.Stop()
"EXIT=$auditExit ELAPSED_MS=$($auditClock.Elapsed.TotalMilliseconds)" | Tee-Object -FilePath tasks/WG.84.01/lane-bj/pilot_424242.log -Append
exit $auditExit
```

Observed exit 1, shell stopwatch 27,615.3979 ms. This early pilot predates final fingerprint hardening and individual food/water/kit case IDs. It identified viability failures; it is not a second acceptance roster.

## First roster seed, two cold workers

```powershell
$auditClock = [Diagnostics.Stopwatch]::StartNew()
node -e 'const q=require("./tools/worldgen_qa/test_multiseed_worldgen_qa"); const s=require("./tools/worldgen_qa/contracts").SEEDS[0]; const a=q.execute(s); console.log("FIRST",a.exit,a.elapsedMs,JSON.stringify(a.checks.filter(c=>!c.pass))); const b=q.execute(s); console.log("SECOND",b.exit,b.elapsedMs,JSON.stringify(b.checks.filter(c=>!c.pass))); const comparison=q.compare(a,b); console.log("COMPARE",JSON.stringify(comparison)); process.exitCode=a.checks.concat(b.checks,comparison).some(c=>!c.pass)?1:0;' 2>&1 | Tee-Object -FilePath tasks/WG.84.01/lane-bj/pilot_cold_pair.log
$auditExit = $LASTEXITCODE
$auditClock.Stop()
"EXIT=$auditExit ELAPSED_MS=$($auditClock.Elapsed.TotalMilliseconds)" | Tee-Object -FilePath tasks/WG.84.01/lane-bj/pilot_cold_pair.log -Append
exit $auditExit
```

Observed exit 0, shell stopwatch 56,436.7792 ms. The two workers exited 0 in 28,320.324 and 28,036.483 ms; all 32 layers and saved state agreed.

## Fingerprint discrimination

```powershell
node -e 'const {fingerprint}=require("./tools/worldgen_qa/fingerprint"); const a=fingerprint(["a;string:b","c"]), b=fingerprint(["a","b;string:c"]); if(a===b) throw Error("structural hash collision"); const m=fingerprint(new Map([[1,2]])), n=fingerprint(new Map([[1,3]])); if(m===n) throw Error("map ignored"); console.log("fingerprint discrimination passed");'
$hashExit = $LASTEXITCODE
"EXIT=$hashExit"
exit $hashExit
```

Observed `fingerprint discrimination passed`, exit 0. The command tool measured 97.2236 ms wall time; no separate shell stopwatch was used for this small probe. The final cold-replay/stability controls then exercised the fingerprint on real generated worlds.

## Earlier bootstrap exploration

Before the formal worker existed, two read-only `node -e` bootstrap probes loaded `runtime.js` and called the real `World.newWorld(424242)`. The first printed loaded stages, world/history keys, unit count, registered generators, errors and warning examples; observed exit 0, command-tool wall time 7,856.3789 ms, NewWorld measurement 7,689.5187 ms. The second additionally built all 32 levels and printed their elapsed times, baseline keys, actual materialization/site/kit data and process memory; observed exit 0, measured layer-building phase 3,289.4337 ms. Its whole-command wall duration was not captured. They are exploratory context, not accepted performance evidence. Exact command bodies:

```powershell
node -e 'const r=require("./tools/worldgen_qa/runtime").createRuntime(console.log); r.env.UF.NewGameSetup={year:0,seed:424242,faction:"human"}; const t=performance.now(); const w=r.env.UF.World.newWorld(424242); console.log(JSON.stringify({ms:performance.now()-t,keys:Object.keys(w),history:Object.keys(w.history||{}),units:Object.keys(w.units).length,generators:r.env.UF.World.generators(),errors:r.errors,warnings:r.warnings.slice(0,3)},null,2));'
```

```powershell
node -e 'const r=require("./tools/worldgen_qa/runtime").createRuntime(); r.env.UF.NewGameSetup={year:0,seed:424242,faction:"human"}; const w=r.env.UF.World.newWorld(424242); const t=performance.now(); const times=[]; for(const z of r.env.UF.World.levels()) {const a=performance.now(); const m=r.env.UF.World.buildArea(0,0,z); const b=r.env.UF.Levels.baseline(z); times.push([z,Math.round(performance.now()-a)]); if(z===0) console.log("base",Object.keys(b),"materialization",w.history.materialization,"site",w.history.sites[0],"kit",r.env.UF.WorldGen.kitConfig());} console.log(JSON.stringify({ms:performance.now()-t,times,errors:r.errors,founders:Object.values(w.units).filter(u=>u.data.historicalFounder).length,memory:process.memoryUsage()},null,2));'
```
