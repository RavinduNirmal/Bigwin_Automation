import { FullConfig } from '@playwright/test';

/**
 * Global Teardown
 * Runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running Global Teardown...');
  // Cleanup resources if needed
  console.log('✅ Global Teardown Complete');
}

export default globalTeardown;