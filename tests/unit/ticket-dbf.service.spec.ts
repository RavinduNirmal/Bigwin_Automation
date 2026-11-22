import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '@playwright/test';
import { TestHelper } from '../../utils/helpers/common';
import { registerLotteryDrawMetadata } from '../../data/metadata/lottery-draw';
import {
  generateTicketRecords,
  writeTicketDbf,
  readTicketDbf,
  md5Of,
} from '../../utils/dbf/ticket-dbf.service';

registerLotteryDrawMetadata();

/**
 * Unit tests of utils/dbf/ticket-dbf.service.ts - the Node port of utils/dbf_ticket_generator.html.
 * TC-DBF-002 opens the HTML tool in the browser (file://) and compares the two files.
 */
test.describe('Ticket DBF Service', () => {
  test.describe.configure({ mode: 'default' });
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-DBF-001: Generated tickets have the right barcodes and format', async ({ page }, testInfo) => {
    await TestHelper.initTest('TC-DBF-001', page);
    const file = writeTicketDbf({ startId: '2026112101001', totalRecords: 100, prefix: '0', numbersPerRecord: 4 }, testInfo.outputPath(), 'MS2026112101');
    expect(file.recordCount).toBe(100);
    expect(file.firstBarcode).toBe('02026112101001');
    expect(file.lastBarcode).toBe('02026112101100');
    const { records } = readTicketDbf(file.filePath);
    expect(records.map((r) => r.BARCODE)).toEqual(Array.from({ length: 100 }, (_, i) => `0${2026112101001 + i}`));
    for (const r of records) {
      expect(r.LETTERS, `LETTERS of ${r.BARCODE}`).toMatch(/^[A-Z]$/);
      expect(r.NUMBERS, `NUMBERS of ${r.BARCODE}`).toMatch(/^\d{2},\d{2},\d{2},\d{2}$/);
      const nums = r.NUMBERS.split(',').map(Number);
      expect(new Set(nums).size, 'numbers are unique within a ticket').toBe(4);
      expect(nums.every((n) => n >= 1 && n <= 80)).toBe(true);
    }
    await TestHelper.attachText('First tickets', records.slice(0, 5).map((r) => `${r.BARCODE} ${r.LETTERS} ${r.NUMBERS}`).join('\n'));
    TestHelper.success('Ticket records verified');
  });

  test('TC-DBF-002: Service writes the same DBF layout and barcodes as the HTML tool', async ({ page }, testInfo) => {
    await TestHelper.initTest('TC-DBF-002', page);
    await page.goto('file:///' + path.resolve('utils/dbf_ticket_generator.html').replace(/\\/g, '/'));
    await page.locator('#startId').fill('2026112101001');
    await page.locator('#prefix').fill('0');
    await page.locator('#totalRecords').fill('100');
    await page.locator('#numCount').fill('4');
    await page.locator('#filename').fill('HTMLTOOL');
    await page.locator('#genBtn').click();
    await expect(page.locator('#md5Text')).toContainText('MD5');
    const download = page.waitForEvent('download');
    await page.locator('#downloadLink').click();
    const htmlFile = testInfo.outputPath('HTMLTOOL.DBF');
    await (await download).saveAs(htmlFile);
    const htmlBytes = fs.readFileSync(htmlFile);
    const htmlMd5 = (await page.locator('#md5Text').innerText()).replace('MD5: ', '').trim();

    const service = writeTicketDbf({ startId: '2026112101001', totalRecords: 100, prefix: '0', numbersPerRecord: 4 }, testInfo.outputPath(), 'SERVICE');
    const serviceBytes = fs.readFileSync(service.filePath);
    const headerSize = htmlBytes.readUInt16LE(8);
    expect(serviceBytes.length, 'Same file size').toBe(htmlBytes.length);
    expect(serviceBytes.subarray(0, headerSize).equals(htmlBytes.subarray(0, headerSize)), 'Identical header and field descriptors').toBe(true);
    expect(readTicketDbf(service.filePath).records.map((r) => r.BARCODE)).toEqual(readTicketDbf(htmlFile).records.map((r) => r.BARCODE));
    expect(htmlMd5, "The HTML tool's MD5 is the file's real MD5").toBe(md5Of(htmlBytes));
    TestHelper.success('Service output matches the HTML tool');
  });

  test('TC-DBF-003: Same seed gives the same file and MD5', async ({ page }, testInfo) => {
    await TestHelper.initTest('TC-DBF-003', page);
    const options = { startId: 9000000000001n, totalRecords: 50, seed: 'bigwin', date: new Date(2026, 10, 21) };
    const a = writeTicketDbf(options, testInfo.outputPath('a'), 'SEEDED');
    const b = writeTicketDbf(options, testInfo.outputPath('b'), 'SEEDED');
    expect(fs.readFileSync(a.filePath).equals(fs.readFileSync(b.filePath))).toBe(true);
    expect(a.md5).toBe(b.md5);
    expect(a.md5).toBe(md5Of(fs.readFileSync(a.filePath)));
    expect(a.md5).toMatch(/^[0-9a-f]{32}$/);
    TestHelper.success(`Seeded MD5 ${a.md5}`);
  });

  test('TC-DBF-004: A barcode longer than the 14-character field is refused', async ({ page }) => {
    await TestHelper.initTest('TC-DBF-004', page);
    expect(() => generateTicketRecords({ startId: '20261121010010', totalRecords: 1, prefix: '0' })).toThrow(/longer than the 14-character/);
    TestHelper.success('Over-long barcode refused');
  });
});
