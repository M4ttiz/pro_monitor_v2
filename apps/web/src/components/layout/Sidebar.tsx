import { Link } from "react-router-dom";

export function Sidebar(): JSX.Element {
  return (
    <aside className="sidebar">
      <h2>Pro Monitor</h2>
      <nav>
        <p>
          <Link to="/">Dashboard</Link>
        </p>
      </nav>
    </aside>
  );
}
