import { NavLink, Outlet } from "react-router-dom";
import { BagIcon, ClockIcon, HangerIcon, SparkleIcon } from "./Icons";

const TABS = [
  { to: "/ropero", label: "Ropero", Icon: HangerIcon },
  { to: "/day-style", label: "Day Style", Icon: SparkleIcon },
  { to: "/shopping", label: "Shopping", Icon: BagIcon },
  { to: "/historial", label: "Historial", Icon: ClockIcon },
];

export default function Layout() {
  return (
    <div className="shell">
      <main className="content">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Secciones">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="tab">
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
