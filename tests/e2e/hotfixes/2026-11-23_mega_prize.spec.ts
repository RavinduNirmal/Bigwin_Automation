import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerHotfixMetadata } from '../../../data/metadata/hotfix';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import {
  MEGA_PRIZE_FORMAT,
  createDrawWithMegaPrize,
  deleteOwnDraws,
  reviewAndApprove,
  waitForTicketsLoaded,
} from '../../../utils/helpers/lottery-draw';

registerHotfixMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 10 * 60 * 1000 });
// copy & paste needs clipboard access in the browser
combinedTest.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/**
 * HOTFIX 2026-11-23 - Create Draw > Step 1 "Mega Prize" takes cents and supports copy & paste
 * (business copies the amount from another place). TC-HF-MP-*; metadata in data/metadata/hotfix/.
 */
combinedTest.describe('Hotfix - Mega Prize cents & copy-paste', { tag: ['@hotfix', '@mega-prize'] }, () => {
  combinedTest.beforeEach(async ({ authenticatedPage, createDrawPage }) => {
    void authenticatedPage;
    CreateDrawPage.submittedCodes.length = 0;
    await createDrawPage.open();
  });

  combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
    await deleteOwnDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
    CreateDrawPage.submittedCodes.length = 0;
  });

  combinedTest.describe('Field - typing cents', () => {
    combinedTest('TC-HF-MP-001: Mega Prize accepts an amount with cents when it is typed', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-001', page);
      for (const amount of ['1000000.50', '1000.5', '0.50']) {
        expect(await create.typeMegaPrize(amount), `Typed "${amount}" should be kept exactly`).toBe(amount);
      }
      TestHelper.success('Cents can be typed');
    });

    combinedTest('TC-HF-MP-002: Only two decimal places (cents) can be entered', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-002', page);
      expect(await create.typeMegaPrize('1000.555'), 'A third decimal digit must not be accepted').toBe('1000.55');
      TestHelper.success('Two decimal places max');
    });

    combinedTest('TC-HF-MP-003: Only one decimal point can be entered', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-003', page);
      const value = await create.typeMegaPrize('1000.50.25');
      expect(value, 'A second "." must not be accepted').toBe('1000.50');
      expect(value).toMatch(MEGA_PRIZE_FORMAT);
      TestHelper.success('One decimal point max');
    });

    combinedTest('TC-HF-MP-004: Letters, minus and other symbols are still blocked after the hotfix', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-004', page);
      const expected: Record<string, string> = { abc: '', '12a3': '123', '-5': '5', '1e5': '15' };
      for (const [typed, kept] of Object.entries(expected)) {
        expect(await create.typeMegaPrize(typed), `Typed "${typed}": only the digits may be kept`).toBe(kept);
      }
      TestHelper.success('Non-digits still blocked');
    });

    combinedTest('TC-HF-MP-015: Typing an amount that starts with the decimal point (.50) must not change it into 50', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-015', page);
      const value = await create.typeMegaPrize('.50');
      expect(value, `Typed ".50" (50 cents) became "${value}" - must be 0.50 or .50, never 50`).toMatch(/^0?\.50$/);
      TestHelper.success('Leading decimal point kept');
    });
  });

  combinedTest.describe('Field - copy & paste', () => {
    combinedTest('TC-HF-MP-005: Pasting a plain amount with cents keeps it exactly', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-005', page);
      for (const amount of ['1000000.50', '2500.75', '1000000']) {
        expect(await create.pasteIntoMegaPrize(amount), `Pasted "${amount}" should be kept exactly`).toBe(amount);
      }
      TestHelper.success('Plain amounts paste exactly');
    });

    combinedTest('TC-HF-MP-006: Pasting an amount with thousand separators gives the plain number', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-006', page);
      expect(await create.pasteIntoMegaPrize('1,000,000.50'), 'Commas should be removed').toBe('1000000.50');
      expect(await create.pasteIntoMegaPrize('25,000'), 'Commas should be removed').toBe('25000');
      TestHelper.success('Thousand separators removed');
    });

    combinedTest('TC-HF-MP-007: Pasting an amount copied from a spreadsheet cell (spaces, tab or line break around it)', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-007', page);
      const cases: Array<[string, string]> = [[' 1000000.50 ', '1000000.50'], ['1000000.50\r\n', '1000000.50'], ['\t2500.75\t', '2500.75']];
      for (const [clip, kept] of cases) {
        expect(await create.pasteIntoMegaPrize(clip), `Pasted ${JSON.stringify(clip)}`).toBe(kept);
      }
      TestHelper.success('Whitespace removed');
    });

    combinedTest('TC-HF-MP-008: Pasting an amount copied together with its currency', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-008', page);
      expect(await create.pasteIntoMegaPrize('LKR 1,000,000.50'), 'Only the amount should be kept').toBe('1000000.50');
      expect(await create.pasteIntoMegaPrize('Rs. 2,500.75'), 'Only the amount should be kept').toBe('2500.75');
      TestHelper.success('Currency text removed');
    });

    combinedTest('TC-HF-MP-009: Pasting an amount with more than two decimal places keeps only two', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-009', page);
      expect(await create.pasteIntoMegaPrize('1000000.505'), 'Never more than two decimal places').toBe('1000000.50');
      TestHelper.success('Extra decimals cut');
    });

    combinedTest('TC-HF-MP-010: Pasting text that contains no amount leaves Mega Prize empty, and the draw cannot continue', async ({ page, createDrawPage: create, testLotteryDrawData: data }) => {
      await TestHelper.initTest('TC-HF-MP-010', page);
      await create.fillDetails({ ...data.unique(), megaPrize: undefined });
      expect(await create.pasteIntoMegaPrize('abc'), 'Pasting "abc" should leave Mega Prize empty').toBe('');
      const out = await create.attemptNext();
      expect(out.onStep2, 'Next with an empty Mega Prize must stay on Step 1').toBe(false);
      TestHelper.success('No amount - blocked');
    });

    combinedTest('TC-HF-MP-011: Paste works at the cursor and over a selected value', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-011', page);
      await create.typeMegaPrize('100');
      expect(await create.pasteIntoMegaPrize('.25', { replace: false }), 'Pasting ".25" after 100').toBe('100.25');
      await create.typeMegaPrize('999');
      await create.megaPrizeInput.selectText();
      await page.evaluate(() => navigator.clipboard.writeText('2500.75'));
      await page.keyboard.press('ControlOrMeta+V');
      await expect(create.megaPrizeInput, 'Pasting over the selected 999 should replace it').toHaveValue('2500.75');
      TestHelper.success('Paste at cursor and over selection');
    });

    combinedTest('TC-HF-MP-012: The Mega Prize amount can be copied out of the field', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-012', page);
      await create.typeMegaPrize('2500.75');
      expect(await create.copyMegaPrize(), 'Clipboard after Ctrl+C').toBe('2500.75');
      TestHelper.success('Copy works');
    });

    combinedTest('TC-HF-MP-016: Pasting an amount that starts with the decimal point (.50) must not change it into 50', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-016', page);
      const value = await create.pasteIntoMegaPrize('.50');
      expect(value, `Pasted ".50" (50 cents) became "${value}" - must be 0.50 or .50, never 50`).toMatch(/^0?\.50$/);
      TestHelper.success('Leading decimal point kept on paste');
    });

    combinedTest('TC-HF-MP-017: Pasting an amount with space groups and a comma keeps only the digits', async ({ page, createDrawPage: create }) => {
      await TestHelper.initTest('TC-HF-MP-017', page);
      // business rule (2026-11-23): a comma is a thousand separator, only "." is a decimal point
      expect(await create.pasteIntoMegaPrize('1 000 000,50'), 'Spaces and the comma should be removed').toBe('100000050');
      TestHelper.success('Only the digits kept');
    });
  });

  combinedTest.describe('Field - validation', () => {
    combinedTest('TC-HF-MP-013: An amount below 1 but above 0 (cents only) is accepted', async ({ page, createDrawPage: create, testLotteryDrawData: data }) => {
      await TestHelper.initTest('TC-HF-MP-013', page);
      for (const amount of ['0.01', '0.50']) {
        await create.open();
        await create.fillDetails({ ...data.unique(), megaPrize: amount });
        const out = await create.attemptNext();
        expect(out.onStep2, `Mega Prize ${amount} should be accepted - Step 2 should open`).toBe(true);
      }
      TestHelper.success('Cents-only amounts accepted');
    });

    combinedTest('TC-HF-MP-014: A zero amount written with cents (0.00) is rejected', async ({ page, createDrawPage: create, testLotteryDrawData: data }) => {
      await TestHelper.initTest('TC-HF-MP-014', page);
      await create.fillDetails({ ...data.unique(), megaPrize: '0.00' });
      const out = await create.attemptNext();
      expect(out.onStep2, 'Mega Prize 0.00 must keep the page on Step 1').toBe(false);
      await expect(create.fieldError('Mega Prize must be greater than 0'), '0.00 should show the "greater than 0" error').toBeVisible();
      TestHelper.success('0.00 rejected');
    });
  });

  combinedTest.describe('Create draw - saved amount', () => {
    combinedTest('TC-HF-MP-018: A draw created with a typed cents Mega Prize saves and shows the cents (also after approval)', async ({ page, createDrawPage: create, lotteryDrawListPage: list, lotteryDrawDetailPage: detail, testLotteryDrawData: data }) => {
      await TestHelper.initTest('TC-HF-MP-018', page);
      const draw = data.unique();
      const file = data.ticketFile(draw);
      const created = await createDrawWithMegaPrize(page, create, draw, file, '2500.05', 'type');
      expect(created.sentMegaPrize, 'Mega Prize sent to the server').toBe('2500.05');
      await detail.open(created.drawId);
      expect(await detail.readMegaPrize(draw.code), 'Draw page Mega Prize after create').toBe('2500.05');
      await waitForTicketsLoaded(list, draw.code, file.recordCount);
      await reviewAndApprove(list, draw.code, file.md5);
      await detail.open(created.drawId);
      expect(await detail.readMegaPrize(draw.code), 'Draw page Mega Prize after approval').toBe('2500.05');
      TestHelper.success('2500.05 saved and kept after approval');
    });

    combinedTest('TC-HF-MP-019: A draw created with a PASTED formatted Mega Prize saves the right amount', async ({ page, createDrawPage: create, lotteryDrawDetailPage: detail, testLotteryDrawData: data }) => {
      await TestHelper.initTest('TC-HF-MP-019', page);
      const draw = data.unique();
      const created = await createDrawWithMegaPrize(page, create, draw, data.ticketFile(draw), 'LKR 1,000,000.50', 'paste');
      // The page sends the amount as a number (1000000.5 === 1000000.50), so compare the amount, not the text.
      expect(Number(created.sentMegaPrize), 'Mega Prize amount sent to the server').toBe(1000000.5);
      await detail.open(created.drawId);
      expect(await detail.readMegaPrize(draw.code), 'Draw page Mega Prize (two decimal places)').toBe('1000000.50');
      TestHelper.success('Pasted amount saved correctly');
    });

    combinedTest('TC-HF-MP-020: The draw page shows a cents amount with both decimal places', async ({ page, createDrawPage: create, lotteryDrawDetailPage: detail, testLotteryDrawData: data }) => {
      await TestHelper.initTest('TC-HF-MP-020', page);
      const draw = data.unique();
      const created = await createDrawWithMegaPrize(page, create, draw, data.ticketFile(draw), '1000000.50', 'type');
      await detail.open(created.drawId);
      expect(await detail.readMegaPrize(draw.code), 'Draw page should show the amount with two decimal places').toBe('1000000.50');
      TestHelper.success('Two decimal places shown');
    });

    combinedTest('TC-HF-MP-021: A whole-number Mega Prize still works after the hotfix', async ({ page, createDrawPage: create, lotteryDrawDetailPage: detail, testLotteryDrawData: data }) => {
      await TestHelper.initTest('TC-HF-MP-021', page);
      const draw = data.unique();
      const created = await createDrawWithMegaPrize(page, create, draw, data.ticketFile(draw), '1000000', 'type');
      expect(created.sentMegaPrize, 'Mega Prize sent to the server').toBe('1000000');
      await detail.open(created.drawId);
      // Business rule: every amount is shown with two decimal places for consistency, so 1000000 -> 1000000.00
      expect(await detail.readMegaPrize(draw.code), 'Draw page Mega Prize (whole number shown with .00)').toBe('1000000.00');
      TestHelper.success('Whole number saved and shown as 1000000.00');
    });
  });
});
