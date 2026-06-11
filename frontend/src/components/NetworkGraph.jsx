import React, { useMemo, useState, useRef, useCallback } from 'react';

const PROTOCOL_COLORS = {
  TCP: '#4a9eff',
  UDP: '#f59e0b',
  ICMP: '#ef4444',
};

const DEFAULT_EDGE_COLOR = '#4a9eff';
const MAX_OUTER_NODES = 20;

function NetworkGraph({ flows = [], targetIP = '', lanes = [] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubberPos, setScrubberPos] = useState(0);
  const trackRef = useRef(null);
  const draggingRef = useRef(false);

  // Derive time range
  const { startTime, endTime } = useMemo(() => {
    if (!flows || flows.length === 0) return { startTime: '', endTime: '' };
    const times = flows
      .map((f) => (Array.isArray(f) ? f[1] : f.Time))
      .filter(Boolean)
      .sort();
    return { startTime: times[0] || '', endTime: times[times.length - 1] || '' };
  }, [flows]);

  // Gather unique remote IPs and per-edge stats
  const { remoteIPs, edgeMap } = useMemo(() => {
    if (!flows || flows.length === 0) return { remoteIPs: [], edgeMap: {} };

    const map = {};
    flows.forEach((f) => {
      let remote = '';
      let bytes = 0;
      let protocol = 'TCP';

      if (Array.isArray(f)) {
        remote = f[10];
        bytes = Number(f[6]) || 0;
        protocol = f[5] || 'TCP';
      } else {
        remote = f.remote || (f['Source IP'] === targetIP ? f['Destination IP'] : f['Source IP']);
        bytes = (Number(f['Bytes Sent']) || 0) + (Number(f['Bytes Received']) || 0);
        protocol = f.Protocol || 'TCP';
      }

      if (!remote || remote === targetIP) return;
      if (!map[remote]) {
        map[remote] = { bytes: 0, protocol, count: 0 };
      }
      map[remote].bytes += bytes;
      map[remote].count += 1;
      map[remote].protocol = protocol;
    });

    const ips = Object.keys(map).slice(0, MAX_OUTER_NODES);
    return { remoteIPs: ips, edgeMap: map };
  }, [flows, targetIP]);

  // SVG dimensions
  const width = 700;
  const height = 420;
  const cx = width / 2;
  const cy = height / 2 - 10;
  const radiusX = 240;
  const radiusY = 160;
  const centralRadius = 30;
  const nodeRadius = 4;

  // Compute positions for outer nodes
  const outerNodes = useMemo(() => {
    return remoteIPs.map((ip, i) => {
      const angle = (2 * Math.PI * i) / remoteIPs.length - Math.PI / 2;
      const x = cx + radiusX * Math.cos(angle);
      const y = cy + radiusY * Math.sin(angle);

      // Label positioning
      const labelDist = 14;
      const lx = cx + (radiusX + labelDist) * Math.cos(angle);
      const ly = cy + (radiusY + labelDist) * Math.sin(angle);
      const anchor = Math.cos(angle) >= 0 ? 'start' : 'end';
      const alignmentBaseline = Math.sin(angle) > 0.3 ? 'hanging' : Math.sin(angle) < -0.3 ? 'baseline' : 'middle';

      return { ip, x, y, lx, ly, anchor, alignmentBaseline, angle };
    });
  }, [remoteIPs, cx, cy, radiusX, radiusY]);

  // Compute edge widths and opacities
  const maxBytes = useMemo(() => {
    const vals = Object.values(edgeMap).map((e) => e.bytes);
    return vals.length > 0 ? Math.max(...vals, 1) : 1;
  }, [edgeMap]);

  const getEdgeStyle = useCallback(
    (ip) => {
      const edge = edgeMap[ip];
      if (!edge) return { color: DEFAULT_EDGE_COLOR, width: 1, opacity: 0.3 };
      const color = PROTOCOL_COLORS[edge.protocol] || DEFAULT_EDGE_COLOR;
      const logMax = Math.log(maxBytes + 1);
      const logVal = Math.log(edge.bytes + 1);
      const width = 1 + 2 * (logVal / logMax);
      const opacity = 0.25 + 0.55 * (logVal / logMax);
      return { color, width, opacity };
    },
    [edgeMap, maxBytes]
  );

  // Playback bar interaction
  const handleTrackInteraction = useCallback((e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubberPos(x);
  }, []);

  const handleMouseDown = useCallback(
    (e) => {
      draggingRef.current = true;
      handleTrackInteraction(e);
    },
    [handleTrackInteraction]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (draggingRef.current) handleTrackInteraction(e);
    },
    [handleTrackInteraction]
  );

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  // Format time label
  const formatTime = (t) => {
    if (!t) return '--:--';
    try {
      const d = new Date(t);
      if (isNaN(d.getTime())) return String(t).slice(0, 8);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return String(t).slice(0, 8);
    }
  };

  // Empty state
  if (!flows || flows.length === 0 || remoteIPs.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          background: '#0d1528',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 260,
          color: '#4a5f82',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: 14,
          letterSpacing: 0.3,
        }}
      >
        No network data available
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        background: '#0d1528',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* SVG Graph */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Central node glow */}
          <radialGradient id="centralGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4a9eff" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#1a3a6e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0d1528" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="centralFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#244e8a" />
            <stop offset="100%" stopColor="#1a3a6e" />
          </radialGradient>
          {/* Subtle outer glow filter */}
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="#0d1528" />

        {/* Faint orbit ring */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={radiusX}
          ry={radiusY}
          fill="none"
          stroke="#1a2540"
          strokeWidth={0.7}
          strokeDasharray="3 6"
        />

        {/* Edges */}
        {outerNodes.map((node) => {
          const style = getEdgeStyle(node.ip);
          return (
            <line
              key={`edge-${node.ip}`}
              x1={cx}
              y1={cy}
              x2={node.x}
              y2={node.y}
              stroke={style.color}
              strokeWidth={style.width}
              strokeOpacity={style.opacity}
              strokeLinecap="round"
            />
          );
        })}

        {/* Central glow halo */}
        <circle cx={cx} cy={cy} r={55} fill="url(#centralGlow)" />

        {/* Central node */}
        <circle
          cx={cx}
          cy={cy}
          r={centralRadius}
          fill="url(#centralFill)"
          stroke="#3b6cb8"
          strokeWidth={1.5}
          filter="url(#glowFilter)"
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={11}
          fontWeight="bold"
          fontFamily="'Inter', 'Segoe UI', monospace"
          style={{ pointerEvents: 'none' }}
        >
          {targetIP}
        </text>

        {/* Outer nodes and labels */}
        {outerNodes.map((node) => {
          const style = getEdgeStyle(node.ip);
          return (
            <g key={`node-${node.ip}`}>
              {/* Node dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius}
                fill={style.color}
                stroke="#0d1528"
                strokeWidth={1}
              />
              {/* Small connecting dot for label */}
              <circle cx={node.lx} cy={node.ly} r={1} fill="#3a506e" />
              {/* IP label */}
              <text
                x={node.lx + (node.anchor === 'start' ? 5 : -5)}
                y={node.ly}
                textAnchor={node.anchor}
                dominantBaseline={node.alignmentBaseline}
                fill="#8899b4"
                fontSize={8.5}
                fontFamily="'Inter', 'Segoe UI', monospace"
                style={{ pointerEvents: 'none' }}
              >
                {node.ip}
              </text>
            </g>
          );
        })}

        {/* Protocol Legend */}
        {[
          { label: 'TCP', color: PROTOCOL_COLORS.TCP },
          { label: 'UDP', color: PROTOCOL_COLORS.UDP },
          { label: 'ICMP', color: PROTOCOL_COLORS.ICMP },
        ].map((item, i) => (
          <g key={`legend-${item.label}`} transform={`translate(${width - 90}, ${14 + i * 16})`}>
            <line x1={0} y1={4} x2={14} y2={4} stroke={item.color} strokeWidth={2} />
            <text x={19} y={7} fill="#6b7fa3" fontSize={9} fontFamily="'Inter', sans-serif">
              {item.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Playback Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 30,
          padding: '0 14px',
          background: '#0b1220',
          borderTop: '1px solid #131f33',
          gap: 10,
          userSelect: 'none',
        }}
      >
        {/* Play / Pause Button */}
        <button
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            flexShrink: 0,
          }}
        >
          {isPlaying ? (
            <svg width={12} height={14} viewBox="0 0 12 14">
              <rect x={1} y={1} width={3.5} height={12} rx={1} fill="#4a6a8f" />
              <rect x={7.5} y={1} width={3.5} height={12} rx={1} fill="#4a6a8f" />
            </svg>
          ) : (
            <svg width={12} height={14} viewBox="0 0 12 14">
              <polygon points="1,1 11,7 1,13" fill="#4a6a8f" />
            </svg>
          )}
        </button>

        {/* Start Time */}
        <span
          style={{
            fontSize: 9,
            color: '#4a5f82',
            fontFamily: "monospace, 'Segoe UI'",
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {formatTime(startTime)}
        </span>

        {/* Scrubber Track */}
        <div
          ref={trackRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            flex: 1,
            height: 14,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          {/* Track line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              height: 3,
              borderRadius: 2,
              background: '#1e2e4a',
              transform: 'translateY(-50%)',
            }}
          />
          {/* Filled portion */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              height: 3,
              borderRadius: 2,
              background: '#2a4a7a',
              transform: 'translateY(-50%)',
              width: `${scrubberPos * 100}%`,
            }}
          />
          {/* Handle */}
          <div
            style={{
              position: 'absolute',
              left: `${scrubberPos * 100}%`,
              top: '50%',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#3b82f6',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 4px rgba(59,130,246,0.5)',
            }}
          />
        </div>

        {/* End Time */}
        <span
          style={{
            fontSize: 9,
            color: '#4a5f82',
            fontFamily: "monospace, 'Segoe UI'",
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {formatTime(endTime)}
        </span>
      </div>
    </div>
  );
}

export default NetworkGraph;
