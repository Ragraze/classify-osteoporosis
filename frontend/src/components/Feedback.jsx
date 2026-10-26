export function Message({ children, onRetry, kind = "error" }) {
  return (
    <div
      className={`message ${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <p>{children}</p>
      {onRetry && (
        <button className="button secondary" onClick={onRetry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Loading({ children = "Memuat data…" }) {
  return (
    <div className="loading-state" role="status">
      <progress aria-label={children} />
      <p>{children}</p>
    </div>
  );
}
