/*
 * "Sort by group" that can be undone. Sorting remembers the order the list
 * had BEFORE (and the order the sort produced), saved with the show so it
 * survives a reload and syncs like any other show data. The button then
 * offers "Unsort" for as long as the list is still in that sorted state.
 *
 * Pure functions over arrays of objects with an `id` (see sortToggle.test.js).
 * `snapshot` is `{ before: [ids], after: [ids] }`.
 *
 * Rules (decided 2026-11-09):
 *  - A sort that changes nothing makes no snapshot (nothing to undo).
 *  - "Still sorted" ignores channels added or removed since: adding a
 *    channel after sorting must not take away Unsort.
 *  - Reordering the remaining channels by hand ends the sorted state, so
 *    Unsort never throws away manual work. The button goes back to
 *    "Sort by group".
 *  - Unsort restores the "before" order; channels added since go to the end.
 */

const ids = (list) => list.map((x) => x.id);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Run `sortFn` and remember how to undo it. -> { channels, snapshot } (snapshot is null when nothing changed). */
export function applySort(channels, sortFn) {
  const before = ids(channels);
  const sorted = sortFn(channels);
  const after = ids(sorted);
  return { channels: sorted, snapshot: same(before, after) ? null : { before, after } };
}

/** Is the list still in the order the last sort produced (ignoring added/removed channels)? */
export function isSortedState(channels, snapshot) {
  if (!snapshot || !Array.isArray(snapshot.after) || !Array.isArray(snapshot.before)) return false;
  const now = new Set(ids(channels));
  const afterSet = new Set(snapshot.after);
  const currentKnown = ids(channels).filter((id) => afterSet.has(id));
  const afterPresent = snapshot.after.filter((id) => now.has(id));
  return currentKnown.length > 0 && same(currentKnown, afterPresent);
}

/** Restore the pre-sort order. Channels that weren't there before go to the end, in their current order. */
export function undoSort(channels, snapshot) {
  const rank = new Map(snapshot.before.map((id, i) => [id, i]));
  const known = channels.filter((c) => rank.has(c.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
  const added = channels.filter((c) => !rank.has(c.id));
  return [...known, ...added];
}
