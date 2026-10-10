import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

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

export const auth = getAuth(app);
auth.languageCode = "es";
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, (env.VITE_FIREBASE_FUNCTIONS_REGION as string | undefined) ?? "europe-west1");
