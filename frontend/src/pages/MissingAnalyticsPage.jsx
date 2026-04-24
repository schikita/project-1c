import { useState } from "react";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";

export default function MissingAnalyticsPage() {
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/missing-analytics?connection_id=1&organization_id=org-1&period_start=2026-03-01&period_end=2026-03-31");
      setDocs(data);
      setError("");
    } catch (err) {
      setError(err.message);
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Документы без аналитики</h3>
      <button onClick={load}>Проверить</button>
      <PageError message={error} />
      {loading && <PageLoader />}
      <ul>
        {docs.map((d) => (
          <li key={d.ref}>{d.name} ({d.date})</li>
        ))}
      </ul>
    </div>
  );
}
