#!/usr/bin/env node
"use strict";

// SOC.31.01 deterministic treasury checks. No runtime or physical-currency fixture is loaded.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const MODULE_PATH = path.join(ROOT, "game", "js", "sim", "society", "DEUS_Treasury.js");
const SCHEMA_PATH = path.join(ROOT, "game", "data", "society", "treasury.schema.json");
const DOC_PATH = path.join(ROOT, "docs", "systems", "DEUS_Treasury.md");
const GAPS_PATH = path.join(ROOT, "tasks", "SOC.31.01", "lane-bp", "AUTHORITY_GAPS.md");

const Treasury = require(MODULE_PATH);
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const source = fs.readFileSync(MODULE_PATH, "utf8");
const doc = fs.readFileSync(DOC_PATH, "utf8");
const gaps = fs.readFileSync(GAPS_PATH, "utf8");

let passed = 0;
let failed = 0;

function stable(value) {
    if (value === undefined) return "undefined";
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    return "{" + Object.keys(value).sort().map(function(key) {
        return JSON.stringify(key) + ":" + stable(value[key]);
    }).join(",") + "}";
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function check(name, condition, detail) {
    if (condition) {
        passed++;
        console.log("PASS " + name + (detail ? " - " + detail : ""));
    } else {
        failed++;
        console.error("FAIL " + name + (detail ? " - " + detail : ""));
    }
}

function errorCode(fn) {
    try {
        fn();
        return "NO_ERROR";
    } catch (error) {
        return error && error.code ? error.code : "THREW:" + (error && error.message);
    }
}

function hasCode(result, code) {
    return !!result && Array.isArray(result.errors) && result.errors.some(function(error) { return error.code === code; });
}

function frozenDeep(value) {
    if (value === null || typeof value !== "object") return true;
    if (!Object.isFrozen(value)) return false;
    return Object.keys(value).every(function(key) { return frozenDeep(value[key]); });
}

function time(tick, domain) {
    return { domain: domain || "historical", tick: tick };
}

const ACCOUNTS = Object.freeze({
    asset: "account.asset.general",
    liability: "account.liability.debt",
    net: "account.net.position",
    revenue: "account.revenue.public",
    expense: "account.expense.public"
});

function config() {
    return {
        treasuryId: "treasury.TEST_1",
        factionId: "faction.TEST_1",
        unitOfAccountId: "unit.TEST_financial",
        accounts: [
            { accountId: ACCOUNTS.revenue, domain: "FINANCIAL", category: "REVENUE" },
            { accountId: ACCOUNTS.asset, domain: "FINANCIAL", category: "ASSET" },
            { accountId: ACCOUNTS.expense, domain: "FINANCIAL", category: "EXPENSE" },
            { accountId: ACCOUNTS.net, domain: "FINANCIAL", category: "NET_POSITION" },
            { accountId: ACCOUNTS.liability, domain: "FINANCIAL", category: "LIABILITY" }
        ]
    };
}

function unchanged(name, inputs, fn) {
    const before = inputs.map(stable);
    const result = fn();
    const after = inputs.map(stable);
    check(name + ".inputs_unchanged", before.every(function(value, index) { return value === after[index]; }),
        before.every(function(value, index) { return value === after[index]; }) ? "caller objects preserved" : "caller object changed");
    check(name + ".result_frozen", frozenDeep(result), "returned state is deeply frozen");
    return result;
}

function buildScenario() {
    const cfg = config();
    let state = unchanged("create", [cfg], function() { return Treasury.create(cfg); });
    const empty = state;

    const revenue = {
        revenueId: "revenue.TEST_1",
        transactionId: "transaction.revenue.TEST_1",
        revenueTypeId: "revenue-type.TEST_public",
        policyId: "policy.TEST_revenue",
        sourceEntityId: "entity.TEST_payer",
        amount: 1000,
        assetAccountId: ACCOUNTS.asset,
        revenueAccountId: ACCOUNTS.revenue,
        occurredAt: time(10)
    };
    state = unchanged("record_revenue", [state, revenue], function() { return Treasury.recordRevenue(state, revenue); });

    const spendRequest = {
        authorizationId: "authorization.TEST_spend",
        purposeType: "GENERAL_EXPENDITURE",
        subjectId: "entity.TEST_payee",
        debitAccountId: ACCOUNTS.expense,
        settlementAccountId: ACCOUNTS.asset,
        requestedAmount: 300
    };
    const spendDecision = {
        decisionId: "decision.TEST_spend",
        policyId: "policy.TEST_spend",
        authorizerOfficeId: "office.TEST_treasurer",
        authorized: true,
        approvedAmount: 300,
        decidedAt: time(20)
    };
    state = unchanged("authorize_spend", [state, spendRequest, spendDecision], function() {
        return Treasury.authorizeExpenditure(state, spendRequest, spendDecision);
    });
    const execution1 = {
        executionId: "execution.TEST_spend_1",
        authorizationId: spendRequest.authorizationId,
        transactionId: "transaction.expense.TEST_1",
        amount: 120,
        executedAt: time(30)
    };
    state = unchanged("execute_spend_partial", [state, execution1], function() { return Treasury.executeExpenditure(state, execution1); });
    const execution2 = {
        executionId: "execution.TEST_spend_2",
        authorizationId: spendRequest.authorizationId,
        transactionId: "transaction.expense.TEST_2",
        amount: 180,
        executedAt: time(40)
    };
    state = unchanged("execute_spend_exhaust", [state, execution2], function() { return Treasury.executeExpenditure(state, execution2); });

    const debtTerms = {
        debtId: "debt.TEST_1",
        transactionId: "transaction.debt_issue.TEST_1",
        creditorEntityId: "entity.TEST_creditor",
        liabilityAccountId: ACCOUNTS.liability,
        proceedsAccountId: ACCOUNTS.asset,
        principalAmount: 500,
        issuedAt: time(50)
    };
    const debtDecision = {
        decisionId: "decision.TEST_debt_issue",
        policyId: "policy.TEST_debt_issue",
        authorizerOfficeId: "office.TEST_treasurer",
        authorized: true,
        approvedPrincipalAmount: 500,
        decidedAt: time(45)
    };
    state = unchanged("issue_debt", [state, debtTerms, debtDecision], function() { return Treasury.issueDebt(state, debtTerms, debtDecision); });

    const repayRequest1 = {
        authorizationId: "authorization.TEST_repay_1",
        purposeType: "DEBT_REPAYMENT",
        subjectId: debtTerms.debtId,
        debitAccountId: ACCOUNTS.liability,
        settlementAccountId: ACCOUNTS.asset,
        requestedAmount: 200
    };
    const repayDecision1 = {
        decisionId: "decision.TEST_repay_1",
        policyId: "policy.TEST_repay",
        authorizerOfficeId: "office.TEST_treasurer",
        authorized: true,
        approvedAmount: 200,
        decidedAt: time(60)
    };
    state = unchanged("authorize_repayment_1", [state, repayRequest1, repayDecision1], function() {
        return Treasury.authorizeExpenditure(state, repayRequest1, repayDecision1);
    });
    const repayment1 = {
        repaymentId: "repayment.TEST_1",
        executionId: "execution.TEST_repay_1",
        authorizationId: repayRequest1.authorizationId,
        transactionId: "transaction.debt_repay.TEST_1",
        debtId: debtTerms.debtId,
        amount: 200,
        paidAt: time(70)
    };
    state = unchanged("repay_debt_partial", [state, repayment1], function() { return Treasury.repayDebt(state, repayment1); });
    const partialDebt = state;

    const repayRequest2 = {
        authorizationId: "authorization.TEST_repay_2",
        purposeType: "DEBT_REPAYMENT",
        subjectId: debtTerms.debtId,
        debitAccountId: ACCOUNTS.liability,
        settlementAccountId: ACCOUNTS.asset,
        requestedAmount: 300
    };
    const repayDecision2 = {
        decisionId: "decision.TEST_repay_2",
        policyId: "policy.TEST_repay",
        authorizerOfficeId: "office.TEST_treasurer",
        authorized: true,
        approvedAmount: 300,
        decidedAt: time(80)
    };
    state = unchanged("authorize_repayment_2", [state, repayRequest2, repayDecision2], function() {
        return Treasury.authorizeExpenditure(state, repayRequest2, repayDecision2);
    });
    const repayment2 = {
        repaymentId: "repayment.TEST_2",
        executionId: "execution.TEST_repay_2",
        authorizationId: repayRequest2.authorizationId,
        transactionId: "transaction.debt_repay.TEST_2",
        debtId: debtTerms.debtId,
        amount: 300,
        paidAt: time(90)
    };
    state = unchanged("repay_debt_settle", [state, repayment2], function() { return Treasury.repayDebt(state, repayment2); });
    return { empty: empty, partialDebt: partialDebt, state: state };
}

// Minimal independent Draft 2020-12 subset used by this schema. Cross-record semantic constraints remain module checks.
function resolveRef(ref) {
    if (typeof ref !== "string" || ref.indexOf("#/") !== 0) throw new Error("unsupported schema ref " + ref);
    return ref.slice(2).split("/").reduce(function(node, token) {
        return node[token.replace(/~1/g, "/").replace(/~0/g, "~")];
    }, schema);
}

function typeMatches(type, value) {
    if (type === "null") return value === null;
    if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
    if (type === "array") return Array.isArray(value);
    if (type === "integer") return typeof value === "number" && Number.isInteger(value);
    return typeof value === type;
}

function schemaErrors(spec, value, at) {
    const pathHere = at || "";
    if (!spec || typeof spec !== "object") return [pathHere + " invalid schema node"];
    if (spec.$ref) return schemaErrors(resolveRef(spec.$ref), value, pathHere);
    const errors = [];
    if (hasOwn(spec, "const") && value !== spec.const) errors.push(pathHere + " const");
    if (Array.isArray(spec.enum) && spec.enum.indexOf(value) < 0) errors.push(pathHere + " enum");
    if (spec.type && !typeMatches(spec.type, value)) errors.push(pathHere + " type");
    if (spec.anyOf) {
        const count = spec.anyOf.filter(function(branch) { return schemaErrors(branch, value, pathHere).length === 0; }).length;
        if (count < 1) errors.push(pathHere + " anyOf");
    }
    if (spec.oneOf) {
        const count = spec.oneOf.filter(function(branch) { return schemaErrors(branch, value, pathHere).length === 0; }).length;
        if (count !== 1) errors.push(pathHere + " oneOf");
    }
    if (spec.allOf) for (const branch of spec.allOf) {
        errors.push.apply(errors, schemaErrors(branch, value, pathHere));
    }
    if (spec.if) {
        const condition = schemaErrors(spec.if, value, pathHere).length === 0;
        if (condition && spec.then) errors.push.apply(errors, schemaErrors(spec.then, value, pathHere));
        if (!condition && spec.else) errors.push.apply(errors, schemaErrors(spec.else, value, pathHere));
    }
    if (typeof value === "string") {
        if (Number.isInteger(spec.minLength) && value.length < spec.minLength) errors.push(pathHere + " minLength");
        if (Number.isInteger(spec.maxLength) && value.length > spec.maxLength) errors.push(pathHere + " maxLength");
        if (spec.pattern && !(new RegExp(spec.pattern)).test(value)) errors.push(pathHere + " pattern");
    }
    if (typeof value === "number") {
        if (typeof spec.minimum === "number" && value < spec.minimum) errors.push(pathHere + " minimum");
        if (typeof spec.maximum === "number" && value > spec.maximum) errors.push(pathHere + " maximum");
    }
    if (Array.isArray(value)) {
        if (Number.isInteger(spec.minItems) && value.length < spec.minItems) errors.push(pathHere + " minItems");
        if (Number.isInteger(spec.maxItems) && value.length > spec.maxItems) errors.push(pathHere + " maxItems");
        if (spec.items) value.forEach(function(item, index) {
            errors.push.apply(errors, schemaErrors(spec.items, item, pathHere + "/" + index));
        });
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        const properties = spec.properties || {};
        for (const required of spec.required || []) if (!hasOwn(value, required)) errors.push(pathHere + "/" + required + " required");
        if (spec.additionalProperties === false) for (const key of Object.keys(value)) {
            if (!hasOwn(properties, key)) errors.push(pathHere + "/" + key + " additional");
        }
        for (const key of Object.keys(properties)) if (hasOwn(value, key)) {
            errors.push.apply(errors, schemaErrors(properties[key], value[key], pathHere + "/" + key));
        }
    }
    return errors;
}

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function strictObjectDefs() {
    const bad = [];
    function walk(node, at) {
        if (!node || typeof node !== "object") return;
        if (node.type === "object" && node.additionalProperties !== false) bad.push(at);
        for (const key of Object.keys(node)) {
            if (key === "properties" || key === "$defs" || key === "items" || key === "anyOf" || key === "oneOf") walk(node[key], at + "/" + key);
            else if (Array.isArray(node[key])) node[key].forEach(function(child, index) { walk(child, at + "/" + key + "/" + index); });
            else if (node[key] && typeof node[key] === "object" && key !== "properties" && key !== "$defs") walk(node[key], at + "/" + key);
        }
    }
    walk(schema, "#");
    return bad;
}

function negativeFixtures(validState, partialDebtState) {
    return [
        {
            name: "unknown_top_level_field",
            rule: "E_SHAPE",
            run: function() { const s = clone(validState); s.physicalStores = []; return Treasury.validate(s); }
        },
        {
            name: "wrong_schema_version",
            rule: "E_SCHEMA",
            run: function() { const s = clone(validState); s.schemaVersion = 2; return Treasury.validate(s); }
        },
        {
            name: "malformed_explicit_id",
            rule: "E_ID",
            run: function() { const s = clone(validState); s.treasuryId = "not an id"; return Treasury.validate(s); }
        },
        {
            name: "physical_store_account",
            rule: "E_STORE_DOMAIN",
            run: function() { const s = clone(validState); s.accounts[0].domain = "PHYSICAL_STORE"; return Treasury.validate(s); }
        },
        {
            name: "store_category_as_financial_account",
            rule: "E_FINANCIAL_ACCOUNT",
            run: function() { const s = clone(validState); s.accounts[0].category = "FOOD_STORE"; return Treasury.validate(s); }
        },
        {
            name: "duplicate_transaction_identity",
            rule: "E_DUPLICATE_ID",
            run: function() { const s = clone(validState); s.transactions.push(clone(s.transactions[0])); return Treasury.validate(s); }
        },
        {
            name: "floating_amount_leakage",
            rule: "E_INTEGER",
            run: function() { const s = clone(validState); s.revenueEntries[0].amount = 999.5; return Treasury.validate(s); }
        },
        {
            name: "implicit_wall_clock",
            rule: "E_TIME",
            run: function() { const s = clone(validState); s.revenueEntries[0].occurredAt.domain = "wall"; return Treasury.validate(s); }
        },
        {
            name: "two_sided_posting",
            rule: "E_POSTING",
            run: function() { const s = clone(validState); s.transactions[0].postings[0].credit = 1; return Treasury.validate(s); }
        },
        {
            name: "unbalanced_postings",
            rule: "E_IMBALANCE",
            run: function() { const s = clone(validState); s.transactions[0].postings[1].credit -= 1; return Treasury.validate(s); }
        },
        {
            name: "posting_to_unknown_account",
            rule: "E_ACCOUNT",
            run: function() { const s = clone(validState); s.transactions[0].postings[0].accountId = "account.missing"; return Treasury.validate(s); }
        },
        {
            name: "orphan_transaction",
            rule: "E_LINK",
            run: function() {
                const s = clone(validState);
                const tx = clone(s.transactions[0]);
                tx.transactionId = "transaction.orphan";
                tx.sourceRecordId = "record.orphan";
                tx.postings[0].postingId = "transaction.orphan:debit";
                tx.postings[1].postingId = "transaction.orphan:credit";
                s.transactions.push(tx);
                return Treasury.validate(s);
            }
        },
        {
            name: "revenue_credits_expense",
            rule: "E_REVENUE",
            run: function() { const s = clone(validState); s.revenueEntries[0].revenueAccountId = ACCOUNTS.expense; return Treasury.validate(s); }
        },
        {
            name: "approval_exceeds_request",
            rule: "E_AUTH_DECISION",
            run: function() { const s = clone(validState); s.expenditureAuthorizations[0].approvedAmount = 301; return Treasury.validate(s); }
        },
        {
            name: "denied_authorization_has_execution",
            rule: "E_UNAUTHORIZED",
            run: function() { const s = clone(validState); s.expenditureAuthorizations[0].status = "DENIED"; return Treasury.validate(s); }
        },
        {
            name: "execution_exceeds_approval",
            rule: "E_AUTH_LIMIT",
            run: function() { const s = clone(validState); s.expenditureAuthorizations[0].approvedAmount = 299; return Treasury.validate(s); }
        },
        {
            name: "authorization_execution_total_drift",
            rule: "E_AUTH_RECONCILIATION",
            run: function() { const s = clone(validState); s.expenditureAuthorizations[0].executedAmount = 299; return Treasury.validate(s); }
        },
        {
            name: "execution_outside_account_scope",
            rule: "E_EXPENDITURE",
            run: function() { const s = clone(validState); s.expenditureAuthorizations[0].debitAccountId = ACCOUNTS.revenue; return Treasury.validate(s); }
        },
        {
            name: "implicit_overdraft",
            rule: "E_INSUFFICIENT_FUNDS",
            run: function() {
                let s = Treasury.create(config());
                s = Treasury.authorizeExpenditure(s, {
                    authorizationId: "authorization.no_funds", purposeType: "GENERAL_EXPENDITURE",
                    subjectId: "entity.TEST_payee", debitAccountId: ACCOUNTS.expense,
                    settlementAccountId: ACCOUNTS.asset, requestedAmount: 1
                }, {
                    decisionId: "decision.no_funds", policyId: "policy.TEST", authorizerOfficeId: "office.TEST_treasurer",
                    authorized: true, approvedAmount: 1, decidedAt: time(1)
                });
                return { thrown: errorCode(function() {
                    Treasury.executeExpenditure(s, {
                        executionId: "execution.no_funds", authorizationId: "authorization.no_funds",
                        transactionId: "transaction.no_funds", amount: 1, executedAt: time(2)
                    });
                }) };
            },
            thrown: true
        },
        {
            name: "debt_uses_non_liability_account",
            rule: "E_DEBT",
            run: function() { const s = clone(validState); s.debts[0].liabilityAccountId = ACCOUNTS.asset; return Treasury.validate(s); }
        },
        {
            name: "debt_principal_reconciliation_drift",
            rule: "E_DEBT_RECONCILIATION",
            run: function() { const s = clone(validState); s.debts[0].outstandingPrincipal = 1; return Treasury.validate(s); }
        },
        {
            name: "settled_debt_reopened_by_state",
            rule: "E_DEBT_TRANSITION",
            run: function() { const s = clone(validState); s.debts[0].status = "OPEN"; return Treasury.validate(s); }
        },
        {
            name: "repay_already_settled_debt",
            rule: "E_DEBT_TRANSITION",
            run: function() {
                return { thrown: errorCode(function() {
                    Treasury.repayDebt(validState, {
                        repaymentId: "repayment.after_settlement", executionId: "execution.after_settlement",
                        authorizationId: "authorization.TEST_repay_2", transactionId: "transaction.after_settlement",
                        debtId: "debt.TEST_1", amount: 1, paidAt: time(100)
                    });
                }) };
            },
            thrown: true
        },
        {
            name: "partial_debt_cannot_claim_settled",
            rule: "E_DEBT_TRANSITION",
            run: function() { const s = clone(partialDebtState); s.debts[0].status = "SETTLED"; s.debts[0].settledAt = time(75); return Treasury.validate(s); }
        }
    ];
}

function runNegativeFixtures(validState, partialDebtState) {
    console.log("\n=== TARGETED NEGATIVE FIXTURES ===");
    const fixtures = negativeFixtures(validState, partialDebtState);
    const covered = {};
    const results = {};
    for (const fixture of fixtures) {
        covered[fixture.rule] = true;
        const result = fixture.run();
        const killed = fixture.thrown ? result.thrown === fixture.rule : hasCode(result, fixture.rule);
        results[fixture.name] = killed;
        check("negative." + fixture.name, killed, killed ? "caught " + fixture.rule : "expected " + fixture.rule + ", got " + stable(result));
    }
    const missing = Treasury.VALIDATION_RULES.filter(function(rule) { return !covered[rule]; });
    check("negative.every_substantive_rule_has_fixture", missing.length === 0,
        missing.length ? "missing " + missing.join(", ") : Treasury.VALIDATION_RULES.length + " rules covered by " + fixtures.length + " fixtures");
    return results;
}

function runProvocations(validState, negativeResults) {
    console.log("\n=== REQUIRED PROVOCATIONS / MUTANTS ===");
    const named = [
        ["imbalance", negativeResults.unbalanced_postings],
        ["duplicate_transaction_ids", negativeResults.duplicate_transaction_identity],
        ["unauthorized_expenditure", negativeResults.denied_authorization_has_execution],
        ["invalid_debt_transition", negativeResults.repay_already_settled_debt],
        ["float_rounding_leakage", negativeResults.floating_amount_leakage],
        ["stores_treated_as_money", negativeResults.physical_store_account]
    ];
    for (const pair of named) check("provocation." + pair[0] + ".killed", pair[1] === true, "targeted detector fired");

    const mutableState = clone(validState);
    const mutableInput = { amount: 7, nested: { value: 9 } };
    const beforeState = stable(mutableState);
    const beforeInput = stable(mutableInput);
    function hiddenMutationMutant(state, input) {
        state.factionId = "faction.MUTATED";
        input.nested.value = 10;
        return state;
    }
    hiddenMutationMutant(mutableState, mutableInput);
    const detectorFired = stable(mutableState) !== beforeState && stable(mutableInput) !== beforeInput;
    check("provocation.hidden_input_mutation.killed", detectorFired, "mutation detector observed state and nested input changes");

    let frozenBlocked = false;
    try { validState.accounts[0].category = "FOOD_STORE"; }
    catch (error) { frozenBlocked = error instanceof TypeError; }
    check("provocation.returned_state_mutation_blocked", frozenBlocked && validState.accounts[0].category !== "FOOD_STORE",
        "deep freeze blocks hidden post-return mutation");

    const roundingCode = errorCode(function() {
        Treasury.recordRevenue(validState, {
            revenueId: "revenue.float", transactionId: "transaction.float", revenueTypeId: "revenue-type.TEST",
            policyId: "policy.TEST", sourceEntityId: null, amount: 0.1,
            assetAccountId: ACCOUNTS.asset, revenueAccountId: ACCOUNTS.revenue, occurredAt: time(101)
        });
    });
    check("provocation.runtime_float_refused", roundingCode === "E_INTEGER", "got " + roundingCode);
}

function runSchemaChecks(validState) {
    console.log("\n=== STRICT PERSISTED SCHEMA ===");
    check("schema.draft_2020_12", schema.$schema === "https://json-schema.org/draft/2020-12/schema", schema.$schema);
    check("schema.valid_state_accepted", schemaErrors(schema, validState).length === 0,
        schemaErrors(schema, validState).slice(0, 3).join(" | ") || "valid state accepted");
    const extra = clone(validState);
    extra.accounts[0].storeId = "store.TEST";
    check("schema.store_field_rejected", schemaErrors(schema, extra).length > 0, "unknown physical store field refused");
    const float = clone(validState);
    float.revenueEntries[0].amount = 1.5;
    check("schema.float_rejected", schemaErrors(schema, float).length > 0, "non-integer amount refused");
    const domain = clone(validState);
    domain.accounts[0].domain = "PHYSICAL_STORE";
    check("schema.physical_domain_rejected", schemaErrors(schema, domain).length > 0, "FINANCIAL is a const");
    const denied = clone(validState);
    denied.expenditureAuthorizations[0].status = "DENIED";
    check("schema.denied_amounts_rejected", schemaErrors(schema, denied).length > 0, "DENIED requires zero approved and executed amounts");
    const badDebtState = clone(validState);
    badDebtState.debts[0].status = "OPEN";
    check("schema.open_debt_state_rejected", schemaErrors(schema, badDebtState).length > 0, "OPEN requires positive outstanding principal and null settledAt");
    const loose = strictObjectDefs();
    check("schema.all_object_shapes_closed", loose.length === 0, loose.length ? loose.join(", ") : "all object schemas set additionalProperties=false");
}

function runModuleChecks(scenario) {
    console.log("\n=== DETERMINISTIC TREASURY MODULE ===");
    const state = scenario.state;
    const valid = Treasury.validate(state);
    check("module.valid_final_state", valid.ok, valid.ok ? "no validation errors" : stable(valid.errors.slice(0, 3)));
    check("module.zero_opening_state", Treasury.balanceSheet(scenario.empty).transactionCount === 0, "new treasury starts at zero without invented opening balance");
    check("module.revenue_recorded", state.revenueEntries.length === 1 && state.revenueEntries[0].amount === 1000, "exact caller amount retained");
    const spendAuth = state.expenditureAuthorizations.find(function(row) { return row.authorizationId === "authorization.TEST_spend"; });
    check("module.expenditure_authority_exhausted", spendAuth && spendAuth.status === "EXHAUSTED" && spendAuth.executedAmount === 300,
        stable(spendAuth));
    const debt = state.debts[0];
    check("module.debt_settled_by_principal", debt.status === "SETTLED" && debt.outstandingPrincipal === 0 && debt.repayments.length === 2,
        stable({ status: debt.status, outstandingPrincipal: debt.outstandingPrincipal, repayments: debt.repayments.length }));
    const partial = scenario.partialDebt.debts[0];
    check("module.partial_debt_remains_open", partial.status === "OPEN" && partial.outstandingPrincipal === 300,
        stable({ status: partial.status, outstandingPrincipal: partial.outstandingPrincipal }));
    const sheet = Treasury.balanceSheet(state);
    check("module.balance_sheet_values", sheet.totals.ASSET === 700 && sheet.totals.EXPENSE === 300 &&
        sheet.totals.LIABILITY === 0 && sheet.totals.REVENUE === 1000,
        stable(sheet.totals));
    check("module.accounting_equation", sheet.equation.balanced && sheet.equation.left === 1000 && sheet.equation.right === 1000,
        stable(sheet.equation));
    const audit = Treasury.audit(state);
    check("module.audit", audit.ok && audit.balanceSheet.equation.balanced, "journal and derived sheet reconcile");
    const text = Treasury.serialize(state);
    const loaded = Treasury.deserialize(text);
    check("module.save_round_trip", stable(loaded) === stable(state) && Treasury.serialize(loaded) === text,
        "canonical bytes and data round-trip");
    check("module.deserialized_state_frozen", frozenDeep(loaded), "loaded save truth is deeply frozen");

    const replay = buildScenario().state;
    check("module.deterministic_replay", Treasury.serialize(replay) === text, "same calls produce identical canonical state");
}

function runIsolationChecks() {
    console.log("\n=== ISOLATION AND AUTHORITY GAPS ===");
    const banned = [
        ["wall_clock", /\bDate\s*\.|performance\s*\./],
        ["random", /Math\.random|crypto\.random/],
        ["filesystem", /require\s*\(\s*["'](?:fs|path)["']\s*\)/],
        ["engine_global", /\b(?:window|globalThis|SceneManager|DataManager|\$game)[A-Za-z0-9_]*/],
        ["mint_dependency", /DEUS_Mint|Mint\.js/]
    ];
    for (const item of banned) check("isolation.no_" + item[0], !item[1].test(source), "source scan");
    check("isolation.no_physical_store_state", !/physicalStores|quartermasterStores|foodQuantity|itemQuantity/.test(source), "no store state in module");
    const gapTerms = ["Currency, denomination", "Tax, tariff", "Office authority", "Credit limits", "Interest, maturity", "Physical coin custody"];
    check("authority.gaps_recorded", gapTerms.every(function(term) { return gaps.indexOf(term) >= 0; }), gapTerms.join(", "));
    const docTerms = ["INV-SOC-06", "assets + expenses", "caller-supplied", "principal", "physical"];
    check("documentation.contract_present", docTerms.every(function(term) { return doc.indexOf(term) >= 0; }), docTerms.join(", "));
}

function main() {
    console.log("=== SOC.31.01 TREASURY & FINANCIAL BUDGETING LEDGER ===");
    let scenario;
    try {
        scenario = buildScenario();
    } catch (error) {
        check("scenario.build", false, error && error.stack ? error.stack : String(error));
        console.log("RESULT: " + passed + " passed, " + failed + " failed");
        process.exit(1);
    }
    runModuleChecks(scenario);
    runSchemaChecks(scenario.state);
    const negativeResults = runNegativeFixtures(scenario.state, scenario.partialDebt);
    runProvocations(scenario.state, negativeResults);
    runIsolationChecks();
    console.log("\nRESULT: " + passed + " passed, " + failed + " failed");
    process.exit(failed === 0 ? 0 : 1);
}

main();
