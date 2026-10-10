import type { Weather } from "./types";
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
