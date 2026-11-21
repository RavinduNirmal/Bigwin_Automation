/**
 * Test data for BigWin Lottery Types.
 *
 * Form rules (from the app): Code and Type are required, max 255 characters each; Status is
 * required (ACTIVE | DISABLED). Codes must be unique - a duplicate code is rejected by the server.
 * Generated codes start with "AT" (Automation Test) plus a unique numeric suffix so the
 * tests' own records are easy to recognise (and clean up) in the shared dev database.
 */
export type LotteryTypeStatus = 'ACTIVE' | 'DISABLED';

/** How each status value is shown in the table's Status column (the app's own wording: "Disable"). */
export const STATUS_LABEL: Record<LotteryTypeStatus, string> = {
  ACTIVE: 'Active',
  DISABLED: 'Disable',
};

/**
 * Approval stages (maker-checker). Create / Edit -> "Under Review" -> Review -> "Pending Approval"
 * -> Approve -> "Approved". Editing an Approved lottery type sends it back to "Under Review".
 */
export const STAGE_UNDER_REVIEW = 'Under Review';
export const STAGE_PENDING_APPROVAL = 'Pending Approval';
export const STAGE_APPROVED = 'Approved';

export const MAX_FIELD_LENGTH = 255;

export interface LotteryTypeData {
  /** "Code" field */
  code: string;
  /** "Type" field (shown as "Type Description" in the table) */
  name: string;
  status: LotteryTypeStatus;
}

export class LotteryTypeDataFactory {
  private static instance: LotteryTypeDataFactory;
  private counter: number = 0;

  private constructor() {}

  public static getInstance(): LotteryTypeDataFactory {
    if (!LotteryTypeDataFactory.instance) {
      LotteryTypeDataFactory.instance = new LotteryTypeDataFactory();
    }
    return LotteryTypeDataFactory.instance;
  }

  /** Last 8 digits of the time + a 3-digit random part + a per-worker counter. */
  public getUniqueSuffix(): string {
    const time = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${time}${random}${this.counter++}`;
  }

  public generateCode(prefix: string = 'AT'): string {
    return `${prefix}${this.getUniqueSuffix()}`;
  }

  public generateTypeName(prefix: string = 'Auto Type'): string {
    return `${prefix} ${this.getUniqueSuffix()}`;
  }

  public generateValidLotteryTypeData(options?: { codePrefix?: string; namePrefix?: string; status?: LotteryTypeStatus }): LotteryTypeData {
    return {
      code: this.generateCode(options?.codePrefix),
      name: this.generateTypeName(options?.namePrefix),
      status: options?.status ?? 'ACTIVE',
    };
  }

  public generateWithCode(code: string, status: LotteryTypeStatus = 'ACTIVE'): LotteryTypeData {
    return { code, name: this.generateTypeName(), status };
  }

  public generateWithName(name: string, status: LotteryTypeStatus = 'ACTIVE'): LotteryTypeData {
    return { code: this.generateCode(), name, status };
  }

  public generateWithStatus(status: LotteryTypeStatus): LotteryTypeData {
    return this.generateValidLotteryTypeData({ status });
  }

  public generateOnlySpacesNameData(): LotteryTypeData {
    return { code: this.generateCode('ATWS'), name: '     ', status: 'ACTIVE' };
  }

  public generateExceedMaxLengthCodeData(): LotteryTypeData {
    const code = this.generateCode('ATLONG');
    return { code: code + 'X'.repeat(MAX_FIELD_LENGTH + 1 - code.length), name: this.generateTypeName(), status: 'ACTIVE' };
  }

  public generateExceedMaxLengthNameData(): LotteryTypeData {
    return { code: this.generateCode('ATLONGN'), name: 'N'.repeat(MAX_FIELD_LENGTH + 1), status: 'ACTIVE' };
  }

  public generateMaxLengthNameData(): LotteryTypeData {
    const prefix = `Max ${this.getUniqueSuffix()} `;
    return { code: this.generateCode('ATMAX'), name: prefix + 'M'.repeat(MAX_FIELD_LENGTH - prefix.length), status: 'ACTIVE' };
  }

  public generateXssData(): LotteryTypeData {
    return { code: this.generateCode('ATXSS'), name: `<b>Bold</b><img src=x onerror=alert(1)> ${this.getUniqueSuffix()}`, status: 'ACTIVE' };
  }

  public generateSqlInjectionData(): LotteryTypeData {
    return { code: this.generateCode('ATSQL'), name: `'; DROP TABLE lottery_types; -- ${this.getUniqueSuffix()}`, status: 'ACTIVE' };
  }

  public generateSpecialCharactersData(): LotteryTypeData {
    return { code: this.generateCode('ATSPC'), name: `Type & Co. #$% (Sinhala: ලොතරැයි) ${this.getUniqueSuffix()}`, status: 'ACTIVE' };
  }

  /** Several records that share one tag in their Type, so a test can find "its" set together. */
  public generateTaggedSet(count: number, statuses: LotteryTypeStatus[] = ['ACTIVE']): { tag: string; items: LotteryTypeData[] } {
    const tag = `Tag${this.getUniqueSuffix()}`;
    const items: LotteryTypeData[] = [];
    for (let i = 0; i < count; i++) {
      items.push({ code: this.generateCode(), name: `${tag} Item ${i + 1}`, status: statuses[i % statuses.length] });
    }
    return { tag, items };
  }
}

export const lotteryTypeDataFactory = LotteryTypeDataFactory.getInstance();
