#!/usr/bin/env node
"use strict";

/**
 * tools/agents/defect_router.js
 *
 * Automates defect lifecycle state transitions per docs/AGENT_COMMUNICATION_PROTOCOL.md:
 *   [DEFECT] -> [FIX_READY] -> [VERIFY_REQUEST] -> [DEFECT_CLOSED]
 *
 * Rules:
 * - Finder holds closure authority: only the reporting reviewer (or coordinator override) can emit DEFECT_CLOSED.
 * - Implementer cannot self-close.
 * - Persists defect state machine to tasks/<taskId>/defects.jsonl.
 *
 * Usage:
 *   node tools/agents/defect_router.js log-defect --task <taskId> --defect <defectId> --finder <reviewer> --title "<summary>" --severity <BLOCKER|MAJOR|MINOR> --req "<spec>" --loc "<file:line>" --closure "<criterion>"
 *   node tools/agents/defect_router.js fix-ready --task <taskId> --defect <defectId> --fixer <implementer> --commit <hash>
 *   node tools/agents/defect_router.js verify-request --task <taskId> --defect <defectId>
 *   node tools/agents/defect_router.js close --task <taskId> --defect <defectId> --reviewer <reviewer> --evidence "<proof>"
 *   node tools/agents/defect_router.js status --task <taskId>
 */

const fs = require("fs");
const path = require("path");
const bus = require("./bus");

const ROOT = path.resolve(__dirname, "..", "..");
const TASKS_DIR = path.join(ROOT, "tasks");

function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const opts = {};
    for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith("--")) {
            const key = args[i].slice(2);
            if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
                opts[key] = args[i + 1];
                i++;
            } else {
                opts[key] = true;
            }
        }
    }
    return { command, opts };
}

function getDefectFile(taskId) {
    const taskDir = path.join(TASKS_DIR, taskId);
    if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true });
    return path.join(taskDir, "defects.jsonl");
}

function readDefects(taskId) {
    const file = getDefectFile(taskId);
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(l => {
        try { return JSON.parse(l); } catch (e) { return null; }
    }).filter(Boolean);
}

function saveDefectRecord(taskId, record) {
    const file = getDefectFile(taskId);
    const line = JSON.stringify(record) + "\n";
    fs.appendFileSync(file, line, "utf8");
}

function logDefect(opts) {
    const { task, defect, finder, title, severity = "MAJOR", req, loc, closure } = opts;
    if (!task || !defect || !finder || !title) {
        console.error("ERROR: log-defect requires --task, --defect, --finder, and --title");
        process.exit(1);
    }

    const defectRecord = {
        defectId: defect,
        taskId: task,
        status: "OPEN",
        finder,
        title,
        severity,
        requirement: req || "Unspecified invariant",
        location: loc || "Unknown",
        closureCriterion: closure || "Clean automated test verification",
        createdAt: new Date().toISOString(),
        history: [{ state: "OPEN", by: finder, timestamp: new Date().toISOString() }]
    };

    saveDefectRecord(task, defectRecord);

    // Emit to message bus
    bus.send({
        task,
        from: finder,
        to: "fable",
        type: "DEFECT",
        priority: severity === "BLOCKER" ? "CRITICAL" : (severity === "MAJOR" ? "HIGH" : "NORMAL"),
        summary: `[${defect}] ${title}`,
        data: {
            defectId: defect,
            evidence: {
                requirement: req,
                location: loc,
                closureCriterion: closure
            }
        }
    });

    console.log(`DEFECT LOGGED: ${defect} (${severity}) by ${finder}`);
}

function fixReady(opts) {
    const { task, defect, fixer, commit } = opts;
    if (!task || !defect || !fixer || !commit) {
        console.error("ERROR: fix-ready requires --task, --defect, --fixer, and --commit");
        process.exit(1);
    }

    const defects = readDefects(task);
    const target = defects.find(d => d.defectId === defect);
    if (!target) {
        console.error(`ERROR: Defect ${defect} not found in task ${task}`);
        process.exit(1);
    }

    target.status = "FIX_READY";
    target.fixCommit = commit;
    target.fixedBy = fixer;
    target.history.push({ state: "FIX_READY", by: fixer, commit, timestamp: new Date().toISOString() });

    saveDefectRecord(task, target);

    // Emit to message bus
    bus.send({
        task,
        from: fixer,
        to: "gemini",
        type: "FIX_READY",
        summary: `Fix ready for ${defect} in commit ${commit}`,
        data: { defectId: defect, relatedCommit: commit }
    });

    console.log(`DEFECT FIX_READY: ${defect} by ${fixer} in commit ${commit}`);
}

function verifyRequest(opts) {
    const { task, defect } = opts;
    const defects = readDefects(task);
    const target = defects.find(d => d.defectId === defect);
    if (!target) {
        console.error(`ERROR: Defect ${defect} not found`);
        process.exit(1);
    }

    target.status = "VERIFY_PENDING";
    target.history.push({ state: "VERIFY_PENDING", by: "gemini", timestamp: new Date().toISOString() });
    saveDefectRecord(task, target);

    bus.send({
        task,
        from: "gemini",
        to: target.finder,
        type: "VERIFY_REQUEST",
        summary: `Please verify fix for ${defect} in commit ${target.fixCommit}`,
        data: { defectId: defect, relatedCommit: target.fixCommit }
    });

    console.log(`VERIFY_REQUEST dispatched to finder ${target.finder} for defect ${defect}`);
}

function closeDefect(opts) {
    const { task, defect, reviewer, evidence } = opts;
    if (!task || !defect || !reviewer) {
        console.error("ERROR: close requires --task, --defect, and --reviewer");
        process.exit(1);
    }

    const defects = readDefects(task);
    const target = defects.find(d => d.defectId === defect);
    if (!target) {
        console.error(`ERROR: Defect ${defect} not found`);
        process.exit(1);
    }

    // Verify finder authority rule
    if (reviewer.toLowerCase() !== target.finder.toLowerCase() && reviewer.toLowerCase() !== "gemini") {
        console.error(`ERROR: Implementer/Third-Party (${reviewer}) cannot close defect found by ${target.finder}! (Firewall rule violation)`);
        process.exit(1);
    }

    target.status = "CLOSED";
    target.closedBy = reviewer;
    target.closureEvidence = evidence || "Verified in test run";
    target.closedAt = new Date().toISOString();
    target.history.push({ state: "CLOSED", by: reviewer, timestamp: new Date().toISOString() });

    saveDefectRecord(task, target);

    bus.send({
        task,
        from: reviewer,
        to: "gemini",
        type: "DEFECT_CLOSED",
        summary: `Defect ${defect} verified and CLOSED`,
        data: { defectId: defect, closureEvidence: evidence }
    });

    console.log(`DEFECT CLOSED: ${defect} successfully verified and closed by ${reviewer}`);
}

function status(opts) {
    const { task } = opts;
    if (!task) {
        console.error("ERROR: status requires --task");
        process.exit(1);
    }

    const defects = readDefects(task);
    console.log(`Defect Status for Task ${task} (${defects.length} total):`);
    defects.forEach(d => {
        console.log(`- [${d.status}] ${d.defectId}: ${d.title} (Finder: ${d.finder}, Severity: ${d.severity})`);
        if (d.fixCommit) console.log(`  Fix commit: ${d.fixCommit} by ${d.fixedBy}`);
        if (d.closureEvidence) console.log(`  Closure proof: ${d.closureEvidence}`);
    });
}

function main() {
    const { command, opts } = parseArgs();
    if (!command) {
        console.log("Usage: node defect_router.js <log-defect|fix-ready|verify-request|close|status> [options]");
        process.exit(0);
    }

    switch (command.toLowerCase()) {
        case "log-defect":
            logDefect(opts);
            break;
        case "fix-ready":
            fixReady(opts);
            break;
        case "verify-request":
            verifyRequest(opts);
            break;
        case "close":
            closeDefect(opts);
            break;
        case "status":
            status(opts);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { logDefect, fixReady, verifyRequest, closeDefect, status };
