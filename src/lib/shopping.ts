import { arrayUnion, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase";
import { userCol } from "./wardrobe";
import type { ListItem, ShoppingItem, ShoppingPrefs, ShoppingResult } from "./types";
import { translate, type Lang } from "./i18n";

// Firestore:
//   users/{uid}/meta/shopping       → { prefs, result, excluded[] }
//   users/{uid}/shoppingList/{id}   → ListItem

export const STYLE_OPTIONS = ["Formal", "Smart casual", "Casual", "Deportivo", "Minimalista", "Streetwear"];
export const BUDGET_OPTIONS = ["Económico", "Medio", "Inversión"];
export const SEASON_OPTIONS = ["Otoño-invierno", "Primavera-verano", "Todo el año"];

export const DEFAULT_PREFS: ShoppingPrefs = { styles: [], notes: "", budget: "Medio", season: "Todo el año" };

const metaRef = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error(translate("common.sessionExpired"));
  return doc(db, "users", uid, "meta", "shopping");
};

const listCol = () => userCol("shoppingList");

export async function loadShopping(): Promise<{ prefs: ShoppingPrefs; result: ShoppingResult | null }> {
  const snap = await getDoc(metaRef());
  const data = snap.data() ?? {};
  return { prefs: { ...DEFAULT_PREFS, ...(data.prefs ?? {}) }, result: (data.result as ShoppingResult) ?? null };
}

const callShopping = httpsCallable<{ prefs: ShoppingPrefs; lang: Lang }, { prefs: ShoppingPrefs; result: ShoppingResult }>(
  functions,
  "shoppingSuggestions",
  { timeout: 300_000 },
);

export async function requestShopping(prefs: ShoppingPrefs, lang: Lang): Promise<ShoppingResult> {
  try {
    const { data } = await callShopping({ prefs, lang });
    return data.result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message && message.toLowerCase() !== "internal") throw new Error(message);
    throw new Error(translate("shop.error"));
  }
}

// "Ya la tengo": no la vuelve a sugerir y la saca de las sugerencias actuales.
export async function dismissItem(result: ShoppingResult, item: ShoppingItem): Promise<ShoppingResult> {
  const next = { ...result, items: result.items.filter((i) => i.id !== item.id) };
  await setDoc(metaRef(), { excluded: arrayUnion(item.name), result: next }, { merge: true });
  return next;
}

export async function listShoppingList(): Promise<ListItem[]> {
  const snap = await getDocs(query(listCol(), orderBy("created_at", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ListItem);
}

export async function addToList(item: ShoppingItem): Promise<ListItem> {
  const ref = doc(listCol());
  const entry = {
    suggestion_id: item.id,
    name: item.name,
    kind: item.kind,
    tag: item.tag,
    color_name: item.color_name,
    color_hex: item.color_hex,
    material: item.material,
    why: item.why,
    created_at: Date.now(),
  };
  await setDoc(ref, entry);
  return { id: ref.id, ...entry };
}

export async function removeFromList(id: string) {
  await deleteDoc(doc(listCol(), id));
}
