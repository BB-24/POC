import { useRef, useState, useEffect } from "react";
import { Bell, HelpCircle, User, Upload, Search, RefreshCw } from "lucide-react";
import api from "../api/api";

export default function Header({ onUploadComplete, timeRange = "24h", onTimeRangeChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [timeStr, setTimeStr] = useState("");

  // Keep a running clock updated every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    try {
      await api.post("/upload", form);
      onUploadComplete?.();
    } catch {
      // errors handled upstream
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <header className="top-nav">
      {/* Brand logo & title */}
      <span className="top-nav-brand">
        <span className="top-nav-brand-icon">⬡</span>
        <span className="top-nav-brand-text">Network Traffic Intelligence</span>
      </span>

      {/* Global IP / Subnet Search Bar */}
      <div className="top-nav-search">
        <Search className="top-nav-search-icon" />
        <input type="text" placeholder="Search IP, hostname, subnet..." />
      </div>

      {/* Right actions area */}
      <div className="top-nav-actions">
        {/* Time range quick filters */}
        <div className="time-range-group">
          {[
            { value: "1h", label: "1h" },
            { value: "6h", label: "6h" },
            { value: "24h", label: "24h" },
            { value: "all", label: "All" },
          ].map((r) => (
            <button
              key={r.value}
              className={`time-range-btn ${timeRange === r.value ? "active" : ""}`}
              onClick={() => onTimeRangeChange?.(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Upload Log Data File */}
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleFile}
        />
        <button
          className="upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ marginRight: 8 }}
        >
          <Upload style={{ width: 12, height: 12 }} />
          {uploading ? "Uploading…" : "Upload CSV"}
        </button>

        {/* Action icons */}
        <button className="top-nav-icon-btn" aria-label="Notifications" style={{ position: "relative" }}>
          <Bell style={{ width: 15, height: 15 }} />
          {/* Notification dot indicator */}
          <span style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "#ef4444"
          }} />
        </button>
        <button className="top-nav-icon-btn" aria-label="Refresh Data" onClick={() => onUploadComplete?.()}>
          <RefreshCw style={{ width: 14, height: 14 }} />
        </button>
        <button className="top-nav-icon-btn" aria-label="Help">
          <HelpCircle style={{ width: 15, height: 15 }} />
        </button>
        <button className="top-nav-icon-btn" aria-label="Account">
          <User style={{ width: 15, height: 15 }} />
        </button>

        {/* Dynamic real-time clock */}
        <span className="top-nav-clock">{timeStr}</span>
      </div>
    </header>
  );
}
