import { Page, Locator, Response, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { TableComponent } from '../../components/table.component';
import { SearchComponent } from '../../components/search.component';
import { DrawTab } from '../../data/factories/lottery-draw-data.factory';
import { SERVER_SAVE_TIMEOUT } from '../../config/timeouts';

export type DrawColumn = 'Draw Code' | 'Lottery Name' | 'Draw Number' | 'Status' | 'Type' | 'Start Date' | 'Cut Off Date'
  | 'Draw Date' | 'Ticket Count' | 'Bought Count' | 'Remaining Count';

/** Row-menu actions. Review/Reject and Approve/Reject share one menu item, so they are separate buttons. */
export type DrawAction = 'View' | 'Add Tickets' | 'Quick Settings' | 'Review Draw' | 'Approve Draw' | 'Reject Draw' | 'Reject' | 'Hold Draw';

export interface DrawRow {
  code: string;
  lotteryName: string;
  drawNumber: string;
  status: string;
  type: string;
  startDate: string;
  cutOffDate: string;
  drawDate: string;
  ticketCount: string;
  boughtCount: string;
  remainingCount: string;
}

/**
 * Lottery Draws list - sidebar "Lottery Draws" -> "Draws" (/dashboard/draw).
 *
 * heading "Lottery Draws"; "Create Draw" (link-wrapped button); "Process Logs"; "Search..." (Enter);
 * 11 stage tabs: All, Under Review, Pending Approval, Approved, In Play, In Play Post Cutoff, Completed,
 * Winning Uploaded, On Hold, Rejected, Deleted (list API POST /api/draw {view: all | underReview | ...}).
 * Columns: Draw Code, Lottery Name, Draw Number, Status, Type, Start Date, Cut Off Date, Draw Date,
 * Ticket Count, Bought Count, Remaining Count. Draw Code / Lottery Name link to the draw view page.
 * Row menu (unnamed icon button): View, Add Tickets, Quick Settings, [Reject Draw | Review Draw] or
 * [Reject | Approve Draw], Hold Draw.
 * Review: PUT /api/draw/review/{id}. Approve: dialog "Approve Draw" with "Enter MD5 Checksum *"
 * (button disabled until filled) -> PUT /api/draw/approve/{id}/{md5}.
 */
export class LotteryDrawListPage extends BasePage {
  private readonly table: TableComponent;
  private readonly search: SearchComponent;
  private readonly heading: Locator;
  private readonly drawsLink: Locator;
  private readonly lotteryDrawsMenuButton: Locator;

  static readonly PATH = '/dashboard/draw';
  static readonly LIST_API = /\/api\/draw$/;

  constructor(page: Page) {
    super(page);
    this.table = new TableComponent(page);
    this.search = new SearchComponent(page, LotteryDrawListPage.LIST_API);
    this.heading = page.getByRole('heading', { name: 'Lottery Draws', exact: true });
    const sidebar = page.getByRole('navigation');
    this.lotteryDrawsMenuButton = sidebar.getByRole('button', { name: 'Lottery Draws', exact: true });
    this.drawsLink = sidebar.getByRole('link', { name: 'Draws', exact: true });
  }

  pageHeading(): Locator { return this.heading; }
  createDrawButton(): Locator { return this.page.getByRole('button', { name: 'Create Draw', exact: true }); }
  processLogsButton(): Locator { return this.page.getByRole('button', { name: 'Process Logs', exact: true }); }
  searchBox(): Locator { return this.search.getSearchInput(); }
  dataTable(): Locator { return this.table.getTable(); }
  dataRows(): Locator { return this.table.getRows(); }
  columnHeader(column: DrawColumn): Locator { return this.page.getByRole('columnheader', { name: column, exact: true }); }
  tab(name: DrawTab): Locator { return this.page.getByRole('tab', { name, exact: true }); }
  rowMenu(): Locator { return this.page.getByRole('menu'); }
  /** A row-menu action by its exact text (never matches "Reject Draw" when asking for "Review Draw"). */
  menuAction(name: DrawAction): Locator { return this.rowMenu().getByText(name, { exact: true }); }
  approveDialog(): Locator { return this.page.getByRole('dialog', { name: 'Approve Draw' }); }
  approveMd5Input(): Locator { return this.approveDialog().getByRole('textbox', { name: /MD5 Checksum/ }); }
  approveConfirmButton(): Locator { return this.approveDialog().getByRole('button', { name: 'Approve Draw', exact: true }); }

  /** Data row whose Draw Code cell is exactly `code`. */
  rowFor(code: string): Locator {
    return this.dataRows().filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  codeLinkFor(code: string): Locator {
    return this.rowFor(code).first().getByRole('link', { name: code, exact: true });
  }

  // ---------------------------------------------------------------- navigation

  async goto(): Promise<void> {
    if (!(await this.drawsLink.isVisible())) await this.lotteryDrawsMenuButton.click({ timeout: 30000 });
    await this.drawsLink.click();
    await expect(this.page).toHaveURL(/\/dashboard\/draw$/);
    await this.verifyPageLoaded();
  }

  async open(): Promise<void> {
    await this.page.goto(LotteryDrawListPage.PATH);
    await this.verifyPageLoaded();
  }

  async verifyPageLoaded(): Promise<void> {
    await expect(this.heading, '"Lottery Draws" heading should be visible').toBeVisible({ timeout: 30000 });
    await expect(this.search.getSearchInput()).toBeVisible();
    await expect(this.table.getTable()).toBeVisible({ timeout: SERVER_SAVE_TIMEOUT });
    this.logger.info('✅ Lottery Draws page loaded');
  }

  // ---------------------------------------------------------------- list

  private waitForList(): Promise<Response> {
    return this.page.waitForResponse(
      (res) => LotteryDrawListPage.LIST_API.test(new URL(res.url()).pathname) && res.request().method() === 'POST',
      { timeout: SERVER_SAVE_TIMEOUT }
    );
  }

  async selectTab(name: DrawTab): Promise<void> {
    const loaded = this.waitForList();
    await this.tab(name).click();
    await loaded;
    await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
  }

  /** Search and wait for the table to show the result (rows re-render after the API answers). */
  async searchDraws(term: string): Promise<void> {
    await this.search.search(term);
    const needle = term.trim().toLowerCase();
    try {
      await expect
        .poll(async () => (await this.dataRows().allInnerTexts()).every((r) => r.toLowerCase().includes(needle)), { timeout: 5000 })
        .toBe(true);
    } catch {
      // best effort
    }
  }

  /** Is the draw listed in the given tab (searches its code there)? */
  async isListedIn(code: string, tab: DrawTab): Promise<boolean> {
    await this.selectTab(tab);
    await this.searchDraws(code);
    return this.rowFor(code).first().waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false);
  }

  async findDraw(code: string): Promise<Locator> {
    await this.searchDraws(code);
    const row = this.rowFor(code).first();
    await expect(row, `Draw "${code}" should be listed`).toBeVisible({ timeout: 15000 });
    return row;
  }

  /** Search the draw, then read its row. */
  async getDrawData(code: string): Promise<DrawRow> {
    await this.findDraw(code);
    return this.readDrawRow(code);
  }

  /** Read the row of a draw that is already shown (no new search request). */
  async readDrawRow(code: string): Promise<DrawRow> {
    const row = this.rowFor(code).first();
    await expect(row, `Draw "${code}" should be shown`).toBeVisible({ timeout: 15000 });
    const headers = (await this.page.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
    const at = (c: DrawColumn) => cells[headers.indexOf(c)] ?? '';
    return {
      code: at('Draw Code'), lotteryName: at('Lottery Name'), drawNumber: at('Draw Number'), status: at('Status'),
      type: at('Type'), startDate: at('Start Date'), cutOffDate: at('Cut Off Date'), drawDate: at('Draw Date'),
      ticketCount: at('Ticket Count'), boughtCount: at('Bought Count'), remainingCount: at('Remaining Count'),
    };
  }

  /** Open the row menu of a draw already shown in the table and return its action texts. */
  async openRowMenu(code: string): Promise<string[]> {
    await this.rowFor(code).first().getByRole('button').last().click();
    await expect(this.rowMenu(), 'Row menu should open').toBeVisible();
    return (await this.rowMenu().locator('button, [role="menuitem"]').allInnerTexts())
      .flatMap((t) => t.split('\n')).map((t) => t.trim()).filter(Boolean);
  }

  async closeRowMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.rowMenu()).toBeHidden();
  }

  /** Search the draw (All tab), row menu -> "Review Draw". Returns the review API response. */
  async reviewDraw(code: string): Promise<Response> {
    await this.findDraw(code);
    await this.openRowMenu(code);
    await expect(this.menuAction('Review Draw'), '"Review Draw" should be offered').toHaveCount(1);
    const res = this.page.waitForResponse((r) => /\/api\/draw\/review\//.test(r.url()) && r.request().method() === 'PUT', { timeout: SERVER_SAVE_TIMEOUT });
    await this.menuAction('Review Draw').click();
    const response = await res;
    this.logger.info(`🔎 Review draw ${code}: HTTP ${response.status()} ${await response.text().catch(() => '')}`);
    return response;
  }

  /** Open the "Approve Draw" dialog for a draw (search, row menu -> "Approve Draw"). */
  async openApproveDialog(code: string): Promise<void> {
    await this.findDraw(code);
    await this.openRowMenu(code);
    await expect(this.menuAction('Approve Draw'), '"Approve Draw" should be offered').toHaveCount(1);
    await this.menuAction('Approve Draw').click();
    await expect(this.approveDialog(), '"Approve Draw" dialog should open').toBeVisible();
  }

  /** Approve with the given MD5 (dialog -> "Enter MD5 Checksum" -> Approve Draw). Returns the API response. */
  async approveDraw(code: string, md5: string): Promise<Response> {
    await this.openApproveDialog(code);
    await this.approveMd5Input().fill(md5);
    const res = this.page.waitForResponse((r) => /\/api\/draw\/approve\//.test(r.url()) && r.request().method() === 'PUT', { timeout: SERVER_SAVE_TIMEOUT });
    await this.approveConfirmButton().click();
    const response = await res;
    this.logger.info(`✅ Approve draw ${code}: HTTP ${response.status()} ${await response.text().catch(() => '')}`);
    return response;
  }

  /**
   * Reject a draw that is Under Review / Pending Approval (row menu "Reject Draw" / "Reject").
   * Handles an optional confirmation dialog (reason text + confirm button).
   */
  async rejectDraw(code: string, reason = 'Rejected by automated test cleanup'): Promise<Response | null> {
    await this.findDraw(code);
    const actions = await this.openRowMenu(code);
    const label = actions.includes('Reject Draw') ? 'Reject Draw' : actions.includes('Reject') ? 'Reject' : null;
    if (!label) {
      await this.closeRowMenu();
      return null;
    }
    const res = this.page.waitForResponse((r) => /\/api\/draw\/reject/.test(r.url()) && r.request().method() !== 'GET', { timeout: SERVER_SAVE_TIMEOUT }).catch(() => null);
    this.page.once('dialog', (d) => void d.accept());
    await this.menuAction(label).click();
    const dialog = this.page.getByRole('dialog');
    if (await dialog.isVisible().catch(() => false)) {
      const reasonBox = dialog.getByRole('textbox');
      if ((await reasonBox.count()) > 0) await reasonBox.first().fill(reason);
      await dialog.getByRole('button', { name: /^(reject|confirm|yes|submit|ok)/i }).last().click();
    }
    const response = await res;
    this.logger.info(`🚫 Reject draw ${code}: HTTP ${response?.status() ?? 'no request seen'}`);
    return response;
  }
}
