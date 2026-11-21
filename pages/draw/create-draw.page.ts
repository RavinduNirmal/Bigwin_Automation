import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * "Create Draw" - /dashboard/draw/create-draw (sidebar Lottery Draws > Draws > Create Draw). READ-ONLY.
 *
 * This is where lottery brands are put to use: its "Lottery Brand *" dropdown lists the brands a draw
 * can be created for (request POST /api/lottery/brands/simple {approvalStatus:'APPROVED', status:'ACTIVE'}).
 * The brand tests only read that list - they NEVER click Next or create a draw.
 */
export class CreateDrawPage extends BasePage {
  readonly heading: Locator;
  readonly brandSelect: Locator;

  static readonly PATH = '/dashboard/draw/create-draw';

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Create Draw', exact: true });
    this.brandSelect = page.getByRole('button', { name: /^Lottery Brand/ });
  }

  async open(): Promise<void> {
    await this.page.goto(CreateDrawPage.PATH);
    await expect(this.heading, '"Create Draw" heading should be visible').toBeVisible({ timeout: 30000 });
    await expect(this.brandSelect, '"Lottery Brand" select should be visible').toBeVisible();
  }

  /** Brand names offered in "Lottery Brand" (dropdown closed again afterwards). */
  async brandOptions(): Promise<string[]> {
    await this.brandSelect.click();
    const options = this.page.getByRole('option');
    await expect(options.first(), 'Brand dropdown should list options').toBeVisible({ timeout: 30000 });
    const names = (await options.allInnerTexts()).map((o) => o.trim()).filter(Boolean);
    await this.page.keyboard.press('Escape');
    await expect(options).toHaveCount(0);
    return names;
  }
}
