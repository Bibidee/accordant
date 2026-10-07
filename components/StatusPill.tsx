export function StatusPill({ children }: { children: React.ReactNode }) {
  const value = String(children).toUpperCase();
  const variant = value === "ACCEPTED" || value === "COMPLETED" || value === "MET" ? "success" : value === "REVISION_REQUIRED" || value === "NOT_MET" ? "revision" : value === "INCONCLUSIVE" || value === "UNVERIFIABLE" ? "inconclusive" : "";
  return <span className={`pill ${variant}`}><span aria-hidden="true">{variant === "success" ? "✓ " : variant === "revision" ? "↻ " : variant === "inconclusive" ? "! " : ""}</span>{children}</span>;
}
