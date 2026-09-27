/*
 * Flat, CSS-drawn device frames (no photorealistic mockup — this app
 * has no image-generation tool, and a flat frame matches the site's
 * own dark/minimal look better than a glossy stock photo would).
 * Desktop behind, tablet mid, phone front — same idea as a typical
 * "works everywhere" marketing shot, drawn instead of rendered.
 *
 * Normal flow + negative margins for the overlap (not absolute
 * positioning) so the container always sizes itself to its tallest
 * child — no risk of frames spilling into the section below.
 */

const Frame = ({ src, alt, width, aspect, chin, style }) => (
  <div
    style={{
      width,
      flexShrink: 0,
      borderRadius: 14,
      background: "#2c2f37",
      border: "1px solid #3a3e48",
      padding: 8,
      paddingBottom: chin ? 20 : 8,
      boxSizing: "border-box",
      boxShadow: "0 12px 30px rgba(0,0,0,.45)",
      position: "relative",
      ...style,
    }}
  >
    <div style={{ aspectRatio: aspect, borderRadius: 6, overflow: "hidden", background: "#17181c" }}>
      <img src={src} alt={alt} loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
    </div>
    {chin && (
      <div style={{ position: "absolute", left: "50%", bottom: 6, transform: "translateX(-50%)",
        width: chin, height: 4, borderRadius: 2, background: "#3a3e48" }} />
    )}
  </div>
);

export default function DeviceShowcase() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", maxWidth: 640, margin: "0 auto" }}>
      <Frame
        src="/screenshots/input-list.png"
        alt="StageAdvance input list on desktop"
        aspect="16/10"
        width="56%"
        style={{ zIndex: 1 }}
      />
      <Frame
        src="/screenshots/outputs.png"
        alt="StageAdvance output list on a tablet"
        aspect="4/3"
        width="32%"
        style={{ zIndex: 2, marginLeft: "-9%", marginBottom: "-6%" }}
      />
      <Frame
        src="/screenshots/mobile-outputs.png"
        alt="StageAdvance on a phone"
        aspect="9/18.5"
        width="17%"
        chin={22}
        style={{ zIndex: 3, marginLeft: "-7%" }}
      />
    </div>
  );
}
