import { Page, Request, expect } from '@playwright/test';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { LotteryDrawData } from '../../../data/factories/lottery-draw-data.factory';
import { TicketDbfFile } from '../../dbf/ticket-dbf.service';
import { TestHelper } from '../common/test-helper';
import { responseError } from './checksum.helpers';

/**
 * Mega Prize hotfix (2026-11-23): Create Draw Step 1 "Mega Prize" accepts cents (up to 2 decimal places)
 * and supports copy & paste. Field facts (dev): type="text" inputmode="decimal"; non-digits are dropped,
 * only one "." is kept and digits after the 2nd decimal place are cut.
 */
export const MEGA_PRIZE_FORMAT = /^\d+(\.\d{0,2})?$/;

export interface MegaPrizeDraw {
  drawId: number;
  /** megaPrize exactly as the page sent it in POST /api/draw/create. */
  sentMegaPrize: string;
}

/**
 * Create a draw whose Mega Prize is TYPED (`how: 'type'`) or PASTED (`how: 'paste'`) as `megaPrize`,
 * with its own ticket file; asserts the draw is created and returns the value the page sent.
 */
export async function createDrawWithMegaPrize(
  page: Page, create: CreateDrawPage, draw: LotteryDrawData, file: TicketDbfFile, megaPrize: string, how: 'type' | 'paste'
): Promise<MegaPrizeDraw> {
  await create.open();
  await create.fillDetails({ ...draw, megaPrize: undefined });
  const shown = how === 'paste' ? await create.pasteIntoMegaPrize(megaPrize) : await create.typeMegaPrize(megaPrize);
  await TestHelper.attachText('Mega Prize entered', `${how} "${megaPrize}" -> box shows "${shown}"`);
  await create.goToUploadStep();
  await create.attachTicketFile(file.filePath);
  await create.md5Input.fill(file.md5);
  await create.initiateNowCheckbox.check();
  const request: Promise<Request> = page.waitForRequest((r) => /\/api\/draw\/create$/.test(new URL(r.url()).pathname), { timeout: 60000 });
  const { draw: res } = await create.submitCreateDraw(draw.code);
  const body = ((await request).postDataJSON() ?? {}) as { megaPrize?: unknown; lotteryBrandId?: unknown };
  const error = res.status() === 201 ? '' : await responseError(res);
  expect(res.status(), `Creating draw ${draw.code} with Mega Prize "${megaPrize}" - server answered "${error}" `
    + `(sent megaPrize ${JSON.stringify(body.megaPrize)}, lotteryBrandId ${JSON.stringify(body.lotteryBrandId)}; `
    + 'lotteryBrandId 0 = known intermittent create-draw defect, not the Mega Prize)').toBe(201);
  const json = (await res.json().catch(() => ({}))) as { results?: number };
  return { drawId: Number(json.results), sentMegaPrize: String(body.megaPrize) };
}
