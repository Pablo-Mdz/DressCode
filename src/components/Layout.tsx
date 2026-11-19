import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BagIcon, ClockIcon, HangerIcon, SparkleIcon } from "./Icons";
import { CoupleProvider } from "../context/CoupleContext";
import InviteBanner from "./InviteBanner";
import { useI18n, type MessageKey } from "../lib/i18n";

// Cuando el teclado del teléfono tapa parte de la pantalla, reserva ese espacio abajo
// (variable --kb-h, usada en .content) para que no cubra el botón principal de la página.
// visualViewport solo cambia cuando el teclado realmente aparece o desaparece (con su propia
// animación), nunca durante un toque: por eso no interfiere con el click de ningún botón.
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb-h", `${inset}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
}

const TABS: { to: string; label: MessageKey; Icon: typeof HangerIcon }[] = [
  { to: "/ropero", label: "tab.wardrobe", Icon: HangerIcon },
  { to: "/day-style", label: "tab.dayStyle", Icon: SparkleIcon },
  { to: "/shopping", label: "tab.shopping", Icon: BagIcon },
  { to: "/historial", label: "tab.history", Icon: ClockIcon },
];

export default function Layout() {
  const { t } = useI18n();
  useKeyboardInset();
  return (
    <CoupleProvider>
      <div className="shell">
        <main className="content">
          <InviteBanner />
          <Outlet />
        </main>
        <nav className="tabbar" aria-label={t("tab.sections")}>
          {TABS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className="tab">
              <Icon />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </CoupleProvider>
  );
}
