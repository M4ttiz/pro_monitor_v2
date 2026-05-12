import { useEffect, useMemo, useState } from "react";
import { KpiCard } from "../components/cards/KpiCard";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { PcStatusTable } from "../components/tables/PcStatusTable";
import { useSocket } from "../hooks/useSocket";
import { apiClient } from "../lib/apiClient";
import { useAlertsStore } from "../stores/useAlertsStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useMetricsStore } from "../stores/useMetricsStore";

export function DashboardPage(): JSX.Element {
  const metrics = useMetricsStore((state) => state.metrics);
  const setInitial = useMetricsStore((state) => state.setInitial);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [activeTab, setActiveTab] = useState<"dashboard" | "hosts" | "alerts" | "agent">("dashboard");
  const [hosts, setHosts] = useState<
    Array<{
      id: string;
      hostname: string;
      site: string;
      status: "online" | "warning" | "critical" | "offline";
      lastSeenAt: string;
      apiKey: string;
      latestMetric: { cpuPercent: number; ramPercent: number; diskPercent: number; createdAt: string } | null;
    }>
  >([]);
  const alerts = useAlertsStore((state) => state.alerts);
  const setInitialAlerts = useAlertsStore((state) => state.setInitial);
  const removeAlert = useAlertsStore((state) => state.removeAlert);

  useSocket(accessToken);

  useEffect(() => {
    if (!accessToken) {
      setInitial([]);
      return;
    }
    apiClient
      .getAuthed<typeof metrics>("/api/v1/metrics")
      .then(setInitial)
      .catch(() => {
        setInitial([]);
      });
  }, [accessToken, setInitial]);

  useEffect(() => {
    if (!accessToken) {
      setHosts([]);
      setInitialAlerts([]);
      return;
    }

    apiClient
      .getAuthed<typeof hosts>("/api/v1/pcs")
      .then(setHosts)
      .catch(() => setHosts([]));

    apiClient
      .getAuthed<typeof alerts>("/api/v1/alerts")
      .then(setInitialAlerts)
      .catch(() => setInitialAlerts([]));
  }, [accessToken, setInitialAlerts]);

  const latest = metrics[0];
  const summary = useMemo(
    () => ({
      cpu: latest?.cpuPercent ?? 0,
      ram: latest?.ramPercent ?? 0,
      disk: latest?.diskPercent ?? 0
    }),
    [latest]
  );

  const openAlertCount = alerts.length;
  const onlineHosts = hosts.filter((h) => h.status !== "offline").length;

  const ackAlert = async (alertId: string) => {
    if (!accessToken) {
      return;
    }

    try {
      await apiClient.post<{ ok: boolean }>(`/api/v1/alerts/${alertId}/ack`, {}, accessToken);
      removeAlert(alertId);
    } catch {
      // keep UI stable even if backend fails.
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content-area">
        <Header />
        <section className="tab-strip">
          <button type="button" className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>
            Dashboard
          </button>
          <button type="button" className={activeTab === "hosts" ? "active" : ""} onClick={() => setActiveTab("hosts")}>
            Host ({hosts.length})
          </button>
          <button type="button" className={activeTab === "alerts" ? "active" : ""} onClick={() => setActiveTab("alerts")}>
            Alert ({openAlertCount})
          </button>
          <button type="button" className={activeTab === "agent" ? "active" : ""} onClick={() => setActiveTab("agent")}>
            Agent
          </button>
        </section>
        <section className="kpi-grid">
          <KpiCard label="CPU" value={`${summary.cpu.toFixed(1)}%`} colorVar="--accent-red" />
          <KpiCard label="RAM" value={`${summary.ram.toFixed(1)}%`} colorVar="--accent-orange" />
          <KpiCard label="DISK" value={`${summary.disk.toFixed(1)}%`} colorVar="--accent-blue" />
          <KpiCard label="HOST ONLINE" value={`${onlineHosts}/${hosts.length || 0}`} colorVar="--accent-green" />
        </section>
        {activeTab === "dashboard" ? (
          <section style={{ marginTop: "1rem" }}>
            <PcStatusTable />
          </section>
        ) : null}
        {activeTab === "hosts" ? (
          <section style={{ marginTop: "1rem" }} className="panel">
            <h3>Host monitorati</h3>
            <table>
              <thead>
                <tr>
                  <th>Hostname</th>
                  <th>Sede</th>
                  <th>Stato</th>
                  <th>Ultimo update</th>
                  <th>API Key</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((host) => (
                  <tr key={host.id}>
                    <td>{host.hostname}</td>
                    <td>{host.site}</td>
                    <td>{host.status}</td>
                    <td>{new Date(host.lastSeenAt).toLocaleString()}</td>
                    <td className="mono">{host.apiKey.slice(0, 12)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
        {activeTab === "alerts" ? (
          <section style={{ marginTop: "1rem" }} className="panel">
            <h3>Alert aperti</h3>
            {alerts.length === 0 ? <p>Nessun alert aperto.</p> : null}
            <table>
              <thead>
                <tr>
                  <th>Ora</th>
                  <th>Host</th>
                  <th>Severita</th>
                  <th>Messaggio</th>
                  <th>Azione</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>{new Date(alert.createdAt).toLocaleString()}</td>
                    <td>{alert.hostname ?? alert.pcId}</td>
                    <td>{alert.severity}</td>
                    <td>{alert.message}</td>
                    <td>
                      <button type="button" onClick={() => ackAlert(alert.id)}>
                        Ack
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
        {activeTab === "agent" ? (
          <section style={{ marginTop: "1rem" }} className="panel">
            <h3>Deploy Agent Windows</h3>
            <p>1) Copia la cartella agent su ogni PC Windows.</p>
            <p>2) Avvia PowerShell come amministratore.</p>
            <p>3) Esegui il comando:</p>
            <pre className="mono">.\install.ps1 -ApiBaseUrl "http://192.168.50.159:3001" -Site "Sede-01"</pre>
            <p>L'host comparira automaticamente nella tab Host dopo i primi invii metriche.</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
