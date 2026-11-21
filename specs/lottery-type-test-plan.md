# Lottery Type Test Plan (verified against live dev app)

## Application Overview

Verified test plan for Lottery > Lottery Type in the BigWin admin portal (dev: https://e763fesnjnk.dev.accelr.net/dashboard/lottery/lottery-type), explored live on 2026-11-21. Page layout: heading 'Lottery Type', 'Add New Type', tabs All/Active/Deleted, 'Search...' box (Enter submits) with 'clear' button, table (checkbox, Code, Type Description, Status, Stage, unnamed row-actions button), 'Page X of Y' with two icon-only arrows (previous, next). Row menu: Edit, Delete, Logs. Status labels: ACTIVE shows 'Active', DISABLED shows 'Disable'; new records have Stage 'Under Review'. Dialogs: 'Create Lottery Type' (Code *, Type *, Status select ACTIVE/DISABLED, Cancel, Create) and 'Update Lottery Type' (Code, Type, Status, disabled Stage, Review, Cancel, Update). Conventions: every scenario starts fresh via authenticatedPage on Lottery Type, creates its own AT-prefixed data and deletes it in afterEach; shared dev DB so never assert on global totals/first row/table order; run with --workers=1; click Review/Approve ONLY on the scenario's own AT-prefixed records (section 10), never Send Code to Mobile or Log out. Status tags: [Verified live] = steps/expected confirmed on the live app; [Not verifiable: reason] = could not be confirmed. [DEFECT] = scenario states the CORRECT expected behaviour which the current app fails (must stay failing, no fixme/skip); the one-line note says what actually happens. Automated = exists in tests/e2e/lottery-type/*.spec.ts; NEW = not yet automated. Live facts: list API is POST /api/lottery/types with {page, rowsPerPage:10, query, sortBy, sortDir, view(-1 all/1 active/4 deleted), approvalStatus}; the server ignores query, sortBy, view and page, which is the root of the search/sort/tab/pagination defects. Create = POST /api/lottery/types/create, edit = PUT /api/lottery/types/{id}, delete = DELETE /api/lottery/types/delete/{id}. Successful create/update/delete reload the page and show no visible toast. NEW DEFECTS found: (a) row menu 'Logs' goes to /dashboard/audit-log?drawId=LOTTERY_TYPE which shows 'Nothing here! The page requested does not exist.' (Audit Logs lives at /dashboard/audit); (b) Type containing non-Latin-1 characters (CJK, emoji) fails with HTTP 500 and toast 'Failed to create lottery type'; (c) editing Type to spaces-only returns HTTP 500 and the Update dialog stays open with no message; (d) pagination: 'Page 1 of 2' shows all 11 rows and Next shows the same 11 rows; (e) Type length message says 'name must be at most 255 characters' instead of 'Type'; (f) lottery type create/update not found in Audit Logs; (g) tabs are not keyboard focusable on load.

## Test Scenarios

### 1. 1. Navigation & Display

**Seed:** `tests/seed.spec.ts`

#### 1.1. TC-LT-NAV-001: Navigate to Lottery Type from the sidebar (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Expand sidebar 'Lottery' and click link 'Lottery Type'
    - expect: URL ends with /dashboard/lottery/lottery-type
    - expect: Page title 'Lottery: List | BigWin'
    - expect: Heading 'Lottery Type' visible

#### 1.2. TC-LT-NAV-002: Table shows Code, Type Description, Status and Stage columns (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Inspect table header
    - expect: Sortable column buttons Code, Type Description, Status, Stage; plus a select-all checkbox column and an unnamed actions column

#### 1.3. TC-LT-NAV-003: Page shows Add New Type, search, tabs and page info (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Open Lottery Type
    - expect: 'Add New Type' button, 'Search...' textbox with 'clear' button, tabs All/Active/Deleted, 'Page X of Y' with two arrow buttons (both disabled when only one page)

#### 1.4. TC-LT-NAV-004: Row actions menu offers Edit, Delete and Logs (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Create own record, click its row-actions button
    - expect: role=menu with menuitems exactly Edit, Delete, Logs

#### 1.5. TC-LT-NAV-005: Row menu closes with Escape and on outside click (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Open the row menu, press Escape; open again and click outside
    - expect: Menu closes both times; focus returns to the row-actions button; record unchanged

#### 1.6. TC-LT-NAV-006: A tab is selected on page load [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Open Lottery Type fresh and read aria-selected of the three tabs
    - expect: Exactly one tab ('All') has aria-selected=true. ACTUAL: all three tabs aria-selected=false and none highlighted

#### 1.7. TC-LT-NAV-007: Reload and Back/Forward keep the user on Lottery Type (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Reload the page; the search box was previously filled
    - expect: No redirect to login; heading and table render; search box is empty after reload
  2. Go Back to the previous page then Forward
    - expect: Lottery Type renders again with heading and table

#### 1.8. TC-LT-NAV-008: Status and Stage labels for a new ACTIVE record (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Create own ACTIVE record and read its row
    - expect: Status cell 'Active', Stage cell 'Under Review'

#### 1.9. TC-LT-NAV-009: Lottery sidebar group links (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_nav.spec.ts`

**Steps:**
  1. Expand sidebar 'Lottery'
    - expect: Links: 'Lottery Brand' (/dashboard/lottery), 'Lottery Type' (/dashboard/lottery/lottery-type), 'Pricing Schemes' (/dashboard/lottery/pricing-scheme)

### 2. 2. Create

**Seed:** `tests/seed.spec.ts`

#### 2.1. TC-LT-CR-001: Add New Type opens the Create Lottery Type dialog (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Click 'Add New Type'
    - expect: Dialog 'Create Lottery Type' with textboxes 'Code *', 'Type *', a Status select (no accessible label), buttons Cancel and Create

#### 2.2. TC-LT-CR-002: Create an ACTIVE lottery type (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Fill unique ATPLAN code and Type, Status ACTIVE, click Create
    - expect: POST /api/lottery/types/create sent; dialog closes; page reloads; NO toast; row shows Active and Stage 'Under Review'

#### 2.3. TC-LT-CR-003: Create a DISABLED lottery type [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create with Status DISABLED (request body carries status DISABLED)
    - expect: Row shows Status 'Disable'. ACTUAL: row shows 'Active'; Edit to DISABLED works afterwards

#### 2.4. TC-LT-CR-004: Empty form cannot be submitted (Automated) [Verified live - corrected from draft]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Open dialog and click Create with all fields untouched
    - expect: Dialog stays open; no request sent; Code input is natively invalid (validity.valueMissing). CORRECTION: no inline 'is required' messages appear on a pristine submit; they only appear after a field is touched and cleared

#### 2.5. TC-LT-CR-005: Clearing Code shows 'Code is required' (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Type then clear Code, tab away
    - expect: 'Code is required' shown; Create does not save

#### 2.6. TC-LT-CR-006: Clearing Type shows 'Type is required' (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Type then clear Type
    - expect: 'Type is required' shown

#### 2.7. TC-LT-CR-007: Missing Status shows 'Status is required' (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Fill Code and Type only, click Create
    - expect: 'Status is required' shown; dialog stays open; no request

#### 2.8. TC-LT-CR-008: Duplicate Code is rejected (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create a record, then Add New Type with the same Code
    - expect: Server answers 500; toast 'Failed to create lottery type'; dialog stays open; only one row for the code

#### 2.9. TC-LT-CR-009: Type made only of spaces is rejected [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Valid code, Type '   ', Status ACTIVE, Create
    - expect: Validation error 'Type is required', nothing created. ACTUAL: record created with a blank Type (POST name '   ')

#### 2.10. TC-LT-CR-010: Code longer than 255 characters is rejected (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Enter 256 characters in Code, Status ACTIVE, Create
    - expect: Inline 'code must be at most 255 characters'; dialog stays open; nothing saved (input is not capped)

#### 2.11. TC-LT-CR-011: Type of exactly 255 characters is saved in full (Automated) [Not verifiable: 255-char Type not exercised live to limit shared-DB writes; the 255-char Code case in CR-015 behaves as expected]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create with 255-char Type
    - expect: Saved in full; Edit dialog shows all 255 characters

#### 2.12. TC-LT-CR-012: Cancel discards the entered data (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Fill form, click Cancel, reopen dialog
    - expect: Dialog closed, nothing saved, reopened form fields empty

#### 2.13. TC-LT-CR-013: Escape closes the Create dialog without saving (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Fill form, press Escape, reopen
    - expect: Dialog closes, nothing saved, reopened form empty. Note Escape while the Status list is open only closes the list

#### 2.14. TC-LT-CR-014: HTML in Type is shown as plain text (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create Type '<b>x</b><img src=x onerror=alert(1)>'
    - expect: Row cell shows the literal text; no bold/img elements; no browser alert

#### 2.15. TC-LT-CR-015: Code of exactly 255 characters is accepted (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create with code 'ATPLAN' + 249 digits (255 chars)
    - expect: Dialog closes, page reloads, row present with the full 255-char code

#### 2.16. TC-LT-CR-016: Type longer than 255 characters is rejected (NEW) [DEFECT - wrong field name in message] [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Enter 256 characters in Type, click Create
    - expect: Blocked with a message naming the Type field, e.g. 'Type must be at most 255 characters'. ACTUAL: blocked (nothing saved) but the message reads 'name must be at most 255 characters'

#### 2.17. TC-LT-CR-017: Code with only spaces is rejected (NEW) [Not verifiable: submitting would create a record whose code is not ATPLAN-prefixed and could not be safely identified/cleaned]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Enter '   ' as Code with valid Type and Status; no inline message appears while typing
    - expect: Expected 'Code is required' and nothing saved; if the record is created report as defect (AT-prefix needed in the automation e.g. code '   ' is not possible - use framework-safe variant)

#### 2.18. TC-LT-CR-018: Quotes, ampersand and Latin-1 accents in Type are stored exactly (NEW) [Verified live; leading/trailing-space trimming Not verifiable: not exercised]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create with Type "ATPLAN quotes ' \" &amp;" and another with 'ATPLAN é'
    - expect: Created; the row shows the text exactly as typed (&amp; is not decoded); reload shows the same

#### 2.19. TC-LT-CR-019: Duplicate Code differing only by case is rejected (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create 'ATPLAN301', then 'atplan301'
    - expect: Second create returns 500, toast 'Failed to create lottery type', dialog stays open; uniqueness is case-insensitive, one row only

#### 2.20. TC-LT-CR-020: Double-click Create creates only one record (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Fill form and double-click Create
    - expect: Exactly one create request and one row; no failure toast

#### 2.21. TC-LT-CR-021: Created record persists after reload (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create record, reload browser
    - expect: Row still listed with same Code, Type, Status 'Active', Stage 'Under Review'

#### 2.22. TC-LT-CR-022: Create dialog keyboard use (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Open dialog, focus Code, press Tab repeatedly
    - expect: Order Code, Type, Status select, Cancel, Create, then wraps back to Code (focus trapped)
  2. Fill all fields and press Enter in the Type field
    - expect: Form submits: dialog closes, page reloads, row appears

#### 2.23. TC-LT-CR-023: Backdrop click closes the Create dialog without saving (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Open dialog, type values, click the dark backdrop outside the dialog
    - expect: Dialog closes; nothing saved

#### 2.24. TC-LT-CR-024: Type with non-Latin-1 characters (CJK, emoji) can be created [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Create with Type 'ATPLAN 日本' and separately 'ATPLAN 🎉'
    - expect: Records are saved and shown exactly. ACTUAL: HTTP 500, toast 'Failed to create lottery type', dialog stays open (Latin-1 'é' works)

#### 2.25. TC-LT-CR-025: Status select offers ACTIVE and DISABLED only (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_create.spec.ts`

**Steps:**
  1. Open the Status select in the Create dialog
    - expect: Options exactly 'ACTIVE' and 'DISABLED'; select is empty by default

### 3. 3. Edit

**Seed:** `tests/seed.spec.ts`

#### 3.1. TC-LT-ED-001: Edit dialog is pre-filled with saved values (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Row menu > Edit on own record
    - expect: 'Update Lottery Type' with Code, Type, Status select, Stage field disabled showing 'Under Review'; buttons Review, Cancel, Update (Review is exercised in section 10)

#### 3.2. TC-LT-ED-002: Update the Type (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Change Type, click Update
    - expect: PUT /api/lottery/types/{id}; dialog closes; page reloads; row shows new Type; no toast

#### 3.3. TC-LT-ED-003: Change Status ACTIVE to DISABLED (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Set Status DISABLED, Update
    - expect: Row Status reads 'Disable'; reopening Edit shows DISABLED

#### 3.4. TC-LT-ED-004: Change the Code (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Change Code to a new unique ATPLAN code, Update
    - expect: Row appears under new code; old code no longer listed

#### 3.5. TC-LT-ED-005: Clearing Type shows 'Type is required' (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Clear Type in Update dialog
    - expect: 'Type is required' shown; Update does not save

#### 3.6. TC-LT-ED-006: Cancel discards the changes (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Change Code/Type, click Cancel
    - expect: Dialog closes; row unchanged

#### 3.7. TC-LT-ED-007: Changing Code to an existing Code is rejected with a message [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Create A and B; edit B's Code to A, Update
    - expect: Visible error message/toast, both records unchanged. ACTUAL: PUT returns 500, dialog stays open, NO message or toast

#### 3.8. TC-LT-ED-008: Escape and backdrop click close the Update dialog without saving (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Change Type, press Escape; reopen, change Type, click backdrop
    - expect: Dialog closes each time; row unchanged

#### 3.9. TC-LT-ED-009: Clearing Code shows 'Code is required' (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Clear Code, click Update
    - expect: 'Code is required'; dialog stays open; no request

#### 3.10. TC-LT-ED-010: Type of only spaces is rejected on edit [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Set Type '   ', click Update
    - expect: Inline 'Type is required', no save. ACTUAL: PUT returns 500 {"error":"Internal Server Error"}; dialog stays open, no message (while Create accepts the same value)

#### 3.11. TC-LT-ED-011: Type over 255 characters rejected on edit (NEW) [DEFECT - message says 'name'] [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Enter 256 chars in Type, Update
    - expect: Blocked, no request. Message should name Type; ACTUAL 'name must be at most 255 characters'

#### 3.12. TC-LT-ED-012: Stage field is read-only (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Inspect/try to type into Stage
    - expect: Input is disabled; value stays 'Under Review'

#### 3.13. TC-LT-ED-013: Update with no changes (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Open Edit and click Update unchanged
    - expect: PUT sent with the same values; dialog closes; no error; record unchanged

#### 3.14. TC-LT-ED-014: Edit persists after reload; DISABLED back to ACTIVE (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Edit Type and Status DISABLED, reload, reopen Edit; then set Status ACTIVE
    - expect: Dialog shows saved Type and DISABLED; after switching back the row shows 'Active'

#### 3.15. TC-LT-ED-015: Edit dialog does not leak data between rows (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Create two own records; Edit A, change Type, Escape; Edit B
    - expect: B's dialog shows B's values; A unchanged

#### 3.16. TC-LT-ED-016: Update dialog keyboard order (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_edit.spec.ts`

**Steps:**
  1. Open Edit, focus Code, press Tab
    - expect: Order Code, Type, Status, Review, Cancel, Update (Stage skipped as disabled). Review itself is covered in section 10

### 4. 4. Delete

**Seed:** `tests/seed.spec.ts`

#### 4.1. TC-LT-DEL-001: Delete from the row menu (Automated) [Verified live; success toast Not verifiable: page reloads at once so no toast can be observed]

**File:** `tests/e2e/lottery-type/lottery_type_delete.spec.ts`

**Steps:**
  1. Row menu > Delete on own record
    - expect: No confirmation dialog; DELETE /api/lottery/types/delete/{id} returns 200; page reloads; row gone. CORRECTION: draft's toast 'Lottery type deleted successfuly' could not be observed

#### 4.2. TC-LT-DEL-002: Deleted type stays deleted after reload (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_delete.spec.ts`

**Steps:**
  1. Delete then reload
    - expect: Row not present

#### 4.3. TC-LT-DEL-003: Deleting one leaves the others (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_delete.spec.ts`

**Steps:**
  1. Create two, delete one
    - expect: Other row remains

#### 4.4. TC-LT-DEL-004: A deleted Code can be reused (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_delete.spec.ts`

**Steps:**
  1. Delete then recreate with the same code
    - expect: Create succeeds; new row shows the new Type

#### 4.5. TC-LT-DEL-005: Deleted record is listed in Deleted tab (NEW) [DEFECT] [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_delete.spec.ts`

**Steps:**
  1. Delete own record, open Deleted tab
    - expect: If soft delete: record listed under Deleted only. ACTUAL: Deleted tab (view=4) lists the same live rows as All and never the deleted record (tab filter ignored by server). Product must confirm soft vs hard delete

#### 4.6. TC-LT-DEL-006: Delete a DISABLED record (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_delete.spec.ts`

**Steps:**
  1. Edit own record to DISABLED, then Delete
    - expect: Row removed after reload

#### 4.7. TC-LT-DEL-007: Delete a record while a search term is applied (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_delete.spec.ts`

**Steps:**
  1. Search the code, press Enter, delete its row
    - expect: Own row gone; no other record removed. (Search does not filter - see SRCH-001)

#### 4.8. TC-LT-DEL-008: Delete a record already deleted in another session (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_delete.spec.ts`

**Steps:**
  1. Open two pages; delete in page 1; delete same row in stale page 2
    - expect: DELETE returns 400 and toast 'Lottery type with id <id> not found.'; no crash. NOTE stale page does not reload so the ghost row remains until manual reload

### 5. 5. Search

**Seed:** `tests/seed.spec.ts`

#### 5.1. TC-LT-SRCH-001: Search by exact Code [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Type own code in 'Search...' and press Enter
    - expect: Only matching row(s). ACTUAL: request carries query but the full list (5 seeded rows + own) is returned

#### 5.2. TC-LT-SRCH-002: Search by text in the Type [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Search a unique Type word
    - expect: Matching row only. ACTUAL: unfiltered

#### 5.3. TC-LT-SRCH-003: Search is case-insensitive [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Search lowercase of the code
    - expect: Row found. ACTUAL: unfiltered

#### 5.4. TC-LT-SRCH-004: No match shows no rows [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Search 'zzzznomatch', Enter
    - expect: Zero data rows/empty state. ACTUAL: all rows still shown

#### 5.5. TC-LT-SRCH-005: Clearing the search lists everything again (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Search then click 'clear'
    - expect: Box emptied; request re-sent with query ''; full list

#### 5.6. TC-LT-SRCH-006: Search is only sent on Enter (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Type a term and wait 1.5s without Enter
    - expect: No list request is sent and table unchanged until Enter

#### 5.7. TC-LT-SRCH-007: Partial / prefix search [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Create ATPLAN-prefixed row, search 'ATPLAN'
    - expect: Own row included, seeded rows (PASS, SCAR...) excluded. ACTUAL: seeded rows still shown

#### 5.8. TC-LT-SRCH-008: Search with special characters and HTML (NEW) [Not verifiable: results can never be validated while search is non-functional; only no-crash checkable]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Search '<script>', '%', a single quote
    - expect: No error, no script execution, sensible empty or matching result

#### 5.9. TC-LT-SRCH-009: Search with leading/trailing spaces and whitespace only (NEW) [Not verifiable: trim behaviour cannot be observed while search is non-functional]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Search ' code ' and '   '
    - expect: Trimmed or consistent; page does not break

#### 5.10. TC-LT-SRCH-010: Search resets pagination to page 1 (NEW) [Not verifiable: second page only exists when 11+ rows and server ignores paging]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Go to page 2, then search
    - expect: Request page=0; indicator 'Page 1 of N'

#### 5.11. TC-LT-SRCH-011: Search term is not kept after reload (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_search.spec.ts`

**Steps:**
  1. Search 'abc' then reload
    - expect: Search box empty after reload and full list shown

### 6. 6. Table (sort, tabs, pagination)

**Seed:** `tests/seed.spec.ts`

#### 6.1. TC-LT-TBL-001: Sort by Code in both directions [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Create own records with ordered codes, click 'Code' header twice
    - expect: Ascending then descending. ACTUAL: requests sent (sortBy code asc/desc) but order unchanged

#### 6.2. TC-LT-TBL-002: Sort by Type Description [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Click 'Type Description' header
    - expect: Rows ordered by Type. ACTUAL: unchanged (sortBy typeDescription)

#### 6.3. TC-LT-TBL-003: Active tab hides DISABLED types [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Edit own record to DISABLED, click 'Active' tab (view=1)
    - expect: Own DISABLED record not listed. ACTUAL: list unchanged

#### 6.4. TC-LT-TBL-004: Deleted tab does not list non-deleted records [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Click 'Deleted' tab (view=4)
    - expect: Own live record absent. ACTUAL: all live rows shown

#### 6.5. TC-LT-TBL-005: Page information is shown (Automated) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Open page
    - expect: 'Page X of Y' visible; arrows disabled for a single page

#### 6.6. TC-LT-TBL-006: Sort by Status and Stage [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Click 'Status' then 'Stage'
    - expect: Rows sorted. ACTUAL: requests sent, order unchanged

#### 6.7. TC-LT-TBL-007: Repeated header clicks toggle asc/desc consistently (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Click 'Code' three times and capture requests; click another header
    - expect: Cycle is asc, desc, asc (never 'none'); clicking a different header starts at asc. (Row order assertions part of TBL-001 defect)

#### 6.8. TC-LT-TBL-008: Tab click selects the clicked tab (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Click Active, Deleted, All in turn
    - expect: Clicked tab has aria-selected=true and others false; requests use view 1, 4, -1; selection is lost after a page reload

#### 6.9. TC-LT-TBL-009: Pagination next/previous [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. With 11 rows exist (create ATPLAN rows to exceed 10), read 'Page X of Y', click Next then Previous
    - expect: Page 1 shows at most 10 rows; Next shows the remaining row(s); Previous disabled on page 1, Next disabled on last page. ACTUAL: 'Page 1 of 2' shows all 11 rows, Next ('Page 2 of 2', request page=1) shows the same 11 rows. Indicator/arrow enablement itself works

#### 6.10. TC-LT-TBL-010: Empty state when no rows match (NEW) [Not verifiable: app never shows an empty list because search is ignored; intended empty-state design unknown]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Search a nonsense term
    - expect: No data rows and 'Page 1 of 1' or an empty message

#### 6.11. TC-LT-TBL-011: Newly created row ordering follows the requested sort (NEW) [DEFECT - to be confirmed by product] [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_table.spec.ts`

**Steps:**
  1. Create own record; list request default is sortBy createdAt, sortDir desc
    - expect: Newest first (desc). ACTUAL: newly created row appears at the bottom (oldest first)

### 7. 7. Row Selection

**Seed:** `tests/seed.spec.ts`

#### 7.1. TC-LT-SEL-001: Select a single row checkbox (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_select.spec.ts`

**Steps:**
  1. Tick the checkbox of own row
    - expect: Only that checkbox checked; header checkbox stays unchecked (not indeterminate); no dialog/menu opens

#### 7.2. TC-LT-SEL-002: Select-all header checkbox toggles all visible rows (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_select.spec.ts`

**Steps:**
  1. Tick the header checkbox then untick it (do not use any action)
    - expect: All row checkboxes become checked then unchecked together

#### 7.3. TC-LT-SEL-003: Selection is cleared on reload (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_select.spec.ts`

**Steps:**
  1. Tick own row, reload
    - expect: No row checked

#### 7.4. TC-LT-SEL-004: No bulk-action toolbar appears when rows are selected (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_select.spec.ts`

**Steps:**
  1. Tick own row, then header checkbox; inspect page buttons
    - expect: No bulk toolbar or extra buttons appear (page offers no bulk actions); no 'N selected' indicator

### 8. 8. Logs / Audit

**Seed:** `tests/seed.spec.ts`

#### 8.1. TC-LT-LOG-001: Logs opens the audit log for lottery types [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_logs.spec.ts`

**Steps:**
  1. Row menu > Logs on own record
    - expect: Audit log page for lottery types loads. ACTUAL: navigates to /dashboard/audit-log?drawId=LOTTERY_TYPE and shows 'Nothing here!' / 'The page requested does not exist.' with a 'Take me home' link (title 'Error: Not Found | Material Kit Pro'); correct page is /dashboard/audit

#### 8.2. TC-LT-LOG-002: Create and edit actions are recorded in Audit Logs [DEFECT?] (NEW) [Verified live - observation]

**File:** `tests/e2e/lottery-type/lottery_type_logs.spec.ts`

**Steps:**
  1. Create then edit own record, open System Logs > Audit Logs (/dashboard/audit)
    - expect: Entries for the lottery type create/update (Entity Type 'Lottery Type', code in details). ACTUAL: first page (newest 2026.11.20) lists only 'Lottery Draw' entries; no Lottery Type entries for same-day create/edit/delete were found - confirm with product whether lottery types are audited

#### 8.3. TC-LT-LOG-003: Browser Back from Logs returns to Lottery Type (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_logs.spec.ts`

**Steps:**
  1. Open Logs, press browser Back
    - expect: Lottery Type page loads normally with table

#### 8.4. TC-LT-LOG-004: Audit Logs page via sidebar System Logs (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_logs.spec.ts`

**Steps:**
  1. Expand System Logs, click 'Audit Logs'
    - expect: URL /dashboard/audit, title 'Logs: List | BigWin', columns Log Id, IP Address, Email, Operation Type, Details, Entity Type, Entity Long Id, Performer Type, Http Status, Logged At, View More; 'Page 1 of N'

### 9. 9. Accessibility, Persistence & Parallel Safety

**Seed:** `tests/seed.spec.ts`

#### 9.1. TC-LT-A11Y-001: Keyboard operation of the page (NEW) [Verified live - partial]

**File:** `tests/e2e/lottery-type/lottery_type_a11y.spec.ts`

**Steps:**
  1. Tab from page start
    - expect: Order reaches Add New Type, Search box, clear button, select-all, sort headers; row menu opens with Enter/Space, ArrowDown moves to next item, Escape closes and returns focus to trigger

#### 9.2. TC-LT-A11Y-002: Dialog accessibility (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_a11y.spec.ts`

**Steps:**
  1. Open Create dialog and inspect roles
    - expect: role=dialog named 'Create Lottery Type'; textboxes named 'Code *' and 'Type *'; Status select has NO accessible name (report)

#### 9.3. TC-LT-A11Y-003: Tabs All/Active/Deleted are keyboard reachable on load [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-type/lottery_type_a11y.spec.ts`

**Steps:**
  1. Press Tab from the Add New Type button across the toolbar
    - expect: Focus lands on a tab. ACTUAL: focus skips the tabs (none selected, so none focusable) and goes Add New Type > Search > clear

#### 9.4. TC-LT-PERS-001: Data visible in a new tab of the same context (NEW) [Not verifiable: new-tab session reuse via fixture not exercised]

**File:** `tests/e2e/lottery-type/lottery_type_persist.spec.ts`

**Steps:**
  1. Create record, open the page in a new tab of the same context
    - expect: Row visible (session injected by fixture)

#### 9.5. TC-LT-PAR-001: Parallel-safe unique data (NEW) [Not verifiable: framework/infra scenario, not a UI behaviour]

**File:** `tests/e2e/lottery-type/lottery_type_persist.spec.ts`

**Steps:**
  1. Generate codes with AT prefix + timestamp + random suffix; run two specs concurrently
    - expect: No code collisions; each test cleans only its own codes via cleanupLotteryTypes; no assertions on global totals

### 10. Review & Approval (maker-checker)

Verified live on 2026-11-21 with the admin account (the same account can both review and approve). Flow: Create/Edit -> Stage "Under Review" (Update dialog buttons: Review, Cancel, Update) -> Review (PUT /api/lottery/types/review/{id}, page reloads) -> "Pending Approval" (buttons: Approve, Cancel, Update) -> Approve (PUT /api/lottery/types/approve/{id}, page reloads) -> "Approved" (buttons: Cancel, Update). Editing an Approved record sends it back to "Under Review". "Ready for use" = offered in Lottery Brand > Add New Brand > "Select Lottery Type" (form opened read-only, never submitted). Only the scenario's own AT records are reviewed/approved.

#### 10.1. TC-LT-APR-001: New lottery type starts Under Review and can only be Reviewed [Verified live] Automated
**Steps:**
  1. Create a lottery type; open Edit
    - expect: table Stage "Under Review"; dialog Stage "Under Review"; "Review" shown; "Approve" not shown

#### 10.2. TC-LT-APR-002: Review moves the lottery type to Pending Approval [Verified live] Automated
**Steps:**
  1. Edit -> Review
    - expect: page reloads; Stage "Pending Approval"; dialog shows "Approve", no "Review"

#### 10.3. TC-LT-APR-003: Approve moves the lottery type to Approved [Verified live] Automated
**Steps:**
  1. Review, then Edit -> Approve; reload
    - expect: Stage "Approved" (also after reload); dialog shows neither Review nor Approve

#### 10.4. TC-LT-APR-004: Under Review lottery type is not offered for use [Verified live] Automated [DEFECT]
**Steps:**
  1. Create a lottery type (Under Review); open Lottery Brand > Add New Brand > "Select Lottery Type"
    - expect: the lottery type is NOT listed
    - actual: it is listed (the brand form requests types with approvalStatus null = all stages)

#### 10.5. TC-LT-APR-005: Reviewed but not approved lottery type is not offered for use [Verified live] Automated [DEFECT]
**Steps:**
  1. Create and Review (Pending Approval); open the brand form's "Select Lottery Type"
    - expect: NOT listed
    - actual: listed

#### 10.6. TC-LT-APR-006: Approved lottery type is offered for use [Verified live] Automated
**Steps:**
  1. Create, Review, Approve; open the brand form's "Select Lottery Type"
    - expect: listed

#### 10.7. TC-LT-APR-007: Editing an Approved lottery type sends it back to Under Review [Verified live] Automated
**Steps:**
  1. Approve a lottery type; Edit its Type; Update
    - expect: new Type saved; Stage "Under Review"; "Review" offered again

#### 10.8. TC-LT-APR-008: Changing only the Status of an Approved lottery type requires re-approval [Verified live] Automated
**Steps:**
  1. Approve a lottery type; Edit Status to DISABLED; Update
    - expect: Status "Disable"; Stage "Under Review"

#### 10.9. TC-LT-APR-009: Edited lottery type must be Reviewed and Approved again [Verified live] Automated
**Steps:**
  1. Approve, edit, Review, Approve
    - expect: Under Review -> Pending Approval -> Approved, edited values kept

#### 10.10. TC-LT-APR-010: Edited lottery type is not offered for use until re-approved [Verified live] Automated [DEFECT]
**Steps:**
  1. Approve, edit its Type; check the brand form; Review + Approve; check again
    - expect: NOT listed while Under Review; listed once re-approved
    - actual: listed while Under Review

