/**
 * Test suites - resolver for config/test-suites.json (the single source of truth for suite membership).
 * Plain CommonJS so the Playwright config / TS code (via test-suites.d.ts) AND scripts/run-suite.js share it.
 *
 *   resolveSuite('regression-focused').ids  -> every test id of the suite (own + included suites)
 *   grepFor('smoke')                        -> RegExp for Playwright's grep (matches "TC-...:" test titles)
 *   suitesOf('TC-LD-CHK-002')               -> ['smoke', 'regression-focused', 'regression-full']
 *   validate()                              -> { errors, warnings } (limits, containment, unknown / duplicate ids)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SUITE_FILE = path.join(__dirname, 'test-suites.json');
const ID_RE = /^TC-[A-Z0-9]+(?:-[A-Z0-9]+)?-\d+$/;

let cache;
function loadSuites() {
  if (!cache) cache = JSON.parse(fs.readFileSync(SUITE_FILE, 'utf-8')).suites;
  return cache;
}

const SUITE_NAMES = Object.keys(loadSuites());

function entryId(e) {
  return typeof e === 'string' ? e : e.id;
}

/** A suite with all its test ids: included suites first, then its own groups (order kept, no duplicates). */
function resolveSuite(key, seen = []) {
  const suites = loadSuites();
  const s = suites[key];
  if (!s) throw new Error(`Unknown test suite "${key}". Known suites: ${SUITE_NAMES.join(', ')} (config/test-suites.json)`);
  if (seen.includes(key)) throw new Error(`Suite include cycle: ${[...seen, key].join(' -> ')}`);
  const ids = [];
  const why = {};
  for (const inc of s.includes || []) {
    const r = resolveSuite(inc, [...seen, key]);
    for (const id of r.ids) if (!ids.includes(id)) ids.push(id);
    Object.assign(why, r.why);
  }
  const own = [];
  for (const g of s.groups || []) {
    for (const e of g.tests) {
      const id = entryId(e);
      own.push(id);
      if (!ids.includes(id)) ids.push(id);
      if (typeof e !== 'string' && e.why) why[id] = e.why;
    }
  }
  return { key, name: s.name, limit: s.limit, target: s.target, purpose: s.purpose, whenToRun: s.whenToRun, rule: s.rule,
    includes: s.includes || [], groups: s.groups || [], own, ids, why };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Playwright grep for a suite: test titles start with "<TC id>:". */
function grepFor(key) {
  const { ids } = resolveSuite(key);
  return new RegExp(`(?:^|\\s)(?:${ids.map(escapeRe).join('|')}):`);
}

/** Keys of the suites a test belongs to. */
function suitesOf(id) {
  return SUITE_NAMES.filter((k) => resolveSuite(k).ids.includes(id));
}

/** Allure tag of a suite, e.g. "Smoke-Suite", "Focused-Regression". */
function suiteTag(key) {
  return loadSuites()[key].name.replace(/\s+/g, '-');
}

/** TC id -> spec file, scanned from the test titles ("TC-...:") of tests/**\/*.spec.ts. */
function scanSpecIds(dir = path.join(ROOT, 'tests')) {
  const out = {};
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith('.spec.ts')) {
        const src = fs.readFileSync(p, 'utf-8');
        for (const m of src.matchAll(/['"`](TC-[A-Z0-9]+(?:-[A-Z0-9]+)?-\d+):/g)) {
          if (!out[m[1]]) out[m[1]] = path.relative(ROOT, p).replace(/\\/g, '/');
        }
      }
    }
  };
  walk(dir);
  return out;
}

/** Every TC id that has Allure metadata (keys "'TC-...':" in data/metadata/**). */
function scanMetadataIds(dir = path.join(ROOT, 'data', 'metadata')) {
  const out = new Set();
  const walk = (d) => {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, f.name);
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith('.ts')) {
        for (const m of fs.readFileSync(p, 'utf-8').matchAll(/['"](TC-[A-Z0-9]+(?:-[A-Z0-9]+)?-\d+)['"]\s*:/g)) out.add(m[1]);
      }
    }
  };
  walk(dir);
  return out;
}

/**
 * Rules: ids well-formed, known (metadata), no duplicates inside a suite, includes are real subsets,
 * size below the limit. A suite test without an automated spec is a WARNING (it is run by hand).
 */
function validate() {
  const errors = [];
  const warnings = [];
  const meta = scanMetadataIds();
  const specs = scanSpecIds();
  for (const key of SUITE_NAMES) {
    const s = resolveSuite(key);
    const seen = new Set();
    for (const id of s.own) {
      if (!ID_RE.test(id)) errors.push(`${key}: "${id}" is not a test case id`);
      else if (!meta.has(id)) errors.push(`${key}: ${id} has no test case (no metadata entry in data/metadata/)`);
      if (seen.has(id)) errors.push(`${key}: ${id} is listed twice`);
      seen.add(id);
    }
    for (const inc of s.includes) {
      const dup = resolveSuite(inc).ids.filter((id) => s.own.includes(id));
      if (dup.length) errors.push(`${key}: ${dup.join(', ')} already come(s) from "${inc}" (remove from ${key})`);
    }
    if (!(s.ids.length < s.limit)) errors.push(`${key}: ${s.ids.length} tests - must stay below the limit of ${s.limit} (replace a test instead of adding one)`);
    const manual = s.ids.filter((id) => !specs[id]);
    if (manual.length) warnings.push(`${key}: ${manual.length} test(s) not automated yet (run by hand): ${manual.join(', ')}`);
  }
  return { errors, warnings, specs };
}

module.exports = { SUITE_FILE, SUITE_NAMES, loadSuites, resolveSuite, grepFor, suitesOf, suiteTag, scanSpecIds, scanMetadataIds, validate };
