import { useState } from "react";
import Sheet from "./Sheet";

export default function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="sheet-text">{message}</p>
      {error && <p className="msg msg-error">{error}</p>}
      <button
        className="btn btn-danger btn-block"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await onConfirm();
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Algo salió mal");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Eliminando…" : confirmLabel}
      </button>
    </Sheet>
  );
}
