import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";

const REPORTS_BASE = `${window.location.protocol}//${window.location.hostname}:18080`;

export default function ReportsPage() {
  const [runs, setRuns] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      <ul>
        {runs.map((run) => (
          <li key={run.id}>
            <Link to={`/diagnostics/runs/${run.id}`}>Запуск #{run.id}</Link>
            {" "}({run.diagnostic_type}, {run.status})
            {" | "}
            <a
              href={`${REPORTS_BASE}/api/reports/diagnostic-runs/${run.id}/html`}
              target="_blank"
              rel="noreferrer"
            >
              Экспорт HTML
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
