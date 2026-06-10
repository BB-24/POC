export default function TargetSelector({ ips, selectedIP, onChange }) {
  return (
    <label className="field">
      <span>Target IP</span>
      <select value={selectedIP || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="" disabled>
          Select investigation IP
        </option>
        {ips.map((ip) => (
          <option key={ip} value={ip}>
            {ip}
          </option>
        ))}
      </select>
    </label>
  );
}
