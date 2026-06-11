import { useLogStore } from "../store/logStore";
import { ChevronDown, Search } from "lucide-react";

const PROTOCOL_OPTS = ["TCP", "UDP", "ICMP"];

const VOLUME_OPTS = [
  { id: "lt10kb", label: "< 10 KB" },
  { id: "lt1mb", label: "10 KB – 1 MB" },
  { id: "gt100mb", label: "> 100 MB" },
];

function Checkbox({ checked, color = "#3b82f6", onChange }) {
  return (
    <div
      className={`filter-check-box ${checked ? "checked" : ""}`}
      style={{
        borderColor: checked ? color : "#253552",
        backgroundColor: checked ? color : "transparent",
      }}
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
    >
      {checked && (
        <svg viewBox="0 0 10 8" style={{ width: 8, height: 8 }}>
          <path
            d="M1 4l3 3 5-6"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export default function Sidebar({
  ips = [],
  selectedIP = "",
  filters = {},
  onTargetChange,
  onFilterChange,
  searchEventId = "",
  onSearchEventIdChange,
}) {
  const protocols = useLogStore((s) => s.protocols || []);

  const safeFilters = {
    protocols: filters.protocols || { TCP: true, UDP: true, ICMP: true },
    volumes: filters.volumes || { lt10kb: true, lt1mb: true, gt100mb: true },
  };

  const toggleProtocol = (p) => {
    onFilterChange({
      ...filters,
      protocols: { ...safeFilters.protocols, [p]: !safeFilters.protocols[p] },
    });
  };

  const toggleVolume = (id) => {
    onFilterChange({
      ...filters,
      volumes: { ...safeFilters.volumes, [id]: !safeFilters.volumes[id] },
    });
  };

  // Calculate percentages dynamically from the protocol list
  const totalEvents = protocols.reduce((sum, p) => sum + (Number(p.events) || 0), 0);
  const getProtoPct = (proto) => {
    if (totalEvents === 0) {
      if (proto === "TCP") return "67%";
      if (proto === "UDP") return "24%";
      if (proto === "ICMP") return "9%";
      return "0%";
    }
    const match = protocols.find(
      (p) => String(p.Protocol || p.name || "").toUpperCase() === proto.toUpperCase()
    );
    if (!match) return "0%";
    return `${Math.round(((Number(match.events) || 0) / totalEvents) * 100)}%`;
  };

  const PROTO_COLORS = {
    TCP: "#4a9eff",
    UDP: "#f59e0b",
    ICMP: "#ef4444",
  };

  return (
    <aside className="filter-panel" style={{ width: 200, padding: "18px 14px" }}>
      {/* Target IP */}
      <div style={{ marginBottom: 20 }}>
        <label className="filter-label" style={{ fontSize: 10, fontWeight: 700, color: "#8899b4" }}>
          Target IP
        </label>
        <div style={{ position: "relative" }}>
          <select
            className="filter-select"
            value={selectedIP}
            onChange={(e) => onTargetChange(e.target.value)}
            style={{
              paddingRight: 28,
              fontSize: 12,
              fontWeight: 500,
              color: "#e2e8f0",
              height: 32,
            }}
          >
            <option value="" disabled>
              Select IP…
            </option>
            {ips.map((ip) => (
              <option key={ip} value={ip}>
                {ip}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Protocols Breakdown */}
      <div style={{ marginBottom: 20 }}>
        <label className="filter-label" style={{ fontSize: 10, fontWeight: 700, color: "#8899b4" }}>
          Protocols
        </label>
        <div className="filter-checks" style={{ gap: 9 }}>
          {PROTOCOL_OPTS.map((p) => {
            const checked = !!safeFilters.protocols[p];
            const color = PROTO_COLORS[p] || "#3b82f6";
            return (
              <div
                key={p}
                className="filter-check-row"
                style={{ justifyContent: "space-between", width: "100%" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Checkbox
                    checked={checked}
                    color={color}
                    onChange={() => toggleProtocol(p)}
                  />
                  <span
                    className="filter-check-label"
                    style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1" }}
                  >
                    {p}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: color,
                    fontFamily: "monospace",
                  }}
                >
                  {getProtoPct(p)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Traffic Volume Filters */}
      <div style={{ marginBottom: 20 }}>
        <label className="filter-label" style={{ fontSize: 10, fontWeight: 700, color: "#8899b4" }}>
          Traffic Volume
        </label>
        <div className="filter-checks" style={{ gap: 9 }}>
          {VOLUME_OPTS.map(({ id, label }) => {
            const checked = !!safeFilters.volumes[id];
            return (
              <label key={id} className="filter-check-row" style={{ display: "flex", gap: 8 }}>
                <Checkbox
                  checked={checked}
                  color="#3b82f6"
                  onChange={() => toggleVolume(id)}
                />
                <span className="filter-check-label" style={{ fontSize: 11, color: "#94a3b8" }}>
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Search Event ID */}
      <div style={{ marginBottom: 20 }}>
        <label className="filter-label" style={{ fontSize: 10, fontWeight: 700, color: "#8899b4" }}>
          Search Event ID
        </label>
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 12,
              height: 12,
              color: "#5a6a8a",
            }}
          />
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search Event ID"
            value={searchEventId}
            onChange={(e) => onSearchEventIdChange?.(e.target.value)}
            style={{
              paddingLeft: 26,
              height: 32,
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: 11,
              color: "var(--text)",
            }}
          />
        </div>
      </div>

      {/* Saved Views */}
      <div>
        <label className="filter-label" style={{ fontSize: 10, fontWeight: 700, color: "#8899b4" }}>
          Saved Views
        </label>
        <div className="sidebar-saved-views" style={{ gap: 6 }}>
          {[
            { name: "SOC Overview", id: "soc" },
            { name: "External Traffic", id: "ext" },
            { name: "Internal East-West", id: "int" },
          ].map((v) => (
            <div
              key={v.id}
              className="sidebar-saved-view"
              style={{
                fontSize: 11,
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onClick={() => {
                // Mock view switching or apply preset filters
                if (v.id === "soc") {
                  onFilterChange({
                    protocols: { TCP: true, UDP: true, ICMP: true },
                    volumes: { lt10kb: true, lt1mb: true, gt100mb: true },
                  });
                }
              }}
            >
              <span style={{ fontSize: 8 }}>›</span> {v.name}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
