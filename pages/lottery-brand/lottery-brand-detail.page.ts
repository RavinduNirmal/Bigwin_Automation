import { Page, Locator, Response, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AddBrandWizardPage } from './add-brand-wizard.page';
import { BrandStatus } from '../../data/factories/lottery-brand-data.factory';
import { SERVER_SAVE_TIMEOUT } from '../../config/timeouts';

/**
 * A brand's own page - /dashboard/lottery/edit-lottery-brand?lotteryId={id} (title "Lottery: Draw | BigWin").
 * Opened from the list via the Code / Brand Name link or row menu View / Edit (all the same page).
 *
 * VIEW mode: link "Back", heading "<code> | <name>", tab "View", read-only textboxes "Lottery Status",
 *   "Stage", "Lottery Type", descriptions, config; buttons by stage:
 *     Under Review -> "Review" + "Update";  Pending Approval -> "Approve" + "Update";  Approved -> "Update"
 *   and an "Operation logs" table.
 * EDIT mode (after "Update"): "Lottery Code *", "Lottery Name *", select "Status *", optional
 *   descriptions, image uploads, config; buttons "Cancel" and "Save Changes".
 *   Lottery Type and Price cannot be edited. Save -> PUT /api/lottery/{id}; toasts
 *   "Lottery brand updated successfully" / "Lottery Brand updated". Editing an Approved brand sends it
 *   back to "Under Review".
 * Review -> PUT /api/lottery/review/{id}; Approve -> PUT .../approve/... (page stays on the same URL).
 * Only ever Review/Approve the tests' OWN "AT..." brands (shared dev database).
 */
export class LotteryBrandDetailPage extends BasePage {
  readonly backLink: Locator;
  readonly statusField: Locator;
  readonly stageField: Locator;
  readonly lotteryTypeField: Locator;
  readonly reviewButton: Locator;
  readonly approveButton: Locator;
  readonly updateButton: Locator;
  // edit mode
  readonly codeInput: Locator;
  readonly nameInput: Locator;
  readonly statusSelect: Locator;
  readonly descriptionSinhala: Locator;
  readonly descriptionEnglish: Locator;
  readonly descriptionTamil: Locator;
  readonly cancelButton: Locator;
  readonly saveChangesButton: Locator;
  readonly operationLogsHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = page.getByRole('link', { name: 'Back', exact: true });
    this.statusField = page.getByRole('textbox', { name: 'Lottery Status' });
    this.stageField = page.getByRole('textbox', { name: 'Stage', exact: true });
    this.lotteryTypeField = page.getByRole('textbox', { name: 'Lottery Type' });
    this.reviewButton = page.getByRole('button', { name: 'Review', exact: true });
    this.approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    this.updateButton = page.getByRole('button', { name: 'Update', exact: true });
    this.codeInput = page.getByRole('textbox', { name: /^Lottery Code/ });
    this.nameInput = page.getByRole('textbox', { name: /^Lottery Name/ });
    this.statusSelect = page.getByRole('button', { name: /^Status \*/ });
    this.descriptionSinhala = page.getByRole('textbox', { name: /Winning Description In Sinhala/ });
    this.descriptionEnglish = page.getByRole('textbox', { name: /Winning Description In English/ });
    this.descriptionTamil = page.getByRole('textbox', { name: /Winning Description In Tamil/ });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.saveChangesButton = page.getByRole('button', { name: 'Save Changes', exact: true });
    this.operationLogsHeading = page.getByRole('heading', { name: 'Operation logs' });
  }

  /** Page heading "<code> | <name>". */
  heading(): Locator {
    return this.page.getByRole('heading', { level: 4 }).filter({ hasText: '|' });
  }

  /** The Operation logs table (the only table on the page). */
  operationLogsTable(): Locator {
    return this.page.getByRole('table');
  }

  operationLogRows(): Locator {
    return this.operationLogsTable().getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  fieldMessage(text: string | RegExp): Locator {
    return this.page.getByText(text, { exact: typeof text === 'string' });
  }

  toast(text: string | RegExp): Locator {
    return this.page.getByRole('status', { includeHidden: true }).filter({ hasText: text });
  }

  /** The app's crash screen. */
  applicationError(): Locator {
    return this.page.getByText(/Application error: a client-side exception has occurred/i);
  }

  /** Markup rendered in the heading (CSS check that a name is shown as plain text). */
  renderedMarkupInHeading(): Locator {
    return this.heading().locator('b, img, script');
  }

  brandId(): number {
    return Number(new URL(this.page.url()).searchParams.get('lotteryId'));
  }

  async verifyViewLoaded(code?: string): Promise<void> {
    await expect(this.stageField, 'Brand page Stage field should be visible').toBeVisible({ timeout: 30000 });
    await expect(this.updateButton, '"Update" button should be visible').toBeVisible();
    if (code) await expect(this.heading(), `Heading should start with "${code} |"`).toContainText(`${code} |`);
  }

  async reloadView(): Promise<void> {
    await this.page.reload();
    await this.verifyViewLoaded();
  }

  // ---------------------------------------------------------------- approval

  private async clickAndWaitPut(button: Locator, api: RegExp, what: string): Promise<Response> {
    await expect(button, `${what}: the button should be offered`).toBeVisible();
    const response = this.page.waitForResponse((res) => api.test(res.url()) && res.request().method() === 'PUT', { timeout: SERVER_SAVE_TIMEOUT });
    await button.click();
    const res = await response;
    expect(res.status(), `${what} should succeed (HTTP ${res.status()})`).toBeLessThan(400);
    return res;
  }

  /** "Review": Under Review -> Pending Approval. */
  async review(): Promise<void> {
    await this.clickAndWaitPut(this.reviewButton, /\/api\/lottery\/review\//, 'Review');
    await expect(this.stageField, 'Stage after Review').toHaveValue('Pending Approval', { timeout: SERVER_SAVE_TIMEOUT });
    this.logger.info(`🔎 Brand reviewed (id ${this.brandId()})`);
  }

  /** "Approve": Pending Approval -> Approved. */
  async approve(): Promise<void> {
    await this.clickAndWaitPut(this.approveButton, /\/api\/lottery\/[^/]*approv/i, 'Approve');
    await expect(this.stageField, 'Stage after Approve').toHaveValue('Approved', { timeout: SERVER_SAVE_TIMEOUT });
    this.logger.info(`✅ Brand approved (id ${this.brandId()})`);
  }

  // ---------------------------------------------------------------- edit mode

  async enterEditMode(): Promise<void> {
    await this.updateButton.click();
    await expect(this.saveChangesButton, 'Edit mode should show "Save Changes"').toBeVisible();
  }

  async selectStatus(status: BrandStatus): Promise<void> {
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
    await expect(this.statusSelect).toContainText(status);
  }

  async changeFields(data: { code?: string; name?: string; status?: BrandStatus; descriptionEnglish?: string; descriptionSinhala?: string; descriptionTamil?: string }): Promise<void> {
    if (data.code !== undefined) {
      await this.codeInput.fill(data.code);
      if (data.code.trim()) AddBrandWizardPage.submittedCodes.push(data.code.trim());
    }
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.status) await this.selectStatus(data.status);
    if (data.descriptionEnglish !== undefined) await this.descriptionEnglish.fill(data.descriptionEnglish);
    if (data.descriptionSinhala !== undefined) await this.descriptionSinhala.fill(data.descriptionSinhala);
    if (data.descriptionTamil !== undefined) await this.descriptionTamil.fill(data.descriptionTamil);
  }

  /** Click "Save Changes" and return the PUT /api/lottery/{id} response (null if none was sent within 8s). */
  async saveChanges(): Promise<Response | null> {
    const put = this.page.waitForResponse(
      (res) => /\/api\/lottery\/\d+$/.test(new URL(res.url()).pathname) && res.request().method() === 'PUT',
      { timeout: 8000 }
    ).catch(() => null);
    await this.saveChangesButton.click();
    return put;
  }

  /** Update -> change -> Save Changes, expecting success; ends back in view mode. */
  async editBrand(data: Parameters<LotteryBrandDetailPage['changeFields']>[0]): Promise<void> {
    await this.enterEditMode();
    await this.changeFields(data);
    const res = await this.saveChanges();
    expect(res, 'Save Changes should send PUT /api/lottery/{id}').not.toBeNull();
    expect(res!.status(), `Saving the brand should succeed: ${await res!.text().catch(() => '')}`).toBeLessThan(400);
    await expect(this.updateButton, 'Page should return to view mode after saving').toBeVisible({ timeout: SERVER_SAVE_TIMEOUT });
    this.logger.info(`✅ Brand saved (id ${this.brandId()})`);
  }

  async cancelEdit(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.updateButton, 'Cancel should return to view mode').toBeVisible();
  }
}
