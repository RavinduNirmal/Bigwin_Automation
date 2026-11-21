import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { TableComponent } from '../../components/table.component';
import { SearchComponent } from '../../components/search.component';
import { ToastComponent } from '../../components/toast.component';
import { LotteryTypeCreateModal } from './lottery-type-create.modal';
import { LotteryTypeEditModal } from './lottery-type-edit.modal';
import { LotteryTypeData, STATUS_LABEL } from '../../data/factories/lottery-type-data.factory';
import { SERVER_SAVE_TIMEOUT } from '../../config/timeouts';

export { SERVER_SAVE_TIMEOUT };

/** Columns of the Lottery Type table, as shown in the header. */
export type LotteryTypeColumn = 'Code' | 'Type Description' | 'Status' | 'Stage';

export interface LotteryTypeRow {
  code: string;
  name: string;
  status: string;
  stage: string;
}

/**
 * Lottery Type list - sidebar "Lottery" -> "Lottery Type" (/dashboard/lottery/lottery-type).
 *
 * Page: heading "Lottery Type", button "Add New Type", tabs All / Active / Deleted, search box,
 * sortable columns Code / Type Description / Status / Stage, "Page X of Y".
 * Each row has an icon button (no accessible name) that opens a menu: Edit / Delete / Logs.
 *
 * App behaviour the page object accounts for:
 *  - successful Create / Update / Delete end with window.location.reload(), so actions wait for
 *    that reload before returning;
 *  - Delete has NO confirmation dialog - it runs as soon as "Delete" is clicked in the menu;
 *  - the list API returns all rows (single page).
 */
export class LotteryTypePage extends BasePage {
  private readonly table: TableComponent;
  private readonly search: SearchComponent;
  private readonly toast: ToastComponent;
  private createModalInstance: LotteryTypeCreateModal | null = null;
  private editModalInstance: LotteryTypeEditModal | null = null;
  private readonly addButton: Locator;
  private readonly heading: Locator;
  private readonly rows: Locator;
  private readonly lotteryMenuButton: Locator;
  private readonly lotteryTypeLink: Locator;

  static readonly PATH = '/dashboard/lottery/lottery-type';
  static readonly LIST_API = /\/api\/lottery\/types$/;

  constructor(page: Page) {
    super(page);
    this.table = new TableComponent(page);
    this.search = new SearchComponent(page, LotteryTypePage.LIST_API);
    this.toast = new ToastComponent(page);
    this.addButton = page.getByRole('button', { name: 'Add New Type', exact: true });
    this.heading = page.getByRole('heading', { name: 'Lottery Type', exact: true, level: 4 });
    this.rows = this.table.getRows();
    const sidebar = page.getByRole('navigation');
    this.lotteryMenuButton = sidebar.getByRole('button', { name: 'Lottery', exact: true });
    this.lotteryTypeLink = sidebar.getByRole('link', { name: 'Lottery Type', exact: true });
  }

  // ---------------------------------------------------------------- accessors (for specs)

  /** The data row whose Code cell is exactly `code`. */
  rowFor(code: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('cell', { name: code.trim(), exact: true }) });
  }

  /** Row actions button. It is an icon with no accessible name - the last button in the row. */
  actionsButtonFor(code: string): Locator {
    return this.rowFor(code).first().getByRole('button').last();
  }

  /**
   * Markup elements rendered inside a row. Used to prove user text such as "<b>x</b>" is shown
   * literally - a deliberate CSS locator, since the point is to find elements that should NOT exist.
   */
  renderedMarkupIn(code: string): Locator {
    return this.rowFor(code).locator('b, img, script');
  }

  /** The row actions menu (Edit / Delete / Logs) once it is open. */
  rowMenu(): Locator {
    return this.page.getByRole('menu');
  }

  menuItem(name: 'Edit' | 'Delete' | 'Logs'): Locator {
    return this.rowMenu().getByRole('menuitem', { name, exact: true });
  }

  searchBox(): Locator {
    return this.search.getSearchInput();
  }

  dataTable(): Locator {
    return this.table.getTable();
  }

  dataRows(): Locator {
    return this.rows;
  }

  pageInfo(): Locator {
    return this.table.getPageInfo();
  }

  columnHeaders(): Locator {
    return this.page.getByRole('columnheader');
  }

  columnHeader(column: LotteryTypeColumn): Locator {
    return this.table.columnHeader(column);
  }

  addNewTypeButton(): Locator {
    return this.addButton;
  }

  pageHeading(): Locator {
    return this.heading;
  }

  tab(name: 'All' | 'Active' | 'Deleted'): Locator {
    return this.page.getByRole('tab', { name, exact: true });
  }

  sidebarLotteryTypeLink(): Locator {
    return this.lotteryTypeLink;
  }

  toasts(): ToastComponent {
    return this.toast;
  }

  // ---------------------------------------------------------------- navigation

  /** Navigate through the real sidebar: "Lottery" -> "Lottery Type". */
  async goto(retries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (!(await this.lotteryTypeLink.isVisible())) {
          await this.lotteryMenuButton.click({ timeout: 30000 });
        }
        await this.lotteryTypeLink.click({ timeout: 10000 });
        await this.verifyUrlPattern(/\/dashboard\/lottery\/lottery-type/);
        this.logger.info('📍 Navigated to Lottery Type page');
        return;
      } catch (error) {
        this.logger.warn(`⚠️ Navigation attempt ${attempt} failed: ${error}`);
        if (attempt === retries) throw error;
        await this.page.reload().catch(() => {});
      }
    }
  }

  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading, '"Lottery Type" heading should be visible').toBeVisible({ timeout: 30000 });
    await expect(this.addButton, '"Add New Type" button should be visible').toBeVisible();
    await expect(this.search.getSearchInput(), 'Search box should be visible').toBeVisible();
    await this.table.waitForTableLoad(SERVER_SAVE_TIMEOUT);
    this.logger.info('✅ Lottery Type page loaded successfully');
  }

  /** Reload and wait until the list is shown again. */
  async reloadPage(): Promise<void> {
    await this.page.reload();
    await this.verifyPageLoaded();
  }

  // ---------------------------------------------------------------- create

  async openCreateModal(): Promise<LotteryTypeCreateModal> {
    await this.safeClick(this.addButton);
    this.createModalInstance = new LotteryTypeCreateModal(this.page);
    await this.createModalInstance.waitForModal();
    this.logger.info('📂 Create lottery type dialog opened');
    return this.createModalInstance;
  }

  /** Create through the dialog and wait for the page reload that follows a successful save. */
  async createLotteryType(data: LotteryTypeData): Promise<void> {
    const modal = await this.openCreateModal();
    await modal.fillLotteryTypeData(data);
    await this.submitAndWaitForReload(
      () => modal.submitCreate(),
      modal.getModal(),
      `Create dialog should close after saving "${data.code}"`
    );
    this.logger.info(`✅ Lottery type created: ${data.code}`);
  }

  // ---------------------------------------------------------------- row actions

  async openRowMenu(code: string): Promise<void> {
    const row = await this.findRow(code);
    await row.getByRole('button').last().click();
    await expect(this.rowMenu(), 'Row actions menu should open').toBeVisible();
  }

  async openEditModal(code: string): Promise<LotteryTypeEditModal> {
    await this.openRowMenu(code);
    await this.menuItem('Edit').click();
    this.editModalInstance = new LotteryTypeEditModal(this.page);
    await this.editModalInstance.waitForModal();
    this.logger.info(`📂 Edit dialog opened for: ${code}`);
    return this.editModalInstance;
  }

  /** Edit through the dialog and wait for the reload that follows a successful save. */
  async editLotteryType(code: string, data: Partial<LotteryTypeData>): Promise<void> {
    const modal = await this.openEditModal(code);
    await modal.changeFields(data);
    await this.submitAndWaitForReload(
      () => modal.submitUpdate(),
      modal.getModal(),
      `Update dialog should close after saving "${data.code ?? code}"`
    );
    this.logger.info(`✅ Lottery type updated: ${code}`);
  }

  /**
   * Delete via the row menu. There is no confirmation dialog: the DELETE request is sent at once,
   * then the app shows a toast and reloads the page.
   */
  async deleteLotteryType(code: string): Promise<void> {
    await this.openRowMenu(code);
    const deleted = this.page.waitForResponse(
      (res) => /\/api\/lottery\/types\/delete\//.test(res.url()) && res.request().method() === 'DELETE',
      { timeout: SERVER_SAVE_TIMEOUT }
    );
    const reloaded = this.page.waitForEvent('load', { timeout: SERVER_SAVE_TIMEOUT });
    await this.menuItem('Delete').click();
    const response = await deleted;
    expect(response.status(), `DELETE for "${code}" should succeed`).toBeLessThan(400);
    await reloaded;
    await this.verifyPageLoaded();
    this.logger.info(`🗑️ Lottery type deleted: ${code}`);
  }

  // ---------------------------------------------------------------- approval (maker-checker)

  /** Edit -> "Review": moves an "Under Review" lottery type to "Pending Approval". */
  async reviewLotteryType(code: string): Promise<void> {
    const modal = await this.openEditModal(code);
    await this.clickApprovalButton(modal.reviewButton, /\/api\/lottery\/types\/review\//, `Review of "${code}"`);
    this.logger.info(`🔎 Lottery type reviewed: ${code}`);
  }

  /** Edit -> "Approve": moves a "Pending Approval" lottery type to "Approved". */
  async approveLotteryType(code: string): Promise<void> {
    const modal = await this.openEditModal(code);
    await this.clickApprovalButton(modal.approveButton, /\/api\/lottery\/types\/approve\//, `Approval of "${code}"`);
    this.logger.info(`✅ Lottery type approved: ${code}`);
  }

  private async clickApprovalButton(button: Locator, api: RegExp, what: string): Promise<void> {
    await expect(button, `${what}: the button should be offered in the Update dialog`).toBeVisible();
    const response = this.page.waitForResponse((res) => api.test(res.url()) && res.request().method() === 'PUT', { timeout: SERVER_SAVE_TIMEOUT });
    const reloaded = this.page.waitForEvent('load', { timeout: SERVER_SAVE_TIMEOUT }).then(() => true, () => false);
    await button.click();
    const res = await response;
    expect(res.status(), `${what} should succeed (HTTP ${res.status()})`).toBeLessThan(400);
    expect(await reloaded, `${what}: the page should reload`).toBe(true);
    await this.verifyPageLoaded();
  }

  /** The app's 404 page text ("Nothing here! The page requested does not exist."). */
  notFoundMessage(): Locator {
    return this.page.getByText(/Nothing here!/i);
  }

  async openLogs(code: string): Promise<void> {
    await this.openRowMenu(code);
    await this.menuItem('Logs').click();
    this.logger.info(`📜 Logs opened for: ${code}`);
  }

  private async submitAndWaitForReload(submit: () => Promise<void>, dialog: Locator, message: string): Promise<void> {
    const reloaded = this.page.waitForEvent('load', { timeout: SERVER_SAVE_TIMEOUT }).then(() => true, () => false);
    await submit();
    await expect(dialog, `${message} - still open after ${SERVER_SAVE_TIMEOUT / 1000}s (rejected, or the server is too slow)`)
      .toBeHidden({ timeout: SERVER_SAVE_TIMEOUT });
    expect(await reloaded, 'The page should reload after a successful save').toBe(true);
    await this.verifyPageLoaded();
  }

  // ---------------------------------------------------------------- search / tabs / sort

  async searchLotteryTypes(query: string): Promise<void> {
    await this.search.search(query);
    this.logger.info(`🔍 Searched for: ${query}`);
  }

  async clearSearch(): Promise<void> {
    await this.search.clearSearch();
    this.logger.info('🧹 Search cleared');
  }

  /** Click a tab and wait for the list request it triggers. */
  async selectTab(name: 'All' | 'Active' | 'Deleted'): Promise<void> {
    const listLoaded = this.page.waitForResponse(
      (res) => LotteryTypePage.LIST_API.test(new URL(res.url()).pathname) && res.request().method() === 'POST',
      { timeout: SERVER_SAVE_TIMEOUT }
    );
    await this.tab(name).click();
    await listLoaded;
    await expect(this.tab(name), `"${name}" tab should be selected`).toHaveAttribute('aria-selected', 'true');
    this.logger.info(`🗂️ Tab selected: ${name}`);
  }

  /** Click a column's sort button and wait for the list request it triggers. */
  async sortByColumn(column: LotteryTypeColumn): Promise<void> {
    const listLoaded = this.page.waitForResponse(
      (res) => LotteryTypePage.LIST_API.test(new URL(res.url()).pathname) && res.request().method() === 'POST',
      { timeout: SERVER_SAVE_TIMEOUT }
    );
    await this.table.sortByColumn(column);
    await listLoaded;
  }

  async columnValues(column: LotteryTypeColumn): Promise<string[]> {
    return this.table.getColumnValues(column);
  }

  // ---------------------------------------------------------------- reading rows

  async findRow(code: string): Promise<Locator> {
    const row = this.rowFor(code).first();
    await expect(row, `Lottery type "${code}" should be in the table`).toBeVisible({ timeout: 10000 });
    return row;
  }

  async lotteryTypeExists(code: string, timeout: number = 2000): Promise<boolean> {
    return this.rowFor(code).first()
      .waitFor({ state: 'visible', timeout })
      .then(() => true)
      .catch(() => false);
  }

  async getLotteryTypeData(code: string): Promise<LotteryTypeRow> {
    const row = await this.findRow(code);
    const headers = (await this.columnHeaders().allInnerTexts()).map((h) => h.trim());
    const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
    const at = (column: LotteryTypeColumn) => cells[headers.indexOf(column)] ?? '';
    return { code: at('Code'), name: at('Type Description'), status: at('Status'), stage: at('Stage') };
  }

  async verifyLotteryTypeData(code: string, expected: Partial<LotteryTypeData> & { stage?: string }): Promise<void> {
    const actual = await this.getLotteryTypeData(code);
    const mismatches: string[] = [];
    if (expected.code !== undefined && actual.code !== expected.code) mismatches.push(`Code: expected "${expected.code}", table shows "${actual.code}"`);
    if (expected.name !== undefined && actual.name !== expected.name) mismatches.push(`Type: expected "${expected.name}", table shows "${actual.name}"`);
    if (expected.status !== undefined && actual.status !== STATUS_LABEL[expected.status]) {
      mismatches.push(`Status: expected "${STATUS_LABEL[expected.status]}", table shows "${actual.status}"`);
    }
    if (expected.stage !== undefined && actual.stage !== expected.stage) mismatches.push(`Stage: expected "${expected.stage}", table shows "${actual.stage}"`);
    expect(mismatches, `Saved data for "${code}" differs from what was entered`).toEqual([]);
    this.logger.info(`✅ Lottery type data verified: ${code}`);
  }

  async verifyLotteryTypeNotExists(code: string): Promise<void> {
    await expect(this.rowFor(code), `Lottery type "${code}" should not be listed`).toHaveCount(0, { timeout: 10000 });
    this.logger.info(`✅ Lottery type "${code}" is not listed`);
  }

  async verifyErrorToast(expectedMessage?: string | RegExp): Promise<void> {
    await this.toast.verifyErrorToast(expectedMessage);
  }
}
