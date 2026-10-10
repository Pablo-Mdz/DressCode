import type { Weather } from "./types";

// Open-Meteo: gratis y sin API key.
const CODES: Record<number, string> = {
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

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Tu navegador no permite ubicación"));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 30 * 60 * 1000,
    });
  });
}

export async function fetchWeather(): Promise<Weather> {
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
  if (!res.ok) throw new Error("No pude obtener el clima");
  const d = await res.json();
  return {
    description: CODES[d.current.weather_code] ?? "Clima variable",
    temperature: d.current.temperature_2m,
    min: d.daily.temperature_2m_min[0],
    max: d.daily.temperature_2m_max[0],
    precipitationProbability: d.daily.precipitation_probability_max[0] ?? 0,
    wind: d.current.wind_speed_10m,
  };
}
