import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

export default function SessionAnalysisChart({ scatterData }) {
  const chartOption = useMemo(() => {
    if (!scatterData || !Array.isArray(scatterData) || scatterData.length === 0) {
      return {
        grid: { left: "3%", right: "3%", top: "15%", bottom: "10%", containLabel: true },
        xAxis: { type: "value", name: "Duration (seconds)" },
        yAxis: { type: "value", name: "Total Bytes" },
        series: [{ data: [], type: "scatter", symbolSize: 8 }],
      };
    }

    // Transform data for scatter plot
    const scatterPoints = scatterData.map((item) => {
      const bubbleSize = Math.min(Math.max(item.event_count * 2, 8), 50); // Bubble size based on event count
      return [
        item.duration,
        item.total_bytes,
        bubbleSize,
        item.magnitude, // For color coding
      ];
    });

    return {
      color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
      grid: {
        left: "3%",
        right: "3%",
        top: "15%",
        bottom: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        name: "Duration (seconds)",
        nameTextStyle: { color: "#c8d3ea", fontSize: 11 },
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { color: "#2a3550" } },
      },
      yAxis: {
        type: "value",
        name: "Total Bytes",
        nameTextStyle: { color: "#c8d3ea", fontSize: 11 },
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { color: "#2a3550" } },
      },
      series: [
        {
          data: scatterPoints,
          type: "scatter",
          symbolSize: (data) => data[2],
          itemStyle: {
            color: (params) => {
              const magnitude = params.value[3];
              if (magnitude >= 3) return "#ef4444"; // High severity - red
              if (magnitude === 2) return "#f59e0b"; // Medium - orange
              return "#3b82f6"; // Low - blue
            },
            opacity: 0.7,
          },
          label: { show: false },
          emphasis: {
            itemStyle: {
              opacity: 1,
              borderColor: "#c8d3ea",
              borderWidth: 2,
            },
          },
        },
      ],
      textStyle: {
        color: "#c8d3ea",
      },
      backgroundColor: "transparent",
    };
  }, [scatterData]);

  return (
    <ReactECharts
      option={chartOption}
      style={{ height: "100%", width: "100%" }}
      notMerge={true}
      lazyUpdate={false}
    />
  );
}
