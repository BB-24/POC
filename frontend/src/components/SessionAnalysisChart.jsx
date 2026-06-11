import ReactECharts from "echarts-for-react";

export default function SessionAnalysisChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        No session data available.
      </div>
    );
  }

  // Separate data points by protocol for color mapping and legendary breakdown
  const tcpData = [];
  const udpData = [];
  const icmpData = [];

  for (const item of data) {
    const point = [
      item.duration, 
      item.total_bytes, 
      item.magnitude, 
      item.event_count, 
      item.event_id
    ];
    if (item.protocol === "TCP") {
      tcpData.push(point);
    } else if (item.protocol === "UDP") {
      udpData.push(point);
    } else {
      icmpData.push(point);
    }
  }

  const COLORS = { TCP: "#4a9eff", UDP: "#f59e0b", ICMP: "#ef4444" };

  const makeSeries = (name, seriesData, color) => ({
    name,
    type: "scatter",
    data: seriesData,
    symbolSize: (val) => {
      const mag = val[2] || 1;
      // Scale magnitude 1-10 to bubble size 6-26
      return Math.max(6, Math.min(26, mag * 2.5));
    },
    itemStyle: {
      color,
      opacity: 0.6,
      borderColor: color,
      borderWidth: 1,
    },
  });

  const option = {
    backgroundColor: "transparent",
    grid: {
      top: "10%",
      left: "3%",
      right: "8%",
      bottom: "20%",
      containLabel: true,
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "#1a2035",
      borderColor: "#2a3550",
      textStyle: { color: "#c8d3ea", fontSize: 10 },
      formatter: (params) => {
        const [duration, bytes, magnitude, count, eventId] = params.value;
        const fmtBytes = (n) => {
          if (n >= 1e9) return (n / 1e9).toFixed(1) + " GB";
          if (n >= 1e6) return (n / 1e6).toFixed(0) + " MB";
          if (n >= 1e3) return (n / 1e3).toFixed(0) + " KB";
          return n + " B";
        };
        return `
          <strong>Event ID: ${eventId}</strong><br/>
          Protocol: ${params.seriesName}<br/>
          Duration: ${duration.toFixed(1)}s<br/>
          Total Bytes: ${fmtBytes(bytes)}<br/>
          Magnitude: ${magnitude}<br/>
          Count: ${count}
        `;
      },
    },
    xAxis: {
      type: "value",
      name: "Duration Seconds",
      nameLocation: "middle",
      nameGap: 22,
      nameTextStyle: { color: "#5a6a8a", fontSize: 8.5 },
      splitLine: { show: true, lineStyle: { color: "#1f2e48" } },
      axisLabel: { color: "#94a3b8", fontSize: 9 },
      axisLine: { lineStyle: { color: "#2a3550" } },
    },
    yAxis: {
      type: "value",
      name: "Total Bytes",
      nameTextStyle: { color: "#5a6a8a", fontSize: 8.5 },
      splitLine: { show: true, lineStyle: { color: "#1f2e48" } },
      axisLabel: { 
        color: "#94a3b8", 
        fontSize: 9,
        formatter: (val) => {
          if (val >= 1e9) return (val / 1e9).toFixed(0) + "G";
          if (val >= 1e6) return (val / 1e6).toFixed(0) + "M";
          if (val >= 1e3) return (val / 1e3).toFixed(0) + "K";
          return val;
        }
      },
      axisLine: { lineStyle: { color: "#2a3550" } },
    },
    series: [
      makeSeries("TCP", tcpData, COLORS.TCP),
      makeSeries("UDP", udpData, COLORS.UDP),
      makeSeries("ICMP", icmpData, COLORS.ICMP),
    ],
  };

  return (
    <div style={{ width: "100%", height: "200px" }}>
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
