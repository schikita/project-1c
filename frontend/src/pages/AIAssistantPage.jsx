import { useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import SectionCard from "../components/SectionCard";
import { useToast } from "../components/ToastProvider";

function riskLabel(risk) {
  const map = {
    low: "Низкий",
    medium: "Средний",
    high: "Высокий",
    critical: "Критический",
  };
  return map[risk] || risk || "-";
}

function statusLabel(status) {
  const map = {
    completed: "Завершено",
    pending: "Ожидает",
    failed: "Ошибка",
    draft: "Черновик",
    confirmed: "Подтвержден",
    rejected: "Отклонен",
  };
  return map[status] || status || "-";
}

function actionTitle(actionType) {
  const map = {
    check_balance: "Проверка остатков",
    fix_posting: "Исправление проводки",
    reclose_period: "Повторное закрытие периода",
    request_user_input: "Требуется ввод пользователя",
  };
  return map[actionType] || actionType || "Действие";
}

function readableActions(actions) {
  return (actions || []).map((action, idx) => {
    const payload = action.payload_json && typeof action.payload_json === "object" ? action.payload_json : {};
    const payloadPairs = Object.entries(payload);
    return {
      id: action.id || idx + 1,
      title: actionTitle(action.action_type),
      status: statusLabel(action.status),
      details:
        payloadPairs.length === 0
          ? "Детализация не передана."
          : payloadPairs
              .map(([k, v]) => `${k.replaceAll("_", " ")}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
              .join("; "),
    };
  });
}

function outputSummary(outputPlan) {
  if (!outputPlan || typeof outputPlan !== "object") return null;
  return {
    title: outputPlan.title || "План корректировки",
    description: outputPlan.description || "Описание не передано моделью.",
    risk: riskLabel(outputPlan.risk_level),
    requiresConfirmation: outputPlan.requires_confirmation ? "Да" : "Нет",
    requiresBackup: outputPlan.requires_backup ? "Да" : "Нет",
    actionsCount: Array.isArray(outputPlan.actions) ? outputPlan.actions.length : 0,
  };
}

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
  const runSummary = useMemo(() => outputSummary(runData?.output_plan), [runData]);
  const actions = useMemo(() => readableActions(planData?.actions), [planData]);

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
              Статус: <b>{statusLabel(runInfo.status)}</b>
            </Typography>
          </Stack>
        </SectionCard>
      )}

      {runSummary && (
        <SectionCard title="Рекомендация ИИ (кратко)">
          <Stack spacing={1}>
            <Typography variant="body2">
              Название плана: <b>{runSummary.title}</b>
            </Typography>
            <Typography variant="body2">{runSummary.description}</Typography>
            <Typography variant="body2">
              Уровень риска: <b>{runSummary.risk}</b>
            </Typography>
            <Typography variant="body2">
              Нужна проверка человеком: <b>{runSummary.requiresConfirmation}</b>
            </Typography>
            <Typography variant="body2">
              Нужна резервная копия: <b>{runSummary.requiresBackup}</b>
            </Typography>
            <Typography variant="body2">
              Количество действий: <b>{runSummary.actionsCount}</b>
            </Typography>
          </Stack>
        </SectionCard>
      )}

      {planData && (
        <SectionCard title="План коррекции">
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="body2">
              Заголовок: <b>{planData.title || "-"}</b>
            </Typography>
            <Typography variant="body2">
              Риск: <b>{riskLabel(planData.risk_level)}</b>
            </Typography>
            <Typography variant="body2">
              Статус: <b>{statusLabel(planData.status)}</b>
            </Typography>
            <Typography variant="body2">{planData.description || "Описание отсутствует."}</Typography>
          </Stack>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Действия ({actions.length})
              </Typography>
              {actions.length === 0 ? (
                <Typography variant="body2">Действия не переданы.</Typography>
              ) : (
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {actions.map((action) => (
                    <li key={action.id} style={{ marginBottom: 8 }}>
                      <Typography variant="body2">
                        <b>{action.title}</b> (статус: {action.status})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {action.details}
                      </Typography>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </SectionCard>
      )}
    </div>
  );
}
