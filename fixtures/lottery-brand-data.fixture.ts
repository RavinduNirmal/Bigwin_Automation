import { test as base } from '@playwright/test';
import {
  lotteryBrandDataFactory,
  LotteryBrandData,
  BRAND_MAX_LENGTH,
} from '../data/factories/lottery-brand-data.factory';

/**
 * Lottery Brand test data fixture. Specs combine it with the auth fixture:
 *   const combinedTest = mergeTests(test, brandDataTest);
 */
type LotteryBrandDataFixtures = {
  testLotteryBrandData: {
    /** A fresh unique brand (new Code and Name, type "Passive", price 25) every call. */
    unique: (overrides?: Partial<LotteryBrandData>) => LotteryBrandData;
    newCode: () => string;
    newName: () => string;
    /** Name of exactly n characters (unique). */
    nameOfLength: (n: number) => string;
    maxLength: number;
    security: {
      htmlName: () => string;
    };
    unicode: {
      sinhala: string;
      tamil: string;
    };
  };
};

export const test = base.extend<LotteryBrandDataFixtures>({
  testLotteryBrandData: async ({}, use) => {
    const f = lotteryBrandDataFactory;
    await use({
      unique: (overrides = {}) => f.generateValid(overrides),
      newCode: () => f.generateCode(),
      newName: () => f.generateName(),
      nameOfLength: (n: number) => f.generateNameOfLength(n),
      maxLength: BRAND_MAX_LENGTH,
      security: {
        htmlName: () => `AT Brand <b>x</b><img src=x onerror=alert(1)> & "q" ${f.getUniqueSuffix()}`,
      },
      unicode: {
        sinhala: 'සිංහල ජයග්‍රහණ',
        tamil: 'தமிழ் வெற்றி',
      },
    });
  },
});

export { expect } from '@playwright/test';
