var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MatrixGellmanPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/calendar.ts
var MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
function parseMonthYear(raw) {
  const s = raw.trim().replace(/\//g, "-");
  const p = s.split("-");
  if (p.length !== 2)
    return null;
  let month = parseInt(p[0], 10);
  let year = parseInt(p[1], 10);
  if (isNaN(month) || isNaN(year))
    return null;
  if (year < 100)
    year += 2e3;
  if (month < 1 || month > 12)
    return null;
  return { year, month };
}
function firstDow(y, m) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1]) % 7;
}
function daysInMonth(y, m) {
  if (m === 2)
    return y % 4 === 0 && y % 100 !== 0 || y % 400 === 0 ? 29 : 28;
  return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];
}
function mondaysInMonth(y, m) {
  const fd = firstDow(y, m);
  const skip = (1 - fd + 7) % 7;
  const dim = daysInMonth(y, m);
  const r = [];
  for (let d = 1 + skip; d <= dim; d += 7)
    r.push(d);
  return r;
}
function currentMondayYMD() {
  const now = /* @__PURE__ */ new Date();
  const dow = now.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  const ts = now.getTime() - back * 864e5;
  const mon = new Date(ts);
  return { y: mon.getFullYear(), m: mon.getMonth() + 1, d: mon.getDate() };
}
function buildCalendar(sy, sm, ey, em) {
  const weeks = [];
  const months = [];
  const cur = currentMondayYMD();
  let y = sy, m = sm, mIdx = 0;
  while (y < ey || y === ey && m <= em) {
    const ml = `${MONTH_NAMES[m - 1]} ${y}`;
    const mondays = mondaysInMonth(y, m);
    mondays.forEach((day, w) => {
      weeks.push({
        key: `${ml} W${w + 1}`,
        label: `W${w + 1}`,
        monthLabel: ml,
        monthIdx: mIdx,
        isMonthEnd: w === mondays.length - 1,
        isCurrent: y === cur.y && m === cur.m && day === cur.d
      });
    });
    months.push({ label: ml, span: mondays.length });
    mIdx++;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return { weeks, months, total: weeks.length };
}

// src/fileio.ts
var STATUS_NAMES = ["", "pending", "in-progress", "at-risk", "blocked", "done"];
var STATUS_FROM = {
  "pending": 1,
  "in-progress": 2,
  "at-risk": 3,
  "blocked": 4,
  "done": 5
};
function countIndent(line) {
  let n = 0, i = 0;
  while (i < line.length) {
    if (line[i] === "	") {
      n++;
      i++;
    } else if (line[i] === " " && line[i + 1] === " ") {
      n++;
      i += 2;
    } else
      break;
  }
  return n;
}
function stripWiki(s) {
  return s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1");
}
function labelOf(raw) {
  return stripWiki(raw).replace(/\s*::status:\s*\S+/g, "").trim();
}
function inlineStatus(raw) {
  var _a;
  const m = raw.match(/::status:\s*([a-z-]+)/i);
  return m ? (_a = STATUS_FROM[m[1].toLowerCase()]) != null ? _a : 0 : 0;
}
function parseNote(raw) {
  var _a;
  if (!/^::note\s*:/i.test(raw))
    return null;
  const block = raw.match(/\{([^}]*)\}/);
  if (!block)
    return null;
  const body = block[1];
  const get = (k) => {
    const r = body.match(new RegExp(`\\b${k}\\s*:\\s*([^,}]+)`, "i"));
    return r ? r[1].trim() : "";
  };
  const wk = get("date");
  const note = get("comment");
  const s = (_a = STATUS_FROM[get("status").toLowerCase()]) != null ? _a : 0;
  return wk ? { s, wk, note } : null;
}
function isReserved(raw) {
  const t = raw.trim();
  return /^::(gellmanMatrix|title|start|end|note)\b/i.test(t);
}
function parseFile(filePath, content) {
  var _a, _b, _c, _d;
  const lines = content.split("\n");
  const now = /* @__PURE__ */ new Date();
  const defSY = now.getFullYear(), defSM = now.getMonth() + 1;
  const defEY = defSM + 5 > 12 ? defSY + 1 : defSY;
  const defEM = (defSM + 4) % 12 + 1;
  let startRaw = `${String(defSM).padStart(2, "0")}-${String(defSY).slice(2)}`;
  let endRaw = `${String(defEM).padStart(2, "0")}-${String(defEY).slice(2)}`;
  let title = (_b = (_a = filePath.split("/").pop()) == null ? void 0 : _a.replace(/\.md$/, "")) != null ? _b : "MatrixGellman";
  let inFront = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (i === 0 && l === "---") {
      inFront = true;
      continue;
    }
    if (inFront) {
      if (l === "---")
        inFront = false;
      continue;
    }
    if (!l.startsWith("- "))
      continue;
    const raw = l.slice(2).trim();
    const tm = raw.match(/^::title:\s*(.+)/i);
    const sm = raw.match(/^::start:\s*([\d\/\-]+)/i);
    const em = raw.match(/^::end:\s*([\d\/\-]+)/i);
    if (tm)
      title = tm[1].trim();
    if (sm)
      startRaw = sm[1].trim();
    if (em)
      endRaw = em[1].trim();
  }
  const sp = (_c = parseMonthYear(startRaw)) != null ? _c : { year: defSY, month: defSM };
  const ep = (_d = parseMonthYear(endRaw)) != null ? _d : { year: defEY, month: defEM };
  const calendar = buildCalendar(sp.year, sp.month, ep.year, ep.month);
  const weekKeys = calendar.weeks.map((w) => w.key);
  let minIndent = 99;
  for (const line of lines) {
    const t = line.trimStart();
    if (!t.startsWith("- "))
      continue;
    if (isReserved(t.slice(2).trim()))
      continue;
    minIndent = Math.min(minIndent, countIndent(line));
  }
  if (minIndent === 99)
    minIndent = 0;
  const nodes = [];
  const weekData = {};
  const stack = [];
  let lastLeaf = null;
  let inFront2 = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const indent = countIndent(line);
    const trimmed = line.trimStart();
    if (i === 0 && trimmed.trim() === "---") {
      inFront2 = true;
      continue;
    }
    if (inFront2) {
      if (trimmed.trim() === "---")
        inFront2 = false;
      continue;
    }
    if (!trimmed.startsWith("- ")) {
      if (trimmed.trim())
        lastLeaf = null;
      continue;
    }
    const raw = trimmed.slice(2).trim();
    if (/^::note\s*:/i.test(raw)) {
      if (!lastLeaf)
        continue;
      const nb = parseNote(raw);
      if (!nb)
        continue;
      const matchedWk = weekKeys.find((wk) => wk === nb.wk || nb.wk.startsWith(wk) || wk === nb.wk.trim());
      if (!matchedWk)
        continue;
      if (!weekData[lastLeaf.id])
        weekData[lastLeaf.id] = {};
      weekData[lastLeaf.id][matchedWk] = { s: nb.s, note: nb.note };
      continue;
    }
    if (isReserved(raw))
      continue;
    const label = labelOf(raw);
    if (!label)
      continue;
    while (stack.length && stack[stack.length - 1].indent >= indent)
      stack.pop();
    const parent = stack.length ? stack[stack.length - 1] : null;
    const id = parent ? `${parent.id}/${label}` : label;
    const lvl = Math.min(indent - minIndent, 3);
    const colorStatus = inlineStatus(raw);
    const node = { id, label, indent, lineIdx: i, lvl, colorStatus };
    nodes.push(node);
    stack.push(node);
    lastLeaf = node;
  }
  return { filePath, title, calendar, nodes, weekData, lines, startRaw, endRaw };
}
function patchFile(content, filePath, op) {
  var _a, _b;
  const { nodes, lines, calendar } = parseFile(filePath, content);
  const node = nodes.find((n) => n.id === op.nodeId);
  if (!node)
    return content;
  const leading = (_b = (_a = lines[node.lineIdx].match(/^[\t ]*/)) == null ? void 0 : _a[0]) != null ? _b : "";
  const childLead = leading + "	";
  let noteStart = node.lineIdx + 1;
  let noteEnd = noteStart;
  while (noteEnd < lines.length) {
    const l = lines[noteEnd];
    const ci = countIndent(l);
    const ct = l.trimStart();
    if (!ct.startsWith("- ")) {
      if (!ct.trim()) {
        noteEnd++;
        continue;
      }
      break;
    }
    if (ci <= node.indent)
      break;
    if (/^::note\s*:/i.test(ct.slice(2).trim())) {
      noteEnd++;
      continue;
    }
    break;
  }
  const result = [];
  let i = 0;
  while (i < lines.length) {
    if (i === node.lineIdx) {
      const bare = lines[i].replace(/\s*::status:\s*\S+/g, "").trimEnd();
      const statusTag = op.colorStatus > 0 ? ` ::status: ${STATUS_NAMES[op.colorStatus]}` : "";
      result.push(`${bare}${statusTag}`);
      i++;
      while (i < noteEnd)
        i++;
      for (const wk of calendar.weeks.map((w) => w.key)) {
        const entry = op.weekData[wk];
        if (!entry || !entry.s && !entry.note)
          continue;
        const sPart = entry.s > 0 ? ` status: ${STATUS_NAMES[entry.s]},` : "";
        const cPart = entry.note ? ` comment: ${entry.note}` : "";
        result.push(`${childLead}- ::note: {${sPart} date: ${wk},${cPart} }`);
      }
      continue;
    }
    result.push(lines[i]);
    i++;
  }
  return result.join("\n");
}
function patchDates(content, startRaw, endRaw) {
  const lines = content.split("\n");
  let ps = false, pe = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    if (!t.startsWith("- "))
      continue;
    const raw = t.slice(2).trim();
    if (!ps && /^::start:/i.test(raw)) {
      lines[i] = lines[i].replace(/::start:\s*[\d\/\-]+/i, `::start: ${startRaw}`);
      ps = true;
    }
    if (!pe && /^::end:/i.test(raw)) {
      lines[i] = lines[i].replace(/::end:\s*[\d\/\-]+/i, `::end: ${endRaw}`);
      pe = true;
    }
    if (ps && pe)
      break;
  }
  if (!ps || !pe) {
    let at = 0;
    let inF = false;
    for (let i = 0; i < lines.length; i++) {
      if (i === 0 && lines[i].trim() === "---") {
        inF = true;
        continue;
      }
      if (inF && lines[i].trim() === "---") {
        at = i + 1;
        break;
      }
      if (!inF) {
        at = i;
        break;
      }
    }
    lines.splice(
      at,
      0,
      "- ::gellmanMatrix",
      "- ::title: MatrixGellman",
      `- ::start: ${startRaw}`,
      `- ::end: ${endRaw}`,
      ""
    );
  }
  return lines.join("\n");
}

// src/styles.ts
var CSS = `
/* \u2500\u2500\u2500 Root \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.mg-wrap {
  position: relative;
  height: 100%; width: 100%;
  background: #f1f5f9;
  font-family: 'Segoe UI', sans-serif;
  font-size: 12px;
  overflow: hidden;
}

/* \u2500\u2500\u2500 Toolbar  (top bar, never moves) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 Corner  (top-left, frozen on both axes) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 Column header  (top-right, scrolls X with body) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.mg-col-hdr {
  position: absolute;
  top: 46px; left: 300px; right: 0;
  height: 60px;
  z-index: 100;
  overflow: hidden;   /* scroll driven by body via JS */
}
.mg-col-hdr table { border-collapse: collapse; table-layout: fixed; }

/* \u2500\u2500\u2500 Row header  (bottom-left, scrolls Y with body) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.mg-row-hdr {
  position: absolute;
  top: 106px; left: 0;
  width: 300px; bottom: 0;
  z-index: 100;
  overflow: hidden;   /* scroll driven by body via JS */
  border-right: 2px solid #cbd5e1;
}
.mg-row-hdr table { border-collapse: collapse; table-layout: fixed; width: 300px; }

/* \u2500\u2500\u2500 Body  (bottom-right, scrolls both \u2014 drives everything) \u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.mg-body {
  position: absolute;
  top: 106px; left: 300px;
  right: 0; bottom: 0;
  z-index: 10;
  overflow: auto;
}
.mg-body table { border-collapse: collapse; table-layout: fixed; }

/* \u2500\u2500\u2500 Shared table styles \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

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

/* \u2500\u2500\u2500 Row-header label cells \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* Row levels \u2014 applied to tr */
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

/* \u2500\u2500\u2500 Body data cells \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 Hidden rows \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.mg-row-hdr tr.mg-hidden,
.mg-body     tr.mg-hidden { display: none !important; }

/* \u2500\u2500\u2500 Note popup \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500\u2500 Empty state \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.mg-empty {
  position: absolute; top: 106px; left: 0; right: 0; bottom: 0;
  padding: 48px 32px; color: #64748b; font-size: 13px; line-height: 1.8;
}
.mg-empty b    { color: #0f172a; }
.mg-empty code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
`;

// src/main.ts
var VIEW_TYPE = "matrix-gellman";
var CELL_ICONS = ["", "\xB7", "\u25B6", "!", "\u2715", "\u2713"];
var STATUS_COLORS = ["#e2e8f0", "#94a3b8", "#eab308", "#f97316", "#ef4444", "#22c55e"];
var STATUS_LABELS = ["\u2014", "Pending", "In Progress", "At Risk", "Blocked", "Done"];
function cKey(filePath, nodeId) {
  return `${filePath}||${nodeId}`;
}
var MatrixGellmanPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    // Persisted: { collapsed, lastFilePath }
    this.settings = {
      collapsed: {},
      lastFilePath: ""
    };
    this.parsed = null;
    this._writing = false;
    this.patch = (0, import_obsidian.debounce)(async (op) => {
      if (!this.parsed)
        return;
      const file = this.app.vault.getAbstractFileByPath(this.parsed.filePath);
      if (!(file instanceof import_obsidian.TFile))
        return;
      this._writing = true;
      try {
        const content = await this.app.vault.read(file);
        const updated = patchFile(content, this.parsed.filePath, op);
        await this.app.vault.modify(file, updated);
        this.parsed = parseFile(this.parsed.filePath, updated);
      } finally {
        setTimeout(() => {
          this._writing = false;
        }, 400);
      }
    }, 300, true);
    this.patchDates = (0, import_obsidian.debounce)(async (startRaw, endRaw) => {
      if (!this.parsed)
        return;
      const file = this.app.vault.getAbstractFileByPath(this.parsed.filePath);
      if (!(file instanceof import_obsidian.TFile))
        return;
      this._writing = true;
      try {
        const content = await this.app.vault.read(file);
        const updated = patchDates(content, startRaw, endRaw);
        await this.app.vault.modify(file, updated);
        this.parsed = parseFile(this.parsed.filePath, updated);
        this.refreshViews();
      } finally {
        setTimeout(() => {
          this._writing = false;
        }, 400);
      }
    }, 500, true);
  }
  async onload() {
    const saved = await this.loadData();
    if (saved)
      Object.assign(this.settings, saved);
    if (this.settings.lastFilePath) {
      const f = this.app.vault.getAbstractFileByPath(this.settings.lastFilePath);
      if (f instanceof import_obsidian.TFile)
        await this.readFile(this.settings.lastFilePath);
    }
    this.registerView(VIEW_TYPE, (leaf) => new MatrixView(leaf, this));
    this.addRibbonIcon("layout-grid", "MatrixGellman", async () => {
      const f = this.app.workspace.getActiveFile();
      if (f)
        await this.readFile(f.path);
      await this.activateView();
      this.refreshViews();
    });
    this.addCommand({
      id: "matrix-gellman-open",
      name: "Open MatrixGellman",
      callback: async () => {
        const f = this.app.workspace.getActiveFile();
        if (f)
          await this.readFile(f.path);
        await this.activateView();
        this.refreshViews();
      }
    });
    this.addCommand({
      id: "matrix-gellman-track",
      name: "MatrixGellman: track active file",
      callback: async () => {
        const f = this.app.workspace.getActiveFile();
        if (!f) {
          new import_obsidian.Notice("No active file open");
          return;
        }
        await this.readFile(f.path);
        await this.activateView();
        this.refreshViews();
      }
    });
    this.registerEvent(this.app.vault.on("modify", async (file) => {
      if (this._writing)
        return;
      if (file instanceof import_obsidian.TFile && file.path === this.settings.lastFilePath) {
        await this.readFile(file.path);
        this.refreshViews();
      }
    }));
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
  async readFile(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian.TFile))
      return;
    const content = await this.app.vault.read(file);
    this.parsed = parseFile(path, content);
    this.settings.lastFilePath = path;
    await this.saveData(this.settings);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  refreshViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((l) => l.view.refresh());
  }
};
var MatrixView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.styleEl = null;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "MatrixGellman";
  }
  getIcon() {
    return "layout-grid";
  }
  async onOpen() {
    this.containerEl.style.padding = "0";
    this.containerEl.style.overflow = "hidden";
    this.styleEl = document.createElement("style");
    this.styleEl.textContent = CSS;
    document.head.appendChild(this.styleEl);
    const active = this.plugin.app.workspace.getActiveFile();
    if (active && active.path !== this.plugin.settings.lastFilePath) {
      await this.plugin.readFile(active.path);
    } else if (!this.plugin.parsed && active) {
      await this.plugin.readFile(active.path);
    }
    this.render();
  }
  async onClose() {
    var _a;
    (_a = this.styleEl) == null ? void 0 : _a.remove();
  }
  refresh() {
    this.render();
  }
  // ── Render ──────────────────────────────────────────────────────
  render() {
    this.containerEl.empty();
    const wrap = this.containerEl.createDiv({ cls: "mg-wrap" });
    const p = this.plugin.parsed;
    const tb = wrap.createDiv({ cls: "mg-toolbar" });
    const tbL = tb.createDiv();
    tbL.createDiv({
      cls: "mg-toolbar-title",
      text: `MatrixGellman${p ? " \u2014 " + p.title : ""}`
    });
    tbL.createDiv({
      cls: "mg-toolbar-sub",
      text: "Click leaf for status \xB7 Hover cell for note \xB7 Dbl-click to edit \xB7 \u25BC collapse"
    });
    const tbR = tb.createDiv({ cls: "mg-toolbar-right" });
    const dw = tbR.createDiv({ cls: "mg-date-wrap" });
    dw.createEl("label", { text: "Start" });
    const startIn = dw.createEl("input", { cls: "mg-date-input", type: "text" });
    startIn.placeholder = "MM-YY";
    if (p)
      startIn.value = p.startRaw;
    dw.createEl("label", { text: "End" });
    const endIn = dw.createEl("input", { cls: "mg-date-input", type: "text" });
    endIn.placeholder = "MM-YY";
    if (p)
      endIn.value = p.endRaw;
    dw.createEl("button", { cls: "mg-btn-apply", text: "Apply" }).addEventListener("click", () => {
      const s = startIn.value.trim(), e = endIn.value.trim();
      if (!s || !e) {
        new import_obsidian.Notice("Enter both Start and End (MM-YY)");
        return;
      }
      this.plugin.patchDates(s, e);
    });
    [
      { c: "#94a3b8", l: "Pending" },
      { c: "#eab308", l: "In Progress" },
      { c: "#f97316", l: "At Risk" },
      { c: "#ef4444", l: "Blocked" },
      { c: "#22c55e", l: "Done" }
    ].forEach(({ c, l }) => {
      const leg = tbR.createDiv({ cls: "mg-legend" });
      leg.createDiv({ cls: "mg-legend-dot" }).style.background = c;
      leg.appendText(" " + l);
    });
    tbR.createEl("button", { cls: "mg-btn-open", text: "Open .md" }).addEventListener("click", async () => {
      if (!p)
        return;
      const file = this.plugin.app.vault.getAbstractFileByPath(p.filePath);
      if (file instanceof import_obsidian.TFile)
        this.plugin.app.workspace.getLeaf("tab").openFile(file);
    });
    if (!p || p.nodes.length === 0) {
      const em = wrap.createDiv({ cls: "mg-empty" });
      em.innerHTML = !p ? `<b>No file loaded.</b><br><br>
           Use <code>Ctrl+P \u2192 MatrixGellman: track active file</code><br><br>
           Optionally add <code>::Main Project ::Start 06-26 ::End 12-27</code> to the file.` : `<b>No list items found</b> in <code>${p.filePath}</code>.`;
      return;
    }
    const corner = wrap.createDiv({ cls: "mg-corner" });
    const colHdr = wrap.createDiv({ cls: "mg-col-hdr" });
    const rowHdrWrap = wrap.createDiv({ cls: "mg-row-hdr" });
    const body = wrap.createDiv({ cls: "mg-body" });
    const cTable = corner.createEl("table");
    const cThead = cTable.createEl("thead");
    const cMRow = cThead.createEl("tr");
    const cCorner = cMRow.createEl("th", { cls: "mg-th-corner", text: "Topic" });
    cCorner.rowSpan = 2;
    const chTable = colHdr.createEl("table", { cls: "mg-col-hdr-table" });
    const chThead = chTable.createEl("thead");
    const mRow = chThead.createEl("tr");
    p.calendar.months.forEach((m, i) => {
      const th = mRow.createEl("th", {
        cls: "mg-th-month" + (i === p.calendar.months.length - 1 ? " mg-mend" : ""),
        text: m.label
      });
      th.colSpan = m.span;
    });
    const wRow = chThead.createEl("tr");
    p.calendar.weeks.forEach((w) => {
      wRow.createEl("th", {
        cls: [
          "mg-th-week",
          w.isCurrent ? "mg-current" : "",
          w.isMonthEnd ? "mg-mend" : ""
        ].filter(Boolean).join(" "),
        text: w.label
      });
    });
    const rhTable = rowHdrWrap.createEl("table");
    const rhTbody = rhTable.createEl("tbody");
    const bdTable = body.createEl("table", { cls: "mg-body-table" });
    const bdTbody = bdTable.createEl("tbody");
    this.buildRows(rhTbody, bdTbody, p);
    body.addEventListener("scroll", () => {
      colHdr.scrollLeft = body.scrollLeft;
      rowHdrWrap.scrollTop = body.scrollTop;
    });
  }
  // ── Build rows into two parallel tbodys ─────────────────────────
  buildRows(rhTbody, bdTbody, p) {
    var _a, _b, _c, _d;
    const { nodes, weekData, calendar, filePath } = p;
    const collapsed = this.plugin.settings.collapsed;
    const parentMap = /* @__PURE__ */ new Map();
    const childSet = /* @__PURE__ */ new Set();
    const stk = [];
    for (const n of nodes) {
      while (stk.length && stk[stk.length - 1].indent >= n.indent)
        stk.pop();
      const par = stk.length ? stk[stk.length - 1] : null;
      parentMap.set(n.id, (_a = par == null ? void 0 : par.id) != null ? _a : null);
      if (par)
        childSet.add(par.id);
      stk.push(n);
    }
    const isVisible = (id) => {
      let pid = parentMap.get(id);
      while (pid) {
        if (collapsed[cKey(filePath, pid)])
          return false;
        pid = parentMap.get(pid);
      }
      return true;
    };
    const applyVis = () => {
      rhTbody.querySelectorAll("tr[data-id]").forEach((tr) => {
        tr.classList.toggle("mg-hidden", !isVisible(tr.dataset.id));
      });
      bdTbody.querySelectorAll("tr[data-id]").forEach((tr) => {
        tr.classList.toggle("mg-hidden", !isVisible(tr.dataset.id));
      });
    };
    for (const node of nodes) {
      const isLeaf = !childSet.has(node.id);
      const lvl = Math.min(node.lvl, 3);
      const vis = isVisible(node.id);
      const ck = cKey(filePath, node.id);
      const hidCls = vis ? "" : " mg-hidden";
      const rhTr = rhTbody.createEl("tr", { cls: `mg-lvl${lvl}${hidCls}` });
      rhTr.dataset.id = node.id;
      const labelTd = rhTr.createEl("td");
      const inner = labelTd.createDiv({ cls: "mg-label-inner" });
      if (childSet.has(node.id)) {
        const btn = inner.createEl("button", { cls: "mg-toggle" });
        btn.textContent = collapsed[ck] ? "\u25B6" : "\u25BC";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          collapsed[ck] = !collapsed[ck];
          btn.textContent = collapsed[ck] ? "\u25B6" : "\u25BC";
          this.plugin.saveSettings();
          applyVis();
        });
      } else {
        inner.createSpan({ cls: "mg-leaf-sp" });
      }
      const lt = inner.createSpan({ cls: "mg-label-text", text: node.label });
      lt.title = node.label;
      if (isLeaf) {
        labelTd.dataset.ls = String(node.colorStatus);
        labelTd.dataset.lnote = Object.values((_b = weekData[node.id]) != null ? _b : {}).some((e) => e.note) ? "1" : "0";
        labelTd.addEventListener("click", (e) => {
          var _a2;
          if (e.detail >= 2)
            return;
          node.colorStatus = (node.colorStatus + 1) % 6;
          labelTd.dataset.ls = String(node.colorStatus);
          this.plugin.patch({ nodeId: node.id, colorStatus: node.colorStatus, weekData: (_a2 = weekData[node.id]) != null ? _a2 : {} });
        });
      }
      const bdTr = bdTbody.createEl("tr", { cls: `mg-lvl${lvl}${hidCls}` });
      bdTr.dataset.id = node.id;
      for (let c = 0; c < calendar.weeks.length; c++) {
        const wk = calendar.weeks[c].key;
        const entry = (_d = ((_c = weekData[node.id]) != null ? _c : {})[wk]) != null ? _d : { s: 0, note: "" };
        const cell = bdTr.createEl("td", {
          cls: ["mg-cell", calendar.weeks[c].isMonthEnd ? "mg-mend" : ""].filter(Boolean).join(" ")
        });
        cell.dataset.s = String(entry.s);
        if (entry.s > 0)
          cell.textContent = CELL_ICONS[entry.s];
        if (entry.note)
          cell.dataset.hasnote = "1";
        cell.title = [entry.s > 0 ? `[${STATUS_NAMES[entry.s]}]` : "", entry.note].filter(Boolean).join(" \u2014 ");
        if (!isLeaf)
          continue;
        cell.addEventListener("click", (e) => {
          var _a2;
          if (e.detail >= 2)
            return;
          if (!weekData[node.id])
            weekData[node.id] = {};
          const cur = (_a2 = weekData[node.id][wk]) != null ? _a2 : { s: 0, note: "" };
          cur.s = (cur.s + 1) % 6;
          weekData[node.id][wk] = cur;
          cell.dataset.s = String(cur.s);
          cell.textContent = cur.s > 0 ? CELL_ICONS[cur.s] : "";
          cell.title = [cur.s > 0 ? `[${STATUS_NAMES[cur.s]}]` : "", cur.note].filter(Boolean).join(" \u2014 ");
          this.plugin.patch({ nodeId: node.id, colorStatus: node.colorStatus, weekData: weekData[node.id] });
        });
        cell.addEventListener("dblclick", (e) => {
          var _a2, _b2;
          e.stopPropagation();
          const cur = (_b2 = ((_a2 = weekData[node.id]) != null ? _a2 : {})[wk]) != null ? _b2 : { s: 0, note: "" };
          this.openPopup(cell, calendar.weeks[c].key, node.label, cur, (updated) => {
            if (!weekData[node.id])
              weekData[node.id] = {};
            weekData[node.id][wk] = updated;
            cell.dataset.s = String(updated.s);
            cell.dataset.hasnote = updated.note ? "1" : "0";
            cell.textContent = updated.s > 0 ? CELL_ICONS[updated.s] : "";
            cell.title = [updated.s > 0 ? `[${STATUS_NAMES[updated.s]}]` : "", updated.note].filter(Boolean).join(" \u2014 ");
            labelTd.dataset.lnote = Object.values(weekData[node.id]).some((e2) => e2.note) ? "1" : "0";
            this.plugin.patch({ nodeId: node.id, colorStatus: node.colorStatus, weekData: weekData[node.id] });
          });
        });
      }
    }
  }
  // ── Note popup ──────────────────────────────────────────────────
  openPopup(anchor, weekLabel, rowLabel, current, onSave) {
    var _a;
    (_a = document.querySelector(".mg-popup")) == null ? void 0 : _a.remove();
    const popup = document.body.createDiv({ cls: "mg-popup" });
    const rect = anchor.getBoundingClientRect();
    popup.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 230)}px`;
    popup.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;
    popup.createDiv({ cls: "mg-popup-week", text: weekLabel });
    popup.createDiv({ cls: "mg-popup-row", text: rowLabel });
    const sw = popup.createDiv({ cls: "mg-popup-stats" });
    let sel = current.s;
    const btns = [];
    STATUS_LABELS.forEach((lbl, s) => {
      const btn = sw.createEl("button", { cls: "mg-popup-sbtn", text: lbl });
      btn.style.borderColor = STATUS_COLORS[s];
      if (s === sel) {
        btn.style.background = STATUS_COLORS[s];
        btn.style.color = s > 0 ? "white" : "";
      }
      btn.addEventListener("click", () => {
        sel = s;
        btns.forEach((b, i) => {
          const active = i === s;
          b.style.background = active ? STATUS_COLORS[i] : "white";
          b.style.color = active && i > 0 ? "white" : "#475569";
        });
      });
      btns.push(btn);
    });
    const ta = popup.createEl("textarea", { cls: "mg-popup-ta" });
    ta.value = current.note;
    ta.placeholder = "Add a note\u2026";
    setTimeout(() => ta.focus(), 40);
    const act = popup.createDiv({ cls: "mg-popup-actions" });
    act.createEl("button", { cls: "mg-btn-cancel", text: "Cancel" }).addEventListener("click", () => popup.remove());
    act.createEl("button", { cls: "mg-btn-save", text: "Save" }).addEventListener("click", () => {
      onSave({ s: sel, note: ta.value.trim() });
      popup.remove();
    });
    const outside = (e) => {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener("mousedown", outside);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", outside), 10);
    const kh = (e) => {
      if (e.key === "Escape") {
        popup.remove();
        document.removeEventListener("keydown", kh);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        onSave({ s: sel, note: ta.value.trim() });
        popup.remove();
        document.removeEventListener("keydown", kh);
      }
    };
    document.addEventListener("keydown", kh);
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2NhbGVuZGFyLnRzIiwgInNyYy9maWxlaW8udHMiLCAic3JjL3N0eWxlcy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgUGx1Z2luLCBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgVEZpbGUsIGRlYm91bmNlLCBOb3RpY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IHBhcnNlRmlsZSwgcGF0Y2hGaWxlLCBwYXRjaERhdGVzLCBQYXRjaE9wLCBQYXJzZWRGaWxlLCBXZWVrRW50cnksIFNUQVRVU19OQU1FUywgU1RBVFVTX0ZST00gfSBmcm9tIFwiLi9maWxlaW9cIjtcbmltcG9ydCB7IENTUyB9IGZyb20gXCIuL3N0eWxlc1wiO1xuXG5jb25zdCBWSUVXX1RZUEUgICAgID0gXCJtYXRyaXgtZ2VsbG1hblwiO1xuY29uc3QgQ0VMTF9JQ09OUyAgICA9IFtcIlwiLCBcIlx1MDBCN1wiLCBcIlx1MjVCNlwiLCBcIiFcIiwgXCJcdTI3MTVcIiwgXCJcdTI3MTNcIl07XG5jb25zdCBTVEFUVVNfQ09MT1JTID0gW1wiI2UyZThmMFwiLFwiIzk0YTNiOFwiLFwiI2VhYjMwOFwiLFwiI2Y5NzMxNlwiLFwiI2VmNDQ0NFwiLFwiIzIyYzU1ZVwiXTtcbmNvbnN0IFNUQVRVU19MQUJFTFMgPSBbXCJcdTIwMTRcIixcIlBlbmRpbmdcIixcIkluIFByb2dyZXNzXCIsXCJBdCBSaXNrXCIsXCJCbG9ja2VkXCIsXCJEb25lXCJdO1xuXG4vLyBcdTI1MDBcdTI1MDAgQ29sbGFwc2Uga2V5ID0gZmlsZVBhdGggKyBub2RlSWQgc28gZWFjaCBmaWxlIGhhcyBpbmRlcGVuZGVudCBzdGF0ZVxuZnVuY3Rpb24gY0tleShmaWxlUGF0aDogc3RyaW5nLCBub2RlSWQ6IHN0cmluZykgeyByZXR1cm4gYCR7ZmlsZVBhdGh9fHwke25vZGVJZH1gOyB9XG5cbi8vIFx1MjUwMFx1MjUwMCBQbHVnaW4gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNYXRyaXhHZWxsbWFuUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgLy8gUGVyc2lzdGVkOiB7IGNvbGxhcHNlZCwgbGFzdEZpbGVQYXRoIH1cbiAgc2V0dGluZ3M6IHsgY29sbGFwc2VkOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPjsgbGFzdEZpbGVQYXRoOiBzdHJpbmcgfSA9IHtcbiAgICBjb2xsYXBzZWQ6IHt9LCBsYXN0RmlsZVBhdGg6IFwiXCIsXG4gIH07XG4gIHBhcnNlZDogUGFyc2VkRmlsZSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIF93cml0aW5nID0gZmFsc2U7XG5cbiAgYXN5bmMgb25sb2FkKCkge1xuICAgIGNvbnN0IHNhdmVkID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpO1xuICAgIGlmIChzYXZlZCkgT2JqZWN0LmFzc2lnbih0aGlzLnNldHRpbmdzLCBzYXZlZCk7XG5cbiAgICAvLyBSZXN0b3JlIGxhc3QgZmlsZVxuICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RGaWxlUGF0aCkge1xuICAgICAgY29uc3QgZiA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLnNldHRpbmdzLmxhc3RGaWxlUGF0aCk7XG4gICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlKSBhd2FpdCB0aGlzLnJlYWRGaWxlKHRoaXMuc2V0dGluZ3MubGFzdEZpbGVQYXRoKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhWSUVXX1RZUEUsIGxlYWYgPT4gbmV3IE1hdHJpeFZpZXcobGVhZiwgdGhpcykpO1xuXG4gICAgLy8gUmliYm9uOiBhbHdheXMgbG9hZHMgd2hhdGV2ZXIgZmlsZSBpcyBjdXJyZW50bHkgYWN0aXZlXG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwibGF5b3V0LWdyaWRcIiwgXCJNYXRyaXhHZWxsbWFuXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgICAgaWYgKGYpIGF3YWl0IHRoaXMucmVhZEZpbGUoZi5wYXRoKTtcbiAgICAgIGF3YWl0IHRoaXMuYWN0aXZhdGVWaWV3KCk7XG4gICAgICB0aGlzLnJlZnJlc2hWaWV3cygpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcIm1hdHJpeC1nZWxsbWFuLW9wZW5cIixcbiAgICAgIG5hbWU6IFwiT3BlbiBNYXRyaXhHZWxsbWFuXCIsXG4gICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICAgICAgaWYgKGYpIGF3YWl0IHRoaXMucmVhZEZpbGUoZi5wYXRoKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hY3RpdmF0ZVZpZXcoKTtcbiAgICAgICAgdGhpcy5yZWZyZXNoVmlld3MoKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcIm1hdHJpeC1nZWxsbWFuLXRyYWNrXCIsXG4gICAgICBuYW1lOiBcIk1hdHJpeEdlbGxtYW46IHRyYWNrIGFjdGl2ZSBmaWxlXCIsXG4gICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICAgICAgaWYgKCFmKSB7IG5ldyBOb3RpY2UoXCJObyBhY3RpdmUgZmlsZSBvcGVuXCIpOyByZXR1cm47IH1cbiAgICAgICAgYXdhaXQgdGhpcy5yZWFkRmlsZShmLnBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFjdGl2YXRlVmlldygpO1xuICAgICAgICB0aGlzLnJlZnJlc2hWaWV3cygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFdhdGNoIGZvciBleHRlcm5hbCBlZGl0c1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbihcIm1vZGlmeVwiLCBhc3luYyAoZmlsZSkgPT4ge1xuICAgICAgaWYgKHRoaXMuX3dyaXRpbmcpIHJldHVybjtcbiAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUgJiYgZmlsZS5wYXRoID09PSB0aGlzLnNldHRpbmdzLmxhc3RGaWxlUGF0aCkge1xuICAgICAgICBhd2FpdCB0aGlzLnJlYWRGaWxlKGZpbGUucGF0aCk7XG4gICAgICAgIHRoaXMucmVmcmVzaFZpZXdzKCk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcbiAgICBsZXQgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFKVswXTtcbiAgICBpZiAoIWxlYWYpIHtcbiAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhZihcInRhYlwiKTtcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XG4gICAgfVxuICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICB9XG5cbiAgYXN5bmMgcmVhZEZpbGUocGF0aDogc3RyaW5nKSB7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSByZXR1cm47XG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgdGhpcy5wYXJzZWQgPSBwYXJzZUZpbGUocGF0aCwgY29udGVudCk7XG4gICAgdGhpcy5zZXR0aW5ncy5sYXN0RmlsZVBhdGggPSBwYXRoO1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgfVxuXG4gIHBhdGNoID0gZGVib3VuY2UoYXN5bmMgKG9wOiBQYXRjaE9wKSA9PiB7XG4gICAgaWYgKCF0aGlzLnBhcnNlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5wYXJzZWQuZmlsZVBhdGgpO1xuICAgIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHJldHVybjtcbiAgICB0aGlzLl93cml0aW5nID0gdHJ1ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgICBjb25zdCB1cGRhdGVkID0gcGF0Y2hGaWxlKGNvbnRlbnQsIHRoaXMucGFyc2VkLmZpbGVQYXRoLCBvcCk7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgdXBkYXRlZCk7XG4gICAgICB0aGlzLnBhcnNlZCA9IHBhcnNlRmlsZSh0aGlzLnBhcnNlZC5maWxlUGF0aCwgdXBkYXRlZCk7XG4gICAgfSBmaW5hbGx5IHsgc2V0VGltZW91dCgoKSA9PiB7IHRoaXMuX3dyaXRpbmcgPSBmYWxzZTsgfSwgNDAwKTsgfVxuICB9LCAzMDAsIHRydWUpO1xuXG4gIHBhdGNoRGF0ZXMgPSBkZWJvdW5jZShhc3luYyAoc3RhcnRSYXc6IHN0cmluZywgZW5kUmF3OiBzdHJpbmcpID0+IHtcbiAgICBpZiAoIXRoaXMucGFyc2VkKSByZXR1cm47XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLnBhcnNlZC5maWxlUGF0aCk7XG4gICAgaWYgKCEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkgcmV0dXJuO1xuICAgIHRoaXMuX3dyaXRpbmcgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSBwYXRjaERhdGVzKGNvbnRlbnQsIHN0YXJ0UmF3LCBlbmRSYXcpO1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIHVwZGF0ZWQpO1xuICAgICAgdGhpcy5wYXJzZWQgPSBwYXJzZUZpbGUodGhpcy5wYXJzZWQuZmlsZVBhdGgsIHVwZGF0ZWQpO1xuICAgICAgdGhpcy5yZWZyZXNoVmlld3MoKTtcbiAgICB9IGZpbmFsbHkgeyBzZXRUaW1lb3V0KCgpID0+IHsgdGhpcy5fd3JpdGluZyA9IGZhbHNlOyB9LCA0MDApOyB9XG4gIH0sIDUwMCwgdHJ1ZSk7XG5cbiAgcmVmcmVzaFZpZXdzKCkge1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFKVxuICAgICAgLmZvckVhY2gobCA9PiAobC52aWV3IGFzIE1hdHJpeFZpZXcpLnJlZnJlc2goKSk7XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwIFZpZXcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5jbGFzcyBNYXRyaXhWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwbHVnaW46IE1hdHJpeEdlbGxtYW5QbHVnaW47XG4gIHN0eWxlRWw6IEhUTUxTdHlsZUVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IE1hdHJpeEdlbGxtYW5QbHVnaW4pIHtcbiAgICBzdXBlcihsZWFmKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuICBnZXRWaWV3VHlwZSgpICAgIHsgcmV0dXJuIFZJRVdfVFlQRTsgfVxuICBnZXREaXNwbGF5VGV4dCgpIHsgcmV0dXJuIFwiTWF0cml4R2VsbG1hblwiOyB9XG4gIGdldEljb24oKSAgICAgICAgeyByZXR1cm4gXCJsYXlvdXQtZ3JpZFwiOyB9XG5cbiAgYXN5bmMgb25PcGVuKCkge1xuICAgIHRoaXMuY29udGFpbmVyRWwuc3R5bGUucGFkZGluZyAgPSBcIjBcIjtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcbiAgICB0aGlzLnN0eWxlRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgdGhpcy5zdHlsZUVsLnRleHRDb250ZW50ID0gQ1NTO1xuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQodGhpcy5zdHlsZUVsKTtcbiAgICAvLyBBbHdheXMgcHJlZmVyIHRoZSBmaWxlIHRoZSB1c2VyIGlzIGN1cnJlbnRseSBsb29raW5nIGF0XG4gICAgY29uc3QgYWN0aXZlID0gdGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XG4gICAgaWYgKGFjdGl2ZSAmJiBhY3RpdmUucGF0aCAhPT0gdGhpcy5wbHVnaW4uc2V0dGluZ3MubGFzdEZpbGVQYXRoKSB7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5yZWFkRmlsZShhY3RpdmUucGF0aCk7XG4gICAgfSBlbHNlIGlmICghdGhpcy5wbHVnaW4ucGFyc2VkICYmIGFjdGl2ZSkge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ucmVhZEZpbGUoYWN0aXZlLnBhdGgpO1xuICAgIH1cbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG4gIGFzeW5jIG9uQ2xvc2UoKSB7IHRoaXMuc3R5bGVFbD8ucmVtb3ZlKCk7IH1cbiAgcmVmcmVzaCgpICAgICAgIHsgdGhpcy5yZW5kZXIoKTsgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMCBSZW5kZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIHJlbmRlcigpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29uc3Qgd3JhcCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcIm1nLXdyYXBcIiB9KTtcbiAgICBjb25zdCBwICAgID0gdGhpcy5wbHVnaW4ucGFyc2VkO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFRvb2xiYXIgKGFic29sdXRlLCB6LWluZGV4IDk5OSwgbmV2ZXIgc2Nyb2xscykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgdGIgID0gd3JhcC5jcmVhdGVEaXYoeyBjbHM6IFwibWctdG9vbGJhclwiIH0pO1xuICAgIGNvbnN0IHRiTCA9IHRiLmNyZWF0ZURpdigpO1xuICAgIHRiTC5jcmVhdGVEaXYoeyBjbHM6IFwibWctdG9vbGJhci10aXRsZVwiLFxuICAgICAgdGV4dDogYE1hdHJpeEdlbGxtYW4ke3AgPyBcIiBcdTIwMTQgXCIgKyBwLnRpdGxlIDogXCJcIn1gIH0pO1xuICAgIHRiTC5jcmVhdGVEaXYoeyBjbHM6IFwibWctdG9vbGJhci1zdWJcIixcbiAgICAgIHRleHQ6IFwiQ2xpY2sgbGVhZiBmb3Igc3RhdHVzIFx1MDBCNyBIb3ZlciBjZWxsIGZvciBub3RlIFx1MDBCNyBEYmwtY2xpY2sgdG8gZWRpdCBcdTAwQjcgXHUyNUJDIGNvbGxhcHNlXCIgfSk7XG5cbiAgICBjb25zdCB0YlIgPSB0Yi5jcmVhdGVEaXYoeyBjbHM6IFwibWctdG9vbGJhci1yaWdodFwiIH0pO1xuICAgIGNvbnN0IGR3ICA9IHRiUi5jcmVhdGVEaXYoeyBjbHM6IFwibWctZGF0ZS13cmFwXCIgfSk7XG4gICAgZHcuY3JlYXRlRWwoXCJsYWJlbFwiLCB7IHRleHQ6IFwiU3RhcnRcIiB9KTtcbiAgICBjb25zdCBzdGFydEluID0gZHcuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IGNsczogXCJtZy1kYXRlLWlucHV0XCIsIHR5cGU6IFwidGV4dFwiIH0pO1xuICAgIHN0YXJ0SW4ucGxhY2Vob2xkZXIgPSBcIk1NLVlZXCI7XG4gICAgaWYgKHApIHN0YXJ0SW4udmFsdWUgPSBwLnN0YXJ0UmF3O1xuICAgIGR3LmNyZWF0ZUVsKFwibGFiZWxcIiwgeyB0ZXh0OiBcIkVuZFwiIH0pO1xuICAgIGNvbnN0IGVuZEluID0gZHcuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IGNsczogXCJtZy1kYXRlLWlucHV0XCIsIHR5cGU6IFwidGV4dFwiIH0pO1xuICAgIGVuZEluLnBsYWNlaG9sZGVyID0gXCJNTS1ZWVwiO1xuICAgIGlmIChwKSBlbmRJbi52YWx1ZSA9IHAuZW5kUmF3O1xuICAgIGR3LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcIm1nLWJ0bi1hcHBseVwiLCB0ZXh0OiBcIkFwcGx5XCIgfSlcbiAgICAgIC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICBjb25zdCBzID0gc3RhcnRJbi52YWx1ZS50cmltKCksIGUgPSBlbmRJbi52YWx1ZS50cmltKCk7XG4gICAgICAgIGlmICghcyB8fCAhZSkgeyBuZXcgTm90aWNlKFwiRW50ZXIgYm90aCBTdGFydCBhbmQgRW5kIChNTS1ZWSlcIik7IHJldHVybjsgfVxuICAgICAgICB0aGlzLnBsdWdpbi5wYXRjaERhdGVzKHMsIGUpO1xuICAgICAgfSk7XG4gICAgW1xuICAgICAgeyBjOlwiIzk0YTNiOFwiLCBsOlwiUGVuZGluZ1wiICAgICB9LFxuICAgICAgeyBjOlwiI2VhYjMwOFwiLCBsOlwiSW4gUHJvZ3Jlc3NcIiB9LFxuICAgICAgeyBjOlwiI2Y5NzMxNlwiLCBsOlwiQXQgUmlza1wiICAgICB9LFxuICAgICAgeyBjOlwiI2VmNDQ0NFwiLCBsOlwiQmxvY2tlZFwiICAgICB9LFxuICAgICAgeyBjOlwiIzIyYzU1ZVwiLCBsOlwiRG9uZVwiICAgICAgICB9LFxuICAgIF0uZm9yRWFjaCgoeyBjLCBsIH0pID0+IHtcbiAgICAgIGNvbnN0IGxlZyA9IHRiUi5jcmVhdGVEaXYoeyBjbHM6IFwibWctbGVnZW5kXCIgfSk7XG4gICAgICBsZWcuY3JlYXRlRGl2KHsgY2xzOiBcIm1nLWxlZ2VuZC1kb3RcIiB9KS5zdHlsZS5iYWNrZ3JvdW5kID0gYztcbiAgICAgIGxlZy5hcHBlbmRUZXh0KFwiIFwiICsgbCk7XG4gICAgfSk7XG4gICAgdGJSLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcIm1nLWJ0bi1vcGVuXCIsIHRleHQ6IFwiT3BlbiAubWRcIiB9KVxuICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGlmICghcCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwLmZpbGVQYXRoKTtcbiAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSlcbiAgICAgICAgICB0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLmdldExlYWYoXCJ0YWJcIikub3BlbkZpbGUoZmlsZSk7XG4gICAgICB9KTtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBFbXB0eSBzdGF0ZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoIXAgfHwgcC5ub2Rlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IGVtID0gd3JhcC5jcmVhdGVEaXYoeyBjbHM6IFwibWctZW1wdHlcIiB9KTtcbiAgICAgIGVtLmlubmVySFRNTCA9ICFwXG4gICAgICAgID8gYDxiPk5vIGZpbGUgbG9hZGVkLjwvYj48YnI+PGJyPlxuICAgICAgICAgICBVc2UgPGNvZGU+Q3RybCtQIFx1MjE5MiBNYXRyaXhHZWxsbWFuOiB0cmFjayBhY3RpdmUgZmlsZTwvY29kZT48YnI+PGJyPlxuICAgICAgICAgICBPcHRpb25hbGx5IGFkZCA8Y29kZT46Ok1haW4gUHJvamVjdCA6OlN0YXJ0IDA2LTI2IDo6RW5kIDEyLTI3PC9jb2RlPiB0byB0aGUgZmlsZS5gXG4gICAgICAgIDogYDxiPk5vIGxpc3QgaXRlbXMgZm91bmQ8L2I+IGluIDxjb2RlPiR7cC5maWxlUGF0aH08L2NvZGU+LmA7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIDQtcGFuZSBsYXlvdXQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gQ29ybmVyOiB0b3AtbGVmdCwgZnJvemVuIG9uIGJvdGggYXhlc1xuICAgIGNvbnN0IGNvcm5lciAgICAgPSB3cmFwLmNyZWF0ZURpdih7IGNsczogXCJtZy1jb3JuZXJcIiB9KTtcbiAgICAvLyBDb2x1bW4gaGVhZGVyOiB0b3AtcmlnaHQsIHNjcm9sbHMgWCBvbmx5IChkcml2ZW4gYnkgYm9keSlcbiAgICBjb25zdCBjb2xIZHIgICAgID0gd3JhcC5jcmVhdGVEaXYoeyBjbHM6IFwibWctY29sLWhkclwiIH0pO1xuICAgIC8vIFJvdyBoZWFkZXI6IGJvdHRvbS1sZWZ0LCBzY3JvbGxzIFkgb25seSAoZHJpdmVuIGJ5IGJvZHkpXG4gICAgY29uc3Qgcm93SGRyV3JhcCA9IHdyYXAuY3JlYXRlRGl2KHsgY2xzOiBcIm1nLXJvdy1oZHJcIiB9KTtcbiAgICAvLyBCb2R5OiBib3R0b20tcmlnaHQsIHRoZSByZWFsIHNjcm9sbCBjb250YWluZXJcbiAgICBjb25zdCBib2R5ICAgICAgID0gd3JhcC5jcmVhdGVEaXYoeyBjbHM6IFwibWctYm9keVwiIH0pO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIENvcm5lcjogXCJUb3BpY1wiIGxhYmVsIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNvbnN0IGNUYWJsZSAgPSBjb3JuZXIuY3JlYXRlRWwoXCJ0YWJsZVwiKTtcbiAgICBjb25zdCBjVGhlYWQgID0gY1RhYmxlLmNyZWF0ZUVsKFwidGhlYWRcIik7XG4gICAgY29uc3QgY01Sb3cgICA9IGNUaGVhZC5jcmVhdGVFbChcInRyXCIpO1xuICAgIGNvbnN0IGNDb3JuZXIgPSBjTVJvdy5jcmVhdGVFbChcInRoXCIsIHsgY2xzOiBcIm1nLXRoLWNvcm5lclwiLCB0ZXh0OiBcIlRvcGljXCIgfSk7XG4gICAgKGNDb3JuZXIgYXMgSFRNTFRhYmxlQ2VsbEVsZW1lbnQpLnJvd1NwYW4gPSAyO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIENvbHVtbiBoZWFkZXIgdGFibGUgKG1vbnRocyArIHdlZWtzLCBubyBsYWJlbCBjb2x1bW4pIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNvbnN0IGNoVGFibGUgPSBjb2xIZHIuY3JlYXRlRWwoXCJ0YWJsZVwiLCB7IGNsczogXCJtZy1jb2wtaGRyLXRhYmxlXCIgfSk7XG4gICAgY29uc3QgY2hUaGVhZCA9IGNoVGFibGUuY3JlYXRlRWwoXCJ0aGVhZFwiKTtcbiAgICBjb25zdCBtUm93ICAgID0gY2hUaGVhZC5jcmVhdGVFbChcInRyXCIpO1xuICAgIHAuY2FsZW5kYXIubW9udGhzLmZvckVhY2goKG0sIGkpID0+IHtcbiAgICAgIGNvbnN0IHRoID0gbVJvdy5jcmVhdGVFbChcInRoXCIsIHtcbiAgICAgICAgY2xzOiBcIm1nLXRoLW1vbnRoXCIgKyAoaSA9PT0gcC5jYWxlbmRhci5tb250aHMubGVuZ3RoIC0gMSA/IFwiIG1nLW1lbmRcIiA6IFwiXCIpLFxuICAgICAgICB0ZXh0OiBtLmxhYmVsLFxuICAgICAgfSk7XG4gICAgICAodGggYXMgSFRNTFRhYmxlQ2VsbEVsZW1lbnQpLmNvbFNwYW4gPSBtLnNwYW47XG4gICAgfSk7XG4gICAgY29uc3Qgd1JvdyA9IGNoVGhlYWQuY3JlYXRlRWwoXCJ0clwiKTtcbiAgICBwLmNhbGVuZGFyLndlZWtzLmZvckVhY2godyA9PiB7XG4gICAgICB3Um93LmNyZWF0ZUVsKFwidGhcIiwge1xuICAgICAgICBjbHM6IFtcIm1nLXRoLXdlZWtcIixcbiAgICAgICAgICB3LmlzQ3VycmVudCAgPyBcIm1nLWN1cnJlbnRcIiA6IFwiXCIsXG4gICAgICAgICAgdy5pc01vbnRoRW5kID8gXCJtZy1tZW5kXCIgICAgOiBcIlwiLFxuICAgICAgICBdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIFwiKSxcbiAgICAgICAgdGV4dDogdy5sYWJlbCxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFJvdyBoZWFkZXIgdGFibGUgKGxhYmVsIGNvbHVtbiBvbmx5LCBubyB3ZWVrIGNlbGxzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zdCByaFRhYmxlID0gcm93SGRyV3JhcC5jcmVhdGVFbChcInRhYmxlXCIpO1xuICAgIGNvbnN0IHJoVGJvZHkgPSByaFRhYmxlLmNyZWF0ZUVsKFwidGJvZHlcIik7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQm9keSB0YWJsZSAod2VlayBjZWxscyBvbmx5LCBubyBsYWJlbCBjb2x1bW4pIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNvbnN0IGJkVGFibGUgPSBib2R5LmNyZWF0ZUVsKFwidGFibGVcIiwgeyBjbHM6IFwibWctYm9keS10YWJsZVwiIH0pO1xuICAgIGNvbnN0IGJkVGJvZHkgPSBiZFRhYmxlLmNyZWF0ZUVsKFwidGJvZHlcIik7XG5cbiAgICB0aGlzLmJ1aWxkUm93cyhyaFRib2R5LCBiZFRib2R5LCBwKTtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBKUyBzY3JvbGwgc3luYzogYm9keSBkcml2ZXMgY29sSGRyIChYKSBhbmQgcm93SGRyIChZKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgKCkgPT4ge1xuICAgICAgY29sSGRyLnNjcm9sbExlZnQgICAgID0gYm9keS5zY3JvbGxMZWZ0O1xuICAgICAgcm93SGRyV3JhcC5zY3JvbGxUb3AgID0gYm9keS5zY3JvbGxUb3A7XG4gICAgfSk7XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDAgQnVpbGQgcm93cyBpbnRvIHR3byBwYXJhbGxlbCB0Ym9keXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIGJ1aWxkUm93cyhcbiAgICByaFRib2R5OiBIVE1MVGFibGVTZWN0aW9uRWxlbWVudCwgICAvLyBsYWJlbCBjb2x1bW5cbiAgICBiZFRib2R5OiBIVE1MVGFibGVTZWN0aW9uRWxlbWVudCwgICAvLyB3ZWVrIGNlbGxzXG4gICAgcDogUGFyc2VkRmlsZVxuICApIHtcbiAgICBjb25zdCB7IG5vZGVzLCB3ZWVrRGF0YSwgY2FsZW5kYXIsIGZpbGVQYXRoIH0gPSBwO1xuICAgIGNvbnN0IGNvbGxhcHNlZCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbGxhcHNlZDtcblxuICAgIHR5cGUgTm9kZVQgPSB0eXBlb2Ygbm9kZXNbMF07XG4gICAgY29uc3QgcGFyZW50TWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZyB8IG51bGw+KCk7XG4gICAgY29uc3QgY2hpbGRTZXQgID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3Qgc3RrOiBOb2RlVFtdID0gW107XG4gICAgZm9yIChjb25zdCBuIG9mIG5vZGVzKSB7XG4gICAgICB3aGlsZSAoc3RrLmxlbmd0aCAmJiBzdGtbc3RrLmxlbmd0aC0xXS5pbmRlbnQgPj0gbi5pbmRlbnQpIHN0ay5wb3AoKTtcbiAgICAgIGNvbnN0IHBhciA9IHN0ay5sZW5ndGggPyBzdGtbc3RrLmxlbmd0aC0xXSA6IG51bGw7XG4gICAgICBwYXJlbnRNYXAuc2V0KG4uaWQsIHBhcj8uaWQgPz8gbnVsbCk7XG4gICAgICBpZiAocGFyKSBjaGlsZFNldC5hZGQocGFyLmlkKTtcbiAgICAgIHN0ay5wdXNoKG4pO1xuICAgIH1cblxuICAgIGNvbnN0IGlzVmlzaWJsZSA9IChpZDogc3RyaW5nKTogYm9vbGVhbiA9PiB7XG4gICAgICBsZXQgcGlkID0gcGFyZW50TWFwLmdldChpZCk7XG4gICAgICB3aGlsZSAocGlkKSB7XG4gICAgICAgIGlmIChjb2xsYXBzZWRbY0tleShmaWxlUGF0aCwgcGlkKV0pIHJldHVybiBmYWxzZTtcbiAgICAgICAgcGlkID0gcGFyZW50TWFwLmdldChwaWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIC8vIFN5bmMgdmlzaWJpbGl0eSBhY3Jvc3MgYm90aCB0YWJsZXNcbiAgICBjb25zdCBhcHBseVZpcyA9ICgpID0+IHtcbiAgICAgIHJoVGJvZHkucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXCJ0cltkYXRhLWlkXVwiKS5mb3JFYWNoKHRyID0+IHtcbiAgICAgICAgdHIuY2xhc3NMaXN0LnRvZ2dsZShcIm1nLWhpZGRlblwiLCAhaXNWaXNpYmxlKHRyLmRhdGFzZXQuaWQhKSk7XG4gICAgICB9KTtcbiAgICAgIGJkVGJvZHkucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXCJ0cltkYXRhLWlkXVwiKS5mb3JFYWNoKHRyID0+IHtcbiAgICAgICAgdHIuY2xhc3NMaXN0LnRvZ2dsZShcIm1nLWhpZGRlblwiLCAhaXNWaXNpYmxlKHRyLmRhdGFzZXQuaWQhKSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzKSB7XG4gICAgICBjb25zdCBpc0xlYWYgPSAhY2hpbGRTZXQuaGFzKG5vZGUuaWQpO1xuICAgICAgY29uc3QgbHZsICAgID0gTWF0aC5taW4obm9kZS5sdmwsIDMpO1xuICAgICAgY29uc3QgdmlzICAgID0gaXNWaXNpYmxlKG5vZGUuaWQpO1xuICAgICAgY29uc3QgY2sgICAgID0gY0tleShmaWxlUGF0aCwgbm9kZS5pZCk7XG4gICAgICBjb25zdCBoaWRDbHMgPSB2aXMgPyBcIlwiIDogXCIgbWctaGlkZGVuXCI7XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBMYWJlbCByb3cgKGxlZnQgcGFuZSkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCByaFRyICAgID0gcmhUYm9keS5jcmVhdGVFbChcInRyXCIsIHsgY2xzOiBgbWctbHZsJHtsdmx9JHtoaWRDbHN9YCB9KTtcbiAgICAgIHJoVHIuZGF0YXNldC5pZCA9IG5vZGUuaWQ7XG4gICAgICBjb25zdCBsYWJlbFRkID0gcmhUci5jcmVhdGVFbChcInRkXCIpO1xuICAgICAgY29uc3QgaW5uZXIgICA9IGxhYmVsVGQuY3JlYXRlRGl2KHsgY2xzOiBcIm1nLWxhYmVsLWlubmVyXCIgfSk7XG5cbiAgICAgIGlmIChjaGlsZFNldC5oYXMobm9kZS5pZCkpIHtcbiAgICAgICAgY29uc3QgYnRuID0gaW5uZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwibWctdG9nZ2xlXCIgfSk7XG4gICAgICAgIGJ0bi50ZXh0Q29udGVudCA9IGNvbGxhcHNlZFtja10gPyBcIlx1MjVCNlwiIDogXCJcdTI1QkNcIjtcbiAgICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBlID0+IHtcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGNvbGxhcHNlZFtja10gPSAhY29sbGFwc2VkW2NrXTtcbiAgICAgICAgICBidG4udGV4dENvbnRlbnQgPSBjb2xsYXBzZWRbY2tdID8gXCJcdTI1QjZcIiA6IFwiXHUyNUJDXCI7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgYXBwbHlWaXMoKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbm5lci5jcmVhdGVTcGFuKHsgY2xzOiBcIm1nLWxlYWYtc3BcIiB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbHQgPSBpbm5lci5jcmVhdGVTcGFuKHsgY2xzOiBcIm1nLWxhYmVsLXRleHRcIiwgdGV4dDogbm9kZS5sYWJlbCB9KTtcbiAgICAgIGx0LnRpdGxlID0gbm9kZS5sYWJlbDtcblxuICAgICAgaWYgKGlzTGVhZikge1xuICAgICAgICBsYWJlbFRkLmRhdGFzZXQubHMgICAgPSBTdHJpbmcobm9kZS5jb2xvclN0YXR1cyk7XG4gICAgICAgIGxhYmVsVGQuZGF0YXNldC5sbm90ZSA9IE9iamVjdC52YWx1ZXMod2Vla0RhdGFbbm9kZS5pZF0gPz8ge30pLnNvbWUoZSA9PiBlLm5vdGUpID8gXCIxXCIgOiBcIjBcIjtcbiAgICAgICAgbGFiZWxUZC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZSA9PiB7XG4gICAgICAgICAgaWYgKChlIGFzIE1vdXNlRXZlbnQpLmRldGFpbCA+PSAyKSByZXR1cm47XG4gICAgICAgICAgbm9kZS5jb2xvclN0YXR1cyA9IChub2RlLmNvbG9yU3RhdHVzICsgMSkgJSA2O1xuICAgICAgICAgIGxhYmVsVGQuZGF0YXNldC5scyA9IFN0cmluZyhub2RlLmNvbG9yU3RhdHVzKTtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5wYXRjaCh7IG5vZGVJZDogbm9kZS5pZCwgY29sb3JTdGF0dXM6IG5vZGUuY29sb3JTdGF0dXMsIHdlZWtEYXRhOiB3ZWVrRGF0YVtub2RlLmlkXSA/PyB7fSB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBDZWxsIHJvdyAocmlnaHQgcGFuZSkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCBiZFRyID0gYmRUYm9keS5jcmVhdGVFbChcInRyXCIsIHsgY2xzOiBgbWctbHZsJHtsdmx9JHtoaWRDbHN9YCB9KTtcbiAgICAgIGJkVHIuZGF0YXNldC5pZCA9IG5vZGUuaWQ7XG5cbiAgICAgIGZvciAobGV0IGMgPSAwOyBjIDwgY2FsZW5kYXIud2Vla3MubGVuZ3RoOyBjKyspIHtcbiAgICAgICAgY29uc3Qgd2sgICAgPSBjYWxlbmRhci53ZWVrc1tjXS5rZXk7XG4gICAgICAgIGNvbnN0IGVudHJ5ID0gKHdlZWtEYXRhW25vZGUuaWRdID8/IHt9KVt3a10gPz8geyBzOiAwLCBub3RlOiBcIlwiIH07XG4gICAgICAgIGNvbnN0IGNlbGwgID0gYmRUci5jcmVhdGVFbChcInRkXCIsIHtcbiAgICAgICAgICBjbHM6IFtcIm1nLWNlbGxcIiwgY2FsZW5kYXIud2Vla3NbY10uaXNNb250aEVuZCA/IFwibWctbWVuZFwiIDogXCJcIl0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgXCIpLFxuICAgICAgICB9KTtcbiAgICAgICAgY2VsbC5kYXRhc2V0LnMgPSBTdHJpbmcoZW50cnkucyk7XG4gICAgICAgIGlmIChlbnRyeS5zID4gMCkgY2VsbC50ZXh0Q29udGVudCA9IENFTExfSUNPTlNbZW50cnkuc107XG4gICAgICAgIGlmIChlbnRyeS5ub3RlKSBjZWxsLmRhdGFzZXQuaGFzbm90ZSA9IFwiMVwiO1xuICAgICAgICBjZWxsLnRpdGxlID0gW2VudHJ5LnMgPiAwID8gYFske1NUQVRVU19OQU1FU1tlbnRyeS5zXX1dYCA6IFwiXCIsIGVudHJ5Lm5vdGVdXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIFx1MjAxNCBcIik7XG5cbiAgICAgICAgaWYgKCFpc0xlYWYpIGNvbnRpbnVlO1xuXG4gICAgICAgIGNlbGwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGUgPT4ge1xuICAgICAgICAgIGlmICgoZSBhcyBNb3VzZUV2ZW50KS5kZXRhaWwgPj0gMikgcmV0dXJuO1xuICAgICAgICAgIGlmICghd2Vla0RhdGFbbm9kZS5pZF0pIHdlZWtEYXRhW25vZGUuaWRdID0ge307XG4gICAgICAgICAgY29uc3QgY3VyID0gd2Vla0RhdGFbbm9kZS5pZF1bd2tdID8/IHsgczogMCwgbm90ZTogXCJcIiB9O1xuICAgICAgICAgIGN1ci5zID0gKGN1ci5zICsgMSkgJSA2O1xuICAgICAgICAgIHdlZWtEYXRhW25vZGUuaWRdW3drXSA9IGN1cjtcbiAgICAgICAgICBjZWxsLmRhdGFzZXQucyAgID0gU3RyaW5nKGN1ci5zKTtcbiAgICAgICAgICBjZWxsLnRleHRDb250ZW50ID0gY3VyLnMgPiAwID8gQ0VMTF9JQ09OU1tjdXIuc10gOiBcIlwiO1xuICAgICAgICAgIGNlbGwudGl0bGUgPSBbY3VyLnMgPiAwID8gYFske1NUQVRVU19OQU1FU1tjdXIuc119XWAgOiBcIlwiLCBjdXIubm90ZV0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgXHUyMDE0IFwiKTtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5wYXRjaCh7IG5vZGVJZDogbm9kZS5pZCwgY29sb3JTdGF0dXM6IG5vZGUuY29sb3JTdGF0dXMsIHdlZWtEYXRhOiB3ZWVrRGF0YVtub2RlLmlkXSB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY2VsbC5hZGRFdmVudExpc3RlbmVyKFwiZGJsY2xpY2tcIiwgZSA9PiB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBjb25zdCBjdXIgPSAod2Vla0RhdGFbbm9kZS5pZF0gPz8ge30pW3drXSA/PyB7IHM6IDAsIG5vdGU6IFwiXCIgfTtcbiAgICAgICAgICB0aGlzLm9wZW5Qb3B1cChjZWxsLCBjYWxlbmRhci53ZWVrc1tjXS5rZXksIG5vZGUubGFiZWwsIGN1ciwgdXBkYXRlZCA9PiB7XG4gICAgICAgICAgICBpZiAoIXdlZWtEYXRhW25vZGUuaWRdKSB3ZWVrRGF0YVtub2RlLmlkXSA9IHt9O1xuICAgICAgICAgICAgd2Vla0RhdGFbbm9kZS5pZF1bd2tdID0gdXBkYXRlZDtcbiAgICAgICAgICAgIGNlbGwuZGF0YXNldC5zICAgICAgICA9IFN0cmluZyh1cGRhdGVkLnMpO1xuICAgICAgICAgICAgY2VsbC5kYXRhc2V0Lmhhc25vdGUgID0gdXBkYXRlZC5ub3RlID8gXCIxXCIgOiBcIjBcIjtcbiAgICAgICAgICAgIGNlbGwudGV4dENvbnRlbnQgICAgICA9IHVwZGF0ZWQucyA+IDAgPyBDRUxMX0lDT05TW3VwZGF0ZWQuc10gOiBcIlwiO1xuICAgICAgICAgICAgY2VsbC50aXRsZSA9IFt1cGRhdGVkLnMgPiAwID8gYFske1NUQVRVU19OQU1FU1t1cGRhdGVkLnNdfV1gIDogXCJcIiwgdXBkYXRlZC5ub3RlXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiBcdTIwMTQgXCIpO1xuICAgICAgICAgICAgbGFiZWxUZC5kYXRhc2V0Lmxub3RlID0gT2JqZWN0LnZhbHVlcyh3ZWVrRGF0YVtub2RlLmlkXSkuc29tZShlID0+IGUubm90ZSkgPyBcIjFcIiA6IFwiMFwiO1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4ucGF0Y2goeyBub2RlSWQ6IG5vZGUuaWQsIGNvbG9yU3RhdHVzOiBub2RlLmNvbG9yU3RhdHVzLCB3ZWVrRGF0YTogd2Vla0RhdGFbbm9kZS5pZF0gfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMCBOb3RlIHBvcHVwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICBvcGVuUG9wdXAoXG4gICAgYW5jaG9yOiBIVE1MRWxlbWVudCwgd2Vla0xhYmVsOiBzdHJpbmcsIHJvd0xhYmVsOiBzdHJpbmcsXG4gICAgY3VycmVudDogV2Vla0VudHJ5LCBvblNhdmU6IChlOiBXZWVrRW50cnkpID0+IHZvaWRcbiAgKSB7XG4gICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5tZy1wb3B1cFwiKT8ucmVtb3ZlKCk7XG4gICAgY29uc3QgcG9wdXAgPSBkb2N1bWVudC5ib2R5LmNyZWF0ZURpdih7IGNsczogXCJtZy1wb3B1cFwiIH0pO1xuICAgIGNvbnN0IHJlY3QgID0gYW5jaG9yLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHBvcHVwLnN0eWxlLnRvcCAgPSBgJHtNYXRoLm1pbihyZWN0LmJvdHRvbSArIDYsIHdpbmRvdy5pbm5lckhlaWdodCAtIDIzMCl9cHhgO1xuICAgIHBvcHVwLnN0eWxlLmxlZnQgPSBgJHtNYXRoLm1pbihyZWN0LmxlZnQsIHdpbmRvdy5pbm5lcldpZHRoIC0gMzIwKX1weGA7XG5cbiAgICBwb3B1cC5jcmVhdGVEaXYoeyBjbHM6IFwibWctcG9wdXAtd2Vla1wiLCB0ZXh0OiB3ZWVrTGFiZWwgfSk7XG4gICAgcG9wdXAuY3JlYXRlRGl2KHsgY2xzOiBcIm1nLXBvcHVwLXJvd1wiLCAgdGV4dDogcm93TGFiZWwgfSk7XG5cbiAgICBjb25zdCBzdyAgPSBwb3B1cC5jcmVhdGVEaXYoeyBjbHM6IFwibWctcG9wdXAtc3RhdHNcIiB9KTtcbiAgICBsZXQgc2VsICAgPSBjdXJyZW50LnM7XG4gICAgY29uc3QgYnRuczogSFRNTEJ1dHRvbkVsZW1lbnRbXSA9IFtdO1xuXG4gICAgU1RBVFVTX0xBQkVMUy5mb3JFYWNoKChsYmwsIHMpID0+IHtcbiAgICAgIGNvbnN0IGJ0biA9IHN3LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcIm1nLXBvcHVwLXNidG5cIiwgdGV4dDogbGJsIH0pO1xuICAgICAgYnRuLnN0eWxlLmJvcmRlckNvbG9yID0gU1RBVFVTX0NPTE9SU1tzXTtcbiAgICAgIGlmIChzID09PSBzZWwpIHsgYnRuLnN0eWxlLmJhY2tncm91bmQgPSBTVEFUVVNfQ09MT1JTW3NdOyBidG4uc3R5bGUuY29sb3IgPSBzID4gMCA/IFwid2hpdGVcIiA6IFwiXCI7IH1cbiAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICBzZWwgPSBzO1xuICAgICAgICBidG5zLmZvckVhY2goKGIsIGkpID0+IHtcbiAgICAgICAgICBjb25zdCBhY3RpdmUgPSBpID09PSBzO1xuICAgICAgICAgIGIuc3R5bGUuYmFja2dyb3VuZCA9IGFjdGl2ZSA/IFNUQVRVU19DT0xPUlNbaV0gOiBcIndoaXRlXCI7XG4gICAgICAgICAgYi5zdHlsZS5jb2xvciAgICAgID0gYWN0aXZlICYmIGkgPiAwID8gXCJ3aGl0ZVwiIDogXCIjNDc1NTY5XCI7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICBidG5zLnB1c2goYnRuKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IHRhID0gcG9wdXAuY3JlYXRlRWwoXCJ0ZXh0YXJlYVwiLCB7IGNsczogXCJtZy1wb3B1cC10YVwiIH0pO1xuICAgIHRhLnZhbHVlID0gY3VycmVudC5ub3RlOyB0YS5wbGFjZWhvbGRlciA9IFwiQWRkIGEgbm90ZVx1MjAyNlwiO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gdGEuZm9jdXMoKSwgNDApO1xuXG4gICAgY29uc3QgYWN0ID0gcG9wdXAuY3JlYXRlRGl2KHsgY2xzOiBcIm1nLXBvcHVwLWFjdGlvbnNcIiB9KTtcbiAgICBhY3QuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwibWctYnRuLWNhbmNlbFwiLCB0ZXh0OiBcIkNhbmNlbFwiIH0pXG4gICAgICAuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHBvcHVwLnJlbW92ZSgpKTtcbiAgICBhY3QuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwibWctYnRuLXNhdmVcIiwgdGV4dDogXCJTYXZlXCIgfSlcbiAgICAgIC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4geyBvblNhdmUoeyBzOiBzZWwsIG5vdGU6IHRhLnZhbHVlLnRyaW0oKSB9KTsgcG9wdXAucmVtb3ZlKCk7IH0pO1xuXG4gICAgY29uc3Qgb3V0c2lkZSA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICBpZiAoIXBvcHVwLmNvbnRhaW5zKGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50KSkge1xuICAgICAgICBwb3B1cC5yZW1vdmUoKTsgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBvdXRzaWRlKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHNldFRpbWVvdXQoKCkgPT4gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBvdXRzaWRlKSwgMTApO1xuXG4gICAgY29uc3Qga2ggPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xuICAgICAgaWYgKGUua2V5ID09PSBcIkVzY2FwZVwiKSB7IHBvcHVwLnJlbW92ZSgpOyBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBraCk7IH1cbiAgICAgIGlmICgoZS5jdHJsS2V5IHx8IGUubWV0YUtleSkgJiYgZS5rZXkgPT09IFwiRW50ZXJcIikge1xuICAgICAgICBvblNhdmUoeyBzOiBzZWwsIG5vdGU6IHRhLnZhbHVlLnRyaW0oKSB9KTsgcG9wdXAucmVtb3ZlKCk7IGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtoKTtcbiAgfVxufVxuIiwgImNvbnN0IE1PTlRIX05BTUVTID0gW1wiSmFuXCIsXCJGZWJcIixcIk1hclwiLFwiQXByXCIsXCJNYXlcIixcIkp1blwiLFxuICAgICAgICAgICAgICAgICAgICAgXCJKdWxcIixcIkF1Z1wiLFwiU2VwXCIsXCJPY3RcIixcIk5vdlwiLFwiRGVjXCJdO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VNb250aFllYXIocmF3OiBzdHJpbmcpOiB7IHllYXI6IG51bWJlcjsgbW9udGg6IG51bWJlciB9IHwgbnVsbCB7XG4gIC8vIEFjY2VwdHMgTU0tWVksIE1NL1lZLCBNTS1ZWVlZLCBNTS9ZWVlZXG4gIGNvbnN0IHMgPSByYXcudHJpbSgpLnJlcGxhY2UoL1xcLy9nLCBcIi1cIik7XG4gIGNvbnN0IHAgPSBzLnNwbGl0KFwiLVwiKTtcbiAgaWYgKHAubGVuZ3RoICE9PSAyKSByZXR1cm4gbnVsbDtcbiAgbGV0IG1vbnRoID0gcGFyc2VJbnQocFswXSwgMTApO1xuICBsZXQgeWVhciAgPSBwYXJzZUludChwWzFdLCAxMCk7XG4gIGlmIChpc05hTihtb250aCkgfHwgaXNOYU4oeWVhcikpIHJldHVybiBudWxsO1xuICBpZiAoeWVhciA8IDEwMCkgeWVhciArPSAyMDAwO1xuICBpZiAobW9udGggPCAxIHx8IG1vbnRoID4gMTIpIHJldHVybiBudWxsO1xuICByZXR1cm4geyB5ZWFyLCBtb250aCB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdlZWtDb2wge1xuICBrZXk6ICAgICAgICBzdHJpbmc7ICAgLy8gXCJKdW4gMjAyNiBXMlwiXG4gIGxhYmVsOiAgICAgIHN0cmluZzsgICAvLyBcIlcyXCJcbiAgbW9udGhMYWJlbDogc3RyaW5nOyAgIC8vIFwiSnVuIDIwMjZcIlxuICBtb250aElkeDogICBudW1iZXI7XG4gIGlzTW9udGhFbmQ6IGJvb2xlYW47XG4gIGlzQ3VycmVudDogIGJvb2xlYW47XG59XG5leHBvcnQgaW50ZXJmYWNlIE1vbnRoR3JvdXAgeyBsYWJlbDogc3RyaW5nOyBzcGFuOiBudW1iZXI7IH1cbmV4cG9ydCBpbnRlcmZhY2UgQ2FsZW5kYXIgICB7IHdlZWtzOiBXZWVrQ29sW107IG1vbnRoczogTW9udGhHcm91cFtdOyB0b3RhbDogbnVtYmVyOyB9XG5cbi8vIFx1MjUwMFx1MjUwMCBQdXJlIGFyaXRobWV0aWMgaGVscGVycyAobm8gRFNUIGlzc3VlcykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8vIERheS1vZi13ZWVrIGZvciB0aGUgMXN0IG9mIGEgbW9udGggKDA9U3VuIFx1MjAyNiA2PVNhdClcbmZ1bmN0aW9uIGZpcnN0RG93KHk6IG51bWJlciwgbTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgdCA9IFswLDMsMiw1LDAsMyw1LDEsNCw2LDIsNF07XG4gIGNvbnN0IHl5ID0gbSA8IDMgPyB5IC0gMSA6IHk7XG4gIHJldHVybiAoeXkgKyBNYXRoLmZsb29yKHl5LzQpIC0gTWF0aC5mbG9vcih5eS8xMDApICsgTWF0aC5mbG9vcih5eS80MDApICsgdFttLTFdKSAlIDc7XG59XG5mdW5jdGlvbiBkYXlzSW5Nb250aCh5OiBudW1iZXIsIG06IG51bWJlcik6IG51bWJlciB7XG4gIGlmIChtID09PSAyKSByZXR1cm4gKHklND09PTAgJiYgeSUxMDAhPT0wKSB8fCB5JTQwMD09PTAgPyAyOSA6IDI4O1xuICByZXR1cm4gWzAsMzEsMjgsMzEsMzAsMzEsMzAsMzEsMzEsMzAsMzEsMzAsMzFdW21dO1xufVxuLy8gMS1iYXNlZCBkYXkgbnVtYmVycyBvZiBhbGwgTW9uZGF5cyBpbiBtb250aCB5L21cbmZ1bmN0aW9uIG1vbmRheXNJbk1vbnRoKHk6IG51bWJlciwgbTogbnVtYmVyKTogbnVtYmVyW10ge1xuICBjb25zdCBmZCAgID0gZmlyc3REb3coeSwgbSk7XG4gIGNvbnN0IHNraXAgPSAoMSAtIGZkICsgNykgJSA3OyAvLyBkYXlzIGZyb20gMXN0IHRvIGZpcnN0IE1vbmRheVxuICBjb25zdCBkaW0gID0gZGF5c0luTW9udGgoeSwgbSk7XG4gIGNvbnN0IHI6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IGQgPSAxICsgc2tpcDsgZCA8PSBkaW07IGQgKz0gNykgci5wdXNoKGQpO1xuICByZXR1cm4gcjtcbn1cbi8vIE1vbmRheSBvZiB0aGUgY3VycmVudCByZWFsLXdvcmxkIHdlZWsgYXMgeS9tL2RcbmZ1bmN0aW9uIGN1cnJlbnRNb25kYXlZTUQoKTogeyB5OiBudW1iZXI7IG06IG51bWJlcjsgZDogbnVtYmVyIH0ge1xuICBjb25zdCBub3cgID0gbmV3IERhdGUoKTtcbiAgY29uc3QgZG93ICA9IG5vdy5nZXREYXkoKTsgICAgICAgICAgICAgICAvLyAwPVN1blxuICBjb25zdCBiYWNrID0gZG93ID09PSAwID8gNiA6IGRvdyAtIDE7XG4gIGNvbnN0IHRzICAgPSBub3cuZ2V0VGltZSgpIC0gYmFjayAqIDg2XzQwMF8wMDA7XG4gIGNvbnN0IG1vbiAgPSBuZXcgRGF0ZSh0cyk7XG4gIHJldHVybiB7IHk6IG1vbi5nZXRGdWxsWWVhcigpLCBtOiBtb24uZ2V0TW9udGgoKSArIDEsIGQ6IG1vbi5nZXREYXRlKCkgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ2FsZW5kYXIoc3k6IG51bWJlciwgc206IG51bWJlciwgZXk6IG51bWJlciwgZW06IG51bWJlcik6IENhbGVuZGFyIHtcbiAgY29uc3Qgd2Vla3M6ICBXZWVrQ29sW10gICAgPSBbXTtcbiAgY29uc3QgbW9udGhzOiBNb250aEdyb3VwW10gPSBbXTtcbiAgY29uc3QgY3VyID0gY3VycmVudE1vbmRheVlNRCgpO1xuICBsZXQgeSA9IHN5LCBtID0gc20sIG1JZHggPSAwO1xuXG4gIHdoaWxlICh5IDwgZXkgfHwgKHkgPT09IGV5ICYmIG0gPD0gZW0pKSB7XG4gICAgY29uc3QgbWwgICAgICA9IGAke01PTlRIX05BTUVTW20tMV19ICR7eX1gO1xuICAgIGNvbnN0IG1vbmRheXMgPSBtb25kYXlzSW5Nb250aCh5LCBtKTtcblxuICAgIG1vbmRheXMuZm9yRWFjaCgoZGF5LCB3KSA9PiB7XG4gICAgICB3ZWVrcy5wdXNoKHtcbiAgICAgICAga2V5OiAgICAgICAgYCR7bWx9IFcke3crMX1gLFxuICAgICAgICBsYWJlbDogICAgICBgVyR7dysxfWAsXG4gICAgICAgIG1vbnRoTGFiZWw6IG1sLFxuICAgICAgICBtb250aElkeDogICBtSWR4LFxuICAgICAgICBpc01vbnRoRW5kOiB3ID09PSBtb25kYXlzLmxlbmd0aCAtIDEsXG4gICAgICAgIGlzQ3VycmVudDogIHkgPT09IGN1ci55ICYmIG0gPT09IGN1ci5tICYmIGRheSA9PT0gY3VyLmQsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIG1vbnRocy5wdXNoKHsgbGFiZWw6IG1sLCBzcGFuOiBtb25kYXlzLmxlbmd0aCB9KTtcbiAgICBtSWR4Kys7XG4gICAgbSsrOyBpZiAobSA+IDEyKSB7IG0gPSAxOyB5Kys7IH1cbiAgfVxuXG4gIHJldHVybiB7IHdlZWtzLCBtb250aHMsIHRvdGFsOiB3ZWVrcy5sZW5ndGggfTtcbn1cbiIsICJpbXBvcnQgeyBwYXJzZU1vbnRoWWVhciwgYnVpbGRDYWxlbmRhciwgQ2FsZW5kYXIgfSBmcm9tIFwiLi9jYWxlbmRhclwiO1xuXG4vLyBcdTI1MDBcdTI1MDAgU3RhdHVzIHZvY2FiIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IGNvbnN0IFNUQVRVU19OQU1FUyA9IFtcIlwiLCBcInBlbmRpbmdcIiwgXCJpbi1wcm9ncmVzc1wiLCBcImF0LXJpc2tcIiwgXCJibG9ja2VkXCIsIFwiZG9uZVwiXTtcbmV4cG9ydCBjb25zdCBTVEFUVVNfRlJPTTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcbiAgXCJwZW5kaW5nXCI6IDEsIFwiaW4tcHJvZ3Jlc3NcIjogMiwgXCJhdC1yaXNrXCI6IDMsIFwiYmxvY2tlZFwiOiA0LCBcImRvbmVcIjogNSxcbn07XG5cbi8vIFx1MjUwMFx1MjUwMCBUeXBlcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbmV4cG9ydCBpbnRlcmZhY2UgTm9kZSB7XG4gIGlkOiAgICAgICAgICAgIHN0cmluZztcbiAgbGFiZWw6ICAgICAgICAgc3RyaW5nO1xuICBpbmRlbnQ6ICAgICAgICBudW1iZXI7XG4gIGxpbmVJZHg6ICAgICAgIG51bWJlcjtcbiAgbHZsOiAgICAgICAgICAgbnVtYmVyO1xuICBjb2xvclN0YXR1czogICBudW1iZXI7XG59XG5leHBvcnQgaW50ZXJmYWNlIFdlZWtFbnRyeSB7IHM6IG51bWJlcjsgbm90ZTogc3RyaW5nOyB9XG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZEZpbGUge1xuICBmaWxlUGF0aDogc3RyaW5nOyB0aXRsZTogc3RyaW5nOyBjYWxlbmRhcjogQ2FsZW5kYXI7XG4gIG5vZGVzOiBOb2RlW107IHdlZWtEYXRhOiBSZWNvcmQ8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBXZWVrRW50cnk+PjtcbiAgbGluZXM6IHN0cmluZ1tdOyBzdGFydFJhdzogc3RyaW5nOyBlbmRSYXc6IHN0cmluZztcbn1cbmV4cG9ydCBpbnRlcmZhY2UgUGF0Y2hPcCB7XG4gIG5vZGVJZDogc3RyaW5nOyBjb2xvclN0YXR1czogbnVtYmVyOyB3ZWVrRGF0YTogUmVjb3JkPHN0cmluZywgV2Vla0VudHJ5Pjtcbn1cblxuLy8gXHUyNTAwXHUyNTAwIEhlbHBlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5mdW5jdGlvbiBjb3VudEluZGVudChsaW5lOiBzdHJpbmcpOiBudW1iZXIge1xuICBsZXQgbiA9IDAsIGkgPSAwO1xuICB3aGlsZSAoaSA8IGxpbmUubGVuZ3RoKSB7XG4gICAgaWYgICAgICAobGluZVtpXSA9PT0gXCJcXHRcIikgICAgICAgICAgICAgICAgICAgICAgICAgIHsgbisrOyBpKys7ICAgIH1cbiAgICBlbHNlIGlmIChsaW5lW2ldID09PSBcIiBcIiAmJiBsaW5lW2kgKyAxXSA9PT0gXCIgXCIpICAgeyBuKys7IGkgKz0gMjsgfVxuICAgIGVsc2UgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIG47XG59XG5cbmZ1bmN0aW9uIHN0cmlwV2lraShzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcy5yZXBsYWNlKC9cXFtcXFsoPzpbXlxcXXxdKlxcfCk/KFteXFxdXSopXFxdXFxdL2csIFwiJDFcIik7XG59XG5cbi8vIEV4dHJhY3QgY2xlYW4gZGlzcGxheSBsYWJlbDogcmVtb3ZlIGlubGluZSA6OnN0YXR1czogWFxuZnVuY3Rpb24gbGFiZWxPZihyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzdHJpcFdpa2kocmF3KS5yZXBsYWNlKC9cXHMqOjpzdGF0dXM6XFxzKlxcUysvZywgXCJcIikudHJpbSgpO1xufVxuXG4vLyBFeHRyYWN0IGlubGluZSA6OnN0YXR1czogdmFsdWUgZnJvbSBhIHRyZWUgaXRlbSBsaW5lXG5mdW5jdGlvbiBpbmxpbmVTdGF0dXMocmF3OiBzdHJpbmcpOiBudW1iZXIge1xuICBjb25zdCBtID0gcmF3Lm1hdGNoKC86OnN0YXR1czpcXHMqKFthLXotXSspL2kpO1xuICByZXR1cm4gbSA/IChTVEFUVVNfRlJPTVttWzFdLnRvTG93ZXJDYXNlKCldID8/IDApIDogMDtcbn1cblxuLy8gUGFyc2UgIDo6bm90ZTogeyBzdGF0dXM6IFgsIGRhdGU6IFksIGNvbW1lbnQ6IFogfVxuZnVuY3Rpb24gcGFyc2VOb3RlKHJhdzogc3RyaW5nKTogeyBzOiBudW1iZXI7IHdrOiBzdHJpbmc7IG5vdGU6IHN0cmluZyB9IHwgbnVsbCB7XG4gIC8vIE11c3Qgc3RhcnQgd2l0aCA6Om5vdGU6XG4gIGlmICghL146Om5vdGVcXHMqOi9pLnRlc3QocmF3KSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGJsb2NrID0gcmF3Lm1hdGNoKC9cXHsoW159XSopXFx9Lyk7XG4gIGlmICghYmxvY2spIHJldHVybiBudWxsO1xuICBjb25zdCBib2R5ID0gYmxvY2tbMV07XG4gIGNvbnN0IGdldCAgPSAoazogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgciA9IGJvZHkubWF0Y2gobmV3IFJlZ0V4cChgXFxcXGIke2t9XFxcXHMqOlxcXFxzKihbXix9XSspYCwgXCJpXCIpKTtcbiAgICByZXR1cm4gciA/IHJbMV0udHJpbSgpIDogXCJcIjtcbiAgfTtcbiAgY29uc3Qgd2sgICA9IGdldChcImRhdGVcIik7XG4gIGNvbnN0IG5vdGUgPSBnZXQoXCJjb21tZW50XCIpO1xuICBjb25zdCBzICAgID0gU1RBVFVTX0ZST01bZ2V0KFwic3RhdHVzXCIpLnRvTG93ZXJDYXNlKCldID8/IDA7XG4gIHJldHVybiB3ayA/IHsgcywgd2ssIG5vdGUgfSA6IG51bGw7XG59XG5cbi8vIElzIHRoaXMgbGlzdCBpdGVtIGEgcmVzZXJ2ZWQgaGVhZGVyL21ldGEgbGluZSAobmV2ZXIgc2hvd24gaW4gdHJlZSk/XG5mdW5jdGlvbiBpc1Jlc2VydmVkKHJhdzogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHQgPSByYXcudHJpbSgpO1xuICByZXR1cm4gL146OihnZWxsbWFuTWF0cml4fHRpdGxlfHN0YXJ0fGVuZHxub3RlKVxcYi9pLnRlc3QodCk7XG59XG5cbi8vIFx1MjUwMFx1MjUwMCBQYXJzZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VGaWxlKGZpbGVQYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFBhcnNlZEZpbGUge1xuICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XG5cbiAgLy8gRGVmYXVsdHNcbiAgY29uc3Qgbm93ICAgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBkZWZTWSA9IG5vdy5nZXRGdWxsWWVhcigpLCBkZWZTTSA9IG5vdy5nZXRNb250aCgpICsgMTtcbiAgY29uc3QgZGVmRVkgPSBkZWZTTSArIDUgPiAxMiA/IGRlZlNZICsgMSA6IGRlZlNZO1xuICBjb25zdCBkZWZFTSA9ICgoZGVmU00gKyA0KSAlIDEyKSArIDE7XG4gIGxldCBzdGFydFJhdyA9IGAke1N0cmluZyhkZWZTTSkucGFkU3RhcnQoMixcIjBcIil9LSR7U3RyaW5nKGRlZlNZKS5zbGljZSgyKX1gO1xuICBsZXQgZW5kUmF3ICAgPSBgJHtTdHJpbmcoZGVmRU0pLnBhZFN0YXJ0KDIsXCIwXCIpfS0ke1N0cmluZyhkZWZFWSkuc2xpY2UoMil9YDtcbiAgbGV0IHRpdGxlICAgID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpLnBvcCgpPy5yZXBsYWNlKC9cXC5tZCQvLCBcIlwiKSA/PyBcIk1hdHJpeEdlbGxtYW5cIjtcblxuICAvLyBcdTI1MDBcdTI1MDAgUGFzcyAxOiByZWFkIGhlYWRlciBibG9jayBhbnl3aGVyZSBpbiBmaWxlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICBsZXQgaW5Gcm9udCA9IGZhbHNlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgbCA9IGxpbmVzW2ldLnRyaW0oKTtcbiAgICBpZiAoaSA9PT0gMCAmJiBsID09PSBcIi0tLVwiKSB7IGluRnJvbnQgPSB0cnVlOyBjb250aW51ZTsgfVxuICAgIGlmIChpbkZyb250KSB7IGlmIChsID09PSBcIi0tLVwiKSBpbkZyb250ID0gZmFsc2U7IGNvbnRpbnVlOyB9XG4gICAgaWYgKCFsLnN0YXJ0c1dpdGgoXCItIFwiKSkgY29udGludWU7XG4gICAgY29uc3QgcmF3ID0gbC5zbGljZSgyKS50cmltKCk7XG4gICAgY29uc3QgdG0gPSByYXcubWF0Y2goL146OnRpdGxlOlxccyooLispL2kpO1xuICAgIGNvbnN0IHNtID0gcmF3Lm1hdGNoKC9eOjpzdGFydDpcXHMqKFtcXGRcXC9cXC1dKykvaSk7XG4gICAgY29uc3QgZW0gPSByYXcubWF0Y2goL146OmVuZDpcXHMqKFtcXGRcXC9cXC1dKykvaSk7XG4gICAgaWYgKHRtKSB0aXRsZSAgICA9IHRtWzFdLnRyaW0oKTtcbiAgICBpZiAoc20pIHN0YXJ0UmF3ID0gc21bMV0udHJpbSgpO1xuICAgIGlmIChlbSkgZW5kUmF3ICAgPSBlbVsxXS50cmltKCk7XG4gIH1cblxuICAvLyBCdWlsZCBjYWxlbmRhclxuICBjb25zdCBzcCAgICAgICA9IHBhcnNlTW9udGhZZWFyKHN0YXJ0UmF3KSA/PyB7IHllYXI6IGRlZlNZLCBtb250aDogZGVmU00gfTtcbiAgY29uc3QgZXAgICAgICAgPSBwYXJzZU1vbnRoWWVhcihlbmRSYXcpICAgPz8geyB5ZWFyOiBkZWZFWSwgbW9udGg6IGRlZkVNIH07XG4gIGNvbnN0IGNhbGVuZGFyID0gYnVpbGRDYWxlbmRhcihzcC55ZWFyLCBzcC5tb250aCwgZXAueWVhciwgZXAubW9udGgpO1xuICBjb25zdCB3ZWVrS2V5cyA9IGNhbGVuZGFyLndlZWtzLm1hcCh3ID0+IHcua2V5KTtcblxuICAvLyBcdTI1MDBcdTI1MDAgRmluZCBtaW4gaW5kZW50IG9mIHJlYWwgdHJlZSBpdGVtcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgbGV0IG1pbkluZGVudCA9IDk5O1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBjb25zdCB0ID0gbGluZS50cmltU3RhcnQoKTtcbiAgICBpZiAoIXQuc3RhcnRzV2l0aChcIi0gXCIpKSBjb250aW51ZTtcbiAgICBpZiAoaXNSZXNlcnZlZCh0LnNsaWNlKDIpLnRyaW0oKSkpIGNvbnRpbnVlO1xuICAgIG1pbkluZGVudCA9IE1hdGgubWluKG1pbkluZGVudCwgY291bnRJbmRlbnQobGluZSkpO1xuICB9XG4gIGlmIChtaW5JbmRlbnQgPT09IDk5KSBtaW5JbmRlbnQgPSAwO1xuXG4gIC8vIFx1MjUwMFx1MjUwMCBQYXNzIDI6IGJ1aWxkIHRyZWUgKyB3ZWVrRGF0YSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgY29uc3Qgbm9kZXM6ICAgIE5vZGVbXSA9IFtdO1xuICBjb25zdCB3ZWVrRGF0YTogUmVjb3JkPHN0cmluZywgUmVjb3JkPHN0cmluZywgV2Vla0VudHJ5Pj4gPSB7fTtcbiAgY29uc3Qgc3RhY2s6ICAgIE5vZGVbXSA9IFtdO1xuICBsZXQgICBsYXN0TGVhZjogTm9kZSB8IG51bGwgPSBudWxsO1xuICBsZXQgICBpbkZyb250MiA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBsaW5lICAgID0gbGluZXNbaV07XG4gICAgY29uc3QgaW5kZW50ICA9IGNvdW50SW5kZW50KGxpbmUpO1xuICAgIGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW1TdGFydCgpO1xuXG4gICAgaWYgKGkgPT09IDAgJiYgdHJpbW1lZC50cmltKCkgPT09IFwiLS0tXCIpIHsgaW5Gcm9udDIgPSB0cnVlOyBjb250aW51ZTsgfVxuICAgIGlmIChpbkZyb250MikgeyBpZiAodHJpbW1lZC50cmltKCkgPT09IFwiLS0tXCIpIGluRnJvbnQyID0gZmFsc2U7IGNvbnRpbnVlOyB9XG4gICAgaWYgKCF0cmltbWVkLnN0YXJ0c1dpdGgoXCItIFwiKSkgeyBpZiAodHJpbW1lZC50cmltKCkpIGxhc3RMZWFmID0gbnVsbDsgY29udGludWU7IH1cblxuICAgIGNvbnN0IHJhdyA9IHRyaW1tZWQuc2xpY2UoMikudHJpbSgpO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIDo6bm90ZSBjaGlsZCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoL146Om5vdGVcXHMqOi9pLnRlc3QocmF3KSkge1xuICAgICAgaWYgKCFsYXN0TGVhZikgY29udGludWU7XG4gICAgICBjb25zdCBuYiA9IHBhcnNlTm90ZShyYXcpO1xuICAgICAgaWYgKCFuYikgY29udGludWU7XG4gICAgICAvLyBtYXRjaCB3ZWVrIGtleSAoZXhhY3Qgb3IgcHJlZml4KVxuICAgICAgY29uc3QgbWF0Y2hlZFdrID0gd2Vla0tleXMuZmluZCh3ayA9PiB3ayA9PT0gbmIud2sgfHwgbmIud2suc3RhcnRzV2l0aCh3aykgfHwgd2sgPT09IG5iLndrLnRyaW0oKSk7XG4gICAgICBpZiAoIW1hdGNoZWRXaykgY29udGludWU7XG4gICAgICBpZiAoIXdlZWtEYXRhW2xhc3RMZWFmLmlkXSkgd2Vla0RhdGFbbGFzdExlYWYuaWRdID0ge307XG4gICAgICB3ZWVrRGF0YVtsYXN0TGVhZi5pZF1bbWF0Y2hlZFdrXSA9IHsgczogbmIucywgbm90ZTogbmIubm90ZSB9O1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHJlc2VydmVkIGhlYWRlciBsaW5lIFx1MjAxNCBza2lwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChpc1Jlc2VydmVkKHJhdykpIGNvbnRpbnVlO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFJlZ3VsYXIgdHJlZSBub2RlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNvbnN0IGxhYmVsID0gbGFiZWxPZihyYXcpO1xuICAgIGlmICghbGFiZWwpIGNvbnRpbnVlO1xuXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCAmJiBzdGFja1tzdGFjay5sZW5ndGggLSAxXS5pbmRlbnQgPj0gaW5kZW50KSBzdGFjay5wb3AoKTtcbiAgICBjb25zdCBwYXJlbnQgICAgICA9IHN0YWNrLmxlbmd0aCA/IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdIDogbnVsbDtcbiAgICBjb25zdCBpZCAgICAgICAgICA9IHBhcmVudCA/IGAke3BhcmVudC5pZH0vJHtsYWJlbH1gIDogbGFiZWw7XG4gICAgY29uc3QgbHZsICAgICAgICAgPSBNYXRoLm1pbihpbmRlbnQgLSBtaW5JbmRlbnQsIDMpO1xuICAgIGNvbnN0IGNvbG9yU3RhdHVzID0gaW5saW5lU3RhdHVzKHJhdyk7XG5cbiAgICBjb25zdCBub2RlOiBOb2RlID0geyBpZCwgbGFiZWwsIGluZGVudCwgbGluZUlkeDogaSwgbHZsLCBjb2xvclN0YXR1cyB9O1xuICAgIG5vZGVzLnB1c2gobm9kZSk7XG4gICAgc3RhY2sucHVzaChub2RlKTtcbiAgICBsYXN0TGVhZiA9IG5vZGU7XG4gIH1cblxuICByZXR1cm4geyBmaWxlUGF0aCwgdGl0bGUsIGNhbGVuZGFyLCBub2Rlcywgd2Vla0RhdGEsIGxpbmVzLCBzdGFydFJhdywgZW5kUmF3IH07XG59XG5cbi8vIFx1MjUwMFx1MjUwMCBQYXRjaGVyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUmV3cml0ZXMgYSBsZWFmIG5vZGUncyBpbmxpbmUgOjpzdGF0dXM6IGFuZCBpdHMgOjpub3RlOiBjaGlsZHJlbi5cbmV4cG9ydCBmdW5jdGlvbiBwYXRjaEZpbGUoY29udGVudDogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBvcDogUGF0Y2hPcCk6IHN0cmluZyB7XG4gIGNvbnN0IHsgbm9kZXMsIGxpbmVzLCBjYWxlbmRhciB9ID0gcGFyc2VGaWxlKGZpbGVQYXRoLCBjb250ZW50KTtcbiAgY29uc3Qgbm9kZSA9IG5vZGVzLmZpbmQobiA9PiBuLmlkID09PSBvcC5ub2RlSWQpO1xuICBpZiAoIW5vZGUpIHJldHVybiBjb250ZW50O1xuXG4gIGNvbnN0IGxlYWRpbmcgICA9IGxpbmVzW25vZGUubGluZUlkeF0ubWF0Y2goL15bXFx0IF0qLyk/LlswXSA/PyBcIlwiO1xuICBjb25zdCBjaGlsZExlYWQgPSBsZWFkaW5nICsgXCJcXHRcIjtcblxuICAvLyBSYW5nZSBvZiA6Om5vdGU6IGNoaWxkcmVuIGltbWVkaWF0ZWx5IGFmdGVyIHRoaXMgbm9kZVxuICBsZXQgbm90ZVN0YXJ0ID0gbm9kZS5saW5lSWR4ICsgMTtcbiAgbGV0IG5vdGVFbmQgICA9IG5vdGVTdGFydDtcbiAgd2hpbGUgKG5vdGVFbmQgPCBsaW5lcy5sZW5ndGgpIHtcbiAgICBjb25zdCBsICA9IGxpbmVzW25vdGVFbmRdO1xuICAgIGNvbnN0IGNpID0gY291bnRJbmRlbnQobCk7XG4gICAgY29uc3QgY3QgPSBsLnRyaW1TdGFydCgpO1xuICAgIGlmICghY3Quc3RhcnRzV2l0aChcIi0gXCIpKSB7IGlmICghY3QudHJpbSgpKSB7IG5vdGVFbmQrKzsgY29udGludWU7IH0gYnJlYWs7IH1cbiAgICBpZiAoY2kgPD0gbm9kZS5pbmRlbnQpIGJyZWFrO1xuICAgIGlmICgvXjo6bm90ZVxccyo6L2kudGVzdChjdC5zbGljZSgyKS50cmltKCkpKSB7IG5vdGVFbmQrKzsgY29udGludWU7IH1cbiAgICBicmVhaztcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgbGV0IGkgPSAwO1xuXG4gIHdoaWxlIChpIDwgbGluZXMubGVuZ3RoKSB7XG4gICAgaWYgKGkgPT09IG5vZGUubGluZUlkeCkge1xuICAgICAgLy8gUmV3cml0ZSBub2RlIGxpbmU6IHN0cmlwIG9sZCA6OnN0YXR1cywgYXBwZW5kIG5ldyBvbmVcbiAgICAgIGNvbnN0IGJhcmUgICAgICA9IGxpbmVzW2ldLnJlcGxhY2UoL1xccyo6OnN0YXR1czpcXHMqXFxTKy9nLCBcIlwiKS50cmltRW5kKCk7XG4gICAgICBjb25zdCBzdGF0dXNUYWcgPSBvcC5jb2xvclN0YXR1cyA+IDAgPyBgIDo6c3RhdHVzOiAke1NUQVRVU19OQU1FU1tvcC5jb2xvclN0YXR1c119YCA6IFwiXCI7XG4gICAgICByZXN1bHQucHVzaChgJHtiYXJlfSR7c3RhdHVzVGFnfWApO1xuICAgICAgaSsrO1xuICAgICAgLy8gU2tpcCBvbGQgOjpub3RlOiBjaGlsZHJlblxuICAgICAgd2hpbGUgKGkgPCBub3RlRW5kKSBpKys7XG4gICAgICAvLyBXcml0ZSBuZXcgOjpub3RlOiBsaW5lc1xuICAgICAgZm9yIChjb25zdCB3ayBvZiBjYWxlbmRhci53ZWVrcy5tYXAodyA9PiB3LmtleSkpIHtcbiAgICAgICAgY29uc3QgZW50cnkgPSBvcC53ZWVrRGF0YVt3a107XG4gICAgICAgIGlmICghZW50cnkgfHwgKCFlbnRyeS5zICYmICFlbnRyeS5ub3RlKSkgY29udGludWU7XG4gICAgICAgIGNvbnN0IHNQYXJ0ID0gZW50cnkucyA+IDAgPyBgIHN0YXR1czogJHtTVEFUVVNfTkFNRVNbZW50cnkuc119LGAgOiBcIlwiO1xuICAgICAgICBjb25zdCBjUGFydCA9IGVudHJ5Lm5vdGUgPyBgIGNvbW1lbnQ6ICR7ZW50cnkubm90ZX1gIDogXCJcIjtcbiAgICAgICAgcmVzdWx0LnB1c2goYCR7Y2hpbGRMZWFkfS0gOjpub3RlOiB7JHtzUGFydH0gZGF0ZTogJHt3a30sJHtjUGFydH0gfWApO1xuICAgICAgfVxuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKGxpbmVzW2ldKTtcbiAgICBpKys7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5qb2luKFwiXFxuXCIpO1xufVxuXG4vLyBcdTI1MDBcdTI1MDAgUGF0Y2ggZGF0ZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hEYXRlcyhjb250ZW50OiBzdHJpbmcsIHN0YXJ0UmF3OiBzdHJpbmcsIGVuZFJhdzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpO1xuICBsZXQgcHMgPSBmYWxzZSwgcGUgPSBmYWxzZTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgdCA9IGxpbmVzW2ldLnRyaW1TdGFydCgpO1xuICAgIGlmICghdC5zdGFydHNXaXRoKFwiLSBcIikpIGNvbnRpbnVlO1xuICAgIGNvbnN0IHJhdyA9IHQuc2xpY2UoMikudHJpbSgpO1xuICAgIGlmICghcHMgJiYgL146OnN0YXJ0Oi9pLnRlc3QocmF3KSkge1xuICAgICAgbGluZXNbaV0gPSBsaW5lc1tpXS5yZXBsYWNlKC86OnN0YXJ0OlxccypbXFxkXFwvXFwtXSsvaSwgYDo6c3RhcnQ6ICR7c3RhcnRSYXd9YCk7XG4gICAgICBwcyA9IHRydWU7XG4gICAgfVxuICAgIGlmICghcGUgJiYgL146OmVuZDovaS50ZXN0KHJhdykpIHtcbiAgICAgIGxpbmVzW2ldID0gbGluZXNbaV0ucmVwbGFjZSgvOjplbmQ6XFxzKltcXGRcXC9cXC1dKy9pLCBgOjplbmQ6ICR7ZW5kUmF3fWApO1xuICAgICAgcGUgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAocHMgJiYgcGUpIGJyZWFrO1xuICB9XG5cbiAgaWYgKCFwcyB8fCAhcGUpIHtcbiAgICAvLyBJbnNlcnQgaGVhZGVyIGJsb2NrIGF0IHRvcCAoYWZ0ZXIgZnJvbnRtYXR0ZXIgaWYgcHJlc2VudClcbiAgICBsZXQgYXQgPSAwO1xuICAgIGxldCBpbkYgPSBmYWxzZTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA9PT0gMCAmJiBsaW5lc1tpXS50cmltKCkgPT09IFwiLS0tXCIpIHsgaW5GID0gdHJ1ZTsgY29udGludWU7IH1cbiAgICAgIGlmIChpbkYgJiYgbGluZXNbaV0udHJpbSgpID09PSBcIi0tLVwiKSB7IGF0ID0gaSArIDE7IGJyZWFrOyB9XG4gICAgICBpZiAoIWluRikgeyBhdCA9IGk7IGJyZWFrOyB9XG4gICAgfVxuICAgIGxpbmVzLnNwbGljZShhdCwgMCxcbiAgICAgIFwiLSA6OmdlbGxtYW5NYXRyaXhcIixcbiAgICAgIFwiLSA6OnRpdGxlOiBNYXRyaXhHZWxsbWFuXCIsXG4gICAgICBgLSA6OnN0YXJ0OiAke3N0YXJ0UmF3fWAsXG4gICAgICBgLSA6OmVuZDogJHtlbmRSYXd9YCxcbiAgICAgIFwiXCJcbiAgICApO1xuICB9XG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuIiwgImV4cG9ydCBjb25zdCBDU1MgPSBgXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgUm9vdCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDAgKi9cbi5tZy13cmFwIHtcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICBoZWlnaHQ6IDEwMCU7IHdpZHRoOiAxMDAlO1xuICBiYWNrZ3JvdW5kOiAjZjFmNWY5O1xuICBmb250LWZhbWlseTogJ1NlZ29lIFVJJywgc2Fucy1zZXJpZjtcbiAgZm9udC1zaXplOiAxMnB4O1xuICBvdmVyZmxvdzogaGlkZGVuO1xufVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgVG9vbGJhciAgKHRvcCBiYXIsIG5ldmVyIG1vdmVzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDAgKi9cbi5tZy10b29sYmFyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDA7IGxlZnQ6IDA7IHJpZ2h0OiAwO1xuICBoZWlnaHQ6IDQ2cHg7XG4gIGJhY2tncm91bmQ6ICMwRDZFM0Y7IGNvbG9yOiB3aGl0ZTtcbiAgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgcGFkZGluZzogMCAxNHB4OyBnYXA6IDE0cHg7XG4gIHotaW5kZXg6IDk5OTtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbn1cbi5tZy10b29sYmFyLXRpdGxlIHsgZm9udC1zaXplOiAxM3B4OyBmb250LXdlaWdodDogNzAwOyBsZXR0ZXItc3BhY2luZzogLjRweDsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuLm1nLXRvb2xiYXItc3ViICAgeyBmb250LXNpemU6IDEwcHg7IG9wYWNpdHk6IC43NTsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuLm1nLXRvb2xiYXItcmlnaHQgeyBtYXJnaW4tbGVmdDogYXV0bzsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiA4cHg7IGZsZXgtc2hyaW5rOiAwOyB9XG4ubWctbGVnZW5kICAgICAgICB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogM3B4OyBmb250LXNpemU6IDEwcHg7IGNvbG9yOiByZ2JhKDI1NSwyNTUsMjU1LC44NSk7IHdoaXRlLXNwYWNlOiBub3dyYXA7IH1cbi5tZy1sZWdlbmQtZG90ICAgIHsgd2lkdGg6IDhweDsgaGVpZ2h0OiA4cHg7IGJvcmRlci1yYWRpdXM6IDUwJTsgZmxleC1zaHJpbms6IDA7IH1cbi5tZy1kYXRlLXdyYXAge1xuICBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDRweDtcbiAgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwuMTIpOyBib3JkZXItcmFkaXVzOiA1cHg7XG4gIHBhZGRpbmc6IDJweCA4cHg7IHdoaXRlLXNwYWNlOiBub3dyYXA7XG59XG4ubWctZGF0ZS13cmFwIGxhYmVsIHsgZm9udC1zaXplOiAxMHB4OyBvcGFjaXR5OiAuODsgfVxuLm1nLWRhdGUtaW5wdXQge1xuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsgYm9yZGVyOiBub25lO1xuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwuNCk7XG4gIGNvbG9yOiB3aGl0ZTsgZm9udC1zaXplOiAxMXB4OyB3aWR0aDogNjBweDtcbiAgb3V0bGluZTogbm9uZTsgdGV4dC1hbGlnbjogY2VudGVyOyBwYWRkaW5nOiAxcHggMnB4O1xufVxuLm1nLWRhdGUtaW5wdXQ6OnBsYWNlaG9sZGVyIHsgY29sb3I6IHJnYmEoMjU1LDI1NSwyNTUsLjM1KTsgfVxuLm1nLWJ0bi1hcHBseSB7XG4gIGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsLjIpOyBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LC4zNSk7XG4gIGNvbG9yOiB3aGl0ZTsgZm9udC1zaXplOiAxMHB4OyBwYWRkaW5nOiAycHggOHB4OyBib3JkZXItcmFkaXVzOiA0cHg7IGN1cnNvcjogcG9pbnRlcjtcbn1cbi5tZy1idG4tYXBwbHk6aG92ZXIgeyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LC4zKTsgfVxuLm1nLWJ0bi1vcGVuIHtcbiAgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwuMTIpOyBib3JkZXI6IDFweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LC4yNSk7XG4gIGNvbG9yOiB3aGl0ZTsgZm9udC1zaXplOiAxMHB4OyBwYWRkaW5nOiAzcHggOXB4OyBib3JkZXItcmFkaXVzOiA0cHg7XG4gIGN1cnNvcjogcG9pbnRlcjsgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbn1cbi5tZy1idG4tb3Blbjpob3ZlciB7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsLjIyKTsgfVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgQ29ybmVyICAodG9wLWxlZnQsIGZyb3plbiBvbiBib3RoIGF4ZXMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuLm1nLWNvcm5lciB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiA0NnB4OyBsZWZ0OiAwO1xuICB3aWR0aDogMzAwcHg7IGhlaWdodDogNjBweDtcbiAgei1pbmRleDogMjAwO1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICBiYWNrZ3JvdW5kOiAjMGYxNzJhO1xuICBib3JkZXItcmlnaHQ6IDJweCBzb2xpZCAjMzM0MTU1O1xuICBib3JkZXItYm90dG9tOiAycHggc29saWQgIzMzNDE1NTtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbn1cblxuLyogXHUyNTAwXHUyNTAwXHUyNTAwIENvbHVtbiBoZWFkZXIgICh0b3AtcmlnaHQsIHNjcm9sbHMgWCB3aXRoIGJvZHkpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuLm1nLWNvbC1oZHIge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHRvcDogNDZweDsgbGVmdDogMzAwcHg7IHJpZ2h0OiAwO1xuICBoZWlnaHQ6IDYwcHg7XG4gIHotaW5kZXg6IDEwMDtcbiAgb3ZlcmZsb3c6IGhpZGRlbjsgICAvKiBzY3JvbGwgZHJpdmVuIGJ5IGJvZHkgdmlhIEpTICovXG59XG4ubWctY29sLWhkciB0YWJsZSB7IGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7IHRhYmxlLWxheW91dDogZml4ZWQ7IH1cblxuLyogXHUyNTAwXHUyNTAwXHUyNTAwIFJvdyBoZWFkZXIgIChib3R0b20tbGVmdCwgc2Nyb2xscyBZIHdpdGggYm9keSkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwICovXG4ubWctcm93LWhkciB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAxMDZweDsgbGVmdDogMDtcbiAgd2lkdGg6IDMwMHB4OyBib3R0b206IDA7XG4gIHotaW5kZXg6IDEwMDtcbiAgb3ZlcmZsb3c6IGhpZGRlbjsgICAvKiBzY3JvbGwgZHJpdmVuIGJ5IGJvZHkgdmlhIEpTICovXG4gIGJvcmRlci1yaWdodDogMnB4IHNvbGlkICNjYmQ1ZTE7XG59XG4ubWctcm93LWhkciB0YWJsZSB7IGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7IHRhYmxlLWxheW91dDogZml4ZWQ7IHdpZHRoOiAzMDBweDsgfVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgQm9keSAgKGJvdHRvbS1yaWdodCwgc2Nyb2xscyBib3RoIFx1MjAxNCBkcml2ZXMgZXZlcnl0aGluZykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwICovXG4ubWctYm9keSB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAxMDZweDsgbGVmdDogMzAwcHg7XG4gIHJpZ2h0OiAwOyBib3R0b206IDA7XG4gIHotaW5kZXg6IDEwO1xuICBvdmVyZmxvdzogYXV0bztcbn1cbi5tZy1ib2R5IHRhYmxlIHsgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTsgdGFibGUtbGF5b3V0OiBmaXhlZDsgfVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgU2hhcmVkIHRhYmxlIHN0eWxlcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDAgKi9cblxuLyogTW9udGggaGVhZGVyIGNlbGxzICovXG4ubWctdGgtbW9udGgge1xuICBoZWlnaHQ6IDM0cHg7IGJhY2tncm91bmQ6ICMxZTI5M2I7IGNvbG9yOiAjOTRhM2I4O1xuICBmb250LXNpemU6IDEwcHg7IGZvbnQtd2VpZ2h0OiA2MDA7IGxldHRlci1zcGFjaW5nOiAuN3B4O1xuICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlOyB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gIGJvcmRlci1yaWdodDogMXB4IHNvbGlkICMzMzQxNTU7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMzM0MTU1O1xuICB3aGl0ZS1zcGFjZTogbm93cmFwO1xufVxuXG4vKiBXZWVrIGhlYWRlciBjZWxscyAqL1xuLm1nLXRoLXdlZWsge1xuICBoZWlnaHQ6IDI2cHg7IHdpZHRoOiA0OHB4OyBtaW4td2lkdGg6IDQ4cHg7XG4gIGJhY2tncm91bmQ6ICMwZjE3MmE7IGNvbG9yOiAjNjQ3NDhiO1xuICBmb250LXNpemU6IDEwcHg7IGZvbnQtd2VpZ2h0OiA1MDA7IHRleHQtYWxpZ246IGNlbnRlcjtcbiAgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgIzFlMjkzYjsgYm9yZGVyLWJvdHRvbTogMnB4IHNvbGlkICMzMzQxNTU7XG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XG59XG4ubWctdGgtd2Vlay5tZy1jdXJyZW50IHsgYmFja2dyb3VuZDogIzFkNGVkODsgY29sb3I6IHdoaXRlOyBmb250LXdlaWdodDogNzAwOyB9XG4ubWctbWVuZCB7IGJvcmRlci1yaWdodDogMnB4IHNvbGlkICM2NDc0OGIgIWltcG9ydGFudDsgfVxuXG4vKiBDb3JuZXIgaGVhZGVyIGNlbGwgKi9cbi5tZy10aC1jb3JuZXIge1xuICB3aWR0aDogMzAwcHg7IGhlaWdodDogNjBweDtcbiAgYmFja2dyb3VuZDogIzBmMTcyYTsgY29sb3I6ICM0NzU1Njk7XG4gIGZvbnQtc2l6ZTogMTBweDsgdGV4dC1hbGlnbjogbGVmdDtcbiAgcGFkZGluZy1sZWZ0OiAxMHB4OyB2ZXJ0aWNhbC1hbGlnbjogYm90dG9tOyBwYWRkaW5nLWJvdHRvbTogNHB4O1xufVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgUm93LWhlYWRlciBsYWJlbCBjZWxscyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDAgKi9cbi5tZy1yb3ctaGRyIHRkIHtcbiAgd2lkdGg6IDMwMHB4OyBtaW4td2lkdGg6IDMwMHB4OyBwYWRkaW5nOiAwO1xuICB3aGl0ZS1zcGFjZTogbm93cmFwOyBvdmVyZmxvdzogaGlkZGVuO1xuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2UyZThmMDtcbiAgYmFja2dyb3VuZDogd2hpdGU7XG59XG4ubWctbGFiZWwtaW5uZXIge1xuICBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBoZWlnaHQ6IDEwMCU7XG4gIHBhZGRpbmctcmlnaHQ6IDhweDsgZ2FwOiAzcHg7XG59XG4ubWctbGFiZWwtdGV4dCB7XG4gIG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB3aGl0ZS1zcGFjZTogbm93cmFwO1xuICBmbGV4OiAxOyBtaW4td2lkdGg6IDA7XG59XG4ubWctdG9nZ2xlIHtcbiAgZGlzcGxheTogaW5saW5lLWZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGp1c3RpZnktY29udGVudDogY2VudGVyO1xuICB3aWR0aDogMTZweDsgaGVpZ2h0OiAxNnB4OyBmbGV4LXNocmluazogMDtcbiAgY3Vyc29yOiBwb2ludGVyOyBib3JkZXItcmFkaXVzOiAzcHg7IGZvbnQtc2l6ZTogOXB4O1xuICBib3JkZXI6IG5vbmU7IGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyBjb2xvcjogIzk0YTNiODsgdXNlci1zZWxlY3Q6IG5vbmU7XG59XG4ubWctdG9nZ2xlOmhvdmVyIHsgYmFja2dyb3VuZDogcmdiYSgwLDAsMCwuMDgpOyB9XG4ubWctbGVhZi1zcCB7IHdpZHRoOiAxNnB4OyBmbGV4LXNocmluazogMDsgZGlzcGxheTogaW5saW5lLWJsb2NrOyB9XG5cbi8qIFJvdyBsZXZlbHMgXHUyMDE0IGFwcGxpZWQgdG8gdHIgKi9cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDAsIC5tZy1ib2R5IHRyLm1nLWx2bDAgeyBoZWlnaHQ6IDM2cHg7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDEsIC5tZy1ib2R5IHRyLm1nLWx2bDEgeyBoZWlnaHQ6IDMycHg7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDIsIC5tZy1ib2R5IHRyLm1nLWx2bDIgeyBoZWlnaHQ6IDMwcHg7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMsIC5tZy1ib2R5IHRyLm1nLWx2bDMgeyBoZWlnaHQ6IDI5cHg7IH1cblxuLyogTGFiZWwgYmcgYnkgbGV2ZWwgKi9cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDAgdGQgeyBiYWNrZ3JvdW5kOiAjMGYxNzJhICFpbXBvcnRhbnQ7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMWUyOTNiOyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwwIC5tZy1sYWJlbC1pbm5lciB7IHBhZGRpbmctbGVmdDogMTBweDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMCAubWctbGFiZWwtdGV4dCAgeyBjb2xvcjogI2YxZjVmOTsgZm9udC13ZWlnaHQ6IDcwMDsgZm9udC1zaXplOiAxM3B4OyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwwIC5tZy10b2dnbGUgICAgICB7IGNvbG9yOiByZ2JhKDI1NSwyNTUsMjU1LC41KTsgfVxuXG4ubWctcm93LWhkciB0ci5tZy1sdmwxIHRkIHsgYmFja2dyb3VuZDogI2UyZThmMDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMSAubWctbGFiZWwtaW5uZXIgeyBwYWRkaW5nLWxlZnQ6IDE4cHg7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDEgLm1nLWxhYmVsLXRleHQgIHsgY29sb3I6ICMzMzQxNTU7IGZvbnQtd2VpZ2h0OiA2MDA7IGZvbnQtc2l6ZTogMTFweDsgfVxuXG4ubWctcm93LWhkciB0ci5tZy1sdmwyIHRkIHsgYmFja2dyb3VuZDogI2Y4ZmFmYzsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMiAubWctbGFiZWwtaW5uZXIgeyBwYWRkaW5nLWxlZnQ6IDMycHg7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDIgLm1nLWxhYmVsLXRleHQgIHsgY29sb3I6ICM0NzU1Njk7IGZvbnQtd2VpZ2h0OiA1MDA7IGZvbnQtc2l6ZTogMTFweDsgfVxuXG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkIHtcbiAgYmFja2dyb3VuZDogI2ZmZjsgY3Vyc29yOiBwb2ludGVyOyB0cmFuc2l0aW9uOiBmaWx0ZXIgLjEyczsgcG9zaXRpb246IHJlbGF0aXZlO1xufVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZDpob3ZlciAgICAgICB7IGZpbHRlcjogYnJpZ2h0bmVzcyguOTUpOyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIC5tZy1sYWJlbC1pbm5lciB7IHBhZGRpbmctbGVmdDogNDhweDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyAubWctbGFiZWwtdGV4dCAgeyBjb2xvcjogIzM3NDE1MTsgZm9udC13ZWlnaHQ6IDQwMDsgZm9udC1zaXplOiAxMXB4OyB9XG5cbi8qIExlYWYgbGFiZWwgc3RhdHVzIGNvbG91cnMgKi9cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgdGRbZGF0YS1scz1cIjFcIl0geyBiYWNrZ3JvdW5kOiAjZTJlOGYwICFpbXBvcnRhbnQ7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgdGRbZGF0YS1scz1cIjFcIl0gLm1nLWxhYmVsLXRleHQgeyBjb2xvcjogIzQ3NTU2OTsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZFtkYXRhLWxzPVwiMlwiXSB7IGJhY2tncm91bmQ6ICNmZWY5YzMgIWltcG9ydGFudDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZFtkYXRhLWxzPVwiMlwiXSAubWctbGFiZWwtdGV4dCB7IGNvbG9yOiAjNzEzZjEyOyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkW2RhdGEtbHM9XCIzXCJdIHsgYmFja2dyb3VuZDogI2ZlZDdhYSAhaW1wb3J0YW50OyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkW2RhdGEtbHM9XCIzXCJdIC5tZy1sYWJlbC10ZXh0IHsgY29sb3I6ICM3YzJkMTI7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgdGRbZGF0YS1scz1cIjRcIl0geyBiYWNrZ3JvdW5kOiAjZmVjYWNhICFpbXBvcnRhbnQ7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgdGRbZGF0YS1scz1cIjRcIl0gLm1nLWxhYmVsLXRleHQgeyBjb2xvcjogIzdmMWQxZDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZFtkYXRhLWxzPVwiNVwiXSB7IGJhY2tncm91bmQ6ICNiYmY3ZDAgIWltcG9ydGFudDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZFtkYXRhLWxzPVwiNVwiXSAubWctbGFiZWwtdGV4dCB7IGNvbG9yOiAjMTQ1MzJkOyB9XG5cbi8qIE5vdGUgZG90ICovXG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkW2RhdGEtbG5vdGU9XCIxXCJdOjphZnRlciB7XG4gIGNvbnRlbnQ6ICcnOyBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogNXB4OyByaWdodDogNnB4O1xuICB3aWR0aDogNnB4OyBoZWlnaHQ6IDZweDsgYm9yZGVyLXJhZGl1czogNTAlO1xuICBiYWNrZ3JvdW5kOiAjNjM2NmYxOyBwb2ludGVyLWV2ZW50czogbm9uZTtcbn1cblxuLyogXHUyNTAwXHUyNTAwXHUyNTAwIEJvZHkgZGF0YSBjZWxscyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDAgKi9cbi5tZy1ib2R5IHRkLm1nLWNlbGwge1xuICB3aWR0aDogNDhweDsgbWluLXdpZHRoOiA0OHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGN1cnNvcjogcG9pbnRlcjtcbiAgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgI2UyZThmMDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlMmU4ZjA7XG4gIHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7IGZvbnQtc2l6ZTogMTFweDsgcG9zaXRpb246IHJlbGF0aXZlO1xufVxuLm1nLWJvZHkgdGQubWctY2VsbDpob3ZlciB7IGZpbHRlcjogYnJpZ2h0bmVzcyguOSk7IH1cblxuLyogQm9keSByb3cgYmcgYnkgbGV2ZWwgKi9cbi5tZy1ib2R5IHRyLm1nLWx2bDAgdGQubWctY2VsbCB7IGJhY2tncm91bmQ6ICMxZTI5M2I7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjMzM0MTU1OyB9XG4ubWctYm9keSB0ci5tZy1sdmwxIHRkLm1nLWNlbGwgeyBiYWNrZ3JvdW5kOiAjZjFmNWY5OyB9XG4ubWctYm9keSB0ci5tZy1sdmwyIHRkLm1nLWNlbGwgeyBiYWNrZ3JvdW5kOiAjZmFmYWZhOyB9XG4ubWctYm9keSB0ci5tZy1sdmwzIHRkLm1nLWNlbGwgeyBiYWNrZ3JvdW5kOiAjZmZmOyB9XG5cbi5tZy1ib2R5IHRkLm1nLWNlbGxbZGF0YS1zPVwiMVwiXSB7IGJhY2tncm91bmQ6ICNlMmU4ZjAgIWltcG9ydGFudDsgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCAjOTRhM2I4OyBjb2xvcjogIzQ3NTU2OTsgfVxuLm1nLWJvZHkgdGQubWctY2VsbFtkYXRhLXM9XCIyXCJdIHsgYmFja2dyb3VuZDogI2ZlZjljMyAhaW1wb3J0YW50OyBib3JkZXItbGVmdDogM3B4IHNvbGlkICNlYWIzMDg7IGNvbG9yOiAjODU0ZDBlOyB9XG4ubWctYm9keSB0ZC5tZy1jZWxsW2RhdGEtcz1cIjNcIl0geyBiYWNrZ3JvdW5kOiAjZmVkN2FhICFpbXBvcnRhbnQ7IGJvcmRlci1sZWZ0OiAzcHggc29saWQgI2Y5NzMxNjsgY29sb3I6ICM5YTM0MTI7IH1cbi5tZy1ib2R5IHRkLm1nLWNlbGxbZGF0YS1zPVwiNFwiXSB7IGJhY2tncm91bmQ6ICNmZWNhY2EgIWltcG9ydGFudDsgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCAjZWY0NDQ0OyBjb2xvcjogIzk5MWIxYjsgfVxuLm1nLWJvZHkgdGQubWctY2VsbFtkYXRhLXM9XCI1XCJdIHsgYmFja2dyb3VuZDogI2JiZjdkMCAhaW1wb3J0YW50OyBib3JkZXItbGVmdDogM3B4IHNvbGlkICMyMmM1NWU7IGNvbG9yOiAjMTQ1MzJkOyB9XG4ubWctYm9keSB0ZC5tZy1jZWxsW2RhdGEtaGFzbm90ZT1cIjFcIl06OmFmdGVyIHtcbiAgY29udGVudDogJyc7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAzcHg7IHJpZ2h0OiAzcHg7XG4gIHdpZHRoOiA1cHg7IGhlaWdodDogNXB4OyBib3JkZXItcmFkaXVzOiA1MCU7XG4gIGJhY2tncm91bmQ6ICM2MzY2ZjE7IHBvaW50ZXItZXZlbnRzOiBub25lO1xufVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgSGlkZGVuIHJvd3MgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwICovXG4ubWctcm93LWhkciB0ci5tZy1oaWRkZW4sXG4ubWctYm9keSAgICAgdHIubWctaGlkZGVuIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyB9XG5cbi8qIFx1MjUwMFx1MjUwMFx1MjUwMCBOb3RlIHBvcHVwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuLm1nLXBvcHVwIHtcbiAgcG9zaXRpb246IGZpeGVkOyB6LWluZGV4OiA5OTk5O1xuICBiYWNrZ3JvdW5kOiB3aGl0ZTsgYm9yZGVyOiAxcHggc29saWQgI2UyZThmMDsgYm9yZGVyLXJhZGl1czogMTBweDtcbiAgYm94LXNoYWRvdzogMCA4cHggMzJweCByZ2JhKDAsMCwwLC4yKTsgcGFkZGluZzogMTRweDsgd2lkdGg6IDMwMHB4O1xuICBkaXNwbGF5OiBmbGV4OyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyBnYXA6IDhweDtcbn1cbi5tZy1wb3B1cC13ZWVrICB7IGZvbnQtc2l6ZTogMTFweDsgZm9udC13ZWlnaHQ6IDcwMDsgY29sb3I6ICMwRDZFM0Y7IH1cbi5tZy1wb3B1cC1yb3cgICB7IGZvbnQtc2l6ZTogMTBweDsgY29sb3I6ICM2NDc0OGI7IHdoaXRlLXNwYWNlOiBub3dyYXA7IG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB9XG4ubWctcG9wdXAtc3RhdHMgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDRweDsgZmxleC13cmFwOiB3cmFwOyB9XG4ubWctcG9wdXAtc2J0biAge1xuICBmb250LXNpemU6IDEwcHg7IHBhZGRpbmc6IDJweCA3cHg7IGJvcmRlci1yYWRpdXM6IDIwcHg7XG4gIGJvcmRlcjogMXB4IHNvbGlkICNlMmU4ZjA7IGN1cnNvcjogcG9pbnRlcjsgYmFja2dyb3VuZDogd2hpdGU7IGNvbG9yOiAjNDc1NTY5O1xufVxuLm1nLXBvcHVwLXNidG46aG92ZXIgeyBmaWx0ZXI6IGJyaWdodG5lc3MoLjkpOyB9XG4ubWctcG9wdXAtdGEge1xuICB3aWR0aDogMTAwJTsgaGVpZ2h0OiA3MHB4OyBib3JkZXI6IDFweCBzb2xpZCAjY2JkNWUxOyBib3JkZXItcmFkaXVzOiA2cHg7XG4gIHBhZGRpbmc6IDZweCA4cHg7IGZvbnQtc2l6ZTogMTFweDsgZm9udC1mYW1pbHk6IGluaGVyaXQ7IHJlc2l6ZTogdmVydGljYWw7IG91dGxpbmU6IG5vbmU7XG59XG4ubWctcG9wdXAtdGE6Zm9jdXMgeyBib3JkZXItY29sb3I6ICMwRDZFM0Y7IH1cbi5tZy1wb3B1cC1hY3Rpb25zIHsgZGlzcGxheTogZmxleDsgZ2FwOiA2cHg7IGp1c3RpZnktY29udGVudDogZmxleC1lbmQ7IH1cbi5tZy1idG4tY2FuY2VsIHsgYmFja2dyb3VuZDogI2YxZjVmOTsgY29sb3I6ICM0NzU1Njk7IGJvcmRlcjogbm9uZTsgcGFkZGluZzogNHB4IDEycHg7IGJvcmRlci1yYWRpdXM6IDVweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXNpemU6IDExcHg7IH1cbi5tZy1idG4tc2F2ZSAgIHsgYmFja2dyb3VuZDogIzBENkUzRjsgY29sb3I6IHdoaXRlOyAgIGJvcmRlcjogbm9uZTsgcGFkZGluZzogNHB4IDEycHg7IGJvcmRlci1yYWRpdXM6IDVweDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXNpemU6IDExcHg7IH1cblxuLyogXHUyNTAwXHUyNTAwXHUyNTAwIEVtcHR5IHN0YXRlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuLm1nLWVtcHR5IHtcbiAgcG9zaXRpb246IGFic29sdXRlOyB0b3A6IDEwNnB4OyBsZWZ0OiAwOyByaWdodDogMDsgYm90dG9tOiAwO1xuICBwYWRkaW5nOiA0OHB4IDMycHg7IGNvbG9yOiAjNjQ3NDhiOyBmb250LXNpemU6IDEzcHg7IGxpbmUtaGVpZ2h0OiAxLjg7XG59XG4ubWctZW1wdHkgYiAgICB7IGNvbG9yOiAjMGYxNzJhOyB9XG4ubWctZW1wdHkgY29kZSB7IGJhY2tncm91bmQ6ICNmMWY1Zjk7IHBhZGRpbmc6IDFweCA1cHg7IGJvcmRlci1yYWRpdXM6IDNweDsgZm9udC1zaXplOiAxMnB4OyB9XG5gO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFBeUU7OztBQ0F6RSxJQUFNLGNBQWM7QUFBQSxFQUFDO0FBQUEsRUFBTTtBQUFBLEVBQU07QUFBQSxFQUFNO0FBQUEsRUFBTTtBQUFBLEVBQU07QUFBQSxFQUM5QjtBQUFBLEVBQU07QUFBQSxFQUFNO0FBQUEsRUFBTTtBQUFBLEVBQU07QUFBQSxFQUFNO0FBQUs7QUFFakQsU0FBUyxlQUFlLEtBQXFEO0FBRWxGLFFBQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxRQUFRLE9BQU8sR0FBRztBQUN2QyxRQUFNLElBQUksRUFBRSxNQUFNLEdBQUc7QUFDckIsTUFBSSxFQUFFLFdBQVc7QUFBRyxXQUFPO0FBQzNCLE1BQUksUUFBUSxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUU7QUFDN0IsTUFBSSxPQUFRLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRTtBQUM3QixNQUFJLE1BQU0sS0FBSyxLQUFLLE1BQU0sSUFBSTtBQUFHLFdBQU87QUFDeEMsTUFBSSxPQUFPO0FBQUssWUFBUTtBQUN4QixNQUFJLFFBQVEsS0FBSyxRQUFRO0FBQUksV0FBTztBQUNwQyxTQUFPLEVB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QUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FB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
