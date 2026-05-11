import { useMemo } from "react";
import { useMetricsStore } from "../../stores/useMetricsStore";

export function PcStatusTable(): JSX.Element {
  const metrics = useMetricsStore((state) => state.metrics);

  const latestByPc = useMemo(() => {
    const map = new Map<string, (typeof metrics)[number]>();
    for (const metric of metrics) {
      if (!map.has(metric.pcId)) {
        map.set(metric.pcId, metric);
      }
    }
    return [...map.values()];
  }, [metrics]);

  return (
    <table>
      <thead>
        <tr>
          <th>PC</th>
          <th>CPU</th>
          <th>RAM</th>
          <th>Disk</th>
        </tr>
      </thead>
      <tbody>
        {latestByPc.map((metric) => (
          <tr key={metric.pcId}>
            <td>{metric.hostname ?? metric.pcId}</td>
            <td style={{ color: metric.cpuPercent >= 95 ? "var(--accent-red)" : undefined }}>
              {metric.cpuPercent.toFixed(1)}%
            </td>
            <td>{metric.ramPercent.toFixed(1)}%</td>
            <td>{metric.diskPercent.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
