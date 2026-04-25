import { matchPath } from "react-router-dom";

/**
 * Stable sectionId per route pattern (persisted canvas titles/order in localStorage).
 * Order: more specific patterns first.
 */
const CANVAS_ROUTES = [
  {
    pattern: "/connections/new",
    meta: {
      sectionId: "page-connections-new",
      title: "Новое подключение",
      subtitle: "Создание записи о базе 1С",
      label: "Форма",
    },
  },
  {
    pattern: "/connections/:connectionId",
    meta: {
      sectionId: "page-connections-detail",
      title: "Подключение",
      subtitle: "Параметры, проверка и действия",
      label: "Карточка",
    },
  },
  {
    pattern: "/connections",
    meta: {
      sectionId: "page-connections",
      title: "Подключения",
      subtitle: "Список подключений к 1С",
      label: "Список",
    },
  },
  {
    pattern: "/diagnostics/runs/:runId",
    meta: {
      sectionId: "page-diagnostics-run",
      title: "Запуск диагностики",
      subtitle: "Ход выполнения и результаты",
      label: "Запуск",
    },
  },
  {
    pattern: "/diagnostics",
    meta: {
      sectionId: "page-diagnostics",
      title: "Диагностика",
      subtitle: "Запуски и типы проверок",
      label: "Раздел",
    },
  },
  {
    pattern: "/issues/:issueId",
    meta: {
      sectionId: "page-issue",
      title: "Проблема",
      subtitle: "Описание и рекомендации",
      label: "Карточка",
    },
  },
  {
    pattern: "/manual-operations",
    meta: {
      sectionId: "page-manual-ops",
      title: "Ручные операции",
      subtitle: "Поиск и анализ",
      label: "Содержимое",
    },
  },
  {
    pattern: "/missing-analytics",
    meta: {
      sectionId: "page-missing-analytics",
      title: "Без аналитики",
      subtitle: "Документы без заполненной аналитики",
      label: "Список",
    },
  },
  {
    pattern: "/accounting-policy",
    meta: {
      sectionId: "page-accounting-policy",
      title: "Учётная политика",
      subtitle: "Проверки и отчёты",
      label: "Раздел",
    },
  },
  {
    pattern: "/knowledge/:slug",
    meta: {
      sectionId: "page-knowledge-article",
      title: "Статья",
      subtitle: "База знаний",
      label: "Текст",
    },
  },
  {
    pattern: "/knowledge",
    meta: {
      sectionId: "page-knowledge",
      title: "База знаний",
      subtitle: "Статьи и подсказки",
      label: "Список",
    },
  },
  {
    pattern: "/reports",
    meta: {
      sectionId: "page-reports",
      title: "Отчёты",
      subtitle: "Выгрузки и сводки",
      label: "Раздел",
    },
  },
  {
    pattern: "/users",
    meta: {
      sectionId: "page-users",
      title: "Пользователи",
      subtitle: "Учётные записи",
      label: "Список",
    },
  },
  {
    pattern: "/audit-log",
    meta: {
      sectionId: "page-audit-log",
      title: "Журнал аудита",
      subtitle: "События системы",
      label: "Лог",
    },
  },
  {
    pattern: "/integration-log",
    meta: {
      sectionId: "page-integration-log",
      title: "Журнал интеграции",
      subtitle: "Обмены и ошибки",
      label: "Лог",
    },
  },
  {
    pattern: "/settings",
    meta: {
      sectionId: "page-settings",
      title: "Настройки",
      subtitle: "Параметры приложения",
      label: "Формы",
    },
  },
];

const FALLBACK = {
  sectionId: "page-other",
  title: "Раздел",
  subtitle: "",
  label: "Содержимое",
};

export function getCanvasMeta(pathname) {
  const path = pathname || "/";
  for (const row of CANVAS_ROUTES) {
    const m = matchPath({ path: row.pattern, end: true }, path);
    if (m) return { ...row.meta };
  }
  return { ...FALLBACK };
}
