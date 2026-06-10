const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
                     "Jul","Aug","Sep","Oct","Nov","Dec"];

export function parseMonthYear(raw: string): { year: number; month: number } | null {
  // Accepts MM-YY, MM/YY, MM-YYYY, MM/YYYY
  const s = raw.trim().replace(/\//g, "-");
  const p = s.split("-");
  if (p.length !== 2) return null;
  let month = parseInt(p[0], 10);
  let year  = parseInt(p[1], 10);
  if (isNaN(month) || isNaN(year)) return null;
  if (year < 100) year += 2000;
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export interface WeekCol {
  key:        string;   // "Jun 2026 W2"
  label:      string;   // "W2"
  monthLabel: string;   // "Jun 2026"
  monthIdx:   number;
  isMonthEnd: boolean;
  isCurrent:  boolean;
}
export interface MonthGroup { label: string; span: number; }
export interface Calendar   { weeks: WeekCol[]; months: MonthGroup[]; total: number; }

// ── Pure arithmetic helpers (no DST issues) ───────────────────────

// Day-of-week for the 1st of a month (0=Sun … 6=Sat)
function firstDow(y: number, m: number): number {
  const t = [0,3,2,5,0,3,5,1,4,6,2,4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy/4) - Math.floor(yy/100) + Math.floor(yy/400) + t[m-1]) % 7;
}
function daysInMonth(y: number, m: number): number {
  if (m === 2) return (y%4===0 && y%100!==0) || y%400===0 ? 29 : 28;
  return [0,31,28,31,30,31,30,31,31,30,31,30,31][m];
}
// 1-based day numbers of all Mondays in month y/m
function mondaysInMonth(y: number, m: number): number[] {
  const fd   = firstDow(y, m);
  const skip = (1 - fd + 7) % 7; // days from 1st to first Monday
  const dim  = daysInMonth(y, m);
  const r: number[] = [];
  for (let d = 1 + skip; d <= dim; d += 7) r.push(d);
  return r;
}
// Monday of the current real-world week as y/m/d
function currentMondayYMD(): { y: number; m: number; d: number } {
  const now  = new Date();
  const dow  = now.getDay();               // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  const ts   = now.getTime() - back * 86_400_000;
  const mon  = new Date(ts);
  return { y: mon.getFullYear(), m: mon.getMonth() + 1, d: mon.getDate() };
}

export function buildCalendar(sy: number, sm: number, ey: number, em: number): Calendar {
  const weeks:  WeekCol[]    = [];
  const months: MonthGroup[] = [];
  const cur = currentMondayYMD();
  let y = sy, m = sm, mIdx = 0;

  while (y < ey || (y === ey && m <= em)) {
    const ml      = `${MONTH_NAMES[m-1]} ${y}`;
    const mondays = mondaysInMonth(y, m);

    mondays.forEach((day, w) => {
      weeks.push({
        key:        `${ml} W${w+1}`,
        label:      `W${w+1}`,
        monthLabel: ml,
        monthIdx:   mIdx,
        isMonthEnd: w === mondays.length - 1,
        isCurrent:  y === cur.y && m === cur.m && day === cur.d,
      });
    });

    months.push({ label: ml, span: mondays.length });
    mIdx++;
    m++; if (m > 12) { m = 1; y++; }
  }

  return { weeks, months, total: weeks.length };
}
