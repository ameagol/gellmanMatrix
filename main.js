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
    this.addRibbonIcon("layout-grid", "MatrixGellman", () => this.activateView());
    this.addCommand({
      id: "matrix-gellman-open",
      name: "Open MatrixGellman",
      callback: () => this.activateView()
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
    if (!this.plugin.parsed) {
      const f = this.plugin.app.workspace.getActiveFile();
      if (f)
        await this.plugin.readFile(f.path);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2NhbGVuZGFyLnRzIiwgInNyYy9maWxlaW8udHMiLCAic3JjL3N0eWxlcy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgUGx1Z2luLCBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgVEZpbGUsIGRlYm91bmNlLCBOb3RpY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IHBhcnNlRmlsZSwgcGF0Y2hGaWxlLCBwYXRjaERhdGVzLCBQYXRjaE9wLCBQYXJzZWRGaWxlLCBXZWVrRW50cnksIFNUQVRVU19OQU1FUywgU1RBVFVTX0ZST00gfSBmcm9tIFwiLi9maWxlaW9cIjtcbmltcG9ydCB7IENTUyB9IGZyb20gXCIuL3N0eWxlc1wiO1xuXG5jb25zdCBWSUVXX1RZUEUgICAgID0gXCJtYXRyaXgtZ2VsbG1hblwiO1xuY29uc3QgQ0VMTF9JQ09OUyAgICA9IFtcIlwiLCBcIlx1MDBCN1wiLCBcIlx1MjVCNlwiLCBcIiFcIiwgXCJcdTI3MTVcIiwgXCJcdTI3MTNcIl07XG5jb25zdCBTVEFUVVNfQ09MT1JTID0gW1wiI2UyZThmMFwiLFwiIzk0YTNiOFwiLFwiI2VhYjMwOFwiLFwiI2Y5NzMxNlwiLFwiI2VmNDQ0NFwiLFwiIzIyYzU1ZVwiXTtcbmNvbnN0IFNUQVRVU19MQUJFTFMgPSBbXCJcdTIwMTRcIixcIlBlbmRpbmdcIixcIkluIFByb2dyZXNzXCIsXCJBdCBSaXNrXCIsXCJCbG9ja2VkXCIsXCJEb25lXCJdO1xuXG4vLyBcdTI1MDBcdTI1MDAgQ29sbGFwc2Uga2V5ID0gZmlsZVBhdGggKyBub2RlSWQgc28gZWFjaCBmaWxlIGhhcyBpbmRlcGVuZGVudCBzdGF0ZVxuZnVuY3Rpb24gY0tleShmaWxlUGF0aDogc3RyaW5nLCBub2RlSWQ6IHN0cmluZykgeyByZXR1cm4gYCR7ZmlsZVBhdGh9fHwke25vZGVJZH1gOyB9XG5cbi8vIFx1MjUwMFx1MjUwMCBQbHVnaW4gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBNYXRyaXhHZWxsbWFuUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgLy8gUGVyc2lzdGVkOiB7IGNvbGxhcHNlZCwgbGFzdEZpbGVQYXRoIH1cbiAgc2V0dGluZ3M6IHsgY29sbGFwc2VkOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPjsgbGFzdEZpbGVQYXRoOiBzdHJpbmcgfSA9IHtcbiAgICBjb2xsYXBzZWQ6IHt9LCBsYXN0RmlsZVBhdGg6IFwiXCIsXG4gIH07XG4gIHBhcnNlZDogUGFyc2VkRmlsZSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIF93cml0aW5nID0gZmFsc2U7XG5cbiAgYXN5bmMgb25sb2FkKCkge1xuICAgIGNvbnN0IHNhdmVkID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpO1xuICAgIGlmIChzYXZlZCkgT2JqZWN0LmFzc2lnbih0aGlzLnNldHRpbmdzLCBzYXZlZCk7XG5cbiAgICAvLyBSZXN0b3JlIGxhc3QgZmlsZVxuICAgIGlmICh0aGlzLnNldHRpbmdzLmxhc3RGaWxlUGF0aCkge1xuICAgICAgY29uc3QgZiA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLnNldHRpbmdzLmxhc3RGaWxlUGF0aCk7XG4gICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGaWxlKSBhd2FpdCB0aGlzLnJlYWRGaWxlKHRoaXMuc2V0dGluZ3MubGFzdEZpbGVQYXRoKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhWSUVXX1RZUEUsIGxlYWYgPT4gbmV3IE1hdHJpeFZpZXcobGVhZiwgdGhpcykpO1xuICAgIHRoaXMuYWRkUmliYm9uSWNvbihcImxheW91dC1ncmlkXCIsIFwiTWF0cml4R2VsbG1hblwiLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJtYXRyaXgtZ2VsbG1hbi1vcGVuXCIsXG4gICAgICBuYW1lOiBcIk9wZW4gTWF0cml4R2VsbG1hblwiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCksXG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcIm1hdHJpeC1nZWxsbWFuLXRyYWNrXCIsXG4gICAgICBuYW1lOiBcIk1hdHJpeEdlbGxtYW46IHRyYWNrIGFjdGl2ZSBmaWxlXCIsXG4gICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCBmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICAgICAgaWYgKCFmKSB7IG5ldyBOb3RpY2UoXCJObyBhY3RpdmUgZmlsZSBvcGVuXCIpOyByZXR1cm47IH1cbiAgICAgICAgYXdhaXQgdGhpcy5yZWFkRmlsZShmLnBhdGgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFjdGl2YXRlVmlldygpO1xuICAgICAgICB0aGlzLnJlZnJlc2hWaWV3cygpO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIFdhdGNoIGZvciBleHRlcm5hbCBlZGl0c1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbihcIm1vZGlmeVwiLCBhc3luYyAoZmlsZSkgPT4ge1xuICAgICAgaWYgKHRoaXMuX3dyaXRpbmcpIHJldHVybjtcbiAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUgJiYgZmlsZS5wYXRoID09PSB0aGlzLnNldHRpbmdzLmxhc3RGaWxlUGF0aCkge1xuICAgICAgICBhd2FpdCB0aGlzLnJlYWRGaWxlKGZpbGUucGF0aCk7XG4gICAgICAgIHRoaXMucmVmcmVzaFZpZXdzKCk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgYWN0aXZhdGVWaWV3KCkge1xuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcbiAgICBsZXQgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFKVswXTtcbiAgICBpZiAoIWxlYWYpIHtcbiAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhZihcInRhYlwiKTtcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XG4gICAgfVxuICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xuICB9XG5cbiAgYXN5bmMgcmVhZEZpbGUocGF0aDogc3RyaW5nKSB7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChwYXRoKTtcbiAgICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSByZXR1cm47XG4gICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgdGhpcy5wYXJzZWQgPSBwYXJzZUZpbGUocGF0aCwgY29udGVudCk7XG4gICAgdGhpcy5zZXR0aW5ncy5sYXN0RmlsZVBhdGggPSBwYXRoO1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgfVxuXG4gIHBhdGNoID0gZGVib3VuY2UoYXN5bmMgKG9wOiBQYXRjaE9wKSA9PiB7XG4gICAgaWYgKCF0aGlzLnBhcnNlZCkgcmV0dXJuO1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5wYXJzZWQuZmlsZVBhdGgpO1xuICAgIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHJldHVybjtcbiAgICB0aGlzLl93cml0aW5nID0gdHJ1ZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgICBjb25zdCB1cGRhdGVkID0gcGF0Y2hGaWxlKGNvbnRlbnQsIHRoaXMucGFyc2VkLmZpbGVQYXRoLCBvcCk7XG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgdXBkYXRlZCk7XG4gICAgICB0aGlzLnBhcnNlZCA9IHBhcnNlRmlsZSh0aGlzLnBhcnNlZC5maWxlUGF0aCwgdXBkYXRlZCk7XG4gICAgfSBmaW5hbGx5IHsgc2V0VGltZW91dCgoKSA9PiB7IHRoaXMuX3dyaXRpbmcgPSBmYWxzZTsgfSwgNDAwKTsgfVxuICB9LCAzMDAsIHRydWUpO1xuXG4gIHBhdGNoRGF0ZXMgPSBkZWJvdW5jZShhc3luYyAoc3RhcnRSYXc6IHN0cmluZywgZW5kUmF3OiBzdHJpbmcpID0+IHtcbiAgICBpZiAoIXRoaXMucGFyc2VkKSByZXR1cm47XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLnBhcnNlZC5maWxlUGF0aCk7XG4gICAgaWYgKCEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkgcmV0dXJuO1xuICAgIHRoaXMuX3dyaXRpbmcgPSB0cnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSBwYXRjaERhdGVzKGNvbnRlbnQsIHN0YXJ0UmF3LCBlbmRSYXcpO1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIHVwZGF0ZWQpO1xuICAgICAgdGhpcy5wYXJzZWQgPSBwYXJzZUZpbGUodGhpcy5wYXJzZWQuZmlsZVBhdGgsIHVwZGF0ZWQpO1xuICAgICAgdGhpcy5yZWZyZXNoVmlld3MoKTtcbiAgICB9IGZpbmFsbHkgeyBzZXRUaW1lb3V0KCgpID0+IHsgdGhpcy5fd3JpdGluZyA9IGZhbHNlOyB9LCA0MDApOyB9XG4gIH0sIDUwMCwgdHJ1ZSk7XG5cbiAgcmVmcmVzaFZpZXdzKCkge1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoVklFV19UWVBFKVxuICAgICAgLmZvckVhY2gobCA9PiAobC52aWV3IGFzIE1hdHJpeFZpZXcpLnJlZnJlc2goKSk7XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwIFZpZXcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5jbGFzcyBNYXRyaXhWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xuICBwbHVnaW46IE1hdHJpeEdlbGxtYW5QbHVnaW47XG4gIHN0eWxlRWw6IEhUTUxTdHlsZUVsZW1lbnQgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IE1hdHJpeEdlbGxtYW5QbHVnaW4pIHtcbiAgICBzdXBlcihsZWFmKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuICBnZXRWaWV3VHlwZSgpICAgIHsgcmV0dXJuIFZJRVdfVFlQRTsgfVxuICBnZXREaXNwbGF5VGV4dCgpIHsgcmV0dXJuIFwiTWF0cml4R2VsbG1hblwiOyB9XG4gIGdldEljb24oKSAgICAgICAgeyByZXR1cm4gXCJsYXlvdXQtZ3JpZFwiOyB9XG5cbiAgYXN5bmMgb25PcGVuKCkge1xuICAgIHRoaXMuY29udGFpbmVyRWwuc3R5bGUucGFkZGluZyAgPSBcIjBcIjtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcbiAgICB0aGlzLnN0eWxlRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgdGhpcy5zdHlsZUVsLnRleHRDb250ZW50ID0gQ1NTO1xuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQodGhpcy5zdHlsZUVsKTtcbiAgICAvLyBUcnkgYWN0aXZlIGZpbGUgaWYgbm90aGluZyBsb2FkZWRcbiAgICBpZiAoIXRoaXMucGx1Z2luLnBhcnNlZCkge1xuICAgICAgY29uc3QgZiA9IHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgICAgaWYgKGYpIGF3YWl0IHRoaXMucGx1Z2luLnJlYWRGaWxlKGYucGF0aCk7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cbiAgYXN5bmMgb25DbG9zZSgpIHsgdGhpcy5zdHlsZUVsPy5yZW1vdmUoKTsgfVxuICByZWZyZXNoKCkgICAgICAgeyB0aGlzLnJlbmRlcigpOyB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwIFJlbmRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgcmVuZGVyKCkge1xuICAgIHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb25zdCB3cmFwID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwibWctd3JhcFwiIH0pO1xuICAgIGNvbnN0IHAgICAgPSB0aGlzLnBsdWdpbi5wYXJzZWQ7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgVG9vbGJhciAoYWJzb2x1dGUsIHotaW5kZXggOTk5LCBuZXZlciBzY3JvbGxzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zdCB0YiAgPSB3cmFwLmNyZWF0ZURpdih7IGNsczogXCJtZy10b29sYmFyXCIgfSk7XG4gICAgY29uc3QgdGJMID0gdGIuY3JlYXRlRGl2KCk7XG4gICAgdGJMLmNyZWF0ZURpdih7IGNsczogXCJtZy10b29sYmFyLXRpdGxlXCIsXG4gICAgICB0ZXh0OiBgTWF0cml4R2VsbG1hbiR7cCA/IFwiIFx1MjAxNCBcIiArIHAudGl0bGUgOiBcIlwifWAgfSk7XG4gICAgdGJMLmNyZWF0ZURpdih7IGNsczogXCJtZy10b29sYmFyLXN1YlwiLFxuICAgICAgdGV4dDogXCJDbGljayBsZWFmIGZvciBzdGF0dXMgXHUwMEI3IEhvdmVyIGNlbGwgZm9yIG5vdGUgXHUwMEI3IERibC1jbGljayB0byBlZGl0IFx1MDBCNyBcdTI1QkMgY29sbGFwc2VcIiB9KTtcblxuICAgIGNvbnN0IHRiUiA9IHRiLmNyZWF0ZURpdih7IGNsczogXCJtZy10b29sYmFyLXJpZ2h0XCIgfSk7XG4gICAgY29uc3QgZHcgID0gdGJSLmNyZWF0ZURpdih7IGNsczogXCJtZy1kYXRlLXdyYXBcIiB9KTtcbiAgICBkdy5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogXCJTdGFydFwiIH0pO1xuICAgIGNvbnN0IHN0YXJ0SW4gPSBkdy5jcmVhdGVFbChcImlucHV0XCIsIHsgY2xzOiBcIm1nLWRhdGUtaW5wdXRcIiwgdHlwZTogXCJ0ZXh0XCIgfSk7XG4gICAgc3RhcnRJbi5wbGFjZWhvbGRlciA9IFwiTU0tWVlcIjtcbiAgICBpZiAocCkgc3RhcnRJbi52YWx1ZSA9IHAuc3RhcnRSYXc7XG4gICAgZHcuY3JlYXRlRWwoXCJsYWJlbFwiLCB7IHRleHQ6IFwiRW5kXCIgfSk7XG4gICAgY29uc3QgZW5kSW4gPSBkdy5jcmVhdGVFbChcImlucHV0XCIsIHsgY2xzOiBcIm1nLWRhdGUtaW5wdXRcIiwgdHlwZTogXCJ0ZXh0XCIgfSk7XG4gICAgZW5kSW4ucGxhY2Vob2xkZXIgPSBcIk1NLVlZXCI7XG4gICAgaWYgKHApIGVuZEluLnZhbHVlID0gcC5lbmRSYXc7XG4gICAgZHcuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwibWctYnRuLWFwcGx5XCIsIHRleHQ6IFwiQXBwbHlcIiB9KVxuICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHMgPSBzdGFydEluLnZhbHVlLnRyaW0oKSwgZSA9IGVuZEluLnZhbHVlLnRyaW0oKTtcbiAgICAgICAgaWYgKCFzIHx8ICFlKSB7IG5ldyBOb3RpY2UoXCJFbnRlciBib3RoIFN0YXJ0IGFuZCBFbmQgKE1NLVlZKVwiKTsgcmV0dXJuOyB9XG4gICAgICAgIHRoaXMucGx1Z2luLnBhdGNoRGF0ZXMocywgZSk7XG4gICAgICB9KTtcbiAgICBbXG4gICAgICB7IGM6XCIjOTRhM2I4XCIsIGw6XCJQZW5kaW5nXCIgICAgIH0sXG4gICAgICB7IGM6XCIjZWFiMzA4XCIsIGw6XCJJbiBQcm9ncmVzc1wiIH0sXG4gICAgICB7IGM6XCIjZjk3MzE2XCIsIGw6XCJBdCBSaXNrXCIgICAgIH0sXG4gICAgICB7IGM6XCIjZWY0NDQ0XCIsIGw6XCJCbG9ja2VkXCIgICAgIH0sXG4gICAgICB7IGM6XCIjMjJjNTVlXCIsIGw6XCJEb25lXCIgICAgICAgIH0sXG4gICAgXS5mb3JFYWNoKCh7IGMsIGwgfSkgPT4ge1xuICAgICAgY29uc3QgbGVnID0gdGJSLmNyZWF0ZURpdih7IGNsczogXCJtZy1sZWdlbmRcIiB9KTtcbiAgICAgIGxlZy5jcmVhdGVEaXYoeyBjbHM6IFwibWctbGVnZW5kLWRvdFwiIH0pLnN0eWxlLmJhY2tncm91bmQgPSBjO1xuICAgICAgbGVnLmFwcGVuZFRleHQoXCIgXCIgKyBsKTtcbiAgICB9KTtcbiAgICB0YlIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwibWctYnRuLW9wZW5cIiwgdGV4dDogXCJPcGVuIC5tZFwiIH0pXG4gICAgICAuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaWYgKCFwKSByZXR1cm47XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHAuZmlsZVBhdGgpO1xuICAgICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKVxuICAgICAgICAgIHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZihcInRhYlwiKS5vcGVuRmlsZShmaWxlKTtcbiAgICAgIH0pO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEVtcHR5IHN0YXRlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmICghcCB8fCBwLm5vZGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3QgZW0gPSB3cmFwLmNyZWF0ZURpdih7IGNsczogXCJtZy1lbXB0eVwiIH0pO1xuICAgICAgZW0uaW5uZXJIVE1MID0gIXBcbiAgICAgICAgPyBgPGI+Tm8gZmlsZSBsb2FkZWQuPC9iPjxicj48YnI+XG4gICAgICAgICAgIFVzZSA8Y29kZT5DdHJsK1AgXHUyMTkyIE1hdHJpeEdlbGxtYW46IHRyYWNrIGFjdGl2ZSBmaWxlPC9jb2RlPjxicj48YnI+XG4gICAgICAgICAgIE9wdGlvbmFsbHkgYWRkIDxjb2RlPjo6TWFpbiBQcm9qZWN0IDo6U3RhcnQgMDYtMjYgOjpFbmQgMTItMjc8L2NvZGU+IHRvIHRoZSBmaWxlLmBcbiAgICAgICAgOiBgPGI+Tm8gbGlzdCBpdGVtcyBmb3VuZDwvYj4gaW4gPGNvZGU+JHtwLmZpbGVQYXRofTwvY29kZT4uYDtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgNC1wYW5lIGxheW91dCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAvLyBDb3JuZXI6IHRvcC1sZWZ0LCBmcm96ZW4gb24gYm90aCBheGVzXG4gICAgY29uc3QgY29ybmVyICAgICA9IHdyYXAuY3JlYXRlRGl2KHsgY2xzOiBcIm1nLWNvcm5lclwiIH0pO1xuICAgIC8vIENvbHVtbiBoZWFkZXI6IHRvcC1yaWdodCwgc2Nyb2xscyBYIG9ubHkgKGRyaXZlbiBieSBib2R5KVxuICAgIGNvbnN0IGNvbEhkciAgICAgPSB3cmFwLmNyZWF0ZURpdih7IGNsczogXCJtZy1jb2wtaGRyXCIgfSk7XG4gICAgLy8gUm93IGhlYWRlcjogYm90dG9tLWxlZnQsIHNjcm9sbHMgWSBvbmx5IChkcml2ZW4gYnkgYm9keSlcbiAgICBjb25zdCByb3dIZHJXcmFwID0gd3JhcC5jcmVhdGVEaXYoeyBjbHM6IFwibWctcm93LWhkclwiIH0pO1xuICAgIC8vIEJvZHk6IGJvdHRvbS1yaWdodCwgdGhlIHJlYWwgc2Nyb2xsIGNvbnRhaW5lclxuICAgIGNvbnN0IGJvZHkgICAgICAgPSB3cmFwLmNyZWF0ZURpdih7IGNsczogXCJtZy1ib2R5XCIgfSk7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQ29ybmVyOiBcIlRvcGljXCIgbGFiZWwgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgY1RhYmxlICA9IGNvcm5lci5jcmVhdGVFbChcInRhYmxlXCIpO1xuICAgIGNvbnN0IGNUaGVhZCAgPSBjVGFibGUuY3JlYXRlRWwoXCJ0aGVhZFwiKTtcbiAgICBjb25zdCBjTVJvdyAgID0gY1RoZWFkLmNyZWF0ZUVsKFwidHJcIik7XG4gICAgY29uc3QgY0Nvcm5lciA9IGNNUm93LmNyZWF0ZUVsKFwidGhcIiwgeyBjbHM6IFwibWctdGgtY29ybmVyXCIsIHRleHQ6IFwiVG9waWNcIiB9KTtcbiAgICAoY0Nvcm5lciBhcyBIVE1MVGFibGVDZWxsRWxlbWVudCkucm93U3BhbiA9IDI7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQ29sdW1uIGhlYWRlciB0YWJsZSAobW9udGhzICsgd2Vla3MsIG5vIGxhYmVsIGNvbHVtbikgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgY2hUYWJsZSA9IGNvbEhkci5jcmVhdGVFbChcInRhYmxlXCIsIHsgY2xzOiBcIm1nLWNvbC1oZHItdGFibGVcIiB9KTtcbiAgICBjb25zdCBjaFRoZWFkID0gY2hUYWJsZS5jcmVhdGVFbChcInRoZWFkXCIpO1xuICAgIGNvbnN0IG1Sb3cgICAgPSBjaFRoZWFkLmNyZWF0ZUVsKFwidHJcIik7XG4gICAgcC5jYWxlbmRhci5tb250aHMuZm9yRWFjaCgobSwgaSkgPT4ge1xuICAgICAgY29uc3QgdGggPSBtUm93LmNyZWF0ZUVsKFwidGhcIiwge1xuICAgICAgICBjbHM6IFwibWctdGgtbW9udGhcIiArIChpID09PSBwLmNhbGVuZGFyLm1vbnRocy5sZW5ndGggLSAxID8gXCIgbWctbWVuZFwiIDogXCJcIiksXG4gICAgICAgIHRleHQ6IG0ubGFiZWwsXG4gICAgICB9KTtcbiAgICAgICh0aCBhcyBIVE1MVGFibGVDZWxsRWxlbWVudCkuY29sU3BhbiA9IG0uc3BhbjtcbiAgICB9KTtcbiAgICBjb25zdCB3Um93ID0gY2hUaGVhZC5jcmVhdGVFbChcInRyXCIpO1xuICAgIHAuY2FsZW5kYXIud2Vla3MuZm9yRWFjaCh3ID0+IHtcbiAgICAgIHdSb3cuY3JlYXRlRWwoXCJ0aFwiLCB7XG4gICAgICAgIGNsczogW1wibWctdGgtd2Vla1wiLFxuICAgICAgICAgIHcuaXNDdXJyZW50ICA/IFwibWctY3VycmVudFwiIDogXCJcIixcbiAgICAgICAgICB3LmlzTW9udGhFbmQgPyBcIm1nLW1lbmRcIiAgICA6IFwiXCIsXG4gICAgICAgIF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgXCIpLFxuICAgICAgICB0ZXh0OiB3LmxhYmVsLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUm93IGhlYWRlciB0YWJsZSAobGFiZWwgY29sdW1uIG9ubHksIG5vIHdlZWsgY2VsbHMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNvbnN0IHJoVGFibGUgPSByb3dIZHJXcmFwLmNyZWF0ZUVsKFwidGFibGVcIik7XG4gICAgY29uc3QgcmhUYm9keSA9IHJoVGFibGUuY3JlYXRlRWwoXCJ0Ym9keVwiKTtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBCb2R5IHRhYmxlICh3ZWVrIGNlbGxzIG9ubHksIG5vIGxhYmVsIGNvbHVtbikgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgYmRUYWJsZSA9IGJvZHkuY3JlYXRlRWwoXCJ0YWJsZVwiLCB7IGNsczogXCJtZy1ib2R5LXRhYmxlXCIgfSk7XG4gICAgY29uc3QgYmRUYm9keSA9IGJkVGFibGUuY3JlYXRlRWwoXCJ0Ym9keVwiKTtcblxuICAgIHRoaXMuYnVpbGRSb3dzKHJoVGJvZHksIGJkVGJvZHksIHApO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEpTIHNjcm9sbCBzeW5jOiBib2R5IGRyaXZlcyBjb2xIZHIgKFgpIGFuZCByb3dIZHIgKFkpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCAoKSA9PiB7XG4gICAgICBjb2xIZHIuc2Nyb2xsTGVmdCAgICAgPSBib2R5LnNjcm9sbExlZnQ7XG4gICAgICByb3dIZHJXcmFwLnNjcm9sbFRvcCAgPSBib2R5LnNjcm9sbFRvcDtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMCBCdWlsZCByb3dzIGludG8gdHdvIHBhcmFsbGVsIHRib2R5cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgYnVpbGRSb3dzKFxuICAgIHJoVGJvZHk6IEhUTUxUYWJsZVNlY3Rpb25FbGVtZW50LCAgIC8vIGxhYmVsIGNvbHVtblxuICAgIGJkVGJvZHk6IEhUTUxUYWJsZVNlY3Rpb25FbGVtZW50LCAgIC8vIHdlZWsgY2VsbHNcbiAgICBwOiBQYXJzZWRGaWxlXG4gICkge1xuICAgIGNvbnN0IHsgbm9kZXMsIHdlZWtEYXRhLCBjYWxlbmRhciwgZmlsZVBhdGggfSA9IHA7XG4gICAgY29uc3QgY29sbGFwc2VkID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuY29sbGFwc2VkO1xuXG4gICAgdHlwZSBOb2RlVCA9IHR5cGVvZiBub2Rlc1swXTtcbiAgICBjb25zdCBwYXJlbnRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nIHwgbnVsbD4oKTtcbiAgICBjb25zdCBjaGlsZFNldCAgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBzdGs6IE5vZGVUW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG4gb2Ygbm9kZXMpIHtcbiAgICAgIHdoaWxlIChzdGsubGVuZ3RoICYmIHN0a1tzdGsubGVuZ3RoLTFdLmluZGVudCA+PSBuLmluZGVudCkgc3RrLnBvcCgpO1xuICAgICAgY29uc3QgcGFyID0gc3RrLmxlbmd0aCA/IHN0a1tzdGsubGVuZ3RoLTFdIDogbnVsbDtcbiAgICAgIHBhcmVudE1hcC5zZXQobi5pZCwgcGFyPy5pZCA/PyBudWxsKTtcbiAgICAgIGlmIChwYXIpIGNoaWxkU2V0LmFkZChwYXIuaWQpO1xuICAgICAgc3RrLnB1c2gobik7XG4gICAgfVxuXG4gICAgY29uc3QgaXNWaXNpYmxlID0gKGlkOiBzdHJpbmcpOiBib29sZWFuID0+IHtcbiAgICAgIGxldCBwaWQgPSBwYXJlbnRNYXAuZ2V0KGlkKTtcbiAgICAgIHdoaWxlIChwaWQpIHtcbiAgICAgICAgaWYgKGNvbGxhcHNlZFtjS2V5KGZpbGVQYXRoLCBwaWQpXSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBwaWQgPSBwYXJlbnRNYXAuZ2V0KHBpZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgLy8gU3luYyB2aXNpYmlsaXR5IGFjcm9zcyBib3RoIHRhYmxlc1xuICAgIGNvbnN0IGFwcGx5VmlzID0gKCkgPT4ge1xuICAgICAgcmhUYm9keS5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcInRyW2RhdGEtaWRdXCIpLmZvckVhY2godHIgPT4ge1xuICAgICAgICB0ci5jbGFzc0xpc3QudG9nZ2xlKFwibWctaGlkZGVuXCIsICFpc1Zpc2libGUodHIuZGF0YXNldC5pZCEpKTtcbiAgICAgIH0pO1xuICAgICAgYmRUYm9keS5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcInRyW2RhdGEtaWRdXCIpLmZvckVhY2godHIgPT4ge1xuICAgICAgICB0ci5jbGFzc0xpc3QudG9nZ2xlKFwibWctaGlkZGVuXCIsICFpc1Zpc2libGUodHIuZGF0YXNldC5pZCEpKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgIGNvbnN0IGlzTGVhZiA9ICFjaGlsZFNldC5oYXMobm9kZS5pZCk7XG4gICAgICBjb25zdCBsdmwgICAgPSBNYXRoLm1pbihub2RlLmx2bCwgMyk7XG4gICAgICBjb25zdCB2aXMgICAgPSBpc1Zpc2libGUobm9kZS5pZCk7XG4gICAgICBjb25zdCBjayAgICAgPSBjS2V5KGZpbGVQYXRoLCBub2RlLmlkKTtcbiAgICAgIGNvbnN0IGhpZENscyA9IHZpcyA/IFwiXCIgOiBcIiBtZy1oaWRkZW5cIjtcblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIExhYmVsIHJvdyAobGVmdCBwYW5lKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIGNvbnN0IHJoVHIgICAgPSByaFRib2R5LmNyZWF0ZUVsKFwidHJcIiwgeyBjbHM6IGBtZy1sdmwke2x2bH0ke2hpZENsc31gIH0pO1xuICAgICAgcmhUci5kYXRhc2V0LmlkID0gbm9kZS5pZDtcbiAgICAgIGNvbnN0IGxhYmVsVGQgPSByaFRyLmNyZWF0ZUVsKFwidGRcIik7XG4gICAgICBjb25zdCBpbm5lciAgID0gbGFiZWxUZC5jcmVhdGVEaXYoeyBjbHM6IFwibWctbGFiZWwtaW5uZXJcIiB9KTtcblxuICAgICAgaWYgKGNoaWxkU2V0Lmhhcyhub2RlLmlkKSkge1xuICAgICAgICBjb25zdCBidG4gPSBpbm5lci5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJtZy10b2dnbGVcIiB9KTtcbiAgICAgICAgYnRuLnRleHRDb250ZW50ID0gY29sbGFwc2VkW2NrXSA/IFwiXHUyNUI2XCIgOiBcIlx1MjVCQ1wiO1xuICAgICAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGUgPT4ge1xuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgY29sbGFwc2VkW2NrXSA9ICFjb2xsYXBzZWRbY2tdO1xuICAgICAgICAgIGJ0bi50ZXh0Q29udGVudCA9IGNvbGxhcHNlZFtja10gPyBcIlx1MjVCNlwiIDogXCJcdTI1QkNcIjtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICBhcHBseVZpcygpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlubmVyLmNyZWF0ZVNwYW4oeyBjbHM6IFwibWctbGVhZi1zcFwiIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdCA9IGlubmVyLmNyZWF0ZVNwYW4oeyBjbHM6IFwibWctbGFiZWwtdGV4dFwiLCB0ZXh0OiBub2RlLmxhYmVsIH0pO1xuICAgICAgbHQudGl0bGUgPSBub2RlLmxhYmVsO1xuXG4gICAgICBpZiAoaXNMZWFmKSB7XG4gICAgICAgIGxhYmVsVGQuZGF0YXNldC5scyAgICA9IFN0cmluZyhub2RlLmNvbG9yU3RhdHVzKTtcbiAgICAgICAgbGFiZWxUZC5kYXRhc2V0Lmxub3RlID0gT2JqZWN0LnZhbHVlcyh3ZWVrRGF0YVtub2RlLmlkXSA/PyB7fSkuc29tZShlID0+IGUubm90ZSkgPyBcIjFcIiA6IFwiMFwiO1xuICAgICAgICBsYWJlbFRkLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBlID0+IHtcbiAgICAgICAgICBpZiAoKGUgYXMgTW91c2VFdmVudCkuZGV0YWlsID49IDIpIHJldHVybjtcbiAgICAgICAgICBub2RlLmNvbG9yU3RhdHVzID0gKG5vZGUuY29sb3JTdGF0dXMgKyAxKSAlIDY7XG4gICAgICAgICAgbGFiZWxUZC5kYXRhc2V0LmxzID0gU3RyaW5nKG5vZGUuY29sb3JTdGF0dXMpO1xuICAgICAgICAgIHRoaXMucGx1Z2luLnBhdGNoKHsgbm9kZUlkOiBub2RlLmlkLCBjb2xvclN0YXR1czogbm9kZS5jb2xvclN0YXR1cywgd2Vla0RhdGE6IHdlZWtEYXRhW25vZGUuaWRdID8/IHt9IH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIENlbGwgcm93IChyaWdodCBwYW5lKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIGNvbnN0IGJkVHIgPSBiZFRib2R5LmNyZWF0ZUVsKFwidHJcIiwgeyBjbHM6IGBtZy1sdmwke2x2bH0ke2hpZENsc31gIH0pO1xuICAgICAgYmRUci5kYXRhc2V0LmlkID0gbm9kZS5pZDtcblxuICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCBjYWxlbmRhci53ZWVrcy5sZW5ndGg7IGMrKykge1xuICAgICAgICBjb25zdCB3ayAgICA9IGNhbGVuZGFyLndlZWtzW2NdLmtleTtcbiAgICAgICAgY29uc3QgZW50cnkgPSAod2Vla0RhdGFbbm9kZS5pZF0gPz8ge30pW3drXSA/PyB7IHM6IDAsIG5vdGU6IFwiXCIgfTtcbiAgICAgICAgY29uc3QgY2VsbCAgPSBiZFRyLmNyZWF0ZUVsKFwidGRcIiwge1xuICAgICAgICAgIGNsczogW1wibWctY2VsbFwiLCBjYWxlbmRhci53ZWVrc1tjXS5pc01vbnRoRW5kID8gXCJtZy1tZW5kXCIgOiBcIlwiXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiBcIiksXG4gICAgICAgIH0pO1xuICAgICAgICBjZWxsLmRhdGFzZXQucyA9IFN0cmluZyhlbnRyeS5zKTtcbiAgICAgICAgaWYgKGVudHJ5LnMgPiAwKSBjZWxsLnRleHRDb250ZW50ID0gQ0VMTF9JQ09OU1tlbnRyeS5zXTtcbiAgICAgICAgaWYgKGVudHJ5Lm5vdGUpIGNlbGwuZGF0YXNldC5oYXNub3RlID0gXCIxXCI7XG4gICAgICAgIGNlbGwudGl0bGUgPSBbZW50cnkucyA+IDAgPyBgWyR7U1RBVFVTX05BTUVTW2VudHJ5LnNdfV1gIDogXCJcIiwgZW50cnkubm90ZV1cbiAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIgXHUyMDE0IFwiKTtcblxuICAgICAgICBpZiAoIWlzTGVhZikgY29udGludWU7XG5cbiAgICAgICAgY2VsbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZSA9PiB7XG4gICAgICAgICAgaWYgKChlIGFzIE1vdXNlRXZlbnQpLmRldGFpbCA+PSAyKSByZXR1cm47XG4gICAgICAgICAgaWYgKCF3ZWVrRGF0YVtub2RlLmlkXSkgd2Vla0RhdGFbbm9kZS5pZF0gPSB7fTtcbiAgICAgICAgICBjb25zdCBjdXIgPSB3ZWVrRGF0YVtub2RlLmlkXVt3a10gPz8geyBzOiAwLCBub3RlOiBcIlwiIH07XG4gICAgICAgICAgY3VyLnMgPSAoY3VyLnMgKyAxKSAlIDY7XG4gICAgICAgICAgd2Vla0RhdGFbbm9kZS5pZF1bd2tdID0gY3VyO1xuICAgICAgICAgIGNlbGwuZGF0YXNldC5zICAgPSBTdHJpbmcoY3VyLnMpO1xuICAgICAgICAgIGNlbGwudGV4dENvbnRlbnQgPSBjdXIucyA+IDAgPyBDRUxMX0lDT05TW2N1ci5zXSA6IFwiXCI7XG4gICAgICAgICAgY2VsbC50aXRsZSA9IFtjdXIucyA+IDAgPyBgWyR7U1RBVFVTX05BTUVTW2N1ci5zXX1dYCA6IFwiXCIsIGN1ci5ub3RlXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiBcdTIwMTQgXCIpO1xuICAgICAgICAgIHRoaXMucGx1Z2luLnBhdGNoKHsgbm9kZUlkOiBub2RlLmlkLCBjb2xvclN0YXR1czogbm9kZS5jb2xvclN0YXR1cywgd2Vla0RhdGE6IHdlZWtEYXRhW25vZGUuaWRdIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBjZWxsLmFkZEV2ZW50TGlzdGVuZXIoXCJkYmxjbGlja1wiLCBlID0+IHtcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgIGNvbnN0IGN1ciA9ICh3ZWVrRGF0YVtub2RlLmlkXSA/PyB7fSlbd2tdID8/IHsgczogMCwgbm90ZTogXCJcIiB9O1xuICAgICAgICAgIHRoaXMub3BlblBvcHVwKGNlbGwsIGNhbGVuZGFyLndlZWtzW2NdLmtleSwgbm9kZS5sYWJlbCwgY3VyLCB1cGRhdGVkID0+IHtcbiAgICAgICAgICAgIGlmICghd2Vla0RhdGFbbm9kZS5pZF0pIHdlZWtEYXRhW25vZGUuaWRdID0ge307XG4gICAgICAgICAgICB3ZWVrRGF0YVtub2RlLmlkXVt3a10gPSB1cGRhdGVkO1xuICAgICAgICAgICAgY2VsbC5kYXRhc2V0LnMgICAgICAgID0gU3RyaW5nKHVwZGF0ZWQucyk7XG4gICAgICAgICAgICBjZWxsLmRhdGFzZXQuaGFzbm90ZSAgPSB1cGRhdGVkLm5vdGUgPyBcIjFcIiA6IFwiMFwiO1xuICAgICAgICAgICAgY2VsbC50ZXh0Q29udGVudCAgICAgID0gdXBkYXRlZC5zID4gMCA/IENFTExfSUNPTlNbdXBkYXRlZC5zXSA6IFwiXCI7XG4gICAgICAgICAgICBjZWxsLnRpdGxlID0gW3VwZGF0ZWQucyA+IDAgPyBgWyR7U1RBVFVTX05BTUVTW3VwZGF0ZWQuc119XWAgOiBcIlwiLCB1cGRhdGVkLm5vdGVdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIFx1MjAxNCBcIik7XG4gICAgICAgICAgICBsYWJlbFRkLmRhdGFzZXQubG5vdGUgPSBPYmplY3QudmFsdWVzKHdlZWtEYXRhW25vZGUuaWRdKS5zb21lKGUgPT4gZS5ub3RlKSA/IFwiMVwiIDogXCIwXCI7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5wYXRjaCh7IG5vZGVJZDogbm9kZS5pZCwgY29sb3JTdGF0dXM6IG5vZGUuY29sb3JTdGF0dXMsIHdlZWtEYXRhOiB3ZWVrRGF0YVtub2RlLmlkXSB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwIE5vdGUgcG9wdXAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIG9wZW5Qb3B1cChcbiAgICBhbmNob3I6IEhUTUxFbGVtZW50LCB3ZWVrTGFiZWw6IHN0cmluZywgcm93TGFiZWw6IHN0cmluZyxcbiAgICBjdXJyZW50OiBXZWVrRW50cnksIG9uU2F2ZTogKGU6IFdlZWtFbnRyeSkgPT4gdm9pZFxuICApIHtcbiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLm1nLXBvcHVwXCIpPy5yZW1vdmUoKTtcbiAgICBjb25zdCBwb3B1cCA9IGRvY3VtZW50LmJvZHkuY3JlYXRlRGl2KHsgY2xzOiBcIm1nLXBvcHVwXCIgfSk7XG4gICAgY29uc3QgcmVjdCAgPSBhbmNob3IuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcG9wdXAuc3R5bGUudG9wICA9IGAke01hdGgubWluKHJlY3QuYm90dG9tICsgNiwgd2luZG93LmlubmVySGVpZ2h0IC0gMjMwKX1weGA7XG4gICAgcG9wdXAuc3R5bGUubGVmdCA9IGAke01hdGgubWluKHJlY3QubGVmdCwgd2luZG93LmlubmVyV2lkdGggLSAzMjApfXB4YDtcblxuICAgIHBvcHVwLmNyZWF0ZURpdih7IGNsczogXCJtZy1wb3B1cC13ZWVrXCIsIHRleHQ6IHdlZWtMYWJlbCB9KTtcbiAgICBwb3B1cC5jcmVhdGVEaXYoeyBjbHM6IFwibWctcG9wdXAtcm93XCIsICB0ZXh0OiByb3dMYWJlbCB9KTtcblxuICAgIGNvbnN0IHN3ICA9IHBvcHVwLmNyZWF0ZURpdih7IGNsczogXCJtZy1wb3B1cC1zdGF0c1wiIH0pO1xuICAgIGxldCBzZWwgICA9IGN1cnJlbnQucztcbiAgICBjb25zdCBidG5zOiBIVE1MQnV0dG9uRWxlbWVudFtdID0gW107XG5cbiAgICBTVEFUVVNfTEFCRUxTLmZvckVhY2goKGxibCwgcykgPT4ge1xuICAgICAgY29uc3QgYnRuID0gc3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwibWctcG9wdXAtc2J0blwiLCB0ZXh0OiBsYmwgfSk7XG4gICAgICBidG4uc3R5bGUuYm9yZGVyQ29sb3IgPSBTVEFUVVNfQ09MT1JTW3NdO1xuICAgICAgaWYgKHMgPT09IHNlbCkgeyBidG4uc3R5bGUuYmFja2dyb3VuZCA9IFNUQVRVU19DT0xPUlNbc107IGJ0bi5zdHlsZS5jb2xvciA9IHMgPiAwID8gXCJ3aGl0ZVwiIDogXCJcIjsgfVxuICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAgIHNlbCA9IHM7XG4gICAgICAgIGJ0bnMuZm9yRWFjaCgoYiwgaSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGFjdGl2ZSA9IGkgPT09IHM7XG4gICAgICAgICAgYi5zdHlsZS5iYWNrZ3JvdW5kID0gYWN0aXZlID8gU1RBVFVTX0NPTE9SU1tpXSA6IFwid2hpdGVcIjtcbiAgICAgICAgICBiLnN0eWxlLmNvbG9yICAgICAgPSBhY3RpdmUgJiYgaSA+IDAgPyBcIndoaXRlXCIgOiBcIiM0NzU1NjlcIjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIGJ0bnMucHVzaChidG4pO1xuICAgIH0pO1xuXG4gICAgY29uc3QgdGEgPSBwb3B1cC5jcmVhdGVFbChcInRleHRhcmVhXCIsIHsgY2xzOiBcIm1nLXBvcHVwLXRhXCIgfSk7XG4gICAgdGEudmFsdWUgPSBjdXJyZW50Lm5vdGU7IHRhLnBsYWNlaG9sZGVyID0gXCJBZGQgYSBub3RlXHUyMDI2XCI7XG4gICAgc2V0VGltZW91dCgoKSA9PiB0YS5mb2N1cygpLCA0MCk7XG5cbiAgICBjb25zdCBhY3QgPSBwb3B1cC5jcmVhdGVEaXYoeyBjbHM6IFwibWctcG9wdXAtYWN0aW9uc1wiIH0pO1xuICAgIGFjdC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJtZy1idG4tY2FuY2VsXCIsIHRleHQ6IFwiQ2FuY2VsXCIgfSlcbiAgICAgIC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gcG9wdXAucmVtb3ZlKCkpO1xuICAgIGFjdC5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJtZy1idG4tc2F2ZVwiLCB0ZXh0OiBcIlNhdmVcIiB9KVxuICAgICAgLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7IG9uU2F2ZSh7IHM6IHNlbCwgbm90ZTogdGEudmFsdWUudHJpbSgpIH0pOyBwb3B1cC5yZW1vdmUoKTsgfSk7XG5cbiAgICBjb25zdCBvdXRzaWRlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgIGlmICghcG9wdXAuY29udGFpbnMoZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQpKSB7XG4gICAgICAgIHBvcHVwLnJlbW92ZSgpOyBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG91dHNpZGUpO1xuICAgICAgfVxuICAgIH07XG4gICAgc2V0VGltZW91dCgoKSA9PiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG91dHNpZGUpLCAxMCk7XG5cbiAgICBjb25zdCBraCA9IChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XG4gICAgICBpZiAoZS5rZXkgPT09IFwiRXNjYXBlXCIpIHsgcG9wdXAucmVtb3ZlKCk7IGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtoKTsgfVxuICAgICAgaWYgKChlLmN0cmxLZXkgfHwgZS5tZXRhS2V5KSAmJiBlLmtleSA9PT0gXCJFbnRlclwiKSB7XG4gICAgICAgIG9uU2F2ZSh7IHM6IHNlbCwgbm90ZTogdGEudmFsdWUudHJpbSgpIH0pOyBwb3B1cC5yZW1vdmUoKTsgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2gpO1xuICAgICAgfVxuICAgIH07XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2gpO1xuICB9XG59XG4iLCAiY29uc3QgTU9OVEhfTkFNRVMgPSBbXCJKYW5cIixcIkZlYlwiLFwiTWFyXCIsXCJBcHJcIixcIk1heVwiLFwiSnVuXCIsXG4gICAgICAgICAgICAgICAgICAgICBcIkp1bFwiLFwiQXVnXCIsXCJTZXBcIixcIk9jdFwiLFwiTm92XCIsXCJEZWNcIl07XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1vbnRoWWVhcihyYXc6IHN0cmluZyk6IHsgeWVhcjogbnVtYmVyOyBtb250aDogbnVtYmVyIH0gfCBudWxsIHtcbiAgLy8gQWNjZXB0cyBNTS1ZWSwgTU0vWVksIE1NLVlZWVksIE1NL1lZWVlcbiAgY29uc3QgcyA9IHJhdy50cmltKCkucmVwbGFjZSgvXFwvL2csIFwiLVwiKTtcbiAgY29uc3QgcCA9IHMuc3BsaXQoXCItXCIpO1xuICBpZiAocC5sZW5ndGggIT09IDIpIHJldHVybiBudWxsO1xuICBsZXQgbW9udGggPSBwYXJzZUludChwWzBdLCAxMCk7XG4gIGxldCB5ZWFyICA9IHBhcnNlSW50KHBbMV0sIDEwKTtcbiAgaWYgKGlzTmFOKG1vbnRoKSB8fCBpc05hTih5ZWFyKSkgcmV0dXJuIG51bGw7XG4gIGlmICh5ZWFyIDwgMTAwKSB5ZWFyICs9IDIwMDA7XG4gIGlmIChtb250aCA8IDEgfHwgbW9udGggPiAxMikgcmV0dXJuIG51bGw7XG4gIHJldHVybiB7IHllYXIsIG1vbnRoIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2Vla0NvbCB7XG4gIGtleTogICAgICAgIHN0cmluZzsgICAvLyBcIkp1biAyMDI2IFcyXCJcbiAgbGFiZWw6ICAgICAgc3RyaW5nOyAgIC8vIFwiVzJcIlxuICBtb250aExhYmVsOiBzdHJpbmc7ICAgLy8gXCJKdW4gMjAyNlwiXG4gIG1vbnRoSWR4OiAgIG51bWJlcjtcbiAgaXNNb250aEVuZDogYm9vbGVhbjtcbiAgaXNDdXJyZW50OiAgYm9vbGVhbjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgTW9udGhHcm91cCB7IGxhYmVsOiBzdHJpbmc7IHNwYW46IG51bWJlcjsgfVxuZXhwb3J0IGludGVyZmFjZSBDYWxlbmRhciAgIHsgd2Vla3M6IFdlZWtDb2xbXTsgbW9udGhzOiBNb250aEdyb3VwW107IHRvdGFsOiBudW1iZXI7IH1cblxuLy8gXHUyNTAwXHUyNTAwIFB1cmUgYXJpdGhtZXRpYyBoZWxwZXJzIChubyBEU1QgaXNzdWVzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLy8gRGF5LW9mLXdlZWsgZm9yIHRoZSAxc3Qgb2YgYSBtb250aCAoMD1TdW4gXHUyMDI2IDY9U2F0KVxuZnVuY3Rpb24gZmlyc3REb3coeTogbnVtYmVyLCBtOiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCB0ID0gWzAsMywyLDUsMCwzLDUsMSw0LDYsMiw0XTtcbiAgY29uc3QgeXkgPSBtIDwgMyA/IHkgLSAxIDogeTtcbiAgcmV0dXJuICh5eSArIE1hdGguZmxvb3IoeXkvNCkgLSBNYXRoLmZsb29yKHl5LzEwMCkgKyBNYXRoLmZsb29yKHl5LzQwMCkgKyB0W20tMV0pICUgNztcbn1cbmZ1bmN0aW9uIGRheXNJbk1vbnRoKHk6IG51bWJlciwgbTogbnVtYmVyKTogbnVtYmVyIHtcbiAgaWYgKG0gPT09IDIpIHJldHVybiAoeSU0PT09MCAmJiB5JTEwMCE9PTApIHx8IHklNDAwPT09MCA/IDI5IDogMjg7XG4gIHJldHVybiBbMCwzMSwyOCwzMSwzMCwzMSwzMCwzMSwzMSwzMCwzMSwzMCwzMV1bbV07XG59XG4vLyAxLWJhc2VkIGRheSBudW1iZXJzIG9mIGFsbCBNb25kYXlzIGluIG1vbnRoIHkvbVxuZnVuY3Rpb24gbW9uZGF5c0luTW9udGgoeTogbnVtYmVyLCBtOiBudW1iZXIpOiBudW1iZXJbXSB7XG4gIGNvbnN0IGZkICAgPSBmaXJzdERvdyh5LCBtKTtcbiAgY29uc3Qgc2tpcCA9ICgxIC0gZmQgKyA3KSAlIDc7IC8vIGRheXMgZnJvbSAxc3QgdG8gZmlyc3QgTW9uZGF5XG4gIGNvbnN0IGRpbSAgPSBkYXlzSW5Nb250aCh5LCBtKTtcbiAgY29uc3QgcjogbnVtYmVyW10gPSBbXTtcbiAgZm9yIChsZXQgZCA9IDEgKyBza2lwOyBkIDw9IGRpbTsgZCArPSA3KSByLnB1c2goZCk7XG4gIHJldHVybiByO1xufVxuLy8gTW9uZGF5IG9mIHRoZSBjdXJyZW50IHJlYWwtd29ybGQgd2VlayBhcyB5L20vZFxuZnVuY3Rpb24gY3VycmVudE1vbmRheVlNRCgpOiB7IHk6IG51bWJlcjsgbTogbnVtYmVyOyBkOiBudW1iZXIgfSB7XG4gIGNvbnN0IG5vdyAgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBkb3cgID0gbm93LmdldERheSgpOyAgICAgICAgICAgICAgIC8vIDA9U3VuXG4gIGNvbnN0IGJhY2sgPSBkb3cgPT09IDAgPyA2IDogZG93IC0gMTtcbiAgY29uc3QgdHMgICA9IG5vdy5nZXRUaW1lKCkgLSBiYWNrICogODZfNDAwXzAwMDtcbiAgY29uc3QgbW9uICA9IG5ldyBEYXRlKHRzKTtcbiAgcmV0dXJuIHsgeTogbW9uLmdldEZ1bGxZZWFyKCksIG06IG1vbi5nZXRNb250aCgpICsgMSwgZDogbW9uLmdldERhdGUoKSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDYWxlbmRhcihzeTogbnVtYmVyLCBzbTogbnVtYmVyLCBleTogbnVtYmVyLCBlbTogbnVtYmVyKTogQ2FsZW5kYXIge1xuICBjb25zdCB3ZWVrczogIFdlZWtDb2xbXSAgICA9IFtdO1xuICBjb25zdCBtb250aHM6IE1vbnRoR3JvdXBbXSA9IFtdO1xuICBjb25zdCBjdXIgPSBjdXJyZW50TW9uZGF5WU1EKCk7XG4gIGxldCB5ID0gc3ksIG0gPSBzbSwgbUlkeCA9IDA7XG5cbiAgd2hpbGUgKHkgPCBleSB8fCAoeSA9PT0gZXkgJiYgbSA8PSBlbSkpIHtcbiAgICBjb25zdCBtbCAgICAgID0gYCR7TU9OVEhfTkFNRVNbbS0xXX0gJHt5fWA7XG4gICAgY29uc3QgbW9uZGF5cyA9IG1vbmRheXNJbk1vbnRoKHksIG0pO1xuXG4gICAgbW9uZGF5cy5mb3JFYWNoKChkYXksIHcpID0+IHtcbiAgICAgIHdlZWtzLnB1c2goe1xuICAgICAgICBrZXk6ICAgICAgICBgJHttbH0gVyR7dysxfWAsXG4gICAgICAgIGxhYmVsOiAgICAgIGBXJHt3KzF9YCxcbiAgICAgICAgbW9udGhMYWJlbDogbWwsXG4gICAgICAgIG1vbnRoSWR4OiAgIG1JZHgsXG4gICAgICAgIGlzTW9udGhFbmQ6IHcgPT09IG1vbmRheXMubGVuZ3RoIC0gMSxcbiAgICAgICAgaXNDdXJyZW50OiAgeSA9PT0gY3VyLnkgJiYgbSA9PT0gY3VyLm0gJiYgZGF5ID09PSBjdXIuZCxcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgbW9udGhzLnB1c2goeyBsYWJlbDogbWwsIHNwYW46IG1vbmRheXMubGVuZ3RoIH0pO1xuICAgIG1JZHgrKztcbiAgICBtKys7IGlmIChtID4gMTIpIHsgbSA9IDE7IHkrKzsgfVxuICB9XG5cbiAgcmV0dXJuIHsgd2Vla3MsIG1vbnRocywgdG90YWw6IHdlZWtzLmxlbmd0aCB9O1xufVxuIiwgImltcG9ydCB7IHBhcnNlTW9udGhZZWFyLCBidWlsZENhbGVuZGFyLCBDYWxlbmRhciB9IGZyb20gXCIuL2NhbGVuZGFyXCI7XG5cbi8vIFx1MjUwMFx1MjUwMCBTdGF0dXMgdm9jYWIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgY29uc3QgU1RBVFVTX05BTUVTID0gW1wiXCIsIFwicGVuZGluZ1wiLCBcImluLXByb2dyZXNzXCIsIFwiYXQtcmlza1wiLCBcImJsb2NrZWRcIiwgXCJkb25lXCJdO1xuZXhwb3J0IGNvbnN0IFNUQVRVU19GUk9NOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge1xuICBcInBlbmRpbmdcIjogMSwgXCJpbi1wcm9ncmVzc1wiOiAyLCBcImF0LXJpc2tcIjogMywgXCJibG9ja2VkXCI6IDQsIFwiZG9uZVwiOiA1LFxufTtcblxuLy8gXHUyNTAwXHUyNTAwIFR5cGVzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IGludGVyZmFjZSBOb2RlIHtcbiAgaWQ6ICAgICAgICAgICAgc3RyaW5nO1xuICBsYWJlbDogICAgICAgICBzdHJpbmc7XG4gIGluZGVudDogICAgICAgIG51bWJlcjtcbiAgbGluZUlkeDogICAgICAgbnVtYmVyO1xuICBsdmw6ICAgICAgICAgICBudW1iZXI7XG4gIGNvbG9yU3RhdHVzOiAgIG51bWJlcjtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgV2Vla0VudHJ5IHsgczogbnVtYmVyOyBub3RlOiBzdHJpbmc7IH1cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkRmlsZSB7XG4gIGZpbGVQYXRoOiBzdHJpbmc7IHRpdGxlOiBzdHJpbmc7IGNhbGVuZGFyOiBDYWxlbmRhcjtcbiAgbm9kZXM6IE5vZGVbXTsgd2Vla0RhdGE6IFJlY29yZDxzdHJpbmcsIFJlY29yZDxzdHJpbmcsIFdlZWtFbnRyeT4+O1xuICBsaW5lczogc3RyaW5nW107IHN0YXJ0UmF3OiBzdHJpbmc7IGVuZFJhdzogc3RyaW5nO1xufVxuZXhwb3J0IGludGVyZmFjZSBQYXRjaE9wIHtcbiAgbm9kZUlkOiBzdHJpbmc7IGNvbG9yU3RhdHVzOiBudW1iZXI7IHdlZWtEYXRhOiBSZWNvcmQ8c3RyaW5nLCBXZWVrRW50cnk+O1xufVxuXG4vLyBcdTI1MDBcdTI1MDAgSGVscGVycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbmZ1bmN0aW9uIGNvdW50SW5kZW50KGxpbmU6IHN0cmluZyk6IG51bWJlciB7XG4gIGxldCBuID0gMCwgaSA9IDA7XG4gIHdoaWxlIChpIDwgbGluZS5sZW5ndGgpIHtcbiAgICBpZiAgICAgIChsaW5lW2ldID09PSBcIlxcdFwiKSAgICAgICAgICAgICAgICAgICAgICAgICAgeyBuKys7IGkrKzsgICAgfVxuICAgIGVsc2UgaWYgKGxpbmVbaV0gPT09IFwiIFwiICYmIGxpbmVbaSArIDFdID09PSBcIiBcIikgICB7IG4rKzsgaSArPSAyOyB9XG4gICAgZWxzZSBicmVhaztcbiAgfVxuICByZXR1cm4gbjtcbn1cblxuZnVuY3Rpb24gc3RyaXBXaWtpKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzLnJlcGxhY2UoL1xcW1xcWyg/OlteXFxdfF0qXFx8KT8oW15cXF1dKilcXF1cXF0vZywgXCIkMVwiKTtcbn1cblxuLy8gRXh0cmFjdCBjbGVhbiBkaXNwbGF5IGxhYmVsOiByZW1vdmUgaW5saW5lIDo6c3RhdHVzOiBYXG5mdW5jdGlvbiBsYWJlbE9mKHJhdzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHN0cmlwV2lraShyYXcpLnJlcGxhY2UoL1xccyo6OnN0YXR1czpcXHMqXFxTKy9nLCBcIlwiKS50cmltKCk7XG59XG5cbi8vIEV4dHJhY3QgaW5saW5lIDo6c3RhdHVzOiB2YWx1ZSBmcm9tIGEgdHJlZSBpdGVtIGxpbmVcbmZ1bmN0aW9uIGlubGluZVN0YXR1cyhyYXc6IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IG0gPSByYXcubWF0Y2goLzo6c3RhdHVzOlxccyooW2Etei1dKykvaSk7XG4gIHJldHVybiBtID8gKFNUQVRVU19GUk9NW21bMV0udG9Mb3dlckNhc2UoKV0gPz8gMCkgOiAwO1xufVxuXG4vLyBQYXJzZSAgOjpub3RlOiB7IHN0YXR1czogWCwgZGF0ZTogWSwgY29tbWVudDogWiB9XG5mdW5jdGlvbiBwYXJzZU5vdGUocmF3OiBzdHJpbmcpOiB7IHM6IG51bWJlcjsgd2s6IHN0cmluZzsgbm90ZTogc3RyaW5nIH0gfCBudWxsIHtcbiAgLy8gTXVzdCBzdGFydCB3aXRoIDo6bm90ZTpcbiAgaWYgKCEvXjo6bm90ZVxccyo6L2kudGVzdChyYXcpKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgYmxvY2sgPSByYXcubWF0Y2goL1xceyhbXn1dKilcXH0vKTtcbiAgaWYgKCFibG9jaykgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGJvZHkgPSBibG9ja1sxXTtcbiAgY29uc3QgZ2V0ICA9IChrOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCByID0gYm9keS5tYXRjaChuZXcgUmVnRXhwKGBcXFxcYiR7a31cXFxccyo6XFxcXHMqKFteLH1dKylgLCBcImlcIikpO1xuICAgIHJldHVybiByID8gclsxXS50cmltKCkgOiBcIlwiO1xuICB9O1xuICBjb25zdCB3ayAgID0gZ2V0KFwiZGF0ZVwiKTtcbiAgY29uc3Qgbm90ZSA9IGdldChcImNvbW1lbnRcIik7XG4gIGNvbnN0IHMgICAgPSBTVEFUVVNfRlJPTVtnZXQoXCJzdGF0dXNcIikudG9Mb3dlckNhc2UoKV0gPz8gMDtcbiAgcmV0dXJuIHdrID8geyBzLCB3aywgbm90ZSB9IDogbnVsbDtcbn1cblxuLy8gSXMgdGhpcyBsaXN0IGl0ZW0gYSByZXNlcnZlZCBoZWFkZXIvbWV0YSBsaW5lIChuZXZlciBzaG93biBpbiB0cmVlKT9cbmZ1bmN0aW9uIGlzUmVzZXJ2ZWQocmF3OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgdCA9IHJhdy50cmltKCk7XG4gIHJldHVybiAvXjo6KGdlbGxtYW5NYXRyaXh8dGl0bGV8c3RhcnR8ZW5kfG5vdGUpXFxiL2kudGVzdCh0KTtcbn1cblxuLy8gXHUyNTAwXHUyNTAwIFBhcnNlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUZpbGUoZmlsZVBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUGFyc2VkRmlsZSB7XG4gIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcblxuICAvLyBEZWZhdWx0c1xuICBjb25zdCBub3cgICA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGRlZlNZID0gbm93LmdldEZ1bGxZZWFyKCksIGRlZlNNID0gbm93LmdldE1vbnRoKCkgKyAxO1xuICBjb25zdCBkZWZFWSA9IGRlZlNNICsgNSA+IDEyID8gZGVmU1kgKyAxIDogZGVmU1k7XG4gIGNvbnN0IGRlZkVNID0gKChkZWZTTSArIDQpICUgMTIpICsgMTtcbiAgbGV0IHN0YXJ0UmF3ID0gYCR7U3RyaW5nKGRlZlNNKS5wYWRTdGFydCgyLFwiMFwiKX0tJHtTdHJpbmcoZGVmU1kpLnNsaWNlKDIpfWA7XG4gIGxldCBlbmRSYXcgICA9IGAke1N0cmluZyhkZWZFTSkucGFkU3RhcnQoMixcIjBcIil9LSR7U3RyaW5nKGRlZkVZKS5zbGljZSgyKX1gO1xuICBsZXQgdGl0bGUgICAgPSBmaWxlUGF0aC5zcGxpdChcIi9cIikucG9wKCk/LnJlcGxhY2UoL1xcLm1kJC8sIFwiXCIpID8/IFwiTWF0cml4R2VsbG1hblwiO1xuXG4gIC8vIFx1MjUwMFx1MjUwMCBQYXNzIDE6IHJlYWQgaGVhZGVyIGJsb2NrIGFueXdoZXJlIGluIGZpbGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIGxldCBpbkZyb250ID0gZmFsc2U7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBsID0gbGluZXNbaV0udHJpbSgpO1xuICAgIGlmIChpID09PSAwICYmIGwgPT09IFwiLS0tXCIpIHsgaW5Gcm9udCA9IHRydWU7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGluRnJvbnQpIHsgaWYgKGwgPT09IFwiLS0tXCIpIGluRnJvbnQgPSBmYWxzZTsgY29udGludWU7IH1cbiAgICBpZiAoIWwuc3RhcnRzV2l0aChcIi0gXCIpKSBjb250aW51ZTtcbiAgICBjb25zdCByYXcgPSBsLnNsaWNlKDIpLnRyaW0oKTtcbiAgICBjb25zdCB0bSA9IHJhdy5tYXRjaCgvXjo6dGl0bGU6XFxzKiguKykvaSk7XG4gICAgY29uc3Qgc20gPSByYXcubWF0Y2goL146OnN0YXJ0OlxccyooW1xcZFxcL1xcLV0rKS9pKTtcbiAgICBjb25zdCBlbSA9IHJhdy5tYXRjaCgvXjo6ZW5kOlxccyooW1xcZFxcL1xcLV0rKS9pKTtcbiAgICBpZiAodG0pIHRpdGxlICAgID0gdG1bMV0udHJpbSgpO1xuICAgIGlmIChzbSkgc3RhcnRSYXcgPSBzbVsxXS50cmltKCk7XG4gICAgaWYgKGVtKSBlbmRSYXcgICA9IGVtWzFdLnRyaW0oKTtcbiAgfVxuXG4gIC8vIEJ1aWxkIGNhbGVuZGFyXG4gIGNvbnN0IHNwICAgICAgID0gcGFyc2VNb250aFllYXIoc3RhcnRSYXcpID8/IHsgeWVhcjogZGVmU1ksIG1vbnRoOiBkZWZTTSB9O1xuICBjb25zdCBlcCAgICAgICA9IHBhcnNlTW9udGhZZWFyKGVuZFJhdykgICA/PyB7IHllYXI6IGRlZkVZLCBtb250aDogZGVmRU0gfTtcbiAgY29uc3QgY2FsZW5kYXIgPSBidWlsZENhbGVuZGFyKHNwLnllYXIsIHNwLm1vbnRoLCBlcC55ZWFyLCBlcC5tb250aCk7XG4gIGNvbnN0IHdlZWtLZXlzID0gY2FsZW5kYXIud2Vla3MubWFwKHcgPT4gdy5rZXkpO1xuXG4gIC8vIFx1MjUwMFx1MjUwMCBGaW5kIG1pbiBpbmRlbnQgb2YgcmVhbCB0cmVlIGl0ZW1zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICBsZXQgbWluSW5kZW50ID0gOTk7XG4gIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgIGNvbnN0IHQgPSBsaW5lLnRyaW1TdGFydCgpO1xuICAgIGlmICghdC5zdGFydHNXaXRoKFwiLSBcIikpIGNvbnRpbnVlO1xuICAgIGlmIChpc1Jlc2VydmVkKHQuc2xpY2UoMikudHJpbSgpKSkgY29udGludWU7XG4gICAgbWluSW5kZW50ID0gTWF0aC5taW4obWluSW5kZW50LCBjb3VudEluZGVudChsaW5lKSk7XG4gIH1cbiAgaWYgKG1pbkluZGVudCA9PT0gOTkpIG1pbkluZGVudCA9IDA7XG5cbiAgLy8gXHUyNTAwXHUyNTAwIFBhc3MgMjogYnVpbGQgdHJlZSArIHdlZWtEYXRhIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICBjb25zdCBub2RlczogICAgTm9kZVtdID0gW107XG4gIGNvbnN0IHdlZWtEYXRhOiBSZWNvcmQ8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBXZWVrRW50cnk+PiA9IHt9O1xuICBjb25zdCBzdGFjazogICAgTm9kZVtdID0gW107XG4gIGxldCAgIGxhc3RMZWFmOiBOb2RlIHwgbnVsbCA9IG51bGw7XG4gIGxldCAgIGluRnJvbnQyID0gZmFsc2U7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGxpbmUgICAgPSBsaW5lc1tpXTtcbiAgICBjb25zdCBpbmRlbnQgID0gY291bnRJbmRlbnQobGluZSk7XG4gICAgY29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbVN0YXJ0KCk7XG5cbiAgICBpZiAoaSA9PT0gMCAmJiB0cmltbWVkLnRyaW0oKSA9PT0gXCItLS1cIikgeyBpbkZyb250MiA9IHRydWU7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGluRnJvbnQyKSB7IGlmICh0cmltbWVkLnRyaW0oKSA9PT0gXCItLS1cIikgaW5Gcm9udDIgPSBmYWxzZTsgY29udGludWU7IH1cbiAgICBpZiAoIXRyaW1tZWQuc3RhcnRzV2l0aChcIi0gXCIpKSB7IGlmICh0cmltbWVkLnRyaW0oKSkgbGFzdExlYWYgPSBudWxsOyBjb250aW51ZTsgfVxuXG4gICAgY29uc3QgcmF3ID0gdHJpbW1lZC5zbGljZSgyKS50cmltKCk7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgOjpub3RlIGNoaWxkIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmICgvXjo6bm90ZVxccyo6L2kudGVzdChyYXcpKSB7XG4gICAgICBpZiAoIWxhc3RMZWFmKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG5iID0gcGFyc2VOb3RlKHJhdyk7XG4gICAgICBpZiAoIW5iKSBjb250aW51ZTtcbiAgICAgIC8vIG1hdGNoIHdlZWsga2V5IChleGFjdCBvciBwcmVmaXgpXG4gICAgICBjb25zdCBtYXRjaGVkV2sgPSB3ZWVrS2V5cy5maW5kKHdrID0+IHdrID09PSBuYi53ayB8fCBuYi53ay5zdGFydHNXaXRoKHdrKSB8fCB3ayA9PT0gbmIud2sudHJpbSgpKTtcbiAgICAgIGlmICghbWF0Y2hlZFdrKSBjb250aW51ZTtcbiAgICAgIGlmICghd2Vla0RhdGFbbGFzdExlYWYuaWRdKSB3ZWVrRGF0YVtsYXN0TGVhZi5pZF0gPSB7fTtcbiAgICAgIHdlZWtEYXRhW2xhc3RMZWFmLmlkXVttYXRjaGVkV2tdID0geyBzOiBuYi5zLCBub3RlOiBuYi5ub3RlIH07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgcmVzZXJ2ZWQgaGVhZGVyIGxpbmUgXHUyMDE0IHNraXAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKGlzUmVzZXJ2ZWQocmF3KSkgY29udGludWU7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUmVndWxhciB0cmVlIG5vZGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgbGFiZWwgPSBsYWJlbE9mKHJhdyk7XG4gICAgaWYgKCFsYWJlbCkgY29udGludWU7XG5cbiAgICB3aGlsZSAoc3RhY2subGVuZ3RoICYmIHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdLmluZGVudCA+PSBpbmRlbnQpIHN0YWNrLnBvcCgpO1xuICAgIGNvbnN0IHBhcmVudCAgICAgID0gc3RhY2subGVuZ3RoID8gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV0gOiBudWxsO1xuICAgIGNvbnN0IGlkICAgICAgICAgID0gcGFyZW50ID8gYCR7cGFyZW50LmlkfS8ke2xhYmVsfWAgOiBsYWJlbDtcbiAgICBjb25zdCBsdmwgICAgICAgICA9IE1hdGgubWluKGluZGVudCAtIG1pbkluZGVudCwgMyk7XG4gICAgY29uc3QgY29sb3JTdGF0dXMgPSBpbmxpbmVTdGF0dXMocmF3KTtcblxuICAgIGNvbnN0IG5vZGU6IE5vZGUgPSB7IGlkLCBsYWJlbCwgaW5kZW50LCBsaW5lSWR4OiBpLCBsdmwsIGNvbG9yU3RhdHVzIH07XG4gICAgbm9kZXMucHVzaChub2RlKTtcbiAgICBzdGFjay5wdXNoKG5vZGUpO1xuICAgIGxhc3RMZWFmID0gbm9kZTtcbiAgfVxuXG4gIHJldHVybiB7IGZpbGVQYXRoLCB0aXRsZSwgY2FsZW5kYXIsIG5vZGVzLCB3ZWVrRGF0YSwgbGluZXMsIHN0YXJ0UmF3LCBlbmRSYXcgfTtcbn1cblxuLy8gXHUyNTAwXHUyNTAwIFBhdGNoZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBSZXdyaXRlcyBhIGxlYWYgbm9kZSdzIGlubGluZSA6OnN0YXR1czogYW5kIGl0cyA6Om5vdGU6IGNoaWxkcmVuLlxuZXhwb3J0IGZ1bmN0aW9uIHBhdGNoRmlsZShjb250ZW50OiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmcsIG9wOiBQYXRjaE9wKTogc3RyaW5nIHtcbiAgY29uc3QgeyBub2RlcywgbGluZXMsIGNhbGVuZGFyIH0gPSBwYXJzZUZpbGUoZmlsZVBhdGgsIGNvbnRlbnQpO1xuICBjb25zdCBub2RlID0gbm9kZXMuZmluZChuID0+IG4uaWQgPT09IG9wLm5vZGVJZCk7XG4gIGlmICghbm9kZSkgcmV0dXJuIGNvbnRlbnQ7XG5cbiAgY29uc3QgbGVhZGluZyAgID0gbGluZXNbbm9kZS5saW5lSWR4XS5tYXRjaCgvXltcXHQgXSovKT8uWzBdID8/IFwiXCI7XG4gIGNvbnN0IGNoaWxkTGVhZCA9IGxlYWRpbmcgKyBcIlxcdFwiO1xuXG4gIC8vIFJhbmdlIG9mIDo6bm90ZTogY2hpbGRyZW4gaW1tZWRpYXRlbHkgYWZ0ZXIgdGhpcyBub2RlXG4gIGxldCBub3RlU3RhcnQgPSBub2RlLmxpbmVJZHggKyAxO1xuICBsZXQgbm90ZUVuZCAgID0gbm90ZVN0YXJ0O1xuICB3aGlsZSAobm90ZUVuZCA8IGxpbmVzLmxlbmd0aCkge1xuICAgIGNvbnN0IGwgID0gbGluZXNbbm90ZUVuZF07XG4gICAgY29uc3QgY2kgPSBjb3VudEluZGVudChsKTtcbiAgICBjb25zdCBjdCA9IGwudHJpbVN0YXJ0KCk7XG4gICAgaWYgKCFjdC5zdGFydHNXaXRoKFwiLSBcIikpIHsgaWYgKCFjdC50cmltKCkpIHsgbm90ZUVuZCsrOyBjb250aW51ZTsgfSBicmVhazsgfVxuICAgIGlmIChjaSA8PSBub2RlLmluZGVudCkgYnJlYWs7XG4gICAgaWYgKC9eOjpub3RlXFxzKjovaS50ZXN0KGN0LnNsaWNlKDIpLnRyaW0oKSkpIHsgbm90ZUVuZCsrOyBjb250aW51ZTsgfVxuICAgIGJyZWFrO1xuICB9XG5cbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgaSA9IDA7XG5cbiAgd2hpbGUgKGkgPCBsaW5lcy5sZW5ndGgpIHtcbiAgICBpZiAoaSA9PT0gbm9kZS5saW5lSWR4KSB7XG4gICAgICAvLyBSZXdyaXRlIG5vZGUgbGluZTogc3RyaXAgb2xkIDo6c3RhdHVzLCBhcHBlbmQgbmV3IG9uZVxuICAgICAgY29uc3QgYmFyZSAgICAgID0gbGluZXNbaV0ucmVwbGFjZSgvXFxzKjo6c3RhdHVzOlxccypcXFMrL2csIFwiXCIpLnRyaW1FbmQoKTtcbiAgICAgIGNvbnN0IHN0YXR1c1RhZyA9IG9wLmNvbG9yU3RhdHVzID4gMCA/IGAgOjpzdGF0dXM6ICR7U1RBVFVTX05BTUVTW29wLmNvbG9yU3RhdHVzXX1gIDogXCJcIjtcbiAgICAgIHJlc3VsdC5wdXNoKGAke2JhcmV9JHtzdGF0dXNUYWd9YCk7XG4gICAgICBpKys7XG4gICAgICAvLyBTa2lwIG9sZCA6Om5vdGU6IGNoaWxkcmVuXG4gICAgICB3aGlsZSAoaSA8IG5vdGVFbmQpIGkrKztcbiAgICAgIC8vIFdyaXRlIG5ldyA6Om5vdGU6IGxpbmVzXG4gICAgICBmb3IgKGNvbnN0IHdrIG9mIGNhbGVuZGFyLndlZWtzLm1hcCh3ID0+IHcua2V5KSkge1xuICAgICAgICBjb25zdCBlbnRyeSA9IG9wLndlZWtEYXRhW3drXTtcbiAgICAgICAgaWYgKCFlbnRyeSB8fCAoIWVudHJ5LnMgJiYgIWVudHJ5Lm5vdGUpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3Qgc1BhcnQgPSBlbnRyeS5zID4gMCA/IGAgc3RhdHVzOiAke1NUQVRVU19OQU1FU1tlbnRyeS5zXX0sYCA6IFwiXCI7XG4gICAgICAgIGNvbnN0IGNQYXJ0ID0gZW50cnkubm90ZSA/IGAgY29tbWVudDogJHtlbnRyeS5ub3RlfWAgOiBcIlwiO1xuICAgICAgICByZXN1bHQucHVzaChgJHtjaGlsZExlYWR9LSA6Om5vdGU6IHske3NQYXJ0fSBkYXRlOiAke3drfSwke2NQYXJ0fSB9YCk7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2gobGluZXNbaV0pO1xuICAgIGkrKztcbiAgfVxuICByZXR1cm4gcmVzdWx0LmpvaW4oXCJcXG5cIik7XG59XG5cbi8vIFx1MjUwMFx1MjUwMCBQYXRjaCBkYXRlcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbmV4cG9ydCBmdW5jdGlvbiBwYXRjaERhdGVzKGNvbnRlbnQ6IHN0cmluZywgc3RhcnRSYXc6IHN0cmluZywgZW5kUmF3OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XG4gIGxldCBwcyA9IGZhbHNlLCBwZSA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCB0ID0gbGluZXNbaV0udHJpbVN0YXJ0KCk7XG4gICAgaWYgKCF0LnN0YXJ0c1dpdGgoXCItIFwiKSkgY29udGludWU7XG4gICAgY29uc3QgcmF3ID0gdC5zbGljZSgyKS50cmltKCk7XG4gICAgaWYgKCFwcyAmJiAvXjo6c3RhcnQ6L2kudGVzdChyYXcpKSB7XG4gICAgICBsaW5lc1tpXSA9IGxpbmVzW2ldLnJlcGxhY2UoLzo6c3RhcnQ6XFxzKltcXGRcXC9cXC1dKy9pLCBgOjpzdGFydDogJHtzdGFydFJhd31gKTtcbiAgICAgIHBzID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCFwZSAmJiAvXjo6ZW5kOi9pLnRlc3QocmF3KSkge1xuICAgICAgbGluZXNbaV0gPSBsaW5lc1tpXS5yZXBsYWNlKC86OmVuZDpcXHMqW1xcZFxcL1xcLV0rL2ksIGA6OmVuZDogJHtlbmRSYXd9YCk7XG4gICAgICBwZSA9IHRydWU7XG4gICAgfVxuICAgIGlmIChwcyAmJiBwZSkgYnJlYWs7XG4gIH1cblxuICBpZiAoIXBzIHx8ICFwZSkge1xuICAgIC8vIEluc2VydCBoZWFkZXIgYmxvY2sgYXQgdG9wIChhZnRlciBmcm9udG1hdHRlciBpZiBwcmVzZW50KVxuICAgIGxldCBhdCA9IDA7XG4gICAgbGV0IGluRiA9IGZhbHNlO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpID09PSAwICYmIGxpbmVzW2ldLnRyaW0oKSA9PT0gXCItLS1cIikgeyBpbkYgPSB0cnVlOyBjb250aW51ZTsgfVxuICAgICAgaWYgKGluRiAmJiBsaW5lc1tpXS50cmltKCkgPT09IFwiLS0tXCIpIHsgYXQgPSBpICsgMTsgYnJlYWs7IH1cbiAgICAgIGlmICghaW5GKSB7IGF0ID0gaTsgYnJlYWs7IH1cbiAgICB9XG4gICAgbGluZXMuc3BsaWNlKGF0LCAwLFxuICAgICAgXCItIDo6Z2VsbG1hbk1hdHJpeFwiLFxuICAgICAgXCItIDo6dGl0bGU6IE1hdHJpeEdlbGxtYW5cIixcbiAgICAgIGAtIDo6c3RhcnQ6ICR7c3RhcnRSYXd9YCxcbiAgICAgIGAtIDo6ZW5kOiAke2VuZFJhd31gLFxuICAgICAgXCJcIlxuICAgICk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiZXhwb3J0IGNvbnN0IENTUyA9IGBcbi8qIFx1MjUwMFx1MjUwMFx1MjUwMCBSb290IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuLm1nLXdyYXAge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGhlaWdodDogMTAwJTsgd2lkdGg6IDEwMCU7XG4gIGJhY2tncm91bmQ6ICNmMWY1Zjk7XG4gIGZvbnQtZmFtaWx5OiAnU2Vnb2UgVUknLCBzYW5zLXNlcmlmO1xuICBmb250LXNpemU6IDEycHg7XG4gIG92ZXJmbG93OiBoaWRkZW47XG59XG5cbi8qIFx1MjUwMFx1MjUwMFx1MjUwMCBUb29sYmFyICAodG9wIGJhciwgbmV2ZXIgbW92ZXMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuLm1nLXRvb2xiYXIge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIHRvcDogMDsgbGVmdDogMDsgcmlnaHQ6IDA7XG4gIGhlaWdodDogNDZweDtcbiAgYmFja2dyb3VuZDogIzBENkUzRjsgY29sb3I6IHdoaXRlO1xuICBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyO1xuICBwYWRkaW5nOiAwIDE0cHg7IGdhcDogMTRweDtcbiAgei1pbmRleDogOTk5O1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICBvdmVyZmxvdzogaGlkZGVuO1xufVxuLm1nLXRvb2xiYXItdGl0bGUgeyBmb250LXNpemU6IDEzcHg7IGZvbnQtd2VpZ2h0OiA3MDA7IGxldHRlci1zcGFjaW5nOiAuNHB4OyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG4ubWctdG9vbGJhci1zdWIgICB7IGZvbnQtc2l6ZTogMTBweDsgb3BhY2l0eTogLjc1OyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG4ubWctdG9vbGJhci1yaWdodCB7IG1hcmdpbi1sZWZ0OiBhdXRvOyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDhweDsgZmxleC1zaHJpbms6IDA7IH1cbi5tZy1sZWdlbmQgICAgICAgIHsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiAzcHg7IGZvbnQtc2l6ZTogMTBweDsgY29sb3I6IHJnYmEoMjU1LDI1NSwyNTUsLjg1KTsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuLm1nLWxlZ2VuZC1kb3QgICAgeyB3aWR0aDogOHB4OyBoZWlnaHQ6IDhweDsgYm9yZGVyLXJhZGl1czogNTAlOyBmbGV4LXNocmluazogMDsgfVxuLm1nLWRhdGUtd3JhcCB7XG4gIGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogNHB4O1xuICBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LC4xMik7IGJvcmRlci1yYWRpdXM6IDVweDtcbiAgcGFkZGluZzogMnB4IDhweDsgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbn1cbi5tZy1kYXRlLXdyYXAgbGFiZWwgeyBmb250LXNpemU6IDEwcHg7IG9wYWNpdHk6IC44OyB9XG4ubWctZGF0ZS1pbnB1dCB7XG4gIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyBib3JkZXI6IG5vbmU7XG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LC40KTtcbiAgY29sb3I6IHdoaXRlOyBmb250LXNpemU6IDExcHg7IHdpZHRoOiA2MHB4O1xuICBvdXRsaW5lOiBub25lOyB0ZXh0LWFsaWduOiBjZW50ZXI7IHBhZGRpbmc6IDFweCAycHg7XG59XG4ubWctZGF0ZS1pbnB1dDo6cGxhY2Vob2xkZXIgeyBjb2xvcjogcmdiYSgyNTUsMjU1LDI1NSwuMzUpOyB9XG4ubWctYnRuLWFwcGx5IHtcbiAgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwuMik7IGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsLjM1KTtcbiAgY29sb3I6IHdoaXRlOyBmb250LXNpemU6IDEwcHg7IHBhZGRpbmc6IDJweCA4cHg7IGJvcmRlci1yYWRpdXM6IDRweDsgY3Vyc29yOiBwb2ludGVyO1xufVxuLm1nLWJ0bi1hcHBseTpob3ZlciB7IGJhY2tncm91bmQ6IHJnYmEoMjU1LDI1NSwyNTUsLjMpOyB9XG4ubWctYnRuLW9wZW4ge1xuICBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwyNTUsMjU1LC4xMik7IGJvcmRlcjogMXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsLjI1KTtcbiAgY29sb3I6IHdoaXRlOyBmb250LXNpemU6IDEwcHg7IHBhZGRpbmc6IDNweCA5cHg7IGJvcmRlci1yYWRpdXM6IDRweDtcbiAgY3Vyc29yOiBwb2ludGVyOyB3aGl0ZS1zcGFjZTogbm93cmFwO1xufVxuLm1nLWJ0bi1vcGVuOmhvdmVyIHsgYmFja2dyb3VuZDogcmdiYSgyNTUsMjU1LDI1NSwuMjIpOyB9XG5cbi8qIFx1MjUwMFx1MjUwMFx1MjUwMCBDb3JuZXIgICh0b3AtbGVmdCwgZnJvemVuIG9uIGJvdGggYXhlcykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwICovXG4ubWctY29ybmVyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDQ2cHg7IGxlZnQ6IDA7XG4gIHdpZHRoOiAzMDBweDsgaGVpZ2h0OiA2MHB4O1xuICB6LWluZGV4OiAyMDA7XG4gIG92ZXJmbG93OiBoaWRkZW47XG4gIGJhY2tncm91bmQ6ICMwZjE3MmE7XG4gIGJvcmRlci1yaWdodDogMnB4IHNvbGlkICMzMzQxNTU7XG4gIGJvcmRlci1ib3R0b206IDJweCBzb2xpZCAjMzM0MTU1O1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xufVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgQ29sdW1uIGhlYWRlciAgKHRvcC1yaWdodCwgc2Nyb2xscyBYIHdpdGggYm9keSkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwICovXG4ubWctY29sLWhkciB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiA0NnB4OyBsZWZ0OiAzMDBweDsgcmlnaHQ6IDA7XG4gIGhlaWdodDogNjBweDtcbiAgei1pbmRleDogMTAwO1xuICBvdmVyZmxvdzogaGlkZGVuOyAgIC8qIHNjcm9sbCBkcml2ZW4gYnkgYm9keSB2aWEgSlMgKi9cbn1cbi5tZy1jb2wtaGRyIHRhYmxlIHsgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTsgdGFibGUtbGF5b3V0OiBmaXhlZDsgfVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgUm93IGhlYWRlciAgKGJvdHRvbS1sZWZ0LCBzY3JvbGxzIFkgd2l0aCBib2R5KSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDAgKi9cbi5tZy1yb3ctaGRyIHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDEwNnB4OyBsZWZ0OiAwO1xuICB3aWR0aDogMzAwcHg7IGJvdHRvbTogMDtcbiAgei1pbmRleDogMTAwO1xuICBvdmVyZmxvdzogaGlkZGVuOyAgIC8qIHNjcm9sbCBkcml2ZW4gYnkgYm9keSB2aWEgSlMgKi9cbiAgYm9yZGVyLXJpZ2h0OiAycHggc29saWQgI2NiZDVlMTtcbn1cbi5tZy1yb3ctaGRyIHRhYmxlIHsgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTsgdGFibGUtbGF5b3V0OiBmaXhlZDsgd2lkdGg6IDMwMHB4OyB9XG5cbi8qIFx1MjUwMFx1MjUwMFx1MjUwMCBCb2R5ICAoYm90dG9tLXJpZ2h0LCBzY3JvbGxzIGJvdGggXHUyMDE0IGRyaXZlcyBldmVyeXRoaW5nKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDAgKi9cbi5tZy1ib2R5IHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDEwNnB4OyBsZWZ0OiAzMDBweDtcbiAgcmlnaHQ6IDA7IGJvdHRvbTogMDtcbiAgei1pbmRleDogMTA7XG4gIG92ZXJmbG93OiBhdXRvO1xufVxuLm1nLWJvZHkgdGFibGUgeyBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyB0YWJsZS1sYXlvdXQ6IGZpeGVkOyB9XG5cbi8qIFx1MjUwMFx1MjUwMFx1MjUwMCBTaGFyZWQgdGFibGUgc3R5bGVzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuXG4vKiBNb250aCBoZWFkZXIgY2VsbHMgKi9cbi5tZy10aC1tb250aCB7XG4gIGhlaWdodDogMzRweDsgYmFja2dyb3VuZDogIzFlMjkzYjsgY29sb3I6ICM5NGEzYjg7XG4gIGZvbnQtc2l6ZTogMTBweDsgZm9udC13ZWlnaHQ6IDYwMDsgbGV0dGVyLXNwYWNpbmc6IC43cHg7XG4gIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IHRleHQtYWxpZ246IGNlbnRlcjtcbiAgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgIzMzNDE1NTsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzMzQxNTU7XG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7XG59XG5cbi8qIFdlZWsgaGVhZGVyIGNlbGxzICovXG4ubWctdGgtd2VlayB7XG4gIGhlaWdodDogMjZweDsgd2lkdGg6IDQ4cHg7IG1pbi13aWR0aDogNDhweDtcbiAgYmFja2dyb3VuZDogIzBmMTcyYTsgY29sb3I6ICM2NDc0OGI7XG4gIGZvbnQtc2l6ZTogMTBweDsgZm9udC13ZWlnaHQ6IDUwMDsgdGV4dC1hbGlnbjogY2VudGVyO1xuICBib3JkZXItcmlnaHQ6IDFweCBzb2xpZCAjMWUyOTNiOyBib3JkZXItYm90dG9tOiAycHggc29saWQgIzMzNDE1NTtcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcDtcbn1cbi5tZy10aC13ZWVrLm1nLWN1cnJlbnQgeyBiYWNrZ3JvdW5kOiAjMWQ0ZWQ4OyBjb2xvcjogd2hpdGU7IGZvbnQtd2VpZ2h0OiA3MDA7IH1cbi5tZy1tZW5kIHsgYm9yZGVyLXJpZ2h0OiAycHggc29saWQgIzY0NzQ4YiAhaW1wb3J0YW50OyB9XG5cbi8qIENvcm5lciBoZWFkZXIgY2VsbCAqL1xuLm1nLXRoLWNvcm5lciB7XG4gIHdpZHRoOiAzMDBweDsgaGVpZ2h0OiA2MHB4O1xuICBiYWNrZ3JvdW5kOiAjMGYxNzJhOyBjb2xvcjogIzQ3NTU2OTtcbiAgZm9udC1zaXplOiAxMHB4OyB0ZXh0LWFsaWduOiBsZWZ0O1xuICBwYWRkaW5nLWxlZnQ6IDEwcHg7IHZlcnRpY2FsLWFsaWduOiBib3R0b207IHBhZGRpbmctYm90dG9tOiA0cHg7XG59XG5cbi8qIFx1MjUwMFx1MjUwMFx1MjUwMCBSb3ctaGVhZGVyIGxhYmVsIGNlbGxzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuLm1nLXJvdy1oZHIgdGQge1xuICB3aWR0aDogMzAwcHg7IG1pbi13aWR0aDogMzAwcHg7IHBhZGRpbmc6IDA7XG4gIHdoaXRlLXNwYWNlOiBub3dyYXA7IG92ZXJmbG93OiBoaWRkZW47XG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZTJlOGYwO1xuICBiYWNrZ3JvdW5kOiB3aGl0ZTtcbn1cbi5tZy1sYWJlbC1pbm5lciB7XG4gIGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGhlaWdodDogMTAwJTtcbiAgcGFkZGluZy1yaWdodDogOHB4OyBnYXA6IDNweDtcbn1cbi5tZy1sYWJlbC10ZXh0IHtcbiAgb3ZlcmZsb3c6IGhpZGRlbjsgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7IHdoaXRlLXNwYWNlOiBub3dyYXA7XG4gIGZsZXg6IDE7IG1pbi13aWR0aDogMDtcbn1cbi5tZy10b2dnbGUge1xuICBkaXNwbGF5OiBpbmxpbmUtZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIHdpZHRoOiAxNnB4OyBoZWlnaHQ6IDE2cHg7IGZsZXgtc2hyaW5rOiAwO1xuICBjdXJzb3I6IHBvaW50ZXI7IGJvcmRlci1yYWRpdXM6IDNweDsgZm9udC1zaXplOiA5cHg7XG4gIGJvcmRlcjogbm9uZTsgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7IGNvbG9yOiAjOTRhM2I4OyB1c2VyLXNlbGVjdDogbm9uZTtcbn1cbi5tZy10b2dnbGU6aG92ZXIgeyBiYWNrZ3JvdW5kOiByZ2JhKDAsMCwwLC4wOCk7IH1cbi5tZy1sZWFmLXNwIHsgd2lkdGg6IDE2cHg7IGZsZXgtc2hyaW5rOiAwOyBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IH1cblxuLyogUm93IGxldmVscyBcdTIwMTQgYXBwbGllZCB0byB0ciAqL1xuLm1nLXJvdy1oZHIgdHIubWctbHZsMCwgLm1nLWJvZHkgdHIubWctbHZsMCB7IGhlaWdodDogMzZweDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMSwgLm1nLWJvZHkgdHIubWctbHZsMSB7IGhlaWdodDogMzJweDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMiwgLm1nLWJvZHkgdHIubWctbHZsMiB7IGhlaWdodDogMzBweDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMywgLm1nLWJvZHkgdHIubWctbHZsMyB7IGhlaWdodDogMjlweDsgfVxuXG4vKiBMYWJlbCBiZyBieSBsZXZlbCAqL1xuLm1nLXJvdy1oZHIgdHIubWctbHZsMCB0ZCB7IGJhY2tncm91bmQ6ICMwZjE3MmEgIWltcG9ydGFudDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMxZTI5M2I7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDAgLm1nLWxhYmVsLWlubmVyIHsgcGFkZGluZy1sZWZ0OiAxMHB4OyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwwIC5tZy1sYWJlbC10ZXh0ICB7IGNvbG9yOiAjZjFmNWY5OyBmb250LXdlaWdodDogNzAwOyBmb250LXNpemU6IDEzcHg7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDAgLm1nLXRvZ2dsZSAgICAgIHsgY29sb3I6IHJnYmEoMjU1LDI1NSwyNTUsLjUpOyB9XG5cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDEgdGQgeyBiYWNrZ3JvdW5kOiAjZTJlOGYwOyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwxIC5tZy1sYWJlbC1pbm5lciB7IHBhZGRpbmctbGVmdDogMThweDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMSAubWctbGFiZWwtdGV4dCAgeyBjb2xvcjogIzMzNDE1NTsgZm9udC13ZWlnaHQ6IDYwMDsgZm9udC1zaXplOiAxMXB4OyB9XG5cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDIgdGQgeyBiYWNrZ3JvdW5kOiAjZjhmYWZjOyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwyIC5tZy1sYWJlbC1pbm5lciB7IHBhZGRpbmctbGVmdDogMzJweDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMiAubWctbGFiZWwtdGV4dCAgeyBjb2xvcjogIzQ3NTU2OTsgZm9udC13ZWlnaHQ6IDUwMDsgZm9udC1zaXplOiAxMXB4OyB9XG5cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgdGQge1xuICBiYWNrZ3JvdW5kOiAjZmZmOyBjdXJzb3I6IHBvaW50ZXI7IHRyYW5zaXRpb246IGZpbHRlciAuMTJzOyBwb3NpdGlvbjogcmVsYXRpdmU7XG59XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkOmhvdmVyICAgICAgIHsgZmlsdGVyOiBicmlnaHRuZXNzKC45NSk7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgLm1nLWxhYmVsLWlubmVyIHsgcGFkZGluZy1sZWZ0OiA0OHB4OyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIC5tZy1sYWJlbC10ZXh0ICB7IGNvbG9yOiAjMzc0MTUxOyBmb250LXdlaWdodDogNDAwOyBmb250LXNpemU6IDExcHg7IH1cblxuLyogTGVhZiBsYWJlbCBzdGF0dXMgY29sb3VycyAqL1xuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZFtkYXRhLWxzPVwiMVwiXSB7IGJhY2tncm91bmQ6ICNlMmU4ZjAgIWltcG9ydGFudDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZFtkYXRhLWxzPVwiMVwiXSAubWctbGFiZWwtdGV4dCB7IGNvbG9yOiAjNDc1NTY5OyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkW2RhdGEtbHM9XCIyXCJdIHsgYmFja2dyb3VuZDogI2ZlZjljMyAhaW1wb3J0YW50OyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkW2RhdGEtbHM9XCIyXCJdIC5tZy1sYWJlbC10ZXh0IHsgY29sb3I6ICM3MTNmMTI7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgdGRbZGF0YS1scz1cIjNcIl0geyBiYWNrZ3JvdW5kOiAjZmVkN2FhICFpbXBvcnRhbnQ7IH1cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgdGRbZGF0YS1scz1cIjNcIl0gLm1nLWxhYmVsLXRleHQgeyBjb2xvcjogIzdjMmQxMjsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZFtkYXRhLWxzPVwiNFwiXSB7IGJhY2tncm91bmQ6ICNmZWNhY2EgIWltcG9ydGFudDsgfVxuLm1nLXJvdy1oZHIgdHIubWctbHZsMyB0ZFtkYXRhLWxzPVwiNFwiXSAubWctbGFiZWwtdGV4dCB7IGNvbG9yOiAjN2YxZDFkOyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkW2RhdGEtbHM9XCI1XCJdIHsgYmFja2dyb3VuZDogI2JiZjdkMCAhaW1wb3J0YW50OyB9XG4ubWctcm93LWhkciB0ci5tZy1sdmwzIHRkW2RhdGEtbHM9XCI1XCJdIC5tZy1sYWJlbC10ZXh0IHsgY29sb3I6ICMxNDUzMmQ7IH1cblxuLyogTm90ZSBkb3QgKi9cbi5tZy1yb3ctaGRyIHRyLm1nLWx2bDMgdGRbZGF0YS1sbm90ZT1cIjFcIl06OmFmdGVyIHtcbiAgY29udGVudDogJyc7IHBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiA1cHg7IHJpZ2h0OiA2cHg7XG4gIHdpZHRoOiA2cHg7IGhlaWdodDogNnB4OyBib3JkZXItcmFkaXVzOiA1MCU7XG4gIGJhY2tncm91bmQ6ICM2MzY2ZjE7IHBvaW50ZXItZXZlbnRzOiBub25lO1xufVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgQm9keSBkYXRhIGNlbGxzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMCAqL1xuLm1nLWJvZHkgdGQubWctY2VsbCB7XG4gIHdpZHRoOiA0OHB4OyBtaW4td2lkdGg6IDQ4cHg7IHRleHQtYWxpZ246IGNlbnRlcjsgY3Vyc29yOiBwb2ludGVyO1xuICBib3JkZXItcmlnaHQ6IDFweCBzb2xpZCAjZTJlOGYwOyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2UyZThmMDtcbiAgdmVydGljYWwtYWxpZ246IG1pZGRsZTsgZm9udC1zaXplOiAxMXB4OyBwb3NpdGlvbjogcmVsYXRpdmU7XG59XG4ubWctYm9keSB0ZC5tZy1jZWxsOmhvdmVyIHsgZmlsdGVyOiBicmlnaHRuZXNzKC45KTsgfVxuXG4vKiBCb2R5IHJvdyBiZyBieSBsZXZlbCAqL1xuLm1nLWJvZHkgdHIubWctbHZsMCB0ZC5tZy1jZWxsIHsgYmFja2dyb3VuZDogIzFlMjkzYjsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICMzMzQxNTU7IH1cbi5tZy1ib2R5IHRyLm1nLWx2bDEgdGQubWctY2VsbCB7IGJhY2tncm91bmQ6ICNmMWY1Zjk7IH1cbi5tZy1ib2R5IHRyLm1nLWx2bDIgdGQubWctY2VsbCB7IGJhY2tncm91bmQ6ICNmYWZhZmE7IH1cbi5tZy1ib2R5IHRyLm1nLWx2bDMgdGQubWctY2VsbCB7IGJhY2tncm91bmQ6ICNmZmY7IH1cblxuLm1nLWJvZHkgdGQubWctY2VsbFtkYXRhLXM9XCIxXCJdIHsgYmFja2dyb3VuZDogI2UyZThmMCAhaW1wb3J0YW50OyBib3JkZXItbGVmdDogM3B4IHNvbGlkICM5NGEzYjg7IGNvbG9yOiAjNDc1NTY5OyB9XG4ubWctYm9keSB0ZC5tZy1jZWxsW2RhdGEtcz1cIjJcIl0geyBiYWNrZ3JvdW5kOiAjZmVmOWMzICFpbXBvcnRhbnQ7IGJvcmRlci1sZWZ0OiAzcHggc29saWQgI2VhYjMwODsgY29sb3I6ICM4NTRkMGU7IH1cbi5tZy1ib2R5IHRkLm1nLWNlbGxbZGF0YS1zPVwiM1wiXSB7IGJhY2tncm91bmQ6ICNmZWQ3YWEgIWltcG9ydGFudDsgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCAjZjk3MzE2OyBjb2xvcjogIzlhMzQxMjsgfVxuLm1nLWJvZHkgdGQubWctY2VsbFtkYXRhLXM9XCI0XCJdIHsgYmFja2dyb3VuZDogI2ZlY2FjYSAhaW1wb3J0YW50OyBib3JkZXItbGVmdDogM3B4IHNvbGlkICNlZjQ0NDQ7IGNvbG9yOiAjOTkxYjFiOyB9XG4ubWctYm9keSB0ZC5tZy1jZWxsW2RhdGEtcz1cIjVcIl0geyBiYWNrZ3JvdW5kOiAjYmJmN2QwICFpbXBvcnRhbnQ7IGJvcmRlci1sZWZ0OiAzcHggc29saWQgIzIyYzU1ZTsgY29sb3I6ICMxNDUzMmQ7IH1cbi5tZy1ib2R5IHRkLm1nLWNlbGxbZGF0YS1oYXNub3RlPVwiMVwiXTo6YWZ0ZXIge1xuICBjb250ZW50OiAnJzsgcG9zaXRpb246IGFic29sdXRlOyB0b3A6IDNweDsgcmlnaHQ6IDNweDtcbiAgd2lkdGg6IDVweDsgaGVpZ2h0OiA1cHg7IGJvcmRlci1yYWRpdXM6IDUwJTtcbiAgYmFja2dyb3VuZDogIzYzNjZmMTsgcG9pbnRlci1ldmVudHM6IG5vbmU7XG59XG5cbi8qIFx1MjUwMFx1MjUwMFx1MjUwMCBIaWRkZW4gcm93cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDAgKi9cbi5tZy1yb3ctaGRyIHRyLm1nLWhpZGRlbixcbi5tZy1ib2R5ICAgICB0ci5tZy1oaWRkZW4geyBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7IH1cblxuLyogXHUyNTAwXHUyNTAwXHUyNTAwIE5vdGUgcG9wdXAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwICovXG4ubWctcG9wdXAge1xuICBwb3NpdGlvbjogZml4ZWQ7IHotaW5kZXg6IDk5OTk7XG4gIGJhY2tncm91bmQ6IHdoaXRlOyBib3JkZXI6IDFweCBzb2xpZCAjZTJlOGYwOyBib3JkZXItcmFkaXVzOiAxMHB4O1xuICBib3gtc2hhZG93OiAwIDhweCAzMnB4IHJnYmEoMCwwLDAsLjIpOyBwYWRkaW5nOiAxNHB4OyB3aWR0aDogMzAwcHg7XG4gIGRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IGdhcDogOHB4O1xufVxuLm1nLXBvcHVwLXdlZWsgIHsgZm9udC1zaXplOiAxMXB4OyBmb250LXdlaWdodDogNzAwOyBjb2xvcjogIzBENkUzRjsgfVxuLm1nLXBvcHVwLXJvdyAgIHsgZm9udC1zaXplOiAxMHB4OyBjb2xvcjogIzY0NzQ4Yjsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgb3ZlcmZsb3c6IGhpZGRlbjsgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7IH1cbi5tZy1wb3B1cC1zdGF0cyB7IGRpc3BsYXk6IGZsZXg7IGdhcDogNHB4OyBmbGV4LXdyYXA6IHdyYXA7IH1cbi5tZy1wb3B1cC1zYnRuICB7XG4gIGZvbnQtc2l6ZTogMTBweDsgcGFkZGluZzogMnB4IDdweDsgYm9yZGVyLXJhZGl1czogMjBweDtcbiAgYm9yZGVyOiAxcHggc29saWQgI2UyZThmMDsgY3Vyc29yOiBwb2ludGVyOyBiYWNrZ3JvdW5kOiB3aGl0ZTsgY29sb3I6ICM0NzU1Njk7XG59XG4ubWctcG9wdXAtc2J0bjpob3ZlciB7IGZpbHRlcjogYnJpZ2h0bmVzcyguOSk7IH1cbi5tZy1wb3B1cC10YSB7XG4gIHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDcwcHg7IGJvcmRlcjogMXB4IHNvbGlkICNjYmQ1ZTE7IGJvcmRlci1yYWRpdXM6IDZweDtcbiAgcGFkZGluZzogNnB4IDhweDsgZm9udC1zaXplOiAxMXB4OyBmb250LWZhbWlseTogaW5oZXJpdDsgcmVzaXplOiB2ZXJ0aWNhbDsgb3V0bGluZTogbm9uZTtcbn1cbi5tZy1wb3B1cC10YTpmb2N1cyB7IGJvcmRlci1jb2xvcjogIzBENkUzRjsgfVxuLm1nLXBvcHVwLWFjdGlvbnMgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDZweDsganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDsgfVxuLm1nLWJ0bi1jYW5jZWwgeyBiYWNrZ3JvdW5kOiAjZjFmNWY5OyBjb2xvcjogIzQ3NTU2OTsgYm9yZGVyOiBub25lOyBwYWRkaW5nOiA0cHggMTJweDsgYm9yZGVyLXJhZGl1czogNXB4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMTFweDsgfVxuLm1nLWJ0bi1zYXZlICAgeyBiYWNrZ3JvdW5kOiAjMEQ2RTNGOyBjb2xvcjogd2hpdGU7ICAgYm9yZGVyOiBub25lOyBwYWRkaW5nOiA0cHggMTJweDsgYm9yZGVyLXJhZGl1czogNXB4OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtc2l6ZTogMTFweDsgfVxuXG4vKiBcdTI1MDBcdTI1MDBcdTI1MDAgRW1wdHkgc3RhdGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwICovXG4ubWctZW1wdHkge1xuICBwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMTA2cHg7IGxlZnQ6IDA7IHJpZ2h0OiAwOyBib3R0b206IDA7XG4gIHBhZGRpbmc6IDQ4cHggMzJweDsgY29sb3I6ICM2NDc0OGI7IGZvbnQtc2l6ZTogMTNweDsgbGluZS1oZWlnaHQ6IDEuODtcbn1cbi5tZy1lbXB0eSBiICAgIHsgY29sb3I6ICMwZjE3MmE7IH1cbi5tZy1lbXB0eSBjb2RlIHsgYmFja2dyb3VuZDogI2YxZjVmOTsgcGFkZGluZzogMXB4IDVweDsgYm9yZGVyLXJhZGl1czogM3B4OyBmb250LXNpemU6IDEycHg7IH1cbmA7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQUF5RTs7O0FDQXpFLElBQU0sY0FBYztBQUFBLEVBQUM7QUFBQSxFQUFNO0FBQUEsRUFBTTtBQUFBLEVBQU07QUFBQSxFQUFNO0FBQUEsRUFBTTtBQUFBLEVBQzlCO0FBQUEsRUFBTTtBQUFBLEVBQU07QUFBQSxFQUFN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SUFDN0I7QUFDQSxVQUFNO0FBQUEsTUFBTztBQUFBLE1BQUk7QUFBQSxNQUNmO0FBQUEsTUFDQTtBQUFBLE1BQ0EsY0FBYyxRQUFRO0FBQUEsTUFDdEIsWUFBWSxNQUFNO0FBQUEsTUFDbEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNBLFNBQU8sTUFBTSxLQUFLLElBQUk7QUFDeEI7OztBQ3ZRTyxJQUFNLE1BQU07QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QUhJbkIsSUFBTSxZQUFnQjtBQUN0QixJQUFNLGFBQWdCLENBQUMsSUFBSSxRQUFLLFVBQUssS0FBSyxVQUFLLFFBQUc7QUFDbEQsSUFBTSxnQkFBZ0IsQ0FBQyxXQUFVLFdBQVUsV0FBVSxXQUFVLFdBQVUsU0FBUztBQUNsRixJQUFNLGdCQUFnQixDQUFDLFVBQUksV0FBVSxlQUFjLFdBQVUsV0FBVSxNQUFNO0FBRzdFLFNBQVMsS0FBSyxVQUFrQixRQUFnQjtBQUFFLFNBQU8sR0FBRyxRQUFRLEtBQUssTUFBTTtBQUFJO0FBR25GLElBQXFCLHNCQUFyQixjQUFpRCx1QkFBTztBQUFBLEVBQXhEO0FBQUE7QUFFRTtBQUFBLG9CQUF5RTtBQUFBLE1BQ3ZFLFdBQVcsQ0FBQztBQUFBLE1BQUcsY0FBYztBQUFBLElBQy9CO0FBQ0Esa0JBQTRCO0FBQzVCLFNBQVEsV0FBVztBQWlFbkIscUJBQVEsMEJBQVMsT0FBTyxPQUFnQjtBQUN0QyxVQUFJLENBQUMsS0FBSztBQUFRO0FBQ2xCLFlBQU0sT0FBTyxLQUFLLElBQUksTUFBTSxzQkFBc0IsS0FBSyxPQUFPLFFBQVE7QUFDdEUsVUFBSSxFQUFFLGdCQUFnQjtBQUFRO0FBQzlCLFdBQUssV0FBVztBQUNoQixVQUFJO0FBQ0YsY0FBTSxVQUFVLE1BQU0sS0FBSyxJQUFJLE1BQU0sS0FBSyxJQUFJO0FBQzlDLGNBQU0sVUFBVSxVQUFVLFNBQVMsS0FBSyxPQUFPLFVBQVUsRUFBRTtBQUMzRCxjQUFNLEtBQUssSUFBSSxNQUFNLE9BQU8sTUFBTSxPQUFPO0FBQ3pDLGFBQUssU0FBUyxVQUFVLEtBQUssT0FBTyxVQUFVLE9BQU87QUFBQSxNQUN2RCxVQUFFO0FBQVUsbUJBQVcsTUFBTTtBQUFFLGVBQUssV0FBVztBQUFBLFFBQU8sR0FBRyxHQUFHO0FBQUEsTUFBRztBQUFBLElBQ2pFLEdBQUcsS0FBSyxJQUFJO0FBRVosMEJBQWEsMEJBQVMsT0FBTyxVQUFrQixXQUFtQjtBQUNoRSxVQUFJLENBQUMsS0FBSztBQUFRO0FBQ2xCLFlBQU0sT0FBTyxLQUFLLElBQUksTUFBTSxzQkFBc0IsS0FBSyxPQUFPLFFBQVE7QUFDdEUsVUFBSSxFQUFFLGdCQUFnQjtBQUFRO0FBQzlCLFdBQUssV0FBVztBQUNoQixVQUFJO0FBQ0YsY0FBTSxVQUFVLE1BQU0sS0FBSyxJQUFJLE1BQU0sS0FBSyxJQUFJO0FBQzlDLGNBQU0sVUFBVSxXQUFXLFNBQVMsVUFBVSxNQUFNO0FBQ3BELGNBQU0sS0FBSyxJQUFJLE1BQU0sT0FBTyxNQUFNLE9BQU87QUFDekMsYUFBSyxTQUFTLFVBQVUsS0FBSyxPQUFPLFVBQVUsT0FBTztBQUNyRCxhQUFLLGFBQWE7QUFBQSxNQUNwQixVQUFFO0FBQVUsbUJBQVcsTUFBTTtBQUFFLGVBQUssV0FBVztBQUFBLFFBQU8sR0FBRyxHQUFHO0FBQUEsTUFBRztBQUFBLElBQ2pFLEdBQUcsS0FBSyxJQUFJO0FBQUE7QUFBQSxFQXhGWixNQUFNLFNBQVM7QUFDYixVQUFNLFFBQVEsTUFBTSxLQUFLLFNBQVM7QUFDbEMsUUFBSTtBQUFPLGFBQU8sT0FBTyxLQUFLLFVBQVUsS0FBSztBQUc3QyxRQUFJLEtBQUssU0FBUyxjQUFjO0FBQzlCLFlBQU0sSUFBSSxLQUFLLElBQUksTUFBTSxzQkFBc0IsS0FBSyxTQUFTLFlBQVk7QUFDekUsVUFBSSxhQUFhO0FBQU8sY0FBTSxLQUFLLFNBQVMsS0FBSyxTQUFTLFlBQVk7QUFBQSxJQUN4RTtBQUVBLFNBQUssYUFBYSxXQUFXLFVBQVEsSUFBSSxXQUFXLE1BQU0sSUFBSSxDQUFDO0FBQy9ELFNBQUssY0FBYyxlQUFlLGlCQUFpQixNQUFNLEtBQUssYUFBYSxDQUFDO0FBRTVFLFNBQUssV0FBVztBQUFBLE1BQ2QsSUFBSTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sVUFBVSxNQUFNLEtBQUssYUFBYTtBQUFBLElBQ3BDLENBQUM7QUFDRCxTQUFLLFdBQVc7QUFBQSxNQUNkLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLFVBQVUsWUFBWTtBQUNwQixjQUFNLElBQUksS0FBSyxJQUFJLFVBQVUsY0FBYztBQUMzQyxZQUFJLENBQUMsR0FBRztBQUFFLGNBQUksdUJBQU8scUJBQXFCO0FBQUc7QUFBQSxRQUFRO0FBQ3JELGNBQU0sS0FBSyxTQUFTLEVBQUUsSUFBSTtBQUMxQixjQUFNLEtBQUssYUFBYTtBQUN4QixhQUFLLGFBQWE7QUFBQSxNQUNwQjtBQUFBLElBQ0YsQ0FBQztBQUdELFNBQUssY0FBYyxLQUFLLElBQUksTUFBTSxHQUFHLFVBQVUsT0FBTyxTQUFTO0FBQzdELFVBQUksS0FBSztBQUFVO0FBQ25CLFVBQUksZ0JBQWdCLHlCQUFTLEtBQUssU0FBUyxLQUFLLFNBQVMsY0FBYztBQUNyRSxjQUFNLEtBQUssU0FBUyxLQUFLLElBQUk7QUFDN0IsYUFBSyxhQUFhO0FBQUEsTUFDcEI7QUFBQSxJQUNGLENBQUMsQ0FBQztBQUFBLEVBQ0o7QUFBQSxFQUVBLE1BQU0sZUFBZTtBQUNuQixVQUFNLEVBQUUsVUFBVSxJQUFJLEtBQUs7QUFDM0IsUUFBSSxPQUFPLFVBQVUsZ0JBQWdCLFNBQVMsRUFBRSxDQUFDO0FBQ2pELFFBQUksQ0FBQyxNQUFNO0FBQ1QsYUFBTyxVQUFVLFFBQVEsS0FBSztBQUM5QixZQUFNLEtBQUssYUFBYSxFQUFFLE1BQU0sV0FBVyxRQUFRLEtBQUssQ0FBQztBQUFBLElBQzNEO0FBQ0EsY0FBVSxXQUFXLElBQUk7QUFBQSxFQUMzQjtBQUFBLEVBRUEsTUFBTSxTQUFTLE1BQWM7QUFDM0IsVUFBTSxPQUFPLEtBQUssSUFBSSxNQUFNLHNCQUFzQixJQUFJO0FBQ3RELFFBQUksRUFBRSxnQkFBZ0I7QUFBUTtBQUM5QixVQUFNLFVBQVUsTUFBTSxLQUFLLElBQUksTUFBTSxLQUFLLElBQUk7QUFDOUMsU0FBSyxTQUFTLFVBQVUsTUFBTSxPQUFPO0FBQ3JDLFNBQUssU0FBUyxlQUFlO0FBQzdCLFVBQU0sS0FBSyxTQUFTLEtBQUssUUFBUTtBQUFBLEVBQ25DO0FBQUEsRUFFQSxNQUFNLGVBQWU7QUFDbkIsVUFBTSxLQUFLLFNBQVMsS0FBSyxRQUFRO0FBQUEsRUFDbkM7QUFBQSxFQTZCQSxlQUFlO0FBQ2IsU0FBSyxJQUFJLFVBQVUsZ0JBQWdCLFNBQVMsRUFDekMsUUFBUSxPQUFNLEVBQUUsS0FBb0IsUUFBUSxDQUFDO0FBQUEsRUFDbEQ7QUFDRjtBQUdBLElBQU0sYUFBTixjQUF5Qix5QkFBUztBQUFBLEVBSWhDLFlBQVksTUFBcUIsUUFBNkI7QUFDNUQsVUFBTSxJQUFJO0FBSFosbUJBQW1DO0FBSWpDLFNBQUssU0FBUztBQUFBLEVBQ2hCO0FBQUEsRUFDQSxjQUFpQjtBQUFFLFdBQU87QUFBQSxFQUFXO0FBQUEsRUFDckMsaUJBQWlCO0FBQUUsV0FBTztBQUFBLEVBQWlCO0FBQUEsRUFDM0MsVUFBaUI7QUFBRSxXQUFPO0FBQUEsRUFBZTtBQUFBLEVBRXpDLE1BQU0sU0FBUztBQUNiLFNBQUssWUFBWSxNQUFNLFVBQVc7QUFDbEMsU0FBSyxZQUFZLE1BQU0sV0FBVztBQUNsQyxTQUFLLFVBQVUsU0FBUyxjQUFjLE9BQU87QUFDN0MsU0FBSyxRQUFRLGNBQWM7QUFDM0IsYUFBUyxLQUFLLFlBQVksS0FBSyxPQUFPO0FBRXRDLFFBQUksQ0FBQyxLQUFLLE9BQU8sUUFBUTtBQUN2QixZQUFNLElBQUksS0FBSyxPQUFPLElBQUksVUFBVSxjQUFjO0FBQ2xELFVBQUk7QUFBRyxjQUFNLEtBQUssT0FBTyxTQUFTLEVBQUUsSUFBSTtBQUFBLElBQzFDO0FBQ0EsU0FBSyxPQUFPO0FBQUEsRUFDZDtBQUFBLEVBQ0EsTUFBTSxVQUFVO0FBL0lsQjtBQStJb0IsZUFBSyxZQUFMLG1CQUFjO0FBQUEsRUFBVTtBQUFBLEVBQzFDLFVBQWdCO0FBQUUsU0FBSyxPQUFPO0FBQUEsRUFBRztBQUFBO0FBQUEsRUFHakMsU0FBUztBQUNQLFNBQUssWUFBWSxNQUFNO0FBQ3ZCLFVBQU0sT0FBTyxLQUFLLFlBQVksVUFBVSxFQUFFLEtBQUssVUFBVSxDQUFDO0FBQzFELFVBQU0sSUFBTyxLQUFLLE9BQU87QUFHekIsVUFBTSxLQUFNLEtBQUssVUFBVSxFQUFFLEtBQUssYUFBYSxDQUFDO0FBQ2hELFVBQU0sTUFBTSxHQUFHLFVBQVU7QUFDekIsUUFBSSxVQUFVO0FBQUEsTUFBRSxLQUFLO0FBQUEsTUFDbkIsTUFBTSxnQkFBZ0IsSUFBSSxhQUFRLEVBQUUsUUFBUSxFQUFFO0FBQUEsSUFBRyxDQUFDO0FBQ3BELFFBQUksVUFBVTtBQUFBLE1BQUUsS0FBSztBQUFBLE1BQ25CLE1BQU07QUFBQSxJQUErRSxDQUFDO0FBRXhGLFVBQU0sTUFBTSxHQUFHLFVBQVUsRUFBRSxLQUFLLG1CQUFtQixDQUFDO0FBQ3BELFVBQU0sS0FBTSxJQUFJLFVBQVUsRUFBRSxLQUFLLGVBQWUsQ0FBQztBQUNqRCxPQUFHLFNBQVMsU0FBUyxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3RDLFVBQU0sVUFBVSxHQUFHLFNBQVMsU0FBUyxFQUFFLEtBQUssaUJBQWlCLE1BQU0sT0FBTyxDQUFDO0FBQzNFLFlBQVEsY0FBYztBQUN0QixRQUFJO0FBQUcsY0FBUSxRQUFRLEVBQUU7QUFDekIsT0FBRyxTQUFTLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNwQyxVQUFNLFFBQVEsR0FBRyxTQUFTLFNBQVMsRUFBRSxLQUFLLGlCQUFpQixNQUFNLE9BQU8sQ0FBQztBQUN6RSxVQUFNLGNBQWM7QUFDcEIsUUFBSTtBQUFHLFlBQU0sUUFBUSxFQUFFO0FBQ3ZCLE9BQUcsU0FBUyxVQUFVLEVBQUUsS0FBSyxnQkFBZ0IsTUFBTSxRQUFRLENBQUMsRUFDekQsaUJBQWlCLFNBQVMsTUFBTTtBQUMvQixZQUFNLElBQUksUUFBUSxNQUFNLEtBQUssR0FBRyxJQUFJLE1BQU0sTUFBTSxLQUFLO0FBQ3JELFVBQUksQ0FBQyxLQUFLLENBQUMsR0FBRztBQUFFLFlBQUksdUJBQU8sa0NBQWtDO0FBQUc7QUFBQSxNQUFRO0FBQ3hFLFdBQUssT0FBTyxXQUFXLEdBQUcsQ0FBQztBQUFBLElBQzdCLENBQUM7QUFDSDtBQUFBLE1BQ0UsRUFBRSxHQUFFLFdBQVcsR0FBRSxVQUFjO0FBQUEsTUFDL0IsRUFBRSxHQUFFLFdBQVcsR0FBRSxjQUFjO0FBQUEsTUFDL0IsRUFBRSxHQUFFLFdBQVcsR0FBRSxVQUFjO0FBQUEsTUFDL0IsRUFBRSxHQUFFLFdBQVcsR0FBRSxVQUFjO0FBQUEsTUFDL0IsRUFBRSxHQUFFLFdBQVcsR0FBRSxPQUFjO0FBQUEsSUFDakMsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTTtBQUN0QixZQUFNLE1BQU0sSUFBSSxVQUFVLEVBQUUsS0FBSyxZQUFZLENBQUM7QUFDOUMsVUFBSSxVQUFVLEVBQUUsS0FBSyxnQkFBZ0IsQ0FBQyxFQUFFLE1BQU0sYUFBYTtBQUMzRCxVQUFJLFdBQVcsTUFBTSxDQUFDO0FBQUEsSUFDeEIsQ0FBQztBQUNELFFBQUksU0FBUyxVQUFVLEVBQUUsS0FBSyxlQUFlLE1BQU0sV0FBVyxDQUFDLEVBQzVELGlCQUFpQixTQUFTLFlBQVk7QUFDckMsVUFBSSxDQUFDO0FBQUc7QUFDUixZQUFNLE9BQU8sS0FBSyxPQUFPLElBQUksTUFBTSxzQkFBc0IsRUFBRSxRQUFRO0FBQ25FLFVBQUksZ0JBQWdCO0FBQ2xCLGFBQUssT0FBTyxJQUFJLFVBQVUsUUFBUSxLQUFLLEVBQUUsU0FBUyxJQUFJO0FBQUEsSUFDMUQsQ0FBQztBQUdILFFBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxXQUFXLEdBQUc7QUFDOUIsWUFBTSxLQUFLLEtBQUssVUFBVSxFQUFFLEtBQUssV0FBVyxDQUFDO0FBQzdDLFNBQUcsWUFBWSxDQUFDLElBQ1o7QUFBQTtBQUFBLGdHQUdBLHVDQUF1QyxFQUFFLFFBQVE7QUFDckQ7QUFBQSxJQUNGO0FBSUEsVUFBTSxTQUFhLEtBQUssVUFBVSxFQUFFLEtBQUssWUFBWSxDQUFDO0FBRXRELFVBQU0sU0FBYSxLQUFLLFVBQVUsRUFBRSxLQUFLLGFBQWEsQ0FBQztBQUV2RCxVQUFNLGFBQWEsS0FBSyxVQUFVLEVBQUUsS0FBSyxhQUFhLENBQUM7QUFFdkQsVUFBTSxPQUFhLEtBQUssVUFBVSxFQUFFLEtBQUssVUFBVSxDQUFDO0FBR3BELFVBQU0sU0FBVSxPQUFPLFNBQVMsT0FBTztBQUN2QyxVQUFNLFNBQVUsT0FBTyxTQUFTLE9BQU87QUFDdkMsVUFBTSxRQUFVLE9BQU8sU0FBUyxJQUFJO0FBQ3BDLFVBQU0sVUFBVSxNQUFNLFNBQVMsTUFBTSxFQUFFLEtBQUssZ0JBQWdCLE1BQU0sUUFBUSxDQUFDO0FBQzNFLElBQUMsUUFBaUMsVUFBVTtBQUc1QyxVQUFNLFVBQVUsT0FBTyxTQUFTLFNBQVMsRUFBRSxLQUFLLG1CQUFtQixDQUFDO0FBQ3BFLFVBQU0sVUFBVSxRQUFRLFNBQVMsT0FBTztBQUN4QyxVQUFNLE9BQVUsUUFBUSxTQUFTLElBQUk7QUFDckMsTUFBRSxTQUFTLE9BQU8sUUFBUSxDQUFDLEdBQUcsTUFBTTtBQUNsQyxZQUFNLEtBQUssS0FBSyxTQUFTLE1BQU07QUFBQSxRQUM3QixLQUFLLGlCQUFpQixNQUFNLEVBQUUsU0FBUyxPQUFPLFNBQVMsSUFBSSxhQUFhO0FBQUEsUUFDeEUsTUFBTSxFQUFFO0FBQUEsTUFDVixDQUFDO0FBQ0QsTUFBQyxHQUE0QixVQUFVLEVBQUU7QUFBQSxJQUMzQyxDQUFDO0FBQ0QsVUFBTSxPQUFPLFFBQVEsU0FBUyxJQUFJO0FBQ2xDLE1BQUUsU0FBUyxNQUFNLFFBQVEsT0FBSztBQUM1QixXQUFLLFNBQVMsTUFBTTtBQUFBLFFBQ2xCLEtBQUs7QUFBQSxVQUFDO0FBQUEsVUFDSixFQUFFLFlBQWEsZUFBZTtBQUFBLFVBQzlCLEVBQUUsYUFBYSxZQUFlO0FBQUEsUUFDaEMsRUFBRSxPQUFPLE9BQU8sRUFBRSxLQUFLLEdBQUc7QUFBQSxRQUMxQixNQUFNLEVBQUU7QUFBQSxNQUNWLENBQUM7QUFBQSxJQUNILENBQUM7QUFHRCxVQUFNLFVBQVUsV0FBVyxTQUFTLE9BQU87QUFDM0MsVUFBTSxVQUFVLFFBQVEsU0FBUyxPQUFPO0FBR3hDLFVBQU0sVUFBVSxLQUFLLFNBQVMsU0FBUyxFQUFFLEtBQUssZ0JBQWdCLENBQUM7QUFDL0QsVUFBTSxVQUFVLFFBQVEsU0FBUyxPQUFPO0FBRXhDLFNBQUssVUFBVSxTQUFTLFNBQVMsQ0FBQztBQUdsQyxTQUFLLGlCQUFpQixVQUFVLE1BQU07QUFDcEMsYUFBTyxhQUFpQixLQUFLO0FBQzdCLGlCQUFXLFlBQWEsS0FBSztBQUFBLElBQy9CLENBQUM7QUFBQSxFQUNIO0FBQUE7QUFBQSxFQUdBLFVBQ0UsU0FDQSxTQUNBLEdBQ0E7QUEzUUo7QUE0UUksVUFBTSxFQUFFLE9BQU8sVUFBVSxVQUFVLFNBQVMsSUFBSTtBQUNoRCxVQUFNLFlBQVksS0FBSyxPQUFPLFNBQVM7QUFHdkMsVUFBTSxZQUFZLG9CQUFJLElBQTJCO0FBQ2pELFVBQU0sV0FBWSxvQkFBSSxJQUFZO0FBQ2xDLFVBQU0sTUFBZSxDQUFDO0FBQ3RCLGVBQVcsS0FBSyxPQUFPO0FBQ3JCLGFBQU8sSUFBSSxVQUFVLElBQUksSUFBSSxTQUFPLENBQUMsRUFBRSxVQUFVLEVBQUU7QUFBUSxZQUFJLElBQUk7QUFDbkUsWUFBTSxNQUFNLElBQUksU0FBUyxJQUFJLElBQUksU0FBTyxDQUFDLElBQUk7QUFDN0MsZ0JBQVUsSUFBSSxFQUFFLEtBQUksZ0NBQUssT0FBTCxZQUFXLElBQUk7QUFDbkMsVUFBSTtBQUFLLGlCQUFTLElBQUksSUFBSSxFQUFFO0FBQzVCLFVBQUksS0FBSyxDQUFDO0FBQUEsSUFDWjtBQUVBLFVBQU0sWUFBWSxDQUFDLE9BQXdCO0FBQ3pDLFVBQUksTUFBTSxVQUFVLElBQUksRUFBRTtBQUMxQixhQUFPLEtBQUs7QUFDVixZQUFJLFVBQVUsS0FBSyxVQUFVLEdBQUcsQ0FBQztBQUFHLGlCQUFPO0FBQzNDLGNBQU0sVUFBVSxJQUFJLEdBQUc7QUFBQSxNQUN6QjtBQUNBLGFBQU87QUFBQSxJQUNUO0FBR0EsVUFBTSxXQUFXLE1BQU07QUFDckIsY0FBUSxpQkFBOEIsYUFBYSxFQUFFLFFBQVEsUUFBTTtBQUNqRSxXQUFHLFVBQVUsT0FBTyxhQUFhLENBQUMsVUFBVSxHQUFHLFFBQVEsRUFBRyxDQUFDO0FBQUEsTUFDN0QsQ0FBQztBQUNELGNBQVEsaUJBQThCLGFBQWEsRUFBRSxRQUFRLFFBQU07QUFDakUsV0FBRyxVQUFVLE9BQU8sYUFBYSxDQUFDLFVBQVUsR0FBRyxRQUFRLEVBQUcsQ0FBQztBQUFBLE1BQzdELENBQUM7QUFBQSxJQUNIO0FBRUEsZUFBVyxRQUFRLE9BQU87QUFDeEIsWUFBTSxTQUFTLENBQUMsU0FBUyxJQUFJLEtBQUssRUFBRTtBQUNwQyxZQUFNLE1BQVMsS0FBSyxJQUFJLEtBQUssS0FBSyxDQUFDO0FBQ25DLFlBQU0sTUFBUyxVQUFVLEtBQUssRUFBRTtBQUNoQyxZQUFNLEtBQVMsS0FBSyxVQUFVLEtBQUssRUFBRTtBQUNyQyxZQUFNLFNBQVMsTUFBTSxLQUFLO0FBRzFCLFlBQU0sT0FBVSxRQUFRLFNBQVMsTUFBTSxFQUFFLEtBQUssU0FBUyxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUM7QUFDdkUsV0FBSyxRQUFRLEtBQUssS0FBSztBQUN2QixZQUFNLFVBQVUsS0FBSyxTQUFTLElBQUk7QUFDbEMsWUFBTSxRQUFVLFFBQVEsVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFFM0QsVUFBSSxTQUFTLElBQUksS0FBSyxFQUFFLEdBQUc7QUFDekIsY0FBTSxNQUFNLE1BQU0sU0FBUyxVQUFVLEVBQUUsS0FBSyxZQUFZLENBQUM7QUFDekQsWUFBSSxjQUFjLFVBQVUsRUFBRSxJQUFJLFdBQU07QUFDeEMsWUFBSSxpQkFBaUIsU0FBUyxPQUFLO0FBQ2pDLFlBQUUsZ0JBQWdCO0FBQ2xCLG9CQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRTtBQUM3QixjQUFJLGNBQWMsVUFBVSxFQUFFLElBQUksV0FBTTtBQUN4QyxlQUFLLE9BQU8sYUFBYTtBQUN6QixtQkFBUztBQUFBLFFBQ1gsQ0FBQztBQUFBLE1BQ0gsT0FBTztBQUNMLGNBQU0sV0FBVyxFQUFFLEtBQUssYUFBYSxDQUFDO0FBQUEsTUFDeEM7QUFFQSxZQUFNLEtBQUssTUFBTSxXQUFXLEVBQUUsS0FBSyxpQkFBaUIsTUFBTSxLQUFLLE1BQU0sQ0FBQztBQUN0RSxTQUFHLFFBQVEsS0FBSztBQUVoQixVQUFJLFFBQVE7QUFDVixnQkFBUSxRQUFRLEtBQVEsT0FBTyxLQUFLLFdBQVc7QUFDL0MsZ0JBQVEsUUFBUSxRQUFRLE9BQU8sUUFBTyxjQUFTLEtBQUssRUFBRSxNQUFoQixZQUFxQixDQUFDLENBQUMsRUFBRSxLQUFLLE9BQUssRUFBRSxJQUFJLElBQUksTUFBTTtBQUN6RixnQkFBUSxpQkFBaUIsU0FBUyxPQUFLO0FBL1UvQyxjQUFBQTtBQWdWVSxjQUFLLEVBQWlCLFVBQVU7QUFBRztBQUNuQyxlQUFLLGVBQWUsS0FBSyxjQUFjLEtBQUs7QUFDNUMsa0JBQVEsUUFBUSxLQUFLLE9BQU8sS0FBSyxXQUFXO0FBQzVDLGVBQUssT0FBTyxNQUFNLEVBQUUsUUFBUSxLQUFLLElBQUksYUFBYSxLQUFLLGFBQWEsV0FBVUEsTUFBQSxTQUFTLEtBQUssRUFBRSxNQUFoQixPQUFBQSxNQUFxQixDQUFDLEVBQUUsQ0FBQztBQUFBLFFBQ3pHLENBQUM7QUFBQSxNQUNIO0FBR0EsWUFBTSxPQUFPLFFBQVEsU0FBUyxNQUFNLEVBQUUsS0FBSyxTQUFTLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQztBQUNwRSxXQUFLLFFBQVEsS0FBSyxLQUFLO0FBRXZCLGVBQVMsSUFBSSxHQUFHLElBQUksU0FBUyxNQUFNLFFBQVEsS0FBSztBQUM5QyxjQUFNLEtBQVEsU0FBUyxNQUFNLENBQUMsRUFBRTtBQUNoQyxjQUFNLFNBQVMscUJBQVMsS0FBSyxFQUFFLE1BQWhCLFlBQXFCLENBQUMsR0FBRyxFQUFFLE1BQTNCLFlBQWdDLEVBQUUsR0FBRyxHQUFHLE1BQU0sR0FBRztBQUNoRSxjQUFNLE9BQVEsS0FBSyxTQUFTLE1BQU07QUFBQSxVQUNoQyxLQUFLLENBQUMsV0FBVyxTQUFTLE1BQU0sQ0FBQyxFQUFFLGFBQWEsWUFBWSxFQUFFLEVBQUUsT0FBTyxPQUFPLEVBQUUsS0FBSyxHQUFHO0FBQUEsUUFDMUYsQ0FBQztBQUNELGFBQUssUUFBUSxJQUFJLE9BQU8sTUFBTSxDQUFDO0FBQy9CLFlBQUksTUFBTSxJQUFJO0FBQUcsZUFBSyxjQUFjLFdBQVcsTUFBTSxDQUFDO0FBQ3RELFlBQUksTUFBTTtBQUFNLGVBQUssUUFBUSxVQUFVO0FBQ3ZDLGFBQUssUUFBUSxDQUFDLE1BQU0sSUFBSSxJQUFJLElBQUksYUFBYSxNQUFNLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBTSxJQUFJLEVBQ3RFLE9BQU8sT0FBTyxFQUFFLEtBQUssVUFBSztBQUU3QixZQUFJLENBQUM7QUFBUTtBQUViLGFBQUssaUJBQWlCLFNBQVMsT0FBSztBQXpXNUMsY0FBQUE7QUEwV1UsY0FBSyxFQUFpQixVQUFVO0FBQUc7QUFDbkMsY0FBSSxDQUFDLFNBQVMsS0FBSyxFQUFFO0FBQUcscUJBQVMsS0FBSyxFQUFFLElBQUksQ0FBQztBQUM3QyxnQkFBTSxPQUFNQSxNQUFBLFNBQVMsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFwQixPQUFBQSxNQUF5QixFQUFFLEdBQUcsR0FBRyxNQUFNLEdBQUc7QUFDdEQsY0FBSSxLQUFLLElBQUksSUFBSSxLQUFLO0FBQ3RCLG1CQUFTLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSTtBQUN4QixlQUFLLFFBQVEsSUFBTSxPQUFPLElBQUksQ0FBQztBQUMvQixlQUFLLGNBQWMsSUFBSSxJQUFJLElBQUksV0FBVyxJQUFJLENBQUMsSUFBSTtBQUNuRCxlQUFLLFFBQVEsQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLGFBQWEsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksSUFBSSxFQUFFLE9BQU8sT0FBTyxFQUFFLEtBQUssVUFBSztBQUMvRixlQUFLLE9BQU8sTUFBTSxFQUFFLFFBQVEsS0FBSyxJQUFJLGFBQWEsS0FBSyxhQUFhLFVBQVUsU0FBUyxLQUFLLEVBQUUsRUFBRSxDQUFDO0FBQUEsUUFDbkcsQ0FBQztBQUVELGFBQUssaUJBQWlCLFlBQVksT0FBSztBQXJYL0MsY0FBQUEsS0FBQUM7QUFzWFUsWUFBRSxnQkFBZ0I7QUFDbEIsZ0JBQU0sT0FBT0EsUUFBQUQsTUFBQSxTQUFTLEtBQUssRUFBRSxNQUFoQixPQUFBQSxNQUFxQixDQUFDLEdBQUcsRUFBRSxNQUEzQixPQUFBQyxNQUFnQyxFQUFFLEdBQUcsR0FBRyxNQUFNLEdBQUc7QUFDOUQsZUFBSyxVQUFVLE1BQU0sU0FBUyxNQUFNLENBQUMsRUFBRSxLQUFLLEtBQUssT0FBTyxLQUFLLGFBQVc7QUFDdEUsZ0JBQUksQ0FBQyxTQUFTLEtBQUssRUFBRTtBQUFHLHVCQUFTLEtBQUssRUFBRSxJQUFJLENBQUM7QUFDN0MscUJBQVMsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJO0FBQ3hCLGlCQUFLLFFBQVEsSUFBVyxPQUFPLFFBQVEsQ0FBQztBQUN4QyxpQkFBSyxRQUFRLFVBQVcsUUFBUSxPQUFPLE1BQU07QUFDN0MsaUJBQUssY0FBbUIsUUFBUSxJQUFJLElBQUksV0FBVyxRQUFRLENBQUMsSUFBSTtBQUNoRSxpQkFBSyxRQUFRLENBQUMsUUFBUSxJQUFJLElBQUksSUFBSSxhQUFhLFFBQVEsQ0FBQyxDQUFDLE1BQU0sSUFBSSxRQUFRLElBQUksRUFBRSxPQUFPLE9BQU8sRUFBRSxLQUFLLFVBQUs7QUFDM0csb0JBQVEsUUFBUSxRQUFRLE9BQU8sT0FBTyxTQUFTLEtBQUssRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFBQyxPQUFLQSxHQUFFLElBQUksSUFBSSxNQUFNO0FBQ25GLGlCQUFLLE9BQU8sTUFBTSxFQUFFLFFBQVEsS0FBSyxJQUFJLGFBQWEsS0FBSyxhQUFhLFVBQVUsU0FBUyxLQUFLLEVBQUUsRUFBRSxDQUFDO0FBQUEsVUFDbkcsQ0FBQztBQUFBLFFBQ0gsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFHQSxVQUNFLFFBQXFCLFdBQW1CLFVBQ3hDLFNBQW9CLFFBQ3BCO0FBM1lKO0FBNFlJLG1CQUFTLGNBQWMsV0FBVyxNQUFsQyxtQkFBcUM7QUFDckMsVUFBTSxRQUFRLFNBQVMsS0FBSyxVQUFVLEVBQUUsS0FBSyxXQUFXLENBQUM7QUFDekQsVUFBTSxPQUFRLE9BQU8sc0JBQXNCO0FBQzNDLFVBQU0sTUFBTSxNQUFPLEdBQUcsS0FBSyxJQUFJLEtBQUssU0FBUyxHQUFHLE9BQU8sY0FBYyxHQUFHLENBQUM7QUFDekUsVUFBTSxNQUFNLE9BQU8sR0FBRyxLQUFLLElBQUksS0FBSyxNQUFNLE9BQU8sYUFBYSxHQUFHLENBQUM7QUFFbEUsVUFBTSxVQUFVLEVBQUUsS0FBSyxpQkFBaUIsTUFBTSxVQUFVLENBQUM7QUFDekQsVUFBTSxVQUFVLEVBQUUsS0FBSyxnQkFBaUIsTUFBTSxTQUFTLENBQUM7QUFFeEQsVUFBTSxLQUFNLE1BQU0sVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDckQsUUFBSSxNQUFRLFFBQVE7QUFDcEIsVUFBTSxPQUE0QixDQUFDO0FBRW5DLGtCQUFjLFFBQVEsQ0FBQyxLQUFLLE1BQU07QUFDaEMsWUFBTSxNQUFNLEdBQUcsU0FBUyxVQUFVLEVBQUUsS0FBSyxpQkFBaUIsTUFBTSxJQUFJLENBQUM7QUFDckUsVUFBSSxNQUFNLGNBQWMsY0FBYyxDQUFDO0FBQ3ZDLFVBQUksTUFBTSxLQUFLO0FBQUUsWUFBSSxNQUFNLGFBQWEsY0FBYyxDQUFDO0FBQUcsWUFBSSxNQUFNLFFBQVEsSUFBSSxJQUFJLFVBQVU7QUFBQSxNQUFJO0FBQ2xHLFVBQUksaUJBQWlCLFNBQVMsTUFBTTtBQUNsQyxjQUFNO0FBQ04sYUFBSyxRQUFRLENBQUMsR0FBRyxNQUFNO0FBQ3JCLGdCQUFNLFNBQVMsTUFBTTtBQUNyQixZQUFFLE1BQU0sYUFBYSxTQUFTLGNBQWMsQ0FBQyxJQUFJO0FBQ2pELFlBQUUsTUFBTSxRQUFhLFVBQVUsSUFBSSxJQUFJLFVBQVU7QUFBQSxRQUNuRCxDQUFDO0FBQUEsTUFDSCxDQUFDO0FBQ0QsV0FBSyxLQUFLLEdBQUc7QUFBQSxJQUNmLENBQUM7QUFFRCxVQUFNLEtBQUssTUFBTSxTQUFTLFlBQVksRUFBRSxLQUFLLGNBQWMsQ0FBQztBQUM1RCxPQUFHLFFBQVEsUUFBUTtBQUFNLE9BQUcsY0FBYztBQUMxQyxlQUFXLE1BQU0sR0FBRyxNQUFNLEdBQUcsRUFBRTtBQUUvQixVQUFNLE1BQU0sTUFBTSxVQUFVLEVBQUUsS0FBSyxtQkFBbUIsQ0FBQztBQUN2RCxRQUFJLFNBQVMsVUFBVSxFQUFFLEtBQUssaUJBQWlCLE1BQU0sU0FBUyxDQUFDLEVBQzVELGlCQUFpQixTQUFTLE1BQU0sTUFBTSxPQUFPLENBQUM7QUFDakQsUUFBSSxTQUFTLFVBQVUsRUFBRSxLQUFLLGVBQWUsTUFBTSxPQUFPLENBQUMsRUFDeEQsaUJBQWlCLFNBQVMsTUFBTTtBQUFFLGFBQU8sRUFBRSxHQUFHLEtBQUssTUFBTSxHQUFHLE1BQU0sS0FBSyxFQUFFLENBQUM7QUFBRyxZQUFNLE9BQU87QUFBQSxJQUFHLENBQUM7QUFFakcsVUFBTSxVQUFVLENBQUMsTUFBa0I7QUFDakMsVUFBSSxDQUFDLE1BQU0sU0FBUyxFQUFFLE1BQXFCLEdBQUc7QUFDNUMsY0FBTSxPQUFPO0FBQUcsaUJBQVMsb0JBQW9CLGFBQWEsT0FBTztBQUFBLE1BQ25FO0FBQUEsSUFDRjtBQUNBLGVBQVcsTUFBTSxTQUFTLGlCQUFpQixhQUFhLE9BQU8sR0FBRyxFQUFFO0FBRXBFLFVBQU0sS0FBSyxDQUFDLE1BQXFCO0FBQy9CLFVBQUksRUFBRSxRQUFRLFVBQVU7QUFBRSxjQUFNLE9BQU87QUFBRyxpQkFBUyxvQkFBb0IsV0FBVyxFQUFFO0FBQUEsTUFBRztBQUN2RixXQUFLLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxRQUFRLFNBQVM7QUFDakQsZUFBTyxFQUFFLEdBQUcsS0FBSyxNQUFNLEdBQUcsTUFBTSxLQUFLLEVBQUUsQ0FBQztBQUFHLGNBQU0sT0FBTztBQUFHLGlCQUFTLG9CQUFvQixXQUFXLEVBQUU7QUFBQSxNQUN2RztBQUFBLElBQ0Y7QUFDQSxhQUFTLGlCQUFpQixXQUFXLEVBQUU7QUFBQSxFQUN6QztBQUNGOyIsCiAgIm5hbWVzIjogWyJfYSIsICJfYiIsICJlIl0KfQo=
