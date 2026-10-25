// Run with: node --test src/lib/bulkApprove.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { planBulkApproval, BULK_APPROVE_MAX } from "./bulkApprove.js";

const row = (id, email, daysAgo) => ({ id, email, created_at: new Date(Date.UTC(2026, 9, 24) - daysAgo * 864e5).toISOString() });

test("oldest requests come first, regardless of input order", () => {
  const { batch } = planBulkApproval([row("new", "a@x.com", 0), row("old", "b@x.com", 5), row("mid", "c@x.com", 2)]);
  assert.deepEqual(batch.map((r) => r.id), ["old", "mid", "new"]);
});

test("disposable addresses are skipped and counted, not approved", () => {
  const r = planBulkApproval([row("1", "ok@gmail.com", 1), row("2", "bot@mailinator.com", 2), row("3", "x@a.yopmail.com", 3)]);
  assert.deepEqual(r.batch.map((x) => x.id), ["1"]);
  assert.equal(r.skippedDisposable, 2);
  assert.equal(r.remaining, 0);
});

test("never more than the batch limit; the rest are reported as remaining", () => {
  const rows = Array.from({ length: 45 }, (_, i) => row("r" + i, `p${i}@x.com`, i));
  const r = planBulkApproval(rows);
  assert.equal(r.batch.length, BULK_APPROVE_MAX);
  assert.equal(r.remaining, 45 - BULK_APPROVE_MAX);
  assert.equal(r.batch[0].id, "r44"); // the oldest
});

test("nothing pending gives an empty plan", () => {
  assert.deepEqual(planBulkApproval([]), { batch: [], skippedDisposable: 0, remaining: 0 });
});

test("does not modify the list it was given", () => {
  const rows = [row("a", "a@x.com", 1), row("b", "b@x.com", 2)];
  planBulkApproval(rows);
  assert.deepEqual(rows.map((r) => r.id), ["a", "b"]);
});
