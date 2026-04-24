import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import PageError from "../components/PageError";
import { useToast } from "../components/ToastProvider";

export default function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      showToast("Вход выполнен", "success");
      navigate("/");
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Arial, sans-serif" }}>
      <h2>Вход</h2>
      <form onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ width: "100%", marginBottom: 8 }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Пароль" style={{ width: "100%", marginBottom: 8 }} />
        <button type="submit">Войти</button>
      </form>
      <PageError message={error} />
    </div>
  );
}
