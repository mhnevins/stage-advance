// Run with: node --test src/lib/showsSync.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createShowsSync } from "./showsSync.js";

// A fake server: Map id -> { show, version }. Versions are strings that
// change on every successful write, like updated_at does.
function fakeApi({ failNext = 0, delayMs = 0 } = {}) {
  let ver = 0;
  const db = new Map();
  const calls = [];
  const api = {
    db, calls,
    failNext,
    async create(show) {
      calls.push(["create", show.id]);
      await new Promise((r) => setTimeout(r, delayMs));
      if (api.failNext > 0) { api.failNext--; throw new Error("network"); }
      if (db.has(show.id)) return { ok: false };
      const v = `v${++ver}`;
      db.set(show.id, { show: structuredClone(show), version: v });
      return { ok: true, version: v };
    },
    async save(show, expected) {
      calls.push(["save", show.id, expected]);
      await new Promise((r) => setTimeout(r, delayMs));
      if (api.failNext > 0) { api.failNext--; throw new Error("network"); }
      const row = db.get(show.id);
      if (!row || row.version !== expected) return { ok: false };
      const v = `v${++ver}`;
      db.set(show.id, { show: structuredClone(show), version: v });
      return { ok: true, version: v };
    },
    async remove(id) { calls.push(["remove", id]); db.delete(id); },
  };
  return api;
}

function setup(apiOpts, syncOpts = {}) {
  const api = fakeApi(apiOpts);
  const shows = new Map();
  const events = { conflicts: [], errors: [], oks: 0 };
  const sync = createShowsSync({
    api,
    getShow: (id) => shows.get(id),
    onConflict: (id) => events.conflicts.push(id),
    onSaveError: (e) => events.errors.push(e),
    onSaveOk: () => events.oks++,
    debounceMs: 20,
    retryMs: 30,
    ...syncOpts,
  });
  return { api, shows, sync, events };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("loading never writes anything", async () => {
  const { api, sync } = setup();
  sync.setBaseline([{ id: "a", version: "v0" }]);
  await sync.flushNow();
  assert.equal(api.calls.length, 0);
});

test("a new show is created once, then later edits save against the returned version", async () => {
  const { api, shows, sync } = setup();
  shows.set("a", { id: "a", band: "One" });
  sync.markDirty("a", { immediate: true });
  await sync.flushNow();
  assert.deepEqual(api.calls, [["create", "a"]]);
  shows.set("a", { id: "a", band: "Two" });
  sync.markDirty("a");
  await sync.flushNow();
  assert.deepEqual(api.calls[1], ["save", "a", "v1"]);
  assert.equal(api.db.get("a").show.band, "Two");
});

test("rapid edits are debounced into a single save", async () => {
  const { api, shows, sync } = setup();
  api.db.set("a", { show: { id: "a" }, version: "v0" });
  sync.setBaseline([{ id: "a", version: "v0" }]);
  for (const band of ["x", "xy", "xyz"]) {
    shows.set("a", { id: "a", band });
    sync.markDirty("a");
  }
  await wait(80);
  assert.equal(api.calls.filter((c) => c[0] === "save").length, 1);
  assert.equal(api.db.get("a").show.band, "xyz");
});

test("only edited shows are written — untouched shows are never sent", async () => {
  const { api, shows, sync } = setup();
  for (const id of ["a", "b", "c"]) api.db.set(id, { show: { id }, version: "v0" });
  sync.setBaseline(["a", "b", "c"].map((id) => ({ id, version: "v0" })));
  shows.set("b", { id: "b", band: "edited" });
  sync.markDirty("b");
  await sync.flushNow();
  assert.deepEqual(api.calls.map((c) => c[1]), ["b"]);
});

test("THE BUG: a stale tab cannot overwrite or delete shows it never saw", async () => {
  // Tab A and Tab B both loaded show "a". Tab B then creates show "new".
  // Tab A (stale: doesn't know "new") edits "a" and saves.
  const { api, shows, sync } = setup();
  api.db.set("a", { show: { id: "a", band: "orig" }, version: "v0" });
  sync.setBaseline([{ id: "a", version: "v0" }]);
  api.db.set("new", { show: { id: "new", band: "made in tab B" }, version: "v9" });
  shows.set("a", { id: "a", band: "edited in tab A" });
  sync.markDirty("a");
  await sync.flushNow();
  assert.equal(api.db.get("new").show.band, "made in tab B", "other tab's new show must survive");
  assert.equal(api.db.get("a").show.band, "edited in tab A");
});

test("same show edited elsewhere -> conflict reported, nothing overwritten, saving stops", async () => {
  const { api, shows, sync, events } = setup();
  api.db.set("a", { show: { id: "a", band: "orig" }, version: "v0" });
  sync.setBaseline([{ id: "a", version: "v0" }]);
  api.db.set("a", { show: { id: "a", band: "changed elsewhere" }, version: "v5" });
  shows.set("a", { id: "a", band: "my stale edit" });
  sync.markDirty("a");
  await sync.flushNow();
  assert.deepEqual(events.conflicts, ["a"]);
  assert.equal(api.db.get("a").show.band, "changed elsewhere");
  const before = api.calls.length;
  sync.markDirty("a");
  await sync.flushNow();
  assert.equal(api.calls.length, before, "no further writes after a conflict");
});

test("show deleted elsewhere + edited here -> conflict, not silently re-created", async () => {
  const { api, shows, sync, events } = setup();
  sync.setBaseline([{ id: "a", version: "v0" }]); // server has no "a" anymore
  shows.set("a", { id: "a" });
  sync.markDirty("a");
  await sync.flushNow();
  assert.deepEqual(events.conflicts, ["a"]);
  assert.equal(api.db.has("a"), false);
});

test("network failure keeps the edit and retries automatically", async () => {
  const { api, shows, sync, events } = setup({ failNext: 1 });
  shows.set("a", { id: "a", band: "x" });
  sync.markDirty("a", { immediate: true });
  await wait(120);
  assert.equal(events.errors.length, 1);
  assert.equal(api.db.get("a").show.band, "x", "retry should have succeeded");
  assert.ok(events.oks >= 1);
});

test("an edit made while a save is in flight is saved afterwards with the fresh version", async () => {
  const { api, shows, sync } = setup({ delayMs: 40 });
  api.db.set("a", { show: { id: "a" }, version: "v0" });
  sync.setBaseline([{ id: "a", version: "v0" }]);
  shows.set("a", { id: "a", band: "first" });
  sync.markDirty("a", { immediate: true });
  await wait(15); // first save is now in flight
  shows.set("a", { id: "a", band: "second" });
  sync.markDirty("a", { immediate: true });
  await wait(250);
  const saves = api.calls.filter((c) => c[0] === "save");
  assert.equal(saves.length, 2);
  assert.equal(saves[1][2], "v1", "second save must use the version returned by the first");
  assert.equal(api.db.get("a").show.band, "second");
});

test("delete: removes a persisted show; never-persisted shows make no API call", async () => {
  const { api, shows, sync } = setup();
  api.db.set("a", { show: { id: "a" }, version: "v0" });
  sync.setBaseline([{ id: "a", version: "v0" }]);
  await sync.remove("a");
  assert.equal(api.db.has("a"), false);

  shows.set("tmp", { id: "tmp" });
  sync.markDirty("tmp"); // created locally, not yet flushed...
  await sync.remove("tmp"); // ...and deleted before it ever saved
  await sync.flushNow();
  assert.equal(api.calls.filter((c) => c[1] === "tmp").length, 0);
});

test("a show missing from the list is never treated as a delete", async () => {
  const { api, sync } = setup();
  api.db.set("a", { show: { id: "a" }, version: "v0" });
  sync.setBaseline([{ id: "a", version: "v0" }]);
  await sync.flushNow(); // list is empty in memory — nothing must be removed
  assert.equal(api.db.has("a"), true);
  assert.equal(api.calls.filter((c) => c[0] === "remove").length, 0);
});

test("dispose stops everything", async () => {
  const { api, shows, sync } = setup();
  shows.set("a", { id: "a" });
  sync.markDirty("a");
  sync.dispose();
  await wait(60);
  assert.equal(api.calls.length, 0);
});
