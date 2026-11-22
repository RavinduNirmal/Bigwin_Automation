import { test, expect } from '../../../fixtures/auth.fixture';
import { AllureHelpers } from '../../../utils/allure-helpers';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLoginMetadata } from '../../../data/metadata/login';
import { lotteryTypeDataFactory } from '../../../data/factories/lottery-type-data.factory';
import { LOGIN_RESPONSE_TIMEOUT } from '../../../pages/auth/login.page';

registerLoginMetadata();

/**
 * BigWin admin login (/auth/jwt/login): email + password, then a 6-digit OTP.
 * These tests start LOGGED OUT - they must not reuse the saved session.
 */
test.describe('Login - logged out', () => {
  test.describe.configure({ mode: 'default', timeout: 240000 });
  test.use({ restoreSession: false, storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.verifyPageLoaded();
  });

  test('TC-LOGIN-001: Login page shows all login controls', async ({ loginPage, page }) => {
    await TestHelper.initTest('TC-LOGIN-001', page);
    await expect(page).toHaveTitle('Login | BigWin');
    await expect(loginPage.emailField()).toBeEnabled();
    await expect(loginPage.passwordField()).toBeEnabled();
    await expect(loginPage.loginSubmitButton()).toBeEnabled();
    await expect(loginPage.forgotPassword(), '"Forgot password" link should be visible').toBeVisible();
    await expect(loginPage.infoMessage(), 'Info message about Email and password should be visible').toContainText('You can use');
    await TestHelper.step(page, 'Login Page', 'Heading, Email, Password, Login, Forgot password and info message shown');
    TestHelper.success('Login page UI verified');
  });

  test('TC-LOGIN-002: Valid credentials and OTP log the admin in', async ({ loginPage, page, adminCredentials }) => {
    await TestHelper.initTest('TC-LOGIN-002', page);
    await loginPage.login(adminCredentials.username, adminCredentials.password);
    await loginPage.otpModal.waitForModal(LOGIN_RESPONSE_TIMEOUT);
    await TestHelper.step(page, 'OTP Requested', '"Verify OTP" dialog opened after valid credentials');
    await loginPage.otpModal.submitOtp(adminCredentials.otp);
    expect(loginPage.otpModal.lastAlertMessage, 'App should confirm the OTP').toBe('Successfully validated OTP');
    await loginPage.verifyLoginSuccess();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('accesstoken')), { message: 'An auth token should be stored' })
      .toBeTruthy();
    await TestHelper.step(page, 'Logged In', 'Dashboard shown');
    TestHelper.success('Admin logged in with password + OTP');
  });

  test('TC-LOGIN-003: Wrong password is rejected', async ({ loginPage, page, adminCredentials }) => {
    await TestHelper.initTest('TC-LOGIN-003', page);
    await loginPage.login(adminCredentials.username, `Wrong${Date.now()}`);
    await loginPage.verifyLoginError('Invalid email or password.');
    await expect(loginPage.otpModal.getModal(), 'No OTP dialog for a wrong password').toBeHidden();
    await loginPage.verifyStillOnLoginPage();
    await TestHelper.step(page, 'Rejected', '"Invalid email or password." shown');
    TestHelper.success('Wrong password rejected');
  });

  test('TC-LOGIN-004: Unregistered email is rejected', async ({ loginPage, page }) => {
    await TestHelper.initTest('TC-LOGIN-004', page);
    const email = `nobody.${lotteryTypeDataFactory.getUniqueSuffix()}@example.com`;
    await loginPage.login(email, 'AnyPassword1');
    await loginPage.verifyLoginError(new RegExp(`No user found|Invalid email or password`, 'i'));
    await loginPage.verifyStillOnLoginPage();
    await TestHelper.attachText('Unknown Email', email);
    TestHelper.success('Unregistered email rejected');
  });

  test('TC-LOGIN-005: Empty form shows required messages', async ({ loginPage, page }) => {
    await TestHelper.initTest('TC-LOGIN-005', page);
    await loginPage.submitLogin();
    await expect(loginPage.fieldMessage('Email is required')).toBeVisible();
    await expect(loginPage.fieldMessage('Password is required')).toBeVisible();
    await loginPage.verifyStillOnLoginPage();
    await AllureHelpers.attachScreenshot(page, 'Required Messages');
    TestHelper.success('Required messages shown');
  });

  test('TC-LOGIN-006: Malformed email shows "Must be a valid email"', async ({ loginPage, page }) => {
    await TestHelper.initTest('TC-LOGIN-006', page);
    await loginPage.fillCredentials('not-an-email', 'AnyPassword1');
    await loginPage.submitLogin();
    await expect(loginPage.fieldMessage('Must be a valid email')).toBeVisible();
    await expect(loginPage.otpModal.getModal()).toBeHidden();
    await loginPage.verifyStillOnLoginPage();
    TestHelper.success('Malformed email rejected on the client');
  });

  test('TC-LOGIN-007: Password is masked', async ({ loginPage, page }) => {
    await TestHelper.initTest('TC-LOGIN-007', page);
    await loginPage.passwordField().fill('Secret123');
    await expect(loginPage.passwordField()).toHaveAttribute('type', 'password');
    TestHelper.success('Password input is masked');
  });

  test('TC-LOGIN-008: OTP must be 6 digits', async ({ loginPage, page, adminCredentials }) => {
    await TestHelper.initTest('TC-LOGIN-008', page);
    await loginPage.login(adminCredentials.username, adminCredentials.password);
    const otp = loginPage.otpModal;
    await otp.waitForModal(LOGIN_RESPONSE_TIMEOUT);
    await otp.submitButton.click();
    await expect(otp.fieldMessage('OTP is required')).toBeVisible();
    await otp.enterOtp('12a');
    await otp.submitButton.click();
    await expect(otp.fieldMessage('OTP must be 6 digits')).toBeVisible();
    await expect(page, 'An invalid OTP must not log the user in').toHaveURL(/\/auth\/jwt\/login/);
    await TestHelper.step(page, 'OTP Validation', '"OTP is required" and "OTP must be 6 digits" shown');
    TestHelper.success('OTP format validated');
  });

  test('TC-LOGIN-009: Cancelling the OTP dialog keeps the user logged out', async ({ loginPage, page, adminCredentials }) => {
    await TestHelper.initTest('TC-LOGIN-009', page);
    await loginPage.login(adminCredentials.username, adminCredentials.password);
    await loginPage.otpModal.waitForModal(LOGIN_RESPONSE_TIMEOUT);
    await loginPage.otpModal.cancel();
    await loginPage.verifyStillOnLoginPage();
    expect(await page.evaluate(() => localStorage.getItem('accesstoken')), 'No auth token after cancelling the OTP').toBeFalsy();
    TestHelper.success('OTP cancel keeps the user logged out');
  });

  test('TC-LOGIN-010: Forgot password dialog opens and cancels', async ({ loginPage, page }) => {
    await TestHelper.initTest('TC-LOGIN-010', page);
    await loginPage.openForgotPassword();
    const dialog = loginPage.forgotPasswordDialog();
    await expect(dialog.getByRole('textbox', { name: 'Email' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Send Code to Mobile' })).toBeVisible();
    await TestHelper.step(page, 'Forgot Password', 'Dialog with Email and "Send Code to Mobile"');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    TestHelper.success('Forgot password dialog verified (no code sent)');
  });

  test('TC-LOGIN-011: Logged-out user is sent to login from a protected page', async ({ loginPage, page }) => {
    await TestHelper.initTest('TC-LOGIN-011', page);
    await page.goto('/dashboard/lottery/lottery-type');
    await expect(loginPage.emailField(), 'Login form should be shown instead of the protected page').toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/\/auth\/jwt\/login/);
    await expect(page.getByRole('heading', { name: 'Lottery Type', exact: true }), 'Protected content must not be shown').toBeHidden();
    TestHelper.success('Protected page requires login');
  });
});

test.describe('Login - with saved session', () => {
  test.describe.configure({ mode: 'default', timeout: 120000 });

  test('TC-LOGIN-012: Logged-in user opening the login page goes to the dashboard', async ({ loginPage, page }) => {
    await TestHelper.initTest('TC-LOGIN-012', page);
    await loginPage.goto();
    await loginPage.verifyLoginSuccess();
    await expect(loginPage.emailField(), 'Login form should not be shown to a logged-in user').toBeHidden();
    TestHelper.success('Saved session skips the login form');
  });
});
