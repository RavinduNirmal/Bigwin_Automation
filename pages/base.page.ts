import { Page, Locator, expect } from '@playwright/test';
import { Logger } from '../utils/logger';
import { CustomWaits } from '../utils/custom-waits';

/**
 * Base Page Object
 * Contains common page operations and utilities
 * 
 * Industry Best Practices:
 * - Single Responsibility Principle
 * - Encapsulation of page-specific logic
 * - Reusable helper methods
 * - Centralized logging
 */
export abstract class BasePage {
  readonly page: Page;
  protected readonly logger: Logger;
  protected readonly waits: CustomWaits;

  constructor(page: Page) {
    this.page = page;
    this.logger = new Logger();
    this.waits = new CustomWaits(page);
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    this.logger.info(`Navigating to: ${url}`);
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for page to fully load
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take a screenshot for Allure
   */
  async takeScreenshot(name: string): Promise<void> {
    const screenshot = await this.page.screenshot({ fullPage: true });
    // Allure attachment will be handled by fixtures
    this.logger.info(`📸 Screenshot captured: ${name}`);
  }

  /**
   * Get page title
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Verify page URL matches expected pattern
   */
  async verifyUrlPattern(pattern: RegExp): Promise<void> {
    await expect(this.page, `Page URL should match ${pattern}`).toHaveURL(pattern);
  }

  /**
   * Wait for element to be visible and ready
   */
  async waitForElement(locator: Locator, timeout: number = 10000): Promise<void> {
    await this.waits.waitForVisible(locator, timeout);
  }

  /**
   * Safe click with retry
   */
  async safeClick(locator: Locator): Promise<void> {
    await this.waits.waitForClickable(locator);
    await locator.click();
  }

  /**
   * Safe fill with clear
   */
  async safeFill(locator: Locator, value: string): Promise<void> {
    await this.waits.waitForVisible(locator);
    await locator.clear();
    await locator.fill(value);
  }
}