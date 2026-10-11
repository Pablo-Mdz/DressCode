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
// Modelo rápido y económico para etiquetar prendas al subirlas.
const TAG_MODEL = process.env.ANTHROPIC_TAG_MODEL ?? "claude-haiku-5-5";
const MAX_GARMENTS = 120;
const CALL_OPTS = { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300, memory: "512MiB" as const };

// ─────────────────────────── Idioma ───────────────────────────

type Lang = "es" | "en";
const pickLang = (raw: unknown): Lang => (raw === "en" ? "en" : "es");

const MESSAGES = {
  es: {
    unauthenticated: "Tenés que iniciar sesión.",
    rateLimited: "El estilista está con mucha demanda. Probá de nuevo en un minuto.",
    missingKey: "Falta configurar la API key de Anthropic.",
    unavailable: "No pude completar el pedido. Probá de nuevo.",
    refusal: "No puedo ayudarte con ese pedido. Probá describiéndolo de otra forma.",
    truncated: "La respuesta quedó incompleta. Probá de nuevo.",
    unparseable: "No pude interpretar la respuesta. Probá de nuevo.",
    promptShort: "Contame un poco más sobre la ocasión.",
    promptLong: "La descripción es demasiado larga.",
    needTwo: "Subí al menos un par de prendas a tu Ropero para que pueda armarte un look.",
    needThree: "Subí al menos 3 prendas a tu Ropero para que pueda ver qué te falta.",
    needOne: "Subí al menos una prenda a tu Ropero para que pueda compararla.",
    noCouple: "Todavía no estás vinculado con tu pareja. Invitala desde Cuenta.",
    partnerEmpty: "Tu pareja todavía no subió prendas a su Ropero.",
    badImage: "No pude leer la foto. Probá con otra.",
    notFound: "No encontré esa prenda.",
    noCombination: "No encontré una combinación posible. Probá de nuevo.",
  },
  en: {
    unauthenticated: "Please sign in.",
    rateLimited: "The stylist is very busy right now. Please try again in a minute.",
    missingKey: "The Anthropic API key isn't configured.",
    unavailable: "I couldn't complete the request. Please try again.",
    refusal: "I can't help with that request. Try describing it differently.",
    truncated: "The answer came back incomplete. Please try again.",
    unparseable: "I couldn't read the answer. Please try again.",
    promptShort: "Tell me a bit more about the occasion.",
    promptLong: "That description is too long.",
    needTwo: "Add at least a couple of items to your Wardrobe so I can put a look together.",
    needThree: "Add at least 3 items to your Wardrobe so I can see what's missing.",
    needOne: "Add at least one item to your Wardrobe so I can compare.",
    noCouple: "You're not linked with your partner yet. Invite them from Account.",
    partnerEmpty: "Your partner hasn't added any items to their Wardrobe yet.",
    badImage: "I couldn't read the photo. Try another one.",
    notFound: "I couldn't find that item.",
    noCombination: "I couldn't find a possible combination. Please try again.",
  },
};

const VOICE: Record<Lang, string> = {
  es: "Escribí todo el texto de la respuesta en español rioplatense, con criterio y elegancia, cálido y sin exagerar.",
  en: "Write all text in the answer in natural, elegant English: warm and confident, never over the top.",
};

// ─────────────────────────── Ropero compartido ───────────────────────────

type GarmentTags = {
  kind: string;
  color_name: string;
  color_hex: string;
  season: string;
  formality: string;
};

type Wardrobe = {
  ids: Set<string>;
  blocks: Anthropic.Beta.BetaContentBlockParam[];
  info: Map<string, { thumb_url: string; description: string }>;
};

async function loadWardrobe(
  uid: string,
  minGarments: number,
  emptyMessage: string,
  heading?: string,
): Promise<Wardrobe> {
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
    tags: d.get("tags") as GarmentTags | undefined,
    thumbUrl: String(d.get("thumb_url") ?? ""),
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
    { type: "text", text: heading ?? `Este es mi ropero (${garments.length} prendas):` },
  ];
  garments.forEach((g, i) => {
    blocks.push({
      type: "text",
      text:
        `ID: ${g.id} · Carpeta: ${g.folder} · Descripción: ${g.description || "sin descripción"}` +
        (g.tags
          ? ` · Tipo: ${g.tags.kind} · Color: ${g.tags.color_name} · Temporada: ${g.tags.season} · Formalidad: ${g.tags.formality}`
          : ""),
    });
    const img = images[i];
    if (img) blocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } });
  });
  // El ropero cambia poco: cacheamos hasta acá para abaratar pedidos seguidos.
  const last = blocks[blocks.length - 1];
  if (last.type === "image" || last.type === "text") last.cache_control = { type: "ephemeral" };

  return {
    ids: new Set(garments.map((g) => g.id)),
    blocks,
    info: new Map(garments.map((g) => [g.id, { thumb_url: g.thumbUrl, description: g.description }])),
  };
}

async function askClaude<T>(
  system: string,
  content: Anthropic.Beta.BetaContentBlockParam[],
  schema: object,
  lang: Lang,
): Promise<T> {
  const m = MESSAGES[lang];
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
      throw new HttpsError("resource-exhausted", m.rateLimited);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      throw new HttpsError("internal", m.missingKey);
    }
    throw new HttpsError("unavailable", m.unavailable);
  }

  if (response.stop_reason === "refusal") {
    throw new HttpsError("invalid-argument", m.refusal);
  }
  if (response.stop_reason === "max_tokens") {
    throw new HttpsError("unavailable", m.truncated);
  }
  logger.info("Claude", { model: response.model, usage: response.usage });

  const text = response.content.find((b) => b.type === "text");
  try {
    return JSON.parse(text && text.type === "text" ? text.text : "") as T;
  } catch {
    throw new HttpsError("unavailable", m.unparseable);
  }
}

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
- tip: un consejo concreto de styling (cómo llevarlo, qué ajustar, qué evitar).`;

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
  const lang = pickLang(request.data?.lang);
  const m = MESSAGES[lang];
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", m.unauthenticated);

  const prompt = String(request.data?.prompt ?? "").trim();
  if (prompt.length < 3) throw new HttpsError("invalid-argument", m.promptShort);
  if (prompt.length > 1000) throw new HttpsError("invalid-argument", m.promptLong);
  const weather: Weather | null = request.data?.weather ?? null;

  const wardrobe = await loadWardrobe(uid, 2, m.needTwo);

  const parsed = await askClaude<{ outfits: Suggestion[] }>(
    `${DAY_STYLE_PROMPT}\n- ${VOICE[lang]}`,
    [...wardrobe.blocks, { type: "text", text: `Ocasión: ${prompt}${describeWeather(weather)}\n\nArmame 2 o 3 outfits.` }],
    DAY_STYLE_SCHEMA,
    lang,
  );

  // Filtramos IDs inexistentes y outfits vacíos.
  const suggestions = parsed.outfits
    .map((o) => ({ ...o, garment_ids: [...new Set(o.garment_ids)].filter((id) => wardrobe.ids.has(id)) }))
    .filter((o) => o.garment_ids.length > 0)
    .slice(0, 3);
  if (suggestions.length === 0) {
    throw new HttpsError("unavailable", m.noCombination);
  }

  const outfit = { prompt, weather, suggestions, chosen_index: null, created_at: Date.now() };
  const ref = await getFirestore().collection("users").doc(uid).collection("outfits").add(outfit);
  return { outfit: { id: ref.id, ...outfit } };
});

// ─────────────────────────── Shopping ───────────────────────────

const STYLES = ["Formal", "Smart casual", "Casual", "Deportivo", "Minimalista", "Streetwear"];
const BUDGETS = ["Económico", "Medio", "Inversión"];
const SEASONS = ["Primavera", "Verano", "Otoño", "Invierno", "Todo el año"];
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
- tag y kind son valores técnicos: usá exactamente los valores permitidos, sin traducirlos.`;

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
  const lang = pickLang(request.data?.lang);
  const m = MESSAGES[lang];
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", m.unauthenticated);
  const prefs = cleanPrefs(request.data?.prefs);

  const metaRef = getFirestore().collection("users").doc(uid).collection("meta").doc("shopping");
  const [wardrobe, metaSnap] = await Promise.all([
    loadWardrobe(uid, 3, m.needThree),
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
    `${SHOPPING_PROMPT}\n- ${VOICE[lang]}`,
    [...wardrobe.blocks, { type: "text", text: request_text }],
    SHOPPING_SCHEMA,
    lang,
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

// ─────────────────────────── Etiquetado automático ───────────────────────────

const SEASONS_TAG = ["summer", "winter", "mid", "all"];
const FORMALITY_TAG = ["casual", "smart", "formal", "sport"];

const TAG_PROMPT = `Sos un asistente de moda que cataloga prendas a partir de una foto.
Devolvé:
- kind: el tipo de prenda, uno de la lista permitida.
- color_name: el color principal, en pocas palabras (ej: "azul marino", "blanco roto").
- color_hex: ese color como hex de 6 dígitos con #.
- season: "summer" (calor), "winter" (frío), "mid" (entretiempo) o "all" (todo el año).
- formality: "casual", "smart" (smart casual / oficina), "formal" o "sport".
- description: descripción breve y concreta, de 4 a 10 palabras (ej: "Camisa de lino blanca, corte slim").
kind, season y formality son valores técnicos: usá exactamente los valores permitidos.`;

const TAG_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: KINDS },
    color_name: { type: "string" },
    color_hex: { type: "string" },
    season: { type: "string", enum: SEASONS_TAG },
    formality: { type: "string", enum: FORMALITY_TAG },
    description: { type: "string" },
  },
  required: ["kind", "color_name", "color_hex", "season", "formality", "description"],
  additionalProperties: false,
};

export const tagGarment = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: "256MiB" },
  async (request) => {
    const lang = pickLang(request.data?.lang);
    const m = MESSAGES[lang];
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", m.unauthenticated);

    const garmentId = String(request.data?.garmentId ?? "");
    if (!/^[A-Za-z0-9]{10,40}$/.test(garmentId)) throw new HttpsError("invalid-argument", m.notFound);
    const ref = getFirestore().collection("users").doc(uid).collection("garments").doc(garmentId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", m.notFound);

    let image: string;
    try {
      const [buf] = await getStorage().bucket().file(String(snap.get("thumb_path"))).download();
      image = buf.toString("base64");
    } catch {
      throw new HttpsError("not-found", m.notFound);
    }

    // Subida múltiple: además de etiquetar, la IA elige la carpeta entre las del usuario.
    let folders: { id: string; name: string }[] = [];
    if (request.data?.sortFolder === true) {
      const fs = await getFirestore().collection("users").doc(uid).collection("folders").limit(60).get();
      folders = fs.docs.map((d) => ({ id: d.id, name: String(d.get("name") ?? "").slice(0, 40) }));
    }
    const sorting = folders.length > 1;
    const schema = sorting
      ? {
          ...TAG_SCHEMA,
          properties: { ...TAG_SCHEMA.properties, folder_id: { type: "string", enum: folders.map((f) => f.id) } },
          required: [...TAG_SCHEMA.required, "folder_id"],
        }
      : TAG_SCHEMA;
    const folderPrompt = sorting
      ? `\n- folder_id: la carpeta del usuario donde guardar esta prenda. Elegí por el tipo de prenda según el nombre de la carpeta; si ninguna encaja, usá la más general (ej: "Otros"). Carpetas (id: nombre):\n${folders
          .map((f) => `${f.id}: ${f.name}`)
          .join("\n")}`
      : "";

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: TAG_MODEL,
        max_tokens: 2000,
        output_config: { effort: "low", format: { type: "json_schema", schema } },
        system: `${TAG_PROMPT}${folderPrompt}\n${VOICE[lang]} (color_name y description en ese idioma).`,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              { type: "text", text: "Catalogá esta prenda." },
            ],
          },
        ],
      });
    } catch (err) {
      logger.error("Error de Anthropic (tag)", err);
      if (err instanceof Anthropic.RateLimitError) throw new HttpsError("resource-exhausted", m.rateLimited);
      throw new HttpsError("unavailable", m.unavailable);
    }
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      throw new HttpsError("unavailable", m.unavailable);
    }

    const text = response.content.find((b) => b.type === "text");
    let parsed: GarmentTags & { description: string; folder_id?: string };
    try {
      parsed = JSON.parse(text && text.type === "text" ? text.text : "");
    } catch {
      throw new HttpsError("unavailable", m.unparseable);
    }

    const tags: GarmentTags = {
      kind: KINDS.includes(parsed.kind) ? parsed.kind : "accesorio",
      color_name: String(parsed.color_name).slice(0, 40),
      color_hex: /^#[0-9a-fA-F]{6}$/.test(parsed.color_hex) ? parsed.color_hex : "#D9D9D6",
      season: SEASONS_TAG.includes(parsed.season) ? parsed.season : "all",
      formality: FORMALITY_TAG.includes(parsed.formality) ? parsed.formality : "casual",
    };
    const current = ((snap.get("description") as string | null) ?? "").trim();
    const description = current || String(parsed.description).trim().slice(0, 200) || null;

    const folder_id = sorting && folders.some((f) => f.id === parsed.folder_id) ? String(parsed.folder_id) : null;

    await ref.update(folder_id ? { tags, description, folder_id } : { tags, description });
    return { tags, description, folder_id: folder_id ?? (snap.get("folder_id") as string) };
  },
);

// ─────────────────────────── ¿Lo compro? ───────────────────────────

type BuyVerdict = {
  verdict: "buy" | "maybe" | "skip";
  headline: string;
  reasoning: string;
  item: { name: string; kind: string; color_name: string; color_hex: string; material: string };
  pairs: { garment_id: string; note: string }[];
  similar_ids: string[];
  new_looks: number;
  tip: string;
};

const BUY_PROMPT = `Sos el estilista personal de DressCode: gusto parisino, minimalista y preciso.
El usuario está en una tienda y te manda la foto de una prenda que está pensando comprar. Tu tarea: decirle con honestidad si le conviene, según SU ropero.

Reglas:
- Mirá la prenda candidata (última imagen) y comparala con las prendas del ropero (fotos, descripciones y etiquetas).
- verdict: "buy" si suma variedad real y combina con varias prendas; "maybe" si tiene pros y contras; "skip" si repite algo que ya tiene, combina con poco o no encaja con su estilo.
- headline: veredicto en una frase corta y directa (máx. 8 palabras).
- reasoning: 2-3 oraciones explicando por qué, concretas y referidas a su ropero.
- item: describí la prenda candidata (name corto, kind de la lista permitida, color_name, color_hex de 6 dígitos con #, material probable).
- pairs: de 2 a 4 prendas del ropero con las que combina mejor (garment_id exacto) y una nota breve de cómo combinarlas.
- similar_ids: IDs de prendas del ropero muy parecidas a la candidata (vacío si no hay).
- new_looks: estimación honesta de cuántos looks nuevos y razonables habilita.
- tip: un consejo concreto (talle, calce, color alternativo, qué revisar antes de comprar).
- Si el usuario agrega un comentario (precio, talle, ocasión), tenelo en cuenta.
- verdict y kind son valores técnicos: usá exactamente los valores permitidos.`;

const BUY_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["buy", "maybe", "skip"] },
    headline: { type: "string" },
    reasoning: { type: "string" },
    item: {
      type: "object",
      properties: {
        name: { type: "string" },
        kind: { type: "string", enum: KINDS },
        color_name: { type: "string" },
        color_hex: { type: "string" },
        material: { type: "string" },
      },
      required: ["name", "kind", "color_name", "color_hex", "material"],
      additionalProperties: false,
    },
    pairs: {
      type: "array",
      items: {
        type: "object",
        properties: { garment_id: { type: "string" }, note: { type: "string" } },
        required: ["garment_id", "note"],
        additionalProperties: false,
      },
    },
    similar_ids: { type: "array", items: { type: "string" } },
    new_looks: { type: "integer" },
    tip: { type: "string" },
  },
  required: ["verdict", "headline", "reasoning", "item", "pairs", "similar_ids", "new_looks", "tip"],
  additionalProperties: false,
};

export const shouldBuy = onCall(CALL_OPTS, async (request) => {
  const lang = pickLang(request.data?.lang);
  const m = MESSAGES[lang];
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", m.unauthenticated);

  const image = String(request.data?.image ?? "");
  // JPEG en base64, ya achicado en el teléfono (máx. ~3 MB).
  if (!/^[A-Za-z0-9+/=]+$/.test(image) || image.length < 1000 || image.length > 4_000_000) {
    throw new HttpsError("invalid-argument", m.badImage);
  }
  const note = String(request.data?.note ?? "").trim().slice(0, 400);

  const wardrobe = await loadWardrobe(uid, 1, m.needOne);

  const parsed = await askClaude<BuyVerdict>(
    `${BUY_PROMPT}\n- ${VOICE[lang]}`,
    [
      ...wardrobe.blocks,
      { type: "text", text: "Esta es la prenda que estoy pensando comprar:" },
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
      { type: "text", text: `${note ? `Comentario: ${note}\n` : ""}¿Me conviene comprarla?` },
    ],
    BUY_SCHEMA,
    lang,
  );

  return {
    result: {
      ...parsed,
      verdict: ["buy", "maybe", "skip"].includes(parsed.verdict) ? parsed.verdict : "maybe",
      item: {
        ...parsed.item,
        kind: KINDS.includes(parsed.item.kind) ? parsed.item.kind : "accesorio",
        color_hex: /^#[0-9a-fA-F]{6}$/.test(parsed.item.color_hex) ? parsed.item.color_hex : "#D9D9D6",
      },
      pairs: parsed.pairs.filter((p) => wardrobe.ids.has(p.garment_id)).slice(0, 4),
      similar_ids: [...new Set(parsed.similar_ids)].filter((id) => wardrobe.ids.has(id)).slice(0, 4),
      new_looks: Math.max(0, Math.min(99, Math.round(parsed.new_looks))),
    },
  };
});

// ─────────────────────────── Foto de una prenda ───────────────────────────
// Devuelve la foto guardada en base64 para reprocesarla en el teléfono (quitar fondo)
// sin tener que configurar CORS en el bucket.

export const garmentImage = onCall({ timeoutSeconds: 60, memory: "256MiB" }, async (request) => {
  const lang = pickLang(request.data?.lang);
  const m = MESSAGES[lang];
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", m.unauthenticated);

  const garmentId = String(request.data?.garmentId ?? "");
  if (!/^[A-Za-z0-9]{10,40}$/.test(garmentId)) throw new HttpsError("invalid-argument", m.notFound);
  const snap = await getFirestore().collection("users").doc(uid).collection("garments").doc(garmentId).get();
  if (!snap.exists) throw new HttpsError("not-found", m.notFound);

  try {
    const [buf] = await getStorage().bucket().file(String(snap.get("image_path"))).download();
    return { image: buf.toString("base64") };
  } catch {
    throw new HttpsError("not-found", m.notFound);
  }
});

// ─────────────────────────── Looks en pareja ───────────────────────────

type CouplePick = { title: string; a_ids: string[]; b_ids: string[]; explanation: string; tip: string };

const COUPLE_PROMPT = `Sos el estilista personal de DressCode: gusto parisino, minimalista y preciso.
Tu tarea: proponer 2 o 3 looks COORDINADOS para una pareja que va junta a una ocasión, usando EXCLUSIVAMENTE prendas de sus roperos.

Reglas:
- Recibís dos roperos: el de la persona A (quien pide) y el de la persona B. Cada prenda tiene ID, carpeta, descripción, etiquetas y foto.
- a_ids: solo IDs del ropero de A. b_ids: solo IDs del ropero de B. Copiados exactamente; nunca mezcles roperos ni inventes prendas.
- Cada look debe ser completo para cada persona (arriba, abajo y calzado; abrigo o accesorios si suman o el clima lo pide).
- Coordinados, no uniformados: colores que dialoguen (misma paleta, un color en común, contraste armónico), mismo nivel de formalidad, ninguno opaca al otro.
- Las alternativas tienen que ser realmente diferentes entre sí.
- Si hay datos del clima, tenelos en cuenta.
- title: nombre corto y evocador del look en pareja (máx. 4 palabras).
- explanation: 2-3 oraciones sobre por qué funcionan juntos para la ocasión. Podés nombrar a cada persona.
- tip: un consejo concreto de styling para la pareja.`;

const COUPLE_SCHEMA = {
  type: "object",
  properties: {
    outfits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          a_ids: { type: "array", items: { type: "string" } },
          b_ids: { type: "array", items: { type: "string" } },
          explanation: { type: "string" },
          tip: { type: "string" },
        },
        required: ["title", "a_ids", "b_ids", "explanation", "tip"],
        additionalProperties: false,
      },
    },
  },
  required: ["outfits"],
  additionalProperties: false,
};

export const coupleStyle = onCall(CALL_OPTS, async (request) => {
  const lang = pickLang(request.data?.lang);
  const m = MESSAGES[lang];
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", m.unauthenticated);

  const prompt = String(request.data?.prompt ?? "").trim();
  if (prompt.length < 3) throw new HttpsError("invalid-argument", m.promptShort);
  if (prompt.length > 1000) throw new HttpsError("invalid-argument", m.promptLong);
  const weather: Weather | null = request.data?.weather ?? null;

  const db = getFirestore();
  const coupleSnap = await db.collection("couples").where("members", "array-contains", uid).limit(1).get();
  if (coupleSnap.empty) throw new HttpsError("failed-precondition", m.noCouple);
  const couple = coupleSnap.docs[0];
  const members = couple.get("members") as string[];
  const partner = members.find((x) => x !== uid)!;
  const names = (couple.get("names") as Record<string, string> | undefined) ?? {};
  const nameA = names[uid] || "A";
  const nameB = names[partner] || "B";

  const [wa, wb] = await Promise.all([
    loadWardrobe(uid, 2, m.needTwo, `Ropero de la persona A (${nameA}):`),
    loadWardrobe(partner, 2, m.partnerEmpty, `Ropero de la persona B (${nameB}):`),
  ]);

  const parsed = await askClaude<{ outfits: CouplePick[] }>(
    `${COUPLE_PROMPT}\n- ${VOICE[lang]}`,
    [
      ...wa.blocks,
      ...wb.blocks,
      {
        type: "text",
        text: `Persona A: ${nameA}. Persona B: ${nameB}.\nOcasión: ${prompt}${describeWeather(weather)}\n\nArmanos 2 o 3 looks coordinados.`,
      },
    ],
    COUPLE_SCHEMA,
    lang,
  );

  const suggestions = parsed.outfits
    .map((o) => ({
      title: o.title,
      explanation: o.explanation,
      tip: o.tip,
      picks: {
        [uid]: [...new Set(o.a_ids)].filter((id) => wa.ids.has(id)),
        [partner]: [...new Set(o.b_ids)].filter((id) => wb.ids.has(id)),
      },
    }))
    .filter((o) => o.picks[uid].length > 0 && o.picks[partner].length > 0)
    .slice(0, 3);
  if (suggestions.length === 0) throw new HttpsError("unavailable", m.noCombination);

  // Guardamos una copia de las miniaturas usadas: cada uno ve las prendas del otro solo dentro del look.
  const garments: Record<string, { thumb_url: string; description: string; owner: string }> = {};
  for (const s of suggestions) {
    for (const [owner, ids] of Object.entries(s.picks)) {
      const info = owner === uid ? wa.info : wb.info;
      for (const id of ids) garments[id] = { ...info.get(id)!, owner };
    }
  }

  const outfit = {
    prompt,
    weather,
    requested_by: uid,
    names: { [uid]: nameA, [partner]: nameB },
    suggestions,
    garments,
    chosen_index: null,
    created_at: Date.now(),
  };
  const ref = await couple.ref.collection("outfits").add(outfit);
  return { outfit: { id: ref.id, couple_id: couple.id, ...outfit } };
});
