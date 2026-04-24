import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import { useToast } from "../components/ToastProvider";

export default function ConnectionDetailsPage() {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = async () => {
    try {
      const data = await apiFetch(`/api/onec/connections/${connectionId}`);
      setRow(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [connectionId]);

  const remove = async () => {
    try {
      await apiFetch(`/api/onec/connections/${connectionId}`, { method: "DELETE" });
      showToast("Подключение удалено", "success");
      navigate("/connections");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/onec/connections/${connectionId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: row.name,
          base_url: row.base_url,
          username: row.username,
          database_name: row.database_name,
          is_active: row.is_active,
        }),
      });
      await load();
      showToast("Подключение обновлено", "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <PageError message={error} />;
  if (!row || loading) return <PageLoader />;

  return (
    <div>
      <h3>Подключение #{row.id}</h3>
      <p>
        Имя:{" "}
        <input value={row.name} onChange={(e) => setRow((prev) => ({ ...prev, name: e.target.value }))} />
      </p>
      <p>Тип: {row.connection_type}</p>
      <p>
        URL:{" "}
        <input value={row.base_url} onChange={(e) => setRow((prev) => ({ ...prev, base_url: e.target.value }))} />
      </p>
      <p>
        Пользователь:{" "}
        <input value={row.username} onChange={(e) => setRow((prev) => ({ ...prev, username: e.target.value }))} />
      </p>
      <p>
        База:{" "}
        <input value={row.database_name} onChange={(e) => setRow((prev) => ({ ...prev, database_name: e.target.value }))} />
      </p>
      <p>
        Активно:{" "}
        <input
          type="checkbox"
          checked={row.is_active}
          onChange={(e) => setRow((prev) => ({ ...prev, is_active: e.target.checked }))}
        />
      </p>
      <button onClick={save} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</button>
      {" "}
      <button onClick={remove}>Удалить подключение</button>
    </div>
  );
}
