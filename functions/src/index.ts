// DressCode · Day Style (Cloud Function)
// Recibe la ocasión (y opcionalmente el clima), lee el ropero del usuario
// y le pide a Claude 2-3 outfits armados SOLO con esas prendas.
//
// Secreto necesario:   firebase functions:secrets:set ANTHROPIC_API_KEY
// Modelo opcional:     variable de entorno ANTHROPIC_MODEL (por defecto claude-opus-5-5)

import Anthropic from "@anthropic-ai/sdk";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";

initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 5 });

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
const MAX_GARMENTS = 120;

type Weather = {
  description?: string;
  temperature?: number;
  min?: number;
  max?: number;
  precipitationProbability?: number;
  wind?: number;
};

type Suggestion = {
  title: string;
  garment_ids: string[];
  explanation: string;
  tip: string;
};

const SYSTEM_PROMPT = `Sos el estilista personal de DressCode, con ojo de alta costura italiana: elegante, audaz, con criterio.
Tu tarea: proponer 2 o 3 outfits distintos para la ocasión que describe el usuario, usando EXCLUSIVAMENTE prendas de su ropero.

Reglas:
- Cada prenda del ropero viene con su ID, su carpeta, su descripción (si tiene) y su foto. Mirá las fotos con atención: color, textura, corte, formalidad.
- En garment_ids poné solo IDs que existan en el ropero, copiados exactamente. Nunca inventes prendas.
- Un outfit completo suele tener parte de arriba, parte de abajo y calzado; sumá abrigo o accesorios cuando aporten o el clima lo pida. Si falta alguna categoría en el ropero, armá lo mejor posible y mencionalo en el tip.
- Las alternativas tienen que ser realmente diferentes entre sí (más clásica, más atrevida, más cómoda, etc.).
- Si hay datos del clima, tenelos en cuenta.
- title: nombre corto y evocador del look (máx. 6 palabras).
- explanation: 2-3 oraciones explicando por qué funciona para la ocasión.
- tip: un consejo concreto de styling (cómo llevarlo, qué ajustar, qué evitar).
- Escribí en español rioplatense, cálido y con estilo, sin exagerar.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    outfits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          garment_ids: { type: "array", items: { type: "string" } },
          explanation: { type: "string" },
          tip: { type: "string" },
        },
        required: ["title", "garment_ids", "explanation", "tip"],
        additionalProperties: false,
      },
    },
  },
  required: ["outfits"],
  additionalProperties: false,
};

function describeWeather(w: Weather | null): string {
  if (!w) return "";
  const parts = [
    w.description,
    w.temperature != null ? `${Math.round(w.temperature)}°C ahora` : null,
    w.min != null && w.max != null ? `mín ${Math.round(w.min)}°C / máx ${Math.round(w.max)}°C` : null,
    w.precipitationProbability != null ? `${w.precipitationProbability}% de probabilidad de lluvia` : null,
    w.wind != null ? `viento ${Math.round(w.wind)} km/h` : null,
  ].filter(Boolean);
  return parts.length ? `\n\nClima de hoy: ${parts.join(", ")}.` : "";
}

export const dayStyle = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300, memory: "512MiB" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Tenés que iniciar sesión.");

    const prompt = String(request.data?.prompt ?? "").trim();
    if (prompt.length < 3) throw new HttpsError("invalid-argument", "Contame un poco más sobre la ocasión.");
    if (prompt.length > 1000) throw new HttpsError("invalid-argument", "La descripción es demasiado larga.");
    const weather: Weather | null = request.data?.weather ?? null;

    const db = getFirestore();
    const userRef = db.collection("users").doc(uid);
    const [garmentsSnap, foldersSnap] = await Promise.all([
      userRef.collection("garments").orderBy("created_at").limit(MAX_GARMENTS).get(),
      userRef.collection("folders").get(),
    ]);
    if (garmentsSnap.size < 2) {
      throw new HttpsError(
        "failed-precondition",
        "Subí al menos un par de prendas a tu Ropero para que pueda armarte un look.",
      );
    }
    const folderNames = new Map(foldersSnap.docs.map((d) => [d.id, String(d.get("name"))]));
    const garments = garmentsSnap.docs.map((d) => ({
      id: d.id,
      folder: folderNames.get(d.get("folder_id")) ?? "Sin carpeta",
      description: (d.get("description") as string | null) ?? "",
      thumbPath: d.get("thumb_path") as string,
    }));

    // Miniaturas en base64: bytes estables, así el prefijo del ropero se puede cachear.
    const bucket = getStorage().bucket();
    const images = await Promise.all(
      garments.map(async (g) => {
        try {
          const [buf] = await bucket.file(g.thumbPath).download();
          return buf.toString("base64");
        } catch (err) {
          logger.warn("No se pudo leer la miniatura", g.thumbPath, err);
          return null;
        }
      }),
    );

    const wardrobe: Anthropic.Beta.BetaContentBlockParam[] = [
      { type: "text", text: `Este es mi ropero (${garments.length} prendas):` },
    ];
    garments.forEach((g, i) => {
      const desc = g.description.trim() || "sin descripción";
      wardrobe.push({ type: "text", text: `ID: ${g.id} · Carpeta: ${g.folder} · Descripción: ${desc}` });
      const img = images[i];
      if (img) wardrobe.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } });
    });
    // El ropero cambia poco: cacheamos hasta acá para abaratar pedidos seguidos.
    const last = wardrobe[wardrobe.length - 1];
    if (last.type === "image" || last.type === "text") last.cache_control = { type: "ephemeral" };

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await anthropic.beta.messages
        .stream({
          model: MODEL,
          max_tokens: 16000,
          // Si el modelo rechaza el pedido, la API lo reintenta con el modelo de respaldo recomendado.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: {
            effort: "medium",
            format: { type: "json_schema", schema: OUTPUT_SCHEMA },
          },
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                ...wardrobe,
                { type: "text", text: `Ocasión: ${prompt}${describeWeather(weather)}\n\nArmame 2 o 3 outfits.` },
              ],
            },
          ],
        })
        .finalMessage();
    } catch (err) {
      logger.error("Error de Anthropic", err);
      if (err instanceof Anthropic.RateLimitError) {
        throw new HttpsError("resource-exhausted", "El estilista está con mucha demanda. Probá de nuevo en un minuto.");
      }
      if (err instanceof Anthropic.AuthenticationError) {
        throw new HttpsError("internal", "Falta configurar la API key de Anthropic.");
      }
      throw new HttpsError("unavailable", "No pude armar tu look. Probá de nuevo.");
    }

    if (response.stop_reason === "refusal") {
      throw new HttpsError("invalid-argument", "No puedo ayudarte con ese pedido. Probá describiendo la ocasión de otra forma.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new HttpsError("unavailable", "La respuesta quedó incompleta. Probá de nuevo.");
    }

    const text = response.content.find((b) => b.type === "text");
    let parsed: { outfits: Suggestion[] };
    try {
      parsed = JSON.parse(text && text.type === "text" ? text.text : "");
    } catch {
      throw new HttpsError("unavailable", "No pude interpretar la respuesta. Probá de nuevo.");
    }

    // Filtramos IDs inexistentes y outfits vacíos.
    const validIds = new Set(garments.map((g) => g.id));
    const suggestions = parsed.outfits
      .map((o) => ({ ...o, garment_ids: [...new Set(o.garment_ids)].filter((id) => validIds.has(id)) }))
      .filter((o) => o.garment_ids.length > 0)
      .slice(0, 3);
    if (suggestions.length === 0) {
      throw new HttpsError("unavailable", "No encontré una combinación posible. Probá de nuevo.");
    }

    const outfit = { prompt, weather, suggestions, chosen_index: null, created_at: Date.now() };
    const ref = await userRef.collection("outfits").add(outfit);
    logger.info("Day Style", { uid, model: response.model, usage: response.usage });

    return { outfit: { id: ref.id, ...outfit } };
  },
);
