import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { chooseOutfit, loadOutfitGarments, requestDayStyle } from "../lib/outfits";
import { fetchWeather } from "../lib/weather";
import type { Garment, Outfit, Weather } from "../lib/types";
import OutfitCard from "../components/OutfitCard";
import PageHeader from "../components/PageHeader";
import { SparkleIcon, SunIcon } from "../components/Icons";

const IDEAS = [
  { label: "Cena elegante", prompt: "Cena con amigos en un restaurante elegante" },
  { label: "Oficina", prompt: "Día de oficina con una reunión importante" },
  { label: "Casamiento de día", prompt: "Casamiento de día al aire libre" },
  { label: "Domingo de feria", prompt: "Domingo de feria y café al aire libre" },
  { label: "Primera cita", prompt: "Primera cita en un bar de vinos" },
];

const LOADING_LINES = ["Abriendo tu ropero…", "Mirando colores y texturas…", "Probando combinaciones…", "Últimos detalles…"];

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
  const resultsRef = useRef<HTMLDivElement>(null);

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
      .catch(() => setWeatherError("No pude obtener tu ubicación"));
  }, [useWeather, weather]);

  useEffect(() => {
    if (!busy) return;
    setLine(0);
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 4500);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    if (outfit || busy) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [outfit, busy]);

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
    const next = outfit.chosen_index === index ? null : index;
    setOutfit({ ...outfit, chosen_index: next });
    try {
      await chooseOutfit(outfit.id, next);
    } catch {
      /* se puede reintentar desde el historial */
    }
  }

  const weatherTitle = weather ? `${Math.round(weather.temperature)}° · ${weather.description}` : "Clima";
  const weatherSub = !useWeather
    ? "Desactivado"
    : weather
      ? `Mín ${Math.round(weather.min)}° · Máx ${Math.round(weather.max)}° · Considerar el clima`
      : (weatherError ?? "Buscando el clima…");

  return (
    <section className="page">
      <PageHeader
        eyebrow="Day Style"
        title={
          <>
            ¿Qué te ponés <em>hoy</em>?
          </>
        }
      />

      <form onSubmit={submit} className="form">
        <label className="prompt-box">
          <span className="sr-only">Describí la ocasión</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Contame la ocasión. Ej: cena con amigos en un restaurante asiático elegante."
            rows={5}
            maxLength={1000}
            disabled={busy}
          />
        </label>

        <div className="stack-sm">
          <span className="label">Ideas</span>
          <div className="chips">
            {IDEAS.map((idea) => (
              <button type="button" key={idea.label} className="chip" onClick={() => setPrompt(idea.prompt)} disabled={busy}>
                {idea.label}
              </button>
            ))}
          </div>
        </div>

        <div className="weather-row">
          <SunIcon />
          <div className="weather-text">
            <span>{useWeather ? weatherTitle : "Clima"}</span>
            <span className="muted">{weatherSub}</span>
          </div>
          <button
            type="button"
            className={`switch ${useWeather ? "on" : ""}`}
            aria-pressed={useWeather}
            aria-label="Considerar el clima"
            onClick={() => setUseWeather(!useWeather)}
          >
            <span />
          </button>
        </div>

        <button className="btn btn-primary btn-block btn-lg" disabled={busy || prompt.trim().length < 3}>
          <SparkleIcon width={20} height={20} /> {busy ? "Creando tu look…" : "Crear mi look"}
        </button>
      </form>

      <div ref={resultsRef} className="results-anchor" />

      {busy && (
        <div className="thinking fade-in">
          <div className="spinner" />
          <p key={line} className="fade-in">
            {LOADING_LINES[line]}
          </p>
        </div>
      )}

      {error && (
        <p className="msg msg-error">
          {error}
          {error.includes("Ropero") && (
            <>
              {" "}
              <Link to="/ropero">Ir al Ropero</Link>
            </>
          )}
        </p>
      )}

      {outfit && (
        <div className="looks">
          <header className="looks-head">
            <span className="eyebrow">Tus looks para</span>
            <p className="looks-prompt">“{outfit.prompt}”</p>
            {outfit.weather && (
              <span className="muted">
                {Math.round(outfit.weather.temperature)}° · {outfit.weather.description}
              </span>
            )}
          </header>
          {outfit.suggestions.map((s, i) => (
            <OutfitCard
              key={i}
              suggestion={s}
              index={i}
              garments={garments}
              chosen={outfit.chosen_index === i}
              onChoose={() => choose(i)}
              delay={i * 120}
            />
          ))}
        </div>
      )}
    </section>
  );
}
