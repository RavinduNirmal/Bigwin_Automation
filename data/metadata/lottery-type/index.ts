/**
 * Lottery Type metadata (Allure, keyed by test id). Specs of this module call
 * registerLotteryTypeMetadata() once; each test then calls TestHelper.initTest('<TC-ID>', page).
 */
import { TestMetadataManager, TestMetadataCollection } from '../../../utils/metadata-manager';
import { LotteryTypeApprovalMetadata } from './approval.metadata';
import { LotteryTypeCreateMetadata } from './create.metadata';
import { LotteryTypeDeleteMetadata } from './delete.metadata';
import { LotteryTypeEditMetadata } from './edit.metadata';
import { LotteryTypeNavigationMetadata } from './nav.metadata';
import { LotteryTypeSearchMetadata } from './search.metadata';
import { LotteryTypeTableMetadata } from './table.metadata';

export const LotteryTypeMetadata: TestMetadataCollection = {
  ...LotteryTypeApprovalMetadata,
  ...LotteryTypeCreateMetadata,
  ...LotteryTypeDeleteMetadata,
  ...LotteryTypeEditMetadata,
  ...LotteryTypeNavigationMetadata,
  ...LotteryTypeSearchMetadata,
  ...LotteryTypeTableMetadata,
};

export function registerLotteryTypeMetadata(): void {
  TestMetadataManager.registerTests(LotteryTypeMetadata);
  console.log(`✅ Registered ${Object.keys(LotteryTypeMetadata).length} Lottery Type metadata entries`);
}

export { LotteryTypeApprovalMetadata, LotteryTypeCreateMetadata, LotteryTypeDeleteMetadata, LotteryTypeEditMetadata, LotteryTypeNavigationMetadata, LotteryTypeSearchMetadata, LotteryTypeTableMetadata };
