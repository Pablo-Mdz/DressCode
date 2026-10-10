import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { isConfigured } from "./lib/firebase";
import Layout from "./components/Layout";
import Splash from "./components/Splash";
import Login from "./pages/Login";
import Ropero from "./pages/Ropero";
import Carpeta from "./pages/Carpeta";
import DayStyle from "./pages/DayStyle";
import Historial from "./pages/Historial";

export default function App() {
  const { user, loading } = useAuth();

  if (!isConfigured) {
    return (
      <Splash>
        <p className="muted center">
          Falta configurar Firebase. Completá las variables <code>VITE_FIREBASE_*</code> (ver README).
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
        <Route path="/historial" element={<Historial />} />
        <Route path="*" element={<Navigate to="/ropero" replace />} />
      </Route>
    </Routes>
  );
}
