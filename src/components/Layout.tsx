import { NavLink, Outlet } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Wordmark from "./Wordmark";
import { CrownIcon, HangerIcon, LogoutIcon, ScrollIcon } from "./Icons";

export default function Layout() {
  const { user } = useAuth();
  const name = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "";

  return (
    <div className="shell">
      <header className="topbar">
        <Wordmark />
        <div className="topbar-right">
          <span className="greeting">Ciao, {name}</span>
          <button className="icon-btn" onClick={() => signOut(auth)} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Secciones">
        <NavLink to="/ropero" className="tab">
          <HangerIcon />
          <span>Ropero</span>
        </NavLink>
        <NavLink to="/day-style" className="tab tab-center">
          <span className="tab-medallion">
            <CrownIcon />
          </span>
          <span>Day Style</span>
        </NavLink>
        <NavLink to="/historial" className="tab">
          <ScrollIcon />
          <span>Historial</span>
        </NavLink>
      </nav>
    </div>
  );
}
