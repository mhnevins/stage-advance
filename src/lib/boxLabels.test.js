// Run with: node --test src/lib/boxLabels.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { positionText, boxPositionLabel } from "./boxLabels.js";

test("numbers style is just the number", () => {
  assert.equal(positionText(1), "1");
  assert.equal(positionText(12, "num"), "12");
  assert.equal(positionText(5, undefined), "5");
});

test("letters style: A-Z, then AA, AB... like a spreadsheet", () => {
  assert.deepEqual([1, 2, 3, 8].map((n) => positionText(n, "alpha")), ["A", "B", "C", "H"]);
  assert.equal(positionText(26, "alpha"), "Z");
  assert.equal(positionText(27, "alpha"), "AA");
  assert.equal(positionText(28, "alpha"), "AB");
  assert.equal(positionText(48, "alpha"), "AV");
});

test("letters style never produces junk for odd input", () => {
  assert.equal(positionText(0, "alpha"), "0");
  assert.equal(positionText(-3, "alpha"), "-3");
  assert.equal(positionText(NaN, "alpha"), "NaN");
});

test("THE REPORTED BUG: a box named 'Box 1' no longer prints as Box 11, 12, 13", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => boxPositionLabel("Box 1", n)),
    ["Box 1-1", "Box 1-2", "Box 1-3", "Box 1-4", "Box 1-5"]);
});

test("one-letter box with numbers keeps the compact style users already have", () => {
  assert.equal(boxPositionLabel("A", 3), "A3");
  assert.equal(boxPositionLabel("c", 12), "c12");
});

test("anything else gets a hyphen", () => {
  assert.equal(boxPositionLabel("AES", 1), "AES-1");
  assert.equal(boxPositionLabel("Local", 1), "Local-1");
  assert.equal(boxPositionLabel("SL", 4), "SL-4");
  assert.equal(boxPositionLabel("1", 1), "1-1");
  assert.equal(boxPositionLabel("12", 3), "12-3");
});

test("a numeric box name can no longer collide: (1, 11) vs (11, 1)", () => {
  assert.notEqual(boxPositionLabel("1", 11), boxPositionLabel("11", 1));
});

test("lettered positions: always hyphenated, including one-letter boxes", () => {
  assert.equal(boxPositionLabel("Returns", 3, "alpha"), "Returns-C");
  assert.equal(boxPositionLabel("Box 1", 1, "alpha"), "Box 1-A");
  assert.equal(boxPositionLabel("A", 3, "alpha"), "A-C"); // "AC" would be ambiguous
});

test("a box with no name yet just shows the position; names are trimmed", () => {
  assert.equal(boxPositionLabel("", 2), "2");
  assert.equal(boxPositionLabel("   ", 2, "alpha"), "B");
  assert.equal(boxPositionLabel(undefined, 7), "7");
  assert.equal(boxPositionLabel("Box 1 ", 2), "Box 1-2");
});
