# Lottery Draws - Global Checksum Validation Enhancement Test Plan (verified against live dev app)

## Application Overview

Release-level QA plan for the Global Checksum Validation Enhancement of Lottery Draws (BigWin admin dev: https://e763fesnjnk.dev.accelr.net/dashboard/draw), explored live on 2026-11-22 with 7 own draws (ids 1066-1072, codes AT9032985510..AT9032985521, brand Mahajana Sampatha; one imminent draw for In Play / In Play Post Cutoff). FORMAT follows specs/lottery-draw-test-plan.md: title 'TC-LD-CHK-NNN: [TCxx] ...'; step 1 of every scenario is a [Meta] step (Objective, Priority Blocker/Critical/Normal/Minor, Preconditions, Test Data); last step [Cleanup]; tags [Verified live] = confirmed on the live app, [Not verifiable: reason] = steps written but not executable in this exploration, [DEFECT] = scenario states the CORRECT behaviour that the app currently fails (must stay failing, never fixme/skip) with an 'ACTUAL' line, [ASSUMPTION - needs confirmation] = expected result not specified by the brief. CONVENTIONS: authenticatedPage fixture, combinedTest, helpers only in utils/helpers/lottery-draw (add checksum helpers there: createDrawWithFile, addTicketsAndVerify, deleteDrawAndVerify, expectChecksumRejected), codes AT<draw number>, draw number = file number (9032985510..21), far-future schedules (2028-2029, a different draw date per draw), run --workers=1, specs describe.configure({ mode: 'default' }). Never act on a draw the test did not create; never click Log out / Send Code to Mobile. ONE-SHOT DATA RULE: a DBF checksum stays globally registered while its draw is NOT deleted, so every test must DELETE its draws in afterEach (Under Review/Pending Approval/Approved/On Hold: row menu 'Hold Draw' then 'Remove Draw' + type code; Rejected: row menu 'Delete') - this releases the checksum so the same files can be reused by the next test and the next run. Rejecting alone does NOT release (assumed, see Assumptions).

OBSERVED RULES (live): (1) ALGORITHM: MD5, 32 lowercase hex chars. The SERVER recomputes the MD5 of the uploaded file and compares with the typed value; mismatch = 400 'Invalid MD5 checksum. The checksum entered does not match the ticket file.' (also at create). Because the typed MD5 must equal the real MD5, a 'new DBF + checksum used by another draw' can only be produced with a byte-identical file under another name (F10-COPY) - the checksum, not the file name, identifies a DBF. At upload the MD5 is case-INSENSITIVE and trimmed (upper-case and ' md5 ' accepted), at approval it is case-SENSITIVE and not trimmed (see TC-LD-CHK-078/079). (2) WHERE CHECKED: (a) Create Draw: POST ticket-service upload/private (file to S3, no validation) -> POST /api/draw/create (201, draw ALWAYS created first) -> POST ticket-service/api/v1/ticket-upload {dbfFileUrl, md5Checksum, scheduledAt, drawId} which runs the global check. If it fails (400) the UI returns to the list with toast 'Draw created, but ticket upload failed: <message> Use "Add Tickets" on the draw to upload the ticket file.' and the draw EXISTS with 0 tickets (Under Review) = orphan draw (TC-LD-CHK-004). (b) Add Tickets (row menu): two dialogs - 'Upload Files' (Browse files, Cancel, Add -> POST upload/private) then 'Add Ticktes' (typo; MD5 Checksum, Initiate Now, Scheduled At, Cancel, Create -> POST ticket-upload with the same payload). Success = 201, no toast; failure = 400 toast with the message below PLUS a misleading 'DBF Upload successful' toast. (c) Approval PUT /api/draw/approve/{drawId}/{md5}: 200 {status:success} or 400 {error:'Error reviewing draw due to Invalid MD5 checksum provided.'} (dialog stays open, stage unchanged). Approval compares the md5 with the draw's LATEST upload (after Add Tickets the original md5 is rejected) - no cross-draw global message was reachable at approval through the UI. (3) ERROR MESSAGES (ticket-upload 400): 'This ticket file has already been uploaded to another draw (AT<holder code>). Please use a different ticket file.' (checksum held by another NON-DELETED draw, incl. On Hold; names the holder code) ; 'This ticket file has already been uploaded to this draw. Please use a different ticket file.' (same checksum already on the same draw); 'MD5 checksum is required.' (API, missing md5); 'Lottery draw not found with ID: n' (404, deleted/unknown draw). (4) DBF DUPLICATION (existing-DBF rule) is INDEPENDENT of the checksum and is ASYNCHRONOUS and per-draw: a file with the same ticket barcodes but a NEW checksum (F10-MOD / F11-MOD, same name and barcodes as F10/F11) is ACCEPTED at upload (201, upload id returned, no warning toast); on the draw it is only visible later: draw page > Logs table row 'Error Occurred' when the barcodes already exist on THAT draw, download = logFile.csv 'Barcode,Status,Reason' rows like '09032985511069,Rejected,Ticket already exists for draw ID 1067 (rows: 70)'; ticket total unchanged (100). The same barcodes on a DIFFERENT draw are accepted and loaded (AT9032985510 and AT9032985520 both held 09032985510001-100) - see assumption A-9. Process Logs dialog (list page) only lists winning-number jobs, NOT ticket uploads; ticket upload status lives in the draw page 'Logs' table (Scheduled / Completed / Error Occurred) and 'Operation logs' (e.g. 'ticket file processing is failed for draw id : n due to MD5 checksum mismatch!' Bad Request, '... due to already exist ticket file in draw id : n!' Conflict, 'Successfully scheduled tickets upload for draw id : n'). (5) Corrupt DBFs (header only, truncated) with their correct MD5 are ACCEPTED at upload (201) and fail asynchronously ('Error Occurred'); a failed/corrupt upload does NOT keep the checksum reserved (the same corrupt file was then accepted on another draw). (6) DELETE: row menu 'Hold Draw' (PUT ticket-service lottery-draw/toggle-hold/{id}/1, no confirm, status 'On Hold <stage>') then 'Remove Draw' (dialog 'Enter This Draw Code For Confirmation : <code>', button disabled until the exact code is typed) = DELETE ticket-service/api/v1/lottery-draw/{id} (200; audit log type 'Soft Delete', 'removed successfully'). The draw is renamed '<code>-DELETED-yyyyMMddHHmmss' (code AND draw number), disappears from All and appears only in the Deleted tab (status text 'On Hold On Hold Under Review' / 'On Hold Approved'); its checksum is released at once (reusable: F10-COPY on another draw 201, F10 recreated with the SAME draw number and code 201/201, both DBFs of a 2-DBF deleted draw reusable, Approved draw deletable after Hold). Rejected draws offer 'Delete' (DELETE lottery-draw/{id}, no confirmation). Deleted draws still offer Edit / Add Tickets / Activate Draw / Remove Draw but they fail (Activate = 500 'Error toggle lottery draw status due to The lottery draw does not exist.', Add Tickets = 404 'Lottery draw not found with ID: n') and the deleted draw's page shows 'undefined | undefined', 'Invalid date' - there is NO restore. (7) ADD TICKETS PER STATUS: Under Review, Pending Approval, Approved (menu View/Add Tickets/Quick Settings/Hold Draw), In Play (View/Add Tickets/Quick Settings/Set Draw Showing Order/Hold Draw) and In Play Post Cutoff (adds Returnable Ticket Letter, Text/PDF Sales Report ...) ALL permit Add Tickets; a SUCCESSFUL add (new checksum) moves an Approved / In Play / In Play Post Cutoff draw back to Under Review (even after its issue start/cutoff, needing Review + Approve with the LATEST upload's md5; the draw then returns to In Play / Post Cutoff on the status job after ~1-6 min); a REJECTED add changes nothing (status and ticket count unchanged). (8) STATUS JOB: Approved -> In Play about 1-6 minutes after Issue Start; In Play -> In Play Post Cutoff after Cutoff. (9) Review is refused until tickets have loaded: 400 'This draw has no tickets. Please upload tickets before reviewing the draw.' (poll).

DEFECTS / FINDINGS OBSERVED (each has its own scenario): [F1] failed upload at create leaves an orphan draw with 0 tickets (004); [F2] Add Tickets rejection shows a contradictory 'DBF Upload successful' toast next to the error toast and the dialog is titled 'Add Ticktes' (021); [F3] Approve returns 200 {status:success} and the draw becomes Approved but a toast 'Internal Server Error' is shown (seen 5 times, always on draws with 2 or more uploads) (016); [F4] approval accepts the md5 of an upload whose processing FAILED (corrupt TRUNCATED file on AT9032985520, errored F11-MOD on AT9032985511), i.e. the draw is approved with a file that never loaded, and while the same checksum is also registered on another draw's errored upload (015); [F5] approval wording says 'Error reviewing draw' (009); [F6] md5 case/whitespace handled differently at upload vs approval (078, 079); [F7] adding tickets silently reverts Approved / In Play / Post Cutoff draws to Under Review - sales stop (044, 046, 051) [ASSUMPTION - may be by design]; [F8] deleted-draw page/menu defects (036, 038); [F9] same ticket barcodes accepted on two draws (A-9); [F10] corrupt DBF accepted by the upload API, failure only asynchronous and no reason on the draw page for the corrupt file (076); [F11] Remove Draw asks for the code but Rejected 'Delete' has no confirmation (035/039); [F12] audit log shows 'Failed to reject lottery draw ... does not exist (Internal Server Error)' when acting on a deleted draw. The previous plan's note 'a removed draw vanishes from every tab incl. Deleted' is outdated: it IS listed in the Deleted tab under the renamed code.

## Test Scenarios

### 1. 1. CRT - First upload / draw creation

**Seed:** `tests/seed.spec.ts`

#### 1.1. TC-LD-CHK-001: [TC01] New draw + new DBF + new checksum is created and Under Review [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: happy path of the first upload - nothing is registered yet. Priority: Blocker. Preconditions: logged in; F10 has no non-deleted holder. Test Data: draw 9032985510 / AT9032985510, file base/9032985510.dbf (F10), md5 27521613fe004cd989dd46c832622346, far-future dates (2028-01-08 / 01-10 / 01-10 12:00), mega prize 1000000.
    - expect: Meta recorded
  2. Create Draw Step 1 (brand Mahajana Sampatha) > Next (native confirm 'Are you sure you want to create darw?') > Select File F10 > Add > MD5 = F10 md5 > tick Initiate Now > Create Draw. Capture network.
    - expect: POST upload/private 200, POST /api/draw/create 201 {results:id}, POST ticket-upload 201 {results:uploadId}
    - expect: toasts 'Draw Created Successful' and 'File uploaded'; list page /dashboard/draw
  3. Search AT9032985510 on All tab; poll until Ticket Count = 100; open the draw page.
    - expect: Row Status 'Under Review', Ticket Count 100, Bought 0, Remaining 100
    - expect: Draw page Logs table: one row Upload Status 'Completed'; Operation logs 'Lottery draw created successfully with code: AT9032985510' and 'Successfully scheduled new tickets upload for draw id : <id>'
  4. [Cleanup] Hold Draw > Remove Draw (type code) so the F10 checksum is released.
    - expect: Draw only in Deleted tab

#### 1.2. TC-LD-CHK-002: [TC02] New draw whose DBF carries a checksum already used by another non-deleted draw fails the global checksum check [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: global duplicate check at first upload. Priority: Blocker. Preconditions: holder draw AT9032985510 (F10, Under Review, NOT deleted). Test Data: second draw 9032985521 / AT9032985521 with copy/9032985510_COPY.dbf (F10-COPY, different name, byte-identical = same md5 27521613fe004cd989dd46c832622346). NOTE: F11 with F10's md5 only gives the 'does not match the ticket file' message (see 067) - that is NOT the global check.
    - expect: Meta recorded
  2. Create the holder with F10 (as TC-LD-CHK-001). Then create AT9032985521 with F10-COPY and md5 27521613... > Create Draw.
    - expect: POST /api/draw/create 201 (draw is created first)
    - expect: POST ticket-upload 400 {errors:[{errorMessage:'This ticket file has already been uploaded to another draw (AT9032985510). Please use a different ticket file.'}]}
    - expect: toast 'Draw created, but ticket upload failed: This ticket file has already been uploaded to another draw (AT9032985510). Please use a different ticket file. Use "Add Tickets" on the draw to upload the ticket file.'
  3. Search AT9032985521; open draw page.
    - expect: Draw exists Under Review with Ticket Count 0 and NO upload row in Logs (see 004 for the orphan-draw defect)
    - expect: Holder AT9032985510 unchanged: 100 tickets, still Under Review
  4. [Cleanup] Remove both draws (Hold > Remove).
    - expect: Both in Deleted tab

#### 1.3. TC-LD-CHK-003: [TC03] Existing DBF (same name and ticket barcodes) + NEW checksum - DBF duplication is independent of the checksum rule [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_crt.spec.ts`

**Steps:**
  1. [Meta] Objective: prove the two validations are independent. Priority: Critical. Preconditions: AT9032985510 holds F10. Test Data: second draw 9032985520 / AT9032985520 with modified/9032985510.dbf (F10-MOD: same file name and same barcodes 09032985510001-100 as F10, one ticket changed, md5 2ac55e6bdaf2e4fdf9d802faf5ff7948).
    - expect: Meta recorded
  2. Create holder AT9032985510 (F10) then create AT9032985520 with F10-MOD + its md5.
    - expect: draw/create 201 and ticket-upload 201 {results:1228}; NO DBF-duplication or checksum message, no failure toast
    - expect: (observed) the draw is created Under Review and loads 100 tickets, upload row 'Completed' - the same barcodes on a DIFFERENT draw are not blocked
  3. Check Tickets / Logs of both draws.
    - expect: Both draws show 100 tickets; holder untouched
    - expect: [ASSUMPTION - needs confirmation] A-9: brief says a DBF-duplication warning 'may' appear - on the live app NO warning appears when barcodes only repeat across different draws
  4. [Cleanup] Remove both draws.
    - expect: released

#### 1.4. TC-LD-CHK-004: Failed first upload must not leave a half-created draw (orphan with 0 tickets) [DEFECT] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_crt.spec.ts`

**Steps:**
  1. [Meta] Objective: failed operations must not leave wrong draws/associations. Priority: Critical. Preconditions: holder AT9032985510 (F10). Test Data: AT9032985521 + F10-COPY (global checksum failure) and, second variant, draw 9032985511 + base/9032985511.dbf with md5 of F10 (mismatch).
    - expect: Meta recorded
  2. Run both failing creations, then search the code on the All tab.
    - expect: CORRECT: creation is atomic - no draw row for the failed code, or an explicit warning that an EMPTY draw was created. ACTUAL: POST /api/draw/create already returned 201, the draw (ids 1068 / 1067) is listed Under Review with Ticket Count 0, consuming draw number and code; for the mismatch variant the UI silently returns to the list (console 'Error uploading ticket file', 400 'Invalid MD5 checksum. The checksum entered does not match the ticket file.') and the toast was not captured
  3. [Cleanup] Hold + Remove the orphan draws and the holder.
    - expect: released

#### 1.5. TC-LD-CHK-005: Retrying creation with the same draw number / code after a failed first upload [Not verifiable: orphan draw consumes the number; not attempted] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_crt.spec.ts`

**Steps:**
  1. [Meta] Objective: user can recover from the failure in 002/004. Priority: Normal. Preconditions: orphan draw AT9032985521 exists (0 tickets). Test Data: F21 base/9032985521.dbf md5 be67db5e6e59543e3238c315d340a46c.
    - expect: Meta recorded
  2. Option A: on the orphan draw use row menu Add Tickets with F21 (new DBF + new checksum). Option B: Create Draw again with the same number/code.
    - expect: Option A succeeds (201) and the draw reaches 100 tickets (verified with another empty draw)
    - expect: Option B - expected result not specified (duplicate code/number blocked or allowed?) - confirm with product
  3. [Cleanup] Remove draw.
    - expect: released

#### 1.6. TC-LD-CHK-006: A failed creation does not reserve the checksum - it is usable after the holder is deleted [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_crt.spec.ts`

**Steps:**
  1. [Meta] Objective: no wrong registration after failure. Priority: Critical. Preconditions: orphan draw AT9032985521 (from 002), holder AT9032985510 (F10). Test Data: F10-COPY.
    - expect: Meta recorded
  2. Delete the holder (Hold > Remove). On the orphan draw row menu > Add Tickets > F10-COPY + md5 27521613... > Create.
    - expect: POST ticket-upload 201, no toast; draw reaches 100 tickets, Under Review - the failed creation had not registered anything for the orphan
  3. [Cleanup] Remove draw.
    - expect: released

#### 1.7. TC-LD-CHK-007: Create-draw success and failure feedback texts [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_crt.spec.ts`

**Steps:**
  1. [Meta] Objective: user-visible messages at creation. Priority: Normal. Preconditions: as 001/002. Test Data: F10, F10-COPY.
    - expect: Meta recorded
  2. Observe toasts for success (001) and for global-checksum failure (002); inspect the Create Draw native confirm.
    - expect: Success: 'Draw Created Successful' + 'File uploaded'
    - expect: Failure: 'Draw created, but ticket upload failed: <server message> Use "Add Tickets" on the draw to upload the ticket file.'
    - expect: Minor: confirm text typo 'create darw' (known)
  3. [Cleanup] Remove draws.
    - expect: released

### 2. 2. APR - Draw approval (second global check)

**Seed:** `tests/seed.spec.ts`

#### 2.1. TC-LD-CHK-008: [TC04] Under Review draw with new DBF + new checksum is approved [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: approval happy path. Priority: Blocker. Preconditions: own draw Under Review with 100 tickets loaded. Test Data: draw 9032985511 / AT9032985511 + F11 (base/9032985511.dbf, md5 83230a30512dde49dd35ba4580ce2eea), far-future.
    - expect: Meta recorded
  2. Create the draw, poll Review Draw until the stage is Pending Approval (Review is refused 400 'This draw has no tickets...' while tickets load), then Approve Draw with F11 md5.
    - expect: PUT /api/draw/review/{id} 200; PUT /api/draw/approve/{id}/83230a30... 200 {status:'success'}
    - expect: Row Status 'Approved'; menu View/Add Tickets/Quick Settings/Hold Draw
  3. [Cleanup] Hold > Remove Draw.
    - expect: released

#### 2.2. TC-LD-CHK-009: [TC05] Approval with a checksum that belongs to another non-deleted draw is rejected and the draw stays Pending Approval [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: approval refuses a foreign checksum. Priority: Blocker. Preconditions: draw A (9032985520, F10-MOD, Pending Approval) and draw B holder (9032985510, F10, not deleted). Test Data: md5 of B = 27521613fe004cd989dd46c832622346 typed into A's Approve dialog.
    - expect: Meta recorded
  2. Approve A with B's md5.
    - expect: PUT /api/draw/approve/{A}/27521613... 400 {error:'Error reviewing draw due to Invalid MD5 checksum provided.'}; toast same text; dialog stays open
    - expect: [DEFECT-minor F5] wording says 'reviewing' on an approve action; message does not say whether the md5 is simply wrong or belongs to another draw
  3. Close dialog, reload.
    - expect: A still 'Pending Approval' (not Approved, not Under Review); B untouched
  4. [Cleanup] Reject A (Reject > back to Under Review) then Hold/Remove both.
    - expect: released

#### 2.3. TC-LD-CHK-010: [TC05-true] Checksum taken by another draw between creation and approval is detected at approval [Not verifiable: the UI blocks the duplicate at upload, so no state with two non-deleted draws on one checksum can be built; needs a race (CON) or DB/API fixture]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: the approval check uses the CURRENT global registration. Priority: Blocker. Preconditions: draw A Pending Approval registered with checksum X; the registration of X is moved to draw B by an out-of-band fixture (DB update or concurrent upload while A's registration is released). Test Data: F12 + any second draw.
    - expect: Meta recorded
  2. Approve A with X.
    - expect: Approval fails (400) with a message naming the other draw; A stays Pending Approval; B keeps X
    - expect: [ASSUMPTION - needs confirmation] exact message/code
  3. [Cleanup] Remove draws.
    - expect: released

#### 2.4. TC-LD-CHK-011: DBF-duplication check and checksum check at approval are independent [Not verifiable: approval exposes only one MD5 comparison; DBF duplication is evaluated at ticket processing, not at approval] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: a draw whose latest upload had duplicate barcodes (Error Occurred) but a unique checksum, and a draw with new tickets but foreign checksum, are judged by their own rule. Priority: Normal. Preconditions: draw with F11 then F11-MOD (Error Occurred, 100 tickets). Test Data: F11, F11-MOD md5 3490b490a8c329aff9dc979910df97eb.
    - expect: Meta recorded
  2. Review and approve with the F11-MOD md5.
    - expect: Observed: approval 200 (the errored upload's md5 is accepted) - see 015 [DEFECT]. Expected per brief: DBF duplication independent of checksum - confirm whether approval should be blocked by a failed upload
  3. [Cleanup] Remove draw.
    - expect: released

#### 2.5. TC-LD-CHK-012: A failed approval neither reserves nor releases a checksum [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: failed approval leaves the global registration unchanged. Priority: Critical. Preconditions: holder B (9032985510, F10) and A (9032985520, F10-MOD) Pending Approval. Test Data: B md5, A md5 2ac55e6bdaf2e4fdf9d802faf5ff7948.
    - expect: Meta recorded
  2. Approve A with B's md5 (fails 400). Then Add Tickets F10-COPY to a third draw; then Approve A with its own md5.
    - expect: F10-COPY still rejected 'already uploaded to another draw (AT9032985510)' - the failed approval did not release B's checksum
    - expect: A approves with its own md5 (200) - the failed attempt did not reserve or lock anything; no new checksum registered for A by the failed attempt
  3. [Cleanup] Remove all draws.
    - expect: released

#### 2.6. TC-LD-CHK-013: Draw status, tickets and uploads after a failed approval [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: status integrity. Priority: Critical. Preconditions: as 012. Test Data: as 012.
    - expect: Meta recorded
  2. After each failed approve (wrong md5, upper-case md5, 31 chars, 33 chars, invalid char) read the row and the draw page.
    - expect: Every attempt 400 'Error reviewing draw due to Invalid MD5 checksum provided.'; stage 'Pending Approval'; Ticket Count unchanged; Logs table unchanged; no 'approved' operation log
  3. [Cleanup] Remove draws.
    - expect: released

#### 2.7. TC-LD-CHK-014: Approval validates the md5 of the LATEST upload (after Add Tickets the original md5 is rejected) [Verified live] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: which md5 approval expects when a draw has several DBFs. Priority: Critical. Preconditions: draw 9032985512 Approved, then Add Tickets A12 (base F12 + additional/9032985512_ADD.dbf md5 8d2660220fbfadbdf15b6b04af7e3b87) which returns it to Under Review. Test Data: F12 md5 21f36a846f7a4b2b1c5944628040bdb0.
    - expect: Meta recorded
  2. Review again; approve with F12 md5 then with A12 md5.
    - expect: F12 md5: 400 'Error reviewing draw due to Invalid MD5 checksum provided.'; A12 md5: 200, Approved
    - expect: Confirm with product that the LAST upload is the intended reference and what happens to earlier DBFs
  3. [Cleanup] Remove draw.
    - expect: released

#### 2.8. TC-LD-CHK-015: Approval must not accept the md5 of an upload whose processing FAILED [DEFECT] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: approval proves the DBF loaded. Priority: Critical. Preconditions: draw with a successful upload and a latest upload that ends 'Error Occurred'. Test Data: draw 9032985511 with F11 then F11-MOD (duplicate barcodes -> Error Occurred); also draw 9032985520 with F10-MOD, A12, header-only and truncated corrupt files.
    - expect: Meta recorded
  2. Review and Approve using the md5 of the failed upload (3490b490... / 6d14df8a3c0805d6e3842d90a3c24912).
    - expect: CORRECT: approval refused (the file's tickets never loaded). ACTUAL: 200 success, Approved; for the truncated file its checksum was ALSO still on another draw's failed upload (AT9032985513) and no global message appeared
  3. [Cleanup] Remove draws.
    - expect: released

#### 2.9. TC-LD-CHK-016: Successful approval must not show an 'Internal Server Error' toast [DEFECT] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: clean approval feedback. Priority: Normal. Preconditions: draw with 2+ uploads in Pending Approval. Test Data: F11 + F11-MOD (or F12 + A12).
    - expect: Meta recorded
  2. Approve with the latest md5 and read toasts and network.
    - expect: CORRECT: no error toast. ACTUAL: PUT /api/draw/approve/{id}/{md5} 200 {status:'success'}, draw becomes Approved, yet toast 'Internal Server Error' is displayed (5 of 5 approvals of multi-upload draws; a single-upload approval shows no toast). Failing request behind the toast not identified
  3. [Cleanup] Remove draw.
    - expect: released

### 3. 3. ADD-UR - Additional DBF upload on an Under Review draw

**Seed:** `tests/seed.spec.ts`

#### 3.1. TC-LD-CHK-017: [TC06] Add Tickets: existing DBF (same barcodes) + new checksum [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: DBF duplication independent from checksum. Priority: Critical. Preconditions: Under Review draw 9032985511 already loaded with F11 (100 tickets, upload Completed). Test Data: modified/9032985511.dbf (F11-MOD, md5 3490b490a8c329aff9dc979910df97eb).
    - expect: Meta recorded
  2. Row menu > Add Tickets > choose F11-MOD > Add > md5 > Initiate Now > Create.
    - expect: ticket-upload 201, no toast (global checksum is new)
  3. Wait for processing; open draw page; download the new Logs row.
    - expect: New row 'Error Occurred'; logFile.csv 'Barcode,Status,Reason' with 'Ticket already exists for draw ID <id> (rows: n)' for all 100 barcodes; Ticket Total stays 100; earlier row 'Completed' intact
  4. [Cleanup] Remove draw.
    - expect: released

#### 3.2. TC-LD-CHK-018: [TC07] Add Tickets: new DBF + new checksum [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: normal additional upload. Priority: Blocker. Preconditions: Under Review draw 9032985512 with F12. Test Data: additional/9032985512_ADD.dbf (A12, 50 tickets, md5 8d2660220fbfadbdf15b6b04af7e3b87).
    - expect: Meta recorded
  2. Add Tickets A12 + md5 + Initiate Now + Create.
    - expect: ticket-upload 201; Total Tickets 100 -> 150; two Logs rows 'Completed'; stage still Under Review
  3. [Cleanup] Remove draw.
    - expect: released

#### 3.3. TC-LD-CHK-019: [TC08] Add Tickets: new DBF + checksum used by another non-deleted draw is rejected [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: global check on additional upload. Priority: Blocker. Preconditions: holder 9032985510 (F10) non-deleted; target 9032985512 Under Review. Test Data: F10-COPY + md5 27521613fe004cd989dd46c832622346.
    - expect: Meta recorded
  2. Add Tickets F10-COPY to the target.
    - expect: upload/private 200 then ticket-upload 400 'This ticket file has already been uploaded to another draw (AT9032985510). Please use a different ticket file.'; toast shows this text
    - expect: No Logs row added, tickets unchanged, stage unchanged
  3. [Cleanup] Remove both draws.
    - expect: released

#### 3.4. TC-LD-CHK-020: [TC09] Add Tickets: existing DBF + existing checksum - both rules independently [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_ur.spec.ts`

**Steps:**
  1. [Meta] Objective: identical re-upload. Priority: Critical. Preconditions: draw 9032985511 loaded with F11; holder 9032985510 (F10). Test Data: F11 again (same draw), F10 (other draw's file).
    - expect: Meta recorded
  2. Add F11 again to its own draw; then add F10 (original, same name) to 9032985511.
    - expect: Own draw: 400 'This ticket file has already been uploaded to this draw. Please use a different ticket file.'
    - expect: Other draw's file: 400 '... already uploaded to another draw (AT9032985510) ...' - two distinct messages; no changes to either draw
  3. [Cleanup] Remove draws.
    - expect: released

#### 3.5. TC-LD-CHK-021: Add Tickets dialog flow and feedback texts [DEFECT minor] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_ur.spec.ts`

**Steps:**
  1. [Meta] Objective: usability of the flow. Priority: Minor. Preconditions: Under Review draw. Test Data: any rejected upload (F10-COPY vs holder).
    - expect: Meta recorded
  2. Open Add Tickets; Add without a file; then with a file; observe the second dialog; trigger a rejection.
    - expect: No file: toast 'No DB files selected.' and dialog closes
    - expect: Dialog 1 'Upload Files' (Brand: Mahajana Sampatha, Draw: 9032985511) -> Add; Dialog 2 titled 'Add Ticktes' (typo) with MD5 Checksum, Initiate Now, Scheduled At, Cancel, Create; empty md5: Create does nothing (dialog stays)
    - expect: CORRECT: only the error toast on rejection. ACTUAL: toast 'DBF Upload successful' (from the S3 step) is shown next to the rejection error
  3. [Cleanup] Remove draws.
    - expect: released

#### 3.6. TC-LD-CHK-022: Add Tickets to an empty draw (no DBF) with a new file [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_ur.spec.ts`

**Steps:**
  1. [Meta] Objective: recovery of an orphan draw. Priority: Normal. Preconditions: orphan draw 9032985511 (0 tickets, created with a wrong md5). Test Data: F11 + md5 83230a30...
    - expect: Meta recorded
  2. Add Tickets F11.
    - expect: 201; draw reaches 100 tickets, Under Review, one Logs row Completed
  3. [Cleanup] Remove draw.
    - expect: released

#### 3.7. TC-LD-CHK-023: Rejected additional uploads leave status, count and logs unchanged [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_ur.spec.ts`

**Steps:**
  1. [Meta] Objective: failed operations leave no trace. Priority: Critical. Preconditions: draw with F12 loaded. Test Data: F10-COPY (held by another draw), F12 again.
    - expect: Meta recorded
  2. Record row + Logs table, perform both rejected uploads, record again.
    - expect: Identical before/after; Operation logs may add 'processing failed ... MD5 checksum mismatch / already exist ticket file' entries but no new Logs row
  3. [Cleanup] Remove draws.
    - expect: released

### 4. 4. DEL - Deleted draw reuse (HIGHEST priority)

**Seed:** `tests/seed.spec.ts`

#### 4.1. TC-LD-CHK-024: [TC10] Draw exists after deletions elsewhere: new DBF + new checksum still uploads normally [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: baseline - deleting a draw must not affect unrelated uploads. Priority: Critical. Preconditions: a deleted draw (AT9032985510-DELETED-...) exists. Test Data: F13 base/9032985513.dbf md5 5a373610a5211f8b4ce6ea84fb926530, draw 9032985513.
    - expect: Meta recorded
  2. Create and delete a draw with F10; then create 9032985513 with F13.
    - expect: 201/201/201, Under Review, 100 tickets
  3. [Cleanup] Remove draw.
    - expect: released

#### 4.2. TC-LD-CHK-025: [TC11] New DBF + checksum used ONLY by a deleted draw is reusable [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: the core enhancement. Priority: Blocker. Preconditions: draw X (9032985510, F10) created then deleted (Hold Draw > Remove Draw, type AT9032985510); draw Y (9032985521) empty. Test Data: F10-COPY, md5 27521613fe004cd989dd46c832622346.
    - expect: Meta recorded
  2. Remove X (DELETE lottery-draw/{id} 200; row renamed AT9032985510-DELETED-<timestamp>, only in Deleted tab). On Y: Add Tickets F10-COPY + md5.
    - expect: ticket-upload 201, no toast; Y reaches 100 tickets; Logs row Completed
    - expect: Before the deletion the same upload gave 'already uploaded to another draw (AT9032985510)'
  3. [Cleanup] Remove Y.
    - expect: released

#### 4.3. TC-LD-CHK-026: [TC12] Existing DBF (same name + barcodes) + new checksum with a deleted draw present - DBF duplication stays independent [Not verifiable exactly: executed only while the original was NOT deleted; expected result derived from TC03/TC06 behaviour] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: DBF duplication rule unaffected by deletion. Priority: Critical. Preconditions: draw X (F10) deleted. Test Data: modified/9032985510.dbf (F10-MOD, md5 2ac55e6bdaf2e4fdf9d802faf5ff7948), new draw 9032985520.
    - expect: Meta recorded
  2. Create 9032985520 with F10-MOD after X was deleted.
    - expect: Accepted (new checksum): draw created, 100 tickets (barcodes belonged to the deleted draw only); if the same barcodes were already loaded on the SAME draw the upload would end 'Error Occurred' (see 017)
  3. [Cleanup] Remove draw.
    - expect: released

#### 4.4. TC-LD-CHK-027: [TC13] Existing DBF + existing checksum belonging only to a deleted draw: recreate with the exact same DBF, draw number and code [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: delete-and-recreate. Priority: Blocker. Preconditions: AT9032985510 (F10) created and deleted. Test Data: base/9032985510.dbf, md5 27521613..., same number 9032985510, same code AT9032985510, same dates.
    - expect: Meta recorded
  2. Create Draw again with identical data.
    - expect: draw/create 201 {results:new id}, ticket-upload 201; new draw Under Review 100 tickets - number and code are free because the deleted draw was renamed
    - expect: Deleted tab still lists the old renamed draw
  3. [Cleanup] Remove draw.
    - expect: released

#### 4.5. TC-LD-CHK-028: Delete, recreate, delete again, reuse again (repeated generations) [Verified live: generations 1-2; generation 3 follows the same path]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: no residue after repeated cycles. Priority: Critical. Preconditions: none. Test Data: F10, F10-COPY.
    - expect: Meta recorded
  2. Cycle 1: create AT9032985510 (F10) > delete. Cycle 2: add F10-COPY to AT9032985521 > delete it. Cycle 3: recreate AT9032985510 with F10 (201) > Reject > Delete (row menu Delete). Cycle 4: create again with F10.
    - expect: Every cycle succeeds; Deleted tab accumulates renamed rows with different timestamps; the checksum is held by exactly one non-deleted draw at any time (a parallel upload of F10-COPY is always rejected naming that draw)
  3. [Cleanup] Remove draw.
    - expect: released

#### 4.6. TC-LD-CHK-029: Checksum stays protected while its draw is On Hold (held, not deleted) [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: only deletion releases. Priority: Critical. Preconditions: holder 9032985510 (F10). Test Data: F10-COPY on 9032985511.
    - expect: Meta recorded
  2. Hold Draw on the holder (status 'On Hold Under Review'), then Add Tickets F10-COPY to the other draw, then Activate Draw.
    - expect: 400 'already uploaded to another draw (AT9032985510)' while On Hold; Activate returns the holder to 'Under Review'
  3. [Cleanup] Remove draws.
    - expect: released

#### 4.7. TC-LD-CHK-030: Checksum stays protected after the holder is Rejected (not deleted) [Verified live 2026-11-23 - automated smoke] [Expected result confirmed by product 2026-11-23]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: a rejected (but not deleted) draw is 'non-deleted'. Priority: Critical. Preconditions: holder (F10) rejected (Reject Draw -> Rejected tab). Test Data: F10-COPY on a second draw.
    - expect: Meta recorded
  2. Add F10-COPY to the second draw.
    - expect: Expected: rejected '... already uploaded to another draw (AT9032985510)' per the brief (only DELETED draws release). Confirm - a rejected draw may be considered finished by the business
  3. [Cleanup] Delete the rejected holder (row menu Delete), remove the other draw.
    - expect: released

#### 4.8. TC-LD-CHK-031: Delete a draw whose checksum is also referenced by a non-deleted draw - the checksum stays protected [Not verifiable: the UI never lets two non-deleted draws share a checksum; needs a fixture/race]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: a checksum must not become reusable while another non-deleted draw references it. Priority: Blocker. Preconditions: draws P and Q both registered on checksum X (created via DB/API fixture or a race, see CON). Test Data: F10 family.
    - expect: Meta recorded
  2. Delete P. Then Add Tickets F10-COPY to a third draw R.
    - expect: R rejected naming Q; Q keeps its upload; after Q is deleted R can upload
  3. [Cleanup] Remove all.
    - expect: released

#### 4.9. TC-LD-CHK-032: Deleting the original draw after another draw reused the checksum must not release it [Not verifiable: the original has to be deleted FIRST to allow the reuse; reversed order covered by 025/028]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: deleting an already deleted draw / its leftovers is a no-op for the new owner. Priority: Critical. Preconditions: X deleted, Y owns the checksum (025). Test Data: F10-COPY.
    - expect: Meta recorded
  2. Try Remove Draw / Activate / Add Tickets again on the deleted X row (Deleted tab), then Add F10 to a third draw.
    - expect: Actions on X fail (500 / 404) and the third upload is still rejected naming Y
  3. [Cleanup] Remove Y.
    - expect: released

#### 4.10. TC-LD-CHK-033: Deleting a draw with several DBFs releases ALL its checksums [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: multi-DBF draw. Priority: Critical. Preconditions: draw 9032985513 with F13 and A15 (additional/9032985515_ADD.dbf md5 5dd64e1205ba2266a77f99468c5c6b7c, both Completed, 150 tickets). Test Data: target draw 9032985510.
    - expect: Meta recorded
  2. Remove 9032985513. Add F13 then A15 to the target.
    - expect: Before delete both are rejected 'already uploaded to another draw (AT9032985513)'; after delete both 201
  3. [Cleanup] Remove draws.
    - expect: released

#### 4.11. TC-LD-CHK-034: Deleting an Approved draw (Hold then Remove) releases its checksums [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: delete from Approved. Priority: Critical. Preconditions: Approved draw 9032985520 (F10-MOD + A12). Test Data: A12 md5 8d2660220fbfadbdf15b6b04af7e3b87 to another draw.
    - expect: Meta recorded
  2. Hold Draw (status 'On Hold Approved') > Remove Draw > Add A12 to another draw.
    - expect: Remove succeeds, renamed row in Deleted tab with status 'On Hold Approved'; A12 upload 201
  3. [Cleanup] Remove draws.
    - expect: released

#### 4.12. TC-LD-CHK-035: Remove Draw flow, confirmation and endpoints [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: delete mechanics. Priority: Normal. Preconditions: own Under Review draw. Test Data: F10.
    - expect: Meta recorded
  2. Hold Draw (PUT ticket-service lottery-draw/toggle-hold/{id}/1 200, no confirm); Remove Draw; type a wrong code; type the code; confirm.
    - expect: Dialog 'Enter This Draw Code For Confirmation : AT9032985510'; button disabled for 'WRONG'; DELETE ticket-service/api/v1/lottery-draw/{id} 200; no toast; code and draw number become '...-DELETED-yyyyMMddHHmmss'; not in All/Under Review, only in Deleted tab
    - expect: [DEFECT-minor F11] Rejected rows offer 'Delete' with no confirmation at all (200 immediately), inconsistent with Remove Draw
  3. [Cleanup] none (already deleted).
    - expect: released

#### 4.13. TC-LD-CHK-036: Restore / Activate of a deleted draw [DEFECT] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: no restore exists, and menu must not offer failing actions. Priority: Normal. Preconditions: deleted draw X. Test Data: X.
    - expect: Meta recorded
  2. Deleted tab > X row menu.
    - expect: Menu offers View, Edit, Add Tickets, Quick Settings, Activate Draw, Remove Draw. CORRECT: only View (read-only) or a working Restore. ACTUAL: Activate Draw = PUT toggle-hold/{id}/0 500 'Error toggle lottery draw status due to The lottery draw does not exist.' toast 'Error in enable lottery draw'; X stays in Deleted; no second non-deleted draw can end up holding the checksum
  3. [Cleanup] none.
    - expect: n/a

#### 4.14. TC-LD-CHK-037: Add Tickets on a deleted draw fails and registers nothing [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: no leaked registration. Priority: Critical. Preconditions: deleted draw X. Test Data: A13 additional/9032985513_ADD.dbf md5 db37bad2845e56ab70516386b952ec27.
    - expect: Meta recorded
  2. Deleted tab > X > Add Tickets > A13.
    - expect: upload/private 200; ticket-upload 404 {errorMessage:'Lottery draw not found with ID: <id>'}; toasts 'Lottery draw not found with ID: <id>' and 'DBF Upload successful'
  3. Add A13 to a live draw.
    - expect: 201 - A13 was not registered by the failed call
  4. [Cleanup] Remove draws.
    - expect: released

#### 4.15. TC-LD-CHK-038: History and DBF associations of a deleted draw are untouched [DEFECT: page shows undefined] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: audit trail retained. Priority: Normal. Preconditions: deleted draw X (had F10 Completed). Test Data: X id.
    - expect: Meta recorded
  2. Open /dashboard/draw/edit-lottery-draw?drawId=<X id>.
    - expect: Logs table still lists the 'Completed' upload; Operation logs keep 'Lottery draw created ...', 'Soft Delete ... removed successfully!' and later failures ('Lottery draw with id : n is not found to upload tickets!' 404, 'Failed to reject lottery draw ... does not exist' 500)
    - expect: CORRECT: heading '<code> | Mahajana Sampatha' and field values. ACTUAL: heading 'undefined | undefined', 'Revenue LKR undefined', dates 'Invalid date', empty fields
  3. [Cleanup] none.
    - expect: n/a

#### 4.16. TC-LD-CHK-039: Permanent delete does not exist; Rejected 'Delete' is also a soft delete that releases the checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_del.spec.ts`

**Steps:**
  1. [Meta] Objective: delete variants. Priority: Normal. Preconditions: Rejected draw holding F10. Test Data: F10-COPY on another draw.
    - expect: Meta recorded
  2. Rejected tab > row menu (View, Quick Settings, Delete) > Delete (DELETE lottery-draw/{id} 200). Then add F10-COPY elsewhere.
    - expect: Draw leaves Rejected, appears in Deleted renamed; F10-COPY accepted. No UI path performs a permanent (hard) delete - [ASSUMPTION - needs confirmation] whether one is required
  3. [Cleanup] Remove draws.
    - expect: released

### 5. 5. ADD-APR - Additional upload on an Approved draw

**Seed:** `tests/seed.spec.ts`

#### 5.1. TC-LD-CHK-040: Add Tickets is offered on an Approved draw [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: first verify the status permits the action (a restriction would NOT be a checksum pass). Priority: Critical. Preconditions: Approved draw 9032985514 (F14 base/9032985514.dbf md5 7d61c0ec9d36e8c3391ac2a87e1151ce). Test Data: holder draw 9032985510 (F10) for the existing-checksum cases.
    - expect: Meta recorded
  2. Open the row menu of the Approved draw.
    - expect: Items View, Add Tickets (enabled), Quick Settings, Hold Draw
  3. [Cleanup] Remove draws.
    - expect: released

#### 5.2. TC-LD-CHK-041: [TC14] Approved draw: new DBF + new checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: additional upload on Approved. Priority: Blocker. Preconditions: Approved draw. Test Data: A14 additional/9032985514_ADD.dbf md5 ded4b0c9c4813903a72f2b022b4bf80e.
    - expect: Meta recorded
  2. Add Tickets A14.
    - expect: 201; tickets 100 -> 150 when processed
    - expect: [ASSUMPTION - needs confirmation] F7: the draw moves from Approved back to Under Review (observed on AT9032985520 with A12) and must be Reviewed + Approved again with the NEW md5
  3. [Cleanup] Remove draws.
    - expect: released

#### 5.3. TC-LD-CHK-042: [TC15] Approved draw: new DBF + existing checksum is rejected [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: global check on Approved draws. Priority: Blocker. Preconditions: Approved draw; holder 9032985510 (F10). Test Data: F10-COPY.
    - expect: Meta recorded
  2. Add Tickets F10-COPY.
    - expect: 400 'This ticket file has already been uploaded to another draw (AT9032985510).' (toast also shows 'DBF Upload successful'); status stays Approved; tickets unchanged
  3. [Cleanup] Remove draws.
    - expect: released

#### 5.4. TC-LD-CHK-043: [TC16] Approved draw: existing DBF (same name/barcodes) + new checksum [Not verifiable: data gap - needs a modified copy of the Approved draw's own DBF (e.g. modified/9032985514.dbf); prepare with ticket-dbf.service]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: DBF duplication independent from checksum on Approved. Priority: Critical. Preconditions: Approved draw with F14. Test Data: F14-MOD (to be generated: same barcodes as F14, one ticket changed, new md5).
    - expect: Meta recorded
  2. Add Tickets F14-MOD.
    - expect: Expected (from 017): 201 at upload, async 'Error Occurred' with 'Ticket already exists for draw ID n', tickets unchanged
    - expect: [ASSUMPTION - needs confirmation] the draw still returns to Under Review although no ticket was loaded
  3. [Cleanup] Remove draw.
    - expect: released

#### 5.5. TC-LD-CHK-044: [TC17] Approved draw: existing DBF + existing checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: identical re-upload. Priority: Critical. Preconditions: Approved draw (AT9032985520 observed with F10-MOD). Test Data: its own file again.
    - expect: Meta recorded
  2. Add Tickets the same file again.
    - expect: 400 'This ticket file has already been uploaded to this draw. Please use a different ticket file.'; draw stays Approved; Logs unchanged
  3. [Cleanup] Remove draw.
    - expect: released

#### 5.6. TC-LD-CHK-045: Status after a successful add on an Approved draw: back to Under Review and approvable again [Verified live] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_apr.spec.ts`

**Steps:**
  1. [Meta] Objective: status transition integrity. Priority: Critical. Preconditions: Approved draw. Test Data: A14.
    - expect: Meta recorded
  2. Add A14; read status; Review; Approve with A14 md5.
    - expect: Under Review -> Pending Approval -> Approved; approval with the original F14 md5 fails 400 (see 014)
  3. [Cleanup] Remove draw.
    - expect: released

### 6. 6. ADD-INP - Additional upload on an In Play draw (IMMINENT SCHEDULE, @slow)

**Seed:** `tests/seed.spec.ts`

#### 6.1. TC-LD-CHK-046: Add Tickets is offered on an In Play draw [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_inp.spec.ts`

**Steps:**
  1. [Meta] Objective: verify the status permits the action. Priority: Critical. Preconditions: draw 9032985515 / AT9032985515 created with F15 (md5 313a8efc7d1db95f4ac09f7a2ab2ed87) and issue start = now+4 min, cutoff = now+20 min, draw date = now+35 min; reviewed and approved as soon as tickets load; wait for the status job (about 1-6 min after issue start). Test Data: A15 md5 5dd64e1205ba2266a77f99468c5c6b7c; holder 9032985510 (F10).
    - expect: Meta recorded
  2. Poll the row until Status 'In Play'; open the row menu.
    - expect: View, Add Tickets (enabled), Quick Settings, Set Draw Showing Order, Hold Draw
  3. [Cleanup] Hold + Remove Draw (an In Play draw may need Hold first); delete the holder.
    - expect: released

#### 6.2. TC-LD-CHK-047: [TC18] In Play: new DBF + new checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_inp.spec.ts`

**Steps:**
  1. [Meta] Objective: additional upload during play. Priority: Blocker. Preconditions: In Play draw. Test Data: A15.
    - expect: Meta recorded
  2. Add Tickets A15.
    - expect: 201; tickets increase by 50
    - expect: [ASSUMPTION - needs confirmation] F7 (observed with AT9032985512): the draw drops from 'In Play' to 'Under Review' and must be re-reviewed/approved to return to In Play - sales stop meanwhile; confirm that uploading to a running draw should demote it
  3. [Cleanup] Remove draw.
    - expect: released

#### 6.3. TC-LD-CHK-048: [TC19] In Play: new DBF + existing checksum is rejected [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: global check while In Play. Priority: Blocker. Preconditions: In Play draw; holder 9032985510 (F10). Test Data: F10-COPY.
    - expect: Meta recorded
  2. Add Tickets F10-COPY.
    - expect: 400 'already uploaded to another draw (AT9032985510)'; status stays In Play; tickets unchanged
  3. [Cleanup] Remove draws.
    - expect: released

#### 6.4. TC-LD-CHK-049: [TC20] In Play: existing DBF (same barcodes) + new checksum [Not verifiable: data gap - needs modified/9032985515.dbf (F15-MOD)]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_inp.spec.ts`

**Steps:**
  1. [Meta] Objective: independence while In Play. Priority: Critical. Preconditions: In Play draw with F15. Test Data: F15-MOD (to be generated).
    - expect: Meta recorded
  2. Add Tickets F15-MOD.
    - expect: Expected: 201, async 'Error Occurred' with 'Ticket already exists for draw ID n'; tickets unchanged; confirm the draw status after a failed processing
  3. [Cleanup] Remove draw.
    - expect: released

#### 6.5. TC-LD-CHK-050: [TC21] In Play: existing DBF + existing checksum is rejected [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_inp.spec.ts`

**Steps:**
  1. [Meta] Objective: identical re-upload while In Play. Priority: Critical. Preconditions: In Play draw (AT9032985512 observed). Test Data: F15 again.
    - expect: Meta recorded
  2. Add Tickets F15 again.
    - expect: 400 'This ticket file has already been uploaded to this draw. Please use a different ticket file.'; still In Play; tickets unchanged
  3. [Cleanup] Remove draw.
    - expect: released

### 7. 7. ADD-CUT - Additional upload on an In Play Post Cutoff draw (IMMINENT SCHEDULE, @slow)

**Seed:** `tests/seed.spec.ts`

#### 7.1. TC-LD-CHK-051: Add Tickets is offered on an In Play Post Cutoff draw [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_cut.spec.ts`

**Steps:**
  1. [Meta] Objective: verify the status permits the action. Priority: Critical. Preconditions: draw 9032985516 / AT9032985516 with F16 (md5 ad835e60fc1a515ffbf4c4a4423e313b), issue start now+3 min, cutoff now+8 min, draw date now+40 min, approved; wait for In Play Post Cutoff (poll up to 15 min). Test Data: A16 md5 84bea513c993d4a53beaadeee76f869f; holder 9032985510 (F10).
    - expect: Meta recorded
  2. Open the row menu at 'In Play Post Cutoff'.
    - expect: View, Add Tickets (enabled), Quick Settings, Set Draw Showing Order, Returnable Ticket Letter, Returnable Ticket Letter Zip, Text Sales Report, PDF Sales Report, Sales Report Zip, Daily Sales Detail Report, Hold Draw
  3. [Cleanup] Hold + Remove; delete holder.
    - expect: released

#### 7.2. TC-LD-CHK-052: [TC22] Post Cutoff: new DBF + new checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_cut.spec.ts`

**Steps:**
  1. [Meta] Objective: additional upload after cutoff. Priority: Blocker. Preconditions: Post Cutoff draw. Test Data: A16.
    - expect: Meta recorded
  2. Add Tickets A16.
    - expect: 201 (observed on AT9032985512 with A17: 201)
    - expect: [ASSUMPTION - needs confirmation] F7: the draw falls back to 'Under Review' even though cutoff has passed; adding tickets after cutoff is questionable for sold-ticket integrity
  3. [Cleanup] Remove draw.
    - expect: released

#### 7.3. TC-LD-CHK-053: [TC23] Post Cutoff: new DBF + existing checksum is rejected [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: global check after cutoff. Priority: Blocker. Preconditions: Post Cutoff draw; holder 9032985511 or 9032985510. Test Data: F10-COPY (or F11).
    - expect: Meta recorded
  2. Add Tickets F10-COPY.
    - expect: 400 'already uploaded to another draw (<holder code>)'; status stays In Play Post Cutoff
  3. [Cleanup] Remove draws.
    - expect: released

#### 7.4. TC-LD-CHK-054: [TC24] Post Cutoff: existing DBF (same barcodes) + new checksum [Not verifiable: data gap - needs modified/9032985516.dbf (F16-MOD)]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_cut.spec.ts`

**Steps:**
  1. [Meta] Objective: independence after cutoff. Priority: Critical. Preconditions: Post Cutoff draw with F16. Test Data: F16-MOD (to be generated).
    - expect: Meta recorded
  2. Add Tickets F16-MOD.
    - expect: Expected: 201 then async 'Error Occurred'; tickets unchanged
  3. [Cleanup] Remove draw.
    - expect: released

#### 7.5. TC-LD-CHK-055: [TC25] Post Cutoff: existing DBF + existing checksum is rejected [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_cut.spec.ts`

**Steps:**
  1. [Meta] Objective: identical re-upload after cutoff. Priority: Critical. Preconditions: Post Cutoff draw. Test Data: F16/A16 again.
    - expect: Meta recorded
  2. Add Tickets the same file again.
    - expect: 400 'This ticket file has already been uploaded to this draw. Please use a different ticket file.'; status unchanged
  3. [Cleanup] Remove draw.
    - expect: released

### 8. 8. ADD-PROC - Additional upload after previous DBF processing completed

**Seed:** `tests/seed.spec.ts`

#### 8.1. TC-LD-CHK-056: [TC26] After processing completed: new DBF + new checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: second DBF after the first is fully processed. Priority: Blocker. Preconditions: draw 9032985517 / AT9032985517 with F17 (md5 b7cc4f85c975eb6878bd38ee6a47d19e); poll until Logs row 'Completed' and Ticket Count 100. Test Data: A17 additional/9032985517_ADD.dbf md5 8d9afa45ff560528a409492d9b2011eb.
    - expect: Meta recorded
  2. Add Tickets A17.
    - expect: 201; Total 150; two 'Completed' rows (observed with AT9032985513: F13 + A15 = 150)
  3. [Cleanup] Remove draw.
    - expect: released

#### 8.2. TC-LD-CHK-057: [TC27] After processing completed: new DBF + existing checksum is rejected [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: global check against a fully processed DBF. Priority: Blocker. Preconditions: draw H (F17, Completed) and target draw T. Test Data: F17 content under another name is not available - use F10 family: H = 9032985510 (F10 Completed), T adds F10-COPY.
    - expect: Meta recorded
  2. Add Tickets F10-COPY to T.
    - expect: 400 'already uploaded to another draw (AT9032985510)' (also observed: F13 and A15 rejected on AT9032985512 after AT9032985513 had completed them)
  3. [Cleanup] Remove draws.
    - expect: released

#### 8.3. TC-LD-CHK-058: [TC28] After processing completed: existing DBF (same barcodes) + new checksum [Verified live on AT9032985511 with F11-MOD]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: duplicate barcodes with a new checksum. Priority: Critical. Preconditions: draw 9032985511 with F11 Completed (100). Test Data: F11-MOD.
    - expect: Meta recorded
  2. Add Tickets F11-MOD; wait; open Logs.
    - expect: 201 at upload; row 'Error Occurred'; logFile.csv 100 x 'Rejected, Ticket already exists for draw ID <id> (rows: n)'; total stays 100; first row 'Completed' intact
  3. [Cleanup] Remove draw.
    - expect: released

#### 8.4. TC-LD-CHK-059: [TC29] After processing completed: existing DBF + existing checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: identical re-upload of a processed file. Priority: Critical. Preconditions: draw with F11 Completed. Test Data: F11 again; also F11 on another draw.
    - expect: Meta recorded
  2. Add F11 again (same draw) and to another draw.
    - expect: 'already uploaded to this draw' / 'already uploaded to another draw (AT9032985511)'; nothing changes
  3. [Cleanup] Remove draws.
    - expect: released

#### 8.5. TC-LD-CHK-060: A new upload does not overwrite the previous DBF record [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: history preserved. Priority: Critical. Preconditions: draw with F13 Completed. Test Data: A15.
    - expect: Meta recorded
  2. Add A15; compare the Logs table.
    - expect: Previous row (Created 06:08 PM, Completed) unchanged and a NEW row added on top; both with Download
  3. [Cleanup] Remove draw.
    - expect: released

#### 8.6. TC-LD-CHK-061: The previous checksum stays registered after a later upload [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: both DBFs of a draw keep protection. Priority: Critical. Preconditions: draw 9032985513 with F13 + A15; other draw 9032985512. Test Data: F13, A15 (also md5 upper-case).
    - expect: Meta recorded
  2. Add F13 then A15 (md5 upper-cased) to the other draw.
    - expect: Both 400 'already uploaded to another draw (AT9032985513)'
  3. [Cleanup] Remove draws.
    - expect: released

#### 8.7. TC-LD-CHK-062: The new upload is associated with the right draw and checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: association integrity. Priority: Critical. Preconditions: two draws with different DBFs. Test Data: A17 on draw 9032985517 only.
    - expect: Meta recorded
  2. Add A17 to draw 9032985517; read both draw pages; then try A17 on the other draw.
    - expect: Only 9032985517 has the new row and +50 tickets; the other draw unchanged; second attempt 400 naming AT9032985517
  3. [Cleanup] Remove draws.
    - expect: released

#### 8.8. TC-LD-CHK-063: Already processed tickets are neither corrupted nor duplicated [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: ticket integrity. Priority: Blocker. Preconditions: draw with 100 processed tickets. Test Data: F11-MOD (same barcodes), A12 (new barcodes).
    - expect: Meta recorded
  2. Add F11-MOD then add new tickets; open Quick Settings (Refresh).
    - expect: Total 100 after F11-MOD (all Rejected 'Ticket already exists'); 150 after the new file; Returnable equals Total; no duplicates
  3. [Cleanup] Remove draw.
    - expect: released

#### 8.9. TC-LD-CHK-064: A failed additional upload leaves previous records intact [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: no side effects. Priority: Critical. Preconditions: draw with 1-2 Completed uploads. Test Data: wrong md5, foreign checksum, own checksum.
    - expect: Meta recorded
  2. Submit three failing uploads and compare Logs, ticket total, stage and approval md5.
    - expect: Identical to before; approval still accepts the previous latest md5
  3. [Cleanup] Remove draw.
    - expect: released

#### 8.10. TC-LD-CHK-065: Multiple DBFs per draw [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: several uploads on one draw. Priority: Normal. Preconditions: draw 9032985520 (F10-MOD). Test Data: A12, header-only, truncated.
    - expect: Meta recorded
  2. Add A12 then both corrupt files.
    - expect: Logs lists every upload with its own status (Completed, Completed, Error Occurred x2); total = sum of successfully processed files only (150)
  3. [Cleanup] Remove draw.
    - expect: released

#### 8.11. TC-LD-CHK-066: A corrupt DBF uploaded after a good one fails asynchronously and does not reserve its checksum [Verified live] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_add_proc.spec.ts`

**Steps:**
  1. [Meta] Objective: failed processing must not hold a registration. Priority: Critical. Preconditions: draw D13 (F13). Test Data: corrupt/9032985510_HEADER_ONLY.dbf md5 7e10151a0a595755daf684b94058d802 and corrupt/9032985510_TRUNCATED.dbf md5 6d14df8a3c0805d6e3842d90a3c24912.
    - expect: Meta recorded
  2. Add both to D13 (201, Error Occurred). Then add the same two files to draw D20.
    - expect: Accepted again on D20 (201) - the checksums of failed uploads are NOT reserved
    - expect: Confirm this is intended: two non-deleted draws then reference the same corrupt checksum
  3. [Cleanup] Remove draws.
    - expect: released

### 9. 9. INT - Wrong checksum / file integrity

**Seed:** `tests/e2e/lottery-draw/checksum/seed notes: algorithm = MD5, 32 lowercase hex; server recomputes the file md5`

#### 9.1. TC-LD-CHK-067: Valid file with its valid checksum is accepted [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: control case. Priority: Blocker. Preconditions: draw 9032985518 (F18 md5 7a4bb71296b5bdb8bad393dfdefe77de) created; second draw for adds. Test Data: A15 + md5 5dd64e1205ba2266a77f99468c5c6b7c.
    - expect: Meta recorded
  2. Add A15 with the exact md5.
    - expect: 201, tickets +50
  3. [Cleanup] Remove draws.
    - expect: released

#### 9.2. TC-LD-CHK-068: Modified content with the OLD checksum is rejected [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: server recomputes md5. Priority: Blocker. Preconditions: live draw. Test Data: modified/9032985510.dbf with F10's md5 27521613fe004cd989dd46c832622346 (also create-draw variant: base/9032985511.dbf with F10's md5).
    - expect: Meta recorded
  2. Add Tickets with the mismatching md5; repeat on Create Draw.
    - expect: Add: 400 'Invalid MD5 checksum. The checksum entered does not match the ticket file.'; no Logs row; no registration
    - expect: Create: draw/create 201 then ticket-upload 400 same message - orphan draw (see 004 [DEFECT])
    - expect: Operation log: 'ticket file processing is failed for draw id : n due to MD5 checksum mismatch!' (Bad Request)
  3. [Cleanup] Remove draws.
    - expect: released

#### 9.3. TC-LD-CHK-069: Identical content with a different file name is the SAME DBF (same checksum) [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: identity is content-based. Priority: Critical. Preconditions: holder with F10. Test Data: copy/9032985510_COPY.dbf (md5 27521613fe004cd989dd46c832622346).
    - expect: Meta recorded
  2. Upload the copy to another draw (create and Add Tickets).
    - expect: Rejected 'already uploaded to another draw (AT9032985510)' in both flows
  3. [Cleanup] Remove draws.
    - expect: released

#### 9.4. TC-LD-CHK-070: Modified content with a different file name is a NEW DBF [Not verifiable: no such file prepared; create a renamed copy of modified/9032985510.dbf at test time] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: name irrelevant, content decides. Priority: Normal. Preconditions: holder with F10. Test Data: F10-MOD copied to 9032985510_RENAMED.dbf (md5 2ac55e6bdaf2e4fdf9d802faf5ff7948).
    - expect: Meta recorded
  2. Add Tickets the renamed file to a second draw.
    - expect: Accepted 201 (new checksum); same-barcode behaviour as 017
  3. [Cleanup] Remove draws.
    - expect: released

#### 9.5. TC-LD-CHK-071: Manipulated checksum (one hex char changed) is rejected [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: exact compare. Priority: Critical. Preconditions: live draw. Test Data: A15 with md5 5dd64e1205ba2266a77f99468c5c6b7d (last char changed).
    - expect: Meta recorded
  2. Add Tickets.
    - expect: 400 'Invalid MD5 checksum. The checksum entered does not match the ticket file.'
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.6. TC-LD-CHK-072: Missing checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: required field. Priority: Critical. Preconditions: live draw. Test Data: A15, no md5; API body without md5Checksum.
    - expect: Meta recorded
  2. UI: leave MD5 empty, click Create (Add Tickets) and Create Draw. API: POST ticket-upload without md5Checksum.
    - expect: UI: no request is sent, dialog stays (native required validation); API: 400 'MD5 checksum is required.'
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.7. TC-LD-CHK-073: Empty / whitespace-only checksum [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: empty input. Priority: Normal. Preconditions: live draw. Test Data: md5 '' and '   '.
    - expect: Meta recorded
  2. Submit each.
    - expect: '' blocked client-side (no request); '   ' - [ASSUMPTION - needs confirmation] not verified; expected 400 'MD5 checksum is required.'
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.8. TC-LD-CHK-074: Truncated checksum (31 chars) [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: length. Priority: Critical. Preconditions: live draw. Test Data: A15 md5 first 31 chars (5dd64e1205ba2266a77f99468c5c6b7); at approval 2ac55e6bdaf2e4fdf9d802faf5ff794.
    - expect: Meta recorded
  2. Add Tickets, then approve with a truncated md5.
    - expect: Add: 400 'Invalid MD5 checksum...'; Approve: 400 'Error reviewing draw due to Invalid MD5 checksum provided.'
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.9. TC-LD-CHK-075: Checksum with extra characters (33 chars) [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: length. Priority: Critical. Preconditions: live draw. Test Data: A15 md5 + '0'; approval md5 + 'a'.
    - expect: Meta recorded
  2. Add Tickets and Approve.
    - expect: Both 400 with the messages of 074
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.10. TC-LD-CHK-076: Checksum with invalid characters [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: non-hex input. Priority: Critical. Preconditions: live draw. Test Data: A15 md5 with last char 'g'; approval md5 ending 'z'; also special characters / SQL / HTML such as <b>x</b> and ' OR 1=1 -- [Not verified live].
    - expect: Meta recorded
  2. Add Tickets and Approve.
    - expect: 400 as 074; app does not render HTML / error; no registration
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.11. TC-LD-CHK-077: Corrupted DBF files (header only / truncated) with their correct checksum [DEFECT F10: accepted at upload] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: file validity. Priority: Critical. Preconditions: draw with F13. Test Data: corrupt/9032985510_HEADER_ONLY.dbf (161 B, md5 7e10151a0a595755daf684b94058d802), corrupt/9032985510_TRUNCATED.dbf (3281 B, md5 6d14df8a3c0805d6e3842d90a3c24912).
    - expect: Meta recorded
  2. Add Tickets each with its md5.
    - expect: CORRECT: immediate clear rejection (invalid DBF). ACTUAL: ticket-upload 201 'Successfully scheduled tickets upload'; later Logs rows 'Error Occurred' (one scheduled row stayed 'Scheduled' for minutes); no tickets added; failure reason not shown on the draw page
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.12. TC-LD-CHK-078: Upload accepts an UPPER-CASE md5 but approval rejects it [DEFECT F6] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: consistent case handling. Priority: Critical. Preconditions: draw. Test Data: A15 md5 5DD64E1205BA2266A77F99468C5C6B7C; approval md5 2AC55E6BDAF2E4FDF9D802FAF5FF7948.
    - expect: Meta recorded
  2. Add Tickets with the upper-case md5; later approve with the upper-case md5 of the latest upload.
    - expect: Upload: 201 (case-insensitive, file loaded). Approve: 400 'Error reviewing draw due to Invalid MD5 checksum provided.' CORRECT: the same comparison (case-insensitive or both strict) at both places
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.13. TC-LD-CHK-079: Leading/trailing spaces in the md5 [DEFECT F6] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: trim consistency. Priority: Normal. Preconditions: draw with A15 loaded. Test Data: ' 5dd64e12...6b7c ' and ' 2ac55e6b...7948 '.
    - expect: Meta recorded
  2. Add A15 again with spaces; approve with spaces.
    - expect: Upload trims: 400 'already uploaded to this draw'. Approve: URL /api/draw/approve/{id}/%202ac55e... -> 400 invalid; CORRECT: same trimming at both
  3. [Cleanup] Remove draw.
    - expect: released

#### 9.14. TC-LD-CHK-080: Interrupted upload followed by a retry [Not verifiable: needs network interruption (route.abort / offline) not available in the single MCP session]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_int.spec.ts`

**Steps:**
  1. [Meta] Objective: no half registration after a dropped request. Priority: Critical. Preconditions: live draw; tag @simulated-network. Test Data: A15.
    - expect: Meta recorded
  2. Add Tickets A15 while page.route aborts POST ticket-upload (and a second variant aborting upload/private); then retry normally.
    - expect: First attempt fails with a network error and adds no Logs row; retry succeeds 201 (not 'already uploaded'); only one upload row exists; for a response lost AFTER the server committed: retry gives 'already uploaded to this draw' - confirm acceptable
  3. [Cleanup] Remove draw.
    - expect: released

### 10. 10. CON - Concurrency (two browser contexts / API)

**Seed:** `tests/seed.spec.ts`

#### 10.1. TC-LD-CHK-081: Two admins create draws with the same checksum simultaneously [Not verifiable: needs two parallel sessions; one MCP session]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_con.spec.ts`

**Steps:**
  1. [Meta] Objective: exactly one winner. Priority: Blocker. Preconditions: two authenticated contexts (browser.newContext with the saved storageState). Test Data: F20 (draw 9032985520) vs F20 copy under draw 9032985521 (create byte-identical copy at test time).
    - expect: Meta recorded
  2. Prepare both Create Draw forms to the last click; Promise.all both Create Draw clicks.
    - expect: Exactly one ticket-upload 201; the other 400 'already uploaded to another draw (...)'; only one upload row exists; never two non-deleted draws on one checksum
  3. [Cleanup] Remove draws.
    - expect: released

#### 10.2. TC-LD-CHK-082: Two admins approve draws with the same checksum simultaneously [Not verifiable: same reason; also needs a fixture with two draws on one checksum]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_con.spec.ts`

**Steps:**
  1. [Meta] Objective: approval is atomic. Priority: Blocker. Preconditions: two Pending Approval draws that reference the same md5 (fixture). Test Data: F20-based.
    - expect: Meta recorded
  2. Click Approve in both contexts together.
    - expect: One 200, the other 400; no 500/'Internal Server Error'; stages consistent
  3. [Cleanup] Remove draws.
    - expect: released

#### 10.3. TC-LD-CHK-083: Delete of the holder racing with reuse by another draw [Not verifiable: needs parallel sessions]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_con.spec.ts`

**Steps:**
  1. [Meta] Objective: delete-versus-reuse consistency. Priority: Critical. Preconditions: holder H (F10), draw R empty. Test Data: F10-COPY.
    - expect: Meta recorded
  2. Context 1: Remove Draw H (confirm). Context 2 at the same moment: Add Tickets F10-COPY to R. Repeat with 3 delays (-200 ms, 0, +200 ms).
    - expect: Either R rejected (H still existed) or accepted (H deleted) - never accepted while H remains non-deleted, never a lost registration; retry after the race always succeeds
  3. [Cleanup] Remove draws.
    - expect: released

#### 10.4. TC-LD-CHK-084: Additional upload racing with an upload to ANOTHER draw (same new checksum) [Not verifiable: needs parallel sessions]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_con.spec.ts`

**Steps:**
  1. [Meta] Objective: unique ownership. Priority: Critical. Preconditions: two Under Review draws. Test Data: A15 (md5 5dd64e12...) and its renamed copy.
    - expect: Meta recorded
  2. Add Tickets the same content to both draws simultaneously.
    - expect: One 201, one 400 naming the winner; ticket total of the loser unchanged
  3. [Cleanup] Remove draws.
    - expect: released

#### 10.5. TC-LD-CHK-085: Same DBF / checksum submitted twice simultaneously to the SAME draw (double click / two tabs) [Not verifiable: needs parallel sessions]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_con.spec.ts`

**Steps:**
  1. [Meta] Objective: no duplicate association. Priority: Critical. Preconditions: live draw. Test Data: A15.
    - expect: Meta recorded
  2. Double-click Create in the Add Ticktes dialog; and fire two POST ticket-upload calls with the same body via page.request (Promise.all).
    - expect: One 201, the other 400 'already uploaded to this draw'; exactly one Logs row; tickets +50 once
  3. [Cleanup] Remove draw.
    - expect: released

### 11. 11. API - Database / API / backend

**Seed:** `tests/seed.spec.ts`

#### 11.1. TC-LD-CHK-086: Direct API call cannot bypass the global checksum check [Verified live]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: validation is server-side. Priority: Blocker. Preconditions: holder draw with F10 (non-deleted), target draw T. Test Data: S3 url of an already uploaded F10 file (read from the ticket-upload request of the holder), token from localStorage 'accesstoken' + header x-sales-channel-access-token captured from a live request.
    - expect: Meta recorded
  2. fetch POST https://i73f465kk8.execute-api.ap-south-1.amazonaws.com/ticket-service/api/v1/ticket-upload {dbfFileUrl, md5Checksum:'27521613fe004cd989dd46c832622346', scheduledAt:'', drawId:T}.
    - expect: 400 {status:'error',errors:[{field:null,errorMessage:'This ticket file has already been uploaded to another draw (AT9032985510). Please use a different ticket file.'}]}
  3. [Cleanup] Remove draws.
    - expect: released

#### 11.2. TC-LD-CHK-087: API: missing / wrong checksum and unknown draw [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_api.spec.ts`

**Steps:**
  1. [Meta] Objective: API error contract. Priority: Critical. Preconditions: as 086. Test Data: bodies below.
    - expect: Meta recorded
  2. POST without md5Checksum; with md5 '00000000000000000000000000000000'; with drawId 99999999.
    - expect: 400 'MD5 checksum is required.'; 400 'Invalid MD5 checksum. The checksum entered does not match the ticket file.'; 404 'Lottery draw not found with ID: 99999999'
  3. [Cleanup] none.
    - expect: n/a

#### 11.3. TC-LD-CHK-088: API: approve with a wrong / foreign / malformed md5 [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_api.spec.ts`

**Steps:**
  1. [Meta] Objective: approval endpoint contract. Priority: Critical. Preconditions: Pending Approval draw. Test Data: md5 of another draw, upper-case, 31/33 chars, invalid char.
    - expect: Meta recorded
  2. PUT /api/draw/approve/{id}/{md5} for each.
    - expect: 400 {error:'Error reviewing draw due to Invalid MD5 checksum provided.'}; stage unchanged
  3. [Cleanup] Remove draw.
    - expect: released

#### 11.4. TC-LD-CHK-089: Refresh, retry and repeated submission never duplicate associations [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_api.spec.ts`

**Steps:**
  1. [Meta] Objective: idempotency. Priority: Critical. Preconditions: draw with A15. Test Data: A15.
    - expect: Meta recorded
  2. Reload the list/draw page several times; resubmit the same upload 3 times; browser Back/Forward after Create.
    - expect: Logs keeps exactly one row for the file; resubmits 400 'already uploaded to this draw'; tickets counted once
  3. [Cleanup] Remove draw.
    - expect: released

#### 11.5. TC-LD-CHK-090: No orphaned / stale checksum registrations after failures [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_api.spec.ts`

**Steps:**
  1. [Meta] Objective: registrations match reality. Priority: Critical. Preconditions: none. Test Data: failed upload to a deleted draw (A13 -> 404), mismatch (400), duplicate (400), corrupt (async fail).
    - expect: Meta recorded
  2. After each failure upload the file normally to a live draw (when no holder exists).
    - expect: Always accepted: 404 / 400 failures leave no registration; corrupt async failures also release (see 066). The S3 object created by upload/private remains as an orphan file [ASSUMPTION - needs confirmation: cleanup policy]
  3. [Cleanup] Remove draws.
    - expect: released

#### 11.6. TC-LD-CHK-091: Endpoint inventory of the checksum-relevant calls [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_api.spec.ts`

**Steps:**
  1. [Meta] Objective: contract documentation (ticket-service host https://i73f465kk8.execute-api.ap-south-1.amazonaws.com/ticket-service/api/v1). Priority: Normal. Preconditions: network capture. Test Data: F10 flow.
    - expect: Meta recorded
  2. Record calls.
    - expect: POST /ticket-service/api/v1/upload/private -> 200 {status,results:<s3 url>} (no validation); POST /api/draw/create {code,drawDateTime,drawNumber,drawResult:'',drawStatus:0,issueCutoffDateTime,issueStartDateTime,lotteryBrandId,megaPrize} -> 201 {results:drawId}; POST .../ticket-upload {dbfFileUrl,md5Checksum,scheduledAt,drawId} -> 201 (Create Draw returns {results:uploadId}, Add Tickets returns empty body) / 400 / 404; PUT /api/draw/review/{id}; PUT /api/draw/approve/{id}/{md5}; PUT .../lottery-draw/toggle-hold/{id}/1|0; DELETE .../lottery-draw/{id}; POST .../upload/download/private (log download); POST /api/draw (list)
  3. [Cleanup] none.
    - expect: n/a

#### 11.7. TC-LD-CHK-092: Unauthenticated / expired-token call to ticket-upload [Not verifiable: not attempted] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_api.spec.ts`

**Steps:**
  1. [Meta] Objective: checksum rules are not reachable without auth. Priority: Normal. Preconditions: live draw. Test Data: none.
    - expect: Meta recorded
  2. POST ticket-upload without Authorization / with a garbage token.
    - expect: 401/403 and no registration
  3. [Cleanup] none.
    - expect: n/a

### 12. 12. REG - Regression (15 items)

**Seed:** `tests/seed.spec.ts`

#### 12.1. TC-LD-CHK-093: [REG-01] Draw creation regression [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: creation unchanged for normal data. Priority: Blocker. Preconditions: none. Test Data: F19 + draw 9032985519.
    - expect: Meta recorded
  2. Create with valid data; check Step-1 validations still fire (cutoff before start, draw number 0, mega prize 0).
    - expect: Created Under Review; validation messages as in the main plan (TC-LD-CR)
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.2. TC-LD-CHK-094: [REG-02] Approval regression [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: Review/Approve flow and wrong-md5 error. Priority: Blocker. Preconditions: Under Review draw. Test Data: F19.
    - expect: Meta recorded
  2. Review (400 'This draw has no tickets...' until loaded) then Approve with wrong then right md5.
    - expect: Messages and stages as in 008/009
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.3. TC-LD-CHK-095: [REG-03] Deletion regression (Hold, Remove, Reject, Reject Draw) [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: delete/reject paths. Priority: Critical. Preconditions: three Under Review / Pending Approval draws. Test Data: F19, F20, F21.
    - expect: Meta recorded
  2. Reject Draw (Under Review -> Rejected), Reject on Pending Approval (-> back to Under Review), Hold Draw/Activate Draw, Remove Draw.
    - expect: Statuses as documented in the main plan; every removed draw only in Deleted tab
  3. [Cleanup] Remove draws.
    - expect: released

#### 12.4. TC-LD-CHK-096: [REG-04] Restore regression [DEFECT: no restore] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: restore expectations. Priority: Normal. Preconditions: deleted draw. Test Data: n/a.
    - expect: Meta recorded
  2. See 036.
    - expect: No working restore; Activate Draw fails 500
  3. [Cleanup] none.
    - expect: n/a

#### 12.5. TC-LD-CHK-097: [REG-05] Add Tickets regression (no file, wrong file type, cancel) [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: dialog basics. Priority: Normal. Preconditions: Under Review draw. Test Data: package.json as wrong file type [defect (a) of the main plan].
    - expect: Meta recorded
  2. Add with no file; Cancel; choose a non-DBF file.
    - expect: 'No DB files selected.' toast; Cancel closes; non-DBF accepted by the dialog (known defect) and then fails on md5/processing
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.6. TC-LD-CHK-098: [REG-06] DBF duplication validation keeps working [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: row-level duplicate rejection. Priority: Critical. Preconditions: draw with F11. Test Data: F11-MOD.
    - expect: Meta recorded
  2. See 017.
    - expect: 'Ticket already exists for draw ID n' for every barcode; total unchanged
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.7. TC-LD-CHK-099: [REG-07] Cross-draw checksum duplication still blocked [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: protection of non-deleted draws. Priority: Blocker. Preconditions: holder F10. Test Data: F10-COPY.
    - expect: Meta recorded
  2. Create and Add Tickets with F10-COPY.
    - expect: Both rejected naming the holder
  3. [Cleanup] Remove draws.
    - expect: released

#### 12.8. TC-LD-CHK-100: [REG-08] Ticket parsing / processing statuses [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: upload status lifecycle. Priority: Critical. Preconditions: new draw. Test Data: F19.
    - expect: Meta recorded
  2. Watch the Logs table after create.
    - expect: Scheduled -> Completed within about 1 min; 100 tickets (barcode 0<dn>001..100); Ticket Count in list = Total Tickets on draw page = Quick Settings Total 100/Returnable 100/Sold 0
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.9. TC-LD-CHK-101: [REG-09] Processed files stay downloadable and unchanged [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: Log File Download. Priority: Normal. Preconditions: draw with a Completed and an Error Occurred upload. Test Data: F11 + F11-MOD.
    - expect: Meta recorded
  2. Click Download on each row (POST upload/download/private).
    - expect: logFile.csv (Barcode,Status,Reason) downloaded for the errored upload; [ASSUMPTION - needs confirmation] no file was produced for the errored corrupt uploads on AT9032985513
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.10. TC-LD-CHK-102: [REG-10] History / audit trail records checksum events [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: Operation logs. Priority: Normal. Preconditions: draw with success and failures. Test Data: F10 flow.
    - expect: Meta recorded
  2. Read Operation logs.
    - expect: Entries for Create, 'Successfully scheduled tickets upload', 'processing failed ... MD5 checksum mismatch! (Bad Request)', '... already exist ticket file in draw id ... (Conflict)', 'cannot be reviewed because it has no tickets! (Bad Request)', 'approved successfully', 'Soft Delete'
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.11. TC-LD-CHK-103: [REG-11] Status transitions incl. add-tickets demotion [Verified live] [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: full state machine. Priority: Critical. Preconditions: draw. Test Data: F19, A-file.
    - expect: Meta recorded
  2. Under Review -> Pending Approval -> Approved -> (Add Tickets) Under Review; Hold -> On Hold <stage> -> Activate; Remove.
    - expect: Transitions as listed; Approved -> Under Review on a successful add (F7)
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.12. TC-LD-CHK-104: [REG-12] Multi-admin visibility [Not verifiable: second admin account not available]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: checksum rule is global across admins. Priority: Critical. Preconditions: two admin users. Test Data: F10.
    - expect: Meta recorded
  2. Admin 1 creates a draw with F10; admin 2 uploads F10-COPY.
    - expect: Admin 2 rejected naming admin 1's draw; Requested By/created by recorded per admin in Operation logs
  3. [Cleanup] Remove draws.
    - expect: released

#### 12.13. TC-LD-CHK-105: [REG-13] Ticket generation / Quick Settings figures after checksum operations [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: counts. Priority: Critical. Preconditions: draw with 100 + 50 tickets. Test Data: F13 + A15.
    - expect: Meta recorded
  2. Quick Settings > Refresh after each upload and rejected upload.
    - expect: Total 150, Returnable 150, Sold 0, In Cart 0; unchanged by rejected uploads
  3. [Cleanup] Remove draw.
    - expect: released

#### 12.14. TC-LD-CHK-106: [REG-14] Error message quality [DEFECT minor] [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: user-facing wording. Priority: Minor. Preconditions: failing operations of this plan. Test Data: n/a.
    - expect: Meta recorded
  2. Collect all messages.
    - expect: Good: duplicate messages name the holder draw. Defects: 'DBF Upload successful' next to errors; 'Add Ticktes'; 'Error reviewing draw' on approve; 'darw'; 'Internal Server Error' on successful approve; checksum failure at create reported as 'Draw created, but...' and the orphan draw
  3. [Cleanup] none.
    - expect: n/a

#### 12.15. TC-LD-CHK-107: [REG-15] Reports and Quick Settings of draws involved in checksum scenarios [Not verifiable: report downloads need sold tickets / a completed draw]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: Post Cutoff report menu works after an additional upload. Priority: Normal. Preconditions: Post Cutoff draw with added tickets (menu has Returnable Ticket Letter(.zip), Text/PDF Sales Report, Sales Report Zip, Daily Sales Detail Report). Test Data: draw from ADD-CUT.
    - expect: Meta recorded
  2. Open each report entry.
    - expect: Reports generate for the full ticket set (including the added file); expected figures not verifiable without sales
  3. [Cleanup] Remove draw.
    - expect: released

### 13. 13. REL - Release deployment and remaining statuses

**Seed:** `tests/seed.spec.ts`

#### 13.1. TC-LD-CHK-112: Draw deleted BEFORE the release can be re-created with the same ticket file after the release [Not executed yet: needs the old build before deployment]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_rel.spec.ts`

**Steps:**
  1. [Meta] Objective: the real incident - draws deleted on the old build must also release their checksum (data migration). Priority: Blocker. Preconditions: UAT/dev still on the old build; ability to deploy the release. Test Data: draw 9032985519 / AT9032985519, base/9032985519.dbf md5 06ced10219781b7a149a94928203512b.
    - expect: Meta recorded
  2. Old build: create AT9032985519 with F19, delete it (Hold > Remove Draw), confirm a re-create with F19 is refused. Deploy the release. Re-create AT9032985519 with F19 and the same data.
    - expect: draw/create 201 and ticket-upload 201; draw Under Review with 100 tickets
    - expect: if refused 'already uploaded to another draw (AT9032985519-DELETED-...)' the old registrations were not migrated - RELEASE BLOCKER
  3. [Cleanup] Remove draw.
    - expect: released

#### 13.2. TC-LD-CHK-113: Draws that were live before the release stay protected after the release [Not executed yet: needs the old build before deployment]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_rel.spec.ts`

**Steps:**
  1. [Meta] Objective: the deployment must not free checksums of existing live draws. Priority: Blocker. Preconditions: UAT/dev on the old build. Test Data: draw 9032985520 / AT9032985520 with base/9032985520.dbf md5 bd7788592c56d0196e04ef54a14b0407 and a byte-identical renamed copy.
    - expect: Meta recorded
  2. Old build: create AT9032985520 with F20 and keep it live. Deploy the release. Add Tickets with the renamed copy of F20 to another draw.
    - expect: ticket-upload 400 'This ticket file has already been uploaded to another draw (AT9032985520). Please use a different ticket file.'; AT9032985520 unchanged
  3. [Cleanup] Remove draws.
    - expect: released

#### 13.3. TC-LD-CHK-114: Completed draw does not allow adding tickets and still protects its ticket file [DEFECT] [Verified live 2026-11-23 - automated smoke] [Expected result per product 2026-11-23: a Completed draw must not accept Add Tickets]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: after the draw is Completed no ticket file may be added, and its own checksum stays protected (Completed is a non-deleted status). Priority: Critical. Preconditions: none. Test Data: draw 9032985518 / AT9032985518 with base/9032985518.dbf md5 7a4bb71296b5bdb8bad393dfdefe77de; additional file additional/9032985517_ADD.dbf; a byte-identical renamed copy of F18; schedule start +3 min, cutoff +5 min, draw +7 min.
    - expect: Meta recorded
  2. Create, review and approve; wait for Completed; open the row menu.
    - expect: 'Add Tickets' is NOT offered for a Completed draw (product rule 2026-11-23); if it is offered, any upload attempt is refused with a clear message and nothing is added
    - ACTUAL: The Completed draw still offers 'Add Tickets' in its row menu (menu: View, Add Tickets, Quick Settings, Upload Winnings, No Winning File Upload, Daily Sales Detail Report) - verified 2026-11-23, draw AT9369747108. Its ticket file is still protected from other draws (step 3 passes).
  3. Add Tickets with the renamed copy of F18 to another live draw.
    - expect: ticket-upload 400 'already uploaded to another draw (AT9032985518)'
  4. [Cleanup] Remove draws (the Completed draw may not be removable - record the result).
    - expect: released

#### 13.4. TC-LD-CHK-115: Pending Approval draw still protects its ticket file [Verified live 2026-11-23 - automated smoke] [Expected result confirmed by product 2026-11-23]

**File:** `tests/smoke/lottery-draw/global_checksum.spec.ts`

**Steps:**
  1. [Meta] Objective: Pending Approval is a non-deleted status and must keep its checksum. Priority: Critical. Preconditions: none. Test Data: draw 9032985511 / AT9032985511 with base/9032985511.dbf md5 83230a30512dde49dd35ba4580ce2eea and a byte-identical renamed copy.
    - expect: Meta recorded
  2. Create AT9032985511 with F11, wait for tickets, Review (Pending Approval). Add Tickets with the renamed copy to another draw.
    - expect: ticket-upload 400 'already uploaded to another draw (AT9032985511)'; AT9032985511 still Pending Approval
  3. [Cleanup] Remove draws.
    - expect: released

### 14. 14. Test Data (map every scenario to files and draws)

**Seed:** `tests/seed.spec.ts`

#### 14.1. TC-LD-CHK-108: Test data map and cleanup contract (documentation scenario, no execution) [Verified live]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: data never collides. Priority: Normal. Preconditions: root playwright/.plan-data/checksum/ (manifest.json holds every md5). Test Data: below.
    - expect: FILES: F10..F21 = base/9032985510..21.dbf (tickets 0<dn>001-100): F10 27521613fe004cd989dd46c832622346, F11 83230a30512dde49dd35ba4580ce2eea, F12 21f36a846f7a4b2b1c5944628040bdb0, F13 5a373610a5211f8b4ce6ea84fb926530, F14 7d61c0ec9d36e8c3391ac2a87e1151ce, F15 313a8efc7d1db95f4ac09f7a2ab2ed87, F16 ad835e60fc1a515ffbf4c4a4423e313b, F17 b7cc4f85c975eb6878bd38ee6a47d19e, F18 7a4bb71296b5bdb8bad393dfdefe77de, F19 06ced10219781b7a149a94928203512b, F20 bd7788592c56d0196e04ef54a14b0407, F21 be67db5e6e59543e3238c315d340a46c; F10-COPY copy/9032985510_COPY.dbf (= F10 md5); F10-MOD modified/9032985510.dbf 2ac55e6bdaf2e4fdf9d802faf5ff7948; F11-MOD modified/9032985511.dbf 3490b490a8c329aff9dc979910df97eb; A12 8d2660220fbfadbdf15b6b04af7e3b87, A13 db37bad2845e56ab70516386b952ec27, A14 ded4b0c9c4813903a72f2b022b4bf80e, A15 5dd64e1205ba2266a77f99468c5c6b7c, A16 84bea513c993d4a53beaadeee76f869f, A17 8d9afa45ff560528a409492d9b2011eb (additional/90329855NN_ADD.dbf, 50 tickets); corrupt/..._HEADER_ONLY.dbf 7e10151a0a595755daf684b94058d802, corrupt/..._TRUNCATED.dbf 6d14df8a3c0805d6e3842d90a3c24912.
    - expect: GROUP MAP (draw = AT<number>): CRT 001-007 F10 family (9032985510 holder, 9032985520 with F10-MOD, 9032985521 with F10-COPY), F11 (9032985511) for the mismatch variant, F21 for 005; APR 008-016 F11/F11-MOD (9032985511), F10 family for 009/012 (9032985510 holder, 9032985520), F12+A12 (9032985512) for 014, F18 spare; ADD-UR 017-023 F11/F11-MOD (9032985511), F12/A12 (9032985512), holder F10 (9032985510); DEL 024-039 F10 family + F13 (9032985513) + A15 + A13 + F20 spare; ADD-APR 040-045 F14/A14 (9032985514), holder F10; ADD-INP 046-050 F15/A15 (9032985515, imminent), holder F10; ADD-CUT 051-055 F16/A16 (9032985516, imminent), holder F10 (F11 alternative); ADD-PROC 056-066 F17/A17 (9032985517), F13+A15 (9032985513), F11/F11-MOD, corrupt files; INT 067-080 F18 (9032985518), A15, F10-MOD, corrupt files; CON 081-085 F20/F21 + byte-identical copies created at test time; API 086-092 F10 holder + A13/A15; REG 093-107 F19-F21 and the groups' draws.
    - expect: DRAWS: never reuse a draw number inside one test; use a different draw date per draw (2028-2029, never imminent) except ADD-INP/ADD-CUT (start +3..4 min, cutoff +8..20 min, draw +35..40 min, one draw each). afterEach (mandatory): for every own draw - Under Review/Pending Approval/Approved/On Hold: Hold Draw (if not already) then Remove Draw (type code); Rejected: row menu Delete; In Play/Post Cutoff: Hold Draw then Remove Draw. A deleted draw frees its checksums, so files can be reused by the next test and the next run. Already known state after this exploration: all 7 exploration draws are deleted (AT9032985510 x2 ids 1066/1070, AT9032985511 id 1067, AT9032985512 id 1071, AT9032985513 id 1072, AT9032985520 id 1069, AT9032985521 id 1068) - no checksum is currently held.
    - expect: DATA GAPS: modified copies F12-MOD..F17-MOD (same barcodes, one changed ticket) are needed for TC16, TC20, TC24 (existing DBF + new checksum on Approved / In Play / Post Cutoff) - generate with utils/dbf/ticket-dbf.service.ts using the same seed then flip a field; a renamed copy of F10-MOD for 070; byte-identical copies of F20/F21 for CON.
  2. [Cleanup] n/a
    - expect: n/a

### 15. 15. Assumptions requiring confirmation

**Seed:** `tests/seed.spec.ts`

#### 15.1. TC-LD-CHK-109: Open questions for product / development (documentation scenario) [ASSUMPTION - needs confirmation]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: list what the brief does not define. Priority: Normal. Preconditions: none. Test Data: none.
    - expect: A-1 Should a global-checksum failure at Create Draw abort the whole creation? Today the draw is created empty (004) and the user is told to use Add Tickets.
    - expect: A-2 The brief says a DBF-duplication warning 'may' appear and creation may continue: the app shows NO warning at upload; duplicate barcodes on the same draw only surface later as 'Error Occurred' + CSV; the same barcodes on another draw are loaded silently (A-9). Is a synchronous warning required?
    - expect: A-3 Which checksum does approval check - only the latest upload's md5 (observed)? What should happen for draws with several DBFs, and should a failed/corrupt upload block approval (015)?
    - expect: A-4 Is demoting an Approved / In Play / In Play Post Cutoff draw to Under Review on a successful Add Tickets intended (F7)? Should Add Tickets be disabled after cutoff?
    - expect: A-5 Does a REJECTED (not deleted) draw keep its checksum registered? (030) -> RESOLVED 2026-11-23: yes, product confirmed the expected result of TC-LD-CHK-030. Open: is a permanent delete / restore required (036, 039)?
    - expect: A-6 Case/whitespace rules of the md5 (078, 079): lower-case 32 hex is the only format the approval accepts.
    - expect: A-7 Is a checksum of a FAILED processing meant to be released (066)?
    - expect: A-8 Message for the approval-time global check: not reachable via UI (010).
    - expect: A-9 Should the same ticket barcodes be rejected across different draws (AT9032985510 and AT9032985520 held 09032985510001-100 simultaneously)?
    - expect: A-10 The brief's own numbering of sections 5,7,8,9,10,11 and its 12 release criteria were not supplied - the matrix and acceptance criteria below are mapped by this plan's grouping.
  2. [Cleanup] n/a
    - expect: n/a

### 16. 16. Requirement-to-test-case traceability matrix

**Seed:** `tests/seed.spec.ts`

#### 16.1. TC-LD-CHK-110: Traceability matrix (documentation scenario)

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: every requirement id maps to a scenario. Priority: Normal. Preconditions: none. Test Data: none.
    - expect: TC01 -> 001; TC02 -> 002; TC03 -> 003; TC04 -> 008; TC05 -> 009 (observed) + 010 (true cross-draw, not verifiable); TC06 -> 017; TC07 -> 018; TC08 -> 019; TC09 -> 020; TC10 -> 024; TC11 -> 025; TC12 -> 026; TC13 -> 027; TC14 -> 041; TC15 -> 042; TC16 -> 043; TC17 -> 044; TC18 -> 047; TC19 -> 048; TC20 -> 049; TC21 -> 050; TC22 -> 052; TC23 -> 053; TC24 -> 054; TC25 -> 055; TC26 -> 056; TC27 -> 057; TC28 -> 058; TC29 -> 059.
    - expect: Approval extras (brief section 5): independence 011; taken between creation and approval 010; failed approval neither reserves nor releases 012; status after failed approval 013; latest-md5 014; failed-upload md5 015; error toast 016.
    - expect: Deleted-draw extras (brief section 7): recreate exact same DBF 027; delete-recreate-delete-reuse 028; On Hold 029; Rejected 030; delete with another holder 031; delete original after reuse 032; multi-DBF 033; Approved 034; soft/permanent/restore 035, 036, 039; history/associations 038; add on deleted 037.
    - expect: Additional upload per status (brief section 8): ADD-APR 040-045, ADD-INP 046-050, ADD-CUT 051-055.
    - expect: After processing (brief section 9): 056-066.
    - expect: Integrity (brief section 10, 12 items): valid 067; modified+old checksum 068; identical different name 069; modified different name 070; manipulated 071; missing 072; empty 073; truncated 074; extra chars 075; invalid chars 076; corrupted DBF 077; interrupted + retry 080; case/space inconsistencies 078, 079.
    - expect: Concurrency 081-085; Database/API/backend (brief section 11): 086-092; Regression 093-107 (creation, approval, deletion, restore, add tickets, DBF duplication, cross-draw checksum, parsing/processing, processed files, history, status transitions, multi-admin, ticket generation, error messages, reports).
  2. [Cleanup] n/a
    - expect: n/a

### 17. 17. Acceptance criteria (12 release criteria)

**Seed:** `tests/seed.spec.ts`

#### 17.1. TC-LD-CHK-111: Release acceptance criteria and mapping (documentation scenario) [ASSUMPTION - needs confirmation: criteria derived from the business rule]

**File:** `tests/e2e/lottery-draw/checksum/lottery_draw_checksum_reg.spec.ts`

**Steps:**
  1. [Meta] Objective: go/no-go. Priority: Blocker. Preconditions: all specs run with --workers=1. Test Data: none.
    - expect: AC1 Checksum of a draw that is NOT deleted is protected at creation: 002, 019, 042, 048, 053, 057, 099.
    - expect: AC2 Checksum/DBF belonging only to deleted draws is reusable: 025, 027, 028, 033, 034, 037, 039.
    - expect: AC3 Protection continues while the holder is On Hold / Rejected / multi-DBF: 029, 030, 031, 032, 061.
    - expect: AC4 Global check also at approval: 009, 010, 012, 013, 088 (010 open).
    - expect: AC5 Global check at every additional upload in every status: 017-020, 041-055, 056-059.
    - expect: AC6 DBF duplication still works independently: 003, 017, 026, 043, 049, 054, 058, 098.
    - expect: AC7 Failed operations leave no wrong registration / association / status: 004, 006, 012, 013, 023, 037, 064, 090.
    - expect: AC8 Integrity: wrong / modified / malformed checksum and corrupt files are handled: 067-080 (077 corrupt file defect, 078/079 inconsistency).
    - expect: AC9 No overwrite / corruption of processed data and history: 038, 060-065, 102, 105.
    - expect: AC10 Concurrency yields exactly one owner and no duplicates: 081-085 (not verifiable here).
    - expect: AC11 Server-side enforcement and API contract: 086-092.
    - expect: AC12 Regression of creation, approval, deletion, add tickets, status transitions, messages, reports with no new defects: 093-107 and the DEFECT scenarios (004, 015, 016, 021, 036, 038, 077, 078, 079) resolved or accepted by product.
  2. [Cleanup] n/a
    - expect: n/a
