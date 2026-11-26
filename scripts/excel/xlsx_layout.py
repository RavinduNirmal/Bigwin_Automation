"""
Row-height auto-fit for the BigWin workbooks.

Excel does not re-measure row heights when it opens a file written by a script (and never for merged cells), so a
wrapped text taller than the stored row height is cut off until someone drags the row. autofit(wb) estimates how many
lines every text cell needs (its text, its column / merged width and its font size) and makes each row tall enough.
Rows are only ever made taller, never shorter, so designed heights (banners, headers) are kept.

Used by sync_results.py / refresh_cases.py on every save and by the workbook builder; by hand: npm run excel:autofit
"""
import math
import sys

from openpyxl.utils import get_column_letter

DEFAULT_COL_WIDTH = 8.43      # Excel default column width (characters)
CHARS_PER_WIDTH = 1.05        # characters of a 10pt font that fit in one unit of column width (a little pessimistic)
LINE_FACTOR = 1.38            # line height = font size x this (points)
PADDING = 5                   # points above / below the text
MAX_HEIGHT = 409              # Excel's maximum row height


def _col_width(ws, col):
    w = ws.column_dimensions[get_column_letter(col)].width
    return w if w else DEFAULT_COL_WIDTH


def _merged_widths(ws):
    """anchor (row, col) -> total width of a single-row merged range; cells inside a merge -> None (skip)."""
    out = {}
    for rng in ws.merged_cells.ranges:
        if rng.min_row != rng.max_row:
            for r in range(rng.min_row, rng.max_row + 1):
                for c in range(rng.min_col, rng.max_col + 1):
                    out[(r, c)] = None        # multi-row merge: height is shared, do not size from it
            continue
        out[(rng.min_row, rng.min_col)] = sum(_col_width(ws, c) for c in range(rng.min_col, rng.max_col + 1))
        for c in range(rng.min_col + 1, rng.max_col + 1):
            out[(rng.min_row, c)] = None
    return out


def lines_needed(text, width_chars, font_size=10, bold=False):
    size_factor = (font_size or 10) / 10 * (1.08 if bold else 1)
    per_line = max(1, int(width_chars * CHARS_PER_WIDTH / size_factor) - 1)
    return sum(max(1, math.ceil(len(seg) / per_line)) for seg in str(text).split('\n'))


def autofit(wb):
    """Make every row of every sheet tall enough for its wrapped text. Returns the number of rows changed."""
    changed = 0
    for ws in wb.worksheets:
        merged = _merged_widths(ws)
        need = {}
        for row in ws.iter_rows():
            for c in row:
                v = c.value
                if not isinstance(v, str) or not v or v.startswith('='):
                    continue
                key = (c.row, c.column)
                if key in merged and merged[key] is None:
                    continue
                wrap = bool(c.alignment and c.alignment.wrap_text)
                if not wrap and '\n' not in v:
                    continue
                width = merged.get(key) or _col_width(ws, c.column)
                size = (c.font.sz if c.font and c.font.sz else 10)
                lines = lines_needed(v, width, size, bool(c.font and c.font.b)) if wrap else v.count('\n') + 1
                h = min(MAX_HEIGHT, lines * size * LINE_FACTOR + PADDING)
                need[c.row] = max(need.get(c.row, 0), h)
        for r, h in need.items():
            cur = ws.row_dimensions[r].height
            if cur is None or cur + 0.5 < h:
                ws.row_dimensions[r].height = round(h, 1)
                changed += 1
    return changed


if __name__ == '__main__':
    import os
    from openpyxl import load_workbook
    sys.path.insert(0, os.path.dirname(__file__))
    import sync_results as S
    for p in S.workbooks():
        wb = load_workbook(p)
        n = autofit(wb)
        if not n:
            print(f'[excel-autofit] {S.rel(p)}: rows already fit')
            continue
        try:
            wb.save(p)
            print(f'[excel-autofit] {S.rel(p)}: {n} row height(s) adjusted')
        except PermissionError:
            print(f'[excel-autofit] LOCKED (open in Excel?): {S.rel(p)} - close it and run npm run excel:autofit again')
