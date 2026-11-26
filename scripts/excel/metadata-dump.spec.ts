import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { AllTestMetadata } from '../../data/metadata';

/** Writes every test case's metadata to playwright/.excel-sync/metadata.json for scripts/excel/refresh_cases.py. */
test('export test case metadata', () => {
  const out = path.resolve(__dirname, '..', '..', 'playwright', '.excel-sync', 'metadata.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(AllTestMetadata, null, 1));
  console.log(`metadata of ${Object.keys(AllTestMetadata).length} test cases -> ${out}`);
});
