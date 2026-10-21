import { useEffect, useRef, useState } from "react";
import { inspireLook } from "../lib/ai";
import { isReadableImage } from "../lib/image";
import { chooseOutfit, loadOutfitGarments } from "../lib/outfits";
import { addToList } from "../lib/shopping";
import { useI18n, type MessageKey } from "../lib/i18n";
import type { Garment, Inspiration, Outfit } from "../lib/types";
import Sheet from "./Sheet";
import OutfitCard from "./OutfitCard";
import Silhouette, { strokeFor } from "./Silhouette";
import { CameraIcon, CheckIcon, GalleryIcon, PlusIcon, SparkleIcon } from "./Icons";

const LOADING_LINES: MessageKey[] = ["insp.loading1", "insp.loading2", "insp.loading3"];

// Inspiración: foto de un look que gusta → la misma idea armada con el ropero.
export default function InspireSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [garments, setGarments] = useState<Record<string, Garment>>({});
  const [added, setAdded] = useState<Set<number>>(new Set());
  const addedRef = useRef(new Set<number>()); // evita duplicados con doble toque

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!busy) return;
    setLine(0);
    const id = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 6000);
    return () => clearInterval(id);
  }, [busy]);

  const reset = () => {
    setFile(null);
    setNote("");
    setError(null);
    setOutfit(null);
    setAdded(new Set());
    addedRef.current.clear();
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  // Solo fotos: un PDF o un archivo roto se rechaza antes de mandarlo a la IA.
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f && !(await isReadableImage(f))) {
      setError(t("garment.notImage"));
      return;
    }
    setError(null);
    if (f) {
      setFile(f);
      setOutfit(null);
    }
    e.target.value = "";
  };

  async function recreate() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const o = await inspireLook(file, note, lang);
      setGarments(await loadOutfitGarments([o]));
      setOutfit(o);
      setAdded(new Set());
    addedRef.current.clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("insp.error"));
    } finally {
      setBusy(false);
    }
  }

  async function choose(index: number) {
    if (!outfit) return;
    const next = outfit.chosen_index === index ? null : index;
    setOutfit({ ...outfit, chosen_index: next });
    await chooseOutfit(outfit.id, next).catch(() => undefined);
  }

  async function addMissing(item: Inspiration["missing"][number], i: number) {
    if (addedRef.current.has(i)) return;
    addedRef.current.add(i);
    setAdded((prev) => new Set(prev).add(i));
    try {
      await addToList({
        id: crypto.randomUUID(),
        name: item.name,
        kind: item.kind,
        tag: "Para variar",
        color_name: item.color_name,
        color_hex: item.color_hex,
        material: item.material,
        new_looks: 0,
        why: item.why,
        pair_ids: [],
      });
    } catch {
      addedRef.current.delete(i);
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(i);
        return next;
      });
    }
  }

  const insp = outfit?.inspiration;

  return (
    <Sheet open={open} onClose={close} title={t("insp.title")} cancelLabel={outfit ? t("common.close") : undefined}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />

      <div className={`photo photo-preview ${outfit ? "photo-small" : ""}`}>
        {preview ? <img src={preview} alt={t("garment.preview")} /> : <Silhouette kind="vestido" width={140} strokeWidth={1} />}
      </div>

      {!outfit && (
        <>
          <div className="two-buttons">
            <button className={`btn ${file ? "btn-outline" : "btn-primary"}`} onClick={() => galleryRef.current?.click()} disabled={busy}>
              <GalleryIcon width={20} height={20} /> {t("garment.gallery")}
            </button>
            <button className="btn btn-outline" onClick={() => cameraRef.current?.click()} disabled={busy}>
              <CameraIcon width={20} height={20} /> {t("garment.camera")}
            </button>
          </div>

          <label className="stack-sm">
            <span className="label">{t("insp.note")}</span>
            <textarea
              className="soft-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("insp.notePlaceholder")}
              maxLength={400}
              disabled={busy}
            />
          </label>

          <p className="batch-hint">{t("ai.photoNote")}</p>
          {error && <p className="msg msg-error">{error}</p>}

          {busy ? (
            <div className="thinking">
              <div className="spinner" />
              <p key={line} className="fade-in">
                {t(LOADING_LINES[line])}
              </p>
            </div>
          ) : (
            <button className="btn btn-primary btn-block btn-lg" onClick={recreate} disabled={!file}>
              <SparkleIcon width={20} height={20} /> {t("insp.submit")}
            </button>
          )}
        </>
      )}

      {outfit && insp && (
        <div className="verdict fade-in">
          <div className="verdict-head">
            <span className={`verdict-badge match-${insp.match}`}>{t(`insp.match.${insp.match}` as MessageKey)}</span>
          </div>
          <h3 className="verdict-title">{insp.name}</h3>
          <div className="stack-xs">
            <span className="label">{t("insp.reading")}</span>
            <p className="buy-why">{insp.reading}</p>
          </div>

          <div className="looks">
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

          {insp.missing.length > 0 && (
            <div className="stack-sm">
              <span className="label">{t("insp.missing")}</span>
              <div className="pair-list">
                {insp.missing.map((item, i) => (
                  <div key={i} className="pair-row">
                    <div className="buy-tile small" style={{ background: item.color_hex }}>
                      <Silhouette kind={item.kind} stroke={strokeFor(item.color_hex)} width={34} strokeWidth={2.4} />
                    </div>
                    <div className="grow">
                      <span className="pair-name">{item.name}</span>
                      <span className="muted">{item.why}</span>
                    </div>
                    <button
                      className={`round-add ${added.has(i) ? "done" : ""}`}
                      onClick={() => addMissing(item, i)}
                      disabled={added.has(i)}
                      aria-label={added.has(i) ? t("shop.inList") : t("shop.addToList")}
                    >
                      {added.has(i) ? <CheckIcon width={18} height={18} /> : <PlusIcon width={18} height={18} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="muted">{t("insp.saved")}</p>
          <button className="btn btn-outline btn-block" onClick={reset}>
            {t("insp.another")}
          </button>
        </div>
      )}
    </Sheet>
  );
}
