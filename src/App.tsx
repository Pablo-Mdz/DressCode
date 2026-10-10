import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { isConfigured } from "./lib/firebase";
import { useI18n } from "./lib/i18n";
import Layout from "./components/Layout";
import Splash from "./components/Splash";
import Login from "./pages/Login";
import Ropero from "./pages/Ropero";
import Carpeta from "./pages/Carpeta";
import DayStyle from "./pages/DayStyle";
import Historial from "./pages/Historial";
import Shopping from "./pages/Shopping";

export default function App() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (!isConfigured) {
    return (
      <Splash>
        <p className="muted center">
          {t("common.notConfigured", { vars: "VITE_FIREBASE_*" })}
        </p>
      </Splash>
    );
  }
  if (loading) return <Splash />;
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/ropero" replace />} />
        <Route path="/ropero" element={<Ropero />} />
        <Route path="/ropero/:folderId" element={<Carpeta />} />
        <Route path="/day-style" element={<DayStyle />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="*" element={<Navigate to="/ropero" replace />} />
      </Route>
    </Routes>
  );
}
