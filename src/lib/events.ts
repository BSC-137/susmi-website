export type EventType = "talk" | "workshop" | "social" | "hack";

export interface SusmiEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: EventType;
  description: string;
  tags: string[];
}

export function parseYearMonth(isoDate: string) {
  const [y, m] = isoDate.split("-").map(Number);
  return { year: y, month: m }; // month 1-12
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getSemesterMonths(events: SusmiEvent[]) {
  const keys = new Set<string>();
  for (const event of events) {
    const { year, month } = parseYearMonth(event.date);
    keys.add(monthKey(year, month));
  }
  return [...keys].sort();
}

/** Monday-first calendar cells for a month. */
export function buildMonthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay: 0 Sun ... 6 Sat → Monday-first index
  const startPad = (first.getUTCDay() + 6) % 7;
  const cells: Array<{ day: number | null; iso: string | null }> = [];

  for (let i = 0; i < startPad; i++) {
    cells.push({ day: null, iso: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, iso });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, iso: null });
  }
  return cells;
}

export function formatMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatLongDate(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function todayIsoSydney() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
