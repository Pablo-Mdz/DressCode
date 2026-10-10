import { useEffect, useState } from "react";
import { chooseOutfit, deleteOutfit, listOutfits, loadOutfitGarments } from "../lib/outfits";
import type { Garment, Outfit } from "../lib/types";
import OutfitCard from "../components/OutfitCard";
import PageHeader from "../components/PageHeader";
import Sheet from "../components/Sheet";
import ConfirmSheet from "../components/ConfirmSheet";
import CoupleOutfitCard from "../components/CoupleOutfitCard";
import { useCouple } from "../context/CoupleContext";
import { useAuth } from "../context/AuthContext";
import { chooseCoupleOutfit, deleteCoupleOutfit, listCoupleOutfits } from "../lib/couple";
import type { CoupleOutfit } from "../lib/types";
import { ChevronIcon } from "../components/Icons";
import { useI18n } from "../lib/i18n";

export default function Historial() {
  const { t, locale } = useI18n();

  function when(ts: number) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
    if (d.toDateString() === today.toDateString()) return t("history.today", { time });
    if (d.toDateString() === yesterday.toDateString()) return t("history.yesterday", { time });
    const s = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" })
      .format(d)
      .replace(/\./g, "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [garments, setGarments] = useState<Record<string, Garment>>({});
  const [onlyChosen, setOnlyChosen] = useState(false);
  const { user } = useAuth();
  const { couple } = useCouple();
  const [showCouple, setShowCouple] = useState(false);
  const [coupleOutfits, setCoupleOutfits] = useState<CoupleOutfit[] | null>(null);
  const [openCouple, setOpenCouple] = useState<CoupleOutfit | null>(null);
  const [deleteCouple, setDeleteCouple] = useState<CoupleOutfit | null>(null);

  useEffect(() => {
    if (!couple) return setCoupleOutfits(null);
    listCoupleOutfits(couple)
      .then(setCoupleOutfits)
      .catch(() => setCoupleOutfits([]));
  }, [couple]);

  async function chooseCouple(o: CoupleOutfit, index: number) {
    if (!couple) return;
    const next = o.chosen_index === index ? null : index;
    const updated = { ...o, chosen_index: next };
    setCoupleOutfits((prev) => prev?.map((x) => (x.id === o.id ? updated : x)) ?? prev);
    setOpenCouple(updated);
    try {
      await chooseCoupleOutfit(couple, o.id, next);
    } catch {
      setError(t("history.chooseError"));
    }
  }
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
        setError(e instanceof Error ? e.message : t("history.loadError"));
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
      setError(t("history.chooseError"));
    }
  }

  const visible = (outfits ?? []).filter((o) => !onlyChosen || o.chosen_index != null);

  return (
    <section className="page">
      <PageHeader title={t("history.title")} subtitle={t("history.subtitle")} />

      <div className="segmented" role="group" aria-label={t("history.filter")}>
        <button
          aria-pressed={!onlyChosen && !showCouple}
          onClick={() => {
            setOnlyChosen(false);
            setShowCouple(false);
          }}
        >
          {t("history.all")}
        </button>
        <button
          aria-pressed={onlyChosen && !showCouple}
          onClick={() => {
            setOnlyChosen(true);
            setShowCouple(false);
          }}
        >
          {t("history.chosen")}
        </button>
        {couple && (
          <button aria-pressed={showCouple} onClick={() => setShowCouple(true)}>
            {t("couple.tab")}
          </button>
        )}
      </div>

      {showCouple && user && (
        <>
          {!coupleOutfits && <div className="spinner" />}
          {coupleOutfits && coupleOutfits.length === 0 && (
            <div className="empty fade-in">
              <p className="empty-title">{t("couple.emptyHistory")}</p>
              <p className="muted">{t("history.emptyText")}</p>
            </div>
          )}
          <div className="list">
            {coupleOutfits?.map((o) => {
              const shown = o.suggestions[o.chosen_index ?? 0] ?? o.suggestions[0];
              const ids = shown ? Object.values(shown.picks).flat().slice(0, 6) : [];
              return (
                <button key={o.id} className="list-row fade-in" onClick={() => setOpenCouple(o)}>
                  <div className="list-main">
                    <div className="list-meta">
                      <span>{when(o.created_at)}</span>
                      {o.chosen_index != null && <span className="chosen-dot">{t("history.chosenBadge")}</span>}
                    </div>
                    <span className="list-title">{o.prompt}</span>
                    <div className="mini-thumbs">
                      {ids.map((id) =>
                        o.garments[id]?.thumb_url ? (
                          <img key={id} src={o.garments[id].thumb_url} alt="" />
                        ) : (
                          <span key={id} />
                        ),
                      )}
                    </div>
                  </div>
                  <ChevronIcon width={18} height={18} className="chevron" />
                </button>
              );
            })}
          </div>

          <Sheet
            open={!!openCouple && !deleteCouple}
            onClose={() => setOpenCouple(null)}
            title={t("history.sheetTitle")}
            cancelLabel={t("common.close")}
          >
            {openCouple && (
              <>
                <header className="looks-head">
                  <span className="eyebrow">{when(openCouple.created_at)}</span>
                  <p className="looks-prompt">“{openCouple.prompt}”</p>
                </header>
                {openCouple.suggestions.map((_, i) => (
                  <CoupleOutfitCard
                    key={i}
                    outfit={openCouple}
                    index={i}
                    myUid={user.uid}
                    chosen={openCouple.chosen_index === i}
                    onChoose={() => chooseCouple(openCouple, i)}
                  />
                ))}
                <button className="btn btn-danger-text btn-block" onClick={() => setDeleteCouple(openCouple)}>
                  {t("history.delete")}
                </button>
              </>
            )}
          </Sheet>

          <ConfirmSheet
            open={!!deleteCouple}
            title={t("history.deleteTitle")}
            message={t("history.deleteMessage")}
            onClose={() => setDeleteCouple(null)}
            onConfirm={async () => {
              if (!deleteCouple || !couple) return;
              await deleteCoupleOutfit(couple, deleteCouple.id);
              setCoupleOutfits((prev) => prev?.filter((x) => x.id !== deleteCouple.id) ?? prev);
              setOpenCouple(null);
            }}
          />
        </>
      )}

      {!showCouple && (
        <>
          {error && <p className="msg msg-error">{error}</p>}
          {!outfits && !error && <div className="spinner" />}
          {outfits && visible.length === 0 && (
            <div className="empty fade-in">
              <p className="empty-title">{onlyChosen ? t("history.emptyChosen") : t("history.emptyAll")}</p>
              <p className="muted">{t("history.emptyText")}</p>
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
                      {o.chosen_index != null && <span className="chosen-dot">{t("history.chosenBadge")}</span>}
                    </div>
                    <span className="list-title">{o.prompt}</span>
                    <div className="mini-thumbs">
                      {shown?.garment_ids
                        .slice(0, 5)
                        .map((id) =>
                          garments[id] ? <img key={id} src={garments[id].thumb_url} alt="" /> : <span key={id} />,
                        )}
                    </div>
                  </div>
                  <ChevronIcon width={18} height={18} className="chevron" />
                </button>
              );
            })}
          </div>
        </>
      )}

      <Sheet
        open={!!open && !toDelete}
        onClose={() => setOpen(null)}
        title={t("history.sheetTitle")}
        cancelLabel={t("common.close")}
      >
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
              {t("history.delete")}
            </button>
          </>
        )}
      </Sheet>

      <ConfirmSheet
        open={!!toDelete}
        title={t("history.deleteTitle")}
        message={t("history.deleteMessage")}
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
