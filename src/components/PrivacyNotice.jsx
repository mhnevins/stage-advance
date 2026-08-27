/*
 * Mirrors stageadvance-privacy-notice-draft.md — that file is the
 * readable source-of-truth in the repo; keep this in sync by hand if
 * it changes (a one-page static document, low churn expected).
 */

export default function PrivacyNotice() {
  return (
    <div className="sa-grid" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="sa-card">
        <h2 className="sa-h2">StageAdvance Privacy Notice</h2>
        <div className="sa-privacy" style={{ marginBottom: 16 }}>
          This is a starting draft, not a finished legal document. Have this reviewed by
          a lawyer before it governs real user data — requirements differ if you have
          users in the EU (GDPR), California (CCPA), or if you begin charging for the
          product.
        </div>
        <div className="sa-sub" style={{ marginBottom: 20 }}>Last updated: August 27, 2026</div>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>1. Who this covers</h3>
        <p className="sa-sub">
          StageAdvance is a tool for live sound engineers to plan shows: tracking a
          personal mic/DI inventory, building input lists, and collecting show info from
          bands via a questionnaire. This notice explains what we collect, from whom, and
          how it's kept separate between accounts.
        </p>
        <p className="sa-sub">There are two kinds of people whose information touches this app:</p>
        <ul className="sa-sub">
          <li><b>Engineers</b> — the account holders who sign up, use the planner, and send out questionnaire links.</li>
          <li><b>Band contacts</b> — people who fill out an engineer's questionnaire link. They do not have accounts and did not sign up for this service directly; they're submitting information to a specific engineer they're already working with.</li>
        </ul>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>2. What we collect</h3>
        <p className="sa-sub"><b>When you create an engineer account:</b></p>
        <ul className="sa-sub">
          <li>Name and email (for login and account recovery)</li>
          <li>Your mic/DI inventory (models, quantities) — gear info, not personal data</li>
          <li>Shows you create: band names, venues, dates, channel lists, your own notes</li>
        </ul>
        <p className="sa-sub"><b>When a band contact fills out your questionnaire:</b></p>
        <ul className="sa-sub">
          <li>Band name, contact name, email, and mobile number</li>
          <li>Band member names and instruments, if provided (names are optional — a band leader can list "guitarist," "drummer," etc. without naming people)</li>
          <li>Backline, tracks/click, and free-text notes they choose to add</li>
        </ul>
        <p className="sa-sub">
          We don't collect payment info, precise location, or anything beyond what's
          needed to generate an input list and let you reach the band before a show.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>3. How your data is kept separate</h3>
        <p className="sa-sub">
          Each engineer account is isolated: your mic inventory, your shows, and your
          questionnaire inbox are visible only to you, enforced at the database level —
          not just hidden in the interface. A band's submission is routed only to the
          specific engineer whose link they used; it is never visible to other engineers
          on the platform.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>4. How we use this data</h3>
        <ul className="sa-sub">
          <li>To generate and store your input lists, gear pulls, and crew sheets</li>
          <li>To route questionnaire submissions to the correct engineer's inbox</li>
          <li>To let you contact a band using the info they provided</li>
        </ul>
        <p className="sa-sub">
          We do not sell data, use it for advertising, or share it with other engineers
          or bands beyond what's described above.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>5. Who else sees it</h3>
        <p className="sa-sub">
          Your data is stored with <b>Supabase</b> (database and authentication) and the
          application itself is hosted on <b>Netlify</b>, both of which process it on our
          behalf under their own security and privacy terms. When you add a mic or DI
          that isn't already recognized, its model name (nothing else — no personal or
          show information) is sent to <b>Anthropic</b> to identify what kind of gear it
          is, so we can suggest useful defaults. We don't share your data with any other
          third party.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>6. Band contacts: a note on submitted information</h3>
        <p className="sa-sub">
          If you're filling out an engineer's questionnaire: you're sending this
          information directly to that engineer for the purpose of planning your show.
          We'd recommend only including bandmates' names if you're comfortable sharing
          them, and any bandmate can ask their engineer to remove their name from a
          submission at any time.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>7. How long we keep data, and how to delete it</h3>
        <p className="sa-sub">
          Shows, inventory, and questionnaire submissions are kept until you delete them
          yourself. Deleting your account is immediate and permanent: it removes your
          login and all associated shows, inventory, and submissions right away — there
          is no grace period or recovery window, so make sure it's what you want before
          confirming.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>8. Your rights</h3>
        <p className="sa-sub">
          You can review, edit, export, or delete your shows and inventory at any time
          from your account settings. Deleting your account there deletes everything
          associated with it immediately. For any other question about your data,
          contact support@kickandsnare.llc.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>9. Children's privacy</h3>
        <p className="sa-sub">
          StageAdvance is intended for professional use and is not directed at children.
          We don't knowingly collect data from anyone under 16.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>10. Changes to this notice</h3>
        <p className="sa-sub">
          If this notice changes in a way that affects how your data is used, we'll note
          the update date above and, for material changes, notify account holders by
          email.
        </p>

        <h3 className="sa-h2" style={{ fontSize: 15 }}>11. Contact</h3>
        <p className="sa-sub">Questions about this notice or your data: support@kickandsnare.llc.</p>
      </div>
    </div>
  );
}
