import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ticket DBF file service - a Node port of utils/dbf_ticket_generator.html ("Build ticket DBF").
 *
 * Produces the same dBASE III file the HTML tool does, so draws can be created by tests without
 * opening the HTML page:
 *   header : version 0x03, last-update date (YY MM DD), record count, header size, record size
 *   fields : BARCODE C(14), SYMBOL C(7), LETTERS C(7), NUMBERS C(35)
 *   records: one per ticket, BARCODE = prefix + (padTo > 0 ? seq.padStart(padTo, '0') : seq)
 *            LETTERS = one random letter, NUMBERS = "n1,n2,...", e.g. "U" + "29,61,63,64"
 * and returns the file's MD5 checksum - the value Create Draw / Approve Draw ask for.
 *
 * Mahajana Sampatha tickets: 1 letter + 4 numbers -> numbersPerRecord: 4.
 */
export interface TicketDbfOptions {
  /** First ticket sequence number, e.g. 2026112101001 (kept exact with BigInt). */
  startId: number | bigint | string;
  /** Number of tickets (1 - 100000). */
  totalRecords: number;
  /** Prepended to every barcode (the HTML tool's "Prefix"), e.g. "0". */
  prefix?: string;
  /** Left-pad the sequence to this many digits; 0 = no padding. */
  padTo?: number;
  /** Letters to pick the LETTERS column from. */
  alphabet?: string;
  /** How many numbers per ticket (Mahajana Sampatha: 4). */
  numbersPerRecord?: number;
  numberMin?: number;
  numberMax?: number;
  /** Zero-pad numbers to the width of numberMax (e.g. "04"). */
  zeroPad?: boolean;
  /** No repeated number within one ticket. */
  uniqueNumbers?: boolean;
  /** Seed for reproducible letters/numbers (same seed + options = same file bytes). */
  seed?: string;
  /** Date written in the DBF header (defaults to today). */
  date?: Date;
}

export interface TicketRecord {
  BARCODE: string;
  SYMBOL: string;
  LETTERS: string;
  NUMBERS: string;
}

export interface TicketDbfFile {
  filePath: string;
  fileName: string;
  md5: string;
  size: number;
  recordCount: number;
  firstBarcode: string;
  lastBarcode: string;
}

export const DBF_FIELDS = [
  { name: 'BARCODE', type: 'C', length: 14 },
  { name: 'SYMBOL', type: 'C', length: 7 },
  { name: 'LETTERS', type: 'C', length: 7 },
  { name: 'NUMBERS', type: 'C', length: 35 },
] as const;

const DEFAULTS = {
  prefix: '0',
  padTo: 0,
  alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbersPerRecord: 4,
  numberMin: 1,
  numberMax: 80,
  zeroPad: true,
  uniqueNumbers: true,
};

/** Same seeded generator as the HTML tool (mulberry32 over an FNV-1a hash of the seed). */
function makeRng(seed?: string): () => number {
  if (!seed) return Math.random;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function barcodeOf(prefix: string, padTo: number, seq: bigint): string {
  const n = seq.toString();
  return prefix + (padTo > 0 ? n.padStart(padTo, '0') : n);
}

function randomNumbers(rng: () => number, count: number, min: number, max: number, zeroPad: boolean, unique: boolean): string {
  const nums: string[] = [];
  const used = new Set<number>();
  const width = String(max).length;
  let tries = 0;
  while (nums.length < count && tries < 20000) {
    const n = Math.floor(rng() * (max - min + 1)) + min;
    if (!unique || !used.has(n)) {
      used.add(n);
      nums.push(zeroPad ? String(n).padStart(width, '0') : String(n));
    }
    tries++;
  }
  return nums.join(',');
}

/** Build the ticket records (no file written). */
export function generateTicketRecords(options: TicketDbfOptions): TicketRecord[] {
  const o = { ...DEFAULTS, ...options };
  if (o.totalRecords < 1 || o.totalRecords > 100000) throw new Error('totalRecords must be between 1 and 100000');
  const rng = makeRng(o.seed);
  const start = BigInt(o.startId);
  const records: TicketRecord[] = [];
  for (let i = 0; i < o.totalRecords; i++) {
    const BARCODE = barcodeOf(o.prefix, o.padTo, start + BigInt(i));
    if (BARCODE.length > 14) throw new Error(`Barcode "${BARCODE}" is longer than the 14-character BARCODE field`);
    records.push({
      BARCODE,
      SYMBOL: '',
      LETTERS: o.alphabet[Math.floor(rng() * o.alphabet.length)],
      NUMBERS: randomNumbers(rng, o.numbersPerRecord, o.numberMin, o.numberMax, o.zeroPad, o.uniqueNumbers),
    });
  }
  return records;
}

/** Serialise records to dBASE III bytes, exactly like the HTML tool's buildDBF(). */
export function buildDbf(records: TicketRecord[], date: Date = new Date()): Buffer {
  const headerSize = 32 + DBF_FIELDS.length * 32 + 1;
  const recordSize = 1 + DBF_FIELDS.reduce((s, f) => s + f.length, 0);
  const buf = Buffer.alloc(headerSize + records.length * recordSize + 1, 0);
  buf[0] = 0x03;
  buf[1] = date.getFullYear() - 1900;
  buf[2] = date.getMonth() + 1;
  buf[3] = date.getDate();
  buf.writeUInt32LE(records.length, 4);
  buf.writeUInt16LE(headerSize, 8);
  buf.writeUInt16LE(recordSize, 10);
  DBF_FIELDS.forEach((f, i) => {
    const at = 32 + i * 32;
    buf.write(f.name, at, 11, 'latin1');
    buf[at + 11] = f.type.charCodeAt(0);
    buf[at + 16] = f.length;
  });
  buf[headerSize - 1] = 0x0d;
  records.forEach((rec, r) => {
    let at = headerSize + r * recordSize;
    buf[at++] = 0x20;
    for (const f of DBF_FIELDS) {
      buf.write(String(rec[f.name] ?? '').substring(0, f.length).padEnd(f.length, ' '), at, f.length, 'latin1');
      at += f.length;
    }
  });
  buf[buf.length - 1] = 0x1a;
  return buf;
}

export function md5Of(bytes: Buffer): string {
  return crypto.createHash('md5').update(bytes).digest('hex');
}

/** Generate the tickets, write `<outDir>/<fileName>.DBF` and return its path and MD5. */
export function writeTicketDbf(options: TicketDbfOptions, outDir: string, fileName: string): TicketDbfFile {
  const records = generateTicketRecords(options);
  const bytes = buildDbf(records, options.date);
  fs.mkdirSync(outDir, { recursive: true });
  const name = fileName.toUpperCase().endsWith('.DBF') ? fileName : `${fileName}.DBF`;
  const filePath = path.join(outDir, name);
  fs.writeFileSync(filePath, bytes);
  return {
    filePath,
    fileName: name,
    md5: md5Of(bytes),
    size: bytes.length,
    recordCount: records.length,
    firstBarcode: records[0].BARCODE,
    lastBarcode: records[records.length - 1].BARCODE,
  };
}

/** Read a ticket DBF back (for verification). */
export function readTicketDbf(filePath: string): { header: { date: string; recordCount: number }; records: TicketRecord[] } {
  const bytes = fs.readFileSync(filePath);
  const recordCount = bytes.readUInt32LE(4);
  const headerSize = bytes.readUInt16LE(8);
  const recordSize = bytes.readUInt16LE(10);
  const records: TicketRecord[] = [];
  for (let r = 0; r < recordCount; r++) {
    let at = headerSize + r * recordSize + 1;
    const rec: Record<string, string> = {};
    for (const f of DBF_FIELDS) {
      rec[f.name] = bytes.subarray(at, at + f.length).toString('latin1').trim();
      at += f.length;
    }
    records.push(rec as unknown as TicketRecord);
  }
  const date = `${1900 + bytes[1]}-${String(bytes[2]).padStart(2, '0')}-${String(bytes[3]).padStart(2, '0')}`;
  return { header: { date, recordCount }, records };
}
