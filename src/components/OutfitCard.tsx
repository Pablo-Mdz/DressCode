import type { Garment, Suggestion } from "../lib/types";
import { CheckIcon } from "./Icons";
import { useI18n } from "../lib/i18n";

export default function OutfitCard({
  suggestion,
  index,
  garments,
  chosen,
  onChoose,
  delay = 0,
}: {
  suggestion: Suggestion;
  index: number;
  garments: Record<string, Garment>;
  chosen?: boolean;
  onChoose?: () => void;
  delay?: number;
}) {
  const { t } = useI18n();
  return (
    <article className="look fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="look-head">
        <span className="look-num">{String(index + 1).padStart(2, "0")}</span>
        <h2 className="look-title">{suggestion.title}</h2>
      </div>

      <div className="look-grid">
        {suggestion.garment_ids.map((id) => {
          const g = garments[id];
          return (
            <div key={id} className="photo look-piece">
              {g ? <img src={g.thumb_url} alt={g.description ?? t("garment.alt")} /> : <span className="gone">{t("look.deleted")}</span>}
            </div>
          );
        })}
      </div>

      <p className="look-text">{suggestion.explanation}</p>
      {suggestion.tip && (
        <div className="tip">
          <span className="eyebrow">{t("look.tip")}</span>
          <p>{suggestion.tip}</p>
        </div>
      )}

      {onChoose &&
        (chosen ? (
          <button className="btn btn-primary btn-block" onClick={onChoose}>
            <CheckIcon width={18} height={18} /> {t("look.chosen")}
          </button>
        ) : (
          <button className="btn btn-outline-dark btn-block" onClick={onChoose}>
            {t("look.choose")}
          </button>
        ))}
    </article>
  );
}
