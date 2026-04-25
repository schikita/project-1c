import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import { useToast } from "../components/ToastProvider";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const { showToast } = useToast();

  const load = async () => {
    try {
      const data = await apiFetch("/api/users");
      setUsers(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRole = async (userId, role) => {
    setBusyId(userId);
    try {
      await apiFetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await load();
      showToast("Роль пользователя обновлена", "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (userId, isActive) => {
    setBusyId(userId);
    try {
      await apiFetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !isActive }),
      });
      await load();
      showToast("Статус пользователя обновлен", "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (userId) => {
    setBusyId(userId);
    try {
      await apiFetch(`/api/users/${userId}`, { method: "DELETE" });
      await load();
      showToast("Пользователь удален", "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h3>Пользователи</h3>
      <PageError message={error} />
      {loading && <PageLoader />}
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            #{u.id} {u.email} | {u.full_name} | роль: {u.role} | активен: {String(u.is_active)}
            {" "}
            <select
              value={u.role}
              onChange={(e) => updateRole(u.id, e.target.value)}
              disabled={busyId === u.id}
            >
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="accountant">accountant</option>
              <option value="auditor">auditor</option>
              <option value="readonly">readonly</option>
              <option value="onec_specialist">onec_specialist</option>
            </select>
            {" "}
            <button
              onClick={() => toggleActive(u.id, u.is_active)}
              disabled={busyId === u.id}
              style={{ marginLeft: 12, marginTop: 4 }}
            >
              {u.is_active ? "Деактивировать" : "Активировать"}
            </button>
            {" "}
            <button onClick={() => removeUser(u.id)} disabled={busyId === u.id} style={{ marginLeft: 12, marginTop: 4 }}>
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
