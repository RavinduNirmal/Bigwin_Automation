import { Locator } from '@playwright/test';

/**
 * Inputs of the Create / Update Lottery Type dialogs.
 *
 * Code and Type have proper labels ("Code *", "Type *"), so they use role locators.
 * Deliberate exceptions (documented):
 *  - Status is an MUI Select: a div with aria-haspopup="listbox" whose label is NOT associated
 *    with it, so it has no accessible name in the Create dialog (in Update its name is the value,
 *    e.g. "ACTIVE"). It is found by its listbox popup attribute.
 *  - Stage (Update dialog only) is a disabled textbox whose label is not associated either.
 */
export function lotteryTypeFormFields(dialog: Locator): {
  code: Locator;
  type: Locator;
  status: Locator;
  stage: Locator;
} {
  return {
    code: dialog.getByRole('textbox', { name: 'Code' }),
    type: dialog.getByRole('textbox', { name: 'Type' }),
    status: dialog.locator('[aria-haspopup="listbox"]'),
    stage: dialog.locator('input[name="approvalstatus"]'),
  };
}
