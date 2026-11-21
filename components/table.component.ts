import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';

/**
 * BigWin list table (MUI). Accessibility tree of a list page such as Lottery Type:
 *
 *   table
 *     row (header) -> columnheader [select-all checkbox], columnheader, columnheader "Code" (sort button),
 *                     columnheader "Type Description", "Status", "Stage", columnheader (actions)
 *     row (data)   -> cell [checkbox], cell, cell "<code>", cell "<type>", cell "Active", cell "Under Review",
 *                     cell [actions button - an icon with NO accessible name, opens a menu: Edit / Delete / Logs]
 *   paragraph "Page 1 of 1"
 *
 * Data rows are the rows that contain cells (the header row only has columnheaders).
 */
export class TableComponent {
  private readonly page: Page;
  private readonly logger: Logger;
  private readonly table: Locator;
  private readonly headers: Locator;
  private readonly rows: Locator;
  private readonly pageInfo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logger = new Logger();
    this.table = page.getByRole('table');
    this.headers = this.table.getByRole('columnheader');
    this.rows = this.table.getByRole('row').filter({ has: page.getByRole('cell') });
    this.pageInfo = page.getByText(/^Page\s*\d+\s*of\s*\d+$/);
  }

  getTable(): Locator {
    return this.table;
  }

  getRows(): Locator {
    return this.rows;
  }

  /** "Page X of Y" text under the table. */
  getPageInfo(): Locator {
    return this.pageInfo;
  }

  /** Visible header texts, without the empty checkbox / actions headers. */
  async getHeaders(): Promise<string[]> {
    return (await this.headers.allInnerTexts()).map((h) => h.trim()).filter(Boolean);
  }

  async getRowCount(): Promise<number> {
    return await this.rows.count();
  }

  async getRowData(rowIndex: number): Promise<string[]> {
    return (await this.rows.nth(rowIndex).getByRole('cell').allInnerTexts()).map((t) => t.trim());
  }

  /** Text of one column for every visible data row (column = header text, e.g. "Code"). */
  async getColumnValues(column: string): Promise<string[]> {
    const headers = (await this.headers.allInnerTexts()).map((h) => h.trim());
    const index = headers.findIndex((h) => h.toLowerCase() === column.toLowerCase());
    if (index < 0) throw new Error(`Column "${column}" not found. Headers: ${headers.join(' | ')}`);
    const values: string[] = [];
    for (const row of await this.rows.all()) {
      values.push(((await row.getByRole('cell').nth(index).innerText()) || '').trim());
    }
    return values;
  }

  columnHeader(column: string): Locator {
    return this.page.getByRole('columnheader', { name: column, exact: true });
  }

  /** Click the sort button inside a column header. */
  async sortByColumn(columnName: string): Promise<void> {
    await this.columnHeader(columnName).getByRole('button', { name: columnName, exact: true }).click();
    this.logger.info(`📊 Sorted by: ${columnName}`);
  }

  async verifyTableVisible(): Promise<void> {
    await expect(this.table, 'List table should be visible').toBeVisible();
  }

  async verifyHeaders(expectedHeaders: string[]): Promise<void> {
    for (const expected of expectedHeaders) {
      await expect(this.columnHeader(expected), `"${expected}" column should be shown`).toBeVisible();
    }
    this.logger.info(`✅ Table headers verified: ${expectedHeaders.join(', ')}`);
  }

  async waitForTableLoad(timeout: number = 30000): Promise<void> {
    await expect(this.table, 'List table should be visible').toBeVisible({ timeout });
    await expect(this.rows.first(), 'Table should show at least one row').toBeVisible({ timeout });
    this.logger.info('✅ Table loaded');
  }
}
