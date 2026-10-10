import { useState } from "react";
import { useCouple } from "../context/CoupleContext";
import { useI18n } from "../lib/i18n";

// Aviso que ve quien recibió una invitación para vincular roperos.
export default function InviteBanner() {
  const { incoming, accept, decline } = useCouple();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!incoming) return null;

  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError(t("couple.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="banner fade-in invite-banner">
      <div className="banner-text">
        <span className="banner-title">{t("couple.bannerTitle", { name: incoming.from_name })}</span>
        <span className="muted">{t("couple.bannerText")}</span>
      </div>
      {error && <p className="msg msg-error">{error}</p>}
      <div className="row-buttons">
        <button className="btn btn-primary btn-sm" onClick={run(accept)} disabled={busy}>
          {t("couple.accept")}
        </button>
        <button className="btn btn-outline btn-sm" onClick={run(decline)} disabled={busy}>
          {t("couple.decline")}
        </button>
      </div>
    </div>
  );
}
