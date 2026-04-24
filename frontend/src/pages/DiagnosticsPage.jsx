import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import { useToast } from "../components/ToastProvider";

export default function DiagnosticsPage() {
  const [connectionId, setConnectionId] = useState(1);
  const [organizationId, setOrganizationId] = useState("org-1");
  const [periodStart, setPeriodStart] = useState("2026-03-01");
  const [periodEnd, setPeriodEnd] = useState("2026-03-31");
  const [diagnosticType, setDiagnosticType] = useState("pre_month_close");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const runDiagnostic = async () => {
    setError("");
    try {
      const data = await apiFetch("/api/diagnostics/runs", {
        method: "POST",
        body: JSON.stringify({
          connection_id: Number(connectionId),
          organization_id: organizationId,
          period_start: periodStart,
          period_end: periodEnd,
          diagnostic_type: diagnosticType,
        }),
      });
      setResult(data);
      showToast(`Диагностика запущена: #${data.run_id}`, "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>Запуск диагностики</Typography>
        <Stack spacing={2} sx={{ maxWidth: 520 }}>
          <TextField value={connectionId} onChange={(e) => setConnectionId(e.target.value)} label="ID подключения" />
          <TextField value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} label="ID организации" />
          <TextField value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} type="date" label="Период с" InputLabelProps={{ shrink: true }} />
          <TextField value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} type="date" label="Период по" InputLabelProps={{ shrink: true }} />
          <TextField select value={diagnosticType} onChange={(e) => setDiagnosticType(e.target.value)} label="Тип диагностики">
            <MenuItem value="pre_month_close">Перед закрытием месяца</MenuItem>
            <MenuItem value="post_month_close">После закрытия месяца</MenuItem>
          </TextField>
          <Button variant="contained" onClick={runDiagnostic}>Запустить проверку</Button>
        </Stack>
      {result && (
        <Typography sx={{ mt: 2 }}>
          Создан запуск <Link to={`/diagnostics/runs/${result.run_id}`}>#{result.run_id}</Link>, статус: {result.status}
        </Typography>
      )}
      <PageError message={error} />
      </CardContent>
    </Card>
  );
}
