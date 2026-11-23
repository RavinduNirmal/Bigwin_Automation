import { test as base } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { lotteryDrawDataFactory, LotteryDrawData } from '../data/factories/lottery-draw-data.factory';
import { writeTicketDbf, readTicketDbf, buildDbf, md5Of, TicketDbfFile } from '../utils/dbf/ticket-dbf.service';

/**
 * Lottery Draw test data. `testLotteryDrawData.unique()` gives a new uniquely numbered draw
 * (far-future schedule); `ticketFile(draw)` builds its ticket DBF (+ MD5) in the test's output folder
 * with the DBF service. Specs combine it with the auth fixture via mergeTests.
 *
 * Global checksum tests also need files derived from a draw's ticket file - all generated per test, so
 * every run has fresh checksums that no earlier (non-deleted) draw can hold:
 *  - copyOf(file)            byte-identical copy under another name  -> SAME checksum ("new DBF + existing checksum")
 *  - modifiedCopyOf(file)    same name and ticket barcodes, one ticket changed -> NEW checksum ("existing DBF + new checksum")
 *  - extraTicketFile(draw)   50 more tickets continuing the draw's sequence -> new DBF + new checksum (Add Tickets)
 */
type LotteryDrawDataFixtures = {
  testLotteryDrawData: {
    unique: (overrides?: Partial<LotteryDrawData>) => LotteryDrawData;
    /** Draw whose start / cutoff / draw times are the given minutes from now (lifecycle tests). */
    imminent: (startIn?: number, cutoffIn?: number, drawIn?: number) => LotteryDrawData;
    ticketFile: (draw: LotteryDrawData, options?: { seed?: string }) => TicketDbfFile;
    copyOf: (file: TicketDbfFile, suffix?: string) => TicketDbfFile;
    modifiedCopyOf: (file: TicketDbfFile) => TicketDbfFile;
    extraTicketFile: (draw: LotteryDrawData, count?: number, startAt?: number) => TicketDbfFile;
  };
};

function describeFile(filePath: string, bytes: Buffer): TicketDbfFile {
  const { records } = readTicketDbf(filePath);
  return {
    filePath,
    fileName: path.basename(filePath),
    md5: md5Of(bytes),
    size: bytes.length,
    recordCount: records.length,
    firstBarcode: records[0]?.BARCODE.trim() ?? '',
    lastBarcode: records[records.length - 1]?.BARCODE.trim() ?? '',
  };
}

export const test = base.extend<LotteryDrawDataFixtures>({
  testLotteryDrawData: async ({}, use, testInfo) => {
    const f = lotteryDrawDataFactory;
    const dir = (sub: string) => {
      const d = testInfo.outputPath(sub);
      fs.mkdirSync(d, { recursive: true });
      return d;
    };
    await use({
      unique: (overrides = {}) => f.generate(overrides),
      imminent: (startIn, cutoffIn, drawIn) => f.generate(f.imminentSchedule(startIn, cutoffIn, drawIn)),
      ticketFile: (draw, options = {}) =>
        writeTicketDbf(
          { startId: draw.ticketStartId, totalRecords: draw.ticketCount, prefix: '0', numbersPerRecord: 4, seed: options.seed },
          testInfo.outputPath('tickets'),
          draw.code
        ),
      copyOf: (file, suffix = 'COPY') => {
        const target = path.join(dir('tickets-copy'), file.fileName.replace(/(\.dbf)?$/i, `_${suffix}.dbf`));
        fs.copyFileSync(file.filePath, target);
        return describeFile(target, fs.readFileSync(target));
      },
      modifiedCopyOf: (file) => {
        const { records } = readTicketDbf(file.filePath);
        const changed = records.map((r, i) => (i === 0 ? { ...r, LETTERS: r.LETTERS.trim() === 'A' ? 'B' : 'A' } : r));
        const target = path.join(dir('tickets-modified'), file.fileName);
        const bytes = buildDbf(changed);
        fs.writeFileSync(target, bytes);
        return describeFile(target, bytes);
      },
      extraTicketFile: (draw, count = 50, startAt = draw.ticketCount + 1) =>
        writeTicketDbf(
          { startId: `${draw.drawNumber}${String(startAt).padStart(3, '0')}`, totalRecords: count, prefix: '0', numbersPerRecord: 4 },
          dir('tickets-extra'),
          `${draw.code}_ADD`
        ),
    });
  },
});

export { expect } from '@playwright/test';
