/*
 * The "Try a sample show" starter. One ordinary show, pre-filled with a
 * five-piece band's inputs, two stage boxes and a few outputs, so a new
 * engineer can see a finished input list, mic pull, stand count and print
 * sheet in one click instead of building one from nothing.
 *
 * Decided with Michael 2026-11-19. It is a normal show in every way:
 * everything is editable and the whole show can be deleted. The one special
 * thing is `sampleMics`: the mics here are not in a new user's (empty)
 * locker, and the app tags any mic that isn't in the locker as a RENTAL.
 * Listing them here tells the app "these aren't rentals" for this show only.
 * Anything the user types or picks later behaves exactly as before.
 *
 * `uid` is passed in (the app's own id maker) so ids match every other show.
 */

export const SAMPLE_BOX_DRUMS = "DrumDrop";
export const SAMPLE_BOX_MAIN = "Main";

// [group, name, mic, stand, needs 48V, which box]
const CHANNELS = [
  ["Drums", "Kick In", "Beta 91A", "None", false, "drums"],
  ["Drums", "Kick Out", "Beta 52A", "Short boom", false, "drums"],
  ["Drums", "Snare Top", "SM57", "Short boom", false, "drums"],
  ["Drums", "Hi-Hat", "SM81", "Straight", true, "drums"],
  ["Drums", "Rack Tom", "e604 (clip)", "None", false, "drums"],
  ["Drums", "Floor Tom", "e604 (clip)", "None", false, "drums"],
  ["Drums", "OH L", "sE7 (SDC)", "Tall boom", true, "drums"],
  ["Drums", "OH R", "sE7 (SDC)", "Tall boom", true, "drums"],
  ["Bass", "Bass DI", "Pro48 (active DI)", "None", true, "main"],
  ["Guitars", "Electric Gtr", "e906", "Short boom", false, "main"],
  ["Guitars", "Acoustic Gtr", "SB-2 (passive DI)", "None", false, "main"],
  ["Keys", "Keys L", "Stereo DI", "None", false, "main"],
  ["Keys", "Keys R", "Stereo DI", "None", false, "main", "same box"],
  ["Vocals", "Lead Vox", "e945", "Tall boom", false, "main"],
  ["Vocals", "BG Vox", "SM58", "Tall boom", false, "main"],
];

export function buildSampleShow(uid, blankShow) {
  const drumsBox = { id: uid(), name: SAMPLE_BOX_DRUMS, color: "#E8B93E", position: "USC", description: "Whirlwind DrumDrop ND", lineStyle: "num" };
  const mainBox = { id: uid(), name: SAMPLE_BOX_MAIN, color: "#4E8FD1", position: "SL", description: "Behringer S16", lineStyle: "num" };
  const boxFor = { drums: drumsBox.id, main: mainBox.id };

  const channels = CHANNELS.map(([group, name, mic, stand, phantom, box, note]) => ({
    id: uid(), group, name, mic, stand, phantom, note: note || "",
    boxId: boxFor[box], boxPos: null,
  }));

  // The S16's analog returns, used here for the stage wedges.
  const returnsBox = { id: uid(), name: "S16", color: "#4E8FD1", position: "SL", description: "Behringer S16 returns", lineStyle: "num" };
  const out = (outputChannel, submixName, endpoint, extra = {}) => ({
    id: uid(), outputChannel, submixName, endpoint, notes: "",
    boxId: null, boxPos: null, linkedDown: false, ...extra,
  });
  const outputs = [
    out("Main L", "Main", "Main PA", { linkedDown: true }),
    out("Main R", "Main", "Main PA"),
    out("Aux 1", "Drummer", "Wedge", { rtnBoxId: returnsBox.id, rtnPos: null }),
    out("Aux 2", "Vocals", "Wedge", { rtnBoxId: returnsBox.id, rtnPos: null }),
    out("Aux 3", "Guitar", "Wedge", { rtnBoxId: returnsBox.id, rtnPos: null }),
  ];

  return {
    ...blankShow,
    band: "Sample Band",
    venue: "Sample Venue",
    channels,
    boxes: [drumsBox, mainBox],
    outputs,
    outputBoxes: [returnsBox],
    sample: true,
    sampleMics: [...new Set(CHANNELS.map((c) => c[2]))],
  };
}
