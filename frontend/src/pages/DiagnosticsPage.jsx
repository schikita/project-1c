import { useState } from "react";
import { Link } from "react-router-dom";
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
    <div>
      <h3>Запуск диагностики</h3>
      <div style={{ display: "grid", gap: 8, maxWidth: 460 }}>
        <input value={connectionId} onChange={(e) => setConnectionId(e.target.value)} placeholder="ID подключения" />
        <input value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} placeholder="ID организации" />
        <input value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} type="date" />
        <input value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} type="date" />
        <select value={diagnosticType} onChange={(e) => setDiagnosticType(e.target.value)}>
          <option value="pre_month_close">pre_month_close</option>
          <option value="post_month_close">post_month_close</option>
        </select>
        <button onClick={runDiagnostic}>Запустить проверку</button>
      </div>
      {result && (
        <p>
          Создан запуск <Link to={`/diagnostics/runs/${result.run_id}`}>#{result.run_id}</Link>, статус: {result.status}
        </p>
      )}
      <PageError message={error} />
    </div>
  );
}
