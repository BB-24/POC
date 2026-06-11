import ReactECharts from "echarts-for-react";

export default function ProtocolMixChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        No protocol data.
      </div>
    );
  }

  // Calculate percentages and sort to match legend
  const totalEvents = data.reduce((sum, item) => sum + item.events, 0);
  const chartData = data.map((item) => ({
    name: item.Protocol,
    value: item.events,
    percentage: totalEvents > 0 ? ((item.events / totalEvents) * 100).toFixed(0) : 0,
  }));

  const COLORS = { TCP: "#4a9eff", UDP: "#f59e0b", ICMP: "#ef4444" };

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "#1a2035",
      borderColor: "#2a3550",
      textStyle: { color: "#c8d3ea", fontSize: 10 },
      formatter: "{b}: {c} ({d}%)",
    },
    series: [
      {
        name: "Protocol Mix",
        type: "pie",
        radius: ["55%", "80%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: "center",
        },
        labelLine: {
          show: false,
        },
        data: chartData.map((item) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: COLORS[item.name] || "#38bdf8" },
        })),
      },
    ],
  };

  const topPercentage = chartData.length > 0 ? chartData[0].percentage : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", height: "200px", width: "100%" }}>
      {/* Donut Chart with center value */}
      <div style={{ position: "relative", width: "55%", height: "100%" }}>
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "14px",
            fontWeight: "700",
            color: "#e2e8f0",
            pointerEvents: "none",
          }}
        >
          {topPercentage}%
        </div>
      </div>

      {/* Custom Legend */}
      <div style={{ width: "45%", display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "4px" }}>
        {chartData.map((item) => (
          <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  backgroundColor: COLORS[item.name] || "#38bdf8",
                  display: "inline-block",
                }}
              />
              <span style={{ color: "#c8d3ea" }}>{item.name}</span>
            </div>
            <span style={{ fontWeight: "700", color: "#e2e8f0" }}>{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
