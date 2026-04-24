import { useState } from "react";
import { Alert, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";

export default function AccountingPolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/accounting-policy?connection_id=1&organization_id=org-1&period=2026-03-31");
      setPolicy(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>Проверка учетной политики</Typography>
        <Button variant="contained" onClick={load}>Проверить учетную политику</Button>
        {loading && <PageLoader />}
        <PageError message={error} />
        {policy && (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            <Alert severity={policy.exists ? "success" : "error"}>
              Учетная политика на период: {policy.exists ? "Найдена" : "Не найдена"}
            </Alert>
            <Typography variant="body1">
              Метод оценки МПЗ: <Chip size="small" label={policy.inventory_method || "Не указан"} />
            </Typography>
            <Typography variant="body1">
              Метод учета НДС: <Chip size="small" label={policy.vat_method || "Не указан"} />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Рекомендация: после изменений в 1С повторно запустите диагностику и убедитесь, что связанные проблемы исчезли.
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
