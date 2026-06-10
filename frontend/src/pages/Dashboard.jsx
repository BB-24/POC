import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import { useLogStore } from "../store/logStore";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import KPIBar from "../components/KPIBar";
import TrafficFlowMap from "../components/TrafficFlowMap";
import LogTable from "../components/LogTable";
import UploadZone from "../components/UploadZone";
import LoadingOverlay from "../components/LoadingOverlay";

const PAGE_SIZE = 100;

export default function Dashboard() {
  const summary = useLogStore((state) => state.summary);
  const ips = useLogStore((state) => state.ips);
  const protocols = useLogStore((state) => state.protocols);
  const targetIP = useLogStore((state) => state.targetIP);
  const filters = useLogStore((state) => state.filters);
  const setSummary = useLogStore((state) => state.setSummary);
  const setIPs = useLogStore((state) => state.setIPs);
  const setProtocols = useLogStore((state) => state.setProtocols);
  const setTargetIP = useLogStore((state) => state.setTargetIP);
  const setFilters = useLogStore((state) => state.setFilters);

  const [logPages, setLogPages] = useState({});
  const [logTotal, setLogTotal] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [rawFlows, setRawFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState("");
  const workerRef = useRef(null);

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

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchProtocols();
    loadLogPage(1);
  }, []);

  useEffect(() => {
    if (!targetIP && ips.length > 0) {
      setTargetIP(ips[0]);
    }
  }, [ips, targetIP, setTargetIP]);

  useEffect(() => {
    if (targetIP) {
      fetchTargetFlows(targetIP);
    } else {
      setRawFlows([]);
    }
  }, [targetIP]);

  useEffect(() => {
    if (rawFlows.length && workerRef.current) {
      workerRef.current.postMessage({
        type: "buildFlows",
        payload: {
          events: rawFlows,
          targetIP,
          protocolFilters: filters.protocols,
          volumeFilters: filters.volumes,
          timeRange: filters.timeRange,
        },
      });
    } else {
      setChartData([]);
      setLanes([]);
    }
  }, [rawFlows, filters, targetIP]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get("/summary");
      setSummary(response.data);
    } catch (error) {
      setAlert(getErrorMessage(error, "Unable to load dashboard summary."));
    } finally {
      setLoading(false);
    }
  };

  const fetchProtocols = async () => {
    try {
      const response = await api.get("/protocols");
      setProtocols(response.data);
    } catch (error) {
      setAlert(getErrorMessage(error, "Unable to load protocol metrics."));
    }
  };

  const fetchIPs = async () => {
    try {
      const response = await api.get("/ips");
      setIPs(response.data);
    } catch (error) {
      setAlert(getErrorMessage(error, "Unable to load IP addresses."));
    }
  };

  const fetchTargetFlows = async (ip) => {
    setLoading(true);
    try {
      const response = await api.get(`/flows/${encodeURIComponent(ip)}`);
      setRawFlows(response.data || []);
      if (!response.data || response.data.length === 0) {
        setAlert(`No traffic found for ${ip}.`);
      } else {
        setAlert("");
      }
    } catch (error) {
      setAlert(getErrorMessage(error, `Unable to load flow data for ${ip}.`));
      setRawFlows([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLogPage = async (page) => {
    if (logPages[page]) {
      return;
    }

    try {
      const response = await api.get("/logs", {
        params: { page, limit: PAGE_SIZE },
      });
      setLogPages((state) => ({ ...state, [page]: response.data.records }));
      setLogTotal(response.data.total || 0);
      setAlert("");
      if (!ips.length) {
        fetchIPs();
      }
    } catch (error) {
      setAlert(getErrorMessage(error, "Unable to load log rows."));
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

  const handleTargetChange = (value) => {
    setTargetIP(value);
  };

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
  };

  const handleRowClick = (row) => {
    if (!row) return;
    const selected = targetIP && row["Source IP"] === targetIP ? row["Destination IP"] : row["Source IP"];
    setTargetIP(selected);
  };

  const totalBytes = useMemo(() => {
    if (!summary || !summary.totalBandwidth) return 0;
    return summary.totalBandwidth;
  }, [summary]);

  return (
    <div className="dashboard-shell">
      <Header />
      {alert && <div className="alert-banner">{alert}</div>}
      <div className="dashboard-top">
        <div className="dashboard-left">
          <UploadZone onUploadComplete={handleUploadComplete} />
          <Sidebar
            ips={ips}
            selectedIP={targetIP}
            filters={filters}
            onTargetChange={handleTargetChange}
            onFilterChange={handleFilterChange}
          />
        </div>
        <div className="dashboard-right">
          <KPIBar summary={summary} />
          <div className="panel chart-panel">
            <TrafficFlowMap flows={chartData} lanes={lanes} targetIP={targetIP} />
          </div>
        </div>
      </div>
      <div className="dashboard-footer">
        <div className="panel table-panel">
          <div className="table-header">
            <div>
              <h3>Virtualized Network Logs</h3>
              <p>Click a row to investigate a new target IP.</p>
            </div>
            <div className="table-meta">{logTotal.toLocaleString()} records</div>
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
      </div>
      <LoadingOverlay visible={loading} />
    </div>
  );
}

function getErrorMessage(error, fallback) {
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error?.message) {
    return error.message;
  }
  return fallback;
}
