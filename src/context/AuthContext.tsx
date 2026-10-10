import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { ensureDefaultFolders } from "../lib/wardrobe";

type AuthState = { user: User | null; loading: boolean };

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            await ensureDefaultFolders(user.uid);
          } catch (err) {
            console.error("No se pudieron crear las carpetas por defecto", err);
          }
        }
        setState({ user, loading: false });
      }),
    [],
  );

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
