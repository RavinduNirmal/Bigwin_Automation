/** Types for config/test-suites.js (resolver of config/test-suites.json). */
export interface SuiteGroup {
  area: string;
  tests: Array<string | { id: string; why?: string }>;
}

export interface ResolvedSuite {
  key: string;
  name: string;
  limit: number;
  target: string;
  purpose: string;
  whenToRun: string;
  rule: string;
  includes: string[];
  groups: SuiteGroup[];
  /** ids listed by this suite itself */
  own: string[];
  /** every id of the suite, incl. the included suites */
  ids: string[];
  /** id -> reason it is in the suite (smoke) */
  why: Record<string, string>;
}

export const SUITE_FILE: string;
export const SUITE_NAMES: string[];
export function loadSuites(): Record<string, unknown>;
export function resolveSuite(key: string): ResolvedSuite;
export function grepFor(key: string): RegExp;
export function suitesOf(id: string): string[];
export function suiteTag(key: string): string;
export function scanSpecIds(dir?: string): Record<string, string>;
export function scanMetadataIds(dir?: string): Set<string>;
export function validate(): { errors: string[]; warnings: string[]; specs: Record<string, string> };
