import { test as base } from '@playwright/test';
import { lotteryDrawDataFactory, LotteryDrawData } from '../data/factories/lottery-draw-data.factory';
import { writeTicketDbf, TicketDbfFile } from '../utils/dbf/ticket-dbf.service';

/**
 * Lottery Draw test data. `testLotteryDrawData.unique()` gives a new uniquely numbered draw
 * (far-future schedule); `ticketFile(draw)` builds its ticket DBF (+ MD5) in the test's output folder
 * with the DBF service. Specs combine it with the auth fixture via mergeTests.
 */
type LotteryDrawDataFixtures = {
  testLotteryDrawData: {
    unique: (overrides?: Partial<LotteryDrawData>) => LotteryDrawData;
    /** Draw whose start / cutoff / draw times are the given minutes from now (lifecycle tests). */
    imminent: (startIn?: number, cutoffIn?: number, drawIn?: number) => LotteryDrawData;
    ticketFile: (draw: LotteryDrawData, options?: { seed?: string }) => TicketDbfFile;
  };
};

export const test = base.extend<LotteryDrawDataFixtures>({
  testLotteryDrawData: async ({}, use, testInfo) => {
    const f = lotteryDrawDataFactory;
    await use({
      unique: (overrides = {}) => f.generate(overrides),
      imminent: (startIn, cutoffIn, drawIn) => f.generate(f.imminentSchedule(startIn, cutoffIn, drawIn)),
      ticketFile: (draw, options = {}) =>
        writeTicketDbf(
          { startId: draw.ticketStartId, totalRecords: draw.ticketCount, prefix: '0', numbersPerRecord: 4, seed: options.seed },
          testInfo.outputPath('tickets'),
          draw.code
        ),
    });
  },
});

export { expect } from '@playwright/test';
