// import { defineConfig, devices } from '@playwright/test';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
//   testDir: '../tests',
//   fullyParallel: true,
//   forbidOnly: !!process.env.CI,
//   retries: process.env.CI ? 2 : 1,
//   workers: process.env.CI ? 4 : undefined,
//   reporter: [
//     ['html', { outputFolder: 'playwright-report' }],
//     ['list'],
//     ['json', { outputFile: 'test-results.json' }],
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
//   globalSetup: path.join(__dirname, 'global-setup.ts'),
//   globalTeardown: path.join(__dirname, 'global-teardown.ts'),
// });