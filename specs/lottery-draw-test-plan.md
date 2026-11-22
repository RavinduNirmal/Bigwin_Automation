# Lottery Draws Test Plan (verified against live dev app)

## Application Overview

Verified test plan for Lottery Draws > Draws in the BigWin admin portal (dev: https://e763fesnjnk.dev.accelr.net/dashboard/draw), explored live on 2026-11-22. FORMAT: each scenario = title 'TC-LD-XXX-NNN: what' + (Automated | NEW) + verification tag. Step 1 of every scenario is a [Meta] step carrying Objective, Priority (Blocker/Critical/Normal/Minor), Preconditions and Test Data; the last step is [Cleanup] (postconditions). Tags: [Verified live] = confirmed on the live app; [Not verifiable: reason] = could not be confirmed in this exploration; [DEFECT] = the scenario states the CORRECT expected behaviour which the current app fails (must stay failing, no fixme/skip) and the 'ACTUAL' line says what really happens. 'Automated' ids keep their existing spec; 'NEW' = not automated yet. CONVENTIONS: authenticatedPage fixture, combinedTest with testLotteryDrawData, draw numbers 9xxxxxxxxx, codes AT9xxxxxxxxx, brand 'Mahajana Sampatha', far-future schedules (never In Play), ticket files from utils/dbf/ticket-dbf.service.ts, helpers only in utils/helpers/lottery-draw, run --workers=1, every created draw is Rejected in afterEach if still Under Review/Pending Approval (draws can NEVER be deleted - the dev DB already holds ~800 AT draws, 808 total). Never act (Review/Approve/Reject/Hold/Add Tickets/Quick Settings) on a draw the test did not create; never click Log out or Send Code to Mobile.

APP FACTS (live): LIST /dashboard/draw, title 'Draw: List | BigWin', heading 'Lottery Draws'; buttons Create Draw, Process Logs; 'Search...' (Enter; clear X); 11 tabs All (selected on load), Under Review, Pending Approval, Approved, In Play, In Play Post Cutoff, Completed, Winning Uploaded, On Hold, Rejected, Deleted. Tab counts when explored: Under Review ~200 pages of 10, Pending Approval 13, Approved 5, In Play 10, In Play Post Cutoff 1, Completed 405, Winning Uploaded 78, On Hold 100, Rejected 70, Deleted 55, All 808 (81 pages). List API POST /api/draw {filters:[], page(0-based), query, rowsPerPage:10, sortBy, sortDir, view: all|underReview|pendingApproval|approved|inPlay|inPlayPostCutoff|completed|winningUploaded|onHold|rejected|deleted, approvalStatus:null} -> {data,count,totalPages}; default sortBy 'endDate' desc (Draw Date newest first). UI state is mirrored in the URL (?view=rejected&query=...&sortBy=ticketCount&sortDir=asc). Columns: Draw Code, Lottery Name, Draw Number, Status, Type, Start Date, Cut Off Date, Draw Date, Ticket Count, Bought Count, Remaining Count + unnamed actions column. Sortable headers: Draw Code, Lottery Name, Draw Number, Status, Type, Start Date, Draw Date, Ticket Count, Bought Count (Cut Off Date and Remaining Count are NOT sortable); sortBy keys drawCode/status/startDate/endDate/ticketCount. 'Quick toggles' chips show/hide columns (Draw Number, Type, Start Date, Cut Off Date, Draw Date, Ticket Count, Sold %, Bought Count, Remaining Count, Revenue, Draw Show Order; Sold %, Revenue, Draw Show Order hidden by default) and persist in localStorage 'drawTableVisibleColumns'. Pagination: 'Page [input] of N' with prev/next arrow buttons; the page number is an editable input (valid number jumps; 0/999/'abc' are clamped/ignored - stayed on page 81). Search matches code, draw number and brand name, case-insensitive, partial; empty result shows only the header row (no 'No results' text). Row menu (icon button without name): Under Review = View, Add Tickets, Quick Settings, Reject Draw, Review Draw, Hold Draw; Pending Approval = View, Add Tickets, Quick Settings, Reject, Approve Draw, Hold Draw; On Hold = View, Edit, Add Tickets, Quick Settings, Activate Draw, Remove Draw. Review: PUT /api/draw/review/{id} (no confirmation). Reject from Under Review: PUT /api/draw/reject/{id}, no dialog -> Rejected. Reject from Pending Approval: PUT /api/draw/approve-reject/{id}, no dialog/reason -> goes BACK TO Under Review (audit log wording 'Lottery draw rejection is approved successfully'). Hold Draw: no confirmation, immediate; Status column becomes 'On Hold Under Review'; Activate Draw returns it to its stage. Approve Draw dialog 'Enter MD5 Checksum *' (wrong MD5 -> 400 'Invalid MD5 checksum'). Quick Settings dialog: 'Refresh' button, stats Total / Returnable / In Cart (Not Bought) / Non Returnable (Wasted) / Sold / Subscription Ticket (100/100/0/0/0/0 for a fresh 100-ticket draw), 'Set Retain Ticket Count' number input (default 20, disabled) and a disabled 'Update'. Add Tickets: 'Upload Files' dialog (Brand: ..., Draw: ..., Browse files, Cancel, Add); Add without a file toasts 'No DB files selected.' and closes the dialog. Process Logs dialog: 'Process Logs' '39 total jobs - Page 1 of 4', columns ID, Draw Number, Brand Name, Progress Label, Progress, Error, Status, Requested By, Created At, Process End At, a 'Columns' picker and a rows-per-page selector (10); failed jobs show errors such as 'Ticket code [..] does not belong to draw: 562' and 'Error calling user ticket service to validate winning numbers'. CREATE /dashboard/draw/create-draw (title 'Create Draw | BigWin'): Step 1 Lottery Brand (41 approved+active brands; label shows a double asterisk 'Lottery Brand * *'), Draw Number (number, defaults 0), Draw Code, Ticket Issue Start / Cutoff, Draw Date & Time (datetime-local), Mega Prize (text, default 0); Next shows native confirm 'Are you sure you want to create darw?' (typo 'darw'). Step 2: 'Draw Number: n', 'Brand Name: x', Select File ('Upload Files' dialog, text 'You can only choose files', Browse files, multiple allowed, no accept filter), MD5 Checksum *, Schedule Date * (hidden/cleared when Initiate Now is ticked), Initiate Now, Back, Create Draw. Create = POST ticket-service upload/private -> POST /api/draw/create (201 {results: drawId}) -> POST ticket-service ticket-upload (201 {results: uploadId}) -> returns to the list. Tickets load in the background. DRAW PAGE /dashboard/draw/edit-lottery-draw?drawId={id}: title 'Foundation: Blank Page | Carpatin' (wrong, template leftover), Back link, heading '<code> | <brand>', cards Bought Ticket Count / Revenue ('LKR 0') / Total Tickets, fields Lottery Name, Approval Stage, Draw Status, Draw Number, Draw Code, Issue Start/Cutoff/Draw Date Time, Mega Prize, 'Update' button (DISABLED while Under Review), 'Winnning Numbers:' (sic; 'No winning numbers available.'), 'Logs' table (Code, Scheduled At, Created At, Upload Status e.g. Scheduled/Completed, Log File + Download), 'Operation logs' table with Quick toggles and View More. VALIDATION on Next (verified): cutoff before/equal start -> inline 'Ticket Issue Cutoff Date & Time must be after Ticket Issue Start Date & Time'; Draw Number 0/-5 -> 'Draw Number must be a positive number'; 1.5 -> 'Draw Number must be an integer'; Mega Prize 0 or -100 (minus is stripped, shows 0) -> 'Mega Prize must be greater than 0'; empty Mega Prize -> native 'Please fill out this field.'; letters/'.' are not accepted into Mega Prize. NOT blocked: past dates, cutoff = draw date, 20-digit draw number, 21-digit mega prize, whitespace-only code, 300-char code. EXPLORATION LIMITS: the Playwright MCP auto-accepts native confirm dialogs, so 'Cancel on the confirm' could not be verified; only ONE draw was created (AT9161335291, id 939, upload 1104; AT9161335292 was not created), so server-side behaviour for wrong file type / corrupt DBF / barcode mismatch / HTML in code could not be confirmed (marked Not verifiable). NEW DEFECTS: (a) wrong file type (package.json) accepted by the Upload Files dialog with no message; (b) whitespace-only Draw Code accepted on Next; (c) no upper bound on Draw Number (20 digits) or Mega Prize (21 digits) - past the DB range; (d) past dates accepted for issue start/cutoff/draw date; (e) the 'Cutoff must be after Start' error is not cleared after the cutoff is corrected; (f) draw page title 'Foundation: Blank Page | Carpatin'; (g) confirm text typo 'darw' and label 'Lottery Brand * *'; (h) Hold Draw, Reject and Review need no confirmation (single click changes state); (i) Reject on Pending Approval returns to Under Review while the log says 'rejection is approved'; (j) '%' in search matches every draw and a search with leading/trailing spaces finds nothing; (k) list page fires one GET /api/lottery/{id} (HTTP 500) and ticket-service lottery-brand/{id} (404) per legacy draw row of brand id 2, and re-requests ticket-upload/draw/{id} 3-4 times per row; the app also console.logs draw payloads; (l) empty search result shows an empty table with no 'No results' message; (m) Add Tickets with no file closes the dialog with only a toast; (n) Update on draw page is disabled with no tooltip explaining why.

## Test Scenarios

### 1. 1. Navigation & Display

**Seed:** `tests/seed.spec.ts`

#### 1.1. TC-LD-NAV-001: Navigate to Lottery Draws from the sidebar (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: user reaches the Draws list via the sidebar. Priority: Blocker. Preconditions: logged in. Test Data: none.
  2. Expand sidebar 'Lottery Draws' and click 'Draws'
    - expect: URL ends with /dashboard/draw
    - expect: Title 'Draw: List | BigWin'
    - expect: Heading 'Lottery Draws' and the table are visible
  3. [Cleanup] none

#### 1.2. TC-LD-NAV-002: Draw table shows its 11 columns (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: all columns present. Priority: Normal. Preconditions: on Draws list. Test Data: none.
  2. Inspect the header
    - expect: Draw Code, Lottery Name, Draw Number, Status, Type, Start Date, Cut Off Date, Draw Date, Ticket Count, Bought Count, Remaining Count visible (Sold %, Revenue, Draw Show Order hidden by default)
  3. [Cleanup] none

#### 1.3. TC-LD-NAV-003: Create Draw, Process Logs, search and the 11 stage tabs are shown (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: page controls. Priority: Normal. Preconditions: on Draws list. Test Data: none.
  2. Inspect toolbar and tabs
    - expect: Create Draw and Process Logs buttons, editable 'Search...' box
    - expect: Tabs All, Under Review, Pending Approval, Approved, In Play, In Play Post Cutoff, Completed, Winning Uploaded, On Hold, Rejected, Deleted; 'All' aria-selected=true
  3. [Cleanup] none

#### 1.4. TC-LD-NAV-004: Draw Code link opens the draw page with the saved details (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: row link shows saved values. Priority: Critical. Preconditions: own draw created. Test Data: createUniqueDraw (AT9xxxxxxxxx, Mahajana Sampatha, mega 1000000).
  2. Search the code and click the Draw Code link
    - expect: URL /dashboard/draw/edit-lottery-draw?drawId={id}
    - expect: Heading '<code> | Mahajana Sampatha'
    - expect: Draw Number, Code, Issue Start/Cutoff, Draw Date (as 'YYYY.MM.DD hh:mm AM/PM'), Mega Prize match; Approval Stage UNDER REVIEW
  3. [Cleanup] afterEach rejects the draw

#### 1.5. TC-LD-NAV-005: Row menu of an Under Review draw offers Review Draw, not Approve Draw (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: stage-dependent menu. Priority: Critical. Preconditions: own Under Review draw. Test Data: createUniqueDraw.
  2. Open the row menu
    - expect: Items View, Add Tickets, Quick Settings, Reject Draw, Review Draw, Hold Draw
    - expect: 'Approve Draw' absent
  3. [Cleanup] Escape; draw rejected in afterEach

#### 1.6. TC-LD-NAV-006: Row menu of a Pending Approval draw offers Reject and Approve Draw (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: menu per stage. Priority: Normal. Preconditions: own draw reviewed. Test Data: createUniqueDraw + reviewDrawAndVerify.
  2. Open the row menu
    - expect: View, Add Tickets, Quick Settings, Reject, Approve Draw, Hold Draw; no 'Review Draw'
  3. [Cleanup] Reject (returns to Under Review) then Reject Draw

#### 1.7. TC-LD-NAV-007: View menu item and Draw Code link open the same draw page (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: both routes equal. Priority: Normal. Preconditions: own draw. Test Data: createUniqueDraw.
  2. Row menu > View; go back; click the code link
    - expect: Both land on edit-lottery-draw?drawId={id} with the same heading
  3. [Cleanup] afterEach reject

#### 1.8. TC-LD-NAV-008: Back link and browser Back return to the list (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: return navigation. Priority: Normal. Preconditions: on a draw page. Test Data: own draw.
  2. Click 'Back'; reopen and press browser Back
    - expect: Returns to Lottery Draws list with the table (search/tab state preserved via URL query)
  3. [Cleanup] afterEach reject

#### 1.9. TC-LD-NAV-009: Create Draw button opens /dashboard/draw/create-draw (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: entry point. Priority: Normal. Preconditions: Draws list. Test Data: none.
  2. Click 'Create Draw'
    - expect: URL /dashboard/draw/create-draw, title 'Create Draw | BigWin', stepper Step 1 Details / Step 2 Upload
  3. [Cleanup] none

#### 1.10. TC-LD-NAV-010: Opening a draw page title is a meaningful BigWin title [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_nav.spec.ts`

**Steps:**
  1. [Meta] Objective: page titles are consistent. Priority: Minor. Preconditions: own draw. Test Data: createUniqueDraw.
  2. Open the draw page and read document.title
    - expect: Title like 'Draw: View | BigWin'. ACTUAL: 'Foundation: Blank Page | Carpatin' (template leftover)
  3. [Cleanup] afterEach reject

### 2. 2. Create Draw

**Seed:** `tests/seed.spec.ts`

#### 2.1. TC-LD-CR-001: Create Draw Step 1 shows all fields (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: Step 1 form. Priority: Critical. Preconditions: Draws list. Test Data: none.
  2. Click Create Draw
    - expect: Lottery Brand, Draw Number (default 0), Draw Code, Ticket Issue Start/Cutoff, Draw Date & Time (type datetime-local), Mega Prize (default 0), Next
  3. [Cleanup] none

#### 2.2. TC-LD-CR-002: Empty Step 1 cannot continue (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: required fields. Priority: Critical. Preconditions: Create Draw open. Test Data: empty form.
  2. Click Next
    - expect: Native 'required' validity on Draw Code; no confirm dialog; Step 2 not shown
  3. [Cleanup] none

#### 2.3. TC-LD-CR-003: Next asks for confirmation and opens Step 2 (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: confirm + Step 2 info. Priority: Critical. Preconditions: Create Draw open. Test Data: testLotteryDrawData.unique(). Known intermittent defect: Step 2 'Brand Name' sometimes empty.
  2. Fill Step 1, click Next, accept confirm
    - expect: Confirm text matches /Are you sure you want to create/
    - expect: Step 2 'Upload Ticket List' with 'Draw Number: <n>' and 'Brand Name: Mahajana Sampatha'; MD5 box and Create Draw visible
  3. [Cleanup] nothing created

#### 2.4. TC-LD-CR-004: Create a draw with its ticket DBF and MD5 (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: happy path. Priority: Blocker. Preconditions: Draws list. Test Data: unique draw + 100-ticket DBF + its MD5 (e.g. 9161335291 / 7213ee88352e0a46376ac41d3ae59239). Known intermittent: HTTP 400 'Error occured while creating draw with code ...'.
  2. Complete both steps with Initiate Now ticked and Create Draw
    - expect: POST /api/draw/create 201, POST ticket-upload 201, returns to /dashboard/draw
    - expect: Row: code, Mahajana Sampatha, draw number, Status 'Under Review'; listed under Under Review tab
  3. [Cleanup] afterEach rejects the draw

#### 2.5. TC-LD-CR-005: Uploaded tickets are processed (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: background ticket load. Priority: Critical. Preconditions: own draw. Test Data: 100 tickets.
  2. Wait for tickets, open draw page and list row
    - expect: Total Tickets 100, Logs row Completed; list Ticket/Bought/Remaining = 100/0/100 (Logs row shows 'Scheduled' until loaded)
  3. [Cleanup] afterEach reject

#### 2.6. TC-LD-CR-006: Create Draw without a ticket file is blocked (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: file mandatory. Priority: Critical. Preconditions: on Step 2. Test Data: MD5 only.
  2. Click Create Draw with no file
    - expect: Stays on Step 2; no POST /api/draw/create success; draw not in list
  3. [Cleanup] none

#### 2.7. TC-LD-CR-007: Create Draw without the MD5 checksum is blocked (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: MD5 mandatory. Priority: Critical. Preconditions: file attached. Test Data: DBF, empty MD5.
  2. Click Create Draw
    - expect: Stays on Step 2; no draw created
  3. [Cleanup] none

#### 2.8. TC-LD-CR-008: A wrong MD5 checksum at creation is rejected (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: checksum verified. Priority: Critical. Preconditions: Step 2. Test Data: real DBF + MD5 with first char changed.
  2. Submit
    - expect: Either create returns >=400 and no draw exists, or the draw has Total Tickets 0 and no Completed upload after 90 s
  3. [Cleanup] afterEach reject

#### 2.9. TC-LD-CR-009: A second draw with an existing Draw Code is rejected (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: unique code. Priority: Critical. Preconditions: first draw exists. Test Data: second draw with new number but same code.
  2. Create the duplicate
    - expect: create response >=400; only one row with that code
  3. [Cleanup] afterEach reject first

#### 2.10. TC-LD-CR-011: Back from Step 2 keeps the Step 1 values [DEFECT] (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: Back preserves input. Priority: Normal. Preconditions: on Step 2. Test Data: unique draw.
  2. Click Back
    - expect: All Step 1 values incl. Lottery Brand are kept. ACTUAL: the Lottery Brand is cleared
  3. [Cleanup] none

#### 2.11. TC-LD-CR-012: Create Draw with a duplicate Draw Number is rejected (NEW) [Not verifiable: only one draw could be created; duplicate-number behaviour unconfirmed]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: draw number unique per brand. Priority: Critical. Preconditions: own draw X exists. Test Data: second draw same drawNumber, different code and schedule.
  2. Submit second draw
    - expect: Create rejected (>=400) with a clear message; no second row for that draw number
  3. [Cleanup] reject first draw

#### 2.12. TC-LD-CR-013: Same brand cannot have two draws at the same draw time (NEW) [Not verifiable: needs a second draw]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: schedule collision. Priority: Normal. Preconditions: own draw. Test Data: new number/code, identical drawDate.
  2. Submit
    - expect: Rejected with a message; no second draw created
  3. [Cleanup] reject first draw

#### 2.13. TC-LD-CR-014: Lottery Brand list offers only approved, active brands (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: brand source. Priority: Normal. Preconditions: Create Draw open. Test Data: POST /api/lottery/brands/simple {approvalStatus:'APPROVED',status:'ACTIVE'}.
  2. Open the Lottery Brand dropdown
    - expect: 41 options when explored incl. 'Mahajana Sampatha'; every option comes from the approved+active response; list closes on Escape
  3. [Cleanup] none

#### 2.14. TC-LD-CR-015: Step 2 Schedule Date is required unless Initiate Now is ticked (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: scheduling options. Priority: Normal. Preconditions: on Step 2. Test Data: DBF + MD5.
  2. Observe Schedule Date, tick then untick Initiate Now
    - expect: 'Schedule Date *' (datetime-local, required, defaults to today 00:00) is cleared/not needed when Initiate Now is ticked; Logs row on the draw page shows 'Not Scheduled' + created time
  3. [Cleanup] nothing created unless submitted

#### 2.15. TC-LD-CR-016: Cancel on the 'create draw' confirm keeps the user on Step 1 (NEW) [Not verifiable: MCP auto-accepts native dialogs]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: dismissing the confirm must not advance. Priority: Normal. Preconditions: valid Step 1. Test Data: unique draw.
  2. Click Next and dismiss the dialog (page.once('dialog', d => d.dismiss()))
    - expect: Still on Step 1 with values kept; no Step 2
  3. [Cleanup] none

#### 2.16. TC-LD-CR-017: Confirm and label copy are spelled correctly [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: copy quality. Priority: Minor. Preconditions: Create Draw open. Test Data: unique draw.
  2. Read the Brand label and confirm text
    - expect: 'Lottery Brand *' and 'Are you sure you want to create draw?'. ACTUAL: label 'Lottery Brand * *' and confirm says 'darw'
  3. [Cleanup] none

#### 2.17. TC-LD-CR-018: Browser reload or leaving Step 2 after Next creates nothing (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_create.spec.ts`

**Steps:**
  1. [Meta] Objective: no draw before Create Draw. Priority: Normal. Preconditions: on Step 2. Test Data: unique draw.
  2. Reload / navigate to the list, search the code
    - expect: No row for the code (draw is only created by Create Draw)
  3. [Cleanup] none

### 3. 3. Approval workflow

**Seed:** `tests/seed.spec.ts`

#### 3.1. TC-LD-APR-001: A new draw is Under Review and can only be reviewed (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: initial stage. Priority: Critical. Preconditions: own draw. Test Data: createUniqueDraw.
  2. Check Status (All tab) and the Under Review tab; open menu
    - expect: Status 'Under Review'; Review Draw offered, Approve Draw not
  3. [Cleanup] afterEach reject

#### 3.2. TC-LD-APR-002: Review Draw moves the draw to Pending Approval (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: review transition. Priority: Blocker. Preconditions: own draw with tickets loaded. Test Data: createUniqueDraw.
  2. Row menu > Review Draw
    - expect: PUT /api/draw/review/{id} ok; Status 'Pending Approval'; gone from Under Review tab; menu now offers Approve Draw, not Review Draw
  3. [Cleanup] afterEach reject

#### 3.3. TC-LD-APR-003: Approve Draw requires the MD5 checksum (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: MD5 mandatory. Priority: Critical. Preconditions: own Pending Approval draw. Test Data: upload MD5.
  2. Open Approve Draw
    - expect: Dialog 'Approve Draw' with 'Enter MD5 Checksum *'; confirm button disabled until filled, enabled after typing
  3. [Cleanup] Escape; afterEach reject

#### 3.4. TC-LD-APR-004: Approving with a wrong MD5 is rejected (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: checksum compared. Priority: Critical. Preconditions: own Pending Approval draw. Test Data: MD5 with first char changed.
  2. Approve with the wrong MD5
    - expect: PUT /api/draw/approve/{id}/{md5} returns 400 'Invalid MD5 checksum'; stage stays Pending Approval
  3. [Cleanup] afterEach reject

#### 3.5. TC-LD-APR-005: Approving with the upload MD5 moves the draw to Approved (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: approval. Priority: Blocker. Preconditions: own Pending Approval draw. Test Data: exact MD5 of the uploaded DBF. NOTE an Approved draw cannot be rejected afterwards - far-future schedule keeps it harmless.
  2. Approve
    - expect: Status 'Approved' on All tab and listed under Approved tab
  3. [Cleanup] cannot be removed; far-future schedule

#### 3.6. TC-LD-APR-006: Reject Draw moves an Under Review draw to Rejected (Automated) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: reject. Priority: Critical. Preconditions: own Under Review draw. Test Data: createUniqueDraw.
  2. Row menu > Reject Draw
    - expect: PUT /api/draw/reject/{id} (no dialog); Status 'Rejected'; listed under Rejected, not under Under Review
  3. [Cleanup] none

#### 3.7. TC-LD-APR-007: Reject on a Pending Approval draw sends it back to Under Review (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: documented behaviour of 'Reject' in Pending Approval. Priority: Critical. Preconditions: own draw reviewed. Test Data: createUniqueDraw + review.
  2. Row menu > Reject
    - expect: PUT /api/draw/approve-reject/{id}; no dialog or reason requested; Approval Stage returns to UNDER REVIEW; Review Draw offered again
  3. [Cleanup] Reject Draw

#### 3.8. TC-LD-APR-008: Rejecting a Pending Approval draw is worded as a rejection in the operation log [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: audit wording. Priority: Minor. Preconditions: APR-007 state. Test Data: own draw.
  2. Read the draw page Operation logs
    - expect: An entry such as 'Lottery draw sent back for review'. ACTUAL: 'Lottery draw rejection is approved successfully for id : {id}'
  3. [Cleanup] Reject Draw

#### 3.9. TC-LD-APR-009: Review / Reject act immediately with no confirmation (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: confirm risk of accidental clicks (informational; decide if confirmation is desired). Priority: Minor. Preconditions: own draw. Test Data: createUniqueDraw.
  2. Click Reject Draw, then Review Draw on another draw; watch for dialogs
    - expect: No dialog; state changes immediately (currently documented behaviour - flag to product owner)
  3. [Cleanup] draws rejected

#### 3.10. TC-LD-APR-010: Review is refused until tickets are loaded (NEW) [Verified live per existing helper; message text Not verifiable]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: cannot review an empty draw. Priority: Critical. Preconditions: draw just created (Logs 'Scheduled', Total Tickets 0). Test Data: createUniqueDraw.
  2. Immediately Review Draw
    - expect: Refused with 'This draw has no tickets...'; stage stays Under Review; after tickets load Review works
  3. [Cleanup] afterEach reject

#### 3.11. TC-LD-APR-011: Approved draw cannot be rejected, held-removed or re-reviewed from the menu (NEW) [Not verifiable: would need approving a second draw]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: stage menu for Approved. Priority: Normal. Preconditions: own Approved draw. Test Data: createApprovedDraw helper.
  2. Open row menu on Approved draw
    - expect: No Review Draw / Approve Draw / Reject items
  3. [Cleanup] none possible

#### 3.12. TC-LD-APR-012: Operation logs record create, schedule, review and reject events (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_approval.spec.ts`

**Steps:**
  1. [Meta] Objective: audit trail. Priority: Normal. Preconditions: own draw that was created, reviewed, rejected. Test Data: createUniqueDraw + review + approve-reject.
  2. Open draw page Operation logs
    - expect: Entries 'Lottery draw created successfully with code: <code>', 'Successfully scheduled new tickets upload for draw id : {id}', 'Lottery draw with id {id}is reviewed and moved to pending approval' (sic missing space), each with Email, Operation Type, Entity Type 'Lottery Draw', Http Status, Logged At
  3. [Cleanup] Reject Draw

### 4. 4. Lifecycle & demo

**Seed:** `tests/seed.spec.ts`

#### 4.1. TC-LD-LC-001: Approved draw goes In Play, then In Play Post Cutoff, then Completed on schedule (Automated, @slow) [Verified live per existing run]

**File:** `tests/e2e/lottery-draw/lottery_draw_lifecycle.spec.ts`

**Steps:**
  1. [Meta] Objective: scheduler transitions. Priority: Critical. Preconditions: imminent schedule (start +2, cutoff +6, draw +10 minutes). Test Data: imminentSchedule(), DBF. ~20-40 min. NOT run during exploration (safety).
  2. Create, review, approve; observe Status/tabs over time
    - expect: In Play after issue start, In Play Post Cutoff after cutoff, Completed after draw date; each confirmed on All tab and the stage tab
  3. [Cleanup] draw finishes Completed (cannot be deleted)

#### 4.2. TC-LD-DEMO-001: Draw moves through every stage within about 5 minutes (Automated, @slow @demo) [Verified live per existing run]

**File:** `tests/e2e/lottery-draw/lottery_draw_demo.spec.ts`

**Steps:**
  1. [Meta] Objective: demo walk-through. Priority: Minor. Preconditions: as LC-001 with a compressed schedule. Test Data: imminent schedule. NOT run during exploration.
  2. Run the demo test
    - expect: Draw visibly passes Under Review, Pending Approval, Approved, In Play, In Play Post Cutoff, Completed
  3. [Cleanup] none

#### 4.3. TC-LD-LC-002: A draw with start/cutoff in the past is not accepted or goes straight In Play [DEFECT] (NEW) [Verified live for Step 1 only]

**File:** `tests/e2e/lottery-draw/lottery_draw_lifecycle.spec.ts`

**Steps:**
  1. [Meta] Objective: past schedule handling. Priority: Normal. Preconditions: Create Draw open. Test Data: start 2020-01-01 10:00, cutoff 2020-01-02 10:00, draw 2020-01-03 10:00 (do NOT submit Create Draw).
  2. Fill Step 1 and click Next
    - expect: Inline error that dates must be in the future. ACTUAL: accepted - Step 2 opens
  3. [Cleanup] leave page

### 5. 5. Ticket DBF service (unit)

**Seed:** `tests/seed.spec.ts`

#### 5.1. TC-DBF-001: Header and field layout match the dBASE III format (Automated)

**File:** `tests/unit/ticket-dbf.service.spec.ts`

**Steps:**
  1. [Meta] Objective: file structure. Priority: Normal. Preconditions: none. Test Data: writeTicketDbf({startId,totalRecords:100,prefix:'0',numbersPerRecord:4,seed}).
  2. Generate and parse the header
    - expect: Fields BARCODE C14, SYMBOL C7, LETTERS C7, NUMBERS C35; record count 100
  3. [Cleanup] temp files removed

#### 5.2. TC-DBF-002: Barcodes are prefix + sequence, firstBarcode/lastBarcode correct (Automated)

**File:** `tests/unit/ticket-dbf.service.spec.ts`

**Steps:**
  1. [Meta] Objective: barcode numbering. Priority: Normal. Preconditions: none. Test Data: 9161335291001..100.
  2. Generate
    - expect: firstBarcode 09161335291001, lastBarcode 09161335291100, max 14 chars
  3. [Cleanup] none

#### 5.3. TC-DBF-003: MD5 returned equals the file's MD5 (Automated)

**File:** `tests/unit/ticket-dbf.service.spec.ts`

**Steps:**
  1. [Meta] Objective: checksum. Priority: Critical. Preconditions: none. Test Data: seed fixed.
  2. Generate and hash the file
    - expect: md5 equals independent MD5 of the bytes
  3. [Cleanup] none

#### 5.4. TC-DBF-004: Same seed gives identical file and MD5 (Automated)

**File:** `tests/unit/ticket-dbf.service.spec.ts`

**Steps:**
  1. [Meta] Objective: reproducibility. Priority: Normal. Preconditions: none. Test Data: seed 1.
  2. Generate twice
    - expect: Identical bytes and MD5
  3. [Cleanup] none

### 6. 6. Search

**Seed:** `tests/seed.spec.ts`

#### 6.1. TC-LD-SRCH-001: Search by Draw Code finds exactly the own draw (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: search by code. Priority: Critical. Preconditions: own draw. Test Data: code AT9161335291 style.
  2. Type the full code in 'Search...' and press Enter
    - expect: POST /api/draw carries query=<code>; table shows 1 row with that code; URL gets ?query=<code>; pager 'of 1'
  3. [Cleanup] afterEach reject

#### 6.2. TC-LD-SRCH-002: Search by Draw Number finds the draw (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: number search. Priority: Critical. Preconditions: own draw. Test Data: 10-digit draw number.
  2. Search the draw number
    - expect: 1 row, code AT<number>
  3. [Cleanup] afterEach reject

#### 6.3. TC-LD-SRCH-003: Search is case-insensitive and supports partial text (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: matching rules. Priority: Normal. Preconditions: own draw. Test Data: lowercase code, first 7 characters of the code.
  2. Search 'at9161335291' then 'AT91613'
    - expect: Own draw is in both results (partial may add other draws - assert only own code present)
  3. [Cleanup] afterEach reject

#### 6.4. TC-LD-SRCH-004: Search by brand name returns that brand's draws (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: brand text matched. Priority: Normal. Preconditions: none. Test Data: 'Mahajana'.
  2. Search 'Mahajana'
    - expect: Multi-page result (41 pages when explored); every visible row's Lottery Name contains 'Mahajana'
  3. [Cleanup] none

#### 6.5. TC-LD-SRCH-005: No match shows an empty table and a no-results message [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: empty state. Priority: Minor. Preconditions: none. Test Data: 'ZZZNOPE123'.
  2. Search it
    - expect: 0 rows and a 'No results/No data' message. ACTUAL: 0 rows, header only, no message, no pager
  3. [Cleanup] none

#### 6.6. TC-LD-SRCH-006: Clear (X) restores the full list (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: clear. Priority: Normal. Preconditions: a search applied. Test Data: any code.
  2. Click 'clear'
    - expect: Box empty, request query '', 10 rows, 'of 81' pages (or current total)
  3. [Cleanup] none

#### 6.7. TC-LD-SRCH-007: Search combined with a stage tab only searches that stage (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: tab + query. Priority: Normal. Preconditions: own Under Review draw. Test Data: its code.
  2. Search code on Rejected tab, then Under Review tab
    - expect: Not found in Rejected (0 rows); found in Under Review; URL ?view=...&query=...
  3. [Cleanup] afterEach reject

#### 6.8. TC-LD-SRCH-008: Special characters, '%' and SQL text in search are handled safely [DEFECT for '%'] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: input safety. Priority: Normal. Preconditions: none. Test Data: <img src=x onerror=alert(1)>, ' OR 1=1 --, %.
  2. Search each value
    - expect: HTML and SQL strings: 0 rows, no script runs, no error. '%' should match only literal '%' (0 rows). ACTUAL: '%' matches every draw (81 pages)
  3. [Cleanup] none

#### 6.9. TC-LD-SRCH-009: Leading/trailing spaces are trimmed [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_search.spec.ts`

**Steps:**
  1. [Meta] Objective: whitespace tolerance. Priority: Minor. Preconditions: own draw. Test Data: '  <code>  '.
  2. Search with surrounding spaces
    - expect: Own draw found. ACTUAL: 0 rows (query sent untrimmed)
  3. [Cleanup] afterEach reject

### 7. 7. Tabs, table, paging, sorting

**Seed:** `tests/seed.spec.ts`

#### 7.1. TC-LD-TBL-001: Each stage tab sends its view and shows only that stage (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: tab filters. Priority: Critical. Preconditions: none. Test Data: tabs Under Review, Pending Approval, Approved, Rejected, On Hold.
  2. Click each tab
    - expect: Request view = underReview/pendingApproval/approved/rejected/onHold; tab aria-selected; URL ?view=...; every Status cell belongs to that stage (assert property, never counts)
  3. [Cleanup] none

#### 7.2. TC-LD-TBL-002: In Play, In Play Post Cutoff, Completed, Winning Uploaded and Deleted tabs load (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: remaining tabs render. Priority: Normal. Preconditions: none. Test Data: views inPlay, inPlayPostCutoff, completed, winningUploaded, deleted.
  2. Click each tab
    - expect: HTTP 200, table renders (or empty), no error toast
  3. [Cleanup] none

#### 7.3. TC-LD-TBL-003: A new draw appears under Under Review and in no other stage tab (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: tab membership. Priority: Critical. Preconditions: own draw. Test Data: createUniqueDraw.
  2. Search its code on every tab
    - expect: Present on All and Under Review only
  3. [Cleanup] afterEach reject

#### 7.4. TC-LD-TBL-004: Default order is newest Draw Date first (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: default sort. Priority: Normal. Preconditions: none. Test Data: none.
  2. Load the list and read Draw Date of the first 10 rows
    - expect: Request sortBy=endDate sortDir=desc; Draw Date column shows a down arrow and rows are non-increasing
  3. [Cleanup] none

#### 7.5. TC-LD-TBL-005: Draw Date header toggles ascending/descending (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: sort toggle. Priority: Normal. Preconditions: list loaded. Test Data: none.
  2. Click Draw Date twice
    - expect: sortDir asc then desc in the request; row order reverses accordingly (assert monotonic dates on the page)
  3. [Cleanup] none

#### 7.6. TC-LD-TBL-006: Draw Code, Status, Start Date and Ticket Count headers sort (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: column sorts. Priority: Normal. Preconditions: list loaded. Test Data: none.
  2. Click each header
    - expect: Requests sortBy drawCode/status/startDate/ticketCount asc; URL ?sortBy=..&sortDir=asc; page 1 re-queried; rows ordered by that column
  3. [Cleanup] none

#### 7.7. TC-LD-TBL-007: Cut Off Date and Remaining Count are not sortable (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: documented sortable set. Priority: Minor. Preconditions: list loaded. Test Data: none.
  2. Click Cut Off Date and Remaining Count headers
    - expect: No list request, no arrow (informational: confirm with product whether intended)
  3. [Cleanup] none

#### 7.8. TC-LD-TBL-008: Next/previous page buttons and page input navigate (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: paging. Priority: Critical. Preconditions: All tab (many pages). Test Data: none.
  2. Click next, previous; type 3 in the page box and press Enter
    - expect: Request page 1, 0, 2 (0-based); input mirrors page; the first row differs from page 1; 10 rows per page; on the last page next is disabled
  3. [Cleanup] none

#### 7.9. TC-LD-TBL-009: Out-of-range page numbers are clamped (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: paging boundaries. Priority: Normal. Preconditions: last page reached. Test Data: 999, 0, abc.
  2. Type each into the page input
    - expect: Stays on the valid last page; no error; non-numeric text not accepted
  3. [Cleanup] none

#### 7.10. TC-LD-TBL-010: Switching tab resets to page 1 (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: paging state reset. Priority: Normal. Preconditions: All tab page 2+. Test Data: none.
  2. Click the Rejected tab
    - expect: Request page 0; page input 1
  3. [Cleanup] none

#### 7.11. TC-LD-TBL-011: Quick toggle chips hide and show columns and persist (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: column visibility. Priority: Normal. Preconditions: fresh localStorage. Test Data: chips 'Sold %', 'Type'.
  2. Click 'Sold %' chip and 'Type' chip, reload
    - expect: 'Sold %' column appears, 'Type' column disappears; localStorage drawTableVisibleColumns updated and honoured after reload; Draw Code, Lottery Name, Status cannot be toggled
  3. [Cleanup] remove localStorage drawTableVisibleColumns

#### 7.12. TC-LD-TBL-012: Opening the list does not issue per-row error requests [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: clean network/console. Priority: Minor. Preconditions: sort by Draw Date ascending (legacy draws of brand id 2). Test Data: none.
  2. Load the page and collect console errors / failed requests
    - expect: No failing requests. ACTUAL: GET /api/lottery/2 returns 500 and ticket-service lottery-brand/2 returns 404 repeatedly ('Error fetching brand name'); ticket-upload/draw/{id} requested 3-4 times per row; draw payloads logged to console
  3. [Cleanup] none

#### 7.13. TC-LD-TBL-013: Status column shows 'On Hold Under Review' for a held draw (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_table.spec.ts`

**Steps:**
  1. [Meta] Objective: combined status text. Priority: Minor. Preconditions: own held draw. Test Data: createUniqueDraw + Hold Draw.
  2. Search the draw on All and On Hold tabs
    - expect: Status cell 'On Hold Under Review' (two statuses concatenated, no separator); listed under On Hold
  3. [Cleanup] Activate Draw, Reject Draw

### 8. 8. Draw view page

**Seed:** `tests/seed.spec.ts`

#### 8.1. TC-LD-VIEW-001: Summary cards show Bought Ticket Count, Revenue and Total Tickets (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_view.spec.ts`

**Steps:**
  1. [Meta] Objective: summary. Priority: Normal. Preconditions: own draw with tickets. Test Data: 100 tickets.
  2. Open the draw page
    - expect: Bought Ticket Count 0, Revenue 'LKR 0', Total Tickets 100
  3. [Cleanup] afterEach reject

#### 8.2. TC-LD-VIEW-002: Fields show Approval Stage and Draw Status (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_view.spec.ts`

**Steps:**
  1. [Meta] Objective: stage fields. Priority: Normal. Preconditions: own draw. Test Data: createUniqueDraw.
  2. Read Approval Stage, Draw Status
    - expect: UNDER REVIEW and ACTIVE; after Review 'PENDING APPROVAL'
  3. [Cleanup] afterEach reject

#### 8.3. TC-LD-VIEW-003: Logs table lists the ticket upload with status and download (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_view.spec.ts`

**Steps:**
  1. [Meta] Objective: upload log. Priority: Normal. Preconditions: own draw. Test Data: Initiate Now ticked.
  2. Open draw page right after creation, then after tickets load
    - expect: One row: Scheduled At 'Not Scheduled', Created At timestamp, Upload Status 'Scheduled' then 'Completed', 'Download' link/button; Page 1 of 1
  3. [Cleanup] afterEach reject

#### 8.4. TC-LD-VIEW-004: Winning Numbers panel says none for a draw without results (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_view.spec.ts`

**Steps:**
  1. [Meta] Objective: empty state. Priority: Minor. Preconditions: own draw. Test Data: none.
  2. Read the 'Winnning Numbers:' panel
    - expect: 'No winning numbers available.' (label has a typo 'Winnning' - cosmetic defect)
  3. [Cleanup] afterEach reject

#### 8.5. TC-LD-VIEW-005: Operation logs show only this draw's entries [Verified live: entries are the draw's own]

**File:** `tests/e2e/lottery-draw/lottery_draw_view.spec.ts`

**Steps:**
  1. [Meta] Objective: log scoping. Priority: Normal. Preconditions: own draw reviewed. Test Data: createUniqueDraw + review.
  2. Read Operation logs (Entity Long Id column)
    - expect: All entries have Entity Long Id = this draw id; View More opens the full detail; Quick toggles show/hide columns
  3. [Cleanup] Reject

#### 8.6. TC-LD-VIEW-006: Update is disabled for an Under Review draw (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_view.spec.ts`

**Steps:**
  1. [Meta] Objective: edit gating. Priority: Normal. Preconditions: own Under Review draw. Test Data: createUniqueDraw.
  2. Inspect the Update button
    - expect: Button disabled (informational; a tooltip/reason would help users). Enabled state for other stages is Not verifiable
  3. [Cleanup] afterEach reject

#### 8.7. TC-LD-VIEW-007: Draw page fields cannot be modified without Update (NEW) [Not verifiable: field editability not confirmed - inputs are not DOM readOnly]

**File:** `tests/e2e/lottery-draw/lottery_draw_view.spec.ts`

**Steps:**
  1. [Meta] Objective: read-only view. Priority: Normal. Preconditions: own draw. Test Data: type 'X' into Mega Prize (do not save).
  2. Try typing in each field
    - expect: Values do not change (fields effectively read-only). Verify manually: DOM inputs report readOnly=false
  3. [Cleanup] reload page

### 9. 9. Row actions

**Seed:** `tests/seed.spec.ts`

#### 9.1. TC-LD-ACT-001: Quick Settings shows ticket statistics and a disabled Retain input (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: stats dialog. Priority: Normal. Preconditions: own draw with tickets. Test Data: 100 tickets.
  2. Row menu > Quick Settings, wait until 'Processing...' becomes 'Refresh'
    - expect: Total 100, Returnable 100, In Cart 0, Non Returnable (Wasted) 0, Sold 0, Subscription Ticket 0; 'Set Retain Ticket Count' number input (20) disabled; 'Update' disabled
  3. [Cleanup] Escape; afterEach reject

#### 9.2. TC-LD-ACT-002: Quick Settings closes with Escape and changes nothing (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: safe cancel. Priority: Minor. Preconditions: Quick Settings open on own draw. Test Data: none.
  2. Press Escape
    - expect: Dialog closes; no PUT request; row unchanged
  3. [Cleanup] afterEach reject

#### 9.3. TC-LD-ACT-003: Add Tickets opens the Upload Files dialog for the draw (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: add-tickets dialog. Priority: Normal. Preconditions: own draw. Test Data: none.
  2. Row menu > Add Tickets
    - expect: Dialog 'Upload Files' with 'Brand: Mahajana Sampatha', 'Draw: <number>', Browse files, Cancel, Add
  3. [Cleanup] Cancel; afterEach reject

#### 9.4. TC-LD-ACT-004: Add Tickets without a file reports 'No DB files selected.' and keeps the dialog open [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: validation feedback. Priority: Minor. Preconditions: Add Tickets dialog open. Test Data: no file.
  2. Click Add
    - expect: Toast 'No DB files selected.' and the dialog stays open. ACTUAL: toast appears but the dialog closes; no request sent
  3. [Cleanup] afterEach reject

#### 9.5. TC-LD-ACT-005: Add Tickets with a second valid DBF raises Total Tickets (NEW) [Not verifiable: only one ticket file budget; would change draw data]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: append tickets. Priority: Normal. Preconditions: own draw with 100 tickets. Test Data: second DBF with startId continuing (e.g. 9xxxxxxxxx101..).
  2. Add the file and wait for processing
    - expect: Total Tickets 200; new Logs row Completed
  3. [Cleanup] Reject draw

#### 9.6. TC-LD-ACT-006: Hold Draw puts the draw On Hold and Activate Draw restores it (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: hold cycle. Priority: Critical. Preconditions: own Under Review draw. Test Data: createUniqueDraw.
  2. Row menu > Hold Draw; reload; open menu; Activate Draw
    - expect: No confirmation; Status 'On Hold Under Review', listed under On Hold; menu becomes View, Edit, Add Tickets, Quick Settings, Activate Draw, Remove Draw; after Activate Draw Status is 'Under Review' again
  3. [Cleanup] Reject Draw

#### 9.7. TC-LD-ACT-007: Edit and Remove Draw on an On Hold draw (NEW) [Not verifiable: destructive Remove not exercised; Edit not opened]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: On Hold menu items. Priority: Normal. Preconditions: own On Hold draw. Test Data: createUniqueDraw + hold.
  2. Open Edit, change nothing and cancel; then Remove Draw
    - expect: Edit lets user change the draw (to be documented); Remove Draw moves the draw to the Deleted tab and the draw never reappears elsewhere
  3. [Cleanup] draw ends Deleted

#### 9.8. TC-LD-ACT-008: Process Logs dialog lists background jobs (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: job log. Priority: Normal. Preconditions: Draws list. Test Data: none.
  2. Click Process Logs
    - expect: Dialog 'Process Logs' with 'N total jobs - Page 1 of M', columns ID, Draw Number, Brand Name, Progress Label, Progress, Error, Status, Requested By, Created At, Process End At; 'Columns' picker; rows-per-page 10; FAILED rows show an Error text; COMPLETED rows show 'Completed!' 100%
  3. [Cleanup] close dialog

#### 9.9. TC-LD-ACT-009: Process Logs paging and column picker work (NEW) [Not verifiable: only first page read]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: dialog controls. Priority: Minor. Preconditions: Process Logs open. Test Data: none.
  2. Go to page 2, toggle a column in 'Columns', change rows per page
    - expect: Rows and columns update accordingly; dialog closes with Escape
  3. [Cleanup] close dialog

#### 9.10. TC-LD-ACT-010: Reject/Hold/Add Tickets/Quick Settings act only on the clicked row (NEW) [Verified live by design]

**File:** `tests/e2e/lottery-draw/lottery_draw_actions.spec.ts`

**Steps:**
  1. [Meta] Objective: row scoping. Priority: Critical. Preconditions: two own draws. Test Data: two unique draws.
  2. Reject only the first
    - expect: Only the first draw changes; the second stays Under Review
  3. [Cleanup] reject second

### 10. 10. Field validation (Create Draw)

**Seed:** `tests/seed.spec.ts`

#### 10.1. TC-LD-VAL-001: Cutoff before Issue Start is rejected inline (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: date order. Priority: Critical. Preconditions: Create Draw open. Test Data: start 2027-06-01 10:00, cutoff 2027-05-30 18:00, draw 2027-06-10 20:30.
  2. Fill and click Next
    - expect: Inline error 'Ticket Issue Cutoff Date & Time must be after Ticket Issue Start Date & Time'; stays on Step 1
  3. [Cleanup] none

#### 10.2. TC-LD-VAL-002: Cutoff equal to Issue Start is rejected (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: boundary. Priority: Normal. Preconditions: Create Draw open. Test Data: start = cutoff = 2027-06-01 10:00.
  2. Click Next
    - expect: Same 'must be after' error on Cutoff
  3. [Cleanup] none

#### 10.3. TC-LD-VAL-003: Draw Date before Cutoff is rejected [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: draw after cutoff. Priority: Critical. Preconditions: Create Draw open. Test Data: start 2027-06-01 10:00, cutoff 2027-06-10 18:00, draw 2027-06-10 12:00. Only Step 1 -> Next, never Create.
  2. Click Next
    - expect: Inline error that Draw Date must be after Cutoff; stays on Step 1. ACTUAL: not observed to block on Step 1 - an earlier loop probe saw no Step 2 but no message either; re-verify in automation (result inconclusive in exploration, treat as Not verifiable until run)
  3. [Cleanup] none

#### 10.4. TC-LD-VAL-004: Cutoff equal to Draw Date is rejected [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: draw strictly after cutoff. Priority: Normal. Preconditions: Create Draw open. Test Data: cutoff = draw = 2027-06-10 18:00.
  2. Click Next
    - expect: Error. ACTUAL: accepted, Step 2 opens (equal cutoff and draw date allowed)
  3. [Cleanup] none

#### 10.5. TC-LD-VAL-005: Past dates are rejected [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: future schedule. Priority: Critical. Preconditions: Create Draw open. Test Data: 2020-01-01 10:00 / 2020-01-02 10:00 / 2020-01-03 10:00.
  2. Click Next
    - expect: Error about past dates. ACTUAL: Step 2 opens
  3. [Cleanup] none

#### 10.6. TC-LD-VAL-006: Cutoff error clears once the cutoff is corrected [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: stale message. Priority: Minor. Preconditions: VAL-001 error shown. Test Data: set cutoff 2027-06-10 18:00.
  2. Correct the cutoff
    - expect: Error disappears. ACTUAL: message stays visible until Next is pressed again
  3. [Cleanup] none

#### 10.7. TC-LD-VAL-007: Draw Number 0 or negative is rejected (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: positive number. Priority: Critical. Preconditions: Create Draw open, other fields valid. Test Data: 0, -5.
  2. Click Next for each
    - expect: 'Draw Number must be a positive number'; no confirm; Step 1
  3. [Cleanup] none

#### 10.8. TC-LD-VAL-008: Decimal Draw Number is rejected (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: integer. Priority: Normal. Preconditions: Create Draw open. Test Data: 1.5.
  2. Click Next
    - expect: 'Draw Number must be an integer'
  3. [Cleanup] none

#### 10.9. TC-LD-VAL-009: Very long Draw Number (20 digits) is rejected [DEFECT] (NEW) [Verified live on Step 1; server not verified]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: upper bound. Priority: Normal. Preconditions: Create Draw open. Test Data: 99999999999999999999 (do not submit Create Draw).
  2. Click Next
    - expect: Error (max length/range). ACTUAL: accepted, Step 2 shows 'Draw Number: 99999999999999999999'
  3. [Cleanup] none

#### 10.10. TC-LD-VAL-010: Mega Prize 0, negative or empty is rejected (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: positive prize. Priority: Critical. Preconditions: Create Draw open. Test Data: 0, -100, empty.
  2. Click Next for each
    - expect: 0 and -100 (minus is stripped to 0): 'Mega Prize must be greater than 0'; empty: native 'Please fill out this field.'
  3. [Cleanup] none

#### 10.11. TC-LD-VAL-011: Mega Prize accepts digits only (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: input filter. Priority: Normal. Preconditions: Create Draw open. Test Data: 'abc', '1000.55'.
  2. Type each
    - expect: Letters and '.' are not accepted into the box (previous value kept)
  3. [Cleanup] none

#### 10.12. TC-LD-VAL-012: Huge Mega Prize (21 digits) is rejected [DEFECT] (NEW) [Verified live on Step 1]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: upper bound. Priority: Normal. Preconditions: Create Draw open. Test Data: 999999999999999999999.
  2. Click Next
    - expect: Error. ACTUAL: accepted, Step 2 opens
  3. [Cleanup] none

#### 10.13. TC-LD-VAL-013: Whitespace-only Draw Code is rejected [DEFECT] (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: trimmed required. Priority: Critical. Preconditions: Create Draw open. Test Data: '   '.
  2. Click Next
    - expect: Required error. ACTUAL: accepted, Step 2 opens
  3. [Cleanup] none

#### 10.14. TC-LD-VAL-014: Draw Code length limit (300 characters) [DEFECT] (NEW) [Verified live on Step 1; server not verified]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: max length. Priority: Normal. Preconditions: Create Draw open. Test Data: 'AT' + 298 x '9' (do not submit).
  2. Fill and click Next
    - expect: Length error/limit. ACTUAL: accepted, no maxlength
  3. [Cleanup] none

#### 10.15. TC-LD-VAL-015: Special characters and HTML in Draw Code are stored and rendered as text (NEW) [Not verifiable: server behaviour needs a created draw]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: XSS safety. Priority: Critical. Preconditions: Create Draw open. Test Data: code 'AT<b>x</b>9xxxxxxxxx' (starts with AT for cleanup).
  2. Create the draw, view list and draw page
    - expect: Code shown literally; no HTML/script executed; either rejected with a message or rendered as text
  3. [Cleanup] Reject draw

#### 10.16. TC-LD-VAL-016: Wrong file type (non-DBF) is rejected [DEFECT] (NEW) [Verified live for the dialog; server not verified]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: file type check. Priority: Critical. Preconditions: Step 2. Test Data: package.json / notes.txt.
  2. Select File, choose a .json file, click Add
    - expect: Message that only .dbf is allowed. ACTUAL: file is accepted silently (input accept='' multiple) and listed on Step 2
  3. [Cleanup] none (do not submit)

#### 10.17. TC-LD-VAL-017: Corrupt or empty DBF is rejected with a clear message (NEW) [Not verifiable: would need creating a draw]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: corrupt file. Priority: Critical. Preconditions: Step 2. Test Data: truncated DBF with a valid MD5 of that file.
  2. Create Draw
    - expect: Ticket upload Failed in Logs / Process Logs with an error; Total Tickets 0; draw cannot be reviewed ('no tickets')
  3. [Cleanup] Reject draw

#### 10.18. TC-LD-VAL-018: DBF barcodes that do not belong to the draw number are rejected (NEW) [Not verifiable: needs a created draw; Process Logs show 'Ticket code [..] does not belong to draw' for winning-number processing]

**File:** `tests/e2e/lottery-draw/lottery_draw_validation.spec.ts`

**Steps:**
  1. [Meta] Objective: barcode/draw consistency. Priority: Critical. Preconditions: Step 2. Test Data: DBF built for draw number A but draw created as B.
  2. Create Draw
    - expect: Upload fails or is flagged; Total Tickets 0 or mismatch message
  3. [Cleanup] Reject draw

### 11. 11. Security & robustness

**Seed:** `tests/seed.spec.ts`

#### 11.1. TC-LD-SEC-001: Unauthenticated access to /dashboard/draw redirects to login (NEW) [Not verifiable: not exercised in exploration; mirrors TC-LOGIN session tests]

**File:** `tests/e2e/lottery-draw/lottery_draw_security.spec.ts`

**Steps:**
  1. [Meta] Objective: route protection. Priority: Blocker. Preconditions: test.use({restoreSession:false, storageState empty}). Test Data: none.
  2. Browse to /dashboard/draw and /dashboard/draw/create-draw
    - expect: Redirected to the login page; no draw data shown; no list API call succeeds
  3. [Cleanup] none

#### 11.2. TC-LD-SEC-002: Unauthenticated draw page URL does not leak data (NEW) [Not verifiable: not exercised]

**File:** `tests/e2e/lottery-draw/lottery_draw_security.spec.ts`

**Steps:**
  1. [Meta] Objective: deep link protection. Priority: Critical. Preconditions: logged out. Test Data: /dashboard/draw/edit-lottery-draw?drawId=939.
  2. Browse to it
    - expect: Login page; draw details never rendered
  3. [Cleanup] none

#### 11.3. TC-LD-SEC-003: Non-existent drawId shows a clear not-found state (NEW) [Not verifiable: drawId=99999 not opened]

**File:** `tests/e2e/lottery-draw/lottery_draw_security.spec.ts`

**Steps:**
  1. [Meta] Objective: unknown id. Priority: Normal. Preconditions: logged in. Test Data: drawId=99999 and drawId=abc. (Lottery Brand equivalent shows an empty form with console errors - expect similar.)
  2. Browse to edit-lottery-draw?drawId=99999
    - expect: 'Not found' message or redirect to the list. Likely ACTUAL (as in Lottery Brand): empty form, console errors
  3. [Cleanup] none

#### 11.4. TC-LD-SEC-004: HTML in search text is not rendered (NEW) [Verified live]

**File:** `tests/e2e/lottery-draw/lottery_draw_security.spec.ts`

**Steps:**
  1. [Meta] Objective: XSS via query. Priority: Critical. Preconditions: Draws list. Test Data: <img src=x onerror=alert(1)>.
  2. Search it and also open /dashboard/draw?query=<img src=x onerror=alert(1)>
    - expect: No dialog/alert fires; no <img> injected; 0 rows
  3. [Cleanup] clear search

#### 11.5. TC-LD-SEC-005: A draw page for another brand's draw is read-only for actions the user cannot do (NEW) [Not verifiable: single super-admin account]

**File:** `tests/e2e/lottery-draw/lottery_draw_security.spec.ts`

**Steps:**
  1. [Meta] Objective: role-based access. Priority: Normal. Preconditions: a limited-role account (not available). Test Data: none.
  2. Log in as a limited user and open the Draws list
    - expect: Review/Approve/Reject/Hold controls are hidden or refused (403) according to role
  3. [Cleanup] none
