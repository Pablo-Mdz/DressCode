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
import PrivacySheet from "../components/PrivacySheet";

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
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstTime, setFirstTime] = useState(false); // "¿Es tu primera vez?" tras un login fallido
  const [info, setInfo] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState(false);

  const errorMessage = (err: unknown) => {
    const key = KNOWN_ERRORS[(err as { code?: string }).code ?? ""];
    return key ? t(key) : err instanceof Error ? err.message : String(err);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setFirstTime(false);
    setInfo(null);
  };

  // Al cambiar un campo, el error anterior ya no aplica.
  const edit = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setError(null);
    setFirstTime(false);
  };

  // Validación propia (en el idioma de la app) en vez de los globos del navegador.
  function validate(): string | null {
    if (mode === "signup" && !name.trim()) return t("login.nameRequired");
    if (!email.trim()) return t("login.emailRequired");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return t("auth/invalid-email");
    if (mode !== "reset" && !password) return t("login.passwordRequired");
    if (mode === "signup" && password.length < 6) return t("auth/weak-password");
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const invalid = validate();
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    setFirstTime(false);
    setInfo(null);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
      } else {
        auth.languageCode = lang;
        await sendPasswordResetEmail(auth, email.trim());
        setInfo(t("login.resetSent"));
      }
    } catch (err) {
      setError(errorMessage(err));
      // Firebase no dice si el email existe: a quien entra por primera vez le ofrecemos crear la cuenta.
      if (mode === "login" && KNOWN_ERRORS[(err as { code?: string }).code ?? ""] === "auth/invalid-credential") setFirstTime(true);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (googleBusy) return;
    setError(null);
    setGoogleBusy(true);
    auth.languageCode = lang;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/popup-blocked") await signInWithRedirect(auth, provider);
      else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") setError(errorMessage(err));
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-lang">
        <span className="login-lang-label">{t("login.language")}</span>
        <LanguageSwitch lang={lang} setLang={setLang} label={t("login.language")} compact />
      </div>

      <div className="login-crest">
        <Wordmark />
        <span className="crest-line" aria-hidden />
        <p className="tagline">{t("login.tagline")}</p>
        <p className="login-pitch">{t("login.pitch")}</p>
      </div>

      {mode === "reset" ? (
        <h1 className="login-title">{t("login.resetTitle")}</h1>
      ) : (
        <div className="segmented login-tabs" role="tablist" aria-label={t("login.tabLogin")}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} aria-pressed={mode === m} onClick={() => switchMode(m)}>
              {m === "login" ? t("login.tabLogin") : t("login.tabSignup")}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="form login-form" noValidate>
        {mode === "signup" && (
          <label className="field">
            <span>{t("common.name")}</span>
            <input value={name} onChange={edit(setName)} autoComplete="given-name" maxLength={50} />
          </label>
        )}
        <label className="field">
          <span>{t("common.email")}</span>
          <input
            type="email"
            value={email}
            onChange={edit(setEmail)}
            placeholder={t("login.emailPlaceholder")}
            autoComplete="email"
            maxLength={254}
          />
        </label>
        {mode !== "reset" && (
          <label className="field">
            <span>{t("login.password")}</span>
            <input
              type="password"
              value={password}
              onChange={edit(setPassword)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              maxLength={128}
            />
            {mode === "signup" && <small className="field-hint">{t("login.passwordHint")}</small>}
          </label>
        )}

        {error && (
          <div className="msg msg-error" role="alert">
            {error}
            {firstTime && (
              <button type="button" className="link inline-link" onClick={() => switchMode("signup")}>
                {t("login.firstTime")}
              </button>
            )}
          </div>
        )}
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
        {mode === "signup" && (
          <p className="login-consent">
            {t("login.consent")}{" "}
            <button type="button" className="link inline-link" onClick={() => setPrivacy(true)}>
              {t("privacy.link")}
            </button>
          </p>
        )}
      </form>

      {mode !== "reset" && (
        <>
          <div className="or">
            <span>{t("login.or")}</span>
          </div>
          <button className="btn btn-outline btn-block" onClick={google} type="button" disabled={googleBusy}>
            <GoogleIcon /> {googleBusy ? t("login.googleWait") : t("login.google")}
          </button>
        </>
      )}

      <div className="login-links">
        {mode === "reset" ? (
          <button className="link" onClick={() => switchMode("login")}>
            {t("login.haveAccount")} · <strong>{t("login.signin")}</strong>
          </button>
        ) : (
          <button className="link" onClick={() => switchMode("reset")}>
            {t("login.forgot")}
          </button>
        )}
        <button className="link" onClick={() => setPrivacy(true)}>
          {t("privacy.link")}
        </button>
      </div>

      <PrivacySheet open={privacy} onClose={() => setPrivacy(false)} />
    </div>
  );
}
