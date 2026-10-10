import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { chooseOutfit, loadOutfitGarments, requestDayStyle } from "../lib/outfits";
import { fetchWeather } from "../lib/weather";
import type { Garment, Outfit, Weather } from "../lib/types";
import OutfitCard from "../components/OutfitCard";
import Ornament from "../components/Ornament";
import { CrownIcon, SunIcon } from "../components/Icons";

const IDEAS = [
  "Cena con amigos en un restaurante asiático elegante",
  "Oficina, reunión importante con clientes",
  "Domingo de feria y café al aire libre",
  "Casamiento de día en una quinta",
  "Primera cita en un bar de vinos",
];

const LOADING_LINES = [
  "Abriendo tu ropero…",
  "Mirando colores y texturas…",
  "Probando combinaciones…",
  "Ajustando los últimos detalles…",
];

const WEATHER_KEY = "dresscode.useWeather";

export default function DayStyle() {
  const [prompt, setPrompt] = useState("");
  const [useWeather, setUseWeather] = useState(() => {
    try {
      return localStorage.getItem(WEATHER_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [garments, setGarments] = useState<Record<string, Garment>>({});

  useEffect(() => {
    try {
      localStorage.setItem(WEATHER_KEY, useWeather ? "1" : "0");
    } catch {
      /* almacenamiento no disponible */
    }
    if (!useWeather || weather) return;
    setWeatherError(null);
    fetchWeather()
      .then(setWeather)
      .catch(() => setWeatherError("No pude obtener tu ubicación para el clima."));
  }, [useWeather, weather]);

  useEffect(() => {
    if (!busy) return;
    setLine(0);
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 4500);
    return () => clearInterval(t);
  }, [busy]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (prompt.trim().length < 3) return;
    setBusy(true);
    setError(null);
    setOutfit(null);
    try {
      const o = await requestDayStyle(prompt.trim(), useWeather ? weather : null);
      setGarments(await loadOutfitGarments([o]));
      setOutfit(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  async function choose(index: number) {
    if (!outfit) return;
    setOutfit({ ...outfit, chosen_index: index });
    try {
      await chooseOutfit(outfit.id, index);
    } catch {
      /* se reintenta desde el historial */
    }
  }

  return (
    <section className="page page-daystyle">
      <div className="velvet reveal">
        <p className="eyebrow eyebrow-light">Atelier del día</p>
        <h1 className="page-title page-title-light">
          Day <em>Style</em>
        </h1>
        <p className="velvet-sub">¿Qué ocasión te espera hoy?</p>

        <form onSubmit={submit} className="form">
          <textarea
            className="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Tengo una cena con amigos en un restaurante asiático elegante…"
            rows={4}
            maxLength={1000}
            disabled={busy}
          />

          <div className="chips">
            {IDEAS.map((idea) => (
              <button type="button" key={idea} className="chip" onClick={() => setPrompt(idea)} disabled={busy}>
                {idea}
              </button>
            ))}
          </div>

          <label className="weather-toggle">
            <input type="checkbox" checked={useWeather} onChange={(e) => setUseWeather(e.target.checked)} />
            <span className="switch" aria-hidden />
            <SunIcon width={18} height={18} />
            <span className="weather-text">
              {!useWeather
                ? "Tener en cuenta el clima"
                : weather
                  ? `${weather.description} · ${Math.round(weather.temperature)}°C (${Math.round(weather.min)}° / ${Math.round(weather.max)}°)`
                  : weatherError ?? "Buscando el clima…"}
            </span>
          </label>

          <button className="btn btn-gold btn-block btn-lg" disabled={busy || prompt.trim().length < 3}>
            <CrownIcon /> {busy ? "Vistiéndote…" : "Armar mi look"}
          </button>
        </form>
      </div>

      {busy && (
        <div className="atelier-loading reveal">
          <div className="spool" aria-hidden>
            <CrownIcon width={40} height={40} />
          </div>
          <p key={line} className="loading-line">
            {LOADING_LINES[line]}
          </p>
        </div>
      )}

      {error && (
        <div className="msg msg-error">
          {error}
          {error.includes("Ropero") && (
            <>
              {" "}
              <Link to="/ropero">Ir al Ropero →</Link>
            </>
          )}
        </div>
      )}

      {outfit && (
        <div className="looks">
          <Ornament />
          <p className="looks-intro">
            Para <em>“{outfit.prompt}”</em>
          </p>
          {outfit.suggestions.map((s, i) => (
            <OutfitCard
              key={i}
              suggestion={s}
              index={i}
              garments={garments}
              chosen={outfit.chosen_index === i}
              onChoose={() => choose(i)}
              delay={i * 150}
            />
          ))}
        </div>
      )}
    </section>
  );
}
