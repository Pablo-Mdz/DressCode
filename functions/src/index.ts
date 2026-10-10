// DressCode · Cloud Functions
//   dayStyle             → 2-3 outfits para una ocasión, usando solo prendas del ropero
//   shoppingSuggestions  → qué comprar para sumar variedad, según el ropero y el estilo buscado
//
// Secreto necesario:   firebase functions:secrets:set ANTHROPIC_API_KEY
// Modelo opcional:     variable de entorno ANTHROPIC_MODEL (por defecto claude-opus-5-5)

import { randomUUID } from "node:crypto";
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
const CALL_OPTS = { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300, memory: "512MiB" as const };

// ─────────────────────────── Ropero compartido ───────────────────────────

type Wardrobe = {
  ids: Set<string>;
  blocks: Anthropic.Beta.BetaContentBlockParam[];
};

async function loadWardrobe(uid: string, minGarments: number, emptyMessage: string): Promise<Wardrobe> {
  const userRef = getFirestore().collection("users").doc(uid);
  const [garmentsSnap, foldersSnap] = await Promise.all([
    userRef.collection("garments").orderBy("created_at").limit(MAX_GARMENTS).get(),
    userRef.collection("folders").get(),
  ]);
  if (garmentsSnap.size < minGarments) throw new HttpsError("failed-precondition", emptyMessage);

  const folderNames = new Map(foldersSnap.docs.map((d) => [d.id, String(d.get("name"))]));
  const garments = garmentsSnap.docs.map((d) => ({
    id: d.id,
    folder: folderNames.get(d.get("folder_id")) ?? "Sin carpeta",
    description: ((d.get("description") as string | null) ?? "").trim(),
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

  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: `Este es mi ropero (${garments.length} prendas):` },
  ];
  garments.forEach((g, i) => {
    blocks.push({
      type: "text",
      text: `ID: ${g.id} · Carpeta: ${g.folder} · Descripción: ${g.description || "sin descripción"}`,
    });
    const img = images[i];
    if (img) blocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } });
  });
  // El ropero cambia poco: cacheamos hasta acá para abaratar pedidos seguidos.
  const last = blocks[blocks.length - 1];
  if (last.type === "image" || last.type === "text") last.cache_control = { type: "ephemeral" };

  return { ids: new Set(garments.map((g) => g.id)), blocks };
}

async function askClaude<T>(system: string, content: Anthropic.Beta.BetaContentBlockParam[], schema: object): Promise<T> {
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
        output_config: { effort: "medium", format: { type: "json_schema", schema: schema as Record<string, unknown> } },
        system,
        messages: [{ role: "user", content }],
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
    throw new HttpsError("unavailable", "No pude completar el pedido. Probá de nuevo.");
  }

  if (response.stop_reason === "refusal") {
    throw new HttpsError("invalid-argument", "No puedo ayudarte con ese pedido. Probá describiéndolo de otra forma.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new HttpsError("unavailable", "La respuesta quedó incompleta. Probá de nuevo.");
  }
  logger.info("Claude", { model: response.model, usage: response.usage });

  const text = response.content.find((b) => b.type === "text");
  try {
    return JSON.parse(text && text.type === "text" ? text.text : "") as T;
  } catch {
    throw new HttpsError("unavailable", "No pude interpretar la respuesta. Probá de nuevo.");
  }
}

const STYLIST_VOICE = "Escribí en español rioplatense, con criterio y elegancia, cálido y sin exagerar.";

// ─────────────────────────── Day Style ───────────────────────────

type Weather = {
  description?: string;
  temperature?: number;
  min?: number;
  max?: number;
  precipitationProbability?: number;
  wind?: number;
};

type Suggestion = { title: string; garment_ids: string[]; explanation: string; tip: string };

const DAY_STYLE_PROMPT = `Sos el estilista personal de DressCode: gusto parisino, minimalista y preciso.
Tu tarea: proponer 2 o 3 outfits distintos para la ocasión que describe el usuario, usando EXCLUSIVAMENTE prendas de su ropero.

Reglas:
- Cada prenda del ropero viene con su ID, su carpeta, su descripción (si tiene) y su foto. Mirá las fotos con atención: color, textura, corte, formalidad.
- En garment_ids poné solo IDs que existan en el ropero, copiados exactamente. Nunca inventes prendas.
- Un outfit completo suele tener parte de arriba, parte de abajo y calzado; sumá abrigo o accesorios cuando aporten o el clima lo pida. Si falta alguna categoría en el ropero, armá lo mejor posible y mencionalo en el tip.
- Las alternativas tienen que ser realmente diferentes entre sí (más clásica, más relajada, más audaz, etc.).
- Si hay datos del clima, tenelos en cuenta.
- title: nombre corto y evocador del look (máx. 4 palabras).
- explanation: 2-3 oraciones explicando por qué funciona para la ocasión.
- tip: un consejo concreto de styling (cómo llevarlo, qué ajustar, qué evitar).
- ${STYLIST_VOICE}`;

const DAY_STYLE_SCHEMA = {
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

export const dayStyle = onCall(CALL_OPTS, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Tenés que iniciar sesión.");

  const prompt = String(request.data?.prompt ?? "").trim();
  if (prompt.length < 3) throw new HttpsError("invalid-argument", "Contame un poco más sobre la ocasión.");
  if (prompt.length > 1000) throw new HttpsError("invalid-argument", "La descripción es demasiado larga.");
  const weather: Weather | null = request.data?.weather ?? null;

  const wardrobe = await loadWardrobe(
    uid,
    2,
    "Subí al menos un par de prendas a tu Ropero para que pueda armarte un look.",
  );

  const parsed = await askClaude<{ outfits: Suggestion[] }>(
    DAY_STYLE_PROMPT,
    [...wardrobe.blocks, { type: "text", text: `Ocasión: ${prompt}${describeWeather(weather)}\n\nArmame 2 o 3 outfits.` }],
    DAY_STYLE_SCHEMA,
  );

  // Filtramos IDs inexistentes y outfits vacíos.
  const suggestions = parsed.outfits
    .map((o) => ({ ...o, garment_ids: [...new Set(o.garment_ids)].filter((id) => wardrobe.ids.has(id)) }))
    .filter((o) => o.garment_ids.length > 0)
    .slice(0, 3);
  if (suggestions.length === 0) {
    throw new HttpsError("unavailable", "No encontré una combinación posible. Probá de nuevo.");
  }

  const outfit = { prompt, weather, suggestions, chosen_index: null, created_at: Date.now() };
  const ref = await getFirestore().collection("users").doc(uid).collection("outfits").add(outfit);
  return { outfit: { id: ref.id, ...outfit } };
});

// ─────────────────────────── Shopping ───────────────────────────

const STYLES = ["Formal", "Smart casual", "Casual", "Deportivo", "Minimalista", "Streetwear"];
const BUDGETS = ["Económico", "Medio", "Inversión"];
const SEASONS = ["Otoño-invierno", "Primavera-verano", "Todo el año"];
const KINDS = ["remera", "camisa", "sweater", "campera", "pantalon", "pollera", "vestido", "zapato", "zapatilla", "bolso", "accesorio"];

type ShoppingPrefs = { styles: string[]; notes: string; budget: string; season: string };

type ShoppingItem = {
  id: string;
  name: string;
  kind: string;
  tag: "Esencial" | "Para variar";
  color_name: string;
  color_hex: string;
  material: string;
  new_looks: number;
  why: string;
  pair_ids: string[];
};

const SHOPPING_PROMPT = `Sos el estilista personal de DressCode: gusto parisino, minimalista y preciso.
Tu tarea: analizar el ropero del usuario y sugerir qué COMPRAR para tener más variedad de looks con lo que ya tiene.

Reglas:
- Mirá las fotos y descripciones: detectá huecos (colores, categorías, niveles de formalidad, calzado, abrigo) y prendas que hoy no combinan con casi nada.
- Sugerí entre 3 y 6 prendas, ordenadas de más a menos impacto. Priorizá piezas versátiles que combinen con muchas prendas existentes.
- Respetá el estilo, presupuesto, temporada y comentarios que pida el usuario.
- No sugieras prendas que el usuario ya tiene (mirá el ropero) ni las de la lista "No sugerir".
- tag: "Esencial" si cubre un hueco básico; "Para variar" si suma personalidad o un registro nuevo.
- kind: el tipo de prenda, uno de la lista permitida.
- name: nombre corto y concreto (ej: "Remera negra lisa", "Pantalón azul marino").
- color_name y color_hex: el color sugerido (hex de 6 dígitos con #). material: el material recomendado, breve.
- new_looks: estimación honesta de cuántos looks nuevos y razonables habilita con el ropero actual.
- why: 1-2 oraciones explicando qué hueco cubre y por qué conviene.
- pair_ids: 2 a 4 IDs de prendas del ropero con las que combina mejor, copiados exactamente.
- summary: una lectura del ropero en 1-2 oraciones: qué tiene de bueno y qué le falta.
- ${STYLIST_VOICE}`;

const SHOPPING_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          kind: { type: "string", enum: KINDS },
          tag: { type: "string", enum: ["Esencial", "Para variar"] },
          color_name: { type: "string" },
          color_hex: { type: "string" },
          material: { type: "string" },
          new_looks: { type: "integer" },
          why: { type: "string" },
          pair_ids: { type: "array", items: { type: "string" } },
        },
        required: ["name", "kind", "tag", "color_name", "color_hex", "material", "new_looks", "why", "pair_ids"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "items"],
  additionalProperties: false,
};

function cleanPrefs(raw: unknown): ShoppingPrefs {
  const r = (raw ?? {}) as Partial<ShoppingPrefs>;
  const styles = Array.isArray(r.styles) ? r.styles.filter((s) => STYLES.includes(s)) : [];
  const notes = String(r.notes ?? "").trim().slice(0, 600);
  const budget = BUDGETS.includes(String(r.budget)) ? String(r.budget) : "Medio";
  const season = SEASONS.includes(String(r.season)) ? String(r.season) : "Todo el año";
  return { styles, notes, budget, season };
}

export const shoppingSuggestions = onCall(CALL_OPTS, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Tenés que iniciar sesión.");
  const prefs = cleanPrefs(request.data?.prefs);

  const metaRef = getFirestore().collection("users").doc(uid).collection("meta").doc("shopping");
  const [wardrobe, metaSnap] = await Promise.all([
    loadWardrobe(uid, 3, "Subí al menos 3 prendas a tu Ropero para que pueda ver qué te falta."),
    metaRef.get(),
  ]);
  const excluded = ((metaSnap.get("excluded") as string[] | undefined) ?? []).slice(-50);

  const request_text = [
    `Estilo buscado: ${prefs.styles.length ? prefs.styles.join(", ") : "sin preferencia, el que mejor le quede a mi ropero"}.`,
    `Presupuesto: ${prefs.budget}.`,
    `Temporada: ${prefs.season}.`,
    prefs.notes ? `Comentarios: ${prefs.notes}` : null,
    excluded.length ? `No sugerir (ya las tengo o no me interesan): ${excluded.join("; ")}.` : null,
    "\n¿Qué me conviene comprar para tener más variedad?",
  ]
    .filter(Boolean)
    .join("\n");

  const parsed = await askClaude<{ summary: string; items: Omit<ShoppingItem, "id">[] }>(
    SHOPPING_PROMPT,
    [...wardrobe.blocks, { type: "text", text: request_text }],
    SHOPPING_SCHEMA,
  );

  const items: ShoppingItem[] = parsed.items.slice(0, 6).map((it) => ({
    ...it,
    id: randomUUID(),
    kind: KINDS.includes(it.kind) ? it.kind : "accesorio",
    color_hex: /^#[0-9a-fA-F]{6}$/.test(it.color_hex) ? it.color_hex : "#D9D9D6",
    new_looks: Math.max(0, Math.min(99, Math.round(it.new_looks))),
    pair_ids: [...new Set(it.pair_ids)].filter((id) => wardrobe.ids.has(id)).slice(0, 4),
  }));

  const result = { summary: parsed.summary, items, created_at: Date.now() };
  await metaRef.set({ prefs, result }, { merge: true });
  return { prefs, result };
});
