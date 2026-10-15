import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { LANGS, useI18n } from "../lib/i18n";
import Sheet from "./Sheet";
import PartnerSection from "./PartnerSection";

const SOURCE_URL = "https://github.com/Pablo-Mdz/DressCode";

export default function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t("account.title")} cancelLabel={t("common.close")}>
      <div className="group">
        {user?.displayName && (
          <div className="group-row">
            <span>{t("common.name")}</span>
            <span className="muted">{user.displayName}</span>
          </div>
        )}
        <div className="group-row">
          <span>{t("common.email")}</span>
          <span className="muted ellipsis">{user?.email}</span>
        </div>
      </div>

      <div className="stack-sm">
        <span className="label">{t("account.language")}</span>
        <LanguageSwitch lang={lang} setLang={setLang} label={t("account.language")} />
        <span className="label">{t("account.languageHint")}</span>
      </div>

      <PartnerSection />

      <button className="btn btn-outline btn-block" onClick={() => signOut(auth)}>
        {t("account.signOut")}
      </button>

      {/* AGPL-3.0 §13: users of the hosted app must be able to get its source. */}
      <p className="link" style={{ textAlign: "center" }}>
        {t("account.sourceHint")}{" "}
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
          <strong>{t("account.source")} ↗</strong>
        </a>
      </p>
    </Sheet>
  );
}

export function LanguageSwitch({
  lang,
  setLang,
  label,
  compact = false,
}: {
  lang: string;
  setLang: (l: "es" | "en") => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`segmented ${compact ? "lang-compact" : ""}`} role="group" aria-label={label}>
      {LANGS.map((l) => (
        <button key={l.id} type="button" aria-pressed={lang === l.id} onClick={() => setLang(l.id)} lang={l.id}>
          {compact ? l.id.toUpperCase() : l.label}
        </button>
      ))}
    </div>
  );
}
