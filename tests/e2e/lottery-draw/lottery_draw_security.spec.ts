import { mergeTests } from '@playwright/test';
import { test, expect } from '../../../fixtures/auth.fixture';
import { test as drawDataTest } from '../../../fixtures/lottery-draw-data.fixture';
import { TestHelper } from '../../../utils/helpers/common';
import { registerLotteryDrawMetadata } from '../../../data/metadata/lottery-draw';
import { CreateDrawPage } from '../../../pages/draw/create-draw.page';
import { cleanupDraws } from '../../../utils/helpers/lottery-draw';

registerLotteryDrawMetadata();

const combinedTest = mergeTests(test, drawDataTest);
combinedTest.describe.configure({ mode: 'default', timeout: 300000 });

/** Id of an existing draw used only to prove a logged-out deep link leaks nothing (assumption: it exists on dev). */
const EXISTING_DRAW_ID = 939;
const XSS = '<img src=x onerror=alert(1)>';

combinedTest.describe('Lottery Draw Security', () => {
  combinedTest.describe('logged out', () => {
    combinedTest.use({ restoreSession: false, storageState: { cookies: [], origins: [] } });

    combinedTest('TC-LD-SEC-001: Logged-out users cannot open the Draws list or Create Draw', async ({ page, loginPage, lotteryDrawListPage: list, createDrawPage: create }) => {
      await TestHelper.initTest('TC-LD-SEC-001', page);
      const okDrawApi: string[] = [];
      page.on('response', (r) => {
        if (/\/api\/draw(\/|$)/.test(new URL(r.url()).pathname) && r.ok()) okDrawApi.push(r.url());
      });
      await page.goto('/dashboard/draw');
      await expect(page, 'Draws list should redirect to login').toHaveURL(/\/auth\/jwt\/login/, { timeout: 30000 });
      await loginPage.verifyPageLoaded();
      await expect(list.pageHeading(), 'No draw list heading when logged out').toBeHidden();
      await expect(list.dataTable()).toBeHidden();
      await page.goto('/dashboard/draw/create-draw');
      await expect(page, 'Create Draw should redirect to login').toHaveURL(/\/auth\/jwt\/login/, { timeout: 30000 });
      await loginPage.verifyPageLoaded();
      await expect(create.heading, 'No Create Draw form when logged out').toBeHidden();
      expect(okDrawApi, 'No draw API call may succeed without a session').toEqual([]);
      TestHelper.success('Draw routes protected');
    });

    combinedTest('TC-LD-SEC-002: A logged-out user opening a draw page URL sees no draw data', async ({ page, loginPage, lotteryDrawDetailPage: detail }) => {
      await TestHelper.initTest('TC-LD-SEC-002', page);
      await page.goto(`/dashboard/draw/edit-lottery-draw?drawId=${EXISTING_DRAW_ID}`);
      await expect(page, 'Draw page should redirect to login').toHaveURL(/\/auth\/jwt\/login/, { timeout: 30000 });
      await loginPage.verifyPageLoaded();
      await expect(detail.approvalStageField, 'Draw details must never be rendered').toBeHidden();
      await expect(detail.drawCodeField).toBeHidden();
      TestHelper.success('Deep link leaks no draw data');
    });
  });

  combinedTest.describe('logged in', () => {
    combinedTest.beforeEach(async ({ authenticatedPage, lotteryDrawListPage }) => {
      void authenticatedPage;
      CreateDrawPage.submittedCodes.length = 0;
      await lotteryDrawListPage.goto();
    });

    combinedTest.afterEach(async ({ lotteryDrawListPage }) => {
      await cleanupDraws(lotteryDrawListPage, CreateDrawPage.submittedCodes);
      CreateDrawPage.submittedCodes.length = 0;
    });

    combinedTest('TC-LD-SEC-003: A non-existent drawId shows a clear not-found state', async ({ page, lotteryDrawDetailPage: detail }) => {
      await TestHelper.initTest('TC-LD-SEC-003', page);
      await page.goto('/dashboard/draw/edit-lottery-draw?drawId=99999999');
      const notFound = detail.notFoundMessage();
      await expect
        .poll(async () => new URL(page.url()).pathname === '/dashboard/draw' || (await notFound.isVisible()), {
          message: 'An unknown drawId should show a "not found" message or return to the list - not an empty draw form',
          timeout: 20000,
        })
        .toBe(true);
      await expect(detail.approvalStageField, 'No empty draw form may be shown').toBeHidden();
      TestHelper.success('Unknown drawId handled');
    });

    combinedTest('TC-LD-SEC-004: HTML in the search text is not rendered or executed', async ({ page, lotteryDrawListPage: list }) => {
      await TestHelper.initTest('TC-LD-SEC-004', page);
      const alerts: string[] = [];
      page.on('dialog', (d) => {
        alerts.push(d.message());
        void d.dismiss();
      });
      const injected = list.injectedImage();
      await list.searchDraws(XSS);
      await expect(injected, 'No <img> may be injected by the search text').toHaveCount(0);
      await expect(list.dataRows(), 'The payload matches no draw').toHaveCount(0);
      await page.goto(`/dashboard/draw?query=${encodeURIComponent(XSS)}`);
      await list.verifyPageLoaded();
      await expect(injected, 'No <img> may be injected by the URL query').toHaveCount(0);
      expect(alerts, 'No alert may fire').toEqual([]);
      await list.open();
      TestHelper.success('Search text not rendered as HTML');
    });
  });
});
