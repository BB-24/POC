import { useState, useRef } from "react";

const COLORS = { TCP: "#4a9eff", UDP: "#f59e0b", ICMP: "#ef4444" };
const MAX_LANES = 20;
const VIEW_W = 900, VIEW_H = 480;
const PAD = { top: 32, right: 158, bottom: 62, left: 82 };
const CW = VIEW_W - PAD.left - PAD.right;  // 660
const CH = VIEW_H - PAD.top - PAD.bottom;  // 386

function fmtBytes(n) {
  if (!n) return "0 B";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " GB";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + " MB";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " KB";
  return n + " B";
}

function strokeW(thickness) {
  // thickness from worker is 1-12 (log scale of bytes)
  return Math.max(1, Math.min(7, thickness * 0.6));
}

function arrowLen(thickness) {
  return 5 + Math.min(4, thickness * 0.3);
}

function tickInterval(spanMs) {
  if (spanMs <= 30 * 60000)   return 5 * 60000;
  if (spanMs <= 2 * 3600000)  return 10 * 60000;
  if (spanMs <= 12 * 3600000) return 30 * 60000;
  if (spanMs <= 48 * 3600000) return 3600000;
  return 6 * 3600000;
}

function fmtTime(ts) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TrafficFlowMap({ flows, lanes, targetIP }) {
  const svgRef = useRef(null);
  const [tip, setTip] = useState(null);

  if (!flows || flows.length === 0) {
    return (
      <div className="empty-chart">
        Select a target IP and upload a CSV to visualize network traffic flows.
      </div>
    );
  }

  // Cap lanes and filter flows accordingly
  const visLanes = lanes.slice(0, MAX_LANES);

  // Parse timestamps
  const parsed = flows
    .map((f) => ({ f, ts: new Date(f[1]).valueOf() }))
    .filter(({ ts, f }) => !isNaN(ts) && f[2] < visLanes.length);

  if (!parsed.length) {
    return <div className="empty-chart">No valid flow data to display.</div>;
  }

  const times = parsed.map((p) => p.ts);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const tSpan = Math.max(tMax - tMin, 60000); // at least 1 min range
  const tPad = tSpan * 0.06;

  const yOf = (ts) => PAD.top + ((ts - tMin + tPad * 0.5) / (tSpan + tPad)) * CH;

  const colW = CW / Math.max(visLanes.length - 1, 1);
  const xOf = (i) => PAD.left + i * colW;

  // Time ticks
  const stepMs = tickInterval(tSpan);
  const firstTick = Math.ceil((tMin - tPad * 0.5) / stepMs) * stepMs;
  const ticks = [];
  for (let t = firstTick; t <= tMax + tPad; t += stepMs) {
    ticks.push(t);
  }

  // Abbreviate IP for axis label
  const abbrevIP = (ip) => {
    if (visLanes.length <= 8) return ip;
    const parts = ip.split(".");
    return parts.slice(0, 2).join(".") + ".…";
  };

  return (
    <div className="chart-body" style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ width: "100%", height: "100%", display: "block" }}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setTip(null)}
      >
        {/* ── Background ── */}
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#111c33" />

        {/* ── Y grid lines (time) ── */}
        {ticks.map((t) => (
          <line
            key={t}
            x1={PAD.left} x2={PAD.left + CW}
            y1={yOf(t)} y2={yOf(t)}
            stroke="#1f2e48" strokeWidth={0.5}
          />
        ))}

        {/* ── X grid lines (IP columns) ── */}
        {visLanes.map((_, i) => (
          <line
            key={i}
            x1={xOf(i)} x2={xOf(i)}
            y1={PAD.top} y2={PAD.top + CH}
            stroke="#1f2e48" strokeWidth={0.5} strokeDasharray="3,4"
          />
        ))}

        {/* ── Y-axis labels ── */}
        {ticks.map((t, i) => {
          const y = yOf(t);
          const showDate = i === 0 || fmtDate(t) !== fmtDate(ticks[i - 1] || t);
          return (
            <g key={t}>
              {showDate && (
                <text x={PAD.left - 4} y={y - 10} textAnchor="end" fontSize={8} fill="#5a6a8a">
                  {fmtDate(t)}
                </text>
              )}
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#c8d3ea">
                {fmtTime(t)}
              </text>
            </g>
          );
        })}

        {/* ── Y-axis "Time" label ── */}
        <text
          transform={`translate(14,${PAD.top + CH / 2}) rotate(-90)`}
          textAnchor="middle" fontSize={10} fill="#5a6a8a"
        >
          Time
        </text>

        {/* ── X-axis IP labels ── */}
        {visLanes.map((ip, i) => (
          <g key={ip}>
            <text
              x={xOf(i)} y={PAD.top + CH + 16}
              textAnchor="middle" fontSize={9}
              fill={i === 0 ? "#93c5fd" : "#c8d3ea"}
              fontWeight={i === 0 ? "700" : "400"}
            >
              {i === 0 ? "Target" : abbrevIP(ip)}
            </text>
            {i === 0 && (
              <text x={xOf(i)} y={PAD.top + CH + 27} textAnchor="middle" fontSize={7.5} fill="#5a6a8a">
                ({ip})
              </text>
            )}
          </g>
        ))}

        {/* ── X-axis "IP Addresses" label ── */}
        <text
          x={PAD.left + CW / 2} y={VIEW_H - 4}
          textAnchor="middle" fontSize={10} fill="#5a6a8a"
        >
          IP Addresses
        </text>

        {/* ── Flows ── */}
        {parsed.map(({ f, ts }, idx) => {
          const destIdx = f[2];
          const thickness = f[4];
          const protocol = f[5];
          const src = f[8];
          const dst = f[9];
          const bytes = f[6];
          const duration = f[7];
          const remote = f[10];

          const color = COLORS[protocol] || "#38bdf8";
          const sw = strokeW(thickness);
          const al = arrowLen(thickness);
          const isOutbound = src === targetIP;

          const y = yOf(ts);
          const x0 = xOf(0);         // target column
          const xD = xOf(destIdx);   // remote column

          // Arrow: line + polygon at tip
          const tipX = isOutbound ? xD : x0;
          const dir = isOutbound ? 1 : -1;
          const lineX1 = isOutbound ? x0 : xD;
          const lineX2 = isOutbound ? xD - dir * al : x0 - dir * al;
          const arrowPts = `${tipX},${y} ${tipX - dir * al},${y - sw * 0.9} ${tipX - dir * al},${y + sw * 0.9}`;

          const isHov = tip?.idx === idx;

          return (
            <g
              key={idx}
              onMouseMove={(e) => {
                const rect = svgRef.current?.getBoundingClientRect();
                const scaleX = VIEW_W / (rect?.width || VIEW_W);
                const scaleY = VIEW_H / (rect?.height || VIEW_H);
                setTip({
                  idx,
                  svgX: (e.clientX - (rect?.left || 0)) * scaleX,
                  svgY: (e.clientY - (rect?.top || 0)) * scaleY,
                  src, dst, protocol, bytes, duration, remote, isOutbound,
                });
              }}
              onMouseLeave={() => setTip(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Fat invisible hit target */}
              <line x1={x0} x2={xD} y1={y} y2={y} stroke="transparent" strokeWidth={12} />
              {/* Visible line */}
              <line
                x1={lineX1} x2={lineX2} y1={y} y2={y}
                stroke={color}
                strokeWidth={isHov ? sw + 1.5 : sw}
                strokeOpacity={isHov ? 1 : 0.8}
                strokeLinecap="round"
              />
              {/* Arrowhead */}
              <polygon points={arrowPts} fill={color} fillOpacity={isHov ? 1 : 0.8} />
            </g>
          );
        })}

        {/* ── Tooltip ── */}
        {tip && (() => {
          const tw = 230, th = 32;
          const tx = Math.min(tip.svgX + 10, VIEW_W - PAD.right - 10);
          const ty = Math.max(tip.svgY - th - 4, PAD.top);
          const label = `Flow: ${tip.src} <-> ${tip.dst} | ${tip.protocol} | ${fmtBytes(tip.bytes)}`;
          return (
            <g>
              <rect x={tx} y={ty} width={tw} height={th} rx={5}
                fill="#1e2c47" stroke="#2a3550" strokeWidth={1} />
              <text x={tx + 8} y={ty + 20} fontSize={9.5} fill="#c8d3ea">{label}</text>
            </g>
          );
        })()}

        {/* ── Legend ── */}
        {(() => {
          const lx = PAD.left + CW + 18;
          const ly = PAD.top;
          const rows = [
            { type: "header", label: "Protocol:" },
            { type: "arrow",  label: "TCP",   color: "#4a9eff", sw: 2 },
            { type: "arrow",  label: "UDP",   color: "#f59e0b", sw: 2 },
            { type: "arrow",  label: "ICMP",  color: "#ef4444", sw: 2 },
            { type: "gap" },
            { type: "header", label: "Traffic Volume (Bytes):" },
            { type: "arrow",  label: "< 1KB",  color: "#c8d3ea", sw: 1.2 },
            { type: "arrow",  label: "10KB",   color: "#c8d3ea", sw: 2 },
            { type: "arrow",  label: "1MB",    color: "#c8d3ea", sw: 3.5 },
            { type: "arrow",  label: "100MB",  color: "#c8d3ea", sw: 6 },
          ];
          let y = ly;
          return (
            <g>
              {rows.map((r, i) => {
                const ry = y;
                y += r.type === "gap" ? 8 : r.type === "header" ? 16 : 14;
                if (r.type === "gap") return null;
                if (r.type === "header") {
                  return (
                    <text key={i} x={lx} y={ry + 10} fontSize={8} fill="#5a6a8a" fontWeight="600">
                      {r.label}
                    </text>
                  );
                }
                const lineLen = 22;
                const al2 = 5;
                return (
                  <g key={i}>
                    <line x1={lx} x2={lx + lineLen - al2} y1={ry + 5} y2={ry + 5}
                      stroke={r.color} strokeWidth={r.sw} strokeLinecap="round" />
                    <polygon
                      points={`${lx + lineLen},${ry + 5} ${lx + lineLen - al2},${ry + 5 - 3} ${lx + lineLen - al2},${ry + 5 + 3}`}
                      fill={r.color}
                    />
                    <text x={lx + lineLen + 5} y={ry + 9} fontSize={9} fill="#c8d3ea">{r.label}</text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
