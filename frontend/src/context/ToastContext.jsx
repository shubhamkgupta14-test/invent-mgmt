import { createContext, useState, useCallback } from "react";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";

const ToastContext = createContext(null);

export { ToastContext };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now();
    const content = typeof message === "object" && message !== null
      ? message
      : { title: String(message) };
    const toast = {
      id,
      title: content.title || content.message || "Notification",
      description: Array.isArray(content.description)
        ? content.description
        : content.description ? [content.description] : [],
      type,
    };
    const effectiveDuration = toast.description.length && duration === 3000
      ? 6000
      : duration;

    setToasts((prev) => [...prev, toast]);

    if (effectiveDuration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, effectiveDuration);
    }

    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <FaCheckCircle className="text-emerald-600 text-lg flex-shrink-0" />
        );
      case "error":
        return (
          <FaExclamationCircle className="text-rose-600 text-lg flex-shrink-0" />
        );
      case "warning":
        return (
          <FaExclamationCircle className="text-amber-600 text-lg flex-shrink-0" />
        );
      case "info":
        return <FaInfoCircle className="text-blue-600 text-lg flex-shrink-0" />;
      default:
        return null;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-emerald-50 border border-emerald-200";
      case "error":
        return "bg-rose-50 border border-rose-200";
      case "warning":
        return "bg-amber-50 border border-amber-200";
      case "info":
        return "bg-blue-50 border border-blue-200";
      default:
        return "bg-slate-50 border border-slate-200";
    }
  };

  const getTextColor = () => {
    switch (toast.type) {
      case "success":
        return "text-emerald-800";
      case "error":
        return "text-rose-800";
      case "warning":
        return "text-amber-800";
      case "info":
        return "text-blue-800";
      default:
        return "text-slate-800";
    }
  };

  return (
    <div
      className={`${getStyles()} rounded-xl shadow-lg p-4 flex items-start gap-3 max-w-md pointer-events-auto animate-slideInFromRight`}
    >
      {getIcon()}
      <div className={`min-w-0 flex-1 ${getTextColor()}`}>
        <p className="font-semibold">{toast.title}</p>
        {toast.description.length > 0 && (
          <ul className="mt-1.5 space-y-1 text-sm font-medium opacity-90">
            {toast.description.map((description, index) => (
              <li key={`${description}-${index}`} className="leading-5">
                {description}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className={`flex-shrink-0 mt-0.5 ${getTextColor()} hover:opacity-70 transition-opacity`}
      >
        <FaTimes size={16} />
      </button>
    </div>
  );
}
