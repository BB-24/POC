import React from 'react';

// ---------------------------------------------------------------------------
// Helper – human-readable byte formatting
// ---------------------------------------------------------------------------
function fmtBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let idx = 0;
  let value = Number(bytes);
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx++;
  }
  return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

// ---------------------------------------------------------------------------
// Decorative sparkline SVGs (40×24)
// ---------------------------------------------------------------------------
const Sparkline = ({ color = '#34d399', path }) => (
  <svg
    width="40"
    height="24"
    viewBox="0 0 40 24"
    fill="none"
    style={{ position: 'absolute', top: 12, right: 14, opacity: 0.55 }}
  >
    <path
      d={path}
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const sparkPaths = {
  up:      'M2 20 L8 14 L14 16 L20 8 L26 10 L32 4 L38 2',
  upSoft:  'M2 18 L8 16 L14 14 L20 12 L26 10 L32 8 L38 6',
  down:    'M2 4 L8 8 L14 6 L20 12 L26 14 L32 18 L38 20',
  peak:    'M2 16 L8 12 L14 4 L20 8 L26 14 L32 10 L38 6',
  flat:    'M2 14 L8 12 L14 14 L20 10 L26 12 L32 10 L38 12',
  alert:   'M2 18 L8 14 L14 18 L20 6 L26 16 L32 10 L38 4',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = {
  row: {
    display: 'flex',
    gap: 10,
    padding: '12px 14px',
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    background: '#111c33',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#1e2e4a',
    borderRadius: 10,
    padding: '16px 18px',
    overflow: 'hidden',
    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
  },
  title: {
    fontSize: 11,
    fontWeight: 500,
    color: '#8899b4',
    letterSpacing: '0.3px',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 26,
    fontWeight: 700,
    color: '#e8ecf4',
    lineHeight: 1.15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    fontSize: 10,
    color: '#5a6a8a',
    marginTop: 4,
    whiteSpace: 'nowrap',
  },
  trendUp: { color: '#34d399' },
  trendDown: { color: '#f87171' },
};

// ---------------------------------------------------------------------------
// Single KPI card
// ---------------------------------------------------------------------------
function KPICard({ title, value, subtitle, sparkColor, sparkPath }) {
  const [hovered, setHovered] = React.useState(false);

  const cardStyle = {
    ...styles.card,
    ...(hovered
      ? { borderColor: '#2a3f66', boxShadow: '0 0 18px rgba(52,211,153,0.06)' }
      : {}),
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Sparkline color={sparkColor} path={sparkPath} />
      <div style={styles.title}>{title}</div>
      <div style={styles.value}>{value}</div>
      <div style={styles.subtitle}>{subtitle}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build subtitle JSX with colored trend arrows
// ---------------------------------------------------------------------------
function trendSub(text, direction = 'up') {
  // Split around the arrow character so we can colorize it
  const arrowMatch = text.match(/(.*?)(↗|↘)(.*)/);
  if (!arrowMatch) return <span>{text}</span>;

  const [, before, arrow, after] = arrowMatch;
  const trendStyle = direction === 'up' ? styles.trendUp : styles.trendDown;

  return (
    <span>
      {before}
      <span style={trendStyle}>
        {arrow}
        {after}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function KPICards({ summary = {} }) {
  // Compute peak throughput approximation
  const peakThroughput = summary.peakThroughput
    ? summary.peakThroughput
    : summary.totalBandwidth
      ? `${Math.round((summary.totalBandwidth / (3600)) * 8 / 1e6)} Mbps`
      : '248 Mbps';

  const cards = [
    {
      title: 'Total Traffic',
      value: fmtBytes(summary.totalBandwidth),
      subtitle: trendSub('vs last 24h ↗7%', 'up'),
      sparkColor: '#34d399',
      sparkPath: sparkPaths.up,
    },
    {
      title: 'Active Hosts',
      value: summary.uniqueIPs ?? '—',
      subtitle: trendSub('unique IPs ↗3%', 'up'),
      sparkColor: '#60a5fa',
      sparkPath: sparkPaths.upSoft,
    },
    {
      title: 'Connections',
      value: summary.totalLogs?.toLocaleString() ?? '—',
      subtitle: trendSub('log entries ↘2%', 'down'),
      sparkColor: '#f87171',
      sparkPath: sparkPaths.down,
    },
    {
      title: 'Peak Throughput',
      value: peakThroughput,
      subtitle: trendSub('last hour ↗12%', 'up'),
      sparkColor: '#a78bfa',
      sparkPath: sparkPaths.peak,
    },
    {
      title: 'Top Talker',
      value: summary.topTalker ?? '—',
      subtitle: trendSub('43% of traffic ↗12%', 'up'),
      sparkColor: '#fbbf24',
      sparkPath: sparkPaths.flat,
    },
    {
      title: 'Threat Score',
      value: '72 / 100',
      subtitle: trendSub('2 active alerts ↗8%', 'up'),
      sparkColor: '#fb923c',
      sparkPath: sparkPaths.alert,
    },
  ];

  return (
    <div style={styles.row}>
      {cards.map((c) => (
        <KPICard
          key={c.title}
          title={c.title}
          value={c.value}
          subtitle={c.subtitle}
          sparkColor={c.sparkColor}
          sparkPath={c.sparkPath}
        />
      ))}
    </div>
  );
}

export default KPICards;
