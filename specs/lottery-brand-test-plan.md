# Lottery Brand Test Plan (verified against live dev app)

## Application Overview

Verified test plan for Lottery > Lottery Brand in the BigWin admin portal (dev: https://e763fesnjnk.dev.accelr.net/dashboard/lottery), explored live on 2026-11-21 with the admin account. LIST page: heading 'Lottery Brands', link-wrapped 'Add New Brand' button (/dashboard/lottery/add-lottery-brand), tabs All / Under Review / Pending Approval / Approved / Deleted ('All' IS selected on load, unlike Lottery Type), 'Search...' box (Enter submits) with 'clear', a 'Status' select (All / Active / Disabled / Pending Review), table (checkbox, Code, Brand Name, Type, Status, Stage, Price, unnamed row-actions button; Code and Brand Name cells are links to /dashboard/lottery/edit-lottery-brand?lotteryId={id}), 'Page X of Y' with two icon-only arrows, 10 rows per page (62 brands, 7 pages when explored). Status labels: ACTIVE 'Active', DISABLED 'Disable'. Row menu: View, Edit, Delete (NO Logs). View and Edit both open the same page /dashboard/lottery/edit-lottery-brand?lotteryId={id} (title 'Lottery: Draw | BigWin', one tab 'View'): a read-only view with Lottery Status, Stage, Lottery Type, three Winning Description textareas, Edit Pattern, 'Lottery Brand Config' (Batch Size, Micro Batch Size, User Allocation Size, Micro Batch Refill Trigger, 'Allow same characters in a different order' checkbox), buttons Review (Under Review) / Approve (Pending Approval) / none (Approved) plus 'Update', and an 'Operation logs' table. Clicking 'Update' switches the SAME page into edit mode (Lottery Code, Lottery Name, Status select, three optional descriptions, Upload Front Image / Logo / Back Image, config, buttons Cancel and 'Save Changes'). ADD is a 4-step wizard 'Add New Brand': Step 1 Details (Select Lottery Type *, Code *, Name *, Price per ticket *, Winning Description in Sinhala/English/Tamil all '(Optional)', button Next, no Cancel), Step 2 Symbol Pack (Symbol Pack 'Add Multiple Options' + Add, Symbol Groups select, Back/Next), Step 3 Upload (Upload Image, Upload Logo, Upload Lottery back Image; Back / 'Add Brand'), Step 4 Config (defaults 10000 / 500 / 5000 / 3000, checkbox 'Continue without editing brand config', then 'Finish' returns to the list). THE BRAND IS CREATED when 'Add Brand' (step 3) is clicked, not at Finish. API: list POST /api/lottery {filters:[], page, query, rowsPerPage:10, sortBy, sortDir, view: all|underReview|pendingApproval|approved|deleted, status?, approvalStatus:null} returning {data, count, totalPages}; create POST /api/lottery/create (201 {status:'success', results:<id>}); edit PUT /api/lottery/{id} plus PUT ticket-service .../lottery-brand-config/brand/{id}; review PUT /api/lottery/review/{id}; delete DELETE /api/lottery/delete/{id}; draw brand list POST /api/lottery/brands/simple {approvalStatus:'APPROVED', status:'ACTIVE'}; lottery type list for the brand form POST /api/lottery/types {approvalStatus:null}. Unlike Lottery Type, the Brand list API honours search, sort, tab and pagination. Conventions: every scenario starts fresh via authenticatedPage, creates its own ATPLAN-prefixed brand (code ATPLAN + digits, name 'ATPLAN Brand ...') using an existing APPROVED lottery type ('Passive') which is never edited, and deletes it at the end (soft delete - see section 4); shared dev DB so never assert on global totals/first row/whole-table order; run with --workers=1; click Review/Approve ONLY on the scenario's own ATPLAN brands (section 7); never submit the Lottery Draws form, never click Send Code to Mobile or Log out. Tags: [Verified live] = confirmed on the live app; [Not verifiable: reason] = could not be confirmed; [DEFECT] = scenario states the CORRECT expected behaviour which the current app fails (must stay failing, no fixme/skip), the one-line 'ACTUAL' says what really happens; NEW = not automated yet (all brand scenarios). NEW DEFECTS: (a) edit with duplicate Code or Name returns HTTP 400 and the page crashes to 'Application error: a client-side exception has occurred' (React error #31, object rendered); (b) Price 0 is accepted on create; (c) 256-char Name on create is not blocked client-side and fails with the generic 'An error occurred while processing your request. Please try again later.'; (d) whitespace-only Name is rejected on create but SAVED on edit; (e) edit length message says 'name must be at most 255 characters'; (f) going Back in the wizard clears 'Select Lottery Type' (Next then fails with native 'Please fill out this field.'); (g) Lottery Type dropdown offers unapproved types (Under Review types 'Passivefdfdfdfd', 'Test Type 001'); (h) Operation logs panel on a brand page shows entries of OTHER brands (Entity Long Id 35, 69, 65); (i) create/update/delete of a brand are not audited (only review/approve are); (j) default list order is oldest first although the request says sortDir desc; (k) sort by Status and Stage does not change the order; (l) opening edit-lottery-brand?lotteryId=99999 shows an empty form, no 'not found' message; (m) 'No image file selected' toasts appear (x3) while the brand is created anyway; (n) status filter option 'Pending Review' matches nothing; (o) '%' typed in search matches every brand and leading/trailing spaces make a valid code find nothing; (p) 'Lottery brand created succussfully' typo.

## Test Scenarios

### 1. 1. Navigation & Display

**Seed:** `tests/seed.spec.ts`

#### 1.1. TC-LB-NAV-001: Navigate to Lottery Brand from the sidebar (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Expand sidebar 'Lottery' and click link 'Lottery Brand'
    - expect: URL ends with /dashboard/lottery
    - expect: Page title 'Lottery: List | BigWin'
    - expect: Heading 'Lottery Brands' visible

#### 1.2. TC-LB-NAV-002: Table shows Code, Brand Name, Type, Status, Stage and Price columns (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Inspect the table header
    - expect: Sortable column buttons Code, Brand Name, Type, Status, Stage, Price, plus a select-all checkbox column and an unnamed actions column

#### 1.3. TC-LB-NAV-003: Page shows Add New Brand, search, Status filter, five tabs and page info (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Open Lottery Brand
    - expect: 'Add New Brand' button (inside a link to /dashboard/lottery/add-lottery-brand)
    - expect: 'Search...' textbox with 'clear' button
    - expect: Tabs All, Under Review, Pending Approval, Approved, Deleted with 'All' aria-selected=true
    - expect: 'Status' select showing 'All'
    - expect: 'Page X of Y' with Previous disabled on page 1

#### 1.4. TC-LB-NAV-004: Row actions menu offers View, Edit and Delete only (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Create own brand, search its code, click its unnamed row-actions button
    - expect: role=menu with menuitems exactly View, Edit, Delete (no Logs item)

#### 1.5. TC-LB-NAV-005: Row menu closes with Escape (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Open the row menu, press Escape
    - expect: Menu closes; focus returns to a button; record unchanged

#### 1.6. TC-LB-NAV-006: Code and Brand Name cells link to the brand page (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Click the own brand's Code link
    - expect: Navigates to /dashboard/lottery/edit-lottery-brand?lotteryId={id}; heading '<code> | <name>'
  2. Click Back (page button) / browser Back
    - expect: Returns to the Lottery Brands list with the table

#### 1.7. TC-LB-NAV-007: View and Edit menu items open the same brand page (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Row menu > View, then go back and row menu > Edit
    - expect: Both open /dashboard/lottery/edit-lottery-brand?lotteryId={id}; one tab 'View'; read-only fields plus buttons Review (Under Review) and Update. Editing only starts after clicking 'Update' (see section 3)

#### 1.8. TC-LB-NAV-008: Status and Stage labels for a new brand (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Create own brand and read its row
    - expect: Type 'Passive', Status 'Active', Stage 'Under Review', Price as entered (e.g. 25)

#### 1.9. TC-LB-NAV-009: Opening a brand id that does not exist [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_nav.spec.ts`

**Steps:**
  1. Browse to /dashboard/lottery/edit-lottery-brand?lotteryId=99999
    - expect: A clear 'not found' message or redirect to the list. ACTUAL: an empty form (no heading, empty fields, config inputs blank) with 4 console errors and no message

### 2. 2. Create (Add New Brand wizard)

**Seed:** `tests/seed.spec.ts`

#### 2.1. TC-LB-CR-001: Add New Brand opens Step 1 Details (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Click 'Add New Brand'
    - expect: URL /dashboard/lottery/add-lottery-brand, title 'Lottery Brand | BigWin', heading 'Add New Brand'
    - expect: Stepper: Step 1 Details, Step 2 Symbol Pack, Step 3 Upload, Step 4 Config
    - expect: Fields 'Select Lottery Type *', 'Code *', 'Name *', 'Price per ticket *' (default 0), 'Winning Description In Sinhala/English/Tamil (Optional)'; button Next disabled; no Cancel button

#### 2.2. TC-LB-CR-002: Select Lottery Type lists only APPROVED lottery types [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Open the 'Select Lottery Type' dropdown
    - expect: Only Approved types (Passive, Scratch). ACTUAL: also lists the Under Review types 'Passivefdfdfdfd' and 'Test Type 001' (request POST /api/lottery/types sends approvalStatus null)

#### 2.3. TC-LB-CR-003: Next stays disabled until required fields are valid (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Leave the form untouched, then fill type, code, name and change Price to a valid value
    - expect: Next disabled while the form is untouched/invalid; enabled once valid. NOTE: leaving Price at its default 0 and filling it with '0' keeps Next disabled until the price field is changed

#### 2.4. TC-LB-CR-004: Clearing Code shows 'Code is required' (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Type then clear Code and tab away
    - expect: 'Code is required' shown; Next disabled

#### 2.5. TC-LB-CR-005: Clearing Name shows 'Name is required' (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Type then clear Name and tab away
    - expect: 'Name is required' shown; Next disabled

#### 2.6. TC-LB-CR-006: Code or Name made only of spaces is rejected (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Enter '   ' in Code, then '   ' in Name
    - expect: 'Code is required' / 'Name is required' shown and Next disabled (create validation trims; contrast ED-008)

#### 2.7. TC-LB-CR-007: Price of 0 is rejected (price must be positive) [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Fill a valid brand with Price per ticket 0 and complete Next, Next, Add Brand
    - expect: Validation error such as 'Price must be greater than 0'; no brand created. ACTUAL: Next is enabled, POST /api/lottery/create returns 201 and the row shows Price 0

#### 2.8. TC-LB-CR-008: Negative price is rejected (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Enter -5 in Price per ticket and tab away
    - expect: Message 'Price cannot be negative'; Next disabled

#### 2.9. TC-LB-CR-009: Empty price shows 'Price must be a number' (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Clear Price per ticket and tab away
    - expect: Message 'Price must be a number'; Next disabled

#### 2.10. TC-LB-CR-010: Decimal price is accepted and shown (NEW) [Verified live; 10.999 (3 decimals) Not verifiable: only 12.5 was submitted - whether 3 decimals are rounded is unknown]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Create a brand with Price 12.5
    - expect: POST body pricePerTicket '12.5'; row Price shows 12.5
  2. Enter 10.999 (not submitted)
    - expect: Next is enabled (no client-side decimal limit)

#### 2.11. TC-LB-CR-011: Very large or exponent price (100000000000, 1e3) (NEW) [Not verifiable: Next accepts both client-side but submitting would put an absurd price on a shared record]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Enter 100000000000 and 1e3 in Price
    - expect: Expected an upper limit message or a sane error; app currently enables Next for both

#### 2.12. TC-LB-CR-012: Price field accepts digits only (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Focus Price per ticket and type letters 'abc'
    - expect: Input (type=number) stays empty

#### 2.13. TC-LB-CR-013: Create a brand end to end (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Select 'Passive', Code ATPLAN<digits>, Name 'ATPLAN Brand ...', Price 25; Next, Next (Symbol Pack skipped), 'Add Brand'
    - expect: POST /api/lottery/create returns 201 {status:'success', results:<id>}; toast 'Lottery brand created succussfully'; wizard moves to Step 4 Config
  2. Tick 'Continue without editing brand config', click Finish
    - expect: Returns to /dashboard/lottery; searching the code shows the row: type Passive, Active, Under Review, 25. Config defaults 10000/500/5000/3000 are applied

#### 2.14. TC-LB-CR-014: Missing images do not block creation but show 'No image file selected' toasts [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Click 'Add Brand' on Step 3 without choosing image, logo or back image
    - expect: Either images are required and creation is blocked, or no error toasts are shown. ACTUAL: three 'No image file selected' toasts appear AND the brand is created with imageUrl/logoUrl/backImageUrl empty (broken images on the brand page)

#### 2.15. TC-LB-CR-015: Duplicate Code is rejected case-insensitively (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Create ATPLAN<n>; start again with the same code in lower case and a different name; go to Add Brand
    - expect: POST returns 400 {'error':'A lottery brand with this code already exists.'}; toast with that text; wizard stays on Step 3 Upload; only one row for the code

#### 2.16. TC-LB-CR-016: Duplicate Name is rejected (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Create a brand, start again with a new code but the same Name
    - expect: POST returns 400 'A lottery brand with this name already exists.'; toast with that text; nothing created

#### 2.17. TC-LB-CR-017: Name of exactly 255 characters is accepted (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Create with Name 'ATPLAN Brand ' + 242 characters (255 total)
    - expect: 201; row shows the full name

#### 2.18. TC-LB-CR-018: Name longer than 255 characters is blocked with a clear message [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Enter 256 characters in Name and click through to Add Brand
    - expect: Inline message such as 'Name must be at most 255 characters' at Step 1 and Next disabled (edit page already blocks this). ACTUAL: no inline message, Next enabled, POST returns 400 with the generic toast 'An error occurred while processing your request. Please try again later.'

#### 2.19. TC-LB-CR-019: Code longer than 255 characters is blocked (NEW) [Not verifiable: 256-char code not submitted; at Step 1 no inline message appears and Next stays enabled for 256 characters]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Enter 256 characters in Code
    - expect: Expected inline length message and Next disabled; ACTUAL at step 1: no message, Next enabled (server result unknown)

#### 2.20. TC-LB-CR-020: Sinhala and Tamil descriptions are stored (NEW) [Verified live: request body carried the text; reopening the saved text on the view page not re-checked]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Enter Sinhala 'සිංහල ජයග්‍රහණ' and Tamil 'தமிழ் வெற்றி <b>x</b>' descriptions, create
    - expect: Body winningDescriptionSinhala/Tamil carry the exact text; brand view shows them exactly; HTML shown literally; no alert

#### 2.21. TC-LB-CR-021: Special characters and HTML in Name are shown as plain text (NEW) [Verified live via edit]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Use Name 'ATPLAN <b>x</b><img src=x onerror=alert(1)> & "q"'
    - expect: Row and heading show the literal text; no <b>/<img> elements; no browser alert

#### 2.22. TC-LB-CR-022: Back in the wizard keeps the entered values [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Complete Step 1, go to Step 3, click Back twice
    - expect: Code, Name, Price, descriptions AND Lottery Type are still filled. ACTUAL: type is cleared; clicking Next gives the native message 'Please fill out this field.' on Select Lottery Type

#### 2.23. TC-LB-CR-023: Step 2 Symbol Pack is optional (NEW) [Verified live: skipped; adding symbol options not exercised]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. On Step 2 ('Add Multiple Options' + disabled Add, 'Select Symbol Groups') click Next without choosing anything
    - expect: Moves to Step 3; request carries symbolGroupIds []

#### 2.24. TC-LB-CR-024: Brand is created before Step 4 (leaving the wizard early still leaves a brand) (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Click Add Brand on Step 3, then navigate to the list instead of finishing Step 4
    - expect: The brand exists (Under Review) with default config; there is no Cancel/discard on any step

#### 2.25. TC-LB-CR-025: Double-click Add Brand creates only one brand (NEW) [Not verifiable: not exercised to avoid duplicate junk brands]

**File:** `tests/e2e/lottery-brand/lottery_brand_create.spec.ts`

**Steps:**
  1. Double-click 'Add Brand'
    - expect: Exactly one POST and one row (a second would be rejected as duplicate code)

### 3. 3. Edit

**Seed:** `tests/seed.spec.ts`

#### 3.1. TC-LB-ED-001: Brand page shows the read-only view (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Row menu > Edit on own brand
    - expect: Heading '<code> | <name>'; Lottery Status 'Active', Stage 'Under Review', Lottery Type 'Passive'; descriptions; Edit Pattern; Lottery Brand Config 10000/5000/500/3000; buttons Review and Update; Operation logs table

#### 3.2. TC-LB-ED-002: Update switches the page to edit mode (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Click 'Update'
    - expect: Fields 'Lottery Code *', 'Lottery Name *', Status select (ACTIVE...), three optional descriptions, Upload Front Image / Logo / Back Image, config; buttons Cancel and 'Save Changes'

#### 3.3. TC-LB-ED-003: Edit mode is pre-filled with saved values (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Click Update on a brand with saved values
    - expect: Code, Name, Status, descriptions and config show the saved values

#### 3.4. TC-LB-ED-004: Lottery Type and Price can be corrected after creation [DEFECT?] (NEW) [Verified live - observation]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Click Update and look for Lottery Type and Price per ticket
    - expect: Product to confirm. OBSERVED: edit mode has no Lottery Type and no Price field (the PUT body just re-sends lotteryTypeId and pricePerTicket); a wrong price can only be fixed by delete and recreate

#### 3.5. TC-LB-ED-005: Save Name and Description changes (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Update, change Name and English description, click Save Changes
    - expect: PUT /api/lottery/{id} and PUT .../lottery-brand-config/brand/{id} sent; toasts 'Lottery brand updated successfully' and 'Lottery Brand updated'; heading shows the new name; reload keeps the values

#### 3.6. TC-LB-ED-006: Cancel discards the changes (NEW) [Verified live: edit mode closes; discard of typed values not re-read]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Update, change Name, click Cancel
    - expect: Returns to the view mode; name unchanged; no request sent

#### 3.7. TC-LB-ED-007: Clearing Code or Name shows a required message and does not save (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Clear Name, click Save Changes (repeat for Code)
    - expect: 'Name is required' / 'Code is required'; no PUT sent; edit mode stays open. NOTE Save Changes stays enabled while the form is invalid

#### 3.8. TC-LB-ED-008: Name made only of spaces is rejected on edit [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Update, set Name '   ', Save Changes
    - expect: 'Name is required', nothing saved (create already rejects this). ACTUAL: no message; PUT returns 200 {status:'success'} and the heading becomes '<code> |' with a blank name

#### 3.9. TC-LB-ED-009: Name longer than 255 characters is blocked with a message naming Name [DEFECT - wrong field label] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Enter 256 characters in Lottery Name and click Save Changes
    - expect: Blocked, no PUT; message 'Name must be at most 255 characters'. ACTUAL: blocked but the message reads 'name must be at most 255 characters'

#### 3.10. TC-LB-ED-010: Changing Code to an existing Code shows an error [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Create brands A and B; edit B's Code to A's, Save Changes
    - expect: Toast 'A lottery brand with this code already exists.', edit mode stays, both brands unchanged. ACTUAL: PUT returns 400 {'error':{'status':'error','results':'A lottery brand with this code already exists.'}} and the whole page crashes to 'Application error: a client-side exception has occurred' (React error #31 - the error object is rendered); reload needed

#### 3.11. TC-LB-ED-011: Changing Name to an existing Name shows an error [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Edit B's Name to A's, Save Changes
    - expect: Toast 'A lottery brand with this name already exists.'. ACTUAL: 400 and the same 'Application error: a client-side exception has occurred' crash

#### 3.12. TC-LB-ED-012: HTML in Name is stored and shown as plain text (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Save Name 'ATPLAN <b>x</b><img src=x onerror=alert(1)> & "q"'
    - expect: Heading and list show the literal text; no <img>/<b> elements; no alert

#### 3.13. TC-LB-ED-013: Status can be changed to DISABLED and back (NEW) [Not verifiable: Status select not exercised to avoid extra approval cycles]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Update, set Status DISABLED, Save Changes
    - expect: Row Status 'Disable'; Stage returns to Under Review (see APR-008)

#### 3.14. TC-LB-ED-014: Edit persists after reload (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Save a new Name and description, reload the page
    - expect: Heading, list row and (after Update) the fields show the saved values

#### 3.15. TC-LB-ED-015: Edit Code is allowed and the list shows the new Code (NEW) [Not verifiable: only rejected duplicate codes were tried]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Change Code to a new unique ATPLAN code, Save Changes
    - expect: Row appears under the new code; old code no longer listed

#### 3.16. TC-LB-ED-016: Back button returns to the list (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_edit.spec.ts`

**Steps:**
  1. Click 'Back' at the top of the brand page
    - expect: Lottery Brands list renders

### 4. 4. Delete

**Seed:** `tests/seed.spec.ts`

#### 4.1. TC-LB-DEL-001: Delete from the row menu has no confirmation (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_delete.spec.ts`

**Steps:**
  1. Search own code, row menu > Delete
    - expect: No confirmation dialog; DELETE /api/lottery/delete/{id} sent; page reloads; the row is gone from All; no visible toast. If product wants a confirmation this is a design gap

#### 4.2. TC-LB-DEL-002: Delete is a soft delete and the brand appears in the Deleted tab (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_delete.spec.ts`

**Steps:**
  1. Delete own brand, open the 'Deleted' tab (view=deleted)
    - expect: Row listed with its old Status/Stage; it is no longer in All. NOTE cleanup cannot hard-delete: ATPLAN brands stay in the Deleted tab forever

#### 4.3. TC-LB-DEL-003: Deleted rows are read-only (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_delete.spec.ts`

**Steps:**
  1. Open the Deleted tab and inspect a row
    - expect: No row-actions button and no Code/Name links (no Restore, no View)

#### 4.4. TC-LB-DEL-004: Deleted record stays deleted after reload (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_delete.spec.ts`

**Steps:**
  1. Delete then reload and search the code
    - expect: Zero rows in All

#### 4.5. TC-LB-DEL-005: A deleted Code or Name can be reused (NEW) [Not verifiable: not exercised to avoid creating more junk records]

**File:** `tests/e2e/lottery-brand/lottery_brand_delete.spec.ts`

**Steps:**
  1. Delete then recreate with the same Code and Name
    - expect: Product decision needed: either creation succeeds or the duplicate message is shown; record the actual behaviour

#### 4.6. TC-LB-DEL-006: Deleting an Approved brand (NEW) [Not verifiable: only Under Review brands were deleted; an approved ATPLAN brand was left approved only briefly]

**File:** `tests/e2e/lottery-brand/lottery_brand_delete.spec.ts`

**Steps:**
  1. Approve own brand, then delete it
    - expect: Removed from All and from the Create Draw brand dropdown

#### 4.7. TC-LB-DEL-007: Deleting a brand that is used by a draw is blocked or warned (NEW) [Not verifiable: requires creating a draw, which is forbidden]

**File:** `tests/e2e/lottery-brand/lottery_brand_delete.spec.ts`

**Steps:**
  1. Delete a brand referenced by a draw
    - expect: Warning or block

#### 4.8. TC-LB-DEL-008: Delete a brand already deleted in another session (NEW) [Not verifiable: two-session stale delete not exercised]

**File:** `tests/e2e/lottery-brand/lottery_brand_delete.spec.ts`

**Steps:**
  1. Open two pages, delete in page 1, delete the same row in stale page 2
    - expect: Clear 'not found' toast, no crash

### 5. 5. Search

**Seed:** `tests/seed.spec.ts`

#### 5.1. TC-LB-SRCH-001: Search by Code (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Type own code in 'Search...' and press Enter
    - expect: Exactly one row; 'Page 1 of 1'. The server honours the query (unlike Lottery Type)

#### 5.2. TC-LB-SRCH-002: Search by Brand Name, partially (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search 'Brand One' or 'ATPLAN'
    - expect: Own row listed, unrelated seeded brands excluded

#### 5.3. TC-LB-SRCH-003: Search is case-insensitive (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search the lowercase code
    - expect: Row found

#### 5.4. TC-LB-SRCH-004: Search matches the Type name and the Price (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search 'Passive', then '40'
    - expect: Rows whose Type is Passive (5 pages), then rows with Price 40 (5 pages). NOTE searching the Stage text 'Approved' returns 0 rows - Stage and Status are not searchable

#### 5.5. TC-LB-SRCH-005: No match shows no rows (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search 'zzznomatch', Enter
    - expect: Zero data rows (no empty-state text was observed - product to confirm one is wanted)

#### 5.6. TC-LB-SRCH-006: Clearing the search lists everything again (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search then click 'clear' (or empty the box and press Enter)
    - expect: Box emptied; full list back, 'Page 1 of N' as before

#### 5.7. TC-LB-SRCH-007: Search term is not kept after reload (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search a term and reload
    - expect: Box empty and full list

#### 5.8. TC-LB-SRCH-008: Search applies inside the Deleted tab (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Delete own brand, open Deleted, search the code
    - expect: Only own row listed

#### 5.9. TC-LB-SRCH-009: '%' is treated as a literal character [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search '%'
    - expect: No rows (no brand code or name contains %). ACTUAL: every brand is returned ('Page 1 of 7') - the SQL wildcard is not escaped

#### 5.10. TC-LB-SRCH-010: Leading/trailing spaces are trimmed [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search '  ATPLAN001  ' (own code with surrounding spaces)
    - expect: Own row found. ACTUAL: zero rows (not trimmed)

#### 5.11. TC-LB-SRCH-011: Whitespace-only search behaves like an empty search (NEW) [DEFECT?] [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search '   '
    - expect: Full list like an empty search (trimmed). ACTUAL: zero rows

#### 5.12. TC-LB-SRCH-012: Special characters and HTML do not break search (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Search '<script>' and a single quote
    - expect: No error, no script execution; zero rows

#### 5.13. TC-LB-SRCH-013: Search resets pagination to page 1 (NEW) [Not verifiable: search was only run from page 1]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Go to page 2, then search
    - expect: Request page 0; 'Page 1 of N'

#### 5.14. TC-LB-SRCH-014: Search is only sent on Enter (NEW) [Not verifiable: typing-without-Enter timing was not measured]

**File:** `tests/e2e/lottery-brand/lottery_brand_search.spec.ts`

**Steps:**
  1. Type a term and wait 1.5s without Enter
    - expect: No list request until Enter

### 6. 6. Table (sort, tabs, status filter, pagination)

**Seed:** `tests/seed.spec.ts`

#### 6.1. TC-LB-TBL-001: Default order is newest first [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Create own brand and load the list (request sortBy createdAt, sortDir desc); go to the last page
    - expect: Newest brand on page 1. ACTUAL: oldest first (SAGAS, DHAN, JATH...) and the new brand appears at the very bottom of the last page

#### 6.2. TC-LB-TBL-002: Sort by Code in both directions (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Click 'Code' twice
    - expect: Requests sortBy brandCode asc then desc; page 1 codes ascending (123098, 1234, 20260211...) then descending (TW123, TRIEIGHT...) across ALL pages (server-side)

#### 6.3. TC-LB-TBL-003: Sort by Brand Name, Type and Price (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Click each header twice
    - expect: brandName asc: '20260211 Test Brand', 'Ada Sampatha'...; desc: 'Triple 8 Jackpot'...; Type asc all Passive / desc all Scratch; Price asc 1,1,1,1,1,5,25... / desc 500,50,50...

#### 6.4. TC-LB-TBL-004: Sort by Status [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Click 'Status' twice (8 DISABLED brands exist)
    - expect: Descending shows 'Disable' rows first. ACTUAL: request sends brandStatus asc/desc but page 1 shows only 'Active' in both directions

#### 6.5. TC-LB-TBL-005: Sort by Stage [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Click 'Stage' twice
    - expect: Rows ordered by stage and reversed on second click. ACTUAL: brandStage asc and desc return the identical row order (Approved x3, Under Review, Approved ...)

#### 6.6. TC-LB-TBL-006: Repeated header clicks toggle asc/desc (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Click 'Code' three times, then another header
    - expect: asc, desc, asc; a different header starts again at asc

#### 6.7. TC-LB-TBL-007: Tabs filter by stage (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Click Under Review, Pending Approval, Approved, Deleted, All
    - expect: Requests view underReview / pendingApproval / approved / deleted / all; clicked tab aria-selected=true; Under Review shows only 'Under Review' rows (2 pages), Pending Approval 0 rows, Approved only 'Approved' (5 pages), Deleted 7+ soft-deleted rows, All mixed; own Under Review brand appears under Under Review only

#### 6.8. TC-LB-TBL-008: Status filter options and effect (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Open the Status select
    - expect: Options All, Active, Disabled, Pending Review. Active -> request status ACTIVE, 6 pages of 'Active'; Disabled -> status DISABLED, 8 rows showing 'Disable'

#### 6.9. TC-LB-TBL-009: Status filter option 'Pending Review' is meaningful [DEFECT?] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Choose 'Pending Review'
    - expect: Lists brands waiting for review/approval (or the option does not exist; stage lives in the tabs). ACTUAL: request status PENDING_REVIEW returns 0 rows, an orphan option

#### 6.10. TC-LB-TBL-010: Pagination next/previous (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Read 'Page 1 of 7', click Next up to page 7, then Previous
    - expect: 10 distinct rows per page, 3 on the last page; Previous disabled on page 1, Next disabled on page 7; indicator and request page param update; Previous returns to the prior page. Assert on own tagged data, not on global totals (parallel-safe)

#### 6.11. TC-LB-TBL-011: Tab, Status filter and search combine (NEW) [Not verifiable: only search+Deleted tab was combined]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Select Approved tab, Status Active, search 'Dhana'
    - expect: Only approved, active brands matching Dhana

#### 6.12. TC-LB-TBL-012: Row selection checkboxes (NEW) [Not verifiable: checkboxes not exercised on the brand list; Lottery Type showed no bulk actions]

**File:** `tests/e2e/lottery-brand/lottery_brand_table.spec.ts`

**Steps:**
  1. Tick a row and the header checkbox
    - expect: Only checkboxes change, no bulk toolbar

### 7. 7. Review & Approval (maker-checker)

**Seed:** `tests/seed.spec.ts`

#### 7.1. TC-LB-APR-001: New brand starts Under Review and can only be Reviewed (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Create own brand; open its page (row menu > Edit)
    - expect: List Stage 'Under Review'; page Stage field 'Under Review'; buttons 'Review' and 'Update'; no 'Approve'

#### 7.2. TC-LB-APR-002: Review moves the brand to Pending Approval (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Click 'Review' on own brand
    - expect: PUT /api/lottery/review/{id} 200; page stays on the same URL and Stage becomes 'Pending Approval'; buttons now 'Approve' and 'Update'; the brand is listed under the 'Pending Approval' tab and no longer under 'Under Review'

#### 7.3. TC-LB-APR-003: Approve moves the brand to Approved (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Click 'Approve' on own Pending Approval brand
    - expect: Stage 'Approved' (also after reload); only 'Update' remains (neither Review nor Approve); listed under the 'Approved' tab

#### 7.4. TC-LB-APR-004: Review and Approve confirm with a success toast (NEW) [Not verifiable: no toast was captured after clicking Review or Approve (polled every 150 ms); the app code has 'Lottery brand reviewed successfuly'. Audit message is 'Lottery brand reviewed successfully.' / 'Lottery brand approved successfully.']

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Click Review, then Approve, polling getByRole('status', { includeHidden: true })
    - expect: A success toast per action (record the exact text). Observed: none

#### 7.5. TC-LB-APR-005: Editing an Approved brand sends it back to Under Review (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Approve own brand, Update, change the English description (and Name), Save Changes
    - expect: PUT body still carries approvalStatus 'APPROVED' but after saving the page shows Stage 'Under Review' and button 'Review' again; list Stage 'Under Review'; brand moves from the Approved tab to Under Review

#### 7.6. TC-LB-APR-006: Changing only the Status of an Approved brand requires re-approval (NEW) [Not verifiable: Status change not exercised]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Approve, Update, Status DISABLED, Save Changes
    - expect: Status 'Disable'; Stage 'Under Review'

#### 7.7. TC-LB-APR-007: Edited brand must be Reviewed and Approved again (NEW) [Verified live up to Under Review; second Review/Approve cycle Not verifiable: not repeated to keep approved time minimal, mechanism identical to APR-002/003]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Approve, edit, Review, Approve
    - expect: Under Review -> Pending Approval -> Approved, edited values kept

#### 7.8. TC-LB-APR-008: Stage field is read-only (NEW) [Verified live: shown as a plain text field in view; no stage input in edit mode]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Open the brand page and click Update
    - expect: Stage cannot be edited; only Review/Approve buttons move it

#### 7.9. TC-LB-APR-009: Review and Approve are written to the audit log (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Review and Approve own brand; read the top rows of 'Operation logs'
    - expect: Two Update rows: 'Lottery brand reviewed successfully.' then 'Lottery brand approved successfully.', Entity Type 'Lottery Brand', Entity Long Id = brand id, Performer Type 'Admin User', Http Status 'Ok'

#### 7.10. TC-LB-APR-010: The same admin can review and approve own brand (maker-checker separation) (NEW) [DEFECT?] [Verified live - observation]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. As the single admin, Review then Approve the same brand
    - expect: Product to confirm. OBSERVED: allowed (no 4-eyes rule); roles include ADMIN and APPROVER

#### 7.11. TC-LB-APR-011: Review/Approve are not offered on Deleted brands (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. Delete an Under Review brand and look at the Deleted tab
    - expect: No actions at all on the row

#### 7.12. TC-LB-APR-012: Brand with an Under Review Lottery Type (NEW) [DEFECT] [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_approval.spec.ts`

**Steps:**
  1. See CR-002: select an Under Review lottery type for a brand
    - expect: Not possible. ACTUAL: a brand can be created against an unapproved type

### 8. 8. Ready for use (Create Draw consumes brands)

**Seed:** `tests/seed.spec.ts`

#### 8.1. TC-LB-USE-001: Create Draw brand dropdown only requests APPROVED + ACTIVE brands (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Sidebar Lottery Draws > Draws > Create Draw (/dashboard/draw/create-draw) (read-only; NEVER click Next/submit); open 'Lottery Brand'
    - expect: Request POST /api/lottery/brands/simple with body {approvalStatus:'APPROVED', status:'ACTIVE'}; dropdown lists brand NAMES only (41 options)

#### 8.2. TC-LB-USE-002: Under Review brand is not offered (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Create own brand (Under Review), open the Create Draw brand dropdown
    - expect: Own brand NOT listed. VERIFIED on the edited-and-returned-to-Under-Review brand (41 options, no ATPLAN)

#### 8.3. TC-LB-USE-003: Pending Approval brand is not offered (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Review own brand, open the Create Draw dropdown
    - expect: Own brand NOT listed (41 options)

#### 8.4. TC-LB-USE-004: Approved brand is offered (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Approve own brand, reload Create Draw, open the dropdown
    - expect: Own brand name listed (42 options). Do not select or submit

#### 8.5. TC-LB-USE-005: Edited Approved brand is not offered until re-approved (NEW) [Verified live not-offered; re-approval offering Not verifiable: second approval not performed]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Edit the approved brand, check the dropdown; Review + Approve, check again
    - expect: NOT listed while Under Review/Pending Approval (verified); listed once re-approved

#### 8.6. TC-LB-USE-006: DISABLED brand is not offered (NEW) [Not verifiable: DISABLED status not exercised; request filters status ACTIVE]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Set an approved brand to DISABLED and re-approve
    - expect: Not listed

#### 8.7. TC-LB-USE-007: Deleted brand is not offered (NEW) [Not verifiable: delete of an approved brand not combined with the dropdown check]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Approve, delete, open the dropdown
    - expect: Not listed

#### 8.8. TC-LB-USE-008: Brand whose Lottery Type is later edited, disabled or deleted (NEW) [Not verifiable: would require changing a lottery type; the shared approved type 'Passive' must not be edited]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Using an ATPLAN-owned lottery type, approve a brand on it, then edit/disable/delete the type
    - expect: Product decision: brand should be flagged/blocked or follow the type; record actual

#### 8.9. TC-LB-USE-009: Lottery type shown in the list matches the brand's type (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_use.spec.ts`

**Steps:**
  1. Create a brand with type Passive and read the row
    - expect: Type column 'Passive' (API lotteryType code PASS)

### 9. 9. Logs / Audit

**Seed:** `tests/seed.spec.ts`

#### 9.1. TC-LB-LOG-001: Brand page shows an 'Operation logs' table (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_logs.spec.ts`

**Steps:**
  1. Open own brand page and scroll to 'Operation logs'
    - expect: Quick toggles (Log Id, IP Address, Email, NIC, Operation Type, Details, Entity Type, Entity Long Id, Entity UUID Id, Performer Type, Performer User Id, Http Status, Logged At, View More); columns Log Id, IP Address, Email, Operation Type, Details, Entity Type, Entity Long Id, Performer Type, Http Status, Logged At, View More; 'Page 1 of 7'. The row menu has no 'Logs' item

#### 9.2. TC-LB-LOG-002: Operation logs are limited to the brand being viewed [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_logs.spec.ts`

**Steps:**
  1. Open a brand page (new ATPLAN brand, and an old brand)
    - expect: Only entries whose Entity Long Id equals this brand's id. ACTUAL: every Lottery Brand entry is shown (e.g. Entity Long Id 35, 69, 65 on the page of brand 70/2); the same list appears on every brand

#### 9.3. TC-LB-LOG-003: Review and Approve produce audit entries (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_logs.spec.ts`

**Steps:**
  1. Review and Approve own brand; reload; read the top rows
    - expect: 'Lottery brand reviewed successfully.' and 'Lottery brand approved successfully.' for Entity Long Id = own id

#### 9.4. TC-LB-LOG-004: Create, update and delete are audited [DEFECT?] (NEW) [Verified live - observation]

**File:** `tests/e2e/lottery-brand/lottery_brand_logs.spec.ts`

**Steps:**
  1. Create, edit (Save Changes) and delete own brand; read Operation logs / Audit Logs (/dashboard/audit)
    - expect: Entries for create, update and delete. ACTUAL: after create + edit only the two review/approve entries (ids 3399, 3400) exist; product to confirm whether create/update/delete should be audited

#### 9.5. TC-LB-LOG-005: Brand config changes are audited (NEW) [Not verifiable: config values were not changed; page text says 'Every change is recorded in the audit log']

**File:** `tests/e2e/lottery-brand/lottery_brand_logs.spec.ts`

**Steps:**
  1. Change Lottery Batch Size on own brand
    - expect: Audit entry exists

### 10. 10. Accessibility, Security & Parallel Safety

**Seed:** `tests/seed.spec.ts`

#### 10.1. TC-LB-A11Y-001: Keyboard order on the list page (NEW) [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_a11y.spec.ts`

**Steps:**
  1. Focus 'Add New Brand' and Tab repeatedly
    - expect: Order: Add New Brand, the selected tab 'All' (roving tabindex - one tab stop), Search box, clear, Status select, scrollable table region, select-all, sort headers Code, Brand Name, Type, Status, Stage, Price. Tabs ARE reachable here (unlike Lottery Type)

#### 10.2. TC-LB-A11Y-002: 'Add New Brand' is a button nested inside a link (NEW) [DEFECT?] [Verified live]

**File:** `tests/e2e/lottery-brand/lottery_brand_a11y.spec.ts`

**Steps:**
  1. Inspect the DOM / accessibility tree
    - expect: A single interactive element. ACTUAL: <a href=/dashboard/lottery/add-lottery-brand><button>Add New Brand</button></a> (invalid nesting; link and button both in the tab order in the snapshot)

#### 10.3. TC-LB-A11Y-003: Wizard keyboard use (NEW) [Not verifiable: Tab/Enter flow through the four steps not exercised]

**File:** `tests/e2e/lottery-brand/lottery_brand_a11y.spec.ts`

**Steps:**
  1. Fill Step 1 with the keyboard and press Enter in Name
    - expect: Form submits / advances like Next

#### 10.4. TC-LB-PAR-001: Parallel-safe unique data (NEW) [Not verifiable: framework/infra scenario]

**File:** `tests/e2e/lottery-brand/lottery_brand_persist.spec.ts`

**Steps:**
  1. Generate codes 'ATPLAN' + timestamp + random digits and names 'ATPLAN Brand ' + suffix (both must be unique - duplicate Code AND Name are rejected); never assert on global Total pages/first row; cleanup via a brand cleanup helper that searches the code and uses row menu > Delete (soft delete: records remain in the Deleted tab)
    - expect: No collisions between concurrent tests; each test removes only its own brands; run with --workers=1; approved brands exist only for the shortest possible time
