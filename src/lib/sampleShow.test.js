// Run with: node --test src/lib/sampleShow.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSampleShow } from "./sampleShow.js";
import { withOutputPositions } from "./outputPositions.js";

let n = 0;
const uid = () => `id${++n}`;
const blank = { id: "show1", band: "", date: "", venue: "", contact: "", monitors: "", notes: "", channels: [], boxes: [], outputs: [], outputBoxes: [] };
const make = () => buildSampleShow(uid, blank);

test("it is a normal show: keeps the blank show's id and fields, flagged as a sample", () => {
  const s = make();
  assert.equal(s.id, "show1");
  assert.equal(s.sample, true);
  assert.equal(s.band, "Sample Band");
  assert.ok(s.channels.length >= 14);
});

test("Michael's corrections 2026-11-19: snare top on a boom, straight hi-hat, e906 amp, keys L and R", () => {
  const by = (name) => make().channels.find((c) => c.name === name);
  assert.deepEqual([by("Snare Top").mic, by("Snare Top").stand], ["SM57", "Short boom"]);
  assert.equal(by("Hi-Hat").stand, "Straight");
  assert.deepEqual([by("Electric Gtr").mic, by("Electric Gtr").stand], ["e906", "Short boom"]);
  assert.ok(by("Keys L") && by("Keys R"));
  assert.equal(make().channels.some((c) => /L\/R/.test(c.name)), false);
});

test("every channel has an id, a box that exists, and 48V set on the condensers and the active DI", () => {
  const s = make();
  const boxIds = new Set(s.boxes.map((b) => b.id));
  assert.equal(new Set(s.channels.map((c) => c.id)).size, s.channels.length);
  for (const c of s.channels) assert.ok(boxIds.has(c.boxId), c.name);
  const on = s.channels.filter((c) => c.phantom).map((c) => c.name).sort();
  assert.deepEqual(on, ["Bass DI", "Hi-Hat", "OH L", "OH R"]);
});

test("two stage boxes; drums on the DrumDrop, everything else on the Main box", () => {
  const s = make();
  assert.equal(s.boxes.length, 2);
  const drums = s.boxes.find((b) => b.name === "DrumDrop");
  assert.ok(s.channels.filter((c) => c.group === "Drums").every((c) => c.boxId === drums.id));
  assert.ok(s.channels.filter((c) => c.group !== "Drums").every((c) => c.boxId !== drums.id));
});

test("the DrumDrop ND only has 8 inputs, so exactly 8 drum channels go on it (no Snare Bottom)", () => {
  const s = make();
  const drums = s.boxes.find((b) => b.name === "DrumDrop");
  assert.equal(s.channels.filter((c) => c.boxId === drums.id).length, 8);
  assert.equal(s.channels.length, 15);
  assert.equal(s.channels.some((c) => c.name === "Snare Bottom"), false);
});

test("sampleMics lists each mic once and covers every channel's mic", () => {
  const s = make();
  assert.equal(new Set(s.sampleMics).size, s.sampleMics.length);
  for (const c of s.channels) assert.ok(s.sampleMics.includes(c.mic), c.mic);
});

test("outputs: Main is a linked L/R pair; the Aux lines return on the S16 output box", () => {
  const s = make();
  assert.equal(s.outputs[0].linkedDown, true);
  assert.equal(s.outputs[1].linkedDown, false);
  const placed = withOutputPositions(s.outputs, (id) => s.outputBoxes.some((b) => b.id === id));
  assert.deepEqual(placed.map((o) => o._rtnPos), [null, null, 1, 2, 3]);
});

test("two builds never share ids (a second sample show after deleting the first is independent)", () => {
  const a = make(), b = make();
  const ids = new Set([...a.channels, ...b.channels].map((c) => c.id));
  assert.equal(ids.size, a.channels.length + b.channels.length);
});
