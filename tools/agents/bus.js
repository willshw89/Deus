#!/usr/bin/env node
"use strict";

/**
 * tools/agents/bus.js
 *
 * Lightweight, durable inter-agent communication bus adhering strictly to
 * docs/AGENT_COMMUNICATION_PROTOCOL.md.
 *
 * Features:
 * - Appends structured, validated messages to tasks/<taskId>/messages.jsonl and global audit log.
 * - Reads and filters messages by recipient, task, type, or unfulfilled responses.
 * - Implements crash recovery query to locate unanswered messages across sessions.
 *
 * Usage:
 *   node tools/agents/bus.js send --task <taskId> --wbs <wbsId> --from <agent> --to <agent> --type <type> --summary "<text>" [--data '<json>'] [--priority HIGH]
 *   node tools/agents/bus.js read --to <agent> [--task <taskId>] [--unread-only]
 *   node tools/agents/bus.js pending [--task <taskId>]
 *   node tools/agents/bus.js list
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const TASKS_DIR = path.join(ROOT, "tasks");
const GLOBAL_LOG = path.join(TASKS_DIR, "messages.jsonl");

const VALID_TYPES = [
    "QUESTION", "ANSWER", "EVIDENCE", "DEFECT", "FIX_READY",
    "VERIFY_REQUEST", "DEFECT_CLOSED", "BLOCKER", "SCOPE_REQUEST",
    "ESCALATE", "BENCHMARK_RESULT", "TEST_RESULT", "HANDOFF"
];

const VALID_PRIORITIES = ["CRITICAL", "HIGH", "NORMAL", "LOW"];

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

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getTaskMessagePath(taskId) {
    const taskDir = path.join(TASKS_DIR, taskId);
    ensureDir(taskDir);
    return path.join(taskDir, "messages.jsonl");
}

function generateMessageId(taskId) {
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `MSG-${taskId.replace(/[^A-Za-z0-9_-]/g, "_")}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

function send(opts) {
    const { task, wbs, from, to, type, summary, priority = "NORMAL", data } = opts;
    if (!task || !from || !to || !type || !summary) {
        console.error("ERROR: send requires --task, --from, --to, --type, and --summary");
        process.exit(1);
    }
    if (!VALID_TYPES.includes(type)) {
        console.error(`ERROR: Invalid type '${type}'. Must be one of: ${VALID_TYPES.join(", ")}`);
        process.exit(1);
    }
    if (!VALID_PRIORITIES.includes(priority)) {
        console.error(`ERROR: Invalid priority '${priority}'. Must be one of: ${VALID_PRIORITIES.join(", ")}`);
        process.exit(1);
    }

    let payload = {};
    if (data) {
        try {
            payload = typeof data === "string" ? JSON.parse(data) : data;
        } catch (e) {
            console.error(`ERROR: Failed to parse --data as JSON: ${e.message}`);
            process.exit(1);
        }
    }

    const message = {
        messageId: generateMessageId(task),
        taskId: task,
        wbsId: wbs || "UNSPECIFIED",
        timestamp: new Date().toISOString(),
        priority,
        from,
        to,
        type,
        summary,
        requiresResponse: ["QUESTION", "DEFECT", "VERIFY_REQUEST", "BLOCKER", "SCOPE_REQUEST", "ESCALATE"].includes(type),
        responseType: type === "DEFECT" ? "FIX_READY" : (type === "VERIFY_REQUEST" ? "DEFECT_CLOSED" : (type === "QUESTION" ? "ANSWER" : null)),
        status: "OPEN",
        ...payload
    };

    const line = JSON.stringify(message) + "\n";

    // 1. Write to task message log
    const taskFile = getTaskMessagePath(task);
    fs.appendFileSync(taskFile, line, "utf8");

    // 2. Write to global task message bus
    ensureDir(TASKS_DIR);
    fs.appendFileSync(GLOBAL_LOG, line, "utf8");

    console.log(`SENT [${message.messageId}] ${message.type} from ${from} to ${to}: ${summary}`);
    return message;
}

function readMessages(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, "utf8");
    return content.trim().split("\n").filter(Boolean).map(line => {
        try { return JSON.parse(line); } catch (e) { return null; }
    }).filter(Boolean);
}

function read(opts) {
    const { task, to, from, type } = opts;
    let messages = [];

    if (task) {
        const taskFile = getTaskMessagePath(task);
        messages = readMessages(taskFile);
    } else {
        messages = readMessages(GLOBAL_LOG);
    }

    if (to) messages = messages.filter(m => m.to.toLowerCase() === to.toLowerCase());
    if (from) messages = messages.filter(m => m.from.toLowerCase() === from.toLowerCase());
    if (type) messages = messages.filter(m => m.type.toLowerCase() === type.toLowerCase());

    console.log(`Found ${messages.length} message(s):`);
    messages.forEach(m => {
        console.log(`- [${m.timestamp}] [${m.priority}] ${m.type} from ${m.from} to ${m.to} (${m.messageId}): ${m.summary}`);
        if (m.evidence) console.log(`  Evidence: ${JSON.stringify(m.evidence)}`);
    });
    return messages;
}

function pending(opts) {
    const { task, to } = opts;
    let messages = [];
    if (task) {
        messages = readMessages(getTaskMessagePath(task));
    } else {
        messages = readMessages(GLOBAL_LOG);
    }

    const unfulfilled = messages.filter(m => m.requiresResponse && m.status === "OPEN");
    const filtered = to ? unfulfilled.filter(m => m.to.toLowerCase() === to.toLowerCase()) : unfulfilled;

    console.log(`Found ${filtered.length} pending unfulfilled request(s):`);
    filtered.forEach(m => {
        console.log(`- [${m.priority}] ${m.messageId} (${m.type}) for ${m.to} from ${m.from}: ${m.summary} (Awaiting: ${m.responseType || "RESPONSE"})`);
    });
    return filtered;
}

function listTasks() {
    ensureDir(TASKS_DIR);
    const entries = fs.readdirSync(TASKS_DIR, { withFileTypes: true });
    const tasks = entries.filter(e => e.isDirectory() && e.name !== "active").map(e => e.name);

    console.log(`Registered Task Mailboxes (${tasks.length}):`);
    tasks.forEach(t => {
        const msgs = readMessages(getTaskMessagePath(t));
        const pendingCount = msgs.filter(m => m.requiresResponse && m.status === "OPEN").length;
        console.log(`- ${t}: ${msgs.length} messages (${pendingCount} pending)`);
    });
}

function main() {
    const { command, opts } = parseArgs();
    if (!command) {
        console.log("Usage: node bus.js <send|read|pending|list> [options]");
        process.exit(0);
    }

    switch (command.toLowerCase()) {
        case "send":
            send(opts);
            break;
        case "read":
            read(opts);
            break;
        case "pending":
            pending(opts);
            break;
        case "list":
            listTasks();
            break;
        default:
            console.error(`Unknown command: ${command}`);
            process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { send, read, pending, listTasks };
