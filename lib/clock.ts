import { cacheLife } from "next/cache";
import { currentMonthKey, todayIsoDate, type MonthKey } from "./month";

/** Reading the clock is the one thing a prerender can't do on its own: Next.js
 *  has to be told whether `new Date()` is captured into the cached page or
 *  produced fresh per request. Capturing it is what keeps these pages instant,
 *  so both helpers read the calendar inside a cache that refreshes every
 *  minute.
 *
 *  The cost is up to a minute of drift just after midnight, and both values
 *  only ever name a day or a month — the date lands in an editable field, and
 *  the month is one arrow tap away from the right one. */

/** Today as `YYYY-MM-DD`, for the log form's date field. */
export async function todayForForms(): Promise<string> {
  "use cache";
  cacheLife("minutes");
  return todayIsoDate();
}

/** The month the app opens on, and the one the plan is built for the month
 *  after. */
export async function thisMonth(): Promise<MonthKey> {
  "use cache";
  cacheLife("minutes");
  return currentMonthKey();
}
