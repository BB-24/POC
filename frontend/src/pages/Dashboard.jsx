import { useEffect, useMemo, useRef, useState } from "react";
import { Home, Clock, Users, BarChart2, Settings, LogOut, MoreVertical } from "lucide-react";
import api from "../api/api";
import { useLogStore } from "../store/logStore";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import TrafficFlowMap from "../components/TrafficFlowMap";
import LogTable from "../components/LogTable";
import LoadingOverlay from "../components/LoadingOverlay";

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
    await Promise.all([fetchSummary(), fetchProtocols(), fetchIPs()]);
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

  return (
    <div className="app-shell">
      <Header onUploadComplete={handleUploadComplete} />

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
        />

        {/* Main content */}
        <main className="main-area">
          {/* Chart panel */}
          <div className="chart-panel-wrap">
            <div className="chart-panel-header">
              <span className="chart-panel-title">Network Traffic Flow Map</span>
              <div className="chart-stats">
                <div className="chart-stat">
                  <span>Active Connections:</span>
                  <strong>{chartData.length}</strong>
                </div>
                <div className="chart-stat">
                  <span>Data Transferred:</span>
                  <strong>{fmtBytes(totalBytes)}</strong>
                </div>
                <div className="chart-stat">
                  <span>Top Protocol:</span>
                  <strong>{topProtocol}</strong>
                </div>
              </div>
              <button className="chart-menu-btn" aria-label="Chart options">
                <MoreVertical style={{ width: 15, height: 15 }} />
              </button>
            </div>

            <TrafficFlowMap flows={chartData} lanes={lanes} targetIP={targetIP} />
          </div>

          {/* Log table */}
          <div className="log-panel">
            <div className="log-panel-header">
              <div>
                <h3>Virtualized Network Logs</h3>
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
            />
          </div>
        </main>
      </div>

      <LoadingOverlay visible={loading} />
    </div>
  );
}
