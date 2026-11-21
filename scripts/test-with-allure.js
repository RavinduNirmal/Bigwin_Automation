#!/usr/bin/env node
/**
 * Run Playwright tests and open an Allure report that KEEPS all existing results,
 * replacing only the results of the tests that were just re-run.
 *
 *   npm run test:allure -- <any playwright test args>
 *   e.g. npm run test:allure -- tests/e2e/lottery-type/lottery_type_create.spec.ts -g "TC-LT-CR-00[23]"
 *
 * Steps:
 *   1. Run the tests (allure-playwright adds new files to allure-results/).
 *   2. For each test that just ran, delete its OLDER result files (+ their attachments),
 *      so the report shows the latest run of that test. All other tests' results are kept.
 *   3. Carry Allure's trend history over from the previous report.
 *   4. Generate allure-report/ and open it (blocks while serving - Ctrl+C to stop).
 *
 * Exits with the test run's exit code, so CI still sees failures.
 * Set ALLURE_NO_OPEN=1 to generate without opening (e.g. in CI).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESULTS_DIR = 'allure-results';
const REPORT_DIR = 'allure-report';

const run = (cmd, args) =>
  spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' }).status ?? 1;

/**
 * Stable identity of a test: spec file + title.
 * (Allure's own historyId includes the line number, which changes whenever the spec is edited.)
 */
const testKey = (r) => `${(r.fullName || '').replace(/:\d+:\d+$/, '')}::${r.name}`;

/** All attachment file names referenced by a result, including inside nested steps. */
function attachmentSources(node, out = []) {
  for (const a of node.attachments || []) if (a.source) out.push(a.source);
  for (const s of node.steps || []) attachmentSources(s, out);
  return out;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

/** Delete older results of every test that produced a result at/after runStart. */
function replaceRerunResults(runStart) {
  if (!fs.existsSync(RESULTS_DIR)) return;
  const files = fs.readdirSync(RESULTS_DIR);
  const results = files
    .filter((f) => f.endsWith('-result.json'))
    .map((f) => ({ file: f, data: readJson(path.join(RESULTS_DIR, f)) }))
    .filter((r) => r.data);

  const isNew = (r) => (r.data.start ?? fs.statSync(path.join(RESULTS_DIR, r.file)).mtimeMs) >= runStart;
  const rerunKeys = new Set(results.filter(isNew).map((r) => testKey(r.data)));

  const removedUuids = new Set();
  let removedFiles = 0;
  const remove = (name) => {
    const p = path.join(RESULTS_DIR, name);
    if (fs.existsSync(p)) {
      fs.rmSync(p);
      removedFiles++;
    }
  };

  for (const r of results) {
    if (isNew(r) || !rerunKeys.has(testKey(r.data))) continue;
    attachmentSources(r.data).forEach(remove);
    remove(r.file);
    removedUuids.add(r.data.uuid);
  }

  // Containers (before/after hooks) whose children were all replaced are no longer needed
  for (const f of files.filter((f) => f.endsWith('-container.json'))) {
    const c = readJson(path.join(RESULTS_DIR, f));
    if (c && (c.children || []).length && c.children.every((u) => removedUuids.has(u))) {
      [...(c.befores || []), ...(c.afters || [])].forEach((h) => attachmentSources(h).forEach(remove));
      remove(f);
    }
  }

  console.log(
    `\n♻️  Re-ran ${rerunKeys.size} test(s): replaced ${removedUuids.size} older result(s) ` +
    `(${removedFiles} files). All other existing results kept.`
  );
}

/** Keep Allure's trend graphs: copy the previous report's history into the results. */
function carryOverHistory() {
  const from = path.join(REPORT_DIR, 'history');
  if (fs.existsSync(from)) {
    fs.cpSync(from, path.join(RESULTS_DIR, 'history'), { recursive: true });
  }
}

// 1. Run the tests, forwarding all arguments (quoted for the Windows shell)
const runStart = Date.now();
const quote = (a) => (process.platform === 'win32' && /[\s[\]^&|<>()]/.test(a) ? `"${a}"` : a);
const testExitCode = run('npx', ['playwright', 'test', ...process.argv.slice(2).map(quote)]);

// 2. Replace only the re-run tests' old results
replaceRerunResults(runStart);

// 3 + 4. Generate (even if tests failed) and open
carryOverHistory();
const genExitCode = run('npx', ['allure', 'generate', RESULTS_DIR, '--clean', '-o', REPORT_DIR]);
if (genExitCode !== 0) {
  console.error('❌ Allure report generation failed');
  process.exit(genExitCode);
}
if (!process.env.ALLURE_NO_OPEN) {
  console.log(`\n📊 Opening Allure report (tests exit code: ${testExitCode}). Press Ctrl+C to stop.\n`);
  run('npx', ['allure', 'open', REPORT_DIR]);
}
process.exit(testExitCode);
