import { create } from "zustand";

export interface LiveAlert {
  id: string;
  pcId: string;
  hostname?: string;
  severity: "warning" | "critical";
  message: string;
  isOpen: boolean;
  createdAt: string;
}

interface AlertsState {
  alerts: LiveAlert[];
  setInitial: (alerts: LiveAlert[]) => void;
  pushAlert: (alert: LiveAlert) => void;
  removeAlert: (alertId: string) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  alerts: [],
  setInitial: (alerts) => set({ alerts }),
  pushAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts.filter((item) => item.id !== alert.id)].slice(0, 200)
    })),
  removeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.filter((item) => item.id !== alertId)
    }))
}));
