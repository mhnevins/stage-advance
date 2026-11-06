/*
 * Where each output line lands. Pulled out of App.jsx so the numbering
 * rules can be unit tested (outputPositions.test.js).
 *
 * An output has up to TWO placements, matching how an analog console +
 * snake + stage box actually works:
 *   1. Console output — `boxId` / `boxPos`. Where the output channel is
 *      assigned on the console: the built-in "Local" (the console's own
 *      physical output, e.g. Local-15), or a named box like AES or Dante.
 *      Defaults to "Local" when no box is chosen.
 *   2. Stage box return — `rtnBoxId` / `rtnPos`. Optional. Which jack of a
 *      stage box that signal comes up on (e.g. return A on the Seismic box).
 *      Blank unless the user sets it, so nothing changes for anyone who
 *      doesn't use it.
 *
 * In both, the position defaults to the line's order within its box
 * ("override always wins, sensible default otherwise") and can be set by
 * hand to any number.
 */

export const OUTPUT_LOCAL_BOX = "__local";

/** `boxExists(id)` says whether a return box id still points at a real box. */
export function withOutputPositions(outputs, boxExists = () => true) {
  const consoleCounters = {};
  const returnCounters = {};
  return outputs.map((o) => {
    const boxId = o.boxId || OUTPUT_LOCAL_BOX;
    consoleCounters[boxId] = (consoleCounters[boxId] || 0) + 1;

    let _rtnPos = null;
    if (o.rtnBoxId && boxExists(o.rtnBoxId)) {
      returnCounters[o.rtnBoxId] = (returnCounters[o.rtnBoxId] || 0) + 1;
      _rtnPos = o.rtnPos ?? returnCounters[o.rtnBoxId];
    }
    return { ...o, _boxId: boxId, _boxPos: o.boxPos ?? consoleCounters[boxId], _rtnPos };
  });
}
