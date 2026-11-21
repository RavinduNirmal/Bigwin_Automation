// import { allure } from 'allure-playwright';

// /**
//  * Allure Helpers
//  * 
//  * Industry Best Practices:
//  * - Centralized Allure reporting
//  * - Consistent test metadata
//  * - Screenshot attachments
//  */
// export class AllureHelpers {
//   /**
//    * Set test metadata
//    */
//   static setTestMetadata(params: {
//     epic?: string;
//     feature?: string;
//     story?: string;
//     severity?: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
//     tags?: string[];
//     owner?: string;
//     issue?: string;
//     tms?: string;
//   }): void {
//     if (params.epic) allure.epic(params.epic);
//     if (params.feature) allure.feature(params.feature);
//     if (params.story) allure.story(params.story);
//     if (params.severity) allure.severity(params.severity);
//     if (params.tags) params.tags.forEach(tag => allure.tag(tag));
//     if (params.owner) allure.owner(params.owner);
//     if (params.issue) allure.issue(params.issue, params.issue);
//     if (params.tms) allure.tms(params.tms, params.tms);
//   }

//   /**
//    * Attach description
//    */
//   static attachDescription(description: string): void {
//     allure.description(description);
//   }

//   /**
//    * Attach text
//    */
//   static attachText(name: string, content: string): void {
//     allure.attachment(name, content, 'text/plain');
//   }

//   /**
//    * Attach JSON
//    */
//   static attachJson(name: string, data: any): void {
//     allure.attachment(name, JSON.stringify(data, null, 2), 'application/json');
//   }

//   /**
//    * Attach HTML
//    */
//   static attachHtml(name: string, content: string): void {
//     allure.attachment(name, content, 'text/html');
//   }

//   /**
//    * Attach XML
//    */
//   static attachXml(name: string, content: string): void {
//     allure.attachment(name, content, 'application/xml');
//   }

//   /**
//    * Attach screenshot (from Page)
//    */
//   static async attachScreenshot(page: any, name: string = 'Screenshot'): Promise<void> {
//     const screenshot = await page.screenshot({ fullPage: true });
//     allure.attachment(name, screenshot, 'image/png');
//   }

//   /**
//    * Attach step result
//    */
//   static attachStepResult(stepName: string, result: string): void {
//     allure.attachment(`Step: ${stepName}`, result, 'text/plain');
//   }

//   /**
//    * Create test case link
//    */
//   static createTestCaseLink(testId: string, url: string): string {
//     return `[${testId}](${url})`;
//   }
// }


import { allure } from 'allure-playwright';
import type { Page } from '@playwright/test';

/**
 * Thin wrappers over the allure-playwright API.
 *
 * Every allure.* call is ASYNC in allure-playwright v3 and MUST be awaited - un-awaited calls
 * can be lost when the test finishes first (missing labels/attachments in the report).
 * ESLint's @typescript-eslint/no-floating-promises enforces this.
 */
export class AllureHelpers {
  static async setTestMetadata(params: {
    epic?: string;
    feature?: string;
    story?: string;
    severity?: 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';
    tags?: string[];
    owner?: string;
    issue?: string;
    tms?: string;
  }): Promise<void> {
    if (params.epic) await allure.epic(params.epic);
    if (params.feature) await allure.feature(params.feature);
    if (params.story) await allure.story(params.story);
    if (params.severity) await allure.severity(params.severity);
    for (const tag of params.tags ?? []) await allure.tag(tag);
    if (params.owner) await allure.owner(params.owner);
    if (params.issue) await allure.issue(params.issue, params.issue);
    if (params.tms) await allure.tms(params.tms, params.tms);
  }

  static async attachDescription(description: string): Promise<void> {
    await allure.description(description);
  }

  static async attachText(name: string, content: string): Promise<void> {
    await allure.attachment(name, content, 'text/plain');
  }

  static async attachJson(name: string, data: unknown): Promise<void> {
    await allure.attachment(name, JSON.stringify(data, null, 2), 'application/json');
  }

  static async attachHtml(name: string, content: string): Promise<void> {
    await allure.attachment(name, content, 'text/html');
  }

  static async attachXml(name: string, content: string): Promise<void> {
    await allure.attachment(name, content, 'application/xml');
  }

  static async attachScreenshot(page: Page, name: string = 'Screenshot'): Promise<void> {
    try {
      const screenshot = await page.screenshot({ fullPage: true });
      await allure.attachment(name, screenshot, 'image/png');
    } catch (error) {
      console.warn(`Failed to capture screenshot: ${error}`);
    }
  }

  static async attachStepResult(stepName: string, result: string): Promise<void> {
    await allure.attachment(`Step: ${stepName}`, result, 'text/plain');
  }

  static createTestCaseLink(testId: string, url: string): string {
    return `[${testId}](${url})`;
  }
}
