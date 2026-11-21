import { test as base } from '@playwright/test';
import {
  lotteryTypeDataFactory,
  LotteryTypeData,
  LotteryTypeStatus,
} from '../data/factories/lottery-type-data.factory';

/**
 * Lottery Type test data fixture.
 * Specs combine it with the auth fixture: `mergeTests(test, dataTest)` -> `combinedTest`.
 */
type LotteryTypeDataFixtures = {
  lotteryTypeDataFactory: typeof lotteryTypeDataFactory;
  testLotteryTypeData: {
    valid: LotteryTypeData;
    /** A fresh unique record (new code + type) every call. */
    unique: (status?: LotteryTypeStatus) => LotteryTypeData;
    withCode: (code: string, status?: LotteryTypeStatus) => LotteryTypeData;
    withName: (name: string, status?: LotteryTypeStatus) => LotteryTypeData;
    newCode: () => string;
    newName: () => string;
    invalid: {
      onlySpacesName: LotteryTypeData;
      exceedMaxLengthCode: LotteryTypeData;
      exceedMaxLengthName: LotteryTypeData;
    };
    security: {
      xss: LotteryTypeData;
      sqlInjection: LotteryTypeData;
    };
    edge: {
      specialCharacters: LotteryTypeData;
      maxLengthName: LotteryTypeData;
    };
    taggedSet: (count: number, statuses?: LotteryTypeStatus[]) => { tag: string; items: LotteryTypeData[] };
  };
};

export const test = base.extend<LotteryTypeDataFixtures>({
  lotteryTypeDataFactory: async ({}, use) => {
    await use(lotteryTypeDataFactory);
  },

  testLotteryTypeData: async ({ lotteryTypeDataFactory: factory }, use) => {
    await use({
      valid: factory.generateValidLotteryTypeData(),
      unique: (status: LotteryTypeStatus = 'ACTIVE') => factory.generateValidLotteryTypeData({ status }),
      withCode: (code: string, status: LotteryTypeStatus = 'ACTIVE') => factory.generateWithCode(code, status),
      withName: (name: string, status: LotteryTypeStatus = 'ACTIVE') => factory.generateWithName(name, status),
      newCode: () => factory.generateCode(),
      newName: () => factory.generateTypeName(),
      invalid: {
        onlySpacesName: factory.generateOnlySpacesNameData(),
        exceedMaxLengthCode: factory.generateExceedMaxLengthCodeData(),
        exceedMaxLengthName: factory.generateExceedMaxLengthNameData(),
      },
      security: {
        xss: factory.generateXssData(),
        sqlInjection: factory.generateSqlInjectionData(),
      },
      edge: {
        specialCharacters: factory.generateSpecialCharactersData(),
        maxLengthName: factory.generateMaxLengthNameData(),
      },
      taggedSet: (count: number, statuses?: LotteryTypeStatus[]) => factory.generateTaggedSet(count, statuses),
    });
  },
});

export { expect } from '@playwright/test';
