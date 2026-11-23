import { Page, Request, Response, expect } from '@playwright/test';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { LotteryDrawListPage } from '../../../pages/draw/lottery-draw-list.page';
import { LotteryDrawDetailPage } from '../../../pages/draw/lottery-draw-detail.page';
import { DRAW_TAB, DrawTab, LotteryDrawData } from '../../../data/factories/lottery-draw-data.factory';
import { TicketDbfFile } from '../../dbf/ticket-dbf.service';
import { TestHelper } from '../common/test-helper';
import { Logger } from '../../logger';
import { waitForTicketsLoaded, waitForDrawStatus } from './draw.helpers';

const logger = new Logger();

/**
 * Global Checksum release helpers (TC-LD-CHK-*).
 * Rule under test: a ticket file checksum (MD5) may be used by only ONE non-deleted draw; deleting the
 * draw frees it. Refusals come from ticket-service POST .../ticket-upload (400) with
 *   "This ticket file has already been uploaded to another draw (<code>). Please use a different ticket file."
 *   "This ticket file has already been uploaded to this draw. Please use a different ticket file."
 *   "Invalid MD5 checksum. The checksum entered does not match the ticket file."
 */
export const CHECKSUM_MESSAGE = {
  OTHER_DRAW: (code: string) => new RegExp(`already been uploaded to another draw \\(${code}\\)`),
  THIS_DRAW: /already been uploaded to this draw/,
  MISMATCH: /Invalid MD5 checksum\. The checksum entered does not match the ticket file/,
  APPROVE_INVALID: /Invalid MD5 checksum provided/,
} as const;

export interface DrawCreation {
  drawResponse: Response;
  uploadResponse: Response | null;
  drawId: number;
  /** Server message of a refused ticket upload ('' when accepted). */
  uploadError: string;
}

/** The error message inside a ticket-service / draw API response ('' when none). */
export async function responseError(res: Response | null): Promise<string> {
  if (!res) return '';
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string; errors?: Array<{ errorMessage?: string }> };
  return body.errors?.[0]?.errorMessage ?? body.error ?? body.message ?? '';
}

/**
 * Create Draw with ANY ticket file + checksum and report what happened, without asserting success
 * (the draw itself is created first, then the ticket upload is checked).
 */
export async function createDrawWithFile(createDraw: CreateDrawPage, draw: LotteryDrawData, file: TicketDbfFile, md5 = file.md5): Promise<DrawCreation> {
  await createDraw.open();
  await createDraw.fillDetails(draw);
  await createDraw.goToUploadStep();
  await createDraw.attachTicketFile(file.filePath);
  await createDraw.md5Input.fill(md5);
  await createDraw.initiateNowCheckbox.check();
  const { draw: drawResponse, upload } = await createDraw.submitCreateDraw(draw.code);
  const body = (await drawResponse.json().catch(() => ({}))) as { results?: number };
  const uploadError = upload && upload.status() >= 400 ? await responseError(upload) : '';
  await TestHelper.attachText(`Create ${draw.code}`, `draw/create ${drawResponse.status()} id ${body.results}\nticket-upload ${upload?.status() ?? 'not sent'} ${uploadError}`);
  return { drawResponse, uploadResponse: upload, drawId: Number(body.results), uploadError };
}

/** Assert a ticket-upload (create or Add Tickets) was REFUSED with a message matching `message`. */
export async function expectChecksumRefused(res: Response | null, message: RegExp, what: string): Promise<void> {
  expect(res, `${what}: a ticket-upload request should be sent`).not.toBeNull();
  const error = await responseError(res);
  await TestHelper.attachText(`${what} - server answer`, `${res!.status()} ${error}`);
  expect(res!.status(), `${what} should be refused (got ${res!.status()} "${error}")`).toBeGreaterThanOrEqual(400);
  expect(error, `${what}: refusal message`).toMatch(message);
}

/** Assert a ticket-upload was ACCEPTED. */
export async function expectUploadAccepted(res: Response | null, what: string): Promise<void> {
  expect(res, `${what}: a ticket-upload request should be sent`).not.toBeNull();
  const error = await responseError(res);
  expect(res!.status(), `${what} should be accepted, but the server answered ${res!.status()} "${error}"`).toBeLessThan(400);
}

/** The draw's current Status on the All tab. */
export async function drawStatus(list: LotteryDrawListPage, code: string): Promise<string> {
  await list.open();
  return (await list.getDrawData(code)).status;
}

/**
 * Delete a draw so its checksums are released: Rejected -> row menu "Delete"; otherwise
 * "Hold Draw" (unless already On Hold) then "Remove Draw" (type the code). Returns false if it was not found.
 */
export async function deleteDraw(list: LotteryDrawListPage, code: string): Promise<boolean> {
  await list.open();
  await list.searchDraws(code);
  if ((await list.rowFor(code).count()) === 0) {
    await list.selectTab(DRAW_TAB.REJECTED);
    await list.searchDraws(code);
    if ((await list.rowFor(code).count()) === 0) return false;
    const res = await list.deleteRejectedDraw(code);
    expect(res.status(), `Deleting rejected draw ${code}`).toBeLessThan(400);
    return true;
  }
  const status = (await list.readDrawRow(code)).status;
  if (/Rejected/i.test(status)) {
    const res = await list.deleteRejectedDraw(code);
    expect(res.status(), `Deleting rejected draw ${code}`).toBeLessThan(400);
    return true;
  }
  if (!/On Hold/i.test(status)) await list.holdDraw(code);
  await list.open();
  const res = await list.removeDraw(code);
  expect(res.status(), `Removing draw ${code}`).toBeLessThan(400);
  return true;
}

/** afterEach: delete every own "AT..." draw (never touches other draws). Best effort, logs failures. */
export async function deleteOwnDraws(list: LotteryDrawListPage, codes: string[]): Promise<void> {
  for (const code of [...new Set(codes)].filter((c) => /^AT\d+$/.test(c))) {
    try {
      if (await deleteDraw(list, code)) logger.info(`🧹 Deleted draw ${code} (checksums released)`);
    } catch (error) {
      logger.warn(`⚠️ Could not delete draw ${code}: ${String(error).split(/\r?\n/)[0]}`);
    }
  }
}

/** Delete a draw and confirm it is only listed in the Deleted tab (renamed "<code>-DELETED-<timestamp>"). */
export async function deleteDrawAndVerify(list: LotteryDrawListPage, code: string): Promise<void> {
  expect(await deleteDraw(list, code), `Draw ${code} should exist before deleting`).toBe(true);
  await list.open();
  await list.searchDraws(code);
  await expect(list.rowFor(code), `Deleted draw ${code} should leave the All tab`).toHaveCount(0, { timeout: 15000 });
  await list.selectTab(DRAW_TAB.DELETED);
  await list.searchDraws(`${code}-DELETED`);
  await expect(list.dataRows().filter({ hasText: `${code}-DELETED-` }), `Deleted draw ${code} should be listed in the Deleted tab, renamed`).not.toHaveCount(0, { timeout: 15000 });
}

/** Create a draw with its own file, wait for the tickets: the "holder" of that file's checksum. */
export async function createHolderDraw(createDraw: CreateDrawPage, list: LotteryDrawListPage, draw: LotteryDrawData, file: TicketDbfFile): Promise<number> {
  const created = await createDrawWithFile(createDraw, draw, file);
  const createError = created.drawResponse.status() === 201 ? '' : await responseError(created.drawResponse);
  expect(created.drawResponse.status(), `Creating draw ${draw.code} - server answered: "${createError}" (known intermittent backend defect when it is "Error occured while creating draw...")`).toBe(201);
  await expectUploadAccepted(created.uploadResponse, `Ticket upload of ${draw.code}`);
  await waitForTicketsLoaded(list, draw.code, file.recordCount);
  return created.drawId;
}

/** Review (after the tickets loaded) and approve with `md5`; asserts both succeed. */
export async function reviewAndApprove(list: LotteryDrawListPage, code: string, md5: string): Promise<void> {
  await list.open();
  const reviewed = await list.reviewDraw(code);
  expect(reviewed.status(), `Review of ${code}: ${await reviewed.text().catch(() => '')}`).toBeLessThan(400);
  await list.open();
  const approved = await list.approveDraw(code, md5);
  expect(approved.status(), `Approve of ${code}: ${await approved.text().catch(() => '')}`).toBeLessThan(400);
  await list.open();   // fresh list (the approve dialog / reload leaves the page mid-update)
}

/**
 * Draw page Logs: reload until a ticket-upload row matching `status` appears (uploads are processed in the
 * background). Each reload first waits for the page data (the earlier upload row) before counting.
 */
export async function waitForUploadLogRow(detail: LotteryDrawDetailPage, drawId: number, status: RegExp, timeoutMs = 5 * 60000): Promise<void> {
  await detail.open(drawId);
  await expect
    .poll(async () => {
      await detail.page.reload();
      await expect(detail.uploadLogRows().first(), 'The draw page Logs should list the earlier upload').toBeVisible({ timeout: 30000 });
      return detail.uploadLogRows().filter({ hasText: status }).count();
    }, { message: `Draw page Logs should show an upload row "${status.source}"`, timeout: timeoutMs, intervals: [15000] })
    .toBeGreaterThan(0);
}

/**
 * Take an imminent draw to a scheduled stage (In Play / In Play Post Cutoff / Completed):
 * create with its file, review + approve as soon as the tickets load, then wait for the status.
 */
export async function createDrawInStage(
  createDraw: CreateDrawPage, list: LotteryDrawListPage, draw: LotteryDrawData, file: TicketDbfFile,
  stage: RegExp, timeoutMs = 20 * 60000
): Promise<string> {
  await createHolderDraw(createDraw, list, draw, file);
  await reviewAndApprove(list, draw.code, file.md5);
  await list.open();
  await list.selectTab(DRAW_TAB.ALL);
  await list.searchDraws(draw.code);
  return waitForDrawStatus(list, draw.code, stage, timeoutMs, { everyMs: 20000 });
}

/** Capture the next ticket-upload request (URL, headers, JSON body) - for the direct API test. */
export function captureTicketUpload(page: Page): Promise<Request> {
  return page.waitForRequest((r) => /ticket-upload(\?|$)/.test(r.url()) && r.method() === 'POST', { timeout: 60000 });
}

/** Replay a captured ticket-upload request straight to the server with some body fields changed. */
export async function replayTicketUpload(page: Page, captured: Request, overrides: Record<string, unknown>) {
  const headers = await captured.allHeaders();
  const keep = Object.fromEntries(Object.entries(headers).filter(([k]) => /^(authorization|x-|content-type)/i.test(k)));
  const body = { ...(captured.postDataJSON() as Record<string, unknown>), ...overrides };
  const res = await page.request.post(captured.url(), { headers: keep, data: body, failOnStatusCode: false });
  const json = (await res.json().catch(() => ({}))) as { errors?: Array<{ errorMessage?: string }>; error?: string };
  return { status: res.status(), error: json.errors?.[0]?.errorMessage ?? json.error ?? '' };
}

export type { DrawTab };
