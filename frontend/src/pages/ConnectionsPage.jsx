import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";

export default function ConnectionsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await apiFetch("/api/onec/connections");
      setRows(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const checkConnection = async (id) => {
    await apiFetch(`/api/onec/connections/${id}/check`, { method: "POST" });
    await load();
  };

  return (
    <div>
      <h3>Подключения 1С</h3>
      <p><Link to="/connections/new">Создать подключение</Link></p>
      <PageError message={error} />
      {loading && <PageLoader />}
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            #{row.id} {row.name} ({row.type}){" "}
            <button onClick={() => checkConnection(row.id)}>Проверить</button>
            {" "}
            <Link to={`/connections/${row.id}`}>Открыть</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
