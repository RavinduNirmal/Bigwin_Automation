import { Page, Locator, Response, Dialog, expect } from '@playwright/test';
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
  /** Brand chosen by selectBrand() on the current Create Draw page ('' after open()). */
  private chosenBrand = '';

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

  /** Stepper label "Details" (Step 1) / "Upload" (Step 2). */
  stepLabel(name: 'Details' | 'Upload'): Locator {
    return this.page.getByText(new RegExp(name)).first();
  }

  /** An inline validation message under a Step 1 field, e.g. "Draw Number must be a positive number". */
  fieldError(text: string | RegExp): Locator {
    return this.page.getByText(text).first();
  }

  /**
   * Click Next and DISMISS the native confirm if one appears, so nothing advances or is created.
   * Returns the confirm text, or null when validation blocked Next before any confirm.
   */
  async clickNextAndDismiss(waitMs = 3000): Promise<string | null> {
    let message: string | null = null;
    const handler = (d: Dialog) => { message = d.message(); void d.dismiss(); };
    this.page.on('dialog', handler);
    try {
      await this.nextButton.click();
      // give the app time to validate or to raise its confirm
      try {
        await expect.poll(() => message, { timeout: waitMs }).not.toBeNull();
      } catch {
        // no confirm within waitMs: validation blocked Next
      }
    } finally {
      this.page.off('dialog', handler);
    }
    this.lastConfirmMessage = message ?? '';
    this.logger.info(`⏭️ Next: ${message ? `confirm "${message}" (dismissed)` : 'no confirm (blocked)'}`);
    return message;
  }

  /**
   * Click Next, ACCEPT any native confirm and report what happened: the confirm texts and whether Step 2
   * opened. Accepting only moves to Step 2 - nothing is created before "Create Draw".
   */
  async attemptNext(waitMs = 4000): Promise<{ confirms: string[]; onStep2: boolean }> {
    const confirms: string[] = [];
    const handler = (d: Dialog) => { confirms.push(d.message()); void d.accept(); };
    this.page.on('dialog', handler);
    try {
      await this.nextButton.click();
      const onStep2 = await this.uploadHeading.waitFor({ state: 'visible', timeout: waitMs }).then(() => true, () => false);
      this.logger.info(`⏭️ Next: ${onStep2 ? 'Step 2 opened' : 'stayed on Step 1'}${confirms.length ? ` (confirm "${confirms[0]}")` : ''}`);
      return { confirms, onStep2 };
    } finally {
      this.page.off('dialog', handler);
    }
  }

  // ---- "Upload Files" dialog (Create Draw Step 2 "Select File" and the list's "Add Tickets")

  uploadDialogButton(name: 'Add' | 'Cancel'): Locator { return this.uploadDialog().getByRole('button', { name, exact: true }); }
  browseFilesButton(): Locator { return this.uploadDialog().getByText('Browse files'); }
  /** Optional MD5 box of the dialog (Add Tickets). */
  uploadDialogMd5(): Locator { return this.uploadDialog().getByRole('textbox', { name: /MD5/ }); }

  /** Choose a file in the open "Upload Files" dialog (hidden file input - documented exception). Does not press Add. */
  async chooseUploadFile(filePath: string): Promise<void> {
    await expect(this.uploadDialog(), '"Upload Files" dialog should be open').toBeVisible();
    await this.page.locator('input[type="file"]').setInputFiles(filePath);
  }

  /** "Upload Files" dialog content check that only .dbf files are allowed (toast or helper text). */
  dbfOnlyMessage(): Locator { return this.page.getByText(/only.*\.?dbf|\.dbf.*only|invalid file|not a dbf/i).first(); }

  uploadDialog(): Locator {
    return this.page.getByRole('dialog').filter({ hasText: 'Upload Files' });
  }

  async open(): Promise<void> {
    // Wait for the brand list (POST /api/lottery/brands/simple) before choosing a brand - see selectBrand().
    const brandList = this.page
      .waitForResponse((r) => /\/brands\/simple/.test(r.url()) && r.request().method() === 'POST', { timeout: 30000 })
      .catch(() => null);
    this.chosenBrand = '';
    await this.page.goto(CreateDrawPage.PATH);
    await brandList;
    await this.page.waitForLoadState('load');
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

  /**
   * Mega Prize hotfix (2026-11-23): put `text` on the clipboard and paste it into Mega Prize with Ctrl+V,
   * the way users copy an amount from another place. `replace` (default) empties the box first; otherwise the
   * text is pasted at the end of the current value. Needs the clipboard permissions (spec: test.use({ permissions })).
   */
  async pasteIntoMegaPrize(text: string, { replace = true } = {}): Promise<string> {
    await this.page.evaluate((t) => navigator.clipboard.writeText(t), text);
    if (replace) await this.megaPrizeInput.clear();
    await this.megaPrizeInput.focus();
    await this.megaPrizeInput.press('End');
    await this.page.keyboard.press('ControlOrMeta+V');
    return this.megaPrizeInput.inputValue();
  }

  /** Select the whole Mega Prize value and copy it (Ctrl+C); returns what landed on the clipboard. */
  async copyMegaPrize(): Promise<string> {
    await this.megaPrizeInput.selectText();
    await this.page.keyboard.press('ControlOrMeta+C');
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  /** Clear Mega Prize and type `text` key by key; returns the value the box kept. */
  async typeMegaPrize(text: string): Promise<string> {
    await this.megaPrizeInput.clear();
    await this.megaPrizeInput.pressSequentially(text);
    return this.megaPrizeInput.inputValue();
  }

  /**
   * Choose the Lottery Brand. Choosing an option makes the app reload the brand list (POST /api/lottery/brands/simple)
   * and only then set the draw's brand id. Clicking Next before that reply has been processed leaves lotteryBrandId 0:
   * Step 2 does not load the brand and Create Draw fails with 400 "Error occured while creating draw with code ..."
   * (root cause found 2026-11-24 - a real user is slower than the reload). So wait for the reload reply and a render.
   * goToUploadStep() then verifies the brand was really taken (Step 2 loads it).
   */
  async selectBrand(name: string): Promise<void> {
    await this.brandSelect.click();
    const reload = this.page
      .waitForResponse((r) => /\/brands\/simple/.test(r.url()) && r.request().method() === 'POST', { timeout: 15000 })
      .catch(() => null);
    await this.page.getByRole('option', { name, exact: true }).click();
    await expect(this.brandSelect).toContainText(name);
    await reload;
    // let the app process the reply (state update + render) before the next action
    await this.page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    this.chosenBrand = name;
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
    // Step 2 loads the chosen brand (GET .../lottery-brand/{id}); no load = the draw has no brand id (would be saved with 0)
    const brandLoad = this.page
      .waitForResponse((r) => /\/lottery-brand\/\d+/.test(r.url()) && r.request().method() === 'GET', { timeout: 15000 })
      .catch(() => null);
    await this.nextButton.click();
    await confirm;
    await expect(this.uploadHeading, 'Step 2 "Upload Ticket List" should be shown').toBeVisible({ timeout: 15000 });
    if (this.chosenBrand) {
      expect(await brandLoad, `Step 2 should load the chosen brand "${this.chosenBrand}" (GET lottery-brand/{id}) - without it the draw is created with lotteryBrandId 0`).not.toBeNull();
    }
  }

  /** Step 2: "Select File" -> "Upload Files" dialog -> choose the DBF -> Add. */
  async attachTicketFile(filePath: string): Promise<void> {
    await this.selectFileButton.click();
    await this.chooseUploadFile(filePath);
    await this.uploadDialogButton('Add').click();
    await expect(this.uploadDialog()).toBeHidden();
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
    expect(drawRes.status(), `Creating draw ${draw.code} should succeed: ${JSON.stringify(drawBody)} - request sent: ${drawRes.request().postData() ?? '(none)'}`).toBe(201);
    expect(upload, 'Ticket upload should be requested').not.toBeNull();
    const uploadBody = await upload!.json().catch(() => ({}));
    expect(upload!.status(), `Ticket upload should succeed: ${JSON.stringify(uploadBody)}`).toBeLessThan(400);
    await expect(this.page, 'Should return to the Draws list').toHaveURL(/\/dashboard\/draw$/, { timeout: SERVER_SAVE_TIMEOUT });
    this.logger.info(`✅ Draw created: ${draw.code} (id ${drawBody.results}, upload ${uploadBody.results})`);
    return { drawId: Number(drawBody.results), uploadId: Number(uploadBody.results) };
  }
}
