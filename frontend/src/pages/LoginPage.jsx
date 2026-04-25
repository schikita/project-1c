import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
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
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 4 },
        boxSizing: "border-box",
      }}
    >
      <Card sx={{ width: 420, maxWidth: "100%", boxSizing: "border-box" }}>
        <CardContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
          <Typography variant="h5" sx={{ mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
            Вход в систему
          </Typography>
          <Stack component="form" onSubmit={onSubmit} spacing={2}>
            <TextField value={email} onChange={(e) => setEmail(e.target.value)} label="Email" />
            <TextField value={password} onChange={(e) => setPassword(e.target.value)} type="password" label="Пароль" />
            <Button type="submit" variant="contained">Войти</Button>
          </Stack>
          <PageError message={error} />
        </CardContent>
      </Card>
    </Box>
  );
}
