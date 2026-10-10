import { NavLink, Outlet } from "react-router-dom";
import { BagIcon, ClockIcon, HangerIcon, SparkleIcon } from "./Icons";
import { useI18n, type MessageKey } from "../lib/i18n";

const TABS: { to: string; label: MessageKey; Icon: typeof HangerIcon }[] = [
  { to: "/ropero", label: "tab.wardrobe", Icon: HangerIcon },
  { to: "/day-style", label: "tab.dayStyle", Icon: SparkleIcon },
  { to: "/shopping", label: "tab.shopping", Icon: BagIcon },
  { to: "/historial", label: "tab.history", Icon: ClockIcon },
];

export default function Layout() {
  const { t } = useI18n();
  return (
    <div className="shell">
      <main className="content">
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
  );
}
