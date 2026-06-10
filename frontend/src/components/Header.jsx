export default function Header() {
  return (
    <header className="header-panel panel">
      <div>
        <div className="brand-mark">SIEM</div>
        <div>
          <h1>Network Log Analyzer</h1>
          <p>Offline SOC investigation dashboard for high-volume traffic.</p>
        </div>
      </div>
      <div className="header-actions">
        <button type="button">Notifications</button>
        <button type="button">Settings</button>
      </div>
    </header>
  );
}
