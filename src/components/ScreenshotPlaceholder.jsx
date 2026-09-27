// Renders a real screenshot when `src` is given (files live in
// public/screenshots/), otherwise a dashed stand-in box. Search for
// ScreenshotPlaceholder usages without a `src` to find what's still missing.
export default function ScreenshotPlaceholder({ label, aspect = "16/10", src, alt }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || label}
        loading="lazy"
        style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, border: "1px solid #2c2f37" }}
      />
    );
  }
  return (
    <div
      style={{
        aspectRatio: aspect,
        width: "100%",
        borderRadius: 10,
        border: "1px dashed #3a3e48",
        background: "#1c1e23",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <span className="sa-sub" style={{ fontSize: 12 }}>Screenshot: {label}</span>
    </div>
  );
}
