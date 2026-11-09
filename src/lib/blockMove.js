/*
 * Multi-select helpers for the input list: moving a set of rows as a
 * block, and picking ranges. Pure functions over arrays of objects with an
 * `id`, so the rules are unit tested (blockMove.test.js) and the UI just
 * calls them. Every function returns a NEW array and never mutates input.
 *
 * Rules:
 *  - The selected rows keep their current relative order, wherever they
 *    were (they don't have to be next to each other).
 *  - Dropping a block on a row follows the same convention as dragging a
 *    single row: dragging DOWN lands the block after the target row,
 *    dragging UP lands it before. "Down/up" is judged by the row the user
 *    grabbed.
 *  - Dropping onto a selected row does nothing (it would move the block
 *    onto itself).
 */

/** Move the selected rows as a block onto `targetId`. `grabbedId` = the row the user dragged. */
export function moveBlockTo(items, selectedIds, grabbedId, targetId) {
  const sel = new Set(selectedIds);
  if (!sel.has(grabbedId) || sel.has(targetId)) return items;
  const gi = items.findIndex((x) => x.id === grabbedId);
  const ti = items.findIndex((x) => x.id === targetId);
  if (gi === -1 || ti === -1) return items;

  const block = items.filter((x) => sel.has(x.id));
  const rest = items.filter((x) => !sel.has(x.id));
  let at = rest.findIndex((x) => x.id === targetId);
  if (ti > gi) at += 1; // dragged down: land after the target
  return [...rest.slice(0, at), ...block, ...rest.slice(at)];
}

/** Nudge the selected rows up (dir -1) or down (+1) by one place, together. A block already at the edge stays put. */
export function moveBlockBy(items, selectedIds, dir) {
  const sel = new Set(selectedIds);
  const arr = [...items];
  if (dir < 0) {
    for (let i = 1; i < arr.length; i++) {
      if (sel.has(arr[i].id) && !sel.has(arr[i - 1].id)) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    }
  } else {
    for (let i = arr.length - 2; i >= 0; i--) {
      if (sel.has(arr[i].id) && !sel.has(arr[i + 1].id)) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
    }
  }
  return arr;
}

/** Ids from `fromId` to `toId` inclusive, in list order (shift-click range select). */
export function rangeIds(items, fromId, toId) {
  const a = items.findIndex((x) => x.id === fromId);
  const b = items.findIndex((x) => x.id === toId);
  if (a === -1 || b === -1) return toId && b !== -1 ? [toId] : [];
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return items.slice(lo, hi + 1).map((x) => x.id);
}

/** Apply the same patch to every selected row (one new array, one update). */
export function patchSelected(items, selectedIds, patch) {
  const sel = new Set(selectedIds);
  return items.map((x) => (sel.has(x.id) ? { ...x, ...patch } : x));
}
