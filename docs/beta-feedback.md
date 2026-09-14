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

_Last updated: 2026-09-13._

---

## 🔴 Top priorities (recurring across multiple users)

### Outputs / monitor mixes section
Requested independently by **four of four** contributors — the strongest
signal in this round.

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
Two related but distinct framings — worth reconciling into one design,
not building both separately.

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
Michael's own idea, prioritized — addresses the same underlying need as
the stage-box/sub-snake requests above from a different angle (crew
placement, not signal routing).

- A per-channel field, **dropdown + free-text**, telling the crew where
  on stage a mic or box physically goes. Common on professional input
  lists.
- Consider whether this and the sub-snake/box work above should share
  one UI element or stay separate (position ≠ routing, but they're
  often shown together on real input lists — see the outputs reference
  table above, which combines position with routing in one column).

---

## Input list / channel editing

### Auto-pair stereo inputs into two channels
Two independent reports of the same friction — worth prioritizing as a
quick usability win even outside the "top 3" above.

- **Thomas:** picking Keys L/R only added one channel; had to add it
  twice and manually relabel L/R. Suggests either auto-creating both
  channels, or simpler presets like separate "Keys L" / "Keys R"
  buttons — fewer taps, works better on touch devices.
- **Brian:** same issue with Stereo DI — only creates one input instead
  of two.
- 🟡 Also from Michael: the current "Keys 2 (mono)" preset label is
  confusing — rename to "Keys Mono."

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
- ⚪ Brian mentioned wanting hotkeys for quick actions like renaming, but
  the specifics weren't clear. Needs a follow-up question to Brian
  before this is scoped — what actions, what keys, what workflow.

---

## Band Form

### Customization
- 🟡 This is **Phase 6 in the original CLAUDE.md roadmap**
  ("Customizable questionnaire") — scoped previously but never built.
  Multiple users independently asking for it is a good signal to
  revisit that phase.

### Combining multiple submissions into one show ("sets")
- **Brian:** wants to combine several band-form submissions into a
  single show — e.g. for a festival where each band does its own set.
- **Michael's framing:** consider treating a "show" as a collection of
  "sets," each built from its own band-form submission. Good fit for
  the festival use case; needs real design thought before committing —
  not a small change to the current show/channel data model.

---

## Bigger/strategic ideas

### Console export (X32 / M32, possibly via Mixing Station)
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

- Some of this feedback is being saved by Michael as testimonial quotes
  for a future promo page — not an app feature, just noted so it isn't
  lost.
- Users are engaged and enthusiastic; being responsive to their
  feedback is explicitly a retention strategy Michael wants to lean
  into.
