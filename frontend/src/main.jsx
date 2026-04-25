import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import "./styles.css";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/ToastProvider";
import AccountingPolicyPage from "./pages/AccountingPolicyPage";
import AuditLogPage from "./pages/AuditLogPage";
import ConnectionDetailsPage from "./pages/ConnectionDetailsPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import CreateConnectionPage from "./pages/CreateConnectionPage";
import DashboardPage from "./pages/DashboardPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import DiagnosticIssuePage from "./pages/DiagnosticIssuePage";
import DiagnosticRunPage from "./pages/DiagnosticRunPage";
import IntegrationLogPage from "./pages/IntegrationLogPage";
import KnowledgeArticlePage from "./pages/KnowledgeArticlePage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import LoginPage from "./pages/LoginPage";
import ManualOperationsPage from "./pages/ManualOperationsPage";
import MissingAnalyticsPage from "./pages/MissingAnalyticsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import AIAssistantPage from "./pages/AIAssistantPage";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const theme = createTheme({
    palette: {
      mode: "light",
      primary: { main: "#2563eb" },
      secondary: { main: "#7c3aed" },
      background: { default: "#f3f6fb" },
    },
    shape: { borderRadius: 10 },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="connections" element={<ConnectionsPage />} />
              <Route path="connections/new" element={<CreateConnectionPage />} />
              <Route path="connections/:connectionId" element={<ConnectionDetailsPage />} />
              <Route path="diagnostics" element={<DiagnosticsPage />} />
              <Route path="diagnostics/runs/:runId" element={<DiagnosticRunPage />} />
              <Route path="issues/:issueId" element={<DiagnosticIssuePage />} />
              <Route path="manual-operations" element={<ManualOperationsPage />} />
              <Route path="missing-analytics" element={<MissingAnalyticsPage />} />
              <Route path="accounting-policy" element={<AccountingPolicyPage />} />
              <Route path="knowledge" element={<KnowledgeBasePage />} />
              <Route path="knowledge/:slug" element={<KnowledgeArticlePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="ai-assistant" element={<AIAssistantPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="audit-log" element={<AuditLogPage />} />
              <Route path="integration-log" element={<IntegrationLogPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
