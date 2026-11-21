import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Lottery Brand "Add New Brand" form (/dashboard/lottery/add-lottery-brand) - used READ-ONLY.
 *
 * This is where lottery types are put to use: its "Select Lottery Type *" dropdown lists the
 * lottery types a brand can be created with. The approval tests read that list to check whether
 * a lottery type is "ready for use". The form is NEVER submitted by the tests.
 *
 * (For full wizard automation see add-brand-wizard.page.ts.)
 */
export class LotteryBrandFormPage extends BasePage {
  private readonly addNewBrandButton: Locator;
  private readonly lotteryTypeSelect: Locator;
  private readonly lotteryTypeLabel: Locator;

  static readonly LIST_PATH = '/dashboard/lottery';

  constructor(page: Page) {
    super(page);
    this.addNewBrandButton = page.getByRole('button', { name: 'Add New Brand', exact: true });
    this.lotteryTypeLabel = page.getByText('Select Lottery Type', { exact: true });
    this.lotteryTypeSelect = page.getByRole('button', { name: 'Select Lottery Type' });
  }

  /** Open Lottery Brands and click "Add New Brand". */
  async open(): Promise<void> {
    await this.page.goto(LotteryBrandFormPage.LIST_PATH);
    await this.addNewBrandButton.click({ timeout: 30000 });
    await expect(this.page, 'Add Lottery Brand form should open').toHaveURL(/\/dashboard\/lottery\/add-lottery-brand/, { timeout: 30000 });
    await expect(this.lotteryTypeLabel.first(), '"Select Lottery Type" field should be shown').toBeVisible({ timeout: 30000 });
    this.logger.info('📍 Add Lottery Brand form opened');
  }

  /** Names offered in the "Select Lottery Type" dropdown (the dropdown is closed again afterwards). */
  async lotteryTypeOptions(): Promise<string[]> {
    await this.lotteryTypeSelect.click();
    const options = this.page.getByRole('option');
    await expect(options.first(), 'The lottery type dropdown should list options').toBeVisible({ timeout: 30000 });
    const names = (await options.allInnerTexts()).map((o) => o.trim()).filter(Boolean);
    await this.page.keyboard.press('Escape');
    await expect(options, 'The dropdown should close').toHaveCount(0);
    return names;
  }
}
