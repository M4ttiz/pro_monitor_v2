import { create } from "zustand";

export interface LiveMetric {
  id: string;
  pcId: string;
  hostname?: string;
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  createdAt: string;
}

interface MetricsState {
  metrics: LiveMetric[];
  setInitial: (metrics: LiveMetric[]) => void;
  pushMetric: (metric: LiveMetric) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: [],
  setInitial: (metrics) => set({ metrics }),
  pushMetric: (metric) =>
    set((state) => ({
      metrics: [metric, ...state.metrics].slice(0, 100)
    }))
}));
