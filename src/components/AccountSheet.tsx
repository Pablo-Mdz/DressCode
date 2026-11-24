// SPDX-FileCopyrightText: © 2026 Pablo Cigoy
// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { deleteAccount } from "../lib/account";
import { translateDefaultFolders } from "../lib/wardrobe";
import ConfirmSheet from "./ConfirmSheet";
import LegalSheet, { type LegalDoc } from "./LegalSheet";
import { useAuth } from "../context/AuthContext";
import { LANGS, useI18n } from "../lib/i18n";
import Sheet from "./Sheet";
import PartnerSection from "./PartnerSection";

const SOURCE_URL = "https://github.com/Pablo-Mdz/DressCode";

export default function AccountSheet({
  open,
  onClose,
  onFoldersChanged,
}: {
  open: boolean;
  onClose: () => void;
  onFoldersChanged?: () => void;
}) {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const changeLang = (l: "es" | "en") => {
    setLang(l);
    translateDefaultFolders(l)
      .then((changed) => changed && onFoldersChanged?.())
      .catch(() => undefined);
  };
  return (
    <>
      <Sheet
        open={open && !legal && !confirmDelete}
        onClose={onClose}
        title={t("account.title")}
        cancelLabel={t("common.close")}
      >
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
          <LanguageSwitch lang={lang} setLang={changeLang} label={t("account.language")} />
          <span className="label">{t("account.languageHint")}</span>
        </div>

        <PartnerSection />

        <div className="two-buttons">
          <button className="btn btn-outline" onClick={() => setLegal("terms")}>
            {t("account.terms")}
          </button>
          <button className="btn btn-outline" onClick={() => setLegal("privacy")}>
            {t("account.privacy")}
          </button>
        </div>
        <button className="btn btn-outline btn-block" onClick={() => signOut(auth)}>
          {t("account.signOut")}
        </button>
        <button className="btn btn-danger-text btn-block" onClick={() => setConfirmDelete(true)}>
          {t("account.delete")}
        </button>

        {/* AGPL-3.0 §13: quien usa la app publicada tiene que poder obtener su código fuente. */}
        <p className="link" style={{ textAlign: "center" }}>
          {t("account.sourceHint")}{" "}
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            <strong>{t("account.source")} ↗</strong>
          </a>
        </p>
      </Sheet>
      <LegalSheet doc={open ? legal : null} onClose={() => setLegal(null)} />
      <ConfirmSheet
        open={open && confirmDelete}
        title={t("account.delete")}
        message={t("account.deleteMessage")}
        confirmLabel={t("account.delete")}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
      />
    </>
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
