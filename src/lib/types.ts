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
