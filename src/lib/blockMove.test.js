// Run with: node --test src/lib/blockMove.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { moveBlockTo, moveBlockBy, rangeIds, patchSelected } from "./blockMove.js";

const L = (s) => s.split("").map((id) => ({ id }));
const ids = (a) => a.map((x) => x.id).join("");

test("THE REQUEST: 8 perc added at the end, drag the block up between drums and bass", () => {
  // D1-D3 drums, B bass, G guitar, P1-P4 perc (4 here for brevity)
  const list = L("DDDBGPPPP").map((x, i) => ({ id: `${x.id}${i}` }));
  const perc = list.filter((x) => x.id.startsWith("P")).map((x) => x.id);
  const grabbed = perc[0];
  const target = list.find((x) => x.id.startsWith("B")).id; // drop on bass: before it (dragging up)
  const out = moveBlockTo(list, perc, grabbed, target);
  assert.equal(ids(out).replace(/\d/g, ""), "DDDPPPPBG");
});

test("dragging down lands the block AFTER the target, like a single row", () => {
  assert.equal(ids(moveBlockTo(L("ABCDEF"), ["A", "B"], "A", "E")), "CDEABF");
  // single row, same convention: A dragged onto E ends after E
  assert.equal(ids(moveBlockTo(L("ABCDEF"), ["A"], "A", "E")), "BCDEAF");
});

test("dragging up lands the block BEFORE the target", () => {
  assert.equal(ids(moveBlockTo(L("ABCDEF"), ["E", "F"], "E", "B")), "AEFBCD");
});

test("selected rows that are not adjacent keep their relative order and gather together", () => {
  assert.equal(ids(moveBlockTo(L("ABCDEF"), ["B", "E"], "E", "A")), "BEACDF");
  assert.equal(ids(moveBlockTo(L("ABCDEF"), ["E", "B"], "B", "F")), "ACDFBE");
});

test("dropping onto a selected row, or with a bad id, changes nothing", () => {
  const l = L("ABCDEF");
  assert.equal(moveBlockTo(l, ["B", "C"], "B", "C"), l);
  assert.equal(moveBlockTo(l, ["B", "C"], "A", "E"), l); // grabbed row isn't selected
  assert.equal(moveBlockTo(l, ["B"], "B", "zzz"), l);
});

test("never loses or duplicates rows, never mutates the input", () => {
  const l = L("ABCDEFGH");
  const before = ids(l);
  for (const sel of [["A"], ["A", "H"], ["C", "D", "E"], ["B", "D", "F", "H"]]) {
    for (const tgt of l.map((x) => x.id).filter((x) => !sel.includes(x))) {
      const out = moveBlockTo(l, sel, sel[0], tgt);
      assert.equal(out.length, 8);
      assert.equal([...ids(out)].sort().join(""), "ABCDEFGH");
    }
  }
  assert.equal(ids(l), before);
});

test("moveBlockBy moves a block up/down together by one", () => {
  assert.equal(ids(moveBlockBy(L("ABCDEF"), ["C", "D"], -1)), "ACDBEF");
  assert.equal(ids(moveBlockBy(L("ABCDEF"), ["C", "D"], 1)), "ABECDF");
});

test("moveBlockBy: a block at the edge stays put; scattered rows each step once", () => {
  assert.equal(ids(moveBlockBy(L("ABCDEF"), ["A", "B"], -1)), "ABCDEF");
  assert.equal(ids(moveBlockBy(L("ABCDEF"), ["E", "F"], 1)), "ABCDEF");
  assert.equal(ids(moveBlockBy(L("ABCDEF"), ["B", "E"], -1)), "BACEDF");
  assert.equal(ids(moveBlockBy(L("ABCDEF"), ["A", "C"], -1)), "ACBDEF");
});

test("rangeIds is inclusive and works in either direction", () => {
  const l = L("ABCDEF");
  assert.deepEqual(rangeIds(l, "B", "D"), ["B", "C", "D"]);
  assert.deepEqual(rangeIds(l, "D", "B"), ["B", "C", "D"]);
  assert.deepEqual(rangeIds(l, "C", "C"), ["C"]);
  assert.deepEqual(rangeIds(l, "zzz", "C"), ["C"]);
  assert.deepEqual(rangeIds(l, "B", "zzz"), []);
});

test("patchSelected changes only the selected rows, in one new array", () => {
  const l = [{ id: "a", boxId: null }, { id: "b", boxId: null }, { id: "c", boxId: "x" }];
  const out = patchSelected(l, ["a", "c"], { boxId: "A", boxPos: null });
  assert.deepEqual(out, [{ id: "a", boxId: "A", boxPos: null }, { id: "b", boxId: null }, { id: "c", boxId: "A", boxPos: null }]);
  assert.equal(l[0].boxId, null);
});

/* ——— typing a channel number ——— */
import { moveBlockToPosition } from "./blockMove.js";
const ten = Array.from({ length: 10 }, (_, i) => ({ id: `r${i + 1}` }));
const idsC = (a) => a.map((x) => x.id).join(",");

test("typed number: a single row ends up at exactly that channel number", () => {
  assert.equal(moveBlockToPosition(ten, ["r3"], 7)[6].id, "r3");
  assert.equal(idsC(moveBlockToPosition(ten, ["r3"], 7)), "r1,r2,r4,r5,r6,r7,r3,r8,r9,r10");
  assert.equal(idsC(moveBlockToPosition(ten, ["r8"], 2)), "r1,r8,r2,r3,r4,r5,r6,r7,r9,r10");
});

test("typed number: too big goes last, too small is ignored", () => {
  assert.equal(moveBlockToPosition(ten, ["r2"], 99)[9].id, "r2");
  assert.equal(moveBlockToPosition(ten, ["r2"], 0), ten);
  assert.equal(moveBlockToPosition(ten, ["r2"], -4), ten);
  assert.equal(moveBlockToPosition(ten, ["r2"], NaN), ten);
});

test("typed number: its own number changes nothing (same array back)", () => {
  assert.equal(moveBlockToPosition(ten, ["r4"], 4), ten);
});

test("typed number: a block keeps its order and its first row lands on the number", () => {
  const out = moveBlockToPosition(ten, ["r2", "r6", "r9"], 4);
  assert.equal(idsC(out), "r1,r3,r4,r2,r6,r9,r5,r7,r8,r10");
  assert.equal(out[3].id, "r2");
});

test("typed number: a block is clamped so it always fits at the end", () => {
  assert.equal(idsC(moveBlockToPosition(ten, ["r1", "r2", "r3"], 50)), "r4,r5,r6,r7,r8,r9,r10,r1,r2,r3");
});

test("typed number: decimals are floored; nothing selected changes nothing; input never mutated", () => {
  assert.equal(moveBlockToPosition(ten, ["r1"], 3.9)[2].id, "r1");
  assert.equal(moveBlockToPosition(ten, [], 3), ten);
  assert.equal(ten[0].id, "r1");
});
