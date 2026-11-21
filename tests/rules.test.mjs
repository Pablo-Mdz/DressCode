// SPDX-FileCopyrightText: © 2026 Pablo Cigoy
// SPDX-License-Identifier: AGPL-3.0-only

// Tests de las reglas de seguridad (firestore.rules y storage.rules) contra los emuladores de Firebase.
// Correr con: npm run test:rules   (necesita firebase-tools instalado globalmente y Java)

import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

const ANA = { uid: "ana", email: "ana@example.com", email_verified: true };
const BRUNO = { uid: "bruno", email: "bruno@example.com", email_verified: true };
const SIN_VERIFICAR = { uid: "carla", email: "carla@example.com", email_verified: false };

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-dresscode",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
});

after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
});

// El token simulado lleva email y email_verified; el uid va aparte.
const ctx = ({ uid, ...token }) => env.authenticatedContext(uid, token);
const db = (user) => (user ? ctx(user).firestore() : env.unauthenticatedContext().firestore());
const st = (user) => ctx(user).storage();
const seed = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

const invite = (from) => ({ from_uid: from.uid, from_name: "Ana", from_email: from.email, created_at: 1 });

describe("users/{uid}", () => {
  test("cada uno lee y escribe su propio ropero", async () => {
    await assertSucceeds(setDoc(doc(db(ANA), "users/ana/garments/g1"), { description: "Camisa" }));
    await assertSucceeds(getDoc(doc(db(ANA), "users/ana/garments/g1")));
  });

  test("nadie ve ni toca el ropero de otro", async () => {
    await seed((f) => setDoc(doc(f, "users/ana/garments/g1"), { description: "Camisa" }));
    await assertFails(getDoc(doc(db(BRUNO), "users/ana/garments/g1")));
    await assertFails(setDoc(doc(db(BRUNO), "users/ana/garments/g2"), { description: "x" }));
    await assertFails(getDoc(doc(db(null), "users/ana/garments/g1")));
  });
});

describe("usage/{uid} (cupo diario de IA)", () => {
  test("la app no puede leer ni resetear su propio cupo", async () => {
    await seed((f) => setDoc(doc(f, "usage/ana"), { date: "2026-01-01", ai: 30, tag: 0 }));
    await assertFails(getDoc(doc(db(ANA), "usage/ana")));
    await assertFails(setDoc(doc(db(ANA), "usage/ana"), { date: "2026-01-01", ai: 0, tag: 0 }));
    await assertFails(deleteDoc(doc(db(ANA), "usage/ana")));
  });
});

describe("invites/{email}", () => {
  test("se puede invitar a otro email (en minúsculas)", async () => {
    await assertSucceeds(setDoc(doc(db(ANA), "invites/bruno@example.com"), invite(ANA)));
  });

  test("no se puede invitar a sí mismo, en mayúsculas, en nombre de otro ni con campos extra", async () => {
    await assertFails(setDoc(doc(db(ANA), "invites/ana@example.com"), invite(ANA)));
    await assertFails(setDoc(doc(db(ANA), "invites/Bruno@example.com"), invite(ANA)));
    await assertFails(setDoc(doc(db(ANA), "invites/bruno@example.com"), invite(BRUNO)));
    await assertFails(setDoc(doc(db(ANA), "invites/bruno@example.com"), { ...invite(ANA), admin: true }));
  });

  test("quien invita no puede agregar campos al actualizar", async () => {
    await seed((f) => setDoc(doc(f, "invites/bruno@example.com"), invite(ANA)));
    await assertSucceeds(setDoc(doc(db(ANA), "invites/bruno@example.com"), { ...invite(ANA), created_at: 2 }));
    await assertFails(updateDoc(doc(db(ANA), "invites/bruno@example.com"), { extra: "x" }));
  });

  test("la ven quien invita y quien la recibe con email verificado; nadie más", async () => {
    await seed((f) => setDoc(doc(f, "invites/bruno@example.com"), invite(ANA)));
    await seed((f) => setDoc(doc(f, "invites/carla@example.com"), invite(ANA)));
    await assertSucceeds(getDoc(doc(db(ANA), "invites/bruno@example.com")));
    await assertSucceeds(getDoc(doc(db(BRUNO), "invites/bruno@example.com")));
    await assertFails(getDoc(doc(db(SIN_VERIFICAR), "invites/carla@example.com")));
    await assertFails(getDoc(doc(db(SIN_VERIFICAR), "invites/bruno@example.com")));
  });
});

describe("couples/{uidA_uidB}", () => {
  const couple = { members: ["ana", "bruno"], names: { ana: "Ana", bruno: "Bruno" }, created_at: 1 };

  test("se crea solo aceptando una invitación propia", async () => {
    await assertFails(setDoc(doc(db(BRUNO), "couples/ana_bruno"), couple));
    await seed((f) => setDoc(doc(f, "invites/bruno@example.com"), invite(ANA)));
    await assertFails(setDoc(doc(db(BRUNO), "couples/ana_bruno"), { ...couple, extra: 1 }));
    await assertFails(setDoc(doc(db(BRUNO), "couples/bruno_ana"), { ...couple, members: ["bruno", "ana"] }));
    await assertSucceeds(setDoc(doc(db(BRUNO), "couples/ana_bruno"), couple));
  });

  test("solo los miembros la ven, y no se puede modificar", async () => {
    await seed((f) => setDoc(doc(f, "couples/ana_bruno"), couple));
    await assertSucceeds(getDoc(doc(db(ANA), "couples/ana_bruno")));
    await assertFails(getDoc(doc(db(SIN_VERIFICAR), "couples/ana_bruno")));
    await assertFails(updateDoc(doc(db(ANA), "couples/ana_bruno"), { names: { ana: "X", bruno: "Y" } }));
  });

  test("en los looks en pareja solo se puede cambiar el elegido", async () => {
    await seed(async (f) => {
      await setDoc(doc(f, "couples/ana_bruno"), couple);
      await setDoc(doc(f, "couples/ana_bruno/outfits/o1"), { prompt: "Boda", chosen_index: null });
    });
    await assertSucceeds(updateDoc(doc(db(BRUNO), "couples/ana_bruno/outfits/o1"), { chosen_index: 1 }));
    await assertFails(updateDoc(doc(db(BRUNO), "couples/ana_bruno/outfits/o1"), { prompt: "Otro" }));
    await assertFails(getDoc(doc(db(SIN_VERIFICAR), "couples/ana_bruno/outfits/o1")));
  });
});

describe("storage: users/{uid}/**", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

  test("el dueño sube fotos de menos de 5 MB", async () => {
    await assertSucceeds(uploadBytes(ref(st(ANA), "users/ana/garments/g1.jpg"), jpeg, { contentType: "image/jpeg" }));
  });

  test("no se suben archivos que no son imágenes", async () => {
    await assertFails(
      uploadBytes(ref(st(ANA), "users/ana/garments/doc.pdf"), jpeg, { contentType: "application/pdf" }),
    );
  });

  test("no se sube a la carpeta de otro", async () => {
    await assertFails(uploadBytes(ref(st(BRUNO), "users/ana/garments/g2.jpg"), jpeg, { contentType: "image/jpeg" }));
  });

  test("no se sobrescribe una foto existente", async () => {
    await assertSucceeds(uploadBytes(ref(st(ANA), "users/ana/garments/g3.jpg"), jpeg, { contentType: "image/jpeg" }));
    await assertFails(uploadBytes(ref(st(ANA), "users/ana/garments/g3.jpg"), jpeg, { contentType: "image/jpeg" }));
  });

  test("no se sube una imagen de 5 MB o más", async () => {
    const big = new Uint8Array(5 * 1024 * 1024);
    await assertFails(uploadBytes(ref(st(ANA), "users/ana/garments/big.jpg"), big, { contentType: "image/jpeg" }));
  });
});
