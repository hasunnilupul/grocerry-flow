/** Cache tags shared by the pages that read this data and the server actions
 *  that change it. They live in one file so a new mutation can't quietly
 *  forget a screen that reads the same rows.
 *
 *  On the two-phones case: every write goes through a server action that
 *  clears the tag it affects, so the phone that saved a trip sees it on its
 *  very next request. The *other* phone keeps the pages it has already
 *  fetched for up to five minutes before asking the server again — that
 *  client-side window is what lets a tab render with no loading state at all.
 *  Reopening the app skips the wait. */

/** Everything derived from recorded trips: the month view, history, the item
 *  and store suggestions, and the prediction the plan starts from. */
export const TRIPS_TAG = "trips";

/** The shopping list itself — rows added, ticked, edited or removed. */
export const PLANS_TAG = "plans";
