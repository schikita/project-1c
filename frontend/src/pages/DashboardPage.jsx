import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Card, CardContent, Stack, Typography } from "@mui/material";
import { apiFetch } from "../api/client";
import PageLoader from "../components/PageLoader";
import SectionCard from "../components/SectionCard";
import SeverityBadge from "../components/SeverityBadge";
import StatCard from "../components/StatCard";

export default function DashboardPage() {
  const [runs, setRuns] = useState([]);
  const [criticalIssues, setCriticalIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = async () => {
    try {
      const data = await apiFetch("/api/diagnostics/runs");
      setRuns(data);
    } catch (_err) {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
    const timer = setInterval(loadRuns, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadCriticalIssues = async () => {
      try {
        const recentRuns = runs.slice(0, 5);
        const issuesByRun = await Promise.all(
          recentRuns.map(async (run) => {
            const issues = await apiFetch(`/api/diagnostics/runs/${run.id}/issues`);
            return issues.map((issue) => ({ ...issue, run_id: run.id }));
          })
        );
        const merged = issuesByRun.flat();
        const top = merged
          .filter((issue) => issue.severity === "critical" || issue.severity === "high")
          .slice(0, 8);
        setCriticalIssues(top);
      } catch (_err) {
        setCriticalIssues([]);
      }
    };

    if (runs.length > 0) {
      loadCriticalIssues();
    }
  }, [runs]);

  const totalRuns = runs.length;
  const runningRuns = runs.filter((r) => r.status === "running" || r.status === "pending").length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;

  return (
    <div>
      <Typography variant="h4" sx={{ mb: 2 }}>Главная панель</Typography>
      {loading && <PageLoader />}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <StatCard title="Всего запусков" value={totalRuns} />
        <StatCard title="В работе" value={runningRuns} />
        <StatCard title="Завершено" value={completedRuns} />
        <StatCard title="С ошибкой" value={failedRuns} />
      </div>

      <Alert severity="info" sx={{ mb: 2 }}>
        <b>Быстрые действия:</b>{" "}
        <Link to="/diagnostics">Проверить перед/после закрытия</Link>
        {" | "}
        <Link to="/manual-operations">Найти ручные операции</Link>
        {" | "}
        <Link to="/missing-analytics">Документы без аналитики</Link>
        {" | "}
        <Link to="/accounting-policy">Проверить учетную политику</Link>
      </Alert>

      <SectionCard title="Последние диагностики">
        <Stack spacing={1}>
          {runs.slice(0, 5).map((run) => (
            <Card key={run.id} variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2">
                  <Link to={`/diagnostics/runs/${run.id}`}>#{run.id}</Link> - {run.diagnostic_type} - {run.status} ({run.progress_percent}%)
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </SectionCard>
      <SectionCard title="Последние критичные проблемы">
        {criticalIssues.length === 0 && <Typography variant="body2">Критичные проблемы не найдены.</Typography>}
        <Stack spacing={1}>
          {criticalIssues.map((issue) => (
            <Card key={issue.id} variant="outlined">
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2">
                  <Link to={`/issues/${issue.id}`}>{issue.title}</Link>{" "}
                  <SeverityBadge severity={issue.severity} /> ({issue.category})
                  {issue.run_id ? <> — запуск <Link to={`/diagnostics/runs/${issue.run_id}`}>#{issue.run_id}</Link></> : null}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </SectionCard>
    </div>
  );
}
