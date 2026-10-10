import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  addToList,
  BUDGET_OPTIONS,
  DEFAULT_PREFS,
  dismissItem,
  listShoppingList,
  loadShopping,
  removeFromList,
  requestShopping,
  SEASON_OPTIONS,
  STYLE_OPTIONS,
} from "../lib/shopping";
import { listFolders, listGarments } from "../lib/wardrobe";
import type { Garment, ListItem, ShoppingItem, ShoppingPrefs, ShoppingResult } from "../lib/types";
import PageHeader from "../components/PageHeader";
import Sheet from "../components/Sheet";
import Silhouette, { strokeFor } from "../components/Silhouette";
import { BagIcon, CheckIcon, SparkleIcon } from "../components/Icons";

type Filter = "Todo" | "Esencial" | "Para variar";

const LOADING_LINES = ["Recorriendo tu ropero…", "Buscando huecos y combinaciones…", "Eligiendo las mejores piezas…"];

export default function Shopping() {
  const [prefs, setPrefs] = useState<ShoppingPrefs>(DEFAULT_PREFS);
  const [result, setResult] = useState<ShoppingResult | null>(null);
  const [list, setList] = useState<ListItem[]>([]);
  const [garments, setGarments] = useState<Record<string, Garment & { label: string }>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("Todo");
  const [listOpen, setListOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [shopping, items, gs, fs] = await Promise.all([
          loadShopping(),
          listShoppingList(),
          listGarments(),
          listFolders(),
        ]);
        const folderName = Object.fromEntries(fs.map((f) => [f.id, f.name]));
        setGarments(
          Object.fromEntries(
            gs.map((g) => [g.id, { ...g, label: shortLabel(g.description) || folderName[g.folder_id] || "Prenda" }]),
          ),
        );
        setPrefs(shopping.prefs);
        setResult(shopping.result);
        setList(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No pude cargar Shopping");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!busy) return;
    setLine(0);
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 5000);
    return () => clearInterval(t);
  }, [busy]);

  const toggleStyle = (s: string) =>
    setPrefs((p) => ({ ...p, styles: p.styles.includes(s) ? p.styles.filter((x) => x !== s) : [...p.styles, s] }));

  async function generate() {
    setBusy(true);
    setError(null);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      setResult(await requestShopping(prefs));
      setFilter("Todo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setBusy(false);
    }
  }

  async function toggleList(item: ShoppingItem) {
    const existing = list.find((l) => l.suggestion_id === item.id);
    try {
      if (existing) {
        setList((prev) => prev.filter((l) => l.id !== existing.id));
        await removeFromList(existing.id);
      } else {
        const entry = await addToList(item);
        setList((prev) => [entry, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude actualizar tu lista");
    }
  }

  async function dismiss(item: ShoppingItem) {
    if (!result) return;
    try {
      setResult(await dismissItem(result, item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude guardar el cambio");
    }
  }

  const items = (result?.items ?? []).filter((i) => filter === "Todo" || i.tag === filter);

  return (
    <section className="page">
      <PageHeader
        title="Shopping"
        subtitle="Lo que le falta a tu ropero"
        aside={
          <button
            className="avatar bag-btn"
            onClick={() => setListOpen(true)}
            aria-label={`Mi lista de compras, ${list.length} ${list.length === 1 ? "prenda" : "prendas"}`}
          >
            <BagIcon width={20} height={20} />
            {list.length > 0 && <span className="badge">{list.length}</span>}
          </button>
        }
      />

      <section className="card-outline stack" aria-label="Orientá las sugerencias">
        <div className="stack-xs">
          <span className="eyebrow">Orientá las sugerencias</span>
          <h2 className="serif-md">¿Hacia dónde querés llevar tu ropero?</h2>
        </div>

        <div className="stack-sm">
          <span className="label">Estilo · podés elegir varios</span>
          <div className="chips">
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                aria-pressed={prefs.styles.includes(s)}
                onClick={() => toggleStyle(s)}
                disabled={busy}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="stack-sm">
          <span className="label">Contale algo más (opcional)</span>
          <textarea
            className="soft-input"
            rows={3}
            value={prefs.notes}
            onChange={(e) => setPrefs({ ...prefs, notes: e.target.value })}
            placeholder="Ej: trabajo en oficina pero los viernes son informales. Quiero algo más moderno y evitar el marrón."
            maxLength={600}
            disabled={busy}
          />
        </label>

        <Segmented
          label="Presupuesto"
          options={BUDGET_OPTIONS}
          value={prefs.budget}
          onChange={(budget) => setPrefs({ ...prefs, budget })}
          disabled={busy}
        />
        <Segmented
          label="Temporada"
          options={SEASON_OPTIONS}
          labels={{ "Otoño-invierno": "Invierno", "Primavera-verano": "Verano" }}
          value={prefs.season}
          onChange={(season) => setPrefs({ ...prefs, season })}
          disabled={busy}
        />

        <button className="btn btn-primary btn-block" onClick={generate} disabled={busy || !loaded}>
          <SparkleIcon width={18} height={18} />
          {busy ? "Analizando tu ropero…" : result ? "Actualizar sugerencias" : "Sugerirme compras"}
        </button>
      </section>

      <div ref={resultsRef} className="results-anchor" />

      {busy && (
        <div className="thinking fade-in">
          <div className="spinner" />
          <p key={line} className="fade-in">
            {LOADING_LINES[line]}
          </p>
        </div>
      )}

      {error && (
        <p className="msg msg-error">
          {error}
          {error.includes("Ropero") && (
            <>
              {" "}
              <Link to="/ropero">Ir al Ropero</Link>
            </>
          )}
        </p>
      )}

      {!busy && result && (
        <>
          <div className="reading fade-in">
            <span className="eyebrow">Lectura de tu ropero</span>
            <p>{result.summary}</p>
          </div>

          <div className="chips">
            {(["Todo", "Esencial", "Para variar"] as Filter[]).map((f) => (
              <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "Esencial" ? "Esenciales" : f}
              </button>
            ))}
          </div>

          {items.length === 0 && (
            <div className="empty">
              <p className="empty-title">No hay sugerencias acá</p>
              <p className="muted">Probá otro filtro o actualizá las sugerencias.</p>
            </div>
          )}

          {items.map((item, i) => {
            const inList = list.some((l) => l.suggestion_id === item.id);
            return (
              <article key={item.id} className="buy fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="buy-top">
                  <div className="buy-tile" style={{ background: item.color_hex }}>
                    <Silhouette kind={item.kind} stroke={strokeFor(item.color_hex)} width={84} />
                  </div>
                  <div className="buy-info">
                    <span className="eyebrow">{item.tag}</span>
                    <h2 className="serif-md">{item.name}</h2>
                    <span className="swatch-line">
                      <span className="swatch" style={{ background: item.color_hex }} />
                      {item.color_name} · {item.material}
                    </span>
                    {item.new_looks > 0 && (
                      <span className="gain">
                        +{item.new_looks} {item.new_looks === 1 ? "look nuevo" : "looks nuevos"}
                      </span>
                    )}
                  </div>
                </div>

                <p className="buy-why">{item.why}</p>

                {item.pair_ids.some((id) => garments[id]) && (
                  <div className="stack-sm">
                    <span className="label">Combina con lo que ya tenés</span>
                    <div className="pairs">
                      {item.pair_ids
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

                <div className="buy-actions">
                  <button className={`btn ${inList ? "btn-outline-dark" : "btn-primary"}`} onClick={() => toggleList(item)}>
                    {inList ? (
                      <>
                        <CheckIcon width={18} height={18} /> En tu lista
                      </>
                    ) : (
                      "Agregar a mi lista"
                    )}
                  </button>
                  <button className="btn btn-outline" onClick={() => dismiss(item)}>
                    Ya la tengo
                  </button>
                </div>
              </article>
            );
          })}
        </>
      )}

      {loaded && !busy && !result && !error && (
        <div className="empty">
          <p className="empty-title">Tu próxima compra, con criterio</p>
          <p className="muted">Elegí un estilo y tocá “Sugerirme compras”. Voy a mirar tu ropero y decirte qué le falta.</p>
        </div>
      )}

      <Sheet open={listOpen} onClose={() => setListOpen(false)} title="Mi lista" cancelLabel="Cerrar">
        {list.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Tu lista está vacía</p>
            <p className="muted">Agregá sugerencias para tenerlas a mano cuando salgas de compras.</p>
          </div>
        ) : (
          <div className="list">
            {list.map((l) => (
              <div key={l.id} className="list-row static">
                <div className="buy-tile small" style={{ background: l.color_hex }}>
                  <Silhouette kind={l.kind} stroke={strokeFor(l.color_hex)} width={34} strokeWidth={2.4} />
                </div>
                <div className="list-main">
                  <span className="list-title sm">{l.name}</span>
                  <span className="muted">
                    {l.color_name} · {l.material}
                  </span>
                </div>
                <button
                  className="text-btn"
                  onClick={async () => {
                    setList((prev) => prev.filter((x) => x.id !== l.id));
                    await removeFromList(l.id).catch(() => undefined);
                  }}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </section>
  );
}

function Segmented({
  label,
  options,
  labels = {},
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: string[];
  labels?: Record<string, string>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="stack-sm">
      <span className="label">{label}</span>
      <div className="segmented small" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)} disabled={disabled}>
            {labels[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}

function shortLabel(description: string | null): string {
  if (!description) return "";
  const first = description.split(/[.,;]/)[0].trim();
  return first.length > 22 ? `${first.slice(0, 21)}…` : first;
}
