import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import { LoginPage } from '../pages/auth/login.page';
import { Logger } from '../utils/logger';
import { AUTH_DIR, STORAGE_STATE } from '../config/auth-paths';

/**
 * Logs in ONCE per run (project "setup", which "chromium" depends on) and saves the session.
 *
 * BigWin login = email + password, then a 6-digit OTP (dev has a fixed bypass OTP, see
 * config/env/dev.json). The app keeps its session in localStorage (`accesstoken`, `tokenExpiry`,
 * `userId`), which Playwright's storageState captures, so the chromium project simply loads
 * STORAGE_STATE - every test starts logged in without going through the login page.
 */
setup('authenticate as admin', async ({ page }) => {
  setup.setTimeout(300000); // the login API can take 30s+ per attempt
  const logger = new Logger();
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const otp = process.env.ADMIN_OTP;
  if (!username || !password || !otp) {
    throw new Error('ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_OTP are not set - check config/env/<TEST_ENV>.json');
  }

  const loginPage = new LoginPage(page);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await loginPage.goto();
      await loginPage.verifyPageLoaded();
      await loginPage.loginWithOtp(username, password, otp);
      break;
    } catch (error) {
      logger.warn(`⚠️ Setup login attempt ${attempt} failed: ${error}`);
      if (attempt === 3) throw error;
    }
  }

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('accesstoken')), {
      message: 'App did not store an auth token (localStorage "accesstoken") after login',
    })
    .toBeTruthy();

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });

  const expiry = Number(await page.evaluate(() => localStorage.getItem('tokenExpiry')));
  if (expiry) {
    const minutesLeft = Math.round((expiry - Date.now()) / 60000);
    logger.info(`🔑 Auth token valid for ~${minutesLeft} more minutes`);
    if (minutesLeft < 60) logger.warn('⚠️ Token expires in under an hour - long runs may start failing on auth');
  }
  logger.info('✅ Auth session saved');
});
