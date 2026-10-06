/*
 * Restore from a backup file (the JSON that Settings → "Export my data"
 * produces). Pure logic, no React or network, so it can be unit tested
 * (restore.test.js) — the UI is components/RestoreBackup.jsx and the
 * actual writes are injected (see applyRestore's `deps`).
 *
 * Safety rules — restore is the one feature that must never make
 * someone's data worse:
 *  - Add-only by default. Nothing is deleted, ever.
 *  - The user reviews a plan first; only items they leave checked are
 *    applied. Items missing from the account are pre-checked; items that
 *    already exist but DIFFER are unchecked until the user opts in.
 *  - A show is never overwritten. A backed-up show that differs from the
 *    current one with the same id can only be restored as a separate
 *    copy ("… (restored)").
 *  - Everything in the file is treated as untrusted input: shapes are
 *    validated and coerced, so a hand-edited or damaged file can't push
 *    junk into the account. Writes still go through the normal
 *    RLS-protected APIs for the signed-in user.
 *  - Band-form submissions are in the export but deliberately not
 *    restored: they're an inbox, and restoring could resurrect ones the
 *    user dismissed.
 */

export const BACKUP_FORMAT = "stageadvance-backup";
export const BACKUP_VERSION = 1;
const MAX_BYTES = 8 * 1024 * 1024;

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const asStr = (v) => (typeof v === "string" ? v : "");
const asArr = (v) => (Array.isArray(v) ? v : []);
const defaultMakeId = () => Math.random().toString(36).slice(2, 9);

/* Stable stringify (sorted keys) so "same content, different key order"
   compares equal. */
const canon = (v) => {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
};

/* ——— normalizers: coerce one untrusted record into the app's shape ——— */

function normalizeShow(raw, makeId) {
  if (!isObj(raw)) return null;
  const channels = asArr(raw.channels).filter(isObj).map((c) => ({ ...c, id: asStr(c.id) || makeId() }));
  const outputs = asArr(raw.outputs).filter(isObj).map((o) => ({ ...o, id: asStr(o.id) || makeId() }));
  return {
    ...raw,
    id: asStr(raw.id) || makeId(),
    band: asStr(raw.band),
    date: asStr(raw.date),
    venue: asStr(raw.venue),
    contact: asStr(raw.contact),
    monitors: asStr(raw.monitors),
    notes: asStr(raw.notes),
    channels,
    boxes: asArr(raw.boxes).filter(isObj),
    outputs,
    outputBoxes: asArr(raw.outputBoxes).filter(isObj),
    updated: Number.isFinite(raw.updated) ? raw.updated : Date.now(),
  };
}

const asQty = (v) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 1);

function normalizeInventory(raw) {
  if (!isObj(raw)) return null;
  const label = asStr(raw.label).trim();
  if (!label) return null;
  return {
    label,
    qty: asQty(raw.qty),
    type: typeof raw.type === "string" && raw.type ? raw.type : null,
    needs_phantom: raw.needs_phantom === true,
    use_cases: asArr(raw.use_cases).filter((u) => typeof u === "string" && u),
  };
}

function normalizeEndpoint(raw) {
  if (!isObj(raw)) return null;
  const label = asStr(raw.label).trim();
  if (!label) return null;
  return { label, qty: asQty(raw.qty), type: typeof raw.type === "string" && raw.type ? raw.type : null };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Parse and validate the text of a backup file.
 * -> { ok: true, backup, skipped } | { ok: false, error }
 * `skipped` counts records that were unusable and left out.
 */
export function parseBackup(text, { makeId = defaultMakeId } = {}) {
  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "That file is empty." };
  if (text.length > MAX_BYTES) return { ok: false, error: "That file is too large to be a StageAdvance backup." };

  let raw;
  try { raw = JSON.parse(text); }
  catch { return { ok: false, error: "That doesn't look like a StageAdvance backup — it isn't readable as a backup file." }; }
  if (!isObj(raw)) return { ok: false, error: "That doesn't look like a StageAdvance backup." };

  if (raw.format !== undefined && raw.format !== BACKUP_FORMAT) {
    return { ok: false, error: "That file isn't a StageAdvance backup." };
  }
  if (typeof raw.formatVersion === "number" && raw.formatVersion > BACKUP_VERSION) {
    return { ok: false, error: "That backup was made by a newer version of StageAdvance. Reload the page to get the latest version, then try again." };
  }
  if (!["shows", "inventory", "endpoints", "settings"].some((k) => k in raw)) {
    return { ok: false, error: "That file doesn't contain any StageAdvance data." };
  }

  let skipped = 0;
  const keep = (list, fn) => asArr(list).map(fn).filter((x) => { if (!x) skipped++; return Boolean(x); });

  const shows = keep(raw.shows, (s) => normalizeShow(s, makeId));
  // a repeated show id inside one file would collide on restore — keep the first
  const seen = new Set();
  const uniqueShows = shows.filter((s) => (seen.has(s.id) ? (skipped++, false) : (seen.add(s.id), true)));

  const settings = isObj(raw.settings) ? raw.settings : {};
  const groupColors = {};
  if (isObj(settings.groupColors)) {
    for (const [g, hex] of Object.entries(settings.groupColors)) {
      if (typeof hex === "string" && HEX.test(hex)) groupColors[g] = hex; else skipped++;
    }
  }
  const customOutputChips = keep(settings.customOutputChips, (c) =>
    isObj(c) && asStr(c.name).trim() ? { name: asStr(c.name).trim(), stereo: c.stereo === true } : null);

  return {
    ok: true,
    skipped,
    backup: {
      exportedAt: asStr(raw.exportedAt),
      shows: uniqueShows,
      inventory: keep(raw.inventory, normalizeInventory),
      endpoints: keep(raw.endpoints, normalizeEndpoint),
      groupColors,
      customOutputChips,
    },
  };
}

/* ——— planning: compare the backup with what's in the account now ——— */

const showSummary = (s) =>
  `${s.band || "Untitled show"} — ${s.channels.length} channel${s.channels.length === 1 ? "" : "s"}${s.outputs.length ? `, ${s.outputs.length} output${s.outputs.length === 1 ? "" : "s"}` : ""}${s.date ? ` · ${s.date}` : ""}`;

const invSig = (i) => canon({ qty: i.qty, type: i.type ?? null, needs_phantom: i.needs_phantom === true, use_cases: [...(i.use_cases || [])].sort() });
const epSig = (e) => canon({ qty: e.qty, type: e.type ?? null });
const withoutUpdated = ({ updated, ...rest }) => rest;
const chipKey = (c) => `${c.name.toLowerCase()}|${c.stereo ? 1 : 0}`;

/**
 * Compare a parsed backup with the account's current data.
 * `current` = { shows, inventoryItems, endpointItems, groupColors, customOutputChips }
 * Returns sections of items: { key, status: "new"|"same"|"differs", label, detail, ... }.
 */
export function planRestore(backup, current, { validGroups = null } = {}) {
  const curShows = new Map(asArr(current.shows).map((s) => [s.id, s]));
  const curInv = new Map(asArr(current.inventoryItems).map((i) => [i.label, i]));
  const curEp = new Map(asArr(current.endpointItems).map((e) => [e.label, e]));
  const curColors = current.groupColors || {};
  const curChips = new Set(asArr(current.customOutputChips).map(chipKey));

  const shows = backup.shows.map((s) => {
    const mine = curShows.get(s.id);
    const status = !mine ? "new" : canon(withoutUpdated(mine)) === canon(withoutUpdated(s)) ? "same" : "differs";
    return {
      key: `show:${s.id}`, section: "shows", status, label: s.band || "Untitled show", show: s,
      detail: status === "differs"
        ? `Your current copy: ${showSummary(mine)}. Backup: ${showSummary(s)}. Restoring adds the backup as a separate copy — your current show is never changed.`
        : showSummary(s),
    };
  });

  const inventory = backup.inventory.map((i) => {
    const mine = curInv.get(i.label);
    const status = !mine ? "new" : invSig(mine) === invSig(i) ? "same" : "differs";
    return {
      key: `inv:${i.label}`, section: "inventory", status, label: i.label, item: i, currentId: mine?.id,
      detail: status === "differs"
        ? `Yours: qty ${mine.qty}${mine.type ? `, ${mine.type}` : ""}. Backup: qty ${i.qty}${i.type ? `, ${i.type}` : ""}. Restoring replaces yours with the backup's.`
        : `qty ${i.qty}${i.type ? ` · ${i.type}` : ""}`,
    };
  });

  const endpoints = backup.endpoints.map((e) => {
    const mine = curEp.get(e.label);
    const status = !mine ? "new" : epSig(mine) === epSig(e) ? "same" : "differs";
    return {
      key: `ep:${e.label}`, section: "endpoints", status, label: e.label, item: e, currentId: mine?.id,
      detail: status === "differs"
        ? `Yours: qty ${mine.qty}${mine.type ? `, ${mine.type}` : ""}. Backup: qty ${e.qty}${e.type ? `, ${e.type}` : ""}. Restoring replaces yours with the backup's.`
        : `qty ${e.qty}${e.type ? ` · ${e.type}` : ""}`,
    };
  });

  const colors = Object.entries(backup.groupColors)
    .filter(([g]) => !validGroups || validGroups.includes(g))
    .map(([g, hex]) => {
      const mine = curColors[g];
      const status = !mine ? "new" : mine.toLowerCase() === hex.toLowerCase() ? "same" : "differs";
      return {
        key: `color:${g}`, section: "colors", status, label: g, hex, currentHex: mine,
        detail: status === "differs" ? `Yours: ${mine}. Backup: ${hex}. Restoring replaces yours with the backup's.` : hex,
      };
    });

  const chips = backup.customOutputChips.map((c) => ({
    key: `chip:${chipKey(c)}`, section: "chips", status: curChips.has(chipKey(c)) ? "same" : "new",
    label: `${c.name}${c.stereo ? " (stereo)" : ""}`, chip: c, detail: c.stereo ? "stereo pair" : "single output",
  }));

  const sections = { shows, inventory, endpoints, colors, chips };
  const all = Object.values(sections).flat();
  return {
    sections,
    defaultSelected: new Set(all.filter((x) => x.status === "new").map((x) => x.key)),
    counts: {
      new: all.filter((x) => x.status === "new").length,
      differs: all.filter((x) => x.status === "differs").length,
      same: all.filter((x) => x.status === "same").length,
    },
  };
}

/* ——— applying ——— */

/**
 * Apply the items the user left checked. Each write is independent: one
 * failing never blocks the rest, and everything that failed is reported.
 *
 * deps (all supplied by the app, all RLS-scoped for the signed-in user):
 *   addShows(shows[])            — in display order, top first; sync, can't fail
 *   addInventory(label, qty, { type, needs_phantom, use_cases })
 *   updateInventory(id, patch)
 *   addEndpoint(label, qty, type)
 *   updateEndpoint(id, patch)
 *   updateColors(map)            — { group: hex }
 *   addChips(chips[])            — [{ name, stereo }]
 *
 * -> { restored: { shows, inventory, endpoints, colors, chips }, failed: [{ label, error }] }
 */
export async function applyRestore(plan, selectedKeys, deps, { makeId = defaultMakeId } = {}) {
  const picked = (section) => plan.sections[section].filter((x) => selectedKeys.has(x.key) && x.status !== "same");
  const restored = { shows: 0, inventory: 0, endpoints: 0, colors: 0, chips: 0 };
  const failed = [];

  // Shows: new ones keep their id; a differing one becomes a separate copy.
  const showsToAdd = picked("shows").map((x) =>
    x.status === "differs"
      ? { ...x.show, id: makeId(), band: `${x.show.band || "Untitled show"} (restored)`, updated: Date.now() }
      : x.show);
  if (showsToAdd.length) {
    try { deps.addShows(showsToAdd); restored.shows = showsToAdd.length; }
    catch (e) { failed.push({ label: "Shows", error: e?.message || String(e) }); }
  }

  for (const x of picked("inventory")) {
    try {
      const tags = { type: x.item.type, needs_phantom: x.item.needs_phantom, use_cases: x.item.use_cases };
      if (x.status === "differs") await deps.updateInventory(x.currentId, { qty: x.item.qty, ...tags });
      else await deps.addInventory(x.item.label, x.item.qty, tags);
      restored.inventory++;
    } catch (e) { failed.push({ label: x.label, error: e?.message || String(e) }); }
  }

  for (const x of picked("endpoints")) {
    try {
      if (x.status === "differs") await deps.updateEndpoint(x.currentId, { qty: x.item.qty, type: x.item.type });
      else await deps.addEndpoint(x.item.label, x.item.qty, x.item.type);
      restored.endpoints++;
    } catch (e) { failed.push({ label: x.label, error: e?.message || String(e) }); }
  }

  const colorMap = Object.fromEntries(picked("colors").map((x) => [x.label, x.hex]));
  if (Object.keys(colorMap).length) {
    try { await deps.updateColors(colorMap); restored.colors = Object.keys(colorMap).length; }
    catch (e) { failed.push({ label: "Group colors", error: e?.message || String(e) }); }
  }

  const chips = picked("chips").map((x) => x.chip);
  if (chips.length) {
    try { await deps.addChips(chips); restored.chips = chips.length; }
    catch (e) { failed.push({ label: "Output chips", error: e?.message || String(e) }); }
  }

  return { restored, failed };
}
