import { useState } from "react";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";

export default function ManualOperationsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/manual-operations?connection_id=1&organization_id=org-1&period_start=2026-03-01&period_end=2026-03-31");
      setItems(data);
      setError("");
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Поиск ручных операций</h3>
      <button onClick={load}>Найти</button>
      <PageError message={error} />
      {loading && <PageLoader />}
      <ul>
        {items.map((x) => (
          <li key={x.ref}>{x.ref} | счет {x.account} | сумма {x.amount} | пользователь {x.user}</li>
        ))}
      </ul>
    </div>
  );
}
