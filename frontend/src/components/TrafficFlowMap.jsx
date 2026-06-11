import { useMemo } from "react";
import ReactECharts from "echarts-for-react";

const protocolColors = {
  TCP: "#3b82f6",
  UDP: "#f59e0b",
  ICMP: "#ef4444",
};

function formatTime(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.valueOf())) {
    return timestamp;
  }
  return date.toLocaleString();
}

export default function TrafficFlowMap({ flows, lanes, targetIP }) {
  const option = useMemo(() => {
    return {
      backgroundColor: "#0f172a",
      title: {
        text: "Network Traffic Flow Map",
        left: "center",
        textStyle: {
          color: "#e5e7eb",
          fontSize: 18,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          if (!params.data) return "";
          const [_, time, __, ___, thickness, protocol, bytes, duration, source, destination, remote] = params.data;
          return [`<div style="color:#e5e7eb; line-height:1.5">`,
            `<strong>${protocol}</strong>`,
            `Source: ${source}`,
            `Destination: ${destination}`,
            `Remote: ${remote}`,
            `Time: ${formatTime(time)}`,
            `Bytes: ${Number(bytes).toLocaleString()}`,
            `Duration: ${duration}s`,
          `</div>`].join("<br/>");
        },
      },
      grid: {
        left: "14%",
        right: "10%",
        top: "16%",
        bottom: "14%",
      },
      xAxis: {
        type: "category",
        data: lanes,
        axisLine: { lineStyle: { color: "#334155" } },
        axisLabel: { color: "#cbd5e1", rotate: 15 },
      },
      yAxis: {
        type: "time",
        axisLine: { lineStyle: { color: "#334155" } },
        axisLabel: { color: "#cbd5e1" },
        splitLine: { lineStyle: { color: "#1f2937" } },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0 },
        { type: "inside", yAxisIndex: 0 },
        { type: "slider", xAxisIndex: 0, bottom: "5%", height: 12, fillerColor: "rgba(59,130,246,0.16)" },
        { type: "slider", yAxisIndex: 0, right: "5%", width: 12, fillerColor: "rgba(59,130,246,0.16)" },
      ],
      axisPointer: {
        show: true,
        type: "line",
        label: { backgroundColor: "#475569" },
      },
      series: [
        {
          type: "custom",
          renderItem: (params, api) => {
            const from = api.coord([api.value(0), api.value(1)]);
            const to = api.coord([api.value(2), api.value(3)]);
            const thickness = Math.max(1, api.value(4));
            const protocol = api.value(5);
            const color = protocolColors[protocol] || "#38bdf8";
            const arrowDirection = to[0] >= from[0] ? 1 : -1;
            const arrowLength = 12;

            return {
              type: "group",
              children: [
                {
                  type: "line",
                  shape: {
                    x1: from[0],
                    y1: from[1],
                    x2: to[0],
                    y2: to[1],
                  },
                  style: {
                    stroke: color,
                    lineWidth: thickness,
                    lineCap: "round",
                  },
                },
                {
                  type: "polygon",
                  shape: {
                    points: [
                      [to[0], to[1]],
                      [to[0] - arrowDirection * arrowLength, to[1] - arrowLength * 0.55],
                      [to[0] - arrowDirection * arrowLength, to[1] + arrowLength * 0.55],
                    ],
                  },
                  style: {
                    fill: color,
                  },
                },
              ],
            };
          },
          encode: {
            x: [0, 2],
            y: [1, 3],
          },
          data: flows,
        },
      ],
    };
  }, [flows, lanes]);

  if (!flows.length) {
    return <div className="empty-chart">Select a target IP and upload logs to visualize network traffic.</div>;
  }

  return <ReactECharts option={option} style={{ height: "660px", width: "100%" }} />;
}
