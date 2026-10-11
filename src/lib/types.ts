export type Folder = {
  id: string;
  name: string;
  position: number;
  created_at: number;
};

export type Season = "summer" | "winter" | "mid" | "all";
export type Formality = "casual" | "smart" | "formal" | "sport";

export type GarmentTags = {
  kind: GarmentKind;
  color_name: string;
  color_hex: string;
  season: Season;
  formality: Formality;
};

export type Garment = {
  id: string;
  folder_id: string;
  image_path: string;
  thumb_path: string;
  image_url: string;
  thumb_url: string;
  description: string | null;
  tags?: GarmentTags;
  created_at: number;
};

export type Weather = {
  description: string;
  temperature: number;
  min: number;
  max: number;
  precipitationProbability: number;
  wind: number;
};

export type Suggestion = {
  title: string;
  garment_ids: string[];
  explanation: string;
  tip: string;
};

export type Outfit = {
  id: string;
  prompt: string;
  weather: Weather | null;
  suggestions: Suggestion[];
  chosen_index: number | null;
  created_at: number;
  inspiration?: Inspiration; // looks recreados desde una foto
  plan?: Plan; // semana o viaje: un look por día
};

export type DayForecast = { date: string; description: string; min: number; max: number; rain: number };

export type Plan = {
  mode: "trip" | "week";
  name: string;
  destination: string;
  start: string | null; // AAAA-MM-DD
  days: number;
  notes: string;
  summary: string;
  packing_tips: string[];
  forecast: DayForecast[];
};

export type Inspiration = {
  name: string;
  reading: string;
  match: "high" | "partial" | "low";
  note: string;
  missing: { name: string; kind: GarmentKind; color_name: string; color_hex: string; material: string; why: string }[];
};

export type GarmentKind =
  | "remera"
  | "camisa"
  | "sweater"
  | "campera"
  | "pantalon"
  | "pollera"
  | "vestido"
  | "zapato"
  | "zapatilla"
  | "bolso"
  | "accesorio";

export type ShoppingPrefs = {
  styles: string[];
  notes: string;
  budget: string;
  season: string;
};

export type ShoppingItem = {
  id: string;
  name: string;
  kind: GarmentKind;
  tag: "Esencial" | "Para variar";
  color_name: string;
  color_hex: string;
  material: string;
  new_looks: number;
  why: string;
  pair_ids: string[];
};

export type ShoppingResult = {
  summary: string;
  items: ShoppingItem[];
  created_at: number;
};

export type ListItem = Omit<ShoppingItem, "id" | "pair_ids" | "new_looks"> & {
  id: string;
  suggestion_id: string;
  created_at: number;
};

export type BuyResult = {
  verdict: "buy" | "maybe" | "skip";
  headline: string;
  reasoning: string;
  item: { name: string; kind: GarmentKind; color_name: string; color_hex: string; material: string };
  pairs: { garment_id: string; note: string }[];
  similar_ids: string[];
  new_looks: number;
  tip: string;
};

export type Couple = {
  id: string;
  members: string[];
  names: Record<string, string>;
  created_at: number;
};

export type Invite = {
  email: string;
  from_uid: string;
  from_name: string;
  from_email: string;
  created_at: number;
};

export type CoupleSuggestion = {
  title: string;
  explanation: string;
  tip: string;
  picks: Record<string, string[]>; // uid → prendas de esa persona
};

export type CoupleOutfit = {
  id: string;
  prompt: string;
  weather: Weather | null;
  requested_by: string;
  names: Record<string, string>;
  suggestions: CoupleSuggestion[];
  garments: Record<string, { thumb_url: string; description: string; owner: string }>;
  chosen_index: number | null;
  created_at: number;
};
