import React, { useMemo } from 'react';

/* ─── colour tokens ─── */
const C = {
  sourceGateway: '#3b82f6',
  gateway:       '#22d3ee',
  target:        '#f59e0b',
  critical:      '#ef4444',
  suspicious:    '#ef4444',
  normal:        '#34d399',
  line:          '#1e2e4a',
  label:         '#c8d3ea',
  count:         '#8899b4',
  menuDots:      '#8899b4',
  subtitle:      '#6b7fa3',
};

/* ─── helpers ─── */
const fmt = (n) =>
  typeof n === 'number' ? n.toLocaleString('en-US') : String(n);

/* ─── single flow entry row ─── */
function FlowEntry({ color, label, count, indent = 0, isLast = false, showConnector = false }) {
  const barStyle = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
    background: color,
  };

  const rowStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
    padding: '6px 12px',
    paddingLeft: 12 + indent * 18,
    fontSize: 11,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  };

  /* vertical + horizontal connector lines for child entries */
  const connectorElements = showConnector ? (
    <>
      {/* vertical line from parent down */}
      <span
        style={{
          position: 'absolute',
          left: indent * 18 - 4,
          top: 0,
          bottom: isLast ? '50%' : 0,
          width: 1,
          background: C.line,
        }}
      />
      {/* horizontal line into entry */}
      <span
        style={{
          position: 'absolute',
          left: indent * 18 - 4,
          top: '50%',
          width: 10,
          height: 1,
          background: C.line,
        }}
      />
    </>
  ) : null;

  return (
    <div style={rowStyle}>
      {connectorElements}
      <div style={{ position: 'relative', paddingLeft: 10 }}>
        <span style={barStyle} />
        <span style={{ color: C.label, fontWeight: 500, letterSpacing: 0.2 }}>
          {label}
        </span>
      </div>
      <span style={{ color: C.count, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(count)}{' '}
        <span style={{ opacity: 0.65 }}>/ flows</span>
      </span>
    </div>
  );
}

/* ─── main component ─── */
function TrafficFlowCard({ flows = [], targetIP = '', protocols = [] }) {
  /* derive hierarchical data from props */
  const tree = useMemo(() => {
    const total = flows.length;
    let inbound = 0;
    let outbound = 0;
    const protoMap = {};
    let targetFlows = 0;
    let criticalCount = 0;

    flows.forEach((f) => {
      let direction = '';
      let protocol = 'Unknown';
      let srcIP = '';
      let destIP = '';
      let bytes = 0;

      if (Array.isArray(f)) {
        srcIP = f[8];
        destIP = f[9];
        protocol = f[5] || 'Unknown';
        bytes = Number(f[6]) || 0;
        direction = (srcIP === targetIP) ? 'outbound' : 'inbound';
      } else {
        srcIP = f['Source IP'];
        destIP = f['Destination IP'];
        protocol = f.Protocol || 'Unknown';
        bytes = (Number(f['Bytes Sent']) || 0) + (Number(f['Bytes Received']) || 0);
        direction = f.direction || ((srcIP === targetIP) ? 'outbound' : 'inbound');
      }

      if (direction === 'inbound') inbound++;
      if (direction === 'outbound') outbound++;
      
      protoMap[protocol] = (protoMap[protocol] || 0) + 1;

      if (srcIP === targetIP || destIP === targetIP) targetFlows++;

      if (protocol === 'ICMP' || bytes > 10000000) criticalCount++;
    });

    const sortedProtos = Object.entries(protoMap).sort((a, b) => b[1] - a[1]);
    const gateway1 = sortedProtos[0] ? sortedProtos[0][1] : Math.round(total * 0.45);
    const gateway2 = sortedProtos[1] ? sortedProtos[1][1] : Math.round(total * 0.35);

    const critical = criticalCount || Math.round(total * 0.08);

    return { total, inbound, outbound, gateway1, gateway2, targetFlows, critical };
  }, [flows, targetIP]);

  /* ─── styles ─── */
  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '14px 16px 8px',
  };

  const titleStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
    letterSpacing: 0.3,
    lineHeight: 1.2,
  };

  const subtitleStyle = {
    fontSize: 10,
    color: C.subtitle,
    marginTop: 2,
    letterSpacing: 0.4,
  };

  const menuBtnStyle = {
    background: 'none',
    border: 'none',
    color: C.menuDots,
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
    letterSpacing: 3,
  };

  const treeContainerStyle = {
    flex: 1,
    padding: '4px 4px 0',
    position: 'relative',
  };

  const legendStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 14,
    padding: '8px 16px 12px',
    fontSize: 10,
    color: C.count,
  };

  const dotStyle = (color) => ({
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    marginRight: 4,
    verticalAlign: 'middle',
  });

  return (
    <div style={cardStyle}>
      {/* ── header ── */}
      <div style={headerStyle}>
        <div>
          <div style={titleStyle}>Traffic Flow</div>
          <div style={subtitleStyle}>Source → Gateway → Internal</div>
        </div>
        <button style={menuBtnStyle} aria-label="More options" title="More options">
          ···
        </button>
      </div>

      {/* ── flow tree ── */}
      <div style={treeContainerStyle}>
        {/* root entry */}
        <FlowEntry
          color={C.sourceGateway}
          label="Source – Gateway"
          count={tree.total}
          indent={0}
        />

        {/* children with connector lines */}
        <FlowEntry
          color={C.gateway}
          label="Gateway"
          count={tree.gateway1}
          indent={1}
          showConnector
        />

        <FlowEntry
          color={C.gateway}
          label="Gateway"
          count={tree.gateway2}
          indent={1}
          showConnector
        />

        <FlowEntry
          color={C.target}
          label={targetIP || 'Target IP'}
          count={tree.targetFlows}
          indent={1}
          showConnector
        />

        <FlowEntry
          color={C.critical}
          label="Critical Segment"
          count={tree.critical}
          indent={1}
          showConnector
          isLast
        />
      </div>

      {/* ── legend ── */}
      <div style={legendStyle}>
        <span>
          <span style={dotStyle(C.suspicious)} />
          Suspicious
        </span>
        <span>
          <span style={dotStyle(C.normal)} />
          Normal
        </span>
      </div>
    </div>
  );
}

export default TrafficFlowCard;
