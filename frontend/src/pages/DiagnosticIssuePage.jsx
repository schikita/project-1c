import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import SeverityBadge from "../components/SeverityBadge";
import { useToast } from "../components/ToastProvider";

function humanizeKey(key) {
  const map = {
    doc_number: "Номер документа",
    doc_date: "Дата документа",
    document_type: "Тип документа",
    account_code: "Счет учета",
    amount: "Сумма",
    currency: "Валюта",
    organization: "Организация",
    period: "Период",
    counterparty: "Контрагент",
    comment: "Комментарий",
  };
  return map[key] || key.replaceAll("_", " ");
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "не указано";
  if (typeof value === "boolean") return value ? "да" : "нет";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return null;
}

function renderObjectAsList(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const rows = Object.entries(obj);
  if (rows.length === 0) return null;
  return (
    <ul>
      {rows.map(([key, value]) => {
        const plain = formatValue(value);
        return (
          <li key={key}>
            <b>{humanizeKey(key)}:</b>{" "}
            {plain !== null ? (
              plain
            ) : Array.isArray(value) ? (
              value.length === 0 ? (
                "не указано"
              ) : (
                value.map((item, idx) => (
                  <span key={`${key}-${idx}`}>
                    {idx > 0 ? "; " : ""}
                    {typeof item === "object" ? JSON.stringify(item) : String(item)}
                  </span>
                ))
              )
            ) : (
              "см. детали специалиста"
            )}
          </li>
        );
      })}
    </ul>
  );
}

function renderReadableValue(value) {
  const plain = formatValue(value);
  if (plain !== null) return plain;

  if (Array.isArray(value)) {
    if (value.length === 0) return "не указано";
    return (
      <ol style={{ margin: "6px 0 0 18px" }}>
        {value.map((item, idx) => (
          <li key={idx}>
            {typeof item === "object" && item !== null ? renderObjectAsList(item) || "сложная структура" : String(item)}
          </li>
        ))}
      </ol>
    );
  }

  if (typeof value === "object") {
    return renderObjectAsList(value) || "сложная структура";
  }
  return String(value);
}

function renderTechSections(issue) {
  if (!issue || typeof issue !== "object") return null;
  const sections = Object.entries(issue);
  return (
    <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
      {sections.map(([key, value]) => (
        <div key={key} style={{ border: "1px solid #e1e5ea", borderRadius: 8, padding: 10, background: "#fff" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{humanizeKey(key)}</div>
          <div style={{ fontSize: 14, lineHeight: 1.45 }}>{renderReadableValue(value)}</div>
        </div>
      ))}
    </div>
  );
}

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
      {renderObjectAsList(issue.impact_map) || (
        <p>Система не передала развернутую карту влияния для этой проблемы.</p>
      )}
      <h4>Доказательства</h4>
      {renderObjectAsList(issue.evidence) || (
        <p>Подробные доказательства не переданы. Ориентируйтесь на описание и рекомендации.</p>
      )}
      <h4>Как исправить</h4>
      <ol>
        {(issue.fix_steps || []).map((step, idx) => (
          <li key={idx}>{step}</li>
        ))}
      </ol>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={rerunFromIssue}>Проверить повторно</button>
        <button onClick={() => navigate(`/ai-assistant?issueId=${issue.id}`)}>Открыть AI Assistant</button>
        <button onClick={() => setStatus("mark-fixed")}>Пометить как исправлено</button>
        <button onClick={() => setStatus("ignore")}>Игнорировать</button>
        <button onClick={() => setStatus("false-positive")}>Ложное срабатывание</button>
      </div>
      <div style={{ marginTop: 14 }}>
        <button onClick={() => setShowTech((v) => !v)}>
          {showTech ? "Скрыть" : "Показать"} технические детали
        </button>
        {showTech && renderTechSections(issue)}
      </div>
    </div>
  );
}
