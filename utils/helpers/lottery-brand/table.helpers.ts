import { expect } from '@playwright/test';
import { LotteryBrandListPage, BrandColumn } from '../../../pages/lottery-brand/lottery-brand-list.page';

export type SortDirection = 'ascending' | 'descending';

/**
 * Compare like the brand list API does: text columns are ordered as plain case-insensitive text
 * (so "123098" comes before "1234"), Price numerically.
 */
export function compareBrandValues(column: BrandColumn, a: string, b: string): number {
  if (column === 'Price') return Number(a) - Number(b);
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

export function isBrandColumnSorted(column: BrandColumn, values: string[], direction: SortDirection): boolean {
  return values.every((v, i) => {
    if (i === 0) return true;
    const c = compareBrandValues(column, values[i - 1], v);
    return direction === 'ascending' ? c <= 0 : c >= 0;
  });
}

/**
 * Click a column's sort button and check the visible rows (page 1, server-sorted) are ordered by it.
 * Pass `expected` to require a direction (e.g. the reverse of the previous click). Without it, the
 * direction is read from the data (ascending is assumed when all values are equal).
 */
export async function sortBrandsAndVerify(
  listPage: LotteryBrandListPage,
  column: BrandColumn,
  expected?: SortDirection
): Promise<SortDirection> {
  await listPage.sortByColumn(column);
  let direction: SortDirection | null = null;
  let values: string[] = [];
  try {
    await expect
      .poll(async () => {
        values = await listPage.columnValues(column);
        if (expected) {
          direction = isBrandColumnSorted(column, values, expected) ? expected : null;
        } else {
          direction = isBrandColumnSorted(column, values, 'ascending') ? 'ascending'
            : isBrandColumnSorted(column, values, 'descending') ? 'descending' : null;
        }
        return direction !== null;
      }, { message: `After clicking "${column}", rows should be sorted by ${column}${expected ? ` (${expected})` : ''}`, timeout: 15000 })
      .toBe(true);
  } catch (error) {
    throw new Error(`${(error as Error).message}\nRows shown (${column}): ${values.join(' | ')}`);
  }
  return direction as unknown as SortDirection;
}

/**
 * Click a column header twice and check the order really reverses: the first row after the
 * ascending click must differ from the first row after the descending click (the column has
 * at least two distinct values across all brands).
 */
export async function expectSortReverses(listPage: LotteryBrandListPage, column: BrandColumn): Promise<void> {
  await listPage.sortByColumn(column);
  const first = await listPage.columnValues(column);
  await listPage.sortByColumn(column);
  await expect
    .poll(async () => (await listPage.columnValues(column))[0], {
      message: `Sorting by ${column} twice should reverse the order (first row was "${first[0]}" both times)`,
      timeout: 15000,
    })
    .not.toBe(first[0]);
}

/** Every visible row's `column` equals `value` (e.g. all Stage cells are "Approved" on the Approved tab). */
export async function expectAllRowsHave(listPage: LotteryBrandListPage, column: BrandColumn, value: string): Promise<void> {
  await expect
    .poll(async () => (await listPage.columnValues(column)).filter((v) => v !== value), {
      message: `Every row should have ${column} "${value}"`,
      timeout: 15000,
    })
    .toEqual([]);
}
