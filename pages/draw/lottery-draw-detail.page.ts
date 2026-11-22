import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * A draw's view page - /dashboard/draw/edit-lottery-draw?drawId={id} (from the Draw Code link / "View").
 *
 * Link "Back"; heading "<code> | <brand>"; summary headings "Bought Ticket Count", "Revenue",
 * "Total Tickets" each followed by its value; read-only textboxes "Lottery Name", "Approval Stage"
 * (e.g. "PENDING APPROVAL"), "Draw Status", "Draw Number", "Draw Code", "Issue Start Date Time",
 * "Issue Cutoff Date Time", "Draw Date Time" (shown as "2026.11.22 08:30 PM"), "Mega Prize";
 * "Winnning Numbers:" (sic); a "Logs" table of ticket uploads (Code, Scheduled At, Created At,
 * Upload Status e.g. "Completed", Log File / Download) and "Operation logs".
 */
export class LotteryDrawDetailPage extends BasePage {
  readonly backLink: Locator;
  readonly approvalStageField: Locator;
  readonly drawStatusField: Locator;
  readonly lotteryNameField: Locator;
  readonly drawNumberField: Locator;
  readonly drawCodeField: Locator;
  readonly issueStartField: Locator;
  readonly issueCutoffField: Locator;
  readonly drawDateField: Locator;
  readonly megaPrizeField: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = page.getByRole('link', { name: 'Back', exact: true });
    this.approvalStageField = page.getByRole('textbox', { name: 'Approval Stage' });
    this.drawStatusField = page.getByRole('textbox', { name: 'Draw Status' });
    this.lotteryNameField = page.getByRole('textbox', { name: 'Lottery Name' });
    this.drawNumberField = page.getByRole('textbox', { name: 'Draw Number' });
    this.drawCodeField = page.getByRole('textbox', { name: 'Draw Code' });
    this.issueStartField = page.getByRole('textbox', { name: 'Issue Start Date Time' });
    this.issueCutoffField = page.getByRole('textbox', { name: 'Issue Cutoff Date Time' });
    this.drawDateField = page.getByRole('textbox', { name: 'Draw Date Time' });
    this.megaPrizeField = page.getByRole('textbox', { name: 'Mega Prize' });
  }

  heading(): Locator {
    return this.page.getByRole('heading', { level: 4 }).filter({ hasText: '|' });
  }

  /** Summary card (icon + label heading + value heading) for "Total Tickets" etc. */
  summaryCard(label: 'Bought Ticket Count' | 'Revenue' | 'Total Tickets'): Locator {
    return this.page.getByRole('heading', { name: label, exact: true }).locator('../..');
  }

  /** The value shown on a summary card, e.g. "100" for Total Tickets. */
  async summaryValue(label: 'Bought Ticket Count' | 'Revenue' | 'Total Tickets'): Promise<string> {
    const read = async () => {
      const lines = (await this.summaryCard(label).innerText()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      return lines[lines.indexOf(label) + 1] ?? '';
    };
    // the value renders a moment after the page loads
    await expect.poll(read, { message: `"${label}" value should render`, timeout: 15000 }).not.toBe('');
    return read();
  }

  /** Ticket-upload rows of the "Logs" table (the first table on the page). */
  uploadLogRows(): Locator {
    return this.page.getByRole('table').first().getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  /** "Update" button (switches to edit mode; disabled while Under Review). */
  updateButton(): Locator { return this.page.getByRole('button', { name: 'Update', exact: true }); }

  /** The "Operation logs" table (the second table on the page, after the upload "Logs"). */
  operationLogsTable(): Locator { return this.page.getByRole('table').nth(1); }

  /** A "Quick toggles:" column chip of the Operation logs table (e.g. "Entity Long Id"). */
  quickToggleChip(name: string): Locator {
    return this.page.getByText('Quick toggles:', { exact: true }).locator('xpath=..').getByRole('button', { name, exact: true });
  }

  /** "Winning Numbers:" label, correctly spelled (the app currently shows "Winnning Numbers:"). */
  winningNumbersLabel(): Locator { return this.page.getByText('Winning Numbers:', { exact: true }); }

  noWinningNumbersMessage(): Locator { return this.page.getByText('No winning numbers available.', { exact: true }); }

  /** A not-found / unknown-draw message. */
  notFoundMessage(): Locator { return this.page.getByText(/not found|does not exist|no such draw|no draw/i).first(); }

  /** An "Operation logs" entry (audit message), e.g. "Lottery draw created successfully with code: AT9...". */
  operationLogEntry(text: string | RegExp): Locator {
    return this.page.getByText(text).first();
  }

  /** A column header of the "Operation logs" table (Email, Operation Type, Entity Type, Http Status, Logged At ...). */
  operationLogColumn(name: string): Locator {
    return this.page.getByRole('columnheader', { name }).first();
  }

  async open(drawId: number): Promise<void> {
    await this.page.goto(`/dashboard/draw/edit-lottery-draw?drawId=${drawId}`);
    await this.verifyLoaded();
  }

  async verifyLoaded(code?: string): Promise<void> {
    await expect(this.approvalStageField, 'Draw page should show the Approval Stage').toBeVisible({ timeout: 30000 });
    if (code) await expect(this.heading()).toContainText(`${code} |`);
  }
}
