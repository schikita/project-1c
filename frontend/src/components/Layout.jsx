import { Link, Outlet } from "react-router-dom";

const linkStyle = { marginRight: 12 };

export default function Layout() {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 16 }}>
      <h2>Диагностический помощник бухгалтера 1С</h2>
      <nav style={{ marginBottom: 16 }}>
        <Link to="/" style={linkStyle}>Главная</Link>
        <Link to="/connections" style={linkStyle}>Подключения</Link>
        <Link to="/diagnostics" style={linkStyle}>Диагностика</Link>
        <Link to="/manual-operations" style={linkStyle}>Ручные операции</Link>
        <Link to="/missing-analytics" style={linkStyle}>Без аналитики</Link>
        <Link to="/accounting-policy" style={linkStyle}>Учетная политика</Link>
        <Link to="/knowledge" style={linkStyle}>База знаний</Link>
        <Link to="/reports" style={linkStyle}>Отчеты</Link>
        <Link to="/users" style={linkStyle}>Пользователи</Link>
        <Link to="/audit-log" style={linkStyle}>Аудит</Link>
        <Link to="/integration-log" style={linkStyle}>Интеграции</Link>
        <Link to="/settings" style={linkStyle}>Настройки</Link>
      </nav>
      <Outlet />
    </div>
  );
}
