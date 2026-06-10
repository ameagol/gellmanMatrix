import { Plugin, ItemView, WorkspaceLeaf, TFile, debounce, Notice } from "obsidian";
import { parseFile, patchFile, patchDates, PatchOp, ParsedFile, WeekEntry, STATUS_NAMES, STATUS_FROM } from "./fileio";
import { CSS } from "./styles";

const VIEW_TYPE     = "matrix-gellman";
const CELL_ICONS    = ["", "·", "▶", "!", "✕", "✓"];
const STATUS_COLORS = ["#e2e8f0","#94a3b8","#eab308","#f97316","#ef4444","#22c55e"];
const STATUS_LABELS = ["—","Pending","In Progress","At Risk","Blocked","Done"];

// ── Collapse key = filePath + nodeId so each file has independent state
function cKey(filePath: string, nodeId: string) { return `${filePath}||${nodeId}`; }

// ── Plugin ────────────────────────────────────────────────────────
export default class MatrixGellmanPlugin extends Plugin {
  // Persisted: { collapsed, lastFilePath }
  settings: { collapsed: Record<string, boolean>; lastFilePath: string } = {
    collapsed: {}, lastFilePath: "",
  };
  parsed: ParsedFile | null = null;
  private _writing = false;

  async onload() {
    const saved = await this.loadData();
    if (saved) Object.assign(this.settings, saved);

    // Restore last file
    if (this.settings.lastFilePath) {
      const f = this.app.vault.getAbstractFileByPath(this.settings.lastFilePath);
      if (f instanceof TFile) await this.readFile(this.settings.lastFilePath);
    }

    this.registerView(VIEW_TYPE, leaf => new MatrixView(leaf, this));

    // Ribbon: always loads whatever file is currently active
    this.addRibbonIcon("layout-grid", "MatrixGellman", async () => {
      const f = this.app.workspace.getActiveFile();
      if (f) await this.readFile(f.path);
      await this.activateView();
      this.refreshViews();
    });

    this.addCommand({
      id: "matrix-gellman-open",
      name: "Open MatrixGellman",
      callback: async () => {
        const f = this.app.workspace.getActiveFile();
        if (f) await this.readFile(f.path);
        await this.activateView();
        this.refreshViews();
      },
    });
    this.addCommand({
      id: "matrix-gellman-track",
      name: "MatrixGellman: track active file",
      callback: async () => {
        const f = this.app.workspace.getActiveFile();
        if (!f) { new Notice("No active file open"); return; }
        await this.readFile(f.path);
        await this.activateView();
        this.refreshViews();
      },
    });

    // Watch for external edits
    this.registerEvent(this.app.vault.on("modify", async (file) => {
      if (this._writing) return;
      if (file instanceof TFile && file.path === this.settings.lastFilePath) {
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

  async readFile(path: string) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    const content = await this.app.vault.read(file);
    this.parsed = parseFile(path, content);
    this.settings.lastFilePath = path;
    await this.saveData(this.settings);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  patch = debounce(async (op: PatchOp) => {
    if (!this.parsed) return;
    const file = this.app.vault.getAbstractFileByPath(this.parsed.filePath);
    if (!(file instanceof TFile)) return;
    this._writing = true;
    try {
      const content = await this.app.vault.read(file);
      const updated = patchFile(content, this.parsed.filePath, op);
      await this.app.vault.modify(file, updated);
      this.parsed = parseFile(this.parsed.filePath, updated);
    } finally { setTimeout(() => { this._writing = false; }, 400); }
  }, 300, true);

  patchDates = debounce(async (startRaw: string, endRaw: string) => {
    if (!this.parsed) return;
    const file = this.app.vault.getAbstractFileByPath(this.parsed.filePath);
    if (!(file instanceof TFile)) return;
    this._writing = true;
    try {
      const content = await this.app.vault.read(file);
      const updated = patchDates(content, startRaw, endRaw);
      await this.app.vault.modify(file, updated);
      this.parsed = parseFile(this.parsed.filePath, updated);
      this.refreshViews();
    } finally { setTimeout(() => { this._writing = false; }, 400); }
  }, 500, true);

  refreshViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE)
      .forEach(l => (l.view as MatrixView).refresh());
  }
}

// ── View ──────────────────────────────────────────────────────────
class MatrixView extends ItemView {
  plugin: MatrixGellmanPlugin;
  styleEl: HTMLStyleElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: MatrixGellmanPlugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType()    { return VIEW_TYPE; }
  getDisplayText() { return "MatrixGellman"; }
  getIcon()        { return "layout-grid"; }

  async onOpen() {
    this.containerEl.style.padding  = "0";
    this.containerEl.style.overflow = "hidden";
    this.styleEl = document.createElement("style");
    this.styleEl.textContent = CSS;
    document.head.appendChild(this.styleEl);
    // Always prefer the file the user is currently looking at
    const active = this.plugin.app.workspace.getActiveFile();
    if (active && active.path !== this.plugin.settings.lastFilePath) {
      await this.plugin.readFile(active.path);
    } else if (!this.plugin.parsed && active) {
      await this.plugin.readFile(active.path);
    }
    this.render();
  }
  async onClose() { this.styleEl?.remove(); }
  refresh()       { this.render(); }

  // ── Render ──────────────────────────────────────────────────────
  render() {
    this.containerEl.empty();
    const wrap = this.containerEl.createDiv({ cls: "mg-wrap" });
    const p    = this.plugin.parsed;

    // ── Toolbar (absolute, z-index 999, never scrolls) ────────────
    const tb  = wrap.createDiv({ cls: "mg-toolbar" });
    const tbL = tb.createDiv();
    tbL.createDiv({ cls: "mg-toolbar-title",
      text: `MatrixGellman${p ? " — " + p.title : ""}` });
    tbL.createDiv({ cls: "mg-toolbar-sub",
      text: "Click leaf for status · Hover cell for note · Dbl-click to edit · ▼ collapse" });

    const tbR = tb.createDiv({ cls: "mg-toolbar-right" });
    const dw  = tbR.createDiv({ cls: "mg-date-wrap" });
    dw.createEl("label", { text: "Start" });
    const startIn = dw.createEl("input", { cls: "mg-date-input", type: "text" });
    startIn.placeholder = "MM-YY";
    if (p) startIn.value = p.startRaw;
    dw.createEl("label", { text: "End" });
    const endIn = dw.createEl("input", { cls: "mg-date-input", type: "text" });
    endIn.placeholder = "MM-YY";
    if (p) endIn.value = p.endRaw;
    dw.createEl("button", { cls: "mg-btn-apply", text: "Apply" })
      .addEventListener("click", () => {
        const s = startIn.value.trim(), e = endIn.value.trim();
        if (!s || !e) { new Notice("Enter both Start and End (MM-YY)"); return; }
        this.plugin.patchDates(s, e);
      });
    [
      { c:"#94a3b8", l:"Pending"     },
      { c:"#eab308", l:"In Progress" },
      { c:"#f97316", l:"At Risk"     },
      { c:"#ef4444", l:"Blocked"     },
      { c:"#22c55e", l:"Done"        },
    ].forEach(({ c, l }) => {
      const leg = tbR.createDiv({ cls: "mg-legend" });
      leg.createDiv({ cls: "mg-legend-dot" }).style.background = c;
      leg.appendText(" " + l);
    });
    tbR.createEl("button", { cls: "mg-btn-open", text: "Open .md" })
      .addEventListener("click", async () => {
        if (!p) return;
        const file = this.plugin.app.vault.getAbstractFileByPath(p.filePath);
        if (file instanceof TFile)
          this.plugin.app.workspace.getLeaf("tab").openFile(file);
      });

    // ── Empty state ───────────────────────────────────────────────
    if (!p || p.nodes.length === 0) {
      const em = wrap.createDiv({ cls: "mg-empty" });
      em.innerHTML = !p
        ? `<b>No file loaded.</b><br><br>
           Use <code>Ctrl+P → MatrixGellman: track active file</code><br><br>
           Optionally add <code>::Main Project ::Start 06-26 ::End 12-27</code> to the file.`
        : `<b>No list items found</b> in <code>${p.filePath}</code>.`;
      return;
    }

    // ── 4-pane layout ─────────────────────────────────────────────
    // Corner: top-left, frozen on both axes
    const corner     = wrap.createDiv({ cls: "mg-corner" });
    // Column header: top-right, scrolls X only (driven by body)
    const colHdr     = wrap.createDiv({ cls: "mg-col-hdr" });
    // Row header: bottom-left, scrolls Y only (driven by body)
    const rowHdrWrap = wrap.createDiv({ cls: "mg-row-hdr" });
    // Body: bottom-right, the real scroll container
    const body       = wrap.createDiv({ cls: "mg-body" });

    // ── Corner: "Topic" label ─────────────────────────────────────
    const cTable  = corner.createEl("table");
    const cThead  = cTable.createEl("thead");
    const cMRow   = cThead.createEl("tr");
    const cCorner = cMRow.createEl("th", { cls: "mg-th-corner", text: "Topic" });
    (cCorner as HTMLTableCellElement).rowSpan = 2;

    // ── Column header table (months + weeks, no label column) ─────
    const chTable = colHdr.createEl("table", { cls: "mg-col-hdr-table" });
    const chThead = chTable.createEl("thead");
    const mRow    = chThead.createEl("tr");
    p.calendar.months.forEach((m, i) => {
      const th = mRow.createEl("th", {
        cls: "mg-th-month" + (i === p.calendar.months.length - 1 ? " mg-mend" : ""),
        text: m.label,
      });
      (th as HTMLTableCellElement).colSpan = m.span;
    });
    const wRow = chThead.createEl("tr");
    p.calendar.weeks.forEach(w => {
      wRow.createEl("th", {
        cls: ["mg-th-week",
          w.isCurrent  ? "mg-current" : "",
          w.isMonthEnd ? "mg-mend"    : "",
        ].filter(Boolean).join(" "),
        text: w.label,
      });
    });

    // ── Row header table (label column only, no week cells) ───────
    const rhTable = rowHdrWrap.createEl("table");
    const rhTbody = rhTable.createEl("tbody");

    // ── Body table (week cells only, no label column) ─────────────
    const bdTable = body.createEl("table", { cls: "mg-body-table" });
    const bdTbody = bdTable.createEl("tbody");

    this.buildRows(rhTbody, bdTbody, p);

    // ── JS scroll sync: body drives colHdr (X) and rowHdr (Y) ─────
    body.addEventListener("scroll", () => {
      colHdr.scrollLeft     = body.scrollLeft;
      rowHdrWrap.scrollTop  = body.scrollTop;
    });
  }

  // ── Build rows into two parallel tbodys ─────────────────────────
  buildRows(
    rhTbody: HTMLTableSectionElement,   // label column
    bdTbody: HTMLTableSectionElement,   // week cells
    p: ParsedFile
  ) {
    const { nodes, weekData, calendar, filePath } = p;
    const collapsed = this.plugin.settings.collapsed;

    type NodeT = typeof nodes[0];
    const parentMap = new Map<string, string | null>();
    const childSet  = new Set<string>();
    const stk: NodeT[] = [];
    for (const n of nodes) {
      while (stk.length && stk[stk.length-1].indent >= n.indent) stk.pop();
      const par = stk.length ? stk[stk.length-1] : null;
      parentMap.set(n.id, par?.id ?? null);
      if (par) childSet.add(par.id);
      stk.push(n);
    }

    const isVisible = (id: string): boolean => {
      let pid = parentMap.get(id);
      while (pid) {
        if (collapsed[cKey(filePath, pid)]) return false;
        pid = parentMap.get(pid);
      }
      return true;
    };

    // Sync visibility across both tables
    const applyVis = () => {
      rhTbody.querySelectorAll<HTMLElement>("tr[data-id]").forEach(tr => {
        tr.classList.toggle("mg-hidden", !isVisible(tr.dataset.id!));
      });
      bdTbody.querySelectorAll<HTMLElement>("tr[data-id]").forEach(tr => {
        tr.classList.toggle("mg-hidden", !isVisible(tr.dataset.id!));
      });
    };

    for (const node of nodes) {
      const isLeaf = !childSet.has(node.id);
      const lvl    = Math.min(node.lvl, 3);
      const vis    = isVisible(node.id);
      const ck     = cKey(filePath, node.id);
      const hidCls = vis ? "" : " mg-hidden";

      // ── Label row (left pane) ─────────────────────────────────
      const rhTr    = rhTbody.createEl("tr", { cls: `mg-lvl${lvl}${hidCls}` });
      rhTr.dataset.id = node.id;
      const labelTd = rhTr.createEl("td");
      const inner   = labelTd.createDiv({ cls: "mg-label-inner" });

      if (childSet.has(node.id)) {
        const btn = inner.createEl("button", { cls: "mg-toggle" });
        btn.textContent = collapsed[ck] ? "▶" : "▼";
        btn.addEventListener("click", e => {
          e.stopPropagation();
          collapsed[ck] = !collapsed[ck];
          btn.textContent = collapsed[ck] ? "▶" : "▼";
          this.plugin.saveSettings();
          applyVis();
        });
      } else {
        inner.createSpan({ cls: "mg-leaf-sp" });
      }

      const lt = inner.createSpan({ cls: "mg-label-text", text: node.label });
      lt.title = node.label;

      if (isLeaf) {
        labelTd.dataset.ls    = String(node.colorStatus);
        labelTd.dataset.lnote = Object.values(weekData[node.id] ?? {}).some(e => e.note) ? "1" : "0";
        labelTd.addEventListener("click", e => {
          if ((e as MouseEvent).detail >= 2) return;
          node.colorStatus = (node.colorStatus + 1) % 6;
          labelTd.dataset.ls = String(node.colorStatus);
          this.plugin.patch({ nodeId: node.id, colorStatus: node.colorStatus, weekData: weekData[node.id] ?? {} });
        });
      }

      // ── Cell row (right pane) ─────────────────────────────────
      const bdTr = bdTbody.createEl("tr", { cls: `mg-lvl${lvl}${hidCls}` });
      bdTr.dataset.id = node.id;

      for (let c = 0; c < calendar.weeks.length; c++) {
        const wk    = calendar.weeks[c].key;
        const entry = (weekData[node.id] ?? {})[wk] ?? { s: 0, note: "" };
        const cell  = bdTr.createEl("td", {
          cls: ["mg-cell", calendar.weeks[c].isMonthEnd ? "mg-mend" : ""].filter(Boolean).join(" "),
        });
        cell.dataset.s = String(entry.s);
        if (entry.s > 0) cell.textContent = CELL_ICONS[entry.s];
        if (entry.note) cell.dataset.hasnote = "1";
        cell.title = [entry.s > 0 ? `[${STATUS_NAMES[entry.s]}]` : "", entry.note]
          .filter(Boolean).join(" — ");

        if (!isLeaf) continue;

        cell.addEventListener("click", e => {
          if ((e as MouseEvent).detail >= 2) return;
          if (!weekData[node.id]) weekData[node.id] = {};
          const cur = weekData[node.id][wk] ?? { s: 0, note: "" };
          cur.s = (cur.s + 1) % 6;
          weekData[node.id][wk] = cur;
          cell.dataset.s   = String(cur.s);
          cell.textContent = cur.s > 0 ? CELL_ICONS[cur.s] : "";
          cell.title = [cur.s > 0 ? `[${STATUS_NAMES[cur.s]}]` : "", cur.note].filter(Boolean).join(" — ");
          this.plugin.patch({ nodeId: node.id, colorStatus: node.colorStatus, weekData: weekData[node.id] });
        });

        cell.addEventListener("dblclick", e => {
          e.stopPropagation();
          const cur = (weekData[node.id] ?? {})[wk] ?? { s: 0, note: "" };
          this.openPopup(cell, calendar.weeks[c].key, node.label, cur, updated => {
            if (!weekData[node.id]) weekData[node.id] = {};
            weekData[node.id][wk] = updated;
            cell.dataset.s        = String(updated.s);
            cell.dataset.hasnote  = updated.note ? "1" : "0";
            cell.textContent      = updated.s > 0 ? CELL_ICONS[updated.s] : "";
            cell.title = [updated.s > 0 ? `[${STATUS_NAMES[updated.s]}]` : "", updated.note].filter(Boolean).join(" — ");
            labelTd.dataset.lnote = Object.values(weekData[node.id]).some(e => e.note) ? "1" : "0";
            this.plugin.patch({ nodeId: node.id, colorStatus: node.colorStatus, weekData: weekData[node.id] });
          });
        });
      }
    }
  }

  // ── Note popup ──────────────────────────────────────────────────
  openPopup(
    anchor: HTMLElement, weekLabel: string, rowLabel: string,
    current: WeekEntry, onSave: (e: WeekEntry) => void
  ) {
    document.querySelector(".mg-popup")?.remove();
    const popup = document.body.createDiv({ cls: "mg-popup" });
    const rect  = anchor.getBoundingClientRect();
    popup.style.top  = `${Math.min(rect.bottom + 6, window.innerHeight - 230)}px`;
    popup.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;

    popup.createDiv({ cls: "mg-popup-week", text: weekLabel });
    popup.createDiv({ cls: "mg-popup-row",  text: rowLabel });

    const sw  = popup.createDiv({ cls: "mg-popup-stats" });
    let sel   = current.s;
    const btns: HTMLButtonElement[] = [];

    STATUS_LABELS.forEach((lbl, s) => {
      const btn = sw.createEl("button", { cls: "mg-popup-sbtn", text: lbl });
      btn.style.borderColor = STATUS_COLORS[s];
      if (s === sel) { btn.style.background = STATUS_COLORS[s]; btn.style.color = s > 0 ? "white" : ""; }
      btn.addEventListener("click", () => {
        sel = s;
        btns.forEach((b, i) => {
          const active = i === s;
          b.style.background = active ? STATUS_COLORS[i] : "white";
          b.style.color      = active && i > 0 ? "white" : "#475569";
        });
      });
      btns.push(btn);
    });

    const ta = popup.createEl("textarea", { cls: "mg-popup-ta" });
    ta.value = current.note; ta.placeholder = "Add a note…";
    setTimeout(() => ta.focus(), 40);

    const act = popup.createDiv({ cls: "mg-popup-actions" });
    act.createEl("button", { cls: "mg-btn-cancel", text: "Cancel" })
      .addEventListener("click", () => popup.remove());
    act.createEl("button", { cls: "mg-btn-save", text: "Save" })
      .addEventListener("click", () => { onSave({ s: sel, note: ta.value.trim() }); popup.remove(); });

    const outside = (e: MouseEvent) => {
      if (!popup.contains(e.target as HTMLElement)) {
        popup.remove(); document.removeEventListener("mousedown", outside);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", outside), 10);

    const kh = (e: KeyboardEvent) => {
      if (e.key === "Escape") { popup.remove(); document.removeEventListener("keydown", kh); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        onSave({ s: sel, note: ta.value.trim() }); popup.remove(); document.removeEventListener("keydown", kh);
      }
    };
    document.addEventListener("keydown", kh);
  }
}
