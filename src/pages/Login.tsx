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
import { LanguageSwitch } from "../components/AccountSheet";
import { useI18n, type MessageKey } from "../lib/i18n";

type Mode = "login" | "signup" | "reset";

const KNOWN_ERRORS: Record<string, MessageKey> = {
  "auth/invalid-credential": "auth/invalid-credential",
  "auth/wrong-password": "auth/invalid-credential",
  "auth/user-not-found": "auth/invalid-credential",
  "auth/email-already-in-use": "auth/email-already-in-use",
  "auth/weak-password": "auth/weak-password",
  "auth/invalid-email": "auth/invalid-email",
  "auth/too-many-requests": "auth/too-many-requests",
  "auth/network-request-failed": "auth/network-request-failed",
  "auth/unauthorized-domain": "auth/unauthorized-domain",
};

export default function Login() {
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const errorMessage = (err: unknown) => {
    const key = KNOWN_ERRORS[(err as { code?: string }).code ?? ""];
    return key ? t(key) : err instanceof Error ? err.message : String(err);
  };

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
        auth.languageCode = lang;
        await sendPasswordResetEmail(auth, email);
        setInfo(t("login.resetSent"));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    auth.languageCode = lang;
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
      <div className="login-lang">
        <LanguageSwitch lang={lang} setLang={setLang} label={t("login.language")} compact />
      </div>

      <div className="login-crest">
        <Wordmark />
        <span className="crest-line" aria-hidden />
        <p className="tagline">{t("login.tagline")}</p>
      </div>

      <form onSubmit={submit} className="form login-form">
        {mode !== "login" && (
          <h1 className="login-title">{mode === "signup" ? t("login.signupTitle") : t("login.resetTitle")}</h1>
        )}
        {mode === "signup" && (
          <label className="field">
            <span>{t("common.name")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
          </label>
        )}
        <label className="field">
          <span>{t("common.email")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("login.emailPlaceholder")}
            autoComplete="email"
            required
          />
        </label>
        {mode !== "reset" && (
          <label className="field">
            <span>{t("login.password")}</span>
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
          {busy
            ? t("login.wait")
            : mode === "login"
              ? t("login.submitLogin")
              : mode === "signup"
                ? t("login.submitSignup")
                : t("login.submitReset")}
        </button>
      </form>

      {mode !== "reset" && (
        <>
          <div className="or">
            <span>{t("login.or")}</span>
          </div>
          <button className="btn btn-outline btn-block" onClick={google} type="button">
            <GoogleIcon /> {t("login.google")}
          </button>
        </>
      )}

      <div className="login-links">
        {mode === "login" ? (
          <>
            <button className="link" onClick={() => switchMode("signup")}>
              {t("login.noAccount")} <strong>{t("login.signup")}</strong>
            </button>
            <button className="link" onClick={() => switchMode("reset")}>
              {t("login.forgot")}
            </button>
          </>
        ) : (
          <button className="link" onClick={() => switchMode("login")}>
            {t("login.haveAccount")} · <strong>{t("login.signin")}</strong>
          </button>
        )}
      </div>
    </div>
  );
}
