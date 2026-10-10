import type { Garment, Suggestion } from "../lib/types";
import { CheckIcon } from "./Icons";

const ROMAN = ["I", "II", "III"];

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
  return (
    <article className={`look reveal ${chosen ? "look-chosen" : ""}`} style={{ animationDelay: `${delay}ms` }}>
      <header className="look-head">
        <span className="look-num">{ROMAN[index] ?? index + 1}</span>
        <h3 className="look-title">{suggestion.title}</h3>
        {chosen && (
          <span className="look-badge">
            <CheckIcon width={14} height={14} /> Elegido
          </span>
        )}
      </header>

      <div className={`look-collage n${Math.min(suggestion.garment_ids.length, 5)}`}>
        {suggestion.garment_ids.map((id) => {
          const g = garments[id];
          const url = g?.thumb_url;
          return (
            <div key={id} className="frame look-piece">
              {url ? <img src={url} alt={g?.description ?? "Prenda"} /> : <span className="gone">Prenda eliminada</span>}
            </div>
          );
        })}
      </div>

      <p className="look-text">{suggestion.explanation}</p>
      {suggestion.tip && (
        <p className="look-tip">
          <span>Consejo</span> {suggestion.tip}
        </p>
      )}

      {onChoose && !chosen && (
        <button className="btn btn-ghost btn-block" onClick={onChoose}>
          Elegir este look
        </button>
      )}
    </article>
  );
}
