import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/useAuthStore";

export function LoginPage(): JSX.Element {
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Credenziali non valide");
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: "1.5rem", background: "var(--bg-secondary)" }}>
      <h1>Login Pro Monitor</h1>
      <form onSubmit={handleSubmit}>
        <p>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        </p>
        <p>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
          />
        </p>
        <button type="submit">Entra</button>
        {error ? <p style={{ color: "var(--accent-red)" }}>{error}</p> : null}
      </form>
    </main>
  );
}
