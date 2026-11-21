import * as path from 'path';

/**
 * Tests that failed because of a network problem are written here (one JSON file per test) by
 * fixtures/network-monitor.fixture.ts, and re-run by scripts/run-with-network-rerun.js.
 * Keep this path in sync with NETWORK_RERUN_DIR in that script. Git-ignored.
 */
export const NETWORK_RERUN_DIR = path.join(__dirname, '..', 'playwright', '.network-rerun');
