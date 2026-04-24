import { createContext, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  };

  const showToast = (message, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3500);
  };

  const value = useMemo(() => ({ showToast }), []);

  const bgByType = {
    success: "#e8f8ec",
    error: "#ffeaea",
    info: "#eef4ff",
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position: "fixed", right: 12, bottom: 12, display: "grid", gap: 8, zIndex: 1000 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: bgByType[toast.type] || bgByType.info,
              border: "1px solid #d9d9d9",
              borderRadius: 8,
              padding: "8px 10px",
              minWidth: 220,
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: () => {} };
  }
  return context;
}
