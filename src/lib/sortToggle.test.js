// Run with: node --test src/lib/sortToggle.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { applySort, isSortedState, undoSort } from "./sortToggle.js";

const C = (s) => s.split(" ").map((p) => ({ id: p, group: p[0] }));      // "b1 d1 b2" -> group by first letter
const order = (list) => list.map((x) => x.id).join(" ");
// a stand-in for groupSort: sort by group letter, stable
const byGroup = (list) => list.map((c, i) => [c, i]).sort((a, b) => a[0].group.localeCompare(b[0].group) || a[1] - b[1]).map(([c]) => c);

test("sort then unsort returns EXACTLY the original order", () => {
  const original = C("p1 d1 b1 d2 p2 b2 k1");
  const { channels, snapshot } = applySort(original, byGroup);
  assert.equal(order(channels), "b1 b2 d1 d2 k1 p1 p2");
  assert.ok(isSortedState(channels, snapshot));
  assert.equal(order(undoSort(channels, snapshot)), order(original));
});

test("a sort that changes nothing leaves no snapshot (nothing to undo)", () => {
  const already = C("b1 b2 d1 d2");
  const { channels, snapshot } = applySort(already, byGroup);
  assert.equal(snapshot, null);
  assert.equal(order(channels), order(already));
  assert.equal(isSortedState(channels, snapshot), false);
});

test("adding a channel after sorting keeps Unsort available; the new one goes to the end", () => {
  const original = C("p1 d1 b1");
  const { channels, snapshot } = applySort(original, byGroup);
  const withNew = [...channels, { id: "k9", group: "k" }];
  assert.ok(isSortedState(withNew, snapshot));
  assert.equal(order(undoSort(withNew, snapshot)), "p1 d1 b1 k9");
});

test("removing a channel after sorting keeps Unsort available and drops it from the result", () => {
  const original = C("p1 d1 b1 d2");
  const { channels, snapshot } = applySort(original, byGroup);
  const without = channels.filter((c) => c.id !== "d1");
  assert.ok(isSortedState(without, snapshot));
  assert.equal(order(undoSort(without, snapshot)), "p1 b1 d2");
});

test("moving rows by hand ends the sorted state, so Unsort can never discard manual work", () => {
  const { channels, snapshot } = applySort(C("p1 d1 b1 d2"), byGroup);   // b1 d1 d2 p1
  const manual = [channels[1], channels[0], ...channels.slice(2)];          // swap the first two
  assert.equal(isSortedState(manual, snapshot), false);
});

test("a stale or malformed snapshot is never treated as sorted", () => {
  const list = C("a1 a2");
  for (const bad of [null, undefined, {}, { before: [], after: [] }, { before: "x", after: "y" }]) {
    assert.equal(isSortedState(list, bad), false);
  }
});

test("a copied show (all new ids) is not in the sorted state", () => {
  const { snapshot } = applySort(C("p1 d1 b1"), byGroup);
  assert.equal(isSortedState(C("x1 x2 x3"), snapshot), false);
});

test("never loses or duplicates channels, never mutates its input", () => {
  const original = C("p1 d1 b1 d2 p2 b2");
  const copy = order(original);
  const { channels, snapshot } = applySort(original, byGroup);
  const back = undoSort([...channels, { id: "z", group: "z" }], snapshot);
  assert.equal(back.length, 7);
  assert.equal([...order(back).split(" ")].sort().join(" "), [...order(original).split(" "), "z"].sort().join(" "));
  assert.equal(order(original), copy);
});
