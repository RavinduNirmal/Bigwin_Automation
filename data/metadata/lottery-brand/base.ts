import { TestMetadata, TestMetadataCollection } from '../../../utils/metadata-manager';

/**
 * Shared builder for the Lottery Brand metadata files (lottery-brand-*.metadata.ts), one file per spec:
 * nav, create, edit, delete, search, table, approval, use, logs, a11y.
 * Source of truth for the wording: specs/lottery-brand-test-plan.md.
 */
export const BRAND_BASE = { epic: 'Lottery Management', owner: 'QA Team' } as const;

export const BRAND_PRECONDITION = {
  OWN_BRAND: 'Logged in as admin; the test creates its own AT-prefixed brand',
} as const;

export const BRAND_POSTCONDITION = {
  SOFT_DELETED: 'afterEach soft-deletes the test\'s own "ATB..." brands (they remain in the Deleted tab - brands cannot be removed for good)',
} as const;

/**
 * Finish a collection: sets tms = id, adds a "Known-Defect" tag to cases with an `actualResult`
 * (the test fails until the app is fixed) and defaults the postconditions.
 */
export type BrandCase = Omit<TestMetadata, 'epic' | 'owner'>;

export function brandCases(cases: Record<string, BrandCase>): TestMetadataCollection {
  const out: TestMetadataCollection = {};
  for (const [id, c] of Object.entries(cases)) {
    out[id] = {
      ...BRAND_BASE,
      tms: id,
      ...c,
      tags: c.actualResult && !c.tags.includes('Known-Defect') ? [...c.tags, 'Known-Defect'] : c.tags,
      postconditions: c.postconditions ?? BRAND_POSTCONDITION.SOFT_DELETED,
    };
  }
  return out;
}
