import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "./firebase";
import { prepareImages } from "./image";
import type { Folder, Garment } from "./types";
import { getLang, translate } from "./i18n";

// Estructura en Firestore:
//   users/{uid}                    → { initialized: true }
//   users/{uid}/folders/{id}       → Folder
//   users/{uid}/garments/{id}      → Garment
//   users/{uid}/outfits/{id}       → Outfit (lo escribe la Cloud Function)

const DEFAULT_FOLDERS = {
  es: ["Camisas", "Remeras", "Pantalones", "Calzado", "Camperas", "Accesorios", "Otros"],
  en: ["Shirts", "T-shirts", "Trousers", "Shoes", "Jackets", "Accessories", "Other"],
};

function uid(): string {
  const id = auth.currentUser?.uid;
  if (!id) throw new Error(translate("common.sessionExpired"));
  return id;
}

export const userCol = (name: "folders" | "garments" | "outfits" | "shoppingList") => collection(db, "users", uid(), name);

// La primera vez que el usuario entra le creamos las carpetas por defecto.
export async function ensureDefaultFolders(userId: string) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) return;
  const batch = writeBatch(db);
  const now = Date.now();
  DEFAULT_FOLDERS[getLang()].forEach((name, position) => {
    batch.set(doc(collection(db, "users", userId, "folders")), { name, position, created_at: now + position });
  });
  batch.set(userRef, { initialized: true, created_at: now });
  await batch.commit();
}

// Al cambiar de idioma, las carpetas por defecto (sin renombrar) pasan al idioma nuevo.
export async function translateDefaultFolders(lang: keyof typeof DEFAULT_FOLDERS): Promise<boolean> {
  const folders = await listFolders();
  const others = Object.entries(DEFAULT_FOLDERS).filter(([l]) => l !== lang).map(([, names]) => names);
  let changed = false;
  for (const f of folders) {
    for (const names of others) {
      const i = names.indexOf(f.name);
      if (i >= 0 && DEFAULT_FOLDERS[lang][i] !== f.name) {
        await renameFolder(f.id, DEFAULT_FOLDERS[lang][i]);
        changed = true;
        break;
      }
    }
  }
  return changed;
}

export async function listFolders(): Promise<Folder[]> {
  const snap = await getDocs(query(userCol("folders"), orderBy("position")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Folder);
}

export async function listGarments(folderId?: string): Promise<Garment[]> {
  const q = folderId ? query(userCol("garments"), where("folder_id", "==", folderId)) : query(userCol("garments"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Garment).sort((a, b) => b.created_at - a.created_at);
}

export async function getGarmentsByIds(ids: string[]): Promise<Garment[]> {
  const out: Garment[] = [];
  // Firestore permite hasta 30 valores por consulta "in".
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await getDocs(query(userCol("garments"), where(documentId(), "in", ids.slice(i, i + 30))));
    out.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Garment));
  }
  return out;
}

export async function createFolder(name: string, position: number): Promise<Folder> {
  const ref = doc(userCol("folders"));
  const folder = { name: name.trim(), position, created_at: Date.now() };
  await setDoc(ref, folder);
  return { id: ref.id, ...folder };
}

export async function renameFolder(id: string, name: string) {
  await updateDoc(doc(userCol("folders"), id), { name: name.trim() });
}

export async function deleteFolder(id: string) {
  const garments = await listGarments(id);
  const batch = writeBatch(db);
  garments.forEach((g) => batch.delete(doc(userCol("garments"), g.id)));
  batch.delete(doc(userCol("folders"), id));
  await batch.commit();
  await removeFiles(garments.flatMap((g) => [g.image_path, g.thumb_path]));
}

export async function uploadGarment(file: File, folderId: string, description: string): Promise<Garment> {
  const userId = uid();
  const { full, thumb } = await prepareImages(file);
  const garmentRef = doc(userCol("garments"));
  const image_path = `users/${userId}/garments/${garmentRef.id}.jpg`;
  const thumb_path = `users/${userId}/garments/${garmentRef.id}_thumb.jpg`;

  try {
    const meta = { contentType: "image/jpeg", cacheControl: "private, max-age=31536000" };
    const [a, b] = await Promise.all([
      uploadBytes(ref(storage, image_path), full, meta),
      uploadBytes(ref(storage, thumb_path), thumb, meta),
    ]);
    const [image_url, thumb_url] = await Promise.all([getDownloadURL(a.ref), getDownloadURL(b.ref)]);
    const garment = {
      folder_id: folderId,
      image_path,
      thumb_path,
      image_url,
      thumb_url,
      description: description.trim() || null,
      created_at: Date.now(),
    };
    await setDoc(garmentRef, garment);
    return { id: garmentRef.id, ...garment };
  } catch (err) {
    await removeFiles([image_path, thumb_path]);
    throw err;
  }
}

// Reemplaza la foto de una prenda (por ejemplo, con el fondo ya quitado).
// Sube archivos nuevos (las reglas de Storage no permiten sobrescribir) y borra los viejos.
export async function replaceGarmentImage(g: Garment, file: File): Promise<Garment> {
  const userId = uid();
  const { full, thumb } = await prepareImages(file);
  const version = Date.now();
  const image_path = `users/${userId}/garments/${g.id}_${version}.jpg`;
  const thumb_path = `users/${userId}/garments/${g.id}_${version}_thumb.jpg`;
  const meta = { contentType: "image/jpeg", cacheControl: "private, max-age=31536000" };
  const [a, b] = await Promise.all([
    uploadBytes(ref(storage, image_path), full, meta),
    uploadBytes(ref(storage, thumb_path), thumb, meta),
  ]);
  const [image_url, thumb_url] = await Promise.all([getDownloadURL(a.ref), getDownloadURL(b.ref)]);
  const patch = { image_path, thumb_path, image_url, thumb_url };
  await updateDoc(doc(userCol("garments"), g.id), patch);
  await removeFiles([g.image_path, g.thumb_path]);
  return { ...g, ...patch };
}

export async function updateGarment(id: string, patch: { description?: string | null; folder_id?: string }) {
  await updateDoc(doc(userCol("garments"), id), patch);
}

export async function deleteGarment(g: Garment) {
  await deleteDoc(doc(userCol("garments"), g.id));
  await removeFiles([g.image_path, g.thumb_path]);
}

async function removeFiles(paths: string[]) {
  await Promise.all(paths.map((p) => deleteObject(ref(storage, p)).catch(() => undefined)));
}
