export default function ToastViewport({ toasts }) {
  return (
    <div
      className="toast-viewport"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          className={`toast toast--${toast.type}${toast.exiting ? " toast--exiting" : ""}`}
          role={toast.type === "error" ? "alert" : "status"}
          key={toast.id}
        >
          <p>{toast.message}</p>

        </div>
      ))}
    </div>
  );
}