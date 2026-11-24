"""
Sync automated test results into every BigWin test case workbook (test case sheet/**/BigWin*.xlsx).

Called automatically after every Playwright run by reporters/excel-sync.reporter.ts (with a results payload),
or by hand:
    python scripts/excel/sync_results.py <payload.json> [...]   apply run results
    python scripts/excel/sync_results.py --pending               retry workbooks that were locked (open in Excel)
    python scripts/excel/sync_results.py --normalize             set every Executed By / Reported By / Closed By to EXECUTOR
                                                                 (npm run excel:sync / excel:normalize)
For each executed test case id:
  * every row of that id in every workbook (module tabs, suite tabs, Index "Suite Matrix"): Status, Actual Results,
    Executed Date, Executed By = EXECUTOR, a "Last automated run" line in Comments;
  * PASS  + an open bug  -> bug Closed (Developer Status Fixed, Retest / Closed Date, Closed By, QA comment);
  * FAIL  + no bug       -> a NEW bug (next BUG_nnn, Reported By = EXECUTOR) in the Bug Sheet of every workbook
                            that has the case, linked from the case's Bug Id;
  * FAIL  + closed bug   -> the bug is ReOpened;   FAIL + open bug -> retest date / comment added.
Bug ids and actions are decided once per run (from the master workbook + the ledger), so every workbook gets the
same Bug Id. A workbook that is open in Excel cannot be saved: it is skipped and updated on the next run
(state in test case sheet/.automation/ledger.json - every workbook remembers the last result it received).
Requires: Python 3 + openpyxl (pip install -r scripts/excel/requirements.txt).
"""
import copy
import glob
import json
import os
import re
import sys
from datetime import date

from openpyxl import load_workbook
from openpyxl.worksheet.hyperlink import Hyperlink

EXECUTOR = 'Ravindu(playwright_automation)'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHEETS = os.environ.get('EXCEL_SYNC_DIR') or os.path.join(ROOT, 'test case sheet')   # override: testing on a copy
MASTER = os.path.join(SHEETS, '01 Full Test Suite', 'BigWin Full Test Suite.xlsx')
LEDGER = os.path.join(SHEETS, '.automation', 'ledger.json')
ID_RE = re.compile(r'^TC-[A-Z0-9]+(?:-[A-Z0-9]+)?-\d+$')
BUG_RE = re.compile(r'^BUG_(\d+)$')
OLD_EXECUTORS = ['Ravindu (exploratory, Playwright planner)', 'QA exploration on dev (Playwright test planner)', 'Ravindu (Playwright automation)',
                 'Ravindu (automation)', 'Playwright Automation']
# Bug Sheet "Module" label per test id prefix (the dashboards count bugs by this label); longest prefix first
MODULE_OF = [('TC-LD-CHK-', 'Lottery Draw - Global Checksum'), ('TC-HF-MP-', 'Hotfix - Mega Prize'), ('TC-LOGIN-', 'Login'),
             ('TC-LT-', 'Lottery Type'), ('TC-LB-', 'Lottery Brand'), ('TC-LD-', 'Lottery Draw'), ('TC-DBF-', 'Lottery Draw')]
SEVERITY = {'blocker': ('Critical', 'High'), 'critical': ('Critical', 'High'), 'normal': ('Major', 'Medium'), 'minor': ('Minor', 'Low'), 'trivial': ('Minor', 'Low')}

# Bug Sheet columns (1-based)
B_MOD, B_TYPE, B_ID, B_SUM, B_ENV, B_PRE, B_DATA, B_STEPS, B_EXP, B_ACT, B_ATT, B_FIXBY, B_REPBY, B_REPDATE, B_REPVER, B_SEV, B_PRI, \
    B_QA, B_DEV, B_RETVER, B_RETDATES, B_FIXVER, B_CLOSED, B_CLOSEDBY, B_COMM = range(1, 26)
BUG_FIRST_ROW = 24


def log(msg):
    print(f'[excel-sync] {msg}', flush=True)


def workbooks():
    out = []
    for p in sorted(glob.glob(os.path.join(SHEETS, '**', 'BigWin*.xlsx'), recursive=True)):
        rel = os.path.relpath(p, SHEETS)
        if rel.startswith('_archive') or ' - Copy' in rel or os.path.basename(p).startswith('~$'):
            continue
        out.append(p)
    return out


def rel(p):
    return os.path.relpath(p, SHEETS).replace('\\', '/')


# ------------------------------------------------------------------ sheet layout detection
def case_table(ws):
    """(header_row, columns) of a test case tab - header row has 'Actual Results' and 'Status'; None if not a case tab."""
    for r in range(1, min(ws.max_row, 60) + 1):
        vals = {str(ws.cell(r, c).value).strip(): c for c in range(1, 20) if ws.cell(r, c).value is not None}
        if 'Status' in vals and 'Actual Results' in vals and 'Executed By' in vals:
            return r, {'actual': vals['Actual Results'], 'status': vals['Status'], 'bug': vals.get('Bug Id'),
                       'date': vals['Executed Date'], 'by': vals['Executed By'], 'comment': vals.get('Comments'), 'id': 4,
                       'desc': 5, 'pre': 6, 'data': 7, 'steps': 8, 'expected': 9, 'type': 2}
        if 'Test Case ID' in vals and 'Latest Status' in vals:   # Index - Suite Matrix
            return r, {'id': vals['Test Case ID'], 'status': vals['Latest Status'], 'date': vals['Executed Date'], 'by': vals['Executed By'], 'matrix': True}
    return None


def case_rows(wb):
    """id -> [(ws, row, cols)] for every test case row of the workbook."""
    found = {}
    for ws in wb.worksheets:
        if ws.title == 'Bug Sheet':
            continue
        t = case_table(ws)
        if not t:
            continue
        hr, cols = t
        for r in range(hr + 1, ws.max_row + 1):
            v = ws.cell(r, cols['id']).value
            if isinstance(v, str) and ID_RE.match(v.strip()):
                found.setdefault(v.strip(), []).append((ws, r, cols))
    return found


def bug_rows(wb):
    """bug id -> row in the workbook's Bug Sheet."""
    if 'Bug Sheet' not in wb.sheetnames:
        return {}
    ws = wb['Bug Sheet']
    out = {}
    for r in range(BUG_FIRST_ROW - 1, ws.max_row + 1):
        v = ws.cell(r, B_ID).value
        if isinstance(v, str) and BUG_RE.match(v.strip()):
            out[v.strip()] = r
    return out


# ------------------------------------------------------------------ ledger
def load_ledger():
    if os.path.exists(LEDGER):
        return json.load(open(LEDGER, encoding='utf-8'))
    return {'seq': 0, 'entries': [], 'applied': {}}


def save_ledger(led):
    os.makedirs(os.path.dirname(LEDGER), exist_ok=True)
    # drop entries every workbook has received
    books = [rel(p) for p in workbooks()]
    low = min([led['applied'].get(b, 0) for b in books] or [0])
    led['entries'] = [e for e in led['entries'] if e['seq'] > low]
    json.dump(led, open(LEDGER, 'w', encoding='utf-8'), indent=1)


def current_bug_state(led):
    """tc -> (bug id, qa status) from the master workbook, then the ledger entries the master has not received yet."""
    state, status_of = {}, {}
    if os.path.exists(MASTER):
        wb = load_workbook(MASTER, read_only=False)
        for tc, rows in case_rows(wb).items():
            ws, r, cols = rows[0]
            b = ws.cell(r, cols['bug']).value if cols.get('bug') else None
            if b:
                state[tc] = str(b).strip()
        bs = wb['Bug Sheet'] if 'Bug Sheet' in wb.sheetnames else None
        for bid, r in bug_rows(wb).items():
            status_of[bid] = str(bs.cell(r, B_QA).value or 'Open')
    applied = led['applied'].get(rel(MASTER), 0)
    for e in led['entries']:
        if e['seq'] > applied and e.get('bug'):
            state[e['id']] = e['bug']['id']
            status_of[e['bug']['id']] = 'Closed' if e['bug']['action'] == 'close' else ('ReOpen' if e['bug']['action'] == 'reopen' else 'Open')
    return state, status_of


def next_bug_number(led):
    n = 0
    for p in workbooks():
        try:
            wb = load_workbook(p, read_only=True)
        except Exception:
            continue
        if 'Bug Sheet' in wb.sheetnames:
            for row in wb['Bug Sheet'].iter_rows(min_row=BUG_FIRST_ROW - 1, min_col=B_ID, max_col=B_ID, values_only=True):
                m = BUG_RE.match(str(row[0] or ''))
                if m:
                    n = max(n, int(m.group(1)))
        wb.close()
    for e in led['entries']:
        m = BUG_RE.match((e.get('bug') or {}).get('id', ''))
        if m:
            n = max(n, int(m.group(1)))
    return n + 1


def add_results(led, payload):
    """Turn a run payload into ledger entries (status + bug decision per test case)."""
    state, status_of = current_bug_state(led)
    nxt = None
    for res in payload['results']:
        tc, st = res['id'], res['status']
        bid = state.get(tc)
        bug = None
        if st == 'Pass' and bid and status_of.get(bid, 'Open') != 'Closed':
            bug = {'id': bid, 'action': 'close'}
            status_of[bid] = 'Closed'
        elif st == 'Fail':
            if not bid:
                if nxt is None:
                    nxt = next_bug_number(led)
                bid = f'BUG_{nxt:03d}'
                nxt += 1
                bug = {'id': bid, 'action': 'new'}
                state[tc] = bid
                status_of[bid] = 'Open'
            elif status_of.get(bid) == 'Closed':
                bug = {'id': bid, 'action': 'reopen'}
                status_of[bid] = 'ReOpen'
            else:
                bug = {'id': bid, 'action': 'still'}
        led['seq'] += 1
        led['entries'].append({**res, 'seq': led['seq'], 'bug': bug})
        log(f"{tc}: {st}" + (f"  ->  {bug['id']} {bug['action']}" if bug else ''))


# ------------------------------------------------------------------ apply to one workbook
def set_comment_line(old, line):
    lines = [x for x in str(old or '').split('\n') if x and not x.startswith('Last automated run:')]
    return '\n'.join([line] + lines)


def append_text(old, text):
    old = str(old or '').strip()
    return text if not old else (old if text in old else f'{old}\n{text}')


def copy_row_style(ws, src_row, dst_row, ncols=25):
    for c in range(1, ncols + 1):
        s, d = ws.cell(src_row, c), ws.cell(dst_row, c)
        if s.has_style:
            d.font, d.fill, d.border = copy.copy(s.font), copy.copy(s.fill), copy.copy(s.border)
            d.alignment, d.number_format = copy.copy(s.alignment), s.number_format
    ws.row_dimensions[dst_row].height = ws.row_dimensions[src_row].height


def module_label(tc, res):
    for pre, label in MODULE_OF:
        if tc.startswith(pre):
            return label
    return res.get('module') or 'Other'


def new_bug_row(bs, bug_at, res, rows):
    """Append a new bug for a failed case; returns its row."""
    ws, r, cols = rows[0]
    last = max(bug_at.values()) if bug_at else BUG_FIRST_ROW - 1
    nr = max(last, bs.max_row) + 1
    if bug_at:
        copy_row_style(bs, last, nr)
    sev, pri = SEVERITY.get(res.get('severity', 'normal'), ('Major', 'Medium'))
    g = lambda k: ws.cell(r, cols[k]).value if k in cols and not cols.get('matrix') else None
    vals = {
        B_MOD: f"{module_label(res['id'], res)} / {res['id']}", B_TYPE: g('type') or 'Functional', B_ID: res['bug']['id'],
        B_SUM: g('desc') or res.get('description') or res.get('title'), B_ENV: 'Dev', B_PRE: g('pre') or res.get('preconditions') or '-',
        B_DATA: g('data') or res.get('testData') or '-', B_STEPS: g('steps') or '\n'.join(res.get('steps') or []), B_EXP: g('expected') or res.get('expectedResult', ''),
        B_ACT: res.get('error') or 'Failed', B_ATT: f"Playwright / Allure report of {res['id']} ({res['date']})", B_FIXBY: '',
        B_REPBY: EXECUTOR, B_REPDATE: res['date'], B_REPVER: 'Dev', B_SEV: sev, B_PRI: pri, B_QA: 'Open', B_DEV: '', B_RETVER: '', B_RETDATES: '',
        B_FIXVER: '', B_CLOSED: '', B_CLOSEDBY: '',
        B_COMM: f"Raised automatically by the Playwright run on {res['date']} ({res.get('spec', '')}) - the test fails until fixed.",
    }
    for c, v in vals.items():
        bs.cell(nr, c).value = v
    return nr


def apply(wb, entries):
    rows_of = case_rows(wb)
    bug_at = bug_rows(wb)
    bs = wb['Bug Sheet'] if 'Bug Sheet' in wb.sheetnames else None
    changed = 0
    for res in entries:
        tc = res['id']
        rows = rows_of.get(tc)
        if not rows:
            continue
        bug = res.get('bug')
        st, d = res['status'], res['date']
        # bug sheet first (a new bug needs its row for the link)
        if bs is not None and bug:
            br = bug_at.get(bug['id'])
            if br is None and bug['action'] in ('new', 'reopen', 'still'):
                br = bug_at[bug['id']] = new_bug_row(bs, bug_at, res, rows)
            elif br is not None:
                if bug['action'] == 'close':
                    bs.cell(br, B_QA).value, bs.cell(br, B_DEV).value = 'Closed', 'Fixed'
                    bs.cell(br, B_CLOSED).value, bs.cell(br, B_CLOSEDBY).value = d, EXECUTOR
                    bs.cell(br, B_RETDATES).value = append_text(bs.cell(br, B_RETDATES).value, d)
                    bs.cell(br, B_COMM).value = append_text(bs.cell(br, B_COMM).value, f'Retest {d}: PASSED in the automated run - bug closed.')
                elif bug['action'] == 'reopen':
                    bs.cell(br, B_QA).value, bs.cell(br, B_DEV).value = 'ReOpen', ''
                    bs.cell(br, B_CLOSED).value, bs.cell(br, B_CLOSEDBY).value = '', ''
                    bs.cell(br, B_ACT).value = res.get('error') or bs.cell(br, B_ACT).value
                    bs.cell(br, B_RETDATES).value = append_text(bs.cell(br, B_RETDATES).value, d)
                    bs.cell(br, B_COMM).value = append_text(bs.cell(br, B_COMM).value, f'Retest {d}: FAILED again in the automated run - bug reopened.')
                elif bug['action'] == 'still':
                    bs.cell(br, B_RETDATES).value = append_text(bs.cell(br, B_RETDATES).value, d)
                    bs.cell(br, B_COMM).value = append_text(bs.cell(br, B_COMM).value, f'Retest {d}: still failing in the automated run.')
            changed += 1
        for ws, r, cols in rows:
            ws.cell(r, cols['status']).value = st
            ws.cell(r, cols['date']).value = d
            ws.cell(r, cols['by']).value = EXECUTOR
            if cols.get('matrix'):
                changed += 1
                continue
            ws.cell(r, cols['actual']).value = (f'As expected (automated run {d})' + (' - passed on retry (flaky)' if res.get('flaky') else '')) if st == 'Pass' \
                else f"Failed (automated run {d}): {res.get('error') or 'see the Playwright report'}"
            if cols.get('comment'):
                ws.cell(r, cols['comment']).value = set_comment_line(ws.cell(r, cols['comment']).value,
                                                                     f"Last automated run: {d} {st.upper()} ({res.get('spec', '')})")
            if cols.get('bug') and bug:
                x = ws.cell(r, cols['bug'])
                x.value = bug['id']
                if bs is not None and bug['id'] in bug_at:
                    x.hyperlink = Hyperlink(ref=x.coordinate, location=f"'Bug Sheet'!C{bug_at[bug['id']]}")
            changed += 1
    return changed


def normalize(wb):
    n = 0
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            for c in row:
                v = c.value
                if isinstance(v, str) and not v.startswith('='):
                    nv = v
                    for old in OLD_EXECUTORS:
                        nv = nv.replace(old, EXECUTOR)
                    if nv != v:
                        c.value = nv
                        n += 1
    return n


def save(wb, path):
    try:
        wb.save(path)
        return True
    except PermissionError:
        log(f'LOCKED (open in Excel?): {rel(path)} - it will be updated on the next run or with: npm run excel:sync')
        return False


def main(argv):
    led = load_ledger()
    if '--normalize' in argv:
        for p in workbooks():
            wb = load_workbook(p)
            n = normalize(wb)
            if n and save(wb, p):
                log(f'{rel(p)}: {n} name(s) set to {EXECUTOR}')
        return 0
    payloads = [a for a in argv if not a.startswith('--')]
    for f in payloads:
        payload = json.load(open(f, encoding='utf-8'))
        if payload.get('results'):
            add_results(led, payload)
    save_ledger(led)          # results are safe in the ledger before any workbook is touched
    for f in payloads:
        try:
            os.remove(f)
        except OSError:
            pass
    pending = locked = 0
    for p in workbooks():
        if rel(p) not in led['applied']:   # a workbook seen for the first time only receives results from now on
            led['applied'][rel(p)] = min([e['seq'] for e in led['entries']] or [led['seq'] + 1]) - 1
        todo = [e for e in led['entries'] if e['seq'] > led['applied'][rel(p)]]
        if not todo:
            continue
        pending += 1
        wb = load_workbook(p)
        n = apply(wb, todo)
        if save(wb, p):
            led['applied'][rel(p)] = max(e['seq'] for e in todo)
            if n:
                log(f'updated {rel(p)} ({n} change(s))')
        else:
            locked += 1
    save_ledger(led)
    if not pending:
        log('all workbooks are up to date')
    return 0 if not locked else 3


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
