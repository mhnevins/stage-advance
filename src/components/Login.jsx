import { useState } from "react";

export default function Login({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErr("");
    setBusy(true);
    try {
      await onSignIn(email.trim());
      setSent(true);
    } catch {
      setErr("Couldn't send a link — check the email, or you may not have access yet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sa-grid" style={{ maxWidth: 420, margin: "60px auto" }}>
      <div className="sa-card" style={{ textAlign: "center", padding: 32 }}>
        <a href="/" className="sa-sub" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>← Back</a>
        <div className="sa-logo" style={{ marginBottom: 6 }}>Stage<span>Advance</span></div>
        {sent ? (
          <>
            <h2 className="sa-h2" style={{ marginTop: 14 }}>Check your email</h2>
            <div className="sa-sub">We sent a login link to {email}. Open it to get into your planner.</div>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="sa-sub" style={{ margin: "10px 0 18px" }}>Sign in to your planner.</div>
            <label className="sa-label" style={{ textAlign: "left", display: "block" }}>Email</label>
            <input
              className="sa-input"
              type="email"
              value={email}
              autoFocus
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            {err && <div className="sa-shortbanner" style={{ marginTop: 10 }}>{err}</div>}
            <button
              className="sa-btn primary"
              style={{ marginTop: 14, width: "100%", padding: "10px 16px" }}
              type="submit"
              disabled={busy}
            >
              {busy ? "Sending…" : "Send me a login link"}
            </button>
            <div style={{ marginTop: 12 }}>
              <a href="/request-access" className="sa-sub" style={{ fontSize: 12 }}>Don't have access yet? Request access</a>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/guide" target="_blank" rel="noopener noreferrer" className="sa-sub" style={{ fontSize: 12 }}>New here? Read the guide</a>
              <a href="/privacy" className="sa-sub" style={{ fontSize: 12 }}>Privacy Notice</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
