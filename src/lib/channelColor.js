/*
 * Which color the strip on the left of an input row shows.
 *
 * The strip normally means "the color you use on the console" (drums
 * yellow, vocals blue), so the default is unchanged: the group color.
 * Some engineers color by patch location instead, so a show can opt in to
 * "left color follows stage box" (show.colorByBox).
 *
 * Priority, highest first:
 *   1. a color set by hand on that channel — always wins, never overwritten
 *   2. the stage box's color — only when the show has colorByBox on and the
 *      channel is in a box
 *   3. the group color
 *
 * This only decides what is DISPLAYED. Nothing is written onto the
 * channels, so turning the option off puts everything back exactly.
 */
export function resolveChannelColor(channel, boxes, colorByBox, groupColor) {
  if (channel.color) return channel.color;
  if (colorByBox && channel.boxId) {
    const box = (boxes || []).find((b) => b.id === channel.boxId);
    if (box?.color) return box.color;
  }
  return groupColor(channel.group);
}
