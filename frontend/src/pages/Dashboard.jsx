import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Clock, Users, BarChart2, Settings, LogOut, MoreVertical } from "lucide-react";
import api from "../api/api";
import { useLogStore } from "../store/logStore";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import KPICards from "../components/KPICards";
import NetworkGraph from "../components/NetworkGraph";
import TrafficFlowCard from "../components/TrafficFlowCard";
import LogTable from "../components/LogTable";
import LoadingOverlay from "../components/LoadingOverlay";
import SeverityChart from "../components/SeverityChart";
import ProtocolMixChart from "../components/ProtocolMixChart";
import SessionAnalysisChart from "../components/SessionAnalysisChart";

const PAGE_SIZE = 100;

function fmtBytes(n) {
  if (!n) return "0 B";
  if (n >= 1e12) return (n / 1e12).toFixed(1) + " TB";
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + " GB";
  if (n >= 1e6)  return (n / 1e6).toFixed(0) + " MB";
  return (n / 1e3).toFixed(0) + " KB";
}

function isNoDataError(err) {
  return (
    err?.response?.status === 400 &&
    typeof err?.response?.data?.detail === "string" &&
    err.response.data.detail.toLowerCase().includes("no log data loaded")
  );
}

function getErrorMessage(err, fallback) {
  return err?.response?.data?.detail || err?.message || fallback;
}

function NavBtn({ icon: Icon, active }) {
  return (
    <button className={`icon-rail-btn ${active ? "active" : ""}`}>
      <Icon style={{ width: 15, height: 15 }} />
    </button>
  );
}

export default function Dashboard() {
  const summary   = useLogStore((s) => s.summary);
  const ips       = useLogStore((s) => s.ips);
  const targetIP  = useLogStore((s) => s.targetIP);
  const filters   = useLogStore((s) => s.filters);
  const setSummary   = useLogStore((s) => s.setSummary);
  const setIPs       = useLogStore((s) => s.setIPs);
  const setProtocols = useLogStore((s) => s.setProtocols);
  const setTargetIP  = useLogStore((s) => s.setTargetIP);
  const setFilters   = useLogStore((s) => s.setFilters);

  const [logPages, setLogPages] = useState({});
  const [logTotal, setLogTotal] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [rawFlows, setRawFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const [severityData, setSeverityData] = useState([]);
  const [sessionData, setSessionData] = useState([]);
  const [searchEventId, setSearchEventId] = useState("");
  const [timelineTimeLimit, setTimelineTimeLimit] = useState(null);
  const workerRef = useRef(null);

  // ── Worker lifecycle ──────────────────────────────────
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/flowProcessor.worker.js", import.meta.url),
      { type: "module" }
    );
    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === "flows") {
        setChartData(payload.chartData || []);
        setLanes(payload.lanes || []);
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  // ── Boot fetch ────────────────────────────────────────
  useEffect(() => {
    fetchSummary();
    fetchProtocols();
    loadLogPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-select first IP ──────────────────────────────
  useEffect(() => {
    if (!targetIP && ips.length > 0) setTargetIP(ips[0]);
  }, [ips, targetIP, setTargetIP]);

  // ── Fetch flows on target change ──────────────────────
  useEffect(() => {
    if (targetIP) fetchTargetFlows(targetIP);
    else setRawFlows([]);
  }, [targetIP]);

  // ── Fetch severity & session stats on filter change ────
  useEffect(() => {
    fetchSeverityData(targetIP, filters.timeRange);
    fetchSessionData(targetIP, filters.timeRange);
  }, [targetIP, filters.timeRange]);

  // ── Rebuild chart on filter/flow change ───────────────
  useEffect(() => {
    if (rawFlows.length && workerRef.current) {
      workerRef.current.postMessage({
        type: "buildFlows",
        payload: {
          events: rawFlows,
          targetIP,
          protocolFilters: filters.protocols,
          volumeFilters:   filters.volumes,
          timeRange:       filters.timeRange,
        },
      });
    } else {
      setChartData([]);
      setLanes([]);
    }
  }, [rawFlows, filters, targetIP]);

  // ── API helpers ───────────────────────────────────────
  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get("/summary");
      setSummary(res.data);
    } catch (err) {
      if (!isNoDataError(err)) setAlert(getErrorMessage(err, "Unable to load summary."));
    } finally {
      setLoading(false);
    }
  };

  const fetchProtocols = async () => {
    try {
      const res = await api.get("/protocols");
      setProtocols(res.data);
    } catch (err) {
      if (!isNoDataError(err)) setAlert(getErrorMessage(err, "Unable to load protocols."));
    }
  };

  const fetchIPs = async () => {
    try {
      const res = await api.get("/ips");
      setIPs(res.data);
    } catch (err) {
      if (!isNoDataError(err)) setAlert(getErrorMessage(err, "Unable to load IPs."));
    }
  };

  const fetchSeverityData = async (ip, timeRange) => {
    try {
      const res = await api.get("/stats/category-magnitude", {
        params: { target_ip: ip, time_range: timeRange },
      });
      setSeverityData(res.data || []);
    } catch (err) {
      if (!isNoDataError(err)) {
        console.error("Failed to load severity stats:", err);
      }
    }
  };

  const fetchSessionData = async (ip, timeRange) => {
    try {
      const res = await api.get("/stats/session-analysis", {
        params: { target_ip: ip, time_range: timeRange },
      });
      setSessionData(res.data || []);
    } catch (err) {
      if (!isNoDataError(err)) {
        console.error("Failed to load session stats:", err);
      }
    }
  };

  const fetchTargetFlows = async (ip) => {
    setLoading(true);
    try {
      const res = await api.get(`/flows/${encodeURIComponent(ip)}`);
      setRawFlows(res.data || []);
      if (!res.data?.length) setAlert(`No traffic found for ${ip}.`);
      else setAlert("");
    } catch (err) {
      setAlert(getErrorMessage(err, `Unable to load flows for ${ip}.`));
      setRawFlows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLogPage = async (page) => {
    if (logPages[page]) return;
    try {
      const res = await api.get("/logs", { params: { page, limit: PAGE_SIZE } });
      setLogPages((prev) => ({ ...prev, [page]: res.data.records }));
      setLogTotal(res.data.total || 0);
      setAlert("");
      if (!ips.length) fetchIPs();
    } catch (err) {
      if (!isNoDataError(err)) setAlert(getErrorMessage(err, "Unable to load logs."));
    }
  };

  const handleUploadComplete = async () => {
    setAlert("Dataset uploaded successfully.");
    setLogPages({});
    setRawFlows([]);
    setChartData([]);
    setLanes([]);
    await Promise.all([
      fetchSummary(),
      fetchProtocols(),
      fetchIPs(),
      fetchSeverityData(targetIP, filters.timeRange),
      fetchSessionData(targetIP, filters.timeRange),
    ]);
    await loadLogPage(1);
  };

  const handleTargetChange = (ip) => setTargetIP(ip);
  const handleFilterChange = (f) => setFilters(f);
  const handleRowClick = (row) => {
    if (!row) return;
    const next = targetIP && row["Source IP"] === targetIP ? row["Destination IP"] : row["Source IP"];
    setTargetIP(next);
  };

  // ── Derived chart stats ───────────────────────────────
  const totalBytes = summary?.totalBandwidth || 0;

  const topProtocol = useMemo(() => {
    if (!chartData.length) return "—";
    const counts = {};
    for (const f of chartData) { const p = f[5]; counts[p] = (counts[p] || 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [chartData]);

  const protocolMix = useMemo(() => {
    if (!sessionData.length) return [];
    const counts = {};
    for (const item of sessionData) {
      const p = item.protocol;
      counts[p] = (counts[p] || 0) + (item.event_count || 1);
    }
    return Object.entries(counts).map(([Protocol, events]) => ({
      Protocol,
      events: Number(events),
    })).sort((a, b) => b.events - a.events);
  }, [sessionData]);

  const filteredFlowsForTree = useMemo(() => {
    if (!timelineTimeLimit || !chartData.length) return chartData;
    return chartData.filter((f) => {
      const timeStr = Array.isArray(f) ? f[1] : f.Time;
      const timeMs = timeStr ? new Date(timeStr).getTime() : 0;
      return timeMs <= timelineTimeLimit;
    });
  }, [chartData, timelineTimeLimit]);

  return (
    <div className="app-shell">
      <Header
        onUploadComplete={handleUploadComplete}
        timeRange={filters.timeRange}
        onTimeRangeChange={(val) => handleFilterChange({ ...filters, timeRange: val })}
      />

      {alert && (
        <div className="alert-banner" onClick={() => setAlert("")} style={{ cursor: "pointer" }}>
          {alert}
        </div>
      )}

      <div className="content-body">
        {/* Icon rail */}
        <nav className="icon-rail" aria-label="Navigation">
          <NavBtn icon={Home} active />
          <NavBtn icon={Clock} />
          <NavBtn icon={Users} />
          <NavBtn icon={BarChart2} />
          <NavBtn icon={Settings} />
          <div className="icon-rail-spacer" />
          <NavBtn icon={LogOut} />
        </nav>

        {/* Filter sidebar */}
        <Sidebar
          ips={ips}
          selectedIP={targetIP}
          filters={filters}
          onTargetChange={handleTargetChange}
          onFilterChange={handleFilterChange}
          searchEventId={searchEventId}
          onSearchEventIdChange={setSearchEventId}
        />

        {/* Main content area */}
        <main className="main-area">
          {/* Top row: KPI cards */}
          <div className="kpi-row">
            <KPICards summary={summary} />
          </div>

          {/* Middle row: Timeline graph & Traffic Flow hierarchy */}
          <div className="middle-row">
            {/* Communication Network Timeline Card */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-title">Communication Network Timeline</span>
                <button className="dash-card-menu" aria-label="Timeline Options">
                  ···
                </button>
              </div>
              <div className="dash-card-body">
                <NetworkGraph flows={chartData} lanes={lanes} targetIP={targetIP} onTimeChange={setTimelineTimeLimit} />
              </div>
            </div>

            {/* Traffic Flow Card */}
            <div className="dash-card">
              <TrafficFlowCard flows={filteredFlowsForTree} targetIP={targetIP} protocols={protocolMix} />
            </div>
          </div>

          {/* Bottom row: Event log & ECharts analytics cards */}
          <div className="bottom-dashboard-grid">
            {/* Detailed Event Log Card */}
            <div className="log-panel">
              <div className="log-panel-header">
                <div>
                  <h3>DETAILED EVENT LOG</h3>
                  <p>Click a row to investigate a new target IP.</p>
                </div>
                <span className="log-count">{logTotal.toLocaleString()} records</span>
              </div>
              <LogTable
                totalRows={logTotal}
                pageSize={PAGE_SIZE}
                pageCache={logPages}
                loadPage={loadLogPage}
                onRowClick={handleRowClick}
                selectedTarget={targetIP}
                searchEventId={searchEventId}
                timelineTimeLimit={timelineTimeLimit}
              />
            </div>

            {/* Severity by Category Card */}
            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>LOW-LEVEL CATEGORY MAGNITUDE</h3>
              </div>
              <div className="dashboard-chart-body">
                <SeverityChart data={severityData} />
              </div>
            </div>

            {/* Protocol Mix Card */}
            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>PROTOCOL MIX</h3>
              </div>
              <div className="dashboard-chart-body">
                <ProtocolMixChart data={protocolMix} />
              </div>
            </div>

            {/* Session Duration & Traffic Card */}
            <div className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h3>SESSION DURATION & TRAFFIC</h3>
              </div>
              <div className="dashboard-chart-body">
                <SessionAnalysisChart data={sessionData} />
              </div>
            </div>
          </div>
        </main>
      </div>

      <LoadingOverlay visible={loading} />
    </div>
  );
}
