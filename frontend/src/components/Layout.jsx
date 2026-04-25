import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isCompactNav = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    ["/", "Главная"],
    ["/connections", "Подключения"],
    ["/diagnostics", "Диагностика"],
    ["/manual-operations", "Ручные операции"],
    ["/missing-analytics", "Без аналитики"],
    ["/accounting-policy", "Учетная политика"],
    ["/knowledge", "База знаний"],
    ["/reports", "Отчеты"],
    ["/ai-assistant", "AI Assistant"],
    ["/users", "Пользователи"],
    ["/settings", "Настройки"],
  ];

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login", { replace: true });
  };

  const closeDrawer = () => setDrawerOpen(false);

  const drawerList = (
    <Box sx={{ width: 280, pt: 1 }} role="presentation" onClick={closeDrawer}>
      <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: "text.secondary" }}>
        Разделы
      </Typography>
      <List dense>
        {links.map(([to, label]) => (
          <ListItemButton
            key={to}
            component={Link}
            to={to}
            selected={location.pathname === to}
            sx={{ borderRadius: 1, mx: 1 }}
          >
            <ListItemText primary={label} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 1 }} />
      <List dense>
        <ListItemButton component={Link} to="/audit-log" selected={location.pathname === "/audit-log"} sx={{ borderRadius: 1, mx: 1 }}>
          <ListItemText primary="Журнал аудита" />
        </ListItemButton>
        <ListItemButton
          component={Link}
          to="/integration-log"
          selected={location.pathname === "/integration-log"}
          sx={{ borderRadius: 1, mx: 1 }}
        >
          <ListItemText primary="Журнал интеграции" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar sx={{ display: "flex", gap: 1, flexWrap: "nowrap", alignItems: "center", py: 1, minHeight: { xs: 56, sm: 64 } }}>
          {isCompactNav ? (
            <IconButton color="inherit" edge="start" aria-label="Открыть меню" onClick={() => setDrawerOpen(true)} sx={{ mr: 0.5 }}>
              <MenuIcon />
            </IconButton>
          ) : null}
          <Typography
            component={Link}
            to="/"
            variant="h6"
            sx={{
              mr: { xs: 0, md: 2 },
              color: "inherit",
              textDecoration: "none",
              whiteSpace: { xs: "nowrap", md: "normal" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: { xs: "42vw", sm: "none" },
              fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
            }}
          >
            1C Diagnostic
          </Typography>
          {!isCompactNav ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center", flex: 1, minWidth: 0 }}>
              {links.map(([to, label]) => (
                <Button
                  key={to}
                  component={Link}
                  to={to}
                  variant={location.pathname === to ? "contained" : "text"}
                  color="inherit"
                  size="small"
                  sx={{
                    textTransform: "none",
                    bgcolor: location.pathname === to ? "rgba(255,255,255,0.18)" : "transparent",
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1 }} />
          )}
          <Button
            onClick={logout}
            variant="outlined"
            color="inherit"
            size={isCompactNav ? "small" : "medium"}
            sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.5)", flexShrink: 0 }}
          >
            Выйти
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={closeDrawer} PaperProps={{ sx: { width: 280 } }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="subtitle1">Меню</Typography>
          <IconButton aria-label="Закрыть" onClick={closeDrawer} edge="end">
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        {drawerList}
      </Drawer>

      <Container component="main" maxWidth="xl" sx={{ py: { xs: 2, md: 3 }, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
