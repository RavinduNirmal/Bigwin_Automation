// import { defineConfig, devices } from '@playwright/test';
// import path from 'path';

// /**
//  * Playwright Configuration
//  * 
//  * Industry Best Practices:
//  * - Parallel execution for faster test runs
//  * - Retry configuration for flaky tests
//  * - Multi-browser testing
//  * - Environment-specific configuration
//  * - Allure reporter integration
//  * - Video and screenshot on failure
//  */
// export default defineConfig({
//   testDir: './tests',
//   fullyParallel: true,
//   forbidOnly: !!process.env.CI,
//   retries: process.env.CI ? 2 : 1,
//   workers: process.env.CI ? 4 : undefined,
//   reporter: [
//     ['html', { outputFolder: 'playwright-report' }],
//     ['list'],
//     ['json', { outputFile: process.env.PW_JSON_FILE || 'test-results.json' }],
//     ['allure-playwright', { outputFolder: 'allure-results' }]
//   ],
//   use: {
//     baseURL: process.env.BASE_URL || 'http://138.201.99.178:4060',
//     trace: 'on-first-retry',
//     screenshot: 'only-on-failure',
//     video: 'retain-on-failure',
//     actionTimeout: 10000,
//     navigationTimeout: 15000,
//   },
//   projects: [
//     {
//       name: 'chromium',
//       use: { ...devices['Desktop Chrome'] },
//     },
//     {
//       name: 'firefox',
//       use: { ...devices['Desktop Firefox'] },
//     },
//     {
//       name: 'webkit',
//       use: { ...devices['Desktop Safari'] },
//     },
//   ],
//   globalSetup: path.join(__dirname, 'config', 'global-setup.ts'),
//   globalTeardown: path.join(__dirname, 'config', 'global-teardown.ts'),
// });


import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { STORAGE_STATE } from './config/auth-paths';

export default defineConfig({
  testDir: './tests',
  // The network-rerun round (scripts/run-with-network-rerun.js) writes its reports to separate
  // folders via PW_OUTPUT_DIR / PW_HTML_DIR / PW_JSON_FILE, so round 1's reports are kept.
  outputDir: process.env.PW_OUTPUT_DIR || 'test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  
  // Adjust retry configuration
  retries: process.env.CI ? 1 : 0, // Reduce retries to avoid flaky classification
  
  // Use fewer workers for stability
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [
    // open: 'never' - otherwise a failing run opens the report and blocks the terminal,
    // so chained commands (e.g. allure:generate) never run. View it with: npx playwright show-report
    ['html', { outputFolder: process.env.PW_HTML_DIR || 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: process.env.PW_JSON_FILE || 'test-results.json' }],
    [
      'allure-playwright', 
      { 
        outputFolder: 'allure-results',
        // Add these options for better reporting
        detail: true,
        suiteTitle: true,
      }
    ]
  ],
  
  use: {
    // BASE_URL is set by config/global-setup.ts from config/env/<TEST_ENV>.json (default: dev)
    baseURL: process.env.BASE_URL || 'https://e763fesnjnk.dev.accelr.net',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 120000,
    navigationTimeout: 30000,
    // Add test-specific timeout
    testIdAttribute: 'data-testid',
  },
  
  projects: [
    // Logs in once per run and saves the session (tests/auth.setup.ts)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    // Comment out other browsers for faster runs during debugging
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  
  globalSetup: path.join(__dirname, 'config', 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'config', 'global-teardown.ts'),
});