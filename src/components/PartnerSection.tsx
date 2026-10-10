import { useState, type FormEvent } from "react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useI18n } from "../lib/i18n";
import ConfirmSheet from "./ConfirmSheet";

// Sección "Pareja" dentro de Cuenta: invitar, ver el vínculo o desvincular.
export default function PartnerSection() {
  const { user } = useAuth();
  const { couple, partnerName, outgoing, invite, cancel, unlinkCouple, refresh } = useCouple();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifySent, setVerifySent] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const run = async (fn: () => Promise<void>) => {
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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    run(async () => {
      await invite(email);
      setEmail("");
    });
  };

  const needsVerification = !couple && user?.email && !user.emailVerified;

  return (
    <div className="stack-sm">
      <span className="label">{t("couple.section")}</span>

      {couple ? (
        <div className="group">
          <div className="group-row">
            <span>{t("couple.linked", { name: partnerName })}</span>
            <button className="text-btn danger" onClick={() => setConfirm(true)}>
              {t("couple.unlink")}
            </button>
          </div>
        </div>
      ) : outgoing ? (
        <>
          <p className="msg msg-info">{t("couple.pending", { email: outgoing.email })}</p>
          <button className="btn btn-outline btn-block" onClick={() => run(cancel)} disabled={busy}>
            {t("couple.cancel")}
          </button>
        </>
      ) : (
        <>
          <span className="label">{t("couple.hint")}</span>
          <form className="invite-form" onSubmit={submit}>
            <input
              type="email"
              className="soft-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("couple.emailPlaceholder")}
              autoComplete="off"
              required
            />
            <button className="btn btn-primary" disabled={busy || !email.includes("@")}>
              {busy ? t("couple.inviting") : t("couple.invite")}
            </button>
          </form>
        </>
      )}

      {needsVerification && (
        <div className="stack-sm">
          <span className="label">{verifySent ? t("couple.verifySent") : t("couple.verify")}</span>
          {verifySent ? (
            <button
              className="btn btn-outline btn-block"
              onClick={() =>
                run(async () => {
                  await auth.currentUser?.reload();
                  await auth.currentUser?.getIdToken(true);
                  await refresh();
                })
              }
              disabled={busy}
            >
              {t("couple.verifyDone")}
            </button>
          ) : (
            <button
              className="btn btn-outline btn-block"
              onClick={() =>
                run(async () => {
                  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
                  setVerifySent(true);
                })
              }
              disabled={busy}
            >
              {t("couple.verifySend")}
            </button>
          )}
        </div>
      )}

      {error && <p className="msg msg-error">{error}</p>}

      <ConfirmSheet
        open={confirm}
        title={t("couple.unlinkTitle")}
        message={t("couple.unlinkMessage")}
        confirmLabel={t("couple.unlink")}
        onClose={() => setConfirm(false)}
        onConfirm={unlinkCouple}
      />
    </div>
  );
}
