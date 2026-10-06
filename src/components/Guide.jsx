/*
 * User guide, hosted at /guide (see the PRIVACY_RE-style routing in
 * App.jsx). Reuses the app's own sa-* classes (same pattern as
 * PrivacyNotice.jsx) rather than a separate stylesheet, so it inherits
 * the app's dark theme for free and stays visually consistent with the
 * product it's documenting.
 *
 * Keep this in sync by hand as features change — there's no other
 * source of truth for it. Section anchors below correspond to the
 * jump-links at the top; keep ids in sync if you rename a heading.
 */

const Jump = ({ id, children }) => (
  <a href={`#${id}`} className="sa-sub" style={{ textDecoration: "underline" }}>{children}</a>
);

const Step = ({ n, title, children }) => (
  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
    <div style={{
      flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: "#2c2f37",
      border: "1px solid #3a3e48", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, color: "#E8B93E", fontSize: 13,
    }}>{n}</div>
    <div>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>
      <div className="sa-sub">{children}</div>
    </div>
  </div>
);

export default function Guide() {
  return (
    <div className="sa-grid" style={{ maxWidth: 860, margin: "0 auto" }}>
      <div className="sa-card">
        <h2 className="sa-h2">StageAdvance Guide</h2>
        <div className="sa-sub" style={{ marginBottom: 16 }}>
          Everything you need to go from "I have a mic locker" to "here's tonight's crew sheet."
          New here? Start with the walkthrough just below — everything after it is a reference
          you can jump back to any time.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
          <Jump id="walkthrough">New user walkthrough</Jump>
          <Jump id="planner">Planner</Jump>
          <Jump id="inputs">Input list</Jump>
          <Jump id="outputs">Outputs</Jump>
          <Jump id="inventory">Inventory</Jump>
          <Jump id="bandform">Band Form</Jump>
          <Jump id="settings">Settings</Jump>
          <Jump id="shortcuts">Row shortcuts</Jump>
        </div>
      </div>

      {/* ————————————————— New user walkthrough ————————————————— */}
      <div className="sa-card" id="walkthrough" style={{ borderColor: "#E8B93E" }}>
        <h3 className="sa-h2" style={{ fontSize: 17 }}>New here? Start-to-finish walkthrough</h3>
        <div className="sa-sub" style={{ marginBottom: 16 }}>
          Ten minutes, once, and every show after this is fast.
        </div>

        <Step n={1} title="Request access">
          StageAdvance is invite-only right now. Go to <code>/request-access</code>, fill in your
          name, email, and (optionally) how you heard about us, and submit. You'll hear back once
          it's reviewed.
        </Step>
        <Step n={2} title="Check your email for the invite">
          Once approved, an email arrives with a one-time sign-in link. Open it on the device you
          want signed in on — no password to invent or remember.
        </Step>
        <Step n={3} title="You're in — the planner is empty on purpose">
          First login drops you on the <b>Planner</b> with no shows and no inventory yet. That's
          expected; everything below fills it in.
        </Step>
        <Step n={4} title="Build your Inventory">
          Open the <b>Inventory</b> tab and add the mics/DIs you actually own to your <b>mic
          locker</b>. Already have a list somewhere? Paste it or upload a CSV/Excel file instead of
          typing every line — see <Jump id="inventory">Inventory</Jump> below for how recognition
          and bulk import work. This step is what makes every suggestion and shortage warning
          downstream mean something, so it's worth doing before your first real show. Planning to
          use the Outputs section too? Add your speakers/amps to your <b>endpoint inventory</b> in
          the same tab — otherwise this can wait until you actually need it.
        </Step>
        <Step n={5} title="(Optional) Set your display name">
          In <b>Settings</b>, set a display name — it's what bands see on your Band Form link
          instead of your raw email. Skip it and your email shows instead; nothing breaks either way.
        </Step>
        <Step n={6} title="Create your first show">
          Back on the Planner, click <b>+ New show</b>. Fill in band/date/venue if you have them —
          all optional, all editable later. The Band Form (see below) is a completely optional way
          to get this info from a band ahead of time — feel free to skip it entirely and just plan
          the show yourself.
        </Step>
        <Step n={7} title="Tap what's on stage">
          In the show, tap instrument chips (Kick, Snare, Lead Vox, etc.) to add channels — each one
          arrives with a sensible mic, stand, and 48V setting already guessed from your locker.
          Nothing is locked: change any field on any row. Building an Outputs list too? Same idea,
          tap a bus chip (Main, Aux 1-4…) instead.
        </Step>
        <Step n={8} title="Hand it off">
          When the list's built, use <b>Copy as text</b>, <b>Export CSV/XLSX</b>, or <b>Print crew
          sheet</b> — whichever your crew actually uses. That's the whole loop.
        </Step>

        <div className="sa-sub" style={{ marginTop: 4, borderLeft: "2px solid #E8B93E", paddingLeft: 12 }}>
          The Band Form is there if you want it, but it's entirely optional — plenty of shows get
          planned without a band ever filling one out. Got a submission before you've built a show?
          Skip step 6 — importing it (see <Jump id="planner">Planner</Jump>) creates the show and a
          draft input list for you in one click.
        </div>
      </div>

      {/* ————————————————— Planner ————————————————— */}
      <div className="sa-card" id="planner">
        <h3 className="sa-h2" style={{ fontSize: 17 }}>Planner</h3>
        <div className="sa-sub" style={{ marginBottom: 10 }}>
          Your home screen: every show you've built, and every band questionnaire waiting to be
          turned into one.
        </div>
        <p className="sa-sub"><b>Questionnaire inbox</b> — click <b>Copy band form link</b> to grab
          your own personal link and send it to a band ahead of a show, if you want to use it (it's
          entirely optional — see <Jump id="bandform">Band Form</Jump>). Their answers land here.</p>
        <ul className="sa-sub">
          <li><b>Import as show</b> turns a submission into a draft show and input list, pre-built
            from their stage plot and checked against your locker.</li>
          <li><b>Dismiss</b> clears a submission you don't need.</li>
        </ul>
        <p className="sa-sub"><b>Shows</b> — <b>+ New show</b> starts one from scratch (no band form
          required); <b>Duplicate</b> copies an existing show (handy for a repeat act); <b>Delete</b>{" "}
          removes one for good.</p>
        <div className="sa-sub" style={{ borderLeft: "2px solid #4CC3C9", paddingLeft: 12 }}>
          Every engineer gets a different Band Form link — a band's answers only ever reach your
          inbox, never anyone else's.
        </div>
      </div>

      {/* ————————————————— Input list ————————————————— */}
      <div className="sa-card" id="inputs">
        <h3 className="sa-h2" style={{ fontSize: 17 }}>Building the input list</h3>
        <div className="sa-sub" style={{ marginBottom: 10 }}>
          Tap what's on stage, and the mic pull, stand count, and phantom-power list build
          themselves — checked live against your mic locker.
        </div>
        <p className="sa-sub"><b>Add inputs</b> — grouped chips (Drums, Bass, Guitars, Keys,
          Strings/Horns, Vocals, Playback…) each add a channel with a mic/stand/48V guess already
          filled in. Something unusual on stage? Use the free-text "Something unusual?" field —
          same escape hatch as a rental mic.</p>
        <p className="sa-sub"><b>Every field stays editable</b> — Source, Mic/DI, Stand, 48V, Notes,
          Position, and Stage Box are never locked to the suggestion. Swapping a channel's mic
          updates its phantom-power flag to match the new mic automatically (you can still override
          the 48V button by hand afterward).</p>
        <p className="sa-sub"><b>Position</b> — a dropdown of standard stage positions (USL, USC,
          USR, SL, C, SR, DSL, DSC, DSR) with an "Other…" free-text option for anything nonstandard.</p>
        <p className="sa-sub"><b>Shortage warnings</b> — need more of a mic than you own? That row
          gets outlined immediately, right where you'll see it, not buried in a footnote.</p>
        <p className="sa-sub"><b>Boxes</b> — open the "Boxes" panel to define named, colored
          groupings for patch/routing: lettered sub-snakes (A, B, C…) or physical locations (SL,
          Pit, Local). Assign any channel to one from its Stage Box dropdown.</p>
        <p className="sa-sub"><b>Reordering, duplicating, shortcuts</b> — every row has ⧉ (duplicate),
          ↑/↓ (move), and ✕ (remove) buttons — the reliable way to reorder on a phone or tablet,
          since drag-and-drop needs a mouse. On desktop you can also drag a row by its ⠿ handle, or
          select a row (click or tab into it) and use <code>D</code> to duplicate, <code>Alt/⌥+↑/↓</code>{" "}
          to move it, and <code>Esc</code> to close an open color picker.</p>
        <p className="sa-sub"><b>Sort by group</b> arranges channels in console order — drums →
          perc → bass → guitars → keys → strings/horns → vocals → playback.</p>
        <p className="sa-sub">When you're done: <b>Copy as text</b> puts a plain-text input list,
          mic pull, and stand count on your clipboard; <b>Export CSV</b> downloads the input list as
          a file; <b>Export XLSX</b> downloads the input list <i>and</i> output list (if you have
          one) together in one file; <b>Print crew sheet</b> opens a printable, load-in-ready page
          in a new tab (input list → output list → gear pull, gear pull last on its own page).</p>
      </div>

      {/* ————————————————— Outputs ————————————————— */}
      <div className="sa-card" id="outputs">
        <h3 className="sa-h2" style={{ fontSize: 17 }}>Outputs (monitor mixes, FOH buses)</h3>
        <div className="sa-sub" style={{ marginBottom: 10 }}>
          The same idea as the input list, in reverse — what's coming out of the board, and what
          it's feeding. Fully optional; skip it entirely if you only need an input list.
        </div>
        <p className="sa-sub"><b>Add outputs</b> — tap a common-bus chip (<b>Main</b> — adds a
          stereo-linked L/R pair in one tap — or Aux 1-4) or make your own reusable chip (e.g.
          "Matrix 1", optionally marked stereo). Prefer a blank row? <b>+ Add output</b> at the
          bottom of the list adds one you fill in yourself.</p>
        <p className="sa-sub"><b>Stereo Link (⛓)</b> — marks a row as paired with the one directly
          below it (how the Main L/R chip works under the hood, and toggleable on any row by hand).
          It's a visual/organizational pairing, shown as a bracket around both rows — the two rows
          always move together when you drag, duplicate, or reorder, so the pairing can't get
          silently broken. Unlink either row any time.</p>
        <p className="sa-sub"><b>Endpoint</b> — pick from <b>Your endpoint inventory</b> (see below)
          or type one in on the spot with "Other / type in…", same rental-style escape hatch as
          mics.</p>
        <p className="sa-sub">Each output line also gets Submix, Notes, Stage Box (its own Boxes
          panel, separate from the input list's), and the same ⧉ duplicate / ↑↓ move / ✕ remove
          buttons and keyboard shortcuts as the input list.</p>
        <p className="sa-sub">When you're done: <b>Export Outputs CSV</b> (shown once you have at
          least one output) downloads just the output list; it's also included automatically in
          <b> Export XLSX</b> and <b>Print crew sheet</b> alongside the input list.</p>
      </div>

      {/* ————————————————— Inventory ————————————————— */}
      <div className="sa-card" id="inventory">
        <h3 className="sa-h2" style={{ fontSize: 17 }}>Inventory</h3>
        <div className="sa-sub" style={{ marginBottom: 10 }}>
          The <b>Inventory</b> tab holds two lists — your <b>mic locker</b> and your <b>endpoint
          inventory</b> — and this is what every suggestion, mic pull, and shortage warning is
          checked against, so it's worth keeping current as gear comes and goes.
        </div>
        <p className="sa-sub"><b>Mic locker (mics/DIs)</b> — type a model and quantity. Recognized
          gear gets tagged automatically: type, whether it needs 48V, and what it's typically used
          for — shown as an editable best guess you confirm before it's added. Not recognized? Fill
          in the same fields yourself; it's remembered for next time, for every account, not just
          yours.</p>
        <p className="sa-sub"><b>Tags drive the suggestions</b> — a mic tagged <code>lead-vocal</code>{" "}
          gets suggested for Lead Vox. Tag your favorite piano mic with <code>piano</code> and it
          gets suggested there instead of the generic default.</p>
        <p className="sa-sub"><b>Endpoint inventory (speakers/amps)</b> — same add-one-at-a-time
          flow, plus a Type dropdown (Powered/Passive Speaker, Powered/Passive Wedge, Wedge monitor,
          IEM transmitter, Line array, Point source, Subwoofer, Power amp, Other). Tagging here is
          manual — nothing gets auto-suggested the way mic tags do, but it still feeds the Endpoint
          picker on the output list and its own shortage checks.</p>
        <p className="sa-sub"><b>Already have a list?</b> Both the mic locker and endpoint inventory
          support <b>Paste a list</b> (plain text, one item per line, quantities optional — "2x
          SM57" or "SM57 (2)" both work) and <b>Upload a file</b> (CSV or .xlsx, two columns: model
          and quantity — one row for all 5 SM58s, not five rows). The whole batch is parsed and
          reviewed on one screen — recognized items are pre-checked, anything unrecognized is
          flagged for your input — rather than one popup per item.</p>
      </div>

      {/* ————————————————— Band Form ————————————————— */}
      <div className="sa-card" id="bandform">
        <h3 className="sa-h2" style={{ fontSize: 17 }}>The Band Form <span style={{ color: "#8a8f98", fontWeight: 600 }}>— optional</span></h3>
        <div className="sa-sub" style={{ marginBottom: 10 }}>
          A standalone questionnaire you can <i>optionally</i> send a band ahead of a show — no
          account, no access to your planner, just their stage plot landing in your inbox. Nothing
          about planning a show requires it: skip it entirely and use <b>+ New show</b> instead if
          you'd rather build the input list yourself from the start.
        </div>
        <p className="sa-sub"><b>What a band leader sees:</b> band info, who plays what, backline
          they're bringing vs. what they need provided, whether they run tracks or a click, and
          anything unusual on stage — a cello, a theremin, tap shoes.</p>
        <p className="sa-sub"><b>Where it goes:</b> straight to your Questionnaire Inbox — never
          visible to any other engineer. The form's footer tells the band exactly that, plus a link
          to the Privacy Notice.</p>
        <p className="sa-sub"><b>Turning it into a show:</b> click <b>Import as show</b> in your
          inbox and their instrument list becomes a draft input list, matched against your tagged
          locker the same way tapping presets does.</p>
      </div>

      {/* ————————————————— Settings ————————————————— */}
      <div className="sa-card" id="settings">
        <h3 className="sa-h2" style={{ fontSize: 17 }}>Settings</h3>
        <p className="sa-sub"><b>Display name</b> — shown to bands on your Band Form link instead
          of your raw email. Leave it blank and your email shows instead.</p>
        <p className="sa-sub"><b>Channel colors</b> — set your own color per instrument group,
          matching whatever convention you already run on your console. Any single channel can
          still be recolored on its own row from the input list; right-click a channel's color
          swatch to reset it back to the group color.</p>
        <p className="sa-sub"><b>Restore from a backup file</b> — got an export from "Export my data"?
          Pick it under Settings → Your data and you'll see exactly what would be added back (shows, mic
          locker, endpoints, colors, output chips) before anything changes. It only adds — nothing is ever
          deleted, and a show that already exists is never overwritten (a differing one comes back as a
          separate copy).</p>
        <p className="sa-sub"><b>Your data</b> — <b>Export my data</b> downloads everything (shows,
          mic locker, endpoint inventory, channel colors, output chips, band form submissions) as a file you keep. <b>Delete my account</b> removes your login and
          all of it immediately — no grace period, so it asks you to type <code>DELETE</code> to
          confirm. See the <a href="/privacy" style={{ color: "inherit" }}>Privacy Notice</a> for
          what's collected and why.</p>
      </div>

      {/* ————————————————— Shortcuts recap ————————————————— */}
      <div className="sa-card" id="shortcuts">
        <h3 className="sa-h2" style={{ fontSize: 17 }}>Row shortcuts (input &amp; output lists)</h3>
        <div className="sa-sub" style={{ marginBottom: 10 }}>
          Every row has its own ⧉ / ↑ / ↓ / ✕ buttons — the reliable way to duplicate, reorder, or
          remove a row on any device. On desktop, these also work as keyboard shortcuts: click or
          tab into a row (or its ⠿ drag handle) to select it, then:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: 14 }}>
          <b>D</b><span>Duplicate the selected row</span>
          <b>Alt/⌥ + ↑ / ↓</b><span>Move the selected row up or down</span>
          <b>Tab / Shift+Tab</b><span>Move between fields</span>
          <b>Esc</b><span>Close an open color picker</span>
        </div>
        <div className="sa-sub" style={{ marginTop: 10 }}>
          Output rows have one more: <b>⛓ Link with next row as a stereo pair</b> — see{" "}
          <Jump id="outputs">Outputs</Jump> above.
        </div>
      </div>

      <div className="sa-sub" style={{ textAlign: "center", padding: "8px 0 24px" }}>
        StageAdvance — input lists · mic pulls · stand counts, before you load the van.
      </div>
    </div>
  );
}
