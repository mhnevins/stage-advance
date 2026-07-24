/*
 * Drop-in replacement for the Claude-artifact `window.storage` API,
 * backed by the browser's localStorage so the app works standalone.
 *
 * IMPORTANT LIMITATION:
 * localStorage is per-browser, per-device. In the artifact, `shared: true`
 * data (the Band Form submissions inbox) was visible to anyone with the
 * link, from any device. Here, a band leader filling out the form on
 * their phone will NOT show up in your inbox on your laptop — each
 * device has its own isolated storage.
 *
 * The Planner (your shows) works perfectly like this, since only you
 * ever touch that data, on your own device.
 *
 * The Band Form inbox will keep working for on-device testing (fill out
 * the form and see it appear in your own inbox), but for real cross-
 * device use you'll want to swap this module for a small hosted backend
 * — Supabase or Firebase are good free options. Everywhere else in the
 * app calls `storage.get/set/delete/list`, so that's the only file that
 * would need to change.
 */

const NAMESPACE = "stage-advance";

const k = (key, shared) => `${NAMESPACE}:${shared ? "shared" : "local"}:${key}`;

export const storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(k(key, shared));
    if (raw === null) return null;
    return { key, value: raw, shared };
  },

  async set(key, value, shared = false) {
    localStorage.setItem(k(key, shared), value);
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const existed = localStorage.getItem(k(key, shared)) !== null;
    localStorage.removeItem(k(key, shared));
    return { key, deleted: existed, shared };
  },

  async list(prefix = "", shared = false) {
    const full = `${NAMESPACE}:${shared ? "shared" : "local"}:${prefix}`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const stored = localStorage.key(i);
      if (stored && stored.startsWith(full)) {
        keys.push(stored.slice(`${NAMESPACE}:${shared ? "shared" : "local"}:`.length));
      }
    }
    return { keys, prefix, shared };
  },
};
