import { useCallback } from "react";
import { ChevronRight } from "lucide-react";

function formatTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) {
    return value;
  }
  return date.toLocaleString();
}

function formatNumber(value) {
  if (!value) return "0";
  if (typeof value !== "number") value = parseFloat(value);
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString();
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

  // Column definitions
  const frozenColumns = ["Time", "Source IP"];
  const allColumns = [
    "Time",
    "Source IP",
    "Event ID",
    "Event Name",
    "Log Source",
    "Event Count",
    "Low Level Category",
    "Destination IP",
    "Source Port",
    "Destination Port",
    "Protocol",
    "Magnitude",
    "Bytes Sent",
    "Bytes Received",
    "Duration Seconds",
  ];

  const scrollableColumns = allColumns.filter((col) => !frozenColumns.includes(col));

  return (
    <div className="log-table-container">
      <div className="log-table-wrapper" style={{ maxHeight: "600px", overflowY: "auto" }}>
        <div className="log-table-content" onScroll={handleScroll}>
          {/* Header */}
          <div className="log-table-header">
            {/* Frozen Columns Header */}
            <div className="log-table-frozen-header">
              {frozenColumns.map((col) => (
                <div key={col} className="log-table-cell log-table-header-cell">
                  {col}
                </div>
              ))}
            </div>
            {/* Scrollable Columns Header */}
            <div className="log-table-scrollable-header">
              {scrollableColumns.map((col) => (
                <div key={col} className="log-table-cell log-table-header-cell">
                  {col}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="log-table-rows">
            {visibleRows.slice(0, pageSize * 2).map((row, idx) => {
              const isSelected =
                row &&
                selectedTarget &&
                (row["Source IP"] === selectedTarget || row["Destination IP"] === selectedTarget);
              return (
                <div
                  key={idx}
                  className={`log-table-row ${isSelected ? "selected" : ""}`}
                  onClick={() => row && onRowClick(row)}
                >
                  {/* Frozen Columns */}
                  <div className="log-table-frozen-row">
                    {frozenColumns.map((col) => (
                      <div key={col} className="log-table-cell">
                        {col === "Time" ? formatTimestamp(row[col]) : row[col]}
                      </div>
                    ))}
                  </div>
                  {/* Scrollable Columns */}
                  <div className="log-table-scrollable-row">
                    {scrollableColumns.map((col) => (
                      <div key={col} className="log-table-cell">
                        {["Bytes Sent", "Bytes Received", "Event Count"].includes(col)
                          ? formatNumber(row[col])
                          : row[col]}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer with Info */}
      <div className="log-table-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ChevronRight style={{ width: 16, height: 16, color: "#94a3b8" }} />
          <span>Showing {visibleRows.length} of {totalRows} records</span>
        </div>
      </div>
    </div>
  );
}
