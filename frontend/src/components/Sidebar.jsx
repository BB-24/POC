import { ChevronDown } from "lucide-react";

const TIME_RANGES = [
  { value: "all",  label: "All Time" },
  { value: "1h",   label: "Last 1 Hour" },
  { value: "6h",   label: "Last 6 Hours" },
  { value: "24h",  label: "Last 24 Hours" },
];

const PROTOCOL_OPTS = ["TCP", "UDP", "ICMP"];

const VOLUME_OPTS = [
  { id: "lt10kb",  label: "10KB" },
  { id: "lt1mb",   label: "1MB" },
  { id: "gt100mb", label: "100MB" },
];

function Checkbox({ checked, onChange }) {
  return (
    <div
      className={`filter-check-box ${checked ? "checked" : ""}`}
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
    >
      {checked && (
        <svg viewBox="0 0 10 8" style={{ width: 8, height: 8 }}>
          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

export default function Sidebar({ ips, selectedIP, filters = {}, onTargetChange, onFilterChange }) {
  const safeFilters = {
    protocols: filters.protocols || { TCP: true, UDP: true, ICMP: true },
    volumes:   filters.volumes   || { lt10kb: true, lt1mb: true, gt100mb: true },
    timeRange: filters.timeRange || "all",
  };

  const toggleProtocol = (p) =>
    onFilterChange({ ...safeFilters, protocols: { ...safeFilters.protocols, [p]: !safeFilters.protocols[p] } });

  const toggleVolume = (id) =>
    onFilterChange({ ...safeFilters, volumes: { ...safeFilters.volumes, [id]: !safeFilters.volumes[id] } });

  const setTime = (val) =>
    onFilterChange({ ...safeFilters, timeRange: val });

  return (
    <aside className="filter-panel">
      {/* Target IP */}
      <div>
        <label className="filter-label">Target IP:</label>
        <select
          className="filter-select"
          value={selectedIP || ""}
          onChange={(e) => onTargetChange(e.target.value)}
        >
          <option value="" disabled>Select IP…</option>
          {ips.map((ip) => (
            <option key={ip} value={ip}>{ip}</option>
          ))}
        </select>
      </div>

      {/* Time Range */}
      <div>
        <label className="filter-label">Time Range:</label>
        <select
          className="filter-select"
          value={safeFilters.timeRange}
          onChange={(e) => setTime(e.target.value)}
        >
          {TIME_RANGES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Protocol + Volume Filters */}
      <div>
        <div className="filter-section-header">
          <span className="filter-label" style={{ margin: 0 }}>Protocol Filters</span>
          <ChevronDown style={{ width: 11, height: 11, color: "var(--text-dim)" }} />
        </div>
        <div className="filter-checks">
          {PROTOCOL_OPTS.map((p) => (
            <label key={p} className="filter-check-row">
              <Checkbox
                checked={!!safeFilters.protocols[p]}
                onChange={() => toggleProtocol(p)}
              />
              <span className="filter-check-label">{p}</span>
            </label>
          ))}
          {VOLUME_OPTS.map(({ id, label }) => (
            <label key={id} className="filter-check-row">
              <Checkbox
                checked={!!safeFilters.volumes[id]}
                onChange={() => toggleVolume(id)}
              />
              <span className="filter-check-label">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
