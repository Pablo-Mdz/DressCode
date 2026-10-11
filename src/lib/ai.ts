import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { imageToBase64 } from "./image";
import { translate, type Lang } from "./i18n";
import type { BuyResult, GarmentTags, Outfit } from "./types";

const callTag = httpsCallable<
  { garmentId: string; lang: Lang; sortFolder?: boolean },
  { tags: GarmentTags; description: string | null; folder_id?: string }
>(
  functions,
  "tagGarment",
  { timeout: 60_000 },
);

const callImage = httpsCallable<{ garmentId: string; lang: Lang }, { image: string }>(functions, "garmentImage", {
  timeout: 60_000,
});

// Foto original de una prenda ya guardada (para reprocesarla en el teléfono).
export async function fetchGarmentImage(garmentId: string, lang: Lang): Promise<string> {
  try {
    const { data } = await callImage({ garmentId, lang });
    return data.image;
  } catch (err) {
    throw friendly(err, translate("bg.error"));
  }
}

const callBuy = httpsCallable<{ image: string; note: string; lang: Lang }, { result: BuyResult }>(functions, "shouldBuy", {
  timeout: 300_000,
});

function friendly(err: unknown, fallback: string): Error {
  const message = err instanceof Error ? err.message : "";
  // "internal" / "not-found" llegan, por ejemplo, cuando la función no está publicada en Firebase.
  const generic = !message || ["internal", "not-found", "not found"].includes(message.toLowerCase());
  return new Error(generic ? `${fallback} (${translate("ai.unavailable")})` : message);
}

// Detecta tipo, color, temporada y formalidad de una prenda ya subida.
// Con sortFolder, la IA además la mueve a la carpeta que corresponde.
export async function tagGarment(garmentId: string, lang: Lang, sortFolder = false) {
  try {
    const { data } = await callTag({ garmentId, lang, sortFolder });
    return data;
  } catch (err) {
    throw friendly(err, translate("tags.error"));
  }
}

const callInspire = httpsCallable<{ image: string; note: string; lang: Lang }, { outfit: Outfit }>(functions, "inspireLook", {
  timeout: 300_000,
});

// Inspiración: recrea con el ropero el look de una foto. Queda guardado en el historial.
export async function inspireLook(file: File, note: string, lang: Lang): Promise<Outfit> {
  const image = await imageToBase64(file);
  try {
    const { data } = await callInspire({ image, note, lang });
    return data.outfit;
  } catch (err) {
    throw friendly(err, translate("insp.error"));
  }
}

// "¿Lo compro?": compara la foto de una prenda de la tienda con el ropero.
export async function shouldBuy(file: File, note: string, lang: Lang): Promise<BuyResult> {
  const image = await imageToBase64(file);
  try {
    const { data } = await callBuy({ image, note, lang });
    return data.result;
  } catch (err) {
    throw friendly(err, translate("buy.error"));
  }
}
