import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Sheet from "./Sheet";

export default function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  return (
    <Sheet open={open} onClose={onClose} title="Cuenta" cancelLabel="Cerrar">
      <div className="group">
        {user?.displayName && (
          <div className="group-row">
            <span>Nombre</span>
            <span className="muted">{user.displayName}</span>
          </div>
        )}
        <div className="group-row">
          <span>Email</span>
          <span className="muted ellipsis">{user?.email}</span>
        </div>
      </div>
      <button className="btn btn-outline btn-block" onClick={() => signOut(auth)}>
        Cerrar sesión
      </button>
    </Sheet>
  );
}
