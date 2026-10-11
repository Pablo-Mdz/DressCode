import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { chooseOutfit, loadOutfitGarments, requestDayStyle } from "../lib/outfits";
import { fetchWeather } from "../lib/weather";
import type { CoupleOutfit, Garment, Outfit, Weather } from "../lib/types";
import { useCouple } from "../context/CoupleContext";
import { useAuth } from "../context/AuthContext";
import { chooseCoupleOutfit, requestCoupleStyle } from "../lib/couple";
import CoupleOutfitCard from "../components/CoupleOutfitCard";
import OutfitCard from "../components/OutfitCard";
import InspireSheet from "../components/InspireSheet";
import PlanSheet from "../components/PlanSheet";
import PageHeader from "../components/PageHeader";
import { ChevronIcon, GalleryIcon, HeartsIcon, SparkleIcon, SuitcaseIcon, SunIcon } from "../components/Icons";
import { useI18n, type MessageKey } from "../lib/i18n";

const IDEAS = ["dinner", "office", "wedding", "market", "date"] as const;

const LOADING_LINES: MessageKey[] = ["day.loading1", "day.loading2", "day.loading3", "day.loading4"];

const WEATHER_KEY = "dresscode.useWeather";

export default function DayStyle() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { couple, partnerName } = useCouple();
  const [forBoth, setForBoth] = useState(false);
  const [coupleOutfit, setCoupleOutfit] = useState<CoupleOutfit | null>(null);
  const [inspireOpen, setInspireOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
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
    if (!useWeather) return;
    setWeatherError(null);
    fetchWeather(lang)
      .then(setWeather)
      .catch(() => setWeatherError(t("day.weatherError")));
  }, [useWeather, lang, t]);

  useEffect(() => {
    if (!busy) return;
    setLine(0);
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 4500);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    if (outfit || coupleOutfit || busy) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [outfit, coupleOutfit, busy]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (prompt.trim().length < 3) return;
    setBusy(true);
    setError(null);
    setOutfit(null);
    setCoupleOutfit(null);
    try {
      if (couple && forBoth) {
        setCoupleOutfit(await requestCoupleStyle(prompt.trim(), useWeather ? weather : null, lang));
        return;
      }
      const o = await requestDayStyle(prompt.trim(), useWeather ? weather : null, lang);
      setGarments(await loadOutfitGarments([o]));
      setOutfit(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function chooseCouple(index: number) {
    if (!coupleOutfit || !couple) return;
    const next = coupleOutfit.chosen_index === index ? null : index;
    setCoupleOutfit({ ...coupleOutfit, chosen_index: next });
    try {
      await chooseCoupleOutfit(couple, coupleOutfit.id, next);
    } catch {
      /* se puede reintentar desde el historial */
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

  const weatherTitle = weather ? `${Math.round(weather.temperature)}° · ${weather.description}` : t("day.weather");
  const weatherSub = !useWeather
    ? t("day.weatherOff")
    : weather
      ? t("day.weatherDetail", { min: Math.round(weather.min), max: Math.round(weather.max) })
      : (weatherError ?? t("day.weatherSearching"));
  const [titleA, titleEm, titleB] = t("day.title").split(/<\/?em>/);

  return (
    <section className="page">
      <PageHeader
        eyebrow={t("tab.dayStyle")}
        title={
          <>
            {titleA}
            <em>{titleEm}</em>
            {titleB}
          </>
        }
      />

      <form onSubmit={submit} className="form">
        <label className="prompt-box">
          <span className="sr-only">{t("day.describe")}</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("day.placeholder")}
            rows={5}
            maxLength={1000}
            disabled={busy}
          />
        </label>

        <div className="stack-sm">
          <span className="label">{t("day.ideas")}</span>
          <div className="chips">
            {IDEAS.map((idea) => (
              <button
                type="button"
                key={idea}
                className="chip"
                onClick={() => setPrompt(t(`day.idea.${idea}.prompt` as MessageKey))}
                disabled={busy}
              >
                {t(`day.idea.${idea}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="weather-row">
          <SunIcon />
          <div className="weather-text">
            <span>{useWeather ? weatherTitle : t("day.weather")}</span>
            <span className="muted">{weatherSub}</span>
          </div>
          <button
            type="button"
            className={`switch ${useWeather ? "on" : ""}`}
            aria-pressed={useWeather}
            aria-label={t("day.weatherToggle")}
            onClick={() => setUseWeather(!useWeather)}
          >
            <span />
          </button>
        </div>

        {couple && (
          <div className="weather-row">
            <HeartsIcon />
            <div className="weather-text">
              <span>{t("couple.toggle")}</span>
              <span className="muted">{t("couple.toggleHint", { name: partnerName })}</span>
            </div>
            <button
              type="button"
              className={`switch ${forBoth ? "on" : ""}`}
              aria-pressed={forBoth}
              aria-label={t("couple.toggle")}
              onClick={() => setForBoth(!forBoth)}
              disabled={busy}
            >
              <span />
            </button>
          </div>
        )}

        <button className="btn btn-primary btn-block btn-lg" disabled={busy || prompt.trim().length < 3}>
          <SparkleIcon width={20} height={20} /> {busy ? t("day.submitting") : t("day.submit")}
        </button>
      </form>

      <button className="entry-card" onClick={() => setInspireOpen(true)}>
        <span className="entry-icon">
          <GalleryIcon width={22} height={22} />
        </span>
        <span className="entry-text">
          <span className="serif-md">{t("insp.title")}</span>
          <span className="muted">{t("insp.entry")}</span>
        </span>
        <ChevronIcon width={18} height={18} className="chevron" />
      </button>

      <button className="entry-card" onClick={() => setPlanOpen(true)}>
        <span className="entry-icon">
          <SuitcaseIcon width={22} height={22} />
        </span>
        <span className="entry-text">
          <span className="serif-md">{t("plan.title")}</span>
          <span className="muted">{t("plan.entry")}</span>
        </span>
        <ChevronIcon width={18} height={18} className="chevron" />
      </button>

      <div ref={resultsRef} className="results-anchor" />

      {busy && (
        <div className="thinking fade-in">
          <div className="spinner" />
          <p key={line} className="fade-in">
            {t(LOADING_LINES[line])}
          </p>
        </div>
      )}

      {error && (
        <p className="msg msg-error">
          {error}
          {error.toLowerCase().includes(t("tab.wardrobe").toLowerCase()) && (
            <>
              {" "}
              <Link to="/ropero">{t("day.goWardrobe")}</Link>
            </>
          )}
        </p>
      )}

      {coupleOutfit && user && (
        <div className="looks">
          <header className="looks-head">
            <span className="eyebrow">{t("day.resultsFor")}</span>
            <p className="looks-prompt">“{coupleOutfit.prompt}”</p>
          </header>
          {coupleOutfit.suggestions.map((_, i) => (
            <CoupleOutfitCard
              key={i}
              outfit={coupleOutfit}
              index={i}
              myUid={user.uid}
              chosen={coupleOutfit.chosen_index === i}
              onChoose={() => chooseCouple(i)}
              delay={i * 120}
            />
          ))}
        </div>
      )}

      {outfit && (
        <div className="looks">
          <header className="looks-head">
            <span className="eyebrow">{t("day.resultsFor")}</span>
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

      <InspireSheet open={inspireOpen} onClose={() => setInspireOpen(false)} />
      <PlanSheet open={planOpen} onClose={() => setPlanOpen(false)} />
    </section>
  );
}
