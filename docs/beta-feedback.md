# Beta feedback & next-phase ideas

A living log of feedback from real beta engineers, organized for scoping
decisions — not a committed roadmap. Update this file as new feedback
comes in rather than starting a new document each time.

**Legend:** 🔴 flagged high priority by Michael · 🟡 under consideration ·
⚪ idea, needs more input before scoping · ⛔ explicitly out of scope

**Contributors so far:** Thomas Vergouwe (Belgium), Harrison Hartik,
Brian Martinez (university musical theatre sound design), Alvaro
Fernandez (musical theatre — 28 cast + band). All initial feedback has
been positive; the app is being used on real shows already.

_Last updated: 2026-09-21._

---

## 🔴 Top priorities (recurring across multiple users)

### Outputs / monitor mixes section
Requested independently by **four of four** contributors — the strongest
signal in this round.

✅ **Built (2026-09-23)**, from Michael's "Final Output Section For
Stage Advance" reference spreadsheet — the authoritative, detailed spec
that superseded the 9/18 rough mapping below (kept for history). Final
row shape: **Output Channel** (free text, e.g. "Main L"), **Stereo
Link** (toggle, visual-only pairing with the next row), **Submix
Name** (free text, e.g. "FOH L"), **Endpoint** (locker-backed dropdown
+ free text — new "Your endpoints" section added to the Locker tab,
manually typed/tagged, no AI-lookup layer, paste/CSV/XLSX import reuses
the same generic parsers the mic locker already uses), **Notes** (free
text), **Stage Box** (own box pool, separate from input boxes — an
output with no box explicitly assigned defaults to a built-in "Local"
pseudo-box, auto-numbered, override-able — per Michael's explanation
that "Local"/AES/Dante are real, distinct physical output types on a
console, not the same thing as an input snake box).

- Lives on the same Show Planner tab as decided earlier — new section
  between the input list and the gear pull summary.
- Full UX parity with the input list: Add, Duplicate (⧉), Move up/down
  (buttons + the same Alt+↑/↓ shortcut), Remove, drag handle, row-focus
  highlight, keyboard shortcuts (D / Alt+↑↓) — same component feel, one
  shared keyboard-shortcut handler now covers both lists.
- Print/export extended: standalone print sheet and in-app print
  preview both add an Output List table (starts on its own page when
  present), CSV export gets a separate "Export Outputs CSV" button, and
  XLSX export adds a second "Output List" sheet alongside "Input List"
  in the same file — exactly the shape planned for back when CSV/XLSX
  export was first built.
- ✅ **Resolved (2026-09-23):** the 9/18 idea of pulling some output
  fields from input-list values was confirmed by Michael as
  superseded by the final spec — not needed, nothing missing here.
- ✅ **Quick-add chips built (2026-09-25)**, after Brian confirmed he
  wants them. Default set: **Main L/R** (adds two rows, "Main L"
  stereo-linked to "Main R" — link can still be toggled off per row),
  **Aux 1, Aux 2, Aux 3, Aux 4**. Users can also make their own chips
  ("Make your own chip" row — name + optional "stereo pair" checkbox,
  which adds an L + R linked pair); custom chips are saved per account
  in `kv_user` (same mechanism as custom group colors, no migration)
  and are removable with the ✕ on each; the default five are fixed.
  Not yet click-tested in a real session.
- ✅ **Overall verdict from Brian (2026-09-25 review call):** "very
  pleased" — the build matches what he envisioned from the spreadsheet.
  The Stereo Link behavior was completely clear, including moving a
  stereo pair (called out as a big value win). Brian also has **other
  engineers who could help test** — potential additional beta testers
  (see `growth-strategy.md` on new-user interviews).
- ✅ **Brian's design confirmations (2026-09-25 review call):** the
  separate output-box pool (AES/Dante/Local kept apart from the input
  snake boxes) "works well" — no change needed; and the "Stage Box or
  Physical Outs" column label "seems ok." Both are settled, not open
  questions anymore.
- ✅ **Endpoint type list extended (2026-09-25, Brian's review):** added
  Powered Speaker, Passive Speaker, Powered Wedge, Passive Wedge to the
  top of the endpoint-locker type dropdown. The older generic "Wedge
  monitor" type was deliberately kept alongside them for now (Michael's
  call) — it overlaps with the two new wedge types, so revisit and
  possibly retire it later.
- **First real-session pass (2026-09-23):** Michael tested adding
  output rows, assigning endpoints, the Stereo Link toggle, and box/
  position numbering defaults — all working. Paste/file import not yet
  tried. Three follow-up fixes from that pass:
  1. ✅ Input and output list column headers both now read "Stage Box
     or Physical Outs" instead of just "Stage Box" (applied to both
     for consistency — the ask specifically named the input list, but
     both use the identical mechanism, so both got updated; flag if
     only one was actually wanted).
  2. ✅ Stereo Link visual redesigned — was a thin colored line between
     the two rows, not clearly readable as "these two are linked."
     Now draws an actual bracket/box around both rows together (shared
     border + a light tinted background spanning the pair), so which
     two are linked is unambiguous at a glance.
  3. ✅ **Linked pairs now move together** — ↑/↓ buttons, the Alt+↑/↓
     shortcut, and drag-and-drop all move a linked pair as one unit
     now. Before this fix, moving just one half would've silently
     separated the pair from its partner, since the link assumes
     adjacency. Michael flagged this before testing it — good catch,
     was a real gap.
  - ✅ **Confirmed (2026-09-23):** Michael reports everything looks
    good — the three follow-up fixes, plus paste and XLSX import for
    endpoints both work well. Outputs section + Endpoint Locker
    considered verified end-to-end.

---

🔵 **Superseded first round — call with Brian (2026-09-18).** Kept for
history:

- **Column shape:** Brian proposes reusing the exact same row shape as
  the input list, repurposed: `Ch` = physical output number, `Source`
  = submix name, `Mic`/`48V` = not applicable (hide), `Stand` = output
  type (wedge / IEM / aux out — full list still TBD), `Notes` and
  `Position` = unchanged/reused as-is, `Stage Box` = "physical outs,"
  labeled alphabetically or numerically (open question: same box pool
  as inputs, or a separate one for outputs?).
- **`Ch` needs to be a manual override**, not a fixed auto-number —
  physical output/aux/matrix numbering on a real console often doesn't
  run 1-2-3 or starts elsewhere. Likely the same "auto default,
  always overridable" pattern the box-position numbers already use.
- **Placement:** a separate Outputs section, but on the **same Show
  Planner tab** — sits below the input list, above the gear pull
  summary.
- **Gear pull summary:** unprompted positive feedback — Brian uses a
  mix of his own gear and venue/production-company gear, and having
  the pull summary has been genuinely useful for that. No action, just
  good to know it's landing well.
- Still open/unconfirmed: full list of output types beyond
  wedge/IEM/aux-out; whether output boxes share the same pool as input
  boxes; a real reference export from an actual show (asked for,
  awaiting). More input expected from Michael/Brian's ongoing
  conversation — hold off building until that's in.
- **Data model note (2026-09-18):** some output fields should be
  **populated from values already entered in the input list**, not
  independently re-entered — exactly which fields is still TBD, to be
  clarified by the spreadsheet below. Others are dropdown/toggle/free
  text, same as inputs.
- **UX convention (2026-09-18):** interface should match the input
  list's interaction patterns — reorder (move up/down), Duplicate
  button, etc. — same component feel, not a new pattern to learn.
- **Michael is preparing a reference spreadsheet** (his own
  interpretation of what Brian described, will take some time) to
  pin down the exact columns and their behavior — **hold off designing
  further until that arrives.**
- **Validation plan (queued, not yet decided):** once there's a design,
  Michael wants to share renderings/mockups with Brian to confirm
  before building — discuss the *how* (mockup approach) after the
  spreadsheet lands, not before.

### Print/PDF: persistent header + per-section print options
✅ **Header repeat + section order built (2026-09-25)**, after Brian's
review call: (1) the full show header (band + date/venue/contact/
monitors/channel + output counts) now repeats on **every printed page**
— it lives inside each section's `<thead>`, which browsers natively
repeat, so a long input list spilling to page 2/3 keeps its header; (2)
print order is now **Input List → Output List → Gear Pull**, with the
**gear pull last on its own page** (own repeating header too) instead of
sitting between the input list and outputs. Advance notes stay right
after the input list. Applied to both print paths (standalone crew sheet
and in-app print preview). Not yet click-tested with a real print/PDF.
- **Tradeoff to be aware of:** because gear pull now always starts a
  fresh page, small shows that used to fit on one page now print 2+
  pages. That's what the still-deferred **print options dialog**
  (checkboxes per section + choose page-per-section vs. all-on-one)
  would solve — the natural next step if that comes up.
- Original ask, kept for history:

⚪ **Ask (2026-09-18), from the same Brian conversation** — flagged
by Michael as high-value, worth serious consideration.

- Brian likes the current printed header format (works well on
  clipboards) and wants it to **repeat on every page** of a multi-page
  printout — today, shows over ~32 channels spill onto page 2+ with no
  header there.
- Wants **print options**: checkboxes to include/exclude Input list /
  Output list / Gear pull summary, and control over whether each
  section starts on its own page or flows together — useful both for
  large shows (avoid a cramped single page) and small shows (fine to
  keep everything on one page).
- Michael asked for a technical read on effort before this gets
  scoped further — see chat 2026-09-18: the header-repeat is
  achievable reliably via the browser's native repeating `<thead>`
  (no new dependency); a pre-print options panel plus CSS page-breaks
  per section is also achievable with existing tools. The real
  constraint: this all rides on the browser's native print/PDF engine,
  not a custom PDF generator, so we can control where page breaks land
  within one continuous printout, but can't produce separate
  standalone PDF *files* per section without adding a real PDF library
  — worth confirming that's not actually what's wanted before treating
  it as in scope.
- **Confirmed by Michael (2026-09-18):** one continuous printout where
  each selected section starts fresh on its own page is sufficient —
  separate PDF files per section are not needed. Keeps the whole
  feature buildable with the existing browser-print approach, no new
  PDF library required.

- **Thomas:** wants an output section to plan monitors and speaker
  types, "maybe even for type of FOH speakers."
- **Harrison:** "outputs for stage mixes/IEMs and FOH outputs would be
  great."
- **Alvaro:** wants an input-style section for outputs, e.g. `MAIN LR —
  Matrix 1 — Out 1-2 — Stage box SL`, so everything's compiled on one
  page.
- **Reference:** Alvaro shared a real example table — columns `#`
  (channel range), `Name`, `Model`, `Position` (color-coded by stage
  area: Drums/Bass/Percussion/Guitar/Strings/Keys/Vocal/DJ/CUE/Side
  Fills). The stage-plot diagram in that same image is **not** a
  reference we're using — stage plots are explicitly out of scope (see
  below).
- **Design note:** that table shape (range/name/model/color-coded
  position) maps naturally onto patterns already in the app — the
  existing channel-color-by-group system, and the new Stage Position
  field idea below could double as the "Position" column here.
- Also see `https://www.mixingmusiclive.com/blog/input-lists-and-stage-plots`
  as one reference for what a fuller input/output list can look like —
  not the only one to check.

### Sub-snakes / multiple stage boxes / patch locations
✅ **Built (2026-09-17).** Approved by Michael ("go ahead, I'll review
your ideas when done"), then refined further using a real reference
input-list template Michael shared (confirmed the "letter + sequential
number" shape — A1-12, C1-8, D1-11, B1-10 — and a legend format of
`name - position - description`, e.g. "A - DSL - DRUMS").

- Each show now has its own **Boxes** panel (toggle button next to
  "Sort by group"): add/rename/recolor/describe boxes, optionally tag
  each with a Stage Position.
- Each channel can be assigned to a box; its position within that box
  auto-numbers sequentially (override-able, same "default + always
  editable" pattern the old plain-number field used) and prints as
  e.g. "A3".
- Duplicate detection is now scoped per box (two channels both in box
  A at position 3 conflict; A3 and B3 don't).
- Lives entirely inside the show's own data — no new Supabase table.
- ✅ **Confirmed working (2026-09-17)** by Michael in a real session,
  including the box-color-in-the-dropdown and color-in-print follow-ups.

Correction to the framing below: today's "Stage Box" field used to be
just a bare numeric override, not any kind of naming/grouping concept —
Harrison's ask needed new functionality, not reuse of existing behavior.

- **Harrison:** wants to use the existing Stage Box field as a true
  sub-snake concept — assign and color-code channels into named snakes,
  e.g. `A1-12`, `B1-12`, `C1-12`.
- **Alvaro:** wants named stage boxes by physical location — SL box, SR
  box, orchestra pit box, "local input" (straight to the desk) — so you
  know where to patch each channel.
- **Open question for scoping:** one flexible feature (user-named,
  user-colored boxes, each with its own numbering) probably serves both
  the "lettered sub-snake" and "named-by-location" use cases — confirm
  this before building two separate things.

### Stage Position field
✅ **Built (2026-09-17), together with Boxes below** — Michael shared a
real reference input-list template that confirmed Stage Position and
Stage Box are genuinely two separate columns (not one), and that
"MONITOR WORLD"/"HR"-style venue-specific spots show up alongside the
standard theatrical abbreviations — confirming the dropdown + free-text
shape was right.

- A per-channel field, **dropdown + free-text**, telling the crew where
  on stage a mic or box physically goes. Common on professional input
  lists.
- Implemented as its own dropdown (USL/USC/USR/SL/C/SR/DSL/DSC/DSR +
  "Other…" free text) — same manual-escape-hatch pattern as rental
  mics. New column in the input list, exports, and both print views.

---

## Input list / channel editing

### Auto-pair stereo inputs into two channels
✅ **Done and confirmed working (2026-09-17).** Two independent reports
of the same friction.

- **Thomas:** picking Keys L/R only added one channel; had to add it
  twice and manually relabel L/R. Suggests either auto-creating both
  channels, or simpler presets like separate "Keys L" / "Keys R"
  buttons — fewer taps, works better on touch devices.
- **Brian:** same issue with Stereo DI — only creates one input instead
  of two.
- **Decision (Michael, 2026-09-17):** auto-create both channels from
  one click (not separate L/R buttons). Implemented: the three
  stereo-DI catalog presets (Keys L/R, Gtr Modeler L/R, Tracks L/R) now
  add two channels at once ("X L" / "X R", same resolved mic, "same
  box" note on the R channel — matching how the Band Form's own
  auto-generation already handled Keys). Verified via build; needs a
  real click-test in an authenticated session to fully confirm.
- ✅ Also from Michael: "Keys 2 (mono)" preset label renamed to
  "Keys Mono" — done same pass.

### Duplicate a channel row
✅ **Built and confirmed working (2026-09-17).** A "⧉" button sits next
to ↑/↓/✕ on each channel row — click it, an exact copy appears directly
below, then slide it into place with the existing move buttons.

🔴 **Brian** (2026-09-17, via text): wants a "Duplicate" action on a channel
row that copies name/mic/stand, then can be slid into position on the
input list — instead of copy-and-paste. His stated use case: bands with
many similar channels (e.g. a drum mic'd 8 ways, or "sometimes x24" for
larger ensembles) where he's currently re-adding and re-configuring each
one from scratch. Michael's framing in the exchange, which Brian
confirmed matches what he wants: "Duplicate" button on a row → new copy
appears → reorder it into place using the existing move up/down
controls. Flagged high priority — pairs naturally with the existing
per-row actions and reordering already in the channel list; likely a
small, self-contained addition relative to its usefulness for anyone
with repeated similar channels (drum kits, horn sections, choirs).

### More Mic/DI type options
- **Thomas:** missing a few input types — e.g. XLR-out from an amp with
  a built-in DI, and a "brings their own DI" option (distinct from a
  generic rental).

### Name vs. instrument label order (Band Form → input list)
- Raised in the context of two keyboard players on one show. Requested:
  let the engineer choose whether generated channel labels show name
  first or instrument first — helps distinguish similar roles and helps
  the crew learn who's who.

### Multi-instrument player handling
- ⚪ Revisit how the app handles a band member who plays more than one
  instrument. Not confirmed broken, just flagged as worth a look —
  attribution unclear, follow up if it resurfaces.

### Hotkeys
✅ **Built (2026-09-21).** Brian's original asks (Cmd/Ctrl+D, Ctrl+Up/Down)
turned out to conflict with things a web page can't override — Cmd/Ctrl+D
is reserved by every major browser for bookmarking, and Ctrl+Up/Down is
reserved by macOS itself for Mission Control. Shipped instead, confirmed
by Michael as an acceptable substitute:

- **D** (no modifier) — duplicate the row containing keyboard focus.
  Scoped to skip actual text entry (typing in the name/note fields
  won't accidentally trigger it).
- **Alt/Option+↑/↓** — move the focused row up/down. Not reserved by
  any browser/OS, and mirrors how code editors already do "move line
  up/down" (e.g. VS Code).
- **Tab/Shift+Tab** — already native, no work needed.
- **Escape** — closes an open color-picker popover.
- Desktop-only by design — hardware shortcuts don't apply on a
  touchscreen; the existing ↑/↓/⧉ buttons remain the real cross-device
  mechanism, this is just an accelerator on top. A Bluetooth keyboard
  on a tablet would pick these up automatically, no extra work.
- Discoverability: shortcut hints are in the row-button tooltips, plus
  a small "⌨ Shortcuts" reference panel in the input list (toggle
  button next to Boxes). Also queued to fold into the user guide once
  that's updated (see `project_phase1_status.md`).
- **UX follow-up (2026-09-21):** Michael tried it and correctly flagged
  it wasn't obvious how to "select" a row (had to guess a dropdown
  would work). Fixed: the whole row now visibly highlights
  (gold left accent) whenever it contains keyboard focus, via CSS
  `:focus-within` — no guessing needed. The drag handle (⠿) is now the
  canonical, tab-reachable way to select a row for shortcuts, with its
  own visible focus ring.
- **Same conversation:** the "Boxes" and "⌨ Shortcuts" toggle buttons
  were sitting in the Input List title row, which read like they were
  part of the column headers right below them. Moved both (and "Sort
  by group") into their own slim utility bar between "Add inputs" and
  "Input list," leaving the list's own heading button-free.
- ✅ Confirmed working by Michael in a real session (2026-09-21),
  including the row-highlight and toolbar-placement follow-ups.

---

## Band Form

### Customization
- 🟡 This is **Phase 6 in the original CLAUDE.md roadmap**
  ("Customizable questionnaire") — scoped previously but never built.
  Multiple users independently asking for it is a good signal to
  revisit that phase.
- **Timing decided (2026-09-25):** build it **after the upcoming
  production push**, not before — it's not on the deploy checklist.
- **Addition (Michael, 2026-09-25): engineer-authored "policy
  messages."** Let the engineer add read-only informational text to the
  Band Form that bands see before/while filling it out — e.g. "We
  supply the following backline: x, y, z. Bands must bring their own:
  a, b, c." This is **not covered by the original Phase 6 spec** (that
  covers editable labels/helper text on existing fields and extra
  *questions*, not standalone informational blocks), so it's an add-on
  to scope alongside it. Naming still open — candidates: "Notes to the
  band," "House info," "What we provide," "Requirements." Design
  questions for when this is picked up: where blocks can sit (top of
  form vs. next to the backline section they relate to), one block vs.
  several, plain text with line breaks vs. any formatting, and whether
  a block can carry an optional "I've read this" acknowledgment (the
  answer would append to advance notes like other custom questions).

### Combining multiple submissions into one show ("sets")
- **Update (2026-09-25):** Michael has ideas on sets-vs-shows to review
  later, and sees it as belonging with a related cluster: a
  **calendar view, and ordering/sorting of the shows list**. Plan is to
  scope these together rather than the sets idea alone. **Note:** the
  calendar and sorting ideas themselves are not written down anywhere
  in the docs — Michael to bring them when this is picked up.
- **Brian:** wants to combine several band-form submissions into a
  single show — e.g. for a festival where each band does its own set.
- **Michael's framing:** consider treating a "show" as a collection of
  "sets," each built from its own band-form submission. Good fit for
  the festival use case; needs real design thought before committing —
  not a small change to the current show/channel data model.

---

## Bigger/strategic ideas

### Spreadsheet export (CSV / XLSX)
✅ **Built (2026-09-21).** Michael's own idea — reduce adoption friction
for engineers who already run their workflow through spreadsheets, by
letting StageAdvance data plug into that instead of requiring a switch.

- "Export CSV" and "Export XLSX" buttons added next to "Copy as text" /
  "Print crew sheet." Both reuse libraries already in the app (`xlsx`
  is already a dependency for import; the CSV pattern already existed
  for the access-requests admin export) — no new dependencies.
- **Google Sheets:** considered and deliberately not building native
  OAuth/API integration — that's a materially bigger, more fragile lift
  (Google sign-in consent, API credentials, possible app-verification
  review) for something CSV/XLSX already solves indirectly: Sheets can
  natively import either format in one extra step. Revisit only if
  real demand shows up for something a plain file can't do.
- Structured so an "Output List" sheet can slot in as a second XLSX tab
  alongside "Input List" once Outputs is built — no reshaping needed.
- ✅ Confirmed working by Michael in a real session (2026-09-21) —
  both CSV and XLSX downloads work correctly, UX looks good.

### Console export (X32 / M32, possibly via Mixing Station)
🔵 **Decided (2026-09-17): roadmap item, not building now.** Michael's
call — keep this under consideration for later rather than scoping it
today; revisit once there's more clarity on direction (direct export
vs. Mixing Station integration vs. neither).

- **Brian:** exporting input list info into a format the Behringer X32
  or Midas M32 could use to build a console preset — both are popular
  consoles at the lower end of the pro market.
- **Michael's counter-consideration:** rather than building direct X32/M32
  export, **Mixing Station** (a popular third-party app that already
  talks to most major consoles — editing, show setup, remote mixing)
  could be a smarter integration point, acting like an API layer instead
  of building per-console exporters ourselves.
- **Risk flagged by Michael:** Mixing Station could also just build
  what StageAdvance does — worth weighing before leaning on them as a
  dependency/partner.

### Buyer personas
- Michael wants to draft real buyer personas to define the actual
  target audience (smaller/mid-size gig and theatre engineers, not
  large touring production teams) and use that to keep scope focused —
  explicitly to avoid over-engineering and clutter as more requests
  come in.

### Public changelog + roadmap page
- Create a public-facing changelog and "what's coming" list to share
  with users — separate from this internal doc.

### Monetization / access control
- Open questions, not yet decided:
  - Should the app have a paywall or some access control, or stay open?
  - Alternative: Patreon or PayPal for voluntary contributions.
  - Could a small subscription work, and what would power/bill it?

### Favicon
- Michael made his own favicon and will upload it — **supersedes** the
  RealFaviconGenerator instructions already queued in memory from
  before this feedback round. Reconcile to one favicon task when
  picking this back up (use whichever file Michael actually provides).

---

## Explicitly out of scope

- **Stage plot tool.** Alvaro raised it as a "someday" idea; Michael's
  call is to leave it out — well-served by existing dedicated tools
  (mostly used by bands/crews to brief local stage managers), and not
  aligned with this app's target audience of smaller gig/theatre
  engineers rather than big touring production teams.

---

## Notes on process

- **Mobile bug fixed 2026-09-27 (found by Michael, real phone
  screenshots):** in the input list, Source (channel name) and Mic/DI
  were forced side-by-side into two cramped half-width columns on
  mobile, clipping mic names ("Shure Be…", "Sennheiser…"). Every other
  field in that row already got its own full-width row; this pairing
  didn't. Fixed: each now gets its own full-width row, both gained
  field labels ("Source", "Mic / DI") for consistency with the rest of
  the row. Everything else Michael captured (Show Details, Gear Pull,
  the Outputs rows, the Add Inputs chip palette) already held up well
  on a real phone — no other mobile issues found in this pass. Not yet
  re-verified on a real device after the fix.

- **Bug fixed 2026-09-25 (found by Michael):** renaming an item in the
  Inventory tab (mic locker or endpoints) never saved. The label input
  wrote every keystroke into state, so the on-blur "did it change?"
  check compared the typed text against itself and skipped the save.
  Fixed by making the input uncontrolled (typing no longer touches the
  saved label; blur compares against it; Enter also commits; an empty
  name reverts). **This bug was in the mic locker since Phase 2, so it
  also affects the live site** — the fix ships with the next push. Not
  yet click-tested after the fix.

- Some of this feedback is being saved by Michael as testimonial quotes
  for a future promo page — not an app feature, just noted so it isn't
  lost.
- Users are engaged and enthusiastic; being responsive to their
  feedback is explicitly a retention strategy Michael wants to lean
  into.
