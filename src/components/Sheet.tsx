import { useEffect, type ReactNode } from "react";
import { useI18n } from "../lib/i18n";

// Panel inferior al estilo iOS: "Cancelar" a la izquierda, título y acción opcional a la derecha.
export default function Sheet({
  open,
  onClose,
  title,
  action,
  cancelLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  cancelLabel?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grabber" aria-hidden />
        <div className="sheet-head">
          <button className="text-btn" onClick={onClose}>
            {cancelLabel ?? t("common.cancel")}
          </button>
          <h2 className="sheet-title">{title}</h2>
          {action ? (
            <button className="text-btn strong" onClick={action.onClick} disabled={action.disabled}>
              {action.label}
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
