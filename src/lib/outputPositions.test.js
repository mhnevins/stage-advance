// Run with: node --test src/lib/outputPositions.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { withOutputPositions, OUTPUT_LOCAL_BOX } from "./outputPositions.js";

const out = (id, extra = {}) => ({ id, outputChannel: id, boxId: null, boxPos: null, ...extra });

test("existing behavior unchanged: no box means Local, numbered by order, no return", () => {
  const r = withOutputPositions([out("a"), out("b"), out("c")]);
  assert.deepEqual(r.map((o) => [o._boxId, o._boxPos, o._rtnPos]),
    [[OUTPUT_LOCAL_BOX, 1, null], [OUTPUT_LOCAL_BOX, 2, null], [OUTPUT_LOCAL_BOX, 3, null]]);
});

test("existing behavior unchanged: manual console position still wins (Local-15, Local-16)", () => {
  const r = withOutputPositions([out("MainL", { boxPos: 15 }), out("MainR", { boxPos: 16 }), out("Mon1")]);
  assert.deepEqual(r.map((o) => o._boxPos), [15, 16, 3]);
});

test("existing behavior unchanged: separate counters per console box", () => {
  const r = withOutputPositions([out("a", { boxId: "aes" }), out("b"), out("c", { boxId: "aes" })]);
  assert.deepEqual(r.map((o) => o._boxPos), [1, 1, 2]);
});

test("a return box numbers its lines by order, independently of the console numbering", () => {
  const r = withOutputPositions([
    out("MainL", { boxPos: 15, rtnBoxId: "seismic" }),
    out("MainR", { boxPos: 16, rtnBoxId: "seismic" }),
    out("Mon1", { rtnBoxId: "seismic" }),
  ]);
  assert.deepEqual(r.map((o) => o._boxPos), [15, 16, 3]);   // console side untouched
  assert.deepEqual(r.map((o) => o._rtnPos), [1, 2, 3]);     // A, B, C when shown as letters
});

test("a manual return position wins, and later auto lines keep counting by order", () => {
  const r = withOutputPositions([
    out("a", { rtnBoxId: "s", rtnPos: 5 }),
    out("b", { rtnBoxId: "s" }),
  ]);
  assert.deepEqual(r.map((o) => o._rtnPos), [5, 2]);
});

test("only lines that have a return are counted, and different return boxes count separately", () => {
  const r = withOutputPositions([
    out("a"),                                 // no return
    out("b", { rtnBoxId: "s" }),
    out("c", { rtnBoxId: "t" }),
    out("d", { rtnBoxId: "s" }),
  ]);
  assert.deepEqual(r.map((o) => o._rtnPos), [null, 1, 1, 2]);
});

test("a return pointing at a deleted box is treated as no return", () => {
  const r = withOutputPositions([out("a", { rtnBoxId: "gone", rtnPos: 3 })], (id) => id !== "gone");
  assert.equal(r[0]._rtnPos, null);
});

test("does not mutate its input", () => {
  const input = [out("a", { rtnBoxId: "s" })];
  withOutputPositions(input);
  assert.equal("_rtnPos" in input[0], false);
});
