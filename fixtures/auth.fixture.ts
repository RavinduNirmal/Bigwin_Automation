import { expect, Page } from '@playwright/test';
import { test as base } from './network-monitor.fixture'; // adds the automatic network monitor
import * as fs from 'fs';
import { LoginPage } from '../pages/auth/login.page';
import { LotteryTypePage } from '../pages/lottery-type/lottery-type.page';
import { LotteryBrandFormPage } from '../pages/lottery-brand/lottery-brand-form.page';
import { LotteryBrandListPage } from '../pages/lottery-brand/lottery-brand-list.page';
import { AddBrandWizardPage } from '../pages/lottery-brand/add-brand-wizard.page';
import { LotteryBrandDetailPage } from '../pages/lottery-brand/lottery-brand-detail.page';
import { CreateDrawPage } from '../pages/draw/create-draw.page';
import { Logger } from '../utils/logger';
import { STORAGE_STATE } from '../config/auth-paths';

/**
 * Auth fixtures for the BigWin admin portal.
 *
 * The session saved by tests/auth.setup.ts (localStorage token) is loaded through the chromium
 * project's `storageState`, so pages open already logged in.
 *
 * `authenticatedPage` opens the dashboard with that session, clicks through the real sidebar
 * (Lottery -> Lottery Type) and yields `{ page, loginPage, lotteryTypePage }`.
 *
 * Tests of the login page itself must start logged OUT:
 *   test.use({ restoreSession: false, storageState: { cookies: [], origins: [] } })
 */
type AuthOptions = {
  /** false = don't require/check the saved session (login-page tests). */
  restoreSession: boolean;
};

type AuthFixtures = {
  loginPage: LoginPage;
  lotteryTypePage: LotteryTypePage;
  /** Lottery Brand "Add New Brand" form - read-only, used to check which lottery types are offered for use. */
  lotteryBrandFormPage: LotteryBrandFormPage;
  /** Lottery Brands list (/dashboard/lottery). */
  lotteryBrandListPage: LotteryBrandListPage;
  /** "Add New Brand" 4-step wizard. */
  addBrandWizardPage: AddBrandWizardPage;
  /** A brand's own page (view / edit / Review / Approve / Operation logs). */
  lotteryBrandDetailPage: LotteryBrandDetailPage;
  /** Create Draw form - READ-ONLY, used to check which brands are offered for use. */
  createDrawPage: CreateDrawPage;
  authenticatedPage: {
    page: Page;
    loginPage: LoginPage;
    lotteryTypePage: LotteryTypePage;
  };
  adminCredentials: {
    username: string;
    password: string;
    otp: string;
  };
};

export const test = base.extend<AuthFixtures & AuthOptions>({
  restoreSession: [true, { option: true }],

  context: async ({ context, restoreSession }, use) => {
    if (restoreSession && !fs.existsSync(STORAGE_STATE)) {
      throw new Error(
        `No saved session at ${STORAGE_STATE}. Run through the "chromium" project ` +
        `(it depends on "setup"), or run: npx playwright test --project=setup`
      );
    }
    await use(context);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  lotteryTypePage: async ({ page }, use) => {
    await use(new LotteryTypePage(page));
  },

  lotteryBrandFormPage: async ({ page }, use) => {
    await use(new LotteryBrandFormPage(page));
  },

  lotteryBrandListPage: async ({ page }, use) => {
    await use(new LotteryBrandListPage(page));
  },

  addBrandWizardPage: async ({ page }, use) => {
    await use(new AddBrandWizardPage(page));
  },

  lotteryBrandDetailPage: async ({ page }, use) => {
    await use(new LotteryBrandDetailPage(page));
  },

  createDrawPage: async ({ page }, use) => {
    await use(new CreateDrawPage(page));
  },

  authenticatedPage: async ({ loginPage, lotteryTypePage }, use) => {
    const logger = new Logger();
    const page = lotteryTypePage.page;
    logger.info(`🔐 Opening app with saved session (Worker: ${process.env.TEST_WORKER_INDEX || 'unknown'})...`);

    // A rejected token shows up as 401/403 from the API - fail fast with a clear message
    const authFailures: string[] = [];
    const onResponse = (response: { status(): number; url(): string }) => {
      if (response.status() === 401 || response.status() === 403) {
        authFailures.push(`${response.status()} ${response.url()}`);
      }
    };
    page.on('response', onResponse);
    const sessionRejected = () =>
      new Error(
        `Saved session was rejected by the server (${authFailures[0]}). The token has probably ` +
        `expired - re-run the tests so the "setup" project logs in again.`
      );

    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto('/', { waitUntil: 'domcontentloaded' });
          break;
        } catch (error) {
          if (authFailures.length > 0) throw sessionRejected();
          logger.warn(`⚠️ Dashboard load attempt ${attempt} failed: ${String(error).split('\n')[0]}`);
          if (attempt === 3) throw error;
        }
      }

      // The app sends a logged-out user back to the login page
      const sidebar = page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true });
      await expect(sidebar.or(loginPage.emailField()).first()).toBeVisible({ timeout: 60000 });
      if (await loginPage.emailField().isVisible()) {
        throw new Error('Saved session was not accepted - the app showed the login page. Re-run so "setup" logs in again.');
      }

      await lotteryTypePage.goto();
      await lotteryTypePage.verifyPageLoaded();
      if (authFailures.length > 0) throw sessionRejected();
      page.off('response', onResponse);
      logger.info('✅ Authenticated session ready on Lottery Type');

      await use({ page, loginPage, lotteryTypePage });
    } catch (error) {
      logger.error(`❌ Failed to setup authenticated session: ${error}`);
      throw error;
    }
  },

  adminCredentials: async ({}, use) => {
    await use({
      username: process.env.ADMIN_USERNAME || '',
      password: process.env.ADMIN_PASSWORD || '',
      otp: process.env.ADMIN_OTP || '',
    });
  },
});

export { expect } from '@playwright/test';
