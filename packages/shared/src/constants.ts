export const DEFAULT_THRESHOLDS = {
  cpuWarning: 80,
  cpuCritical: 95,
  ramWarning: 75,
  ramCritical: 90,
  diskWarning: 80,
  diskCritical: 95
} as const;

export const METRIC_INGEST_INTERVAL_SECONDS = 15;
