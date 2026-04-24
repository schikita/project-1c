import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import SeverityBadge from "../components/SeverityBadge";
import { useToast } from "../components/ToastProvider";

export default function DiagnosticIssuePage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState("");
  const [showTech, setShowTech] = useState(false);
  const { showToast } = useToast();

  const load = async () => {
    try {
      const data = await apiFetch(`/api/diagnostics/issues/${issueId}`);
      setIssue(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [issueId]);

  const setStatus = async (action) => {
    try {
      await apiFetch(`/api/diagnostics/issues/${issueId}/${action}`, { method: "POST" });
      await load();
      showToast("Статус проблемы обновлен", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const rerunFromIssue = async () => {
    try {
      const data = await apiFetch(`/api/diagnostics/runs/${issue.run_id}/rerun`, { method: "POST" });
      showToast(`Создан новый запуск #${data.run_id}`, "success");
      navigate(`/diagnostics/runs/${data.run_id}`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (error) return <PageError message={error} />;
  if (!issue) return <PageLoader />;

  return (
    <div>
      <h3>{issue.title}</h3>
      <p><b>Что случилось:</b> {issue.description}</p>
      <p><b>Почему случилось:</b> {issue.detected_reason}</p>
      <p>
        <b>Категория:</b> {issue.category} | <b>Критичность:</b> <SeverityBadge severity={issue.severity} /> | <b>Статус:</b>{" "}
        <span style={{ padding: "2px 8px", borderRadius: 10, background: "#eee" }}>{issue.status}</span>
      </p>
      <h4>Карта влияния</h4>
      <pre>{JSON.stringify(issue.impact_map, null, 2)}</pre>
      <h4>Доказательства</h4>
      <pre>{JSON.stringify(issue.evidence, null, 2)}</pre>
      <h4>Как исправить</h4>
      <ol>
        {(issue.fix_steps || []).map((step, idx) => (
          <li key={idx}>{step}</li>
        ))}
      </ol>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={rerunFromIssue}>Проверить повторно</button>
        <button onClick={() => setStatus("mark-fixed")}>Пометить как исправлено</button>
        <button onClick={() => setStatus("ignore")}>Игнорировать</button>
        <button onClick={() => setStatus("false-positive")}>Ложное срабатывание</button>
      </div>
      <div style={{ marginTop: 14 }}>
        <button onClick={() => setShowTech((v) => !v)}>
          {showTech ? "Скрыть" : "Показать"} блок "Для 1С-специалиста"
        </button>
        {showTech && (
          <pre style={{ marginTop: 8 }}>{JSON.stringify(issue, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
