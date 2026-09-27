# StageAdvance — Project Context for Claude Code

## What this is

StageAdvance is a web app for live sound engineers to plan shows: track a
mic/DI inventory, build console input lists, generate mic pull and stand
count sheets, collect show info from bands via a questionnaire, and print
crew-ready handouts.

## Current state (as deployed)

- **Frontend:** React + Vite
- **Hosting:** Netlify, connected to GitHub for auto-deploy on push
- **Backend:** Supabase (Postgres)
- **Storage pattern:** a small abstraction (`get/set/delete/list`) originally
  written to mirror the Claude-artifact `window.storage` API, later pointed
  at Supabase. Keep using this abstraction — new backend work should extend
  it, not bypass it.
- **Current limitation:** the app is single-tenant. One hardcoded mic/DI
  inventory (`INVENTORY` constant), one shared show list, one shared
  questionnaire inbox. Everything below is about fixing that.

## Where to find things

- Live repo: [your GitHub repo URL]
- Reference privacy notice draft: `stageadvance-privacy-notice-draft.md`
  (bring this into the repo — see Phase 5)

## Design principles established so far

- **Every override stays editable, never locked.** Mic choices, stand types,
  stage box lines — the app suggests a sensible default and always lets the
  engineer override it. Apply this same philosophy to new features (mic
  recognition suggestions, form question wording, etc.).
- **Rentals / unknowns get a manual escape hatch.** The "Rental / other…"
  free-text field is the existing pattern for "the system doesn't know this
  one" — the mic-recognition work below is this pattern, automated.
- **Isolation must be enforced at the database level**, not just hidden in
  the UI. Client-side filtering is not real security.

---

## Roadmap (build in this order — later phases depend on earlier ones)

### Phase 1 — Multi-tenant foundation
This unlocks everything else; do it first.

- Add real authentication (Supabase Auth, since we're already on Supabase —
  reuse existing infra rather than migrating).
- Redesign the data model so every table/collection is scoped to a user ID:
  inventory, shows, channels, questionnaire submissions.
- Enforce isolation server-side — Postgres Row Level Security policies
  keyed on `auth.uid()`. Test explicitly: create two throwaway accounts and
  confirm neither can read the other's data, including via direct API
  calls, not just through the UI.
- Give each engineer a unique Band Form link (e.g. `/form/{slug}`) so
  submissions route to the correct inbox instead of one shared inbox.
- Migrate the current owner's existing locker and shows into their own
  account as the first real user, so nothing existing is lost.

### Phase 2 — Onboarding & inventory editing
- First-login flow: walk a new user through building their own locker
  (mic/DI model + quantity) instead of inheriting the original hardcoded
  `INVENTORY`.
- Ongoing inventory management: add, edit, remove mics/DIs at any time —
  this isn't just a setup-time thing, engineers add gear over time.

### Phase 3 — Mic/DI recognition system
Goal: when a user adds a mic, auto-suggest what instruments it's typically
used for and its phantom-power needs — the same judgment call originally
made by hand for the founding locker, now made repeatable.

- **Reference table** (`mic_library`, shared across all users, separate
  from each user's personal `inventory`): known mic/DI models tagged with
  type (dynamic/condenser), phantom requirement, and typical use cases
  (kick / snare / overhead / horn / DI-active / DI-passive / vocal, etc.).
  Seed this generously with common industry mics up front.
- **AI fallback for unrecognized gear:** when a mic isn't in the table,
  make a single model lookup call (mic name + instrument category list →
  suggested tags). Cache the result into `mic_library` so it's instant for
  every user afterward — this should fire once per new-to-the-system mic,
  not on every use.
- **Bulk import UX:** don't interrupt per-mic. Parse the whole import,
  silently apply known tags, then show one summary screen for anything
  unrecognized: "12 of 15 recognized. These 3 need your input: [...]."
- **Single manual addition UX:** ask for the use case right there in the
  moment, since there's nothing to batch.

### Phase 4 — Bulk import formats
Build in this order (cheapest/most-used first):
1. Manual entry form (baseline — also the fallback for corrections)
2. Pasted plain text (matches how people already keep these lists)
3. CSV
4. XLSX
5. PDF / Word — stretch goals only, build if actually requested

All formats feed the same extract → recognize pipeline from Phase 3; only
the front-end parsing differs per format.

### Phase 5 — Privacy notice + supporting UX
- Bring `stageadvance-privacy-notice-draft.md` into the repo, fill in the
  bracketed placeholders (hosting provider name, retention period, contact
  email), and **have it reviewed by a lawyer** before it governs real user
  data — this is a draft, not a finished legal document.
- Add the three UX touchpoints once auth exists:
  - Signup screen: link to the privacy notice under the submit button.
  - Band Form footer: replace the current "this is a prototype" line with
    "Your info goes only to {Engineer Name} for planning this show. See our
    Privacy Notice."
  - Account settings: a "Your data" section — view/export info, delete
    account.

### Phase 6 — Customizable questionnaire (form config)
- Store the Band Form as a config (array of question definitions) instead
  of hardcoded JSX, so it's editable per engineer.
- Keep the core member/instrument/vocals block structurally fixed — it
  drives channel-generation logic and can't be freely restructured — but
  make its labels and helper text editable.
- Allow engineers to add their own freeform extra questions (text /
  single-select / checkbox); answers append to advance notes rather than
  feeding channel-generation logic.
- Allow show/hide toggles on optional built-in sections (backline-needed,
  tracks, click).
- This also solves "let me edit the current questions" — once the form
  reads from config, editing it is a data change, not a code change.

---

## Suggested first Claude Code session

Start with Phase 1 only. A reasonable opening prompt:

> This repo is a single-tenant Supabase app (see CLAUDE.md for full
> context). I want to make it multi-tenant: real user accounts via
> Supabase Auth, per-user data isolation via Row Level Security, and a
> unique Band Form link per engineer. Let's start by looking at the
> current schema and storage layer, then design the multi-tenant schema
> before writing any migration code.

Don't try to do all six phases in one session — each phase is a
reasonable, reviewable chunk of work on its own.
