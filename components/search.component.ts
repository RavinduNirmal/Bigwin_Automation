import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

/**
 * Search box above BigWin list tables (textbox "Search..." + a "clear" button).
 * Typing alone does nothing - the query is sent to the list API when Enter is pressed.
 */
export class SearchComponent {
  private readonly page: Page;
  private readonly logger: Logger;
  private readonly searchInput: Locator;
  private readonly clearButton: Locator;

  /** @param listApi URL pattern of the list request the search triggers (e.g. /\/api\/lottery\/types$/). */
  constructor(page: Page, private readonly listApi: RegExp) {
    this.page = page;
    this.logger = new Logger();
    this.searchInput = page.getByRole('textbox', { name: 'Search...' });
    this.clearButton = page.getByRole('button', { name: 'clear', exact: true });
  }

  getSearchInput(): Locator {
    return this.searchInput;
  }

  getClearButton(): Locator {
    return this.clearButton;
  }

  /** Type the term, press Enter and wait for the list request it triggers to finish. */
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.submit();
    this.logger.info(`🔍 Searched: ${term}`);
  }

  /** Empty the box and press Enter so the full list is requested again. */
  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.submit();
    this.logger.info('🧹 Search cleared');
  }

  private async submit(): Promise<void> {
    const listLoaded = this.page.waitForResponse(
      (res) => this.listApi.test(new URL(res.url()).pathname) && res.request().method() === 'POST',
      { timeout: 30000 }
    );
    await this.searchInput.press('Enter');
    await listLoaded;
  }

  async getSearchValue(): Promise<string> {
    return await this.searchInput.inputValue();
  }

  async verifySearchVisible(): Promise<void> {
    await expect(this.searchInput, 'Search box should be visible').toBeVisible();
    this.logger.info('✅ Search input visible');
  }
}
