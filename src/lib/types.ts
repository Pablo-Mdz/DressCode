export type Folder = {
  id: string;
  name: string;
  position: number;
  created_at: number;
};

export type Garment = {
  id: string;
  folder_id: string;
  image_path: string;
  thumb_path: string;
  image_url: string;
  thumb_url: string;
  description: string | null;
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
