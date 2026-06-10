const PROTOCOL_COLORS = {
  TCP: "#3b82f6",
  UDP: "#f59e0b",
  ICMP: "#ef4444",
};

function parseTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? date : null;
}

function buildRangeStart(events, timeRange) {
  if (timeRange === "all") {
    return null;
  }

  const timestamps = events
    .map((event) => parseTime(event.Time))
    .filter(Boolean)
    .map((date) => date.valueOf());

  if (!timestamps.length) {
    return null;
  }

  const latest = Math.max(...timestamps);
  const offsets = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };

  return new Date(latest - (offsets[timeRange] || 0));
}

function passesVolumeFilters(bytes, volumeFilters) {
  const active = Object.values(volumeFilters).some(Boolean);
  if (!active) {
    return true;
  }

  return (
    (volumeFilters.lt10kb && bytes < 10 * 1024) ||
    (volumeFilters.lt1mb && bytes < 1024 * 1024) ||
    (volumeFilters.gt100mb && bytes > 100 * 1024 * 1024)
  );
}

self.onmessage = (event) => {
  const { type, payload } = event.data;

  if (type !== "buildFlows") {
    return;
  }

  const { events, targetIP, protocolFilters, volumeFilters, timeRange } = payload;
  const rangeStart = buildRangeStart(events, timeRange);
  const grouped = new Map();

  for (const row of events) {
    const time = parseTime(row.Time);
    if (!time) {
      continue;
    }

    if (rangeStart && time < rangeStart) {
      continue;
    }

    const protocol = String(row.Protocol || "UNKNOWN").toUpperCase();
    if (!protocolFilters[protocol]) {
      continue;
    }

    const bytesSent = Number(row["Bytes Sent"] || 0);
    const bytesReceived = Number(row["Bytes Received"] || 0);
    const bytesTotal = bytesSent + bytesReceived;
    if (!passesVolumeFilters(bytesTotal, volumeFilters)) {
      continue;
    }

    const source = String(row["Source IP"] || "");
    const destination = String(row["Destination IP"] || "");
    const remote = source === targetIP ? destination : source;
    if (!remote || !targetIP || (source !== targetIP && destination !== targetIP)) {
      continue;
    }

    const timeKey = time.toISOString();
    const groupKey = [source, destination, protocol, timeKey].join("|");
    const existing = grouped.get(groupKey);

    if (!existing) {
      grouped.set(groupKey, {
        source,
        destination,
        remote,
        protocol,
        time: timeKey,
        bytes: bytesTotal,
        duration: Number(row["Duration Seconds"] || 0),
      });
    } else {
      existing.bytes += bytesTotal;
      existing.duration += Number(row["Duration Seconds"] || 0);
    }
  }

  const aggregated = Array.from(grouped.values()).map((event) => {
    const thickness = Math.min(12, Math.max(1, Math.log10(Math.max(event.bytes, 10))));
    return {
      ...event,
      thickness,
      color: PROTOCOL_COLORS[event.protocol] || "#38bdf8",
      sourceIndex: 0,
      destIndex: null,
    };
  });

  const remoteOrder = [...new Set(aggregated.map((item) => item.remote))];
  const lanes = [targetIP, ...remoteOrder];

  const chartData = aggregated.map((item) => {
    const destIndex = Math.max(1, lanes.indexOf(item.remote));
    return [
      0,
      item.time,
      destIndex,
      item.time,
      item.thickness,
      item.protocol,
      item.bytes,
      item.duration,
      item.source,
      item.destination,
      item.remote,
      item.color,
    ];
  });

  self.postMessage({
    type: "flows",
    payload: {
      lanes,
      chartData,
    },
  });
};
