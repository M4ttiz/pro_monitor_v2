interface SidebarProps {
  activeTab: "dashboard" | "hosts" | "alerts" | "agent" | "system";
  hostCount: number;
  openAlertCount: number;
  onChangeTab: (tab: "dashboard" | "hosts" | "alerts" | "agent" | "system") => void;
}

export function Sidebar({ activeTab, hostCount, openAlertCount, onChangeTab }: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <h2 className="brand-title">Pro Monitor</h2>
      <p className="brand-subtitle">Ops Neural Console</p>
      <nav className="sidebar-nav">
        <button type="button" className={activeTab === "dashboard" ? "active" : ""} onClick={() => onChangeTab("dashboard")}>
          Dashboard
        </button>
        <button type="button" className={activeTab === "hosts" ? "active" : ""} onClick={() => onChangeTab("hosts")}>
          Host ({hostCount})
        </button>
        <button type="button" className={activeTab === "alerts" ? "active" : ""} onClick={() => onChangeTab("alerts")}>
          Alert ({openAlertCount})
        </button>
        <button type="button" className={activeTab === "agent" ? "active" : ""} onClick={() => onChangeTab("agent")}>
          Agent Deploy
        </button>
        <button type="button" className={activeTab === "system" ? "active" : ""} onClick={() => onChangeTab("system")}>
          System Pulse
        </button>
      </nav>
    </aside>
  );
}
