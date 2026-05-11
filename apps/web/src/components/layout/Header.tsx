import { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";

export function Header(): JSX.Element {
  const role = useAuthStore((state) => state.role);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{ marginBottom: "1rem" }}>
      <strong>{clock.toLocaleTimeString()}</strong> - Role: {role ?? "guest"}
    </header>
  );
}
