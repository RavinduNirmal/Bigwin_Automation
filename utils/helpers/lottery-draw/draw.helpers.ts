import { expect } from '@playwright/test';
import { CreateDrawPage, CreatedDraw } from '../../../pages/draw/create-draw.page';
import { LotteryDrawListPage } from '../../../pages/draw/lottery-draw-list.page';
import { DrawTab, DRAW_TAB, LotteryDrawData } from '../../../data/factories/lottery-draw-data.factory';
import { TicketDbfFile } from '../../dbf/ticket-dbf.service';
import { TestHelper } from '../common/test-helper';
import { Logger } from '../../logger';

const logger = new Logger();

/** Hands out draws + their ticket files (the `testLotteryDrawData` fixture). */
export interface LotteryDrawDataSource {
  unique(overrides?: Partial<LotteryDrawData>): LotteryDrawData;
  ticketFile(draw: LotteryDrawData, options?: { seed?: string }): TicketDbfFile;
}

export interface CreatedTestDraw extends LotteryDrawData, CreatedDraw {
  ticketFile: TicketDbfFile;
}

/** Build the ticket DBF with the DBF service and create the draw through the real UI. Starts "Under Review". */
export async function createDrawWithTickets(
  createDraw: CreateDrawPage,
  draw: LotteryDrawData,
  ticketFile: TicketDbfFile
): Promise<CreatedTestDraw> {
  const ids = await createDraw.createDraw(draw, ticketFile);
  await TestHelper.attachText(`Draw ${draw.code}`, JSON.stringify({ ...draw, ...ids, ticketFile }, null, 2));
  return { ...draw, ...ids, ticketFile };
}

/** Create a brand-new unique draw (far-future schedule) with its tickets. */
export async function createUniqueDraw(
  createDraw: CreateDrawPage,
  source: LotteryDrawDataSource,
  overrides: Partial<LotteryDrawData> = {}
): Promise<CreatedTestDraw> {
  const draw = source.unique(overrides);
  return createDrawWithTickets(createDraw, draw, source.ticketFile(draw));
}

/** The draw is listed in `tab` (searching its code there). Ends with that tab selected. */
export async function expectDrawInTab(list: LotteryDrawListPage, code: string, tab: DrawTab): Promise<void> {
  await list.selectTab(tab);
  await list.searchDraws(code);
  await expect(list.rowFor(code), `Draw "${code}" should be listed under "${tab}"`).toHaveCount(1, { timeout: 15000 });
}

export async function expectDrawNotInTab(list: LotteryDrawListPage, code: string, tab: DrawTab): Promise<void> {
  await list.selectTab(tab);
  await list.searchDraws(code);
  await expect(list.rowFor(code), `Draw "${code}" should NOT be listed under "${tab}"`).toHaveCount(0, { timeout: 15000 });
}

/**
 * Wait until the background ticket upload has loaded `count` tickets (list "Ticket Count").
 * The server refuses to review a draw before that: "This draw has no tickets. Please upload tickets
 * before reviewing the draw."
 */
export async function waitForTicketsLoaded(list: LotteryDrawListPage, code: string, count: number, timeoutMs = 5 * 60000): Promise<void> {
  await expect
    .poll(async () => {
      await list.open();
      return (await list.getDrawData(code)).ticketCount;
    }, { message: `Draw "${code}" should get its ${count} uploaded tickets`, timeout: timeoutMs, intervals: [5000, 10000] })
    .toBe(String(count));
}

/** Wait for the tickets, Review the draw and check it moved from Under Review to Pending Approval. */
export async function reviewDrawAndVerify(list: LotteryDrawListPage, code: string, ticketCount = 100): Promise<void> {
  await waitForTicketsLoaded(list, code, ticketCount);
  await list.open();
  const res = await list.reviewDraw(code);
  expect(res.status(), `Review of ${code} should succeed`).toBeLessThan(400);
  await list.open();
  await expectDrawInTab(list, code, DRAW_TAB.PENDING_APPROVAL);
}

/** Approve with the upload MD5 and check the draw left Pending Approval for Approved (or already In Play). */
export async function approveDrawAndVerify(list: LotteryDrawListPage, code: string, md5: string): Promise<void> {
  await list.open();
  const res = await list.approveDraw(code, md5);
  expect(res.status(), `Approve of ${code} with its MD5 should succeed: ${await res.text().catch(() => '')}`).toBeLessThan(400);
  await list.open();
  await expectDrawNotInTab(list, code, DRAW_TAB.PENDING_APPROVAL);
  await list.selectTab(DRAW_TAB.ALL);
}

/**
 * Wait (reloading the list every `everyMs`) until the draw appears under `tab` - for the scheduled
 * transitions In Play -> In Play Post Cutoff -> Completed, which the server performs on its own.
 */
export async function waitForDrawInTab(
  list: LotteryDrawListPage,
  code: string,
  tab: DrawTab,
  timeoutMs: number,
  everyMs = 30000
): Promise<number> {
  const started = Date.now();
  await expect
    .poll(async () => {
      try {
        await list.open();
        return await list.isListedIn(code, tab);
      } catch (error) {
        // a long wait must survive a transient network blip (e.g. net::ERR_NAME_NOT_RESOLVED)
        logger.warn(`⚠️ Polling ${code} for "${tab}" failed, retrying: ${String(error).split('\n')[0]}`);
        return false;
      }
    }, { message: `Draw "${code}" should reach "${tab}" within ${Math.round(timeoutMs / 60000)} min`, timeout: timeoutMs, intervals: [everyMs] })
    .toBe(true);
  const took = Date.now() - started;
  logger.info(`⏱️ ${code} reached "${tab}" after ${Math.round(took / 1000)}s`);
  await TestHelper.attachText(`${code} -> ${tab}`, `${Math.round(took / 1000)} s after polling started`);
  return took;
}

/**
 * afterEach cleanup: draws cannot be deleted, so the test's own draws ("AT..." codes) that are still
 * Under Review / Pending Approval are REJECTED. Approved draws are left alone (their far-future
 * schedule keeps them out of play); lifecycle draws complete on their own.
 */
export async function cleanupDraws(list: LotteryDrawListPage, codes: string[]): Promise<void> {
  const own = [...new Set(codes)].filter((c) => /^AT/.test(c));
  for (const code of own) {
    try {
      await list.open();
      await list.searchDraws(code);
      if ((await list.rowFor(code).count()) === 0) continue;
      const row = await list.getDrawData(code);
      if (!/Under Review|Pending Approval/i.test(row.status)) continue;
      await list.rejectDraw(code);
      logger.info(`🧹 Rejected leftover draw ${code} (${row.status})`);
    } catch (error) {
      logger.warn(`⚠️ Could not clean up draw ${code}: ${String(error).split('\n')[0]}`);
    }
  }
}
