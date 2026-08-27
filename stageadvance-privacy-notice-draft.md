# StageAdvance Privacy Notice (Draft)

*This is a starting draft, not a finished legal document. Placeholders are marked
in [brackets]. Have this reviewed by a lawyer before it governs real user data —
requirements differ if you have users in the EU (GDPR), California (CCPA), or
if you begin charging for the product.*

**Last updated:** August 27, 2026

---

## 1. Who this covers

StageAdvance is a tool for live sound engineers to plan shows: tracking a
personal mic/DI inventory, building input lists, and collecting show info
from bands via a questionnaire. This notice explains what we collect, from
whom, and how it's kept separate between accounts.

There are two kinds of people whose information touches this app:

- **Engineers** — the account holders who sign up, use the planner, and send
  out questionnaire links.
- **Band contacts** — people who fill out an engineer's questionnaire link.
  They do not have accounts and did not sign up for this service directly;
  they're submitting information *to* a specific engineer they're already
  working with.

## 2. What we collect

**When you create an engineer account:**
- Name and email (for login and account recovery)
- Your mic/DI inventory (models, quantities) — gear info, not personal data
- Shows you create: band names, venues, dates, channel lists, your own notes

**When a band contact fills out your questionnaire:**
- Band name, contact name, email, and mobile number
- Band member names and instruments, if provided (names are optional —
  a band leader can list "guitarist," "drummer," etc. without naming people)
- Backline, tracks/click, and free-text notes they choose to add

We don't collect payment info, precise location, or anything beyond what's
needed to generate an input list and let you reach the band before a show.

## 3. How your data is kept separate

Each engineer account is isolated: your mic inventory, your shows, and your
questionnaire inbox are visible only to you, enforced at the database level —
not just hidden in the interface. A band's submission is routed only to the
specific engineer whose link they used; it is never visible to other
engineers on the platform.

## 4. How we use this data

- To generate and store your input lists, gear pulls, and crew sheets
- To route questionnaire submissions to the correct engineer's inbox
- To let you contact a band using the info they provided

We do not sell data, use it for advertising, or share it with other engineers
or bands beyond what's described above.

## 5. Who else sees it

Your data is stored with **Supabase** (database and authentication) and the
application itself is hosted on **Netlify**, both of which process it on our
behalf under their own security and privacy terms. When you add a mic or DI
that isn't already recognized, its model name (nothing else — no personal or
show information) is sent to **Anthropic** to identify what kind of gear it
is, so we can suggest useful defaults. We don't share your data with any
other third party.

## 6. Band contacts: a note on submitted information

If you're filling out an engineer's questionnaire: you're sending this
information directly to that engineer for the purpose of planning your show.
We'd recommend only including bandmates' names if you're comfortable sharing
them, and any bandmate can ask their engineer to remove their name from a
submission at any time.

## 7. How long we keep data, and how to delete it

Shows, inventory, and questionnaire submissions are kept until you delete
them yourself. Deleting your account is immediate and permanent: it removes
your login and all associated shows, inventory, and submissions right away
— there is no grace period or recovery window, so make sure it's what you
want before confirming.

## 8. Your rights

You can review, edit, export, or delete your shows and inventory at any time
from your account settings. Deleting your account there deletes everything
associated with it immediately. For any other question about your data,
contact support@kickandsnare.llc.

## 9. Children's privacy

StageAdvance is intended for professional use and is not directed at
children. We don't knowingly collect data from anyone under 16.

## 10. Changes to this notice

If this notice changes in a way that affects how your data is used, we'll
note the update date above and, for material changes, notify account holders
by email.

## 11. Contact

Questions about this notice or your data: support@kickandsnare.llc.
