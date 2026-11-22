/**
 * Lottery Draws (+ ticket DBF service) metadata (Allure, keyed by test id). Specs of this module call
 * registerLotteryDrawMetadata() once; each test then calls TestHelper.initTest('<TC-ID>', page).
 */
import { TestMetadataManager, TestMetadataCollection } from '../../../utils/metadata-manager';
import { LotteryDrawNavMetadata } from './nav.metadata';
import { LotteryDrawCreateMetadata } from './create.metadata';
import { LotteryDrawApprovalMetadata } from './approval.metadata';
import { LotteryDrawLifecycleMetadata } from './lifecycle.metadata';
import { LotteryDrawSearchMetadata } from './search.metadata';
import { LotteryDrawTableMetadata } from './table.metadata';
import { LotteryDrawViewMetadata } from './view.metadata';
import { LotteryDrawActionsMetadata } from './actions.metadata';
import { LotteryDrawValidationMetadata } from './validation.metadata';
import { LotteryDrawSecurityMetadata } from './security.metadata';
import { TicketDbfMetadata } from './ticket-dbf.metadata';

export const LotteryDrawMetadata: TestMetadataCollection = {
  ...LotteryDrawNavMetadata,
  ...LotteryDrawCreateMetadata,
  ...LotteryDrawApprovalMetadata,
  ...LotteryDrawLifecycleMetadata,
  ...LotteryDrawSearchMetadata,
  ...LotteryDrawTableMetadata,
  ...LotteryDrawViewMetadata,
  ...LotteryDrawActionsMetadata,
  ...LotteryDrawValidationMetadata,
  ...LotteryDrawSecurityMetadata,
  ...TicketDbfMetadata,
};

export function registerLotteryDrawMetadata(): void {
  TestMetadataManager.registerTests(LotteryDrawMetadata);
  console.log(`✅ Registered ${Object.keys(LotteryDrawMetadata).length} Lottery Draws (+ ticket DBF service) metadata entries`);
}

export { LotteryDrawNavMetadata, LotteryDrawCreateMetadata, LotteryDrawApprovalMetadata, LotteryDrawLifecycleMetadata, LotteryDrawSearchMetadata, LotteryDrawTableMetadata, LotteryDrawViewMetadata, LotteryDrawActionsMetadata, LotteryDrawValidationMetadata, LotteryDrawSecurityMetadata, TicketDbfMetadata };
export * from './base';
