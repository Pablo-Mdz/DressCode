// SPDX-FileCopyrightText: © 2026 Pablo Cigoy
// SPDX-License-Identifier: AGPL-3.0-only

import { useI18n, type MessageKey } from "../lib/i18n";
import Sheet from "./Sheet";

export type LegalDoc = "privacy" | "terms";

const DOCS: Record<LegalDoc, { title: MessageKey; points: MessageKey[] }> = {
  privacy: {
    title: "privacy.title",
    points: [
      "privacy.controller",
      "privacy.cost",
      "privacy.storage",
      "privacy.ai",
      "privacy.device",
      "privacy.location",
      "privacy.hosting",
      "privacy.retention",
      "privacy.rights",
    ],
  },
  terms: {
    title: "terms.title",
    points: [
      "terms.who",
      "terms.free",
      "terms.age",
      "terms.content",
      "terms.ai",
      "terms.service",
      "terms.misuse",
      "terms.delete",
      "terms.law",
    ],
  },
};

// Privacidad y Términos de uso en lenguaje simple. Se abren desde el login y desde Cuenta.
export default function LegalSheet({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  const { t } = useI18n();
  const content = DOCS[doc ?? "privacy"];
  return (
    <Sheet open={doc !== null} onClose={onClose} title={t(content.title)} cancelLabel={t("common.close")}>
      <ul className="privacy-list">
        {content.points.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      <p className="field-hint">{t("legal.updated")}</p>
    </Sheet>
  );
}
