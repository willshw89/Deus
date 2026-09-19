#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_MANIFEST = path.join(PROJECT_ROOT, "docs", "design", "RESOURCE_MANIFEST.json");

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function listFiles(root, filePattern) {
    if (!fs.existsSync(root)) return [];
    const matcher = new RegExp(filePattern);
    const result = [];
    const pending = [root];
    while (pending.length) {
        const current = pending.pop();
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) pending.push(full);
            else if (matcher.test(entry.name)) result.push(full);
        }
    }
    return result.sort();
}

function parseBracketRecords(file, token) {
    const text = fs.readFileSync(file, "utf8");
    const start = new RegExp("^\\s*\\[" + token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":([^\\]]+)\\]", "gm");
    const found = [];
    let match;
    while ((match = start.exec(text))) {
        found.push({ id: match[1].trim(), start: match.index });
    }
    return found.map((record, index) => {
        const end = index + 1 < found.length ? found[index + 1].start : text.length;
        return {
            id: record.id,
            file: path.basename(file),
            sourcePath: path.relative(PROJECT_ROOT, file).replace(/\\/g, "/"),
            text: text.slice(record.start, end)
        };
    });
}

function resolveCopiedRecords(records) {
    const byId = new Map();
    const problems = [];
    for (const record of records) {
        if (byId.has(record.id)) problems.push(`duplicate record ${record.id}`);
        else byId.set(record.id, record);
    }
    const memo = new Map();
    function resolve(record, stack) {
        if (memo.has(record.id)) return memo.get(record.id);
        if (stack.has(record.id)) {
            problems.push(`copy cycle ${[...stack, record.id].join("->")}`);
            return record.text;
        }
        const next = new Set(stack);
        next.add(record.id);
        const inherited = [];
        const copies = record.text.matchAll(/\[COPY_TAGS_FROM:([^\]]+)\]/g);
        for (const copy of copies) {
            const parentId = copy[1].trim();
            const parent = byId.get(parentId);
            if (!parent) problems.push(`${record.id}: missing copied record ${parentId}`);
            else inherited.push(resolve(parent, next));
        }
        const text = inherited.length ? `${inherited.join("\n")}\n${record.text}` : record.text;
        memo.set(record.id, text);
        return text;
    }
    return {
        records: records.map(record => ({ ...record, text: resolve(record, new Set()) })),
        problems
    };
}

function conditionMatches(condition, record) {
    const c = condition || {};
    if (c.file && record.file !== c.file) return false;
    if (c.filePattern && !(new RegExp(c.filePattern).test(record.file))) return false;
    if (c.idPattern && !(new RegExp(c.idPattern).test(record.id))) return false;
    if (Array.isArray(c.containsAll) && !c.containsAll.every(value => record.text.includes(value))) return false;
    if (Array.isArray(c.containsAny) && !c.containsAny.some(value => record.text.includes(value))) return false;
    if (Array.isArray(c.notContainsAny) && c.notContainsAny.some(value => record.text.includes(value))) return false;
    return true;
}

function applyRule(source, record) {
    for (const rule of source.rules || []) {
        if (conditionMatches(rule.when, record)) return rule;
    }
    return null;
}

function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function makeReporter() {
    const checks = [];
    return {
        check(name, condition, detail) {
            checks.push({ name, condition: !!condition, detail: String(detail || "") });
        },
        finish() {
            let passed = 0;
            let failed = 0;
            for (const result of checks) {
                if (result.condition) {
                    passed++;
                    console.log(`PASS ${result.name}: ${result.detail}`);
                } else {
                    failed++;
                    console.log(`FAIL ${result.name}: ${result.detail}`);
                }
            }
            console.log(`RESULT: ${passed} passed, ${failed} failed`);
            return { passed, failed };
        }
    };
}

function validate(manifest) {
    const report = makeReporter();
    const levels = manifest.levels || [];
    const expectedLevels = [-2, -1, 0, 1, 2];
    report.check("schema_version", manifest.schemaVersion === 1,
        `schemaVersion ${manifest.schemaVersion}`);
    report.check("phase_status", manifest.status === "design-input-not-live",
        `status ${manifest.status || "<missing>"}`);
    report.check("five_levels", JSON.stringify(levels) === JSON.stringify(expectedLevels),
        `levels ${JSON.stringify(levels)}`);

    const biomeSets = manifest.biomeSets || {};
    const requiredBiomeSets = ["surface", "earth", "deep", "upper"];
    const biomeSetPresent = requiredBiomeSets.every(key => Array.isArray(biomeSets[key]) && biomeSets[key].length > 0);
    const physicalBiomes = ["surface", "earth", "deep"].flatMap(key => biomeSets[key] || []);
    const distinctPhysical = new Set(physicalBiomes).size === physicalBiomes.length;
    report.check("biome_sets", biomeSetPresent && distinctPhysical,
        `${requiredBiomeSets.map(key => `${key}=${(biomeSets[key] || []).length}`).join(", ")}; physical distinct ${distinctPhysical}`);

    const biomeIds = new Set(Object.values(biomeSets).flat());
    const resources = Array.isArray(manifest.resources) ? manifest.resources : [];
    const resourceIds = new Set();
    const duplicateResources = [];
    for (const resource of resources) {
        if (resourceIds.has(resource.id)) duplicateResources.push(resource.id);
        resourceIds.add(resource.id);
    }
    report.check("resource_ids", resources.length > 0 && duplicateResources.length === 0,
        `${resources.length} resources; duplicates ${duplicateResources.join(", ") || "none"}`);

    const profileIds = new Set((manifest.populationProfiles || []).map(profile => profile.id));
    const resourceProblems = [];
    const finiteFamilies = new Set(manifest.finiteFamilies || []);
    for (const resource of resources) {
        if (!resource.id || !resource.family || !["natural", "processed"].includes(resource.kind)) {
            resourceProblems.push(`${resource.id || "<missing>"}: base fields`);
            continue;
        }
        if (resource.kind === "natural") {
            if (!Array.isArray(resource.allowedZ) || !resource.allowedZ.length || resource.allowedZ.some(z => !levels.includes(z))) {
                resourceProblems.push(`${resource.id}: allowedZ`);
            }
            if (!Array.isArray(resource.biomeTags) || !resource.biomeTags.length || resource.biomeTags.some(tag => !biomeIds.has(tag))) {
                resourceProblems.push(`${resource.id}: biomeTags`);
            }
            if (resource.worldRequired === true && !(Number.isInteger(resource.minWorldCount) && resource.minWorldCount > 0)) {
                resourceProblems.push(`${resource.id}: required minimum`);
            }
            if (finiteFamilies.has(resource.family) && resource.renewable !== false) {
                resourceProblems.push(`${resource.id}: finite family marked renewable`);
            }
            if (resource.renewable === true && (!resource.spawnProfile || !profileIds.has(resource.spawnProfile))) {
                resourceProblems.push(`${resource.id}: renewable profile`);
            }
        } else {
            if (!Array.isArray(resource.inputs) || !resource.inputs.length) resourceProblems.push(`${resource.id}: inputs`);
            if (!resource.skill) resourceProblems.push(`${resource.id}: skill`);
        }
    }
    report.check("resource_contracts", resourceProblems.length === 0,
        resourceProblems.length ? resourceProblems.slice(0, 12).join("; ") : "natural placement, renewal and processing fields valid");

    const missingInputs = [];
    for (const resource of resources.filter(row => row.kind === "processed")) {
        for (const input of resource.inputs || []) {
            if (!resourceIds.has(input)) missingInputs.push(`${resource.id}->${input}`);
        }
    }
    report.check("production_inputs", missingInputs.length === 0,
        missingInputs.length ? missingInputs.join(", ") : "all processed inputs resolve");

    const byId = new Map(resources.map(resource => [resource.id, resource]));
    const resolutionProblems = [];
    function resolvesToNature(id, stack) {
        if (stack.has(id)) return false;
        const resource = byId.get(id);
        if (!resource) return false;
        if (resource.kind === "natural") return true;
        const next = new Set(stack);
        next.add(id);
        return (resource.inputs || []).every(input => resolvesToNature(input, next));
    }
    for (const resource of resources.filter(row => row.kind === "processed")) {
        if (!resolvesToNature(resource.id, new Set())) resolutionProblems.push(resource.id);
    }
    report.check("production_reachability", resolutionProblems.length === 0,
        resolutionProblems.length ? `unresolved/cyclic ${resolutionProblems.join(", ")}` : "every processed resource reaches natural inputs");

    const sourceSets = Array.isArray(manifest.sourceSets) ? manifest.sourceSets : [];
    const sourceSetIds = new Set();
    const sourceSetProblems = [];
    for (const source of sourceSets) {
        if (!source.id || !["explicitLedger", "bracketImport", "multiRoleImport"].includes(source.mode) || !Number.isInteger(source.expectedRows) || source.expectedRows < 1) {
            sourceSetProblems.push(`${source.id || "<missing>"}: base fields`);
        }
        if (source.mode === "multiRoleImport" && (!Number.isInteger(source.expectedRecords) || source.expectedRecords < 1)) {
            sourceSetProblems.push(`${source.id}: expectedRecords`);
        }
        if (source.mode === "multiRoleImport" && (!Number.isInteger(source.expectedExclusions) || source.expectedExclusions < 0)) {
            sourceSetProblems.push(`${source.id}: expectedExclusions`);
        }
        if (sourceSetIds.has(source.id)) sourceSetProblems.push(`${source.id}: duplicate`);
        sourceSetIds.add(source.id);
    }
    report.check("source_sets", sourceSets.length > 0 && sourceSetProblems.length === 0,
        sourceSetProblems.length ? sourceSetProblems.join("; ") : `${sourceSetIds.size} declared source sets`);

    const ledger = Array.isArray(manifest.sourceLedger) ? manifest.sourceLedger : [];
    const ledgerKeys = new Set();
    const ledgerProblems = [];
    const validOutcomes = new Set(["canonical", "variantOf", "aliasOf", "producedBy", "excluded"]);
    for (const row of ledger) {
        const key = `${row.source}:${row.key}`;
        if (ledgerKeys.has(key)) ledgerProblems.push(`${key}: duplicate`);
        ledgerKeys.add(key);
        if (!sourceSetIds.has(row.source)) ledgerProblems.push(`${key}: undeclared source`);
        if (!validOutcomes.has(row.outcome)) ledgerProblems.push(`${key}: outcome`);
        if (row.outcome === "excluded") {
            if (!row.reason) ledgerProblems.push(`${key}: exclusion reason`);
        } else if (!resourceIds.has(row.target)) {
            ledgerProblems.push(`${key}: missing target ${row.target}`);
        }
    }
    report.check("source_ledger", ledger.length > 0 && ledgerProblems.length === 0,
        ledgerProblems.length ? ledgerProblems.slice(0, 12).join("; ") : `${ledger.length} explicit source rows mapped exactly once`);

    const manualCountProblems = [];
    for (const source of sourceSets.filter(row => row.mode === "explicitLedger")) {
        const count = ledger.filter(row => row.source === source.id).length;
        if (count !== source.expectedRows) manualCountProblems.push(`${source.id} ${count}/${source.expectedRows}`);
    }
    report.check("explicit_source_counts", manualCountProblems.length === 0,
        manualCountProblems.length ? manualCountProblems.join(", ") : sourceSets.filter(row => row.mode === "explicitLedger").map(row => `${row.id}=${row.expectedRows}`).join(", "));

    const importProblems = [];
    const importDetails = [];
    const generatedVariantIds = new Set();
    for (const source of sourceSets.filter(row => row.mode === "bracketImport")) {
        const root = path.resolve(PROJECT_ROOT, source.root);
        const files = listFiles(root, source.filePattern);
        const records = files.flatMap(file => parseBracketRecords(file, source.recordToken));
        let mapped = 0;
        const targetCounts = new Map();
        for (const record of records) {
            const rule = applyRule(source, record);
            if (!rule) {
                importProblems.push(`${source.id}:${record.id}: unmapped`);
                continue;
            }
            if (!validOutcomes.has(rule.outcome) || rule.outcome === "excluded" || !resourceIds.has(rule.target)) {
                importProblems.push(`${source.id}:${record.id}: invalid rule ${rule.id}`);
                continue;
            }
            const variantId = `${source.id}.${slug(record.id)}`;
            if (generatedVariantIds.has(variantId)) importProblems.push(`${variantId}: duplicate generated id`);
            generatedVariantIds.add(variantId);
            targetCounts.set(rule.target, (targetCounts.get(rule.target) || 0) + 1);
            mapped++;
        }
        if (records.length !== source.expectedRows) importProblems.push(`${source.id}: source count ${records.length}/${source.expectedRows}`);
        if (mapped !== records.length) importProblems.push(`${source.id}: mapped ${mapped}/${records.length}`);
        importDetails.push(`${source.id} ${mapped}/${records.length} -> ${[...targetCounts.entries()].map(([id, count]) => `${id}:${count}`).join(",")}`);
    }
    for (const source of sourceSets.filter(row => row.mode === "multiRoleImport")) {
        const root = path.resolve(PROJECT_ROOT, source.root);
        const files = listFiles(root, source.filePattern);
        const parsed = files.flatMap(file => parseBracketRecords(file, source.recordToken));
        const resolved = resolveCopiedRecords(parsed);
        importProblems.push(...resolved.problems.map(problem => `${source.id}: ${problem}`));
        const exclusions = new Map();
        for (const exclusion of source.exclusions || []) {
            if (exclusions.has(exclusion.id)) importProblems.push(`${source.id}:${exclusion.id}: duplicate exclusion`);
            exclusions.set(exclusion.id, exclusion);
        }
        const seenExclusions = new Set();
        const targetCounts = new Map();
        const roleCounts = new Map();
        const roleIds = new Set();
        for (const rule of source.roleRules || []) {
            if (!rule.id || !rule.when || !rule.outcome || !rule.target) importProblems.push(`${source.id}: malformed role rule`);
            if (roleIds.has(rule.id)) importProblems.push(`${source.id}:${rule.id}: duplicate role rule`);
            roleIds.add(rule.id);
            roleCounts.set(rule.id, 0);
        }
        if (!roleIds.size) importProblems.push(`${source.id}: no role rules`);
        let emitted = 0;
        for (const record of resolved.records) {
            let matched = 0;
            for (const rule of source.roleRules || []) {
                if (!conditionMatches(rule.when, record)) continue;
                matched++;
                roleCounts.set(rule.id, (roleCounts.get(rule.id) || 0) + 1);
                if (!validOutcomes.has(rule.outcome) || rule.outcome === "excluded" || !resourceIds.has(rule.target)) {
                    importProblems.push(`${source.id}:${record.id}: invalid role ${rule.id}`);
                    continue;
                }
                const variantId = `${source.id}.${slug(record.id)}.${slug(rule.id)}`;
                if (generatedVariantIds.has(variantId)) importProblems.push(`${variantId}: duplicate generated id`);
                generatedVariantIds.add(variantId);
                targetCounts.set(rule.target, (targetCounts.get(rule.target) || 0) + 1);
                emitted++;
            }
            const exclusion = exclusions.get(record.id);
            if (exclusion) {
                seenExclusions.add(record.id);
                if (!exclusion.reason) importProblems.push(`${source.id}:${record.id}: exclusion without reason`);
                if (!conditionMatches(exclusion.when, record)) importProblems.push(`${source.id}:${record.id}: exclusion condition`);
                if (matched) importProblems.push(`${source.id}:${record.id}: both mapped and excluded`);
            } else if (!matched) {
                importProblems.push(`${source.id}:${record.id}: no resource role`);
            }
        }
        for (const id of exclusions.keys()) {
            if (!seenExclusions.has(id)) importProblems.push(`${source.id}:${id}: exclusion does not match a record`);
        }
        for (const [id, count] of roleCounts) {
            if (!count) importProblems.push(`${source.id}:${id}: role rule matched no records`);
        }
        if (parsed.length !== source.expectedRecords) importProblems.push(`${source.id}: source records ${parsed.length}/${source.expectedRecords}`);
        if (seenExclusions.size !== source.expectedExclusions) importProblems.push(`${source.id}: exclusions ${seenExclusions.size}/${source.expectedExclusions}`);
        if (emitted !== source.expectedRows) importProblems.push(`${source.id}: emitted roles ${emitted}/${source.expectedRows}`);
        importDetails.push(`${source.id} ${emitted} roles from ${parsed.length} records; ${seenExclusions.size} reasoned exclusions -> ${[...targetCounts.entries()].map(([id, count]) => `${id}:${count}`).join(",")}`);
    }
    report.check("dynamic_source_imports", importProblems.length === 0,
        importProblems.length ? importProblems.slice(0, 12).join("; ") : `${generatedVariantIds.size} variants; ${importDetails.join(" | ")}`);

    const profileProblems = [];
    for (const profile of manifest.populationProfiles || []) {
        const min = profile.minimumPer4096;
        const target = profile.targetPer4096;
        const cap = profile.hardCapPer4096;
        const initial = profile.initialPer4096;
        if (!profile.id || !["resource", "prey", "enemy"].includes(profile.kind)) profileProblems.push(`${profile.id}: base`);
        if (!Array.isArray(profile.allowedZ) || !profile.allowedZ.length || profile.allowedZ.some(z => !levels.includes(z))) profileProblems.push(`${profile.id}: z`);
        if (!Array.isArray(profile.biomeTags) || !profile.biomeTags.length || profile.biomeTags.some(tag => !biomeIds.has(tag))) profileProblems.push(`${profile.id}: biome`);
        if (!(Number.isFinite(min) && Number.isFinite(target) && Number.isFinite(cap) && min <= target && target <= cap)) profileProblems.push(`${profile.id}: min/target/cap`);
        if (!Array.isArray(initial) || initial.length !== 2 || initial[0] < 0 || initial[0] > initial[1] || initial[1] > cap) profileProblems.push(`${profile.id}: initial`);
        if (!(profile.evaluationIntervalHours > 0)) profileProblems.push(`${profile.id}: interval`);
        if (!Array.isArray(profile.spawnBatch) || profile.spawnBatch.length !== 2 || profile.spawnBatch[0] < 1 || profile.spawnBatch[0] > profile.spawnBatch[1]) profileProblems.push(`${profile.id}: batch`);
        if (!profile.protection || profile.protection.rejectOccupied !== true || profile.protection.rejectVisiblePopIn !== true) profileProblems.push(`${profile.id}: protection`);
    }
    report.check("population_profiles", profileIds.size === (manifest.populationProfiles || []).length && profileProblems.length === 0,
        profileProblems.length ? profileProblems.join("; ") : `${profileIds.size} capped mapwide profiles with six-hour evaluation and spawn protection`);

    const requiredFamilies = new Set(manifest.requiredFamilies || []);
    const presentFamilies = new Set(resources.map(resource => resource.family));
    const missingFamilies = [...requiredFamilies].filter(family => !presentFamilies.has(family));
    report.check("required_families", requiredFamilies.size > 0 && missingFamilies.length === 0,
        missingFamilies.length ? `missing ${missingFamilies.join(", ")}` : `${requiredFamilies.size} mandatory families represented`);

    return report.finish();
}

function parseArgs(argv) {
    const result = { manifestPath: DEFAULT_MANIFEST, mutation: null };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === "--mutation") result.mutation = argv[++i];
        else if (!argv[i].startsWith("--")) result.manifestPath = path.resolve(PROJECT_ROOT, argv[i]);
    }
    return result;
}

function mutate(manifest, name) {
    const changed = clone(manifest);
    if (name === "missing-target") {
        changed.sourceLedger[0].target = "TEST_missing_resource";
    } else if (name === "renewable-ore") {
        const target = changed.resources.find(resource => resource.family === "ore");
        if (target) target.renewable = true;
    } else if (name === "deferred-level") {
        changed.levels = [-2, -1, 0, 1];
    } else if (name === "missing-creature-role") {
        const source = changed.sourceSets.find(row => row.mode === "multiRoleImport");
        if (source && source.roleRules && source.roleRules[0]) source.roleRules[0].target = "TEST_missing_resource";
    } else if (name) {
        throw new Error(`Unknown mutation ${name}`);
    }
    return changed;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const manifest = readJson(args.manifestPath);
    const result = validate(mutate(manifest, args.mutation));
    process.exitCode = result.failed ? 1 : 0;
}

try {
    main();
} catch (error) {
    console.error(`FAIL manifest_load: ${error && error.stack ? error.stack : error}`);
    console.log("RESULT: 0 passed, 1 failed");
    process.exitCode = 1;
}
