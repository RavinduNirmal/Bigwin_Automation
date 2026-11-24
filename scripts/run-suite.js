#!/usr/bin/env node
/**
 * Run / check the test suites defined in config/test-suites.json.
 *
 *   node scripts/run-suite.js <suite> [playwright args]   run a suite (npm run test:smoke | test:regression:focused | test:regression:full)
 *                                                          e.g. npm run test:smoke -- --headed
 *   node scripts/run-suite.js --list [suite]               print the suites and their tests (automated spec or "manual")
 *   node scripts/run-suite.js --check                      validate the manifest (npm run suites:check, part of npm run check)
 *
 * A run sets TEST_SUITE=<suite>; playwright.config.ts then greps the chromium project to the suite's test ids.
 * Default --workers=1 (suite tests create real records on the shared dev server); pass --workers=N to change it.
 * Suite tests that are not automated yet are listed before the run - they are executed by hand (Excel suite workbook).
 */
const { spawnSync } = require('child_process');
const { SUITE_NAMES, resolveSuite, validate } = require('../config/test-suites');

const args = process.argv.slice(2);

function report({ errors, warnings }) {
  for (const w of warnings) console.log(`  ! ${w}`);
  for (const e of errors) console.log(`  x ${e}`);
}

function summary(specs, keys = SUITE_NAMES) {
  for (const key of keys) {
    const s = resolveSuite(key);
    const auto = s.ids.filter((id) => specs[id]).length;
    console.log(`${s.name.padEnd(20)} ${String(s.ids.length).padStart(3)} tests (limit < ${s.limit}, target ${s.target})  ·  ${auto} automated, ${s.ids.length - auto} manual  ·  key "${key}"`);
  }
}

if (args[0] === '--check') {
  const res = validate();
  console.log('Test suites (config/test-suites.json)\n');
  summary(res.specs);
  console.log('');
  report(res);
  console.log(res.errors.length ? `\n${res.errors.length} error(s) - fix config/test-suites.json` : '\nSuites OK');
  process.exit(res.errors.length ? 1 : 0);
}

if (args[0] === '--list') {
  const res = validate();
  for (const key of args[1] ? [args[1]] : SUITE_NAMES) {
    const s = resolveSuite(key);
    console.log(`\n${s.name} (${key}) - ${s.ids.length} tests${s.includes.length ? `, includes ${s.includes.join(', ')}` : ''}`);
    for (const id of s.ids) console.log(`  ${id.padEnd(16)} ${res.specs[id] || 'manual'}${s.why[id] ? `  - ${s.why[id]}` : ''}`);
  }
  process.exit(0);
}

const suite = args[0];
if (!suite || !SUITE_NAMES.includes(suite)) {
  console.error(`Usage: node scripts/run-suite.js <${SUITE_NAMES.join('|')}> [playwright args]  |  --list [suite]  |  --check`);
  process.exit(2);
}
const res = validate();
if (res.errors.length) {
  report({ errors: res.errors, warnings: [] });
  console.error('\nconfig/test-suites.json has errors - run: npm run suites:check');
  process.exit(1);
}
const s = resolveSuite(suite);
const manual = s.ids.filter((id) => !res.specs[id]);
console.log(`\n▶ ${s.name}: ${s.ids.length - manual.length} automated tests${manual.length ? ` (+ ${manual.length} manual: ${manual.join(', ')})` : ''}\n`);

const pwArgs = ['playwright', 'test', ...args.slice(1)];
if (!pwArgs.some((a) => a.startsWith('--workers') || a === '-j')) pwArgs.push('--workers=1');
const run = spawnSync('npx', pwArgs, { stdio: 'inherit', shell: true, env: { ...process.env, TEST_SUITE: suite } });
process.exit(run.status ?? 1);
