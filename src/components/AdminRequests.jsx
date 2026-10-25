import { useEffect, useState } from "react";
import {
  listAccessRequests, decideAccessRequest, resetAccessRequest, accessRequestsToCsv, SOURCE_OPTIONS,
  getAutoApprove, setAutoApprove,
} from "../lib/accessRequests";
import { planBulkApproval, BULK_APPROVE_MAX } from "../lib/bulkApprove";

const SOURCE_LABEL = Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.value, o.label]));

export default function AdminRequests() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [bulk, setBulk] = useState(null); // { done, total } while "Approve all pending" is running
  const [note, setNote] = useState(""); // result of the last bulk approval

  const load = () => {
    listAccessRequests().then(setRows).catch((e) => setErr(e.message || "Couldn't load requests."));
  };
  useEffect(load, []);

  // Kill switch for automatic approval. null = not loaded / unavailable
  // (e.g. migration 0007 not run yet) — the switch is hidden then.
  const [auto, setAuto] = useState(null);
  const [autoBusy, setAutoBusy] = useState(false);
  useEffect(() => { getAutoApprove().then(setAuto).catch(() => setAuto(null)); }, []);
  const toggleAuto = async () => {
    setAutoBusy(true);
    setErr("");
    try {
      await setAutoApprove(!auto);
      setAuto(!auto);
    } catch (e) {
      setErr(e.message || "Couldn't change that setting — please try again.");
    } finally {
      setAutoBusy(false);
    }
  };

  const decide = async (id, decision, email) => {
    setBusyId(id);
    setErr("");
    try {
      await decideAccessRequest(id, decision, email);
      load();
    } catch (e) {
      setErr(e.message || "That didn't work — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const reset = async (id) => {
    setBusyId(id);
    setErr("");
    try {
      await resetAccessRequest(id);
      load();
    } catch (e) {
      setErr(e.message || "Couldn't reset that request — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const blob = new Blob([accessRequestsToCsv(rows || [])], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stageadvance-access-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (rows === null) return <div className="sa-sub" style={{ textAlign: "center", margin: 60 }}>Loading…</div>;

  const pending = rows.filter((r) => r.status === "pending");

  // One at a time, oldest first, through the same path as the single
  // Approve button (invite email, then mark approved). Stops at the first
  // failure — most likely Supabase's hourly email limit — and leaves the
  // rest pending.
  const approveAllPending = async () => {
    const { batch, skippedDisposable, remaining } = planBulkApproval(pending);
    if (!batch.length) {
      setNote(skippedDisposable ? `Nothing to approve — the ${skippedDisposable} pending request(s) use disposable email addresses, so I left them for you to judge.` : "");
      return;
    }
    const lines = [`Approve ${batch.length} pending request${batch.length === 1 ? "" : "s"} now? Each person gets an invite email.`];
    if (skippedDisposable) lines.push(`${skippedDisposable} with disposable email addresses will be skipped.`);
    if (remaining) lines.push(`${remaining} more will stay pending (limit ${BULK_APPROVE_MAX} per click, because of email limits) — click again later.`);
    lines.push("Automatic approval of new requests pauses for about an hour afterwards, so the email limit isn't exceeded.");
    if (!window.confirm(lines.join("\n\n"))) return;

    setErr("");
    setNote("");
    let done = 0;
    setBulk({ done, total: batch.length });
    try {
      for (const r of batch) {
        await decideAccessRequest(r.id, "approve", r.email);
        done += 1;
        setBulk({ done, total: batch.length });
      }
      setNote(
        `Approved ${done}.` +
        (skippedDisposable ? ` Skipped ${skippedDisposable} with disposable email addresses.` : "") +
        (remaining ? ` ${remaining} still pending — click again in a while.` : "")
      );
    } catch (e) {
      setErr(`Stopped after approving ${done} of ${batch.length}: ${e.message || "something went wrong"}. The rest are still pending — try again in a while.`);
    } finally {
      setBulk(null);
      load();
    }
  };
  const decided = rows.filter((r) => r.status !== "pending");

  const row = (r) => (
    <div key={r.id} className="sa-card" style={{ padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong>{r.first_name} {r.last_name}</strong> — {r.email}
          {r.company && <span className="sa-sub"> · {r.company}</span>}
        </div>
        <div className="sa-sub">{new Date(r.created_at).toLocaleString()}</div>
      </div>
      <div className="sa-sub" style={{ marginTop: 4 }}>
        Heard about us: {SOURCE_LABEL[r.source] || r.source}
        {r.referred_by && ` — ${r.referred_by}`}
        {r.source_other && ` — ${r.source_other}`}
      </div>
      {r.about && <div className="sa-sub" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{r.about}</div>}
      <div className="sa-sub" style={{ marginTop: 4 }}>
        Marketing OK: {r.marketing_consent ? "yes" : "no"}
      </div>
      {r.status === "pending" ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="sa-btn primary" disabled={busyId === r.id || !!bulk}
            onClick={() => decide(r.id, "approve", r.email)}>
            {busyId === r.id ? "Working…" : "Approve"}
          </button>
          <button className="sa-btn" disabled={busyId === r.id || !!bulk}
            onClick={() => decide(r.id, "decline", r.email)}>
            Decline
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <div className="sa-sub">
            {r.status === "approved" ? (r.auto_approved ? "Auto-approved" : "Approved") : "Declined"} {r.decided_at && new Date(r.decided_at).toLocaleString()}
          </div>
          <button className="sa-btn ghost" style={{ fontSize: 12 }} disabled={busyId === r.id}
            onClick={() => reset(r.id)} title="Move back to pending so you can Approve/Decline it again">
            {busyId === r.id ? "Working…" : "↺ Reset to pending"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: "40px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h2 className="sa-h2">Access requests</h2>
        <button className="sa-btn" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
      </div>
      {err && <div className="sa-shortbanner" style={{ margin: "10px 0" }}>{err}</div>}

      {auto !== null && (
        <div className="sa-card" style={{ padding: 16, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <strong>Automatic approval: {auto ? "ON" : "OFF"}</strong>
            <div className="sa-sub" style={{ marginTop: 2 }}>
              {auto
                ? "New requests are invited right away. Anything suspicious, or past the hourly/daily limit, waits here for you."
                : "Every new request waits here for you to approve it."}
            </div>
          </div>
          <button className={auto ? "sa-btn" : "sa-btn primary"} disabled={autoBusy} onClick={toggleAuto}>
            {autoBusy ? "Working…" : auto ? "Turn off" : "Turn on"}
          </button>
        </div>
      )}

      {note && <div className="sa-sub" style={{ margin: "10px 0" }}>{note}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
        <h3 className="sa-h2" style={{ fontSize: 16, margin: 0 }}>Pending ({pending.length})</h3>
        {pending.length > 0 && (
          <button className="sa-btn primary" disabled={!!bulk || busyId !== null} onClick={approveAllPending}>
            {bulk ? `Approving ${bulk.done + 1} of ${bulk.total}…` : "Approve all pending"}
          </button>
        )}
      </div>
      {pending.length ? pending.map(row) : <div className="sa-sub">Nothing waiting on you right now.</div>}

      {decided.length > 0 && (
        <>
          <h3 className="sa-h2" style={{ fontSize: 16, marginTop: 24 }}>Decided ({decided.length})</h3>
          {decided.map(row)}
        </>
      )}
    </div>
  );
}
