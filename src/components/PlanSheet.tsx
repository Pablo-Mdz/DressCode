import { useEffect, useState } from "react";
import { planWeek } from "../lib/ai";
import { loadOutfitGarments } from "../lib/outfits";
import { fetchForecast } from "../lib/weather";
import { useI18n, type MessageKey } from "../lib/i18n";
import type { Garment, Outfit } from "../lib/types";
import Sheet from "./Sheet";
import PlanView from "./PlanView";
import { SparkleIcon } from "./Icons";

const LOADING_LINES: MessageKey[] = ["plan.loading1", "plan.loading2", "plan.loading3", "plan.loading4"];

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Planificar una semana o un viaje: un look por día con prendas del ropero.
export default function PlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"trip" | "week">("trip");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState(() => isoDate(new Date()));
  const [days, setDays] = useState(5);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [garments, setGarments] = useState<Record<string, Garment>>({});

  useEffect(() => {
    if (!busy) return;
    setLine(0);
    const id = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 7000);
    return () => clearInterval(id);
  }, [busy]);

  const switchMode = (m: "trip" | "week") => {
    setMode(m);
    setDays(m === "week" ? 7 : 5);
  };

  const close = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const dest = mode === "trip" ? destination.trim() : "";
      // Sin pronóstico (fecha lejana, ciudad no encontrada, sin permiso de ubicación) la IA usa el clima típico.
      const forecast = await fetchForecast(dest, start, days, lang).catch(() => null);
      const o = await planWeek({ mode, destination: dest, start, days, notes: notes.trim(), forecast }, lang);
      setGarments(await loadOutfitGarments([o]));
      setOutfit(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("plan.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={close} title={t("plan.title")} cancelLabel={outfit ? t("common.close") : undefined}>
      {outfit?.plan ? (
        <>
          <PlanView outfit={outfit} plan={outfit.plan} garments={garments} />
          <p className="muted">{t("insp.saved")}</p>
          <button className="btn btn-outline btn-block" onClick={() => setOutfit(null)}>
            {t("plan.another")}
          </button>
        </>
      ) : (
        <>
          <div className="segmented" role="group" aria-label={t("plan.title")}>
            {(["trip", "week"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)} disabled={busy}>
                {m === "trip" ? t("plan.trip") : t("plan.week")}
              </button>
            ))}
          </div>

          <div className="group">
            {mode === "trip" && (
              <label className="group-row">
                <span>{t("plan.destination")}</span>
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t("plan.destinationPlaceholder")}
                  maxLength={80}
                  disabled={busy}
                />
              </label>
            )}
            <label className="group-row">
              <span>{mode === "trip" ? t("plan.start") : t("plan.startWeek")}</span>
              <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} disabled={busy} />
            </label>
            <div className="group-row">
              <span>{t("plan.days")}</span>
              <div className="stepper">
                <button type="button" onClick={() => setDays((d) => Math.max(1, d - 1))} disabled={busy || days <= 1} aria-label="−">
                  −
                </button>
                <span>{days}</span>
                <button type="button" onClick={() => setDays((d) => Math.min(14, d + 1))} disabled={busy || days >= 14} aria-label="+">
                  +
                </button>
              </div>
            </div>
          </div>

          <label className="stack-sm">
            <span className="label">{mode === "trip" ? t("plan.notesTrip") : t("plan.notesWeek")}</span>
            <textarea
              className="soft-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={mode === "trip" ? t("plan.notesTripPlaceholder") : t("plan.notesWeekPlaceholder")}
              maxLength={1000}
              disabled={busy}
            />
          </label>

          {error && <p className="msg msg-error">{error}</p>}

          {busy ? (
            <div className="thinking">
              <div className="spinner" />
              <p key={line} className="fade-in">
                {t(LOADING_LINES[line])}
              </p>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={submit}
              disabled={mode === "trip" && !destination.trim() && !notes.trim()}
            >
              <SparkleIcon width={20} height={20} /> {t("plan.submit")}
            </button>
          )}
        </>
      )}
    </Sheet>
  );
}
