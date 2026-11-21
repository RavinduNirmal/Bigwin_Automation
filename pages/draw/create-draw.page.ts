import { Page, Locator, Response, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { LotteryDrawData } from '../../data/factories/lottery-draw-data.factory';
import { SERVER_SAVE_TIMEOUT } from '../../config/timeouts';

/**
 * "Create Draw" - /dashboard/draw/create-draw (Lottery Draws > Draws > Create Draw). Two steps:
 *
 * Step 1 Details: "Lottery Brand *" select (only APPROVED + ACTIVE brands), "Draw Number *" (number),
 *   "Draw Code *", "Ticket Issue Start Date & Time *", "Ticket Issue Cutoff Date & Time *",
 *   "Draw Date & Time *" (datetime-local), "Mega Prize *"; "Next". Empty required fields are blocked by
 *   the browser's native check. Next asks a native confirm "Are you sure you want to create darw?" (sic).
 * Step 2 Upload: "Upload Ticket List" (shows Draw Number + Brand Name), "Select File" -> dialog
 *   "Upload Files" (hidden file input, Cancel / Add), "MD5 Checksum", "Schedule Date", "Initiate Now";
 *   Back / "Create Draw". Create Draw: POST ticket-service upload/private (file to S3) ->
 *   POST /api/draw/create (201 {results: drawId}) -> POST ticket-service ticket-upload (201 {results: uploadId})
 *   -> back to the Draws list. The draw starts at stage "Under Review".
 *
 * The brand dropdown is also used READ-ONLY by the Lottery Brand "ready for use" tests.
 */
export interface CreatedDraw {
  drawId: number;
  uploadId: number;
}

export class CreateDrawPage extends BasePage {
  readonly heading: Locator;
  readonly brandSelect: Locator;
  readonly drawNumberInput: Locator;
  readonly drawCodeInput: Locator;
  readonly issueStartInput: Locator;
  readonly issueCutoffInput: Locator;
  readonly drawDateInput: Locator;
  readonly megaPrizeInput: Locator;
  readonly nextButton: Locator;
  // step 2
  readonly uploadHeading: Locator;
  readonly selectFileButton: Locator;
  readonly md5Input: Locator;
  readonly scheduleDateInput: Locator;
  readonly initiateNowCheckbox: Locator;
  readonly backButton: Locator;
  readonly createDrawButton: Locator;
  /** Text of the last native confirm shown by Next. */
  lastConfirmMessage = '';

  static readonly PATH = '/dashboard/draw/create-draw';
  /** Draw codes submitted with "Create Draw" in the current test (afterEach cleanup). */
  static submittedCodes: string[] = [];

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Create Draw', exact: true });
    this.brandSelect = page.getByRole('button', { name: /^Lottery Brand/ });
    this.drawNumberInput = page.getByRole('spinbutton', { name: /^Draw Number/ });
    this.drawCodeInput = page.getByRole('textbox', { name: /^Draw Code/ });
    this.issueStartInput = page.getByRole('textbox', { name: /^Ticket Issue Start/ });
    this.issueCutoffInput = page.getByRole('textbox', { name: /^Ticket Issue Cutoff/ });
    this.drawDateInput = page.getByRole('textbox', { name: /^Draw Date/ });
    this.megaPrizeInput = page.getByRole('textbox', { name: /^Mega Prize/ });
    this.nextButton = page.getByRole('button', { name: 'Next', exact: true });
    this.uploadHeading = page.getByRole('heading', { name: 'Upload Ticket List' });
    this.selectFileButton = page.getByRole('button', { name: 'Select File' });
    this.md5Input = page.getByRole('textbox', { name: 'MD5 Checksum' });
    this.scheduleDateInput = page.getByRole('textbox', { name: 'Schedule Date' });
    this.initiateNowCheckbox = page.getByRole('checkbox', { name: 'Initiate Now' });
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });
    this.createDrawButton = page.getByRole('button', { name: 'Create Draw', exact: true });
  }

  /** Step 2 info line, e.g. "Draw Number: 2026112101" / "Brand Name: Mahajana Sampatha". */
  step2Info(label: 'Draw Number' | 'Brand Name'): Locator {
    return this.page.getByRole('paragraph').filter({ hasText: `${label}:` });
  }

  uploadDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Upload Files' });
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

  async selectBrand(name: string): Promise<void> {
    await this.brandSelect.click();
    await this.page.getByRole('option', { name, exact: true }).click();
    await expect(this.brandSelect).toContainText(name);
  }

  /** Fill Step 1 (only the given fields). */
  async fillDetails(draw: Partial<LotteryDrawData>): Promise<void> {
    if (draw.brand) await this.selectBrand(draw.brand);
    if (draw.drawNumber !== undefined) await this.drawNumberInput.fill(draw.drawNumber);
    if (draw.code !== undefined) await this.drawCodeInput.fill(draw.code);
    if (draw.issueStart !== undefined) await this.issueStartInput.fill(draw.issueStart);
    if (draw.issueCutoff !== undefined) await this.issueCutoffInput.fill(draw.issueCutoff);
    if (draw.drawDate !== undefined) await this.drawDateInput.fill(draw.drawDate);
    if (draw.megaPrize !== undefined) await this.megaPrizeInput.fill(draw.megaPrize);
    this.logger.info(`📝 Draw details: ${draw.code} / ${draw.drawNumber} / ${draw.issueStart} -> ${draw.drawDate}`);
  }

  /** Step 1 -> Step 2: click Next and accept the native confirm. */
  async goToUploadStep(): Promise<void> {
    const confirm = this.page.waitForEvent('dialog', { timeout: 15000 }).then(async (d) => {
      this.lastConfirmMessage = d.message();
      await d.accept();
    });
    await this.nextButton.click();
    await confirm;
    await expect(this.uploadHeading, 'Step 2 "Upload Ticket List" should be shown').toBeVisible({ timeout: 15000 });
  }

  /** Step 2: "Select File" -> "Upload Files" dialog -> choose the DBF -> Add. */
  async attachTicketFile(filePath: string): Promise<void> {
    await this.selectFileButton.click();
    const dialog = this.uploadDialog();
    await expect(dialog, '"Upload Files" dialog should open').toBeVisible();
    await this.page.locator('input[type="file"]').setInputFiles(filePath); // hidden input inside the dialog
    await dialog.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(dialog).toBeHidden();
  }

  /** Name of the attached file as listed on Step 2. */
  attachedFile(fileName: string): Locator {
    return this.page.getByText(fileName, { exact: true });
  }

  /** Click "Create Draw" and wait for the draw + ticket-upload requests. */
  async submitCreateDraw(code: string): Promise<{ draw: Response; upload: Response | null }> {
    CreateDrawPage.submittedCodes.push(code);
    const drawRes = this.page.waitForResponse((r) => /\/api\/draw\/create$/.test(new URL(r.url()).pathname), { timeout: 60000 });
    const uploadRes = this.page.waitForResponse((r) => /ticket-upload/.test(r.url()) && r.request().method() === 'POST', { timeout: 60000 }).catch(() => null);
    await this.createDrawButton.click();
    const draw = await drawRes;
    const upload = draw.status() < 400 ? await uploadRes : null;
    return { draw, upload };
  }

  /**
   * Full happy path: Step 1, Next (confirm), attach DBF, MD5, Initiate Now, Create Draw.
   * Expects success and returns the new draw id and ticket-upload id. Ends on the Draws list.
   */
  async createDraw(draw: LotteryDrawData, ticketFile: { filePath: string; md5: string }): Promise<CreatedDraw> {
    await this.open();
    await this.fillDetails(draw);
    await this.goToUploadStep();
    await this.attachTicketFile(ticketFile.filePath);
    await this.md5Input.fill(ticketFile.md5);
    await this.initiateNowCheckbox.check();
    const { draw: drawRes, upload } = await this.submitCreateDraw(draw.code);
    const drawBody = await drawRes.json().catch(() => ({}));
    expect(drawRes.status(), `Creating draw ${draw.code} should succeed: ${JSON.stringify(drawBody)}`).toBe(201);
    expect(upload, 'Ticket upload should be requested').not.toBeNull();
    const uploadBody = await upload!.json().catch(() => ({}));
    expect(upload!.status(), `Ticket upload should succeed: ${JSON.stringify(uploadBody)}`).toBeLessThan(400);
    await expect(this.page, 'Should return to the Draws list').toHaveURL(/\/dashboard\/draw$/, { timeout: SERVER_SAVE_TIMEOUT });
    this.logger.info(`✅ Draw created: ${draw.code} (id ${drawBody.results}, upload ${uploadBody.results})`);
    return { drawId: Number(drawBody.results), uploadId: Number(uploadBody.results) };
  }
}
