import { collection, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { deleteObject, listAll, ref, type StorageReference } from "firebase/storage";
import { deleteUser } from "firebase/auth";
import { auth, db, storage } from "./firebase";
import { cancelInvite, getCouple, getOutgoingInvite, unlink } from "./couple";
import { translate } from "./i18n";

const COLLECTIONS = ["garments", "folders", "outfits", "shoppingList", "meta"] as const;

async function deleteFolderTree(folder: StorageReference) {
  const { items, prefixes } = await listAll(folder);
  await Promise.all(items.map((item) => deleteObject(item).catch(() => undefined)));
  for (const sub of prefixes) await deleteFolderTree(sub);
}

// Borra todo lo del usuario (pareja, fotos, ropero, historial, lista) y después la cuenta.
// Las reglas permiten a cada uno borrar solo lo suyo, así que se hace desde el teléfono.
export async function deleteAccount(): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error(translate("common.sessionExpired"));

  const [couple, outgoing] = await Promise.all([getCouple().catch(() => null), getOutgoingInvite().catch(() => null)]);
  if (couple) await unlink(couple);
  if (outgoing) await cancelInvite(outgoing);

  await deleteFolderTree(ref(storage, `users/${u.uid}`));

  for (const name of COLLECTIONS) {
    const snap = await getDocs(collection(db, "users", u.uid, name));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, "users", u.uid));

  try {
    await deleteUser(u);
  } catch (err) {
    // Firebase pide un inicio de sesión reciente para borrar la cuenta. Los datos ya no están.
    if ((err as { code?: string }).code === "auth/requires-recent-login") {
      throw new Error(translate("account.deleteRecent"));
    }
    throw err;
  }
}
