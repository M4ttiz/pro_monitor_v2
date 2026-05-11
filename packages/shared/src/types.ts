export type Role = "admin" | "it_operator" | "manager";

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface Pc {
  id: string;
  hostname: string;
  site: string;
  status: "online" | "warning" | "critical" | "offline";
  lastSeenAt: string;
}

export interface MetricSnapshot {
  id: string;
  pcId: string;
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  pcId: string;
  severity: "warning" | "critical";
  message: string;
  isOpen: boolean;
  createdAt: string;
}
