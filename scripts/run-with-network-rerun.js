#!/usr/bin/env node
/**
 * Run the tests, then RE-RUN ONLY the tests that failed because of a network problem.
 *
 *   npm run test:network-rerun -- <any playwright test args>
 *   e.g. npm run test:network-rerun -- tests/e2e/lottery-type/ --workers=4
 *
 * Round 1   runs the tests exactly as asked (full reports in the usual places).
 *           fixtures/network-monitor.fixture.ts writes every test that FAILED WITH NETWORK
 *           EVIDENCE (timeouts on requests, dropped connections, 502/503/504, stalled requests)
 *           to playwright/.network-rerun/.
 * Pause     waits NETWORK_RERUN_DELAY seconds so the network can recover.
 * Round 2   re-runs only those tests (by file:line), 1 worker so a weak connection is not
 *           overloaded. Reports go to playwright-report-rerun1/, test-results-rerun1.json.
 * Summary   prints round 1, the rerun results and the final verdict; also written to
 *           network-rerun-summary.json.
 *
 * Tests that failed for any OTHER reason (a real app bug) are never re-run, and they keep the run
 * red. Exit code: 0 only if, after the rerun round(s), nothing failed.
 *
 * Settings (environment variables):
 *   NETWORK_RERUN_ROUNDS   max rerun rounds (default 1)
 *   NETWORK_RERUN_DELAY    seconds to wait before each rerun round (default 30)
 *   NETWORK_RERUN_WORKERS  workers for rerun rounds (default 1)
 *   NETWORK_SLOW_MS        a request slower than this counts as a network problem (default 20000)
 *   SIMULATE_NETWORK_FAILURE=<TC id>   demo: make that test hit API timeouts in round 1 only
 *
 * Allure: both rounds write to allure-results/, so a re-run test shows in Allure with its
 * round-1 failure listed under "Retries" and the rerun result as the latest.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const NETWORK_RERUN_DIR = path.join('playwright', '.network-rerun'); // = config/network-rerun.ts
const MAX_ROUNDS = Number(process.env.NETWORK_RERUN_ROUNDS ?? 1);
const DELAY_S = Number(process.env.NETWORK_RERUN_DELAY ?? 30);
const RERUN_WORKERS = String(process.env.NETWORK_RERUN_WORKERS ?? 1);

const userArgs = process.argv.slice(2);

// ---------- helpers ----------

const log = (msg = '') => console.log(msg);
const line = () => log('─'.repeat(78));
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

function runPlaywright(args, env) {
  log(`\n> npx playwright test ${args.join(' ')}\n`);
  const res = spawnSync('npx', ['playwright', 'test', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  return res.status ?? 1;
}

function readNetworkFailures() {
  if (!fs.existsSync(NETWORK_RERUN_DIR)) return [];
  return fs
    .readdirSync(NETWORK_RERUN_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(NETWORK_RERUN_DIR, f), 'utf-8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Same test? The JSON report gives paths relative to testDir (e2e/lottery-type/x.spec.ts:12), the
 * monitor relative to the project (tests/e2e/lottery-type/x.spec.ts:12) - compare by path suffix.
 */
function sameLocation(a, b) {
  return a === b || a.endsWith('/' + b) || b.endsWith('/' + a);
}

function clearNetworkFailures() {
  fs.rmSync(NETWORK_RERUN_DIR, { recursive: true, force: true });
}

/** Final failed tests in a Playwright JSON report: [{ title, location, status }]. null = no report. */
function failedTestsFromReport(jsonFile) {
  let report;
  try {
    report = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  } catch {
    return null;
  }
  const failed = [];
  const walk = (suite) => {
    (suite.suites || []).forEach(walk);
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        if (t.status !== 'unexpected') continue; // expected / flaky / skipped are not failures
        const last = t.results[t.results.length - 1];
        failed.push({ title: spec.title, location: `${spec.file}:${spec.line}`, status: last?.status ?? 'failed' });
      }
    }
  };
  (report.suites || []).forEach(walk);
  return failed;
}

/**
 * Options from the user's command that should also apply to the rerun (e.g. --headed,
 * --project=chromium). Dropped: test file/folder filters and -g/--grep (the rerun targets exact
 * file:line locations instead), --workers (rerun uses NETWORK_RERUN_WORKERS), --reporter
 * (the rerun needs the configured JSON report), and repeat/last-failed/shard selectors.
 */
function rerunOptions(args) {
  const valueFlags = new Set(['-g', '--grep', '--grep-invert', '--project', '--workers', '-j', '--reporter',
    '--retries', '--timeout', '-c', '--config', '--max-failures', '--repeat-each', '--shard', '--output',
    '--trace', '--tsconfig', '--global-timeout']);
  const drop = new Set(['-g', '--grep', '--grep-invert', '--workers', '-j', '--reporter', '--repeat-each',
    '--shard', '--output', '--last-failed', '--only-changed', '--max-failures', '-x']);
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('-')) continue; // positional = file/folder filter
    const name = a.split('=')[0];
    const takesValue = valueFlags.has(name) && !a.includes('=');
    if (!drop.has(name)) {
      out.push(a);
      if (takesValue && args[i + 1] !== undefined) out.push(args[i + 1]);
    }
    if (takesValue) i++;
  }
  return out;
}

// ---------- main ----------

(async () => {
  if (userArgs.some((a) => a.startsWith('--reporter'))) {
    log('⚠️  --reporter replaces the configured reporters, so round 1 writes no JSON report and failures');
    log('   can only be counted from the exit code. Leave --reporter out for an exact summary.');
  }

  // ===== Round 1 =====
  clearNetworkFailures();
  log('\n🔵 ROUND 1 - running the tests as requested');
  line();
  const round1Code = runPlaywright(userArgs, {});
  const round1Failed = failedTestsFromReport(process.env.PW_JSON_FILE || 'test-results.json');
  let networkFailures = readNetworkFailures();

  const otherFailures = round1Failed
    ? round1Failed.filter((f) => !networkFailures.some((n) => sameLocation(n.location, f.location)))
    : null;

  const summary = {
    round1: {
      exitCode: round1Code,
      failed: round1Failed ? round1Failed.length : 'unknown (no JSON report)',
      networkFailures: networkFailures.map(({ title, location, evidence }) => ({ title, location, evidence })),
      otherFailures,
    },
    reruns: [],
  };

  log('');
  line();
  log('🔵 ROUND 1 RESULT');
  if (round1Failed) log(`   Failed tests: ${round1Failed.length}`);
  log(`   Failed because of a NETWORK problem (will be re-run): ${networkFailures.length}`);
  for (const n of networkFailures) log(`     • ${n.title}\n         ${n.evidence[0]}`);
  if (otherFailures) {
    log(`   Failed for OTHER reasons (real failures - NOT re-run): ${otherFailures.length}`);
    for (const f of otherFailures) log(`     • ${f.title}`);
  }

  // ===== Rerun rounds =====
  let stillFailing = [];
  for (let round = 1; round <= MAX_ROUNDS && networkFailures.length > 0; round++) {
    line();
    log(`🟡 NETWORK RERUN ${round}/${MAX_ROUNDS} - ${networkFailures.length} test(s); waiting ${DELAY_S}s for the network to recover...`);
    await sleep(DELAY_S);

    const locations = [...new Set(networkFailures.map((n) => n.location))];
    const projects = [...new Set(networkFailures.map((n) => n.project))];
    const opts = rerunOptions(userArgs).filter((a, i, arr) => !(a.startsWith('--project') || arr[i - 1] === '--project'));
    const args = [...locations, ...projects.map((p) => `--project=${p}`), `--workers=${RERUN_WORKERS}`, ...opts];

    const jsonFile = `test-results-rerun${round}.json`;
    clearNetworkFailures();
    const code = runPlaywright(args, {
      NETWORK_RERUN_ROUND: String(round),
      PW_OUTPUT_DIR: `test-results-rerun${round}`,
      PW_HTML_DIR: `playwright-report-rerun${round}`,
      PW_JSON_FILE: jsonFile,
    });

    const failedNow = failedTestsFromReport(jsonFile);
    const rerunNetwork = readNetworkFailures();
    const results = networkFailures.map((n) => {
      const f = failedNow ? failedNow.find((x) => sameLocation(x.location, n.location)) : undefined;
      const passed = failedNow ? !f : code === 0;
      const net = rerunNetwork.find((x) => sameLocation(x.location, n.location));
      return { title: n.title, location: n.location, result: passed ? 'passed' : net ? 'failed (network again)' : 'failed (NOT network)' };
    });
    summary.reruns.push({ round, exitCode: code, report: `playwright-report-rerun${round}`, results });

    log('');
    log(`🟡 NETWORK RERUN ${round} RESULT`);
    for (const r of results) log(`     ${r.result === 'passed' ? '✅' : '❌'} ${r.title} -> ${r.result}`);

    stillFailing = results.filter((r) => r.result !== 'passed');
    // Only tests that failed with network evidence AGAIN go to the next round
    networkFailures = rerunNetwork;
  }

  // ===== Verdict =====
  const otherCount = otherFailures ? otherFailures.length : round1Code !== 0 && summary.reruns.length === 0 ? 1 : 0;
  const passedAfterRerun = summary.reruns.length
    ? summary.reruns.flatMap((r) => r.results).filter((r) => r.result === 'passed').length
    : 0;
  const ok = otherCount === 0 && stillFailing.length === 0 && (summary.reruns.length > 0 || round1Code === 0);

  summary.verdict = {
    passed: ok,
    realFailures: otherFailures ? otherFailures.length : 'unknown',
    passedOnNetworkRerun: passedAfterRerun,
    stillFailingAfterRerun: stillFailing,
  };
  fs.writeFileSync('network-rerun-summary.json', JSON.stringify(summary, null, 2));

  log('');
  line();
  log(ok ? '✅ FINAL: PASSED' : '❌ FINAL: FAILED');
  if (otherFailures) log(`   Real failures (not network):          ${otherFailures.length}`);
  log(`   Passed on network rerun (flaky-net):   ${passedAfterRerun}`);
  log(`   Still failing after network rerun:     ${stillFailing.length}`);
  if (passedAfterRerun > 0) {
    log('   ⚠️  Tests that only passed on the rerun had network trouble in round 1 - check the');
    log('      network, and treat repeat offenders as flaky (see network-rerun-summary.json).');
  }
  log('   Reports: round 1 -> playwright-report/  |  reruns -> playwright-report-rerun<N>/  |  network-rerun-summary.json');
  line();

  process.exit(ok ? 0 : 1);
})();
