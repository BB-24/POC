function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

export default function KPIBar({
  summary = {}
}) {

  return (

    <div className="kpis">

      <div className="card">
        <span>Logs</span>
        <div className="kpi-value">{summary.totalLogs || 0}</div>
      </div>

      <div className="card">
        <span>IPs</span>
        <div className="kpi-value">{summary.uniqueIPs || 0}</div>
      </div>

      <div className="card">
        <span>Bandwidth</span>
        <div className="kpi-value">{formatBytes(summary.totalBandwidth || 0)}</div>
      </div>

      <div className="card">
        <span>Top Talker</span>
        <div className="kpi-value">{summary.topTalker || "N/A"}</div>
      </div>

    </div>
  );
}