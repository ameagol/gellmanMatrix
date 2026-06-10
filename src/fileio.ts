import { parseMonthYear, buildCalendar, Calendar } from "./calendar";

// ── Status vocab ──────────────────────────────────────────────────
export const STATUS_NAMES = ["", "pending", "in-progress", "at-risk", "blocked", "done"];
export const STATUS_FROM: Record<string, number> = {
  "pending": 1, "in-progress": 2, "at-risk": 3, "blocked": 4, "done": 5,
};

// ── Types ─────────────────────────────────────────────────────────
export interface Node {
  id:            string;
  label:         string;
  indent:        number;
  lineIdx:       number;
  lvl:           number;
  colorStatus:   number;
}
export interface WeekEntry { s: number; note: string; }
export interface ParsedFile {
  filePath: string; title: string; calendar: Calendar;
  nodes: Node[]; weekData: Record<string, Record<string, WeekEntry>>;
  lines: string[]; startRaw: string; endRaw: string;
}
export interface PatchOp {
  nodeId: string; colorStatus: number; weekData: Record<string, WeekEntry>;
}

// ── Helpers ───────────────────────────────────────────────────────
function countIndent(line: string): number {
  let n = 0, i = 0;
  while (i < line.length) {
    if      (line[i] === "\t")                          { n++; i++;    }
    else if (line[i] === " " && line[i + 1] === " ")   { n++; i += 2; }
    else break;
  }
  return n;
}

function stripWiki(s: string): string {
  return s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1");
}

// Extract clean display label: remove inline ::status: X
function labelOf(raw: string): string {
  return stripWiki(raw).replace(/\s*::status:\s*\S+/g, "").trim();
}

// Extract inline ::status: value from a tree item line
function inlineStatus(raw: string): number {
  const m = raw.match(/::status:\s*([a-z-]+)/i);
  return m ? (STATUS_FROM[m[1].toLowerCase()] ?? 0) : 0;
}

// Parse  ::note: { status: X, date: Y, comment: Z }
function parseNote(raw: string): { s: number; wk: string; note: string } | null {
  // Must start with ::note:
  if (!/^::note\s*:/i.test(raw)) return null;
  const block = raw.match(/\{([^}]*)\}/);
  if (!block) return null;
  const body = block[1];
  const get  = (k: string) => {
    const r = body.match(new RegExp(`\\b${k}\\s*:\\s*([^,}]+)`, "i"));
    return r ? r[1].trim() : "";
  };
  const wk   = get("date");
  const note = get("comment");
  const s    = STATUS_FROM[get("status").toLowerCase()] ?? 0;
  return wk ? { s, wk, note } : null;
}

// Is this list item a reserved header/meta line (never shown in tree)?
function isReserved(raw: string): boolean {
  const t = raw.trim();
  return /^::(gellmanMatrix|title|start|end|note)\b/i.test(t);
}

// ── Parser ────────────────────────────────────────────────────────
export function parseFile(filePath: string, content: string): ParsedFile {
  const lines = content.split("\n");

  // Defaults
  const now   = new Date();
  const defSY = now.getFullYear(), defSM = now.getMonth() + 1;
  const defEY = defSM + 5 > 12 ? defSY + 1 : defSY;
  const defEM = ((defSM + 4) % 12) + 1;
  let startRaw = `${String(defSM).padStart(2,"0")}-${String(defSY).slice(2)}`;
  let endRaw   = `${String(defEM).padStart(2,"0")}-${String(defEY).slice(2)}`;
  let title    = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "MatrixGellman";

  // ── Pass 1: read header block anywhere in file ────────────────
  let inFront = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (i === 0 && l === "---") { inFront = true; continue; }
    if (inFront) { if (l === "---") inFront = false; continue; }
    if (!l.startsWith("- ")) continue;
    const raw = l.slice(2).trim();
    const tm = raw.match(/^::title:\s*(.+)/i);
    const sm = raw.match(/^::start:\s*([\d\/\-]+)/i);
    const em = raw.match(/^::end:\s*([\d\/\-]+)/i);
    if (tm) title    = tm[1].trim();
    if (sm) startRaw = sm[1].trim();
    if (em) endRaw   = em[1].trim();
  }

  // Build calendar
  const sp       = parseMonthYear(startRaw) ?? { year: defSY, month: defSM };
  const ep       = parseMonthYear(endRaw)   ?? { year: defEY, month: defEM };
  const calendar = buildCalendar(sp.year, sp.month, ep.year, ep.month);
  const weekKeys = calendar.weeks.map(w => w.key);

  // ── Find min indent of real tree items ────────────────────────
  let minIndent = 99;
  for (const line of lines) {
    const t = line.trimStart();
    if (!t.startsWith("- ")) continue;
    if (isReserved(t.slice(2).trim())) continue;
    minIndent = Math.min(minIndent, countIndent(line));
  }
  if (minIndent === 99) minIndent = 0;

  // ── Pass 2: build tree + weekData ────────────────────────────
  const nodes:    Node[] = [];
  const weekData: Record<string, Record<string, WeekEntry>> = {};
  const stack:    Node[] = [];
  let   lastLeaf: Node | null = null;
  let   inFront2 = false;

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const indent  = countIndent(line);
    const trimmed = line.trimStart();

    if (i === 0 && trimmed.trim() === "---") { inFront2 = true; continue; }
    if (inFront2) { if (trimmed.trim() === "---") inFront2 = false; continue; }
    if (!trimmed.startsWith("- ")) { if (trimmed.trim()) lastLeaf = null; continue; }

    const raw = trimmed.slice(2).trim();

    // ── ::note child ──────────────────────────────────────────
    if (/^::note\s*:/i.test(raw)) {
      if (!lastLeaf) continue;
      const nb = parseNote(raw);
      if (!nb) continue;
      // match week key (exact or prefix)
      const matchedWk = weekKeys.find(wk => wk === nb.wk || nb.wk.startsWith(wk) || wk === nb.wk.trim());
      if (!matchedWk) continue;
      if (!weekData[lastLeaf.id]) weekData[lastLeaf.id] = {};
      weekData[lastLeaf.id][matchedWk] = { s: nb.s, note: nb.note };
      continue;
    }

    // ── reserved header line — skip ───────────────────────────
    if (isReserved(raw)) continue;

    // ── Regular tree node ─────────────────────────────────────
    const label = labelOf(raw);
    if (!label) continue;

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent      = stack.length ? stack[stack.length - 1] : null;
    const id          = parent ? `${parent.id}/${label}` : label;
    const lvl         = Math.min(indent - minIndent, 3);
    const colorStatus = inlineStatus(raw);

    const node: Node = { id, label, indent, lineIdx: i, lvl, colorStatus };
    nodes.push(node);
    stack.push(node);
    lastLeaf = node;
  }

  return { filePath, title, calendar, nodes, weekData, lines, startRaw, endRaw };
}

// ── Patcher ───────────────────────────────────────────────────────
// Rewrites a leaf node's inline ::status: and its ::note: children.
export function patchFile(content: string, filePath: string, op: PatchOp): string {
  const { nodes, lines, calendar } = parseFile(filePath, content);
  const node = nodes.find(n => n.id === op.nodeId);
  if (!node) return content;

  const leading   = lines[node.lineIdx].match(/^[\t ]*/)?.[0] ?? "";
  const childLead = leading + "\t";

  // Range of ::note: children immediately after this node
  let noteStart = node.lineIdx + 1;
  let noteEnd   = noteStart;
  while (noteEnd < lines.length) {
    const l  = lines[noteEnd];
    const ci = countIndent(l);
    const ct = l.trimStart();
    if (!ct.startsWith("- ")) { if (!ct.trim()) { noteEnd++; continue; } break; }
    if (ci <= node.indent) break;
    if (/^::note\s*:/i.test(ct.slice(2).trim())) { noteEnd++; continue; }
    break;
  }

  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (i === node.lineIdx) {
      // Rewrite node line: strip old ::status, append new one
      const bare      = lines[i].replace(/\s*::status:\s*\S+/g, "").trimEnd();
      const statusTag = op.colorStatus > 0 ? ` ::status: ${STATUS_NAMES[op.colorStatus]}` : "";
      result.push(`${bare}${statusTag}`);
      i++;
      // Skip old ::note: children
      while (i < noteEnd) i++;
      // Write new ::note: lines
      for (const wk of calendar.weeks.map(w => w.key)) {
        const entry = op.weekData[wk];
        if (!entry || (!entry.s && !entry.note)) continue;
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

// ── Patch dates ───────────────────────────────────────────────────
export function patchDates(content: string, startRaw: string, endRaw: string): string {
  const lines = content.split("\n");
  let ps = false, pe = false;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trimStart();
    if (!t.startsWith("- ")) continue;
    const raw = t.slice(2).trim();
    if (!ps && /^::start:/i.test(raw)) {
      lines[i] = lines[i].replace(/::start:\s*[\d\/\-]+/i, `::start: ${startRaw}`);
      ps = true;
    }
    if (!pe && /^::end:/i.test(raw)) {
      lines[i] = lines[i].replace(/::end:\s*[\d\/\-]+/i, `::end: ${endRaw}`);
      pe = true;
    }
    if (ps && pe) break;
  }

  if (!ps || !pe) {
    // Insert header block at top (after frontmatter if present)
    let at = 0;
    let inF = false;
    for (let i = 0; i < lines.length; i++) {
      if (i === 0 && lines[i].trim() === "---") { inF = true; continue; }
      if (inF && lines[i].trim() === "---") { at = i + 1; break; }
      if (!inF) { at = i; break; }
    }
    lines.splice(at, 0,
      "- ::gellmanMatrix",
      "- ::title: MatrixGellman",
      `- ::start: ${startRaw}`,
      `- ::end: ${endRaw}`,
      ""
    );
  }
  return lines.join("\n");
}
