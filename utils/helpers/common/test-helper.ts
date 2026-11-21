// utils/test-helper.ts
import { test, expect, Page } from '@playwright/test';
import { AllureHelpers } from '../../allure-helpers';
import { TestMetadataManager, TestMetadata } from '../../metadata-manager';
import { Logger } from '../../logger';

const logger = new Logger();

export interface TestContext {
  testId: string;
  metadata: TestMetadata;
  page?: Page;
  startTime: number;
}

export class TestHelper {
  private static context: TestContext | null = null;

  /**
   * Initialize test with metadata
   */
  static async initTest(testId: string, page?: Page): Promise<TestContext> {
    const metadata = TestMetadataManager.getMetadata(testId);
    if (!metadata) {
      throw new Error(`No metadata found for test: ${testId}`);
    }

    this.context = {
      testId,
      metadata,
      page,
      startTime: Date.now()
    };

    // Apply metadata to Allure (async in allure-playwright v3 - must be awaited)
    await TestMetadataManager.applyMetadata(testId);

    // Log test start
    logger.info(`🧪 Starting test: ${testId} - ${metadata.description}`);

    return this.context;
  }

  /**
   * Get current test context
   */
  static getContext(): TestContext {
    if (!this.context) {
      throw new Error('Test not initialized. Call initTest() first.');
    }
    return this.context;
  }

  /**
   * Complete test with success
   */
  static success(message?: string): void {
    const context = this.getContext();
    const duration = Date.now() - context.startTime;
    logger.success(`✅ ${context.testId} passed${message ? ` - ${message}` : ''} (${duration}ms)`);
    this.context = null;
  }

  /**
   * Complete test with failure
   */
  static fail(error: Error | string): void {
    const context = this.getContext();
    const duration = Date.now() - context.startTime;
    const errorMessage = error instanceof Error ? error.message : error;
    logger.error(`❌ ${context.testId} failed: ${errorMessage} (${duration}ms)`);
    this.context = null;
    throw error instanceof Error ? error : new Error(errorMessage);
  }

  /**
   * Attach screenshot to test
   */
  static async attachScreenshot(page: Page, name: string): Promise<void> {
    await AllureHelpers.attachScreenshot(page, name);
  }

  /**
   * Attach text to test
   */
  static async attachText(name: string, content: string): Promise<void> {
    await AllureHelpers.attachText(name, content);
  }

  /**
   * Attach JSON to test
   */
  static async attachJson(name: string, data: unknown): Promise<void> {
    await AllureHelpers.attachJson(name, data);
  }

  /**
   * Log step with screenshot
   */
  static async step(page: Page, stepName: string, logInfo?: string): Promise<void> {
    if (logInfo) {
      logger.info(`📝 ${stepName}: ${logInfo}`);
    } else {
      logger.info(`📝 ${stepName}`);
    }
    await AllureHelpers.attachScreenshot(page, stepName);
  }

  /**
   * Verify assertion with logging
   */
  static verify(condition: boolean, message: string): void {
    if (!condition) {
      this.fail(`Assertion failed: ${message}`);
    }
    logger.info(`✅ Verified: ${message}`);
  }

  /**
   * Verify expected value
   */
  static verifyEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
      this.fail(`${message} - Expected: ${expected}, Actual: ${actual}`);
    }
    logger.info(`✅ Verified: ${message}`);
  }

  /**
   * Verify element is visible
   */
  static async verifyVisible(element: any, message: string): Promise<void> {
    try {
      await expect(element).toBeVisible();
      logger.info(`✅ Verified: ${message}`);
    } catch (error) {
      this.fail(`${message} - Element not visible`);
    }
  }

  /**
   * Verify element is not visible
   */
  static async verifyNotVisible(element: any, message: string): Promise<void> {
    try {
      await expect(element).not.toBeVisible();
      logger.info(`✅ Verified: ${message}`);
    } catch (error) {
      this.fail(`${message} - Element is visible`);
    }
  }

  /**
   * Verify element contains text
   */
  static async verifyTextContains(element: any, text: string, message: string): Promise<void> {
    try {
      await expect(element).toContainText(text);
      logger.info(`✅ Verified: ${message}`);
    } catch (error) {
      this.fail(`${message} - Element does not contain text: "${text}"`);
    }
  }

  /**
   * Wait for element and verify
   */
  static async waitAndVerify(element: any, message: string, timeout: number = 5000): Promise<void> {
    try {
      await expect(element).toBeVisible({ timeout });
      logger.info(`✅ Verified: ${message}`);
    } catch (error) {
      this.fail(`${message} - Element not visible after ${timeout}ms`);
    }
  }

  /**
   * Create test case with automatic metadata application
   */
  static createTestCase(testId: string, page?: Page): (fn: () => Promise<void>) => void {
    return (fn: () => Promise<void>) => {
      test(testId, async ({ authenticatedPage }: any) => {
        const page = authenticatedPage?.page;
        const context = this.initTest(testId, page);
        try {
          await fn();
          this.success();
        } catch (error) {
          this.fail(error as Error);
        }
      });
    };
  }

  /**
   * Create test case with parameters
   */
  static createParameterizedTestCase(
    testId: string, 
    params: any[], 
    page?: Page
  ): (fn: (param: any) => Promise<void>) => void {
    return (fn: (param: any) => Promise<void>) => {
      params.forEach((param, index) => {
        test(`${testId} - ${index + 1}`, async ({ authenticatedPage }: any) => {
          const page = authenticatedPage?.page;
          const context = this.initTest(`${testId}_${index}`, page);
          try {
            await fn(param);
            this.success();
          } catch (error) {
            this.fail(error as Error);
          }
        });
      });
    };
  }
}

/**
 * Decorator for test methods with metadata
 */
export function TestCase(testId: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const page = args[0]?.authenticatedPage?.page;
      const context = TestHelper.initTest(testId, page);
      
      try {
        const result = await originalMethod.apply(this, args);
        TestHelper.success();
        return result;
      } catch (error) {
        TestHelper.fail(error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}