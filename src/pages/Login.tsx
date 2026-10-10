import { useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import Wordmark from "../components/Wordmark";
import { GoogleIcon } from "../components/Icons";

type Mode = "login" | "signup" | "reset";

const ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/wrong-password": "Email o contraseña incorrectos.",
  "auth/user-not-found": "Email o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/invalid-email": "El email no es válido.",
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos.",
  "auth/network-request-failed": "Sin conexión. Revisá tu internet.",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Configuración).",
};

const errorMessage = (err: unknown) => {
  const code = (err as { code?: string }).code ?? "";
  return ERRORS[code] ?? (err instanceof Error ? err.message : String(err));
};

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        await sendPasswordResetEmail(auth, email);
        setInfo("Si el email existe, te llegará un enlace para crear una nueva contraseña.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-blocked") await signInWithRedirect(auth, provider);
      else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError(errorMessage(err));
    }
  }

  return (
    <div className="login">
      <div className="login-crest">
        <Wordmark />
        <span className="crest-line" aria-hidden />
        <p className="tagline">Tu ropero, con criterio</p>
      </div>

      <form onSubmit={submit} className="form login-form">
        {mode !== "login" && (
          <h1 className="login-title">{mode === "signup" ? "Crear cuenta" : "Recuperar acceso"}</h1>
        )}
        {mode === "signup" && (
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@email.com"
            autoComplete="email"
            required
          />
        </label>
        {mode !== "reset" && (
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>
        )}

        {error && <p className="msg msg-error">{error}</p>}
        {info && <p className="msg msg-info">{info}</p>}

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Un momento…" : mode === "login" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
        </button>
      </form>

      {mode !== "reset" && (
        <>
          <div className="or">
            <span>o</span>
          </div>
          <button className="btn btn-outline btn-block" onClick={google} type="button">
            <GoogleIcon /> Continuar con Google
          </button>
        </>
      )}

      <div className="login-links">
        {mode === "login" ? (
          <>
            <button className="link" onClick={() => switchMode("signup")}>
              ¿No tenés cuenta? <strong>Registrate</strong>
            </button>
            <button className="link" onClick={() => switchMode("reset")}>
              Olvidé mi contraseña
            </button>
          </>
        ) : (
          <button className="link" onClick={() => switchMode("login")}>
            Ya tengo cuenta · <strong>Entrar</strong>
          </button>
        )}
      </div>
    </div>
  );
}
