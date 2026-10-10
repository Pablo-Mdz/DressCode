import type { ReactNode } from "react";
import Wordmark from "./Wordmark";
import { useI18n } from "../lib/i18n";

export default function Splash({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="splash">
      <Wordmark />
      {children ?? <div className="spinner" aria-label={t("common.loading")} />}
    </div>
  );
}
