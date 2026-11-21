import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { TableComponent } from '../../components/table.component';
import { SearchComponent } from '../../components/search.component';
import { SERVER_SAVE_TIMEOUT } from '../../config/timeouts';

export type BrandColumn = 'Code' | 'Brand Name' | 'Type' | 'Status' | 'Stage' | 'Price';
export type BrandTab = 'All' | 'Under Review' | 'Pending Approval' | 'Approved' | 'Deleted';
export type BrandStatusFilter = 'All' | 'Active' | 'Disabled' | 'Pending Review';
export type BrandMenuItem = 'View' | 'Edit' | 'Delete';

export interface BrandRow {
  code: string;
  name: string;
  type: string;
  status: string;
  stage: string;
  price: string;
}

/**
 * Lottery Brands list - sidebar "Lottery" -> "Lottery Brand" (/dashboard/lottery).
 *
 * heading "Lottery Brands"; link-wrapped button "Add New Brand"; tabs All / Under Review /
 * Pending Approval / Approved / Deleted ("All" selected on load); "Search..." (Enter submits) +
 * "clear"; select "Status" (All / Active / Disabled / Pending Review); table columns Code, Brand Name,
 * Type, Status, Stage, Price (sortable); Code and Brand Name cells are links to the brand page;
 * an unnamed row-actions button opens a menu View / Edit / Delete. 10 rows per page, "Page X of Y"
 * with two unnamed arrow buttons (previous, next).
 *
 * Unlike Lottery Type, the list API (POST /api/lottery) honours search, sort, tab and paging -
 * so tests find their OWN brand by searching its unique code.
 *
 * Delete runs immediately (no confirmation) and is a SOFT delete - the brand moves to "Deleted".
 */
export class LotteryBrandListPage extends BasePage {
  private readonly table: TableComponent;
  private readonly search: SearchComponent;
  private readonly heading: Locator;
  private readonly addButton: Locator;
  private readonly lotteryMenuButton: Locator;
  private readonly lotteryBrandLink: Locator;

  static readonly PATH = '/dashboard/lottery';
  static readonly LIST_API = /\/api\/lottery$/;

  constructor(page: Page) {
    super(page);
    this.table = new TableComponent(page);
    this.search = new SearchComponent(page, LotteryBrandListPage.LIST_API);
    this.heading = page.getByRole('heading', { name: 'Lottery Brands', exact: true });
    this.addButton = page.getByRole('button', { name: 'Add New Brand', exact: true });
    const sidebar = page.getByRole('navigation');
    this.lotteryMenuButton = sidebar.getByRole('button', { name: 'Lottery', exact: true });
    this.lotteryBrandLink = sidebar.getByRole('link', { name: 'Lottery Brand', exact: true });
  }

  // ---------------------------------------------------------------- accessors

  pageHeading(): Locator { return this.heading; }
  addNewBrandButton(): Locator { return this.addButton; }
  sidebarLotteryBrandLink(): Locator { return this.lotteryBrandLink; }
  searchBox(): Locator { return this.search.getSearchInput(); }
  clearSearchButton(): Locator { return this.search.getClearButton(); }
  dataTable(): Locator { return this.table.getTable(); }
  dataRows(): Locator { return this.table.getRows(); }
  pageInfo(): Locator { return this.table.getPageInfo(); }
  columnHeader(column: BrandColumn): Locator { return this.table.columnHeader(column); }
  tab(name: BrandTab): Locator { return this.page.getByRole('tab', { name, exact: true }); }
  /** The "Status" filter select (its accessible name includes the current value, e.g. "Status All"). */
  statusFilter(): Locator { return this.page.getByRole('button', { name: /^Status\b/ }).first(); }
  rowMenu(): Locator { return this.page.getByRole('menu'); }
  menuItem(name: BrandMenuItem): Locator { return this.rowMenu().getByRole('menuitem', { name, exact: true }); }

  /**
   * Pager arrows are icon buttons with no accessible name. "Page X of Y" sits in its own box; that
   * box and the two arrows share a parent (documented exception: located relative to the page info).
   */
  previousPageButton(): Locator { return this.pageInfo().locator('../..').getByRole('button').nth(0); }
  nextPageButton(): Locator { return this.pageInfo().locator('../..').getByRole('button').nth(1); }

  /** Data row whose Code cell is exactly `code`. */
  rowFor(code: string): Locator {
    return this.dataRows().filter({ has: this.page.getByRole('cell', { name: code.trim(), exact: true }) });
  }

  /** Row-actions button - an icon with no accessible name, the last button in the row. */
  actionsButtonFor(code: string): Locator {
    return this.rowFor(code).first().getByRole('button').last();
  }

  codeLinkFor(code: string): Locator {
    return this.rowFor(code).first().getByRole('link', { name: code, exact: true });
  }

  /** Markup rendered inside a row (deliberate CSS check that names are shown as plain text). */
  renderedMarkupIn(code: string): Locator {
    return this.rowFor(code).locator('b, img, script');
  }

  // ---------------------------------------------------------------- navigation

  /** Navigate through the real sidebar: "Lottery" -> "Lottery Brand". */
  async goto(): Promise<void> {
    if (!(await this.lotteryBrandLink.isVisible())) {
      await this.lotteryMenuButton.click({ timeout: 30000 });
    }
    await this.lotteryBrandLink.click();
    await expect(this.page).toHaveURL(/\/dashboard\/lottery$/);
    await this.verifyPageLoaded();
    this.logger.info('📍 Navigated to Lottery Brands');
  }

  /** Open the list directly by URL (e.g. after a brand page). */
  async open(): Promise<void> {
    await this.page.goto(LotteryBrandListPage.PATH);
    await this.verifyPageLoaded();
  }

  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading, '"Lottery Brands" heading should be visible').toBeVisible({ timeout: 30000 });
    await expect(this.addButton, '"Add New Brand" should be visible').toBeVisible();
    await expect(this.search.getSearchInput(), 'Search box should be visible').toBeVisible();
    await expect(this.table.getTable(), 'Brand table should be visible').toBeVisible({ timeout: SERVER_SAVE_TIMEOUT });
    // the tabs stay disabled while the list is loading
    await expect(this.tab('All'), 'Tabs should be enabled once the list has loaded').toBeEnabled({ timeout: SERVER_SAVE_TIMEOUT });
    this.logger.info('✅ Lottery Brands page loaded');
  }

  async openAddNewBrand(): Promise<void> {
    await this.addButton.click();
    await expect(this.page).toHaveURL(/\/dashboard\/lottery\/add-lottery-brand/, { timeout: 30000 });
  }

  // ---------------------------------------------------------------- list requests

  private waitForList(): Promise<unknown> {
    return this.page.waitForResponse(
      (res) => LotteryBrandListPage.LIST_API.test(new URL(res.url()).pathname) && res.request().method() === 'POST',
      { timeout: SERVER_SAVE_TIMEOUT }
    );
  }

  /**
   * Search and wait until the table has re-rendered for it. The API answers before React re-renders,
   * so without this wait a "row present / absent" check could read the PREVIOUS rows.
   * (Best effort: for terms no row can literally contain, e.g. "%", it just waits briefly.)
   */
  async searchBrands(term: string): Promise<void> {
    await this.search.search(term);
    const needle = term.trim().toLowerCase();
    try {
      await expect
        .poll(async () => {
          const rows = (await this.dataRows().allInnerTexts()).map((r) => r.toLowerCase());
          return rows.every((r) => r.includes(needle));
        }, { timeout: 5000 })
        .toBe(true);
    } catch {
      // best effort - see above
    }
  }

  async clearSearch(): Promise<void> {
    await this.search.clearSearch();
  }

  /** True if the brand is listed in the current tab (searches its code first). */
  async brandIsListed(code: string): Promise<boolean> {
    await this.searchBrands(code);
    return this.rowFor(code).first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false);
  }

  async selectTab(name: BrandTab): Promise<void> {
    const loaded = this.waitForList();
    await this.tab(name).click();
    await loaded;
    await expect(this.tab(name), `"${name}" tab should be selected`).toHaveAttribute('aria-selected', 'true');
  }

  async selectStatusFilter(option: BrandStatusFilter): Promise<void> {
    await this.statusFilter().click();
    const loaded = this.waitForList();
    await this.page.getByRole('option', { name: option, exact: true }).click();
    await loaded;
  }

  async statusFilterOptions(): Promise<string[]> {
    await this.statusFilter().click();
    const options = (await this.page.getByRole('option').allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  async sortByColumn(column: BrandColumn): Promise<void> {
    const loaded = this.waitForList();
    await this.table.sortByColumn(column);
    await loaded;
  }

  async goToNextPage(): Promise<void> {
    const loaded = this.waitForList();
    await this.nextPageButton().click();
    await loaded;
  }

  async goToPreviousPage(): Promise<void> {
    const loaded = this.waitForList();
    await this.previousPageButton().click();
    await loaded;
  }

  async columnValues(column: BrandColumn): Promise<string[]> {
    return this.table.getColumnValues(column);
  }

  /** "Page X of Y" as numbers. */
  async pageNumbers(): Promise<{ current: number; total: number }> {
    const [current, total] = ((await this.pageInfo().innerText()).match(/\d+/g) ?? []).map(Number);
    return { current, total };
  }

  // ---------------------------------------------------------------- rows

  /** Search the code so the brand's row is on screen, and return the row. */
  async findBrand(code: string): Promise<Locator> {
    await this.searchBrands(code);
    const row = this.rowFor(code).first();
    await expect(row, `Brand "${code}" should be listed`).toBeVisible({ timeout: 15000 });
    return row;
  }

  async getBrandData(code: string): Promise<BrandRow> {
    const row = await this.findBrand(code);
    const headers = (await this.page.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
    const at = (column: BrandColumn) => cells[headers.indexOf(column)] ?? '';
    return { code: at('Code'), name: at('Brand Name'), type: at('Type'), status: at('Status'), stage: at('Stage'), price: at('Price') };
  }

  /** Open the row menu of a brand already shown in the table. */
  async openRowMenu(code: string): Promise<void> {
    await this.actionsButtonFor(code).click();
    await expect(this.rowMenu(), 'Row actions menu should open').toBeVisible();
  }

  /** Search the code, then open its brand page through the row menu (View or Edit) or the Code link. */
  async openBrand(code: string, via: 'View' | 'Edit' | 'link' = 'Edit'): Promise<void> {
    await this.findBrand(code);
    if (via === 'link') {
      await this.codeLinkFor(code).click();
    } else {
      await this.openRowMenu(code);
      await this.menuItem(via).click();
    }
    await expect(this.page, 'Brand page should open').toHaveURL(/\/dashboard\/lottery\/edit-lottery-brand\?lotteryId=\d+/, { timeout: 30000 });
  }

  /** Search the code, row menu -> Delete. No confirmation; DELETE /api/lottery/delete/{id}. */
  async deleteBrand(code: string): Promise<void> {
    await this.findBrand(code);
    await this.openRowMenu(code);
    const deleted = this.page.waitForResponse(
      (res) => /\/api\/lottery\/delete\//.test(res.url()) && res.request().method() === 'DELETE',
      { timeout: SERVER_SAVE_TIMEOUT }
    );
    await this.menuItem('Delete').click();
    const res = await deleted;
    expect(res.status(), `DELETE of brand "${code}" should succeed`).toBeLessThan(400);
    await this.page.waitForLoadState('load');
    await this.verifyPageLoaded();
    this.logger.info(`🗑️ Brand deleted (soft): ${code}`);
  }
}
