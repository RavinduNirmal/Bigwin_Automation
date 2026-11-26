/**
 * Excel sync reporter: after EVERY run, writes the result of each executed test case (by its TC id) into all
 * BigWin test case workbooks (test case sheet/**) via scripts/excel/sync_results.py:
 *   status / actual result / executed date / Executed By = Ravindu(playwright_automation) / comment,
 *   PASS closes the case's open bug, FAIL raises a new bug (or reopens a closed one) in every Bug Sheet that has the case.
 * Workbooks open in Excel are skipped and updated on the next run (or: npm run excel:sync).
 *
 * Off on CI unless EXCEL_SYNC=1; EXCEL_SYNC=0 turns it off locally. PYTHON=<path> selects the interpreter
 * (needs openpyxl: pip install -r scripts/excel/requirements.txt). Skipped / interrupted tests are not written.
 */
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { AllTestMetadata } from '../data/metadata';
import type { TestMetadata } from '../utils/metadata-manager';

const ID_RE = /^(TC-[A-Z0-9]+(?:-[A-Z0-9]+)?-\d+):/;
const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'excel', 'sync_results.py');
const OUT_DIR = path.join(ROOT, 'playwright', '.excel-sync');

interface SyncResult {
  id: string;
  title: string;
  status: 'Pass' | 'Fail';
  flaky: boolean;
  date: string;
  error: string;
  spec: string;
  severity?: string;
  description?: string;
  preconditions?: string;
  testData?: string;
  steps?: string[];
  expectedResult?: string;
  /** known defect in plain words (metadata actualResult) - shown as the Actual Result of a failure */
  actualResult?: string;
  module?: string;
}

function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** First meaningful line of the failure (no ANSI colours, no stack), max 300 chars. */
function errorLine(result: TestResult | undefined): string {
  const raw = result?.errors?.[0]?.message ?? result?.error?.message ?? '';
  // eslint-disable-next-line no-control-regex
  const lines = raw.replace(/\u001b\[[0-9;]*m/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const msg = lines.filter((l) => !/^(at |Call log:|- )/.test(l)).slice(0, 4).join(' | ');
  return msg.length > 300 ? `${msg.slice(0, 297)}...` : msg;
}

class ExcelSyncReporter implements Reporter {
  private readonly tests = new Map<string, { test: TestCase; last?: TestResult }>();
  private readonly enabled = process.env.EXCEL_SYNC ? process.env.EXCEL_SYNC !== '0' : !process.env.CI;

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!this.enabled || test.parent.project()?.name === 'setup') return;
    const m = ID_RE.exec(test.title);
    if (m) this.tests.set(m[1], { test, last: result });
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (!this.enabled || this.tests.size === 0) return;
    const metadata = AllTestMetadata as Record<string, TestMetadata & { preconditions?: string; testData?: string; expectedResult?: string; actualResult?: string }>;
    const results: SyncResult[] = [];
    for (const [id, { test, last }] of this.tests) {
      const outcome = test.outcome();
      if (outcome === 'skipped' || !last || last.status === 'interrupted') continue;
      const md = metadata[id];
      results.push({
        id,
        title: test.title,
        status: outcome === 'expected' || outcome === 'flaky' ? 'Pass' : 'Fail',
        flaky: outcome === 'flaky',
        date: localDate(last.startTime),
        error: outcome === 'unexpected' ? errorLine(last) : '',
        spec: path.relative(ROOT, test.location.file).replace(/\\/g, '/'),
        severity: md?.severity,
        description: md?.description,
        preconditions: md?.preconditions,
        testData: md?.testData,
        steps: md?.steps,
        expectedResult: md?.expectedResult,
        actualResult: md?.actualResult,
        module: md?.feature,
      });
    }
    if (!results.length) return;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const payload = path.join(OUT_DIR, `run-${Date.now()}.json`);
    fs.writeFileSync(payload, JSON.stringify({ results }, null, 1));
    const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    console.log(`\n[excel-sync] updating the test case workbooks with ${results.length} result(s)...`);
    const run = spawnSync(python, [SCRIPT, payload], { stdio: 'inherit', timeout: 5 * 60 * 1000 });
    if (run.error) {
      console.warn(`[excel-sync] could not run ${python} (${run.error.message}). Results kept in ${payload} - apply with: npm run excel:sync -- "${payload}"`);
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}

export default ExcelSyncReporter;
