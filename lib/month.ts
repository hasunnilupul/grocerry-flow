/** A month is identified everywhere by its `YYYY-MM` key. All helpers here are
 *  calendar-only (no timezone maths) so a date typed on a phone in Colombo and
 *  read on a laptop lands in the same month. */

export type MonthKey = string; // `YYYY-MM`

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_PATTERN.test(value);
}

/** `YYYY-MM-DD` (or an ISO timestamp) -> `YYYY-MM`. */
export function monthKeyOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()): MonthKey {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Shift a month key by `offset` months. Negative goes back. */
export function addMonths(monthKey: MonthKey, offset: number): MonthKey {
  const [year, month] = monthKey.split("-").map(Number);
  // Month index is 0-based here, so `month - 1` then normalise via Date.
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  const shiftedYear = shifted.getUTCFullYear();
  const shiftedMonth = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${shiftedYear}-${shiftedMonth}`;
}

export function nextMonthKey(monthKey: MonthKey): MonthKey {
  return addMonths(monthKey, 1);
}

export function previousMonthKey(monthKey: MonthKey): MonthKey {
  return addMonths(monthKey, -1);
}

/** The `n` month keys ending at (and including) `monthKey`, oldest first. */
export function lastNMonths(monthKey: MonthKey, n: number): MonthKey[] {
  const months: MonthKey[] = [];
  for (let offset = n - 1; offset >= 0; offset--) {
    months.push(addMonths(monthKey, -offset));
  }
  return months;
}

/** First and last calendar day of the month, as `YYYY-MM-DD`. */
export function monthRange(monthKey: MonthKey): { start: string; end: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, "0")}`,
  };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonth(monthKey: MonthKey): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Compact form for axis labels and chips, e.g. `Mar '26`. */
export function formatMonthShort(monthKey: MonthKey): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[month - 1].slice(0, 3)} '${String(year).slice(2)}`;
}

/** Today as `YYYY-MM-DD` in the viewer's own calendar. */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
