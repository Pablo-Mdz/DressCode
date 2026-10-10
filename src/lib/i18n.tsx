import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// Traducciones de la interfaz. El español es la fuente; el inglés debe tener las mismas claves.
// {n}, {name}, etc. se reemplazan con los valores que se pasan a t().

const es = {
  // General
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.save": "Guardar",
  "common.saving": "Guardando…",
  "common.delete": "Eliminar",
  "common.deleting": "Eliminando…",
  "common.create": "Crear",
  "common.creating": "Creando…",
  "common.loading": "Cargando",
  "common.name": "Nombre",
  "common.email": "Email",
  "common.genericError": "Algo salió mal",
  "common.sessionExpired": "Sesión expirada. Volvé a entrar.",
  "common.notConfigured": "Falta configurar Firebase. Completá las variables {vars} (ver README).",
  "garments.one": "{n} prenda",
  "garments.other": "{n} prendas",
  "folders.one": "{n} carpeta",
  "folders.other": "{n} carpetas",

  // Pestañas
  "tab.wardrobe": "Ropero",
  "tab.dayStyle": "Day Style",
  "tab.shopping": "Shopping",
  "tab.history": "Historial",
  "tab.sections": "Secciones",

  // Login
  "login.tagline": "Tu ropero, con criterio",
  "login.signupTitle": "Crear cuenta",
  "login.resetTitle": "Recuperar acceso",
  "login.password": "Contraseña",
  "login.emailPlaceholder": "nombre@email.com",
  "login.submitLogin": "Entrar",
  "login.submitSignup": "Crear cuenta",
  "login.submitReset": "Enviar enlace",
  "login.wait": "Un momento…",
  "login.or": "o",
  "login.google": "Continuar con Google",
  "login.noAccount": "¿No tenés cuenta?",
  "login.signup": "Registrate",
  "login.forgot": "Olvidé mi contraseña",
  "login.haveAccount": "Ya tengo cuenta",
  "login.signin": "Entrar",
  "login.resetSent": "Si el email existe, te llegará un enlace para crear una nueva contraseña.",
  "login.language": "Idioma",
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/email-already-in-use": "Ya existe una cuenta con ese email.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/invalid-email": "El email no es válido.",
  "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos.",
  "auth/network-request-failed": "Sin conexión. Revisá tu internet.",
  "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Configuración).",

  // Cuenta
  "account.title": "Cuenta",
  "account.signOut": "Cerrar sesión",
  "account.language": "Idioma",
  "account.languageHint": "La IA también te va a responder en este idioma.",

  // Ropero
  "wardrobe.hello": "Bonjour, {name}",
  "wardrobe.title": "Ropero",
  "wardrobe.empty": "Vacía",
  "wardrobe.newFolder": "Nueva carpeta",
  "wardrobe.folderPlaceholder": "Ej: Vestidos, Trajes, Deportivo…",
  "wardrobe.loadError": "No pude cargar tu ropero",
  "wardrobe.createError": "No pude crear la carpeta",

  // Carpeta
  "folder.notFound": "Esta carpeta no existe.",
  "folder.back": "Volver al ropero",
  "folder.rename": "Renombrar carpeta",
  "folder.renameTitle": "Renombrar",
  "folder.delete": "Eliminar carpeta",
  "folder.deleteMessage": "Se eliminará \"{name}\"{extra}. Esta acción no se puede deshacer.",
  "folder.deleteExtra": " y sus {items}",
  "folder.emptyTitle": "Todavía no hay prendas acá",
  "folder.emptyText": "Sacale una foto a tu primera prenda.",
  "folder.add": "Agregar prenda",
  "folder.loadError": "No pude cargar la carpeta",
  "folder.renameError": "No pude renombrar",
  "garment.new": "Nueva prenda",
  "garment.title": "Prenda",
  "garment.camera": "Cámara",
  "garment.gallery": "Galería",
  "garment.preview": "Vista previa",
  "garment.description": "Descripción",
  "garment.descriptionPlaceholder": "Ej: Lino blanca, corte slim. Ideal verano.",
  "garment.folder": "Carpeta",
  "garment.alt": "Prenda",
  "garment.delete": "Eliminar prenda",
  "garment.deleteMessage": "La foto se borrará de tu ropero. Esta acción no se puede deshacer.",
  "garment.uploadError": "No pude subir la foto",
  "garment.saveError": "No pude guardar los cambios",
  "garment.imageError": "No se pudo procesar la imagen",

  // Day Style
  "day.title": "¿Qué te ponés <em>hoy</em>?",
  "day.describe": "Describí la ocasión",
  "day.placeholder": "Contame la ocasión. Ej: cena con amigos en un restaurante asiático elegante.",
  "day.ideas": "Ideas",
  "day.idea.dinner": "Cena elegante",
  "day.idea.dinner.prompt": "Cena con amigos en un restaurante elegante",
  "day.idea.office": "Oficina",
  "day.idea.office.prompt": "Día de oficina con una reunión importante",
  "day.idea.wedding": "Casamiento de día",
  "day.idea.wedding.prompt": "Casamiento de día al aire libre",
  "day.idea.market": "Domingo de feria",
  "day.idea.market.prompt": "Domingo de feria y café al aire libre",
  "day.idea.date": "Primera cita",
  "day.idea.date.prompt": "Primera cita en un bar de vinos",
  "day.weather": "Clima",
  "day.weatherOff": "Desactivado",
  "day.weatherSearching": "Buscando el clima…",
  "day.weatherError": "No pude obtener tu ubicación",
  "day.weatherDetail": "Mín {min}° · Máx {max}° · Considerar el clima",
  "day.weatherToggle": "Considerar el clima",
  "day.submit": "Crear mi look",
  "day.submitting": "Creando tu look…",
  "day.loading1": "Abriendo tu ropero…",
  "day.loading2": "Mirando colores y texturas…",
  "day.loading3": "Probando combinaciones…",
  "day.loading4": "Últimos detalles…",
  "day.goWardrobe": "Ir al Ropero",
  "day.resultsFor": "Tus looks para",
  "day.error": "No pude armar tu look. Probá de nuevo.",

  // Look
  "look.tip": "Consejo",
  "look.choose": "Elegir este look",
  "look.chosen": "Elegido",
  "look.deleted": "Prenda eliminada",

  // Historial
  "history.title": "Historial",
  "history.subtitle": "Tus looks anteriores",
  "history.filter": "Filtrar",
  "history.all": "Todos",
  "history.chosen": "Elegidos",
  "history.emptyAll": "Todavía no pediste ningún look",
  "history.emptyChosen": "Todavía no elegiste ningún look",
  "history.emptyText": "Contale a Day Style tu próxima ocasión.",
  "history.chosenBadge": "Elegido",
  "history.today": "Hoy, {time}",
  "history.yesterday": "Ayer, {time}",
  "history.sheetTitle": "Looks",
  "history.delete": "Eliminar del historial",
  "history.deleteTitle": "Eliminar",
  "history.deleteMessage": "Se eliminará esta consulta y sus looks.",
  "history.loadError": "No pude cargar el historial",
  "history.chooseError": "No pude guardar tu elección",

  // Shopping
  "shop.title": "Shopping",
  "shop.subtitle": "Lo que le falta a tu ropero",
  "shop.listButton": "Mi lista de compras, {items}",
  "shop.guide": "Orientá las sugerencias",
  "shop.question": "¿Hacia dónde querés llevar tu ropero?",
  "shop.style": "Estilo · podés elegir varios",
  "shop.notes": "Contale algo más (opcional)",
  "shop.notesPlaceholder": "Ej: trabajo en oficina pero los viernes son informales. Quiero algo más moderno y evitar el marrón.",
  "shop.budget": "Presupuesto",
  "shop.season": "Temporada",
  "shop.analyzing": "Analizando tu ropero…",
  "shop.update": "Actualizar sugerencias",
  "shop.suggest": "Sugerirme compras",
  "shop.loading1": "Recorriendo tu ropero…",
  "shop.loading2": "Buscando huecos y combinaciones…",
  "shop.loading3": "Eligiendo las mejores piezas…",
  "shop.reading": "Lectura de tu ropero",
  "shop.filter.all": "Todo",
  "shop.filter.essential": "Esenciales",
  "shop.filter.variety": "Para variar",
  "shop.noItems": "No hay sugerencias acá",
  "shop.noItemsText": "Probá otro filtro o actualizá las sugerencias.",
  "shop.newLooks.one": "+{n} look nuevo",
  "shop.newLooks.other": "+{n} looks nuevos",
  "shop.pairsWith": "Combina con lo que ya tenés",
  "shop.addToList": "Agregar a mi lista",
  "shop.inList": "En tu lista",
  "shop.haveIt": "Ya la tengo",
  "shop.emptyTitle": "Tu próxima compra, con criterio",
  "shop.emptyText": "Elegí un estilo y tocá “Sugerirme compras”. Voy a mirar tu ropero y decirte qué le falta.",
  "shop.listTitle": "Mi lista",
  "shop.listEmpty": "Tu lista está vacía",
  "shop.listEmptyText": "Agregá sugerencias para tenerlas a mano cuando salgas de compras.",
  "shop.remove": "Quitar",
  "shop.loadError": "No pude cargar Shopping",
  "shop.listError": "No pude actualizar tu lista",
  "shop.saveError": "No pude guardar el cambio",
  "shop.error": "No pude generar sugerencias. Probá de nuevo.",
  "shop.tag.Esencial": "Esencial",
  "shop.tag.Para variar": "Para variar",
  "opt.Formal": "Formal",
  "opt.Smart casual": "Smart casual",
  "opt.Casual": "Casual",
  "opt.Deportivo": "Deportivo",
  "opt.Minimalista": "Minimalista",
  "opt.Streetwear": "Streetwear",
  "opt.Económico": "Económico",
  "opt.Medio": "Medio",
  "opt.Inversión": "Inversión",
  "opt.Otoño-invierno": "Invierno",
  "opt.Primavera-verano": "Verano",
  "opt.Todo el año": "Todo el año",

  // Etiquetas
  "tags.analyzing": "Analizando…",
  "tags.analyze": "Analizar con IA",
  "tags.untagged.one": "{n} prenda sin etiquetar",
  "tags.untagged.other": "{n} prendas sin etiquetar",
  "tags.untaggedText": "La IA detecta tipo, color, temporada y formalidad para armar mejores looks.",
  "tags.tagAll": "Etiquetar con IA",
  "tags.progress": "Etiquetando {done} de {total}…",
  "tags.error": "No pude analizar la prenda",
  "filter.all": "Todas",
  "season.summer": "Verano",
  "season.winter": "Invierno",
  "season.mid": "Entretiempo",
  "season.all": "Todo el año",
  "formality.casual": "Casual",
  "formality.smart": "Smart",
  "formality.formal": "Formal",
  "formality.sport": "Deportivo",
  "kind.remera": "Remera",
  "kind.camisa": "Camisa",
  "kind.sweater": "Sweater",
  "kind.campera": "Campera",
  "kind.pantalon": "Pantalón",
  "kind.pollera": "Pollera",
  "kind.vestido": "Vestido",
  "kind.zapato": "Zapato",
  "kind.zapatilla": "Zapatilla",
  "kind.bolso": "Bolso",
  "kind.accesorio": "Accesorio",

  // ¿Lo compro?
  "buy.title": "¿Lo compro?",
  "buy.entry": "Sacale una foto en la tienda y te digo si suma a tu ropero.",
  "buy.note": "Precio, talle o lo que quieras contarme (opcional)",
  "buy.notePlaceholder": "Ej: 79 €, talle M. Es para la oficina.",
  "buy.analyze": "Analizar",
  "buy.loading1": "Mirando la prenda…",
  "buy.loading2": "Comparando con tu ropero…",
  "buy.loading3": "Pensando combinaciones…",
  "buy.verdict.buy": "Compralo",
  "buy.verdict.maybe": "Pensalo",
  "buy.verdict.skip": "Mejor no",
  "buy.pairs": "Combina con",
  "buy.similar": "Ya tenés algo parecido",
  "buy.another": "Analizar otra",
  "buy.error": "No pude analizar la prenda. Probá de nuevo.",
};

export type MessageKey = keyof typeof es;

const en: Record<MessageKey, string> = {
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.delete": "Delete",
  "common.deleting": "Deleting…",
  "common.create": "Create",
  "common.creating": "Creating…",
  "common.loading": "Loading",
  "common.name": "Name",
  "common.email": "Email",
  "common.genericError": "Something went wrong",
  "common.sessionExpired": "Your session expired. Please sign in again.",
  "common.notConfigured": "Firebase is not configured. Fill in the {vars} variables (see README).",
  "garments.one": "{n} item",
  "garments.other": "{n} items",
  "folders.one": "{n} folder",
  "folders.other": "{n} folders",

  "tab.wardrobe": "Wardrobe",
  "tab.dayStyle": "Day Style",
  "tab.shopping": "Shopping",
  "tab.history": "History",
  "tab.sections": "Sections",

  "login.tagline": "Your wardrobe, curated",
  "login.signupTitle": "Create account",
  "login.resetTitle": "Reset password",
  "login.password": "Password",
  "login.emailPlaceholder": "name@email.com",
  "login.submitLogin": "Sign in",
  "login.submitSignup": "Create account",
  "login.submitReset": "Send link",
  "login.wait": "One moment…",
  "login.or": "or",
  "login.google": "Continue with Google",
  "login.noAccount": "No account yet?",
  "login.signup": "Sign up",
  "login.forgot": "Forgot my password",
  "login.haveAccount": "I already have an account",
  "login.signin": "Sign in",
  "login.resetSent": "If that email exists, you'll receive a link to set a new password.",
  "login.language": "Language",
  "auth/invalid-credential": "Wrong email or password.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "The password must be at least 6 characters.",
  "auth/invalid-email": "That email isn't valid.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes.",
  "auth/network-request-failed": "You're offline. Check your connection.",
  "auth/unauthorized-domain": "This domain isn't authorized in Firebase (Authentication → Settings).",

  "account.title": "Account",
  "account.signOut": "Sign out",
  "account.language": "Language",
  "account.languageHint": "The AI stylist will also answer in this language.",

  "wardrobe.hello": "Bonjour, {name}",
  "wardrobe.title": "Wardrobe",
  "wardrobe.empty": "Empty",
  "wardrobe.newFolder": "New folder",
  "wardrobe.folderPlaceholder": "E.g. Dresses, Suits, Sportswear…",
  "wardrobe.loadError": "I couldn't load your wardrobe",
  "wardrobe.createError": "I couldn't create the folder",

  "folder.notFound": "This folder doesn't exist.",
  "folder.back": "Back to wardrobe",
  "folder.rename": "Rename folder",
  "folder.renameTitle": "Rename",
  "folder.delete": "Delete folder",
  "folder.deleteMessage": "\"{name}\"{extra} will be deleted. This can't be undone.",
  "folder.deleteExtra": " and its {items}",
  "folder.emptyTitle": "No items here yet",
  "folder.emptyText": "Take a photo of your first piece.",
  "folder.add": "Add item",
  "folder.loadError": "I couldn't load this folder",
  "folder.renameError": "I couldn't rename it",
  "garment.new": "New item",
  "garment.title": "Item",
  "garment.camera": "Camera",
  "garment.gallery": "Gallery",
  "garment.preview": "Preview",
  "garment.description": "Description",
  "garment.descriptionPlaceholder": "E.g. White linen, slim fit. Great for summer.",
  "garment.folder": "Folder",
  "garment.alt": "Clothing item",
  "garment.delete": "Delete item",
  "garment.deleteMessage": "The photo will be removed from your wardrobe. This can't be undone.",
  "garment.uploadError": "I couldn't upload the photo",
  "garment.saveError": "I couldn't save the changes",
  "garment.imageError": "The image couldn't be processed",

  "day.title": "What are you wearing <em>today</em>?",
  "day.describe": "Describe the occasion",
  "day.placeholder": "Tell me about the occasion. E.g. dinner with friends at an elegant Asian restaurant.",
  "day.ideas": "Ideas",
  "day.idea.dinner": "Elegant dinner",
  "day.idea.dinner.prompt": "Dinner with friends at an elegant restaurant",
  "day.idea.office": "Office",
  "day.idea.office.prompt": "Office day with an important meeting",
  "day.idea.wedding": "Daytime wedding",
  "day.idea.wedding.prompt": "Outdoor daytime wedding",
  "day.idea.market": "Sunday market",
  "day.idea.market.prompt": "Sunday market and coffee outdoors",
  "day.idea.date": "First date",
  "day.idea.date.prompt": "First date at a wine bar",
  "day.weather": "Weather",
  "day.weatherOff": "Off",
  "day.weatherSearching": "Checking the weather…",
  "day.weatherError": "I couldn't get your location",
  "day.weatherDetail": "Low {min}° · High {max}° · Consider the weather",
  "day.weatherToggle": "Consider the weather",
  "day.submit": "Style me",
  "day.submitting": "Styling you…",
  "day.loading1": "Opening your wardrobe…",
  "day.loading2": "Looking at colors and textures…",
  "day.loading3": "Trying combinations…",
  "day.loading4": "Final touches…",
  "day.goWardrobe": "Go to Wardrobe",
  "day.resultsFor": "Your looks for",
  "day.error": "I couldn't put a look together. Please try again.",

  "look.tip": "Tip",
  "look.choose": "Choose this look",
  "look.chosen": "Chosen",
  "look.deleted": "Item deleted",

  "history.title": "History",
  "history.subtitle": "Your previous looks",
  "history.filter": "Filter",
  "history.all": "All",
  "history.chosen": "Chosen",
  "history.emptyAll": "You haven't asked for a look yet",
  "history.emptyChosen": "You haven't chosen a look yet",
  "history.emptyText": "Tell Day Style about your next occasion.",
  "history.chosenBadge": "Chosen",
  "history.today": "Today, {time}",
  "history.yesterday": "Yesterday, {time}",
  "history.sheetTitle": "Looks",
  "history.delete": "Delete from history",
  "history.deleteTitle": "Delete",
  "history.deleteMessage": "This request and its looks will be deleted.",
  "history.loadError": "I couldn't load your history",
  "history.chooseError": "I couldn't save your choice",

  "shop.title": "Shopping",
  "shop.subtitle": "What your wardrobe is missing",
  "shop.listButton": "My shopping list, {items}",
  "shop.guide": "Guide the suggestions",
  "shop.question": "Where do you want to take your wardrobe?",
  "shop.style": "Style · pick as many as you like",
  "shop.notes": "Anything else? (optional)",
  "shop.notesPlaceholder": "E.g. I work in an office but Fridays are casual. I want something more modern and no brown.",
  "shop.budget": "Budget",
  "shop.season": "Season",
  "shop.analyzing": "Analyzing your wardrobe…",
  "shop.update": "Refresh suggestions",
  "shop.suggest": "Suggest what to buy",
  "shop.loading1": "Going through your wardrobe…",
  "shop.loading2": "Finding gaps and combinations…",
  "shop.loading3": "Picking the best pieces…",
  "shop.reading": "Your wardrobe at a glance",
  "shop.filter.all": "All",
  "shop.filter.essential": "Essentials",
  "shop.filter.variety": "For variety",
  "shop.noItems": "No suggestions here",
  "shop.noItemsText": "Try another filter or refresh the suggestions.",
  "shop.newLooks.one": "+{n} new look",
  "shop.newLooks.other": "+{n} new looks",
  "shop.pairsWith": "Goes with what you already have",
  "shop.addToList": "Add to my list",
  "shop.inList": "On your list",
  "shop.haveIt": "I have it",
  "shop.emptyTitle": "Your next purchase, curated",
  "shop.emptyText": "Pick a style and tap “Suggest what to buy”. I'll look at your wardrobe and tell you what it's missing.",
  "shop.listTitle": "My list",
  "shop.listEmpty": "Your list is empty",
  "shop.listEmptyText": "Add suggestions to keep them handy when you go shopping.",
  "shop.remove": "Remove",
  "shop.loadError": "I couldn't load Shopping",
  "shop.listError": "I couldn't update your list",
  "shop.saveError": "I couldn't save the change",
  "shop.error": "I couldn't generate suggestions. Please try again.",
  "shop.tag.Esencial": "Essential",
  "shop.tag.Para variar": "For variety",
  "opt.Formal": "Formal",
  "opt.Smart casual": "Smart casual",
  "opt.Casual": "Casual",
  "opt.Deportivo": "Sporty",
  "opt.Minimalista": "Minimalist",
  "opt.Streetwear": "Streetwear",
  "opt.Económico": "Affordable",
  "opt.Medio": "Mid-range",
  "opt.Inversión": "Investment",
  "opt.Otoño-invierno": "Winter",
  "opt.Primavera-verano": "Summer",
  "opt.Todo el año": "All year",

  "tags.analyzing": "Analyzing…",
  "tags.analyze": "Analyze with AI",
  "tags.untagged.one": "{n} item without tags",
  "tags.untagged.other": "{n} items without tags",
  "tags.untaggedText": "The AI detects type, color, season and formality to build better looks.",
  "tags.tagAll": "Tag with AI",
  "tags.progress": "Tagging {done} of {total}…",
  "tags.error": "I couldn't analyze the item",
  "filter.all": "All",
  "season.summer": "Summer",
  "season.winter": "Winter",
  "season.mid": "Mid-season",
  "season.all": "All year",
  "formality.casual": "Casual",
  "formality.smart": "Smart",
  "formality.formal": "Formal",
  "formality.sport": "Sporty",
  "kind.remera": "T-shirt",
  "kind.camisa": "Shirt",
  "kind.sweater": "Sweater",
  "kind.campera": "Jacket",
  "kind.pantalon": "Trousers",
  "kind.pollera": "Skirt",
  "kind.vestido": "Dress",
  "kind.zapato": "Shoe",
  "kind.zapatilla": "Sneaker",
  "kind.bolso": "Bag",
  "kind.accesorio": "Accessory",

  "buy.title": "Should I buy it?",
  "buy.entry": "Snap a photo in the store and I'll tell you if it adds to your wardrobe.",
  "buy.note": "Price, size or anything else (optional)",
  "buy.notePlaceholder": "E.g. €79, size M. It's for the office.",
  "buy.analyze": "Analyze",
  "buy.loading1": "Looking at the item…",
  "buy.loading2": "Comparing with your wardrobe…",
  "buy.loading3": "Thinking of combinations…",
  "buy.verdict.buy": "Buy it",
  "buy.verdict.maybe": "Think it over",
  "buy.verdict.skip": "Better not",
  "buy.pairs": "Goes with",
  "buy.similar": "You already have something similar",
  "buy.another": "Analyze another",
  "buy.error": "I couldn't analyze the item. Please try again.",
};

export type Lang = "es" | "en";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
];

const DICTS: Record<Lang, Record<MessageKey, string>> = { es, en };
const STORAGE_KEY = "dresscode.lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    /* almacenamiento no disponible */
  }
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

let currentLang: Lang = initialLang();

// Para código fuera de React (mensajes de error en lib/).
export function getLang(): Lang {
  return currentLang;
}

export function translate(key: MessageKey, vars?: Record<string, string | number>, lang: Lang = currentLang): string {
  let s = DICTS[lang][key] ?? es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

type I18n = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  plural: (base: "garments" | "folders" | "shop.newLooks" | "tags.untagged", n: number) => string;
  locale: string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang);

  useEffect(() => {
    currentLang = lang;
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    currentLang = l;
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(key, vars, lang), [lang]);
  const plural = useCallback(
    (base: "garments" | "folders" | "shop.newLooks" | "tags.untagged", n: number) =>
      translate(`${base}.${n === 1 ? "one" : "other"}` as MessageKey, { n }, lang),
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t, plural, locale: lang === "es" ? "es-AR" : "en-US" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n fuera de I18nProvider");
  return ctx;
}
