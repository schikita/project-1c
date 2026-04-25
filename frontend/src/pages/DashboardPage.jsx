import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Box, Card, CardContent, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { apiFetch } from "../api/client";
import PageLoader from "../components/PageLoader";
import SeverityBadge from "../components/SeverityBadge";
import { DesignCanvas, DCArtboard, DCPostIt, DCSection } from "../components/design/DesignCanvas";

function MiniStat({ title, value }) {
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" sx={{ mt: 0.5, fontSize: { xs: "1.35rem", sm: "1.5rem" } }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));

  const [runs, setRuns] = useState([]);
  const [criticalIssues, setCriticalIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRuns = async () => {
    try {
      const data = await apiFetch("/api/diagnostics/runs");
      setRuns(data);
    } catch (_err) {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
    const timer = setInterval(loadRuns, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadCriticalIssues = async () => {
      try {
        const recentRuns = runs.slice(0, 5);
        const issuesByRun = await Promise.all(
          recentRuns.map(async (run) => {
            const issues = await apiFetch(`/api/diagnostics/runs/${run.id}/issues`);
            return issues.map((issue) => ({ ...issue, run_id: run.id }));
          })
        );
        const merged = issuesByRun.flat();
        const top = merged
          .filter((issue) => issue.severity === "critical" || issue.severity === "high")
          .slice(0, 8);
        setCriticalIssues(top);
      } catch (_err) {
        setCriticalIssues([]);
      }
    };

    if (runs.length > 0) {
      loadCriticalIssues();
    }
  }, [runs]);

  const totalRuns = runs.length;
  const runningRuns = runs.filter((r) => r.status === "running" || r.status === "pending").length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;

  const statW = isXs ? "min(calc(100vw - 48px), 280px)" : 220;
  const statH = isXs ? 140 : 160;
  const linksW = isXs ? "min(calc(100vw - 32px), 520px)" : 520;
  const linksH = isMdDown ? "min(240px, 50dvh)" : 220;
  const listW = isXs ? "min(calc(100vw - 32px), 620px)" : isMdDown ? "min(calc(100vw - 48px), 560px)" : 560;
  const issuesW = isXs ? "min(calc(100vw - 32px), 640px)" : isMdDown ? "min(calc(100vw - 48px), 620px)" : 620;
  const listH = isMdDown ? "min(52dvh, 520px)" : 420;
  const issuesH = isMdDown ? "min(56dvh, 560px)" : 440;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
      {loading && (
        <Box sx={{ position: "absolute", top: { xs: 8, sm: 16 }, left: { xs: 8, sm: 16 }, zIndex: 2 }}>
          <PageLoader />
        </Box>
      )}
      <DesignCanvas minScale={0.12} maxScale={4} style={{ flex: 1, minHeight: 0 }}>
        <DCSection id="metrics" title="Показатели" subtitle="Сводка по запускам диагностики" gap={isXs ? 20 : 48}>
          <DCArtboard id="total" label="Всего запусков" width={statW} height={statH}>
            <MiniStat title="Всего запусков" value={totalRuns} />
          </DCArtboard>
          <DCArtboard id="running" label="В работе" width={statW} height={statH}>
            <MiniStat title="В работе" value={runningRuns} />
          </DCArtboard>
          <DCArtboard id="done" label="Завершено" width={statW} height={statH}>
            <MiniStat title="Завершено" value={completedRuns} />
          </DCArtboard>
          <DCArtboard id="failed" label="С ошибкой" width={statW} height={statH}>
            <MiniStat title="С ошибкой" value={failedRuns} />
          </DCArtboard>
          {!isXs ? (
            <DCPostIt top={8} right={24} rotate={-3} width={200}>
              Колёсико: зум по макету. Фон: панорама. Средняя кнопка или перетаскивание фона — движение холста.
            </DCPostIt>
          ) : null}
        </DCSection>

        <DCSection id="actions" title="Быстрые действия" subtitle="Частые переходы" gap={isXs ? 20 : 48}>
          <DCArtboard id="links" label="Ссылки" width={linksW} height={linksH} scrollable>
            <Box sx={{ p: { xs: 1, sm: 2 }, height: "100%" }}>
              <Alert severity="info" sx={{ py: 0.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    flexWrap: "wrap",
                    gap: { xs: 0.75, sm: 1 },
                    alignItems: { xs: "flex-start", sm: "center" },
                    "& a": { typography: "body2" },
                  }}
                >
                  <Link to="/diagnostics">Проверить перед/после закрытия</Link>
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, color: "text.disabled" }}>
                    ·
                  </Box>
                  <Link to="/manual-operations">Ручные операции</Link>
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, color: "text.disabled" }}>
                    ·
                  </Box>
                  <Link to="/missing-analytics">Без аналитики</Link>
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, color: "text.disabled" }}>
                    ·
                  </Box>
                  <Link to="/accounting-policy">Учётная политика</Link>
                </Box>
              </Alert>
            </Box>
          </DCArtboard>
        </DCSection>

        <DCSection id="runs" title="Последние диагностики" subtitle="До пяти последних запусков" gap={isXs ? 20 : 48}>
          <DCArtboard id="runs-list" label="Список запусков" width={listW} height={listH} scrollable>
            <Box sx={{ p: { xs: 1, sm: 1.5 }, height: "100%" }}>
              <Stack spacing={1}>
                {runs.slice(0, 5).map((run) => (
                  <Card key={run.id} variant="outlined">
                    <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                        <Link to={`/diagnostics/runs/${run.id}`}>#{run.id}</Link> — {run.diagnostic_type} — {run.status}{" "}
                        ({run.progress_percent}%)
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
                {runs.length === 0 && !loading && (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                    Запусков пока нет.
                  </Typography>
                )}
              </Stack>
            </Box>
          </DCArtboard>
        </DCSection>

        <DCSection id="issues" title="Критичные проблемы" subtitle="Высокая и критическая важность" gap={isXs ? 20 : 48}>
          <DCArtboard id="issues-list" label="Список проблем" width={issuesW} height={issuesH} scrollable>
            <Box sx={{ p: { xs: 1, sm: 1.5 }, height: "100%" }}>
              {criticalIssues.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  Критичные проблемы не найдены.
                </Typography>
              )}
              <Stack spacing={1}>
                {criticalIssues.map((issue) => (
                  <Card key={issue.id} variant="outlined">
                    <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                        <Link to={`/issues/${issue.id}`}>{issue.title}</Link> <SeverityBadge severity={issue.severity} /> (
                        {issue.category})
                        {issue.run_id ? (
                          <>
                            {" "}
                            — запуск <Link to={`/diagnostics/runs/${issue.run_id}`}>#{issue.run_id}</Link>
                          </>
                        ) : null}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          </DCArtboard>
          {!isXs ? (
            <DCPostIt bottom={-12} left={48} rotate={2} width={190}>
              Подписи секций и артбордов можно править. Порядок карточек сохраняется в браузере.
            </DCPostIt>
          ) : null}
        </DCSection>
      </DesignCanvas>
    </Box>
  );
}
