import { drawCases } from './base';

/**
 * Metadata for tests/unit/ticket-dbf.service.spec.ts - plain-language, see base.ts.
 * The automation builds its own ticket files (.dbf) with utils/dbf/ticket-dbf.service.ts, the same way as the
 * team's tool utils/dbf_ticket_generator.html. These checks make sure the test files are correct.
 */
const PRE = '- No browser or login needed - the ticket file maker of the automation (utils/dbf/ticket-dbf.service.ts) is checked on its own';
const TEMP = 'Only temporary files are created (deleted afterwards)';

export const TicketDbfMetadata = drawCases('Ticket DBF Service', {
  'TC-DBF-001': {
    story: 'Ticket Records', severity: 'critical', tags: ['Regression', 'Unit'],
    description: 'The generated ticket file has the right ticket numbers and format\nWhy: every draw test relies on correct ticket files.',
    preconditions: PRE,
    testData: '- First ticket 2026112101001, 100 tickets, barcode prefix "0", 4 numbers per ticket',
    steps: ['Generate the ticket file', 'Read every ticket: its barcode, its letter and its numbers'],
    expectedResult: '- Barcodes run from 02026112101001 to 02026112101100\n- Every ticket has 1 letter and 4 different numbers between 01 and 80',
    postconditions: TEMP,
  },
  'TC-DBF-002': {
    story: 'Parity With HTML Tool', severity: 'critical', tags: ['Regression', 'Unit'],
    description: 'The automation builds exactly the same kind of file as the team\'s ticket generator tool\nWhy: test files must look like the real files the business uploads.',
    preconditions: `${PRE}\n- The team's tool utils/dbf_ticket_generator.html is opened in a browser`,
    testData: '- The same settings in both',
    steps: ['Make a file with the HTML tool', 'Make a file with the automation', 'Compare the file layout and the barcodes'],
    expectedResult: '- Same file type (dBASE III) and the same fields (BARCODE 14 characters, SYMBOL 7, LETTERS 7, NUMBERS 35)\n- The same barcodes',
    postconditions: TEMP,
  },
  'TC-DBF-003': {
    story: 'MD5 Checksum', severity: 'normal', tags: ['Regression', 'Unit'],
    description: 'The same settings give exactly the same file, and its checksum is correct\nWhy: tests need repeatable files with the right MD5 checksum.',
    preconditions: PRE,
    testData: '- A fixed "seed" (the same random start value both times)',
    steps: ['Generate the file twice with the same seed', 'Calculate the MD5 checksum of each file separately'],
    expectedResult: '- The two files are identical byte for byte\n- Their checksums are equal and match the checksum the tool reports',
    postconditions: TEMP,
  },
  'TC-DBF-004': {
    story: 'Validation', severity: 'minor', tags: ['Regression', 'Unit'],
    description: 'A barcode longer than 14 characters is refused\nWhy: the barcode field holds 14 characters - longer barcodes would be cut off.',
    preconditions: PRE,
    testData: '- Prefix + ticket number = 15 characters',
    steps: ['Try to generate a file with a 15-character barcode'],
    expectedResult: '- An error is reported and no file is written',
    postconditions: 'Nothing is created',
  },
});
