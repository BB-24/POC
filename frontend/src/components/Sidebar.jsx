import TargetSelector from "./TargetSelector";
import ProtocolFilter from "./ProtocolFilter";
import TimeRangeSelector from "./TimeRangeSelector";

const volumeOptions = [
  { id: "lt10kb", label: "<10KB" },
  { id: "lt1mb", label: "<1MB" },
  { id: "gt100mb", label: ">100MB" },
];

export default function Sidebar({ ips, selectedIP, filters = {}, onTargetChange, onFilterChange }) {
  const safeFilters = {
    protocols: filters.protocols || { TCP: true, UDP: true, ICMP: true },
    volumes: filters.volumes || { lt10kb: true, lt1mb: true, gt100mb: true },
    timeRange: filters.timeRange || "all",
  };

  const handleVolumeToggle = (id) => {
    onFilterChange({
      ...safeFilters,
      volumes: {
        ...safeFilters.volumes,
        [id]: !safeFilters.volumes[id],
      },
    });
  };

  const handleProtocolToggle = (protocol) => {
    onFilterChange({
      ...safeFilters,
      protocols: {
        ...safeFilters.protocols,
        [protocol]: !safeFilters.protocols[protocol],
      },
    });
  };

  const handleTimeRange = (value) => {
    onFilterChange({
      ...safeFilters,
      timeRange: value,
    });
  };

  return (
    <aside className="sidebar-panel panel">
      <div className="sidebar-section">
        <h3>Investigation Controls</h3>
        <TargetSelector ips={ips} selectedIP={selectedIP} onChange={onTargetChange} />
        <TimeRangeSelector value={safeFilters.timeRange} onChange={handleTimeRange} />
      </div>

      <div className="sidebar-section">
        <h3>Protocol Filters</h3>
        <ProtocolFilter filters={safeFilters.protocols} onToggle={handleProtocolToggle} />
      </div>

      <div className="sidebar-section">
        <h3>Traffic Volume</h3>
        <div className="tag-grid">
          {volumeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`tag ${safeFilters.volumes[option.id] ? "active" : ""}`}
              onClick={() => handleVolumeToggle(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

