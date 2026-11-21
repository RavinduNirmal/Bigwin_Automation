import { Page, Locator } from '@playwright/test';
import { Logger } from './logger';

/**
 * Custom Waits
 * 
 * Industry Best Practices:
 * - Custom wait conditions
 * - Polling mechanisms
 * - Timeout management
 */
export class CustomWaits {
  private readonly page: Page;
  private readonly logger: Logger;

  constructor(page: Page) {
    this.page = page;
    this.logger = new Logger();
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(
    locator: Locator,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        if (await locator.isVisible()) {
          return true;
        }
      } catch {
        // Element not found, continue
      }
      await this.page.waitForTimeout(interval);
    }
    this.logger.warn(`⏳ Element not visible after ${timeout}ms`);
    return false;
  }

  /**
   * Wait for element to be clickable
   */
  async waitForClickable(
    locator: Locator,
    timeout: number = 10000
  ): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
    await this.page.waitForTimeout(200); // Small buffer for UI stability
  }

  /**
   * Wait for element to disappear
   */
  async waitForDisappear(
    locator: Locator,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        if (!(await locator.isVisible())) {
          return true;
        }
      } catch {
        return true; // Element not found
      }
      await this.page.waitForTimeout(interval);
    }
    this.logger.warn(`⏳ Element still visible after ${timeout}ms`);
    return false;
  }

  /**
   * Wait for text to appear
   */
  async waitForText(
    text: string | RegExp,
    timeout: number = 10000
  ): Promise<boolean> {
    try {
      await this.page.waitForFunction(
        (searchText: string | RegExp) => {
          const bodyText = document.body.textContent || '';
          if (typeof searchText === 'string') {
            return bodyText.includes(searchText);
          }
          return searchText.test(bodyText);
        },
        text,
        { timeout }
      );
      return true;
    } catch {
      this.logger.warn(`⏳ Text not found after ${timeout}ms`);
      return false;
    }
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(
    urlPattern: string | RegExp,
    timeout: number = 10000
  ): Promise<void> {
    await this.page.waitForResponse(
      (response) => {
        if (typeof urlPattern === 'string') {
          return response.url().includes(urlPattern);
        }
        return urlPattern.test(response.url());
      },
      { timeout }
    );
  }

  /**
   * Wait for table to have data
   */
  async waitForTableData(
    tableSelector: string = 'tbody tr',
    minRows: number = 1,
    timeout: number = 10000
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const rows = await this.page.locator(tableSelector).count();
        if (rows >= minRows) {
          return true;
        }
      } catch {
        // Continue
      }
      await this.page.waitForTimeout(500);
    }
    this.logger.warn(`⏳ Table not loaded after ${timeout}ms`);
    return false;
  }

  /**
   * Poll for condition
   */
  async pollForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        if (await condition()) {
          return true;
        }
      } catch {
        // Continue
      }
      await this.page.waitForTimeout(interval);
    }
    return false;
  }
}