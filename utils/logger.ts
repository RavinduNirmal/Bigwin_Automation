/**
 * Logger Utility
 * 
 * Industry Best Practices:
 * - Structured logging
 * - Log levels
 * - Timestamped logs
 * - Color coding for readability
 */

declare const process: { env: { DEBUG?: string } } | undefined;

export class Logger {
  private readonly isDebug: boolean;

  constructor() {
    this.isDebug = typeof process !== 'undefined' && process?.env?.DEBUG === 'true';
  }

  /**
   * Info level log
   */
  info(message: string): void {
    console.log(`ℹ️ [${this.getTimestamp()}] ${message}`);
  }

  /**
   * Error level log
   */
  error(message: string): void {
    console.error(`❌ [${this.getTimestamp()}] ${message}`);
  }

  /**
   * Warning level log
   */
  warn(message: string): void {
    console.warn(`⚠️ [${this.getTimestamp()}] ${message}`);
  }

  /**
   * Debug level log (only when DEBUG=true)
   */
  debug(message: string): void {
    if (this.isDebug) {
      console.debug(`🐛 [${this.getTimestamp()}] ${message}`);
    }
  }

  /**
   * Success level log
   */
  success(message: string): void {
    console.log(`✅ [${this.getTimestamp()}] ${message}`);
  }

  /**
   * Step level log
   */
  step(message: string): void {
    console.log(`📌 [${this.getTimestamp()}] ${message}`);
  }

  /**
   * Get current timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Group logs
   */
  group(label: string): void {
    console.group(`📂 [${this.getTimestamp()}] ${label}`);
  }

  /**
   * End group
   */
  groupEnd(): void {
    console.groupEnd();
  }
}

// Export singleton instance
export const logger = new Logger();