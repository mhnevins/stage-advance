// Run with: node --test src/lib/restore.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBackup, planRestore, applyRestore, BACKUP_FORMAT } from "./restore.js";

const show = (id, band, extra = {}) => ({
  id, band, date: "", venue: "", contact: "", monitors: "", notes: "",
  channels: [{ id: "c1", name: "Kick", mic: "D6", phantom: false }],
  boxes: [], outputs: [], outputBoxes: [], updated: 1, ...extra,
});
const file = (over = {}) => JSON.stringify({
  exportedAt: "2026-10-06T00:00:00Z",
  profile: { id: "x" },
  inventory: [{ id: "i1", label: "SM58", qty: 6, type: "dynamic", needs_phantom: false, use_cases: ["lead-vocal"] }],
  endpoints: [{ id: "e1", label: "QSC K12.2", qty: 6, type: "Powered Speaker" }],
  shows: [show("a", "Show A"), show("b", "Show B")],
  settings: { groupColors: { Drums: "#D64545", Bass: "#E8B93E" }, customOutputChips: [{ id: "k", name: "Matrix", stereo: true }] },
  submissions: [{ id: "s1", band: "Inbox item" }],
  ...over,
});
const empty = { shows: [], inventoryItems: [], endpointItems: [], groupColors: {}, customOutputChips: [] };
const ok = (text) => { const r = parseBackup(text); assert.ok(r.ok, r.error); return r; };

/* ——— parsing / validation ——— */

test("a normal export parses; submissions are ignored", () => {
  const { backup, skipped } = ok(file());
  assert.equal(backup.shows.length, 2);
  assert.equal(backup.inventory[0].label, "SM58");
  assert.equal(skipped, 0);
  assert.equal("submissions" in backup, false);
});

test("rejects things that aren't backups, with plain-language errors", () => {
  for (const bad of ["", "   ", "not json {", "[]", "42", "null", JSON.stringify({ hello: "world" })]) {
    const r = parseBackup(bad);
    assert.equal(r.ok, false, `should reject: ${bad}`);
    assert.ok(r.error.length > 10);
  }
  assert.equal(parseBackup(JSON.stringify({ format: "something-else", shows: [] })).ok, false);
  const newer = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 99, shows: [] }));
  assert.equal(newer.ok, false);
  assert.match(newer.error, /newer version/);
});

test("accepts files without a format marker (exports made before it existed)", () => {
  assert.ok(parseBackup(file()).ok);
});

test("damaged records are skipped and counted, never crash", () => {
  const { backup, skipped } = ok(file({
    shows: [show("a", "Good"), null, "junk", 7, { id: 5, band: 9, channels: "nope", outputs: null }],
    inventory: [{ label: "" }, { qty: 3 }, null, { label: "OK", qty: -4 }, { label: "Frac", qty: 2.9 }],
    endpoints: [{ label: "   " }],
    settings: { groupColors: { Drums: "red", Bass: "#12345", Keys: "#4E8FD1" }, customOutputChips: [{ name: "" }, null] },
  }));
  assert.equal(backup.shows.length, 2, "the good show and one coerced show survive");
  const coerced = backup.shows[1];
  assert.equal(typeof coerced.id, "string");
  assert.ok(coerced.id.length > 0);
  assert.equal(coerced.band, "");
  assert.deepEqual(coerced.channels, []);
  assert.deepEqual(coerced.outputs, []);
  assert.deepEqual(backup.inventory.map((i) => [i.label, i.qty]), [["OK", 0], ["Frac", 2]]);
  assert.deepEqual(backup.groupColors, { Keys: "#4E8FD1" });
  assert.equal(backup.endpoints.length, 0);
  assert.ok(skipped >= 7);
});

test("duplicate show ids inside one file keep only the first", () => {
  const { backup } = ok(file({ shows: [show("a", "First"), show("a", "Second")] }));
  assert.equal(backup.shows.length, 1);
  assert.equal(backup.shows[0].band, "First");
});

test("hostile content stays inert text (no code paths evaluate it)", () => {
  const { backup } = ok(file({ shows: [show("a", "<img src=x onerror=alert(1)>", { notes: "__proto__" })], inventory: [{ label: "constructor", qty: 1 }] }));
  assert.equal(backup.shows[0].band, "<img src=x onerror=alert(1)>");
  assert.equal(backup.inventory[0].label, "constructor");
  assert.equal(({}).polluted, undefined);
});

/* ——— planning ——— */

test("restoring into an empty account: everything is new and pre-selected", () => {
  const plan = planRestore(ok(file()).backup, empty);
  assert.deepEqual(plan.counts, { new: 7, differs: 0, same: 0 }); // 2 shows + 1 inv + 1 ep + 2 colors + 1 chip
  assert.equal(plan.defaultSelected.size, 7);
});

test("restoring into an identical account: nothing to do", () => {
  const b = ok(file()).backup;
  const current = {
    shows: b.shows,
    inventoryItems: [{ id: "x", label: "SM58", qty: 6, type: "dynamic", needs_phantom: false, use_cases: ["lead-vocal"] }],
    endpointItems: [{ id: "y", label: "QSC K12.2", qty: 6, type: "Powered Speaker" }],
    groupColors: { Drums: "#d64545", Bass: "#E8B93E" },
    customOutputChips: [{ id: "z", name: "matrix", stereo: true }],
  };
  const plan = planRestore(b, current);
  assert.deepEqual(plan.counts, { new: 0, differs: 0, same: 7 });
  assert.equal(plan.defaultSelected.size, 0);
});

test("a show that exists but differs is 'differs', unselected by default; 'updated' timestamp alone is not a difference", () => {
  const b = ok(file()).backup;
  const plan = planRestore(b, { ...empty, shows: [
    { ...b.shows[0], updated: 999 },                 // only the timestamp differs → same
    { ...b.shows[1], band: "Show B (edited)" },      // real difference
  ] });
  const [a, bb] = plan.sections.shows;
  assert.equal(a.status, "same");
  assert.equal(bb.status, "differs");
  assert.equal(plan.defaultSelected.has(bb.key), false);
});

test("a deleted show comes back as 'new' with its original id", () => {
  const b = ok(file()).backup;
  const plan = planRestore(b, { ...empty, shows: [b.shows[0]] });
  assert.equal(plan.sections.shows[1].status, "new");
});

test("colors for groups the app doesn't have are ignored", () => {
  const b = ok(file({ settings: { groupColors: { Drums: "#D64545", Bogus: "#000000" } } })).backup;
  const plan = planRestore(b, empty, { validGroups: ["Drums", "Bass"] });
  assert.deepEqual(plan.sections.colors.map((c) => c.label), ["Drums"]);
});

/* ——— applying ——— */

function fakeDeps({ failOn = [] } = {}) {
  const calls = [];
  const maybeFail = (name) => { if (failOn.includes(name)) throw new Error(`boom ${name}`); };
  return {
    calls,
    addShows: (list) => calls.push(["addShows", list.map((s) => [s.id, s.band])]),
    addInventory: async (label, qty, tags) => { maybeFail(label); calls.push(["addInventory", label, qty, tags]); },
    updateInventory: async (id, patch) => { calls.push(["updateInventory", id, patch]); },
    addEndpoint: async (label, qty, type) => { maybeFail(label); calls.push(["addEndpoint", label, qty, type]); },
    updateEndpoint: async (id, patch) => { calls.push(["updateEndpoint", id, patch]); },
    updateColors: async (map) => { maybeFail("colors"); calls.push(["updateColors", map]); },
    addChips: async (chips) => { calls.push(["addChips", chips]); },
  };
}

test("applies exactly what's selected, in display order, and nothing else", async () => {
  const b = ok(file()).backup;
  const plan = planRestore(b, empty);
  const deps = fakeDeps();
  const sel = new Set(plan.sections.shows.map((s) => s.key)); // shows only
  const r = await applyRestore(plan, sel, deps);
  assert.deepEqual(deps.calls, [["addShows", [["a", "Show A"], ["b", "Show B"]]]]);
  assert.deepEqual(r.restored, { shows: 2, inventory: 0, endpoints: 0, colors: 0, chips: 0 });
  assert.deepEqual(r.failed, []);
});

test("full restore into empty account", async () => {
  const plan = planRestore(ok(file()).backup, empty);
  const deps = fakeDeps();
  const r = await applyRestore(plan, plan.defaultSelected, deps);
  assert.deepEqual(r.restored, { shows: 2, inventory: 1, endpoints: 1, colors: 2, chips: 1 });
  const names = deps.calls.map((c) => c[0]);
  assert.deepEqual(names, ["addShows", "addInventory", "addEndpoint", "updateColors", "addChips"]);
  assert.deepEqual(deps.calls.find((c) => c[0] === "addInventory")[3],
    { type: "dynamic", needs_phantom: false, use_cases: ["lead-vocal"] });
});

test("a differing show is restored as a separate copy with a new id; the original is untouched", async () => {
  const b = ok(file()).backup;
  const plan = planRestore(b, { ...empty, shows: [{ ...b.shows[0], band: "Edited since backup" }] });
  const item = plan.sections.shows[0];
  assert.equal(item.status, "differs");
  const deps = fakeDeps();
  await applyRestore(plan, new Set([item.key]), deps, { makeId: () => "newid01" });
  assert.deepEqual(deps.calls[0], ["addShows", [["newid01", "Show A (restored)"]]]);
});

test("a 'differs' inventory item only replaces when the user opted in, and uses the existing row id", async () => {
  const b = ok(file()).backup;
  const current = { ...empty, inventoryItems: [{ id: "row-9", label: "SM58", qty: 2, type: "dynamic", needs_phantom: false, use_cases: [] }] };
  const plan = planRestore(b, current);
  const item = plan.sections.inventory[0];
  assert.equal(item.status, "differs");
  assert.equal(plan.defaultSelected.has(item.key), false);
  const deps = fakeDeps();
  await applyRestore(plan, new Set([item.key]), deps);
  assert.deepEqual(deps.calls[0], ["updateInventory", "row-9", { qty: 6, type: "dynamic", needs_phantom: false, use_cases: ["lead-vocal"] }]);
});

test("'same' items are never written even if somehow selected", async () => {
  const b = ok(file()).backup;
  const plan = planRestore(b, { ...empty, shows: b.shows });
  const deps = fakeDeps();
  const all = new Set(plan.sections.shows.map((s) => s.key));
  await applyRestore(plan, all, deps);
  assert.equal(deps.calls.length, 0);
});

test("one failure never blocks the rest, and is reported by name", async () => {
  const plan = planRestore(ok(file({
    inventory: [{ label: "Bad Mic", qty: 1 }, { label: "Good Mic", qty: 1 }],
  })).backup, empty);
  const deps = fakeDeps({ failOn: ["Bad Mic", "colors"] });
  const r = await applyRestore(plan, plan.defaultSelected, deps);
  assert.deepEqual(r.failed.map((f) => f.label), ["Bad Mic", "Group colors"]);
  assert.equal(r.restored.inventory, 1);
  assert.equal(r.restored.shows, 2);
  assert.equal(r.restored.chips, 1);
  assert.ok(deps.calls.some((c) => c[0] === "addInventory" && c[1] === "Good Mic"));
});

test("nothing is ever deleted: the deps interface has no delete", async () => {
  const plan = planRestore(ok(file()).backup, empty);
  const deps = fakeDeps();
  await applyRestore(plan, plan.defaultSelected, deps);
  assert.equal(deps.calls.some((c) => /remove|delete/i.test(c[0])), false);
  assert.equal(Object.keys(deps).some((k) => /remove|delete/i.test(k)), false);
});
