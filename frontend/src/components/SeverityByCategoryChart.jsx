import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

export default function SeverityByCategoryChart({ categoryMagnitudeData }) {
  const chartOption = useMemo(() => {
    if (!categoryMagnitudeData || !Array.isArray(categoryMagnitudeData) || categoryMagnitudeData.length === 0) {
      return {
        grid: { left: "3%", right: "3%", top: "15%", bottom: "10%", containLabel: true },
        xAxis: { type: "category", data: [] },
        yAxis: { type: "value" },
        series: [{ data: [], type: "bar", itemStyle: { color: "#3b82f6" } }],
      };
    }

    const categories = categoryMagnitudeData.map((item) => item.category);
    const magnitudes = categoryMagnitudeData.map((item) => item.magnitude);

    return {
      color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
      grid: {
        left: "3%",
        right: "3%",
        top: "15%",
        bottom: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: 45,
          fontSize: 11,
        },
      },
      yAxis: {
        type: "value",
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          data: magnitudes,
          type: "bar",
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#3b82f6" },
              { offset: 1, color: "#1e40af" },
            ]),
          },
          label: { show: false },
        },
      ],
      textStyle: {
        color: "#c8d3ea",
      },
      backgroundColor: "transparent",
    };
  }, [categoryMagnitudeData]);

  return (
    <ReactECharts
      option={chartOption}
      style={{ height: "100%", width: "100%" }}
      notMerge={true}
      lazyUpdate={false}
    />
  );
}
