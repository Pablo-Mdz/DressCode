import { deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { getGarmentsByIds, userCol } from "./wardrobe";
import type { Garment, Outfit, Weather } from "./types";
import { translate, type Lang } from "./i18n";

// La IA puede tardar: damos hasta 5 minutos (igual que el timeout de la función).
const dayStyle = httpsCallable<{ prompt: string; weather: Weather | null; lang: Lang }, { outfit: Outfit }>(functions, "dayStyle", {
  timeout: 300_000,
});

export async function requestDayStyle(prompt: string, weather: Weather | null, lang: Lang): Promise<Outfit> {
  try {
    const { data } = await dayStyle({ prompt, weather, lang });
    return data.outfit;
  } catch (err) {
    // Los HttpsError de la función ya traen un mensaje en español.
    const message = err instanceof Error ? err.message : "";
    if (message && message.toLowerCase() !== "internal") throw new Error(message);
    throw new Error(translate("day.error"));
  }
}

export async function listOutfits(): Promise<Outfit[]> {
  const snap = await getDocs(query(userCol("outfits"), orderBy("created_at", "desc"), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Outfit);
}

export async function chooseOutfit(id: string, index: number | null) {
  await updateDoc(doc(userCol("outfits"), id), { chosen_index: index });
}

export async function deleteOutfit(id: string) {
  await deleteDoc(doc(userCol("outfits"), id));
}

// Trae las prendas usadas en una lista de outfits (las borradas simplemente no aparecen).
export async function loadOutfitGarments(outfits: Outfit[]): Promise<Record<string, Garment>> {
  const ids = [...new Set(outfits.flatMap((o) => o.suggestions.flatMap((s) => s.garment_ids)))];
  const list = await getGarmentsByIds(ids);
  return Object.fromEntries(list.map((g) => [g.id, g]));
}
