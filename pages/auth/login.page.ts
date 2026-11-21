import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ToastComponent } from '../../components/toast.component';
import { OtpModal } from './otp.modal';

/**
 * BigWin admin login - /auth/jwt/login
 *
 * Two steps:
 *   1. "Login" form: Email address + Password -> POST /api/auth/admin-user-login
 *      (the server can take 30s+ to answer; wrong credentials -> toast "Invalid email or password.")
 *   2. "Verify OTP" dialog: 6-digit OTP -> on success the app shows a native alert
 *      "Successfully validated OTP" and routes to the dashboard (/).
 * Client-side messages: "Email is required", "Must be a valid email", "Password is required".
 */
export const LOGIN_RESPONSE_TIMEOUT = 90000;

export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly heading: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly infoAlert: Locator;
  private readonly toast: ToastComponent;
  readonly otpModal: OtpModal;

  constructor(page: Page) {
    super(page);
    const loginForm = page.locator('form').filter({ has: page.getByRole('textbox', { name: 'Email address' }) });
    this.emailInput = loginForm.getByRole('textbox', { name: 'Email address' });
    this.passwordInput = loginForm.getByRole('textbox', { name: 'Password' });
    this.loginButton = loginForm.getByRole('button', { name: 'Login', exact: true });
    this.heading = loginForm.getByRole('heading', { name: 'Login', exact: true });
    this.forgotPasswordLink = loginForm.getByRole('link', { name: 'Forgot password' });
    this.infoAlert = loginForm.getByRole('alert').filter({ hasText: 'You can use' });
    this.toast = new ToastComponent(page);
    this.otpModal = new OtpModal(page);
  }

  emailField(): Locator {
    return this.emailInput;
  }

  passwordField(): Locator {
    return this.passwordInput;
  }

  loginSubmitButton(): Locator {
    return this.loginButton;
  }

  forgotPassword(): Locator {
    return this.forgotPasswordLink;
  }

  infoMessage(): Locator {
    return this.infoAlert;
  }

  /** A validation message shown under a field (e.g. "Email is required"). */
  fieldMessage(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /** The "Forgot Password" dialog opened by the link. */
  forgotPasswordDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Forgot Password' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/jwt/login');
  }

  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading, '"Login" heading should be visible').toBeVisible({ timeout: 30000 });
    await expect(this.emailInput, 'Email address field should be visible').toBeVisible();
    await expect(this.passwordInput, 'Password field should be visible').toBeVisible();
    await expect(this.loginButton, '"Login" button should be visible').toBeVisible();
    this.logger.info('✅ Login page loaded successfully');
  }

  async fillCredentials(email: string, password: string): Promise<void> {
    await this.safeFill(this.emailInput, email);
    await this.safeFill(this.passwordInput, password);
    this.logger.info(`🔑 Credentials entered - Email: ${email}`);
  }

  /**
   * The Email field is auto-focused. Leaving it empty and clicking a button blurs it, which shows
   * "Email is required" and pushes everything below down - so the click lands on empty space.
   * Move focus off the fields first (by clicking the heading) so the button is where we click.
   */
  private async settleLayout(): Promise<void> {
    await this.heading.click();
  }

  async submitLogin(): Promise<void> {
    await this.settleLayout();
    await this.safeClick(this.loginButton);
    this.logger.info('📤 Login form submitted');
  }

  async openForgotPassword(): Promise<void> {
    await this.settleLayout();
    await this.forgotPasswordLink.click();
    await expect(this.forgotPasswordDialog(), '"Forgot Password" dialog should open').toBeVisible();
  }

  /** Step 1 only: email + password. The OTP dialog opens if the credentials are accepted. */
  async login(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password);
    await this.submitLogin();
  }

  /** Both steps: email + password, then the OTP. Ends on the dashboard. */
  async loginWithOtp(email: string, password: string, otp: string): Promise<void> {
    await this.login(email, password);
    await this.otpModal.waitForModal(LOGIN_RESPONSE_TIMEOUT);
    await this.otpModal.submitOtp(otp);
    await this.verifyLoginSuccess();
  }

  async verifyLoginSuccess(): Promise<void> {
    await expect(this.page, 'Should leave the login page after a valid OTP').not.toHaveURL(/\/auth\//, { timeout: 60000 });
    await expect(
      this.page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }),
      'Dashboard sidebar should be visible after login'
    ).toBeVisible({ timeout: 60000 });
    this.logger.info('✅ Login successful');
  }

  async verifyLoginError(expectedMessage: string | RegExp = 'Invalid email or password.'): Promise<void> {
    await this.toast.verifyErrorToast(expectedMessage);
    this.logger.info(`✅ Error toast displayed: ${expectedMessage}`);
  }

  async verifyStillOnLoginPage(): Promise<void> {
    await expect(this.page, 'Should stay on the login page').toHaveURL(/\/auth\/jwt\/login/);
    await expect(this.emailInput, 'Email address field should be visible').toBeVisible();
    await expect(this.passwordInput, 'Password field should be visible').toBeVisible();
    this.logger.info('✅ User remains on login page');
  }

  async clearFields(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
    this.logger.info('🧹 Login fields cleared');
  }

  async getEmailValue(): Promise<string> {
    return await this.emailInput.inputValue();
  }

  async getPasswordValue(): Promise<string> {
    return await this.passwordInput.inputValue();
  }
}
