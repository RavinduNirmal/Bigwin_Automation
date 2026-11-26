import { defineConfig } from '@playwright/test';

/** Tiny config that only exports the test case metadata to JSON (npm run excel:refresh) - no browser, no login. */
export default defineConfig({
  testDir: '.',
  testMatch: /metadata-dump\.spec\.ts$/,
  reporter: [['line']],
  outputDir: '../../test-results/metadata-dump',
});
