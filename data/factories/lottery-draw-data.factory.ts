/**
 * Test data for BigWin Lottery Draws.
 *
 * Draws can NOT be deleted, so automation draws are made easy to recognise and harmless:
 *  - draw number: 10 digits starting with 9 (unique per call), e.g. 9123456785
 *  - draw code:   "AT" + draw number, e.g. AT9123456785
 *  - tickets:     barcodes "0" + drawNumber + 001..NNN (14 characters, the BARCODE field size)
 *  - dates:       far in the future (unique minute) so even an approved test draw never goes In Play;
 *                 only lifecycle tests use imminent() times.
 * The same brand cannot have two draws at the same draw time - unique draw times avoid that.
 */
export const DEFAULT_DRAW_BRAND = 'Mahajana Sampatha';
export const DEFAULT_TICKETS = 100;

/** Stage names as shown in the list's Status column / draw tabs. */
export const DRAW_TAB = {
  ALL: 'All',
  UNDER_REVIEW: 'Under Review',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  IN_PLAY: 'In Play',
  IN_PLAY_POST_CUTOFF: 'In Play Post Cutoff',
  COMPLETED: 'Completed',
  WINNING_UPLOADED: 'Winning Uploaded',
  ON_HOLD: 'On Hold',
  REJECTED: 'Rejected',
  DELETED: 'Deleted',
} as const;
export type DrawTab = (typeof DRAW_TAB)[keyof typeof DRAW_TAB];

/** The Status column text a draw shows while it is listed under each stage tab ("All" shows any). */
export const DRAW_TAB_STATUS: Record<Exclude<DrawTab, 'All'>, RegExp> = {
  'Under Review': /^Under Review$/i,
  'Pending Approval': /^Pending Approval$/i,
  Approved: /^Approved$/i,
  'In Play': /^In Play$/i,
  'In Play Post Cutoff': /cut ?off/i,
  Completed: /^Completed$/i,
  'Winning Uploaded': /winning/i,
  'On Hold': /hold/i,
  Rejected: /reject/i,
  Deleted: /delet/i,
};

export interface DrawSchedule {
  /** "YYYY-MM-DDTHH:mm" in local time (datetime-local input format) */
  issueStart: string;
  issueCutoff: string;
  drawDate: string;
}

export interface LotteryDrawData extends DrawSchedule {
  brand: string;
  drawNumber: string;
  code: string;
  megaPrize: string;
  /** First ticket sequence (drawNumber + "001") and ticket count for the DBF service. */
  ticketStartId: string;
  ticketCount: number;
}

/** Date -> "YYYY-MM-DDTHH:mm" (local time), the datetime-local input format. */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "2026-11-21T14:00" -> "2026.11.21 02:00 PM" (how the app displays date-times). */
export function toDisplay(local: string): string {
  const [date, time] = local.split('T');
  const [h, m] = time.split(':').map(Number);
  const hh = String(((h + 11) % 12) + 1).padStart(2, '0');
  return `${date.replace(/-/g, '.')} ${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

const MINUTE = 60_000;

export class LotteryDrawDataFactory {
  private static instance: LotteryDrawDataFactory;
  private constructor() {}
  static getInstance(): LotteryDrawDataFactory {
    if (!LotteryDrawDataFactory.instance) LotteryDrawDataFactory.instance = new LotteryDrawDataFactory();
    return LotteryDrawDataFactory.instance;
  }

  /** 10 digits starting with 9: last 8 digits of the time in ms + one random digit. */
  generateDrawNumber(): string {
    return `9${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 10)}`;
  }

  /** Far-future schedule with a random minute so parallel tests never share a draw time. */
  futureSchedule(): DrawSchedule {
    const minute = Math.floor(Date.now() / MINUTE) * MINUTE;
    const draw = new Date(minute + 90 * 24 * 60 * MINUTE + Math.floor(Math.random() * 200_000) * MINUTE);
    return {
      issueStart: toLocalInput(new Date(draw.getTime() - 2 * 24 * 60 * MINUTE)),
      issueCutoff: toLocalInput(new Date(draw.getTime() - 2 * 60 * MINUTE)),
      drawDate: toLocalInput(draw),
    };
  }

  /** Schedule that plays out within minutes: start/cutoff/draw this many minutes from now. */
  imminentSchedule(startIn = 2, cutoffIn = 6, drawIn = 10): DrawSchedule {
    const now = Math.ceil(Date.now() / MINUTE) * MINUTE;
    return {
      issueStart: toLocalInput(new Date(now + startIn * MINUTE)),
      issueCutoff: toLocalInput(new Date(now + cutoffIn * MINUTE)),
      drawDate: toLocalInput(new Date(now + drawIn * MINUTE)),
    };
  }

  generate(overrides: Partial<LotteryDrawData> = {}): LotteryDrawData {
    const drawNumber = overrides.drawNumber ?? this.generateDrawNumber();
    return {
      brand: DEFAULT_DRAW_BRAND,
      drawNumber,
      code: `AT${drawNumber}`,
      megaPrize: '1000000',
      ticketStartId: `${drawNumber}001`,
      ticketCount: DEFAULT_TICKETS,
      ...this.futureSchedule(),
      ...overrides,
    };
  }
}

export const lotteryDrawDataFactory = LotteryDrawDataFactory.getInstance();
