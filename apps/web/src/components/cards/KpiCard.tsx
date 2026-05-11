interface KpiCardProps {
  label: string;
  value: string;
  colorVar: string;
}

export function KpiCard({ label, value, colorVar }: KpiCardProps): JSX.Element {
  return (
    <article className="kpi-card" style={{ borderLeftColor: `var(${colorVar})` }}>
      <div>{label}</div>
      <div className="mono" style={{ fontSize: "2rem", fontWeight: 700 }}>
        {value}
      </div>
    </article>
  );
}
