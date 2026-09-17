# Growth & monetization strategy

A living planning doc for how StageAdvance gets promoted, who it's for,
how access is controlled, and whether/how it makes money — companion to
`beta-feedback.md`, which stays focused on product feedback from active
users. This doc is for the business/positioning side. Update it as
decisions get made rather than starting a new doc each time.

_Last updated: 2026-09-17. Structure only — sections below are prompts
to fill in together, not decisions yet._

---

## 1. Where this stands today (grounding facts, not up for debate)

- **Access model right now: fully open.** Anyone can sign up via
  Supabase Auth (magic link), no invite gate, no plan tiers, no paywall.
  Every account gets the same features.
- **Isolation exists, tiering doesn't.** RLS enforces per-user data
  separation (Phase 1), but there's no concept yet of "free" vs. "paid"
  vs. "admin" at the schema or auth level — that's new work, not a
  toggle.
- **Hosting cost is already a live constraint.** Netlify deploys are
  paused until the 2026-09-23 billing reset (see
  `project_phase1_status.md`) — a real data point for the monetization
  conversation, not hypothetical.
- **Current users are hand-recruited beta testers** (Thomas, Harrison,
  Brian, Alvaro), not acquired through any marketing effort yet.
- Some existing threads from `beta-feedback.md` belong in this doc's
  conversation rather than the product-feedback one: buyer personas,
  monetization/access-control questions, and the public changelog idea.
  Leaving them in place there for now so nothing gets lost — worth a
  pass later to fold them in here and de-duplicate.

## 2. Buyer personas

Who is this actually for? Goal: specific enough to keep scope focused
and say no to things that don't serve this person.

- Starting point already on record: **smaller/mid-size gig and theatre
  engineers** — explicitly *not* large touring production teams.
  Confirmed by who's actually using it (university theatre sound
  design, musical theatre with a live band).
- Open:
  - What does this person's current workflow look like without
    StageAdvance? (Spreadsheet? Paper? Nothing?)
  - How many shows/month, how many channels typically, freelance vs.
    in-house?
  - Is there a second persona — e.g. a venue vs. a touring-with-a-band
    engineer vs. a student — or is one persona enough for now?

## 3. Positioning & landing page

- What's the one-sentence pitch? (Needs a draft — something like "input
  lists and mic pulls without the spreadsheet," but worth workshopping
  against the persona above.)
- What does today's landing experience look like — is there a marketing
  page at all before login, or does the root URL go straight to sign
  in/app?
- What does a real landing page need to do: explain it in one glance,
  show it (screenshot/demo?), and get someone to sign up. Candidates to
  reuse: the user-guide Artifact already built (see
  `project_phase1_status.md`) has real UI mockups in the app's own
  design system — likely reusable for landing-page visuals rather than
  building new ones.
- Testimonials: `beta-feedback.md` already notes some beta feedback is
  being saved as promo-page quotes — a real asset once there's a page
  to put them on.

**Status (2026-09-17): first draft built and approved locally.** Built
as the new default view at `/` (was previously the Login screen —
Login moved to `/login`, reached via a "Sign in" button). New files:
`src/components/Landing.jsx`, `src/components/ScreenshotPlaceholder.jsx`.
Sections: hero (Request access / Sign in CTAs), "who it's for" (3
persona cards), feature grid (6 real shipped features, no "AI" wording
per standing rule), how-it-works (3 steps), testimonial (clearly marked
placeholder — deliberately not using a real beta tester's private
feedback as public copy without their explicit OK first), Support
section (live Ko-fi button — `https://ko-fi.com/stageadvance`), final
CTA, footer. Two screenshot placeholders (dashed boxes, labeled) to
swap for real captures once deployed — search
`ScreenshotPlaceholder` usages when doing that. Verified in-browser at
desktop and mobile widths, both clean. Michael reviewed and approved
as good enough for now — **copy tweaks explicitly deferred**, not
forgotten; revisit before this ever goes live for real.

## 4. Access control & feature tiers

**Status (2026-09-17): built and confirmed working locally**, except
the two pieces that need an actual deploy. Migration
`0003_access_requests.sql` has been run against the real Supabase project.
Michael confirmed: submitting a request via `/request-access`, the admin
"Requests" tab reading pending requests (RLS policy scoped to Michael's
email), and Decline updating status — all good. **Still unverified** —
both depend on Netlify Functions, which don't run under plain `npm run
dev` and only work once actually deployed: Approve (`invite-user.js`,
sends the real account invite) and the Slack alert on new requests
(`notify-access-request.js`). Slack webhook URL is already set as a
Netlify env var (`SLACK_WEBHOOK_URL`, scoped to Functions). Confirm both
once Netlify deploys resume on 9/23 (or sooner on an upgrade) — this is
the main reason this feature is still sitting uncommitted/unpushed
locally.

**Decided (2026-09-17):** feature-tiering is premature — we don't yet
know which features are actually worth paying for, and won't until
there's enough usage/survey data to tell. Deferring the "free vs. paid
feature" line entirely (see Monetization below). What we're building
now is **who gets an account at all**, which is a separate axis from
feature tiers.

**Access model decided:** replace fully-open self-serve signup with a
**Request Access** gate:
1. Public site shows a Request Access form (email + name, maybe "how'd
   you hear about us") instead of an open signup form. Writes to a new
   table — not `auth.users` — no account exists yet at this point.
2. Michael reviews requests in an **in-app admin page** (decided over
   the Supabase-dashboard-only alternative — worth the small extra
   build to avoid needing to touch Supabase directly, and it scales
   better as request volume grows) and approves the ones he wants in.
3. Approval triggers a Supabase Auth admin invite
   (`inviteUserByEmail`, same service-role pattern already used in
   `delete-account.js`), which is what actually creates the account
   and emails the person a link to sign in. Self-serve signup gets
   disabled at the Supabase project level — this is enforced
   server-side, not just a hidden UI form, consistent with the Phase 1
   "enforce at the database/server level, not just the UI" principle.
- **Doubles as list-building:** every request (approved or not), with
  proper consent language in the form, becomes the seed list for
  update/donation emails — see Monetization below. Not a CRM build;
  just a Supabase table to export from into a real email tool later.
- **Open — notification mechanism:** Michael doesn't want to manually
  check for new requests. Needs some alert when one comes in. Options
  to pick from: (a) email via a lightweight transactional provider
  (e.g. Resend — generous free tier, simple API, pairs naturally with
  a Netlify Function) triggered on insert; (b) a Slack/Discord webhook
  ping, if Michael already uses one of those — no new account to set
  up, arguably simpler than (a). Waiting on Michael's preference before
  building.
- Related but distinct: an *admin* role/page for Michael already falls
  out of this (he needs somewhere to see/approve requests) — no
  separate justification needed, it's required for this feature alone.
- **Touches the privacy notice:** Phase 5's privacy notice draft
  predates this idea and doesn't mention collecting emails for
  requests/updates/donation asks. Needs a line item before this
  collects real people's data for real — still unreviewed by a lawyer
  regardless (standing fact, not new).

## 5. Monetization approach

**Decided (2026-09-17) — sequencing:**
1. **Now:** stay fully open/free for everyone who's granted access,
   funded voluntarily (Patreon/PayPal tip jar). Costs are currently
   near-zero per user regardless (see note below), so this isn't
   subsidizing anything expensive yet — it's about building the
   relationship and list, not covering real infrastructure spend.
2. **Later:** move to a flat subscription (not a freemium feature
   split) once there's enough users to run real surveys and find out
   which features people would actually pay for — explicitly rejected
   gating today's proposed features (Outputs, sub-snakes, etc.) as the
   paywall line, since that's a guess without data.
- **Cost reality check:** the Netlify pause was from build-minute
  usage (many small pushes), not from serving traffic — a workflow fix
  (batching pushes), not evidence hosting is expensive per user.
  Supabase's free tier covers this scale comfortably. The Anthropic
  mic-lookup call fires once per new-to-the-system mic model then
  caches forever, so it scales with the shared mic_library growing,
  not with user count. Net: no urgent cost pressure driving monetization
  timing right now — this is about sustainability and funding time,
  not an emergency.
- If/when a real subscription is built: Stripe + a webhook to flip a
  user's tier is the standard shape — not yet scoped, revisit once
  survey data points at what's worth charging for.

## 6. Public changelog / roadmap page

- Separate from this internal doc and from `beta-feedback.md` — a
  public-facing "what's new / what's coming" page, mentioned as a
  strategic idea in the feedback round.
- Ties into promotion: gives beta users and prospective users a reason
  to check back, and a public artifact to point people to instead of
  "trust me, it's under active development."

## 7. Open questions to resolve together

- [ ] Finalize buyer persona(s) — one or more? Still open — needs
      Michael's real answers (current workflow without StageAdvance,
      shows/month, freelance vs. in-house, one persona or two), not
      something to guess at.
- [x] ~~Decide: free-for-all, tiered, or paywalled~~ — decided, see
      Monetization: open/voluntary now, flat subscription later,
      feature-gating deferred until survey data exists.
- [x] ~~Decide whether landing page is a new build or adapts the
      existing user-guide Artifact content~~ — built as a new page
      (matches the app's own design system directly rather than
      reusing the guide's content) — see §3 status above.
- [x] ~~Sequencing: does landing-page/positioning work make sense
      before Netlify billing resets on 9/23~~ — yes, built and
      approved locally ahead of the reset, consistent with the
      prototype-now/push-later plan.
- [x] ~~New-request alert channel~~ — Slack, built and wired
      (`SLACK_WEBHOOK_URL` env var set) — see §4 status above.

---

## Notes on process

- This doc intentionally doesn't decide anything yet — it's the shared
  scratchpad for the promotion/monetization conversation so it isn't
  scattered across chat history.
- Grounding facts (section 1) should stay accurate to the real
  codebase/infra state — verify against current code/config before
  treating anything here as still true if much time has passed.
