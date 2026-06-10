export const CSS = `
/* ─── Root ───────────────────────────────────────────────────────── */
.mg-wrap {
  position: relative;
  height: 100%; width: 100%;
  background: #f1f5f9;
  font-family: 'Segoe UI', sans-serif;
  font-size: 12px;
  overflow: hidden;
}

/* ─── Toolbar  (top bar, never moves) ────────────────────────────── */
.mg-toolbar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 46px;
  background: #0D6E3F; color: white;
  display: flex; align-items: center;
  padding: 0 14px; gap: 14px;
  z-index: 999;
  box-sizing: border-box;
  overflow: hidden;
}
.mg-toolbar-title { font-size: 13px; font-weight: 700; letter-spacing: .4px; white-space: nowrap; }
.mg-toolbar-sub   { font-size: 10px; opacity: .75; white-space: nowrap; }
.mg-toolbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.mg-legend        { display: flex; align-items: center; gap: 3px; font-size: 10px; color: rgba(255,255,255,.85); white-space: nowrap; }
.mg-legend-dot    { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.mg-date-wrap {
  display: flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,.12); border-radius: 5px;
  padding: 2px 8px; white-space: nowrap;
}
.mg-date-wrap label { font-size: 10px; opacity: .8; }
.mg-date-input {
  background: transparent; border: none;
  border-bottom: 1px solid rgba(255,255,255,.4);
  color: white; font-size: 11px; width: 60px;
  outline: none; text-align: center; padding: 1px 2px;
}
.mg-date-input::placeholder { color: rgba(255,255,255,.35); }
.mg-btn-apply {
  background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.35);
  color: white; font-size: 10px; padding: 2px 8px; border-radius: 4px; cursor: pointer;
}
.mg-btn-apply:hover { background: rgba(255,255,255,.3); }
.mg-btn-open {
  background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.25);
  color: white; font-size: 10px; padding: 3px 9px; border-radius: 4px;
  cursor: pointer; white-space: nowrap;
}
.mg-btn-open:hover { background: rgba(255,255,255,.22); }

/* ─── Corner  (top-left, frozen on both axes) ────────────────────── */
.mg-corner {
  position: absolute;
  top: 46px; left: 0;
  width: 300px; height: 60px;
  z-index: 200;
  overflow: hidden;
  background: #0f172a;
  border-right: 2px solid #334155;
  border-bottom: 2px solid #334155;
  box-sizing: border-box;
}

/* ─── Column header  (top-right, scrolls X with body) ───────────── */
.mg-col-hdr {
  position: absolute;
  top: 46px; left: 300px; right: 0;
  height: 60px;
  z-index: 100;
  overflow: hidden;   /* scroll driven by body via JS */
}
.mg-col-hdr table { border-collapse: collapse; table-layout: fixed; }

/* ─── Row header  (bottom-left, scrolls Y with body) ────────────── */
.mg-row-hdr {
  position: absolute;
  top: 106px; left: 0;
  width: 300px; bottom: 0;
  z-index: 100;
  overflow: hidden;   /* scroll driven by body via JS */
  border-right: 2px solid #cbd5e1;
}
.mg-row-hdr table { border-collapse: collapse; table-layout: fixed; width: 300px; }

/* ─── Body  (bottom-right, scrolls both — drives everything) ─────── */
.mg-body {
  position: absolute;
  top: 106px; left: 300px;
  right: 0; bottom: 0;
  z-index: 10;
  overflow: auto;
}
.mg-body table { border-collapse: collapse; table-layout: fixed; }

/* ─── Shared table styles ────────────────────────────────────────── */

/* Month header cells */
.mg-th-month {
  height: 34px; background: #1e293b; color: #94a3b8;
  font-size: 10px; font-weight: 600; letter-spacing: .7px;
  text-transform: uppercase; text-align: center;
  border-right: 1px solid #334155; border-bottom: 1px solid #334155;
  white-space: nowrap;
}

/* Week header cells */
.mg-th-week {
  height: 26px; width: 48px; min-width: 48px;
  background: #0f172a; color: #64748b;
  font-size: 10px; font-weight: 500; text-align: center;
  border-right: 1px solid #1e293b; border-bottom: 2px solid #334155;
  white-space: nowrap;
}
.mg-th-week.mg-current { background: #1d4ed8; color: white; font-weight: 700; }
.mg-mend { border-right: 2px solid #64748b !important; }

/* Corner header cell */
.mg-th-corner {
  width: 300px; height: 60px;
  background: #0f172a; color: #475569;
  font-size: 10px; text-align: left;
  padding-left: 10px; vertical-align: bottom; padding-bottom: 4px;
}

/* ─── Row-header label cells ─────────────────────────────────────── */
.mg-row-hdr td {
  width: 300px; min-width: 300px; padding: 0;
  white-space: nowrap; overflow: hidden;
  border-bottom: 1px solid #e2e8f0;
  background: white;
}
.mg-label-inner {
  display: flex; align-items: center; height: 100%;
  padding-right: 8px; gap: 3px;
}
.mg-label-text {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex: 1; min-width: 0;
}
.mg-toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; flex-shrink: 0;
  cursor: pointer; border-radius: 3px; font-size: 9px;
  border: none; background: transparent; color: #94a3b8; user-select: none;
}
.mg-toggle:hover { background: rgba(0,0,0,.08); }
.mg-leaf-sp { width: 16px; flex-shrink: 0; display: inline-block; }

/* Row levels — applied to tr */
.mg-row-hdr tr.mg-lvl0, .mg-body tr.mg-lvl0 { height: 36px; }
.mg-row-hdr tr.mg-lvl1, .mg-body tr.mg-lvl1 { height: 32px; }
.mg-row-hdr tr.mg-lvl2, .mg-body tr.mg-lvl2 { height: 30px; }
.mg-row-hdr tr.mg-lvl3, .mg-body tr.mg-lvl3 { height: 29px; }

/* Label bg by level */
.mg-row-hdr tr.mg-lvl0 td { background: #0f172a !important; border-bottom: 1px solid #1e293b; }
.mg-row-hdr tr.mg-lvl0 .mg-label-inner { padding-left: 10px; }
.mg-row-hdr tr.mg-lvl0 .mg-label-text  { color: #f1f5f9; font-weight: 700; font-size: 13px; }
.mg-row-hdr tr.mg-lvl0 .mg-toggle      { color: rgba(255,255,255,.5); }

.mg-row-hdr tr.mg-lvl1 td { background: #e2e8f0; }
.mg-row-hdr tr.mg-lvl1 .mg-label-inner { padding-left: 18px; }
.mg-row-hdr tr.mg-lvl1 .mg-label-text  { color: #334155; font-weight: 600; font-size: 11px; }

.mg-row-hdr tr.mg-lvl2 td { background: #f8fafc; }
.mg-row-hdr tr.mg-lvl2 .mg-label-inner { padding-left: 32px; }
.mg-row-hdr tr.mg-lvl2 .mg-label-text  { color: #475569; font-weight: 500; font-size: 11px; }

.mg-row-hdr tr.mg-lvl3 td {
  background: #fff; cursor: pointer; transition: filter .12s; position: relative;
}
.mg-row-hdr tr.mg-lvl3 td:hover       { filter: brightness(.95); }
.mg-row-hdr tr.mg-lvl3 .mg-label-inner { padding-left: 48px; }
.mg-row-hdr tr.mg-lvl3 .mg-label-text  { color: #374151; font-weight: 400; font-size: 11px; }

/* Leaf label status colours */
.mg-row-hdr tr.mg-lvl3 td[data-ls="1"] { background: #e2e8f0 !important; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="1"] .mg-label-text { color: #475569; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="2"] { background: #fef9c3 !important; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="2"] .mg-label-text { color: #713f12; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="3"] { background: #fed7aa !important; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="3"] .mg-label-text { color: #7c2d12; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="4"] { background: #fecaca !important; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="4"] .mg-label-text { color: #7f1d1d; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="5"] { background: #bbf7d0 !important; }
.mg-row-hdr tr.mg-lvl3 td[data-ls="5"] .mg-label-text { color: #14532d; }

/* Note dot */
.mg-row-hdr tr.mg-lvl3 td[data-lnote="1"]::after {
  content: ''; position: absolute; top: 5px; right: 6px;
  width: 6px; height: 6px; border-radius: 50%;
  background: #6366f1; pointer-events: none;
}

/* ─── Body data cells ────────────────────────────────────────────── */
.mg-body td.mg-cell {
  width: 48px; min-width: 48px; text-align: center; cursor: pointer;
  border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;
  vertical-align: middle; font-size: 11px; position: relative;
}
.mg-body td.mg-cell:hover { filter: brightness(.9); }

/* Body row bg by level */
.mg-body tr.mg-lvl0 td.mg-cell { background: #1e293b; border-bottom: 1px solid #334155; }
.mg-body tr.mg-lvl1 td.mg-cell { background: #f1f5f9; }
.mg-body tr.mg-lvl2 td.mg-cell { background: #fafafa; }
.mg-body tr.mg-lvl3 td.mg-cell { background: #fff; }

.mg-body td.mg-cell[data-s="1"] { background: #e2e8f0 !important; border-left: 3px solid #94a3b8; color: #475569; }
.mg-body td.mg-cell[data-s="2"] { background: #fef9c3 !important; border-left: 3px solid #eab308; color: #854d0e; }
.mg-body td.mg-cell[data-s="3"] { background: #fed7aa !important; border-left: 3px solid #f97316; color: #9a3412; }
.mg-body td.mg-cell[data-s="4"] { background: #fecaca !important; border-left: 3px solid #ef4444; color: #991b1b; }
.mg-body td.mg-cell[data-s="5"] { background: #bbf7d0 !important; border-left: 3px solid #22c55e; color: #14532d; }
.mg-body td.mg-cell[data-hasnote="1"]::after {
  content: ''; position: absolute; top: 3px; right: 3px;
  width: 5px; height: 5px; border-radius: 50%;
  background: #6366f1; pointer-events: none;
}

/* ─── Hidden rows ────────────────────────────────────────────────── */
.mg-row-hdr tr.mg-hidden,
.mg-body     tr.mg-hidden { display: none !important; }

/* ─── Note popup ─────────────────────────────────────────────────── */
.mg-popup {
  position: fixed; z-index: 9999;
  background: white; border: 1px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,.2); padding: 14px; width: 300px;
  display: flex; flex-direction: column; gap: 8px;
}
.mg-popup-week  { font-size: 11px; font-weight: 700; color: #0D6E3F; }
.mg-popup-row   { font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mg-popup-stats { display: flex; gap: 4px; flex-wrap: wrap; }
.mg-popup-sbtn  {
  font-size: 10px; padding: 2px 7px; border-radius: 20px;
  border: 1px solid #e2e8f0; cursor: pointer; background: white; color: #475569;
}
.mg-popup-sbtn:hover { filter: brightness(.9); }
.mg-popup-ta {
  width: 100%; height: 70px; border: 1px solid #cbd5e1; border-radius: 6px;
  padding: 6px 8px; font-size: 11px; font-family: inherit; resize: vertical; outline: none;
}
.mg-popup-ta:focus { border-color: #0D6E3F; }
.mg-popup-actions { display: flex; gap: 6px; justify-content: flex-end; }
.mg-btn-cancel { background: #f1f5f9; color: #475569; border: none; padding: 4px 12px; border-radius: 5px; cursor: pointer; font-size: 11px; }
.mg-btn-save   { background: #0D6E3F; color: white;   border: none; padding: 4px 12px; border-radius: 5px; cursor: pointer; font-size: 11px; }

/* ─── Empty state ────────────────────────────────────────────────── */
.mg-empty {
  position: absolute; top: 106px; left: 0; right: 0; bottom: 0;
  padding: 48px 32px; color: #64748b; font-size: 13px; line-height: 1.8;
}
.mg-empty b    { color: #0f172a; }
.mg-empty code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
`;
