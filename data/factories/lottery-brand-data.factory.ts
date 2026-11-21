/**
 * Test data for BigWin Lottery Brands.
 *
 * Rules (verified live): Code and Name are required, max 255 characters, and BOTH must be unique
 * (duplicate Code is detected case-insensitively). Price per ticket is a number (negative rejected).
 * Every generated code starts with "AT" so cleanup (which only touches "AT..." codes) can find it.
 * Brands are created against an existing APPROVED lottery type ("Passive") that tests never edit.
 *
 * NOTE: brand delete is a SOFT delete - deleted test brands stay in the "Deleted" tab.
 */
export const DEFAULT_LOTTERY_TYPE = 'Passive';
export const BRAND_MAX_LENGTH = 255;

/** Approval stages, as shown in the Stage column / field. */
export const BRAND_STAGE_UNDER_REVIEW = 'Under Review';
export const BRAND_STAGE_PENDING_APPROVAL = 'Pending Approval';
export const BRAND_STAGE_APPROVED = 'Approved';

export type BrandStatus = 'ACTIVE' | 'DISABLED';
/** How each status is shown in the list's Status column (the app's own wording). */
export const BRAND_STATUS_LABEL: Record<BrandStatus, string> = { ACTIVE: 'Active', DISABLED: 'Disable' };

export interface LotteryBrandData {
  /** "Select Lottery Type" option (a lottery type NAME) */
  lotteryType: string;
  code: string;
  name: string;
  /** "Price per ticket" as typed */
  price: string;
  descriptionSinhala?: string;
  descriptionEnglish?: string;
  descriptionTamil?: string;
}

export class LotteryBrandDataFactory {
  private static instance: LotteryBrandDataFactory;
  private counter = 0;

  private constructor() {}

  static getInstance(): LotteryBrandDataFactory {
    if (!LotteryBrandDataFactory.instance) LotteryBrandDataFactory.instance = new LotteryBrandDataFactory();
    return LotteryBrandDataFactory.instance;
  }

  getUniqueSuffix(): string {
    const time = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${time}${random}${this.counter++}`;
  }

  generateCode(prefix = 'ATB'): string {
    return `${prefix}${this.getUniqueSuffix()}`;
  }

  generateName(prefix = 'AT Brand'): string {
    return `${prefix} ${this.getUniqueSuffix()}`;
  }

  generateValid(overrides: Partial<LotteryBrandData> = {}): LotteryBrandData {
    return {
      lotteryType: DEFAULT_LOTTERY_TYPE,
      code: this.generateCode(),
      name: this.generateName(),
      price: '25',
      ...overrides,
    };
  }

  /** Name of exactly `length` characters, starting with a unique "AT Brand <suffix> " prefix. */
  generateNameOfLength(length: number): string {
    const prefix = `${this.generateName()} `;
    return (prefix + 'N'.repeat(Math.max(0, length - prefix.length))).slice(0, length);
  }
}

export const lotteryBrandDataFactory = LotteryBrandDataFactory.getInstance();
