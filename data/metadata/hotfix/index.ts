/**
 * Hotfix metadata (Allure, keyed by test id). tests/hotfix/hotfix.spec.ts calls registerHotfixMetadata() once.
 * One metadata file per hotfix - add new ones here.
 */
import { TestMetadataManager, TestMetadataCollection } from '../../../utils/metadata-manager';
import { HotfixMegaPrizeMetadata } from './mega-prize.metadata';

export const HotfixMetadata: TestMetadataCollection = {
  ...HotfixMegaPrizeMetadata,
};

export function registerHotfixMetadata(): void {
  TestMetadataManager.registerTests(HotfixMetadata);
}

export { HotfixMegaPrizeMetadata };
