const timeRanges = [
  { value: "all", label: "All Time" },
  { value: "1h", label: "Last 1h" },
  { value: "6h", label: "Last 6h" },
  { value: "24h", label: "Last 24h" },
];

export default function TimeRangeSelector({ value, onChange }) {
  return (
    <div className="field">
      <span>Time Range</span>
      <div className="button-group">
        {timeRanges.map((range) => (
          <button
            key={range.value}
            type="button"
            className={value === range.value ? "button-pill active" : "button-pill"}
            onClick={() => onChange(range.value)}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
