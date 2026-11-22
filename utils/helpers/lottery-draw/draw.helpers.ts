import { expect } from '@playwright/test';
import { CreateDrawPage, CreatedDraw } from '../../../pages/draw/create-draw.page';
import { DrawRow, LotteryDrawListPage } from '../../../pages/draw/lottery-draw-list.page';
import { DrawTab, DRAW_TAB, DRAW_TAB_STATUS, LotteryDrawData } from '../../../data/factories/lottery-draw-data.factory';
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

/**
 * The draw is listed in `tab` (click the tab, search its code there) and - for a stage tab - its
 * Status column shows that stage. Ends with that tab selected.
 */
export async function expectDrawInTab(list: LotteryDrawListPage, code: string, tab: DrawTab): Promise<void> {
  if (tab === DRAW_TAB.ALL) {
    await list.selectTab(tab);
    await list.searchDraws(code);
    await expect(list.rowFor(code), `Draw "${code}" should be listed under "${tab}"`).toHaveCount(1, { timeout: 15000 });
    return;
  }
  await verifyDrawInStageTab(list, code, tab, DRAW_TAB_STATUS[tab]);
}

/**
 * Status-change confirmation used by every draw spec: on the All tab the draw's Status must become
 * `status` (re-searching a few times while the list catches up), then clicking `tab` must list the
 * draw with that Status. Fails the test otherwise. `tab` may depend on the status seen. Ends on `tab`.
 */
export async function verifyDrawStatusChange(
  list: LotteryDrawListPage,
  code: string,
  tab: Exclude<DrawTab, 'All'> | ((seen: string) => Exclude<DrawTab, 'All'>),
  status: RegExp = typeof tab === 'string' ? DRAW_TAB_STATUS[tab] : /./,
  timeoutMs = 30000
): Promise<DrawRow> {
  await list.selectTab(DRAW_TAB.ALL);
  let seen = '';
  await expect
    .poll(async () => {
      await list.searchDraws(code);
      seen = (await list.readDrawRow(code)).status;
      return seen;
    }, { message: `Draw "${code}" should show Status ${status} on the All tab`, timeout: timeoutMs, intervals: [5000] })
    .toMatch(status);
  const stageTab = typeof tab === 'string' ? tab : tab(seen);
  await TestHelper.attachText(`${code} status`, `All tab: "${seen}" -> confirming under "${stageTab}"`);
  return verifyDrawInStageTab(list, code, stageTab, DRAW_TAB_STATUS[stageTab]);
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
export async function waitForTicketsLoaded(
  list: LotteryDrawListPage,
  code: string,
  count: number,
  timeoutMs = 5 * 60000,
  intervals: number[] = [5000, 10000]
): Promise<void> {
  await expect
    .poll(async () => {
      await list.open();
      return (await list.getDrawData(code)).ticketCount;
    }, { message: `Draw "${code}" should get its ${count} uploaded tickets`, timeout: timeoutMs, intervals })
    .toBe(String(count));
}

/** Wait for the tickets, Review the draw and check it moved from Under Review to Pending Approval. */
export async function reviewDrawAndVerify(list: LotteryDrawListPage, code: string, ticketCount = 100): Promise<void> {
  await waitForTicketsLoaded(list, code, ticketCount);
  await list.open();
  const res = await list.reviewDraw(code);
  expect(res.status(), `Review of ${code} should succeed: ${await res.text().catch(() => '')}`).toBeLessThan(400);
  await list.open();
  await verifyDrawStatusChange(list, code, DRAW_TAB.PENDING_APPROVAL);
}

/**
 * Approve with the upload MD5, confirm the new status (All tab, then the Approved tab - or In Play if
 * the start time already passed) and that it left Pending Approval. Ends on the All tab.
 */
export async function approveDrawAndVerify(list: LotteryDrawListPage, code: string, md5: string): Promise<void> {
  await list.open();
  const res = await list.approveDraw(code, md5);
  expect(res.status(), `Approve of ${code} with its MD5 should succeed: ${await res.text().catch(() => '')}`).toBeLessThan(400);
  await list.open();
  await verifyDrawStatusChange(list, code, (seen) => (/^In Play$/i.test(seen) ? DRAW_TAB.IN_PLAY : DRAW_TAB.APPROVED), /^(Approved|In Play)$/i);
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
 * Stay on the current tab (e.g. "All") with the draw searched and wait until its Status column
 * matches `status` - the status visibly changes in place. Light on the backend: when `notBefore`
 * (a scheduled time) is given it first waits until then WITHOUT any request, and each check is a
 * single search request (the row is read without searching again). Returns the status it saw.
 */
export async function waitForDrawStatus(
  list: LotteryDrawListPage,
  code: string,
  status: RegExp,
  timeoutMs: number,
  options: { everyMs?: number; notBefore?: Date } = {}
): Promise<string> {
  const everyMs = options.everyMs ?? 15000;
  if (options.notBefore) {
    const idle = options.notBefore.getTime() - Date.now();
    if (idle > 0) {
      logger.info(`⏳ ${code}: next change due at ${options.notBefore.toLocaleTimeString()} - waiting ${Math.round(idle / 1000)}s without searching`);
      await list.page.waitForTimeout(idle); // deliberate idle wait: no requests until the scheduled time
    }
  }
  let seen = '';
  await expect
    .poll(async () => {
      try {
        await list.searchDraws(code);
        seen = (await list.readDrawRow(code)).status;
        logger.info(`👀 ${code} status: ${seen}`);
        return status.test(seen);
      } catch (error) {
        logger.warn(`⚠️ Reading the status of ${code} failed, retrying: ${String(error).split(/\r?\n/)[0]}`);
        return false;
      }
    }, { message: `Draw "${code}" status should become ${status}`, timeout: timeoutMs, intervals: [everyMs] })
    .toBe(true);
  return seen;
}

/**
 * Confirm a status change on its own stage tab: click `tab`, search the draw and ASSERT it is listed
 * there exactly once with a Status matching `status`. Fails the test otherwise. Ends on `tab`.
 */
export async function verifyDrawInStageTab(
  list: LotteryDrawListPage,
  code: string,
  tab: DrawTab,
  status: RegExp
): Promise<DrawRow> {
  await list.selectTab(tab);
  await expect(list.tab(tab), `"${tab}" tab should be selected`).toHaveAttribute('aria-selected', 'true');
  await list.searchDraws(code);
  await expect(list.rowFor(code), `Draw "${code}" should be listed under the "${tab}" tab`).toHaveCount(1, { timeout: 15000 });
  const row = await list.readDrawRow(code);
  expect(row.status, `Draw "${code}" under the "${tab}" tab should show Status ${status}`).toMatch(status);
  logger.info(`✅ ${code} confirmed under the "${tab}" tab (Status "${row.status}")`);
  return row;
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
