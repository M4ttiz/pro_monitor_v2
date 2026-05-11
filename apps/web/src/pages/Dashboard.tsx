import { useEffect, useMemo } from "react";
import { KpiCard } from "../components/cards/KpiCard";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { PcStatusTable } from "../components/tables/PcStatusTable";
import { useSocket } from "../hooks/useSocket";
import { apiClient } from "../lib/apiClient";
import { useAuthStore } from "../stores/useAuthStore";
import { useMetricsStore } from "../stores/useMetricsStore";

export function DashboardPage(): JSX.Element {
  const metrics = useMetricsStore((state) => state.metrics);
  const setInitial = useMetricsStore((state) => state.setInitial);
  const role = useAuthStore((state) => state.role);
  const accessToken = useAuthStore((state) => state.accessToken);

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

  const latest = metrics[0];
  const summary = useMemo(
    () => ({
      cpu: latest?.cpuPercent ?? 0,
      ram: latest?.ramPercent ?? 0,
      disk: latest?.diskPercent ?? 0
    }),
    [latest]
  );

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content-area">
        <Header />
        <section className="kpi-grid">
          <KpiCard label="CPU" value={`${summary.cpu.toFixed(1)}%`} colorVar="--accent-red" />
          <KpiCard label="RAM" value={`${summary.ram.toFixed(1)}%`} colorVar="--accent-orange" />
          <KpiCard label="DISK" value={`${summary.disk.toFixed(1)}%`} colorVar="--accent-blue" />
        </section>
        <section style={{ marginTop: "1rem" }}>
          {role === "manager" ? <p>Vista manager: KPI aggregati disponibili.</p> : <PcStatusTable />}
        </section>
      </main>
    </div>
  );
}
