/**
 * Lottery Brand metadata (Allure, keyed by test id). Specs of this module call
 * registerLotteryBrandMetadata() once; each test then calls TestHelper.initTest('<TC-ID>', page).
 */
import { TestMetadataManager, TestMetadataCollection } from '../../../utils/metadata-manager';
import { LotteryBrandNavMetadata } from './nav.metadata';
import { LotteryBrandCreateMetadata } from './create.metadata';
import { LotteryBrandEditMetadata } from './edit.metadata';
import { LotteryBrandDeleteMetadata } from './delete.metadata';
import { LotteryBrandSearchMetadata } from './search.metadata';
import { LotteryBrandTableMetadata } from './table.metadata';
import { LotteryBrandApprovalMetadata } from './approval.metadata';
import { LotteryBrandUseMetadata } from './use.metadata';
import { LotteryBrandLogsMetadata } from './logs.metadata';
import { LotteryBrandA11yMetadata } from './a11y.metadata';

export const LotteryBrandMetadata: TestMetadataCollection = {
  ...LotteryBrandNavMetadata,
  ...LotteryBrandCreateMetadata,
  ...LotteryBrandEditMetadata,
  ...LotteryBrandDeleteMetadata,
  ...LotteryBrandSearchMetadata,
  ...LotteryBrandTableMetadata,
  ...LotteryBrandApprovalMetadata,
  ...LotteryBrandUseMetadata,
  ...LotteryBrandLogsMetadata,
  ...LotteryBrandA11yMetadata,
};

export function registerLotteryBrandMetadata(): void {
  TestMetadataManager.registerTests(LotteryBrandMetadata);
  console.log(`✅ Registered ${Object.keys(LotteryBrandMetadata).length} Lottery Brand metadata entries`);
}

export { LotteryBrandNavMetadata, LotteryBrandCreateMetadata, LotteryBrandEditMetadata, LotteryBrandDeleteMetadata, LotteryBrandSearchMetadata, LotteryBrandTableMetadata, LotteryBrandApprovalMetadata, LotteryBrandUseMetadata, LotteryBrandLogsMetadata, LotteryBrandA11yMetadata };
export * from './base';
