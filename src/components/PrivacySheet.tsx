import { useI18n, type MessageKey } from "../lib/i18n";
import Sheet from "./Sheet";

const POINTS: MessageKey[] = [
  "privacy.cost",
  "privacy.storage",
  "privacy.ai",
  "privacy.device",
  "privacy.location",
  "privacy.delete",
];

// Qué pasa con tus datos, en lenguaje simple. Se abre desde el login y desde Cuenta.
export default function PrivacySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t("privacy.title")} cancelLabel={t("common.close")}>
      <ul className="privacy-list">
        {POINTS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </Sheet>
  );
}
