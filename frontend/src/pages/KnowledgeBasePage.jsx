import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import { useToast } from "../components/ToastProvider";

function normalize(text) {
  return (text || "").toLowerCase();
}

function splitLines(text) {
  return (text || "")
    .split(/\r?\n|;/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildKnowledgeAnswer(question, articles) {
  const q = normalize(question);
  if (!q) return null;

  const top = articles
    .map((a) => {
      const haystack = normalize(
        `${a.title} ${a.category} ${a.symptoms} ${a.causes} ${a.checks} ${a.fix_steps} ${(a.tags || []).join(" ")}`
      );
      const words = q.split(/\s+/).filter((w) => w.length > 2);
      const score = words.reduce((sum, w) => (haystack.includes(w) ? sum + 1 : sum), 0);
      return { article: a, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (top.length === 0) return null;

  const first = top[0].article;
  const checks = splitLines(first.checks).slice(0, 3);
  const steps = splitLines(first.fix_steps).slice(0, 4);

  return {
    title: `Похоже на кейс: ${first.title}`,
    body: [
      first.symptoms ? `Что обычно происходит: ${first.symptoms}` : null,
      first.causes ? `Почему это случается: ${first.causes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    checks,
    steps,
    links: top.map((x) => ({ slug: x.article.slug, title: x.article.title })),
  };
}

function buildAppAnswer(question) {
  const q = normalize(question);
  const has = (arr) => arr.some((x) => q.includes(x));

  if (has(["запуск", "диагност", "проверк"])) {
    return [
      "Откройте раздел «Диагностика» -> создайте запуск -> выберите подключение, организацию и период.",
      "После завершения откройте запуск и просмотрите проблемы.",
      "Для контроля исправлений используйте «Проверить повторно».",
    ];
  }
  if (has(["отчет", "экспорт", "html"])) {
    return [
      "Откройте «Отчеты».",
      "Выберите нужный запуск.",
      "Нажмите «Экспорт HTML» для готового отчета.",
    ];
  }
  if (has(["подключ", "база", "1с"])) {
    return [
      "Откройте «Подключения» и выберите нужную базу 1С.",
      "Нажмите «Проверить», чтобы убедиться, что доступ работает.",
      "После этого запускайте диагностику.",
    ];
  }
  if (has(["ии", "ai", "ассист"])) {
    return [
      "Откройте страницу «AI Assistant».",
      "Укажите ID проблемы и нажмите «Сформировать план».",
      "Используйте шаги из плана и затем сделайте повторную проверку.",
    ];
  }
  return null;
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [form, setForm] = useState({
    title: "",
    slug: "",
    category: "month_close",
    symptoms: "",
    causes: "",
    checks: "",
    fix_steps: "",
    tags: "",
  });
  const [chatInput, setChatInput] = useState("");
  const [isNarrow, setIsNarrow] = useState(typeof window !== "undefined" ? window.innerWidth < 1200 : false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: "Здравствуйте! Я помощник по бухгалтерским кейсам и работе в этом приложении. Задайте вопрос простыми словами.",
    },
  ]);

  const load = async () => {
    try {
      const data = await apiFetch("/api/knowledge");
      setArticles(data);
      setError("");
    } catch (err) {
      setError(err.message);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1200);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const createArticle = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(",").map((x) => x.trim()).filter(Boolean) : [],
        }),
      });
      setForm({
        title: "",
        slug: "",
        category: "month_close",
        symptoms: "",
        causes: "",
        checks: "",
        fix_steps: "",
        tags: "",
      });
      await load();
      showToast("Статья базы знаний создана", "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  };

  const removeArticle = async (id) => {
    try {
      await apiFetch(`/api/knowledge/${id}`, { method: "DELETE" });
      await load();
      showToast("Статья удалена", "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  };

  const popularPrompts = useMemo(
    () => [
      "Как проверить закрытие месяца перед сдачей отчетности?",
      "Что делать, если НДС не сходится?",
      "Как запустить повторную проверку по проблеме?",
      "Где выгрузить HTML-отчет для руководителя?",
    ],
    []
  );

  const askAssistant = (questionRaw) => {
    const question = questionRaw.trim();
    if (!question) return;

    const userMsg = { id: Date.now(), role: "user", text: question };
    setChatMessages((prev) => [...prev, userMsg]);

    const appHint = buildAppAnswer(question);
    const knowledge = buildKnowledgeAnswer(question, articles);

    let text = "";
    if (knowledge) {
      text += `${knowledge.title}\n\n`;
      if (knowledge.body) text += `${knowledge.body}\n\n`;
      if (knowledge.checks.length > 0) {
        text += "Где смотреть в 1С:\n";
        knowledge.checks.forEach((x, i) => {
          text += `${i + 1}. ${x}\n`;
        });
        text += "\n";
      }
      if (knowledge.steps.length > 0) {
        text += "Что сделать:\n";
        knowledge.steps.forEach((x, i) => {
          text += `${i + 1}. ${x}\n`;
        });
        text += "\n";
      }
      if (knowledge.links.length > 0) {
        text += `Связанные статьи: ${knowledge.links.map((x) => x.title).join("; ")}.`;
      }
    } else if (appHint) {
      text = `Вот что сделать в приложении:\n${appHint.map((x, i) => `${i + 1}. ${x}`).join("\n")}`;
    } else {
      text =
        "Пока не нашел точный кейс в базе знаний. Уточните вопрос: укажите категорию (НДС, закрытие месяца, сверки), симптомы и период. Я подберу более точную рекомендацию.";
    }

    setTimeout(() => {
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text }]);
    }, 200);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 1fr) 360px",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div>
        <h3>База знаний</h3>
        <PageError message={error} />
        {loading && <PageLoader />}
        <form onSubmit={createArticle} style={{ display: "grid", gap: 8, maxWidth: 700, marginBottom: 16 }}>
          <input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Заголовок" required />
          <input value={form.slug} onChange={(e) => setField("slug", e.target.value)} placeholder="Слаг" required />
          <input value={form.category} onChange={(e) => setField("category", e.target.value)} placeholder="Категория" required />
          <textarea value={form.symptoms} onChange={(e) => setField("symptoms", e.target.value)} placeholder="Что случилось" required />
          <textarea value={form.causes} onChange={(e) => setField("causes", e.target.value)} placeholder="Почему случилось" required />
          <textarea value={form.checks} onChange={(e) => setField("checks", e.target.value)} placeholder="Где смотреть" required />
          <textarea value={form.fix_steps} onChange={(e) => setField("fix_steps", e.target.value)} placeholder="Как исправить" required />
          <input value={form.tags} onChange={(e) => setField("tags", e.target.value)} placeholder="Tags через запятую" />
          <button type="submit">Создать статью</button>
        </form>
        <ul>
          {articles.map((a) => (
            <li key={a.id}>
              <Link to={`/knowledge/${a.slug}`}>{a.title}</Link> ({a.category})
              {" "}
              <button onClick={() => removeArticle(a.id)}>Удалить</button>
            </li>
          ))}
        </ul>
      </div>

      <aside
        style={{
          position: isNarrow ? "static" : "sticky",
          top: isNarrow ? "auto" : 84,
          alignSelf: "start",
          border: "1px solid #d9dee8",
          borderRadius: 10,
          background: "#fff",
          padding: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          maxHeight: "calc(100vh - 110px)",
          display: "grid",
          gridTemplateRows: "auto auto 1fr auto",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>Чат с ИИ-помощником</div>
          <div style={{ fontSize: 13, color: "#5f6b7a", marginTop: 4 }}>
            Вопросы по бухгалтерии и по работе в приложении.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {popularPrompts.map((p) => (
            <button key={p} type="button" style={{ fontSize: 12, padding: "5px 8px" }} onClick={() => askAssistant(p)}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ overflow: "auto", border: "1px solid #eef1f5", borderRadius: 8, padding: 8, background: "#fbfcfe" }}>
          <div style={{ display: "grid", gap: 8 }}>
            {chatMessages.map((m) => (
              <div
                key={m.id}
                style={{
                  justifySelf: m.role === "user" ? "end" : "start",
                  maxWidth: "95%",
                  background: m.role === "user" ? "#e8f0ff" : "#ffffff",
                  border: "1px solid #dde3ee",
                  borderRadius: 8,
                  padding: "8px 10px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.4,
                  fontSize: 13,
                }}
              >
                {m.text}
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            askAssistant(chatInput);
            setChatInput("");
          }}
          style={{ display: "grid", gap: 8 }}
        >
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Введите вопрос, например: как исправить ошибку по НДС?"
            rows={3}
          />
          <button type="submit">Спросить</button>
        </form>
      </aside>
    </div>
  );
}
