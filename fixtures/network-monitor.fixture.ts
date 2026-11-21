import { test as base, BrowserContext, Request, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { NETWORK_RERUN_DIR } from '../config/network-rerun';

/*
 * NETWORK MONITOR (automatic - runs for every test that uses fixtures/auth.fixture.ts)
 *
 * Watches the browser's traffic during the test. If the test FAILS and there is evidence of a
 * network problem (low bandwidth, dropped connection, gateway down), the test is written to
 * NETWORK_RERUN_DIR. `npm run test:network-rerun` reads that folder after the run and re-runs only
 * those tests. A test that fails for any other reason (a real app bug) is NOT re-run.
 *
 * Evidence of a network problem:
 *  - a request failed at network level (net::ERR_TIMED_OUT, ERR_CONNECTION_RESET, ...)
 *  - a gateway error from the server (502 / 503 / 504)
 *  - a request took longer than NETWORK_SLOW_MS, or was still pending at the end (stalled)
 *  - the failure message itself is a network error (page.goto timeout, ECONNRESET, ...)
 *
 * Tests that cut the network ON PURPOSE (page.route(...).abort) to check the app's error handling
 * are tagged '@simulated-network' and are never treated as network failures.
 */

export const SIMULATED_NETWORK_TAG = '@simulated-network';

/** A request slower than this counts as a network problem (default 20s; env NETWORK_SLOW_MS). */
const SLOW_MS = Number(process.env.NETWORK_SLOW_MS) || 20000;

/**
 * net::ERR_ABORTED is not a network problem: the browser aborts pending requests whenever the page
 * navigates or reloads.
 */
const IGNORED_FAILURES = /net::ERR_ABORTED/;

const NETWORK_ERROR_MESSAGE =
  /net::ERR_(?!ABORTED)\w+|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|page\.(goto|reload): Timeout|Navigation timeout/i;

export interface NetworkRerunEntry {
  testId: string;
  /** Location to re-run, e.g. tests/e2e/lottery-type/lottery_type_search.spec.ts:120 */
  location: string;
  title: string;
  project: string;
  status: string;
  evidence: string[];
}

const short = (url: string) => url.replace(/^https?:\/\/[^/]+/, '').slice(0, 100);

function entryFile(testInfo: TestInfo): string {
  return path.join(NETWORK_RERUN_DIR, `${testInfo.testId}.json`);
}

/** Watch one browser context; returns a function that reports the evidence collected so far. */
function watch(context: BrowserContext): () => string[] {
  const evidence: string[] = [];
  const started = new Map<Request, number>();

  context.on('request', (req) => started.set(req, Date.now()));
  context.on('requestfinished', (req) => {
    const ms = Date.now() - (started.get(req) ?? Date.now());
    started.delete(req);
    if (ms > SLOW_MS) evidence.push(`slow request (${(ms / 1000).toFixed(1)}s): ${req.method()} ${short(req.url())}`);
  });
  context.on('requestfailed', (req) => {
    started.delete(req);
    const reason = req.failure()?.errorText ?? 'unknown';
    if (!IGNORED_FAILURES.test(reason)) evidence.push(`request failed (${reason}): ${req.method()} ${short(req.url())}`);
  });
  context.on('response', (res) => {
    if ([502, 503, 504].includes(res.status())) {
      evidence.push(`gateway error ${res.status()}: ${res.request().method()} ${short(res.url())}`);
    }
  });

  return () => {
    const now = Date.now();
    const stalled = [...started.entries()]
      .filter(([, t]) => now - t > SLOW_MS)
      .map(([req, t]) => `stalled request (no response after ${((now - t) / 1000).toFixed(1)}s): ${req.method()} ${short(req.url())}`);
    return [...evidence, ...stalled];
  };
}

export const test = base.extend<{ networkMonitor: void }>({
  networkMonitor: [
    async ({ context }, use, testInfo) => {
      const collect = watch(context);

      // Demo / self-check: SIMULATE_NETWORK_FAILURE=<TC id or title text> makes matching tests
      // time out on every API call - ONLY in the first round, so the rerun round can pass.
      const simulate = process.env.SIMULATE_NETWORK_FAILURE;
      if (simulate && !process.env.NETWORK_RERUN_ROUND && testInfo.title.includes(simulate)) {
        await context.route('**/api/**', (route) => route.abort('timedout'));
      }

      await use();

      const file = entryFile(testInfo);
      const failed = testInfo.status !== testInfo.expectedStatus;
      const simulated = testInfo.tags.includes(SIMULATED_NETWORK_TAG);

      const evidence = collect();
      const message = testInfo.error?.message ?? '';
      const fromMessage = message.match(NETWORK_ERROR_MESSAGE);
      if (fromMessage) evidence.unshift(`failure message: ${fromMessage[0]}`);

      if (!failed || simulated || evidence.length === 0) {
        // Passed (maybe on a retry), simulated on purpose, or a real app failure: not for rerun
        fs.rmSync(file, { force: true });
        return;
      }

      const entry: NetworkRerunEntry = {
        testId: testInfo.testId,
        location: `${path.relative(process.cwd(), testInfo.file).replace(/\\/g, '/')}:${testInfo.line}`,
        title: testInfo.title,
        project: testInfo.project.name,
        status: testInfo.status ?? 'failed',
        evidence: [...new Set(evidence)].slice(0, 15),
      };
      fs.mkdirSync(NETWORK_RERUN_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(entry, null, 2));

      testInfo.annotations.push({ type: 'network-issue', description: entry.evidence[0] });
      await testInfo.attach('network-issue', {
        body: `Failed with network evidence - queued for the network rerun round:\n\n${entry.evidence.join('\n')}`,
        contentType: 'text/plain',
      });
    },
    { auto: true },
  ],
});
