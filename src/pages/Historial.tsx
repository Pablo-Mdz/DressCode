import { useEffect, useState } from "react";
import { chooseOutfit, deleteOutfit, listOutfits, loadOutfitGarments } from "../lib/outfits";
import type { Garment, Outfit } from "../lib/types";
import OutfitCard from "../components/OutfitCard";
import PageHeader from "../components/PageHeader";
import Sheet from "../components/Sheet";
import ConfirmSheet from "../components/ConfirmSheet";
import { ChevronIcon } from "../components/Icons";

const fmtDay = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" });
const fmtTime = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

function when(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Hoy, ${fmtTime.format(d)}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ayer, ${fmtTime.format(d)}`;
  const s = fmtDay.format(d).replace(/\./g, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Historial() {
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [garments, setGarments] = useState<Record<string, Garment>>({});
  const [onlyChosen, setOnlyChosen] = useState(false);
  const [open, setOpen] = useState<Outfit | null>(null);
  const [toDelete, setToDelete] = useState<Outfit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await listOutfits();
        setGarments(await loadOutfitGarments(list));
        setOutfits(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pude cargar el historial");
      }
    })();
  }, []);

  async function choose(o: Outfit, index: number) {
    const next = o.chosen_index === index ? null : index;
    const updated = { ...o, chosen_index: next };
    setOutfits((prev) => prev!.map((x) => (x.id === o.id ? updated : x)));
    setOpen(updated);
    try {
      await chooseOutfit(o.id, next);
    } catch {
      setError("No pude guardar tu elección");
    }
  }

  const visible = (outfits ?? []).filter((o) => !onlyChosen || o.chosen_index != null);

  return (
    <section className="page">
      <PageHeader title="Historial" subtitle="Tus looks anteriores" />

      <div className="segmented" role="group" aria-label="Filtrar">
        <button aria-pressed={!onlyChosen} onClick={() => setOnlyChosen(false)}>
          Todos
        </button>
        <button aria-pressed={onlyChosen} onClick={() => setOnlyChosen(true)}>
          Elegidos
        </button>
      </div>

      {error && <p className="msg msg-error">{error}</p>}
      {!outfits && !error && <div className="spinner" />}
      {outfits && visible.length === 0 && (
        <div className="empty fade-in">
          <p className="empty-title">{onlyChosen ? "Todavía no elegiste ningún look" : "Todavía no pediste ningún look"}</p>
          <p className="muted">Contale a Day Style tu próxima ocasión.</p>
        </div>
      )}

      <div className="list">
        {visible.map((o) => {
          const shown = o.suggestions[o.chosen_index ?? 0] ?? o.suggestions[0];
          return (
            <button key={o.id} className="list-row fade-in" onClick={() => setOpen(o)}>
              <div className="list-main">
                <div className="list-meta">
                  <span>{when(o.created_at)}</span>
                  {o.chosen_index != null && <span className="chosen-dot">Elegido</span>}
                </div>
                <span className="list-title">{o.prompt}</span>
                <div className="mini-thumbs">
                  {shown?.garment_ids.slice(0, 5).map((id) =>
                    garments[id] ? <img key={id} src={garments[id].thumb_url} alt="" /> : <span key={id} />,
                  )}
                </div>
              </div>
              <ChevronIcon width={18} height={18} className="chevron" />
            </button>
          );
        })}
      </div>

      <Sheet open={!!open && !toDelete} onClose={() => setOpen(null)} title="Looks" cancelLabel="Cerrar">
        {open && (
          <>
            <header className="looks-head">
              <span className="eyebrow">{when(open.created_at)}</span>
              <p className="looks-prompt">“{open.prompt}”</p>
            </header>
            {open.suggestions.map((s, i) => (
              <OutfitCard
                key={i}
                suggestion={s}
                index={i}
                garments={garments}
                chosen={open.chosen_index === i}
                onChoose={() => choose(open, i)}
              />
            ))}
            <button className="btn btn-danger-text btn-block" onClick={() => setToDelete(open)}>
              Eliminar del historial
            </button>
          </>
        )}
      </Sheet>

      <ConfirmSheet
        open={!!toDelete}
        title="Eliminar"
        message="Se eliminará esta consulta y sus looks."
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          await deleteOutfit(toDelete.id);
          setOutfits((prev) => prev!.filter((x) => x.id !== toDelete.id));
          setOpen(null);
        }}
      />
    </section>
  );
}
