#!/usr/bin/env node
"use strict";

/**
 * tools/governance/check_claims.js
 *
 * WG.00.12 Lane C2: machine-enforced governance (DEUS Directive 001, 001-A, 001-B).
 * Checks one commit (the staged index, or an existing commit) against rules 4.1-4.4, and
 * scans the defect ledgers and the message bus for backfilled stamps.
 *
 *   4.1 Evidence required. A record that moves to a closing state (DONE, CLOSED or a synonym
 *       in CLOSING) cites evidence in the record itself: a commit hash (7+ hex) naming a commit
 *       reachable from the new commit's parents, or a test run, meaning the path of a script
 *       that exists in the new tree plus a passing outcome ("exit 0", "N/N passed",
 *       "N passed, 0 failed", "RESULT: PASS", "ALL ... PASSED").
 *   4.2 Zero self-certification. A defect's closedBy is never one of its fixers (fixedBy, the
 *       FIX_READY actors, the author of fixCommit), and a fixer never commits the closure.
 *       A WBS leaf that closes names an independent reviewer ("closedBy: grok", "verdict: grok",
 *       "reviewed by grok") who is neither one of its owners nor the author of a commit it
 *       cites (docs/CANONICAL_ROLES.md §2-§3).
 *   4.3 WBS revision and immutability. Adding a leaf needs the header Rev to go up, plus a
 *       Revision Log row for the new Rev when the file keeps a log. Leaves are never deleted,
 *       renamed or retitled, and an ID is never used twice. Any other non-status edit to a
 *       leaf (owner, scope) also needs the Rev to go up.
 *   4.4 Single-writer whitelist. Every path the commit touches is in the committer's lane
 *       whitelist in docs/STATUS.md as of the parent commit, so a commit cannot widen its own
 *       whitelist; no path is on the FROZEN / READ-ONLY row. In a merge, only paths that differ
 *       from every parent count as touched.
 *   --check-backfill. Flags stamps made in a burst: two agents acting on one item less than
 *       BURST_MS apart (B1), or several items given a certifying stamp less than BURST_MS
 *       apart (B2); and closures without an independent audit trail (A1-A4).
 *
 * Records read:
 *   WBS leaves      table rows in docs/**\/*WBS*.md (not docs/archive/) whose table's first
 *                   header cell starts with "WBS", keyed by the leaf ID in the first cell. A range
 *                   row (WG.22.01–25) is one key; replacing it with one row per ID is not a deletion.
 *   Defect ledgers  tasks/<task>/defects.jsonl, append-only JSON lines (tools/agents/defect_router.js).
 *   Defect tables   rows of tables with a "Status" column in docs/STATUS.md, docs/AUDIT_LOG.md
 *                   and docs/issues/*.md whose first cell is an ID (ATK-YEAR0-001, A10-1).
 *
 * Identity is declared, not authenticated:
 *   lane   --lane, else DEUS_LANE, else the branch name task/lane-<x>
 *   agent  --agent, else DEUS_AGENT, else the lane row's label, else (--commit) the "[agent]"
 *          prefix of the commit subject
 * DEUS_LANE, DEUS_AGENT and the branch apply to the staged commit only, never to --commit audits.
 * An agent without a lane gets the union of that agent's lanes. Neither means rejection.
 * Claude and Fable count as one agent, as do Gemini and Antigravity (CANONICAL_ROLES §2).
 *
 * Usage:
 *   node tools/governance/check_claims.js [--pre-commit]          check the staged index
 *   node tools/governance/check_claims.js --commit <rev> [...]    check existing commits
 *   node tools/governance/check_claims.js --range <a>..<b>        check every commit in a range
 *   node tools/governance/check_claims.js --check-backfill [file.jsonl ...]
 *   node tools/governance/check_claims.js --install-hook [--force] | --uninstall-hook
 *   options: --lane <c2|coordinator|...>  --agent <name>  --json  --burst-ms <n>
 * Exit: 0 clean, 1 violations or flags, 2 usage or git error.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const BURST_MS = 1000;
const CLOSING = new Set(["DONE", "CLOSED", "COMPLETE", "COMPLETED", "RESOLVED", "FIXED", "VERIFIED",
    "FROZEN", "FINAL", "ACCEPTED", "APPROVED"]);
const CERTIFYING = new Set([...CLOSING, "FIX_READY", "VERIFY_PENDING", "VERIFY_REQUEST", "DEFECT_CLOSED"]);
const AGENT_ALIASES = {
    gemini: "gemini", antigravity: "gemini",
    claude: "claude", fable: "claude",
    grok: "grok",
    codex: "codex",
    owner: "owner", owner_review: "owner"
};
const PATHS = {
    status: "docs/STATUS.md",
    wbs: /^docs\/(?!archive\/)(?:[^/]+\/)*[^/]*WBS[^/]*\.md$/i,
    ledger: /^tasks\/[^/]+\/defects\.jsonl$/,
    defectTables: /^docs\/(?:STATUS\.md|AUDIT_LOG\.md|issues\/[^/]+\.md)$/
};
// Ledger fields that describe the defect rather than its closure; everything else is evidence.
const NON_EVIDENCE_FIELDS = ["defectId", "taskId", "title", "requirement", "location", "closureCriterion", "severity", "finder"];
const HOOK_MARKER = "DEUS-GOVERNANCE-HOOK v1";

const AGENT_RE = new RegExp(`\\b(${Object.keys(AGENT_ALIASES).sort((a, b) => b.length - a.length).join("|")})\\b`, "gi");
const REVIEWER_RE = /\b(?:closed\s*by|reviewer|reviewed\s+by|verified\s+by|verdict(?:\s+by)?|sign(?:ed)?[\s-]*off(?:\s+by)?)\b[\s:=`*"'([]*([A-Za-z][\w-]*)/gi;
const HASH_RE = /\b[0-9a-f]{7,40}\b/gi;
const SCRIPT_RE = /(?:^|[\s`'"(\[])((?:[\w.-]+\/)*[\w.-]+\.(?:js|mjs|cjs|bat|cmd|ps1|sh))(?=$|[\s`'")\],;:])/g;
const PASS_OUTCOME_RE = /\bexit(?:\s+code)?\s*[:=]?\s*0\b|\b(\d+)\s*\/\s*\1\s+(?:checks?\s+)?pass(?:ed)?\b|\b\d+\s+pass(?:ed)?,\s*0\s+fail(?:ed|ures?)?\b|\bRESULT:\s*PASS\b|(?<!\bnot\s)\bALL\b[^.;|\n]{0,40}\bPASS(?:ED)?\b/i;
const LEAF_ID_RE = /^([A-Z]{2,5}\.\d{2})\.(\d{2})(?:\.\d{2})?(?:\s*[–-]\s*(\d{2}))?$/;
const DEFECT_ID_RE = /^[A-Z][A-Z0-9]*(?:[-.][A-Z0-9]+)+$/i;

// ---------------------------------------------------------------- git

function git(args, opts = {}) {
    const r = spawnSync("git", args, {
        cwd: process.cwd(), encoding: "utf8", input: opts.input, maxBuffer: 256 * 1024 * 1024, windowsHide: true
    });
    if (r.error) throw new Error(`cannot run git: ${r.error.message}`);
    if (opts.allowFail) return { ok: r.status === 0, status: r.status, out: r.stdout || "" };
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || "").trim()}`);
    return r.stdout;
}

function revParse(rev) {
    const r = git(["rev-parse", "-q", "--verify", rev], { allowFail: true });
    return r.ok ? r.out.trim() : null;
}

function splitZ(out) {
    return out.split("\0").filter(s => s.length);
}

function parseNameStatus(out) {
    const t = splitZ(out), changes = [];
    for (let i = 0; i + 1 < t.length; i += 2) changes.push({ status: t[i][0], path: t[i + 1] });
    return changes;
}

function makeTree(kind, rev) {
    const cache = new Map();
    let files = null;
    return {
        kind, rev,
        objectName(p) { return kind === "index" ? `:${p}` : `${rev}:${p}`; },
        read(p) {
            if (kind === "empty") return null;
            if (!cache.has(p)) {
                const r = git(["cat-file", "blob", this.objectName(p)], { allowFail: true });
                cache.set(p, r.ok ? r.out.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n") : null);
            }
            return cache.get(p);
        },
        list() {
            if (files) return files;
            if (kind === "empty") files = [];
            else if (kind === "index") files = splitZ(git(["ls-files", "-z"]));
            else files = splitZ(git(["ls-tree", "-r", "-z", "--name-only", rev]));
            return files;
        }
    };
}

function makeGitFacts() {
    const resolved = new Map(), existing = new Map(), ancestry = new Map(), authors = new Map();
    function batch(names, cache, parse) {
        const need = [...new Set(names.filter(n => !cache.has(n) && !/\n/.test(n)))];
        if (need.length) {
            const out = git(["cat-file", "--batch-check"], { input: need.join("\n") + "\n" }).split("\n");
            need.forEach((n, i) => cache.set(n, parse(out[i] || "")));
        }
        return names.map(n => cache.get(n) || null);
    }
    return {
        resolveCommits(tokens) {
            const shas = batch(tokens.map(t => `${t}^{commit}`), resolved, line => {
                const m = line.match(/^([0-9a-f]{40,64}) commit /);
                return m ? m[1] : null;
            });
            return shas;
        },
        exists(objectNames) {
            return batch(objectNames, existing, line => /^[0-9a-f]{40,64} blob /.test(line));
        },
        isAncestor(sha, base) {
            const key = `${sha}..${base}`;
            if (!ancestry.has(key)) ancestry.set(key, git(["merge-base", "--is-ancestor", sha, base], { allowFail: true }).status === 0);
            return ancestry.get(key);
        },
        commitAuthor(tokenOrSha) {
            const sha = this.resolveCommits([String(tokenOrSha).toLowerCase()])[0];
            if (!sha) return null;
            if (!authors.has(sha)) authors.set(sha, subjectAgent(git(["show", "-s", "--format=%s", sha]).trim()));
            return authors.get(sha);
        }
    };
}

// ---------------------------------------------------------------- text helpers

function clean(cell) {
    return String(cell == null ? "" : cell).replace(/[*`]/g, "").replace(/\s+/g, " ").trim();
}

function statusWord(value) {
    if (value == null) return "";
    const s = String(value).replace(/~~[^~]*~~/g, " ").replace(/<[^>]+>/g, " ").toUpperCase();
    const m = s.match(/[A-Z][A-Z_]*/);
    return m ? m[0] : "";
}

function normAgent(name) {
    if (name == null) return null;
    const s = String(name).trim().toLowerCase();
    if (!s) return null;
    if (AGENT_ALIASES[s]) return AGENT_ALIASES[s];
    const m = s.match(new RegExp(AGENT_RE.source, "i"));
    return m ? AGENT_ALIASES[m[1].toLowerCase()] : s;
}

function subjectAgent(subject) {
    const m = String(subject || "").match(/^\s*\[([^\]]+)\]/);
    return m ? normAgent(m[1]) : null;
}

function agentsIn(text) {
    const out = new Set();
    for (const m of String(text || "").matchAll(AGENT_RE)) out.add(AGENT_ALIASES[m[1].toLowerCase()]);
    return out;
}

function reviewersIn(text, reviewerCell) {
    const out = agentsIn(reviewerCell);
    for (const m of String(text || "").matchAll(REVIEWER_RE)) {
        const a = AGENT_ALIASES[m[1].toLowerCase()];
        if (a) out.add(a);
    }
    return out;
}

function splitRow(line) {
    let t = String(line || "").trim();
    if (!t.startsWith("|")) return null;
    t = t.slice(1);
    if (t.endsWith("|") && !t.endsWith("\\|")) t = t.slice(0, -1);
    return t.split(/(?<!\\)\|/).map(c => c.trim());
}

function parseTables(text) {
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    const tables = [];
    let cur = null;
    for (let i = 0; i < lines.length; i++) {
        const cells = splitRow(lines[i]);
        if (!cells) { cur = null; continue; }
        if (!cur) {
            const next = splitRow(lines[i + 1]);
            if (next && next.every(c => /^:?-+:?$/.test(c))) {
                cur = { header: cells.map(clean), rows: [] };
                tables.push(cur);
                i++;
            }
            continue;
        }
        cur.rows.push({ cells, line: i + 1, text: lines[i] });
    }
    return { tables, lines };
}

function parseWbs(text) {
    const out = { rev: null, leaves: new Map(), dups: [], revLog: null };
    if (text == null) return out;
    const { tables, lines } = parseTables(text);
    for (const l of lines) {
        if (/^##\s/.test(l)) break;
        const m = l.match(/^\s*(?:\*\*)?Rev(?:ision)?(?::\*\*|\*\*:|\*\*|:)?\s*(\d+)\b/i);
        if (m) { out.rev = Number(m[1]); break; }
    }
    for (const t of tables) {
        const h = t.header;
        if (/^rev$/i.test(h[0])) {
            out.revLog = out.revLog || new Set();
            for (const r of t.rows) { const n = parseInt(clean(r.cells[0]), 10); if (!isNaN(n)) out.revLog.add(n); }
            continue;
        }
        if (!/^WBS\b/i.test(h[0])) continue;
        const col = re => h.findIndex(x => re.test(x));
        const ti = col(/title|leaf name|^name$/i), oi = col(/owner|writer|author/i), si = col(/^status$/i);
        const ri = col(/review|closed\s*by|verifier/i);
        // Status and evidence columns change with a closure; every other column except the ID
        // (compared as the key) is the leaf's identity.
        const sigCols = h.map((x, i) => i).filter(i => i > 0 && i !== si && !/status|commit|\bref\b|evidence|review|verdict|closed/i.test(h[i]));
        for (const r of t.rows) {
            const id = leafKey(clean(r.cells[0]));
            if (!id) continue;
            const leaf = {
                id, line: r.line, text: r.text,
                title: ti >= 0 ? clean(r.cells[ti]) : "",
                owners: oi >= 0 ? agentsIn(r.cells[oi]) : new Set(),
                status: si >= 0 ? statusWord(r.cells[si]) : "",
                reviewers: reviewersIn(r.text, ri >= 0 ? r.cells[ri] : ""),
                sig: JSON.stringify(sigCols.map(i => clean(r.cells[i])))
            };
            if (out.leaves.has(id)) out.dups.push({ id, line: r.line });
            else out.leaves.set(id, leaf);
        }
    }
    // A range row ("WG.22.01–25") and a single row for an ID inside it name the same leaf twice.
    for (const [id, leaf] of out.leaves) {
        for (const one of rangeIds(id)) if (out.leaves.has(one)) out.dups.push({ id: one, line: leaf.line });
    }
    return out;
}

// "WG.00.08" -> "WG.00.08"; "WG.22.01–25" or "WG.22.01-25" -> "WG.22.01–25"; anything else -> null.
function leafKey(cell) {
    const m = cell.match(LEAF_ID_RE);
    if (!m) return null;
    return m[3] ? `${m[1]}.${m[2]}–${m[3]}` : cell;
}

function rangeIds(key) {
    const m = key.match(/^([A-Z]{2,5}\.\d{2})\.(\d{2})–(\d{2})$/);
    if (!m) return [];
    const ids = [];
    for (let n = Number(m[2]); n <= Number(m[3]) && ids.length < 100; n++) ids.push(`${m[1]}.${String(n).padStart(2, "0")}`);
    return ids;
}

function parseDefectRows(text) {
    const rows = new Map();
    if (text == null) return rows;
    for (const t of parseTables(text).tables) {
        const h = t.header;
        const si = h.findIndex(x => /^status$/i.test(x));
        if (si < 0 || /^WBS\b/i.test(h[0])) continue;
        const ri = h.findIndex(x => /review|closed\s*by|verifier/i.test(x));
        for (const r of t.rows) {
            const id = clean(r.cells[0]);
            if (!DEFECT_ID_RE.test(id)) continue;
            rows.set(id, { id, line: r.line, text: r.text, status: statusWord(r.cells[si]),
                reviewers: reviewersIn(r.text, ri >= 0 ? r.cells[ri] : "") });
        }
    }
    return rows;
}

function jsonLines(text) {
    return String(text || "").replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim());
}

function omit(obj, keys) {
    const o = {};
    for (const k of Object.keys(obj)) if (!keys.includes(k)) o[k] = obj[k];
    return o;
}

// ---------------------------------------------------------------- whitelist matrix

function globToRe(glob, flags) {
    if (/^[A-Za-z]:[\\/]/.test(glob) || glob.startsWith("/") || glob.includes("\\")) return null;
    const g = glob.replace(/^\.\//, "");
    let re = "";
    for (let i = 0; i < g.length; i++) {
        const c = g[i];
        if (c === "*" && g[i + 1] === "*") {
            if (g[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i++; }
        } else if (c === "*") re += "[^/]*";
        else if (c === "?") re += "[^/]";
        else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
    if (g.endsWith("/")) re += ".*";
    return new RegExp(`^${re}$`, flags);
}

function parseLaneMatrix(text) {
    if (text == null) return null;
    const t = parseTables(text).tables.find(x => x.header.some(h => /whitelist/i.test(h)));
    if (!t) return null;
    const pi = t.header.findIndex(h => /whitelist/i.test(h));
    const wi = t.header.findIndex(h => /writer|owner/i.test(h) && !/whitelist/i.test(h));
    const lanes = [], frozen = [];
    for (const r of t.rows) {
        const label = clean(r.cells[0]);
        const cell = r.cells[pi] || "";
        const ticks = [...cell.matchAll(/`([^`]+)`/g)].map(m => m[1].trim());
        const raw = (ticks.length ? ticks : cell.split(/<br\s*\/?>/i).map(clean)).filter(Boolean);
        const globs = raw.map(g => ({ raw: g, re: globToRe(g, ""), reI: globToRe(g, "i") })).filter(g => g.re);
        if (/frozen|read-?only/i.test(label)) { frozen.push(...globs); continue; }
        const lm = label.match(/^lane\s+([A-Z0-9]+)/i);
        const key = lm ? lm[1].toLowerCase() : /coordinator/i.test(label) ? "coordinator" : label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const agents = new Set([...agentsIn(label), ...(wi > 0 ? agentsIn(r.cells[wi]) : [])]);
        lanes.push({ label, key, agents, globs });
    }
    return { lanes, frozen };
}

function normLaneKey(k) {
    return String(k).toLowerCase().replace(/^\s*lane[\s_-]*/, "").replace(/[\s_-]+/g, "");
}

function resolveIdentity(opts, matrix, ctx) {
    const errors = [];
    // The environment speaks for the commit being made, never for an existing commit under audit.
    const env = ctx.sha ? {} : process.env;
    let laneKey = null, laneSource = null;
    if (opts.lane) { laneKey = opts.lane; laneSource = "--lane"; }
    else if (env.DEUS_LANE) { laneKey = env.DEUS_LANE; laneSource = "DEUS_LANE"; }
    else if (ctx.branch) {
        const m = ctx.branch.match(/(?:^|\/)lane-([A-Za-z0-9]+)$/);
        if (m) { laneKey = m[1]; laneSource = `branch ${ctx.branch}`; }
    }
    let agentRaw = null, agentSource = null;
    if (opts.agent) { agentRaw = opts.agent; agentSource = "--agent"; }
    else if (env.DEUS_AGENT) { agentRaw = env.DEUS_AGENT; agentSource = "DEUS_AGENT"; }
    else if (ctx.subject && subjectAgent(ctx.subject)) { agentRaw = subjectAgent(ctx.subject); agentSource = "commit subject"; }
    let agent = normAgent(agentRaw);
    let lanes = [];
    if (matrix) {
        if (laneKey) {
            const k = normLaneKey(laneKey);
            lanes = matrix.lanes.filter(l => l.key === k);
            if (!lanes.length && AGENT_ALIASES[k]) lanes = matrix.lanes.filter(l => l.agents.has(AGENT_ALIASES[k]));
            if (!lanes.length) errors.push(`lane "${laneKey}" (${laneSource}) has no row in the whitelist matrix`);
        } else if (agent) {
            lanes = matrix.lanes.filter(l => l.agents.has(agent));
            laneSource = `every lane held by ${agent}`;
            if (!lanes.length) errors.push(`agent "${agent}" (${agentSource}) holds no lane in the whitelist matrix`);
        } else {
            errors.push("cannot tell which lane is committing: set DEUS_LANE or --lane, or commit from a task/lane-<x> branch");
        }
        if (lanes.length && !agent) {
            const shared = [...lanes[0].agents].filter(a => lanes.every(l => l.agents.has(a)));
            if (shared.length === 1) { agent = shared[0]; agentSource = "lane row"; }
        }
        if (lanes.length && agent && lanes.some(l => !l.agents.has(agent))) {
            errors.push(`agent "${agent}" (${agentSource}) does not hold ${lanes.map(l => l.label).join(", ")}`);
            lanes = [];
        }
    }
    return { agent, agentSource, lanes, laneSource, errors };
}

// ---------------------------------------------------------------- report

function makeReport(label) {
    const rules = {
        "4.1": { name: "evidence required", checked: 0, violations: [] },
        "4.2": { name: "zero self-certification", checked: 0, violations: [] },
        "4.3": { name: "WBS revision and immutability", checked: 0, violations: [] },
        "4.4": { name: "single-writer whitelist", checked: 0, violations: [] }
    };
    return {
        label, rules, warnings: [],
        count(rule, n = 1) { rules[rule].checked += n; },
        fail(rule, msg) { rules[rule].violations.push(msg); },
        warn(msg) { this.warnings.push(msg); },
        failed() { return Object.values(rules).some(r => r.violations.length); }
    };
}

// ---------------------------------------------------------------- rules 4.1 and 4.2

function evidenceOf(text, ctx) {
    const G = ctx.facts;
    const tokens = [...new Set((String(text).match(HASH_RE) || []).map(t => t.toLowerCase()))].slice(0, 40);
    const shas = G.resolveCommits(tokens);
    const commits = [];
    tokens.forEach((t, i) => {
        if (!shas[i]) return;
        commits.push({ token: t, sha: shas[i], author: G.commitAuthor(shas[i]),
            reachable: ctx.bases.some(b => G.isAncestor(shas[i], b)) });
    });
    const scripts = [...new Set([...String(text).matchAll(SCRIPT_RE)].map(m => m[1].replace(/^\.\//, "")))];
    const present = G.exists(scripts.map(s => ctx.newTree.objectName(s)));
    const existing = scripts.filter((s, i) => present[i]);
    const passed = PASS_OUTCOME_RE.test(text);
    const ok = commits.some(c => c.reachable) || (existing.length > 0 && passed);
    const why = [];
    if (!ok) {
        const unreachable = commits.filter(c => !c.reachable).map(c => c.token);
        if (unreachable.length) why.push(`cites ${unreachable.join(", ")}, which is not reachable from the parent commit(s)`);
        const bogus = tokens.filter((t, i) => !shas[i] && /\d/.test(t) && /[a-f]/.test(t));
        if (bogus.length) why.push(`${bogus.join(", ")} is not a commit in this repository`);
        const missing = scripts.filter((s, i) => !present[i]);
        if (missing.length) why.push(`${missing.join(", ")} does not exist in the new tree`);
        if (existing.length && !passed) why.push(`cites ${existing.join(", ")} without a passing outcome (exit 0, N/N passed, RESULT: PASS)`);
        if (!why.length) why.push("cites no commit hash and no test run");
    }
    return { ok, commits, why: why.join("; ") };
}

function requireEvidence(where, text, ctx, R) {
    R.count("4.1");
    const ev = evidenceOf(text, ctx);
    if (!ev.ok) R.fail("4.1", `${where}: ${ev.why}`);
    return ev;
}

function fixersOf(rec, ctx) {
    const f = new Set();
    const add = a => { const n = normAgent(a); if (n) f.add(n); };
    add(rec.fixedBy);
    const commits = [rec.fixCommit];
    for (const h of rec.history || []) {
        if (statusWord(h.state) === "FIX_READY") { add(h.by); commits.push(h.commit); }
    }
    for (const c of commits) {
        if (typeof c === "string" && /^[0-9a-f]{7,40}$/i.test(c)) { const a = ctx.facts.commitAuthor(c); if (a) f.add(a); }
    }
    return f;
}

function closerOf(rec) {
    if (rec.closedBy) return normAgent(rec.closedBy);
    const h = [...(rec.history || [])].reverse().find(x => CLOSING.has(statusWord(x.state)));
    return h ? normAgent(h.by) : null;
}

function requireIndependentCloser(where, rec, ctx, R) {
    const fixers = fixersOf(rec, ctx), closer = closerOf(rec);
    const list = [...fixers].join(", ") || "none recorded";
    if (!closer) R.fail("4.2", `${where}: the closure names no closedBy`);
    else if (fixers.has(closer)) R.fail("4.2", `${where}: closedBy ${closer} is one of the fixers (${list})`);
    if (!ctx.agent) R.fail("4.2", `${where}: the committing agent is unknown, so it cannot be told apart from the fixers (${list})`);
    else if (fixers.has(ctx.agent)) R.fail("4.2", `${where}: committed by ${ctx.agent}, one of the fixers (${list})`);
}

function checkWbsFile(p, oldText, newText, ctx, R) {
    const o = parseWbs(oldText), n = parseWbs(newText);
    R.count("4.3");
    const added = [...n.leaves.keys()].filter(id => !o.leaves.has(id));
    const edited = [];
    for (const [id, ol] of o.leaves) {
        const nl = n.leaves.get(id);
        if (!nl) {
            // A range row may be replaced by one row per ID it covered; those rows are additions (Rev rule below).
            const expanded = rangeIds(id).length > 0 && rangeIds(id).every(one => n.leaves.has(one));
            if (!expanded) R.fail("4.3", `${p}: leaf ${id} ("${ol.title}") was deleted or renamed; retire a leaf with status SUPERSEDED`);
        } else if (nl.title !== ol.title) R.fail("4.3", `${p}:${nl.line}: leaf ${id} retitled "${ol.title}" -> "${nl.title}"; an ID keeps its scope`);
        else if (nl.sig !== ol.sig) edited.push(id);
    }
    for (const d of n.dups) {
        if (!o.dups.some(x => x.id === d.id)) R.fail("4.3", `${p}:${d.line}: leaf ID ${d.id} is used a second time`);
    }
    const fmt = r => (r == null ? "none" : r);
    const revUp = n.rev != null && (o.rev == null || n.rev > o.rev);
    if (newText != null && o.rev != null && n.rev == null) R.fail("4.3", `${p}: the Rev header was removed (was Rev ${o.rev})`);
    if (o.rev != null && n.rev != null && n.rev < o.rev) R.fail("4.3", `${p}: Rev went down, ${o.rev} -> ${n.rev}`);
    if (added.length && !revUp) R.fail("4.3", `${p}: ${added.join(", ")} added but Rev did not go up (Rev ${fmt(o.rev)} -> ${fmt(n.rev)})`);
    if (edited.length && !revUp) R.fail("4.3", `${p}: non-status edits to ${edited.join(", ")} without a Rev increase (Rev ${fmt(o.rev)} -> ${fmt(n.rev)})`);
    if (revUp && n.revLog && !n.revLog.has(n.rev)) R.fail("4.3", `${p}: Rev ${n.rev} has no row in the Revision Log`);

    for (const [id, nl] of n.leaves) {
        const ol = o.leaves.get(id);
        if (!CLOSING.has(nl.status) || (ol && CLOSING.has(ol.status))) continue;
        const where = `${p}:${nl.line} ${id} -> ${nl.status}`;
        const ev = requireEvidence(where, nl.text, ctx, R);
        R.count("4.2");
        const authors = new Set([...nl.owners, ...(ol ? ol.owners : [])]);
        for (const c of ev.commits) if (c.author) authors.add(c.author);
        const reviewers = [...nl.reviewers];
        const self = reviewers.filter(r => authors.has(r));
        const list = [...authors].join(", ") || "none";
        if (self.length) {
            R.fail("4.2", `${where}: names ${self.join(", ")} as reviewer, but owners and cited-commit authors are ${list}`);
        } else if (!reviewers.length) {
            const committer = ctx.agent && authors.has(ctx.agent) ? `; the committer, ${ctx.agent}, is one of them` : "";
            R.fail("4.2", `${where}: names no independent reviewer ("closedBy: <agent>"); owners and cited-commit authors are ${list}${committer}`);
        }
    }
}

function checkLedgerFile(p, oldText, newText, ctx, R) {
    const pool = new Map();
    for (const l of jsonLines(oldText)) pool.set(l, (pool.get(l) || 0) + 1);
    const lines = String(newText || "").replace(/\r\n?/g, "\n").split("\n");
    lines.forEach((l, i) => {
        if (!l.trim()) return;
        if (pool.get(l) > 0) { pool.set(l, pool.get(l) - 1); return; }
        let rec;
        try { rec = JSON.parse(l); } catch (e) {
            R.count("4.1");
            R.fail("4.1", `${p}:${i + 1}: unreadable ledger line; a record that cannot be parsed cannot carry evidence`);
            return;
        }
        const st = statusWord(rec.status || rec.state);
        if (!CLOSING.has(st)) return;
        const where = `${p}:${i + 1} ${rec.defectId || "(no defectId)"} -> ${st}`;
        requireEvidence(where, JSON.stringify(omit(rec, NON_EVIDENCE_FIELDS)), ctx, R);
        R.count("4.2");
        requireIndependentCloser(where, rec, ctx, R);
    });
    const removed = [...pool.values()].reduce((a, b) => a + b, 0);
    if (removed) R.warn(`${p}: ${removed} existing ledger line(s) removed or rewritten; the ledger is append-only`);
}

function ledgerRecords(ctx) {
    if (!ctx.ledger) {
        ctx.ledger = new Map();
        for (const f of ctx.newTree.list().filter(x => PATHS.ledger.test(x))) {
            for (const l of jsonLines(ctx.newTree.read(f))) {
                try { const r = JSON.parse(l); if (r.defectId) ctx.ledger.set(r.defectId, r); } catch (e) { /* reported by 4.1 when staged */ }
            }
        }
    }
    return ctx.ledger;
}

function checkDefectTableFile(p, oldText, newText, ctx, R) {
    const o = parseDefectRows(oldText), n = parseDefectRows(newText);
    for (const [id, nr] of n) {
        const or = o.get(id);
        if (!CLOSING.has(nr.status) || (or && CLOSING.has(or.status))) continue;
        const where = `${p}:${nr.line} ${id} -> ${nr.status}`;
        const ev = requireEvidence(where, nr.text, ctx, R);
        R.count("4.2");
        const rec = ledgerRecords(ctx).get(id);
        if (rec) {
            if (!CLOSING.has(statusWord(rec.status))) R.fail("4.2", `${where}: the defect ledger's latest record for ${id} is ${rec.status}, not closed`);
            else requireIndependentCloser(where, rec, ctx, R);
            continue;
        }
        const authors = new Set(ev.commits.map(c => c.author).filter(Boolean));
        const reviewers = [...nr.reviewers];
        const self = reviewers.filter(r => authors.has(r));
        if (self.length) R.fail("4.2", `${where}: names ${self.join(", ")} as reviewer, the author of a cited commit`);
        else if (!reviewers.length) R.fail("4.2", `${where}: no defect-ledger record and no reviewer named ("closedBy: <agent>")`);
        if (!ctx.agent) R.fail("4.2", `${where}: the committing agent is unknown, so it cannot be told apart from the fix authors`);
        else if (authors.has(ctx.agent)) R.fail("4.2", `${where}: committed by ${ctx.agent}, the author of a cited fix commit`);
    }
}

// ---------------------------------------------------------------- rule 4.4

function checkWhitelist(ctx, R) {
    R.count("4.4", ctx.changes.length);
    if (!ctx.matrix) {
        R.fail("4.4", `no File-Ownership whitelist table in ${PATHS.status} at ${ctx.statusRev ? ctx.statusRev.slice(0, 7) : "the parent (there is none)"}`);
        return;
    }
    for (const e of ctx.identity.errors) R.fail("4.4", e);
    const lanes = ctx.identity.lanes;
    if (!lanes.length) return;
    const held = lanes.map(l => l.label).join(" + ");
    for (const ch of ctx.changes) {
        const frozen = ctx.matrix.frozen.find(g => g.reI.test(ch.path));
        if (frozen) { R.fail("4.4", `${ch.path}: frozen / read-only (${frozen.raw})`); continue; }
        if (lanes.some(l => l.globs.some(g => g.re.test(ch.path)))) continue;
        const owners = ctx.matrix.lanes.filter(l => l.globs.some(g => g.reI.test(ch.path))).map(l => l.label);
        R.fail("4.4", `${ch.path}: outside the ${held} whitelist; ${owners.length ? `it belongs to ${owners.join(", ")}` : "no lane owns it"}`);
    }
}

// ---------------------------------------------------------------- one commit

function stagedTarget() {
    const head = revParse("HEAD^{commit}");
    const args = ["diff", "--cached", "--name-status", "-z", "--no-renames", "--no-ext-diff"];
    if (head) args.push(head);
    let changes = parseNameStatus(git(args));
    const mergeHead = revParse("MERGE_HEAD^{commit}");
    if (mergeHead) {
        const other = new Set(splitZ(git(["diff", "--cached", "--name-only", "-z", "--no-renames", "--no-ext-diff", mergeHead])));
        changes = changes.filter(c => other.has(c.path));
    }
    const b = git(["symbolic-ref", "-q", "--short", "HEAD"], { allowFail: true });
    return {
        label: mergeHead ? "staged merge" : "staged index", sha: null, subject: null,
        branch: b.ok ? b.out.trim() : null, changes,
        oldTree: head ? makeTree("commit", head) : makeTree("empty"),
        newTree: makeTree("index"), bases: [head, mergeHead].filter(Boolean), statusRev: head
    };
}

function commitTarget(rev) {
    const sha = revParse(`${rev}^{commit}`);
    if (!sha) throw new Error(`not a commit: ${rev}`);
    const parents = git(["rev-list", "--parents", "-n", "1", sha]).trim().split(/\s+/).slice(1);
    let changes;
    if (!parents.length) {
        changes = parseNameStatus(git(["diff-tree", "--root", "-r", "-z", "--no-renames", "--no-commit-id", "--name-status", sha]));
    } else {
        changes = parseNameStatus(git(["diff-tree", "-r", "-z", "--no-renames", "--name-status", parents[0], sha]));
        for (const p of parents.slice(1)) {
            const other = new Set(splitZ(git(["diff-tree", "-r", "-z", "--no-renames", "--name-only", p, sha])));
            changes = changes.filter(c => other.has(c.path));
        }
    }
    return {
        label: `commit ${sha.slice(0, 7)}`, sha, subject: git(["show", "-s", "--format=%s", sha]).trim(),
        branch: null, changes,
        oldTree: parents.length ? makeTree("commit", parents[0]) : makeTree("empty"),
        newTree: makeTree("commit", sha), bases: parents, statusRev: parents[0] || null
    };
}

function checkTarget(target, opts, facts) {
    const R = makeReport(target.label);
    const statusText = target.statusRev ? makeTree("commit", target.statusRev).read(PATHS.status) : null;
    const matrix = parseLaneMatrix(statusText);
    const identity = resolveIdentity(opts, matrix, target);
    const ctx = Object.assign({}, target, { facts, matrix, identity, agent: identity.agent });
    for (const ch of target.changes) {
        const isWbs = PATHS.wbs.test(ch.path), isLedger = PATHS.ledger.test(ch.path), isTable = PATHS.defectTables.test(ch.path);
        if (!isWbs && !isLedger && !isTable) continue;
        const oldText = target.oldTree.read(ch.path);
        const newText = ch.status === "D" ? null : target.newTree.read(ch.path);
        if (isWbs) checkWbsFile(ch.path, oldText, newText, ctx, R);
        else if (isLedger) checkLedgerFile(ch.path, oldText, newText, ctx, R);
        else checkDefectTableFile(ch.path, oldText, newText, ctx, R);
    }
    checkWhitelist(ctx, R);
    return {
        label: target.label, sha: target.sha, subject: target.subject,
        agent: identity.agent, agentSource: identity.agentSource,
        lanes: identity.lanes.map(l => l.label), laneSource: identity.laneSource,
        changes: target.changes, rules: R.rules, warnings: R.warnings, ok: !R.failed()
    };
}

function printResult(res) {
    const who = `agent ${res.agent || "unknown"}${res.agentSource ? ` (${res.agentSource})` : ""}, lane ${res.lanes.join(" + ") || "unknown"}${res.laneSource ? ` (${res.laneSource})` : ""}`;
    console.log(`DEUS check_claims: ${res.label}${res.subject ? ` "${res.subject}"` : ""}`);
    console.log(`  ${who}`);
    console.log(`  ${res.changes.length} path(s): ${res.changes.map(c => `${c.status} ${c.path}`).join(", ") || "none"}`);
    let passed = 0, failed = 0;
    for (const [id, r] of Object.entries(res.rules)) {
        if (r.violations.length) {
            failed++;
            console.log(`FAIL ${id} ${r.name}: ${r.violations.length} violation(s)`);
            for (const v of r.violations) console.log(`  - ${v}`);
        } else {
            passed++;
            console.log(`PASS ${id} ${r.name} (${r.checked} checked)`);
        }
    }
    for (const w of res.warnings) console.log(`WARN ${w}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed${failed ? " - commit rejected" : ""}`);
}

// ---------------------------------------------------------------- backfill

function defaultLedgerFiles(root) {
    const out = [];
    const tasks = path.join(root, "tasks");
    if (fs.existsSync(path.join(tasks, "messages.jsonl"))) out.push(path.join(tasks, "messages.jsonl"));
    if (fs.existsSync(tasks)) {
        for (const d of fs.readdirSync(tasks, { withFileTypes: true })) {
            if (!d.isDirectory()) continue;
            for (const f of ["defects.jsonl", "messages.jsonl"]) {
                const p = path.join(tasks, d.name, f);
                if (fs.existsSync(p)) out.push(p);
            }
        }
    }
    const walk = dir => {
        if (!fs.existsSync(dir)) return;
        for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, d.name);
            if (d.isDirectory()) walk(p);
            else if (d.name.endsWith(".jsonl")) out.push(p);
        }
    };
    walk(path.join(root, "docs", "agents", "mailboxes"));
    return out;
}

function checkBackfill(files, opts) {
    const root = git(["rev-parse", "--show-toplevel"]).trim();
    const sources = files.length ? files.map(f => path.resolve(f)) : defaultLedgerFiles(root);
    const burstMs = opts.burstMs;
    const stamps = new Map(), closures = new Map(), flags = [], warnings = [];
    const rel = p => path.relative(root, p).replace(/\\/g, "/");
    const addStamp = (key, s) => { if (!stamps.has(key)) stamps.set(key, s); };
    for (const file of sources) {
        const lines = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
        lines.forEach((l, i) => {
            if (!l.trim()) return;
            const src = `${rel(file)}:${i + 1}`;
            let rec;
            try { rec = JSON.parse(l); } catch (e) { warnings.push(`${src}: unreadable line skipped`); return; }
            if (rec.messageId) {
                const t = Date.parse(rec.timestamp);
                addStamp(`m|${rec.messageId}`, { item: rec.defectId || null, state: statusWord(rec.type), actor: normAgent(rec.from), raw: rec.from, t, src });
                return;
            }
            if (!rec.defectId) return;
            for (const h of rec.history || []) {
                const t = Date.parse(h.timestamp);
                addStamp(`d|${rec.defectId}|${h.state}|${h.by}|${h.timestamp}`, { item: rec.defectId, state: statusWord(h.state), actor: normAgent(h.by), raw: h.by, t, src });
            }
            if (CLOSING.has(statusWord(rec.status))) {
                const closer = closerOf(rec);
                const closed = [...(rec.history || [])].reverse().find(h => CLOSING.has(statusWord(h.state)));
                const at = rec.closedAt || (closed || {}).timestamp;
                if (!closed) addStamp(`d|${rec.defectId}|${statusWord(rec.status)}|${rec.closedBy}|${at}`, { item: rec.defectId, state: statusWord(rec.status), actor: closer, raw: rec.closedBy, t: Date.parse(at), src });
                const key = `${rec.defectId}|${closer}|${at}`;
                if (!closures.has(key)) closures.set(key, { rec, closer, at, src });
            }
        });
    }
    const all = [...stamps.values()].filter(s => !isNaN(s.t)).sort((a, b) => a.t - b.t);
    const iso = t => new Date(t).toISOString();
    const who = s => (s.raw && normAgent(s.raw) !== String(s.raw).toLowerCase() ? `${s.raw} (${s.actor})` : s.actor);

    // B1: two different agents acting on one item less than burstMs apart.
    const byItem = new Map();
    for (const s of all) if (s.item) { if (!byItem.has(s.item)) byItem.set(s.item, []); byItem.get(s.item).push(s); }
    for (const [item, list] of byItem) {
        for (let i = 1; i < list.length; i++) {
            const a = list[i - 1], b = list[i], dt = b.t - a.t;
            if (a.actor && b.actor && a.actor !== b.actor && dt < burstMs) {
                flags.push({ code: "B1", item, msg: `chain burst ${item}: ${a.state} by ${who(a)} at ${iso(a.t)} -> ${b.state} by ${who(b)} at ${iso(b.t)} (${dt} ms) [${a.src}, ${b.src}]` });
            }
        }
    }
    // B2: several items given a certifying stamp less than burstMs apart.
    const cert = all.filter(s => s.item && CERTIFYING.has(s.state));
    let group = [];
    const flush = () => {
        const items = [...new Set(group.map(s => s.item))];
        if (items.length >= 2) {
            const span = group[group.length - 1].t - group[0].t;
            const parts = items.map(it => { const s = group.find(x => x.item === it); return `${s.state} ${it} by ${who(s)} [${s.src}]`; });
            flags.push({ code: "B2", item: items.join(","), msg: `batch burst: ${items.length} items stamped within ${span} ms from ${iso(group[0].t)}: ${parts.join("; ")}` });
        }
        group = [];
    };
    for (const s of cert) {
        if (group.length && s.t - group[group.length - 1].t >= burstMs) flush();
        group.push(s);
    }
    flush();
    // A1-A4: closures without an independent audit trail.
    const head = revParse("HEAD^{commit}");
    const ctx = { facts: makeGitFacts(), bases: head ? [head] : [], newTree: head ? makeTree("commit", head) : makeTree("empty") };
    for (const c of closures.values()) {
        const id = c.rec.defectId, where = `${id} [${c.src}]`;
        const fixers = fixersOf(c.rec, ctx);
        if (!c.closer) flags.push({ code: "A1", item: id, msg: `no closer: ${where} is CLOSED without closedBy` });
        else if (fixers.has(c.closer)) flags.push({ code: "A2", item: id, msg: `self-closed: ${where} closedBy ${c.closer}, a fixer (${[...fixers].join(", ")})` });
        const tClose = Date.parse(c.at);
        const fixTimes = (c.rec.history || []).filter(h => statusWord(h.state) === "FIX_READY").map(h => Date.parse(h.timestamp)).filter(t => !isNaN(t));
        if (isNaN(tClose)) flags.push({ code: "A3", item: id, msg: `no closure time: ${where} has no readable closedAt or CLOSED history timestamp` });
        else if (fixTimes.length && tClose < Math.max(...fixTimes)) flags.push({ code: "A3", item: id, msg: `closed before fixed: ${where} closed at ${c.at}, FIX_READY at ${iso(Math.max(...fixTimes))}` });
        const ev = evidenceOf(JSON.stringify(omit(c.rec, NON_EVIDENCE_FIELDS)), ctx);
        if (!ev.ok) flags.push({ code: "A4", item: id, msg: `no evidence: ${where} ${ev.why}` });
    }
    return { sources: sources.map(rel), stamps: all.length, closures: closures.size, burstMs, flags, warnings, ok: flags.length === 0 };
}

function printBackfill(res) {
    console.log(`DEUS check_claims --check-backfill: ${res.sources.length} source(s), ${res.stamps} stamp(s), ${res.closures} closure(s), burst window ${res.burstMs} ms`);
    for (const s of res.sources) console.log(`  source ${s}`);
    for (const f of res.flags) console.log(`FLAG ${f.code} ${f.msg}`);
    for (const w of res.warnings) console.log(`WARN ${w}`);
    console.log(`RESULT: ${res.flags.length} flag(s)`);
}

// ---------------------------------------------------------------- hook

function hookPath() {
    return path.resolve(process.cwd(), git(["rev-parse", "--git-path", "hooks/pre-commit"]).trim());
}

function installHook(force) {
    const target = hookPath();
    const common = path.resolve(process.cwd(), git(["rev-parse", "--git-common-dir"]).trim());
    const inside = !path.relative(common, target).startsWith("..");
    if (!inside && !force) throw new Error(`hooks resolve outside the repository (${target}; core.hooksPath?); rerun with --force to write there`);
    if (fs.existsSync(target) && !fs.readFileSync(target, "utf8").includes(HOOK_MARKER) && !force) {
        throw new Error(`${target} already holds another hook; rerun with --force to replace it`);
    }
    const script = [
        "#!/bin/sh",
        `# ${HOOK_MARKER} (node tools/governance/check_claims.js --install-hook)`,
        "# Runs this branch's own copy of the checker. Bypass policy: docs/OWNER_DECISIONS.md DEC-004.",
        "root=\"$(git rev-parse --show-toplevel)\" || exit 1",
        "checker=\"$root/tools/governance/check_claims.js\"",
        "if [ ! -f \"$checker\" ]; then",
        "  echo \"DEUS governance: $checker is missing on this branch; commit rejected (merge main first).\" >&2",
        "  exit 1",
        "fi",
        "exec node \"$checker\" --pre-commit",
        ""
    ].join("\n");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, script, { mode: 0o755 });
    fs.chmodSync(target, 0o755);
    console.log(`Installed ${target}`);
    console.log("Every worktree of this repository shares this hook.");
}

function uninstallHook() {
    const target = hookPath();
    if (!fs.existsSync(target)) { console.log(`No hook at ${target}`); return; }
    if (!fs.readFileSync(target, "utf8").includes(HOOK_MARKER)) throw new Error(`${target} is not the DEUS governance hook; left in place`);
    fs.unlinkSync(target);
    console.log(`Removed ${target}`);
}

// ---------------------------------------------------------------- main

function parseArgs(argv) {
    const o = { mode: "pre-commit", commits: [], ranges: [], files: [], lane: null, agent: null, json: false, burstMs: BURST_MS, force: false };
    const need = (i, flag) => { if (argv[i] == null || argv[i].startsWith("--")) throw new Error(`${flag} needs a value`); return argv[i]; };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--pre-commit") o.mode = "pre-commit";
        else if (a === "--commit") { o.mode = "commit"; o.commits.push(need(++i, a)); }
        else if (a === "--range") { o.mode = "commit"; o.ranges.push(need(++i, a)); }
        else if (a === "--check-backfill") o.mode = "backfill";
        else if (a === "--install-hook") o.mode = "install";
        else if (a === "--uninstall-hook") o.mode = "uninstall";
        else if (a === "--lane") o.lane = need(++i, a);
        else if (a === "--agent") o.agent = need(++i, a);
        else if (a === "--json") o.json = true;
        else if (a === "--force") o.force = true;
        else if (a === "--burst-ms") {
            o.burstMs = Number(need(++i, a));
            if (!(o.burstMs >= 0)) throw new Error("--burst-ms needs a number >= 0");
        } else if (a === "-h" || a === "--help") o.mode = "help";
        else if (a.startsWith("-")) throw new Error(`unknown option ${a}`);
        else o.files.push(a);
    }
    if (o.files.length && o.mode !== "backfill") throw new Error(`unexpected argument ${o.files[0]}`);
    return o;
}

function main() {
    let opts;
    try { opts = parseArgs(process.argv.slice(2)); } catch (e) {
        console.error(`check_claims: ${e.message} (see --help)`);
        return 2;
    }
    if (opts.mode === "help") {
        const src = fs.readFileSync(__filename, "utf8");
        console.log(src.slice(src.indexOf("/**"), src.indexOf("*/") + 2));
        return 0;
    }
    try {
        if (opts.mode === "install") { installHook(opts.force); return 0; }
        if (opts.mode === "uninstall") { uninstallHook(); return 0; }
        if (opts.mode === "backfill") {
            const res = checkBackfill(opts.files, opts);
            if (opts.json) console.log(JSON.stringify(res, null, 2)); else printBackfill(res);
            return res.ok ? 0 : 1;
        }
        let targets;
        if (opts.mode === "commit") {
            const revs = [...opts.commits];
            for (const r of opts.ranges) revs.push(...git(["rev-list", "--reverse", r]).split("\n").filter(Boolean));
            targets = revs.map(commitTarget);
        } else {
            targets = [stagedTarget()];
        }
        const facts = makeGitFacts();
        const results = targets.map(t => checkTarget(t, opts, facts));
        const ok = results.every(r => r.ok);
        if (opts.json) console.log(JSON.stringify({ ok, results }, null, 2));
        else results.forEach(printResult);
        if (!opts.json && results.length > 1) console.log(`RESULT (all): ${results.filter(r => r.ok).length} clean, ${results.filter(r => !r.ok).length} rejected`);
        return ok ? 0 : 1;
    } catch (e) {
        console.error(`check_claims: ${e.message}`);
        return 2;
    }
}

if (require.main === module) process.exit(main());

module.exports = {
    parseTables, parseWbs, parseDefectRows, parseLaneMatrix, globToRe, statusWord, normAgent,
    reviewersIn, PASS_OUTCOME_RE, CLOSING, BURST_MS
};
