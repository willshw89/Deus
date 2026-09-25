/**
 * DEUS Unified Provider Usage Telemetry Monitor
 * Authoritative local capacity monitor across all DEUS AI providers.
 * Outputs machine-readable status to docs/agents/PROVIDER_USAGE_STATUS.json
 * and prints human-readable dashboard.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const STATUS_JSON_PATH = path.join(REPO_ROOT, 'docs', 'agents', 'PROVIDER_USAGE_STATUS.json');

// Ensure docs/agents directory exists
const agentsDir = path.join(REPO_ROOT, 'docs', 'agents');
if (!fs.existsSync(agentsDir)) {
  fs.mkdirSync(agentsDir, { recursive: true });
}

function probeGemini() {
  const result = {
    provider: 'Gemini / Antigravity',
    runtime: 'Antigravity CLI (agy)',
    plan: 'Google Developer / Antigravity',
    state: 'AVAILABLE',
    remainingFiveHourPct: null,
    remainingWeeklyPct: null,
    fiveHourReset: null,
    weeklyReset: null,
    creditBalance: null,
    bankedResets: null,
    sessionTokensUsed: 0,
    sessionCost: null,
    source: 'agy -p /usage --output-format json',
    precision: 'EXACT_PROVIDER',
    lastChecked: new Date().toISOString()
  };

  try {
    const agyPath = 'C:\\Users\\snewt\\.gemini\\bin\\agy.exe';
    if (fs.existsSync(agyPath)) {
      const stdout = execSync(`"${agyPath}" -p "/usage" --output-format json`, { encoding: 'utf8', timeout: 8000 });
      const data = JSON.parse(stdout);
      if (data && data.command && data.command.data && data.command.data.groups) {
        for (const g of data.command.data.groups) {
          if (g.name === 'Gemini Models') {
            for (const b of g.buckets || []) {
              if (b.window === '5h') {
                result.remainingFiveHourPct = Math.round(b.remaining_fraction * 1000) / 10;
                result.fiveHourReset = b.reset_time;
              } else if (b.window === 'weekly') {
                result.remainingWeeklyPct = Math.round(b.remaining_fraction * 1000) / 10;
                result.weeklyReset = b.reset_time;
              }
            }
          }
        }
      }
    } else {
      result.state = 'NOT_CONFIGURED';
      result.precision = 'UNAVAILABLE';
    }
  } catch (e) {
    result.state = 'AVAILABLE';
    result.precision = 'PROVIDER_STATE_ONLY';
  }

  return result;
}

function probeClaude() {
  const result = {
    provider: 'Claude / Fable',
    runtime: 'Claude Code CLI (npm-global)',
    plan: 'Claude Max (20x rate-limit tier)',
    state: 'AVAILABLE',
    remainingFiveHourPct: null,
    remainingWeeklyPct: null,
    fiveHourReset: null,
    weeklyReset: null,
    creditBalance: null,
    bankedResets: null,
    sessionTokensUsed: 0,
    sessionCost: null,
    source: '~/.claude.json + project session logs',
    precision: 'PROVIDER_STATE_ONLY',
    lastChecked: new Date().toISOString()
  };

  try {
    const claudeJsonPath = 'C:\\Users\\snewt\\.claude.json';
    if (fs.existsSync(claudeJsonPath)) {
      const c = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8'));
      if (c.oauthAccount) {
        result.plan = `Claude Max (${c.oauthAccount.organizationRateLimitTier || '20x tier'})`;
      }
    }

    // Inspect active session token telemetry
    const projectDir = 'C:\\Users\\snewt\\.claude\\projects\\c--Users-snewt-OneDrive-Desktop-UF';
    if (fs.existsSync(projectDir)) {
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
      for (const f of files) {
        const stat = fs.statSync(path.join(projectDir, f));
        // Rough estimate of active session size in tokens (~4 chars per token)
        result.sessionTokensUsed += Math.round(stat.size / 4);
      }
    }
  } catch (e) {
    result.state = 'UNKNOWN';
  }

  return result;
}

function probeGrok() {
  const result = {
    provider: 'Grok',
    runtime: 'Grok Build CLI (v1.0.41)',
    plan: 'Supergrok / Grok.com',
    state: 'AVAILABLE',
    remainingFiveHourPct: null,
    remainingWeeklyPct: null,
    fiveHourReset: null,
    weeklyReset: null,
    creditBalance: null,
    bankedResets: null,
    sessionTokensUsed: 0,
    sessionCostUsd: 0,
    source: 'grok usage <session-id>',
    precision: 'SESSION_ONLY',
    lastChecked: new Date().toISOString()
  };

  try {
    // Read completed session IDs from sessions directory
    const sessionsDir = 'C:\\Users\\snewt\\.grok\\sessions\\C%3A%5CUsers%5Csnewt%5COneDrive%5CDesktop%5CUF';
    if (fs.existsSync(sessionsDir)) {
      const sids = fs.readdirSync(sessionsDir).filter(f => f.startsWith('01a0'));
      for (const sid of sids) {
        const usageFile = path.join(sessionsDir, sid, 'usage.json');
        if (fs.existsSync(usageFile)) {
          try {
            const u = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
            if (u.session) {
              result.sessionTokensUsed += (u.session.totalTokens || 0);
              result.sessionCostUsd += (u.session.costUsdTicks || 0) / 10000000000;
            }
          } catch (e2) {}
        }
      }
      result.sessionCostUsd = Math.round(result.sessionCostUsd * 10000) / 10000;
    }
  } catch (e) {
    result.state = 'UNKNOWN';
  }

  return result;
}

function probeCodex() {
  return {
    provider: 'OpenAI Codex / Astra',
    runtime: 'Codex CLI / Astra',
    plan: 'ChatGPT / Codex Subscription',
    state: 'EXHAUSTED',
    remainingFiveHourPct: 0,
    remainingWeeklyPct: 0,
    fiveHourReset: null,
    weeklyReset: null,
    creditBalance: null,
    bankedResets: null,
    sessionTokensUsed: 0,
    sessionCost: null,
    source: 'Owner Verification & CLI Discovery',
    precision: 'PROVIDER_STATE_ONLY',
    lastChecked: new Date().toISOString(),
    note: 'Account holds access; current period exhausted. Standby for quota reset.'
  };
}

function formatDuration(isoTime) {
  if (!isoTime) return '--';
  const target = new Date(isoTime);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'NOW';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) return `${days}d ${remHours}h`;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function calculateBurnPriority(telemetry) {
  // BURN_PRIORITY = remaining capacity / time to reset (higher = burn faster)
  const priorities = {};
  for (const [key, p] of Object.entries(telemetry)) {
    if (p.state === 'EXHAUSTED' || p.state === 'OFFLINE' || p.state === 'NOT_CONFIGURED') {
      priorities[key] = { score: 0, recommendation: 'DO_NOT_ROUTE (Quota Exhausted or Offline)' };
      continue;
    }
    if (p.remainingFiveHourPct !== null && p.fiveHourReset) {
      const remPct = p.remainingFiveHourPct;
      const target = new Date(p.fiveHourReset).getTime();
      const hoursLeft = Math.max(0.1, (target - Date.now()) / (1000 * 60 * 60));
      const burnScore = Math.round((remPct / hoursLeft) * 10) / 10;
      priorities[key] = {
        score: burnScore,
        recommendation: burnScore > 20 ? 'AGGRESSIVE_ROUTING (Substantial quota expiring soon)' : 'STEADY_ROUTING'
      };
    } else {
      priorities[key] = {
        score: 50.0,
        recommendation: 'ACTIVE_AVAILABLE (Saturate with substantive work)'
      };
    }
  }
  return priorities;
}

function main() {
  const telemetry = {
    gemini: probeGemini(),
    claude: probeClaude(),
    grok: probeGrok(),
    codex: probeCodex()
  };

  const burnPriorities = calculateBurnPriority(telemetry);

  const payload = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    governingStandard: 'docs/AGENT_UTILIZATION_POLICY.md',
    providers: telemetry,
    burnPriorities: burnPriorities
  };

  fs.writeFileSync(STATUS_JSON_PATH, JSON.stringify(payload, null, 2), 'utf8');

  // Print Human-Readable Dashboard
  console.log('DEUS AI CAPACITY');
  console.log('============================================================');
  console.log(
    'Provider'.padEnd(14) +
    '5h Left'.padEnd(10) +
    'Weekly Left'.padEnd(14) +
    'Reset'.padEnd(16) +
    'State'
  );
  console.log('------------------------------------------------------------');

  const g = telemetry.gemini;
  const g5h = g.remainingFiveHourPct !== null ? `${g.remainingFiveHourPct}%` : '--';
  const gWk = g.remainingWeeklyPct !== null ? `${g.remainingWeeklyPct}%` : '--';
  const gRst = `${formatDuration(g.fiveHourReset)} / ${formatDuration(g.weeklyReset)}`;
  console.log('Gemini'.padEnd(14) + g5h.padEnd(10) + gWk.padEnd(14) + gRst.padEnd(16) + g.state);

  const c = telemetry.claude;
  const c5h = c.remainingFiveHourPct !== null ? `${c.remainingFiveHourPct}%` : '--';
  const cWk = c.remainingWeeklyPct !== null ? `${c.remainingWeeklyPct}%` : '-- (20x tier)';
  const cRst = formatDuration(c.fiveHourReset);
  console.log('Claude (Max)'.padEnd(14) + c5h.padEnd(10) + cWk.padEnd(14) + cRst.padEnd(16) + c.state);

  const gr = telemetry.grok;
  const gr5h = gr.remainingFiveHourPct !== null ? `${gr.remainingFiveHourPct}%` : '--';
  const grWk = gr.remainingWeeklyPct !== null ? `${gr.remainingWeeklyPct}%` : '--';
  const grRst = formatDuration(gr.weeklyReset);
  console.log('Grok'.padEnd(14) + gr5h.padEnd(10) + grWk.padEnd(14) + grRst.padEnd(16) + gr.state);

  const cx = telemetry.codex;
  const cx5h = cx.remainingFiveHourPct !== null ? `${cx.remainingFiveHourPct}%` : '0%';
  const cxWk = cx.remainingWeeklyPct !== null ? `${cx.remainingWeeklyPct}%` : '0%';
  const cxRst = formatDuration(cx.fiveHourReset);
  console.log('Codex/Astra'.padEnd(14) + cx5h.padEnd(10) + cxWk.padEnd(14) + cxRst.padEnd(16) + cx.state);

  console.log('============================================================');
  console.log('CURRENT DEUS SESSION CONSUMPTION');
  console.log(`- Claude: ~${c.sessionTokensUsed.toLocaleString()} tokens observed in project directory`);
  console.log(`- Grok:   ${gr.sessionTokensUsed.toLocaleString()} tokens ($${gr.sessionCostUsd.toFixed(4)} USD) across completed task sessions`);
  console.log(`- Gemini: Native coordinator session (0 cost for local usage probe)`);
  console.log(`- Codex:  0 tokens (EXHAUSTED)`);
  console.log('============================================================');
  console.log(`Saved machine-readable status to: ${path.relative(REPO_ROOT, STATUS_JSON_PATH)}`);
}

main();
