import type { ReactNode } from "react";
import Wordmark from "./Wordmark";
import Ornament from "./Ornament";

export default function Splash({ children }: { children?: ReactNode }) {
  return (
    <div className="splash">
      <div className="majolica-bg" aria-hidden />
      <div className="splash-inner">
        <Wordmark size="lg" />
        <Ornament />
        {children ?? <div className="loader" aria-label="Cargando" />}
      </div>
    </div>
  );
}
