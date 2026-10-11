import { useI18n } from "../lib/i18n";
import type { Garment, Outfit, Plan } from "../lib/types";
import OutfitCard from "./OutfitCard";

// Plan de semana o viaje: resumen, valija (todas las prendas, sin repetir) y un look por día.
export default function PlanView({ outfit, plan, garments }: { outfit: Outfit; plan: Plan; garments: Record<string, Garment> }) {
  const { t, locale } = useI18n();
  const packing = [...new Set(outfit.suggestions.flatMap((s) => s.garment_ids))].filter((id) => garments[id]);
  const forecastByDate = new Map(plan.forecast.map((f) => [f.date, f]));

  const dayInfo = (i: number) => {
    if (!plan.start) return { label: t("plan.day", { n: i + 1 }), forecast: undefined };
    const d = new Date(`${plan.start}T12:00:00`);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const date = d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
    return { label: `${t("plan.day", { n: i + 1 })} · ${date}`, forecast: forecastByDate.get(iso) };
  };

  return (
    <div className="plan fade-in">
      <header className="stack-xs">
        <span className="eyebrow">
          {plan.mode === "trip" ? t("plan.trip") : t("plan.week")}
          {plan.destination ? ` · ${plan.destination}` : ""}
        </span>
        <h3 className="verdict-title">{plan.name}</h3>
        <p className="buy-why">{plan.summary}</p>
      </header>

      <section className="card-outline stack-sm">
        <span className="label">
          {plan.mode === "trip" ? t("plan.suitcase", { n: packing.length }) : t("plan.pieces", { n: packing.length })}
        </span>
        <div className="packing-grid">
          {packing.map((id) => (
            <div key={id} className="photo packing-piece">
              <img src={garments[id].thumb_url} alt={garments[id].description ?? t("garment.alt")} />
            </div>
          ))}
        </div>
        {plan.packing_tips.length > 0 && (
          <ul className="plan-tips">
            {plan.packing_tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="looks">
        {outfit.suggestions.map((s, i) => {
          const { label, forecast } = dayInfo(i);
          return (
            <div key={i} className="stack-xs">
              <span className="plan-day">
                {label}
                {forecast && (
                  <span className="muted">
                    {" "}
                    · {forecast.min}°–{forecast.max}° {forecast.description}
                  </span>
                )}
              </span>
              <OutfitCard suggestion={s} index={i} garments={garments} delay={Math.min(i, 6) * 80} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
