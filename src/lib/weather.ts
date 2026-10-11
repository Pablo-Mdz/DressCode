import type { DayForecast, Weather } from "./types";
import type { Lang } from "./i18n";

// Open-Meteo: gratis y sin API key.
const CODES_ES: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna leve",
  53: "Llovizna",
  55: "Llovizna intensa",
  56: "Llovizna helada",
  57: "Llovizna helada intensa",
  61: "Lluvia leve",
  63: "Lluvia",
  65: "Lluvia intensa",
  66: "Lluvia helada",
  67: "Lluvia helada intensa",
  71: "Nevada leve",
  73: "Nevada",
  75: "Nevada intensa",
  77: "Granizo fino",
  80: "Chaparrones leves",
  81: "Chaparrones",
  82: "Chaparrones fuertes",
  85: "Chaparrones de nieve",
  86: "Chaparrones de nieve fuertes",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta fuerte con granizo",
};

const CODES_EN: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm with hail",
};

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("geolocation unavailable"));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 30 * 60 * 1000,
    });
  });
}

// Pronóstico día por día para un viaje (o para casa si no hay destino).
// Open-Meteo pronostica hasta 16 días: si el viaje es más adelante, devuelve null.
export async function fetchForecast(
  destination: string,
  start: string,
  days: number,
  lang: Lang = "es",
): Promise<DayForecast[] | null> {
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(first.getTime() + (days - 1) * 86_400_000);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today.getTime() + 15 * 86_400_000);
  if (first < today || first > limit) return null;
  const end = last > limit ? limit : last;

  let latitude: number;
  let longitude: number;
  if (destination.trim()) {
    const q = new URLSearchParams({ name: destination.trim(), count: "1", language: lang });
    const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${q}`).then((r) => (r.ok ? r.json() : null));
    const place = geo?.results?.[0];
    if (!place) return null;
    latitude = place.latitude;
    longitude = place.longitude;
  } else {
    const pos = await getPosition();
    latitude = pos.coords.latitude;
    longitude = pos.coords.longitude;
  }

  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const params = new URLSearchParams({
    latitude: latitude.toFixed(3),
    longitude: longitude.toFixed(3),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    start_date: iso(first),
    end_date: iso(end),
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) return null;
  const d = await res.json();
  const codes = lang === "en" ? CODES_EN : CODES_ES;
  return (d.daily.time as string[]).map((date, i) => ({
    date,
    description: codes[d.daily.weather_code[i]] ?? "",
    min: Math.round(d.daily.temperature_2m_min[i]),
    max: Math.round(d.daily.temperature_2m_max[i]),
    rain: d.daily.precipitation_probability_max[i] ?? 0,
  }));
}

export async function fetchWeather(lang: Lang = "es"): Promise<Weather> {
  const pos = await getPosition();
  const params = new URLSearchParams({
    latitude: pos.coords.latitude.toFixed(3),
    longitude: pos.coords.longitude.toFixed(3),
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "1",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error("weather unavailable");
  const d = await res.json();
  return {
    description: (lang === "en" ? CODES_EN : CODES_ES)[d.current.weather_code] ?? (lang === "en" ? "Changeable" : "Clima variable"),
    temperature: d.current.temperature_2m,
    min: d.daily.temperature_2m_min[0],
    max: d.daily.temperature_2m_max[0],
    precipitationProbability: d.daily.precipitation_probability_max[0] ?? 0,
    wind: d.current.wind_speed_10m,
  };
}
