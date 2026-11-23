/**
 * Central registry of ALL Allure metadata, keyed by test id (TC-...). Metadata lives in one folder
 * per module (login/, lottery-type/, lottery-brand/, lottery-draw/, hotfix/), each with its own index.ts and
 * register<Module>Metadata(). Specs register their own module; registerAllMetadata() loads everything
 * (used by tools / agents). New metadata file -> add it to its module's index.ts.
 */
import { TestMetadataManager } from '../../utils/metadata-manager';
import { LoginMetadata } from './login';
import { LotteryTypeMetadata } from './lottery-type';
import { LotteryBrandMetadata } from './lottery-brand';
import { LotteryDrawMetadata } from './lottery-draw';
import { HotfixMetadata } from './hotfix';

export * from './login';
export * from './lottery-type';
export * from './lottery-brand';
export * from './lottery-draw';
export * from './hotfix';

export const AllTestMetadata = {
  ...LoginMetadata,
  ...LotteryTypeMetadata,
  ...LotteryBrandMetadata,
  ...LotteryDrawMetadata,
  ...HotfixMetadata,
};

export function registerAllMetadata(): void {
  TestMetadataManager.registerTests(AllTestMetadata);
  console.log(`✅ Registered ${Object.keys(AllTestMetadata).length} test metadata entries`);
}


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
