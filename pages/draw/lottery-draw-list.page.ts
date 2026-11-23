import { Page, Locator, Response, expect, Dialog } from '@playwright/test';
import { BasePage } from '../base.page';
import { TableComponent } from '../../components/table.component';
import { SearchComponent } from '../../components/search.component';
import { ToastComponent } from '../../components/toast.component';
import { DrawTab } from '../../data/factories/lottery-draw-data.factory';
import { SERVER_SAVE_TIMEOUT } from '../../config/timeouts';

export type DrawColumn = 'Draw Code' | 'Lottery Name' | 'Draw Number' | 'Status' | 'Type' | 'Start Date' | 'Cut Off Date'
  | 'Draw Date' | 'Ticket Count' | 'Bought Count' | 'Remaining Count'
  /** hidden by default - shown with the Quick toggles chips */
  | 'Sold %' | 'Revenue' | 'Draw Show Order';

/** Row-menu actions. Review/Reject and Approve/Reject share one menu item, so they are separate buttons. */
export type DrawAction = 'View' | 'Edit' | 'Add Tickets' | 'Quick Settings' | 'Review Draw' | 'Approve Draw' | 'Reject Draw' | 'Reject' | 'Hold Draw'
  | 'Activate Draw' | 'Remove Draw' | 'Delete';

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
  private readonly toastComponent: ToastComponent;
  private readonly heading: Locator;
  private readonly drawsLink: Locator;
  private readonly lotteryDrawsMenuButton: Locator;

  static readonly PATH = '/dashboard/draw';
  static readonly LIST_API = /\/api\/draw$/;
  /** Row-action endpoints (PUT). HOLD / ACTIVATE / REMOVE are matched loosely: any /api/draw/... call with that word. */
  static readonly API = {
    REVIEW: /\/api\/draw\/review\//,
    REJECT: /\/api\/draw\/reject\//,
    SEND_BACK: /\/api\/draw\/approve-reject\//,
    /** Hold Draw / Activate Draw: ticket-service PUT .../lottery-draw/toggle-hold/{id}/1 (hold) or /0 (activate). */
    HOLD: /\/lottery-draw\/toggle-hold\/\d+\/1$/,
    ACTIVATE: /\/lottery-draw\/toggle-hold\/\d+\/0$/,
    /** Remove Draw: endpoint not documented - any non-GET call to /api/draw/<...> or ticket-service lottery-draw/<...>. */
    REMOVE: /\/api\/draw\/.+|\/lottery-draw\/.+/,
  } as const;

  constructor(page: Page) {
    super(page);
    this.table = new TableComponent(page);
    this.search = new SearchComponent(page, LotteryDrawListPage.LIST_API);
    this.toastComponent = new ToastComponent(page);
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

  // ---------------------------------------------------------------- toolbar, pager, sorting, column chips

  /** Empty-table message such as "No results" / "No data" (expected when a search matches nothing). */
  emptyStateMessage(): Locator { return this.page.getByText(/no (results|data|draws|records)/i).first(); }

  /** Any open MUI dialog (used to prove an action asked for no confirmation). */
  openDialogs(): Locator { return this.page.getByRole('dialog'); }

  clearSearchButton(): Locator { return this.page.getByRole('button', { name: 'clear', exact: true }); }

  /** A react-hot-toast message (role=status, includeHidden because an open dialog marks the page aria-hidden). */
  toast(text: string | RegExp): Locator { return this.toastComponent.withText(text).first(); }

  /** "Page [n] of N" - the text contains a zero-width space between "Page" and the input. */
  pager(): Locator { return this.page.getByRole('paragraph').filter({ hasText: /Page[\s\u200B]*of\s*\d+/ }); }
  /** Editable page-number box inside the pager (type=text with min/max). */
  pageInput(): Locator { return this.pager().getByRole('textbox'); }
  /**
   * [previous, next] pager arrows. Documented exception: they are unnamed icon buttons, so they are
   * found next to the pager text (its parent element).
   */
  pagerButtons(): Locator { return this.pager().locator('xpath=..').getByRole('button'); }
  previousPageButton(): Locator { return this.pagerButtons().first(); }
  nextPageButton(): Locator { return this.pagerButtons().last(); }

  async totalPages(): Promise<number> {
    return Number(/of\s*(\d+)/.exec(await this.pager().innerText())?.[1] ?? '0');
  }

  /** The sort button inside a column header (absent for Cut Off Date and Remaining Count). */
  sortButton(column: DrawColumn): Locator { return this.columnHeader(column).getByRole('button', { name: column }); }

  /** "Quick toggles:" column chips above the table (e.g. "Sold %", "Type"). */
  quickToggleChip(name: string): Locator {
    return this.page.getByText('Quick toggles:', { exact: true }).locator('xpath=..').getByRole('button', { name, exact: true });
  }

  /** Text of one column for every visible data row. */
  async columnValues(column: DrawColumn): Promise<string[]> {
    const headers = (await this.page.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const index = headers.indexOf(column);
    const values: string[] = [];
    for (const row of await this.dataRows().all()) {
      values.push(((await row.getByRole('cell').allInnerTexts())[index] ?? '').trim());
    }
    return values;
  }

  /** HTML elements rendered inside the cells of a draw's row (expected: none - codes are plain text). */
  renderedMarkupIn(code: string): Locator {
    return this.rowFor(code).first().getByRole('cell').locator('b, i, img, script, svg[onload]');
  }

  /** Documented CSS check: an <img src="x"> injected by an XSS payload anywhere on the page. */
  injectedImage(): Locator { return this.page.locator('img[src="x"]'); }

  // ---------------------------------------------------------------- Quick Settings / Process Logs dialogs

  quickSettingsDialog(): Locator { return this.page.getByRole('dialog').filter({ hasText: 'Quick Settings' }); }
  quickSettingsButton(name: 'Refresh' | 'Update'): Locator { return this.quickSettingsDialog().getByRole('button', { name, exact: true }); }
  /** "Set Retain Ticket Count" number box - its <label> is not associated with the input, so it is the dialog's only spinbutton. */
  quickSettingsRetainInput(): Locator { return this.quickSettingsDialog().getByRole('spinbutton'); }
  /** Quick Settings statistics table: header row (Total, Returnable, In Cart (Not Bought), ...) and one value row. */
  quickSettingsTable(): Locator { return this.quickSettingsDialog().getByRole('table'); }

  /** Quick Settings statistics as { 'Total': '100', 'Returnable': '100', ... }. */
  async quickSettingsStats(): Promise<Record<string, string>> {
    const headers = (await this.quickSettingsTable().getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const values = (await this.quickSettingsTable().getByRole('cell').allInnerTexts()).map((v) => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  }

  async openQuickSettings(code: string): Promise<void> {
    await this.findDraw(code);
    await this.openRowMenu(code);
    await this.menuAction('Quick Settings').click();
    await expect(this.quickSettingsDialog(), '"Quick Settings" dialog should open').toBeVisible();
  }

  /** Row menu "Add Tickets" -> the "Upload Files" dialog (same dialog as Create Draw Step 2). */
  async openAddTickets(code: string): Promise<void> {
    await this.findDraw(code);
    await this.openRowMenu(code);
    await this.menuAction('Add Tickets').click();
  }

  /** Add Tickets dialog 1: "Upload Files" (Browse files, Cancel, Add). */
  uploadFilesDialog(): Locator { return this.page.getByRole('dialog').filter({ hasText: 'Upload Files' }); }
  /** Add Tickets dialog 2: titled "Add Ticktes" (sic) - MD5 Checksum, Initiate Now, Scheduled At, Cancel, Create. */
  addTicketsDialog(): Locator { return this.page.getByRole('dialog').filter({ hasText: /Add Tick/ }).filter({ has: this.page.getByRole('textbox', { name: /MD5/ }) }); }
  addTicketsMd5Input(): Locator { return this.addTicketsDialog().getByRole('textbox', { name: /MD5/ }); }
  addTicketsInitiateNow(): Locator { return this.addTicketsDialog().getByRole('checkbox', { name: /Initiate Now/ }); }
  addTicketsCreateButton(): Locator { return this.addTicketsDialog().getByRole('button', { name: 'Create', exact: true }); }

  /**
   * Row menu "Add Tickets": upload `filePath`, type `md5`, tick Initiate Now, Create.
   * Returns the ticket-service ticket-upload response (201 accepted / 400 refused / 404 unknown draw),
   * or null when no request was sent (e.g. empty MD5 - the dialog stays open).
   * Set `inTab` to search the draw in another tab first (e.g. the Deleted tab).
   */
  async addTickets(code: string, filePath: string, md5: string, inTab?: DrawTab): Promise<Response | null> {
    await this.selectTab(inTab ?? 'All');   // the draw is searched in this tab (default: All)
    await this.openAddTickets(code);
    await expect(this.uploadFilesDialog(), '"Upload Files" dialog should open').toBeVisible();
    await this.page.locator('input[type="file"]').setInputFiles(filePath);   // hidden file input - documented exception
    await this.uploadFilesDialog().getByRole('button', { name: 'Add', exact: true }).click();
    await expect(this.addTicketsMd5Input(), 'The checksum dialog should open after "Add"').toBeVisible({ timeout: SERVER_SAVE_TIMEOUT });
    await this.addTicketsMd5Input().fill(md5);
    if (!(await this.addTicketsInitiateNow().isChecked())) await this.addTicketsInitiateNow().check();
    const upload = this.page
      .waitForResponse((r) => /ticket-upload(\?|$)/.test(r.url()) && r.request().method() === 'POST', { timeout: 30000 })
      .catch(() => null);
    await this.addTicketsCreateButton().click();
    const response = await upload;
    this.logger.info(`📎 Add Tickets ${code} (${filePath.split(/[\\/]/).pop()}): ${response ? `HTTP ${response.status()}` : 'no request sent'}`);
    if (!response) return null;
    await this.addTicketsDialog().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => undefined);   // a refused upload may keep it open
    return response;
  }

  /** Rejected tab: row menu "Delete" (no confirmation) -> DELETE ticket-service lottery-draw/{id}. */
  async deleteRejectedDraw(code: string): Promise<Response> {
    await this.selectTab('Rejected');
    await this.findDraw(code);
    return this.performRowAction(code, 'Delete', LotteryDrawListPage.API.REMOVE);
  }

  processLogsDialog(): Locator { return this.page.getByRole('dialog', { name: 'Process Logs' }); }
  processLogsColumn(name: string): Locator { return this.processLogsDialog().getByRole('columnheader', { name, exact: true }); }
  processLogsNextPage(): Locator { return this.processLogsDialog().getByRole('button', { name: /next page|go to next|^next$/i }); }

  async openProcessLogs(): Promise<void> {
    await this.processLogsButton().click();
    await expect(this.processLogsDialog(), '"Process Logs" dialog should open').toBeVisible();
  }

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
    // a Hold / Activate / Approve reloads the page itself; a goto racing that reload is aborted -> wait and go again
    await this.page.goto(LotteryDrawListPage.PATH).catch(async (error: Error) => {
      if (!/ERR_ABORTED|interrupted by another navigation/.test(error.message)) throw error;
      await this.page.waitForLoadState('load');
      await this.page.goto(LotteryDrawListPage.PATH);
    });
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

  /** Select a stage tab and wait for its list request. A tab that is already selected is left as is (clicking it sends no request). */
  async selectTab(name: DrawTab): Promise<void> {
    if ((await this.tab(name).getAttribute('aria-selected')) === 'true') return;
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
   * Click a row action of a draw already shown in the table and wait for its API call (no dialog
   * handling - use it to prove an action acts immediately). Returns the response.
   */
  async performRowAction(code: string, action: DrawAction, api: RegExp): Promise<Response> {
    await this.openRowMenu(code);
    await expect(this.menuAction(action), `"${action}" should be offered for ${code}`).toHaveCount(1);
    const res = this.page.waitForResponse((r) => api.test(r.url()) && r.request().method() !== 'GET', { timeout: SERVER_SAVE_TIMEOUT });
    await this.menuAction(action).click();
    const response = await res;
    this.logger.info(`▶️ ${action} on ${code}: HTTP ${response.status()}`);
    return response;
  }

  /** Pending Approval row menu "Reject" -> PUT /api/draw/approve-reject/{id}: the draw goes back to Under Review. */
  async sendBackForReview(code: string): Promise<Response> {
    await this.findDraw(code);
    return this.performRowAction(code, 'Reject', LotteryDrawListPage.API.SEND_BACK);
  }

  /** Under Review row menu "Hold Draw" -> the draw goes On Hold (no confirmation). */
  async holdDraw(code: string): Promise<Response> {
    await this.findDraw(code);
    return this.performRowAction(code, 'Hold Draw', LotteryDrawListPage.API.HOLD);
  }

  /** On Hold row menu "Activate Draw" -> the draw returns to its stage. */
  async activateDraw(code: string): Promise<Response> {
    await this.findDraw(code);
    return this.performRowAction(code, 'Activate Draw', LotteryDrawListPage.API.ACTIVATE);
  }

  /** "Remove Draw" confirmation dialog: "Enter This Draw Code For Confirmation : <code>", a textbox and a "Remove Draw" button. */
  removeDrawDialog(): Locator { return this.page.getByRole('dialog').filter({ hasText: 'Enter This Draw Code For Confirmation' }); }

  /** On Hold row menu "Remove Draw" -> type the draw code to confirm -> the draw moves to Deleted. */
  async removeDraw(code: string): Promise<Response> {
    await this.findDraw(code);
    await this.openRowMenu(code);
    await this.menuAction('Remove Draw').click();
    const dialog = this.removeDrawDialog();
    await expect(dialog, '"Remove Draw" confirmation should ask for the draw code').toBeVisible();
    await dialog.getByRole('textbox').fill(code);
    const res = this.page.waitForResponse((r) => LotteryDrawListPage.API.REMOVE.test(r.url()) && r.request().method() !== 'GET', { timeout: SERVER_SAVE_TIMEOUT });
    await dialog.getByRole('button', { name: 'Remove Draw', exact: true }).click();
    const response = await res;
    this.logger.info(`🗑️ Remove Draw ${code}: HTTP ${response.status()}`);
    return response;
  }

  /**
   * Reject a draw from its row menu:
   *  - Under Review: "Reject Draw" -> PUT /api/draw/reject/{id} -> Rejected
   *  - Pending Approval: "Reject" -> PUT /api/draw/approve-reject/{id} -> back to Under Review (NOT Rejected)
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
    const res = this.page.waitForResponse((r) => /\/api\/draw\/(approve-)?reject\//.test(r.url()) && r.request().method() !== 'GET', { timeout: SERVER_SAVE_TIMEOUT }).catch(() => null);
    const acceptConfirm = (d: Dialog) => void d.accept();
    this.page.once('dialog', acceptConfirm);   // removed below, so it can never swallow a later confirm (e.g. Create Draw "Next")
    await this.menuAction(label).click();
    const dialog = this.page.getByRole('dialog');
    if (await dialog.isVisible().catch(() => false)) {
      const reasonBox = dialog.getByRole('textbox');
      if ((await reasonBox.count()) > 0) await reasonBox.first().fill(reason);
      await dialog.getByRole('button', { name: /^(reject|confirm|yes|submit|ok)/i }).last().click();
    }
    const response = await res;
    this.page.off('dialog', acceptConfirm);
    this.logger.info(`🚫 Reject draw ${code}: HTTP ${response?.status() ?? 'no request seen'}`);
    return response;
  }
}
