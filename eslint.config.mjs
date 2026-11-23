// ESLint flat config - TypeScript (type-aware) + eslint-plugin-playwright.
//
// Policy:
//   ERROR = a real bug or a test that can lie (un-awaited Playwright calls, floating promises,
//           focused tests, invalid expect(...) usage). These must be fixed before merging.
//   WARN  = known technical debt that is being paid down (fixed sleeps, networkidle, `any`,
//           conditionals in tests). Visible on every run, but does not block.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**', 'allure-results/**', 'allure-report/**', 'playwright/.auth/**'],
  },

  // ---------- All TypeScript ----------
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node },
    },
    rules: {
      // --- Async bugs: in Playwright code a missing `await` means a step or assertion silently never runs
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

      // --- Debt: tracked, not blocking
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  // ---------- Tell the Playwright plugin about our merged test object ----------
  // Specs define tests with `combinedTest(...)` (from mergeTests). Without this alias the plugin
  // doesn't recognise them as tests and reports every expect() as "standalone".
  {
    settings: { playwright: { globalAliases: { test: ['combinedTest', 'setup'] } } },
  },

  // ---------- Fixtures: Playwright requires `async ({}, use) => ...` for fixtures with no deps ----------
  {
    files: ['fixtures/**/*.ts'],
    rules: { 'no-empty-pattern': 'off' },
  },

  // ---------- Playwright rules for everything that drives the browser ----------
  {
    files: ['tests/**/*.ts', 'pages/**/*.ts', 'components/**/*.ts', 'fixtures/**/*.ts', 'utils/**/*.ts'],
    // same plugin object the preset below registers (ESLint refuses two different objects)
    plugins: playwright.configs['flat/recommended'].plugins,
    rules: {
      'playwright/missing-playwright-await': 'error',   // e.g. expect(locator).toBeVisible() without await
      'playwright/no-useless-await': 'error',
      'playwright/valid-expect': 'error',
      'playwright/no-element-handle': 'error',          // use locators, not ElementHandles
      'playwright/no-eval': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-force-option': 'warn',
      'playwright/no-wait-for-timeout': 'warn',         // debt: ~75 fixed sleeps being replaced
      'playwright/no-networkidle': 'warn',              // debt: discouraged by Playwright
      'playwright/prefer-web-first-assertions': 'warn',
    },
  },

  // ---------- Test files only ----------
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-focused-test': 'error',            // a stray test.only silently skips the rest of the suite
      'playwright/no-skipped-test': ['warn', { allowConditional: true }], // test.skip(condition, reason) is fine
      'playwright/expect-expect': ['warn', {
        // our helpers that assert internally count as assertions
        assertFunctionNames: [
          'expectLotteryTypeInTable', 'expectLotteryTypeNotInTable', 'expectLotteryTypeSaved', 'expectRowCountForCode',
          'expectPersistsAfterReload', 'expectEditSaved', 'expectEditRejected', 'expectUpdateRejected',
          'expectCreateBlocked', 'expectCreateNotSaved', 'submitCreateAndExpectRejected', 'deleteAndVerify',
          'sortAndVerify', 'searchAndVerify', 'expectAllRowsMatch', 'expectApprovalStage', 'reviewAndVerify',
          'approveAndVerify', 'createApprovedLotteryType', 'expectOfferedForUse',
          'expectBrandListed', 'expectBrandNotListed', 'expectBrandRow', 'submitBrandAndExpectRejected',
          'expectBrandPageStage', 'createApprovedBrand', 'expectBrandOfferedForDraw', 'sortBrandsAndVerify', 'expectSortReverses', 'expectAllRowsHave',
          'verifyViewLoaded', 'verifyStep1Loaded', 'editBrand', 'deleteBrand', 'review', 'approve',
          'expectDrawInTab', 'expectDrawNotInTab', 'reviewDrawAndVerify', 'approveDrawAndVerify', 'waitForDrawInTab', 'waitForTicketsLoaded', 'waitForDrawStatus', 'verifyDrawInStageTab', 'verifyDrawStatusChange', 'sendBackForReviewAndVerify', 'waitForUploadSettled', 'expectChecksumRefused', 'expectUploadAccepted', 'deleteDrawAndVerify', 'createHolderDraw', 'reviewAndApprove', 'createDrawInStage', 'waitForUploadLogRow',
          'verifyPageLoaded', 'verifyLotteryTypeData', 'verifyFieldsVisible', 'verifyLoginSuccess',
          'verifyLoginError', 'verifyStillOnLoginPage', 'verifyErrorToast', 'verifyNetworkErrorToast',
        ],
      }],
      'playwright/no-conditional-in-test': 'warn',      // debt: a branch in a test can hide a skipped check
      'playwright/no-conditional-expect': 'warn',
      'playwright/no-wait-for-timeout': 'warn',
      'playwright/no-networkidle': 'warn',
    },
  },

  // ---------- Plain JS helper scripts (Node) ----------
  {
    files: ['scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  }
);
