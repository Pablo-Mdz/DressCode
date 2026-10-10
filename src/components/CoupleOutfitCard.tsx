import type { CoupleOutfit } from "../lib/types";
import { useI18n } from "../lib/i18n";
import { CheckIcon } from "./Icons";

// Un look en pareja: dos columnas (vos primero) con las prendas de cada uno.
export default function CoupleOutfitCard({
  outfit,
  index,
  myUid,
  chosen,
  onChoose,
  delay = 0,
}: {
  outfit: CoupleOutfit;
  index: number;
  myUid: string;
  chosen?: boolean;
  onChoose?: () => void;
  delay?: number;
}) {
  const { t } = useI18n();
  const s = outfit.suggestions[index];
  const people = Object.keys(s.picks).sort((a, b) => (a === myUid ? -1 : b === myUid ? 1 : 0));

  return (
    <article className="look fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="look-head">
        <span className="look-num">{String(index + 1).padStart(2, "0")}</span>
        <h2 className="look-title">{s.title}</h2>
      </div>

      <div className="couple-cols">
        {people.map((uid) => (
          <div key={uid} className="couple-col">
            <span className="eyebrow">{uid === myUid ? t("couple.you") : outfit.names[uid]}</span>
            <div className="couple-pieces">
              {s.picks[uid].map((id) => {
                const g = outfit.garments[id];
                return (
                  <div key={id} className="photo couple-piece">
                    {g?.thumb_url ? (
                      <img src={g.thumb_url} alt={g.description || t("garment.alt")} />
                    ) : (
                      <span className="gone">{t("look.deleted")}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="look-text">{s.explanation}</p>
      {s.tip && (
        <div className="tip">
          <span className="eyebrow">{t("look.tip")}</span>
          <p>{s.tip}</p>
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
