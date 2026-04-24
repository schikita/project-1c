import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppBar, Box, Button, Container, Toolbar, Typography } from "@mui/material";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const links = [
    ["/", "Главная"],
    ["/connections", "Подключения"],
    ["/diagnostics", "Диагностика"],
    ["/manual-operations", "Ручные операции"],
    ["/missing-analytics", "Без аналитики"],
    ["/accounting-policy", "Учетная политика"],
    ["/knowledge", "База знаний"],
    ["/reports", "Отчеты"],
    ["/users", "Пользователи"],
  ];
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login", { replace: true });
  };

  return (
    <Box>
      <AppBar position="sticky" elevation={1}>
        <Toolbar sx={{ display: "flex", gap: 1, flexWrap: "wrap", py: 1 }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            1C Diagnostic Assistant
          </Typography>
          {links.map(([to, label]) => (
            <Button
              key={to}
              component={Link}
              to={to}
              variant={location.pathname === to ? "contained" : "text"}
              color="inherit"
              sx={{ textTransform: "none", bgcolor: location.pathname === to ? "rgba(255,255,255,0.18)" : "transparent" }}
            >
              {label}
            </Button>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Button
            onClick={logout}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.5)" }}
          >
            Выйти
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
