import { expect } from '@playwright/test';
import { LotteryTypePage, LotteryTypeColumn } from '../../../pages/lottery-type/lottery-type.page';

export type SortDirection = 'ascending' | 'descending';

export const compareValues = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });

export function isSorted(values: string[], direction: SortDirection): boolean {
  return values.every((v, i) =>
    i === 0 || (direction === 'ascending' ? compareValues(values[i - 1], v) <= 0 : compareValues(values[i - 1], v) >= 0)
  );
}

/** The direction the values are sorted in, or null if they are not sorted at all. */
export function sortDirectionOf(values: string[]): SortDirection | null {
  if (isSorted(values, 'ascending')) return 'ascending';
  if (isSorted(values, 'descending')) return 'descending';
  return null;
}

/**
 * Click a column's sort button and check the visible rows end up ordered by that column.
 * The app's headers do not expose aria-sort, so the direction is read from the data itself;
 * pass `expected` to require a specific direction (e.g. the reverse of the previous click).
 * Sortedness holds no matter which rows other workers add.
 */
export async function sortAndVerify(
  lotteryTypePage: LotteryTypePage,
  column: LotteryTypeColumn,
  expected?: SortDirection
): Promise<SortDirection> {
  await lotteryTypePage.sortByColumn(column);
  let direction: SortDirection | null = null;
  let lastValues: string[] = [];
  try {
    await expect
      .poll(async () => {
        lastValues = await lotteryTypePage.columnValues(column);
        direction = sortDirectionOf(lastValues);
        return expected ? direction === expected : direction !== null;
      }, {
        message: `After clicking "${column}", rows should be sorted by ${column}${expected ? ` (${expected})` : ''}`,
        timeout: 15000,
      })
      .toBe(true);
  } catch (error) {
    throw new Error(`${(error as Error).message}\nRows shown (${column}): ${lastValues.join(' | ')}`);
  }
  return direction as unknown as SortDirection;
}
