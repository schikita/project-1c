import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import SectionCard from "../components/SectionCard";
import SeverityBadge from "../components/SeverityBadge";

export default function DiagnosticRunPage() {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

  const load = async () => {
    try {
      const [runData, issuesData] = await Promise.all([
        apiFetch(`/api/diagnostics/runs/${runId}`),
        apiFetch(`/api/diagnostics/runs/${runId}/issues`),
      ]);
      setRun(runData);
      setIssues(issuesData);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [runId]);

  useEffect(() => {
    if (!run || run.status === "completed" || run.status === "failed" || run.status === "cancelled") return undefined;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [run]);

  const rerun = async () => {
    await apiFetch(`/api/diagnostics/runs/${runId}/rerun`, { method: "POST" });
    await load();
  };
  const exportHtml = async () => {
    try {
      const data = await apiFetch(`/api/reports/diagnostic-runs/${runId}/signed-link`, { method: "POST" });
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter;
    const matchesCategory = categoryFilter === "all" || issue.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || (issue.status || "open") === statusFilter;
    return matchesSeverity && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    const severityCompare = (severityOrder[a.severity] ?? 999) - (severityOrder[b.severity] ?? 999);
    if (severityCompare !== 0) return severityCompare;
    return (a.category || "").localeCompare(b.category || "");
  });

  const groupedIssues = filteredIssues.reduce((acc, issue) => {
    const category = issue.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(issue);
    return acc;
  }, {});

  return (
    <div>
      <h3>Результаты запуска #{runId}</h3>
      <PageError message={error} />
      {loading && <PageLoader />}
      {run && (
        <p>
          Статус: <b>{run.status}</b>, прогресс: {run.progress_percent}%.
          {" "}
          <button onClick={exportHtml}>Экспорт HTML</button>
        </p>
      )}
      <button onClick={rerun}>Повторить проверку</button>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">Все критичности</option>
          <option value="critical">Критично</option>
          <option value="high">Высокая</option>
          <option value="medium">Средняя</option>
          <option value="low">Низкая</option>
          <option value="info">Инфо</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">Все категории</option>
          <option value="month_close">Закрытие месяца</option>
          <option value="vat">НДС</option>
          <option value="fixed_assets">Основные средства</option>
          <option value="inventory">ТМЦ</option>
          <option value="reconciliations">Сверки</option>
          <option value="reporting">Отчетность</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Все статусы</option>
          <option value="open">Открыта</option>
          <option value="fixed">Исправлена</option>
          <option value="ignored">Игнорируется</option>
          <option value="false_positive">Ложное срабатывание</option>
        </select>
      </div>
      <SectionCard title="Проблемы">
      {Object.keys(groupedIssues).map((category) => (
        <div key={category} style={{ marginBottom: 12 }}>
          <h5 style={{ marginBottom: 8 }}>Категория: {category}</h5>
          <div style={{ display: "grid", gap: 10 }}>
            {groupedIssues[category].map((issue) => (
              <div key={issue.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
                <p style={{ margin: 0 }}>
                  <Link to={`/issues/${issue.id}`}><b>{issue.title}</b></Link>
                  {" "} | {issue.category} |{" "}
                  <SeverityBadge severity={issue.severity} />
                </p>
                <p style={{ margin: "8px 0 4px" }}><b>Что случилось:</b> {issue.description}</p>
                <p style={{ margin: "4px 0" }}><b>Почему случилось:</b> {issue.detected_reason}</p>
                <p style={{ margin: "4px 0" }}>
                  <b>Как исправить:</b>{" "}
                  {(issue.fix_steps || []).length > 0 ? issue.fix_steps[0] : "Откройте проблему для пошаговой инструкции."}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
      </SectionCard>
    </div>
  );
}
