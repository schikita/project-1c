import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";

export default function IntegrationLogPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/integration/logs")
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3>Журнал интеграций</h3>
      <PageError message={error} />
      {loading && <PageLoader />}
      <ul>
        {logs.map((l) => (
          <li key={l.id}>#{l.id} подключение={l.connection_id} метод={l.method} статус={l.status}</li>
        ))}
      </ul>
    </div>
  );
}
