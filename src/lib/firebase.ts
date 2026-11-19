// SPDX-FileCopyrightText: © 2026 Pablo Cigoy
// SPDX-License-Identifier: AGPL-3.0-only

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isConfigured = Boolean(config.apiKey && config.projectId && config.appId);

const app = initializeApp(isConfigured ? config : { apiKey: "missing", projectId: "missing", appId: "missing" });

// App Check: prueba que los pedidos vienen de esta app (y no de un script con la config pública).
// Solo se activa si hay clave de reCAPTCHA Enterprise; en desarrollo usa un token de depuración.
const appCheckKey = env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (isConfigured && appCheckKey) {
  if (env.DEV) (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(appCheckKey), isTokenAutoRefreshEnabled: true });
}

export const auth = getAuth(app);
auth.languageCode = "es";
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(
  app,
  (env.VITE_FIREBASE_FUNCTIONS_REGION as string | undefined) ?? "europe-west1",
);
