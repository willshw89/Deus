#!/usr/bin/env node
"use strict";

/**
 * tools/governance/check_wbs_integrity.js
 *
 * Part of WG.00.12 (Lane C: Governance Tooling).
 * Validates:
 * 1. Integer Rev header in canonical WBS files.
 * 2. Immutable leaf ID uniqueness and format (no duplicate WBS IDs).
 * 3. Mailbox durability and JSONL format in docs/agents/mailboxes/.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const DOCS = path.join(ROOT, "docs");
const MAILBOXES = path.join(DOCS, "agents", "mailboxes");

console.log("=== DEUS WBS & GOVERNANCE INTEGRITY CHECK (WG.00.12) ===");

let passed = 0;
let failed = 0;

function check(name, condition, msg) {
    if (condition) {
        console.log(`  [PASS] ${name}: ${msg}`);
        passed++;
    } else {
        console.error(`  [FAIL] ${name}: ${msg}`);
        failed++;
    }
}

// 1. Audit Canonical WBS Header Revisions
const wbsFiles = [
    { name: "Society WBS", path: path.join(DOCS, "society", "DEUS_SOCIETY_WBS.md") },
    { name: "WorldGen WBS", path: path.join(DOCS, "worldgen", "DEUS_WORLDGEN_WBS.md") }
];

for (const w of wbsFiles) {
    if (!fs.existsSync(w.path)) {
        console.log(`  [WARN] ${w.name} not found at ${w.path} (skipping)`);
        continue;
    }
    const content = fs.readFileSync(w.path, "utf8");
    const revMatch = content.match(/\*\*Rev:\*\*\s*(\d+)/i) || content.match(/Rev[:\s]+(\d+)/i);
    check(`${w.name}_rev_header`, !!revMatch, revMatch ? `Integer revision header detected: Rev ${revMatch[1]}` : "Missing integer Rev header!");

    // Audit for duplicate leaf IDs
    const idRegex = /\|\s*`?([A-Z]{2,4}\.\d{2}\.\d{2})`?\s*\|/g;
    let match;
    const seenIds = new Set();
    const duplicates = [];
    while ((match = idRegex.exec(content)) !== null) {
        const id = match[1];
        if (seenIds.has(id)) {
            duplicates.push(id);
        } else {
            seenIds.add(id);
        }
    }
    check(`${w.name}_leaf_uniqueness`, duplicates.length === 0, duplicates.length === 0 ? `${seenIds.size} unique leaf IDs validated` : `Duplicate IDs found: ${duplicates.join(", ")}`);
}

// 2. Audit Mailbox Directory & Files
console.log("\n2. Mailbox Structure & Durability Check");
console.log("------------------------------------------------------------");

const requiredMailboxFiles = [
    path.join(MAILBOXES, "README.md"),
    path.join(MAILBOXES, "broadcast.jsonl"),
    path.join(MAILBOXES, "gemini", "inbox.jsonl"),
    path.join(MAILBOXES, "fable", "inbox.jsonl"),
    path.join(MAILBOXES, "grok", "inbox.jsonl"),
    path.join(MAILBOXES, "codex", "inbox.jsonl")
];

for (const mf of requiredMailboxFiles) {
    const rel = path.relative(ROOT, mf);
    const exists = fs.existsSync(mf);
    check(`mailbox_${path.basename(path.dirname(mf))}_${path.basename(mf)}`, exists, `${rel} exists`);
    if (exists && mf.endsWith(".jsonl")) {
        const lines = fs.readFileSync(mf, "utf8").trim().split("\n").filter(Boolean);
        let validJsonl = true;
        for (const l of lines) {
            try { JSON.parse(l); } catch (e) { validJsonl = false; break; }
        }
        check(`valid_jsonl_${path.basename(mf)}`, validJsonl, `${rel} valid JSONL (${lines.length} lines)`);
    }
}

console.log("\n============================================================");
console.log(`INTEGRITY AUDIT SUMMARY: ${passed} passed, ${failed} failed`);
console.log("============================================================");

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
