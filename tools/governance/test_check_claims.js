#!/usr/bin/env node
"use strict";

/**
 * tools/governance/test_check_claims.js
 *
 * WG.00.12 Lane C2: tests for tools/governance/check_claims.js.
 * Builds a throwaway git repository in the OS temp folder: a fixture docs/STATUS.md lane matrix,
 * a WBS file and two defect ledgers, a fix commit, an unmerged branch and a lane-B branch.
 * Each case resets to that baseline, stages one change and runs the checker on it. Clean cases
 * must pass. Each forbidden change must be rejected under exactly the rules named for it.
 * Then mutants of the checker, each with one check switched off, must each fail a case, which
 * shows the checks can fail (AGENTS.md rule 4, ENGINE_RULES §6). The hook case installs the
 * pre-commit hook in the throwaway repository only.
 * Two real-history cases run read-only in this repository when the commits exist: 31676cf
 * (WG.00.08 marked DONE with no independent reviewer) must fail 4.2, and the WG.00.08 ledger and
 * message bus as of d1fbeab must show the chain bursts Grok called backfill.
 *
 * Usage: node tools/governance/test_check_claims.js [--keep]   (--keep leaves the temp repository)
 * Output: PASS <name> / FAIL <name>: <detail>, then RESULT: <n> passed, <m> failed. Exit 1 on any failure.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const CHECKER = path.join(__dirname, "check_claims.js");
const REAL_ROOT = path.resolve(__dirname, "..", "..");
const KEEP = process.argv.includes("--keep");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "deus-check-claims-"));

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
        let json = null;
        try { json = JSON.parse(r.stdout); } catch (e) { /* judged below */ }
        return { status: r.status, json, stdout: r.stdout, stderr: r.stderr };
    }
}

const STATUS_DOC = `# STATUS fixture (TEST_)

## 3. Strict File-Ownership Matrix (No Overlapping Write Sets)

| Lane / Owner | Exclusive File Whitelist (Full Paths) | Access Policy |
|---|---|---|
| **Gemini (Coordinator)** | \`docs/STATUS.md\`<br>\`docs/worldgen/TEST_WBS.md\` | **Exclusive Writer.** |
| **Lane A (Gemini)** | \`tasks/TEST.01/*\` | **Exclusive Writer.** |
| **Lane B (Fable)** | \`src/fix.js\`<br>\`tools/test_fix.js\`<br>\`tasks/TEST.02/*\` | **Exclusive Writer.** |
| **Lane C2 (Claude Subagent)** | \`tools/governance/check_claims.js\`<br>\`tools/governance/test_check_claims.js\`<br>\`.git/hooks/pre-commit\` | **Exclusive Writer.** |
| **Lane D (Grok)** | \`tasks/TEST.01/defects.jsonl\` | **Exclusive Writer.** |
| **FROZEN / READ-ONLY** | \`C:\\Dev\\DEUS\`<br>\`engine/core.js\` | **Strictly Read-Only.** |

## 4. Open Defects & Blockers

| Defect / Finding ID | Task / WBS | Severity | Title & Requirement | Status | Owner |
|---|---|:---:|---|:---:|:---:|
| **TEST-DEF-001** | \`TW.00.02\` | \`MAJOR\` | TEST_ defect one. | \`FIX_READY\` | Fable / Grok |
| **TEST-DEF-003** | \`TW.00.02\` | \`MINOR\` | TEST_ finding with no ledger. | \`OPEN\` | Gemini / Grok |
`;

const BASE_ROWS = [
    "| **TW.00.01** | TEST_Foundation | Gemini | TEST_ scope one. | `DONE` (legacy) |",
    "| **TW.00.02** | TEST_Cuts | Fable | TEST_ scope two. | `REVIEW` |",
    "| **TW.00.03** | TEST_Renderer | Fable / Gemini | TEST_ scope three. | `QUEUED` |",
    "| **TW.00.04** | TEST_Census | Gemini | TEST_ scope four. | `ACTIVE` |",
    "| **TW.10.01–03** | TEST_Range | Gemini | TEST_ three leaves in one row. | `PLANNED` |"
];
const RANGE_ROW = BASE_ROWS[4];
const RANGE_EXPANDED = ["01", "02", "03"].map(n => `| **TW.10.${n}** | TEST_Range_${n} | Gemini | TEST_ range leaf ${n}. | \`PLANNED\` |`);

function wbsDoc({ rev = 3, rows = BASE_ROWS, log = [3] } = {}) {
    return [
        "# TEST_ WorldGen WBS", "",
        "**Namespace:** TW  ", `**Rev:** ${rev}  `, "**IDs:** Stable.", "", "---", "",
        "## 2. Leaves", "",
        "| WBS Leaf | Title | Owner | Scope & Deliverables | Status |",
        "| :--- | :--- | :---: | :--- | :---: |",
        ...rows, "", "---", "",
        "## Revision Log", "",
        "| Rev | Date | Change |", "|:---:|:---:|:---|",
        ...log.slice().reverse().map(r => `| ${r} | 2026-09-25 | TEST_ change ${r}. |`), ""
    ].join("\n");
}

function rowsWith(id, row) {
    return BASE_ROWS.map(r => (r.includes(`**${id}**`) ? row : r));
}

const T = { open: "2026-09-25T10:00:00.000Z", fix: "2026-09-25T11:00:00.000Z", close: "2026-09-25T12:00:00.000Z" };

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
        closureEvidence: `grok review: ${fix7} is in the tree; node tools/test_fix.js 3/3 passed`,
        history: [...r.history, { state: "CLOSED", by: closer, timestamp: at }] }, over);
    if (closer == null) { delete r.closedBy; r.history = r.history.filter(h => h.state !== "CLOSED"); }
    return r;
}

function buildFixture() {
    const repo = new Repo(path.join(TMP, "repo"));
    repo.write("docs/STATUS.md", STATUS_DOC);
    repo.write("docs/worldgen/TEST_WBS.md", wbsDoc());
    repo.write("engine/core.js", "// TEST_ frozen engine core\n");
    repo.write("tools/governance/check_claims.js", "// TEST_ placeholder for the lane C2 tool\n");
    repo.write("tasks/TEST.01/defects.jsonl", JSON.stringify(openRecord("TEST-DEF-001", "TEST.01")) + "\n");
    repo.write("tasks/TEST.02/defects.jsonl", JSON.stringify(openRecord("TEST-DEF-002", "TEST.02")) + "\n");
    repo.commit("[gemini] TEST_ fixture baseline", ".");
    repo.write("src/fix.js", "module.exports = 1; // TEST_ fix\n");
    repo.write("tools/test_fix.js", "// TEST_ test script\n");
    const fix = repo.commit("[fable] TEST_ fix for TEST-DEF-001 and TEST-DEF-002", ".");
    repo.fix7 = fix.slice(0, 7);
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

function doneRow(id, title, owner, status) {
    const scope = BASE_ROWS.find(r => r.includes(`**${id}**`)).split("|")[4].trim();
    return `| **${id}** | ${title} | ${owner} | ${scope} | ${status} |`;
}

const CASES = [
    // clean changes
    { name: "pass_c2_edits_own_tool_branch_identity", expect: [], setup(r) {
        r.git("checkout", "-q", "-B", "task/lane-c2", r.base);
        r.write("tools/governance/check_claims.js", "// TEST_ edited by lane C2\n");
        r.stage("tools/governance/check_claims.js");
        return [];
    } },
    { name: "pass_env_lane_b_edits_fix", expect: [], env: { DEUS_LANE: "b" }, setup(r) {
        r.write("src/fix.js", "module.exports = 3;\n");
        r.stage("src/fix.js");
        return [];
    } },
    { name: "pass_wbs_done_with_commit_and_reviewer", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", `\`DONE\` (${r.fix7}; closedBy: grok)`)) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_wbs_done_with_test_run_and_verdict", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", "`DONE` (node tools/test_fix.js: 3/3 passed; verdict: grok)")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_wbs_leaf_added_with_rev_and_log", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3, 4], rows: [...BASE_ROWS, "| **TW.00.05** | TEST_New | Fable | TEST_ scope five. | `PLANNED` |"] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_wbs_status_only_edit_without_rev", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.03", doneRow("TW.00.03", "TEST_Renderer", "Fable / Gemini", "`ACTIVE`")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_ledger_closed_by_reviewer", expect: [], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.stage(L1);
        return ["--lane", "d"];
    } },
    { name: "pass_status_row_closed_backed_by_ledger", expect: [], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.commit("[grok] TEST_ close TEST-DEF-001", L1);
        r.edit("docs/STATUS.md", "| `FIX_READY` | Fable / Grok |", `| \`CLOSED\` (${r.fix7}) | Fable / Grok |`);
        r.stage("docs/STATUS.md");
        return coordinator;
    } },
    { name: "pass_clean_merge_by_coordinator", expect: [], setup(r) {
        r.git("merge", "-q", "--no-ff", "--no-commit", "task/lane-b");
        return coordinator;
    } },
    { name: "pass_commit_mode_clean_commit", expect: [], setup(r) {
        r.write("tools/governance/check_claims.js", "// TEST_ lane C2 commit\n");
        r.commit("[claude] TEST_ tool update", "tools/governance/check_claims.js");
        return ["--commit", "HEAD"];
    } },

    // 4.1 evidence required
    { name: "fail41_done_without_evidence", expect: ["4.1"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", "`DONE` (closedBy: grok)")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail41_fabricated_hash", expect: ["4.1"], mention: ["deadbee1"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", "`DONE` (deadbee1; closedBy: grok)")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail41_commit_not_reachable", expect: ["4.1"], mention: ["not reachable"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", `\`DONE\` (${r.stranded7}; closedBy: grok)`)) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail41_failing_test_run", expect: ["4.1"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", "`DONE` (node tools/test_fix.js: 2/3 passed; closedBy: grok)")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail41_missing_test_script", expect: ["4.1"], mention: ["tools/test_missing.js"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", "`DONE` (node tools/test_missing.js exit 0; closedBy: grok)")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail41_synonym_completed", expect: ["4.1"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", "**COMPLETED** (closedBy: grok)")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail41_emoji_mixed_case_done", expect: ["4.1"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", "\u2705 Done (closedBy: grok)")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail41_status_table_closed_without_evidence", expect: ["4.1"], setup(r) {
        r.edit("docs/STATUS.md", "| `OPEN` | Gemini / Grok |", "| `CLOSED` (closedBy: grok) | Gemini / Grok |");
        r.stage("docs/STATUS.md");
        return coordinator;
    } },
    { name: "fail41_ledger_closure_without_evidence", expect: ["4.1"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closureEvidence: "looks fine", fixCommit: undefined,
            history: [{ state: "OPEN", by: "grok", timestamp: T.open }, { state: "FIX_READY", by: "fable", timestamp: T.fix }, { state: "CLOSED", by: "grok", timestamp: T.close }] })));
        r.stage(L1);
        return ["--lane", "d"];
    } },

    // 4.2 zero self-certification
    { name: "fail42_wbs_done_no_reviewer_committer_is_owner", expect: ["4.2"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.03", doneRow("TW.00.03", "TEST_Renderer", "Fable / Gemini", `\`DONE\` (${r.fix7})`)) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail42_wbs_owner_named_as_reviewer", expect: ["4.2"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", `\`DONE\` (${r.fix7}; closedBy: fable)`)) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail42_wbs_claude_alias_of_fable_owner", expect: ["4.2"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.02", doneRow("TW.00.02", "TEST_Cuts", "Fable", `\`DONE\` (${r.fix7}; closedBy: claude)`)) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail42_wbs_cited_commit_author_as_reviewer", expect: ["4.2"], setup(r) {
        r.write(WBS, wbsDoc({ rows: rowsWith("TW.00.04", doneRow("TW.00.04", "TEST_Census", "Gemini", `\`DONE\` (${r.fix7}; closedBy: fable)`)) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail42_ledger_closedby_is_fixer", expect: ["4.2"], mention: ["closedBy claude is one of the fixers"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closedBy: "fable" })));
        r.stage(L1);
        return ["--lane", "d"];
    } },
    { name: "fail42_ledger_fixer_commits_closure", expect: ["4.2"], mention: ["committed by claude"], setup(r) {
        r.append(L2, JSON.stringify(closeRecord("TEST-DEF-002", "TEST.02", r.fix7)));
        r.stage(L2);
        return ["--lane", "b"];
    } },
    { name: "fail42_ledger_closure_without_closedby", expect: ["4.2"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7, { closedBy: null })));
        r.stage(L1);
        return ["--lane", "d"];
    } },
    { name: "fail42_closure_by_unknown_committer", expect: ["4.2", "4.4"], mention: ["committing agent is unknown"], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.stage(L1);
        return [];
    } },
    { name: "pass_lane_given_as_agent_name", expect: [], setup(r) {
        r.append(L1, JSON.stringify(closeRecord("TEST-DEF-001", "TEST.01", r.fix7)));
        r.stage(L1);
        return ["--lane", "gemini"];
    } },
    { name: "pass_bom_added_to_ledger", expect: [], setup(r) {
        r.write(L2, "\uFEFF" + r.read(L2));
        r.append(L2, JSON.stringify(Object.assign(closeRecord("TEST-DEF-002", "TEST.02", r.fix7), { status: "VERIFY_PENDING" })));
        r.stage(L2);
        return ["--lane", "b"];
    } },
    { name: "fail42_status_row_closed_but_ledger_open", expect: ["4.2"], setup(r) {
        r.edit("docs/STATUS.md", "| `FIX_READY` | Fable / Grok |", `| \`CLOSED\` (${r.fix7}) | Fable / Grok |`);
        r.stage("docs/STATUS.md");
        return coordinator;
    } },

    // 4.3 WBS revision and immutability
    { name: "fail43_leaf_added_without_rev", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rows: [...BASE_ROWS, "| **TW.00.05** | TEST_New | Fable | TEST_ scope five. | `PLANNED` |"] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_leaf_deleted", expect: ["4.3"], mention: ["TW.00.03"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3, 4], rows: BASE_ROWS.filter(x => !x.includes("TW.00.03")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_leaf_renamed", expect: ["4.3"], mention: ["TW.00.03"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3, 4], rows: BASE_ROWS.map(x => x.replace("TW.00.03", "TW.00.09")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_leaf_retitled", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3, 4], rows: rowsWith("TW.00.03", "| **TW.00.03** | TEST_Something_Else | Fable / Gemini | TEST_ scope three. | `QUEUED` |") }));
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
    { name: "fail43_rev_up_without_log_row", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3], rows: [...BASE_ROWS, "| **TW.00.05** | TEST_New | Fable | TEST_ scope five. | `PLANNED` |"] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_duplicate_leaf_id", expect: ["4.3"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3, 4], rows: [...BASE_ROWS, "| **TW.00.02** | TEST_Other | Gemini | TEST_ other scope. | `PLANNED` |"] }));
        r.stage(WBS);
        return coordinator;
    } },

    { name: "pass_range_row_expanded_with_rev", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3, 4], rows: [...BASE_ROWS.filter(x => x !== RANGE_ROW), ...RANGE_EXPANDED] }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "pass_range_row_hyphen_for_en_dash", expect: [], setup(r) {
        r.write(WBS, wbsDoc({ rows: BASE_ROWS.map(x => x.replace("TW.10.01–03", "TW.10.01-03")) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_range_row_deleted", expect: ["4.3"], mention: ["TW.10.01–03"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3, 4], rows: BASE_ROWS.filter(x => x !== RANGE_ROW) }));
        r.stage(WBS);
        return coordinator;
    } },
    { name: "fail43_single_row_inside_range", expect: ["4.3"], mention: ["TW.10.02"], setup(r) {
        r.write(WBS, wbsDoc({ rev: 4, log: [3, 4], rows: [...BASE_ROWS, RANGE_EXPANDED[1]] }));
        r.stage(WBS);
        return coordinator;
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
        r.write("tools/governance/check_claims.js", "// TEST_\n");
        r.stage("tools/governance/check_claims.js");
        return [];
    } },
    { name: "fail44_declared_agent_does_not_hold_lane", expect: ["4.4"], env: { DEUS_AGENT: "grok" }, setup(r) {
        r.git("checkout", "-q", "-B", "task/lane-c2", r.base);
        r.write("tools/governance/check_claims.js", "// TEST_\n");
        r.stage("tools/governance/check_claims.js");
        return [];
    } },
    { name: "fail44_rename_out_of_lane", expect: ["4.4"], mention: ["tools/check_claims.js"], setup(r) {
        r.git("mv", "tools/governance/check_claims.js", "tools/check_claims.js");
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
    } }
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
    if (!r.json) return { ok: false, detail: `no JSON output, exit ${r.status}: ${(r.stderr || r.stdout).trim().slice(0, 300)}` };
    const got = failingRules(r.json), want = [...c.expect].sort();
    const v = violations(r.json);
    let ok = want.length ? r.status === 1 : r.status === 0;
    ok = ok && got.join(",") === want.join(",");
    const missing = (c.mention || []).filter(m => !v.some(x => x.includes(m)));
    ok = ok && missing.length === 0;
    const detail = `exit ${r.status}, failing rules [${got.join(", ")}], expected [${want.join(", ")}]` +
        (missing.length ? `, no violation mentions ${missing.join(", ")}` : "") + (v.length ? `; ${v.slice(0, 3).join(" | ")}` : "");
    return { ok, detail };
}

// ---------------------------------------------------------------- backfill cases

function jsonl(records) {
    return records.map(r => JSON.stringify(r)).join("\n") + "\n";
}

function stamped(id, times, over = {}) {
    const hist = [{ state: "OPEN", by: "grok", timestamp: times[0] }, { state: "FIX_READY", by: "fable", timestamp: times[1] }];
    const recs = [
        { defectId: id, status: "OPEN", finder: "grok", history: hist.slice(0, 1) },
        { defectId: id, status: "FIX_READY", finder: "grok", fixedBy: "fable", history: hist }
    ];
    if (times[2]) {
        const closer = "closedBy" in over ? over.closedBy : "grok";
        const rec = Object.assign({ defectId: id, status: "CLOSED", finder: "grok", fixedBy: "fable", closedBy: closer, closedAt: times[2],
            closureEvidence: "node tools/test_fix.js 3/3 passed",
            history: closer ? [...hist, { state: "CLOSED", by: closer, timestamp: times[2] }] : hist }, over);
        if (!closer) delete rec.closedBy;
        recs.push(rec);
    }
    return recs;
}

const BACKFILL_CASES = [
    { name: "backfill_clean_ledger_has_no_flags", flags: [], records: () =>
        stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"]) },
    { name: "backfill_chain_burst_B1", flags: ["B1"], records: () =>
        stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T10:00:00.047Z"]) },
    { name: "backfill_batch_burst_B2", flags: ["B2"], records: () => [
        ...stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"]),
        ...stamped("TEST-BF-2", ["2026-09-25T10:30:00.000Z", "2026-09-25T11:30:00.000Z", "2026-09-25T12:00:00.300Z"])] },
    { name: "backfill_window_edge_1000ms_not_flagged", flags: [], records: () => [
        ...stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"]),
        ...stamped("TEST-BF-2", ["2026-09-25T10:30:00.000Z", "2026-09-25T11:30:00.000Z", "2026-09-25T12:00:01.000Z"])] },
    { name: "backfill_window_edge_999ms_flagged", flags: ["B2"], records: () => [
        ...stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"]),
        ...stamped("TEST-BF-2", ["2026-09-25T10:30:00.000Z", "2026-09-25T11:30:00.000Z", "2026-09-25T12:00:00.999Z"])] },
    { name: "backfill_audit_trail_A1_A2_A3_A4", flags: ["A1", "A2", "A3", "A4"], records: () => [
        ...stamped("TEST-BF-1", ["2026-09-25T10:00:00.000Z", "2026-09-25T11:00:00.000Z", "2026-09-25T12:00:00.000Z"], { closedBy: null }),
        ...stamped("TEST-BF-2", ["2026-09-25T13:00:00.000Z", "2026-09-25T14:00:00.000Z", "2026-09-25T15:00:00.000Z"], { closedBy: "fable" }),
        ...stamped("TEST-BF-3", ["2026-09-25T16:00:00.000Z", "2026-09-25T18:00:00.000Z", "2026-09-25T17:00:00.000Z"]),
        ...stamped("TEST-BF-4", ["2026-09-25T19:00:00.000Z", "2026-09-25T20:00:00.000Z", "2026-09-25T21:00:00.000Z"], { closureEvidence: "trust me" })] }
];

function runBackfillCase(repo, c, checker) {
    repo.reset();
    repo.write("bf/defects.jsonl", jsonl(c.records()));
    const r = spawnSync(process.execPath, [checker, "--check-backfill", "--json", "bf/defects.jsonl"], { cwd: repo.dir, encoding: "utf8", env: cleanEnv() });
    let json = null;
    try { json = JSON.parse(r.stdout); } catch (e) { /* judged below */ }
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
    const onDisk = repo.file("tools/governance/check_claims.js");
    const run = args => spawnSync(process.execPath, [checker, ...args], { cwd: repo.dir, encoding: "utf8", env: cleanEnv() });
    const commit = msg => repo.tryGit(["commit", "-q", "-m", msg]);
    const head = () => repo.git("rev-parse", "HEAD");
    const steps = [];
    try {
        const inst = run(["--install-hook"]);
        steps.push(["install", inst.status === 0 && fs.existsSync(hookFile) && fs.readFileSync(hookFile, "utf8").includes("DEUS-GOVERNANCE-HOOK"), `exit ${inst.status} ${inst.stderr}`]);
        fs.copyFileSync(checker, onDisk);
        repo.append("docs/STATUS.md", "TEST_ out-of-lane edit");
        repo.stage("docs/STATUS.md");
        let before = head(), c = commit("[claude] TEST_ out of lane");
        steps.push(["rejects_out_of_lane_commit", c.status !== 0 && head() === before, `commit exit ${c.status}`]);
        repo.git("reset", "-q", "--hard", "HEAD");
        fs.copyFileSync(checker, onDisk);
        repo.stage("tools/governance/check_claims.js");
        before = head(); c = commit("[claude] TEST_ lane C2 tool");
        steps.push(["accepts_in_lane_commit", c.status === 0 && head() !== before, `commit exit ${c.status} ${c.stdout} ${c.stderr}`.slice(0, 400)]);
        fs.unlinkSync(onDisk);
        repo.write("tools/test_fix.js", "// TEST_\n");
        repo.stage("tools/test_fix.js");
        before = head(); c = commit("[claude] TEST_ commit without the checker on disk");
        steps.push(["fails_closed_without_checker", c.status !== 0 && head() === before, `commit exit ${c.status}`]);
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
    } finally {
        if (fs.existsSync(hookFile)) fs.unlinkSync(hookFile);
    }
    const bad = steps.filter(s => !s[1]);
    return { ok: bad.length === 0 && steps.length === 8, detail: bad.map(s => `${s[0]}: ${s[2]}`).join(" | ") || `only ${steps.length} of 8 steps ran`, steps };
}

// ---------------------------------------------------------------- mutants

const MUTANTS = [
    { name: "4.1_evidence_gate_off", from: "const ok = commits.some(c => c.reachable) || (existing.length > 0 && passed);", to: "const ok = true;", kills: ["fail41_done_without_evidence"] },
    { name: "4.1_reachability_ignored", from: "reachable: ctx.bases.some(b => G.isAncestor(shas[i], b)) });", to: "reachable: true });", kills: ["fail41_commit_not_reachable"] },
    { name: "4.1_synonym_COMPLETED_dropped", from: "\"COMPLETE\", \"COMPLETED\",", to: "\"COMPLETE\", \"X_COMPLETED\",", kills: ["fail41_synonym_completed"] },
    { name: "4.2_wbs_reviewer_not_required", from: "} else if (!reviewers.length) {", to: "} else if (false) {", kills: ["fail42_wbs_done_no_reviewer_committer_is_owner"] },
    { name: "4.2_closer_may_be_fixer", from: "else if (fixers.has(closer)) R.fail(", to: "else if (false) R.fail(", kills: ["fail42_ledger_closedby_is_fixer"] },
    { name: "4.2_fixer_may_commit_closure", from: "else if (fixers.has(ctx.agent)) R.fail(", to: "else if (false) R.fail(", kills: ["fail42_ledger_fixer_commits_closure"] },
    { name: "4.2_unknown_committer_allowed", from: "if (!ctx.agent) R.fail(\"4.2\", `${where}: the committing agent is unknown, so it cannot be told apart from the fixers", to: "if (false) R.fail(\"4.2\", `${where}: the committing agent is unknown, so it cannot be told apart from the fixers", kills: ["fail42_closure_by_unknown_committer"] },
    { name: "identity_env_overrides_audited_commit", from: "const env = ctx.sha ? {} : process.env;", to: "const env = process.env;", kills: ["fail44_commit_mode_uses_subject_agent"] },
    { name: "identity_shared_lane_agent_dropped", from: "if (shared.length === 1) { agent = shared[0]; agentSource = \"lane row\"; }", to: "if (false) { agent = shared[0]; }", kills: ["pass_lane_given_as_agent_name"] },
    { name: "bom_not_stripped", from: "cache.set(p, r.ok ? r.out.replace(/^\\uFEFF/, \"\")", to: "cache.set(p, r.ok ? r.out", kills: ["pass_bom_added_to_ledger"] },
    { name: "4.3_rev_increase_not_required", from: "if (added.length && !revUp)", to: "if (false)", kills: ["fail43_leaf_added_without_rev"] },
    { name: "4.3_deleted_leaves_allowed", from: "if (!expanded) R.fail(\"4.3\"", to: "if (false) R.fail(\"4.3\"", kills: ["fail43_leaf_deleted"] },
    { name: "4.3_range_expansion_counts_as_deletion", from: "const expanded = rangeIds(id).length > 0 && rangeIds(id).every(one => n.leaves.has(one));", to: "const expanded = false;", kills: ["pass_range_row_expanded_with_rev"] },
    { name: "4.3_range_overlap_ignored", from: "for (const one of rangeIds(id)) if (out.leaves.has(one)) out.dups.push(", to: "for (const one of []) if (out.leaves.has(one)) out.dups.push(", kills: ["fail43_single_row_inside_range"] },
    { name: "4.4_whitelist_off", from: "if (lanes.some(l => l.globs.some(g => g.re.test(ch.path)))) continue;", to: "continue;", kills: ["fail44_file_of_another_lane"] },
    { name: "4.4_whitelist_read_from_staged_status", from: "const statusText = target.statusRev ? makeTree(\"commit\", target.statusRev).read(PATHS.status) : null;", to: "const statusText = target.newTree.read(PATHS.status);", kills: ["fail44_commit_widens_own_whitelist"] },
    { name: "4.4_frozen_row_ignored", from: "const frozen = ctx.matrix.frozen.find(g => g.reI.test(ch.path));", to: "const frozen = null;", kills: ["fail44_frozen_path_even_for_coordinator"] },
    { name: "4.4_merge_counts_every_merged_path", from: "const mergeHead = revParse(\"MERGE_HEAD^{commit}\");", to: "const mergeHead = null;", kills: ["pass_clean_merge_by_coordinator"] },
    { name: "backfill_B1_window_zero", from: "a.actor !== b.actor && dt < burstMs", to: "a.actor !== b.actor && dt < 0", kills: ["backfill_chain_burst_B1"] },
    { name: "backfill_B2_off", from: "if (items.length >= 2) {", to: "if (items.length >= 99) {", kills: ["backfill_batch_burst_B2"] },
    { name: "backfill_window_inclusive", from: "s.t - group[group.length - 1].t >= burstMs", to: "s.t - group[group.length - 1].t > burstMs", kills: ["backfill_window_edge_1000ms_not_flagged"] },
    { name: "hook_fails_open_without_checker", from: "\"  exit 1\",", to: "\"  exit 0\",", kills: ["hook"] }
];

// ---------------------------------------------------------------- main

function main() {
    console.log("=== check_claims.js tests (WG.00.12 Lane C2) ===");
    console.log(`temp repository: ${TMP}`);
    const cm = require(CHECKER);

    // parsers
    check("unit_status_word", cm.statusWord("`DONE` (DW.01.01)") === "DONE" && cm.statusWord("**COMPLETED / FROZEN**") === "COMPLETED" &&
        cm.statusWord("open: fixed tools pending") === "OPEN" && cm.statusWord("~~OPEN~~ CLOSED") === "CLOSED" && cm.statusWord("`FIX_READY`") === "FIX_READY",
        "statusWord misreads a status cell");
    const g = cm.globToRe("tasks/WG.00.12/*", "");
    check("unit_glob", g.test("tasks/WG.00.12/state.md") && !g.test("tasks/WG.00.12/sub/x.md") && !g.test("tasks/WG.00.121/x") &&
        cm.globToRe("docs/**/x.md", "").test("docs/x.md") && cm.globToRe("docs/**/x.md", "").test("docs/a/b/x.md") && cm.globToRe("C:\\Dev\\DEUS", "") === null,
        "globToRe matched wrongly");
    const P = cm.PASS_OUTCOME_RE;
    check("unit_pass_outcome", P.test("36/36 passed") && P.test("26 passed, 0 failed") && P.test("exit 0") && P.test("RESULT: PASS") && P.test("ALL 7 CHECKS PASSED") &&
        !P.test("2/3 passed") && !P.test("13/3 passed") && !P.test("NOT ALL CHECKS PASSED") && !P.test("5 passed, 1 failed") && !P.test("exit 1"),
        "PASS_OUTCOME_RE accepts a failing outcome or rejects a passing one");
    check("unit_agent_aliases", cm.normAgent("Fable") === "claude" && cm.normAgent("Claude Subagent") === "claude" && cm.normAgent("owner_review") === "owner" &&
        cm.normAgent("Antigravity") === "gemini", "normAgent alias table");
    const m = cm.parseLaneMatrix(STATUS_DOC);
    check("unit_lane_matrix", m && m.lanes.length === 5 && m.frozen.length === 1 && m.lanes.find(l => l.key === "c2").agents.has("claude") &&
        m.lanes.find(l => l.key === "coordinator").agents.has("gemini"), `parsed ${JSON.stringify(m && m.lanes.map(l => [l.key, [...l.agents]]))}`);

    let repo;
    try {
        repo = buildFixture();
    } catch (e) {
        check("fixture_setup", false, e.message);
        return finish();
    }

    const caseByName = new Map();
    for (const c of CASES) {
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
    check("hook_install_reject_accept_failclosed_uninstall", hook.ok, hook.detail);

    // text output keeps the ENGINE_RULES §6 shape
    repo.reset();
    repo.append("docs/STATUS.md", "TEST_ edit by lane C2");
    repo.stage("docs/STATUS.md");
    const txt = spawnSync(process.execPath, [CHECKER, "--lane", "c2"], { cwd: repo.dir, encoding: "utf8", env: cleanEnv() });
    check("text_output_pass_fail_result_lines", txt.status === 1 && /^FAIL 4\.4 /m.test(txt.stdout) && /^PASS 4\.1 /m.test(txt.stdout) &&
        /^RESULT: 3 passed, 1 failed - commit rejected$/m.test(txt.stdout), `exit ${txt.status}: ${txt.stdout.slice(-300)}`);

    // real history, read-only
    const realHas = sha => spawnSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: REAL_ROOT, env: cleanEnv() }).status === 0;
    if (realHas("31676cf")) {
        const r = spawnSync(process.execPath, [CHECKER, "--commit", "31676cf", "--json"], { cwd: REAL_ROOT, encoding: "utf8", env: cleanEnv() });
        let j = null;
        try { j = JSON.parse(r.stdout); } catch (e) { /* judged below */ }
        const v42 = j ? j.results[0].rules["4.2"].violations : [];
        check("real_31676cf_WG.00.08_DONE_without_reviewer_fails_4.2", r.status === 1 && v42.some(v => v.includes("WG.00.08") && v.includes("no independent reviewer")),
            `exit ${r.status}; 4.2: ${JSON.stringify(v42)}`);
    } else console.log("SKIP real_31676cf: commit not in this repository");
    if (realHas("d1fbeab")) {
        const dir = path.join(TMP, "real");
        fs.mkdirSync(dir, { recursive: true });
        const files = [["tasks/WG.00.08/defects.jsonl", "defects.jsonl"], ["tasks/messages.jsonl", "messages.jsonl"]].map(([src, dst]) => {
            const out = spawnSync("git", ["cat-file", "blob", `d1fbeab:${src}`], { cwd: REAL_ROOT, encoding: "utf8", env: cleanEnv() }).stdout;
            fs.writeFileSync(path.join(dir, dst), out);
            return path.join(dir, dst);
        });
        const r = spawnSync(process.execPath, [CHECKER, "--check-backfill", "--json", ...files], { cwd: REAL_ROOT, encoding: "utf8", env: cleanEnv() });
        let j = null;
        try { j = JSON.parse(r.stdout); } catch (e) { /* judged below */ }
        const b1 = j ? new Set(j.flags.filter(f => f.code === "B1").map(f => f.item)) : new Set();
        const b2 = j ? j.flags.filter(f => f.code === "B2").map(f => f.msg) : [];
        check("real_d1fbeab_ledger_chain_bursts_flagged", r.status === 1 && b1.has("ATK-19B-001") && b1.has("ATK-19B-002") && b2.some(x => x.includes("20:55:37")),
            `exit ${r.status}; B1 items ${[...b1].join(", ")}; B2 ${b2.length}`);
    } else console.log("SKIP real_d1fbeab: commit not in this repository");

    // mutants: every one must make at least one case fail
    const src = fs.readFileSync(CHECKER, "utf8");
    const mdir = path.join(TMP, "mutants");
    fs.mkdirSync(mdir, { recursive: true });
    for (const mu of MUTANTS) {
        const count = src.split(mu.from).length - 1;
        if (count !== 1) { check(`mutant_${mu.name}_killed`, false, `mutation target found ${count} times, expected once`); continue; }
        const file = path.join(mdir, `check_claims.${mu.name}.js`);
        fs.writeFileSync(file, src.replace(mu.from, mu.to));
        const outcomes = mu.kills.map(k => {
            if (k === "hook") return runHookCase(repo, file);
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
