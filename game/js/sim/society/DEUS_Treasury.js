"use strict";

// SOC.31.01 treasury ledger. Host-agnostic CommonJS: no engine globals, clock,
// filesystem, randomness, UI, physical inventory, or mint dependency.

const SCHEMA_VERSION = 1;
const MAX = Number.MAX_SAFE_INTEGER;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const POSTING_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ACCOUNT_CATEGORIES = Object.freeze(["ASSET", "LIABILITY", "NET_POSITION", "REVENUE", "EXPENSE"]);
const TIME_DOMAINS = Object.freeze(["action", "historical", "presentation", "engine"]);
const TRANSACTION_KINDS = Object.freeze(["REVENUE", "EXPENDITURE", "DEBT_ISSUANCE", "DEBT_REPAYMENT"]);
const PURPOSE_TYPES = Object.freeze(["GENERAL_EXPENDITURE", "DEBT_REPAYMENT"]);
const AUTHORIZATION_STATUSES = Object.freeze(["APPROVED", "DENIED", "EXHAUSTED"]);
const DEBT_STATUSES = Object.freeze(["OPEN", "SETTLED"]);

// Each substantive rule has a targeted negative fixture in tools/society/test_treasury.js.
const VALIDATION_RULES = Object.freeze([
    "E_SHAPE",
    "E_SCHEMA",
    "E_ID",
    "E_STORE_DOMAIN",
    "E_FINANCIAL_ACCOUNT",
    "E_DUPLICATE_ID",
    "E_INTEGER",
    "E_TIME",
    "E_POSTING",
    "E_IMBALANCE",
    "E_ACCOUNT",
    "E_LINK",
    "E_REVENUE",
    "E_AUTH_DECISION",
    "E_UNAUTHORIZED",
    "E_AUTH_LIMIT",
    "E_AUTH_RECONCILIATION",
    "E_EXPENDITURE",
    "E_INSUFFICIENT_FUNDS",
    "E_DEBT",
    "E_DEBT_RECONCILIATION",
    "E_DEBT_TRANSITION"
]);

const STATE_KEYS = Object.freeze([
    "schemaVersion", "treasuryId", "factionId", "unitOfAccountId", "accounts", "transactions",
    "revenueEntries", "expenditureAuthorizations", "expenditureExecutions", "debts"
]);
const ACCOUNT_KEYS = Object.freeze(["accountId", "domain", "category"]);
const TIME_KEYS = Object.freeze(["domain", "tick"]);
const POSTING_KEYS = Object.freeze(["postingId", "accountId", "debit", "credit"]);
const TRANSACTION_KEYS = Object.freeze(["transactionId", "kind", "sourceRecordId", "occurredAt", "postings"]);
const REVENUE_KEYS = Object.freeze([
    "revenueId", "transactionId", "revenueTypeId", "policyId", "sourceEntityId", "amount",
    "assetAccountId", "revenueAccountId", "occurredAt"
]);
const AUTHORIZATION_KEYS = Object.freeze([
    "authorizationId", "decisionId", "policyId", "authorizerOfficeId", "purposeType", "subjectId",
    "debitAccountId", "settlementAccountId", "requestedAmount", "approvedAmount", "executedAmount",
    "status", "decidedAt"
]);
const EXECUTION_KEYS = Object.freeze([
    "executionId", "authorizationId", "transactionId", "operationType", "subjectId", "amount", "executedAt"
]);
const DEBT_KEYS = Object.freeze([
    "debtId", "creditorEntityId", "liabilityAccountId", "proceedsAccountId", "principalAmount",
    "outstandingPrincipal", "status", "policyId", "decisionId", "authorizerOfficeId",
    "authorizedAt", "issuanceTransactionId", "issuedAt", "settledAt", "repayments"
]);
const REPAYMENT_KEYS = Object.freeze([
    "repaymentId", "executionId", "transactionId", "authorizationId", "amount", "paidAt"
]);

function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const key of Object.keys(value)) deepFreeze(value[key]);
    }
    return value;
}

function canonical(value) {
    if (value === null) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string") return JSON.stringify(value);
    if (typeof value === "number") {
        if (!Number.isSafeInteger(value)) throw treasuryError("E_INTEGER", "", "canonical data contains a non-safe integer");
        return String(value);
    }
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (isObject(value)) {
        return "{" + Object.keys(value).sort().map(function(key) {
            return JSON.stringify(key) + ":" + canonical(value[key]);
        }).join(",") + "}";
    }
    throw treasuryError("E_SHAPE", "", "canonical data must be JSON-safe");
}

function treasuryError(code, path, message, errors) {
    const error = new Error(code + (path ? " at " + path : "") + ": " + message);
    error.name = "TreasuryError";
    error.code = code;
    error.path = path;
    if (errors) error.errors = errors;
    return error;
}

function addError(errors, code, path, message) {
    errors.push({ code: code, path: path, message: message });
}

function exactKeys(value, keys, path, errors) {
    if (!isObject(value)) {
        addError(errors, "E_SHAPE", path, "must be an object");
        return false;
    }
    for (const key of keys) if (!has(value, key)) addError(errors, "E_SHAPE", path + "/" + key, "required field is missing");
    for (const key of Object.keys(value)) if (keys.indexOf(key) < 0) addError(errors, "E_SHAPE", path + "/" + key, "unknown field");
    return true;
}

function validIdentifier(value, path, errors, posting) {
    const re = posting ? POSTING_ID_RE : ID_RE;
    if (typeof value !== "string" || !re.test(value)) {
        addError(errors, "E_ID", path, "must be an explicit stable identifier matching " + String(re));
        return false;
    }
    return true;
}

function validNullableIdentifier(value, path, errors) {
    return value === null || validIdentifier(value, path, errors, false);
}

function nonNegativeInteger(value, path, errors) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
        addError(errors, "E_INTEGER", path, "must be a non-negative safe integer");
        return false;
    }
    return true;
}

function positiveInteger(value, path, errors) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
        addError(errors, "E_INTEGER", path, "must be a positive safe integer");
        return false;
    }
    return true;
}

function safeAdd(left, right, code, path, errors) {
    const result = left + right;
    if (!Number.isSafeInteger(result)) {
        addError(errors, code || "E_INTEGER", path, "integer arithmetic would exceed the safe range");
        return left;
    }
    return result;
}

function assertNonNegativeSafeInteger(value, path) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
        throw treasuryError("E_INTEGER", path, "must be a non-negative safe integer");
    }
}

function assertPositiveSafeInteger(value, path) {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
        throw treasuryError("E_INTEGER", path, "must be a positive safe integer");
    }
}

function compareCodeUnits(left, right) {
    const a = String(left);
    const b = String(right);
    return a < b ? -1 : (a > b ? 1 : 0);
}

function validateTime(value, path, errors) {
    if (!exactKeys(value, TIME_KEYS, path, errors)) return false;
    let ok = true;
    if (TIME_DOMAINS.indexOf(value.domain) < 0) {
        addError(errors, "E_TIME", path + "/domain", "must name an explicit DEUS time domain");
        ok = false;
    }
    if (!nonNegativeInteger(value.tick, path + "/tick", errors)) ok = false;
    return ok;
}

function sameTime(left, right) {
    return !!left && !!right && left.domain === right.domain && left.tick === right.tick;
}

function uniqueId(seen, id, path, errors, namespace) {
    if (typeof id !== "string") return;
    const key = namespace + "\u0000" + id;
    if (seen[key]) addError(errors, "E_DUPLICATE_ID", path, "duplicates " + seen[key]);
    else seen[key] = path;
}

function validateAccount(account, index, errors, seen) {
    const path = "/accounts/" + index;
    if (!exactKeys(account, ACCOUNT_KEYS, path, errors)) return;
    validIdentifier(account.accountId, path + "/accountId", errors, false);
    uniqueId(seen, account.accountId, path + "/accountId", errors, "account");
    if (account.domain !== "FINANCIAL") {
        addError(errors, "E_STORE_DOMAIN", path + "/domain", "treasury accounts must be FINANCIAL; physical stores are a separate subsystem (INV-SOC-06)");
    }
    if (ACCOUNT_CATEGORIES.indexOf(account.category) < 0) {
        addError(errors, "E_FINANCIAL_ACCOUNT", path + "/category", "must be a financial account category");
    }
}

function validatePosting(posting, transactionIndex, postingIndex, errors, seen, accounts) {
    const path = "/transactions/" + transactionIndex + "/postings/" + postingIndex;
    if (!exactKeys(posting, POSTING_KEYS, path, errors)) return null;
    validIdentifier(posting.postingId, path + "/postingId", errors, true);
    validIdentifier(posting.accountId, path + "/accountId", errors, false);
    uniqueId(seen, posting.postingId, path + "/postingId", errors, "posting");
    const debitOk = nonNegativeInteger(posting.debit, path + "/debit", errors);
    const creditOk = nonNegativeInteger(posting.credit, path + "/credit", errors);
    if (debitOk && creditOk && !((posting.debit > 0 && posting.credit === 0) || (posting.credit > 0 && posting.debit === 0))) {
        addError(errors, "E_POSTING", path, "exactly one of debit or credit must be a positive integer");
    }
    if (typeof posting.accountId === "string" && !accounts[posting.accountId]) {
        addError(errors, "E_ACCOUNT", path + "/accountId", "does not name a declared financial account");
    }
    return posting;
}

function validateTransaction(transaction, index, errors, seen, accounts) {
    const path = "/transactions/" + index;
    if (!exactKeys(transaction, TRANSACTION_KEYS, path, errors)) return;
    validIdentifier(transaction.transactionId, path + "/transactionId", errors, false);
    validIdentifier(transaction.sourceRecordId, path + "/sourceRecordId", errors, false);
    uniqueId(seen, transaction.transactionId, path + "/transactionId", errors, "transaction");
    if (TRANSACTION_KINDS.indexOf(transaction.kind) < 0) addError(errors, "E_SHAPE", path + "/kind", "unknown transaction kind");
    validateTime(transaction.occurredAt, path + "/occurredAt", errors);
    if (!Array.isArray(transaction.postings) || transaction.postings.length !== 2) {
        addError(errors, "E_POSTING", path + "/postings", "must contain exactly two postings");
        return;
    }
    let debits = 0;
    let credits = 0;
    for (let i = 0; i < transaction.postings.length; i++) {
        const posting = validatePosting(transaction.postings[i], index, i, errors, seen, accounts);
        if (!posting) continue;
        if (Number.isSafeInteger(posting.debit)) debits = safeAdd(debits, posting.debit, "E_INTEGER", path + "/postings", errors);
        if (Number.isSafeInteger(posting.credit)) credits = safeAdd(credits, posting.credit, "E_INTEGER", path + "/postings", errors);
    }
    if (Number.isSafeInteger(debits) && Number.isSafeInteger(credits) && debits !== credits) {
        addError(errors, "E_IMBALANCE", path + "/postings", "debits " + debits + " do not equal credits " + credits);
    }
}

function expectedPostings(transactionId, debitAccountId, creditAccountId, amount) {
    return [
        { postingId: transactionId + ":debit", accountId: debitAccountId, debit: amount, credit: 0 },
        { postingId: transactionId + ":credit", accountId: creditAccountId, debit: 0, credit: amount }
    ];
}

function postingsMatch(actual, expected) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    for (let i = 0; i < expected.length; i++) {
        const a = actual[i];
        const e = expected[i];
        if (!a || a.postingId !== e.postingId || a.accountId !== e.accountId || a.debit !== e.debit || a.credit !== e.credit) return false;
    }
    return true;
}

function transactionMatches(transaction, kind, sourceRecordId, occurredAt, debitAccountId, creditAccountId, amount) {
    return !!transaction && transaction.kind === kind && transaction.sourceRecordId === sourceRecordId &&
        sameTime(transaction.occurredAt, occurredAt) &&
        postingsMatch(transaction.postings, expectedPostings(transaction.transactionId, debitAccountId, creditAccountId, amount));
}

function accountCategory(accounts, accountId) {
    return accounts[accountId] ? accounts[accountId].category : null;
}

function validateRevenue(entry, index, errors, seen, accounts, transactions, linkedTransactions) {
    const path = "/revenueEntries/" + index;
    if (!exactKeys(entry, REVENUE_KEYS, path, errors)) return;
    for (const field of ["revenueId", "transactionId", "revenueTypeId", "policyId", "assetAccountId", "revenueAccountId"]) {
        validIdentifier(entry[field], path + "/" + field, errors, false);
    }
    validNullableIdentifier(entry.sourceEntityId, path + "/sourceEntityId", errors);
    positiveInteger(entry.amount, path + "/amount", errors);
    validateTime(entry.occurredAt, path + "/occurredAt", errors);
    uniqueId(seen, entry.revenueId, path + "/revenueId", errors, "revenue");
    if (accountCategory(accounts, entry.assetAccountId) !== "ASSET" || accountCategory(accounts, entry.revenueAccountId) !== "REVENUE") {
        addError(errors, "E_REVENUE", path, "revenue must debit ASSET and credit REVENUE financial accounts");
    }
    const tx = transactions[entry.transactionId];
    if (!transactionMatches(tx, "REVENUE", entry.revenueId, entry.occurredAt, entry.assetAccountId, entry.revenueAccountId, entry.amount)) {
        addError(errors, "E_LINK", path + "/transactionId", "does not resolve to the matching balanced revenue transaction");
    } else linkedTransactions[entry.transactionId] = path;
}

function validateAuthorization(auth, index, errors, seen, accounts, debts) {
    const path = "/expenditureAuthorizations/" + index;
    if (!exactKeys(auth, AUTHORIZATION_KEYS, path, errors)) return;
    for (const field of ["authorizationId", "decisionId", "policyId", "authorizerOfficeId", "subjectId", "debitAccountId", "settlementAccountId"]) {
        validIdentifier(auth[field], path + "/" + field, errors, false);
    }
    uniqueId(seen, auth.authorizationId, path + "/authorizationId", errors, "authorization");
    uniqueId(seen, auth.decisionId, path + "/decisionId", errors, "decision");
    if (PURPOSE_TYPES.indexOf(auth.purposeType) < 0) addError(errors, "E_AUTH_DECISION", path + "/purposeType", "unknown authorization purpose");
    positiveInteger(auth.requestedAmount, path + "/requestedAmount", errors);
    nonNegativeInteger(auth.approvedAmount, path + "/approvedAmount", errors);
    nonNegativeInteger(auth.executedAmount, path + "/executedAmount", errors);
    if (AUTHORIZATION_STATUSES.indexOf(auth.status) < 0) addError(errors, "E_AUTH_DECISION", path + "/status", "unknown authorization status");
    validateTime(auth.decidedAt, path + "/decidedAt", errors);
    if (Number.isSafeInteger(auth.approvedAmount) && Number.isSafeInteger(auth.requestedAmount) && auth.approvedAmount > auth.requestedAmount) {
        addError(errors, "E_AUTH_DECISION", path + "/approvedAmount", "cannot exceed the requested amount");
    }
    if (auth.status === "DENIED" && (auth.approvedAmount !== 0 || auth.executedAmount !== 0)) {
        addError(errors, "E_AUTH_DECISION", path, "a denied authorization must approve and execute zero");
    }
    if (auth.status === "APPROVED" && (!(auth.approvedAmount > 0) || !(auth.executedAmount < auth.approvedAmount))) {
        addError(errors, "E_AUTH_DECISION", path, "an approved authorization needs positive unused authority");
    }
    if (auth.status === "EXHAUSTED" && (!(auth.approvedAmount > 0) || auth.executedAmount !== auth.approvedAmount)) {
        addError(errors, "E_AUTH_DECISION", path, "an exhausted authorization must be executed exactly to its approval");
    }
    if (accountCategory(accounts, auth.settlementAccountId) !== "ASSET") {
        addError(errors, "E_EXPENDITURE", path + "/settlementAccountId", "settlement must credit an ASSET financial account");
    }
    if (auth.purposeType === "GENERAL_EXPENDITURE" && accountCategory(accounts, auth.debitAccountId) !== "EXPENSE") {
        addError(errors, "E_EXPENDITURE", path + "/debitAccountId", "general expenditure must debit an EXPENSE financial account");
    }
    if (auth.purposeType === "DEBT_REPAYMENT") {
        const debt = debts[auth.subjectId];
        if (accountCategory(accounts, auth.debitAccountId) !== "LIABILITY") {
            addError(errors, "E_DEBT", path + "/debitAccountId", "debt repayment authority must debit a LIABILITY financial account");
        }
        if (!debt || debt.liabilityAccountId !== auth.debitAccountId) {
            addError(errors, "E_LINK", path + "/subjectId", "must name a debt using the authorized liability account");
        }
    }
}

function validateExecution(execution, index, errors, seen, authorizations, transactions, linkedTransactions) {
    const path = "/expenditureExecutions/" + index;
    if (!exactKeys(execution, EXECUTION_KEYS, path, errors)) return;
    for (const field of ["executionId", "authorizationId", "transactionId", "subjectId"]) {
        validIdentifier(execution[field], path + "/" + field, errors, false);
    }
    uniqueId(seen, execution.executionId, path + "/executionId", errors, "execution");
    if (PURPOSE_TYPES.indexOf(execution.operationType) < 0) addError(errors, "E_EXPENDITURE", path + "/operationType", "unknown execution operation");
    positiveInteger(execution.amount, path + "/amount", errors);
    validateTime(execution.executedAt, path + "/executedAt", errors);
    const auth = authorizations[execution.authorizationId];
    if (!auth || auth.status === "DENIED") {
        addError(errors, "E_UNAUTHORIZED", path + "/authorizationId", "execution has no non-denied authorization");
        return;
    }
    if (auth.purposeType !== execution.operationType || auth.subjectId !== execution.subjectId) {
        addError(errors, "E_EXPENDITURE", path, "execution is outside the authorization scope");
    }
    const kind = execution.operationType === "GENERAL_EXPENDITURE" ? "EXPENDITURE" : "DEBT_REPAYMENT";
    const tx = transactions[execution.transactionId];
    if (!transactionMatches(tx, kind, execution.executionId, execution.executedAt,
        auth.debitAccountId, auth.settlementAccountId, execution.amount)) {
        addError(errors, "E_LINK", path + "/transactionId", "does not resolve to the matching balanced execution transaction");
    } else linkedTransactions[execution.transactionId] = path;
}

function validateRepayment(repayment, debt, debtIndex, repaymentIndex, errors, seen, executions, authorizations, transactions) {
    const path = "/debts/" + debtIndex + "/repayments/" + repaymentIndex;
    if (!exactKeys(repayment, REPAYMENT_KEYS, path, errors)) return 0;
    for (const field of ["repaymentId", "executionId", "transactionId", "authorizationId"]) {
        validIdentifier(repayment[field], path + "/" + field, errors, false);
    }
    uniqueId(seen, repayment.repaymentId, path + "/repaymentId", errors, "repayment");
    positiveInteger(repayment.amount, path + "/amount", errors);
    validateTime(repayment.paidAt, path + "/paidAt", errors);
    const execution = executions[repayment.executionId];
    const auth = authorizations[repayment.authorizationId];
    const tx = transactions[repayment.transactionId];
    if (!execution || execution.operationType !== "DEBT_REPAYMENT" || execution.subjectId !== debt.debtId ||
        execution.authorizationId !== repayment.authorizationId || execution.transactionId !== repayment.transactionId ||
        execution.amount !== repayment.amount || !sameTime(execution.executedAt, repayment.paidAt)) {
        addError(errors, "E_DEBT_RECONCILIATION", path, "repayment does not match its debt-repayment execution");
    }
    if (!auth || auth.purposeType !== "DEBT_REPAYMENT" || auth.subjectId !== debt.debtId ||
        auth.debitAccountId !== debt.liabilityAccountId) {
        addError(errors, "E_LINK", path + "/authorizationId", "does not resolve to matching debt-repayment authority");
    }
    if (!transactionMatches(tx, "DEBT_REPAYMENT", repayment.executionId, repayment.paidAt,
        debt.liabilityAccountId, auth ? auth.settlementAccountId : "", repayment.amount)) {
        addError(errors, "E_DEBT_RECONCILIATION", path + "/transactionId", "does not match the debt principal reduction");
    }
    return Number.isSafeInteger(repayment.amount) ? repayment.amount : 0;
}

function validateDebt(debt, index, errors, seen, accounts, transactions, linkedTransactions,
    executions, authorizations, repaymentExecutions) {
    const path = "/debts/" + index;
    if (!exactKeys(debt, DEBT_KEYS, path, errors)) return;
    for (const field of ["debtId", "creditorEntityId", "liabilityAccountId", "proceedsAccountId", "policyId",
        "decisionId", "authorizerOfficeId", "issuanceTransactionId"]) {
        validIdentifier(debt[field], path + "/" + field, errors, false);
    }
    uniqueId(seen, debt.debtId, path + "/debtId", errors, "debt");
    uniqueId(seen, debt.decisionId, path + "/decisionId", errors, "decision");
    positiveInteger(debt.principalAmount, path + "/principalAmount", errors);
    nonNegativeInteger(debt.outstandingPrincipal, path + "/outstandingPrincipal", errors);
    if (DEBT_STATUSES.indexOf(debt.status) < 0) addError(errors, "E_DEBT_TRANSITION", path + "/status", "unknown debt status");
    validateTime(debt.authorizedAt, path + "/authorizedAt", errors);
    validateTime(debt.issuedAt, path + "/issuedAt", errors);
    if (debt.settledAt !== null) validateTime(debt.settledAt, path + "/settledAt", errors);
    if (!Array.isArray(debt.repayments)) addError(errors, "E_SHAPE", path + "/repayments", "must be an array");
    if (accountCategory(accounts, debt.liabilityAccountId) !== "LIABILITY" || accountCategory(accounts, debt.proceedsAccountId) !== "ASSET") {
        addError(errors, "E_DEBT", path, "debt issuance must debit ASSET proceeds and credit a LIABILITY account");
    }
    const issue = transactions[debt.issuanceTransactionId];
    if (!transactionMatches(issue, "DEBT_ISSUANCE", debt.debtId, debt.issuedAt,
        debt.proceedsAccountId, debt.liabilityAccountId, debt.principalAmount)) {
        addError(errors, "E_LINK", path + "/issuanceTransactionId", "does not resolve to the matching balanced debt issuance");
    } else linkedTransactions[debt.issuanceTransactionId] = path;

    let paid = 0;
    if (Array.isArray(debt.repayments)) {
        for (let i = 0; i < debt.repayments.length; i++) {
            const repayment = debt.repayments[i];
            paid = safeAdd(paid, validateRepayment(repayment, debt, index, i, errors, seen, executions,
                authorizations, transactions), "E_INTEGER", path + "/repayments", errors);
            if (repayment && typeof repayment.executionId === "string") {
                if (repaymentExecutions[repayment.executionId]) {
                    addError(errors, "E_DUPLICATE_ID", path + "/repayments/" + i + "/executionId", "execution already repays another debt");
                } else repaymentExecutions[repayment.executionId] = path + "/repayments/" + i;
            }
        }
    }
    if (Number.isSafeInteger(debt.principalAmount) && paid > debt.principalAmount) {
        addError(errors, "E_DEBT_RECONCILIATION", path + "/repayments", "repayments exceed issued principal");
    }
    const expectedOutstanding = Number.isSafeInteger(debt.principalAmount) ? debt.principalAmount - paid : null;
    if (expectedOutstanding !== null && debt.outstandingPrincipal !== expectedOutstanding) {
        addError(errors, "E_DEBT_RECONCILIATION", path + "/outstandingPrincipal", "does not equal principal minus repayments");
    }
    if (debt.status === "OPEN" && (!(debt.outstandingPrincipal > 0) || debt.settledAt !== null)) {
        addError(errors, "E_DEBT_TRANSITION", path, "OPEN debt needs positive outstanding principal and no settlement time");
    }
    if (debt.status === "SETTLED" && (debt.outstandingPrincipal !== 0 || debt.settledAt === null)) {
        addError(errors, "E_DEBT_TRANSITION", path, "SETTLED debt needs zero outstanding principal and an explicit settlement time");
    }
}

function replayAccounts(state, accounts, errors) {
    const totals = {};
    for (const id of Object.keys(accounts)) totals[id] = { debit: 0, credit: 0 };
    for (let ti = 0; ti < state.transactions.length; ti++) {
        const transaction = state.transactions[ti];
        if (!transaction || !Array.isArray(transaction.postings)) continue;
        for (let pi = 0; pi < transaction.postings.length; pi++) {
            const posting = transaction.postings[pi];
            if (!posting || !totals[posting.accountId] || !Number.isSafeInteger(posting.debit) || !Number.isSafeInteger(posting.credit)) continue;
            totals[posting.accountId].debit = safeAdd(totals[posting.accountId].debit, posting.debit,
                "E_INTEGER", "/transactions/" + ti + "/postings/" + pi + "/debit", errors);
            totals[posting.accountId].credit = safeAdd(totals[posting.accountId].credit, posting.credit,
                "E_INTEGER", "/transactions/" + ti + "/postings/" + pi + "/credit", errors);
        }
        for (const id of Object.keys(accounts)) {
            if (accounts[id].category !== "ASSET") continue;
            const balance = totals[id].debit - totals[id].credit;
            if (!Number.isSafeInteger(balance)) addError(errors, "E_INTEGER", "/transactions/" + ti, "asset balance overflow");
            else if (balance < 0) addError(errors, "E_INSUFFICIENT_FUNDS", "/transactions/" + ti,
                "transaction sequence creates an implicit negative asset balance in " + id);
        }
    }
    return totals;
}

function aggregateAccounts(accounts, replayed, errors) {
    const rows = {};
    const totals = { ASSET: 0, LIABILITY: 0, NET_POSITION: 0, REVENUE: 0, EXPENSE: 0 };
    const categorySafe = { ASSET: true, LIABILITY: true, NET_POSITION: true, REVENUE: true, EXPENSE: true };
    const ids = Object.keys(accounts).sort(compareCodeUnits);
    for (const id of ids) {
        const account = accounts[id];
        const replay = replayed[id] || { debit: 0, credit: 0 };
        const debitNormal = account.category === "ASSET" || account.category === "EXPENSE";
        const balance = debitNormal ? replay.debit - replay.credit : replay.credit - replay.debit;
        rows[id] = {
            accountId: id,
            category: account.category,
            debitTotal: replay.debit,
            creditTotal: replay.credit,
            balance: balance
        };
        if (!Number.isSafeInteger(balance)) {
            addError(errors, "E_INTEGER", "/transactions", "account balance for " + id + " would exceed the safe integer range");
            if (has(categorySafe, account.category)) categorySafe[account.category] = false;
            continue;
        }
        if (!has(totals, account.category) || !categorySafe[account.category]) continue;
        const aggregate = totals[account.category] + balance;
        if (!Number.isSafeInteger(aggregate)) {
            addError(errors, "E_INTEGER", "/transactions",
                "aggregate " + account.category + " balance would exceed the safe integer range");
            categorySafe[account.category] = false;
        } else totals[account.category] = aggregate;
    }

    let left = null;
    if (categorySafe.ASSET && categorySafe.EXPENSE) {
        const candidate = totals.ASSET + totals.EXPENSE;
        if (!Number.isSafeInteger(candidate)) {
            addError(errors, "E_INTEGER", "/transactions",
                "left accounting equation total would exceed the safe integer range");
        } else left = candidate;
    }

    let right = null;
    if (categorySafe.LIABILITY && categorySafe.NET_POSITION && categorySafe.REVENUE) {
        const liabilityAndNet = totals.LIABILITY + totals.NET_POSITION;
        const candidate = liabilityAndNet + totals.REVENUE;
        if (!Number.isSafeInteger(liabilityAndNet) || !Number.isSafeInteger(candidate)) {
            addError(errors, "E_INTEGER", "/transactions",
                "right accounting equation total would exceed the safe integer range");
        } else right = candidate;
    }

    return {
        rows: rows,
        accountIds: ids,
        totals: totals,
        equation: { left: left, right: right, balanced: left !== null && right !== null && left === right }
    };
}

function validate(state) {
    const errors = [];
    if (!exactKeys(state, STATE_KEYS, "", errors)) return { ok: false, errors: errors };
    if (state.schemaVersion !== SCHEMA_VERSION) addError(errors, "E_SCHEMA", "/schemaVersion", "must be " + SCHEMA_VERSION);
    validIdentifier(state.treasuryId, "/treasuryId", errors, false);
    validIdentifier(state.factionId, "/factionId", errors, false);
    validIdentifier(state.unitOfAccountId, "/unitOfAccountId", errors, false);
    for (const field of ["accounts", "transactions", "revenueEntries", "expenditureAuthorizations", "expenditureExecutions", "debts"]) {
        if (!Array.isArray(state[field])) addError(errors, "E_SHAPE", "/" + field, "must be an array");
    }
    if (!Array.isArray(state.accounts) || state.accounts.length < 1) addError(errors, "E_SHAPE", "/accounts", "must declare at least one financial account");
    if (["accounts", "transactions", "revenueEntries", "expenditureAuthorizations", "expenditureExecutions", "debts"]
        .some(function(field) { return !Array.isArray(state[field]); })) return { ok: false, errors: errors };

    const seen = {};
    const accounts = {};
    for (let i = 0; i < state.accounts.length; i++) {
        validateAccount(state.accounts[i], i, errors, seen);
        const account = state.accounts[i];
        if (account && typeof account.accountId === "string" && !accounts[account.accountId]) accounts[account.accountId] = account;
    }
    const transactions = {};
    for (let i = 0; i < state.transactions.length; i++) {
        validateTransaction(state.transactions[i], i, errors, seen, accounts);
        const tx = state.transactions[i];
        if (tx && typeof tx.transactionId === "string" && !transactions[tx.transactionId]) transactions[tx.transactionId] = tx;
    }
    const debts = {};
    for (let i = 0; i < state.debts.length; i++) {
        const debt = state.debts[i];
        if (debt && typeof debt.debtId === "string" && !debts[debt.debtId]) debts[debt.debtId] = debt;
    }
    const authorizations = {};
    for (let i = 0; i < state.expenditureAuthorizations.length; i++) {
        const auth = state.expenditureAuthorizations[i];
        if (auth && typeof auth.authorizationId === "string" && !authorizations[auth.authorizationId]) authorizations[auth.authorizationId] = auth;
    }
    const executions = {};
    for (let i = 0; i < state.expenditureExecutions.length; i++) {
        const execution = state.expenditureExecutions[i];
        if (execution && typeof execution.executionId === "string" && !executions[execution.executionId]) executions[execution.executionId] = execution;
    }

    const linkedTransactions = {};
    for (let i = 0; i < state.revenueEntries.length; i++) {
        validateRevenue(state.revenueEntries[i], i, errors, seen, accounts, transactions, linkedTransactions);
    }
    for (let i = 0; i < state.expenditureAuthorizations.length; i++) {
        validateAuthorization(state.expenditureAuthorizations[i], i, errors, seen, accounts, debts);
    }
    for (let i = 0; i < state.expenditureExecutions.length; i++) {
        validateExecution(state.expenditureExecutions[i], i, errors, seen, authorizations, transactions, linkedTransactions);
    }
    const repaymentExecutions = {};
    for (let i = 0; i < state.debts.length; i++) {
        validateDebt(state.debts[i], i, errors, seen, accounts, transactions, linkedTransactions,
            executions, authorizations, repaymentExecutions);
    }
    for (let i = 0; i < state.expenditureExecutions.length; i++) {
        const execution = state.expenditureExecutions[i];
        if (execution && execution.operationType === "DEBT_REPAYMENT" && !repaymentExecutions[execution.executionId]) {
            addError(errors, "E_DEBT_RECONCILIATION", "/expenditureExecutions/" + i,
                "debt-repayment execution is not present in a debt record");
        }
    }
    for (let i = 0; i < state.transactions.length; i++) {
        const tx = state.transactions[i];
        if (tx && typeof tx.transactionId === "string" && !linkedTransactions[tx.transactionId]) {
            addError(errors, "E_LINK", "/transactions/" + i, "transaction is not owned by a revenue, execution, or debt record");
        }
    }

    const executedByAuthorization = {};
    for (const execution of state.expenditureExecutions) {
        if (!execution || typeof execution.authorizationId !== "string" || !Number.isSafeInteger(execution.amount)) continue;
        executedByAuthorization[execution.authorizationId] = safeAdd(executedByAuthorization[execution.authorizationId] || 0,
            execution.amount, "E_INTEGER", "/expenditureExecutions", errors);
    }
    for (let i = 0; i < state.expenditureAuthorizations.length; i++) {
        const auth = state.expenditureAuthorizations[i];
        if (!auth || typeof auth.authorizationId !== "string") continue;
        const actual = executedByAuthorization[auth.authorizationId] || 0;
        if (auth.executedAmount !== actual) addError(errors, "E_AUTH_RECONCILIATION",
            "/expenditureAuthorizations/" + i + "/executedAmount", "does not equal linked executions");
        if (Number.isSafeInteger(auth.approvedAmount) && actual > auth.approvedAmount) addError(errors, "E_AUTH_LIMIT",
            "/expenditureAuthorizations/" + i, "linked executions exceed approved amount");
    }

    const replayed = replayAccounts(state, accounts, errors);
    aggregateAccounts(accounts, replayed, errors);
    return { ok: errors.length === 0, errors: errors };
}

function assertValid(state) {
    const result = validate(state);
    if (!result.ok) {
        const first = result.errors[0];
        throw treasuryError(first.code, first.path, first.message, result.errors);
    }
    return state;
}

function assertExactInput(value, keys, path) {
    const errors = [];
    exactKeys(value, keys, path, errors);
    if (errors.length) throw treasuryError(errors[0].code, errors[0].path, errors[0].message, errors);
}

function indexState(state) {
    const accounts = {};
    const authorizations = {};
    const debts = {};
    for (const account of state.accounts) accounts[account.accountId] = account;
    for (const auth of state.expenditureAuthorizations) authorizations[auth.authorizationId] = auth;
    for (const debt of state.debts) debts[debt.debtId] = debt;
    return { accounts: accounts, authorizations: authorizations, debts: debts };
}

function ensureUnused(state, namespace, id) {
    let used = false;
    if (namespace === "transaction") used = state.transactions.some(function(row) { return row.transactionId === id; });
    else if (namespace === "revenue") used = state.revenueEntries.some(function(row) { return row.revenueId === id; });
    else if (namespace === "authorization") used = state.expenditureAuthorizations.some(function(row) { return row.authorizationId === id; });
    else if (namespace === "execution") used = state.expenditureExecutions.some(function(row) { return row.executionId === id; });
    else if (namespace === "debt") used = state.debts.some(function(row) { return row.debtId === id; });
    else if (namespace === "repayment") used = state.debts.some(function(debt) {
        return debt.repayments.some(function(row) { return row.repaymentId === id; });
    });
    else if (namespace === "decision") {
        used = state.expenditureAuthorizations.some(function(row) { return row.decisionId === id; }) ||
            state.debts.some(function(row) { return row.decisionId === id; });
    }
    if (used) throw treasuryError("E_DUPLICATE_ID", "/" + namespace, namespace + " id " + id + " already exists");
}

function accountBalance(state, accountId) {
    let balance = 0;
    for (const transaction of state.transactions) for (const posting of transaction.postings) {
        if (posting.accountId !== accountId) continue;
        balance += posting.debit - posting.credit;
        if (!Number.isSafeInteger(balance)) throw treasuryError("E_INTEGER", "/transactions", "account balance overflow");
    }
    return balance;
}

function makeTransaction(transactionId, kind, sourceRecordId, occurredAt, debitAccountId, creditAccountId, amount) {
    return {
        transactionId: transactionId,
        kind: kind,
        sourceRecordId: sourceRecordId,
        occurredAt: clone(occurredAt),
        postings: expectedPostings(transactionId, debitAccountId, creditAccountId, amount)
    };
}

function finish(next) {
    assertValid(next);
    return deepFreeze(next);
}

function create(config) {
    assertExactInput(config, ["treasuryId", "factionId", "unitOfAccountId", "accounts"], "/config");
    const state = {
        schemaVersion: SCHEMA_VERSION,
        treasuryId: config.treasuryId,
        factionId: config.factionId,
        unitOfAccountId: config.unitOfAccountId,
        accounts: Array.isArray(config.accounts) ? clone(config.accounts).sort(function(a, b) {
            return compareCodeUnits(a.accountId, b.accountId);
        }) : config.accounts,
        transactions: [],
        revenueEntries: [],
        expenditureAuthorizations: [],
        expenditureExecutions: [],
        debts: []
    };
    return finish(state);
}

function recordRevenue(state, input) {
    assertValid(state);
    assertExactInput(input, REVENUE_KEYS, "/input");
    assertPositiveSafeInteger(input.amount, "/input/amount");
    ensureUnused(state, "revenue", input.revenueId);
    ensureUnused(state, "transaction", input.transactionId);
    const next = clone(state);
    next.revenueEntries.push(clone(input));
    next.transactions.push(makeTransaction(input.transactionId, "REVENUE", input.revenueId, input.occurredAt,
        input.assetAccountId, input.revenueAccountId, input.amount));
    return finish(next);
}

function authorizeExpenditure(state, request, decision) {
    assertValid(state);
    assertExactInput(request, ["authorizationId", "purposeType", "subjectId", "debitAccountId", "settlementAccountId", "requestedAmount"], "/request");
    assertExactInput(decision, ["decisionId", "policyId", "authorizerOfficeId", "authorized", "approvedAmount", "decidedAt"], "/decision");
    assertPositiveSafeInteger(request.requestedAmount, "/request/requestedAmount");
    assertNonNegativeSafeInteger(decision.approvedAmount, "/decision/approvedAmount");
    ensureUnused(state, "authorization", request.authorizationId);
    ensureUnused(state, "decision", decision.decisionId);
    if (typeof decision.authorized !== "boolean") throw treasuryError("E_AUTH_DECISION", "/decision/authorized", "must be a caller-supplied boolean policy result");
    if (decision.authorized && decision.approvedAmount < 1) {
        throw treasuryError("E_AUTH_DECISION", "/decision/approvedAmount", "an authorized decision needs a positive approval");
    }
    if (!decision.authorized && decision.approvedAmount !== 0) {
        throw treasuryError("E_AUTH_DECISION", "/decision/approvedAmount", "a denied decision must approve zero");
    }
    const auth = {
        authorizationId: request.authorizationId,
        decisionId: decision.decisionId,
        policyId: decision.policyId,
        authorizerOfficeId: decision.authorizerOfficeId,
        purposeType: request.purposeType,
        subjectId: request.subjectId,
        debitAccountId: request.debitAccountId,
        settlementAccountId: request.settlementAccountId,
        requestedAmount: request.requestedAmount,
        approvedAmount: decision.approvedAmount,
        executedAmount: 0,
        status: decision.authorized ? "APPROVED" : "DENIED",
        decidedAt: clone(decision.decidedAt)
    };
    const next = clone(state);
    next.expenditureAuthorizations.push(auth);
    return finish(next);
}

function executeExpenditure(state, input) {
    assertValid(state);
    assertExactInput(input, ["executionId", "authorizationId", "transactionId", "amount", "executedAt"], "/input");
    assertPositiveSafeInteger(input.amount, "/input/amount");
    ensureUnused(state, "execution", input.executionId);
    ensureUnused(state, "transaction", input.transactionId);
    const index = indexState(state);
    const auth = index.authorizations[input.authorizationId];
    if (!auth || auth.status === "DENIED" || auth.purposeType !== "GENERAL_EXPENDITURE") {
        throw treasuryError("E_UNAUTHORIZED", "/input/authorizationId", "general expenditure requires matching approved external authority");
    }
    if (input.amount > auth.approvedAmount - auth.executedAmount) {
        throw treasuryError("E_AUTH_LIMIT", "/input/amount", "execution exceeds remaining approved authority");
    }
    if (accountBalance(state, auth.settlementAccountId) < input.amount) {
        throw treasuryError("E_INSUFFICIENT_FUNDS", "/input/amount", "implicit overdraft is unavailable; issue explicit debt or supply funds first");
    }
    const next = clone(state);
    const nextAuth = next.expenditureAuthorizations.find(function(row) { return row.authorizationId === auth.authorizationId; });
    nextAuth.executedAmount += input.amount;
    nextAuth.status = nextAuth.executedAmount === nextAuth.approvedAmount ? "EXHAUSTED" : "APPROVED";
    next.expenditureExecutions.push({
        executionId: input.executionId,
        authorizationId: input.authorizationId,
        transactionId: input.transactionId,
        operationType: "GENERAL_EXPENDITURE",
        subjectId: auth.subjectId,
        amount: input.amount,
        executedAt: clone(input.executedAt)
    });
    next.transactions.push(makeTransaction(input.transactionId, "EXPENDITURE", input.executionId, input.executedAt,
        auth.debitAccountId, auth.settlementAccountId, input.amount));
    return finish(next);
}

function issueDebt(state, terms, decision) {
    assertValid(state);
    assertExactInput(terms, ["debtId", "transactionId", "creditorEntityId", "liabilityAccountId", "proceedsAccountId", "principalAmount", "issuedAt"], "/terms");
    assertExactInput(decision, ["decisionId", "policyId", "authorizerOfficeId", "authorized", "approvedPrincipalAmount", "decidedAt"], "/decision");
    assertPositiveSafeInteger(terms.principalAmount, "/terms/principalAmount");
    assertNonNegativeSafeInteger(decision.approvedPrincipalAmount, "/decision/approvedPrincipalAmount");
    ensureUnused(state, "debt", terms.debtId);
    ensureUnused(state, "transaction", terms.transactionId);
    ensureUnused(state, "decision", decision.decisionId);
    if (decision.authorized !== true || decision.approvedPrincipalAmount !== terms.principalAmount) {
        throw treasuryError("E_UNAUTHORIZED", "/decision", "debt issuance needs an affirmative caller policy decision for the exact principal");
    }
    const next = clone(state);
    next.debts.push({
        debtId: terms.debtId,
        creditorEntityId: terms.creditorEntityId,
        liabilityAccountId: terms.liabilityAccountId,
        proceedsAccountId: terms.proceedsAccountId,
        principalAmount: terms.principalAmount,
        outstandingPrincipal: terms.principalAmount,
        status: "OPEN",
        policyId: decision.policyId,
        decisionId: decision.decisionId,
        authorizerOfficeId: decision.authorizerOfficeId,
        authorizedAt: clone(decision.decidedAt),
        issuanceTransactionId: terms.transactionId,
        issuedAt: clone(terms.issuedAt),
        settledAt: null,
        repayments: []
    });
    next.transactions.push(makeTransaction(terms.transactionId, "DEBT_ISSUANCE", terms.debtId, terms.issuedAt,
        terms.proceedsAccountId, terms.liabilityAccountId, terms.principalAmount));
    return finish(next);
}

function repayDebt(state, input) {
    assertValid(state);
    assertExactInput(input, ["repaymentId", "executionId", "authorizationId", "transactionId", "debtId", "amount", "paidAt"], "/input");
    assertPositiveSafeInteger(input.amount, "/input/amount");
    ensureUnused(state, "repayment", input.repaymentId);
    ensureUnused(state, "execution", input.executionId);
    ensureUnused(state, "transaction", input.transactionId);
    const index = indexState(state);
    const debt = index.debts[input.debtId];
    if (!debt || debt.status !== "OPEN" || debt.outstandingPrincipal < 1) {
        throw treasuryError("E_DEBT_TRANSITION", "/input/debtId", "only an OPEN debt with outstanding principal can be repaid");
    }
    const auth = index.authorizations[input.authorizationId];
    if (!auth || auth.status === "DENIED" || auth.purposeType !== "DEBT_REPAYMENT" || auth.subjectId !== debt.debtId ||
        auth.debitAccountId !== debt.liabilityAccountId) {
        throw treasuryError("E_UNAUTHORIZED", "/input/authorizationId", "debt repayment requires matching approved external authority");
    }
    if (input.amount > debt.outstandingPrincipal) {
        throw treasuryError("E_DEBT_TRANSITION", "/input/amount", "repayment cannot exceed outstanding principal");
    }
    if (input.amount > auth.approvedAmount - auth.executedAmount) {
        throw treasuryError("E_AUTH_LIMIT", "/input/amount", "repayment exceeds remaining approved authority");
    }
    if (accountBalance(state, auth.settlementAccountId) < input.amount) {
        throw treasuryError("E_INSUFFICIENT_FUNDS", "/input/amount", "implicit overdraft is unavailable for debt repayment");
    }
    const next = clone(state);
    const nextAuth = next.expenditureAuthorizations.find(function(row) { return row.authorizationId === auth.authorizationId; });
    nextAuth.executedAmount += input.amount;
    nextAuth.status = nextAuth.executedAmount === nextAuth.approvedAmount ? "EXHAUSTED" : "APPROVED";
    const nextDebt = next.debts.find(function(row) { return row.debtId === debt.debtId; });
    nextDebt.outstandingPrincipal -= input.amount;
    nextDebt.repayments.push({
        repaymentId: input.repaymentId,
        executionId: input.executionId,
        transactionId: input.transactionId,
        authorizationId: input.authorizationId,
        amount: input.amount,
        paidAt: clone(input.paidAt)
    });
    if (nextDebt.outstandingPrincipal === 0) {
        nextDebt.status = "SETTLED";
        nextDebt.settledAt = clone(input.paidAt);
    }
    next.expenditureExecutions.push({
        executionId: input.executionId,
        authorizationId: input.authorizationId,
        transactionId: input.transactionId,
        operationType: "DEBT_REPAYMENT",
        subjectId: debt.debtId,
        amount: input.amount,
        executedAt: clone(input.paidAt)
    });
    next.transactions.push(makeTransaction(input.transactionId, "DEBT_REPAYMENT", input.executionId, input.paidAt,
        debt.liabilityAccountId, auth.settlementAccountId, input.amount));
    return finish(next);
}

function balanceSheet(state) {
    assertValid(state);
    const accounts = {};
    for (const account of state.accounts) accounts[account.accountId] = account;
    const errors = [];
    const replayed = replayAccounts(state, accounts, errors);
    const derived = aggregateAccounts(accounts, replayed, errors);
    if (errors.length) {
        const first = errors[0];
        throw treasuryError(first.code, first.path, first.message, errors);
    }
    return deepFreeze({
        schemaVersion: SCHEMA_VERSION,
        treasuryId: state.treasuryId,
        factionId: state.factionId,
        unitOfAccountId: state.unitOfAccountId,
        transactionCount: state.transactions.length,
        accounts: derived.accountIds.map(function(id) { return derived.rows[id]; }),
        totals: derived.totals,
        equation: derived.equation
    });
}

function audit(state) {
    const result = validate(state);
    if (!result.ok) return deepFreeze({ ok: false, errors: clone(result.errors), balanceSheet: null });
    const sheet = balanceSheet(state);
    return deepFreeze({ ok: sheet.equation.balanced, errors: [], balanceSheet: sheet });
}

function serialize(state) {
    assertValid(state);
    return canonical(state);
}

function deserialize(value) {
    let parsed = value;
    if (typeof value === "string") {
        try { parsed = JSON.parse(value); }
        catch (error) { throw treasuryError("E_SHAPE", "", "treasury JSON did not parse"); }
    }
    assertValid(parsed);
    return deepFreeze(clone(parsed));
}

module.exports = Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION,
    MAX_SAFE_AMOUNT: MAX,
    ACCOUNT_CATEGORIES: ACCOUNT_CATEGORIES,
    TIME_DOMAINS: TIME_DOMAINS,
    TRANSACTION_KINDS: TRANSACTION_KINDS,
    PURPOSE_TYPES: PURPOSE_TYPES,
    VALIDATION_RULES: VALIDATION_RULES,
    create: create,
    validate: validate,
    recordRevenue: recordRevenue,
    authorizeExpenditure: authorizeExpenditure,
    executeExpenditure: executeExpenditure,
    issueDebt: issueDebt,
    repayDebt: repayDebt,
    balanceSheet: balanceSheet,
    audit: audit,
    serialize: serialize,
    deserialize: deserialize
});
