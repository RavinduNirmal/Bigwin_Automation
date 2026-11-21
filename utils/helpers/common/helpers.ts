// import { Page } from '@playwright/test';

// /**
//  * Helper Utilities
//  * 
//  * Industry Best Practices:
//  * - Reusable helper functions
//  * - Clean data generation
//  * - Utility functions for tests
//  */
// export class Helpers {
//   /**
//    * Generate unique email
//    */
//   static generateUniqueEmail(domain: string = 'example.com'): string {
//     const timestamp = Date.now();
//     const random = Math.floor(Math.random() * 1000);
//     return `test_${timestamp}_${random}@${domain}`;
//   }

//   /**
//    * Generate unique name
//    */
//   static generateUniqueName(prefix: string = 'Test'): string {
//     const timestamp = Date.now().toString().slice(-8);
//     return `${prefix}_${timestamp}`;
//   }

//   /**
//    * Generate unique contact number
//    */
//   static generateUniqueContact(prefix: string = '0777'): string {
//     const digits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
//     return `${prefix}${digits}`;
//   }

//   /**
//    * Wait for condition
//    */
//   static async waitForCondition(
//     condition: () => Promise<boolean>,
//     timeout: number = 10000,
//     interval: number = 500
//   ): Promise<boolean> {
//     const startTime = Date.now();
//     while (Date.now() - startTime < timeout) {
//       if (await condition()) {
//         return true;
//       }
//       await new Promise(resolve => setTimeout(resolve, interval));
//     }
//     return false;
//   }

//   /**
//    * Retry operation
//    */
//   static async retry<T>(
//     operation: () => Promise<T>,
//     retries: number = 3,
//     delay: number = 1000
//   ): Promise<T> {
//     let lastError: Error | undefined;
//     for (let attempt = 0; attempt < retries; attempt++) {
//       try {
//         return await operation();
//       } catch (error) {
//         lastError = error as Error;
//         if (attempt < retries - 1) {
//           await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
//         }
//       }
//     }
//     throw lastError || new Error('Operation failed after retries');
//   }

//   /**
//    * Generate random string
//    */
//   static generateRandomString(length: number = 10): string {
//     const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let result = '';
//     for (let i = 0; i < length; i++) {
//       result += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
//     return result;
//   }

//   /**
//    * Generate random number
//    */
//   static generateRandomNumber(min: number = 0, max: number = 100): number {
//     return Math.floor(Math.random() * (max - min + 1)) + min;
//   }

//   /**
//    * Sleep for duration
//    */
//   static sleep(ms: number): Promise<void> {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   /**
//    * Format date
//    */
//   static formatDate(date: Date = new Date(), format: string = 'YYYY-MM-DD'): string {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const day = String(date.getDate()).padStart(2, '0');
//     const hours = String(date.getHours()).padStart(2, '0');
//     const minutes = String(date.getMinutes()).padStart(2, '0');
//     const seconds = String(date.getSeconds()).padStart(2, '0');

//     return format
//       .replace('YYYY', String(year))
//       .replace('MM', month)
//       .replace('DD', day)
//       .replace('HH', hours)
//       .replace('mm', minutes)
//       .replace('ss', seconds);
//   }
// }


import { Page } from '@playwright/test';

/**
 * Helper Utilities
 * 
 * Industry Best Practices:
 * - Reusable helper functions
 * - Clean data generation
 * - Utility functions for tests
 */
export class Helpers {
  /**
   * Generate unique email
   */
  static generateUniqueEmail(domain: string = 'example.com'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `test_${timestamp}_${random}@${domain}`;
  }

  /**
   * Generate unique name
   */
  static generateUniqueName(prefix: string = 'Test'): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Generate unique contact number
   */
  static generateUniqueContact(prefix: string = '0777'): string {
    const digits = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join('');
    return `${prefix}${digits}`;
  }

  /**
   * Wait for condition
   */
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }

  /**
   * Retry operation
   */
  static async retry<T>(
    operation: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
        }
      }
    }
    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random number
   */
  static generateRandomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Sleep for duration
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format date
   */
  static formatDate(date: Date = new Date(), format: string = 'YYYY-MM-DD'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }
}