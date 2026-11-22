import { Page } from '@playwright/test';
import { LotteryDrawListPage } from '../../../pages/draw/lottery-draw-list.page';

/** Body of the Draws list request POST /api/draw. */
export interface DrawListRequest {
  view?: string;
  query?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  rowsPerPage?: number;
}

/**
 * Run `action` and return the body of the POST /api/draw list request it triggers (the first one
 * matching `match`) - for checks of view / query / sortBy / sortDir / page.
 */
export async function captureListRequest(
  page: Page,
  action: () => Promise<unknown>,
  match: (body: DrawListRequest) => boolean = () => true
): Promise<DrawListRequest> {
  const request = page.waitForRequest(
    (r) => LotteryDrawListPage.LIST_API.test(new URL(r.url()).pathname) && r.method() === 'POST'
      && match((r.postDataJSON() ?? {}) as DrawListRequest)
  );
  const [sent] = await Promise.all([request, action()]);
  return (sent.postDataJSON() ?? {}) as DrawListRequest;
}

/** List date "YYYY.MM.DD hh:mm AM/PM" -> epoch ms (NaN when the cell is empty / not a date). */
export function parseDrawDate(text: string): number {
  const m = /^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2}) (AM|PM)$/.exec(text.trim());
  if (!m) return NaN;
  const hour = (Number(m[4]) % 12) + (m[6] === 'PM' ? 12 : 0);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, Number(m[5])).getTime();
}

/** At least two values and monotonic in the given direction. */
export function isOrdered<T extends number | string>(values: T[], dir: 'asc' | 'desc'): boolean {
  return values.length >= 2 && values.every((v, i) => i === 0 || (dir === 'asc' ? values[i - 1] <= v : values[i - 1] >= v));
}
