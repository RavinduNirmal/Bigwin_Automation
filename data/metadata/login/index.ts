/**
 * Login metadata (Allure, keyed by test id). Specs of this module call
 * registerLoginMetadata() once; each test then calls TestHelper.initTest('<TC-ID>', page).
 */
import { TestMetadataManager } from '../../../utils/metadata-manager';
import { LoginMetadata } from './login.metadata';

export function registerLoginMetadata(): void {
  TestMetadataManager.registerTests(LoginMetadata);
  console.log(`✅ Registered ${Object.keys(LoginMetadata).length} Login metadata entries`);
}

export { LoginMetadata };
