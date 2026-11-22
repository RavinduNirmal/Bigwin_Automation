// utils/metadata-manager.ts
import { AllureHelpers } from './allure-helpers';

export interface TestMetadata {
  epic: string;
  feature: string;
  story: string;
  severity: 'critical' | 'normal' | 'minor' | 'trivial' | 'blocker';
  tags: string[];
  owner: string;
  issue?: string;
  tms?: string;
  description?: string;
  preconditions?: string;
  steps?: string[];
  expectedResult?: string;
  /** Exact test data used / how it is generated (e.g. "Draw number 9xxxxxxxxx, 100 tickets, MD5 of the DBF"). */
  testData?: string;
  /** Known ACTUAL behaviour when it differs from the expected result (a reported app defect). */
  actualResult?: string;
  /** State left behind / cleanup done after the test. */
  postconditions?: string;
}

export interface TestMetadataCollection {
  [testId: string]: TestMetadata;
}

export class TestMetadataManager {
  private static metadata: TestMetadataCollection = {};
  private static initialized: boolean = false;

  /**
   * Register a single test metadata
   */
  static registerTest(testId: string, metadata: TestMetadata): void {
    this.metadata[testId] = metadata;
  }

  /**
   * Register multiple test metadata entries
   */
  static registerTests(collection: TestMetadataCollection): void {
    Object.entries(collection).forEach(([testId, metadata]) => {
      this.metadata[testId] = metadata;
    });
    this.initialized = true;
  }

  /**
   * Get metadata for a specific test
   */
  static getMetadata(testId: string): TestMetadata | undefined {
    return this.metadata[testId];
  }

  /**
   * Apply metadata to Allure for the current test
   */
  static async applyMetadata(testId: string): Promise<void> {
    const metadata = this.getMetadata(testId);
    if (!metadata) {
      console.warn(`⚠️ No metadata found for test: ${testId}`);
      return;
    }

    await AllureHelpers.setTestMetadata({
      epic: metadata.epic,
      feature: metadata.feature,
      story: metadata.story,
      severity: metadata.severity,
      tags: metadata.tags,
      owner: metadata.owner,
      issue: metadata.issue,
      tms: metadata.tms,
    });

    // Attach description if provided
    if (metadata.description) {
      await AllureHelpers.attachDescription(metadata.description);
    }

    // Attach formatted test case info if provided
    if (metadata.preconditions && metadata.steps && metadata.expectedResult) {
      const formattedDescription = this.formatTestDescription(metadata);
      await AllureHelpers.attachDescription(formattedDescription);
    }
  }

  /**
   * Format test description for Allure
   */
  private static formatTestDescription(metadata: TestMetadata): string {
    let description = `Test Case: ${metadata.tms || metadata.issue || 'Unknown'}\n`;
    description += `Description: ${metadata.description || 'N/A'}\n\n`;
    description += `Preconditions:\n${metadata.preconditions || 'N/A'}\n\n`;
    description += `Steps:\n`;
    if (metadata.steps) {
      metadata.steps.forEach((step, index) => {
        description += `${index + 1}. ${step}\n`;
      });
    } else {
      description += 'N/A\n';
    }
    description += `\nExpected Result:\n${metadata.expectedResult || 'N/A'}`;
    if (metadata.testData) description = description.replace('\nSteps:\n', `\nTest Data:\n${metadata.testData}\n\nSteps:\n`);
    description += `\n\nActual Result:\n${metadata.actualResult
      ? `KNOWN DEFECT - ${metadata.actualResult}`
      : 'Recorded by this run - see the test status, steps and attachments'}`;
    if (metadata.postconditions) description += `\n\nPostconditions:\n${metadata.postconditions}`;
    return description;
  }

  /**
   * Get all registered metadata
   */
  static getAllMetadata(): TestMetadataCollection {
    return this.metadata;
  }

  /**
   * Get metadata by feature
   */
  static getMetadataByFeature(feature: string): TestMetadataCollection {
    const filtered: TestMetadataCollection = {};
    Object.entries(this.metadata).forEach(([testId, metadata]) => {
      if (metadata.feature === feature) {
        filtered[testId] = metadata;
      }
    });
    return filtered;
  }

  /**
   * Get metadata by tag
   */
  static getMetadataByTag(tag: string): TestMetadataCollection {
    const filtered: TestMetadataCollection = {};
    Object.entries(this.metadata).forEach(([testId, metadata]) => {
      if (metadata.tags.includes(tag)) {
        filtered[testId] = metadata;
      }
    });
    return filtered;
  }

  /**
   * Get all test IDs
   */
  static getTestIds(): string[] {
    return Object.keys(this.metadata);
  }

  /**
   * Check if metadata is registered for a test
   */
  static hasMetadata(testId: string): boolean {
    return !!this.metadata[testId];
  }

  /**
   * Get the count of registered tests
   */
  static getCount(): number {
    return Object.keys(this.metadata).length;
  }

  /**
   * Reset metadata (useful for testing)
   */
  static reset(): void {
    this.metadata = {};
    this.initialized = false;
  }

  /**
   * Validate that all tests have metadata
   */
  static validateTests(testIds: string[]): { missing: string[]; found: string[] } {
    const missing: string[] = [];
    const found: string[] = [];

    testIds.forEach(testId => {
      if (this.hasMetadata(testId)) {
        found.push(testId);
      } else {
        missing.push(testId);
      }
    });

    return { missing, found };
  }
}