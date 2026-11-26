"""
Refresh the TEXT of every test case in every BigWin workbook from the metadata (npm run excel:refresh).

Updates, for every test case id found in test case sheet/**/BigWin*.xlsx:
  * test case tabs: Description, PreConditions, Test Data, Test Steps (numbered), Expected Result;
    Actual Results of FAILED cases with a known defect = the plain-language actual result from the metadata;
  * Index "Suite Matrix": Description;
  * Bug Sheet: Summary, PreCondition, Test Data, Steps To Reproduce, Expected Result (and Actual Results of open bugs).
Never touches statuses, bug ids / bug status, executed date / by or comments (those belong to the results sync).
Global Checksum cases (TC-LD-CHK-*) keep their hand-written plain texts.
Input: playwright/.excel-sync/metadata.json (written by scripts/excel/metadata-dump.spec.ts).
"""
import json
import os
import sys

from openpyxl import load_workbook

sys.path.insert(0, os.path.dirname(__file__))
import sync_results as S  # noqa: E402  (shared workbook helpers)
from xlsx_layout import autofit  # noqa: E402

META = os.path.join(S.ROOT, 'playwright', '.excel-sync', 'metadata.json')
SKIP_PREFIX = ('TC-LD-CHK-',)


def numbered(steps):
    return '\n'.join(f'{i}. {s}' for i, s in enumerate(steps or [], 1))


def texts(m):
    return {
        'desc': m.get('description', ''),
        'pre': m.get('preconditions') or '-',
        'data': m.get('testData') or '-',
        'steps': numbered(m.get('steps')),
        'expected': m.get('expectedResult', ''),
        'actual': m.get('actualResult') or '',
    }


def refresh(wb, meta):
    n = 0
    for tc, rows in S.case_rows(wb).items():
        m = meta.get(tc)
        if not m or tc.startswith(SKIP_PREFIX):
            continue
        t = texts(m)
        for ws, r, cols in rows:
            if cols.get('matrix'):
                c = 3   # Suite Matrix: Description column
                if ws.cell(r, c).value != t['desc'].split('\n')[0]:
                    ws.cell(r, c).value = t['desc'].split('\n')[0]
                    n += 1
                continue
            for key in ('desc', 'pre', 'data', 'steps', 'expected'):
                cell = ws.cell(r, cols[key])
                if cell.value != t[key]:
                    cell.value = t[key]
                    n += 1
            # a failed case with a known defect: show the plain-language actual result (the error stays in Comments)
            status = ws.cell(r, cols['status']).value
            if status == 'Fail':
                d = ws.cell(r, cols['date']).value
                old = str(ws.cell(r, cols['actual']).value or '')
                if t['actual']:
                    val = t['actual'] + (f'\n(automated run {d})' if d else '')
                elif S.re.match(r'(Failed \(automated run [^)]*\):|Blocked: )', old):   # raw technical failure text -> plain words
                    raw = S.re.sub(r'^(Failed \(automated run [^)]*\):|Blocked:)\s*', '', old)
                    val = S.plain_error(raw) + (f'\n(automated run {d})' if d else '')
                else:
                    val = old
                if old != val:
                    ws.cell(r, cols['actual']).value = val
                    n += 1
    if 'Bug Sheet' in wb.sheetnames:
        bs = wb['Bug Sheet']
        for bid, r in S.bug_rows(wb).items():
            mod_tc = str(bs.cell(r, S.B_MOD).value or '')
            tc = mod_tc.split(' / ')[-1].split(',')[0].strip()
            m = meta.get(tc)
            if not m or tc.startswith(SKIP_PREFIX):
                continue
            t = texts(m)
            summary = t['desc'].split('\n')[0]
            old_sum = str(bs.cell(r, S.B_SUM).value or '')
            if ' - blocked: ' in old_sum:      # keep the "blocked by" root cause of split bugs
                summary += ' - blocked: ' + old_sum.split(' - blocked: ', 1)[1]
            vals = {S.B_SUM: summary, S.B_PRE: t['pre'], S.B_DATA: t['data'], S.B_STEPS: t['steps'], S.B_EXP: t['expected']}
            if t['actual'] and bs.cell(r, S.B_QA).value != 'Closed' and ' - blocked: ' not in old_sum:
                vals[S.B_ACT] = t['actual']
            for c, v in vals.items():
                if bs.cell(r, c).value != v:
                    bs.cell(r, c).value = v
                    n += 1
    return n


def main():
    if not os.path.exists(META):
        print(f'[excel-refresh] {META} not found - run: npm run excel:refresh')
        return 2
    meta = json.load(open(META, encoding='utf-8'))
    locked = 0
    for p in S.workbooks():
        wb = load_workbook(p)
        n = refresh(wb, meta)
        if not n:
            print(f'[excel-refresh] {S.rel(p)}: up to date')
            continue
        try:
            autofit(wb)
            wb.save(p)
            print(f'[excel-refresh] {S.rel(p)}: {n} cell(s) updated')
        except PermissionError:
            locked += 1
            print(f'[excel-refresh] LOCKED (open in Excel?): {S.rel(p)} - close it and run npm run excel:refresh again')
    return 3 if locked else 0


if __name__ == '__main__':
    sys.exit(main())
