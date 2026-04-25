import { useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import SectionCard from "../components/SectionCard";
import { useToast } from "../components/ToastProvider";

export default function AIAssistantPage() {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const initialIssueId = searchParams.get("issueId") || "";

  const [issueId, setIssueId] = useState(initialIssueId);
  const [modelName, setModelName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [runInfo, setRunInfo] = useState(null);
  const [runData, setRunData] = useState(null);
  const [planData, setPlanData] = useState(null);

  const canRun = useMemo(() => Number.isFinite(Number(issueId)) && Number(issueId) > 0 && !loading, [issueId, loading]);

  const createRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError("");
    setRunData(null);
    setPlanData(null);
    try {
      const payload = { issue_id: Number(issueId) };
      if (modelName.trim()) payload.model_name = modelName.trim();

      const created = await apiFetch("/api/ai-assistant/runs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRunInfo(created);

      const [run, plan] = await Promise.all([
        apiFetch(`/api/ai-assistant/runs/${created.run_id}`),
        apiFetch(`/api/correction-plans/${created.plan_id}`),
      ]);
      setRunData(run);
      setPlanData(plan);
      showToast(`AI-план сформирован (run #${created.run_id})`, "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Typography variant="h4" sx={{ mb: 2 }}>
        AI Assistant
      </Typography>
      <PageError message={error} />

      <SectionCard title="Запуск AI-плана исправлений">
        <Stack spacing={2}>
          <Alert severity="info">
            Укажите ID проблемы, и система сформирует план коррекции через backend AI Assistant.
          </Alert>
          <Box sx={{ display: "grid", gap: 12, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" }, alignItems: "end" }}>
            <TextField
              label="ID проблемы"
              type="number"
              value={issueId}
              onChange={(e) => setIssueId(e.target.value)}
              placeholder="например, 123"
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Модель (опционально)"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="например, gpt-4o-mini"
            />
            <Button variant="contained" onClick={createRun} disabled={!canRun}>
              {loading ? "Генерация..." : "Сформировать план"}
            </Button>
          </Box>
        </Stack>
      </SectionCard>

      {runInfo && (
        <SectionCard title="Результат запуска">
          <Stack spacing={1}>
            <Typography variant="body2">
              Run ID: <b>{runInfo.run_id}</b>
            </Typography>
            <Typography variant="body2">
              Plan ID: <b>{runInfo.plan_id}</b>
            </Typography>
            <Typography variant="body2">
              Модель: <b>{runInfo.model_name || "-"}</b>
            </Typography>
            <Typography variant="body2">
              Статус: <b>{runInfo.status || "-"}</b>
            </Typography>
          </Stack>
        </SectionCard>
      )}

      {runData && (
        <SectionCard title="AI Output Plan">
          <Card variant="outlined">
            <CardContent>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(runData.output_plan || {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </SectionCard>
      )}

      {planData && (
        <SectionCard title="План коррекции">
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="body2">
              Заголовок: <b>{planData.title || "-"}</b>
            </Typography>
            <Typography variant="body2">
              Риск: <b>{planData.risk_level || "-"}</b>
            </Typography>
            <Typography variant="body2">
              Статус: <b>{planData.status || "-"}</b>
            </Typography>
            <Typography variant="body2">{planData.description || "Описание отсутствует."}</Typography>
          </Stack>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Действия ({(planData.actions || []).length})
              </Typography>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(planData.actions || [], null, 2)}
              </pre>
            </CardContent>
          </Card>
        </SectionCard>
      )}
    </div>
  );
}
