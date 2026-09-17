import ScreenshotPlaceholder from "./ScreenshotPlaceholder";

const FEATURES = [
  {
    title: "Your gear, remembered",
    body: "Build your mic/DI locker once. The app remembers what you own and suggests it automatically — never re-type \"SM57 x2\" again.",
  },
  {
    title: "Smart mic suggestions",
    body: "Add a mic model and get an instant best guess at its type, phantom power needs, and typical use. Always editable — the app suggests, you decide.",
  },
  {
    title: "One link for every band",
    body: "Send your own Band Form link. When a band fills it out, their input list and channel needs are already waiting for you.",
  },
  {
    title: "Print-ready in one click",
    body: "Generate a clean input list, mic pull sheet, and stand count for your crew — formatted for the truck, not for a screen.",
  },
  {
    title: "Built for the load-in",
    body: "Works on your phone at the venue as easily as it does on your laptop at home.",
  },
  {
    title: "Your data stays yours",
    body: "Every account is fully isolated. Export or delete everything you've entered at any time.",
  },
];

const PERSONAS = [
  { title: "Freelance & gig engineers", body: "A different band and venue every week — no time to rebuild an input list from scratch each time." },
  { title: "Theatre & musical sound designers", body: "A live band in the pit and a cast to wrangle — quickly onboard incoming bands and multi-instrument players." },
  { title: "Small venues & house engineers", body: "One gear locker, reused show after show, without a spreadsheet that drifts out of date." },
];

const STEPS = [
  { n: "1", title: "Build your locker", body: "Add the mics and DIs you own, once." },
  { n: "2", title: "Send your Band Form link", body: "Bands tell you what they're bringing before they even load in." },
  { n: "3", title: "Print your sheets", body: "Input list, mic pull, and stand count — generated automatically." },
];

export default function Landing() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* ——— Hero ——— */}
      <div style={{ textAlign: "center", padding: "40px 12px 20px" }}>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 38px)", lineHeight: 1.2, margin: "0 0 14px", fontWeight: 800 }}>
          Input lists and mic pulls,<br />without the spreadsheet.
        </h1>
        <p className="sa-sub" style={{ fontSize: 15, maxWidth: 560, margin: "0 auto 24px" }}>
          StageAdvance helps live sound engineers plan shows fast: build your gear
          locker once, send bands a simple questionnaire, and generate crew-ready
          input lists, mic pulls, and stand counts automatically.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/request-access" className="sa-btn primary" style={{ padding: "10px 22px", fontSize: 14, textDecoration: "none" }}>
            Request access
          </a>
          <a href="/login" className="sa-btn" style={{ padding: "10px 22px", fontSize: 14, textDecoration: "none" }}>
            Sign in
          </a>
        </div>
      </div>

      <div style={{ margin: "24px 0 48px" }}>
        <ScreenshotPlaceholder label="Planner / input list view" aspect="16/9" />
      </div>

      {/* ——— Who it's for ——— */}
      <div style={{ margin: "56px 0" }}>
        <h2 className="sa-h2" style={{ textAlign: "center", fontSize: 16 }}>
          Built for the gigging and theatre engineer
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
          {PERSONAS.map((p) => (
            <div key={p.title} className="sa-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{p.title}</div>
              <div className="sa-sub" style={{ fontSize: 13 }}>{p.body}</div>
            </div>
          ))}
        </div>
        <div className="sa-sub" style={{ textAlign: "center", fontSize: 12, marginTop: 16 }}>
          Not built for stadium tours with a full production crew — there are already great tools for that.
        </div>
      </div>

      {/* ——— Features ——— */}
      <div style={{ margin: "56px 0" }}>
        <h2 className="sa-h2" style={{ textAlign: "center", fontSize: 16 }}>What you get</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="sa-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#E8B93E" }}>{f.title}</div>
              <div className="sa-sub" style={{ fontSize: 13 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ——— How it works ——— */}
      <div style={{ margin: "56px 0" }}>
        <h2 className="sa-h2" style={{ textAlign: "center", fontSize: 16 }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ textAlign: "center", padding: "0 10px" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#E8B93E", marginBottom: 6 }}>{s.n}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
              <div className="sa-sub" style={{ fontSize: 13 }}>{s.body}</div>
            </div>
          ))}
        </div>
        <div style={{ margin: "28px 0 0" }}>
          <ScreenshotPlaceholder label="Print-ready mic pull / stand count sheet" aspect="16/9" />
        </div>
      </div>

      {/* ——— Testimonial (placeholder — do not ship without a real, approved quote) ——— */}
      <div style={{ margin: "56px 0" }}>
        <div className="sa-card" style={{ padding: 28, textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 15, fontStyle: "italic", marginBottom: 10 }}>
            "Placeholder — swap in a real, beta-tester-approved quote before this page goes live."
          </div>
          <div className="sa-sub" style={{ fontSize: 12 }}>— Real testimonial pending approval</div>
        </div>
      </div>

      {/* ——— Support ——— */}
      <div style={{ margin: "56px 0", textAlign: "center" }}>
        <h2 className="sa-h2" style={{ fontSize: 16 }}>Support StageAdvance</h2>
        <p className="sa-sub" style={{ fontSize: 13, maxWidth: 480, margin: "0 auto 16px" }}>
          StageAdvance is free to use. If it saves you time, voluntary support helps keep it running.
        </p>
        <a
          href="https://ko-fi.com/stageadvance"
          target="_blank"
          rel="noopener noreferrer"
          className="sa-btn"
          style={{ padding: "10px 22px", fontSize: 14, textDecoration: "none", display: "inline-block" }}
        >
          Support us on Ko-fi
        </a>
      </div>

      {/* ——— Final CTA ——— */}
      <div style={{ margin: "56px 0 40px", textAlign: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px" }}>Ready to plan your next show?</h2>
        <a href="/request-access" className="sa-btn primary" style={{ padding: "10px 26px", fontSize: 14, textDecoration: "none" }}>
          Request access
        </a>
      </div>

      <div style={{ textAlign: "center", padding: "20px 0 40px", borderTop: "1px solid #2c2f37" }}>
        <a href="/privacy" className="sa-sub" style={{ fontSize: 12 }}>Privacy Notice</a>
      </div>
    </div>
  );
}
