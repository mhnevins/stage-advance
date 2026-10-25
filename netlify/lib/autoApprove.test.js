// Run with: node --test netlify/lib/autoApprove.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { decideAutoApproval, isDisposable, LIMITS } from "./autoApprove.js";

const NOW = Date.parse("2026-10-24T22:00:00Z");

// In-memory stand-in for the database + invite + Slack.
function fakeStore({ setting = "on", request = "default", hourly = 0, daily = 0, inviteResult = { error: null },
  inviteThrows = false, releaseThrows = false, settingThrows = false } = {}) {
  const row = request === "default"
    ? { id: "r1", status: "pending", created_at: new Date(NOW - 60_000).toISOString(), first_name: "Pat", last_name: "Q" }
    : request;
  const calls = { invites: [], claims: 0, releases: 0, notes: [] };
  return {
    calls, row,
    async getSetting() { if (settingThrows) throw new Error("db down"); return setting; },
    async findRequest() { return row ? { ...row } : null; },
    async countApproved({ autoOnly }) { return autoOnly ? daily : hourly; },
    async claim() { calls.claims++; if (row.status !== "pending") return false; row.status = "approved"; return true; },
    async release() { calls.releases++; if (releaseThrows) throw new Error("nope"); row.status = "pending"; },
    async invite(email) { calls.invites.push(email); if (inviteThrows) throw new Error("smtp"); return inviteResult; },
    async notify(t) { calls.notes.push(t); },
  };
}
const run = (store, over = {}) =>
  decideAutoApproval({ email: "Pat@Example.com", elapsedMs: 15_000, store, now: NOW, ...over });

test("happy path: invites exactly once, normalises the email, tells Slack", async () => {
  const s = fakeStore();
  const r = await run(s);
  assert.deepEqual(r, { approved: true });
  assert.deepEqual(s.calls.invites, ["pat@example.com"]);
  assert.equal(s.row.status, "approved");
  assert.match(s.calls.notes[0], /Auto-approved/);
});

test("kill switch off (or missing row) means no invite and no claim", async () => {
  for (const setting of ["off", null, "ON", "yes", ""]) {
    const s = fakeStore({ setting });
    const r = await run(s);
    assert.equal(r.approved, false, `setting=${setting}`);
    assert.equal(r.reason, "off");
    assert.equal(s.calls.invites.length + s.calls.claims, 0);
  }
});

test("fails closed if the settings read errors", async () => {
  const s = fakeStore({ settingThrows: true });
  const r = await run(s);
  assert.equal(r.approved, false);
  assert.equal(s.calls.invites.length, 0);
  assert.equal(s.row.status, "pending");
});

test("only acts on an existing, pending, fresh request", async () => {
  let s = fakeStore({ request: null });
  assert.equal((await run(s)).reason, "no_request");
  s = fakeStore({ request: { id: "x", status: "declined", created_at: new Date(NOW).toISOString(), first_name: "A", last_name: "B" } });
  assert.equal((await run(s)).reason, "not_pending");
  s = fakeStore({ request: { id: "x", status: "pending", created_at: new Date(NOW - LIMITS.freshMs - 1000).toISOString(), first_name: "A", last_name: "B" } });
  assert.equal((await run(s)).reason, "stale");
  assert.equal(s.calls.invites.length, 0);
});

test("rejects malformed addresses", async () => {
  for (const email of ["", "nope", "a@b", "a b@c.com", "x".repeat(260) + "@a.com"]) {
    const s = fakeStore();
    assert.equal((await run(s, { email })).approved, false, email);
    assert.equal(s.calls.invites.length, 0);
  }
});

test("disposable domains are held and flagged, including subdomains", async () => {
  assert.equal(isDisposable("a@mailinator.com"), true);
  assert.equal(isDisposable("a@x.mailinator.com"), true);
  assert.equal(isDisposable("a@notmailinator.com"), false);
  assert.equal(isDisposable("a@gmail.com"), false);
  const s = fakeStore();
  const r = await run(s, { email: "bot@yopmail.com" });
  assert.equal(r.reason, "disposable");
  assert.equal(s.calls.invites.length, 0);
  assert.equal(s.row.status, "pending");
  assert.match(s.calls.notes[0], /Not auto-approved/);
});

test("instant (bot-speed) or missing timing is held", async () => {
  for (const elapsedMs of [0, 500, LIMITS.minFillMs - 1, undefined, "abc", null]) {
    const s = fakeStore();
    const r = await run(s, { elapsedMs });
    assert.equal(r.reason, "too_fast", String(elapsedMs));
    assert.equal(s.calls.invites.length, 0);
  }
  assert.equal((await run(fakeStore(), { elapsedMs: LIMITS.minFillMs })).approved, true);
});

test("hourly and daily caps hold the request (and the boundary is exact)", async () => {
  let s = fakeStore({ hourly: LIMITS.perHour });
  assert.equal((await run(s)).reason, "hourly_cap");
  s = fakeStore({ hourly: LIMITS.perHour - 1 });
  assert.equal((await run(s)).approved, true);
  s = fakeStore({ daily: LIMITS.perDay });
  assert.equal((await run(s)).reason, "daily_cap");
  s = fakeStore({ daily: LIMITS.perDay - 1 });
  assert.equal((await run(s)).approved, true);
});

test("two simultaneous calls for the same request send only one invite", async () => {
  const s = fakeStore();
  const [a, b] = await Promise.all([run(s), run(s)]);
  assert.equal(s.calls.invites.length, 1);
  assert.deepEqual([a.approved, b.approved].sort(), [false, true]);
});

test("a failed invite puts the request back to pending and says so", async () => {
  for (const s of [fakeStore({ inviteResult: { error: new Error("rate limit") } }), fakeStore({ inviteThrows: true })]) {
    const r = await run(s);
    assert.equal(r.approved, false);
    assert.equal(r.reason, "invite_failed");
    assert.equal(s.row.status, "pending");
    assert.equal(s.calls.releases, 1);
    assert.match(s.calls.notes[0], /invite email failed/);
  }
});

test("if the request can't be put back after a failed invite, Slack is told to reset it", async () => {
  const s = fakeStore({ inviteThrows: true, releaseThrows: true });
  const r = await run(s);
  assert.equal(r.approved, false);
  assert.match(s.calls.notes[0], /Reset to pending/);
});
