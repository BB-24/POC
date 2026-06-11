import { useRef, useState } from "react";
import { Bell, HelpCircle, User, Upload } from "lucide-react";
import api from "../api/api";

export default function Header({ onUploadComplete }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

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
      <span className="top-nav-brand">
        <span style={{ color: "#6B7FCC", fontSize: 15 }}>⬡</span>
        <span className="top-nav-brand-prefix">LOG ANALYZER:</span>
        <span className="top-nav-brand-suffix">Targeted IP Investigation</span>
      </span>

      <div className="top-nav-actions">
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
        >
          <Upload style={{ width: 12, height: 12 }} />
          {uploading ? "Uploading…" : "Upload CSV"}
        </button>

        <button className="top-nav-icon-btn" aria-label="Notifications">
          <Bell style={{ width: 15, height: 15 }} />
        </button>
        <button className="top-nav-icon-btn" aria-label="Help">
          <HelpCircle style={{ width: 15, height: 15 }} />
        </button>
        <button className="top-nav-icon-btn" aria-label="Account">
          <User style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </header>
  );
}
