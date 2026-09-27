import { useEffect, useState } from "react";
import { listAccessRequests, decideAccessRequest, resetAccessRequest, accessRequestsToCsv, SOURCE_OPTIONS } from "../lib/accessRequests";

const SOURCE_LABEL = Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.value, o.label]));

export default function AdminRequests() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null); // temporary — see invite-user.js

  const load = () => {
    listAccessRequests().then(setRows).catch((e) => setErr(e.message || "Couldn't load requests."));
  };
  useEffect(load, []);

  const decide = async (id, decision, email) => {
    setBusyId(id);
    setErr("");
    setDebugInfo(null);
    try {
      const debug = await decideAccessRequest(id, decision, email);
      if (debug) setDebugInfo(debug);
      load();
    } catch (e) {
      setErr(e.message || "That didn't work — please try again.");
      if (e.debug) setDebugInfo(e.debug);
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
          <button className="sa-btn primary" disabled={busyId === r.id}
            onClick={() => decide(r.id, "approve", r.email)}>
            {busyId === r.id ? "Working…" : "Approve"}
          </button>
          <button className="sa-btn" disabled={busyId === r.id}
            onClick={() => decide(r.id, "decline", r.email)}>
            Decline
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <div className="sa-sub">
            {r.status === "approved" ? "Approved" : "Declined"} {r.decided_at && new Date(r.decided_at).toLocaleString()}
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
      {debugInfo && (
        <pre className="sa-sub" style={{
          margin: "10px 0", padding: 12, background: "rgba(0,0,0,0.25)",
          borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}

      <h3 className="sa-h2" style={{ fontSize: 16, marginTop: 20 }}>Pending ({pending.length})</h3>
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
