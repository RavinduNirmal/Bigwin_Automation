// Seed for the Playwright Test Agents (planner / generator / healer).
// Uses the authenticatedPage fixture so agents start logged in on BigWin's Lottery Type page
// (the session token lives in localStorage and is restored from the setup project's storageState).
import { test } from '../fixtures/auth.fixture';

test.describe('Test group', () => {
  test('seed', async ({ authenticatedPage }) => {
    void authenticatedPage;
  });
});
