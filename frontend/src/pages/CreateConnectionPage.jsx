import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import { useToast } from "../components/ToastProvider";

export default function CreateConnectionPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "Mock connection",
    connection_type: "mock",
    base_url: "mock://local",
    username: "mock",
    password: "mock",
    database_name: "mock_db",
  });
  const [error, setError] = useState("");

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/onec/connections", {
        method: "POST",
        body: JSON.stringify(form),
      });
      showToast("Подключение создано", "success");
      navigate("/connections");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  };

  return (
    <div>
      <h3>Создание подключения</h3>
      <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Имя подключения" />
        <select value={form.connection_type} onChange={(e) => setField("connection_type", e.target.value)}>
          <option value="mock">mock</option>
          <option value="http_extension">http_extension</option>
          <option value="odata">odata</option>
        </select>
        <input value={form.base_url} onChange={(e) => setField("base_url", e.target.value)} placeholder="URL базы" />
        <input value={form.username} onChange={(e) => setField("username", e.target.value)} placeholder="Пользователь" />
        <input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder="Пароль" />
        <input value={form.database_name} onChange={(e) => setField("database_name", e.target.value)} placeholder="Имя базы" />
        <button type="submit">Сохранить</button>
      </form>
      <PageError message={error} />
    </div>
  );
}
