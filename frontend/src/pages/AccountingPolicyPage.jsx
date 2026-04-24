import { useState } from "react";
import { apiFetch } from "../api/client";

export default function AccountingPolicyPage() {
  const [policy, setPolicy] = useState(null);

  const load = async () => {
    const data = await apiFetch("/api/accounting-policy?connection_id=1&organization_id=org-1&period=2026-03-31");
    setPolicy(data);
  };

  return (
    <div>
      <h3>Проверка учетной политики</h3>
      <button onClick={load}>Загрузить</button>
      {policy && <pre>{JSON.stringify(policy, null, 2)}</pre>}
    </div>
  );
}
