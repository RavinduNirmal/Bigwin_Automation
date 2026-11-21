/**
 * Central registry of Allure metadata, keyed by test id (TC-...).
 * Each spec calls registerAllMetadata(); each test calls TestHelper.initTest('<TC-ID>', page),
 * which looks the id up here. Add every new metadata file below.
 */
import { TestMetadataManager } from '../../utils/metadata-manager';
import { LoginMetadata } from './login.metadata';
import { LotteryTypeCreateMetadata } from './lottery-type-create.metadata';
import { LotteryTypeDeleteMetadata } from './lottery-type-delete.metadata';
import { LotteryTypeEditMetadata } from './lottery-type-edit.metadata';
import { LotteryTypeNavigationMetadata } from './lottery-type-nav.metadata';
import { LotteryTypeSearchMetadata } from './lottery-type-search.metadata';
import { LotteryTypeTableMetadata } from './lottery-type-table.metadata';

export const AllTestMetadata = {
  ...LoginMetadata,
  ...LotteryTypeCreateMetadata,
  ...LotteryTypeDeleteMetadata,
  ...LotteryTypeEditMetadata,
  ...LotteryTypeNavigationMetadata,
  ...LotteryTypeSearchMetadata,
  ...LotteryTypeTableMetadata,
};

export function registerAllMetadata(): void {
  TestMetadataManager.registerTests(AllTestMetadata);
  console.log(`✅ Registered ${Object.keys(AllTestMetadata).length} test metadata entries`);
}

export {
  LoginMetadata,
  LotteryTypeCreateMetadata,
  LotteryTypeDeleteMetadata,
  LotteryTypeEditMetadata,
  LotteryTypeNavigationMetadata,
  LotteryTypeSearchMetadata,
  LotteryTypeTableMetadata,
};

export function getMetadataCount(): number {
  return Object.keys(AllTestMetadata).length;
}

export function getMetadata(testId: string) {
  return TestMetadataManager.getMetadata(testId);
}

export function getTestIds(): string[] {
  return TestMetadataManager.getTestIds();
}

export function validateTests(testIds: string[]): { missing: string[]; found: string[] } {
  return TestMetadataManager.validateTests(testIds);
}

export function printMetadataSummary(): void {
  const metadata = TestMetadataManager.getAllMetadata();
  const features = new Map<string, number>();
  Object.values(metadata).forEach((m) => {
    features.set(m.feature, (features.get(m.feature) || 0) + 1);
  });
  console.log('\n📊 Metadata Summary:');
  console.log(`Total Tests: ${Object.keys(metadata).length}`);
  console.log('\nBy Feature:');
  features.forEach((count, feature) => {
    console.log(`  ${feature}: ${count} tests`);
  });
  console.log('');
}
