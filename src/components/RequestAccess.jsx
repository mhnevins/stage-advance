import { useState } from "react";
import { submitAccessRequest, SOURCE_OPTIONS } from "../lib/accessRequests";

const blank = {
  firstName: "", lastName: "", email: "", company: "",
  source: "", sourceOther: "", referredBy: "", about: "", marketingConsent: false,
  hp_website: "", // honeypot — real users never see or fill this in
};

export default function RequestAccess() {
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.hp_website) { setDone(true); return; } // bot: pretend success, submit nothing
    if (!f.firstName.trim() || !f.lastName.trim() || !f.email.trim() || !f.source) {
      setErr("Please fill in your name, email, and how you heard about us.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      await submitAccessRequest(f);
      setDone(true);
    } catch (e2) {
      setErr(e2.message || "Couldn't submit your request — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sa-grid" style={{ maxWidth: 480, margin: "60px auto" }}>
      <div className="sa-card" style={{ padding: 32 }}>
        <div className="sa-logo" style={{ marginBottom: 6, textAlign: "center" }}>Stage<span>Advance</span></div>
        {done ? (
          <>
            <h2 className="sa-h2" style={{ marginTop: 14, textAlign: "center" }}>Thanks for your interest</h2>
            <div className="sa-sub" style={{ textAlign: "center" }}>
              We'll review your request and email you at {f.email || "the address you gave us"} once you're in.
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="sa-sub" style={{ margin: "10px 0 18px", textAlign: "center" }}>
              StageAdvance is currently by request — tell us a bit about yourself and we'll get you set up.
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="sa-label">First name</label>
                <input className="sa-input" value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="sa-label">Last name</label>
                <input className="sa-input" value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="sa-label">Email</label>
              <input className="sa-input" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="sa-label">Company (optional)</label>
              <input className="sa-input" value={f.company} onChange={(e) => set({ company: e.target.value })} />
            </div>

            <div style={{ marginTop: 10 }}>
              <label className="sa-label">How did you hear about StageAdvance?</label>
              <select className="sa-input" value={f.source} onChange={(e) => set({ source: e.target.value })}>
                <option value="">Choose one…</option>
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {f.source === "referral" && (
              <div style={{ marginTop: 10 }}>
                <label className="sa-label">Who referred you?</label>
                <input className="sa-input" value={f.referredBy} onChange={(e) => set({ referredBy: e.target.value })} />
              </div>
            )}
            {f.source === "other" && (
              <div style={{ marginTop: 10 }}>
                <label className="sa-label">Where, exactly?</label>
                <input className="sa-input" value={f.sourceOther} onChange={(e) => set({ sourceOther: e.target.value })} />
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <label className="sa-label">Tell us about yourself, your company, and your live sound work (optional)</label>
              <textarea className="sa-input" rows={3} value={f.about} onChange={(e) => set({ about: e.target.value })} />
            </div>

            {/* Honeypot — visually hidden from real users, bots that fill every field trip it */}
            <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }} aria-hidden="true">
              <label htmlFor="ra-website">Website</label>
              <input id="ra-website" tabIndex={-1} autoComplete="off" value={f.hp_website}
                onChange={(e) => set({ hp_website: e.target.value })} />
            </div>

            <label className="sa-check" style={{ marginTop: 14 }}>
              <input type="checkbox" checked={f.marketingConsent}
                onChange={(e) => set({ marketingConsent: e.target.checked })} />
              OK to email me occasional updates about new features and ways to support StageAdvance.
            </label>

            {err && <div className="sa-shortbanner" style={{ marginTop: 10 }}>{err}</div>}
            <button className="sa-btn primary" style={{ marginTop: 14, width: "100%", padding: "10px 16px" }}
              type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Request access"}
            </button>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <a href="/privacy" className="sa-sub" style={{ fontSize: 12 }}>Privacy Notice</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
