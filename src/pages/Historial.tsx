import { useEffect, useState } from "react";
import { chooseOutfit, deleteOutfit, listOutfits, loadOutfitGarments } from "../lib/outfits";
import type { Garment, Outfit } from "../lib/types";
import OutfitCard from "../components/OutfitCard";
import Ornament from "../components/Ornament";
import ConfirmSheet from "../components/ConfirmSheet";
import { SunIcon, TrashIcon } from "../components/Icons";

const fmt = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default function Historial() {
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [garments, setGarments] = useState<Record<string, Garment>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [onlyChosen, setOnlyChosen] = useState(false);
  const [toDelete, setToDelete] = useState<Outfit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await listOutfits();
        setGarments(await loadOutfitGarments(list));
        setOutfits(list);
        setOpen(list[0]?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pude cargar el historial");
      }
    })();
  }, []);

  async function choose(o: Outfit, index: number) {
    const next = o.chosen_index === index ? null : index;
    setOutfits((prev) => prev!.map((x) => (x.id === o.id ? { ...x, chosen_index: next } : x)));
    try {
      await chooseOutfit(o.id, next);
    } catch {
      setError("No pude guardar tu elección");
    }
  }

  const visible = (outfits ?? []).filter((o) => !onlyChosen || o.chosen_index != null);

  return (
    <section className="page">
      <header className="page-head reveal">
        <p className="eyebrow">Archivo de looks</p>
        <h1 className="page-title">
          <em>Historial</em>
        </h1>
        <Ornament />
      </header>

      {outfits && outfits.length > 0 && (
        <div className="segmented">
          <button className={!onlyChosen ? "active" : ""} onClick={() => setOnlyChosen(false)}>
            Todos
          </button>
          <button className={onlyChosen ? "active" : ""} onClick={() => setOnlyChosen(true)}>
            Elegidos
          </button>
        </div>
      )}

      {error && <p className="msg msg-error">{error}</p>}
      {!outfits && !error && <div className="loader" />}
      {outfits && outfits.length === 0 && (
        <div className="empty reveal">
          <p>Todavía no pediste ningún look.</p>
          <p className="muted">Andá a Day Style y contame tu próxima ocasión.</p>
        </div>
      )}

      <div className="history">
        {visible.map((o, idx) => {
          const isOpen = open === o.id;
          const shown = onlyChosen && o.chosen_index != null ? [o.chosen_index] : o.suggestions.map((_, i) => i);
          return (
            <div key={o.id} className={`history-item reveal ${isOpen ? "open" : ""}`} style={{ animationDelay: `${Math.min(idx, 8) * 50}ms` }}>
              <button className="history-head" onClick={() => setOpen(isOpen ? null : o.id)}>
                <span className="history-date">{fmt.format(new Date(o.created_at))}</span>
                <span className="history-prompt">“{o.prompt}”</span>
                <span className="history-meta">
                  {o.weather && (
                    <>
                      <SunIcon width={14} height={14} /> {Math.round(o.weather.temperature)}°C ·{" "}
                    </>
                  )}
                  {o.suggestions.length} looks{o.chosen_index != null ? " · 1 elegido" : ""}
                </span>
              </button>
              {isOpen && (
                <div className="history-body">
                  {shown.map((i) => (
                    <OutfitCard
                      key={i}
                      suggestion={o.suggestions[i]}
                      index={i}
                      garments={garments}
                      chosen={o.chosen_index === i}
                      onChoose={() => choose(o, i)}
                    />
                  ))}
                  <div className="row-actions">
                    {o.chosen_index != null && (
                      <button className="btn btn-ghost" onClick={() => choose(o, o.chosen_index!)}>
                        Quitar elección
                      </button>
                    )}
                    <button className="btn btn-danger-ghost" onClick={() => setToDelete(o)}>
                      <TrashIcon /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmSheet
        open={!!toDelete}
        title="Eliminar del historial"
        message="Se eliminará esta consulta y sus looks."
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteOutfit(toDelete.id);
          setOutfits((prev) => prev!.filter((x) => x.id !== toDelete.id));
        }}
      />
    </section>
  );
}
