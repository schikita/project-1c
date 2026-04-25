import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";

export default function ReportsPage() {
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const exportHtml = async (runId) => {
    try {
      const data = await apiFetch(`/api/reports/diagnostic-runs/${runId}/signed-link`, { method: "POST" });
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    apiFetch("/api/diagnostics/runs")
      .then(setRuns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3>Отчеты</h3>
      <PageError message={error} />
      {loading && <PageLoader />}
      <p>Выберите запуск и откройте HTML-отчет:</p>
      <ul style={{ display: "grid", gap: 10, paddingLeft: 20 }}>
        {runs.map((run) => (
          <li key={run.id}>
            <Link to={`/diagnostics/runs/${run.id}`}>Запуск #{run.id}</Link>
            {" "}({run.diagnostic_type}, {run.status})
            <button onClick={() => exportHtml(run.id)} style={{ marginLeft: 12, marginTop: 4 }}>
              Экспорт HTML
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
