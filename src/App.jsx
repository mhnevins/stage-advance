import { useState, useEffect, useRef } from "react";
import { storage } from "./lib/storage";
import { useAuth } from "./lib/useAuth";
import { listMyInventory, addInventoryItem, updateInventoryItem, removeInventoryItem } from "./lib/inventory";
import { lookupMicLibrary, cacheMicLibraryEntry, fetchAiTagsForMic } from "./lib/micLibrary";
import { resolveOwnerBySlug } from "./lib/profile";
import * as submissionsApi from "./lib/submissions";
import Login from "./components/Login";

/* ————————————————————————————————————————————————
   STAGE ADVANCE v3 — input list & gear planner for live sound
   Modes: PLANNER (engineer, requires sign-in) + BAND FORM (public,
   /form/{engineer's slug}). Each engineer has their own locker, shows,
   and questionnaire inbox — see src/lib/ and supabase/migrations/.
   Band submissions land in that engineer's own inbox and can be
   imported as draft input lists built from their locker.
   ———————————————————————————————————————————————— */

const GROUPS = {
  Drums:    { color: "#E8B93E", text: "#1a1408" },
  Perc:     { color: "#E07A3E", text: "#1a0f08" },
  Bass:     { color: "#D64545", text: "#1a0808" },
  Guitars:  { color: "#5FA85C", text: "#081a09" },
  Keys:     { color: "#4E8FD1", text: "#081120" },
  "Strings/Horns": { color: "#9A6BC9", text: "#120820" },
  Vocals:   { color: "#4CC3C9", text: "#081a1b" },
  Playback: { color: "#8A8F98", text: "#101215" },
  Other:    { color: "#C9C9C9", text: "#101215" },
};

/* ——— Each engineer's locker lives in Supabase (inventory_items),
   loaded into `inventoryItems` state and managed from the Locker tab
   — see src/lib/inventory.js and renderLocker() below. ——— */

const EXTRA_OPTIONS = ["DI (passive)", "DI (active)", "Stereo DI", "Wireless HH", "Headset/Lav"];
const RENTAL = "__rental";

const CONDENSERS = ["e614 (SDC)", "sE7 (SDC)", "Roswell MiniK47", "AT2020"];
const needsPhantom = (mic) =>
  CONDENSERS.some((c) => mic === c) || mic === "DI (active)" || mic === "Pro48 (active DI)";

const STAND_OPTIONS = ["Tall boom", "Short boom", "Straight", "Drum clamp", "Desk stand", "None"];

/* ——— Mic/DI recognition (Phase 3): fixed vocabulary shared with
   supabase/migrations/0002_mic_library.sql and netlify/functions/lookup-mic.js ——— */
const MIC_TYPE_OPTIONS = ["dynamic", "condenser", "ribbon", "di-active", "di-passive"];
const USE_CASE_OPTIONS = [
  "kick", "snare", "toms", "hi-hat", "overhead", "percussion",
  "bass-di", "bass-amp", "guitar-amp", "acoustic-guitar", "keys",
  "strings", "horn", "lead-vocal", "backing-vocal", "playback",
  "di-passive", "di-active",
];

/* ——— Phase 4a: parse one line of a pasted mic list into {label, qty}.
   Generous, not exhaustive — anything that doesn't match a quantity
   pattern just becomes a bare label at qty 1; the review screen is the
   safety net for anything mis-split. ——— */
const parseLockerPasteLine = (raw) => {
  let line = raw.trim();
  if (!line) return null;
  line = line.replace(/\/\/.*$/, "").trim(); // strip a trailing // comment
  line = line.replace(/^[-•*]\s+/, "").replace(/^\d+[.)]\s+/, "").trim(); // strip list markers
  line = line.replace(/[,;]\s*$/, "").trim(); // strip a trailing comma/semicolon
  if (!line) return null;

  // strips wrapping quotes left over from a pasted `"Label": qty,`-style
  // object literal (e.g. an old hardcoded inventory list)
  const clean = (s) => s.trim().replace(/^["']+|["']+$/g, "").trim();

  let m = line.match(/^(.+?)\t+(\d+)$/) || line.match(/^(.+?)\s{2,}(\d+)$/);
  if (m) return { label: clean(m[1]), qty: parseInt(m[2], 10) };

  m = line.match(/^(\d+)\s*[x×]\s*(.+)$/i);
  if (m) return { label: clean(m[2]), qty: parseInt(m[1], 10) };

  m = line.match(/^(.+?)\s*[x×]\s*(\d+)$/i);
  if (m) return { label: clean(m[1]), qty: parseInt(m[2], 10) };

  m = line.match(/^(.+?)\s*\((\d+)\)$/);
  if (m) return { label: clean(m[1]), qty: parseInt(m[2], 10) };

  m = line.match(/^(.+?)\s*[-:,]\s*(\d+)$/);
  if (m) return { label: clean(m[1]), qty: parseInt(m[2], 10) };

  return { label: clean(line), qty: 1 };
};

/* Runs `fn` over `items` with at most `size` in flight at once. Used to
   keep bulk AI-recognition calls from either running one-at-a-time
   (slow) or all at once (hammers the lookup function/API). */
const chunkedMap = async (items, size, fn) => {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    results.push(...await Promise.all(chunk.map(fn)));
  }
  return results;
};

/* Defaults chosen from your inventory */
const CATALOG = [
  { group: "Drums", label: "Kick In", mic: "Beta 52A", stand: "Short boom" },
  { group: "Drums", label: "Kick Out", mic: "Beta 52A", stand: "Short boom" },
  { group: "Drums", label: "Snare Top", mic: "SM57", stand: "Drum clamp" },
  { group: "Drums", label: "Snare Bottom", mic: "e604 (clip)", stand: "None" },
  { group: "Drums", label: "Hi-Hat", mic: "e614 (SDC)", stand: "Short boom" },
  { group: "Drums", label: "Rack Tom", mic: "e604 (clip)", stand: "None" },
  { group: "Drums", label: "Floor Tom", mic: "e604 (clip)", stand: "None" },
  { group: "Drums", label: "OHSL", mic: "sE7 (SDC)", stand: "Tall boom" },
  { group: "Drums", label: "OHSR", mic: "sE7 (SDC)", stand: "Tall boom" },
  { group: "Perc", label: "Cajon", mic: "Audix D6", stand: "Short boom" },
  { group: "Perc", label: "Congas", mic: "SM57", stand: "Short boom" },
  { group: "Perc", label: "Perc Overhead", mic: "Roswell MiniK47", stand: "Tall boom" },
  { group: "Bass", label: "Bass DI", mic: "Pro48 (active DI)", stand: "None", di: true },
  { group: "Bass", label: "Bass Cab", mic: "Telefunken M82", stand: "Short boom" },
  { group: "Guitars", label: "Electric Gtr Amp", mic: "e906", stand: "Short boom" },
  { group: "Guitars", label: "Acoustic Gtr", mic: "SB-2 (passive DI)", stand: "None", di: true },
  { group: "Guitars", label: "Gtr Modeler L/R", mic: "Stereo DI", stand: "None", di: true },
  { group: "Keys", label: "Keys L/R", mic: "Stereo DI", stand: "None", di: true },
  { group: "Keys", label: "Keys 2 (mono)", mic: "SB-2 (passive DI)", stand: "None", di: true },
  { group: "Keys", label: "Organ/Leslie", mic: "e906", stand: "Short boom" },
  { group: "Keys", label: "Acoustic Piano", mic: "Roswell MiniK47", stand: "Tall boom" },
  { group: "Strings/Horns", label: "Fiddle/Violin", mic: "Pro48 (active DI)", stand: "None", di: true },
  { group: "Strings/Horns", label: "Cello/Upright", mic: "Roswell MiniK47", stand: "Short boom" },
  { group: "Strings/Horns", label: "Sax", mic: "MD421 Kompakt", stand: "Tall boom" },
  { group: "Strings/Horns", label: "Trumpet", mic: "MD421 Kompakt", stand: "Tall boom" },
  { group: "Strings/Horns", label: "Trombone", mic: "MD421 Kompakt", stand: "Tall boom" },
  { group: "Vocals", label: "Lead Vox", mic: "e945", stand: "Tall boom" },
  { group: "Vocals", label: "Lead Vox 2", mic: "e845", stand: "Tall boom" },
  { group: "Vocals", label: "BG Vox", mic: "SM58", stand: "Tall boom" },
  { group: "Vocals", label: "Wireless Vox", mic: "Wireless HH", stand: "Tall boom" },
  { group: "Vocals", label: "Announce/MC", mic: "SM58", stand: "Straight" },
  { group: "Playback", label: "Tracks L/R", mic: "Stereo DI", stand: "None", di: true },
  { group: "Playback", label: "Click (to mons)", mic: "SB-2 (passive DI)", stand: "None", di: true },
  { group: "Playback", label: "Talkback", mic: "SM58", stand: "Desk stand" },
];

/* ——— Questionnaire ——— */
const FORM_INSTRUMENTS = [
  "Drums (full kit)", "Percussion", "Bass", "Electric guitar", "Acoustic guitar",
  "Keys", "Fiddle/Violin", "Cello/Upright bass", "Sax", "Trumpet", "Trombone",
  "Vocals only", "Other",
];

const uid = () => Math.random().toString(36).slice(2, 9);

const newShow = () => ({
  id: uid(), band: "", date: "", venue: "", contact: "",
  monitors: "", notes: "", channels: [], updated: Date.now(),
});

const blankMember = () => ({ id: uid(), name: "", instrument: "Electric guitar", other: "", sings: "none" });

const blankForm = () => ({
  band: "", contactName: "", email: "", phone: "",
  members: [blankMember()],
  backlineBring: "", backlineNeed: "",
  tracks: false, click: false,
  unusual: "", anythingElse: "",
});

const STORAGE_KEY = "stage-advance:shows";
const GROUP_ORDER = Object.keys(GROUPS);

const groupSort = (channels) =>
  channels
    .map((c, i) => [c, i])
    .sort((a, b) => {
      const r = (c) => { const i = GROUP_ORDER.indexOf(c.group); return i === -1 ? GROUP_ORDER.length : i; };
      return r(a[0]) - r(b[0]) || a[1] - b[1];
    })
    .map(([c]) => c);

/* ——— The mapping: questionnaire answers → draft channels ——— */
const buildChannelsFromSubmission = (sub) => {
  const chs = [];
  const add = (group, name, mic, stand, note = "") =>
    chs.push({ id: uid(), group, name, mic, stand, phantom: needsPhantom(mic), note });

  const leadMics = ["e945", "e845", "SM58"];
  let leadCount = 0;

  (sub.members || []).forEach((m) => {
    const who = m.name || "";
    switch (m.instrument) {
      case "Drums (full kit)":
        add("Drums", "Kick In", "Beta 52A", "Short boom", who);
        add("Drums", "Kick Out", "Beta 52A", "Short boom");
        add("Drums", "Snare Top", "SM57", "Drum clamp");
        add("Drums", "Snare Bottom", "e604 (clip)", "None");
        add("Drums", "Hi-Hat", "e614 (SDC)", "Short boom");
        add("Drums", "Rack Tom", "e604 (clip)", "None");
        add("Drums", "Floor Tom", "e604 (clip)", "None");
        add("Drums", "OHSL", "sE7 (SDC)", "Tall boom");
        add("Drums", "OHSR", "sE7 (SDC)", "Tall boom");
        break;
      case "Percussion":
        add("Perc", who ? `Percussion — ${who}` : "Percussion", "Roswell MiniK47", "Tall boom");
        break;
      case "Bass":
        add("Bass", "Bass DI", "Pro48 (active DI)", "None", who);
        break;
      case "Electric guitar":
        add("Guitars", who ? `El Gtr Amp — ${who}` : "Electric Gtr Amp", "e906", "Short boom");
        break;
      case "Acoustic guitar":
        add("Guitars", who ? `Acoustic — ${who}` : "Acoustic Gtr", "SB-2 (passive DI)", "None");
        break;
      case "Keys":
        add("Keys", who ? `Keys L — ${who}` : "Keys L", "Stereo DI", "None");
        add("Keys", "Keys R", "Stereo DI", "None", "same box");
        break;
      case "Fiddle/Violin":
        add("Strings/Horns", who ? `Fiddle — ${who}` : "Fiddle/Violin", "Pro48 (active DI)", "None");
        break;
      case "Cello/Upright bass":
        add("Strings/Horns", who ? `Cello — ${who}` : "Cello/Upright", "Roswell MiniK47", "Short boom");
        break;
      case "Sax":
        add("Strings/Horns", who ? `Sax — ${who}` : "Sax", "MD421 Kompakt", "Tall boom");
        break;
      case "Trumpet":
        add("Strings/Horns", who ? `Trumpet — ${who}` : "Trumpet", "MD421 Kompakt", "Tall boom");
        break;
      case "Trombone":
        add("Strings/Horns", who ? `Trombone — ${who}` : "Trombone", "MD421 Kompakt", "Tall boom");
        break;
      case "Other":
        add("Other", m.other || (who ? `${who}'s instrument` : "Special input"), "Roswell MiniK47", "Short boom", "verify mic choice");
        break;
      default:
        break; // "Vocals only" — handled below
    }
    // Vocals
    const sings = m.sings === "none" && m.instrument === "Vocals only" ? "lead" : m.sings;
    if (sings === "lead") {
      const mic = leadMics[Math.min(leadCount, leadMics.length - 1)];
      add("Vocals", who ? `Lead Vox — ${who}` : "Lead Vox", mic, "Tall boom");
      leadCount++;
    } else if (sings === "bg") {
      add("Vocals", who ? `BG Vox — ${who}` : "BG Vox", "SM58", "Tall boom");
    }
  });

  if (sub.tracks) add("Playback", "Tracks L/R", "Stereo DI", "None");
  if (sub.click) add("Playback", "Click (to mons)", "SB-2 (passive DI)", "None", "monitor feed only");

  return groupSort(chs);
};

const submissionToShow = (sub) => {
  const notes = [
    sub.backlineBring && `BACKLINE THEY BRING: ${sub.backlineBring}`,
    sub.backlineNeed && `BACKLINE THEY NEED: ${sub.backlineNeed}`,
    sub.unusual && `UNUSUAL: ${sub.unusual}`,
    sub.anythingElse && `NOTES: ${sub.anythingElse}`,
  ].filter(Boolean).join("\n");
  return {
    ...newShow(),
    band: sub.band,
    contact: [sub.contactName, sub.phone, sub.email].filter(Boolean).join(" · "),
    notes,
    channels: buildChannelsFromSubmission(sub),
  };
};

const FORM_SLUG_RE = /^\/form\/([a-zA-Z0-9-]+)\/?$/;
const LEGACY_FORM_RE = /^\/band-form\/?$/;

export default function StageAdvance() {
  const { user, profile, loading: authLoading, signInWithEmail, signOut } = useAuth();

  const formMatch = window.location.pathname.match(FORM_SLUG_RE);
  const formSlug = formMatch ? formMatch[1] : null;
  const legacyForm = LEGACY_FORM_RE.test(window.location.pathname);
  const standalone = Boolean(formSlug) || legacyForm;

  const [mode, setMode] = useState(standalone ? "form" : "plan"); // 'plan' | 'form' | 'locker'
  const [shows, setShows] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryErr, setInventoryErr] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [printMsg, setPrintMsg] = useState("");
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState("Other");
  const [lockerLabelDraft, setLockerLabelDraft] = useState("");
  const [lockerQtyDraft, setLockerQtyDraft] = useState("1");
  const [lockerLookup, setLockerLookup] = useState(null); // { label, qty, type, needs_phantom, use_cases, fromAi } while reviewing
  const [lockerLookupBusy, setLockerLookupBusy] = useState(false);
  const [rowLookupBusyId, setRowLookupBusyId] = useState(null);
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteReview, setPasteReview] = useState(null); // { items: [{label, qty, type, needs_phantom, use_cases, status, selected}] }
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState(blankForm());
  const [formDone, setFormDone] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [inboxMsg, setInboxMsg] = useState("");
  const [formOwner, setFormOwner] = useState(null);
  const [formOwnerStatus, setFormOwnerStatus] = useState(formSlug ? "loading" : "n/a");
  const saveTimer = useRef(null);

  const inventory = {};
  inventoryItems.forEach((i) => { inventory[i.label] = i.qty; });
  const MIC_OPTIONS = [...Object.keys(inventory), ...EXTRA_OPTIONS];
  const isRental = (mic) => mic !== "" && !MIC_OPTIONS.includes(mic);

  /* Data-driven phantom check: prefer the engineer's own recognized/edited
     tag for a mic they own, fall back to the static heuristic (needsPhantom,
     module-level) for anything not in their locker — rentals, EXTRA_OPTIONS,
     or mics suggested by the static Band Form import mapping. */
  const resolvePhantom = (mic) => {
    const item = inventoryItems.find((i) => i.label === mic);
    if (item && item.needs_phantom !== null && item.needs_phantom !== undefined) return item.needs_phantom;
    return needsPhantom(mic);
  };

  const loadInventory = () => listMyInventory().then(setInventoryItems).catch(() => setInventoryItems([]));

  const addLockerItem = async (label, qty, tags = {}) => {
    if (!label.trim()) return;
    setInventoryErr("");
    try {
      const row = await addInventoryItem(label.trim(), qty, tags);
      setInventoryItems((prev) => [...prev, row].sort((a, b) => a.label.localeCompare(b.label)));
    } catch (e) {
      setInventoryErr(e.code === "23505"
        ? `You already have "${label.trim()}" in your locker — edit its quantity instead.`
        : "Couldn't add that item — please try again.");
    }
  };

  const updateLockerItem = async (id, patch) => {
    setInventoryItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try { await updateInventoryItem(id, patch); }
    catch (e) {
      setInventoryErr(e.code === "23505"
        ? "That name is already used by another item in your locker."
        : "Couldn't save that change — please try again.");
      loadInventory();
    }
  };

  const removeLockerItem = async (id) => {
    setInventoryItems((prev) => prev.filter((i) => i.id !== id));
    try { await removeInventoryItem(id); }
    catch (e) { setInventoryErr("Couldn't remove that item — please try again."); loadInventory(); }
  };

  /* ——— resolve the Band Form owner from the URL slug (public, no login needed) ——— */
  useEffect(() => {
    if (!formSlug) return;
    let stillMounted = true;
    setFormOwnerStatus("loading");
    resolveOwnerBySlug(formSlug)
      .then((owner) => {
        if (!stillMounted) return;
        setFormOwner(owner);
        setFormOwnerStatus(owner ? "found" : "not-found");
      })
      .catch(() => { if (stillMounted) setFormOwnerStatus("not-found"); });
    return () => { stillMounted = false; };
  }, [formSlug]);

  /* the engineer previewing their own form in-app posts to their own profile */
  const effectiveFormOwner = formSlug ? formOwner : profile;

  /* ——— load shows + inventory (personal, per signed-in user) ——— */
  useEffect(() => {
    if (!user) { setShows([]); setInventoryItems([]); setLoaded(false); return; }
    (async () => {
      try {
        const r = await storage.get(STORAGE_KEY);
        if (r?.value) setShows(JSON.parse(r.value));
        else setShows([]);
      } catch (e) { setShows([]); }
      setLoaded(true);
    })();
    loadInventory();
  }, [user]);

  /* ——— save shows (debounced) ——— */
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await storage.set(STORAGE_KEY, JSON.stringify(shows)); }
      catch (e) { console.error("save failed", e); }
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [shows, loaded]);

  /* ——— submissions (this engineer's inbox) ——— */
  const loadSubmissions = async () => {
    if (!user) { setSubmissions([]); return; }
    try { setSubmissions(await submissionsApi.listMine()); }
    catch (e) { setSubmissions([]); }
  };

  useEffect(() => { loadSubmissions(); }, [user]);

  const submitForm = async () => {
    if (!form.band.trim()) { setFormErr("Band name is required."); return; }
    if (!form.email.trim() && !form.phone.trim()) { setFormErr("Please include an email or phone number."); return; }
    if (!effectiveFormOwner) { setFormErr("This form link isn't set up correctly — ask your engineer for a fresh link."); return; }
    setFormErr("");
    try {
      await submissionsApi.submitPublic(effectiveFormOwner.id, form);
      setFormDone(true);
    } catch (e) {
      setFormErr("Couldn't submit — please try again.");
    }
  };

  const removeSubmission = async (id) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    try { await submissionsApi.removeMine(id); }
    catch (e) { console.error(e); loadSubmissions(); }
  };

  const importSubmission = (sub) => {
    const show = submissionToShow(sub);
    setShows((p) => [show, ...p]);
    removeSubmission(sub.id);
    setActiveId(show.id);
    setInboxMsg("");
  };

  /* ——— planner logic ——— */
  const active = shows.find((s) => s.id === activeId) || null;

  const updateShow = (patch) =>
    setShows((prev) => prev.map((s) => (s.id === activeId ? { ...s, ...patch, updated: Date.now() } : s)));

  const addChannel = (item) => {
    const ch = {
      id: uid(), group: item.group, name: item.label,
      mic: item.mic, stand: item.stand,
      phantom: resolvePhantom(item.mic), note: "",
    };
    updateShow({ channels: [...active.channels, ch] });
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    addChannel({ group: customGroup, label: name, mic: "Roswell MiniK47", stand: "Short boom" });
    setCustomName("");
  };

  const updateChannel = (chId, patch) =>
    updateShow({ channels: active.channels.map((c) => (c.id === chId ? { ...c, ...patch } : c)) });

  const removeChannel = (chId) =>
    updateShow({ channels: active.channels.filter((c) => c.id !== chId) });

  const moveChannel = (idx, dir) => {
    const arr = [...active.channels];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    updateShow({ channels: arr });
  };

  const dropChannel = (from, to) => {
    if (from === null || to === null || from === to) return;
    const arr = [...active.channels];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    updateShow({ channels: arr });
  };

  const sortByGroup = () => updateShow({ channels: groupSort(active.channels) });

  const deleteShow = (id) => {
    setShows((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const duplicateShow = (id) => {
    const src = shows.find((s) => s.id === id);
    if (!src) return;
    const copy = {
      ...src,
      id: uid(),
      band: src.band ? `${src.band} (copy)` : "Untitled (copy)",
      date: "", // new gig, new date — everything else carries over
      channels: src.channels.map((c) => ({ ...c, id: uid() })),
      updated: Date.now(),
    };
    setShows((p) => [copy, ...p]);
    setActiveId(copy.id); // open it so the name can be edited right away
  };

  /* ——— gear summary ——— */
  const tally = (list, keyFn) => {
    const m = {};
    list.forEach((c) => {
      const k = keyFn(c);
      if (!k || k === "None") return;
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  const micCounts = active ? tally(active.channels, (c) => c.mic) : [];
  const standCounts = active ? tally(active.channels, (c) => c.stand) : [];
  const phantomCh = active ? active.channels.map((c, i) => (c.phantom ? i + 1 : null)).filter(Boolean) : [];
  const shortages = micCounts.filter(([k, v]) => inventory[k] !== undefined && v > inventory[k]);

  /* duplicate stage box lines: effective value is override ?? channel number */
  const sbMap = {};
  (active ? active.channels : []).forEach((c, i) => {
    const v = c.stagebox ?? i + 1;
    (sbMap[v] = sbMap[v] || []).push(i + 1);
  });
  const sbDupes = Object.entries(sbMap)
    .filter(([, chs]) => chs.length > 1)
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  const sbDupeSet = new Set(sbDupes.map(([v]) => Number(v)));

  /* ——— export ——— */
  const exportText = () => {
    if (!active) return "";
    const pad = (s, n) => String(s ?? "").padEnd(n);
    let out = `INPUT LIST — ${active.band || "Untitled"}\n`;
    if (active.date || active.venue) out += `${active.date}${active.date && active.venue ? " · " : ""}${active.venue}\n`;
    out += `\nCH  ${pad("SOURCE", 22)}${pad("MIC/DI", 20)}${pad("STAND", 12)}48V  ${pad("SB", 4)}NOTES\n`;
    out += "—".repeat(82) + "\n";
    active.channels.forEach((c, i) => {
      out += `${pad(i + 1, 4)}${pad(c.name, 22)}${pad(c.mic, 20)}${pad(c.stand === "None" ? "—" : c.stand, 12)}${c.phantom ? "48V " : "    "} ${pad(c.stagebox ?? i + 1, 4)}${c.note || ""}\n`;
    });
    out += `\nMIC PULL: ${micCounts.map(([k, v]) => `${v}× ${k}${isRental(k) ? " (RENTAL)" : ""}`).join(", ") || "—"}\n`;
    const rentals = micCounts.filter(([k]) => isRental(k));
    if (rentals.length)
      out += `TO RENT:  ${rentals.map(([k, v]) => `${v}× ${k}`).join(", ")}\n`;
    out += `STANDS:   ${standCounts.map(([k, v]) => `${v}× ${k}`).join(", ") || "—"}\n`;
    if (shortages.length)
      out += `⚠ SHORT:  ${shortages.map(([k, v]) => `${k} (need ${v}, own ${inventory[k]})`).join(", ")}\n`;
    if (sbDupes.length)
      out += `⚠ SB DUPES: ${sbDupes.map(([line, chs]) => `line ${line} → CH ${chs.join(" & ")}`).join(", ")}\n`;
    if (active.monitors) out += `MONITORS: ${active.monitors}\n`;
    if (active.notes) out += `NOTES:\n${active.notes}\n`;
    return out;
  };

  const copyList = async () => {
    const text = exportText();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  /* ——— standalone crew sheet (opens in new tab; window.print is blocked in-app) ——— */
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  const buildPrintHTML = () => {
    const rows = active.channels.map((c, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td><span class="sw" style="background:${GROUPS[c.group]?.color || "#999"}"></span>${esc(c.name)}</td>
        <td>${esc(c.mic)}${isRental(c.mic) ? " <b>(RENTAL)</b>" : ""}</td>
        <td>${c.stand === "None" ? "—" : esc(c.stand)}</td>
        <td class="p48">${c.phantom ? "48V" : ""}</td>
        <td>${esc(c.note)}</td>
        <td class="num" style="width:auto">${c.stagebox ?? i + 1}</td>
      </tr>`).join("");

    const line = ([k, v]) => `<div class="line"><span>${esc(k)}${isRental(k) ? " (RENTAL)" : ""}</span><b>${v}${inventory[k] !== undefined ? ` / ${inventory[k]}` : ""}</b></div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Input List — ${esc(active.band || "Untitled")}</title>
<style>
  body { font-family: "Barlow", -apple-system, "Segoe UI", sans-serif; color:#000; margin: 28px auto; max-width: 820px; padding: 0 16px; }
  .head { display:flex; justify-content:space-between; align-items:baseline; border-bottom:3px solid #000; padding-bottom:6px; margin-bottom:8px; }
  .band { font-size:26px; font-weight:800; }
  .brand { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#555; }
  .meta { display:flex; flex-wrap:wrap; gap:4px 26px; font-size:13px; margin-bottom:14px; }
  .meta b { text-transform:uppercase; font-size:9px; letter-spacing:.1em; color:#555; display:block; }
  table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:16px; }
  th { text-align:left; font-size:9px; letter-spacing:.1em; text-transform:uppercase; border-bottom:2px solid #000; padding:3px 6px; }
  td { border-bottom:1px solid #ccc; padding:5px 6px; vertical-align:top; }
  tr { break-inside:avoid; }
  .num { font-weight:800; text-align:right; width:24px; }
  .sw { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:6px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .p48 { font-weight:800; font-size:11px; text-align:center; }
  .cols { display:flex; gap:24px; break-inside:avoid; margin-bottom:14px; }
  .col { flex:1; }
  .h { font-size:10px; letter-spacing:.12em; text-transform:uppercase; border-bottom:2px solid #000; padding-bottom:2px; margin-bottom:4px; font-weight:800; }
  .line { display:flex; justify-content:space-between; gap:8px; font-size:12px; padding:2px 0; border-bottom:1px dotted #bbb; }
  .notes { font-size:12px; white-space:pre-wrap; border:1px solid #999; border-radius:3px; padding:7px 10px; break-inside:avoid; margin-bottom:12px; }
  .alert { font-size:12px; font-weight:800; border:2px solid #000; border-radius:3px; padding:6px 10px; margin-bottom:12px; }
  .foot { margin-top:12px; font-size:9px; color:#777; display:flex; justify-content:space-between; }
  .printbtn { position:fixed; top:12px; right:12px; padding:9px 16px; font-size:14px; font-weight:700; background:#E8B93E; border:none; border-radius:7px; cursor:pointer; }
  @media print { .printbtn { display:none; } @page { margin: 12mm; } body { margin:0 auto; } }
</style></head><body>
<button class="printbtn" onclick="window.print()">🖨 Print</button>
<div class="head"><div class="band">${esc(active.band || "Untitled show")}</div><div class="brand">Input List · StageAdvance</div></div>
<div class="meta">
  ${active.date ? `<div><b>Date</b>${esc(active.date)}</div>` : ""}
  ${active.venue ? `<div><b>Venue</b>${esc(active.venue)}</div>` : ""}
  ${active.contact ? `<div><b>Band contact</b>${esc(active.contact)}</div>` : ""}
  ${active.monitors ? `<div><b>Monitors</b>${esc(active.monitors)}</div>` : ""}
  <div><b>Channels</b>${active.channels.length}</div>
</div>
${shortages.length ? `<div class="alert">⚠ OVER INVENTORY: ${shortages.map(([k, v]) => `${esc(k)} — need ${v}, own ${inventory[k]}`).join(" · ")}</div>` : ""}
${sbDupes.length ? `<div class="alert">⚠ STAGE BOX CONFLICTS: ${sbDupes.map(([line, chs]) => `line ${line} → CH ${chs.join(" & ")}`).join(" · ")}</div>` : ""}
<table><thead><tr><th>CH</th><th>Source</th><th>Mic / DI</th><th>Stand</th><th style="text-align:center">48V</th><th>Notes</th><th style="text-align:right">Stage Box</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="cols">
  <div class="col"><div class="h">Mic pull</div>${micCounts.map(line).join("")}</div>
  <div class="col"><div class="h">Stands</div>${standCounts.map(([k, v]) => `<div class="line"><span>${esc(k)}</span><b>${v}</b></div>`).join("")}</div>
  <div class="col">
    <div class="h">Phantom channels</div><div style="font-size:13px;font-weight:800;padding:2px 0">${phantomCh.length ? phantomCh.join(", ") : "none"}</div>
    <div class="h" style="margin-top:8px">XLR lines</div><div style="font-size:13px;font-weight:800;padding:2px 0">${active.channels.length} + monitors</div>
  </div>
</div>
${active.notes ? `<div class="h">Advance notes</div><div class="notes">${esc(active.notes)}</div>` : ""}
<div class="foot"><span>Printed ${new Date().toLocaleDateString()}</span><span>Mic pull shows need / owned · RENTAL items must be sourced before load-in</span></div>
<script>window.onload = function(){ setTimeout(function(){ try { window.print(); } catch(e){} }, 400); };</script>
</body></html>`;
  };

  const openPrintSheet = () => {
    const html = buildPrintHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(active.band || "input-list").replace(/[^\w-]+/g, "-")}-crew-sheet.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setPrintMsg("Pop-up blocked — downloaded the sheet instead. Open it and print from there.");
      setTimeout(() => setPrintMsg(""), 6000);
    }
  };

  /* ——— form helpers ——— */
  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setMember = (id, patch) =>
    setF({ members: form.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  /* ————————————————— styles ————————————————— */
  const css = `
    .sa-root { min-height: 100vh; background: #17181c; color: #e7e6e2; font-family: "Barlow", -apple-system, "Segoe UI", sans-serif; }
    .sa-mono { font-family: "Barlow Semi Condensed", "Arial Narrow", sans-serif; letter-spacing: .02em; }
    .sa-wrap { max-width: 1100px; margin: 0 auto; padding: 24px 20px 80px; }
    .sa-head { display:flex; align-items:center; gap:14px; margin-bottom: 22px; flex-wrap:wrap; }
    .sa-logo { font-size: 26px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .sa-logo span { color:#E8B93E; }
    .sa-sub { color:#8a8f98; font-size:13px; }
    .sa-tabs { display:flex; gap:4px; margin-left:auto; background:#1f2127; border:1px solid #2c2f37; border-radius:8px; padding:3px; }
    .sa-tab { border:none; background:transparent; color:#8a8f98; font-weight:700; font-size:13px; padding:6px 14px; border-radius:6px; cursor:pointer; }
    .sa-tab.on { background:#E8B93E; color:#1a1408; }
    .sa-card { background:#1f2127; border:1px solid #2c2f37; border-radius:10px; padding:16px; }
    .sa-btn { background:#2c2f37; color:#e7e6e2; border:1px solid #3a3e48; border-radius:7px; padding:7px 13px; font-size:13px; font-weight:600; cursor:pointer; transition: background .12s, border-color .12s; }
    .sa-btn:hover { background:#363a44; border-color:#4a4f5b; }
    .sa-btn.primary { background:#E8B93E; color:#1a1408; border-color:#E8B93E; }
    .sa-btn.primary:hover { background:#f0c85f; }
    .sa-btn.ghost { background:transparent; border-color:transparent; color:#8a8f98; }
    .sa-btn.ghost:hover { color:#e7e6e2; background:#2c2f37; }
    .sa-btn.ghost.on { background:#E8B93E; color:#1a1408; border-color:#E8B93E; }
    .sa-btn.danger:hover { border-color:#D64545; color:#ff8f8f; }
    .sa-btn:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline:2px solid #E8B93E; outline-offset:1px; }
    .sa-input { background:#17181c; border:1px solid #2c2f37; color:#e7e6e2; border-radius:6px; padding:7px 10px; font-size:14px; font-family:inherit; width:100%; box-sizing:border-box; }
    .sa-input::placeholder { color:#5a5f6a; }
    .sa-label { font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:#8a8f98; margin-bottom:4px; display:block; }
    .sa-grid { display:grid; gap:12px; }
    .sa-show-row { display:flex; justify-content:space-between; align-items:center; padding:13px 16px; background:#1f2127; border:1px solid #2c2f37; border-radius:9px; cursor:pointer; transition: border-color .12s; }
    .sa-show-row:hover { border-color:#E8B93E; }
    .sa-palette { display:flex; flex-wrap:wrap; gap:6px; }
    .sa-chip { border:none; border-radius:5px; padding:5px 10px; font-size:12px; font-weight:700; cursor:pointer; opacity:.92; }
    .sa-chip:hover { opacity:1; transform: translateY(-1px); }
    .sa-groupname { font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:#8a8f98; margin:10px 0 5px; }
    .sa-ch { display:grid; grid-template-columns: 22px 34px 6px 1.4fr 1.3fr 1fr 44px 1.5fr 72px 88px; gap:8px; align-items:center; padding:6px 8px; border-bottom:1px solid #26282f; border-top:2px solid transparent; }
    .sa-ch:nth-child(odd of .sa-ch) { background:#1c1e23; }
    .sa-ch.drag-over { border-top:2px solid #E8B93E; }
    .sa-ch.dragging { opacity:.35; }
    .sa-handle { color:#5a5f6a; cursor:grab; user-select:none; font-size:14px; line-height:1; text-align:center; padding:6px 2px; touch-action:none; }
    .sa-handle:hover { color:#e7e6e2; }
    .sa-handle:active { cursor:grabbing; }
    .sa-chnum { font-weight:800; font-size:15px; text-align:right; color:#8a8f98; }
    .sa-strip { width:6px; height:30px; border-radius:2px; }
    .sa-ch input, .sa-ch select { background:#17181c; border:1px solid #2c2f37; color:#e7e6e2; border-radius:5px; padding:5px 7px; font-size:13px; width:100%; box-sizing:border-box; }
    .sa-micwrap { display:flex; flex-direction:column; gap:4px; min-width:0; }
    .sa-micwrap input { border-color:#9A6BC9; }
    .sa-rentaltag { font-size:10px; font-weight:800; letter-spacing:.08em; color:#c9a8ef; }
    .sa-48 { display:flex; justify-content:center; }
    .sa-48 button { width:34px; height:26px; border-radius:5px; border:1px solid #3a3e48; background:#17181c; color:#5a5f6a; font-size:11px; font-weight:800; cursor:pointer; }
    .sa-48 button.on { background:#D64545; border-color:#D64545; color:#fff; }
    .sa-rowbtns { display:flex; gap:2px; justify-content:flex-end; }
    .sa-rowbtns button { background:transparent; border:none; color:#5a5f6a; cursor:pointer; font-size:14px; padding:3px 5px; border-radius:4px; }
    .sa-rowbtns button:hover { color:#e7e6e2; background:#2c2f37; }
    .sa-summary { display:grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap:12px; }
    .sa-sum-item { display:flex; justify-content:space-between; gap:8px; font-size:13px; padding:4px 0; border-bottom:1px dashed #2c2f37; }
    .sa-sum-count { font-weight:800; color:#E8B93E; white-space:nowrap; }
    .sa-sum-item.short .sa-sum-count { color:#ff8f8f; }
    .sa-own { color:#5a5f6a; font-weight:600; }
    .sa-shortbanner { background:#3a1d1d; border:1px solid #D64545; color:#ffb0b0; border-radius:8px; padding:10px 14px; font-size:13px; font-weight:600; }
    .sa-inbox { border:1px solid #4CC3C9; }
    .sa-inbox-row { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-bottom:1px dashed #2c2f37; flex-wrap:wrap; }
    .sa-privacy { background:#20242b; border:1px solid #3a3e48; color:#8a8f98; border-radius:8px; padding:9px 13px; font-size:12px; }
    .sa-member { display:grid; grid-template-columns: 1.2fr 1.2fr 1fr 36px; gap:8px; align-items:end; padding:8px 0; border-bottom:1px dashed #2c2f37; }
    .sa-empty { text-align:center; color:#8a8f98; padding:40px 20px; }
    .sa-colhead { display:grid; grid-template-columns: 22px 34px 6px 1.4fr 1.3fr 1fr 44px 1.5fr 72px 88px; gap:8px; padding:4px 8px; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:#5a5f6a; }
    .sa-sb.override { border-color:#E8B93E !important; color:#E8B93E; font-weight:800; }
    .sa-sb.dupe { border-color:#D64545 !important; color:#ff8f8f; font-weight:800; }
    .sa-customrow { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid #2c2f37; }
    .sa-check { display:flex; align-items:center; gap:8px; font-size:14px; cursor:pointer; }
    .sa-check input { width:17px; height:17px; accent-color:#E8B93E; }
    h2.sa-h2 { font-size:14px; text-transform:uppercase; letter-spacing:.14em; color:#e7e6e2; margin:0 0 12px; font-weight:800; }
    @media (max-width: 780px) {
      .sa-ch { grid-template-columns: 18px 26px 5px 1fr 1fr 40px; grid-auto-rows:auto; }
      .sa-colhead { display:none; }
      .sa-ch .m-stand { grid-column: 4 / 5; }
      .sa-ch .m-note { grid-column: 4 / 6; }
      .sa-ch .m-sb { grid-column: 6 / 7; }
      .sa-ch .sa-rowbtns { grid-column: 5 / 7; justify-content:flex-end; }
      .sa-member { grid-template-columns: 1fr 1fr; }
      .sa-tabs { margin-left:0; }
    }
    /* ——— PRINT: hide the app, show the crew sheet ——— */
    .print-sheet { display:none; }
    @media print {
      @page { margin: 12mm; }
      .sa-root { background:#fff !important; min-height:0; }
      .screen-only { display:none !important; }
      .print-sheet { display:block; color:#000; }
      .ps-head { display:flex; justify-content:space-between; align-items:baseline; border-bottom:3px solid #000; padding-bottom:6px; margin-bottom:8px; }
      .ps-band { font-size:22pt; font-weight:800; }
      .ps-brand { font-size:8pt; letter-spacing:.14em; text-transform:uppercase; color:#555; }
      .ps-meta { display:flex; flex-wrap:wrap; gap:4px 26px; font-size:10pt; margin-bottom:12px; }
      .ps-meta b { text-transform:uppercase; font-size:7.5pt; letter-spacing:.1em; color:#555; display:block; font-weight:800; }
      .ps-table { width:100%; border-collapse:collapse; font-size:10pt; margin-bottom:14px; }
      .ps-table th { text-align:left; font-size:7.5pt; letter-spacing:.1em; text-transform:uppercase; border-bottom:2px solid #000; padding:3px 6px; }
      .ps-table td { border-bottom:1px solid #ccc; padding:4px 6px; vertical-align:top; }
      .ps-table tr { break-inside:avoid; }
      .ps-num { font-weight:800; text-align:right; width:24px; }
      .ps-swatch { display:inline-block; width:8pt; height:8pt; border-radius:2px; margin-right:6px; vertical-align:middle; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .ps-48 { font-weight:800; font-size:8.5pt; text-align:center; }
      .ps-cols { display:flex; gap:24px; break-inside:avoid; margin-bottom:12px; }
      .ps-col { flex:1; }
      .ps-h { font-size:8pt; letter-spacing:.12em; text-transform:uppercase; border-bottom:2px solid #000; padding-bottom:2px; margin-bottom:4px; font-weight:800; }
      .ps-line { display:flex; justify-content:space-between; gap:8px; font-size:9.5pt; padding:2px 0; border-bottom:1px dotted #bbb; }
      .ps-line b { font-weight:800; }
      .ps-notes { font-size:9.5pt; white-space:pre-wrap; border:1px solid #999; border-radius:3px; padding:6px 9px; break-inside:avoid; margin-bottom:10px; }
      .ps-alert { font-size:9.5pt; font-weight:800; border:2px solid #000; border-radius:3px; padding:5px 9px; margin-bottom:10px; break-inside:avoid; }
      .ps-foot { margin-top:10px; font-size:7.5pt; color:#777; display:flex; justify-content:space-between; }
    }
  `;

  /* ————————————————— BAND FORM ————————————————— */
  const renderForm = () => (
    <div className="sa-grid" style={{ gap: 16, maxWidth: 680, margin: "0 auto" }}>
      {formDone ? (
        <div className="sa-card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 34 }}>🤘</div>
          <h2 className="sa-h2" style={{ marginTop: 10 }}>Got it — thanks!</h2>
          <div className="sa-sub" style={{ marginBottom: 18 }}>
            Your info is in. Your sound engineer will follow up if anything needs clarifying.
          </div>
          <button className="sa-btn" onClick={() => { setForm(blankForm()); setFormDone(false); }}>
            Submit another band
          </button>
        </div>
      ) : (
        <>
          <div className="sa-card">
            <h2 className="sa-h2">Tell me about your band</h2>
            <div className="sa-sub" style={{ marginBottom: 14 }}>
              Takes ~3 minutes. This helps me show up with the right mics, stands, and stage plan for your show.
            </div>
            <div className="sa-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <div><label className="sa-label">Band name *</label>
                <input className="sa-input" value={form.band} onChange={(e) => setF({ band: e.target.value })} /></div>
              <div><label className="sa-label">Your name</label>
                <input className="sa-input" value={form.contactName} onChange={(e) => setF({ contactName: e.target.value })} /></div>
              <div><label className="sa-label">Email *</label>
                <input className="sa-input" type="email" value={form.email} onChange={(e) => setF({ email: e.target.value })} /></div>
              <div><label className="sa-label">Mobile *</label>
                <input className="sa-input" type="tel" value={form.phone} onChange={(e) => setF({ phone: e.target.value })} /></div>
            </div>
            <div className="sa-sub" style={{ marginTop: 8 }}>* band name plus email or mobile required</div>
          </div>

          <div className="sa-card">
            <h2 className="sa-h2">Who's in the band?</h2>
            <div className="sa-sub" style={{ marginBottom: 10 }}>
              One row per person. If someone plays two things, add them twice.
            </div>
            {form.members.map((m) => (
              <div key={m.id} className="sa-member">
                <div><label className="sa-label">Name</label>
                  <input className="sa-input" value={m.name} placeholder="first name is fine"
                    onChange={(e) => setMember(m.id, { name: e.target.value })} /></div>
                <div><label className="sa-label">Plays</label>
                  <select className="sa-input" value={m.instrument}
                    onChange={(e) => setMember(m.id, { instrument: e.target.value })}>
                    {FORM_INSTRUMENTS.map((i) => <option key={i}>{i}</option>)}
                  </select>
                  {m.instrument === "Other" && (
                    <input className="sa-input" style={{ marginTop: 6 }} value={m.other}
                      placeholder="what is it? (cello, accordion…)"
                      onChange={(e) => setMember(m.id, { other: e.target.value })} />
                  )}
                </div>
                <div><label className="sa-label">Sings?</label>
                  <select className="sa-input" value={m.sings}
                    onChange={(e) => setMember(m.id, { sings: e.target.value })}>
                    <option value="none">No</option>
                    <option value="lead">Lead vocals</option>
                    <option value="bg">Background vocals</option>
                  </select></div>
                <button className="sa-btn ghost danger" title="Remove"
                  onClick={() => setF({ members: form.members.filter((x) => x.id !== m.id) })}>✕</button>
              </div>
            ))}
            <button className="sa-btn" style={{ marginTop: 10 }}
              onClick={() => setF({ members: [...form.members, blankMember()] })}>
              + Add band member
            </button>
          </div>

          <div className="sa-card">
            <h2 className="sa-h2">Backline & playback</h2>
            <div className="sa-grid">
              <div><label className="sa-label">Gear you're bringing (amps, drums, keys…)</label>
                <textarea className="sa-input" rows={2} value={form.backlineBring}
                  placeholder="Full drum kit, two guitar amps, bass amp…"
                  onChange={(e) => setF({ backlineBring: e.target.value })} /></div>
              <div><label className="sa-label">Anything you need provided</label>
                <textarea className="sa-input" rows={2} value={form.backlineNeed}
                  placeholder="Keyboard stand, drum throne…"
                  onChange={(e) => setF({ backlineNeed: e.target.value })} /></div>
              <label className="sa-check">
                <input type="checkbox" checked={form.tracks} onChange={(e) => setF({ tracks: e.target.checked })} />
                We run backing tracks
              </label>
              <label className="sa-check">
                <input type="checkbox" checked={form.click} onChange={(e) => setF({ click: e.target.checked })} />
                We play to a click (drummer needs it in monitors)
              </label>
            </div>
          </div>

          <div className="sa-card">
            <h2 className="sa-h2">The fun stuff</h2>
            <div className="sa-grid">
              <div><label className="sa-label">Anything unusual on stage? (cello, theremin, tap shoes…)</label>
                <input className="sa-input" value={form.unusual}
                  onChange={(e) => setF({ unusual: e.target.value })} /></div>
              <div><label className="sa-label">Anything else I should know?</label>
                <textarea className="sa-input" rows={3} value={form.anythingElse}
                  placeholder="Set length, special moments, guest performers, stage moves…"
                  onChange={(e) => setF({ anythingElse: e.target.value })} /></div>
            </div>
          </div>

          <div className="sa-privacy">
            Your info goes only to your sound engineer for planning this show — please don't include
            sensitive personal info beyond your show contact details.
          </div>

          {formErr && <div className="sa-shortbanner">{formErr}</div>}
          <button className="sa-btn primary" style={{ padding: "12px 20px", fontSize: 15 }} onClick={submitForm}>
            Send to your sound engineer →
          </button>
        </>
      )}
    </div>
  );

  /* ————————————————— PLANNER ————————————————— */
  const renderShowList = () => (
    <div className="sa-grid">
      {/* Inbox */}
      <div className="sa-card sa-inbox">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="sa-h2" style={{ flex: 1, color: "#4CC3C9" }}>
            Questionnaire inbox — {submissions.length}
          </h2>
          <button
            className="sa-btn ghost"
            disabled={!profile}
            onClick={() => {
              if (!profile) return;
              navigator.clipboard.writeText(`${window.location.origin}/form/${profile.slug}`);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 1600);
            }}
          >
            {linkCopied ? "Link copied ✓" : "Copy band form link"}
          </button>
          <button className="sa-btn ghost" onClick={() => { loadSubmissions(); setInboxMsg("refreshed"); setTimeout(() => setInboxMsg(""), 1200); }}>
            {inboxMsg || "Refresh"}
          </button>
        </div>
        {submissions.length === 0 ? (
          <div className="sa-sub">
            No submissions yet. Send a band leader the band form link above — it opens a standalone
            page with no access to this planner. Their answers land here, ready to import as a draft input list.
          </div>
        ) : submissions.map((s) => (
          <div key={s.id} className="sa-inbox-row">
            <div>
              <div style={{ fontWeight: 700 }}>{s.band}</div>
              <div className="sa-sub">
                {(s.members || []).length} members · {[s.contactName, s.phone, s.email].filter(Boolean).join(" · ")} · {s.submittedAt}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="sa-btn primary" onClick={() => importSubmission(s)}>Import as show</button>
              <button className="sa-btn ghost danger" onClick={() => removeSubmission(s.id)}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>

      {inventoryItems.length === 0 && (
        <div className="sa-card" style={{ cursor: "pointer", borderColor: "#E8B93E" }} onClick={() => setMode("locker")}>
          <div style={{ fontWeight: 700, color: "#E8B93E" }}>Your locker is empty</div>
          <div className="sa-sub">Add your mics and DIs so mic pulls and shortage warnings actually mean something — tap here to set it up →</div>
        </div>
      )}

      <button className="sa-btn primary" style={{ alignSelf: "start", width: "fit-content" }}
        onClick={() => { const s = newShow(); setShows((p) => [s, ...p]); setActiveId(s.id); }}>
        + New show
      </button>
      {shows.length === 0 && (
        <div className="sa-empty sa-card">
          No shows yet. Create one, tap instruments to build the input list,
          and the mic pull and stand count assemble themselves — checked against your locker.
        </div>
      )}
      {shows.map((s) => (
        <div key={s.id} className="sa-show-row" onClick={() => setActiveId(s.id)}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{s.band || "Untitled show"}</div>
            <div className="sa-sub">{[s.date, s.venue].filter(Boolean).join(" · ") || "no date/venue"} — {s.channels.length} ch</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="sa-btn ghost" onClick={(e) => { e.stopPropagation(); duplicateShow(s.id); }}>Duplicate</button>
            <button className="sa-btn ghost danger" onClick={(e) => { e.stopPropagation(); deleteShow(s.id); }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );

  /* ——— add-a-mic lookup flow: label -> check shared library -> AI fallback -> editable review ——— */
  const startLockerLookup = async () => {
    const label = lockerLabelDraft.trim();
    if (!label) return;
    const qty = Math.max(0, Number(lockerQtyDraft) || 0);
    setInventoryErr("");
    setLockerLookupBusy(true);
    const blank = { label, qty, type: "", needs_phantom: false, use_cases: [], fromAi: false };
    try {
      const known = await lookupMicLibrary(label);
      if (known) {
        setLockerLookup({ label, qty, type: known.type, needs_phantom: known.needs_phantom, use_cases: known.use_cases || [], fromAi: false });
      } else {
        try {
          const ai = await fetchAiTagsForMic(label);
          setLockerLookup({ label, qty, type: ai.type, needs_phantom: ai.needsPhantom, use_cases: ai.useCases || [], fromAi: true });
        } catch (e) {
          setLockerLookup(blank); // AI lookup failed — fall back to plain manual entry
        }
      }
    } catch (e) {
      setLockerLookup(blank);
    } finally {
      setLockerLookupBusy(false);
    }
  };

  const confirmLockerLookup = async () => {
    if (!lockerLookup) return;
    const { label, qty, type, needs_phantom, use_cases, fromAi } = lockerLookup;
    await addLockerItem(label, qty, { type: type || null, needs_phantom, use_cases });
    if (fromAi && type) cacheMicLibraryEntry(label, { type, needsPhantom: needs_phantom, useCases: use_cases }).catch(() => {});
    setLockerLookup(null);
    setLockerLabelDraft("");
    setLockerQtyDraft("1");
  };

  /* look up tags for an existing, already-saved locker row (e.g. items
     added before Phase 3, or anything else that ended up untagged) */
  const lookupExistingItem = async (item) => {
    setInventoryErr("");
    setRowLookupBusyId(item.id);
    try {
      const known = await lookupMicLibrary(item.label);
      if (known) {
        await updateLockerItem(item.id, { type: known.type, needs_phantom: known.needs_phantom, use_cases: known.use_cases || [] });
      } else {
        const ai = await fetchAiTagsForMic(item.label);
        await updateLockerItem(item.id, { type: ai.type, needs_phantom: ai.needsPhantom, use_cases: ai.useCases || [] });
        cacheMicLibraryEntry(item.label, { type: ai.type, needsPhantom: ai.needsPhantom, useCases: ai.useCases }).catch(() => {});
      }
    } catch (e) {
      setInventoryErr(`Couldn't look up "${item.label}" — you can still fill in the tags yourself below.`);
    } finally {
      setRowLookupBusyId(null);
    }
  };

  /* ——— Phase 4a: bulk paste import ——— */
  const startPasteImport = async () => {
    const lines = pasteText.split("\n").map(parseLockerPasteLine).filter(Boolean);
    if (lines.length === 0) return;

    const merged = new Map();
    lines.forEach(({ label, qty }) => {
      const key = label.toLowerCase();
      const existing = merged.get(key);
      if (existing) existing.qty += qty;
      else merged.set(key, { label, qty });
    });
    const candidates = [...merged.values()];

    const ownedLabels = new Set(inventoryItems.map((i) => i.label.toLowerCase()));
    const already = candidates.filter((c) => ownedLabels.has(c.label.toLowerCase()));
    const toLookup = candidates.filter((c) => !ownedLabels.has(c.label.toLowerCase()));

    setPasteBusy(true);
    setInventoryErr("");

    const libraryResults = await chunkedMap(toLookup, 8, async (c) => {
      try { return { ...c, known: await lookupMicLibrary(c.label) }; }
      catch (e) { return { ...c, known: null }; }
    });
    const fromLibrary = libraryResults.filter((c) => c.known);
    const needsAi = libraryResults.filter((c) => !c.known);

    const aiResults = await chunkedMap(needsAi, 5, async (c) => {
      try { return { ...c, ai: await fetchAiTagsForMic(c.label) }; }
      catch (e) { return { ...c, ai: null }; }
    });

    const items = [
      ...already.map((c) => ({
        label: c.label, qty: c.qty, type: "", needs_phantom: false, use_cases: [],
        status: "duplicate", selected: false,
      })),
      ...fromLibrary.map((c) => ({
        label: c.label, qty: c.qty,
        type: c.known.type, needs_phantom: c.known.needs_phantom, use_cases: c.known.use_cases || [],
        status: "recognized", selected: true,
      })),
      ...aiResults.map((c) => c.ai
        ? { label: c.label, qty: c.qty, type: c.ai.type, needs_phantom: c.ai.needsPhantom, use_cases: c.ai.useCases || [], status: "recognized", selected: true, fromAi: true }
        : { label: c.label, qty: c.qty, type: "", needs_phantom: false, use_cases: [], status: "needs-input", selected: true }),
    ];

    setPasteReview({ items });
    setPasteBusy(false);
  };

  const updatePasteReviewItem = (idx, patch) => {
    setPasteReview((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)) };
    });
  };

  const confirmPasteImport = async () => {
    if (!pasteReview) return;
    for (const item of pasteReview.items.filter((i) => i.selected)) {
      await addLockerItem(item.label, item.qty, { type: item.type || null, needs_phantom: item.needs_phantom, use_cases: item.use_cases });
      if (item.fromAi && item.type) {
        cacheMicLibraryEntry(item.label, { type: item.type, needsPhantom: item.needs_phantom, useCases: item.use_cases }).catch(() => {});
      }
    }
    setPasteReview(null);
    setPasteText("");
    setShowPastePanel(false);
  };

  /* small reusable tag editor — used both in the add-review panel and per existing row */
  const renderTagFields = (tags, onChange) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 }}>
      <select className="sa-input" style={{ maxWidth: 150 }} value={tags.type || ""}
        onChange={(e) => onChange({ type: e.target.value })}>
        <option value="">Type…</option>
        {MIC_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <label className="sa-check" style={{ margin: 0 }}>
        <input type="checkbox" checked={!!tags.needs_phantom}
          onChange={(e) => onChange({ needs_phantom: e.target.checked })} />
        Needs 48V
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {USE_CASE_OPTIONS.map((uc) => (
          <button key={uc} type="button"
            className={`sa-btn ghost${(tags.use_cases || []).includes(uc) ? " on" : ""}`}
            style={{ padding: "3px 8px", fontSize: 11 }}
            onClick={() => onChange({
              use_cases: (tags.use_cases || []).includes(uc)
                ? tags.use_cases.filter((u) => u !== uc)
                : [...(tags.use_cases || []), uc],
            })}>
            {uc}
          </button>
        ))}
      </div>
    </div>
  );

  const renderLocker = () => (
    <div className="sa-grid" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="sa-card">
        <h2 className="sa-h2">Your locker</h2>
        <div className="sa-sub" style={{ marginBottom: 14 }}>
          The mics and DIs you own. This drives the "Your locker" list when building input lists,
          plus mic-pull, shortage warnings, and phantom-power detection. Recognized mics get
          suggested tags — always editable, never locked in.
        </div>

        {inventoryItems.length === 0 ? (
          <div className="sa-sub">
            Your locker is empty — add your first mic or DI below to get started.
          </div>
        ) : (
          inventoryItems.map((i) => (
            <div key={i.id} style={{ padding: "10px 0", borderBottom: "1px dashed #2c2f37" }}>
              <div className="sa-member" style={{ gridTemplateColumns: "1fr 90px auto" }}>
                <input className="sa-input" value={i.label}
                  onChange={(e) => setInventoryItems((prev) => prev.map((x) => (x.id === i.id ? { ...x, label: e.target.value } : x)))}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== i.label) updateLockerItem(i.id, { label: v }); }} />
                <input className="sa-input" type="number" min="0" value={i.qty}
                  onChange={(e) => {
                    const qty = Math.max(0, Number(e.target.value) || 0);
                    setInventoryItems((prev) => prev.map((x) => (x.id === i.id ? { ...x, qty } : x)));
                  }}
                  onBlur={(e) => updateLockerItem(i.id, { qty: Math.max(0, Number(e.target.value) || 0) })} />
                <button className="sa-btn ghost danger" title="Remove" onClick={() => removeLockerItem(i.id)}>✕</button>
              </div>
              {!i.type && (
                <button className="sa-btn ghost" style={{ fontSize: 12, marginTop: 6 }}
                  disabled={rowLookupBusyId === i.id}
                  onClick={() => lookupExistingItem(i)}>
                  {rowLookupBusyId === i.id ? "Looking up…" : "🔍 Look up tags"}
                </button>
              )}
              {renderTagFields(i, (patch) => updateLockerItem(i.id, patch))}
            </div>
          ))
        )}

        {inventoryErr && <div className="sa-shortbanner" style={{ marginTop: 10 }}>{inventoryErr}</div>}

        {lockerLookup ? (
          <div className="sa-card" style={{ marginTop: 14, background: "#20242b" }}>
            <div style={{ fontWeight: 700 }}>
              {lockerLookup.fromAi ? "AI suggestion for" : lockerLookup.type ? "Recognized:" : "Not recognized —"} "{lockerLookup.label}"
            </div>
            <div className="sa-sub" style={{ marginBottom: 4 }}>
              {lockerLookup.type
                ? "Review and adjust before adding — nothing here is locked in."
                : "Fill these in yourself — saved for next time."}
            </div>
            {renderTagFields(lockerLookup, (patch) => setLockerLookup((prev) => ({ ...prev, ...patch })))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="sa-btn primary" onClick={confirmLockerLookup}>Confirm &amp; add</button>
              <button className="sa-btn ghost" onClick={() => setLockerLookup(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="sa-member" style={{ gridTemplateColumns: "1fr 90px auto", marginTop: 14 }}>
            <input className="sa-input" value={lockerLabelDraft} placeholder="e.g. SM57"
              onChange={(e) => setLockerLabelDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startLockerLookup()} />
            <input className="sa-input" type="number" min="0" value={lockerQtyDraft}
              onChange={(e) => setLockerQtyDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startLockerLookup()} />
            <button className="sa-btn primary" onClick={startLockerLookup} disabled={lockerLookupBusy}>
              {lockerLookupBusy ? "Looking up…" : "+ Add"}
            </button>
          </div>
        )}

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #2c2f37" }}>
          {pasteReview ? (
            <div className="sa-card" style={{ background: "#20242b" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Review your pasted list</div>
              <div className="sa-sub" style={{ marginBottom: 10 }}>
                {pasteReview.items.filter((i) => i.status === "recognized").length} of {pasteReview.items.length} recognized automatically
                {pasteReview.items.some((i) => i.status === "duplicate") && `, ${pasteReview.items.filter((i) => i.status === "duplicate").length} already in your locker (unchecked)`}
                {pasteReview.items.some((i) => i.status === "needs-input") && `, ${pasteReview.items.filter((i) => i.status === "needs-input").length} need your input`}.
              </div>
              {pasteReview.items.map((item, idx) => (
                <div key={idx} style={{ padding: "8px 0", borderBottom: "1px dashed #2c2f37" }}>
                  <div className="sa-member" style={{ gridTemplateColumns: "auto 1fr 90px", alignItems: "center" }}>
                    <input type="checkbox" checked={item.selected}
                      onChange={(e) => updatePasteReviewItem(idx, { selected: e.target.checked })} />
                    <div>
                      <b>{item.label}</b>
                      {item.status === "duplicate" && <span className="sa-sub"> — already in your locker</span>}
                      {item.status === "needs-input" && <span className="sa-sub"> — needs your input</span>}
                    </div>
                    <input className="sa-input" type="number" min="0" value={item.qty}
                      onChange={(e) => updatePasteReviewItem(idx, { qty: Math.max(0, Number(e.target.value) || 0) })} />
                  </div>
                  {renderTagFields(item, (patch) => updatePasteReviewItem(idx, patch))}
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="sa-btn primary" onClick={confirmPasteImport}>
                  Import {pasteReview.items.filter((i) => i.selected).length} item{pasteReview.items.filter((i) => i.selected).length === 1 ? "" : "s"}
                </button>
                <button className="sa-btn ghost" onClick={() => setPasteReview(null)}>Cancel</button>
              </div>
            </div>
          ) : showPastePanel ? (
            <div>
              <div className="sa-sub" style={{ marginBottom: 8 }}>
                Paste your list below — one mic per line, quantities optional (e.g. "2x SM57" or "SM57 (2)").
              </div>
              <textarea className="sa-input" rows={8} value={pasteText}
                placeholder={"SM57\n2x SM58\nBeta 52A (1)\n…"}
                onChange={(e) => setPasteText(e.target.value)} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="sa-btn primary" onClick={startPasteImport} disabled={pasteBusy || !pasteText.trim()}>
                  {pasteBusy ? "Recognizing…" : "Parse & review"}
                </button>
                <button className="sa-btn ghost" onClick={() => { setShowPastePanel(false); setPasteText(""); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="sa-btn ghost" onClick={() => setShowPastePanel(true)}>📋 Paste a list</button>
          )}
        </div>
      </div>
    </div>
  );

  const renderShow = () => (
    <div className="sa-grid" style={{ gap: 18 }}>
      <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className="sa-btn ghost" onClick={() => setActiveId(null)}>← All shows</button>
        <div style={{ flex: 1 }} />
        {printMsg && <span className="sa-sub">{printMsg}</span>}
        <button className="sa-btn" onClick={() => duplicateShow(active.id)}>Duplicate</button>
        <button className="sa-btn" onClick={copyList}>{copied ? "Copied ✓" : "Copy as text"}</button>
        <button className="sa-btn" onClick={openPrintSheet}>Print crew sheet</button>
      </div>

      {/* Show details */}
      <div className="sa-card">
        <h2 className="sa-h2">Show details</h2>
        <div className="sa-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div><label className="sa-label">Band</label>
            <input className="sa-input" value={active.band} placeholder="The Midnight Ramblers"
              onChange={(e) => updateShow({ band: e.target.value })} /></div>
          <div><label className="sa-label">Date</label>
            <input className="sa-input" value={active.date} placeholder="Aug 2"
              onChange={(e) => updateShow({ date: e.target.value })} /></div>
          <div><label className="sa-label">Venue</label>
            <input className="sa-input" value={active.venue} placeholder="Mercury Lounge"
              onChange={(e) => updateShow({ venue: e.target.value })} /></div>
          <div><label className="sa-label">Band contact</label>
            <input className="sa-input" value={active.contact} placeholder="name / phone"
              onChange={(e) => updateShow({ contact: e.target.value })} /></div>
          <div><label className="sa-label">Monitor mixes</label>
            <input className="sa-input" value={active.monitors} placeholder="4 wedges + drum sub"
              onChange={(e) => updateShow({ monitors: e.target.value })} /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="sa-label">Advance notes (backline, power, quirks)</label>
          <textarea className="sa-input" rows={active.notes.split("\n").length > 2 ? 5 : 2} value={active.notes}
            placeholder="Drummer brings own kit, needs 2× 20A circuits stage right…"
            onChange={(e) => updateShow({ notes: e.target.value })} />
        </div>
      </div>

      {/* Instrument palette */}
      <div className="sa-card no-print">
        <h2 className="sa-h2">Add inputs — tap what's on stage</h2>
        {Object.keys(GROUPS).filter((g) => g !== "Other").map((g) => (
          <div key={g}>
            <div className="sa-groupname">{g}</div>
            <div className="sa-palette">
              {CATALOG.filter((c) => c.group === g).map((c) => (
                <button key={c.label} className="sa-chip"
                  style={{ background: GROUPS[g].color, color: GROUPS[g].text }}
                  onClick={() => addChannel(c)}>
                  + {c.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="sa-customrow">
          <span className="sa-label" style={{ margin: 0 }}>Something unusual?</span>
          <input className="sa-input" style={{ maxWidth: 220 }} value={customName}
            placeholder="Cello, accordion, didgeridoo…"
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()} />
          <select className="sa-input" style={{ maxWidth: 150 }} value={customGroup}
            onChange={(e) => setCustomGroup(e.target.value)}>
            {Object.keys(GROUPS).map((g) => <option key={g}>{g}</option>)}
          </select>
          <button className="sa-btn" onClick={addCustom}>+ Add input</button>
        </div>
      </div>

      {/* Input list */}
      <div className="sa-card">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="sa-h2" style={{ flex: 1 }}>Input list — {active.channels.length} channels</h2>
          {active.channels.length > 1 && (
            <button className="sa-btn no-print" onClick={sortByGroup}
              title="Arrange in console order: drums → perc → bass → guitars → keys → strings/horns → vocals → playback">
              Sort by group
            </button>
          )}
        </div>
        {active.channels.length === 0 ? (
          <div className="sa-empty">Tap instruments above to start the patch.</div>
        ) : (
          <div className="sa-mono">
            <div className="sa-colhead">
              <div></div><div>CH</div><div></div><div>Source</div><div>Mic / DI</div>
              <div>Stand</div><div>48V</div><div>Notes</div><div>Stage Box</div><div></div>
            </div>
            {active.channels.map((c, i) => (
              <div key={c.id}
                className={`sa-ch${overIdx === i && dragIdx !== null ? " drag-over" : ""}${dragIdx === i ? " dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); if (overIdx !== i) setOverIdx(i); }}
                onDrop={(e) => { e.preventDefault(); dropChannel(dragIdx, i); setDragIdx(null); setOverIdx(null); }}>
                <div className="sa-handle no-print" title="Drag to reorder" draggable
                  onDragStart={(e) => {
                    setDragIdx(i);
                    e.dataTransfer.effectAllowed = "move";
                    const row = e.currentTarget.closest(".sa-ch");
                    if (row && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(row, 20, 18);
                  }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}>⠿</div>
                <div className="sa-chnum">{i + 1}</div>
                <div className="sa-strip" style={{ background: GROUPS[c.group]?.color || "#555" }} />
                <input value={c.name} onChange={(e) => updateChannel(c.id, { name: e.target.value })} />
                <div className="sa-micwrap">
                  <select
                    value={MIC_OPTIONS.includes(c.mic) ? c.mic : RENTAL}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === RENTAL) updateChannel(c.id, { mic: "" });
                      else updateChannel(c.id, { mic: v, phantom: resolvePhantom(v) ? true : c.phantom });
                    }}>
                    <optgroup label="Your locker">
                      {Object.keys(inventory).map((m) => (
                        <option key={m} value={m}>{m} · own {inventory[m]}</option>
                      ))}
                    </optgroup>
                    <optgroup label="DI / Wireless">
                      {EXTRA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </optgroup>
                    <optgroup label="Not in locker">
                      <option value={RENTAL}>Rental / other…</option>
                    </optgroup>
                  </select>
                  {!MIC_OPTIONS.includes(c.mic) && (
                    <input
                      value={c.mic}
                      placeholder="rental mic — e.g. Beta 91A"
                      autoFocus={c.mic === ""}
                      onChange={(e) => updateChannel(c.id, { mic: e.target.value })} />
                  )}
                </div>
                <select className="m-stand" value={c.stand}
                  onChange={(e) => updateChannel(c.id, { stand: e.target.value })}>
                  {STAND_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
                <div className="sa-48">
                  <button className={c.phantom ? "on" : ""} title="Phantom power"
                    onClick={() => updateChannel(c.id, { phantom: !c.phantom })}>48V</button>
                </div>
                <input className="m-note" value={c.note}
                  placeholder="notes — e.g. picks up on chorus only"
                  onChange={(e) => updateChannel(c.id, { note: e.target.value })} />
                <select
                  className={`sa-sb m-sb${sbDupeSet.has(c.stagebox ?? i + 1) ? " dupe" : c.stagebox != null ? " override" : ""}`}
                  title="Stage box line (defaults to channel number)"
                  value={c.stagebox ?? ""}
                  onChange={(e) => updateChannel(c.id, { stagebox: e.target.value === "" ? null : Number(e.target.value) })}>
                  <option value="">{i + 1} ·auto</option>
                  {Array.from({ length: 48 }, (_, n) => n + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <div className="sa-rowbtns no-print">
                  <button title="Move up" onClick={() => moveChannel(i, -1)}>↑</button>
                  <button title="Move down" onClick={() => moveChannel(i, 1)}>↓</button>
                  <button title="Remove" onClick={() => removeChannel(c.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shortage warning */}
      {shortages.length > 0 && (
        <div className="sa-shortbanner">
          ⚠ Over inventory: {shortages.map(([k, v]) => `${k} — need ${v}, own ${inventory[k]}`).join(" · ")}. Swap mics or plan a rental.
        </div>
      )}

      {/* Duplicate stage box warning */}
      {sbDupes.length > 0 && (
        <div className="sa-shortbanner">
          ⚠ Stage box conflicts: {sbDupes.map(([line, chs]) => `line ${line} claimed by CH ${chs.join(" & ")}`).join(" · ")}. Reassign so each line has one channel.
        </div>
      )}

      {/* Gear summary */}
      <div className="sa-card">
        <h2 className="sa-h2">Gear pull</h2>
        <div className="sa-summary">
          <div>
            <div className="sa-groupname">Mics & DIs</div>
            {micCounts.length === 0 && <div className="sa-sub">—</div>}
            {micCounts.map(([k, v]) => {
              const own = inventory[k];
              const short = own !== undefined && v > own;
              return (
                <div key={k} className={`sa-sum-item${short ? " short" : ""}`}>
                  <span>{k} {isRental(k) && <span className="sa-rentaltag">RENTAL</span>}</span>
                  <span className="sa-sum-count">
                    {v}{own !== undefined && <span className="sa-own"> / {own} owned</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <div>
            <div className="sa-groupname">Stands</div>
            {standCounts.length === 0 && <div className="sa-sub">—</div>}
            {standCounts.map(([k, v]) => (
              <div key={k} className="sa-sum-item"><span>{k}</span><span className="sa-sum-count">{v}</span></div>
            ))}
          </div>
          <div>
            <div className="sa-groupname">Phantom (48V) channels</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: phantomCh.length ? "#ff8f8f" : "#8a8f98" }}>
              {phantomCh.length ? phantomCh.join(", ") : "none"}
            </div>
            <div className="sa-groupname" style={{ marginTop: 14 }}>Cable count (XLR est.)</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{active.channels.length} lines + monitors</div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ————————————————— PRINT SHEET (crew handout) ————————————————— */
  const renderPrintSheet = () => (
    <div className="print-sheet">
      <div className="ps-head">
        <div className="ps-band">{active.band || "Untitled show"}</div>
        <div className="ps-brand">Input List · StageAdvance</div>
      </div>
      <div className="ps-meta">
        {active.date && <div><b>Date</b>{active.date}</div>}
        {active.venue && <div><b>Venue</b>{active.venue}</div>}
        {active.contact && <div><b>Band contact</b>{active.contact}</div>}
        {active.monitors && <div><b>Monitors</b>{active.monitors}</div>}
        <div><b>Channels</b>{active.channels.length}</div>
      </div>

      {shortages.length > 0 && (
        <div className="ps-alert">
          ⚠ OVER INVENTORY: {shortages.map(([k, v]) => `${k} — need ${v}, own ${inventory[k]}`).join(" · ")}
        </div>
      )}

      {sbDupes.length > 0 && (
        <div className="ps-alert">
          ⚠ STAGE BOX CONFLICTS: {sbDupes.map(([line, chs]) => `line ${line} → CH ${chs.join(" & ")}`).join(" · ")}
        </div>
      )}

      <table className="ps-table">
        <thead>
          <tr>
            <th>CH</th><th>Source</th><th>Mic / DI</th><th>Stand</th>
            <th style={{ textAlign: "center" }}>48V</th><th>Notes</th>
            <th style={{ textAlign: "right" }}>Stage Box</th>
          </tr>
        </thead>
        <tbody>
          {active.channels.map((c, i) => (
            <tr key={c.id}>
              <td className="ps-num">{i + 1}</td>
              <td>
                <span className="ps-swatch" style={{ background: GROUPS[c.group]?.color || "#999" }} />
                {c.name}
              </td>
              <td>{c.mic}{isRental(c.mic) ? " (RENTAL)" : ""}</td>
              <td>{c.stand === "None" ? "—" : c.stand}</td>
              <td className="ps-48">{c.phantom ? "48V" : ""}</td>
              <td>{c.note}</td>
              <td className="ps-num" style={{ width: "auto" }}>{c.stagebox ?? i + 1}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ps-cols">
        <div className="ps-col">
          <div className="ps-h">Mic pull</div>
          {micCounts.map(([k, v]) => (
            <div key={k} className="ps-line">
              <span>{k}{isRental(k) ? " (RENTAL)" : ""}</span>
              <b>{v}{inventory[k] !== undefined ? ` / ${inventory[k]}` : ""}</b>
            </div>
          ))}
        </div>
        <div className="ps-col">
          <div className="ps-h">Stands</div>
          {standCounts.map(([k, v]) => (
            <div key={k} className="ps-line"><span>{k}</span><b>{v}</b></div>
          ))}
        </div>
        <div className="ps-col">
          <div className="ps-h">Phantom channels</div>
          <div style={{ fontSize: "10pt", fontWeight: 800, padding: "2px 0" }}>
            {phantomCh.length ? phantomCh.join(", ") : "none"}
          </div>
          <div className="ps-h" style={{ marginTop: 8 }}>XLR lines</div>
          <div style={{ fontSize: "10pt", fontWeight: 800, padding: "2px 0" }}>
            {active.channels.length} + monitors
          </div>
        </div>
      </div>

      {active.notes && (
        <>
          <div className="ps-h">Advance notes</div>
          <div className="ps-notes">{active.notes}</div>
        </>
      )}

      <div className="ps-foot">
        <span>Printed {new Date().toLocaleDateString()}</span>
        <span>Mic pull shows need / owned · RENTAL items must be sourced before load-in</span>
      </div>
    </div>
  );

  /* ————————————————— render ————————————————— */
  return (
    <div className="sa-root">
      <style>{css}</style>
      <div className={`sa-wrap${active ? " screen-only" : ""}`}>
        <div className="sa-head">
          <div>
            <div className="sa-logo">Stage<span>Advance</span></div>
            <div className="sa-sub">input lists · mic pulls · stand counts — before you load the van</div>
          </div>
          {!standalone && user && (
            <div className="sa-tabs no-print" style={{ alignItems: "center" }}>
              <div className="sa-sub" style={{ marginRight: 4 }}>Signed in as {user.email}</div>
              <button className={`sa-tab${mode === "plan" ? " on" : ""}`} onClick={() => setMode("plan")}>Planner</button>
              <button className={`sa-tab${mode === "locker" ? " on" : ""}`} onClick={() => setMode("locker")}>Locker</button>
              <button className={`sa-tab${mode === "form" ? " on" : ""}`} onClick={() => { setMode("form"); setFormDone(false); }}>Band Form</button>
              <button className="sa-tab" onClick={signOut}>Sign out</button>
            </div>
          )}
        </div>

        {legacyForm ? (
          <div className="sa-card" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: 32 }}>
            <h2 className="sa-h2">This link has moved</h2>
            <div className="sa-sub">Ask your sound engineer for their current Band Form link.</div>
          </div>
        ) : standalone && formOwnerStatus === "loading" ? (
          <div className="sa-sub" style={{ textAlign: "center", margin: 60 }}>Loading…</div>
        ) : standalone && formOwnerStatus === "not-found" ? (
          <div className="sa-card" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center", padding: 32 }}>
            <h2 className="sa-h2">This form link isn't valid</h2>
            <div className="sa-sub">Ask your sound engineer for their current Band Form link.</div>
          </div>
        ) : !standalone && authLoading ? (
          <div className="sa-sub" style={{ textAlign: "center", margin: 60 }}>Loading…</div>
        ) : !standalone && !user ? (
          <Login onSignIn={signInWithEmail} />
        ) : (
          mode === "form" ? renderForm() : mode === "locker" ? renderLocker() : active ? renderShow() : renderShowList()
        )}
      </div>
      {active && mode === "plan" && !standalone && user && renderPrintSheet()}
    </div>
  );
}
