/*
 * How a stage-box line is written: box name + position within that box,
 * e.g. "A3", "Box 1-2", "Returns-C".
 *
 * Why this exists: labels used to be `${boxName}${position}` with nothing
 * between them. That's fine for a one-letter box ("A" + 3 = "A3") but a
 * box named "Box 1" printed its lines as "Box 11", "Box 12"... — and is
 * genuinely ambiguous ("1" + "11" vs "11" + "1").
 *
 * Rule (decided 2026-11-02, deliberately the minimal change — a hyphen on
 * EVERY label, including "A-3", was considered and held back to see if
 * it's needed):
 *   - a one-letter box name with numeric positions stays compact: A3
 *   - everything else gets a hyphen: Box 1-1, AES-1, Local-1, Returns-C
 *
 * Positions are always stored as plain numbers (1, 2, 3...). A box's
 * "position style" only changes how that number is DISPLAYED — numbers
 * (1, 2, 3...) or letters (A, B, C...), for gear whose jacks are lettered
 * (e.g. the A-H returns on an analog stage box). So switching a box's
 * style later relabels everything consistently and never touches data.
 */

export const POS_STYLES = [
  ["num", "Numbers 1, 2, 3…"],
  ["alpha", "Letters A, B, C…"],
];

/** 1 -> "1" (numbers) or "A" (letters). Letters continue AA, AB... like a spreadsheet. */
export function positionText(n, style = "num") {
  if (style !== "alpha") return String(n);
  let x = Math.floor(Number(n));
  if (!(x >= 1)) return String(n);
  let s = "";
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/** The full label for one box line, e.g. ("Box 1", 2) -> "Box 1-2". */
export function boxPositionLabel(name, n, style = "num") {
  const nm = (name ?? "").trim();
  const pos = positionText(n, style);
  if (!nm) return pos;
  const compact = /^[A-Za-z]$/.test(nm) && style !== "alpha";
  return compact ? `${nm}${pos}` : `${nm}-${pos}`;
}
