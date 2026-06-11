import ReactECharts from "echarts-for-react";

export default function SeverityChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        No data available for severity analysis.
      </div>
    );
  }

  // Display top 10 categories to avoid cluttering
  const displayData = data.slice(0, 10);
  const categories = displayData.map((d) => d.category);
  const tcpData = displayData.map((d) => d.tcp_avg);
  const udpData = displayData.map((d) => d.udp_avg);
  const icmpData = displayData.map((d) => d.icmp_avg);

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#1a2035",
      borderColor: "#2a3550",
      textStyle: { color: "#c8d3ea", fontSize: 11 },
      formatter: (params) => {
        let total = 0;
        let details = "";
        params.forEach((p) => {
          if (p.value > 0) {
            total += p.value;
            details += `<br/>${p.marker} ${p.seriesName}: ${p.value.toFixed(1)}`;
          }
        });
        const cat = params[0].name;
        // Find overall avg magnitude in original data
        const original = displayData.find((d) => d.category === cat);
        const overall = original ? original.avg_magnitude.toFixed(1) : total.toFixed(1);
        return `<strong>${cat}</strong><br/>Overall Avg Magnitude: ${overall}${details}`;
      },
    },
    grid: {
      top: "5%",
      left: 125,
      right: "8%",
      bottom: "12%",
      containLabel: false,
    },
    xAxis: {
      type: "value",
      splitLine: { show: true, lineStyle: { color: "#1f2e48" } },
      axisLabel: { color: "#94a3b8", fontSize: 9 },
      axisLine: { lineStyle: { color: "#2a3550" } },
    },
    yAxis: {
      type: "category",
      data: categories,
      axisLabel: { 
        color: "#c8d3ea", 
        fontSize: 9,
        align: "right",
      },
      axisLine: { lineStyle: { color: "#2a3550" } },
      inverse: true,
    },
    series: [
      {
        name: "TCP",
        type: "bar",
        stack: "total",
        data: tcpData,
        itemStyle: { color: "#4a9eff" },
        barWidth: 10,
      },
      {
        name: "UDP",
        type: "bar",
        stack: "total",
        data: udpData,
        itemStyle: { color: "#f59e0b" },
        barWidth: 10,
      },
      {
        name: "ICMP",
        type: "bar",
        stack: "total",
        data: icmpData,
        itemStyle: { color: "#ef4444" },
        barWidth: 10,
      },
    ],
  };

  return (
    <div style={{ width: "100%", height: "200px" }}>
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
