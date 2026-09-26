"use strict";
// SIM.60.02 tests for tools/spells/validate_spell_effects.js. Node only, no npm dependencies.
//
//   node tools/spells/test_spell_effects.js
//
// Prints one "PASS <name>" or "FAIL <name>" line per check and "RESULT: <n> passed, <m> failed"; exits 0 only when
// every check passes. The checks:
//   - the committed data validates with no error;
//   - every negative fixture in tools/spells/fixtures/ raises the codes it expects and no code it does not allow;
//   - the validator's command line exits 1 on a fixture and names the error;
//   - --check rebuilds srd_baseline.json byte for byte, twice, with equal sha256;
//   - mutation checks: each mutant below is applied to an in-memory copy of the validator source (the file on disk is
//     never edited; its sha256 is compared before and after) and the fixture suite must then fail ("killed").
const fs = require("fs");
const path = require("path");
const Module = require("module");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const HERE = __dirname;
const VALIDATOR = path.join(HERE, "validate_spell_effects.js");
const FIXTURES = path.join(HERE, "fixtures");
const V = require(VALIDATOR);

let passed = 0, failed = 0;
function report(ok, name, detail, note) {
    if (ok) passed++; else failed++;
    console.log((ok ? "PASS " : "FAIL ") + name + (!ok && detail ? " - " + detail : "") + (ok && note ? " - " + note : ""));
}
const sha = t => crypto.createHash("sha256").update(t, "utf8").digest("hex");

function loadFixtures() {
    return fs.readdirSync(FIXTURES).filter(f => f.endsWith(".json")).sort()
        .map(f => JSON.parse(fs.readFileSync(path.join(FIXTURES, f), "utf8")));
}

// One run of the suite against a validator module (the real one or a mutant). Returns [{name, ok, detail}].
function runSuite(mod, data, fixtures, stopOnFail) {
    const out = [];
    const push = (name, ok, detail) => { out.push({ name, ok, detail }); return ok || !stopOnFail; };
    let errs;
    try { errs = mod.validateAll(data); } catch (e) { errs = [{ code: "THROWN", message: String(e) }]; }
    const cleanOk = errs.length === 0;
    if (!push("clean_data_passes", cleanOk, cleanOk ? "" : errs.length + " errors, first " + errs[0].code + " " + (errs[0].who || "") + " " + (errs[0].path || "") + " " + errs[0].message)) return out;
    for (const fx of fixtures) {
        let codes;
        try { codes = new Set(mod.validateAll(mod.applyFixture(data, fx)).map(e => e.code)); } catch (e) { codes = new Set(["THROWN:" + e.message]); }
        const missing = fx.expect.filter(c => !codes.has(c));
        const allowed = new Set(fx.expect.concat(fx.alsoAllowed || []));
        const extra = [...codes].filter(c => !allowed.has(c));
        const ok = missing.length === 0 && extra.length === 0;
        if (!push("fixture_" + fx.name, ok, (missing.length ? "missing " + missing.join(",") : "") + (extra.length ? " unexpected " + extra.join(",") : ""))) return out;
    }
    return out;
}

// In-memory module from source text; the real path is used only so that __dirname and require() resolve.
function compile(src) {
    const m = new Module(VALIDATOR, module);
    m.filename = VALIDATOR;
    m.paths = Module._nodeModulePaths(HERE);
    m._compile(src, VALIDATOR);
    return m.exports;
}

// Mutants: [name, find, replace]. Each find string must occur exactly once in the validator source.
const ruleOff = fn => ["rule_" + fn.replace(/^rule/, "").replace(/^./, c => c.toLowerCase()) + "_off", "function " + fn + "(data, add) {", "function " + fn + "(data, add) { return;"];
const MUTANTS = [
    ...V.RULES.map(r => ruleOff(r.name)),
    ["schema_ignores_additionalProperties", "if (schema.additionalProperties === false) out.push(", "if (false) out.push("],
    ["schema_ignores_required", "if (!Object.prototype.hasOwnProperty.call(inst, k)) out.push({ code: \"SCHEMA_REQUIRED\"", "if (false) out.push({ code: \"SCHEMA_REQUIRED\""],
    ["schema_ignores_const", "if (schema.const !== undefined && !deepEqual(schema.const, inst))", "if (false)"],
    ["schema_ignores_unknown_keywords", "if (!SCHEMA_KEYWORDS.has(k)) out.push(", "if (false) out.push("],
    ["srd_numbers_skip_text", "            if (typeof v === \"string\") {\n                const s = stripIds(v)", "            if (false) {\n                const s = stripIds(v)"],
    ["srd_numbers_skip_literals", "if (typeof v === \"number\" && nums.has(v)) add(\"SRD_NUMBER_COPIED\"", "if (false) add(\"SRD_NUMBER_COPIED\""],
    ["srdref_allows_other_spell", "if (!r.key.includes(\":\") && r.key !== slug)", "if (false)"],
    ["srdref_ignores_unit", "if (v.unit !== undefined && (!node || node.unit !== v.unit))", "if (false)"],
    ["cause_allows_other_spell", "if (!m || m[1] !== rec.spellId)", "if (!m)"],
    ["ore_check_transforms_only", "if ((Lg.mode === \"source\" || Lg.mode === \"policy\") && isOre(Lg.class))", "if (false)"],
    ["seconds_per_tick_accepts_value", "if (p.value !== null || p.status !== \"OWNER_OPEN\" || p.question !== \"Q2\")", "if (p.status !== \"OWNER_OPEN\" && p.value === null)"],
    ["tick_text_patterns_off", "for (const re of TIME_SCALE_TEXT) if (re.test(v)) { add(\"Q2_TICK_LITERAL\", FILES[name]", "for (const re of []) if (re.test(v)) { add(\"Q2_TICK_LITERAL\", FILES[name]"],
    ["baseline_minute_seconds_changed", "const UNIT_SECONDS = { second: 1, minute: 60,", "const UNIT_SECONDS = { second: 1, minute: 61,"],
    ["baseline_drops_dice_measures", "Object.assign(rec, { unit: \"dice\", dice: m[1], count: Number(parts[0]), sides: Number(parts[1]) });", "Object.assign(rec, { unit: \"dice\", dice: m[1] });"]
];

function main() {
    const realSrc = fs.readFileSync(VALIDATOR, "utf8");
    const realSha = sha(realSrc);
    const data = V.loadData();
    const fixtures = loadFixtures();

    // 1. The real validator: clean data and every fixture.
    for (const r of runSuite(V, data, fixtures, false)) report(r.ok, r.name, r.detail);
    report(fixtures.length >= 30, "fixture_count_at_least_30", "found " + fixtures.length);
    const rulesWithFixture = new Set(fixtures.map(f => f.rule));
    const uncovered = V.RULES.map(r => r.name).filter(n => !rulesWithFixture.has(n));
    report(uncovered.length === 0, "every_rule_has_a_negative_fixture", uncovered.join(","));

    // 2. The command line exits 1 on a fixture and prints the named error.
    const cli = spawnSync(process.execPath, [VALIDATOR, "--fixture", path.join(FIXTURES, "ore_output_source.json")], { encoding: "utf8" });
    report(cli.status === 1 && /ERROR ORE_OUTPUT srd:spell:wall-of-stone \/effects\/0\/ledger\/class/.test(cli.stdout), "cli_fixture_exits_1_with_named_error", "status " + cli.status);
    const clean = spawnSync(process.execPath, [VALIDATOR], { encoding: "utf8" });
    report(clean.status === 0 && /errors 0/.test(clean.stdout), "cli_clean_exits_0", "status " + clean.status);

    // 3. --check twice: byte-identical rebuild, equal sha256, equal to the committed file.
    const committed = fs.readFileSync(path.join(V.ROOT, V.FILES.baseline), "utf8").replace(/\r\n/g, "\n");
    const shas = [];
    for (const run of [1, 2]) {
        const r = spawnSync(process.execPath, [VALIDATOR, "--check"], { encoding: "utf8" });
        const m = /rebuilt sha256 ([0-9a-f]{64})/.exec(r.stdout);
        shas.push(m ? m[1] : null);
        report(r.status === 0 && !!m, "check_rebuild_run" + run + "_exit0", "status " + r.status);
    }
    report(shas[0] !== null && shas[0] === shas[1], "check_rebuild_sha256_equal_twice", shas.join(" vs "));
    report(shas[0] === sha(committed), "check_rebuild_equals_committed_file", shas[0] + " vs " + sha(committed));
    report(V.baselineText(data) === committed, "in_memory_rebuild_equals_committed_file");

    // 4. Mutation checks against the fixture suite.
    const src = realSrc.replace(/\r\n/g, "\n");
    for (const [name, find, repl] of MUTANTS) {
        const count = src.split(find).length - 1;
        if (count !== 1) { report(false, "mutant_" + name + "_killed", "find string occurs " + count + " times"); continue; }
        let killed, why = "";
        try {
            const mod = compile(src.replace(find, repl));
            const res = runSuite(mod, data, fixtures, true);
            const bad = res.find(r => !r.ok);
            killed = !!bad;
            why = bad ? bad.name : "every check still passes";
        } catch (e) { killed = true; why = "mutant does not load: " + e.message; }
        report(killed, "mutant_" + name + "_killed", why, "by " + why);
    }
    report(sha(fs.readFileSync(VALIDATOR, "utf8")) === realSha, "validator_file_unchanged_by_mutation_run");

    console.log("RESULT: " + passed + " passed, " + failed + " failed");
    return failed === 0 ? 0 : 1;
}

process.exit(main());
