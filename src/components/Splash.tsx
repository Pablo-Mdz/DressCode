import type { ReactNode } from "react";
import Wordmark from "./Wordmark";

export default function Splash({ children }: { children?: ReactNode }) {
  return (
    <div className="splash">
      <Wordmark />
      {children ?? <div className="spinner" aria-label="Cargando" />}
    </div>
  );
}
