import { useCallback } from "react";

function formatTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) {
    return value;
  }
  return date.toLocaleString();
}

export default function LogTable({ totalRows, pageSize, pageCache, loadPage, onRowClick, selectedTarget, searchEventId = "" }) {
  const handleScroll = useCallback(
    (event) => {
      const element = event.target;
      const scrollPercentage = (element.scrollTop + element.clientHeight) / element.scrollHeight;
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

  const filteredRows = searchEventId
    ? visibleRows.filter(
        (row) =>
          row &&
          String(row["Event ID"] || "")
            .toLowerCase()
            .includes(searchEventId.toLowerCase())
      )
    : visibleRows;

  return (
    <div className="log-list-wrapper" onScroll={handleScroll} style={{ maxHeight: "580px", overflow: "auto" }}>
      <div className="log-list">
        <div className="log-header" style={{ gridTemplateColumns: "135px 115px 75px 130px 130px 85px 140px 85px 115px 85px 75px 75px 95px 95px 85px" }}>
          <div className="sticky-col header-cell" style={{ left: 0 }}>Time</div>
          <div className="sticky-col header-cell" style={{ left: 135 }}>Source IP</div>
          <div className="cell header-cell">Event ID</div>
          <div className="cell header-cell">Event Name</div>
          <div className="cell header-cell">Log Source</div>
          <div className="cell header-cell">Event Count</div>
          <div className="cell header-cell">Category</div>
          <div className="cell header-cell">Source Port</div>
          <div className="cell header-cell">Destination IP</div>
          <div className="cell header-cell">Dest Port</div>
          <div className="cell header-cell">Protocol</div>
          <div className="cell header-cell">Magnitude</div>
          <div className="cell header-cell">Bytes Sent</div>
          <div className="cell header-cell">Bytes Recv</div>
          <div className="cell header-cell">Duration</div>
        </div>
        <div>
          {filteredRows.slice(0, pageSize * 2).map((row, idx) => {
            if (!row) return null;
            const isSelected = selectedTarget && (row["Source IP"] === selectedTarget || row["Destination IP"] === selectedTarget);
            return (
              <div
                key={idx}
                className={`log-row ${isSelected ? "selected" : ""}`}
                onClick={() => onRowClick(row)}
                style={{ gridTemplateColumns: "135px 115px 75px 130px 130px 85px 140px 85px 115px 85px 75px 75px 95px 95px 85px" }}
              >
                <div className="cell sticky-col" style={{ left: 0 }}>{formatTimestamp(row.Time)}</div>
                <div className="cell sticky-col" style={{ left: 135 }}>{row["Source IP"]}</div>
                <div className="cell">{row["Event ID"]}</div>
                <div className="cell">{row["Event Name"]}</div>
                <div className="cell">{row["Log Source"]}</div>
                <div className="cell">{Number(row["Event Count"]).toLocaleString()}</div>
                <div className="cell">{row["Low Level Category"]}</div>
                <div className="cell">{row["Source Port"]}</div>
                <div className="cell">{row["Destination IP"]}</div>
                <div className="cell">{row["Destination Port"]}</div>
                <div className="cell">{row.Protocol}</div>
                <div className="cell">{row.Magnitude}</div>
                <div className="cell">{Number(row["Bytes Sent"]).toLocaleString()}</div>
                <div className="cell">{Number(row["Bytes Received"]).toLocaleString()}</div>
                <div className="cell">{Number(row["Duration Seconds"]).toLocaleString()}s</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "16px", color: "#94a3b8", fontSize: "11px" }}>
        Showing {filteredRows.length} of {totalRows} records
      </div>
    </div>
  );
}
