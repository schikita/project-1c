import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import SectionCard from "../components/SectionCard";
import { useToast } from "../components/ToastProvider";

const SETTINGS_KEY = "onec.settings.v1";

const DEFAULT_SETTINGS = {
  language: "ru",
  timezone: "Europe/Moscow",
  dateFormat: "dd.MM.yyyy",
  homePage: "dashboard",
  compactMode: false,
  showTechnicalIds: true,
  dashboardRefreshSec: 15,
  runRefreshSec: 3,
  reportsOpenInNewTab: true,
  notifyOnCritical: true,
  notifyOnCompletedRun: false,
  playSoundOnCritical: false,
  sessionTimeoutMin: 120,
};

const toInt = (value, fallback) => {
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) ? next : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function SettingsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importValue, setImportValue] = useState("");

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  });

  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(settings));

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((data) => {
        setProfile(data);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProfile(false));
  }, []);

  const isDirty = useMemo(() => JSON.stringify(settings) !== savedSnapshot, [settings, savedSnapshot]);

  const setField = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const normalized = {
        ...settings,
        dashboardRefreshSec: clamp(toInt(settings.dashboardRefreshSec, DEFAULT_SETTINGS.dashboardRefreshSec), 5, 300),
        runRefreshSec: clamp(toInt(settings.runRefreshSec, DEFAULT_SETTINGS.runRefreshSec), 2, 60),
        sessionTimeoutMin: clamp(toInt(settings.sessionTimeoutMin, DEFAULT_SETTINGS.sessionTimeoutMin), 15, 1440),
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
      setSettings(normalized);
      setSavedSnapshot(JSON.stringify(normalized));
      showToast("Настройки сохранены", "success");
    } catch (err) {
      showToast(err.message || "Не удалось сохранить настройки", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    setSettings({ ...DEFAULT_SETTINGS });
    setSavedSnapshot(JSON.stringify(DEFAULT_SETTINGS));
    setImportValue("");
    showToast("Настройки сброшены к значениям по умолчанию", "info");
  };

  const exportSettings = () => {
    const payload = JSON.stringify(settings, null, 2);
    navigator.clipboard
      .writeText(payload)
      .then(() => showToast("JSON настроек скопирован в буфер", "success"))
      .catch(() => {
        setImportValue(payload);
        showToast("Не удалось скопировать в буфер. JSON выведен в поле импорта", "info");
      });
  };

  const importSettings = () => {
    try {
      const parsed = JSON.parse(importValue);
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      setSettings(merged);
      showToast("JSON импортирован. Нажмите «Сохранить»", "success");
    } catch {
      showToast("Некорректный JSON для импорта", "error");
    }
  };

  const checkApi = async () => {
    try {
      const me = await apiFetch("/api/auth/me");
      showToast(`API доступен. Пользователь: ${me.email}`, "success");
    } catch (err) {
      showToast(`API недоступен: ${err.message}`, "error");
    }
  };

  const logoutEverywhere = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    showToast("Сессия завершена", "info");
    navigate("/login");
  };

  return (
    <div>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Настройки
      </Typography>
      <PageError message={error} />

      {loadingProfile ? (
        <PageLoader />
      ) : (
        <SectionCard title="Профиль">
          <Stack spacing={0.75}>
            <Typography variant="body2">
              Email: <b>{profile?.email || "-"}</b>
            </Typography>
            <Typography variant="body2">
              Роль: <b>{profile?.role || "-"}</b>
            </Typography>
            <Typography variant="body2">
              Имя: <b>{profile?.full_name || "-"}</b>
            </Typography>
          </Stack>
        </SectionCard>
      )}

      <SectionCard title="Интерфейс">
        <Stack spacing={2}>
          <Box sx={{ display: "grid", gap: 12, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
            <TextField
              select
              label="Язык интерфейса"
              value={settings.language}
              onChange={(e) => setField("language", e.target.value)}
            >
              <MenuItem value="ru">Русский</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </TextField>
            <TextField
              select
              label="Часовой пояс"
              value={settings.timezone}
              onChange={(e) => setField("timezone", e.target.value)}
            >
              <MenuItem value="Europe/Moscow">Europe/Moscow</MenuItem>
              <MenuItem value="UTC">UTC</MenuItem>
            </TextField>
            <TextField
              select
              label="Формат даты"
              value={settings.dateFormat}
              onChange={(e) => setField("dateFormat", e.target.value)}
            >
              <MenuItem value="dd.MM.yyyy">dd.MM.yyyy</MenuItem>
              <MenuItem value="yyyy-MM-dd">yyyy-MM-dd</MenuItem>
              <MenuItem value="MM/dd/yyyy">MM/dd/yyyy</MenuItem>
            </TextField>
            <TextField
              select
              label="Стартовая страница"
              value={settings.homePage}
              onChange={(e) => setField("homePage", e.target.value)}
            >
              <MenuItem value="dashboard">Главная</MenuItem>
              <MenuItem value="diagnostics">Диагностика</MenuItem>
              <MenuItem value="reports">Отчеты</MenuItem>
            </TextField>
          </Box>

          <Divider />

          <Box sx={{ display: "grid", gap: 4 }}>
            <FormControlLabel
              control={<Switch checked={settings.compactMode} onChange={(e) => setField("compactMode", e.target.checked)} />}
              label="Компактный режим интерфейса"
            />
            <FormControlLabel
              control={
                <Switch checked={settings.showTechnicalIds} onChange={(e) => setField("showTechnicalIds", e.target.checked)} />
              }
              label="Показывать технические ID в списках"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.reportsOpenInNewTab}
                  onChange={(e) => setField("reportsOpenInNewTab", e.target.checked)}
                />
              }
              label="Открывать HTML-отчеты в новой вкладке"
            />
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard title="Диагностика и уведомления">
        <Stack spacing={2}>
          <Box sx={{ display: "grid", gap: 12, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" } }}>
            <TextField
              type="number"
              label="Обновление дашборда (сек)"
              value={settings.dashboardRefreshSec}
              onChange={(e) => setField("dashboardRefreshSec", e.target.value)}
              inputProps={{ min: 5, max: 300 }}
            />
            <TextField
              type="number"
              label="Обновление запуска (сек)"
              value={settings.runRefreshSec}
              onChange={(e) => setField("runRefreshSec", e.target.value)}
              inputProps={{ min: 2, max: 60 }}
            />
            <TextField
              type="number"
              label="Таймаут сессии (мин)"
              value={settings.sessionTimeoutMin}
              onChange={(e) => setField("sessionTimeoutMin", e.target.value)}
              inputProps={{ min: 15, max: 1440 }}
            />
          </Box>

          <Box sx={{ display: "grid", gap: 4 }}>
            <FormControlLabel
              control={
                <Switch checked={settings.notifyOnCritical} onChange={(e) => setField("notifyOnCritical", e.target.checked)} />
              }
              label="Показывать уведомления о критичных проблемах"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifyOnCompletedRun}
                  onChange={(e) => setField("notifyOnCompletedRun", e.target.checked)}
                />
              }
              label="Показывать уведомления о завершении запуска"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.playSoundOnCritical}
                  onChange={(e) => setField("playSoundOnCritical", e.target.checked)}
                />
              }
              label="Звуковое уведомление о критичных проблемах"
            />
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard title="Сервисные действия">
        <Stack spacing={2}>
          <Alert severity="info">Настройки сохраняются в браузере пользователя (localStorage).</Alert>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={checkApi}>
              Проверить доступность API
            </Button>
            <Button variant="outlined" onClick={exportSettings}>
              Экспорт JSON
            </Button>
            <Button variant="outlined" color="error" onClick={resetSettings}>
              Сбросить по умолчанию
            </Button>
          </Box>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Импорт настроек (JSON)
              </Typography>
              <TextField
                multiline
                minRows={6}
                fullWidth
                value={importValue}
                onChange={(e) => setImportValue(e.target.value)}
                placeholder='{"dashboardRefreshSec": 20, "notifyOnCritical": true}'
              />
              <Box sx={{ mt: 1.5 }}>
                <Button variant="contained" onClick={importSettings}>
                  Импортировать JSON
                </Button>
              </Box>
            </CardContent>
          </Card>
          <Divider />
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="contained" disabled={!isDirty || saving} onClick={saveSettings}>
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button variant="text" color="error" onClick={logoutEverywhere}>
              Выйти из текущей сессии
            </Button>
          </Box>
        </Stack>
      </SectionCard>
    </div>
  );
}
