"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const VALIDATOR = path.join(__dirname, "validate_audio_standard.js");
const SCHEMA = path.join(ROOT, "game", "data", "UF_AudioStandard.schema.json");
const STANDARD = path.join(ROOT, "game", "data", "UF_AudioStandard.json");
const MD_PATH = path.join(ROOT, "docs", "audio", "DEUS_AUDIO_STANDARD.md");
const AUDIO = path.join(ROOT, "game", "audio");
const FIX = path.join(__dirname, "fixtures", "audio_standard");
const real = require(VALIDATOR);

let passed = 0;
let failed = 0;
const tempFiles = [];

function check(name, ok, detail) {
    if (ok) {
        passed += 1;
        console.log("PASS " + name);
    } else {
        failed += 1;
        console.log("FAIL " + name + (detail ? ": " + detail : ""));
    }
}

function mutateSource(name, from, to) {
    const src = fs.readFileSync(VALIDATOR, "utf8");
    const parts = src.split(from);
    if (parts.length !== 2) throw new Error(name + " anchor count " + (parts.length - 1));
    return parts.join(to);
}

function loadCopy(name, from, to) {
    const next = mutateSource(name, from, to);
    const file = path.join(os.tmpdir(), "deus-au-" + process.pid + "-" + name + "-" + tempFiles.length + ".js");
    fs.writeFileSync(file, next);
    tempFiles.push(file);
    return { mod: require(file), file: file, src: next };
}

function unload(loaded) {
    const resolved = require.resolve(loaded.file);
    delete require.cache[resolved];
}

function runFix(mod, name, extra) {
    const args = [
        "--standard", path.join(FIX, name, "standard.json"),
        "--schema", SCHEMA,
        "--audio", path.join(FIX, name, "audio")
    ].concat(extra || []);
    return mod.run(args);
}

function hasCode(report, code) {
    return report.documentErrors.some(err => err.code === code);
}

function hasKeyword(report, keyword, missing) {
    return report.documentErrors.some(err => err.keyword === keyword && (missing == null || err.missing === missing));
}

function countsOf(mod) {
    const C = mod.CANONICAL;
    const events = mod.expandEvents(mod.buildPublishedData());
    const expect = {
        foot: C.surfaces.length * C.gaits.length,
        hit: C.damageTypes.length * C.hitMaterials.length + C.damageTypes.length + C.hitOutcomes.length,
        spell: C.spellSchools.length * C.deliveryShapes.length * C.spellPhases.length + C.spellSchools.length * 3,
        wpn: Object.keys(C.weaponPhases).reduce((sum, key) => sum + C.weaponPhases[key].length, 0),
        work: C.workActions.length * C.workPhases.length,
        vocal: (C.creatureTypes.length + C.races.length) * (C.vocalCalls.length + C.emotes.length),
        amb: C.biomes.length * C.depthBands.length + (C.weathers.length - 1) + C.seasons.length + C.biomes.length + 5,
        ui: C.uiEvents.length,
        bgm: C.biomes.length * C.musicStates.length * C.stemRoles.length,
        me: C.stingers.length
    };
    const got = {};
    for (const key of Object.keys(expect)) got[key] = events.filter(event => event.category === key).length;
    return { expect: expect, got: got, events: events };
}

function repoGaps(mod) {
    const gaps = [];
    const published = mod.buildPublishedData();
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "DEUS_WorldCatalog.json"), "utf8"));
    const biomeIds = Object.keys(catalog.biomes).filter(key => key !== "about");
    gaps.push.apply(gaps, mod.missingKeys(published.legacyBiomeRouting, biomeIds).map(key => "biome " + key));
    gaps.push.apply(gaps, mod.missingKeys(published.groundKindMap, catalog.groundKinds.map(row => row.id)).map(key => "ground " + key));
    gaps.push.apply(gaps, mod.missingKeys(published.waterKindMap, Object.keys(catalog.water.surface)).map(key => "water " + key));
    const equipment = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "srd51", "equipment.json"), "utf8"));
    const weaponNames = equipment.entries.filter(entry => entry.kind === "weapon").map(entry => entry.name);
    gaps.push.apply(gaps, mod.missingKeys(published.weaponMap, weaponNames).map(key => "weapon " + key));
    for (const name of Object.keys(published.weaponMap)) {
        if (weaponNames.indexOf(name) < 0) gaps.push("extra weapon " + name);
    }
    const system = JSON.parse(fs.readFileSync(path.join(ROOT, "game", "data", "System.json"), "utf8"));
    if (published.systemSounds.length !== system.sounds.length) gaps.push("system sound count");
    for (let i = 0; i < published.systemSounds.length; i++) {
        if (!system.sounds[i] || published.systemSounds[i].name !== system.sounds[i].name) gaps.push("system sound " + i);
    }
    const environment = fs.readFileSync(path.join(ROOT, "game", "js", "plugins", "DEUS_Environment.js"), "utf8");
    const weather = environment.match(/const WEATHER_TYPES = (\[[^\]]+\])/);
    if (!weather) gaps.push("weather list missing");
    else gaps.push.apply(gaps, mod.missingKeys(published.weatherProjection, JSON.parse(weather[1])).map(key => "weather " + key));
    return gaps;
}

function finish() {
    for (const file of tempFiles) {
        try {
            const resolved = require.resolve(file);
            delete require.cache[resolved];
        } catch (e) { /* already unloaded */ }
        try { fs.unlinkSync(file); } catch (e) { /* already removed */ }
    }
    console.log("RESULT: " + passed + " passed, " + failed + " failed");
    process.exit(failed === 0 ? 0 : 1);
}

try {
    const valid = runFix(real, "valid", ["--strict", "--json"]);
    check("valid_set", valid.exitCode === 0 && valid.report.counts.present === 1 && valid.report.counts.missing === 0 && valid.report.counts.unknown === 0 && valid.report.documentErrors.length === 0, "exit " + valid.exitCode);
    const validMutant = loadCopy("valid", '        status = "present";', '        status = "missing";');
    const validBad = runFix(validMutant.mod, "valid", ["--strict"]);
    check("valid_set_mutant_killed", validBad.report.counts.present !== 1, "still present");
    unload(validMutant);

    const missing = runFix(real, "missing", ["--strict"]);
    const missingLoose = runFix(real, "missing", []);
    check("missing_required_event", missing.exitCode === 1 && missingLoose.exitCode === 0 && missing.report.violations.some(item => item.status === "missing" && item.reason === "absent"), "exit " + missing.exitCode + "/" + missingLoose.exitCode);
    const missingMutant = loadCopy("missing", '        status = "missing";', '        status = "present";');
    const missingBad = runFix(missingMutant.mod, "missing", ["--strict"]);
    check("missing_required_event_mutant_killed", !missingBad.report.violations.some(item => item.status === "missing"), "still missing");
    unload(missingMutant);

    const badName = runFix(real, "bad_name", ["--json"]);
    check("bad_name", badName.exitCode === 2 && hasKeyword(badName.report, "pattern"), "exit " + badName.exitCode);
    const nameMutant = loadCopy("pattern", 'if (typeof data === "string" && schema.pattern && !patternTest(schema.pattern, data)) {', 'if (false && typeof data === "string" && schema.pattern && !patternTest(schema.pattern, data)) {');
    const nameBad = runFix(nameMutant.mod, "bad_name", ["--json"]);
    check("bad_name_mutant_killed", !hasKeyword(nameBad.report, "pattern"), "pattern still reported");
    unload(nameMutant);

    const wrong = runFix(real, "wrong_folder", ["--strict"]);
    check("wrong_folder", wrong.exitCode === 1 && wrong.report.violations.some(item => item.status === "misnamed" && item.reason === "wrong-folder") && wrong.report.counts.unknown === 0, "exit " + wrong.exitCode);
    const wrongMutant = loadCopy("wrong", '        status = "misnamed";\n        reason = "wrong-folder";', '        status = "missing";\n        reason = "absent";');
    const wrongBad = runFix(wrongMutant.mod, "wrong_folder", ["--strict"]);
    check("wrong_folder_mutant_killed", !wrongBad.report.violations.some(item => item.reason === "wrong-folder"), "wrong-folder survived");
    unload(wrongMutant);

    const loop = runFix(real, "bad_loop");
    check("bad_loop", loop.exitCode === 2 && hasCode(loop.report, "bad-loop"), "exit " + loop.exitCode);
    const loopMutant = loadCopy("loop", "function loopErrors(event) {\n    const errors = [];", "function loopErrors(event) {\n    return [];\n    const errors = [];");
    const loopBad = runFix(loopMutant.mod, "bad_loop");
    check("bad_loop_mutant_killed", !hasCode(loopBad.report, "bad-loop"), "bad-loop survived");
    unload(loopMutant);

    const damage = runFix(real, "unknown_damage");
    check("unknown_damage_type", damage.exitCode === 2 && hasCode(damage.report, "unknown-damage-type"), "exit " + damage.exitCode);
    const damageMutant = loadCopy("damage", '        errors.push({ code: "unknown-damage-type", eventId: event.eventId, value: event.damageType });', "        void event.damageType;");
    const damageBad = runFix(damageMutant.mod, "unknown_damage");
    check("unknown_damage_type_mutant_killed", !hasCode(damageBad.report, "unknown-damage-type"), "damage type survived");
    unload(damageMutant);

    const school = runFix(real, "unknown_school");
    check("unknown_spell_school", school.exitCode === 2 && hasCode(school.report, "unknown-spell-school"), "exit " + school.exitCode);
    const schoolMutant = loadCopy("school", '        errors.push({ code: "unknown-spell-school", eventId: event.eventId, value: event.spellSchool });', "        void event.spellSchool;");
    const schoolBad = runFix(schoolMutant.mod, "unknown_school");
    check("unknown_spell_school_mutant_killed", !hasCode(schoolBad.report, "unknown-spell-school"), "school survived");
    unload(schoolMutant);

    const biome = runFix(real, "unknown_biome");
    check("unknown_biome", biome.exitCode === 2 && hasCode(biome.report, "unknown-biome"), "exit " + biome.exitCode);
    const biomeMutant = loadCopy("biome", '        errors.push({ code: "unknown-biome", eventId: event.eventId, value: event.biome });', "        void event.biome;");
    const biomeBad = runFix(biomeMutant.mod, "unknown_biome");
    check("unknown_biome_mutant_killed", !hasCode(biomeBad.report, "unknown-biome"), "biome survived");
    unload(biomeMutant);

    const atten = runFix(real, "missing_attenuation");
    check("missing_attenuation_class", atten.exitCode === 2 && hasKeyword(atten.report, "required", "attenuationClass"), "exit " + atten.exitCode);
    const attenMutant = loadCopy("atten", 'if (!Object.prototype.hasOwnProperty.call(data, key)) {', 'if (false && !Object.prototype.hasOwnProperty.call(data, key)) {');
    const attenBad = runFix(attenMutant.mod, "missing_attenuation");
    check("missing_attenuation_class_mutant_killed", !hasKeyword(attenBad.report, "required", "attenuationClass"), "required survived");
    unload(attenMutant);

    const alias = runFix(real, "alias", ["--strict"]);
    check("legacy_alias_misnamed", alias.exitCode === 1 && alias.report.violations.some(item => item.status === "misnamed" && item.reason === "alias") && alias.report.counts.unknown === 0, "exit " + alias.exitCode);
    const aliasMutant = loadCopy("alias", '        status = "misnamed";\n        reason = "alias";', '        status = "present";\n        reason = null;');
    const aliasBad = runFix(aliasMutant.mod, "alias", ["--strict"]);
    check("legacy_alias_misnamed_mutant_killed", !aliasBad.report.violations.some(item => item.reason === "alias"), "alias survived");
    unload(aliasMutant);

    const unknown = runFix(real, "unknown_file", ["--strict", "--json"]);
    check("unknown_file", unknown.exitCode === 1 && unknown.report.unknownFiles.some(file => file.stem === "Computer" && file.status === "unknown"), "exit " + unknown.exitCode);
    const unknownMutant = loadCopy("unknown", "        unknown.push({ folder: file.folder, file: file.file, stem: file.stem, ext: file.ext, size: file.size, status: \"unknown\" });", "        if (false) unknown.push({ folder: file.folder, file: file.file, stem: file.stem, ext: file.ext, size: file.size, status: \"unknown\" });");
    const unknownBad = runFix(unknownMutant.mod, "unknown_file", ["--strict"]);
    check("unknown_file_mutant_killed", unknownBad.report.counts.unknown === 0, "unknown survived");
    unload(unknownMutant);

    const strictMutant = loadCopy("strict", "else if (opts.strict && (counts.missing + counts.misnamed + counts.unknown) > 0) exitCode = 1;", "else if (false && opts.strict && (counts.missing + counts.misnamed + counts.unknown) > 0) exitCode = 1;");
    const strictBad = runFix(strictMutant.mod, "missing", ["--strict"]);
    check("strict_exit_code", missing.exitCode === 1 && missingLoose.exitCode === 0, "base exits");
    check("strict_exit_code_mutant_killed", strictBad.exitCode === 0, "exit " + strictBad.exitCode);
    unload(strictMutant);

    let parsed = false;
    try { parsed = JSON.parse(valid.stdout).counts.present === 1; } catch (e) { parsed = false; }
    const jsonMutant = loadCopy("json", 'const stdout = opts.json ? JSON.stringify(result.report, null, 2) + "\\n" : formatHuman(result.report);', 'const stdout = opts.json ? "NOT-JSON\\n" : formatHuman(result.report);');
    const jsonBad = runFix(jsonMutant.mod, "valid", ["--json"]);
    let jsonParsed = true;
    try { JSON.parse(jsonBad.stdout); } catch (e) { jsonParsed = false; }
    check("json_flag", parsed, "stdout did not parse");
    check("json_flag_mutant_killed", !jsonParsed, "mutant still emitted JSON");
    unload(jsonMutant);

    const filtered = runFix(real, "category", ["--category", "foot", "--strict"]);
    check("category_filter", filtered.exitCode === 1 && filtered.report.violations.length === 1 && filtered.report.violations[0].eventId === "foot.stone.walk", "n=" + filtered.report.violations.length);
    const categoryMutant = loadCopy("category", "    const shown = opts.category ? items.filter(item => item.category === opts.category) : items;", "    const shown = items;");
    const categoryBad = runFix(categoryMutant.mod, "category", ["--category", "foot", "--strict"]);
    check("category_filter_mutant_killed", categoryBad.report.violations.length !== 1, "n=" + categoryBad.report.violations.length);
    unload(categoryMutant);

    const cleanSrc = fs.readFileSync(VALIDATOR, "utf8");
    const writeRe = /fs\.writeFile|fs\.appendFile|fs\.createWriteStream|fs\.unlink|fs\.rmSync|fs\.mkdirSync|fs\.copyFile|fs\.renameSync/;
    const writeSrc = mutateSource("write", "        wroteAudio: false,", "        wroteAudio: false,\n        audioWriteAttempt: fs.writeFileSync('audio-write', ''),");
    check("no_audio_write", !writeRe.test(cleanSrc), "clean source writes");
    check("no_audio_write_mutant_killed", writeRe.test(writeSrc), "mutant was not detected");

    const origRead = fs.readFileSync;
    function guard(mod, name) {
        const audioDir = path.join(FIX, name, "audio");
        fs.readFileSync = function (file) {
            const text = String(file);
            if (text.indexOf(audioDir) === 0) throw new Error("read audio bytes " + text);
            return origRead.apply(fs, arguments);
        };
        try {
            return mod.run(["--standard", path.join(FIX, name, "standard.json"), "--schema", SCHEMA, "--audio", audioDir, "--strict"]);
        } finally {
            fs.readFileSync = origRead;
        }
    }
    let guardedOk = false;
    try { guardedOk = guard(real, "valid").exitCode === 0; } catch (e) { guardedOk = false; }
    const readMutant = loadCopy("read", "            const st = fs.statSync(full);", "            fs.readFileSync(full);\n            const st = fs.statSync(full);");
    const readResult = guard(readMutant.mod, "valid");
    check("no_audio_bytes", guardedOk, "clean run read audio");
    check("no_audio_bytes_mutant_killed", readResult.exitCode === 2 && /read audio bytes/.test(readResult.stdout), "exit " + readResult.exitCode + " " + readResult.stdout);
    unload(readMutant);

    const tally = countsOf(real);
    const countDiff = Object.keys(tally.expect).filter(key => tally.expect[key] !== tally.got[key]).map(key => key + " " + tally.got[key] + "!=" + tally.expect[key]);
    check("category_counts", countDiff.length === 0 && tally.events.length === 1136, countDiff.join(", ") || ("n=" + tally.events.length));
    const countMutant = loadCopy("cartesian", "            for (const value of axes[key]) {", "            for (const value of axes[key].slice(0, -1)) {");
    const short = countsOf(countMutant.mod);
    check("category_counts_mutant_killed", short.got.foot !== tally.expect.foot, "foot " + short.got.foot);
    unload(countMutant);

    const linger = tally.events.find(event => event.eventId === "spell.evocation.burst.linger");
    const cast = tally.events.find(event => event.eventId === "spell.evocation.bolt.cast");
    const call = tally.events.find(event => event.eventId === "vocal.dragon.attack");
    const emote = tally.events.find(event => event.eventId === "vocal.dragon.heart");
    const impact = tally.events.find(event => event.eventId === "spell.evocation.burst.impact");
    check("variant_shape", !!(linger && linger.variants === 1 && linger.loop && linger.attenuationClass === "point" && cast && cast.variants === 2 && !cast.loop && cast.attenuationClass === "point" && call && call.variants === 2 && emote && emote.variants === 1 && impact && impact.attenuationClass === "point-loud" && impact.variants === 2), "linger=" + (linger && linger.attenuationClass) + " cast=" + (cast && cast.variants) + " impact=" + (impact && impact.attenuationClass));
    const variantMutant = loadCopy("variants", "    let variants = gen.variants;", "    let variants = 1;");
    const variantEvents = variantMutant.mod.expandEvents(variantMutant.mod.buildPublishedData());
    const variantCast = variantEvents.find(event => event.eventId === "spell.evocation.bolt.cast");
    check("variant_shape_mutant_killed", !variantCast || variantCast.variants !== 2, "variants " + (variantCast && variantCast.variants));
    unload(variantMutant);

    const md = fs.readFileSync(MD_PATH, "utf8");
    const standard = JSON.parse(fs.readFileSync(STANDARD, "utf8"));
    const ruleDiff = real.diffNamed(real.extractRules(md), standard.rules);
    const ruleClean = !ruleDiff.missingInJson.length && !ruleDiff.missingInMd.length && !ruleDiff.statementMismatches.length && !ruleDiff.levelMismatches.length;
    check("rules_match_markdown", ruleClean, JSON.stringify(ruleDiff));
    const ruleBreak = loadCopy("rules-break", "    return { missingInJson: missingInJson, missingInMd: missingInMd, statementMismatches: statementMismatches, levelMismatches: levelMismatches };", "    return { missingInJson: ['AU-FAKE-000'], missingInMd: missingInMd, statementMismatches: statementMismatches, levelMismatches: levelMismatches };");
    const broken = ruleBreak.mod.diffNamed(ruleBreak.mod.extractRules(md), standard.rules);
    check("rules_match_markdown_mutant_killed", broken.missingInJson.indexOf("AU-FAKE-000") >= 0, "fake id missing");
    unload(ruleBreak);
    const planted = real.diffNamed({ "AU-NOPE-000": { id: "AU-NOPE-000", title: "X", statement: "MUST: X", level: "MUST" } }, {});
    check("rules_diff_detects_mismatch", planted.missingInJson.indexOf("AU-NOPE-000") >= 0, "planted id not seen");
    const ruleBlind = loadCopy("rules-blind", "    return { missingInJson: missingInJson, missingInMd: missingInMd, statementMismatches: statementMismatches, levelMismatches: levelMismatches };", "    return { missingInJson: [], missingInMd: [], statementMismatches: [], levelMismatches: [] };");
    const blind = ruleBlind.mod.diffNamed({ "AU-NOPE-000": { id: "AU-NOPE-000", title: "X", statement: "MUST: X", level: "MUST" } }, {});
    check("rules_diff_detects_mismatch_mutant_killed", blind.missingInJson.length === 0, "mutant still reported");
    unload(ruleBlind);

    const questions = real.diffNamed(real.extractNotes(md, /^### (OQ-\d{2}) - (.+)$/), standard.openQuestions);
    const proposals = real.diffNamed(real.extractNotes(md, /^### (PROPOSED-AM-\d{2}) - (.+)$/), standard.proposedFollowUps);
    check("open_questions_match", Object.keys(standard.openQuestions).length === 14 && !questions.missingInJson.length && !questions.missingInMd.length && !questions.statementMismatches.length, JSON.stringify(questions));
    check("proposals_match", Object.keys(standard.proposedFollowUps).length === 6 && !proposals.missingInJson.length && !proposals.missingInMd.length && !proposals.statementMismatches.length, JSON.stringify(proposals));

    const mentionMiss = real.mdMentionsCanonical(md);
    check("markdown_mentions_closed_sets", mentionMiss.length === 0, mentionMiss.slice(0, 8).join(","));
    const mentionMutant = loadCopy("mentions", "    return missing;", "    return ['injected'];");
    check("markdown_mentions_closed_sets_mutant_killed", mentionMutant.mod.mdMentionsCanonical(md).indexOf("injected") >= 0, "no injected token");
    unload(mentionMutant);

    const gaps = repoGaps(real);
    check("repo_sets_covered", gaps.length === 0, gaps.slice(0, 12).join(", "));
    const gapMutant = loadCopy("gaps", "    for (const key of need) if (!Object.prototype.hasOwnProperty.call(have || {}, key)) out.push(key);\n    return out;", "    return ['injected'];");
    check("repo_sets_covered_mutant_killed", repoGaps(gapMutant.mod).join(" ").indexOf("injected") >= 0, "injected gap missing");
    unload(gapMutant);
    const plantedGap = real.missingKeys({ stone: "stone" }, ["stone", "void"]);
    check("missing_keys_detects", plantedGap.indexOf("void") >= 0 && plantedGap.indexOf("stone") < 0, plantedGap.join(","));
    const keyBlind = loadCopy("keys", "    for (const key of need) if (!Object.prototype.hasOwnProperty.call(have || {}, key)) out.push(key);\n    return out;", "    return [];");
    check("missing_keys_detects_mutant_killed", keyBlind.mod.missingKeys({ stone: "stone" }, ["stone", "void"]).length === 0, "mutant still listed keys");
    unload(keyBlind);

    const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
    const words = real.unsupportedSchemaKeywords(schema);
    check("schema_keywords_supported", words.length === 0 && schema.$schema.indexOf("2020-12") >= 0, words.join(","));
    const wordMutant = loadCopy("schema-words", "function unsupportedSchemaKeywords(node, found) {\n    const list = found || [];", "function unsupportedSchemaKeywords(node, found) {\n    return found || [];\n    const list = found || [];");
    check("schema_keywords_supported_mutant_killed", wordMutant.mod.unsupportedSchemaKeywords({ not: true }).length === 0 && real.unsupportedSchemaKeywords({ not: true }).indexOf("not") >= 0, "keyword walk");
    unload(wordMutant);

    const ids = real.wbsIds(md + "\n" + fs.readFileSync(STANDARD, "utf8"));
    check("no_minted_wbs_ids", ids.length === 0, ids.join(","));
    const wbsMutant = loadCopy("wbs", "    return hits;", "    return ['WG.0.0'];");
    check("no_minted_wbs_ids_mutant_killed", wbsMutant.mod.wbsIds(md).indexOf("WG.0.0") >= 0, "mutant hid the hit");
    unload(wbsMutant);
    check("wbs_scan_detects", real.wbsIds("see WG.1.2 now").indexOf("WG.1.2") >= 0, "scan miss");

    check("self_check", real.selfCheck().length === 0, real.selfCheck().slice(0, 5).join(", "));
    const slashMutant = loadCopy("slash", 'if (classifyLegacyStem("se", "Slash1").mapsTo !== "hit.slashing.flesh") problems.push("slash map");', 'if (classifyLegacyStem("se", "Slash1").mapsTo === "hit.slashing.flesh") problems.push("slash map");');
    check("self_check_mutant_killed", slashMutant.mod.selfCheck().indexOf("slash map") >= 0, "slash mutant passed");
    unload(slashMutant);

    const production = real.run(["--json"]);
    const files = real.listAudio(AUDIO);
    const expectedUnknown = files.filter(file => real.classifyLegacyStem(file.folder, file.stem).mapsTo == null).length;
    check("production_document", production.exitCode === 0 && production.report.documentErrors.length === 0 && production.report.wroteAudio === false && production.report.decodedAudio === false && production.report.eventCount === 1136, "exit " + production.exitCode + " errors " + production.report.documentErrors.length);
    check("production_coverage", production.report.counts.unknown === expectedUnknown && production.report.counts.present + production.report.counts.missing + production.report.counts.misnamed === production.report.eventCount, JSON.stringify(production.report.counts));
    let productionParsed = false;
    try { productionParsed = JSON.parse(production.stdout).eventCount === 1136; } catch (e) { productionParsed = false; }
    check("production_json", productionParsed, "production stdout");
} catch (err) {
    failed += 1;
    console.log("FAIL harness: " + (err && err.stack || err));
}

finish();
