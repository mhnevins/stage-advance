/*
 * Save-queue for per-show rows (see supabase/migrations/0005_shows_table.sql).
 * Deliberately React-free so it can be unit tested with a fake API
 * (src/lib/showsSync.test.js) — the real thing needs a signed-in
 * Supabase session that automated tests can't get.
 *
 * Rules this enforces — each one exists because of a real failure mode
 * of the old one-JSON-blob-per-user storage:
 *
 *  - Only shows the user actually touched are ever written. Loading
 *    shows never writes anything (the old code saved every load back,
 *    which manufactured false conflicts).
 *  - A save only succeeds if the row hasn't changed since this tab last
 *    saw it (api.save compares the row version). If someone else changed or
 *    deleted that show meanwhile, we stop and report a conflict rather
 *    than overwrite. Other shows are unaffected — a stale tab can no
 *    longer wipe shows it doesn't even know about.
 *  - Deletes are always explicit user actions, never inferred from a
 *    show being absent from the list (a partial/stale list must never
 *    be able to delete anything).
 *  - All network work runs one task at a time, in order, so an edit made
 *    while a save is in flight is saved afterwards with the fresh
 *    version instead of racing it.
 *
 * `api` shape:
 *   create(show)                -> { ok: true, version } | { ok: false }
 *   save(show, expectedVersion) -> { ok: true, version } | { ok: false }
 *   remove(id)                  -> void
 */

export function createShowsSync({
  api,
  getShow,            // (id) => latest in-memory show object, or undefined
  onConflict = () => {},
  onSaveError = () => {},
  onSaveOk = () => {},
  debounceMs = 500,
  retryMs = 5000,
}) {
  const versions = new Map(); // show id -> server version we last saw; absent = not persisted yet
  const dirty = new Set();
  let debounceTimer = null;
  let retryTimer = null;
  let chain = Promise.resolve();
  let conflicted = false;
  let stopped = false;

  const enqueue = (task) => {
    chain = chain.then(task).catch((e) => onSaveError(e));
    return chain;
  };

  async function flushTask() {
    if (stopped || conflicted) return;
    const ids = [...dirty];
    dirty.clear();
    let failed = false;
    for (const id of ids) {
      const show = getShow(id);
      if (!show) continue; // deleted locally since it was marked dirty
      try {
        const known = versions.has(id);
        const r = known ? await api.save(show, versions.get(id)) : await api.create(show);
        if (r.ok) {
          versions.set(id, r.version);
        } else {
          conflicted = true;
          dirty.clear();
          onConflict(id);
          return;
        }
      } catch (e) {
        dirty.add(id); // keep it, retry later
        failed = true;
        onSaveError(e);
      }
    }
    if (failed) scheduleRetry();
    else if (ids.length) onSaveOk();
  }

  function scheduleRetry() {
    if (retryTimer || stopped) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      enqueue(flushTask);
    }, retryMs);
  }

  return {
    /** Replace everything we know with a fresh server list: [{ id, version }]. */
    setBaseline(list) {
      versions.clear();
      dirty.clear();
      conflicted = false;
      list.forEach(({ id, version }) => versions.set(id, version));
    },

    /** The show with this id was created or edited locally. */
    markDirty(id, { immediate = false } = {}) {
      if (stopped || conflicted) return;
      dirty.add(id);
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => enqueue(flushTask), immediate ? 0 : debounceMs);
    },

    /** The user explicitly deleted this show. */
    remove(id) {
      dirty.delete(id);
      return enqueue(async () => {
        if (stopped || !versions.has(id)) return; // never persisted — nothing to delete remotely
        await api.remove(id);
        versions.delete(id);
      });
    },

    /** Save anything pending right now; resolves when the queue is idle. */
    flushNow() {
      clearTimeout(debounceTimer);
      return enqueue(flushTask);
    },

    get hasConflict() { return conflicted; },
    get pendingCount() { return dirty.size; },

    dispose() {
      stopped = true;
      clearTimeout(debounceTimer);
      clearTimeout(retryTimer);
    },
  };
}
