const protocolOptions = [
  { name: "TCP", color: "#3b82f6" },
  { name: "UDP", color: "#f59e0b" },
  { name: "ICMP", color: "#ef4444" },
];

export default function ProtocolFilter({ filters, onToggle }) {
  return (
    <div className="tag-grid">
      {protocolOptions.map((option) => (
        <button
          key={option.name}
          type="button"
          className={`tag ${filters[option.name] ? "active" : ""}`}
          style={{ borderColor: option.color, color: filters[option.name] ? "#f8fafc" : option.color }}
          onClick={() => onToggle(option.name)}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}
