#!/usr/bin/env node
"use strict";

/**
 * tools/governance/test_check_claims.js
 *
 * WG.00.12 Lanes C2 and C2b: tests for tools/governance/check_claims.js (Directive 001-I §C).
 * Builds a throwaway git repository in the OS temp folder: a fixture docs/STATUS.md (lane matrix, two
 * defect tables, status prose), docs/OWNER_DECISIONS.md, a WBS with two leaf tables and a Revision Log,
 * two defect ledgers, a fix commit with a passing and a failing run log, review artifacts committed as
 * [grok], [fable], [gemini] and a forged [gr0k], an unmerged branch and a lane-B branch.
 * Each case resets to that baseline, stages or commits one change and runs the checker on it. Clean
 * cases must pass. Each forbidden change must be rejected under exactly the rules named for it, and
 * where a case names text, a violation must contain it. Unit checks call the parsers directly.
 * Then mutants of the checker, each with one check switched off, must each fail a named check, which
 * shows the checks can fail (AGENTS.md rule 4, ENGINE_RULES §6). The hook case installs the pre-commit
 * hook in the throwaway repository only.
 * Real-history checks run read-only in this repository when the commits exist: 31676cf (WG.00.08
 * marked DONE with no independent reviewer) must fail 4.2; the WG.00.08 ledger and message bus as of
 * d1fbeab must show the chain bursts Grok called backfill; the coordinator's integration merges and a
 * normal lane commit must pass; a pre-epoch lane commit must be grandfathered on 4.4; and --epoch must
 * refuse to move the epoch forward (tested in a --shared clone, so this repository is not written).
 *
 * Usage: node tools/governance/test_check_claims.js [--keep]   (--keep leaves the temp repository)
 * Output: PASS <name> / FAIL <name>: <detail>, then RESULT: <n> passed, <m> failed. Exit 1 on any failure.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const CHECKER = path.join(__dirname, "check_claims.js");
const CHECKER_REL = "tools/governance/check_claims.js";
const REAL_ROOT = path.resolve(__dirname, "..", "..");
const KEEP = process.argv.includes("--keep");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "deus-check-claims-"));
const ch = (...cps) => String.fromCodePoint(...cps);
const ZWSP = ch(0x200B), RLM = ch(0x200F), CHECK_MARK = ch(0x2705), RARROW = ch(0x2192), LARROW = ch(0x2190), BIARROW = ch(0x2194);
const FULLWIDTH_DONE = ch(0xFF24, 0xFF2F, 0xFF2E, 0xFF25), COMBINING_GRAVE = ch(0x0300), CYRILLIC_O = ch(0x043E);

let passed = 0, failed = 0;
function check(name, ok, detail) {
    if (ok) { passed++; console.log(`PASS ${name}`); }
    else { failed++; console.log(`FAIL ${name}: ${detail}`); }
}

function cleanEnv(extra) {
    const env = Object.assign({}, process.env);
    for (const k of ["DEUS_LANE", "DEUS_AGENT", "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX",
        "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES"]) delete env[k];
    env.PATH = path.dirname(process.execPath) + path.delimiter + (env.PATH || env.Path || "");
    return Object.assign(env, extra || {});
}

function parseJson(text) {
    try { return JSON.parse(text); } catch (e) { return null; }
}

// ---------------------------------------------------------------- fixture repository

class Repo {
    constructor(dir) {
        this.dir = dir;
        fs.mkdirSync(dir, { recursive: true });
        this.git("init", "-q", "-b", "main");
        this.git("config", "user.name", "DEUS Test");
        this.git("config", "user.email", "test@deus.invalid");
        this.git("config", "commit.gpgsign", "false");
        this.git("config", "core.autocrlf", "false");
    }
    git(...args) {
        const r = spawnSync("git", args, { cwd: this.dir, encoding: "utf8", env: cleanEnv() });
        if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
        return r.stdout.trim();
    }
    tryGit(args, env) {
        return spawnSync("git", args, { cwd: this.dir, encoding: "utf8", env: cleanEnv(env) });
    }
    file(rel) { return path.join(this.dir, rel); }
    write(rel, text) { fs.mkdirSync(path.dirname(this.file(rel)), { recursive: true }); fs.writeFileSync(this.file(rel), text); }
    read(rel) { return fs.readFileSync(this.file(rel), "utf8"); }
    append(rel, line) { fs.appendFileSync(this.file(rel), line + "\n"); }
    edit(rel, from, to) {
        const t = this.read(rel);
        if (!t.includes(from)) throw new Error(`fixture edit: "${from}" not in ${rel}`);
        this.write(rel, t.replace(from, to));
    }
    stage(...rels) { this.git("add", "-A", "--", ...rels); }
    commit(msg, ...rels) { this.stage(...rels); this.git("commit", "-q", "-m", msg); return this.git("rev-parse", "HEAD"); }
    reset() {
        this.git("checkout", "-q", "-f", "main");
        this.git("reset", "-q", "--hard", this.base);
        this.git("clean", "-qfdx");
    }
    check(checker, args, env) {
        const r = spawnSync(process.execPath, [checker, ...args, "--json"], { cwd: this.dir, encoding: "utf8", env: cleanEnv(env) });
        return { status: r.status, json: parseJson(r.stdout), stdout: r.stdout, stderr: r.stderr };
    }
}

const STATUS_DOC = `# STATUS fixture (TEST_)

## In progress
- **Lane B (Fable):** TW.00.02 fix under review (TEST_).
- **Legacy:** TW.00.01 DONE (legacy, TEST_).

## 3. Strict File-Ownership Matrix (No Overlapping Write Sets)

| Lane / Owner | Exclusive File Whitelist (Full Paths) | Access Policy |
|---|---|---|
| **Gemini (Coordinator)** | \`docs/STATUS.md\`<br>\`docs/OWNER_DECISIONS.md\`<br>\`docs/worldgen/TEST_WBS.md\` | **Exclusive Writer.** |
| **Lane A (Gemini)** | \`tasks/TEST.01/*\` | **Exclusive Writer.** |
| **Lane B (Fable)** | \`src/fix.js\`<br>\`tools/test_fix.js\`<br>\`tasks/TEST.02/*\` | **Exclusive Writer.** |
| **Lane C2 (Claude Subagent)** | \`tools/governance/check_claims.js\`<br>\`tools/governance/test_check_claims.js\`<br>\`.git/hooks/pre-commit\` | **Exclusive Writer.** |
| **Lane D (Grok)** | \`tasks/TEST.01/defects.jsonl\`<br>\`reviews/*\` | **Exclusive Writer.** |
| **FROZEN / READ-ONLY** | \`C:\\Dev\\DEUS\`<br>\`engine/core.js\` | **Strictly Read-Only.** |

## 4. Open Defects & Blockers

| Defect / Finding ID | Task / WBS | Severity | Title & Requirement | Status | Owner |
|---|---|:---:|---|:---:|:---:|
| **TEST-DEF-001** | \`TW.00.02\` | \`MAJOR\` | TEST_ defect one. | \`FIX_READY\` | Fable / Grok |
| **TEST-DEF-003** | \`TW.00.02\` | \`MINOR\` | TEST_ finding with no ledger. | \`OPEN\` | Gemini / Grok |

## 5. Deferred Findings

| Finding | Title | Status |
|---|---|---|
| **TEST-DEF-004** | TEST_ deferred finding with no ledger. | \`OPEN\` |
`;

const OWNER_DOC = `# OWNER DECISIONS fixture (TEST_)

### Decision \`DEC-900\`: TEST_ decided question
- **Question:** TEST_
- **Status:** \`DECIDED\`

### Decision \`DEC-901\`: TEST_ open question
- **Question:** TEST_
- **Status:** \`OPEN\`
`;

const BASE_ROWS = [
    "| **TW.00.01** | TEST_Foundation | Gemini | TEST_ scope one. | `DONE` (legacy) |",
    "| **TW.00.02** | TEST_Cuts | Fable | TEST_ scope two. | `REVIEW` |",
    "| **TW.00.03** | TEST_Renderer | Fable / Gemini | TEST_ scope three. | `QUEUED` |",
    "| **TW.00.04** | TEST_Census | Gemini | TEST_ scope four. | `ACTIVE` |",
    "| **TW.10.01–03** | TEST_Range | Gemini | TEST_ three leaves in one row. | `PLANNED` |"
];
const SECOND_ROWS = ["| **TW.20.01** | TEST_Second | Gemini | TEST_ leaf in a second table. | `QUEUED` |"];
const RANGE_ROW = BASE_ROWS[4];
const RANGE_EXPANDED = ["01", "02", "03"].map(n => `| **TW.10.${n}** | TEST_Range_${n} | Gemini | TEST_ range leaf ${n}. | \`PLANNED\` |`);
const NEW_LEAF = "| **TW.00.05** | TEST_New | Fable | TEST_ scope five. | `PLANNED` |";
const LOG4 = [1, 2, 3, 4];

function wbsDoc({ rev = 3, rows = BASE_ROWS, rows2 = SECOND_ROWS, log = [1, 2, 3], logHeader = "Rev", statusHeader = "Status", noLog = false, logText = {} } = {}) {
    const out = ["# TEST_ WorldGen WBS", "", "**Namespace:** TW  "];
    if (rev != null) out.push(`**Rev:** ${rev}  `);
    out.push("**IDs:** Stable.", "", "---", "", "## 2. Leaves", "",
        `| WBS Leaf | Title | Owner | Scope & Deliverables | ${statusHeader} |`, "| :--- | :--- | :---: | :--- | :---: |", ...rows, "",
        "### TW.20 - Second band", "",
        "| Leaf | Title | Owner | Scope & Deliverables | Status |", "| :--- | :--- | :---: | :--- | :---: |", ...rows2, "", "---", "");
    if (!noLog) {
        out.push("## Revision Log", "", `| ${logHeader} | Date | Change |`, "|:---:|:---:|:---|",
            ...log.slice().reverse().map(r => `| ${r} | 2026-09-25 | ${logText[r] || `TEST_ change ${r}.`} |`), "");
    }
    return out.join("\n");
}

function rowsWith(id, row) {
    return BASE_ROWS.map(r => (r.includes(`**${id}**`) ? row : r));
}

function doneRow(id, status) {
    const cells = BASE_ROWS.find(r => r.includes(`**${id}**`)).split("|").map(c => c.trim());
    return `| ${cells[1]} | ${cells[2]} | ${cells[3]} | ${cells[4]} | ${status} |`;
}

const T = { open: "2026-09-25T10:00:00.000Z", fix: "2026-09-25T11:00:00.000Z", close: "2026-09-25T12:00:00.000Z" };
const REVIEW = "reviews/review_TEST.md";
const ART = `\`${REVIEW}\``;

function openRecord(id, task) {
    return { defectId: id, taskId: task, status: "OPEN", finder: "grok", title: `TEST_ ${id}`, createdAt: T.open,
        history: [{ state: "OPEN", by: "grok", timestamp: T.open }] };
}

function fixRecord(id, task, fix7) {
    const r = openRecord(id, task);
    return Object.assign(r, { status: "FIX_READY", fixCommit: fix7, fixedBy: "fable",
        history: [...r.history, { state: "FIX_READY", by: "fable", commit: fix7, timestamp: T.fix }] });
}

function closeRecord(id, task, fix7, over = {}) {
    const r = fixRecord(id, task, fix7);
    const closer = "closedBy" in over ? over.closedBy : "grok";
    const at = over.closedAt || T.close;
    Object.assign(r, { status: "CLOSED", closedBy: closer, closedAt: at,
        closureEvidence: `grok review ${REVIEW}: ${fix7} is in the tree`,
        history: [...r.history, { state: "CLOSED", by: closer, timestamp: at }] }, over);
    if (closer == null) { delete r.closedBy; r.history = r.history.filter(h => h.state !== "CLOSED"); }
    return r;
}

function buildFixture() {
    const repo = new Repo(path.join(TMP, "repo"));
    repo.write("docs/STATUS.md", STATUS_DOC);
    repo.write("docs/OWNER_DECISIONS.md", OWNER_DOC);
    repo.write("docs/worldgen/TEST_WBS.md", wbsDoc());
    repo.write("engine/core.js", "// TEST_ frozen engine core\n");
    repo.write(CHECKER_REL, "// TEST_ placeholder for the lane C2 tool\n");
    repo.write("tasks/TEST.01/defects.jsonl", JSON.stringify(openRecord("TEST-DEF-001", "TEST.01")) + "\n");
    repo.write("tasks/TEST.02/defects.jsonl", JSON.stringify(openRecord("TEST-DEF-002", "TEST.02")) + "\n");
    repo.commit("[gemini] TEST_ fixture baseline", ".");
    repo.write("src/fix.js", "module.exports = 1; // TEST_ fix\n");
    repo.write("tools/test_fix.js", "// TEST_ test script\n");
    repo.write("tasks/TEST.02/test_fix_run.log", "node tools/test_fix.js\nPASS a\nPASS b\nPASS c\nRESULT: 3 passed, 0 failed\n");
    repo.write("tasks/TEST.02/test_fix_fail.log", "node tools/test_fix.js\nPASS a\nPASS b\nFAIL c\nRESULT: 2 passed, 1 failed\n");
    repo.fix7 = repo.commit("[fable] TEST_ fix for TEST-DEF-001 and TEST-DEF-002", ".").slice(0, 7);
    repo.write(REVIEW, "# TEST_ review by grok\nVerdict PASS for TW.00.02, TW.00.03, TW.00.04, TW.20.01, TEST-DEF-001, TEST-DEF-002, TEST-DEF-003, TEST-DEF-004.\n");
    repo.write("reviews/review_misc.md", "# TEST_ review by grok of something else\n");
    repo.review7 = repo.commit("[grok] TEST_ review", "reviews").slice(0, 7);
    repo.write("reviews/review_by_fable.md", "# TEST_ notes by fable on TW.00.02, TW.00.04 and TEST-DEF-001\n");
    repo.commit("[fable] TEST_ fable notes", "reviews");
    repo.write("reviews/review_gemini_TEST.md", "# TEST_ coordinator notes on TW.00.02\n");
    repo.commit("[gemini] TEST_ coordinator notes", "reviews");
    repo.write("reviews/review_gr0k.md", "# TEST_ forged-identity review of TW.00.02 and TEST-DEF-001\n");
    repo.commit("[gr0k] TEST_ forged identity", "reviews");
    repo.append("tasks/TEST.01/defects.jsonl", JSON.stringify(fixRecord("TEST-DEF-001", "TEST.01", repo.fix7)));
    repo.append("tasks/TEST.02/defects.jsonl", JSON.stringify(fixRecord("TEST-DEF-002", "TEST.02", repo.fix7)));
    repo.base = repo.commit("[gemini] TEST_ record FIX_READY", ".");
    repo.git("checkout", "-q", "-b", "task/lane-b");
    repo.write("src/fix.js", "module.exports = 2; // TEST_ lane B follow-up\n");
    repo.commit("[fable] TEST_ lane B follow-up", "src/fix.js");
    repo.git("checkout", "-q", "main");
    repo.git("checkout", "-q", "-b", "task/stranded");
    repo.write("stranded.txt", "TEST_ unmerged work\n");
    repo.stranded7 = repo.commit("[fable] TEST_ stranded work", "stranded.txt").slice(0, 7);
    repo.git("checkout", "-q", "main");
    return repo;
}

// ---------------------------------------------------------------- cases

const WBS = "docs/worldgen/TEST_WBS.md";
const L1 = "tasks/TEST.01/defects.jsonl", L2 = "tasks/TEST.02/defects.jsonl";
const coordinator = ["--lane", "coordinator"];

// Stage the WBS with one leaf's status cell replaced, as the coordinator.
function wbsStatus(r, id, status, over = {}) {
    r.write(WBS, wbsDoc(Object.assign({ rows: rowsWith(id, doneRow(id, status)) }, over)));
    r.stage(WBS);
    return coordinator;
}

// A closure attack on TW.00.02 with no evidence and no reviewer: the parser must see a closure.
function attack(name, status, word) {
    return { name, expect: ["4.1", "4.2"], mention: [`TW.00.02 -> ${word}`], setup: r => wbsStatus(r, "TW.00.02", status) };
}

const CASES = [
    // clean changes
    { name: "pass_c2_edits_own_tool_branch_identity", expect: [], setup(r) {
        r.git("checkout", "-q", "-B", "task/lane-c2", r.base);
        r.write(CHECKER_REL, "// TEST_ edited by lane C2\n");
        r.stage(CHECKER_REL);
        return [];
    } },
    { name: "pass_env_lane_b_edits_fix", expect: [], env: { DEUS_LANE: "b" }, setup(r) {
        r.write("src/fix.js", "module.exports = 3;\n");
        r.stage("src/fix.js");
        return [];
    } },
    { name: "pass_subtree_whitelist", expect: [], setup(r) {
        r.write("tasks/TEST.02/evidence/run.log", "TEST_ evidence in a subfolder\n");
        r.stage("tasks/TEST.02/evidence/run.log");
        return ["--lane", "b"];
    } },
    { name: "pass_wbs_done_with_commit_and_reviewer", expect: [], setup: r => wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: grok, review ${ART})`) },
    { name: "pass_wbs_done_with_test_log_and_verdict", expect: [], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (node tools/test_fix.js, log \`tasks/TEST.02/test_fix_run.log\`: 3/3 passed; verdict: grok, ${ART})`) },
    { name: "pass_wbs_leaf_added_with_rev_and_log", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, rows: [...BASE_ROWS, NEW_LEAF] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_wbs_status_only_edit_without_rev", expect: [], setup: r => wbsStatus(r, "TW.00.03", "`ACTIVE`") },
    { name: "pass_wbs_reopen_done_to_review", expect: [], setup: r => wbsStatus(r, "TW.00.01", "`REVIEW` (was DONE; reopened)") },
    { name: "pass_status_negated_closure_word", expect: [], setup: r => wbsStatus(r, "TW.00.04", "`REVIEW` (not DONE yet; until grok signs off)") },
    { name: "pass_status_arrow_to_nonterminal", expect: [], setup: r => wbsStatus(r, "TW.00.03", `\`QUEUED\` ${RARROW} \`IN_PROGRESS\``) },
    { name: "pass_status_label_nonterminal", expect: [], setup: r => wbsStatus(r, "TW.00.03", "Status: ACTIVE") },
    { name: "pass_status_struck_old_value", expect: [], setup: r => wbsStatus(r, "TW.00.03", "~~DONE~~ `ACTIVE`") },
    { name: "pass_status_header_synonym_state", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ statusHeader: "State" }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_rev_log_header_synonym", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ logHeader: "Revision" }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_owner_closure_with_decided_dec", expect: [], setup: r => wbsStatus(r, "TW.00.03", `\`DONE\` (${r.fix7}; closedBy: owner per DEC-900)`) },
    { name: "pass_ledger_closed_by_reviewer_relayed", expect: [], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "pass_ledger_closer_signs_own_closure", expect: [], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.stage(L1);
        return ["--lane", "d"];
    } },
    { name: "pass_ledger_closer_adds_review_in_same_commit", expect: [], setup(r) {
        r.write("reviews/review_TEST-DEF-001_v2.md", "# TEST_ second review of TEST-DEF-001 by grok\n");
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closureEvidence: `grok review reviews/review_TEST-DEF-001_v2.md: ${r.fix7} is in the tree` })));
        r.stage(L1, "reviews/review_TEST-DEF-001_v2.md");
        return ["--lane", "d"];
    } },
    { name: "pass_ledger_mixed_case_keys_fix_ready", expect: [], setup(r) {
        r.append(L2, JSON.stringify({ DefectId: "TEST-DEF-002", TaskId: "TEST.02", Status: "FIX_READY", Finder: "grok", FixedBy: "fable", FixCommit: r.fix7 }));
        r.stage(L2);
        return ["--lane", "b"];
    } },
    { name: "pass_status_row_closed_backed_by_ledger", expect: [], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.commit("[grok] TEST_ close TEST-DEF-001", L1);
        r.edit("docs/STATUS.md", "| `FIX_READY` | Fable / Grok |", `| \`CLOSED\` (${r.fix7}) | Fable / Grok |`);
        r.stage("docs/STATUS.md");
        return coordinator;
    } },
    { name: "pass_status_prose_unrelated_edit", expect: [], setup(r) {
        r.edit("docs/STATUS.md", "## 3. Strict", "- TEST_ note: TW.00.02 stays in REVIEW until grok signs off.\n\n## 3. Strict");
        r.stage("docs/STATUS.md");
        return coordinator;
    } },
    { name: "pass_clean_merge_by_coordinator", expect: [], setup(r) {
        r.git("merge", "-q", "--no-ff", "--no-commit", "task/lane-b");
        return coordinator;
    } },
    { name: "pass_commit_mode_clean_commit", expect: [], setup(r) {
        r.write(CHECKER_REL, "// TEST_ lane C2 commit\n");
        r.commit("[claude] TEST_ tool update", CHECKER_REL);
        return ["--commit", "HEAD"];
    } },
    { name: "pass_commit_merge_without_agent_subject", expect: [], setup(r) {
        r.git("merge", "-q", "--no-ff", "-m", "Merge branch 'task/lane-b'", "task/lane-b");
        return ["--commit", "HEAD"];
    } },
    { name: "pass_lane_given_as_agent_name", expect: [], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.stage(L1);
        return ["--lane", "gemini"];
    } },
    { name: "pass_bom_added_to_ledger", expect: [], setup(r) {
        r.write(L2, ch(0xFEFF) + r.read(L2));
        r.append(L2, JSON.stringify(Object.assign(closeRecord("TEST-DEF-002", "TEST.02", r.fix7), { status: "VERIFY_PENDING" })));
        r.stage(L2);
        return ["--lane", "b"];
    } },
    { name: "pass_range_row_expanded_with_rev", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, rows: [...BASE_ROWS.filter(x => x !== RANGE_ROW), ...RANGE_EXPANDED] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_range_row_hyphen_for_en_dash", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rows: BASE_ROWS.map(x => x.replace("TW.10.01–03", "TW.10.01-03")) }));
        r.stage(WBS);
        return coordinator;
    } },

    // status parsing: each change below is a closure the checker must see (Directive 001-I §C.1)
    attack("fail_status_label_prefix", "Status: DONE", "DONE"),
    attack("fail_status_unicode_arrow", `\`REVIEW\` ${RARROW} \`DONE\``, "DONE"),
    attack("fail_status_ascii_arrow", "REVIEW -> DONE", "DONE"),
    attack("fail_status_arrow_to_unknown", `\`REVIEW\` (${RARROW} D0NE)`, "D0NE"),
    attack("fail_status_zero_width", `D${ZWSP}ONE`, "DONE"),
    attack("fail_status_fullwidth", FULLWIDTH_DONE, "DONE"),
    attack("fail_status_emphasis_split", "**D**ONE", "DONE"),
    attack("fail_status_emphasis_word", "`REVIEW` **DONE**", "REVIEW_DONE"),
    attack("fail_status_transition_annotation", "`REVIEW` (now DONE)", "DONE"),
    attack("fail_status_unlisted_terminal", "FINISHED", "FINISHED"),
    attack("fail_status_unknown_word", "D0NE", "D0NE"),
    attack("fail_status_blanked", "", "(EMPTY)"),
    attack("fail_status_html_entity", "&#68;ONE", "DONE"),
    attack("fail_status_emoji_mixed_case", `${CHECK_MARK} Done`, "DONE"),
    { name: "fail_status_second_table_leaf", expect: ["4.1", "4.2"], mention: ["TW.20.01 -> DONE"], setup(r) {
        r.write(WBS, wbsDoc({ rows2: ["| **TW.20.01** | TEST_Second | Gemini | TEST_ leaf in a second table. | `DONE` |"] }));
        r.stage(WBS);
        return coordinator;
    } },

    // 4.1 evidence required
    { name: "fail41_done_without_evidence", expect: ["4.1"], setup: r => wbsStatus(r, "TW.00.02", `\`DONE\` (closedBy: grok, ${ART})`) },
    { name: "fail41_fabricated_hash", expect: ["4.1"], mention: ["deadbee1"], setup: r => wbsStatus(r, "TW.00.02", `\`DONE\` (deadbee1; closedBy: grok, ${ART})`) },
    { name: "fail41_commit_not_reachable", expect: ["4.1"], mention: ["not reachable"], setup: r => wbsStatus(r, "TW.00.02", `\`DONE\` (${r.stranded7}; closedBy: grok, ${ART})`) },
    { name: "fail41_failing_test_log", expect: ["4.1"], mention: ["records no passing run"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (node tools/test_fix.js, log \`tasks/TEST.02/test_fix_fail.log\`; verdict: grok, ${ART})`) },
    { name: "fail41_test_claim_text_only", expect: ["4.1"], mention: ["only as text"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (node tools/test_fix.js: 3/3 passed; verdict: grok, ${ART})`) },
    { name: "fail41_missing_test_script", expect: ["4.1"], mention: ["tools/test_missing.js"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (node tools/test_missing.js, log \`tasks/TEST.02/test_fix_run.log\`; verdict: grok, ${ART})`) },
    { name: "fail41_cited_evidence_file_missing", expect: ["4.1"], mention: ["tasks/TEST.02/missing_run.log"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}, run log \`tasks/TEST.02/missing_run.log\`; closedBy: grok, ${ART})`) },
    { name: "fail41_status_table_closed_without_evidence", expect: ["4.1"], mention: ["TEST-DEF-003"], setup(r) {
        r.edit("docs/STATUS.md", "| `OPEN` | Gemini / Grok |", `| \`CLOSED\` (closedBy: grok, ${ART}) | Gemini / Grok |`);
        r.stage("docs/STATUS.md");
        return coordinator;
    } },
    { name: "fail41_second_defect_table_closed", expect: ["4.1"], mention: ["TEST-DEF-004"], setup(r) {
        r.edit("docs/STATUS.md", "| TEST_ deferred finding with no ledger. | `OPEN` |", `| TEST_ deferred finding with no ledger. | \`CLOSED\` (closedBy: grok, ${ART}) |`);
        r.stage("docs/STATUS.md");
        return coordinator;
    } },
    { name: "fail41_defect_status_column_renamed", expect: ["4.1"], mention: ["lost its Status column"], setup(r) {
        r.edit("docs/STATUS.md", "| Title & Requirement | Status | Owner |", "| Title & Requirement | Notes | Owner |");
        r.stage("docs/STATUS.md");
        return coordinator;
    } },
    { name: "fail41_ledger_closure_without_evidence", expect: ["4.1"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closureEvidence: `looks fine per ${REVIEW}`, fixCommit: undefined,
            history: [{ state: "OPEN", by: "grok", timestamp: T.open }, { state: "FIX_READY", by: "fable", timestamp: T.fix }, { state: "CLOSED", by: "grok", timestamp: T.close }] })));
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "fail41_ledger_ambiguous_duplicate_keys", expect: ["4.1"], mention: ["ambiguous"], setup(r) {
        r.append(L1, `{"defectId":"TEST-DEF-001","taskId":"TEST.01","status":"OPEN","Status":"CLOSED","closedBy":"grok"}`);
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "fail41_ledger_status_key_case", expect: ["4.1", "4.2"], mention: ["TEST-DEF-001 -> CLOSED"], setup(r) {
        r.append(L1, JSON.stringify({ DefectId: "TEST-DEF-001", STATUS: "CLOSED", ClosedBy: "grok" }));
        r.stage(L1);
        return ["--lane", "a"];
    } },

    // 4.2 zero self-certification
    { name: "fail42_wbs_done_no_reviewer_committer_is_owner", expect: ["4.2"], mention: ["no independent reviewer"], setup: r => wbsStatus(r, "TW.00.03", `\`DONE\` (${r.fix7})`) },
    { name: "fail42_wbs_owner_named_as_reviewer", expect: ["4.2"], setup: r => wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: fable, \`reviews/review_by_fable.md\`)`) },
    { name: "fail42_wbs_claude_alias_of_fable_owner", expect: ["4.2"], setup: r => wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: claude, \`reviews/review_by_fable.md\`)`) },
    { name: "fail42_wbs_cited_commit_author_as_reviewer", expect: ["4.2"], setup: r => wbsStatus(r, "TW.00.04", `\`DONE\` (${r.fix7}; closedBy: fable, \`reviews/review_by_fable.md\`)`) },
    { name: "fail42_typed_closedby_without_artifact", expect: ["4.2"], mention: ["cites no review artifact"], setup: r => wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: grok)`) },
    { name: "fail42_artifact_by_another_agent", expect: ["4.2"], mention: ["not by a [grok] commit"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: grok, \`reviews/review_by_fable.md\`)`) },
    { name: "fail42_artifact_forged_in_same_commit", expect: ["4.2", "4.4"], mention: ["written by this commit"], setup(r) {
        r.write("reviews/review_forged.md", "# TEST_ 'grok' review of TW.00.02 written by the coordinator\n");
        wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: grok, \`reviews/review_forged.md\`)`);
        r.stage("reviews/review_forged.md");
        return coordinator;
    } },
    { name: "fail42_artifact_missing", expect: ["4.1", "4.2"], mention: ["reviews/review_nope.md"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: grok, \`reviews/review_nope.md\`)`) },
    { name: "fail42_artifact_does_not_mention_leaf", expect: ["4.2"], mention: ["does not mention TW.00.02"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: grok, \`reviews/review_misc.md\`)`) },
    { name: "fail42_closer_is_committer", expect: ["4.2"], mention: ["also the committing agent"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: gemini, \`reviews/review_gemini_TEST.md\`)`) },
    { name: "fail42_unknown_closer_name", expect: ["4.2"], mention: ["gr0k"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: gr0k, \`reviews/review_gr0k.md\`)`) },
    { name: "fail42_unknown_closer_beside_valid", expect: ["4.2"], mention: ["not a known agent"], setup: r =>
        wbsStatus(r, "TW.00.02", `\`DONE\` (${r.fix7}; closedBy: gr0k; verdict: grok, ${ART})`) },
    { name: "fail42_owner_closure_without_dec", expect: ["4.2"], mention: ["cites no DEC-xxx"], setup: r => wbsStatus(r, "TW.00.03", `\`DONE\` (${r.fix7}; closedBy: owner)`) },
    { name: "fail42_owner_closure_dec_open", expect: ["4.2"], mention: ["not DECIDED"], setup: r => wbsStatus(r, "TW.00.03", `\`DONE\` (${r.fix7}; closedBy: owner per DEC-901)`) },
    { name: "fail42_owner_closure_dec_added_in_same_commit", expect: ["4.2"], mention: ["DEC-902"], setup(r) {
        r.append("docs/OWNER_DECISIONS.md", "\n### Decision `DEC-902`: TEST_ decided in the closing commit\n- **Status:** `DECIDED`");
        r.stage("docs/OWNER_DECISIONS.md");
        return wbsStatus(r, "TW.00.03", `\`DONE\` (${r.fix7}; closedBy: owner per DEC-902)`);
    } },
    { name: "fail42_ledger_closedby_is_fixer", expect: ["4.2"], mention: ["closedBy claude is one of the fixers"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closedBy: "fable" })));
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "fail42_ledger_fixer_commits_closure", expect: ["4.2"], mention: ["committed by claude"], setup(r) {
        r.append(L2, JSON.stringify(closeRecord("TEST-DEF-002", "TEST.02", r.fix7)));
        r.stage(L2);
        return ["--lane", "b"];
    } },
    { name: "fail42_ledger_closure_without_closedby", expect: ["4.2"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closedBy: null })));
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "fail42_ledger_closedby_not_an_agent", expect: ["4.2"], mention: ["not a known agent"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closedBy: "gr0k", closureEvidence: `review reviews/review_gr0k.md: ${r.fix7} is in the tree` })));
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "fail42_ledger_typed_closedby_without_artifact", expect: ["4.2"], mention: ["cites no review artifact"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closureEvidence: `grok says ${r.fix7} is in the tree` })));
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "fail42_ledger_unlisted_terminal_status", expect: ["4.2"], mention: ["TEST-DEF-001 -> SHIPPED"], setup(r) {
        r.append(L1, JSON.stringify(Object.assign(fixRecord("TEST-DEF-001", "TEST.01", r.fix7), { status: "SHIPPED" })));
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "fail42_closure_by_unknown_committer", expect: ["4.2", "4.4"], mention: ["committing agent is unknown"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.stage(L1);
        return [];
    } },
    { name: "fail42_status_row_closed_but_ledger_open", expect: ["4.2"], setup(r) {
        r.edit("docs/STATUS.md", "| `FIX_READY` | Fable / Grok |", `| \`CLOSED\` (${r.fix7}) | Fable / Grok |`);
        r.stage("docs/STATUS.md");
        return coordinator;
    } },
    { name: "fail42_status_prose_claim", expect: ["4.2"], mention: ["TW.00.02 -> DONE (prose)"], setup(r) {
        r.edit("docs/STATUS.md", "## 3. Strict", `- TEST_ TW.00.02 is now DONE (${r.fix7}).\n\n## 3. Strict`);
        r.stage("docs/STATUS.md");
        return coordinator;
    } },

    // 4.3 WBS revision and immutability
    { name: "fail43_leaf_added_without_rev", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rows: [...BASE_ROWS, NEW_LEAF] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_leaf_deleted", expect: ["4.3"], mention: ["TW.00.03"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, rows: BASE_ROWS.filter(x => !x.includes("TW.00.03")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_leaf_renamed", expect: ["4.3"], mention: ["TW.00.03"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, rows: BASE_ROWS.map(x => x.replace("TW.00.03", "TW.00.09")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_leaf_retitled", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, rows: rowsWith("TW.00.03", "| **TW.00.03** | TEST_Something_Else | Fable / Gemini | TEST_ scope three. | `QUEUED` |") }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_scope_edit_without_rev", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.03", "| **TW.00.03** | TEST_Renderer | Fable / Gemini | TEST_ smaller scope. | `QUEUED` |") }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_went_down", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 2 }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_header_removed", expect: ["4.3"], mention: ["no Rev header"], setup(r) {
        r.write(WBS, wbsDoc({ rev: null }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_up_without_log_row", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, rows: [...BASE_ROWS, NEW_LEAF] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_log_gap", expect: ["4.3"], mention: ["skips from Rev 3 to Rev 5"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 5, log: [1, 2, 3, 5], rows: [...BASE_ROWS, NEW_LEAF] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_log_row_deleted", expect: ["4.3"], mention: ["Rev 1 was deleted"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [2, 3, 4], rows: [...BASE_ROWS, NEW_LEAF] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_log_row_rewritten", expect: ["4.3"], mention: ["Rev 2 was rewritten"], setup(r) {
        r.write(WBS, wbsDoc({ logText: { 2: "TEST_ history rewritten." } }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_log_zero_row", expect: ["4.3"], mention: ["not a positive integer"], setup(r) {
        r.write(WBS, wbsDoc({ log: [0, 1, 2, 3] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_log_ahead_of_header", expect: ["4.3"], mention: ["ends at Rev 4"], setup(r) {
        r.write(WBS, wbsDoc({ log: LOG4 }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_log_header_renamed", expect: ["4.3"], mention: ["no table whose first column"], setup(r) {
        r.write(WBS, wbsDoc({ logHeader: "R" }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_rev_log_removed", expect: ["4.3"], mention: ["no Revision Log table"], setup(r) {
        r.write(WBS, wbsDoc({ noLog: true }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_wbs_status_column_renamed", expect: ["4.3"], mention: ["no Status column"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, statusHeader: "Notes" }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_duplicate_leaf_id", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, rows: [...BASE_ROWS, "| **TW.00.02** | TEST_Other | Gemini | TEST_ other scope. | `PLANNED` |"] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_range_row_deleted", expect: ["4.3"], mention: ["TW.10.01–03"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, rows: BASE_ROWS.filter(x => x !== RANGE_ROW) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_single_row_inside_range", expect: ["4.3"], mention: ["TW.10.02"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: LOG4, rows: [...BASE_ROWS, RANGE_EXPANDED[1]] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_ledger_line_deleted", expect: ["4.3"], mention: ["append-only"], setup(r) {
        r.write(L1, r.read(L1).split("\n").slice(1).join("\n"));
        r.stage(L1);
        return ["--lane", "a"];
    } },
    { name: "fail43_ledger_line_rewritten", expect: ["4.3"], mention: ["append-only"], setup(r) {
        r.write(L1, r.read(L1).replace("TEST_ TEST-DEF-001", "TEST_ quietly edited"));
        r.stage(L1);
        return ["--lane", "a"];
    } },

    // 4.4 single-writer whitelist
    { name: "fail44_file_of_another_lane", expect: ["4.4"], mention: ["docs/STATUS.md"], setup(r) {
        r.append("docs/STATUS.md", "TEST_ edit by lane C2");
        r.stage("docs/STATUS.md");
        return ["--lane", "c2"];
    } },
    { name: "fail44_frozen_path_even_for_coordinator", expect: ["4.4"], mention: ["frozen"], setup(r) {
        r.append("engine/core.js", "// TEST_ edit");
        r.stage("engine/core.js");
        return coordinator;
    } },
    { name: "fail44_path_no_lane_owns", expect: ["4.4"], mention: ["no lane owns it"], setup(r) {
        r.write("notes/TEST_unowned.md", "TEST_\n");
        r.stage("notes/TEST_unowned.md");
        return ["--lane", "c2"];
    } },
    { name: "fail44_commit_widens_own_whitelist", expect: ["4.4"], mention: ["src/fix.js"], setup(r) {
        r.edit("docs/STATUS.md", "`tools/governance/check_claims.js`<br>", "`tools/governance/check_claims.js`<br>`src/fix.js`<br>");
        r.write("src/fix.js", "module.exports = 4; // TEST_ out of lane\n");
        r.stage("docs/STATUS.md", "src/fix.js");
        return ["--lane", "c2"];
    } },
    { name: "fail44_no_identity_on_main", expect: ["4.4"], mention: ["cannot tell which lane"], setup(r) {
        r.write(CHECKER_REL, "// TEST_\n");
        r.stage(CHECKER_REL);
        return [];
    } },
    { name: "fail44_declared_agent_does_not_hold_lane", expect: ["4.4"], env: { DEUS_AGENT: "grok" }, setup(r) {
        r.git("checkout", "-q", "-B", "task/lane-c2", r.base);
        r.write(CHECKER_REL, "// TEST_\n");
        r.stage(CHECKER_REL);
        return [];
    } },
    { name: "fail44_rename_out_of_lane", expect: ["4.4"], mention: ["tools/check_claims.js"], setup(r) {
        r.git("mv", CHECKER_REL, "tools/check_claims.js");
        return ["--lane", "c2"];
    } },
    { name: "fail44_merge_resolution_edits_other_lane", expect: ["4.4"], mention: ["src/fix.js"], setup(r) {
        r.git("merge", "-q", "--no-ff", "--no-commit", "task/lane-b");
        r.write("src/fix.js", "module.exports = 5; // TEST_ coordinator edit during merge\n");
        r.stage("src/fix.js");
        return coordinator;
    } },
    { name: "fail44_commit_mode_uses_subject_agent", expect: ["4.4"], mention: ["docs/STATUS.md"],
        env: { DEUS_LANE: "coordinator", DEUS_AGENT: "gemini" }, setup(r) {
        r.append("docs/STATUS.md", "TEST_ edit by claude");
        r.commit("[claude] TEST_ edits STATUS", "docs/STATUS.md");
        return ["--commit", "HEAD"];
    } },

    // grandfathering (Directive 001-I §C.8): 4.4 only, commits at or before the epoch only
    { name: "pass44_grandfathered_pre_epoch", expect: [], grandfathered: ["docs/STATUS.md"], setup(r) {
        r.append("docs/STATUS.md", "TEST_ historical edit by claude");
        const old = r.commit("[claude] TEST_ edits STATUS before the hook", "docs/STATUS.md");
        r.write(CHECKER_REL, "// TEST_ later lane C2 work\n");
        r.commit("[claude] TEST_ tool", CHECKER_REL);
        return ["--commit", old, "--epoch", "HEAD"];
    } },
    { name: "fail44_post_epoch_not_grandfathered", expect: ["4.4"], mention: ["docs/STATUS.md"], setup(r) {
        r.append("docs/STATUS.md", "TEST_ edit by claude after the epoch");
        const late = r.commit("[claude] TEST_ edits STATUS after the hook", "docs/STATUS.md");
        return ["--commit", late, "--epoch", r.base];
    } },
    { name: "fail41_pre_epoch_commit_still_checked", expect: ["4.1"], setup(r) {
        wbsStatus(r, "TW.00.02", `\`DONE\` (closedBy: grok, ${ART})`);
        const old = r.commit("[gemini] TEST_ TW.00.02 DONE without evidence", WBS);
        return ["--commit", old, "--epoch", old];
    } },

    // --range gate (Directive 001-I §C.7)
    { name: "pass_range_gate_clean", expect: [], setup(r) {
        r.git("merge", "-q", "--no-ff", "-m", "[gemini] Merge branch 'task/lane-b'", "task/lane-b");
        return ["--range", `${r.base}..HEAD`];
    } },
    { name: "range_gate_flags_out_of_lane_commit", expect: ["4.4"], mention: ["docs/STATUS.md"], setup(r) {
        r.write("src/fix.js", "module.exports = 6; // TEST_ lane B\n");
        r.commit("[fable] TEST_ lane B work", "src/fix.js");
        r.append("docs/STATUS.md", "TEST_ out-of-lane edit inside the range");
        r.commit("[claude] TEST_ edits STATUS", "docs/STATUS.md");
        return ["--range", `${r.base}..HEAD`];
    } },
    { name: "range_gate_merge_lane_hint", expect: ["4.4"], mention: ["tools/governance/check_claims.js"], setup(r) {
        r.git("checkout", "-q", "task/lane-b");
        r.write(CHECKER_REL, "// TEST_ claude edits the C2 tool from lane B\n");
        r.commit("[claude] TEST_ tool edit from lane B", CHECKER_REL);
        r.git("checkout", "-q", "main");
        r.git("merge", "-q", "--no-ff", "-m", "[gemini] Merge branch 'task/lane-b'", "task/lane-b");
        return ["--range", `${r.base}..main`];
    } },
    { name: "range_gate_head_ref_hint", expect: ["4.4"], mention: ["tools/governance/check_claims.js"], setup(r) {
        r.git("checkout", "-q", "task/lane-b");
        r.write(CHECKER_REL, "// TEST_ claude edits the C2 tool on lane B\n");
        r.commit("[claude] TEST_ tool edit on lane B", CHECKER_REL);
        return ["--range", "main..task/lane-b"];
    } },
    { name: "range_gate_rejects_rewritten_base", expect: [], exit: 1, rangeMention: ["not an ancestor"], setup: () => ["--range", "task/stranded..main"] },
    { name: "range_gate_refuses_symmetric_range", expect: [], exit: 2, noJson: true, stderrMention: ["symmetric"], setup: r => ["--range", `${r.base}...task/lane-b`] }
];

function failingRules(json) {
    const out = new Set();
    for (const res of (json && json.results) || []) {
        for (const [id, r] of Object.entries(res.rules)) if (r.violations.length) out.add(id);
    }
    return [...out].sort();
}

function violations(json) {
    const out = [];
    for (const res of (json && json.results) || []) for (const [id, r] of Object.entries(res.rules)) for (const v of r.violations) out.push(`[${id}] ${v}`);
    return out;
}

function runCase(repo, c, checker) {
    repo.reset();
    const args = c.setup(repo) || [];
    const r = repo.check(checker, args, c.env);
    const wantExit = c.exit != null ? c.exit : (c.expect.length ? 1 : 0);
    if (c.noJson) {
        const missing = (c.stderrMention || []).filter(m => !String(r.stderr).includes(m));
        return { ok: r.status === wantExit && !missing.length,
            detail: `exit ${r.status}, expected ${wantExit}${missing.length ? `, stderr lacks ${missing.join(", ")}` : ""}: ${(r.stderr || r.stdout).trim().slice(0, 300)}` };
    }
    if (!r.json) return { ok: false, detail: `no JSON output, exit ${r.status}: ${(r.stderr || r.stdout).trim().slice(0, 300)}` };
    const got = failingRules(r.json), want = [...c.expect].sort();
    const v = violations(r.json);
    const gf = r.json.results.flatMap(x => x.grandfathered || []);
    const problems = (r.json.ranges || []).flatMap(x => x.problems);
    const missing = [
        ...(c.mention || []).filter(m => !v.some(x => x.includes(m))).map(m => `no violation mentions ${m}`),
        ...(c.grandfathered || []).filter(m => !gf.some(x => x.includes(m))).map(m => `no grandfathered note mentions ${m}`),
        ...(c.rangeMention || []).filter(m => !problems.some(x => x.includes(m))).map(m => `no range problem mentions ${m}`)
    ];
    const ok = r.status === wantExit && got.join(",") === want.join(",") && !missing.length;
    const detail = `exit ${r.status}, failing rules [${got.join(", ")}], expected [${want.join(", ")}] and exit ${wantExit}` +
        (missing.length ? `; ${missing.join("; ")}` : "") + (v.length ? `; ${v.slice(0, 3).join(" | ")}` : "") + (problems.length ? `; range: ${problems.join(" | ")}` : "");
    return { ok, detail };
}

// ---------------------------------------------------------------- backfill cases

function jsonl(records) {
    return records.map(r => JSON.stringify(r)).join("\n") + "\n";
}

function stamped(id, times, fix7, over = {}) {
    const hist = [{ state: "OPEN", by: "grok", timestamp: times[0] }, { state: "FIX_READY", by: "fable", timestamp: times[1] }];
    const recs = [
        { defectId: id, status: "OPEN", finder: "grok", history: hist.slice(0, 1) },
        { defectId: id, status: "FIX_READY", finder: "grok", fixedBy: "fable", history: hist }
    ];
    if (times[2]) {
        const closer = "closedBy" in over ? over.closedBy : "grok";
        const rec = Object.assign({ defectId: id, status: "CLOSED", finder: "grok", fixedBy: "fable", closedBy: closer, closedAt: times[2],
            closureEvidence: `${fix7} is in the tree`,
            history: closer ? [...hist, { state: "CLOSED", by: closer, timestamp: times[2] }] : hist }, over);
        if (!closer) delete rec.closedBy;
        recs.push(rec);
    }
    return recs;
}

const BACKFILL_CASES = [
    { name: "backfill_clean_ledger_has_no_flags", flags: [], records: r =>
        stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"], r.fix7) },
    { name: "backfill_chain_burst_B1", flags: ["B1"], records: r =>
        stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T10:00:00.047Z"], r.fix7) },
    { name: "backfill_batch_burst_B2", flags: ["B2"], records: r => [
        ...stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"], r.fix7),
        ...stamped("TEST-BF-2", ["2026-09-25T10:30:00.000Z", "2026-09-25T11:30:00.000Z", "2026-09-25T12:00:00.300Z"], r.fix7)] },
    { name: "backfill_window_edge_1000ms_not_flagged", flags: [], records: r => [
        ...stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"], r.fix7),
        ...stamped("TEST-BF-2", ["2026-09-25T10:30:00.000Z", "2026-09-25T11:30:00.000Z", "2026-09-25T12:00:01.000Z"], r.fix7)] },
    { name: "backfill_window_edge_999ms_flagged", flags: ["B2"], records: r => [
        ...stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"], r.fix7),
        ...stamped("TEST-BF-2", ["2026-09-25T10:30:00.000Z", "2026-09-25T11:30:00.000Z", "2026-09-25T12:00:00.999Z"], r.fix7)] },
    { name: "backfill_audit_trail_A1_A2_A3_A4", flags: ["A1", "A2", "A3", "A4"], records: r => [
        ...stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"], r.fix7, { closedBy: null }),
        ...stamped("TEST-BF-2", ["2026-09-25T13:00:00.000Z", "2026-09-25T14:00:00.000Z", "2026-09-25T15:00:00.000Z"], r.fix7, { closedBy: "fable" }),
        ...stamped("TEST-BF-3", ["2026-09-25T16:00:00.000Z", "2026-09-25T18:00:00.000Z", "2026-09-25T17:00:00.000Z"], r.fix7),
        ...stamped("TEST-BF-4", ["2026-09-25T19:00:00.000Z", "2026-09-25T20:00:00.000Z", "2026-09-25T21:00:00.000Z"], r.fix7, { closureEvidence: "trust me" })] }
];

function runBackfillCase(repo, c, checker) {
    repo.reset();
    repo.write("bf/defects.jsonl", jsonl(c.records(repo)));
    const r = spawnSync(process.execPath, [checker, "--check-backfill", "--json", "bf/defects.jsonl"], { cwd: repo.dir, encoding: "utf8", env: cleanEnv() });
    const json = parseJson(r.stdout);
    if (!json) return { ok: false, detail: `no JSON output, exit ${r.status}: ${(r.stderr || r.stdout).trim().slice(0, 300)}` };
    const got = [...new Set(json.flags.map(f => f.code))].sort(), want = [...c.flags].sort();
    const ok = got.join(",") === want.join(",") && r.status === (want.length ? 1 : 0);
    return { ok, detail: `exit ${r.status}, flags [${got.join(", ")}], expected [${want.join(", ")}]; ${json.flags.slice(0, 2).map(f => f.msg).join(" | ")}` };
}

// ---------------------------------------------------------------- hook case

function runHookCase(repo, checker) {
    repo.reset();
    repo.git("checkout", "-q", "-B", "task/lane-c2", repo.base);
    const hookFile = path.join(repo.dir, ".git", "hooks", "pre-commit");
    const onDisk = repo.file(CHECKER_REL);
    const run = args => spawnSync(process.execPath, [checker, ...args], { cwd: repo.dir, encoding: "utf8", env: cleanEnv() });
    const commit = msg => repo.tryGit(["commit", "-q", "-m", msg]);
    const head = () => repo.git("rev-parse", "HEAD");
    const steps = [];
    try {
        fs.copyFileSync(checker, onDisk);
        repo.commit("[claude] TEST_ commit the checker", CHECKER_REL);
        const inst = run(["--install-hook"]);
        steps.push(["install", inst.status === 0 && fs.existsSync(hookFile) && fs.readFileSync(hookFile, "utf8").includes("DEUS-GOVERNANCE-HOOK"), `exit ${inst.status} ${inst.stderr}`]);
        repo.append("docs/STATUS.md", "TEST_ out-of-lane edit");
        repo.stage("docs/STATUS.md");
        let before = head(), c = commit("[claude] TEST_ out of lane");
        steps.push(["rejects_out_of_lane_commit", c.status !== 0 && head() === before, `commit exit ${c.status}`]);
        repo.git("reset", "-q", "--hard", "HEAD");
        fs.writeFileSync(onDisk, "process.exit(0); // TEST_ tampered on disk, not staged\n");
        repo.append("docs/STATUS.md", "TEST_ out-of-lane edit while the working-tree checker always passes");
        repo.stage("docs/STATUS.md");
        before = head(); c = commit("[claude] TEST_ out of lane with a tampered checker on disk");
        steps.push(["ignores_tampered_working_tree_checker", c.status !== 0 && head() === before, `commit exit ${c.status}`]);
        repo.git("reset", "-q", "--hard", "HEAD");
        fs.appendFileSync(onDisk, "// TEST_ lane C2 edit\n");
        repo.stage(CHECKER_REL);
        before = head(); c = commit("[claude] TEST_ lane C2 tool");
        steps.push(["accepts_in_lane_commit", c.status === 0 && head() !== before, `commit exit ${c.status} ${c.stdout} ${c.stderr}`.slice(0, 400)]);
        repo.git("rm", "-q", CHECKER_REL);
        const removed = commit("[claude] TEST_ remove the checker");
        repo.write("tools/test_fix.js", "// TEST_\n");
        repo.stage("tools/test_fix.js");
        before = head(); c = commit("[claude] TEST_ commit with no committed or staged checker");
        steps.push(["fails_closed_without_checker", removed.status === 0 && c.status !== 0 && head() === before && /neither committed nor staged/.test(c.stderr),
            `remove exit ${removed.status}, commit exit ${c.status} ${c.stderr}`.slice(0, 400)]);
        repo.git("reset", "-q", "--hard", "HEAD");
        const again = run(["--install-hook"]);
        steps.push(["reinstall_over_own_hook", again.status === 0, `exit ${again.status} ${again.stderr}`]);
        fs.writeFileSync(hookFile, "#!/bin/sh\necho TEST_ foreign hook\n");
        const refuse = run(["--install-hook"]);
        steps.push(["refuses_foreign_hook", refuse.status === 2 && fs.readFileSync(hookFile, "utf8").includes("foreign"), `exit ${refuse.status}`]);
        const keep = run(["--uninstall-hook"]);
        steps.push(["uninstall_keeps_foreign_hook", keep.status === 2 && fs.existsSync(hookFile), `exit ${keep.status}`]);
        fs.unlinkSync(hookFile);
        run(["--install-hook"]);
        const un = run(["--uninstall-hook"]);
        steps.push(["uninstall_removes_own_hook", un.status === 0 && !fs.existsSync(hookFile), `exit ${un.status}`]);
    } catch (e) {
        steps.push(["no_exception", false, e.message.slice(0, 300)]);
    } finally {
        if (fs.existsSync(hookFile)) fs.unlinkSync(hookFile);
    }
    const bad = steps.filter(s => !s[1]);
    return { ok: bad.length === 0 && steps.length === 9, detail: bad.map(s => `${s[0]}: ${s[2]}`).join(" | ") || `only ${steps.length} of 9 steps ran`, steps };
}

// ---------------------------------------------------------------- unit checks

function statusTable(cm, rows) {
    const bad = rows.filter(([v, t, w]) => { const s = cm.statusOf(v); return s.terminal !== t || s.word !== w; });
    return [bad.length === 0, bad.map(([v, t, w]) => `${JSON.stringify(v)} -> ${JSON.stringify(cm.statusOf(v))}, want ${t ? "terminal" : "non-terminal"} ${w}`).join("; ")];
}

function pairs(rows) {
    const bad = rows.filter(([got, want]) => got !== want);
    return [bad.length === 0, bad.map(([got, want, label]) => `${label || ""} got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`).join("; ")];
}

const UNITS = [
    { name: "unit_status_allowlist", run: cm => statusTable(cm, [
        ["`DONE` (DW.01.01)", true, "DONE"], ["**COMPLETED / FROZEN**", true, "COMPLETED"], ["`FIX_READY`", false, "FIX_READY"],
        ["QUEUED", false, "QUEUED"], ["In Progress", false, "IN_PROGRESS"], ["Fix ready", false, "FIX_READY"], ["on hold", false, "ON_HOLD"],
        ["FINISHED", true, "FINISHED"], ["SHIPPED", true, "SHIPPED"], ["D0NE", true, "D0NE"], ["", true, "(EMPTY)"], ["RECORDED", true, "RECORDED"],
        ["`RESOLVED-PENDING-REVIEW (PM clone verification in progress)`", true, "RESOLVED_PENDING_REVIEW"], ["`OPEN` (Review F2)", false, "OPEN"],
        ["open: the owner decides whether that PASS stands; the gate run with the fixed tools is A10-5", false, "OPEN"],
        ["open: fixed tools pending", true, "FIXED"], ["REVIEW (tests 3/3 passed)", false, "REVIEW"], ["OPEN with the generator owner", true, "OPEN_WITH_THE_GENERATOR_OWNER"]]) },
    { name: "unit_status_normalization", run: cm => statusTable(cm, [
        [`D${ZWSP}ONE`, true, "DONE"], [FULLWIDTH_DONE, true, "DONE"], ["**D**ONE", true, "DONE"], ["_DONE_", true, "DONE"], ["__DONE__", true, "DONE"],
        ["_IN_PROGRESS_", false, "IN_PROGRESS"], ["&#68;ONE", true, "DONE"], [`DO${COMBINING_GRAVE}NE`, true, "DONE"], [`${RLM}REVIEW`, false, "REVIEW"],
        ["~~OPEN~~ CLOSED", true, "CLOSED"], ["<s>DONE</s> REVIEW", false, "REVIEW"], ["<!-- DONE --> REVIEW", false, "REVIEW"], ["~~DONE~~ ACTIVE", false, "ACTIVE"],
        [`${CHECK_MARK} Done`, true, "DONE"], ["`REVIEW` **DONE**", true, "REVIEW_DONE"], [`REVIEW ${CHECK_MARK} DONE`, true, "REVIEW_DONE"]]) },
    { name: "unit_status_arrows_labels_annotations", run: cm => statusTable(cm, [
        ["Status: DONE", true, "DONE"], ["Status: REVIEW", false, "REVIEW"], ["Status - DONE", true, "DONE"], ["Final status: REVIEW", false, "REVIEW"],
        [`\`REVIEW\` ${RARROW} \`DONE\``, true, "DONE"], ["REVIEW -> DONE", true, "DONE"], ["DONE -> REVIEW", false, "REVIEW"], [`\`DONE\` (${RARROW} REVIEW)`, true, "DONE"],
        [`QUEUED ${ch(0x21D2)} IN_PROGRESS`, false, "IN_PROGRESS"], [`REVIEW ${LARROW} DONE`, false, "REVIEW"], [`REVIEW ${BIARROW} DONE`, true, "DONE"],
        [`REVIEW (${RARROW} D0NE)`, true, "D0NE"], ["`REVIEW` (now DONE)", true, "DONE"], ["`REVIEW` (was DONE; reopened)", false, "REVIEW"],
        ["REVIEW (not DONE)", false, "REVIEW"], ["REVIEW (can't be DONE yet)", false, "REVIEW"], ["REVIEW (fully DONE)", true, "DONE"],
        ["REVIEW / DONE", true, "DONE"], ["REVIEW, DONE", true, "DONE"], ["REVIEW; marked DONE", true, "DONE"]]) },
    { name: "unit_reviewers_and_agents", run: cm => pairs([
        [cm.strictAgent("grok"), "grok"], [cm.strictAgent("Grok (PM)"), "grok"], [cm.strictAgent("[fable]"), "claude"], [cm.strictAgent("owner_review"), "owner"],
        [cm.strictAgent("gr0k"), null], [cm.strictAgent("not grok"), null], [cm.strictAgent(`gr${CYRILLIC_O}k`), null], [cm.strictAgent("Claude Subagent"), null],
        [[...cm.reviewersIn(`DONE (closed${ZWSP}By: grok)`).valid].join(), "grok", "zero-width in closedBy"],
        [cm.reviewersIn("DONE (closedBy: gr0k; verdict: grok)").invalid.join(), "gr0k", "invalid closer"],
        [cm.reviewersIn("DONE (verdict: PASS; reviewer sign-off pending)").invalid.length, 0, "verdict words"],
        [[...cm.reviewersIn("DONE", ["Grok / Codex"]).valid].sort().join(), "codex,grok", "reviewer column"],
        [cm.normAgent("Fable"), "claude"], [cm.normAgent("Antigravity"), "gemini"], [cm.normAgent("Claude Subagent"), "claude"]]) },
    { name: "unit_revision_log", run(cm) {
        const log = (hdr, revs) => `## Revision Log\n\n| ${hdr} | Date | Change |\n|---|---|---|\n${revs.map(r => `| ${r} | d | c |`).join("\n")}\n`;
        const p = t => cm.parseRevisionLog(cm.parseTables(t));
        const a = p(log("Rev", [3, 2, 1])), b = p(log("Revision", [2, 1])), c = p(log("Version", [1])), d = p(log("R", [1]));
        const e = p(log("Rev", [5, 3, 2])), f = p(log("Rev", [2, 2, 1])), g = p(log("Rev.", ["v2", 1]));
        return pairs([[a.found && a.max === 3 && a.problems.length === 0, true, "Rev"], [b.found && b.max === 2, true, "Revision"], [c.found, true, "Version"],
            [!d.found && d.problems.length === 1, true, "renamed header"], [e.problems.some(x => x.includes("skips from Rev 3 to Rev 5")), true, "gap"],
            [f.problems.some(x => x.includes("twice")), true, "duplicate"], [g.found && g.max === 2 && g.problems.length === 0, true, "Rev. v2"]]);
    } },
    { name: "unit_glob_subtree", run(cm) {
        const g = cm.globToRe("tasks/WG.00.12/*", ""), led = cm.globToRe("docs/archive/STATUS_LEDGER_*.md", ""), deep = cm.globToRe("docs/**/x.md", "");
        return pairs([[g.test("tasks/WG.00.12/state.md"), true], [g.test("tasks/WG.00.12/sub/x.md"), true, "subfolder"], [g.test("tasks/WG.00.121/x"), false],
            [led.test("docs/archive/STATUS_LEDGER_1.md"), true], [led.test("docs/archive/sub/STATUS_LEDGER_1.md"), false, "mid-path *"],
            [deep.test("docs/x.md"), true], [deep.test("docs/a/b/x.md"), true], [cm.globToRe("C:\\Dev\\DEUS", ""), null]]);
    } },
    { name: "unit_pass_and_fail_outcomes", run(cm) {
        const P = cm.PASS_OUTCOME_RE, F = cm.FAIL_OUTCOME_RE;
        return pairs([[P.test("36/36 passed"), true], [P.test("26 passed, 0 failed"), true], [P.test("exit 0"), true], [P.test("RESULT: PASS"), true],
            [P.test("ALL 7 CHECKS PASSED"), true], [P.test("2/3 passed"), false], [P.test("13/3 passed"), false], [P.test("NOT ALL CHECKS PASSED"), false],
            [P.test("5 passed, 1 failed"), false], [P.test("exit 1"), false], [F.test("RESULT: 2 passed, 1 failed"), true], [F.test("exit 1"), true],
            [F.test("PASS a\nFAIL b"), true], [F.test("2/3 passed"), true], [F.test("RESULT: 29 passed, 0 failed"), false], [F.test("36/36 passed"), false], [F.test("exit 0"), false]]);
    } },
    { name: "unit_json_key_conflicts", run(cm) {
        const K = o => cm.jsonKeyConflicts(o).join();
        return pairs([[K("{\"status\":\"OPEN\",\"Status\":\"CLOSED\"}"), "status"], [K("{\"a\":\"x:y\",\"b\":{\"c\":1,\"C\":2},\"d\":[{\"e\":1},{\"e\":2}]}"), "c"],
            [K("{\"closed_by\":\"grok\",\"closedBy\":\"fable\"}"), "closedby"], [K(JSON.stringify({ k: "\"quoted\": text", s: "status" })), ""],
            [JSON.stringify(cm.normRecord({ DefectId: "X-1", History: [{ State: "OPEN" }] })), "{\"defectid\":\"X-1\",\"history\":[{\"state\":\"OPEN\"}]}"]]);
    } },
    { name: "unit_prose_claims", run(cm) {
        const text = "- WG.00.08 is now DONE (abc).\n- WG.00.09 stays in REVIEW until WG.00.07 is DONE.\n- ATK-19B-002: CLOSED per grok.\n" +
            "- WG.00.12 Merged into main (83bcc1a7). Backup infrastructure verified.\n| WG.00.10 | DONE |\n\n| ID | Status |\n|---|---|\n| WG.00.11 | DONE |\n\n" +
            "- Dispatching WG.00.13 audits (durable mailboxes, closed-world census).\n";
        const got = cm.proseClaims(text, new Set(["ATK-19B-002"])).map(c => `${c.id}:${c.word}`).sort().join(",");
        return pairs([[got, "ATK-19B-002:CLOSED,WG.00.08:DONE,WG.00.10:DONE"]]);
    } },
    { name: "unit_decisions_and_lane_matrix", run(cm) {
        const d = cm.parseDecisions(OWNER_DOC), m = cm.parseLaneMatrix(STATUS_DOC);
        return pairs([[/DECIDED/.test((d.get("DEC-900") || {}).status), true, "DEC-900"], [(d.get("DEC-901") || {}).status, "OPEN", "DEC-901"],
            [m && m.lanes.length, 5, "lanes"], [m && m.frozen.length, 1, "frozen"], [m && m.lanes.find(l => l.key === "c2").agents.has("claude"), true, "c2"],
            [m && m.lanes.find(l => l.key === "coordinator").agents.has("gemini"), true, "coordinator"], [m && m.lanes.find(l => l.key === "d").agents.has("grok"), true, "d"]]);
    } }
];

// ---------------------------------------------------------------- real history (read-only)

const realHas = sha => spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: REAL_ROOT, env: cleanEnv() }).status === 0;

function runReal(checker, args) {
    const r = spawnSync(process.execPath, [checker, ...args, "--json"], { cwd: REAL_ROOT, encoding: "utf8", env: cleanEnv() });
    return { status: r.status, json: parseJson(r.stdout), stderr: r.stderr };
}

const REAL = [
    { name: "real_31676cf_WG.00.08_DONE_without_reviewer_fails_4.2", needs: ["31676cf"], run(checker) {
        const r = runReal(checker, ["--commit", "31676cf"]);
        const v42 = r.json ? r.json.results[0].rules["4.2"].violations : [];
        return { ok: r.status === 1 && v42.some(v => v.includes("WG.00.08") && v.includes("no independent reviewer")), detail: `exit ${r.status}; 4.2: ${JSON.stringify(v42).slice(0, 300)}` };
    } },
    { name: "real_d1fbeab_ledger_chain_bursts_flagged", needs: ["d1fbeab"], run(checker) {
        const dir = path.join(TMP, "real");
        fs.mkdirSync(dir, { recursive: true });
        const files = [["tasks/WG.00.08/defects.jsonl", "defects.jsonl"], ["tasks/messages.jsonl", "messages.jsonl"]].map(([src, dst]) => {
            const out = spawnSync("git", ["cat-file", "blob", `d1fbeab:${src}`], { cwd: REAL_ROOT, encoding: "utf8", env: cleanEnv() }).stdout;
            fs.writeFileSync(path.join(dir, dst), out);
            return path.join(dir, dst);
        });
        const r = spawnSync(process.execPath, [checker, "--check-backfill", "--json", ...files], { cwd: REAL_ROOT, encoding: "utf8", env: cleanEnv() });
        const j = parseJson(r.stdout);
        const b1 = j ? new Set(j.flags.filter(f => f.code === "B1").map(f => f.item)) : new Set();
        const b2 = j ? j.flags.filter(f => f.code === "B2").map(f => f.msg) : [];
        return { ok: r.status === 1 && b1.has("ATK-19B-001") && b1.has("ATK-19B-002") && b2.some(x => x.includes("20:55:37")), detail: `exit ${r.status}; B1 items ${[...b1].join(", ")}; B2 ${b2.length}` };
    } },
    { name: "real_integration_merges_and_lane_commits_pass", needs: ["e07c86ea", "8db39b0", "83bcc1a7", "8c0c210", "da2c16b", "0f7f26c", "d09a129", "4a3a56f", "37ac57d"], run(checker) {
        const revs = this.needs;
        const r = runReal(checker, revs.flatMap(x => ["--commit", x]));
        const bad = r.json ? r.json.results.filter(x => !x.ok).map(x => `${x.label}: ${JSON.stringify(Object.values(x.rules).flatMap(y => y.violations)).slice(0, 200)}`) : ["no JSON"];
        return { ok: r.status === 0 && r.json && r.json.results.length === revs.length, detail: `exit ${r.status}; ${bad.join(" | ")}` };
    } },
    { name: "real_2355931_pre_epoch_lane_commit_grandfathered", needs: ["2355931", "a12f94a7"], run(checker) {
        const r = runReal(checker, ["--commit", "2355931"]);
        const res = r.json && r.json.results[0];
        return { ok: r.status === 0 && res && res.historical && res.grandfathered.length > 0, detail: `exit ${r.status}; ${JSON.stringify(res && res.grandfathered).slice(0, 300)}` };
    } },
    { name: "real_epoch_override_cannot_widen", needs: ["a12f94a7"], run(checker) {
        const clone = path.join(TMP, `real-clone-${Math.random().toString(36).slice(2, 8)}`);
        const g = (...a) => spawnSync("git", a, { cwd: clone, encoding: "utf8", env: cleanEnv() });
        const c = spawnSync("git", ["clone", "-q", "--shared", "--no-checkout", REAL_ROOT, clone], { encoding: "utf8", env: cleanEnv() });
        if (c.status !== 0) return { ok: false, detail: `clone failed: ${c.stderr}` };
        g("config", "user.name", "DEUS Test"); g("config", "user.email", "test@deus.invalid");
        const epoch = g("rev-parse", "a12f94a7").stdout.trim();
        const newer = g("commit-tree", `${epoch}^{tree}`, "-p", epoch, "-m", "TEST_ commit after the epoch").stdout.trim();
        const run = args => spawnSync(process.execPath, [checker, ...args], { cwd: clone, encoding: "utf8", env: cleanEnv() });
        const widen = run(["--commit", epoch, "--epoch", newer]);
        const narrow = run(["--commit", epoch, "--epoch", `${epoch}~1`, "--json"]);
        return { ok: /^[0-9a-f]{40}$/.test(newer) && widen.status === 2 && /only move the epoch back/.test(widen.stderr) && narrow.status !== 2,
            detail: `newer ${newer}; widen exit ${widen.status} ${widen.stderr.trim().slice(0, 200)}; narrow exit ${narrow.status} ${narrow.stderr.trim().slice(0, 200)}` };
    } }
];

// ---------------------------------------------------------------- mutants

const BS = String.fromCharCode(92);
const MUTANTS = [
    // 4.1 evidence
    { name: "4.1_evidence_gate_off", from: "const ok = missing.length === 0 && (commits.some(c => c.reachable) || testRun);", to: "const ok = true;", kills: ["fail41_done_without_evidence"] },
    { name: "4.1_reachability_ignored", from: "reachable: ctx.bases.some(b => G.isAncestor(shas[i], b)) });", to: "reachable: true });", kills: ["fail41_commit_not_reachable"] },
    { name: "4.1_text_test_claim_trusted", from: "const testRun = scripts.length > 0 && passing.length > 0;", to: "const testRun = scripts.length > 0 && (passing.length > 0 || PASS_OUTCOME_RE.test(s));", kills: ["fail41_test_claim_text_only"] },
    { name: "4.1_failing_log_accepted", from: "return PASS_OUTCOME_RE.test(t) && !FAIL_OUTCOME_RE.test(t); });", to: "return true; });", kills: ["fail41_failing_test_log"] },
    { name: "4.1_missing_evidence_files_ignored", from: "const ok = missing.length === 0 && (", to: "const ok = (", kills: ["fail41_cited_evidence_file_missing"] },
    { name: "4.1_defect_status_column_loss_ignored", from: "if (lost.length) {", to: "if (false) {", kills: ["fail41_defect_status_column_renamed"] },
    { name: "4.1_defect_tables_first_only", from: "for (const t of parseTables(text).tables) {",
        to: String.raw`for (const t of parseTables(text).tables.filter(x => x.rows.some(r => DEFECT_ID_RE.test(clean(r.cells[0]).toUpperCase()))).slice(0, 1)) {`, kills: ["fail41_second_defect_table_closed"] },
    // 4.2 closers
    { name: "4.2_wbs_reviewer_not_required", from: "if (!valid.size) {", to: "if (false) {", kills: ["fail42_wbs_done_no_reviewer_committer_is_owner"] },
    { name: "4.2_typed_closedby_accepted", from: "    return reviewArtifact(reviewer, id, text, ctx);", to: "    return { ok: true };", kills: ["fail42_typed_closedby_without_artifact"] },
    { name: "4.2_artifact_author_unchecked", from: "if (!last || last.agent !== reviewer) {", to: "if (!last) {", kills: ["fail42_artifact_by_another_agent"] },
    { name: "4.2_artifact_same_commit_by_anyone", from: "if (ctx.agent !== reviewer) { why.push(", to: "if (false) { why.push(", kills: ["fail42_artifact_forged_in_same_commit"] },
    { name: "4.2_artifact_id_unchecked", from: "if (!idForms(id).some(f => body.includes(f))) {", to: "if (false) {", kills: ["fail42_artifact_does_not_mention_leaf"] },
    { name: "4.2_closer_may_be_committer", from: "else if (valid.has(ctx.agent)) R.fail(", to: "else if (false) R.fail(", kills: ["fail42_closer_is_committer"] },
    { name: "4.2_reviewer_regex_unknown_names_ignored", from: "if (invalid.length) R.fail(", to: "if (false) R.fail(", kills: ["fail42_unknown_closer_beside_valid"] },
    { name: "4.2_reviewer_regex_off", from: "for (const m of normText(text).matchAll(REVIEWER_RE)) {", to: "for (const m of []) {", kills: ["pass_wbs_done_with_commit_and_reviewer"] },
    { name: "4.2_reviewer_regex_unnormalized", from: "for (const m of normText(text).matchAll(REVIEWER_RE)) {", to: "for (const m of String(text).matchAll(REVIEWER_RE)) {", kills: ["unit:unit_reviewers_and_agents"] },
    { name: "4.2_ledger_closer_not_validated", from: "agent: strictAgent(raw) };", to: "agent: normAgent(raw) };", kills: ["fail42_ledger_closedby_not_an_agent"] },
    { name: "4.2_owner_needs_no_decision", from: "if (reviewer === \"owner\") return ownerDecision(text, ctx);", to: "if (reviewer === \"owner\") return { ok: true };", kills: ["fail42_owner_closure_without_dec"] },
    { name: "4.2_decision_status_ignored", from: String.raw`if (!/\bDECIDED\b/.test(e.status)) {`, to: "if (false) {", kills: ["fail42_owner_closure_dec_open"] },
    { name: "4.2_decisions_read_from_new_tree", from: "decisions: parseDecisions(parentTree.read(PATHS.decisions))", to: "decisions: parseDecisions(target.newTree.read(PATHS.decisions))", kills: ["fail42_owner_closure_dec_added_in_same_commit"] },
    { name: "4.2_closer_may_be_fixer", from: "else if (fixers.has(c.agent)) R.fail(", to: "else if (false) R.fail(", kills: ["fail42_ledger_closedby_is_fixer"] },
    { name: "4.2_fixer_may_commit_closure", from: "else if (fixers.has(ctx.agent)) R.fail(", to: "else if (false) R.fail(", kills: ["fail42_ledger_fixer_commits_closure"] },
    { name: "4.2_unknown_committer_allowed", from: "if (!ctx.agent) R.fail(\"4.2\", `${where}: the committing agent is unknown, so it cannot be told apart from the fixers",
        to: "if (false) R.fail(\"4.2\", `${where}: the committing agent is unknown, so it cannot be told apart from the fixers", kills: ["fail42_closure_by_unknown_committer"] },
    { name: "4.2_status_prose_not_scanned", from: "if (ch.path === PATHS.status) checkStatusProse(", to: "if (false) checkStatusProse(", kills: ["fail42_status_prose_claim"] },
    // status parsing (statusWord / statusOf)
    { name: "status_allowlist_replaced_by_denylist", from: "if (!NON_TERMINAL_ALIAS.has(joined(primary))) return terminal(joined(primary));",
        to: "if ([\"DONE\", \"CLOSED\", \"COMPLETE\", \"COMPLETED\", \"RESOLVED\"].includes(joined(primary))) return terminal(joined(primary));", kills: ["fail_status_unknown_word"] },
    { name: "status_closing_words_ignored", from: "if (!TERMINAL_WORDS.has(p.words[i])) continue;", to: "continue;", kills: ["fail_status_transition_annotation"] },
    { name: "status_arrow_targets_unchecked", from: "for (const p of active) if (p.strong && !NON_TERMINAL_ALIAS.has(joined(p))) return terminal(joined(p));", to: "", kills: ["fail_status_arrow_to_unknown"] },
    { name: "status_negation_ignored", from: "if (p.words.slice(Math.max(0, i - 3), i).some(w => NEGATORS.has(w))) continue;", to: "if (false) continue;", kills: ["pass_status_negated_closure_word"] },
    { name: "status_prose_compounds_claimed", from: "if (prose && i + 1 < p.words.length && /^-+$/.test(p.joins[i] || \"\")) continue;", to: "", kills: ["unit:unit_prose_claims"] },
    { name: "status_determiners_ignored", from: "if (i > 0 && DETERMINERS.has(p.words[i - 1])) continue;", to: "if (false) continue;", kills: ["unit:unit_status_allowlist"] },
    { name: "status_unicode_arrows_ignored", from: "        .replace(ARROW_RIGHT_RE, ` ${ARROW.R} `)", to: "        .replace(ARROW_RIGHT_RE, \" \")", kills: ["pass_status_arrow_to_nonterminal", "fail_status_unicode_arrow"] },
    { name: "status_ascii_arrows_ignored", from: "        .replace(/-+>|=+>|>>|~>/g, ` ${ARROW.R} `)", to: "        .replace(/-+>|=+>|>>|~>/g, \" \")", kills: ["fail_status_ascii_arrow"] },
    { name: "status_label_not_stripped", from: "p.label = true;", to: "p.label = false;", kills: ["pass_status_label_nonterminal"] },
    { name: "status_emphasis_not_stripped", from: "return s.replace(/[*`]+/g, \"\")", to: "return s.replace(/(?!)/g, \"\")", kills: ["fail_status_emphasis_split"] },
    { name: "status_invisible_chars_kept", from: ".replace(INVISIBLE_RE, \"\")", to: "", kills: ["fail_status_zero_width"] },
    { name: "status_no_nfkc", from: String.raw`.normalize("NFKD").replace(/\p{M}/gu, "").replace(INVISIBLE_RE, "").normalize("NFKC");`,
        to: String.raw`.normalize("NFD").replace(/\p{M}/gu, "").replace(INVISIBLE_RE, "").normalize("NFC");`, kills: ["fail_status_fullwidth"] },
    { name: "status_entities_not_decoded", from: "return stripEmphasis(normText(decodeEntities(s)));", to: "return stripEmphasis(normText(s));", kills: ["fail_status_html_entity"] },
    { name: "status_strikethrough_kept", from: String.raw`.replace(/(~~?)(?![~\s])([^~]*?[^~\s])\1(?!~)/g, " ")`, to: "", kills: ["pass_status_struck_old_value"] },
    { name: "status_leaf_tables_need_wbs_header", from: "const rows = t.rows.map(r => ({ r, id: leafKey(clean(r.cells[0])) })).filter(x => x.id);",
        to: String.raw`const rows = !/^WBS\b/i.test(h[0]) ? [] : t.rows.map(r => ({ r, id: leafKey(clean(r.cells[0])) })).filter(x => x.id);`, kills: ["fail_status_second_table_leaf"] },
    // identity and reads
    { name: "identity_env_overrides_audited_commit", from: "const env = ctx.sha ? {} : process.env;", to: "const env = process.env;", kills: ["fail44_commit_mode_uses_subject_agent"] },
    { name: "identity_shared_lane_agent_dropped", from: "if (shared.length === 1) { agent = shared[0]; agentSource = \"lane row\"; }", to: "if (false) { agent = shared[0]; }", kills: ["pass_lane_given_as_agent_name"] },
    { name: "bom_not_stripped", from: `cache.set(p, r.ok ? r.out.replace(/^${BS}uFEFF/, "")`, to: "cache.set(p, r.ok ? r.out", kills: ["pass_bom_added_to_ledger"] },
    // 4.3 revision and immutability
    { name: "4.3_rev_increase_not_required", from: "if (added.length && !revUp)", to: "if (false)", kills: ["fail43_leaf_added_without_rev"] },
    { name: "4.3_deleted_leaves_allowed", from: "if (!expanded) R.fail(\"4.3\"", to: "if (false) R.fail(\"4.3\"", kills: ["fail43_leaf_deleted"] },
    { name: "4.3_range_expansion_counts_as_deletion", from: "const expanded = rangeIds(id).length > 0 && rangeIds(id).every(one => n.leaves.has(one));", to: "const expanded = false;", kills: ["pass_range_row_expanded_with_rev"] },
    { name: "4.3_range_overlap_ignored", from: "for (const one of rangeIds(id)) if (out.leaves.has(one)) out.dups.push(", to: "for (const one of []) if (out.leaves.has(one)) out.dups.push(", kills: ["fail43_single_row_inside_range"] },
    { name: "4.3_rev_header_optional", from: "if (n.rev == null) R.fail(", to: "if (false) R.fail(", kills: ["fail43_rev_header_removed"] },
    { name: "4.3_status_column_optional", from: "if (!si.length) {", to: "if (false) {", kills: ["fail43_wbs_status_column_renamed"] },
    { name: "4.3_revlog_contiguity_unchecked", from: "if (revs[i] !== revs[i - 1] + 1) out.problems.push(", to: "if (false) out.problems.push(", kills: ["fail43_rev_log_gap"] },
    { name: "4.3_revlog_row_deletion_allowed", from: "if (!now) R.fail(\"4.3\", `${p}: the Revision Log row for Rev ${rev} was deleted", to: "if (false) R.fail(\"4.3\", `${p}: the Revision Log row for Rev ${rev} was deleted", kills: ["fail43_rev_log_row_deleted"] },
    { name: "4.3_revlog_row_rewrite_allowed", from: "else if (now.text !== row.text) R.fail(", to: "else if (false) R.fail(", kills: ["fail43_rev_log_row_rewritten"] },
    { name: "4.3_revlog_header_synonyms_dropped", from: String.raw`const isRevHeader = h => /^(?:rev(?:ision)?|ver(?:sion)?)\.?(?:\s*(?:#|no\.?|number))?$/i.test(h);`, to: "const isRevHeader = h => /^rev$/i.test(h);", kills: ["pass_rev_log_header_synonym"] },
    { name: "4.3_revlog_section_detection_off", from: String.raw`if (!/^\s{0,3}#{1,6}\s/.test(l) || !/\b(?:revision\s+(?:log|history)|change\s*log|changelog)\b/i.test(normText(l))) return;`, to: "return;", kills: ["fail43_rev_log_header_renamed"] },
    { name: "4.3_revlog_table_optional", from: "if (!nl.found) R.fail(", to: "if (false) R.fail(", kills: ["fail43_rev_log_removed"] },
    { name: "4.3_ledger_append_only_off", from: "if (kept < oldLines.length) {", to: "if (false) {", kills: ["fail43_ledger_line_deleted"] },
    // ledger hardening
    { name: "ledger_keys_case_sensitive", from: "for (const [k, x] of Object.entries(v)) { const nk = normKey(k);",
        to: "for (const [k, x] of Object.entries(v)) { const nk = [\"defectId\", \"taskId\", \"closedBy\", \"fixedBy\", \"fixCommit\", \"closedAt\", \"messageId\"].includes(k) ? normKey(k) : k;", kills: ["pass_ledger_mixed_case_keys_fix_ready"] },
    { name: "ledger_duplicate_keys_allowed", from: "if (conflicts.length) {", to: "if (false) {", kills: ["fail41_ledger_ambiguous_duplicate_keys"] },
    { name: "ledger_denylist_instead_of_allowlist", from: "if (!st.terminal) return;", to: "if (![\"DONE\", \"CLOSED\", \"COMPLETE\", \"COMPLETED\", \"RESOLVED\", \"FIXED\", \"VERIFIED\"].includes(st.word)) return;", kills: ["fail42_ledger_unlisted_terminal_status"] },
    // 4.4 whitelist, grandfathering and the range gate
    { name: "4.4_whitelist_off", from: "if (lanes.some(l => l.globs.some(g => g.re.test(ch.path)))) continue;", to: "continue;", kills: ["fail44_file_of_another_lane"] },
    { name: "4.4_whitelist_read_from_staged_status", from: "const matrix = parseLaneMatrix(parentTree.read(PATHS.status));", to: "const matrix = parseLaneMatrix(target.newTree.read(PATHS.status));", kills: ["fail44_commit_widens_own_whitelist"] },
    { name: "4.4_frozen_row_ignored", from: "const frozen = ctx.matrix.frozen.find(g => g.reI.test(ch.path));", to: "const frozen = null;", kills: ["fail44_frozen_path_even_for_coordinator"] },
    { name: "4.4_merge_counts_every_merged_path", from: "const mergeHead = revParse(\"MERGE_HEAD^{commit}\");", to: "const mergeHead = null;", kills: ["pass_clean_merge_by_coordinator"] },
    { name: "4.4_empty_merge_needs_identity", from: "if (!ctx.changes.length) return;", to: "if (false) return;", kills: ["pass_commit_merge_without_agent_subject"] },
    { name: "4.4_subtree_glob_off", from: String.raw`const subtree = /\/\*{1,2}$/.test(g) || g.endsWith("/");`, to: "const subtree = g.endsWith(\"/\");", kills: ["pass_subtree_whitelist"] },
    { name: "grandfather_every_audited_commit", from: "const historical = Boolean(target.sha && epoch && epoch.sha && (target.sha === epoch.sha || facts.isAncestor(target.sha, epoch.sha)));",
        to: "const historical = Boolean(target.sha);", kills: ["fail44_post_epoch_not_grandfathered"] },
    { name: "grandfather_nothing", from: "const historical = Boolean(target.sha && epoch && epoch.sha && (target.sha === epoch.sha || facts.isAncestor(target.sha, epoch.sha)));",
        to: "const historical = false;", kills: ["pass44_grandfathered_pre_epoch"] },
    { name: "grandfather_covers_all_rules", from: "for (const ch of target.changes) {", to: "for (const ch of (historical ? [] : target.changes)) {", kills: ["fail41_pre_epoch_commit_still_checked"] },
    { name: "epoch_override_may_widen", from: "if (builtIn && sha !== builtIn && !facts.isAncestor(sha, builtIn)) {", to: "if (false) {", kills: ["real:real_epoch_override_cannot_widen"] },
    { name: "range_base_ancestry_unchecked", from: "if (!facts.isAncestor(base, head)) problems.push(", to: "if (false) problems.push(", kills: ["range_gate_rejects_rewritten_base"] },
    { name: "range_merge_lane_hints_off", from: "const lane = mergedLane(t.subject);", to: "const lane = null;", kills: ["range_gate_merge_lane_hint"] },
    { name: "range_head_ref_hint_off", from: "const headLane = laneOfRef(headRev);", to: "const headLane = null;", kills: ["range_gate_head_ref_hint"] },
    { name: "range_symmetric_allowed", from: "if (spec.includes(\"...\")) throw", to: "if (false) throw", kills: ["range_gate_refuses_symmetric_range"] },
    // backfill and hook
    { name: "backfill_B1_window_zero", from: "a.actor !== b.actor && dt < burstMs", to: "a.actor !== b.actor && dt < 0", kills: ["backfill_chain_burst_B1"] },
    { name: "backfill_B2_off", from: "if (items.length >= 2) {", to: "if (items.length >= 99) {", kills: ["backfill_batch_burst_B2"] },
    { name: "backfill_window_inclusive", from: "s.t - group[group.length - 1].t >= burstMs", to: "s.t - group[group.length - 1].t > burstMs", kills: ["backfill_window_edge_1000ms_not_flagged"] },
    { name: "hook_fails_open_without_checker", from: "\"  exit 1\",", to: "\"  exit 0\",", kills: ["hook"] },
    { name: "hook_runs_working_tree_checker", from: "\"exec node \\\"$tmp\\\" --pre-commit\",", to: "\"exec node \\\"$(git rev-parse --show-toplevel)/$rel\\\" --pre-commit\",", kills: ["hook"] }
];

// ---------------------------------------------------------------- main

function main() {
    console.log("=== check_claims.js tests (WG.00.12 Lanes C2 and C2b) ===");
    console.log(`temp repository: ${TMP}`);
    const cm = require(CHECKER);
    const unitByName = new Map();
    for (const u of UNITS) {
        unitByName.set(u.name, u);
        let res;
        try { res = u.run(cm); } catch (e) { res = [false, `threw ${e.message}`]; }
        check(u.name, res[0], res[1]);
    }

    let repo;
    try {
        repo = buildFixture();
    } catch (e) {
        check("fixture_setup", false, e.message);
        return finish();
    }

    const caseByName = new Map();
    for (const c of CASES) {
        if (caseByName.has(c.name)) check(`case_name_unique_${c.name}`, false, "duplicate case name");
        caseByName.set(c.name, c);
        const r = runCase(repo, c, CHECKER);
        check(c.name, r.ok, r.detail);
    }
    for (const c of BACKFILL_CASES) {
        caseByName.set(c.name, c);
        const r = runBackfillCase(repo, c, CHECKER);
        check(c.name, r.ok, r.detail);
    }
    const hook = runHookCase(repo, CHECKER);
    check("hook_install_reject_tamper_accept_failclosed_uninstall", hook.ok, hook.detail);

    // text output keeps the ENGINE_RULES §6 shape
    repo.reset();
    repo.append("docs/STATUS.md", "TEST_ edit by lane C2");
    repo.stage("docs/STATUS.md");
    const txt = spawnSync(process.execPath, [CHECKER, "--lane", "c2"], { cwd: repo.dir, encoding: "utf8", env: cleanEnv() });
    check("text_output_pass_fail_result_lines", txt.status === 1 && /^FAIL 4\.4 /m.test(txt.stdout) && /^PASS 4\.1 /m.test(txt.stdout) &&
        /^RESULT: 3 passed, 1 failed - commit rejected$/m.test(txt.stdout), `exit ${txt.status}: ${txt.stdout.slice(-300)}`);

    const realByName = new Map();
    for (const t of REAL) {
        realByName.set(t.name, t);
        const missing = t.needs.filter(s => !realHas(s));
        if (missing.length) { console.log(`SKIP ${t.name}: ${missing.join(", ")} not in this repository`); t.skipped = true; continue; }
        const r = t.run(CHECKER);
        check(t.name, r.ok, r.detail);
    }

    // mutants: every one must make at least one named check fail
    const src = fs.readFileSync(CHECKER, "utf8");
    const mdir = path.join(TMP, "mutants");
    fs.mkdirSync(mdir, { recursive: true });
    for (const mu of MUTANTS) {
        const count = src.split(mu.from).length - 1;
        if (count !== 1) { check(`mutant_${mu.name}_killed`, false, `mutation target found ${count} times, expected once`); continue; }
        const skipped = mu.kills.filter(k => k.startsWith("real:") && (!realByName.get(k.slice(5)) || realByName.get(k.slice(5)).skipped));
        if (skipped.length === mu.kills.length) { console.log(`SKIP mutant_${mu.name}_killed: its checks (${skipped.join(", ")}) were skipped`); continue; }
        const file = path.join(mdir, `check_claims.${mu.name}.js`);
        fs.writeFileSync(file, src.replace(mu.from, () => mu.to));
        const outcomes = mu.kills.map(k => {
            if (k === "hook") return runHookCase(repo, file);
            if (k.startsWith("unit:")) {
                const u = unitByName.get(k.slice(5));
                if (!u) return { ok: true, detail: `no unit ${k}` };
                try { delete require.cache[require.resolve(file)]; const res = u.run(require(file)); return { ok: res[0] }; } catch (e) { return { ok: false }; }
            }
            if (k.startsWith("real:")) {
                const t = realByName.get(k.slice(5));
                if (!t || t.skipped) return { ok: true, detail: `real check ${k} skipped` };
                return t.run(file);
            }
            const c = caseByName.get(k);
            if (!c) return { ok: true, detail: `no case ${k}` };
            return c.records ? runBackfillCase(repo, c, file) : runCase(repo, c, file);
        });
        const killed = outcomes.some(o => !o.ok);
        check(`mutant_${mu.name}_killed`, killed, `mutant survived: ${mu.kills.join(", ")} still met expectations`);
    }
    return finish();
}

function finish() {
    if (!KEEP) {
        try { fs.rmSync(TMP, { recursive: true, force: true, maxRetries: 3 }); } catch (e) { console.log(`NOTE temp repository not removed: ${e.message}`); }
    } else console.log(`kept ${TMP}`);
    console.log(`RESULT: ${passed} passed, ${failed} failed`);
    return failed ? 1 : 0;
}

process.exitCode = main();
