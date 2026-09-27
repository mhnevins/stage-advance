import ScreenshotPlaceholder from "./ScreenshotPlaceholder";
import DeviceShowcase from "./DeviceShowcase";

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
    body: "Generate a clean input list, output list, and mic pull for your crew — the show header on every page and the gear pull on its own last page.",
  },
  {
    title: "Built for the load-in",
    body: "Works on your phone at the venue as easily as it does on your laptop at home.",
  },
  {
    title: "Output lists, too",
    body: "Plan your mains and monitors as well: stereo-linked pairs that move together, your own speaker and amp inventory, and patch destinations like Local, AES, or Dante.",
  },
  {
    title: "Built for speed",
    body: "Quick-add chips, one-click duplicate, and keyboard shortcuts keep big shows quick to build.",
  },
  {
    title: "Fits your spreadsheet workflow",
    body: "Export your input and output lists to CSV or Excel whenever you need them.",
  },
  {
    title: "Your data stays yours",
    body: "Every account is fully isolated. Export or delete everything you've entered at any time.",
  },
];

const PERSONAS = [
  { title: "Freelance & gig engineers", body: "A different band and venue every week — no time to rebuild an input list from scratch each time." },
  { title: "Theatre & musical sound designers", body: "A live band in the pit and a cast to wrangle — quickly onboard incoming bands and multi-instrument players." },
  { title: "Small venues & house engineers", body: "One gear inventory, reused show after show, without a spreadsheet that drifts out of date." },
];

const STEPS = [
  { n: "1", title: "Build your inventory", body: "Add the mics, DIs, and speakers you own, once." },
  { n: "2", title: "Plan your show", body: "Tap in your inputs and outputs, assign stage boxes and positions, and see your gear pull and any shortages as you build." },
  { n: "3", title: "Print your sheets", body: "Input list, output list, mic pull, and stand count — generated automatically." },
];

// Unattributed by design (Michael, 2026-09-25) — quotes from pre-launch
// users, no names. Add new ones here; each renders as its own card.
const TESTIMONIALS = [
  "I have to say that I love it. I used it for a musical theatre show that I was sound engineering, where I had 28 cast plus a band and was great! I love the fact that you can add your own mics so you quickly see if you need to hire anything or not.",
  "Definitely love it and I would love being able to use it in the future.",
  "I’m sound designing a musical for our university, and I loved the idea as I’m collaborating with several school departments. One thing that I really love is the ability to collect info from the bands!",
  "Hey! This is really cool man.",
];

export default function Landing() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* ——— Hero ——— */}
      <div style={{ textAlign: "center", padding: "40px 12px 20px" }}>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 38px)", lineHeight: 1.2, margin: "0 0 14px", fontWeight: 800 }}>
          Input lists, output lists and mic pulls,<br />without the spreadsheet.
        </h1>
        <p className="sa-sub" style={{ fontSize: 15, maxWidth: 560, margin: "0 auto 24px" }}>
          StageAdvance helps live sound engineers plan shows fast: build your gear
          inventory once, send bands a simple questionnaire, and generate crew-ready
          input lists, output lists, mic pulls, and stand counts automatically.
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
        <ScreenshotPlaceholder label="Planner / input list view" src="/screenshots/input-list.png" alt="The StageAdvance input list: color-coded channels with mic, stand, 48V, stage position, and stage box assignments" />
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

      {/* ——— Cross-device ——— */}
      <div style={{ margin: "56px 0" }}>
        <h2 className="sa-h2" style={{ textAlign: "center", fontSize: 16 }}>Works wherever the show is</h2>
        <p className="sa-sub" style={{ fontSize: 13, maxWidth: 560, margin: "0 auto 20px", textAlign: "center" }}>
          Same planner on your laptop at home, a tablet backstage, or your phone at the venue.
        </p>
        <DeviceShowcase />
      </div>

      {/* ——— Outputs showcase ——— */}
      <div style={{ margin: "56px 0" }}>
        <h2 className="sa-h2" style={{ textAlign: "center", fontSize: 16 }}>Plan your outputs the same way</h2>
        <p className="sa-sub" style={{ fontSize: 13, maxWidth: 560, margin: "0 auto 20px", textAlign: "center" }}>
          Same quick-add, duplicate, and reorder moves as the input list. Link a stereo pair
          and it travels together, and route each output to a Local, AES, or Dante patch.
        </p>
        <ScreenshotPlaceholder label="Output list with a stereo-linked pair and quick-add chips" src="/screenshots/outputs.png" alt="The StageAdvance output list: quick-add chips, two stereo-linked pairs, endpoints from your inventory, and color-coded AES, Dante, and monitor patch destinations" />
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
          <ScreenshotPlaceholder label="Print-ready crew sheet" src="/screenshots/print-crew-sheet.png" alt="A printed StageAdvance crew sheet: show header, color-coded input list with positions and stage box labels" />
        </div>
      </div>

      {/* ——— Testimonials (unattributed; edit TESTIMONIALS above) ——— */}
      <div style={{ margin: "56px 0" }}>
        <h2 className="sa-h2" style={{ textAlign: "center", fontSize: 16 }}>
          What our pre-launch users are saying
        </h2>
        <div style={{ display: "grid", gap: 14, maxWidth: 640, margin: "20px auto 0" }}>
          {TESTIMONIALS.map((quote, i) => (
            <div key={i} className="sa-card" style={{ padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontStyle: "italic", lineHeight: 1.5 }}>“{quote}”</div>
            </div>
          ))}
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
