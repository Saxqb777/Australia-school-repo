/** Reads a pasted or uploaded visitation schedule. Pure, so it can be tested without a database. */

export interface ParsedVisit {
  line: number;
  observer: string;
  teacher: string;
  className: string;
  subject: string;
  date: string;
  period: number;
}

export interface ParseResult {
  rows: ParsedVisit[];
  errors: { line: number; message: string }[];
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t").map((c) => c.trim());
  // CSV with quoted fields
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Accepts a weekday name (within the cycle's week), an ISO date, or a day/month/year date. */
export function resolveDate(value: string, cycleStart: string): string | null {
  const v = value.trim().toLowerCase();
  const wd = WEEKDAYS.findIndex((d) => v === d || v === d.slice(0, 3));
  if (wd >= 0) {
    const start = new Date(`${cycleStart}T00:00:00Z`);
    const offset = (wd + 1 - start.getUTCDay() + 7) % 7;
    return addDays(cycleStart, offset);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = (y ?? "").length === 2 ? `20${y}` : (y ?? "");
    return `${year}-${(mo ?? "").padStart(2, "0")}-${(d ?? "").padStart(2, "0")}`;
  }
  return null;
}

/** "Ms. Rana" stays as written; a bare name gets "Ms. " so it matches the school's style. */
export function normaliseName(name: string): string {
  const n = name.replace(/\s+/g, " ").trim();
  if (!n) return n;
  return /^(ms|mrs|mr|dr|miss)\.?\s/i.test(n) ? n : `Ms. ${n}`;
}

export function parseSchedule(text: string, cycleStart: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const delimiter = lines.some((l) => l.includes("\t")) ? "\t" : ",";
  const rows: ParsedVisit[] = [];
  const errors: ParseResult["errors"] = [];
  let header: string[] | null = null;
  let col = { observer: 0, teacher: 1, className: 2, subject: 3, date: 4, period: 5 };
  let lastObserver = "";

  lines.forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    const cells = splitLine(raw, delimiter);
    const lower = cells.map((c) => c.toLowerCase());
    if (!header && lower.some((c) => c === "teacher") && lower.some((c) => c === "observer")) {
      header = lower;
      const find = (...names: string[]) => lower.findIndex((c) => names.includes(c));
      col = {
        observer: find("observer"),
        teacher: find("teacher"),
        className: find("class", "grade"),
        subject: find("subject"),
        date: find("date", "day"),
        period: find("period", "p"),
      };
      if (Object.values(col).some((i) => i < 0)) {
        errors.push({ line, message: "The header needs Observer, Teacher, Class, Subject, Date (or Day) and Period columns." });
      }
      return;
    }
    const get = (i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
    const observerCell = get(col.observer);
    if (observerCell) lastObserver = observerCell;
    const observer = observerCell || lastObserver;
    const teacher = get(col.teacher);
    const className = get(col.className);
    const subject = get(col.subject);
    const dateRaw = get(col.date);
    const periodRaw = get(col.period);
    if (!teacher && !className && !subject) return;
    const date = resolveDate(dateRaw, cycleStart);
    const period = Number.parseInt(periodRaw, 10);
    const missing = [
      !observer && "observer",
      !teacher && "teacher",
      !className && "class",
      !subject && "subject",
      !date && "date or day",
      Number.isNaN(period) && "period",
    ].filter(Boolean);
    if (missing.length > 0) {
      errors.push({ line, message: `Missing or unreadable: ${missing.join(", ")}.` });
      return;
    }
    rows.push({
      line,
      observer: normaliseName(observer),
      teacher: normaliseName(teacher),
      className: className.toUpperCase(),
      subject,
      date: date as string,
      period,
    });
  });
  return { rows, errors };
}
