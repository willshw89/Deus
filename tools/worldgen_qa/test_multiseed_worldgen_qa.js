#!/usr/bin/env node
"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const { performance } = require("perf_hooks");
const { isDeepStrictEqual } = require("util");
const { MASTER_SEED, SEEDS, LEVELS, MUTANTS } = require("./contracts");

const WORKER = path.join(__dirname, "seed_worker.js");
const TIMEOUT_MS = 45000;
const MAX_BUFFER = 4 * 1024 * 1024;
const PREFIX = "@@result ";

function rosterCheck(seeds) {
    return { name: "seed_roster", seed: null, stage: "roster",
        pass: seeds.length === 20 && new Set(seeds).size === 20
            && seeds.every(n => Number.isInteger(n) && n >= 0 && n <= 0x7fffffff), detail: seeds };
}

function execute(seed, mutant = "") {
    const start = performance.now();
    // Synchronous child process: foreground, serial, private heap; timeout can stop
    // a synchronous infinite loop that cannot service a JS timer. No detached jobs.
    const child = spawnSync(process.execPath, ["--max-old-space-size=768", WORKER, String(seed), mutant], {
        encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true,
        env: { ...process.env, NODE_OPTIONS: "", UF_TEST_PROVOKE: "", DEUS_Z_RANGE: "" }
    });
    const elapsedMs = +(performance.now() - start).toFixed(3);
    const lines = (child.stdout || "").split(/\r?\n/);
    const markers = lines.filter(s => s.startsWith("@@stage "));
    let stage = "process_start";
    if (markers.length) {
        try { stage = JSON.parse(markers[markers.length - 1].slice(8)).stage; } catch (_) { stage = "invalid_stage_record"; }
    }
    let result;
    const records = lines.filter(s => s.startsWith(PREFIX));
    if (records.length === 1) {
        try { result = JSON.parse(records[0].slice(PREFIX.length)); } catch (_) { /* failed handshake below */ }
    }
    const timedOut = !!child.error && child.error.code === "ETIMEDOUT";
    const processChecks = [
        { name: "bounded_runtime", seed, stage, pass: !timedOut && elapsedMs <= TIMEOUT_MS,
            detail: { elapsedMs, timeoutMs: TIMEOUT_MS, error: child.error && child.error.message } },
        { name: "worker_protocol", seed, stage, pass: !!result && result.seed === seed && result.mutant === mutant
            && Array.isArray(result.checks) && result.checks.length > 0 && records.length === 1
            && child.status === (result.checks.some(c => !c.pass) ? 1 : 0) && !child.error
            && !(child.stderr || "").trim(),
            detail: { exit: child.status, signal: child.signal, stderr: child.stderr || "", error: child.error && child.error.message } }
    ];
    return { seed, mutant, result, exit: child.status, elapsedMs,
        checks: [...(result ? result.checks : []), ...processChecks] };
}

function compare(first, second) {
    const a = first.result, b = second.result;
    const changedLayers = LEVELS.filter(z => !a || !b || !a.hashes || !b.hashes || a.hashes[z] !== b.hashes[z]);
    const keys = new Set([...Object.keys(a && a.stateHashes || {}), ...Object.keys(b && b.stateHashes || {})]);
    const changedState = [...keys].filter(k => !a || !b || (a.stateHashes || {})[k] !== (b.stateHashes || {})[k]);
    return { name: "reproducibility", seed: first.seed, stage: "cold_replay",
        pass: !!a && !!b && !!a.hashes && !!b.hashes && Object.keys(a.hashes).length === 32
            && Object.keys(b.hashes).length === 32 && changedLayers.length === 0 && changedState.length === 0
            && [a, b].every(r => r.stateHashes && ["seed", "zRange", "units", "factions", "history", "levels",
                "naturalConnections", "ecology"].every(k => /^[0-9a-f]{64}$/.test(r.stateHashes[k])))
            && isDeepStrictEqual(a.plugins, b.plugins), detail: { changedLayers, changedState } };
}

function printFailures(checks) {
    for (const c of checks.filter(c => !c.pass)) {
        console.log(`FAIL seed=${c.seed} stage=${c.stage} check=${c.name} ${JSON.stringify(c.detail)}`);
    }
}

function control(name, reference) {
    const target = MUTANTS[name];
    if (name === "seed_count") {
        const bad = rosterCheck(SEEDS.slice(1));
        printFailures([bad]);
        return { name, target, caught: !bad.pass, exit: null, mode: "in-process roster rejection", elapsedMs: 0, failures: [bad] };
    }
    const run = execute(SEEDS[0], name);
    if (name === "reproducibility") run.checks.push(compare(reference, run));
    const failures = run.checks.filter(c => !c.pass);
    printFailures(failures);
    // Existing production failures cannot kill an unrelated mutant. The target
    // must pass in the unmodified reference and fail in the provoked run.
    const referenceChecks = name === "reproducibility" ? [{ name: target, pass: reference.coldReplayPassed === true }]
        : reference.checks.filter(c => c.name === target);
    const caseKey = c => `${c.name}:${c.caseId || "aggregate"}`;
    const passingCases = new Set(referenceChecks.filter(c => c.pass).map(caseKey));
    const newlyFailed = failures.filter(c => c.name === target && passingCases.has(caseKey(c)));
    const targetWasPassing = passingCases.size > 0;
    const caught = targetWasPassing && newlyFailed.length > 0
        && (name === "timeout" ? failures.some(c => c.stage === "build:z=-16")
            : name === "worker_protocol" ? run.exit === 0 : name === "reproducibility" || run.exit === 1);
    return { name, target, caught, targetWasPassing, newlyFailedCases: newlyFailed.map(c => c.caseId || "aggregate"),
        exit: run.exit, elapsedMs: run.elapsedMs, provocation: run.result && run.result.provocation, failures };
}

function main(args = process.argv.slice(2)) {
    const start = performance.now();
    const only = args.length === 1 && args[0].startsWith("--provoke=") ? args[0].slice(10) : null;
    if (args.length && (!only || !(only in MUTANTS))) {
        console.error(`Usage: node tools/worldgen_qa/test_multiseed_worldgen_qa.js [--provoke=<${Object.keys(MUTANTS).join("|")}>]`);
        return 2;
    }
    console.log(`WG.84.01 masterSeed=${MASTER_SEED} seeds=${JSON.stringify(SEEDS)} layers=-16..15 timeoutMs=${TIMEOUT_MS}`);
    const checks = [rosterCheck(SEEDS)], perSeed = [], controls = [];
    let reference;
    if (only) {
        if (only !== "seed_count") reference = execute(SEEDS[0]);
        if (only === "reproducibility") reference.coldReplayPassed = compare(reference, execute(SEEDS[0])).pass;
        const c = control(only, reference);
        console.log("@@provocation " + JSON.stringify(c));
        console.log(`RESULT provocation=${only} ${c.caught ? "REJECTED_AS_EXPECTED" : "NOT_PROVEN"} ms=${(performance.now() - start).toFixed(3)}`);
        // Standalone negative controls deliberately exit 1 when they demonstrate
        // rejection, 2 when no proof was obtained. The ordinary gate expects them.
        return c.caught ? 1 : 2;
    }
    for (const seed of SEEDS) {
        const first = execute(seed), replay = execute(seed);
        if (!reference) { reference = first; reference.coldReplayPassed = compare(first, replay).pass; }
        const seedChecks = [...first.checks, ...replay.checks, compare(first, replay)];
        checks.push(...seedChecks);
        printFailures(seedChecks);
        const bad = seedChecks.filter(c => !c.pass);
        const summary = { seed, pass: bad.length === 0, exits: [first.exit, replay.exit],
            elapsedMs: [first.elapsedMs, replay.elapsedMs],
            memory: [first.result && first.result.memory, replay.result && replay.result.memory],
            hashes: first.result && first.result.hashes, stateHashes: first.result && first.result.stateHashes,
            stages: first.result && first.result.stages, viability: first.result && first.result.viability,
            warnings: first.result && first.result.warnings, failures: bad };
        perSeed.push(summary);
        console.log(`SEED ${seed} ${summary.pass ? "PASS" : "FAIL"} exits=${summary.exits} ms=${summary.elapsedMs} failedChecks=${bad.length}`);
        console.log("@@seed " + JSON.stringify(summary));
    }
    for (const name of Object.keys(MUTANTS)) {
        const c = control(name, reference);
        controls.push(c);
        console.log(`PROVOCATION ${name} ${c.caught ? "CAUGHT" : "NOT_PROVEN"} exit=${c.exit} ms=${c.elapsedMs}`);
        console.log("@@provocation " + JSON.stringify(c));
    }
    const failedChecks = checks.filter(c => !c.pass), unproven = controls.filter(c => !c.caught);
    const outcome = { seedCount: perSeed.length, distinctSeeds: new Set(perSeed.map(s => s.seed)).size,
        failedSeeds: perSeed.filter(s => !s.pass).map(s => s.seed), passedChecks: checks.length - failedChecks.length,
        failedChecks: failedChecks.length, controlsCaught: controls.length - unproven.length,
        controlsTotal: controls.length, unproven: unproven.map(c => c.name), elapsedMs: +(performance.now() - start).toFixed(3) };
    const failed = failedChecks.length > 0 || unproven.length > 0;
    console.log("@@summary " + JSON.stringify(outcome));
    console.log(`RESULT: ${outcome.passedChecks} passed, ${outcome.failedChecks} failed; ${outcome.controlsCaught}/${outcome.controlsTotal} provocations caught; exit=${failed ? 1 : 0}`);
    return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { execute, compare, rosterCheck, control, TIMEOUT_MS };
