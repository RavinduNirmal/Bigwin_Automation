#!/usr/bin/env node
/**
 * Generates the test-scenario summary workbook:  test-scenarios/BigWin Test Scenarios.xlsx
 *
 *   Overview        coverage of every module (formulas over the module tabs)
 *   Login           Login scenarios
 *   Lottery Type    \
 *   Lottery Brand    } Lottery group (same tab colour)
 *   Lottery Draw    /  (+ ticket DBF service)
 *
 * Each module tab: module info, a "Coverage by category" table (COUNTIFS formulas over the
 * scenario list) and the scenarios grouped by category - ID, scenario, priority, test type,
 * status, spec file, notes (known-defect ACTUAL result / reason it is not automated yet).
 *
 * Sources (nothing is typed by hand, so the workbook never drifts from the suite):
 *   - data/metadata/<module>/*.metadata.ts   scenario, priority, tags, known-defect ACTUAL result
 *   - tests/**\/*.spec.ts                    which scenarios are automated, and in which spec file
 *   - specs/*-test-plan.md                   why a scenario is not automated yet
 *
 * Usage:  npm run docs:scenarios      (re-run after adding / changing tests or metadata)
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const ExcelJS = require('exceljs');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'test-scenarios');
const OUT = path.join(OUT_DIR, 'BigWin Test Scenarios.xlsx');

// ---- load the TypeScript metadata directly (transpile on require, no build step)
require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  module._compile(outputText, filename);
};
const metadata = require(path.join(ROOT, 'data', 'metadata', 'index.ts'));

// ---- which scenarios are automated (TC id -> spec file)
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.spec.ts') ? [p] : [];
  });
}
const automated = {};
for (const file of walk(path.join(ROOT, 'tests'))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/(?:combinedTest|test|setup)\(\s*(['"`])(TC-[A-Z0-9]+(?:-[A-Z0-9]+)?-\d+):/g)) {
    automated[m[2]] = path.relative(ROOT, file).replace(/\\/g, '/');
  }
}

// ---- plan notes (reason a scenario is not automated / not verifiable)
const planNote = {};
for (const plan of ['lottery-type', 'lottery-brand', 'lottery-draw']) {
  const file = path.join(ROOT, 'specs', `${plan}-test-plan.md`);
  if (!fs.existsSync(file)) continue;
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/^#### [\d.]+ (TC-[A-Z0-9]+-[A-Z0-9]+-\d+): (.*)$/gm)) {
    const reason = /\[(Not verifiable[^\]]*)\]/.exec(m[2]);
    if (reason) planNote[m[1]] = reason[1];
  }
}

// ---- modules (add a module = add an entry here)
const MODULES = [
  { key: 'LoginMetadata', group: 'Login', title: 'Login', tab: 'Login', colour: 'FF6AA84F',
    area: 'Login page - email + password, then a 6-digit OTP (dev bypass OTP)', route: '/auth/jwt/login',
    specs: 'tests/e2e/login/', plan: '-', meta: 'data/metadata/login/', npm: 'npm run test:login' },
  { key: 'LotteryTypeMetadata', group: 'Lottery', title: 'Lottery Type', tab: 'Lottery Type', colour: 'FFF1C232',
    area: 'Sidebar Lottery > Lottery Type - lottery type CRUD + Review / Approve', route: '/dashboard/lottery/lottery-type',
    specs: 'tests/e2e/lottery-type/', plan: 'specs/lottery-type-test-plan.md', meta: 'data/metadata/lottery-type/', npm: 'npm run test:lottery-type' },
  { key: 'LotteryBrandMetadata', group: 'Lottery', title: 'Lottery Brand', tab: 'Lottery Brand', colour: 'FFF1C232',
    area: 'Sidebar Lottery > Lottery Brand - 4-step Add New Brand wizard, edit, soft delete, Review / Approve, use in Create Draw', route: '/dashboard/lottery',
    specs: 'tests/e2e/lottery-brand/', plan: 'specs/lottery-brand-test-plan.md', meta: 'data/metadata/lottery-brand/', npm: 'npm run test:lottery-brand' },
  { key: 'LotteryDrawMetadata', group: 'Lottery', title: 'Lottery Draw', tab: 'Lottery Draw', colour: 'FFF1C232',
    area: 'Sidebar Lottery Draws > Draws - create draw with ticket DBF + MD5, Review / Approve, scheduled stages, row actions (+ ticket DBF service)', route: '/dashboard/draw',
    specs: 'tests/e2e/lottery-draw/ + tests/unit/', plan: 'specs/lottery-draw-test-plan.md', meta: 'data/metadata/lottery-draw/', npm: 'npm run test:lottery-draw' },
];
const CATEGORY = {
  LOGIN: 'Login', NAV: 'Navigation & Display', CR: 'Create', VAL: 'Create Draw Validation', ED: 'Edit', DEL: 'Delete', SRCH: 'Search',
  TBL: 'Tabs, Table & Paging', APR: 'Review & Approval', USE: 'Ready For Use', VIEW: 'Draw View Page', ACT: 'Row Actions',
  LC: 'Lifecycle (scheduled stages)', DEMO: 'Demo - all stages', LOG: 'Logs & Audit', A11Y: 'Accessibility', PAR: 'Parallel Safety',
  SEC: 'Security', DBF: 'Ticket DBF Service (unit tests)',
};
const ORDER = Object.keys(CATEGORY);
const PRIORITY = { blocker: 'Blocker', critical: 'Critical', normal: 'Normal', minor: 'Minor', trivial: 'Trivial' };
const STATUS = { AUTO: 'Automated', DEFECT: 'Automated - known defect', TODO: 'Not automated', DESIGN: 'By design' };

const categoryOf = (id) => {
  const p = id.split('-');
  return p[1] === 'DBF' ? 'DBF' : p[1] === 'LOGIN' ? 'LOGIN' : p[2];
};
const codeOf = (id) => {
  const p = id.split('-');
  return p[1] === 'DBF' ? 'TC-DBF' : p[1] === 'LOGIN' ? 'TC-LOGIN' : p.slice(0, 3).join('-');
};
function statusOf(id, m) {
  if (automated[id]) return m.actualResult ? STATUS.DEFECT : STATUS.AUTO;
  return id === 'TC-LB-PAR-001' ? STATUS.DESIGN : STATUS.TODO;
}
function noteOf(id, m) {
  if (m.actualResult) return `Actual: ${m.actualResult}`;
  if (!automated[id]) {
    if (id === 'TC-LB-PAR-001') return 'Framework rule (unique AT codes, own-data cleanup, --workers=1)';
    if (id === 'TC-LD-SEC-005') return 'Needs a limited-role account (not available on dev)';
    return planNote[id] ?? 'Planned';
  }
  return '';
}
function testType(m) {
  const tags = (m.tags || []).map((t) => t.toLowerCase());
  const out = [];
  for (const [k, v] of [['smoke', 'Smoke'], ['regression', 'Regression'], ['ui', 'UI'], ['validation', 'Validation'], ['security', 'Security'],
    ['approval', 'Approval'], ['performance', 'Performance'], ['unit', 'Unit'], ['slow', 'Slow'], ['a11y', 'Accessibility']]) {
    if (tags.includes(k) && !out.includes(v)) out.push(v);
  }
  return out.join(', ') || 'Functional';
}

// ---- styles (same look as the test case sheet)
const FONT = 'Roboto';
const thin = { style: 'thin', color: { argb: 'FF000000' } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const HEAD = { font: { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } }, fill: fill('FF990000') };
const DASH = fill('FFCFE2F3');
const BANNER = { font: { name: FONT, size: 11, bold: true, color: { argb: 'FF434343' } }, fill: fill('FFF1C232') };
const STATUS_FILL = { [STATUS.AUTO]: 'FFD9EAD3', [STATUS.DEFECT]: 'FFF4CCCC', [STATUS.TODO]: 'FFFFF2CC', [STATUS.DESIGN]: 'FFEFEFEF' };
const CENTER = { horizontal: 'center', vertical: 'middle', wrapText: true };
const LEFT = { horizontal: 'left', vertical: 'middle', wrapText: true };

function put(ws, r, c, value, opts = {}) {
  const cell = ws.getCell(r, c);
  if (value !== undefined) cell.value = value;
  cell.font = opts.font ?? { name: FONT, size: 10, bold: !!opts.bold };
  if (opts.fill) cell.fill = opts.fill;
  cell.alignment = opts.align ?? CENTER;
  if (opts.border !== false) cell.border = BORDER;
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  return cell;
}
function merge(ws, r1, c1, r2, c2, value, opts = {}) {
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) put(ws, r, c, undefined, opts);
  ws.mergeCells(r1, c1, r2, c2);
  ws.getCell(r1, c1).value = value;
}
const f = (formula, result) => ({ formula, result });

// ---- module tab
const COLS = ['Test Case ID', 'Scenario', 'Priority', 'Test Type', 'Status', 'Automated In', 'Notes'];
function moduleTab(wb, mod) {
  const coll = metadata[mod.key];
  const ids = Object.keys(coll).sort((a, b) => ORDER.indexOf(categoryOf(a)) - ORDER.indexOf(categoryOf(b)) || Number(a.split('-').pop()) - Number(b.split('-').pop()));
  const groups = new Map();
  for (const id of ids) {
    const c = codeOf(id);
    if (!groups.has(c)) groups.set(c, []);
    groups.get(c).push(id);
  }
  const ws = wb.addWorksheet(mod.tab, { properties: { tabColor: { argb: mod.colour } }, views: [{ zoomScale: 90 }] });
  [18, 62, 11, 26, 24, 44, 70].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  merge(ws, 1, 1, 1, 4, `${mod.title} - Test Scenarios`, { font: { name: FONT, size: 14, bold: true }, border: false, align: { vertical: 'middle' } });
  put(ws, 2, 1, 'Generated by "npm run docs:scenarios" from metadata, test files and plans - do not edit by hand. Detailed steps / data / results: test case sheet/BigWin Admin Portal Test Case Sheet.xlsx',
    { font: { name: FONT, size: 9, italic: true }, border: false, align: LEFT });
  ws.mergeCells(2, 1, 2, 7);
  const info = [['Group', mod.group], ['Area', mod.area], ['Route', mod.route], ['Specs', mod.specs], ['Metadata', mod.meta], ['Test plan', mod.plan], ['Run', mod.npm]];
  info.forEach(([k, v], i) => {
    put(ws, 4 + i, 1, k, { bold: true, fill: DASH });
    merge(ws, 4 + i, 2, 4 + i, 4, v, { align: LEFT });
  });

  // geometry of the scenario table (needed by the formulas above it)
  const covHead = 4 + info.length + 2;
  const tableHead = covHead + 1 + groups.size + 1 + 3;
  const first = tableHead + 1;
  const last = first + ids.length + groups.size - 1;
  const A = `$A$${first}:$A$${last}`;
  const E = `$E$${first}:$E$${last}`;

  // coverage by category
  merge(ws, covHead - 1, 1, covHead - 1, 2, 'Coverage by category', { font: { name: FONT, size: 13 }, fill: DASH, align: { vertical: 'middle' } });
  ['Category', 'Category Code', 'Scenarios', 'Automated', 'Known defects', 'Not automated', 'Automation %'].forEach((h, i) =>
    put(ws, covHead, 1 + i, h, { font: { name: 'Calibri', size: 11, bold: true }, fill: DASH }));
  let r = covHead + 1;
  for (const [code, list] of groups) {
    const auto = list.filter((i) => automated[i]).length;
    const defects = list.filter((i) => statusOf(i, coll[i]) === STATUS.DEFECT).length;
    const crit = `"${code}-*"`;
    put(ws, r, 1, CATEGORY[categoryOf(list[0])] ?? code, { fill: DASH });
    put(ws, r, 2, code, { fill: DASH });
    put(ws, r, 3, f(`COUNTIF(${A},${crit})`, list.length), { fill: DASH });
    put(ws, r, 4, f(`COUNTIFS(${A},${crit},${E},"Automated*")`, auto), { fill: DASH });
    put(ws, r, 5, f(`COUNTIFS(${A},${crit},${E},"${STATUS.DEFECT}")`, defects), { fill: DASH });
    put(ws, r, 6, f(`C${r}-D${r}`, list.length - auto), { fill: DASH });
    put(ws, r, 7, f(`IFERROR(D${r}/C${r},0)`, auto / list.length), { fill: DASH, numFmt: '0%' });
    r++;
  }
  const tot = r;
  const n = ids.length;
  const autoN = ids.filter((i) => automated[i]).length;
  const defN = ids.filter((i) => statusOf(i, coll[i]) === STATUS.DEFECT).length;
  put(ws, tot, 1, 'Total', { bold: true, fill: DASH });
  put(ws, tot, 2, '', { fill: DASH });
  put(ws, tot, 3, f(`SUM(C${covHead + 1}:C${tot - 1})`, n), { bold: true, fill: DASH });
  put(ws, tot, 4, f(`SUM(D${covHead + 1}:D${tot - 1})`, autoN), { bold: true, fill: DASH });
  put(ws, tot, 5, f(`SUM(E${covHead + 1}:E${tot - 1})`, defN), { bold: true, fill: DASH });
  put(ws, tot, 6, f(`SUM(F${covHead + 1}:F${tot - 1})`, n - autoN), { bold: true, fill: DASH });
  put(ws, tot, 7, f(`IFERROR(D${tot}/C${tot},0)`, autoN / n), { bold: true, fill: DASH, numFmt: '0%' });
  put(ws, tot + 1, 1, 'Status: Automated · Automated - known defect (the test fails until the app is fixed, never skipped) · Not automated (planned) · By design',
    { font: { name: FONT, size: 9, italic: true }, border: false, align: LEFT });
  ws.mergeCells(tot + 1, 1, tot + 1, 7);

  // scenario table
  COLS.forEach((h, i) => put(ws, tableHead, 1 + i, h, HEAD));
  ws.getRow(tableHead).height = 28;
  r = first;
  for (const [code, list] of groups) {
    merge(ws, r, 1, r, 7, `${CATEGORY[categoryOf(list[0])] ?? code}  (${code}-*)  -  ${list.length} scenarios`, BANNER);
    r++;
    for (const id of list) {
      const m = coll[id];
      const st = statusOf(id, m);
      put(ws, r, 1, id, { bold: true, fill: fill('FFF3F3F3') });
      put(ws, r, 2, m.description || m.story, { align: LEFT });
      put(ws, r, 3, PRIORITY[m.severity] ?? m.severity);
      put(ws, r, 4, testType(m));
      put(ws, r, 5, st, { fill: fill(STATUS_FILL[st]) });
      put(ws, r, 6, automated[id] ?? '-', { align: LEFT, font: { name: FONT, size: 9 } });
      put(ws, r, 7, noteOf(id, m), { align: LEFT });
      r++;
    }
  }
  ws.views = [{ state: 'frozen', ySplit: tableHead, zoomScale: 90 }];
  ws.autoFilter = { from: { row: tableHead, column: 1 }, to: { row: last, column: 7 } };
  ws.dataValidations.add(`E${first}:E${last + 100}`, { type: 'list', allowBlank: true, formulae: [`"${Object.values(STATUS).join(',')}"`] });
  return { total: n, auto: autoN, defects: defN, tot };
}

// ---- overview tab
async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BigWin QA automation';
  wb.calcProperties = { fullCalcOnLoad: true };
  const ov = wb.addWorksheet('Overview', { properties: { tabColor: { argb: 'FF990000' } } });
  const stats = MODULES.map((mod) => ({ mod, ...moduleTab(wb, mod) }));

  [14, 18, 14, 14, 14, 16, 16, 60].forEach((w, i) => { ov.getColumn(i + 1).width = w; });
  merge(ov, 1, 1, 1, 5, 'BigWin Admin Portal - Test Scenarios', { font: { name: FONT, size: 16, bold: true }, border: false, align: { vertical: 'middle' } });
  put(ov, 2, 1, 'What is covered, per module - without opening the detailed test case sheet. Generated by "npm run docs:scenarios" (scripts/generate-test-scenarios.js) - do not edit by hand: change a test and its metadata (data/metadata/<module>/), then re-run.',
    { font: { name: FONT, size: 9, italic: true }, border: false, align: LEFT });
  ov.mergeCells(2, 1, 2, 8);
  ov.getRow(2).height = 30;
  merge(ov, 4, 1, 4, 3, 'Coverage overview', { font: { name: FONT, size: 13 }, fill: DASH, align: { vertical: 'middle' } });
  ['Group', 'Module', 'Scenarios', 'Automated', 'Known defects', 'Not automated', 'Automation %', 'Open the tab'].forEach((h, i) => put(ov, 5, 1 + i, h, HEAD));
  let r = 6;
  for (const s of stats) {
    const t = `'${s.mod.tab}'!`;
    put(ov, r, 1, s.mod.group, { bold: true, fill: fill(s.mod.colour) });
    put(ov, r, 2, s.mod.title);
    put(ov, r, 3, f(`${t}C${s.tot}`, s.total));
    put(ov, r, 4, f(`${t}D${s.tot}`, s.auto));
    put(ov, r, 5, f(`${t}E${s.tot}`, s.defects));
    put(ov, r, 6, f(`${t}F${s.tot}`, s.total - s.auto));
    put(ov, r, 7, f(`IFERROR(D${r}/C${r},0)`, s.auto / s.total), { numFmt: '0%' });
    put(ov, r, 8, { text: `Go to ${s.mod.tab}`, hyperlink: `#'${s.mod.tab}'!A1` }, { font: { name: FONT, size: 10, color: { argb: 'FF1155CC' }, underline: true } });
    r++;
  }
  const sum = (k) => stats.reduce((n, s) => n + s[k], 0);
  put(ov, r, 1, 'Total', { bold: true, fill: DASH });
  put(ov, r, 2, '', { fill: DASH });
  put(ov, r, 3, f(`SUM(C6:C${r - 1})`, sum('total')), { bold: true, fill: DASH });
  put(ov, r, 4, f(`SUM(D6:D${r - 1})`, sum('auto')), { bold: true, fill: DASH });
  put(ov, r, 5, f(`SUM(E6:E${r - 1})`, sum('defects')), { bold: true, fill: DASH });
  put(ov, r, 6, f(`SUM(F6:F${r - 1})`, sum('total') - sum('auto')), { bold: true, fill: DASH });
  put(ov, r, 7, f(`IFERROR(D${r}/C${r},0)`, sum('auto') / sum('total')), { bold: true, fill: DASH, numFmt: '0%' });
  put(ov, r, 8, '', { fill: DASH });
  put(ov, r + 2, 1, 'Groups: Login (green tab) · Lottery = Lottery Type, Lottery Brand, Lottery Draw (yellow tabs). Adding a module: add its metadata folder, then one entry to MODULES in scripts/generate-test-scenarios.js.',
    { font: { name: FONT, size: 9, italic: true }, border: false, align: LEFT });
  ov.mergeCells(r + 2, 1, r + 2, 8);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await wb.xlsx.writeFile(OUT);
  for (const s of stats) console.log(`✅ ${s.mod.tab}: ${s.total} scenarios, ${s.auto} automated, ${s.defects} known defects`);
  console.log(`✅ ${path.relative(ROOT, OUT)} - ${sum('total')} scenarios in ${stats.length} modules`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
