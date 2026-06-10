export default function LoadingOverlay({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="loading-overlay">
      <div className="loader" />
      <span>Processing network data...</span>
    </div>
  );
}
