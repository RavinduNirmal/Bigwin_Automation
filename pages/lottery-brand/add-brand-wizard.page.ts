import { Page, Locator, Response, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { LotteryBrandData } from '../../data/factories/lottery-brand-data.factory';
import { SERVER_SAVE_TIMEOUT } from '../../config/timeouts';

/**
 * "Add New Brand" wizard - /dashboard/lottery/add-lottery-brand (4 steps):
 *   Step 1 Details:     "Select Lottery Type", "Code *", "Name *", "Price per ticket *" (number, default 0),
 *                       "Winning Description In Sinhala/English/Tamil (Optional)"; Next (disabled until valid); no Cancel
 *   Step 2 Symbol Pack: "Add Multiple Options" + Add, "Select Symbol Groups"; Back / Next (optional step)
 *   Step 3 Upload:      Select File / Select Logo / Select File; Back / "Add Brand"
 *                       -> the brand is CREATED here: POST /api/lottery/create (201 {status, results:<id>}),
 *                          toast "Lottery brand created succussfully" (sic) + 3x "No image file selected"
 *   Step 4 Config:      config spinbuttons (10000 / 500 / 5000 / 3000), "Continue without editing brand config",
 *                       Back / "Update Config" (or Finish once the checkbox is ticked) -> back to the list
 * Validation messages: "Code is required", "Name is required", "Price cannot be negative", "Price must be a number".
 */
export class AddBrandWizardPage extends BasePage {
  readonly heading: Locator;
  readonly lotteryTypeSelect: Locator;
  readonly codeInput: Locator;
  readonly nameInput: Locator;
  readonly priceInput: Locator;
  readonly descriptionSinhala: Locator;
  readonly descriptionEnglish: Locator;
  readonly descriptionTamil: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly addBrandButton: Locator;
  readonly continueWithoutConfigCheckbox: Locator;
  readonly finishButton: Locator;
  readonly updateConfigButton: Locator;

  static readonly PATH = '/dashboard/lottery/add-lottery-brand';
  /** Every code submitted with "Add Brand" in the current test - used by afterEach cleanup. */
  static submittedCodes: string[] = [];

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Add New Brand', exact: true });
    this.lotteryTypeSelect = page.getByRole('button', { name: 'Select Lottery Type' });
    this.codeInput = page.getByRole('textbox', { name: /^Code/ });
    this.nameInput = page.getByRole('textbox', { name: /^Name/ });
    this.priceInput = page.getByRole('spinbutton', { name: /^Price per ticket/ });
    this.descriptionSinhala = page.getByRole('textbox', { name: /Winning Description In Sinhala/ });
    this.descriptionEnglish = page.getByRole('textbox', { name: /Winning Description In English/ });
    this.descriptionTamil = page.getByRole('textbox', { name: /Winning Description In Tamil/ });
    this.nextButton = page.getByRole('button', { name: 'Next', exact: true });
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });
    this.addBrandButton = page.getByRole('button', { name: 'Add Brand', exact: true });
    this.continueWithoutConfigCheckbox = page.getByRole('checkbox', { name: /Continue without editing brand config/ });
    this.finishButton = page.getByRole('button', { name: 'Finish', exact: true });
    this.updateConfigButton = page.getByRole('button', { name: 'Update Config', exact: true });
  }

  stepHeading(step: 1 | 2 | 3 | 4): Locator {
    return this.page.getByRole('heading', { name: `Step ${step}`, exact: true });
  }

  /** A validation message on the form, e.g. "Code is required". */
  fieldMessage(text: string | RegExp): Locator {
    return this.page.getByText(text, { exact: typeof text === 'string' });
  }

  /** Toast (react-hot-toast, role=status) with the given text. */
  toast(text: string | RegExp): Locator {
    return this.page.getByRole('status', { includeHidden: true }).filter({ hasText: text });
  }

  async open(): Promise<void> {
    await this.page.goto(AddBrandWizardPage.PATH);
    await this.verifyStep1Loaded();
  }

  async verifyStep1Loaded(): Promise<void> {
    await expect(this.heading, '"Add New Brand" heading should be visible').toBeVisible({ timeout: 30000 });
    await expect(this.lotteryTypeSelect, '"Select Lottery Type" should be visible').toBeVisible();
    await expect(this.codeInput).toBeVisible();
  }

  /** Names offered in "Select Lottery Type" (dropdown is closed again afterwards). */
  async lotteryTypeOptions(): Promise<string[]> {
    await this.lotteryTypeSelect.click();
    const options = this.page.getByRole('option');
    await expect(options.first(), 'Lottery type dropdown should list options').toBeVisible({ timeout: 30000 });
    const names = (await options.allInnerTexts()).map((o) => o.trim()).filter(Boolean);
    await this.page.keyboard.press('Escape');
    await expect(options).toHaveCount(0);
    return names;
  }

  async selectLotteryType(name: string): Promise<void> {
    await this.lotteryTypeSelect.click();
    await this.page.getByRole('option', { name, exact: true }).click();
    await expect(this.lotteryTypeSelect, `Lottery type should show ${name}`).toContainText(name);
  }

  /**
   * Code typed on Step 1, remembered for cleanup: by Step 3 ("Add Brand") the Step 1 inputs are no
   * longer on the page, so the code cannot be read back from the form at submit time.
   */
  private pendingCode = '';

  /** Fill Step 1 (only the given fields). */
  async fillDetails(data: Partial<LotteryBrandData>): Promise<void> {
    if (data.lotteryType) await this.selectLotteryType(data.lotteryType);
    if (data.code !== undefined) {
      await this.codeInput.fill(data.code);
      this.pendingCode = data.code.trim();
    }
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.price !== undefined) await this.priceInput.fill(data.price);
    if (data.descriptionSinhala !== undefined) await this.descriptionSinhala.fill(data.descriptionSinhala);
    if (data.descriptionEnglish !== undefined) await this.descriptionEnglish.fill(data.descriptionEnglish);
    if (data.descriptionTamil !== undefined) await this.descriptionTamil.fill(data.descriptionTamil);
    this.logger.info(`📝 Brand details: ${data.code} / ${data.name} / ${data.price}`);
  }

  /** Step 1 -> Step 2 -> Step 3 (Symbol Pack skipped). */
  async goToUploadStep(): Promise<void> {
    await expect(this.nextButton, 'Next should be enabled on a valid Step 1').toBeEnabled();
    await this.nextButton.click();
    await expect(this.page.getByRole('heading', { name: 'Symbol Pack' })).toBeVisible();
    await this.nextButton.click();
    await expect(this.addBrandButton, 'Step 3 Upload should show "Add Brand"').toBeVisible();
  }

  /** Click "Add Brand" (creates the brand) and return the create API response. */
  async submitAddBrand(): Promise<Response> {
    if (this.pendingCode) AddBrandWizardPage.submittedCodes.push(this.pendingCode);
    const created = this.page.waitForResponse(
      (res) => /\/api\/lottery\/create$/.test(new URL(res.url()).pathname) && res.request().method() === 'POST',
      { timeout: SERVER_SAVE_TIMEOUT }
    );
    await this.addBrandButton.click();
    return created;
  }

  /** Step 4: tick "Continue without editing brand config" and Finish - back to the list. */
  async finishWithoutConfig(): Promise<void> {
    await expect(this.continueWithoutConfigCheckbox, 'Step 4 Config should be shown').toBeVisible({ timeout: SERVER_SAVE_TIMEOUT });
    await this.continueWithoutConfigCheckbox.check();
    await this.finishButton.click();
    await expect(this.page, 'Finish should return to the Lottery Brands list').toHaveURL(/\/dashboard\/lottery$/, { timeout: 30000 });
  }

  /**
   * Full happy path from Step 1: fill, Next, Next, Add Brand (expects 201), Finish.
   * Returns the new brand id. The wizard must already be open.
   */
  async createBrand(data: LotteryBrandData): Promise<number> {
    await this.fillDetails(data);
    await this.goToUploadStep();
    const res = await this.submitAddBrand();
    const body = await res.json().catch(() => ({}));
    expect(res.status(), `Creating brand "${data.code}" should succeed: ${JSON.stringify(body)}`).toBe(201);
    await this.finishWithoutConfig();
    this.logger.info(`✅ Brand created: ${data.code} (id ${body.results})`);
    return Number(body.results);
  }
}
