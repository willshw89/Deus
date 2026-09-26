#!/usr/bin/env node
"use strict";

/**
 * tools/governance/check_claims.js
 *
 * WG.00.12 Lanes C2 and C2b: machine-enforced governance (DEUS Directive 001, 001-A, 001-B, 001-I §C).
 * Checks one commit (the staged index, or existing commits) against rules 4.1-4.4, and scans the
 * defect ledgers and the message bus for backfilled stamps.
 *
 * Status values (statusOf). A status is read after NFKC normalization, with invisible format characters
 * (zero-width, bidi, soft hyphen), accents, emoji, HTML tags, comments and entities, struck-out text and
 * Markdown emphasis (* _ ** __ `) removed, and a "Status:" / "State:" label dropped. In "A -> B" or
 * "A → B" the status is B. A status is non-terminal only when it, every arrow target and every labelled
 * value in the cell is TODO, IN_PROGRESS, REVIEW or BLOCKED or one of their aliases (NON_TERMINAL), and no
 * closure word (TERMINAL_WORDS: DONE, CLOSED, ..., and a check mark or ticked box: ✅ ✔ ✓ ☑ [x]) stands
 * anywhere in the cell, unless negated ("was DONE",
 * "not DONE") or used after an article ("the fixed tools"). Any other value, known or not, blank included,
 * is a closure. A record whose status changes to a closure other than its prior value needs full closure
 * verification: rules 4.1 and 4.2.
 *
 *   4.1 Evidence required. The closing record cites a commit hash (7+ hex) of a commit reachable from the
 *       new commit's parents, or a test run: the path of the script plus the path of a committed log that
 *       records a passing outcome ("exit 0", "N/N passed", "N passed, 0 failed", "RESULT: PASS") and no
 *       failing one. A pass claim typed into the record is not a test run. Every repository path the
 *       record cites must exist in the committed tree (the index, for a staged commit).
 *   4.2 Zero self-certification. Every closer the record names ("closedBy: grok", "verdict: grok",
 *       "reviewed by grok", a Reviewer column) must be a known agent, must not be an owner, a fixer or the
 *       author of a cited work commit, and must be backed: by a review artifact the record cites (a document,
 *       .md / .txt / .json / .log / .yaml, whose name contains review, verdict, verif, signoff or audit, that
 *       is not a status document or ledger, exists in the tree, mentions the record's ID, records no failing
 *       verdict for it (FAIL, REJECTED, CHANGES REQUESTED, ...) and was last committed by a "[closer]" commit
 *       before this one, unless the closer commits it now), or, for closedBy: owner, by a DEC-xxx entry of
 *       docs/OWNER_DECISIONS.md that names the record and is DECIDED in the parent commit. A status document
 *       (WBS, STATUS, AUDIT_LOG, issues) records a closure
 *       somebody else made, so there the closer must be a different agent than the committer. A defect
 *       ledger line is the closer's own signature; a fixer never commits it. "pm" (NON_CLOSERS) is never a
 *       valid closer: the PM records and merges other agents' closures but never reviews or closes work.
 *   4.3 WBS revision and immutability. Adding a leaf needs the header Rev to go up. A WBS keeps a Rev
 *       header and a Revision Log (first column Rev / Revision / Version) whose revisions are contiguous
 *       positive integers ending at the header Rev, and whose old rows are never deleted, rewritten or
 *       back-filled. Every table that lists leaves has a Status column. Leaves are never deleted, renamed
 *       or retitled, and an ID is never used twice. Any other non-status edit to a leaf (owner, scope) also
 *       needs the Rev to go up. A defect ledger is append-only: its old lines stay at its start, unchanged
 *       and in order.
 *   4.4 Single-writer whitelist. Every path the commit touches is in the committer's lane whitelist in
 *       docs/STATUS.md as of the parent commit, so a commit cannot widen its own whitelist; no path is on
 *       the FROZEN / READ-ONLY row. "dir/*" owns the folder and its subfolders. In a merge, only paths that
 *       differ from every parent count as touched, and a merge that touches none passes. In --commit and
 *       --range audits, a commit at or before the governance epoch (GOVERNANCE_EPOCH, the Directive 001-I
 *       base) predates the hook: its 4.4 violations are reported as GRANDFATHERED and do not fail it.
 *       Rules 4.1-4.3 still apply to it. The PM's whitelist is built in (PM_WHITELIST: tasks/<id>/<lane>/BRIEF*.md,
 *       tasks/<id>/<lane>/lane.json, docs/STATUS.md), not read from STATUS, and no STATUS row grants pm a path.
 *   --check-backfill. Flags stamps made in a burst: two agents acting on one item less than
 *       BURST_MS apart (B1), or several items given a certifying stamp less than BURST_MS
 *       apart (B2); and closures without an independent audit trail (A1-A4).
 *
 * Records read:
 *   WBS leaves      rows of every table in docs/**\/*WBS*.md (not docs/archive/) whose first cell starts with
 *                   a leaf ID (WG.00.08, "WG.00.08 (new)"), whatever the table's header says, blockquoted
 *                   tables included. A range row (WG.22.01–25) is one key; replacing it with one row per ID
 *                   is not a deletion. Adding an HTML table (<table>, <tr>, <td>) fails 4.3: it cannot be read.
 *   Defect ledgers  tasks/<task>/defects.jsonl (any letter case), append-only JSON lines
 *                   (tools/agents/defect_router.js). Keys are compared case-insensitively ("Status" is
 *                   "status"); a key given twice, or a "status" and "state" that disagree, make the line
 *                   ambiguous.
 *   Defect tables   rows of every table in docs/STATUS.md, docs/AUDIT_LOG.md and docs/issues/*.md whose
 *                   first cell starts with an ID (ATK-YEAR0-001, A10-1). A Status column that disappears,
 *                   or an added HTML table, fails 4.1.
 *   STATUS prose    every sentence outside a table in docs/STATUS.md that names a leaf or defect ID and a
 *                   closure word ("WG.00.08 is now DONE", "- [x] WG.00.08") claims that closure for each ID it names, unless
 *                   the word is negated, follows an article or is hyphenated to the next word
 *                   ("closed-world census"). Claims already in the parent's prose are not rechecked.
 *
 * Identity is declared, not authenticated:
 *   lane   --lane, else DEUS_LANE, else the branch name task/lane-<x>; in --range audits, a commit
 *          merged by "Merge branch '.../lane-<x>'" or on the first-parent line of a head ref
 *          task/lane-<x> is lane <x>'s
 *   agent  --agent, else DEUS_AGENT, else the lane row's label, else (--commit) the "[agent]"
 *          prefix of the commit subject
 * DEUS_LANE, DEUS_AGENT and the branch apply to the staged commit only, never to --commit audits.
 * An agent without a lane gets the union of that agent's lanes. Neither means rejection.
 * Claude and Fable count as one agent, as do Gemini and Antigravity (CANONICAL_ROLES §2). "pm" is an agent
 * of its own (the PM, Owner directive 0028-AC A0), matched only as a whole name, never inside free text; the
 * grok_pm and grok_bot aliases still mean grok. For pm a branch or range hint never picks the lane.
 *
 * Usage:
 *   node tools/governance/check_claims.js [--pre-commit]            check the staged index
 *   node tools/governance/check_claims.js --commit <rev> [...]      check existing commits
 *   node tools/governance/check_claims.js --range <base>..<head>    gate every commit a push of <head> adds
 *   node tools/governance/check_claims.js --check-backfill [file.jsonl ...]
 *   node tools/governance/check_claims.js --install-hook [--force] | --uninstall-hook
 *   options: --lane <c2b|coordinator|...>  --agent <name>  --epoch <rev|none>  --json  --burst-ms <n>
 *   --epoch may only move the epoch back to an ancestor (or "none"), never grandfather newer commits.
 * The pre-commit hook runs the committed checker (HEAD's copy, else the staged one), never the
 * working-tree file, so an uncommitted edit to this file cannot switch the hook off.
 * Exit: 0 clean, 1 violations or flags, 2 usage or git error.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const BURST_MS = 1000;
// Directive 001-I §C: only these non-terminal states (canonical name: accepted spellings) let a status
// change through without closure verification. Anything else is a closure.
const NON_TERMINAL = {
    TODO: ["TODO", "TO_DO", "PLANNED", "QUEUED", "OPEN", "NEW", "BACKLOG", "NOT_STARTED", "PENDING", "PROPOSED", "DRAFT", "REOPENED"],
    IN_PROGRESS: ["IN_PROGRESS", "ACTIVE", "WIP", "STARTED", "ASSIGNED", "ONGOING", "IN_WORK"],
    REVIEW: ["REVIEW", "IN_REVIEW", "UNDER_REVIEW", "AWAITING_REVIEW", "PENDING_REVIEW", "READY_FOR_REVIEW",
        "FIX_READY", "VERIFY_PENDING", "VERIFY_REQUEST", "CHANGES_REQUESTED"],
    BLOCKED: ["BLOCKED", "ON_HOLD", "SUSPENDED", "PAUSED", "WAITING", "DEFERRED"]
};
const NON_TERMINAL_ALIAS = new Map(Object.entries(NON_TERMINAL).flatMap(([canon, list]) => list.map(w => [w, canon])));
// Words that claim a closure wherever they stand in a status cell or a status sentence.
// CHECKMARK stands for a check-mark glyph or a ticked box ("✅", "✔", "[x]").
const TERMINAL_WORDS = new Set(["DONE", "CLOSED", "COMPLETE", "COMPLETED", "RESOLVED", "FIXED", "VERIFIED", "FROZEN",
    "FINAL", "FINALIZED", "FINALISED", "ACCEPTED", "APPROVED", "FINISHED", "SHIPPED", "DELIVERED", "SUPERSEDED",
    "RETIRED", "CANCELLED", "CANCELED", "WONTFIX", "SIGNED", "CERTIFIED", "CHECKMARK"]);
// A closure word within three words after one of these is not claimed ("was DONE", "until it is DONE").
const NEGATORS = new Set(["NOT", "NO", "NEVER", "CANNOT", "CANT", "WONT", "DONT", "DOESNT", "ISNT", "ARENT", "WASNT",
    "HASNT", "HAVENT", "UNTIL", "BEFORE", "AFTER", "PENDING", "AWAITING", "AWAITS", "WITHOUT", "NOR", "UNLESS", "IF",
    "ONCE", "WHEN", "WAS", "WERE", "FORMERLY", "PREVIOUSLY", "FROM"]);
// A closure word right after one of these describes something else ("the fixed tools").
const DETERMINERS = new Set(["THE", "A", "AN", "THIS", "THAT", "THESE", "THOSE", "ITS", "THEIR", "OUR", "MY", "YOUR",
    "HIS", "HER", "EACH", "EVERY", "ANY", "SOME"]);
const LABEL_WORDS = new Set(["STATUS", "STATE"]);
const CERTIFYING = new Set(["DONE", "CLOSED", "COMPLETE", "COMPLETED", "RESOLVED", "FIXED", "VERIFIED", "FROZEN", "FINAL",
    "ACCEPTED", "APPROVED", "FIX_READY", "VERIFY_PENDING", "VERIFY_REQUEST", "DEFECT_CLOSED"]);
const AGENT_ALIASES = {
    gemini: "gemini", antigravity: "gemini",
    claude: "claude", fable: "claude",
    grok: "grok", grok_pm: "grok", grok_bot: "grok",
    codex: "codex",
    owner: "owner", owner_review: "owner",
    pm: "pm"
};
const KNOWN_AGENTS = [...new Set(Object.values(AGENT_ALIASES))];
// Names that count only where an agent name stands alone ("[pm]", --agent pm, "closedBy: pm"), never as a word
// inside free text: "PM" also stands in clock times and in names such as "PM Grok Bot".
const EXACT_ONLY_AGENTS = new Set(["pm"]);
// The PM (Grok Bot, main chat) opens lanes, launches workers, registers write-set claims and merges since Owner
// directive 0028-AC A0 (2026-09-26 ~01:50 CT). It never reviews or closes work, so it is never a valid closer (4.2).
const NON_CLOSERS = new Set(["pm"]);
// The PM's 4.4 whitelist: the lane-opening files and docs/STATUS.md, where it registers claims. It is built in rather
// than read from a STATUS row, because a [pm] commit may edit STATUS and so could widen what the next [pm] commit
// may touch; STATUS rows never grant pm anything. The FROZEN / READ-ONLY row still applies.
const PM_WHITELIST = ["tasks/*/*/BRIEF*.md", "tasks/*/*/lane.json", "docs/STATUS.md"];
// Verdict words that may follow "verdict:" or "reviewer" without naming anybody.
const REVIEWER_SKIP = new Set([...TERMINAL_WORDS, ...NON_TERMINAL_ALIAS.keys(), "PASS", "PASSED", "FAIL", "FAILED",
    "REJECTED", "CHANGES", "OK", "GO", "NOGO", "SIGN", "SIGN_OFF", "SIGNOFF"]);
const PATHS = {
    status: "docs/STATUS.md",
    decisions: "docs/OWNER_DECISIONS.md",
    checker: "tools/governance/check_claims.js",
    wbs: /^docs\/(?!archive\/)(?:[^/]+\/)*[^/]*WBS[^/]*\.md$/i,
    ledger: /^tasks\/[^/]+\/defects\.jsonl$/i,
    defectTables: /^docs\/(?:STATUS\.md|AUDIT_LOG\.md|issues\/[^/]+\.md)$/
};
// Ledger fields (compared case-insensitively) that describe the defect rather than its closure; everything else is evidence.
const NON_EVIDENCE_FIELDS = ["defectid", "taskid", "title", "requirement", "location", "closurecriterion", "severity", "finder"];
const HOOK_MARKER = "DEUS-GOVERNANCE-HOOK v2";
const HOOK_FAMILY = "DEUS-GOVERNANCE-HOOK";
// Commits at or before this one predate the hardened hook: main when Directive 001-I assigned Lane C2b.
// The coordinator moves it to the hook-install commit when the hook is installed (DEC-004).
const GOVERNANCE_EPOCH = "a12f94a70c1f5c9f2b6ae3f4fcfb2fbe752f9f3d";

const AGENT_RE = new RegExp(`\\b(${Object.keys(AGENT_ALIASES).filter(a => !EXACT_ONLY_AGENTS.has(a)).sort((a, b) => b.length - a.length).join("|")})\\b`, "gi");
const REVIEWER_RE = /\b(?:closed\s*by|closer|reviewer|reviewed\s+by|verified\s+by|verdict(?:\s+by)?|sign(?:ed)?[\s-]*off(?:\s+by)?|approved\s+by|accepted\s+by)\b[\s:=`*"'([]*([A-Za-z][\w-]*)/gi;
const HASH_RE = /\b[0-9a-f]{7,40}\b/gi;
const PATH_RE = /(?:^|[\s`'"(\[<,;=])((?:[\w.@$!+-]+\/)+[\w.@$!+-]+\.[A-Za-z][A-Za-z0-9]{0,9})(?=$|[\s`'")\]>,;:.!?])/g;
const SCRIPT_EXT_RE = /\.(?:js|mjs|cjs|bat|cmd|ps1|sh|py)$/i;
const REVIEW_NAME_RE = /review|verdict|verif|sign-?off|audit/i;
// A review artifact is a document; a script or an image records no verdict.
const REVIEW_DOC_EXT_RE = /\.(?:md|markdown|txt|json|jsonl|log|ya?ml)$/i;
// A verdict value that rejects the work under review.
const FAILING_VERDICT_RE = /^(?:FAIL(?:ED|S|URE)?|REJECT(?:ED|S)?|CHANGES[\s_-]+REQUESTED|NO[\s_-]*GO|NOT[\s_-]+(?:APPROVED|ACCEPTED|PASSED|VERIFIED)|BLOCK(?:ED|ER|S)?|DENIED)\b/i;
const CHECK_MARK_RE = /[✅✓✔☑\u{1F5F8}]|\[\s*[xX]\s*\]/gu;
const HTML_TABLE_RE = /<\s*t(?:able|r|d|h)\b/gi;
const PASS_OUTCOME_RE = /\bexit(?:\s+code)?\s*[:=]?\s*0\b|\b(\d+)\s*\/\s*\1\s+(?:checks?\s+)?pass(?:ed)?\b|\b\d+\s+pass(?:ed)?,\s*0\s+fail(?:ed|ures?)?\b|\bRESULT:\s*PASS\b|(?<!\bnot\s)\bALL\b[^.;|\n]{0,40}\bPASS(?:ED)?\b/i;
const FAIL_OUTCOME_RE = /\b[1-9]\d*\s+fail(?:ed|ures?|ing|s)?\b|\bRESULT:\s*FAIL|\bexit(?:\s+code)?\s*[:=]?\s*[1-9]\d*\b|^\s*FAIL\b|\b(\d+)\s*\/\s*(?!\1\b)\d+\s+(?:checks?\s+)?pass(?:ed)?\b/im;
const LEAF_ID_RE = /^([A-Z]{2,5}\.\d{2})\.(\d{2})(?:\.\d{2})?(?:\s*[–-]\s*(\d{2}))?$/;
// A table row's first cell names a leaf or defect when it starts with the ID ("WG.00.08", "A10-1 (reopened)").
// A sub-item ID ("WG.00.12/C1") is not its parent.
const LEAF_LEAD_RE = /^([A-Z]{2,5}\.\d{2}\.\d{2}(?:\.\d{2})?(?:\s*[–-]\s*\d{2})?)(?![\w.–\-/])/;
const LEAF_ID_SRC = "[A-Z]{2,5}\\.\\d{2}\\.\\d{2}(?:\\s*[–-]\\s*\\d{2})?";
const DEFECT_ID_RE = /^[A-Z][A-Z0-9]*(?:[-.][A-Z0-9]+)+$/i;
const DEFECT_LEAD_RE = /^([A-Z][A-Z0-9]*(?:[-.][A-Z0-9]+)+)(?![\w.\-/])/i;
const DEC_RE = /\bDEC-\d{3,}\b/gi;
const INVISIBLE_RE = /[\p{Cf}\u115F\u1160\u3164\uFFA0\u2800]/gu;
const ARROW = { R: "\u0001", L: "\u0002", B: "\u0003" };
const ARROW_RIGHT_RE = /[\u2192\u21D2\u27F6\u27F9\u2794\u279C-\u279E\u27A1\u21E8\u2B95\u21A6\u27FC\u21FE\u2B62\u21E2\u21C9\u21DB\u21A0\u21A3\u2933]/gu;
const ARROW_LEFT_RE = /[\u2190\u21D0\u27F5\u27F8\u2B05\u21E6\u21A4\u27FB\u2B60\u21E0\u21C7\u21DA\u219E\u21A2]/gu;
const ARROW_ANY_RE = /[\u2190-\u21FF\u27F0-\u27FF\u2900-\u297F\u2B00-\u2B11\u2B30-\u2B4F\u2B60-\u2BBF\u2794-\u27BF\u{1F800}-\u{1F8FF}]/gu;
const ENTITIES = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", rarr: "\u2192", larr: "\u2190", harr: "\u2194" };

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
    const resolved = new Map(), existing = new Map(), ancestry = new Map(), authors = new Map(), touched = new Map(), last = new Map();
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
            return batch(tokens.map(t => `${t}^{commit}`), resolved, line => {
                const m = line.match(/^([0-9a-f]{40,64}) commit /);
                return m ? m[1] : null;
            });
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
        },
        // A commit that only adds or edits review artifacts is a review, not work on the item it reviews.
        reviewOnly(sha) {
            if (!touched.has(sha)) {
                const r = git(["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "--root", sha], { allowFail: true });
                touched.set(sha, r.ok ? splitZ(r.out) : []);
            }
            const paths = touched.get(sha);
            return paths.length > 0 && paths.every(p => REVIEW_NAME_RE.test(path.posix.basename(p)));
        },
        // The newest commit reachable from bases that changed p.
        lastCommit(p, bases) {
            const key = `${bases.join(" ")}|${p}`;
            if (!last.has(key)) {
                let hit = null;
                if (bases.length) {
                    const r = git(["log", "-1", "--format=%H%x09%s", ...bases, "--", p], { allowFail: true });
                    const m = r.ok ? r.out.trim().match(/^([0-9a-f]+)\t(.*)$/) : null;
                    if (m) hit = { sha: m[1], subject: m[2], agent: subjectAgent(m[2]) };
                }
                last.set(key, hit);
            }
            return last.get(key);
        }
    };
}

// ---------------------------------------------------------------- text helpers

// NFKC, accents and combining marks (variation selectors included) removed, invisible format characters removed.
function normText(value) {
    return String(value == null ? "" : value).normalize("NFKD").replace(/\p{M}/gu, "").replace(INVISIBLE_RE, "").normalize("NFKC");
}

function stripEmphasis(s) {
    return s.replace(/[*`]+/g, "").replace(/(^|[^\p{L}\p{N}])_+/gu, "$1").replace(/_+(?=[^\p{L}\p{N}]|$)/gu, "");
}

function clean(cell) {
    return stripEmphasis(normText(cell)).replace(/\s+/g, " ").trim();
}

function decodeEntities(s) {
    return s.replace(/&(#[xX][0-9a-fA-F]{1,6}|#\d{1,7}|[A-Za-z]{2,8});/g, (m, e) => {
        if (e[0] === "#") {
            const cp = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return cp > 0 && cp <= 0x10FFFF && !(cp >= 0xD800 && cp <= 0xDFFF) ? String.fromCodePoint(cp) : " ";
        }
        const k = e.toLowerCase();
        return Object.prototype.hasOwnProperty.call(ENTITIES, k) ? ENTITIES[k] : m;
    });
}

// What a reader sees in a status cell: struck-out text, HTML comments and tags gone, entities decoded, normalized.
function plainStatusText(value) {
    const s = String(value == null ? "" : value)
        .replace(/<!--[\s\S]*?(?:-->|$)/g, " ")
        .replace(/<(s|del|strike)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
        .replace(/(~~?)(?![~\s])([^~]*?[^~\s])\1(?!~)/g, " ")
        .replace(/<br\s*\/?>/gi, " / ")
        .replace(/<\/?[A-Za-z][^>]*>/g, " ");
    return stripEmphasis(normText(decodeEntities(s)));
}

// Splits a status cell into phrases (runs of words joined by spaces, "_" or "-"), noting which phrases
// an arrow leads from or to and which follow a "Status:" label.
function statusPhrases(value) {
    const s = plainStatusText(value).toUpperCase()
        .replace(CHECK_MARK_RE, " ; CHECKMARK ; ")
        .replace(/(\p{L})['\u2019](?=\p{L})/gu, "$1")
        .replace(/<-+>|<=+>/g, ` ${ARROW.B} `)
        .replace(/-+>|=+>|>>|~>/g, ` ${ARROW.R} `)
        .replace(/<-+|<=+|<</g, ` ${ARROW.L} `)
        .replace(ARROW_RIGHT_RE, ` ${ARROW.R} `)
        .replace(ARROW_LEFT_RE, ` ${ARROW.L} `)
        .replace(ARROW_ANY_RE, ` ${ARROW.B} `)
        .replace(/[\p{So}\p{Sk}\p{Extended_Pictographic}]/gu, " ");
    const toks = s.match(/[\u0001-\u0003]|[\p{L}\p{N}]+|[\s_-]+|[^\p{L}\p{N}\s_\u0001-\u0003-]+/gu) || [];
    const items = [];
    for (const t of toks) {
        const lastItem = items[items.length - 1];
        if (/^[\p{L}\p{N}]+$/u.test(t)) {
            if (lastItem && lastItem.words && lastItem.open) lastItem.words.push(t);
            else items.push({ words: [t], joins: [], open: true });
        } else if (/^[\s_-]+$/.test(t)) {
            if (lastItem && lastItem.words && lastItem.open) lastItem.joins[lastItem.words.length - 1] = t;
        } else {
            if (lastItem && lastItem.words) lastItem.open = false;
            if (lastItem && lastItem.gap) lastItem.gap.push(t); else items.push({ gap: [t] });
        }
    }
    const phrases = [];
    items.forEach((it, i) => {
        if (!it.words) return;
        const before = items[i - 1], after = items[i + 1];
        phrases.push({ words: it.words, joins: it.joins, prev: before ? before.gap[before.gap.length - 1] : null, next: after ? after.gap[0] : null });
    });
    phrases.forEach((p, i) => {
        p.from = p.next === ARROW.R || p.prev === ARROW.L;
        p.strong = p.prev === ARROW.R || p.prev === ARROW.B || p.next === ARROW.L || p.next === ARROW.B;
        const w = p.words;
        if (LABEL_WORDS.has(w[w.length - 1]) && w.length <= 3 && p.next && /[:=]/.test(p.next)) {
            p.label = true;
            if (phrases[i + 1]) phrases[i + 1].strong = true;
        } else if (i === 0 && LABEL_WORDS.has(w[0]) && w.length > 1) {
            p.words = w.slice(1);
            p.joins = p.joins.slice(1);
            p.strong = true;
        }
    });
    return phrases;
}

// { word, canon, terminal }. prose: a sentence of running text, where only closure words count.
function statusOf(value, opts = {}) {
    const prose = Boolean(opts.prose);
    const active = statusPhrases(value).filter(p => !p.from && !p.label);
    const joined = p => p.words.join("_");
    const terminal = w => ({ word: w, canon: w, terminal: true });
    const primary = active[0] || null;
    if (!prose) {
        if (!primary) return terminal("(EMPTY)");
        if (!NON_TERMINAL_ALIAS.has(joined(primary))) return terminal(joined(primary));
        for (const p of active) if (p.strong && !NON_TERMINAL_ALIAS.has(joined(p))) return terminal(joined(p));
    }
    for (const p of active) {
        for (let i = 0; i < p.words.length; i++) {
            if (!TERMINAL_WORDS.has(p.words[i])) continue;
            if (i > 0 && DETERMINERS.has(p.words[i - 1])) continue;
            // In running text "closed-world census" is a modifier, not a status.
            if (prose && i + 1 < p.words.length && /^-+$/.test(p.joins[i] || "")) continue;
            if (p.words.slice(Math.max(0, i - 3), i).some(w => NEGATORS.has(w))) continue;
            return terminal(p.words[i]);
        }
    }
    if (prose) return { word: null, canon: null, terminal: false };
    return { word: joined(primary), canon: NON_TERMINAL_ALIAS.get(joined(primary)), terminal: false };
}

function statusWord(value) {
    return statusOf(value).word;
}

function statusOfCells(cells) {
    const all = cells.map(c => statusOf(c));
    return all.find(s => s.terminal) || all[0];
}

function normAgent(name) {
    if (name == null) return null;
    const s = normText(name).trim().toLowerCase();
    if (!s) return null;
    if (Object.prototype.hasOwnProperty.call(AGENT_ALIASES, s)) return AGENT_ALIASES[s];
    const m = s.match(new RegExp(AGENT_RE.source, "i"));
    return m ? AGENT_ALIASES[m[1].toLowerCase()] : s;
}

// A closer must be exactly one known agent ("grok", "Grok (PM)", "[grok]"); anything else is not an agent.
function strictAgent(value) {
    if (value == null || typeof value === "object") return null;
    const m = clean(value).toLowerCase().match(/^[[("'\s]*([a-z][a-z_]*)[\])"'\s]*(?:\([^()]*\))?[\s.,;:!]*$/);
    return m && Object.prototype.hasOwnProperty.call(AGENT_ALIASES, m[1]) ? AGENT_ALIASES[m[1]] : null;
}

function subjectAgent(subject) {
    const m = String(subject || "").match(/^\s*\[([^\]]+)\]/);
    return m ? normAgent(m[1]) : null;
}

function agentsIn(text) {
    const out = new Set();
    for (const m of normText(text).matchAll(AGENT_RE)) out.add(AGENT_ALIASES[m[1].toLowerCase()]);
    return out;
}

// The closers a record names, in its reviewer column(s) and its text: known agents, and names that are not agents.
function reviewersIn(text, reviewerCells) {
    const valid = new Set(), invalid = [];
    const add = raw => {
        const a = strictAgent(raw);
        if (a) valid.add(a);
        else if (!invalid.includes(raw)) invalid.push(raw);
    };
    for (const cell of reviewerCells || []) {
        const c = clean(cell);
        if (!c || /^[-–—]+$/.test(c)) continue;
        for (const part of c.split(/\s*(?:[,/&;+]|\band\b)\s*/i)) if (part) add(part);
    }
    for (const m of normText(text).matchAll(REVIEWER_RE)) {
        if (REVIEWER_SKIP.has(m[1].toUpperCase().replace(/-/g, "_"))) continue;
        add(m[1]);
    }
    return { valid, invalid };
}

function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------- tables

function splitRow(line) {
    let t = String(line == null ? "" : line).trim();
    if (!/(?<!\\)\|/.test(t)) return null;
    if (t.startsWith("|")) t = t.slice(1);
    if (t.endsWith("|") && !t.endsWith("\\|")) t = t.slice(0, -1);
    return t.split(/(?<!\\)\|/).map(c => c.trim());
}

// A line without its blockquote markers: a table inside "> " renders like any other.
function unquote(line) {
    return line == null ? line : String(line).replace(/^\s{0,3}(?:>\s?)+/, "");
}

// Every GitHub-flavoured table (leading pipe optional, blockquoted or not) outside code fences.
function parseTables(text) {
    const lines = String(text == null ? "" : text).replace(/\r\n?/g, "\n").split("\n");
    const tables = [], tableLines = new Set();
    let cur = null, fence = null;
    for (let i = 0; i < lines.length; i++) {
        const f = lines[i].match(/^\s{0,3}(`{3,}|~{3,})/);
        if (f) {
            if (!fence) fence = f[1][0]; else if (f[1][0] === fence) fence = null;
            cur = null;
            continue;
        }
        if (fence) continue;
        const cells = splitRow(unquote(lines[i]));
        if (cur) {
            if (cells) { cur.rows.push({ cells, line: i + 1, text: lines[i] }); tableLines.add(i + 1); continue; }
            cur = null;
        }
        if (!cells) continue;
        const next = splitRow(unquote(lines[i + 1]));
        if (next && next.length && next.every(c => /^:?-+:?$/.test(c))) {
            cur = { header: cells.map(clean), line: i + 1, rows: [] };
            tables.push(cur);
            tableLines.add(i + 1);
            tableLines.add(i + 2);
            i++;
        }
    }
    return { tables, lines, tableLines };
}

// HTML table tags (<table>, <tr>, <td>, <th>): records in them are not read, so a document may not add them.
function htmlTableCount(text) {
    return (String(text == null ? "" : text).match(HTML_TABLE_RE) || []).length;
}

const isStatusHeader = h => /\b(?:status|state|progress)\b/i.test(h);
const isOwnerHeader = h => /owner|writer|author|assignee/i.test(h) && !/whitelist/i.test(h);
const isTitleHeader = h => /title|leaf name|^name$/i.test(h);
const isReviewerHeader = h => /review|closed\s*by|closer|verifier|verdict|sign-?off/i.test(h);
const isRecordStateHeader = h => isStatusHeader(h) || /commit|\bref\b|evidence|review|verdict|closed|closer|verifier|sign-?off/i.test(h);
const isRevHeader = h => /^(?:rev(?:ision)?|ver(?:sion)?)\.?(?:\s*(?:#|no\.?|number))?$/i.test(h);
// One column naming both ("Writer → Reviewer"): its cells read "Claude → Grok".
const isPairHeader = h => isOwnerHeader(h) && isReviewerHeader(h);

function columns(header, test) {
    return header.map((h, i) => i).filter(i => i > 0 && test(header[i]));
}

// "Claude → Grok" -> ["Claude", "Grok"]: writer before the arrow, reviewer after; no arrow, no reviewer.
function splitPair(cell) {
    const m = normText(cell).match(/^(.*?)\s*(?:->|=>|[→⇒⟶➔➜-➞➡])\s*(.*)$/u);
    return m ? [m[1], m[2]] : [normText(cell), ""];
}

// Owners and reviewer cells of a row: pure owner / reviewer columns plus both halves of any pair column.
function rowPeople(header, cells) {
    const pairs = columns(header, isPairHeader);
    const oi = header.findIndex(h => isOwnerHeader(h) && !isPairHeader(h));
    const owners = new Set(oi >= 0 ? agentsIn(cells[oi]) : []);
    for (const i of pairs) for (const a of agentsIn(splitPair(cells[i] || "")[0])) owners.add(a);
    const reviewerCells = [...columns(header, h => isReviewerHeader(h) && !isPairHeader(h)).map(i => cells[i] || ""),
        ...pairs.map(i => splitPair(cells[i] || "")[1])];
    return { owners, reviewerCells };
}

// ---------------------------------------------------------------- WBS

// "WG.00.08" or "WG.00.08 (new)" -> "WG.00.08"; "WG.22.01–25" or "WG.22.01-25" -> "WG.22.01–25"; anything else -> null.
function leafKey(cell) {
    const lead = cell.match(LEAF_LEAD_RE);
    const m = lead && lead[1].match(LEAF_ID_RE);
    if (!m) return null;
    return m[3] ? `${m[1]}.${m[2]}–${m[3]}` : lead[1];
}

// "A10-1" or "**ATK-19B-002** (reopened)" -> "A10-1" / "ATK-19B-002"; anything else -> null.
function defectKey(cell) {
    const m = cell.match(DEFECT_LEAD_RE);
    return m && DEFECT_ID_RE.test(m[1]) ? m[1].toUpperCase() : null;
}

function rangeIds(key) {
    const m = key.match(/^([A-Z]{2,5}\.\d{2})\.(\d{2})–(\d{2})$/);
    if (!m) return [];
    const ids = [];
    for (let n = Number(m[2]); n <= Number(m[3]) && ids.length < 100; n++) ids.push(`${m[1]}.${String(n).padStart(2, "0")}`);
    return ids;
}

function idForms(id) {
    const up = String(id).toUpperCase();
    return [...new Set([up, up.replace(/–/g, "-"), ...rangeIds(up)])];
}

// The Revision Log: every table whose first column is Rev / Revision / Version, plus any "Revision Log"
// section that lacks one. rows: Rev -> { line, text }.
function parseRevisionLog(parsed) {
    const { tables, lines } = parsed;
    const out = { found: false, rows: new Map(), problems: [], max: null };
    const revTables = tables.filter(t => t.header.length && isRevHeader(t.header[0]));
    lines.forEach((l, i) => {
        if (!/^\s{0,3}#{1,6}\s/.test(l) || !/\b(?:revision\s+(?:log|history)|change\s*log|changelog)\b/i.test(normText(l))) return;
        const next = lines.findIndex((x, j) => j > i && /^\s{0,3}#{1,6}\s/.test(x));
        const end = next < 0 ? lines.length : next;
        if (!revTables.some(t => t.line > i + 1 && t.line <= end)) {
            out.problems.push(`the "${clean(l).replace(/^#+\s*/, "")}" section (line ${i + 1}) has no table whose first column is Rev / Revision / Version (missing or renamed)`);
        }
    });
    for (const t of revTables) {
        out.found = true;
        for (const r of t.rows) {
            const c = clean(r.cells[0]);
            const m = c.match(/^v?(\d+)$/i);
            if (!m) { out.problems.push(`Revision Log line ${r.line}: "${c}" is not a revision number`); continue; }
            const n = Number(m[1]);
            if (n < 1) { out.problems.push(`Revision Log line ${r.line}: Rev ${n} is not a positive integer`); continue; }
            if (out.rows.has(n)) { out.problems.push(`Revision Log line ${r.line}: Rev ${n} appears twice`); continue; }
            out.rows.set(n, { line: r.line, text: r.cells.map(clean).join(" | ") });
        }
    }
    const revs = [...out.rows.keys()].sort((a, b) => a - b);
    for (let i = 1; i < revs.length; i++) {
        if (revs[i] !== revs[i - 1] + 1) out.problems.push(`the Revision Log skips from Rev ${revs[i - 1]} to Rev ${revs[i]}; revisions are contiguous`);
    }
    if (revs.length) out.max = revs[revs.length - 1];
    return out;
}

function parseWbs(text) {
    const out = { rev: null, leaves: new Map(), occ: [], dups: [], revLog: { found: false, rows: new Map(), problems: [], max: null }, problems: [] };
    if (text == null) return out;
    const parsed = parseTables(text);
    for (const l of parsed.lines) {
        if (/^\s{0,3}##\s/.test(l)) break;
        const m = normText(l).match(/^\s*(?:\*\*)?Rev(?:ision)?(?::\*\*|\*\*:|\*\*|:)?\s*(\d+)\b/i);
        if (m) { out.rev = Number(m[1]); break; }
    }
    out.revLog = parseRevisionLog(parsed);
    out.problems.push(...out.revLog.problems);
    for (const t of parsed.tables) {
        const h = t.header;
        if (h.length && isRevHeader(h[0])) continue;
        const rows = t.rows.map(r => ({ r, id: leafKey(clean(r.cells[0])) })).filter(x => x.id);
        if (!rows.length) continue;
        const si = columns(h, isStatusHeader);
        if (!si.length) {
            out.problems.push(`the table at line ${t.line} lists leaves (${rows.slice(0, 3).map(x => x.id).join(", ")}${rows.length > 3 ? ", ..." : ""}) but has no Status column (missing or renamed)`);
        }
        const ti = h.findIndex(isTitleHeader);
        // Status and evidence columns change with a closure; every other column except the ID
        // (compared as the key) is the leaf's identity.
        const sigCols = h.map((x, i) => i).filter(i => i > 0 && !isRecordStateHeader(h[i]));
        for (const { r, id } of rows) {
            const people = rowPeople(h, r.cells);
            const leaf = {
                id, line: r.line, text: r.text, k: out.occ.filter(x => x.id === id).length,
                title: ti >= 0 ? clean(r.cells[ti]) : "",
                owners: people.owners,
                status: si.length ? statusOfCells(si.map(i => r.cells[i])) : null,
                reviewerCells: people.reviewerCells,
                sig: JSON.stringify(sigCols.map(i => clean(r.cells[i])))
            };
            out.occ.push(leaf);
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

// ---------------------------------------------------------------- defect tables, ledgers, prose, decisions

function parseDefectRows(text) {
    const out = { occ: [] };
    if (text == null) return out;
    for (const t of parseTables(text).tables) {
        const h = t.header;
        if (h.length && isRevHeader(h[0])) continue;
        const si = columns(h, isStatusHeader);
        for (const r of t.rows) {
            const id = defectKey(clean(r.cells[0]));
            if (!id) continue;
            out.occ.push({ id, k: out.occ.filter(x => x.id === id).length, line: r.line, text: r.text,
                status: si.length ? statusOfCells(si.map(i => r.cells[i])) : null, reviewerCells: rowPeople(h, r.cells).reviewerCells });
        }
    }
    return out;
}

function normKey(k) {
    return normText(k).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Keys lower-cased with punctuation removed, at every depth ("closedBy", "Closed_By" -> "closedby").
function normRecord(v) {
    if (Array.isArray(v)) return v.map(normRecord);
    if (v && typeof v === "object") {
        const o = {};
        for (const [k, x] of Object.entries(v)) { const nk = normKey(k); if (!(nk in o)) o[nk] = normRecord(x); }
        return o;
    }
    return v;
}

// Keys that one JSON object gives more than once, compared as normKey does. JSON.parse keeps only the last.
function jsonKeyConflicts(line) {
    const stack = [], out = [];
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === "\"") {
            let j = i + 1;
            while (j < line.length && line[j] !== "\"") j += line[j] === "\\" ? 2 : 1;
            let k = j + 1;
            while (k < line.length && /\s/.test(line[k])) k++;
            const top = stack[stack.length - 1];
            if (line[k] === ":" && top && top.keys) {
                let key;
                try { key = JSON.parse(line.slice(i, j + 1)); } catch (e) { key = line.slice(i + 1, j); }
                const nk = normKey(key);
                if (top.keys.has(nk)) { if (!out.includes(nk)) out.push(nk); } else top.keys.add(nk);
            }
            i = j;
        } else if (c === "{") stack.push({ keys: new Set() });
        else if (c === "[") stack.push({});
        else if (c === "}" || c === "]") stack.pop();
    }
    return out;
}

function jsonLines(text) {
    return String(text == null ? "" : text).replace(/\r\n?/g, "\n").split("\n")
        .map((t, i) => ({ text: t, line: i + 1 })).filter(l => l.text.trim());
}

function omit(obj, keys) {
    const o = {};
    for (const k of Object.keys(obj)) if (!keys.includes(k)) o[k] = obj[k];
    return o;
}

// Status sentences outside tables: every closure word in a sentence that names an ID claims it for that ID.
function proseClaims(text, known) {
    if (text == null) return [];
    const { lines, tableLines } = parseTables(text);
    const ids = [...known].sort((a, b) => b.length - a.length).map(escapeRe);
    const idRe = new RegExp(`(?<![\\w.-])(?:${[LEAF_ID_SRC, ...ids].join("|")})(?![\\w-]|\\.\\w)`, "gi");
    const out = [];
    lines.forEach((line, i) => {
        if (tableLines.has(i + 1)) return;
        for (const sentence of normText(line).split(/[.;!?](?=\s|$)/)) {
            const found = [...new Set([...sentence.matchAll(idRe)].map(m => m[0].toUpperCase()))];
            if (!found.length) continue;
            const st = statusOf(sentence.replace(idRe, " ITEMREF "), { prose: true });
            if (st.terminal) for (const id of found) out.push({ id, word: st.word, line: i + 1, text: line });
        }
    });
    return out;
}

// docs/OWNER_DECISIONS.md: "### Decision `DEC-001`: ..." headings, each with a "Status:" line.
// text: the entry's heading and body, normalized and upper-cased, for the items it rules on.
function parseDecisions(text) {
    const out = new Map();
    if (text == null) return out;
    let cur = null;
    for (const line of String(text).replace(/\r\n?/g, "\n").split("\n")) {
        if (/^\s{0,3}#{1,6}\s/.test(line)) {
            const m = normText(line).match(/\bDEC-\d{3,}\b/i);
            cur = m && !out.has(m[0].toUpperCase()) ? { id: m[0].toUpperCase(), status: "", text: "" } : null;
            if (cur) out.set(cur.id, cur);
        }
        if (cur) cur.text += `${normText(line).toUpperCase()}\n`;
        if (/^\s{0,3}#{1,6}\s/.test(line)) continue;
        if (cur && !cur.status) {
            const s = plainStatusText(line).match(/^\s*[-+]?\s*status\s*:\s*(.+)$/i);
            if (s) cur.status = s[1].trim().toUpperCase();
        }
    }
    return out;
}

// ---------------------------------------------------------------- whitelist matrix

// "dir/*" and "dir/" own the folder and its subfolders; "*" anywhere else stays inside one path segment.
function globToRe(glob, flags) {
    if (/^[A-Za-z]:[\\/]/.test(glob) || glob.startsWith("/") || glob.includes("\\")) return null;
    let g = glob.replace(/^\.\//, "");
    const subtree = /\/\*{1,2}$/.test(g) || g.endsWith("/");
    if (subtree) g = g.replace(/\*+$/, "");
    let re = "";
    for (let i = 0; i < g.length; i++) {
        const c = g[i];
        if (c === "*" && g[i + 1] === "*") {
            if (g[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i++; }
        } else if (c === "*") re += "[^/]*";
        else if (c === "?") re += "[^/]";
        else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
    if (subtree) re += ".+";
    return new RegExp(`^${re}$`, flags);
}

// Every table in STATUS whose header names a whitelist; a second table cannot hide lanes or frozen paths.
function parseLaneMatrix(text) {
    if (text == null) return null;
    const ts = parseTables(text).tables.filter(x => x.header.some(h => /whitelist/i.test(h)));
    if (!ts.length) return null;
    const lanes = [], frozen = [];
    for (const t of ts) {
        const pi = t.header.findIndex(h => /whitelist/i.test(h));
        const wi = t.header.findIndex(h => /writer|owner/i.test(h) && !/whitelist/i.test(h));
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
    }
    return { lanes, frozen };
}

// The parsed STATUS matrix plus the built-in PM lane (PM_WHITELIST). With no STATUS matrix there is nothing to add to:
// 4.4 then fails for every committer, the PM included.
function withBuiltInLanes(matrix) {
    if (!matrix) return matrix;
    const pm = { label: "PM (built-in whitelist)", key: "pm", agents: new Set(["pm"]), builtIn: true,
        globs: PM_WHITELIST.map(g => ({ raw: g, re: globToRe(g, ""), reI: globToRe(g, "i") })) };
    return { lanes: [...matrix.lanes, pm], frozen: matrix.frozen };
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
    } else if (ctx.laneHint) { laneKey = ctx.laneHint.lane; laneSource = ctx.laneHint.source; }
    let agentRaw = null, agentSource = null;
    if (opts.agent) { agentRaw = opts.agent; agentSource = "--agent"; }
    else if (env.DEUS_AGENT) { agentRaw = env.DEUS_AGENT; agentSource = "DEUS_AGENT"; }
    else if (ctx.subject && subjectAgent(ctx.subject)) { agentRaw = subjectAgent(ctx.subject); agentSource = "commit subject"; }
    let agent = normAgent(agentRaw);
    // The PM opens every lane on that lane's own branch, so a branch name or a merge / head-ref hint never names the
    // PM's lane. Only an explicit --lane or DEUS_LANE does.
    if (agent === "pm" && laneKey && laneSource !== "--lane" && laneSource !== "DEUS_LANE") { laneKey = null; laneSource = null; }
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
        label, rules, warnings: [], grandfathered: [],
        count(rule, n = 1) { rules[rule].checked += n; },
        fail(rule, msg) { rules[rule].violations.push(msg); },
        grandfather(rule, msg) { this.grandfathered.push(`${rule} ${msg}`); },
        warn(msg) { this.warnings.push(msg); },
        failed() { return Object.values(rules).some(r => r.violations.length); }
    };
}

// ---------------------------------------------------------------- rules 4.1 and 4.2

function citedPaths(text) {
    return [...new Set([...String(text).matchAll(PATH_RE)].map(m => m[1].replace(/^\.\//, "")))];
}

function evidenceOf(text, ctx) {
    const G = ctx.facts, s = String(text);
    const tokens = [...new Set((s.match(HASH_RE) || []).map(t => t.toLowerCase()))].slice(0, 40);
    const shas = G.resolveCommits(tokens);
    const commits = [];
    tokens.forEach((t, i) => {
        if (!shas[i]) return;
        commits.push({ token: t, sha: shas[i], author: G.commitAuthor(shas[i]), reviewOnly: G.reviewOnly(shas[i]),
            reachable: ctx.bases.some(b => G.isAncestor(shas[i], b)) });
    });
    const paths = citedPaths(s);
    const present = G.exists(paths.map(p => ctx.newTree.objectName(p)));
    const missing = paths.filter((p, i) => !present[i]);
    const existing = paths.filter((p, i) => present[i]);
    const scripts = existing.filter(p => SCRIPT_EXT_RE.test(p));
    const logs = existing.filter(p => !SCRIPT_EXT_RE.test(p) && !REVIEW_NAME_RE.test(path.posix.basename(p)));
    const passing = logs.filter(p => { const t = ctx.newTree.read(p) || ""; return PASS_OUTCOME_RE.test(t) && !FAIL_OUTCOME_RE.test(t); });
    const testRun = scripts.length > 0 && passing.length > 0;
    const ok = missing.length === 0 && (commits.some(c => c.reachable) || testRun);
    const why = [];
    if (missing.length) why.push(`cites ${missing.join(", ")}, which does not exist in the committed tree`);
    if (!ok) {
        const unreachable = commits.filter(c => !c.reachable).map(c => c.token);
        if (unreachable.length) why.push(`cites ${unreachable.join(", ")}, which is not reachable from the parent commit(s)`);
        const bogus = tokens.filter((t, i) => !shas[i] && /\d/.test(t) && /[a-f]/.test(t));
        if (bogus.length) why.push(`${bogus.join(", ")} is not a commit in this repository`);
        if (scripts.length && !passing.length) {
            why.push(PASS_OUTCOME_RE.test(s)
                ? `claims a passing run of ${scripts.join(", ")} only as text; commit the run's log and cite its path`
                : `cites ${scripts.join(", ")} without a committed log that records a passing run`);
        }
        const failing = logs.filter(p => !passing.includes(p));
        if (failing.length && !passing.length) why.push(`${failing.join(", ")} records no passing run`);
        if (passing.length && !scripts.length) why.push(`cites the log ${passing.join(", ")} but not the script that produced it`);
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

// Why p cannot be a closer's review artifact, or null. Status documents and ledgers record closures and
// every lane writes to them, so their last committer did not write what they say about an item.
function reviewDocProblem(p) {
    if (PATHS.wbs.test(p) || PATHS.ledger.test(p) || PATHS.defectTables.test(p) || p === PATHS.decisions) {
        return "is a status document or ledger that every lane writes to, not a review artifact";
    }
    if (!REVIEW_DOC_EXT_RE.test(p)) return "is not a document (.md / .txt / .json / .log / .yaml), so it records no verdict";
    return null;
}

// The first failing verdict an artifact records for id, or null: a "Verdict: ..." line (or the line under a
// "Verdict" heading) unless it is scoped to other items ("Verdict for WG.00.09: FAIL"; "Verdict on
// 2026-09-25: FAIL" names no item, so it is not scoped), or a table row naming id whose Verdict / Result /
// Outcome cell fails.
function failingVerdict(body, id) {
    const forms = idForms(id);
    const names = s => { const u = normText(s).toUpperCase(); return forms.some(f => u.includes(f)); };
    const namesAnItem = s => /\b[A-Z]{2,5}\.\d{2}\.\d{2}\b|\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+\b/.test(normText(s));
    const bare = s => stripEmphasis(normText(s)).replace(/^[\s>#:=.|\-–—]+/, "").trim();
    const { tables, lines, tableLines } = parseTables(body);
    for (let i = 0; i < lines.length; i++) {
        if (tableLines.has(i + 1)) continue;
        const m = stripEmphasis(normText(lines[i])).match(/\bverdicts?\b(.*)$/i);
        if (!m) continue;
        let rest = m[1];
        const scope = rest.match(/^\s*(?:for|on|of)\b([^:]*):(.*)$/i);
        if (scope && namesAnItem(scope[1])) {
            if (!names(scope[1])) continue;
            rest = scope[2];
        } else if (scope) rest = scope[2];
        let value = bare(rest.replace(/^\s*(?:is|was|by\s+[\w-]+)\b/i, ""));
        if (!value && /^\s{0,3}#{1,6}\s/.test(lines[i])) {
            const next = lines.slice(i + 1).find(l => l.trim());
            value = next ? bare(next) : "";
        }
        if (FAILING_VERDICT_RE.test(value)) return { line: i + 1, text: clean(lines[i]).slice(0, 80) };
    }
    for (const t of tables) {
        const vi = t.header.findIndex(h => /verdict|result|outcome/i.test(h));
        if (vi < 0) continue;
        for (const r of t.rows) {
            if (r.cells.some(names) && FAILING_VERDICT_RE.test(bare(r.cells[vi] || ""))) return { line: r.line, text: clean(r.text).slice(0, 80) };
        }
    }
    return null;
}

// A review artifact the record cites, written by the closer, that names the record and does not reject it.
function reviewArtifact(reviewer, id, text, ctx) {
    const named = citedPaths(text).filter(p => REVIEW_NAME_RE.test(path.posix.basename(p)));
    if (!named.length) return { ok: false, why: `cites no review artifact (a committed *review* / *verdict* / *audit* file by [${reviewer}]); a typed closedBy is not evidence` };
    const why = [];
    const cands = named.filter(p => {
        const bad = reviewDocProblem(p);
        if (bad) why.push(`${p} ${bad}`);
        return !bad;
    });
    const present = ctx.facts.exists(cands.map(p => ctx.newTree.objectName(p)));
    for (let i = 0; i < cands.length; i++) {
        const p = cands[i];
        if (!present[i]) { why.push(`${p} does not exist in the committed tree`); continue; }
        if (ctx.changedPaths.has(p)) {
            if (ctx.agent !== reviewer) { why.push(`${p} is written by this commit (${ctx.agent || "unknown agent"}), not by ${reviewer}`); continue; }
        } else {
            const last = ctx.facts.lastCommit(p, ctx.bases);
            if (!last || last.agent !== reviewer) { why.push(`${p} was last committed by ${last ? `"${last.subject}"` : "no commit"}, not by a [${reviewer}] commit`); continue; }
        }
        const raw = ctx.newTree.read(p) || "";
        const body = normText(raw).toUpperCase();
        if (!idForms(id).some(f => body.includes(f))) { why.push(`${p} does not mention ${id}`); continue; }
        const verdict = failingVerdict(raw, id);
        if (verdict) { why.push(`${p} records a failing verdict for ${id} (line ${verdict.line}: "${verdict.text}")`); continue; }
        return { ok: true, path: p };
    }
    return { ok: false, why: why.join("; ") };
}

// closedBy: owner stands only on a DECIDED entry of docs/OWNER_DECISIONS.md, as of the parent commit, that
// names the record: any decided question is not a ruling on this one.
function ownerDecision(id, text, ctx) {
    const ids = [...new Set((normText(text).match(DEC_RE) || []).map(d => d.toUpperCase()))];
    if (!ids.length) return { ok: false, why: `closedBy owner cites no DEC-xxx entry of ${PATHS.decisions}` };
    const why = [];
    for (const d of ids) {
        const e = ctx.decisions.get(d);
        if (!e) { why.push(`${d} is not an entry of ${PATHS.decisions} in the parent commit`); continue; }
        if (!/\bDECIDED\b/.test(e.status)) { why.push(`${d} is "${e.status || "without a status"}", not DECIDED`); continue; }
        if (!idForms(id).some(f => e.text.includes(f))) { why.push(`${d} is DECIDED but does not mention ${id}`); continue; }
        return { ok: true, id: d };
    }
    return { ok: false, why: why.join("; ") };
}

function backing(reviewer, id, text, ctx) {
    if (reviewer === "owner") return ownerDecision(id, text, ctx);
    return reviewArtifact(reviewer, id, text, ctx);
}

// A closure recorded in a status document (WBS leaf, STATUS / AUDIT_LOG / issues row, STATUS sentence).
function verifyStatusDocClosure(where, id, text, owners, reviewerCells, ctx, R) {
    const ev = requireEvidence(where, text, ctx, R);
    R.count("4.2");
    const work = new Set(owners);
    for (const c of ev.commits) if (c.author && !c.reviewOnly) work.add(c.author);
    const list = [...work].join(", ") || "none";
    const { valid, invalid } = reviewersIn(text, reviewerCells);
    if (invalid.length) R.fail("4.2", `${where}: names ${invalid.join(", ")} as closer, which is not a known agent (${KNOWN_AGENTS.join(", ")})`);
    const barred = [...valid].filter(a => NON_CLOSERS.has(a));
    if (barred.length) {
        R.fail("4.2", `${where}: names ${barred.join(", ")} as closer; the PM opens lanes, records claims and merges, but never reviews or closes work (0028-AC A0)`);
        for (const a of barred) valid.delete(a);
        if (!valid.size) return;
    }
    if (!valid.size) {
        const committer = ctx.agent && work.has(ctx.agent) ? `; the committer, ${ctx.agent}, is one of them` : "";
        R.fail("4.2", `${where}: names no independent reviewer ("closedBy: <agent>" plus that agent's committed review artifact); owners and cited-commit authors are ${list}${committer}`);
        return;
    }
    const self = [...valid].filter(r => work.has(r));
    if (self.length) R.fail("4.2", `${where}: names ${self.join(", ")} as reviewer, but owners and cited-commit authors are ${list}`);
    if (!ctx.agent) R.fail("4.2", `${where}: the committing agent is unknown, so it cannot be told apart from the closer`);
    else if (valid.has(ctx.agent)) R.fail("4.2", `${where}: the closer ${ctx.agent} is also the committing agent; a status document records a closure made by a different agent`);
    for (const r of valid) {
        if (self.includes(r) || r === ctx.agent) continue;
        const b = backing(r, id, text, ctx);
        if (!b.ok) R.fail("4.2", `${where}: closedBy ${r} is not backed: ${b.why}`);
    }
}

function fixersOf(rec, ctx) {
    const f = new Set();
    const add = a => { const n = normAgent(a); if (n) f.add(n); };
    if (typeof rec.fixedby === "string") add(rec.fixedby);
    const commits = [rec.fixcommit];
    for (const h of Array.isArray(rec.history) ? rec.history : []) {
        if (h && statusWord(h.state) === "FIX_READY") { add(h.by); commits.push(h.commit); }
    }
    for (const c of commits) {
        if (typeof c === "string" && /^[0-9a-f]{7,40}$/i.test(c)) { const a = ctx.facts.commitAuthor(c); if (a) f.add(a); }
    }
    return f;
}

// { raw, agent }: closedBy, else the actor of the last closing history entry.
function closerOf(rec) {
    let raw = rec.closedby;
    if (raw == null) {
        const h = [...(Array.isArray(rec.history) ? rec.history : [])].reverse().find(x => x && statusOf(x.state).terminal);
        raw = h ? h.by : null;
    }
    return { raw: raw == null || raw === "" ? null : raw, agent: strictAgent(raw) };
}

function requireIndependentCloser(where, rec, ctx, R, statusDoc) {
    const fixers = fixersOf(rec, ctx), c = closerOf(rec);
    const list = [...fixers].join(", ") || "none recorded";
    if (!c.raw) R.fail("4.2", `${where}: the closure names no closedBy`);
    else if (!c.agent) R.fail("4.2", `${where}: closedBy "${c.raw}" is not a known agent (${KNOWN_AGENTS.join(", ")})`);
    else if (NON_CLOSERS.has(c.agent)) R.fail("4.2", `${where}: closedBy ${c.agent}; the PM never reviews or closes work (0028-AC A0)`);
    else if (fixers.has(c.agent)) R.fail("4.2", `${where}: closedBy ${c.agent} is one of the fixers (${list})`);
    else {
        const b = backing(c.agent, rec.defectid, JSON.stringify(omit(rec, NON_EVIDENCE_FIELDS)), ctx);
        if (!b.ok) R.fail("4.2", `${where}: closedBy ${c.agent} is not backed: ${b.why}`);
    }
    if (!ctx.agent) R.fail("4.2", `${where}: the committing agent is unknown, so it cannot be told apart from the fixers (${list})`);
    else if (fixers.has(ctx.agent)) R.fail("4.2", `${where}: committed by ${ctx.agent}, one of the fixers (${list})`);
    else if (statusDoc && c.agent === ctx.agent) R.fail("4.2", `${where}: the closer ${ctx.agent} is also the committing agent; a status document records a closure made by a different agent`);
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
    if (o.rev != null && n.rev != null && n.rev < o.rev) R.fail("4.3", `${p}: Rev went down, ${o.rev} -> ${n.rev}`);
    if (added.length && !revUp) R.fail("4.3", `${p}: ${added.join(", ")} added but Rev did not go up (Rev ${fmt(o.rev)} -> ${fmt(n.rev)})`);
    if (edited.length && !revUp) R.fail("4.3", `${p}: non-status edits to ${edited.join(", ")} without a Rev increase (Rev ${fmt(o.rev)} -> ${fmt(n.rev)})`);
    if (newText != null) {
        if (htmlTableCount(newText) > htmlTableCount(oldText)) R.fail("4.3", `${p}: adds an HTML table (<table> / <tr> / <td>); leaves and their status are read from Markdown tables only, so it could not be checked`);
        for (const problem of n.problems) R.fail("4.3", `${p}: ${problem}`);
        if (n.rev == null) R.fail("4.3", `${p}: no Rev header ("**Rev:** N" before the first section)${o.rev != null ? `; it was Rev ${o.rev}` : ""}`);
        const ol = o.revLog, nl = n.revLog;
        if (!nl.found) R.fail("4.3", `${p}: no Revision Log table${ol.found ? "; the old version had one (removed, or its Rev column renamed)" : ""}`);
        else if (n.rev != null && nl.max !== n.rev) R.fail("4.3", `${p}: the Revision Log ends at Rev ${nl.max}, but the header says Rev ${n.rev}`);
        for (const [rev, row] of ol.rows) {
            const now = nl.rows.get(rev);
            if (!now) R.fail("4.3", `${p}: the Revision Log row for Rev ${rev} was deleted; the log keeps its history`);
            else if (now.text !== row.text) R.fail("4.3", `${p}:${now.line}: the Revision Log row for Rev ${rev} was rewritten`);
        }
        if (ol.max != null) {
            for (const [rev, row] of nl.rows) if (!ol.rows.has(rev) && rev < ol.max) R.fail("4.3", `${p}:${row.line}: Revision Log row for Rev ${rev} inserted below the old head (Rev ${ol.max})`);
        }
    }

    const before = new Map(o.occ.map(x => [`${x.id}#${x.k}`, x]));
    for (const nl of n.occ) {
        if (!nl.status || !nl.status.terminal) continue;
        const ol = before.get(`${nl.id}#${nl.k}`);
        if (ol && ol.status && ol.status.terminal && ol.status.word === nl.status.word) continue;
        const owners = new Set([...nl.owners, ...(n.leaves.get(nl.id) || nl).owners, ...(ol ? ol.owners : []), ...(o.leaves.get(nl.id) || { owners: [] }).owners]);
        verifyStatusDocClosure(`${p}:${nl.line} ${nl.id} -> ${nl.status.word}`, nl.id, nl.text, owners, nl.reviewerCells, ctx, R);
    }
}

function checkLedgerFile(p, oldText, newText, ctx, R) {
    R.count("4.3");
    const oldLines = jsonLines(oldText), newLines = jsonLines(newText);
    if (newText == null) {
        if (oldLines.length) R.fail("4.3", `${p}: the ledger was deleted; it is append-only`);
        return;
    }
    let kept = 0;
    while (kept < oldLines.length && kept < newLines.length && oldLines[kept].text === newLines[kept].text) kept++;
    if (kept < oldLines.length) {
        const at = newLines[kept] ? newLines[kept].line : newLines.length + 1;
        R.fail("4.3", `${p}:${at}: old ledger line ${kept + 1} of ${oldLines.length} was removed, rewritten or moved; the ledger is append-only`);
    }
    const pool = new Map();
    for (const l of oldLines) pool.set(l.text, (pool.get(l.text) || 0) + 1);
    for (const l of newLines) {
        if (pool.get(l.text) > 0) { pool.set(l.text, pool.get(l.text) - 1); continue; }
        checkLedgerLine(p, l, ctx, R);
    }
}

function checkLedgerLine(p, l, ctx, R) {
    let raw;
    try { raw = JSON.parse(l.text); } catch (e) {
        R.count("4.1");
        R.fail("4.1", `${p}:${l.line}: unreadable ledger line; a record that cannot be parsed cannot carry evidence`);
        return;
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        R.count("4.1");
        R.fail("4.1", `${p}:${l.line}: a ledger line must be one JSON object`);
        return;
    }
    const rec = normRecord(raw);
    const conflicts = jsonKeyConflicts(l.text);
    if (rec.status != null && rec.state != null && statusWord(rec.status) !== statusWord(rec.state)) conflicts.push("status/state");
    const id = rec.defectid || "(no defectId)";
    if (conflicts.length) {
        R.count("4.1");
        R.fail("4.1", `${p}:${l.line} ${id}: ambiguous record, ${conflicts.join(", ")} given more than once (keys are compared case-insensitively)`);
        return;
    }
    const st = statusOf(rec.status != null ? rec.status : rec.state);
    if (!st.terminal) return;
    const where = `${p}:${l.line} ${id} -> ${st.word}`;
    requireEvidence(where, JSON.stringify(omit(rec, NON_EVIDENCE_FIELDS)), ctx, R);
    R.count("4.2");
    requireIndependentCloser(where, rec, ctx, R, false);
}

// Latest record per defect ID across every ledger in the new tree.
function ledgerRecords(ctx) {
    if (!ctx.ledger) {
        ctx.ledger = new Map();
        for (const f of ctx.newTree.list().filter(x => PATHS.ledger.test(x))) {
            for (const l of jsonLines(ctx.newTree.read(f))) {
                try { const r = normRecord(JSON.parse(l.text)); if (r && r.defectid) ctx.ledger.set(String(r.defectid).toUpperCase(), r); } catch (e) { /* reported by 4.1 when staged */ }
            }
        }
    }
    return ctx.ledger;
}

// Owners of every leaf in the new tree's WBS files, for closures claimed outside the WBS.
function wbsOwners(ctx) {
    if (!ctx.owners) {
        ctx.owners = new Map();
        for (const f of ctx.newTree.list().filter(x => PATHS.wbs.test(x))) {
            for (const [id, leaf] of parseWbs(ctx.newTree.read(f)).leaves) if (!ctx.owners.has(id)) ctx.owners.set(id, leaf.owners);
        }
    }
    return ctx.owners;
}

function verifyDefectClosure(where, id, text, reviewerCells, ctx, R) {
    const rec = ledgerRecords(ctx).get(id);
    if (!rec) { verifyStatusDocClosure(where, id, text, wbsOwners(ctx).get(id) || [], reviewerCells, ctx, R); return; }
    requireEvidence(where, text, ctx, R);
    R.count("4.2");
    const st = statusOf(rec.status != null ? rec.status : rec.state);
    if (!st.terminal) R.fail("4.2", `${where}: the defect ledger's latest record for ${id} is ${rec.status}, not closed`);
    else requireIndependentCloser(where, rec, ctx, R, true);
}

function checkDefectTableFile(p, oldText, newText, ctx, R) {
    const o = parseDefectRows(oldText), n = parseDefectRows(newText);
    const hadStatus = new Set(o.occ.filter(x => x.status).map(x => x.id));
    const lost = [...new Set(n.occ.filter(x => !x.status && hadStatus.has(x.id)).map(x => x.id))];
    if (lost.length) {
        R.count("4.1");
        R.fail("4.1", `${p}: ${lost.join(", ")} lost its Status column (missing or renamed), so its closures could not be checked`);
    }
    if (newText != null && htmlTableCount(newText) > htmlTableCount(oldText)) {
        R.count("4.1");
        R.fail("4.1", `${p}: adds an HTML table (<table> / <tr> / <td>); defect rows and their status are read from Markdown tables only, so it could not be checked`);
    }
    const before = new Map(o.occ.map(x => [`${x.id}#${x.k}`, x]));
    for (const nr of n.occ) {
        if (!nr.status || !nr.status.terminal) continue;
        const or = before.get(`${nr.id}#${nr.k}`);
        if (or && or.status && or.status.terminal && or.status.word === nr.status.word) continue;
        verifyDefectClosure(`${p}:${nr.line} ${nr.id} -> ${nr.status.word}`, nr.id, nr.text, nr.reviewerCells, ctx, R);
    }
}

function checkStatusProse(p, oldText, newText, ctx, R) {
    if (newText == null) return;
    const known = new Set([...parseDefectRows(oldText).occ, ...parseDefectRows(newText).occ].map(x => x.id));
    for (const id of ledgerRecords(ctx).keys()) known.add(id);
    const before = new Set(proseClaims(oldText, known).map(c => `${c.id}|${c.word}`));
    for (const c of proseClaims(newText, known)) {
        if (before.has(`${c.id}|${c.word}`)) continue;
        verifyDefectClosure(`${p}:${c.line} ${c.id} -> ${c.word} (prose)`, c.id, c.text, [], ctx, R);
    }
}

// ---------------------------------------------------------------- rule 4.4

function checkWhitelist(ctx, R) {
    R.count("4.4", ctx.changes.length);
    // A clean merge touches no path of its own: nothing to own, so nobody needs to be identified.
    if (!ctx.changes.length) return;
    const fail = msg => (ctx.historical ? R.grandfather("4.4", msg) : R.fail("4.4", msg));
    if (!ctx.matrix) {
        fail(`no File-Ownership whitelist table in ${PATHS.status} at ${ctx.statusRev ? ctx.statusRev.slice(0, 7) : "the parent (there is none)"}`);
        return;
    }
    for (const e of ctx.identity.errors) fail(e);
    const lanes = ctx.identity.lanes;
    if (!lanes.length) return;
    const held = lanes.map(l => l.label).join(" + ");
    for (const ch of ctx.changes) {
        const frozen = ctx.matrix.frozen.find(g => g.reI.test(ch.path));
        if (frozen) { fail(`${ch.path}: frozen / read-only (${frozen.raw})`); continue; }
        if (lanes.some(l => l.globs.some(g => g.re.test(ch.path)))) continue;
        const owners = ctx.matrix.lanes.filter(l => l.globs.some(g => g.reI.test(ch.path))).map(l => l.label);
        fail(`${ch.path}: outside the ${held} whitelist; ${owners.length ? `it belongs to ${owners.join(", ")}` : "no lane owns it"}`);
    }
}

// ---------------------------------------------------------------- targets

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
        branch: null, changes, parents,
        oldTree: parents.length ? makeTree("commit", parents[0]) : makeTree("empty"),
        newTree: makeTree("commit", sha), bases: parents, statusRev: parents[0] || null
    };
}

function mergedLane(subject) {
    const m = String(subject).match(/^\s*(?:\[[^\]]*\]\s*)?Merge (?:remote-tracking )?branch '([^']+)'/i);
    const l = m && m[1].match(/(?:^|\/)lane-([A-Za-z0-9]+)$/);
    return l ? { lane: l[1], branch: m[1] } : null;
}

function laneOfRef(rev) {
    if (!rev || /^[0-9a-f]{7,64}$/i.test(rev)) return null;
    const r = git(["rev-parse", "--symbolic-full-name", rev], { allowFail: true });
    const m = (r.ok ? r.out.trim() : "").match(/^refs\/(?:heads|remotes\/[^/]+)\/(?:.*\/)?lane-([A-Za-z0-9]+)$/);
    return m ? m[1] : null;
}

// Every commit a push of <head> over <base> adds, oldest first, with the lane each came from where the
// history says so: commits a "Merge branch '.../lane-<x>'" brought in, and the first-parent line of a
// head ref task/lane-<x>.
function rangeTargets(spec, facts) {
    if (spec.includes("...")) throw new Error(`--range ${spec}: a symmetric range (...) is not a push range; use <base>..<head>`);
    const m = spec.match(/^(.*?)\.\.(.*)$/);
    if (!m) throw new Error(`--range ${spec}: use <base>..<head>`);
    const baseRev = m[1] || "HEAD", headRev = m[2] || "HEAD";
    const base = revParse(`${baseRev}^{commit}`), head = revParse(`${headRev}^{commit}`);
    if (!base) throw new Error(`--range: ${baseRev} is not a commit`);
    if (!head) throw new Error(`--range: ${headRev} is not a commit`);
    const problems = [];
    if (!facts.isAncestor(base, head)) problems.push(`${baseRev} is not an ancestor of ${headRev}; the range rewrites history, so its commits cannot be gated one by one`);
    const list = args => git(["rev-list", ...args]).split("\n").filter(Boolean);
    const shas = list(["--reverse", "--topo-order", `${base}..${head}`]);
    const inRange = new Set(shas), hints = new Map();
    const targets = shas.map(commitTarget);
    for (const t of targets) {
        if (t.parents.length < 2) continue;
        const lane = mergedLane(t.subject);
        if (!lane) continue;
        for (const c of list([t.parents[1], `^${t.parents[0]}`])) {
            if (inRange.has(c) && !hints.has(c)) hints.set(c, { lane: lane.lane, source: `merged by ${t.sha.slice(0, 7)} from ${lane.branch}` });
        }
    }
    const headLane = laneOfRef(headRev);
    if (headLane) {
        for (const c of list(["--first-parent", `${base}..${head}`])) if (!hints.has(c)) hints.set(c, { lane: headLane, source: `first-parent history of ${headRev}` });
    }
    for (const t of targets) t.laneHint = hints.get(t.sha) || null;
    return { spec, base, head, problems, targets };
}

// Commits at or before the epoch predate the hook. --epoch may move it back (or to "none"), never forward.
function resolveEpoch(opts, facts) {
    const builtIn = revParse(`${GOVERNANCE_EPOCH}^{commit}`);
    if (opts.epoch === "none") return { sha: null, source: "--epoch none" };
    if (opts.epoch) {
        const sha = revParse(`${opts.epoch}^{commit}`);
        if (!sha) throw new Error(`--epoch ${opts.epoch} is not a commit`);
        if (builtIn && sha !== builtIn && !facts.isAncestor(sha, builtIn)) {
            throw new Error(`--epoch ${opts.epoch} is not an ancestor of the built-in epoch ${builtIn.slice(0, 8)}; --epoch may only move the epoch back, never grandfather newer commits`);
        }
        return { sha, source: `--epoch ${opts.epoch}` };
    }
    if (builtIn) return { sha: builtIn, source: `built-in ${builtIn.slice(0, 8)} (Directive 001-I base)` };
    return { sha: null, source: `built-in ${GOVERNANCE_EPOCH.slice(0, 8)} is not in this repository, so nothing is grandfathered` };
}

function checkTarget(target, opts, facts, epoch) {
    const R = makeReport(target.label);
    const parentTree = target.statusRev ? makeTree("commit", target.statusRev) : makeTree("empty");
    const matrix = withBuiltInLanes(parseLaneMatrix(parentTree.read(PATHS.status)));
    const identity = resolveIdentity(opts, matrix, target);
    const historical = Boolean(target.sha && epoch && epoch.sha && (target.sha === epoch.sha || facts.isAncestor(target.sha, epoch.sha)));
    const ctx = Object.assign({}, target, {
        facts, matrix, identity, agent: identity.agent, historical,
        changedPaths: new Set(target.changes.map(c => c.path)),
        decisions: parseDecisions(parentTree.read(PATHS.decisions))
    });
    for (const ch of target.changes) {
        const isWbs = PATHS.wbs.test(ch.path), isLedger = PATHS.ledger.test(ch.path), isTable = PATHS.defectTables.test(ch.path);
        if (!isWbs && !isLedger && !isTable) continue;
        const oldText = target.oldTree.read(ch.path);
        const newText = ch.status === "D" ? null : target.newTree.read(ch.path);
        if (isWbs) checkWbsFile(ch.path, oldText, newText, ctx, R);
        else if (isLedger) checkLedgerFile(ch.path, oldText, newText, ctx, R);
        else checkDefectTableFile(ch.path, oldText, newText, ctx, R);
        if (ch.path === PATHS.status) checkStatusProse(ch.path, oldText, newText, ctx, R);
    }
    checkWhitelist(ctx, R);
    return {
        label: target.label, sha: target.sha, subject: target.subject,
        agent: identity.agent, agentSource: identity.agentSource,
        lanes: identity.lanes.map(l => l.label), laneSource: identity.laneSource,
        changes: target.changes, rules: R.rules, warnings: R.warnings,
        historical, grandfathered: R.grandfathered, ok: !R.failed()
    };
}

function printResult(res) {
    const who = `agent ${res.agent || "unknown"}${res.agentSource ? ` (${res.agentSource})` : ""}, lane ${res.lanes.join(" + ") || "unknown"}${res.laneSource ? ` (${res.laneSource})` : ""}`;
    console.log(`DEUS check_claims: ${res.label}${res.subject ? ` "${res.subject}"` : ""}`);
    console.log(`  ${who}`);
    console.log(`  ${res.changes.length} path(s): ${res.changes.map(c => `${c.status} ${c.path}`).join(", ") || "none"}`);
    if (res.historical) console.log("  at or before the governance epoch: 4.4 violations are grandfathered");
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
    for (const g of res.grandfathered) console.log(`GRANDFATHERED ${g}`);
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
            try { rec = normRecord(JSON.parse(l)); } catch (e) { warnings.push(`${src}: unreadable line skipped`); return; }
            if (!rec || typeof rec !== "object") return;
            if (rec.messageid) {
                const t = Date.parse(rec.timestamp);
                addStamp(`m|${rec.messageid}`, { item: rec.defectid || null, state: statusWord(rec.type), actor: normAgent(rec.from), raw: rec.from, t, src });
                return;
            }
            if (!rec.defectid) return;
            const history = Array.isArray(rec.history) ? rec.history.filter(Boolean) : [];
            for (const h of history) {
                const t = Date.parse(h.timestamp);
                addStamp(`d|${rec.defectid}|${h.state}|${h.by}|${h.timestamp}`, { item: rec.defectid, state: statusWord(h.state), actor: normAgent(h.by), raw: h.by, t, src });
            }
            if (statusOf(rec.status).terminal) {
                const closer = closerOf(rec);
                const closed = [...history].reverse().find(h => statusOf(h.state).terminal);
                const at = rec.closedat || (closed || {}).timestamp;
                const actor = closer.agent || normAgent(closer.raw);
                if (!closed) addStamp(`d|${rec.defectid}|${statusWord(rec.status)}|${rec.closedby}|${at}`, { item: rec.defectid, state: statusWord(rec.status), actor, raw: closer.raw, t: Date.parse(at), src });
                const key = `${rec.defectid}|${actor}|${at}`;
                if (!closures.has(key)) closures.set(key, { rec, closer, actor, at, src });
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
        const id = c.rec.defectid, where = `${id} [${c.src}]`;
        const fixers = fixersOf(c.rec, ctx);
        if (!c.closer.raw) flags.push({ code: "A1", item: id, msg: `no closer: ${where} is CLOSED without closedBy` });
        else if (fixers.has(c.actor)) flags.push({ code: "A2", item: id, msg: `self-closed: ${where} closedBy ${c.actor}, a fixer (${[...fixers].join(", ")})` });
        const tClose = Date.parse(c.at);
        const fixTimes = (Array.isArray(c.rec.history) ? c.rec.history : []).filter(h => h && statusWord(h.state) === "FIX_READY").map(h => Date.parse(h.timestamp)).filter(t => !isNaN(t));
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
    if (fs.existsSync(target) && !fs.readFileSync(target, "utf8").includes(HOOK_FAMILY) && !force) {
        throw new Error(`${target} already holds another hook; rerun with --force to replace it`);
    }
    const script = [
        "#!/bin/sh",
        `# ${HOOK_MARKER} (node tools/governance/check_claims.js --install-hook)`,
        "# Runs the committed checker (HEAD's copy, else the staged copy), never the working-tree file.",
        "# Bypass policy: docs/OWNER_DECISIONS.md DEC-004.",
        `rel=${PATHS.checker}`,
        "tmp=\"$(git rev-parse --git-path deus-check-claims.js)\" || exit 1",
        "if git cat-file -e \"HEAD:$rel\" 2>/dev/null; then src=\"HEAD:$rel\"",
        "elif git cat-file -e \":$rel\" 2>/dev/null; then src=\":$rel\"",
        "else",
        "  echo \"DEUS governance: $rel is neither committed nor staged on this branch; commit rejected (merge main first).\" >&2",
        "  exit 1",
        "fi",
        "git cat-file blob \"$src\" > \"$tmp\" || exit 1",
        "exec node \"$tmp\" --pre-commit",
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
    if (!fs.readFileSync(target, "utf8").includes(HOOK_FAMILY)) throw new Error(`${target} is not the DEUS governance hook; left in place`);
    fs.unlinkSync(target);
    console.log(`Removed ${target}`);
}

// ---------------------------------------------------------------- main

function parseArgs(argv) {
    const o = { mode: "pre-commit", commits: [], ranges: [], files: [], lane: null, agent: null, epoch: null, json: false, burstMs: BURST_MS, force: false };
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
        else if (a === "--epoch") o.epoch = need(++i, a);
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
        const facts = makeGitFacts();
        let targets = [], epoch = null;
        const ranges = [];
        if (opts.mode === "commit") {
            epoch = resolveEpoch(opts, facts);
            targets = opts.commits.map(commitTarget);
            for (const r of opts.ranges) { const rt = rangeTargets(r, facts); ranges.push(rt); targets.push(...rt.targets); }
        } else {
            targets = [stagedTarget()];
        }
        const results = targets.map(t => checkTarget(t, opts, facts, epoch));
        const problems = ranges.flatMap(r => r.problems.map(p => `${r.spec}: ${p}`));
        const ok = results.every(r => r.ok) && problems.length === 0;
        if (opts.json) {
            console.log(JSON.stringify({ ok, epoch, ranges: ranges.map(r => ({ spec: r.spec, base: r.base, head: r.head, commits: r.targets.length, problems: r.problems })), results }, null, 2));
        } else {
            results.forEach(printResult);
            for (const p of problems) console.log(`FAIL range ${p}`);
            if (results.length > 1 || ranges.length) {
                const gf = results.filter(r => r.grandfathered.length).length;
                console.log(`RESULT (all): ${results.filter(r => r.ok).length} clean, ${results.filter(r => !r.ok).length} rejected, ${gf} with grandfathered 4.4 notes${problems.length ? `, ${problems.length} range problem(s)` : ""}`);
            }
            if (epoch) console.log(`epoch: ${epoch.source}`);
        }
        return ok ? 0 : 1;
    } catch (e) {
        console.error(`check_claims: ${e.message}`);
        return 2;
    }
}

if (require.main === module) process.exit(main());

module.exports = {
    parseTables, parseWbs, parseRevisionLog, parseDefectRows, parseLaneMatrix, withBuiltInLanes, parseDecisions, globToRe,
    KNOWN_AGENTS, NON_CLOSERS, PM_WHITELIST,
    statusOf, statusWord, normText, normAgent, strictAgent, reviewersIn, jsonKeyConflicts, normRecord, proseClaims,
    citedPaths, PASS_OUTCOME_RE, FAIL_OUTCOME_RE, NON_TERMINAL, TERMINAL_WORDS, BURST_MS, GOVERNANCE_EPOCH,
    failingVerdict, reviewDocProblem, htmlTableCount
};
