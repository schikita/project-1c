import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/audit/logs")
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3>Журнал аудита</h3>
      <PageError message={error} />
      {loading && <PageLoader />}
      <ul>
        {logs.map((l) => (
          <li key={l.id}>#{l.id} пользователь={l.user_id} действие={l.action}</li>
        ))}
      </ul>
    </div>
  );
}
