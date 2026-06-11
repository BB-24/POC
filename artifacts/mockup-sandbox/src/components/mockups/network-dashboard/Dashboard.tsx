import { useState, useRef, useEffect } from "react";
import {
  Bell, HelpCircle, User, ChevronDown, Home, Clock,
  Users, BarChart2, Settings, LogOut, MoreVertical
} from "lucide-react";

// ─── Color palette ─────────────────────────────────────────────────────────
const C = {
  bg:       "#111827",
  panel:    "#1a2035",
  sidebar:  "#0f1729",
  border:   "#2a3550",
  text:     "#c8d3ea",
  muted:    "#5a6a8a",
  TCP:      "#4a9eff",
  UDP:      "#f59e0b",
  ICMP:     "#ef4444",
  accent:   "#3b82f6",
};

// ─── Mock flow data ─────────────────────────────────────────────────────────
const TARGET_IP = "172.16.0.100";
const IPS = ["192.168.1.15", "10.0.0.25", "8.8.8.8", "172.31.5.10", "45.79.112.5", "203.0.113.8"];

// time in minutes from 18:00, dest index, protocol, volume bytes, direction (out=right, in=left)
const RAW_FLOWS = [
  { t: 2,  dest: 0, proto: "TCP",  vol: 45_000_000,   dir: 1 },
  { t: 8,  dest: 0, proto: "TCP",  vol: 800_000,       dir: 1 },
  { t: 12, dest: 0, proto: "TCP",  vol: 12_000_000,    dir: 1 },
  { t: 15, dest: 1, proto: "TCP",  vol: 500_000,       dir: 1 },
  { t: 17, dest: 0, proto: "TCP",  vol: 3_000_000,     dir: 1 },
  { t: 22, dest: 3, proto: "TCP",  vol: 120_000_000,   dir: 1 },
  { t: 25, dest: 0, proto: "TCP",  vol: 900_000,       dir: 1 },
  { t: 29, dest: 1, proto: "TCP",  vol: 400_000,       dir: 1 },
  { t: 33, dest: 0, proto: "TCP",  vol: 2_000_000,     dir: 1 },
  { t: 39, dest: 1, proto: "UDP",  vol: 8_000_000,     dir: 1 },
  { t: 42, dest: 0, proto: "TCP",  vol: 1_000_000,     dir: 1 },
  { t: 47, dest: 0, proto: "TCP",  vol: 45_000_000,    dir: 1 },
  { t: 47, dest: 3, proto: "TCP",  vol: 45_000_000,    dir: -1 },
  { t: 50, dest: 0, proto: "TCP",  vol: 600_000,       dir: 1 },
  { t: 51, dest: 0, proto: "TCP",  vol: 300_000,       dir: 1 },
  { t: 52, dest: 0, proto: "TCP",  vol: 400_000,       dir: 1 },
  { t: 53, dest: 0, proto: "TCP",  vol: 700_000,       dir: 1 },
  { t: 54, dest: 0, proto: "TCP",  vol: 200_000,       dir: 1 },
  { t: 55, dest: 0, proto: "TCP",  vol: 350_000,       dir: 1 },
  { t: 56, dest: 0, proto: "TCP",  vol: 45_000_000,    dir: 1 },
  { t: 56, dest: 0, proto: "TCP",  vol: 45_000_000,    dir: -1 },
  { t: 58, dest: 1, proto: "TCP",  vol: 5_000_000,     dir: 1 },
  { t: 63, dest: 0, proto: "TCP",  vol: 700_000,       dir: 1 },
  { t: 67, dest: 2, proto: "TCP",  vol: 1_500_000,     dir: 1 },
];

function fmtVol(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(0) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b + " B";
}

function strokeWidth(vol: number) {
  if (vol >= 100_000_000) return 6;
  if (vol >= 1_000_000)   return 3.5;
  if (vol >= 10_000)      return 2;
  return 1.2;
}

function volLabel(vol: number) {
  if (vol >= 100_000_000) return "100MB+";
  if (vol >= 1_000_000)   return "1MB+";
  if (vol >= 10_000)      return "10KB+";
  return "<1KB";
}

// ─── Main ──────────────────────────────────────────────────────────────────
export function Dashboard() {
  const [filters, setFilters] = useState({ TCP: true, UDP: true, ICMP: true, "10KB": true, "1MB": true, "100MB": true });
  const [targetIP, setTargetIP] = useState(TARGET_IP);
  const [timeRange, setTimeRange] = useState("Last 1 Hour");
  const [hovered, setHovered] = useState<typeof RAW_FLOWS[0] | null>(null);
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Chart layout constants
  const svgW = 820, svgH = 500;
  const pad = { top: 30, right: 10, bottom: 55, left: 78 };
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;
  const totalMins = 70; // 18:00 to 19:10

  // X: target column + 6 dest columns
  const colCount = IPS.length + 1;
  const colW = chartW / colCount;
  const targetColX = pad.left + colW * 0.5;
  const destColX = (i: number) => pad.left + colW * (i + 1) + colW * 0.5;

  const timeY = (mins: number) => pad.top + (mins / totalMins) * chartH;

  // Time ticks every 10 min
  const timeTicks = Array.from({ length: 8 }, (_, i) => i * 10);

  // Filter flows
  const flows = RAW_FLOWS.filter(f => {
    if (!filters[f.proto as keyof typeof filters]) return false;
    return true;
  });

  const stats = {
    connections: flows.length,
    transferred: "4.5 GB",
    topProto: "TCP",
  };

  function handleMouseMove(e: React.MouseEvent, flow: typeof RAW_FLOWS[0]) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setHovered(flow);
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: C.bg, color: C.text, fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: 13 }}
    >
      {/* ── Top nav ── */}
      <header style={{ background: "#0d1526", borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 44, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ color: C.muted, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>▦</span>
        <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>
          LOG ANALYZER: <span style={{ color: C.text, fontWeight: 500 }}>Targeted IP Investigation</span>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <Bell style={{ width: 15, height: 15, color: C.muted }} />
          <HelpCircle style={{ width: 15, height: 15, color: C.muted }} />
          <User style={{ width: 15, height: 15, color: C.muted }} />
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Icon rail ── */}
        <nav style={{ width: 40, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 20, flexShrink: 0 }}>
          {[Home, Clock, Users, BarChart2, Settings].map((Icon, i) => (
            <button key={i} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <Icon style={{ width: 15, height: 15, color: i === 0 ? C.accent : C.muted }} />
            </button>
          ))}
          <div style={{ marginTop: "auto", marginBottom: 12 }}>
            <LogOut style={{ width: 15, height: 15, color: C.muted }} />
          </div>
        </nav>

        {/* ── Left filter panel ── */}
        <aside style={{ width: 160, background: C.sidebar, borderRight: `1px solid ${C.border}`, padding: "14px 12px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Target IP */}
          <div>
            <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 6 }}>Target IP:</label>
            <div style={{ position: "relative" }}>
              <select
                value={targetIP}
                onChange={e => setTargetIP(e.target.value)}
                style={{
                  width: "100%", background: "#1e2c47", border: `1px solid ${C.border}`,
                  borderRadius: 5, color: C.text, fontSize: 11, padding: "5px 24px 5px 8px",
                  appearance: "none", cursor: "pointer", outline: "none",
                }}
              >
                <option>{TARGET_IP}</option>
                {IPS.map(ip => <option key={ip}>{ip}</option>)}
              </select>
              <ChevronDown style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: C.muted, pointerEvents: "none" }} />
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 6 }}>Time Range:</label>
            <div style={{ position: "relative" }}>
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                style={{
                  width: "100%", background: "#1e2c47", border: `1px solid ${C.border}`,
                  borderRadius: 5, color: C.text, fontSize: 11, padding: "5px 24px 5px 8px",
                  appearance: "none", cursor: "pointer", outline: "none",
                }}
              >
                {["Last 1 Hour", "Last 6 Hours", "Last 24 Hours", "Last 7 Days"].map(t => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: C.muted, pointerEvents: "none" }} />
            </div>
          </div>

          {/* Protocol Filters */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: C.muted, fontSize: 11 }}>Protocol Filters</span>
              <ChevronDown style={{ width: 11, height: 11, color: C.muted }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["TCP", "UDP", "10KB", "1MB", "100MB"].map(key => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                  <div
                    onClick={() => setFilters(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                    style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${filters[key as keyof typeof filters] ? C.accent : C.border}`,
                      background: filters[key as keyof typeof filters] ? C.accent : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {filters[key as keyof typeof filters] && (
                      <svg viewBox="0 0 10 8" style={{ width: 8, height: 8 }}>
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ color: C.text, fontSize: 12 }}>{key}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main chart area ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 16, gap: 12 }}>
          {/* Panel header */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginRight: "auto" }}>
              Network Traffic Flow Map
            </span>
            {/* Stats */}
            {[
              { label: "Active Connections:", value: String(stats.connections) },
              { label: "Data Transferred:", value: stats.transferred },
              { label: "Top Protocol:", value: stats.topProto },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "0 22px", borderLeft: `1px solid ${C.border}` }}>
                <div style={{ color: C.muted, fontSize: 10, marginBottom: 2 }}>{s.label}</div>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>{s.value}</div>
              </div>
            ))}
            <button style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 12 }}>
              <MoreVertical style={{ width: 16, height: 16, color: C.muted }} />
            </button>
          </div>

          {/* Chart panel */}
          <div style={{ flex: 1, background: C.panel, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden", padding: "12px 0 0 0" }}>
            <div style={{ textAlign: "center", color: C.text, fontSize: 12, marginBottom: 4, paddingLeft: pad.left }}>
              Communication Flows with Targeted IP over Time (Target: {targetIP})
            </div>

            <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
              {/* SVG chart */}
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgW} ${svgH}`}
                style={{ flex: 1, height: "100%", overflow: "visible" }}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Grid verticals per column */}
                {Array.from({ length: colCount }).map((_, i) => {
                  const x = pad.left + colW * i + colW * 0.5;
                  return (
                    <line key={i} x1={x} x2={x} y1={pad.top} y2={pad.top + chartH}
                      stroke={C.border} strokeWidth={0.6} strokeDasharray="4,4" />
                  );
                })}

                {/* Grid horizontals per time tick */}
                {timeTicks.map(m => (
                  <line key={m} x1={pad.left} x2={pad.left + chartW} y1={timeY(m)} y2={timeY(m)}
                    stroke={C.border} strokeWidth={0.4} />
                ))}

                {/* Y-axis time labels */}
                {timeTicks.map(m => {
                  const h = 18 + Math.floor(m / 60);
                  const min = m % 60;
                  const label = `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
                  const dayLabel = m === 0 ? "June 10, 2026" : m === 70 ? "June 10, 2026" : null;
                  return (
                    <g key={m}>
                      {dayLabel && (
                        <text x={pad.left - 4} y={timeY(m) - 9} textAnchor="end" fontSize={8} fill={C.muted}>{dayLabel}</text>
                      )}
                      <text x={pad.left - 4} y={timeY(m) + 4} textAnchor="end" fontSize={9} fill={C.text}>{label}</text>
                    </g>
                  );
                })}

                {/* Y-axis label */}
                <text
                  transform={`translate(${12}, ${pad.top + chartH / 2}) rotate(-90)`}
                  textAnchor="middle" fontSize={10} fill={C.muted}
                >Time</text>

                {/* Flow arrows */}
                {flows.map((f, i) => {
                  const y = timeY(f.t);
                  const x1 = targetColX;
                  const x2 = destColX(f.dest);
                  const leftX = f.dir === 1 ? x1 : x2;
                  const rightX = f.dir === 1 ? x2 : x1;
                  const color = C[f.proto as keyof typeof C] as string || C.TCP;
                  const sw = strokeWidth(f.vol);
                  const isHov = hovered === f;

                  return (
                    <g key={i}
                      onMouseMove={e => handleMouseMove(e, f)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Fat invisible hit area */}
                      <line x1={leftX} x2={rightX} y1={y} y2={y}
                        stroke="transparent" strokeWidth={12} />
                      {/* Visible line */}
                      <line x1={leftX} x2={rightX - (f.dir === 1 ? 6 : -6)} y1={y} y2={y}
                        stroke={color} strokeWidth={isHov ? sw + 1.5 : sw}
                        strokeOpacity={isHov ? 1 : 0.82}
                        strokeLinecap="round"
                      />
                      {/* Arrowhead */}
                      <polygon
                        points={f.dir === 1
                          ? `${rightX},${y} ${rightX - 7},${y - 3.5} ${rightX - 7},${y + 3.5}`
                          : `${leftX},${y} ${leftX + 7},${y - 3.5} ${leftX + 7},${y + 3.5}`
                        }
                        fill={color}
                        fillOpacity={isHov ? 1 : 0.82}
                      />
                    </g>
                  );
                })}

                {/* X-axis IP labels */}
                <g>
                  <text x={targetColX} y={pad.top + chartH + 18} textAnchor="middle" fontSize={9} fill={C.text} fontWeight="600">
                    Target
                  </text>
                  <text x={targetColX} y={pad.top + chartH + 28} textAnchor="middle" fontSize={8} fill={C.muted}>
                    ({TARGET_IP})
                  </text>
                  {IPS.map((ip, i) => (
                    <text key={ip} x={destColX(i)} y={pad.top + chartH + 18} textAnchor="middle" fontSize={8.5} fill={C.text}>
                      {ip}
                    </text>
                  ))}
                  <text x={pad.left + chartW / 2} y={pad.top + chartH + 46} textAnchor="middle" fontSize={9.5} fill={C.muted}>
                    IP Addresses
                  </text>
                </g>

                {/* Tooltip */}
                {hovered && (() => {
                  const tx = Math.min(hoveredPos.x + 10, svgW - 210);
                  const ty = Math.max(hoveredPos.y - 40, 2);
                  return (
                    <g>
                      <rect x={tx} y={ty} width={200} height={26} rx={4}
                        fill="#1e2c47" stroke={C.border} strokeWidth={1} />
                      <text x={tx + 8} y={ty + 16} fontSize={9} fill={C.text}>
                        Flow: {TARGET_IP} &lt;-&gt; {IPS[hovered.dest]} | {hovered.proto} | {fmtVol(hovered.vol)}
                      </text>
                    </g>
                  );
                })()}

                {/* Legend */}
                {(() => {
                  const lx = svgW - 96, ly = pad.top + 4;
                  const rows: { label: string; color?: string; sw?: number }[] = [
                    { label: "Protocol:" },
                    { label: "TCP",  color: C.TCP,  sw: 2 },
                    { label: "UDP",  color: C.UDP,  sw: 2 },
                    { label: "ICMP", color: C.ICMP, sw: 2 },
                    { label: "" },
                    { label: "Traffic Volume (Bytes):" },
                    { label: "< 1KB",  color: C.text, sw: 1.2 },
                    { label: "10KB",   color: C.text, sw: 2 },
                    { label: "1MB",    color: C.text, sw: 3.5 },
                    { label: "100MB",  color: C.text, sw: 6 },
                  ];
                  return (
                    <g>
                      {rows.map((r, i) => {
                        const ry = ly + i * 14;
                        if (!r.color) return (
                          <text key={i} x={lx} y={ry + 9} fontSize={8} fill={C.muted} fontWeight="600">{r.label}</text>
                        );
                        return (
                          <g key={i}>
                            <line x1={lx} x2={lx + 22} y1={ry + 5} y2={ry + 5}
                              stroke={r.color} strokeWidth={r.sw} strokeLinecap="round" />
                            <polygon points={`${lx + 22},${ry + 5} ${lx + 16},${ry + 2} ${lx + 16},${ry + 8}`}
                              fill={r.color} />
                            <text x={lx + 26} y={ry + 9} fontSize={8.5} fill={C.text}>{r.label}</text>
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
