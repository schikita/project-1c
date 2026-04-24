import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import { useToast } from "../components/ToastProvider";

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

  return (
    <div>
      <h3>База знаний</h3>
      <PageError message={error} />
      {loading && <PageLoader />}
      <form onSubmit={createArticle} style={{ display: "grid", gap: 8, maxWidth: 560, marginBottom: 16 }}>
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
  );
}
