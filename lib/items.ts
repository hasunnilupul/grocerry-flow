/** Items are typed by hand on a phone, twice a month, by two different people.
 *  "Red Onions", "red onions" and "red  onions " have to end up as one item or
 *  every total and prediction is split across near-duplicates. */

/** The key an item is deduplicated by. Never shown to anyone. */
export function normalizeItemName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    // Drop trailing punctuation people add by habit ("milk.", "eggs,").
    .replace(/[.,;:]+$/, "");
}

/** The form an item is stored and displayed in: the typed name, tidied up but
 *  with the author's own capitalisation left alone. */
export function cleanItemName(name: string): string {
  return name.trim().replace(/\s+/g, " ").replace(/[.,;:]+$/, "").slice(0, 80);
}

export function isValidItemName(name: string): boolean {
  return normalizeItemName(name).length > 0;
}

/** Rank catalogue suggestions for what has been typed so far: exact match
 *  first, then prefix matches, then anything containing it. Ties keep the
 *  order they came in, which is most-recently-bought first. */
export function matchItems<T extends { name: string }>(
  items: T[],
  query: string,
  limit = 8,
): T[] {
  const needle = normalizeItemName(query);
  if (!needle) return items.slice(0, limit);

  const scored: { item: T; score: number }[] = [];
  for (const item of items) {
    const candidate = normalizeItemName(item.name);
    if (candidate === needle) scored.push({ item, score: 0 });
    else if (candidate.startsWith(needle)) scored.push({ item, score: 1 });
    else if (candidate.includes(needle)) scored.push({ item, score: 2 });
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
