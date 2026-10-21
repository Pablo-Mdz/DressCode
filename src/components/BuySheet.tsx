import { useEffect, useRef, useState } from "react";
import { shouldBuy } from "../lib/ai";
import { isReadableImage } from "../lib/image";
import { useI18n, type MessageKey } from "../lib/i18n";
import type { BuyResult, Garment, ShoppingItem } from "../lib/types";
import Sheet from "./Sheet";
import Silhouette from "./Silhouette";
import { CameraIcon, CheckIcon, GalleryIcon, SparkleIcon } from "./Icons";

const LOADING_LINES: MessageKey[] = ["buy.loading1", "buy.loading2", "buy.loading3"];

type LabeledGarment = Garment & { label: string };

// "¿Lo compro?": foto de una prenda en la tienda → veredicto según el ropero.
export default function BuySheet({
  open,
  onClose,
  garments,
  onAddToList,
}: {
  open: boolean;
  onClose: () => void;
  garments: Record<string, LabeledGarment>;
  onAddToList: (item: ShoppingItem) => Promise<void>;
}) {
  const { t, plural, lang } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuyResult | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!busy) return;
    setLine(0);
    const id = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 5000);
    return () => clearInterval(id);
  }, [busy]);

  const reset = () => {
    setFile(null);
    setNote("");
    setError(null);
    setResult(null);
    setAdded(false);
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
      setResult(null);
      setAdded(false);
    }
    e.target.value = "";
  };

  async function analyze() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await shouldBuy(file, note, lang));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("buy.error"));
    } finally {
      setBusy(false);
    }
  }

  const adding = useRef(false);
  async function addToList() {
    if (!result || added || adding.current) return;
    adding.current = true;
    try {
      await onAddToList({
        id: crypto.randomUUID(),
        name: result.item.name,
        kind: result.item.kind,
        tag: result.verdict === "buy" ? "Esencial" : "Para variar",
        color_name: result.item.color_name,
        color_hex: result.item.color_hex,
        material: result.item.material,
        new_looks: result.new_looks,
        why: result.reasoning,
        pair_ids: result.pairs.map((p) => p.garment_id),
      });
      setAdded(true);
    } finally {
      adding.current = false;
    }
  }

  return (
    <Sheet open={open} onClose={close} title={t("buy.title")} cancelLabel={result ? t("common.close") : undefined}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onPick} />

      <div className={`photo photo-preview ${result ? "photo-small" : ""}`}>
        {preview ? <img src={preview} alt={t("garment.preview")} /> : <Silhouette kind="campera" width={140} strokeWidth={1} />}
      </div>

      {!result && (
        <>
          <div className="two-buttons">
            <button className={`btn ${file ? "btn-outline" : "btn-primary"}`} onClick={() => cameraRef.current?.click()} disabled={busy}>
              <CameraIcon width={20} height={20} /> {t("garment.camera")}
            </button>
            <button className="btn btn-outline" onClick={() => galleryRef.current?.click()} disabled={busy}>
              <GalleryIcon width={20} height={20} /> {t("garment.gallery")}
            </button>
          </div>

          <label className="stack-sm">
            <span className="label">{t("buy.note")}</span>
            <textarea
              className="soft-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("buy.notePlaceholder")}
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
            <button className="btn btn-primary btn-block btn-lg" onClick={analyze} disabled={!file}>
              <SparkleIcon width={20} height={20} /> {t("buy.analyze")}
            </button>
          )}
        </>
      )}

      {result && (
        <div className="verdict fade-in">
          <div className="verdict-head">
            <span className={`verdict-badge verdict-${result.verdict}`}>{t(`buy.verdict.${result.verdict}` as MessageKey)}</span>
            {result.new_looks > 0 && <span className="gain">{plural("shop.newLooks", result.new_looks)}</span>}
          </div>
          <h3 className="verdict-title">{result.headline}</h3>
          <p className="buy-why">{result.reasoning}</p>

          {result.pairs.some((p) => garments[p.garment_id]) && (
            <div className="stack-sm">
              <span className="label">{t("buy.pairs")}</span>
              <div className="pair-list">
                {result.pairs
                  .filter((p) => garments[p.garment_id])
                  .map((p) => (
                    <div key={p.garment_id} className="pair-row">
                      <img src={garments[p.garment_id].thumb_url} alt="" />
                      <div>
                        <span className="pair-name">{garments[p.garment_id].label}</span>
                        <span className="muted">{p.note}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {result.similar_ids.some((id) => garments[id]) && (
            <div className="stack-sm">
              <span className="label">{t("buy.similar")}</span>
              <div className="pairs">
                {result.similar_ids
                  .filter((id) => garments[id])
                  .map((id) => (
                    <span key={id} className="pair">
                      <img src={garments[id].thumb_url} alt="" />
                      {garments[id].label}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {result.tip && (
            <div className="tip">
              <span className="eyebrow">{t("look.tip")}</span>
              <p>{result.tip}</p>
            </div>
          )}

          <div className="buy-actions">
            {result.verdict !== "skip" && (
              <button className={`btn ${added ? "btn-outline-dark" : "btn-primary"}`} onClick={addToList} disabled={added}>
                {added ? (
                  <>
                    <CheckIcon width={18} height={18} /> {t("shop.inList")}
                  </>
                ) : (
                  t("shop.addToList")
                )}
              </button>
            )}
            <button className="btn btn-outline" onClick={reset}>
              {t("buy.another")}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
