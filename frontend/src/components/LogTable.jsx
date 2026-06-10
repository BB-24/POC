import { useCallback } from "react";

function formatTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) {
    return value;
  }
  return date.toLocaleString();
}

export default function LogTable({ totalRows, pageSize, pageCache, loadPage, onRowClick, selectedTarget }) {
  const handleScroll = useCallback(
    (event) => {
      const element = event.target;
      const scrollPercentage = (element.scrollLeft + element.clientWidth) / element.scrollWidth;
      if (scrollPercentage > 0.8) {
        const visiblePage = Math.ceil(element.scrollTop / 54 / pageSize) + 1;
        loadPage(visiblePage);
        loadPage(visiblePage + 1);
      }
    },
    [loadPage, pageSize]
  );

  const visibleRows = [];
  for (let page = 1; page <= Math.ceil(totalRows / pageSize); page++) {
    const items = pageCache[page] || [];
    visibleRows.push(...items);
    if (visibleRows.length >= pageSize * 3) break;
  }

  return (
    <div className="log-list" onScroll={handleScroll} style={{ maxHeight: "580px", overflowY: "auto" }}>
      <div className="log-header">
        <div>Time</div>
        <div>Source IP</div>
        <div>Destination IP</div>
        <div>Protocol</div>
        <div>Bytes Sent</div>
        <div>Bytes Received</div>
      </div>
      <div>
        {visibleRows.slice(0, pageSize * 2).map((row, idx) => {
          const isSelected = row && selectedTarget && (row["Source IP"] === selectedTarget || row["Destination IP"] === selectedTarget);
          return (
            <div
              key={idx}
              className={`log-row ${isSelected ? "selected" : ""}`}
              onClick={() => row && onRowClick(row)}
            >
              <div className="cell">{formatTimestamp(row.Time)}</div>
              <div className="cell">{row["Source IP"]}</div>
              <div className="cell">{row["Destination IP"]}</div>
              <div className="cell">{row.Protocol}</div>
              <div className="cell">{Number(row["Bytes Sent"]).toLocaleString()}</div>
              <div className="cell">{Number(row["Bytes Received"]).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>
        Showing {visibleRows.length} of {totalRows} records
      </div>
    </div>
  );
}
