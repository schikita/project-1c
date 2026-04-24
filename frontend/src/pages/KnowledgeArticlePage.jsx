import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import PageLoader from "../components/PageLoader";
import { useToast } from "../components/ToastProvider";

export default function KnowledgeArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch(`/api/knowledge/${slug}`)
      .then((data) => {
        setArticle(data);
        setForm({
          title: data.title,
          slug: data.slug,
          category: data.category,
          symptoms: data.symptoms,
          causes: data.causes,
          checks: data.checks,
          fix_steps: data.fix_steps,
          tags: (data.tags || []).join(", "),
        });
      })
      .catch((err) => setError(err.message));
  }, [slug]);

  const save = async () => {
    try {
      await apiFetch(`/api/knowledge/${article.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(",").map((x) => x.trim()).filter(Boolean) : [],
        }),
      });
      setEditMode(false);
      const updated = await apiFetch(`/api/knowledge/${form.slug}`);
      setArticle(updated);
      showToast("Статья обновлена", "success");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  };

  if (error) return <PageError message={error} />;
  if (!article || !form) return <PageLoader />;

  return (
    <div>
      <h3>{article.title}</h3>
      <button onClick={() => setEditMode((v) => !v)}>{editMode ? "Отмена" : "Редактировать"}</button>
      {editMode ? (
        <div style={{ display: "grid", gap: 8, maxWidth: 640, marginTop: 10 }}>
          <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
          <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
          <textarea value={form.symptoms} onChange={(e) => setForm((p) => ({ ...p, symptoms: e.target.value }))} />
          <textarea value={form.causes} onChange={(e) => setForm((p) => ({ ...p, causes: e.target.value }))} />
          <textarea value={form.checks} onChange={(e) => setForm((p) => ({ ...p, checks: e.target.value }))} />
          <textarea value={form.fix_steps} onChange={(e) => setForm((p) => ({ ...p, fix_steps: e.target.value }))} />
          <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
          <button onClick={save}>Сохранить</button>
        </div>
      ) : (
        <>
          <p><b>Что случилось:</b> {article.symptoms}</p>
          <p><b>Почему случилось:</b> {article.causes}</p>
          <p><b>Где смотреть в 1С:</b> {article.checks}</p>
          <p><b>Как исправить:</b> {article.fix_steps}</p>
        </>
      )}
    </div>
  );
}
