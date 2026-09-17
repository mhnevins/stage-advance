// Stand-in for a real screenshot until the app is deployed and real ones
// can be captured. Search for ScreenshotPlaceholder when swapping them in.
export default function ScreenshotPlaceholder({ label, aspect = "16/10" }) {
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
