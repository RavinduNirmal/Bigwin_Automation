import { drawCases } from './lottery-draw-base';

/** Allure metadata for tests/unit/ticket-dbf.service.spec.ts (plan section 5). */
const SERVICE = 'utils/dbf/ticket-dbf.service.ts (no browser needed)';

export const TicketDbfMetadata = drawCases('Ticket DBF Service', {
  'TC-DBF-001': {
    story: 'Ticket Records', severity: 'critical', tags: ['Regression', 'Unit'],
    description: 'Generated tickets have the right barcodes and format',
    preconditions: SERVICE, testData: 'startId 2026112101001, 100 records, prefix "0", 4 numbers per record',
    steps: ['Generate the records', 'Check barcodes, letters and numbers'],
    expectedResult: 'Barcodes 02026112101001..02026112101100; 1 letter + 4 unique numbers 01-80 per ticket',
    postconditions: 'Temporary files only',
  },
  'TC-DBF-002': {
    story: 'Parity With HTML Tool', severity: 'critical', tags: ['Regression', 'Unit'],
    description: 'The service writes the same DBF layout and barcodes as utils/dbf_ticket_generator.html',
    preconditions: SERVICE + '; the HTML tool loaded in a browser', testData: 'Same options in both',
    steps: ['Build a file with the HTML tool', 'Build a file with the service', 'Compare header, field descriptors and barcodes'],
    expectedResult: 'Identical header (dBASE III), fields BARCODE C14, SYMBOL C7, LETTERS C7, NUMBERS C35, and identical barcodes',
    postconditions: 'Temporary files only',
  },
  'TC-DBF-003': {
    story: 'MD5 Checksum', severity: 'normal', tags: ['Regression', 'Unit'],
    description: 'The same seed gives the same file and MD5, and the MD5 matches the file',
    preconditions: SERVICE, testData: 'Fixed seed',
    steps: ['Generate twice with one seed', 'Hash the files independently'],
    expectedResult: 'Byte-identical files; equal MD5 equal to the independent hash',
    postconditions: 'Temporary files only',
  },
  'TC-DBF-004': {
    story: 'Validation', severity: 'minor', tags: ['Regression', 'Unit'],
    description: 'A barcode longer than the 14-character field is refused',
    preconditions: SERVICE, testData: 'Prefix + sequence = 15 characters',
    steps: ['Generate with a 15-character barcode'],
    expectedResult: 'An error is thrown; no file is written',
  },
});
