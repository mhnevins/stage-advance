import { useEffect, useRef, useState } from "react";
import { parseBackup, planRestore, applyRestore } from "../lib/restore";

/*
 * Settings → Your data → "Restore from a backup file". Reads a file made
 * by "Export my data", shows exactly what would be added back, and only
 * applies what the user leaves checked. All the rules (add-only, shows
 * never overwritten, validation) live in lib/restore.js — this is just
 * the screen. The app supplies the actual writes through `deps`.
 */

const SECTIONS = [
  ["shows", "Shows"],
  ["inventory", "Mic locker"],
  ["endpoints", "Endpoint inventory"],
  ["colors", "Channel group colors"],
  ["chips", "Custom output chips"],
];

const noun = { shows: "show", inventory: "mic", endpoints: "endpoint", colors: "color", chips: "chip" };
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function RestoreBackup({ current, validGroups, blocked, deps, onRestored }) {
  const fileRef = useRef(null);
  const [stage, setStage] = useState("idle"); // idle | review | nothing | working | done
  const [fileName, setFileName] = useState("");
  const [checked, setChecked] = useState(null); // what was compared, for the "nothing to restore" panel
  const panelRef = useRef(null);
  const [error, setError] = useState("");
  const [review, setReview] = useState(null); // { plan, exportedAt, skipped }
  const [selected, setSelected] = useState(new Set());
  const [result, setResult] = useState(null);

  const reset = () => { setStage("idle"); setError(""); setReview(null); setSelected(new Set()); setResult(null); setChecked(null); };

  // Every outcome gets its own panel; bring it into view so it can't be missed
  // (the button sits near the bottom of a long Settings page).
  useEffect(() => {
    if (stage !== "idle") panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [stage]);

  const onFile = async (file) => {
    setError("");
    if (!file) return;
    let text;
    try { text = await file.text(); } catch { setError("Couldn't read that file."); return; }
    const parsed = parseBackup(text);
    if (!parsed.ok) { setError(parsed.error); return; }
    const plan = planRestore(parsed.backup, current, { validGroups });
    setFileName(file.name || "");
    if (plan.counts.new + plan.counts.differs === 0) {
      setChecked(SECTIONS.map(([k]) => [k, plan.sections[k].length]).filter(([, n]) => n > 0)
        .map(([k, n]) => plural(n, noun[k])).join(", "));
      setStage("nothing");
      return;
    }
    setReview({ plan, exportedAt: parsed.backup.exportedAt, skipped: parsed.skipped });
    setSelected(new Set(plan.defaultSelected));
    setStage("review");
  };

  const toggle = (key) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const run = async () => {
    setStage("working");
    try {
      const out = await applyRestore(review.plan, selected, deps);
      setResult(out);
      onRestored?.();
    } catch (e) {
      setResult({ restored: {}, failed: [{ label: "Restore", error: e?.message || "Something went wrong." }] });
    }
    setStage("done");
  };

  if (stage === "idle") {
    return (
      <div style={{ marginTop: 14 }}>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files[0]; e.target.value = ""; onFile(f); }} />
        <button className="sa-btn" disabled={Boolean(blocked)} onClick={() => fileRef.current.click()}>
          Restore from a backup file…
        </button>
        <div className="sa-sub" style={{ fontSize: 12, marginTop: 6 }}>
          Pick a file you made with "Export my data". You'll see exactly what would be added back before
          anything changes — nothing is ever deleted.
        </div>
        {blocked && <div className="sa-sub" style={{ fontSize: 12, marginTop: 6, color: "#E8B93E" }}>{blocked}</div>}
        {error && <div className="sa-shortbanner" style={{ marginTop: 10 }}>{error}</div>}
      </div>
    );
  }

  if (stage === "nothing") {
    return (
      <div ref={panelRef} className="sa-card" style={{ marginTop: 14, background: "#20242b", borderColor: "#5FA85C" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          <span style={{ color: "#5FA85C" }}>✓</span> Nothing to restore — everything in this backup is already in your account.
        </div>
        <div className="sa-sub">
          {fileName ? `Checked ${fileName}: ` : "Checked: "}{checked || "no data"} — all match what you have now.
        </div>
        <button className="sa-btn" style={{ marginTop: 10 }} onClick={reset}>OK</button>
      </div>
    );
  }

  if (stage === "review") {
    const { plan, exportedAt, skipped } = review;
    const chosen = [...selected].length;
    return (
      <div ref={panelRef} className="sa-card" style={{ marginTop: 14, background: "#20242b" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Restore from backup</div>
        <div className="sa-sub" style={{ marginBottom: 10 }}>
          {exportedAt ? `Backup made ${new Date(exportedAt).toLocaleString()}. ` : ""}
          Nothing is deleted. Items missing from your account are checked; tick any others you want too.
          {plan.counts.same > 0 && ` ${plural(plan.counts.same, "item")} already in your account, unchanged, not listed.`}
          {skipped > 0 && ` ${plural(skipped, "unreadable item")} in the file left out.`}
        </div>

        {SECTIONS.map(([key, title]) => {
          const items = plan.sections[key].filter((x) => x.status !== "same");
          if (!items.length) return null;
          return (
            <div key={key} style={{ marginBottom: 12 }}>
              <div className="sa-label" style={{ marginBottom: 4 }}>{title}</div>
              {items.map((x) => (
                <label key={x.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderBottom: "1px dashed #2c2f37", cursor: "pointer" }}>
                  <input type="checkbox" style={{ marginTop: 3 }} checked={selected.has(x.key)} onChange={() => toggle(x.key)} />
                  <span style={{ flex: 1 }}>
                    <b>{x.label}</b>{" "}
                    <span style={{
                      fontSize: 11, fontWeight: 700, marginLeft: 4,
                      color: x.status === "new" ? "#5FA85C" : "#E8B93E",
                    }}>
                      {x.status === "new" ? "NOT IN YOUR ACCOUNT" : key === "shows" ? "DIFFERS — RESTORES AS A COPY" : "DIFFERS FROM YOURS"}
                    </span>
                    <div className="sa-sub" style={{ fontSize: 12 }}>{x.detail}</div>
                  </span>
                </label>
              ))}
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button className="sa-btn primary" disabled={chosen === 0} onClick={run}>
            Restore {plural(chosen, "selected item")}
          </button>
          <button className="sa-btn ghost" onClick={reset}>Cancel</button>
        </div>
      </div>
    );
  }

  if (stage === "working") {
    return <div className="sa-sub" style={{ marginTop: 14 }}>Restoring…</div>;
  }

  // done
  const r = result.restored;
  const parts = SECTIONS.filter(([k]) => r[k]).map(([k]) => plural(r[k], noun[k]));
  return (
    <div ref={panelRef} className="sa-card" style={{ marginTop: 14, background: "#20242b" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {parts.length ? `Restored ${parts.join(", ")}.` : "Nothing was restored."}
      </div>
      {result.failed.length > 0 && (
        <div className="sa-shortbanner" style={{ marginTop: 8 }}>
          {plural(result.failed.length, "item")} couldn't be restored: {result.failed.map((f) => f.label).join(", ")}.
          Nothing else was affected — you can try again with just those.
        </div>
      )}
      <button className="sa-btn" style={{ marginTop: 10 }} onClick={reset}>Done</button>
    </div>
  );
}
