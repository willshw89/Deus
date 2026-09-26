#!/usr/bin/env node
"use strict";

/**
 * tools/security/scan_secrets.js
 *
 * OPS.70.02 (Lane Z): secrets scanner for docs/SECURITY_AND_SECRETS.md sections 2 and 5.
 *
 * It reads only content git tracks: blobs of the HEAD tree (git ls-tree + git cat-file), the staged
 * diff (git diff --cached), the patches of a commit range (git log -p), or one tracked file inside
 * the repository (--path). It never opens anything outside the repository.
 *
 * A matched value is never printed, logged or stored. Output shows file:line, the rule id, the first
 * REDACT_KEEP characters of the match and its length ("AIza... (39 chars)"). The allowlist and the
 * --json output carry a sha256 of the matched line, never the line (for a CREDENTIAL_FILE finding,
 * the sha256 of the path). Only a value the baseline already names is shown by its fingerprint (the
 * sha256 of the value).
 *
 * Usage:
 *   node tools/security/scan_secrets.js                   every file tracked at HEAD
 *   node tools/security/scan_secrets.js --staged          added lines of git diff --cached (for a
 *                                                          future pre-commit hook, OPS.30.03)
 *   node tools/security/scan_secrets.js --range <a>..<b>  added lines of every commit in a..b, plus
 *                                                          their commit messages; for a merge commit,
 *                                                          the lines that are new against every parent
 *   node tools/security/scan_secrets.js --path <file>     one tracked file, as it is in the working tree
 *   options: --json               one JSON document on stdout instead of text lines
 *            --allowlist <file>   default tools/security/secrets_allowlist.json under the repository
 *                                 root (a missing default file is an empty allowlist)
 *            --baseline <file>    default tools/security/secrets_baseline.json (same rule when missing):
 *                                 known historical values, applied in --range scans only (see below)
 *
 * Files with a listed binary extension are skipped unread and counted. A file with NUL bytes (UTF-16
 * text, an unlisted binary) is scanned with its NUL bytes removed and listed as NUL_FILE. Every file
 * name is checked too (credential file names, and values used as path segments; line 0).
 * Allowlist entries are { path, rule, lineSha256, reason }; a finding that matches one is reported
 * as ALLOWED. An entry that matches nothing in a scan that read its whole file (default mode: every
 * entry except <commit-message> ones; --path: entries for that path) is STALE and fails the run.
 * A value shorter than REDACT_MIN_LEN_FOR_PREFIX characters is shown by its length only, and its
 * line sha256 is left out of the output.
 * Baseline entries (section "Baseline" below) turn a finding into BASELINED only in the history
 * before the commit that removed the value.
 *
 * Exit: 0 clean, 1 findings or stale allowlist / baseline entries, 2 usage or git error.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const DEFAULT_ALLOWLIST = "tools/security/secrets_allowlist.json";
const ALLOWLIST_SCHEMA = "deus.secrets_allowlist.v1";
const DEFAULT_BASELINE = "tools/security/secrets_baseline.json";
const BASELINE_SCHEMA = "deus.secrets_baseline.v1";
const REDACT_KEEP = 4;
const MAX_BUFFER = 1024 * 1024 * 1024;
const COMMIT_MESSAGE_PATH = "<commit-message>";

// High-entropy detector (policy section 5, line 52). A candidate is a run of base64 / base64url
// characters of ENTROPY_MIN_LEN..ENTROPY_MAX_LEN (longer runs are data blobs, not credentials).
// Mixed runs (upper, lower and digit all present) are a finding at ENTROPY_MIN_BITS bits per
// character or more. Pure hex runs (commit hashes, sha256 sums, colours) are only a finding when
// they are the value of a credential-named assignment (ENTROPY_CONTEXT, looked for in the
// ENTROPY_CONTEXT_WINDOW characters before the run) and reach ENTROPY_HEX_MIN_BITS.
// False-positive tuning (escalation.md: 176 of 184 first-run hits were file paths or URLs, 3 were
// base64 alphabet tables):
//   - "/" separates path and URL segments. A run containing "/" is judged per "/"-free segment,
//     except that it is judged whole when it shows a sign of base64 that paths lack ("+", or "="
//     padding) or when it is the value of a credential-named assignment.
//   - A run holding ENTROPY_SEQ_RUN or more consecutive ascending characters ("ABCDEF", "012345")
//     is an alphabet or lookup table, not a generated value.
//   - A run longer than ENTROPY_MAX_LEN (before any "/" split) is a data blob, such as an inline
//     base64 image, and is skipped whole.
// A short run (ENTROPY_MIN_LEN..ENTROPY_SHORT_MAX_LEN) of letters and digits only, the common
// API-key shape, needs ENTROPY_SHORT_MIN_BITS: at 32 characters even random text rarely reaches
// 4.5 bits. Identifiers of that length carry "_" or "-" and keep the 4.5 threshold. (Measured on
// HEAD and all history: no new hit.)
const ENTROPY_MIN_LEN = 32;
const ENTROPY_MAX_LEN = 256;
const ENTROPY_MIN_BITS = 4.5;
const ENTROPY_SHORT_MAX_LEN = 47;
const ENTROPY_SHORT_MIN_BITS = 4.2;
const ENTROPY_HEX_MIN_BITS = 3.0;
const ENTROPY_SEQ_RUN = 6;
const ENTROPY_CONTEXT_WINDOW = 60;
const ENTROPY_TOKEN_RE = new RegExp("[A-Za-z0-9+/_-]{" + ENTROPY_MIN_LEN + ",}={0,2}", "g");
const ENTROPY_CONTEXT = /(?:secret|passw(?:or)?d|pwd|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|credential|auth)[\w.-]*["']?\s*[:=]\s*["']?$/i;

// Credential-named assignment (runs after the entropy detector, on spans nothing else took): a
// value of ASSIGN_MIN_LEN+ characters with letters and digits and at least ASSIGN_MIN_BITS, given
// to a name such as password / api_key / client_secret / GEMINI_KEY. This catches the lowercase or
// short generated values the entropy detector cannot see. "author..." is not "auth"; a bare
// "<X>_KEY" name counts only in upper case (GEMINI_KEY, not cache_key).
const ASSIGN_MIN_LEN = 16;
const ASSIGN_MIN_BITS = 3.0;
const ASSIGN_RE = /(secret|passw(?:or)?d|passwd|pwd|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|credential|auth(?!or)|[a-z0-9]_key\b)[\w.-]*["']?\s*[:=]\s*["']?([A-Za-z0-9+\/_.=~-]+)/dgi;

// Redaction: a value shorter than REDACT_MIN_LEN_FOR_PREFIX shows no characters at all, and its
// line's sha256 is withheld from the output (a short value could be recovered from a known line).
const REDACT_MIN_LEN_FOR_PREFIX = 16;

// Skipped without reading (their bytes are image, audio, font, archive or engine binary formats).
const BINARY_EXTENSIONS = new Set([
    "png", "jpg", "jpeg", "gif", "bmp", "webp", "ico", "tga", "psd", "ogg", "m4a", "mp3", "wav",
    "mp4", "webm", "wasm", "woff", "woff2", "ttf", "otf", "eot", "exe", "dll", "zip", "7z", "gz",
    "rar", "pdf", "efkefc", "efkmodel", "efkmat", "rmmzsave", "rpgsave"
]);

function hasUpper(s) { return /[A-Z]/.test(s); }
function hasLower(s) { return /[a-z]/.test(s); }
function hasDigit(s) { return /[0-9]/.test(s); }
function hasLetter(s) { return /[A-Za-z]/.test(s); }
// A provider-key body counts only when it looks generated: upper, lower and digit all present.
// Policy text such as "sk-..." or a kebab-case identifier after "sk-" does not.
function generatedBody(s) { return hasUpper(s) && hasLower(s) && hasDigit(s); }
function notPlaceholder(v) { return !/^[<$%{*.\[(]/.test(v) && !/^x+$/i.test(v); }

// Content rules, in priority order: a later rule never reports a span an earlier rule already took.
// Each rule's `value` is the part that is redacted; `source` is the policy line it implements.
const RULES = [
    {
        id: "PRIVATE_KEY_PEM", source: "docs/SECURITY_AND_SECRETS.md:23 (private SSH keys)",
        re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/dg, group: 0
    },
    {
        id: "ANTHROPIC_KEY", source: "docs/SECURITY_AND_SECRETS.md:21 (Anthropic sk-ant-...)",
        re: /\bsk-ant-[A-Za-z0-9]{2,12}-([A-Za-z0-9_-]{32,})/dg, group: 0, body: 1, ok: generatedBody
    },
    {
        id: "OPENAI_KEY", source: "docs/SECURITY_AND_SECRETS.md:21,53 (OpenAI sk-...)",
        re: /\bsk-(?!ant-)(?:[a-z]{2,10}-)?([A-Za-z0-9_-]{32,})/dg, group: 0, body: 1, ok: generatedBody
    },
    {
        id: "GOOGLE_API_KEY", source: "docs/SECURITY_AND_SECRETS.md:21,53 (Google AI AIza...)",
        re: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/dg, group: 0
    },
    {
        id: "GOOGLE_OAUTH_TOKEN", source: "docs/SECURITY_AND_SECRETS.md:22,34 (OAuth access/refresh tokens; Gemini auth)",
        re: /(?:\bya29\.|(?<![A-Za-z0-9_\/-])1\/\/0)([0-9A-Za-z_-]{30,})/dg, group: 0, body: 1, ok: generatedBody
    },
    {
        id: "XAI_KEY", source: "docs/SECURITY_AND_SECRETS.md:21,53 (xAI xai-...)",
        re: /\bxai-([A-Za-z0-9_-]{32,})/dg, group: 0, body: 1, ok: generatedBody
    },
    {
        id: "GITHUB_TOKEN", source: "git-host token (REPORT.md: rule justification)",
        re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,251}|github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})(?![A-Za-z0-9_])/dg, group: 0
    },
    {
        id: "GITLAB_TOKEN", source: "git-host token (REPORT.md: rule justification)",
        re: /\bglpat-[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_-])/dg, group: 0
    },
    {
        id: "JWT", source: "docs/SECURITY_AND_SECRETS.md:22 (JWT tokens)",
        re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/dg, group: 0
    },
    {
        id: "NETRC_PASSWORD", source: "docs/SECURITY_AND_SECRETS.md:23 (.netrc entries)",
        re: /\b(?:machine\s+\S+|default)\s+(?:login\s+\S+\s+)?(?:account\s+\S+\s+)?password\s+([^\s"'`]{4,})/dg, group: 1,
        ok: notPlaceholder
    },
    {
        id: "SESSION_COOKIE", source: "docs/SECURITY_AND_SECRETS.md:24 (session cookies)",
        re: /\b(?:set-)?cookie\s*[:=]\s*["']?[^\r\n]*?\b[\w.-]*(?:sess|sid|token|auth|jwt|login)[\w.-]*=([A-Za-z0-9%._~+\/-]{16,})/dgi, group: 1,
        ok: v => hasDigit(v) && hasLetter(v)
    },
    {
        id: "BEARER_TOKEN", source: "docs/SECURITY_AND_SECRETS.md:22,53 (Bearer tokens, 'bearer')",
        re: /\bbearer\s+([A-Za-z0-9._~+\/-]{20,}=*)/dgi, group: 1,
        ok: v => hasDigit(v) && hasLetter(v)
    }
];
const ENTROPY_RULE = { id: "HIGH_ENTROPY", source: "docs/SECURITY_AND_SECRETS.md:52 (high-entropy strings)" };
const ASSIGN_RULE = { id: "CREDENTIAL_ASSIGNMENT", source: "docs/SECURITY_AND_SECRETS.md:12,52 (passwords and private credentials; high-entropy strings)" };
const CREDENTIAL_FILE_RULE = { id: "CREDENTIAL_FILE", source: "docs/SECURITY_AND_SECRETS.md:36,54 (.env and credential files stay untracked)" };
// Tracked file names that hold credentials (basename, case-insensitive).
const CREDENTIAL_FILE_RE = /^(?:\.env(?:\..+)?|.+\.pem|id_(?:rsa|dsa|ecdsa|ed25519)(?:[._-].*)?|[._]netrc|credentials\.json|\.claude\.json|\.git-credentials|oauth_creds\.json|.+\.p12|.+\.pfx)$/i;
const RULE_IDS = new Set(RULES.map(r => r.id).concat([ENTROPY_RULE.id, ASSIGN_RULE.id, CREDENTIAL_FILE_RULE.id]));

class UsageError extends Error {}

// ---------------------------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------------------------

function shannonBits(s) {
    const counts = new Map();
    for (const ch of s) counts.set(ch, (counts.get(ch) || 0) + 1);
    let h = 0;
    for (const n of counts.values()) { const p = n / s.length; h -= p * Math.log2(p); }
    return h;
}

function overlaps(taken, a, b) {
    for (const [s, e] of taken) if (a < e && s < b) return true;
    return false;
}

function hasSequentialRun(s, n) {
    let run = 1;
    for (let i = 1; i < s.length; i++) {
        run = s.charCodeAt(i) === s.charCodeAt(i - 1) + 1 ? run + 1 : 1;
        if (run >= n) return true;
    }
    return false;
}

function entropyHits(line, taken) {
    const hits = [];
    ENTROPY_TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = ENTROPY_TOKEN_RE.exec(line)) !== null) {
        const padded = m[0].endsWith("=");
        const tok = m[0].replace(/=+$/, "");
        if (tok.length > ENTROPY_MAX_LEN) continue;
        const context = ENTROPY_CONTEXT.test(line.slice(Math.max(0, m.index - ENTROPY_CONTEXT_WINDOW), m.index));
        const candidates = [];
        if (!tok.includes("/") || padded || tok.includes("+") || context) candidates.push([m.index, tok]);
        else {
            let off = m.index;
            for (const seg of tok.split("/")) { candidates.push([off, seg]); off += seg.length + 1; }
        }
        for (const [start, value] of candidates) {
            const end = start + value.length;
            if (value.length < ENTROPY_MIN_LEN || value.length > ENTROPY_MAX_LEN) continue;
            if (overlaps(taken, start, end)) continue;
            if (hasSequentialRun(value, ENTROPY_SEQ_RUN)) continue;
            const bits = shannonBits(value);
            if (/^[0-9a-fA-F]+$/.test(value)) {
                if (bits < ENTROPY_HEX_MIN_BITS || !context) continue;
            } else {
                if (!(hasUpper(value) && hasLower(value) && hasDigit(value))) continue;
                const short = value.length <= ENTROPY_SHORT_MAX_LEN && /^[A-Za-z0-9]+$/.test(value);
                if (bits < (short ? ENTROPY_SHORT_MIN_BITS : ENTROPY_MIN_BITS)) continue;
            }
            hits.push({ rule: ENTROPY_RULE.id, start, end, value, bits: Math.round(bits * 100) / 100 });
        }
    }
    return hits;
}

function assignmentHits(line, taken) {
    const hits = [];
    ASSIGN_RE.lastIndex = 0;
    let m;
    while ((m = ASSIGN_RE.exec(line)) !== null) {
        if (/^[a-z0-9]_key$/i.test(m[1]) && !/^[A-Z0-9]_KEY$/.test(m[1])) continue;
        const [start, end] = m.indices[2];
        const value = m[2];
        if (value.length < ASSIGN_MIN_LEN || !hasLetter(value) || !hasDigit(value)) continue;
        if (overlaps(taken, start, end) || hasSequentialRun(value, ENTROPY_SEQ_RUN) || shannonBits(value) < ASSIGN_MIN_BITS) continue;
        hits.push({ rule: ASSIGN_RULE.id, start, end, value });
    }
    return hits;
}

// Every secret on one line. Returns [{ rule, start, end, value, bits? }].
function scanLine(line) {
    const hits = [];
    const taken = [];
    for (const rule of RULES) {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(line)) !== null) {
            if (m[0].length === 0) { rule.re.lastIndex++; continue; }
            const [start, end] = m.indices[rule.group];
            const value = m[rule.group];
            const checked = rule.body !== undefined ? m[rule.body] : value;
            if (rule.ok && !rule.ok(checked)) continue;
            if (overlaps(taken, start, end)) continue;
            taken.push([start, end]);
            hits.push({ rule: rule.id, start, end, value });
        }
    }
    for (const h of entropyHits(line, taken)) { taken.push([h.start, h.end]); hits.push(h); }
    for (const h of assignmentHits(line, taken)) { taken.push([h.start, h.end]); hits.push(h); }
    return hits;
}

// A path that holds a value (a value used as a file or folder name) is printed with that value
// redacted, like any other match: "keys/[Ab12... (40 chars)].txt".
function displayPath(p, hits) {
    if (hits.length === 0) return p;
    let out = "", at = 0;
    for (const h of hits.slice().sort((a, b) => a.start - b.start)) {
        if (h.start < at) continue;
        out += p.slice(at, h.start) + "[" + redact(h.value) + "]";
        at = h.end;
    }
    return out + p.slice(at);
}

function credentialFileHit(p) {
    return CREDENTIAL_FILE_RE.test(p.split("/").pop());
}

function redact(value) {
    if (value.length < REDACT_MIN_LEN_FOR_PREFIX) return "... (" + value.length + " chars)";
    return value.slice(0, REDACT_KEEP) + "... (" + value.length + " chars)";
}

function sha256(s) {
    return crypto.createHash("sha256").update(Buffer.from(s, "latin1")).digest("hex");
}

function isBinaryPath(p) {
    const base = p.split("/").pop();
    const dot = base.lastIndexOf(".");
    return dot > 0 && BINARY_EXTENSIONS.has(base.slice(dot + 1).toLowerCase());
}

// ---------------------------------------------------------------------------------------------
// Git access (tracked content only)
// ---------------------------------------------------------------------------------------------

function git(cwd, args, input) {
    const r = spawnSync("git", ["-c", "core.quotePath=true"].concat(args), {
        cwd, input, maxBuffer: MAX_BUFFER, windowsHide: true
    });
    if (r.error) throw new UsageError("git " + args[0] + ": " + r.error.message);
    if (r.status !== 0) {
        const msg = (r.stderr || Buffer.alloc(0)).toString("utf8").trim().split("\n")[0];
        throw new UsageError("git " + args.join(" ") + " exited " + r.status + (msg ? ": " + msg : ""));
    }
    return r.stdout;
}

function repoRoot(cwd) {
    return git(cwd, ["rev-parse", "--show-toplevel"]).toString("utf8").trim();
}

// Entries of the HEAD tree: [{ mode, type, sha, path }].
function headTree(root, rev = "HEAD") {
    const out = git(root, ["ls-tree", "-r", "-z", "--full-tree", "--end-of-options", rev]).toString("utf8");
    const entries = [];
    for (const rec of out.split("\0")) {
        if (!rec) continue;
        const tab = rec.indexOf("\t");
        const [mode, type, sha] = rec.slice(0, tab).split(" ");
        entries.push({ mode, type, sha, path: rec.slice(tab + 1) });
    }
    return entries;
}

// Blob contents by sha, one git cat-file --batch process.
function readBlobs(root, shas) {
    const map = new Map();
    if (shas.length === 0) return map;
    const out = git(root, ["cat-file", "--batch"], shas.join("\n") + "\n");
    let pos = 0;
    while (pos < out.length) {
        const nl = out.indexOf(10, pos);
        if (nl < 0) break;
        const header = out.subarray(pos, nl).toString("utf8").split(" ");
        pos = nl + 1;
        if (header[1] === "missing" || header.length < 3) throw new UsageError("git cat-file: object " + header[0] + " missing");
        const size = Number(header[2]);
        map.set(header[0], out.subarray(pos, pos + size));
        pos += size + 1;
    }
    return map;
}

// C-style quoted path as git prints it with core.quotePath=true.
function unquoteC(s) {
    const bytes = [];
    for (let i = 1; i < s.length - 1; i++) {
        const c = s[i];
        if (c !== "\\") { bytes.push(c.charCodeAt(0) & 0xff); continue; }
        const n = s[++i];
        if (/[0-7]/.test(n)) { bytes.push(parseInt(s.substr(i, 3), 8)); i += 2; continue; }
        const esc = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '"': 34, "\\": 92 }[n];
        bytes.push(esc === undefined ? n.charCodeAt(0) : esc);
    }
    return Buffer.from(bytes).toString("utf8");
}

function readQuoted(s, from) {
    let i = from + 1;
    while (i < s.length && s[i] !== '"') i += s[i] === "\\" ? 2 : 1;
    return { text: s.slice(from, i + 1), next: i + 1 };
}

// Path from "diff --git a/X b/X" (renames are off, so both sides are the same path).
function gitHeaderPath(rest) {
    if (rest.startsWith('"')) {
        const second = rest.slice(readQuoted(rest, 0).next + 1);
        const p = second.startsWith('"') ? unquoteC(second) : second;
        return p.replace(/^b\//, "");
    }
    const half = (rest.length - 5) / 2;
    if (Number.isInteger(half) && rest.startsWith("a/") && rest.slice(2 + half, 5 + half) === " b/") return rest.slice(5 + half);
    return rest.slice(rest.lastIndexOf(" b/") + 3);
}

// Parse git diff / git log -p output (with --text, -U0, --no-renames) into files with added lines.
// A commit marker line "\x01<sha>" precedes each commit's patch in range mode.
// The buffer is split line by line (a whole history patch can be larger than the biggest string V8
// allows).
function* bufferLines(buf) {
    let pos = 0;
    while (pos < buf.length) {
        let nl = buf.indexOf(10, pos);
        if (nl < 0) nl = buf.length;
        yield buf.toString("latin1", pos, nl);
        pos = nl + 1;
    }
}

function parsePatch(buf) {
    const files = [];
    let commit = null, cur = null, hunk = null;
    for (const raw of bufferLines(buf)) {
        if (raw.startsWith("\x01")) { commit = raw.slice(1).trim(); cur = null; hunk = null; continue; }
        if (raw.startsWith("diff --git ") || raw.startsWith("diff --cc ") || raw.startsWith("diff --combined ")) {
            let p;
            if (raw.startsWith("diff --git ")) p = gitHeaderPath(raw.slice(11));
            else { const rest = raw.slice(raw.indexOf(" ", 5) + 1); p = rest.startsWith('"') ? unquoteC(rest) : rest; }
            cur = { commit, path: p, deleted: false, added: [], nul: false };
            files.push(cur);
            hunk = null;
            continue;
        }
        if (!cur) continue;
        const hm = /^(@{2,}) (.*?) \1/.exec(raw);
        if (hm) {
            const plus = /\+(\d+)/.exec(hm[2]);
            hunk = { parents: hm[1].length - 1, next: plus ? Number(plus[1]) : 1 };
            continue;
        }
        if (!hunk) {
            if (raw.startsWith("deleted file mode")) cur.deleted = true;
            continue;
        }
        const prefix = raw.slice(0, hunk.parents);
        if (prefix.length < hunk.parents || /[^ +-]/.test(prefix)) {
            if (!raw.startsWith("\\")) hunk = null;       // "\ No newline at end of file" stays in the hunk
            continue;
        }
        if (prefix.includes("-")) continue;               // removed line: not in the result
        const text = raw.slice(hunk.parents).replace(/\r$/, "");
        if (/^\++$/.test(prefix)) {
            if (text.includes("\0")) cur.nul = true;
            cur.added.push({ no: hunk.next, text });
        }
        hunk.next++;
    }
    return files;
}

// ---------------------------------------------------------------------------------------------
// Scan modes. Each returns { units: [{ commit, path, lines: [{no, text}] | null, binary }], full }
// where lines === null marks a file whose content was not read, and `full` lists paths whose whole
// content was scanned (for allowlist staleness).
// ---------------------------------------------------------------------------------------------

function splitLines(text) {
    return text.split("\n").map((t, i) => ({ no: i + 1, text: t.replace(/\r$/, "") }));
}

// A file with NUL bytes (UTF-16 text, or a binary without a listed extension) is still read: its NUL
// bytes are removed and the rest is scanned, so a value inside it is not hidden. It is counted as a
// NUL file. Files with a listed binary extension are skipped unread.
function textUnit(base, buf) {
    const text = buf.toString("latin1");
    if (!text.includes("\0")) return Object.assign(base, { binary: null, lines: splitLines(text) });
    return Object.assign(base, { binary: "nul", lines: splitLines(text.replace(/\0/g, "")) });
}

function collectHead(root, rev = "HEAD") {
    const entries = headTree(root, rev).filter(e => e.type === "blob");
    const units = [];
    const wanted = entries.filter(e => !isBinaryPath(e.path));
    const blobs = readBlobs(root, [...new Set(wanted.map(e => e.sha))]);
    for (const e of entries) {
        if (isBinaryPath(e.path)) { units.push({ path: e.path, binary: "extension", lines: null }); continue; }
        units.push(textUnit({ path: e.path }, blobs.get(e.sha)));
    }
    return { units, full: "all" };
}

const DIFF_FLAGS = ["--no-color", "--no-ext-diff", "--no-textconv", "--no-renames", "--text", "-U0",
                    "--src-prefix=a/", "--dst-prefix=b/"];

function unitsFromPatch(files) {
    const units = [];
    for (const f of files) {
        if (f.deleted) continue;
        if (isBinaryPath(f.path)) units.push({ commit: f.commit, path: f.path, binary: "extension", lines: null });
        else if (f.nul) units.push({ commit: f.commit, path: f.path, binary: "nul", lines: f.added.map(l => ({ no: l.no, text: l.text.replace(/\0/g, "") })) });
        else units.push({ commit: f.commit, path: f.path, binary: null, lines: f.added });
    }
    return units;
}

function collectStaged(root) {
    return { units: unitsFromPatch(parsePatch(git(root, ["diff", "--cached"].concat(DIFF_FLAGS, ["--"])))), full: [] };
}

// Commits of a range are read RANGE_BATCH at a time, so one git output never has to hold the patch
// of a whole history.
const RANGE_BATCH = 64;

function collectRange(root, range) {
    const m = /^([^.\s][^\s]*?)\.\.(\.?)([^.\s][^\s]*)$/.exec(range || "");
    if (!m || range.startsWith("-")) throw new UsageError("--range needs <a>..<b>");
    for (const rev of [m[1], m[3]]) git(root, ["rev-parse", "--verify", "--quiet", "--end-of-options", rev + "^{commit}"]);
    const commits = git(root, ["rev-list", "--end-of-options", range, "--"]).toString("utf8").split("\n").filter(Boolean);
    function* units() {
        for (let i = 0; i < commits.length; i += RANGE_BATCH) {
            const batch = commits.slice(i, i + RANGE_BATCH);
            const patch = git(root, ["log", "--no-walk=unsorted", "--root", "-p", "--cc", "--format=%x01%H"].concat(DIFF_FLAGS, ["--end-of-options"], batch, ["--"]));
            yield* unitsFromPatch(parsePatch(patch));
            // Commit messages are history too (policy section 1): scan them as a pseudo-file per
            // commit. -z ends each record with a NUL byte, which a commit message cannot contain.
            const msgs = git(root, ["log", "--no-walk=unsorted", "-z", "--format=%H%n%B", "--end-of-options"].concat(batch, ["--"])).toString("latin1");
            for (const rec of msgs.split("\0")) {
                const nl = rec.indexOf("\n");
                if (nl !== 40) continue;
                yield { commit: rec.slice(0, 40), path: COMMIT_MESSAGE_PATH, binary: null, lines: splitLines(rec.slice(nl + 1)) };
            }
        }
    }
    return { units: units(), full: [], commits };
}

function collectPath(root, cwd, p) {
    if (!p) throw new UsageError("--path needs a file");
    const abs = path.resolve(cwd, p);
    let real, realRoot;
    try { real = fs.realpathSync(abs); realRoot = fs.realpathSync(root); } catch (e) { throw new UsageError("--path: cannot resolve " + p); }
    const rel = path.relative(realRoot, real);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) throw new UsageError("--path: " + p + " is outside the repository");
    const relPosix = rel.split(path.sep).join("/");
    const tracked = git(root, ["ls-files", "-z", "--full-name", "--", ":(literal)" + relPosix]).toString("utf8").split("\0").filter(Boolean);
    if (!tracked.includes(relPosix)) throw new UsageError("--path: " + relPosix + " is not tracked by git");
    if (!fs.statSync(real).isFile()) throw new UsageError("--path: " + relPosix + " is not a file");
    if (isBinaryPath(relPosix)) return { units: [{ path: relPosix, binary: "extension", lines: null }], full: [relPosix] };
    return { units: [textUnit({ path: relPosix }, fs.readFileSync(real))], full: [relPosix] };
}

// ---------------------------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------------------------

function loadAllowlist(file, explicit) {
    if (!fs.existsSync(file)) {
        if (explicit) throw new UsageError("allowlist not found: " + file);
        return [];
    }
    let doc;
    try { doc = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); } catch (e) { throw new UsageError("allowlist " + file + ": " + e.message); }
    if (!doc || doc.schema !== ALLOWLIST_SCHEMA || !Array.isArray(doc.entries)) {
        throw new UsageError("allowlist " + file + ": expected { \"schema\": \"" + ALLOWLIST_SCHEMA + "\", \"entries\": [...] }");
    }
    const seen = new Set();
    doc.entries.forEach((e, i) => {
        const where = "allowlist entry " + i + ": ";
        if (!e || typeof e !== "object" || Array.isArray(e)) throw new UsageError(where + "not an object");
        const keys = Object.keys(e).sort().join(",");
        if (keys !== "lineSha256,path,reason,rule") throw new UsageError(where + "needs exactly path, rule, lineSha256, reason");
        if (typeof e.path !== "string" || !e.path) throw new UsageError(where + "path must be a non-empty string");
        if (!RULE_IDS.has(e.rule)) throw new UsageError(where + "unknown rule " + JSON.stringify(e.rule));
        if (typeof e.lineSha256 !== "string" || !/^[0-9a-f]{64}$/.test(e.lineSha256)) throw new UsageError(where + "lineSha256 must be 64 lowercase hex characters");
        if (typeof e.reason !== "string" || e.reason.trim().length < 10) throw new UsageError(where + "reason must say why (10+ characters)");
        const key = e.path + "\0" + e.rule + "\0" + e.lineSha256;
        if (seen.has(key)) throw new UsageError(where + "duplicate of an earlier entry");
        seen.add(key);
    });
    return doc.entries;
}

// ---------------------------------------------------------------------------------------------
// Baseline of known, accepted historical findings (BRIEF_RESUME1 item 1)
//
// Entries are { fingerprint, rule, incident, onlyInHistoryBefore, addedIn, reason }. `fingerprint`
// is the sha256 of the matched value (never the value). A finding with that fingerprint and rule is
// BASELINED only in a --range scan and only in a commit that is a strict ancestor of
// `onlyInHistoryBefore` (the commit that removed the value). Anywhere else (HEAD, --staged, --path, a
// commit that is not such an ancestor) it stays a finding: a revoked value added again is new.
// `addedIn` lists the commits that added the value. A range scan that includes one of them must
// baseline the entry there; if it does not, the entry is STALE and fails the run.
// ---------------------------------------------------------------------------------------------

function loadBaseline(file, explicit) {
    if (!fs.existsSync(file)) {
        if (explicit) throw new UsageError("baseline not found: " + file);
        return [];
    }
    let doc;
    try { doc = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\s+/, "")); } catch (e) { throw new UsageError("baseline " + file + ": " + e.message); }
    if (!doc || doc.schema !== BASELINE_SCHEMA || !Array.isArray(doc.entries)) {
        throw new UsageError("baseline " + file + ": expected { \"schema\": \"" + BASELINE_SCHEMA + "\", \"entries\": [...] }");
    }
    const seen = new Set();
    const isSha = v => typeof v === "string" && /^[0-9a-f]{40}$/.test(v);
    doc.entries.forEach((e, i) => {
        const where = "baseline entry " + i + ": ";
        if (!e || typeof e !== "object" || Array.isArray(e)) throw new UsageError(where + "not an object");
        const keys = Object.keys(e).sort().join(",");
        if (keys !== "addedIn,fingerprint,incident,onlyInHistoryBefore,reason,rule") {
            throw new UsageError(where + "needs exactly fingerprint, rule, incident, onlyInHistoryBefore, addedIn, reason");
        }
        if (typeof e.fingerprint !== "string" || !/^[0-9a-f]{64}$/.test(e.fingerprint)) throw new UsageError(where + "fingerprint must be 64 lowercase hex characters (sha256 of the value)");
        if (!RULE_IDS.has(e.rule)) throw new UsageError(where + "unknown rule " + JSON.stringify(e.rule));
        if (typeof e.incident !== "string" || !e.incident.trim()) throw new UsageError(where + "incident must name the incident record");
        if (!isSha(e.onlyInHistoryBefore)) throw new UsageError(where + "onlyInHistoryBefore must be a full 40-character commit sha");
        if (!Array.isArray(e.addedIn) || e.addedIn.length === 0 || !e.addedIn.every(isSha) || new Set(e.addedIn).size !== e.addedIn.length) {
            throw new UsageError(where + "addedIn must be a non-empty list of distinct full commit shas");
        }
        if (e.addedIn.includes(e.onlyInHistoryBefore)) throw new UsageError(where + "addedIn cannot name onlyInHistoryBefore itself");
        if (typeof e.reason !== "string" || e.reason.trim().length < 10) throw new UsageError(where + "reason must say why (10+ characters)");
        const key = e.fingerprint + "\0" + e.rule;
        if (seen.has(key)) throw new UsageError(where + "duplicate of an earlier entry");
        seen.add(key);
    });
    return doc.entries;
}

// Strict ancestry, cached: is `commit` in the history before `fix`?
function ancestryChecker(root) {
    const cache = new Map();
    return (commit, fix) => {
        if (!commit || commit === fix) return false;
        const key = commit + " " + fix;
        if (!cache.has(key)) {
            const r = spawnSync("git", ["merge-base", "--is-ancestor", commit, fix], { cwd: root, windowsHide: true });
            if (r.error || (r.status !== 0 && r.status !== 1)) {
                throw new UsageError("git merge-base --is-ancestor " + commit.slice(0, 12) + " " + fix.slice(0, 12) + " failed" +
                                     (r.stderr && r.stderr.length ? ": " + r.stderr.toString("utf8").trim().split("\n")[0] : ""));
            }
            cache.set(key, r.status === 0);
        }
        return cache.get(key);
    };
}

// Range mode only. Returns { active, inactive }.
//   - An entry whose commits are not all in this clone (a shallow clone) is inactive: it baselines
//     nothing, so every occurrence of its value fails, and unrelated scans still run.
//   - Every addedIn commit must be in the history before onlyInHistoryBefore, and the tree of
//     onlyInHistoryBefore must no longer hold the value (it is the commit that removed it; a wrong
//     sha there would widen the scope). Otherwise the baseline is wrong: exit 2.
function checkBaselineCommits(root, entries, isBefore) {
    const active = [], inactive = [];
    entries.forEach((e, i) => {
        const missing = [e.onlyInHistoryBefore].concat(e.addedIn).filter(c =>
            spawnSync("git", ["cat-file", "-e", c + "^{commit}"], { cwd: root, windowsHide: true }).status !== 0);
        if (missing.length) { inactive.push(Object.assign(e, { missing })); return; }
        for (const c of e.addedIn) {
            if (!isBefore(c, e.onlyInHistoryBefore)) {
                throw new UsageError("baseline entry " + i + ": addedIn " + c.slice(0, 12) + " is not in the history before " + e.onlyInHistoryBefore.slice(0, 12));
            }
        }
        active.push(e);
    });
    for (const fix of new Set(active.map(e => e.onlyInHistoryBefore))) {
        const wanted = active.filter(e => e.onlyInHistoryBefore === fix);
        for (const u of collectHead(root, fix).units) {
            if (u.lines === null) continue;
            for (const ln of u.lines) {
                for (const h of scanLine(ln.text)) {
                    const fp = sha256(h.value);
                    const e = wanted.find(x => x.fingerprint === fp && x.rule === h.rule);
                    if (e) {
                        throw new UsageError("baseline entry " + entries.indexOf(e) + ": the tree of onlyInHistoryBefore " + fix.slice(0, 12) +
                                             " still holds the value (" + u.path + ":" + ln.no + "), so that commit did not remove it");
                    }
                }
            }
        }
    }
    return { active, inactive };
}

// ---------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
    const o = { mode: "head", json: false, allowlist: null, baseline: null, range: null, path: null };
    const setMode = m => { if (o.mode !== "head") throw new UsageError("choose one of --staged, --range, --path"); o.mode = m; };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--json") o.json = true;
        else if (a === "--staged") setMode("staged");
        else if (a === "--range") { setMode("range"); o.range = argv[++i]; if (o.range === undefined) throw new UsageError("--range needs <a>..<b>"); }
        else if (a === "--path") { setMode("path"); o.path = argv[++i]; if (o.path === undefined) throw new UsageError("--path needs a file"); }
        else if (a === "--allowlist") { o.allowlist = argv[++i]; if (o.allowlist === undefined) throw new UsageError("--allowlist needs a file"); }
        else if (a === "--baseline") { o.baseline = argv[++i]; if (o.baseline === undefined) throw new UsageError("--baseline needs a file"); }
        else if (a === "-h" || a === "--help") o.help = true;
        else throw new UsageError("unknown argument " + JSON.stringify(a));
    }
    return o;
}

// `baseline` is { entries, isBefore } in range mode and null in every other mode (no baseline there).
function scan(collected, allowEntries, baseline) {
    const findings = [], allowed = [], baselined = [], skipped = [], nulFiles = [];
    const baseEntries = baseline ? baseline.entries : [];
    let scanned = 0;
    for (const u of collected.units) {
        const hits = [];
        // The file name is checked whether or not the content is read: a credential file name
        // (binary .p12 / .pfx included) and a value used as a path segment are findings (line 0).
        const nameHits = u.path === COMMIT_MESSAGE_PATH ? [] : scanLine(u.path);
        const shown = displayPath(u.path, nameHits);
        if (u.path !== COMMIT_MESSAGE_PATH) {
            if (credentialFileHit(u.path)) hits.push({ line: 0, rule: CREDENTIAL_FILE_RULE.id, value: null, lineSha256: sha256(u.path) });
            for (const h of nameHits) hits.push({ line: 0, rule: h.rule, value: h.value, bits: h.bits, lineSha256: sha256(u.path) });
        }
        if (u.lines === null) skipped.push({ path: shown, commit: u.commit || null, reason: u.binary });
        else {
            scanned++;
            if (u.binary === "nul") nulFiles.push({ path: shown, commit: u.commit || null });
            for (const ln of u.lines) {
                for (const h of scanLine(ln.text)) {
                    hits.push({ line: ln.no, rule: h.rule, value: h.value, bits: h.bits, lineSha256: sha256(ln.text) });
                }
            }
        }
        for (const h of hits) {
            const short = h.value !== null && h.value.length < REDACT_MIN_LEN_FOR_PREFIX;
            const rec = {
                commit: u.commit || null, path: shown, line: h.line, rule: h.rule,
                redacted: h.value === null ? "(tracked credential file name)" : redact(h.value),
                length: h.value === null ? 0 : h.value.length, lineSha256: short ? null : h.lineSha256
            };
            if (h.bits !== undefined) rec.bits = h.bits;
            // The baseline is checked first: it is scoped to history, the allowlist is not.
            const fp = h.value === null ? null : sha256(h.value);
            const base = fp === null ? undefined : baseEntries.find(e => e.fingerprint === fp && e.rule === rec.rule);
            if (base && baseline.isBefore(rec.commit, base.onlyInHistoryBefore)) {
                base.matchedIn.add(rec.commit);
                Object.assign(rec, { fingerprint: fp, incident: base.incident, reason: base.reason });
                baselined.push(rec);
                continue;
            }
            const entry = allowEntries.find(e => e.path === u.path && e.rule === rec.rule && e.lineSha256 === h.lineSha256);
            if (entry) { entry.used = true; rec.reason = entry.reason; allowed.push(rec); continue; }
            // Out of scope: say so, so a re-added revoked value is recognisable. A fingerprint is only
            // ever printed for a value the baseline already names.
            if (base) Object.assign(rec, { fingerprint: fp, baselineOutOfScope: base.incident, onlyInHistoryBefore: base.onlyInHistoryBefore });
            findings.push(rec);
        }
    }
    // Staleness is judged only for entries whose file the scan read in full. A HEAD scan reads no
    // commit messages, so it never judges <commit-message> entries.
    const fullSet = collected.full === "all" ? null : new Set(collected.full);
    const stale = allowEntries.filter(e => !e.used && (fullSet === null ? e.path !== COMMIT_MESSAGE_PATH : fullSet.has(e.path)))
        .map(e => ({ path: e.path, rule: e.rule, lineSha256: e.lineSha256, reason: e.reason }));
    // A range scan that includes an addedIn commit must have baselined the entry in that commit.
    const scannedCommits = new Set(collected.commits || []);
    const staleBaseline = [];
    for (const e of baseEntries) {
        const missed = e.addedIn.filter(c => scannedCommits.has(c) && !e.matchedIn.has(c));
        if (missed.length) staleBaseline.push({ fingerprint: e.fingerprint, rule: e.rule, incident: e.incident, missedIn: missed, reason: e.reason });
    }
    const order = (a, b) => (a.commit || "").localeCompare(b.commit || "") || a.path.localeCompare(b.path) || a.line - b.line || a.rule.localeCompare(b.rule);
    findings.sort(order); allowed.sort(order); baselined.sort(order);
    return { scanned, skipped, nulFiles, findings, allowed, baselined, stale, staleBaseline };
}

function where(r) {
    return (r.commit ? r.commit.slice(0, 12) + " " : "") + r.path + ":" + r.line;
}

function main(argv, cwd = process.cwd()) {
    const out = s => process.stdout.write(s + "\n");
    let o;
    try {
        o = parseArgs(argv);
        if (o.help) { out("usage: node tools/security/scan_secrets.js [--staged | --range <a>..<b> | --path <file>] [--json] [--allowlist <file>] [--baseline <file>]"); return 0; }
        const root = repoRoot(cwd);
        const allowFile = o.allowlist ? path.resolve(cwd, o.allowlist) : path.join(root, DEFAULT_ALLOWLIST);
        const entries = loadAllowlist(allowFile, !!o.allowlist).map(e => Object.assign({}, e, { used: false }));
        const baseFile = o.baseline ? path.resolve(cwd, o.baseline) : path.join(root, DEFAULT_BASELINE);
        const baseEntries = loadBaseline(baseFile, !!o.baseline).map(e => Object.assign({}, e, { matchedIn: new Set() }));
        let baseline = null, inactive = [];
        if (o.mode === "range") {
            const isBefore = ancestryChecker(root);
            const checked = checkBaselineCommits(root, baseEntries, isBefore);
            baseline = { entries: checked.active, isBefore };
            inactive = checked.inactive;
        }
        const collected = o.mode === "staged" ? collectStaged(root)
            : o.mode === "range" ? collectRange(root, o.range)
            : o.mode === "path" ? collectPath(root, cwd, o.path)
            : collectHead(root);
        const r = scan(collected, entries, baseline);
        const code = r.findings.length || r.stale.length || r.staleBaseline.length ? 1 : 0;
        if (o.json) {
            out(JSON.stringify({
                tool: "scan_secrets", schema: "deus.scan_secrets.v1", mode: o.mode, range: o.range, filesScanned: r.scanned,
                binarySkipped: r.skipped.length, skipped: r.skipped, nulFiles: r.nulFiles, findings: r.findings, allowed: r.allowed,
                baselined: r.baselined, staleAllowlist: r.stale, staleBaseline: r.staleBaseline,
                baselineInactive: inactive.map(e => ({ fingerprint: e.fingerprint, rule: e.rule, incident: e.incident, missing: e.missing })), exitCode: code
            }, null, 2));
            return code;
        }
        for (const f of r.findings) {
            out("FINDING " + where(f) + " " + f.rule + " " + f.redacted + (f.bits !== undefined ? " entropy=" + f.bits : "") +
                (f.baselineOutOfScope ? " (fingerprint " + f.fingerprint.slice(0, 12) + " is baselined for " + f.baselineOutOfScope +
                 " only in the history before " + f.onlyInHistoryBefore.slice(0, 12) + ")" : ""));
        }
        for (const a of r.allowed) out("ALLOWED " + where(a) + " " + a.rule + " " + a.redacted + " reason: " + a.reason);
        for (const b of r.baselined) out("BASELINED " + where(b) + " " + b.rule + " " + b.redacted + " fingerprint=" + b.fingerprint.slice(0, 12) + " incident: " + b.incident);
        for (const s of r.stale) out("STALE_ALLOWLIST " + s.path + " " + s.rule + " lineSha256=" + s.lineSha256.slice(0, 12) + " (matches nothing) reason: " + s.reason);
        for (const s of r.staleBaseline) {
            out("STALE_BASELINE fingerprint=" + s.fingerprint.slice(0, 12) + " " + s.rule + " incident: " + s.incident +
                " (not found in addedIn commit " + s.missedIn.map(c => c.slice(0, 12)).join(", ") + ")");
        }
        for (const e of inactive) {
            out("BASELINE_INACTIVE fingerprint=" + e.fingerprint.slice(0, 12) + " " + e.rule + " incident: " + e.incident +
                " (commit " + e.missing.map(c => c.slice(0, 12)).join(", ") + " not in this clone: the value is not baselined here)");
        }
        for (const s of r.nulFiles) out("NUL_FILE " + (s.commit ? s.commit.slice(0, 12) + " " : "") + s.path + " (NUL bytes removed before scanning)");
        out("RESULT: " + r.scanned + " files scanned (" + r.nulFiles.length + " with NUL bytes), " + r.skipped.length + " binary skipped, " +
            r.findings.length + " findings, " + r.allowed.length + " allowed, " + r.baselined.length + " baselined, " +
            r.stale.length + " stale allowlist entries, " + r.staleBaseline.length + " stale baseline entries");
        return code;
    } catch (e) {
        if (!(e instanceof UsageError)) throw e;
        process.stderr.write("scan_secrets: " + e.message + "\n");
        if (o && o.json) out(JSON.stringify({ tool: "scan_secrets", error: e.message, exitCode: 2 }));
        return 2;
    }
}

module.exports = { main, scanLine, shannonBits, redact, credentialFileHit, isBinaryPath, parsePatch, sha256, RULES, ENTROPY_RULE, ASSIGN_RULE, CREDENTIAL_FILE_RULE,
                   ENTROPY_MIN_LEN, ENTROPY_MAX_LEN, ENTROPY_MIN_BITS, ENTROPY_SHORT_MAX_LEN, ENTROPY_SHORT_MIN_BITS, ENTROPY_HEX_MIN_BITS, ENTROPY_SEQ_RUN,
                   ASSIGN_MIN_LEN, REDACT_KEEP, REDACT_MIN_LEN_FOR_PREFIX };

if (require.main === module) {
    try { process.exitCode = main(process.argv.slice(2)); } catch (e) { process.stderr.write("scan_secrets: internal error: " + (e && e.stack || e) + "\n"); process.exitCode = 2; }
}
