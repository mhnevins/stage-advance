// Run with: node --test src/lib/channelColor.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveChannelColor } from "./channelColor.js";

const boxes = [{ id: "b1", color: "#112233" }, { id: "b2", color: "" }];
const grp = (g) => ({ Drums: "#E8B93E", Vocals: "#3E7BE8" }[g] || "#999");

test("default (option off): group color, even when the channel is in a box", () => {
  assert.equal(resolveChannelColor({ group: "Drums", boxId: "b1" }, boxes, false, grp), "#E8B93E");
  assert.equal(resolveChannelColor({ group: "Drums", boxId: "b1" }, boxes, undefined, grp), "#E8B93E");
});

test("option on: a channel in a box shows the box color", () => {
  assert.equal(resolveChannelColor({ group: "Drums", boxId: "b1" }, boxes, true, grp), "#112233");
});

test("option on: a channel with no box keeps its group color", () => {
  assert.equal(resolveChannelColor({ group: "Vocals", boxId: null }, boxes, true, grp), "#3E7BE8");
});

test("a color set by hand always wins, option on or off", () => {
  const c = { group: "Drums", boxId: "b1", color: "#abcdef" };
  assert.equal(resolveChannelColor(c, boxes, true, grp), "#abcdef");
  assert.equal(resolveChannelColor(c, boxes, false, grp), "#abcdef");
});

test("option on but the box is missing or has no color: falls back to the group color", () => {
  assert.equal(resolveChannelColor({ group: "Drums", boxId: "gone" }, boxes, true, grp), "#E8B93E");
  assert.equal(resolveChannelColor({ group: "Drums", boxId: "b2" }, boxes, true, grp), "#E8B93E");
  assert.equal(resolveChannelColor({ group: "Drums", boxId: "b1" }, undefined, true, grp), "#E8B93E");
});
