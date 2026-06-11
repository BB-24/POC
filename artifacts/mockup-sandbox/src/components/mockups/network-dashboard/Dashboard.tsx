import { useState, useEffect, useRef } from "react";
import {
  Shield, Search, RefreshCw, Bell, ChevronDown, ChevronRight,
  Activity, Server, Wifi, Zap, TrendingUp, TrendingDown,
  AlertTriangle, Globe, Filter, Download, Layers,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Eye,
  CheckCircle, XCircle, Clock, Database
} from "lucide-react";

const TCP_COLOR = "#3B82F6";
const UDP_COLOR = "#F59E0B";
const ICMP_COLOR = "#8B5CF6";
const SUCCESS_COLOR = "#10B981";
const WARNING_COLOR = "#FBBF24";
const CRITICAL_COLOR = "#EF4444";

// ─── Mock data ───────────────────────────────────────────────────────────────

const TIMELINE_DATA = (() => {
  const now = Date.now();
  const pts = 24;
  return Array.from({ length: pts }, (_, i) => {
    const t = new Date(now - (pts - 1 - i) * 3600000);
    const label = t.getHours().toString().padStart(2, "0") + ":00";
    return {
      label,
      tcp: Math.round(120 + Math.sin(i * 0.6) * 60 + Math.random() * 30),
      udp: Math.round(55 + Math.cos(i * 0.4) * 25 + Math.random() * 15),
      icmp: Math.round(18 + Math.sin(i * 0.9 + 1) * 8 + Math.random() * 6),
    };
  });
})();

const TOP_TALKERS = [
  { ip: "203.0.113.8", bytes: 42_800_000_000, pct: 43, trend: +12, flag: "🇺🇸", alert: true },
  { ip: "198.51.100.42", bytes: 22_100_000_000, pct: 22, trend: -5, flag: "🇩🇪", alert: false },
  { ip: "10.0.0.14", bytes: 11_700_000_000, pct: 12, trend: +3, flag: "🏠", alert: false },
  { ip: "192.0.2.17", bytes: 9_300_000_000, pct: 9, trend: +8, flag: "🇯🇵", alert: true },
  { ip: "172.16.0.1", bytes: 7_100_000_000, pct: 7, trend: -2, flag: "🏠", alert: false },
];

const ALERTS = [
  { id: 1, level: "critical", msg: "Port scan detected from 203.0.113.8", ts: "2m ago", seen: false },
  { id: 2, level: "warning", msg: "Traffic spike: 203.0.113.8 ↑ 12%", ts: "8m ago", seen: false },
  { id: 3, level: "warning", msg: "Anomalous ICMP from 192.0.2.17", ts: "31m ago", seen: true },
  { id: 4, level: "info", msg: "New host discovered: 10.0.0.51", ts: "1h ago", seen: true },
];

const SANKEY_NODES = [
  { id: "ext1", label: "203.0.113.8", x: 40, y: 80, type: "external", alert: true },
  { id: "ext2", label: "198.51.100.42", x: 40, y: 210, type: "external", alert: false },
  { id: "ext3", label: "192.0.2.17", x: 40, y: 330, type: "external", alert: true },
  { id: "ext4", label: "Other (170+)", x: 40, y: 440, type: "external", alert: false },
  { id: "gw", label: "Gateway", x: 260, y: 255, type: "gateway" },
  { id: "srv1", label: "10.0.0.14", x: 460, y: 130, type: "internal" },
  { id: "srv2", label: "172.16.0.1", x: 460, y: 255, type: "internal" },
  { id: "srv3", label: "10.0.0.51", x: 460, y: 380, type: "internal" },
];

const SANKEY_LINKS = [
  { from: "ext1", to: "gw", volume: 4, color: CRITICAL_COLOR },
  { from: "ext2", to: "gw", volume: 2.2, color: TCP_COLOR },
  { from: "ext3", to: "gw", volume: 0.9, color: WARNING_COLOR },
  { from: "ext4", to: "gw", volume: 0.7, color: "#6B7280" },
  { from: "gw", to: "srv1", volume: 3.5, color: TCP_COLOR },
  { from: "gw", to: "srv2", volume: 2.8, color: UDP_COLOR },
  { from: "gw", to: "srv3", volume: 1.5, color: ICMP_COLOR },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + " TB";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " MB";
  return (n / 1e3).toFixed(0) + " KB";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 64, h = 24;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 4) - 2,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-80">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KPICard({
  icon: Icon, label, value, sub, trend, sparkData, color, alert,
}: {
  icon: any; label: string; value: string; sub: string; trend: number;
  sparkData: number[]; color: string; alert?: boolean;
}) {
  const up = trend > 0;
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 border relative overflow-hidden"
      style={{ background: "#111827", borderColor: alert ? CRITICAL_COLOR + "55" : "#1F2937" }}
    >
      {alert && (
        <span className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ background: CRITICAL_COLOR }} />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "22" }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>{label}</span>
        </div>
        <Sparkline data={sparkData} color={color} />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight" style={{ color: "#F9FAFB", fontFamily: "'Inter', sans-serif" }}>
          {value}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-xs" style={{ color: "#6B7280" }}>{sub}</span>
          <span
            className="text-xs flex items-center gap-0.5 font-medium"
            style={{ color: up ? SUCCESS_COLOR : CRITICAL_COLOR }}
          >
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function TimelineChart() {
  const [hover, setHover] = useState<number | null>(null);
  const w = 100, h = 120, pad = { t: 10, r: 4, b: 28, l: 4 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;

  const maxVal = Math.max(...TIMELINE_DATA.map(d => d.tcp + d.udp + d.icmp)) * 1.15;
  const layers = [
    { key: "icmp" as const, color: ICMP_COLOR, label: "ICMP" },
    { key: "udp" as const, color: UDP_COLOR, label: "UDP" },
    { key: "tcp" as const, color: TCP_COLOR, label: "TCP" },
  ];

  const pts = TIMELINE_DATA.map((d, i) => ({
    ...d,
    x: pad.l + (i / (TIMELINE_DATA.length - 1)) * iw,
    yTcp: pad.t + ih - (d.tcp / maxVal) * ih,
    yUdpTop: pad.t + ih - ((d.tcp + d.udp) / maxVal) * ih,
    yIcmpTop: pad.t + ih - ((d.tcp + d.udp + d.icmp) / maxVal) * ih,
    yBase: pad.t + ih,
  }));

  function areaPath(topKey: "yIcmpTop" | "yUdpTop" | "yTcp", baseKey: "yIcmpTop" | "yUdpTop" | "yBase") {
    const top = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${(p as any)[topKey].toFixed(2)}`).join(" ");
    const bot = [...pts].reverse().map((p, i) => `${i === 0 ? "L" : "L"}${p.x.toFixed(2)},${(p as any)[baseKey].toFixed(2)}`).join(" ");
    return top + " " + bot + " Z";
  }

  const ticks = [0, 6, 12, 18, 23].map(i => ({ i, label: TIMELINE_DATA[i]?.label }));

  return (
    <div className="relative select-none" style={{ fontFamily: "'Inter', sans-serif" }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: 180 }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {layers.map(l => (
            <linearGradient key={l.key} id={`grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={l.color} stopOpacity="0.05" />
            </linearGradient>
          ))}
        </defs>

        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f}
            x1={pad.l} x2={w - pad.r}
            y1={pad.t + ih * (1 - f)} y2={pad.t + ih * (1 - f)}
            stroke="#1F2937" strokeWidth="0.5"
          />
        ))}

        <path d={areaPath("yTcp", "yBase")} fill={`url(#grad-tcp)`} />
        <path d={areaPath("yUdpTop", "yTcp")} fill={`url(#grad-udp)`} />
        <path d={areaPath("yIcmpTop", "yUdpTop")} fill={`url(#grad-icmp)`} />

        {layers.map(l => {
          const topKey = l.key === "tcp" ? "yTcp" : l.key === "udp" ? "yUdpTop" : "yIcmpTop";
          const linePts = pts.map((p, i) =>
            `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${(p as any)[topKey].toFixed(2)}`
          ).join(" ");
          return <path key={l.key} d={linePts} fill="none" stroke={l.color} strokeWidth="0.8" strokeLinecap="round" />;
        })}

        {pts.map((p, i) => (
          <rect
            key={i}
            x={p.x - (iw / TIMELINE_DATA.length) / 2}
            y={pad.t}
            width={iw / TIMELINE_DATA.length}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {hover !== null && (
          <line
            x1={pts[hover].x} x2={pts[hover].x}
            y1={pad.t} y2={pad.t + ih}
            stroke="#475569" strokeWidth="0.8" strokeDasharray="2,2"
          />
        )}

        {ticks.map(({ i, label }) => (
          <text key={i} x={pts[i].x} y={h - 4} textAnchor="middle" fontSize="3.5" fill="#6B7280">{label}</text>
        ))}
      </svg>

      {hover !== null && (() => {
        const d = TIMELINE_DATA[hover];
        return (
          <div
            className="absolute pointer-events-none rounded-lg px-3 py-2 text-xs shadow-xl z-10 border"
            style={{
              top: 8, left: `clamp(8px, ${(hover / (TIMELINE_DATA.length - 1)) * 90}%, 72%)`,
              background: "#1E293B", borderColor: "#334155", color: "#E2E8F0",
              minWidth: 120,
            }}
          >
            <div className="font-semibold mb-1" style={{ color: "#94A3B8" }}>{d.label}</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: TCP_COLOR }} />TCP <span className="ml-auto font-mono">{d.tcp} Mbps</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: UDP_COLOR }} />UDP <span className="ml-auto font-mono">{d.udp} Mbps</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: ICMP_COLOR }} />ICMP <span className="ml-auto font-mono">{d.icmp} Mbps</span></div>
          </div>
        );
      })()}
    </div>
  );
}

function ProtocolDonut() {
  const data = [
    { label: "TCP", value: 67, color: TCP_COLOR },
    { label: "UDP", value: 24, color: UDP_COLOR },
    { label: "ICMP", value: 9, color: ICMP_COLOR },
  ];
  const r = 36, cx = 50, cy = 50, strokeW = 10;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1F2937" strokeWidth={strokeW} />
        {data.map(d => {
          const dash = (d.value / 100) * circ;
          const offset = circ - cumulative * circ / 100;
          cumulative += d.value;
          return (
            <circle key={d.label} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={strokeW}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
            />
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#F9FAFB">67%</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="5" fill="#6B7280">TCP</text>
      </svg>
      <div className="flex flex-col gap-2 flex-1">
        {data.map(d => (
          <div key={d.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: d.color }} />
                <span style={{ color: "#9CA3AF" }}>{d.label}</span>
              </span>
              <span className="font-mono font-medium" style={{ color: "#E2E8F0" }}>{d.value}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: "#1F2937" }}>
              <div className="h-1 rounded-full transition-all" style={{ width: `${d.value}%`, background: d.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SankeyDiagram() {
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const nodeMap = Object.fromEntries(SANKEY_NODES.map(n => [n.id, n]));

  function getNodePos(id: string) {
    const n = nodeMap[id];
    return { x: n.x + 30, y: n.y + 12 };
  }

  return (
    <svg viewBox="0 0 560 520" className="w-full" style={{ height: 200 }}>
      {SANKEY_LINKS.map((l, i) => {
        const from = getNodePos(l.from);
        const to = getNodePos(l.to);
        const mx = (from.x + to.x) / 2;
        const path = `M${from.x},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`;
        const w = Math.max(2, l.volume * 2.5);
        return (
          <path key={i} d={path} fill="none"
            stroke={l.color} strokeWidth={w}
            strokeOpacity={hoveredLink === i ? 0.9 : 0.35}
            onMouseEnter={() => setHoveredLink(i)}
            onMouseLeave={() => setHoveredLink(null)}
            style={{ cursor: "pointer", transition: "stroke-opacity 0.15s" }}
          />
        );
      })}

      {SANKEY_NODES.map(n => {
        const isGw = n.type === "gateway";
        const isExt = n.type === "external";
        const fill = n.alert ? CRITICAL_COLOR + "33" : isGw ? "#1E40AF33" : "#0F172A";
        const stroke = n.alert ? CRITICAL_COLOR : isGw ? TCP_COLOR : "#334155";
        return (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={60} height={24} rx={6}
              fill={fill} stroke={stroke} strokeWidth={isGw ? 1.5 : 1}
            />
            {n.alert && (
              <circle cx={n.x + 56} cy={n.y + 4} r={3} fill={CRITICAL_COLOR} />
            )}
            <text x={n.x + 30} y={n.y + 15} textAnchor="middle" fontSize="5.5"
              fill={n.alert ? CRITICAL_COLOR : isGw ? "#93C5FD" : "#CBD5E1"}
              fontWeight={isGw ? "700" : "500"}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AlertItem({ a }: { a: typeof ALERTS[0] }) {
  const colors = { critical: CRITICAL_COLOR, warning: WARNING_COLOR, info: "#60A5FA" };
  const icons = { critical: XCircle, warning: AlertTriangle, info: CheckCircle };
  const Icon = icons[a.level as keyof typeof icons];
  return (
    <div className="flex items-start gap-3 py-2.5 border-b" style={{ borderColor: "#1F2937" }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: colors[a.level as keyof typeof colors] }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug" style={{ color: a.seen ? "#6B7280" : "#E2E8F0" }}>{a.msg}</p>
        <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>{a.ts}</p>
      </div>
      {!a.seen && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: colors[a.level as keyof typeof colors] }} />}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProtocols, setSelectedProtocols] = useState({ TCP: true, UDP: true, ICMP: true });
  const [selectedIP, setSelectedIP] = useState("All IPs");
  const [timeRange, setTimeRange] = useState("24h");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const tcmSpark = TIMELINE_DATA.slice(-8).map(d => d.tcp);
  const udpSpark = TIMELINE_DATA.slice(-8).map(d => d.udp);
  const icmpSpark = TIMELINE_DATA.slice(-8).map(d => d.icmp);
  const totalSpark = TIMELINE_DATA.slice(-8).map(d => d.tcp + d.udp + d.icmp);

  const kpis = [
    { icon: Activity, label: "Total Traffic", value: "99.2 GB", sub: "vs last 24h", trend: 7, sparkData: totalSpark, color: TCP_COLOR },
    { icon: Server, label: "Active Hosts", value: "175", sub: "unique IPs", trend: 3, sparkData: tcmSpark, color: SUCCESS_COLOR },
    { icon: Wifi, label: "Connections", value: "25,650", sub: "log entries", trend: -2, sparkData: udpSpark, color: UDP_COLOR },
    { icon: Zap, label: "Peak Throughput", value: "248 Mbps", sub: "last hour", trend: 12, sparkData: icmpSpark, color: ICMP_COLOR, alert: true },
    { icon: Eye, label: "Top Talker", value: "203.0.113.8", sub: "43% of traffic", trend: 12, sparkData: tcmSpark, color: CRITICAL_COLOR, alert: true },
    { icon: Shield, label: "Threat Score", value: "72 / 100", sub: "2 active alerts", trend: 8, sparkData: totalSpark.map(v => v * 0.3), color: WARNING_COLOR, alert: true },
  ];

  return (
    <div
      className="flex flex-col min-h-screen text-sm select-none"
      style={{ background: "#0B1220", color: "#E2E8F0", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-4 px-5 py-3 border-b flex-shrink-0"
        style={{ background: "#0F172A", borderColor: "#1F2937" }}
      >
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1E3A8A" }}>
            <Shield className="w-4 h-4" style={{ color: "#93C5FD" }} />
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: "#F1F5F9" }}>Network Traffic Intelligence</span>
        </div>

        <div className="flex-1 relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#6B7280" }} />
          <input
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none border"
            style={{ background: "#1E293B", borderColor: "#334155", color: "#CBD5E1" }}
            placeholder="Search IP, hostname, subnet…"
            readOnly
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {["1h", "6h", "24h", "7d"].map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                background: timeRange === r ? "#1E3A8A" : "transparent",
                color: timeRange === r ? "#93C5FD" : "#6B7280",
                border: `1px solid ${timeRange === r ? "#2563EB55" : "transparent"}`,
              }}
            >
              {r}
            </button>
          ))}
          <div className="w-px h-4 mx-1" style={{ background: "#1F2937" }} />
          <button className="w-7 h-7 rounded-lg flex items-center justify-center border relative" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <Bell className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: CRITICAL_COLOR }} />
          </button>
          <button className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <RefreshCw className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
          </button>
          <span className="text-xs ml-1" style={{ color: "#4B5563" }}>
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Sidebar ──────────────────────────────────────────── */}
        <aside
          className="flex-shrink-0 flex flex-col border-r overflow-y-auto"
          style={{
            width: sidebarOpen ? 220 : 44,
            background: "#0F172A",
            borderColor: "#1F2937",
            transition: "width 0.2s ease",
          }}
        >
          <button
            className="flex items-center justify-end px-3 py-2.5 border-b"
            style={{ borderColor: "#1F2937" }}
            onClick={() => setSidebarOpen(v => !v)}
          >
            <Layers className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
          </button>

          {sidebarOpen && (
            <div className="p-3 flex flex-col gap-5 flex-1">
              {/* Target IP */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Target IP</div>
                <div className="relative">
                  <select
                    className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-lg text-xs border outline-none"
                    style={{ background: "#1E293B", borderColor: "#334155", color: "#CBD5E1" }}
                    value={selectedIP}
                    onChange={e => setSelectedIP(e.target.value)}
                  >
                    {["All IPs", ...TOP_TALKERS.map(t => t.ip)].map(ip => (
                      <option key={ip} value={ip}>{ip}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#6B7280" }} />
                </div>
              </div>

              {/* Protocols */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Protocols</div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { key: "TCP", color: TCP_COLOR },
                    { key: "UDP", color: UDP_COLOR },
                    { key: "ICMP", color: ICMP_COLOR },
                  ].map(({ key, color }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all border"
                        style={{
                          background: selectedProtocols[key as keyof typeof selectedProtocols] ? color + "33" : "transparent",
                          borderColor: selectedProtocols[key as keyof typeof selectedProtocols] ? color : "#374151",
                        }}
                        onClick={() => setSelectedProtocols(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                      >
                        {selectedProtocols[key as keyof typeof selectedProtocols] && (
                          <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>{key}</span>
                      <span className="ml-auto text-xs font-mono" style={{ color }}>
                        {key === "TCP" ? "67%" : key === "UDP" ? "24%" : "9%"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Volume filter */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Traffic Volume</div>
                <div className="flex flex-col gap-1">
                  {["< 10 KB", "10 KB – 1 MB", "> 100 MB"].map(v => (
                    <button key={v} className="text-left text-xs px-2 py-1 rounded-md transition-all"
                      style={{ color: "#6B7280", background: "transparent" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#1E293B")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved views */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#4B5563" }}>Saved Views</div>
                {["SOC Overview", "External Traffic", "Internal East-West"].map(v => (
                  <button key={v} className="flex items-center gap-1.5 w-full text-left text-xs py-1 px-1 rounded"
                    style={{ color: "#6B7280" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#CBD5E1")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#6B7280")}
                  >
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ─── Main content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* KPI Row */}
          <div className="grid grid-cols-6 gap-3">
            {kpis.map(k => <KPICard key={k.label} {...k} />)}
          </div>

          {/* Middle row: Timeline + Flow */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 380px" }}>
            {/* Timeline */}
            <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Traffic Timeline</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>Volume over time · Hover to inspect</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 text-xs">
                    {[["TCP", TCP_COLOR], ["UDP", UDP_COLOR], ["ICMP", ICMP_COLOR]].map(([l, c]) => (
                      <span key={l} className="flex items-center gap-1">
                        <span className="w-2.5 h-0.5 inline-block rounded" style={{ background: c }} />{l}
                      </span>
                    ))}
                  </div>
                  <button className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border"
                    style={{ borderColor: "#334155", color: "#6B7280", background: "#1E293B" }}>
                    <Download className="w-3 h-3" /> Export
                  </button>
                </div>
              </div>
              <TimelineChart />
            </div>

            {/* Flow / Sankey */}
            <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Traffic Flow</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>Source → Gateway → Internal</p>
                </div>
                <button className="p-1 rounded" style={{ color: "#6B7280" }}>
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <SankeyDiagram />
              <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#6B7280" }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: CRITICAL_COLOR }} />Suspicious</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: TCP_COLOR }} />Normal</span>
              </div>
            </div>
          </div>

          {/* Bottom row: Top Talkers + Protocol + Alerts */}
          <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 220px 260px" }}>
            {/* Top Talkers */}
            <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Top Talkers</h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#1E293B", color: "#6B7280" }}>Top 5</span>
              </div>
              <div className="flex flex-col gap-2">
                {TOP_TALKERS.map((t, i) => (
                  <div key={t.ip} className="flex items-center gap-3 group">
                    <span className="text-xs w-4 text-center font-mono" style={{ color: "#4B5563" }}>{i + 1}</span>
                    <span className="text-sm">{t.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="text-xs font-mono font-medium"
                          style={{ color: t.alert ? CRITICAL_COLOR : "#CBD5E1" }}
                        >
                          {t.ip}
                        </span>
                        {t.alert && <AlertTriangle className="w-3 h-3" style={{ color: CRITICAL_COLOR }} />}
                        <span className="ml-auto text-xs" style={{ color: "#6B7280" }}>{fmtBytes(t.bytes)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${t.pct}%`,
                            background: t.alert
                              ? `linear-gradient(90deg, ${CRITICAL_COLOR}, ${WARNING_COLOR})`
                              : TCP_COLOR,
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className="text-xs flex items-center gap-0.5 font-medium w-10 text-right"
                      style={{ color: t.trend > 0 ? CRITICAL_COLOR : SUCCESS_COLOR }}
                    >
                      {t.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(t.trend)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Protocol distribution */}
            <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: "#F1F5F9" }}>Protocol Mix</h2>
              <ProtocolDonut />
            </div>

            {/* Alerts */}
            <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Alerts</h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: CRITICAL_COLOR + "22", color: CRITICAL_COLOR }}
                >
                  2 new
                </span>
              </div>
              <div>
                {ALERTS.map(a => <AlertItem key={a.id} a={a} />)}
              </div>
              <button className="mt-2 text-xs w-full text-center py-1.5 rounded-lg border"
                style={{ borderColor: "#1F2937", color: "#6B7280", background: "#0F172A" }}>
                View all alerts
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ─── Status bar ───────────────────────────────────────────── */}
      <footer
        className="flex items-center gap-4 px-5 py-1.5 border-t text-xs flex-shrink-0"
        style={{ background: "#0F172A", borderColor: "#1F2937", color: "#4B5563" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: SUCCESS_COLOR }} />
          Live · 30s refresh
        </span>
        <span>25,650 logs indexed</span>
        <span>175 active hosts</span>
        <span className="ml-auto flex items-center gap-1">
          <Database className="w-3 h-3" />
          In-memory store
        </span>
      </footer>
    </div>
  );
}
