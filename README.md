# Bigwin_Automation

Playwright + TypeScript E2E tests for the BigWin admin portal (Login with OTP, Lottery Type module).

```bash
npm ci && npx playwright install --with-deps
npx playwright test                 # runs the "setup" login, then all tests
npm run allure:serve                # Allure report
npm run check                       # typecheck + lint
```

Target environment and credentials: `config/env/<TEST_ENV>.json` (default `dev`).
See `CLAUDE.md` for the architecture and conventions.

#Demo
npx playwright test -g "TC-LD-DEMO-001" --headed --workers=1
