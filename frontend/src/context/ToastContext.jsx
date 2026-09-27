import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ToastViewport from "../components/feedback/ToastViewport";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const exitTimers = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    if (exitTimers.current.has(id)) {
      return;
    }

    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === id ? { ...toast, exiting: true } : toast,
      ),
    );

    const exitTimer = setTimeout(() => {
      exitTimers.current.delete(id);
      setToasts((currentToasts) =>
        currentToasts.filter((toast) => toast.id !== id),
      );
    }, 320);

    exitTimers.current.set(id, exitTimer);
  }, []);

  const showToast = useCallback(
    (message, type = "success", duration = 3500) => {
      const id = crypto.randomUUID();

      setToasts((currentToasts) => [
        ...currentToasts,
        {
          id,
          message,
          type,
        },
      ]);

      const timer = setTimeout(() => {
        dismissToast(id);
      }, duration);

      timers.current.set(id, timer);

      return id;
    },
    [dismissToast],
  );

  useEffect(() => {
    const currentTimers = timers.current;
    const currentExitTimers = exitTimers.current;

    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
      currentExitTimers.forEach((timer) => clearTimeout(timer));
      currentExitTimers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,

      success(message, duration) {
        return showToast(message, "success", duration);
      },

      error(message, duration) {
        return showToast(message, "error", duration);
      },

      warning(message, duration) {
        return showToast(message, "warning", duration);
      },

      info(message, duration) {
        return showToast(message, "info", duration);
      },
    }),
    [showToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <ToastViewport
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}